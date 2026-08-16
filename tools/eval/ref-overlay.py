#!/usr/bin/env python3
"""
ref-overlay.py — DESENHA A NOSSA ARMA POR CIMA DO FRAME DE REFERÊNCIA.

POR QUE ESTE ARQUIVO É O ENTREGÁVEL QUE VALE
--------------------------------------------
Três rodadas fecharam números e o dono continuou dizendo "está tudo diferente do CS 1.6".
Isso acontece quando o portão mede grandezas certas com definições que não são as da
referência: a VM12 media "boca >= 0,66" contra uma foto onde a boca está em 0,513; a VM3
media atan(tanBarrel) e chamava de "ângulo"; a VM5 media área com um instrumento que
inflava até 1,9x. Cada uma dessas mentiras é invisível numa tabela e ÓBVIA numa
sobreposição. Aqui a nossa silhueta projetada é rasterizada NO MESMO ASPECTO e NA MESMA
GRADE DE PIXEL da foto, com a mira alinhada (as duas no centro exato do quadro), e sai um
PNG lado a lado. Se o número fechou e a imagem não parece, é a imagem que está certa.

O QUE ELE FAZ
-------------
Para cada par (frame de referência, nossa arma):
  • roda tools/eval/vm-project.mjs contra a árvore alvo (--alvo permite apontar para um
    checkout ANTIGO e gerar o "antes"), que devolve a máscara da nossa arma em W x H;
  • recorta a máscara da arma DA FOTO usando as MESMAS regras de cor do ref-measure.py
    (importado, não copiado — se a regra mudar lá, muda aqui);
  • mede as 5 grandezas nos DOIS lados com a MESMA função, e imprime a tabela;
  • compõe: foto + referência em ciano + nossa arma em magenta + mira + réguas.

USO
  python3 tools/eval/ref-overlay.py                      # depois (árvore atual) -> /tmp/overlay
  python3 tools/eval/ref-overlay.py --alvo /tmp/repo-antes --tag antes
  python3 tools/eval/ref-overlay.py --medir              # só a tabela, sem PNG
  python3 tools/eval/ref-overlay.py --lado-a-lado antes depois   # junta os pares num PNG
"""
import argparse
import importlib.util
import json
import math
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
REFDIR = os.path.join(RAIZ, 'references', 'viewmodel')

# regras de cor e maior_componente vêm do ref-measure.py — a segmentação da referência é
# DELE, não minha. (import por caminho porque o nome tem hífen.)
_spec = importlib.util.spec_from_file_location('refmeasure', os.path.join(AQUI, 'ref-measure.py'))
RM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(RM)

