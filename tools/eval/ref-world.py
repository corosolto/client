"""ref-world.py — as capturas de referencia de favela viram corpus medivel.

POR QUE EXISTE
`references/mapas/world/` recebeu 42 PNG (21 imagens, cada uma duplicada com
sufixo `-1`, byte a byte identicas) de DOIS videos de YouTube:

  arma     11 quadros do mod "Exilados Brasil / Morro do Exilio" em Arma
           Reforger (engine Enfusion, PC/console)
  plantao  10 quadros de "Plantao Online", FPS brasileiro de celular

Do jeito que chegaram elas NAO alimentam regua nenhuma, e a razao esta escrita
no proprio motor: `foto_vs_render.py` ja' pagou pela "contaminacao de HUD no
ceu_frac", em que HUD chapado foi lido como ceu e os mapas mediram 0,48-0,71
contra 0,15 das fotos. Aqui a contaminacao e' PIOR — alem do HUD do jogo tem
barra de titulo do YouTube, controles do player, chat, banner de inscricao, QR
code de PIX e marca d'agua de servidor, entre 15% e 30% do quadro.

O QUE ELE FAZ
  1. deduplica (o sufixo `-1` e' copia exata, conferida por hash)
  2. recorta a moldura do YouTube: a tarja preta por imagem, e a barra de
     titulo (que e' overlay) por CONSENSO entre os quadros
  3. aplica a CURADORIA abaixo, que descarta quadro que nao e' cena de rua
  4. grava PROVENIENCIA.tsv na mesma convencao de
     `references/favela/fotos-reais/PROVENIENCIA.tsv`

O QUE ELE NAO FAZ, DE PROPOSITO
Nao mascara o HUD do jogo. Mascara e' area de medida perdida e por isso mora
num lugar so' — os perfis `UI_PERFIS` de `foto_vs_render.py`, ao lado do perfil
do CORO SOLTO. LICAO 2 do docs/LICOES.md e' exatamente isto: dois limiares para
o mesmo conceito fazem o instrumento discordar de si.

O PAPEL DESTE CORPUS, E ELE NAO E' O QUE PARECE
Estes quadros NAO substituem as 18 fotografias do Wikimedia como alvo. O motor
tem uma invariante declarada: "ALVO VEM DA FOTO. Nenhum numero redondo escolhido
a mao". Render de outro jogo nao e' fotografia, e medir contra ele responderia
"quao perto estamos do Plantao Online", que e' outra pergunta.

Eles entram como RENDER, no mesmo cano dos nossos mapas, contra as MESMAS 18
fotos. O que se aprende com isso e' o que nenhum documento sabia dizer: em
quantos sigmas da fotografia real esta' um FPS de celular que ja' e' aceito como
"parece favela" — e portanto qual e' o alvo ATINGIVEL, medido em vez de decretado.

USO
  python3 tools/eval/ref-world.py                # prepara e escreve
  python3 tools/eval/ref-world.py --listar       # so' a curadoria, nao escreve
  python3 tools/eval/ref-world.py --alvo         # mede e escreve ALVO.json
"""
import glob
import hashlib
import json
import os
import sys

import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ORIGEM = os.path.join(RAIZ, 'references', 'mapas', 'world')
DESTINO = os.path.join(ORIGEM, 'quadros')

VIDEOS = {
    'arma': 'YouTube — "Esse Mod da Favela no Arma Reforger E REALISTA DEMAIS!" '
            '(servidor [BRASIL/LATAM] EXILADOS BRASIL FAVELA - MORRO DO EXILIO)',
    'plantao': 'YouTube — "O NOVO MAPA NO MODO ONLINE TA MUITO BOM" (Plantao Online)',
}

