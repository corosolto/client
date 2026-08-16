#!/usr/bin/env python3
# Sonda do PERSONAGEM: croma C* (Lab) e separacao delta L* contra o anel de 20 px.
# PORQUE: o r2_audit.py mede o CENARIO inteiro; a regressao "fantasma" da r2 e local
# ao boneco e some na media do frame. Aqui o recorte e por caixa dada a mao (verificada
# olhando o crop) + mascara dentro da caixa, e o anel vem de dilatacao morfologica.
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lab(rgb01):
    lin = srgb_to_lin(rgb01)
    X = lin @ np.array([0.4124, 0.3576, 0.1805])
    Y = lin @ np.array([0.2126, 0.7152, 0.0722])
    Z = lin @ np.array([0.0193, 0.1192, 0.9505])
    xn, yn, zn = 0.95047, 1.0, 1.08883
    f = lambda t: np.where(t > 0.008856, np.cbrt(np.maximum(t, 1e-12)), 7.787 * t + 16 / 116)
    fx, fy, fz = f(X / xn), f(Y / yn), f(Z / zn)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def load(p):
    return np.asarray(Image.open(p).convert('RGB'), np.float64) / 255.0


def char_mask(a, box, mode):
    """Mascara do personagem DENTRO da caixa. mode='ghost' pega o claro-neutro (r2),
    mode='auto' usa distancia de cor ao fundo mediano da caixa (r1 e generico)."""
    x0, y0, x1, y1 = box
    sub = a[y0:y1, x0:x1]
    L, A, B = lab(sub)
    if mode == 'ghost':
        m = (L > 55) & (np.hypot(A, B) < 22)
    else:
        # fundo = mediana da borda da caixa; personagem = quem foge dela em Lab
        edge = np.zeros(L.shape, bool)
        edge[0:6, :] = edge[-6:, :] = edge[:, 0:6] = edge[:, -6:] = True
        bg = np.array([np.median(L[edge]), np.median(A[edge]), np.median(B[edge])])
        d = np.sqrt((L - bg[0]) ** 2 + (A - bg[1]) ** 2 + (B - bg[2]) ** 2)
        m = d > 16
    m = ndimage.binary_opening(m, np.ones((3, 3)))
    m = ndimage.binary_closing(m, np.ones((7, 7)))
    lb, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lb, range(1, n + 1))
        m = lb == (int(np.argmax(sizes)) + 1)
    full = np.zeros(a.shape[:2], bool)
    full[y0:y1, x0:x1] = m
    return full


def probe(path, box, mode='auto', tag='', dump=None):
    a = load(path)
    m = char_mask(a, box, mode)
    if m.sum() < 200:
        print(f'{tag:34s} MASCARA VAZIA ({m.sum()} px)')
        return None
    ring = ndimage.binary_dilation(m, np.ones((41, 41))) & ~ndimage.binary_dilation(m, np.ones((5, 5)))
    L, A, B = lab(a)
    C = np.hypot(A, B)
    mx = a.max(-1); mn = a.min(-1)
    S = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r = dict(px=int(m.sum()), Cchar=float(C[m].mean()), Cp90=float(np.percentile(C[m], 90)),
             Schar=float(S[m].mean()), Lchar=float(L[m].mean()), Lring=float(L[ring].mean()),
             dL=float(abs(L[m].mean() - L[ring].mean())),
             rgb=tuple(round(float(a[..., i][m].mean() * 255), 1) for i in range(3)),
             Lp95=float(np.percentile(L[m], 95)))
    print(f'{tag:34s} px={r["px"]:6d}  C*={r["Cchar"]:5.1f} (p90 {r["Cp90"]:5.1f})  S={r["Schar"]:.3f}  '
          f'L*char={r["Lchar"]:5.1f}  L*anel={r["Lring"]:5.1f}  dL*={r["dL"]:5.1f}  rgb={r["rgb"]}')
    if dump:
        img = (a * 255).astype(np.uint8).copy()
        img[ring] = (img[ring] * 0.4 + np.array([0, 255, 0]) * 0.6).astype(np.uint8)
        ed = m & ~ndimage.binary_erosion(m, np.ones((3, 3)))
        img[ed] = [255, 0, 255]
        x0, y0, x1, y1 = box
        pad = 40
        Image.fromarray(img[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad]).save(dump)
    return r


# caixas conferidas a olho nos PNGs (x0,y0,x1,y1)
CASES = [
    ('r1', 'ferro_velho-169-b', (780, 495, 890, 740), 'auto', 'doutora jaleco+calca teal'),
    ('r1', 'ferro_velho-169-b', (690, 445, 775, 610), 'auto', 'bot camisa roxa'),
    ('r2', 'ferro_velho-169-b', (285, 445, 415, 700), 'ghost', 'fantasma esq (chapeu rosa)'),
    ('r2', 'ferro_velho-169-b', (700, 470, 800, 620), 'ghost', 'fantasma dir'),
    ('r2', 'piscina_treta-169-d', (0, 460, 155, 840), 'ghost', 'fantasma piscinao'),
]

if __name__ == '__main__':
    for rd, frame, box, mode, name in CASES:
        p = f'/root/shots/{rd}/game-{frame}.png'
        probe(p, box, mode, f'{rd} {frame} {name}', f'/root/shots/diag/probe-{rd}-{frame}-{box[0]}.png')
