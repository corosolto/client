<!-- Receita gerada em 12/09/2026 por rodada de análise com contexto limpo.
     Medições: node tools/eval/map-check.mjs all + node tools/eval/mapa-novo-gate.mjs (12/09) e
     sondas em memória sobre tools/eval/harness.mjs. Índice: ../RECEITAS-MAPAS.md -->

I'll start by reading the shared context and the map file.Design settled. Now I validate it numerically against the actual world.# Parque da Treta — receita

## 0. Leitura do arquivo (o que existe hoje)

Arena 64×84 (x ±32, z ±42), 100% procedural, um único `buildParque` (`map_parque.js:12-426`), **48 colisores**, `groundHeightAt: () => 0` (`:413`), sem céu (`scene.background` cor chapada, `:184`).

| parte | linha | o que é hoje |
|---|---|---|
| texturas canvas locais (8) | `:20-68` | 128 px, `anisotropy=4` na mão — não passa por `applyAniso` |
| chão (5 planos) | `:193-197` | grama + 3 calçadas + praça 24×24 |
| sebe perimetral (4 caixas) | `:200-203` | h 2,2 — únicas paredes do mapa |
| portais E/B | `:206-211` | 2 pilares 1,1×7 em (±7, ±35) + viga sem colisor + placa |
| carrossel | `:213-235` | disco r6,1 h**0,55** (colisor, não andável), mastro 7,8, cone a 5,6-8,8 m, 8 cavalos girando |
| postes/floreiras/bandeirolas | `:237-253` | **todos `collide:false`** |
| roda-gigante | `:255-272` | r10 em (-19, 14,5) + base 6,5×1,5×3,8 — segura o h90 22,6 e não é jogável |
| castelo inflável | `:274-283` | caixa **maciça** 8,8×4,4×7,4 em (24,0) + 4 torres |
| montanha-russa | `:285-292` | 2 tubos decorativos z≈-30 + 6 colunas `collide:false` |
| quiosques / gradis / balões / espelhos d'água | `:294-318` | 4 + 16 + 4 + 2 (jatos `collide:false`) |
| armas, waypoints, luz, update, ambience | `:320-409` | 18 armas; `blocked()` só olha colisor `minY<1.6` |

---

## 1. Jogabilidade e dificuldade

### 1a. Os 20 corpos dentro de sólido — causa exata, medida

Sondei o mundo com a mesma régua (raio do peito 1,40 m → chão, `map-check.mjs:290-318`). **Os 20 pontos são exatamente duas famílias, ambas `collide:false` em chão andável:**

| # | origem | `arquivo:linha` | pontos | pen | conserto |
|---|---|---|---|---|---|
| 1 | **floreiras** `addCylinder(1.25, 0.45, MAT.wood, x,0,z,{collide:false})` em (-16,-12) (16,-12) (-16,12) (16,12) | `map_parque.js:242-249` | **16 de 20** (4 amostras por floreira: ±0,2/±1,2 em torno do centro) | 0,45 | `collide:true` + altura 0,45→**0,95** (mureta de concreto ⌀2,5 m) |
| 2 | **jatos do espelho d'água** `addCylinder(0.32, 0.7+i*0.18, …{collide:false})` em (-23,±31) (-21,65,±31) (-20,3,±31) (-18,95,±31) | `map_parque.js:317` | **4 de 20** — só os i=0 e i=2 caem na grade de 1 m; i=1 e i=3 escapam por sorte | 0,70 e **1,06 (o pior do acervo)** | `collide:true` (r 0,32, h 0,70/0,88/1,06/1,24) |
| 3 | **latentes, não medidos hoje**: 8 postes `addCylinder(0.11,4.2,…{collide:false})` `:239` e 6 colunas da russa `addCylinder(0.14,p.y,…{collide:false})` `:292` | `:239`, `:292` | 0 (⌀0,22 e ⌀0,28 passam entre as amostras de 1 m) | até 1,39 | `collide:true` nas 14 |
| 4 | **armadilha nova**: `addBox` empurra o colisor como AABB **sem girar** (`:101-104`); a §3 gira 60+ massas → mesh sai da caixa e cria MAP1 novo | `:94-106`, `:117-128` | — | — | no `addBox`, com `opts.ry`: `w' = |w·cos ry| + |d·sin ry|`, `d' = |w·sin ry| + |d·cos ry|` **antes** do `colliders.push` |

