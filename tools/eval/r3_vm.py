#!/usr/bin/env python3
# Isolamento do VIEWMODEL pela tecnica dos pixels INVARIANTES.
# PORQUE: entre os 4 angulos a/b/c/d do mesmo mapa/aspecto o CENARIO muda inteiro, mas a
# arma na mao fica no mesmo lugar. Entao "pixel que nao mudou nos 4 frames" = viewmodel
# (ou HUD). Tirando os retangulos do HUD sobra so a arma — e ai da pra medir bordas em
# fracao da largura da tela sem precisar abrir o jogo.
import os, sys, json, math
import numpy as np
from PIL import Image
from scipy import ndimage

ROUNDS = ['base', 'r1', 'r2', 'r3']
MAPS = ['praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho']
VIEWS = ['169', '32']
POS = ['a', 'b', 'c', 'd']

# HUD generoso — mesmo recorte em todas as rodadas pra comparacao nao mentir.
HUD_RECTS = [
    (0.000, 0.000, 0.150, 0.230),   # radar
    (0.240, 0.000, 0.760, 0.140),   # placar/relogio/barra CTF
    (0.880, 0.000, 1.000, 0.100),   # icones canto sup dir
    (0.000, 0.845, 0.270, 1.000),   # HP / vida
    (0.740, 0.830, 1.000, 1.000),   # municao + nome da arma
    (0.455, 0.440, 0.545, 0.560),   # mira
    (0.000, 0.230, 0.230, 0.560),   # killfeed lateral esq (as vezes)
    (0.700, 0.100, 1.000, 0.400),   # killfeed canto sup dir
    (0.300, 0.560, 0.700, 0.780),   # prompt de pickup / centro-baixo
]


def hud_mask(h, w):
    m = np.zeros((h, w), bool)
    for x0, y0, x1, y1 in HUD_RECTS:
        m[int(y0 * h):int(math.ceil(y1 * h)), int(x0 * w):int(math.ceil(x1 * w))] = True
    return m


def load(rd, mp, vw, p):
    f = f'/root/shots/{rd}/game-{mp}-{vw}-{p}.png'
    if not os.path.exists(f):
        return None
    return np.asarray(Image.open(f).convert('RGB'), np.float32)


def vm_mask(rd, mp, vw, tol=6.0):
    ims = [load(rd, mp, vw, p) for p in POS]
    if any(i is None for i in ims):
        return None, None
    st = np.stack(ims)                       # (4,h,w,3)
    h, w = st.shape[1], st.shape[2]
    rng = st.max(0) - st.min(0)              # amplitude por canal
    inv = rng.max(-1) < tol                  # invariante nos 4 angulos
    inv &= ~hud_mask(h, w)
    # o VM nunca ocupa o topo do frame; corta os 35% de cima pra nao pegar ceu chapado
    inv[:int(0.35 * h), :] = False
    # limpa ruido e fecha vaos internos da arma
    inv = ndimage.binary_opening(inv, np.ones((3, 3)))
    inv = ndimage.binary_closing(inv, np.ones((9, 9)))
    lab, n = ndimage.label(inv)
    if n == 0:
        return None, None
    sizes = ndimage.sum(inv, lab, range(1, n + 1))
    # o VM e o maior componente invariante; junta tambem componentes grandes vizinhos
    order = np.argsort(sizes)[::-1]
    big = sizes[order[0]]
    keep = [order[i] + 1 for i in range(len(order)) if sizes[order[i]] > 0.12 * big]
    m = np.isin(lab, keep)
    return m, (h, w)


def bbox_metrics(m, h, w):
    ys, xs = np.nonzero(m)
    if xs.size == 0:
        return None
    return dict(
        x0=float(xs.min()) / w, x1=float(xs.max() + 1) / w,
        y0=float(ys.min()) / h, y1=float(ys.max() + 1) / h,
        area_pct=100.0 * m.sum() / (h * w),
        px=int(m.sum()),
        # coluna mais a direita que ainda tem VM: se == 1.0 o antebraco sai pela borda
        touch_right=float((m[:, -2:].sum() > 0)),
        touch_bottom=float((m[-2:, :].sum() > 0)),
    )


def main():
    out = {}
    print(f'{"rodada":7s}{"mapa":15s}{"asp":5s}{"esq":>8s}{"dir":>8s}{"topo":>8s}{"area%":>8s}{"px":>9s}{"encostaR":>9s}{"encostaB":>9s}')
    for mp in MAPS:
        for vw in VIEWS:
            for rd in ROUNDS:
                m, sz = vm_mask(rd, mp, vw)
                if m is None:
                    print(f'{rd:7s}{mp:15s}{vw:5s}   -- sem dados --')
                    continue
                h, w = sz
                d = bbox_metrics(m, h, w)
                out[f'{rd}|{mp}|{vw}'] = d
                print(f'{rd:7s}{mp:15s}{vw:5s}{d["x0"]:8.3f}{d["x1"]:8.3f}{d["y0"]:8.3f}'
                      f'{d["area_pct"]:8.2f}{d["px"]:9d}{d["touch_right"]:9.0f}{d["touch_bottom"]:9.0f}')
            print()
    with open('/root/csb/tools/eval/r3_vm.json', 'w') as fh:
        json.dump(out, fh, indent=1)

    print('=== MEDIA POR RODADA (todos mapas, 16:9) ===')
    for rd in ROUNDS:
        vs = [v for k, v in out.items() if k.startswith(rd + '|') and k.endswith('|169')]
        if not vs:
            continue
        print(f'{rd:7s} esq={np.mean([v["x0"] for v in vs]):.3f} dir={np.mean([v["x1"] for v in vs]):.3f} '
              f'area={np.mean([v["area_pct"] for v in vs]):.2f}%')
    print('=== MEDIA POR RODADA (3:2) ===')
    for rd in ROUNDS:
        vs = [v for k, v in out.items() if k.startswith(rd + '|') and k.endswith('|32')]
        if not vs:
            continue
        print(f'{rd:7s} esq={np.mean([v["x0"] for v in vs]):.3f} dir={np.mean([v["x1"] for v in vs]):.3f} '
              f'area={np.mean([v["area_pct"] for v in vs]):.2f}%')


if __name__ == '__main__':
    main()
