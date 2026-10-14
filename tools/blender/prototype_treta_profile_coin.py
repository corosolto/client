import argparse
import sys
import json
import struct
import hashlib
import math
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, Quaternion

parser=argparse.ArgumentParser(description='Saci classic profile coin prototype; does not replace game assets')
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
gold = material('CoinGold',(.83,.60,.17),1,.37)
relief = gold
dark = gold
# Original analytical sculpt: Saci avatar identity, classic right-facing die.
# No photo texture or royal portrait is transferred to this geometry.
outline=[(-.29,.66),(-.12,.69),(.05,.62),(.14,.48),(.16,.28),(.13,.18),(.20,.12),(.19,.01),(.30,-.045),(.34,-.08),(.32,-.12),(.22,-.145),(.24,-.20),(.28,-.225),(.275,-.265),(.225,-.28),(.23,-.32),(.20,-.405),(.10,-.455),(-.07,-.445),(-.22,-.34),(-.29,-.17),(-.32,-.11),(-.40,.045),(-.29,.12),(-.32,.20),(-.355,.025),(-.40,-.18),(-.465,-.37),(-.54,-.43),(-.445,-.425),(-.40,-.39),(-.33,-.24),(-.34,.005),(-.43,.22),(-.415,.39),(-.36,.55)]
for _ in range(2):
    rounded=[]
    for i,a in enumerate(outline):
        b=outline[(i+1)%len(outline)]
        rounded.extend([(.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]),(.25*a[0]+.75*b[0],.25*a[1]+.75*b[1])])
    outline=rounded
def inside(x,z):
    parity=False
    for i,(ax,az) in enumerate(outline):
        bx,bz=outline[(i+1)%len(outline)]
        if (az>z)!=(bz>z) and x<(bx-ax)*(z-az)/(bz-az)+ax:parity=not parity
    return parity
def dome(x,z,cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
N=385;span=.952
heights=np.zeros((N,N));mask=np.zeros((N,N))
for ix in range(N):
    for iz in range(N):
        x=-span+ix*2*span/(N-1);z=-span+iz*2*span/(N-1)
        if not inside(x,z):continue
        mask[ix,iz]=1
        h=.009+.048*dome(x,z,-.03,-.08,.25,.33)
        h+=.042*dome(x,z,.06,-.225,.15,.16)+.045*dome(x,z,.1,-.36,.12,.10)
        h+=.055*dome(x,z,-.12,.44,.28,.33) # folded cap
        h+=.036*dome(x,z,-.375,.14,.075,.28) # dangling cap tail
        h+=.053*dome(x,z,-.235,-.018,.095,.10) # pointed ear
        h-=.023*dome(x,z,-.24,-.02,.035,.052)
        h+=.026*dome(x,z,.13,.075,.064,.031) # brow
        h-=.021*dome(x,z,.148,.014,.035,.014) # eye socket
        h+=.01*dome(x,z,.16,.004,.018,.008) # lower eyelid
        h+=.045*dome(x,z,.215,-.073,.09,.07) # nose
        h-=.015*dome(x,z,.225,-.115,.033,.014) # nostril
        h+=.022*dome(x,z,.218,-.225,.071,.022) # upper lip
        h-=.016*dome(x,z,.218,-.255,.069,.012) # mouth slit
        h+=.024*dome(x,z,.214,-.283,.065,.022) # lower lip
        h-=.010*dome(x,z,.125,-.315,.057,.020)
        h-=.009*dome(x,z,.094,-.166,.024,.055) # smile fold
        if -.29<x<.15:
            band=.195+.085*(x+.29)
            h-=.009*math.exp(-((z-band)/.011)**2)
            h+=.010*math.exp(-((z-band-.018)/.016)**2)
        if z>.27:
            fold=-.285+.17*((z-.27)/.42)**2
            h-=.009*math.exp(-((x-fold)/.011)**2)
        heights[ix,iz]=max(.002,h)*.65
# Soft die transition, without painted outlines or a separate protruding head.
for _ in range(2):
    for grid in (heights,mask):
        p=np.pad(grid,1,mode='edge')
        grid[:]=(4*p[1:-1,1:-1]+2*(p[2:,1:-1]+p[:-2,1:-1]+p[1:-1,2:]+p[1:-1,:-2])+p[2:,2:]+p[:-2,:-2]+p[2:,:-2]+p[:-2,2:])/16
# Carved die strokes after smoothing keep brows, ear and grin crisp.
def stroke(x,z,points,width):
    result=1e9
    for a,b in zip(points,points[1:]):
        dx,dz=b[0]-a[0],b[1]-a[1]
        t=min(1,max(0,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)))
        result=min(result,math.hypot(x-a[0]-t*dx,z-a[1]-t*dz))
    return math.exp(-(result/width)**2)
