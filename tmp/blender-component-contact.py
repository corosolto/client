"""Renderiza ilhas topológicas em vermelho, uma por vez, sem alterar o GLB fonte."""
import json
import pathlib
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(args) != 3:
    raise SystemExit("uso: blender --background --python script -- input.glb out-dir report.json")
source = pathlib.Path(args[0]).resolve()
out_dir = pathlib.Path(args[1]).resolve()
report_path = pathlib.Path(args[2]).resolve()
out_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
for obj in list(bpy.context.scene.objects):
    if obj.type != "MESH":
        continue
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")

parts = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
parts.sort(key=lambda obj: (-len(obj.data.vertices), obj.name))
for index, obj in enumerate(parts):
    obj.name = f"component_{index:02d}"

def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = 0.8
    return mat

base = material("base", (0.055, 0.065, 0.08))
highlight = material("highlight", (1.0, 0.035, 0.02))
for obj in parts:
    obj.data.materials.clear()
    obj.data.materials.append(base)

world_points = [obj.matrix_world @ vertex.co for obj in parts for vertex in obj.data.vertices]
minimum = Vector(tuple(min(point[axis] for point in world_points) for axis in range(3)))
maximum = Vector(tuple(max(point[axis] for point in world_points) for axis in range(3)))
center = (minimum + maximum) * 0.5
height = maximum.z - minimum.z

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 320
scene.render.resolution_y = 320
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
if scene.world is None:
    scene.world = bpy.data.worlds.new("ComponentAuditWorld")
scene.world.color = (0.015, 0.018, 0.025)

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = "ORTHO"
camera.data.ortho_scale = height * 1.12
scene.camera = camera

def point_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()

for location, energy, size in [((-3, -4, 5), 1000, 4), ((3, 2, 3), 650, 3)]:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.size = size
    point_at(light, center)

rows = []
for index, part in enumerate(parts):
    part.data.materials.clear()
    part.data.materials.append(highlight)
    points = [part.matrix_world @ vertex.co for vertex in part.data.vertices]
    pmin = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    pmax = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    rows.append({"id": index, "name": part.name, "vertices": len(part.data.vertices), "boundsMin": list(pmin), "boundsMax": list(pmax)})
    for label, direction in (("front", Vector((0, -1, 0))), ("back", Vector((0, 1, 0)))):
        camera.location = center + direction * height * 2.3
        camera.location.z = center.z
        point_at(camera, center)
        scene.render.filepath = str(out_dir / f"component-{index:02d}-{label}.png")
        bpy.ops.render.render(write_still=True)
    part.data.materials.clear()
    part.data.materials.append(base)

report_path.write_text(json.dumps({"source": str(source), "components": rows}, indent=2) + "\n")
print(f"COMPONENT_REPORT={report_path}")
