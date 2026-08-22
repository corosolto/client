"""Último passe, estreito e idempotente, nos marcadores culturais já rigados.

Uso:
  blender --background --python tools/blender-final-cultural-gear.py -- \
    programador|motoca|motoca-shell|motoca-helmet|doidinho entrada.glb saida.glb

Não reconstrói personagem, materiais PBR ou armature. Move apenas acessórios
identificados por material e junta novas primitivas 100% pesadas ao osso do tronco.
"""
import math
import pathlib
import sys

import bpy
from mathutils import Vector


argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(argv) != 3 or argv[0] not in {"programador", "motoca", "motoca-shell", "motoca-helmet", "doidinho"}:
    raise SystemExit("uso: blender-final-cultural-gear.py -- programador|motoca|motoca-shell|motoca-helmet|doidinho entrada.glb saida.glb")
mode, source_arg, output_arg = argv
source, output = pathlib.Path(source_arg).resolve(), pathlib.Path(output_arg).resolve()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
body = bpy.data.objects.get("char1")
if body is None or body.type != "MESH":
    raise SystemExit("malha char1 não encontrada")


def material(name, color, metallic=0.0, roughness=0.6):
    if bpy.data.materials.get(name):
        raise SystemExit(f"passe já aplicado: {name}")
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
        raise SystemExit(f"grupo ausente: {bone}")
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    parts.append(obj)
    return obj


