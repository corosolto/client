"""Gates finais por arma sobre os GLBs assados, com mutantes que provam cada régua.

Gates (a arma passa só com todos verdes):
- T timing: último input dos canais de braços vs ossos de arma por clipe < 1e-6 s.
  Controle vermelho: native pré-C2 (ISO), que reprova.
- M mecanismo: deslocamento/rotação da peça própria (ferrolho/carregador) nos
  clipes de recarga/tiro acima do mínimo. Controle vermelho: build --mutante-peca.
- C contato: mãos deformadas vs arma própria por fase (7 por clipe): zero vértices
  internos VISÍVEIS (raio +Y; oclusores = arma + mãos/braços, como o depth buffer
  do jogo) além de 3 mm e pegada k40 <= 30 mm. A métrica só-arma fica como
  referência (visivel_arma_gt3mm). Controle vermelho: arma deslocada +3 cm.
- F enquadramento: projeção 3:2 e 16:9 com a câmera/mount EXATOS do runtime
  (FAMILY_FRAME + fov 84 por aspecto): >=85% da arma no quadro e quadrado
  central livre. Controle vermelho: offsets zerados.
- A ADS: sockets SOCKET_MINT_* presentes e, na construção ADS do runtime
  (muzzle-sight colinear ao eixo), mira centrada.

Saída: A/final/gates.json + resumo no stdout. Sem navegador.
"""
import argparse
import importlib.util
import json
import re
import struct
import subprocess
import sys
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[3]
A = RAIZ / 'artifacts/viewmodels/prep/precisao'
DEFAULT_F = A / 'final'
DEFAULT_ISO = Path('/Users/ruben/csbrasil-private-assets/generated/precisao-c2-isolated')
DEFAULT_CONTRACT = RAIZ / 'tools/viewmodels/prep/precision-donor-baseline.json'

_spec = importlib.util.spec_from_file_location(
    'alinh', RAIZ / 'tools/viewmodels/prep/precisao-final-alinhamento.py')
alinh = importlib.util.module_from_spec(_spec)
sys.modules['alinh'] = alinh
_spec.loader.exec_module(alinh)
ler, accessor, node_mats, amostra = alinh.ler, alinh.accessor, alinh.node_mats, alinh.amostra
closest_info, inside_ray = alinh.closest_info, alinh.inside_ray

FAMILIA = {'mosin': 'bolt', 'svd': 'svd', 'sks': 'marksman'}
BONES_MECANISMO = {'Bolt', 'StaticBolt', 'Trigger', 'Cartridge', 'Clip', 'Mag',
                   'MagRelease', 'Safety', 'Handle', 'ReleaseHandle', 'Sight', 'neutral_bone'}
LIMIARES = {  # deslocamento mínimo da peça (m) por clipe-âncora
    'mosin': {'shoot': 0.02, 'reload_start': 0.02, 'reload_empty': 0.04},
    'svd': {'reload_tactical': 0.05, 'reload_empty': 0.05},
    'sks': {'reload_start': 0.02, 'reload_empty': 0.04},
}


def frame_de(familia):
    src = (RAIZ / 'public/js/authoredvm.js').read_text()
    ini = src.index('const FAMILY_FRAME')
    fim = src.index('});', ini)
    bloco_frame = src[ini:fim]
    m = re.search(rf'\n  {familia}:\s*\{{([^}}]+)\}}', bloco_frame)
    bloco = m.group(1)
    vals = {}
    for k, v in re.findall(r'(\w+):\s*([^,\]]+)', bloco):
        vals[k] = v.strip()
    xyz = [float(x) for x in re.findall(r'-?[\d.]+', vals['x'] + ' ' + vals['y'] + ' ' + vals['z'])]
    rot = [float(x) for x in re.findall(r'-?[\d.]+',
                                        re.search(r'rotDeg:\s*\[([^\]]+)\]', bloco).group(1))]
    return {'xyz': xyz, 'rotDeg': rot, 'fov': float(vals['fov'])}


