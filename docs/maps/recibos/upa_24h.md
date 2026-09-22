<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

# upa_24h — recibo

## Aplicado (só `public/js/map_upa.js`; 311 inserções, 79 remoções)

| item da receita | arquivo:linha | o que entrou |
|---|---|---|
| 3.11 içar travesseiro | `map_upa.js:159` | `MAT.travesseiro` fora do helper `maca()`; 17 materiais distintos sem `map` viraram 1 com `map` |
| 3.7 RepeatWrapping no `tex()` | `map_upa.js:45` | `wrapS/wrapT=RepeatWrapping` + `repeat` + `NearestFilter`/mipmap (decisão de arte de `textures.js:17`) — pré-requisito de tudo o mais |
| 3.6 aoBoxGeo/aoMat | `map_upa.js:173` | `addBox` passou a usar `aoBoxGeo(w,h,d,{base})` + `aoMat(mat)`, padrão de `map_quebrada.js:79-94`; `base` explícito só no forro |
| 3.1 forro | `map_upa.js:97` + `:240` | canvas 256×256 = tile de 2,0 m (placa 0,50 m, junta escura de 1,5 cm, microperfuração, mancha de infiltração) na laje de `addBox(60,0.3,72)` |
| 3.2 luminária | `map_upa.js:111` + `:245-248` | canvas 256×256 (moldura + 2 tubos + aleta) em `MeshBasicMaterial`; os 56 painéis entraram num `InstBatch` (1 draw call) |
| 3.8 piso tilável | `map_upa.js:63` + `:212-220` | vinílico de 2,0 m; o plano único de 60×72 virou **7 planos sem sobreposição** (4 setores + 2 miolos + corredor), cada um com clone da textura e `repeat` do seu tamanho |
| 3.8 faixas de rota | `map_upa.js:219-241` | as 6 rotas coloridas saíram do canvas do piso e viraram 12 tiras de 0,12 m a `y=0,012`, textura própria com `repeat` por comprimento |
| 3.9 parede | `map_upa.js:79` | canvas 256×512 = perfil inteiro de 4,2 m (rodapé, barra de choque de PVC a 0,90 m, faixa lilás, branco) em tile de 2,0 m |
| 3.3/3.4/3.5 | `map_upa.js:150-165` | `paredeAlta`, `armario` (melamina), `maca`+`travesseiro` (pano), `aco` (escovado), `mesa`, `cadeira`, `verde`, `vermelho`, `MTELA`, `MRODA`, negatoscópio e desfibrilador ganharam `map`; a paleta (`color`) é a de antes |
| 1.1–1.4 estantes do eixo de serviço | `map_upa.js:356-357` | 4 × `addBox(3.0,2.0,0.6,MAT.armario, ±22,5, 0, ±7,0)` com ry 0,10/−0,13/−0,16/0,12; os 2 monitores que ocupavam (∓22,5;∓7) foram para (−21,2;−8,5) e (−21,2;5,5) |
| 1.5 posto de enfermagem | `map_upa.js:385-386` | ilha `3,4×2,3×4,4` em (0;0) ry 0,26 + balcão de fórmica de 3,9×4,9 a 1,10 m (`collide:false`) |
| 1.6–1.19 mobília encostada | `map_upa.js:342-348` | 6 fileiras de cadeiras contra a fachada + 1 contra a parede oeste, 2 macas de corredor, 3 armários, bebedouro+galão, gôndola extra |
| 1.20–1.22 bandeiras | `map_upa.js:526-529` | E (−14;−20) · MID (0;−11) · B (14;20) — ver 'Não aplicado' para a divergência medida |
| 3.13–3.18 giros (ORT1) | `map_upa.js:342-396` | 19 macas, 6 biombos, 8 monitores, 2 respiradores, crash cart, 2 balanças, 4 cadeiras de rodas, 13 plantas (vaso+folhagem), 3 mesas+cadeiras, 6 armários, 6 bancos, 44 cadeiras de espera e as 19 peças novas |
| 4.1 senha eletrônica | `map_upa.js:337` | 'SENHA/999' → 'G-042 / GUICHÊ 3' no `signTex` que já existia |
| 4.2 fila de balizador | `map_upa.js:405-419` | 6 postes + 4 fitas retráteis em `InstBatch` |
| 4.3/4.4 cartazes | `map_upa.js:399-400` | VACINE-SE · CAMPANHA DE INVERNO e ATENDIMENTO · É SEU DIREITO (sem marca, sem sigla protegida) |
| 4.5 ventilador de parede | `map_upa.js:421-425` | 2 unidades (grade + haste) em lote |
| 4.6 2ª TV | `map_upa.js:401` | `painel_tvs` em (28;−24) |
| 4.7 quadro de cortiça | `map_upa.js:402` | plano com `T.corkboard` (textura que já existia) |
| 4.8 Kombi-ambulância | `map_upa.js:439-440` + `:11` | `prop('kombi', 0, 32.4, …)`, `'kombi'` acrescentado a `UPA_PROPS`; letreiro 'AMBULÂNCIA 199' |
| 4.9 maca ocupada | `map_upa.js:346` | lençol creme sobre a maca de (4,3;−25,5) — zero sangue, zero pessoa |
| 4.10 cadeira monobloco | `map_upa.js:429-437` | 8 unidades, 8 ângulos, 1 draw call (`mergeParts`), colisor real |
| 4.11 mureta de vidro | `map_upa.js:333` | 2 painéis de acrílico sobre o balcão com vão de atendimento no meio |
| orçamento (56→12 PointLight) | `map_upa.js:249` | 12 luzes em x∈{−16,0,16} × z∈{−30,−14,2,18} |
| contrato/occluder (item 1 do contexto) | `map_upa.js:188`, `:443-445` | `prop()` deixou de empilhar **Group** em `occluders` e passou a empilhar MALHA (`o.traverse`); os 9 `InstancedMesh` do lote entram em `occluders` (BUG-54) |
| `cadeiras()` eixo × giro | `map_upa.js:289-297` | `eixoZ` separado do `ry`: antes um `ry` de 3° girava a FILA 90° e punha 5 cadeiras dentro da parede sul |
| roda de cadeira de rodas | `map_upa.js:299`, `:308` | `cyl()` aceita `ry`; a roda deixou de ganhar `rz = π/2 + ry` (que a inclinava 19° com ry≠0) |

