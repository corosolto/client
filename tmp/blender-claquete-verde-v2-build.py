"""V2 focal: superfície adulta/equipada e ombreira-claquete baixa integrada."""
import json,math,pathlib,sys,bpy
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]; out=pathlib.Path(args[0]).resolve(); receipt=pathlib.Path(args[1]).resolve(); mode=args[2]
if mode not in {'clean','highplate','boxyplate','raisedstripe'}: raise SystemExit('modo inválido')
bpy.ops.wm.read_factory_settings(use_empty=True)
COLORS={
 'suit':(.012,.055,.022,1),'suit_panel':(.025,.105,.042,1),'armor':(.030,.145,.055,1),'armor_edge':(.055,.205,.075,1),
 'shoulder':(.035,.17,.065,1),'face':(.36,.145,.060,1),'face_shadow':(.22,.065,.020,1),'eye_white':(.82,.84,.78,1),
 'eye':(.025,.014,.008,1),'hair':(.030,.012,.005,1),'black':(.006,.009,.007,1),'boot':(.012,.016,.013,1),
 'clapper':(.028,.155,.055,1),'clapper_stripe':(.90,.91,.83,1),'hinge':(.055,.065,.058,1),
 'cyan':(0,.58,.68,1),'magenta':(.75,.010,.32,1),'yellow':(.92,.48,.018,1),
}
mats={}
for name,color in COLORS.items():
 m=bpy.data.materials.new('CV2_'+name.upper());m.diffuse_color=color;m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=color;b.inputs['Roughness'].default_value=.64;mats[name]=m
