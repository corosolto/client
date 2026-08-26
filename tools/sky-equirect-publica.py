#!/usr/bin/env python3
"""Publica um panorama gerado como CÉU EQUIRRETANGULAR do jogo.

POR QUE EXISTE (r2 da mansão do Joá)
O `sky_joa.webp` da r1 foi publicado por `tools/gen-image.mjs` com recorte central e
mais nada. Duas contas não foram fechadas ali, e o dono viu as duas como "o horizonte
está com um efeito muito estranho":

  1. RECORTE 2:1 SEM ALINHAR O EQUADOR. `map_sky.js` usa
     EquirectangularReflectionMapping: a linha y = H/2 da imagem É a elevação 0 do
     mundo. Se a linha do mar da foto não cai nessa linha, o horizonte do céu e o
     horizonte da geometria ficam em alturas diferentes e a névoa entra na altura
     errada. `tools/eval/look-horizonte.py` amostra justamente H/2-14..H/2-2 — ou
     seja, a régua de cor já assume o alinhamento que ninguém fazia.
  2. NADA IMPEDIA PRIMEIRO PLANO ASSADO. A r1 publicou uma foto RETILÍNEA de varanda
     de mansão (deck de pedra, piscina, espreguiçadeiras, coqueiro) esticada para 2:1.
     Como panorama, isso vira mobília do tamanho do mundo na altura do olho.
     A cláusula S1 de `tools/eval/sky-foreground-check.mjs` mede isso.

O QUE FAZ
  a. acha a LINHA DO HORIZONTE: linha de maior degrau vertical de luminância na média
     das colunas centrais (o mar encontra o céu num degrau; nuvem e onda não fazem
     degrau dessa ordem em linha inteira);
  b. recorta 2:1 pelo centro horizontal e desloca o recorte na vertical até o horizonte
     cair em H/2 (recorte, nunca warp: esticar a vertical distorce a elevação);
  c. reamostra para a largura pedida CIENTE DO WRAP (mesma emenda circular do
     `sky_seam.py`, senão o Lanczos grampeia a borda e abre costura);
  d. grava WebP 92/method 6 — o joelho de banding do gradiente de céu, medido no
     cabeçalho do `sky_seam.py`.

Fechar a costura continua sendo trabalho do `sky_seam.py fix`, que roda DEPOIS.

Uso:
  python3 tools/sky-equirect-publica.py --src bruto.png --out public/img/textures/x.webp [--w 2048]
"""
import argparse

import numpy as np
from PIL import Image


def linha_do_horizonte(rgb):
    """Índice da linha com o maior degrau vertical de luminância (colunas centrais)."""
    h, w = rgb.shape[:2]
    perfil = rgb[:, int(w * .2):int(w * .8)].mean(axis=(1, 2))
    # ignora as pontas: nuvem colada no topo e borda inferior não são horizonte
    degrau = np.abs(np.diff(perfil))
    margem = int(h * .2)
    degrau[:margem] = 0
    degrau[-margem:] = 0
    return int(np.argmax(degrau))


def publica(src, out, largura):
    rgb = np.asarray(Image.open(src).convert('RGB'), np.float64) / 255.
    h, w = rgb.shape[:2]
    hz = linha_do_horizonte(rgb)

    # 2:1 pelo centro horizontal
    cw = min(w, h * 2)
    x0 = (w - cw) // 2
    ch = cw // 2
    # desloca na vertical até o horizonte cair no meio do recorte, sem sair da imagem
    y0 = int(np.clip(hz - ch // 2, 0, h - ch))
    corte = rgb[y0:y0 + ch, x0:x0 + cw]
    hz_final = hz - y0

    img = (np.clip(corte, 0, 1) * 255).round().astype(np.uint8)
    if largura and largura != cw:
        # Reamostragem CIENTE DO WRAP. A emenda de P colunas do `sky_seam.py` só fecha
        # quando P*escala é inteiro; com escala quebrada o recorte sai meio pixel fora e
        # nasce UMA coluna escura na borda — que o portão de rampa lê, com razão, como
        # costura de 6 L*/col. Ladrilhar 3x e ficar com o terço do meio é exato para
        # qualquer escala: o Lanczos vê a continuação real do cilindro dos dois lados.
        tri = np.concatenate([img, img, img], axis=1)
        pil = Image.fromarray(tri, 'RGB').resize(
            (largura * 3, largura // 2), Image.LANCZOS).crop((largura, 0, largura * 2, largura // 2))
    else:
        pil = Image.fromarray(img, 'RGB')
    pil.save(out, 'WEBP', quality=92, method=6)
    print(f'{out}: {pil.size[0]}x{pil.size[1]} · horizonte da fonte na linha {hz}/{h} '
          f'-> {hz_final}/{ch} (equador {ch // 2}, desvio {hz_final - ch // 2} px)')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--w', type=int, default=2048)
    a = ap.parse_args()
    publica(a.src, a.out, a.w)
