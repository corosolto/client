import argparse
import sys
import json
import struct
import hashlib
import math
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector

parser=argparse.ArgumentParser(description='Saci minted-coin direction prototype; does not replace game assets')
parser.add_argument('--root',required=True)
parser.add_argument('--output',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
root,out=Path(args.root),Path(args.output)
out.mkdir(parents=True,exist_ok=True)
reference=root/'references/treta-coins/saci.webp'


def material(name, color, metallic=1, roughness=.28):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return m

def finish(obj, name, mat, parent):
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    obj.parent = parent
    if obj.type == 'MESH':
        for face in obj.data.polygons:
            face.use_smooth = True
    return obj

bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
parent = bpy.data.objects.new('TRETA_Coin_1',None);bpy.context.collection.objects.link(parent)
gold = material('Gold',(.84,.62,.20),1,.40)
relief = material('ReliefGold',(.88,.65,.22),1,.40)
dark = material('RecessGold',(.12,.07,.018),1,.6)
image=bpy.data.images.load(str(reference),check_existing=True)
pixels=np.array(image.pixels[:],dtype=np.float32).reshape((image.size[1],image.size[0],4))
N=385;span=.88
heights=np.zeros((N,N));mask=np.zeros((N,N));tones=np.zeros((N,N))
# Head-only outline from the game's 256px Saci avatar, excluding neck and shirt.
outline=[(87,8),(128,7),(156,13),(175,31),(184,57),(192,103),(214,105),(205,130),(186,152),(180,172),(166,190),(143,204),(123,203),(103,197),(86,183),(76,163),(65,148),(45,122),(40,112),(64,122),(68,105),(60,135),(54,170),(46,200),(38,211),(34,201),(37,165),(39,119),(45,73),(54,40),(69,18)]
for _ in range(2):
    rounded=[]
    for i,a in enumerate(outline):
        b=outline[(i+1)%len(outline)]
        rounded.extend([(a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25),(a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75)])
    outline=rounded
def inside(px,py):
    parity=False
    for i,(ax,ay) in enumerate(outline):
        bx,by=outline[(i+1)%len(outline)]
        if (ay>py)!=(by>py) and px<(bx-ax)*(py-ay)/(by-ay)+ax:parity=not parity
    return parity
for ix in range(N):
    x=-span+ix*2*span/(N-1)
    for iz in range(N):
        z=-span+iz*2*span/(N-1)
        px=128+x/.0063;py=106-(z-.025)/.0069
        if inside(px,py):
            color=pixels[min(image.size[1]-1,max(0,int((255-py)*image.size[1]/256))),min(image.size[0]-1,max(0,int(px*image.size[0]/256)))][:3]
            lum=float(np.dot(color,(.2126,.7152,.0722)))
            tones[ix,iz]=lum;mask[ix,iz]=1
            head=.024*math.exp(-((px-128)/47)**2-((py-158)/46)**2)
            nose=.026*math.exp(-((px-130)/13)**2-((py-157)/11)**2)
            cheeks=.013*sum(math.exp(-((px-cx)/16)**2-((py-164)/20)**2) for cx in (98,159))
            cap=.028*math.exp(-((px-128)/62)**2-((py-60)/66)**2)
            sockets=.010*sum(math.exp(-((px-cx)/12)**2-((py-135)/7)**2) for cx in (98,153))
            heights[ix,iz]=.009+head+nose+cheeks+cap-sockets+.007*(lum-.20)
# A sampled die integrates the silhouette into the field instead of a floating head mesh.
for _ in range(4):
    for grid in (heights,mask):
        padded=np.pad(grid,1,mode='edge')
        grid[:]=(4*padded[1:-1,1:-1]+2*(padded[2:,1:-1]+padded[:-2,1:-1]+padded[1:-1,2:]+padded[1:-1,:-2])+(padded[2:,2:]+padded[:-2,:-2]+padded[2:,:-2]+padded[:-2,2:]))/16
broad=heights.copy()
for _ in range(80):
    padded=np.pad(broad,1,mode='edge')
    broad[:]=(4*padded[1:-1,1:-1]+2*(padded[2:,1:-1]+padded[:-2,1:-1]+padded[1:-1,2:]+padded[1:-1,:-2])+(padded[2:,2:]+padded[:-2,:-2]+padded[2:,:-2]+padded[:-2,2:]))/16
heights[:]=np.maximum(0,heights+.35*(heights-broad)*mask)
stride=2
verts=[];indices={};faces=[]
for ix in range(0,N,stride):
    x=-span+ix*2*span/(N-1)
    for iz in range(0,N,stride):
        z=-span+iz*2*span/(N-1)
        if x*x+z*z>span*span:continue
        indices[ix,iz]=len(verts);verts.append((x,-.084-heights[ix,iz],z))
for ix in range(0,N-1,stride):
    for iz in range(0,N-1,stride):
        c=[(ix,iz),(ix+stride,iz),(ix+stride,iz+stride),(ix,iz+stride)]
        if all(a in indices for a in c):faces.append([indices[a] for a in c])
mesh=bpy.data.meshes.new('MintedFace');mesh.from_pydata(verts,[],faces);mesh.update()
uvs=mesh.uv_layers.new(name='DieUV')
for loop in mesh.loops:
    v=mesh.vertices[loop.vertex_index].co
    uvs.data[loop.index].uv=((v.x+span)/(2*span),(v.z+span)/(2*span))
face=bpy.data.objects.new('GEO-ContinuousPortraitDie',mesh);bpy.context.collection.objects.link(face)
finish(face,face.name,relief,parent)
# The original UV portrait becomes monochrome minted detail, baked into the asset.
base=np.zeros((N,N,4),dtype=np.float32)
for ix in range(N):
    for iz in range(N):
        m=mask[ix,iz]
        tone=.14+.86*min(1,max(0,tones[ix,iz]/.36))**.65
        field=np.array([.43,.30,.085]);raised=np.array([.88,.65,.22])
        base[iz,ix,:3]=field*(1-m)+raised*m*tone
        base[iz,ix,3]=1
img=bpy.data.images.new('CoinPortraitGold',width=N,height=N,alpha=True)
base[:,:,:3]=np.where(base[:,:,:3]<=.0031308,base[:,:,:3]*12.92,1.055*base[:,:,:3]**(1/2.4)-.055)
img.pixels.foreach_set(base.ravel());img.filepath_raw=str(out/'saci-gold-die.png');img.file_format='PNG';img.save();img.pack()
node=relief.node_tree.nodes.new('ShaderNodeTexImage');node.image=img
relief.node_tree.links.new(node.outputs['Color'],relief.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
bpy.context.view_layer.objects.active=face
step=2*span/(N-1);gx,gz=np.gradient(heights,step,step)
normals=[]
for loop in face.data.loops:
    v=face.data.vertices[loop.vertex_index].co
    ix=min(N-1,max(0,int(round((v.x+span)/step))));iz=min(N-1,max(0,int(round((v.z+span)/step))))
    normals.append(Vector((-gx[ix,iz],-1,-gz[ix,iz])).normalized())
face.data.normals_split_custom_set(normals)
# Outer chamfer and relief share a coherent thickness.
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=1,depth=.16,rotation=(math.pi/2,0,0))
disk=finish(bpy.context.object,'GEO-CoinBlank',gold,parent)
mod=disk.modifiers.new('Chamfer','BEVEL');mod.width=.025;mod.segments=4
bpy.context.view_layer.objects.active=disk;bpy.ops.object.modifier_apply(modifier=mod.name)
# Flat faces stay flat; only the curved rim interpolates normals.
for p in disk.data.polygons:p.use_smooth=len(p.vertices)==4
for side in (-1,1):
    for radius,thickness,y,mat in ((.937,.035,.083,gold),(.880,.009,.085,dark)):
        bpy.ops.mesh.primitive_torus_add(major_segments=128,minor_segments=8,major_radius=radius,minor_radius=thickness,location=(0,side*y,0),rotation=(math.pi/2,0,0))
        finish(bpy.context.object,'GEO-EngravedRim',mat,parent)
for i in range(96):
    a=i*math.tau/96
    bpy.ops.mesh.primitive_cube_add(size=1,location=(.997*math.cos(a),0,.997*math.sin(a)))
    o=bpy.context.object;o.scale=(.006,.103,.012);o.rotation_euler=(0,-a,0)
    finish(o,'GEO-EdgeReed',dark,parent)
# A recessed field makes the reverse figure readable in the same gold family.
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=.879,depth=.004,location=(0,.081,0),rotation=(math.pi/2,0,0))
finish(bpy.context.object,'GEO-ReverseField',gold,parent)
font=bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial Black.ttf')
def letters(label,z,size):
    c=bpy.data.curves.new('MintLegend','FONT');c.body=label;c.font=font;c.align_x='CENTER';c.align_y='CENTER';c.size=size;c.extrude=.006;c.bevel_depth=.002;c.bevel_resolution=3
    o=bpy.data.objects.new('GEO-Value',c);bpy.context.collection.objects.link(o);o.location=(0,.087,z);o.rotation_euler=(math.pi/2,0,math.pi)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);finish(o,o.name,dark,parent)
