import bpy, sys, json, math, hashlib
from pathlib import Path
from mathutils import Vector

source, output = sys.argv[sys.argv.index('--')+1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 60
bpy.ops.import_scene.gltf(filepath=str(Path(source).resolve()))
rig = next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
mesh = next(o for o in bpy.context.scene.objects if o.type=='MESH')
rig.animation_data_create()
for track in rig.animation_data.nla_tracks:
    track.mute = True
rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.matrix_basis.identity()
bpy.context.view_layer.update()
rest = [mesh.matrix_world@v.co for v in mesh.data.vertices]
floor = min(p.z for p in rest)
scale = .48/(max(p.z for p in rest)-floor)
feet = {name: [v.index for v in mesh.data.vertices if rest[v.index].z<floor+.033 and any(mesh.vertex_groups[g.group].name==name+'Paw' and g.weight>.99 for g in v.groups)] for name in ['FrontL','FrontR','RearL','RearR']}
torso = [i for i,p in enumerate(rest) if -.25<p.y<0 and -.05<p.z<.1]
tail_tip = [i for i,p in enumerate(rest) if p.y>.43 and p.z>.1]
scene = bpy.context.scene
fps = scene.render.fps
results = []
for name, duration, speed, duty in [('idle',4,0,1),('walk',.6,.55,.62),('run',.4,1.5,.38)]:
    action = next(a for a in bpy.data.actions if a.name==name)
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    n = round(duration*fps)
    samples=[]
    for i in range(n+1):
        scene.frame_set(round(action.frame_range[0])+i)
        evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        vs=[evaluated.matrix_world@v.co for v in evaluated.data.vertices]
        row={'t':i/fps,'minimumHeightMeters':(min(p.z for p in vs)-floor)*scale,
             'torsoWidthMeters':(max(vs[j].x for j in torso)-min(vs[j].x for j in torso))*scale,
             'tailTipXMeanMeters':sum(vs[j].x for j in tail_tip)/len(tail_tip)*scale,'feet':{}}
        for foot,indices in feet.items():
            center = sum((vs[j] for j in indices),Vector())/len(indices)
            center += Vector((0,-speed/scale*i/fps,0))
            offsets = {'FrontL':0.,'RearL':.25,'FrontR':.5,'RearR':.75} if name=='walk' else {'FrontL':0.,'RearR':0.,'FrontR':.5,'RearL':.5}
            phase=(i/max(n,1)+offsets[foot])%1
            row['feet'][foot]={'worldMeters':list(center*scale),'planted':speed==0 or phase<duty}
        samples.append(row)
    planted_speeds=[]
    for a,b in zip(samples,samples[1:]):
        for foot in feet:
            if a['feet'][foot]['planted'] and b['feet'][foot]['planted']:
                delta = Vector(b['feet'][foot]['worldMeters'])-Vector(a['feet'][foot]['worldMeters'])
                planted_speeds.append(delta.length*fps)
    scene.frame_set(round(action.frame_range[0]))
    first = [mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world@v.co for v in mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices]
    scene.frame_set(round(action.frame_range[1]))
    last = [mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world@v.co for v in mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices]
    results.append({'name':name,'frameRange':list(action.frame_range),'fps':fps,'nominalSpeed':speed,'sampleCount':len(samples),'loopMaxVertexDeltaMeters':max((a-b).length for a,b in zip(first,last))*scale,
        'torsoWidthExcursionMeters':max(r['torsoWidthMeters'] for r in samples)-min(r['torsoWidthMeters'] for r in samples),
        'tailTipLateralExcursionMeters':max(r['tailTipXMeanMeters'] for r in samples)-min(r['tailTipXMeanMeters'] for r in samples),
        'minHeightMeters':min(r['minimumHeightMeters'] for r in samples),'maxPlantedFootSpeedMetersPerSecond':max(planted_speeds,default=0),'samples':samples})
receipt={'source':source,'sourceSha256':hashlib.sha256(Path(source).read_bytes()).hexdigest(),'blender':bpy.app.version_string,'skinBones':len(rig.pose.bones),'pawVertexCounts':{k:len(v) for k,v in feet.items()},'clips':results}
Path(output).write_text(json.dumps(receipt,indent=2))
print(json.dumps({**receipt,'clips':[{k:v for k,v in r.items() if k!='samples'} for r in results]}))
