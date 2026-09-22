<!-- Receita gerada em 12/09/2026 por rodada de análise com contexto limpo.
     Medições: node tools/eval/map-check.mjs all + node tools/eval/mapa-novo-gate.mjs (12/09) e
     sondas em memória sobre tools/eval/harness.mjs. Índice: ../RECEITAS-MAPAS.md -->

# Posto da Treta — receita

## 0. Leitura do arquivo (o que existe hoje)

Arena 56×72 (`HALF_X 28`, `HALF_Z 36`), tudo em y=0 (`groundHeightAt = () => 0`, `:399`). `addBox` (`:95`) empurra malha **e** colisor **e** occluder; `col` (`:112`) é colisor sem malha; `prop` (`:114`) é GLB + colisor manual. Chão/`scene.background=0xf1b063` sem céu (`:122`), gramados sem textura (`:126`), muro perimetral (`:141-144`), loja procedural (`:146-163`) e marquise+6 pilares+3 ilhas (`:165-189`) — **os dois blocos que o #586 apaga**; postes de 8 m (`:191`); cover GLB (`:200-220`); fila de carros (`:222`); bairro/rodovia (`:235-254`); miúdos e cones (`:256-275`); totem de preço em (24,0) e placas (`:277-327`); greve com 12 cartazes e 2 carretas (`:329-355`); arsenal (`:357-383`); waypoints STEP 3,4 (`:402`); pixação (`:456`); spawns z=±30 e trio CTF (`:476-505`).

**Estado pós-#586, medido (é a base desta receita, não a `main`):** occluders **26 → 12**; massas 145 → **116**; h90 5,50 → **4,15 m**; ângulos distintos continuam **2** (0° e 17°); área sem textura 17,7% → 14,7%; MAP5 piora em 7 quadrantes (q1,2 e q0,0/q0,3 em 10,3-10,6 m); e **exposição de spawn 72,1/73,1% → 99,1% / 99,3%**, porque `_losClear` (`game.js:5914`) faz `intersectObjects(occluders, false)` — **não-recursivo** — e a estação entra como `Group` (`map_posto.js:116` e a linha `occluders.push(est)` do PR). Group não tem geometria: a estação nova, a loja, o muro do lote e os ~60 props GLB deste mapa **não param bala, não param visão de bot e não levam decalque**. `map_lajes_authored.js:276` e `map_quebrada.js:99` fazem `o.traverse(m => { if (m.isMesh) occluders.push(m) })` — é o padrão correto e ninguém aplicou aqui.

**Dois defeitos herdados que o #586 deixa em pé:** `kombi` em (-14,-9) (`:203`) fica **dentro** do colisor da loja nova (x -15..-8, z -20..-6); `saveiro` (-14,9) (`:204`), `botijao_gas` (-16,±5), `dumpster` (-16,5,±14) e tambores (-15,5,±10,5) ficavam encostados numa parede que deixou de existir e agora bloqueiam o corredor oeste. E o trio de bandeiras novo — (12,-12), (0,0), (-12,12) — é **exatamente colinear** (`z = -x`): `alturaTrianguloMin = 2·área/maior lado` = **0,00 m**, piso 4,5 (`map-check.mjs:717-726`). A "simetria de rotação de 180° com MID no centro" que o PR descreve *força* colinearidade: P, −P e (0,0) são sempre três pontos de uma reta.

---

## 1. Jogabilidade e dificuldade  (MAP5 ≤7 m, cover ≤12,5 m, CTF1 >4,5 m, exposição ↓)

**1.1 — Consertos de contrato (antes de qualquer prop novo)**

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.1a | occluder por **malha**, não por Group | — | — | `map_posto.js:116` → `if (o) { root.add(o); o.traverse(m => { if (m.isMesh) occluders.push(m); }); }`; idem na linha `occluders.push(est)` do #586 | bala e LOS passam a bater nos ~60 GLB + na estação; hoje **0 deles** aparece em `_losClear`/`_fireHitscan` |
| 1.1b | trio CTF não-colinear | MID (4,0)→**(11,0)** | — | `ctfPoints` do #586, trocar só o MID | CTF1 **0,00 → 7,78 m** (área2 264 / maior lado 33,94); MID fica sob a borda leste da cobertura, fora das 3 ilhas (x 0,8..7,2) e do quiosque (14,4..17,6) |
| 1.1c | `kombi` presa na loja | (-14,-9) → **(-17,5, -31)** | col 1,1/2,3/2,0 | `:203` | tira o GLB de dentro do colisor da loja; +1 prop em q0,0 |
| 1.1d | props órfãos da loja velha | ver tabela | — | `:204, :208, :210, :271-275, :261` | libera o corredor oeste; ver 1.2 |

