"""Constrói Claquete Verde e três mutantes causais como uma malha PBR."""
import json, math, pathlib, sys
import bpy
from mathutils import Vector

args=sys.argv[sys.argv.index('--')+1:]
out=pathlib.Path(args[0]).resolve(); receipt=pathlib.Path(args[1]).resolve(); mode=args[2]
if mode not in {'clean','wrongside','smallplate','looseblade'}: raise SystemExit('modo inválido')
bpy.ops.wm.read_factory_settings(use_empty=True)

COLORS={
 'suit':(.018,.095,.040,1),'suit2':(.035,.16,.065,1),'armor':(.045,.20,.085,1),
 'armor2':(.075,.28,.115,1),'black':(.008,.012,.010,1),'rubber':(.018,.022,.020,1),
 'skin':(.48,.225,.105,1),'skin2':(.34,.12,.045,1),'white':(.92,.94,.88,1),
 'eye':(.035,.018,.009,1),'hair':(.055,.022,.009,1),'cyan':(0,.68,.78,1),
 'magenta':(.85,.015,.42,1),'yellow':(.95,.58,.025,1),'clapper_green':(.035,.24,.085,1),
 'clapper_black':(.006,.008,.006,1),'stripe_white':(.90,.92,.85,1),'hinge':(.08,.10,.085,1),
}
mats={}
for name,color in COLORS.items():
    m=bpy.data.materials.new('CV_'+name.upper()); m.diffuse_color=color; m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Base Color'].default_value=color; bsdf.inputs['Roughness'].default_value=.72
    mats[name]=m
objects=[]
def keep(o,name,mat): o.name=name; o.data.materials.append(mats[mat]); objects.append(o); return o
def uv(name,loc,scale,mat,seg=18,rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc); o=keep(bpy.context.object,name,mat); o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return o
def ico(name,loc,scale,mat,sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc); o=keep(bpy.context.object,name,mat); o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return o
def box(name,loc,dims,mat,bevel=0,rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(location=loc,rotation=rot); o=keep(bpy.context.object,name,mat); o.dimensions=dims; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel: mod=o.modifiers.new('edge','BEVEL'); mod.width=bevel; mod.segments=2; bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def segment(name,a,b,r,mat,verts=12):
    a,b=Vector(a),Vector(b); d=b-a; bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length,location=(a+b)/2)
    o=keep(bpy.context.object,name,mat); o.rotation_mode='QUATERNION'; o.rotation_quaternion=d.to_track_quat('Z','Y'); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return o
