<!-- Receita gerada em 12/09/2026 por rodada de análise com contexto limpo.
     Medições: node tools/eval/map-check.mjs all + node tools/eval/mapa-novo-gate.mjs (12/09) e
     sondas em memória sobre tools/eval/harness.mjs. Índice: ../RECEITAS-MAPAS.md -->

I'll start by reading the shared context file, then the map file in full.# velho_oeste (Velho Oeste da Treta) — receita

## 0. Leitura do arquivo (o que existe hoje)

| parte | onde | o que é de fato |
|---|---|---|
| texturas | `:29-105` | 7 canvas 128 px + 7 webp **512×512** reais (`realTexture` `:92-96`, só com `window`) |
| caixa/cilindro | `:115-134` | `boxGeo` cru + `BoxGeometry` — **sem `aoBoxGeo`, sem AO de contato, sem UV em metros** |
| 8 fachadas | `building() :208-221`, chamadas `:222-229` | `addBox(d,h,w)` **maciço** em x=±29/±29,5 → fachada sem interior; pegada 70-96 m² |
| 4 casas de rua | `streetHouse() :231-246` | também maciças, x=±15, z=±20 |
| cartazes/janelas | `:147-201`, `:248-254` | 8 PROCURADO + 24 janelas western (é o que 5 asserções da régua medem) |
| cercas + pórticos | `:257-266` | 48 mourões `collide:false` → **não são cobertura, mas são massa** (puxam o h90) |
| miolo | `obstacle() :291-347` | 8 obstáculos, todos com `|x|,|z| ≤ 12` — **imposto por `velho-oeste-check.mjs:60`** |
| fardos/barris | `:349-355` | 4 trios + 4 barris = os únicos props fora do miolo |
| chão/céu/luz | `:203-206`, `:386-389` | `PlaneGeometry(150,180)`, `scene.background = Color(0xd88b55)`, **sem `setMapSky`/`applyLook`** |
| contrato | `:391-447` | `groundHeightAt = () => 0`, sem `stairs`/`levels`, bandeiras colineares `:442-446` |

**Baseline medido (réplica exata do `map-check` — meus números batem com `/tmp/map_check_all.json`):** 56 occluders medidos · 50 props MAP5 · mediana 0,655 · pior esp **99** (q3,1) · pior razão **0** · h90 **3,49 m** (438 massas, hmax 8,1) · ORT1 31,5 %/23 (passa, mas **87 das 138 massas giradas são raios de roda de carroça**) · SUP1 11/47 = 23,4 % · CTF1 **0,00 m**, E/B a **7,0 m** do spawn (teto 9) e B com penetração 1,08 · dispersão de texel **773,9×** (teto 1,5; mín 9 px/m no muro de 12 m, máx 6 604 px/m no raio de roda) · chão a **41 px/m** no browser (512 px ÷ repeat 12 ÷ 150 m; piso TEXEL 64).

**Achado que muda tudo:** com as matrizes de mundo atualizadas existem **9 faixas retas de 89 m** com linha limpa na altura do olho (x = −10, −6, −3, 0, 3, 6, 10 na rua + x = 20 e 24 nos becos). Só x=±14 (atravessa as casas de rua) cai para 32 m. Maior visada limpa do mapa: **98,4 m**; p95 das visadas limpas **69,1 m** — contra quebrada 91,8/54,0, fy_lajes 74,0/55,0, fy_campomorro 85,6/56,5. **Não existe régua de visada; o teto que uso é o pior dos três mapas bons: p95 ≤ 56 m.**

---

## T. Decisão de tema: **CONVERTER — e não do zero: aterrar a branch que já converteu**

O tema não é pergunta aberta, é decisão já tomada pelo dono e já implementada numa branch. Evidência lida, não inferida:

| evidência | arquivo |
|---|---|
| veto escrito do dono: *"continua com visual do velho oeste so mudou o nome do mapa, precisa de casas do sertão, … casas de pau a pique, caminhão antigo …, igrejinha, cidade de pernambuco com menos de 3mil habitantes"* | `worktrees/mapas-stack-550-v2/tools/eval/velho-oeste-check.mjs:8-14` (cabeçalho de re-derivação da régua) |
| mapa já reescrito: 889 linhas, `// SERTÃO DA TRETA (velho_oeste) — r2` | `worktrees/mapas-stack-550-v2/public/js/map_velho_oeste.js:1-22` |
| 7 módulos novos | `map_sertao_{architecture,flora,fauna,landscape,horizon,livestock,distant_birds}.js` |
| nome trocado, **id mantido** | `.../public/js/maps.js:93` → `velho_oeste: { name: 'Sertão da Treta', … }` |
| céu resolvido sem asset | `.../public/js/look.js:41-51` → `sky:{kind:'procedural', model:'dry-afternoon'}` |
| 13 réguas + 17 relatórios | `tools/eval/sertao-*.mjs`, `docs/reports/SERTAO-*.md` |

