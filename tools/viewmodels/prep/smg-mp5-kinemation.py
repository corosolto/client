"""Reautora a MP5 pública sobre as mãos e ações KINEMATION aprovadas da G3.

O pacote MP5 anterior cruza o plano da câmera e não preserva contato. Esta receita
usa a malha pública coerente, modela o carregador curvo e cria peças mecânicas
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
MP5_PUBLIC_SHA = "c623f27ccc2ca163f9d7b4bb94524ff9bf8b69b805fdafba2fb913e8c1a6382d"
COMPRIMENTO_ALVO = 0.66


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


def curved_mag_mesh(name: str) -> bpy.types.Mesh:
    """Carregador 9 mm curvo, fechado e chanfrável, no espaço da arma pública."""
    centers = [
        (-0.105, -0.048), (-0.105, -0.105), (-0.101, -0.165),
        (-0.092, -0.225), (-0.078, -0.285), (-0.058, -0.330),
    ]
    width, depth, center_y = 0.048, 0.036, 0.0176
    vertices = []
    for center_x, center_z in centers:
        vertices.extend([
            (center_x - width / 2, center_y - depth / 2, center_z),
            (center_x + width / 2, center_y - depth / 2, center_z),
            (center_x + width / 2, center_y + depth / 2, center_z),
            (center_x - width / 2, center_y + depth / 2, center_z),
        ])
    faces = [(0, 3, 2, 1)]
    for section in range(len(centers) - 1):
        a, b = section * 4, (section + 1) * 4
        faces.extend([(a, b, b + 3, a + 3), (a + 1, a + 2, b + 2, b + 1),
                      (a, a + 1, b + 1, b), (a + 3, b + 3, b + 2, a + 2)])
    last = (len(centers) - 1) * 4
    faces.append((last, last + 1, last + 2, last + 3))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.006, segments=3, affect="EDGES")
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def contoured_handguard_mesh(name: str) -> bpy.types.Mesh:
    """Guarda-mão coeso que acompanha os quatro dedos de apoio no idle."""
    # Coordenadas medidas no espaço local glTF da arma e convertidas para os
    # eixos Blender (x, -z, y). Formam a textura curva do guarda-mão, em vez de
    # deslocar a mão estável ou mascarar o erro com câmera/FOV.
    gltf_outline = [
        (-0.25000, 0.02000, -0.02000),
        (-0.22547, -0.01346, -0.01964),
        (-0.16884, -0.05365, -0.02480),
        (-0.15628, -0.07691, -0.01134),
        (-0.15697, -0.09294, -0.01292),
        (-0.12000, -0.08200, -0.01800),
        (-0.10800, 0.02000, -0.01800),
    ]
    mesh = bpy.data.meshes.new(name)
    # Face externa segue exatamente os contatos; a interna é recuada e ambas
    # são unidas, formando uma única peça presa ao corpo, sem nódulos flutuantes
    # quando a mão sai para buscar o carregador.
    front = [(x, -z_forward, y_up) for x, y_up, z_forward in gltf_outline]
    back = [(x, -0.040, y_up) for x, y_up, _ in gltf_outline]
    vertices = front + back
    count = len(front)
    faces = [tuple(range(count)), tuple(reversed(range(count, count * 2)))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.004, segments=3, affect="EDGES")
    bm.to_mesh(mesh)
    bm.free()
    return mesh


g3_source = argument("g3-kinemation")
mp5_source = argument("mp5-source")
output_dir = argument("output-dir")
if digest(g3_source) != G3_KINEMATION_SHA or digest(mp5_source) != MP5_PUBLIC_SHA:
    raise RuntimeError("fonte G3 KINEMATION/MP5 pública ausente ou divergente")
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
bpy.ops.import_scene.gltf(filepath=str(mp5_source))
imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"MP5 pública deveria conter uma malha; encontrou {len(imported)}")
source_object = imported[0]
welded = source_object.data.copy()
bm = bmesh.new()
bm.from_mesh(welded)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
bm.to_mesh(welded)
bm.free()

# A malha pública é uma MP5 sem pente: isso permite preservar toda a arma e
# fornecer um carregador próprio independente, movido pelas ações KINEMATION.
if len(welded.polygons) != 4852:
    raise RuntimeError(f"topologia MP5 pública divergiu: {len(welded.polygons)} faces")
body_mesh = welded.copy()
body_mesh.name = "MP5_BODY_MESH"
mag_mesh = curved_mag_mesh("MP5_MAG_MESH")

raw_corners = [Vector(corner) for corner in source_object.bound_box]
raw_length = max(corner.x for corner in raw_corners) - min(corner.x for corner in raw_corners)
scale_factor = (COMPRIMENTO_ALVO / raw_length) / body.scale.x
fit = Matrix.Scale(scale_factor, 4)
for mesh in (body_mesh, mag_mesh):
    mesh.transform(fit)

materials = list(welded.materials)
polymer = bpy.data.materials.new("CoroSolto_MP5_Polymer")
polymer.use_nodes = True
polymer.diffuse_color = (0.035, 0.045, 0.055, 1.0)
principled = polymer.node_tree.nodes.get("Principled BSDF")
if principled:
    principled.inputs["Base Color"].default_value = polymer.diffuse_color
    principled.inputs["Metallic"].default_value = 0.08
    principled.inputs["Roughness"].default_value = 0.38
body.data = body_mesh
body.name = "GEO_WEAPON_MP5_SKM_SMG"
magazine.data = mag_mesh
magazine.name = "MINT_WEAPON_MAG_MP5"
for mesh in (body_mesh, mag_mesh):
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)
mag_mesh.materials.clear()
mag_mesh.materials.append(polymer)

handguard = bpy.data.objects.new("MINT_WEAPON_MP5_HANDGUARD", contoured_handguard_mesh("MP5_HANDGUARD_MESH"))
scene.collection.objects.link(handguard)
handguard.parent = body
handguard.data.materials.append(polymer)

# Raiz explícita preserva o contrato do loader sem alterar a pose aprovada.
weapon_root = bpy.data.objects.new("RIG_WEAPON_MP5", None)
scene.collection.objects.link(weapon_root)
weapon_root.parent = package
body.parent = weapon_root

# Peças próprias pequenas, legíveis e independentes. A alavanca e o bloco do
# ferrolho recuam no tiro e na recarga vazia; o gatilho gira no tiro.
old_release.name = "MINT_MECH_MP5_CHARGER"
old_release.data = cube_mesh("MP5_CHARGER_MESH", (0.025, 0.012, 0.012))
old_release.parent = body
old_release.location = (-0.08 / body.scale.x, -0.052 / body.scale.y, 0.035 / body.scale.z)
if old_release.animation_data:
    old_release.animation_data_clear()
charger = old_release

bolt = bpy.data.objects.new("MINT_MECH_MP5_BOLT", cube_mesh("MP5_BOLT_MESH", (0.045, 0.030, 0.018)))
scene.collection.objects.link(bolt)
bolt.parent = body
bolt.location = (-0.18 / body.scale.x, 0.0, 0.055 / body.scale.z)
trigger = bpy.data.objects.new("MINT_MECH_MP5_TRIGGER", cube_mesh("MP5_TRIGGER_MESH", (0.012, 0.010, 0.032)))
scene.collection.objects.link(trigger)
trigger.parent = body
trigger.location = (0.035 / body.scale.x, 0.0, -0.060 / body.scale.z)
release = bpy.data.objects.new("MINT_MECH_MP5_RELEASE", cube_mesh("MP5_RELEASE_MESH", (0.020, 0.012, 0.016)))
scene.collection.objects.link(release)
release.parent = body
release.location = (-0.08 / body.scale.x, -0.050 / body.scale.y, -0.025 / body.scale.z)

for obj in (charger, bolt, trigger, release):
    obj.data.materials.append(polymer)

for owner, movement in ((charger, 0.018), (bolt, 0.024)):
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

marker = bpy.data.objects.new("MINT_WEAPON_MP5", None)
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
sight.location = (minimum.x + (maximum.x - minimum.x) * 0.24, 0.0, maximum.z - 0.025 / body.scale.z)

package.name = "VM_PACKAGE_MP5"
scene.camera.name = "VIEWMODEL_CAMERA"

# A família MP5 ainda carrega o frame do pacote antigo.
# Transportar o frame para a pose G3 aprovada em um nó DO PRODUTO corrige eixo
# e escala sem tocar câmera, FOV, vmframe ou qualquer material compartilhado.
def frame_matrix(position, degrees):
    rotation = Euler(tuple(math.radians(value) for value in degrees), "XYZ").to_matrix().to_4x4()
    return Matrix.Translation(Vector(position)) @ rotation


mp5_family_frame = frame_matrix((0.091, -0.187, -0.204), (-10.1, 0.0, 0.0))
approved_g3_frame = frame_matrix((0.0, 0.05, -0.2159), (15.0, -0.2, 0.0))
fov_compensation = math.tan(math.radians(84 / 2)) / math.tan(math.radians(72 / 2))
camera_world = scene.camera.matrix_world.copy()
product_matrix = (camera_world @ mp5_family_frame.inverted() @ approved_g3_frame
                  @ Matrix.Scale(fov_compensation, 4) @ camera_world.inverted())
# Resíduo medido no produto coerente: transporta para o próprio GLB a pose que
# fecha escala angular e centro sem alterar câmera, FOV ou frame compartilhado.
measured_frame = frame_matrix((0.2706, -0.3630, -0.2480), (-10.1, 0.0, 0.0))
product_matrix = (camera_world @ mp5_family_frame.inverted() @ measured_frame
                  @ camera_world.inverted()) @ product_matrix
product = bpy.data.objects.new("VM_PRODUCT_MP5", None)
scene.collection.objects.link(product)
product.matrix_world = product_matrix
package.parent = product
package.matrix_parent_inverse = Matrix.Identity(4)
package.matrix_local = Matrix.Identity(4)
bpy.context.view_layer.update()

# Congela o estado neutro fora das ações e evita extrapolação de peças.
scene.frame_set(72)
for owner in (package, charger, bolt, trigger):
    if owner.animation_data:
        owner.animation_data.action = None
        for track in owner.animation_data.nla_tracks:
            for strip in track.strips:
                strip.extrapolation = "NOTHING"
            track.mute = True
package.matrix_world = Matrix.Identity(4)
package.rotation_mode = "QUATERNION"
for owner in (charger, bolt, trigger):
    owner.location = owner.location
bpy.context.view_layer.update()
for owner in (package, charger, bolt, trigger):
    if owner.animation_data:
        for track in owner.animation_data.nla_tracks:
            track.mute = False
bpy.context.view_layer.update()

blend = output_dir / "mp5-kinemation.blend"
glb = output_dir / "mp5-runtime.glb"
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
    "weapon": "mp5",
    "ready": False,
    "sources": {"g3Kinemation": G3_KINEMATION_SHA, "body": MP5_PUBLIC_SHA},
    "selection": {"sourceFaces": len(welded.polygons), "bodyFaces": len(body_mesh.polygons),
                  "magFaces": len(mag_mesh.polygons), "handguardFaces": len(handguard.data.polygons)},
    "scale": round(scale_factor, 6),
    "productMatrix": [[round(value, 7) for value in row] for row in product_matrix],
    "products": {
        "blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
        "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)},
    },
    "mechanism": "curved magazine, release, charging handle, bolt and trigger over G3 KINEMATION hands/actions",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("MP5_KINEMATION_OK " + json.dumps(report, separators=(",", ":")))
