<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

# atacadao_treta — recibo

## Aplicado

| item da receita | arquivo:linha | o que entrou |
|---|---|---|
| §1a-1 caminhão baú | `map_atacadao.js:320-322` | `volume('vw_9150')` em (−16,0 · −22,4), 5,2×2,2×**3,2** m, `ry ANG[0]`; GLB no lote (`PropBatch`) e caixa texturizada de reserva — colisor e occluder existem nos dois casos. Placa "DISTRIBUIDORA TRETA" no flanco |
| §1a-2 ônibus de sacoleiro | `:323` | `volume('onibus_urbano')` em (−4,8 · −22,4), 8,4×2,2×3,2, `−ANG[3]`; id novo no `ATACADAO_PROPS:17` |
| §1a-3 torre de fardo de arroz | `:324-325` | palete 5,2×0,2×2,2 (`collide:false`) + corpo 4,8×2,2×2,0 com `T.crate` + 4 sacos soltos 1,2×0,55×0,9 em `InstBatch`, `ANG[2]` |
| §1a-4 2º baú | `:326` | `volume('vw_9150')` em (16,0 · −22,4), `−ANG[1]`, mesmo lote do #1 |
| §1a-5/6 engradado de cerveja | `:328-329` | pilha 1,8×2,4×2,0 com `T.crate2` (caixa CORREIOS) em (±24,0 · −22,4) + 4 engradados soltos no topo. **±24,4 da receita ficaria dentro do muro (25,2 m) e fora do lattice** |
| §1a **abre o pátio de carga** | `:273-277` | as 3 fileiras de vaga viraram **2** (`z = ZF−8` e `ZF−24`): `z=−22` era o único trecho de 36 m de asfalto sem massa acima do olho |
| §1b-7 contêiner de vasilhame | `:332` | `volume('junkyard_container')` em (−24,0 · −30,4), 2,2×6,4×2,6, `ANG[1]` |
| §1b-8 corral coberto de carrinho | `:336-339` | 4 postes 0,14×2,6 + telha 2,4×6,8 a 2,6 m + 6 `shopping_cart` no `PropBatch`, `−ANG[4]` |
| §1b-9 torre de palete envelopado | `:333` | pilha 2,0×2,4×6,0 `T.crate2` + 4 paletes soltos, `ANG[8]` |
| §1b-10 quiosque de pastel | `:334-335` | `volume('quiosque')` em (24,0 · −12,8) + `guarda_sol` no lote, `−ANG[11]` |
| §1b-11/12 ilha de oferta coberta | `:342-354` | 4 postes + toldo `T.awning` 4,8×2,4 a 2,6 m + 2 pilhas de 2,2 m + cartaz à mão "LEVE 3 PAGUE 2" / "ARROZ 5KG R$ 24,90" pendurado na borda sul |
| §1b-13 totem de preço | `:355-360` | 2 postes + painel 4,0×2,4 a y=1,8 (colisor `minY=1,8` não toca quem anda) + placa "OFERTA DO DIA", `ANG[3]` |
| §1c-14 guarita do segurança | `:362-366` | guarita 2,4×2,5×2,4 `T.concrete` + telha + placa "REVISTA NA SAÍDA" em (−20,8 · −35,2), `ANG[5]` |
| §1c-15 gaiola de botijão | `:367-370` | 3 telas de 2,2 m + 6 `botijao_gas` no lote em (20,8 · −35,2), `−ANG[7]` |
| §1d-16/18 carrinho largado torto | `:371-375` | 3 `shopping_cart` no lote + colisor, `ANG[18]/ANG[21]/−ANG[23]` |
| §1d-19/20 poste de pátio | `:376-393` | **13 mastros de 9,6 m** (poste + braço + luminária, tudo em `InstBatch`) em z=−19,2/−25,6/−8,0 |
| §1d-21 pilha de pneu | `:405` | `volume('pilha_pneus')` em (9,6 · −32,0), `ANG[13]` |
| §1d-22 caçamba de papelão | `:406` | `volume('dumpster')` em (4,8 · −19,2), `−ANG[9]` |
| §1d-23/26 4 motos na vaga | `:407-410` | `moto_cg` no lote + colisor em (19,2/22,4 × −35,2/−28,8) |
| §1e-27/42 torres de fardo | `:412-421` | **18 torres** de 4 fardos 1,6×0,55×1,6 (`T.crate`), giro próprio por camada, 1 draw call |
| §1f bandeiras | `:583-589` | E (−8,−30)→**(−11,2 · −26,4)**; B (−8,24)→**(−8 · 18)**; MID (10,−8)→**(10 · −2)** |
| §3a `MAT.metal` | `:83` | `lam(tex('metal'))` — resolve laje, vigas e pórticos |
| §3a `MAT.prat` | `:84` | `lam(tex('crate2'))` — é o fallback de gôndola, e é o que a régua mede (GLB não carrega no portão) |
| §3a `MAT.predio` | `:87` | `lam(tex('concreteDark'))` |
| §3a `MAT.janela` | `:87` + `:34-47` | `janelaTex()`: canvas de vidraça semeado por LCG (nunca `Math.random`) |
| §3a janela vira PLANO | `:454-462` | era **caixa de 6 faces em volta do prédio** (74% enterrado, 4.827 m²); agora é plano 5,6×1,1 só na face +z |
| §3a laje vira PLANO | `:172-182` | caixa 52×0,4×39 (4.129 m², 5 faces invisíveis) → 7 faixas de plano, 3 delas **telha translúcida** (lanternim) |
| §3a claraboia falsa | `:172-182` | os 507 m² de plano translúcido **debaixo de laje opaca** saíram; a luz entra pelas faixas translúcidas de verdade |
| §3a vitrine vira painel de oferta | `:194-207` | ~2/3 da faixa acima de 2,6 m vira painel opaco com `T.posters[i]` (é array) e 1/3 vidraça — **os dois em `occluders` e com colisor** |
| §3b entorno/skyline | `:454-465` | 9 prédios + 45 planos de janela girados em `ANG[0..8]` |
| §3b casario | `:441-448` | `prop()` não tinha fallback e o casario **sumia** sem GLB: entrou caixa 6,2×6×6,2 `T.concrete`, 13 massas giradas |
| §3b fila de caixa | `:230-238` | 4 esteiras e 3 carrinhos girados; gôndola, rack e frente de caixa **ficam de esquadro** |
| §4-50 céu | `:164` | `setMapSky(scene, T, '/img/textures/sky_havan.webp', 0xdfe6ec)` no lugar do `Color` chapado |
| §4-51 cartaz à mão | `:49-69` (`signTex(..., mao)`) e `:352`,`:428`,`:433` | moldura de traço irregular, fonte de mão e texto fora do prumo |
| §4-52/53 fardo e engradado | `:300-303` | `T.crate` (SEDEX) e `T.crate2` (CORREIOS) em `InstBatch` |
| §4-54 fila de carrinho no corral | `:339` | 6 `shopping_cart` |
| §4-55 segurança na porta | `:362-366` | guarita + "REVISTA NA SAÍDA" |
| §4-56 carrinho largado torto | `:371-375` | `ry` 22°/24°/35° |
| §4-59 painel de TV | — | já existia em `:243`; mantido |
| **extra: caixa d'água elevada** | `:395-402` | 4 pernas + tanque + letreiro sobre a laje — silhueta de galpão brasileiro, e 5 massas acima de 9 m (segura o ALT1) |
| **extra: contrato de occluder (MAP7)** | `:146` | `occlude()` = `o.traverse(m => { if (m.isMesh) occluders.push(m); })`. Os dois `occluders.push(o)` de **Group** em `:65`/`:66` não paravam bala nem LOS (`intersectObjects(lista, false)`) |
| **extra: verga entra em `occluders`** | `:205` | o tiro atravessava o concreto sobre a porta; segue sem colisor (o footprint é o vão) |
| **extra: colisor girado** | `:104-119` | `colRot` com `ry/cx/cz/hx/hz` para o `_collideRot` do jogo; giro múltiplo de 90° sai como AABB **trocada** — o antigo `col` não trocava, e o colisor de todo prop de 90° (`painel_tvs`, `gondola_eletro`, `arara_roupas`) estava cruzado |
| **extra: escala dos veículos** | `:5`,`:258-271`,`:466-472` | `import { CAR_DIM } from './map_havan.js'` (ficha de fábrica, UMA fonte). `targetH 1,6` chapado punha a Kombi 18% baixa e o colisor de TODOS parava em 1,5 m — abaixo do olho de 1,62 m |
| **extra: esteira sobe no balcão** | `:230-234` | solta em `ZF+5,4` ela era caixa de 1,06 m sem colisor sobre chão andável: o MAP1 acusa isso (e acusou, quando a girei) |
| **extra: lote** | `:100-101`,`:475-484` | `PropBatch` + `InstBatch`; as `InstancedMesh` novas entram em `occluders` (idioma de `map_campomorro.js:636-643`) |

