#!/usr/bin/env python3
"""
ref-ui.py — MEDE AS 9 TELAS DE REFERÊNCIA (references/telas/) DO JEITO QUE O
ref-measure.py MEDE OS FRAMES DE ARMA.

POR QUE ESTE ARQUIVO EXISTE
---------------------------
O dono pediu "melhorias de UI baseadas nas telas do GPT" e, duas rodadas depois,
disse a frase que dispensa relatório: "a melhora de UI não ocorreu". A rodada
anterior consertou 3 defeitos pontuais e escreveu, no cabeçalho do ui-check.mjs,
uma confissão honesta:

    "AS TELAS NÃO EXISTEM NESTA ÁRVORE. `ls references/` devolve só `viewmodel/`."

Agora elas existem (commit e332c87, `references/telas/01..09`). Este arquivo é o que
faltava: em vez de "modernizar o menu" por gosto, MEDE-SE o alvo e comparam-se números.

REGRA QUE VALE AQUI (a mesma do ref-measure.py, palavra por palavra):
    TETO DE INVARIANTE SÓ ENTRA COM PROCEDÊNCIA — arquivo de referência, pixel
    medido, e este script reproduzindo o número. Número sem imagem é opinião.

O QUE ESTE SCRIPT NÃO É: um classificador de layout. Ele não "entende" que aquilo é
um botão. Ele mede quatro famílias de grandeza que se traduzem DIRETO em CSS:
    1. PALETA        — k-means em CIELAB. Sai hex + participação + L*/C*/h°, e daí
                       os PAPÉIS (fundo, painel, acento, tinta alta/média, cor de time).
    2. TIPOGRAFIA    — bandas de texto por projeção de gradiente de L*. A altura da
                       banda é a caixa do glifo; a razão entre bandas é a ESCALA
                       tipográfica que o CSS tem que reproduzir. Mede também o PASSO
                       da lista (distância entre linhas de menu), que é o que dá o
                       "respiro" que o dono chama de moderno.
    3. DENSIDADE     — quanto da tela é scrim/painel e quanto é tinta. É o número que
                       separa "HUD limpo" de "HUD entupido".
    4. ESTRUTURA     — retângulo de scrim por ÂNCORA (5 âncoras do HUD: topo-centro,
                       inferior-esq, inferior-centro, inferior-dir, topo-dir). Medido
                       no arquivo de ALTA RESOLUÇÃO (1672×941), que é o mesmo HUD da
                       tela 05 sem o rótulo e sem a reamostragem.

DOIS CUIDADOS DE INSTRUMENTO (sem eles o script mede o contact sheet, não a UI)
------------------------------------------------------------------------------
(a) RÓTULO DO CONTACT SHEET. Cada um dos 9 PNGs é um RECORTE de uma folha de contato
    e carrega, em cima, a legenda âmbar "NN. NOME DA TELA" — e, nas telas 05 e 06,
    ainda um pedaço da tela vizinha. Se isso entra na conta, o âmbar do rótulo vira
    "cor da UI" e a banda de texto do rótulo vira "o menor tipo do sistema".
    Regra aplicada: acha-se a banda âmbar mais alta cuja borda esquerda esteja em
    x <= 0,30·W e cuja altura seja < 0,05·H; TUDO acima e inclusive ela é descartado.
    A faixa descartada sai no JSON (`rotulo`), pra ninguém ter que confiar em mim.
(b) RESOLUÇÃO. 512×341 é pouco pra medir caixa de glifo: um corpo de 8 px tem erro de
    ±1 px = ±12%. Por isso TODA medida tipográfica sai em FRAÇÃO DA ALTURA e o HUD
    (o único que vira pixel de CSS direto) é medido no 1672×941.

Uso:  python3 tools/eval/ref-ui.py            (escreve tools/eval/ref_ui.json)
      python3 tools/eval/ref-ui.py --masks    (idem + PNGs de conferência em /tmp/refui_*)
"""
import json
import math
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TELAS = os.path.join(ROOT, 'references', 'telas')
SALVA = '--masks' in sys.argv
# o HUD de alta resolução: mesmo frame da tela 05 (ferro velho / "BECO OESTE"), 16:9, sem rótulo
HUD_HD = 'da0914a2-612f-429f-bc4a-d265d8232e7a.png'


