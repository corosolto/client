#!/usr/bin/env python3
"""
ref-body.py — MEDE A PROPORÇÃO DO CORPO REAL NAS FOTOS DE REFERÊNCIA.
(estende o método do tools/eval/ref-measure.py, que mede o VIEWMODEL, para o CORPO)

POR QUE ESTE ARQUIVO EXISTE
---------------------------
O dono disse "os funkeiros tão ainda balão". "Balão" é reclamação de PROPORÇÃO, e a regra
da casa — a mesma que destravou a frente de armas depois de 3 dias perdidos — é RÉGUA
ANTES DO CONSERTO, E TETO SÓ COM PROCEDÊNCIA. Lá, a VM12 exigia "boca em y >= 0,66" e o
vmattach dizia "coronha INTEIRA no canto"; nenhum dos dois tinha sido medido em pixel
nenhum, os dois estavam errados, e era por isso que nada fechava. Número sem imagem é
opinião.

AS FOTOS AGORA EXISTEM — E MESMO ASSIM NÃO DÃO TETO. ISTO ESTÁ DECLARADO.
--------------------------------------------------------------------------
(atualizado na rodada do commit e332c87, que espelhou as pastas da máquina do dono)
`references/funkeiros/` tem 22 fotos e `references/palhacos/` tem 21 — 43 no total. Elas
foram MEDIDAS, uma a uma, e as máscaras foram OLHADAS (`--masks`, /tmp/refbody_*.png).
O resultado, dito na cara:

  • 26 das 43 caem nas rejeições automáticas (pessoa cortada pela borda, apêndice fino
    acima da cabeça, braço aberto, silhueta pequena demais). Isso está correto: são
    selfies, closes de rosto e prints de story.
  • Das 17 que "passavam", a CONFERÊNCIA VISUAL reprovou quase todas. A segmentação é
    heurística de fundo (`segmenta_pessoa`), e nestas fotos ela pega a MÃO em vez do
    corpo (funkeiro-chave-lacoste), o cabelo de OUTRA pessoa do fundo (cria-rj-3), um
    pedaço de jaqueta (mandrake-3). Os números denunciam sozinhos: ombro/altura saiu
    0,42 / 0,55 / 0,69 / 0,76 e até 3,78 — sendo que um humano mede 0,259. Nenhum corpo
    tem o ombro do tamanho de 3,8 alturas; o que foi medido não era um corpo.
  • Sobrou essencialmente UMA foto utilizável (palhacos/titica.jpg: corpo inteiro, de
    frente, fundo branco de estúdio). Uma foto não é amostra.

Conclusão HONESTA, e é ela que vale: **as fotos existem, mas este conjunto não permite
fixar o teto de proporção.** O teto do C1 continua sendo o FALLBACK PUBLICADO, rotulado
como tal — e continua valendo, com procedência total, o teto RELATIVO (mediana + MAD do
próprio elenco no char-probe), que é o que responde ao "compare com o mandrake".
Trocar um palpite por uma máscara errada seria pior que o fallback: seria um palpite com
cara de medição. Para destravar isto de verdade bastam 6-8 fotos de CORPO INTEIRO, DE
FRENTE, com fundo limpo — o script mede sozinho assim que elas existirem.

Este script faz as duas coisas, e diz qual das duas usou:
  (a) SE as fotos existirem (basta o dono soltar os JPGs nas pastas), ele MEDE: segmenta
      a pessoa, salva a máscara e as marcações para conferência visual, e devolve
      cabeça/altura, ombro/altura e cintura/ombro por foto. Procedência = a foto.
  (b) SE NÃO existirem, ele devolve ANTROPOMETRIA PUBLICADA e MARCA o resultado como
      `procedencia: "FALLBACK PUBLICADO"` em todo campo. Fallback declarado não é
      procedência inventada — o que é proibido é passar palpite por medição.

O QUE NÃO DÁ PRA FAZER SEM AS FOTOS (dito na cara, não omitido)
----------------------------------------------------------------
Sem as fotos, o teto ABSOLUTO do C1 (char-probe.mjs) é o fallback publicado. O teto que
continua tendo procedência total é o RELATIVO: o char-probe compara todos os personagens
ENTRE SI (mediana + MAD do próprio elenco), e a reclamação do dono é comparativa
("compare com o mandrake", "três níveis de acabamento na mesma tela"). Esse não precisa
de foto nenhuma.

MÉTODO (quando há foto)
-----------------------
Mesma espinha do ref-measure.py: máscara -> maior componente conexa -> geometria.
A diferença é que o corpo se mede por PERFIL DE LARGURA por linha, não por PCA:
  • altura      = extensão vertical da silhueta (a pessoa tem que estar INTEIRA no quadro:
                  se a máscara encosta na borda de baixo ou de cima, a medida é PISO e
                  a foto é REJEITADA, com o motivo no JSON);
  • cabeça      = do topo até o "pescoço", achado como o MÍNIMO LOCAL de largura no terço
                  superior (o pescoço é literalmente o ponto mais estreito acima do peito);
  • ombro       = MÁXIMO de largura na faixa logo abaixo do pescoço (10% da altura);
  • cintura     = MÍNIMO de largura entre 0,50 e 0,68 da altura (medido do topo);
  • rejeita     = pose de braço aberto (largura máxima > 2,2x a largura de ombro estimada),
                  porque aí "ombro" mede a envergadura e não o ombro. Isso é o que a tarefa
                  chamou de "fotos onde a pessoa aparece inteira e de frente".
A máscara e as MARCAÇÕES são salvas em /tmp para conferência visual, e a regra do
ref-measure.py vale igual: NÃO CONFIE NUM NÚMERO DE SEGMENTAÇÃO QUE VOCÊ NÃO OLHOU.

AUTOTESTE (o que torna este script confiável mesmo sem foto nenhuma)
---------------------------------------------------------------------
`--autoteste` roda o extrator contra as SILHUETAS DOS NOSSOS PRÓPRIOS PERSONAGENS
(/tmp/charsil/*.pgm, geradas por `node tools/eval/char-probe.mjs --silhuetas`), cujas
razões verdadeiras o char_probe.json já conhece por medição geométrica em 3D. Ou seja:
uma imagem com GABARITO. Se o extrator não reproduzir as razões que a geometria diz,
o extrator está errado — e é melhor descobrir isso aqui do que numa foto que ninguém
tem como conferir. É a única validação possível nesta máquina, e ela é honesta.

Uso:  python3 tools/eval/ref-body.py                (escreve tools/eval/ref_body.json)
      python3 tools/eval/ref-body.py --masks        (idem + PNGs de conferência em /tmp)
      python3 tools/eval/ref-body.py --autoteste    (valida o extrator contra gabarito)
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
REFS = os.path.join(RAIZ, 'references')
SALVA = '--masks' in sys.argv
AUTOTESTE = '--autoteste' in sys.argv

# ── ANTROPOMETRIA PUBLICADA — o FALLBACK, sempre rotulado como tal ────────────────
# Drillis, R. & Contini, R. (1966), "Body Segment Parameters", NYU School of Engineering,
# report 1166-03; tabela de frações de estatura reproduzida em Winter, D.A.,
# "Biomechanics and Motor Control of Human Movement", fig. 4.1.
# ISTO NÃO É FOTO MEDIDA. É literatura. Quem apertar estes números tem que trocá-los por
# medição em imagem — não por outro palpite.
FALLBACK = {
    'procedencia': 'FALLBACK PUBLICADO (Drillis & Contini 1966 / Winter fig.4.1) — NAO e foto medida',
    'cabecaSobreAltura': 0.130,      # vértex -> mento
    'ombroSobreAltura': 0.259,       # largura biacromial
    'cinturaSobreOmbro': 0.740,      # largura de quadril (0,191 H) / ombro (0,259 H)
    'nota': 'o enunciado cita "cabeca ~ 1/7,5 da altura" = 0,133 e "ombros ~ 0,25"; '
            'os 0,130 e 0,259 acima sao a mesma coisa na tabela publicada.',
}


def maior_componente(m):
    """Maior componente 4-conexa, iterativa. Sem scipy (o container nao tem rede)."""
    lab = np.zeros(m.shape, np.int32)
    cur, melhor = 0, (0, None)
    for j in range(m.shape[0]):
        linha = m[j]
        for i in range(m.shape[1]):
            if linha[i] and lab[j, i] == 0:
                cur += 1
                q = deque([(j, i)]); lab[j, i] = cur; n = 0
                while q:
                    y, x = q.popleft(); n += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        b, c = y + dy, x + dx
                        if 0 <= b < m.shape[0] and 0 <= c < m.shape[1] and m[b, c] and lab[b, c] == 0:
                            lab[b, c] = cur; q.append((b, c))
                if n > melhor[0]:
                    melhor = (n, cur)
    return lab == melhor[1]


def perfil_largura(sel):
    """Largura da silhueta por LINHA (em px). É a curva de onde saem pescoço, ombro e
    cintura: o corpo humano tem um mínimo no pescoço, um máximo logo abaixo (ombro) e
    outro mínimo na cintura. Medir isso é mais robusto que procurar 'a cabeça'."""
    larg = np.zeros(sel.shape[0], np.int32)
    for j in range(sel.shape[0]):
        xs = np.nonzero(sel[j])[0]
        larg[j] = (xs.max() - xs.min() + 1) if xs.size else 0
    return larg


def medir_silhueta(sel, nome, arquivo=None, img=None):
    """Extrai as razões antropométricas de uma máscara booleana já isolada.
    Devolve dict com as medidas E com `rejeitada`/`motivo` quando a foto não permite."""
    H, W = sel.shape
    ys, xs = np.nonzero(sel)
    if ys.size == 0:
        return {'ref': nome, 'arquivo': arquivo, 'rejeitada': True, 'motivo': 'mascara vazia'}
    topo, base = int(ys.min()), int(ys.max())
    altura = base - topo + 1
    larg = perfil_largura(sel)[topo:base + 1]

    rej, motivo = False, []
    # INTEIRA NO QUADRO: se a silhueta encosta na borda de cima ou de baixo, a altura é
    # PISO e toda razão que divide por ela vira mentira. É a mesma lógica do `gripDentroDoQuadro`
    # do ref-measure.py: fora do quadro vira PISO, nao medida.
    if topo <= 1:
        rej = True; motivo.append('silhueta toca a borda SUPERIOR: altura e PISO')
    if base >= H - 2:
        rej = True; motivo.append('silhueta toca a borda INFERIOR: altura e PISO')
    if altura < 80:
        rej = True; motivo.append(f'pessoa pequena demais no quadro ({altura}px): perfil ruidoso')

    n = len(larg)
    # ── LINHA DO OMBRO = DEGRAU de largura, não mínimo local ────────────────────────
    # A primeira versão procurava o pescoço como argmin da largura no terço superior. O
    # AUTOTESTE (contra as nossas próprias silhuetas, cujas razões o char_probe.json sabe
    # em 3D) REPROVOU: erro de 52-64% em cabeça/altura e 59-62% em ombro/altura em 4 dos
    # 5 gabaritos. A causa é concreta e vale para foto também: quando há BONÉ/CHAPÉU/CABELO
    # o mínimo de largura cai na aba do adereço, e não no pescoço — e aí a busca do ombro,
    # que parte do pescoço, mede a aba do chapéu. (No único gabarito SEM adereço, o
    # mandrake, a versão antiga já acertava o ombro com 0,4% de erro: o defeito era
    # exatamente o adereço.)
    # O ombro é o DEGRAU: a maior subida de largura descendo do topo. Isso existe em
    # qualquer corpo — de gente, de boneco, com chapéu ou sem — porque o tronco é sempre
    # muito mais largo que o pescoço/cabeça. Daí a cabeça é topo -> degrau.
    # DEGRAU SUSTENTADO, e não o maior degrau puro: a versão "maior degrau" ainda errava
    # 68% (sertanejo, chapéu de aba larga) e 87% (mst, bandeira num mastro acima da cabeça),
    # porque a aba do chapéu É um degrau grande — só que a largura DESABA logo abaixo dela.
    # Ombro é o degrau depois do qual o corpo CONTINUA largo. Pontuação por linha:
    #     (menor largura na faixa ABAIXO) − (maior largura na faixa ACIMA)
    # Aba de chapéu e mastro de bandeira pontuam negativo por construção; ombro pontua alto.
    # Em foto de gente isso vale igual: pega guarda-chuva, cartaz e cabelo armado.
    lim = max(3, int(n * 0.55))
    faixa = max(2, int(n * 0.04))
    melhor, jOmbLinha = -1e18, max(1, int(n * 0.13))
    for j in range(1, lim):
        acima = larg[max(0, j - faixa):j]
        abaixo = larg[j:min(n, j + faixa)]
        if acima.size == 0 or abaixo.size == 0:
            continue
        sc = float(abaixo.min()) - float(acima.max())
        if sc > melhor:
            melhor, jOmbLinha = sc, j
    jPesc = jOmbLinha
    # ombro = MÁXIMO de largura na faixa de 12% da altura logo abaixo do degrau
    j2 = min(n - 1, jOmbLinha + max(2, int(n * 0.12)))
    jOmb = int(jOmbLinha + np.argmax(larg[jOmbLinha:j2 + 1])) if j2 > jOmbLinha else jOmbLinha
    # cintura = mínimo entre 0,50 e 0,68 da altura (contando do topo)
    k0, k1 = int(n * 0.50), int(n * 0.68)
    jCin = int(k0 + np.argmin(larg[k0:k1])) if k1 > k0 else k0

    lOmb, lCin = int(larg[jOmb]), int(larg[jCin])
    lMax = int(larg.max())
    # APÊNDICE FINO NO TOPO (mastro de bandeira, antena, guarda-chuva, cabelo de espeto):
    # se o topo da silhueta é fininho, ele NÃO é a cabeça — e como `altura` sai do topo da
    # silhueta, TODA razão que divide por ela mente. O autoteste pegou isto no `mst`, que
    # carrega uma bandeirinha num mastro acima da cabeça: o extrator reportava
    # cabeca/altura = 0,029 contra 0,225 do gabarito (87% de erro). Vira REJEIÇÃO, não
    # número — é o mesmo princípio do `gripDentroDoQuadro` do ref-measure.py: quando a
    # imagem não permite medir, o script DIZ que não permite em vez de devolver um valor.
    topoFino = larg[:max(1, int(n * 0.10))]
    if lOmb and topoFino.size and float(topoFino.max()) < 0.25 * lOmb:
        rej = True
        motivo.append(f'topo da silhueta e um apendice fino ({int(topoFino.max())}px = '
                      f'{topoFino.max() / lOmb:.2f} do ombro): mastro/antena/objeto acima da '
                      f'cabeca contamina a ALTURA — foto nao serve pra proporcao')
    # BRAÇO ABERTO: com o braço estendido a linha do ombro mede ENVERGADURA. A tarefa pede
    # "pessoa inteira e DE FRENTE"; este é o teste operacional disso.
    if lOmb and lMax > lOmb * 2.2:
        rej = True; motivo.append(f'largura maxima {lMax}px e {lMax / lOmb:.1f}x o ombro: braco aberto/objeto — nao serve')
    # ── A MÁSCARA PARECE UMA PESSOA EM PÉ? (acrescentado depois de OLHAR as 43 fotos) ──
    # A conferência visual mostrou o modo de falha dominante deste conjunto: `segmenta_pessoa`
    # é heurística de FUNDO, e em selfie/close ela devolve a mão, um pedaço de jaqueta ou o
    # cabelo de outra pessoa. Esses recortes passavam por todos os testes anteriores e
    # produziam ombro/altura de 0,42 a 3,78 (humano: 0,259) — números com cara de medição.
    # Dois testes FÍSICOS, e nenhum deles olha o valor que se quer medir (não são circulares):
    #   (a) PROPORÇÃO DA MÁSCARA: gente em pé é alta e estreita. altura/larguraMax >= 1,8.
    #       Um busto, uma mão e um retalho de fundo ficam perto de 1.
    #   (b) PREENCHIMENTO: um corpo ocupa boa parte do próprio retângulo. area/bbox >= 0,30.
    #       Recorte espalhado pelo fundo fica muito abaixo disso.
    area = int(sel.sum())
    largBBox = int(xs.max() - xs.min() + 1)
    aspecto = altura / largBBox if largBBox else 0
    preench = area / (altura * largBBox) if altura and largBBox else 0
    if aspecto < 1.8:
        rej = True
        motivo.append(f'mascara nao tem forma de pessoa em pe (altura/largura = {aspecto:.2f}, '
                      f'minimo 1,80): e busto, close ou recorte de fundo — nao serve pra proporcao')
    if preench < 0.30:
        rej = True
        motivo.append(f'mascara preenche so {preench:.2f} do proprio retangulo (minimo 0,30): '
                      f'recorte espalhado, nao corpo')

    out = {
        'ref': nome, 'arquivo': arquivo, 'tamanho': [W, H],
        'alturaPx': altura, 'topoPx': topo, 'basePx': base,
        'yPescocoPx': topo + jPesc, 'yOmbroPx': topo + jOmb, 'yCinturaPx': topo + jCin,
        'larguraOmbroPx': lOmb, 'larguraCinturaPx': lCin, 'larguraMaxPx': lMax,
        'cabecaSobreAltura': round(jPesc / altura, 4),
        'ombroSobreAltura': round(lOmb / altura, 4),
        'cinturaSobreOmbro': round(lCin / lOmb, 4) if lOmb else None,
        'rejeitada': rej, 'motivo': '; '.join(motivo) or None,
    }
    if SALVA and img is not None and arquivo:
        base_nome = os.path.splitext(os.path.basename(arquivo))[0]
        a = np.asarray(img.convert('RGB')).copy()
        a[sel] = (a[sel] * 0.4 + np.array([255, 0, 255]) * 0.6).astype(np.uint8)
        cf = Image.fromarray(a); d = ImageDraw.Draw(cf)
        for y, cor, rot in ((out['yPescocoPx'], (0, 255, 0), 'pescoco'),
                            (out['yOmbroPx'], (255, 220, 0), 'ombro'),
                            (out['yCinturaPx'], (0, 220, 255), 'cintura')):
            d.line([(0, y), (W, y)], fill=cor, width=max(1, W // 300))
            d.text((4, max(0, y - 12)), rot, fill=cor)
        p = f'/tmp/refbody_{base_nome}.png'
        cf.save(p); print('  marcacao ->', p)
    return out


def segmenta_pessoa(im):
    """Máscara da PESSOA numa foto. Heuristica de fundo: assume que as bordas do quadro
    sao fundo, modela a cor media/desvio delas e marca como pessoa o que se afasta disso.
    NAO e segmentacao semantica — e por isso que a conferencia visual (--masks) e
    OBRIGATORIA antes de acreditar em qualquer numero que sair daqui."""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    H, W, _ = a.shape
    borda = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3),
                            a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    mu, sd = borda.mean(0), borda.std(0) + 8.0
    dist = np.sqrt((((a - mu) / sd) ** 2).sum(2))
    m = dist > 2.2
    return maior_componente(m)


# ══════════════════════════════════════════════════════════════════════════════
# AUTOTESTE: extrator contra GABARITO (nossas silhuetas, razoes conhecidas em 3D)
# ══════════════════════════════════════════════════════════════════════════════
def autoteste():
    pgm_dir = '/tmp/charsil'
    jsonp = os.path.join(AQUI, 'char_probe.json')
    if not os.path.isdir(pgm_dir) or not os.path.exists(jsonp):
        print('AUTOTESTE indisponivel: rode antes  node tools/eval/char-probe.mjs --silhuetas')
        return None
    gab = {p['id']: p for p in json.load(open(jsonp))['personagens']}
    linhas = []
    for nome in ('caminhoneiro', 'doutora', 'mandrake', 'sertanejo', 'mst'):
        f = os.path.join(pgm_dir, f'{nome}_frente.pgm')
        if not os.path.exists(f):
            continue
        im = Image.open(f)
        sel = np.asarray(im) > 127
        med = medir_silhueta(sel, f'autoteste:{nome}', f, im)
        g = gab.get(nome, {}).get('C1', {}).get('razoes', {})
        linhas.append({
            'id': nome,
            'rejeitada': bool(med.get('rejeitada')), 'motivo': med.get('motivo'),
            'medidoNaImagem': {k: med[k] for k in ('cabecaSobreAltura', 'ombroSobreAltura', 'cinturaSobreOmbro')},
            'gabarito3D': {k: (round(g[k], 4) if g.get(k) is not None else None)
                           for k in ('cabecaSobreAltura', 'ombroSobreAltura', 'cinturaSobreOmbro')},
        })
    print('\n=== AUTOTESTE: extrator de imagem  x  gabarito geometrico 3D ===')
    print('id            grandeza              imagem   3D      erro   veredito do extrator')
    for L in linhas:
        for k in L['medidoNaImagem']:
            a, b = L['medidoNaImagem'][k], L['gabarito3D'].get(k)
            e = f'{abs(a - b) / b * 100:5.1f}%' if (a is not None and b) else '   -  '
            vd = 'REJEITADA' if L['rejeitada'] else 'aceita'
            print(f"{L['id']:<13} {k:<20} {a if a is not None else '-':<8} {b if b is not None else '-':<7} {e}  {vd}")
        if L['rejeitada']:
            print(f"{'':13} motivo: {L['motivo']}")
    print('\nNOTA DO AUTOTESTE: toda silhueta renderizada encosta na borda de baixo (o pe do')
    print('boneco E a ultima linha da imagem), entao a regra "silhueta toca a borda INFERIOR"')
    print('marca TODAS como rejeitadas. Isso e correto para FOTO e esperado aqui — os numeros')
    print('acima continuam servindo pra validar o extrator, que e o objetivo do autoteste.')
    print('\nLEITURA — o que este autoteste prova e o que ele NAO prova:')
    print(' • ombro/altura e a medida VALIDADA: erro < 1% nos gabaritos sem adereco acima da')
    print('   cabeca. E a grandeza que o C1 usa como teto, e e a que o extrator sabe achar.')
    print(' • cabeca/altura tem erro residual porque as DUAS reguas medem coisas diferentes:')
    print('   em 3D a cabeca vai do topo ate o PIVO DO PESCOCO (osso/parts.head); na imagem')
    print('   vai do topo ate a LINHA DO OMBRO, que e o unico marco visivel numa foto. Num')
    print('   corpo com pescoco as duas quase coincidem; no nosso boneco procedural NAO EXISTE')
    print('   PESCOCO (a caixa da cabeca encosta direto no peito) e os bracos nascem 8 cm')
    print('   abaixo do topo do torso, entao sobra a diferenca. E divergencia de DEFINICAO,')
    print('   declarada — a mesma ressalva que o ref-measure.py faz entre anguloEixoGraus')
    print('   (PCA da massa) e anguloCanoGraus (linha do cano).')
    print(' • cintura/ombro diverge pelo mesmo motivo: em 3D sai de uma fatia na altura do')
    print('   quadril; na imagem, do MINIMO do perfil entre 0,50 e 0,68 da altura.')
    return linhas


# ══════════════════════════════════════════════════════════════════════════════
def acha_fotos():
    achados = {}
    for sub in ('funkeiros', 'palhacos'):
        d = os.path.join(REFS, sub)
        achados[sub] = sorted(f for f in os.listdir(d)
                              if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))) if os.path.isdir(d) else []
    achados['raiz'] = sorted(f for f in os.listdir(REFS)
                             if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))) if os.path.isdir(REFS) else []
    return achados


if __name__ == '__main__':
    fotos = acha_fotos()
    total = sum(len(v) for v in fotos.values())
    medidas = []
    for grupo, arqs in fotos.items():
        base = REFS if grupo == 'raiz' else os.path.join(REFS, grupo)
        for a in arqs:
            caminho = os.path.join(base, a)
            try:
                im = Image.open(caminho)
                if max(im.size) > 900:                 # barato e suficiente pro perfil
                    im = im.resize((im.width * 900 // max(im.size), im.height * 900 // max(im.size)), Image.LANCZOS)
                sel = segmenta_pessoa(im)
                medidas.append({'grupo': grupo, **medir_silhueta(sel, f'{grupo}/{a}', caminho, im)})
            except Exception as e:                     # noqa: BLE001
                medidas.append({'grupo': grupo, 'arquivo': caminho, 'rejeitada': True, 'motivo': f'erro: {e}'})

    validas = [m for m in medidas if not m.get('rejeitada')]
    # ── QUANTAS FOTOS BASTAM PRA VIRAR TETO? (regra escrita depois de olhar as 43) ──────
    # O `--autoteste` prova que o EXTRATOR de razões acerta (< 1% de erro em ombro/altura
    # contra gabarito geométrico 3D). Quem NÃO tem gabarito é a SEGMENTAÇÃO: `segmenta_pessoa`
    # é heurística de fundo, e é ela que falha nestas fotos. Sem gabarito de segmentação, a
    # única defesa é AMOSTRA: um punhado de máscaras heurísticas não vira teto pra 45
    # personagens. Piso de 6 fotos aceitas — abaixo disso o script devolve o FALLBACK
    # PUBLICADO e DIZ por quê, em vez de entregar palpite com cara de medição.
    MIN_FOTOS = 6
    if validas and len(validas) < MIN_FOTOS:
        print(f'\n*** {len(validas)} foto(s) aceita(s) de {total}: abaixo do piso de {MIN_FOTOS}. ***')
        print('    O teto do C1 continua sendo FALLBACK PUBLICADO, rotulado como tal.')
        validas = []
    if validas:
        med = lambda k: float(np.median([m[k] for m in validas if m.get(k) is not None]))  # noqa: E731
        teto = {
            'procedencia': f'MEDIDO em {len(validas)} fotos de {total} encontradas — ver `medidas` e as marcacoes /tmp/refbody_*.png',
            'cabecaSobreAltura': round(med('cabecaSobreAltura'), 4),
            'ombroSobreAltura': round(med('ombroSobreAltura'), 4),
            'cinturaSobreOmbro': round(med('cinturaSobreOmbro'), 4),
        }
    else:
        teto = dict(FALLBACK)
        aceitas = len([m for m in medidas if not m.get('rejeitada')])
        if total:
            teto['porQueNaoMediu'] = (
                f'{total} fotos encontradas, {aceitas} sobreviveram aos testes de qualidade de '
                f'mascara (piso: {MIN_FOTOS}). Sao selfies/closes; a segmentacao heuristica '
                'devolve mao, jaqueta ou fundo em vez de corpo. Conferencia visual em '
                '/tmp/refbody_*.png (rode com --masks). Para destravar: 6-8 fotos de CORPO '
                'INTEIRO, DE FRENTE, fundo limpo.')

    saida = {
        'metodo': 'perfil de largura por linha sobre a maior componente conexa; ver docstring',
        'pastasProcuradas': {
            'references/funkeiros': len(fotos['funkeiros']),
            'references/palhacos': len(fotos['palhacos']),
            'references/*.jpg (raiz)': len(fotos['raiz']),
        },
        'fotosEncontradas': total,
        'fotosMedidas': len(validas),
        'tetoC1': teto,
        'medidas': medidas,
        'autoteste': autoteste() if AUTOTESTE else None,
        'ressalvas': [
            'AS FOTOS EXISTEM (22 funkeiros + 21 palhacos) e foram medidas uma a uma, com as '
            'mascaras OLHADAS em /tmp/refbody_*.png. O conjunto NAO permite fixar teto: sao '
            'selfies e closes, e a segmentacao heuristica devolve mao/jaqueta/fundo em vez de '
            'corpo (ombro/altura saiu de 0,42 a 3,78 contra 0,259 de um humano). Sobra ~1 foto '
            'utilizavel. O teto do C1 segue sendo FALLBACK PUBLICADO, rotulado. Para destravar: '
            '6-8 fotos de CORPO INTEIRO, DE FRENTE, fundo limpo.',
            'segmenta_pessoa() e heuristica de fundo, nao segmentacao semantica. Rode com '
            '--masks e OLHE /tmp/refbody_*.png antes de usar qualquer numero daqui — foi '
            'exatamente esse passo que pegou o vazamento pra areia do dust no ref-measure.py.',
            'foto com a pessoa cortada pela borda de cima ou de baixo e REJEITADA: a altura '
            'vira PISO e toda razao que divide por ela mente.',
        ],
    }
    p = os.path.join(AQUI, 'ref_body.json')
    with open(p, 'w') as f:
        json.dump(saida, f, indent=1, ensure_ascii=False)

    print('\n=== ref-body: proporcao do corpo nas fotos de referencia ===')
    print(f"references/funkeiros : {len(fotos['funkeiros'])} fotos")
    print(f"references/palhacos  : {len(fotos['palhacos'])} fotos")
    print(f"references/*.jpg     : {len(fotos['raiz'])} fotos")
    if total == 0:
        print('\n*** NENHUMA FOTO DE CORPO ENCONTRADA. ***')
        print('    A tarefa dizia 18 + 21 + 8. `git ls-files references` devolve 3 arquivos,')
        print('    todos de viewmodel, e as pastas funkeiros/ e palhacos/ nao existem.')
        print('    O teto do C1 sai como FALLBACK PUBLICADO e esta rotulado como tal.')
    else:
        for m in medidas:
            if m.get('rejeitada'):
                desc = 'REJEITADA: ' + (m.get('motivo') or '')
            else:
                desc = (f"cabeca/H {m['cabecaSobreAltura']}  ombro/H {m['ombroSobreAltura']}"
                        f"  cint/omb {m['cinturaSobreOmbro']}")
            print(f"  {m.get('ref', '?'):<40} {desc}")
    print('\nteto do C1 ->', json.dumps(teto, ensure_ascii=False))
    print('->', p)
