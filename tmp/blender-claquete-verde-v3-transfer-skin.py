"""Transfere pesos do humanoide Meshy rigado por nearest-surface após alinhar os bounds."""
import json,pathlib,sys,bpy
from mathutils import Vector,Matrix
args=sys.argv[sys.argv.index('--')+1:];donor=pathlib.Path(args[0]).resolve();source=pathlib.Path(args[1]).resolve();out=pathlib.Path(args[2]).resolve();receipt=pathlib.Path(args[3]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(donor),import_shading='NORMALS');arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');donor_mesh=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
# Guia estático em metros com os grupos de peso originais.
guide=donor_mesh.copy();guide.data=donor_mesh.data.copy();bpy.context.collection.objects.link(guide);world=donor_mesh.matrix_world.copy();guide.parent=None;guide.matrix_world=world
for m in list(guide.modifiers):guide.modifiers.remove(m)
bpy.ops.object.select_all(action='DESELECT');guide.select_set(True);bpy.context.view_layer.objects.active=guide;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and o not in {guide}:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(source),import_shading='NORMALS');body=max((o for o in bpy.context.scene.objects if o.type=='MESH' and o!=guide),key=lambda o:len(o.data.vertices));body.name='ClaqueteVerdeV3_TransferredSkin';bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
def bb(o):
 p=[v.co.copy() for v in o.data.vertices];lo=Vector(tuple(min(v[i] for v in p) for i in range(3)));hi=Vector(tuple(max(v[i] for v in p) for i in range(3)));return lo,hi
glo,ghi=bb(guide);blo,bhi=bb(body);gc=(glo+ghi)/2;bc=(blo+bhi)/2;gs=ghi-glo;bs=bhi-blo
# Warpa somente o guia descartável para coincidir com volume/pose-alvo; pesos acompanham vértices.
for v in guide.data.vertices:
 for k in range(3):v.co[k]=(v.co[k]-gc[k])*(bs[k]/max(gs[k],1e-6))+bc[k]
guide.data.update()
for group in guide.vertex_groups:body.vertex_groups.new(name=group.name)
mod=body.modifiers.new('NearestSurfaceWeightTransfer','DATA_TRANSFER');mod.object=guide;mod.use_vert_data=True;mod.data_types_verts={'VGROUP_WEIGHTS'};mod.vert_mapping='POLYINTERP_NEAREST';mod.layers_vgroup_select_src='ALL';mod.layers_vgroup_select_dst='NAME';mod.mix_mode='REPLACE';bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name)
if not body.vertex_groups:raise RuntimeError('Data Transfer não criou grupos de peso')
names=[m.name if m else '' for m in body.data.materials];prop=set()
for poly in body.data.polygons:
 if names[poly.material_index] in {'CV3_CLAPPER','CV3_STRIPE','CV3_HINGE'}:prop.update(poly.vertices)
spine=body.vertex_groups.get('Spine02') or body.vertex_groups.new(name='Spine02')
for i in prop:
 for g in body.vertex_groups:
  try:g.remove([i])
  except RuntimeError:pass
spine.add(list(prop),1,'REPLACE')
# Auditoria local: todo vértice da superfície precisa ter algum peso antes de exportar.
unweighted=sum(1 for v in body.data.vertices if not v.groups)
for v in body.data.vertices:v.co*=100
body.data.update();bpy.data.objects.remove(guide,do_unlink=True);body.parent=arm;body.matrix_parent_inverse=Matrix.Identity(4);am=body.modifiers.new('Armature','ARMATURE');am.object=arm;bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=arm;out.parent.mkdir(parents=True,exist_ok=True);bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_attributes=True)
data={'mesh':body.name,'donor':str(donor),'source':str(source),'boneCount':len(arm.data.bones),'vertexCount':len(body.data.vertices),'vertexGroups':len(body.vertex_groups),'unweightedVertices':unweighted,'propVerticesRigidSpine02':len(prop),'weightPolicy':'nearest-polygon interpolated transfer from aligned rigged Meshy humanoid; clapper override Spine02'};receipt.write_text(json.dumps(data,indent=2)+'\n');print(json.dumps(data))
