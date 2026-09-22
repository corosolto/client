<!-- Receita gerada em 12/09/2026 por rodada de análise com contexto limpo.
     Medições: node tools/eval/map-check.mjs all + node tools/eval/mapa-novo-gate.mjs (12/09) e
     sondas em memória sobre tools/eval/harness.mjs. Índice: ../RECEITAS-MAPAS.md -->

I'll start by reading the required context and the map file.# Penitenciária da Treta — receita

## 0. Leitura do arquivo (o que existe hoje)

Arena 76×96 m, **264 linhas, 1.167 malhas, zero instanciação** (`map_penitenciaria.js`). Muro maciço 5,8 m nos 4 lados (`:111-114`); cerca de 2,5 m + 486 anéis de arame soltos em cima (`fence` `:115-127`, coils `:124`); 4 guaritas nos cantos ±33,5/±43,5 com laje a 6,5 m e **topo `collide:false`** (`guardTower` `:129-139`, `:136`). 12 celas transitáveis em `|x| 25→34,2` (`cell` `:141-155`) — atrás delas sobra um **corredor de serviço de 3,05 m × 94 m sem um corte sequer** (x ±34,45 a ±37,5). Pátio 35×43 (`:158`), 6 caixas de munição (`:165-171`), 10 obstáculos de centro (`:173-190`), 1 viatura (`:192-202`), 2 sacos de boxe (`:204-209`), 3 dinamites **sem colisor nenhum** (`:211-215`), 4 bancos (`:217-221`), 20 armas (`:224-228`). Sem céu: `scene.background = new THREE.Color(0xa8b5b7)` (`:107`), sem `setMapSky`/`applyLook`, `build(scene)` nem recebe `T`. Bandeiras colineares em x=0 (`:262`), spawns z=∓42 (`:261`).

Tudo abaixo foi **medido em sonda própria** (`/tmp/pen_probe2.mjs`, `/tmp/pen_census.mjs`, só importam `tools/eval/harness.mjs`, nada escrito no repo). A base bateu com o enunciado ao decimal: E 79,3% / B 76,1%, visada 98,5 m, MAP5 pior esp 20,60, 843 massas / 4,4% / 9 ângulos, h90 8,80, 27 materiais / 21 chapados.

---

## 1. Jogabilidade e dificuldade  (MAP5 ≤7 m · cover ≤12,5 m · CTF1 >4,5 m · exposição ↓)

### 1a. As 3 bandeiras — por que dá 0,00 e o que conserta

`CTF1 = 2·área/maior lado`. O mapa é **espelhado em z** (mesmos x nos dois spawns, `:261`). Com as 3 bandeiras em x=0 a área é 0 **por construção**: nenhuma reposição no eixo resolve. Numa simetria espelhada, `E=(a,−c)`, `B=(a,+c)`, `MID=(m,0)` → **CTF1 = |m − a|**, ou seja, a altura do triângulo É o deslocamento lateral entre as pontas e o meio. Mover E e B juntos para o flanco oeste preserva a simetria (e a justiça) e resolve.

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.1 | bandeira **E 'PAVILHÃO 4'** sai de (0,−39) e vai para a boca do pavilhão oeste | **−19,5 / −27,5** | ponto, chão limpo (penetração medida 0,00) | `ctfPoints` `:262` | CTF1 **0,00 → 19,50 m**; distSpawn **5,83 → 15,18 m**; linha de tiro da bandeira **88,2 → 69,4 m** |
| 1.2 | bandeira **B 'PAVILHÃO 6'** espelhada | **−19,5 / +27,5** | idem | `:262` | distSpawn 15,18 m; linha **88,4 → 69,5 m** |
| 1.3 | **MID 'PÁTIO' fica em (0,0)** — é a identidade do mapa e o vértice do triângulo | 0 / 0 | — | `:262` | linha da MID **55,9 → 38,7 m** |

Rotação MID→bandeira = 33,7 m em linha; caminho real ≈ 42 m ⇒ **10,1 s** a 4,17 m/s (teto 25 s).

### 1b. Massa nova que corta a visada e enche os quadrantes

Tudo espelhado em z (`for (const S of [-1,1])`), x igual nos dois lados — a simetria de justiça fica intacta. Blocos construídos com `aoBoxGeo(w,h,d)` + `aoMatFactory()` (padrão do `map_quebrada.js:23,77,82`), UV em metros a 128 px/m.

