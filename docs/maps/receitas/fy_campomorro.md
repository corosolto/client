<!-- Receita gerada em 12/09/2026 por rodada de análise com contexto limpo.
     Medições: node tools/eval/map-check.mjs all + node tools/eval/mapa-novo-gate.mjs (12/09) e
     sondas em memória sobre tools/eval/harness.mjs. Índice: ../RECEITAS-MAPAS.md -->

# Campo do Morro (`fy_campomorro`) — receita

> Todos os números abaixo foram **medidos**, não estimados: baseline lido de `/tmp/map_check_all.json` + `/tmp/texel.json` (execução de hoje, 12/09), e a proposta foi simulada em memória com `bootGame('fy_campomorro')` (réplica exata do grafo de waypoints do mapa — 598 nós no baseline, becos cegos 0, exposição E 64,19/61,68/65,96/64,68% idêntica à da régua). Nada foi editado.

## 0. Leitura do arquivo (o que existe hoje)

| o quê | onde | fato |
|---|---|---|
| campo rebaixado 40×25 | `:19` `FIELD_X=20, FIELD_Z=12.5, FIELD_Y=-0.08` | platô plano; `:18` proíbe descer mais (VM14) |
| morro | `:37-42` `encosta()/morroBase()` | só FORA do campo; oeste 0,34·d²/(d+5) → +2,19 m em x=−30, +3,11 m em x=−33 |
| 8 bocas radiais | `:22-31` `LANES` + `:51-60` `laneHeight` | rampas de 4 m; são 8 corredores retos apontados para o centro |
| talude + alambrado | `:243-307` | muro 1,05 m + postes 2,2 m + `LineSegments` de tela (sem opacidade) |
| galpão do baile (único `levels`) | `:33` `GALPAO{y:1}`, `:198-205`, `:354-415`, `:710` | +1 m, 12×10, 2 saídas |
| casario | `:335-347` `CASAS[11]` + `fachadaCasa` `:162-191` | caixas 5,5×4,5, laje extra só se `base>2` |
| props GLB | `:309-326`, `:414-415` | 7 props; em node o GLB não carrega e o **proxy** `MAT.proxy` fica visível (444,8 m² chapados) |
| materiais | `:90-131` | 13 com `map` de criação; `MAT.roof/steel/door/glass/proxy/sound/...` só ganham textura via `external()`, que **não roda em node** — é isso que produz SUP1 71,7% |
| spawns | `:563-567` | E nos 4 slots do centro (−4/−1, −3/+1); B dentro do galpão |
| orçamento | `:4`, `:65`, `:586-593`, `:599-600` | `PropBatch`/`InstBatch` já montados — reusar, não clonar |

**Baseline medido:** E 64,13% × B 14,97% (razão 4,28×) · maior visada ao spawn E 44,1 m · 118 occluders · MAP5 pior 6,67 m (q0,3) · ALT1 h90 **8,71 m** (431 massas, 41 com topo ≥9) · ORT1 16,2%/38 · SUP1 **71,7%** (33 de 46 materiais) · SUP2 13,24% (2849,3 de 21519,6 m²) · CTF1 11,94 m · MAP2B folga 1,85 / área 48 m² · becos cegos 0 · rota B→campo 9,90 s · MAP6 0.

---

## 1. Jogabilidade e dificuldade (alvo: assimetria ↓, MAP5 ≤7 m, cover ≤12,5 m, CTF1 >4,5 m)

**Diagnóstico da assimetria, com a causa localizada:** dos 377 observadores a ≥25 m, **242 enxergam a cabeça de quem nasce em (−4,−3)**. Repartidos por setor: Leste 72 · SE 57 · SO 35 · NO 28 · NE 21 · O 18 · S 8 · N 3 — e **240 dos 242 estão FORA do campo**. Ou seja: não é o centro que é exposto ao campo (isso a ficha quer), é o **anel inteiro do morro que enxerga o centro por cima de um talude de 1,05 m**. A ficha proíbe exatamente isso (`plans/11-CAMPO-DO-MORRO.md:48-50`: "enxergam **fatias** do campo pelos vãos do alambrado — nunca vê o campo inteiro de uma boca só"). O conserto é fechar o alambrado, não mexer no spawn.

