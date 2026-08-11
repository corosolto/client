#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Previsao NUMERICA do perfil de L* depois do vertex AO — sem browser, sem captura.

PORQUE: o AO de vertice multiplica o ALBEDO, ou seja, atua em HDR linear ANTES do tonemap.
Como o pipeline do jogo termina no AgX do bloom.js (main.js poe NoToneMapping no renderer e
o COMPOSITE manda), um multiplicador de 0,50 NAO vira 50 % de L*. Este script replica o
composite exatamente (matrizes REC2020, inset/outset, curva de contraste, piso de ambiente,
exposicao por mapa) para: (1) inverter o L* medido no PNG da r2 de volta para radiancia de
cena e (2) reaplicar o composite depois do multiplicador — dando o perfil esperado.

Uso: python3 vao_predict.py
"""
import numpy as np

# ---- constantes copiadas de public/js/bloom.js (COMPOSITE / LOOKS) ----
LOOKS = {
    'praca_poderes':       (1.63, 0.0048),
    'piscina_treta':   (1.92, 0.0039),
    'loja_h':      (1.24, 0.0057),
    'ferro_velho': (1.66, 0.0041),
}
SAT = 1.12
REC2020_FROM_SRGB = np.array([[0.6274, 0.3293, 0.0433],
                              [0.0691, 0.9195, 0.0113],
                              [0.0164, 0.0880, 0.8956]])
SRGB_FROM_REC2020 = np.array([[1.6605, -0.5876, -0.0728],
                              [-0.1246, 1.1329, -0.0083],
                              [-0.0182, -0.1006, 1.1187]])
INSET = np.array([[0.856627153315983, 0.0951212405381588, 0.0482516061458583],
                  [0.137318972929847, 0.761241990602591, 0.101439036467562],
                  [0.11189821299995, 0.0767994186031903, 0.811302368396859]])
OUTSET = np.array([[1.1271005818144368, -0.11060664309660323, -0.016493938717834573],
                   [-0.1413297634984383, 1.157823702216272, -0.016493938717834257],
                   [-0.14132976349843826, -0.11060664309660294, 1.2519364065950405]])
MINEV, MAXEV = -12.47393, 4.026069
LUM = np.array([0.2126, 0.7152, 0.0722])


def agx_contrast(x):
    x2 = x * x; x4 = x2 * x2
    return (15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x
            + 0.4298 * x2 + 0.1191 * x - 0.00232)


def agx(c):
    # c: (N,3) linear sRGB. O shader multiplica pela ESQUERDA com mat3 em coluna-major,
    # entao aqui a matriz ja esta transposta para linha-major.
    c = c @ REC2020_FROM_SRGB.T
    c = c @ INSET.T
    c = np.maximum(c, 1e-10)
    c = (np.log2(c) - MINEV) / (MAXEV - MINEV)
    c = np.clip(c, 0, 1)
    l = c @ LUM
    c = l[:, None] + SAT * (c - l[:, None])
    c = agx_contrast(np.clip(c, 0, 1))
    c = c @ OUTSET.T
    c = np.maximum(c, 0) ** 2.2
    c = c @ SRGB_FROM_REC2020.T
    return np.clip(c, 0, 1)


def composite(scene_grey, exposure, floor, vign=1.0):
    """radiancia de cena (cinza) -> sRGB de display 0..1"""
    h = np.asarray(scene_grey, float)
    h = h + floor * floor / (h + floor)
    h = h * exposure * vign
    c = agx(np.stack([h, h, h], -1))
    d = np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
    return d


def lstar_from_srgb(d):
    lin = np.where(d <= 0.04045, d / 12.92, ((d + 0.055) / 1.055) ** 2.4)
    Y = (lin * LUM).sum(-1)
    f = np.where(Y > 0.008856, np.cbrt(np.maximum(Y, 1e-12)), 7.787 * Y + 16 / 116)
    return 116 * f - 16


def invert(target_L, exposure, floor):
    """L* de display -> radiancia de cena, por LUT monotona"""
    x = np.geomspace(1e-5, 60.0, 20000)
    L = lstar_from_srgb(composite(x, exposure, floor))
    return float(np.interp(target_L, L, x))


def profile(mapid, base_L, mults, label):
    exp, flo = LOOKS[mapid]
    x0 = invert(base_L, exp, flo)
    out = lstar_from_srgb(composite(np.array(mults) * x0, exp, flo))
    print(f'  {label:34s} ' + '  '.join(f'{v:5.1f}' for v in out)
          + f'   | dL* total {out[0] - out[-1]:+5.1f}')
    return out


# --- faixas gravadas em vao.js: k(altura) ---
BANDS = [(0.00, 0.40), (0.15, 0.82), (0.55, 1.00)]


def k_at(y):
    if y <= 0:
        return BANDS[0][1]
    for i in range(1, len(BANDS)):
        if y <= BANDS[i][0]:
            y0, k0 = BANDS[i - 1]
            t = (y - y0) / (BANDS[i][0] - y0)
            return k0 + (BANDS[i][1] - k0) * t
    return 1.0


# --- saia: alpha(dist) com anéis em 0 / 0,36R / R e queda quadratica ---
R, A = 0.21, 0.56
LOOPS = [(0.0, 1.0), (0.40, 0.40), (1.0, 0.0)]


def alpha_at(dist):
    t = min(1.0, dist / R)
    for i in range(1, len(LOOPS)):
        if t <= LOOPS[i][0]:
            t0, a0 = LOOPS[i - 1]
            f = (t - t0) / (LOOPS[i][0] - t0)
            return A * (a0 + (LOOPS[i][1] - a0) * f)
    return 0.0


if __name__ == '__main__':
    HS = [0.30, 0.25, 0.20, 0.15, 0.10, 0.05, 0.00]   # altura acima do chao (m)
    DS = [0.30, 0.25, 0.20, 0.15, 0.10, 0.05, 0.00]   # distancia da parede (m)
    print('PARADE (m):                         ' + '  '.join(f'{h:5.2f}' for h in HS))
    print('--- LADO DA PAREDE (multiplicador de albedo por faixa) ---')
    for mapid, L0, name in [('praca_poderes', 78.0, 'awp concreto claro L*78'),
                            ('praca_poderes', 60.0, 'awp concreto medio L*60'),
                            ('loja_h', 72.0, 'havan muro L*72'),
                            ('ferro_velho', 45.0, 'ferro zinco L*45'),
                            ('piscina_treta', 66.0, 'pool muro L*66')]:
        ks = [k_at(h) for h in HS]
        p = profile(mapid, L0, ks, name)
        d15 = p[3] - p[-1]
        print(f'  {"":34s} ' + f'{"":>7s}dL* nos 15 cm finais = {d15:+5.2f}'
              + ('  PASS' if d15 >= 8 else '  FAIL'))
    print()
    print('DISTANCIA (m):                      ' + '  '.join(f'{d:5.2f}' for d in DS))
    print('--- LADO DO CHAO (saia de contato, alpha por vertice) ---')
    for mapid, L0, name in [('praca_poderes', 62.0, 'awp calcada clara L*62'),
                            ('praca_poderes', 22.0, 'awp asfalto escuro L*22'),
                            ('loja_h', 38.0, 'havan asfalto L*38'),
                            ('ferro_velho', 48.0, 'ferro terra batida L*48'),
                            ('piscina_treta', 70.0, 'pool areia clara L*70')]:
        ks = [1.0 - alpha_at(d) for d in DS]
        p = profile(mapid, L0, ks, name)
        d15 = p[3] - p[-1]
        print(f'  {"":34s} ' + f'{"":>7s}dL* nos 15 cm finais = {d15:+5.2f}'
              + ('  PASS' if d15 >= 8 else '  FAIL'))
