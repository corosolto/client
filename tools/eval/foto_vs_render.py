#!/usr/bin/env python3
# ============================================================================
#  foto_vs_render.py — MOTOR DE DESCRITORES ESTRUTURAIS DE IMAGEM
#  (a régua que roda IGUAL numa fotografia real de favela e num frame do jogo)
# ----------------------------------------------------------------------------
#  POR QUE EXISTE
#
#  O dono pediu, com estas palavras: "vamos focar em analisar contra uma
#  fotografia real e fazer a IA entender tudo isso, escala, profundidade,
#  topografia, altura, comprimento, angulo etc".
#
#  Antes disto ninguem conseguia dizer QUANTO os mapas estavam longe de uma
#  favela de verdade — so' "ta feio". Iteracao no escuro por dias. O que existia
#  media o GRAFO 3D (`relevo-check`, `cena-check`): util, mas so' roda em mapa
#  nosso, entao nao ha' como comparar com uma foto. Esta regua mede o PIXEL, e
#  por isso e' a primeira que aceita foto e render na mesma entrada.
#
#  A LICAO QUE ESTE ARQUIVO PAGA (docs/LICOES.md)
#  "Um agente mediu declaracao em vez de resultado e quase mandou regerar 62
#  personagens." Aqui nao ha' nada do motor: nem cena, nem material, nem GLB.
#  Entra PNG/JPG, sai numero. Se a foto e o render passarem pelo mesmo cano, o
#  numero e' comparavel — e so' por isso.
#
# ----------------------------------------------------------------------------
#  NORMALIZACAO — a armadilha mais cara desta regua
#
#  "Meca a figura no tamanho em que ela e' servida." Redimensionar MUDA espectro
#  e histograma de aresta: reamostrar passa um filtro passa-baixa que apaga
#  justamente a banda que o descritor 2 mede. Mas foto (1500-4000 px, aspectos
#  variados) e render (1600x900 fixo) nao sao comparaveis crus. Entao:
#
#   1. ORCAMENTO DE PIXEL IGUAL, aspecto preservado. Cada imagem e' reamostrada
#      (Lanczos, o MESMO filtro nos dois lados) para ~AREA_ALVO pixels, mantendo
#      o aspecto nativo. Nao ha' corte de enquadramento — cortar 16:9 numa foto
#      retrato jogaria fora a altura, que e' o descritor 4.
#   2. O ESPECTRO usa o maior quadrado central reamostrado para LADO_FFT — FFT
#      radial precisa de quadrado para a frequencia ser isotropica.
#   3. TUDO RODA EM DUAS ESCALAS (ver ESCALAS). Se o ranking dos mapas muda
#      entre elas, o numero e' artefato de reamostragem e a regua diz isso em
#      vez de esconder. Esta e' a defesa contra a armadilha, nao uma promessa.
#
#  VIES DECLARADO: reamostrar 4000px -> 950px CONCENTRA detalhe (a foto perde
#  menos energia relativa por pixel do que parece); reamostrar 1600px -> 950px
#  quase nao filtra o render. Ou seja, o render chega ao teste com MAIS da sua
#  banda alta preservada que a foto. Todo achado de "render tem menos detalhe"
#  e' portanto CONSERVADOR: ele sobrevive a um vies que empurra para o lado
#  contrario.
#
#  JPEG 8x8: foto e' JPEG, render e' PNG. O bloco 8x8 do JPEG injeta energia
#  alta falsa e arestas em 0/90 graus. Isso NAO e' tratado por filtro — e'
#  MEDIDO (`jpeg_blocagem`) na resolucao NATIVA, antes de qualquer resize, e
#  reportado junto. Repare na direcao: blocagem INFLA o eixo 0/90 da foto, que
#  e' exatamente o descritor no qual acusamos o render de ser pior. Logo ela
#  tambem so' pode ENFRAQUECER nosso achado, nunca fabrica-lo.
#
# ----------------------------------------------------------------------------
#  NAO SABER MEDIR CUSTA O MESMO QUE ESTAR ERRADO
#  Nenhum descritor devolve `null` com cara de fato (a licao do `gen-docs`, que
#  publicou "MIT" num repo AGPL por devolver null e seguir em frente). Quando um
#  descritor nao se aplica (ex.: foto sem ceu -> a linha do ceu nao existe), o
#  campo sai como NaN E o campo `_indef` lista o nome do descritor. Quem consome
#  conta os indefinidos e mostra na tabela.
# ============================================================================

import json
import math
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

# --- constantes de normalizacao ---------------------------------------------
# Duas escalas: a regua roda inteira nas duas e o consumidor compara o ranking.
# 0,55 MP e' ~ a area de um frame 990x556; 0,25 MP ~ 670x376. A escolha e'
# arbitraria em valor absoluto e NAO precisa ser "certa" — o que precisa ser
# verdade e' o ranking sobreviver a troca, e isso e' testado, nao assumido.
ESCALAS = {'a': dict(area=550_000), 'b': dict(area=250_000), 'n': dict(area=1_440_000)}

