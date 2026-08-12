"""Acabamento pós-rig do Designer UX sem regenerar nem tocar no esqueleto.

Restaura a direção quase preta do conceito, elimina a leitura facetada de pele/cabelo,
reforça tablet/leque e adiciona alças curtas. Os novos detalhes são filhos rígidos dos
bones existentes; o mesh skinado e todos os pesos Meshy permanecem intactos.
"""
import math
import pathlib
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(args) != 2:
    raise SystemExit("uso: blender --background --python script -- input.glb output.glb")
source, output = [pathlib.Path(value).resolve() for value in args]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
body = max((obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.parent == armature), key=lambda obj: len(obj.data.vertices))

# Helper geométrico do serviço de rig; não é parte da personagem nem tem skin/material.
for obj in list(bpy.context.scene.objects):
    if obj.type == "MESH" and obj != body and obj.parent is None and not obj.data.materials:
        bpy.data.objects.remove(obj, do_unlink=True)

# O rig automático atribuiu os props baixos antigos aos braços (causa medida da
# assimetria LeftArm e do tablet atravessando o crouch). Remove somente vértices abaixo
# do quadril com peso dominante de braço/mão, além das mãos pontudas originais. Os
# props e mãos limpos entram de volta abaixo com sockets rígidos.
group_names = {group.index: group.name for group in body.vertex_groups}
selected_vertices = set()
for vertex in body.data.vertices:
    arm_prop_weight = max(
        (membership.weight for membership in vertex.groups if group_names.get(membership.group) in {
            "LeftArm", "LeftForeArm", "LeftHand", "RightArm", "RightForeArm", "RightHand"
        }),
        default=0.0,
    )
    if vertex.co.z < 80.0 and arm_prop_weight > 0.20:
        selected_vertices.add(vertex.index)
    if abs(vertex.co.x) > 38.0 and 76.0 < vertex.co.z < 104.0:
        selected_vertices.add(vertex.index)
    if abs(vertex.co.x) < 14.0 and -3.0 < vertex.co.y < 18.0 and vertex.co.z > 152.0:
        selected_vertices.add(vertex.index)
    legacy_tablet = -34.5 < vertex.co.x < -18.5 and -8.0 < vertex.co.y < 1.0 and 48.0 < vertex.co.z < 73.0
    # A face traseira do tablet antigo é uma ilha de quatro vértices 1,6 cm atrás
    # do volume principal. O corte anterior removia a frente mas deixava essa placa
    # preta solta visível a 150 px; a caixa estreita abaixo cobre somente essa ilha.
    legacy_tablet_backplate = -32.0 < vertex.co.x < -20.0 and -11.0 < vertex.co.y < -8.5 and 50.0 < vertex.co.z < 69.0
    legacy_fan = 14.0 < vertex.co.x < 38.0 and -8.0 < vertex.co.y < 1.0 and 47.0 < vertex.co.z < 77.0
    if legacy_tablet or legacy_tablet_backplate or legacy_fan:
        selected_vertices.add(vertex.index)
bm = bmesh.new()
bm.from_mesh(body.data)
bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.verts[index] for index in selected_vertices], context="VERTS")
bm.to_mesh(body.data)
bm.free()
body.data.update()

def material(name, color, metallic=0.0, roughness=0.58, emission=None):
    value = bpy.data.materials.new(name)
    value.use_nodes = True
    value.diffuse_color = (*color, 1.0)
    bsdf = value.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if bsdf.inputs.get("IOR Level"):
        bsdf.inputs["IOR Level"].default_value = 0.0
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 0.45
    return value

cloth = material("CS_UX_CLOTH_BLACK", (0.0012, 0.0018, 0.0045), 0.0, 0.78)
skin = material("CS_UX_SKIN_MEDIUM_BROWN", (0.055, 0.026, 0.014), 0.0, 0.82)
hair = material("CS_UX_HAIR_BLACK", (0.0005, 0.0003, 0.0003), 0.0, 0.92)
black = material("CS_UX_PROP_BLACK", (0.0004, 0.0006, 0.0010), 0.0, 0.62)
screen = material("CS_UX_TABLET_SCREEN", (0.008, 0.035, 0.052), 0.04, 0.30, (0.02, 0.20, 0.30))
blue = material("CS_UX_PIPING_BLUE", (0.04, 0.16, 0.75), 0.0, 0.36, (0.06, 0.18, 0.80))
purple = material("CS_UX_PIPING_PURPLE", (0.36, 0.06, 0.72), 0.0, 0.36, (0.42, 0.08, 0.82))
fan_materials = [material(f"CS_UX_FAN_{i}", color, 0.0, 0.46) for i, color in enumerate([
    (0.86, 0.04, 0.12), (0.96, 0.28, 0.03), (0.96, 0.72, 0.04),
    (0.26, 0.74, 0.18), (0.03, 0.55, 0.84), (0.18, 0.22, 0.88),
    (0.46, 0.10, 0.82), (0.72, 0.08, 0.62), (0.92, 0.18, 0.42),
])]

