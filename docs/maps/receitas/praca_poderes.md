<!-- Receita gerada em 12/09/2026 por rodada de análise com contexto limpo.
     Medições: node tools/eval/map-check.mjs all + node tools/eval/mapa-novo-gate.mjs (12/09) e
     sondas em memória sobre tools/eval/harness.mjs. Índice: ../RECEITAS-MAPAS.md -->

# praça dos três poderes (`map_brasilia.js`) — receita

## 0. Leitura do arquivo (o que existe hoje)

| parte | onde | o que é |
|---|---|---|
| chão + lane | `map_brasilia.js:667-698` | plano 420×460, lane de concreto 12,4×240 (`:678`), calçada portuguesa em \|x\|6,2–10,4 (`:681`), pistas do Eixo em ±(ROAD_IN+10,5) |
| marcos GLB | `:701-923` | congresso z152 · catedral z−108 · palácio/STF x±32 z50 (35,45×35,45 de pegada, `:781`) · 4 ministérios sobre pilotis (`:889-921`) |
| monumentos procedurais | `:925-1145` | Guerreiros (9,24) · Justiça (−9,26) · mastro (−34, 96–103) · espelho d'água (0, 76–83) · Panteão (22,·) · Pombal (−14,·) · Museu (−24,·) |
| cobertura de jogo | `:1288-1408` | 8 `tires` · 4 `stall` · 12 `tent` · `bus`(2,5,−4) · `urna`(0,0) · `towner`(12,−15) · `drinkstand`(−14,−17) · barricada (−8,20) · 8 jardineiras |
| densidade instanciada | `:1410-1598` | guias, mato, 9 postes/lado x±22, `gradeAt()` (`:1468`), lixeiras, cones, vasos, 14 palmeiras x±18, 4 ipês, bancos, placas |
| spawns / bounds | `:1751`, `:1832` | B(±3,±9, −62) e E(±3,±9, +62); bounds x±45,5 z−76..84 |

**Onde estão os 68 occluders medidos** (medido: 79 no array, 11 `InstancedMesh` que o MAP4 pula → 68): Guerreiros 21 (5 caixas + 14 cilindros + 2 esferas, todos em ~(9,24)) · Panteão 12 (~(22,69)) · jardineiras 16 · espelho d'água 4 · Pombal 4 · barricada 4 · caixas dos Correios 4 · Museu 2. **Distribuição medida: 4 occluders na metade sul inteira (z<−30, 4.200 m²), 41 no meio, 23 no norte; só 7 com \|x\|>22,75 e o \|x\| máximo é 26,7 m.** O occluder mais ao sul está em z=−50: de z=−50 a z=−76 — 26 m × 91 m, onde nasce o time B — não existe **nada**.

### Dois defeitos de instrumento que a receita tem que consertar ANTES (senão nada mede)

1. **A régua mede um mapa sem nenhum GLB.** `map-check.mjs:111` declara: *"em node nenhum GLB carrega"*, e o harness não chama `preloadMapProps`. Como `putBuilding` (`:604-621`) só empurra colisor **se** o GLB carregou, os 4 ministérios, os 2 palácios, os 8 `tires`, 4 `stall`, 12 `tent`, `urna`, `towner` e `drinkstand` **não existem para nenhuma régua**. Os 68 occluders, os 99 do MAP5 e os 74/82% de exposição são de uma esplanada literalmente vazia. O idioma da casa que resolve isso já está escrito em `map_ferrovelho.js:1033`: `gprop(id,…) || addBox(…); collide(…)` — prop GLB **ou** caixa procedural, e o colisor sempre à mão.
2. **A régua mede um mapa 21 m mais largo de cada lado.** `MW=26, MD=14` (`:654`) é o fallback quando o GLB do ministério não carrega. Medido no arquivo (`ministerio.glb`, razões cruas x/y 2,542 · z/y 0,692; a `MIN_H`=22 com `MIN_SQ`=0,72): **MW=10,96 · MD=55,93**. Consequências: node `FLANK_X`=44 → bounds ±45,5 e 8 blocos; browser `FLANK_X`=33,46 → bounds ±34,96 e 4 blocos (2 por lado, z=−60,95 e 0,95). **Toda coordenada com \|x\|>33,4 desta receita seria jogo de régua** — por isso nenhuma intervenção abaixo passa de \|x\|=33,4.