# Tolerancia do "eixo" no histograma de orientacao. +-10 graus e' a largura
# padrao; a sensibilidade em +-7,5 e +-15 sai junto para que ninguem precise
# acreditar no 10.
TOL_EIXO = (7.5, 10.0, 15.0)

# Limiar de "superficie chapada" herdado da medicao anterior desta base
# ("92,6% dos blocos do chao com desvio < 2,0"): mesmo conceito, MESMO limiar,
# para que os dois numeros continuem comparaveis. Regra do diretorio: quem mede
# a mesma coisa compartilha o limiar.
SD_CHAPADO = 2.0


# ============================================================================
#  MASCARA DE SOBREPOSICAO (HUD + VIEWMODEL) — so' para frame de jogo
#
#  A foto nao tem arma na mao nem HUD; o nosso frame tem os dois, e eles NAO
#  sao ambiente. O revolver ocupa cerca de um TERCO do quadro, e ele e' um GLB
#  bem texturizado: deixado no calculo, ele EMPRESTA detalhe e aresta obliqua ao
#  mapa, ou seja, faz o mapa parecer melhor do que e' exatamente no descritor em
#  que estamos piores. O HUD faz o contrario — chapado e alinhado ao eixo.
#
#  Os retangulos de HUD vem do MESMO conceito ja' codificado em
#  `tools/eval/r2_audit.py` (`HUD_RECTS`), ampliados para cobrir o prompt de
#  "[E] PEGAR ..." e a barra de captura da CTF. O retangulo do VIEWMODEL foi
#  medido no frame `game-quebrada-169-a.png`: o revolver vai de x~900/1600 a
#  x~1450/1600 e de y~450/900 ate' a base. A caixa e' GENEROSA de proposito —
#  arma diferente ocupa area diferente, e sobrar mascara custa area de medida,
#  enquanto faltar mascara custa a validade do numero.
#
#  TENTATIVA DESCARTADA: derivar a mascara pela variancia do pixel entre mapas
#  (o que fica igual em mapas diferentes seria a sobreposicao). Nao funcionou —
#  o percentil 5 da variancia ainda deu 29,6 de 255, porque o viewmodel LE' o
#  env do mapa e balanca com o bob, entao ele nao e' constante coisa nenhuma.
# ============================================================================
UI_RECTS = [
    (0.00, 0.00, 0.15, 0.23),   # radar
    (0.26, 0.00, 0.75, 0.14),   # placar / relogio / barra de captura
    (0.90, 0.00, 1.00, 0.09),   # icones canto superior direito
    (0.00, 0.78, 0.32, 1.00),   # HP + prompt "[E] PEGAR ..."
    (0.75, 0.83, 1.00, 1.00),   # municao + nome da arma
    (0.46, 0.44, 0.54, 0.56),   # mira
    (0.50, 0.42, 1.00, 1.00),   # VIEWMODEL (medido no quebrada-169-a)
]


def mascara_ui(h: int, w: int) -> np.ndarray:
    m = np.zeros((h, w), bool)
    for x0, y0, x1, y1 in UI_RECTS:
        m[int(y0 * h):int(math.ceil(y1 * h)), int(x0 * w):int(math.ceil(x1 * w))] = True
    return m


def _srgb_para_lab(rgb: np.ndarray):
    """CIELAB (D65) completo. L* e' perceptualmente uniforme — 1 unidade vale o
    mesmo no escuro e no claro, que e' o que faz `SD_CHAPADO` significar algo.
    b* entra porque ceu azul nem sempre e' claro (ver `mascara_ceu`)."""
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    X = lin[..., 0] * 0.4124564 + lin[..., 1] * 0.3575761 + lin[..., 2] * 0.1804375
    Y = lin[..., 0] * 0.2126729 + lin[..., 1] * 0.7151522 + lin[..., 2] * 0.0721750
    Z = lin[..., 0] * 0.0193339 + lin[..., 1] * 0.1191920 + lin[..., 2] * 0.9503041
    e, k = 216 / 24389, 24389 / 27
    fx, fy, fz = (np.where(t > e, np.cbrt(t), (k * t + 16) / 116)
                  for t in (X / 0.95047, Y, Z / 1.08883))
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def _srgb_para_lab_L(rgb: np.ndarray) -> np.ndarray:
    return _srgb_para_lab(rgb)[0]


def _abrir(caminho: str):
    im = Image.open(caminho)
    im.draft(None, None)  # nao deixa o PIL decodificar JPEG em escala reduzida
    return im.convert('RGB')