# ============================================================================
#  CURADORIA — feita A OLHO, com o motivo escrito, e o criterio e' o mesmo de
#  `references/favela/fotos-reais/PROVENIENCIA.tsv`: "a estatistica de um aereo
#  nao se parece com a de um frame de FPS, e comparar os dois mede
#  enquadramento, nao acabamento".
#
#  Aqui o corte equivalente e': o quadro tem que ser CENA DE RUA/QUINTAL vista
#  do nivel do jogador. Cabine de veiculo, tela de inventario, mira ampliada e
#  inspecao de arma medem outra coisa.
#
#  indice -> (fonte, usar, motivo)
# ============================================================================
CURADORIA = {
    1:  ('arma', False, 'interior de veiculo: para-brisa e painel dominam, estatistica de cabine'),
    2:  ('arma', False, 'mira ampliada sobre estrada e gramado, nao ha favela no quadro'),
    3:  ('arma', False, 'inspecao de arma: fuzil dourado ocupa cerca de 40% do quadro'),
    4:  ('arma', True,  'escadaria de morro, muro pintado, Cristo ao fundo'),
    5:  ('arma', False, 'tela de inventario: UI sobre fundo desfocado, nao e cena'),
    6:  ('arma', True,  'quintal com arvore, cadeira de plastico, muro de tijolo'),
    7:  ('arma', True,  'quintal de padaria, alvenaria aparente, cadeira, arvore'),
    8:  ('arma', True,  'escadaria de beco, grade de janela, laje, reboco'),
    9:  ('arma', True,  'rua de morro com poste, muro de placa e casas em laje'),
    10: ('arma', True,  'poste em primeiro plano, rua, muro de placa, caixa d agua'),
    11: ('arma', True,  'rua larga com fachadas pintadas, poste e fios'),
    12: ('plantao', True, 'palmeiras, campo de terra, fios aereos, muro de tijolo'),
    13: ('plantao', True, 'laje com arvores, fachadas laranja e azul ao fundo'),
    14: ('plantao', True, 'campo de terra, palmeira, muro de tijolo com limo'),
    15: ('plantao', True, 'beco com porta de aco, tijolo aparente, pilar de concreto'),
    16: ('plantao', True, 'beco em escada, tijolo aparente, fios cruzando o quadro'),
    17: ('plantao', True, 'laje panoramica: caixa d agua azul, lajes, guindaste de porto'),
    18: ('plantao', True, 'rua com bandeirinhas, carro, portas de aco, grafite'),
    19: ('plantao', True, 'lajes vistas de cima, tijolo aparente, morro ao fundo'),
    20: ('plantao', True, 'rua larga com grafite, palmeira, poste e fios'),
    21: ('plantao', True, 'beco estreito com portao e fachadas em sombra'),
}


def unicos(origem):
    """Os PNG sem o sufixo `-1`. Conferido: as 21 duplicatas sao copia exata."""
    todos = sorted(f for f in os.listdir(origem) if f.endswith('.png'))
    base = [f for f in todos if not f.endswith('-1.png')]
    for f in base:
        gemeo = os.path.join(origem, f[:-4] + '-1.png')
        if not os.path.exists(gemeo):
            continue
        a = hashlib.md5(open(os.path.join(origem, f), 'rb').read()).hexdigest()
        b = hashlib.md5(open(gemeo, 'rb').read()).hexdigest()
        if a != b:
            raise SystemExit(f'ABORTA: {f} e seu gemeo -1 NAO sao identicos; a deduplicacao perderia dado')
    return base


def caixa_letterbox(a):
    """Tarja preta do player: onde comeca e acaba o pixel de video."""
    lin = a.mean(axis=1)
    col = a.mean(axis=0)
    h, w = a.shape
    t = int(np.argmax(lin > 25))
    b = h - 1 - int(np.argmax(lin[::-1] > 25))
    l = int(np.argmax(col > 25))
    r = w - 1 - int(np.argmax(col[::-1] > 25))
    return t, b, l, r


def topo_da_moldura(arrays):
    """Onde acaba a barra de titulo do YouTube — POR CONSENSO entre os quadros.

    POR QUE POR CONSENSO E NAO POR IMAGEM
    A barra e' OVERLAY dentro do video: cinza-escuro com texto branco, ela nao
    sai no recorte da tarja preta. Deixa-la NAO e' cosmetico — `mascara_ceu` do
    motor exige ceu LIGADO A LINHA DO TOPO, e a barra fica em cima dela. Medido:
    `ceu_frac` = 0,00 num panorama de laje com 40% de ceu visivel. E a mascara
    de ceu e' pre-requisito de TODOS os descritores, nao so' do de silhueta:
    sem ela, ceu chapado entra em `superf_chapada` e no espectro.

    Detectar por imagem FALHA, e falha dos dois jeitos. Media com desvio quebra
    na primeira linha de texto branco (o `sd` sobe e o laco para cedo). Mediana
    sem consenso vai fundo demais em quadro cujo topo e' escuro DE VERDADE — os
    tres becos e lajes na sombra deram 282 e 302 contra os 164 dos outros.

    Como as 21 capturas sao da MESMA janela, a moldura tem altura constante, e
    isso e' verificavel: 18 dos 21 quadros concordam em y=164. O consenso e' o
    numero; quadro que discorda esta' dizendo que o TOPO DELE e' escuro, nao que
    a moldura mudou. Sem maioria o tool aborta, em vez de escolher sozinho."""
    votos = {}
    for a in arrays:
        h = a.shape[0]
        t, _b, _l, _r = caixa_letterbox(a)
        med = np.median(a[t:t + int(0.12 * h)], axis=1)
        escuras = np.where(med < 60)[0]
        y = t + (int(escuras.max()) + 1 if len(escuras) else 0)
        votos[y] = votos.get(y, 0) + 1
    y, n = max(votos.items(), key=lambda kv: kv[1])
    if n < len(arrays) * 0.6:
        raise SystemExit(
            f'ABORTA: sem consenso sobre a moldura do YouTube (melhor y={y} com {n}/{len(arrays)} votos).\n'
            f'  votos: {dict(sorted(votos.items()))}\n'
            '  Capturas de janelas diferentes nao podem ser recortadas pelo mesmo y.')
    return y, n, votos


