"""Correções causais estreitas do laudo runtime alpha.62, sem browser.

Uso:
  Blender --background --python tools/blender-alpha62-runtime-fixes.py -- \
    programador|motoca|designer entrada.glb saida.glb recibo.json

Cada modo remove primeiro os componentes reprovados e só então reconstrói o prop.
Corpo, rig, animações e materiais fora da seleção são preservados e inventariados.
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
if len(argv) != 4 or argv[0] not in {"programador", "motoca", "designer"}:
    raise SystemExit("uso: ... -- programador|motoca|designer entrada.glb saida.glb recibo.json")
mode = argv[0]
source, output, receipt = [pathlib.Path(value).resolve() for value in argv[1:]]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def material(name, color, metallic=0.0, roughness=0.7):
    value = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.use_nodes = True
    bsdf = value.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = 1.0
    return value


def rigid_group(obj, bone):
    group = obj.vertex_groups.new(name=bone)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")


def apply_transform(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.select_set(False)


def cube(name, location, dimensions, mat, bone, rotation=(0.0, 0.0, 0.0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    apply_transform(obj)
    if bevel:
        modifier = obj.modifiers.new("Alpha62SoftEdges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)
    obj.data.materials.append(mat)
    rigid_group(obj, bone)
    return obj


def cylinder(name, location, radius, depth, mat, bone, vertices=24, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    rigid_group(obj, bone)
    return obj


def ellipsoid(name, location, scale, mat, bone, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(mat)
    rigid_group(obj, bone)
    return obj


def tube(name, points, radius, mat, bone):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
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


def delete_faces(body, predicate):
    doomed = []
    for polygon in body.data.polygons:
        slot = body.material_slots[polygon.material_index]
        name = slot.material.name if slot.material else ""
        if predicate(polygon, name):
            doomed.append(polygon.index)
    mesh = bmesh.new()
    mesh.from_mesh(body.data)
    mesh.faces.ensure_lookup_table()
    bmesh.ops.delete(mesh, geom=[mesh.faces[index] for index in doomed], context="FACES")
    bmesh.ops.delete(mesh, geom=[vertex for vertex in mesh.verts if not vertex.link_faces], context="VERTS")
    mesh.to_mesh(body.data)
    mesh.free()
    body.data.update()
    return len(doomed)


def move_material_vertices(body, names, delta):
    slots = {index for index, slot in enumerate(body.material_slots) if slot.material and slot.material.name in names}
    affected = {vertex for polygon in body.data.polygons if polygon.material_index in slots for vertex in polygon.vertices}
    inverse = body.matrix_world.inverted()
    for index in affected:
        world = body.matrix_world @ body.data.vertices[index].co
        body.data.vertices[index].co = inverse @ (world + Vector(delta))
    body.data.update()
    return len(affected)


def geometry_signature(body, names):
    points = []
    faces = 0
    for polygon in body.data.polygons:
        slot = body.material_slots[polygon.material_index]
        if not slot.material or slot.material.name not in names:
            continue
        faces += 1
        points.extend(body.matrix_world @ body.data.vertices[index].co for index in polygon.vertices)
    if not points:
        return {"faces": 0, "boundsMin": None, "boundsMax": None}
    return {
        "faces": faces,
        "boundsMin": [round(min(point[axis] for point in points), 6) for axis in range(3)],
        "boundsMax": [round(max(point[axis] for point in points), 6) for axis in range(3)],
    }


def join_into_body(body, objects):
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
armature = next((obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"), None)
if armature is None:
    raise SystemExit("armature ausente")
helpers = {bone.custom_shape for bone in armature.pose.bones if bone.custom_shape}
body = max(
    (obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj not in helpers and obj.parent == armature),
    key=lambda obj: len(obj.data.vertices),
)
before_bones = sorted(bone.name for bone in armature.data.bones)
before_counts = face_counts(body)
added = []
removed = {}
scope = ""

if mode == "programador":
    required = {"Hips", "Spine"}
    if any(body.vertex_groups.get(name) is None for name in required):
        raise SystemExit("Programador sem Hips/Spine")
    legacy = {
        "LAN_Mouse_Buttons", "LAN_Keyboard_Shell", "LAN_Keyboard_Keys",
        "LAN_Keyboard_Mount", "LAN_Mug_BeltClip", "LAN_Cable", "LAN_Cable_Visible", "LAN_Beige",
    }
    for name in legacy:
        removed[name] = sum(
            1 for polygon in body.data.polygons
            if body.material_slots[polygon.material_index].material
            and body.material_slots[polygon.material_index].material.name == name
        )
    def programador_legacy(polygon, name):
        if name in legacy:
            return True
        center = body.matrix_world @ polygon.center
        # O conjunto cru é soldado à mochila no Meshy, portanto não aparece como
        # objeto separado. A caixa abaixo é o volume medido das placas/espinhos:
        # atrás do ombro direito, acima da mochila útil e fora do tronco central.
        return name == "Material_1" and center.y > 0.13 and 1.22 < center.z < 1.55 and abs(center.x) > 0.11

    removed["Material_1ShoulderWing"] = sum(
        1 for polygon in body.data.polygons
        if programador_legacy(polygon, body.material_slots[polygon.material_index].material.name if body.material_slots[polygon.material_index].material else "")
        and body.material_slots[polygon.material_index].material
        and body.material_slots[polygon.material_index].material.name == "Material_1"
    )
    delete_faces(body, programador_legacy)
    moved_mug = move_material_vertices(body, {"LAN_MugSteel", "LAN_MugDark"}, (-0.040, 0.0, 0.010))
    if removed.get("LAN_Mouse_Buttons", 0) < 20 or removed.get("LAN_Keyboard_Shell", 0) < 6 or removed["Material_1ShoulderWing"] < 20 or moved_mug < 400:
        raise SystemExit(f"inventário Programador divergiu: removed={removed}, mug={moved_mug}")

    shell = material("LAN_Keyboard_Shell", (0.022, 0.027, 0.033), metallic=0.10, roughness=0.72)
    keys = material("LAN_Keyboard_Keys", (0.15, 0.14, 0.12), roughness=0.82)
    mount = material("LAN_Keyboard_Mount", (0.010, 0.013, 0.017), metallic=0.14, roughness=0.76)
    clip = material("LAN_Mug_BeltClip", (0.025, 0.030, 0.033), metallic=0.48, roughness=0.40)
    parts = [cube("LAN_Keyboard_Vertical", (0.040, 0.185, 1.340), (0.140, 0.028, 0.280), shell, "Spine", bevel=0.006)]
    for row, z in enumerate((1.230, 1.270, 1.310, 1.350, 1.390, 1.430)):
        for column, x in enumerate((-0.005, 0.025, 0.055, 0.085)):
            parts.append(cube(f"LAN_Key_V_{row}_{column}", (x, 0.202, z), (0.022, 0.008, 0.026), keys, "Spine", bevel=0.002))
    parts.append(cube("LAN_Keyboard_BackpackMount", (0.040, 0.145, 1.340), (0.045, 0.090, 0.160), mount, "Spine", bevel=0.006))
    parts.append(tube("LAN_Mug_BeltClip_Short", [
        (0.200, 0.105, 1.028), (0.188, 0.102, 1.038), (0.176, 0.090, 1.022),
    ], 0.007, clip, "Hips"))
    added = [obj.name for obj in parts]
    join_into_body(body, parts)
    scope = "remove shoulder wings/legacy keyboard; vertical backpack keyboard; mug moved inward with short Hips clip"

elif mode == "motoca":
    if body.vertex_groups.get("Spine02") is None:
        raise SystemExit("Motoca sem Spine02")
    helmet_names = {"CS_HARD_Motofrete_Helmet_FullFace", "Motofrete_Visor_Smoke"}
    helmet_before = geometry_signature(body, helmet_names)
    phone_names = {"Motofrete_Phone", "Motofrete_PhoneScreen", "Motofrete_PhoneMount"}
    for name in phone_names:
        removed[name] = sum(
            1 for polygon in body.data.polygons
            if body.material_slots[polygon.material_index].material
            and body.material_slots[polygon.material_index].material.name == name
        )
    delete_faces(body, lambda _polygon, name: name in phone_names)
    if any(removed[name] < 6 for name in phone_names):
        raise SystemExit(f"inventário telefone divergiu: {removed}")
    phone_mat = material("Motofrete_Phone", (0.010, 0.013, 0.017), metallic=0.14, roughness=0.64)
    screen_mat = material("Motofrete_PhoneScreen", (0.006, 0.022, 0.030), metallic=0.02, roughness=0.46)
    mount_mat = material("Motofrete_PhoneMount", (0.008, 0.010, 0.013), roughness=0.88)
    parts = [
        cube("Motofrete_Phone_HighChest", (0.090, -0.252, 1.350), (0.070, 0.022, 0.110), phone_mat, "Spine02", bevel=0.006),
        cube("Motofrete_Phone_Screen_HighChest", (0.090, -0.266, 1.350), (0.044, 0.006, 0.074), screen_mat, "Spine02", bevel=0.003),
        cube("Motofrete_Phone_Cradle_Bottom_High", (0.090, -0.266, 1.286), (0.082, 0.014, 0.014), mount_mat, "Spine02", bevel=0.003),
        cube("Motofrete_Phone_Cradle_Left_High", (0.050, -0.266, 1.350), (0.012, 0.014, 0.112), mount_mat, "Spine02", bevel=0.003),
        cube("Motofrete_Phone_Cradle_Right_High", (0.130, -0.266, 1.350), (0.012, 0.014, 0.112), mount_mat, "Spine02", bevel=0.003),
        cube("Motofrete_Phone_Shoulder_Strap_High", (0.052, -0.235, 1.465), (0.016, 0.014, 0.150), mount_mat, "Spine02", rotation=(0.0, 0.18, 0.0), bevel=0.003),
    ]
    added = [obj.name for obj in parts]
    join_into_body(body, parts)
    helmet_after = geometry_signature(body, helmet_names)
    if helmet_after != helmet_before:
        raise SystemExit(f"capacete aprovado mudou: {helmet_before} -> {helmet_after}")
    scope = "phone/screen/cradle only; approved helmet/visor, body, bag and rig untouched"

else:
    required = {"Hips", "Spine02"}
    if any(body.vertex_groups.get(name) is None for name in required):
        raise SystemExit("Designer sem Hips/Spine02")
    fan_names = {f"CS_UX_FAN_{index}" for index in range(9)}
    removed["Material_1"] = sum(
        1 for polygon in body.data.polygons
        if body.material_slots[polygon.material_index].material
        and body.material_slots[polygon.material_index].material.name == "Material_1"
    )
    removed["fanColorFaces"] = sum(
        1 for polygon in body.data.polygons
        if body.material_slots[polygon.material_index].material
        and body.material_slots[polygon.material_index].material.name in fan_names
    )

    def designer_legacy(polygon, name):
        if name == "Material_1" or name in fan_names:
            return True
        center = body.matrix_world @ polygon.center
        return name == "CS_UX_PROP_BLACK" and center.x > 0.13 and center.z < 0.86 and center.y < 0.02

    removed["fanBlackFaces"] = sum(
        1 for polygon in body.data.polygons
        if designer_legacy(polygon, body.material_slots[polygon.material_index].material.name if body.material_slots[polygon.material_index].material else "")
        and body.material_slots[polygon.material_index].material
        and body.material_slots[polygon.material_index].material.name == "CS_UX_PROP_BLACK"
    )
    delete_faces(body, designer_legacy)
    if removed["Material_1"] < 100 or removed["fanColorFaces"] < 50 or removed["fanBlackFaces"] < 20:
        raise SystemExit(f"inventário Designer divergiu: {removed}")

    metal = material("CS_UX_THERMOS_METAL", (0.20, 0.23, 0.27), metallic=0.82, roughness=0.28)
    pump = material("CS_UX_THERMOS_PUMP_BLACK", (0.004, 0.006, 0.009), metallic=0.18, roughness=0.48)
    black = bpy.data.materials.get("CS_UX_PROP_BLACK") or material("CS_UX_PROP_BLACK", (0.0004, 0.0006, 0.0010), roughness=0.62)
    fan_materials = [bpy.data.materials.get(f"CS_UX_FAN_{index}") for index in range(9)]
    if any(value is None for value in fan_materials):
        raise SystemExit("materiais cromáticos do leque ausentes")
    parts = [
        cylinder("CS_UX_THERMOS_OPAQUE_BODY", (0.170, 0.190, 1.285), 0.052, 0.250, metal, "Spine02", 32),
        ellipsoid("CS_UX_THERMOS_ROUNDED_CAP", (0.170, 0.190, 1.420), (0.058, 0.058, 0.042), metal, "Spine02", 2),
        cylinder("CS_UX_THERMOS_BLACK_PUMP", (0.170, 0.190, 1.470), 0.016, 0.050, pump, "Spine02", 20),
        ellipsoid("CS_UX_THERMOS_BLACK_PUMP_TOP", (0.170, 0.190, 1.500), (0.030, 0.026, 0.016), pump, "Spine02", 2),
        cube("CS_UX_THERMOS_BACK_MOUNT", (0.112, 0.185, 1.285), (0.030, 0.034, 0.160), pump, "Spine02", bevel=0.007),
    ]
    pivot = Vector((0.340, -0.075, 0.625))
    angles = (-0.75, -0.56, -0.37, -0.18, 0.0, 0.18, 0.37, 0.56, 0.75)
    for index, (angle, fan_mat) in enumerate(zip(angles, fan_materials)):
        direction = Vector((math.sin(angle), 0.0, math.cos(angle)))
        center = pivot + direction * 0.105
        parts.append(cube(f"CS_UX_FAN_MEDIUM_{index}", center, (0.030, 0.011, 0.220), fan_mat, "Hips", rotation=(0.0, angle, 0.0), bevel=0.004))
    parts.extend([
        tube("CS_UX_FAN_STRAP_OUTER", [(0.155, -0.025, 0.835), (0.245, -0.050, 0.765), (0.325, -0.070, 0.675)], 0.008, black, "Hips"),
        cylinder("CS_UX_FAN_PIVOT_OUTER", pivot, 0.022, 0.020, black, "Hips", 24, rotation=(math.pi / 2, 0.0, 0.0)),
    ])
    added = [obj.name for obj in parts]
    join_into_body(body, parts)
    scope = "delete Material_1 rear plate/window and old fan; preserve single tablet; rebuild opaque thermos and larger outer fan"

validation_changed = body.data.validate(verbose=True, clean_customdata=True)
body.data.update()
after_bones = sorted(bone.name for bone in armature.data.bones)
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
    "removedFaces": removed,
    "addedParts": added,
    "beforeFacesByMaterial": before_counts,
    "afterFacesByMaterial": face_counts(body),
    "boneHierarchyPreserved": len(before_bones),
    "meshValidationChanged": validation_changed,
    "scope": scope,
}
receipt.parent.mkdir(parents=True, exist_ok=True)
receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"ALPHA62_RUNTIME_FIX={output} mode={mode} sha256={record['outputSha256']}")