def _preparar(im: Image.Image, area: int):
    """Reamostra para ~`area` pixels preservando aspecto. Lanczos nos dois lados."""
    w, h = im.size
    s = math.sqrt(area / (w * h))
    nw, nh = max(64, int(round(w * s))), max(64, int(round(h * s)))
    return im.resize((nw, nh), Image.LANCZOS)


# ============================================================================
#  DESCRITOR 1 — ORIENTACAO DE ARESTA
#  O que o dono apontou primeiro: "favela real tem aresta em muitos angulos; o
#  nosso tem quase so' 0 e 90". No grafo 3D isso ja' estava medido —
#  `fy_campomorro` e `piscina_treta` com 1 angulo distinto e 0% de massa girada
#  contra 46 angulos e 34% da `quebrada`. Esta funcao tem de reproduzir a mesma
#  ORDEM a partir do pixel; se nao reproduzir, a regua nao presta e o relatorio
#  diz isso.
#
#  RESSALVA HONESTA: perspectiva gira aresta. Uma caixa perfeitamente alinhada
#  aos eixos do mundo projeta linhas de fuga obliquas na tela. Entao o valor de
#  pixel NUNCA vai bater com o valor de grafo — o que tem de bater e' a ORDEM
#  entre mapas. Verticais continuam verticais (camera sem roll), e e' dai' que
#  vem o excesso de massa em 90 graus.
# ============================================================================
def d1_orientacao(L: np.ndarray, ceu: np.ndarray) -> dict:
    gy, gx = np.gradient(ndimage.gaussian_filter(L, 1.0))
    mag = np.hypot(gx, gy)
    # fora do ceu: a linha do ceu e' uma aresta REAL, mas contar a borda de uma
    # nuvem como "aresta da arquitetura" mistura duas coisas diferentes
    solo = ~ndimage.binary_dilation(ceu, iterations=2)
    mag = mag * solo
    corte = np.percentile(mag[solo], 80.0) if solo.sum() > 500 else np.percentile(mag, 80.0)
    m = (mag > corte) & solo
    if m.sum() < 200:
        return {'_indef': ['orientacao'], 'orient_entropia': float('nan'),
                'obliqua_10': float('nan')}
    # orientacao da ARESTA = gradiente + 90 graus, dobrada em [0,180)
    ang = (np.degrees(np.arctan2(gy[m], gx[m])) + 90.0) % 180.0
    peso = mag[m]
    hist, _ = np.histogram(ang, bins=180, range=(0, 180), weights=peso)
    total = hist.sum()
    p = hist / total
    ent = float(-(p[p > 0] * np.log(p[p > 0])).sum() / np.log(180))
    eixo = np.zeros(180, bool)
    graus = np.arange(180)
    out = {'orient_entropia': ent}
    for tol in TOL_EIXO:
        d0 = np.minimum(graus, 180 - graus)      # distancia ate' 0/180 (horizontal)
        d90 = np.abs(graus - 90)                  # distancia ate' 90 (vertical)
        eixo = (d0 <= tol) | (d90 <= tol)
        out[f'obliqua_{tol:g}'.replace('.', '_')] = float(1.0 - p[eixo].sum())
    # "angulos distintos": bins de 5 graus que carregam >=1% da massa
    h5, _ = np.histogram(ang, bins=36, range=(0, 180), weights=peso)
    out['angulos_distintos'] = int((h5 / h5.sum() >= 0.01).sum())
    return out