| # | intervenção | x,z (centro) | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.4 | **Pavilhão 4 / 6** (oeste), hall coberto + laje andável | **−19,5 / ∓33,5** | 11 × 5,8 × 8 m; pé-direito 5,45 m | 2 paredes `0,4×5,8×8` em x −24,8/−14,2; fachada externa `0,6×5,8×0,4` em x −24,7 + `7,8×5,8×0,4` em x −17,9; fachada interna `7,8×5,8×0,4` em x −21,1 + `0,6×5,8×0,4` em x −14,3 | portas nas **pontas opostas** (vão 2,6 m, deslocamento 7,2 m em 7,6 m de profundidade) ⇒ nenhuma reta z atravessa o bloco |
| 1.5 | **Ala de serviço / Oficina** (leste), espelho em x | **+19,5 / ∓33,5** | idem | mesmas peças com x espelhado; a viatura (`:202`) muda de (17,−25) para **(21,−33,5)**, dentro da garagem | fecha q2,0 e q2,3: **esp 20,22 e 20,60 → 6,8 m** |
| 1.6 | **Pórtico da Divinéia** (a passagem central) | **0 / ∓33,5** | 11 × 6,4 × 5 m | face sul `2,9×6,4×0,45` em x −4,05 + `5,5×6,4×0,45` em x +2,75; face norte `5,5…` em x −2,75 + `2,9…` em x +4,05 | portas trocadas de lado (deslocamento 5,4 m em 5 m) ⇒ nenhum tiro reto pelo eixo |
| 1.7 | **Solários** (dois muros de banho de sol no pátio, cavalgando z=0) | **∓9,5 / 0** | 8 × 3,2 × 7 m cada | `aoBoxGeo(8,3.2,7)` | fecham os dois corredores retos em x ≈ ±9,5 que o pórtico abriu |
| 1.8 | **Blocos do chuveirão** (no eixo, poupando o anel da MID) | **0 / ∓8** | 8 × 3,0 × 3,2 m | idem | mata a diagonal spawn→spawn que passava rente a (0,0) |
| 1.9 | **Massas de flanco** (banheiro/depósito nos corredores laterais) | **∓21 / ∓10** e **∓21 / ∓20** | 5 × 3,4 × 6 m e 5 × 3,4 × 5 m (8 peças) | idem | corta o corredor de flanco de 59 m em trechos de 7–16 m; derruba a linha da bandeira 73,5 → **69,4 m** |
| 1.10 | **Taipais do corredor de serviço** — o alley de 94 m atrás das celas | **∓35,95 / ∓5, ∓15, ∓25** | 3,1 × 5,8 × 0,5 m (12 peças) | `addBox` comum | visada limpa global **86,4 → 80,2 m** |

### 1c. MAP1 — os 14 pontos com o corpo dentro de sólido (causa identificada)

Reproduzi 12 dos 14 com a sonda; a origem é exata.

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.11 | **`gaiola`: o colchão branco não tem colisor.** `addBox(2.5,.75,1.5,MAT.white,x,.27,z,{ry,**collide:false**})` (`:184`) tem topo **1,02 m** — exatamente a "pior penetração 1,02 m" do enunciado. A base (`:182`, topo 0,25 m) não empurra ninguém porque `_collide` (game.js:4915) exige `pos.y+0.3 < c.maxY` e 0,3 < 0,25 é falso: o jogador **anda para dentro** do colchão | (−16,5,−4), (−3,−13), (3,−6) | 2,5 × 0,75 × 1,5 | tirar `collide:false` da `:184` (e dos 4 montantes da `:183`) | **10 pontos MAP1 → 0**; +3 props (q1,1 +2, q2,1 +1); cobertura na faixa útil 0,9–1,6 m |
| 1.12 | **`dynamite` (`:211-215`) não cria colisor nenhum** — a banda `boxGeo(.18,.65,1.65)` em y .25 tem topo **0,575 m**, os 2 pontos restantes da sonda | (−19,−16), (19,17), (4,23) | colisor 1,7 × 0,65 × 1,8 | `addBox(1.7,.65,1.8,MAT.rust,x,0,z,{ry})` como base da banca | **2–4 pontos MAP1 → 0**; +3 props (q0,1 +1, q3,2 +1, q2,2 +1) |
| 1.13 | **A viatura não corta linha de visão.** `:200` faz `occluders.push(group)`; `_losClear` (game.js:5914) chama `intersectObjects(..., false)` — um `Group` sem geometria não intersecta nada | (21,−33,5) | — | empurrar as 3 malhas de lataria (`part(2.7,.75,5.4)`, `part(2.35,1.05,2.65)`, teto) para `occluders`, não o grupo | 1 occluder fantasma a menos em 78; a garagem passa a ocultar de verdade |
| 1.14 | **Gaiola: a chapa de topo em y 1,72–1,84** fica dentro da cabeça de quem sobe na base de 0,25 m | mesmas 3 | subir para y **2,15** | `:184` | clipping de cabeça; MAP1 continua 0 |

