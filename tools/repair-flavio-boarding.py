from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
import bpy, bmesh, math, json, hashlib, argparse, sys

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument('--render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.output).resolve()
root.mkdir(parents=True, exist_ok=True)
asset_root = Path(__file__).resolve().parents[1] / 'public/models/props/operacao_decola'
for name, digest in [('aviao_executivo', '73e289cc3b53e970a8fb980364f9227b7b2fcc9ad1360a82a20c6e1c505501f9'), ('escada_embarque', '62d23fdea58296151804c8146f031183cc17dff6c347243191f0a055d25b73be')]:
    assert hashlib.sha256((asset_root / (name + '.glb')).read_bytes()).hexdigest() == digest, 'original source drift: ' + name
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
def bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == 'MESH' for corner in obj.bound_box]
    return Vector(tuple(min(p[i] for p in points) for i in range(3))), Vector(tuple(max(p[i] for p in points) for i in range(3)))

for name, size, position, yaw in [
    ('aviao_executivo', 18, (0, .08, 55), math.pi),
    ('escada_embarque', 4, (4.2, .08, 52), -math.pi / 2),
]:
    path = asset_root / (name + '.glb')
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = list(set(bpy.data.objects) - before)
    group = bpy.data.objects.new('GEO-' + name, None)
    scene.collection.objects.link(group)
    for obj in imported:
        if obj.parent is None:
            matrix = obj.matrix_world.copy()
            obj.parent = group
            obj.matrix_world = matrix
    group.rotation_euler.z = yaw
    bpy.context.view_layer.update()
    lo, hi = bounds(imported)
    scale = size / max(hi - lo)
    group.scale = (scale,) * 3
    group.location = (position[0], -position[2], 0)
    bpy.context.view_layer.update()
    lo, hi = bounds(imported)
    group.location.z += position[1] - lo.z
    bpy.context.view_layer.update()
    lo, hi = bounds(imported)


scene=bpy.context.scene
for obj in list(bpy.data.objects):
 if obj.type=='CAMERA' or obj.name=='GEO-inspection-ground':bpy.data.objects.remove(obj,do_unlink=True)
plane=next(o for o in bpy.data.objects['GEO-aviao_executivo'].children_recursive if o.type=='MESH')
stairs=next(o for o in bpy.data.objects['GEO-escada_embarque'].children_recursive if o.type=='MESH')
for obj in [plane,stairs]:
 matrix=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=matrix
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
plane.name='GEO-boarding-plane';stairs.name='GEO-boarding-stairs'
def bvh(obj):return BVHTree.FromPolygons([obj.matrix_world@v.co for v in obj.data.vertices],[list(p.vertices) for p in obj.data.polygons])
def portal_hits(obj):
 tree=bvh(obj);rows=[]
 for z in [51.7,52,52.3]:
  for height in [1.8,2.3,2.8,3.32]:
   hit=tree.ray_cast(Vector((1.6,-z,height)),Vector((-1,0,0)),1.35)
   if hit[0]:rows.append({'z':z,'y':height,'x':hit[0].x})
 return rows
source_plane_tree=bvh(plane)
baseline=portal_hits(plane);assert len(baseline)>0,'original must obstruct actual portal rays'
(root/'portal-red.json').write_text(json.dumps({'source':'original closed fuselage','blocked':baseline},indent=2)+'\n')
floor_y=1.6;landing_original=2.30309;factor=(floor_y-.08)/(landing_original-.08)
pivot=Vector((4.2,-52,.08))
transform=Matrix.Translation(Vector((-2,0,0)))@Matrix.Translation(pivot)@Matrix.Rotation(math.pi,4,'Z')@Matrix.Diagonal((factor,factor,factor,1))@Matrix.Translation(-pivot)
for v in stairs.data.vertices:
 v.co=transform@v.co;v.co.y=-52+(v.co.y+52)*1.25
