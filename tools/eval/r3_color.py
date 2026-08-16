#!/usr/bin/env python3
# Medicao de COR para a rodada 3 — dois alvos: (A) matiz/S/L* da agua do Piscinao,
# (B) saturacao do chao/cenario nos 4 mapas.
# PORQUE: o brief da r3 e inteiramente numerico; sem medir antes e depois no MESMO
# recorte, "dessaturei um pouco" vira opiniao. Reaproveita a colorimetria do r2_audit.py.
import os, sys, json, math
import numpy as np
from PIL import Image
from scipy import ndimage

MAPS = ['praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho']
VIEWS = ['169', '32']
POS = ['a', 'b', 'c', 'd']


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lstar(rgb01):
    lin = srgb_to_lin(rgb01)
    Y = lin[..., 0] * 0.2126 + lin[..., 1] * 0.7152 + lin[..., 2] * 0.0722
    f = np.where(Y > 0.008856, np.cbrt(np.maximum(Y, 1e-12)), (7.787 * Y) + 16.0 / 116.0)
    return 116.0 * f - 16.0


def hsv(rgb01):
    mx = rgb01.max(-1); mn = rgb01.min(-1); d = mx - mn
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0.0)
    r, g, b = rgb01[..., 0], rgb01[..., 1], rgb01[..., 2]
    h = np.zeros_like(mx)
    nz = d > 1e-6
    idx = nz & (mx == r); h[idx] = ((g - b)[idx] / d[idx]) % 6
    idx = nz & (mx == g) & ~(mx == r); h[idx] = ((b - r)[idx] / d[idx]) + 2
    idx = nz & (mx == b) & ~(mx == r) & ~(mx == g); h[idx] = ((r - g)[idx] / d[idx]) + 4
    return (h * 60.0) % 360.0, s, mx


HUD_RECTS = [
    (0.000, 0.000, 0.135, 0.210), (0.265, 0.000, 0.735, 0.125),
    (0.905, 0.000, 1.000, 0.085), (0.000, 0.870, 0.235, 1.000),
    (0.780, 0.845, 1.000, 1.000), (0.478, 0.462, 0.522, 0.538),
]


def hud_mask(h, w):
    m = np.zeros((h, w), bool)
    for x0, y0, x1, y1 in HUD_RECTS:
        m[int(y0 * h):int(math.ceil(y1 * h)), int(x0 * w):int(math.ceil(x1 * w))] = True
    return m


def sky_mask(rgb01, L, S, V):
    h, w = L.shape
    r, g, b = rgb01[..., 0], rgb01[..., 1], rgb01[..., 2]
    azul = (b > r + 0.03) & (b >= g - 0.02) & (V > 0.30) & (S < 0.62)
    lavado = (L > 82) & (S < 0.22)
    cand = (azul | lavado)
    cand[int(0.80 * h):, :] = False
    lab, n = ndimage.label(cand)
    if n == 0:
        return np.zeros_like(cand)
    topo = np.unique(lab[0:3, :]); topo = topo[topo > 0]
    m = np.isin(lab, topo)
    return ndimage.binary_closing(m, np.ones((5, 5)))


def water_blob(H, S, V, valid):
    # MAIOR COMPONENTE CONEXO azul/ciano/verde-azulado abaixo do horizonte visual.
    # PORQUE: o recorte estrito do brief. Uma mascara cromatica solta pega ceu refletido
    # em vidro e caixa d'agua azul; o maior componente e a lamina.
    h, w = S.shape
    m = valid & (H > 140) & (H < 255) & (S > 0.12) & (V > 0.10)
    m[:int(0.42 * h), :] = False
    lab, n = ndimage.label(m)
    if n == 0:
        return None
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    if sizes.max() < 800:
        return None
    return lab == k


def vm_mask(h, w):
    # Viewmodel (arma + maos) — a REGUA manda excluir. Ocupa o canto inferior direito em
    # todos os frames; sem esse recorte a madeira laranja da AK sozinha joga o pctS55 do
    # "cenario" pra cima e a medida deixa de falar do mapa.
    m = np.zeros((h, w), bool)
    m[int(0.58 * h):, int(0.55 * w):] = True
    m[int(0.78 * h):, :int(0.30 * w)] = True     # arma secundaria / mao esquerda
    return m


def ground_mask(valid, h, w):
    # Faixa inferior-ESQUERDA: e chao em toda posicao de camera de altura de olho e fica
    # fora do viewmodel. Equivale ao recorte x200-900 / y560-760 que o critico usou no 16:9.
    m = np.zeros((h, w), bool)
    m[int(0.62 * h):int(0.95 * h), int(0.10 * w):int(0.55 * w)] = True
    return m & valid


