"""Renderiza componentes conectados após unir costuras UV por posição."""
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
armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
helpers = {
    pose_bone.custom_shape
    for armature in armatures
    for pose_bone in armature.pose.bones
    if pose_bone.custom_shape is not None
}
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj not in helpers]
if len(meshes) != 1:
    raise SystemExit(f"esperava 1 mesh, recebeu {len(meshes)}")
obj = meshes[0]
mesh = obj.data

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
    current_component = []
    while stack:
        current = stack.pop()
        current_component.append(current)
        for neighbor in adjacency[current]:
            if neighbor in unseen:
                unseen.remove(neighbor)
                stack.append(neighbor)
    components.append(current_component)
components.sort(key=lambda values: (-len(values), min(values)))
component_for_vertex = {vertex: component_id for component_id, values in enumerate(components) for vertex in values}

def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = 0.82
    return mat

mesh.materials.clear()
mesh.materials.append(material("base", (0.055, 0.065, 0.08)))
mesh.materials.append(material("highlight", (1.0, 0.035, 0.02)))

world_points = [obj.matrix_world @ vertex.co for vertex in mesh.vertices]
minimum = Vector(tuple(min(point[axis] for point in world_points) for axis in range(3)))
maximum = Vector(tuple(max(point[axis] for point in world_points) for axis in range(3)))
center = (minimum + maximum) * 0.5
height = maximum.z - minimum.z

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 360
scene.render.resolution_y = 360
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.world = bpy.data.worlds.new("GraphComponentAuditWorld")
scene.world.color = (0.015, 0.018, 0.025)
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = "ORTHO"
camera.data.ortho_scale = height * 1.12
scene.camera = camera

def point_at(target_obj, target):
    target_obj.rotation_euler = (target - target_obj.location).to_track_quat("-Z", "Y").to_euler()

for location, energy, size in [((-3, -4, 5), 1000, 4), ((3, 2, 3), 650, 3)]:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.size = size
    point_at(light, center)

rows = []
for component_id, vertex_ids in enumerate(components):
    points = [world_points[index] for index in vertex_ids]
    pmin = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    pmax = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    rows.append({"id": component_id, "vertices": len(vertex_ids), "boundsMin": list(pmin), "boundsMax": list(pmax)})
    for polygon in mesh.polygons:
        polygon.material_index = 1 if component_for_vertex[polygon.vertices[0]] == component_id else 0
    for label, direction in (("front", Vector((0, -1, 0))), ("back", Vector((0, 1, 0)))):
        camera.location = center + direction * height * 2.3
        camera.location.z = center.z
        point_at(camera, center)
        scene.render.filepath = str(out_dir / f"component-{component_id:02d}-{label}.png")
        bpy.ops.render.render(write_still=True)

report_path.write_text(json.dumps({"source": str(source), "components": rows}, indent=2) + "\n")
print(f"GRAPH_COMPONENT_REPORT={report_path}")
