<!-- Receita gerada em 12/09/2026 por rodada de análise com contexto limpo.
     Medições: node tools/eval/map-check.mjs all + node tools/eval/mapa-novo-gate.mjs (12/09) e
     sondas em memória sobre tools/eval/harness.mjs. Índice: ../RECEITAS-MAPAS.md -->

I'll start by reading the required context file and the target map.Agora escrevo uma sonda read-only em `/tmp` (fora do repo) para medir a exposição e testar anteparos candidatos.Em paralelo, rodo a sonda de anteparos (A/B da exposição) com cenários medidos.Agora refaço a sonda com colisor girado (padrão `_collideRot`) e denominador de exposição fixo do baseline.Tenho todos os números medidos. Escrevendo a receita.# Lajes (Comunidade) — receita

## 0. Leitura do arquivo (o que existe hoje)

| o que | onde | fato medido |
|---|---|---|
| 12 lajes retangulares em cota única `ROOF_H=5.2` (22 `ROOF_PARTS`) | `map_lajes_authored.js:37-65` | plateau: **100,0% dos 7.526 pares de pontos andáveis a ≥12 m se enxergam** (sonda própria) |
| spawns E/B = 4 pontos em `z=∓32,3`, chão 5,20 | `:1194-1197` | MAP2 E 100,0% / B 100,0%, visada 67,4/67,5 m (confere byte a byte com `/tmp/map_check_all.json`) |
| guarda da borda de laje, **0,44 m só na frente do spawn** | `:860-861` (`spawnFront ? .44`) | é a decisão declarada que produz os 100% |
| 4 bocas de laje de spawn = pouso das tábuas `NW-CN`,`CN-NE`,`SW-CS`,`CS-SE` (+`CS-MS`) | `:66-80`, `addPlank :702-755` | guarda pulada em ±0,9 m de cada boca (`roofAccessOnHorizontal :855`) |
| corpo dos blocos = 22 caixas `MAT.proxy` (`visible:false`, `userData.proxyGLB`) | `:576`, `:615`, `:205` | **3.886 m² = 75,8% de toda a "área sem textura" do SUP2 é malha INVISÍVEL** |
| 8 caixas d'água + 6 antenas + 5 varais | `:919-956` | `lajes-rooftop` exige tank≥8 / antenna≥5 / clothesline≥4 — hoje 8/6/5, sem folga no tank |
| 6 lances de escada com patamar de topo sobre o 2º lance | `addStaircase :757-813` | costura de **0,347 m** entre patamar (5,20) e degrau 13 (4,853) → `espelhoMax 0.3467` no JSON oficial; acima do `DEGRAU=0,30` do flood ⇒ **o térreo inteiro fica fora do denominador da MAP2/MAP5** (obs: 134, todos em cota 5,2; 11 dos 16 quadrantes com `areaAndavel=0`) |
| orçamento atual (nó, sem GLB) | — | 1.857 malhas · 32.574 tri · 174 materiais · 825 colisores · 971 occluders · 363 nós · 12 armas |

Instrumento: sondas read-only em `/tmp` importando `tools/eval/harness.mjs`; baseline reproduz o oficial (cel 8646, obs 134, occ 971, exp 1,0/1,0, visada 67,4/67,5). Nada do repo foi escrito.

---

## 1. Jogabilidade e dificuldade  (alvo: MAP5 ≤7 m, cover ≤12,5 m, CTF1 >4,5 m, exposição ↓)

**Refutação do palpite óbvio (medida, não opinião):** platibanda de **1,3 m** na borda de nascimento **não move nada** — 100,0% → 100,0%. Motivo geométrico: o observador de laje tem o olho em 5,2+1,62 = **6,82 m** e a cabeça do alvo também em 6,82 m; o raio é **horizontal**, e qualquer anteparo com topo < 6,82 m (isto é, < 1,62 m sobre a laje) passa por baixo. Platibanda de 1,9 m na borda **toda** também não resolve sozinha (100% → 39,4%/38,2%): o vazamento é pelas **bocas das tábuas**.