| # | intervenção | x,z | dimensão | como (função/prop) | número que move |
|---|---|---|---|---|---|
| 1.1 | **Lona/sombrite de patrocínio no alambrado** — 10 painéis do chão ao topo dos postes; vãos = os MESMOS que a tela já declara em `:294-302` | z=−13,8: x[−19,5..−12,1], [−9,9..−2,8], [2,8..9,5], [15,5..19,5] · z=+13,8: x[−19,5..−2,8], [2,8..19,5] · x=−21,4 e x=+21,4: z[−11,2..−2,8], [2,8..11,2] | alt **2,15 m** a partir da cota local, esp. 0,06 m | `addBox(..., MAT.lona, ..., {collide:false, bala:true})` — occluder puro: para bala e visão, **não** cria colisor, não toca nav/cover/MAP5 | E 64,1% → **43,6%** sozinho; observadores L 72→28, SE 57→25 |
| 1.2 | **Rasgo de 2,2 m na lona** (alambrado arrombado da ficha `plans:16`) | z=−13,8, x[−12,1..−9,9] | vão 2,2 m | ausência de painel + `T.pixo` na borda | mantém 1 fatia de tiro no flanco N sem custo medido (já incluso no 43,6%) |
| 1.3 | **Basculante do galpão** — a parede oeste-sul vira peitoril + verga, com vão de 0,70 m | (22, −17,85), vão em y 2,10–2,80 | peitoril 0,35×1,10×3,70 · verga 0,35×1,40×3,70 | dois `addBox` colidentes no lugar do atual `:362` (corpo continua barrado: peitoril tapa 1,0–2,1) | B 15,0% → **22,1%** sozinho; é o "visão picada do campo" que a ficha promete a B (`plans:51`) |
| 1.4 | **Casario em cota no barranco oeste** (ver §2) | (−28,5,−14,2) · (−27,2,3,6) · (−26,9,9,5) · prédio da laje (−27,05,−7,4) | ver §2 | `addBox(MAT.wall)` + `fachadaCasa` | com 1.1+1.3: E 43,7% → **34,2%**; setores O 18→8, SO 35→11, NO 28→15 |
| **=** | **conjunto 1.1+1.3+1.4** | — | — | — | **E 34,2% × B 15,5% → razão 2,22×** (era 4,28×); visadas ≥34 m ao spawn E: **70 → 34** |
| 1.5 | MAP5 q0,3 (x −35,5..−17,8 / z 14,8..29,5): 178 m², 4 props, 6,67 m | churrasqueira (−29,5, 18,6) 1,2×1,1×0,9 · barraca (−25,5, 20,6) 3,5×2,7×2,8 · mototáxi (−31,8, 22,5) 0,9×1,3×2,0 · pneus (−20,5, 25,5) 1,4×1,2×1,4 | acima | `placeProp('churrasqueira'/'stall'/'moto_cg'/'pilha_pneus')` + proxy colidente via `prop()` `:309` | q0,3 6,67 → **~4,7 m** |
| 1.6 | MAP5 q1,3 (x −17,8..0 / z 14,8..29,5): 167 m², 4 props | trave velha encostada (−13,5, 19,8) 6,2×2,4×0,3 · mesa+guarda-sol (−9,5, 22,2) 2,2×2,3×2,2 · fusca (−3,5, 22,5) 1,9×1,5×4,0 | acima | `trave_futebol`, `mesa_guardasol`, `fusca` | q1,3 6,46 → **~4,9 m** |
| 1.7 | Faixa de serviço entre alambrado e talude (fica DENTRO dos quadrantes do campo sem pôr cover no campo) | (−16,5,−14,4) pneus · (−8,5,−14,4) dumpster 1,9×1,4×1,3 · (5,5,−14,4) moto · (17,2,−14,4) botijões 1,2×1,2×1,2 · (−16,5,14,4) pneus · (−6,5,14,4) kombi 1,9×1,5×4,0 · (9,5,14,4) cooler 1,2×1,1×1,2 · (16,5,14,4) pneus | ver coluna | `pilha_pneus`, `dumpster`, `moto_cg`, `botijao_gas`, `kombi`, `cooler` | q1,1 6,39→**5,58** · q2,1 6,34→**~5,6** · q1,2 6,43→**~5,6**; **pior MAP5 do mapa 6,67 → 6,29 m** |
| 1.8 | Veículos encostados no meio-fio das 4 ruas do anel (quebram a reta e alimentam q2,0/q0,0) | ônibus (−14, −28,4) 11,0×3,1×1,9 · kombi (6, 26,2) 4,6×2,2×1,8 · fusca (−34,3, −6) 1,8×1,5×4,2 · caminhão (22, 28,6) 4,6×2,4×1,6 | ver coluna | `onibus_urbano`, `kombi`, `fusca`, `vw_9150` — **encostados na guia**, nunca no eixo da rua | q2,0 6,30→6,29; becos cegos continuam **0** (testado: pôr os mesmos veículos no eixo da rua produz **6 becos cegos** — por isso hugging obrigatório) |
| 1.9 | **Corredor de sniper do miolo**: NÃO propor chicane no eixo das lanes | — | — | — | medido: 3 chicanes em (27,−26), (17,5, 25) e (−30, 22,5) mudam a razão só de 2,22 para 2,17, **não** movem a maior visada (44,1 m) e criam **6 becos cegos**. A linha de 44 m é a lane NE — geometria declarada (`:22-31` + `plans:26-28`). O que a receita entrega contra o "corredor" é volume: visadas ≥34 m ao spawn caem 70→34 |
| 1.10 | Banco de reservas (9,5, 9,6) **não se toca** | — | — | — | é o cover de 12,13 m / 2,91 s do centro (`:263-266`) e o mutante `--mutante=bancada-central` existe só para isso; a margem é de **0,39 m** |

