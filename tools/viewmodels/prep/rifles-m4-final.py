"""Finalize the approved M4 source as a private, per-weapon runtime GLB.

The input is the preserved M4 Blender checkpoint. It already contains the
owner-approved idle and the measured magazine/bolt-contact reload. This tool
keeps those bytes outside Git, separates tactical and empty reload semantics,
and authors equip, shoot and inspect clips by applying one rigid transform to
the weapon and arm roots. A common world transform preserves hand contacts.

Run with Blender:
  blender -b --python rifles-m4-final.py -- --source=... --output-dir=...
"""
from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

SOURCE_SHA256 = "c23930c3837b4bda862a71209eaeb1b212b0dd5a6bd34619f72a1398fce3930b"
FPS = 30


def arg(name: str, default: str = "") -> str:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    prefix = f"--{name}="
    return next((item[len(prefix) :] for item in argv if item.startswith(prefix)), default)


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def smooth(value: float) -> float:
    value = min(1.0, max(0.0, value))
    return value * value * (3.0 - 2.0 * value)


def mix_matrix(a: Matrix, b: Matrix, amount: float) -> Matrix:
    amount = min(1.0, max(0.0, amount))
    location = a.to_translation().lerp(b.to_translation(), amount)
    rotation = a.to_quaternion().slerp(b.to_quaternion(), amount)
    scale = a.to_scale().lerp(b.to_scale(), amount)
    return Matrix.Translation(location) @ rotation.to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1.0))


source = Path(arg("source")).expanduser().resolve()
output_dir = Path(arg("output-dir")).expanduser().resolve()
if not source.is_file() or digest(source) != SOURCE_SHA256:
    raise RuntimeError(f"M4 source absent or divergent: {source}")
if not output_dir.is_absolute() or "worktrees/viewmodels-catalog-final" in str(output_dir):
    raise RuntimeError("output-dir must be an explicit path outside the public worktree")
output_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
scene = bpy.context.scene
scene.render.fps = FPS
rig = bpy.data.objects["RIG_FP_ARMS"]
gun = bpy.data.objects["MINT_WEAPON_M4"]
mag = bpy.data.objects["MINT_WEAPON_M4_MAG"]
cloth_keys = bpy.data.objects["GEO_FP_SK_Cloth_01"].data.shape_keys
cuff = cloth_keys.key_blocks["reload_cuff_cover_l"]
animated = [rig, gun, mag, cloth_keys]

# Um root comum é o dono exclusivo dos movimentos que carregam o pacote todo
# (equip/shoot/inspect). Animar arma e armature separadamente permitia o
# exporter eliminar como constante o track do armature e quebrar o contato.
package = bpy.data.objects.new("VM_PACKAGE_M4", None)
scene.collection.objects.link(package)
for obj in (rig, gun):
    world = obj.matrix_world.copy()
    obj.parent = package
    obj.matrix_world = world
animated.append(package)


def tracks(owner):
    return owner.animation_data.nla_tracks if owner.animation_data else []


def rename_track(owner, before: str, after: str) -> None:
    track = next((candidate for candidate in tracks(owner) if candidate.name == before), None)
    if track is None:
        return
    track.name = after
    for strip in track.strips:
        strip.name = after
        strip.action.name = f"{after}__{getattr(owner, 'name', 'Key')}"


for owner in animated:
    rename_track(owner, "reload_tactical", "reload_empty")


def solo(name: str) -> None:
    for owner in animated:
        if owner.animation_data:
            owner.animation_data.action = None
            for track in owner.animation_data.nla_tracks:
                track.mute = track.name != name


def evaluate(name: str, frame: float) -> dict:
    solo(name)
    whole = int(math.floor(frame))
    scene.frame_set(whole, subframe=frame - whole)
    bpy.context.view_layer.update()
    return {
        "rig_world": rig.matrix_world.copy(),
        "gun_world": gun.matrix_world.copy(),
        "mag_basis": mag.matrix_basis.copy(),
        "bones": {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones},
        "cuff": float(cuff.value),
    }


reload_empty = [evaluate("reload_empty", frame) for frame in range(73)]
idle = evaluate("idle", 0)


def interpolate_pose(a: dict, b: dict, amount: float) -> dict:
    return {
        "rig_world": mix_matrix(a["rig_world"], b["rig_world"], amount),
        "gun_world": mix_matrix(a["gun_world"], b["gun_world"], amount),
        "mag_basis": mix_matrix(a["mag_basis"], b["mag_basis"], amount),
        "bones": {name: mix_matrix(a["bones"][name], b["bones"][name], amount) for name in a["bones"]},
        "cuff": a["cuff"] + (b["cuff"] - a["cuff"]) * amount,
    }


def set_pose(pose: dict, frame: int) -> None:
    rig.matrix_world = pose["rig_world"]
    gun.matrix_world = pose["gun_world"]
    mag.matrix_basis = pose["mag_basis"]
    cuff.value = pose["cuff"]
    rig.rotation_mode = gun.rotation_mode = mag.rotation_mode = "QUATERNION"
    for obj in (rig, gun, mag):
        obj.keyframe_insert("location", frame=frame, group=obj.name)
        obj.keyframe_insert("rotation_quaternion", frame=frame, group=obj.name)
        obj.keyframe_insert("scale", frame=frame, group=obj.name)
    for bone in rig.pose.bones:
        bone.rotation_mode = "QUATERNION"
        bone.matrix_basis = pose["bones"][bone.name]
        bone.keyframe_insert("location", frame=frame, group=bone.name)
        bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
        bone.keyframe_insert("scale", frame=frame, group=bone.name)
    cuff.keyframe_insert("value", frame=frame)