| # | intervenção | x,z | dimensão | como (função/prop) | número que move |
|---|---|---|---|---|---|
| 1.1 | **Passarela coberta** sobre a tábua `NW-CN` (muros laterais + telha de zinco) | muros em (−5,24;−28,96) e (−4,66;−26,74), `ry=+14,9°`; telha em (−4,95;−27,85) | 6,77 × 1,90 × 0,14 (muro, topo 7,10) · telha 6,77 × 0,14 × 2,43 em y 7,10 | `addBox` + colisor GIRADO no padrão do corrimão (`:732-736`: `{cx,cz,hx,hz,ry,cos,sin}`); `occluders.push(mesh)` | parte dos 100% → 0% (ver 1.5) |
| 1.2 | idem sobre `CN-NE` | muros (5,24;−28,96) e (4,66;−26,74), `ry=−14,9°` | igual | igual | idem |
| 1.3 | idem sobre `SW-CS` | muros (−4,61;26,66) e (−5,29;28,84), `ry=−17,0°`, L=6,82 | igual | igual | idem |
| 1.4 | idem sobre `CS-SE` | muros (4,61;26,66) e (5,29;28,84), `ry=+17,0°`, L=6,82 | igual | igual | idem |
| 1.5 | **Platibanda de tijolo no vão central** das 2 lajes de spawn (a guarda de 0,44 m dos cantos e das bocas FICA) | (0;−28,56) e (0;+28,56) | 3,80 × 1,90 × 0,14 | `addBox(3.8, 1.9, .14, wallMat(MAT.brick, 3.8, 1.9), 0, ROOF_H, ∓28.56)` | **MAP2 E 100,0%→0,0% · B 100,0%→0,0%; visada de spawn 67,4/67,5 m → 0,0 m**; com térreo no denominador 62,0%/54,7% → 0,0%/0,0% (chão 26/240 e 14/308 → 0/240 e 0/308) |
| 1.6 | largura da platibanda é **exatamente ±1,9 m** | — | — | — | ±1,4 m deixa 3 vazamentos medidos: obs (4,50;19,00) d=51,7 m→E e (−3,50;−11,00)/(−3,50;−9,00) d=43,6/41,7 m→B, que cruzam a borda em \|x\|≈1,43; **±2,2 m estrangula a boca** (andabilidade 8.384→1.492 células) |
| 1.7 | **20 muros de divisa** sobre as lajes, um por vão interno das 8 lajes laterais, com portão de 1,8 m centrado na tábua interna (`x=±10,3`) | z no meio de cada par de `parts` (ex. NW: z=−23,5; WN: z=−11,3; WS: z=0,7; SW: z=13,8 e 20,6; espelhados em +x) | por vão: 2 segmentos, 1,9 m de altura × 0,18 m, comprimentos 2,0 m e 2,0 m (de `x0` até `x=±9,4/±11,2`) | `addBox` + `wallMat(MAT.brick…)`, `ry` sorteado em ±1…10° | **pares com visada limpa 100,0% → 28,4%**; maior visada limpa 70,3 → **57,3 m**; p90 por ponto 68,0 → 52,0; p50 55,8 → 38,4; custo de andabilidade −0,1% |
| 1.8 | não mexer nas 12 armas de chão nem nas piscinas/churrasqueiras | `:966`, `:975`, `:1209-1213` | — | — | veto do dono + comentários de AT1/VM14 em `:966` declaram as coordenadas afinadas |
| 1.9 | conferir depois de 1.1-1.7 | — | — | — | cobertura p90 2,0 → **1,7 m** e máx 4,0 → **2,9 m** (teto 12,5) · MAP2B folga 2,30 m e área **42,6 / 42,2 m²** (teto 40) · MAP5 pior espaçamento 1,06 m e pior razão 0,84 **inalterados** (nada de prop removido) · CTF1 triângulo 18,08 m e distSpawn 12,1 m intactos; a maior linha de tiro até bandeira cai de 59,9 m junto com 1.7 |

