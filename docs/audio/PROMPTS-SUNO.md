# PROMPTS SUNO — v7: DIVERGÊNCIA HARMÔNICA (19/08/2026)

> Sintoma reportado pelo dono na v6: "o estilo tocado está correto e dá pra
> identificar, a qualidade está boa, **mas é a mesma melodia em estilos
> diferentes** — parece uma música só tocada em beats diferentes. Tem ar de
> comercial de série americana dos anos 90, música de apresentação de PowerPoint,
> de template do Canva."
>
> Esse diagnóstico está certo e tem causa única. Seção 1.

---

## 1. POR QUE TODAS SAÍRAM IGUAIS

### 1.1. Tag de estilo controla timbre e ritmo. Não controla harmonia.

Todo prompt da v6 diz **quais instrumentos**, **qual produção** e **qual andamento**.
Nenhum diz **quais notas**. Harmonia e melodia ficaram sem especificação.

Quando um parâmetro fica sem especificação, o modelo não sorteia — ele **cai no
centróide do que treinou**. O centróide de música ocidental gravada é pop comercial:
tônica–quinta–sexta menor–quarta, frase de 4 compassos, tonalidade maior, melodia
que sobe no compasso 1 e resolve no 4.

**Música de estoque é literalmente isso.** Trilha de PowerPoint, vinheta do Canva e
comercial americano dos anos 90 soam iguais entre si pelo mesmo motivo que as suas
cinco facções soaram iguais entre si: são todas o centro estatístico do pop.

Então: timbre certo + harmonia centróide = **a mesma música tocada com instrumentos
diferentes**. É exatamente a frase que o dono usou.

### 1.2. Por que a v6 piorou isso em vez de melhorar

Os cinco prompts da v6 têm a **mesma forma**: gênero, instrumentos, mood, produção,
BPM, ~12 tags. Só o vocabulário muda. Prompts com a mesma estrutura variando só o
adjetivo de gênero convergem — todos pedem a mesma coisa em cinco fantasias.

Divergência de verdade precisa acontecer em **eixos diferentes por facção**, não no
mesmo eixo com valores diferentes.

### 1.3. A digital do "PowerPoint", item por item

O que denuncia música de estoque, e o que fazer com cada um:

| Marca do estoque | Onde entrou | Antídoto |
|---|---|---|
| I–V–vi–IV | harmonia não especificada | especificar modo e progressão (seção 3) |
| tudo em 4/4 | nenhum prompt pediu métrica | marcha em **2/4**, galope em **6/8** |
| levada de 8 compassos com virada | instinto de arranjo do Suno | `single section, unresolved vamp` + Exclude `build up, riser, cymbal swell` |
| palmas no 2 e 4 | timbre padrão de pop | Exclude `hand claps, finger snaps` |
| tonalidade maior "positiva" | ausência de modo | modo declarado por facção |
| melodia que resolve na tônica | ausência de instrução de cadência | `unresolved vamp, phrase does not cadence` |

---

## 2. EXCLUDE ANTI-ESTOQUE (novo — o de maior alavanca)

O jeito mais direto de sair do centróide é **nomear o centróide no Exclude**.
"corporate", "stock music" e "uplifting" são rótulos de gênero que o Suno conhece,
e são precisamente o que o dono descreveu. Colar em **toda** geração:

    corporate, stock music, uplifting, motivational, inspirational, advertising jingle, hand claps, riser, cymbal swell

Junto com a base do instrumental:

    vocals, choir, spoken word

Total: 12. Já é o teto — não engorde mais. Se precisar excluir algo específico da
facção, troque um item genérico, não some.

---

## 3. IMPRESSÃO DIGITAL HARMÔNICA POR FACÇÃO

A regra nova: **cada facção diverge num eixo diferente**. Não é o mesmo template com
gênero trocado — é modo diferente, métrica diferente e relação com a harmonia diferente.
Assim elas **não conseguem** convergir, mesmo que o Suno queira.