---

## 1. Jogabilidade e dificuldade (alvo: MAP5 ≤7 m, cover ≤12,5 m, exposição ↓, visada ↓)

**Medições próprias** (sonda em memória, mesmo `_losClear`, observador a cada 2 m; baseline reproduz o oficial: B 82,0 vs 82,06 · E 74,3 vs 74,57 · MAP5 99 nos mesmos 7 quadrantes).

### P0 — contingência procedural do que o browser já tem (0 objeto novo no browser)

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 0.1 | fallback medido do bloco de ministério | — | MW 10,96 · MD 55,93 | trocar `map_brasilia.js:654` `let MW = 26, MD = 14` pelos valores medidos do GLB | bounds do node ±45,5 → ±33,46 (a régua passa a medir o mapa do jogador) |
| 0.2 | pilotis sempre existem | x ±25,4/±29,48/±33,56; z a cada 7,56 a partir de −86,4 (bloco A) e −24,5 (bloco B) | cilindro Ø1,1 × 4,8 m | mover o `for` dos pilares (`:915-919`) para FORA do `if (!b) continue` (`:892`) e desenhar `addInst` mesmo sem GLB | 84 colisores novos: q0,0/0,1/0,2/3,0/3,1/3,2 de **esp 99 → 7,6/7,1** |
| 0.3 | massa de contingência do palácio/STF | (±32, 50) | 35,45 × 11,45 × 35,45 | `putBuilding('palacio',…) \|\| addBox(...)` + `col()` fora do `if (probe)` (`:755`) | exposição **B 82,0→60,0% · E 74,3→43,6%**; área andável do norte 819→308 m² |
| 0.4 | colisor para os 27 props GLB que já estão no mapa | os mesmos x,z de `:1290-1309`, `:1370-1378` | `tires` 2,0×1,6 · `stall` 1,15×2,7×2,29 · `tent` 2,06×1,7×2,22 · `urna` 0,82×1,2×0,46 · `towner` 4,2×2,0×3,9 · `drinkstand` 2,28×3,2×2,52 | idioma `map_ferrovelho.js:1033` em `putBuilding`: empurrar `col()`/`colRot()` **antes** do `if (!o) return null` | **B 60,0→43,8% · E 43,6→32,9%**; q1,0/2,0 11,3→9,3; q1,1 9,8→6,5; q2,1 7,3→6,0 |

### P1 — cobertura legítima de esplanada real (o conteúdo novo)

