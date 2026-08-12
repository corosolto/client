"""Sonda de identidade a 150px — Claquete Verde v5.

Réguas visuais desta base já enganaram 4× medindo declaração em vez de pixel
(AGENTS.md, lei 3/4). Esta sonda NÃO lê geometria: renderiza o GLB em EEVEE com
materiais trocados por emissão pura (faixa=vermelho, dobradiça=verde, resto
preto), no MESMO enquadramento do cartão servido (tmp/blender-claquete-verde-150.py:
ortho 2.02, 150×150), e conta pixels de cada cor nos 3 ângulos.

Saída: JSON {front|left|back: {stripePx, hingePx}}. Os tetos ficam no gate
(tmp/claquete-verde-v5-gate.mjs) com a procedência medida.

  Blender --background --python tmp/blender-claquete-v5-identity-probe.py -- <modelo.glb> <saida.json> [dir-pngs]
"""
import json
import pathlib
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
source = pathlib.Path(args[0]).resolve()
out_json = pathlib.Path(args[1]).resolve()
out_png = pathlib.Path(args[2]).resolve() if len(args) > 2 else None
if out_png:
    out_png.mkdir(parents=True, exist_ok=True)
out_json.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading='NORMALS')
scene = bpy.context.scene
arms = [o for o in scene.objects if o.type == 'ARMATURE']
helpers = {b.custom_shape for a in arms for b in a.pose.bones if b.custom_shape}
meshes = [o for o in scene.objects if o.type == 'MESH' and o not in helpers]


def emission(name, rgb):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out_node = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*rgb, 1)
    em.inputs['Strength'].default_value = 1.0
    nt.links.new(em.outputs['Emission'], out_node.inputs['Surface'])
    return m


MAT_STRIPE = emission('PROBE_STRIPE', (1, 0, 0))
MAT_HINGE = emission('PROBE_HINGE', (0, 1, 0))
MAT_BLACK = emission('PROBE_BLACK', (0, 0, 0))

for o in meshes:
    for i, slot in enumerate(o.data.materials):
        nm = (slot.name if slot else '').upper()
        if 'STRIPE' in nm:
            o.data.materials[i] = MAT_STRIPE
        elif 'HINGE' in nm:
            o.data.materials[i] = MAT_HINGE
        else:
            o.data.materials[i] = MAT_BLACK

v = [o.matrix_world @ p.co for o in meshes for p in o.data.vertices]
lo = Vector(tuple(min(q[i] for q in v) for i in range(3)))
hi = Vector(tuple(max(q[i] for q in v) for i in range(3)))
center = (lo + hi) / 2

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = scene.render.resolution_y = 150
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.look = 'None'
scene.view_settings.view_transform = 'Standard'


def point(o, t):
    o.rotation_euler = (t - o.location).to_track_quat('-Z', 'Y').to_euler()


bpy.ops.object.camera_add()
cam = bpy.context.object
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 2.02  # mesmo enquadramento do cartão servido
scene.camera = cam

result = {}
# 'padside' é +X (lado anatômico esquerdo, onde a ombreira está). O perfil -X é
# o ombro direito — o contrato exige esse ombro LIVRE de prop, então ali a
# ombreira some mesmo, e tem que sumir.
for label, d in [('front', Vector((0, -1, 0))), ('padside', Vector((1, 0, 0))), ('back', Vector((0, 1, 0)))]:
    cam.location = center + d * 4
    point(cam, center)
    png = (out_png / f'{label}.png') if out_png else (out_json.parent / f'.probe-{label}.png')
    scene.render.filepath = str(png)
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(str(png))
    px = list(img.pixels)
    stripe = hinge = 0
    for i in range(0, len(px), 4):
        r, g, b, a = px[i], px[i + 1], px[i + 2], px[i + 3]
        if a < 0.5:
            continue
        if r > 0.75 and g < 0.30 and b < 0.30:
            stripe += 1
        elif g > 0.75 and r < 0.30 and b < 0.30:
            hinge += 1
    result[label] = {'stripePx': stripe, 'hingePx': hinge}
    bpy.data.images.remove(img)
    if not out_png:
        pathlib.Path(png).unlink()

out_json.write_text(json.dumps({'file': str(source), 'orthoScale': 2.02, 'cardPx': 150, 'views': result}, indent=1) + '\n')
print('CV5_IDENTITY=' + json.dumps(result))
