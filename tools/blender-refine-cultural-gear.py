"""Refina acessórios culturais já incorporados a um GLB skinnado.

Uso:
  blender --background --python tools/blender-refine-cultural-gear.py -- \
    programador|motoca entrada.glb saida.glb

Este passe existe para não regenerar nem duplicar o restante do personagem. Ele toca
somente primitivas identificadas pelos materiais originais de
blender-add-cultural-gear.py e conserva a skin e as texturas autoradas.
"""
import pathlib
import sys

import bpy
import bmesh
import math
from mathutils import Vector


argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(argv) != 3 or argv[0] not in {"programador", "motoca"}:
    raise SystemExit("uso: blender-refine-cultural-gear.py -- programador|motoca entrada.glb saida.glb")
mode, source_arg, output_arg = argv
source, output = pathlib.Path(source_arg).resolve(), pathlib.Path(output_arg).resolve()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
body = bpy.data.objects.get("char1")
if body is None or body.type != "MESH":
    raise SystemExit("malha char1 não encontrada")


def material(name):
    mat = bpy.data.materials.get(name)
    if mat is None:
        raise SystemExit(f"material {name} não encontrado")
    return mat


def delete_material_geometry(name):
    index = next((i for i, slot in enumerate(body.material_slots) if slot.material and slot.material.name == name), None)
    if index is None:
        return False
    mesh = bmesh.new()
    mesh.from_mesh(body.data)
    doomed = [face for face in mesh.faces if face.material_index == index]
    vertices = {vertex for face in doomed for vertex in face.verts}
    bmesh.ops.delete(mesh, geom=list(vertices), context="VERTS")
    mesh.to_mesh(body.data)
    mesh.free()
    return True


parts = []


def weighted(obj, bone):
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


