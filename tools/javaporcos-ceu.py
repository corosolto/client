# Panorama do mapa javaporcos (public/img/textures/sky_javaporcos.webp).
# A foto de entardecer 2048x1024 tem o horizonte na linha 898 e mar embaixo: o horizonte
# vai para o equador do equirretangular, o sol gira para a direção da luz do mapa
# (sun.position -46, 22, 34 -> deslocamento 0,627 da largura) e abaixo do horizonte entra
# névoa de mata. Uso: python3 tools/javaporcos-ceu.py <foto_original.webp> <saida.webp> 0.627
import sys, numpy as np; from PIL import Image
src, dst, shift = sys.argv[1], sys.argv[2], float(sys.argv[3])
a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W = a.shape[:2]; HZ = 898
yo = np.arange(H // 2) + 0.5
ys = yo / (H / 2) * HZ - 0.5
y0 = np.clip(np.floor(ys).astype(int), 0, H - 1); y1 = np.clip(y0 + 1, 0, H - 1); f = (ys - y0)[:, None, None]
cima = a[y0] * (1 - f) + a[y1] * f
hz = cima[-6:].mean(0)                                  # cor do horizonte por coluna
mata = np.array([92, 100, 88], np.float32)
t = np.clip((np.arange(H // 2) / (H / 2)) / 0.08, 0, 1)[:, None, None]
baixo = hz[None] * (1 - t) + mata[None, None] * t
o = np.concatenate([cima, baixo], 0)
o = np.roll(o, int(round(shift * W)), axis=1)
Image.fromarray(np.clip(o, 0, 255).astype(np.uint8)).save(dst, quality=88, method=6)
