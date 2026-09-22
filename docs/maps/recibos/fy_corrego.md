<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

# fy_corrego — recibo

## Aplicado
| item da receita | arquivo:linha | o que entrou |
|---|---|---|
| 1B itens 1–6 · grades de retenção de lixo | `map_corrego.js:885-914` | 6 massas alternadas 3,6×3,0×0,5 m, topo +1,25 m, vão livre de 2,4 m trocando de lado a cada ~12 m, em `addBoxI` com `ry` (NÃO `addBoxSB` — decisão de `:227-229`). UM colisor por grade; o gradil (barras 7 cm + 2 travessas nas DUAS faces), o entulho prensado, o pneu, a tábua e a sacola entram sem colisor para o MAP5 não contar a mesma peça seis vezes |
| 1B itens 7–9 · peças absorvidas | `map_corrego.js:918` | `ABSORVIDAS = {3,6,19}` (tambor −25,1 · pilha −15,2 · tambor +27,7) |
| 1B itens 10–14 · entulho que troca de lado | `map_corrego.js:919-921` | `LADO_FUNDO = {2:+1, 5:−1, 10:+1, 13:−1, 16:+1}` — é o que LIBERA o vão de 2,4 m de cada grade |
| 1B · waypoint dentro do vão | `map_corrego.js:1193-1194` | `linha()` de 5,2 m no vão de cada grade; sem isso o A* não acha a chicana |
| 1C item 17/18 + brasilidade 38 · varal sobre o córrego | `map_corrego.js:989-1021` | 5 varais (z −30, −14, +4, +24, +30), cabo a 2,35 m, mourão nas duas beiras, cortina de 9 peças encavaladas (0,72 m a passo 0,665) + 2 lençóis atravessados nos 3 varais do miolo. Bainha 1,15 no miolo e 0,90 nas pontas. Uma geometria por cor com altura por `sy` — 5 varais custam 6 lotes, não 30 |
| 1C item 19 + brasilidade 39 · tubulação de esgoto | `map_corrego.js:1023-1032` | cilindro Ø0,90 × 5,94 m a y 1,55–2,45 em z=−6 (pico medido do histograma de cruzamento), + 2 selas de concreto. Termina em 2,97 m: nada de geometria pairando sobre célula andável |
| 1D itens 20–21 + brasilidade 41/43 · cover da beira oeste | `map_corrego.js:1080-1108` | 9 peças em `|x| = 6,75`: 2 carrinhos de catador, 2 motos, 2 botijões, 2 caixas de som, 1 guarda-sol |
| brasilidade 37 · lixo grande no leito | `map_corrego.js:1093-1094` | dumpster (−2,4; −12,5) e pilha de pneus (−2,4; +22,3) dentro do canal |
| 1D itens 22–23 + brasilidade 40/42 · mercadinho e Kombi | `map_corrego.js:1095-1101` | `fachada_comercio` (−22,0; −16) + `gondola_mercado` (−21,8; −14,2) encostados na fileira C, `arara_roupas` (−21,8; +28), `kombi` (−17,8; +24), `moto_cg` (−13,65; −18), `gondola_mercado` (−13,65; +33) |
| props novos no preload | `map_corrego.js:50-53` | `shopping_cart`, `gondola_mercado`, `fachada_comercio` — +1,04 MiB medidos nos 3 `.glb` |

## Medido (sonda própria, antes → depois)
Sonda: `/tmp/corrego_probe.mjs` sobre `tools/eval/harness.mjs` (build real, `_losClear`/`_collide` do jogo, mesma grade de 0,25 m e mesmos limiares do `map-check.mjs`). Nenhuma escrita em arquivo rastreado; `map-check.mjs` não foi rodado. O ANTES é o `git show HEAD:public/js/map_corrego.js` medido pela MESMA sonda (troquei o arquivo, medi, restaurei e conferi md5). A sonda reproduziu o baseline oficial: exposição E 29,2% / B 27,3% e maior visada 76,4 / 77,0 m batem com `map_check_all.json`.

