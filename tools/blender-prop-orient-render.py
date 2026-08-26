"""Renderiza um GLB em 6 vistas ORTOGRÁFICAS pelos eixos do glTF, sem browser.

Serve para decidir orientação de integração (qual eixo é a frente, para onde a copa
cai, onde a faixa fica) sem abrir o jogo. Os rótulos são eixos do glTF (Y-up), não
de Blender: o importador converte glTF (x,y,z) -> Blender (x,-z,y) e este script
desfaz a conversão ao posicionar a câmera.

Uso: blender --background --python tools/blender-prop-orient-render.py -- asset.glb out-dir
"""
import pathlib, sys
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(argv) != 2: raise SystemExit('uso: ... -- asset.glb out-dir')
source, output = pathlib.Path(argv[0]).resolve(), pathlib.Path(argv[1]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading='NORMALS')
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
pts = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
mn = Vector(tuple(min(p[a] for p in pts) for a in range(3)))
mx = Vector(tuple(max(p[a] for p in pts) for a in range(3)))
center, span = (mn + mx) * .5, mx - mn
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = scene.render.resolution_y = 640
scene.render.image_settings.file_format = 'PNG'
scene.world = bpy.data.worlds.new('OrientWorld'); scene.world.color = (.03, .03, .04)


def point_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()


for off, energy in [((-2.4, -2.8, 3.2), 1400), ((2.6, -.8, 2.0), 900), ((0, 2.2, 2.4), 700)]:
    bpy.ops.object.light_add(type='AREA', location=center + Vector(off))
    lt = bpy.context.object; lt.data.energy = energy; lt.data.size = 4; point_at(lt, center)
bpy.ops.object.camera_add(); cam = bpy.context.object
cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(span) * 1.15
scene.camera = cam
output.mkdir(parents=True, exist_ok=True)
# rótulo = eixo do glTF de onde a câmera olha; vetor = mesma direção em Blender
VISTAS = [('gltf+X', Vector((1, 0, 0))), ('gltf-X', Vector((-1, 0, 0))),
          ('gltf+Y-topo', Vector((0, 0, 1))), ('gltf-Y-base', Vector((0, 0, -1))),
          ('gltf+Z', Vector((0, -1, 0))), ('gltf-Z', Vector((0, 1, 0)))]
for nome, direcao in VISTAS:
    cam.location = center + direcao * (max(span) * 3)
    point_at(cam, center)
    scene.render.filepath = str(output / f'{source.stem}-{nome}.png')
    bpy.ops.render.render(write_still=True)
print(f'ORIENT_RENDERS={output}')
