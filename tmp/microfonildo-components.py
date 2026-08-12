import json, pathlib, sys
import bpy
from mathutils import Vector

source = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading='NORMALS')
obj = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
adj = [set() for _ in obj.data.vertices]
for edge in obj.data.edges:
    a,b=edge.vertices; adj[a].add(b); adj[b].add(a)
unseen=set(range(len(adj))); rows=[]
while unseen:
    seed=min(unseen); unseen.remove(seed); stack=[seed]; ids=[]
    while stack:
        i=stack.pop(); ids.append(i)
        for j in adj[i]:
            if j in unseen: unseen.remove(j); stack.append(j)
    pts=[obj.matrix_world @ obj.data.vertices[i].co for i in ids]
    lo=Vector(tuple(min(p[k] for p in pts) for k in range(3)))
    hi=Vector(tuple(max(p[k] for p in pts) for k in range(3)))
    rows.append({'vertices':len(ids),'min':[round(x,4) for x in lo],'max':[round(x,4) for x in hi],'center':[round(x,4) for x in (lo+hi)*.5],'span':[round(x,4) for x in hi-lo]})
rows.sort(key=lambda r:r['vertices'], reverse=True)
print(json.dumps(rows, indent=2))
