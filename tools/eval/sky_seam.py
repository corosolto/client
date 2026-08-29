#!/usr/bin/env python3
# ============================================================================
#  sky_seam.py — MOTOR DE MEDIDA E CONSERTO DA COSTURA DE WRAP DOS CÉUS
# ----------------------------------------------------------------------------
#  POR QUE EXISTE
#  O dono viu uma emenda vertical partindo a tela ao meio no `fy_quebrada`
#  (coluna x=812 de um frame 1500x1000): metade esquerda quente/creme, metade
#  direita cinza-azulada. O palpite óbvio — "é compressão do PNG" ou "é o
#  `map_sky.js`" — foi REFUTADO antes de qualquer conserto:
#
#    `sky_rj.webp` passa pelo MESMO caminho de código (map_sky.js:14
#    EquirectangularReflectionMapping, :17 scene.background) e mede
#    wrap dL* = 0,13 / db* = 0,21. Se o código costurasse errado, rj costuraria
#    errado também. Logo o defeito está no ASSET, e é medível sem frame nenhum.
#
#  O QUE MEDE
#  Um panorama equirretangular é um CILINDRO: a coluna W-1 encosta na coluna 0.
#  Se as duas não casam em cor, o wrap vira uma parede vertical no jogo. Aqui a
#  imagem é convertida para CIELAB (D65, sRGB) e comparada coluna a coluna.
#
#  O PORTÃO (e por que NÃO é o limiar solto que parece)
#  Reprovar só por "|dL*| > 1,5" marca `sky_pool` (2,32), que é bom: aquele céu
#  é nublado e varia 7,19 L* entre colunas VIZINHAS internas — 2,32 no wrap é
#  menor que a própria textura do céu. Reprovar só por "costura > 0,5x a maior
#  aresta interna" marca `sky_brasilia` (razão 1,15) com uma costura de 0,65 L*,
#  invisível a olho nu. Cada regra sozinha produz falso positivo, por motivos
#  OPOSTOS. Então elas entram CONJUGADAS:
#
#    reprova  <=>  (costura acima do limiar ABSOLUTO de perceptibilidade)
#              E   (costura anômala PERANTE O PRÓPRIO CONTEÚDO da imagem)
#
#  mais um batente absoluto (HARD_*) que reprova sozinho, para o caso de uma
#  imagem com aresta interna gigante mascarar uma costura catastrófica.
#  Com isso os 8 céus se separam limpo em 4 e 4 — sem ajustar limiar para dar
#  o número que se queria.
#
#  A FAIXA DO HORIZONTE é MEDIDA E RELATADA, mas NÃO é portão: ela acusa 6 dos
#  8 céus (brasilia 4,82 e pool 8,82 entram junto com os 4 quebrados). É um bom
#  diagnóstico — é a faixa que a câmera na altura do olho amostra — e um portão
#  ruim. Fica na tabela como coluna, não como veredito.
#
#  COMO CONSERTA (`fix`)
#  NÃO é cross-fade de conteúdo (sobrepor as duas pontas fantasmaria as nuvens).
#  É uma RAMPA DE CORREÇÃO multiplicativa em luz linear:
#
#    A(y) = média das K colunas da ponta esquerda   (luz linear, por canal)
#    B(y) = média das K colunas da ponta direita
#    G(y) = sqrt(A*B)                                 (média geométrica: alvo)
#    out  = img * (G/A)^r(x) * (G/B)^s(x)
#
#  r(x) cai de 1 a 0 em N colunas a partir da esquerda (smoothstep), s(x) o
#  espelho na direita. Na coluna 0 a imagem vira G; na coluna W-1 vira G; no
#  miolo r=s=0 e NADA é tocado. Como (G/A)*(G/B) = 1, a correção é antissimétrica
#  e a cor MÉDIA da imagem praticamente não anda — o objetivo é tirar a emenda,
#  não reinterpretar o céu. Multiplicativo em luz linear = deslocamento de
#  exposição/balanço, preserva a RAZÃO de contraste da textura (aditivo em sRGB
#  achataria as nuvens).
#
#  LIMITE DECLARADO: isso fecha a descontinuidade TONAL e CROMÁTICA, que é o que
#  foi medido e o que se vê como "metade quente / metade cinza". NÃO costura
#  ESTRUTURA: uma nuvem cortada ao meio continua cortada ao meio. Para estrutura
#  seria preciso regerar o pano, e a ordem foi "não invente céu novo".
#
#  Uso:
#    python3 tools/eval/sky_seam.py measure [--json] [arquivos...]
#    python3 tools/eval/sky_seam.py mutate --src sky_rj --out /tmp/x.webp [--hue 40]
#    python3 tools/eval/sky_seam.py fix --file sky_quebrada [--cols 64] [--upscale 2048]
# ============================================================================
import argparse
import glob
import json
import os
import sys

