"""Finish the native-rigged exact Meshy-A surface without replacing its skin.

Adds authored PBR material slots and a small rigid clapper shoulder pad. All new
prop vertices receive weight 1.0 on LeftShoulder before joining the existing
skinned mesh; the native armature, body vertices, weights and modifiers remain.
"""
import json
import math
import pathlib
import sys

import bpy


args = sys.argv[sys.argv.index("--") + 1:]
raw = pathlib.Path(args[0]).resolve()
out = pathlib.Path(args[1]).resolve()
receipt = pathlib.Path(args[2]).resolve()
mode = args[3]
if mode not in {"clean", "toy-joints", "dorsal-slab", "low-contrast"}:
    raise SystemExit("invalid mode")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(raw), import_shading="NORMALS")
armature = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
body = max((o for o in bpy.context.scene.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
body.name = "ClaqueteVerdeNativeSurface"
assert armature.data.bones.get("LeftShoulder"), "native Meshy rig missing LeftShoulder"
assert len(body.vertex_groups) >= 20, "native skin weights missing"
native_counts = {"vertices": len(body.data.vertices), "polygons": len(body.data.polygons)}

colors = {
    "suit": (0.010, 0.046, 0.018, 1),
    "armor": (0.020, 0.115, 0.038, 1),
    "armor_edge": (0.045, 0.180, 0.058, 1),
    "skin": (0.31, 0.105, 0.038, 1),
    "hair": (0.020, 0.007, 0.003, 1),
    "black": (0.004, 0.007, 0.006, 1),
    "clapper": (0.020, 0.155, 0.045, 1),
    "stripe": (0.96, 0.96, 0.82, 1),
    "hinge": (0.035, 0.043, 0.038, 1),
    "toy": (0.08, 0.30, 0.10, 1),
}
if mode == "low-contrast":
    colors["stripe"] = (0.030, 0.175, 0.052, 1)

materials = {}
for name, color in colors.items():
    material = bpy.data.materials.new("CV3_" + name.upper())
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = 0.61
    bsdf.inputs["Metallic"].default_value = 0.06 if name in {"armor", "armor_edge", "hinge"} else 0.0
    materials[name] = material

# Spatial assignment affects only material indices, not native positions/weights.
body.data.materials.clear()
for name in ("suit", "armor", "armor_edge", "skin", "hair", "black"):
    body.data.materials.append(materials[name])
slots = {m.name: i for i, m in enumerate(body.data.materials)}
for poly in body.data.polygons:
    # The native rig keeps the skinned mesh under a 0.01-scaled armature. Region
    # thresholds are authored in served world metres, not mesh-local coordinates.
    x, y, z = body.matrix_world @ poly.center
    if z > 1.43 and abs(x) < 0.25:
        region = "hair" if z > 1.61 or (z > 1.54 and y > 0.045) else "skin"
    elif abs(x) > 0.47 and 0.70 < z < 1.23:
        region = "skin"
    elif z < 0.22:
        region = "black"
    elif 0.69 < z < 0.81:
        region = "black"
    elif 0.84 < z < 1.39 and abs(x) < 0.31:
        region = "armor"
    elif 0.22 < z < 0.68 and abs(x) < 0.28 and y < 0.02:
        region = "armor_edge"
    else:
        region = "suit"
    poly.material_index = slots[materials[region].name]

props = []


def weighted(obj, name, material_name):
    obj.name = name
    obj.data.materials.append(materials[material_name])
    group = obj.vertex_groups.new(name="LeftShoulder")
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new("NativeArmature", "ARMATURE")
    modifier.object = armature
    props.append(obj)
    return obj


def sphere(name, location, scale, material_name, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = weighted(bpy.context.object, name, material_name)
    obj.scale = scale
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def box(name, location, dimensions, material_name, bevel=0.0, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = weighted(bpy.context.object, name, material_name)
    obj.dimensions = dimensions
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("RoundedEdge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


# Anatomical left is +X in the native rest pose. The whole prop stays below the
# 1.51m head root and is centered directly on the shoulder cap, not the back.
pad_x, pad_y, pad_z = 0.350, 0.070, 1.315
box(
    "NativeClapperShoulderPad",
    (pad_x, pad_y, pad_z),
    (0.188, 0.070, 0.112),
    "clapper",
    0.026,
)
bpy.ops.mesh.primitive_cylinder_add(
    vertices=20,
    radius=0.024,
    depth=0.064,
    location=(0.283, 0.061, 1.286),
    rotation=(math.pi / 2, 0, 0),
)
weighted(bpy.context.object, "NativeShortClapperHinge", "hinge")
# One flat diagonal band, deliberately 32mm thick so it survives a 150px card.
box(
    "NativeReadableSurfaceStripe",
    (pad_x, 0.014, pad_z),
    (0.112, 0.0045, 0.032),
    "stripe",
    0.0015,
    rotation=(0, -0.43, 0),
)

if mode == "dorsal-slab":
    box("ForbiddenDorsalSlab", (0.34, 0.135, 1.36), (0.30, 0.060, 0.42), "clapper", 0.015)
if mode == "toy-joints":
    for x, z in ((-0.30, 1.30), (0.30, 1.30), (-0.45, 1.10), (0.45, 1.10), (-0.13, 0.57), (0.13, 0.57), (-0.13, 0.18), (0.13, 0.18), (-0.24, 0.78), (0.24, 0.78)):
        sphere("ToyJoint", (x, -0.015, z), (0.075, 0.070, 0.075), "toy", 12, 7)

# Join only meshes, retaining the existing body as active object. Blender merges
# vertex groups by name, so every prop vertex remains rigidly weighted to the
# native LeftShoulder while all original body weights stay byte-for-byte in data.
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
for prop in props:
    prop.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body = bpy.context.object
body.name = "ClaqueteVerdeNativeClean" if mode == "clean" else "ClaqueteVerdeNativeMutant"
body.data.calc_loop_triangles()

assert len(armature.data.bones) == 24
assert body.vertex_groups.get("LeftShoulder") is not None
assert len(body.data.vertices) >= native_counts["vertices"]

out.parent.mkdir(parents=True, exist_ok=True)
receipt.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
armature.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = armature
bpy.ops.export_scene.gltf(
    filepath=str(out),
    export_format="GLB",
    use_selection=True,
    export_yup=True,
    export_animations=False,
    export_attributes=True,
)

data = {
    "mode": mode,
    "nativeRig": str(raw),
    "nativeBody": native_counts,
    "finalBody": {
        "vertices": len(body.data.vertices),
        "triangles": len(body.data.loop_triangles),
        "vertexGroups": len(body.vertex_groups),
    },
    "armatureBones": len(armature.data.bones),
    "surfacePolicy": "exact native-rigged Meshy A body retained; only materials plus rigid LeftShoulder prop",
    "clapper": {
        "anatomicalSide": "left",
        "bone": "LeftShoulder",
        "belowHead": True,
        "singleFlatStripe": True,
        "shortHinge": True,
        "dorsalSlab": mode == "dorsal-slab",
    },
    "newApiCredits": 5 if mode == "clean" else 0,
}
receipt.write_text(json.dumps(data, indent=2) + "\n")
print(json.dumps(data))