# ------------------------------------------------------------------ cor
def srgb_to_linear(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def rgb_to_lab(rgb):
    """sRGB 0..1 -> CIELAB D65. Mesma matriz que o mat_shade.py usa."""
    lin = srgb_to_linear(rgb)
    M = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = lin @ M.T
    wp = np.array([0.95047, 1.0, 1.08883])
    t = xyz / wp
    f = np.where(t > 0.008856, np.cbrt(t), 7.787 * t + 16.0 / 116.0)
    L = 116.0 * f[..., 1] - 16.0
    a = 500.0 * (f[..., 0] - f[..., 1])
    b = 200.0 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], -1)


def lstar(rgb):
    return rgb_to_lab(rgb)[..., 0]


def hexof(rgb):
    v = np.clip(np.round(np.asarray(rgb) * 255), 0, 255).astype(int)
    return '#%02x%02x%02x' % tuple(v)


# ------------------------------------------------------------- componentes
def componentes(m, minimo=1):
    """Componentes 4-conexas com bbox. Sem scipy (o container não tem rede)."""
    lab = np.zeros(m.shape, np.int32)
    cur = 0
    saida = []
    H, W = m.shape
    for j in range(H):
        linha = m[j]
        for i in range(W):
            if linha[i] and lab[j, i] == 0:
                cur += 1
                q = deque([(j, i)])
                lab[j, i] = cur
                n = 0
                y0 = y1 = j
                x0 = x1 = i
                while q:
                    y, x = q.popleft()
                    n += 1
                    if y < y0: y0 = y
                    if y > y1: y1 = y
                    if x < x0: x0 = x
                    if x > x1: x1 = x
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        b, c = y + dy, x + dx
                        if 0 <= b < H and 0 <= c < W and m[b, c] and lab[b, c] == 0:
                            lab[b, c] = cur
                            q.append((b, c))
                if n >= minimo:
                    saida.append({'n': n, 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1})
    return saida


# ------------------------------------------------------------------ paleta
def kmeans_lab(px, k=8, iters=24, semente=7):
    """k-means em CIELAB. Semente FIXA (o número tem que reproduzir entre corridas)."""
    rng = np.random.RandomState(semente)
    # k-means++ enxuto: 1º centro sorteado, resto pelo mais distante ponderado
    c = [px[rng.randint(len(px))]]
    for _ in range(k - 1):
        d = np.min(((px[:, None, :] - np.array(c)[None, :, :]) ** 2).sum(-1), 1)
        p = d / max(d.sum(), 1e-9)
        c.append(px[rng.choice(len(px), p=p)])
    C = np.array(c, float)
    for _ in range(iters):
        d = ((px[:, None, :] - C[None, :, :]) ** 2).sum(-1)
        a = d.argmin(1)
        for i in range(k):
            m = a == i
            if m.any():
                C[i] = px[m].mean(0)
    d = ((px[:, None, :] - C[None, :, :]) ** 2).sum(-1)
    a = d.argmin(1)
    return C, a


def lab_para_rgb_hex(lab):
    """LAB -> sRGB hex (inversa exata da rgb_to_lab; serve pra imprimir o centro)."""
    L, A, B = lab
    fy = (L + 16.0) / 116.0
    fx = fy + A / 500.0
    fz = fy - B / 200.0

    def g(t):
        return t ** 3 if t ** 3 > 0.008856 else (t - 16.0 / 116.0) / 7.787
    xyz = np.array([g(fx) * 0.95047, g(fy) * 1.0, g(fz) * 1.08883])
    M = np.array([[3.2404542, -1.5371385, -0.4985314],
                  [-0.9692660, 1.8760108, 0.0415560],
                  [0.0556434, -0.2040259, 1.0572252]])
    lin = np.clip(xyz @ M.T, 0, 1)
    s = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)
    return hexof(s)


