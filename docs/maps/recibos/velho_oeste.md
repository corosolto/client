<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

# velho_oeste — recibo

Passo 1 da seção 5 (aterrar o retheme Sertão) NÃO foi tocado: é decisão do dono. Passos 2, 3, 4 e 5 aplicados no mainline, mais o D1 de occluder que o `FixReguas` acusou pelo hub durante a rodada. Passo 6 (cota andável) fora por contrato da rodada.

## Aplicado

| item da receita | arquivo:linha | o que entrou |
|---|---|---|
| **passo 2** · §1.6 bandeiras | `map_velho_oeste.js:540-545` | E (−12,−34)→(−21,5;−27) `BECO DO SALOON` · MID (0,0)→(−7,4) `BEBEDOURO DO LARGO` · B (12,34)→(21,5;27) `CURRAL DO ESTÁBULO`. A B saiu de dentro do barril de (12,34); o barril ficou onde estava (nenhum prop foi removido) |
| **passo 3** · §1.1a trios de fardo | `:388,394` | 8 trios em x=±21, z −34,5 / −18,6 / 5,5 / 32,2 (24 cilindros). z ajustado da receita para não pousar em coluna do lattice nem no cacto de (22,−38) |
| **passo 3** · §1.1b/1.1e barris | `:389,394` | 18 barris nos becos + 2 no canto morto (±30; 21,5). z 14→15 e 40→39 para não matar nó do lattice |
| **passo 3** · §1.1c muros de quintal | `:408-412,390-391` | 12 muros 2,4 m de altura alternando o lado do beco; **larguras 4,0/4,3 m em vez de 5,2, com sobreposição em x** (17-21 contra 20,8-25,1). Chapéu de 0,16 m sem colisor, só silhueta |
| **passo 3** · §1.1d torres d'água | `:413-416,417` | (21,5;−30) e (−21,5;23): caixa 3,6³ a 7,8 m (colisor acima da cabeça) + 4 pernas de 9,6 m `collide:false` |
| **passo 3** · §1.5 densidade interna | `:427,430` | 5 trios e 11 barris nos quadrantes que sobravam. Barril de (−13,42) movido para (−16,42): deixava o spawn B(−12,41) com 0,55 m de folga |
| **passo 4** · §1.2 estações de feira | `:437-443` | 4 estações × 3 caixas 4,2×2,6×1,5 com 0,7 m de sobreposição, `ry` ∓0,05/+0,06, grupo `feira-*` (nunca `obstaculo-*`). As 2 do meio param em \|x\| 12,1 porque a casa de rua atravessava as caixas de \|x\| 12,2 |
| **passo 4** · §1.3 obstáculos do largo | `:374-393` | `obstaculo-carroca-tombada` (−6;−2,4) · `obstaculo-toldo-feira` (4,5;6) · `obstaculo-lenha` (−10,5;6) · `obstaculo-pilha-couro` (10,5;−5). Todos com \|x\|,\|z\| ≤ 12 |
| **passo 4** · §1.4 marcos do eixo | `:446-452` | capela + campanário 9,6 m em (0;−13)/(0;−15,5) · depósito + caixa d'água 11,4 m em (0;12,5)/(0;15) |
| **passo 4** · conserto de interpenetração | `:341-342` | `obstaculo-caixas-dinamite` (−3,9)→(−6;9,5): atravessava o depósito por 1,97×2,03 m |
| **passo 5** · §2.1 falsas frentes | `:232-239` (8 fachadas) e `:262-263` (4 casas) | falsa frente 9,4 m + 2 pilastras 9,8 m + cornija 9,9 m + mastro 10,4 m por fachada; platibanda 9,2 m + 2 pilastras 9,5 m por casa de rua. Tudo `collide:false` |
| **passo 5** · §3.2 aoBoxGeo+aoMat | `:120-124` | `addBox` passa por `aoBoxGeo(w,h,d,{low:LOWQ, base: onGround&&!ry ? undefined : BASE_FLOATING})` + `aoMat(material)`. **O `PlaneGeometry` do chão (`:219`) continua com `MAT.sand` original** — `aoMat` clona, o plano não recebe `vertexColors` |
| **passo 5** · §3.1 chão em 41 px/m | `:103-105` | `realTexture('dirt-real-v1.webp', …, 12, 14)` → `(37,5; 45)`. **Fora da lista literal do passo 5, aplicado porque sem ele a dispersão não desce**: o chão é 82 % da área do mapa e era ELE quem travava o número em 12,7× |
| **passo 5** · céu | `:213-217` | `scene.background = Color(0xd88b55)` → `setMapSky(scene, T, '/img/textures/sky_ferrovelho.webp', 0xb29770)`; assinatura virou `buildVelhoOeste(scene, T)`. Névoa recolorida para o horizonte MEDIDO do próprio webp |
| **D1 (pedido do `FixReguas`)** · occluder | `:308-310` e `:330` | `occluders.push(g)`/`(group)` → `o.traverse(m => { if (m.isMesh) occluders.push(m); })` nas carroças e nos obstáculos |
| brasilidade barata | `:411,440` | chapéu de muro e toldo de barraca (0,16-0,18 m, sem colisor, abaixo do piso de massa do ALT1): silhueta de feira/quintal sem mexer em régua nenhuma |