### 1d. Recheio de MAP5 — o que ainda falta depois da estrutura

Quadrantes medidos hoje e o alvo (`nP ≥ ⌈área/49⌉`):

| quadrante | x0,z0 | área andável | props hoje | esp hoje | faltam |
|---|---|---|---|---|---|
| q1,0 | −18,6 / −47,1 | 424 m² | 1 | 20,60 m | **+8** |
| q2,0 | 0 / −47,1 | 409 m² | 1 | 20,22 m | **+8** |
| q2,3 | 0 / +23,6 | 424 m² | 1 | 20,60 m | **+8** |
| q1,1 | −18,6 / −23,6 | 412 m² | 2 | 14,35 m | **+7** |
| q1,2 | −18,6 / 0 | 400 m² | 4 | 10,00 m | **+5** |
| q2,1 | 0 / −23,6 | 398 m² | 5 | 8,92 m | +4 |
| q1,3 | −18,6 / +23,6 | 418 m² | 6 | 8,35 m | +3 |
| q0,1 · q0,2 · q3,2 | — | ~363 m² | 7 | 7,20 m | +1 cada |

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.15 | **10 mesas de concreto do pátio de sol**, cada uma com `ry` próprio | (−15,−20) ry .35 · (−9,−19) −.5 · (−13,−13) .8 · (−6,−8) −.25 · (−16,−9) 1.1 · (−15,6) .4 · (−8,12) −.7 · (−14,19) .2 · (7,−19) −.4 · (14,−12) .9 | 1,8 × 0,78 × 0,9 m | `aoBoxGeo` + `MAT.concrete`, colisor normal | fecha q1,1 (+5), q1,2 (+3), q2,1 (+2) — e entra em ORT1 |
| 1.16 | **4 barreiras de revista** nos antepátios | (−8,−40) ry .3 · (−4,−31) −.4 · (8,40) −.3 · (4,31) .4 | 3,2 × 0,95 × 0,6 m | `placeProp('jersey_barrier',{targetLen:3.2})` + colisor declarado | q1,0 +2, q2,3 +2 |
| 1.17 | **Carga da oficina leste**: 2 contêineres + pilha de pneus + entulho | (22,−26) ry .25 · (16,−39) ry 1,4 · (23,−21) · (15,−30) | `junkyard_container` 6,1×2,4×2,6 · `pilha_pneus` Ø2,2 h1,1 · `construction_rubble` 3×1,2 | `PropBatch({bucket:20})` (padrão `map_campomorro.js:65`) | q2,0/q3,0 acima do piso, sem clone solto |
| 1.18 | **Mover 2 obstáculos que colidem com os solários** | `gaiola` idx2 (−14,−2) → **(−16,5, −4)**; `entulho` idx3 (13,1) → **(16,3)** | — | `:190` | ambos ficam em `|x|≤18, |z|≤22` ⇒ **PEN4 continua verde** |

**Resultado medido do conjunto 1.1–1.18** (sonda, mesma definição das réguas):

| régua | hoje | depois |
|---|---|---|
| MAP1 corpo dentro de sólido | **14** (pior 1,02 m) | **0** |
| MAP2 exposição E / B | **79,3% / 76,1%** | **11,6% / 11,7%** |
| MAP2 maior visada do spawn | **98,5 m** | **70,4 / 67,8 m** |
| visada limpa global do mapa | **111,6 m** ((−33,1;−45,1)→(32,9;44,9)) | **80,2 m** |
| MAP5 pior espaçamento | **20,60 m**, 10 quadrantes em falta | **6,84 m**, **zero** em falta |
| MAP5 pior razão de densidade | **0,12×** (piso 0,35) | **0,58×** |
| CTF1 altura do triângulo | **0,00 m** | **19,50 m** |
| CTF1 distância ao spawn | **5,83 m** (piso 9) | **15,18 m** |
| linha de tiro E / MID / B | **88,2 / 55,9 / 88,4 m** | **69,4 / 38,7 / 69,5 m** |
| cover ≥0,9 m a partir dos 8 spawns | **16,7–16,8 m** (teto 12,5) | **1,86–5,50 m** |

---

## 2. Verticalidade  (ALT1 h90 ≥9 m · ≥1 cota andável nova)