| # | intervenção | x,z | dimensão (m) | como (prop/função) | número que move |
|---|---|---|---|---|---|
| 1.1 | **fila de ônibus de caravana** (romaria/excursão), enfileirada no gramado entre a calçada e os pilotis, nos vãos entre os postes de 16 em 16 m | x=**±20,5**, z = −71, −56, −40, −24, −8, +8, +24, +74 (8 por lado, 16 no total) | 3,4 (x) × 3,3 × 9,0 (z) | `placeProp('onibus_urbano',{targetH:3.3})` via `PropBatch` + `col(x±1,7, 0..3,3, z±4,5)`; `ry` sorteado ±0,08 rad | q1,0/2,0 9,3→5,5 · q1,1 6,5→5,5 · q1,2 6,8→5,0 · **exposição E 17,1→9,9%**; corta as diagonais de flanco |
| 1.2 | **jardim de Burle Marx sob os pilotis** (canteiro elevado entre pilares, o pátio real de ministério) | x=**±27,44**; z = −67,5 · −60 · −52,4 · −44,8 · −20,7 · −13,2 · −5,6 · +2 · +9,6 · +17,1 · +24,7 (11/lado = 22) | mureta 2,6 × 0,9 × 6,4 | `aoBoxGeo(2.6,0.9,6.4,{material:MAT.guia})` + `heliconia`/`ixora`/`samambaia` por cima (`addInst`) | q0,* e q3,* de 7,6 → **6,4/6,45/5,96**; cobertura agachado (0,9 m) na rota de flanco |
| 1.3 | **campanário da Catedral** (4 sinos sobre pórtico de concreto — peça real do conjunto) | (−13, −52) | 3,2 × 12,0 × 3,2 | `addBox` c/ `MAT.concBranco` (triplanar `TX_FORMA`) | q1,0 +1 prop; ALT1 h90 mantido; marca o fundo sul |
| 1.4 | **batistério da Catedral** (elipse baixa de concreto) | (13, −52) | 6,0 × 4,5 × 4,5 | `addBox` + chanfro, `MAT.concCru` | q2,0 +1; quebra a visada rasante do lado leste |
| 1.5 | **Os Evangelistas** (Ceschiatti, 4 figuras de bronze na frente da Catedral) | (−8,−58) (−3,−61) (3,−61) (8,−58) | 1,1 × 3,4 × 1,1 | `placeProp('escultura_jardim',{targetH:3.4})` + `col` | q1,0/q2,0 +2 cada; cobertura de corpo a 4 m do spawn B |
| 1.6 | **fila de banheiros químicos** do acampamento | z=−41; x = ±11,8 / ±13,2 / ±14,6 / ±16,0 | 1,2 × 2,3 × 1,2 cada | `addInst(BoxGeometry)` + `col` por unidade | q1,0/q2,0 +4 cada → **9,3 → 5,5 m** |
| 1.7 | **trio elétrico / caminhão de som** (carroceria com caixas de som) | (−14, −22) | 9,0 × 3,6 × 3,4 | `placeProp('vw_9150',{targetLen:9.0})` + 4× `caixa_som_baile` na carroceria; colisor declarado à mão | corta o corredor oeste a 1,62 m; q1,1 |
| 1.8 | **carro de som** atravessado na travessia sul | (−5, −44) | 9,0 × 3,6 × 3,4 | idem 1.7 | primeira quebra da visada sul |
| 1.9 | **palanque de manifestação com grade** | deck (4, −20); fundo (4, −23) | deck 8,0 × 1,35 × 6,0 · fundo 8,0 × 2,8 × 0,5 | `aoBoxGeo` + lona (`T.tent`) no fundo + `gradeAt()` (`:1468`) em volta | cota andável nova a 1,35 m (mantle 1,95); q1,1 |
| 1.10 | **ônibus de excursão** parado na alça | (−7, +4) | 9,0 × 3,3 × 3,4 | `onibus_sptrans` (eixo longo em x) | estação central da lane |
| 1.11 | **caminhão de som 2** | (8, +32) | 9,0 × 3,6 × 3,4 | idem 1.7 | q2,2 |
| 1.12 | **cordão da PM em chicane** (a linha real de ônibus da PM que fecha a Praça, com passagem em zigue-zague, não portão reto) | ônibus (−8, 30) e (4,5, 30); ônibus (−1,75, 36); grade (−1,75, 30) | ônibus 9,0 × 3,3 × 3,4 · grade 3,4 × 1,1 × 0,12 | `onibus_sptrans` ×3 + `gradeAt(-1.75,30,0)` | **a intervenção que mata a visada: 138 → 54,8 m**; E 9,9 → 1,6% |
| 1.13 | **estação sul** (caminhão de som + ônibus desencontrados) | (−7, −46) e (5,2, −46) | 9,0 × 3,6 × 3,4 | idem | B 2,3 → 3,6% (e visada B 70,4 → 54,4 m no recorte do browser) |
| 1.14 | **ônibus da PM na entrada da Praça** | (±9, +44) | 9,0 × 3,3 × 3,4 | `onibus_sptrans` | fecha o corredor de 28,6 m entre os palácios; q1,3/q2,3 |
| 1.15 | **arquibancada do 7 de Setembro** (montada todo ano na Esplanada) | (±11, +48) | 5,7 × 4,0 × 3,0 | `placeProp('arquibancada',{targetH:4.0})` + colisor 5,7×4,0×3,0 | q1,3/q2,3 +1 cada; **cota andável nova** (degraus 0,45 m) |
| 1.16 | **mastros das bandeiras dos estados** | (±12, 46) (±12, 56) (±12, 66) | Ø0,35 × 9,0 | `addInst(CylinderGeometry)` + plano de bandeira (reusa o padrão de `:1030-1043`) | q1,3/q2,3 +3 cada; ritmo vertical sem massa |
| 1.17 | **anel de grade da PM na Praça** (a cerca que existe de verdade desde 2023) | (±13, 58) (±13, 66) | 2,2 × 1,1 × 0,12 | `gradeAt(x,z,0)` — helper já existe em `:1468` | q1,3/q2,3 |
| 1.18 | **guarita + grade atrás do Planalto/STF** | guarita (±26, 72); grades (±24,5 / ±26,8 / ±29,1) em z=70 e z=76 | guarita 2,4 × 2,8 × 2,4 · grade 2,2 × 1,1 × 0,12 | `addBox` + `gradeAt` | **q3,3: esp 99 → 6,59** e q0,3: 29,66 → 6,46 (os dois últimos quadrantes mortos) |

