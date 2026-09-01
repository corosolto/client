"""Prepara o rig CC0 de mãos para as poses/exports próprios do jogo.

Executar em background; nunca altera o .blend de procedência.
"""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'public/models/viewmodels/fpvm_arms_cc0_source.blend'
OUT = ROOT / 'public/models/viewmodels/fpvm_arms_working.blend'
PREVIEW = ROOT / 'public/models/viewmodels/fpvm_arms_working_preview.png'
TEXTURE = ROOT / 'public/models/viewmodels/fpvm_arms_cc0_source_texture.png'


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


bpy.ops.wm.open_mainfile(filepath=str(SRC))
for obj in list(bpy.context.scene.objects):
    # Os WGT são só controles visuais Rigify e não pertencem ao asset do jogo.
    if obj.name.startswith('WGT-') or obj.name == 'metarig':
        bpy.data.objects.remove(obj, do_unlink=True)
    elif obj.type in {'CAMERA', 'LIGHT'}:
        bpy.data.objects.remove(obj, do_unlink=True)

rig = bpy.data.objects['rig']
arms = bpy.data.objects['Arm']
rig.name = 'FPVM_Armature'
arms.name = 'FPVM_Arms_Gloves'

for image in bpy.data.images:
    image.filepath = str(TEXTURE)
    try:
        image.reload()
    except RuntimeError:
        pass

# O molde CC0 vem sem look final. Tecido azul-escuro e luva preta deixam as
# falanges legíveis sem parecer mão rosada/placeholder.
for mat in arms.data.materials:
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        for link in list(bsdf.inputs['Base Color'].links):
            mat.node_tree.links.remove(link)
        bsdf.inputs['Base Color'].default_value = (.035, .055, .075, 1)
        bsdf.inputs['Roughness'].default_value = .62

# Câmera de revisão em perspectiva FPS. A pose final por arma será criada nos
# arquivos de família, nunca por offsets globais no runtime.
bpy.ops.object.camera_add(location=(0, -2.2, .48))
camera = bpy.context.object
camera.data.lens = 48
look_at(camera, (0, .18, .49))
bpy.context.scene.camera = camera
for loc, energy, size in (((1.6, -1.1, 1.3), 450, 2.4), ((-1.0, -.5, .5), 220, 1.8)):
    bpy.ops.object.light_add(type='AREA', location=loc)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    look_at(light, (0, .18, .49))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.world.color = (.006, .009, .014)
scene.render.filepath = str(PREVIEW)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT))
bpy.ops.render.render(write_still=True)
