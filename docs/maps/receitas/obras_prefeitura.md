<!-- Receita gerada em 12/09/2026 por rodada de análise com contexto limpo.
     Medições: node tools/eval/map-check.mjs all + node tools/eval/mapa-novo-gate.mjs (12/09) e
     sondas em memória sobre tools/eval/harness.mjs. Índice: ../RECEITAS-MAPAS.md -->

# Obras da Prefeitura — receita

## 0. Leitura do arquivo (o que existe hoje)

Arena 56×70 m, simétrica em z=0, tudo em `buildObras` (`map_obras.js:41-257`). Chão é um `PlaneGeometry` 56×70 deformado por `groundHeightAt` (`:61-66`) = onda senoidal + 4 covas `PITS` (`:60`). Cerca: 4 `tapume()` de 2,6 m no perímetro (`:100-105`). Miolo: 4 pilares 0,8×6 m nos cantos ±8 (`:110-113`), uma laje 18×0,4×8 a y=4,2 em z=−8 **`collide:false`** (`:114`) e uma rampa de tábua 3×0,16×5 em (9, 1,5, 2) com `rz:-0.5`, **também `collide:false`** (`:117`). 3 andaimes 3×2×5,7 m (`:121-126`). Material solto: `monteAreia`/`canos`/`blocos` (`:128-133`) e 12 chamadas de `prop()` (`:134-145`). Entorno fora dos bounds: 12 casas GLB + 14 caixas `building()` com faixas de janela (`:206-213`). Luz e névoa à mão (`:90`, `:181-187`) — **não há `setMapSky` nem `applyLook`**. Waypoints (`:191-203`) excluem célula com chão < −1,1 m. Bandeiras em `:249-253`.

O defeito estrutural que nada disso declara: **`occluders` tem 32 entradas** (medido, `occMedidos 32`) e todas vêm de `addBox` (`:74`). O helper `prop()` (`:79`) faz `occluders.push(o)` com o **Group** devolvido por `placeProp` (`mapprops.js:48-64`), e todo consumidor de `occluders` no jogo usa `intersectObjects(..., false)` — bala (`game.js:3310`, `:6445`, `:6953`), LOS de bot (`:5914`), auto-mira (`:2101`). Group não-recursivo não é testado. E `monteAreia`, `canos`, a laje, a rampa, a lona, a betoneira e os 14 prédios nunca entram na lista. **Medido: um tiro de (4,−31) para (4,+31) na altura do olho atravessa os 62 m do mapa e só bate no tapume do fundo (z=34,4).**

### Veredito sobre o PR #579 (o que eu ACRESCENTO e o que CONTRADIGO)

| # | o #579 faz | minha posição | evidência |
|---|---|---|---|
| 1 | 2 torres de andaime com `decks`/`alturaDeck`/`groundHeightAt(x,z,yRef)` e poda do maior componente do grafo | **REUSAR inteiro.** Minha cota andável usa esse mesmo mecanismo; não reescrevo nada dele | diff `map_obras.js` hunk `@@ -56,13 +59,30` e `@@ -184,14 +336` |
| 2 | `occluders.push(glb)` nas torres e nos bunkers (2 lugares) | **CONTRADIZ.** Repete o defeito do `:79`: torre e bunker do #579 não param bala nem LOS | diff linhas `+598`, `+635` |
| 3 | `obras-check.mjs` OBRAS5 mede 58,9%→23,6% de "pares >20 m com linha livre" contra `colliders` (`olho = colliders...`) | **CONTRADIZ o valor da régua.** Bala e LOS leem `occluders`, não `colliders`. OBRAS5 pode ficar verde com o mapa inteiro transparente | diff `tools/eval/obras-check.mjs`, `const olho = colliders.filter(...)` |
| 4 | não declara `world.levels` | **ACRESCENTO.** Sem `levels`, o `travessia` do `map-check.mjs:445-469` nunca verifica que o andar de cima é alcançável a pé E pelo A* | `map-check.mjs:445` |
| 5 | `slowAt = (x,z) => terreno(x,z) < -0.7` | **CONTRADIZ.** Em cima de qualquer deck sobre cova você continua na lama. Tem que consultar `alturaDeck` primeiro | diff linha `+725` |
| 6 | não toca em `ctfPoints` | **ACRESCENTO.** As duas bandeiras continuam no fundo das covas | `:249-253` intocado |
| 7 | não toca na rampa decorativa `:117` | **ACRESCENTO.** É a causa exata dos 8 pontos de MAP1 | ver §2.1 |
| 8 | não chama `setMapSky`/`applyLook` | **ACRESCENTO.** Mapa externo sem céu | `:90` intocado |
| 9 | não toca em material nem textura; acrescenta ~120 massas em `MAT.concRaw/metal/tabua/areia` (sem `map`) | **CONTRADIZ na direção.** Piora SUP1/SUP2, que já são 41,3% e 75,4% | diff, todo `addBox` novo |
| 10 | 0 massa girada nas peças novas (todo `addBox` sem `ry`) | **ACRESCENTO.** ORT1 continua 0,0% / 1 ângulo | diff, nenhum `ry` nas massas novas |
| 11 | q0,0 continua deserto: das peças novas do #579 só o `sandbags` em (−16,4; −29,8) cai lá → 1 prop / 222 m² = esp ≈ 14,9 m | **ACRESCENTO.** ver §1.4 | aritmética sobre o diff + `areaAndavel 222` medido |