## Medido (sonda própria em `/tmp/fixupa_probe.mjs` sobre `tools/eval/harness.mjs`, antes → depois)

Instrumento conferido: no estado ANTES a sonda reproduz **exatamente** o baseline compartilhado `/tmp/map_check_all.json` (MAP5 8,64 / razão 0,42 / CTF2 2 / triângulo 4,33 / distSpawn 3,61 / visada 64,3 / fracSemMalha 0,0041 / occMedidos 122). Não rodei `map-check.mjs`.

| métrica | antes | depois | teto/piso |
|---|---|---|---|
| MAP1 corpo dentro de sólido | 0 | **0** | 0 (gate) |
| MAP2 exposição média E / B | 15,57% / 2,71% | **14,31% / 1,38%** | — |
| maior visada do spawn E / B | 64,3 / 64,3 m | **53,9 / 49,0 m** | sem teto |
| MAP5 pior espaçamento | 8,64 m (q1,0) | **5,72 m** | ≤7 |
| MAP5 pior razão prop / wp | 0,42× / 0,73× | **0,68× / 0,70×** | ≥0,35 |
| MAP5 quadrantes fora | 2 | **0** | — |
| MAP5 pior espaçamento SEM os 6 colisores de balizador | — | **5,72 m, 0 fora** | prova que o quadrante não foi comprado com poste de 9 cm |
| CTF2 pior dos 6 pares | 2 | **2** (E→E 4 · E→MID 2 · E→B 2 · B→E 2 · B→MID 2 · B→B 4) | ≥2 (**gate**) |
| CTF1 altura do triângulo | 4,33 m | **6,31 m** | >4,5 (**gate**) |
| CTF1 distSpawn mínima | 3,61 m | **11,05 m** | ≥9 |
| CTF1 penetração nas 3 bandeiras | 0 | **0** | 0 |
| CTF1 maior linha de tiro E/MID/B | 45,9 / 41,0 / 41,6 m | **43,0 / 25,0 / 35,5 m** | — |
| cover mais distante | 6,8 m | **5,4 m** | ≤12,5 |
| SUP1 materiais sem `map` | 45,83% (44 de 96) | **14,41% (17 de 118)** | ≤40% |
| SUP2 área sem textura | 52,24% (10.058 m²) | **0,41% (79 m²)** | ≤6% |
| TEXEL1 mediana estrutural | 15,2 px/m | **129,7 px/m** | 64–512 |
| TEXEL2 área abaixo de 64 px/m | 99,02% | **0,00%** | ≤10% |
| TEXEL3 p95/mediana | (não medi p95 no antes) | **1,10×** | ≤1,5 |
| TEXEL3b maior/mediana | 14,03× | **3,95×** | ≤4 |
| ORT1 massa girada / ângulos | 0,0% / 1 ângulo (220 massas) | **48,1% / 42 ângulos (142 de 295)** | ≥15% / ≥20 |
| ALT1 h90 | 4,2 m | **4,2 m** | ≥9 — não se aplica (prédio de 1 pavimento) |
| MAP4 occluders medidos / vazados | 122 / 0 (frac 0,41%) | **344 (210 instâncias) / 0 (frac 0,36%)** | ≤10% por occluder |
| MAP7 occluder sem geometria (Group) | 0 em node | **0** | 0 |
| malhas / draw calls | 472 | **417 (−55)** | — |
| PointLight | 56 | **12** | — |
| colisores / occluders / waypoints | 149 / 122 / 404 | **184 / 143 / 389** | — |
| pickup fora de alcance | 0 | **0** (nenhuma arma saiu do chão) | 0 |

