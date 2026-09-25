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
    ('rem700', 'anelar', 'r'): 35, ('rem700', 'minimo', 'r'): 50, ('rem700', 'polegar', 'r'): 30,
    ('rem700', 'indicador', 'r'): -4,
    ('g3sg1', 'minimo', 'r'): 3, ('g3sg1', 'polegar', 'r'): 2,
}
# Ajustes no segundo eixo, medidos sobre a Rem700 já registrada no punho. Os
# dedos do KINEMATION não dobram todos no mesmo eixo local: o curl principal
# aproxima a falange, e este segundo arco fecha a polpa sobre a coronha.
CORRECOES_EIXO = {
    ('rem700', 'minimo', 'r'): [('X', -40)],
    ('rem700', 'polegar', 'r'): [('Z', 50)],
    ('rem700', 'polegar', 'l'): [('Y', 70), ('X', 80)],
    ('rem700', 'indicador', 'l'): [('Z', 10)],
}
# A tradução de PoseBone do Blender e a translation do glTF não compartilham a
# mesma base nesta família. Este valor foi resolvido no produto glTF pelo vetor
# residual do gate causal (quatro dedos de apoio: 34–41 mm → 0–4 mm).
REM700_GLTF_HAND_L = [5.1045, 4.6322, -3.9938]


def abrir(arma_id, aplicar_deltas=True):
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
    if aplicar_deltas and os.path.exists(deltas_path):
        with open(deltas_path) as fh:
            pacote = json.load(fh)
            deltas = pacote['deltas']
        for nome, q in deltas.items():
            pb = arm.pose.bones.get(nome)
            if pb:
                pb.rotation_quaternion = mathutils.Quaternion(q) @ pb.rotation_quaternion
        translations = pacote.get('translationsBlender', pacote.get('translations', {}))
        for nome, delta in translations.items():
            pb = arm.pose.bones.get(nome)
            if pb:
                pb.location += Vector(delta)
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
    # Sempre derive o pacote da pose limpa. Abrir e salvar uma pose que já
    # carregou o pacote anterior acumulava os mesmos curls a cada rebuild.
    arm, mint, luva, idle, deps = abrir(arma_id, aplicar_deltas=False)
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
    for (arma_cfg, dedo, lado), ajustes in CORRECOES_EIXO.items():
        if arma_cfg != arma_id:
            continue
        for eixo, graus in ajustes:
            for padrao in DEDOS[dedo]:
                pb = arm.pose.bones.get(padrao.format(l=lado))
                if pb is None:
                    continue
                antes = pb.rotation_quaternion.copy()
                q = mathutils.Quaternion(
                    {'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[eixo], radians(graus))
                pb.rotation_quaternion = q @ antes
                anterior = mathutils.Quaternion(deltas.get(pb.name, (1, 0, 0, 0)))
                combinado = (pb.rotation_quaternion @ antes.inverted()) @ anterior
                deltas[pb.name] = [round(c, 6) for c in combinado]
    bpy.context.view_layer.update()
    translations = {}
    translations_blender = {}
    if arma_id == 'rem700':
        # A Rem700 correta aponta para a frente; isso revelou que a mão de
        # apoio do doador estava ~5 cm ao lado do guarda-mão próprio. Move a
        # mão, não a arma inteira, preservando o contato já verde da mão forte.
        hand_l = arm.pose.bones.get('hand_l')
        if hand_l and hand_l.parent:
            delta_world = Vector((-0.049, 0.003, -0.004))
            # `PoseBone.location` inclui orientação/rest-scale do osso; usar só
            # a matriz do pai erra a direção e a amplitude. Mede o jacobiano
            # local→mundo numericamente na própria pose que será exportada.
            base_location = hand_l.location.copy()
            bpy.context.view_layer.update()
            origem = arm.matrix_world @ hand_l.matrix.translation
            colunas = []
            for eixo in range(3):
                hand_l.location = base_location.copy()
                hand_l.location[eixo] += 1.0
                bpy.context.view_layer.update()
                colunas.append((arm.matrix_world @ hand_l.matrix.translation) - origem)
            hand_l.location = base_location
            bpy.context.view_layer.update()
            jacobiano = Matrix((colunas[0], colunas[1], colunas[2])).transposed()
            delta_local = jacobiano.inverted() @ delta_world
            hand_l.location += delta_local
            translations_blender['hand_l'] = [round(c, 6) for c in delta_local]
            translations['hand_l'] = REM700_GLTF_HAND_L
    destino = os.path.join(ART, arma_id, 'cand1', 'finger-deltas.json')
    with open(destino, 'w') as fh:
        clipes = (['idle', 'shoot', 'reload_start', 'reload_loop', 'reload_end', 'reload_empty']
                  if arma_id == 'rem700' else ['idle', 'reload_tactical', 'reload_empty'])
        json.dump({'arma': arma_id, 'clipes': clipes, 'deltas': deltas,
                   'translations': translations,
                   'translationsBlender': translations_blender}, fh, indent=1)
    print('DMR_CONTATO_DELTAS', arma_id, destino, len(deltas), 'bones')


if __name__ == '__main__':
    pos = sys.argv.index('--') + 1 if '--' in sys.argv else len(sys.argv)
    alvo = sys.argv[pos] if pos < len(sys.argv) else ''
    modo = sys.argv[pos + 1] if pos + 1 < len(sys.argv) else 'medir'
    for arma in ('rem700', 'g3sg1'):
        if alvo and arma != alvo:
            continue
        {'medir': modo_medir, 'encaixar': modo_encaixar, 'corrigir': modo_corrigir}[modo](arma)