---

## 1. Jogabilidade e dificuldade  (alvo: MAP5 ≤7 m, cover ≤12,5 m, CTF1 >4,5 m, exposição ↓)

### 1.1 — `occluders`: fazer a bala e o olho do bot baterem na geometria (a intervenção de maior retorno do mapa)

| # | intervenção | x,z | dimensão | como (função/prop) | número que move |
|---|---|---|---|---|---|
| 1.1a | `prop()` passa a registrar as **malhas**, não o Group | `map_obras.js:79` | — | trocar `occluders.push(o)` por `occMesh(o)`, com `const occMesh = (o) => { if (!o) return o; o.traverse((m) => { if (m.isMesh) occluders.push(m); }); return o; };` — padrão literal de `map_brasilia.js:584` e `map_quebrada.js:99` | os 12 props do miolo passam a existir para bala/LOS |
| 1.1b | registrar as malhas soltas que nunca entraram | `monteAreia :128`, `canos :129`, topo de `blocos :130`, laje `:114`, lona `:119`, tambor da betoneira `:147`, `building() :209` | as que já existem | `occMesh(m)` em cada retorno | **occluders 32 → 188; exposição E 88,5% → 76,1%, B 89,1% → 66,7% (medido)** |
| 1.1c | procuração invisível para os GLB pesados do entorno | `guindaste` (−20, 22), `vw_9150` (20, −22), 12 casas do entorno em x=±37 | caixa do volume real, não do AABB do conjunto | `occBox(w,h,d,x,y,z,ry,'guindaste')` de `map_brasilia.js:573-578`, marcando `userData.proxyGLB` | mantém MAP4 verde (`invariants.mjs`: proxy de GLB é pulado em node) e evita levar centenas de malhas de GLB para o raycast |

> Custo: 188 occluders fica entre `quebrada` (433) e o teto de `fy_lajes` (971). Sem passo 1.1 **nenhuma** outra intervenção de exposição vale, porque a geometria que você acrescenta não é lida por quem atira.

### 1.2 — Tapume do canteiro: tirar o spawn da linha de tiro do mapa inteiro

Três painéis por lado (`sz ∈ {−1, +1}`), mesmo helper `tapume()` de `:100-103` (que já põe a faixa `MAT.hazard` no topo):

| # | painel | x,z | dimensão (dimX × h × dimZ) | como | número que move |
|---|---|---|---|---|---|
| 1.2a | P1 frontal | (−2, 26·sz) | 24,0 × 2,6 × 0,25 | `tapume(24.0, 0.25, -2, sz*26)` | — |
| 1.2b | P2 flanco leste | (13, 26,5·sz) | 0,25 × 2,6 × 10,0 | `tapume(0.25, 10.0, 13, sz*26.5)` | — |
| 1.2c | P3 flanco oeste | (−16, 26,5·sz) | 0,25 × 2,6 × 10,0 | `tapume(0.25, 10.0, -16, sz*26.5)` | — |
| | **saídas: 2,0 m em x −16…−14 (oeste) e 3,0 m em x 10…13 (leste)** | | | | **exposição E 76,1% → 4,9%, B 66,7% → 4,3% (medido); maior visada 73,6 → 66,6 m** |

MAP2B medido **depois** do tapume: pior folga **1,80 m** (teto ≥1,2) e pior área contígua **48,9 m²** (teto ≥40) — os dois verdes. Era 3,45 m / 68,3 m²; a margem encolhe mas não estoura. Não mexer nos 4 slots de spawn (`:229`), que estão calibrados por VM14.

### 1.3 — Barracão, contêiner e caminhão (exposição + brasilidade + MAP5)