def torus(name,loc,major,minor,mat,rot=(math.pi/2,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=18,minor_segments=7,location=loc,rotation=rot); return keep(bpy.context.object,name,mat)

# Dublê compacto: volumes baixos, pernas curtas, A-pose limpa.
ico('SuitTorso',(0,0,1.10),(.285,.175,.34),'suit',3)
box('WaistArmor',(0,-.005,.83),(.38,.23,.15),'armor',.025)
segment('Neck',(0,0,1.36),(0,0,1.43),.083,'skin',16)
uv('Head',(0,-.005,1.55),(.155,.135,.185),'skin',20,12)
ico('HairCap',(0,.028,1.605),(.158,.122,.13),'hair',2)
ico('HairTop',(0,-.018,1.675),(.145,.105,.058),'hair',2)
for x in (-.057,.057):
    uv('EyeWhite',(x,-.126,1.575),(.035,.018,.026),'white',12,8); uv('Pupil',(x,-.143,1.574),(.012,.007,.014),'eye',10,6)
uv('Nose',(0,-.143,1.535),(.025,.015,.022),'skin2',12,7)
segment('Mouth',(-.035,-.139,1.495),(.035,-.139,1.495),.006,'skin2',8)

# Colete/peitoral de proteção sem prop no corredor central.
for side in (-1,1):
    box('ChestPlate',(.105*side,-.165,1.17),(.17,.035,.25),'armor2',.025)
    box('ChestStripe',(.105*side,-.188,1.29),(.085,.012,.020),'stripe_white',.004,rot=(0,.35*side,0))
box('AbPlate',(0,-.16,.92),(.28,.035,.11),'armor',.018)
box('Belt',(0,-.005,.78),(.43,.24,.075),'black',.018)
for x,mat in ((-.12,'cyan'),(-.075,'magenta'),(-.03,'yellow')): box('TVMarker',(x,-.135,.80),(.028,.018,.035),mat,.003)

# Pernas curtas, joelhos e botas no piso.
for side in (-1,1):
    x=.12*side
    segment('Thigh',(x,0,.78),(x,0,.58),.105,'suit2',14)
    uv('KneePad',(x,-.085,.55),(.115,.075,.09),'black',14,8)
    segment('Shin',(x,0,.52),(x,0,.27),.095,'suit',14)
    box('ShinArmor',(x,-.09,.39),(.16,.055,.19),'armor',.018)
    uv('Boot',(x,-.035,.16),(.13,.18,.14),'rubber',16,9)
    box('BootSole',(x,-.06,.045),(.28,.32,.07),'black',.018)

# Braços A-pose; mãos abertas com cinco dedos utilizáveis.
for side in (-1,1):
    shoulder=(.25*side,-.005,1.29); elbow=(.45*side,-.025,1.13); wrist=(.62*side,-.045,.99)
    segment('UpperArm',shoulder,elbow,.085,'suit2',14); segment('ForeArm',elbow,wrist,.074,'suit',14)
    uv('ShoulderPad',(.27*side,-.015,1.30),(.115,.10,.105),'armor',14,8)
    box('ForearmPad',(.51*side,-.085,1.085),(.17,.05,.13),'armor',.015,rot=(0,.72*side,0))
    uv('Palm',(wrist[0],-.055,.955),(.083,.052,.072),'skin',14,8)
    for i in range(5):
        fx=wrist[0]+side*(.014+i*.013); z=.91-abs(i-2)*.004
        segment('Finger',(fx,-.06,z),(fx+side*.018,-.064,z-.065+i*.001),.011,'skin',8)

# Uma única ombreira-claquete no ombro anatômico esquerdo: frente da câmera = x positivo.
plate_side=1 if mode!='wrongside' else -1
px=.36*plate_side; plate_scale=.48 if mode=='smallplate' else 1.0
pw=.28*plate_scale; ph=.32*plate_scale; pz=1.38
box('ClapperShoulderPlate',(px,.115,pz),(pw,.055,ph),'clapper_green',.025)
hinge_x=px-plate_side*pw*.38
bpy.ops.mesh.primitive_cylinder_add(vertices=18,radius=.045*plate_scale,depth=.08,location=(hinge_x,.105,pz-ph*.35),rotation=(math.pi/2,0,0)); keep(bpy.context.object,'ClapperHinge','hinge')
gap=.115 if mode=='looseblade' else 0
band_z=pz+ph*.44+gap
box('IntegratedClapperEdge',(px,.080,band_z),(pw,.022,.050*plate_scale),'clapper_black',.004)
stripe_count=2 if mode=='smallplate' else 5
for i in range(stripe_count):
    sx=px-pw*.38+i*(pw*.76/max(1,stripe_count-1))
    box('IntegratedDiagonalStripe',(sx,.066,band_z),(.038*plate_scale,.014,.045*plate_scale),'stripe_white',.002,rot=(0,-.55*plate_side,0))

# Junta tudo mantendo materiais PBR separados, necessário à régua do GLB final.
bpy.ops.object.select_all(action='DESELECT')
for o in objects: o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.join(); body=bpy.context.object; body.name='ClaqueteVerde_Clean' if mode=='clean' else 'ClaqueteVerde_Mutant'
body.data.calc_loop_triangles()
out.parent.mkdir(parents=True,exist_ok=True); receipt.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active=body
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_attributes=True)
data={'mode':mode,'objectsJoined':len(objects),'vertices':len(body.data.vertices),'triangles':len(body.data.loop_triangles),'materials':len(body.data.materials),'plate':{'anatomicalSide':'left' if plate_side==1 else 'right','worldX':px,'backY':.115,'width':pw,'height':ph,'integratedBandGap':gap},'contracts':{'rightShoulderFree':plate_side==1,'chestAndHandsFree':True,'textOrLogo':False}}
receipt.write_text(json.dumps(data,indent=2)+'\n'); print(json.dumps(data))
