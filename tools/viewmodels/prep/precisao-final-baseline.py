"""Baseline do doador para calibrar os gates C e F com procedência.

Mesma régua do gate, aplicada ao runtime C2 nativo da família (arma DOADORA
deformada nas mãos do pack): conta vértices de mão com raio-dentro, profundidade
pelo sinal, k40 por palma e fração projetada no quadro por aspecto. Saída:
A/final/donor-baseline.json — os gates aprovam 'não pior que o baseline', não
números absolutos inventados.
"""
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[3]
F = RAIZ / 'artifacts/viewmodels/prep/precisao/final'
ISO = Path('/Users/ruben/csbrasil-private-assets/generated/precisao-c2-isolated')

sys.modules['alinh'] = None
_spec = importlib.util.spec_from_file_location(
    'alinh', RAIZ / 'tools/viewmodels/prep/precisao-final-alinhamento.py')
alinh = importlib.util.module_from_spec(_spec)
sys.modules['alinh'] = alinh
_spec.loader.exec_module(alinh)
_spec2 = importlib.util.spec_from_file_location('gts', RAIZ / 'tools/viewmodels/prep/precisao-final-gates.py')
gts = importlib.util.module_from_spec(_spec2)
sys.modules['gts'] = gts
_spec2.loader.exec_module(gts)

ler, node_mats, amostra, accessor = alinh.ler, alinh.node_mats, alinh.amostra, alinh.accessor

FAMILIA = {'mosin': 'bolt', 'svd': 'svd', 'sks': 'marksman'}
BASE = {'mosin': 'bolt', 'svd': 'svd', 'sks': 'bolt'}


