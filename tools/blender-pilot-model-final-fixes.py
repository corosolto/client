"""Correção final, estreita, dos GLBs pilotos Programador e Motoca.

Programador: remove a haste diagonal e o teclado legado claro, aproxima a caneca
do quadril com uma presilha curta e reconstrói o teclado preso à mochila.
Motoca: troca somente casco/queixeira/visor empilhados por uma casca full-face
contínua com um único visor. Corpo, bag, telefone, rig e animações ficam fora.

Uso:
  blender --background --python tools/blender-pilot-model-final-fixes.py -- \
    programador|motoca entrada.glb saida.glb recibo.json
"""
import hashlib
import json
import math
import pathlib
import sys

import bmesh
import bpy
from mathutils import Vector


argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(argv) != 4 or argv[0] not in {"programador", "motoca"}:
    raise SystemExit("uso: blender-pilot-model-final-fixes.py -- programador|motoca entrada.glb saida.glb recibo.json")
mode = argv[0]
source, output, receipt = map(lambda value: pathlib.Path(value).resolve(), argv[1:])


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def material(name, color, metallic=0.0, roughness=0.7, alpha=1.0):
    value = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    value.diffuse_color = (*color, alpha)
    value.use_nodes = True
    bsdf = value.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, alpha)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    if alpha < 1:
        value.surface_render_method = "DITHERED"
    return value