CTF1: bandeiras não se movem → triângulo **11,94 m** e menor distância a spawn **9,43 m** permanecem (>4,5 e ≥9). MAP2B: spawns não se movem → folga 1,85 m e área 48 m² permanecem.

---

## 2. Verticalidade (alvo: ALT1 h90 ≥9 m, ≥1 cota andável nova)

ALT1 é percentil 90 do **topo das massas**, então não basta subir o terreno: com 431 massas o índice cai em `topos[387]=8,71`. Cada massa nova abaixo de 9 m empurra o índice — a conta medida é `nº de massas com topo ≥9 ≥ 0,1·N+1`. Com a receita inteira N=504, logo são necessárias **51**; a receita entrega **57**.

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 2.1 | **4 postes de iluminação do campo** (mastro + luminária) — o que todo campo de várzea tem e este não tem | (−22,9,−15,3) · (22,9,−15,3) · (−22,9,15,3) · (22,9,15,3), `ry` 0,18/−0,18/−0,22/0,22 | mastro 0,34×**10,60**×0,34 (topo ≈10,5) + luminária 2,30×0,75×0,60 no topo (topo ≈11,2) | `addBox(MAT.steel)` + `InstBatch` (4 cópias da mesma geo) | +8 massas com topo ≥9; sozinhos já valem 8 dos 16 que faltam |
| 2.2 | **Casario em cota** no barranco oeste, com caixa d'água na laje (mesma gramática de `:335-347`) | A (−28,5,−14,2) 6,0×3,6 topo **9,4** · B (−27,2, 3,6) 7,0×5,0 topo **9,8** · C (−26,9, 9,5) 7,4×5,0 topo **9,6** | h = topo − `groundHeightAt(x,z)` (A 8,3 m, B 9,2 m, C 8,9 m); caixa d'água 1,16×1,25×1,16 sobre cada laje | `addBox(MAT.wall, {ry})` + `fachadaCasa(x,z,w,d,h,i,base)` + cilindro de `:344` | +6 massas ≥9 **e** −11,5 pontos de exposição E (item 1.4) |
| 2.3 | **Torre da caixa d'água comunitária** (marco vertical do morro) | (−24,6, −19,5), `ry` 0,27 | 2,6×**10,4**×2,6 (pegada 6,8 m², não fecha beco) | `addBox(MAT.concrete)` + `caixa_dagua_azul` no topo | +2 massas ≥9 |
| 2.4 | **Cota andável nova: a laje do casario oeste (+4,60 m)** — via `groundHeightAt`, como o galpão em `:199` | retângulo x[−30,9..−23,2] × z[−10,8..−4,0] | 7,7×6,8 = 52,4 m² de laje; **32,8 m² andáveis medidos** (0,25 m de grade) depois de parapeito/casinha | prédio abaixo: `addBox(7,7 × (4,60−base) × 6,8)` em (−27,05,−7,4) `ry` 0,09; nova cláusula em `groundHeightAt`: `if (x>=-30.9&&x<=-23.2&&z>=-10.8&&z<=-4.0) return 4.6;` | 2º nível real de um mapa que só tinha o galpão de +1 m; `levels[]` ganha `{nome:'laje-oeste', dePartida:null}` |
| 2.5 | **Escadinha do beco** (a `escadas: []` do mapa) — NBR 9077 conferida | faixa x[−32,3..−30,9] (largura **1,40 m**), z de −4,0 (base, cota 2,68) a −7,0 (topo 4,60), **patamar** z[−7,6..−7,0] a 4,60 | 11 degraus: espelho **0,1745 m**, piso **0,273 m**, Blondel 2e+p = **0,622**, inclinação **32,6°** | `groundHeightAt` devolve **rampa contínua** na faixa (o degrau visível é geometria, como as rampas do galpão em `:194-197`) + 11 caixas `{collide:false,bala:true}` em `InstBatch`; declarar em `stairs` | faixas NBR: espelho 0,16–0,19 ✓ · piso 0,25–0,32 ✓ · Blondel 0,62–0,66 ✓ · largura ≥1,20 ✓ · inclinação 25–40° ✓. Flood-fill a 0,25 m: **525 células chegam na laje** |
| 2.6 | **Parapeito da laje** (MAP6 é o preço da cota nova) | N (−27,05,−10,69) 7,7×0,22 · S (−27,05,−4,11) 7,7×0,22 · L (−23,31,−7,4) 0,22×6,8 · O (−30,79,**−9,145**) 0,22×**3,09** — o trecho oeste **para em z=−7,6** para deixar a boca da escada | altura 1,00 m | `addBox(MAT.wall)` colidente | **MAP6 = 0 bordas sem guarda** (medido). Testado: parapeito oeste de 3,54 m fecha a boca e produz **15 becos cegos**; parapeito curto demais deixa **1 borda de 2,11 m** aberta em (−30,75,−7,25) |
| 2.7 | Casinha da escada + caixa d'água sobre a laje (silhueta) | (−29,6,−5,6) 2,2×2,5×2,4 `ry` 0,12 · (−24,6,−9,6) 1,2×1,5×1,2 `ry` 0,4 | acima | `addBox` + `caixa_dagua_fibra` | ocupam o teto sem tirar os 32,8 m² andáveis; entram no ORT1 girado |
| **=** | — | — | — | — | **ALT1 h90 8,71 → 9,60 m** (57 massas ≥9 de 504) · ORT1 **23,0% girada / 40 ângulos** (era 16,2%/38) |

