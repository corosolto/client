"""Reconstrói somente capacete integral e telefone do Motoca já rigado.

Remove os triângulos Motofrete antigos (blob/visor/telefone) e autora peças
separadas, todas fundidas à malha skinned: casco aberto no rosto + queixeira em U,
visor levantado com dobradiças, telefone escuro com tela baixa e suporte. Bag,
jaqueta, corpo, rig e todos os outros materiais permanecem byte-semanticamente
intocados pela seleção.

Uso: blender --background --python <script> -- entrada.glb saida.glb recibo.json
"""
import hashlib
import json
import pathlib
import sys

import bpy
import bmesh
from mathutils import Vector


argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(argv) != 3:
    raise SystemExit("uso: blender --background --python <script> -- entrada.glb saida.glb recibo.json")
source, output, receipt = map(lambda value: pathlib.Path(value).resolve(), argv)

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def material(name, color, metallic=0.0, roughness=.72, emission=None):
    value = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1)
    value.use_nodes = True
    bsdf = value.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = .18
    return value

def apply_transform(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.select_set(False)

def rigid_group(obj, bone):
    group = obj.vertex_groups.new(name=bone)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")

def cube(name, location, dimensions, mat, rotation=(0, 0, 0), bone="Head"):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    apply_transform(obj)
    obj.data.materials.append(mat)
    rigid_group(obj, bone)
    return obj

def cylinder(name, location, radius, depth, mat, rotation=(0, 0, 0), bone="Head"):
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    apply_transform(obj)
    obj.data.materials.append(mat)
    rigid_group(obj, bone)
    return obj

def tube(name, points, radius, mat, bone="Head"):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, value in zip(spline.bezier_points, points):
        point.co = value
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    obj.data.materials.append(mat)
    rigid_group(obj, bone)
    obj.select_set(False)
    return obj


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
body = bpy.data.objects.get("char1")
if body is None or body.type != "MESH":
    raise SystemExit("char1 ausente")

old_names = {
    "CS_HARD_Motofrete_Helmet_Black", "Motofrete_Visor_Smoke",
    "Motofrete_Phone", "Motofrete_PhoneScreen",
}
old_indices = {i for i, slot in enumerate(body.material_slots) if slot.material and slot.material.name in old_names}
bm = bmesh.new()
bm.from_mesh(body.data)
bm.faces.ensure_lookup_table()
removed_faces = sum(face.material_index in old_indices for face in bm.faces)
bmesh.ops.delete(bm, geom=[face for face in bm.faces if face.material_index in old_indices], context="FACES")
bmesh.ops.delete(bm, geom=[vert for vert in bm.verts if not vert.link_faces], context="VERTS")
bm.to_mesh(body.data)
bm.free()

shell_mat = material("CS_HARD_Motofrete_Helmet_Shell", (.004, .006, .009), metallic=.10, roughness=.82)
chin_mat = material("CS_HARD_Motofrete_ChinBar", (.005, .007, .010), metallic=.12, roughness=.78)
visor_mat = material("Motofrete_Visor_Smoke", (.018, .021, .024), metallic=.05, roughness=.24)
hinge_mat = material("Motofrete_Visor_Hinge", (.012, .014, .017), metallic=.35, roughness=.42)
phone_mat = material("Motofrete_Phone", (.012, .014, .017), metallic=.12, roughness=.62)
screen_mat = material("Motofrete_PhoneScreen", (.008, .035, .045), metallic=0, roughness=.42, emission=(.008, .035, .045))
mount_mat = material("Motofrete_PhoneMount", (.010, .012, .014), metallic=0, roughness=.88)

# Calota integral: esfera elipsoide espessa com abertura frontal real. Laterais,
# topo e occipital continuam uma única superfície; a face permanece visível.
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, location=(0, .000, 1.605), scale=(.135, .132, .178))
shell = bpy.context.object
shell.name = "Motofrete_Helmet_Shell"
apply_transform(shell)
bm = bmesh.new()
bm.from_mesh(shell.data)
front_faces = []
for face in bm.faces:
    center = shell.matrix_world @ face.calc_center_median()
    if center.y <= -.058 and 1.465 <= center.z <= 1.675 and abs(center.x) <= .108:
        front_faces.append(face)
