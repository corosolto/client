#!/usr/bin/env python3
"""Contrato visual causal para os candidatos de precisao.

P: cartuchos procedurais precisam herdar apenas os vertices do slot correto do
skin. Um indice global usado no lugar do slot produz pecas de ate ~1,1 m.
S: a manga da SVD preserva a geometria e o skinning, mas sua extremidade de
ombro deve desaparecer por vertex alpha antes de dominar as duas proporcoes.
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
_spec = importlib.util.spec_from_file_location(
    'precision_gates', ROOT / 'tools/viewmodels/prep/precisao-final-gates.py')
gates = importlib.util.module_from_spec(_spec)
sys.modules['precision_gates'] = gates
_spec.loader.exec_module(gates)


def candidate(root, weapon, suffix='runtime'):
    family = {'mosin': 'bolt', 'svd': 'svd', 'sks': 'marksman'}[weapon]
    choices = [root / family / f'{weapon}-baked-{suffix}.glb',
               root / f'{weapon}-baked-{suffix}.glb']
    found = next((p for p in choices if p.is_file()), None)
    if not found:
        raise FileNotFoundError(f'candidato ausente: {choices[0]}')
    return found


def procedural_extents(j, b):
    idle = next(a for a in j['animations'] if a['name'] == 'idle')
    mats = gates.node_mats(j, gates.amostra(idle, j, b, 0.0))
    out = {}
    for ni, node in enumerate(j['nodes']):
        name = node.get('name', '')
        if not name.startswith('GEO_PROC_Cartridge') or node.get('mesh') is None:
            continue
        verts = []
        for prim in j['meshes'][node['mesh']]['primitives']:
            pos = gates.accessor(j, b, prim['attributes']['POSITION']).astype(float)
            verts.append((mats[ni][:3, :3] @ pos.T).T + mats[ni][:3, 3])
        verts = np.vstack(verts)
        out[name] = (verts.max(0) - verts.min(0)).tolist()
    return out


def sleeve_metrics(j, b):
    idle = next(a for a in j['animations'] if a['name'] == 'idle')
    mats = gates.node_mats(j, gates.amostra(idle, j, b, 0.0))
    camera = mats[next(i for i, n in enumerate(j['nodes'])
                       if n.get('name') == 'VIEWMODEL_CAMERA')]
    camera_inv = np.linalg.inv(camera)
    ni = next(i for i, n in enumerate(j['nodes'])
              if n.get('name') == 'GEO_FP_SK_Cloth_01')
    raw_prims = j['meshes'][j['nodes'][ni]['mesh']]['primitives']
    prims = gates.alinh.skin_prims(j, b, ni)
    verts_parts = []
    has_vertex_alpha = True
    shoulder_alpha = []
    for raw, prim in zip(raw_prims, prims):
        verts = gates.alinh.deform(prim, mats)
        if 'COLOR_0' in raw['attributes']:
            rgba = gates.accessor(j, b, raw['attributes']['COLOR_0'])
            bind = gates.accessor(j, b, raw['attributes']['POSITION'])
            # A borda aberta do ombro começa no fim do gradiente autoral.
            shoulder_alpha.extend(rgba[bind[:, 1] >= 1.38, 3].tolist())
            verts = verts[rgba[:, 3] > 0.05]
        else:
            has_vertex_alpha = False
            shoulder_alpha.append(1.0)
        verts_parts.append(verts)
    verts = np.vstack(verts_parts)
    frame = gates.frame_de('svd')
    # Mede a geometria no enquadramento de estresse que revelou a regressao.
    # O frame final pode recortar os ombros, mas nao deve mascarar a malha
    # gigante e fazer o mutante antigo passar.
    frame['xyz'][1] = -0.06
    verts = (camera_inv[:3, :3] @ verts.T).T + camera_inv[:3, 3] + np.array(frame['xyz'])
    areas = {}
    for aspect, tag in ((3 / 2, '3x2'), (16 / 9, '16x9')):
        px, mask, width, height = gates.projetar(verts, frame, aspect)
        inside = mask & (px[:, 0] >= 0) & (px[:, 0] < width) & (px[:, 1] >= 0) & (px[:, 1] < height)
        q = px[inside]
        areas[tag] = float(np.prod((q.max(0) - q.min(0)) / [width, height])) if len(q) else 0.0
    material = j['materials'][j['meshes'][j['nodes'][ni]['mesh']]['primitives'][0]['material']]
    return {'doubleSided': bool(material.get('doubleSided', False)),
            'hasVertexAlpha': has_vertex_alpha,
            'shoulderAlphaMax': float(max(shoulder_alpha, default=1.0)),
            'bboxArea': areas}


def measure(path, weapon):
    j, b = gates.ler(path)
    if weapon in ('mosin', 'sks'):
        ext = procedural_extents(j, b)
        worst = max((max(v) for v in ext.values()), default=0.0)
        return {'proceduralExtentsM': ext, 'worstAxisM': worst,
                'passes': bool(ext) and worst <= 0.16}
    sleeve = sleeve_metrics(j, b)
    # O bbox limita dominancia nas duas proporcoes; o contrato de alpha testa
    # a causa diretamente. Sem ele, um mutante poderia manter os aneis opacos
    # e ainda passar por mero recorte de camera.
    passes = (sleeve['hasVertexAlpha']
              and sleeve['shoulderAlphaMax'] <= 0.05
              and sleeve['bboxArea']['3x2'] <= 0.150
              and sleeve['bboxArea']['16x9'] <= 0.120)
    return {**sleeve, 'passes': passes}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--asset-root', required=True, type=Path)
    ap.add_argument('--mutant-root', type=Path)
    ap.add_argument('--output', type=Path)
    ap.add_argument('--weapons', default='mosin,svd,sks')
    args = ap.parse_args()
    weapons = [x.strip() for x in args.weapons.split(',') if x.strip()]
    report = {}
    ok = True
    for weapon in weapons:
        result = measure(candidate(args.asset_root, weapon), weapon)
        entry = {'candidate': result}
        ok &= result['passes']
        if args.mutant_root:
            suffix = 'mutant-clip' if weapon in ('mosin', 'sks') else 'mutant-sleeve'
            mutant = measure(candidate(args.mutant_root, weapon, suffix), weapon)
            entry['mutant'] = {**mutant, 'rejected': not mutant['passes']}
            ok &= not mutant['passes']
        report[weapon] = entry
        print(f"{weapon}: candidate={result['passes']} mutant="
              f"{entry.get('mutant', {}).get('rejected', 'n/a')}")
    payload = {'ok': bool(ok), 'weapons': report}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(payload, indent=2) + '\n')
    print(json.dumps({'ok': bool(ok), 'weapons': weapons}))
    if not ok:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
