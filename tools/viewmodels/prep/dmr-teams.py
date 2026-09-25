#!/usr/bin/env python3
"""Renders de time (E/B/C/F/U + neutro) e contact sheets da lane vm-dmr-final.

Times seguem TEAM_HANDS do vmhands.js (cores de luva/manga/acento). O runtime
aplica os ATLAS reais por time; aqui a evidência é de GEOMETRIA/UV/pose com as
cores oficiais — a certificação final de textura é no jogo (staging 8162).
Também monta os contact sheets 3:2/16:9 dos frames críticos de cada arma.
"""
import json
import os
import sys

import bpy
from mathutils import Vector, Matrix

CWD = os.path.abspath(os.path.dirname(__file__) + '/../../..')
ART = os.path.join(CWD, 'artifacts', 'viewmodels', 'dmr')

TIMES = {
    'E': {'glove': '#34363a', 'sleeve': '#781f2a', 'accent': '#e2d6b5'},
    'B': {'glove': '#4e5740', 'sleeve': '#4e5740', 'accent': '#a5a57b'},
    'C': {'glove': '#dad8cd', 'sleeve': '#493544', 'accent': '#ba3544'},
    'F': {'glove': '#34363a', 'sleeve': '#292b30', 'accent': '#696b70'},
    'U': {'glove': '#34363a', 'sleeve': '#292b30', 'accent': '#d9d7cf'},
    'neutral': {'glove': '#34363a', 'sleeve': '#363a40', 'accent': '#797d80'},
}

FRAMES_CRITICOS = {
    'rem700': [('idle', 0.0), ('shoot', 0.6), ('reload_loop', 0.3), ('reload_end', 1.55)],
    'g3sg1': [('idle', 0.0), ('reload_tactical', 1.0), ('reload_empty', 2.0)],
}


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def aplicar_time(cores):
    for mat in bpy.data.materials:
        nome = mat.name.lower()
        if not mat.use_nodes or 'corosolto_fp' not in nome.replace('_', '').lower():
            continue
        bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue
        if 'cloth' in nome:
            bsdf.inputs['Base Color'].default_value = (*hex_rgb(cores['sleeve']), 1)
        elif 'glove' in nome:
            bsdf.inputs['Base Color'].default_value = (*hex_rgb(cores['glove']), 1)
        elif 'hand' in nome:
            bsdf.inputs['Base Color'].default_value = (*hex_rgb(cores['accent']), 1)


def renderizar(arma, pares_frames, out):
    os.makedirs(out, exist_ok=True)
    blend = os.path.join(ART, arma, 'cand1', f'{arma}-candidate.blend')
    bpy.ops.wm.open_mainfile(filepath=blend)
    scene = bpy.context.scene
    cam = next(o for o in bpy.data.objects if o.type == 'CAMERA')
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'FLAT'
    scene.display.shading.show_cavity = True
    scene.camera = cam
    bpy.context.preferences.view.render_display_type = 'NONE'
    arm_fp = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and 'FP_ARMS' in o.name)
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and 'WEAPON' in o.name)

    originais = {}
    for mat in bpy.data.materials:
        if mat.use_nodes:
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bsdf:
                originais[mat.name] = list(bsdf.inputs['Base Color'].default_value)

    registro = []
    for time, cores in TIMES.items():
        aplicar_time(cores)
        for clip, t in pares_frames:
            a_arms = bpy.data.actions.get(f'{clip}_arms')
            if not a_arms and clip == 'idle':
                a_arms = bpy.data.actions.get('RIG_FP_ARMS_idle')
            if not a_arms:
                continue
            a_weapon = bpy.data.actions.get(f'{clip}_weapon')
            for o in (arm_fp, rig):
                if o.animation_data:
                    o.animation_data.action = None
                for pb in o.pose.bones:
                    pb.matrix_basis.identity()
            scene.frame_set(0)
            bpy.context.view_layer.update()
            if arm_fp.animation_data is None:
                arm_fp.animation_data_create()
            arm_fp.animation_data.action = a_arms
            if a_weapon:
                if rig.animation_data is None:
                    rig.animation_data_create()
                rig.animation_data.action = a_weapon
            scene.frame_set(int(round(t * 30)))
            bpy.context.view_layer.update()
            scene.render.resolution_x, scene.render.resolution_y = 1440, 960
            scene.render.filepath = os.path.join(out, f'{arma}-{time}-{clip}-t{t:.2f}-3x2.png')
            bpy.ops.render.render(write_still=True)
            registro.append(os.path.basename(scene.render.filepath))
            print('DMR_TIME_FRAME', arma, time, clip, t)

    # restaura cores originais (o .blend não é salvo; segurança extra)
    for mat in bpy.data.materials:
        if mat.name in originais and mat.use_nodes:
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bsdf:
                bsdf.inputs['Base Color'].default_value = originais[mat.name]
    with open(os.path.join(out, 'times.json'), 'w') as fh:
        json.dump({'arma': arma, 'times': list(TIMES), 'frames': registro}, fh, indent=1)


def colar_sheet(imagens, saida, colunas=3, celula=(480, 320)):
    linhas = (len(imagens) + colunas - 1) // colunas
    sheet = None
    for r in range(linhas):
        linha = None
        for c in range(colunas):
            idx = r * colunas + c
            if idx >= len(imagens):
                bloco = numpy.zeros((celula[1], celula[0], 4))
            else:
                img = bpy.data.images.load(imagens[idx])
                img.scale(*celula)
                bloco = numpy.array(img.pixels[:]).reshape(celula[1], celula[0], 4)
                bpy.data.images.remove(img)
            linha = bloco if linha is None else numpy.hstack([linha, bloco])
        sheet = linha if sheet is None else numpy.vstack([sheet, linha])
    out = bpy.data.images.new(os.path.basename(saida), celula[0] * colunas, celula[1] * linhas)
    out.pixels = sheet.ravel().tolist()
    out.filepath_raw = saida
    out.file_format = 'PNG'
    out.save()
    bpy.data.images.remove(out)


def sheets(arma, pares_frames):
    base = os.path.join(ART, arma, 'cand1', 'frames')
    out = os.path.join(ART, arma, 'cand1')
    for tag, res in (('3x2', (1440, 960)), ('16x9', (1440, 810))):
        imagens = [os.path.join(base, f'{arma}-{clip}-t{t:.2f}-{tag}.png')
                   for clip, t in pares_frames
                   if os.path.exists(os.path.join(base, f'{arma}-{clip}-t{t:.2f}-{tag}.png'))]
        if imagens:
            colar_sheet(imagens, os.path.join(out, f'contact-sheet-{tag}.png'))
            print('DMR_SHEET', arma, tag, len(imagens), 'células')


if __name__ == '__main__':
    import numpy  # noqa: F401  (o Blender embute; aqui só para importar cedo)
    alvo = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else ''
    for arma, pares in FRAMES_CRITICOS.items():
        if alvo and arma != alvo:
            continue
        renderizar(arma, pares, os.path.join(ART, arma, 'cand1', 'times'))
        sheets(arma, pares)