O h90 de 8,80 m **é o arame farpado**: 486 dos 843 "massas" são os anéis `TorusGeometry(.34,.025)` de `:123-124` com topo 8,815 m — 58% do censo é detalhe de arame, e é isso que fixa o percentil e afunda o ORT1 (denominador inflado).

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 2.1 | **Concertina: 486 anéis soltos → 4 hélices**, uma por lado | perímetro ±38 / ±48 | `TubeGeometry` sobre `CatmullRomCurve3`, raio 0,34 m, passo 0,7 m, tubo 0,025 m, eixo em **y 9,15** (topo 9,52 m) | 1 malha por corrida | **−482 malhas** (1.167 → 827); censo de massa 843 → 361, o que destrava o ORT1 |
| 2.2 | **Postes da cerca 2,5 → 3,4 m** (`:118`), rails para **6,5 / 7,9 / 9,1** (`:120`) | perímetro, a cada 3 m | 0,08 × 3,4 × 0,08 | 3 números em `fence()` | 118 massas com topo **9,2 m** ⇒ **ALT1 h90 8,80 → 9,20 m** (muro 5,8 + cerca 3,4 = 9,2 m, altura de perímetro de presídio real) |
| 2.3 | **Laje andável dos 4 blocos a 5,8 m** — a cota nova | Pavilhões (∓19,5; ∓33,5) e Alas (±19,5; ∓33,5) | 11 × 8 m cada, 4 lajes = **352 m² de cota nova** | `groundHeightAt(x,z,yRef)` no padrão de `map_lajes_authored.js:818-850` (`ALTURA_LIVRE 1.95`, pé-direito 5,45 m ✓); exportar `levels:[{nome:'laje do pavilhão',…}]` | primeira cota andável do mapa; MAP3 passa a ter escada medida |
| 2.4 | **Escada externa de cada bloco** (face do muro) | (−24,8; −33,5), (−24,8; +33,5), (+24,8; ∓33,5) | **33 degraus de 0,176 × 0,29 m**, lance 9,28 m, **32,0°**, largura 1,4 m | `stairs:[{nome,x0,x1,z0,z1,topo:5.8}]` (padrão `map_escadao.js:800-809`) | NBR 9077: espelho 0,176 ∈ [0,16;0,19] · piso 0,29 ∈ [0,25;0,32] · **2h+p = 0,642** ∈ [0,62;0,66] · 32,0° ∈ [25;40] · 1,4 ≥ 1,2 — MAP3 verde por construção |
| 2.5 | **Guarda-corpo em todas as bordas das 4 lajes**, com vão só na chegada da escada | ∓19,5 / ∓33,5 | `11×1,1×0,25` (×2) + `0,25×1,1×8` (×2) por bloco | `addBox` com colisor | **MAP6 = 0 bordas sem guarda** (queda de 5,8 m > 2,0 m) |
| 2.6 | **Topo das 4 guaritas vira ronda** — hoje `addBox(4.8,.4,4.8,…,9.35,…,{collide:false})` (`:136`) é uma casca | ±33,5 / ±43,5 | laje 4,8 × **0,55** × 4,8 em y 9,35 | tirar `collide:false`, subir h para 0,55 e ligar por **passarela 1,6 m** da laje do bloco vizinho até a guarita (vão de 6,2 m) | +4 massas com topo **9,9 m**; a guarita deixa de ser cenário |
| 2.7 | **8 caixas d'água sobre as lajes** | (∓19,5±3,5; ∓33,5) | Ø1,6 h2,5, base em y 6,9 → **topo 9,4 m** | `placeProp('caixa_dagua_azul'/'caixa_dagua_fibra',{targetH:2.5})` via `PropBatch` | 8 massas acima de 9 m e a silhueta de laje brasileira |

Medido depois de 2.1+2.2+2.7 e das massas da seção 1: **503 massas · h50 4,10 · h90 9,20 · hmax 9,60**.

---

## 3. Visual e escala  (SUP2 ≤6% · SUP1 ≤40% · ORT1 ≥15% / 20 ângulos · UV 128 px/m)

**Correção do enunciado:** SUP2 não é o problema. Medindo com a *mesma* `areaDe()` do `mapa-novo-gate.mjs:242` dá **554 m² sem textura de 39.890 m² = 1,4%** (teto 6%). O `tools/eval/texel_check.json` versionado só tem 10 mapas e não inclui `penitenciaria` — o número oficial de SUP2 deste mapa **não existe hoje**; o `texel-check.mjs:190` usa `Object.keys(MAPS)`, então basta rodá-lo para ele nascer. **O vermelho real é SUP1: 21 de 27 materiais sem `map` (77,8%).**

Os 21 chapados, com área medida:

| material | área sem textura | malhas | onde |
|---|---|---|---|
| `#714529` rust | 217,8 m² | 517 | anéis de arame (`:123`) + dinamite (`:213`) |
| `#111519` black | 78,0 m² | 83 | grelhas do ralo (`:163`), montantes da gaiola, corpo das armas |
| `#252c27` **×5 materiais distintos** | 165,3 m² | 5 | as 5 manchas de umidade — `:160` cria **um `MeshBasicMaterial` novo por mancha** |
| `#b42d25` red | 31,3 m² | 21 | sacos de boxe + dinamite |
| `#e5a92f` / `#173f79` / `#17191a` / `#8fb2c0` | 58,9 m² | 11 | faixa da barreira, giroflex, pneu, vidro |
| `#4b4a48`/`#a27672`/`#5f5044`/`#657078` (9 materiais) | 1,5 m² | 45 | **fauna de `ambientlife.js`** — não é deste mapa |

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 3.1 | **Um material de mancha, não cinco** | as 5 manchas de `:159-162` | — | tirar o `new MeshStandardMaterial` de dentro do laço; um `MeshBasicMaterial({map:T.concreteDark, transparent:true, opacity:.2, depthWrite:false})` compartilhado | 27 → 23 materiais; −5 chapados |
| 3.2 | **`map` nos 7 materiais lisos** | `:77-85` | — | `rust`→`T.metal` · `black`→`tex.darkConcrete` · `yellow`→`tex.concrete` · `blue`→`tex.steel` · `glass`→`T.metal` · `rubber`→`T.asphalt` · `red`→`T.tent` (lona do saco) | −7 chapados |
| 3.3 | **`build(scene, T)`** — a assinatura hoje é `buildPenitenciaria(scene)` (`:9`) e joga fora o `T` que `game.js:655` já passa | — | — | trocar a assinatura; abre `T.grass/pixo/graffiti/posters/metal/muralEternamente` | pré-requisito de 3.2, 4.x e do céu |
| 3.4 | **Materiais novos do pavilhão todos com `map`** (reboco, chapa galvanizada, azulejo do chuveirão, pintura descascada, tela) | — | — | canvas local **passa por `applyAniso`** (`textures.js`) — a falta virou régua nos PRs #547/#563 | **SUP1 77,8% → 32,1%** (9 chapados de 28), medido |
| 3.5 | Resíduo declarado: **os 9 chapados restantes são rato/pombo de `ambientlife.js`**, compartilhados por todo mapa com fauna | — | — | conserto fora deste arquivo | se forem consertados: 0% |

### ORT1 — 4,4% e 9 ângulos, e por que a correção óbvia é batota

Rotacionar os 486 anéis de arame daria 58% de massa girada em uma linha — e **não mudaria um pixel**: um toro girado em torno de Y é o mesmo círculo. É exatamente a fraude que o cabeçalho do portão descreve (`mapa-novo-gate.mjs:26-29`). **Recuso.** O caminho é 2.1 (a hélice derruba o denominador de 843 para 361) mais conteúdo genuinamente fora de esquadro:

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 3.6 | **24 varais entre as grades**, um por cela, `ry` distinto de 5° a 85° | x ∓27,5; z = −30,−20,−10,10,20,30 (±2 m) | 3,2 m de vão, 1,9 m de altura | `PropBatch.add('varal_roupas_01'/'varal_roupas_02'/'lajes_varal', {ry})`, `bucket:20` | 24 massas giradas, 24 ângulos — e é a imagem-assinatura do lugar |
| 3.7 | **16 colchões e chapas de zinco encostados no muro** (`ry` + inclinação 0,22 rad) | z de −44 a +43, passo 5,8 m, alternando x ∓36,2 | 1,05 × 1,95 × 0,12 m | `aoBoxGeo` + `InstBatch({bucket:14})` | 16 massas giradas; ocupa o corredor de serviço |
| 3.8 | **12 mastros de varal nas lajes** | ∓19,5 ± 3,2 / ∓33,5 ± 2,4 | 0,12 × 2,2 × 0,12 m | `InstBatch` | 12 massas giradas |
| 3.9 | as 10 mesas (1.15) + 4 barreiras (1.16) + 3 gaiolas (1.11) já entram giradas | — | — | — | +17 |

Medido com 2.1+3.6→3.9 e as massas da seção 1: **ORT1 4,4% / 9 ângulos → 21,1% / 37 ângulos** (piso 15% / 20).

**Alternativa que NÃO recomendo sozinha, mas que existe e tem precedente:** `CLASSE.penitenciaria = 'planejado'` em `mapa-novo-gate.mjs:146-155`, pela mesma razão escrita ali para o `loja_h` ("grade é o assunto do lugar") — um presídio é ortogonal por programa. Isso isentaria o ORT1 sem construir nada. Prefiro construir: o dono reclamou que o mapa é chapado, e isenção não desachata nada.