**Conflito declarado que esta receita ATRAVESSA (e assume):** `:860-861` fixa 0,44 m na frente do spawn de propósito. A receita levanta **3,8 m dos 9,2 m** dessa borda (41%) e deixa cantos e bocas como estão. Não há alternativa medida que preserve 100% da decisão: platibanda 1,3 m = 0 de efeito; puxadinho+torre+varal sem tocar a borda = 100%→21,1%/20,4% (melhora 5×, não fecha). Chicane em S dentro da laje **não cabe**: 1,4 m de corredor + 2 muros + 1,25 m de folga = 4,53 m contra 3,80 m de profundidade disponível (medido: folga cai a 1,10 m e área a 38,8 m² — MAP2B vermelho nos dois).

---

## 2. Verticalidade  (alvo: ALT1 h90 ≥9 m, ≥1 cota andável nova)

Hoje: `massas=1010`, `h90=5,96`, `hmax=22,48`, **57 massas com topo ≥9 m** (8 postes 9,8 + 25 vãos de fiação 9,45 + 12 pipas + 12 rabiolas). Simulação sobre o vetor real de topos: +50 massas de topo 9,6 → **h90 9,33**; +70 → **9,60**. Com denominador final ≈1.205, o portão exige ≥122 massas ≥9 m; a receita entrega 142.

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 2.1 | **8 caixas d'água sobem para torre de ferro**, na MESMA pegada de hoje (`solidRadius .64`, sem nova área ocupada) | (∓12,05;−25), (∓12,05;−9), (∓12,05;2,4), (∓12,55;18) — `:919-926` | 4 pernas 0,12 × 3,90 × 0,12 (topo **9,10**) + tanque `targetH 1,35` em y 9,10 (topo 10,45) | `centerProp('caixa_dagua', {y: ROOF_H+3.9, …})` mantendo `detail:'tank'` e `occlude:true`; pernas por `addBox`, `ry` 5…13° | +40 massas ≥9 m; ALT1 h90 5,96 → ~9,4 |
| 2.2 | **base de alvenaria 1,9 m** em dois lados de cada torre (dentro da pegada atual) | ±0,57 m em x de cada (x,z) do 2.1 | 0,14 × 1,90 × 1,28 | `addBox` + `wallMat(MAT.brick,1.3,1.9)`, `ry` ±7° | devolve à altura do olho a massa que a torre levou pra cima: pares limpos 28,4% → **28,2%**; andabilidade −0,1% (8.376→8.368 células) |
| 2.3 | **+12 postes** de 9,8 m no beco, continuando a fileira de `:998` | (−5,8;−31), (5,7;−17), (−5,8;−6), (5,7;0), (−5,8;9), (5,7;17), (−5,8;25), (5,7;33), (−5,8;36), (5,7;−36), (−5,8;−21), (5,7;7) | 0,14 × 9,80 × 0,14, `collide:false` (como hoje) | **um `InstancedMesh`** (padrão `PropBatch`/`InstBatch` de `map_campomorro.js`), 1 draw call | +12 massas topo 9,8 |
| 2.4 | **+33 vãos de fiação** (3 fios por vão, gato de poste) | entre os 20 postes resultantes, mais 6 descidas para (∓13,4; −10/−2/17/20) | tubo Ø0,064, y 9,35-9,45, sag 0,45-0,81 | geometria em espaço LOCAL + `rotation.y = atan2` (hoje é construída em mundo, `ry=0`, e por isso não conta como girada) — 1 `InstancedMesh` | +33 massas topo 9,45 **e** +33 massas giradas (ORT1) |
| 2.5 | cota andável nova | (0;−30,2) e (0;30,2), atrás da platibanda 1.5 | faixa de 3,8 × 1,6 m | já existe como laje; a platibanda a transforma em **trincheira de spawn** (agacha atrás, atira por cima: 0,9-1,6 m) | nenhuma célula perdida além dos −3,0% medidos |

---

## 3. Visual e escala  (alvo: SUP2 ≤6%, SUP1 ≤40%, ORT1 ≥15%/20 ângulos, UV 128 px/m)

SUP2 medido hoje: **5.124 m² sem textura / 18.359 m² = 27,9%** (era 17,2% na dívida de 12/08 — regrediu 10,7 pp). Composição medida:

