"""Reauthor TAVOR over the validated AR package with a bullpup reload.

The public TAVOR body supplies every weapon vertex. The final M4 package is
used only for hands, camera and the common action grammar. The complete rear
magazine and the release paddle behind it are separated by connected-component
bounds measured on both sides of the public source. Products stay out of Git.
"""
from __future__ import annotations

import bmesh
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

M4_SHA = "e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe"
TAVOR_SHA = "958f09eec9033af88c954d57fef4130827a2b2958109c12f52644e1e7ace573c"
FPS = 30
FRAMES = 69  # 2.3 s: duração de gameplay da Tavor.


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
tavor_source = argument("tavor-source")
output_dir = argument("output-dir")
if digest(m4_source) != M4_SHA or digest(tavor_source) != TAVOR_SHA:
    raise RuntimeError("fonte M4/TAVOR ausente ou divergente")
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
bpy.ops.import_scene.gltf(filepath=str(tavor_source))
imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"TAVOR deveria conter uma malha; encontrou {len(imported)}")
source_object = imported[0]
welded = source_object.data.copy()
welded.name = "TAVOR_SOURCE_WELDED"
bm = bmesh.new()
bm.from_mesh(welded)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
bm.to_mesh(welded)
bm.free()
source_mesh = welded

mag_ids, release_ids = set(), set()
for group in components(source_mesh):
    points = [source_mesh.vertices[index].co for index in group]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    # Pente traseiro integral: a fonte tem o cano em +X (inversão pública já
    # documentada); o pente é a ilha alta de 40 vértices em -X.
    if (len(group) == 40 and minimum.x <= -0.26 and maximum.x >= -0.14
            and minimum.z < -0.20 and maximum.z <= 0.055):
        mag_ids.update(group)
    # Paddle inferior real atrás do pente: acionado após a inserção na recarga
    # vazia, sem inventar charging handle ou bolt mesh ausentes.
    if (len(group) == 36 and minimum.x <= -0.35 and maximum.x >= -0.28
            and minimum.z >= -0.05 and maximum.z <= -0.02):
        release_ids.update(group)
if len(mag_ids) != 40 or len(release_ids) != 36 or mag_ids & release_ids:
    raise RuntimeError(f"seleção TAVOR divergente: mag={len(mag_ids)} release={len(release_ids)}")

body_mesh = without(source_mesh, mag_ids | release_ids, "MINT_WEAPON_TAVOR_BODY")
mag_mesh = subset(source_mesh, mag_ids, "MINT_WEAPON_TAVOR_MAG_MESH")
release_mesh = subset(source_mesh, release_ids, "MINT_BOLT_RELEASE_TAVOR_MESH")
# A fonte pública aponta a boca para +X; o contrato AR aprovado aponta para -X.
# len 0,72 e vm 0,96 => 0,6912 m visuais; tracks AR mantêm scale 0,841643.
scale_factor = (0.72 * 0.96 / 0.998046875) / 0.8416434526443481
fit = Matrix.Scale(scale_factor, 4) @ Matrix.Rotation(math.pi, 4, "Z")
for mesh in (body_mesh, mag_mesh, release_mesh):
    mesh.transform(fit)

materials = list(source_mesh.materials)
gun.data = body_mesh
gun.name = "MINT_WEAPON_TAVOR"
mag.data = mag_mesh
mag.name = "MINT_WEAPON_TAVOR_MAG"
for mesh in (body_mesh, mag_mesh, release_mesh):
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)
release = bpy.data.objects.new("MINT_BOLT_RELEASE_TAVOR", release_mesh)
scene.collection.objects.link(release)
release.parent = gun
release.location = (0, 0, 0)
release.rotation_mode = "QUATERNION"
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


target = bpy.data.objects.new("TAVOR_RELOAD_TARGET", None)
scene.collection.objects.link(target)
hand_bone = rig.pose.bones["hand_l"]
ik = hand_bone.constraints.new("IK")
ik.name = "TAVOR_REAR_MAG_IK"
ik.target = target
ik.chain_count = 3
ik.use_tail = False


def reload_delta(frame: int) -> Vector:
    pulled = Vector((0.035, -0.050, -0.205))
    if frame < 10:
        return Vector()
    if frame < 23:
        return pulled * smooth((frame - 10) / 13)
    if frame <= 35:
        return pulled
    if frame < 49:
        return pulled * (1.0 - smooth((frame - 35) / 14))
    return Vector()