**Restrição dura verificada:** ORT1 é razão. Cada massa nova **de esquadro** empurra a fração para baixo (piso 15%): com 504 massas o teto é ~72 massas ortogonais novas. Por isso **toda** massa desta receita leva `ry` (0,09 a 0,5) — e o número sobe em vez de cair.

---

## 3. Visual e escala (alvo: SUP1 ≤40%, SUP2 ≤6%, ORT1 ≥15%/20, UV 128 px/m)

SUP1 medido hoje: **33 de 46 materiais sem `map` = 71,7%**. Destes, **16 são dos bichos** (`createFavelaAmbience`, `:652`) e não moram neste arquivo — são o piso estrutural (16/46 = 34,8%). Os **17 restantes são do mapa** e todos têm conserto de uma linha, porque a textura já está sendo carregada por `external()` (`:110-131`) — que **não roda no arnês node**, que é onde a régua mede.

| # | material (`map_campomorro.js`) | malhas | área chapada | conserto | SUP2 devolvido |
|---|---|---|---|---|---|
| 3.1 | `MAT.roof` `:100` (#777a76) | 85 | **1119,7 m²** | `lam({ map: T.metal, color: 0x777a76 })` — mantém o upgrade de `/img/textures/tex_zinco.webp` por `external` | 5,20 pp |
| 3.2 | `MAT.proxy` `:107` (#6f6256) | 10 | **444,8 m²** | `lam({ map: T.crate })` — é o fallback dos 7 props sem GLB | 2,07 pp |
| 3.3 | `MAT.steel` `:95` (#536069) | 57 | 322,7 m² | `map: T.metal` | 1,50 pp |
| 3.4 | `MAT.galpaoRoof` `:101` (#426f78) | 2 | 317,1 m² | `map: T.metal` (repeat pelo `aoMat`) | 1,47 pp |
| 3.5 | `MAT.door` `:99` (#4a3325) | 49 | 172,9 m² | `map: T.crate2` | 0,80 pp |
| 3.6 | `MAT.steelRust` `:96` (#6f4935) | 33 | 118,5 m² | `map: T.metal` | 0,55 pp |
| 3.7 | `MAT.sound` `:104` (#252b2f) | 8 | 111,7 m² | `map: T.concreteDark` | 0,52 pp |
| 3.8 | `MAT.glass` `:98` (#24383f) | 50 | 104,8 m² | `map: T.metal` + `opacity` mantida | 0,49 pp |
| 3.9 | `cal` `:230` · `soundRing` `:105` · `white` `:97` · `matTufo` `:606` · 3 marcos `:419-421` · `gun` `:108` · `exitLight` `:106` | 38 | 132,6 m² somados | `T.concrete` (cal/white), `T.metal` (ring/gun/exitLight), `T.grass` (tufo), `T.posters`/`T.billboard` (marcos) | 0,62 pp |
| **=** | 17 materiais | 332 | **2844,8 m²** | — | **SUP1 71,7% → 32,0%** (16/50, já contando 4 materiais novos, todos com `map`) · **SUP2 13,24% → ~0,02%**. Mesmo fazendo só 3.1–3.5: **SUP2 = 2,2%** ✓ |
| 3.10 | **UV em metros**: trocar `new THREE.BoxGeometry` por `aoBoxGeo(w,h,d,{low:LOWQ})` + `aoMat(mat)` dentro do `addBox` de `:147-158` (padrão literal de `map_corrego.js:197-212`) | — | — | — | `textures.js:347-348` diz com todas as letras que este é o conserto: *"a família se espalha de 28 a 314 px/m (**campomorro sem aoBoxGeo**) … conserto é por superfície no `map_*.js`"*. Hoje: mediana 131,1 px/m ✓, mas **12,58% da área abaixo de 64 px/m** (teto 10%) e **dispersão total 4,62×** (teto 4,0). Sem isto, dar `map` aos 17 materiais **piora** TEXEL2 |
| 3.11 | **Não repetir o truque do `texturaSuperficie`** (`:76-89`, DataTexture 4×4) em superfície nova | — | — | — | 4 px × repeat 5 sobre 11,4 m = **1,8 px/m**; é parte dos 12,58% abaixo do piso. Material novo usa `T.*` (≥128²) + `applyAniso` |
| 3.12 | Materiais novos da receita (todos **com** `map`) | `MAT.lona` = `T.awning` · `MAT.tijolo` = `T.concrete` (casario/parapeito) · `MAT.degrau` = `T.concrete` · `MAT.poste` = `T.metal` | — | — | +~1000 m² de área **texturizada** no denominador do SUP2 |

---

## 4. Brasilidade (o que faz alguém reconhecer o lugar)

| # | elemento | x,z | dimensão | prop/como | por que é este lugar |
|---|---|---|---|---|---|
| 4.1 | Lona de patrocínio no alambrado: "BAR DO ZÉ", "AÇAÍ & CALDO", "COPA DA LAJE 2026" | os 10 painéis de 1.1 | 2,15 m de altura | `MAT.lona` com `T.awning`; letreiro por `decalIds` no `grafitar` de `:643` | campo de várzea de verdade tem lona/sombrite com patrocínio de comércio de esquina — e é ela que fecha o anel |
| 4.2 | Trave improvisada com **rede furada** | (±18,2, 0) já existe `:253-262` | — | **manter** as 2 `LineSegments` (`userData.goalNet`) | é cláusula do `campo-contract` (`--mutante=traves-sem-rede`); a trave velha sobressalente vai encostada em (−13,5, 19,8) via `trave_futebol` |
| 4.3 | **Arquibancada de tijolo de um lado só** | (−7, 20) já existe `:322-332` | 12×3,2×3,5 | **não duplicar** | `plans:16` diz "arquibancada de cimento **de um lado só**" — a cota nova da §2 é laje de casa, não arquibancada |
| 4.4 | **Bar de esquina** do campo (barraca + guarda-sol + mesa + cooler) | barraca (−25,5, 20,6) 3,5×2,7×2,8 · mesa/guarda-sol (−9,5, 22,2) 2,2×2,3×2,2 · cooler (9,5, 14,4) 1,2×1,1×1,2 | acima | `stall`, `mesa_guardasol`, `cooler` | fecha q0,3/q1,3 (item 1.5/1.6) e dá o "depois do jogo" |
| 4.5 | **Churrasqueira** fumegando | (−29,5, 18,6) | 1,2×1,1×0,9 | `churrasqueira` + `GPUParticles` de `:677` com `ambiente:'fumaca'`, 1 spawn/0,6 s | churrasco do troféu da ficha (`plans:17`) |
| 4.6 | **Caixa de som** virada para o campo (não só dentro do galpão) | (23,8, −16,2), encostada na fachada sul do galpão | 1,4×1,8×1,2, `ry` −0,3 | `caixa_som_baile` (já em `CAMPOMORRO_PROPS`) + `AMB_LOOPS.funk` já existe em `:706` | o baile joga som no campo; hoje o loop está em (28,2,−21), dentro |
| 4.7 | **Varal de bandeirinha de festa junina** sobre o beco oeste e sobre a laje | (−27, −7,4)→(−31,6, −4,0) e (−24, 16)→(−18, 18) | 2 cordas, bandeirinha 0,22×0,26 a cada 0,8 m | `LineSegments` + `InstBatch` de planos com `aplicaVento(..., {amp:0.05, freq:1.25})` — **mesmo material de vento que a régua RC4 mede** (`:598-607`) | a única coisa que se mexe no céu do mapa além da poeira |
| 4.8 | **Mototáxi** parado com placa | (−31,8, 22,5) 0,9×1,3×2,0 · (5,5, −14,4) 0,9×1,3×2,0 | — | `moto_cg` + plaquinha 0,6×0,4 `T.signBoteco` | transporte do morro; entra na conta do MAP5 |
| 4.9 | **Casario em cota com laje, caixa d'água e varal** | §2.2/2.4 | — | `fav_house` / `lajes_casa_tijolo` como GLB e `addBox` como fallback + `varal_roupas_01` na laje | é o que faz o mapa chamado "do Morro" ter morro construído, não só rampa de terra |
| 4.10 | **Postes de luz do campo** (§2.1) com lâmpada amarela apagada de dia | 4 cantos | 10,6 m | `PointLight` só no modo noturno; de dia só a massa | silhueta clássica de campo de várzea contra o céu do `applyLook` |

---

## 5. Ordem de execução e custo

| passo | o que | fecha | risco medido |
|---|---|---|---|
| 1 | **Materiais** (§3.1–3.9) + `aoBoxGeo/aoMat` no `addBox` (§3.10) | SUP1 71,7→32,0% · SUP2 13,24→~0,02% · TEXEL2 12,58%→dentro do piso | mudar `addBox` mexe em TODAS as malhas: rodar `texel-check` e conferir mediana perto de 128 px/m antes de seguir. Zero risco de gameplay (não muda geometria) |
| 2 | **Lona do alambrado** (§1.1–1.2) + **basculante** (§1.3) | E 64,1→43,6% · B 15,0→22,1% | nenhum colisor novo → cover, MAP5, rota e MAP2B intactos por construção. Conferir `bocas 5/5` e `captura ≥80%` (medidos: **5/5** e **92%**) |
| 3 | **Props de quadrante e de rua** (§1.5–1.8) | MAP5 6,67→6,29 m | **encostar na guia**: os mesmos veículos no eixo da rua deram **6 becos cegos**; prop em z∈[16,18] ou z=−17 corta o anel de waypoints (medido: até 31 becos) |
| 4 | **Casario em cota + torre** (§2.2–2.3) | E 43,7→34,2% (razão **2,22×**) · +8 massas ≥9 | os 3 corredores oeste do baseline — z≈0, z≈15 e o degrau em (−27,−1) — **têm que ficar abertos**; fechá-los orfanou 22–31 nós nos testes. Vãos validados: z[−4,0..1,1] e z[12,0..∞] |
| 5 | **Laje + escadinha + parapeito** (§2.4–2.7) e `stairs`/`levels` declarados | ALT1 8,71→**9,60 m**, 1ª cota andável nova (32,8 m²), MAP3 dentro da NBR | é o passo delicado: a boca do parapeito e o patamar da escada foram a diferença entre **0** e **15 becos cegos** / **1** borda MAP6. Usar exatamente z[−7,6..−7,0] de patamar e parapeito oeste terminando em z=−7,6 |
| 6 | **Postes de luz** (§2.1) e brasilidade (§4) | fecha as 51 massas ≥9 exigidas; silhueta | custo de draw call: mandar degraus (11), lona (10) e postes (4) por `InstBatch`/`mergeParts` — o mapa já importa os dois em `:4`. Total ~150 caixas novas; sem lote, é +150 draw calls |

### Uma linha por cláusula do `campo-contract-check.mjs` (proposta simulada, config final)

| cláusula | arquivo:linha | baseline | com a receita |
|---|---|---|---|
| E[i] dentro do campo (\|x\|≤19,4, \|z\|≤11,9) | `:70-73` | 4/4 | **4/4 — spawns não se movem** |
| B[i] dentro do galpão (22,4..33,6 / −25,6..−16,4) | `:71-75` | 4/4 | **4/4 — não se movem** |
| rota galpão→campo ≤25 s | `:84-88` | 9,90 s | **9,90 s** (grafo replicado, 560 nós) |
| becos cegos = 0 | `:91-97` | 0 | **0** (orfãos: nenhum) |
| 5 bocas com linha de tiro | `:99-106` | 5/5 | **5/5** — lona só existe FORA das bocas |
| abertura da captura oeste ≥80% (de −23; 1,45; 0) | `:112-124` | 92% | **92%** — nada novo entra no cone (no máximo z=±1,16 no plano x=−21,4) |
| cover do centro ≤3 s | `:126-132` | 2,91 s (12,13 m) | **2,91 s** — banco de reservas intocado |
| hemisférica ≥1,10 | `:53-54` | — | inalterada (`applyLook`) |
| 2 luzes locais ≥0,8 no galpão | `:55-56` | 3 | **3** — `:365-370` intocado |
| 2 faixas emissivas ≥0,55 nas saídas | `:57-58` | 2 | **2** — `:371-374` intocado |
| piso+teto do galpão texturizados | `:59-62` | 2/2 | **2/2** — se §3.11 trocar o `texturaSuperficie` por `T.*`, `userData.galpaoSurface` tem de continuar nas duas malhas |
| 4 batentes + 2 faixas ancoradas | `:63-64` | 4/2 | **4/2** — o basculante substitui a **parede** `:362`, não os batentes `:375-378` |
| 2 redes nas traves | `:65` | 2 | **2** — não se mexe em `:256-261` |
| bancada fora da faixa central 6×6 | `:66-67` | ok | **ok** (9,5; 9,6) |
| 3 marcos distintos | `:68-69` | 3 | **3** — dar `map` aos marcos **não** altera `userData.fieldLandmark` |

Demais réguas: MAP1 0 (nenhuma massa nova dentro de corpo; `fracSemMalha` 0,005 preservada porque tudo novo é caixa fechada) · MAP2B folga 1,85 / área 48 m² (spawns intocados) · MAP6 0 (medido) · CTF1 11,94 m / 9,43 m (bandeiras intocadas) · pickups: 12, nenhum movido, nenhum coberto — o veto do dono é respeitado.

---

## 6. O que eu NÃO consegui decidir sem olhar figura

1. **Altura da lona: 2,15 m fecha 51% das visadas, mas fecha também a leitura do campo de fora.** A régua não sabe a diferença entre "alambrado com lona" e "muro". Se na figura a boca oeste (captura `CAMPO_FIELD_MOUTH`) parecer um túnel, a lona do lado x=−21,4 desce para 1,60 m: medi que isso devolve ~8 pontos de exposição (E ~42%) e a razão sobe para ~2,7×.
2. **A assimetria é declarada — eu reduzi, não eliminei.** `plans/11:31-34` e o comentário `map_campomorro.js:564-565` dizem "assimetria deliberada: centro sem proteção × periferia protegida". Entreguei 2,22× em vez de 4,28×, argumentando com a outra cláusula da mesma ficha (`plans:48-50`, "nunca vê o campo inteiro de uma boca só"). **Se o dono quiser paridade (~1,0×), isso exige mexer no spawn E ou no contrato do galpão — e aí é decisão dele, não da régua.**
3. **A lane NE de 44 m.** Só se conserta dobrando o beco, e dobrar custou 6 becos cegos nos 3 testes que fiz. Precisa de planta desenhada (sequência de vãos), não de mais uma caixa.
4. **Se a laje oeste a +4,6 m vira ninho de sniper.** Ela acrescenta ~13 células de observador olhando o campo de cima; no agregado a exposição E ainda caiu, mas "quem sobe ali domina o meio" é julgamento de figura/partida, não de raycast. Se for, a saída barata é rodar o parapeito norte para 1,6 m (peito alto) — não medi essa variante.
5. **`MAT.glass` com `map`.** Dar textura ao vidro resolve SUP1/SUP2 e pode ficar feio (vidro com grão de metal). Alternativa: `transparent` + `map` de reflexo desenhado; não sei qual lê melhor sem ver.
6. **A cor da lona.** Escolhi `T.awning` (listrado de toldo). Sombrite preto seria mais fiel a campo de várzea, mas escurece o anel inteiro — é decisão de arte com a figura na mão.
