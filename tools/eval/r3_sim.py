#!/usr/bin/env python3
# Simulador do composite (AgX + sat + piso + vinheta) do bloom.js, em NumPy.
# PORQUE: sem browser, a unica forma de calibrar uma cor de albedo e inverter o pipeline a
# partir do pixel medido no PNG, isolar o termo de LUZ, trocar o albedo e re-projetar.
# Espelha bloom.js:COMPOSITE (owAgX/owAgxContrast/piso/vinheta) linha a linha.
import numpy as np

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


def _mv(M, c):
    return c @ M.T


def agx_contrast(x):
    x2 = x * x; x4 = x2 * x2
    return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232


def agx(color, slope=1.0, power=1.0, sat=1.12):
    c = _mv(REC2020_FROM_SRGB, color)
    c = _mv(INSET, c)
    c = np.maximum(c, 1e-10)
    c = (np.log2(c) - MINEV) / (MAXEV - MINEV)
    c = np.clip(c, 0, 1)
    c = np.power(np.maximum(c * slope, 0), power)
    l = (c * LUM).sum(-1, keepdims=True)
    c = l + sat * (c - l)
    c = agx_contrast(np.clip(c, 0, 1))
    c = _mv(OUTSET, c)
    c = np.power(np.maximum(c, 0), 2.2)
    c = _mv(SRGB_FROM_REC2020, c)
    return np.clip(c, 0, 1)


def lin_to_srgb(c):
    c = np.maximum(c, 0)
    return np.where(c < 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def composite(hdr, exposure, floor, sat=1.12, vig=1.0):
    h = np.maximum(hdr, 0.0)
    h = h + floor * floor / (h + floor)
    h = h * exposure * vig
    return lin_to_srgb(agx(h, 1.0, 1.0, sat))


def invert_composite(srgb, exposure, floor, sat=1.12, vig=1.0):
    # busca binaria por canal nao funciona (AgX mistura canais); resolve por Newton vetorial
    # simples em log-espaco do HDR. PORQUE: e monotona por construcao no dominio de interesse.
    x = np.full(3, 0.05)
    for _ in range(200):
        f = composite(x, exposure, floor, sat, vig) - srgb
        J = np.zeros((3, 3))
        for k in range(3):
            dx = np.zeros(3); dx[k] = max(1e-5, x[k] * 1e-3)
            J[:, k] = (composite(x + dx, exposure, floor, sat, vig) - composite(x, exposure, floor, sat, vig)) / dx[k]
        try:
            step = np.linalg.solve(J, f)
        except np.linalg.LinAlgError:
            break
        x = np.maximum(x - 0.7 * step, 1e-6)
        if np.abs(f).max() < 1e-6:
            break
    return x


def hsv_s(rgb01):
    mx = rgb01.max(-1); mn = rgb01.min(-1)
    return 0.0 if mx <= 1e-6 else float((mx - mn) / mx)


def hue(rgb01):
    r, g, b = rgb01
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d < 1e-9:
        return 0.0
    if mx == r: h = ((g - b) / d) % 6
    elif mx == g: h = (b - r) / d + 2
    else: h = (r - g) / d + 4
    return (h * 60) % 360


def lstar(rgb01):
    Y = float((srgb_to_lin(np.asarray(rgb01)) * LUM).sum())
    f = np.cbrt(Y) if Y > 0.008856 else 7.787 * Y + 16 / 116
    return 116 * f - 16


def vignette(u, v, amount=0.14):
    # cos^4 em luz linear, igual ao shader (uLens.y = 0.14)
    r2 = (u - 0.5) ** 2 + (v - 0.5) ** 2
    cos4 = (1.0 / (1.0 + r2 * 2.4)) ** 2
    return 1.0 + (cos4 - 1.0) * amount
