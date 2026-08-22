#!/usr/bin/env python3
"""TRILHA-MEDIDA — régua para a trilha gerada por IA.

POR QUE ESTE SCRIPT EXISTE
Regra da casa (TRILHA-V2, "Regras da casa" nº 1): *régua antes do conserto — escreva a
medição, prove que ela reprova o estado atual, só então conserte*. A avaliação da trilha
era 100% de ouvido, e ouvido não pega o defeito que o dono reportou em 19/08: cinco
vinhetas com estilo correto mas "a mesma música em beats diferentes, tipo trilha de
PowerPoint". Isso é convergência harmônica, e convergência só existe na COMPARAÇÃO —
faixa por faixa soa bem, o conjunto soa igual.

O perfil de referência (`perfil-trilha.json`) foi medido do audio-pack-v6, das 121 faixas
que o jogo usava antes da limpeza: 30 de trilha in-game e 91 de round divididas por
facção. Ele não é opinião sobre o que a trilha deve ser — é o que ela ERA.

O QUE MEDE, E POR QUE CADA UM
  bpm         andamento. O acervo real espalha de 81 a 153 conforme a facção; prompt de
              IA fixa um número e todas saem na mesma velocidade.
  brilho      centróide espectral em Hz. É o "verniz": gravação de rua e sample de VHS
              vivem em 1500-2500 Hz, produção limpa de IA sobe pra 3000+.
  percussivo  fração da energia na camada percussiva (após HPSS). Separa "beat" de
              "música com beat".
  menor       tonalidade. A TRILHA original é 70% menor. Suno sem modo declarado
              entrega maior — e maior genérico É o som de música de estoque.
  modo        modo relativo à tônica (jônio/mixolídio/dórico/frígio/...). É o eixo que a
              v7 dos prompts passou a declarar explicitamente.

LEITURA HONESTA DO NÚMERO
Detecção de tom/modo em clipe curto com fala, aplauso e efeito por cima é RUIDOSA. Trate
`modo` como indício, não veredito — o sinal forte aqui é bpm, brilho e a razão maior/menor
agregada, que se apoiam em muitas faixas. Uma faixa isolada fora da banda não condena nada;
CINCO faixas caindo no mesmo ponto da banda é a convergência que estamos caçando.

USO
  python3 tools/eval/trilha-medida.py <audio> [--grupo=R-F]     mede uma faixa
  python3 tools/eval/trilha-medida.py --conjunto <a> <b> <c>    mede o CONJUNTO (o teste que importa)

  Sem --grupo, mostra a medição sem comparar.
  Grupos: R-E R-B R-U R-C R-F TRILHA

REQUER: pip install librosa
"""
import sys, os, json, warnings, collections
warnings.filterwarnings('ignore')

try:
    import numpy as np, librosa
except ImportError:
    sys.exit('erro: falta librosa. `pip install librosa` (ou --break-system-packages)')

AQUI = os.path.dirname(os.path.abspath(__file__))
PERFIL = os.path.join(AQUI, 'perfil-trilha.json')
NOTAS = 'C C# D D# E F F# G G# A A# B'.split()

# Krumhansl-Schmuckler: perfis de altura para maior e menor
KM = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
Km = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])

# graus presentes em cada modo, relativos à tônica
MODOS = {
    'jônio (maior)':       [1,0,1,0,1,1,0,1,0,1,0,1],
    'mixolídio (b7)':      [1,0,1,0,1,1,0,1,0,1,1,0],
    'lídio (#4)':          [1,0,1,0,1,0,1,1,0,1,0,1],
    'lídio b7 (acústica)': [1,0,1,0,1,0,1,1,0,1,1,0],
    'dórico':              [1,0,1,1,0,1,0,1,0,1,1,0],
    'eólio (menor nat.)':  [1,0,1,1,0,1,0,1,1,0,1,0],
    'frígio':              [1,1,0,1,0,1,0,1,1,0,1,0],
    'menor harmônica':     [1,0,1,1,0,1,0,1,1,0,0,1],
}

