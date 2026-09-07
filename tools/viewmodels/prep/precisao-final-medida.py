"""Medição base da produção final: armas próprias, doador deformado e ossos de mecanismo.

Lê os runtimes C2 (assembler vigente, timing verificado em assembly-c2/verification.json)
e as armas Mint próprias; avalia o skinning em poses e registra landmarks, faixas de
animação dos ossos de mecanismo e câmera. Saída: artifacts/viewmodels/prep/precisao/final/medida.json.
"""
import json
import struct
import subprocess
import sys
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[3]
A = RAIZ / 'artifacts/viewmodels/prep/precisao'
ISO = Path('/Users/ruben/csbrasil-private-assets/generated/precisao-c2-isolated')
INT = RAIZ.parent / 'vm-astra-pistol'


def ler(path):
    b = Path(path).read_bytes()
    n = struct.unpack_from('<I', b, 12)[0]
    return json.loads(b[20:20 + n]), b[28 + n:]


def accessor(j, b, i):
    a = j['accessors'][i]
    if a.get('bufferView') is None:
        return np.zeros((a.get('count', 0), 1))
    v = j['bufferViews'][a['bufferView']]
    tipos = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1', 5122: '<i2', 5120: 'i1'}
    tam = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    dt = np.dtype(tipos[a['componentType']])
    stride = v.get('byteStride', tam * dt.itemsize)
    x = np.ndarray((a['count'], tam), dtype=dt, buffer=b,
                   offset=v.get('byteOffset', 0) + a.get('byteOffset', 0),
                   strides=(stride, dt.itemsize)).copy()
    if a.get('normalized'):
        x = x.astype(float) / np.iinfo(dt).max
    return x


def trs(n):
    if 'matrix' in n:
        return np.array(n['matrix']).reshape(4, 4).T
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    m = np.eye(4)
    m[:3, :3] = np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ]) @ np.diag(n.get('scale', [1, 1, 1]))
    m[:3, 3] = n.get('translation', [0, 0, 0])
    return m


def quat_angle_deg(q):
    return 2 * np.degrees(np.arccos(np.clip(abs(q[3]), -1, 1)))


def amostra(anim, j, b, t):
    """Node-index → path → valor interpolado em t (slerp para rotação)."""
    out = {}
    for c in anim['channels']:
        tgt = c['target']
        if tgt.get('node') is None:
            continue
        q = anim['samplers'][c['sampler']]
        ts = accessor(j, b, q['input']).ravel()
        val = accessor(j, b, q['output'])
        idx = int(np.searchsorted(ts, t, side='right') - 1)
        idx = max(0, min(idx, len(ts) - 1))
        if idx >= len(ts) - 1 or t <= ts[0] or q.get('interpolation') == 'STEP':
            v = val[idx]
        else:
            f = (t - ts[idx]) / (ts[idx + 1] - ts[idx])
            u, w = val[idx], val[idx + 1]
            if tgt['path'] == 'rotation':
                dot = np.dot(u, w)
                if dot < 0:
                    w = -w
                    dot = -dot
                if dot < .9995:
                    ang = np.arccos(np.clip(dot, -1, 1))
                    v = (np.sin((1 - f) * ang) * u + np.sin(f * ang) * w) / np.sin(ang)
                else:
                    v = u * (1 - f) + w * f
                v = v / np.linalg.norm(v)
            else:
                v = u * (1 - f) + w * f
        out.setdefault(tgt['node'], {})[tgt['path']] = v
    return out


def node_mats(j, override=None):
    nodes = [dict(n) for n in j['nodes']]
    if override:
        for ni, paths in override.items():
            nodes[ni].update(paths)
    parents = {c: i for i, n in enumerate(nodes) for c in n.get('children', [])}
    cache = {}

    def mat(i):
        if i not in cache:
            cache[i] = (mat(parents[i]) if i in parents else np.eye(4)) @ trs(nodes[i])
        return cache[i]
    for i in range(len(nodes)):
        mat(i)
    return cache


