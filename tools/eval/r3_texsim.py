#!/usr/bin/env python3
# Reimplementa em NumPy os geradores de canvas que mais pesam na medida (noiseTex do
# ferro velho e rustStageTex), para conhecer a COR MEDIA do albedo antes/depois sem abrir
# navegador. PORQUE: a previsao de tela so vale se o albedo medio da textura for medido,
# nao chutado a partir do hex da base — as manchas mudam bastante a media.
import numpy as np


class LCG:
    """Mesmo gerador do map_ferrovelho.js: seed = (seed * 16807) % 2147483647."""

    def __init__(self, seed):
        self.s = seed

    def __call__(self):
        self.s = (self.s * 16807) % 2147483647
        return self.s / 2147483647


def hx(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def ellipse_mask(S, cx, cy, rx, ry, rot):
    y, x = np.mgrid[0:S, 0:S]
    dx, dy = x - cx, y - cy
    ca, sa = np.cos(-rot), np.sin(-rot)
    u, v = dx * ca - dy * sa, dx * sa + dy * ca
    return (u / max(rx, 1e-6)) ** 2 + (v / max(ry, 1e-6)) ** 2 <= 1.0


def noise_tex_mean(base, blotches, opts):
    S = 256
    img = np.tile(hx(base), (S, S, 1))
    r = LCG(opts.get('seed', 7))
    for color, n, rmin, rmax, alpha in blotches:
        col = hx(color)
        for _ in range(n):
            a = alpha * (0.5 + r() * 0.5)
            rr = rmin + r() * (rmax - rmin)
            m = ellipse_mask(S, r() * S, r() * S, rr, rr * (0.4 + r() * 0.8), r() * np.pi)
            img[m] = img[m] * (1 - a) + col * a
    if opts.get('pebbles'):
        peb = hx(opts['pebbles'])
        for _ in range(opts.get('pebbleN', 240)):
            a = 0.25 + r() * 0.3
            col = peb if r() > 0.5 else hx(base)
            px, py = int(r() * S), int(r() * S)
            sl = (slice(py, min(py + 2, S)), slice(px, min(px + 2, S)))
            img[sl] = img[sl] * (1 - a) + col * a
    return img.reshape(-1, 3).mean(0)


if __name__ == '__main__':
    import colorsys
    velho = ('#6b5a44', [['#584a38', 60, 8, 26, 0.5], ['#7a6a52', 50, 6, 20, 0.4],
                         ['#3a3230', 14, 5, 14, 0.45], ['#8a4a2a', 26, 2, 6, 0.4],
                         ['#4a3f30', 34, 2, 7, 0.4]], {'pebbles': '#8a7a62', 'pebbleN': 620, 'seed': 11})
    novo = ('#786d5f', [['#585046', 60, 8, 26, 0.5], ['#7a7163', 50, 6, 20, 0.4],
                        ['#3a3331', 14, 5, 14, 0.45], ['#946c59', 26, 2, 6, 0.4],
                        ['#4a443b', 34, 2, 7, 0.4]], {'pebbles': '#8a7d69', 'pebbleN': 620, 'seed': 11})
    for nm, (b, bl, op) in [('r2 (antes)', velho), ('r3 (depois)', novo)]:
        m = noise_tex_mean(b, bl, op)
        h, s, v = colorsys.rgb_to_hsv(*(m / 255))
        print(f'terra {nm:12s} media RGB={m.round(1)} hue={h*360:5.1f} S={s:.3f} V={v:.3f}')
