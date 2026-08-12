"""Prova visual dos 11 clipes COM PISO — Claquete Verde v5.

Defeito que este script corrige (revisão adversarial da v4, ponto 3): a v4 só
mostrou idle/walk/crouch/death, e o frame rotulado "walk" parecia ajoelhado.
Aqui TODOS os clipes fundidos no posed-source são renderizados, e o frame NÃO é
escolhido no nome nem no palpite: é medido na malha posada —

  death       -> último frame (repouso no chão)
  jump        -> frame de quadril mais alto (ápice)
  locomotion  -> frame de maior separação horizontal dos pés (meio da passada)
  idle/shoot  -> frame do meio

Cada painel tem piso visível (contato de pé se lê contra ele), câmera 3/4
frontal (lê silhueta E pegada/ADS das mãos nos clipes armados) e o nome real do
arquivo no manifest. O posed-source é obrigatório: GLB de clipe solto importa
como ação por nó-EMPTY no Blender 5.x e não anima a armadura (medido: 25 slots
'OBHips'..., hips congelado). Uso:

  Blender --background --python tmp/blender-claquete-v5-pose-evidence.py -- <posed-source.glb> <outdir>
"""
import json
import pathlib
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
source = pathlib.Path(args[0]).resolve()
out = pathlib.Path(args[1]).resolve()
out.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading='NORMALS')
scene = bpy.context.scene
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
helpers = {b.custom_shape for b in arm.pose.bones if b.custom_shape}
meshes = [o for o in scene.objects if o.type == 'MESH' and o not in helpers]

clips = sorted((a.name, a) for a in bpy.data.actions)
if not clips:
    raise RuntimeError('posed-source sem ações')

verts = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
lo = Vector(tuple(min(v[i] for v in verts) for i in range(3)))
hi = Vector(tuple(max(v[i] for v in verts) for i in range(3)))
center = (lo + hi) / 2
span = hi - lo

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.world = bpy.data.worlds.new('CV5PoseWorld')
scene.world.color = (.018, .022, .020)
scene.view_settings.look = 'AgX - Medium High Contrast'

bpy.ops.mesh.primitive_plane_add(size=10, location=(0, 0, 0))
floor = bpy.context.object
fmat = bpy.data.materials.new('CV5PoseFloor')
fmat.use_nodes = True
bsdf = fmat.node_tree.nodes['Principled BSDF']
bsdf.inputs['Base Color'].default_value = (.045, .055, .05, 1)
bsdf.inputs['Roughness'].default_value = .95
floor.data.materials.append(fmat)


def point(o, t):
    o.rotation_euler = (t - o.location).to_track_quat('-Z', 'Y').to_euler()


bpy.ops.object.camera_add()
cam = bpy.context.object
cam.data.type = 'ORTHO'
cam.data.ortho_scale = max(span) * 1.25
scene.camera = cam
for loc, energy, size in [(center + Vector((-2.2, -2.5, 3.2)), 650, 4), (center + Vector((2.4, -.8, 1.8)), 350, 3), (center + Vector((0, 2, 2.2)), 260, 2.5)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light = bpy.context.object
    light.data.energy = energy
    light.data.size = size
    point(light, center)

foot_bones = [b for b in arm.pose.bones if b.name in {'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'}]
hips_bone = arm.pose.bones.get('Hips')
LOCO = {'walk', 'run', 'crouchwalk', 'walk1h', 'walkfire'}

arm.animation_data_create()


def aplicar(action):
    arm.animation_data.action = action
    # o slot tem que pertencer à PRÓPRIA ação atribuída (Blender 5.x)
    slot = next((s for s in action.slots if s.identifier == 'OB' + arm.name), None)
    if slot is not None:
        arm.animation_data.action_slot = slot


def med(frame):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    feet = [(arm.matrix_world @ b.head) for b in foot_bones]
    hips = arm.matrix_world @ hips_bone.head if hips_bone else Vector((0, 0, 0))
    sep = max(((a - b).length for i, a in enumerate(feet) for b in feet[i + 1:]), default=0)
    return hips.z, sep


manifest = []
for name, action in clips:
    aplicar(action)
    f0, f1 = (int(action.frame_range[0]), int(max(action.frame_range[1], action.frame_range[0] + 1)))
    if name == 'death':
        frame = f1
    elif name == 'jump':
        frame = max(range(f0, f1 + 1), key=lambda f: med(f)[0])
    elif name in LOCO:
        frame = max(range(f0, f1 + 1), key=lambda f: med(f)[1])
    else:
        frame = (f0 + f1) // 2
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    cam.location = center + Vector((-1.9, -3.4, .35))
    point(cam, center + Vector((0, 0, -.05)))
    scene.render.filepath = str(out / f'pose-{name}.png')
    bpy.ops.render.render(write_still=True)
    manifest.append({'clip': name, 'frame': frame, 'frameRange': [f0, f1], 'rule': 'medido na malha posada'})

(out / 'poses-manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
print('CV5_POSES=' + str(out))
print(json.dumps(manifest))
