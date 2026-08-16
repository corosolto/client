# P0 — analise em PIXEL das capturas de arma.
# Por que: a sonda 3D diz onde a arma DEVERIA estar; isto prova o que o jogador VE.
# Cada tiro tem um par: shot (com arma) e _ref (mesmo frame com vm.root.visible=false).
# O diff isola EXATAMENTE os pixels da arma — sem chute, sem olhometro.
import os, json, sys
from PIL import Image, ImageChops

OUT = sys.argv[1] if len(sys.argv) > 1 else '/root/shots/p0'
REF = os.path.join(OUT, '_ref')
res = []
for fn in sorted(os.listdir(OUT)):
    if not fn.endswith('.png'):
        continue
    rp = os.path.join(REF, fn)
    if not os.path.exists(rp):
        continue
    a = Image.open(os.path.join(OUT, fn)).convert('RGB')
    b = Image.open(rp).convert('RGB')
    W, H = a.size
    d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 14 else 0)
    bbox = d.getbbox()
    px = d.histogram()[255]
    r = {'file': fn, 'w': W, 'h': H, 'gunPx': px, 'gunPct': round(100.0 * px / (W * H), 2)}
    if bbox:
        r['bboxPx'] = list(bbox)
        # centroide dos pixels da arma
        sx = sy = 0
        dd = d.load()
        step = 3
        n = 0
        for y in range(bbox[1], bbox[3], step):
            for x in range(bbox[0], bbox[2], step):
                if dd[x, y]:
                    sx += x; sy += y; n += 1
        if n:
            cx, cy = sx / n, sy / n
            r['centroid'] = [round(cx), round(cy)]
            r['quadrante'] = ('inf' if cy > H / 2 else 'sup') + '-' + ('dir' if cx > W / 2 else 'esq')
            # fracao dos pixels da arma que caem no quadrante inferior-direito
            nq = 0
            for y in range(bbox[1], bbox[3], step):
                for x in range(bbox[0], bbox[2], step):
                    if dd[x, y] and x > W / 2 and y > H / 2:
                        nq += 1
            r['fracInfDir'] = round(nq / n, 3)
    # legibilidade do frame: luminancia media (frame quase preto = a "faixa preta")
    g = a.convert('L')
    hist = g.histogram()
    tot = sum(hist)
    r['lumaMedia'] = round(sum(i * hist[i] for i in range(256)) / tot, 1)
    # C9 da BAR-CONSISTENCIA: FAIL se >60% da tela esta coberta por mascara/preto.
    # luma < 12 = preto de mascara (o mapa mais escuro deste jogo nao chega perto disso).
    r['pctPreto'] = round(100.0 * sum(hist[:12]) / tot, 1)
    # centro da tela: 41x41 em volta do crosshair — precisa ter contraste (mira visivel)
    cw = g.crop((W // 2 - 20, H // 2 - 20, W // 2 + 21, H // 2 + 21))
    ch = cw.histogram()
    ct = sum(ch)
    mu = sum(i * ch[i] for i in range(256)) / ct
    var = sum(((i - mu) ** 2) * ch[i] for i in range(256)) / ct
    r['centroLuma'] = round(mu, 1)
    r['centroStd'] = round(var ** 0.5, 1)
    res.append(r)
print(json.dumps(res, indent=1))
open(os.path.join(OUT, '_pix.json'), 'w').write(json.dumps(res, indent=1))
