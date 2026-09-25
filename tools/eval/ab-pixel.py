# BUG-56 A/B quantitativo (PIL) — descreve o que MUDOU nos frames 3:2, sem olho.
# Saída por shot: % de pixels mudados, onde (mascara por terços), cor média das
# regiões nova/velha, e contagem de bordas (sobel simples) antes/depois — proxy de
# "detalhe/low-poly chapado". Uso: python3 tools/eval/ab-pixel.py <antes.png> <depois.png>
import sys
from PIL import Image, ImageFilter

def stats(p):
    im = Image.open(p).convert('RGB')
    return im

a, b = stats(sys.argv[1]), stats(sys.argv[2])
assert a.size == b.size, f"tamanhos divergem: {a.size} vs {b.size}"
W, H = a.size
pa, pb = a.load(), b.load()
changed = []
for y in range(0, H, 2):          # amostra 1/4 dos pixels: 1536x1024 basta
    for x in range(0, W, 2):
        ra, ga, ba2 = pa[x, y]; rb, gb, bb = pb[x, y]
        if abs(ra-rb) + abs(ga-gb) + abs(ba2-bb) > 45:
            changed.append((x, y))
tot = (W//2) * (H//2)
pct = 100.0 * len(changed) / tot
tercos = [0, 0, 0]
for x, y in changed:
    tercos[min(2, x * 3 // W)] += 1
# Bordas de verdade: bytes > 40 após sobel. (A versão anterior fazia
# len(getdata()) — conta TODOS os pixels, sempre 100%, métrica decorativa.)
def edges(img):
    return sum(1 for v in img.filter(ImageFilter.FIND_EDGES).convert('L').tobytes() if v > 40)
ga_edges, gb_edges = edges(a), edges(b)
n = W * H
print(f"{sys.argv[1].split('/')[-1]}: {pct:.1f}% pixels mudados | terços L/C/R: "
      f"{tercos[0]}/{tercos[1]}/{tercos[2]} | bordas(>40) antes {100.0*ga_edges/n:.1f}% -> depois {100.0*gb_edges/n:.1f}%")