---

## 4. Brasilidade  (sem gore, sem pessoa real, sem copyright)

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 4.1 | **Céu.** Hoje é `scene.background = Color(0xa8b5b7)` (`:107`). Carandiru é São Paulo | — | — | `setMapSky(scene, T, '/img/textures/sky_sp.webp', 0xd6dad9)` — é o único céu de SP que existe **na main** hoje. O `sky_penitenciaria.webp` + entrada `LOOK.penitenciaria` (fim de tarde azul-chumbo, vapor de sódio) existem **só na pilha**; quando ela entrar, trocar por `applyLook(scene, T, 'penitenciaria')` | `eval:look` mede o céu usado; hoje o mapa não declara nenhum |
| 4.2 | **Mural de tinta descascada** na face interna do muro sul e norte — gestão prisional, não gore | 0 / ∓47,4 (e ∓37,4 / 0) | 4 painéis de 12 × 3,2 m em y 0,9 | `PlaneGeometry` com `T.muralEternamente` / `T.graffiti` + camada de reboco descascado em canvas (**com `applyAniso`**) | +2 materiais com `map`; superfície que hoje é concreto liso de 76 × 5,8 m |
| 4.3 | **Grafite de gestão prisional** (pintura institucional: "SILÊNCIO", "RAIO 4", numeração de cela estarcida) | faces das celas em x ∓25, z das 12 celas | letras de 0,45 m | canvas + `T.pixo` como sujeira por cima | leitura de cela numerada; SUP1 |
| 4.4 | **Varal entre as grades** | ver 3.6 | 24 unidades | `varal_roupas_01/02`, `arara_roupas` | ORT1 +24 |
| 4.5 | **O radinho de pilha no pátio de sol** | (−11, −6) e (8, 11) | Ø0,45 h0,35 | `placeProp('caixa_som',{targetH:0.35})`; `sound.loops` ganha `{src:AMB_LOOPS.funk, pos:[-11,1,-6], radius:18, vol:.18}` ao lado dos dois loops de `:260` | som local, não ambiente global |
| 4.6 | **Torre com holofote** (institucional, não central — o centro é o pátio) | (−16, −16) e (16, 16) | mastro 0,5 × 11 m + 2 refletores 0,9 × 0,6 m em y 10,2 | `addBox` + `SpotLight` desligada (só a casca; a luz do mapa fica no sol/hemi de `:230-232`) | +2 massas com topo **11 m**; silhueta de presídio |
| 4.7 | **Pátio de sol**: 10 mesas de concreto (1.15) + botijão + churrasqueira improvisada | ver 1.15; botijão (−12,−4), churrasqueira (9,9) | — | `placeProp('botijao_gas')`, `placeProp('churrasqueira')` via `PropBatch` | MAP5 + brasilidade |
| 4.8 | **Ônibus de transferência** na oficina leste, no lugar do pátio vazio | (21, 33,5) dentro da Ala norte | 11,5 × 3,1 × 2,9 m | `placeProp('onibus_urbano',{targetLen:11.5, ry:1.57})` + colisor declarado | enche q2,3/q3,3 e dá a leitura de "saída" |
| 4.9 | **Caixas d'água nas lajes** | ver 2.7 | — | `caixa_dagua_azul`, `caixa_dagua_preta`, `caixa_dagua_fibra` (3 modelos para não ler cópia) | ALT1 + silhueta |
| 4.10 | **Fauna**: manter os 3 ratos e 3 pombos de `:246-257`, acrescentar 2 pombos **na laje** dos pavilhões | (−19,5; −33,5) e (19,5; 33,5), y 5,8 | — | `pigeons:[{mode:'ground', pos:[-19.5, 5.8, -33.5]}]` | a cota nova deixa de parecer vazia |

Vetado e não incluído: sangue, marca de tiro, cadáver, rosto ou nome de pessoa real, referência a 2 de outubro de 1992. O mapa é "Penitenciária da Treta", ficcional; o lugar é reconhecível pela arquitetura e pelo varal, não pelo massacre.

---

## 5. Ordem de execução e custo

