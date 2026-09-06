"""Export the reviewed composition and its measured projection, privately."""
import importlib.util
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('rifles-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()
out = inv.OUT / 'm4-candidate'
assert out.resolve().is_relative_to(inv.OUT)
bpy.ops.wm.open_mainfile(filepath=str(out / 'm4-candidate.blend'), load_ui=False)
scene = bpy.context.scene
rig = bpy.data.objects['RIG_FP_ARMS']
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 2
for bone in rig.pose.bones:
    bone.rotation_mode = 'QUATERNION'
    for frame in [1, 2]:
        for prop in ['location', 'rotation_quaternion', 'scale']:
            bone.keyframe_insert(prop, frame=frame, group=bone.name)
action = rig.animation_data.action
action.name = 'idle'
track = rig.animation_data.nla_tracks.new()
track.name = 'idle'
track.strips.new('idle', 1, action)
rig.animation_data.action = None
scene.frame_set(1)
gun = bpy.data.objects['MINT_WEAPON_M4']
for name, point in [('SOCKET_MINT_MUZZLE',(-.497, .004, .085)),
                    ('SOCKET_MINT_SIGHT',(.14, .004, .155))]:
    socket = bpy.data.objects.new(name, None)
    scene.collection.objects.link(socket)
    socket.parent = gun
    socket.location = point
bpy.context.view_layer.update()
record = {'status':'pose candidate, actions and Game visual validation pending',
          'camera': {'vfov':74,'aspect':4/3}, 'meshes':{}, 'sockets':{}}
camera = scene.camera
inverse = camera.matrix_world.inverted()
dg = bpy.context.evaluated_depsgraph_get()
for obj in scene.objects:
    if obj.type == 'MESH':
        ev = obj.evaluated_get(dg)
        mesh = ev.to_mesh()
        points = [inverse @ ev.matrix_world @ v.co for v in mesh.vertices]
        record['meshes'][obj.name] = {'vertices':len(points),
            'camera_points':[list(p) for p in points]}
        ev.to_mesh_clear()
    if obj.name.startswith('SOCKET_MINT_'):
        p = world_to_camera_view(scene, camera, obj.matrix_world.translation)
        record['sockets'][obj.name] = {'screen':[p.x,1-p.y], 'camera':list(inverse @ obj.matrix_world.translation)}
(out / 'blender-projection.json').write_text(json.dumps(record)+'\n')
bpy.ops.export_scene.gltf(filepath=str(out / 'm4-baked-runtime.glb'), export_format='GLB',
    export_cameras=True, export_lights=False, export_animations=True,
    export_animation_mode='NLA_TRACKS', export_merge_animation='NLA_TRACK',
    export_skins=True, export_materials='EXPORT', export_image_format='WEBP',
    export_image_quality=82, export_yup=True)
for width, height in [(1152,768),(1024,576)]:
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.filepath = str(out / f'idle-{width}x{height}.png')
    bpy.ops.render.render(write_still=True)
camera.location = (.26,-.20,1.50)
camera.rotation_euler = (Vector((-.078,-.22,1.51))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x, scene.render.resolution_y = 768,576
scene.render.filepath = str(out / 'trigger-close.png')
bpy.ops.render.render(write_still=True)
print('M4_EXPORT', inv.digest(out / 'm4-baked-runtime.glb'))