| ordem | material | área | malhas | o que é |
|---|---|---|---|---|
| 1 | `MAT.proxy` (`#ffffff`, `visible:false`) | **3.886 m²** | 22 | corpo INVISÍVEL dos blocos (`:576`, `:615`) — já marcado `userData.proxyGLB` (`:205`) |
| 2 | `MAT.wood` `#6d472b` | 336 m² | 23 | convés das 13+10 tábuas |
| 3 | `MAT.charcoal` `#25211e` | 299 m² | 115 | portas/janelas cegas do `wallWithRelief` |
| 4 | `MAT.woodDark` `#3e291d` | 257 m² | 313 | corrimãos e emendas do convés |
| 5 | `MAT.metal` `#252728` | 181 m² | 118 | postes, fios, portões de zinco, chaminés |
| 6 | piscina/água/assentos/marcadores | ~165 m² | ~40 | `pool`, `poolWater`, `water`, cadeiras, cilindros de ala |

| # | intervenção | onde | como | número que move |
|---|---|---|---|---|
| 3.1 | **`texel-check.mjs:337-339` passa a pular malha cujo material escolhido é `visible === false` OU que tem `userData.proxyGLB`** (é o mesmo marcador que o MAP4 já honra, `map-check.mjs:111-112`, e o mesmo teste que o `mapa-novo-gate.mjs:354` faz no SUP1) | régua, não mapa | 1 cláusula + mutante `proxy-contado` que devolve o 27,9% | **SUP2 27,9% → 8,6%**. Corrigir no mapa seria apagar o corpo dos blocos — proibido pelo contrato de `:612-614` |
| 3.2 | textura de madeira no convés e nos corrimãos | `MAT.wood`, `MAT.woodDark` (`:130-131`) | `externalTexture('/img/textures/tex_madeira.webp', …)` no padrão de `:116-124`; arquivo é 512² ⇒ **repeat = metros/4** para 128 px/m (convés 6,77×2,15 → repeat 1,69 × 0,54) | −593 m² sem textura |
| 3.3 | textura de zinco no metal (postes, portões, chaminé, fios) | `MAT.metal` (`:131`) | `externalTexture('/img/textures/tex_zinco.webp', …)`, repeat = metros/4 | −181 m² |
| 3.4 | porta/janela cega deixa de ser cor pura | `MAT.charcoal` (`:135`) | reusar `brick`/`corrugated` escurecido (`map` + `color 0x2a2724`) — não criar material novo sem `map` | −299 m² |
| 3.5 | conferir SUP1 | — | hoje **67/173 = 38,7%**, teto 40 — margem de 1,3 pp: **todo material novo desta receita tem que nascer com `map`** | 3.2-3.4 tiram 4 chapados: 63/177 = **35,6%** |
| 3.6 | **ORT1**: 2,3% / 15 ângulos hoje (23 de 1.010; as 426 caixas de `MAT.stair` e 162 de tijolo são degrau/guarda/relevo de muro e **não podem girar** sem quebrar o contrato "bala, corpo e pixel veem a mesma parede" de `:239-241`) | — | massa girada NOVA, em batches instanciados (ORT1 conta instância por instância, `mapa-novo-gate.mjs:364-376`) | ver tabela abaixo |

Pacote ORT1 (cada linha é um `InstancedMesh` = 1 draw call):

| batch | quantas | posição | dimensão | `ry` | massas giradas |
|---|---|---|---|---|---|
| `FERRAGEM` (ferro de coluna esperando o próximo andar) | 44 | 2 por `ROOF_PART`: (`x0+0,35`, `z0+0,35`) e (`x1−0,35`, `z1−0,35`), y 5,2 | 0,04 × 1,25 × 0,04 | `(i*23) % 90 °` | 44 (e ~30 ângulos distintos) |
| `TELHA` (telha de zinco encostada) | 22 | 1 por `ROOF_PART`, encostada na divisa nova | 1,15 × 0,05 × 0,85, tombada 55° | 4…17° | 22 |
| `CAIXOTE` (engradado de feira) | 24 | 2 por trecho de `MAIN_BECO`, rente ao painel de muro | 0,55 × 0,60 × 0,40 | 6…38° | 24 |
| antenas novas (`addAntenna`, já gira) | 10 | lajes sem antena: (∓12,3;−27), (∓12,3;−13), (∓12,3;0), (∓12,3;12), (∓12,3;24) | mastro 2,25 | 0,07…0,48 rad | 10 |
| estruturais desta receita | 4×3 passarela + 20 divisa + 16 base de torre + 33 fiação | ver seções 1 e 2 | — | 1…17° | 81 |
| **total** | | | | | **181 giradas + 23 atuais = 204 de ~1.205 = 16,9%** ✓ e >20 ângulos ✓ |