letters('1',.20,1.03);letters('T$',-.39,.43)
materials={o.data.materials[0] for o in parent.children_recursive if o.type=='MESH'}
for mat in materials:
    objects=[o for o in parent.children_recursive if o.type=='MESH' and o.data.materials[0]==mat]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
parent.rotation_euler = (0, 0, 0)
for frame, angle in [(1, 0), (121, math.tau)]:
    parent.rotation_euler.z = angle
    parent.keyframe_insert('rotation_euler', frame=frame)
spin = parent.animation_data.action
spin.name = 'CoinSpin'
for slot in spin.slots:
    for layer in spin.layers:
        for strip in layer.strips:
            bag = strip.channelbag(slot)
            if bag:
                for curve in bag.fcurves:
                    for point in curve.keyframe_points:
                        point.interpolation = 'LINEAR'
parent.animation_data.action = None
for frame, scale, angle in [(1, .05, -math.pi), (20, 1.12, -.3), (32, 1, 0), (60, 1, 0)]:
    parent.scale = (scale,) * 3
    parent.rotation_euler.z = angle
    parent.keyframe_insert('scale', frame=frame)
    parent.keyframe_insert('rotation_euler', frame=frame)
reveal = parent.animation_data.action
reveal.name = 'PurchaseReveal'
parent.animation_data.action = None
for action in (spin, reveal):
    track = parent.animation_data.nla_tracks.new()
    track.name = action.name
    track.strips.new(action.name, int(action.frame_range[0]), action)
    track.mute = False
