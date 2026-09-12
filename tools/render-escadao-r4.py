import bpy, sys, json, math, hashlib
from pathlib import Path
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
source, output = args[:2]
out = Path(output)
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(source).resolve()))
if len(args)>2:
    rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    action = next(a for a in bpy.data.actions if a.name == args[2])
    rig.animation_data_create()
    for track in rig.animation_data.nla_tracks:
        track.mute = True
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    bpy.context.scene.frame_set(int(args[3]))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and len(o.data.materials) and not o.hide_render]
coords = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector(tuple(min(c[i] for c in coords) for i in range(3)))
hi = Vector(tuple(max(c[i] for c in coords) for i in range(3)))
center = (lo + hi) / 2
size = max(hi - lo)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 12 if len(args)>2 else 24
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 4
scene.render.resolution_x = 640 if len(args)>2 else 800
scene.render.resolution_y = scene.render.resolution_x
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('StudioWorld')
scene.world.use_nodes = True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value = (.32, .36, .4, 1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value = .45
scene.view_settings.view_transform = 'AgX'
for name, xyz, energy, radius in [('Key', (2,-3,4), 250, 3), ('Fill',(-3,-1,2),110,3), ('Rim',(1,3,3),160,2)]:
    bpy.ops.object.light_add(type='AREA', location=center + Vector(xyz)*size)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy * size * size
    light.data.shape = 'DISK'
    light.data.size = radius * size
    light.rotation_euler = (center-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = size * 1.35
scene.camera = camera
receipt = {'source': source, 'sourceSha256':hashlib.sha256(Path(source).read_bytes()).hexdigest(), 'action':args[2] if len(args)>2 else None, 'frame':scene.frame_current, 'fps':scene.render.fps, 'blender': bpy.app.version_string, 'engine':'CYCLES CPU', 'boundsBlender': [list(lo),list(hi)], 'meshes':[{'name':o.name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons),'modifiers':[m.type for m in o.modifiers]} for o in meshes], 'images':[]}
views = [('front', (1,-2, .65)), ('side', (3,0,.35)), ('rear',(-1,2,.6))]
if len(args)>4:
    views = [v for v in views if v[0] in args[4].split(',')]
for name, direction in views:
    camera.location = center + Vector(direction).normalized()*size*4
    camera.rotation_euler = (center-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath = str(out / (name+'.png'))
    bpy.ops.render.render(write_still=True)
    receipt['images'].append(scene.render.filepath)
(out/'inspection.json').write_text(json.dumps(receipt,indent=2))
