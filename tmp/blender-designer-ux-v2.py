"""Corrige o candidato Meshy T2 antes do rig; não toca no corpo/pose base.

Remove apenas os componentes desconectados da mochila/garrafa/props deformados e o
coque original identificados pelo relatório visual. Recria os três marcadores como
meshes rígidas fora do corredor de M4/ADS, com carcaça traseira contínua.
"""
import math
import pathlib
import sys
from array import array

import bmesh
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(args) != 2:
    raise SystemExit("uso: blender --background --python script -- input.glb output.glb")
source = pathlib.Path(args[0]).resolve()
output = pathlib.Path(args[1]).resolve()
remove_ids = {3, 5, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 30, 31}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if len(meshes) != 1:
    raise SystemExit(f"esperava 1 mesh, recebeu {len(meshes)}")
body = meshes[0]
mesh = body.data

adjacency = [set() for _ in mesh.vertices]
for edge in mesh.edges:
    a, b = edge.vertices
    adjacency[a].add(b)
    adjacency[b].add(a)
colocated = {}
for vertex in mesh.vertices:
    key = tuple(round(value, 5) for value in vertex.co)
    colocated.setdefault(key, []).append(vertex.index)
for indices in colocated.values():
    anchor = indices[0]
    for duplicate in indices[1:]:
        adjacency[anchor].add(duplicate)
        adjacency[duplicate].add(anchor)
unseen = set(range(len(mesh.vertices)))
components = []
while unseen:
    seed = min(unseen)
    stack = [seed]
    unseen.remove(seed)
    values = []
    while stack:
        current = stack.pop()
        values.append(current)
        for neighbor in adjacency[current]:
            if neighbor in unseen:
                unseen.remove(neighbor)
                stack.append(neighbor)
    components.append(values)
components.sort(key=lambda values: (-len(values), min(values)))
selected = {vertex for component_id, values in enumerate(components) if component_id in remove_ids for vertex in values}
# As mãos Meshy terminam em dedos pontudos. Removê-las antes do rig permite substituir
# apenas essa região por palmas/dedos limpos sem alterar braços ou anatomia-base.
selected.update(vertex.index for vertex in mesh.vertices if abs(vertex.co.x) > 0.425 and vertex.co.z < 1.06)
bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.verts[index] for index in selected], context="VERTS")
bm.to_mesh(mesh)
bm.free()
mesh.update()

# O material Meshy liga a textura direto no Principled. Escurecer a imagem-base, em
# vez de trocar o material, preserva detalhes do traje e volta o valor para preto.
for material in body.data.materials:
    if not material or not material.use_nodes:
        continue
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    if not principled:
        continue
    base = principled.inputs.get("Base Color")
    if base and base.is_linked and base.links[0].from_node.type == "TEX_IMAGE":
        image = base.links[0].from_node.image
        pixels = array("f", [0.0]) * len(image.pixels)
        image.pixels.foreach_get(pixels)
        for index in range(0, len(pixels), 4):
            pixels[index] *= 0.28
            pixels[index + 1] *= 0.28
            pixels[index + 2] *= 0.32
        image.pixels.foreach_set(pixels)
        image.update()

