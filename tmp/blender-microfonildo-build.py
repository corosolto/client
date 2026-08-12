"""Constrói o Microfonildo limpo e o mutante causal em uma malha GLB riggable.

Uso: blender --background --python tmp/blender-microfonildo-build.py -- out.glb receipt.json clean|mutant
"""
import json, math, pathlib, sys
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
out = pathlib.Path(args[0]).resolve(); receipt = pathlib.Path(args[1]).resolve(); mode = args[2]
if mode not in {'clean','mutant','smooth','rings'}: raise SystemExit('modo clean|mutant|smooth|rings')
bpy.ops.wm.read_factory_settings(use_empty=True)

COLORS = {
 'fur': (0.18,0.080,0.002,1), 'fur2': (0.34,0.170,0.004,1), 'skin': (0.46,0.22,0.10,1),
 'muzzle': (0.68,0.40,0.18,1), 'teal': (0.015,0.16,0.19,1), 'cyan': (0.0,0.82,0.94,1),
 'magenta': (0.92,0.015,0.52,1), 'black': (0.012,0.016,0.020,1), 'cloth': (0.025,0.035,0.040,1),
 'white': (0.94,0.96,0.91,1), 'brown': (0.17,0.07,0.025,1), 'metal': (0.16,0.19,0.20,1),
}
mats={}
for name,color in COLORS.items():
    mat=bpy.data.materials.new('MIC_'+name.upper()); mat.diffuse_color=color
    mat.use_nodes=True; bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=color; bsdf.inputs['Roughness'].default_value=.72
    bsdf.inputs['Metallic'].default_value=.6 if name=='metal' else 0
    mats[name]=mat
objects=[]
def keep(o,name,mat): o.name=name; o.data.materials.append(mats[mat]); objects.append(o); return o
def ico(name, loc, scale, mat, sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc); o=keep(bpy.context.object,name,mat); o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return o
def uv(name, loc, scale, mat, seg=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc); o=keep(bpy.context.object,name,mat); o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return o
def box(name, loc, dims, mat, bevel=.0):
    bpy.ops.mesh.primitive_cube_add(location=loc); o=keep(bpy.context.object,name,mat); o.dimensions=dims; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel: mod=o.modifiers.new('soft','BEVEL'); mod.width=bevel; mod.segments=2; bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def segment(name,a,b,r,mat,verts=12):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length,location=(a+b)/2)
    o=keep(bpy.context.object,name,mat); o.rotation_mode='QUATERNION'; o.rotation_quaternion=d.to_track_quat('Z','Y'); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return o
def torus(name,loc,major,minor,mat,rot=(math.pi/2,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=20,minor_segments=7,location=loc,rotation=rot)
    return keep(bpy.context.object,name,mat)
def cone(name,loc,rad,depth,mat,rot=(0,0,0),verts=7):
    bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=rad,radius2=.01,depth=depth,location=loc,rotation=rot)
    return keep(bpy.context.object,name,mat)
def tuft(name,base,tip,rad,mat='fur2'):
    base,tip=Vector(base),Vector(tip); d=tip-base
    bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=rad,radius2=.008,depth=d.length,location=(base+tip)/2)
    o=keep(bpy.context.object,name,mat); o.rotation_mode='QUATERNION'; o.rotation_quaternion=d.to_track_quat('Z','Y'); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return o
def angular_segment(name,a,b,r,mat='fur2'):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(a+b)/2)
    o=keep(bpy.context.object,name,mat); o.scale=(r,r,d.length*.56); o.rotation_mode='QUATERNION'; o.rotation_quaternion=d.to_track_quat('Z','Y'); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return o

# Anatomia simples, compacta, com membros separados para o autorig.
ico('Body_Torso',(0,0,1.02),(.28,.18,.38),'fur',3)
ico('Head',(0,-.008,1.46),(.30,.255,.285),'fur',3)
uv('Muzzle',(0,-.245,1.395),(.16,.075,.105),'muzzle')
uv('Nose',(0,-.318,1.44),(.048,.027,.035),'brown',16,8)
for x in (-.092,.092):
    uv('EyeWhite', (x,-.233,1.515),(.062,.035,.078),'white',16,10)
    uv('EyeIris', (x,-.266,1.512),(.026,.012,.037),'brown',12,8)
    uv('EyeGlint',(x-.008,-.278,1.535),(.009,.006,.012),'white',8,6)
segment('Mouth',(-.07,-.314,1.365),(.07,-.314,1.365),.009,'brown',10)

# Pernas, calças, botas.
for side in (-1,1):
    x=.13*side
    segment('Leg',(x,0,.80),(x,0,.39),.105,'cloth',14)
    uv('Boot',(x,-.035,.185),(.135,.20,.17),'black',16,10)
    box('BootSole',(x,-.055,.055),(.29,.36,.08),'black',.025)

# Braços em A-pose e mãos com cinco dedos distintos.
for side in (-1,1):
    shoulder=(.235*side,-.005,1.18); elbow=(.45*side,-.035,.99); wrist=(.64*side,-.055,.88)
    segment('UpperArm',shoulder,elbow,.09,'fur',14); segment('ForeArm',elbow,wrist,.078,'fur',14)
    uv('Palm',(wrist[0],-.065,.84),(.09,.065,.085),'skin',14,8)
    for i in range(5):
        fx=wrist[0] + side*(.02 + i*.015); fy=-.075 + abs(i-2)*.004; top=.805-abs(i-2)*.006
        segment('Finger',(fx,fy,top),(fx+side*.025,fy-.008,top-.075+i*.002),.013,'skin',8)