## Medido (sonda própria, antes → depois)

Instrumentos: cópia do `map-check.mjs` em `/tmp/mc_velho.mjs` (saída em `/tmp`, **`tools/eval/map_check.json` não foi tocado**), sonda própria `/tmp/probe_velho.mjs` (réplica de `medirMundo` do `mapa-novo-gate.mjs:332-399` + faixa reta + cruzamento de props), `texel-check --mapa=velho_oeste --json-out=/tmp/…` e `map-contrato-check`.

| métrica | antes | depois | teto/piso |
|---|---|---|---|
| MAP1 corpo dentro de sólido | 0 | **0** | 0 |
| MAP2 exposição E / B | 63,4 % / 66,6 % | **11,5 % / 14,0 %** | ↓ |
| MAP2 maior visada E / B | 92,0 m / 89,8 m | **58,7 m / 74,4 m** | ↓ |
| MAP2B pior folga · pior área contígua | 4,40 m · 71,3 m² | **3,45 m · 67,7 m²** | ≥1,20 m · ≥40 m² |
| MAP4 occluder sem malha / medidos / pulados | 0 / 56 / 11 | **0 / 339 / 0** | 0 |
| MAP5 pior espaçamento | **99** (q3,1) | **5,90 m** | ≤7 |
| MAP5 pior razão prop / wp | **0** / 0,77× | **0,73× / 0,78×** | ≥0,35 |
| MAP5 quadrantes fora do teto | 14 de 16 | **0 de 16** | 0 |
| MAP6 bordas sem guarda | 0 | **0** | 0 |
| **CTF1 altura do triângulo** | **0,00 m** | **7,97 m** | >4,5 |
| **CTF1 menor distância bandeira↔spawn** | **7,00 m** | **16,92 m** | ≥9 (`invariants.mjs:1897`: `distSpawn < 2·R_CAP` reprova) |
| CTF1 penetração da B | **1,08 m** | **0,000 m** | 0 |
| CTF1 maior linha de tiro E / MID / B | 85,4 / 49,4 / 83,3 m | **56,7 / 43,8 / 55,6 m** | >0 |
| CTF2 rotas separadas (mínimo) | 2 | **2** | ≥2 |
| **ALT1 h90 · hmax · massas** | **3,49 m** · 8,1 m · 438 | **9,20 m** · 11,4 m · 619 | ≥9,0 |
| ORT1 massa girada · ângulos distintos | 31,5 % · 25 | **27,1 % · 30** | ≥15 % · ≥20 |
| SUP1 materiais sem `map` | 11/47 = 23,4 % | **11/52 = 21,2 %** | ≤40 % |
| TEXEL mediana · chão | 40,4 · 40,4 px/m | **128,0 · 128,0 px/m** | banda 64-512, alvo 128 |
| TEXEL p95 · dispersão p95 · dispersão máx | 759,7 px/m · 18,81× · 359,4× | **512,0 px/m · 4,00× · 113,4×** | ≤1,5× |
| TEXEL área abaixo do piso · aniso ruim | 75,2 % · 0 | **0,0 % · 0** | ≤10 % · 0 |
| faixa reta limpa no olho (1,62 m), pior coluna | **90,5 m** | **34,0 m** (x=−3,5) | — |
| colunas com faixa ≥60 m | **31** | **0** | — |
| maior visada limpa · p95 (4 000 pares) | 85,2 m · 58,1 m | **62,3 m · 42,2 m** | p95 ≤56 (pior dos 3 bons) |
| pares com linha limpa | 1 288 | **635** | — |
| grafo de waypoint | 388 nós · rota E→B 25 passos | **356 nós · 1 764 arestas · rota E→B 29 passos · conexo (0 ilhados)** | ≥100 nós |
| céu (`scene.userData.skyUrl`) | `undefined` (Color chapada) | **`/img/textures/sky_ferrovelho.webp`**, 2048×1024 carregado no browser | medível |
| névoa × horizonte do céu | 0xc7804e × não medível | **0xb29770 × 0xb29770 → ΔE76 = 0,00** | ≤8 |
| malhas · colisores · occluders | 735 · 70 · 67 | **980 · 178 · 339** | ref. `fy_mansao` 2 038 draw calls |
| props que se atravessam (colisor×colisor) | — | **13**, dos quais 9 são por projeto (8 sobreposições de 0,78 m entre caixas da mesma barraca + nave×campanário) e 3 são o colisor folgado da carroça (pré-existente) | — |