Outros: `node --check public/js/map_upa.js` verde depois de cada bloco e no fim. `node tools/eval/map-contrato-check.mjs` → `ok upa_24h 389 nós · 1914 arestas · rota ok · conexo` (a única falha da bateria é `obras_prefeitura`, que não é meu). `node tools/eval/map-source-check.mjs` → exit 0. Nada commitado.

## Não aplicado (e por quê)

1. **Passo 7 inteiro (2.1–2.6: bump de laje, mezanino, escada, guarda-corpo, rampa de maca, doca rebaixada)** — fora desta rodada por instrução: é cota andável / `stairs` / `levels` / `groundHeightAt` multinível.
2. **Bandeiras em (∓16;∓20) como a tabela 1.20/1.21 manda** — MEDIDO na geometria nova: o par **E→B cai para 1 rota separada** e o CTF2 reprova. Varri 18 arranjos de bandeira na geometria já consertada; `E(−14;−20) · MID(0;−11) · B(14;20)` dá 2 rotas em todos os 6 pares **e** entrega mais que a receita prometia em CTF1 (triângulo 6,31 m contra 5,62 m previstos; distSpawn 11,05 m igual). Também reprovaram, medidos: (∓16;∓20), (∓18;∓20), (∓20;∓20), (∓22;∓24), (∓24;∓24) — todos com E→B = 1.
3. **Chicane de 4 paredes no corredor** — a receita já a mediu e reprovou; não fiz.
4. **1.9 armário de prontuários em (−13,5;−19,5)** → **(−13,2;−18,3)**: a 8 cm da bandeira E nova. Continua no quadrante q1,0 (centro em z=−18,3 < −17,5), que é o que o MAP5 cobra.
5. **1.16/1.18 armários em z=−21** → **z=−19,2**: em z=−21 o AABB entrava no colisor do `painel_tvs` de (∓28;−22) (z∈[−23;−21]).
6. **1.19 gôndola em (28,4;−33)** → **(28,4;−30,5)**: em z=−33 ela engolia a `planta(28,−33)` que já existia. Segue em q3,0.
7. **4.2 balizador com `collide:false`, como a receita pede** — pus colisor REAL (0,12 × 0,12 × 1,0 m). Motivo medido: a sonda do MAP1 acusa qualquer malha visível acima de 0,30 m sobre célula andável, e um poste de 1,0 m sem colisor é corpo-dentro-de-sólido esperando a amostra cair em cima dele (hoje ela passa a 0,70 m de distância — é sorte de grade, não invariante). O risco que a receita queria evitar está medido e não aconteceu: com os 6 postes o CTF2 continua 2 em todos os pares, e o MAP5 dá **o mesmo 5,72 m com e sem** eles.
8. **`ALT1:upa_24h` continua em dívida** — 4,2 m é o pé-direito; não construí torre falsa. A linha de dívida é arquivo compartilhado (ver Pedido ao Main).
9. **Céu / `setMapSky` / `applyLook` / one-shot de bioma** — a receita declara que não se aplicam (mapa sem exterior, `BIOME_SHOTS` sem `indoor` de propósito). Mantidos `AMB_LOOPS.hum` e `bioma:'indoor'`.

