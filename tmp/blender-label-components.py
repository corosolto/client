import bpy, json, pathlib, sys
from collections import defaultdict, deque

source = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
output = pathlib.Path(sys.argv[sys.argv.index('--') + 2]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading='NORMALS')
body = bpy.data.objects.get('char1')
vertex_faces = defaultdict(list)
for face in body.data.polygons:
    for vertex in face.vertices: vertex_faces[vertex].append(face.index)
remaining = set(range(len(body.data.polygons)))
components = []
while remaining:
    seed = remaining.pop(); queue = [seed]; faces = []
    while queue:
        index = queue.pop(); face = body.data.polygons[index]; faces.append(index)
        for vertex in face.vertices:
            for adjacent in vertex_faces[vertex]:
                if adjacent in remaining: remaining.remove(adjacent); queue.append(adjacent)
    vertices = {v for index in faces for v in body.data.polygons[index].vertices}
    points = [body.matrix_world @ body.data.vertices[v].co for v in vertices]
    materials = defaultdict(int)
    for index in faces:
        slot = body.material_slots[body.data.polygons[index].material_index]
        materials[slot.material.name if slot.material else '<none>'] += 1
    bounds = {axis: [min(point[i] for point in points), max(point[i] for point in points)] for i, axis in enumerate('xyz')}
    weights = defaultdict(float)
    for vertex_index in vertices:
        for weight in body.data.vertices[vertex_index].groups:
            weights[body.vertex_groups[weight.group].name] += weight.weight
    components.append({'component': len(components), 'faces': len(faces), 'vertices': len(vertices), 'materials': dict(materials), 'bounds': bounds,
        'center': {axis: sum(point[i] for point in points) / len(points) for i, axis in enumerate('xyz')},
        'weights': dict(sorted(weights.items(), key=lambda item: item[1], reverse=True)[:6])})
components.sort(key=lambda c: c['faces'], reverse=True)
for rank, component in enumerate(components): component['rank'] = rank
output.write_text(json.dumps({'source': str(source), 'objects': [o.name for o in bpy.context.scene.objects], 'components': components}, indent=2), encoding='utf8')
print(f'COMPONENTS={len(components)} OUTPUT={output}')