## Medido (sonda própria, antes → depois)

Sonda em `/tmp/probe_atacadao.mjs` sobre `tools/eval/harness.mjs` (`bootGame('atacadao_treta', {ctf:true, seed:12345})`), com as MESMAS constantes de `map-check.mjs`/`mapa-novo-gate.mjs` (`STEP_G .25`, `R_BODY .38`, `DEGRAU .30`, `OLHO 1.62`, `D_FORA 25`, `PASSO_OBS 2.0`, `QUAD_N 4`, `SEP_ROTA 6.0`, `ALT_MASSA_MIN .5`, `FORA_DA_GRADE 2°`). **O "antes" foi medido com a mesma sonda no arquivo intacto e bate com `/tmp/map_check_all.json` em todas as linhas comuns** (45,88%/7,8%, 14,05 m, 0,13×, 5,00 m, tri 18,0, occ 65, medianaProp 3,845, folga 1,5, área 52,1). Não rodei `map-check.mjs`.

| métrica | antes | depois | teto/piso |
|---|---|---|---|
| **MAP2 exposição E** | **45,88%** | **10,62→10,88%** | ↓ |
| **MAP2 exposição B** | 7,80% | **4,04%** | ↓ |
| assimetria E/B | **5,88×** | **2,69×** | — |
| maior visada (E) | 70,5 m | 68,2 m | — |
| maior visada (B) | 68,5 m | 68,3 m | — |
| **MAP5 pior espaçamento** | **14,05 m** (q3,0) | **5,27 m** (q1,0) | ≤7 |
| **MAP5 pior razão prop** | **0,13×** | **0,41×** | ≥0,35 |
| MAP5 pior razão waypoint | 0,78× | 0,83× | ≥0,35 |
| MAP5 mediana de prop | 3,845 | 8,86 | — |
| quadrantes com espaçamento `99` | 0 | 0 | 0 |
| **CTF1 menor dist. bandeira↔spawn** | **5,00 m** (B) | **10,96 m** (E) | ≥9 |
| CTF1 altura do triângulo | 18,0 m | **19,39 m** | >4,5 |
| CTF1 maior linha de tiro E / MID / B | 62,9 / 45,6 / 64,4 m | 58,3 / 34,2 / 37,8 m | — |
| CTF2 mínimo de rotas separadas | 2 | **2** (`2·2·2·2·2·4`) | ≥2 |
| MAP1 corpo dentro de sólido | 0 | **0** | 0 |
| MAP2B pior folga de parede | 1,50 m | **1,50 m** | ≥1,2 |
| MAP2B pior área contígua | 52,1 m² | **52,1 m²** | ≥40 |
| **MAP7 occluder sem geometria (mundo)** | 0 medido em node, mas **2 sítios de FONTE classe `grupo`** (`:65`,`:66`) | **0 e 0** (rodei a mesma regex do `map-check.mjs:186-266`) | 0 |
| occluders | 65 | **156** | — |
| colisores | 143 | 223 | — |
| **ORT1 massa girada** | **0,0%** | **55,0%** (221/402) | ≥15% |
| **ORT1 ângulos distintos** | **1** | **24** | ≥20 |
| **ALT1 h90** | 10,5 m | **9,6 m** | ≥9 |
| ALT1 massas acima de 9 m | 27 | 49 | — |
| **SUP2 área sem textura** | **60,8%** (14.932 de 24.561 m²) | **2,7%** (605 de 22.2k m²) | ≤6% |
| **SUP1 materiais sem `map`** | 30,5% (32/105) | **21,6%** | ≤40% |
| massas acima do olho (1,62 m) | 191 | 333 | — |
| malhas | 362 | 493 | — |
| InstancedMesh | 0 | **31** | — |
| triângulos | 5.112 | 9.676 | — |
| nós de waypoint | 283 | 266 | — |