def skinned_vertices(j, b, node_idx, mats):
    """Vértices do mesh com skin no mundo; devolve (verts, prims) com material por prim."""
    node = j['nodes'][node_idx]
    mesh = j['meshes'][node['mesh']]
    skin = j['skins'][node['skin']]
    jms = np.stack([mats[ji] for ji in skin['joints']])
    ibm_all = accessor(j, b, skin['inverseBindMatrices'])
    ibm = [ibm_all[i].reshape(4, 4) for i in range(len(skin['joints']))]
    prims = []
    allv = []
    for prim in mesh['primitives']:
        pos = accessor(j, b, prim['attributes']['POSITION'])
        joints = accessor(j, b, prim['attributes']['JOINTS_0']).astype(int)
        weights = accessor(j, b, prim['attributes']['WEIGHTS_0']).astype(float)
        acc = np.zeros((len(pos), 3))
        p = np.c_[pos, np.ones(len(pos))]
        for k in range(4):
            jj = joints[:, k]
            for bij in np.unique(jj):
                sel = jj == bij
                if not sel.any():
                    continue
                m = (jms[bij] @ ibm[bij]) @ p[sel].T
                acc[sel] += m.T[:, :3] * weights[sel, k][:, None]
        prims.append({'material': prim.get('material'), 'count': len(pos)})
        allv.append(acc)
    return np.vstack(allv), prims


def ranges_mecanismo(j, b, bones):
    """Faixa de translação (m) e ângulo (°) por osso e clipe."""
    report = {}
    for anim in j.get('animations', []):
        for c in anim['channels']:
            tgt = c['target']
            if tgt.get('node') is None:
                continue
            name = j['nodes'][tgt['node']].get('name', '')
            if name not in bones:
                continue
            q = anim['samplers'][c['sampler']]
            val = accessor(j, b, q['output'])
            path = tgt['path']
            if path == 'translation':
                mag = np.linalg.norm(val - val[0], axis=1)
                d = {'trans_min_m': float(mag.min()), 'trans_max_m': float(mag.max()),
                     'delta_end_m': float(np.linalg.norm(val[-1] - val[0]))}
            elif path == 'rotation':
                ang = np.array([quat_angle_deg(v) for v in val])
                d = {'ang_max_deg': float(ang.max())}
            else:
                d = {}
            report.setdefault(name, {}).setdefault(anim['name'], {})[path] = d
    return report