def paleta(rgb, k=8, passo=2):
    """Paleta dominante + papel de cada cor. `passo` subamostra (2 = 1 pixel em 4).

    Cada entrada sai com DOIS hex, e a diferença entre eles não é detalhe:
      `hex`       = centróide do cluster — inclui o antialiasing do glifo, então puxa
                    pro escuro (o âmbar da referência sai #a47826 no centróide);
      `hexNucleo` = média dos pixels do quartil mais CLARO do cluster — é a cor CHEIA,
                    a que vira `--acento` no CSS. Sem essa separação a paleta manda o
                    projeto pintar o botão com a borda borrada do botão da referência."""
    sub = rgb[::passo, ::passo].reshape(-1, 3)
    lab = rgb_to_lab(sub)
    C, a = kmeans_lab(lab, k=k)
    out = []
    for i in range(k):
        m = a == i
        if not m.any():
            continue
        Lc, ac, bc = C[i]
        croma = math.hypot(ac, bc)
        matiz = (math.degrees(math.atan2(bc, ac)) + 360) % 360
        px = lab[m]
        nuc = px[px[:, 0] >= np.percentile(px[:, 0], 75)].mean(0)
        out.append({'hex': lab_para_rgb_hex(C[i]), 'hexNucleo': lab_para_rgb_hex(nuc),
                    'Lnucleo': round(float(nuc[0]), 1),
                    'Cnucleo': round(float(math.hypot(nuc[1], nuc[2])), 1),
                    'share': float(m.mean()),
                    'L': round(float(Lc), 1), 'C': round(float(croma), 1), 'h': round(matiz, 1)})
    out.sort(key=lambda d: -d['share'])
    # PAPÉIS. Regras declaradas (não "eu achei"): cada uma é uma peneira em L*/C*/h°.
    for c in out:
        c['papel'] = None
    def marca(papel, cond, chave):
        cand = [c for c in out if c['papel'] is None and cond(c)]
        if cand:
            sorted(cand, key=chave)[0]['papel'] = papel
    # acento = croma alto na faixa de matiz do âmbar/ouro (h 60-105 em CIELAB)
    marca('acento', lambda c: c['C'] >= 30 and 55 <= c['h'] <= 110, lambda c: -c['share'])
    # fundo = a cor MAIS ESCURA com participação relevante
    marca('fundo', lambda c: c['L'] < 22 and c['share'] >= 0.05, lambda c: c['L'])
    # painel = escura, acima do fundo, ainda quase neutra (é o scrim sobre a arte)
    marca('painel', lambda c: 12 <= c['L'] < 42 and c['C'] < 22, lambda c: -c['share'])
    # tinta alta / média = neutros claros
    marca('tinta_alta', lambda c: c['L'] >= 75 and c['C'] < 18, lambda c: -c['L'])
    marca('tinta_media', lambda c: 45 <= c['L'] < 80 and c['C'] < 18, lambda c: -c['share'])
    # cores de time: vermelho (h~15-45) e violeta (h~280-330) com croma alto.
    # L* >= 22 de propósito: abaixo disso o cluster que casa é o FUNDO da linha do
    # placar (um vinho quase preto), não a cor com que o time é NOMEADO na tela.
    marca('time_quente', lambda c: c['C'] >= 28 and c['L'] >= 22 and (c['h'] < 50 or c['h'] > 350), lambda c: -c['C'])
    marca('time_frio', lambda c: c['C'] >= 20 and c['L'] >= 22 and 250 <= c['h'] <= 340, lambda c: -c['C'])
    return out


# ------------------------------------------------- rótulo do contact sheet
def acha_rotulo(rgb):
    """A legenda âmbar 'NN. NOME' colada no alto-esquerdo do recorte. Devolve a
    ÚLTIMA linha a descartar (tudo <= ela sai), ou -1 se a tela não tiver rótulo."""
    H, W, _ = rgb.shape
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    amb = (r > 0.55) & (g > 0.40) & (b < 0.40) & (r - b > 0.30)
    topo = amb[:int(0.25 * H)]
    comps = componentes(topo, minimo=6)
    cand = [c for c in comps if c['x0'] <= 0.30 * W and (c['y1'] - c['y0']) < 0.05 * H]
    if not cand:
        return -1
    # a legenda é a banda âmbar mais BAIXA do bloco do topo (nas telas 05/06 vem
    # depois de um pedaço da tela vizinha, e é ela que marca o início do conteúdo)
    y1 = max(c['y1'] for c in cand)
    return int(min(y1 + 3, 0.25 * H))


