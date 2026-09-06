# Claude lane — mapas legados (inventário medido)

> Substitui a versão anterior deste arquivo, que era um esboço com números escritos à mão.
> **Todo número abaixo foi medido nesta worktree**, em node puro, com o harness de produção
> (`tools/eval/harness.mjs` → `MAPS[id].build`). Onde a medição não alcança, está dito.

- Branch: `claude/mapas-legado-qualidade` · HEAD `d7e93b1e` · versão `2.0.0-alpha.233`
- Escopo: `piscina_treta`, `penitenciaria`, `parque_treta`, `posto_treta`, `obras_prefeitura`,
  `atacadao_treta`. Não toca Míticos, Sertão, Amazônia, Escadão, Campinho, Joá nem viewmodels.
- Nenhuma alteração de runtime nesta rodada: só inventário, diagnóstico e receita.

## Como os números foram obtidos (reprodutível)

```
npm run eval:mapcontrato                     # contrato de mapa + conexidade do grafo
node tools/eval/map-check.mjs <mapId>        # MAP1/MAP2/MAP2B/MAP4/MAP5 + CTF1/CTF2
node tools/eval/texel-check.mjs              # TEXEL1..TEXEL5 (densidade px/m)
node tools/eval/ambience-registry-check.mjs  # AR1..AR4 (vida no mapa)
node tools/eval/audio-runtime-assets-check.mjs
```

**Limite declarado, e ele muda a leitura de três mapas:** em node nenhum GLB carrega —
`placeProp` devolve `null` (`public/js/mapprops.js:55`). Logo, as contagens de malha/triângulo
de `posto_treta`, `obras_prefeitura` e `atacadao_treta` são **só a parte procedural**; a carga
real de GLB está medida à parte, em MB de disco.

**Também é preciso dizer o que NÃO é portão**, porque metade dos defeitos abaixo sobreviveu
justamente por isso:

- `tools/eval/map-check.mjs` — a "régua dos 4 defeitos de mapa que o dono relatou" — não tem
  `process.exit` e não está em nenhum script do `package.json`. Ela **relata**, não reprova.
- `tools/eval/cena-tetos.mjs` tem teto de custo de cena para 5 mapas, e só `piscina_treta` é
  desta lane. Os outros cinco não têm orçamento de draw call nenhum.
- No `check:fast`, destes seis mapas só entram `eval:mapcontrato`, `eval:parquewheel` e
  `eval:penitenciaria`.

As únicas réguas com dente aqui são `eval:mapcontrato` (verde nos 6) e
`ambience-registry-check` (vermelha nos 6, e fora do `check:fast`).

## Quadro geral medido