def cylinder(name, location, radius, depth, mat, bone, vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return weighted(obj, bone)


def torus(name, location, major_radius, minor_radius, mat, bone, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major_radius, minor_radius=minor_radius,
                                    major_segments=16, minor_segments=6,
                                    location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return weighted(obj, bone)


def delete_faces(predicate):
    mesh = bmesh.new()
    mesh.from_mesh(body.data)
    doomed = [face for face in mesh.faces if predicate(face)]
    bmesh.ops.delete(mesh, geom=doomed, context="FACES")
    mesh.to_mesh(body.data)
    mesh.free()


if mode == "programador":
    # Remove a esfera ciano exposta. O corpo bege continua completo; reduzimos apenas
    # o componente conectado abaixo de z=1,10, distante do teclado vertical.
    delete_material_geometry("LAN_MouseBall")
    beige_index = next(i for i, slot in enumerate(body.material_slots)
                       if slot.material and slot.material.name == "LAN_Beige")
    center = Vector((0.205, -0.205, 0.995))
    to_local = body.matrix_world.inverted()
    for poly in body.data.polygons:
        if poly.material_index != beige_index:
            continue
        for vi in poly.vertices:
            vertex = body.data.vertices[vi]
            world = body.matrix_world @ vertex.co
            if world.z < 1.10 and world.y < -0.10:
                delta = world - center
                vertex.co = to_local @ (center + Vector((delta.x * 0.72, delta.y * 0.72, delta.z * 0.58)))
    # O teclado 3x5 do passe anterior lia como calculadora/painel solar no tamanho
    # servido. Remove apenas a placa e teclas altas e reconstrói uma silhueta 2:1,
    # com quatro fileiras escalonadas, Enter e barra de espaço inequívocos.
    beige_index = next(i for i, slot in enumerate(body.material_slots)
                       if slot.material and slot.material.name == "LAN_Beige")
    dark_index = next(i for i, slot in enumerate(body.material_slots)
                      if slot.material and slot.material.name == "LAN_Cable")
    delete_faces(lambda f: (
        f.material_index in {beige_index, dark_index}
        and (body.matrix_world @ f.calc_center_median()).z > 1.14
        and (body.matrix_world @ f.calc_center_median()).x > 0.22
    ))
    beige = material("LAN_Beige")
    dark = material("LAN_Cable")
    cube("LANKeyboard2000", (0.253, 0.075, 1.365), (0.030, 0.300, 0.170), beige, "Spine")
    key_y = (-0.035, 0.000, 0.035, 0.070, 0.105, 0.140, 0.175)
    for row, z in enumerate((1.410, 1.378, 1.346)):
        stagger = (row - 1) * 0.006
        for col, y in enumerate(key_y):
            cube(f"LANKeyQwerty_{row}_{col}", (0.272, y + stagger, z),
                 (0.010, 0.026, 0.022), dark, "Spine")
    cube("LANEnter", (0.272, 0.176, 1.315), (0.010, 0.050, 0.024), dark, "Spine")
    cube("LANSpacebar", (0.272, 0.070, 1.315), (0.010, 0.112, 0.024), dark, "Spine")
    cube("LANCtrl", (0.272, -0.022, 1.315), (0.010, 0.040, 0.024), dark, "Spine")

    # Caneca metálica com corpo, boca escura e alça: o disco claro anterior não
    # tinha silhueta de recipiente na projeção 3/4.
    mug = bpy.data.materials.get("LAN_MugSteel") or bpy.data.materials.new("LAN_MugSteel")
    mug.diffuse_color = (0.11, 0.13, 0.14, 1.0)
    mug.metallic = 0.65
    mug.roughness = 0.46
    mug.use_nodes = True
    bsdf = mug.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.11, 0.13, 0.14, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.65
    bsdf.inputs["Roughness"].default_value = 0.46
    cylinder("LANMugBody", (0.315, -0.075, 1.015), 0.052, 0.095, mug, "Spine02")
    torus("LANMugHandle", (0.315, -0.125, 1.015), 0.039, 0.009, mug, "Spine02",
          (0, math.pi / 2, 0))
    dark_mug = bpy.data.materials.get("LAN_MugDark") or bpy.data.materials.new("LAN_MugDark")
    dark_mug.diffuse_color = (0.01, 0.012, 0.014, 1.0)
    cylinder("LANMugMouth", (0.315, -0.075, 1.064), 0.043, 0.004, dark_mug, "Spine02")
else:
    for name in ("Motofrete_Bungee_Green", "Motofrete_Bungee_Yellow"):
        delete_material_geometry(name)
    black = material("CS_HARD_Motofrete_Helmet_Black")
    black.diffuse_color = (0.0, 0.0, 0.0, 1.0)
    black.metallic = 0.0
    black.roughness = 0.96
    if black.use_nodes:
        bsdf = black.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.0, 0.0, 0.0, 1.0)
            bsdf.inputs["Metallic"].default_value = 0.0
            bsdf.inputs["Roughness"].default_value = 0.96
    # O casco PBR gerado é volumoso e continuava aparecendo como uma borda cinza por
    # fora da cobertura preta. Expande só a primitiva preta ao redor do centro da
    # cabeça; o recorte frontal continua livre e o rosto não é encoberto.
    black_index = next(i for i, slot in enumerate(body.material_slots)
                       if slot.material and slot.material.name == "CS_HARD_Motofrete_Helmet_Black")
    center = Vector((0.0, -0.015, 1.585))
    to_local = body.matrix_world.inverted()
    helmet_vertices = {vi for poly in body.data.polygons if poly.material_index == black_index
                       for vi in poly.vertices}
    for vi in helmet_vertices:
        world = body.matrix_world @ body.data.vertices[vi].co
        delta = world - center
        body.data.vertices[vi].co = to_local @ (center + Vector((delta.x * 1.03, delta.y * 1.03, delta.z * 1.02)))
    # A geração trouxe um casco cinza já fundido ao Material_1. Uma cobertura só por
    # cima não vence toda a borda desse volume. Reatribui ao preto apenas os polígonos
    # altos da cabeça, preservando a janela frontal onde ficam olhos, nariz e boca.
    for poly in body.data.polygons:
        if poly.material_index != 0:
            continue
        center_poly = body.matrix_world @ poly.center
        face_window = (abs(center_poly.x) < 0.092 and center_poly.y < -0.085
                       and 1.475 < center_poly.z < 1.635)
        helmet_zone = (abs(center_poly.x) < 0.330 and -0.300 < center_poly.y < 0.270
                       and center_poly.z > 1.355)
        if helmet_zone and not face_window:
            poly.material_index = black_index
    # Aumenta telefone e tela no próprio GLB final. O suporte antigo ocupava poucos
    # pixels e desaparecia contra a jaqueta amarela.
    phone_index = next(i for i, slot in enumerate(body.material_slots)
                       if slot.material and slot.material.name == "Motofrete_Phone")
    screen_index = next(i for i, slot in enumerate(body.material_slots)
                        if slot.material and slot.material.name == "Motofrete_PhoneScreen")
    phone_center = Vector((0.085, -0.240, 1.185))
    to_local = body.matrix_world.inverted()
    for vi in {vi for p in body.data.polygons if p.material_index in {phone_index, screen_index}
               for vi in p.vertices}:
        world = body.matrix_world @ body.data.vertices[vi].co
        delta = world - phone_center
        body.data.vertices[vi].co = to_local @ (phone_center + Vector((delta.x * 1.30, delta.y, delta.z * 1.22)))
    screen = material("Motofrete_PhoneScreen")
    screen.diffuse_color = (0.01, 0.82, 0.92, 1.0)
    if screen.use_nodes:
        bsdf = screen.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (0.01, 0.82, 0.92, 1.0)
    # O passe de revisão remove os cordões. Mesmo curvos, a projeção 3/4 os fazia sair
    # da bag e ler como antenas; o telefone e a própria mochila já sustentam a leitura.

if parts:
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
print(f"REFINED_CULTURAL_GEAR={output} mode={mode}")