| Facção | Modo / harmonia | Métrica | Como diverge |
|---|---|---|---|
| **E** protesto | maior com **baixo cromático descendente** e acordes diminutos de passagem (herança de choro/marchinha), volta II7–V7 | **2/4** | métrica e cromatismo no baixo |
| **B** sertanejo | maior diatônico — aqui o centróide **está certo** — mas com **melodia em terças paralelas** (marca da dupla) | 4/4 | timbre da viola + terças, não harmonia |
| **U** punk | **power chord sem terça** → harmonicamente ambíguo, i–VI–VII | 4/4 rápido | ausência de terça: não tem como soar maior-alegre |
| **C** circo | **cromático**, sétimas diminutas, aumentados de passagem, modulação pra subdominante no trio | **6/8 galope** | é a harmonia mais anti-pop que existe |
| **F** funk | **sem harmonia** — uma nota só | 4/4 | remove a variável inteira |
| **Menu** praça | **modal, um acorde só**, vamp sem cadência | 4/4 lento | drone: não tem progressão pra ser centróide |

Duas notas de procedência, porque isso é afirmação técnica e não gosto:

- **Escala nordestina** (útil pra facção B e pro menu, se quiser virar pro Nordeste):
  é uma família — mixolídio (♭7), lídio ♭7 (lídio ♯4 + ♭7, a "escala acústica") e
  dórico. O traço comum é **rejeitar a sétima maior como sensível**, preferindo a
  sétima menor. Mixolídio é o mais usado em **baião e frevo**. Pedir `mixolydian
  flat seven, no leading tone` tira a música do pop por construção — a sensível é o
  que puxa pra cadência pop.
- **Tamborzão**: criado em 1997 por **DJ Luciano Oliveira e DJ Cabide** na bateria
  eletrônica **Roland R-8 MK-II**, seguindo a **cadência do atabaque** — não é o
  Volt Mix (1988) que dominou o funk carioca antes dele. Citar `Roland R-8 drum
  machine` e `atabaque cadence` no prompt é mais específico e mais fiel do que
  "tamborzão" sozinho, que o Suno interpreta como "batida latina genérica".

### 3.1. Bandas medidas do acervo real (audio-pack-v6)

Não é opinião: são as **121 faixas que o jogo usava antes da limpeza** — 30 de trilha
in-game e 91 de round por facção — medidas com `tools/eval/trilha-medida.py`.

| Grupo | BPM p10–p90 | mediana | brilho (Hz) | **% em menor** |
|---|---|---|---|---|
| R-E protesto | 83–134 | 120 | 1493–2618 | 57% |
| R-B sertanejo | 81–149 | 123 | 1512–2722 | 64% |
| R-U punk | 85–148 | 123 | 1923–3034 | 44% |
| R-C circo | 89–144 | 123 | 1117–2541 | 48% |
| R-F funk | 96–144 | 126 | 1790–3187 | 64% |
| **Trilha in-game** | 86–153 | 129 | 1339–2733 | **70%** |

Três leituras que mudam os prompts:

1. **O acervo real é 44–70% MENOR.** A trilha in-game é 70%. Prompt sem modo declarado
   entrega maior — e maior genérico é a assinatura sonora de música de estoque. Onde a
   facção comporta, **peça menor explicitamente**.
2. **BPM não é o eixo que diferencia.** As medianas de todas as facções caem entre 120 e
   129 — o acervo real também converge aí. O que diverge é o **espalhamento** (60+ BPM
   dentro de cada facção). Ou seja: não tente separar as facções por andamento, separe por
   **modo**; e varie o BPM dentro da banda entre gerações pra o conjunto não soar metrônomo.
3. **Brilho entre 1100 e 3200 Hz.** Acima disso é verniz. Abaixo, é abafado demais.
   `tools/eval/trilha-medida.py` mede isso direto.

### 3.2. A régua — `tools/eval/trilha-medida.py`

Regra da casa nº 1 do `TRILHA-V2.md`: *régua antes do conserto*. Mesmice é propriedade do
**conjunto**, não da faixa — faixa por faixa soa bem, e foi por isso que passou batido.

    python3 tools/eval/trilha-medida.py <audio> --grupo=R-F      # uma faixa vs a banda
    python3 tools/eval/trilha-medida.py --conjunto a.mp3 b.mp3 c.mp3 d.mp3 e.mp3

O modo `--conjunto` é o que importa. Ele acusa convergência em três eixos: espalhamento de
BPM, número de modos distintos e razão maior/menor. Validado nos dois sentidos — fica
**vermelha** num conjunto sintético de 5 faixas em Dó maior 120 BPM com timbres diferentes
(a simulação exata do defeito: espalhamento 0, 1 modo, 0% menor), e **verde** em 5 faixas
reais do acervo (espalhamento 63, 3 modos, 60% menor).