Custo: +72 malhas estruturais + 5 batches instanciados ⇒ **1.857 → ~1.935 draw calls** (teto declarado: `fy_mansao` 2.038). Triângulos +~9 k sobre 32,6 k.

---

## 4. Brasilidade  (o que faz alguém reconhecer o lugar)

O mapa já tem os três marcadores que a `lajes-rooftop` mede (tank 8, antenna 6, clothesline 5), pipa, carretel, gato de telhado, caramelo, galo e panela no `BIOME_SHOTS.favela`. O próximo degrau é o que falta:

| # | o que falta | x,z | dimensão | como | régua/efeito |
|---|---|---|---|---|---|
| 4.1 | **fiação de poste emaranhada** (gato de luz) | 20 postes, 33 vãos + 6 descidas para parede | Ø0,064, y 9,35 | 2.3/2.4 | ALT1 +45 massas ≥9 m; é a assinatura visual da comunidade vista de baixo |
| 4.2 | **laje com ferragem exposta** | 44 pontos das quinas internas das lajes | 0,04 × 1,25 | batch `FERRAGEM` (3.6) | ORT1 +44; diz "esta laje vai virar o 2º andar" |
| 4.3 | **tijolo aparente** nas peças novas | platibanda (0;∓28,56), 20 divisas, 16 bases de torre | — | `wallMat(MAT.brick, …)` com `lajes_tijolo_baiano_color.webp` (1024², repeat = metros/8) | SUP2 não sobe; a massa nova nasce texturada |
| 4.4 | **boteco de esquina** (balcão + toldo + placa + lampião) | painel de muro do trecho `BRANCHES[1]` (`[[2.5,2],[-4.2,2]]`, largura 1,76 m), lado `side=-1`, **rente ao painel emitido** (`off = wall.width/2 + wall.backOff`, `:509`) | balcão 2,0 × 0,90 × 0,25; toldo 2,2 × 0,10 × 0,70 em y 2,10 | `addBox` + `T.signBoteco` + `T.awning`; GLB opcional `fachada_comercio`/`lampiao_fachada`/`banco_jardim` com fallback procedural (padrão `detailFallback :244`) | avança só 0,25 m ⇒ beco de 1,76 → **1,51 m**, dentro de `lajes-spatial` LS4 (w50 1,40-1,90). **Nunca** nos trechos de 1,62 m (`i % 5 === 1`, isto é `i=1,6,11`): lá 1,62−0,25 = 1,37 reprova LS4 |
| 4.5 | **som de baile** localizado | caixa em (−12,2;12,4), y 5,2 (ao lado da churrasqueira de (−11,9;11,2), 1,2 m livre) | `targetH 1,6`, `solidRadius 0,45` | `centerProp('caixa_som_baile', …)` + loop posicional `{src: AMB_LOOPS.funk, pos:[-12.2,6.2,12.4], radius:18, vol:.5}` somado a `sound.loops` (`:1255`); o funk global de `radius:60, vol:.3` vira ambiente | dá lugar ao som: hoje o funk sai do centro do mapa (0,3,0) |
| 4.6 | **tanque de roupa** ao lado dos varais existentes | (−9,4;−15,2), (9,4;−3,2), (−9,4;16,7), (9,4;25,2) | 0,80 × 0,55 × 0,60 | `addBox` + `MAT.pool`/`plaster` (com `map`) | fecha a leitura "varal + tanque" da laje; 4 coberturas de 0,55 m |

