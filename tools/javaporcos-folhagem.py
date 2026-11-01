# Atlas de folhagem do mapa javaporcos (public/img/textures/folhagem_mata.webp), 1024x512:
# esquerda tufo de copa, direita moita. Folhas recortadas dos escaneamentos CC0 do Poly Haven
# (shrub_02, shrub_03, shrub_04: diffuse + alpha 1k png), baixados para a pasta corrente:
#   for id in shrub_02 shrub_03 shrub_04; do for c in diff alpha; do
#     curl -sO https://dl.polyhaven.org/file/ph-assets/Models/png/1k/$id/${id}_${c}_1k.png; done; done
# Uso (na pasta das folhas): python3 tools/javaporcos-folhagem.py saida.webp   (numpy, scipy, pillow)
import sys, numpy as np, colorsys
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
rng = np.random.default_rng(7)
def folhas(s):
    d = np.asarray(Image.open(f'{s}_diff_1k.png').convert('RGB')); a = np.asarray(Image.open(f'{s}_alpha_1k.png').convert('L'))
    lab, n = ndimage.label(a > 128); out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        m = (lab[sl] == i + 1); sz = m.sum()
        if sz < 6000 or max(h, w) > 700 or sz / (h * w) < 0.22: continue
        rgba = np.dstack([d[sl], (a[sl] * m).astype(np.uint8)])
        im = Image.fromarray(rgba, 'RGBA')
        if w > h: im = im.rotate(90, expand=True)          # folha em pé: ponta para cima
        out.append(im)
    return out
lanc = folhas('shrub_02') + folhas('shrub_04'); cor = folhas('shrub_03')
print('folhas', len(lanc), len(cor))
def tinge(im, hue, sat, val, jit):
    a = np.asarray(im).astype(np.float32) / 255; rgb = a[..., :3]
    lum = rgb @ np.array([0.3, 0.59, 0.11]); lum = lum / max(1e-3, np.percentile(lum[a[..., 3] > 0.5], 60))
    h = (hue + rng.uniform(-jit, jit)) / 360; s = sat * rng.uniform(0.8, 1.15); v = val * rng.uniform(0.7, 1.2)
    base = np.array(colorsys.hsv_to_rgb(h, s, v), np.float32)
    o = np.clip(base[None, None] * lum[..., None] ** 0.9, 0, 1)
    return Image.fromarray(np.dstack([o, a[..., 3:]]).__mul__(255).astype(np.uint8), 'RGBA')
def galho(dr, x0, y0, x1, y1, w):
    dr.line([(x0, y0), (x1, y1)], fill=(58, 44, 30, 255), width=w)
def tufo(S, n, fontes, comp, hue, sat, val, forma):
    t = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dr = ImageDraw.Draw(t)
    c = S / 2
    pts = []
    for k in range(n):
        if forma == 'disco':
            r = (rng.uniform(0, 1) ** 0.75) * S * 0.43; th = rng.uniform(0, 2 * np.pi)
            x, y = c + r * np.cos(th), c + r * np.sin(th) * 0.92; ang = np.degrees(np.arctan2(y - c, x - c)) + 90
        else:   # leque: moita vista de lado, nasce do chão
            th = rng.uniform(-1.25, 1.25); r = rng.uniform(0.25, 1) ** 0.6 * S * 0.82
            x, y = c + r * np.sin(th) * 0.62, S - 8 - r * np.cos(th) * 1.0; ang = np.degrees(th) + rng.uniform(-25, 25)
        pts.append((x, y, ang, r))
    for x, y, ang, r in pts[: n // (3 if forma == 'disco' else 8)]:
        galho(dr, c if forma == 'disco' else c + rng.uniform(-20, 20), c if forma == 'disco' else S, x, y, 2)
    pts.sort(key=lambda p: -p[3])   # de fora para dentro: as de dentro por cima, mais escuras
    for x, y, ang, r in pts:
        f = fontes[rng.integers(len(fontes))]
        L = rng.uniform(*comp); esc = L / f.height
        fo = f.resize((max(2, int(f.width * esc)), max(2, int(f.height * esc))), Image.LANCZOS)
        prof = 1 - 0.38 * (1 - r / (S * 0.45)) if forma == 'disco' else 1 - 0.3 * (y / S)
        fo = tinge(fo, hue, sat, val * prof, 14).rotate(-ang + rng.uniform(-30, 30), expand=True, resample=Image.BICUBIC)
        t.alpha_composite(fo, (int(x - fo.width / 2), int(y - fo.height / 2)))
    return t
copa = tufo(512, 250, lanc, (44, 86), 116, 0.42, 0.56, 'disco')
moita = tufo(512, 95, lanc + cor + cor, (80, 150), 116, 0.42, 0.48, 'leque')
atl = Image.new('RGBA', (1024, 512)); atl.paste(copa, (0, 0)); atl.paste(moita, (512, 0))
a = np.asarray(atl).astype(np.float32)
alpha = a[..., 3] > 127
print('cobertura copa %.2f moita %.2f' % (alpha[:, :512].mean(), alpha[:, 512:].mean()))
# sangra a cor da folha para o transparente: sem isso o mipmap traz halo preto na borda
rgb = a[..., :3].copy(); _, idx = ndimage.distance_transform_edt(~alpha, return_indices=True)
rgb = rgb[idx[0], idx[1]]
out = np.dstack([rgb, np.where(alpha, 255, 0)]).astype(np.uint8)
Image.fromarray(out, 'RGBA').save(sys.argv[1], lossless=False, quality=90, alpha_quality=100, method=6)
prev = Image.new('RGB', (1024, 512), (200, 120, 255)); prev.paste(Image.fromarray(out, 'RGBA'), mask=Image.fromarray(out[..., 3])); prev.save('atlas_prev.jpg')