Depois de trocar a tabela local por `import { CAR_DIM }`, a sonda deu resultado **idêntico** (censo, exposição, 223 colisores, 156 occluders, 266 waypoints). Os 6 modelos conferidos contra a tabela exportada: kombi 4,51/1,94 · saveiro 4,24/1,47 · opala 4,60/1,39 · fiat_uno 3,72/1,44 · chevette 4,14/1,36 · brasilia_vw 4,03/1,40 (+ fusca da rua 4,03/1,50) — todas idênticas.

`node --check public/js/map_atacadao.js` verde depois de cada bloco e no fim. Nada commitado.

### A régua mordeu duas vezes no meio do caminho (registro, porque é o que ensina)
1. **CTF2 caiu de 2 para 1** em `E→MID`, `E→B`, `B→E` e `B→MID` na primeira medição do bloco do pátio. Causa medida: massa em *midway* do lattice mata o NÓ vizinho quando `ax + 0,5 ≥ 1,6` (a inflação do `blocked` do grafo). O colisor das torres estava em `hx = 0,9` com giros de até 41°; baixei para `hx = 0,8` (o fardo real, 1,6 m) e limitei o giro das torres a ≤17°. Voltou a 2 e a regra está escrita em `:289-296`.
2. **MAP1 foi de 0 para 1** (penetração 1,06 m em (6,5 · 0)) quando girei a esteira do caixa: solta em `ZF+5,4` ela é uma caixa de 1,06 m **sem colisor sobre chão andável** — defeito latente que o giro só expôs. Subiu para cima do balcão (`z = ZF+4`, onde o chão não é andável) e voltou a 0.

