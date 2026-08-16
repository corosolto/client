#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Review MEDIDO de gráficos de mapa — frame do jogo contra a referência AAA.

PORQUE: "os gráficos estão fracos" é opinião e não dá para agir. Este script mede os cinco
eixos que separam um frame de protótipo de um frame AAA, nos MESMOS termos das ferramentas
que já existem em tools/eval (r3_depth.py, r3_color.py, tone_calib.py) mas aceitando
qualquer PNG, para poder comparar o jogo com uma referência externa lado a lado.

OS CINCO EIXOS (nenhum deles é geometria — todos são alcançáveis em Three.js)
  1. faixa dinâmica    L* médio, %L*<3 (preto esmagado), %L*>97 (branco estourado)
  2. perspectiva aérea razão de contraste local longe/perto. Alvo do gauntlet: <= 0.75
                       (r3_depth.py: "se o fundo tem MAIS contraste local que o primeiro
                        plano, a imagem lê como colagem, não como espaço")
  3. variedade de cor  nº de cores dominantes e espalhamento em CIELAB (ΔE médio entre elas)
  4. saturação         média e desvio — cenário chapado tem S alto e desvio baixo
  5. densidade de      energia de alta frequência (detalhe pequeno: poeira, pedra, lixo)
     detalhe

USO
  python3 tools/eval/gfx_review.py <img1.png> [img2.png ...] [--crop TOPO,BAIXO]
  --crop corta N pixels do topo/base (barra do navegador e dock em screenshot de tela cheia)
"""
import sys, math
import numpy as np
from PIL import Image
from skimage import color as skcolor
from sklearn.cluster import KMeans

Image.MAX_IMAGE_PIXELS = None


def carregar(p, corte_topo=0, corte_base=0):
    im = Image.open(p).convert('RGB')
    a = np.asarray(im, dtype=np.float64) / 255.0
    h = a.shape[0]
    t = int(h * corte_topo)
    b = int(h * corte_base)
    return a[t:h - b] if b else a[t:]


def lab_de(rgb):
    return skcolor.rgb2lab(rgb)


def mascara_ceu(L, rgb):
    """céu = alto L* E azul dominante, nas linhas de cima. Mesma ideia do r2_audit."""
    h = L.shape[0]
    m = np.zeros(L.shape, bool)
    topo = slice(0, int(h * 0.55))
    azul = rgb[..., 2] > rgb[..., 0] + 0.02
    m[topo] = (L[topo] > 62) & azul[topo]
    return m


def contraste_local(L, win=7):
    """desvio-padrão de L* em janela win×win via imagem integral (rápido e igual ao r3_depth)."""
    p = np.pad(L, win // 2, mode='edge')
    i1 = np.cumsum(np.cumsum(p, 0), 1)
    i2 = np.cumsum(np.cumsum(p * p, 0), 1)
    def soma(I):
        a = I[win:, win:]; b = I[:-win, :-win]; c = I[win:, :-win]; d = I[:-win, win:]
        return a + b - c - d
    n = win * win
    s1 = soma(i1); s2 = soma(i2)
    var = np.maximum(0.0, s2 / n - (s1 / n) ** 2)
    return np.sqrt(var)


def medir(p, corte_topo=0.0, corte_base=0.0, nome=None):
    rgb = carregar(p, corte_topo, corte_base)
    lab = lab_de(rgb)
    L = lab[..., 0]
    ceu = mascara_ceu(L, rgb)
    chao = ~ceu

    # 1. faixa dinâmica (só cenário, sem céu)
    Lc = L[chao]
    r = {
        'nome': nome or p.split('/')[-1][:34],
        'L_medio': float(Lc.mean()),
        'pct_L_menor_3': float((Lc < 3).mean() * 100),
        'pct_L_maior_97': float((Lc > 97).mean() * 100),
        'L_p05': float(np.percentile(Lc, 5)),
        'L_p95': float(np.percentile(Lc, 95)),
    }
    r['faixa_util'] = r['L_p95'] - r['L_p05']

    # 2. perspectiva aérea: contraste local na faixa LONGE (logo abaixo do céu) vs PERTO (rodapé)
    cl = contraste_local(L)
    h = L.shape[0]
    # linha do horizonte = última linha com >20% de céu
    linhas_ceu = ceu.mean(axis=1)
    hz = int(np.max(np.nonzero(linhas_ceu > 0.20)[0])) if (linhas_ceu > 0.20).any() else int(h * 0.35)
    faixa_longe = cl[hz:hz + max(8, int(h * 0.10))]
    faixa_perto = cl[int(h * 0.82):]
    r['contraste_longe'] = float(faixa_longe.mean())
    r['contraste_perto'] = float(faixa_perto.mean())
    r['razao_aerea'] = r['contraste_longe'] / max(1e-6, r['contraste_perto'])

    # 3. variedade de cor: k-means em LAB sobre o cenário, ΔE médio entre centros
    am = lab[chao]
    sub = am[np.random.default_rng(7).choice(len(am), min(20000, len(am)), replace=False)]
    km = KMeans(n_clusters=8, n_init=4, random_state=7).fit(sub)
    C = km.cluster_centers_
    d = [np.linalg.norm(C[i] - C[j]) for i in range(8) for j in range(i + 1, 8)]
    r['deltaE_medio'] = float(np.mean(d))
    r['deltaE_p90'] = float(np.percentile(d, 90))

    # 4. saturação (chroma do LAB)
    ch = np.sqrt(lab[..., 1] ** 2 + lab[..., 2] ** 2)[chao]
    r['croma_medio'] = float(ch.mean())
    r['croma_desvio'] = float(ch.std())

    # 5. densidade de detalhe: energia de alta frequência (L* menos sua versão borrada 3×3)
    k = np.ones((3, 3)) / 9.0
    pad = np.pad(L, 1, mode='edge')
    borr = sum(pad[i:i + L.shape[0], j:j + L.shape[1]] * k[i, j] for i in range(3) for j in range(3))
    r['detalhe_alta_freq'] = float(np.abs(L - borr)[chao].mean())
    return r


CAMPOS = [
    ('L_medio', 'L* médio', '{:.1f}'),
    ('faixa_util', 'faixa útil p05-p95', '{:.1f}'),
    ('pct_L_menor_3', '% preto esmagado', '{:.2f}'),
    ('pct_L_maior_97', '% branco estourado', '{:.2f}'),
    ('razao_aerea', 'razão aérea longe/perto', '{:.2f}'),
    ('deltaE_medio', 'ΔE médio entre cores', '{:.1f}'),
    ('croma_medio', 'croma médio', '{:.1f}'),
    ('croma_desvio', 'desvio do croma', '{:.1f}'),
    ('detalhe_alta_freq', 'detalhe alta freq.', '{:.2f}'),
]

if __name__ == '__main__':
    argv = sys.argv[1:]
    if '--crop' in argv:
        i = argv.index('--crop'); argv = argv[:i] + argv[i+2:]
    args = [a for a in argv if not a.startswith('--')]
    ct = cb = 0.0
    if '--crop' in sys.argv:
        ct, cb = [float(x) for x in sys.argv[sys.argv.index('--crop') + 1].split(',')]
    res = [medir(p, ct, cb) for p in args]
    larg = max(len(r['nome']) for r in res)
    print(f"{'métrica':<24}" + ''.join(f"{r['nome']:>{larg+3}}" for r in res))
    print('-' * (24 + (larg + 3) * len(res)))
    for k, rot, f in CAMPOS:
        print(f'{rot:<24}' + ''.join(f"{f.format(r[k]):>{larg+3}}" for r in res))
