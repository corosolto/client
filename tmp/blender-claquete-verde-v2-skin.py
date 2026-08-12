"""Mesmo esqueleto humanoide; pesos rígidos determinísticos, prop em Spine02."""
import json,pathlib,sys,bpy
from mathutils import Matrix
args=sys.argv[sys.argv.index('--')+1:];donor=pathlib.Path(args[0]).resolve();source=pathlib.Path(args[1]).resolve();out=pathlib.Path(args[2]).resolve();receipt=pathlib.Path(args[3]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(donor),import_shading='NORMALS');arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(source),import_shading='NORMALS');body=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices));body.name='ClaqueteVerdeV2_Skinned';bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
groups={b.name:body.vertex_groups.new(name=b.name) for b in arm.data.bones};counts={n:0 for n in groups}
def pick(c):
 x,y,z=c;ax=abs(x);side='Left' if x>=0 else 'Right'
 if y>.025 and z>1.18:return 'Spine02'
 if z>1.39:return 'Head'
 if ax>.55 and z>.78:return side+'Hand'
 if ax>.20 and z>.86:
  if ax<.32:return side+'Arm'
  if ax<.52:return side+'ForeArm'
  return side+'Hand'
 if z>1.01:return 'Spine02'
 if z>.75:return 'Hips'
 if z>.57:return side+'UpLeg'
 if z>.20:return side+'Leg'
 return side+'Foot'
adj=[set() for _ in body.data.vertices]
for e in body.data.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
same={}
for v in body.data.vertices:same.setdefault(tuple(round(q,5) for q in v.co),[]).append(v.index)
for ids in same.values():
 for i in ids[1:]:adj[ids[0]].add(i);adj[i].add(ids[0])
unseen=set(range(len(adj)));props=[]
while unseen:
 seed=min(unseen);unseen.remove(seed);stack=[seed];ids=[]
 while stack:
  i=stack.pop();ids.append(i)
  for j in adj[i]:
   if j in unseen:unseen.remove(j);stack.append(j)
 center=sum((body.data.vertices[i].co for i in ids),body.data.vertices[ids[0]].co*0)/len(ids);name=pick(center);groups[name].add(ids,1,'REPLACE');counts[name]+=len(ids)
 if center.y>.025 and center.z>1.18:props.append({'center':[round(q,4) for q in center],'vertices':len(ids),'group':name})
for v in body.data.vertices:v.co*=100
body.data.update();body.parent=arm;body.matrix_parent_inverse=Matrix.Identity(4);mod=body.modifiers.new('Armature','ARMATURE');mod.object=arm;bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=arm
out.parent.mkdir(parents=True,exist_ok=True);bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_attributes=True)
data={'mesh':body.name,'donor':str(donor),'source':str(source),'boneCount':len(arm.data.bones),'vertexCount':len(body.data.vertices),'weights':{k:v for k,v in counts.items() if v},'rigidClapperComponents':props,'rigPolicy':'same stable Meshy skeleton; deterministic rigid component weighting'};receipt.write_text(json.dumps(data,indent=2)+'\n');print(json.dumps(data))
