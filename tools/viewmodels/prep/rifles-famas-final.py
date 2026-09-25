"""Reauthor FAMAS over the validated AR package with a bullpup reload.

The public FAMAS body supplies every weapon vertex. The final M4 package is
used only for hands, camera and the common action grammar. The complete rear
magazine and the charging handle under the carry handle are separated by
connected-component bounds measured on the public source. Products stay out
of Git.
"""
from __future__ import annotations

import bmesh
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

M4_SHA = "e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe"
FAMAS_SHA = "159c0750b378252a7c5da16837b1e4c584e900416a2085dfd662cb38ea60405a"
FPS = 30


def argument(name: str) -> Path:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    value = next((item.split("=", 1)[1] for item in argv if item.startswith(f"--{name}=")), "")
    return Path(value).expanduser().resolve()


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def smooth(value: float) -> float:
    value = min(1.0, max(0.0, value))
    return value * value * (3.0 - 2.0 * value)


def components(mesh):
    adjacency = [set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].add(b)
        adjacency[b].add(a)
    seen, result = set(), []
    for start in range(len(mesh.vertices)):
        if start in seen:
            continue
        stack, group = [start], []
        seen.add(start)
        while stack:
            index = stack.pop()
            group.append(index)
            for neighbor in adjacency[index]:
                if neighbor not in seen:
                    seen.add(neighbor)
                    stack.append(neighbor)
        result.append(group)
    return result


def subset(source, keep, name):
    result = source.copy()
    result.name = name
    bm = bmesh.new()
    bm.from_mesh(result)
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if vertex.index not in keep], context="VERTS")
    bm.to_mesh(result)
    bm.free()
    return result


def without(source, remove, name):
    result = source.copy()
    result.name = name
    bm = bmesh.new()
    bm.from_mesh(result)
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if vertex.index in remove], context="VERTS")
    bm.to_mesh(result)
    bm.free()
    return result


m4_source = argument("m4-source")
famas_source = argument("famas-source")
output_dir = argument("output-dir")
if digest(m4_source) != M4_SHA or digest(famas_source) != FAMAS_SHA:
    raise RuntimeError("fonte M4/FAMAS ausente ou divergente")
if not output_dir.is_absolute() or "worktrees/viewmodels-catalog-final" in str(output_dir):
    raise RuntimeError("output-dir deve ficar fora do Git")
output_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(m4_source), load_ui=False)
scene = bpy.context.scene
scene.render.fps = FPS
rig = bpy.data.objects["RIG_FP_ARMS"]
gun = bpy.data.objects["MINT_WEAPON_M4"]
mag = bpy.data.objects["MINT_WEAPON_M4_MAG"]
package = bpy.data.objects["VM_PACKAGE_M4"]
cloth_keys = bpy.data.objects["GEO_FP_SK_Cloth_01"].data.shape_keys
cuff = cloth_keys.key_blocks["reload_cuff_cover_l"]

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(famas_source))
imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"FAMAS deveria conter uma malha; encontrou {len(imported)}")
source_object = imported[0]
source_mesh = source_object.data

mag_ids, handle_ids = set(), set()
for group in components(source_mesh):
    points = [source_mesh.vertices[index].co for index in group]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    # Pente traseiro: ilhas abaixo do receiver, atrás do punho, sem parede da coronha.
    if minimum.x >= 0.20 and maximum.x <= 0.34 and minimum.z < -0.03 and maximum.z <= 0.045:
        mag_ids.update(group)
    # Comando superior curvo dentro da alça de transporte.
    if minimum.x >= -0.06 and maximum.x <= 0.005 and minimum.z >= 0.09 and maximum.z <= 0.145:
        handle_ids.update(group)
if len(mag_ids) != 472 or len(handle_ids) != 138 or mag_ids & handle_ids:
    raise RuntimeError(f"seleção FAMAS divergente: mag={len(mag_ids)} handle={len(handle_ids)}")

body_mesh = without(source_mesh, mag_ids | handle_ids, "MINT_WEAPON_FAMAS_BODY")
mag_mesh = subset(source_mesh, mag_ids, "MINT_WEAPON_FAMAS_MAG_MESH")
handle_mesh = subset(source_mesh, handle_ids, "MINT_CHARGING_FAMAS_MESH")
# len 0,76 e vm 0,87 => 0,6612 m visuais; tracks AR mantêm scale 0,841643.
scale_factor = (0.76 * 0.87 / 0.998046875) / 0.8416434526443481
for mesh in (body_mesh, mag_mesh, handle_mesh):
    mesh.transform(Matrix.Scale(scale_factor, 4))