def push(owner, name: str) -> None:
    if owner.animation_data is None:
        return
    action = owner.animation_data.action
    if action is None:
        return
    action.name = f"{name}__{getattr(owner, 'name', 'Key')}"
    track = owner.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, action)
    if getattr(strip, "action_slot", True) is None:
        strip.action_slot = action.slots[0]
    track.mute = True
    owner.animation_data.action = None


def author(name: str, frames: int, sampler) -> None:
    for owner in animated:
        if owner.animation_data:
            owner.animation_data.action = None
            for track in owner.animation_data.nla_tracks:
                track.mute = True
    for frame in range(frames + 1):
        scene.frame_set(frame)
        set_pose(sampler(frame, frames), frame)
    for owner in animated:
        push(owner, name)


# Tactical: magazine out/in, then a direct smooth return to the approved idle.
# Empty: preserved source action additionally visits the measured bolt release.
def tactical(frame: int, frames: int) -> dict:
    if frame <= 45:
        return reload_empty[frame]
    return interpolate_pose(reload_empty[45], reload_empty[72], smooth((frame - 45) / 27))


author("reload_tactical", 72, tactical)

camera = scene.camera
cam_rotation = camera.matrix_world.to_quaternion()
right = cam_rotation @ Vector((1, 0, 0))
up = cam_rotation @ Vector((0, 1, 0))
forward = cam_rotation @ Vector((0, 0, -1))
pivot = (idle["gun_world"].to_translation() + (idle["rig_world"] @ Vector((0, 0, 0)))) * 0.5


def package_delta(translation: Vector, rotation: Quaternion) -> Matrix:
    return Matrix.Translation(translation) @ Matrix.Translation(pivot) @ rotation.to_matrix().to_4x4() @ Matrix.Translation(-pivot)


def shoot(frame: int, frames: int) -> Matrix:
    pulse = math.sin(math.pi * frame / frames)
    rotation = Quaternion(right, math.radians(3.2) * pulse) @ Quaternion(forward, math.radians(-1.2) * pulse)
    return package_delta(-forward * (0.022 * pulse) + up * (0.006 * pulse), rotation)


def inspect(frame: int, frames: int) -> Matrix:
    pulse = math.sin(math.pi * frame / frames)
    rotation = Quaternion(up, math.radians(32) * pulse) @ Quaternion(forward, math.radians(-7) * pulse)
    return package_delta(-right * (0.09 * pulse) + up * (0.045 * pulse) - forward * (0.035 * pulse), rotation)


def equip(frame: int, frames: int) -> Matrix:
    amount = 1.0 - smooth(frame / frames)
    rotation = Quaternion(right, math.radians(18) * amount) @ Quaternion(forward, math.radians(8) * amount)
    return package_delta(right * (0.11 * amount) - up * (0.27 * amount) + forward * (0.04 * amount), rotation)


def author_package(name: str, frames: int, sampler) -> None:
    for owner in animated:
        if owner.animation_data:
            owner.animation_data.action = None
            for track in owner.animation_data.nla_tracks:
                track.mute = True
    package.animation_data_create()
    for frame in range(frames + 1):
        scene.frame_set(frame)
        package.matrix_world = sampler(frame, frames)
        package.rotation_mode = "QUATERNION"
        package.keyframe_insert("location", frame=frame, group=package.name)
        package.keyframe_insert("rotation_quaternion", frame=frame, group=package.name)
        package.keyframe_insert("scale", frame=frame, group=package.name)
    push(package, name)


author_package("shoot", 8, shoot)
author_package("inspect", 45, inspect)
author_package("equip_rifle", 30, equip)

for owner in animated:
    if owner.animation_data:
        owner.animation_data.action = None
        for track in owner.animation_data.nla_tracks:
            track.mute = False

scene.frame_start = 0
scene.frame_end = 72
scene.frame_set(72)
# O NLA de equip começa fora de quadro. Sem esta restauração, o exporter usa
# esse primeiro key como transform-base e idle herda a pose de draw.
package.matrix_world = Matrix.Identity(4)
bpy.context.view_layer.update()
blend_path = output_dir / "m4-final.blend"
glb_path = output_dir / "m4-baked-runtime.glb"
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)
bpy.ops.export_scene.gltf(
    filepath=str(glb_path), export_format="GLB", export_cameras=True, export_lights=False,
    export_animations=True, export_animation_mode="NLA_TRACKS", export_merge_animation="NLA_TRACK",
    export_skins=True, export_materials="EXPORT", export_image_format="WEBP", export_image_quality=82,
    export_yup=True, export_force_sampling=True, export_optimize_animation_size=True,
    export_optimize_animation_keep_anim_armature=True, export_optimize_animation_keep_anim_object=True,
    export_frame_range=False,
)

report = {
    "schemaVersion": 1,
    "weapon": "m4",
    "source": {"file": str(source), "bytes": source.stat().st_size, "sha256": SOURCE_SHA256},
    "products": {
        "blend": {"file": str(blend_path), "bytes": blend_path.stat().st_size, "sha256": digest(blend_path)},
        "glb": {"file": str(glb_path), "bytes": glb_path.stat().st_size, "sha256": digest(glb_path)},
    },
    "clips": {"idle": 1 / FPS, "equip_rifle": 1.0, "shoot": 8 / FPS,
              "reload_tactical": 2.4, "reload_empty": 2.4, "inspect": 1.5},
    "semantics": {"reload_tactical": "magazine and direct return",
                  "reload_empty": "magazine plus measured bolt-release contact"},
    "ready": False,
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("M4_FINAL_OK " + json.dumps(report, separators=(",", ":")))