Realocação dos órfãos (todos passam a encostar na face leste da loja GLB, x=-8):

| prop | de | para | colisor |
|---|---|---|---|
| `saveiro` | (-14, 9) | (-20,8, 4) da fila → **(11, 7)** | 1,1/2,3/1,6 |
| `dumpster` ×2 | (-16,5, ±14) | **(-7,0,-18)** e **(-6,6, 16,5)** | 1,4/1,0/1,6 |
| `botijao_gas` ×2 | (-16, ±5) | **(-7,2, ∓3,5)** | 1,2/0,7/0,9 |
| tambores ×4 | (-15,5, ±10,5) | **(-7,0, ±10,5)** | 0,8/0,4/0,9 |
| `mesa_guardasol` ×2 | (-8, ±9) | **(-6,0, ±9)** | 1,3/1,3/2,2 |

**1.2 — Corredor oeste: a greve vira parede (quebra a visada de 73,6 m e enche q0,\*)**

O corredor oeste tem 11,8 m (muro x=-27,2 → muro do lote x=-15,4) e hoje é uma reta livre de 70,3 m. Carreta GLB **não ocluia régua nenhuma**, então o bloqueio é alvenaria; a fila de caminhão vai para o pátio (1.4), onde cabe. Regra de traçado medida: cada volume tapa ~6,2 m dos 11,8 e o **vão de 5,6 m alterna entre o lado do muro e o lado do lote**; as bandas de travessia entre volumes ficam limpas. Volumes que colidem são **alinhados aos eixos** (BUG-21): giro só na cobertura/placa.

| # | intervenção | x,z (espelhado em z) | dimensão (m) | como | número que move |
|---|---|---|---|---|---|
| 1.2a | **Borracharia** (galpão aberto) | (-24,2, ±30) | 6,0×3,6×5,0 | `addBox(6,3.6,5,MAT.borracha,-24.2,0,±30)` + cobertura `addBox(6.6,0.24,5.6,…,y=3.6,ry=0.10/0.13,{collide:false})` | vão no lado do lote; q0,0/q0,3 esp **10,3/10,4 → 4,0 m**; +2 occluders |
| 1.2b | **Cozinha/tenda da greve** | (-18,4, ±22) | 6,0×2,8×4,2 | idem, `T.tent` na lona (ry 0,45/0,49) | vão no lado do muro; corta a reta em x=-17 |
| 1.2c | **Dormitório + banheiro de caminhoneiro** | (-24,2, ±14) | 6,0×3,0×4,6 | `T.concrete` + beiral ry 0,24 | vão no lado do lote |
| 1.2d | **Muro de pneus/tambores** | (-18,4, ±6) | 6,0×1,7×3,4 | `T.metal`; altura 1,7 = cobertura de peito | vão no lado do muro |
| 1.2e | Casa da bomba d'água | (-25,6, 0) | 2,6×2,4×2,6 | `addBox` + torre (ver §2) | fecha a reta no x do muro |
| 1.2f | miúdos nos vãos (nunca na banda de travessia) | paletes (-17,0,±30) 1,8×1,6×1,6 · tambor de fogo (-24,5,±22) 1,6×1,2×1,2 · engradados (-17,2,±14) 1,6×1,4×1,4 · botijões (-24,0,±6) 1,6×1,3×1,3 | — | `addBox`, `T.crate`/`T.metal` | +8 props; **erro que eu cometi e medi:** com esses miúdos no meio da banda de travessia (z=±26) o corredor oeste ficou **fisicamente lacrado** (10 m² andáveis em q0,1) |