`npm run eval:velhooeste`: **19 asserções VERDES** (OESTE1-14, exit 0), com OESTE6 e OESTE10 em 12 obstáculos e OESTE4 em 356 nós. Mutantes `sem-saloon`, `sem-obstaculos-centrais`, `centro-aberto` e `sem-cartazes` continuam mordendo. `map-contrato-check`: `ok velho_oeste 356 nós · 1764 arestas · rota ok · conexo`. `ctf-labels-check`: `ok velho_oeste [BECO DO SALOON · BEBEDOURO DO LARGO · CURRAL DO ESTÁBULO]`. `node --check`: verde. Sem commit.

**Verificação visual** (o jogo completo não sobe nesta máquina — `astro` não está instalado e os `private-assets/viewmodels/*` dão 404, travando o loading em 98 %): servi `dist/client` com `public/js` sobreposto em `/tmp` e carreguei o mapa num viewer three.js próprio, 4 poses. Confirmado no browser: panorama âmbar equiretangular no lugar da cor chapada; chão de cascalho legível na altura do olho (era liso); falsa frente do SALOON lendo como boomtown, não papelão; muro de quintal com chapéu e barraca com toldo; **nenhum `pageerror` e o chão NÃO ficou preto** — que era o risco declarado do `aoMat` sobre `PlaneGeometry`.

## Não aplicado (e por quê)

- **Passo 1 — aterrar o retheme Sertão da `worktrees/mapas-stack-550-v2`.** Não é decisão minha; está com o dono. Tudo que entrou foi escolhido em coordenada que a receita diz existir nas duas versões.
- **Passo 6 — sobrados com interior, escada NBR, `groundHeightAt` multinível, guarda-corpo, `stairs`/`levels`.** Fora desta rodada por contrato (cota andável).
- **§3.3 anisotropia do `signTexture`.** Fora dos passos 2-5. Medido: `texel-check` reporta `aniso✗ 0` (o piso ANISO_MIN 4 só morde superfície horizontal), então é dívida visível, não vermelho. Patch de 1 linha: `t.anisotropy = 8` em `:145`.
- **§3.5 `twigMat` das plantas rolantes reusando `MAT.dark`/`MAT.hay`.** Fora dos passos. SUP1 já está em 21,2 % contra teto de 40 % sem ele.
- **§4 brasilidade (gado, galinhas, cachorro, tatu, placas renomeadas, props do catálogo).** Fora dos passos 2-5 — e §4.5 (renomear as placas) é justamente o item que a receita marca como "régua que para de morder": `velho-oeste-check.mjs:19,32` exige o objeto `predio-saloon` literal. Não renomeei nada.
- **Dispersão de texel não chegou a ~1,0; parou em 4,00×.** O que sobrou é o próprio teto do `vao.js`: `p95 = 512 px/m` é o `TETO_PXM` (teto de hero prop da BAR §1.8) contra o alvo de 128, então 512/128 = 4,00 é o piso estrutural da política atual de `fator()` — não é alcançável a partir do arquivo do mapa. As superfícies mais pobres que sobram são as placas de `addSign` (`PlaneGeometry` 512×180 px em painéis de 6×2,1 e 10×3 m → 55-85 px/m, 0,15 % da área); `aoBoxGeo` não as alcança porque não são caixas.
- **Interpenetração pré-existente carroça (7,2) × `obstaculo-barris-empilhados` (8,3), 2,46 m.** Existe desde antes desta rodada, está em prop que eu não fui mandado mexer, e o colisor da carroça (6,9×7,8 m para uma malha de 3,8×2,2) é a causa real. Deixei nomeado em vez de consertar de contrabando.
- **Trio de fardos de (14,17) dentro da CASA DO PISTOLEIRO.** Esse eu consertei (→ (14,12)) porque era interpenetração visível de 1,25 m e estava no caminho do que eu já estava mexendo.

## Pedido ao Main (arquivo compartilhado)