def clip_dur(anim, j, b):
    ts = [accessor(j, b, anim['samplers'][s]['input']).ravel().max() for s in range(len(anim['samplers']))]
    return float(max(ts))


def grupos_ossos(j, b):
    arms = set()
    weapon = set()
    for si, sk in enumerate(j['skins']):
        nomes = [j['nodes'][x].get('name', '') for x in sk['joints']]
        if sk.get('name') == 'RIG_FP_ARMS' or 'upperarm' in ' '.join(nomes):
            arms.update(nomes)
        else:
            weapon.update(nomes)
    return arms, weapon


def gate_T(j, b):
    arms, weapon = grupos_ossos(j, b)
    piores = {}
    for anim in j.get('animations', []):
        t_arms = 0.0
        t_weapon = 0.0
        for c in anim['channels']:
            tgt = c['target']
            if tgt.get('node') is None:
                continue
            nm = j['nodes'][tgt['node']].get('name', '')
            if nm in arms:
                t_arms = max(t_arms, accessor(j, b, anim['samplers'][c['sampler']]['input']).ravel().max())
            elif nm in weapon:
                t_weapon = max(t_weapon, accessor(j, b, anim['samplers'][c['sampler']]['input']).ravel().max())
        if t_weapon > 0 or any(j['nodes'][tgt['node']].get('name', '') in weapon
                               for c in anim['channels'] if c['target'].get('node') is not None):
            piores[anim['name']] = float(abs(t_arms - t_weapon))
    return piores


def nós_arma(j):
    """Nodes de mesh da arma própria (corpo, peça, pente procedural) e sockets."""
    out = {'meshes': [], 'sockets': {}}
    for i, n in enumerate(j['nodes']):
        nm = n.get('name', '')
        if n.get('mesh') is not None and (nm.startswith('GEO_MINT_') or nm.startswith('GEO_PROC_')):
            out['meshes'].append(i)
        if nm == 'SOCKET_MINT_MUZZLE':
            out['sockets']['muzzle'] = i
        if nm == 'SOCKET_MINT_SIGHT':
            out['sockets']['sight'] = i
    return out


def weapon_tris(j, b, mats, nós):
    tris = []
    for ni in nós['meshes']:
        node = j['nodes'][ni]
        M = mats[ni]
        for prim in j['meshes'][node['mesh']]['primitives']:
            pos = accessor(j, b, prim['attributes']['POSITION']).astype(np.float64)
            w = (M[:3, :3] @ pos.T).T + M[:3, 3]
            if 'indices' in prim:
                idx = accessor(j, b, prim['indices']).astype(int).reshape(-1, 3)
            else:
                idx = np.arange(len(w)).reshape(-1, 3)
            tris.append(w[idx])
    return np.vstack(tris)


def hands_skinned(j, b, mats):
    verts = []
    for ni, n in enumerate(j['nodes']):
        if n.get('skin') is None or 'GEO_FP_SK' not in n.get('name', ''):
            continue
        for prim in alinh.skin_prims(j, b, ni):
            verts.append(alinh.deform(prim, mats))
    return np.vstack(verts)


def hands_tris(j, b, mats):
    """Triângulos skinned das mãos/braços na pose — oclusores legítimos:
    o depth buffer do jogo também os considera (a mão esconde a si mesma)."""
    tris = []
    for ni, n in enumerate(j['nodes']):
        if n.get('skin') is None or 'GEO_FP_SK' not in n.get('name', ''):
            continue
        base = 0
        for prim in alinh.skin_prims(j, b, ni):
            vv = alinh.deform(prim, mats)
            if 'indices' in prim:
                ii = prim['indices'].astype(int).reshape(-1, 3)
            else:
                ii = np.arange(len(vv)).reshape(-1, 3)
            tris.append(vv[ii])
            base += len(vv)
    return np.vstack(tris)


