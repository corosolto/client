"""Reauthor the public lever-action carbine over the validated AR hand rig.

The public carbine supplies every visible firearm vertex. The preserved M4
package supplies only hands, camera and package-level draw/recoil/inspect
grammar. The real lever and right-side loading gate are isolated from the
public mesh. Reload is represented as hand-covered gate loading because the
source has no cartridge mesh; no detachable magazine or replacement asset is
invented. Products remain outside Git.
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
CARBINE_SHA = "9bbed4fec57b56c9a0aafe50a74bc4df6c3a138f2671dbb15c0d5cc6a27d4f3f"
FPS = 30
FRAMES = 84  # 2.8 s: exact gameplay reload duration.


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


def components(mesh: bpy.types.Mesh) -> list[list[int]]:
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


def subset(source: bpy.types.Mesh, keep: set[int], name: str) -> bpy.types.Mesh:
    result = source.copy()
    result.name = name
    bm = bmesh.new()
    bm.from_mesh(result)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in keep], context="VERTS")
    bm.to_mesh(result)
    bm.free()
    return result


def without(source: bpy.types.Mesh, remove: set[int], name: str) -> bpy.types.Mesh:
    result = source.copy()
    result.name = name
    bm = bmesh.new()
    bm.from_mesh(result)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index in remove], context="VERTS")
    bm.to_mesh(result)
    bm.free()
    return result


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


def remove_tracks(owner, names: set[str]) -> None:
    if not owner.animation_data:
        return
    owner.animation_data.action = None
    for track in list(owner.animation_data.nla_tracks):
        if track.name in names:
            owner.animation_data.nla_tracks.remove(track)


m4_source = argument("m4-source")
carbine_source = argument("carbine-source")
output_dir = argument("output-dir")
if digest(m4_source) != M4_SHA or digest(carbine_source) != CARBINE_SHA:
    raise RuntimeError("fonte M4/carabina ausente ou divergente")
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
bpy.ops.import_scene.gltf(filepath=str(carbine_source))
imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"carabina deveria conter uma malha; encontrou {len(imported)}")
source_object = imported[0]
welded = source_object.data.copy()
bm = bmesh.new()
bm.from_mesh(welded)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
bm.to_mesh(welded)
bm.free()

lever_ids, gate_ids = set(), set()
for group in components(welded):
    points = [welded.vertices[index].co for index in group]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    # Arco integral sob o receiver: pivô dianteiro, loop e ligação traseira.
    if (len(group) == 162 and minimum.y > 0.07 and maximum.y < 0.24
            and minimum.z < -0.06 and maximum.z < 0.03):
        lever_ids.update(group)
    # Tampa/porta real no lado direito do receiver. É planar em X e fica
    # atrás do guarda-mão. Não se cria cartucho nem magazine destacável.
    if (len(group) == 14 and -0.015 < minimum.x < -0.014
            and 0.02 < minimum.y < 0.03 and 0.06 < maximum.y < 0.07):
        gate_ids.update(group)
if len(lever_ids) != 162 or len(gate_ids) != 14 or lever_ids & gate_ids:
    raise RuntimeError(f"seleção carabina divergente: lever={len(lever_ids)} gate={len(gate_ids)}")

body_mesh = without(welded, lever_ids | gate_ids, "MINT_WEAPON_CARBINE_BODY_MESH")
lever_mesh = subset(welded, lever_ids, "MINT_LEVER_CARBINE_MESH")
gate_mesh = subset(welded, gate_ids, "MINT_LOADING_GATE_CARBINE_MESH")

# A fonte aponta a boca para -Y; o contrato AR aponta para -X. O objeto M4
# preservado ainda aplica scale 0.841643. Resultado visual: 0.98 * 0.92 m.
scale_factor = (0.98 * 0.92 / 0.998046875) / 0.8416434526443481
fit = Matrix.Scale(scale_factor, 4) @ Matrix.Rotation(-math.pi / 2, 4, "Z")
for mesh in (body_mesh, lever_mesh, gate_mesh):
    mesh.transform(fit)

materials = list(welded.materials)
gun.data = body_mesh
gun.name = "MINT_WEAPON_CARBINE"
for child in list(mag.children):
    bpy.data.objects.remove(child, do_unlink=True)
bpy.data.objects.remove(mag, do_unlink=True)
lever = bpy.data.objects.new("MINT_LEVER_CARBINE", lever_mesh)
gate = bpy.data.objects.new("MINT_LOADING_GATE_CARBINE", gate_mesh)
scene.collection.objects.link(lever)
scene.collection.objects.link(gate)
for obj in (lever, gate):
    obj.parent = gun
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.matrix_local = Matrix.Identity(4)
    obj.rotation_mode = "QUATERNION"
for mesh in (body_mesh, lever_mesh, gate_mesh):
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)
bpy.data.objects.remove(source_object, do_unlink=True)

package.name = "VM_PACKAGE_CARBINE"
scene.camera.name = "VIEWMODEL_CAMERA"
animated = [rig, gun, cloth_keys, package]


def solo(name: str) -> None:
    for owner in animated:
        if owner.animation_data:
            owner.animation_data.action = None
            for track in owner.animation_data.nla_tracks:
                track.mute = track.name != name


bone_order = sorted(rig.pose.bones, key=lambda bone: len(bone.parent_recursive))

# A gate é a ilha planar do lado direito. O alvo fica poucos centímetros para
# fora dela e entra no plano em três pulsos, sempre coberto pela mão.
gate_points = [v.co for v in gate_mesh.vertices]
gate_center = sum(gate_points, Vector()) / len(gate_points)
feed_outside = gate_center + Vector((0.0, 0.075, 0.005))


def feed_pose(frame: int) -> Vector:
    if frame < 12:
        return feed_outside + Vector((0.04, 0.04, -0.03))
    centers = (27, 43, 59)
    result = feed_outside.copy()
    for center in centers:
        distance = abs(frame - center)
        if distance <= 7:
            result += Vector((0.0, -0.052 * (1.0 - smooth(distance / 7)), 0.0))
    return result


def feed_weight(frame: int) -> float:
    # A pose-base já conduz a mão até a arma. O IK só fecha os últimos
    # centímetros sobre a portinhola; influência total alonga o braço e traz a
    # luva para o centro da câmera.
    contact = 0.75
    if frame < 8:
        return 0.0
    if frame < 16:
        return contact * smooth((frame - 8) / 8)
    if frame <= 67:
        return contact
    if frame < 80:
        return contact * (1.0 - smooth((frame - 67) / 13))
    return 0.0


def sample_reload(source_name: str):
    target = bpy.data.objects.new(f"CARBINE_FEED_TARGET_{source_name}", None)
    scene.collection.objects.link(target)
    hand = rig.pose.bones["hand_l"]
    ik = hand.constraints.new("IK")
    ik.name = "CARBINE_LOADING_GATE_IK"
    ik.target = target
    ik.chain_count = 3
    ik.use_tail = False
    poses = []
    for frame in range(FRAMES + 1):
        source_frame = round(frame * 72 / FRAMES)
        solo(source_name)
        scene.frame_set(source_frame)
        target.location = gun.matrix_world @ feed_pose(frame)
        ik.influence = feed_weight(frame)
        bpy.context.view_layer.update()
        poses.append({
            "rig_world": rig.matrix_world.copy(),
            "gun_world": gun.matrix_world.copy(),
            "bones": {bone.name: bone.matrix.copy() for bone in rig.pose.bones},
            "cuff": float(cuff.value),
        })
    hand.constraints.remove(ik)
    bpy.data.objects.remove(target, do_unlink=True)
    return poses


tactical = sample_reload("reload_tactical")
empty = sample_reload("reload_empty")
for owner in (rig, gun, cloth_keys):
    remove_tracks(owner, {"reload_tactical", "reload_empty"})


def author_reload(name: str, poses) -> None:
    for owner in (rig, gun, cloth_keys):
        if owner.animation_data:
            owner.animation_data.action = None
            for track in owner.animation_data.nla_tracks:
                track.mute = True
    for frame, pose in enumerate(poses):
        scene.frame_set(frame)
        rig.matrix_world = pose["rig_world"]
        gun.matrix_world = pose["gun_world"]
        cuff.value = pose["cuff"]
        for bone in bone_order:
            bone.matrix = pose["bones"][bone.name]
            bone.rotation_mode = "QUATERNION"
        for owner in (rig, gun):
            owner.rotation_mode = "QUATERNION"
            owner.keyframe_insert("location", frame=frame, group=owner.name)
            owner.keyframe_insert("rotation_quaternion", frame=frame, group=owner.name)
            owner.keyframe_insert("scale", frame=frame, group=owner.name)
        for bone in rig.pose.bones:
            bone.keyframe_insert("location", frame=frame, group=bone.name)
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
            bone.keyframe_insert("scale", frame=frame, group=bone.name)
        cuff.keyframe_insert("value", frame=frame)
    for owner in (rig, gun, cloth_keys):
        push(owner, name)


author_reload("reload_tactical", tactical)
author_reload("reload_empty", empty)


def pulse(frame: int, center: int, radius: int) -> float:
    distance = abs(frame - center)
    return 0.0 if distance > radius else 1.0 - smooth(distance / radius)


def author_gate(name: str) -> None:
    gate.animation_data_create()
    gate.animation_data.action = None
    for frame in range(FRAMES + 1):
        press = max(pulse(frame, center, 7) for center in (27, 43, 59))
        gate.location = Vector((0.0, -0.006 * press, 0.0))
        gate.keyframe_insert("location", frame=frame, group=gate.name)
    push(gate, name)


author_gate("reload_tactical")
author_gate("reload_empty")

# A recarga vazia termina com um ciclo completo da alavanca. O pivô e o ponto
# de mão vêm da própria ilha da alavanca.
lever_points = [v.co for v in lever_mesh.vertices]
lever_min = Vector(tuple(min(p[i] for p in lever_points) for i in range(3)))
lever_max = Vector(tuple(max(p[i] for p in lever_points) for i in range(3)))
lever_pivot = Vector((lever_min.x, (lever_min.y + lever_max.y) * 0.5, lever_max.z))
lever_contact = Vector((lever_min.x + (lever_max.x - lever_min.x) * 0.68,
                        (lever_min.y + lever_max.y) * 0.5,
                        lever_min.z + (lever_max.z - lever_min.z) * 0.25))


def lever_matrix(amount: float) -> Matrix:
    return (Matrix.Translation(lever_pivot)
            @ Matrix.Rotation(math.radians(58) * amount, 4, "Y")
            @ Matrix.Translation(-lever_pivot))


def author_lever(name: str, start: int, peak: int, end: int, total: int) -> None:
    lever.animation_data_create()
    lever.animation_data.action = None
    for frame in range(total + 1):
        if frame <= start or frame >= end:
            amount = 0.0
        elif frame <= peak:
            amount = smooth((frame - start) / (peak - start))
        else:
            amount = 1.0 - smooth((frame - peak) / (end - peak))
        lever.matrix_basis = lever_matrix(amount)
        lever.keyframe_insert("location", frame=frame, group=lever.name)
        lever.keyframe_insert("rotation_quaternion", frame=frame, group=lever.name)
        lever.keyframe_insert("scale", frame=frame, group=lever.name)
    push(lever, name)


author_lever("reload_empty", 66, 74, 83, FRAMES)

# O ciclo de tiro move a alavanca e a mão forte juntas. A pose-base vem do
# idle; o recoil global continua no package track aprovado.
solo("idle")
target = bpy.data.objects.new("CARBINE_LEVER_HAND_TARGET", None)
scene.collection.objects.link(target)
hand_r = rig.pose.bones["hand_r"]
ik_r = hand_r.constraints.new("IK")
ik_r.name = "CARBINE_LEVER_HAND_IK"
ik_r.target = target
ik_r.chain_count = 3
ik_r.use_tail = False
shoot_poses = []
for frame in range(16):
    scene.frame_set(0)
    amount = smooth(frame / 7) if frame <= 7 else 1.0 - smooth((frame - 7) / 8)
    transform = lever_matrix(amount)
    target.location = gun.matrix_world @ (transform @ lever_contact)
    # O alvo está no espaço da arma e a corrente do braço é longa. Uma
    # influência discreta conserva a empunhadura e comunica o ciclo da
    # alavanca sem projetar a mão forte contra a câmera.
    ik_r.influence = 0.10
    bpy.context.view_layer.update()
    shoot_poses.append({bone.name: bone.matrix.copy() for bone in rig.pose.bones})
hand_r.constraints.remove(ik_r)
bpy.data.objects.remove(target, do_unlink=True)
remove_tracks(rig, {"shoot"})
for track in rig.animation_data.nla_tracks:
    track.mute = True
for frame, pose in enumerate(shoot_poses):
    scene.frame_set(frame)
    for bone in bone_order:
        bone.matrix = pose[bone.name]
        bone.rotation_mode = "QUATERNION"
    for bone in rig.pose.bones:
        bone.keyframe_insert("location", frame=frame, group=bone.name)
        bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
        bone.keyframe_insert("scale", frame=frame, group=bone.name)
push(rig, "shoot")
author_lever("shoot", 0, 7, 15, 15)

# O package herdado não tinha tracks nos clipes de rig. A reautoria tocou sua
# base durante a amostragem NLA; gravar identidade em cada clipe impede idle ou
# reload de herdarem o primeiro key do draw no round trip glTF.
def author_package_hold(name: str, frames: int) -> None:
    package.animation_data_create()
    package.animation_data.action = None
    for track in package.animation_data.nla_tracks:
        track.mute = True
    for frame in (0, frames):
        package.location = (0.0, 0.0, 0.0)
        package.rotation_mode = "QUATERNION"
        package.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        package.scale = (1.0, 1.0, 1.0)
        package.keyframe_insert("location", frame=frame, group=package.name)
        package.keyframe_insert("rotation_quaternion", frame=frame, group=package.name)
        package.keyframe_insert("scale", frame=frame, group=package.name)
    push(package, name)


author_package_hold("idle", 1)
author_package_hold("reload_tactical", FRAMES)
author_package_hold("reload_empty", FRAMES)

# Reposiciona sockets e marcadores para a geometria própria. -X é a boca.
body_points = [v.co for v in body_mesh.vertices]
minimum = Vector(tuple(min(p[i] for p in body_points) for i in range(3)))
maximum = Vector(tuple(max(p[i] for p in body_points) for i in range(3)))
muzzle = next((child for child in gun.children if child.name == "SOCKET_MINT_MUZZLE"), None)
sight = next((child for child in gun.children if child.name == "SOCKET_MINT_SIGHT"), None)
if not muzzle or not sight:
    raise RuntimeError("sockets herdados ausentes")
muzzle.location = (minimum.x, 0.0, 0.065 * scale_factor)
sight.location = (-0.048 * scale_factor, 0.0, 0.101 * scale_factor)
for name, location in {
    "grip_r": (0.145 * scale_factor, 0.0, -0.040 * scale_factor),
    "support_l": (-0.145 * scale_factor, 0.0, 0.005 * scale_factor),
    "magazine": tuple(gate_center),
    "magazine_insert": tuple(gate_center),
}.items():
    marker = bpy.data.objects.get(name)
    if marker:
        marker.location = location

for owner in animated + [lever, gate]:
    if owner.animation_data:
        owner.animation_data.action = None
        for track in owner.animation_data.nla_tracks:
            track.mute = False
scene.frame_start = 0
scene.frame_end = FRAMES
scene.frame_set(FRAMES)
# Grave explicitamente a base do package com NLA suspenso. Sem isto o glTF
# pode herdar como default o primeiro key do equip e fazer idle nascer baixo.
package_tracks = list(package.animation_data.nla_tracks)
for track in package_tracks:
    track.mute = True
package.location = (0.0, 0.0, 0.0)
package.rotation_mode = "QUATERNION"
package.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
package.scale = (1.0, 1.0, 1.0)
lever.matrix_basis = Matrix.Identity(4)
gate.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
for track in package_tracks:
    track.mute = False

blend = output_dir / "carbine-final.blend"
glb = output_dir / "carbine-baked-runtime.glb"
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
    "weapon": "carbine",
    "ready": False,
    "sources": {"arHandsActions": M4_SHA, "body": CARBINE_SHA},
    "selection": {"bodyVertices": len(body_mesh.vertices), "leverVertices": len(lever_ids),
                  "loadingGateVertices": len(gate_ids)},
    "products": {
        "blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
        "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)},
    },
    "clips": {"idle": 1 / FPS, "equip_rifle": 1.0, "shoot": 0.5,
              "reload_tactical": 2.8, "reload_empty": 2.8, "inspect": 1.5},
    "mechanism": "lever-action cycle; right-side loading gate; no invented detachable magazine or cartridge",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("CARBINE_FINAL_OK " + json.dumps(report, separators=(",", ":")))