# A malha do serviço usa centímetros locais sob Armature(scale=.01).
for value in (cloth, skin, hair):
    body.data.materials.append(value)
cloth_index = len(body.data.materials) - 3
skin_index = len(body.data.materials) - 2
hair_index = len(body.data.materials) - 1
body.data.normals_split_custom_set([(0.0, 0.0, 0.0)] * len(body.data.loops))
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.shade_smooth()
for polygon in body.data.polygons:
    polygon.use_smooth = True
    center = polygon.center
    x, y, z = center.x, center.y, center.z
    is_hair = z >= 155.0 and abs(x) < 13.5
    is_head_skin = 138.0 < z < 158.0 and abs(x) < 15.0 and y < 0.0
    is_arm_skin = abs(x) > 28.0 and 74.0 < z < 116.5 and y < 3.0
    thermos_zone = 7.0 < x < 25.0 and y > 7.0 and z > 108.0
    if is_hair:
        polygon.material_index = hair_index
    elif thermos_zone:
        polygon.material_index = 0
    elif is_head_skin or is_arm_skin:
        polygon.material_index = skin_index
    else:
        polygon.material_index = cloth_index

def rigid_skin(obj, bone="Hips"):
    # O rig Meshy trabalha em centímetros locais sob Armature(scale=.01). Assamos o
    # objeto em metros, convertemos os vértices para cm e replicamos o contrato do
    # mesh principal: parent Armature + modifier + um único grupo rígido.
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for vertex in obj.data.vertices:
        vertex.co *= 100.0
    obj.parent = armature
    obj.matrix_parent_inverse = Matrix.Identity(4)
    modifier = obj.modifiers.new("Armature", "ARMATURE")
    modifier.object = armature
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    return obj

