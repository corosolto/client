"""Transfere a superfície Meshy adulta ao skeleton estável com pesos suaves por região."""
import json,pathlib,sys,bpy
from mathutils import Matrix
args=sys.argv[sys.argv.index('--')+1:];donor=pathlib.Path(args[0]).resolve();source=pathlib.Path(args[1]).resolve();out=pathlib.Path(args[2]).resolve();receipt=pathlib.Path(args[3]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(donor),import_shading='NORMALS');arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(source),import_shading='NORMALS');body=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices));body.name='ClaqueteVerdeV3_Skinned';bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
groups={b.name:body.vertex_groups.new(name=b.name) for b in arm.data.bones};counts={n:0 for n in groups};prop=set();names=[m.name if m else '' for m in body.data.materials]
for poly in body.data.polygons:
 if names[poly.material_index] in {'CV3_CLAPPER','CV3_STRIPE','CV3_HINGE'}:prop.update(poly.vertices)
def add(i,name,w):
 if w<=0:return
 groups[name].add([i],w,'ADD');counts[name]+=1
def blend(i,a,b,t):t=max(0,min(1,t));add(i,a,1-t);add(i,b,t)
for v in body.data.vertices:
 i=v.index;x,y,z=v.co;ax=abs(x);side='Left' if x>=0 else 'Right'
 if i in prop:add(i,'Spine02',1);continue
 if z>1.39:add(i,'Head',1);continue
 if ax>.22 and z>.76:
  if ax<.30:blend(i,'Spine02',side+'Arm',(ax-.22)/.08)
  elif ax<.40:add(i,side+'Arm',1)
  elif ax<.48:blend(i,side+'Arm',side+'ForeArm',(ax-.40)/.08)
  elif ax<.56:blend(i,side+'ForeArm',side+'Hand',(ax-.48)/.08)
  else:add(i,side+'Hand',1)
  continue
 if z>.93:blend(i,'Hips','Spine02',(z-.93)/.18)
 elif z>.72:add(i,'Hips',1)
 elif z>.57:add(i,side+'UpLeg',1)
 elif z>.47:blend(i,side+'UpLeg',side+'Leg',(.57-z)/.10)
 elif z>.27:add(i,side+'Leg',1)
 elif z>.18:blend(i,side+'Leg',side+'Foot',(.27-z)/.09)
 else:add(i,side+'Foot',1)
for v in body.data.vertices:v.co*=100
body.data.update();body.parent=arm;body.matrix_parent_inverse=Matrix.Identity(4);mod=body.modifiers.new('Armature','ARMATURE');mod.object=arm;bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=arm;out.parent.mkdir(parents=True,exist_ok=True);bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_attributes=True)
data={'mesh':body.name,'donor':str(donor),'source':str(source),'boneCount':len(arm.data.bones),'vertexCount':len(body.data.vertices),'propVerticesRigidSpine02':len(prop),'weights':{k:v for k,v in counts.items() if v},'weightPolicy':'smooth regional transfer on one connected Meshy adult surface; clapper rigid on Spine02'};receipt.write_text(json.dumps(data,indent=2)+'\n');print(json.dumps(data))
