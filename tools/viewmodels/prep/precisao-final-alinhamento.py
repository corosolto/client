"""Alinhamento arma própria ↔ braços do pack por contato, e trajetórias doador.

Saídas em artifacts/viewmodels/prep/precisao/final/:
- alinhamento-<arma>.json: matriz 4x4 (obj da própria → cena no idle do C2),
  encaixe grosseuro anatômico + refino Nelder-Mead próprio (sem scipy):
  minimiza penetração (distância com sinal) e folga (vértices próximos demais
  longe da superfície) das duas mãos contra a malha da arma própria.
- donor-traj-<base>.json: por clipe e osso, matrizes relativas a ik_hand_gun
  nos tempos-chave do track (insumo do reancoramento no builder).
- alinhamento-<arma>-{lateral,topo}.png: dispersão de conferência.
"""
import json
import struct
import subprocess
import zlib
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[3]
A = RAIZ / 'artifacts/viewmodels/prep/precisao/final'
ISO = Path('/Users/ruben/csbrasil-private-assets/generated/precisao-c2-isolated')

GRIP_OBJ = {
    'mosin': [-0.195, -0.045, -0.010],
    'svd': [-0.270, -0.075, 0.010],
    'sks': [-0.170, -0.050, -0.010],
}
# Landmarks próprios (espaço-objeto): ferrolho/receiver, coronha e topo da luneta.
BOLT_OBJ = {
    'mosin': [-0.125, 0.010, -0.005],
    'svd': [0.000, 0.030, 0.010],
    'sks': [-0.050, 0.040, 0.000],
}
BUTT_OBJ = {
    'mosin': [-0.480, -0.060, -0.022],
    'svd': [-0.470, -0.050, 0.000],
    'sks': [-0.470, -0.060, -0.015],
}


def ler(path):
    b = Path(path).read_bytes()
    n = struct.unpack_from('<I', b, 12)[0]
    return json.loads(b[20:20 + n]), b[28 + n:]


def accessor(j, b, i):
    a = j['accessors'][i]
    if a.get('bufferView') is None:
        return np.zeros((a.get('count', 0), 1))
    v = j['bufferViews'][a['bufferView']]
    tipos = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1', 5122: '<i2', 5120: '<i1'}
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


def amostra(anim, j, b, t):
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