| passo | o que entra | fecha | risco |
|---|---|---|---|
| **1** | `build(scene, T)` + céu `sky_sp.webp` + material único de mancha + `map` nos 7 lisos (3.1–3.4) | **SUP1 77,8% → 32,1%**; mapa passa a declarar céu | nenhum; não toca colisor, rota nem CTF |
| **2** | Colisor na gaiola e na dinamite; occluders da viatura (1.11–1.14) | **MAP1 14 → 0**; +6 props; 1 occluder fantasma a menos | a gaiola vira obstáculo sólido de 1,02 m no pátio — é cobertura útil (0,9–1,6 m), mas muda o feel do miolo: precisa de olho |
| **3** | Hélice de arame + postes 3,4 m + laje/guarita andável + escadas + guarda-corpo (2.1–2.7) | **ALT1 8,80 → 9,20**; 352 m² de cota nova; **−482 malhas**; MAP3 e MAP6 nascem verdes | `groundHeightAt(x,z,yRef)`: quem chama **sem** `yRef` (incluindo as réguas) passa a ler a laje como chão dentro da pegada dos 4 blocos. É o comportamento do `map_lajes_authored.js` hoje e ele passa — mas **as bandeiras e os 8 spawns têm que ficar fora das pegadas**, e ficam (o item 1.1 põe a bandeira a 2,2 m da face, no chão, penetração medida 0,00) |
| **4** | Os 4 blocos, pórtico, solários, chuveirão, flancos, taipais (1.4–1.10) | **exposição 79,3/76,1% → 11,6/11,7%**; visada do spawn **98,5 → 70,4 m**; visada global **111,6 → 80,2 m**; cover do spawn **16,7 → 1,86–5,50 m** | é a mudança grande: reconstrói os dois antepátios. Rodar `eval:penitenciaria` logo depois — **PEN1 exige exatamente 4 objetos com nome `penitenciaria-guarita-`**, então os blocos novos **não podem** usar esse prefixo, e **PEN4 exige ≥8 `obstaculo-centro-` em `\|x\|≤18, \|z\|≤22`** (item 1.18 preserva) |
| **5** | Bandeiras e rótulos (1.1–1.3) | **CTF1 0,00 → 19,50 m**; distSpawn **5,83 → 15,18 m**; linhas 88,2/55,9/88,4 → **69,4/38,7/69,5 m** | rótulos passam a ser 'PAVILHÃO 4' / 'PÁTIO' / 'PAVILHÃO 6'; `eval:ctflabels` e o HUD precisam ser conferidos |
| **6** | Recheio: mesas, barreiras, varais, colchões, mastros, props de brasilidade (1.15–1.17, 3.6–3.9, 4.x) | **MAP5 20,60 → 6,84 m, zero quadrantes em falta, razão 0,12× → 0,58×**; **ORT1 4,4%/9 → 21,1%/37** | tudo repetido entra por `PropBatch({bucket:20})` / `InstBatch({bucket:14})` — clone solto aqui recria o `fy_mansao` de 2.038 draw calls. Saldo de malhas do pacote inteiro: **1.167 → 827** |

---

## 6. O que eu NÃO consegui decidir sem olhar figura

1. **A diagonal residual de 80,2 m.** Sobra uma reta limpa de (10,9;−45,1) a (16,9;34,9), pelo flanco leste. Estreitar o vão central dos solários de 11 m para 7 m derruba para 82,0→ pouca coisa e aperta o anel de captura da MID. A alternativa é uma **torre de holofote central**, que testei em (3,2;0): valeu 0,4 m e encostou na bandeira. Não fecho isso no número: **80 m num presídio de 96 m de fundo pode ser exatamente a leitura certa** — é a pergunta que precisa de captura, não de sonda.
2. **Se a laje a 5,8 m deve mesmo ser fechada por guarda-corpo cheio** (item 2.5) ou por mureta de 0,9 m com grade vazada. O guarda-corpo cheio garante MAP6, mas tira a linha de tiro de quem está em cima — pode matar o valor da cota. Precisa de um frame de cima da laje.
3. **A porta na ponta oposta** (item 1.4/1.6) é o que mata o tiro reto, mas força o jogador a atravessar o bloco inteiro na diagonal. Pode ler como labirinto. Só playtest responde.
4. **Textura das lajes e do reboco descascado**: não sei dizer se o `T.concrete` a 128 px/m aguenta uma parede de 11 × 5,8 m sem virar xadrez — a nota de `textures.js:347` diz que a família se espalha de 28 a 314 px/m e que o conserto é por superfície. Precisa de captura na distância em que o mapa é servido.

---

## Comparação explícita com o PR #556 e com o dossiê

**O dossiê `CARANDIRU-REAUTORIA.md` não está na main.** Ele só existe em `worktrees/mapas-stack-{547,548,550}-v2`. O `public/js/map_penitenciaria.js` da main tem **264 linhas**; o da pilha tem **912**. Os 5 GLBs de presídio (`torre_vigilancia`, `bloco_celas`, `portao_penitenciaria`, `guarita_muro`, `carandiru_viatura_1990`), o `sky_penitenciaria.webp` e a entrada `LOOK.penitenciaria` **também não existem na main**. Por isso esta receita só usa o catálogo que está em `public/models/props/` hoje e `sky_sp.webp`.

