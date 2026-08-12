"""V3: conserva a superfície adulta Meshy e acrescenta só a ombreira-claquete."""
import json,math,pathlib,sys,bpy
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];raw=pathlib.Path(args[0]).resolve();out=pathlib.Path(args[1]).resolve();receipt=pathlib.Path(args[2]).resolve();mode=args[3]
if mode not in {'clean','toy-joints','dorsal-slab','low-contrast'}:raise SystemExit('modo inválido')
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(raw),import_shading='NORMALS');body=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices));body.name='ClaqueteVerdeV3_MeshySurface'
# Normaliza a superfície Meshy escolhida para 1,70 m e planta o ponto mais baixo no piso.
world=[body.matrix_world@v.co for v in body.data.vertices];lo=Vector(tuple(min(p[i] for p in world) for i in range(3)));hi=Vector(tuple(max(p[i] for p in world) for i in range(3)));scale=1.70/(hi.z-lo.z);body.scale*=scale;bpy.context.view_layer.objects.active=body;body.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=[body.matrix_world@v.co for v in body.data.vertices];body.location.z-=min(p.z for p in world);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
COLORS={'suit':(.012,.055,.022,1),'armor':(.025,.125,.045,1),'armor_edge':(.050,.19,.065,1),'skin':(.34,.135,.052,1),'hair':(.026,.010,.004,1),'black':(.006,.009,.007,1),'clapper':(.025,.16,.052,1),'stripe':(.95,.95,.86,1),'hinge':(.050,.060,.052,1),'toy':(.08,.30,.10,1)}
if mode=='low-contrast':COLORS['stripe']=(.04,.19,.065,1)
mats={}
for name,color in COLORS.items():m=bpy.data.materials.new('CV3_'+name.upper());m.diffuse_color=color;m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=color;b.inputs['Roughness'].default_value=.62;mats[name]=m
body.data.materials.clear()
for name in ('suit','armor','armor_edge','skin','hair','black'):body.data.materials.append(mats[name])
slot={m.name:i for i,m in enumerate(body.data.materials)}
# Materializa a topologia adulta existente sem cobri-la com primitivas toy.
for poly in body.data.polygons:
 c=poly.center;x,y,z=c
 if z>1.43 and abs(x)<.25:
  name='hair' if z>1.61 or (z>1.54 and y>.045) else 'skin'
 elif abs(x)>.47 and .70<z<1.23:name='skin'
 elif z<.22:name='black'
 elif .69<z<.81:name='black'
 elif .84<z<1.39 and abs(x)<.31:name='armor'
 elif .22<z<.68 and abs(x)<.28 and y<.02:name='armor_edge'
 else:name='suit'
 poly.material_index=slot[mats[name].name]
objects=[body]
def keep(o,n,m):o.name=n;o.data.materials.append(mats[m]);objects.append(o);return o
def uv(n,l,s,m,seg=18,rings=10):bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=l);o=keep(bpy.context.object,n,m);o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return o
def box(n,l,d,m,bevel=0,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cube_add(location=l,rotation=rot);o=keep(bpy.context.object,n,m);o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:mod=o.modifiers.new('edge','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
# Ombreira pequena e baixa, sobre o ombro anatômico esquerdo (x positivo).
px,pz=.345,1.315;uv('ClapperShoulderPad',(px,.070,pz),(.090,.052,.055),'clapper',18,10)
bpy.ops.mesh.primitive_cylinder_add(vertices=18,radius=.024,depth=.065,location=(.278,.065,1.285),rotation=(math.pi/2,0,0));keep(bpy.context.object,'ShortClapperHinge','hinge')
box('ReadableSurfaceStripe',(px,.015,pz),(.100,.0035,.024),'stripe',.001,rot=(0,-.42,0))
if mode=='dorsal-slab':box('ForbiddenDorsalSlab',(.34,.135,1.36),(.30,.060,.42),'clapper',.015)
if mode=='toy-joints':
 for x,z in ((-.30,1.30),(.30,1.30),(-.45,1.10),(.45,1.10),(-.13,.57),(.13,.57),(-.13,.18),(.13,.18),(-.24,.78),(.24,.78)):
  uv('ToyJoint',(x,-.015,z),(.075,.070,.075),'toy',12,7)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join();body=bpy.context.object;body.name='ClaqueteVerdeV3_Clean' if mode=='clean' else 'ClaqueteVerdeV3_Mutant';body.data.calc_loop_triangles()
out.parent.mkdir(parents=True,exist_ok=True);receipt.parent.mkdir(parents=True,exist_ok=True);bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body;bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_attributes=True)
data={'mode':mode,'rawMeshySurface':str(raw),'normalizationScale':scale,'vertices':len(body.data.vertices),'triangles':len(body.data.loop_triangles),'materials':len(body.data.materials),'surfacePolicy':'adult Meshy A/B winner retained; spatial PBR assignment only','clapper':{'anatomicalSide':'left','worldX':px,'belowHead':True,'singleFlatStripe':True,'shortHinge':True},'newApiCredits':0};receipt.write_text(json.dumps(data,indent=2)+'\n');print(json.dumps(data))