**Custo da conversão (medido, não estimado):**

| item | custo real |
|---|---|
| renomear o id `velho_oeste` | **zero** — a branch manteve o id; só `maps.js:93` (`name`) e `mapcat.js` mudam. Ranking/telemetria/preview (`g2ui-map-previews.mjs:52`) continuam válidos |
| texturas | **6 das 7 se reaproveitam sem reexportar**: caatinga é país de cacto (`cactus-real-v1.webp` → mandacaru), e `dirt/wood/roof/hay/metal-real-v1.webp` servem taipa, telha, capim e zinco. Só `procurados-atlas-v1.jpg` precisa de reenquadramento — e cartaz de "PROCURADO" é historicamente correto para cangaço |
| régua | **19 asserções** amarradas ao vocabulário faroeste (OESTE1 exige literalmente `predio-saloon`; OESTE6 4 nomes de obstáculo; OESTE11-14 cartazes/gênero/recompensa/24 janelas western). A branch já pagou essa re-derivação com procedência escrita — refazer na mão é pagar duas vezes |
| crédito | Ubiracy Santos continua o autor (`mapcat.js:25`), o mapa continua COMUNIDADE |
| geometria nova de verdade | casas de pau a pique/pedra/platibanda (`casaProxy` `:318-355`, `casaPedraProxy` `:356-377`, `casaPlatibandaProxy` `:378-431`), igrejinha `:468-490` |

**O lado de manter faroeste** (argumentado de verdade): é o único mapa com identidade visual coesa e já aprovada por 14 asserções verdes; converter invalida 19 asserções e 7 webp autorais; `plans/22` poderia resolver a sobreposição criando o sertão como mapa 18 em vez de reciclar este. **Por que rejeito:** o custo de asset é ~0 (as texturas servem os dois temas), o custo de id é 0, o dono já vetou por escrito, e o mapa 18 custaria um arquivo novo de 500+ linhas com 16 réguas novas em vez de reaproveitar 449.

**O que a branch NÃO conserta** (medido por mim no worktree 550-v2, mesmo instrumento):

| régua | 550-v2 | teto | veredito |
|---|---|---|---|
| MAP5 pior esp | 9,8 m (q1,0); 7 quadrantes > 7 | ≤7 m | **falta** |
| ALT1 h90 | 4,28 m (494 massas, hmax 26,2) | ≥9 m | **falta** — todas as casas são de 1 pavimento (h 3,1-4,5) |
| CTF1 | **0,67 m**; E e B a **7,0 m** do spawn | >4,5 m / ≥9 m | **falta** (ADRO −12,−34 · PRAÇA DA MATRIZ 0,2 · FORRÓ 12,34) |
| `groundHeightAt` | `() => 0` (`:792`), sem `stairs`/`levels` | — | **falta** (sem interior jogável) |
| visada | pior faixa 59 m (era 89) | p95 ≤56 | melhorou, não fechou |
| occluders | 568 (era 56) | — | resolvido |
| ORT1 | 78,1 %/28 ângulos | 15 %/20 | resolvido com folga |

**Portanto:** as seções 1, 2 e o item CTF desta receita são necessários **nos dois mundos**, e as coordenadas abaixo foram escolhidas em pontos que existem igual nas duas versões (becos x 18-25, largo |x|,|z| ≤ 12, eixo da rua x≈0). A coluna "swap sertão" diz o que troca no retheme.

---

## 1. Jogabilidade e dificuldade (MAP5 ≤7 m · cover ≤12,5 m · CTF1 >4,5 m · exposição ↓)

**Regra dura descoberta medindo:** o grafo de waypoints nasce em `:395-399` com `step = 3,4` a partir de `bounds.minX+1`. As colunas válidas são x ∈ {−32,2 + 3,4k} e z ∈ {−44,2 + 3,4k}. **Todo vão tem que ter ≥4,3 m e conter um ponto desse lattice com ≥0,5 m de folga** — a primeira versão desta receita, com vãos de 2 m, deixou 118 nós ilhados e **desconectou E de B** (medido: `rota E→B = 0 passos`). A versão abaixo mede `336 nós · rota E→B 33 passos · 332/336 alcançáveis`.

