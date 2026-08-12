"""Turnaround 640px com exposição neutra para leitura fiel do dourado e dos props."""
import pathlib, sys
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
source = pathlib.Path(args[0]).resolve()
out_dir = pathlib.Path(args[1]).resolve()
out_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading='NORMALS')
arms = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
helpers = {b.custom_shape for a in arms for b in a.pose.bones if b.custom_shape}
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o not in helpers]
verts = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
lo = Vector(tuple(min(v[i] for v in verts) for i in range(3)))
hi = Vector(tuple(max(v[i] for v in verts) for i in range(3)))
center = (lo + hi) / 2

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.look = 'AgX - Medium High Contrast'
if scene.world is None:
    scene.world = bpy.data.worlds.new('MicrofonildoWorld')
scene.world.color = (0.018, 0.020, 0.024)

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 2.05
scene.camera = camera

def point(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()

lights = []
for energy, size in ((500, 4.0), (220, 3.0)):
    bpy.ops.object.light_add(type='AREA')
    light = bpy.context.object
    light.data.energy = energy
    light.data.size = size
    lights.append(light)

for label, direction, side in (
    ('front', Vector((0, -1, 0)), Vector((-1, 0, 0))),
    ('left', Vector((-1, 0, 0)), Vector((0, -1, 0))),
    ('back', Vector((0, 1, 0)), Vector((1, 0, 0))),
):
    camera.location = center + direction * 4
    point(camera, center)
    lights[0].location = center + direction * 2.5 + side * 1.6 + Vector((0, 0, 2.4))
    lights[1].location = center - direction * 1.5 - side * 1.2 + Vector((0, 0, 1.2))
    point(lights[0], center)
    point(lights[1], center)
    scene.render.filepath = str(out_dir / f'microfonildo-final-opt-{label}.png')
    bpy.ops.render.render(write_still=True)