scene = bpy.context.scene
scene.render.fps, scene.frame_start, scene.frame_end = 30, 1, 121
for track in parent.animation_data.nla_tracks:
    track.mute = True
parent.rotation_euler, parent.scale = (0, 0, 0), (1, 1, 1)
scene.frame_set(1)
asset_objects = [parent] + list(parent.children_recursive)
bpy.ops.object.select_all(action='DESELECT')
for obj in asset_objects:
    obj.select_set(True)
for track in parent.animation_data.nla_tracks:
    track.mute = False
glb = out / 'coin-1.glb'
glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True, export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_apply=False, export_lights=False, export_cameras=False)
raw = glb.read_bytes(); length = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20+length])
node = next(n for n in doc['nodes'] if n.get('name') == parent.name)
node['scale'], node['rotation'] = [1,1,1], [0,0,0,1]
chunk = json.dumps(doc,separators=(',',':')).encode();chunk += b' '*(-len(chunk)%4)
tail = raw[20+length:]
glb.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(chunk)+len(tail))+struct.pack('<I4s',len(chunk),b'JSON')+chunk+tail)
for track in parent.animation_data.nla_tracks:
    track.mute = True
parent.rotation_euler, parent.scale = (0, 0, 0), (1, 1, 1)


scene=bpy.context.scene
bpy.ops.object.camera_add(location=(0,-4.8,0));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.3;scene.camera=cam
cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.55,.55,.55,1);bg.inputs['Strength'].default_value=.9
for pos,energy,size in [((-2,-3,3),320,2.3),((3,-2,0),220,4),((0,-2,-3),80,3),((-2,3,3),320,2.3),((3,2,0),220,4)]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.render.resolution_x=scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
for label,pos in [('front',(0,-4.8,0)),('angle',(1.5,-4.8,1.2)),('back',(0,4.8,0))]:
    cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/f'saci-{label}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'coin-1.blend'))
metadata={'value':1,'character':'saci','scope':'design-prototype-not-owner-approved','source':'references/treta-coins/saci.webp','sourceSha256':hashlib.sha256(reference.read_bytes()).hexdigest(),'glbBytes':glb.stat().st_size,'glbSha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'animations':['CoinSpin','PurchaseReveal'],'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in asset_objects if o.type=='MESH')}
(out/'coin-1.json').write_text(json.dumps(metadata,indent=2))
print('PROTOTYPE_DONE',json.dumps(metadata))
