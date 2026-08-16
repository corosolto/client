#!/usr/bin/env python3
"""
ref-measure.py — MEDE O VIEWMODEL NOS FRAMES DE REFERÊNCIA (CS 1.6 / Valorant).

POR QUE ESTE ARQUIVO EXISTE
---------------------------
Durante três dias o portão de armas foi resolvido contra números ASSERIDOS: a VM12
exigia "boca do cano em y >= 0,66" e o doc do vmattach.js dizia "coronha INTEIRA no
canto". Nenhum dos dois foi medido em imagem nenhuma. O dono olhou o resultado e disse:
"está diferente do CS 1.6 e do Quake e do UT; nesses 3 a arma está sempre no canto
inferior direito e a coronha sempre FORA; depois de 3 dias e uma pasta inteira de
referência nem você nem o Kimi entendeu isso."

Ele estava certo, e a medição prova: a boca no CS 1.6 fica em y = 0,51-0,60 (LOGO ABAIXO
da mira), não em 0,66-0,93; e a coronha SAI pela quina inferior direita — sair é o padrão,
não o defeito. A invariante que eu defendi por uma rodada inteira estava encodando o
número errado, e por isso o solver "provou" que a área de 3% era inviável: ele estava
empurrando a arma para baixo e para longe para satisfazer um teto que a referência
contradiz.

REGRA QUE FICA: TETO DE INVARIANTE SÓ ENTRA COM PROCEDÊNCIA — arquivo de referência,
pixel medido, e este script reproduzindo o número. Número sem imagem é opinião.

MÉTODO
------
Segmentação por cor no quadrante inferior-direito (onde o viewmodel mora), maior
componente conexa, e daí: área na tela, borda esquerda da silhueta, ponto da arma mais
próximo da mira (= a "boca" que a VM12 mede), ângulo do eixo principal em PIXELS (que é
o ângulo que o olho vê, e depende do aspecto do frame), e se a silhueta cruza a borda
direita / a borda inferior.

O ângulo sai por PCA do blob, então ele mede o eixo da MASSA da arma, não a linha do
cano. Numa arma com coronha grossa e cano fino os dois diferem alguns graus — está
anotado em cada linha do JSON como `anguloEixoGraus` justamente para ninguém confundir
com o `anguloCanoGraus` do vm-mint-audit.mjs.

A máscara é SALVA em /tmp para conferência visual. Não confie num número de segmentação
que você não olhou: a primeira versão deste script vazou para a areia do dust e reportou
borda esquerda 0,499 em vez de 0,564.

Uso:  python3 tools/eval/ref-measure.py            (escreve tools/eval/ref_viewmodel.json)
      python3 tools/eval/ref-measure.py --masks    (idem + PNGs de conferência em /tmp)
"""
import json
import math
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE)) if os.path.basename(HERE) == 'eval' else HERE
REFDIR = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'references', 'viewmodel')
SALVA_MASCARA = '--masks' in sys.argv


def maior_componente(m):
    """Maior componente 4-conexa. Sem scipy (o container não tem rede pra instalar)."""
    lab = np.zeros(m.shape, np.int32)
    cur = 0
    melhor = (0, None)
    for j in range(m.shape[0]):
        linha = m[j]
        for i in range(m.shape[1]):
            if linha[i] and lab[j, i] == 0:
                cur += 1
                q = deque([(j, i)])
                lab[j, i] = cur
                n = 0
                while q:
                    y, x = q.popleft()
                    n += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        b, c = y + dy, x + dx
                        if 0 <= b < m.shape[0] and 0 <= c < m.shape[1] and m[b, c] and lab[b, c] == 0:
                            lab[b, c] = cur
                            q.append((b, c))
                if n > melhor[0]:
                    melhor = (n, cur)
    return lab == melhor[1]


