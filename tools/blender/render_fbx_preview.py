"""Render temporário de uma fonte FBX para revisão de procedência."""
import sys
from pathlib import Path
import bpy
from mathutils import Vector

src, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
bpy.ops.import_scene.fbx(filepath=str(src))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector(tuple(min(p[i] for p in pts) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in pts) for i in range(3)))
center = (lo + hi) / 2
radius = max((hi - lo).length * .7, 1)

def face(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()

bpy.ops.object.camera_add(location=center + Vector((radius * 1.1, -radius * 1.8, radius * .55)))
cam = bpy.context.object
cam.data.lens = 55
face(cam, center)
bpy.context.scene.camera = cam
for pos, energy in ((center + Vector((radius, -radius, radius * 1.7)), 900), (center + Vector((-radius, -radius *.3, radius)), 500)):
    bpy.ops.object.light_add(type='AREA', location=pos)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = radius * 1.3
    face(light, center)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1000
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(out)
bpy.ops.render.render(write_still=True)
