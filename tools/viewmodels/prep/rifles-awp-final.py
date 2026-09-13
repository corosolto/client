"""Reauthor the AWP over the public approved AK control package.

The public AK package contributes only its reproducible rig, hands and action
grammar. Every visible firearm vertex comes from the public AWP. Exact duplicate
vertices are welded before topological cuts separate the complete magazine
and the real bolt handle. The magazine release is fused into the receiver in
the source. Products remain outside Git.
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
AWP_SHA = "6a303a1b97dfd23b9e1e9c979700119dffbb0ee3c48551751887f7f86a372a2a"
FPS = 30
REPLACEMENT_MAG_OFFSET = Vector((-0.001, -0.030, 0.030))


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


def subset_faces(source: bpy.types.Mesh, keep: set[int], name: str) -> bpy.types.Mesh:
    result = source.copy()
    result.name = name
    bm = bmesh.new()
    bm.from_mesh(result)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[face for face in bm.faces if face.index not in keep], context="FACES")
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if not vertex.link_faces], context="VERTS")
    bm.to_mesh(result)
    bm.free()
    return result


def without_faces(source: bpy.types.Mesh, remove: set[int], name: str) -> bpy.types.Mesh:
    result = source.copy()
    result.name = name
    bm = bmesh.new()
    bm.from_mesh(result)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[face for face in bm.faces if face.index in remove], context="FACES")
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if not vertex.link_faces], context="VERTS")
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
    modifier = obj.modifiers.new("CoroSolto_AWP_FP_Rig", "ARMATURE")
    modifier.object = rig


ak_source = argument("ak-source")
awp_source = argument("awp-source")
output_dir = argument("output-dir")
if digest(ak_source) != AK_SHA or digest(awp_source) != AWP_SHA:
    raise RuntimeError("fonte AK/AWP pública ausente ou divergente")
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
bpy.ops.import_scene.gltf(filepath=str(awp_source))
imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"AWP deveria conter uma malha; encontrou {len(imported)}")
source_object = imported[0]
welded = source_object.data.copy()
bm = bmesh.new()
bm.from_mesh(welded)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
bm.to_mesh(welded)
bm.free()

groups = components(welded)
mag_vertices = set()
bolt_vertices = set()
for group in groups:
    points = [welded.vertices[index].co for index in group]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    # Pente completo: ilha topológica sob o receiver, incluindo lábio e base.
    if (len(group) == 101 and 0.077 < minimum.x < 0.078 and maximum.x < 0.168
            and -0.086 < minimum.z < -0.084 and maximum.z < -0.026):
        mag_vertices.update(group)
    # Alavanca real do ferrolho no lado direito do receiver.
    if (len(group) == 32 and 0.208 < minimum.x < 0.209 and maximum.x < 0.224
            and minimum.y > 0.008 and maximum.y < 0.019 and maximum.z < -0.028):
        bolt_vertices.update(group)
if (len(mag_vertices), len(bolt_vertices)) != (101, 32):
    raise RuntimeError(
        f"seleção AWP divergente: mag={len(mag_vertices)} bolt={len(bolt_vertices)}")

mag_faces = {polygon.index for polygon in welded.polygons
             if any(vertex in mag_vertices for vertex in polygon.vertices)}
bolt_faces = {polygon.index for polygon in welded.polygons
              if any(vertex in bolt_vertices for vertex in polygon.vertices)}
if len(mag_faces) != 176 or len(bolt_faces) != 60 or mag_faces & bolt_faces:
    raise RuntimeError(f"corte AWP divergente: mag={len(mag_faces)} bolt={len(bolt_faces)}")

body_mesh = without_faces(welded, mag_faces | bolt_faces,
                          "MINT_WEAPON_AWP_BODY_MESH")
mag_mesh = subset_faces(welded, mag_faces, "MINT_WEAPON_AWP_MAG_MESH")
bolt_mesh = subset_faces(welded, bolt_faces, "MINT_BOLT_AWP_MESH")

# O gabarito AK aprovado registrou o punho/receiver neste ponto. Na AWP, o eixo
# bruto aponta a boca para -X; a rotação explícita o alinha ao mesmo -Z do rig.
basis = Matrix(((0.0, 1.0, 0.0, 0.0), (0.0, 0.0, -1.0, 0.0),
                (-1.0, 0.0, 0.0, 0.0), (0.0, 0.0, 0.0, 1.0)))
ratio = 1.15 / 0.998046875
fit = (Matrix.Translation(Vector((-0.1475, -1.6065, -0.3500))) @ basis
       @ Matrix.Diagonal(Vector((1.15, 0.62 * ratio, 0.808 * ratio, 1.0)))
       @ Matrix.Rotation(math.pi, 4, "Z"))
for mesh in (body_mesh, mag_mesh, bolt_mesh):
    mesh.transform(fit)

materials = list(welded.materials)
body.data = body_mesh
magazine.data = mag_mesh
replacement.data = mag_mesh.copy()
replacement.data.transform(Matrix.Translation(REPLACEMENT_MAG_OFFSET))
handle.data = bolt_mesh
for mesh in (body.data, magazine.data, replacement.data, handle.data):
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)
body.name = "MINT_WEAPON_AWP"
magazine.name = "MINT_WEAPON_AWP_MAG"
replacement.name = "MINT_WEAPON_AWP_REPLACEMENT_MAG"
handle.name = "MINT_BOLT_AWP"
rig.name = "RIG_FP_ARMS"
rig.data.name = "RIG_FP_ARMS"
rigid(body, rig, "Rifle_metarig")
rigid(magazine, rig, "Mag_metarig")
rigid(replacement, rig, "Mag.001_metarig")
# A alavanca própria acompanha o bone real do ferrolho da gramática doadora.
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


# As curvas públicas são reamostradas para fecharem no idle sem pop. O bone do
# ferrolho conserva a distinção cinemática da base e move a alavanca própria.
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


socket("SOCKET_MINT_MUZZLE", Vector((-0.499, 0.0137, 0.0313)))
socket("SOCKET_MINT_SIGHT", Vector((0.2666, 0.0137, 0.0967)))
(scene.objects.get("SOCKET_MINT_SIGHT"))["optic"] = "source scope ocular center"
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

blend = output_dir / "awp-final.blend"
glb = output_dir / "awp-baked-runtime.glb"
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
    "schemaVersion": 1, "weapon": "awp", "ready": False,
    "sources": {"akHandsActions": AK_SHA, "body": AWP_SHA},
    "selection": {"weldedVertices": len(welded.vertices), "sourceFaces": len(welded.polygons),
                  "bodyFaces": len(welded.polygons) - len(mag_faces) - len(bolt_faces),
                  "magFaces": len(mag_faces), "boltFaces": len(bolt_faces)},
    "products": {"blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
                 "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)}},
    "mechanism": "complete detachable magazine and real right-side bolt handle; magazine release is fused into the public receiver",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("AWP_FINAL_OK " + json.dumps(report, separators=(",", ":")))