# ------------------------------------------------------------- tipografia
def bandas_texto(rgb, y_ini, limiar=26, nome=None):
    """LINHAS DE TEXTO por componentes de tinta, não por projeção de linha.

    A 1ª versão deste script projetava o gradiente na LARGURA INTEIRA e mediu, no
    01_menu_principal, UMA banda de 108 px de altura: a foto do personagem tem
    gradiente em toda linha, então todas as linhas ficaram 'ativas' e as 7 opções de
    menu viraram um bloco só. É o mesmo erro que o ref-measure.py registra na própria
    docstring (a máscara que vazou pra areia do dust). Aqui o método é local:

      1. tinta   = |∇L*| > limiar, com 1 px de dilatação (fecha o miolo do glifo);
      2. glifos  = componentes com altura entre 3 px e 8% da altura da tela e largura
                   <= 45% da largura — letra/ícone, nunca a silhueta do personagem;
      3. LINHA   = glifos agrupados por SOBREPOSIÇÃO VERTICAL >= 50% e distância
                   horizontal <= 4× a altura do glifo (o espaço entre palavras);
      4. altura da linha = MEDIANA da altura dos glifos dela (a mediana ignora o
         acento do 'Ç' e o ponto do 'i', que estouram a bbox da linha).

    O que sai é a caixa de glifo em pixel — que é o que vira `font-size` no CSS."""
    L = lstar(rgb)
    gx = np.abs(np.diff(L, axis=1, prepend=L[:, :1]))
    gy = np.abs(np.diff(L, axis=0, prepend=L[:1, :]))
    g = np.maximum(gx, gy) > limiar
    if y_ini > 0:
        g[:y_ini] = False
    H, W = g.shape
    d = g.copy()
    d[1:] |= g[:-1]
    d[:, 1:] |= g[:, :-1]
    comps = componentes(d, minimo=4)
    salva_mascara((nome or 'tela') + '_tinta', d)
    gl = [c for c in comps
          if 3 <= (c['y1'] - c['y0'] + 1) <= 0.08 * H and (c['x1'] - c['x0'] + 1) <= 0.45 * W]
    gl.sort(key=lambda c: (c['y0'], c['x0']))
    linhas = []
    for c in gl:
        alt = c['y1'] - c['y0'] + 1
        posto = None
        for ln in linhas:
            sob = min(c['y1'], ln['y1']) - max(c['y0'], ln['y0']) + 1
            if sob >= 0.5 * min(alt, ln['y1'] - ln['y0'] + 1) and c['x0'] - ln['x1'] <= 4 * alt:
                posto = ln
                break
        if posto is None:
            linhas.append({'y0': c['y0'], 'y1': c['y1'], 'x0': c['x0'], 'x1': c['x1'], 'alts': [alt]})
        else:
            posto['y0'] = min(posto['y0'], c['y0'])
            posto['y1'] = max(posto['y1'], c['y1'])
            posto['x0'] = min(posto['x0'], c['x0'])
            posto['x1'] = max(posto['x1'], c['x1'])
            posto['alts'].append(alt)
    saida = []
    for ln in linhas:
        if len(ln['alts']) < 2:      # 1 glifo solto = ícone/ruído, não linha de texto
            continue
        alt = int(np.median(ln['alts']))
        saida.append({'y0': ln['y0'], 'y1': ln['y1'], 'x0': ln['x0'], 'x1': ln['x1'],
                      'alt': alt, 'altFrac': round(alt / H, 4), 'nGlifos': len(ln['alts']),
                      'largFrac': round((ln['x1'] - ln['x0'] + 1) / W, 4),
                      'centroXFrac': round((ln['x0'] + ln['x1']) / 2 / W, 4)})
    saida.sort(key=lambda b: b['y0'])
    return saida