| # | peça | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.3a | barracão do canteiro (alojamento sul / refeitório norte) | (−21, 28·sz) | 6,0 × 2,8 × 3,0 m, `ry` 6° e 9° | `addBox` com `MAT.tabua` (já texturizado por §3) + porta e janelinha | q0,0 e q0,3 +1 prop cada |
| 1.3b | contêiner de ferramenta | (22, 21·sz) | 3,2 × 2,6 × 2,4 m, `ry` 24° e 31° | `placeProp('junkyard_container', {targetLen: 3.2, ry})`, colisor pelo AABB girado | q3,0 e q3,3 +1 cada |
| 1.3c | caminhão-betoneira | (6, 27·sz) | 6,6 × 3,0 × 2,4 m, `ry` 19° e 37° | `placeProp('vw_9150', {targetLen: 6.6, ry})` | q2,0 e q2,3 +1 cada |
| | | | | | **exposição E 4,6% / B 4,2%; maior visada 66,6 → 65,7 m (medido, occ = 200)** |

### 1.4 — MAP5: encher os 13 quadrantes acima de 7 m

Régua: `esp = √(áreaAndável / nProps)`, teto 7 m ⇒ `nProps ≥ áreaAndável / 49`. Áreas medidas hoje. Coluna "minhas estruturas" já conta o que as §1.2, §1.3, §1.5 e §2 colocam.

| quadrante | x0,z0 | área andável | props hoje | esp hoje | precisa | minhas estruturas | props do catálogo a acrescentar |
|---|---|---|---|---|---|---|---|
| q0,0 | −27,5; −34,5 | 222 m² | **0** | **99** | 5 | P3 +1, barracão +1 | **+3**: `dumpster` (−24, −22) ry 22°, `kombi` (−19,5; −32) ry 76°, `caixa_dagua_azul` sobre cavalete (−25, −31) ry 30° |
| q0,1 | −27,5; −17,3 | 212 | 7 | 5,51 | 5 | — | — |
| q0,2 | −27,5; 0 | 215 | 8 | 5,19 | 5 | escoramento B +6 | — |
| q0,3 | −27,5; 17,3 | 202 | 2 | 10,06 | 5 | P3 +1, barracão +1, escoramento B +4 | +3 (espelho de q0,0 em z>0) |
| q1,0 | −13,8; −34,5 | 225 | 1 | **15,0** | 5 | P1 +1, escoramento E +6 | — |
| q1,1 | −13,8; −17,3 | 208 | 3 | 8,32 | 5 | escoramento E +10, sapata +1, guarda-corpo +1 | — |
| q1,2 | −13,8; 0 | 208 | 3 | 8,32 | 5 | escoramento B +6, sapata +1, guarda-corpo +1 | — |
| q1,3 | −13,8; 17,3 | 228 | 2 | 10,67 | 5 | P1 +1, escoramento B +2 | — |
| q2,0 | 0; −34,5 | 225 | 3 | 8,66 | 5 | P2 +1, caminhão +1, cavaletes da rampa +3, placa de obra +2 | — |
| q2,1 | 0; −17,3 | 211 | 3 | 8,38 | 5 | guarda-corpo +2, cavaletes da rampa +5 | — |
| q2,2 | 0; 0 | 212 | 3 | 8,40 | 5 | guarda-corpo +4, cavaletes da rampa +5 | — |
| q2,3 | 0; 17,3 | 228 | 1 | **15,1** | 5 | P2 +1, caminhão +1, cavaletes +3, placa +2 | — |
| q3,0 | 13,8; −34,5 | 192 | 2 | 9,80 | 4 | contêiner +1 | **+1**: `pilha_pneus` (18, −30) ry 26° |
| q3,1 | 13,8; −17,3 | 204 | 4 | 7,14 | 5 | — | **+1**: `tent` (barraca do almoço) (24, −12) ry 13° |
| q3,2 | 13,8; 0 | 201 | 9 | 4,73 | 5 | — | +1 espelho do `tent` (24, 12) ry −13° |
| q3,3 | 13,8; 17,3 | 209 | 2 | 10,21 | 5 | contêiner +1 | **+2**: `pilha_pneus` (18, 30) ry −26°, `construction_rubble` (24, 30) ry 17° |

**Resultado: pior espaçamento 99 m → ≤7,0 m nos 16 quadrantes; pior razão prop 0× → ≥1,0×.** Os 12 GLB novos entram por **um** `PropBatch({bucket: 12})` (padrão `map_campomorro.js:65`), não por clone solto.

`cover-3s` medido hoje: pior ponto **9,1 m** em (−18, −25) — já abaixo do teto de 12,5 m. O barracão em (−21, 28·sz) e a caçamba em (−24, ±22) derrubam esse ponto para ~4 m; não é a régua que estava vermelha e não invento número para ela.

### 1.5 — As duas bandeiras dentro das covas