materials = list(source_mesh.materials)
gun.data = body_mesh
gun.name = "MINT_WEAPON_FAMAS"
mag.data = mag_mesh
mag.name = "MINT_WEAPON_FAMAS_MAG"
for mesh in (body_mesh, mag_mesh, handle_mesh):
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)
handle = bpy.data.objects.new("MINT_CHARGING_FAMAS", handle_mesh)
scene.collection.objects.link(handle)
handle.parent = gun
handle.location = (0, 0, 0)
handle.rotation_mode = "QUATERNION"
bpy.data.objects.remove(source_object, do_unlink=True)

mag_points = [mag_mesh.vertices[index].co for index in range(len(mag_mesh.vertices))]
mag_min = Vector(tuple(min(point[axis] for point in mag_points) for axis in range(3)))
mag_max = Vector(tuple(max(point[axis] for point in mag_points) for axis in range(3)))
mag_grip = Vector(((mag_min.x + mag_max.x) * 0.5, (mag_min.y + mag_max.y) * 0.5,
                   mag_max.z - (mag_max.z - mag_min.z) * 0.22))


def tracks(owner):
    return owner.animation_data.nla_tracks if owner.animation_data else []


animated = [rig, gun, mag, cloth_keys, package]


def solo(name: str) -> None:
    for owner in animated:
        if owner.animation_data:
            owner.animation_data.action = None
            for track in owner.animation_data.nla_tracks:
                track.mute = track.name != name


target = bpy.data.objects.new("FAMAS_RELOAD_TARGET", None)
scene.collection.objects.link(target)
hand_bone = rig.pose.bones["hand_l"]
ik = hand_bone.constraints.new("IK")
ik.name = "FAMAS_REAR_MAG_IK"
ik.target = target
ik.chain_count = 3
ik.use_tail = False


def reload_delta(frame: int) -> Vector:
    pulled = Vector((-0.07, -0.045, -0.19))
    if frame < 12:
        return Vector()
    if frame < 26:
        return pulled * smooth((frame - 12) / 14)
    if frame <= 38:
        return pulled
    if frame < 52:
        return pulled * (1.0 - smooth((frame - 38) / 14))
    return Vector()


def ik_weight(frame: int) -> float:
    if frame < 8:
        return 0.0
    if frame < 18:
        return smooth((frame - 8) / 10)
    if frame <= 48:
        return 1.0
    if frame < 62:
        return 1.0 - smooth((frame - 48) / 14)
    return 0.0


def sample(name: str):
    solo(name)
    poses = []
    for frame in range(73):
        scene.frame_set(frame)
        delta = reload_delta(frame)
        mag.matrix_basis = Matrix.Translation(delta)
        target.location = gun.matrix_world @ (mag_grip + delta)
        ik.influence = ik_weight(frame)
        bpy.context.view_layer.update()
        poses.append({
            "rig_world": rig.matrix_world.copy(),
            "gun_world": gun.matrix_world.copy(),
            "mag_basis": mag.matrix_basis.copy(),
            "bones": {bone.name: bone.matrix.copy() for bone in rig.pose.bones},
            "cuff": float(cuff.value),
        })
    return poses


tactical = sample("reload_tactical")
empty = sample("reload_empty")
hand_bone.constraints.remove(ik)
bpy.data.objects.remove(target, do_unlink=True)


def remove_reload_tracks(owner) -> None:
    if not owner.animation_data:
        return
    for track in list(owner.animation_data.nla_tracks):
        if track.name in {"reload_tactical", "reload_empty"}:
            owner.animation_data.nla_tracks.remove(track)


for owner in animated:
    remove_reload_tracks(owner)


def push(owner, name: str) -> None:
    if owner.animation_data is None or owner.animation_data.action is None:
        return
    action = owner.animation_data.action
    action.name = f"{name}__{getattr(owner, 'name', 'Key')}"
    track = owner.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, action)
    if getattr(strip, "action_slot", True) is None:
        strip.action_slot = action.slots[0]
    track.mute = True
    owner.animation_data.action = None


bone_order = sorted(rig.pose.bones, key=lambda bone: len(bone.parent_recursive))