Detecção de modo em clipe curto com fala e efeito por cima é ruidosa — trate `modo` como
indício. O sinal confiável é BPM, brilho e a razão maior/menor agregada.

---

## 4. CONFIGURAÇÃO (o que muda da v6)

Igual à v6, com **duas mudanças**:

| Parâmetro | Loop (menu / trilha) | Vinheta (round / capture) |
|---|---|---|
| Instrumental | ON, caixa de letra **vazia** | ON, caixa **vazia** |
| Style Influence | 85% | 85% |
| **Weirdness** | **45%** (era 30) | **65%** (era 55) |

Subi os dois. Weirdness é literalmente "quanto se afasta da norma do gênero", e a
norma do gênero é o centróide que estamos combatendo. 30% no menu era conservador
demais — era pedir estoque. Acima de 70% começa a fragmentar; 45/65 é o teto útil.

Continua valendo da v6: negação no Style não funciona, 8–15 tags, toggle Instrumental,
duração sai no corte, e Style Reference só com áudio nosso ou CC0.

---

## 5. PROMPTS v7

> Exclude de todos = a lista da seção 2, salvo onde indicado.
> Ordem nova das tags: **modo e harmonia primeiro**, instrumento depois. O que vem
> no começo pesa mais, e harmonia é o que estava faltando.

---

### M1. MENU — praça ao entardecer (drone modal)

Berimbau é **monocórdio**: toca duas ou três alturas. Harmonia de berimbau é drone
por natureza — é a facção-menu que menos corre risco de virar pop, desde que a gente
não deixe o Suno inventar acordes por baixo.

**Style**

    single chord modal vamp, no chord changes, unresolved drone in D minor, berimbau monochord ostinato two pitches, nylon string guitar roda pattern, tamborim and agogô, warm upright bass on one root note, late afternoon, steady unchanging groove, live room recording, warm analog, 90 BPM

**Exclude** (base + anti-progressão)

    vocals, choir, corporate, stock music, uplifting, motivational, advertising jingle, hand claps, riser, chord progression, key change, piano

**Weirdness 45% · Pós**: `--tipo=menu --min=25 --max=50`

---

### M2. MENU alternativa — virada nordestina

Variação real, não versão do M1: muda o modo, não o instrumento.

**Style**

    mixolydian flat seven modal instrumental, no leading tone, nordestino scale melody, zabumba and triangle baião pattern, sanfona accordion melody, nylon guitar, sparse, steady unchanging groove, unresolved vamp, live room recording, 84 BPM, baião

**Exclude**: base da seção 2 + `minor key, cinematic`

**Weirdness 45% · Pós**: `--tipo=menu --min=25 --max=50`

---

### T1–T3. TRILHA IN-GAME — funk (harmonia zero)

O funk é a facção onde a solução é **remover a variável**. Se aparecer progressão de
acordes num beat de tamborzão, está errado — não é estilo, é o Suno preenchendo.

#### T1. Proibidão 2K24

    single bass note only, no chord progression, atabaque cadence, Roland R-8 drum machine, hard dry tamborzão pattern, booming distorted sub on one root, repetitive two-bar loop, steady unchanging groove, raw bedroom recording, tape saturation, mono, 132 BPM

**Exclude**: base + `chord progression, melodic synth lead, piano, build up`

#### T2. Mandelão SP

    one repeated bass note, no harmony, extremely minimal beat, dry stuttered kick pattern, hypnotic repetition, single section, drum machine, raw bedroom recording, mono, 125 BPM, mandelão

**Exclude**: base + `chord progression, melody, snare rolls, build up`

#### T3. Raiz 90s

    two note bass riff, no chord changes, classic dry tamborzão rhythm, atabaque cadence, warm saturated bass, drums and bass only, steady unchanging groove, cassette tape recording, lo-fi, mono, 128 BPM

**Exclude**: base + `chord progression, synth pads, piano, build up`

**Pós**: `--tipo=soundtrack --slug=<nome> --min=16 --max=40`

---

### R-E. TIME E — marchinha de protesto (2/4, baixo cromático)

**Style**

    2/4 marcha, chromatic descending bass line, diminished passing chords, II7 V7 turnaround, choro harmony, street protest drum corps, surdo and caixa marching pattern, sharp referee whistle hits, brass band melody, raw outdoor recording, live and loose, 112 BPM

**Exclude**: base + `4/4, cinematic, synth`

**Weirdness 65% · Pós**: `--tipo=round --team=E --slug=praca-do-povo --dur=18`