| métrica | antes | depois | teto/piso |
|---|---|---|---|
| visada no eixo do canal (lanes x −2,6..2,6, z −38→38, olho 1,62 do piso local) | **76,0 m** | **27,0 m** | alvo `D_FORA` 25 m |
| tubo do LEITO (só z com piso em −1,75; olho em −0,13) | **62,0 m** | **24,0 m** | ≤ 25 ✔ |
| MAP2 exposição E | 29,2% | **19,1%** | — |
| MAP2 exposição B | 27,3% | **16,1%** | — |
| MAP2 maior visada a spawn (E / B) | 76,4 / 77,0 m | **64,7 / 73,7 m** | — |
| visadas ≥25 m que ATRAVESSAM o canal | 899 | **478** | (mesmo lado 256 → 226) |
| MAP1 corpo dentro de sólido | 0 (pior pen. 0,000; 2.769 amostras) | **0 (0,000)** | 0 |
| MAP5 pior espaçamento | 6,61 m | **4,58 m** | ≤ 7,0 |
| MAP5 pior razão de prop | 0,38 | **0,79** | ≥ 0,35 |
| MAP5 pior razão de waypoint | 0,81 | 0,80 | ≥ 0,35 |
| rota do fundo (células andáveis do leito) | 3.463 · z[−20,25; +33,25] | **3.889 · z[−33,25; +33,25]** | não podia encolher |
| células andáveis do mapa | 44.907 | 44.487 (−0,9%) | — |
| grafo de waypoints | 584 nós, **3 componentes** (maior 569) | 598 nós, **1 componente** | — |
| nós na lane da beira / do fundo / do beco 1 | 58 / 117 / 64 | 58 / 141 / 58 | — |
| occluders · colliders | 170 · 229 | 205 · 249 | — |
| **triângulos estáticos (build de node)** | **32.270** | **36.566 (+4.296)** | **+0,052% do teto de 8,3 M** |
| malhas (≈ draw calls no build de node) | 431 | 466 (+35) | — |

Orçamento, declarado: os +4.296 triângulos são 1,4× o que a receita orçou (≈3,0 k) porque a cortina de roupa virou CHEIA e o gradil ganhou barra nas duas faces — as duas coisas foram medidas como necessárias (ver abaixo). Dos +35 lotes, 18 são lote de instância novo (cada um com 6 a 45 cópias) e 17 são o fallback procedural dos props GLB, que em node não carregam; no navegador eles entram no `PropBatch` e não viram draw call por peça. Os 7,59 M triângulos de `grama_corrego_01/02` (7 de cada 8 do mapa) continuam intocados — decimação é asset e fica para rodada própria.

Réguas (nenhuma escreve artefato rastreado): `eval:corrego-contract` **OK** · `eval:corrego-water` **OK** · `eval:escala-favela` **OK (ESC5 39/39)** · `eval:pickuparma` ok (66 pickups) · `eval:escala` ok · `eval:spawn` ok · `node --check` **verde**. Sem commit.

Figura (mapview 3:2, `/tmp/corrego_{antes,depois}_*.png`, mesma pose): `tubo-canal` mostra o canal indo até o horizonte no ANTES e cortado pela grade no DEPOIS; `grade-ponte` mostra leito vazio no ANTES e o gradil barrado no DEPOIS.

## Não aplicado (e por quê)
- **Seção 2 inteira (itens 24–30: passarela alta, 2 escadas NBR, `stairs`/`levels`, `groundHeightAt` multinível, waypoints da cota nova)** — cota andável nova está fora desta rodada por instrução.
- **Itens 15–16 (passarelas baixas de pedestre, z ±11)** — o deck da receita é `collide:true` a 1,05 m atravessando `x −6,5→6,5`, ou seja, colisor na altura do peito EM CIMA da lane da beira (`|x|`=5,9) e sem cota andável que o sustente: ou vira parede invisível no passeio, ou vira passarela que ninguém pisa. Fora do mandato nas duas leituras. O trabalho que elas fariam (massa acima de 1,62 m sobre o vão) foi feito pelos varais e pela tubulação, e o resultado está medido acima.
- **Item 44 (bicicleta)** — não existe no acervo, como a própria receita diz.
- **Item 6 da ordem (decimar a grama)** — mexe em asset e exige `tools/optimize-props-v21.mjs`; só proposta, como instruído.
- **`caixa_dagua_azul` na beira (item 43)** — o `.glb` existe, mas a peça tem 1,1 m de largura e em `|x| = 6,75` fecharia o passeio; entrou `caixa_som` no lugar. Medido: no passeio da beira (livre de ~2 m entre a queda do canal e a base da fileira A) qualquer prop com mais de 0,8 m de largura derruba os nós da lane de 5,9 e deixa menos que corpo+folga — é a mesma armadilha do carro na pista de 3,1 m que o próprio arquivo declara em `:1043-1045`. Por isso a coluna da beira é só peça estreita, e as peças gordas da receita (dumpster, pilha de pneus) foram para DENTRO do leito, onde há 6 m.