# Massas contínuas e angulares de pelo. O mutante ``smooth`` remove exatamente este bloco.
if mode != 'smooth':
    for side in (-1,1):
        ico('CheekFur',(.215*side,-.075,1.43),(.155,.16,.205),'fur2',2)
    for x,z,s in [(-.18,1.26,.15),(0,1.22,.18),(.18,1.26,.15),(-.16,1.08,.17),(0,1.04,.22),(.16,1.08,.17),(0,.86,.20)]:
        ico('RuffChestFur',(x,-.07,z),(s,.14,s*1.18),'fur2',2)
    for side in (-1,1):
        angular_segment('UpperArmFur',(.245*side,-.01,1.18),(.45*side,-.04,.99),.112,'fur2')
        angular_segment('ForeArmFur',(.45*side,-.04,.99),(.64*side,-.055,.88),.098,'fur2')
    for i in range(22):
        a=2*math.pi*i/22
        tuft('HeadSilhouetteTuft',(.255*math.cos(a),-.115,1.46+.245*math.sin(a)),(.315*math.cos(a),-.125,1.46+.302*math.sin(a)),.055)
    for i in range(16):
        a=2*math.pi*i/16
        tuft('TorsoSilhouetteTuft',(.255*math.cos(a),-.08,1.02+.33*math.sin(a)),(.315*math.cos(a),-.09,1.02+.395*math.sin(a)),.052)

# Fones genéricos, aro por cima e conchas laterais.
torus('HeadphoneBand',(0,.005,1.52),.305,.026,'teal',rot=(math.pi/2,0,0))
for side in (-1,1):
    uv('HeadphoneCup',(.286*side,-.01,1.47),(.072,.052,.115),'teal',16,10)
    torus('HeadphoneCyan',(.312*side,-.035,1.47),.050,.010,'cyan',rot=(0,math.pi/2,0))

# Arnês discreto e mochila compacta inteiramente atrás do tórax.
for side in (-1,1): segment('Harness',(.15*side,-.17,1.27),(.12*side,-.19,.82),.018,'black',8)
box('AudioPack',(0,.205,1.04),(.30,.12,.36),'teal',.035)
box('PackPanel',(0,.272,1.04),(.23,.025,.27),'black',.015)

# Boom no corredor direito dorsal (direita do personagem = x negativo), fixado por duas braçadeiras.
boom_x=-.225
segment('BoomPole',(boom_x,.29,.96),(boom_x,.29,1.52),.018,'metal',12)
for z in (1.02,1.25): torus('BoomClamp',(boom_x,.282,z),.031,.008,'cyan',rot=(math.pi/2,0,0))
ico('BoomWindscreen',(boom_x,.29,1.57),(.065,.055,.09),'fur2',2)
segment('BoomCable',(boom_x+.02,.30,1.05),(-.12,.29,.84),.008,'black',8)

# Reels com cubo, flanges e cabo enrolado. ``rings`` preserva só o aro defeituoso.
for x,mat in ((-.15,'magenta'),(.15,'cyan')):
    torus('CableReelOuter',(x,.225,.78),.064,.012,mat)
    if mode != 'rings':
        for y,r in ((.210,.050),(.225,.044),(.240,.050)):
            torus('CableCoil',(x,y,.78),r,.008,mat)
        bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.028,depth=.055,location=(x,.225,.78),rotation=(math.pi/2,0,0))
        keep(bpy.context.object,'CableReelHub',mat)
        segment('CableTail',(x+.025,.235,.745),(x+.055,.245,.695),.006,mat,8)
        box('CablePlug',(x+.060,.245,.687),(.024,.018,.030),'black',.004)
    box('CableClip',(x,.18,.80),(.028,.045,.10),'black',.006)

# Mutante: reinsere um boom horizontal solto exatamente no corredor de cabeça/braços.
if mode=='mutant':
    segment('MUTANT_LooseBoom',(-.48,.03,1.16),(.53,.03,1.16),.025,'metal',12)
    ico('MUTANT_FuzzyTip',(.55,.03,1.16),(.08,.06,.07),'fur2',2)

# Uma só malha, preservando materiais PBR por zona. A v2 já usa o armature Meshy
# aprovado como template offline, portanto não precisa reduzir tudo a um atlas/material.
bpy.ops.object.select_all(action='DESELECT')
for o in objects: o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.join(); body=bpy.context.object; body.name='Microfonildo_Clean' if mode=='clean' else 'Microfonildo_Mutant'
mesh=body.data

out.parent.mkdir(parents=True,exist_ok=True); receipt.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active=body
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_attributes=True)
mesh.calc_loop_triangles()
data={'mode':mode,'sourceDirection':'Tripo A/B winner; geometry rebuilt causally in Blender','objectsJoined':len(objects),'vertices':len(mesh.vertices),'triangles':len(mesh.loop_triangles),'materials':len(mesh.materials),'mutant':mode!='clean','furMasses':mode!='smooth','reelHubs':mode!='rings','boomContract':{'side':'character-right/world-x-negative','x':boom_x,'z':[.96,1.66],'backY':.29,'chestClear':True}}
receipt.write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(data))