**Capture E**: corte da mesma geração — `--tipo=capture --team=E --slug=apito-assembleia --dur=2`

---

### R-B. TIME B — sertanejo universitário (terças paralelas)

Único onde o centróide pop está **correto** — a facção B é a estética de som caro de
caminhonete. A divergência aqui é de timbre e de melodia, não de harmonia: **terça
paralela** é a assinatura da dupla sertaneja e nenhuma outra facção vai ter isso.

**Style**

    melody in parallel thirds, two voices harmonizing a third apart, viola caipira ponteado lead, major key, electric guitar power chords, punchy electronic kick and clap, accordion stabs, confident anthem energy, polished country pop production, wide stereo, 128 BPM, sertanejo universitário

**Exclude**: base **menos** `polished` — aqui produção cara é caracterização.
Use: `vocals, choir, stock music, advertising jingle, riser, lo-fi, orchestral, edm`

**Weirdness 65% · Pós**: `--tipo=round --team=B --slug=agro-e-pop --dur=18`

**Capture B** — gere separado, é efeito e não música:

    truck air horn blast, diesel engine rev, single short hit, raw field recording

---

### R-U. TRIBOS — punk (power chord, sem terça)

Power chord é tônica + quinta, **sem terça**. Sem terça não existe maior nem menor —
a música fica harmonicamente ambígua e não tem como soar "positiva de comercial".
É a facção onde o antídoto é o próprio gênero.

**Style**

    power chords with no third, root and fifth only, i VI VII minor punk vamp, three chord distorted guitar riff, fast driving snare and hi-hat, simple root note bass, blown out amp, one take band in a room, cheap microphone, 156 BPM, garage punk

**Exclude**: base + `major key, clean production, synth`

**Weirdness 65% · Pós**: `--tipo=round --team=U --slug=fora-da-praca --dur=16`

**Capture U**: `--tipo=capture --team=U --slug=power-chord --dur=2`

---

### R-C. PALHAÇOS — screamer march (cromático, 6/8)

A marcha de circo americana — o *screamer* — é construída em corridas cromáticas,
sétimas diminutas e modulação pra subdominante no trio. É a harmonia mais distante
do pop que existe no repertório popular. Se alguma facção não pode soar PowerPoint,
é esta.

**Style**

    6/8 galop screamer march, chromatic runs, diminished seventh chords, augmented passing chords, modulation to subdominant in the trio, oompah tuba and bass drum, crash cymbal accents, clown horn honks, calliope organ, vintage circus band, old mono recording, 150 BPM

**Exclude**: base + `4/4, modern production, synth`

**Weirdness 65% · Pós**: `--tipo=round --team=C --slug=o-circo-armou --dur=16`

**Capture C**: `--tipo=capture --team=C --slug=buzina-palhaco --dur=2`

---

### R-F. FUNKEIROS — tamborzão de vinheta

**Style**

    single bass note, no chord progression, atabaque cadence, Roland R-8 drum machine, hard dry tamborzão beat, booming distorted sub, aggressive kick pattern, steady groove, raw bedroom recording, tape saturation, mono, 130 BPM

**Exclude**: base + `chord progression, melodic synth lead, piano, build up`

**Weirdness 65% · Pós**: `--tipo=round --team=F --slug=quebrada-e-nossa --dur=18`

**Capture F**: `--tipo=capture --team=F --slug=levou-a-quebrada --dur=2`

---

## 6. TESTE DA MESMICE

O erro da v6 foi julgar uma faixa por vez. Mesmice só aparece na comparação.

1. Gere as 5 vinhetas de round.
2. **Toque as 5 em sequência, sem pausa.** É o teste — o jogador vai ouvir todas
   ao longo de uma partida.
3. **Rode a régua no conjunto** — ela mede o que o ouvido perde em faixa isolada:

       python3 tools/eval/trilha-medida.py --conjunto r-e.mp3 r-b.mp3 r-u.mp3 r-c.mp3 r-f.mp3

   Alvo: espalhamento de BPM acima de 40, pelo menos 3 modos distintos, e entre 40% e
   70% em menor. Abaixo disso ela acusa CONVERGÊNCIA e diz em qual eixo.
4. Pergunta de ouvido, depois do número: *dá pra confundir duas delas de olhos fechados?*
   Se der, as duas estão no mesmo eixo. Mude o **modo** ou a **métrica** de uma, nunca o
   instrumento — timbre não foi o problema.