### Resultado medido (escada completa, sonda própria)

| etapa | exp B | exp E | maior visada | MAP5 pior | cobertura pior |
|---|---|---|---|---|---|
| hoje (bate com o oficial) | 82,0% | 74,3% | 155,8 m | **99** (7 quadrantes zerados) | 30,4 m |
| P0.1–0.3 (pilotis + palácios) | 60,0% | 43,6% | 148,2 m | 99 (só q0,3 e q3,3) | 30,4 m |
| + P0.4 (colisor nos 27 GLB) | 43,8% | 32,9% | 148,2 m | 99 (só q0,3 e q3,3) | 30,4 m |
| + P1.2–1.11, 1.14–1.18 | 3,0% | 17,1% | 142,7 m | 6,88 | 16,4 m |
| + P1.1 (fila de ônibus) | 2,3% | 9,9% | 138,0 m | 6,59 | 16,4 m |
| **+ P1.12/1.13 (chicane + estação sul) = receita completa** | **3,6%** | **1,6%** | **54,8 m** | **6,59** | 16,4 m |
| idem, recortado nos bounds reais do browser (\|x\|≤33,46) | **1,7%** | **2,6%** | **54,4 m** | — | **8,9 m** |

**Quadrantes depois (todos ≤7,0):** 0,0→6,40 · 0,1→6,45 · 0,2→5,96 · 0,3→6,46 · 1,0→5,49 · 1,1→5,47 · 1,2→4,97 · 1,3→5,97 · 2,0→5,64 · 2,1→4,97 · 2,2→5,09 · 2,3→5,84 · 3,0→6,42 · 3,1→6,46 · 3,2→5,99 · 3,3→6,59.

### A visada de 153,6 m, quebrada em segmentos declarados

A linha campeã **não é a lane**: é a diagonal de canto a canto sobre a faixa dos ministérios, que para a régua é campo aberto — spawn B (−9,−62) → (44,5, 84), 155,8 m medidos. Depois da receita, os segmentos são:

| segmento | de → até | distância | quem corta o fim |
|---|---|---|---|
| spawn B → estação sul | (±9,−62) → z −46 | **16 m** | caminhão de som (−7,−46) + ônibus (5,2,−46) |
| estação sul → acampamento/travessia | z −46 → z −20 | **26 m** | trio elétrico (−14,−22) + palanque (4,−23) |
| travessia → ônibus central | z −20 → z +4 | **24 m** | `bus`(2,5,−4) + ônibus de excursão (−7,+4) |
| ônibus central → chicane | z +4 → z +30 | **26 m** | ônibus da PM (−8,30)/(4,5,30) + (−1,75,36) |
| chicane → entrada da Praça | z +30 → z +44 | **14 m** | ônibus da PM (±9,44) |
| entrada → spawn E | z +44 → z +62 | **18 m** | arquibancadas (±11,48) e mastros |
| flanco (pilotis), maior trecho livre | entre dois canteiros/ônibus | **≤16 m** | canteiros x±27,44 a cada 7,5 m |
| **maior visada que sobra** | B(9,−62) → (−45,5, −68) | **54,8 m** (no browser, 54,4 m) | é o campo do próprio acampamento sul, transversal — não é linha de duelo spawn↔spawn |

**Travessia B→E medida:** 128,1 m / 30,7 s → **141,1 m / 33,8 s** (+13 m). É o preço declarado da chicane; ainda é a rota reta pela lane com um zigue-zague de 6 m.

---