**Medido na simulação com os 4 consertos: `corpo dentro de sólido` 20 → 0.**

### 1b. Pórtico-bilheteria: mata a exposição de 52% e a visada de 86 m

Espelhado por rotação de 180° ((x,z) → (-x,-z), `ry += π`). Tabela do lado E; B é o espelho.

| # | intervenção | x,z | dimensão (l×a×p) | como | número que move |
|---|---|---|---|---|---|
| 1 | muro do pórtico O | -8,0 / -35,0 | 8,0×**4,8**×1,6 | `addBox(…, MAT.plaza)` | fecha x ∈ [-12,-4] |
| 2 | muro do pórtico L | 8,0 / -35,0 | 8,0×4,8×1,6 | idem | fecha x ∈ [4,12]; **abertura única x ∈ [-4,4]** |
| 3 | lateral do bolsão O | -12,8 / -38,5 | 1,6×3,2×5,4 | idem | fecha o bolsão a x=-12,0 |
| 4 | lateral do bolsão L | 12,8 / -38,5 | 1,6×3,2×5,4 | idem | bolsão 24×5,4 m → diagonal 24,6 m **< 25 m**: nenhum observador interno conta |
| 5 | bilheteria/chicane O | -3,5 / -30,6 | 7,0×3,6×3,2 | `addBox` + `T.signPastel`/`T.posters` na face norte | par 5+6 = painel de 14 m > abertura de 8 m, a 1,6 m dela: cobre todo ângulo oblíquo |
| 6 | bilheteria/chicane L | 3,5 / -30,6 | 7,0×3,6×3,2 | idem | idem |
| 7 | **spawns** E/B | x ∈ {-6,-2,2,6}, z=∓38,5 | — | trocar `:415-416` (`[-9,-3,3,9]` → `[-6,-2,2,6]`) | MAP2B área contígua **35,9 → 48,6 m²** (teto 40); folga 2,70 m |

**Medido (simulação com a geometria acima):**

| régua | hoje | proposta |
|---|---|---|
| exposição E / B | 51,9% / 52,2% | **0,0–0,9%** por slot |
| maior visada | 86,2 m | **40,8 m** |
| MAP2B folga / área | — | 2,70 m / 48,6–58,6 m² |

Cuidado que a simulação achou: com o pórtico a 4,2 m a linha da passarela da russa (§2) roçava o topo por 0,07 m. **4,8 m é o número, não 4,2.**

### 1c. Os 4 cantos vazios (MAP5) + as duas bandeiras que moram neles

As bandeiras E (18,-33) e B (-18,33) estão em `q3,0` e `q0,3` — **os dois quadrantes de 1 prop e esp 17,3 m**. Bandeira sem cobertura = quem segura o ângulo ganha.

**Praça de alimentação** (canto da bandeira; E abaixo, B = espelho 180°):

| # | intervenção | x,z | dimensão | ry | prop GLB por cima | número |
|---|---|---|---|---|---|---|
| 8 | barraca de pastel | 22,6 / -31,4 | 3,6×2,8×2,6 | 0,22 | `stall` `targetLen:3.6` | q3,0 |
| 9 | barraca de algodão-doce | 17,0 / -29,6 | 3,2×2,8×2,4 | -0,41 | `drinkstand` | q3,0 — tapa a aproximação norte da bandeira |
| 10 | carrinho de caldo de cana | 20,4 / -26,8 | 2,4×2,2×1,6 | 0,63 | `drinkstand` `targetH:2.2` | q3,0 |
| 11-13 | 3 mesas com guarda-sol | 19,2/-35,0 · 24,2/-34,2 · 27,2/-30,6 | 2,4×2,3×2,4 | 0,15 / -0,33 / 0,48 | `mesa_guardasol` | 3 props, cobertura de cintura em volta da bandeira |
| 14 | gerador barulhento | 28,6 / -27,4 | 2,2×1,6×1,4 | 0,35 | caixa + `T.metal` | q3,0 + som (§4) |
| 15 | pilha de engradados | 25,2 / -35,8 | 2,0×1,5×1,6 | -0,28 | `crate`/`crate2` | q3,0 |
| 16 | **trio elétrico** (caminhão de som) | 27,0 / -22,6 | 7,4×3,4×2,6 | 0,12 | `vw_9150` `targetLen:7.4` + `caixa_som_baile` no teto | q3,0, silhueta de 3,4 m |

