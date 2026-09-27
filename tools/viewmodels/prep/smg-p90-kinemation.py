"""Reautora a P90 pública sobre as mãos e ações KINEMATION aprovadas da G3.

O pacote P90 anterior traz a arma explodida e não preserva contato. Esta receita
usa a malha pública coerente, separa o carregador superior e cria peças mecânicas
próprias no produto. O rig, as três camadas de mãos e as ações vêm do checkpoint
KINEMATION aprovado; nenhum asset privado entra no Git.
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
P90_PUBLIC_SHA = "6fda87809ab60e1fea7a1e7bf5ebc5355e6ee70d595f7c4610ed88e847560aa2"
COMPRIMENTO_ALVO = 0.52


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
    strip.extrapolation = "NOTHING"
    owner.animation_data.action = None


def cube_mesh(name: str, size: tuple[float, float, float]) -> bpy.types.Mesh:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=list(bm.verts), vec=Vector(size))
    bm.to_mesh(mesh)
    bm.free()
    return mesh


g3_source = argument("g3-kinemation")
p90_source = argument("p90-source")
output_dir = argument("output-dir")
if digest(g3_source) != G3_KINEMATION_SHA or digest(p90_source) != P90_PUBLIC_SHA:
    raise RuntimeError("fonte G3 KINEMATION/P90 pública ausente ou divergente")
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
bpy.ops.import_scene.gltf(filepath=str(p90_source))
imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"P90 pública deveria conter uma malha; encontrou {len(imported)}")
source_object = imported[0]
welded = source_object.data.copy()
bm = bmesh.new()
bm.from_mesh(welded)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
bm.to_mesh(welded)
bm.free()

# O pente translúcido ocupa a crista traseira da P90 pública. Exigir a caixa e
# a contagem trava o corte contra mudanças silenciosas na fonte.
mag_faces = {
    polygon.index for polygon in welded.polygons
    if polygon.center.z >= 0.145 and -0.39 <= polygon.center.x <= -0.075
}
if len(mag_faces) != 445:
    raise RuntimeError(f"seleção do pente P90 divergiu: {len(mag_faces)} faces")
body_mesh = without_faces(welded, mag_faces, "P90_BODY_MESH")
mag_mesh = subset_faces(welded, mag_faces, "P90_MAG_MESH")

raw_corners = [Vector(corner) for corner in source_object.bound_box]
raw_length = max(corner.x for corner in raw_corners) - min(corner.x for corner in raw_corners)
scale_factor = (COMPRIMENTO_ALVO / raw_length) / body.scale.x
fit = Matrix.Rotation(math.pi, 4, "Z") @ Matrix.Scale(scale_factor, 4)
for mesh in (body_mesh, mag_mesh):
    mesh.transform(fit)

materials = list(welded.materials)
body.data = body_mesh
body.name = "GEO_WEAPON_P90_SKM_PDW90"
magazine.data = mag_mesh
magazine.name = "MINT_WEAPON_MAG_P90"
for mesh in (body_mesh, mag_mesh):
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)

# Raiz explícita preserva o contrato do loader sem alterar a pose aprovada.
weapon_root = bpy.data.objects.new("RIG_WEAPON_P90", None)
scene.collection.objects.link(weapon_root)
weapon_root.parent = package
body.parent = weapon_root

# Peças próprias pequenas, legíveis e independentes. A alavanca e o bloco do
# ferrolho recuam no tiro e na recarga vazia; o gatilho gira no tiro.
old_release.name = "MINT_MECH_P90_CHARGER"
old_release.data = cube_mesh("P90_CHARGER_MESH", (0.025, 0.012, 0.012))
old_release.parent = body
old_release.location = (-0.08 / body.scale.x, -0.052 / body.scale.y, 0.035 / body.scale.z)
if old_release.animation_data:
    old_release.animation_data_clear()
charger = old_release

mechanism = bpy.data.objects.new("MINT_MECH_P90_MECHANISM", cube_mesh("P90_MECHANISM_MESH", (0.045, 0.030, 0.018)))
scene.collection.objects.link(mechanism)
mechanism.parent = body
mechanism.location = (-0.14 / body.scale.x, 0.0, 0.030 / body.scale.z)
trigger = bpy.data.objects.new("MINT_MECH_P90_TRIGGER", cube_mesh("P90_TRIGGER_MESH", (0.012, 0.010, 0.032)))
scene.collection.objects.link(trigger)
trigger.parent = body
trigger.location = (0.035 / body.scale.x, 0.0, -0.060 / body.scale.z)
release_l = bpy.data.objects.new("MINT_MECH_P90_RELEASE_L", cube_mesh("P90_RELEASE_L_MESH", (0.020, 0.010, 0.010)))
release_r = bpy.data.objects.new("MINT_MECH_P90_RELEASE_R", release_l.data.copy())
scene.collection.objects.link(release_l)
scene.collection.objects.link(release_r)
for release, side in ((release_l, -1), (release_r, 1)):
    release.parent = body
    release.location = (0.10 / body.scale.x, side * 0.066 / body.scale.y, 0.005 / body.scale.z)

for obj in (charger, mechanism, trigger, release_l, release_r):
    for material in materials:
        obj.data.materials.append(material)

for owner, movement in ((charger, 0.018), (mechanism, 0.024)):
    for clip_name, frames in (("shoot", ((0, 0.0), (2, -movement), (5, 0.0), (8, 0.0))),
                              ("reload_empty", ((0, 0.0), (36, 0.0), (43, -movement), (55, -movement), (62, 0.0), (72, 0.0)))):
        for frame, offset in frames:
            scene.frame_set(frame)
            owner.location.x += offset
            owner.keyframe_insert("location", frame=frame, group=owner.name)
            owner.location.x -= offset
        push_nla(owner, clip_name)

trigger.rotation_mode = "XYZ"
for frame, degrees in ((0, 0.0), (2, -18.0), (5, -5.0), (8, 0.0)):
    scene.frame_set(frame)
    trigger.rotation_euler.y = math.radians(degrees)
    trigger.keyframe_insert("rotation_euler", frame=frame, group=trigger.name)
push_nla(trigger, "shoot")

marker = bpy.data.objects.new("MINT_WEAPON_P90", None)
scene.collection.objects.link(marker)
marker.parent = weapon_root
marker["contract"] = "baked-marker"

bpy.data.objects.remove(source_object, do_unlink=True)
bpy.context.view_layer.update()
corners = [Vector(corner) for corner in body.bound_box]
minimum = Vector(tuple(min(corner[axis] for corner in corners) for axis in range(3)))
maximum = Vector(tuple(max(corner[axis] for corner in corners) for axis in range(3)))
muzzle = next((child for child in body.children if child.name == "SOCKET_MINT_MUZZLE"), None)
sight = next((child for child in body.children if child.name == "SOCKET_MINT_SIGHT"), None)
if not muzzle or not sight:
    raise RuntimeError("sockets herdados da G3 ausentes")
muzzle.location = (minimum.x, 0.0, 0.015 / body.scale.z)
sight.location = (maximum.x - (maximum.x - minimum.x) * 0.30, 0.0, maximum.z - 0.025 / body.scale.z)

package.name = "VM_PACKAGE_P90"
scene.camera.name = "VIEWMODEL_CAMERA"

# A família P90 ainda carrega o frame do pacote quebrado (inclusive roll -60).
# Transportar o frame para a pose G3 aprovada em um nó DO PRODUTO corrige eixo
# e escala sem tocar câmera, FOV, vmframe ou qualquer material compartilhado.
def frame_matrix(position, degrees):
    rotation = Euler(tuple(math.radians(value) for value in degrees), "XYZ").to_matrix().to_4x4()
    return Matrix.Translation(Vector(position)) @ rotation


p90_family_frame = frame_matrix((0.300, -0.200, -0.600), (15.4, 6.0, -60.0))
approved_g3_frame = frame_matrix((0.0, 0.05, -0.2159), (15.0, -0.2, 0.0))
fov_compensation = (math.tan(math.radians(84 / 2)) / math.tan(math.radians(72 / 2))) * 1.12
camera_world = scene.camera.matrix_world.copy()
product_matrix = (camera_world @ p90_family_frame.inverted() @ approved_g3_frame
                  @ Matrix.Scale(fov_compensation, 4) @ camera_world.inverted())
# Resíduo medido pela régua 3:2/16:9 sobre o primeiro produto coerente. É a
# diferença de pose no próprio asset; não muda o frame compartilhado.
measured_frame = frame_matrix((0.7853, -0.5887, -0.8371), (15.4, 6.0, -60.0))
product_matrix = (camera_world @ p90_family_frame.inverted() @ measured_frame
                  @ camera_world.inverted()) @ product_matrix
# O refinamento acima posiciona o centro, mas a profundidade do pacote compacto
# ainda o deixa pequeno. Aproximar o produto no eixo óptico fecha a escala sem
# mudar FOV nem separar braços/arma.
product_matrix = Matrix.Translation(Vector((0.0, 0.15, 0.0))) @ product_matrix
product = bpy.data.objects.new("VM_PRODUCT_P90", None)
scene.collection.objects.link(product)
product.matrix_world = product_matrix
package.parent = product
package.matrix_parent_inverse = Matrix.Identity(4)
package.matrix_local = Matrix.Identity(4)
bpy.context.view_layer.update()

# Congela o estado neutro fora das ações e evita extrapolação de peças.
scene.frame_set(72)
for owner in (package, charger, mechanism, trigger):
    if owner.animation_data:
        owner.animation_data.action = None
        for track in owner.animation_data.nla_tracks:
            for strip in track.strips:
                strip.extrapolation = "NOTHING"
            track.mute = True
package.matrix_world = Matrix.Identity(4)
package.rotation_mode = "QUATERNION"
for owner in (charger, mechanism, trigger):
    owner.location = owner.location
bpy.context.view_layer.update()
for owner in (package, charger, mechanism, trigger):
    if owner.animation_data:
        for track in owner.animation_data.nla_tracks:
            track.mute = False
bpy.context.view_layer.update()

blend = output_dir / "p90-kinemation.blend"
glb = output_dir / "p90-baked-runtime.glb"
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
    "weapon": "p90",
    "ready": False,
    "sources": {"g3Kinemation": G3_KINEMATION_SHA, "body": P90_PUBLIC_SHA},
    "selection": {"sourceFaces": len(welded.polygons), "bodyFaces": len(welded.polygons) - len(mag_faces), "magFaces": len(mag_faces)},
    "scale": round(scale_factor, 6),
    "productMatrix": [[round(value, 7) for value in row] for row in product_matrix],
    "products": {
        "blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
        "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)},
    },
    "mechanism": "top magazine, bilateral releases, charging handle, bolt and trigger over G3 KINEMATION hands/actions",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("P90_KINEMATION_OK " + json.dumps(report, separators=(",", ":")))