### 1.1 Becos laterais — o conserto do q3,1=99 e das 8 colunas famintas
Os becos (x 18,2-25,0, 7,25 m de largura, 90 m de extensão) estão **100 % vazios** hoje: as 8 fachadas têm pegada 70-96 m² e por isso **não contam como prop** (filtro `map-check.mjs:598` = pegada ≤60 m²). Tudo espelhado em `sx ∈ {−1, +1}`.

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.1a | trio de fardos deitados | (sx·21, −36), (sx·21, −18), (sx·21, 6), (sx·21, 33) | 3 cilindros ø1,14 × 1,08 m, eixo em x, passo 1,25 m | estender o array de `:349-351` (`addCylinder(.65,1.15,MAT.hay,…,{collide:true,rz:π/2})`) — **+3 props por trio** | q0,0 15,46→5,6 m · q0,1 11,33→5,1 · q0,2 15,45→4,7 · q3,3 11,57→5,6 |
| 1.1b | barril com tampa | (sx·23,5, −30), (sx·19,5, −26), (sx·23,5, −20,5), (sx·23,5, −12), (sx·19,5, −5), (sx·23,5, 12), (sx·19,5, 14), (sx·23,5, 37,5), (sx·19,5, 40) | ø1,24 × 1,0 m | estender o array de `:352-355` | q3,1 **99 → 5,5 m** e razão **0 → 0,87**; q3,0 15,77→5,2; q0,3 15,9→5,7 |
| 1.1c | muro de fundo de quintal | (sx·20,8, −30), (sx·22,4, −8), (sx·20,8, 16), (sx·22,4, 36) | 5,2 × 2,4 × 0,4 m (alterna o lado: cobre |x| 18,2-23,4 e 19,8-25,0) | `addBox` com `MAT.pale`/`MAT.wood` | visada do beco **x=20: 89 → 22,0 m · x=24: 89 → 28,5 m** |
| 1.1d | torre d'água | (21,5, −24) e (−21,5, 22) | caixa 3,6 × 3,6 × 3,6 m a 7,8 m + 4 pernas 0,34 × 9,6 m nos cantos ±1,5 | `addBox` (caixa com colisor, pernas `collide:false`) | ALT1: +10 massas com topo ≥9,6 m; +1 prop em q3,0 e q0,3 |
| 1.1e | barril no canto morto | (sx·30, 21,5) | ø1,24 × 1,0 m | idem 1.1b | cobertura: pior ponto **12,6 → 11,2 m** (o canto (32,8; 24,8) era 12,6, acima do teto de 12,5) |

*Swap sertão:* 1.1b barril → `caixa_dagua_azul`/`caixa_dagua_fibra` (`placeProp('caixa_dagua_azul',{x,z,targetH:1.0})`, ø≈1,2 — encaixa sem mexer em coordenada); 1.1d → `caixa_dagua_preta` com `targetH 2.2` sobre as 4 pernas; 1.1a fardo de capim serve nos dois temas.

### 1.2 Estações de feira/curral — o conserto do corredor de 92 m
Quatro fileiras de 3 caixotes com **sobreposição de 0,7 m** (nunca fresta: 3 caixas de 4,2 m cobrem 11,2 m contínuos), escalonadas ±0,25 m em z (o escalonamento de ±0,45 m encosta no lattice z e mata nós).

| # | estação | caixas (x, z) — 4,2 × 2,6 × 1,5 m, ry ∓0,05/+0,06 | faixa que tranca | número |
|---|---|---|---|---|
| 1.2a | sul-oeste, z≈−26,5 | (−12,2; −26,75) (−8,7; −26,25) (−5,2; −26,75) | x −14,3…−3,1 | x=−10: 89→28,5 m · x=−6: 89→21,0 m · +3 props em q1,0 |
| 1.2b | sul-leste, z≈−18,7 | (5,2; −18,95) (8,7; −18,45) (12,2; −18,95) | x 3,1…14,3 | x=6: 89→18,5 m · x=10: 89→28,0 m · +3 props em q2,1 |
| 1.2c | norte-oeste, z≈18,7 | (−12,2; 18,45) (−8,7; 18,95) (−5,2; 18,45) | x −14,3…−3,1 | +3 props em q1,2 (7,65→4,5 m) |
| 1.2d | norte-leste, z≈26,5 | (5,2; 26,25) (8,7; 26,75) (12,2; 26,25) | x 3,1…14,3 | +3 props em q2,3 (13,36→4,9 m) |

Vão livre de cada estação: 20,8 m do lado oposto (contém 6 colunas do lattice) → rota em S, nunca corredor. **Nome do grupo NÃO pode começar com `obstaculo-`**: `velho-oeste-check.mjs:60` reprova qualquer `obstaculo-*` com |x| ou |z| > 12. Use `feira-*`/`curral-*`.

*Swap sertão:* cada caixa → `placeProp('stall', {targetLen: 4.2})` (3 por estação) + `guarda_sol` nas pontas; o colisor continua sendo a caixa (o GLB é enfeite, como em `map_campomorro.js`).

### 1.3 Largo central — 4 obstáculos novos (dentro do |x|,|z| ≤ 12 que a régua exige)

