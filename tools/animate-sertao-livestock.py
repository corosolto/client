"""Blender CLI: measured Mint livestock, meter scale, +Z glTF, local skinned clips.
Run from repository root: Blender -b -t 4 --python tools/animate-sertao-livestock.py
"""
import bpy, math, json, os, hashlib, heapq
from mathutils import Vector, Matrix
ROOT=os.getcwd()
ART=os.path.join(ROOT,'artifacts/sertao-astra/mint-livestock/animation')
RAW=os.path.join(ROOT,'artifacts/sertao-astra/mint-livestock/raw/caatinga-village-animals--vd7azjz400t2sy4g2h4z14ff318dx0mb')
OUT=os.path.join(ROOT,'public/models/ambient')
os.makedirs(ART,exist_ok=True);os.makedirs(OUT,exist_ok=True)
TAU=math.tau
CONFIG=[dict(id='galinha',raw='01-adult-hen',size=.42,yaw=-math.pi/2,step=.048,lift=.012,duration=.8,hip=.105,knee=.057,ankle=.013,leg_y=-.006,leg_x=.043),dict(id='pintinho',raw='02-baby-chick',size=.15,yaw=0,step=.016,lift=.004,duration=.56,hip=.036,knee=.019,ankle=.004,leg_y=.014,leg_x=.022,ratio=.65),dict(id='cabra',raw='03-caatinga-goat',size=1.1,yaw=0,step=.16,lift=.037,duration=1.4,hip=.53,knee=.255,ankle=.04)]
def smooth(a,b,x):
 t=max(0.,min(1.,(x-a)/(b-a)));return t*t*(3-2*t)
def curves(action):
 if hasattr(action,'fcurves'):return list(action.fcurves)
 return [fc for layer in action.layers for strip in layer.strips for cb in strip.channelbags for fc in cb.fcurves]
def setup_render(o,cfg):
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8
 scene.render.resolution_x=400;scene.render.resolution_y=400;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('PreviewWorld');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.38,.42,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
 scene.view_settings.view_transform='Standard'
 bounds=[o.matrix_world@Vector(c) for c in o.bound_box];center=sum(bounds,Vector())/8;extent=max(o.dimensions)
 for pos,power in [((2,-3,4),550),((-3,1,3),230)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(pos)*extent);lamp=bpy.context.object;lamp.data.energy=power*extent*extent;lamp.data.size=extent*3;lamp.rotation_euler=(center-lamp.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=center+Vector((2.8,-2.2,.9))*extent);cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent*1.2;scene.camera=cam
 bpy.ops.mesh.primitive_plane_add(size=extent*200,location=(0,0,-.0005));plane=bpy.context.object;plane.name='PREVIEW_GROUND';mat=bpy.data.materials.new('PreviewGround');mat.diffuse_color=(.22,.25,.29,1);plane.data.materials.append(mat)
 return scene

def import_model(cfg):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 source=os.path.join(RAW,cfg['raw']+'.glb');bpy.ops.import_scene.gltf(filepath=source)
 o=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.context.view_layer.objects.active=o
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 rotation=Matrix.Rotation(cfg['yaw'],3,'Z')
 for v in o.data.vertices:v.co=rotation@v.co
 o.data.update()
 extent=o.dimensions.y if cfg['id']=='cabra' else o.dimensions.z
 factor=cfg['size']/extent
 for v in o.data.vertices:v.co*=factor
 floor=min(v.co.z for v in o.data.vertices)
 for v in o.data.vertices:v.co.z-=floor
 o.name='Sertao_'+cfg['id'];o.data.name=o.name+'_Geometry'
 if cfg.get('ratio'):
  open(os.path.join(ART,'chick-original-geometry.json'),'w').write(json.dumps({'vertices':[list(v.co) for v in o.data.vertices],'faces':[list(p.vertices) for p in o.data.polygons]}))
  # Solda apenas duplicatas de UV antes de colapsar; UVs continuam nos loops.
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.000001);bpy.ops.object.mode_set(mode='OBJECT')
  mod=o.modifiers.new('ChickBudget','DECIMATE');mod.ratio=cfg['ratio'];bpy.ops.object.modifier_apply(modifier=mod.name)
 if cfg.get('ratio'):
  open(os.path.join(ART,'chick-reduced-geometry.json'),'w').write(json.dumps({'vertices':[list(v.co) for v in o.data.vertices],'faces':[list(p.vertices) for p in o.data.polygons]}))
 floor=min(v.co.z for v in o.data.vertices)
 for v in o.data.vertices:v.co.z-=floor
 for p in o.data.polygons:p.use_smooth=True
 mat=o.data.materials[0];nodes=mat.node_tree.nodes;bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
 tex=next(n for n in nodes if n.type=='TEX_IMAGE' and n.image and n.image.name.startswith('Color_'))
 image=tex.image;image.scale(1024,1024)
 for n in list(nodes):
  if n not in [tex,bsdf] and n.type!='OUTPUT_MATERIAL':nodes.remove(n)
 bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['Roughness'].default_value=.9
 mat.use_backface_culling=True
 o['source']='Mint own generated output: '+cfg['raw'];o['source_sha256']=hashlib.sha256(open(source,'rb').read()).hexdigest();o['forward']='+Z';o['up']='+Y';o['units']='meters';o['gait_speed_mps']=cfg['step']/(.6*cfg['duration'])
 return o