objects=[]
def keep(o,n,m):o.name=n;o.data.materials.append(mats[m]);objects.append(o);return o
def uv(n,l,s,m,seg=18,rings=10):bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=l);o=keep(bpy.context.object,n,m);o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return o
def ico(n,l,s,m,sub=2):bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=l);o=keep(bpy.context.object,n,m);o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return o
def box(n,l,d,m,bevel=0,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cube_add(location=l,rotation=rot);o=keep(bpy.context.object,n,m);o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel: mod=o.modifiers.new('edge','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def segment(n,a,b,r,m,verts=12):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length,location=(a+b)/2);o=keep(bpy.context.object,n,m);o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y');bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return o

# Proporção humana adulta compacta: cabeça menor, tronco equipado e botas práticas.
box('PaddedTorso',(0,0,1.105),(.47,.275,.40),'suit',.065)
box('WaistGuard',(0,.005,.855),(.37,.235,.13),'suit_panel',.035)
segment('Neck',(0,0,1.34),(0,0,1.405),.067,'face',14)
uv('AdultFace',(0,-.008,1.515),(.120,.105,.145),'face',20,12)
ico('CloseHair',(0,.018,1.595),(.121,.097,.082),'hair',2)
box('HairLine',(0,-.094,1.615),(.19,.018,.035),'hair',.012)
for side in (-1,1):
 x=.047*side;uv('EyeWhite',(x,-.108,1.535),(.022,.010,.012),'eye_white',12,7);uv('Iris',(x,-.118,1.534),(.008,.005,.008),'eye',10,6)
 segment('Brow',(x-.025*side,-.115,1.565),(x+.025*side,-.115,1.568),.005,'hair',8)
uv('Nose',(0,-.116,1.505),(.018,.012,.022),'face_shadow',12,7)
segment('Mouth',(-.030,-.112,1.466),(.030,-.112,1.466),.0045,'face_shadow',8)

# Colete técnico inspirado em equipe de estúdio brasileira: webbing e fitas de produção, sem bandeira/texto.
for side in (-1,1):
 box('ChestArmor',(.103*side,-.151,1.15),(.18,.036,.245),'armor',.022)
 segment('Harness',(.17*side,-.17,1.30),(.13*side,-.17,.91),.012,'black',8)
box('AbArmor',(0,-.148,.94),(.29,.038,.105),'armor_edge',.018)
box('UtilityBelt',(0,0,.79),(.43,.25,.070),'black',.016)
for x in (-.16,.16):box('BeltPouch',(x,-.125,.79),(.105,.055,.12),'suit_panel',.014)
for x,m in ((-.055,'cyan'),(0,'magenta'),(.055,'yellow')):box('GafferTab',(x,-.147,.795),(.030,.012,.038),m,.003)
for side in (-1,1):box('YellowPiping',(.19*side,-.166,1.09),(.012,.010,.25),'yellow',.002)

# Pernas curtas, mas anatomia adulta e calçado estreito.
for side in (-1,1):
 x=.115*side;segment('Thigh',(x,0,.79),(x,0,.60),.087,'suit_panel',14);box('ThighGuard',(x,-.083,.69),(.145,.047,.18),'armor',.016)
 uv('KneePad',(x,-.075,.55),(.092,.055,.065),'black',14,8);segment('Shin',(x,0,.51),(x,0,.29),.078,'suit',14);box('ShinGuard',(x,-.075,.40),(.13,.046,.17),'armor',.014)
 uv('PracticalBoot',(x,-.035,.16),(.100,.140,.080),'boot',16,8);box('BootSole',(x,-.06,.065),(.21,.255,.055),'black',.014)

# A-pose funcional; placas achatadas substituem ombros esféricos.
for side in (-1,1):
 shoulder=(.235*side,-.002,1.285);elbow=(.43*side,-.020,1.13);wrist=(.59*side,-.04,.99)
 segment('UpperArm',shoulder,elbow,.072,'suit_panel',14);segment('ForeArm',elbow,wrist,.063,'suit',14)
 box('FlatShoulderPad',(.255*side,-.004,1.285),(.155,.090,.085),'shoulder',.025)
 box('ElbowGuard',(.43*side,-.068,1.13),(.105,.050,.105),'black',.015)
 box('ForearmGuard',(.51*side,-.075,1.06),(.145,.042,.12),'armor',.014,rot=(0,.68*side,0))
 uv('Palm',(wrist[0],-.052,.955),(.070,.045,.065),'face',14,8)
 for i in range(5):
  fx=wrist[0]+side*(.012+i*.011);z=.915-abs(i-2)*.003;segment('Finger',(fx,-.057,z),(fx+side*.016,-.060,z-.055+i*.001),.009,'face',8)

# Ombreira-claquete: pequena, arredondada, diretamente sobre ombro esquerdo e abaixo da cabeça.
px=.275;pz=1.300
if mode=='highplate': pz=1.485
if mode=='boxyplate': box('RoundedClapperPad',(px,.065,pz),(.20,.105,.12),'clapper',.004)
else: uv('RoundedClapperPad',(px,.065,pz),(.100,.055,.060 if mode!='highplate' else .145),'clapper',18,10)
bpy.ops.mesh.primitive_cylinder_add(vertices=18,radius=.026,depth=.070,location=(.205,.062,pz-.025),rotation=(math.pi/2,0,0));keep(bpy.context.object,'ShortHinge','hinge')
# Uma única faixa impressa/planar: nenhum dente, bloco alternado ou lâmina.
stripe_y=-.020 if mode=='raisedstripe' else .008
box('SingleSurfaceStripe',(px,stripe_y,pz),(.095,.003,.012),'clapper_stripe',.001,rot=(0,-.42,0))

bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();body=bpy.context.object;body.name='ClaqueteVerdeV2_Clean' if mode=='clean' else 'ClaqueteVerdeV2_Mutant';body.data.calc_loop_triangles()
out.parent.mkdir(parents=True,exist_ok=True);receipt.parent.mkdir(parents=True,exist_ok=True);bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_attributes=True)
data={'mode':mode,'objectsJoined':len(objects),'vertices':len(body.data.vertices),'triangles':len(body.data.loop_triangles),'materials':len(body.data.materials),'surfaceRevision':'adult equipped proportions, flat shoulder armor, practical boots','clapper':{'worldX':px,'backY':.065,'centerZ':pz,'singleSurfaceStripe':True,'directShoulderMount':True,'belowHead':mode!='highplate'}};receipt.write_text(json.dumps(data,indent=2)+'\n');print(json.dumps(data))
