"""Idle/walk/crouch/death com piso visível para conferir contato e prop rígido."""
import pathlib,sys,bpy
from mathutils import Vector
source=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve(); out=pathlib.Path(sys.argv[sys.argv.index('--')+2]).resolve(); out.mkdir(parents=True,exist_ok=True)
def point(o,t): o.rotation_euler=(t-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(source),import_shading='NORMALS')
scene=bpy.context.scene; arm=next(o for o in scene.objects if o.type=='ARMATURE'); helpers={b.custom_shape for b in arm.pose.bones if b.custom_shape}; meshes=[o for o in scene.objects if o.type=='MESH' and o not in helpers]
verts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]; lo=Vector(tuple(min(v[i] for v in verts) for i in range(3))); hi=Vector(tuple(max(v[i] for v in verts) for i in range(3))); center=(lo+hi)/2; span=hi-lo
scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=scene.render.resolution_y=640; scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'; scene.world=bpy.data.worlds.new('CVPoseWorld'); scene.world.color=(.018,.022,.020); scene.view_settings.look='AgX - Medium High Contrast'
# Piso quadriculado discreto torna pé flutuante visível sem confundir a silhueta.
bpy.ops.mesh.primitive_plane_add(size=8,location=(0,0,0)); floor=bpy.context.object; mat=bpy.data.materials.new('CVPoseFloor'); mat.diffuse_color=(.055,.065,.06,1); floor.data.materials.append(mat)
bpy.ops.object.camera_add(); cam=bpy.context.object; cam.data.type='ORTHO'; cam.data.ortho_scale=max(span)*1.30; cam.location=center+Vector((0,-4,.15)); point(cam,center+Vector((0,0,-.03))); scene.camera=cam
for loc,energy,size in [(center+Vector((-2.2,-2.5,3.2)),650,4),(center+Vector((2.4,-.8,1.8)),350,3),(center+Vector((0,2,2.2)),260,2.5)]: bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.data.energy=energy; light.data.size=size; point(light,center)
arm.animation_data_create()
for name,frame in [('idle',20),('walk',15),('crouch',100),('death',30)]:
 action=bpy.data.actions.get(name)
 if action is None: raise RuntimeError('ação ausente '+name)
 arm.animation_data.action=action; scene.frame_set(frame); bpy.context.view_layer.update(); scene.render.filepath=str(out/f'claquete-verde-{name}.png'); bpy.ops.render.render(write_still=True)
print('CLAQUETE_VERDE_POSES='+str(out))