5. Só depois avalie qualidade individual.

Registre no CHANGELOG qual eixo você mudou.

---

## 7. PIPELINE — `tools/trilha-ia.mjs`

Sem mudança da v6. Baixe o MP3, passe pelo script, rode `npm run audio`.

    node tools/trilha-ia.mjs ~/Downloads/x.mp3 --tipo=menu --min=25 --max=50
    node tools/trilha-ia.mjs ~/Downloads/x.mp3 --tipo=round --team=F --slug=nome --dur=18
    npm run audio

`--dry` mostra sem escrever · `--start=S` força o início · `--suja=0..3` degrada ·
`--out=DIR` grava fora de `public/audio` pra revisar antes.

---

## 8. AS FAIXAS REAIS — nomes perdidos, digital recuperada

Ideia do dono: em vez de gênero genérico, fazer **paródia das faixas que o jogo já
usava**. A ideia está certa. A execução mudou de caminho por causa do que a investigação
encontrou.

### 8.1. Os nomes não existem mais

Busca no repo inteiro: `public/audio/` é gitignored, o `build-audio-pack.mjs` rehasheia
tudo pra `audio/a/<sha1-16>.mp3` e o `TRACKS.txt` (mapa nome-real → mNN) é explicitamente
excluído do pacote. Sobraram **dois** nomes, ambos em comentário de código do
`gen-audio-manifest.mjs`: `...olodum (1).mp3` e `mc tevez - pam pam tim pam.mp3`.

Baixei o `audio-pack-v6.zip` (182 MB, 321 arquivos) pra ler as tags ID3 de dentro dos
arquivos hasheados. **Não há tag de artista nem de título em nenhum dos 318 mp3.** O que
sobrou de metadado são marcas de contêiner — `major_brand: dash`, `compatible_brands:
iso6mp41`, encoder `Lavf62.3.100` — ou seja: baixados do YouTube em DASH e re-encodados
com ffmpeg, que descartou as tags no caminho. Os nomes estão perdidos de verdade.

### 8.2. Mas o nome nunca foi o entregável

O que a paródia precisa não é o nome do artista — é a **digital sonora**: modo, levada,
formação instrumental, época, produção. Isso está no áudio e foi medido: é a seção 3.1.
As bandas ali **são** o retrato do acervo real. Prompt calibrado por elas é paródia de
estilo do acervo, feita a partir de medição em vez de memória.

Se você lembrar dos nomes, me diga — dá pra refinar por faixa. Mas o caminho de medição
já entrega o essencial e não depende de lembrar de nada.

### 8.3. E é o caminho legalmente limpo

Não é ressalva burocrática — é a diferença entre resolver e recriar o problema que o
`ROTEIRO-AUDIO-IA.md` foi escrito pra resolver:

- ✅ **Paródia de estilo por medição**: modo, levada, formação, época, produção. É o que a
  seção 3 já faz. Limpo.
- ❌ **Nomear o artista no prompt**: viola o ToS do Suno, e os guias de prompt são unânimes
  em que descrever característica sonora funciona melhor que citar nome.
- ❌ **Pedir a melodia da faixa**: melodia é a obra protegida. Imitar melodia produz obra
  derivada — exatamente o que a limpeza do áudio pirata veio desfazer, entrando pela porta
  dos fundos.

## 9. APOSENTADO DA v6

- ❌ Prompts sem especificação de harmonia — a causa da mesmice
- ❌ Cinco prompts com a mesma estrutura variando só o gênero — convergem por construção
- ❌ Tudo em 4/4 — marcha vai pra 2/4, circo pra 6/8
- ❌ Weirdness 30% no menu — era pedir estoque
- ❌ Julgar faixa por faixa — mesmice é propriedade do conjunto; use `--conjunto`
- ❌ Separar facção por BPM — a medição mostra que o acervo real não separa assim
  (medianas todas entre 120 e 129). Separação é por **modo**.
- ❌ Supor que o acervo era maior/alegre — é 44–70% **menor**, e a trilha in-game 70%
- ✅ Mantido: toggle Instrumental + caixa vazia, negação só no Exclude, 8–15 tags,
  duração no corte, `trilha-ia.mjs` sem alteração
- ✅ Novo: `tools/eval/trilha-medida.py` + `tools/eval/perfil-trilha.json` (perfil medido
  das 121 faixas do audio-pack-v6)