1. **`tools/eval/look-check.mjs:48`** — a lista de mapas do RC1 tem 3 (`fy_mansao`, `fy_corrego`, `fy_campomorro`). O velho_oeste agora tem `skyUrl` medível e névoa casada com o horizonte real do webp (ΔE76 = 0,00 contra teto 8). Se quiser que a régua passe a cobri-lo: `const MAPAS = ['fy_mansao', 'fy_corrego', 'fy_campomorro', 'velho_oeste'];` — e vale assar o horizonte em `tools/eval/look-horizonte.json`, que hoje só tem 3 céus: `sky_ferrovelho.webp → horizonte b29770, zenite (não medi)`, banda [498,510] de 1024, medido com PIL (a máquina não tem numpy, então `look-horizonte.py` não roda; reproduzi a mediana e ela bate exatamente nos 3 céus assados).
2. **Nada mais.** Não precisei de `textures.js`, `vao.js`, `maps.js`, `map_sky.js`, `mapprops.js` nem `game.js` — `maps.js:93` já chama `build(scene, T)` e a nova assinatura é compatível.

## O que vira redundante se o dono mandar aterrar o Sertão

| entrou agora | destino no retheme |
|---|---|
| céu `setMapSky(sky_ferrovelho)` + névoa 0xb29770 | **redundante** — a 550-v2 resolve por `look.js:41-51` (`sky:{kind:'procedural', model:'dry-afternoon'}`, horizonte 0xc7b59b) |
| occluder por malha em `wagon`/`obstacle` | **redundante** — a branch já mede 568 occluders |
| capela + campanário de (0;−13) | **substituída** pela `igrejinha` da branch (`:468-490`, em (0;−15,5)) |
| falsas frentes / platibandas | **NÃO é redundante** — é exatamente o que falta lá: h90 da branch é 4,28 m, todas as casas de 1 pavimento. A branch tem o `casaPlatibandaProxy` (`:378-431`) pronto; é subir a platibanda de 4,5 para 9,2 m |
| bandeiras (CTF1 7,97 m) | **NÃO é redundante** — a branch mede 0,67 m e E/B a 7,0 m do spawn |
| trios/barris/muros/torres, estações, obstáculos do largo | **parcialmente** — a branch fecha MAP5 só até 9,8 m com 7 quadrantes fora; as coordenadas que usei foram escolhidas em ponto que existe nas duas versões, mas cada uma precisa ser reconferida contra a geometria nova |
| chão em 128 px/m | **NÃO é redundante** — a branch reaproveita o mesmo `dirt-real-v1.webp` com o mesmo `repeat` |
| `obstaculo-carroca-tombada`, `toldo-feira`, `lenha`, `pilha-couro` | **precisam de re-derivação** — o `velho-oeste-check.mjs` da branch foi reescrito com vocabulário de cangaço; os 4 nomes novos teriam de entrar na lista de lá |

## O que exige figura

1. **A rua ainda parece uma rua com 4 estações de feira atravessando?** Medi que a rota em S existe (356 nós, conexo, rota E→B 29 passos) e que a faixa reta caiu de 90,5 para 34,0 m, mas "vila ou labirinto" é julgamento de imagem. Os 4 pontos a olhar na altura do olho são (0;−30), (0;−22), (0;22), (0;30). A minha captura de (0;1,62;−34) mostra a rua trancada pelas barracas e pelo campanário — funciona para mim, mas quem decide é o dono.
2. **Altura da falsa frente: 9,4 m é o mínimo que fecha o ALT1, não necessariamente o que parece certo.** A captura frontal do SALOON (fachada de 6,6 m + 2,8 m de falsa frente) leu como boomtown de verdade e não como papelão, mas é UMA fachada, num pose só, sem personagem para dar escala.
3. **O mastro/chaminé de 10,4 m no centro de cada fachada.** Na vista aérea ele lê como um poste escuro saindo do telhado de todas as 8 casas — a repetição é o problema, não a peça. Dá 8 massas do h90 (que tem margem de 3 massas hoje), então tirar exige repor altura em outro lugar.
4. **Onde a MID fica ancorada visualmente.** (−7,4) fica a 3,2 m do `obstaculo-bebedouro` de (−8,1) — daí o label `BEBEDOURO DO LARGO`. O número está certo (triângulo 7,97 m, penetração 0), mas se o dono quiser a bandeira colada no bebedouro, a alternativa que a receita mediu é (−8,0) → triângulo 6,45 m.
5. **Chão com `repeat` 37,5×45.** Na altura do olho ficou cascalho legível (128 px/m contra 41), mas em rasante, além dos 70 m, o tile de 4 m faz bandas horizontais. A névoa (68→150 m) come a maior parte; ainda assim é o tipo de coisa que só se decide olhando.
