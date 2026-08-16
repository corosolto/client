#!/usr/bin/env python3
# Auditoria fotometrica offline base/r1/r2 — SEM browser.
# PORQUE: o veredito do critico precisa ser numero reproduzivel, nao impressao. Toda
# metrica aqui e computada sobre o mesmo conjunto de pixels "cenario" nas tres rodadas
# (mesma mascara de HUD e mesma regra de ceu), senao a comparacao entre rodadas mente.
import os, sys, json, math
import numpy as np
from PIL import Image
from scipy import ndimage

ROUNDS = ['base', 'r1', 'r2']
MAPS = ['praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho']
VIEWS = ['169', '32']
POS = ['a', 'b', 'c', 'd']

# ---------- cor ----------

def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lstar(rgb01):
    # L* CIE sobre Y (D65). PORQUE: L* e perceptual; media de RGB cru exagera o peso dos altos.
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


# ---------- mascaras ----------
# Retangulos normalizados do HUD. Sao generosos de proposito: o mesmo recorte vale nas
# tres rodadas, entao um excesso de margem nao enviesa a comparacao.
HUD_RECTS = [
    (0.000, 0.000, 0.135, 0.210),   # radar
    (0.265, 0.000, 0.735, 0.125),   # placar/relogio/barra de captura
    (0.905, 0.000, 1.000, 0.085),   # icones canto sup. dir.
    (0.000, 0.870, 0.235, 1.000),   # HP
    (0.780, 0.845, 1.000, 1.000),   # municao + nome da arma
    (0.478, 0.462, 0.522, 0.538),   # mira
]


def hud_mask(h, w):
    m = np.zeros((h, w), bool)
    for x0, y0, x1, y1 in HUD_RECTS:
        m[int(y0 * h):int(math.ceil(y1 * h)), int(x0 * w):int(math.ceil(x1 * w))] = True
    return m


def sky_mask(rgb01, L, S, V):
    # Ceu = componente conexo que encosta na borda superior e e (azul-claro) ou (branco lavado).
    # PORQUE: mascara por linha do horizonte fixa cortaria predio; flood a partir do topo
    # segue o recorte real da silhueta e nao come agua/parede azul do meio do frame.
    h, w = L.shape
    r, g, b = rgb01[..., 0], rgb01[..., 1], rgb01[..., 2]
    azul = (b > r + 0.03) & (b >= g - 0.02) & (V > 0.30) & (S < 0.62)
    lavado = (L > 82) & (S < 0.22)
    cand = (azul | lavado)
    cand[int(0.80 * h):, :] = False     # ceu nunca ocupa o rodape do frame
    lab, n = ndimage.label(cand)
    if n == 0:
        return np.zeros_like(cand)
    topo = np.unique(lab[0:3, :]); topo = topo[topo > 0]
    m = np.isin(lab, topo)
    # fecha buracos pequenos (fio de poste, bandeirola) pra nao contar como cenario
    m = ndimage.binary_closing(m, np.ones((5, 5)))
    return m


def water_mask(rgb01, H, S, V, valid):
    # Agua do Piscinao: azul/ciano/verde-azulado ABAIXO do horizonte visual.
    # PORQUE: a pergunta 3 e sobre matiz da lamina, entao o recorte tem que ser cromatico,
    # nao geometrico (a camera muda de lugar entre as rodadas).
    h, w = S.shape
    m = valid & (H > 160) & (H < 255) & (S > 0.18) & (V > 0.12)
    m[:int(0.42 * h), :] = False
    return m


# ---------- metricas ----------

def flat_blocks(L, valid, B=16):
    h, w = L.shape
    hb, wb = h // B, w // B
    Lc = L[:hb * B, :wb * B].reshape(hb, B, wb, B).transpose(0, 2, 1, 3).reshape(hb, wb, B * B)
    Vc = valid[:hb * B, :wb * B].reshape(hb, B, wb, B).transpose(0, 2, 1, 3).reshape(hb, wb, B * B)
    ok = Vc.all(-1)
    sd = Lc.std(-1)
    tot = ok.sum()
    if tot == 0:
        return 0.0, 0
    return 100.0 * ((sd < 2.0) & ok).sum() / tot, int(tot)


