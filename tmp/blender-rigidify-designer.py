"""Trava props desconectados do Designer UX aos ossos sem deformar o corpo Meshy."""
import json
import pathlib
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(args) != 3:
    raise SystemExit('uso: script -- input-rig.glb output.glb receipt.json')
source, output, receipt_path = [pathlib.Path(value).resolve() for value in args]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading='NORMALS')
armature = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
helpers = {bone.custom_shape for bone in armature.pose.bones if bone.custom_shape}
mesh_obj = next(obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj not in helpers)
mesh = mesh_obj.data

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
    current = []
    while stack:
        vertex = stack.pop()
        current.append(vertex)
        for neighbor in adjacency[vertex]:
            if neighbor in unseen:
                unseen.remove(neighbor)
                stack.append(neighbor)
    components.append(current)
components.sort(key=lambda values: (-len(values), min(values)))

hand_positions = {
    name: armature.matrix_world @ armature.pose.bones[name].matrix.translation
    for name in ('LeftHand', 'RightHand')
}
groups = {name: mesh_obj.vertex_groups.get(name) or mesh_obj.vertex_groups.new(name=name) for name in ('Hips', 'Spine02', 'Head', 'LeftHand', 'RightHand')}
receipt = []

for component_id, indices in enumerate(components):
    points = [mesh.vertices[index].co for index in indices]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    center = (minimum + maximum) * 0.5
    bone = reason = None
    if abs(center.x) > 0.34 and minimum.z > 0.76 and maximum.z < 1.02:
        bone = min(hand_positions, key=lambda name: (hand_positions[name] - center).length)
        reason = 'palma/dedos procedurais'
    elif maximum.x < -0.15 and maximum.z < 0.76:
        bone, reason = 'Hips', 'tablet na coxa'
    elif minimum.x > 0.14 and maximum.z < 0.76:
        bone, reason = 'Hips', 'leque na coxa'
    elif minimum.y > 0.055 and minimum.z > 0.95:
        bone, reason = 'Spine02', 'mochila/termica traseira'
    elif component_id == 1 or (minimum.z > 1.46 and len(indices) <= 4000):
        bone, reason = 'Head', 'coque/oculos'
    if not bone:
        continue
    for group in mesh_obj.vertex_groups:
        group.remove(indices)
    groups[bone].add(indices, 1.0, 'REPLACE')
    receipt.append({
        'component': component_id,
        'vertices': len(indices),
        'bone': bone,
        'reason': reason,
        'boundsMin': [round(value, 6) for value in minimum],
        'boundsMax': [round(value, 6) for value in maximum],
    })

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', export_yup=True)
receipt_path.write_text(json.dumps({'source': str(source), 'output': str(output), 'rigidComponents': receipt}, indent=2) + '\n', encoding='utf-8')
print(f'DESIGNER_RIGID={output} components={len(receipt)}')