"""GRIP NA REFERÊNCIA — a medida que a VM9 nunca teve (RODADA DO GRIP + PITCH).
────────────────────────────────────────────────────────────────────────────────
A VM9 ("grip entre 0,84 e 0,92 da altura da tela") era a ÚLTIMA invariante de
enquadramento sem um pixel por trás: veio de uma rodada antiga, sobreviveu à rodada da
referência medida (que reescreveu VM1/VM3/VM5/VM12/VM16 com procedência e CONGELOU esta),
e por isso a VM9 e a VM12 passaram a medir as duas pontas da MESMA arma com réguas de
origens diferentes — uma asserida, outra fotografada.

O QUE A VM9 MEDE DO NOSSO LADO, exatamente: `gripTela` é a projeção da ORIGEM do grupo
da arma, e essa origem é (0, 0, 0) em gun-space (vm-mint-audit.mjs:136 desloca só o z).
Como o GLB é centrado em x/y, o ponto é: **a meia-altura da caixa da arma, na estação
longitudinal a `cfg.gripZ` do comprimento contada a partir da boca** (ak/m4: 0,62).
Numa AK/M4 essa estação é o GATILHO — 0,62·880 mm = 545 mm da boca cai no guarda-mato.
Então "medir o grip na referência" = achar o gatilho/punhado de tiro em cada frame.

MÉTODO, E POR QUE ELE É MEIO MANUAL (e está declarado como tal):
 • M4A1 (cs16_m4_dust.jpg): DÁ PARA AUTOMATIZAR e foi automatizado. O guarda-mato é um
   BURACO fechado na silhueta (fundo cercado por arma dos 4 lados). Rodando a busca de
   buracos sobre a máscara, o maior buraco ABAIXO do centróide da silhueta é justamente
   ele: centro (0,728 ; 0,916), 359 px. (O outro buraco grande, (0,741 ; 0,685), é o vão
   do cabo de transporte.) O pixel marcado abaixo é esse centro, e `buracoAuto` no JSON
   guarda o número que a busca devolve, para quem quiser conferir sem confiar na marca.
 • AK47 (cs16_ak_dust.jpg) e Vandal (valorant_vandal.jpg): NÃO DÁ. Na AK o guarda-mato
   está atrás do antebraço do jogador e abaixo da borda; na Vandal a mão de tiro não
   aparece em ponto nenhum do quadro (o corpo da arma preenche a quina inferior direita
   inteira — conferido a olho em /tmp/refgrip_valorant_vandal.png). Nos dois a silhueta é
   CORTADA pela borda de baixo na coluna do gatilho (base 0,997 e 0,999), então o grip
   está NA BORDA OU ABAIXO DELA. É por isso que a marca dos dois tem dentro=False: o
   número é um PISO ("o grip está em y ≥ isto"), não uma medida.

ESTE É O DADO QUE A TAREFA PEDIA: em 2 dos 3 frames de referência a mão que segura a arma
NÃO ESTÁ NO QUADRO. A banda antiga (0,84-0,92) proibia exatamente isso.

MARCAÇÃO EM PIXEL DA IMAGEM ORIGINAL (não em fração — fração esconde erro de arredondamento
e não dá pra conferir com um editor de imagem). Conferência visual OBRIGATÓRIA:
`python3 tools/eval/ref-measure.py --masks` escreve /tmp/refgrip_*.png com a cruz no ponto
marcado, a cruz da boca e a mira. Se a cruz não estiver no gatilho, o número está errado.
"""
GRIP = {
    # arquivo: (px_x, px_y, dentro_do_quadro, como foi achado)
    'cs16_ak_dust.jpg': (
        415, 335, False,
        'coluna do gatilho (x 0,776 — logo atrás do poço do carregador, que a máscara mostra '
        'em x 0,674-0,766) na BORDA INFERIOR: a silhueta é cortada em y 0,997 nessa coluna e '
        'a mão de tiro não aparece. PISO, não medida.'),
    'cs16_m4_dust.jpg': (
        450, 453, True,
        'centro do buraco do guarda-mato, achado por busca de buracos na própria máscara '
        '(maior buraco abaixo do centróide: 359 px, centro 0,728/0,916).'),
    'valorant_vandal.jpg': (
        2202, 1440, False,
        'a mão de tiro não aparece no quadro; o receiver preenche a quina inferior direita e '
        'sai pelas DUAS bordas (base 0,999). Coluna x 0,860. PISO, não medida.'),
}