import numpy as np

try:
    from PIL import Image
except Exception as e:  # pragma: no cover
    print('__ERRO__ PIL ausente: ' + str(e))
    sys.exit(2)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SKYDIR = os.path.join(ROOT, 'public', 'img', 'textures')

# ---------------------------------------------------------------- LIMIARES
# Absolutos: abaixo disso a costura não é perceptível como parede.
#   1,5 L* é a ordem do JND para uma borda dura; 3,0 b* porque croma tolera
#   mais que luminância antes de virar "metade azul / metade creme".
ABS_L = 1.5
ABS_B = 3.0
# Relativo: a costura tem de ser anômala perante a maior aresta de coluna
# INTERNA da própria imagem. 0,5x = a emenda vale metade da maior feição legítima.
REL = 0.5
# Batente: reprova sozinho, sem olhar razão. Nenhum céu bom chega perto
# (o pior bom é pool, 2,32 / 2,58).
HARD_L = 6.0
HARD_B = 6.0
# Tolerância da rampa de conserto: o gradiente por coluna dentro da faixa
# corrigida não pode passar disto vezes o do miolo intocado.
# MEDIDO, varrendo a largura da rampa sobre os originais (não é chute):
#          cols=1  cols=4  cols=8  cols=16  cols=64
#   joa    12,36x   4,39x   2,54x    1,48x    1,27x
#   quebr.  2,24x   0,82x   0,82x    0,82x    0,96x
# O portão morde onde importa: céu LISO (joa, miolo 0,68 L*/col) não tem
# conteúdo para esconder rampa estreita; céu de conteúdo forte (quebrada, miolo
# 4,39) esconde. 1,5x aprova o `sky_joa` consertado (1,27x, contra 1,13x que ele
# JÁ tinha antes de qualquer conserto) e reprova cols<=8 nele. É esse número que
# justifica as 64 colunas: abaixo de 16 o joa vira banda.
RAMP_TOL = 1.5
# Alvo do conserto (o sky_rj.webp já entrega 0,13 / 0,21 pelo mesmo caminho,
# então isto não é aspiracional).
TARGET_L = 1.0
TARGET_B = 1.0

_M = np.array([[0.4124564, 0.3575761, 0.1804375],
               [0.2126729, 0.7151522, 0.0721750],
               [0.0193339, 0.1191920, 0.9503041]])
_WP = np.array([0.95047, 1.0, 1.08883])


