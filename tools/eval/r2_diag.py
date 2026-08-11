#!/usr/bin/env python3
# Diagnostico dirigido: (a) onde ficam os blocos chapados, (b) croma C* Lab (medida de cor
# que nao explode em pixel quase preto, ao contrario do S do HSV), (c) recorte estrito da
# lamina d'agua do Piscinao, (d) contraste do personagem contra o fundo local.
# PORQUE: o S medio do HSV do baseline (0.30-0.72) e artefato — o baseline tinha 16-39% dos
# pixels em L*<3, e (max-min)/max em pixel de valor ~2/255 e ruido, nao cor.
import os, sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, '/root/csb/tools/eval')
from r2_audit import lstar, hsv, hud_mask, sky_mask, srgb_to_lin, ROUNDS, MAPS, VIEWS, POS


def lab(rgb01):
    lin = srgb_to_lin(rgb01)
    X = lin @ np.array([0.4124, 0.3576, 0.1805])
    Y = lin @ np.array([0.2126, 0.7152, 0.0722])
    Z = lin @ np.array([0.0193, 0.1192, 0.9505])
    xn, yn, zn = 0.95047, 1.0, 1.08883
    def f(t):
        return np.where(t > 0.008856, np.cbrt(np.maximum(t, 1e-12)), 7.787 * t + 16 / 116)
    fx, fy, fz = f(X / xn), f(Y / yn), f(Z / zn)
    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b = 200 * (fy - fz)
    return L, a, b


def load(rd, mp, vw, p):
    f = f'/root/shots/{rd}/game-{mp}-{vw}-{p}.png'
    if not os.path.exists(f):
        return None
    a = np.asarray(Image.open(f).convert('RGB'), np.float64) / 255.0
    return a


def masks(a):
    h, w = a.shape[:2]
    L = lstar(a); H, S, V = hsv(a)
    hud = hud_mask(h, w); sky = sky_mask(a, L, S, V)
    return L, H, S, V, hud, sky, (~hud) & (~sky)


def croma():
    print('=== CROMA C* MEDIO (so pixels de cenario com L* > 18; imune ao preto esmagado) ===')
    print(f'{"mapa":15s}' + ''.join(f'{r:>10s}' for r in ROUNDS) + '   |  C* p90 por rodada')
    for mp in MAPS:
        row = []; p90 = []
        for rd in ROUNDS:
            cs = []; ps = []
            for vw in VIEWS:
                for p in POS:
                    a = load(rd, mp, vw, p)
                    if a is None:
                        continue
                    L, H, S, V, hud, sky, valid = masks(a)
                    La, aa, bb = lab(a)
                    m = valid & (La > 18)
                    if m.sum() < 1000:
                        continue
                    C = np.hypot(aa[m], bb[m])
                    cs.append(C.mean()); ps.append(np.percentile(C, 90))
            row.append(np.mean(cs) if cs else float('nan'))
            p90.append(np.mean(ps) if ps else float('nan'))
        print(f'{mp:15s}' + ''.join(f'{v:10.2f}' for v in row) + '   |' + ''.join(f'{v:8.1f}' for v in p90))
    print()