def main():
    assert RAIZ.name == 'vm-prep-precisao'
    assert subprocess.check_output(['git', 'branch', '--show-current'], cwd=RAIZ, text=True).strip() == 'codex/vm-prep-precisao'
    out = A / 'final'
    out.mkdir(parents=True, exist_ok=True)

    weapons = {
        'mosin': {'base': 'bolt', 'own': RAIZ / 'public/models/weapons/mosin.glb'},
        'svd': {'base': 'svd', 'own': RAIZ / 'public/models/weapons/svd.glb'},
        'sks': {'base': 'bolt', 'own': RAIZ / 'public/models/weapons/sks.glb'},
    }
    report = {}
    for w, cfg in weapons.items():
        j, b = ler(ISO / f"{cfg['base']}-runtime.glb")
        names = [n.get('name', f'node{i}') for i, n in enumerate(j['nodes'])]
        idx = {n: i for i, n in enumerate(names)}
        idle = next(a for a in j['animations'] if a['name'] == 'idle')
        mats = node_mats(j, amostra(idle, j, b, 0.0))
        d = {'base': cfg['base'], 'base_glb': str(ISO / f"{cfg['base']}-runtime.glb")}

        # câmera e mãos em espaço de cena (idle)
        cam = mats[idx['VIEWMODEL_CAMERA']]
        cam_inv = np.linalg.inv(cam)
        cam_idx = idx['VIEWMODEL_CAMERA']
        d['camera'] = {'yfov': j['cameras'][j['nodes'][cam_idx]['camera']]['perspective']['yfov'],
                       'world': cam.tolist()}
        for bn in ('hand_l', 'hand_r', 'ik_hand_gun', 'ik_hand_root'):
            p = mats[idx[bn]][:3, 3]
            d.setdefault('maos', {})[bn] = p.tolist()

        # arma doadora deformada em idle, por material
        wmesh_idx = next(i for i, n in enumerate(j['nodes'])
                         if n.get('mesh') is not None and 'GEO_WEAPON' in n.get('name', ''))
        verts, prims = skinned_vertices(j, b, wmesh_idx, mats)
        d['donor'] = {
            'mesh_node': names[wmesh_idx],
            'verts': len(verts),
            'bbox_min': verts.min(0).tolist(), 'bbox_max': verts.max(0).tolist(),
            'extent': (verts.max(0) - verts.min(0)).tolist(),
            'camera_space_bbox_min': (verts @ cam_inv[:3, :3].T + cam_inv[:3, 3]).min(0).tolist(),
            'camera_space_bbox_max': (verts @ cam_inv[:3, :3].T + cam_inv[:3, 3]).max(0).tolist(),
        }
        pca_axes = {}
        for mat_i, p in enumerate(prims):
            mname = j['materials'][p['material']].get('name', '') if p['material'] is not None else ''
            sel = np.arange(p['count']) + sum(pp['count'] for pp in prims[:mat_i])
            v = verts[sel]
            if len(v) < 8:
                continue
            c = v.mean(0)
            u, s, vt = np.linalg.svd(v - c, full_matrices=False)
            pca_axes[mname] = {
                'count': int(len(v)),
                'centroid': c.tolist(),
                'extent': (v.max(0) - v.min(0)).tolist(),
                'axis0': vt[0].tolist(), 'axis1': vt[1].tolist(), 'axis2': vt[2].tolist(),
                'sv': s.tolist()[:3],
            }
        d['donor']['por_material'] = pca_axes

        # ossos de mecanismo: mundo em idle + faixas por clipe
        bones = [n for n in idx if n in (
            'Bolt', 'StaticBolt', 'Trigger', 'Cartridge', 'Clip', 'Mag', 'MagRelease',
            'Safety', 'Handle', 'ReleaseHandle', 'Sight', 'neutral_bone')
            or n.startswith('CartridgeClip')]
        mech = {}
        for bn in bones:
            node = j['nodes'][idx[bn]]
            mech[bn] = {'world_idle': mats[idx[bn]].tolist(),
                        'trs_local': {k: node.get(k, [0, 0, 0, 1] if k == 'rotation' else [0, 0, 0])
                                      for k in ('translation', 'rotation', 'scale')}}
        d['mecanismo'] = mech
        d['mecanismo_ranges'] = ranges_mecanismo(j, b, set(bones))

        # arma própria
        jo, bo = ler(cfg['own'])
        own_idx = next(i for i, n in enumerate(jo['nodes']) if n.get('mesh') is not None)
        om = jo['meshes'][jo['nodes'][own_idx]['mesh']]
        pos = np.vstack([accessor(jo, bo, p['attributes']['POSITION']) for p in om['primitives']])
        node_m = trs(jo['nodes'][own_idx])
        pos = (node_m[:3, :3] @ pos.T).T + node_m[:3, 3]
        c = pos.mean(0)
        u, s, vt = np.linalg.svd(pos - c, full_matrices=False)
        d['own'] = {
            'node': jo['nodes'][own_idx].get('name'),
            'verts': len(pos),
            'bbox_min': pos.min(0).tolist(), 'bbox_max': pos.max(0).tolist(),
            'extent': (pos.max(0) - pos.min(0)).tolist(),
            'centroid': c.tolist(),
            'axis0': vt[0].tolist(), 'axis1': vt[1].tolist(), 'axis2': vt[2].tolist(),
            'sv': s.tolist()[:3],
        }
        report[w] = d

    (out / 'medida.json').write_text(json.dumps(report, indent=2, default=float) + '\n')
    for w, d in report.items():
        print('==', w, 'base', d['base'])
        print('  own extent ', np.round(d['own']['extent'], 4).tolist(),
              'axis0', np.round(d['own']['axis0'], 3).tolist())
        print('  donor extent', np.round(d['donor']['extent'], 4).tolist(),
              'cam bbox y', round(d['donor']['camera_space_bbox_min'][1], 3),
              round(d['donor']['camera_space_bbox_max'][1], 3))
        print('  donor mats:', {k: v['count'] for k, v in d['donor']['por_material'].items()})
        for bn, rr in d['mecanismo_ranges'].items():
            for clip, paths in rr.items():
                print('   ', bn, clip, {p: {kk: round(vv, 4) for kk, vv in v.items()}
                                        for p, v in paths.items()})


if __name__ == '__main__':
    main()
