#!/usr/bin/env python3
# Calibrador de tom OFFLINE (sem browser): inverte o pipeline do composite do bloom.js
# sobre os PNGs de /root/shots/r1 pra recuperar o HDR linear da cena, e reaplica a curva
# com parametros novos pra PREVER L* medio, %L*<3 e %L*>97 por mapa.
# PORQUE: a rodada 1 calibrou "no olho" usando o frame mais escuro de cada mapa e inverteu
# a ordem de exposicao entre os mapas. Aqui a calibracao e por MEDIA dos 8 frames e por numero.
import sys, os, glob, json
import numpy as np
from PIL import Image

SHOTS = '/root/shots/r1'

# ---- matrizes (GLSL mat3(col0,col1,col2) -> linhas abaixo) ----
REC2020_FROM_SRGB = np.array([
    [0.6274, 0.3293, 0.0433],
    [0.0691, 0.9195, 0.0113],
    [0.0164, 0.0880, 0.8956]])
SRGB_FROM_REC2020 = np.array([
    [ 1.6605, -0.5876, -0.0728],
    [-0.1246,  1.1329, -0.0083],
    [-0.0182, -0.1006,  1.1187]])
INSET = np.array([
    [0.856627153315983, 0.0951212405381588, 0.0482516061458583],
    [0.137318972929847, 0.761241990602591,  0.101439036467562],
    [0.11189821299995,  0.0767994186031903, 0.811302368396859]])
OUTSET = np.array([
    [ 1.1271005818144368, -0.11060664309660323, -0.016493938717834573],
    [-0.1413297634984383,  1.157823702216272,   -0.016493938717834257],
    [-0.14132976349843826,-0.11060664309660294,  1.2519364065950405]])
MIN_EV, MAX_EV = -12.47393, 4.026069
LUMW = np.array([0.2126, 0.7152, 0.0722])


def mmul(M, a):
    # a: (...,3)
    return a @ M.T


def agx_contrast(x):
    x2 = x * x; x4 = x2 * x2
    return (15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x
            + 0.4298 * x2 + 0.1191 * x - 0.00232)


_LX = np.linspace(0.0, 1.0, 8192)
_LY = agx_contrast(_LX)
assert np.all(np.diff(_LY) > 0), 'poly do AgX nao e monotona no LUT'


def agx_contrast_inv(y):
    return np.interp(np.clip(y, _LY[0], _LY[-1]), _LY, _LX)


def agx(color, slope, power, sat):
    c = mmul(REC2020_FROM_SRGB, color)
    c = mmul(INSET, c)
    c = np.maximum(c, 1e-10)
    c = (np.log2(c) - MIN_EV) / (MAX_EV - MIN_EV)
    c = np.clip(c, 0.0, 1.0)
    c = np.power(np.maximum(c * slope, 0.0), power)
    l = (c * LUMW).sum(-1, keepdims=True)
    c = l + sat * (c - l)
    c = agx_contrast(np.clip(c, 0.0, 1.0))
    c = mmul(OUTSET, c)
    c = np.power(np.maximum(c, 0.0), 2.2)
    c = mmul(SRGB_FROM_REC2020, c)
    return np.clip(c, 0.0, 1.0)


def agx_inv(col, slope, power, sat):
    c = mmul(REC2020_FROM_SRGB, col)
    c = np.power(np.maximum(c, 0.0), 1.0 / 2.2)
    c = mmul(np.linalg.inv(OUTSET), c)
    c = agx_contrast_inv(c)
    # inverso do passo de saturacao (operacao linear em RGB)
    S = np.eye(3) * sat + (1.0 - sat) * np.tile(LUMW, (3, 1))
    c = mmul(np.linalg.inv(S), c)
    c = np.clip(c, 0.0, 1.0)
    c = np.power(np.maximum(c, 0.0), 1.0 / power) / slope
    c = np.clip(c, 0.0, 1.0)
    c = np.exp2(c * (MAX_EV - MIN_EV) + MIN_EV)
    c = mmul(np.linalg.inv(INSET), c)
    c = mmul(np.linalg.inv(REC2020_FROM_SRGB), c)
    return np.maximum(c, 0.0)