def buracos(sel):
    """Buracos da silhueta = fundo NÃO conectado à borda da imagem. É o detector do
    guarda-mato (o único jeito de achar o gatilho sem marcar a olho). Devolve lista de
    (n_px, fx_centro, fy_centro) ordenada por tamanho."""
    H, W = sel.shape
    bg = ~sel
    vis = np.zeros_like(bg)
    q = deque()
    for i in range(W):
        for j in (0, H - 1):
            if bg[j, i] and not vis[j, i]:
                vis[j, i] = True; q.append((j, i))
    for j in range(H):
        for i in (0, W - 1):
            if bg[j, i] and not vis[j, i]:
                vis[j, i] = True; q.append((j, i))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            b, c = y + dy, x + dx
            if 0 <= b < H and 0 <= c < W and bg[b, c] and not vis[b, c]:
                vis[b, c] = True; q.append((b, c))
    rest = bg & ~vis
    out = []
    while rest.any() and len(out) < 6:
        comp = maior_componente(rest)
        ys, xs = np.nonzero(comp)
        out.append((int(comp.sum()), float(xs.mean() / W), float(ys.mean() / H)))
        rest = rest & ~comp
    return out


def legibilidade(sel, G, M, W, H):
    """LEGIBILIDADE (VM18) — "dá pra saber que arma é?" em três números MEDÍVEIS NA FOTO.

    POR QUE ESTE BLOCO EXISTE. O dono jogou e disse: "a ak 47 e a zastava toma a tela
    inteira"; o review dos screenshots disse "em MD97, SCAR, M92, SVD e P90 você vê um cano
    atravessando a tela e mais nada — sem receiver, sem coronha, sem carregador; não dá pra
    saber que arma é sem ler o HUD". NENHUMA das invariantes de enquadramento media isso:
    VM1/VM3/VM5/VM12/VM16 medem ONDE a silhueta está e QUANTO ela cobre, e uma fita fina
    diagonal passa em todas elas com folga (a área de um cano atravessado é a mesma de uma
    arma inteira compacta). O que faltava era medir a FORMA do que sobra dentro do quadro.

    SISTEMA DE COORDENADAS. Tudo é medido no eixo da PRÓPRIA ARMA, não da tela: G = grip
    (a mão de tiro), M = boca do cano, os dois em coordenada de PIXEL (x·aspecto, y) e os
    dois já existentes nesta régua. u = (M-G)/|M-G| é o eixo do cano; n é o perpendicular.
    Para cada célula VISÍVEL da silhueta, s = ((p-G)·u)/L e t = ((p-G)·n)/L, com L=|M-G|.
    Assim s=0 no gatilho, s=1 na boca, e as três medidas ficam adimensionais (não mudam com
    a resolução da foto) e comparáveis entre a foto e o nosso projetor.

    AS TRÊS MEDIDAS
      • frenteVisivel = max(s) — quanto do trecho GRIP→BOCA aparece. 1,0 = o cano inteiro
        está na tela. É a "fração do COMPRIMENTO visível" que a tarefa pediu.
      • trasVisivel = -min(s) — quanto de arma aparece ATRÁS do grip, em comprimentos de
        grip→boca. É a pergunta "a região do RECEIVER/coronha aparece?" virada em número:
        0 significa que a arma é cortada no gatilho e o corpo dela não está no quadro.
      • gordura = (extensão em t) / (extensão em s) — a ESPESSURA da silhueta visível
        dividida pelo comprimento dela. É o discriminante de "cano atravessando a tela":
        uma fita fina tem gordura baixa; uma arma com receiver, carregador e coronha no
        quadro tem gordura alta. Não confundir com área: as duas coisas são independentes
        (uma fita longa e uma arma compacta podem cobrir os mesmos 10% da tela).

    RESSALVA QUE VIAJA COM O NÚMERO: na AK e na Vandal o G é PISO (a mão de tiro está na
    borda ou fora — ver o bloco GRIP acima), então L é um piso e `gordura` daquelas duas é
    um TETO. A M4A1 é a única com G medido dentro do quadro, e é dela que sai o piso 0,685
    usado como limite inferior — o número mais conservador dos três, de propósito."""
    ys, xs = np.nonzero(sel)
    P = np.stack([xs / W * (W / H), ys / H], 1)
    u = M - G
    L = float(np.hypot(*u))
    u = u / L
    n = np.array([-u[1], u[0]])
    s = (P - G) @ u / L
    t = (P - G) @ n / L
    ds, dt = float(s.max() - s.min()), float(t.max() - t.min())
    return {
        'eixoGripBoca': round(L, 3),
        'frenteVisivel': round(float(s.max()), 3),
        'trasVisivel': round(float(-s.min()), 3),
        'compVisivel': round(ds, 3),
        'espessura': round(dt, 3),
        'gordura': round(dt / ds, 3),
    }