## Divergências medidas em relação à receita (números dela que não se confirmaram)
1. **A visada de 76 m não é o tubo do leito.** A lane mais longa do ANTES sai da boca assoreada com o olho a **1,67 m** e viaja RETA por cima de tudo (`x=−2,0`, z −38→+38): massa de topo +1,25 m não a toca. Quem corta essa linha é o varal de ponta (item 18), não a grade. O tubo do leito propriamente dito (olho em −0,13) media **62 m**. Por isso o recibo traz as duas medidas.
2. **Exposição: 30,4→17,0% não se reproduz com os dispositivos 15–19.** Histograma medido das 899 visadas que cruzam o canal: elas se espalham por 38 faixas de 2 m (pico 55, mediana ~24), sem a concentração que a receita supõe — 1 m de faixa fechada ≈ 1,3% das travessias. O ganho real veio de fechar a cortina de roupa nos 5,3 m inteiros do vão (não de passarela), e o medido é **29,2→19,1% (E)** e **27,3→16,1% (B)**.
3. **Dois furos de 6 cm valiam 12 m de visada.** Com a roupa a 0,60 m de largura e passo de 0,665 sobrava um vão de 6 cm entre peças: a lane passava por ele (39 m). Largura 0,72 (encavalada) e bainha que varia PARA BAIXO (peça mais longa, nunca mais curta) fecharam — 39 → 27 m. Está anotado no código porque é o tipo de coisa que volta.
4. **Os z dos varais e da tubulação são medidos, não os da receita**: −14/+4/+24 (picos 47/55/40 do histograma) e tubulação em −6 (pico 46) em vez de −20/+1/+24 e −8.
5. **`arara_roupas` em (−21,2; 34) fica a 1,0 m do ponto de spawn B** — dentro do disco de 5 m do MAP2B e contra a regra do próprio arquivo (≥5,5 m). Foi para (−21,8; +28), a 7,0 m.
6. **O que sobra dos 27 m é diagonal de tablado**: o raio que resta sai do tablado de uma ponte (olho 1,77 m) e desce até o leito, passando pela fresta de 10 cm entre o topo da grade (1,25) e a bainha da roupa (1,15). Fechá-la pede subir a grade acima de 1,25 m — que é exatamente a dúvida nº 1 da receita, e é de figura, não de número.

## Pedido ao Main (arquivo compartilhado)
`tools/eval/escala-favela-check.mjs` — **JÁ ATENDIDO** nesta rodada. A ESC5 reprova por id ausente em `FAIXA_PROP`, não por escala errada; os 6 ids novos (`shopping_cart`, `caixa_som`, `guarda_sol`, `fachada_comercio`, `gondola_mercado`, `arara_roupas`) entraram com faixa e procedência. Medido: base HEAD 22/22 verde → mapa novo 30/39 vermelho → com o patch **39/39 verde**. Folga das minhas alturas até a borda mais próxima: 0,10 (shopping_cart) · 0,35 (caixa_som) · 0,30 (guarda_sol) · 0,40 (fachada_comercio) · 0,30 (gondola_mercado) · 0,15 (arara_roupas) — nenhuma colada. Nenhum outro arquivo compartilhado foi tocado; `tools/eval/` não foi editado por mim.

## O que exige figura
1. **Altura da grade (topo +1,25 m).** Na figura `grade-ponte` ela lê como gradil barrado (a barra nas duas faces resolveu o "muro liso" da primeira tentativa), mas se o dono quiser ≤25 m no raio de tablado a massa tem de subir — e aí a leitura de gradil é o que se perde. É a dúvida nº 1 da receita e continua de pé.
2. **Cortina de roupa cheia.** De perto (`grade-passeio`) lê como roupa pendurada com barra desencontrada; vista de dentro do leito a 8 m (`varal-ponta`), com o alto cortado pela parede do canal, ainda pode ler como painel listrado. São 5 varais cheios em 80 m de canal — quem olha o quadro decide se é favela ou se é obstáculo pintado.
3. **Roupa sobre água suja** — residual nº 6 da própria receita, intocado.
4. **`fachada_comercio` com `ry = π/2` na margem OESTE.** Segui a convenção medida de `map_obras`/`map_posto` (oeste → `π/2`) e na figura `mercadinho` ele aparece de frente para a rua, com toldo e porta; vale um olho de quem conhece o asset.
5. **Densidade de 6 grades em 76 m** (uma a cada ~12 m) — dúvida nº 2 da receita, de foto.