def rig_model(o,cfg):
 goat=cfg['id']=='cabra';specs=[]
 for side,x in [('L',-1),('R',1)]:
  for end,y in ([('F',-.205),('B',.39)] if goat else [('',cfg['leg_y'])]):
   label=end+side;xpos=(.071*x+.010 if goat else cfg['leg_x']*x)
   hip=Vector((xpos,(-.19 if end=='F' else .32) if goat else y+.016,cfg['hip']))
   knee=Vector((xpos,(-.185 if end=='F' else .427) if goat else y+.005,cfg['knee']))
   ankle=Vector((xpos,y,cfg['ankle']));ground=Vector((xpos,y,0))
   specs.append(dict(label=label,hip=hip,knee=knee,ankle=ankle,ground=ground,phase=({'FL':0,'BR':.5,'FR':.25,'BL':.75}[label] if goat else (0 if side=='L' else .5))))
 arm=bpy.data.armatures.new(o.name+'_Skeleton');rig=bpy.data.objects.new(o.name+'_Rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);o.select_set(False);bpy.ops.object.mode_set(mode='EDIT')
 root=arm.edit_bones.new('Body');root.head=(0,0,cfg['hip']);root.tail=(0,0,cfg['hip']+.1)
 head=arm.edit_bones.new('Head');head.head=(0,-.29,.59) if goat else ((0,-.075,.235) if cfg['id']=='galinha' else (0,-.032,.080));head.tail=head.head+Vector((0,-.03,.07));head.parent=root
 for s in specs:
  for name,a,b in [('Upper_'+s['label'],s['hip'],s['knee']),('Lower_'+s['label'],s['knee'],s['ankle']),('Foot_'+s['label'],s['ground'],s['ground']+Vector((0,-(.07 if goat else cfg['size']*.13),0)))]:
   bone=arm.edit_bones.new(name);bone.head=a;bone.tail=b;bone.parent=root
 bpy.ops.object.mode_set(mode='OBJECT')
 groups={b.name:o.vertex_groups.new(name=b.name) for b in arm.bones}
 # Distância sobre a malha evita atribuir dedos que cruzam X=0 à pata oposta.
 coords=[];weld={};mapping=[]
 for v in o.data.vertices:
  key=tuple(round(c,6) for c in v.co)
  if key not in weld:weld[key]=len(coords);coords.append(v.co.copy())
  mapping.append(weld[key])
 graph=[{} for _ in coords]
 for poly in o.data.polygons:
  ids=list(poly.vertices)
  for i,k in zip(ids,ids[1:]+ids[:1]):
   a,b=mapping[i],mapping[k]
   if a!=b:graph[a][b]=graph[b][a]=(coords[a]-coords[b]).length
 distances={}
 for spec in specs:
  seed=min(range(len(coords)),key=lambda i:(coords[i]-spec['ankle']).length)
  ds=[math.inf]*len(coords);ds[seed]=0;queue=[(0,seed)]
  while queue:
   d,i=heapq.heappop(queue)
   if d!=ds[i]:continue
   for j,length in graph[i].items():
    nd=d+length
    if nd<ds[j]:ds[j]=nd;heapq.heappush(queue,(nd,j))
  distances[spec['label']]=ds
 for v in o.data.vertices:
  x,y,z=v.co
  scores=[distances[spec['label']][mapping[v.index]] for spec in specs]
  if not math.isfinite(min(scores)):scores=[(v.co-spec['ankle']).length for spec in specs]
  s=specs[min(range(len(specs)),key=lambda i:scores[i])]
  if goat:
   leg=1-smooth(.31,.56,z);knee=cfg['knee'];foot=1-smooth(.055,.09,z)
   along=max(0,min(1,(z-cfg['knee'])/(cfg['hip']-cfg['knee'])))
   axis=s['knee'].lerp(s['hip'],along)
   radius=math.hypot(x-axis.x,y-axis.y)
   leg*=1-smooth(.055,.115,radius)
   head=smooth(.50,.68,z)*(1-smooth(-.27,-.12,y))
  else:
   leg=1-smooth(cfg['hip']*.73,cfg['hip']*1.28,z);knee=cfg['knee'];foot=1-smooth(cfg['ankle']*1.5,cfg['ankle']*2.5,z)
   head=smooth(.21,.30,z)*(1-smooth(-.055,-.005,y)) if cfg['id']=='galinha' else smooth(.070,.105,z)*(1-smooth(-.025,.005,y))
  lower=1-smooth(knee*.80,knee*1.2,z)
  weights={'Foot_'+s['label']:leg*foot,'Lower_'+s['label']:leg*(1-foot)*lower,'Upper_'+s['label']:leg*(1-foot)*(1-lower),'Head':(1-leg)*head,'Body':(1-leg)*(1-head)}
  for name,w in weights.items():
   if w>0:groups[name].add([v.index],w,'REPLACE')
 mod=o.modifiers.new('LivestockSkin','ARMATURE');mod.object=rig;o.parent=rig
 return rig,specs

def aim_bone(rig,name,start,end):
 bone=rig.data.bones[name];rest=bone.tail_local-bone.head_local;rotation=rest.rotation_difference(end-start)
 rig.pose.bones[name].matrix=Matrix.Translation(start)@rotation.to_matrix().to_4x4()@bone.matrix_local.to_quaternion().to_matrix().to_4x4()

def knee_ik(hip,ankle,rest_knee,rest_ankle,rest_hip):
 l1=(rest_knee-rest_hip).length;l2=(rest_ankle-rest_knee).length;d=(ankle-hip).length
 axis=(ankle-hip).normalized();a=(l1*l1-l2*l2+d*d)/(2*d);h=math.sqrt(max(0,l1*l1-a*a))
 perp=Vector((0,-axis.z,axis.y));base=hip+axis*a
 candidates=[base+perp*h,base-perp*h]
 return min(candidates,key=lambda q:(q-rest_knee).length)

def animate(rig,specs,cfg):
 actions={}
 for clip,duration in [('Walk',cfg['duration']),('Idle',3.2)]:
  rig.animation_data_create();rig.animation_data.action=None
  for pb in rig.pose.bones:pb.matrix_basis.identity();pb.rotation_mode='QUATERNION'
  end=round(duration*30);bpy.context.scene.render.fps=30
  for frame in range(end+1):
   t=frame/end;bpy.context.scene.frame_set(frame)
   sink=(.018 if cfg['id']=='cabra' else .005 if cfg['id']=='galinha' else .0015) if clip=='Walk' else 0
   rig.pose.bones['Body'].location.z=-sink
   bpy.context.view_layer.update()
   for s in specs:
    dy=dz=0
    if clip=='Walk':
     phase=(t+s['phase'])%1
     if phase<.6:dy=cfg['step']*(phase/.6-.5)
     else:
      swing=(phase-.6)/.4;dy=cfg['step']*(.5-smooth(0,1,swing));dz=cfg['lift']*math.sin(math.pi*swing)**2
    offset=Vector((0,dy,dz));ankle=s['ankle']+offset;hip=s['hip']-Vector((0,0,sink));knee=knee_ik(hip,ankle,s['knee'],s['ankle'],s['hip'])
    aim_bone(rig,'Upper_'+s['label'],hip,knee);aim_bone(rig,'Lower_'+s['label'],knee,ankle)
    pb=rig.pose.bones['Foot_'+s['label']];pb.matrix=Matrix.Translation(offset)@rig.data.bones[pb.name].matrix_local
   head=rig.pose.bones['Head']
   from mathutils import Quaternion
   head.rotation_quaternion=Quaternion((1,0,0),(.025 if clip=='Walk' else .035)*math.sin(TAU*t))
   for pb in rig.pose.bones:
    for key in ['location','rotation_quaternion','scale']:pb.keyframe_insert(key,frame=frame,group=pb.name)
  action=rig.animation_data.action;action.name=clip
  for fc in curves(action):
   for k in fc.keyframe_points:k.interpolation='LINEAR'
  actions[clip]=action
  rig.animation_data.action=None
  track=rig.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,0,action);track.mute=True
 return actions

