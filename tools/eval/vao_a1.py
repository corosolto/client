#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Medidor do criterio A1 (AO de contato parede-chao) — SEM browser.

PORQUE existe: o criterio A1 do BAR.md ("queda monotonica de dL* >= 8 nos ~15 cm finais
antes da juncao parede-chao") foi julgado a olho nas tres rodadas. Este script transforma
o julgamento em numero reproduzivel: acha automaticamente as juncoes horizontais fortes do
frame (degrau de luminancia entre duas superficies constantes) e mede, para cada uma, o
quanto a luminancia CAI nos N pixels imediatamente ACIMA (lado parede) e ABAIXO (lado chao).

Sem AO o resultado esperado e ~0 dos dois lados (foi o que o critico mediu na r2).
Com vertex AO + saia de contato, espera-se queda >= 8 do lado da parede e >= 4 do lado do
chao. Uso:  python3 vao_a1.py /root/shots/r2   (ou r3, quando existir)
"""
import sys, os, glob
import numpy as np
from PIL import Image

# ~15 cm em pixels. O perfil que o critico publicou tinha 9 amostras de parede antes do
# degrau, entao a escala de trabalho e ~0,6 px/cm nessa distancia. 10 px e a leitura direta.
WIN = 10
MAPS = ['praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho']


def lstar(rgb01):
    lin = np.where(rgb01 <= 0.04045, rgb01 / 12.92, ((rgb01 + 0.055) / 1.055) ** 2.4)
    Y = lin[..., 0] * 0.2126 + lin[..., 1] * 0.7152 + lin[..., 2] * 0.0722
    f = np.where(Y > 0.008856, np.cbrt(np.maximum(Y, 1e-12)), (7.787 * Y) + 16.0 / 116.0)
    return 116.0 * f - 16.0


# HUD/viewmodel: o canto inferior direito e a arma, o esquerdo o HP, o topo o placar.
def usable(h, w):
    m = np.ones((h, w), bool)
    m[:int(0.14 * h), :] = False
    m[int(0.86 * h):, :int(0.26 * w)] = False
    m[int(0.50 * h):, int(0.62 * w):] = False   # viewmodel
    m[:int(0.24 * h), :int(0.16 * w)] = False   # radar
    return m


def junctions(L, ok):
    """Juncoes = linhas onde L cai forte de cima pra baixo e as duas faces sao planas.

    Filtro deliberadamente severo: exige >= 12 de degrau em 3 px E desvio-padrao < 3 nos
    12 px de cada lado. Isso descarta textura, sombra e silhueta de predio, e sobra a
    aresta geometrica — que e exatamente o que o A1 quer amostrar."""
    h, w = L.shape
    out = []
    for x in range(4, w - 4, 7):
        col = L[:, x]
        good = ok[:, x]
        for y in range(30, h - 30):
            if not good[y - 26:y + 26].all():
                continue
            step = col[y - 2] - col[y + 2]
            if step < 12:
                continue
            up = col[y - 14:y - 2]
            dn = col[y + 3:y + 15]
            if up.std() > 3.0 or dn.std() > 3.0:
                continue
            out.append((x, y, col[y - 14:y - 1].copy(), col[y + 2:y + 16].copy()))
            break   # uma juncao por coluna (a mais alta) — evita contar a mesma parede 5x
    return out


def drop(prof):
    """Queda total do inicio ao fim do perfil (positivo = escurece na direcao da juncao)."""
    return float(prof[0] - prof[-1])


def mono(prof):
    """Fracao de passos que vao na direcao certa (escurecendo)."""
    d = np.diff(prof)
    return float((d <= 0.25).mean())


def run(dirpath):
    print(f'=== A1 / AO de contato — {dirpath} (janela {WIN} px ~ 15 cm) ===')
    print(f'{"frame":30s}{"n":>4s}{"dL* parede":>12s}{"dL* chao":>10s}{"mono%":>8s}')
    tot_w, tot_f = [], []
    for f in sorted(glob.glob(os.path.join(dirpath, 'game-*.png'))):
        a = np.asarray(Image.open(f).convert('RGB'), np.float64) / 255.0
        L = lstar(a)
        h, w = L.shape
        js = junctions(L, usable(h, w))
        if not js:
            continue
        dw = [drop(u[-WIN:]) for _, _, u, _ in js]        # ultimos WIN px antes da juncao
        df = [drop(d[:WIN][::-1]) for _, _, _, d in js]   # chao: do longe pra juncao
        mw = [mono(u[-WIN:]) for _, _, u, _ in js]
        tot_w += dw; tot_f += df
        print(f'{os.path.basename(f):30s}{len(js):4d}{np.median(dw):12.2f}'
              f'{np.median(df):10.2f}{100 * np.mean(mw):8.1f}')
    if tot_w:
        print(f'\nMEDIANA GLOBAL  parede {np.median(tot_w):+.2f}   chao {np.median(tot_f):+.2f}'
              f'   (n={len(tot_w)})')
        print(f'p75 parede {np.percentile(tot_w, 75):+.2f}   p90 {np.percentile(tot_w, 90):+.2f}')


if __name__ == '__main__':
    run(sys.argv[1] if len(sys.argv) > 1 else '/root/shots/r2')