## 2. Verticalidade (alvo: ALT1 h90 ≥9 m — hoje 15,4 m, PASSA; ≥1 cota andável nova)

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 2.1 | **arquibancada do desfile**: degraus de 0,45 m até 2,6 m, andável | (±11, +48) | 5,7 × 4,0 × 3,0 | `placeProp('arquibancada',{targetH:4.0})`; colisor por degrau (3 caixas de 0,45 m) para o degrau ser subível (`DEGRAU` do jogo = 0,30 m; degrau de 0,45 exige mantle, `MANTLE_H`=1,95, `game.js:278`) | 1ª cota andável do mapa fora do chão; posto de tiro sobre o cordão |
| 2.2 | **palanque** deck a 1,35 m | (4, −20) | 8,0 × 1,35 × 6,0 | `aoBoxGeo`; mantle sobe (1,35 < 1,95) | 2ª cota; domina a estação sul |
| 2.3 | **campanário** 12 m | (−13, −52) | 3,2 × 12 × 3,2 | `addBox` | massa alta no terço sul, que hoje não tem nenhuma (o h90 de 15,4 vem todo do norte) |
| 2.4 | **mastros dos estados** 9 m | (±12, 46/56/66) | Ø0,35 × 9 | `addInst` | ritmo vertical sem fechar visão |

**Limite declarado:** `groundHeightAt()` devolve 0 sempre (`:1663`) e o mapa não declara `levels`/`stairs` — logo MAP6 (borda alta sem guarda) é cego aqui por construção e nenhuma dessas cotas aparece em régua de andar. Subir de verdade só existe por mantle. Não mexo na **plataforma do Palácio** (1,45 m, sólida de propósito, `:762-766`) nem na **rampa** (decorativa de propósito, nasce a 2,3 m, `:834-837`).

---

## 3. Visual e escala (alvo: SUP2 ≤6% — hoje 1,2%; SUP1 ≤40% — hoje 28,0%; ORT1 ≥15%/20 âng — hoje 27,6%/25, isento por classe `planejado`)

| # | risco/intervenção | onde | regra concreta |
|---|---|---|---|
| 3.1 | **ORT1 vai cair** se os 16 ônibus e os 22 canteiros entrarem de esquadro | todos os itens da §1 | dar `ry` sorteado por hash determinístico em **±0,04 a ±0,25 rad (2,3° a 14°)** a cada veículo estacionado e a cada grade; `FORA_DA_GRADE_GRAUS=3` (`mapa-novo-gate.mjs:132`) — acima de 3° a massa conta como girada. Ônibus de caravana estacionado torto é o real, não o exceção |
| 3.2 | **SUP1/SUP2 sobem** se as caixas novas nascerem com material liso | 92 caixas novas | nenhuma caixa nova com material sem `map`: lataria = `T.truckSide`; lona = `T.tent`; concreto = `MAT.concBranco`/`MAT.concCru` (triplanar `TX_FORMA`, `:520`); mureta = `MAT.guia`; grade = `MAT.aco` com `detailFor` |
| 3.3 | **UV em metros** | todas | usar `aoBoxGeo(w,h,d,{material})` + `aoMat` (`vao.js:158`/`:196`): o handoff escala a UV para `ALVO_PXM`=128 px/m. Caixa criada com `new THREE.BoxGeometry` direto fura o texel-check |
| 3.4 | **não competir com a silhueta na lane** | qualquer coisa em \|x\|<10,4 na banda 0–2 m | decisão declarada em `:672-678` (C4/C3): a lane é concreto escuro de baixa frequência. Ônibus e caminhão da chicane entram com lataria **fosca e de valor médio-escuro** (`roughness` ≥0,8, sem faixa branca de alta frequência na altura do peito) |
| 3.5 | **orçamento** | 16 ônibus + 22 canteiros + 24 grades + 8 banheiros + 6 mastros | `PropBatch` (`mapprops.js:168`) para os ônibus; `addInst` (`:540`) para canteiro/grade/banheiro/mastro → **≈8 draw calls** para 76 peças. Teto da casa: `fy_mansao` 2.038 draw calls / `fy_corrego` 8,3 M tri |
| 3.6 | **registro de props** | `maps.js:40` | `praca_poderes` é o único mapa **sem** `props:` — os ids vêm da lista global `main.js:166`. Exportar `BRASILIA_PROPS = ['onibus_urbano','onibus_sptrans','vw_9150','arquibancada','escultura_jardim','caixa_som_baile','heliconia','ixora','samambaia']` e registrar `props: BRASILIA_PROPS`, senão os GLB novos não são pré-carregados e a receita vira caixa cinza |