def flat_map(rd, mp, vw, p, outpng):
    a = load(rd, mp, vw, p)
    L, H, S, V, hud, sky, valid = masks(a)
    h, w = L.shape; B = 16
    hb, wb = h // B, w // B
    Lc = L[:hb * B, :wb * B].reshape(hb, B, wb, B).transpose(0, 2, 1, 3).reshape(hb, wb, -1)
    Vc = valid[:hb * B, :wb * B].reshape(hb, B, wb, B).transpose(0, 2, 1, 3).reshape(hb, wb, -1)
    flat = (Lc.std(-1) < 2.0) & Vc.all(-1)
    lab_, n = ndimage.label(flat)
    info = []
    if n:
        sizes = ndimage.sum(flat, lab_, range(1, n + 1))
        order = np.argsort(sizes)[::-1][:3]
        for i in order:
            sl = ndimage.find_objects((lab_ == (i + 1)).astype(np.int32))[0]
            info.append(dict(pct=100.0 * sizes[i] / (hb * wb),
                             bbox=[sl[1].start * B, sl[0].start * B, sl[1].stop * B, sl[0].stop * B],
                             Lmean=float(Lc[lab_ == (i + 1)].mean())))
    # overlay: vermelho onde chapado, verde onde ceu
    img = (a * 255).astype(np.uint8).copy()
    up = np.kron(flat, np.ones((B, B), bool))
    img[:up.shape[0], :up.shape[1]][up] = (img[:up.shape[0], :up.shape[1]][up] * 0.35 + np.array([255, 40, 40]) * 0.65).astype(np.uint8)
    img[sky] = (img[sky] * 0.5 + np.array([40, 255, 40]) * 0.5).astype(np.uint8)
    Image.fromarray(img).save(outpng)
    return info


def agua():
    # Lamina d'agua: recorte ESTRITO = maior componente azul/ciano abaixo do horizonte,
    # com area minima; exclui bandeirola, azulejo isolado e ceu refletido em vidro.
    print('=== LAMINA D\'AGUA (maior componente azul abaixo de 0.42H, >=0.8% do frame) ===')
    for mp in ['piscina_treta']:
        for rd in ROUNDS:
            H_, S_, L_, A_ = [], [], [], []
            for vw in VIEWS:
                for p in POS:
                    a = load(rd, mp, vw, p)
                    if a is None:
                        continue
                    L, H, S, V, hud, sky, valid = masks(a)
                    h, w = L.shape
                    cand = valid & (H > 165) & (H < 250) & (S > 0.20) & (V > 0.10)
                    cand[:int(0.42 * h), :] = False
                    cand = ndimage.binary_opening(cand, np.ones((3, 3)))
                    lb, n = ndimage.label(cand)
                    if n == 0:
                        continue
                    sizes = ndimage.sum(cand, lb, range(1, n + 1))
                    i = int(np.argmax(sizes)) + 1
                    if sizes[i - 1] < 0.008 * h * w:
                        continue
                    m = lb == i
                    hh = np.deg2rad(H[m])
                    hu = (np.rad2deg(np.arctan2(np.sin(hh).mean(), np.cos(hh).mean())) + 360) % 360
                    H_.append(hu); S_.append(S[m].mean()); L_.append(L[m].mean())
                    A_.append(100.0 * m.sum() / (h * w))
                    print(f'   {rd:5s}{vw:4s}{p:2s} hue={hu:6.1f} S={S[m].mean():.3f} L*={L[m].mean():5.1f} area%={100.0*m.sum()/(h*w):5.2f}')
            if H_:
                hh = np.deg2rad(H_)
                hu = (np.rad2deg(np.arctan2(np.sin(hh).mean(), np.cos(hh).mean())) + 360) % 360
                print(f'  >> {rd:5s} MEDIA hue={hu:6.1f}  S={np.mean(S_):.3f}  L*={np.mean(L_):5.1f}  n={len(H_)}')
            print()


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if which in ('all', 'croma'):
        croma()
    if which in ('all', 'agua'):
        agua()
    if which in ('all', 'flat'):
        os.makedirs('/root/shots/diag', exist_ok=True)
        for rd in ROUNDS:
            for mp, vw, p in [('praca_poderes', '169', 'c'), ('loja_h', '169', 'a'),
                              ('ferro_velho', '169', 'a'), ('piscina_treta', '169', 'd')]:
                o = f'/root/shots/diag/flat-{rd}-{mp}-{vw}-{p}.png'
                info = flat_map(rd, mp, vw, p, o)
                print(f'{rd:5s} {mp:14s}{vw}-{p}  top3 manchas chapadas:',
                      [(f'{d["pct"]:.1f}%', d['bbox'], f'L*{d["Lmean"]:.0f}') for d in info])