**Pátio da montanha-russa** (canto sem bandeira; E abaixo, B = espelho):

| # | intervenção | x,z | dimensão | ry | número |
|---|---|---|---|---|---|
| 17 | contêiner da oficina | -27,4 / -37,2 | 6,2×2,6×2,6 | 0,16 | q0,0 |
| 18-20 | 3 vagonetes na fila de embarque | -24,6/-33,8 · -22,4/-31,6 · -20,0/-29,4 | 2,4×1,5×1,3 | 0,52 / 0,31 / 0,74 | 3 props; 1,5 m = cobertura útil |
| 21 | bilheteria da russa | -28,8 / -30,4 | 2,6×3,0×2,6 | -0,19 | q0,0 |
| 22-23 | gradil de fila | -26,2/-27,0 · -22,8/-25,0 | 3,4×1,15×0,5 | 0,90 / 0,50 | q0,0 |
| 24 | **mover o espelho d'água norte** de (-21, +31) para **(21, +31)** (`:316`) | — | r 4,2 | — | põe os 4 jatos-prop em `q3,3` e restaura a simetria de 180° (hoje o mapa é espelhado em Z, não rotacionado) |

**Flancos e miolo** (E; B = espelho):

| # | intervenção | x,z | dimensão | ry | número |
|---|---|---|---|---|---|
| 25 | cabine de comando da roda-gigante | -24,0 / -4,6 | 2,6×2,6×2,2 | 0,24 | q0,1 |
| 26-28 | 3 gradis da fila da roda | -15,8/-6,2 · -19,4/-8,6 · -23,2/-10,4 | 3,6×1,15×0,5 | 0,41 / -0,22 / 0,67 | q0,1 |
| 29 | `caixa_som_baile` na sombra | -28,2 / -14,6 | 1,6×2,0×1,2 | 0,33 | q0,1 |
| 30-31 | 2 `palmeira_imperial` | -29,0/6,4 · -26,2/15,8 | ⌀0,56 × 9,5 | — | q0,2 + massa alta (ALT1) |
| 32 | bilheteria da roda | -24,8 / 9,2 | 3,0×3,0×2,6 | -0,28 | q0,2 |
| 33-35 | **barraca de tiro ao alvo** (corpo / balcão 1,1 m / prateleira de pelúcia) | -11,0/-8,0 · -11,0/-5,8 · -11,0/-9,6 | 5,0×2,9×3,0 · 5,0×1,1×0,5 · 5,0×2,4×0,4 | 0,27 | q1,1 — balcão de 1,1 m é a faixa 0,9-1,6 m de cobertura útil |
| 36-38 | **casa de espelhos** (corpo / mureta / gerador) | 11,0/-8,0 · 11,0/-5,4 · 13,8/-10,6 | 5,4×3,2×4,0 · 5,4×1,1×0,5 · 2,0×1,5×1,4 | -0,31 / -0,31 / 0,44 | q2,1 |
| 39-41 | 3 `banco_jardim` | -14,2/-3,4 · -4,6/-16,0 · 14,6/-3,0 | 1,8×0,9×0,6 | 0,36 / -0,52 / 0,58 | q1,1 / q1,1 / q2,1 |

**MAP5 medido, 16 quadrantes (hoje: 1 prop / esp 17,3 nos cantos, 16 de 16 acima de 7 m):**

| q | esp hoje | esp proposta | props | q | esp hoje | esp proposta | props |
|---|---|---|---|---|---|---|---|
| 0,0 | **17,30** | **3,84** | 14 | 2,0 | 9,9 | 4,90 | 10 |
| 0,1 | 12,2 | 5,11 | 9 | 2,1 | 9,9 | 4,28 | 11 |
| 0,2 | 9,9 | 5,69 | 8 | 2,2 | 8,7 | 3,60 | 16 |
| 0,3 | **17,30** | **3,78** | 12 | 2,3 | 9,9 | 4,66 | 11 |
| 1,0 | 9,9 | 5,07 | 9 | 3,0 | **17,30** | **3,74** | 12 |
| 1,1 | 9,9 | 4,12 | 12 | 3,1 | 8,7 | 4,47 | 12 |
| 1,2 | 9,9 | 4,28 | 11 | 3,2 | 8,7 | 3,63 | 17 |
| 1,3 | 9,9 | 5,43 | 8 | 3,3 | **17,30** | **3,81** | 14 |

