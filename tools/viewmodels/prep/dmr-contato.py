#!/usr/bin/env python3
"""Medição e encaixe de contato dedo-a-dedo da lane vm-dmr-final (padrão M4 C4).

modos:
  medir    — tabela de distância mínima ponta-de-dedo ↔ arma Mint no idle
  encaixar — desloca a Mint (translação do objeto, pós-assar) em iterações
             medida→deslocamento→remedição até a mão de apoio encostar sem
             abrir o contato da mão forte
  corrigir — curls finos por dedo na pose de idle; exporta deltas de quaternion
             por bone para o assembler aplicar nos clipes finais
"""
import json
import math
import os
import sys
from math import radians

import bpy
import mathutils
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

CWD = os.path.abspath(os.path.dirname(__file__) + '/../../..')
ART = os.path.join(CWD, 'artifacts', 'viewmodels', 'dmr')

DEDOS = {
    'indicador': ['index_01_{l}', 'index_02_{l}', 'index_03_{l}'],
    'medio': ['middle_01_{l}', 'middle_02_{l}', 'middle_03_{l}'],
    'anelar': ['ring_01_{l}', 'ring_02_{l}', 'ring_03_{l}'],
    'minimo': ['pinky_01_{l}', 'pinky_02_{l}', 'pinky_03_{l}'],
    'polegar': ['thumb_01_{l}', 'thumb_02_{l}', 'thumb_03_{l}'],
}
# curl fino (graus) por dedo/lado, aplicado como delta local no idle
CORRECOES = {
    ('rem700', 'anelar', 'r'): 4, ('rem700', 'minimo', 'r'): 5, ('rem700', 'polegar', 'r'): 3,
    ('rem700', 'indicador', 'r'): -4,
    ('g3sg1', 'minimo', 'r'): 3, ('g3sg1', 'polegar', 'r'): 2,
}


def abrir(arma_id):
    bpy.ops.wm.open_mainfile(filepath=os.path.join(ART, arma_id, 'cand1', f'{arma_id}-candidate.blend'))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and 'FP_ARMS' in o.name)
    mint = bpy.data.objects.get(f'MINT_WEAPON_{arma_id.upper()}')
    luva = bpy.data.objects.get('GEO_FP_SK_Glove_01')
    idle = bpy.data.actions.get('RIG_FP_ARMS_idle')
    for o in bpy.data.objects:
        if o.type == 'ARMATURE':
            if o.animation_data:
                o.animation_data.action = None
            for pb in o.pose.bones:
                pb.matrix_basis.identity()
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = idle
    bpy.context.scene.frame_set(int(idle.frame_range[1] / 2))
    bpy.context.view_layer.update()
    # deltas de curl (o que o assembler aplica no GLB final): valida aqui
    deltas_path = os.path.join(ART, arma_id, 'cand1', 'finger-deltas.json')
    if os.path.exists(deltas_path):
        with open(deltas_path) as fh:
            deltas = json.load(fh)['deltas']
        for nome, q in deltas.items():
            pb = arm.pose.bones.get(nome)
            if pb:
                pb.rotation_quaternion = mathutils.Quaternion(q) @ pb.rotation_quaternion
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    deps.update()
    return arm, mint, luva, idle, deps


def bvh_da_arma(mint, deps):
    ev = mint.evaluated_get(deps)
    me = ev.to_mesh()
    bvh = BVHTree.FromPolygons(
        [ev.matrix_world @ v.co.copy() for v in me.vertices],
        [list(p.vertices) for p in me.polygons])
    ev.to_mesh_clear()
    return bvh


def medir_dedos(luva, lm, bvh):
    """por (dedo, lado): (dist_min_m, ponta_mundo, ponto_arma_mundo)."""
    saida = {}
    for dedo, cadeia in DEDOS.items():
        for lado in ('r', 'l'):
            grupos = {luva.vertex_groups.find(c.format(l=lado)) for c in cadeia}
            grupos.discard(-1)
            melhor = None
            for i, v in enumerate(lm.vertices):
                if not any(w.group in grupos and w.weight > 0.55 for w in v.groups):
                    continue
                ponta = luva.matrix_world @ v.co
                loc, nrm, idx, dist = bvh.find_nearest(ponta)
                if loc is not None and (melhor is None or dist < melhor[0]):
                    melhor = (dist, ponta.copy(), loc.copy())
            if melhor:
                saida[f'{dedo}_{lado}'] = melhor
    return saida


