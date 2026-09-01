"""Monta uma cena de revisão com o molde FP e a M4 real do arsenal.

É uma ferramenta de enquadramento, não uma exportação de jogo. A arma continua
separada do rig até que os sockets e as poses sejam aprovados visualmente.
"""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'public/models/viewmodels/fpvm_base_rig.blend'
M4 = ROOT / 'public/models/weapons/m4.glb'
OUT = ROOT / 'public/models/viewmodels/fpvm_m4_layout_preview.png'


def bounds(objects):
    pts = []
    for obj in objects:
        if obj.type != 'MESH':
            continue
        pts.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


bpy.ops.wm.open_mainfile(filepath=str(BASE))
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(M4))
imported = [obj for obj in bpy.context.scene.objects if obj not in before]
mesh = [obj for obj in imported if obj.type == 'MESH']
print('M4 original bounds:', *bounds(mesh))

group = bpy.data.objects.new('weapon.m4.preview', None)
bpy.context.collection.objects.link(group)
for obj in imported:
    if obj.parent is None:
        obj.parent = group

# A M4 de chão nasce em convenção diferente. Este é um primeiro encaixe de autoria:
# cano para frente (+Y), grip próximo da mão direita e guarda-mão na mão esquerda.
# O eixo longo da M4 importada é X. Em primeira pessoa ele avança, sobe e vai um
# pouco para a esquerda na tela, em vez de ficar apontado direto para a lente.
group.rotation_mode = 'QUATERNION'
group.rotation_quaternion = Vector((1, 0, 0)).rotation_difference(Vector((-.62, .68, .39)).normalized())
group.scale = (.84, .84, .84)
group.location = (.13, .32, -.13)
bpy.context.view_layer.update()
print('M4 positioned bounds:', *bounds(mesh))

bpy.context.scene.render.filepath = str(OUT)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'public/models/viewmodels/fpvm_m4_layout.blend'))
bpy.ops.render.render(write_still=True)
