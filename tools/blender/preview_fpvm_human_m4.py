"""Prova visual da solução correta: mãos existentes e definidas, não cilindros.

Extrai somente braços/mãos do modelo humanoide já presente no projeto, conserva
os cinco dedos de cada mão e o seu esqueleto, depois o coloca com a M4 real.
É uma cena de revisão: não exporta nem altera o runtime até a pose passar no
render humano.
"""
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ARMS = ROOT / 'public/models/fparms/arms.glb'
M4 = ROOT / 'public/models/weapons/m4.glb'
OUT = ROOT / 'public/models/viewmodels/fpvm_human_m4_preview.png'
BLEND = ROOT / 'public/models/viewmodels/fpvm_human_m4_layout.blend'

ARM_GROUPS = {
    'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
    'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
}


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def crop_to_arms(mesh):
    allowed = {g.index for g in mesh.vertex_groups if g.name in ARM_GROUPS}
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    deform = bm.verts.layers.deform.active
    remove = []
    for vert in bm.verts:
        weights = vert[deform] if deform else {}
        if not any(weights.get(index, 0.0) > .08 for index in allowed):
            remove.append(vert)
    bmesh.ops.delete(bm, geom=remove, context='VERTS')
    bm.to_mesh(mesh.data)
    bm.free()


def place_weapon():
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(M4))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    roots = [obj for obj in imported if obj.parent is None]
    pivot = bpy.data.objects.new('weapon.m4.preview', None)
    bpy.context.collection.objects.link(pivot)
    for obj in roots:
        obj.parent = pivot
    # A M4 importada é longa em X; este encaixe a põe na diagonal natural de
    # primeira pessoa, com receptor entre as duas mãos e cano indo para a tela.
    pivot.rotation_euler = (.38, -.48, 1.62)
    pivot.scale = (.64, .64, .64)
    pivot.location = (0.08, 0.30, 0.12)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ARMS))
    body = bpy.data.objects['char1']
    crop_to_arms(body)
    # A prova precisa ler como equipamento tático, sem pele de boneco genérico.
    mat = body.data.materials[0]
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (.055, .075, .085, 1)
    bsdf.inputs['Roughness'].default_value = .53

    arm = bpy.data.objects['Armature']
    # O rig original tem mãos, punhos e dedos modelados; não tem ossos por dedo.
    # Nesta tomada cada mão fica travada de forma deliberada na empunhadura.
    # O importador glTF conserva este rig em centímetros (escala 0,01). Preservar
    # essa unidade evita que um corpo inteiro invada a lente ao extrair os braços.
    arm.location = (0, .32, -1.02)
    arm.rotation_euler = (1.57, 0, 0)
    arm.scale = (.010, .010, .010)
    pose = arm.pose.bones
    pose['LeftArm'].rotation_mode = 'XYZ'
    pose['LeftForeArm'].rotation_mode = 'XYZ'
    pose['RightArm'].rotation_mode = 'XYZ'
    pose['RightForeArm'].rotation_mode = 'XYZ'
    pose['LeftArm'].rotation_euler = (-.62, .25, -.38)
    pose['LeftForeArm'].rotation_euler = (-.82, -.10, .38)
    pose['RightArm'].rotation_euler = (-.45, -.18, .42)
    pose['RightForeArm'].rotation_euler = (-.98, .16, -.35)

    place_weapon()
    bpy.context.view_layer.update()

    bpy.ops.object.light_add(type='AREA', location=(-1.6, -2.0, 2.3))
    bpy.context.object.data.energy = 800
    bpy.context.object.data.shape = 'DISK'
    bpy.context.object.data.size = 3.0
    look_at(bpy.context.object, (0, .3, 0))
    bpy.ops.object.light_add(type='AREA', location=(1.4, -.9, 1.5))
    bpy.context.object.data.energy = 520
    bpy.context.object.data.size = 2.0
    look_at(bpy.context.object, (0, .3, 0))
    bpy.ops.object.camera_add(location=(0, -2.65, .42))
    camera = bpy.context.object
    camera.data.lens = 42
    look_at(camera, (0, .42, 0.04))
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.world = bpy.data.worlds.new('FPVM review world')
    scene.world.color = (.008, .012, .018)
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.render.filepath = str(OUT)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.render.render(write_still=True)


main()