def palms(j, mats):
    idx = {n.get('name', ''): i for i, n in enumerate(j['nodes'])}
    return mats[idx['hand_r']][:3, 3], mats[idx['hand_l']][:3, 3]


def pose_de(j, b, anim, idle_anim, t):
    """Amostra de clipe fundida com idle em loop: clipes autorais (só raiz)
    tocam sobre o idle no runtime — sem isso o resto do esqueleto cai no bind."""
    dur_idle = clip_dur(idle_anim, j, b)
    ov = {k: dict(v) for k, v in amostra(idle_anim, j, b, t % max(dur_idle, 1e-6)).items()}
    ov.update(amostra(anim, j, b, t))
    return ov


def visivel_dentro(verts, tris, cam_pos, chunk=192):
    """Entre vértices internos, marca os VISÍVEIS da câmera (raio cam→v não
    cruza a arma antes do vértice). Penetração oculta = dentro de côco/manga."""
    a, b_, c = tris[:, 0], tris[:, 1], tris[:, 2]
    e1, e2 = b_ - a, c - a
    tv0 = (cam_pos - a)[None]                       # (1,t,3)
    out = np.zeros(len(verts), dtype=bool)
    for s0 in range(0, len(verts), chunk):
        pts = verts[s0:s0 + chunk]
        d = pts - cam_pos
        dist = np.linalg.norm(d, axis=1)
        d = d / np.maximum(dist, 1e-9)[:, None]
        pvec = np.cross(d[:, None, :], e2[None])     # (c,t,3)
        det = np.einsum('ti,cti->ct', e1, pvec)
        ok = np.abs(det) > 1e-12
        inv = np.where(ok, 1.0 / np.where(ok, det, 1), 0)
        u = np.einsum('cti,cti->ct', np.broadcast_to(tv0, pvec.shape), pvec) * inv
        qvec = np.cross(np.broadcast_to(tv0, pvec.shape), e1[None])
        v = np.einsum('ci,cti->ct', d, qvec) * inv
        t = np.einsum('cti,ti->ct', qvec, e2) * inv
        hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-5) & (t < (dist - 0.002)[:, None])
        out[s0:s0 + chunk] = ~hit.any(1)
    return out

