"""Capturas 3:2 da geometria exportada. Blender offline; sem equivalência WebGL."""
import bpy, json, sys, math
from pathlib import Path
from mathutils import Vector
out=Path(sys.argv[sys.argv.index('--')+1]).resolve()
data=json.loads((out/'receipt.json').read_text())
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
materials={}
for item in json.loads((out/'geometry.json').read_text()):
    p=item['position'];vertices=[(p[i],-p[i+2],p[i+1]) for i in range(0,len(p),3)]
    idx=item['index'] or list(range(len(vertices)))
    mesh=bpy.data.meshes.new(item['name']);mesh.from_pydata(vertices,[],[idx[i:i+3] for i in range(0,len(idx),3)]);mesh.update()
    obj=bpy.data.objects.new(item['name'],mesh);bpy.context.collection.objects.link(obj)
    key=tuple(item['color'])+(item['roughness'],item['metalness'])
    if key not in materials:
        mat=bpy.data.materials.new('surface');mat.use_nodes=True
        bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*item['color'],1)
        bsdf.inputs['Roughness'].default_value=item['roughness'];bsdf.inputs['Metallic'].default_value=item['metalness'];materials[key]=mat
    obj.data.materials.append(materials[key])
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
scene.world.use_nodes=True;nodes=scene.world.node_tree.nodes;nodes.clear()
tex=nodes.new('ShaderNodeTexEnvironment');tex.image=bpy.data.images.load(str(out/'sky.png'))
bg=nodes.new('ShaderNodeBackground');bg.inputs['Strength'].default_value=.7
output=nodes.new('ShaderNodeOutputWorld');scene.world.node_tree.links.new(tex.outputs['Color'],bg.inputs['Color']);scene.world.node_tree.links.new(bg.outputs[0],output.inputs[0])
pos=data['look']['sol']['pos'];bpy.ops.object.light_add(type='SUN');sun=bpy.context.object
sun.rotation_euler=Vector((-pos[0],pos[2],-pos[1])).to_track_quat('-Z','Y').to_euler();sun.data.energy=1.9;sun.data.angle=math.radians(8);sun.data.color=(1,.63,.35)
def coord(v):return Vector((v[0],-v[2],v[1]))
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.lens=24;camera.data.clip_end=500
views=[('praca',[-2,1.62,2],[0,2,15]),('lateral-oeste',[-19,1.62,11],[-11.5,1.5,15]),('interior-oeste',[-11.5,1.62,12.4],[-11.5,1.62,18.5]),('interior-leste',[11.5,1.62,12.4],[14,1.4,17]),('sunset',[0,1.62,5],[-30,9,-18])]
for name,eye,target in views:
    camera.location=coord(eye);camera.rotation_euler=(coord(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(out/f'{name}.png');bpy.ops.render.render(write_still=True)
data.update({'renderer':bpy.app.version_string,'engine':'Cycles CPU 16 samples','views':views,'resolution':[1200,800]})
(out/'receipt.json').write_text(json.dumps(data,indent=2))