def escala_tipo(bandas, H):
    """Escala tipográfica: bandas de TEXTO (altura < 6% da altura da tela — acima disso
    é logotipo/arte, e o próprio 01 prova: o bloco do logo mede 32% da altura) e o PASSO
    da lista (moda das distâncias entre topos consecutivos de bandas de altura parecida)."""
    txt = [b for b in bandas if b['altFrac'] < 0.06]
    if not txt:
        return None
    alturas = sorted(b['alt'] for b in txt)
    # passo da lista: diferenças entre topos de bandas com a MESMA altura (±1 px)
    passos = []
    for i in range(len(txt) - 1):
        a, b = txt[i], txt[i + 1]
        if abs(a['alt'] - b['alt']) <= 1:
            passos.append(b['y0'] - a['y0'])
    passo = None
    if passos:
        passos.sort()
        passo = passos[len(passos) // 2]
    # menor = MODA da altura de linha (o corpo de texto), não o mínimo absoluto: um
    # sub-rótulo de 1 linha não define o corpo do sistema. maior = a maior linha de texto.
    menor = int(np.bincount(np.array(alturas)).argmax())
    maior = max(alturas)
    return {'menorPx': menor, 'maiorPx': maior,
            'menorFrac': round(menor / H, 4), 'maiorFrac': round(maior / H, 4),
            'razao': round(maior / max(menor, 1), 2),
            'passoListaPx': passo, 'passoListaFrac': round(passo / H, 4) if passo else None,
            'passoSobreCorpo': round(passo / max(menor, 1), 2) if passo else None,
            'nBandas': len(txt)}


# -------------------------------------------------------------- densidade
def densidade(rgb, y_ini):
    """Duas frações, e é a diferença entre elas que interessa:
       scrimFrac = área coberta por painel/scrim (escuro E chapado)
       tintaFrac = área de TINTA (glifo/ícone), medida pelo gradiente
    Um HUD 'limpo' tem tinta baixa; um HUD 'entupido' tem scrim alto."""
    sub = rgb[max(0, y_ini):]
    H, W, _ = sub.shape
    L = lstar(sub)
    k = 7
    def boxsum(m):
        c = np.cumsum(np.cumsum(m, 0), 1)
        c = np.pad(c, ((1, 0), (1, 0)))
        return c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]
    s1 = boxsum(L)
    s2 = boxsum(L * L)
    mu = s1 / (k * k)
    var = np.maximum(0, s2 / (k * k) - mu * mu)
    scrim = (mu < 34) & (var < 26)
    gx = np.abs(np.diff(L, axis=1, prepend=L[:, :1]))
    gy = np.abs(np.diff(L, axis=0, prepend=L[:1, :]))
    tinta = np.maximum(gx, gy) > 22
    return {'scrimFrac': round(float(scrim.mean()), 4), 'tintaFrac': round(float(tinta.mean()), 4)}


# --------------------------------------------------------------- margens
def margens(rgb, y_ini):
    """Margem = distância da borda da tela até o primeiro PIXEL DE UI. 'UI' aqui é
    tinta com contraste local alto (glifo/borda de painel), não arte de fundo: a foto
    do personagem encosta na borda em 01/09 por design, e contá-la daria margem 0."""
    sub = rgb[max(0, y_ini):]
    H, W, _ = sub.shape
    L = lstar(sub)
    gx = np.abs(np.diff(L, axis=1, prepend=L[:, :1]))
    gy = np.abs(np.diff(L, axis=0, prepend=L[:1, :]))
    forte = np.maximum(gx, gy) > 30
    # exige 3 pixels de tinta na mesma linha/coluna: 1 pixel isolado é ruído de JPEG
    lin = forte.sum(1) >= 3
    col = forte.sum(0) >= 3
    ys = np.nonzero(lin)[0]
    xs = np.nonzero(col)[0]
    if not len(ys) or not len(xs):
        return None
    return {'topoFrac': round(float(ys.min()) / H, 4), 'baseFrac': round(float(H - 1 - ys.max()) / H, 4),
            'esqFrac': round(float(xs.min()) / W, 4), 'dirFrac': round(float(W - 1 - xs.max()) / W, 4)}


# ------------------------------------------- estrutura do HUD (alta resolução)
# As 5 ÂNCORAS do HUD de referência. A janela de busca é generosa de propósito: o
# script acha o retângulo DENTRO dela, ele não define onde o retângulo está.
ANCORAS = {
    'topo_centro':    (0.28, 0.00, 0.72, 0.16),
    'topo_direita':   (0.72, 0.00, 1.00, 0.16),
    'inferior_esq':   (0.00, 0.82, 0.35, 1.00),
    'inferior_centro': (0.35, 0.82, 0.65, 1.00),
    # janela mais apertada que as outras, e o motivo é MEDIDO: o viewmodel (a AK de
    # madeira) ocupa a metade inferior-direita, então uma janela larga tem MEDIANA já
    # escura e o limiar por percentil acha "scrim" na coronha. A faixa 0,78-1,00 × 0,80-1,00
    # é onde o painel de munição da referência mora (conferir /tmp/refui_hud_inferior_dir.png).
    'inferior_dir':   (0.78, 0.80, 1.00, 1.00),
}