def author(name: str, poses) -> None:
    for owner in (rig, gun, mag, cloth_keys):
        if owner.animation_data:
            owner.animation_data.action = None
            for track in owner.animation_data.nla_tracks:
                track.mute = True
    for frame, pose in enumerate(poses):
        scene.frame_set(frame)
        rig.matrix_world = pose["rig_world"]
        gun.matrix_world = pose["gun_world"]
        mag.matrix_basis = pose["mag_basis"]
        cuff.value = pose["cuff"]
        for bone in bone_order:
            bone.matrix = pose["bones"][bone.name]
            bone.rotation_mode = "QUATERNION"
        for owner in (rig, gun, mag):
            owner.rotation_mode = "QUATERNION"
            owner.keyframe_insert("location", frame=frame, group=owner.name)
            owner.keyframe_insert("rotation_quaternion", frame=frame, group=owner.name)
            owner.keyframe_insert("scale", frame=frame, group=owner.name)
        for bone in rig.pose.bones:
            bone.keyframe_insert("location", frame=frame, group=bone.name)
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
            bone.keyframe_insert("scale", frame=frame, group=bone.name)
        cuff.keyframe_insert("value", frame=frame)
    for owner in (rig, gun, mag, cloth_keys):
        push(owner, name)


author("reload_tactical", tactical)
author("reload_empty", empty)

# Empty acrescenta o comando superior após o reassentamento do pente.
for frame, x in ((0, 0.0), (53, 0.0), (58, 0.055 / gun.scale.x), (64, 0.0), (72, 0.0)):
    scene.frame_set(frame)
    handle.location = (x, 0, 0)
    handle.keyframe_insert("location", frame=frame)
handle.animation_data.action.name = "reload_empty__MINT_CHARGING_FAMAS"
track = handle.animation_data.nla_tracks.new()
track.name = "reload_empty"
track.strips.new("reload_empty", 0, handle.animation_data.action)
handle.animation_data.action = None

# Sockets calculados na arma própria. -X é boca, +X é coronha.
corners = [Vector(point) for point in gun.bound_box]
minimum = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
maximum = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
front = [point for point in body_mesh.vertices if point.co.x <= minimum.x + (maximum.x - minimum.x) * 0.08]
front_center = Vector((minimum.x,
                       sum(point.co.y for point in front) / len(front),
                       sum(point.co.z for point in front) / len(front)))
muzzle = next((child for child in gun.children if child.name == "SOCKET_MINT_MUZZLE"), None)
sight = next((child for child in gun.children if child.name == "SOCKET_MINT_SIGHT"), None)
if not muzzle or not sight:
    raise RuntimeError("sockets herdados ausentes")
muzzle.location = front_center
sight.location = (maximum.x - (maximum.x - minimum.x) * 0.13,
                  (minimum.y + maximum.y) * 0.5, maximum.z - 0.02 / gun.scale.x)
package.name = "VM_PACKAGE_FAMAS"
scene.camera.name = "VIEWMODEL_CAMERA"

for owner in animated + [handle]:
    if owner.animation_data:
        owner.animation_data.action = None
        for track in owner.animation_data.nla_tracks:
            track.mute = False
scene.frame_start = 0
scene.frame_end = 72
scene.frame_set(72)
package.matrix_world = Matrix.Identity(4)
bpy.context.view_layer.update()

blend = output_dir / "famas-final.blend"
glb = output_dir / "famas-baked-runtime.glb"
bpy.ops.wm.save_as_mainfile(filepath=str(blend), check_existing=False)
bpy.ops.export_scene.gltf(
    filepath=str(glb), export_format="GLB", export_cameras=True, export_lights=False,
    export_animations=True, export_animation_mode="NLA_TRACKS", export_merge_animation="NLA_TRACK",
    export_skins=True, export_materials="EXPORT", export_image_format="WEBP", export_image_quality=82,
    export_yup=True, export_force_sampling=True, export_optimize_animation_size=True,
    export_optimize_animation_keep_anim_armature=True, export_optimize_animation_keep_anim_object=True,
    export_frame_range=False,
)

report = {
    "schemaVersion": 1,
    "weapon": "famas",
    "ready": False,
    "sources": {"arHandsActions": M4_SHA, "body": FAMAS_SHA},
    "selection": {"bodyVertices": len(body_mesh.vertices), "magVertices": len(mag_ids),
                  "handleVertices": len(handle_ids)},
    "products": {
        "blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
        "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)},
    },
    "mechanism": "complete rear bullpup magazine and upper charging handle on empty reload",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("FAMAS_FINAL_OK " + json.dumps(report, separators=(",", ":")))