| # | nome | x,z | dimensão | por quê |
|---|---|---|---|---|
| 1.3a | `obstaculo-carroca-tombada` | (−6, −1) ry 0,21 | 4,2 × 2,6 × 1,8 m | fecha a faixa x=−6 no meio (os 8 obstáculos atuais têm topo 1,05-1,90 m e deixam x=−6 e x=+6 limpos) |
| 1.3b | `obstaculo-toldo-feira` | (6,5; 4) ry −0,17 | 3,8 × 2,8 × 2,0 m | fecha x=+6; dá sombra ao largo |
| 1.3c | `obstaculo-lenha` | (−10,5; 6) ry 0,13 | 2,8 × 2,4 × 2,6 m | fecha x=−10 no meio |
| 1.3d | `obstaculo-pilha-couro` | (10,5; −5) ry −0,11 | 2,8 × 2,4 × 2,6 m | fecha x=+10 no meio |

Todos com topo 1,8-2,8 m: acima do olho (1,6 m) e ainda agachável por trás na faixa 0,9-1,6 m. OESTE6/OESTE10 continuam verdes (8 → 12 obstáculos, todos dentro de |x|,|z| ≤ 12).

### 1.4 Marcos no eixo da rua (x≈0) — o único lugar onde não cabe chicane

| # | o quê | x,z | dimensão | número |
|---|---|---|---|---|
| 1.4a | capela de madeira / **igrejinha** | (0; −15,5) ry 0,05 | nave 6,4 × 4,2 × 8,2 m (pegada 52 m² → **conta como prop**) + campanário 2,6 × 9,6 × 2,6 m | x=0: 89 → 21,0 m · x=−3: 89→17,5 · x=3: 89→21,0 · +2 massas ≥9,6 m |
| 1.4b | estação/depósito + caixa d'água | (0; 15,5) ry −0,06 | corpo 6,4 × 4,2 × 8,2 m + caixa 3,6 × 11,4 × 3,6 m | idem, sentido norte |

*Swap sertão:* 1.4a é exatamente a `igrejinha` da branch (`map_velho_oeste.js:468-490` do 550-v2) — reaproveitar o proxy inteiro; 1.4b vira `sertao_poco_roda` + caixa d'água.

### 1.5 Densidade interna restante

| x,z | o quê | quadrante que fecha |
|---|---|---|
| trio de fardos (−10, −35); barris (−14, −31) e (−3, −36) | curral da entrada sul | q1,0 **18,62 → 4,9 m** (razão 0,44 → 1,13) |
| trio de fardos (5, −27); barril (14, −26) | pátio do xerife | q2,0 10,88 → 5,6 m |
| trio de fardos (5, 27); barril (14; 26,5) | pátio do estábulo | q2,3 13,36 → 4,9 m |
| barris (−6, 18), (−14, 20) | fundo da pensão | q1,2 7,65 → 4,5 m |
| barris (13, −19), (6, −20), (10, −16) | beira do barbeiro | q2,1 8,45 → 4,0 m |

Nenhum item a menos de 4,4 m de slot de spawn: **MAP2B medido depois = folga mín 4,40 m (teto 1,2) e área contígua mín 71,3 m² (teto 40)** — continua verde.

### 1.6 Bandeiras: colinearidade, enterro e 7 m do spawn

Hoje: E(−12,−34) e B(12,34) estão a **7,0 m** do próprio spawn (teto 9 m, `invariants.mjs:1897`) e B tem penetração **1,08 m** — ela está **dentro do barril** que `:352` põe em (12, 34). A MID em (0,0) fecha a colinearidade em 0,00 m.

| id | de | **para** | label | medido depois |
|---|---|---|---|---|
| E | (−12, −34) | **(−21,5; −27)** | SALOON → *BODEGA* | dist. spawn 7,0 → **16,9 m** · penetração 0 · linha de tiro 47,2 m |
| MID | (0, 0) | **(−7; 4)** | RUA PRINCIPAL → *POÇO DO LARGO* | dist. spawn **37,1 m** · penetração 0 · linha de tiro 45,4 m |
| B | (12, 34) | **(21,5; 27)** | ESTÁBULO → *CURRAL* | dist. spawn 7,0 → **16,9 m** · penetração **1,08 → 0,00 m** |

**CTF1 altura do triângulo: 0,00 → 7,97 m** (1,8× o teto de 4,5). Efeito colateral obrigatório: mover o trio de fardos de (±21, 27) para **(±21, 33)** e o barril de (±23,5; 33) para (±23,5; 37,5), senão a nova B nasce dentro do fardo (medi: penetração 1,13 m). Preço honesto: a MID sai do eixo, então a distância euclidiana spawn↔MID fica 45,3 m (E) contra 41,6 m (B) — 8 % de assimetria; é o preço de não ser colinear, e a fairness real é a de rota, que o CTF2 mede (`rotasSpawnBandeira`, 2 rotas separadas hoje) e **precisa ser reconferida depois de mover**.