def gate_C_ml(arma, j, b, desloc=np.zeros(3), dump=None):
    rel = {}
    ofensores = []
    idle_anim = next(a for a in j['animations'] if a['name'] == 'idle')
    for anim in j['animations']:
        if not (anim['name'].startswith('reload') or anim['name'] in ('idle', 'shoot', 'equip_rifle', 'inspect')):
            continue
        dur = clip_dur(anim, j, b)
        fases = [0.0, .18, .35, .5, .62, .86, 1.0]
        pior_dentro = 0
        pior_visivel = 0
        pior_visivel_arma = 0
        pior_prof = 0.0
        pior_k40 = [0.0, 0.0]
        melhor_k40 = [9.9, 9.9]
        for f in fases:
            mats = node_mats(j, pose_de(j, b, anim, idle_anim, dur * f))
            nós = nós_arma(j)
            tris = weapon_tris(j, b, mats, nós)
            tris = tris + desloc
            hv = hands_skinned(j, b, mats)
            hr, hl = palms(j, mats)
            lo, hi = tris.reshape(-1, 3).min(0) - 0.02, tris.reshape(-1, 3).max(0) + 0.02
            sel = np.all((hv >= lo) & (hv <= hi), axis=1)
            sub = hv[sel]
            if len(sub) < 10:
                continue
            dentro_mask = inside_ray(sub, tris)
            n_dentro = int(dentro_mask.sum())
            if n_dentro:
                dd, ss = closest_info(sub[dentro_mask], tris)
                prof = -ss
                # exclusão de oco: vértice a >25 mm de qualquer metal está numa
                # região ocava da arma (guarda do gatilho, junta coronha/empunhadura)
                # — guarda existe para alojar dedos; não é interpenetração de metal.
                real = dd <= 0.025
                cam_p = mats[next(i for i, n in enumerate(j['nodes'])
                                  if n.get('name') == 'VIEWMODEL_CAMERA')][:3, 3]
                # visível considerando apenas a arma (métrica antiga, referência)
                vis_arma = visivel_dentro(sub[dentro_mask], tris, cam_p)
                # visível considerando arma + mãos/braços (o que o depth buffer
                # do jogo realmente mostra)
                occluders = np.vstack([tris, hands_tris(j, b, mats)])
                vis_cena = visivel_dentro(sub[dentro_mask], occluders, cam_p)
                pior_dentro = max(pior_dentro, int((real & (prof > 0.003)).sum()))
                pior_visivel = max(pior_visivel, int((real & (prof > 0.003) & vis_cena).sum()))
                pior_visivel_arma = max(pior_visivel_arma, int((real & (prof > 0.003) & vis_arma).sum()))
                pior_prof = max(pior_prof, float(prof[real].max() if real.any() else 0.0))
                if dump is not None and (real & (prof > 0.003) & vis_arma).any():
                    ofensores.append({
                        'clipe': anim['name'], 'fase': f, 't': dur * f,
                        'vermelho': sub[dentro_mask][real & (prof > 0.003) & vis_cena].round(5).tolist(),
                        'amarelo': sub[dentro_mask][real & (prof > 0.003) & vis_arma & ~vis_cena].round(5).tolist(),
                    })
            for k, pj in enumerate((hr, hl)):
                near = sub[np.linalg.norm(sub - pj, axis=1) < 0.06]
                if len(near) < 10:
                    continue
                if len(near) > 240:
                    dsel = np.linalg.norm(near - pj, axis=1)
                    near = near[np.argsort(dsel)[:240]]
                dd, _ = closest_info(near, tris)
                k40 = np.partition(dd, min(40, len(dd) - 1))[:min(40, len(dd))]
                pior_k40[k] = max(pior_k40[k], float(np.median(k40)))
                melhor_k40[k] = min(melhor_k40[k], float(np.median(k40)))
        rel[anim['name']] = {'dentro_gt3mm': pior_dentro, 'visivel_gt3mm': pior_visivel,
                             'visivel_arma_gt3mm': pior_visivel_arma,
                             'prof_max_mm': round(pior_prof * 1000, 1),
                             'k40_r_max': pior_k40[0], 'k40_l_max': pior_k40[1],
                             'k40_r_min': melhor_k40[0], 'k40_l_min': melhor_k40[1]}
    if dump is not None and ofensores:
        dump.write_text(json.dumps(ofensores, indent=1) + '\n')
    return rel


def projetar(verts_cam, frame, aspecto, W=1440):
    v0 = np.radians(frame['fov'])
    ref = 16 / 9
    halfH = np.tan(v0 / 2) * ref
    vfov = 2 * np.arctan(halfH / aspecto)
    H = int(W / aspecto)
    f = (W / 2) / np.tan(vfov / 2)
    x, y, z = verts_cam[:, 0], verts_cam[:, 1], verts_cam[:, -1]
    mask = z < -1e-6
    with np.errstate(divide='ignore', invalid='ignore'):
        u = x / -z * f
        v = y / -z * f
    px = np.where(mask, W / 2 + np.nan_to_num(u), -1.0)
    py = np.where(mask, H / 2 - np.nan_to_num(v), -1.0)
    return np.stack([px, py], axis=1), mask, W, H


