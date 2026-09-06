import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector, Matrix

source, destination = sys.argv[sys.argv.index('--') + 1:][:2]
out = Path(destination)
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(source).resolve()))
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
mesh.name = 'EscadaoCatMesh'
points = [v.co.copy() for v in mesh.data.vertices]
floor = min(v.z for v in points)
height = max(v.z for v in points) - floor
scale = .48 / height
clamp = lambda x: max(0., min(1., x))
smooth = lambda a, b, x: (lambda t: t*t*(3-2*t))(clamp((x-a)/(b-a)))
arm = bpy.data.armatures.new('EscadaoCatSkeleton')
rig = bpy.data.objects.new('EscadaoCatRig', arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
mesh.select_set(False)
bpy.ops.object.mode_set(mode='EDIT')
segments = {}
def bone(name, head, tail, parent='Root'):
    b = arm.edit_bones.new(name)
    b.head, b.tail = head, tail
    if parent:
        b.parent = arm.edit_bones[parent]
    segments[name] = (Vector(head), Vector(tail))
    return b
bone('Root', (0,0,0), (0,0,.1), None)
bone('Torso', (0,.06,.01), (0,-.27,.04))
bone('Head', (0,-.31,.08), (0,-.43,.16))
tail_path = [(0,.13,.087),(0,.25,.062),(0,.37,.085),(0,.46,.15),(0,.49,.245)]
for i in range(4):
    bone(f'Tail{i+1}',tail_path[i],tail_path[i+1])
legs = {}
for end in ['Front','Rear']:
    for side, sign in [('L',1),('R',-1)]:
        name = end+side
        vertices = [p for p in points if p.x*sign>0 and (p.y<-.09 if end=='Front' else p.y>=-.09) and p.z<floor+.045]
        paw = sum(vertices,Vector())/len(vertices)
        paw.z = floor+.028
        hip = Vector((paw.x,-.29 if end=='Front' else .09,.025 if end=='Front' else .05))
        knee = Vector((paw.x,paw.y+(.025 if end=='Front' else -.045),-.13))
        bone(name+'Upper',hip,knee)
        bone(name+'Lower',knee,paw)
        bone(name+'Paw',paw,paw+Vector((0,-.045,0)))
        legs[name] = {'hip':hip,'knee':knee,'paw':paw,'sign':1 if end=='Front' else -1,
                      'l1':(knee-hip).length,'l2':(paw-knee).length}
bpy.ops.object.mode_set(mode='OBJECT')
groups = {n:mesh.vertex_groups.new(name=n) for n in segments}
def distance(p, a, b):
    t = clamp((p-a).dot(b-a)/(b-a).length_squared)
    return (p-(a+(b-a)*t)).length
for vertex in mesh.data.vertices:
    p = vertex.co
    weights = {'Torso':1.}
    tail_weight = smooth(.14,.23,p.y)*smooth(.012,.065,p.z)
    if tail_weight>0:
        ds = [(distance(p,*segments[f'Tail{i+1}']),f'Tail{i+1}') for i in range(4)]
        ds.sort()
        tail = {name:1/max(.012,d)**2 for d,name in ds[:2]}
        total = sum(tail.values())
        weights = {'Torso':1-tail_weight,**{n:v/total*tail_weight for n,v in tail.items()}}
    elif p.z<-.03:
        name = ('Front' if p.y<-.09 else 'Rear')+('L' if p.x>=0 else 'R')
        leg_weight = 1-smooth(-.145,-.025,p.z)
        lower = 1-smooth(-.165,-.1,p.z)
        paw = 1-smooth(floor+.042,floor+.085,p.z)
        weights = {'Torso':1-leg_weight,name+'Upper':leg_weight*(1-lower),
                   name+'Lower':leg_weight*lower*(1-paw),name+'Paw':leg_weight*lower*paw}
    else:
        h = (1-smooth(-.405,-.29,p.y))*smooth(-.04,.05,p.z)
        weights = {'Torso':1-h,'Head':h}
    for name,value in weights.items():
        if value>1e-7:
            groups[name].add([vertex.index],value,'REPLACE')
mesh.parent = rig
modifier = mesh.modifiers.new('AnatomicalSkin','ARMATURE')
modifier.object = rig
for image in bpy.data.images:
    if image.size[0]>1024:
        image.scale(1024,1024)
scene = bpy.context.scene
scene.render.fps = 60
scene.frame_start = 1
actions = []
samples = []
def move_segment(name, head, tail):
    pb = rig.pose.bones[name]
    a,b = segments[name]
    rotation = (b-a).rotation_difference(tail-head) @ pb.bone.matrix_local.to_quaternion()
    pb.matrix = Matrix.LocRotScale(head,rotation,Vector((1,1,1)))
def key_pose(frame):
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        for path in ('location','rotation_quaternion','scale'):
            pb.keyframe_insert(path,frame=frame)
def rest():
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
for action_name, seconds, speed, duty, lift in [('idle',4.,0.,1.,0.),('walk',.6,.55,.62,.065),('run',.4,1.5,.38,.11)]:
    rest()
    rig.animation_data_create()
    action = bpy.data.actions.new(action_name)
    rig.animation_data.action = action
    duration = round(seconds*60)
    action['nominalSpeed'] = speed
    action['referenceHeight'] = .48
    for f in range(duration+1):
        phase = f/duration
        rest()
        chest = rig.pose.bones['Torso']
        breath = math.sin(phase*2*math.pi)
        chest.scale = (1+.012*breath,1,1+.006*breath) if speed==0 else (1,1,1)
        head = rig.pose.bones['Head']
        head.rotation_mode = 'XYZ'
        head.rotation_euler.z = .018*math.sin(phase*2*math.pi)
        for i in range(4):
            a,b = segments[f'Tail{i+1}']
            delta = Vector((.018*math.sin(phase*2*math.pi)*((i+1)/4)**1.5,0,0))
            prev = Vector((.018*math.sin(phase*2*math.pi)*(i/4)**1.5,0,0))
            move_segment(f'Tail{i+1}',a+prev,b+delta)
        row = {'action':action_name,'frame':f+1,'time':f/60,'feet':{}}
        for name, leg in legs.items():
            paw = leg['paw'].copy()
            planted = True
            if speed:
                offsets = {'FrontL':0.,'RearR':.5 if action_name=='walk' else 0.,'FrontR':.5,'RearL':0. if action_name=='walk' else .5}
                if action_name=='walk':
                    offsets = {'FrontL':0.,'RearL':.25,'FrontR':.5,'RearR':.75}
                t = (phase+offsets[name])%1
                excursion = speed/scale*seconds*duty
                if t<duty:
                    paw.y += -excursion/2+excursion*t/duty
                else:
                    u = (t-duty)/(1-duty)
                    paw.y += excursion/2-excursion*(u*u*(3-2*u))
                    paw.z += lift*math.sin(math.pi*u)**1.5
                    planted = False
                hip = leg['hip'].copy()
                if action_name=='run':
                    hip.z -= .04+.01*math.cos(phase*4*math.pi)
                else:
                    hip.z -= .025
                hip.y += .35*(paw.y-leg['paw'].y)
                delta = paw-hip
                length = delta.length
                l1,l2 = leg['l1'],leg['l2']
                if length > l1+l2+1e-5:
                    raise ValueError(f'{action_name} {name} quadro {f}: alvo fora do alcance {length-l1-l2:.6f}')
                span = min(length,l1+l2-1e-5)
                direction = delta.normalized()
                along = (l1*l1-l2*l2+span*span)/(2*span)
                bend = math.sqrt(max(0,l1*l1-along*along))
                normal = Vector((0,-direction.z,direction.y))*leg['sign']
                knee = hip+direction*along+normal*bend
                move_segment(name+'Upper',hip,knee)
                move_segment(name+'Lower',knee,paw)
                move_segment(name+'Paw',paw,paw+Vector((0,-.045,0)))
            row['feet'][name] = {'local':list(paw),'worldAtNominalSpeed':list((paw+Vector((0,-speed/scale*f/60,0)))*scale),'planted':planted}
        key_pose(f+1)
        samples.append(row)
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for key in curve.keyframe_points:
                        key.interpolation = 'LINEAR'
    actions.append(action)
    rig.animation_data.action = None
    track = rig.animation_data.nla_tracks.new()
    track.name = action_name
    strip = track.strips.new(action_name,1,action)
    strip.action_slot = action.slots[0]
    track.mute = True
rest()
scene.frame_set(1)
scene.frame_end = 241
bpy.ops.wm.save_as_mainfile(filepath=str((out/'cat-rig.blend').resolve()))
bpy.ops.export_scene.gltf(filepath=str((out/'cat-rig.glb').resolve()),export_format='GLB',export_apply=False,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_morph=False,export_cameras=False,export_lights=False,export_extras=True)
receipt = {'blender':bpy.app.version_string,'input':source,'meshTriangles':len(mesh.data.polygons),'heightSource':height,'normalizedHeight':.48,'forwardGLTF':'+Z','upGLTF':'+Y',
    'bones':{n:{'head':list(a),'tail':list(b)} for n,(a,b) in segments.items()},
    'clips':[{'name':a.name,'seconds':float(a.frame_range[1]-a.frame_range[0])/60,'nominalSpeed':a['nominalSpeed']} for a in actions],
    'samples':samples}
(out/'rig-motion.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps({'rig':str(out/'cat-rig.glb'),'clips':receipt['clips'],'bones':len(segments)}))