### Resultado medido da seção 1

| medida | antes | depois | teto |
|---|---|---|---|
| MAP5 pior espaçamento | **99** (q3,1) | **6,4 m** | ≤7 |
| MAP5 pior razão de densidade | **0** | **0,65** | ≥0,35 |
| quadrantes fora do teto | 14 de 16 | **0** | 0 |
| faixa reta mais longa (olho 1,6 m) | **89,0 m** (9 faixas) | **32,0 m** | — |
| maior visada limpa | 98,4 m | **75,2 m** | acervo 74-92 |
| p95 das visadas limpas | 69,1 m | **48,0 m** | ≤56 (pior dos 3 bons) |
| pares com linha limpa (amostra de 4 000) | 2 174 | **711** | — |
| exposição de spawn (grade 1 m, 4 slots) | 81,8 % / 81,9 % | **7,2 % / 8,2 %** | ↓ |
| cobertura mais distante | 11,5 m | **11,2 m** | ≤12,5 |
| grafo | 388 nós, rota 25 passos | **339 nós, rota 33 passos, 335 alcançáveis** | ≥100 nós |

---

## 2. Verticalidade (ALT1 h90 ≥9 m · ≥1 cota andável nova)

**Por que h90 = 3,49 m e não 7:** h90 é percentil 90 do *topo de cada massa* (`mapa-novo-gate.mjs:382,389`), e o mapa tem 438 massas das quais **264 com topo < 2 m** — 87 são raios de roda de carroça (`:284`) e 48 são mourões de cerca (`:258`). Com n=438 o índice p90 é 393: **precisa de 45 massas com topo ≥9 m**. Contei: hoje existem **14** acima de 7 m e **zero** acima de 9.

**Atenção — armadilha medida:** limpar as massas-lixo é tentador e **quebra o ORT1**. As 87 massas de carroça são todas giradas; sem elas a fração girada cai de 31,5 % para **exatamente 15,0 %**, encostando no piso. **Não mexa nas carroças** (e `velho-oeste-check.mjs:32` exige ≥3). Some massa alta em vez de tirar massa baixa.

### 2.1 Falsa frente (o jeito historicamente correto de ter 9 m com casa de 1 pavimento)
Para cada uma das 8 fachadas de `:222-229`, com `x = side·(34 − d/2 − 1)` e `faceX = x − side·(d/2+0,03)` (d=8 → ±24,97; d=7 → ±25,97):

| peça | posição | dimensão | topo |
|---|---|---|---|
| falsa frente | (faceX, h, z) | 1,0 × (9,4−h) × 12,0 m | **9,4 m** |
| 2 pilastras | (faceX, h, z ∓5,6) | 0,5 × (9,8−h) × 0,5 m | **9,8 m** |
| cornija | (faceX, 9,4, z) | 1,4 × 0,5 × 13,0 m | **9,9 m** |
| mastro/chaminé | (x, h, z) | 0,6 × (10,4−h) × 0,6 m | **10,4 m** |

Para as 4 casas de rua (`:243-246`, faceX = ±12,22): platibanda 0,5 × 4,5 × 7,2 m em (faceX, 4,7, z) → topo **9,2 m**, + 2 pilastras 0,45 × 4,8 × 0,45 em z∓3,4 → topo **9,5 m**. Tudo `collide:false` (é massa, não cobertura).

**Medido: 602 massas, h90 3,49 → 9,20 m; ORT1 fica em 26,9 % / 25 ângulos** (pisos 15 %/20). *Swap sertão:* falsa frente → **platibanda**, que é o mesmo gesto construtivo do interior nordestino — a branch já tem `casaPlatibandaProxy` (550-v2 `:378-431`) com platibanda + cornija; basta subir a altura de 4,5 m para 9,2 m em 4 casas.

### 2.2 Interior jogável (o pedido do dono: varanda, balcão, escada, 2.º pavimento)
`building()` `:211` é um `addBox` maciço — para virar interior, **três** coisas mudam juntas, e a terceira é a que ninguém lembra:

| passo | o quê | referência a copiar |
|---|---|---|
| a | trocar o bloco maciço por **4 paredes de 0,3 m + laje**: SALOON (−29,−29), EMPÓRIO (29,11), HOTEL (−29,5;29) → vão interno 7,4 × 11,4 m, pé-direito **3,3 m** (≥1,95 m de `ALTURA_LIVRE`), porta de 1,5 m na face da rua, balcão 5,0 × 1,1 × 1,1 m encostado na parede dos fundos, 2 vãos de janela de 1,35 m no 2.º pavimento dando para a rua | — |
| b | **escada externa no beco**, na face x=faceX+side·1,8: 2 lances de 10 degraus, espelho **0,18 m**, piso **0,28 m**, 2e+p = **0,64 m**, largura **1,30 m**, inclinação **32,7°** — dentro da faixa NBR do MAP3 (0,16-0,19 / 0,25-0,32 / 0,62-0,66 / ≥1,20 / 25-40°). Patamar 1,3 × 1,3 m a 1,80 m | `map_lajes_authored.js:757-813` (`addStaircase` devolve `{flights,landings,bottom,top,topo}`) |
| c | **`groundHeightAt` deixa de ser `() => 0`**: passa a varrer as lajes e as superfícies de escada, com o parâmetro `yRef` (sem `yRef` devolve o topo — é o contrato que as réguas assumem, `map-check.mjs:218,291` chamam com 2 argumentos) | `map_lajes_authored.js:819-850` |
| d | guarda-corpo de 0,62-0,76 m em toda borda da laje com queda ≥ degrau, exceto na boca da escada | `map_lajes_authored.js:857-864` (MAP6 hoje = 0 bordas sem guarda; sem o (d) ele fica vermelho) |
| e | declarar `stairs`/`staircases`/`levels` no retorno `:435-448` | `map_lajes_authored.js:1254-1258` |

Custo: ~20 malhas por sobrado (6 de casca + 14 de escada) × 3 = **60 malhas**, contra 2 038 draw calls do `fy_mansao` — cabe. Risco real: sem o (c) **o 2.º pavimento é uma ilha** no flood-fill e no A* (a altura salta 3,6 m > `DEGRAU` 0,30 e o grafo não sobe); sem o (b) na faixa NBR, MAP3 mede escada falsa. Isso não é opcional: o ALT1 já fecha só com 2.1, então **o item 2.2 é entregue pela jogabilidade (3 cotas novas, 3 pontos de vantagem sobre o largo), não pela régua** — e é o único item desta receita que precisa de mais de um dia.

---

## 3. Visual e escala (SUP2 ≤6 % · SUP1 ≤40 % · ORT1 ≥15 %/20 · UV 128 px/m)

| # | intervenção | onde | número que move |
|---|---|---|---|
| 3.1 | **chão em 41 px/m**: `realTexture('dirt-real-v1.webp','oeste-sand-real', 12, 14)` com plano 150 × 180 m dá tile de 12,5 m. Trocar para `(37,5; 45)` → tile de 4 m | `:100` | 41 → **128 px/m** (banda TEXEL 64-512, alvo 128) |
| 3.2 | **dispersão de texel 773,9×** (teto 1,5): o mesmo `MAT.wood` (repeat 3×5) veste a fachada de 12 m (128 px/m) e o corrimão de 0,22 m (6 604 px/m). Conserto de uma linha só: em `addBox` `:116`, `boxGeo(w,h,d)` → `aoBoxGeo(w,h,d,{low:LOWQ})` e `material` → `aoMat(material)`, com `const aoMat = aoMatFactory()` no topo | `:115-127`, padrão em `map_quebrada.js:77,82-84` | dispersão → ~1,0 (o `escalaUVporMundo` reescala a UV por caixa, alvo `ALVO_PXM` 128) **e o mapa passa a ter AO de contato, que hoje é zero** |
| 3.3 | `signTexture` não atribui `anisotropy` → as 14 placas ficam em **1** (piso 4). Acrescentar `t.anisotropy = 8` como em `:82` e `:171` | `:141` | anisotropia mínima 1 → 8 (TEXEL4 só morde em superfície horizontal, então isto é dívida visível, não régua vermelha) |
| 3.4 | ORT1 tem 31,5 %/23 **mas 63 % das massas giradas são raios de roda**. As 4 estações (1.2) entram com ry ∓0,05/+0,06 e os marcos com 0,05/−0,06 | 1.2, 1.4 | 25 ângulos distintos e 26,9 % de massa girada **sem depender da carroça** |
| 3.5 | SUP1 11/47 = 23,4 % — os sem `map` são `MAT.windowVoid` (`:112`) e o `twigMat` das 3 plantas rolantes (`:361`). Reusar `MAT.dark`/`MAT.hay` no `twigMat` | `:361` | 23,4 % → **17,0 %** (teto 40) |
| 3.6 | SUP2 0,2 % e `fracSemMalha` 0,3 % já estão ótimos: **toda caixa nova tem que ser `addBox`/`aoBoxGeo` com 6 faces**, nada de `PlaneGeometry` solto (foi o que manteve esse número) | seções 1-2 | mantém SUP2 ≤6 % |
| 3.7 | **céu**: `scene.background = new THREE.Color(0xd88b55)` `:203` — o mapa não passa por `setMapSky`, então `scene.userData.skyUrl` é `undefined` e o `look-check` não consegue nem medi-lo | `:203-204` | ver 4.4 |