def scrim_da_ancora(rgb, jan):
    """Retângulo de painel/scrim dentro de uma âncora do HUD.

    DOIS DETECTORES, e o script escolhe pelo NÚMERO, não pelo meu gosto:
      A) 'relativo' — mais ESCURO que o percentil 55 da janela (menos 10 L*) e chapado.
         Funciona onde o painel escurece o fundo (topo, contra o céu).
      B) 'absoluto' — CHAPADO (var < 8) e escuro em absoluto (L* < 45).
         Funciona onde o fundo JÁ é escuro: medido, a janela inferior-direita da
         referência tem mediana L* = 10,0 (é a madeira da AK e a sombra dela), então o
         detector (A) devolve limiar 0 e não acha NADA — foi exatamente o que aconteceu
         na 1ª corrida deste script (`inferior_dir: None`).
    Escolhe-se o que produzir o retângulo mais RETANGULAR (maior preenchimento da bbox),
    porque painel é retângulo e vazamento pra cena não é. O campo `detector` no JSON diz
    qual ganhou, e as duas máscaras vão pra /tmp com --masks."""
    H, W, _ = rgb.shape
    x0, y0, x1, y1 = int(jan[0] * W), int(jan[1] * H), int(jan[2] * W), int(jan[3] * H)
    sub = rgb[y0:y1, x0:x1]
    L = lstar(sub)
    k = 9
    def boxsum(m):
        c = np.cumsum(np.cumsum(m, 0), 1)
        c = np.pad(c, ((1, 0), (1, 0)))
        return c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]
    s1 = boxsum(L)
    s2 = boxsum(L * L)
    mu = s1 / (k * k)
    var = np.maximum(0, s2 / (k * k) - mu * mu)
    def monta(cond):
        m = np.zeros(L.shape, bool)
        m[k // 2:k // 2 + mu.shape[0], k // 2:k // 2 + mu.shape[1]] = cond
        return m
    cands = {
        'relativo': monta((mu < np.percentile(L, 55) - 10) & (var < 90)),
        'absoluto': monta((var < 8) & (mu < 45)),
    }
    melhor = None
    for nome, m in cands.items():
        comps = componentes(m, minimo=int(0.004 * m.size))
        if not comps:
            continue
        # UNIÃO das componentes grandes: o painel do topo vem partido em 3 gomos (é o
        # desenho da referência — 2 placares + o miolo do relógio), e o que interessa é
        # o retângulo do painel INTEIRO.
        comps.sort(key=lambda c: -c['n'])
        grandes = [c for c in comps if c['n'] >= 0.35 * comps[0]['n']]
        bx0 = min(c['x0'] for c in grandes)
        by0 = min(c['y0'] for c in grandes)
        bx1 = max(c['x1'] for c in grandes)
        by1 = max(c['y1'] for c in grandes)
        preench = sum(c['n'] for c in grandes) / max(1, (bx1 - bx0 + 1) * (by1 - by0 + 1))
        r = {'detector': nome, 'gomos': len(grandes), 'preench': round(preench, 3),
             'caixaFrac': [round((bx0 + x0) / W, 4), round((by0 + y0) / H, 4),
                           round((bx1 + x0) / W, 4), round((by1 + y0) / H, 4)],
             'largFrac': round((bx1 - bx0 + 1) / W, 4), 'altFrac': round((by1 - by0 + 1) / H, 4),
             'centroXFrac': round((bx0 + bx1 + 2 * x0) / 2 / W, 4),
             'margemBordaFrac': round(min((bx0 + x0) / W, (W - bx1 - x0) / W,
                                          (by0 + y0) / H, (H - by1 - y0) / H), 4)}
        if melhor is None or preench > melhor[0]:
            melhor = (preench, r, m)
    if melhor is None:
        return None, cands['absoluto']
    # CONFIABILIDADE — a peneira que faltava na 1ª versão. Um retângulo só é PAINEL se
    # existe DEGRAU de luminância na borda dele: dentro escuro, fora claro. Sem isso o
    # detector pode ter achado uma região lisa da CENA — foi exatamente o que aconteceu no
    # `inferior_dir`: a madeira da AK é lisa E escura, e a máscara salva em /tmp mostrou o
    # painel de munição como BURACO no meio da máscara, não como a máscara. Mede-se o L*
    # médio de uma faixa de 6 px logo DENTRO e logo FORA de cada borda; o degrau reportado
    # é o MENOR dos quatro. `confiavel:false` não some do JSON — some das conclusões.
    r = melhor[1]
    Lg = lstar(rgb)
    bx0, by0, bx1, by1 = [int(round(v * (W if i % 2 == 0 else H))) for i, v in enumerate(r['caixaFrac'])]
    f = 6
    def faixa(a, b, c, d):
        a, b = max(0, a), max(0, b)
        s = Lg[b:d, a:c]
        return float(s.mean()) if s.size else float('nan')
    degraus = {
        'topo': faixa(bx0, by0 - f, bx1, by0) - faixa(bx0, by0, bx1, by0 + f),
        'base': faixa(bx0, by1, bx1, by1 + f) - faixa(bx0, by1 - f, bx1, by1),
        'esq': faixa(bx0 - f, by0, bx0, by1) - faixa(bx0, by0, bx0 + f, by1),
        'dir': faixa(bx1, by0, bx1 + f, by1) - faixa(bx1 - f, by0, bx1, by1),
    }
    degraus = {k: (round(v, 1) if v == v else None) for k, v in degraus.items()}
    validos = [v for v in degraus.values() if v is not None]
    r['degrauBordaL'] = degraus
    r['degrauMin'] = round(min(validos), 1) if validos else None
    # "min >= 4" era severo demais e reprovava o painel do topo, que a máscara mostra
    # perfeito: a borda de BAIXO dele encosta em cena escura (degrau 2,8) por acaso do
    # frame. O critério que separa os 5 casos certos é MEDIANA >= 4 E pelo menos uma
    # borda com degrau >= 8 (um painel de verdade tem ao menos um lado contra o céu).
    r['degrauMediana'] = round(float(np.median(validos)), 1) if validos else None
    r['confiavel'] = bool(validos) and float(np.median(validos)) >= 4.0 and max(validos) >= 8.0
    return r, melhor[2]


def salva_mascara(nome, m):
    if not SALVA:
        return
    Image.fromarray((m.astype(np.uint8) * 255)).save('/tmp/refui_%s.png' % nome)


# ------------------------------------------------------------------- main
def main():
    if not os.path.isdir(TELAS):
        print('__ERRO__ references/telas ausente: ' + TELAS)
        return 2
    arquivos = sorted(f for f in os.listdir(TELAS) if f[0].isdigit() and f.endswith('.png'))
    saida = {'gerado': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
             'fonte': {'telas': arquivos, 'hudHD': HUD_HD,
                       'nota': 'os 9 PNGs sao recortes de um contact sheet e carregam legenda ambar; '
                               'a faixa descartada esta em cada tela no campo `rotulo`'},
             'telas': {}, 'hud': {}, 'consenso': {}}

    for f in arquivos:
        im = Image.open(os.path.join(TELAS, f)).convert('RGB')
        rgb = np.asarray(im, float) / 255.0
        H, W, _ = rgb.shape
        yr = acha_rotulo(rgb)
        pal = paleta(rgb[max(0, yr):], k=8)
        bd = bandas_texto(rgb, yr, nome=f[:-4])
        saida['telas'][f[:-4]] = {
            'px': [W, H], 'aspecto': round(W / H, 3),
            'rotulo': {'descartadoAteY': yr, 'fracAltura': round(max(0, yr) / H, 4)},
            'paleta': pal,
            'bandasTexto': bd,
            'escalaTipo': escala_tipo(bd, H),
            'densidade': densidade(rgb, yr),
            'margens': margens(rgb, yr),
        }
        print('%-26s rotulo<=y%-4s bandas=%-3d %s' % (f, yr, len(bd), saida['telas'][f[:-4]]['escalaTipo']))

    # ---- HUD em alta resolução ----
    hud_path = os.path.join(TELAS, HUD_HD)
    if os.path.exists(hud_path):
        im = Image.open(hud_path).convert('RGB')
        rgb = np.asarray(im, float) / 255.0
        H, W, _ = rgb.shape
        saida['hud'] = {'px': [W, H], 'aspecto': round(W / H, 3), 'ancoras': {}}
        for nome, jan in ANCORAS.items():
            r, m = scrim_da_ancora(rgb, jan)
            salva_mascara('hud_' + nome, m)
            saida['hud']['ancoras'][nome] = r
            print('HUD %-16s %s' % (nome, r))
        saida['hud']['paleta'] = paleta(rgb, k=8, passo=3)
        saida['hud']['densidade'] = densidade(rgb, 0)

    # ---- CONSENSO: o que as 9 telas concordam (é ISTO que vira CSS) ----
    def moda_hex(papel, telas):
        cs = []
        for t in telas.values():
            for c in t['paleta']:
                if c['papel'] == papel:
                    cs.append(c)
        if not cs:
            return None
        # média em LAB ponderada pela participação — não "a mais bonita"
        def med_de(chave):
            lab = rgb_to_lab(np.array([[int(c[chave][1:3], 16), int(c[chave][3:5], 16),
                                        int(c[chave][5:7], 16)] for c in cs], float) / 255.0)
            w = np.array([c['share'] for c in cs])
            return (lab * w[:, None]).sum(0) / w.sum()
        med = med_de('hex')
        nuc = med_de('hexNucleo')
        return {'hex': lab_para_rgb_hex(med), 'hexNucleo': lab_para_rgb_hex(nuc),
                'Lnucleo': round(float(nuc[0]), 1),
                'Cnucleo': round(float(math.hypot(nuc[1], nuc[2])), 1), 'n': len(cs),
                'L': round(float(med[0]), 1),
                'C': round(float(math.hypot(med[1], med[2])), 1),
                'h': round((math.degrees(math.atan2(med[2], med[1])) + 360) % 360, 1),
                'amostras': [c['hex'] for c in cs]}

    tl = saida['telas']
    for papel in ('acento', 'fundo', 'painel', 'tinta_alta', 'tinta_media', 'time_quente', 'time_frio'):
        saida['consenso'][papel] = moda_hex(papel, tl)
    escalas = [t['escalaTipo'] for t in tl.values() if t['escalaTipo']]
    saida['consenso']['tipografia'] = {
        'corpoFracMediana': round(float(np.median([e['menorFrac'] for e in escalas])), 4),
        'tituloFracMediana': round(float(np.median([e['maiorFrac'] for e in escalas])), 4),
        'razaoMediana': round(float(np.median([e['razao'] for e in escalas])), 2),
        'passoSobreCorpoMediana': round(float(np.median([e['passoSobreCorpo'] for e in escalas
                                                         if e['passoSobreCorpo']])), 2),
    }
    mg = [t['margens'] for t in tl.values() if t['margens']]
    saida['consenso']['margens'] = {
        'esqFracMediana': round(float(np.median([m['esqFrac'] for m in mg])), 4),
        'dirFracMediana': round(float(np.median([m['dirFrac'] for m in mg])), 4),
        'baseFracMediana': round(float(np.median([m['baseFrac'] for m in mg])), 4),
        'minima': round(float(min(min(m['esqFrac'], m['dirFrac'], m['baseFrac']) for m in mg)), 4),
    }
    saida['consenso']['densidade'] = {
        'scrimFracMediana': round(float(np.median([t['densidade']['scrimFrac'] for t in tl.values()])), 4),
        'tintaFracMediana': round(float(np.median([t['densidade']['tintaFrac'] for t in tl.values()])), 4),
        'tintaFracHud': saida['hud'].get('densidade', {}).get('tintaFrac'),
    }

    with open(os.path.join(HERE, 'ref_ui.json'), 'w') as fh:
        json.dump(saida, fh, indent=1, ensure_ascii=False)
    print('\n--- CONSENSO ---')
    for k, v in saida['consenso'].items():
        print(' %-14s %s' % (k, v if not isinstance(v, dict) or 'hex' not in v
                             else 'centroide %s | NUCLEO %s  L*%s C*%s h%s  (n=%d)'
                             % (v['hex'], v['hexNucleo'], v['L'], v['C'], v['h'], v['n'])))
    print('\nescrito: tools/eval/ref_ui.json')
    return 0


if __name__ == '__main__':
    sys.exit(main())