def medir(nome, arquivo, regra, regiao):
    """regra(a) -> máscara booleana; regiao = (x0,y0,x1,y1) em fração, onde o VM mora."""
    im = Image.open(os.path.join(REFDIR, arquivo)).convert('RGB')
    W, H = im.size
    a = np.asarray(im).astype(np.int16)
    m = regra(a)
    x0, y0, x1, y1 = regiao
    caixa = np.zeros_like(m)
    caixa[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = True
    sel = maior_componente(m & caixa)

    ys, xs = np.nonzero(sel)
    fx, fy = xs / W, ys / H
    px = xs.astype(float) - xs.mean()
    py = ys.astype(float) - ys.mean()
    w, vec = np.linalg.eigh(np.cov(np.vstack([px, py])))
    eixo = vec[:, int(np.argmax(w))]
    ang = abs(math.degrees(math.atan2(eixo[1], eixo[0])))
    if ang > 90:
        ang = 180 - ang
    # "boca" = ponto da silhueta mais próximo da MIRA (centro exato da tela). É a definição
    # operacional que a VM12 usa; na referência ela cai sempre na ponta do cano.
    k = int(np.argmin((fx - 0.5) ** 2 + (fy - 0.5) ** 2))

    # ── GRIP (ver o bloco GRIP acima) ──────────────────────────────────────────
    gpx, gpy, gdentro, gcomo = GRIP[arquivo]
    gfx, gfy = gpx / W, gpy / H
    # buracos da silhueta: o guarda-mato da M4 sai daqui. Fica no JSON de todos os frames
    # como EVIDÊNCIA (é barato e é o que permite refutar a marca sem confiar nela).
    bur = buracos(sel)
    cy = float(ys.mean() / H)
    abaixo = [b for b in bur if b[2] > cy]
    buracoAuto = [round(abaixo[0][1], 3), round(abaixo[0][2], 3), abaixo[0][0]] if abaixo else None

    if SALVA_MASCARA:
        out = np.asarray(im).copy()
        out[sel] = (out[sel] * 0.35 + np.array([255, 0, 255]) * 0.65).astype(np.uint8)
        p = '/tmp/refmask_' + os.path.splitext(arquivo)[0] + '.png'
        Image.fromarray(out).resize((900, int(900 * H / W)), Image.LANCZOS).save(p)
        print('máscara ->', p)
        # figura de conferência do GRIP: cruz VERDE no ponto marcado, cruz AMARELA na boca,
        # cruz CIANO na mira. OLHE ESTA IMAGEM antes de acreditar no número.
        cf = Image.fromarray(out)
        d = ImageDraw.Draw(cf)
        r = max(4, W // 60)
        def cruz(x, y, cor, larg):
            d.line([(x - r, y), (x + r, y)], fill=cor, width=larg)
            d.line([(x, y - r), (x, y + r)], fill=cor, width=larg)
        cruz(int(gfx * W), min(H - 1, int(gfy * H)), (0, 255, 0), max(2, W // 260))
        cruz(int(fx[k] * W), int(fy[k] * H), (255, 230, 0), max(2, W // 260))
        cruz(W // 2, H // 2, (0, 230, 255), max(1, W // 400))
        if buracoAuto:
            d.ellipse([buracoAuto[0] * W - r, buracoAuto[1] * H - r,
                       buracoAuto[0] * W + r, buracoAuto[1] * H + r], outline=(255, 80, 80), width=max(2, W // 300))
        p2 = '/tmp/refgrip_' + os.path.splitext(arquivo)[0] + '.png'
        cf.resize((1100, int(1100 * H / W)), Image.LANCZOS).save(p2)
        print('grip    ->', p2)

    # LEGIBILIDADE (VM18): eixo da arma = grip marcado -> boca achada acima, em pixel.
    leg = legibilidade(sel, np.array([gfx * (W / H), gfy]), np.array([fx[k] * (W / H), fy[k]]), W, H)

    return {
        'ref': nome,
        'arquivo': arquivo,
        'tamanho': [W, H],
        'aspecto': round(W / H, 3),
        'areaPct': round(100 * int(sel.sum()) / (W * H), 2),
        'bordaEsq': round(float(fx.min()), 3),
        'topo': round(float(fy.min()), 3),
        'baseVisivel': round(float(fy.max()), 3),
        'boca': [round(float(fx[k]), 3), round(float(fy[k]), 3)],
        'anguloEixoGraus': round(ang, 1),
        'cruzaBordaDireita': bool(fx.max() > 0.995),
        'cruzaBordaInferior': bool(fy.max() > 0.995),
        # grip: [x, y] em fração de tela. `gripDentroDoQuadro` False => o y é PISO
        # ("o grip está em y ≥ isto"), porque a arma é cortada pela borda de baixo ali.
        'grip': [round(gfx, 3), round(gfy, 3)],
        'gripPx': [gpx, gpy],
        'gripDentroDoQuadro': gdentro,
        'gripComo': gcomo,
        'buracoAbaixoDoCentro': buracoAuto,
        'legibilidade': leg,
    }


# ── regras de cor, uma por frame ────────────────────────────────────────────────
def ak(a):
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    v = a.max(2)
    escuro = v < 100
    # madeira da AK: vermelha E claramente mais escura que a areia do dust (areia tem v>150
    # e R-B pequeno). Sem o `v<150` a regra vaza para o chão inteiro — foi o primeiro erro.
    madeira = (v < 150) & (R > G + 30) & (G >= B) & (R - B > 55)
    return escuro | madeira


def m4(a):
    v = a.max(2)
    s = a.max(2) - a.min(2)
    return (v < 115) | ((v < 175) & (s < 45))


def vandal(a):
    R, G = a[:, :, 0], a[:, :, 1]
    v = a.max(2)
    # a parede à direita é clara e QUENTE (R>G); a arma é cinza-azulada. Sem o teste de
    # viés quente a máscara engole a parede e reporta 19,8% de área em vez de 13,1%.
    return (v < 120) & (R <= G + 14)


# CORREÇÃO (RODADA DO GRIP): a caixa da AK terminava em y1 = 0,95 e a rodada anterior
# atribuiu a base 0,946 ao HUD do CS 1.6 ("o HUD ocupa a faixa de baixo"). ERRADO — era a
# PRÓPRIA CAIXA cortando. Com y1 = 1,0 a AK vai a base 0,997 e cruza a borda inferior como
# as outras duas. Consequências medidas: areaPct 8,11 -> 9,76, eixo 27,3° -> 28,0°;
# bordaEsq e boca não mudam. Precisou mudar porque a estação do grip da AK está ABAIXO de
# 0,95 — com a caixa antiga, medir o grip nesse frame era impossível por construção.
REFS = [
    ('CS 1.6 — AK47 (de_dust)', 'cs16_ak_dust.jpg', ak, (0.55, 0.42, 1.0, 1.0)),
    ('CS 1.6 — M4A1 (de_dust2)', 'cs16_m4_dust.jpg', m4, (0.45, 0.52, 1.0, 1.0)),
    ('Valorant — Vandal (Ascent)', 'valorant_vandal.jpg', vandal, (0.52, 0.50, 1.0, 1.0)),
]

if __name__ == '__main__':
    res = [medir(*r) for r in REFS]
    faixa = lambda k: (min(r[k] for r in res), max(r[k] for r in res))
    bocaY = [r['boca'][1] for r in res]
    bocaX = [r['boca'][0] for r in res]
    gripY = [r['grip'][1] for r in res]
    gripDentro = [r['grip'][1] for r in res if r['gripDentroDoQuadro']]
    saida = {
        'metodo': 'segmentacao por cor + maior componente conexa; ver docstring',
        'refs': res,
        'faixas': {
            'areaPct': list(faixa('areaPct')),
            'bordaEsq': list(faixa('bordaEsq')),
            'bocaX': [min(bocaX), max(bocaX)],
            'bocaY': [min(bocaY), max(bocaY)],
            'anguloEixoGraus': list(faixa('anguloEixoGraus')),
            'cruzaBordaDireita': all(r['cruzaBordaDireita'] for r in res),
            # gripY: a faixa TODA (com os pisos) e a faixa do que foi MEDIDO DE FATO.
            # Os dois numeros existem porque so 1 dos 3 frames tem o grip dentro do quadro.
            'gripY': [min(gripY), max(gripY)],
            'gripYMedidoDentroDoQuadro': [min(gripDentro), max(gripDentro)] if gripDentro else None,
            'gripForaDoQuadro': sum(1 for r in res if not r['gripDentroDoQuadro']),
            # VM18 — LEGIBILIDADE. Faixas medidas nos 3 frames (ver legibilidade() acima).
            'frenteVisivel': [min(r['legibilidade']['frenteVisivel'] for r in res),
                              max(r['legibilidade']['frenteVisivel'] for r in res)],
            'trasVisivel': [min(r['legibilidade']['trasVisivel'] for r in res),
                            max(r['legibilidade']['trasVisivel'] for r in res)],
            'gordura': [min(r['legibilidade']['gordura'] for r in res),
                        max(r['legibilidade']['gordura'] for r in res)],
        },
        'ressalvas': [
            'AK: a maior parte da coronha e do guarda-mao de MADEIRA fica fora da mascara '
            '(cor perto da areia). areaPct 9,76 e PISO, nao valor exato.',
            'GRIP: so a M4A1 tem o grip DENTRO do quadro (0,916, centro do guarda-mato '
            'achado por busca de buracos). Na AK e na Vandal a arma e cortada pela borda de '
            'baixo na coluna do gatilho e a mao de tiro nao aparece: os y 1,000 sao PISO. '
            'Ou seja: no CS 1.6 e no Valorant a mao que segura a arma esta NA BORDA OU FORA '
            'DA TELA. Ver os PNGs /tmp/refgrip_*.png (--masks).',
            'anguloEixoGraus e o eixo da MASSA (PCA), nao a linha do cano, e depende do '
            'aspecto do frame. Nao comparar direto com anguloCanoGraus do vm-mint-audit.',
            'LEGIBILIDADE (VM18): na AK e na Vandal o grip e PISO, entao o eixo grip->boca '
            'e um piso e a `gordura` das duas e um TETO. O PISO da faixa (0,685) sai da '
            'M4A1, o unico frame com o grip medido DENTRO do quadro — de proposito, e o '
            'numero mais conservador dos tres.',
        ],
    }
    p = os.path.join(HERE, 'ref_viewmodel.json')
    with open(p, 'w') as f:
        json.dump(saida, f, indent=1, ensure_ascii=False)
    for r in res:
        print(f"{r['ref']:<28} asp {r['aspecto']:<6} area {r['areaPct']:>5}%  "
              f"esq {r['bordaEsq']:<6} boca {r['boca']}  eixo {r['anguloEixoGraus']}°  "
              f"cruzaDir {r['cruzaBordaDireita']}  cruzaBaixo {r['cruzaBordaInferior']}")
    print('\nfaixas:', json.dumps(saida['faixas'], ensure_ascii=False))
    print('->', p)
