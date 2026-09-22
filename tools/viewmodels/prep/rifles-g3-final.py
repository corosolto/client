"""Reautora a G3 pública sobre o rig KINEMATION aprovado.

O checkpoint final da M4 fornece rig, três camadas de mãos e seis ações. A
receita troca somente arma e pente, preservando a malha pública própria. O
pente reto completo e os dois botões reais de retenção são separados por
topologia; a fonte não contém charging handle separável, portanto nenhum é
inventado.
Produtos permanecem fora do Git.
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
G3_SHA = "b19eb799350ce0a264b6cce90552bb9849ec34fb95260177357c3f53c7b7bb9e"
COMPRIMENTO_ALVO = 1.02


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
    seen: set[int] = set()
    result: list[list[int]] = []
    for start in range(len(mesh.vertices)):
        if start in seen:
            continue
        stack = [start]
        seen.add(start)
        group: list[int] = []
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


def push_nla(owner: bpy.types.Object, name: str) -> None:
    action = owner.animation_data.action
    if action is None:
        raise RuntimeError(f"ação {name} não foi criada em {owner.name}")
    action.name = f"{name}__{owner.name}"
    track = owner.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, action)
    if getattr(strip, "action_slot", True) is None:
        strip.action_slot = action.slots[0]
    owner.animation_data.action = None


m4_source = argument("m4-source")
g3_source = argument("g3-source")
output_dir = argument("output-dir")
if digest(m4_source) != M4_SHA or digest(g3_source) != G3_SHA:
    raise RuntimeError("fonte M4/G3 ausente ou divergente")
if not output_dir.is_absolute() or "worktrees/viewmodels-catalog-final" in str(output_dir):
    raise RuntimeError("output-dir deve ficar fora do Git")
output_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(m4_source), load_ui=False)
scene = bpy.context.scene
body = bpy.data.objects["MINT_WEAPON_M4"]
magazine = bpy.data.objects["MINT_WEAPON_M4_MAG"]
package = bpy.data.objects["VM_PACKAGE_M4"]

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(g3_source))
imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"G3 deveria conter uma malha; encontrou {len(imported)}")
source_object = imported[0]
welded = source_object.data.copy()
bm = bmesh.new()
bm.from_mesh(welded)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
bm.to_mesh(welded)
bm.free()

main_vertices = set(max(components(welded), key=len))
release_vertices: set[int] = set()
for group in components(welded):
    points = [welded.vertices[index].co for index in group]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    # Dois botões reais e simétricos imediatamente atrás do poço do pente.
    if (len(group) == 25 and -0.053 < minimum.x < -0.043 and maximum.x < -0.043
            and abs(minimum.z + 0.00683594) < 1e-5 and maximum.z < 0.0011):
        release_vertices.update(group)
if len(release_vertices) != 50:
    raise RuntimeError(f"seleção G3 divergente: release={len(release_vertices)}")

release_faces = {polygon.index for polygon in welded.polygons
                 if any(vertex in release_vertices for vertex in polygon.vertices)}
mag_faces = {polygon.index for polygon in welded.polygons
             if all(vertex in main_vertices for vertex in polygon.vertices)
             and -0.045 <= polygon.center.x <= 0.075 and polygon.center.z <= -0.020
             and polygon.index not in release_faces}
if len(mag_faces) != 32 or len(release_faces) != 92 or mag_faces & release_faces:
    raise RuntimeError(f"corte G3 divergente: mag={len(mag_faces)} release={len(release_faces)}")

body_mesh = without_faces(welded, mag_faces | release_faces, "MINT_WEAPON_G3_BODY_MESH")
mag_mesh = subset_faces(welded, mag_faces, "MINT_WEAPON_G3_MAG_MESH")
release_mesh = subset_faces(welded, release_faces, "MINT_MAG_RELEASE_G3_MESH")

# A fonte G3 aponta a boca para +X; o pacote KINEMATION aponta para -X.
# A escala do objeto M4 faz parte das ações herdadas e entra na compensação.
raw_corners = [Vector(corner) for corner in source_object.bound_box]
raw_length = max(
    max(corner[axis] for corner in raw_corners) - min(corner[axis] for corner in raw_corners)
    for axis in range(3)
)
scale_factor = (COMPRIMENTO_ALVO / raw_length) / body.scale.x
fit = Matrix.Rotation(math.pi, 4, "Z") @ Matrix.Scale(scale_factor, 4)
for mesh in (body_mesh, mag_mesh, release_mesh):
    mesh.transform(fit)

materials = list(welded.materials)
body.data = body_mesh
body.name = "MINT_WEAPON_G3"
magazine.data = mag_mesh
magazine.name = "MINT_WEAPON_G3_MAG"
for mesh in (body_mesh, mag_mesh, release_mesh):
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)

release = bpy.data.objects.new("MINT_MAG_RELEASE_G3", release_mesh)
scene.collection.objects.link(release)
release.parent = body
release.location = (0.0, 0.0, 0.0)
release.rotation_mode = "QUATERNION"
for clip_name in ("reload_tactical", "reload_empty"):
    for frame, offset in ((0, 0.0), (10, 0.0), (15, -0.006 / body.scale.x),
                          (21, 0.0), (72, 0.0)):
        scene.frame_set(frame)
        release.location = (0.0, offset, 0.0)
        release.keyframe_insert("location", frame=frame, group=release.name)
    push_nla(release, clip_name)

bpy.data.objects.remove(source_object, do_unlink=True)
bpy.context.view_layer.update()
corners = [Vector(corner) for corner in body.bound_box]
minimum = Vector(tuple(min(corner[axis] for corner in corners) for axis in range(3)))
maximum = Vector(tuple(max(corner[axis] for corner in corners) for axis in range(3)))
muzzle = next((child for child in body.children if child.name == "SOCKET_MINT_MUZZLE"), None)
sight = next((child for child in body.children if child.name == "SOCKET_MINT_SIGHT"), None)
if not muzzle or not sight:
    raise RuntimeError("sockets herdados do pacote M4 ausentes")
muzzle.location = (minimum.x, (minimum.y + maximum.y) / 2, (minimum.z + maximum.z) * 0.52)
sight.location = (maximum.x - (maximum.x - minimum.x) * 0.31,
                  (minimum.y + maximum.y) / 2,
                  maximum.z - 0.04 / body.scale.x)

package.name = "VM_PACKAGE_G3"
scene.camera.name = "VIEWMODEL_CAMERA"

# Idle e recargas recebem root neutro explícito: evita que o exporter escolha
# o primeiro key do saque como transform-base para clipes sem canal do package.
for clip_name, end_frame in (("idle", 1), ("reload_tactical", 72), ("reload_empty", 72)):
    if package.animation_data:
        package.animation_data.action = None
        for track in package.animation_data.nla_tracks:
            track.mute = True
    for frame in (0, end_frame):
        scene.frame_set(frame)
        package.location = (0.0, 0.0, 0.0)
        package.rotation_mode = "QUATERNION"
        package.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        package.scale = (1.0, 1.0, 1.0)
        package.keyframe_insert("location", frame=frame, group=package.name)
        package.keyframe_insert("rotation_quaternion", frame=frame, group=package.name)
        package.keyframe_insert("scale", frame=frame, group=package.name)
    push_nla(package, clip_name)

scene.frame_set(72)
for owner in (package, release):
    if owner.animation_data:
        owner.animation_data.action = None
        for track in owner.animation_data.nla_tracks:
            track.mute = True
package.matrix_world = Matrix.Identity(4)
package.rotation_mode = "QUATERNION"
release.location = (0.0, 0.0, 0.0)
bpy.context.view_layer.update()
for owner in (package, release):
    if owner.animation_data:
        for track in owner.animation_data.nla_tracks:
            for strip in track.strips:
                strip.extrapolation = "NOTHING"
            track.mute = False
bpy.context.view_layer.update()

blend = output_dir / "g3-final.blend"
glb = output_dir / "g3-baked-runtime.glb"
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
    "weapon": "g3",
    "ready": False,
    "sources": {"arHandsActions": M4_SHA, "body": G3_SHA},
    "selection": {
        "weldedVertices": len(welded.vertices),
        "sourceFaces": len(welded.polygons),
        "bodyFaces": len(welded.polygons) - len(mag_faces) - len(release_faces),
        "magFaces": len(mag_faces),
        "releaseFaces": len(release_faces),
    },
    "scale": round(scale_factor, 6),
    "products": {
        "blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
        "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)},
    },
    "mechanism": "complete straight magazine and bilateral real magazine-button press over KINEMATION rig; source has no separable charging handle",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("G3_KINEMATION_OK " + json.dumps(report, separators=(",", ":")))