bmesh.ops.delete(bm, geom=front_faces, context="FACES")
bm.to_mesh(shell.data)
bm.free()
solidify = shell.modifiers.new("HelmetThickness", "SOLIDIFY")
solidify.thickness = .010
solidify.offset = 0
bpy.context.view_layer.objects.active = shell
shell.select_set(True)
bpy.ops.object.modifier_apply(modifier=solidify.name)
shell.data.materials.append(shell_mat)
rigid_group(shell, "Head")
shell.select_set(False)

# Queixeira em U: termina nas têmporas e contorna maxilar abaixo da boca; a
# espessura circular evita qualquer leitura de lâmina horizontal.
chin = tube("Motofrete_ChinBar", [
    (-.112, -.035, 1.585), (-.125, -.085, 1.515), (-.105, -.123, 1.445),
    (-.060, -.140, 1.410), (0, -.145, 1.398), (.060, -.140, 1.410),
    (.105, -.123, 1.445), (.125, -.085, 1.515), (.112, -.035, 1.585),
], .022, chin_mat)

# Viseira levantada apoiada sobre a testa, com espessura e dois pivôs laterais.
visor = cube("Motofrete_Visor_Raised", (0, -.095, 1.704), (.225, .018, .066), visor_mat,
             rotation=(-.30, 0, 0))
hinges = [
    cylinder(f"Motofrete_Visor_Hinge_{side}", (x, -.035, 1.620), .018, .024,
             hinge_mat, rotation=(1.5708, 0, 0))
    for side, x in (("L", -.118), ("R", .118))
]
# Braços ligam pivôs à placa: ela não flutua sobre a testa.
arms = [
    tube(f"Motofrete_Visor_Arm_{side}", [(x, -.040, 1.625), (x, -.080, 1.675), (x * .92, -.095, 1.704)],
         .009, hinge_mat)
    for side, x in (("L", -.118), ("R", .118))
]

# Telefone: corpo escuro maior que a tela, tela baixa, berço e correia visíveis.
phone = cube("Motofrete_Phone_Body", (.085, -.247, 1.175), (.090, .026, .155), phone_mat, bone="Spine02")
screen = cube("Motofrete_Phone_Screen", (.085, -.263, 1.175), (.054, .006, .082), screen_mat, bone="Spine02")
mount = [
    cube("Motofrete_Phone_Cradle_Bottom", (.085, -.264, 1.090), (.106, .016, .018), mount_mat, bone="Spine02"),
    cube("Motofrete_Phone_Cradle_Left", (.033, -.264, 1.175), (.014, .016, .155), mount_mat, bone="Spine02"),
    cube("Motofrete_Phone_Cradle_Right", (.137, -.264, 1.175), (.014, .016, .155), mount_mat, bone="Spine02"),
    cube("Motofrete_Phone_Strap", (.052, -.236, 1.298), (.018, .015, .105), mount_mat,
         rotation=(0, .22, 0), bone="Spine02"),
]

new_objects = [shell, chin, visor, *hinges, *arms, phone, screen, *mount]
new_object_names = [obj.name for obj in new_objects]
bpy.ops.object.select_all(action="DESELECT")
for obj in new_objects:
    obj.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
record = {
    "source": str(source), "output": str(output),
    "sourceSha256": sha256(source), "outputSha256": sha256(output),
    "blender": bpy.app.version_string, "removedFaces": removed_faces,
    "newObjects": new_object_names,
    "scope": "helmet+visor+phone only; bag/jacket/body/rig untouched",
    "materials": [shell_mat.name, chin_mat.name, visor_mat.name, hinge_mat.name,
                  phone_mat.name, screen_mat.name, mount_mat.name],
}
receipt.parent.mkdir(parents=True, exist_ok=True)
receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"MOTOCA_REBUILD={output} removed_faces={removed_faces} sha256={record['outputSha256']}")