for ix in range(N):
    for iz in range(N):
        if mask[ix,iz]<.95:continue
        x=-span+ix*2*span/(N-1);z=-span+iz*2*span/(N-1)
        heights[ix,iz]-=.009*stroke(x,z,[(.075,.071),(.11,.073),(.154,.048),(.174,.028)],.009)
        heights[ix,iz]-=.007*stroke(x,z,[(.116,.013),(.149,.017),(.177,.001)],.007)
        heights[ix,iz]-=.011*stroke(x,z,[(-.305,.065),(-.195,-.016),(-.25,-.092),(-.29,-.062)],.010)
        heights[ix,iz]-=.010*stroke(x,z,[(.10,-.211),(.16,-.237),(.215,-.245),(.265,-.233)],.008)
        heights[ix,iz]=max(.001,heights[ix,iz])
# A square-to-disc grid keeps the circular field closed and the portrait dense.
def grid_sample(grid,x,z):
    u=(x+span)/(2*span)*(N-1);v=(z+span)/(2*span)*(N-1)
    ix=min(N-2,max(0,int(u)));iz=min(N-2,max(0,int(v)));fu,fv=u-ix,v-iz
    return grid[ix,iz]*(1-fu)*(1-fv)+grid[ix+1,iz]*fu*(1-fv)+grid[ix,iz+1]*(1-fu)*fv+grid[ix+1,iz+1]*fu*fv
side=193;verts=[];faces=[]
for i in range(side):
    u=-1+2*i/(side-1)
    for j in range(side):
        v=-1+2*j/(side-1);x=span*u*math.sqrt(1-v*v/2);z=span*v*math.sqrt(1-u*u/2)
        verts.append((x,-.084-grid_sample(heights,x,z),z))
for i in range(side-1):
    for j in range(side-1):
        k=i*side+j;faces.append((k,k+side,k+side+1,k+1))
mesh=bpy.data.meshes.new('MintedFace');mesh.from_pydata(verts,[],faces);mesh.update()
uvs=mesh.uv_layers.new(name='DieUV')
for loop in mesh.loops:
    v=mesh.vertices[loop.vertex_index].co
    uvs.data[loop.index].uv=((v.x+span)/(2*span),(v.z+span)/(2*span))
face=bpy.data.objects.new('GEO-ContinuousPortraitDie',mesh);bpy.context.collection.objects.link(face)
finish(face,face.name,relief,parent)
# Geometry-derived cavity shading for an engine without per-icon contact shadows.
# This contains no photograph/portrait pixels; field and relief keep one gold alloy.
relief=gold.copy();relief.name='CoinGoldDieCavity';face.data.materials[0]=relief
padded=np.pad(heights,1,mode='edge')
lap=padded[2:,1:-1]+padded[:-2,1:-1]+padded[1:-1,2:]+padded[1:-1,:-2]-4*heights
cavity=1-.65*np.clip(lap/.0025,0,1)
base=np.empty((N,N,4),dtype=np.float32)
for ix in range(N):
    for iz in range(N):
        base[iz,ix,:3]=np.array([.83,.60,.17])*float(cavity[ix,iz]);base[iz,ix,3]=1
base[:,:,:3]=np.where(base[:,:,:3]<=.0031308,base[:,:,:3]*12.92,1.055*base[:,:,:3]**(1/2.4)-.055)
img=bpy.data.images.new('GeometryDieCavity',width=N,height=N,alpha=True)
img.pixels.foreach_set(base.ravel());img.filepath_raw=str(out/'saci-geometry-cavity.png');img.file_format='PNG';img.save();img.pack()
node=relief.node_tree.nodes.new('ShaderNodeTexImage');node.image=img
relief.node_tree.links.new(node.outputs['Color'],relief.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
bpy.context.view_layer.objects.active=face
step=2*span/(N-1);gx,gz=np.gradient(heights,step,step)
normals=[]
for loop in face.data.loops:
    v=face.data.vertices[loop.vertex_index].co
    ix=min(N-1,max(0,int(round((v.x+span)/step))));iz=min(N-1,max(0,int(round((v.z+span)/step))))
    normals.append(Vector((-grid_sample(gx,v.x,v.z),-1,-grid_sample(gz,v.x,v.z))).normalized())
face.data.normals_split_custom_set(normals)
# Outer chamfer and relief share a coherent thickness.
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=1,depth=.16,rotation=(math.pi/2,0,0))
disk=finish(bpy.context.object,'GEO-CoinBlank',gold,parent)
mod=disk.modifiers.new('Chamfer','BEVEL');mod.width=.025;mod.segments=4
bpy.context.view_layer.objects.active=disk;bpy.ops.object.modifier_apply(modifier=mod.name)
# Flat faces stay flat; only the curved rim interpolates normals.
for p in disk.data.polygons:p.use_smooth=len(p.vertices)==4
for side in (-1,1):
    for radius,thickness,y,mat in ((.970,.018,.083,gold),):
        bpy.ops.mesh.primitive_torus_add(major_segments=128,minor_segments=8,major_radius=radius,minor_radius=thickness,location=(0,side*y,0),rotation=(math.pi/2,0,0))
        finish(bpy.context.object,'GEO-EngravedRim',mat,parent)