| | piscina | penitenciaria | parque | posto | obras | atacadao |
|---|---|---|---|---|---|---|
| Área jogável (m²) | 1 617 | 6 990 | 5 142 | 3 905 | 3 795 | 3 723 |
| Waypoints · arestas | 74 · 300 | 584 · 3 672 | 410 · 2 606 | 280 · 1 596 | 314 · 1 923 | 283 · 1 278 |
| Malhas procedurais (draw calls) | 511 | **1 122** | 340 | 269 | 271 | 317 |
| Triângulos procedurais | 4 428 | 48 130 | 15 517 | 2 810 | 11 612 | 3 412 |
| GLB baixado por partida | 0 | 0 | 0 | **16,35 MB** | 15,23 MB | 12,17 MB |
| TEXEL1 mediana px/m (banda 64–512) | ok | **4,0** | 28,2 | 32,3 | ok | 42,4 |
| TEXEL2 área abaixo de 64 px/m (teto 10%) | 41,1% | 82,6% | 70,4% | **98,2%** | 11,2% | 91,1% |
| MAP2 exposição do respawn | 15,8/15,6% | 79,3/76,1% | 51,9/52,2% | 72,0/73,2% | **88,5/89,0%** | 45,9/**7,8%** |
| MAP5 pior espaçamento de cobertura (≤7 m) | 5,44 | 20,6 | 17,35 | 10,52 | **99** | 14,05 |
| CTF1 altura do triângulo | 12 m | **0 m** | 4,79 m | 14 m | 19 m | 18 m |
| CTF1 menor distância bandeira→spawn | 7,62 m | 5,83 m | 10,55 m | 18,11 m | 17,12 m | **5,00 m** |
| CTF2 rotas separadas (mín.) | 2 | 4 | 3 | 4 | 4 | 2 |
| Custo de rota spawn→MID (E / B) | 41,6 / 39,6 | 54,9 / 59,4 | **69,8 / 33,6** | 40,5 / 40,5 | 36,8 / 42,6 | **36 / 67,1** |
| Grafite (`graffiti_pass`) | sim | **não** | **não** | sim | sim | sim |
| `ambience` (AR1) | **não** | **não** | **não** | **não** | **não** | **não** |
| Trilha de áudio | genérica | genérica | genérica | genérica | genérica | genérica |

Duas colunas merecem nota porque contrariam o esboço anterior:

- **Áudio não está zerado.** `tools/audio/fab-game-local.mjs` declara `mapSoundscapes` para os
  16 mapas e `eval:audioruntimeassets` passa. O que os seis não têm é soundscape **próprio**:
  recebem `Wind_Loop`/`Water_Stream` genéricos, enquanto Amazônia, Córrego, Lajes e Escadão
  declaram `sound:{loops,bioma}` posicional no próprio mapa. Ambiência **visual** (fauna), essa
  sim, é zero nos seis — `AR1` está vermelha.
- **Contrato de mapa está verde nos seis** (`eval:mapcontrato`): grafo conexo, `findPath`
  indexando nós válidos, todas as chaves que o `game.js` desreferencia sem guarda.

---

## Fichas

### 1. `piscina_treta` — Piscina da Treta

- **Arquivo/estado.** `public/js/map_piscina.js`, 810 linhas. Salão fechado herdado do mapa de
  piscina do CS 1.6; o id antigo foi renomeado na rodada de 11/08 e sobrevive só no
  `ALIAS_MAPA` de `maps.js`. (O id de origem não é citado aqui de propósito: a M1 do
  `eval:mapid` reprova id no estilo CS em qualquer arquivo varrido, e um relatório não está
  na lista de dispensa — corretamente, porque não precisa nomeá-lo para dizer o que diz.)
- **Histórico.** 12 commits, **nenhum PR de mapa próprio** — o mapa entrou antes e foi sendo
  puxado por rodadas transversais: BUG-32 (bandeira com nome de Brasília, `db7c1514`), pacote de
  grafite (`5da7fc0c`, cobertura medida 99%), custo de cena (`77a4c088`, #198).
- **Assets/licença.** 100% procedural: zero GLB, zero prop no registro. Sem exposição de marca.
  Grafite vem do pacote `or-*` versionado. **Risco de licença: nenhum.**
- **Gargalos visuais.** TEXEL2 41,1% da área estrutural abaixo de 64 px/m — as piores são um
  `PlaneGeometry` de 285 m² a 33,9 px/m e duas caixas de 846 m² a 52,8 px/m (superfícies grandes
  recebendo UV 0→1). TEXEL3b 9,1× e TEXEL4 (13 superfícies horizontais com `anisotropy < 4`).
  TEXEL5: 7,4% da área sem medida — provável decalque ausente (`scripts/fetch-decals.sh`).
- **Desempenho.** 511 malhas procedurais, 0 MB de GLB. É o mapa mais barato dos seis.
- **Rotas.** O único que passa MAP5 (espaçamento 5,44 m ≤ 7). CTF1 saudável (triângulo 12 m,
  bandeira mais próxima a 7,62 m do spawn). Exposição do respawn a mais baixa do grupo
  (15,8%/15,6%). **Ponto fraco único: CTF2 mínimo de 2 rotas separadas** — empatado com o
  atacadão em último. Área de 1 617 m² é **menos da metade** do segundo menor mapa do grupo, com
  74 waypoints (1 nó por 21,8 m², contra 12–14 m² nos outros).
- **Áudio/ambiência.** `mapSoundscapes.piscina_treta` = `Water_Stream_Calm` + splash. Sem
  `ambience`, sem `sound:` próprio. `AMB_LOOPS.piscina` existe em `soundscape.js` e **nenhum
  mapa o consome**.
- **Pendência conhecida.** BUG-103 (`KNOWN-BUGS.md:4288`) cita Piscina e Loja H como os dois
  mapas onde a partida às vezes inicia fora do mapa em produção; a deriva cliente/servidor foi
  corrigida, mas o caso de produção **nunca foi reproduzido** e o próprio texto pede canário.
- **Adjacente.** `map_piscinao_ramos.js` (2 178 linhas, "Piscinão de Ramos") existe no disco
  **fora do registro**, por decisão documentada (`docs/docs/colaborar.md:280`). É o maior bloco
  de código de mapa não embarcado do repositório e um candidato explícito a decisão
  publicar-ou-arquivar.
- **Esforço.** Baixo. Não há defeito de justiça a corrigir; o trabalho é UV/anisotropia,
  ambiência e (opcional) abrir uma terceira rota.

### 2. `penitenciaria` — Penitenciária da Treta

- **Arquivo/estado.** `public/js/map_penitenciaria.js`, 247 linhas mas 24 KB (linhas longas).
- **Histórico.** 3 commits: entrada pelo PR **#335** junto com o Velho Oeste (`f87ff467`,
  17/08); correção do crash de `'smg'` inexistente em `_updatePickups` (**#366/#367**,
  `c9f16738`); invariantes MAT2/TEX1 (`73376147`).
- **Conteúdo — o ponto do briefing.** O mapa **não cita Carandiru**, não nomeia pessoa real, não
  tem gore e não usa marca. As únicas cadeias de texto são `MUNIÇÃO`, `7.62 MM · 120 CART.`,
  `ALA SUL`, `PÁTIO`, `ALA NORTE`. **O risco é prospectivo, não presente**: ele só aparece se
  alguém tematizar o mapa como Carandiru. Recomendação: manter a identidade genérica
  ("Penitenciária da Treta") e não abrir a porta temática.
- **Assets/licença.** 100% procedural, texturas de canvas próprias. **Risco: nenhum.**
- **Desvio de contrato.** É o único mapa do registro cuja assinatura é `buildPenitenciaria(scene)`
  — **ignora o `T`**. Consequência medida: não usa o atlas compartilhado, não passa pelo
  `graffiti_pass` (que precisa de `T`), e constrói 18 materiais `MeshStandardMaterial` próprios
  enquanto todos os outros usam `MeshLambertMaterial`.
- **Gargalos visuais — os piores dos 16 mapas.** TEXEL1 mediana **4,0 px/m** (banda 64–512; o
  chão a 3,95 px/m); TEXEL2 82,6% da área abaixo de 64 px/m, com um `PlaneGeometry` de
  **26 250 m² a 4 px/m**; TEXEL3 dispersão 56,78× e TEXEL3b 638,7×. Na captura de menu
  (`public/img/map-previews/penitenciaria.jpg`) isso lê como cinza chapado sem entorno.
- **Desempenho.** **1 122 malhas em 18 materiais** → 1 122 draw calls sem merge nem instancing.
  Os agrupamentos por material são 517, 363, 83 e 77 malhas: quatro merges resolveriam ~90% das
  chamadas. E **ninguém está medindo isso**: `TETOS` em `tools/eval/cena-tetos.mjs` só tem
  entrada para `praca_poderes`, `piscina_treta`, `loja_h`, `ferro_velho` e `quebrada` — a
  penitenciária não tem teto de custo de cena, e a régua recusa rodar contra `null`. Para
  calibrar: a piscina, com 511 malhas procedurais, mediu 740 calls/frame no navegador.
- **Rotas.** **CTF1 altura de triângulo = 0 m**: as três bandeiras estão em `x = 0`
  (`z = -39, 0, +39`) — perfeitamente colineares, o caso que a CTF1 existe para pegar. Bandeiras
  E e B a 5,83 m do spawn mais próximo. MAP5 espaçamento 20,6 m em três quadrantes com
  densidade de prop 0,12× da mediana. Exposição do respawn 79,3%/76,1%.
- **Áudio/ambiência.** `synth: indoor-hum` + rangido de metal (genérico). Sem `ambience`.
- **Esforço.** **Alto** — e é o único caso em que a conta favorece reconstrução da camada de
  material/textura em vez de correção pontual.

### 3. `parque_treta` — Parque da Treta

- **Arquivo/estado.** `public/js/map_parque.js`, 402 linhas. Único mapa dos seis com `update(dt, time)`
  (roda-gigante/carrossel animados; `game.js:7342` chama `this.world.update?.()`).
- **Histórico.** 1 commit — PR **#333** (`0a02fbec`, 17/08). Tem régua própria:
  `eval:parquewheel`, que está no `check:fast`.
- **Assets/licença.** Procedural, sem GLB, sem marca. **Risco: nenhum.**
- **Gargalos visuais.** TEXEL1 mediana 28,2 px/m (chão a 17); TEXEL2 70,4% abaixo do piso, com o
  gramado de **5 376 m² a 17,5 px/m**; TEXEL3b **100,9×** — segundo pior desvio do repositório.
  A captura de menu mostra o problema oposto ao da penitenciária: cor pastel chapada, sem
  entorno e sem textura, o que lê como blockout.
- **Desempenho.** 340 malhas, 286 geometrias distintas — reaproveitamento de geometria fraco
  (cada tubo/esfera é uma geometria nova).
- **Rotas — o defeito de justiça.** MID (o carrossel) está em `(0, 10)`, não no centro: custo de
  rota **spawn E → MID = 68,4–69,8 m contra 32,2–34,9 m do spawn B**. Mais que o dobro, para os
  quatro spawns de cada lado. As bandeiras E/B são simétricas por rotação
  (`(18,-33)` / `(-18,33)`), então o desequilíbrio é inteiramente do MID. CTF1 altura de
  triângulo 4,79 m — o menor dos cinco não-colineares.
- **Áudio/ambiência.** Vento + água genéricos, sem `ambience`. Um parque sem pombo é justamente
  o que a AR1 foi escrita para cobrar.
- **Esforço.** Médio. O conserto de justiça é mover o MID e refazer a captura; o visual é UV.

### 4. `posto_treta` — Posto da Treta

- **Arquivo/estado.** `public/js/map_posto.js`, 489 linhas, 31 props GLB.
- **Histórico.** 1 commit — PR **#250** (`206bb9c1`, 13/08).
- **Marca — o ponto do briefing, corrigido.** **Não existe GLB de bomba de combustível neste
  repositório.** `grep -ri ipiranga` não devolve uma linha; as bombas são caixas procedurais
  (`map_posto.js`) e a loja de conveniência é procedural. `POSTO_PROPS` não cita
  `bombas_combustivel` nem `loja_conveniencia`. A identidade atual já é fictícia
  ("POSTO DA TRETA", vermelho/amarelo). **O risco de marca é prospectivo**: ele nasce se um GLB
  gerado com referência a posto real for integrado. Recomendação: manter a identidade fictícia
  atual e, se houver geração nova, escrever o prompt sem citar bandeira real e registrar o
  resultado em `mint-assets.json` antes do merge.
- **Assets/licença — achado que vale um portão.** Dos 38 props usados por posto+obras+atacadão,
  **20 têm procedência em `mint-assets.json` e 18 não têm**: `botijao_gas`, `bus`,
  `concrete_roadblock`, `construction_rubble`, `dumpster`, `fachada_comercio`, `fav_brasileira`,
  `fav_house`, `fav_modular`, `fiat_uno`, `guarda_sol`, `jersey_barrier`, `quiosque`, `sandbags`,
  `shopping_cart`, `tires`, `uno_mille`, `vw_9150`. A procedência de parte deles existe **só em
  mensagem de commit** (`bbbb8b53`: "de `references/favela/`") — e a licença original desse
  diretório de referência não está registrada em lugar nenhum. Não é bloqueio de jogabilidade,
  mas é dívida de licença rastreável.
- **Gargalos visuais.** **TEXEL2 98,2%** — o pior do repositório: 1 020 m² a **8 px/m** e duas
  caixas de ~900 m² a ~21 px/m. É a marquise branca que domina a captura de menu: um bloco de
  20×22 m com textura de concreto esticada em UV 0→1.
- **Desempenho.** Só 269 malhas procedurais, mas **16,35 MB de GLB por partida** — a maior carga
  de download dos seis, num projeto que já está acima do teto de 250 MB da CrazyGames
  (`bbbb8b53`).
- **Rotas — o melhor do grupo.** Rotas perfeitamente simétricas (E→MID 40,5 m = B→MID 40,5 m;
  E→flagB 58,3 m = B→flagE 58,3 m), 4 rotas separadas, CTF1 triângulo 14 m, bandeira mais
  próxima a 18,11 m do spawn, MAP1 zero corpos dentro de sólido. **Não há defeito de justiça
  para corrigir aqui.**
- **Áudio/ambiência.** Vento + porta genéricos. Sem `ambience`.
- **Esforço.** Médio, e todo ele visual: é o caso mais limpo para pilotar a receita de UV.

### 5. `obras_prefeitura` — Obras da Prefeitura

- **Arquivo/estado.** `public/js/map_obras.js`, 240 linhas, terreno ondulado com
  `groundHeightAt` e `slowAt` (lama).
- **Histórico.** 1 commit — PR **#338** (issue #256, `77a44d24`, 18/08).
- **Assets/licença.** 16 props GLB, mesma dívida de procedência da ficha anterior
  (`construction_rubble` 4,49 MB e `vw_9150` 2,53 MB são os dois maiores e **nenhum dos dois** tem
  registro). 15,23 MB por partida.
- **Defeito de justiça — o mais grave e o mais barato de corrigir dos seis.** As duas bandeiras
  de base caíram **dentro de buracos de escavação**, e em profundidades diferentes:

  | bandeira | posição | altura do terreno | `slowAt` | waypoints num raio de 6 m |
  |---|---|---|---|---|
  | E (CANTEIRO SUL) | (-10, -14) | **-1,58 m** | **sim** | 4 |
  | MID (A OBRA) | (9, 0) | +0,10 m | não | 10 |
  | B (CANTEIRO NORTE) | (-10, +14) | **-0,79 m** | **sim** | 6 |

  As duas bandeiras de time nascem em lama (o mapa marca `slowAt` abaixo de -0,7 m), com **0,79 m
  de diferença de profundidade entre elas** — vantagem estrutural para um dos lados. Pior: o
  gerador de waypoints exclui células com `groundHeightAt < -1,1` (`map_obras.js:192`), então a
  bandeira E, a -1,58 m, **não tem nenhum waypoint na própria cota** — o nó mais próximo está a
  3,40 m e 0,81 m acima. A lama é só 4,6% da área do mapa; as bandeiras acharam justamente ela.
- **Gargalos visuais.** É o **melhor** dos seis em textura: TEXEL1 passa e TEXEL2 é 11,2%
  (contra 41–98% dos outros). Fica TEXEL4 (8 superfícies sem anisotropia).
- **Desempenho.** 271 malhas procedurais + 15,23 MB de GLB.
- **Rotas.** CTF1 triângulo 19 m (o melhor), 4 rotas separadas, rotas quase simétricas
  (36,8 / 42,6 m). Dois problemas: **exposição do respawn 88,5%/89,0% — a pior dos seis** (o
  canteiro é aberto e o respawn é visto de quase todo o mapa) e um quadrante com **zero props**
  (espaçamento reportado 99 m, `q0,0` no canto sudoeste).
- **Áudio/ambiência.** Vento + impacto de pedra genéricos. Sem `ambience`. `AMB_LOOPS.obra`
  existe em `soundscape.js` e **nenhum mapa o consome**.
- **Esforço.** Baixo para o defeito de justiça (mover duas bandeiras ou aplainar duas covas);
  médio somando exposição de respawn e povoamento do quadrante vazio.

### 6. `atacadao_treta` — Atacadão da Treta

- **Arquivo/estado.** `public/js/map_atacadao.js`, 255 linhas. Loja fechada (B) + estacionamento
  aberto (E), ligados por três vãos na fachada.
- **Histórico.** 1 commit — PR **#271** (`8071cf9f`, 14/08), que substituiu o #253.
- **Assets/licença.** 23 props, 12,17 MB por partida, mesma dívida de procedência. Nome é
  paródia genérica ("Atacadão da Treta", "PREÇO DE ATACADO... OU NEM TANTO"); vale registrar que
  "Atacadão" é marca de rede real — a paródia está no mesmo regime do "Loja H" já embarcado, mas
  é a única exposição de marca dos seis mapas e merece decisão consciente do dono, não silêncio.
- **Defeitos de justiça — dois.**
  1. **Acesso ao MID é assimétrico por quase o dobro**: do estacionamento, 30,1–48,2 m; da loja,
     49,0–67,1 m. As gôndolas atravessam o caminho do time B.
  2. **A bandeira B está a 5,00 m do spawn B** — a menor distância bandeira→spawn dos seis
     (`(-8, 24)` contra spawn em `(-8, 29)`). A bandeira E está a 7,28 m. O time B começa
     praticamente em cima do próprio ponto.
  Some-se **CTF2 mínimo de 2 rotas** (empatado em último com a piscina) e **exposição de respawn
  gritantemente assimétrica: 45,9% (E) contra 7,8% (B)** — o estacionamento é campo aberto e a
  loja é fechada. A assimetria é intencional no tema, mas hoje ela não está compensada.
- **Gargalos visuais.** TEXEL1 42,4 px/m; TEXEL2 91,1%, com o piso da loja — **2 028 m² a
  5,7 px/m** — respondendo por quase toda a área reprovada. É a chapa branca que domina a
  captura de menu.
- **Desempenho.** 317 malhas procedurais, 143 colisores (o maior número dos seis), 12,17 MB
  de GLB.
- **Áudio/ambiência.** `indoor-hum` + porta. Sem `ambience`.
- **Esforço.** Médio: mover bandeira B, abrir uma rota pela lateral da loja, reescalar o UV do
  piso.

---

## Priorização

O critério é explícito, para poder ser contestado: **primeiro o que é injusto, depois o que é
caro, depois o que é feio.** Defeito de justiça (rota/bandeira/spawn assimétricos) muda quem
ganha a partida e não aparece em captura; defeito de custo (draw call, MB) fecha o jogo em
máquina fraca; defeito de textura é o mais visível e o mais barato de adiar.

| # | Mapa | Veredito | Motivo medido |
|---|---|---|---|
| 1 | `obras_prefeitura` | **corrigir** | 2 bandeiras em lama com 0,79 m de diferença e a bandeira E sem waypoint na cota. Menor esforço por defeito eliminado. |
| 2 | `atacadao_treta` | **corrigir** | MID a 36 m × 67 m, bandeira a 5,00 m do spawn, 2 rotas, exposição 45,9% × 7,8%. |
| 3 | `parque_treta` | **corrigir** | MID a 68 m × 34 m para os 4 spawns de cada lado. |
| 4 | `penitenciaria` | **reconstruir a camada de material/CTF** | 4,0 px/m de mediana, 1 122 draw calls em 18 materiais, triângulo CTF = 0 m, e é o único mapa que ignora o `T`. Corrigir ponto a ponto sai mais caro que refazer a camada. |
| 5 | `posto_treta` | **polir** | Nenhum defeito de justiça (rotas simétricas ao decímetro). Só TEXEL2 98,2% e 16,35 MB de GLB. |
| 6 | `piscina_treta` | **polir** | Nenhum defeito de justiça, o mapa mais barato e o único que passa MAP5. Fica CTF2 = 2 rotas e 41% de área sub-texturada. |

**Nenhum dos seis é candidato a arquivamento.** Os seis estão no registro, passam
`eval:mapcontrato` e têm captura de menu. O candidato real a decisão de arquivar é
`map_piscinao_ramos.js` — 2 178 linhas fora do registro por decisão documentada, o maior bloco
de código de mapa não embarcado do repositório.

**Trabalho transversal, fora da fila acima** (uma chamada por mapa, mesma correção nos seis):
`AR1` está vermelha para `piscina_treta`, `penitenciaria`, `parque_treta`, `posto_treta`,
`obras_prefeitura` e `atacadao_treta` — e para outros seis mapas fora desta lane.
`createFavelaAmbience(root, opts)` (`ambientlife.js:661`) resolve cada um em uma linha. É o
maior ganho por linha alterada de toda esta lane, e o mais fácil de fazer errado em 12 lugares
diferentes — por isso deve ser **uma mudança só**, não um pedaço de cada ficha.

**Divergência declarada em relação ao esboço anterior deste arquivo.** Ele priorizava
`piscina_treta` em 1º por "mais uso e maior custo de regredir". Não achei evidência de uso no
repositório, e a medição diz que a piscina é o mapa **mais saudável** dos seis em justiça, custo
e cobertura de textura. Ele também priorizava `penitenciaria` em 2º "por carga histórica e
legal": o mapa não cita Carandiru nem pessoa real, então a carga legal hoje é zero — o que o põe
no 4º lugar é custo de cena e textura, não conteúdo.

---

## Receita de produção e testes — `obras_prefeitura`

Escolhido por ter o maior defeito medido pelo menor esforço, e por exercitar a cadeia inteira
(terreno → bandeira → waypoint → captura), o que faz a receita valer para os cinco seguintes.

### Linha de base (rodar ANTES de tocar em qualquer linha, e guardar a saída)

```
npm run eval:mapcontrato
node tools/eval/map-check.mjs obras_prefeitura
node tools/eval/texel-check.mjs
node tools/eval/ambience-registry-check.mjs --map=obras_prefeitura
```

Números a bater, todos já medidos: 314 nós / 1 923 arestas / conexo; MAP2 exp 88,5%/89,0%;
MAP5 pior espaçamento 99 m; CTF1 triângulo 19 m, menor distância 17,12 m; CTF2 mínimo 4 rotas;
TEXEL2 11,2%; AR1 vermelha.

### Passos, em ordem, cada um reversível sozinho

1. **Tirar as bandeiras da lama.** Duas saídas, e a escolha é do dono, não minha:
   *(a)* mover `ctfPoints` E e B para cota ≥ -0,3 m mantendo a simetria em z (é a mudança de
   duas linhas), ou *(b)* encolher os `PITS[0]` e `PITS[2]` para que as duas bandeiras fiquem na
   mesma profundidade. **Critério de aceite:** `|y(E) - y(B)| ≤ 0,05 m`, `slowAt` falso nas duas,
   e ≥ 6 waypoints num raio de 6 m de cada uma. Medir com o script de bandeira (abaixo).
2. **Povoar o quadrante vazio** `q0,0` (canto x≈-27, z≈-34) até o espaçamento cair de 99 m para
   ≤ 7 m, usando props que o mapa **já baixa** (`OBRAS_PROPS`) — nenhum GLB novo, para não mexer
   nos 15,23 MB. **Aceite:** MAP5 pior espaçamento ≤ 7 m.
3. **Baixar a exposição do respawn** de ~89% quebrando a linha de visada dos dois fundos com
   geometria que já existe no vocabulário do mapa (tapume interno, pilha de canos, contêiner).
   **Aceite:** MAP2 ≤ 60% nos dois times **e** MAP2B mantendo folga ≥ 1,2 m e área ≥ 40 m² (não
   vale emparedar o spawn — foi exatamente a regressão que criou a MAP2B).
4. **Ambiência.** `createFavelaAmbience` + `OBRAS_AMBIENCE` no registro + `sound:` próprio
   consumindo `AMB_LOOPS.obra`, que hoje existe e ninguém usa. **Aceite:** AR1 verde, AR3 sem
   fauna dentro de colisor.
5. **Anisotropia** (TEXEL4, 8 superfícies). É correção na fábrica `tex()` de `textures.js` —
   **runtime compartilhado, fora do escopo desta lane.** Fica registrado como dependência, não
   como passo.
6. **Recapturar** `public/img/map-previews/obras_prefeitura.jpg` só depois de 1–4 verdes.

### Portão de saída

```
npm run eval:mapcontrato                        # 314+ nós, conexo, rota ok
node tools/eval/map-check.mjs obras_prefeitura  # MAP2 ≤60%, MAP5 ≤7 m, CTF1/CTF2 não regridem
node tools/eval/ambience-registry-check.mjs --map=obras_prefeitura
node tools/eval/texel-check.mjs                 # TEXEL2 não sobe de 11,2%
npm run check:fast
```

Mais o script de bandeira, que é a única medida que nenhuma régua existente faz hoje:

```js
// para cada ctfPoint: y do terreno, slowAt, e nº de waypoints num raio de 6 m
const W = MAPS.obras_prefeitura.build(new THREE.Scene(), await initTextures());
for (const p of W.ctfPoints) {
  const perto = W.waypoints.nodes.filter((n) => Math.hypot(n.x - p.x, n.z - p.z) < 6).length;
  console.log(p.id, W.groundHeightAt(p.x, p.z).toFixed(2), W.slowAt(p.x, p.z), perto);
}
```

**Se essa mudança for adiante, a medida certa é promover isso a cláusula da CTF1** em
`map-check.mjs` ("bandeira não nasce em terreno lento nem sem waypoint na cota"): hoje a CTF1 só
olha colinearidade, distância ao spawn e linha de tiro, e por isso não pegou o defeito das
obras. Régua que não morde é a mesma dívida que este relatório está pagando.

### O que esta receita NÃO faz

Não toca `textures.js`, `game.js`, `mapprops.js`, `ambientlife.js` nem qualquer arquivo dos
mapas prioritários; não abre navegador, não faz merge, não publica release; não adiciona um GLB
novo — e portanto não cria dívida de procedência enquanto os 18 props sem registro não forem
resolvidos.