## Pedido ao Main (arquivo compartilhado)

1. `tools/eval/mapa-novo-gate.mjs`, dentro de `export const DIVIDA` (bloco ALT1, perto da linha 189): acrescentar
   `'ALT1:upa_24h': 'h90 4,2 m (prédio fechado de um pavimento: 4,2 m é o pé-direito)',`
   É o único vermelho que sobra do upa nesse portão. **Não** acrescente SUP1/SUP2/ORT1 para o upa: os três estão verdes agora (14,41% ≤ 40% · 0,41% ≤ 6% · 48,1%/42 ≥ 15%/20) e entrada de dívida verde é régua que para de morder.
2. Aviso de instrumento para quem for capturar: o servidor de `:8123` (`node tools/eval/serve.mjs 8123`, pid 21088) roda com **cwd em `worktrees/vm-unificado`** — ele serve o `public/` daquele checkout, não o nosso. Quem fotografar esta rodada precisa subir `node tools/eval/serve.mjs <porta>` dentro de `client/`, senão fotografa o mapa de ontem. Já avisei no hub.

## O que exige figura

Nenhum número desta rodada depende de pixel — os quatro pontos abaixo são decisão de arte, e por ordem do Main eu não capturei (a aba `upa2` foi fechada e o lock `/tmp/csbr-browser.lock` liberado).

1. **Forro a 128 px/m contra o look pixel** (receita §6.2). A laje era `MAT.teto` cor chapada e valia 86,7% da área sem textura do mapa; agora é tile de 2,0 m com junta escura de 1,5 cm, microperfuração e mancha de infiltração. Subi o contraste da junta de propósito (de ~3% para ~35% de diferença contra a placa) porque uma junta discreta devolvia 'chapa cinza texturizada' — mas se fica 'render de 2010' é chamada de direção de arte com print.
2. **Piso em 7 planos tingidos + 6 tiras de rota** (receita §6.1). As cores de setor (tan/cinza/farmácia/creme) e os 6 traçados estão preservados metro a metro; o que precisa de print é se a leitura de orientação continua igual com a cor vindo do material e não do canvas.
3. **56 → 12 PointLight** (receita §6.3). A conta está medida (−44 luzes dinâmicas, −55 draw calls); o resultado visual num prédio sem janela, não. Quem acende o forro agora é o painel `MeshBasicMaterial`, que ficou.
4. **Posto de enfermagem** — caixa de 3,4 × 4,4 × 2,3 m no miolo do corredor. A passagem de 1,14 m de cada lado está medida (andável, CTF2 2, MAP1 0), mas 'entope o corredor' é julgamento de olho.

Aviso honesto: tirei 4 prints antes do aviso do Main e **os descartei** — o servidor que eu usei (`:8123`) servia o `map_upa.js` de outro worktree (302 linhas, sem `InstBatch`), então aqueles pixels eram do mapa antigo. Não há verificação visual do patch neste recibo.
