#!/usr/bin/env python3
# Amostra a COR DO HORIZONTE de um céu equiretangular (webp) — insumo da régua
# tools/eval/look-check.mjs (RC1 do plans/23: fog == cor do horizonte do céu).
#
# ONDE SE MEDE E POR QUÊ (procedência):
#   O céu do jogo é panorama 2:1 com mapping equiretangular (map_sky.js): a elevação 0
#   do mundo — onde a silhueta do terreno encontra o céu — cai na linha y = H/2 da
#   imagem. A amostra é a MEDIANA das 12 linhas logo ACIMA do equador (y = H/2-14 ..
#   H/2-2), nas colunas centrais de 92% (4% de margem por lado, fora da costura do
#   panorama). É o equivalente estático do BAND=14 do r3_fog.py, que media as 14
#   linhas de céu logo acima da silhueta nos frames reais.
#   Zenite: mediana das linhas 2%-5% do topo (informativa, para céus-gradiente).
#
# Uso:
#   python3 tools/eval/look-horizonte.py <webp...>                 -> JSON no stdout
#   python3 tools/eval/look-horizonte.py --bake <saida.json> <webp...>   -> grava assado
import sys, json
import numpy as np
from PIL import Image


def amostra(path):
    im = np.asarray(Image.open(path).convert('RGB'), np.float64) / 255.0
    h, w = im.shape[:2]
    x0, x1 = int(w * 0.04), int(w * 0.96)
    y0, y1 = int(h * 0.5) - 14, int(h * 0.5) - 2
    band = im[y0:y1, x0:x1].reshape(-1, 3)
    hor = np.median(band, axis=0)
    zen = np.median(im[int(h * 0.02):int(h * 0.05), x0:x1].reshape(-1, 3), axis=0)
    f = lambda c: '%02x%02x%02x' % tuple(int(round(float(v) * 255)) for v in c)
    return {'horizonte': f(hor), 'zenite': f(zen), 'banda': [int(y0), int(y1)], 'n': int(band.shape[0])}


def main():
    args = sys.argv[1:]
    bake = None
    if args and args[0] == '--bake':
        bake = args[1]
        args = args[2:]
    if not args:
        print(__doc__)
        sys.exit(2)
    out = {}
    for p in args:
        out[p.split('/')[-1]] = amostra(p)
    txt = json.dumps(out, indent=1, sort_keys=True)
    if bake:
        with open(bake, 'w') as fh:
            fh.write(txt + '\n')
        print(f'assado -> {bake} ({len(out)} céus)')
    else:
        print(txt)


if __name__ == '__main__':
    main()