# ============================================================================
#  DESCRITOR 2 — ESPECTRO DE DETALHE
#  Foto real cai ~1/f de forma CONTINUA. CG chapado tem buraco nas MEDIAS
#  frequencias: a silhueta (baixa) existe, o ruido de borda (alta) existe, e
#  falta o meio — que e' onde mora tijolo, telha, sujeira, remendo. Isso
#  quantifica "sem textura" sem precisar saber qual textura falta.
#
#  DUAS LEITURAS, e a segunda so' existe porque a primeira versao desta funcao
#  estava confundida:
#
#   `espectro_incl` — inclinacao log-log de todo o perfil radial. Foto de
#      favela mede ~-1,9; render chapado mede ~-2,8. Quanto mais negativo,
#      mais rapido o detalhe morre com a frequencia.
#
#   `meio_sobre_baixa_db` — energia da banda MEDIA dividida pela da banda
#      BAIXA, em dB. E' a leitura que responde "falta o MEIO?" sem depender de
#      quanto a imagem tem de silhueta. A PRIMEIRA versao ajustava uma reta na
#      banda baixa e extrapolava para a media; isso media desvio da imagem em
#      relacao a' propria tendencia, e como a tendencia do render ja' e' muito
#      mais inclinada, o render saia com "deficit" NEGATIVO (-2,4 dB) — ou
#      seja, o numero dizia que o render tinha meio DE SOBRA. Estava medindo
#      forma de curva, nao falta de detalhe. Razao media/baixa e' direta:
#      normaliza pelo conteudo de baixa frequencia (a silhueta, que os dois
#      tem) e sobra exatamente a banda do tijolo e da telha.
# ============================================================================
#  PIRAMIDE MASCARADA, NAO FFT. A primeira versao usava FFT radial num quadrado
#  central. Nao serviu, e o proprio numero denunciou: `ceu_na_janela` mostrou
#  que no frame 16:9 do jogo o MELHOR quadrado possivel ainda continha 34% a 54%
#  de ceu/HUD. Nao existe quadrado limpo num quadro 16:9 com ceu em cima e arma
#  embaixo — ou seja, metade do "espectro do mapa" era o espectro de um degrade
#  de ceu. FFT nao sabe descartar pixel; piramide laplaciana sabe, porque a
#  energia de cada oitava pode ser calculada SO' nos pixels validos.
#
#  A mascara desce junto com a piramide e e' EROODIDA a cada nivel: pixel
#  vizinho de ceu tem a resposta do filtro contaminada pelo ceu mesmo estando
#  fora dele.
#
#  Oitava k = detalhe de ~2^k pixels. Como foto e render sao normalizados para o
#  MESMO orcamento de pixel, a oitava k significa a mesma fracao do quadro nos
#  dois — e' isso que torna a comparacao legitima.
OIT_BAIXA = (3, 5)   # estrutura grande: massa de predio, silhueta
OIT_MEDIA = (1, 2)   # tijolo, telha, janela, remendo — a banda que some no CG
OIT_ALTA = (0, 0)    # granulacao fina


# Numero FIXO de oitavas. Nao pode ser "quantas couberem": o frame do jogo perde
# metade da area para ceu+HUD, entao ele fica sem pixel valido um nivel ANTES da
# foto — e uma contagem livre mediria tamanho de mascara disfarcada de riqueza de
# escala (a primeira versao dava 6 oitavas na foto e 5 no render por isso, e
# quando um nivel saia NaN o `e.max()` contaminado zerava a contagem inteira,
# imprimindo "0 oitavas" para o loja_h). Cinco niveis cabem nos dois lados.
NIVEIS = 5


def d2_espectro(L: np.ndarray, valido: np.ndarray) -> dict:
    cur = L.astype(np.float64)
    msk = valido.copy()
    en = []
    for _ in range(NIVEIS):
        if min(cur.shape) < 16:
            break
        borr = ndimage.gaussian_filter(cur, 1.6)
        m = ndimage.binary_erosion(msk, iterations=3)
        if m.sum() < 100:
            break
        en.append(float(np.mean((cur - borr)[m] ** 2)))
        cur = borr[::2, ::2]
        msk = msk[::2, ::2]
    e = np.array(en, dtype=float)
    # exige os NIVEIS completos e finitos: medir 3 oitavas aqui e 5 ali e chamar
    # os dois de "espectro" e' o tipo de silencio que esta base ja' pagou caro
    if len(e) < NIVEIS or not np.all(np.isfinite(e)) or np.any(e <= 0):
        return {'_indef': ['espectro'], 'espectro_incl': float('nan'),
                'meio_sobre_baixa_db': float('nan'), 'alta_sobre_baixa_db': float('nan'),
                'escala_entropia': float('nan')}
    k = np.arange(len(e))
    incl = float(np.polyfit(k, np.log10(e), 1)[0])  # queda por oitava, em decadas
    faixa = lambda t: float(np.mean(np.log10(e[t[0]:t[1] + 1])))  # noqa: E731
    b = faixa(OIT_BAIXA)
    p = e / e.sum()
    return {'espectro_incl': incl,
            'meio_sobre_baixa_db': float(10.0 * (faixa(OIT_MEDIA) - b)),
            'alta_sobre_baixa_db': float(10.0 * (faixa(OIT_ALTA) - b)),
            # descritor 5 (escala) sai da MESMA piramide. A contagem de oitavas
            # foi CORTADA: com NIVEIS fixo ela mede 5 em toda imagem, foto ou
            # render, ou seja, e' constante por construcao. Sobrou a entropia,
            # que diz se a energia se espalha pelas escalas ou se concentra numa.
            'escala_entropia': float(-(p[p > 0] * np.log(p[p > 0])).sum() / np.log(len(e)))}


def d2b_blocagem_jpeg(L_nativo: np.ndarray) -> float:
    """Artefato de bloco 8x8 medido na resolucao NATIVA (depois do resize ele
    ja' nao existe na mesma fase). Razao entre o degrau medio NAS bordas de
    bloco e o degrau medio FORA delas. ~1,0 = sem blocagem."""
    d = np.abs(np.diff(L_nativo, axis=1))
    col = np.arange(d.shape[1])
    borda = (col % 8) == 7
    if borda.sum() < 4 or (~borda).sum() < 4:
        return float('nan')
    fora = d[:, ~borda].mean()
    return float(d[:, borda].mean() / fora) if fora > 1e-6 else float('nan')