def srgb_to_linear(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.clip(np.asarray(c, dtype=np.float64), 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * (c ** (1 / 2.4)) - 0.055)


def to_lab(rgb01):
    """sRGB [0,1] -> CIELAB D65."""
    xyz = srgb_to_linear(rgb01) @ _M.T
    t = xyz / _WP
    f = np.where(t > 216 / 24389, np.cbrt(t), (24389 / 27 * t + 16) / 116)
    return np.stack([116 * f[..., 1] - 16,
                     500 * (f[..., 0] - f[..., 1]),
                     200 * (f[..., 1] - f[..., 2])], axis=-1)


def load_rgb01(path):
    im = Image.open(path).convert('RGB')
    return np.asarray(im, dtype=np.float64) / 255.0, im.size


def measure(path):
    """Todas as medidas de um céu. Nada aqui depende de frame renderizado."""
    rgb, (w, h) = load_rgb01(path)
    lab = to_lab(rgb)
    col = lab.mean(axis=0)                       # (w,3) média de cada coluna

    wrap_l = float(col[w - 1, 0] - col[0, 0])
    wrap_b = float(col[w - 1, 2] - col[0, 2])

    step_l = np.abs(np.diff(col[:, 0]))          # arestas de coluna INTERNAS
    step_b = np.abs(np.diff(col[:, 2]))
    inner_l = float(step_l.max())
    inner_b = float(step_b.max())

    ratio_l = abs(wrap_l) / max(inner_l, 1e-6)
    ratio_b = abs(wrap_b) / max(inner_b, 1e-6)

    # Faixa do horizonte: linhas 200-300 de uma referência 512, reescalada para
    # a altura real. É o que a câmera na altura do olho amostra. DIAGNÓSTICO,
    # não portão (acusa 6 dos 8; ver cabeçalho).
    y0, y1 = int(round(h * 200 / 512)), int(round(h * 300 / 512))
    band = lab[y0:y1].mean(axis=0)
    hz_l = float(band[w - 1, 0] - band[0, 0])
    hz_b = float(band[w - 1, 2] - band[0, 2])

    # Guarda da RAMPA: fechar a costura empurrando 8 L* em 8 colunas troca a
    # emenda por uma BANDA — outro defeito, com a régua verde. Então o gradiente
    # por coluna DENTRO da faixa de correção não pode passar de RAMP_TOL x o
    # gradiente máximo do miolo intocado da própria imagem.
    n = max(64, int(round(w * 64 / 1024)))
    grad = np.abs(np.diff(col[:, 0]))
    ramp_max = float(np.r_[grad[:n], grad[-n:]].max())
    mid_max = float(grad[n:-n].max()) if grad.size > 2 * n else ramp_max
    ramp_ratio = ramp_max / max(mid_max, 1e-6)

    fails = []
    if ramp_ratio > RAMP_TOL:
        fails.append(f'gradiente da rampa {ramp_max:.2f} L*/col = {ramp_ratio:.2f}x o do miolo '
                     f'({mid_max:.2f}) > {RAMP_TOL}x — costura virou BANDA')
    if abs(wrap_l) > HARD_L:
        fails.append(f'|dL*|={abs(wrap_l):.2f} > batente {HARD_L}')
    elif abs(wrap_l) > ABS_L and ratio_l > REL:
        fails.append(f'|dL*|={abs(wrap_l):.2f} > {ABS_L} E costura {ratio_l:.2f}x a maior aresta interna (> {REL}x)')
    if abs(wrap_b) > HARD_B:
        fails.append(f'|db*|={abs(wrap_b):.2f} > batente {HARD_B}')
    elif abs(wrap_b) > ABS_B and ratio_b > REL:
        fails.append(f'|db*|={abs(wrap_b):.2f} > {ABS_B} E costura {ratio_b:.2f}x a maior aresta interna (> {REL}x)')

    return {
        'file': os.path.basename(path),
        'path': path,
        'w': w, 'h': h,
        'bytes': os.path.getsize(path),
        'aspect_ok': abs(w / h - 2.0) < 0.01,
        'px_per_deg': round(w / 360.0, 2),
        'col0_L': round(float(col[0, 0]), 2), 'col0_b': round(float(col[0, 2]), 2),
        'colW_L': round(float(col[w - 1, 0]), 2), 'colW_b': round(float(col[w - 1, 2]), 2),
        'wrap_dL': round(wrap_l, 2), 'wrap_db': round(wrap_b, 2),
        'inner_max_L': round(inner_l, 2), 'inner_max_b': round(inner_b, 2),
        'ratio_L': round(ratio_l, 2), 'ratio_b': round(ratio_b, 2),
        'horizon_dL': round(hz_l, 2), 'horizon_db': round(hz_b, 2),
        'ramp_grad': round(ramp_max, 2), 'mid_grad': round(mid_max, 2),
        'ramp_ratio': round(ramp_ratio, 2),
        'mean_L': round(float(lab[..., 0].mean()), 2),
        'mean_a': round(float(lab[..., 1].mean()), 2),
        'mean_b': round(float(lab[..., 2].mean()), 2),
        'pass': len(fails) == 0,
        'fails': fails,
    }


# ---------------------------------------------------------------- CONSERTO
def _smoothstep(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def _vsmooth(v, sigma):
    """Suaviza D(y) na vertical para não injetar ruído de UMA coluna numa faixa
    de 64. Gaussiana separável simples; sem scipy."""
    if sigma <= 0:
        return v
    rad = int(max(1, round(sigma * 3)))
    x = np.arange(-rad, rad + 1, dtype=np.float64)
    k = np.exp(-0.5 * (x / sigma) ** 2)
    k /= k.sum()
    pad = np.pad(v, ((rad, rad), (0, 0)), mode='edge')
    out = np.zeros_like(v)
    for i, wgt in enumerate(k):
        out += wgt * pad[i:i + v.shape[0]]
    return out


def fix_seam(path, out_path, cols=64, edge_k=6, sigma=3.0, upscale=None):
    """Rampa de correção multiplicativa em luz linear. Ver cabeçalho.

    POR QUE edge_k=6 E sigma=3,0 (medido, não chutado)
    A rampa nasce de D(y) = G/A, uma correção POR LINHA. Tirar D(y) de poucas
    colunas sem suavizar fecha a costura quase perfeito (quebrada cai para
    dL* 0,26) mas ASSA o ruído daquelas colunas numa faixa de 64 — troca a
    emenda por ESTRIA horizontal. Medindo a amplitude da estria injetada contra
    o ruído linha-a-linha NATIVO de cada imagem:

              nativo   sig=0/k=2   sig=3/k=6
      quebrada  2,13      2,93        1,53
      joa       0,96      2,15        0,65
      ferro     1,44      2,20        0,59
      havan     1,02      3,16        0,73

    sigma=0 injeta ACIMA do ruído natural (havan 3x) — defeito novo. sigma=3/k=6
    fica ABAIXO do nativo nos quatro e ainda fecha sob o alvo de 1,0 L*.
    """
    rgb, (w, h) = load_rgb01(path)
    lin = srgb_to_linear(rgb)
    eps = 1e-5

    k = min(edge_k, w // 4)
    A = _vsmooth(lin[:, :k, :].mean(axis=1), sigma)          # (h,3) ponta esq.
    B = _vsmooth(lin[:, w - k:, :].mean(axis=1), sigma)      # (h,3) ponta dir.
    A = np.maximum(A, eps)
    B = np.maximum(B, eps)
    G = np.sqrt(A * B)                                       # alvo simétrico

    fa = (G / A)[:, None, :]     # fator na ponta esquerda
    fb = (G / B)[:, None, :]     # fator na ponta direita  -> fa*fb == 1

    n = min(cols, w // 4)
    x = np.arange(w, dtype=np.float64)
    r = _smoothstep(1.0 - x / n)[None, :, None]              # 1 em x=0 -> 0 em x=n
    s = _smoothstep(1.0 - (w - 1 - x) / n)[None, :, None]    # espelho na direita

    out_lin = lin * np.power(fa, r) * np.power(fb, s)
    out = np.clip(linear_to_srgb(out_lin), 0.0, 1.0)
    img = Image.fromarray(np.round(out * 255).astype(np.uint8), 'RGB')

    if upscale and upscale > w:
        # Reamostragem CIENTE DO WRAP: o `Image.resize` do PIL grampeia a borda,
        # o que reabre parte da costura que acabamos de fechar (quebrada voltava
        # de 0,89 para 0,97). Emenda-se P colunas circularmente de cada lado,
        # reamostra e recorta — o Lanczos vê a continuação real do cilindro.
        pad = 16
        scale = upscale / w
        if float(pad * scale).is_integer():
            wide = np.concatenate([out[:, w - pad:, :], out, out[:, :pad, :]], axis=1)
            tmp = Image.fromarray(np.round(wide * 255).astype(np.uint8), 'RGB')
            tw = int(round((w + 2 * pad) * scale))
            tmp = tmp.resize((tw, upscale // 2), Image.LANCZOS)
            m = int(pad * scale)
            img = tmp.crop((m, 0, m + upscale, upscale // 2))
        else:
            img = img.resize((upscale, upscale // 2), Image.LANCZOS)

    # WebP: preserva formato. quality 92 / method 6 é o joelho da curva para
    # gradiente de céu — abaixo disso o banding volta e a régua começa a medir
    # artefato de compressão em vez de costura.
    img.save(out_path, 'WEBP', quality=92, method=6)
    return out_path


def mutate(src_path, out_path, hue_deg=40.0, lum=0.0):
    """Costura um céu BOM de propósito: gira o matiz (e opcionalmente a
    luminância) da METADE ESQUERDA. Se a régua não ficar vermelha nisto, ela
    não está medindo nada e o verde dela não vale nada."""
    rgb, (w, h) = load_rgb01(src_path)
    half = w // 2
    left = rgb[:, :half, :]

    # rotação de matiz em YIQ (barata, sem dependência extra)
    t = np.deg2rad(hue_deg)
    yiq = np.array([[0.299, 0.587, 0.114],
                    [0.595716, -0.274453, -0.321263],
                    [0.211456, -0.522591, 0.311135]])
    inv = np.linalg.inv(yiq)
    v = left @ yiq.T
    c, s = np.cos(t), np.sin(t)
    i2 = v[..., 1] * c - v[..., 2] * s
    q2 = v[..., 1] * s + v[..., 2] * c
    v = np.stack([v[..., 0] * (1.0 + lum), i2, q2], axis=-1)
    out = rgb.copy()
    out[:, :half, :] = np.clip(v @ inv.T, 0.0, 1.0)

    Image.fromarray(np.round(out * 255).astype(np.uint8), 'RGB').save(
        out_path, 'WEBP', quality=92, method=6)
    return out_path


def _resolve(name):
    if os.path.sep in name or name.endswith('.webp'):
        p = name if os.path.isabs(name) else os.path.join(ROOT, name)
        if os.path.exists(p):
            return p
    return os.path.join(SKYDIR, name if name.endswith('.webp') else name + '.webp')


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)

    m = sub.add_parser('measure')
    m.add_argument('files', nargs='*')

    f = sub.add_parser('fix')
    f.add_argument('--file', required=True)
    f.add_argument('--out', default=None)
    f.add_argument('--cols', type=int, default=64)
    f.add_argument('--upscale', type=int, default=0)

    mu = sub.add_parser('mutate')
    mu.add_argument('--src', default='sky_rj')
    mu.add_argument('--out', required=True)
    mu.add_argument('--hue', type=float, default=40.0)
    mu.add_argument('--lum', type=float, default=0.0)

    a = ap.parse_args()

    if a.cmd == 'measure':
        files = [_resolve(x) for x in a.files] if a.files else sorted(
            glob.glob(os.path.join(SKYDIR, 'sky_*.webp')))
        rows = [measure(p) for p in files]
        print(json.dumps({
            'thresholds': {'ABS_L': ABS_L, 'ABS_B': ABS_B, 'REL': REL,
                           'HARD_L': HARD_L, 'HARD_B': HARD_B, 'RAMP_TOL': RAMP_TOL,
                           'TARGET_L': TARGET_L, 'TARGET_B': TARGET_B},
            'skies': rows,
        }, ensure_ascii=False))
        return

    if a.cmd == 'fix':
        src = _resolve(a.file)
        out = a.out or src
        fix_seam(src, out, cols=a.cols, upscale=(a.upscale or None))
        print(json.dumps(measure(out), ensure_ascii=False))
        return

    if a.cmd == 'mutate':
        mutate(_resolve(a.src), a.out, hue_deg=a.hue, lum=a.lum)
        print(json.dumps(measure(a.out), ensure_ascii=False))
        return


if __name__ == '__main__':
    main()