---

## 5. Ordem de execução e custo

| passo | o que | número que fecha | risco |
|---|---|---|---|
| 1 | 3.1 (`texel-check` pula `proxyGLB`) + mutante `proxy-contado` | **SUP2 27,9% → 8,6%** | é mudança de régua: sem o mutante, ninguém sabe se ela morde. Não tocar nas 22 caixas proxy do mapa (`:612-614`) |
| 2 | 3.2-3.4 (madeira/zinco/porta texturadas) | **SUP2 → ~1,1%**, SUP1 38,7% → 35,6% | material novo sem `map` estoura SUP1 (margem de só 1,3 pp) |
| 3 | 1.1-1.6 (4 passarelas + platibanda central de 1,9 m) | **MAP2 100/100 → 0,0/0,0; visada de spawn → 0 m** | MAP2B área cai 47,1/46,3 → 42,6/42,2 m² (teto 40): não engordar mais nada dentro do disco de 5 m do spawn. Passarela precisa do colisor GIRADO de `:735`; AABB no lugar dele sela a laje (medido: 8.646 → 1.439 células). Atravessa a decisão de `:860-861` |
| 4 | 1.7 + 2.1/2.2 (20 divisas + 8 torres com base) | **pares com visada limpa 100% → 28,2%**, maior visada 70,3 → 57,3 m, ALT1 h90 5,96 → ~9,4 | colocar divisa/casinha sem medir custa região inteira: 3 casinhas mal postas derrubaram 8.646 → 4.880 células. Portão da divisa **centrado em x=±10,3 com ≥1,8 m** ou os links do grafo (`:1140-1146`) passam a atravessar parede |
| 5 | 2.3/2.4 + pacote ORT1 (3.6) | **ALT1 h90 ≥9,3 · ORT1 2,3% → 16,9% e >20 ângulos** | draw calls 1.857 → ~1.935 (teto 2.038); tudo em `InstancedMesh`, nada de clone solto |
| 6 | costura da escada (patamar de topo × degrau 13: 0,347 m) + arquivo morto | destrava o térreo no flood ⇒ MAP2/MAP5 passam a medir os 16 quadrantes (hoje 11 têm `areaAndavel=0`) | **re-rodar `map-check`**: com o térreo dentro, MAP5 é recalculado sobre ~1.000 m² novos e a exposição de referência passa a ser 62,0%/54,7% (base) → 0,0%/0,0% (com o passo 3). Não mexer em largura/lances/nº de degraus: `lajes-spatial` exige largura 1,10-1,40, ≥2 lances, ≤16 degraus |
| 6b | `map_lajes.js` (1.356 linhas) sai; `map-source-check.mjs:37/48/59-66`, `lajes-visual-check.mjs:24/29/53/111/122` e `graffiti-editorial-check.mjs:34-135` param de validar arquivo morto | 3 réguas voltam a medir o mapa SERVIDO | **`lajes-authored-check.mjs:33` (`semCasca`) proíbe `makeHorizon(` no fonte autoral** — portar o horizonte do arquivo morto REPROVA a régua. Decisão do dono: (a) apagar o morto e ficar com o backdrop instanciado de `:1081-1100`, (b) mudar a cláusula `semCasca`. Builder não escolhe |

---

## 6. O que eu NÃO consegui decidir sem olhar figura

1. Se a platibanda de 1,9 m × 3,8 m na frente do spawn mata a leitura de sacada que `:860-861` protege — e se as setas de rota (`:1050-1053`) e os marcadores de ala (`:1055-1058`) continuam legíveis de dentro da trincheira. O número fecha; a sensação de "nasci numa laje aberta" é figura.
2. Se a passarela coberta lê como passarela de comunidade (tábua + zinco) ou como tubo de corredor. Telha de uma ou duas águas, e se a lateral deve ser tábua vazada em vez de muro cheio (vazado muda a occlusão e eu teria que re-medir).
3. Se subir as 8 caixas d'água para 9,1 m tira delas justamente o papel de leitura cultural na altura do olho que a `lajes-rooftop` foi escrita para garantir. A base de alvenaria (2.2) repõe a massa, não repõe o ícone.
4. Quais dos 90 detalhes girados do pacote ORT1 são cenário e quais são lixo visual — 44 ferragens e 22 telhas podem virar poluição na silhueta da laje.
5. Se o boteco cabe visualmente rente ao painel de 1,76 m ou se pede o bolso de esquina (que o contrato limita a 2,4 m).

