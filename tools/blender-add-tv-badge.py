"""Adiciona ao peito de um humanoide o brasão original da facção TV.

Uso:
  blender --background --python tools/blender-add-tv-badge.py -- entrada.glb saida.glb

O emblema é um pequeno CRT ciano com duas antenas e estrela amarela, sem texto ou
marca externa. A geometria é unida à malha skinnada e recebe peso 1 no osso Spine.
As coordenadas são específicas do rig normalizado de 1,70 m da Câmera Roxa.
"""
import math
import pathlib
import sys

import bpy
from mathutils import Vector


def args_after_double_dash():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


argv = args_after_double_dash()
if len(argv) != 2:
    raise SystemExit("uso: blender-add-tv-badge.py -- entrada.glb saida.glb")
source = pathlib.Path(argv[0]).resolve()
output = pathlib.Path(argv[1]).resolve()
if not source.is_file():
    raise SystemExit(f"GLB inexistente: {source}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
body = bpy.data.objects.get("char1")
if body is None or body.type != "MESH":
    raise SystemExit("malha char1 não encontrada")
if body.vertex_groups.get("Spine") is None:
    raise SystemExit("grupo Spine não encontrado")


def material(name, color, metallic=0.0, roughness=0.45):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


cyan = material("TV_CRT_Cyan", (0.02, 0.65, 0.92), 0.45, 0.28)
dark = material("TV_CRT_Screen", (0.008, 0.025, 0.045), 0.15, 0.22)
yellow = material("TV_CRT_Star", (1.0, 0.52, 0.02), 0.25, 0.30)
parts = []


def weight_to_spine(obj):
    group = obj.vertex_groups.new(name="Spine")
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    parts.append(obj)


def cube(name, location, dimensions, mat):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    weight_to_spine(obj)
    return obj


def rod(name, start, end, radius, mat):
    start, end = Vector(start), Vector(end)
    delta = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius, depth=delta.length, location=(start + end) * 0.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = delta.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(mat)
    weight_to_spine(obj)
    return obj


def star(name, center, outer_radius, inner_radius, depth, mat):
    # Prisma fino: frente/trás no eixo Y; a frente do personagem é -Y no Blender.
    cx, cy, cz = center
    points = []
    for i in range(10):
        angle = math.pi / 2 + i * math.pi / 5
        radius = outer_radius if i % 2 == 0 else inner_radius
        points.append((cx + math.cos(angle) * radius, cz + math.sin(angle) * radius))
    verts = [(x, cy - depth / 2, z) for x, z in points] + [(x, cy + depth / 2, z) for x, z in points]
    faces = [tuple(range(10)), tuple(range(19, 9, -1))]
    for i in range(10):
        j = (i + 1) % 10
        faces.append((i, j, 10 + j, 10 + i))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    weight_to_spine(obj)
    return obj


# Placa e tela: o contorno ciano continua visível em thumbnail; nenhuma letra embutida.
cube("TVBadgeFrame", (0.0, -0.226, 1.100), (0.105, 0.014, 0.065), cyan)
cube("TVBadgeScreen", (0.0, -0.235, 1.100), (0.076, 0.008, 0.038), dark)
rod("TVBadgeAntennaL", (-0.026, -0.229, 1.132), (0.0, -0.229, 1.166), 0.004, cyan)
rod("TVBadgeAntennaR", (0.026, -0.229, 1.132), (0.0, -0.229, 1.166), 0.004, cyan)
star("TVBadgeStar", (0.0, -0.238, 1.176), 0.017, 0.0075, 0.008, yellow)

# Une ao objeto skinnado: um único mesh glTF, dois materiais constantes adicionais e
# o mesmo Armature modifier do corpo. Os grupos homônimos são fundidos pelo Blender.
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
for obj in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
print(f"TV_BADGE_GLB={output} parts={len(parts)}")
