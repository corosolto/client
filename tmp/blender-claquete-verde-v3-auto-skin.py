"""Teste de viabilidade: heat weights Blender no skeleton Meshy, prop rigidamente sobrescrito."""
import json,pathlib,sys,bpy
args=sys.argv[sys.argv.index('--')+1:];donor=pathlib.Path(args[0]).resolve();source=pathlib.Path(args[1]).resolve();out=pathlib.Path(args[2]).resolve();receipt=pathlib.Path(args[3]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(donor),import_shading='NORMALS');arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(source),import_shading='NORMALS');body=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices));body.name='ClaqueteVerdeV3_AutoSkinned';bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
names=[m.name if m else '' for m in body.data.materials];prop=set()
for poly in body.data.polygons:
 if names[poly.material_index] in {'CV3_CLAPPER','CV3_STRIPE','CV3_HINGE'}:prop.update(poly.vertices)
for v in body.data.vertices:v.co*=100
body.data.update();bpy.ops.object.select_all(action='DESELECT');body.select_set(True);arm.select_set(True);bpy.context.view_layer.objects.active=arm;bpy.ops.object.parent_set(type='ARMATURE_AUTO')
# Ombreira/faixa/dobradiça não recebem heat blend: acompanham o torso rigidamente.
spine=body.vertex_groups.get('Spine02') or body.vertex_groups.new(name='Spine02')
for i in prop:
 for g in body.vertex_groups:
  try:g.remove([i])
  except RuntimeError:pass
 spine.add(list(prop),1,'REPLACE')
bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=arm;out.parent.mkdir(parents=True,exist_ok=True);bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_attributes=True)
data={'mesh':body.name,'donor':str(donor),'source':str(source),'boneCount':len(arm.data.bones),'vertexCount':len(body.data.vertices),'propVerticesRigidSpine02':len(prop),'weightPolicy':'Blender automatic heat weights on connected Meshy adult surface; clapper override Spine02'};receipt.write_text(json.dumps(data,indent=2)+'\n');print(json.dumps(data))
