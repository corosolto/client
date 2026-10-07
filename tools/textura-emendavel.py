"""Textura gerada -> textura de mapa: tira a luz de baixa frequência do gerador, emenda as
bordas (cross-fade com a cópia deslocada), casa a média com a textura que substitui e limita
o desvio local (teto de grunge da BAR-CONSISTENCIA §3.3). Procedência: public/img/FONTE.md.

Uso: python3 tools/textura-emendavel.py bruto.png saida.webp R G B escala faixa teto
  R G B   média alvo (a da textura substituída, para o mapa não mudar de tom)
  escala  multiplica o desvio em torno da média; faixa: fração da borda no cross-fade
  teto    desvio máximo por canal (0-255) depois da escala
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
alvo = np.array([float(v) for v in sys.argv[3:6]])
escala, faixa, teto = float(sys.argv[6]), float(sys.argv[7]), float(sys.argv[8])

img = Image.open(src).convert('RGB').resize((1024, 1024), Image.LANCZOS)
a = np.asarray(img, dtype=np.float64)
baixa = np.asarray(img.filter(ImageFilter.GaussianBlur(96)), dtype=np.float64)
a = a - baixa + baixa.reshape(-1, 3).mean(0)

n = a.shape[0]
b = np.roll(a, (n // 2, n // 2), axis=(0, 1))
t = np.abs(np.linspace(-1, 1, n))
w = np.clip((1 - t) / faixa, 0, 1)
m = np.minimum.outer(w, w)[..., None]
c = a * m + b * (1 - m)

c = alvo + np.clip((c - c.reshape(-1, 3).mean(0)) * escala, -teto, teto)
Image.fromarray(np.clip(c, 0, 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS).save(out, 'WEBP', quality=82, method=6)