def measure(path):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im, np.float64) / 255.0
    h, w = a.shape[:2]
    L = lstar(a); H, S, V = hsv(a)
    hud = hud_mask(h, w); sky = sky_mask(a, L, S, V)
    valid = (~hud) & (~sky) & (~vm_mask(h, w))
    d = {}
    Sv = S[valid]; Lv = L[valid]
    d['cena_sat'] = float(Sv.mean())
    d['cena_pctS55'] = 100.0 * float((Sv > 0.55).mean())
    d['cena_L'] = float(Lv.mean())
    gm = ground_mask(valid, h, w)
    if gm.sum() > 500:
        d['chao_sat'] = float(S[gm].mean())
        d['chao_pctS55'] = 100.0 * float((S[gm] > 0.55).mean())
        d['chao_L'] = float(L[gm].mean())
        d['chao_rgb'] = [float(x) for x in (a[gm].mean(0) * 255)]
    wm = water_blob(H, S, V, valid)
    if wm is not None:
        hh = np.deg2rad(H[wm])
        hu = (np.rad2deg(np.arctan2(np.sin(hh).mean(), np.cos(hh).mean())) + 360) % 360
        d['agua_hue'] = float(hu); d['agua_sat'] = float(S[wm].mean())
        d['agua_L'] = float(L[wm].mean())
        d['agua_pct'] = 100.0 * float(wm.sum()) / (h * w)
    return d


def ferro_patch(path):
    # Recorte literal do brief: x200-900, y560-760 no 16:9.
    im = Image.open(path).convert('RGB')
    a = np.asarray(im, np.float64) / 255.0
    h, w = a.shape[:2]
    if w < 900 or h < 760:
        return None
    p = a[560:760, 200:900]
    _, S, _ = hsv(p)
    return dict(rgb=[float(x) for x in (p.reshape(-1, 3).mean(0) * 255)],
                sat=float(S.mean()), pctS55=100.0 * float((S > 0.55).mean()))


def run(root, label):
    out = {}
    for mp in MAPS:
        rows = []
        for vw in VIEWS:
            for p in POS:
                f = f'{root}/game-{mp}-{vw}-{p}.png'
                if os.path.exists(f):
                    rows.append(measure(f))
        if not rows:
            continue
        agg = {}
        for k in ['cena_sat', 'cena_pctS55', 'cena_L', 'chao_sat', 'chao_pctS55', 'chao_L']:
            vals = [r[k] for r in rows if k in r]
            if vals:
                agg[k] = float(np.mean(vals))
        aw = [r for r in rows if 'agua_hue' in r]
        if aw:
            hh = np.deg2rad([r['agua_hue'] for r in aw])
            agg['agua_hue'] = float((np.rad2deg(np.arctan2(np.sin(hh).mean(), np.cos(hh).mean())) + 360) % 360)
            agg['agua_sat'] = float(np.mean([r['agua_sat'] for r in aw]))
            agg['agua_L'] = float(np.mean([r['agua_L'] for r in aw]))
            agg['agua_n'] = len(aw)
        out[mp] = agg
    fp = ferro_patch(f'{root}/game-ferro_velho-169-d.png')
    if fp:
        out['_ferro_patch_169d'] = fp
    print(f'--- {label} ({root}) ---')
    for mp in MAPS:
        if mp not in out:
            continue
        a = out[mp]
        s = f'{mp:15s} cena S={a.get("cena_sat",0):.3f} >55%={a.get("cena_pctS55",0):5.2f} L*={a.get("cena_L",0):5.1f}'
        s += f' | chao S={a.get("chao_sat",0):.3f} >55%={a.get("chao_pctS55",0):5.2f} L*={a.get("chao_L",0):5.1f}'
        if 'agua_hue' in a:
            s += f' | AGUA hue={a["agua_hue"]:6.1f} S={a["agua_sat"]:.3f} L*={a["agua_L"]:5.1f} n={a["agua_n"]}'
        print(s)
    if fp:
        print(f'  ferro 169-d patch(200-900,560-760): RGB=({fp["rgb"][0]:.0f},{fp["rgb"][1]:.0f},{fp["rgb"][2]:.0f}) '
              f'S={fp["sat"]:.3f} >0.55={fp["pctS55"]:.1f}%')
    print()
    return out


if __name__ == '__main__':
    roots = sys.argv[1:] or ['/root/shots/base', '/root/shots/r1', '/root/shots/r2']
    res = {}
    for r in roots:
        res[r] = run(r, os.path.basename(r))
    with open('/root/csb/tools/eval/r3_color.json', 'w') as fh:
        json.dump(res, fh, indent=1)
