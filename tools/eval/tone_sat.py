#!/usr/bin/env python3
# Previsao de SATURACAO (HSV) por frame: base vs r1 medido vs r2 previsto.
# PORQUE: a regressao 4 do brief e queda de 30-64% na saturacao; precisa de numero, nao de olho.
import numpy as np, sys
from PIL import Image
sys.path.insert(0, '/root/csb/tools/eval')
from tone_calib import (agx, agx_inv, srgb_to_lin, vignette, unfloor, R1, R1_SAT, STEP, lstar)

NEW = {
    'praca_poderes':       dict(exposure=1.74, floor=0.0045),
    'piscina_treta':   dict(exposure=2.18, floor=0.0034),
    'loja_h':      dict(exposure=1.32, floor=0.0053),
    'ferro_velho': dict(exposure=1.77, floor=0.0038),
}
SAT_NEW = 1.12


def hsv_sat(srgb):
    mx = srgb.max(-1); mn = srgb.min(-1)
    return np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0).mean()


def run(frame, mapid):
    b = np.asarray(Image.open(f'/root/shots/base/{frame}').convert('RGB'), np.float64)[::STEP, ::STEP] / 255
    r = np.asarray(Image.open(f'/root/shots/r1/{frame}').convert('RGB'), np.float64)[::STEP, ::STEP] / 255
    full = Image.open(f'/root/shots/r1/{frame}').size
    vg = vignette(full[0], full[1], STEP)
    hdr = unfloor(agx_inv(srgb_to_lin(r), 1, 1, R1_SAT) / vg[..., None] / R1[mapid]['exposure'], R1[mapid]['floor'])
    n = NEW[mapid]
    x = (hdr + n['floor'] ** 2 / (hdr + n['floor'])) * (n['exposure'] * vg)[..., None]
    col = agx(x, 1.0, 1.0, SAT_NEW)
    out = np.clip(np.where(col <= 0.0031308, col * 12.92, 1.055 * np.power(np.maximum(col, 0), 1 / 2.4) - 0.055), 0, 1)
    L = lstar(col)
    print(f'{frame:34s} sat base {hsv_sat(b):.3f} -> r1 {hsv_sat(r):.3f} -> r2 {hsv_sat(out):.3f}   '
          f'L* med r2 {np.median(L):.1f} mean {L.mean():.1f}')


for f, m in [('game-praca_poderes-169-c.png', 'praca_poderes'),
             ('game-ferro_velho-169-b.png', 'ferro_velho'),
             ('game-loja_h-169-d.png', 'loja_h'),
             ('game-piscina_treta-169-a.png', 'piscina_treta'),
             ('game-piscina_treta-169-d.png', 'piscina_treta')]:
    run(f, m)