**pior espaçamento 17,30 → 5,69 m (teto 7,0); 16/16 reprovando → 0/16; pior razão de densidade 0,57 (piso 0,35).**

### 1d. As visadas de 84-87 m e a bandeira do meio

`MID 'CARROSSEL' (0,10)` não fica no carrossel (que é (0,0)) e está quase na reta E–C: altura do triângulo **4,79 m**, 0,29 m acima do piso. Qualquer ajuste de bandeira futuro reprova.

| # | intervenção | x,z | dimensão | como | número |
|---|---|---|---|---|---|
| 42 | **MID vira a Casa Mal-Assombrada**: `ctfPoints` `:420` → `{ id:'MID', label:'CASA MAL-ASSOMBRADA', x: 24, z: 0 }` | 24 / 0 | — | z=0 mantém as duas bases equidistantes (42,5 m cada) | **altura do triângulo 4,79 → 21,07 m**; dist. spawn 42,5 m |
| 43 | derrubar a caixa maciça do castelo (`:277`) e erguer **7 paredes** de 0,4 m: sul (21,3/-4,2) e (26,7/-4,2) 3,8×3,4; norte (21,3/4,2) e (26,7/4,2) 3,8×3,4; oeste (19,4/-2,55) e (19,4/2,55) 3,3 de vão; leste (28,6/0) 8,4 | 24 / 0 | miolo 8,4×7,6 = 64 m² | 3 portas: sul 1,6 m, norte 1,6 m, oeste 1,8 m | +7 props (a caixa maciça tinha 65,1 m² de pegada e **não contava como prop**); linha de tiro à bandeira **58,0 → 3,4 m** |
| 44 | manter as 4 torres `:279` como torreões | (19,8/±3,5) (28,2/±3,5) | r1,45 h6,2 | já são colisores | q3,1/q3,2 |

**Linhas de tiro medidas:** E **84,3 → 59,2 m**, MID **58,0 → 3,4 m**, B **87,1 → 56,4 m**.
Residual honesto: os 59,2 m são a diagonal do gramado central (de (-29,2, 2,8) até a bandeira E) — o gramado 24×24 continua sendo o vão aberto do mapa.

---

## 2. Verticalidade (alvo: ALT1 h90 ≥ 9 m, ≥1 cota andável nova)

Hoje `groundHeightAt: () => 0` (`:413`) — **cota andável = 1, o chão.** O h90 de 22,6 m é da roda-gigante e das nuvens: número que ninguém pisa. Copiar o padrão multinível de `map_lajes_authored.js:818-850` (`groundHeightAt(x,z,yRef)`, `stairs`, `staircases`, `levels`, `:1253-1260`) e a guarda de borda de `:857-864`.