def mede(caminho, maxdur=60):
    """Mede uma faixa. Analisa 60 s do MEIO — intro e fade não representam a faixa."""
    d = librosa.get_duration(path=caminho)
    off = max(0, (d - maxdur) / 2) if d > maxdur else 0
    y, sr = librosa.load(caminho, sr=22050, offset=off, duration=min(d, maxdur), mono=True)
    if len(y) < sr:
        raise ValueError('faixa com menos de 1 s de áudio')
    yh, yp = librosa.effects.hpss(y)                       # harmônico / percussivo
    bpm = float(np.atleast_1d(librosa.beat.beat_track(y=yp, sr=sr)[0])[0])
    ch = librosa.feature.chroma_cqt(y=yh, sr=sr).mean(axis=1)
    ch = ch / (ch.sum() + 1e-9)
    cand = [(np.corrcoef(np.roll(KM, i), ch)[0,1], i, 'maior') for i in range(12)]
    cand += [(np.corrcoef(np.roll(Km, i), ch)[0,1], i, 'menor') for i in range(12)]
    cand.sort(reverse=True)
    conf, ton, mm = cand[0]
    rel = np.roll(ch, -ton)                                # cromagrama relativo à tônica
    modo = max(MODOS.items(), key=lambda kv: np.corrcoef(np.array(kv[1], float), rel)[0,1])[0]
    return {
        'dur': d, 'bpm': bpm, 'tom': f'{NOTAS[ton]} {mm}', 'conf': float(conf), 'modo': modo,
        'brilho': float(librosa.feature.spectral_centroid(y=y, sr=sr).mean()),
        'perc': float(np.mean(yp**2) / (np.mean(yp**2) + np.mean(yh**2) + 1e-12)),
    }

def banda(v, faixa, nome, unidade=''):
    """Compara valor com a banda p10-p90 da referência."""
    lo, hi = faixa['p10'], faixa['p90']
    ok = lo <= v <= hi
    seta = '' if ok else (' ABAIXO' if v < lo else ' ACIMA')
    return f"  {nome:12} {v:8.0f}{unidade}   ref {lo:.0f}–{hi:.0f}   {'ok' if ok else 'FORA' + seta}"

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    grupo = next((a.split('=',1)[1] for a in sys.argv[1:] if a.startswith('--grupo=')), None)
    conjunto = '--conjunto' in sys.argv
    if not args:
        sys.exit(__doc__.split('USO')[1].strip())
    ref = json.load(open(PERFIL, encoding='utf-8')) if os.path.exists(PERFIL) else {}
    if grupo and grupo not in ref:
        sys.exit(f'grupo desconhecido: {grupo}. use: {" ".join(ref)}')

    medidas = []
    for f in args:
        if not os.path.exists(f):
            print(f'! não achei: {f}'); continue
        try:
            m = mede(f); m['arq'] = os.path.basename(f); medidas.append(m)
        except Exception as e:
            print(f'! {f}: {e}'); continue
        print(f"\n{m['arq']}  ({m['dur']:.0f}s)")
        print(f"  tom          {m['tom']:>10}   modo {m['modo']}  (confiança {m['conf']:.2f})")
        if grupo:
            r = ref[grupo]
            print(banda(m['bpm'], r['bpm'], 'bpm'))
            print(banda(m['brilho'], r['brilho_hz'], 'brilho', ' Hz'))
            print(f"  {'percussivo':12} {m['perc']:8.2f}    ref {r['percussivo']['p10']:.2f}–{r['percussivo']['p90']:.2f}   "
                  f"{'ok' if r['percussivo']['p10'] <= m['perc'] <= r['percussivo']['p90'] else 'FORA'}")
        else:
            print(f"  {'bpm':12} {m['bpm']:8.0f}")
            print(f"  {'brilho':12} {m['brilho']:8.0f} Hz")
            print(f"  {'percussivo':12} {m['perc']:8.2f}")

    if conjunto and len(medidas) > 1:
        # O TESTE QUE IMPORTA: mesmice é propriedade do conjunto, não da faixa.
        print('\n' + '=' * 62)
        print(f'CONJUNTO — {len(medidas)} faixas')
        bpms = sorted(m['bpm'] for m in medidas)
        modos = collections.Counter(m['modo'] for m in medidas)
        menor = sum(1 for m in medidas if m['tom'].endswith('menor'))
        espalha = (bpms[-1] - bpms[0])
        print(f"  BPM         {bpms[0]:.0f}–{bpms[-1]:.0f}  (espalhamento {espalha:.0f})")
        print(f"  modos       {len(modos)} distintos em {len(medidas)} faixas: "
              + ' · '.join(f'{k.split()[0]} {v}' for k, v in modos.most_common()))
        print(f"  menor       {100*menor//len(medidas)}%   (acervo original: TRILHA 70%, rounds 44–64%)")
        print()
        alerta = []
        if espalha < 15:
            alerta.append(f'BPM espalha só {espalha:.0f} — todas no mesmo andamento. O acervo original espalha 60+.')
        if len(modos) <= max(1, len(medidas)//3):
            alerta.append(f'só {len(modos)} modo(s) em {len(medidas)} faixas — é a convergência harmônica. '
                          'Declare modo diferente por facção (PROMPTS-SUNO seção 3).')
        if menor == 0:
            alerta.append('nenhuma faixa em menor. Maior genérico é a assinatura de música de estoque.')
        if alerta:
            print('  CONVERGÊNCIA DETECTADA:')
            for a in alerta: print(f'   · {a}')
        else:
            print('  conjunto diverge — sem convergência óbvia nos eixos medidos.')
        print('=' * 62)

if __name__ == '__main__':
    main()
