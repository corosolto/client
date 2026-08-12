"""Render transparente 150px com câmera fixa para medir largura servida."""
import pathlib,sys,bpy
from mathutils import Vector
source=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve(); out=pathlib.Path(sys.argv[sys.argv.index('--')+2]).resolve()
def point(o,t): o.rotation_euler=(t-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(source),import_shading='NORMALS')
scene=bpy.context.scene; arms=[o for o in scene.objects if o.type=='ARMATURE']; helpers={b.custom_shape for a in arms for b in a.pose.bones if b.custom_shape}; meshes=[o for o in scene.objects if o.type=='MESH' and o not in helpers]
verts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]; lo=Vector(tuple(min(v[i] for v in verts) for i in range(3))); hi=Vector(tuple(max(v[i] for v in verts) for i in range(3))); center=(lo+hi)/2
scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=150; scene.render.resolution_y=150; scene.render.resolution_percentage=100; scene.render.film_transparent=True; scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'
bpy.ops.object.camera_add(location=(center.x,center.y-4,center.z)); cam=bpy.context.object; cam.data.type='ORTHO'; cam.data.ortho_scale=2.05; point(cam,center); scene.camera=cam
for loc,energy,size in [(center+Vector((-2,-2,3)),950,4),(center+Vector((2,-1,2)),550,3)]: bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.data.energy=energy; light.data.size=size; point(light,center)
out.parent.mkdir(parents=True,exist_ok=True); scene.render.filepath=str(out); bpy.ops.render.render(write_still=True); print('MICRO_150='+str(out))