| # | cota nova | x,z | dimensão | acesso | número |
|---|---|---|---|---|---|
| 45 | **plataforma do carrossel** y=0,60 | (0,0) | disco r 3,45 andável + rampa até r 6,60 | `groundHeightAt`: `r≤3,45 → 0,60`; `r≤6,60 → 0,60·(6,60−r)/3,15`; senão 0. Inclinação 0,19 (Δ 0,048 m por célula de 0,25 — passa no degrau 0,30) | 1ª cota nova |
| 46 | trocar o disco `:214` por **tronco de cone** `CylinderGeometry(3.45, 6.60, 0.60, 32)` em y=0,30 | (0,0) | — | a superfície lateral **é** a rampa: casa exatamente com o item 45 | sem isto a rampa vira 6 pontos de MAP1 (pen 0,34-0,42 — medido) |
| 47 | **anel-tambor do carrossel**, 6 blocos girados | r 4,9 nos ângulos 27° 88° 154° 209° 271° 331° | 3,2×**1,35**×2,2 cada | 6 vãos de 1,5-2,0 m entre eles | os cavalos giram **acima de área não-andável** → MAP1 fica 0; 1,35 m = cobertura de peito; +6 props e +6 ângulos (ORT1) |
| 48 | 8 pilares do carrossel `:223` passam a colidir | r 4,25, 8 direções | r 0,18 × 3,0, base y=0,60 | — | +8 props |
| 49 | **baixar o cone-cobertura** `:217-220` de y 5,6-8,8 para **y 3,6-6,2** e o mastro `:215` para h 4,0 sobre a plataforma | (0,0) | cone r 7,0 h 2,6 | — | vira teto de verdade: pé-direito 3,0 m sobre a plataforma |
| 50 | **mirante da bilheteria** y=3,60 | (0, ∓30,6) | 14,0×3,2 m de laje | escada de 20 degraus, espelho **0,18** / piso **0,28** / 2h+p **0,64** / 32,7° / largura **1,3** (NBR: `map-check.mjs:76-80`), em (-3,2 … 2,4 / ∓28,4) | 2ª cota; 44,8 m² por base |
| 51 | parapeitos do mirante (obrigatórios: queda 3,6 > 2,0, MAP6) | (0,∓29,15) (0,∓32,05) 14,0×1,05×0,18 · (±6,91, ∓30,6) 0,18×1,05×3,2, y=3,6 | | | +4 props/base, MAP6 = 0 |
| 52 | **varanda da Casa Mal-Assombrada** y=3,40 | norte (24, 5,1) 9,2×1,8 · leste (29,5, 0) 1,8×10,2 | laje 0,30 | escada externa 19 degraus × 0,179 (piso 0,28, 2h+p 0,638, 32,6°, larg 1,3) no trecho x ∈ [18,0; 23,4] em z=5,1 | 3ª cota; olha a bandeira MID de cima |
| 53 | parapeitos da varanda | (24, 6,0) 9,2×1,0×0,18 · (30,4, 0) 0,18×1,0×10,2, y=3,7 | | | MAP6 |
| 54 | **montanha-russa vira passarela de manutenção** y=6,0: espelhar os `coasterPoints` `:286-289` para z ≈ +30 (rotação 180°) e correr uma laje 1,6 m de largura ao lado do trilho, dos dois lados | z ≈ -28,5 e +28,5, x de -28 a 29 | 57 m × 1,6 | escada de 34 degraus × 0,176 nos pés das colunas x=-28 e x=+28 | 4ª cota; a colher tem que ser fechada por **painel cego de 2,6 m na face voltada para a base** (topo y 8,6) — sem ele a passarela enxerga o bolsão do spawn |
| 55 | torre/frontão da casa mal-assombrada | (24, 0) | pico y **9,6** | telhado de duas águas + torre da bruxa | massa ≥9 m |

**ALT1:** medido hoje 231 massas, **60 delas com topo ≥ 9 m**, h90 22,61. Com as palmeiras (4) e a torre (2) → 66. h90 continua ≥9 enquanto o total ficar **abaixo de 660 massas**; a receita acrescenta ~200. Orçamento de segurança: **≤ 370 massas novas com topo < 9 m**.

---

## 3. Visual e escala (SUP2 ≤6%, SUP1 ≤40%, ORT1 ≥15%/20 ângulos, UV 128 px/m)

**SUP2 medido hoje: 8,8% (1.405 m² de 15.889). Um único material responde por 1.401,5 m² — 99,7%.**

| # | intervenção | onde | como | número |
|---|---|---|---|---|
| 56 | **`MAT.cloud`** (`0xfffdf5`, 20 malhas de nuvem, `map_parque.js:78`) é `MeshStandardMaterial` **sem `map`** | `:78` | `MAT.cloud = new THREE.MeshStandardMaterial({ color: 0xfffdf5, map: surfaceTexture('cloud','#fffdf5','#e8eef7',2), roughness: 1 })` | **SUP2 8,8% → 0,02%** (teto 6%) |
| 57 | 14 dos 15 materiais sem `map` são a fauna do `ambientlife.js` (rato/pombo/cachorro/papagaio, área somada 3,1 m²) | — | não mexer; contar que os materiais novos entram **todos com `map`** | SUP1 **36,6% (15/41) → 28,6% (14/49)** |
| 58 | as 8 texturas canvas de `:20-61` fixam `anisotropy = 4` na mão (`:59`) | `:59` | trocar por `applyAniso(texture)` de `textures.js` — é régua desde os PRs #547/#563 | dívida fechada |
| 59 | UV em metros nas caixas grandes | pórtico, bilheteria, paredes da casa, passarela | usar `aoBoxGeo(w,h,d,{ material })` de `vao.js` em vez de `boxGeometry` (`:83-87`) nas 24 caixas ≥ 3 m: AO de contato + UV a 128 px/m | alvo `ALVO_PXM = 128` |
| 60 | **céu**: hoje `scene.background = new THREE.Color(0x75cef2)` (`:184`) | `:184` | `setMapSky(scene, T, '/img/textures/sky_rj.webp', 0x75cef2)` — céu aberto de domingo; a névoa `:185` (76-155 m) fica | mapa deixa de ser cor chapada no horizonte |

