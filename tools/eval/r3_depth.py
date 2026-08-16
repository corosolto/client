#!/usr/bin/env python3
# Perspectiva aerea: razao de CONTRASTE LOCAL longe/perto.
# PORQUE: "profundidade" num screenshot nao e opiniao — na atmosfera real o contraste de
# micro-detalhe CAI com a distancia (espalhamento de Rayleigh/Mie soma um veu aditivo).
# Se o fundo do frame tem MAIS contraste local que o primeiro plano, a imagem le como
# recorte de colagem, nao como espaco. Alvo do gauntlet: razao <= 0.75.
#
# Metodo: contraste local = desvio-padrao de L* numa janela 7x7 (filtro de caixa via
# integral, sem scipy.generic_filter que seria lento). Faixa LONGE = banda logo abaixo do
# ceu; faixa PERTO = rodape do frame. HUD e ceu mascarados com a MESMA regra do r2_audit.
import os, sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, '/root/csb/tools/eval')
from r2_audit import lstar, hsv, hud_mask, sky_mask, MAPS, VIEWS, POS

WIN = 7


def local_std(L, valid):
    # media/variancia locais só sobre pixels validos (mascara entra como peso)
    w = valid.astype(np.float64)
    k = np.ones(WIN)
    def box(a):
        a = ndimage.convolve1d(a, k, axis=0, mode='nearest')
        return ndimage.convolve1d(a, k, axis=1, mode='nearest')
    n = box(w)
    s = box(L * w)
    s2 = box(L * L * w)
    n = np.maximum(n, 1e-6)
    var = np.maximum(s2 / n - (s / n) ** 2, 0.0)
    return np.sqrt(var), n


def measure(path, far=(0.34, 0.56), near=(0.74, 1.00)):
    a = np.asarray(Image.open(path).convert('RGB'), np.float64) / 255.0
    h, w = a.shape[:2]
    L = lstar(a)
    H, S, V = hsv(a)
    valid = (~hud_mask(h, w)) & (~sky_mask(a, L, S, V))
    sd, n = local_std(L, valid)
    # so conta janela com pelo menos metade dos pixels validos (senao a borda do ceu vira sinal)
    ok = valid & (n > 0.5 * WIN * WIN)
    band = lambda r: ok[int(r[0] * h):int(r[1] * h), :]
    sdb = lambda r: sd[int(r[0] * h):int(r[1] * h), :]
    mf, mn = band(far), band(near)
    if mf.sum() < 2000 or mn.sum() < 2000:
        return None
    f = float(sdb(far)[mf].mean())
    p = float(sdb(near)[mn].mean())
    return dict(far=f, near=p, ratio=f / max(p, 1e-6))


def main():
    rounds = sys.argv[1:] or ['base', 'r1', 'r2']
    out = {}
    for rd in rounds:
        print(f'=== {rd} ===')
        for mp in MAPS:
            fs, ns, rs = [], [], []
            for vw in VIEWS:
                for p in POS:
                    f = f'/root/shots/{rd}/game-{mp}-{vw}-{p}.png'
                    if not os.path.exists(f):
                        continue
                    m = measure(f)
                    if not m:
                        continue
                    fs.append(m['far']); ns.append(m['near']); rs.append(m['ratio'])
            if not rs:
                continue
            out[f'{rd}|{mp}'] = dict(far=float(np.mean(fs)), near=float(np.mean(ns)),
                                     ratio=float(np.mean(rs)), n=len(rs))
            print(f'  {mp:15s} sdLonge={np.mean(fs):6.2f}  sdPerto={np.mean(ns):6.2f}  '
                  f'razao={np.mean(rs):5.2f}  (n={len(rs)})')
    with open('/root/csb/tools/eval/r3_depth.json', 'w') as fh:
        json.dump(out, fh, indent=1)


if __name__ == '__main__':
    main()