def biggest_flat_region(L, valid, B=16):
    # maior mancha contigua de blocos chapados, em % do frame util (criterio B6)
    h, w = L.shape
    hb, wb = h // B, w // B
    Lc = L[:hb * B, :wb * B].reshape(hb, B, wb, B).transpose(0, 2, 1, 3).reshape(hb, wb, B * B)
    Vc = valid[:hb * B, :wb * B].reshape(hb, B, wb, B).transpose(0, 2, 1, 3).reshape(hb, wb, B * B)
    flat = (Lc.std(-1) < 2.0) & Vc.all(-1)
    lab, n = ndimage.label(flat)
    if n == 0:
        return 0.0
    sizes = ndimage.sum(flat, lab, range(1, n + 1))
    return 100.0 * sizes.max() / max(1, (hb * wb))


def measure(path):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im, np.float64) / 255.0
    h, w = a.shape[:2]
    L = lstar(a)
    H, S, V = hsv(a)
    hud = hud_mask(h, w)
    sky = sky_mask(a, L, S, V)
    valid = (~hud) & (~sky)
    Lv = L[valid]; Sv = S[valid]
    if Lv.size == 0:
        return None
    fb, nblk = flat_blocks(L, valid)
    # metricas de frame INTEIRO (sem mascara): PORQUE os alvos do brief (42-48 etc.)
    # foram calibrados em tools/eval/tone_calib.py sobre o frame cru, com ceu e HUD dentro.
    Lf = L.ravel(); Sf = S.ravel()
    d0 = dict(full_L_mean=float(Lf.mean()), full_L_med=float(np.median(Lf)),
              full_L_p1=float(np.percentile(Lf, 1)), full_L_p95=float(np.percentile(Lf, 95)),
              full_L_p99=float(np.percentile(Lf, 99)),
              full_pct_L3=100.0 * float((Lf < 3).mean()),
              full_pct_L97=100.0 * float((Lf > 97).mean()),
              full_sat=float(Sf.mean()), full_pct_S55=100.0 * float((Sf > 0.55).mean()))
    d = dict(
        w=w, h=h,
        pct_sky=100.0 * sky.sum() / (h * w),
        pct_valid=100.0 * valid.sum() / (h * w),
        L_mean=float(Lv.mean()), L_med=float(np.median(Lv)),
        L_p1=float(np.percentile(Lv, 1)), L_p95=float(np.percentile(Lv, 95)),
        L_p99=float(np.percentile(Lv, 99)),
        pct_L3=100.0 * float((Lv < 3).mean()), pct_L97=100.0 * float((Lv > 97).mean()),
        sat_mean=float(Sv.mean()), pct_S55=100.0 * float((Sv > 0.55).mean()),
        flat_pct=fb, flat_biggest=biggest_flat_region(L, valid),
    )
    d.update(d0)
    # agua (so faz sentido no piscinao, mas medimos sempre pra ter controle)
    wm = water_mask(a, H, S, V, valid)
    if wm.sum() > 500:
        hh = np.deg2rad(H[wm])
        hu = (np.rad2deg(np.arctan2(np.sin(hh).mean(), np.cos(hh).mean())) + 360) % 360
        d.update(water_px=int(wm.sum()), water_pct=100.0 * wm.sum() / (h * w),
                 water_hue=float(hu), water_sat=float(S[wm].mean()),
                 water_L=float(L[wm].mean()), water_V=float(V[wm].mean()))
    return d