def make_material(name, color, metallic=0.0, roughness=0.55, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.metallic = metallic
    mat.roughness = roughness
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = 0.35
    return mat

silver = make_material("CS_PROP_thermos_silver", (0.36, 0.39, 0.42), 0.78, 0.26)
black = make_material("CS_PROP_black", (0.012, 0.016, 0.022), 0.1, 0.42)
green = make_material("CS_PROP_strap_green", (0.10, 0.46, 0.14), 0.0, 0.58)
tablet_mat = make_material("CS_PROP_tablet", (0.025, 0.04, 0.055), 0.18, 0.38)
screen_mat = make_material("CS_PROP_tablet_screen", (0.025, 0.12, 0.16), 0.05, 0.25, (0.02, 0.22, 0.30))
hair_mat = make_material("CS_HAIR_CURLS", (0.018, 0.012, 0.010), 0.0, 0.9)
skin_mat = make_material("CS_SKIN_MEDIUM_BROWN", (0.12, 0.045, 0.022), 0.0, 0.72)
frame_mat = make_material("CS_PROP_glasses", (0.0015, 0.0015, 0.002), 0.0, 0.22)
fan_mats = [make_material(f"CS_PROP_fan_{index}", color, 0.0, 0.48) for index, color in enumerate([
    (0.82, 0.12, 0.18), (0.96, 0.40, 0.10), (0.95, 0.78, 0.12),
    (0.20, 0.68, 0.25), (0.10, 0.55, 0.78), (0.24, 0.26, 0.78), (0.62, 0.18, 0.72),
])]

def add_cylinder(name, radius, depth, location, material, vertices=24, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return obj

def add_box(name, dimensions, location, material, rotation=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("soft_edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    obj.data.materials.append(material)
    return obj

def add_curve(name, points, material, bevel=0.008):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = bevel
    curve.bevel_resolution = 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj

def add_ellipsoid(name, location, scale, material, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj

def add_segment(name, start, end, radius, material, vertices=12):
    start = Vector(start)
    end = Vector(end)
    direction = end - start
    obj = add_cylinder(name, radius, direction.length, (start + end) * 0.5, material, vertices=vertices)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return obj

# Mochila compacta: carcaça sólida, mas sem o painel sci-fi gigante da v3.
add_box("CS_PROP_back_carrier", (0.235, 0.090, 0.270), (0.0, 0.145, 1.145), black, bevel=0.030)
add_box("CS_PROP_back_pocket", (0.155, 0.030, 0.105), (0.0, 0.202, 1.075), tablet_mat, bevel=0.018)

# Garrafa térmica de pressão: totalmente atrás da escápula esquerda, baixa o
# bastante para desaparecer no frontal e não tocar cabelo/cabeça no perfil.
thermos_tilt = (0, 0.32, 0)
add_cylinder("CS_PROP_thermos_body", 0.052, 0.28, (0.125, 0.225, 1.300), silver, rotation=thermos_tilt)
add_cylinder("CS_PROP_thermos_lid", 0.060, 0.045, (0.176, 0.225, 1.452), black, rotation=thermos_tilt)
add_cylinder("CS_PROP_thermos_pump", 0.015, 0.050, (0.191, 0.225, 1.495), black, vertices=16, rotation=thermos_tilt)
add_cylinder("CS_PROP_thermos_knob", 0.032, 0.018, (0.202, 0.225, 1.528), black, vertices=20, rotation=thermos_tilt)
add_cylinder("CS_PROP_thermos_spout", 0.012, 0.050, (0.218, 0.225, 1.450), black, vertices=16, rotation=(0, math.pi / 2, 0))
add_box("CS_PROP_thermos_mount", (0.078, 0.035, 0.150), (0.100, 0.195, 1.285), black, rotation=thermos_tilt, bevel=0.010)
add_box("CS_PROP_thermos_strap", (0.018, 0.025, 0.225), (0.170, 0.215, 1.285), green, rotation=thermos_tilt, bevel=0.006)

# Tablet de frente para a câmera, fora do contorno da coxa e abaixo da mão.
add_box("CS_PROP_tablet_body", (0.145, 0.028, 0.205), (-0.265, -0.035, 0.605), tablet_mat, rotation=(0, 0, -0.04), bevel=0.010)
add_box("CS_PROP_tablet_screen", (0.115, 0.031, 0.165), (-0.265, -0.052, 0.610), screen_mat, rotation=(0, 0, -0.04), bevel=0.006)
add_curve("CS_PROP_tablet_loop", [Vector((-0.175, 0.00, 0.740)), Vector((-0.220, -0.015, 0.720)), Vector((-0.250, -0.03, 0.700))], black, 0.006)

# Leque compacto encostado na coxa esquerda, em quadril oposto ao tablet.
pivot = Vector((0.255, -0.040, 0.595))
for index, (angle, mat) in enumerate(zip([-.58, -.39, -.20, 0.0, .20, .39, .58], fan_mats)):
    length = 0.130
    direction = Vector((math.sin(angle), 0, math.cos(angle)))
    location = pivot + direction * (length * 0.48)
    add_box(f"CS_PROP_fan_blade_{index}", (0.024, 0.014, length), location, mat, rotation=(0, angle, 0), bevel=0.006)
add_cylinder("CS_PROP_fan_pivot", 0.024, 0.030, pivot, black, vertices=20, rotation=(math.pi / 2, 0, 0))

# Coque único e volumoso com relevo orgânico, sem o conjunto de rosetas da v2.
# O volume sobrepõe a calota para não criar haste/gap na vista lateral.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=0.100, location=(0.0, 0.085, 1.635))
bun = bpy.context.object
bun.name = "CS_HAIR_textured_bun"
bun.scale = (1.0, 0.84, 1.02)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
clouds = bpy.data.textures.new("CS_HAIR_CURL_NOISE", type="CLOUDS")
clouds.noise_scale = 0.025
displace = bun.modifiers.new("compact_curl_relief", "DISPLACE")
displace.texture = clouds
displace.strength = 0.012
displace.texture_coords = "GLOBAL"
bpy.context.view_layer.objects.active = bun
bpy.ops.object.modifier_apply(modifier=displace.name)
bun.data.materials.append(hair_mat)
for side in (-1, 1):
    eye_x = side * 0.034
    label = 'L' if side < 0 else 'R'
    add_box(f"CS_PROP_glasses_{label}_top", (0.054, 0.008, 0.006), (eye_x, -0.158, 1.556), frame_mat, bevel=0.002)
    add_box(f"CS_PROP_glasses_{label}_bottom", (0.054, 0.008, 0.006), (eye_x, -0.158, 1.514), frame_mat, bevel=0.002)
    add_box(f"CS_PROP_glasses_{label}_outer", (0.006, 0.008, 0.046), (eye_x + side * 0.027, -0.158, 1.535), frame_mat, bevel=0.002)
    add_box(f"CS_PROP_glasses_{label}_inner", (0.006, 0.008, 0.046), (eye_x - side * 0.027, -0.158, 1.535), frame_mat, bevel=0.002)
add_box("CS_PROP_glasses_bridge", (0.016, 0.008, 0.006), (0, -0.158, 1.535), frame_mat, bevel=0.002)

# Palmas e cinco dedos separados em pose neutra, alinhados ao último trecho dos
# antebraços. São meshes independentes para o rig poder skiná-las explicitamente.
for side in (-1, 1):
    sx = float(side)
    wrist = (sx * 0.385, -0.095, 0.970)
    palm_center = Vector((sx * 0.420, -0.095, 0.910))
    add_segment(f"CS_HAND_{'L' if side < 0 else 'R'}_wrist", wrist, palm_center, 0.025, skin_mat, 16)
    add_ellipsoid(f"CS_HAND_{'L' if side < 0 else 'R'}_palm", palm_center, (0.037, 0.027, 0.047), skin_mat, 3)
    finger_roots = [
        (0.435, -0.107, 0.897), (0.440, -0.099, 0.884),
        (0.440, -0.091, 0.872), (0.435, -0.083, 0.860),
    ]
    finger_tips = [
        (0.472, -0.107, 0.840), (0.480, -0.099, 0.818),
        (0.478, -0.091, 0.814), (0.468, -0.083, 0.827),
    ]
    for index, (root, tip) in enumerate(zip(finger_roots, finger_tips)):
        root = (sx * root[0], root[1], root[2])
        tip = (sx * tip[0], tip[1], tip[2])
        add_segment(f"CS_HAND_{'L' if side < 0 else 'R'}_finger_{index}", root, tip, 0.0070, skin_mat, 12)
        add_ellipsoid(f"CS_HAND_{'L' if side < 0 else 'R'}_finger_tip_{index}", tip, (0.008, 0.008, 0.009), skin_mat, 1)
    thumb_root = (sx * 0.410, -0.121, 0.918)
    thumb_tip = (sx * 0.454, -0.130, 0.897)
    add_segment(f"CS_HAND_{'L' if side < 0 else 'R'}_thumb", thumb_root, thumb_tip, 0.0085, skin_mat, 12)
    add_ellipsoid(f"CS_HAND_{'L' if side < 0 else 'R'}_thumb_tip", thumb_tip, (0.009, 0.009, 0.010), skin_mat, 1)

# Pele e cabelo recebem materiais separados em regiões semânticas. O corpo Meshy
# original funde rosto, roupa e mãos em uma mesh, portanto a classificação usa apenas
# coordenadas da A-pose e não cria dependência de nome instável.
body.data.materials.append(skin_mat)
body.data.materials.append(hair_mat)
skin_index = len(body.data.materials) - 2
hair_index = len(body.data.materials) - 1
for polygon in body.data.polygons:
    center = polygon.center
    is_head_skin = center.z > 1.405 and center.z < 1.565 and abs(center.x) < 0.115 and center.y < -0.025
    is_arm_skin = abs(center.x) > 0.285 and center.z < 1.135
    is_hair = center.z >= 1.555 and abs(center.x) < 0.125
    if is_hair:
        polygon.material_index = hair_index
    elif is_head_skin or is_arm_skin:
        polygon.material_index = skin_index

# O transplante de rig opera nos vértices locais do GLB. Blender normalmente exporta
# localização/rotação procedural como TRS do nó; zerar o nó sem assar esse TRS jogaria
# coque/props no pé do personagem. Assar todos os transforms preserva exatamente os
# pixels e torna cada primitive autocontida para skin/retarget.
bpy.ops.object.select_all(action="DESELECT")
mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
for obj in mesh_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for obj in mesh_objects:
    if obj.location.length > 1e-7 or any(abs(value) > 1e-7 for value in obj.rotation_euler) or any(abs(value - 1) > 1e-7 for value in obj.scale):
        raise RuntimeError(f"transform não assado: {obj.name}")

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
print(f"DESIGNER_UX_V3={output} removed={sorted(remove_ids)}")