## Não aplicado (e por quê)

| item | por quê |
|---|---|
| §2-43 `WALL_H 8→11` | Passo 2 da receita, fora do meu escopo, e é o principal conflito de coordenada com o #582. Sem ele o ALT1 ia a h90 8,0 m com a densificação — resolvi com 13 mastros de 9,6 m e a caixa d'água (h90 9,6 m medido). |
| §2-44 racks de 9,2 m | Mesmo passo, e os racks x=±15 são exatamente o que o #582 reescreve (ele usa ±11,2/±17,6). A receita manda "aplique só a altura nos racks dele". |
| §2-45/49 mezanino, escada, guarda-corpo, parede cega | **Vetado nesta rodada** pelo contexto compartilhado: cria cota andável e exige `groundHeightAt` multinível + `stairs`/`levels`. `groundHeightAt` segue `() => 0` (`:558`). É o que sustenta os 62,3 m de visada prometidos pela receita; sem ele parei em 68,2 m. |
| §3c laje `cast:true` | O sol atravessar a laje é real, mas consertar sozinho deixa o salão no escuro: a luminária industrial pendurada é **exatamente o que o #582 faz** (15 luminárias, 9 com luz local) e a receita manda não duplicar. Deixei `cast:false` e as 3 faixas de telha translúcida dão a leitura de luz de dia. |
| §4-58 PA do alto-falante | Exige asset novo (`public/audio/amb/pa-atacadao.mp3`) + chave `pa` em `AMB_LOOPS` (`soundscape.js:6`) — dois arquivos que não são meus, e o `Main` confirmou que o pacote de áudio é privado e o `audio:check` já reprova. Mantive `hum` + `cidade` (não segui o #582, que deixa o mapa mudo). Patch pronto: chave `pa: '/audio/amb/pa-atacadao.mp3'` no `AMB_LOOPS` e `{src:AMB_LOOPS.pa,pos:[0,6,4],radius:40,vol:.15}` na lista de `sound.loops` de `:577`. |
| §3a domo de claraboia | A laje é opaca e ninguém passa dos 8 m: domo em cima dela é 6 draw calls invisíveis. Troquei por 3 faixas de telha translúcida, que é como galpão de atacado se ilumina e é visível de dentro (conferido em figura). |
| MAP4 (`fracSemMalha`) | **Não medi** — não tenho o número. Estruturalmente: todo occluder deste arquivo é a própria malha visível (`addBox`/`massa` devolvem a malha; `occlude()` empurra só `isMesh`; o lote empurra a `InstancedMesh`). Nenhuma caixa de procuração nova entrou, e os colisores de `colRot` não são occluders. |

### Conflitos de coordenada com o PR #582 (draft)
| o que | conflito | o que fiz |
|---|---|---|
| `ZF −6 → −12` | joga meus itens 11/12 de `z=−9,6` para `z=−16,0` e **engole** o item 13 | Concentrei massa no **pátio e na fachada**, que é onde ele não mexe. Itens 11/12 já não estão em ±16 (ver abaixo); se `ZF` andar, é mover os dois `z=−9,6` de `:342-354` para `−16,0`. |
| itens 11/12 em x=±16 | a ilha de 8,4 m entrava no vão de porta `[−15,−9]`/`[9,15]` e estrangulava a rota do CTF2 | **Mudei para x=∓17,6 (midway) e largura 4,8** — a coordenada da receita era incompatível com o próprio CTF2 dela. Registrado em `:342-343`. |
| item 13 em (−1,6 · −12,8) | cai no corredor central do CTF2 (o vão `x∈[−2,2]` que `:190` libera de propósito) e vira parede com `ZF=−12` | Movi o totem para **(−6,4 · −19,2)**, na ilha central do estacionamento. `:355-356`. |
| itens 5/6 em ±24,4 | 24,4 + metade da pilha entra no muro lateral (25,2 m) e **não está no lattice** da própria receita | **±24,0**. `:328-329`. |
| item 7/8/10 em ±24,4 | idem | **±24,0**. `:332-334`. |
| item 19/20 (2 postes de 6,0 m) | 2 postes de 6 m não seguram o h90 com ~200 massas baixas novas | **13 mastros de 9,6 m + caixa d'água** (5 massas). `:376-402`. |
| lava-rápido dele em (−22,0 · −37,4) | colide com minha guarita | Minha guarita está em **(−20,8 · −35,2)**; se o lava-rápido entrar, a receita manda mover para (−20,8 · −29,0) — basta trocar o `z` em `:363-366`. |
| MID → praça de caixas (−1,6 · −1,6) | ele mexe, eu cedo | Deixei MID em **(10 · −2)** (31,0 m do spawn mais perto). Se o #582 entrar, é trocar 1 linha em `:585`. |
| B flag → (0 · 25,6) | ele mexe, eu cedo | Deixei B em **(−8 · 18)** (11,0 m). Se ele entrar, trocar `:586`. A bandeira **E** (`:584`) é a única que ele não conserta e é a que eu preciso que sobreviva ao merge. |
| racks x=±15 | ele usa ±11,2/±17,6 | Não toquei nos racks. **Minhas torres em x=±12,8 e ±19,2 batem de frente com os racks dele** — se o #582 entrar, essas 4 linhas de `:412-421` saem ou vão para ±9,6/±22,4. |

## Pedido ao Main (arquivo compartilhado)
1. **`CAR_DIM` — já resolvido nesta rodada.** O Main exportou (`map_havan.js:50`); troquei a tabela local pelo import (`:5`) e confirmei que as 6 medidas ficaram idênticas e que a sonda não se moveu.
2. **`soundscape.js` + `public/audio/amb/pa-atacadao.mp3`** — item 58, fora desta rodada por decisão do Main (áudio privado). Patch de 2 linhas na tabela acima.
3. **Texto da dívida do MAP7** — o comentário de `tools/eval/map-check.mjs:190-196` lista `map_atacadao.js:65 e :66` como já consertados na rodada de 13/09, e os dois `occluders.push(<Group>)` ainda estavam no arquivo quando o abri (teto ZERO ⇒ o mapa reprovava). Agora estão consertados de verdade e a varredura de fonte acha 0 sítio; é só o texto da dívida que ficou descrevendo o que não tinha acontecido.

## O que exige figura
1. **Qual fachada é a boa** (pergunta 1 da §6, e ela continua aberta): eu pus vitrine coberta de painel de oferta (que também tampa o vazamento de tiro pelo vidro sem colisor); o #582 põe listra de ACM vermelha/amarela/azul. Nenhuma régua separa as duas. **Conferi em figura que as duas convivem mal**: o letreiro grande "ATACADÃO DA TRETA" ficava ENGOLIDO pelos painéis (0,16 m de espessura no mesmo plano) e precisei puxá-lo para `ZF−0,22` (`:211-213`) — se o ACM do #582 entrar, esse offset tem de ser revisto junto.
2. **Escala do baú e do ônibus a 3,2 m** ao lado de Fuscas de 1,50 m (pergunta 2 da §6). Pedi 3,2 m porque a régua exige massa acima de 1,62 m com folga. Olhei em figura e **não ficou desproporcional** (a Kombi de 1,94 m no meio ajuda a escada de escalas), mas é leitura minha, não medição; 2,8 m também passa se o dono achar grande — nesse caso remeça a exposição.
3. **Quantos mastros antes de virar um bosque de postes.** São 13 de 9,6 m, e o número veio do ALT1 (percentil), não do desenho. Na primeira figura, com 17 e sem braço/luminária, eles leram como **lajotas cinza** plantadas no pátio; afinei para 0,32 m com braço e luminária e caiu para 13. Continua sendo a coisa mais repetida do pátio. Quem tiver a captura decide se 13 é bosque.
4. **A caixa d'água em `z=3,2`** está lá porque em `z=21` ela ficava exatamente na linha do beiral visto do spawn E (medi o ângulo: 11,7° contra 11,6° do beiral) e **desaparecia**. Em `z=3,2` ela aparece. É escolha de silhueta e merece olho.
5. **Cartaz à mão depende de fonte do sistema.** `signTex(..., mao)` pede `"Marker Felt", "Comic Sans MS", cursive`; em Chromium headless caiu no padrão e o efeito ficou só na moldura torta. Em máquina com as fontes o traço muda. Se a rodada quiser garantia, o caminho é desenhar a letra em path em vez de `fillText` — não fiz.

### Observação sobre figura
Fiz a verificação visual em `public/mapview.html` **antes** do aviso do Main sobre uma aba de browser por vez; a aba e o servidor estático já estavam fechados quando o aviso chegou e não reabri. 7 enquadramentos conferidos (linha de spawn E para o norte, fachada de perto, interior olhando o corredor, teto de baixo, pátio lateral, ilha de oferta oeste, corredor da loja em x=−19,2), 0 erro de console, HUD reportando `atacadao_treta loaded · 266 waypoints` — igual à sonda. Os 3 defeitos visuais que a figura pegou e que a sonda não pegaria estão consertados: letreiro engolido pelos painéis, cartaz de oferta flutuando acima do toldo e cartaz de fardo flutuando acima da pilha.