stairs.data.update()
# A section of the source skin becomes the independently hinged door.
bpy.ops.mesh.primitive_cube_add(size=1,location=(.85,-52.0,2.535));cutter=bpy.context.object;cutter.name='GEO-portal-cutter';cutter.dimensions=(1.7,1.3,1.91)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
door=plane.copy();door.data=plane.data.copy();scene.collection.objects.link(door);door.name='GEO-boarding-door'
for obj,operation in [(door,'INTERSECT'),(plane,'DIFFERENCE')]:
 mod=obj.modifiers.new('BoardingPortal','BOOLEAN');mod.operation=operation;mod.solver='EXACT';mod.object=cutter
 bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(cutter,do_unlink=True)
bm=bmesh.new();bm.from_mesh(plane.data);caps=[]
for face in bm.faces:
 points=[v.co for v in face.verts]
 inside=all(-.01<=v.x<=1.71 and -52.66<=v.y<=-51.34 and 1.57<=v.z<=3.50 for v in points)
 on_cut=any(all(abs(v[axis]-value)<.0001 for v in points) for axis,value in [(0,0),(0,1.7),(1,-52.65),(1,-51.35),(2,1.58),(2,3.49)])
 if inside and on_cut:caps.append(face)
bmesh.ops.delete(bm,geom=caps,context='FACES');bm.to_mesh(plane.data);bm.free();plane.data.update()
bm=bmesh.new();bm.from_mesh(door.data);bm.normal_update()
bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.normal.x<.2],context='FACES');bm.to_mesh(door.data);bm.free();door.data.update()
lining=bpy.data.materials.new('MAT-boarding-lining');lining.diffuse_color=(.31,.32,.34,1);lining.use_nodes=True;bsdf=lining.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.31,.32,.34,1);bsdf.inputs['Roughness'].default_value=.8
outer=plane.data.materials[0];plane.data.materials.clear();plane.data.materials.append(outer);plane.data.materials.append(lining)
for face in plane.data.polygons:
 center=sum((plane.data.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
 if -.01<=center.x<=1.7 and -52.66<=center.y<=-51.34 and 1.57<=center.z<=3.50:
  if abs(face.normal.x)<.25 or center.x<.04:face.material_index=1
outer=door.data.materials[0];door.data.materials.clear();door.data.materials.append(outer);door.data.materials.append(lining)
for face in door.data.polygons:face.material_index=0
mod=door.modifiers.new('DoorSkinThickness','SOLIDIFY');mod.thickness=.018;mod.material_offset=1;mod.material_offset_rim=1;bpy.context.view_layer.objects.active=door;bpy.ops.object.modifier_apply(modifier=mod.name)
after=portal_hits(plane)
(root/'portal-green.json').write_text(json.dumps({'source':'modified presentation copy','blocked':after,'floor_y':floor_y,'rig_height_source':'public/js/glbchars.js TARGET_HEIGHT=1.72','head_y':3.32,'stair_scale':factor},indent=2)+'\n')
assert not after,'door aperture must clear actual body rays'
def material(name,color,metal=0):
 mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.65;return mat
def box(name,location,dimensions,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=location);obj=bpy.context.object;obj.name=name;obj.dimensions=dimensions;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);obj.data.materials.append(mat);return obj
floor_mat=material('MAT-boarding-floor',(.08,.09,.11));trim_mat=material('MAT-boarding-threshold',(.3,.32,.34),.4)
objects=[plane,stairs,door]
def continuous_trim(name,points,axis):
 verts=[];faces=[]
 for center in points:
  offsets=[(-.08,-.065),(.08,-.065),(.08,.065),(-.08,.065)]
  for depth,width in offsets:
   p=list(center);p[0]+=depth;p[axis]+=width;verts.append(p)
 faces.append((3,2,1,0))
 for i in range(len(points)-1):
  for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
 n=(len(points)-1)*4;faces.append(tuple(n+j for j in range(4)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);obj.data.materials.append(trim_mat)
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();return obj
for side,z in [('a',51.35),('b',52.65)]:
 points=[]
 for i in range(17):
  h=1.6+i*1.89/16;hit=source_plane_tree.ray_cast(Vector((2,-z,h)),Vector((-1,0,0)),2);assert hit[0],'source skin jamb'
  points.append((hit[0].x+.015,-z,h))
 objects.append(continuous_trim('GEO-boarding-jamb-'+side,points,1))
points=[]
for i in range(14):
 z=51.35+i*.1;hit=source_plane_tree.ray_cast(Vector((2,-z,3.49)),Vector((-1,0,0)),2);assert hit[0],'source skin header';points.append((hit[0].x+.015,-z,3.49))
objects.append(continuous_trim('GEO-boarding-header',points,2))
objects.append(box('GEO-boarding-cabin-floor',(0,-52,1.55),(1.65,2.6,.1),floor_mat))
objects.append(box('GEO-boarding-threshold',(1.0,-52,1.565),(.75,.84,.07),trim_mat))
# Entry tread bridges ground to the measured first source tread.
first_top=.08+(.41659-.08)*factor
objects.append(box('GEO-boarding-entry',(3.52,-52,.08+(first_top-.08)/4),(.34,.76,(first_top-.08)/2),trim_mat))
objects.append(box('GEO-boarding-cabin-bulkhead',(-.73,-52.1,2.35),(.06,2.4,1.5),floor_mat))
def hinge_link(name,a,b,radius=.035):
 a=Vector(a);b=Vector(b);delta=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius,depth=delta.length,location=(a+b)/2)
 obj=bpy.context.object;obj.name=name;obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler();obj.data.materials.append(trim_mat);return obj
hinge_arms=[]
for i,h in enumerate([1.9,3.15]):
 hit=source_plane_tree.ray_cast(Vector((2,-52.65,h)),Vector((-1,0,0)),2);assert hit[0]
 hinge_arms.append(hinge_link('GEO-boarding-door-hinge-arm-'+str(i),(1.27,-52.65,h),(hit[0].x-.018,-52.65,h)))
 objects.append(hinge_link('GEO-boarding-hinge-base-'+str(i),(hit[0].x,-52.73,h),(1.27,-52.65,h),.045))
objects.extend(hinge_arms)
objects.append(hinge_link('GEO-boarding-hinge-axis',(1.27,-52.65,1.85),(1.27,-52.65,3.2),.028))
stage=bpy.data.objects.new('boarding-stage',None);scene.collection.objects.link(stage);stage.location=(0,-55,.08);bpy.context.view_layer.update()
for obj in objects:
 matrix=obj.matrix_world.copy();obj.parent=stage;obj.matrix_parent_inverse=Matrix.Identity(4);obj.matrix_basis=stage.matrix_world.inverted()@matrix
bpy.context.view_layer.update()
hinge=bpy.data.objects.new('boarding-door-pivot',None);scene.collection.objects.link(hinge);hinge.location=(1.27,-52.65,1.6)
bpy.context.view_layer.update();matrix=hinge.matrix_world.copy();hinge.parent=stage;hinge.matrix_parent_inverse=Matrix.Identity(4);hinge.matrix_basis=stage.matrix_world.inverted()@matrix
for obj in [door,*hinge_arms]:
 bpy.context.view_layer.update();matrix=obj.matrix_world.copy();obj.parent=hinge;obj.matrix_parent_inverse=Matrix.Identity(4);obj.matrix_basis=hinge.matrix_world.inverted()@matrix
hinge.rotation_euler.z=math.radians(-150)
bpy.context.view_layer.update()
# Derive the traverse profile from authored treads, not a straight line through risers.
stair_tree=bvh(stairs);profile=[]
for i in range(145):
 x=3.6-i*.025
 hit=stair_tree.ray_cast(Vector((x,-52,1.7)),Vector((0,0,-1)),1.7)
 if hit[0]:profile.append({'x':round(x,4),'y':round(hit[0].z-.08,5),'z':-3})
assert len(profile)>20,'tread profile must exist after hierarchy placement'
metadata={'purpose':'Unintegrated presentation-only boarding repair; not gameplay or visual acceptance','origin_three':[0,.08,55],'floor_y_local':1.52,'door_pivot_local_three':[1.27,1.52,-2.35],'door_open_radians':math.radians(-150),'stairs_factor':factor,'stairs_width_factor':1.25,'profile':profile,'original_plane_sha256':'73e289cc3b53e970a8fb980364f9227b7b2fcc9ad1360a82a20c6e1c505501f9','original_stairs_sha256':'62d23fdea58296151804c8146f031183cc17dff6c347243191f0a055d25b73be'}
# Preserve measured local coordinates on export; the runtime places this root once.
bpy.ops.object.select_all(action='DESELECT')
for obj in [stage,hinge,*objects]:obj.select_set(True)
for obj in objects:
 if obj.type=='MESH':assert all(f.material_index<len(obj.data.materials) and obj.data.materials[f.material_index] is not None for f in obj.data.polygons),'material missing: '+obj.name
# Export origin at zero without baking the original world placement twice.
stage.location=(0,0,0);bpy.context.view_layer.update()
bpy.ops.export_scene.gltf(filepath=str(root/'boarding-stage.glb'),export_format='GLB',use_selection=True,export_apply=False,export_animations=False,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=False)
stage.location=(0,-55,.08)
(root/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
print('BOARDING_EXPORT',json.dumps({'glb_bytes':(root/'boarding-stage.glb').stat().st_size,'sha256':hashlib.sha256((root/'boarding-stage.glb').read_bytes()).hexdigest()}))
if args.render:
 scene.world = bpy.data.worlds.new('BoardingWorld')
 scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
 scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.3,.34,.42,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
 for name,loc,power,size in [('key',(5,-45,12),1400,7),('fill',(7,-58,7),900,6)]:
  data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;light=bpy.data.objects.new(name,data);scene.collection.objects.link(light);light.location=loc;light.rotation_euler=(Vector((1,-52,2))-light.location).to_track_quat('-Z','Y').to_euler()
 scene.render.resolution_x=1000;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 scene.view_settings.view_transform='Standard'
 ground=box('GEO-candidate-ground',(0,-55,-.04),(25,28,.08),material('MAT-ground',(.12,.15,.18)))
 for name,pos,target,span in [('boarding-open',(9,-47.0,4.4),(1.3,-52,1.9),6.8),('boarding-side',(10,-52,3),(1.2,-52,1.9),5.5),('overall',(22,-34,15),(0,-55,2),23)]:
  data=bpy.data.cameras.new('CAM-'+name);camera=bpy.data.objects.new('CAM-'+name,data);scene.collection.objects.link(camera);camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=span;scene.camera=camera;scene.render.filepath=str(root/(name+'.png'));bpy.ops.render.render(write_still=True)
 data=bpy.data.cameras.new('CAM-distance-3x2');camera=bpy.data.objects.new('CAM-distance-3x2',data);scene.collection.objects.link(camera);camera.location=(16,-50,7);target=Vector((0,-55,2.1));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();data.type='PERSP';data.sensor_fit='VERTICAL';data.sensor_height=24;data.lens=24/(2*math.tan(math.radians(75)/2));scene.camera=camera;scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.filepath=str(root/'distance-3x2.png');bpy.ops.render.render(write_still=True)
 metadata['distance_reference']={'purpose':'Offline stage only, not integrated airport/gameplay. Existing airport capture is separate reference.','camera_three':[16,7,50],'target_three':[0,2.1,55],'distance_m':(target-camera.location).length,'vertical_fov_deg':75,'resolution':[1200,800]}
 (root/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n');bpy.ops.wm.save_as_mainfile(filepath=str(root/'candidate.blend'))
 print('BOARDING_CANDIDATE',json.dumps({'blocked_before':len(baseline),'blocked_after':len(after),'path_samples':len(profile),'glb_bytes':(root/'boarding-stage.glb').stat().st_size,'sha256':hashlib.sha256((root/'boarding-stage.glb').read_bytes()).hexdigest()}))
