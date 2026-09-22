"""Reautora a G3SG1 sobre as mangas e ações KINEMATION da G3 aprovada.

A fonte pública fornece a arma própria. O checkpoint privado da G3 fornece as
três camadas de mãos, a pose, a câmera e as seis ações. A receita troca somente
o corpo e o carregador, separa a alavanca real da G3SG1 e a anima na recarga
vazia. Produtos permanecem fora do Git e a candidata continua ``ready:false``.
"""
from __future__ import annotations

import bmesh
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Vector

G3_KINEMATION_SHA = "35f3d2daf6c83096b33b8e1178220ebf6b7b268d1a8017acd376d65a078e0c21"
G3SG1_SHA = "3634db457fe27b5904955efb64c74dadf2336263fa64e153014d76df31770ddb"
COMPRIMENTO_ALVO = 1.12


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


g3_source = argument("g3-kinemation")
g3sg1_source = argument("g3sg1-source")
output_dir = argument("output-dir")
if digest(g3_source) != G3_KINEMATION_SHA or digest(g3sg1_source) != G3SG1_SHA:
    raise RuntimeError("fonte G3 KINEMATION/G3SG1 ausente ou divergente")
if not output_dir.is_absolute() or "worktrees/viewmodels-catalog-final" in str(output_dir):
    raise RuntimeError("output-dir deve ficar fora do Git")
output_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(g3_source), load_ui=False)
scene = bpy.context.scene
body = bpy.data.objects["MINT_WEAPON_G3"]
magazine = bpy.data.objects["MINT_WEAPON_G3_MAG"]
old_release = bpy.data.objects["MINT_MAG_RELEASE_G3"]
package = bpy.data.objects["VM_PACKAGE_G3"]

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(g3sg1_source))
imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"G3SG1 deveria conter uma malha; encontrou {len(imported)}")
source_object = imported[0]
welded = source_object.data.copy()
bm = bmesh.new()
bm.from_mesh(welded)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
bm.to_mesh(welded)
bm.free()

# Caixas medidas na fonte G3SG1: o carregador está abaixo do receiver; a
# alavanca é o componente no topo frontal. Exigir todas as arestas dentro da
# caixa evita arrancar faces adjacentes do corpo.
mag_vertices = {
    vertex.index for vertex in welded.vertices
    if vertex.co.z <= -0.048 and -0.27 <= vertex.co.x <= 0.03
}
handle_vertices = {
    vertex.index for vertex in welded.vertices
    if vertex.co.z >= 0.115 and 0.01 <= vertex.co.x <= 0.09
}
mag_faces = {
    polygon.index for polygon in welded.polygons
    if all(vertex in mag_vertices for vertex in polygon.vertices)
}
handle_faces = {
    polygon.index for polygon in welded.polygons
    if all(vertex in handle_vertices for vertex in polygon.vertices)
}
if ((len(mag_vertices), len(handle_vertices), len(mag_faces), len(handle_faces))
        != (91, 21, 154, 24)) or mag_faces & handle_faces:
    raise RuntimeError(
        "seleção G3SG1 divergente: "
        f"mag={len(mag_vertices)}/{len(mag_faces)} "
        f"alavanca={len(handle_vertices)}/{len(handle_faces)}")

body_mesh = without_faces(welded, mag_faces | handle_faces, "MINT_WEAPON_G3SG1_BODY_MESH")
mag_mesh = subset_faces(welded, mag_faces, "MINT_MAG_G3SG1_MESH")
handle_mesh = subset_faces(welded, handle_faces, "MINT_ALAVANCA_G3SG1_MESH")

# As duas fontes apontam a boca para +X; a G3 KINEMATION aponta para -X.
raw_corners = [Vector(corner) for corner in source_object.bound_box]
raw_length = max(
    max(corner[axis] for corner in raw_corners) - min(corner[axis] for corner in raw_corners)
    for axis in range(3)
)
scale_factor = (COMPRIMENTO_ALVO / raw_length) / body.scale.x
fit = Matrix.Rotation(math.pi, 4, "Z") @ Matrix.Scale(scale_factor, 4)
for mesh in (body_mesh, mag_mesh, handle_mesh):
    mesh.transform(fit)

materials = list(welded.materials)
body.data = body_mesh
body.name = "MINT_WEAPON_G3SG1"
magazine.data = mag_mesh
magazine.name = "MINT_MAG_G3SG1"
for mesh in (body_mesh, mag_mesh, handle_mesh):
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)

# A G3SG1 tem alavanca própria; a geometria de trava herdada da G3 não pode
# permanecer. Reutilizar o objeto conserva o parent/transform do pacote, mas a
# animação é reescrita com o curso real da recarga vazia.
handle = old_release
handle.name = "MINT_ALAVANCA_G3SG1"
handle.data = handle_mesh
if handle.animation_data:
    handle.animation_data_clear()