def medir_alvo():
    """Onde esta' o Plantao Online em relacao a FOTOGRAFIA real.

    POR QUE ESTA MEDIDA EXISTE
    O alvo de qualidade estava escrito em prosa ("parece favela", "consistencia
    grafica") e prosa nao reprova nada. Os documentos de referencia trazem
    numero, mas de manual generico: `3d.md` fixa 20k-35k triangulos por
    personagem quando os 63 do disco medem mediana 4.869 — orcamento 4 a 7 vezes
    acima do que existe, e vindo de fora.

    Aqui o alvo e' DERIVADO. O corpus-alvo continua sendo as 18 fotografias do
    Wikimedia (a invariante do motor: "ALVO VEM DA FOTO"). Os quadros do Plantao
    Online entram como RENDER, no mesmo cano. O que sai e' a resposta a pergunta
    que interessa: quantos sigmas separam da fotografia um FPS de celular que o
    publico ja' aceita como favela — e portanto qual e' o alvo ATINGIVEL."""
    import importlib.util
    aqui = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location('fvr', os.path.join(aqui, 'foto_vs_render.py'))
    fvr = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(fvr)

    fotos = sorted(glob.glob(os.path.join(RAIZ, 'references', 'favela', 'fotos-reais', '*.jpg')))
    quadros = sorted(glob.glob(os.path.join(DESTINO, 'plantao_*.jpg')))
    if not fotos or not quadros:
        raise SystemExit('ABORTA: falta corpus. Rode sem --alvo antes, e confira references/favela/fotos-reais/.')

    F = [fvr.descrever(p, 'a') for p in fotos]
    P = [fvr.descrever(p, 'a', 'plantao') for p in quadros]

    fora = {'frac_util'}
    saida = {}
    for k, v in F[0].items():
        if k in fora or not isinstance(v, (int, float)):
            continue
        fv = np.array([d[k] for d in F if isinstance(d.get(k), (int, float)) and np.isfinite(d[k])])
        pv = np.array([d[k] for d in P if isinstance(d.get(k), (int, float)) and np.isfinite(d[k])])
        if len(fv) < 6 or len(pv) < 5:
            continue
        alvo = float(np.median(fv))
        sig = float(np.median(np.abs(fv - alvo)) * 1.4826)
        if sig <= 0:
            continue
        saida[k] = {'foto_mediana': alvo, 'foto_sigma': sig,
                    'plantao_mediana': float(np.median(pv)),
                    'plantao_gap_sigma': float((np.median(pv) - alvo) / sig)}

    dist = float(np.median([abs(v['plantao_gap_sigma']) for v in saida.values()]))
    doc = {
        'o_que_e': 'Alvo de fidelidade DERIVADO por medicao, nao decretado. Corpus-alvo: as '
                   f'{len(fotos)} fotografias do Wikimedia. Referencia de jogo: {len(quadros)} quadros '
                   'de "Plantao Online" (FPS brasileiro de celular), mascarados pelo perfil '
                   '`plantao` de foto_vs_render.py. Gap em sigmas da propria foto.',
        'como_reproduzir': 'python3 tools/eval/ref-world.py --alvo',
        'escala': 'a',
        'n_fotos': len(fotos), 'n_quadros_plantao': len(quadros),
        'distancia_mediana_sigma': dist,
        'leitura': 'Nenhum jogo chega a 0: 0 e a propria fotografia. O numero abaixo e o que '
                   'custa parecer favela num FPS que o publico ja aceita como tal.',
        'descritores': saida,
    }
    caminho = os.path.join(DESTINO, 'ALVO.json')
    with open(caminho, 'w', encoding='utf-8') as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=1)

    print(f'ALVO medido — {len(fotos)} fotos x {len(quadros)} quadros do Plantao Online\n')
    print(f'{"descritor":22s} {"foto mediana":>13s} {"sigma":>8s} {"plantao":>10s} {"gap":>9s}')
    for k, v in sorted(saida.items(), key=lambda kv: -abs(kv[1]['plantao_gap_sigma'])):
        print(f'{k:22s} {v["foto_mediana"]:13.4f} {v["foto_sigma"]:8.4f} '
              f'{v["plantao_mediana"]:10.4f} {v["plantao_gap_sigma"]:+9.2f}')
    print(f'\nDISTANCIA MEDIANA: {dist:.2f} sigma')
    print(f'escrito: {os.path.relpath(caminho, RAIZ)}')