def srgb_to_lin(s):
    return np.where(s <= 0.04045, s / 12.92, ((s + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.maximum(c, 0.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def lstar(lin_rgb):
    Y = (lin_rgb * LUMW).sum(-1)
    e = 216.0 / 24389.0; k = 24389.0 / 27.0
    return np.where(Y > e, 116.0 * np.cbrt(np.maximum(Y, 0)) - 16.0, k * Y)


def lstar_from_srgb(s):
    return lstar(srgb_to_lin(s))


# ---- parametros do r1 (o que gerou os PNGs) ----
R1 = {
    'praca_poderes':       dict(exposure=2.00, floor=0.016),
    'piscina_treta':   dict(exposure=1.10, floor=0.013),
    'loja_h':      dict(exposure=1.45, floor=0.010),
    'ferro_velho': dict(exposure=1.55, floor=0.012),
}
R1_SAT = 1.02
VIGN = 0.14


def vignette(w, h, step):
    ys = np.arange(0, h, step); xs = np.arange(0, w, step)
    u = (xs + 0.5) / w - 0.5; v = (ys + 0.5) / h - 0.5
    r2 = (u[None, :] ** 2 + v[:, None] ** 2)
    cos4 = (1.0 / (1.0 + r2 * 2.4)) ** 2
    return 1.0 + VIGN * (cos4 - 1.0)


def unfloor(hout, f):
    # inverso de  hout = h + f*f/(h+f)
    disc = hout * hout + 2 * f * hout - 3 * f * f
    h = 0.5 * ((hout - f) + np.sqrt(np.maximum(disc, 0.0)))
    return np.maximum(h, 0.0)


STEP = 3   # subamostragem: 1/9 dos pixels, estatistica identica e 9x menos RAM


def load_scene_hdr(path, mapid):
    im = np.asarray(Image.open(path).convert('RGB'), dtype=np.float64) / 255.0
    h, w, _ = im.shape
    im = im[::STEP, ::STEP, :]
    col = srgb_to_lin(im)
    p = R1[mapid]
    hdr = agx_inv(col, 1.0, 1.0, R1_SAT)
    hdr /= vignette(w, h, STEP)[..., None]
    hdr /= p['exposure']
    hdr = unfloor(hdr, p['floor'])
    return hdr


def predict(pack, exposure, floor, sat):
    hdr, vg = pack
    x = hdr + floor * floor / (hdr + floor)
    x = x * (exposure * vg)[:, None]
    col = agx(x, 1.0, 1.0, sat)
    L = lstar(col)
    return dict(mean=L.mean(), median=np.median(L), p1=np.percentile(L, 1),
                p95=np.percentile(L, 95), p99=np.percentile(L, 99),
                blk=100.0 * (L < 3).mean(), wht=100.0 * (L > 97).mean(), std=L.std())


ACES_IN = np.array([[0.59719,0.35458,0.04823],[0.07600,0.90834,0.01566],[0.02840,0.13383,0.83777]])
ACES_OUT = np.array([[1.60475,-0.53108,-0.07367],[-0.10208,1.10813,-0.00605],[-0.00327,-0.07276,1.07602]])


def aces(color, exposure):
    c = color * (exposure / 0.6)
    c = mmul(ACES_IN, c)
    a = c * (c + 0.0245786) - 0.000090537
    b = c * (0.983729 * c + 0.4329510) + 0.238081
    c = a / b
    c = mmul(ACES_OUT, c)
    return np.clip(c, 0.0, 1.0)


def predict_aces(pack, exposure, floor):
    hdr, vg = pack
    x = hdr + floor * floor / (hdr + floor)
    L = lstar(aces(x, exposure))
    return dict(mean=L.mean(), median=np.median(L), p1=np.percentile(L, 1),
                blk=100.0 * (L < 3).mean(), wht=100.0 * (L > 97).mean(), std=L.std())


def pack_map(m, files):
    hs, vs, meas = [], [], []
    for f in files:
        im = np.asarray(Image.open(f).convert('RGB'), dtype=np.float64) / 255.0
        h, w, _ = im.shape
        sub = im[::STEP, ::STEP, :]
        meas.append(lstar_from_srgb(sub).ravel())
        hs.append(load_scene_hdr(f, m).reshape(-1, 3))
        vs.append(vignette(w, h, STEP).ravel())
    return (np.concatenate(hs), np.concatenate(vs)), np.concatenate(meas)


def thin(pack, n, seed=7):
    hdr, vg = pack
    if hdr.shape[0] <= n: return pack
    idx = np.random.default_rng(seed).choice(hdr.shape[0], n, replace=False)
    return (hdr[idx], vg[idx])


def main():
    maps = ['praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho']
    targets = {'praca_poderes': 44.0, 'piscina_treta': 48.0, 'loja_h': 46.0, 'ferro_velho': 42.0}
    sat_new = 1.12
    res = {}
    for m in maps:
        files = sorted(glob.glob(os.path.join(SHOTS, f'game-{m}-*.png')))
        pack, M = pack_map(m, files)
        r = R1[m]
        rt = predict(pack, r['exposure'], r['floor'], R1_SAT)
        print(f'== {m}  ({len(files)} frames, {pack[0].shape[0]} px)')
        print(f'   MEDIDO r1: mean {M.mean():.1f} med {np.median(M):.1f} p1 {np.percentile(M,1):.1f} '
              f'p95 {np.percentile(M,95):.1f} p99 {np.percentile(M,99):.1f} blk {100*(M<3).mean():.2f}% '
              f'wht {100*(M>97).mean():.2f}% std {M.std():.1f}', flush=True)
        print(f'   ROUNDTRIP : mean {rt["mean"]:.1f} med {rt["median"]:.1f} p1 {rt["p1"]:.1f} '
              f'p95 {rt["p95"]:.1f} blk {rt["blk"]:.2f}% wht {rt["wht"]:.2f}%  (erro do inversor)', flush=True)
        small = thin(pack, 90000)
        tgt = targets[m]
        f, E = 0.004, r['exposure']
        for it in range(4):
            lo, hi = 0.3, 4.0
            for _ in range(20):
                E = 0.5 * (lo + hi)
                if predict(small, E, f, sat_new)['mean'] < tgt: lo = E
                else: hi = E
            flo, fhi = 0.0002, 0.030
            for _ in range(18):
                f = 0.5 * (flo + fhi)
                if predict(small, E, f, sat_new)['blk'] > 1.0: flo = f
                else: fhi = f
        E = round(E, 2); f = round(f, 4)
        st = predict(pack, E, f, sat_new)
        # exposicao equivalente no caminho SEM pos (ACES do three), mesma media de L*
        lo, hi = 0.2, 4.0
        for _ in range(22):
            Ea = 0.5 * (lo + hi)
            if predict_aces(small, Ea, f)['mean'] < st['mean']: lo = Ea
            else: hi = Ea
        Ea = round(Ea, 2)
        sa = predict_aces(pack, Ea, f)
        print(f'   [sem pos/ACES] exp {Ea:.2f} => mean {sa["mean"]:.1f} med {sa["median"]:.1f} '
              f'p1 {sa["p1"]:.1f} blk {sa["blk"]:.2f}% wht {sa["wht"]:.2f}% std {sa["std"]:.1f}')
        res[m] = dict(exposure=E, floor=f, expAces=Ea, **{k: round(v, 2) for k, v in st.items()})
        print(f'++ {m}: exp {r["exposure"]:.2f}->{E:.2f}  floor {r["floor"]:.3f}->{f:.4f}  '
              f'=> mean {st["mean"]:.1f} med {st["median"]:.1f} p1 {st["p1"]:.1f} p95 {st["p95"]:.1f} '
              f'p99 {st["p99"]:.1f} blk {st["blk"]:.2f}% wht {st["wht"]:.2f}% std {st["std"]:.1f}', flush=True)
    print(json.dumps(res, indent=1))


if __name__ == '__main__':
    main()