# frame de referência -> arma nossa. A escolha está no enunciado do dono: AK contra a AK do
# CS, M4 contra a M4 do CS, e a Vandal (Valorant) contra a nossa scar (mesma silhueta de
# rifle moderno). O aspecto de cada foto é o aspecto em que a NOSSA arma é projetada.
PARES = [
    ('cs16_ak_dust.jpg', 'ak'),
    ('cs16_m4_dust.jpg', 'm4'),
    ('valorant_vandal.jpg', 'scar'),
]
# PISTOLA E FACA NÃO TÊM FOTO DE REFERÊNCIA (a pasta references/viewmodel/ só tem rifle) e
# por isso ficam FORA dos PARES: nenhum número desta comparação pode virar teto de
# invariante. Elas entram com --extras só para a pergunta que o dono fez — "elas ao menos
# ficaram plausíveis?". O frame por trás serve de RÉGUA DE ESCALA (mesma lente, mesma mira,
# mesma grade de pixel), não de alvo: uma pistola NÃO deve cobrir o mesmo tanto que um AK.
# ARMAS QUE O DONO NOMEOU (rodada da LEGIBILIDADE): ele reclamou de "a ak 47 e a zastava
# toma a tela inteira" e o review dos screenshots apontou md97/scar/m92/svd/p90 como "um
# cano atravessando a tela e mais nada". Para OLHAR essas armas na mesma grade de pixel da
# foto é preciso poder pedi-las por nome (`--armas m92,md97`). O frame por trás é RÉGUA DE
# ESCALA, não alvo — só as 3 de PARES viram número de invariante (ver o bloco EXTRAS).
# Escolha do frame: AK-derivadas (m92 = Zastava M70, clone do AK) contra o frame do AK;
# fuzil 5,56 de coronha fixa (md97 = IMBEL MD97) contra o frame da M4.
# carbine (RODADA DO ESCORÇO): entra porque é a PIOR do arsenal em `gordura` (0,332 —
# ref-overlay.py:xx e VM18) e o dono precisa poder VER o que 0,332 quer dizer. Frame do AK
# porque é o único de fuzil de MADEIRA de coronha inteira na pasta (a carbine é a carabina
# de alavanca) — e, como diz o bloco EXTRAS, o frame aqui é RÉGUA DE ESCALA, não alvo:
# nenhum número desta linha pode virar teto de invariante.
FRAME_PADRAO = {
    'ak': 'cs16_ak_dust.jpg', 'akm': 'cs16_ak_dust.jpg', 'm92': 'cs16_ak_dust.jpg',
    'svd': 'cs16_ak_dust.jpg', 'p90': 'cs16_m4_dust.jpg', 'md97': 'cs16_m4_dust.jpg',
    'm4': 'cs16_m4_dust.jpg', 'scar': 'valorant_vandal.jpg', 'carbine': 'cs16_ak_dust.jpg',
}
EXTRAS = [
    ('cs16_m4_dust.jpg', 'pistol'),
    ('cs16_ak_dust.jpg', 'knife'),
]


