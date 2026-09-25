"""Adiciona marcadores culturais originais e legíveis a três personagens.

Uso:
  blender --background --python tools/blender-add-cultural-gear.py -- \
    programador|motoca|doidinho entrada.glb saida.glb

As peças são geometria original sem texto ou marca, unidas à malha skinnada e pesadas
no osso mais próximo. Coordenadas são dos rigs normalizados de 1,70 m deste pipeline.
"""
import math
import pathlib
import sys

import bpy
import bmesh
from mathutils import Vector


argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(argv) != 3 or argv[0] not in {"programador", "motoca", "doidinho"}:
    raise SystemExit("uso: blender-add-cultural-gear.py -- programador|motoca|doidinho entrada.glb saida.glb")
mode, source_arg, output_arg = argv
source, output = pathlib.Path(source_arg).resolve(), pathlib.Path(output_arg).resolve()
if not source.is_file():
    raise SystemExit(f"GLB inexistente: {source}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
body = bpy.data.objects.get("char1")
if body is None or body.type != "MESH":
    raise SystemExit("malha char1 não encontrada")


def material(name, color, metallic=0.0, roughness=0.55):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


parts = []


def weighted(obj, bone):
    if body.vertex_groups.get(bone) is None:
        raise SystemExit(f"grupo {bone} não encontrado")
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    parts.append(obj)
    return obj


def cube(name, location, dimensions, mat, bone, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return weighted(obj, bone)


def sphere(name, location, scale, mat, bone, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return weighted(obj, bone)


def cylinder(name, location, radius, depth, mat, bone, rotation=(0, 0, 0), vertices=18):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return weighted(obj, bone)


def rod(name, start, end, radius, mat, bone):
    start, end = Vector(start), Vector(end)
    delta = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius, depth=delta.length, location=(start + end) * 0.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = delta.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(mat)
    return weighted(obj, bone)


if mode == "programador":
    beige = material("LAN_Beige", (0.62, 0.55, 0.40), 0.0, 0.78)
    dark = material("LAN_Cable", (0.018, 0.022, 0.025), 0.05, 0.62)
    ball = material("LAN_MouseBall", (0.025, 0.030, 0.032), 0.05, 0.72)
    # Mouse de bolinha grande e cabeado no quadril direito: junto do teclado já existente,
    # vira um marcador de lan house dos anos 2000 e sobrevive ao thumbnail.
    sphere("LANBallMouse", (0.205, -0.205, 0.995), (0.048, 0.031, 0.060), beige, "Spine02")
    # A esfera de tracao fica por baixo, discreta: uma bola ciano na face visivel lia
    # como botão/saliência futurista no thumbnail, não como mouse dos anos 2000.
    sphere("LANMouseBall", (0.205, -0.230, 0.970), (0.016, 0.007, 0.016), ball, "Spine02", 14, 8)
    rod("LANMouseCableA", (0.205, -0.205, 1.075), (0.235, -0.145, 1.165), 0.006, dark, "Spine02")
    rod("LANMouseCableB", (0.235, -0.145, 1.165), (0.250, 0.080, 1.315), 0.006, dark, "Spine02")
    # Capa bege com teclas grandes sobre o teclado vertical já modelado. A face +X é a
    # que a câmera 3/4 vê, então o marcador continua legível a 360×463.
    cube("LANBeigeKeyboard", (0.248, 0.095, 1.345), (0.026, 0.155, 0.355), beige, "Spine")
    for row, z in enumerate((1.230, 1.285, 1.340, 1.395, 1.450)):
        for col, y in enumerate((0.045, 0.090, 0.135)):
            cube(f"LANKey{row}_{col}", (0.265, y, z), (0.010, 0.031, 0.036), dark, "Spine")
    cube("LANSpacebar", (0.266, 0.090, 1.185), (0.011, 0.096, 0.026), dark, "Spine")

elif mode == "motoca":
    # Matte e quase sem metal: o valor antigo era escuro, mas o lóbulo especular largo
    # fazia o casco ler cinza/malva na luz da seleção enquanto a M4 continuava preta.
    black = material("CS_HARD_Motofrete_Helmet_Black", (0.004, 0.006, 0.009), 0.0, 0.96)
    visor = material("Motofrete_Visor_Smoke", (0.025, 0.065, 0.085), 0.35, 0.18)
    phone = material("Motofrete_Phone", (0.015, 0.018, 0.020), 0.15, 0.25)
    screen = material("Motofrete_PhoneScreen", (0.02, 0.55, 0.62), 0.25, 0.22)
    # Casco superior preto aberto só no rosto: mantém a face e cobre o casco cinza gerado.
    # A geração já trazia um capacete aberto volumoso. A cobertura precisa ficar
    # do lado de FORA dele; as dimensões menores usadas antes deixavam o casco
    # salmão original aparente em todo o arco.
    shell = sphere("MotofreteHelmetShell", (0.0, -0.010, 1.585), (0.195, 0.180, 0.170), black, "Head", 24, 16)
    mesh = bmesh.new(); mesh.from_mesh(shell.data)
    doomed = [vertex for vertex in mesh.verts if vertex.co.y < -0.035 and vertex.co.z < 0.035]
    bmesh.ops.delete(mesh, geom=doomed, context="VERTS")
    mesh.to_mesh(shell.data); mesh.free()
    # Queixeira e laterais transformam a silhueta em full-face; viseira fica levantada.
    cube("MotofreteChinBar", (0.0, -0.205, 1.435), (0.220, 0.045, 0.052), black, "Head")
    rod("MotofreteChinL", (-0.105, -0.195, 1.445), (-0.135, -0.055, 1.565), 0.017, black, "Head")
    rod("MotofreteChinR", (0.105, -0.195, 1.445), (0.135, -0.055, 1.565), 0.017, black, "Head")
    cube("MotofreteRaisedVisor", (0.0, -0.155, 1.645), (0.245, 0.014, 0.070), visor, "Head", (math.radians(-32), 0, 0))
    # Telefone grande no peito, sem UI/texto/marca.
    cube("MotofretePhone", (0.085, -0.238, 1.185), (0.125, 0.024, 0.190), phone, "Spine02", (0, 0, math.radians(-8)))
    cube("MotofretePhoneScreen", (0.085, -0.254, 1.185), (0.100, 0.008, 0.160), screen, "Spine02", (0, 0, math.radians(-8)))
    # A bag e o telefone já carregam a identidade. Cordões externos foram removidos:
    # mesmo curvos, em 360×463 projetavam para fora da silhueta e liam como antenas.

else:  # doidinho
    cream = material("Gambiarra_Shower_Cream", (0.82, 0.76, 0.58), 0.0, 0.72)
    dark = material("Gambiarra_Shower_Holes", (0.035, 0.045, 0.040), 0.0, 0.80)
    wire = material("Gambiarra_Wire_Yellow", (0.95, 0.58, 0.03), 0.0, 0.50)
    # Chuveiro elétrico reaproveitado, preso na lateral da mochila: gambiarra brasileira
    # legível e original, sem marca nem piada médica/social.
    cylinder("GambiarraShowerHead", (0.345, 0.080, 1.255), 0.090, 0.045, cream, "Spine", (0, math.pi / 2, 0), 24)
    for index, (dy, dz) in enumerate(((0, 0), (-0.035, 0), (0.035, 0), (0, -0.035), (0, 0.035))):
        cylinder(f"GambiarraShowerHole{index}", (0.371, 0.080 + dy, 1.255 + dz), 0.008, 0.007, dark, "Spine", (0, math.pi / 2, 0), 10)
    rod("GambiarraShowerPipeA", (0.325, 0.080, 1.190), (0.300, 0.075, 1.070), 0.018, cream, "Spine")
    rod("GambiarraShowerWireA", (0.330, 0.065, 1.310), (0.285, 0.035, 1.390), 0.007, wire, "Spine")
    rod("GambiarraShowerWireB", (0.285, 0.035, 1.390), (0.230, 0.010, 1.330), 0.007, wire, "Spine")


bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
for part in parts:
    part.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
print(f"CULTURAL_GEAR_GLB={output} mode={mode} parts={len(parts)}")