---

## 4. Brasilidade (o que falta pra reconhecer o lugar)

| # | o que | onde | como | por quê |
|---|---|---|---|---|
| 4.1 | **o galo tem que parar de cantar na Esplanada** | `:1810` `bioma:'campo'` | trocar para `bioma:'urbano'` (buzina, `soundscape.js:31`) e somar `AMB_LOOPS.cidade` em `[0,3,0] radius 120 vol .18` — o tráfego do Eixo está a 40 m | hoje o mapa toca **galo e latido** (pool `campo`) no centro cívico da capital |
| 4.2 | **caravana** | 16 ônibus da §1.1 | letreiro de destino no para-brisa via decal (`map_decals.js`) com nome de cidade genérico | ônibus de excursão em fila é a imagem da Esplanada em dia de ato |
| 4.3 | **comércio ambulante** | 4 `stall` já existentes + 2 novos em (±20,5, +74) | `stall` + `guarda_sol` + `cooler`; bandeira do Brasil pendurada no toldo | camelô de bandeira/apito é o comércio real da Praça |
| 4.4 | **trio elétrico / carro de som** | (−14,−22), (−5,−44), (8,+32) | `vw_9150` + 4× `caixa_som_baile`; um `sound.loops` posicional de multidão a 25 m de raio | é o objeto que diz "manifestação" sem dizer de quem |
| 4.5 | **faixa de avião** | sobrevoo a 60 m sobre z 0 | `placeProp('aviao_faixa')` sem colisor, `update` de translação linear | faixa rebocada sobre a Esplanada é imagem de ato real |
| 4.6 | **acampamento** | as 12 `tent` (agora com massa) + varal + `botijao_gas` + `churrasqueira` em (−15,−33) | props do catálogo | o acampamento é o que faz o sul deixar de ser gramado vazio |
| 4.7 | **grade da PM** | anel da §1.17/1.18 | `gradeAt()` já existente | a Praça está cercada de grade desde 2023: é o detalhe que data o mapa |
| 4.8 | **pipa** | (±20, ±30), 12 m de altura | `pipa_papel` sem colisor | criança soltando pipa no gramado do Eixo |
| **veto respeitado** | sem pessoa real, sem partido, sem sigla | — | as faixas usam o pool de protesto genérico que a passada de grafite já carrega (`:1770-1789`, peso em lambe/stencil) | pedido do dono |

---

## 5. Ordem de execução e custo

| passo | o que | fecha | risco |
|---|---|---|---|
| 1 | `MW/MD` medidos (`:654`) + pilotis fora do `if (!b)` + massa de contingência do palácio | bounds do node = do browser; **8 quadrantes de 99 → 7,6**; exp B −22 pts / E −31 pts | **médio**: `FLANK_X` muda → `bounds` encolhe 21 m/lado no node; conferir que MAP2B (folga 2,65 m / área 66,8 m²) não muda — os spawns estão em \|x\|≤9 |
| 2 | idioma `gprop \|\| addBox; collide` em `putBuilding` para os 27 props GLB (`:1290-1378`) | exp B 60→43,8% / E 43,6→32,9%; q1,1 6,5 | **baixo**: usar as pegadas já medidas de `PEGADA_CORPO` (`:27-31`), não o Box3 cheio, senão volta a parede fantasma do BUG-21 |
| 3 | conteúdo do sul e do flanco: 1.1, 1.2, 1.3–1.6 | **q1,0/q2,0 11,2 → 5,5**; a metade sul sai de 4 occluders | **baixo**; conferir folga com palmeiras (x±18,4) e postes (x±21,75) — as coordenadas acima já foram medidas contra eles |
| 4 | norte: 1.14–1.18 | **q0,3 29,7→6,46 e q3,3 99→6,59** (os dois últimos) | **baixo**: nada pode entrar em 14,3<\|x\|<49,7 e 32,3<z<67,7 — é a pegada do palácio |
| 5 | quebra de visada: 1.7–1.13 (chicane + estação sul) | **153,6 → 54,8 m**; exp B 3,6% / E 1,6% | **alto (é o passo que mexe no assunto do mapa)**: a chicane tem que ser desencontrada, não portão reto — medido: portão reto de 3,4 m deixa **138 m** de linha viva; chicane de 3 ônibus dá 54,8 m com a mesma passagem aberta |
| 6 | acabamento §3 e §4: `ry` sorteado, materiais com `map`, `BRASILIA_PROPS`, `bioma:'urbano'` | ORT1 mantido ≥15%/20 âng; SUP1/SUP2 mantidos; props pré-carregados | **baixo** |