def donor_weapon_tris(j, b, mats, wi):
    skin = j['skins'][j['nodes'][wi]['skin']]
    jms = [mats[x] for x in skin['joints']]
    ibm = accessor(j, b, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    tris = []
    for prim in j['meshes'][j['nodes'][wi]['mesh']]['primitives']:
        pos = accessor(j, b, prim['attributes']['POSITION'])
        jnts = accessor(j, b, prim['attributes']['JOINTS_0']).astype(int)
        wts = accessor(j, b, prim['attributes']['WEIGHTS_0']).astype(float)
        acc = np.zeros((len(pos), 3))
        ph = np.c_[pos, np.ones(len(pos))]
        for k in range(4):
            jj = jnts[:, k]
            for bij in np.unique(jj):
                sel = jj == bij
                if sel.any():
                    acc[sel] += (jms[bij] @ ibm[bij] @ ph[sel].T).T[:, :3] * wts[sel, k][:, None]
        I = accessor(j, b, prim['indices']).astype(int).reshape(-1, 3) if 'indices' in prim \
            else np.arange(len(acc)).reshape(-1, 3)
        tris.append(acc[I])
    return np.vstack(tris)


def main():
    out = {}
    for arma in FAMILIA:
        fam = BASE[arma]
        familia = FAMILIA[arma]
        j, b = ler(ISO / f'{fam}-runtime.glb')
        names = [n.get('name', '') for n in j['nodes']]
        idx = {n: i for i, n in enumerate(names)}
        wi = next(i for i, n in enumerate(j['nodes'])
                  if n.get('mesh') is not None and 'GEO_WEAPON' in n.get('name', ''))
        res = {'C': {}, 'F': {}}
        for anim in j['animations']:
            if not (anim['name'] == 'idle' or anim['name'].startswith('reload')):
                continue
            dur = gts.clip_dur(anim, j, b)
            fases = [0.0, .18, .35, .5, .62, .86, 1.0]
            pior_n = pior_prof = 0.0
            pior_vis = 0
            melhor_k40 = [9.9, 9.9]
            for f in fases:
                mats = node_mats(j, amostra(anim, j, b, dur * f))
                tris = donor_weapon_tris(j, b, mats, wi)
                hv = gts.hands_skinned(j, b, mats)
                hr, hl = gts.palms(j, mats)
                lo, hi = tris.reshape(-1, 3).min(0) - 0.02, tris.reshape(-1, 3).max(0) + 0.02
                sub = hv[np.all((hv >= lo) & (hv <= hi), axis=1)]
                if len(sub) < 10:
                    continue
                dm = gts.inside_ray(sub, tris)
                if dm.any():
                    dd, ss = alinh.closest_info(sub[dm], tris)
                    prof = -ss
                    cam_p = mats[idx['VIEWMODEL_CAMERA']][:3, 3]
                    vis = gts.visivel_dentro(sub[dm], tris, cam_p)
                    pior_n = max(pior_n, int((prof > 0.003).sum()))
                    pior_vis = max(pior_vis, int(((prof > 0.003) & vis).sum()))
                    pior_prof = max(pior_prof, float(prof.max()))
                for k, pj in enumerate((hr, hl)):
                    near = sub[np.linalg.norm(sub - pj, axis=1) < 0.06]
                    if len(near) < 10:
                        continue
                    if len(near) > 240:
                        near = near[np.argsort(np.linalg.norm(near - pj, axis=1))[:240]]
                    dd, _ = alinh.closest_info(near, tris)
                    k40 = np.partition(dd, min(40, len(dd) - 1))[:min(40, len(dd))]
                    melhor_k40[k] = min(melhor_k40[k], float(np.median(k40)))
            res['C'][anim['name']] = {'n_gt3mm': pior_n, 'n_visivel_gt3mm': pior_vis,
                                      'prof_max_mm': round(pior_prof * 1000, 1),
                                      'k40_r_min_mm': round(melhor_k40[0] * 1000, 1),
                                      'k40_l_min_mm': round(melhor_k40[1] * 1000, 1)}
        mats = node_mats(j, amostra(next(a for a in j['animations'] if a['name'] == 'idle'), j, b, 0.0))
        tris = donor_weapon_tris(j, b, mats, wi)
        cam = mats[idx['VIEWMODEL_CAMERA']]
        ci = np.linalg.inv(cam)
        wv = (ci[:3, :3] @ tris.reshape(-1, 3).T).T + ci[:3, 3]
        fr = gts.frame_de(familia)
        rx, ry, rz = [np.radians(float(r)) for r in fr['rotDeg']]
        Rx = np.array([[1, 0, 0], [0, np.cos(rx), -np.sin(rx)], [0, np.sin(rx), np.cos(rx)]])
        Ry = np.array([[np.cos(ry), 0, np.sin(ry)], [0, 1, 0], [-np.sin(ry), 0, np.cos(ry)]])
        Rz = np.array([[np.cos(rz), -np.sin(rz), 0], [np.sin(rz), np.cos(rz), 0], [0, 0, 1]])
        R = Rz @ Ry @ Rx
        for asp, tag in ((1.5, '3x2'), (16 / 9, '16x9')):
            v = wv @ R.T + np.array([float(c) for c in fr['xyz']])
            px, mask, W, H = gts.projetar(v, {'fov': float(fr['fov'])}, asp)
            d = mask & (px[:, 0] >= 0) & (px[:, 0] < W) & (px[:, 1] >= 0) & (px[:, 1] < H)
            res['F'][tag] = round(float(d.mean()), 3)
            if d.any():
                res.setdefault('F_bbox', {})[tag] = [round(float(px[d][:, 0].min() / W), 3),
                                                     round(float(px[d][:, 1].min() / H), 3),
                                                     round(float(px[d][:, 0].max() / W), 3),
                                                     round(float(px[d][:, 1].max() / H), 3)]
        out[arma] = {'base': fam, **res}
        print('==', arma, json.dumps(res))
    (F / 'donor-baseline.json').write_text(json.dumps(out, indent=1) + '\n')


if __name__ == '__main__':
    main()