**1.3 — Corredor leste (x 18,6..27,3): fecha o segundo tubo de 70 m**

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.3a | **Lava-jato** (box de lavagem) | (21,8, 0) | 7,0×3,2×6,0 + cobertura ry 0,45 | `addBox` `T.concrete` | corta a pista leste; vão de 1,7 m no muro |
| 1.3b | **Guarita da balança** / depósito de óleo | (20,5, ∓20) | 3,6×3,0×4,4 | `addBox` | q3,1/q3,2; corta a reta em x=19 |
| 1.3c | **Tanques de diesel** | (24,0, ±14) | 2,6×2,6×8,0 | `addBox` `T.metal` | passagens de 4,1 m e 2,0 m |
| 1.3d | Mourões da cerca com placa | (26,3, ±8) e (26,3, ±24) | 1,0×2,4×1,0 | `addBox` | pica a viela de 1,7 m junto ao muro |

**1.4 — Fila da greve no pátio (é onde cabe carreta de 8,6 m)**

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.4a | 2 carretas atravessadas por aproximação | (-2, ±26,5) e (10, ±26,5) | col 4,3/1,3/3,0 | `prop('vw_9150', …, ry:0)` | cobertura a 3,5 m do arsenal; q1,0/q2,0/q1,3/q2,3 |
| 1.4b | 1 carreta de bico na fila | (4, ±31,5) | col 1,3/4,3/3,0 | `prop('vw_9150', ry:Math.PI/2)` | — |
| 1.4c | **Faixa de protesto esticada entre as carretas** | (2, ±26,5) | 8,0×1,6×0,14, y 1,2 | `addBox(…,{collide:false})` + `signTex` | ocluia na linha do olho (1,62): é o único item aqui que a régua enxerga |
| 1.4d | Tapume da greve (2 trechos, vão de 3 m no meio) | (-5,5, ±23) e (7,5, ±23) | 7,0×2,4×0,35 | `addBox` | exposição: corta a visada spawn→pátio |
| 1.4e | Guarita/banheiro químico duplo | (-10,5, ±19) | 3,0×2,8×2,6 | `addBox` | q1,1/q1,2 |

**1.5 — Quadrantes que sobraram (props GLB do catálogo, com `col`)**

| quadrante | falta hoje | prop | x,z | colisor |
|---|---|---|---|---|
| q2,1 (0..13,8 / -17,8..0) | +1 | `fiat_toro` | (11, -16) | 1,1/2,4/1,7 |
| q2,2 (0..13,8 / 0..17,8) | +2 | `saveiro` (11,7) · `pilha_pneus` (12,15) | — | 1,1/2,3/1,6 · 1,0/1,0/1,4 |
| q1,2 (-13,8..0 / 0..17,8) | +3 | `towner` (-11, 15,5) · `pilha_pneus` (-4, 8) · balcão do pastel (-7,5, 13) 2,6×1,05×0,9 | — | 1,0/1,9/1,8 · 1,0/1,0/1,4 · `addBox` |
| q1,1 | +1 | churrasqueira de tijolo (-5, -15) 1,8×1,2×0,9 + `botijao_gas` (-6,5,-16,5) | — | `addBox` + 0,6/0,6/0,9 |
| q2,3 | +1 | abrigo de parada (7, 22) 4,0×2,6×2,4 | — | `addBox` |

**Resultado medido do bloco 1 (cenário completo, harness):**

| régua | main | pós-#586 | pós-receita | teto |
|---|---|---|---|---|
| MAP5 pior espaçamento | 10,52 m | 10,58 m | **6,12 m** | 7 m |
| quadrantes sem prop (`99`) | 0 | 0 | **0** (16/16 com prop) | — |
| exposição E / B | 72,1 / 73,1% | 99,1 / 99,3% | **6,8 / 8,4%** | menor é melhor |
| maior visada do spawn | 73,6 m | 73,6 m | **65,3 m** | — |
| occluders | 26 | 12 | **95** | (fy_lajes 971) |
| CTF1 | 14,0 m | **0,00 m** | **7,78 m** | >4,5 m |
| chão andável | 3.016 m² (77% da arena) | 2.983 m² | **2.247 m² (54%)** | quebrada = 53% |

