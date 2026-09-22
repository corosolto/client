<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

# parque_treta — recibo

## Aplicado

| item da receita | arquivo:linha | o que entrou |
|---|---|---|
| §5.1 · item 1 (floreiras) | `map_parque.js:341,345` | `addCylinder(1.25, **0.95**, …)` sem `collide:false` — mureta de concreto ⌀2,5 m; as 5 flores subiram de y 0,62 para 1,12 para não ficarem enterradas |
| §5.1 · item 2 (jatos do espelho d'água) | `map_parque.js:415` | 4 jatos por lado passam a colidir (r 0,32 · h 0,70/0,88/1,06/1,24) |
| §5.1 · item 3 (latentes) | `map_parque.js:337` e `:390` | 8 postes de luz (⌀0,22 × 4,2) e 6 colunas da montanha-russa (⌀0,28) passam a colidir |
| §5.1 · item 4 (**armadilha do `addBox`**) | `map_parque.js:118-131` (`colRot`) + `:133-147` (`addBox`) | colisor girado no padrão de `map_brasilia.js`/`map_corrego.js:180`: AABB envolvente **mais** `{ry,cx,cz,hx,hz,cos,sin}`, que é o que `game.js:4916 _collideRot` consome. Sem isto as 86 massas giradas criariam MAP1 novo |
| §5.1 · item 4 (lado do A*) | `map_parque.js:518-525` | `blocked()` ganhou `dentroDaCaixaGirada` — sem isto o bot planeja pela AABB e contorna ar (`map_corrego.js:192`) |
| §5.1 · item 56 (`MAT.cloud`) | `map_parque.js:88` | `map: surfaceTexture('cloud','#fffdf5','#e8eef7',2)` — eram as 20 malhas de nuvem que respondiam por 99,7% da área sem textura |
| §5.2 · itens 1-2 (muro do pórtico) | `map_parque.js:285-286` | 2 × `8,0 × **4,8** × 1,6` em (±8, ∓35) + faixa pintada de 0,5 m na cor da base; abertura única x ∈ [−4,4]. 4,8 m, não 4,2 |
| §5.2 · itens 3-4 (laterais do bolsão) | `map_parque.js:287` | 2 × `1,6 × 3,2 × 5,4` em (±12,8, ∓38,5) — bolsão 24 × 5,8 m, diagonal 24,7 m < 25 m |
| §5.2 · itens 5-6 (bilheteria/chicane) | `map_parque.js:288` | 2 × `7,0 × 3,6 × 3,2` em (±3,5, **∓31,0**) — painel de 14 m a 1,6 m da abertura de 8 m |
| §5.2 · item 7 (spawns) | `map_parque.js:618-619` | `[-9,-3,3,9]` → `[-6,-2,2,6]`, z ∓38,5 |
| §5.6 · item 24 (simetria de 180°) | `map_parque.js:414-415` | espelho d'água norte de (−21,+31) para (**+21**,+31) e os 4 jatos espelhados por rotação, não por Z |
| §5.5 · itens 8-41 (cantos e flancos) | `map_parque.js:420-500` (`MASSAS`, 31 linhas × 2 lados) | praça de alimentação, pátio da russa, fila da roda-gigante, tiro ao alvo, casa de espelhos e bancos — 62 massas giradas com ângulo irregular, todas por `(x,z) → (−x,−z)`, `ry += π` |
| §5.6 · item 64 (`PARQUE_PROPS`) | `map_parque.js:17-20` | `export const PARQUE_PROPS` com 13 ids conferidos contra `public/models/props/` |
| §5.6 · itens 65-69, 72-74 (brasilidade) | `map_parque.js:420-500` | `stall`/`drinkstand` (pastel, algodão-doce, caldo de cana), `mesa_guardasol` ×3, `vw_9150` + trio elétrico, `quiosque` ×3, `caixa_som_baile`, `banco_jardim` ×3, `palmeira_imperial` ×4 (tronco ⌀0,56 × 9,5 com colisor), 8 `guarda_sol`, 8 `poste_jardim` vestindo os postes que agora colidem, 6 `pipa_papel` a y 6-11 |
| §5.6 · item 66 (prêmio de pelúcia) | `map_parque.js:474-482` | 7 esferas r 0,22 por prateleira, cor por instância, **1 draw call** (`InstBatch`) |
| §5.6 · item 67 (cartaz à mão) | `map_parque.js:210-247` + `:293` | `signTexture` reescrita: letra de pincel torta (desvio e giro por letra do LCG), veio de madeira, escorrido de tinta na cor da letra, e parâmetro `aspect` — as 3 chamadas (pórtico 10/3,1 · quiosque 4,4 · cartaz 12/2,6) deixam de esticar. Arial Black saiu do mapa inteiro |
| §5.6 · item 68 (guichê e fila) | `map_parque.js:289-290` | vão de 0,9 × 1,2 com `T.metal` na face voltada ao spawn + toldo de 7,6 m com `T.awning` |
| §5.6 · itens 70-71 (som) | `map_parque.js:605-614` | `grilos` (som de noite) saiu; entraram funk no trio (±23,2 / ∓21,6, r 30) e motor de gerador (±16,2 / ∓25,4, r 16), espelhados; `passaros` e `bioma:'campo'` ficam |
| §5.6 · item 58 (`applyAniso`) | `map_parque.js:15,69,96,245` | **`applyAniso` não existe nesta base** (grep em todo o repo: só aparece em `docs/`). Usei o padrão real de `map_brasilia.js:158` — `const ANISO = LOWQ ? 4 : 8` — nas 8 texturas de superfície, nas placas e nos clones do acervo. Anisotropia 4 → 8 |
| §5.6 · item 60 (céu) | `map_parque.js:263-266` | `setMapSky(scene, T, '/img/textures/sky_rj.webp', 0x75cef2)`; a névoa fica em 76-155 m mas troca a cor para **#b9daee**, que é o horizonte medido desse webp (`tools/eval/look-horizonte.json`) — a régua `eval:look` cobra fog == horizonte |

## Medido (sonda própria, antes → depois)

Sonda em `/tmp/parque_probe.mjs`, réplica das cláusulas de `tools/eval/map-check.mjs:282-624`; o "antes" reproduz `/tmp/map_check_all.json` dígito a dígito (MAP1 20, pior 1,06, exp 51,9/52,2, visada 86,2, folga 2,75, área 58,7, esp 17,35, razão 0,33). ORT1/ALT1/SUP1 por `/tmp/parque_ort.mjs`, réplica de `mapa-novo-gate.mjs:230-395`, rodada contra o arquivo de `HEAD` e contra o atual. **Não rodei `map-check.mjs`.**

| métrica | antes | depois | teto/piso |
|---|---|---|---|
| MAP1 corpo dentro de sólido | **20** | **0** | 0 |
| MAP1 pior penetração | 1,06 m | 0 m | — |
| MAP2 exposição E / B | 51,90% / 52,22% | **0,07% / 0,11%** | sem teto numérico p/ este mapa (evidência) |
| MAP2 maior visada E / B | 86,2 m / 84,1 m | **38,4 m / 38,2 m** | — |
| MAP2 Δ chão entre slots | 0 | 0 | ≤ 0,30 m |
| MAP2B pior folga até a parede | 2,75 m | 2,75 m | ≥ 1,20 m |
| MAP2B pior área contígua | 58,7 m² | 47,9 m² | ≥ 40 m² |
| MAP5 pior espaçamento | **17,35 m** | **6,29 m** | ≤ 7,0 m |
| MAP5 quadrantes reprovando | **16 / 16** | **0 / 16** | 0 |
| MAP5 pior razão de prop | **0,33×** | **0,56×** | ≥ 0,35× |
| MAP5 pior razão de waypoint | 0,69× | 0,66× | ≥ 0,35× |
| linha de tiro E / MID / B | 84,3 / 58,0 / 87,1 m | 55,3 / 51,5 / 56,4 m | — |
| MC3 nós ilhados (`eval:mapcontrato`) | 0 | **0** | 0 |
| ORT1 massa girada | 10,39% (24/231) | **25,37%** (86/339) | ≥ 15% |
| ORT1 ângulos distintos | **2** | **22** | ≥ 20 |
| ALT1 h90 | 22,61 m | 20,32 m | ≥ 9 m |
| ALT1 massas / com topo ≥ 9 m | 231 / 60 | 339 / 64 | +108 novas (orçamento ≤ 370) |
| SUP1 materiais sem `map` | 36,59% (15/41) | **28,57%** (14/49) | ≤ 40% |
| SUP2 área sem textura | **1.405 m²** (76 malhas) | **4 m²** (56 malhas) | ≤ 6% — gate: 8,8% → **0,0%** |
| texel mediana / área < 64 px/m | 28 px/m / 70% | 36 px/m / 59% | banda 64-512 (não é portão) |
| anisotropia mínima | 4 | 8 | ≥ 4 (alvo 8) |
| colisores / occluders | 48 / 48 | 160 / 160 | — |
| malhas / draw calls / triângulos | 396 / 396 / 17.789 | 518 / 506 / 20.929 | contra-exemplo `fy_mansao` 2.038 calls |
| waypoints | 410 | 334 | — |
| rotas A* spawn↔bandeira (6 pares) | 6 chegam | 6 chegam | — |
| armas sem célula andável a ≤ 0,6 m | 0 | **0** | 0 (veto do dono) |
| pares de massa interpenetrando > 0,25 m | 12 | **12** (os mesmos) | zero novos |
| `eval:parquewheel` SUPERFICIE1 | 320/340 = 94,1% | **450/450 = 100,0%** | ≥ 82% |
| `eval:parquewheel` RODA1-5 · CARROSSEL1 · AVE1 | verde | **verde** | portão |
| `eval:ambience-registry` parque | ok, 9 animais, 0 em sólido | ok, 9 animais, 0 em sólido | AR1-AR6 |
| `node --check` | — | verde | — |

Corrigi duas regressões que eu mesmo criei e medi, em vez de entregá-las:
1. a grade de fila da bilheteria a y 1,02 sem colisor deu **MAP1 0 → 10** (pen 1,18 m) — a peça saiu;
2. o trio elétrico atravessando o corredor até a sebe leste deu **MC3 0 → 13 nós ilhados** (bolsão de 9 nós no espelho, 4 no lado E). A praça de alimentação foi reorganizada com a face leste de toda massa em x ≤ 27,1, que é o que mantém o corredor de nós em x = 27,6 vivo. Voltou a 0.

Figura (planta medida, sem navegador): `/tmp/parque_planta_antes.png` e `/tmp/parque_planta_depois.png` — colisor com giro real, spawn, bandeira, arma e nó de waypoint, renderizados do mundo montado. O cartaz pintado à mão foi conferido em canvas de verdade no Chromium, nas 3 proporções (pórtico, quiosque, cartaz de 12 m): letra torta, acento legível, escorrido na cor da letra, sem esticamento.

## Não aplicado (e por quê)

- **Passos 3 e 4 da §5** (carrossel jogável, itens 45-49; Casa Mal-Assombrada e MID, itens 42-44/52-53/55) — cota andável, fora desta rodada por ordem. `groundHeightAt: () => 0` **intacto**; nada de `stairs`/`levels`. Por consequência a MID segue em (0,10) com altura de triângulo 4,79 m e o castelo segue caixa maciça.
- **Item 54 (passarela da montanha-russa a y 6,0)** — é cota andável com escada de 34 degraus; mesmo motivo.
- **Item 59 (`aoBoxGeo`/`aoMatFactory` para UV em metros)** — aplicado, **medido e revertido**. Texel ANTES 36 px/m e 59% abaixo do piso; DEPOIS 36 px/m e 58%. Motivo medido: `escalaUVporMundo` (`vao.js:62-90`) desiste quando `r < MIN_TILES(2)` **e** `px/ext ≤ TETO_PXM(512)`, que é o caso de todas as caixas deste mapa (ex.: muro de 8 m com `SURFACE.concrete` repeat 7 = 112 px/m natural). O custo era +2.000 triângulos e +10 clones de material por um AO de contato que ninguém pode revisar hoje. **A dívida de texel deste mapa não está na UV da caixa: está no `repeat` das texturas de chão** — `chão 17 px/m` (grama 128 px × repeat 10 sobre 64 m). Isso é troca de frequência de tiling, decisão de arte, e não entrou.
- **Item 15 (pilha de engradados com `crate`/`crate2`)** — não existe GLB com esse nome; `crate`/`crate2` são chave de **textura**. A pilha é caixa com `T.crate`.
- **Item 67, parte do fundo (`T.posters`)** — `T.posters` é um **array de 3 texturas**, não um mapa tilável; o fundo virou prancha de madeira em canvas, no mesmo LCG.
- **`applyAniso`** — a função não existe nesta base (só em `docs/`). Ver a linha da tabela de aplicados.
- **MAP4 / occluder por malha** — já estava correto neste mapa (`occluders.push(mesh)`, 160/160) e não havia GLB sem colisor; nada a fazer.
- **Coordenadas da receita que mudei, todas por conflito medido** (nenhuma mudança de intenção):
  - tiro ao alvo x −11,0 → **−12,8** e casa de espelhos x +11,0 → **+12,8**: nas coordenadas da receita as caixas engoliam as 4 armas do miolo em (∓9,∓7) — veto do dono. Agora as armas ficam 0,62-0,99 m à frente do balcão, `armasPresas = 0`.
  - cabine da roda z −4,6 → **−5,6**: o espelho a 180° caía dentro do castelo inflável (sobreposição medida 0,48 m).
  - gradil da fila da roda (−17,8/−5,0) → **(−18,4/−6,4)**: o espelho caía no torreão (19,8/3,5), 0,50 m.
  - gradis da fila da russa (−27,0/−24,6) e (−23,6/−21,8): as coordenadas 22-23 da receita caíam dentro do gradil de madeira pré-existente em (−22,−24) **e** dentro do disco do espelho d'água em (−21,−31).
  - os 3 vagonetes: as coordenadas 18-20 caíam dentro do espelho d'água de (−21,−31) — a receita move o espelho **norte** e esquece que o sul fica no mesmo canto do pátio da russa.
  - praça de alimentação (gerador, 3ª mesa, engradados, trio): relocados com a face leste em x ≤ 27,1 pelo motivo de MC3 acima; todos continuam em q3,0, e o som acompanhou.
  - bilheteria z ∓30,6 → **∓31,0**: em ∓30,6 ela penetrava 0,27 m na barreira de fila pré-existente de (∓8,∓29).

## Pedido ao Main (arquivo compartilhado)

Já pedido e **já aplicado por ele**: `public/js/maps.js:16` (import `{ buildParque, PARQUE_PROPS }`) e `:92` (`props: PARQUE_PROPS`). Nada mais de arquivo compartilhado.

Aviso que mandei ao `FixReguas`: entre ~09:14 e ~09:22 o `map_parque.js` não subia (`aoMatFactory is not defined`, janela do item 59 revertido) e isso derrubava junto MAP1/MAP2B/MAP4/MAP5/MAP7/CTF2 do `invariants.mjs`. Conferido depois: `bootGame('parque_treta')` sobe, 160 colisores.

## O que exige figura

1. **O gramado central de 24 × 24 m** — é a diagonal residual de 55,3 m (bandeira E vista de (−29,2 / 2,8)). Continuo sem saber se o gramado aberto é a alma do mapa ou o buraco dele; a planta mostra que é o único vão grande que sobrou. Precisa de captura a partir do pórtico.
2. **Densidade dos cantos em primeira pessoa.** MAP5 fechou (6,29 m), mas 62 massas novas em dois cantos podem ler como "pátio de escola" em vez de parque. A receita já levantou esse risco de cor: o mapa é rosa/azul/amarelo saturado e eu acrescentei concreto, lona e lata.
3. **A chicane do pórtico.** O jogador sai por um vão de 8 m, anda 1,6 m e encontra um painel de 14 m; tem que contornar por |x| > 7. Mede bem (exposição 0,07%, visada 38,4 m) e o A* passa, mas só a figura diz se o corredor de 1,6 m sufoca a saída da base.
4. **Frequência de tiling do chão** (17 px/m, 59% da área abaixo do piso de 64). Subir o `repeat` da grama para ~128 px/m muda a escala visual do gramado inteiro — é decisão de arte, não conserto.
5. **O toldo do guarda-sol** é cone procedural quando o GLB `guarda_sol` não carrega; com GLB a caixa de procuração some. Os dois estados precisam de olho.