def main():
    out = {}
    for rd in ROUNDS:
        for mp in MAPS:
            for vw in VIEWS:
                for p in POS:
                    f = f'/root/shots/{rd}/game-{mp}-{vw}-{p}.png'
                    if not os.path.exists(f):
                        continue
                    m = measure(f)
                    out[f'{rd}|{mp}|{vw}|{p}'] = m
    with open('/root/csb/tools/eval/r2_audit.json', 'w') as fh:
        json.dump(out, fh, indent=1)

    print('=== FRAME INTEIRO, SEM MASCARA (mesma base dos alvos do brief) ===')
    fk = ['full_L_mean', 'full_L_med', 'full_L_p1', 'full_L_p95', 'full_L_p99',
          'full_pct_L3', 'full_pct_L97', 'full_sat', 'full_pct_S55']
    print(f'{"mapa":15s}{"rod":5s}' + ''.join(f'{k[5:]:>11s}' for k in fk))
    for mp in MAPS:
        for rd in ROUNDS:
            vals = [v for k, v in out.items() if v and k.startswith(f'{rd}|{mp}|')]
            if not vals:
                continue
            print(f'{mp:15s}{rd:5s}' + ''.join(f'{np.mean([v[k] for v in vals]):11.3f}' for k in fk))
        print()

    keys = ['L_mean', 'L_med', 'L_p1', 'L_p95', 'L_p99', 'pct_L3', 'pct_L97',
            'sat_mean', 'pct_S55', 'flat_pct', 'flat_biggest', 'pct_sky']
    print('=== AGREGADO POR MAPA (media dos 8 frames) ===')
    hdr = f'{"mapa":15s}{"rod":5s}' + ''.join(f'{k:>12s}' for k in keys)
    print(hdr)
    agg = {}
    for mp in MAPS:
        for rd in ROUNDS:
            vals = [v for k, v in out.items() if v and k.startswith(f'{rd}|{mp}|')]
            if not vals:
                continue
            row = {k: float(np.mean([v[k] for v in vals])) for k in keys}
            agg[(mp, rd)] = row
            print(f'{mp:15s}{rd:5s}' + ''.join(f'{row[k]:12.3f}' for k in keys))
        print()

    print('=== AGUA (frames com regiao azul abaixo do horizonte) ===')
    for mp in MAPS:
        for rd in ROUNDS:
            vals = [v for k, v in out.items() if v and k.startswith(f'{rd}|{mp}|') and 'water_hue' in v]
            if not vals:
                continue
            hh = np.deg2rad([v['water_hue'] for v in vals])
            hu = (np.rad2deg(np.arctan2(np.sin(hh).mean(), np.cos(hh).mean())) + 360) % 360
            print(f'{mp:15s}{rd:5s} n={len(vals)} hue={hu:6.1f}  S={np.mean([v["water_sat"] for v in vals]):.3f}  '
                  f'L*={np.mean([v["water_L"] for v in vals]):5.1f}  area%={np.mean([v["water_pct"] for v in vals]):5.2f}')
        print()

    print('=== FRAMES CITADOS NO BRIEF ===')
    for key in ['praca_poderes|169|c']:
        for rd in ROUNDS:
            v = out.get(f'{rd}|{key}')
            if v:
                print(f'{key} {rd:5s} flat%={v["flat_pct"]:6.2f} maiorMancha%={v["flat_biggest"]:6.2f} '
                      f'L*med={v["L_med"]:5.1f} L*p95={v["L_p95"]:5.1f} sat={v["sat_mean"]:.3f}')
    print()
    print('=== POR FRAME: flat_pct (B6) ===')
    for mp in MAPS:
        for vw in VIEWS:
            for p in POS:
                line = f'{mp:15s}{vw:4s}{p:2s}'
                for rd in ROUNDS:
                    v = out.get(f'{rd}|{mp}|{vw}|{p}')
                    line += f'  {rd}={v["flat_pct"]:6.2f}' if v else f'  {rd}=  --  '
                print(line)


if __name__ == '__main__':
    main()
