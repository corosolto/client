"""Mede os screenshots da reprovação humana da LMG (07/09) por pixels.

Determinístico e sem depender de visão: por frame, mede a pegada da arma no
quadrante inferior-direito, o bloqueio do centro do quadro, a diversidade de
cor da região da arma (textura vs chapado) e a presença de luva/braço (cor
 azul-acinzentada escura do material CoroSolto_FP_Glove/Cloth). Saída JSON em
artifacts/viewmodels/prep/lmg/review-2026-09-07/measurements.json.
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
DIR = ROOT / 'artifacts/viewmodels/prep/lmg/review-2026-09-07'


def region_stats(im, box):
    crop = im.crop(box)
    px = list(crop.getdata())
    n = max(1, len(px))
    uniq = len(set(px))
    lum = [sum(p) / 3 for p in px]
    mean = sum(lum) / n
    dark = sum(1 for l in lum if l < 60) / n
    return {'cores_unicas': uniq, 'lum_media': round(mean, 1), 'frac_escuro': round(dark, 3)}


def glove_pixels(im):
    """Luva/braço do pack: azul-acinzentado escuro (0.12-0.19 linear ~ 90-165 8bit)."""
    px = im.getdata()
    count = 0
    for p in px:
        r, g, b = p[:3]
        if b > r > 30 and b - r > 12 and 60 < r < 130 and 80 < b < 180 and abs(g - (r + b) / 2) < 28:
            count += 1
    return count


def content_bbox(im, box, thresh=200):
    crop = im.crop(box).convert('L')
    w, h = crop.size
    px = crop.load()
    pts = [(x, y) for y in range(0, h, 4) for x in range(0, w, 4) if px[x, y] < thresh]
    if not pts:
        return None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    x0, y0 = box[0] + min(xs), box[1] + min(ys)
    x1, y1 = box[0] + max(xs), box[1] + max(ys)
    return [x0, y0, x1, y1]


def main():
    files = sorted(p for p in DIR.glob('[0-9][0-9]-*.png') if '-sm' not in p.name)
    out = []
    for f in files:
        im = Image.open(f).convert('RGB')
        W, H = im.size
        if W < 2000:
            continue  # só os 16 de tela cheia
        qid = (W // 2, H // 2, W, H)  # quadrante inferior-direito
        center = (int(W * 0.30), int(H * 0.30), int(W * 0.70), int(H * 0.70))
        bbox = content_bbox(im, qid)
        row = {
            'frame': f.name[:2],
            'qid_bbox': bbox,
            'qid_stats': region_stats(im, qid),
            'centro_stats': region_stats(im, center),
            'centro_frac_escuro': None,
            'glove_px_quadrante_inf': None,
        }
        row['centro_frac_escuro'] = row['centro_stats']['frac_escuro']
        lower = im.crop((0, H // 2, W, H))
        row['glove_px_quadrante_inf'] = glove_pixels(lower.resize((lower.width // 4, lower.height // 4)))
        if bbox:
            row['arma_largura_frac_tela'] = round((bbox[2] - bbox[0]) / W, 3)
            row['arma_altura_frac_tela'] = round((bbox[3] - bbox[1]) / H, 3)
        out.append(row)
    (DIR / 'measurements.json').write_text(json.dumps(out, indent=1))
    print(json.dumps([{'frame': r['frame'], 'arma': r.get('arma_largura_frac_tela'), 'escuro_qid': r['qid_stats']['frac_escuro'], 'cores_qid': r['qid_stats']['cores_unicas'], 'luva_px': r['glove_px_quadrante_inf']} for r in out], indent=1))


if __name__ == '__main__':
    main()
