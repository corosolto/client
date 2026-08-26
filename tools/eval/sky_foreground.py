#!/usr/bin/env python3
# Motor de medida da régua tools/eval/sky-foreground-check.mjs (o cabeçalho dela tem
# o porquê, o limiar e a procedência). Aqui só a aritmética.
#
#   measure  -> desvio-padrão de L* (CIELAB D65) na banda do equador de cada céu
#   mutate   -> cola uma faixa escura de "mobília" na banda do equador de um céu bom
#
# Uso:
#   python3 tools/eval/sky_foreground.py measure [arquivos...]
#   python3 tools/eval/sky_foreground.py mutate --src sky_rj --out /tmp/x.webp
import argparse
import glob
import os
import json

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SKYDIR = os.path.join(ROOT, 'public', 'img', 'textures')

# fração da altura, para cada lado do equador. 1,5% de 672 = 10 linhas: a faixa que a
# câmera na altura do olho amostra, e não tanta linha que o gradiente do céu entre.
BANDA = 0.015


def to_L(rgb01):
    c = np.where(rgb01 <= 0.04045, rgb01 / 12.92, ((rgb01 + 0.055) / 1.055) ** 2.4)
    y = 0.2126729 * c[..., 0] + 0.7151522 * c[..., 1] + 0.0721750 * c[..., 2]
    f = np.where(y > 216 / 24389, np.cbrt(y), (24389 / 27 * y + 16) / 116)
    return 116 * f - 16


def measure(path):
    rgb = np.asarray(Image.open(path).convert('RGB'), np.float64) / 255.0
    L = to_L(rgb)
    h, w = L.shape
    b = max(1, int(round(h * BANDA)))
    banda = L[h // 2 - b:h // 2 + b].mean(axis=0)   # média por coluna
    return {'file': os.path.basename(path), 'w': w, 'h': h,
            'eq_sd': round(float(banda.std()), 2),
            'eq_p05': round(float(np.percentile(banda, 5)), 2),
            'eq_p95': round(float(np.percentile(banda, 95)), 2)}


def mutate(src, out):
    """Cola mobília de primeiro plano na altura do olho: 6% das colunas viram uma faixa
    escura na banda do equador. É o que uma espreguiçadeira/folha de coqueiro faz."""
    rgb = np.asarray(Image.open(src).convert('RGB'), np.float64) / 255.0
    h, w = rgb.shape[:2]
    b = max(1, int(round(h * BANDA))) * 3
    passo = max(1, w // 18)
    largura = max(1, int(w * 0.06 / 18))
    for x in range(0, w, passo):
        rgb[h // 2 - b:h // 2 + b, x:x + largura] *= 0.28
    Image.fromarray(np.round(np.clip(rgb, 0, 1) * 255).astype(np.uint8), 'RGB').save(
        out, 'WEBP', quality=92, method=6)
    return out


def _resolve(name):
    if os.path.sep in name or name.endswith('.webp'):
        p = name if os.path.isabs(name) else os.path.join(ROOT, name)
        if os.path.exists(p):
            return p
    return os.path.join(SKYDIR, name if name.endswith('.webp') else name + '.webp')


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    m = sub.add_parser('measure'); m.add_argument('files', nargs='*')
    mu = sub.add_parser('mutate'); mu.add_argument('--src', default='sky_rj'); mu.add_argument('--out', required=True)
    a = ap.parse_args()
    if a.cmd == 'measure':
        files = [_resolve(x) for x in a.files] if a.files else sorted(glob.glob(os.path.join(SKYDIR, 'sky_*.webp')))
        print(json.dumps({'banda': BANDA, 'skies': [measure(p) for p in files]}, ensure_ascii=False))
        return
    if a.cmd == 'mutate':
        mutate(_resolve(a.src), a.out)
        print(json.dumps(measure(a.out), ensure_ascii=False))


if __name__ == '__main__':
    main()