Medido hoje: **E (−10,−14) chão −1,58 m, penetração 1,017, `slowAt = true`; B (−10,14) chão −0,79 m, `slowAt = true`.** A penetração é o `monteAreia(-12, sz*14, 2.4)` de `:132` — cone de raio 2,4 m cuja borda cobre as duas bandeiras. E o pior: o fundo da cova E é **−2,29 m**, abaixo do corte de −1,1 m do grafo (`:194`), então **não existe waypoint dentro da cova** — o nó mais próximo da bandeira E está a **3,40 m** e 1,3 m acima dela (medido). O bot corre até a borda e para.

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.5a | mover os dois montes de areia para fora das covas | `:132` `monteAreia(-12, sz*14, 2.4)` → `monteAreia(-14, sz*19, 2.4)` | r 2,4 m | mesma função | **penetração E 1,017 → 0; B 0,466 → 0** (a de B aparece na posição nova da bandeira; medido) |
| 1.5b | bloco de coroamento de estaca no fundo da cova E | (−7, −15) | 5,0 × 1,84 × 5,0 m, topo em −0,45 | `addBox(..., MAT.concRaw, -7, -2.29, -15, {collide:false})` + 4 vergalhões saindo do topo, e `decks.push({x0:-9.5, x1:-4.5, z0:-17.5, z1:-12.5, h:-0.45})` (mecanismo do #579) | chão da bandeira −2,29 → **−0,45**; sai da lama |
| 1.5c | idem na cova B | (−13, 12) | 5,0 × 1,34 × 5,0 m, topo em −0,30 | `decks.push({x0:-15.5, x1:-10.5, z0:9.5, z1:14.5, h:-0.30})` | chão −1,64 → **−0,30** |
| 1.5d | **`slowAt` tem que ler o deck** | `:189` | — | `const slowAt = (x, z) => groundHeightAt(x, z) < -0.7;` — ou seja, **manter a versão de hoje e NÃO adotar a troca do #579 para `terreno(...)`** | `slowAt` na bandeira `true` → **`false`**; a lama continua valendo no anel de barro em volta do bloco |
| 1.5e | passarela de tábua sobre a cava E (oeste) | x −15,0…−9,5, z −15,9…−14,1 | 5,5 × 1,8 m | `decks.push({x0:-15.0, x1:-9.5, z0:-15.9, z1:-14.1, h:-0.25, h1:-0.45})` + tábuas `MAT.tabua` `collide:false` e 2 cavaletes colidíveis | rota rápida e exposta até a bandeira |
| 1.5f | passarela cava E (norte) | x −7,9…−6,1, z −12,5…−8,0 | 1,8 × 4,5 m | `decks.push({..., h:-0.45, h1:-0.20, eixo:'z'})` | 2ª rota |
| 1.5g | passarelas da cava B | (−10,5…−6,0; 11,1…12,9) e (−13,9…−12,1; 6,0…9,5) | 4,5 × 1,8 e 1,8 × 3,5 m | idem | 2 rotas |
| 1.5h | mover as bandeiras para cima dos blocos | E (−10,−14) → **(−7,−15)**; B (−10,14) → **(−13,12)**; MID fica em (9,0) | — | `:250` e `:252` | **maior linha de tiro E 59,9 → 30,7 m; B 59,1 → 39,9 m; MID 48,1 → 43,5 m (medido)**. CTF1 altura do triângulo 19,0 → **18,9 m** (teto >4,5) e distância ao próprio spawn E 19,4 m / B 25,5 m (teto ≥9) |
| 1.5i | escoramento de madeira: a cava vira **retangular escorada**, não bacia de cosseno | cava E: retângulo x −12,5…−1,5 × z −20,5…−9,5; cava B: x −18,5…−7,5 × z 6,5…17,5 | 16 painéis por cava, 2,75 × 2,4 × 0,15 m, 4 por face | um `InstBatch({bucket: 0})` (`map_corrego.js:229-247`; **`StaticBatch` não serve — cega o ORT1**) | **occluders 200 → 232 (medido)**; a bandeira deixa de ser vista de qualquer ponto do anel; 32 massas giradas (§3.3) |

A leitura de jogo resultante: quem quer a bandeira escolhe entre a **passarela** (rápida, exposta, 1,8 m de largura) e o **barro** (`slowAt`, mas coberto pelo escoramento de 2,4 m). Isso é uma decisão; "cair num buraco liso e ser metralhado da borda" não era.

---

## 2. Verticalidade  (alvo: ALT1 h90 ≥9 m, ≥1 cota andável nova)

ALT1 já passa: **h90 = 11,0 m** (medido; os prédios do entorno). O que falta não é altura de massa, é **piso**. Hoje a única laje está a 4,2 m com `collide:false` e a única rampa é decorativa.

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 2.1 | **apagar a rampa fantasma** | (9, 1,5, 2) | 3 × 0,16 × 5 m, `rz:-0.5` | remover a linha `:117` inteira | **MAP1 8 → 0.** Os 8 pontos medidos são exatamente ela: x 8,5/9,5, z 0,5…4,5, pior 1,31 m — a tábua girada varre de y≈0,8 a 2,3 m e a bandeira MID (9,0) fica no pé dela |
| 2.2 | laje sul vira piso de verdade | (0, 4,2, −8) | 18 × 0,4 × 8 m, topo **4,6 m** | `:114` passa a `{ collide: true, cast: true }` + `decks.push({x0:-9, x1:9, z0:-12, z1:-4, h:4.6})` | 1ª cota andável |
| 2.3 | laje norte espelhada | (0, 4,2, +8) | 18 × 0,4 × 8 m | mesma chamada com z=+8 + deck | simetria E/B — hoje só o lado sul tem laje, o que é vantagem de time gratuita |
| 2.4 | vão central fica aberto | x −9…9, z −4…4 | 18 × 8 m | nada — é o poço do elevador | preserva o "miolo aberto" declarado em `:109`; de cima se enxerga o eixo do duelo, por baixo se atravessa |
| 2.5 | rampa de acesso sul | x 10,8…13,2, z −22,5…−6,0 | 2,4 m de largura, corrida 16,5 m, subida 4,9 m ⇒ **0,297** = 0,95 m por passo de 3,2 m do grafo | `decks.push({x0:10.8, x1:13.2, z0:-22.5, z1:-6.0, h: terreno(12,-22.5), h1: 4.6, eixo:'z'})` + tábuas `MAT.tabua` a cada 0,8 m e cavaletes de 0,14 m colidíveis | fica **abaixo** do teto de 1,0 m por aresta que o #579 documentou; sem isso a torre vira andar só do jogador |
| 2.6 | patamar de ligação | x 9,0…13,2, z −7,2…−4,8 | 4,2 × 2,4 m a 4,6 m | `decks.push({..., h:4.6})` | liga a rampa à laje |
| 2.7 | rampa + patamar norte | espelho em z +22,5…+6,0 | idem | idem | 2ª cota |
| 2.8 | guarda-corpo (MAP6) | perímetro das duas lajes | 1,0 m de altura, 0,12 m de espessura, `MAT.metal` | `addBox` colidível em 4 trechos por laje: (0,∓12), (0,∓4), (∓9→−9/9, ∓8) | queda de 4,6 m ≥ QUEDA_ANDAR (2,0 m): sem isso MAP6 sai de 0 para ~40 bordas. Abrir **2 seteiras de 1,2 m por laje** com peitoril de 1,0 m (peitoril colidível já conta como guarda) |
| 2.9 | **declarar os níveis** | — | — | no retorno (`:246-256`): `levels: [{nome:'laje sul', x0:-9, x1:9, z0:-12, z1:-4, dePartida:'E'}, {nome:'laje norte', x0:-9, x1:9, z0:4, z1:12, dePartida:'B'}]` | liga o `travessia` do `map-check.mjs:445-469`: passa a exigir células alcançadas a pé **e** A* do spawn até o nível. **O #579 não declara nenhum nível** |
| 2.10 | nós de grafo no deck | — | — | **reusar tal e qual** o bloco do #579: grade de deck a 1,4 m, `blocQuota` na altura, `segClear` interpolando y, teto de 1,0 m de desnível por aresta e poda do maior componente | sem isso os bots não sobem |

---

## 3. Visual e escala  (alvo: SUP2 ≤6%, SUP1 ≤40%, ORT1 ≥15% e ≥20 ângulos, UV 128 px/m)

Medido hoje: 63 materiais, **26 sem `map` (41,3%)**; área com textura 4.766 m², **sem textura 14.639 m² (75,4%)**. Os 3 primeiros infratores respondem por 84% de tudo.

### 3.1 — SUP2 / SUP1: dar `map` aos materiais, na ordem da área medida

| # | material (`:50-57`) | área sem textura medida | malhas | como | SUP2 acumulado |
|---|---|---|---|---|---|
| 3.1a | `MAT.janela` `#35404e` | **6.758 m²** | 63 | **eliminar.** `building()` (`:209`) passa a ser **uma** caixa por prédio com `fachadaTex()`: canvas 256², concreto + grade de janela + caixa d'água no topo, `t.anisotropy = 8`, `t.wrapS/T = RepeatWrapping` | 75,4% → 40,6%; **−63 draw calls** |
| 3.1b | `MAT.predio` `#a7a29a` | **5.542 m²** | 14 | mesma `fachadaTex()` | → 12,1% |
| 3.1c | `MAT.tapume` `#2f5fa8` | **1.415 m²** | 4 | `tapumeTex()`: canvas 256×128, compensado azul institucional com juntas verticais a cada 1,22 m e respingo de tinta; `anisotropy = 8` | → **4,8% (já verde)** |
| 3.1d | `MAT.concRaw` | 431 m² | 9 | `lam({ map: T.concrete })` | → 2,6% |
| 3.1e | `MAT.tabua` | 150 m² | 10 | `lam({ map: T.crate })` — madeira de caixote é tábua de obra | → 1,8% |
| 3.1f | `MAT.areia` | 146 m² | 4 | `lam({ map: T.dirt, color: 0xcbb27a })` (map × cor) | → 1,1% |
| 3.1g | `MAT.metal` | 69 m² | 37 | `lam({ map: T.metal })` — a chave existe e não estava sendo usada | → 0,8% |
| 3.1h | `MAT.lona` | 45 m² | 1 | `lam({ map: T.tent, transparent: true, opacity: 0.7, side: DoubleSide })` | → 0,5% |
| 3.1i | `MAT.rebar` + `RUBB[0..2]` | 46 m² | 19 | `T.metal` com `color: 0x8a6a3a` / `T.concrete` e `T.dirt` com cor | → **≤0,3%** |

**SUP2 75,4% → ≤0,3% (teto 6%). SUP1 26/63 = 41,3% → 13 de ~63 = 20,6% (teto 40%).** Não sobra material novo sem `map`: as duas texturas de canvas (`fachadaTex`, `tapumeTex`) e as duas existentes (`signTex :19`, `hazardTex :33`) todas têm `map`.

### 3.2 — UV em metros e anisotropia

| # | intervenção | onde | como | número que move |
|---|---|---|---|---|
| 3.2a | `addBox` passa a usar geometria com AO e UV em metros | `:69-76` | `const geo = aoBoxGeo(w, h, d, { low: LOWQ }); const m = new THREE.Mesh(geo, aoMat(mat));` com `aoMat = aoMatFactory()` — padrão literal de `map_quebrada.js:77-87`. **`aoMat` tem que ser chamado logo depois do `aoBoxGeo`**, é ele que consome o handoff e escala a UV (`vao.js:207-212`) | UV vai para `ALVO_PXM = 128` px/m em todas as ~190 caixas; ganha AO de contato de brinde |
| 3.2b | saia de contato | idem | `const SKIRT = new ContactSkirt({ low: LOWQ })`, `SKIRT.add(x, y, z, w, d, ry)` quando `onGround(y, h)`, e `SKIRT.build(root)` no fim | 1 draw call para o mapa inteiro |
| 3.2c | anisotropia nas duas texturas de canvas que já existem | `signTex :29`, `hazardTex :37` | acrescentar `t.anisotropy = 8` (padrão `map_upa.js:37`, `map_penitenciaria.js:43`) | TEXEL4: superfície horizontal com `anisotropy < ANISO_MIN` reprova |

### 3.3 — ORT1: 0,0% de massa girada e 1 ângulo → ≥15% e ≥20 ângulos

A régua conta como massa toda malha visível com caixa-mundo ≥ 0,5 m de altura, e o ângulo é `|ry mod 90°|` dobrado em 45° e **arredondado ao grau** (`mapa-novo-gate.mjs:230-235`, `:379-385`). Hoje: **189 massas, 0 giradas, 1 ângulo**. Depois da §3.1a saem 63 massas (as faixas de janela) e entram ~83 minhas ⇒ ~209 massas ⇒ piso de **32 massas giradas**.

| # | conjunto | quantas massas | ângulos (graus, folded = exatamente o desvio) | número que move |
|---|---|---|---|---|
| 3.3a | escoramento da cava E — 4 faces × 4 painéis, `ry = face·90° + desvio` | 16 | 4, 6, 8, 9, 11, 13, 14, 16, 18, 19, 21, 23, 26, 29, 33, 38 | 16 giradas, 16 ângulos |
| 3.3b | escoramento da cava B | 16 | 5, 7, 10, 12, 15, 17, 20, 22, 24, 25, 27, 28, 31, 35, 41, 44 | 16 giradas, +16 ângulos ⇒ **32 distintos** |
| 3.3c | pilhas de cano `canos()` `:129` — a pilha inteira ganha `ry` | 20 (5 cilindros × 4 pilhas) | 13, 26, 33, 44 (reaproveita) | +20 giradas |
| 3.3d | barracões, contêineres, caminhões-betoneira (§1.3) | 6 | 6, 9, 19, 24, 31, 37 | +6 |
| | **total** | **58 de ~209** | **32 ângulos distintos** | **ORT1 0,0% / 1 → 27,8% / 32 (pisos 15% e 20)** |

Com o #579 no mesmo galho o denominador sobe para ~328 massas: 58/328 = 17,7%, ainda acima do piso. **Re-medir com `node tools/eval/mapa-novo-gate.mjs` depois do merge** — não é para chutar.

O que **não** entra nessa conta de propósito: girar os 4 cones de `monteAreia` e os 8 cones de trânsito. Cone girado em Y é a mesma imagem — é o "defeito que a régua premia" descrito no cabeçalho do próprio portão (`mapa-novo-gate.mjs:26-29`). Todas as 58 rotações acima mudam a silhueta.

---

## 4. Brasilidade  (o que faz alguém reconhecer o lugar)

| # | item | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 4.1 | **céu** — hoje não existe | — | — | trocar `:90` por `setMapSky(scene, T, '/img/textures/sky_sp.webp', 0xd6dad9)` e `scene.fog = new THREE.Fog(0xd6dad9, 70, 160)`; acrescentar `'obras_prefeitura'` em `look-check.mjs:48 MAPAS` | `scene.userData.skyUrl` deixa de ser `undefined` (falha dura em `look-check.mjs:107`); **ΔE76 névoa↔horizonte 15,7 → 0,0** (teto 8). SP encoberto é o céu certo para obra de prefeitura parada |
| 4.2 | **placa de obra oficial** (a de verba e prazo) | (11,5; 26·sz), virada para a saída leste do tapume | painel 2,4 × 1,6 m em 2 postes de 3,4 m | `signTex` novo com o gabarito real: `OBRA: REQUALIFICAÇÃO DO CANTEIRO CENTRAL` / `VALOR: R$ 48.212.900,00` / `PRAZO: 18 MESES` / `TÉRMINO PREVISTO: 12/03/2019` / `RECURSO: EMENDA PARLAMENTAR`. Faixa azul `#1a4d8f` + amarelo `#ffd23f` como o letreiro do portão (`:107`) | +2 props em q2,0 e q2,3; o prazo vencido há 7 anos é a piada que o mapa já tenta contar em `:151` sem o objeto certo |
| 4.3 | **faixa de sindicato** amarrada no tapume | (−8; 26,15·sz), 0,10 m à frente da face de P1 | plano 6,0 × 0,9 m | `T.signSindicato` (chave já existe), `MeshLambertMaterial`, sem colisor | zero custo de colisão, leitura imediata de obra parada com pendência trabalhista |
| 4.4 | **rádio do peão** no barracão | (−21; 1,6; 28·sz) | raio 16 m | acrescentar em `sound.loops` (`:247`): `{src: AMB_LOOPS.funk, pos:[-21, 1.6, sz*28], radius:16, vol:.26}` | marco sonoro: o som diz de que lado do mapa você está. `AMB_LOOPS.obra` e `.cidade` continuam globais |
| 4.5 | **kombi do mestre de obras** | (−19,5; ±32) | alt. 1,9 m, `ry` 76° | `placeProp('kombi', {targetH:1.9, ry})` | q0,0 / q0,3 |
| 4.6 | **caixa d'água do canteiro sobre cavalete** | (−25; ±31) | alt. 2,2 m sobre estrutura de 1,2 m | `placeProp('caixa_dagua_azul', {targetH:2.2, ry:0.52})` + cavalete `MAT.tabua` | q0,0 / q0,3 |
| 4.7 | **caçamba de entulho** | (−24; ±22) | alt. 1,7 m, `ry` 22° | `placeProp('dumpster', {targetH:1.7, ry})` | q0,0 / q0,3 |
| 4.8 | **barraca do almoço** | (24; ±12) | alt. 2,4 m, `ry` 13° | `placeProp('tent', {targetH:2.4, ry})` | q3,1 / q3,2 |
| 4.9 | **betoneira nº 2 e nº 3** | (−11; −19,5) e (−11; 19,5) | base 1,0 × 0,7 × 1,4 m + tambor cônico | repetir o bloco procedural de `:147` com `ry` 21° e 35° | q1,0 / q1,3 + 2 massas giradas |
| 4.10 | **pixo no tapume** | painéis novos e perímetro | — | `grafitar` (`:218-225`) já roda: subir `cobre: 0.05` → `0.09` e manter a banda `y0:0.4, y1:2.3` — tapume de obra em SP é a superfície pichada por definição | usa `D_TAG`/`T.posterFiles` que já estão declarados |
| 4.11 | **os avisos ficam** | `:151-152` | — | `A VERBA ACABOU`, `HOMEM (NÃO) TRABALHANDO`, `DESVIO / DE DINHEIRO PÚBLICO` já são o tom certo; só passam a ter `anisotropy` (§3.2c) | — |

---

## 5. Ordem de execução e custo

| passo | o que | fecha | risco |
|---|---|---|---|
| **1** | §1.1 — `occMesh` no `prop()`, malhas soltas registradas, `occBox`+`proxyGLB` nos GLB pesados. **Inclui os 2 `occluders.push(glb)` do #579** | occluders 32 → 188; exposição E 88,5 → 76,1%, B 89,1 → 66,7%; a bala passa a bater no guindaste, no caminhão, nos canos, nos montes e na laje | custo de raycast por tiro sobe; teto de precedente é `fy_lajes` (971 occluders), obras fica em ~190 + procurações. Medir `p95` no browser antes de seguir |
| **2** | §2.1–2.10 — apagar a rampa fantasma, subir as duas lajes, rampas de 16,5 m, guarda-corpo, `levels` | **MAP1 8 → 0**; 2 cotas andáveis declaradas e verificadas pelo `travessia` | MAP6 sai de 0 bordas para ~40 se o guarda-corpo do 2.8 for esquecido. Fazer 2.8 no mesmo commit que 2.2 |
| **3** | §1.2 + §1.3 — tapume do canteiro e barracão/contêiner/caminhão | **exposição E 4,6% / B 4,2%**; maior visada 73,6 → 65,7 m | MAP2B cai para folga 1,80 m / 48,9 m² (medido, verde). Se alguém mexer nos slots de spawn depois disso, re-medir |
| **4** | §1.5 — areia fora, blocos de coroamento, `slowAt` lendo o deck, passarelas, escoramento, bandeiras em (−7,−15) e (−13,12) | penetração 1,017 → 0; chão −1,58 → −0,45 e −0,79 → −0,30; `slowAt` na bandeira `true` → `false`; nó do grafo a 3,40 m → dentro; linha de tiro 59,9 → 30,7 m e 59,1 → 39,9 m | contradiz o `slowAt` do #579 — resolver o conflito no merge, não depois |
| **5** | §3.1 + §3.2 — `fachadaTex`/`tapumeTex`, `T.metal`/`T.crate`/`T.concrete`/`T.dirt`/`T.tent`, `aoBoxGeo`+`aoMat`+`ContactSkirt`, `anisotropy` | **SUP2 75,4 → ≤0,3%; SUP1 41,3 → 20,6%; −63 draw calls**; UV a 128 px/m | `aoMat` tem que vir imediatamente depois de `aoBoxGeo` senão a UV não escala e o texel fica errado sem avisar |
| **6** | §3.3 + §1.4 + §4 — rotações, os 12 props de quadrante em um `PropBatch`, céu, placa de obra, faixa, rádio | **ORT1 0,0%/1 → 27,8%/32**; **MAP5 pior esp 99 → ≤7,0 m**; ΔE76 15,7 → 0,0 | o denominador do ORT1 muda com o #579; re-rodar `mapa-novo-gate.mjs` em vez de confiar na conta |

**Custo medido hoje:** 313 malhas / 13.232 triângulos no `root` (sem GLB, em node). Saldo da receita: **−63** (consolidação da fachada) **+ ~90** malhas novas, das quais 32 de escoramento e ~40 de tábua de rampa entram por `InstBatch` (2 draw calls) e 12 GLB por `PropBatch` (1 bucket). Saldo líquido ≈ **+60 malhas / +2 mil triângulos**, longe dos 2.038 draw calls do `fy_mansao` e dos 8,3 M de triângulos do `fy_corrego`.

**Armas:** nenhuma removida. Os 14 racks de spawn (`:178`) e os 2 do centro (`:179`) ficam onde estão — o tapume da §1.2 está a 5 m à frente dos racks e não os toca.

---

## 6. O que eu NÃO consegui decidir sem olhar figura

1. **Cor e material do tapume.** Hoje é azul institucional chapado (`#2f5fa8`). Um canteiro de prefeitura em SP tem tanto o tapume azul de compensado novo quanto o de madeira crua cinza já podre. Escolhi o azul com juntas + pixo porque é o que o mapa já tenta ser, mas essa é decisão de direção de arte e muda a leitura da arena inteira. Precisa de captura no browser com o céu novo por cima.
2. **Altura do escoramento da cava: 2,4 m ou 1,6 m.** Com 2,4 m ninguém de fora vê o carregador da bandeira — bom para quem defende, e pode virar campismo. Com 1,6 m a bandeira fica visível como isca e a cava vira armadilha em vez de fortaleza. Medi só a versão de 2,4 m (linha de tiro E 30,7 m). Qual das duas o dono quer é jogo, não número.
3. **Se as duas lajes a 4,6 m deixam o eixo do duelo alto demais.** O vão central de 18 × 8 m fica aberto de propósito, mas com laje dos dois lados o combate pode migrar todo para cima e o térreo esvaziar. Isso só aparece em partida 5×5 gravada; nenhuma das réguas de hoje mede "onde as mortes acontecem".
4. **Onde ex