def skin_prims(j, b, node_idx):
    node = j['nodes'][node_idx]
    mesh = j['meshes'][node['mesh']]
    skin = j['skins'][node['skin']]
    # MAT4 glTF é column-major: transpor após o reshape
    ibm = accessor(j, b, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    out = []
    for prim in mesh['primitives']:
        out.append({
            'pos': accessor(j, b, prim['attributes']['POSITION']).astype(np.float64),
            'joints': accessor(j, b, prim['attributes']['JOINTS_0']).astype(int),
            'weights': accessor(j, b, prim['attributes']['WEIGHTS_0']).astype(np.float64),
            'indices': accessor(j, b, prim['indices']).astype(int),
            'joints_map': list(skin['joints']), 'ibm': ibm,
        })
    return out


def deform(prim, mats):
    acc = np.zeros((len(prim['pos']), 3))
    p = np.c_[prim['pos'], np.ones(len(prim['pos']))]
    M = np.stack([mats[ji] for ji in prim['joints_map']]) @ prim['ibm']
    for k in range(4):
        jj = prim['joints'][:, k]
        for bij in np.unique(jj):
            sel = jj == bij
            if not sel.any():
                continue
            acc[sel] += (M[bij] @ p[sel].T).T[:, :3] * prim['weights'][sel, k][:, None]
    return acc


def closest_info(points, tris, chunk=48):
    """Por ponto: (distância, sinal) contra o triângulo mais próximo.
    sinal<0 → ponto atrás do plano do triângulo (candidato a dentro)."""
    a, b_, c = tris[:, 0], tris[:, 1], tris[:, 2]
    ab, ac = b_ - a, c - a
    n = np.cross(ab, ac)
    nunit = n / np.maximum(np.linalg.norm(n, axis=1), 1e-15)[:, None]
    aa = np.einsum('ti,ti->t', ab, ab)
    bb = np.einsum('ti,ti->t', ab, ac)
    cc = np.einsum('ti,ti->t', ac, ac)
    det = aa * cc - bb * bb
    safe = np.abs(det) > 1e-15
    bc = c - b_
    bcn = np.einsum('ti,ti->t', bc, bc)
    N = len(points)
    dist = np.empty(N)
    sinal = np.empty(N)
    for s in range(0, N, chunk):
        pts = points[s:s + chunk]
        p = pts[:, None, None, :]                     # (c,1,1,3)
        ap = p - a[None, None]                        # (c,1,t,3)
        d1 = np.einsum('cnti,ti->cnt', ap, ab)        # (c,1,t)
        d2 = np.einsum('cnti,ti->cnt', ap, ac)
        u = np.where(safe, (cc * d1 - bb * d2) / np.where(safe, det, 1), 0)
        v = np.where(safe, (aa * d2 - bb * d1) / np.where(safe, det, 1), 0)
        inside = (u >= 0) & (v >= 0) & (u + v <= 1)
        q_in = a[None, None] + u[..., None] * ab[None, None] + v[..., None] * ac[None, None]
        t_ab = np.clip(d1 / np.where(aa > 1e-15, aa, 1), 0, 1)
        q_ab = a[None, None] + t_ab[..., None] * ab[None, None]
        t_ac = np.clip(d2 / np.where(cc > 1e-15, cc, 1), 0, 1)
        q_ac = a[None, None] + t_ac[..., None] * ac[None, None]
        bp = p - b_[None, None]
        t_bc = np.clip(np.einsum('cnti,ti->cnt', bp, bc) / np.where(bcn > 1e-15, bcn, 1), 0, 1)
        q_bc = b_[None, None] + t_bc[..., None] * bc[None, None]
        cand = np.stack([
            q_in + 1e9 * (~inside)[..., None],
            q_ab, q_ac, q_bc,
            np.broadcast_to(a[None, None], q_ab.shape),
            np.broadcast_to(b_[None, None], q_ab.shape),
            np.broadcast_to(c[None, None], q_ab.shape),
        ])                                             # (7,c,1,t,3)
        cand = cand[:, :, 0]                           # (7,c,t,3)
        dd = np.linalg.norm(cand - p[:, 0], axis=3)    # (7,c,t)
        d_t = dd.min(0)                                # (c,t)
        ii = np.arange(len(pts))
        t_idx = d_t.argmin(1)
        dist[s:s + chunk] = d_t[ii, t_idx]
        k_idx = dd.argmin(0)                           # (c,t)
        q = cand[k_idx[ii, t_idx], ii, t_idx]          # (c,3)
        sinal[s:s + chunk] = np.einsum('ij,ij->i', pts - q, nunit[t_idx])
    return dist, sinal


def inside_ray(points, tris, chunk=256):
    """Paridade de raio (+Y) contra a malha: True para ponto interno (malha fechada)."""
    a, b_, c = tris[:, 0], tris[:, 1], tris[:, 2]
    e1, e2 = b_ - a, c - a
    d = np.array([0.0, 1.0, 0.0])
    pvec = np.cross(d, e2)
    det = np.einsum('ti,ti->t', e1, pvec)
    ok = np.abs(det) > 1e-12
    inv = np.where(ok, 1.0 / np.where(ok, det, 1), 0)
    out = np.empty(len(points), dtype=bool)
    for s in range(0, len(points), chunk):
        pts = points[s:s + chunk]
        tvec = pts[:, None, :] - a[None]
        u = np.einsum('cti,ti->ct', tvec, pvec) * inv[None]
        qvec = np.cross(tvec, e1[None])
        v = np.einsum('i,cti->ct', d, qvec) * inv[None]
        t = np.einsum('cti,ti->ct', qvec, e2) * inv[None]
        hit = ok[None] & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-9)
        out[s:s + chunk] = hit.sum(1) % 2 == 1
    return out


def own_mesh(w):
    j, b = ler(RAIZ / f'public/models/weapons/{w}.glb')
    ni = next(i for i, n in enumerate(j['nodes']) if n.get('mesh') is not None)
    prims = j['meshes'][j['nodes'][ni]['mesh']]['primitives']
    P = np.vstack([accessor(j, b, p['attributes']['POSITION']).astype(np.float64) for p in prims])
    base = 0
    T = []
    for p in prims:
        I = accessor(j, b, p['indices']).astype(int) + base
        T.append(I.reshape(-1, 3))
        base += len(accessor(j, b, p['attributes']['POSITION']))
    return P, np.vstack(T)