---

## 2. Verticalidade  (ALT1 h90 ≥9 m e ≥1 cota andável nova)

O censo do gate só vê malha procedural (o harness não carrega GLB): a estação do #586 **não paga ALT1 nenhum**. Post-#586 h90 = 4,15 m com 116 massas; para h90 ≥9 é preciso que ~10% das massas tenham topo ≥9 m.

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 2a | **Postes de 8 → 11 m** (posto de estrada real tem 12-15 m) | (±20, ±24) | 0,35×11×0,35 + cabeça em y 11 | `:194-197`, trocar `8` por `11` e `y=8` por `11` | 8 massas saem da faixa 8-8,3 e entram em ≥9. **É a intervenção mais barata do arquivo inteiro** |
| 2b | **Torre da caixa d'água** (sobre a casa de bomba 1.2e) | (-25,5, 0) | torre 0,9×9,5×0,9 (y 2,4) + tanque 2,6×2,2×2,6 | `addBox` `T.metal`; tanque `{collide:false}` | +2 massas ≥9 (topo 11,9 e 14,1) |
| 2c | **Torre de telecom** + cabine | (25, -32) / cabine (24,2,-29,4) | mastro 0,6×14×0,6; 4 plataformas 2,6×0,7×2,6 em y 8,6/10,8/13,0/15,0 | `addBox`, plataformas `{collide:false}` | +5 massas ≥9 (topos 9,3/11,5/13,7/15,7/14,0) |
| 2d | **Totem norte** (espelho do de (24,0)) | (20,5, 30,5) | mastro 0,4×10,7; board 0,6×5,8×4,4; 2 faces 0,12×5,2×4,0 | mesmo `signMesh`/`priceTex` de `:287-298` | +4 massas ≥9 |
| 2e | Mastro da bandeira do Brasil / placa alta "DIESEL S10" | (-6, 24) 0,35×9,6 · (13,-24) 0,45×9,6 + painel 0,5×2,6×3,2 em y 7,0 | — | `addBox` | +3 massas ≥9 |
| 2f | **Cota andável: laje da loja** (5,10 m) | laje (-11,5, -13) | 7,0×0,14×14,0 em y 5,0 (sobre o colisor da loja do #586, maxY 5) | `addBox({collide:false})` + 4 guarda-corpos 0,95 m nas bordas (x -14,9/-8,1, z -19,9/-6,1) + casa de máquinas 2,2×2,4×2,2 em (-10,-17,5) | 98 m² de cota nova, dominando o pátio das bombas e a bandeira B |
| 2g | **Escada de serviço NBR 9077** | x -12,75, de z=3,0 a z=-5,7 | largura **1,30 m**, espelho **0,17**, piso **0,29** (2h+p = 63 cm), n=30 → 5,10 m; patamar 1,4×1,4 em (-12,75,-6,4) | degraus `{collide:false}` **numa malha só** (`mergeGeometries`, como `mapprops.js:69`) — 30 malhas viram 1 | MAP3 passa na faixa NBR; 1 draw call em vez de 30; não dilui o censo do ALT1 |
| 2h | `groundHeightAt` multinível + `stairs` | — | — | copiar `map_havan.js:1665-1740` (assinatura `(x,z,yRef)`, `ALTURA_LIVRE 1,95`, `STEP_TOL 0,55`) e declarar `stairs:[{nome:'escada de serviço da loja', x0:-13.4, x1:-12.1, z0:-6.4, z1:3.0, topo:5.10}]` | sem isso a laje é decoração: `groundHeightAt = () => 0` (`:399`) devolve chão 0 em cima da laje |
| 2i | Waypoints da laje/escada | — | STEP 1,7 na faixa da escada | mesmo adensamento de `map_havan.js:~1750` ("ADENSAMENTO NA RAMPA": 3,4 m deixa 2 nós numa escada) | MAP3 exige que o A* **suba**; com STEP 3,4 o lance de 8,7 m recebe 2 nós e os bots nunca sobem |

**Medido:** massas 116 → **192**; massas com topo ≥9 m 5 → **23**; **h90 4,15 → 9,60 m** (piso 9).

---

## 3. Visual e escala  (SUP2 ≤6%, SUP1 ≤40%, ORT1 ≥15% e ≥20 ângulos)

**3.1 — Textura: duas linhas resolvem 87% da área sem textura**

| # | intervenção | onde | área medida | como | número que move |
|---|---|---|---|---|---|
| 3.1a | **Gramado sem textura** | `:90` `grama: lam({color:0x596b39})`, usado nas 2 faixas de 6×72 (`:126`) | **864 m²** = 59% de toda a área sem textura do mapa | `grama: lam(tex('grass', 0x596b39))` | SUP2 14,7% → 6,0% |
| 3.1b | **Aço sem textura** | `:89` `aco`, 36 malhas (guarda-corpo leste 0,35×1,4×72, mastros, postes) | **414,5 m²** | `aco: lam(tex('metal', 0x8a9096))` | SUP2 6,0% → **1,4%** |
| 3.1c | Materiais novos | todos os volumes de §1/§2 | +3,5 k m² | `T.concrete`, `T.metal`, `T.tent`, `T.awning`, `T.crate`, `T.truckSide` (nenhum `lam({color})` novo) | mantém SUP1 em **27,6%** (teto 40) |
| 3.1d | UV em metros nas faces grandes | borracharia, dormitório, lava-jato, laje | alvo `ALVO_PXM = 128` | `aoBoxGeo(w,h,d,{material})` de `vao.js` em vez de `BoxGeometry` cru nos 8 volumes ≥5 m | tira o esticão de textura nas faces de 6 m |

**Medido:** área sem textura **17,7% (main) / 14,7% (pós-#586) → 1,4%**; área total 9.956 → 13.461 m².

**3.2 — ORT1: 2 ângulos é o mapa lendo como maquete**

Os 2 ângulos de hoje são `0°` (121 massas) e `17°` (os 24 planos dos 12 cartazes de protesto, `:334-337`, todos com o mesmo `±0,3 rad`). Regra desta receita: **volume que colide fica no esquadro** (BUG-21 proíbe colisor girado e `colRot` de `map_quebrada.js:183` inflaria o MAP5 em 6 colisores por prédio); o giro mora na camada `collide:false`.

| # | o que girar | quantos | ry (rad) — um distinto por peça | número que move |
|---|---|---|---|---|
| 3.2a | os 12 cartazes de protesto (`:350`) | 12 grupos (24 massas) | 0,09 · 0,14 · 0,20 · 0,25 · 0,33 · 0,39 · 0,46 · 0,58 · 0,65 · 0,72 · 0,77 · 0,83 | 1 ângulo → 12 |
| 3.2b | coberturas/beirais de §1.2 e §1.3 | 10 | 0,10 · 0,13 · 0,24 · 0,29 · 0,33 · 0,37 · 0,43 · 0,45 · 0,49 · 0,55 | +8 ângulos |
| 3.2c | placas de fachada das construções novas | 10 planos 2,2-3,2 × 0,8-1,1 em (-21,2,9,-30), (-15,6,2,3,-22), (18,2,2,6,-20), (-23,2,0,0), (19,6,2,8,0) e espelhos | 0,36 · 0,41 · 0,49 · 0,52 · 0,70 · 0,75 (+espelhos) | +6 ângulos |
| 3.2d | faixas de protesto no muro | 6 planos 6,0×1,2 em (±24,∓16/±24) e (∓6, ±34,8) | 0,17 · 0,26 · 0,35 · 0,43 · 0,52 · 0,61 | +4 ângulos |

**Medido:** massas giradas **20,7% → 25,0%** (piso 15%), ângulos distintos **2 → 32** (piso 20).

---

## 4. Brasilidade  (o que faz alguém reconhecer o lugar)

| # | item | x,z | dimensão / asset | como |
|---|---|---|---|---|
| 4a | **Céu de hora dourada** (hoje é `scene.background` chapado, `:122`) | — | `/img/textures/sky_brasilia.webp` (já no repo: 85% céu, sol baixo, horizonte plano de cerrado) | `setMapSky(scene, T, '/img/textures/sky_brasilia.webp', 0xf1b063)` em `:122`; mantém `scene.fog` de `:123`. Preenche `scene.userData.skyUrl`, que o `look-check.mjs:106` cobra |
| 4b | **Borracharia** com pilha de pneu e macaco | (-24,2, ±30) | galpão 6,0×3,6×5,0 + `pilha_pneus` (-25,5, ±34) | §1.2a; placa "BORRACHARIA 24H" com `signTex('#111417','#ffd23f',…)` |
| 4c | **Dormitório/banheiro de caminhoneiro** | (-24,2, ±14) | 6,0×3,0×4,6 | §1.2c; placa "BANHO QUENTE · DORMITÓRIO" |
| 4d | **Churrasquinho + caixa de som** | churrasqueira (-5,-15) 1,8×1,2×0,9; `caixa_som` já existe em (-9, 1,4) (`:259`) | — | `prop('churrasqueira', -5.6, -15.8, 1.4)` do catálogo + `botijao_gas` |
| 4e | **Barraca do pastel** (lona + balcão) | (-7,5, 13) | balcão 2,6×1,05×0,9 + lona 3,4×0,28×2,8 em y 2,4 (`T.awning`, ry 0,66) | §1.5 |
| 4f | **Lona/cozinha da greve** com tambor de fogo | (-18,4, ±22) e (-24,5, ±22) | 6,0×2,8×4,2 (`T.tent`) + tambor 1,6×1,2×1,2 | §1.2b/1.2f |
| 4g | **Faixa de protesto entre as carretas** | (2, ±26,5) | 8,0×1,6, y 1,2 | `signTex('#c0392b','#ffffff','DIESEL A 12,79','A GENTE PARA O BRASIL', 900,160)` — mesmo idioma das faixas de `:344-345` |
| 4h | **Totem de preço na entrada norte** | (20,5, 30,5) | mastro 10,7 + painel 4,0×5,2 | reusa `priceTex()` (`:43`), que já é a placa de preço absurdo |
| 4i | **Placa alta "DIESEL S10"** de beira de pista | (13, -24) | mastro 9,6 + painel 2,6×3,2 | `postSign`-like de `:308` |
| 4j | **Som**: sertanejo/funk na cozinha da greve | (-18,4, 1,5, -22) | raio 22, vol 0,20 | acrescentar `{src:AMB_LOOPS.funk, pos:[-18.4,1.5,-22], radius:22, vol:.2}` ao array de `:495` (que hoje só tem `vento` + `cidade`) |
| 4k | Caramelo e pombo já existem (`:481-492`) — acrescentar 1 caramelo na porta da borracharia | (-22, ±28) | — | `dogs:[…, {pos:[-22,0,-28], to:[-19,0,-27], phase:1.1}]` |

---

## 5. Ordem de execução e custo

1. **Contrato primeiro (1.1a-1.1d + 4a).** Occluder por malha, trio CTF não-colinear, `kombi`/órfãos realocados, céu. ~15 linhas. Fecha **CTF1 0,00 → 7,78 m** (hoje o #586 reprova o `map-check` e ninguém viu) e devolve bala/LOS a 60 props. *Risco:* com os GLB virando occluders de verdade, o tiro passa a parar na lataria — é a mudança de jogo mais sentida da lista; exige uma partida de conferência.
2. **Textura (3.1a-3.1c).** Duas trocas de material. Fecha **SUP2 14,7% → 1,4%**. *Risco:* nenhum; `T.grass`/`T.metal` já existem.
3. **Corredor oeste + leste + pátio (§1.2, §1.3, §1.4, §1.5).** É o volume de trabalho. Fecha **MAP5 pior 10,58 → 6,12 m**, **occluders 12 → 95**, **exposição 99% → 6,8/8,4%**. *Risco medido na simulação:* miúdo na banda de travessia lacra o corredor (q0,1 caiu a 10 m² andáveis numa das tentativas) e carreta de 8,6 m **não cabe** num corredor de 11,8 m junto com prédio de 6 m — conferir com o flood-fill antes de fechar.
4. **Verticalidade barata (2a-2e).** Poste 8→11 m, torre da caixa d'água, torre de telecom, totem norte. ~25 linhas. Fecha **ALT1 4,15 → 9,60 m** sozinho.
5. **ORT1 (§3.2).** Uma lista de `ry` distintos na camada decorativa. Fecha **2 → 32 ângulos** e 25,0% de massa girada. *Risco:* zero — nada que gira colide.
6. **Laje + escada + `groundHeightAt` multinível (2f-2i).** É a única frente com risco de regressão (MAP1/MAP3/travessia e A* dos bots). Entra por último, sozinha, com `eval:posto`, `eval:movimento` e `map-check` rodando em cima. *Risco:* alto — `map_havan.js:1674-1716` documenta duas rodadas perdidas exatamente aqui.

**Custo de desenho:** ~95 malhas novas (a escada já entra mesclada em 1), 6 materiais compartilhados, nenhum prop GLB repetido fora do catálogo já pré-carregado. Fica na ordem de grandeza do `atacadao_treta` (65 occluders) e a três ordens do `fy_mansao` (2.038 draw calls).

**Compatibilidade com o #586 — declaração explícita.** Esta receita entra **depois** do #586 e foi medida sobre a árvore com o #586 aplicado. Ela **não** toca: o `posto_ipiranga.glb`, o `targetH: 7.74`/`PX = 2`, os 6 `col()` declarados pelo PR (loja, muro oeste, muro norte, 3 ilhas, totem), o `tz` dos rótulos (-10,5 / -0,5 / 9,5), a posição do letreiro (-7,9, 3,6, -13) nem `tools/ingest-posto-ipiranga.mjs`. POSTO1 e POSTO2 medem só o arquivo GLB (escala e UV) — intactos. POSTO3 cobra colisor para célula sólida **do modelo** — intacto. POSTO4 (spawn/bandeira/waypoint dentro de colisor) foi verificado item a item: nenhum volume novo encosta nos spawns (z=±30, x -8..10; a carreta mais próxima para em z=±27,8), na laje de armas (z=±29) nem no trio proposto (12,-12), (11,0), (-12,12). A **única** linha do #586 que esta receita altera é o `occluders.push(est)` — que vira `est.traverse(...)`, item 1.1a — e o `ctfPoints` do MID, item 1.1b, pelo motivo de o trio do PR ser colinear.

---

## 6. O que eu NÃO consegui decidir sem olhar figura

1. **Onde o GLB tem massa sólida acima de 1 m que o #586 não declarou.** POSTO3 garante que toda célula sólida tem colisor, mas os colisores declarados são 6 caixas grossas; não sei se o pilar central da cobertura está dentro do colisor da ilha ou se é massa sem colisor sob o corte de 1 m. Isso decide se a bandeira MID pode ir para (11,0) *ou* para (4, 4,5) — escolhi (11,0) porque é verificável contra os colisores declarados. Uma captura sob a cobertura resolve.
2. **Altura livre sob a cobertura da estação.** A laje da loja (§2f) fica em 5,10 m; se a marquise do GLB passa por cima dela em altura menor que ~2,0 m de pé-direito, a cota nova vira um corredor de rastejo. O `ALT` do modelo é 7,74 m, mas não sei a cota da face inferior da laje de cobertura.
3. **Se a loja do GLB tem interior modelado que valha abrir.** O PR diz "o modelo tem interior" e deixou como bloco fechado. Interior jogável seria melhor que laje; não dá para decidir sem ver o interior renderizado.
4. **`sky_brasilia.webp` tem uma skyline distante** na faixa inferior do panorama. Com muro de 3,2 m + casario de fundo + névoa em 60-150 m eu aposto que ela não aparece, mas é aposta: uma captura do horizonte a leste (onde o muro é só um guarda-corpo de 1,4 m, `:143`) decide entre reusar esse céu e gerar um `sky_estrada`.
5. **A reta lateral de 50,3 m em z=±25** (o pátio de spawn, entre o tapume da greve e a linha de nascimento) ficou de pé de propósito: fechá-la encurta a rotação entre objetivos e engaiola quem nasce. Se em partida ela virar corredor de AWP, o conserto é um terceiro trecho de tapume em (-14, ±25) — mas isso é julgamento de jogo, não de número.
