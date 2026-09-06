"""Renderiza a geometria efetiva de createLajes14Bis exportada pela régua Node.
Uso: Blender --background --python tools/render-lajes-santos.py
"""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/lajes-visual/v7/santos'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for item in json.loads((OUT/'geometry.json').read_text()):
    p=item['position']; vertices=[(p[i],-p[i+2],p[i+1]) for i in range(0,len(p),3)]
    idx=item['index'] or list(range(len(vertices))); faces=[idx[i:i+3] for i in range(0,len(idx),3)]
    mesh=bpy.data.meshes.new(item['name']);mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new('GEO-'+item['name'],mesh);bpy.context.collection.objects.link(obj)
    mat=bpy.data.materials.new(item['name']);mat.diffuse_color=(*item['color'],1);mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*item['color'],1);bsdf.inputs['Roughness'].default_value=item['roughness'];bsdf.inputs['Metallic'].default_value=item['metalness'];obj.data.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1500;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.37,.49,.6,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
scene.view_settings.view_transform='AgX'
def area(name,location,power,size):
    bpy.ops.object.light_add(type='AREA',location=location);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('KEY',(2,-8,12),2300,8);area('FILL',(-8,-1,4),1200,8);area('RIM',(0,10,8),1800,6)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=17
for name,eye,target in [('quarter',(13,-15,8),(0,-.7,.6)),('underside',(13,-15,-8),(0,-.7,.6)),('side',(18,0,3),(0,-.7,.6))]:
    camera.location=eye;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/f'{name}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lajes-14bis-review.blend'))
