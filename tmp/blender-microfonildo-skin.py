"""Transfere o esqueleto Meshy estável e aplica pesos determinísticos ao Microfonildo."""
import json, pathlib, sys
import bpy
from mathutils import Matrix

args=sys.argv[sys.argv.index('--')+1:]
donor=pathlib.Path(args[0]).resolve(); source=pathlib.Path(args[1]).resolve(); out=pathlib.Path(args[2]).resolve(); receipt=pathlib.Path(args[3]).resolve(); xscale=float(args[4]) if len(args)>4 else .95
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(donor),import_shading='NORMALS')
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for o in list(bpy.context.scene.objects):
    if o.type=='MESH': bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(source),import_shading='NORMALS')
body=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices)); body.name='Microfonildo_Skinned'

bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active=body
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)

# Ajuste aos pivôs do template Meshy: largura compacta e braços sob shoulder/hand reais.
for v in body.data.vertices:
    v.co.x *= xscale; v.co.z *= .945
    ax=abs(v.co.x)
    ux=ax/xscale
    if ux>.20 and .72<v.co.z<1.34:
        t=max(0,min(1,(ux-.22)/.44)); v.co.z += .23-.10*t
body.data.update()

groups={name:body.vertex_groups.new(name=name) for name in [b.name for b in arm.data.bones]}
counts={name:0 for name in groups}
def pick(co):
    x,y,z=co; ax=abs(x); ux=ax/xscale; side='Left' if x>=0 else 'Right'
    # Props dorsais permanecem rígidos e não invadem braços/cabeça.
    if y>.12 and z>.82: return 'Spine02' if 'Spine02' in groups else 'Spine'
    if z>1.30: return 'Head'
    if ux>.59 and z>.68: return side+'Hand'
    if ux>.20 and z>.78:
        if ux<.34: return side+'Arm'
        if ux<.55: return side+'ForeArm'
        return side+'Hand'
    if z>.98: return 'Spine02'
    if z>.78: return 'Hips'
    if z>.42: return side+'UpLeg'
    if z>.16: return side+'Leg'
    return side+'Foot'
adj=[set() for _ in body.data.vertices]
for edge in body.data.edges:
    a,b=edge.vertices; adj[a].add(b); adj[b].add(a)
colocated={}
for v in body.data.vertices: colocated.setdefault(tuple(round(x,5) for x in v.co),[]).append(v.index)
for ids in colocated.values():
    for other in ids[1:]: adj[ids[0]].add(other); adj[other].add(ids[0])
unseen=set(range(len(adj)))
component_debug=[]
while unseen:
    seed=min(unseen); unseen.remove(seed); stack=[seed]; indices=[]
    while stack:
        i=stack.pop(); indices.append(i)
        for j in adj[i]:
            if j in unseen: unseen.remove(j); stack.append(j)
    center=sum((body.data.vertices[i].co for i in indices),body.data.vertices[indices[0]].co*0.0)/len(indices)
    name=pick(center); groups[name].add(indices,1.0,'REPLACE'); counts[name]+=len(indices)
    if abs(center.x)>.25 and center.z>.68:
        component_debug.append({'center':[round(v,4) for v in center],'vertices':len(indices),'group':name})

# Armature Meshy vem com object scale=.01 e coordenadas locais em centímetros.
for v in body.data.vertices: v.co *= 100.0
body.data.update()

body.parent=arm; body.matrix_parent_inverse=Matrix.Identity(4)
mod=body.modifiers.new('Armature','ARMATURE'); mod.object=arm
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active=arm
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_attributes=True)
data={'mesh':'Microfonildo_Skinned','donor':str(donor),'source':str(source),'xScale':xscale,'boneCount':len(arm.data.bones),'vertexCount':len(body.data.vertices),'weights':{k:v for k,v in counts.items() if v},'componentsOuterUpper':component_debug,'rigPolicy':'deterministic rigid regions on standard Meshy humanoid skeleton','propBones':{'boom':'Spine02','pack':'Spine02','cableReels':'Spine02'}}
receipt.write_text(json.dumps(data,indent=2)+'\n'); print(json.dumps(data))