def mascara_ref(arquivo):
    """Máscara da arma NA FOTO, pelas regras do ref-measure.py."""
    for nome, arq, regra, regiao in RM.REFS:
        if arq != arquivo:
            continue
        im = Image.open(os.path.join(REFDIR, arq)).convert('RGB')
        W, H = im.size
        a = np.asarray(im).astype(np.int16)
        x0, y0, x1, y1 = regiao
        caixa = np.zeros(a.shape[:2], bool)
        caixa[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = True
        return im, RM.maior_componente(regra(a) & caixa)
    raise KeyError(arquivo)


def medir(sel, aspecto):
    """AS 5 MEDIDAS + as fatias de borda, com a MESMA definição dos dois lados.

    É a razão de existir desta função: a comparação "nosso x referência" só é comparação se
    o estimador for literalmente o mesmo objeto de código. bocaXY usa a definição
    operacional do ref-measure (ponto da silhueta mais próximo da mira); anguloEixo é o PCA
    em coordenada de PIXEL; fatiaDir/fatiaBaixo são as larguras das lascas que saem pelas
    bordas (a medida da VM16)."""
    H, W = sel.shape
    ys, xs = np.nonzero(sel)
    if not len(xs):
        return None
    fx, fy = xs / W, ys / H
    px = xs.astype(float) - xs.mean()
    py = ys.astype(float) - ys.mean()
    w, vec = np.linalg.eigh(np.cov(np.vstack([px, py])))
    e = vec[:, int(np.argmax(w))]
    ang = abs(math.degrees(math.atan2(e[1], e[0])))
    if ang > 90:
        ang = 180 - ang
    k = int(np.argmin((fx - 0.5) ** 2 + (fy - 0.5) ** 2))
    col = sel[:, int(W * 0.99):]
    lin = np.nonzero(col.any(1))[0]
    row = sel[int(H * 0.99):, :]
    cl = np.nonzero(row.any(0))[0]
    return {
        'areaPct': 100.0 * sel.sum() / (W * H),
        'bordaEsq': float(fx.min()),
        'topo': float(fy.min()),
        'base': float(fy.max()),
        'bocaX': float(fx[k]), 'bocaY': float(fy[k]),
        'anguloEixoGraus': ang,
        'cruzaDir': bool(fx.max() > 0.995),
        'fatiaDir': (lin.max() - lin.min() + 1) / H if len(lin) else 0.0,
        'fatiaBaixo': (cl.max() - cl.min() + 1) / W if len(cl) else 0.0,
        'aspecto': W / H,
    }


def mascara_nossa(alvo, arma, aspecto, W, H, ads=False):
    """Roda o projetor (node) contra a árvore `alvo` e lê a máscara W x H.
    ads=True projeta a POSE DE MIRA (adsF=1) em vez da de quadril — é o que permite pôr as
    duas sobre o MESMO frame de referência e responder com pixel se o dono tem razão em
    dizer que a de mira "chega perto do ideal"."""
    with tempfile.NamedTemporaryFile(suffix='.bin', delete=False) as f:
        saida = f.name
    cmd = [
        'node', os.path.join(AQUI, 'vm-project.mjs'), '--alvo', alvo, '--arma', arma,
        '--aspecto', repr(aspecto), '--w', str(W), '--h', str(H), '--saida', saida,
        '--ads', '1' if ads else '0',
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=RAIZ)
    if r.returncode != 0:
        raise RuntimeError('vm-project falhou: ' + r.stderr[-800:])
    m = np.fromfile(saida, np.uint8).reshape(H, W).astype(bool)
    os.unlink(saida)
    return m, json.loads(r.stdout.strip().splitlines()[-1])


def pinta(im, sel, cor, alpha=0.55, contorno=None):
    a = np.asarray(im).astype(float).copy()
    a[sel] = a[sel] * (1 - alpha) + np.array(cor) * alpha
    if contorno is not None:
        b = np.zeros_like(sel)
        b[1:, :] |= sel[1:, :] ^ sel[:-1, :]
        b[:, 1:] |= sel[:, 1:] ^ sel[:, :-1]
        a[b] = contorno
    return Image.fromarray(a.astype(np.uint8))


def linha(txt, d, x, y, cor=(255, 255, 255)):
    d.text((x + 1, y + 1), txt, fill=(0, 0, 0))
    d.text((x, y), txt, fill=cor)


def uma(alvo, arquivo, arma, tag, outdir, desenhar=True, ads=False):
    im, selr = mascara_ref(arquivo)
    W, H = im.size
    asp = W / H
    seln, meta = mascara_nossa(alvo, arma, asp, W, H, ads)
    mr, mn = medir(selr, asp), medir(seln, asp)
    if desenhar:
        out = pinta(im, selr, (0, 220, 255), 0.40)          # referência: ciano
        out = pinta(out, seln, (255, 0, 200), 0.55, (255, 255, 255))   # nossa: magenta
        d = ImageDraw.Draw(out)
        cx, cy = W // 2, H // 2                              # a MIRA, alinhada nos dois
        d.line([(cx - 9, cy), (cx + 9, cy)], fill=(0, 255, 0), width=2)
        d.line([(cx, cy - 9), (cx, cy + 9)], fill=(0, 255, 0), width=2)
        d.rectangle([0, 0, W - 1, 44], fill=(0, 0, 0))
        linha(f'{tag.upper()}  {arquivo}  x  nossa "{arma}"{"  [POSE DE MIRA]" if ads else "  [quadril]"}   asp {asp:.3f}   '
              f'vmScale {meta["vmScale"]} recuoZ {meta["recuoZ"]} minz {meta["minz"]} '
              f'offY {meta["offY"]} V0 {meta["V0"]} tanH {meta["tanH"]}', d, 6, 4)
        linha(f'REF   (ciano)  area {mr["areaPct"]:5.2f}%  esq {mr["bordaEsq"]:.3f}  '
              f'boca {mr["bocaX"]:.3f}/{mr["bocaY"]:.3f}  eixo {mr["anguloEixoGraus"]:5.1f}deg  '
              f'fatiaDir {mr["fatiaDir"]:.3f}  fatiaBaixo {mr["fatiaBaixo"]:.3f}', d, 6, 17, (0, 230, 255))
        if mn:
            linha(f'NOSSA (magenta) area {mn["areaPct"]:5.2f}%  esq {mn["bordaEsq"]:.3f}  '
                  f'boca {mn["bocaX"]:.3f}/{mn["bocaY"]:.3f}  eixo {mn["anguloEixoGraus"]:5.1f}deg  '
                  f'fatiaDir {mn["fatiaDir"]:.3f}  fatiaBaixo {mn["fatiaBaixo"]:.3f}', d, 6, 30, (255, 120, 230))
        else:
            linha('NOSSA (magenta): NENHUM PIXEL DENTRO DO QUADRO', d, 6, 30, (255, 120, 230))
        os.makedirs(outdir, exist_ok=True)
        p = os.path.join(outdir, f'{tag}_{arma}_{os.path.splitext(arquivo)[0]}.png')
        out.resize((1100, int(1100 / asp)), Image.LANCZOS).save(p)
    else:
        p = None
    return p, mr, mn, meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--alvo', default=RAIZ, help='raiz do checkout a projetar (para o ANTES)')
    ap.add_argument('--tag', default='depois')
    ap.add_argument('--out', default='/tmp/overlay')
    ap.add_argument('--medir', action='store_true', help='só a tabela')
    ap.add_argument('--lado-a-lado', nargs=2, metavar=('A', 'B'))
    ap.add_argument('--extras', action='store_true', help='inclui pistola e faca (SEM referência própria — ver EXTRAS)')
    ap.add_argument('--ads', action='store_true', help='projeta a POSE DE MIRA (adsF=1) em vez da de quadril')
    ap.add_argument('--armas', default='', help='lista por vírgula (ex.: ak,m92,md97) — sobrepõe PARES; frame por FRAME_PADRAO')
    a = ap.parse_args()

    if a.armas:
        pares = [(FRAME_PADRAO.get(w, 'cs16_m4_dust.jpg'), w) for w in a.armas.split(',') if w]
    else:
        pares = PARES + (EXTRAS if a.extras else [])
    if a.lado_a_lado:
        for arq, arma in pares:
            b = os.path.splitext(arq)[0]
            ims = [Image.open(os.path.join(a.out, f'{t}_{arma}_{b}.png')) for t in a.lado_a_lado]
            W = sum(i.width for i in ims)
            Hh = max(i.height for i in ims)
            c = Image.new('RGB', (W, Hh), (0, 0, 0))
            x = 0
            for i in ims:
                c.paste(i, (x, 0)); x += i.width
            p = os.path.join(a.out, f'AB_{arma}_{b}.png')
            c.save(p)
            print('->', p)
        return

    print(f'{"frame":24} {"lado":8} {"area%":>7} {"esq":>6} {"bocaY":>6} {"eixo":>6} '
          f'{"cruzD":>6} {"fatDir":>7} {"fatBaix":>8}')
    for arq, arma in pares:
        p, mr, mn, meta = uma(a.alvo, arq, arma, a.tag, a.out, desenhar=not a.medir, ads=a.ads)
        for lado, m in (('REF', mr), ('NOSSA', mn)):
            if not m:
                print(f'{arq:24} {lado:8}   (nenhum pixel visível)')
                continue
            print(f'{arq:24} {lado:8} {m["areaPct"]:7.2f} {m["bordaEsq"]:6.3f} {m["bocaY"]:6.3f} '
                  f'{m["anguloEixoGraus"]:6.1f} {str(m["cruzaDir"]):>6} {m["fatiaDir"]:7.3f} {m["fatiaBaixo"]:8.3f}')
        if p:
            print('   ->', p)


if __name__ == '__main__':
    main()