**ORT1 — hoje 10,4% de massa girada e 2 ângulos em 231 massas.** Medi a origem: os 24 giros são as 6 peças ≥0,5 m dos 4 cavalos ímpares do carrossel (`:224`, `horse.rotation.y = -a`), tudo em 0° ou 45°. Não existe **um** giro autoral no mapa.

| # | intervenção | como | número |
|---|---|---|---|
| 61 | os `ry` das tabelas §1c/§1d/§2 (62 caixas espelhadas + 6 blocos do anel) usam ângulos irregulares, nunca múltiplos de 15° | 0,12 0,15 0,16 0,19 0,22 0,24 0,27 0,28 0,31 0,33 0,35 0,36 0,41 0,44 0,48 0,50 0,52 0,58 0,63 0,67 0,74 0,90 rad + 27° 88° 154° 209° 271° 331° | ≥ **25 ângulos distintos** (piso 20) |
| 62 | fração girada | 92 massas giradas em ~430 | **~21%** (piso 15%) |
| 63 | **pré-requisito**: o colisor girado do item 4 (§1a) | `addBox`/`addCylinder` `:101-104`, `:123-126` | sem ele o ORT1 verde vira MAP1 vermelho |

---

## 4. Brasilidade (parque de diversão de periferia)

| # | o que | onde | como (catálogo / chave de textura) |
|---|---|---|---|
| 64 | **declarar `PARQUE_PROPS`** (hoje o mapa não importa `mapprops.js`, `:2-4`) | `map_parque.js` + `maps.js:92` (`props: PARQUE_PROPS`, igual a `atacadao_treta` em `:91`) | `['stall','drinkstand','quiosque','mesa_guardasol','guarda_sol','banco_jardim','poste_jardim','palmeira_imperial','caixa_som_baile','pipa_papel','vw_9150','dumpster','cooler','crate']` — o GLB é só a silhueta; **os colisores continuam sendo as caixas das tabelas** (`placeProp` devolve `null` se o GLB falhar, `mapprops.js:48`) |
| 65 | barraca de pastel / algodão-doce / caldo de cana | itens 8-10 | `stall` + `drinkstand`; toldo com `T.awning`, testeira com `T.signPastel` |
| 66 | tiro ao alvo com prêmio de pelúcia | item 33-35 | prateleira 5,0×2,4×0,4 com `T.corkboard` + fileira de esferas coloridas r 0,22 (o urso de pelúcia) |
| 67 | **cartaz pintado à mão** em vez das placas de Arial Black de `:171-182` | face norte da bilheteria (0, ∓29,0), 12,0×2,6 | manter `signTexture` mas trocar a fonte por traço torto (offset ±3 px por letra, seed do `rand()` de `:24`) e o fundo por `T.posters`; "PARQUE DA TRETA — ENTRADA 2 REAIS" |
| 68 | bilheteria com guichê e fila | itens 5-6 + gradis 22-23, 26-28 | vão de 0,9×1,2 recortado no bloco + `T.metal` na grade |
| 69 | trio elétrico | item 16 | `vw_9150` `targetLen:7.4` + 4 `caixa_som_baile` no teto (`InstBatch`) |
| 70 | gerador barulhento | item 14 | som: acrescentar `{src: AMB_LOOPS.obra, pos:[27,1,-24], radius:16, vol:.22}` (e o espelho em (-27,1,24)) na lista de `:412` |
| 71 | som de parque | `:412` | manter `passaros`; trocar `grilos` (é som de noite) por `{src: AMB_LOOPS.funk, pos:[27,2,-23], radius:30, vol:.30}` no trio elétrico + espelho; `bioma:'campo'` fica |
| 72 | 8 `guarda_sol` + 6 `banco_jardim` + 8 `poste_jardim` nos postes já existentes de `:238-241` | (±7,±12), (±27,±18) | `poste_jardim` `targetH:4.2` por cima do cilindro que agora colide (item 3) |
| 73 | 6 `pipa_papel` presas nos fios da roda-gigante e no topo do trenzinho | y 6-11 | decorativas, sem colisor, **acima de 1,40 m** (fora da sonda MAP1) |
| 74 | 4 `palmeira_imperial` (itens 30-31 e espelhos) | (-29,0/6,4) (-26,2/15,8) e espelhos | tronco r 0,28 com colisor, 9,5 m |

