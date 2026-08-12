"""Front/left/back transparentes em canvas fixo 150px."""
import pathlib,sys,bpy
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]; source=pathlib.Path(args[0]).resolve(); outdir=pathlib.Path(args[1]).resolve(); outdir.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(source),import_shading='NORMALS')
arms=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']; helpers={b.custom_shape for a in arms for b in a.pose.bones if b.custom_shape}; meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o not in helpers]
v=[o.matrix_world@p.co for o in meshes for p in o.data.vertices]; lo=Vector(tuple(min(q[i] for q in v) for i in range(3))); hi=Vector(tuple(max(q[i] for q in v) for i in range(3))); center=(lo+hi)/2
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=scene.render.resolution_y=150; scene.render.resolution_percentage=100; scene.render.film_transparent=True; scene.render.image_settings.file_format='PNG'; scene.view_settings.look='AgX - Medium High Contrast'
def point(o,t): o.rotation_euler=(t-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(); cam=bpy.context.object; cam.data.type='ORTHO'; cam.data.ortho_scale=2.02; scene.camera=cam
lights=[]
for energy,size in ((500,4),(220,3)): bpy.ops.object.light_add(type='AREA'); lights.append(bpy.context.object); lights[-1].data.energy=energy; lights[-1].data.size=size
for label,d,s in [('front',Vector((0,-1,0)),Vector((-1,0,0))),('left',Vector((-1,0,0)),Vector((0,-1,0))),('back',Vector((0,1,0)),Vector((1,0,0)))]:
    cam.location=center+d*4; point(cam,center); lights[0].location=center+d*2.5+s*1.5+Vector((0,0,2.2)); lights[1].location=center-d*1.5-s+Vector((0,0,1)); point(lights[0],center); point(lights[1],center); scene.render.filepath=str(outdir/f'{label}.png'); bpy.ops.render.render(write_still=True)