def ik_weight(frame: int) -> float:
    contact = 0.75
    if frame < 6:
        return 0.0
    if frame < 15:
        return contact * smooth((frame - 6) / 9)
    if frame <= 55:
        return contact
    if frame < 65:
        return contact * (1.0 - smooth((frame - 55) / 10))
    return 0.0


def sample(name: str):
    solo(name)
    poses = []
    for frame in range(FRAMES + 1):
        scene.frame_set(round(frame * 72 / FRAMES))
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

# A recarga vazia pressiona o paddle real depois de reassentar o pente.
for frame, z in ((0, 0.0), (50, 0.0), (56, -0.014 / gun.scale.z),
                 (62, 0.0), (FRAMES, 0.0)):
    scene.frame_set(frame)
    release.location = (0, 0, z)
    release.keyframe_insert("location", frame=frame)
release.animation_data.action.name = "reload_empty__MINT_BOLT_RELEASE_TAVOR"
track = release.animation_data.nla_tracks.new()
track.name = "reload_empty"
track.strips.new("reload_empty", 0, release.animation_data.action)
release.animation_data.action = None


def author_package_motion(name: str, frames: int, present_reload: bool = False) -> None:
    package.animation_data_create()
    package.animation_data.action = None
    for item in package.animation_data.nla_tracks:
        item.mute = True
    keys = ((0, 0.0), (8, 0.0), (22, 1.0), (48, 1.0), (62, 0.0), (frames, 0.0)) \
        if present_reload else ((0, 0.0), (frames, 0.0))
    for frame, amount in keys:
        # A M4 mantém o receiver baixo durante o reload. Na Tavor isso punha
        # o pente traseiro inteiro fora do 16:9. A apresentação inclina e
        # eleva o pacote durante o contato, voltando exatamente ao idle.
        package.location = (0.0, 0.0, 0.08 * amount)
        package.rotation_mode = "QUATERNION"
        package.rotation_quaternion = Quaternion(Vector((1.0, 0.0, 0.0)), 0.20 * amount)
        package.scale = (1.0, 1.0, 1.0)
        package.keyframe_insert("location", frame=frame, group=package.name)
        package.keyframe_insert("rotation_quaternion", frame=frame, group=package.name)
        package.keyframe_insert("scale", frame=frame, group=package.name)
    push(package, name)


author_package_motion("idle", 1)
author_package_motion("reload_tactical", FRAMES, present_reload=True)
author_package_motion("reload_empty", FRAMES, present_reload=True)

# Sockets calculados na arma própria, já orientada para -X no contrato AR.
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
sight.location = (minimum.x + (maximum.x - minimum.x) * 0.40,
                  (minimum.y + maximum.y) * 0.5, maximum.z - 0.02 / gun.scale.x)
package.name = "VM_PACKAGE_TAVOR"
scene.camera.name = "VIEWMODEL_CAMERA"

for name, location in {
    "grip_r": (-0.015 * scale_factor, 0.0, -0.075 * scale_factor),
    "support_l": (-0.255 * scale_factor, 0.0, 0.015 * scale_factor),
    "magazine": tuple((mag_min + mag_max) * 0.5),
    "magazine_insert": tuple((mag_min + mag_max) * 0.5),
}.items():
    marker = bpy.data.objects.get(name)
    if marker:
        marker.location = location

for owner in animated + [release]:
    if owner.animation_data:
        owner.animation_data.action = None
        for track in owner.animation_data.nla_tracks:
            track.mute = False
scene.frame_start = 0
scene.frame_end = FRAMES
scene.frame_set(FRAMES)
package_tracks = list(package.animation_data.nla_tracks)
for item in package_tracks:
    item.mute = True
package.matrix_world = Matrix.Identity(4)
release.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
for item in package_tracks:
    item.mute = False

blend = output_dir / "tavor-final.blend"
glb = output_dir / "tavor-baked-runtime.glb"
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
    "weapon": "tavor",
    "ready": False,
    "sources": {"arHandsActions": M4_SHA, "body": TAVOR_SHA},
    "selection": {"bodyVertices": len(body_mesh.vertices), "magVertices": len(mag_ids),
                  "releaseVertices": len(release_ids)},
    "products": {
        "blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
        "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)},
    },
    "clips": {"idle": 1 / FPS, "equip_rifle": 1.0, "shoot": 0.5,
              "reload_tactical": FRAMES / FPS, "reload_empty": FRAMES / FPS,
              "inspect": 1.5},
    "mechanism": "complete rear bullpup magazine and real release paddle on empty reload",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("TAVOR_FINAL_OK " + json.dumps(report, separators=(",", ":")))