def scatter_png(path, groups, res=(900, 560)):
    """groups: [(verts Nx3, cor), ...] — projeção ortográfica lateral/topo."""
    allv = np.vstack([g[0] for g in groups])
    for eye in ('lateral', 'topo'):
        if eye == 'lateral':
            u_ax, v_ax = 0, 2
        else:
            u_ax, v_ax = 0, 1
        lo = allv.min(0)
        ext = (allv.max(0) - lo).max() * 1.05
        W, H = res
        img = np.full((H, W, 3), 18, dtype=np.uint8)
        for verts, cor in groups:
            u = ((verts[:, u_ax] - lo[u_ax]) / ext + 0.02) * (W - 4)
            v = ((verts[:, v_ax] - lo[v_ax]) / ext + 0.02) * (H - 4)
            x = np.clip(u.astype(int), 0, W - 1)
            y = np.clip((H - 1 - v.astype(int)), 0, H - 1)
            img[y, x] = cor
        raw = b''.join(b'\x00' + row.tobytes() for row in img)

        def chunk(tag, data):
            C = tag + data
            return struct.pack('>I', len(data)) + C + struct.pack('>I', zlib.crc32(C))
        png = (b'\x89PNG\r\n\x1a\n'
               + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0))
               + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))
        out = Path(str(path).replace('.png', f'-{eye}.png'))
        out.write_bytes(png)


def nelder_mead(f, x0, maxiter=360, step=None, atol=1e-5):
    n = len(x0)
    if step is None:
        step = np.full(n, 0.01)
    step = np.asarray(step, dtype=float)
    sim = [np.array(x0, dtype=float)]
    for i in range(n):
        p = np.array(x0, dtype=float)
        p[i] += step[i]
        sim.append(p)
    sim = np.array(sim)
    fv = np.array([f(p) for p in sim])
    for _ in range(maxiter):
        order = np.argsort(fv)
        sim, fv = sim[order], fv[order]
        if np.max(np.abs(sim[1:] - sim[0])) < atol and np.abs(fv[-1] - fv[0]) < atol:
            break
        cen = sim[:-1].mean(0)
        xr = cen + (cen - sim[-1])
        fr = f(xr)
        if fr < fv[0]:
            xe = cen + 2 * (cen - sim[-1])
            fe = f(xe)
            if fe < fr:
                sim[-1], fv[-1] = xe, fe
            else:
                sim[-1], fv[-1] = xr, fr
        elif fr < fv[-2]:
            sim[-1], fv[-1] = xr, fr
        else:
            xc = cen + 0.5 * (sim[-1] - cen)
            fc = f(xc)
            if fc < fv[-1]:
                sim[-1], fv[-1] = xc, fc
            else:
                sim[1:] = sim[0] + 0.5 * (sim[1:] - sim[0])
                for i in range(1, len(sim)):
                    fv[i] = f(sim[i])
    order = np.argsort(fv)
    return sim[order][0], fv[order][0]


