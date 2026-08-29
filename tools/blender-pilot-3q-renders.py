"""Renderiza os pilotos em três ângulos 3/4 sem browser.

Uso: blender --background --python tools/blender-pilot-3q-renders.py -- asset.glb out-dir receipt.json
"""
import hashlib, json, pathlib, sys
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(argv) != 3: raise SystemExit('uso: ... -- asset.glb out-dir receipt.json')
source, output, receipt = pathlib.Path(argv[0]).resolve(), pathlib.Path(argv[1]).resolve(), pathlib.Path(argv[2]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading='NORMALS')
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.name != 'Icosphere']
points = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
center = (minimum + maximum) * .5; span = maximum - minimum; distance = max(span) * 1.8
scene = bpy.context.scene; scene.render.engine = 'BLENDER_EEVEE'; scene.render.resolution_x = 800; scene.render.resolution_y = 800
scene.render.resolution_percentage = 100; scene.render.image_settings.file_format = 'PNG'; scene.world = bpy.data.worlds.new('Pilot3QWorld'); scene.world.color = (.028, .031, .040)
def point_at(obj, target): obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()
for offset, energy, size in [((-2.4,-2.8,3.2),1300,4),((2.6,-.8,2.0),850,3),((0,2.2,2.4),650,3)]:
    bpy.ops.object.light_add(type='AREA', location=center + Vector(offset)); light=bpy.context.object; light.data.energy=energy; light.data.shape='DISK'; light.data.size=size; point_at(light,center)
bpy.ops.object.camera_add(); camera=bpy.context.object; camera.data.lens=58; scene.camera=camera
output.mkdir(parents=True, exist_ok=True); renders=[]
for label, direction in [('front-left-3q', Vector((-0.62,-1,.12))), ('front-right-3q', Vector((.62,-1,.12))), ('back-right-3q', Vector((.62,1,.08)))]:
    camera.location = center + direction.normalized() * distance; point_at(camera, center + Vector((0,0,span.z*.03)))
    path = output / f'{source.stem}-{label}.png'; scene.render.filepath=str(path); bpy.ops.render.render(write_still=True); renders.append(str(path))
data={'source':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'blender':bpy.app.version_string,
    'method':'Blender EEVEE, câmera 58 mm, três ângulos 3/4; sem browser', 'renders':renders}
receipt.parent.mkdir(parents=True, exist_ok=True); receipt.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'PILOT_3Q_RENDERS={output}')