def export(o,rig,cfg,actions):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
 rig.animation_data.action=None
 for track in rig.animation_data.nla_tracks:track.mute=False
 bpy.context.scene.frame_set(0)
 path=os.path.join(OUT,'sertao_'+cfg['id']+'.glb')
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_extras=True,export_image_format='JPEG',export_jpeg_quality=90)
 for track in rig.animation_data.nla_tracks:track.mute=True
 return path

def verify_render(o,rig,specs,cfg,actions,path):
 scene=setup_render(o,cfg);report={'file':path,'bytes':os.path.getsize(path),'sha256':hashlib.sha256(open(path,'rb').read()).hexdigest(),'clips':{},'source_forward':'+X' if cfg['yaw'] else '+Z','glTF_forward':'+Z','glTF_up':'+Y','height_m':o.dimensions.z,'length_m':o.dimensions.y,'gait_speed_mps':cfg['step']/(.6*cfg['duration'])}
 o.data.calc_loop_triangles();report['triangles']=len(o.data.loop_triangles);report['materials']=len(o.data.materials)
 for clip,action in actions.items():
  rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0]
  frames=[]
  restverts=[v.co.copy() for v in o.data.vertices]
  foot_indices={s['label']:[v.index for v in o.data.vertices if any(g.group==o.vertex_groups['Foot_'+s['label']].index and g.weight>.99 for g in v.groups)] for s in specs}
  for i in range(8):
   frame=action.frame_range[1]*i/8;scene.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update()
   dep=bpy.context.evaluated_depsgraph_get();mesh=o.evaluated_get(dep).to_mesh();verts=[o.matrix_world@v.co for v in mesh.vertices];lo=[min(v[j] for v in verts) for j in range(3)];hi=[max(v[j] for v in verts) for j in range(3)]
   feet={s['label']:list(rig.pose.bones['Foot_'+s['label']].head) for s in specs}
   foot_surface={label:{'min_z':min(verts[k].z for k in ids),'centroid':list(sum((verts[k] for k in ids),Vector())/len(ids)),'vertices':len(ids)} for label,ids in foot_indices.items()}
   ratios=[(verts[e.vertices[0]]-verts[e.vertices[1]]).length/(restverts[e.vertices[0]]-restverts[e.vertices[1]]).length for e in o.data.edges if (restverts[e.vertices[0]]-restverts[e.vertices[1]]).length>.00001]
   ratios.sort()
   frames.append({'phase':i/8,'floor_min_m':lo[2],'bounds_blender':[lo,hi],'feet_blender':feet,'foot_surface':foot_surface,'edge_stretch_p99':ratios[int(len(ratios)*.99)],'edge_stretch_max':max(ratios)})
   o.evaluated_get(dep).to_mesh_clear()
   scene.render.filepath=os.path.join(ART,cfg['id']+'-'+clip+'-'+str(i)+'.png');bpy.ops.render.render(write_still=True)
  report['clips'][clip]={'duration_seconds':action.frame_range[1]/30,'samples':frames}
 rig.animation_data.action=None
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ART,cfg['id']+'-animated.blend'))
 open(os.path.join(ART,cfg['id']+'-report.json'),'w').write(json.dumps(report,indent=2))
 return report

reports=[]
for cfg in CONFIG:
 if os.environ.get('LIVESTOCK_ONLY') and cfg['id']!=os.environ['LIVESTOCK_ONLY']:continue
 o=import_model(cfg);rig,specs=rig_model(o,cfg);actions=animate(rig,specs,cfg);path=export(o,rig,cfg,actions)
 reports.append(verify_render(o,rig,specs,cfg,actions,path))
reports=[json.load(open(os.path.join(ART,cfg['id']+'-report.json'))) for cfg in CONFIG if os.path.exists(os.path.join(ART,cfg['id']+'-report.json'))]
open(os.path.join(ART,'animation-report.json'),'w').write(json.dumps(reports,indent=2))