for i in range(96):
    a=i*math.tau/96
    bpy.ops.mesh.primitive_cube_add(size=1,location=(.997*math.cos(a),0,.997*math.sin(a)))
    o=bpy.context.object;o.scale=(.006,.103,.012);o.rotation_euler=(0,-a,0)
    finish(o,'GEO-EdgeReed',dark,parent)
# A recessed field makes the reverse figure readable in the same gold family.
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=.949,depth=.004,location=(0,.081,0),rotation=(math.pi/2,0,0))
finish(bpy.context.object,'GEO-ReverseField',gold,parent)
font=bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Times New Roman.ttf')
def letters(label,z,size):
    c=bpy.data.curves.new('MintLegend','FONT');c.body=label;c.font=bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf');c.align_x='CENTER';c.align_y='CENTER';c.size=size;c.extrude=.018;c.bevel_depth=.002;c.bevel_resolution=2;c.resolution_u=8
    o=bpy.data.objects.new('GEO-Value',c);bpy.context.collection.objects.link(o);o.location=(0,.087,z);o.rotation_euler=(math.pi/2,0,math.pi)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);finish(o,o.name,dark,parent)
letters('1',.16,1.18);letters('T$',-.44,.40)
# Circular upright serif legend in the same alloy as the portrait/field.
def arc_legend(label,center,step,radius=.825):
    for i,char in enumerate(label):
        angle=center+(i-(len(label)-1)/2)*step
        c=bpy.data.curves.new('MintArc','FONT');c.body=char;c.font=font;c.align_x=c.align_y='CENTER';c.size=.195;c.extrude=.007;c.bevel_depth=.0015;c.bevel_resolution=2;c.resolution_u=8
        o=bpy.data.objects.new('GEO-CircularLegend',c);bpy.context.collection.objects.link(o);o.location=(radius*math.sin(angle),-.088,radius*math.cos(angle));o.rotation_mode='QUATERNION';o.rotation_quaternion=Quaternion((0,1,0),angle+(math.pi if center>1 else 0)) @ Quaternion((1,0,0),math.pi/2)
        bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);finish(o,o.name,gold,parent)
arc_legend('TRETA$',0,.22)
arc_legend('SACI',math.pi,-.21)
materials={o.data.materials[0] for o in parent.children_recursive if o.type=='MESH'}
for mat in materials:
    objects=[o for o in parent.children_recursive if o.type=='MESH' and o.data.materials[0]==mat]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
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
for frame, scale, angle in [(1, .05, -math.pi), (20, 1.07, -.3), (32, 1, 0), (60, 1, 0)]:
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
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.55,.55,.55,1);bg.inputs['Strength'].default_value=.45
for pos,energy,size in [((-2,-3,3),320,2.2),((3,-2,0),100,4),((0,-2,-3),80,3),((-2,3,3),320,2.2),((3,2,0),100,4)]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.render.resolution_x=scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
for label,pos in [('front',(0,-4.8,0)),('angle',(1.5,-4.8,1.2)),('back',(0,4.8,0))]:
    cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/f'saci-{label}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'coin-1.blend'))
metadata={'value':1,'character':'saci','scope':'design-prototype-not-owner-approved','source':'references/treta-coins/saci.webp','sculpt':'original analytical right-facing profile inspired by avatar','style':'profile-v4-classic-cunhagem','sourceSha256':hashlib.sha256(reference.read_bytes()).hexdigest(),'glbBytes':glb.stat().st_size,'glbSha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'animations':['CoinSpin','PurchaseReveal'],'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in asset_objects if o.type=='MESH')}
(out/'coin-1.json').write_text(json.dumps(metadata,indent=2))
print('PROTOTYPE_DONE',json.dumps(metadata))