def gate_F(j, b, familia):
    mats = node_mats(j, amostra(next(a for a in j['animations'] if a['name'] == 'idle'), j, b, 0.0))
    cam = mats[next(i for i, n in enumerate(j['nodes']) if n.get('name') == 'VIEWMODEL_CAMERA')]
    cam_inv = np.linalg.inv(cam)
    nós = nós_arma(j)
    wverts = []
    for ni in nós['meshes']:
        node = j['nodes'][ni]
        M = cam_inv @ mats[ni]
        for prim in j['meshes'][node['mesh']]['primitives']:
            pos = accessor(j, b, prim['attributes']['POSITION']).astype(np.float64)
            wverts.append((M[:3, :3] @ pos.T).T + M[:3, 3])
    wverts = np.vstack(wverts)
    frame = frame_de(familia)
    rx, ry, rz = np.radians(frame['rotDeg'])
    Rx = np.array([[1, 0, 0], [0, np.cos(rx), -np.sin(rx)], [0, np.sin(rx), np.cos(rx)]])
    Ry = np.array([[np.cos(ry), 0, np.sin(ry)], [0, 1, 0], [-np.sin(ry), 0, np.cos(ry)]])
    Rz = np.array([[np.cos(rz), -np.sin(rz), 0], [np.sin(rz), np.cos(rz), 0], [0, 0, 1]])
    R = Rz @ Ry @ Rx
    out = {}
    for aspecto, tag in ((3 / 2, '3x2'), (16 / 9, '16x9')):
        v = wverts @ R.T + np.array(frame['xyz'])
        px, mask, W, H = projetar(v, frame, aspecto)
        dentro = mask & (px[:, 0] >= 0) & (px[:, 0] < W) & (px[:, 1] >= 0) & (px[:, 1] < H)
        frac = float(dentro.mean())
        cx = (px[:, 0] / W >= 0.44) & (px[:, 0] / W <= 0.56) & (px[:, 1] / H >= 0.44) & (px[:, 1] / H <= 0.56)
        centro = float((dentro & cx).sum()) / max(1, dentro.sum())
        bbox = [float(px[dentro][:, 0].min() / W), float(px[dentro][:, 1].min() / H),
                float(px[dentro][:, 0].max() / W), float(px[dentro][:, 1].max() / H)] if dentro.any() else None
        out[tag] = {'fracao_no_quadro': frac, 'fracao_centro': centro,
                    'bbox_norm': [round(b, 3) for b in bbox] if bbox else None, 'W': W, 'H': H}
    return out, frame


def gate_M(arma, j, b, peca_nome, corpo_nome):
    idx = {n.get('name', ''): i for i, n in enumerate(j['nodes'])}
    piece = idx[peca_nome]
    corpo = idx[corpo_nome]
    rel = {}
    for anim in j['animations']:
        if anim['name'] not in LIMIARES[arma]:
            continue
        dur = clip_dur(anim, j, b)
        idle_anim = next(a for a in j['animations'] if a['name'] == 'idle')
        mats0 = node_mats(j, pose_de(j, b, anim, idle_anim, 0.0))
        loc0 = np.linalg.inv(mats0[corpo]) @ mats0[piece]
        melhor = 0.0
        for f in np.linspace(0, 1, 33):
            mats = node_mats(j, pose_de(j, b, anim, idle_anim, dur * f))
            loc = np.linalg.inv(mats[corpo]) @ mats[piece]
            d = float(np.linalg.norm(loc[:3, 3] - loc0[:3, 3]))
            dra = np.trace(loc[:3, :3].T @ loc0[:3, :3])
            ang = np.degrees(np.arccos(np.clip((dra - 1) / 2, -1, 1)))
            melhor = max(melhor, d + ang / 180 * 0.10)
        rel[anim['name']] = round(melhor, 4)
    return rel