def sphere(name, location, scale, mat, bone, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object; obj.name = name; obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return weighted(obj, bone)


def cube(name, location, dimensions, mat, bone, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object; obj.name = name; obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return weighted(obj, bone)


def rod(name, start, end, radius, mat, bone):
    start, end = Vector(start), Vector(end); delta = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius, depth=delta.length, location=(start + end) * 0.5)
    obj = bpy.context.object; obj.name = name
    obj.rotation_euler = delta.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(mat)
    return weighted(obj, bone)


def shift_material_vertices(names, delta, predicate=lambda world: True):
    indices = {i for i, slot in enumerate(body.material_slots) if slot.material and slot.material.name in names}
    if len(indices) != len(names):
        missing = names - {body.material_slots[i].material.name for i in indices}
        raise SystemExit(f"materiais ausentes: {sorted(missing)}")
    affected = {vi for poly in body.data.polygons if poly.material_index in indices for vi in poly.vertices}
    inv = body.matrix_world.inverted(); moved = 0
    for vi in affected:
        world = body.matrix_world @ body.data.vertices[vi].co
        if predicate(world):
            body.data.vertices[vi].co = inv @ (world + Vector(delta)); moved += 1
    return moved


def slim_waist(center_z=0.90, radius=0.18, minimum=0.90):
    """Afina só a faixa de cintura do material-base, com fade e sem braços/mãos."""
    base_index = next((i for i, slot in enumerate(body.material_slots)
                       if slot.material and slot.material.name == "Material_1"), None)
    if base_index is None:
        raise SystemExit("Material_1 ausente")
    candidates = {vi for poly in body.data.polygons if poly.material_index == base_index for vi in poly.vertices}
    arm_groups = {g.index for g in body.vertex_groups
                  if any(token in g.name.lower() for token in ("arm", "hand", "shoulder", "curl"))}
    inv = body.matrix_world.inverted(); changed = 0
    for vi in candidates:
        vertex = body.data.vertices[vi]
        if sum(group.weight for group in vertex.groups if group.group in arm_groups) > 0.35:
            continue
        world = body.matrix_world @ vertex.co
        distance = abs(world.z - center_z)
        if distance >= radius:
            continue
        influence = 0.5 + 0.5 * math.cos(math.pi * distance / radius)
        scale = 1.0 - (1.0 - minimum) * influence
        world.x *= scale
        vertex.co = inv @ world; changed += 1
    return changed


if mode == "programador":
    # Encosta teclado e teclas 6,5 cm na mochila. Esse é o conserto que reduz a
    # largura de torso sem apagar o objeto 2:1 que já passou na leitura cultural.
    moved = shift_material_vertices({"LAN_Beige", "LAN_Cable"}, (-0.065, 0, 0),
                                    lambda p: p.z > 1.14 and p.x > 0.22)
    cream = material("LAN_Mouse_Rev2", (0.72, 0.64, 0.48), 0.0, 0.8)
    red = material("LAN_Trackball_Red", (0.72, 0.035, 0.025), 0.0, 0.5)
    cable = material("LAN_Cable_Visible", (0.68, 0.61, 0.46), 0.0, 0.75)
    dark = material("LAN_Mouse_Buttons", (0.018, 0.022, 0.025), 0.05, 0.68)
    # Mouse robusto no quadril: corpo oval, esfera vermelha na face +X visível em
    # 3/4, divisão dos botões e cabo grosso voltando ao teclado. Tudo fica por dentro
    # da largura antiga do painel, portanto melhora o marcador sem inflar a silhueta.
    sphere("LANMouseRev2Body", (0.205, -0.205, 1.005), (0.052, 0.038, 0.064), cream, "Spine02")
    sphere("LANTrackballRev2", (0.252, -0.205, 0.992), (0.014, 0.021, 0.022), red, "Spine02", 16, 10)
    cube("LANMouseButtonL", (0.210, -0.225, 1.050), (0.038, 0.024, 0.010), dark, "Spine02", (0.15, 0, 0))
    cube("LANMouseButtonR", (0.210, -0.184, 1.050), (0.038, 0.024, 0.010), dark, "Spine02", (0.15, 0, 0))
    rod("LANMouseCableRev2A", (0.205, -0.205, 1.065), (0.205, -0.115, 1.165), 0.008, cable, "Spine02")
    rod("LANMouseCableRev2B", (0.205, -0.115, 1.165), (0.190, 0.030, 1.305), 0.008, cable, "Spine02")
    # Duas presilhas tornam inequívoco que o teclado está preso à mochila.
    cube("LANKeyboardStrapTop", (0.190, 0.065, 1.405), (0.018, 0.22, 0.020), dark, "Spine")
    cube("LANKeyboardStrapBottom", (0.190, 0.065, 1.325), (0.018, 0.22, 0.020), dark, "Spine")
elif mode in {"motoca", "motoca-shell", "motoca-helmet"}:
    black_index = next((i for i, slot in enumerate(body.material_slots)
                        if slot.material and slot.material.name == "CS_HARD_Motofrete_Helmet_Black"), None)
    if black_index is None:
        raise SystemExit("material do capacete ausente")
    # O passe de refinamento expandiu todo o material preto e a caixa de 0,220 m
    # chegou ao GLB com 0,296 m. Compacta só a faixa baixa/frontal da queixeira.
    candidates = {vi for poly in body.data.polygons if poly.material_index == black_index
                  for vi in poly.vertices}
    inv = body.matrix_world.inverted(); changed = 0
    center = Vector((0.0, -0.255, 1.404))
    for vi in candidates:
        world = body.matrix_world @ body.data.vertices[vi].co
        if mode == "motoca":
            if abs(world.x) > .21 or not (1.35 <= world.z <= 1.46) or world.y > -.225:
                continue
            delta = world - center
            world = center + Vector((delta.x * .60, delta.y * .70, delta.z * .85))
            world.y += .020
        elif mode == "motoca-shell":
            # O casco fundido pelo gerador mede 0,458 m acima da face e lê como
            # um halo quase da largura dos ombros. Este passe separado é seguro
            # sobre o GLB já final: compacta somente o casco alto em X e em
            # profundidade, preservando rosto, queixeira, telefone e skin.
            if world.z <= 1.46:
                continue
            shell_center = Vector((0.0, -0.005, 1.585))
            delta = world - shell_center
            world = shell_center + Vector((delta.x * .61, delta.y * .60, delta.z))
        else:
            # A alpha.57 já respeitava as caixas frontal e superior, mas a vista
            # limpa mostrou o defeito que elas não mediam: toda a faixa inferior
            # ainda tinha 0,463 m e formava um colar oval. Compacta a faixa inteira
            # em torno da cabeça e dá um passe menor no casco alto. Nenhum outro
            # material (rosto, telefone, bag ou jaqueta) entra nesta transformação.
            if world.z <= 1.46:
                # Mantém a queixeira à frente do rosto (Y negativo é a frente no
                # Blender deste asset); compactar em torno do centro do crânio a
                # tinha empurrado para trás e esvaziado a faixa frontal do HARD4.
                ring_center = Vector((0.0, -0.205, 1.415))
                delta = world - ring_center
                world = ring_center + Vector((delta.x * .55, delta.y * .55, delta.z * .65))
            else:
                shell_center = Vector((0.0, -0.005, 1.585))
                delta = world - shell_center
                world = shell_center + Vector((delta.x * .86, delta.y * .82, delta.z))
        body.data.vertices[vi].co = inv @ world; changed += 1
    if changed < 8:
        raise SystemExit(f"capacete não localizado: {changed} vértices")
    moved = changed
    if mode == "motoca-helmet":
        visor = next((slot.material for slot in body.material_slots
                      if slot.material and slot.material.name == "Motofrete_Visor_Smoke"), None)
        if visor is None:
            raise SystemExit("material da viseira ausente")
        visor_index = next(i for i, slot in enumerate(body.material_slots) if slot.material == visor)
        visor_vertices = {vi for poly in body.data.polygons if poly.material_index == visor_index
                          for vi in poly.vertices}
        visor_center = Vector((0.0, -0.155, 1.645))
        for vi in visor_vertices:
            world = body.matrix_world @ body.data.vertices[vi].co
            delta = world - visor_center
            world = visor_center + Vector((delta.x * .82, delta.y, delta.z))
            world.y += .035
            body.data.vertices[vi].co = inv @ world
        # O smoke azul/ciano opaco lia como uma cinta solta. O conceito original
        # usa um visor levantado quase preto; mantemos brilho especular pelo baixo
        # roughness, mas removemos a saturação da cor-base.
        visor.diffuse_color = (0.012, 0.016, 0.019, 1.0)
        if visor.use_nodes:
            bsdf = visor.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = (0.012, 0.016, 0.019, 1.0)
                bsdf.inputs["Metallic"].default_value = 0.20
                bsdf.inputs["Roughness"].default_value = 0.24
        moved += len(visor_vertices)
else:
    # Traz disco, furos, tubo e fios 18 cm para dentro antes de adicionar a carcaça.
    # A redução ataca diretamente o outlier de largura sem mexer em torso/skin.
    moved = shift_material_vertices({"Gambiarra_Shower_Cream", "Gambiarra_Shower_Holes", "Gambiarra_Wire_Yellow"}, (-0.18, 0, 0))
    waist_vertices = slim_waist()
    cream = material("Gambiarra_ShowerBody_Cream", (0.88, 0.83, 0.66), 0.0, 0.74)
    seam = material("Gambiarra_ShowerBody_Seam", (0.24, 0.22, 0.16), 0.0, 0.82)
    wire = material("Gambiarra_Wire_Visible", (1.0, 0.66, 0.015), 0.0, 0.42)
    selector = material("Gambiarra_TempSelector", (0.72, 0.055, 0.035), 0.0, 0.5)
    # Carcaça bulbosa típica de chuveiro elétrico brasileiro, sem marca ou texto.
    # O disco existente vira a saída d'água; o volume, a emenda e o seletor explicam
    # o que ele é mesmo quando os cinco furos somem na média distância.
    sphere("GambiarraShowerBody", (0.145, 0.080, 1.315), (0.070, 0.095, 0.115), cream, "Spine", 20, 12)
    cube("GambiarraShowerNeck", (0.170, 0.080, 1.250), (0.080, 0.080, 0.075), cream, "Spine")
    cube("GambiarraShowerSeam", (0.192, 0.080, 1.318), (0.012, 0.145, 0.135), seam, "Spine")
    sphere("GambiarraTempSelector", (0.192, 0.025, 1.335), (0.014, 0.024, 0.024), selector, "Spine", 14, 8)
    rod("GambiarraWireRev2A", (0.125, 0.035, 1.405), (0.065, 0.005, 1.455), 0.010, wire, "Spine")
    rod("GambiarraWireRev2B", (0.065, 0.005, 1.455), (0.020, -0.010, 1.375), 0.010, wire, "Spine")

bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
for part in parts: part.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
print(f"FINAL_CULTURAL_GEAR={output} mode={mode} moved={moved} waist={locals().get('waist_vertices', 0)} parts={len(parts)}")
