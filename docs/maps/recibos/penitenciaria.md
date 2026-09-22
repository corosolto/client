<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

# penitenciaria — recibo

(passos 1, 2, 4, 5 e 6 da seção 5 da receita. Passo 3 — hélice de arame, postes 3,4 m, laje/guarita andável, escadas, guarda-corpo, `groundHeightAt` com `yRef` — NÃO entrou, é cota andável.)

## Aplicado
| item da receita | arquivo:linha | o que entrou |
|---|---|---|
| 3.3 `build(scene, T)` | map_penitenciaria.js:21 | assinatura passou a receber o `T` que game.js:655 já passava |
| 4.1 céu | map_penitenciaria.js:167 | `setMapSky(scene, T, '/img/textures/sky_sp.webp', 0xd6dad9)` + névoa trocada para o mesmo horizonte (#d6dad9) |
| 3.1 um material de mancha | map_penitenciaria.js:222-227 | 5 `MeshBasicMaterial` dentro do laço → 1 compartilhado com `map` + `CircleGeometry` compartilhada |
| 3.2 `map` nos 7 lisos | map_penitenciaria.js:113-133 | rust→T.metal · black→tex.darkConcrete · yellow→tex.concrete · blue→tex.steel · glass→T.metal · rubber→T.asphalt · red→T.tent, todos com fallback local (nunca nasce chapado com `T={}`) |
| 3.4 materiais novos com `map` | map_penitenciaria.js:97-101,128-132 | reboco, chapa galvanizada, azulejo do chuveirão (`tileTexture`, :77), pintura descascada, pano; helper `lam()` (:106) puxa normal/rough do mesmo canvas via `detailFor` (= o `applyAniso` da receita) |
| — UV em metros | map_penitenciaria.js:136-149 | `addBox(..., {ao:true})` monta a massa NOVA com `aoBoxGeo`+`aoMatFactory` (cache por dimensão+contato+MATERIAL); a massa antiga fica no `boxGeo` para não mexer em UV calibrada |
| 1.11 + 1.14 gaiola | map_penitenciaria.js:246-252 | colchão e 4 montantes perderam `collide:false`; chapa de topo subiu de y 1,72 para 2,15 |
| 1.12 dinamite | map_penitenciaria.js:286-295 | caixote `addBox(1.7,.65,1.8,MAT.rust,…)` como colisor E leitura; a banca subiu para y 0,65 (fica EM CIMA do caixote) |
| 1.13 occluder da viatura | map_penitenciaria.js:269-274 | `occluders.push(group)` → `group.traverse(m => { if (m.isMesh) occluders.push(m); })` |
| (não estava na receita) arma deitada | map_penitenciaria.js:485-490 | a coronha descia 0,25 m abaixo do grupo; `_assentarNoChao` (game.js:5784) erguia a arma inteira e o topo ia a 0,325 m — os 2 pontos MAP1 que a receita não conseguiu reproduzir. Arma agora DEITADA (extensão vertical 0,09 m); nenhuma mudou de (x,z) nem saiu do chão |
| 1.4/1.5 os 4 blocos | map_penitenciaria.js:312-331 | Pavilhão 4/6 (oeste) e Ala de serviço/Oficina (leste), 11 × 5,8 × 5 m em (∓19,5; ∓34), portas em pontas opostas + telhado `collide:false` |
| 1.6 pórtico da Divinéia | map_penitenciaria.js:333-341 | 11 × 6,4 × 5 m em (0; ∓34), portas trocadas de lado |
| 1.7 solários | map_penitenciaria.js:346-347 | 4 × (8 × 3,2 × 2,2) em (∓9,5; ∓11,5) |
| 1.8 chuveirão | map_penitenciaria.js:348 | 2 × (8 × 3,0 × 3,2) em (0; ∓8), material de azulejo |
| 1.9 massas de flanco | map_penitenciaria.js:349-355 | 12 anteparos 3,5 × 3,4 × 2,6 em (∓22,75; ∓5/∓25) e (∓20,25; ∓15), alternando o lado com 1,0 m de superposição |
| 1.10 taipais do corredor | map_penitenciaria.js:356-361 | 12 × (1,65 × 5,8 × 0,5) em |z| 6/16/25, lado alternado (x ∓35,275 / ∓36,675), 1,4 m de passagem |
| — grafo do corredor | map_penitenciaria.js:504-509 | 2 colunas de waypoint dedicadas (x ∓35,0 e ∓36,9, passo 2,4 m): sem elas o taipal ilhava o alley inteiro |
| 1.1/1.2/1.3 bandeiras | map_penitenciaria.js:539 | E 'PAVILHÃO 4' (−19,5; −27,5) · MID 'PÁTIO' (0,0) · B 'PAVILHÃO 6' (−19,5; +27,5) |
| 1.15 mesas de concreto | map_penitenciaria.js:384-387 | 12 (a receita pedia 10; 2 extras foram onde o MAP5 pedia), `InstBatch`, cada uma com `ry` |
| 1.16 barreiras de revista | map_penitenciaria.js:417-420 | 4 `jersey_barrier` em (−8; ∓40) e (6; ∓29), espelhadas em z |
| 1.17 carga da oficina | map_penitenciaria.js:422-426 | contêiner (27,5; ∓44) · pneus (35; ∓38) · entulho (22; ∓44), espelhados em z |
| 1.18 (ampliado) | map_penitenciaria.js:258-263 | 4 realocações de `obstaculo-centro-`: gaiola idx2 (−14,−2)→(−16,5,−4) · entulho idx3 (13,1)→(16,3) · barreira idx8 (−2,7)→(−16,5,12) · gaiola idx9 (3,−6)→(12,−8) · entulho idx7 (4,13)→(3,13). Todas em |x|≤18, |z|≤22 |
| 3.6/4.4 varais | map_penitenciaria.js:398-415 | 24 varais entre as grades (x ∓27,5, z de cela ±2), `ry` de 7° a 85°, `PropBatch` com fallback procedural instanciado (2 mastros + arame + 3 panos coloridos por instância) |
| 3.7 colchões/chapas | map_penitenciaria.js:392-398 | 16 × (1,05 × 1,95 × 0,12) encostados na fachada dos blocos, `ry` + inclinação 0,22 rad, `InstBatch({bucket:14})` |
| 3.8 mastros de varal | map_penitenciaria.js:388-391 | 16 (a receita punha nas lajes; sem cota andável foram para os antepátios, z ∓29) |
| 4.2 mural descascado | map_penitenciaria.js:448-459 | 4 painéis 12 × 3,2 m em (∓12; ∓47,4) com `T.muralEternamente` / `T.graffiti`, sem colisor e sem occluder |
| 4.3 pintura institucional | map_penitenciaria.js:462-473 | `stencilTexture()` + 4 letreiros 5,4 × 2,7 m ('PAV 4', 'PAV 6', 'OFICINA', 'RAIO 4') na fachada interna dos blocos |
| 4.5 radinho de pilha | map_penitenciaria.js:429-431, 533 | 2 `caixa_som` em (−11,−6) e (7,4) + `{src:AMB_LOOPS.funk, pos:[-11,1,-6], radius:18, vol:.18}` |
| 4.6 torre com holofote | map_penitenciaria.js:443-447 | 2 mastros 0,5 × 11 m em (−16,−16) e (16,16) + 2 refletores cada, luz do mapa intacta |
| 4.7 pátio de sol | map_penitenciaria.js:427-428 | botijão (−12,−4) + churrasqueira (−9,4) |
| 4.9 caixas d'água | map_penitenciaria.js:433-441 | 8 na cobertura dos 4 blocos (3 modelos), SEM colisor — cobertura não é andável nesta rodada e colisor inalcançável inflaria o MAP5 de graça |
| — orçamento | map_penitenciaria.js:363-368, 475-479 | `PropBatch({bucket:20})` + `InstBatch({bucket:14})`; GLB entra só na IMAGEM (a caixa procedural é sempre o colisor), e o lote instanciado entra em `occluders` malha a malha |

## Medido (sonda própria, antes → depois)

Instrumento: cópia de `tools/eval/map-check.mjs` em `/tmp/pen_check.mjs` (não escreve em `tools/eval/`). O ANTES foi medido com o MESMO instrumento, injetando `git show HEAD:public/js/map_penitenciaria.js` em `MAPS.penitenciaria.build` (`/tmp/pen_check_base.mjs`) — não é número de recorte de receita.

| métrica | antes | depois | teto/piso |
|---|---|---|---|
| MAP1 corpo dentro de sólido | **14** (pior 1,02 m) | **0** (pior 0 m) | 0 |
| MAP2 exposição E / B | **79,3% / 76,1%** | **9,8% / 9,3%** | — |
| MAP2 maior visada do spawn E / B | **97,4 / 98,5 m** | **67,9 / 66,2 m** | — |
| visada limpa global (sonda própria, olho 1,60 m, passo 2 m) | **111,6 m** ((−33,1;−45,1)→(32,9;44,9)) | **82,2 m** ((−17,1;−35,1)→(−11,1;46,9)) | — |
| MAP5 pior espaçamento | **20,60 m**, 10 quadrantes em falta | **5,70 m**, **0** em falta | ≤7 |
| MAP5 pior razão prop / wp | **0,12× / 0,73×** | **0,72× / 0,79×** | ≥0,35 |
| CTF1 altura do triângulo | **0,00 m** | **19,50 m** | >4,5 |
| CTF1 distância bandeira↔spawn (E/B) | **5,83 m** | **15,18 m** | ≥9 |
| CTF1 linha de tiro E / MID / B | **88,2 / 55,9 / 88,4 m** | **73,1 / 35,5 / 73,1 m** | — |
| CTF2 rotas separadas (mínimo) | **4** | **3** | ≥2 |
| MAP2B pior folga de parede | 3,95 m | **2,00 m** | ≥1,2 |
| MAP2B pior área contígua | 73 m² | **70,3 m²** | ≥40 |
| MAP4 occluder sem malha visível | 0 de 77 (1 pulado) | 0 de **355** (0 pulados, 188 instâncias em 72 InstancedMesh) | 0 |
| MAP7 occluder sem geometria | **1** (Group `penitenciaria-carro-policia`, escondia 12 malhas da bala) | **0** | 0 |
| MAP6 bordas altas sem guarda | 0 | 0 | 0 |
| grafo conexo (MC3 do eval:mapcontrato) | conexo | conexo (671 nós, 4.066 arestas, 0 ilhados) | 0 ilhados |
| SUP1 materiais sem `map` | **21 de 27 = 77,8%** (554 m² chapados) | **9 de 41 = 22,0%** (1,8 m²) | ≤40% |
| ORT1 massa girada / ângulos distintos | **4,4% / 9** | **17,6% / 30** | ≥15% / ≥20 |
| ALT1 h50 / h90 / hmax | 8,80 / **8,80** / 9,35 | 8,30 / **8,80** / 11,00 | h90 ≥9 |
| malhas em `root` | 1.167 | **1.346** (das quais 72 são InstancedMesh carregando 188 instâncias) | — |
| occluders / colliders | 78 / 129 | 239 / 269 | — |
| armas no chão (`pickups`) | 16 | **16** | veto do dono |
| céu declarado (`scene.userData.skyUrl`) | **null** | `/img/textures/sky_sp.webp` | — |

Réguas rodadas (nenhuma escreve artefato rastreado): `npm run eval:penitenciaria` **PEN1–PEN5 PASSA** (12 celas · 16 bancos · **4 guaritas** · 4 cercas · 12 celas transitáveis · 6 munições + 1 viatura com colisão · **10 obstáculos de centro** em |x|≤18,|z|≤22 · 8 armas no miolo · 671 nós · rota 32 passos) · `eval:ctflabels` verde (`PAVILHÃO 4 · PÁTIO · PAVILHÃO 6`, únicos e não-Brasília) · `eval:ctfhud` 5/5 · `eval:ambience-registry` AR1–AR6 PASSA · `eval:mapcontrato` MC1/MC2 PASSA e MC3 `ok penitenciaria … conexo` (a FALHA que sobra no MC3 é `obras_prefeitura`, arquivo de outro builder) · `node --check public/js/map_penitenciaria.js` verde depois de cada bloco. **Não commitei** e **não rodei `node tools/eval/map-check.mjs`.**

Sondas próprias em `/tmp` (só importam `tools/eval/harness.mjs`): `pen_check.mjs`/`pen_check_base.mjs` (A/B do map-check), `pen_probe.mjs` (censo SUP1/ORT1/ALT1/malhas/visada global), `pen_overlap.mjs` (colisor novo sobreposto, arma/spawn/bandeira/fauna enterrados), `pen_comp.mjs` (componentes conexas do grafo), `pen_ctf2.mjs`/`pen_ctf2b.mjs` (rotas separadas e fronteira de alcance).

## Não aplicado (e por quê)
- **Passo 3 inteiro (2.1–2.7)** — hélice de arame, postes 3,4 m, laje andável a 5,8 m, escadas NBR, guarda-corpo, topo de guarita andável. É cota andável / `groundHeightAt` multinível, fora desta rodada por contrato. Consequência medida: **ALT1 h90 fica em 8,80 m** (o percentil segue preso nos 486 anéis de concertina) e as −482 malhas da hélice não foram colhidas. O telhado dos 4 blocos entrou como `collide:false` para dar a leitura de hall coberto sem criar cota.
- **Solários em z=0 (item 1.7 literal)** — a coordenada da receita (∓9,5; 0) com 8 × 7 m **enterra 4 das 8 armas do miolo** (as armas ficam em z ∓2,2, x de −10 a +10). Veto do dono: nenhuma arma sai do chão — e enterrar é pior que mover. Entraram 4 solários em (∓9,5; ∓11,5), que fecham o mesmo corredor reto em x ≈ ∓9,5. Foi assim que a receita chegou a MAP1 = 0 sem ver os 2 pontos residuais: ela tornou aquelas células não-andáveis.
- **Blocos em |z| 29,5–37,5 (item 1.4 literal)** — a parede lateral em x ∓24,8 cai **exatamente sobre a soleira da cela de z ∓30** (`doorwayX = ∓24,8`), que a PEN2 exige transitável. Profundidade caiu de 8 para 5 m e o centro foi para |z| 34 (pegada |z| 31,5–36,5), livre das celas (|z| ≤ 33,6) e dos sacos de boxe (z 38).
- **Massas de flanco em (∓21; ∓10) e (∓21; ∓20) (item 1.9 literal)** — vão inteiro sobre a soleira de cela (z ∓10/∓20/∓30): **ilhava 2 celas** (sem rota A* do spawn). Os anteparos foram para os pilastres (|z| 5/15/25) e cobrem 3,5 dos 6 m alternando o lado — sem isso o próprio corredor de flanco + a cela de z ∓10 saíam ilhados (11 nós, MC3 vermelho). Custo medido: a linha de tiro da bandeira ficou em **73,1 m** e não nos 69,4 m da receita.
- **Taipais de 1,8 m com passagem única (item 1.10 literal)** — sela o alley: com uma coluna de nós no corredor de 3,05 m, qualquer taipal corta o grafo. Entraram 1,65 m alternando o lado com 0,25 m de superposição + 2 colunas de waypoint dedicadas.
- **Viatura em (21; −33,5) dentro da garagem (item 1.5)** — o hall da ala tem 4,2 m de profundidade e a viatura 3,1 m: sobrava 0,55 m de cada lado e o hall virava intransponível. Ela foi para o antepátio leste, ao lado da guarita, em **(30; −39,5) ry 1,57**.
- **Ônibus de transferência (4.8)** — 11,5 m não cabe no hall de 10,2 × 4,2 m, e nas duas vagas de antepátio que testei ele encostava em spawn B (15;42) ou no poste da guarita. Fica para quando a pilha do #556 trouxer o Pavilhão 6 oco.
- **`CLASSE.penitenciaria = 'planejado'`** (alternativa do §3 da receita) — não usei: o ORT1 subiu construindo (4,4% → 17,6%, 9 → 30 ângulos), sem isenção e sem girar toro em torno de Y.
- **2 pombos na laje (4.14)** — depende da cota andável do passo 3.

## Pedido ao Main (arquivo compartilhado)
`public/js/maps.js` — sem isso os 15 GLBs ficam sem pré-carregamento e o mapa roda só no fallback procedural (funciona e é o que as réguas medem, mas perde a imagem no browser):
1. linha 18: `import { buildPenitenciaria } from './map_penitenciaria.js';` → `import { buildPenitenciaria, PENITENCIARIA_PROPS } from './map_penitenciaria.js';`
2. linha 94: `penitenciaria: { name: 'Penitenciária da Treta', build: buildPenitenciaria, ctfMode: true },` → `penitenciaria: { name: 'Penitenciária da Treta', build: buildPenitenciaria, props: PENITENCIARIA_PROPS, ctfMode: true },`

(Já enviado pelo hub. Export pronto em `map_penitenciaria.js:14-19`.)

## Colisão com o PR #556 (Carandiru)
Mesmo arquivo: a main tem 264 linhas, o #556 tem 912. **Conflito textual total** — quem entrar depois refaz o merge à mão. Em conteúdo o meu diff é aditivo e nenhum dos 4 defeitos que eu fecho é resolvido por ele:
- **CTF1**: `map_penitenciaria.js:833` da pilha mantém as 3 bandeiras em x=0 (altura do triângulo 0,00, bandeira a 5,83 m do próprio spawn). Meus itens 1.1–1.3 são independentes dele.
- **MAP1 = 14**: `gaiola` e `dynamite` estão idênticas nos dois lados; nenhuma régua CAR mede corpo dentro de sólido.
- **MAP7/MAP4**: o `occluders.push(group)` da viatura é o mesmo nos dois lados.
- **SUP1**: os 5 materiais de mancha e os 21 chapados estão nos dois lados; o #556 não toca `fence()` nem as manchas.
- **Onde ele é melhor**: `applyLook(scene, T, 'penitenciaria')` + `sky_penitenciaria.webp`. Quando a pilha entrar, trocar meu `setMapSky(sky_sp)` de `:167` por `applyLook` e apagar o item 4.1.
- **Onde ele agrava o que eu consertei**: `walkway('carandiru-passarela-muro-oeste', 3.4, 90, −35.6, 0)` põe 90 m de passarela contínua a 5,8 m **exatamente por cima** do corredor de serviço. Meus taipais cortam o térreo; na cota 5,8 m eles precisam ser replicados como guarda-corpo transversal com passagem de 1,2 m, senão o alley sobe de andar. Minhas 2 colunas de waypoint (x ∓35,0 / ∓36,9) também precisam ser recriadas por lá.
- **Onde ele não conflita**: os meus blocos ficam em |z| 31,5–36,5 (antepátios), fora da pegada do Pavilhão 6 central; a cota de 5,8 m é a mesma de propósito, para as duas soluções empilharem sem degrau.

## O que exige figura
1. **A diagonal residual de 82,2 m** — (−17,1;−35,1) → (−11,1;46,9), pelo eixo entre o pórtico e o bloco oeste. 82 m num presídio de 96 m de fundo pode ser a leitura certa; estreitar o vão do pórtico aperta o anel de captura da MID. Precisa de captura, não de sonda.
2. **A linha de tiro da bandeira em 73,1 m** (contra os 69,4 m da receita) — é o preço dos anteparos de flanco escalonados, que eu escolhi para não ilhar a cela de z ∓10. Trocar 3,5 m de anteparo por vão inteiro devolve o número e ilha a cela: a decisão é de leitura, precisa de frame do corredor.
3. **Textura do reboco/telhado a 128 px/m numa parede de 11 × 5,8 m** — a nota de `textures.js:347` diz que a família se espalha de 28 a 314 px/m e que o conserto é por superfície. Não sei dizer sem captura na distância em que o mapa é servido se o `plaster`/`galv` viram xadrez.
4. **Rótulos no HUD** — `eval:ctflabels` e `eval:ctfhud` estão verdes e os três rótulos são únicos e não-Brasília, mas 'PAVILHÃO 4' / 'PÁTIO' / 'PAVILHÃO 6' na faixa de CTF eu **não vi renderizado**: abri aba, o Main mandou fechar (um agente de browser por vez) e eu fechei antes de capturar. Confirmação de pixel fica para a rodada de captura.
5. **O feel do miolo com a gaiola sólida** — o colchão virou cobertura de 1,02 m no pátio (faixa útil 0,9–1,6 m). A receita já marcava isso como "precisa de olho"; a sonda só diz que MAP1 zerou.

## Limpeza
Nada além de `public/js/map_penitenciaria.js` foi tocado (+308 / −31). Aba de browser fechada, servidor estático `pen-serve` parado. Sondas só em `/tmp`. Sem commit.