---

## 4. Brasilidade (o que faz reconhecer o lugar)

| # | o quê | x,z | como | efeito |
|---|---|---|---|---|
| 4.1 | **gado no curral** — 2 vacas | (22,5; −30) e (−22,5; 30) | `createFavelaAmbience(root,{… cows:[{pos:[22.5,0,-30],to:[20,0,-27],phase:.4}, …]})`; `cow` existe no mainline (`ambientlife.js:24,179`) | dá escala viva ao beco (hoje só 2 ratos e 3 pombos, `:423-433`) |
| 4.2 | **galinhas e cachorro** — 3 galinhas + 1 cachorro | galinhas (−19,5; 14), (19,5; −5), (−19,5; 40); cachorro na varanda (12,5; −20) | `chickens:[…]`, `dogs:[…]` — ambos no `ambientlife.js:24` | som já vem de graça: `bioma:'campo'` `:436` toca galo/passarinho/latido (`soundscape.js:23-27`) |
| 4.3 | **tatu** (bicho de caatinga, existe no mainline) — 2 | (−30; 21,5) e (30; −21,5) | `armadillos:[…]` | assina o bioma sem asset novo |
| 4.4 | **céu** | — | **caminho recomendado:** aterrar `look.js` da 550-v2 (`:41-51`, `sky:{kind:'procedural', model:'dry-afternoon'}`, horizonte 0xc7b59b, sol 0xffe0b5 em (−30,14,−18)) e chamar `applyLook(scene, T, 'velho_oeste')` no lugar de `:203-204`/`:386-389`. **Caminho mainline puro:** `setMapSky(scene, T, '/img/textures/sky_<novo>.webp', 0xc7b59b)` — exige um panorama 2:1 novo (não existe `sky_oeste`/`sky_sertao` em `public/img/textures/`), a medição do horizonte por `tools/eval/look-horizonte.py` e incluir o mapa em `look-check.mjs:48` (hoje a lista tem 3 mapas) | `scene.userData.skyUrl` de `undefined` → medível; névoa `:204` passa a casar com o horizonte (teto ΔE76 do `look-check`) |
| 4.5 | **placas** (é só string em `addSign`, `:219`/`:241`/`:263`) | — | SALOON→`BODEGA DO SEU ZÉ` (sub `CACHAÇA · FIADO · PROSA`), BANCO→`CAIXA D'ÁGUA`, ARMAZÉM→`ARMAZÉM SÃO JOSÉ`, HOTEL→`PENSÃO FLOR DO MATO`, XERIFE→`DELEGACIA`, BARBEIRO→`BARBEIRO DO NENÉM`, EMPÓRIO→`MERCADINHO`, ESTÁBULO→`CURRAL`, pórtico→`SERTÃO DA TRETA` | **atenção:** `velho-oeste-check.mjs:19,32` exige o objeto `predio-saloon`; trocar o `title` sem re-derivar a régua deixa a asserção medindo um nome que não existe mais — é o caso de régua que parou de morder, e a 550-v2 já o re-derivou |
| 4.6 | **props do catálogo** no lugar dos proxies (só quando `hasProp`, com fallback procedural obrigatório) | `agave` nos 8 lugares de cacto (`:276`) · `lampiao_fachada` em (faceX, 3,2, z±4) das 12 fachadas · `fachada_comercio` nas 2 casas de rua do norte · `stall` ×12 nas estações 1.2 · `chevette` em (18,8; −34) e `kombi` em (−18,8; 34) nos becos · `moto_cg` encostada na bodega (−19; −24) · `bananeira` no quintal da pensão (−22; 20) · `churrasqueira` + `banco_jardim` no largo (−4; 7) | tudo via `placeProp(id,{x,y,z,targetH|targetLen,ry})` + array `VELHO_OESTE_PROPS` exportado e consumido em `maps.js` (padrão do 550-v2 `:19-21`), lote por `PropBatch({bucket:20})` como `map_campomorro.js:65` | +14 props no MAP5 (folga acima do teto) sem clone solto |

---

## 5. Ordem de execução e custo