def modo_medir(arma_id):
    arm, mint, luva, idle, deps = abrir(arma_id)
    bvh = bvh_da_arma(mint, deps)
    le = luva.evaluated_get(deps)
    lm = le.to_mesh()
    tabela = {k: round(v[0] * 1000, 2) for k, v in medir_dedos(luva, lm, bvh).items()}
    le.to_mesh_clear()
    with open(os.path.join(ART, arma_id, 'cand1', 'contato-idle.json'), 'w') as fh:
        json.dump({'arma': arma_id, 'tabela_mm': tabela}, fh, indent=1)
    print('DMR_CONTATO', arma_id, json.dumps(tabela, ensure_ascii=False))


def modo_encaixar(arma_id, iteracoes=5):
    arm, mint, luva, idle, deps = abrir(arma_id)
    for it in range(iteracoes):
        deps = bpy.context.evaluated_depsgraph_get()
        deps.update()
        bvh = bvh_da_arma(mint, deps)
        le = luva.evaluated_get(deps)
        lm = le.to_mesh()
        medidos = medir_dedos(luva, lm, bvh)
        le.to_mesh_clear()
        tabela = {k: round(v[0] * 1000, 1) for k, v in medidos.items()}
        print('DMR_ENCAIXAR', arma_id, 'iter', it, json.dumps(tabela, ensure_ascii=False))
        apoio = [v[0] for k, v in medidos.items() if k.endswith('_l')]
        forte = [v[0] for k, v in medidos.items() if k.endswith('_r')]
        if apoio and max(apoio) <= 0.006:
            break
        vetores = [v[2] - v[1] for k, v in medidos.items() if k.endswith('_l') and v[0] > 0.006]
        if not vetores:
            break
        passo = mathutils.Vector((0.0, 0.0, 0.0))
        for vec in vetores:
            passo += vec
        passo /= len(vetores)
        if forte and min(forte) > 0.008:
            passo *= 0.35  # mão forte frouxa: passo curto
        if passo.length > 0.02:
            passo = passo.normalized() * 0.02
        # objeto com skin ignora o transform próprio: translada os VÉRTICES de
        # todas as malhas Mint (corpo + peças), no espaço local de cada uma
        alvos = [mint] + [o for o in bpy.data.objects
                          if o.type == 'MESH' and o.name.startswith('MINT_') and o != mint]
        for obj in alvos:
            rot = obj.matrix_world.inverted().to_3x3()
            for v in obj.data.vertices:
                v.co -= rot @ passo
        bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ART, arma_id, 'cand1', f'{arma_id}-candidate.blend'))
    modo_medir(arma_id)


def eixo_dobrada(arma, pb):
    b = arma.data.bones.get(pb.name)
    if b is None or not b.children:
        return 'X'
    direcao = (b.children[0].head_local - b.head_local).normalized()
    eixos = {'X': Vector((1, 0, 0)), 'Y': Vector((0, 1, 0)), 'Z': Vector((0, 0, 1))}
    return min(eixos, key=lambda e: abs(direcao.dot(eixos[e])))


def modo_corrigir(arma_id):
    arm, mint, luva, idle, deps = abrir(arma_id)
    deltas = {}
    for (arma_cfg, dedo, lado), graus in CORRECOES.items():
        if arma_cfg != arma_id:
            continue
        for padrao in DEDOS[dedo]:
            pb = arm.pose.bones.get(padrao.format(l=lado))
            if pb is None:
                continue
            eixo = eixo_dobrada(arm, pb)
            antes = pb.rotation_quaternion.copy()
            q = mathutils.Quaternion(
                {'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[eixo], radians(graus))
            pb.rotation_quaternion = q @ antes
            deltas[pb.name] = [round(c, 6) for c in (pb.rotation_quaternion @ antes.inverted())]
    bpy.context.view_layer.update()
    destino = os.path.join(ART, arma_id, 'cand1', 'finger-deltas.json')
    with open(destino, 'w') as fh:
        json.dump({'arma': arma_id, 'clipes': ['idle', 'reload_end'], 'deltas': deltas}, fh, indent=1)
    print('DMR_CONTATO_DELTAS', arma_id, destino, len(deltas), 'bones')
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ART, arma_id, 'cand1', f'{arma_id}-candidate.blend'))


if __name__ == '__main__':
    pos = sys.argv.index('--') + 1 if '--' in sys.argv else len(sys.argv)
    alvo = sys.argv[pos] if pos < len(sys.argv) else ''
    modo = sys.argv[pos + 1] if pos + 1 < len(sys.argv) else 'medir'
    for arma in ('rem700', 'g3sg1'):
        if alvo and arma != alvo:
            continue
        {'medir': modo_medir, 'encaixar': modo_encaixar, 'corrigir': modo_corrigir}[modo](arma)