**O que o #556 já entrega e esta receita NÃO deve refazer:**

| #556 | o que é | veredito |
|---|---|---|
| 4 passarelas a **5,8 m** e 6 rotas pátio→guarita | cota andável nas **muralhas** (`walkway(...,3.4,90,−35.6,0)` etc.) | **Mantenho a cota em 5,8 m de propósito** — os itens 2.3/2.4 usam a mesma altura para que as duas soluções empilhem sem degrau de 0,2 m e para que uma escada sirva às duas. |
| Pavilhão 6 oco com galeria, 12 janelas, peitoris e vergas | massa institucional no centro | **Não conflita**: meus blocos ficam nos antepátios (`\|z\| 29,5–37,5`), fora da pegada do Pavilhão 6 (centro). |
| `applyLook(scene,T,'penitenciaria')` + `sky_penitenciaria.webp` | céu noturno de vapor de sódio, `grade.exposicao 2.60` | **Melhor que o meu 4.1.** Quando a pilha entrar, trocar `setMapSky(sky_sp)` por `applyLook` e apagar o item 4.1. |
| Viatura Mint 1990, 4.840 tri | casca visual com fallback e colisor idêntico | **Reuso**: o item 1.5 move a viatura para a garagem em (21;−33,5); se o GLB existir, é o mesmo colisor. |
| CAR1–CAR10, recibos Chrome, 3 vídeos C4 | arnês próprio | mantém. |

**O que o #556 NÃO resolve — e esta receita resolve:**

1. **CTF1 continua 0,00.** `map_penitenciaria.js:833` da pilha mantém `ctfPoints = [{E,0,−39},{MID,0,0},{B,0,39}]` — **as três bandeiras seguem em x=0**, e `spawns` (linha 832) segue idêntico ao da main. O #556 renomeia a MID para 'PAVILHÃO 6' e **não mexe na geometria do triângulo**: 4 escadas e 6 rotas não movem um metro da altura do triângulo nem os **5,83 m** de bandeira→spawn. Os itens 1.1–1.3 são aditivos ao #556 e independentes dele.
2. **As passarelas de muralha do #556 agravam o alley que eu encontrei.** `walkway('carandiru-passarela-muro-oeste', 3.4, 90, −35.6, 0)` põe **90 m de passarela contínua a 5,8 m exatamente por cima** do corredor de serviço de 3,05 × 94 m que a minha sonda apontou como a maior visada limpa restante (86,4 m em x=−35,1). A própria crítica independente do C3/C4 registra isso em palavras — *"o corredor continua comprido, estreito e escuro, sem cobertura intermediária evidente"* — e o C4 fechou como **WARN**, com o item em aberto. Os **taipais do item 1.10** (∓35,95; z ∓5, ∓15, ∓25) são a resposta numérica a esse parecer: cortam o térreo **e** precisam ser replicados na cota 5,8 m como guarda-corpo transversal com passagem de 1,2 m, senão o alley só sobe de andar.
3. **MAP1 = 14 continua.** A `gaiola` (`:181-184`) e a `dynamite` (`:211-215`) estão idênticas na versão de 912 linhas da pilha (a `dynamite` aparece lá na linha 577, com o mesmo `band` sem colisor). Nenhuma régua CAR mede corpo dentro de sólido; o MAP1 mede, e ninguém rodou.
4. **SUP1 e o censo de massa.** Os 486 anéis de arame e os 5 materiais de mancha estão nos dois lados. O #556 não toca em `fence()` nem em `:159-162`.

**Contra o dossiê, um ponto de método:** o C3 registra que *"a primeira captura foi rejeitada localmente porque as placas estavam espelhadas"* e o C4 que *"duas tentativas foram rejeitadas antes do lote final"* — o processo funcionou. Mas em quatro checkpoints, com 10 réguas CAR próprias, **nenhuma mediu colinearidade de bandeira, exposição de spawn, densidade por quadrante nem corpo dentro de sólido** — que são as quatro coisas que o `map-check.mjs` já media, de graça, para os 17 mapas. A lição barata aqui não é escrever a 11ª régua CAR: é o mapa entrar no `map-check all` e o número vermelho não ser ignorado porque o portão local está verde.

---

**Nada foi editado.** As medições saíram de `/tmp/pen_probe2.mjs` e `/tmp/pen_census.mjs` (importam `tools/eval/harness.mjs`, não escrevem nada); `tools/eval/map_check.json` e `texel_check.json` não foram tocados.