| passo | o quê | fecha | risco |
|---|---|---|---|
| **1** | Aterrar o retheme sertão da `worktrees/mapas-stack-550-v2` (mapa + 7 módulos + look + as 13 réguas `sertao-*` + a re-derivação do `velho-oeste-check.mjs`) | tema (veto do dono), céu, occluders 56→568, ORT1 31,5→78,1 %, MAP5 pior 99→9,8 m | **alto de revisão, baixo de código**: é diff pronto com procedência; precisa de quality gate completo porque troca 19 asserções. Se for recusado, os passos 2-5 valem igual no mainline — as coordenadas foram escolhidas para isso |
| **2** | Seção 1.6: mover as 3 bandeiras e os 2 props que a B atropela | **CTF1 0,00 → 7,97 m**, distância de spawn 7,0 → 16,9 m, penetração 1,08 → 0 | baixo (4 linhas). Reconferir `rotasSpawnBandeira` (CTF2): hoje 2 rotas separadas |
| **3** | Seção 1.1 + 1.5: 8 trios de fardo, 28 barris, 8 muros de fundo, 2 torres — quase tudo estendendo os arrays de `:349-355` | **MAP5 pior 99 → 6,4 m**, razão 0 → 0,65, 14/16 quadrantes fora → 0, canto morto 12,6 → 11,2 m | baixo. **Regra de ouro:** vão ≥4,3 m contendo x ∈ {−32,2+3,4k} / z ∈ {−44,2+3,4k}; conferir `nós ≥100` e `rota E→B ≥2 passos` depois |
| **4** | Seção 1.2 + 1.3 + 1.4: 4 estações (12 caixas), 4 obstáculos do largo, 2 marcos no eixo | faixa reta **89 → 32 m**, p95 69,1 → 48,0 m, exposição 81,8 % → 7,2 % | médio: grupo **não** pode se chamar `obstaculo-*` fora de |x|,|z| ≤ 12 (`velho-oeste-check.mjs:60`), e as caixas precisam de 0,7 m de sobreposição — fresta de 0,8 m entre barracas virou luneta de sniper na minha primeira medição |
| **5** | Seção 2.1 + 3.2: falsas frentes/platibandas (12 conjuntos) e `addBox` → `aoBoxGeo`+`aoMat` | **ALT1 h90 3,49 → 9,20 m**, dispersão de texel 773,9× → ~1,0, AO de contato de 0 → banda cheia | médio: `aoMat` precisa de `aoMatFactory()` por mapa e **não** pode ser aplicado ao `PlaneGeometry` do chão (`:205`) — material sem atributo `color` fica preto (`vao.js:189-196`) |
| **6** | Seção 2.2: 3 sobrados com interior, escada NBR, `groundHeightAt` multinível, guarda-corpo, `stairs`/`levels` | 3 cotas andáveis novas; MAP3/MAP6 passam a ser mediveis neste mapa | **o mais caro e o único que muda o contrato de world.** Sem o `groundHeightAt` com `yRef` o pavimento vira ilha no A* e no flood-fill; sem guarda-corpo o MAP6 sai de 0 borda para N |

Orçamento: +154 colisores (50 → 154 props) e ~150 malhas novas, com os repetidos (barril, fardo, caixa de barraca) entrando por `InstBatch({bucket:20})` + `PropBatch` — as instâncias continuam contando uma a uma no ORT1/ALT1 (`mapa-novo-gate.mjs:364-377`), então batelada **não** cega régua nenhuma. Referência de teto: `fy_mansao` 2 038 draw calls.

---

## 6. O que eu NÃO consegui decidir sem olhar figura

1. **Se a 550-v2 já está boa o suficiente de aparência.** Medi que ela resolve occluders/ORT1/MAP5-parcial, mas "arraial de Pernambuco com menos de 3 mil habitantes" é julgamento de imagem: preciso do preview de `g2ui-map-previews.mjs` (`velho_oeste: pos [0,30,-35], pitch −0,55`) lado a lado com a referência do dono antes de dizer "aterra".
2. **Altura da falsa frente: 9,4 m é o mínimo que fecha o ALT1, não necessariamente o que parece certo.** Uma falsa frente de 2,8 m sobre casa de 6,6 m pode ler como cenário de papelão numa figura frontal. Se ficar feio, o caminho alternativo é o 2.2 (sobrado real de 2 pavimentos, h 7,2 m + platibanda 2,0 m) — mesmo h90, cinco vezes o custo.
3. **Onde exatamente a MID (−7, 4) fica visualmente ancorada.** O número está certo (triângulo 7,97 m, penetração 0, 2,1 m de cobertura ao lado), mas se o poço/chafariz não puder ir ali por causa da igrejinha da branch em (0; −15,5), a alternativa medida é (−8, 0) → triângulo 6,45 m (ainda 1,4× o teto).
4. **Se as 4 estações de feira atravessando a rua leem como vila ou como labirinto.** A medida diz que a rota em S existe (33 passos, 335/339 nós), mas "a rua ainda parece uma rua?" só se responde em print de dentro do jogo, na altura do olho, nos 4 pontos (0;−30), (0;−22), (0; 22), (0; 30).