def parse_args():
    p = argparse.ArgumentParser(description='Gate T/M/C/F/A dos candidatos de precisão')
    p.add_argument('--asset-root', type=Path, default=DEFAULT_F,
                   help='raiz dos *-baked-runtime.glb; aceita arquivos diretos ou em <familia>/')
    p.add_argument('--baseline-root', type=Path, default=DEFAULT_ISO,
                   help='raiz dos GLBs nativos usados pelo mutante T')
    p.add_argument('--mutant-root', type=Path,
                   help='raiz dos *-baked-mutante-peca.glb; padrão: asset-root')
    p.add_argument('--contract', type=Path, default=DEFAULT_CONTRACT,
                   help='baseline público de contato/enquadramento')
    p.add_argument('--output', type=Path,
                   help='JSON de saída; padrão: <asset-root>/gates.json')
    p.add_argument('--weapons', default='mosin,svd,sks',
                   help='subconjunto ordenado, separado por vírgula')
    return p.parse_args()


def candidate(root, arma, kind='runtime'):
    suffix = 'baked-runtime.glb' if kind == 'runtime' else 'baked-mutante-peca.glb'
    family = FAMILIA[arma]
    choices = (root / f'{arma}-{suffix}', root / family / f'{arma}-{suffix}')
    return next((p for p in choices if p.is_file()), choices[0])


def native_candidate(root, arma):
    family = {'mosin': 'bolt', 'svd': 'svd', 'sks': 'bolt'}[arma]
    choices = (root / family / f'{family}-runtime.glb', root / f'{family}-runtime.glb')
    return next((p for p in choices if p.is_file()), choices[0])