def apply_transform(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.select_set(False)


def rigid_group(obj, bone):
    group = obj.vertex_groups.new(name=bone)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")


def cube(name, location, dimensions, mat, bone):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    apply_transform(obj)
    obj.data.materials.append(mat)
    rigid_group(obj, bone)
    return obj


def tube(name, points, radius, mat, bone, resolution=2):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = resolution
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
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


def face_counts(body):
    counts = {}
    for polygon in body.data.polygons:
        slot = body.material_slots[polygon.material_index]
        name = slot.material.name if slot.material else "<none>"
        counts[name] = counts.get(name, 0) + 1
    return counts


def delete_material_faces(body, names):
    indices = {
        index for index, slot in enumerate(body.material_slots)
        if slot.material and slot.material.name in names
    }
    mesh = bmesh.new()
    mesh.from_mesh(body.data)
    doomed = [face for face in mesh.faces if face.material_index in indices]
    removed = len(doomed)
    bmesh.ops.delete(mesh, geom=doomed, context="FACES")
    bmesh.ops.delete(mesh, geom=[vertex for vertex in mesh.verts if not vertex.link_faces], context="VERTS")
    mesh.to_mesh(body.data)
    mesh.free()
    return removed


def move_material_vertices(body, names, delta):
    indices = {
        index for index, slot in enumerate(body.material_slots)
        if slot.material and slot.material.name in names
    }
    affected = {
        vertex_index
        for polygon in body.data.polygons if polygon.material_index in indices
        for vertex_index in polygon.vertices
    }
    inverse = body.matrix_world.inverted()
    for vertex_index in affected:
        world = body.matrix_world @ body.data.vertices[vertex_index].co
        body.data.vertices[vertex_index].co = inverse @ (world + Vector(delta))
    return affected


def join_into_body(body, objects):
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
body = bpy.data.objects.get("char1")
if body is None or body.type != "MESH":
    raise SystemExit("malha char1 ausente")
if body.vertex_groups.get("Hips") is None or body.vertex_groups.get("Spine") is None or body.vertex_groups.get("Head") is None:
    raise SystemExit("rig incompleto: Hips/Spine/Head obrigatórios")

before_counts = face_counts(body)
before_bones = sorted(bone.name for armature in bpy.data.armatures for bone in armature.bones)
parts = []
added_part_names = []

if mode == "programador":
    removed_names = {"LAN_Beige", "LAN_Cable", "LAN_Cable_Visible"}
    removed_faces = delete_material_faces(body, removed_names)
    moved_mug = move_material_vertices(body, {"LAN_MugSteel", "LAN_MugDark"}, (-0.070, 0.0, 0.030))
    if removed_faces < 200 or len(moved_mug) < 400:
        raise SystemExit(f"inventário do Programador incompleto: removed={removed_faces} mug={len(moved_mug)}")

    shell_mat = material("LAN_Keyboard_Shell", (0.025, 0.030, 0.035), metallic=0.08, roughness=0.72)
    key_mat = material("LAN_Keyboard_Keys", (0.18, 0.17, 0.14), roughness=0.82)
    mount_mat = material("LAN_Keyboard_Mount", (0.012, 0.015, 0.018), metallic=0.12, roughness=0.74)
    clip_mat = material("LAN_Mug_BeltClip", (0.025, 0.030, 0.033), metallic=0.45, roughness=0.42)

    # Teclado vertical escuro, estreito e colado à mochila. As teclas são
    # pequenos volumes discretos; não existe mais a placa bege que virava um
    # triângulo claro no recorte lateral.
    keyboard = cube("LAN_Keyboard_Back", (0.180, 0.105, 1.350), (0.032, 0.120, 0.300), shell_mat, "Spine")
    parts.append(keyboard)
    for row, z in enumerate((1.245, 1.295, 1.345, 1.395, 1.445)):
        for column, y in enumerate((0.070, 0.105, 0.140)):
            parts.append(cube(f"LAN_Key_{row}_{column}", (0.198, y, z), (0.008, 0.022, 0.025), key_mat, "Spine"))
    # Duas pontes curtas entram tanto no teclado quanto no painel da mochila.
    parts.extend([
        cube("LAN_Keyboard_Mount_Top", (0.150, 0.105, 1.425), (0.070, 0.060, 0.026), mount_mat, "Spine"),
        cube("LAN_Keyboard_Mount_Bottom", (0.150, 0.105, 1.275), (0.070, 0.060, 0.026), mount_mat, "Spine"),
    ])
    # Presilha curta do aro da caneca até o cinto/mochila. Ela sobrepõe a
    # borda interna da caneca movida e termina no quadril; não atravessa o dorso.
    parts.append(tube("LAN_Mug_BeltClip", [
        (0.245, 0.105, 1.020), (0.220, 0.105, 1.045), (0.195, 0.090, 1.025),
    ], 0.008, clip_mat, "Hips", resolution=1))
    added_part_names = [obj.name for obj in parts]
    join_into_body(body, parts)
    scope = "keyboard + LAN_Cable_Visible + mug position/clip only; mouse/body/rig/M4 untouched"
else:
    removed_names = {
        "CS_HARD_Motofrete_Helmet_Shell", "CS_HARD_Motofrete_ChinBar",
        "Motofrete_Visor_Smoke", "Motofrete_Visor_Hinge",
    }
    removed_faces = delete_material_faces(body, removed_names)
    if removed_faces < 1000:
        raise SystemExit(f"inventário do capacete incompleto: {removed_faces} faces")

    helmet_mat = material("CS_HARD_Motofrete_Helmet_FullFace", (0.004, 0.006, 0.009), metallic=0.10, roughness=0.80)
    visor_mat = material("Motofrete_Visor_Smoke", (0.014, 0.017, 0.020), metallic=0.05, roughness=0.22, alpha=0.48)

    # Calota aberta no rosto, com espessura real.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, location=(0, 0.0, 1.605), scale=(0.127, 0.137, 0.182))
    helmet = bpy.context.object
    helmet.name = "Motofrete_Helmet_FullFace"
    apply_transform(helmet)
    mesh = bmesh.new()
    mesh.from_mesh(helmet.data)
    opening = []
    for face in mesh.faces:
        center = helmet.matrix_world @ face.calc_center_median()
        if center.y <= -0.060 and 1.475 <= center.z <= 1.690 and abs(center.x) <= 0.105:
            opening.append(face)
    bmesh.ops.delete(mesh, geom=opening, context="FACES")
    mesh.to_mesh(helmet.data)
    mesh.free()
    solidify = helmet.modifiers.new("FullFaceThickness", "SOLIDIFY")
    solidify.thickness = 0.010
    solidify.offset = 0
    bpy.context.view_layer.objects.active = helmet
    helmet.select_set(True)
    bpy.ops.object.modifier_apply(modifier=solidify.name)
    helmet.data.materials.append(helmet_mat)

    # Uma única faixa estrutural contorna têmporas, maxilar e queixo. Os fins
    # entram na calota; o remesh abaixo os funde numa casca, em vez de empilhar
    # visor, aro e queixeira como objetos/placas independentes.
    chin = tube("Motofrete_FullFace_Lower", [
        (-0.105, -0.010, 1.610), (-0.105, -0.070, 1.535),
        (-0.070, -0.137, 1.455), (-0.045, -0.153, 1.410),
        (0.0, -0.158, 1.395), (0.045, -0.153, 1.410),
        (0.070, -0.137, 1.455), (0.105, -0.070, 1.535),
        (0.105, -0.010, 1.610),
    ], 0.016, helmet_mat, "Head", resolution=2)
    bpy.ops.object.select_all(action="DESELECT")
    helmet.select_set(True)
    chin.select_set(True)
    bpy.context.view_layer.objects.active = helmet
    bpy.ops.object.join()
    remesh = helmet.modifiers.new("FullFaceUnion", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = 0.006
    remesh.use_smooth_shade = True
    bpy.context.view_layer.objects.active = helmet
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    decimate = helmet.modifiers.new("FullFaceBrowserBudget", "DECIMATE")
    decimate.ratio = 0.12
    decimate.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    rigid_group(helmet, "Head")

    # Visor único curvo, sem aro, dobradiça ou segunda placa. A malha é uma
    # grade conexa que acompanha a abertura e toca a casca nas duas laterais.
    columns, rows = 8, 4
    vertices = []
    for row in range(rows):
        z = 1.485 + row * (0.195 / (rows - 1))
        width = 0.102 + 0.008 * math.sin((row / (rows - 1)) * math.pi)
        for column in range(columns):
            x = -width + column * (2 * width / (columns - 1))
            y = -0.148 + 0.022 * (x / width) ** 2
            vertices.append((x, y, z))
    faces = []
    for row in range(rows - 1):
        for column in range(columns - 1):
            a = row * columns + column
            faces.append((a, a + 1, a + 1 + columns, a + columns))
    visor_mesh = bpy.data.meshes.new("Motofrete_Visor_Single_Mesh")
    visor_mesh.from_pydata(vertices, [], faces)
    visor_mesh.update()
    visor = bpy.data.objects.new("Motofrete_Visor_Single", visor_mesh)
    bpy.context.collection.objects.link(visor)
    visor.data.materials.append(visor_mat)
    solidify = visor.modifiers.new("VisorThickness", "SOLIDIFY")
    solidify.thickness = 0.006
    solidify.offset = 0
    bpy.context.view_layer.objects.active = visor
    visor.select_set(True)
    bpy.ops.object.modifier_apply(modifier=solidify.name)
    rigid_group(visor, "Head")
    join_into_body(body, [helmet, visor])
    scope = "helmet shell + chin/visor only; phone/bag/jacket/body/rig/M4 untouched"

# Decimate pode deixar loop interno degenerado mesmo com a superfície visível
# correta. O exportador avisa "Mesh is not valid"; limpar aqui transforma aviso
# silencioso em dado do recibo, antes de conferir a contagem fora do escopo.
mesh_validation_changed = body.data.validate(verbose=True, clean_customdata=True)
body.data.update()

after_counts = face_counts(body)
untouched_before = {name: count for name, count in before_counts.items() if name not in removed_names}
untouched_after = {name: after_counts.get(name, 0) for name in untouched_before}
if untouched_after != untouched_before:
    changed = {name: [count, untouched_after[name]] for name, count in untouched_before.items() if count != untouched_after[name]}
    raise SystemExit(f"faces fora do escopo mudaram: {changed}")

after_bones = sorted(bone.name for armature in bpy.data.armatures for bone in armature.bones)
if after_bones != before_bones:
    raise SystemExit("hierarquia do rig mudou")

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
record = {
    "mode": mode,
    "source": str(source),
    "output": str(output),
    "sourceSha256": sha256(source),
    "outputSha256": sha256(output),
    "blender": bpy.app.version_string,
    "removedMaterials": sorted(removed_names),
    "removedFaces": removed_faces,
    "addedParts": added_part_names if mode == "programador" else ["Motofrete_Helmet_FullFace", "Motofrete_Visor_Single"],
    "scope": scope,
    "untouchedFaceCountsPreserved": untouched_before,
    "boneHierarchyPreserved": len(before_bones),
    "meshValidationChanged": mesh_validation_changed,
}
receipt.parent.mkdir(parents=True, exist_ok=True)
receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"PILOT_FINAL_FIX={output} mode={mode} sha256={record['outputSha256']}")