---

## Veredito por régua existente

| régua | a proposta a mantém verde? |
|---|---|
| `lajes-rooftop` (tank≥8/antenna≥5/clothesline≥4, 3/4 quadrantes cada) | **Sim** — as 8 caixas continuam nos mesmos (x,z) com `detail:'tank'`, ganham 10 antenas (6→16) e 4 tanques de roupa; nenhum quadrante perde item. |
| `lajes-visual` | **Sim, e é o problema** — ela importa `public/js/map_lajes.js` (`:24/:29`), arquivo que o jogo não carrega; a proposta não o edita até o passo 6b, que é decisão do dono por causa de `semCasca`. |
| `lajes-authored` (LA1 registro, assets≥4, `semCasca`) | **Sim** — `maps.js:9/71` continua importando o autoral, os 9 assets seguem citados, e a receita **não** introduz `makeHorizon(`/`loadShell(` no fonte autoral. |
| `lajes-spatial` (LS1 spawn em laje, LS2 2 rotas altas, LS3 ≥70% alto, LS4 beco 1,40-1,90, LS6 apex, escadas) | **Sim** — spawns intactos em y 5,2; as 4 bocas seguem abertas (andabilidade 8.646→8.384, −3,0%, sem região perdida); nada somado ao térreo além dos 0,25 m do balcão em trecho de 1,76 m; `jumpImpulse 5.85` intocado; a costura da escada não altera largura/lances/degraus. |
| `lajes-gap` (tábua rente à laje) | **Sim** — passarelas nascem em y=5,20 exato (topo do convés) e não deslocam nenhum `PLANKS`. |
| `lajes-circuito` (LC2 cobertura ≥0,92 do beco) | **Sim** — tudo novo está sobre as lajes; a única peça no beco é o balcão de 0,25 m rente ao painel, e os 12 postes novos são `collide:false` como os 8 de hoje. |
| `lajes-antitrap` (AT1, nicho sem saída) | **Sim, com verificação obrigatória** — a platibanda fica no vão central (cantos seguem 0,44 m: sem nicho de canto), e a medição do pacote mostra −0,1% de células nas divisas/bases; qualquer casinha extra precisa passar pelo delta de células (uma posição ruim custou 3.500 células). |
| MAP1 / MAP4 / MAP6 | **Sim** — `corpoDentroDeSolido 0` e `bordasSemGuarda 0` se mantêm: toda peça nova é `addBox` com colisor e occluder coerentes, e nenhuma caixa proxy é criada ou apagada. |
| MAP2 / MAP2B | **MAP2 fica 0,0%/0,0%** (precedente `loja_h`); MAP2B segue verde com folga 2,30 m e área **42,6/42,2 m²** — margem de 2,2 m² sobre o teto de 40, o número mais apertado da receita. |
| MAP5 / CTF1 | **Sim** — nenhum prop removido (espaçamento 1,06 m, razão 0,84), triângulo 18,08 m e 12,1 m de distância ao spawn intactos; re-medir depois do passo 6 porque 11 quadrantes voltam a ter área. |
| ORT1 / ALT1 / SUP1 / SUP2 | **Passam de vermelho a verde**: 2,3%→16,9% e 15→>20 ângulos; h90 5,96→~9,4; SUP1 38,7%→35,6%; SUP2 27,9%→~1,1%. As dívidas `ORT1:fy_lajes`, `ALT1:fy_lajes`, `SUP1:fy_lajes` e `SUP2:fy_lajes` de `mapa-novo-gate.mjs:172-205` saem da lista (o próprio portão manda remover dívida quitada) — e note que `SUP2:fy_lajes` está declarada como 17,2% e hoje mede 27,9%: a dívida regrediu 10,7 pp sem ninguém ver. |