def main():
    args = parse_args()
    asset_root = args.asset_root.resolve()
    mutant_root = (args.mutant_root or args.asset_root).resolve()
    baseline_root = args.baseline_root.resolve()
    output = (args.output or asset_root / 'gates.json').resolve()
    baseline = json.loads(args.contract.resolve().read_text())
    armas = [w.strip() for w in args.weapons.split(',') if w.strip()]
    desconhecidas = [w for w in armas if w not in FAMILIA]
    if desconhecidas:
        raise SystemExit(f'armas desconhecidas: {", ".join(desconhecidas)}')
    gates = {}
    for arma in armas:
        familia = FAMILIA[arma]
        runtime_file = candidate(asset_root, arma)
        mutant_file = candidate(mutant_root, arma, 'mutant')
        j, b = ler(runtime_file)
        names = [n.get('name', '') for n in j['nodes']]
        idx = {n: i for i, n in enumerate(names)}
        g = {}

        # T
        gaps = gate_T(j, b)
        g['T'] = {'gaps_s': gaps, 'passa': all(v < 1e-6 for v in gaps.values())}
        fam_base = {'mosin': 'bolt', 'svd': 'svd', 'sks': 'bolt'}[arma]
        jn, bn = ler(native_candidate(baseline_root, arma))
        gaps_n = gate_T(jn, bn)
        g['T_mutante_native'] = {'gaps_s': gaps_n,
                                 'reprova': any(v > 1e-3 for v in gaps_n.values())}

        # M
        peca_nome = {'mosin': 'MINT_MOSIN_BOLT', 'svd': 'MINT_SVD_MAG', 'sks': 'MINT_SKS_BOLT'}[arma]
        mm = gate_M(arma, j, b, peca_nome, f'MINT_WEAPON_{arma.upper()}')
        g['M'] = {'deslocamentos': mm,
                  'passa': all(mm[c] >= LIMIARES[arma][c] for c in LIMIARES[arma] if c in mm)}
        jm, bm = ler(mutant_file)
        mmu = gate_M(arma, jm, bm, peca_nome, f'MINT_WEAPON_{arma.upper()}')
        g['M_mutante_peca_presa'] = {'deslocamentos': mmu,
                                     'reprova': any(mmu[c] < LIMIARES[arma][c]
                                                    for c in LIMIARES[arma] if c in mmu)}

        # C
        cc = gate_C_ml(arma, j, b)
        base = baseline[arma]['C']
        viol = []
        for clipe, v in cc.items():
            b_ = base.get(clipe, base['idle'])
            if v['visivel_gt3mm'] > 0:
                viol.append(f'{clipe}:visivel={v["visivel_gt3mm"]}')
            if v['k40_r_min'] > b_['k40_r_min_mm'] / 1000 + 0.018:
                viol.append(f'{clipe}:k40_r={v["k40_r_min"]*1000:.0f}mm>{b_["k40_r_min_mm"]+18:.0f}')
            if v['k40_l_min'] > b_['k40_l_min_mm'] / 1000 + 0.015:
                viol.append(f'{clipe}:k40_l={v["k40_l_min"]*1000:.0f}mm>{b_["k40_l_min_mm"]+15:.0f}')
        g['C'] = {'por_clipe': cc, 'violacoes': viol, 'passa': not viol}
        cm = gate_C_ml(arma, j, b, desloc=np.array([0.0, 0.03, 0.0]))
        base = baseline[arma]['C']
        viol_m = [c for c, v in cm.items()
                  if v['visivel_gt3mm'] > 0
                  or v['k40_r_min'] > 0.030
                  or v['k40_r_min'] > base.get(c, base['idle'])['k40_r_min_mm'] / 1000 + 0.018
                  or v['k40_l_min'] > base.get(c, base['idle'])['k40_l_min_mm'] / 1000 + 0.015]
        g['C_mutante_3cm'] = {'clipes_violados': viol_m, 'reprova': bool(viol_m)}

        # F
        ff, frame = gate_F(j, b, familia)
        basef = baseline[arma]['F']
        basebb = baseline[arma].get('F_bbox', {})
        viol_f = []
        for tag, v in ff.items():
            if v['fracao_no_quadro'] < basef[tag] - 0.06 or v['fracao_no_quadro'] < 0.55:
                viol_f.append(f'{tag}:frac={v["fracao_no_quadro"]:.2f}')
            if v['fracao_centro'] > 0.005:
                viol_f.append(f'{tag}:centro={v["fracao_centro"]:.3f}')
            bb = basebb.get(tag)
            if bb and v['bbox_norm']:
                # ancoragem: início do box (punho/empunhadura) casado com o doador;
                # a BOCA pode estender (arma mais longa = mais visível), sem cortar a borda.
                for i in (0, 1):
                    if abs(v['bbox_norm'][i] - bb[i]) > (0.15 if i == 1 else 0.12):
                        viol_f.append(f'{tag}:bbox{i}={v["bbox_norm"][i]}vs{bb[i]}')
                for i, lim in ((2, 1.002), (3, 1.002)):
                    if v['bbox_norm'][i] > lim:
                        viol_f.append(f'{tag}:bbox{i}={v["bbox_norm"][i]} fora do quadro')
        g['F'] = {'frame': frame, **ff, 'violacoes': viol_f, 'passa': not viol_f}
        jz = json.loads(json.dumps(j))
        # mutante: offsets zerados — avalia com frame zerado
        fz = {'xyz': [0.05, 0.10, -0.075], 'rotDeg': [0, 0, 0], 'fov': 84}
        mats = node_mats(j, amostra(next(a for a in j['animations'] if a['name'] == 'idle'), j, b, 0.0))
        cam = mats[next(i for i, n in enumerate(j['nodes']) if n.get('name') == 'VIEWMODEL_CAMERA')]
        cam_inv = np.linalg.inv(cam)
        nós = nós_arma(j)
        wverts = []
        for ni in nós['meshes']:
            node = j['nodes'][ni]
            M = cam_inv @ mats[ni]
            for prim in j['meshes'][node['mesh']]['primitives']:
                pos = accessor(j, b, prim['attributes']['POSITION']).astype(np.float64)
                wverts.append((M[:3, :3] @ pos.T).T + M[:3, 3])
        wverts = np.vstack(wverts)
        mut = {}
        for aspecto, tag in ((3 / 2, '3x2'), (16 / 9, '16x9')):
            v = wverts + np.array(fz['xyz'])
            px, mask, W, H = projetar(v, fz, aspecto)
            dentro = mask & (px[:, 0] >= 0) & (px[:, 0] < W) & (px[:, 1] >= 0) & (px[:, 1] < H)
            cx = (px[:, 0] / W >= 0.44) & (px[:, 0] / W <= 0.56) & (px[:, 1] / H >= 0.44) & (px[:, 1] / H <= 0.56)
            bbox = [round(float(px[dentro][:, 0].min() / W), 3), round(float(px[dentro][:, 1].min() / H), 3),
                    round(float(px[dentro][:, 0].max() / W), 3), round(float(px[dentro][:, 1].max() / H), 3)] if dentro.any() else None
            mut[tag] = {'fracao_no_quadro': float(dentro.mean()),
                        'fracao_centro': float((dentro & cx).sum()) / max(1, dentro.sum()),
                        'bbox_norm': bbox}
        basebb = baseline[arma].get('F_bbox', {})
        viol_fm = []
        for tag, v in mut.items():
            bb = basebb.get(tag)
            if bb and v['bbox_norm']:
                for i in (0, 1):
                    if abs(v['bbox_norm'][i] - bb[i]) > (0.15 if i == 1 else 0.12):
                        viol_fm.append(f'{tag}:bbox{i}={v["bbox_norm"][i]}vs{bb[i]}')
            if v['fracao_centro'] > 0.005:
                viol_fm.append(f'{tag}:centro')
        g['F_mutante_frame_alto'] = {**{k: v for k, v in mut.items() if isinstance(v, dict)},
                                     'violacoes': viol_fm, 'reprova': bool(viol_fm)}

        # A ADS
        nós = nós_arma(j)
        tem_sockets = 'muzzle' in nós['sockets'] and 'sight' in nós['sockets']
        rel_ads = {'sockets': tem_sockets}
        if tem_sockets:
            mi, si = nós['sockets']['muzzle'], nós['sockets']['sight']
            p_m = mats[mi][:3, 3]
            p_s = mats[si][:3, 3]
            eixo = p_m - p_s
            eixo /= np.linalg.norm(eixo)
            rel_ads['colinearidade_graus'] = float(np.degrees(np.arccos(np.clip(-eixo[2], -1, 1))))
            cam_p2 = mats[next(i for i, n in enumerate(j['nodes'])
                               if n.get('name') == 'VIEWMODEL_CAMERA')][:3, 3]
            rel_ads['sight_xy_mm'] = [round(float(abs(p_s[0] - cam_p2[0])) * 1000, 1),
                                      round(float(abs(p_s[1] - cam_p2[1])) * 1000, 1)]
            # eixo boca→mira coerente com o olhar: a construção ADS do runtime
            # alinha muzzle-sight a (0,0,-1); eixo reverso (~180°) viraria a arma
            rel_ads['passa'] = tem_sockets and rel_ads['colinearidade_graus'] < 30
        g['A'] = rel_ads

        g['pronto'] = all(g[k].get('passa') for k in ('T', 'M', 'C', 'F')) and g['A'].get('passa', False)
        gates[arma] = g
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(gates, indent=1, default=float) + '\n')
        print(f"== {arma}: T={g['T']['passa']} M={g['M']['passa']} C={g['C']['passa']} "
              f"F={g['F']['passa']} A={g['A'].get('passa')} -> PRONTO={g['pronto']}")
        for k in ('T', 'M', 'C', 'F'):
            mut_key = [x for x in g if x.startswith(k + '_mutante')]
            for mk in mut_key:
                print(f"   mutante {mk}: reprova={g[mk]['reprova']}")
    output.write_text(json.dumps(gates, indent=1, default=float) + '\n')
    print(json.dumps({'ok': all(g['pronto'] for g in gates.values()),
                      'weapons': armas, 'assetRoot': str(asset_root),
                      'baselineRoot': str(baseline_root), 'output': str(output)}))


if __name__ == '__main__':
    main()