# ============================================================================
#  DESCRITOR 3 — PROFUNDIDADE / CAMADAS
#  Duas aproximacoes, porque nenhuma e' obviamente certa e a regra deste
#  diretorio e' cortar o descritor que nao separar em vez de defende-lo:
#
#   (a) `juncao_dens` — densidade de JUNCAO: janela onde 3+ orientacoes de
#       aresta se encontram. Onde um plano tapa outro nasce junção-T; cena com
#       muitas camadas tem muitas. Cena com 3 caixas tem poucas.
#   (b) `contraste_espalh` — espalhamento (desvio do log) do contraste local
#       por bloco. Cena profunda REAL tem parede perto nitida e fundo lavado
#       pela nevoa no mesmo quadro, entao o contraste local varia muito. Cena
#       chapada tem contraste quase igual em tudo.
#
#  Qual das duas presta e' decidido pela separacao medida, nao aqui.
# ============================================================================
def d3_camadas(L: np.ndarray, ceu: np.ndarray) -> dict:
    gy, gx = np.gradient(ndimage.gaussian_filter(L, 1.0))
    mag = np.hypot(gx, gy)
    ang = (np.degrees(np.arctan2(gy, gx)) + 90.0) % 180.0
    solo = ~ndimage.binary_dilation(ceu, iterations=2)
    corte = np.percentile(mag[solo], 80.0) if solo.sum() > 500 else np.percentile(mag, 80.0)
    forte = (mag > corte) & solo
    J = 16  # janela de juncao
    h, w = L.shape
    nj = ni = 0
    for y in range(0, h - J, J):
        for x in range(0, w - J, J):
            if solo[y:y + J, x:x + J].mean() < 0.7:  # bloco majoritariamente ceu
                continue
            sel = forte[y:y + J, x:x + J]
            if sel.sum() < 12:
                continue
            ni += 1
            hh, _ = np.histogram(ang[y:y + J, x:x + J][sel], bins=12, range=(0, 180),
                                 weights=mag[y:y + J, x:x + J][sel])
            if hh.max() <= 0:
                continue
            if (hh / hh.max() >= 0.35).sum() >= 3:  # 3+ orientacoes coexistindo
                nj += 1
    juncao = float(nj / ni) if ni >= 20 else float('nan')

    B = 32
    sds = []
    for y in range(0, h - B, B):
        for x in range(0, w - B, B):
            if solo[y:y + B, x:x + B].mean() < 0.7:
                continue
            sds.append(L[y:y + B, x:x + B].std())
    sds = np.array(sds)
    sds = sds[sds > 0.05]
    espalh = float(np.std(np.log10(sds))) if len(sds) >= 20 else float('nan')
    ind = [k for k, v in (('juncao', juncao), ('contraste_espalh', espalh)) if not np.isfinite(v)]
    r = {'juncao_dens': juncao, 'contraste_espalh': espalh}
    if ind:
        r['_indef'] = ind
    return r


