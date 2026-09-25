"""Print donor weapon mesh bounds in rig-local coordinates at a valid pose."""
from pathlib import Path
import json

import bpy


DONOR = Path.home() / "Downloads" / "ak-12animated.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(DONOR))
rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
rig.animation_data_create()
rig.animation_data.action = bpy.data.actions["Equip"]
bpy.context.scene.frame_set(58)
bpy.context.view_layer.update()

depsgraph = bpy.context.evaluated_depsgraph_get()
rig_inverse = rig.matrix_world.inverted()
rows = []
for obj in bpy.context.scene.objects:
    if obj.type != "MESH" or "Hands" in obj.name or obj.name.startswith("watch"):
        continue
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    points = [rig_inverse @ evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    evaluated.to_mesh_clear()
    if not points:
        continue
    mins = [min(point[axis] for point in points) for axis in range(3)]
    maxs = [max(point[axis] for point in points) for axis in range(3)]
    center = [(mins[axis] + maxs[axis]) * 0.5 for axis in range(3)]
    weight_totals = {}
    for vertex in obj.data.vertices:
        for assignment in vertex.groups:
            name = obj.vertex_groups[assignment.group].name
            weight_totals[name] = weight_totals.get(name, 0.0) + assignment.weight
    dominant = sorted(weight_totals.items(), key=lambda item: item[1], reverse=True)[:4]
    rows.append({
        "name": obj.name,
        "min": [round(value, 5) for value in mins],
        "max": [round(value, 5) for value in maxs],
        "center": [round(value, 5) for value in center],
        "vertices": len(points),
        "dominant_groups": [[name, round(weight, 2)] for name, weight in dominant],
    })

print("AK_DONOR_BOUNDS=" + json.dumps(rows, indent=2))