handle.location = (0.0, 0.0, 0.0)
handle.rotation_mode = "QUATERNION"
for frame, offset in ((0, 0.0), (36, 0.0), (43, 0.10 / body.scale.x),
                      (53, 0.10 / body.scale.x), (62, 0.0), (72, 0.0)):
    scene.frame_set(frame)
    handle.location = (offset, 0.0, 0.0)
    handle.keyframe_insert("location", frame=frame, group=handle.name)
push_nla(handle, "reload_empty")

bpy.data.objects.remove(source_object, do_unlink=True)
bpy.context.view_layer.update()
corners = [Vector(corner) for corner in body.bound_box]
minimum = Vector(tuple(min(corner[axis] for corner in corners) for axis in range(3)))
maximum = Vector(tuple(max(corner[axis] for corner in corners) for axis in range(3)))
muzzle = next((child for child in body.children if child.name == "SOCKET_MINT_MUZZLE"), None)
sight = next((child for child in body.children if child.name == "SOCKET_MINT_SIGHT"), None)
if not muzzle or not sight:
    raise RuntimeError("sockets herdados do pacote G3 ausentes")
muzzle.location = (minimum.x, (minimum.y + maximum.y) / 2, (minimum.z + maximum.z) * 0.52)
# O óculo da luneta é a região traseira do topo, não a alça aberta da G3.
sight.location = (maximum.x - (maximum.x - minimum.x) * 0.25,
                  (minimum.y + maximum.y) / 2,
                  maximum.z - 0.018 / body.scale.x)

package.name = "VM_PACKAGE_G3SG1"
scene.camera.name = "VIEWMODEL_CAMERA"

scene.frame_set(72)
for owner in (package, handle):
    if owner.animation_data:
        owner.animation_data.action = None
        for track in owner.animation_data.nla_tracks:
            track.mute = True
package.matrix_world = Matrix.Identity(4)
package.rotation_mode = "QUATERNION"
handle.location = (0.0, 0.0, 0.0)
bpy.context.view_layer.update()
for owner in (package, handle):
    if owner.animation_data:
        for track in owner.animation_data.nla_tracks:
            for strip in track.strips:
                strip.extrapolation = "NOTHING"
            track.mute = False
bpy.context.view_layer.update()

# A G3 KINEMATION foi aprovada com enquadramento próprio; a G3SG1 pertence ao
# frame público da família G3. Transportar a diferença para um nó DO PRODUTO
# mantém câmera/FOV/vmframe intactos e preserva a animação local do package.
# No espaço da câmera: Q = inverse(familyFrame) * approvedG3Frame. O nó de cena
# é C * Q * inverse(C), onde C é a câmera embutida.
def frame_matrix(position, degrees):
    rotation = Euler(tuple(math.radians(value) for value in degrees), "XYZ").to_matrix().to_4x4()
    return Matrix.Translation(Vector(position)) @ rotation


family_frame = frame_matrix((0.117, -0.062, -0.202), (1.0, -0.2, 0.0))
approved_g3_frame = frame_matrix((0.0, 0.05, -0.2159), (15.0, -0.2, 0.0))
camera_world = scene.camera.matrix_world.copy()
product_matrix = camera_world @ family_frame.inverted() @ approved_g3_frame @ camera_world.inverted()
product = bpy.data.objects.new("VM_PRODUCT_G3SG1", None)
scene.collection.objects.link(product)
product.matrix_world = product_matrix
package.parent = product
package.matrix_parent_inverse = Matrix.Identity(4)
package.matrix_local = Matrix.Identity(4)
bpy.context.view_layer.update()

blend = output_dir / "g3sg1-final.blend"
glb = output_dir / "g3sg1-baked-runtime.glb"
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
    "weapon": "g3sg1",
    "ready": False,
    "sources": {"g3Kinemation": G3_KINEMATION_SHA, "body": G3SG1_SHA},
    "selection": {
        "weldedVertices": len(welded.vertices),
        "sourceFaces": len(welded.polygons),
        "bodyFaces": len(welded.polygons) - len(mag_faces) - len(handle_faces),
        "magFaces": len(mag_faces),
        "handleFaces": len(handle_faces),
    },
    "scale": round(scale_factor, 6),
    "productMatrix": [[round(value, 7) for value in row] for row in product_matrix],
    "products": {
        "blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
        "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)},
    },
    "mechanism": "complete magazine and real charging handle over G3 KINEMATION hands/actions",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("G3SG1_KINEMATION_OK " + json.dumps(report, separators=(",", ":")))