def main():
    if '--alvo' in sys.argv:
        return medir_alvo()
    so_listar = '--listar' in sys.argv
    arquivos = unicos(ORIGEM)
    if len(arquivos) != len(CURADORIA):
        raise SystemExit(
            f'ABORTA: {len(arquivos)} imagens unicas em disco contra {len(CURADORIA)} na CURADORIA.\n'
            '  A curadoria e por INDICE ordenado; imagem nova entra sem motivo escrito e o corpus\n'
            '  passa a medir quadro que ninguem olhou. Atualize a CURADORIA antes de rodar.')

    usados, descartados = [], []
    for i, nome in enumerate(arquivos, 1):
        fonte, usar, motivo = CURADORIA[i]
        (usados if usar else descartados).append((i, nome, fonte, motivo))

    print(f'CORPUS DE REFERENCIA — {len(arquivos)} imagens unicas (de 42 arquivos; 21 duplicatas exatas)')
    for fonte in ('arma', 'plantao'):
        u = [x for x in usados if x[2] == fonte]
        d = [x for x in descartados if x[2] == fonte]
        print(f'  {fonte:8s} {len(u):2d} usados · {len(d)} descartados')
    print(f'  {"TOTAL":8s} {len(usados):2d} usados · {len(descartados)} descartados')
    print('\nDESCARTADOS, com o motivo:')
    for i, _, fonte, motivo in descartados:
        print(f'  [{i:2d}] {fonte:8s} {motivo}')

    if so_listar:
        return

    cinzas = [np.asarray(Image.open(os.path.join(ORIGEM, n)).convert('L')).astype(np.float32)
              for n in arquivos]
    topo, votos_topo, votos = topo_da_moldura(cinzas)
    print(f'\nmoldura do YouTube: y={topo} por consenso ({votos_topo}/{len(arquivos)} quadros)')
    print(f'  votos: {dict(sorted(votos.items()))}')

    os.makedirs(DESTINO, exist_ok=True)
    linhas = []
    for i, nome, fonte, motivo in usados:
        caminho = os.path.join(ORIGEM, nome)
        im = Image.open(caminho).convert('RGB')
        _t, b, l, r = caixa_letterbox(np.asarray(im.convert('L')).astype(np.float32))
        t = topo
        rec = im.crop((l, t, r + 1, b + 1))
        saida = f'{fonte}_{i:02d}.jpg'
        rec.save(os.path.join(DESTINO, saida), 'JPEG', quality=95, subsampling=0)
        ts = nome.replace('Screenshot 2026-08-12 at ', '').replace('.png', '')
        linhas.append(f'{saida}\t{fonte}\t{ts}\t{rec.size[0]}x{rec.size[1]}\t{motivo}')
        print(f'  {saida}  {rec.size[0]}x{rec.size[1]}  (recorte t={t} b={b} l={l} r={r})')

    tsv = os.path.join(DESTINO, 'PROVENIENCIA.tsv')
    with open(tsv, 'w', encoding='utf-8') as fh:
        fh.write('# Quadros de referencia de favela extraidos de video de YouTube.\n')
        fh.write('# NAO sao fotografia: sao render de outro jogo. Por isso entram na regua como\n')
        fh.write('# RENDER (o corpus-alvo continua sendo references/favela/fotos-reais/, do Wikimedia).\n')
        fh.write('# Gerado por tools/eval/ref-world.py; a moldura do YouTube foi recortada pela caixa\n')
        fh.write('# de conteudo medida por imagem. O HUD do jogo NAO e recortado aqui: ele e mascarado\n')
        fh.write('# no motor, pelos perfis UI_PERFIS de foto_vs_render.py.\n')
        for fonte, desc in VIDEOS.items():
            fh.write(f'# fonte {fonte}: {desc}\n')
        fh.write('# arquivo\tfonte\ttimestamp_captura\tpx\tmotivo_da_curadoria\n')
        fh.write('\n'.join(linhas) + '\n')
    print(f'\nescrito: {os.path.relpath(tsv, RAIZ)}')


if __name__ == '__main__':
    main()