def add_box(name, dimensions, location, mat, bone="Hips", rotation=(0.0, 0.0, 0.0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("soft_edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    obj.data.materials.append(mat)
    return rigid_skin(obj, bone)

def add_segment(name, start, end, radius, mat, bone="Hips", vertices=12):
    start, end = Vector(start), Vector(end)
    direction = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=(start + end) * 0.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.data.materials.append(mat)
    return rigid_skin(obj, bone)

def add_ellipsoid(name, location, scale, mat, bone="Hips", subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    return rigid_skin(obj, bone)

# Tablet: moldura e tela escuras cobrem a placa clara sem remover o volume skinado.
add_box("CS_UX_TABLET_FRAME", (0.158, 0.018, 0.218), (-0.500, 0.070, 0.605), black, bevel=0.012)
add_box("CS_UX_TABLET_SCREEN", (0.124, 0.010, 0.176), (-0.500, 0.058, 0.610), screen, bevel=0.006)
add_segment("CS_UX_TABLET_STRAP_A", (-0.250, 0.025, 0.800), (-0.340, 0.050, 0.750), 0.008, black)
add_segment("CS_UX_TABLET_STRAP_B", (-0.340, 0.050, 0.750), (-0.470, 0.065, 0.714), 0.008, black)

# Leque com nove lâminas saturadas e pino menor, ancorado ao quadril oposto.
pivot = Vector((0.255, -0.067, 0.595))
angles = [-0.68, -0.51, -0.34, -0.17, 0.0, 0.17, 0.34, 0.51, 0.68]
for index, (angle, mat) in enumerate(zip(angles, fan_materials)):
    length = 0.142
    direction = Vector((math.sin(angle), 0.0, math.cos(angle)))
    center = pivot + direction * (length * 0.48)
    add_box(f"CS_UX_FAN_BLADE_{index}", (0.021, 0.009, length), center, mat, rotation=(0.0, angle, 0.0), bevel=0.004)
add_segment("CS_UX_FAN_STRAP_A", (0.155, -0.025, 0.825), (0.205, -0.045, 0.755), 0.008, black)
add_segment("CS_UX_FAN_STRAP_B", (0.205, -0.045, 0.755), (0.250, -0.060, 0.704), 0.008, black)
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.018, depth=0.018, location=pivot, rotation=(math.pi / 2, 0.0, 0.0))
fan_pivot = bpy.context.object
fan_pivot.name = "CS_UX_FAN_PIVOT"
fan_pivot.data.materials.append(black)
rigid_skin(fan_pivot)

# Óculos retangulares pretos reaplicados sobre a região de pele sólida.
for side in (-1, 1):
    eye_x = side * 0.034
    label = "L" if side < 0 else "R"
    add_box(f"CS_UX_GLASSES_{label}_TOP", (0.054, 0.008, 0.006), (eye_x, -0.160, 1.556), black, "Head", bevel=0.002)
    add_box(f"CS_UX_GLASSES_{label}_BOTTOM", (0.054, 0.008, 0.006), (eye_x, -0.160, 1.514), black, "Head", bevel=0.002)
    add_box(f"CS_UX_GLASSES_{label}_OUTER", (0.006, 0.008, 0.046), (eye_x + side * 0.027, -0.160, 1.535), black, "Head", bevel=0.002)
    add_box(f"CS_UX_GLASSES_{label}_INNER", (0.006, 0.008, 0.046), (eye_x - side * 0.027, -0.160, 1.535), black, "Head", bevel=0.002)
add_box("CS_UX_GLASSES_BRIDGE", (0.016, 0.008, 0.006), (0.0, -0.160, 1.535), black, "Head", bevel=0.002)

# Touca cacheada contínua + coque alto. A touca cobre o gap do bun original; os bumps
# quebram a esfera lisa sem criar seis rosetas soltas.
add_ellipsoid("CS_UX_HAIR_CAP", (0.0, -0.008, 1.560), (0.103, 0.088, 0.097), hair, "Head", 3)
add_ellipsoid("CS_UX_HAIR_NAPE", (0.0, 0.050, 1.505), (0.088, 0.052, 0.060), hair, "Head", 3)
add_ellipsoid("CS_UX_HAIR_BUN_CORE", (0.0, 0.052, 1.628), (0.050, 0.047, 0.050), hair, "Head", 2)
for index, (dx, dy, dz, radius) in enumerate([
    (-0.050, 0.025, 0.018, 0.043), (0.000, 0.016, 0.048, 0.045), (0.052, 0.028, 0.020, 0.041),
    (-0.062, 0.058, -0.018, 0.040), (0.000, 0.070, 0.012, 0.044), (0.060, 0.060, -0.016, 0.039),
    (-0.042, 0.085, -0.050, 0.038), (0.042, 0.087, -0.048, 0.037),
    (0.005, 0.095, -0.075, 0.036),
]):
    add_ellipsoid(f"CS_UX_HAIR_CURL_{index}", (dx, dy, 1.625 + dz), (radius, radius * 0.88, radius), hair, "Head", 2)

# Mãos limpas rigidamente ligadas aos bones de mão. Quatro dedos + polegar separados;
# nenhum prop antigo fica com peso de Arm/ForeArm para colapsar no centro.
for side in (-1, 1):
    label = "R" if side < 0 else "L"
    hand_bone = "RightHand" if side < 0 else "LeftHand"
    sx = float(side)
    wrist = (sx * 0.385, -0.118, 0.970)
    palm = Vector((sx * 0.423, -0.120, 0.905))
    add_segment(f"CS_UX_HAND_{label}_WRIST", wrist, palm, 0.025, skin, hand_bone, 16)
    add_ellipsoid(f"CS_UX_HAND_{label}_PALM", palm, (0.038, 0.028, 0.050), skin, hand_bone, 3)
    for finger, (root_z, tip_x, tip_z) in enumerate([
        (0.890, 0.470, 0.835), (0.878, 0.478, 0.818), (0.866, 0.476, 0.814), (0.854, 0.466, 0.826),
    ]):
        root = (sx * 0.438, -0.120 + (finger - 1.5) * 0.008, root_z)
        tip = (sx * tip_x, -0.120 + (finger - 1.5) * 0.008, tip_z)
        add_segment(f"CS_UX_HAND_{label}_FINGER_{finger}", root, tip, 0.0075, skin, hand_bone, 10)
        add_ellipsoid(f"CS_UX_HAND_{label}_TIP_{finger}", tip, (0.008, 0.008, 0.010), skin, hand_bone, 1)
    thumb_root = (sx * 0.408, -0.138, 0.915)
    thumb_tip = (sx * 0.454, -0.144, 0.892)
    add_segment(f"CS_UX_HAND_{label}_THUMB", thumb_root, thumb_tip, 0.0085, skin, hand_bone, 10)
    add_ellipsoid(f"CS_UX_HAND_{label}_THUMB_TIP", thumb_tip, (0.009, 0.009, 0.011), skin, hand_bone, 1)

# Piping roxo/azul de grande contraste, segmentado por bone para acompanhar a pose.
for side, mat in [(-1, purple), (1, blue)]:
    add_segment(f"CS_UX_CHEST_PIPE_{side}", (side * 0.095, -0.218, 1.285), (side * 0.100, -0.218, 1.005), 0.006, mat, "Spine01", 10)
    leg_bone = "RightUpLeg" if side < 0 else "LeftUpLeg"
    add_segment(f"CS_UX_THIGH_PIPE_{side}", (side * 0.125, -0.205, 0.805), (side * 0.155, -0.190, 0.505), 0.006, mat, leg_bone, 10)

# Um único skinned mesh evita 29 skins redundantes e mantém o contrato usado pelos
# personagens já aceitos. Os grupos rígidos sobrevivem ao join e usam o modifier ativo.
bpy.ops.object.select_all(action="DESELECT")
for obj in [value for value in bpy.context.scene.objects if value.type == "MESH" and value.parent == armature]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.name = "designer_ux_final"

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
print(f"DESIGNER_UX_V6={output} body_verts={len(body.data.vertices)} bones={len(armature.data.bones)}")
