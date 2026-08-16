#!/usr/bin/env python3
"""Mede as 6 métricas do look Quake 4/UT/Halo na máscara do viewmodel.

A máscara vem do diff (arma visível) × (vm.root escondido) capturado pelo
vm-quake-capture.mjs — isola o VM exato (arma + braços FP), sem máscara manual.

Uso: python3 tools/eval/vm_quake_measure.py <dir> [arma1,arma2,...] [tanBarrel]
Saída: uma linha por arma com as 6 medidas + PASS/FAIL contra os alvos:
  borda esquerda 0,55-0,62 W | borda direita >= 1,0 (cortada) | área de SILHUETA 4-10%
  (a régua original de 13-18% do brief era arma+mãos; o caminho Mint é SÓ-ARMA por
  decisão do dono 31/07 — ?hands=1 — então a silhueta da peça sozinha hoje dá ~2% e o
  alvo é 2-5× isso) | escorço (coronha/guarda-mão) >= 1,8 | cano° = atan(tanBarrel) (info)
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

DIR = sys.argv[1]
IDS = (sys.argv[2] if len(sys.argv) > 2 else 'svd,ak').split(',')
TANB = float(sys.argv[3]) if len(sys.argv) > 3 else 0.29


print(f"{'arma':<8} {'esq(W)':>7} {'dir(W)':>7} {'área%':>6} {'escorço':>8} {'cano°':>6}  veredito")
for wid in IDS:
    a = np.asarray(Image.open(f'{DIR}/{wid}-on.png').convert('RGB'), dtype=np.int16)
    b = np.asarray(Image.open(f'{DIR}/{wid}-off.png').convert('RGB'), dtype=np.int16)
    H, W = a.shape[:2]
    diff = (np.abs(a - b).sum(axis=2) > 25)
    lab, n = ndimage.label(diff)
    if n == 0:
        print(f'{wid:<8} MÁSCARA VAZIA — vm.root não escondeu?')
        continue
    # maior componente = viewmodel (fantasmas de bots são pequenos)
    sizes = ndimage.sum(diff, lab, range(1, n + 1))
    mask = lab == (1 + int(np.argmax(sizes)))
    ys, xs = np.where(mask)
    left, right = xs.min() / W, (xs.max() + 1) / W
    area = mask.sum() / (W * H)
    # RAZÃO DE ESCORÇO (de-rotacionada): a arma fica DIAGONAL na tela (tanBarrel + roll),
    # então "altura da coluna" mistura a inclinação com a grossura aparente. Alinha o eixo
    # principal do blob (PCA) na horizontal e mede a grossura PERPENDICULAR ao cano:
    # maior grossura no terço traseiro ÷ maior no terço dianteiro. Flanco chapado ~1,0-1,3;
    # câmera POR TRÁS (Quake 4/UT) a traseira projeta bem maior → ≥1,8.
    pts = np.column_stack([xs.astype(float), ys.astype(float)])
    pts -= pts.mean(axis=0)
    cov = np.cov(pts.T)
    vals, vecs = np.linalg.eigh(cov)
    ax = vecs[:, np.argmax(vals)]          # eixo do cano
    if ax[0] < 0: ax = -ax                 # aponta pra +x (traseira = maior x de tela)
    u = pts @ ax                           # ao longo do cano
    v = pts @ np.array([-ax[1], ax[0]])    # perpendicular (grossura aparente)
    umin, umax = u.min(), u.max()
    ub = np.floor((u - umin) / 4).astype(int)   # bins de 4 px ao longo do cano
    thick = np.zeros(ub.max() + 1)
    for i in range(len(thick)):
        sel = v[ub == i]
        if len(sel): thick[i] = np.percentile(sel, 95) - np.percentile(sel, 5)
    # traseira = terço de MAIOR u?? — a coronha é a extremidade de maior x de tela:
    # com ax alinhado a +x, u maior = mais à direita = traseira.
    n = len(thick)
    rear = thick[2 * n // 3:].max()
    muz = thick[:n // 3].max()
    ratio = rear / muz if muz > 0 else float('inf')
    ang = np.degrees(np.arctan(TANB))
    ok = (0.55 <= left <= 0.62) and (right >= 0.999) and (0.04 <= area <= 0.10) and (ratio >= 1.8)
    flags = []
    if not (0.55 <= left <= 0.62): flags.append('esq')
    if right < 0.999: flags.append('dir')
    if not (0.04 <= area <= 0.10): flags.append('área')
    if ratio < 1.8: flags.append('escorço')
    print(f'{wid:<8} {left:7.3f} {right:7.3f} {area*100:6.1f} {ratio:8.2f} {ang:6.1f}  '
          + ('PASS' if ok else 'FAIL(' + ','.join(flags) + ')'))