Orçamento: props repetidos (guarda-sol, banco, poste, mesa, vagonete, caixa de som) entram por **`InstBatch`/`PropBatch`** de `mapprops.js:228-331`, no padrão de `map_campomorro.js:65` e `:599-600` — nunca clone solto. O `fy_mansao` com 2.038 draw calls é o contra-exemplo.

---

## 5. Ordem de execução e custo

| passo | o que | fecha | risco |
|---|---|---|---|
| 1 | Itens 1-4 (`collide:true` em floreira/jato/poste/coluna + colisor girado no `addBox`) + item 56 (`MAT.cloud` com `map`) | **MAP1 20 → 0**, **SUP2 8,8% → 0,02%**, e destrava o ORT1. ~15 linhas | nenhum: só acrescenta colisor onde já existe malha. Rodar o `--mutante=penetracao-injetada` do `map-check` para provar que a sonda continua mordendo |
| 2 | Pórtico-bilheteria + spawns recentrados (itens 1-7) | **exposição 52% → 0,0-0,9%**, **visada 86,2 → 40,8 m**, MAP2B área 48,6 m² | fechar demais o bolsão: a diagonal medida é 24,6 m e o teto é 25 — **não estreitar** as laterais de x=±12,8 |
| 3 | Carrossel jogável (itens 45-49) — `groundHeightAt` multinível no padrão `map_lajes_authored.js:818-850` | 1ª cota andável, cobertura no centro do mapa, +14 props | é o único passo que troca o contrato de `groundHeightAt` (`:413`); o tronco de cone (item 46) **tem** que casar com a fórmula, senão volta MAP1 (medi 6 pontos quando não casava) |
| 4 | Casa Mal-Assombrada + MID (itens 42-44, 52-53, 55) | **CTF1 4,79 → 21,07 m**, linha da MID 58,0 → 3,4 m, 3ª cota | MID a 3,4 m de linha de tiro é um ponto muito fechado; se ficar sufocante, abrir a porta leste (28,6/0) em vez da parede cheia |
| 5 | Cantos e flancos (itens 8-41) + passarela da russa (item 54) | **MAP5 17,30 → 5,69 m, 0/16 reprovando**; ORT1 ~21%/25 ângulos | 200 massas novas — ficar abaixo das 370 do orçamento ALT1; tudo repetido em `InstBatch` |
| 6 | Brasilidade e superfície (itens 57-60, 64-74) | SUP1 28,6%, céu, `applyAniso`, `PARQUE_PROPS` no `maps.js:92` | `placeProp` devolvendo `null`: o mapa **tem** que continuar jogável sem GLB — por isso o colisor é a caixa, não o prop |

---

## 6. O que eu NÃO consegui decidir sem olhar figura

1. **A diagonal residual de 59,2 m** (de (-29,2, 2,8) até a bandeira E) atravessa o gramado central de 24×24 m. Sei o número e sei que uma massa em torno de (-9,-13) e do espelho (9,13) a corta; **não sei se o gramado aberto é a alma do mapa** (parque tem gramado) ou se ele é o buraco. Precisa de captura do gramado a partir do portal.
2. **A altura do cone do carrossel** baixada para 3,6-6,2 m (item 49): pé-direito de 3,0 m sobre a plataforma é jogável, mas não sei se o cone de r 7,0 a 3,6 m lê como "cobertura" ou como "teto batendo na cabeça" em primeira pessoa.
3. **Se os cavalos devem sumir.** Com o anel-tambor (item 47) eles giram sobre área não-andável e ficam bonitos de fora; de dentro da plataforma o jogador vê 8 cavalos passando na altura do peito, do outro lado do tambor. Pode ser o melhor detalhe do acervo ou pode ser ruído visual em tiroteio.
4. **A largura dos 6 vãos do anel** (1,5-2,0 m, calculada, não vista): 1,5 m com corpo de 0,76 m passa, mas duas pessoas se enroscam. Só a figura diz se são 6 vãos ou 4 mais largos.
5. **Cor.** O mapa hoje é rosa/azul/amarelo saturado (`:73-76`) e a proposta acrescenta 40 volumes de concreto e madeira. Não sei se o resultado continua parecendo parque de diversão ou vira pátio de escola.
