"""Reauthor SCAR with its public body, complete magazine and side handle."""
from __future__ import annotations
import bmesh, hashlib, json, sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector

M4_SHA = 'e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe'
SCAR_SHA = '16f0bc90aba6cb1c236e95e45acd51d6e9f1fdf6fd328b313ab46d033eebd99f'

def arg(name):
    av=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    return Path(next((v.split('=',1)[1] for v in av if v.startswith(f'--{name}=')), '')).expanduser().resolve()
def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda:f.read(1<<20),b''):h.update(b)
    return h.hexdigest()

def components(mesh):
    adj=[set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a,b=edge.vertices;adj[a].add(b);adj[b].add(a)
    seen=set(); out=[]
    for start in range(len(mesh.vertices)):
        if start in seen:continue
        stack=[start];seen.add(start);group=[]
        while stack:
            i=stack.pop();group.append(i)
            for nxt in adj[i]:
                if nxt not in seen:seen.add(nxt);stack.append(nxt)
        out.append(group)
    return out

def subset(source, keep, name):
    result=source.copy();result.name=name
    bm=bmesh.new();bm.from_mesh(result)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context='VERTS')
    bm.to_mesh(result);bm.free();return result

def without(source, remove, name):
    result=source.copy();result.name=name
    bm=bmesh.new();bm.from_mesh(result)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index in remove],context='VERTS')
    bm.to_mesh(result);bm.free();return result

m4=arg('m4-source');scar=arg('scar-source');out=arg('output-dir')
if sha(m4)!=M4_SHA or sha(scar)!=SCAR_SHA:raise RuntimeError('fonte M4/SCAR ausente ou divergente')
if not out.is_absolute() or 'worktrees/viewmodels-catalog-final' in str(out):raise RuntimeError('saída deve ficar fora do Git')
out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(m4),load_ui=False)
scene=bpy.context.scene;gun=bpy.data.objects['MINT_WEAPON_M4'];mag=bpy.data.objects['MINT_WEAPON_M4_MAG'];package=bpy.data.objects['VM_PACKAGE_M4']
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(scar))
objs=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
if len(objs)!=1:raise RuntimeError(f'SCAR deveria ter uma malha; encontrou {len(objs)}')
source=objs[0].data
mag_ids=set();handle_ids=set()
for group in components(source):
    pts=[source.vertices[i].co for i in group]
    mn=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts)))
    mx=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts)))
    if mn.x>=-0.015 and mx.x<=0.105 and mx.z<=-0.005 and mn.z>=-0.155:
        mag_ids.update(group)
    if mn.x>=-0.080 and mx.x<=0.005 and mx.y<=-0.008 and mn.z>=0.060 and mx.z<=0.095:
        handle_ids.update(group)
if not (200<=len(mag_ids)<=900):raise RuntimeError(f'seleção integral do pente não comprovada: {len(mag_ids)} vértices')
if not (8<=len(handle_ids)<=120):raise RuntimeError(f'comando lateral não comprovado: {len(handle_ids)} vértices')
body_mesh=without(source,mag_ids|handle_ids,'MINT_WEAPON_SCAR_BODY')
mag_mesh=subset(source,mag_ids,'MINT_WEAPON_SCAR_MAG_MESH')
handle_mesh=subset(source,handle_ids,'MINT_CHARGING_SCAR_MESH')
# 0,90 m visuais contra a escala constante 0,841643 dos tracks AR.
scale_factor=(0.90/0.998046875)/0.8416434526443481
for mesh in (body_mesh,mag_mesh,handle_mesh):mesh.transform(Matrix.Scale(scale_factor,4))
materials=list(source.materials)
gun.data=body_mesh;gun.name='MINT_WEAPON_SCAR'
mag.data=mag_mesh;mag.name='MINT_WEAPON_SCAR_MAG'
for mesh in (body_mesh,mag_mesh,handle_mesh):
    mesh.materials.clear()
    for material in materials:mesh.materials.append(material)
handle=bpy.data.objects.new('MINT_CHARGING_SCAR',handle_mesh);scene.collection.objects.link(handle);handle.parent=gun
handle.location=(0,0,0);handle.rotation_mode='QUATERNION'
# A alavanca reciprocante corre para trás (+X, cano em -X) no tiro.
for frame,x in [(0,0.0),(3,0.045/gun.scale.x),(8,0.0)]:
    scene.frame_set(frame);handle.location=(x,0,0);handle.keyframe_insert('location',frame=frame)
action=handle.animation_data.action;action.name='shoot__MINT_CHARGING_SCAR'
track=handle.animation_data.nla_tracks.new();track.name='shoot';track.strips.new('shoot',0,action);handle.animation_data.action=None
bpy.data.objects.remove(objs[0],do_unlink=True)
# sockets no corpo completo; -X boca, +X culatra.
corners=[Vector(v) for v in gun.bound_box];mn=Vector(tuple(min(v[i] for v in corners) for i in range(3)));mx=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
muzzle=next((c for c in gun.children if c.name=='SOCKET_MINT_MUZZLE'),None);sight=next((c for c in gun.children if c.name=='SOCKET_MINT_SIGHT'),None)
if not muzzle or not sight:raise RuntimeError('sockets herdados ausentes')
muzzle.location=(mn.x,(mn.y+mx.y)/2,(mn.z+mx.z)*.52)
sight.location=(mx.x-(mx.x-mn.x)*.26,(mn.y+mx.y)/2,mx.z-0.045/gun.scale.x)
package.name='VM_PACKAGE_SCAR';scene.camera.name='VIEWMODEL_CAMERA'
scene.frame_set(72);package.matrix_world=Matrix.Identity(4);bpy.context.view_layer.update()
blend=out/'scar-final.blend';glb=out/'scar-baked-runtime.glb'
bpy.ops.wm.save_as_mainfile(filepath=str(blend),check_existing=False)
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_cameras=True,export_lights=False,export_animations=True,export_animation_mode='NLA_TRACKS',export_merge_animation='NLA_TRACK',export_skins=True,export_materials='EXPORT',export_image_format='WEBP',export_image_quality=82,export_yup=True,export_force_sampling=True,export_optimize_animation_size=True,export_optimize_animation_keep_anim_armature=True,export_optimize_animation_keep_anim_object=True,export_frame_range=False)
report={'schemaVersion':1,'weapon':'scar','ready':False,'sources':{'arHandsActions':M4_SHA,'body':SCAR_SHA},'selection':{'magVertices':len(mag_ids),'handleVertices':len(handle_ids)},'products':{'blend':{'bytes':blend.stat().st_size,'sha256':sha(blend)},'glb':{'bytes':glb.stat().st_size,'sha256':sha(glb)}},'mechanism':'complete detachable magazine and reciprocating side charging handle'}
(out/'build.json').write_text(json.dumps(report,indent=2)+'\n');print('SCAR_FINAL_OK '+json.dumps(report,separators=(',',':')))
