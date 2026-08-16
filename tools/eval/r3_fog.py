#!/usr/bin/env python3
# Cor de NEVOA derivada do CEU medido — nao chutada.
# PORQUE: onde o terreno distante encontra o ceu, a unica coisa que apaga a "borda dura de
# neblina" e a cor da nevoa ser IGUAL a do ceu naquela direcao. Como o ceu do jogo e um quad
# em espaco de tela (scene.background = Texture), a cor util nao e a do gradiente no
# horizonte teorico, e a que aparece LOGO ACIMA da silhueta do terreno nos frames reais.
#
# Metodo: mascara de ceu do r2_audit -> por coluna, pega as N linhas de ceu imediatamente
# acima do primeiro pixel NAO-ceu -> inverte o composite (AgX + piso + vinheta + exposicao,
# tudo do tone_calib) pra recuperar a RADIANCIA LINEAR -> media -> devolve o hex sRGB que,
# posto em `fog.color`, cai exatamente em cima do ceu depois do tone map.
import os, sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, '/root/csb/tools/eval')
from r2_audit import lstar, hsv, hud_mask, sky_mask, MAPS, VIEWS, POS
from tone_calib import agx_inv, srgb_to_lin, lin_to_srgb, unfloor, vignette

# parametros que geraram /root/shots/r2 (tabela LOOKS do bloom.js na r2)
R2 = {
    'praca_poderes':       dict(exposure=1.63, floor=0.0048),
    'piscina_treta':   dict(exposure=1.92, floor=0.0039),
    'loja_h':      dict(exposure=1.24, floor=0.0057),
    'ferro_velho': dict(exposure=1.66, floor=0.0041),
}
R2_SAT = 1.12
BAND = 14      # linhas de ceu logo acima da silhueta


def frame(path, mapid):
    a = np.asarray(Image.open(path).convert('RGB'), np.float64) / 255.0
    h, w = a.shape[:2]
    L = lstar(a); H, S, V = hsv(a)
    hud = hud_mask(h, w)
    sky = sky_mask(a, L, S, V) & (~hud)
    # por coluna: ultima linha de ceu (a silhueta comeca logo abaixo)
    sel = np.zeros((h, w), bool)
    for x in range(w):
        col = np.flatnonzero(sky[:, x])
        if col.size < BAND + 4:
            continue
        y1 = col.max()
        sel[max(0, y1 - BAND + 1):y1 + 1, x] = True
    sel &= sky
    if sel.sum() < 3000:
        return None, 0
    p = R2[mapid]
    # inverte AgX -> divide vinheta -> divide exposicao -> tira o piso de ambiente
    hdr = agx_inv(srgb_to_lin(a[sel]), 1.0, 1.0, R2_SAT)
    vg = vignette(w, h, 1)[sel]
    hdr = hdr / vg[:, None] / p['exposure']
    hdr = unfloor(hdr, p['floor'])
    return hdr, int(sel.sum())


def main():
    out = {}
    for mp in MAPS:
        acc, n = [], 0
        for vw in VIEWS:
            for pp in POS:
                f = f'/root/shots/r2/game-{mp}-{vw}-{pp}.png'
                if not os.path.exists(f):
                    continue
                hdr, c = frame(f, mp)
                if hdr is None:
                    continue
                acc.append(hdr); n += c
        if not acc:
            print(f'{mp:15s} sem ceu utilizavel'); continue
        hdr = np.concatenate(acc)
        med = np.median(hdr, axis=0)
        srgb = lin_to_srgb(np.clip(med, 0, 1))
        hexs = '0x%02x%02x%02x' % tuple(int(round(c * 255)) for c in srgb)
        out[mp] = dict(lin=[round(float(v), 4) for v in med], hex=hexs, px=n)
        print(f'{mp:15s} n={n:7d}  linear={med.round(4)}  ->  fog.color = {hexs}')
    with open('/root/csb/tools/eval/r3_fog.json', 'w') as fh:
        json.dump(out, fh, indent=1)


if __name__ == '__main__':
    main()