def main():
    assert RAIZ.name == 'vm-prep-precisao'
    assert subprocess.check_output(['git', 'branch', '--show-current'], cwd=RAIZ,
                                   text=True).strip() == 'codex/vm-prep-precisao'
    A.mkdir(parents=True, exist_ok=True)
    armas = {'mosin': 'bolt', 'svd': 'svd', 'sks': 'bolt'}
    bones_de = ('Bolt', 'StaticBolt', 'Mag', 'MagRelease', 'Clip', 'Cartridge', 'ik_hand_gun')

    for arma, base in armas.items():
        j, b = ler(ISO / f'{base}-runtime.glb')
        names = [n.get('name', f'node{i}') for i, n in enumerate(j['nodes'])]
        idx = {n: i for i, n in enumerate(names)}
        idle = next(a for a in j['animations'] if a['name'] == 'idle')
        mats = node_mats(j, amostra(idle, j, b, 0.0))

        traj = {}
        for anim in j['animations']:
            for c in anim['channels']:
                tgt = c['target']
                if tgt.get('node') is None:
                    continue
                nm = names[tgt['node']]
                if nm not in bones_de and not nm.startswith('CartridgeClip'):
                    continue
                q = anim['samplers'][c['sampler']]
                ts = accessor(j, b, q['input']).ravel().tolist()
                ent = traj.setdefault(f"{anim['name']}::{nm}", {'tempos': []})
                ent['tempos'] = sorted(set(ent['tempos'] + ts))
        for chave, ent in traj.items():
            anim_name, nm = chave.split('::')
            anim = next(a for a in j['animations'] if a['name'] == anim_name)
            ent['matrizes'] = []
            for t in ent['tempos']:
                mm = node_mats(j, amostra(anim, j, b, t))
                ent['matrizes'].append(
                    (np.linalg.inv(mm[idx['ik_hand_gun']]) @ mm[idx[nm]]).tolist())
        (A / f'donor-traj-{arma}-{base}.json').write_text(json.dumps(traj, indent=1) + '\n')

        hand_prims = []
        for ni, n in enumerate(j['nodes']):
            if n.get('skin') is None or 'GEO_FP_SK' not in n.get('name', ''):
                continue
            hand_prims += skin_prims(j, b, ni)
        hand_verts = np.vstack([deform(p, mats) for p in hand_prims])
        hr = mats[idx['hand_r']][:3, 3]
        hl = mats[idx['hand_l']][:3, 3]
        d_r = np.linalg.norm(hand_verts - hr, axis=1)
        d_l = np.linalg.norm(hand_verts - hl, axis=1)
        right_hand = hand_verts[d_r < 0.085]
        left_hand = hand_verts[(d_l < 0.085) & (d_r >= 0.085)]

        P, T = own_mesh(arma)
        hg = mats[idx['ik_hand_gun']]
        hr = mats[idx['hand_r']][:3, 3]
        palm_r = right_hand.mean(0)
        palm_l = left_hand.mean(0)

        # ---- doador como referência: arma deformada em idle ----
        widx = next(i for i, n in enumerate(j['nodes'])
                    if n.get('mesh') is not None and 'GEO_WEAPON' in n.get('name', ''))
        wprims = skin_prims(j, b, widx)
        dw = np.vstack([deform(p, mats) for p in wprims])

        def base_foco(V):
            c = V.mean(0)
            _, _, vt = np.linalg.svd(V - c, full_matrices=False)
            fwd = vt[0]
            proj = (V - c) @ fwd
            lo, hi = proj < np.percentile(proj, 4), proj > np.percentile(proj, 96)

            def secao(sel):
                pts = V[sel]
                return np.linalg.svd(pts - pts.mean(0), compute_uv=False)[1]

            if secao(hi) < secao(lo):
                fwd = fwd       # boca no +fwd
            else:
                fwd = -fwd      # boca no -fwd → inverte para apontar à boca
            up = vt[1] if vt[1] @ np.array([0, 1.0, 0]) >= 0 else -vt[1]
            up = up - fwd * up.dot(fwd)
            up /= np.linalg.norm(up)
            right = np.cross(fwd, up)
            return c, np.stack([fwd, up, right], axis=1)

        c_o, B_o = base_foco(P)
        c_d, B_d = base_foco(dw)
        R0 = B_d @ B_o.T
        if np.linalg.det(R0) < 0:
            right_o = np.cross(B_o[:, 0], B_o[:, 1])
            B_o = np.stack([B_o[:, 0], B_o[:, 1], right_o], axis=1)
            R0 = B_d @ B_o.T
        t0 = c_d - R0 @ c_o
        # refinamento de translação: região de empunhadura sobre a mão forte
        g_o = P[np.linalg.norm(P - np.array(GRIP_OBJ[arma]), axis=1) < 0.16].mean(0)
        g_d = dw[np.linalg.norm(dw - hr, axis=1) < 0.16].mean(0)
        t0 += g_d - (R0 @ g_o + t0)
        T0 = np.eye(4)
        T0[:3, :3] = R0
        T0[:3, 3] = t0

        rng = np.random.default_rng(7)
        sel_r = right_hand[np.linalg.norm(right_hand - palm_r, axis=1) < 0.05]
        sel_l = left_hand[np.linalg.norm(left_hand - palm_l, axis=1) < 0.05]
        sel_r = sel_r[rng.choice(len(sel_r), min(240, len(sel_r)), replace=False)]
        sel_l = sel_l[rng.choice(len(sel_l), min(240, len(sel_l)), replace=False)]

        # ---- registro rígido ICP: própria → doador (init = base PCA) ----
        wv_list = [deform(p_, mats) for p_ in wprims]
        dwv = np.vstack(wv_list)
        dw_sub = dwv[rng.choice(len(dwv), min(1600, len(dwv)), replace=False)]
        src = P[rng.choice(len(P), min(700, len(P)), replace=False)]
        R_icp, t_icp = R0.copy(), t0.copy()
        icp_log = []
        for _ in range(30):
            cur = (R_icp @ src.T).T + t_icp
            nn = np.linalg.norm(cur[:, None, :] - dw_sub[None, :, :], axis=2)
            idx_near = nn.argmin(1)
            dist_nn = nn[np.arange(len(cur)), idx_near]
            lim = max(0.05, float(np.median(dist_nn)) * 2.0)
            keep = dist_nn < lim
            if keep.sum() < 40:
                break
            ptsA = src[keep]
            ptsB = dw_sub[idx_near[keep]]
            ca, cb = ptsA.mean(0), ptsB.mean(0)
            U_, _, Vt_ = np.linalg.svd((ptsA - ca).T @ (ptsB - cb))
            S_ = np.diag([1, 1, np.sign(np.linalg.det(U_ @ Vt_))])
            R_icp = U_ @ S_ @ Vt_
            t_icp = cb - R_icp @ ca
            icp_log.append(round(float(np.median(dist_nn)), 5))
        # ---- polimento: reduzir penetração real sem perder contato ----
        def custo_pol(x):
            rx = np.array(x[:3])
            ang = np.linalg.norm(rx)
            Rp = R_icp
            if ang > 1e-9:
                k_ = rx / ang
                K_ = np.array([[0, -k_[2], k_[1]], [k_[2], 0, -k_[0]], [-k_[1], k_[0], 0]])
                Rp = (np.eye(3) + np.sin(ang) * K_ + (1 - np.cos(ang)) * (K_ @ K_)) @ R_icp
            tp = t_icp + np.array(x[3:6])
            Wp = (Rp @ P.T).T + tp
            tris_p = Wp[T]
            c = 0.0
            for hv in (sel_r, sel_l):
                d, sg = closest_info(hv, tris_p)
                k40 = np.partition(d, min(40, len(d) - 1))[:min(40, len(d))]
                c += np.maximum(k40 - 0.010, 0).sum() * 500.0
                cand = hv[sg < -0.0008]
                if len(cand):
                    verdadeiro = inside_ray(cand, tris_p)
                    if verdadeiro.any():
                        dd, ss = closest_info(cand[verdadeiro], tris_p)
                        c += np.maximum(-ss - 0.002, 0).sum() * 9000.0
                        c += verdadeiro.sum() * 30.0
            return c

        xp, fp = nelder_mead(custo_pol, np.zeros(6), maxiter=160,
                             step=np.array([0.01, 0.01, 0.01, 0.006, 0.006, 0.006]))
        rx = np.array(xp[:3])
        ang = np.linalg.norm(rx)
        R_fin = R_icp
        if ang > 1e-9:
            k_ = rx / ang
            K_ = np.array([[0, -k_[2], k_[1]], [k_[2], 0, -k_[0]], [-k_[1], k_[0], 0]])
            R_fin = (np.eye(3) + np.sin(ang) * K_ + (1 - np.cos(ang)) * (K_ @ K_)) @ R_icp
        t_fin = t_icp + np.array(xp[3:6])
        Tfin = np.eye(4)
        Tfin[:3, :3] = R_fin
        Tfin[:3, 3] = t_fin

        Wv = (R_fin @ P.T).T + t_fin
        tris_full = Wv[T]
        rep = {'T_obj_para_idle_scene': Tfin.tolist(), 'grip_obj': GRIP_OBJ[arma],
               'coarse_T': T0.tolist(), 'icp_log': icp_log,
               'icp_med_final': icp_log[-1] if icp_log else None,
               'n_hand_r': int(len(right_hand)), 'n_hand_l': int(len(left_hand))}
        for tag, hv in (('hand_r', sel_r), ('hand_l', sel_l)):
            d, s = closest_info(hv, tris_full)
            k40 = np.partition(d, min(40, len(d) - 1))[:min(40, len(d))]
            rep[f'{tag}_dist'] = {'min': float(d.min()), 'k40_med': float(np.median(k40)),
                                  'p90': float(np.percentile(d, 90))}
            cand = hv[s < -0.0008]
            verdadeiro = inside_ray(cand, tris_full) if len(cand) else np.array([], dtype=bool)
            rep[f'{tag}_dentro'] = {'n_sinal': int(len(cand)), 'n_raio': int(verdadeiro.sum()),
                                    'prof_max': float((-s[s < -0.0008]).max()) if len(cand) else 0.0}
        (A / f'alinhamento-{arma}.json').write_text(json.dumps(rep, indent=1) + '\n')
        scatter_png(A / f'alinhamento-{arma}.png',
                    [(Wv, (140, 140, 150)), (right_hand, (230, 170, 140)),
                     (left_hand, (200, 120, 110))])
        print('==', arma, 'icp_med', rep['icp_med_final'],
              'r k40', round(rep['hand_r_dist']['k40_med'], 4),
              'l k40', round(rep['hand_l_dist']['k40_med'], 4),
              'dentro_raio r', rep['hand_r_dentro']['n_raio'],
              'l', rep['hand_l_dentro']['n_raio'], 'polish_f', round(float(fp), 1))


if __name__ == '__main__':
    main()
