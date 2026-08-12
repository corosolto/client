import pathlib
import sys

import bpy

source = pathlib.Path(sys.argv[sys.argv.index("--") + 1]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")

for obj in [item for item in bpy.context.scene.objects if item.type == "MESH"]:
    print("OBJECT", obj.name, "loc", tuple(round(v, 4) for v in obj.location), "scale", tuple(round(v, 4) for v in obj.scale), "parent", obj.parent.name if obj.parent else None)
    mesh = obj.data
    adjacency = [set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].add(b)
        adjacency[b].add(a)
    unseen = set(range(len(mesh.vertices)))
    components = []
    while unseen:
        seed = min(unseen)
        stack = [seed]
        unseen.remove(seed)
        vertices = []
        while stack:
            current = stack.pop()
            vertices.append(current)
            for neighbor in adjacency[current]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    stack.append(neighbor)
        components.append(vertices)
    components.sort(key=lambda values: (-len(values), min(values)))
    print(f"MESH {obj.name} vertices={len(mesh.vertices)} components={len(components)}")
    for index, values in enumerate(components[:80]):
        coords = [mesh.vertices[value].co for value in values]
        minimum = tuple(round(min(co[axis] for co in coords), 4) for axis in range(3))
        maximum = tuple(round(max(co[axis] for co in coords), 4) for axis in range(3))
        weights = {}
        for vertex_index in values:
            for group in mesh.vertices[vertex_index].groups:
                name = obj.vertex_groups[group.group].name
                weights[name] = weights.get(name, 0.0) + group.weight
        dominant = sorted(weights.items(), key=lambda item: item[1], reverse=True)[:3]
        print(index, len(values), minimum, maximum, [(name, round(weight, 1)) for name, weight in dominant])

for armature in [item for item in bpy.context.scene.objects if item.type == "ARMATURE"]:
    print("ARMATURE", armature.name, "loc", tuple(round(v, 4) for v in armature.location), "scale", tuple(round(v, 4) for v in armature.scale))
    for bone in armature.data.bones:
        print("BONE", bone.name, "head_local", tuple(round(v, 4) for v in bone.head_local), "tail_local", tuple(round(v, 4) for v in bone.tail_local))