---

## 6. O que eu NÃO consegui decidir sem olhar figura

1. **Se a chicane do cordão da PM lê como cordão ou como muro.** O número é o mesmo do fechamento total (54,8 m e E 1,6%), mas se, em pé no meio da lane a z=0, os três ônibus tamparem o Congresso, a chicane destrói o cartão-postal — que é a coisa que este mapa existe para entregar. Precisa de um frame de (0, 1,62, −10) olhando para +z, antes e depois.
2. **A escala do ônibus dentro do vão de piloti.** O vão útil medido é 4,08 m entre eixos de pilar, ~2,98 m livres. Um `onibus_urbano` a 3,3 m de altura tem 3,4 m de largura: **não cabe** entre pilares, e por isso a fila foi para x=±20,5. Se o dono quiser ônibus estacionado *sob* o bloco (que é o real), tem de ser `kombi`/`towner`/`saveiro` — decisão visual.
3. **`vw_9150` como trio elétrico.** As razões cruas do GLB (x/y 0,32 · z/y 0,49) não parecem de caminhão; ou o modelo tem um elemento alto fora do corpo, ou a caixa está torta como a do `bus`. Precisa de `pegada-check` e de uma figura antes de virar receita — enquanto isso o colisor está declarado à mão (9,0 × 3,6 × 3,4), que é o que a medição usou.
4. **Se 22 canteiros sob os pilotis lêem como Burle Marx ou como divisória de estacionamento.** A geometria é a mesma; quem decide é a planta e a vegetação, e isso é figura.
5. **Se a arquibancada do 7 de Setembro convive com o acampamento do sul na mesma partida.** São duas datas diferentes do mesmo lugar; misturar pode ficar incoerente. Se tiver que escolher uma, a arquibancada é a que dá cota andável.

---

## Por que nenhuma dessas intervenções descaracteriza a Esplanada

Brasília é vazia de propósito — mas o vazio de Lúcio Costa é o **gramado do Eixo e o céu**, não o chão inteiro. Nenhuma peça desta receita entra no vazio que é o projeto: a lane central de 12,4 m continua sem parede permanente, a vista do gramado para o Congresso continua aberta em todo o trecho z>44, e os três volumes que desenham o lugar — Congresso, Catedral, Palácio/STF — não são tocados. O que entra é exatamente o que a Esplanada real tem e o mapa não tinha: **os pilotis dos ministérios**, que já estão no arquivo e só não existiam para a régua; **os canteiros e as lâminas entre pilares**, que são o pátio de ministério de Niemeyer/Burle Marx; **a fila de ônibus de caravana**, que é a Esplanada em toda semana de ato; **o trio elétrico, o palanque e a grade da PM**, que é a Esplanada desde sempre e cercada desde 2023; **o campanário, o batistério e os Evangelistas**, que são peças do conjunto da Catedral que faltavam; e **a arquibancada do 7 de Setembro**, que é montada ali todo ano. Nenhuma delas é invenção de level design com roupa brasileira: são objetos que já estavam no lugar e não estavam no mapa. As decisões estéticas que o arquivo declara — o mastro fora do eixo (`:1002-1011`), a lâmina d'água única com parapeito (`:769-773`), a rampa do Planalto decorativa (`:834-837`), a plataforma sólida (`:762-766`), o piso escuro de baixa frequência na linha de tiro (`:672-678`) — ficam **intactas**: a receita não reabre nenhuma delas, e onde ela poderia conflitar (segunda lâmina d'água) a versão medida usa canteiro seco, não água. O que muda é que a esplanada monumental deixa de ser um estacionamento vazio de 91×160 m onde se morre de 153 m sem ver quem atirou, e passa a ser a mesma esplanada num dia em que ela está sendo usada.