# ============================================================================
#  DESCRITOR 4 — ALTURA E SILHUETA
#  Onde a linha do ceu corta o quadro, e o quanto ela e' serrilhada. Nas fotos
#  a massa construida sobe 3-4 lajes e a silhueta e' picotada por caixa d'agua,
#  antena, laje meia-feita. No nosso o topo e' baixo e reto. O grafo 3D ja'
#  dizia `h90` de 4,1 a 9,6 m contra 9-12 m das fotos; aqui e' o mesmo fato
#  visto do pixel.
#
#  MEDIR CEU E' O PONTO FRAGIL. Ceu = claro, liso e ligado ao topo do quadro.
#  Foto sem ceu (beco fechado, contra-plongee) NAO tem linha do ceu: nesse caso
#  a linha sai NaN e o nome entra em `_indef` — nunca 0, que mentiria de "ceu
#  colado no chao".
# ============================================================================
def mascara_ceu(L: np.ndarray, b: np.ndarray = None) -> np.ndarray:
    """Ceu = claro, liso e LIGADO ao topo do quadro. Devolve a mascara booleana.

    ISTO E' PRE-REQUISITO DOS OUTROS DESCRITORES, NAO SO' DO 4. O ceu e' uma
    regiao grande, chapada e sem textura — e por isso ele SEQUESTRA qualquer
    estatistica de superficie, de espectro ou de aresta calculada no quadro
    inteiro. O efeito foi medido, nao suposto: na primeira rodada a `foto_008`
    (favela num morro sob ceu aberto) mediu `superf_chapada` = 0,91 — tao
    chapada quanto os nossos piores mapas — enquanto a `foto_063` (beco fechado,
    sem ceu) mediu 0,04. As duas sao fotografia real de favela. O descritor nao
    estava lendo qualidade de superficie: estava lendo QUANTO CEU tem no
    enquadramento.

    Sem esta mascara, comparar uma foto com 40% de ceu a um render com 25% mede
    a diferenca de enquadramento e chama isso de diferenca de acabamento.
    """
    h, w = L.shape
    liso = ndimage.uniform_filter(L ** 2, 7) - ndimage.uniform_filter(L, 7) ** 2
    liso = np.sqrt(np.maximum(liso, 0))
    # CLARO **ou** AZUL. So' "claro" perde ceu azul saturado: na `foto_032` o
    # ceu e' azul forte e o chao e' claro, entao o ceu ficava ABAIXO do
    # percentil 70 de L* e a mascara saia vazia (ceu_frac = 0,00 num quadro com
    # ceu em metade da area). b* < -8 pega azul sem pegar parede clara.
    azul = (b < -8.0) if b is not None else np.zeros_like(L, bool)
    cand = ((L > np.percentile(L, 70)) | azul) & (liso < 3.0)
    rot, n = ndimage.label(cand)
    ceu = np.zeros_like(cand)
    if n:
        topo = set(np.unique(rot[:max(2, h // 100), :])) - {0}
        for r in topo:
            ceu |= rot == r
    return ceu


def d4_silhueta(L: np.ndarray, ceu: np.ndarray, sobrep: np.ndarray) -> dict:
    h, w = L.shape
    # fracao de ceu sobre a area VISIVEL do mundo (fora do HUD/viewmodel), nao
    # sobre o quadro inteiro — senao o tamanho do HUD entra no numero do ceu
    livre = ~sobrep
    frac = float(ceu[livre].mean()) if livre.sum() > 100 else float('nan')
    # SEM CEU SUFICIENTE NAO EXISTE LINHA DO CEU. Com 0,7% de ceu a "linha"
    # e' quase toda zero e o serrilhado sai artificialmente BAIXO — foi assim
    # que a primeira rodada mediu a foto c027 (6,6% de ceu) como mais LISA que
    # o render (25%), invertendo o descritor. O piso de 2% nao e' cosmetico:
    # abaixo dele a grandeza nao existe e o campo tem de sair indefinido.
    if frac < 0.02:
        return {'_indef': ['silhueta'], 'ceu_frac': frac,
                'linha_media': float('nan'), 'linha_serrilha': float('nan')}
    # para cada coluna, ate' onde o ceu desce contiguamente a partir do topo
    linha = np.zeros(w)
    for x in range(w):
        col = ceu[:, x]
        i = 0
        while i < h and col[i]:
            i += 1
        linha[x] = i
    ln = linha / h
    return {'ceu_frac': frac,
            'linha_media': float(ln.mean()),
            'linha_serrilha': float(np.abs(np.diff(ln)).mean() * 100.0)}


# ============================================================================
#  DESCRITOR 5 — ESCALA / TAMANHO DE FEICAO
#  Piramide laplaciana: quanta energia mora em cada oitava. Foto real cobre
#  varias ordens de grandeza ao mesmo tempo (tijolo E janela E laje E morro);
#  o nosso cobre uma. `escala_oitavas` conta as oitavas que carregam >=10% da
#  oitava mais forte; `escala_entropia` e' o mesmo fato de forma continua.
#
#  ATENCAO A REDUNDANCIA: isto e' parente proximo do descritor 2 (as duas
#  olham distribuicao de energia por frequencia). A correlacao entre os dois e'
#  medida pelo consumidor e reportada; descritor redundante vale menos que
#  descritor cego, mas ainda assim polui a tabela.
# ============================================================================
# (descritor 5 foi absorvido por `d2_espectro`: as duas grandezas saem da mesma
#  piramide laplaciana e manter duas passadas separadas so' produzia numero
#  redundante. A versao anterior, nao mascarada, media 6 oitavas em TODA imagem
#  — foto e render — e por isso saia com AUC 0,50: cega por construcao.)


# ============================================================================
#  DESCRITOR 6 — CONTRASTE INTERNO DE SUPERFICIE
#  Desvio de L* DENTRO de blocos que caem numa superficie so'. Blocos que
#  pegam aresta sao DESCARTADOS (o degrau entre duas superficies nao e'
#  textura da superficie) — sem esse descarte o descritor mediria silhueta de
#  novo em vez de sujeira de parede.
#
#  `superf_chapada` usa `SD_CHAPADO` = 2,0, o MESMO limiar da medicao anterior
#  desta base ("92,6% dos blocos do chao com desvio < 2,0"), para que os dois
#  numeros continuem falando a mesma lingua.
# ============================================================================
def d6_superficie(L: np.ndarray, ceu: np.ndarray) -> dict:
    gy, gx = np.gradient(ndimage.gaussian_filter(L, 1.0))
    mag = np.hypot(gx, gy)
    solo = ~ndimage.binary_dilation(ceu, iterations=2)
    B = 16
    h, w = L.shape
    sds, ar = [], []
    for y in range(0, h - B, B):
        for x in range(0, w - B, B):
            # bloco de ceu NAO e' superficie construida. Sem este descarte o
            # descritor mede tamanho do ceu (ver `mascara_ceu`).
            if solo[y:y + B, x:x + B].mean() < 0.7:
                continue
            sds.append(L[y:y + B, x:x + B].std())
            ar.append(mag[y:y + B, x:x + B].mean())
    sds, ar = np.array(sds), np.array(ar)
    if len(sds) < 30:
        return {'_indef': ['superficie'], 'superf_sd': float('nan'),
                'superf_chapada': float('nan')}
    manter = ar <= np.percentile(ar, 60.0)  # 60% mais lisos = "uma superficie so'"
    s = sds[manter]
    return {'superf_sd': float(np.median(s)),
            'superf_chapada': float((s < SD_CHAPADO).mean())}


# ============================================================================
def descrever(caminho: str, escala: str = 'a', ui: bool = False) -> dict:
    cfg = ESCALAS[escala]
    im = _abrir(caminho)
    nat = np.asarray(im, dtype=np.float64) / 255.0
    L_nat = _srgb_para_lab_L(nat)

    pe = _preparar(im, cfg['area'])
    rgb = np.asarray(pe, dtype=np.float64) / 255.0
    L, _a, bb = _srgb_para_lab(rgb)
    ceu = mascara_ceu(L, bb)
    # a sobreposicao entra na MESMA mascara do ceu: os dois sao "nao e' ambiente
    # construido", e todos os descritores ja' sabem descartar isso. A janela da
    # FFT tambem desliza para longe dela.
    # CEU e SOBREPOSICAO ficam SEPARADOS de proposito. Juntar os dois numa
    # mascara so' foi um defeito real desta regua: `ceu_frac` passou a contar o
    # HUD como ceu e os mapas mediram 0,48-0,71 contra 0,15 das fotos, com AUC
    # 1,00 — um achado que parecia forte e era, em boa parte, "o nosso frame tem
    # HUD e a foto nao". Os dois entram juntos no que se DESCARTA (`valido`),
    # mas a fracao de ceu e' medida sobre a area NAO coberta pelo HUD.
    sobrep = mascara_ui(*L.shape) if ui else np.zeros_like(ceu)
    valido = ~(ceu | sobrep)

    out = {'arquivo': caminho, 'escala': escala,
           'px_nativo': list(im.size), 'px_medido': list(pe.size),
           'frac_util': float(valido.mean())}
    ind = []
    for parte in (d1_orientacao(L, ceu | sobrep), d2_espectro(L, valido),
                  d3_camadas(L, ceu | sobrep), d4_silhueta(L, ceu, sobrep),
                  d6_superficie(L, ceu | sobrep)):
        ind += parte.pop('_indef', [])
        out.update(parte)
    out['jpeg_blocagem'] = d2b_blocagem_jpeg(L_nat)
    out['_indef'] = ind
    return out


# ============================================================================
#  MUTANTES — o teste do teste
#  Regua sem mutacao nao vale nada: sem isso nao se sabe se ela MEDE, so' que
#  ela IMPRIME. Cada mutante degrada uma FOTO REAL num eixo so' e a regua tem
#  de mover o descritor certo na direcao certa.
#
#  E cada mutante VERIFICA QUE APLICOU (`assert` no fim). A licao e' literal:
#  nesta base ja' se plantou um mutante com um `replace` que nao casou, o check
#  ficou verde, e por um instante isso pareceu "o guarda funciona". Mutante
#  decorativo e' pior que nenhum — da' confianca falsa POR ESCRITO.
# ============================================================================
def mutar(caminho: str, destino: str) -> list:
    im = _abrir(caminho)
    a0 = np.asarray(im, dtype=np.float64)
    feitos = []

    def grava(nome, arr, esperado):
        arr = np.clip(arr, 0, 255).astype(np.uint8)
        assert not np.array_equal(arr, a0.astype(np.uint8)), f'MUTANTE {nome} NAO APLICOU'
        p = f'{destino}/mut_{nome}.png'
        Image.fromarray(arr).save(p)
        feitos.append({'nome': nome, 'caminho': p, 'espera': esperado})

    # 1. BORRAR: mata detalhe fino. Espera espectro mais inclinado, menos
    #    energia media, superficie mais chapada.
    grava('borrado', np.stack([ndimage.gaussian_filter(a0[..., c], 3.0) for c in range(3)], -1),
          'espectro_incl mais negativo; meio_sobre_baixa_db cai; superf_chapada sobe')

    # 2. ACHATAR: puxa cada pixel para a media local -> mata contraste DENTRO
    #    da superficie sem mexer na silhueta (as arestas fortes sobrevivem).
    med = np.stack([ndimage.uniform_filter(a0[..., c], 9) for c in range(3)], -1)
    grava('achatado', med + (a0 - med) * 0.15,
          'superf_sd cai; superf_chapada sobe; contraste_espalh cai')

    # 3. GIRAR 30 GRAUS: nao tira nem poe detalhe — so' RODA o histograma de
    #    orientacao. A massa que a foto tinha em 0/90 (prumo e laje) sai do
    #    eixo, entao `obliqua_*` TEM de subir. E' o mutante que prova que o
    #    descritor 1 le' angulo, e nao qualquer outra coisa correlacionada.
    g = np.asarray(Image.fromarray(a0.astype(np.uint8)).rotate(30, resample=Image.BICUBIC,
                                                              expand=False), dtype=np.float64)
    h, w = g.shape[:2]
    m = int(min(h, w) * 0.28)  # corta o canto preto que a rotacao cria
    grava('girado30', g[m:h - m, m:w - m], 'obliqua_10 sobe (massa sai do eixo 0/90)')

    # 4. PAR DE BANDA: reduz e volta ao tamanho, com dois fatores. E' o mutante
    #    feito sob medida para o descritor 2 — e ele vem em PAR de proposito,
    #    para provar que o descritor RESOLVE banda em vez de so' reagir a
    #    "imagem mais lisa":
    #      k=4  -> corta so' acima de ~130 c/img: mexe em `alta`, NAO em `meio`
    #      k=10 -> corta a partir de ~50 c/img: derruba `meio` em ~11 dB
    #    Se os dois movessem as duas bandas juntas, o descritor estaria medindo
    #    borrao generico e as bandas seriam decorativas.
    #
    #    O k=10 e' CALIBRADO, nao escolhido: a primeira versao usava k=4 para
    #    matar "o meio" e movia `meio_sobre_baixa_db` em +0,06 dB — mutante
    #    decorativo, do tipo que da' confianca falsa por escrito. A medicao do
    #    corte real (f>128 no quadrado de 512) mostrou que k=4 caia' na banda
    #    ALTA. O k subiu ate' o corte cair DENTRO da banda media.
    for nome, k, esp in (('alta_morta', 4, 'alta_sobre_baixa_db cai; meio_sobre_baixa_db ~intacto'),
                         ('meio_morto', 10, 'meio_sobre_baixa_db cai forte (~-11 dB)')):
        pk = im.resize((max(8, im.size[0] // k), max(8, im.size[1] // k)), Image.LANCZOS)
        grava(nome, np.asarray(pk.resize(im.size, Image.LANCZOS), dtype=np.float64), esp)

    # 5. CONTROLE POSITIVO SINTETICO: grade de retangulos chapados alinhada aos
    #    eixos, sem textura. E' o pior caso teorico — se algum mapa nosso
    #    chegar perto disto, o problema nao e' de acabamento.
    s = np.full((im.size[1], im.size[0], 3), 200.0)
    rng = np.random.default_rng(7)
    for _ in range(40):
        y0 = rng.integers(0, s.shape[0] - 40)
        x0 = rng.integers(0, s.shape[1] - 40)
        s[y0:y0 + rng.integers(30, 200), x0:x0 + rng.integers(30, 200)] = rng.integers(40, 230)
    grava('grade_chapada', s, 'obliqua_10 minima; superf_chapada maxima (pior caso teorico)')
    return feitos


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if args and args[0] == 'mutar':
        json.dump(mutar(args[1], args[2]), sys.stdout)
        return
    escala = 'a'
    ui = '--ui' in sys.argv
    for a in sys.argv[1:]:
        if a.startswith('--escala='):
            escala = a.split('=', 1)[1]
    saida = []
    for c in args:
        try:
            saida.append(descrever(c, escala, ui))
        except Exception as e:  # falhar ALTO: imagem ilegivel nao vira silencio
            saida.append({'arquivo': c, 'escala': escala, '_erro': f'{type(e).__name__}: {e}'})

    # NaN nao e' JSON valido e `JSON.parse` do consumidor morre nele. Sai como
    # `null` — que o lado JS le' como nao-finito, o mesmo que NaN. O nome do
    # descritor continua em `_indef`, entao "nao medido" segue distinguivel de
    # "medido zero" DEPOIS da serializacao, que e' onde a informacao costuma
    # se perder.
    def limpa(o):
        if isinstance(o, dict):
            return {k: limpa(v) for k, v in o.items()}
        if isinstance(o, list):
            return [limpa(v) for v in o]
        if isinstance(o, float) and not math.isfinite(o):
            return None
        return o

    json.dump(limpa(saida), sys.stdout)


if __name__ == '__main__':
    main()
