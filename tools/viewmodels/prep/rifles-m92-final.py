"""Reauthor the Zastava M92 over the public approved AK control package.

The public AK package contributes only its reproducible rig, hands and action
grammar. Every visible firearm vertex comes from the public M92. Exact duplicate
vertices are welded before the complete curved magazine and the real right-side
charging handle are separated. Products remain outside Git.
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

AK_SHA = "3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29"
M92_SHA = "575ff58ae569392386edd2d8147904dd9e9dd75cb8979c1a95196457dbf70230"
FPS = 30
REPLACEMENT_MAG_OFFSET = Vector((-0.000887, -0.028286, 0.029107))


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


def rigid(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    obj.parent = rig
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.matrix_local = Matrix.Identity(4)
    for modifier in list(obj.modifiers):
        obj.modifiers.remove(modifier)
    modifier = obj.modifiers.new("CoroSolto_M92_FP_Rig", "ARMATURE")
    modifier.object = rig


ak_source = argument("ak-source")
m92_source = argument("m92-source")
output_dir = argument("output-dir")
if digest(ak_source) != AK_SHA or digest(m92_source) != M92_SHA:
    raise RuntimeError("fonte AK/M92 pública ausente ou divergente")
if not output_dir.is_absolute() or "worktrees/viewmodels-catalog-final" in str(output_dir):
    raise RuntimeError("output-dir deve ficar fora do Git")
output_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ak_source))
scene = bpy.context.scene
scene.render.fps = FPS
rig = bpy.data.objects["coro_solto_hires_fp_rig"]
body = bpy.data.objects["coro_solto_project_ak_body"]
magazine = bpy.data.objects["coro_solto_project_ak_magazine"]
replacement = bpy.data.objects["coro_solto_project_ak_replacement_magazine"]
handle = bpy.data.objects["coro_solto_project_ak_charging_handle"]

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(m92_source))
imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"M92 deveria conter uma malha; encontrou {len(imported)}")
source_object = imported[0]
welded = source_object.data.copy()
bm = bmesh.new()
bm.from_mesh(welded)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
bm.to_mesh(welded)
bm.free()

mag_ids, handle_ids = set(), set()
for group in components(welded):
    points = [welded.vertices[index].co for index in group]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    # Componente integral do pente curvo, incluindo lábio e base.
    if (len(group) == 50 and minimum.x < -0.20 and maximum.x > 0.05
            and minimum.z < -0.23 and maximum.z > 0.10):
        mag_ids.update(group)
    # Alavanca real que se projeta para o lado direito do receiver.
    if (len(group) == 51 and minimum.y < -0.07 and maximum.y < -0.005
            and 0.14 < minimum.z < 0.15 and maximum.z < 0.18):
        handle_ids.update(group)
if len(mag_ids) != 50 or len(handle_ids) != 51 or mag_ids & handle_ids:
    raise RuntimeError(f"seleção M92 divergente: mag={len(mag_ids)} handle={len(handle_ids)}")

body_mesh = without(welded, mag_ids | handle_ids, "MINT_WEAPON_M92_BODY_MESH")
mag_mesh = subset(welded, mag_ids, "MINT_WEAPON_M92_MAG_MESH")
handle_mesh = subset(welded, handle_ids, "MINT_CHARGING_M92_MESH")

# O gabarito AK aprovado registrou o receiver neste ponto. A M92 usa o mesmo
# eixo bruto (+X para a boca), mas é curta: len 0,76 * vm 0,90 = 0,684 m.
basis = Matrix(((0.0, 1.0, 0.0, 0.0), (0.0, 0.0, -1.0, 0.0),
                (-1.0, 0.0, 0.0, 0.0), (0.0, 0.0, 0.0, 1.0)))
ratio = 0.684 / 0.863
fit = (Matrix.Translation(Vector((-0.1475, -1.6065, -0.3500))) @ basis
       @ Matrix.Diagonal(Vector((0.684, 0.62 * ratio, 0.808 * ratio, 1.0))))
for mesh in (body_mesh, mag_mesh, handle_mesh):
    mesh.transform(fit)

materials = list(welded.materials)
body.data = body_mesh
magazine.data = mag_mesh
replacement.data = mag_mesh.copy()
replacement.data.transform(Matrix.Translation(REPLACEMENT_MAG_OFFSET))
handle.data = handle_mesh
for mesh in (body.data, magazine.data, replacement.data, handle.data):
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)
body.name = "MINT_WEAPON_M92"
magazine.name = "MINT_WEAPON_M92_MAG"
replacement.name = "MINT_WEAPON_M92_REPLACEMENT_MAG"
handle.name = "MINT_CHARGING_M92"
rig.name = "RIG_FP_ARMS"
rig.data.name = "RIG_FP_ARMS"
rigid(body, rig, "Rifle_metarig")
rigid(magazine, rig, "Mag_metarig")
rigid(replacement, rig, "Mag.001_metarig")
# A alavanca fica rigidamente no receiver; só reload_empty recebe seu ciclo.
rigid(handle, rig, "Bolt_metarig")
bpy.data.objects.remove(source_object, do_unlink=True)

tracks = {track.name: track.strips[0].action for track in rig.animation_data.nla_tracks}
required_source = {"Idle", "Equip", "Shoot", "Reload"}
if set(tracks) != required_source:
    raise RuntimeError(f"ações AK públicas divergiram: {sorted(tracks)}")
for track in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(track)


def nla(owner, name: str, action: bpy.types.Action) -> None:
    action.name = f"{name}__{owner.name}"
    track = owner.animation_data_create().nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, action)
    if getattr(strip, "action_slot", True) is None:
        strip.action_slot = action.slots[0]
    owner.animation_data.action = None


rig.animation_data.action = tracks["Idle"]
scene.frame_set(0)
bpy.context.view_layer.update()
hold = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}
hold_full = {bone.name: bone.matrix.copy() for bone in rig.pose.bones}
bolt_on_rifle = hold_full["Rifle_metarig"].inverted() @ hold_full["Bolt_metarig"]


def sample(action: bpy.types.Action, end: int) -> list[dict[str, Matrix]]:
    rig.animation_data.action = action
    poses = []
    for frame in range(end + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        poses.append({bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones})
    return poses


def blend_matrix(start: Matrix, end: Matrix, factor: float) -> Matrix:
    a_location, a_rotation, a_scale = start.decompose()
    b_location, b_rotation, b_scale = end.decompose()
    return Matrix.LocRotScale(a_location.lerp(b_location, factor),
                              a_rotation.slerp(b_rotation, factor),
                              a_scale.lerp(b_scale, factor))


def author(name: str, poses: list[dict[str, Matrix]], close_from: int | None = None,
           freeze_bolt: bool = False) -> None:
    action = bpy.data.actions.new(f"{name}__RIG_FP_ARMS")
    rig.animation_data.action = action
    end = len(poses) - 1
    for frame, pose in enumerate(poses):
        scene.frame_set(frame)
        factor = 0.0 if close_from is None or frame < close_from else (
            (frame - close_from) / max(1, end - close_from))
        factor = factor * factor * (3.0 - 2.0 * factor)
        for bone in rig.pose.bones:
            value = pose[bone.name]
            if factor:
                value = blend_matrix(value, hold[bone.name], factor)
            bone.matrix_basis = value
            bone.rotation_mode = "QUATERNION"
        bpy.context.view_layer.update()
        if freeze_bolt:
            rig.pose.bones["Bolt_metarig"].matrix = (
                rig.pose.bones["Rifle_metarig"].matrix @ bolt_on_rifle)
            bpy.context.view_layer.update()
        for bone in rig.pose.bones:
            bone.keyframe_insert("location", frame=frame, group=bone.name)
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
            bone.keyframe_insert("scale", frame=frame, group=bone.name)
    nla(rig, name, action)


# As curvas públicas são reamostradas para fecharem no idle sem pop. A recarga
# tática congela o ferrolho; a vazia conserva o gesto e o curso da alavanca.
equip_poses = sample(tracks["Equip"], 24)
shoot_poses = sample(tracks["Shoot"], 10)
reload_poses = sample(tracks["Reload"], 80)
nla(rig, "idle", tracks["Idle"].copy())
author("equip_rifle", equip_poses, close_from=18)
author("shoot", shoot_poses, close_from=7)
author("reload_tactical", reload_poses, close_from=70, freeze_bolt=True)
author("reload_empty", reload_poses, close_from=70)

# Inspect próprio: deriva do idle validado e gira todo o conjunto, mantendo os
# dois contatos porque mãos e arma permanecem no mesmo rig.
inspect = bpy.data.actions.new("inspect__RIG_FP_ARMS")
rig.animation_data.action = inspect
root = rig.pose.bones["metarig_rootJoint"]
for frame, angle, shift in ((0, 0.0, 0.0), (15, -0.04, 0.01), (30, -0.08, 0.02),
                            (45, -0.04, 0.01), (60, 0.0, 0.0)):
    scene.frame_set(frame)
    for bone in rig.pose.bones:
        bone.matrix_basis = hold[bone.name]
    root.matrix_basis = (Matrix.Translation(Vector((shift, 0.0, shift * 0.6)))
                         @ Matrix.Rotation(angle, 4, "Y") @ hold[root.name])
    for bone in rig.pose.bones:
        bone.keyframe_insert("location", frame=frame, group=bone.name)
        if bone.rotation_mode == "QUATERNION":
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
        else:
            bone.keyframe_insert("rotation_euler", frame=frame, group=bone.name)
        bone.keyframe_insert("scale", frame=frame, group=bone.name)
nla(rig, "inspect", inspect)

# Sockets presos ao bone Rifle no idle; acompanham saque, disparo e inspect.
rig.animation_data.action = tracks["Idle"]
scene.frame_set(0)
bpy.context.view_layer.update()
rifle_pose = rig.pose.bones["Rifle_metarig"].matrix
rifle_rest = rig.data.bones["Rifle_metarig"].matrix_local


def socket(name: str, raw: Vector) -> bpy.types.Object:
    point = rifle_pose @ rifle_rest.inverted() @ (fit @ raw)
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = "Rifle_metarig"
    obj.matrix_world = rig.matrix_world @ Matrix.Translation(point)
    return obj


socket("SOCKET_MINT_MUZZLE", Vector((0.495, 0.026, 0.135)))
socket("SOCKET_MINT_SIGHT", Vector((0.295, 0.026, 0.220)))
camera = next((obj for obj in scene.objects if obj.type == "CAMERA"), None)
if camera is None:
    raise RuntimeError("câmera AK pública ausente")
camera.name = "VIEWMODEL_CAMERA"
for obj in list(scene.objects):
    if obj.name.startswith("Icosphere"):
        bpy.data.objects.remove(obj, do_unlink=True)
for owner in (rig, handle):
    if owner.animation_data:
        owner.animation_data.action = None
        for track in owner.animation_data.nla_tracks:
            track.mute = False
scene.frame_start = 0
scene.frame_end = 80
scene.frame_set(0)
bpy.context.view_layer.update()

blend = output_dir / "m92-final.blend"
glb = output_dir / "m92-baked-runtime.glb"
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
    "schemaVersion": 1, "weapon": "m92", "ready": False,
    "sources": {"akHandsActions": AK_SHA, "body": M92_SHA},
    "selection": {"weldedVertices": len(welded.vertices), "bodyVertices": len(body_mesh.vertices),
                  "magVertices": len(mag_ids), "handleVertices": len(handle_ids)},
    "products": {"blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
                 "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)}},
    "mechanism": "complete curved rock-in magazine and real right-side charging handle on empty reload",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("M92_FINAL_OK " + json.dumps(report, separators=(",", ":")))
