<!-- Receita gerada em 12/09/2026 por rodada de análise com contexto limpo.
     Medições: node tools/eval/map-check.mjs all + node tools/eval/mapa-novo-gate.mjs (12/09) e
     sondas em memória sobre tools/eval/harness.mjs. Índice: ../RECEITAS-MAPAS.md -->

# Atacadão da Treta (`atacadao_treta`) — receita

## 0. Leitura do arquivo (o que existe hoje)

Arena 52×75 m em dois blocos ligados por 3 vãos de porta na fachada `ZF=-6`: **loja fechada** ao norte (`z -6..33`, teto opaco a 8 m — `:77`,`:80-85`) e **estacionamento aberto** ao sul (`z -42..-6`, asfalto — `:78`).

- Fachada com vãos `[-15,-9] [-3,3] [9,15]`, verga sem colisor e vitrine de vidro **sem colisor e sem occluder** acima de 2,6 m — `:88-102`.
- Salão: 5 fileiras de `gondola_*` em `z=3,9,15,21,27`, vão central x∈[-2,2] livre de propósito para a 2ª rota CTF2 — `:107-112`; fileiras laterais em x=±15 — `:113`; frente de caixa em `z=ZF+4` — `:115-119`.
- Pátio: 3 fileiras de vaga em `z = ZF-8/-16/-24`, 24 carros GLB com **colisor `maxY = 1,5 m`** — `:143-146`. Muro lateral 2,4 m — `:135-137`.
- Backdrop sem colisor: 9 prédios + 45 faixas de janela em `z=ZS-27` (`:166-170`), casario (`:162-164`), trânsito (`:174`).
- `groundHeightAt = () => 0` (`:212`) — **zero cota andável**. Céu = `scene.background = Color(0xdfe6ec)` (`:76`), sem `setMapSky`. Grafite (`:230-240`), ambience e `sound.loops` hum+cidade (`:248-266`) já existem.
- Medido: 362 malhas, 5.112 triângulos, 65 occluders, 208 massas — mapa **leve**, há folga de orçamento.

### 0.1 Comparação com o PR #582 (draft, MERGE DIRTY, +538/−59 em `map_atacadao.js`)

| # | Frente | #582 | Esta receita |
|---|---|---|---|
| 1 | Layout interno (6 fileiras/48 módulos, 4 corredores 4,1 m, doca, frente de caixa) | **faz** | **não duplica** — adoto |
| 2 | Âncora do lattice `ceil((v−1,6)/3,2)·3,2+1,6` | **faz** | **adoto como lei** — toda coordenada minha é midway |
| 3 | `ZF −6→−12`, `ZN 33→36,2`, `WALL_H 8→11` | **faz** | **preciso do `WALL_H 11`** (§2) |
| 4 | 5 canvas de superfície (piso/doca/fachada/parede/azulejo) | faz | **não cobre os 3 maiores ofensores (53,7 pp)** — §3a |
| 5 | Pátio: moto, cancela, lava-rápido, sorvete, 9 postes (q1,0 → 5,16 m) | faz | conflito parcial — ver abaixo |
| 6 | B spawn → doca 33,2; B flag → (0, 25,6) = 11,05 m | faz | mantenho |
| 7 | MID → praça de caixas (−1,6, −1,6) | faz | **cedo pra ele** |
| 8 | **Exposição de spawn 45,9% × 7,8%** | **não mede, não conserta** | **§1 — 45,9% → 10,9%** |
| 9 | **Bandeira E a 7,28 m do próprio spawn** | **não toca** | **§1 — 7,28 → 11,0 m** |
| 10 | **ORT1 0,0% / 1 ângulo** | **não move** (rack e pátio de esquadro) | **§3b — ≈41% / 25 ângulos** |
| 11 | **Cota andável** | **não faz** (`groundHeightAt` segue `()=>0`) | **§2 — mezanino** |
| 12 | **Céu** | **não chama `setMapSky`** | **§4 — `sky_havan.webp`** |
| 13 | Som | deixa **mudo** (fail-closed) | mantenho hum+cidade + PA |

**Conflitos a resolver:** com `ZF=-12` meus itens 11/12 (`z=-9,6`) vão para `z=-16,0` e o item 13 (`-1,6,-12,8`) **sai** (vira parede). Meus racks x=±15 colidem com os dele (x=±11,2/±17,6): aplique só a **altura 9,2 m** nos racks dele. O lava-rápido dele em (−22,0,−37,4) colide com meu item 14: fique com o dele e mova a guarita para (−20,8, −29,0).

Convenção: `ANG = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,24,26,28,31,35,41].map(d=>d*Math.PI/180)` — 25 inteiros distintos; sinal não altera o ângulo medido (`mapa-novo-gate.mjs:233` dobra em 90°/45°).

---

## 1. Jogabilidade e dificuldade (MAP5 ≤7 m · cover ≤12,5 m · CTF1 >4,5 m e ≥9 m do spawn · exposição ↓)

**Causa medida da assimetria 45,9% × 7,8%:** dos 408 pares (observador ≥25 m × spawn E) que enxergam a cabeça, **262 (64%) estão dentro do próprio estacionamento**, 103 na faixa sul da loja. Motivo único: **os 24 carros têm colisor `maxY = 1,5 m` (`:145`) e o olho da régua está em 1,62 m (`map-check.mjs:63`)** — não há UMA massa acima da altura do olho em 36 m de asfalto. Não é problema de spawn; é de geometria. **Não mexo em `spawns`.**

### 1a. Pátio de carga em `z = −22,4` — a massa que faltava acima de 1,62 m
5 pistas centradas em coluna de nó (`x = ±20,8, ±11,2, 1,6`), alimentando os 3 vãos de porta.

| # | intervenção | x,z | dimensão (m) | como | número que move |
|---|---|---|---|---|---|
| 1 | caminhão baú da distribuidora | −16,0 · −22,4 | 5,2×2,2×**3,2** | `placeProp('vw_9150',{targetLen:5.2,targetH:3.2,ry:ANG[0]})` — id **declarado em `:11` e nunca usado** | exposição E 48,5→19,9% |
| 2 | ônibus de excursão do sacoleiro | −4,8 · −22,4 | 8,4×2,2×**3,2** | `placeProp('onibus_urbano',{targetLen:8.4,targetH:3.2,ry:−ANG[3]})` + id no `ATACADAO_PROPS` | idem |
| 3 | torre de fardo de arroz sobre palete | 6,4 · −22,4 | 5,2×2,2×2,6 | `InstBatch` 12 fardos 1,2×0,45×0,9 (`T.crate`) + palete `aoBoxGeo(5.2,0.15,2.2)` | idem |
| 4 | 2º caminhão baú | 16,0 · −22,4 | 5,2×2,2×**3,2** | `PropBatch.add('vw_9150',…,ry:−ANG[1])` (mesmo lote do #1) | idem |
| 5–6 | pilha de engradado de cerveja no muro | ±24,4 · −22,4 | 2,2×2,2×2,6 | `InstBatch` 24 engradados 0,5×0,3×0,35 (`T.crate2`) | fecha as pistas de muro |

### 1b. Ilhas das pistas laterais e da fachada

| # | intervenção | x,z | dimensão (m) | como | número que move |
|---|---|---|---|---|---|
| 7 | contêiner de vasilhame | −24,4 · −30,4 | 2,2×6,4×2,6 | `placeProp('junkyard_container',{targetLen:6.4,targetH:2.6,ry:ANG[1]})` | 19,9→18,2% |
| 8 | corral coberto de carrinho | 24,4 · −30,4 | 2,2×6,4×2,6 | 4 postes 0,12 + telha 2,6×6,8 a 2,6 m + `PropBatch` 6× `shopping_cart`, `ry:−ANG[4]` | idem + MAP5 q3,0 |
| 9 | torre de palete envelopado | −24,4 · −12,8 | 2,2×6,4×2,6 | `InstBatch` 9 paletes 1,0×0,6×1,2 (`T.crate2`), `ry:ANG[8]` | idem |
| 10 | quiosque de pastel/açaí | 24,4 · −12,8 | 2,2×6,4×2,6 | `placeProp('quiosque')` + `placeProp('guarda_sol')`, `ry:−ANG[11]` | idem |
| 11 | ilha de oferta coberta (cerveja) | −16,0 · −9,6 | 8,4×2,2×2,6 | toldo `T.awning` 8,4×2,4 a 2,6 m + `InstBatch` engradados, `ry:ANG[2]` | 18,2→**11,1%** |
| 12 | ilha de oferta coberta (arroz 5 kg) | 16,0 · −9,6 | 8,4×2,2×2,6 | idem com `T.crate`, `ry:−ANG[1]` | idem |
| 13 | totem de preço + painel | −1,6 · −12,8 | 4,4×2,2×2,4 | `placeProp('painel_tvs')` + `signMesh`, `ry:ANG[3]` | idem — **sai se o #582 entrar** |

### 1c. Flancos da linha de spawn E (tiro cruzado dentro da própria fileira: sobravam 8+8 pares em `z≈−38,4, x=±19,2`)

| # | intervenção | x,z | dimensão (m) | como | número que move |
|---|---|---|---|---|---|
| 14 | guarita do segurança + cobertura | −20,8 · −36,0 | 4,2×4,2×2,6 | guarita 2,4×2,5×2,4 (`T.concrete`) + telha, `ry:ANG[5]` | 11,1→**10,1%**; MAP5 q0,0 |
| 15 | gaiola de botijão de gás | 20,8 · −36,0 | 4,2×4,2×2,6 | grade 0,1 + `PropBatch` 6× `botijao_gas`, `ry:−ANG[7]` | idem; MAP5 q3,0 |

MAP2B fica de pé: folga do slot mais próximo (`x=±14`) = **6,0 m** (mínimo 1,2); nenhum item entra em `z∈[−40,−34] ∩ x∈[−16,16]`.

### 1d. MAP5 — os 4 quadrantes rasos do pátio
Coordenadas em **midway do lattice** (`x ≡ 1,6 mod 3,2` a partir de −24; `z ≡ 0 mod 3,2` a partir de −40) e **massa solta com lado ≤1,8 m** (0,9 + inflate 0,5 = 1,4 < 1,6). Foi aqui que a 1ª versão desta receita reprovou o CTF2 (1 rota em `E→B` e `B→B`) com torres de 2,2 m.

| # | intervenção | x,z | dimensão (m) | como | número que move |
|---|---|---|---|---|---|
| 16–18 | 3 carrinhos largados na vaga | −11,2·−29,0 / −4,8·−31,5 / −8,0·−25,4 | 1,0×1,2×0,95 | `PropBatch('shopping_cart')`, `ry` ANG[18]/ANG[21]/−ANG[23] | **q1,0 9,44 → 5,97 m**; razão 0,29→0,46× |
| 19–20 | poste de iluminação de pátio | −14,4·−33,0 / 3,2·−26,0 | 0,68×0,68×**6,0** | `addBox` + luminária emissiva 1,5×0,22 a 5,8 m | q1,0 / q2,0 |
| 21 | pilha de pneu da borracharia | 9,6 · −33,6 | 2,0×2,0×1,4 | `placeProp('pilha_pneus',{ry:ANG[13]})` | **q2,0 6,36 → 5,20 m** |
| 22 | caçamba de papelão | 1,6 · −19,2 | 2,4×1,8×1,6 | `placeProp('dumpster',{ry:−ANG[9]})` | q2,0/q2,1 |
| 23–26 | 4 motos na vaga coberta | 19,2·−35,2 / 22,4·−35,2 / 19,2·−28,8 / 22,4·−28,8 | 0,9×1,9×1,15 | `PropBatch('moto_cg')`, `ry` ANG[12]/−ANG[15]/ANG[19]/−ANG[10] | **q3,0 14,05 → 5,30 m**; razão 0,13→0,58× |

### 1e. Torres de fardo nos corredores da loja (mata alamedas de 62–69 m)

| # | x,z (16 torres) | dimensão | como | número que move |
|---|---|---|---|---|
| 27–32 | ±19,2 · {0 · 12,8 · 25,6} | 1,8×1,8×2,4 | `InstBatch` 4 fardos 1,6×0,55×1,6 (`T.crate`), `ry` ANG[16],−ANG[19],ANG[9],−ANG[13],ANG[24],−ANG[2] | visada E 70,5 → **62,3 m** |
| 33–36 | ±22,4 · {6,4 · 19,2} | 1,8×1,8×2,4 | idem, `ry` ANG[17],−ANG[6],−ANG[22],ANG[14] | idem |
| 37–40 | ±12,8 · {6,4 · 19,2} | 1,8×1,8×2,4 | idem | visada B 69,0 → 66,2 m |
| 41–42 | ±9,6 · −3,2 | 1,8×1,8×2,4 | idem (ombro das portas) | exposição E |

### 1f. Bandeiras — as duas de ponta saem do colo de quem defende

| item | de | para | dist. ao próprio spawn | por quê |
|---|---|---|---|---|
| **E** `:269` | (−8, −30) | **(−11,2, −26,4)** | **7,28 → 11,0 m** | bolso entre os carrinhos #16 e #18; **o #582 não conserta esta** |
| **B** `:271` | (−8, 24) | **(−8, 18)** | **5,00 → 11,0 m** | corredor entre `z=15` e `z=21`; se o #582 entrar use (0, 25,6) = 11,05 m |
| **MID** `:270` | (10, −8) | **(10, −2)** | 29,3 → 31,0 m | sai da calçada de E e entra na loja, ao lado do caixa `x=7,5`; cedo para (−1,6,−1,6) |

### 1g. Números medidos do conjunto (harness em memória, layout injetado)

| régua | hoje | com a receita | teto |
|---|---|---|---|
| MAP2 exposição **E** | 45,9% (48,5% no meu instrumento) | **10,9%** (≈10,3% escalado) | ↓ |
| MAP2 exposição **B** | 7,8% | **5,0%** | ↓ |
| **assimetria E/B** | **5,9×** | **2,2×** | — |
| maior visada (E) | 70,5 m | **62,3 m** | — |
| MAP5 pior espaçamento | **14,05 m** (q3,0) | **5,97 m** (q1,0) | ≤7 |
| MAP5 pior razão prop | **0,13×** | **0,46×** | ≥0,35 |
| q0,0 / q1,0 / q2,0 / q3,0 | 7,72 / 9,44 / 6,36 / 14,05 | **5,46 / 5,97 / 5,20 / 5,30** | ≤7 |
| quadrantes `99` | 0 | 0 | 0 |
| CTF2 mínimo de rotas | 2 | **2** (`E→E 2 · E→MID 2 · E→B 2 · B→E 2 · B→MID 3 · B→B 3`) | ≥2 |
| CTF1 altura do triângulo | 18,0 m | **19,4 m** | >4,5 |
| CTF1 menor dist. bandeira↔spawn | **5,00 m** | **11,0 m** | ≥9 |
| cover-3s pior | — | **4,70 m** | ≤12,5 |
| rotação mais longa | — | 69,9 m = **16,8 s** | ≤25 s |
| nós de waypoint | 283 | 261 | — |

---

## 2. Verticalidade (ALT1 h90 ≥9 m · ≥1 cota andável nova)

**Achado que ninguém mediu:** o ALT1 é percentil, então **densificar derruba o h90**. Medido: as ~195 massas baixas das §1/§3 com `WALL_H = 8` levam **h90 de 10,5 m para 8,0 m — ALT1 REPROVA**. Com `WALL_H 8→11` + 20 montantes de rack de 9,2 m, **h90 = 11,0 m** e 78 massas ficam acima de 9 m.

| # | intervenção | x,z | dimensão (m) | como | número que move |
|---|---|---|---|---|---|
| 43 | **pé-direito 8 → 11 m** | global | `WALL_H = 11` (`:18`) | sobe parede norte `:80`, laterais `:81`, laje `:82`, 12 pilares `:85`, vitrine `:92`/`:96` | **ALT1 h90 8,0 → 11,0 m** |
| 44 | fileiras laterais viram **porta-palete de 9,2 m** | ±15,0 · z ∈ {4,10,16,22,28} | 2,1×1,2×**9,2** | 2 montantes `aoBoxGeo(0.12,9.2,1.2,{material:T.metal})` + 4 níveis de carga 2,1×0,9×1,2 em `InstBatch` (`T.crate2`) — substitui o `shelfUnit` de 1,9 m do `:113` | +20 massas ≥9 m; visada do mezanino **10/48 → 2/48 pares** |
| 45 | **mezanino de estoque** | x ∈ [−24,4, −13,6] · z ∈ [17,6, 31,4] | 10,8×13,8, piso **y = 3,6** | idioma `MZ/ESC/RAMP` de `map_havan.js:1027-1098` + contrato `stairs`/`levels` de `map_havan.js:2008-2010` | 1ª cota andável do mapa |
| 46 | **`groundHeightAt` deixa de ser constante** | — | — | `MEZ={x0:-24.4,x1:-13.6,z0:17.6,z1:31.4,h:3.6}`; devolve `MEZ.h` no footprint e `+ESC.espelho/2` na escada — substitui `:212` | sem isso o andar é inalcançável a pé (`map_havan.js:1666-1673`) |
| 47 | escada em L, 20 degraus | x ∈ [−24,4, −21,8] · z 17,6→23,4 | espelho 0,17 · piso 0,29 · larg. 2,6 | 20 degraus em `InstBatch` (1 draw) | acesso; evita MAP3 |
| 48 | guarda-corpo 1,1 m | x=−13,6 (z 17,6→31,4) e z=31,4 | 0,2×1,1 | `addBox` com `T.metal` | **MAP6 bordas sem guarda 0 → 0** (sem isso vira 2) |
| 49 | **parede cega do estoque** | −19,0 · 17,7 | 10,8×**4,4**×0,3, base y=3,6 | `addBox` `T.concrete` + janela de escritório | sem ela o mezanino vira ninho: medi **67,3 m** de (−23,4·28,2) até o spawn E. Com 49+44: **62,3 m** |

O mezanino olha a doca e o corredor oeste, **não a fachada**; está na metade de B e ainda assim a exposição de B cai de 7,8% para 5,0%.

---

## 3. Visual e escala (SUP2 ≤6% · SUP1 ≤40% · ORT1 ≥15%/20 ângulos · UV 128 px/m)

### 3a. SUP2 60,8% — medido material por material (mesma função de área do portão, `mapa-novo-gate.mjs:242`)
**Área total 24.561 m², sem textura 14.932 m² (60,8%). Três materiais = 53,7 pp**, e os cinco canvas do #582 não tocam nenhum: são backdrop e estrutura.

| material | área | % | linha | conserto | resultado |
|---|---|---|---|---|---|
| `MAT.janela` `#35404e` (45 malhas) | **4.827 m²** | **19,65%** | `:168` | é **caixa de 6 faces em volta do prédio**; 74% é topo/base enterrado. Vire **plano 6,5×1,1 só na face +z** com canvas `janelaTex` semeado por LCG e **`applyAniso`** (régua dos PRs #547/#563) | → **322 m² COM textura** |
| `MAT.metal` `#9aa0a6` (21 malhas) | **4.633 m²** | **18,86%** | `:82`,`:84`,`:152-153` | laje é caixa 52×0,4×39 = 4.129 m² e só a face de baixo é vista → **plano 52×39 virado para baixo em y=WALL_H** com `T.metal`; e `MAT.metal = lam(tex('metal',0x9aa0a6))` resolve vigas e pórticos | → **2.028 + 504 m² com textura** |
| `MAT.predio` `#a7a29a` (9 malhas) | **3.727 m²** | **15,17%** | `:167` | mesmo defeito → **plano w×h na face +z** com `T.concreteDark` | → **760 m² com textura** |
| `MAT.prat` `#8a9096` (40 malhas) | 639 m² | 2,60% | `:67` | é o **fallback** da gôndola — e no portão o GLB nunca carrega, então é isto que a régua mede. `lam(tex('crate2',0x8a9096))` | com textura |
| claraboia falsa `#dff0f7` | 507 m² | 2,06% | `:83` | plano translúcido **sob laje opaca**: mentira física. Remover; 6 domos 2,4×2,4 na laje | −507 m² |
| `MAT.vidro` `#9fd0e6` | 370 m² | 1,50% | `:92`,`:96` | 60% da faixa vira **painel de oferta opaco** (`T.posters[i]` — é **array**, `textures.js:495`) e entra em `occluders` | 220 m² ficam sem |

**SUP2 60,8% → 4,1%** só com estas 6 linhas; **≈3,6%** com a área nova texturizada. **SUP1** 30,5% cai junto.
**Regra dura:** toda caixa de fallback nasce com textura do `T` e UV em metros via `aoBoxGeo(w,h,d,{material})`, alvo `ALVO_PXM = 128` (`vao.js:43`). Prop GLB **não conta** no portão — ele não carrega lá.

### 3b. ORT1: 0,0% girada, 1 ângulo, 208 massas — onde girar é legítimo
Gôndola de atacarejo **é** alinhada; girar rack é mentir. Cinco lugares, e só eles:

| onde | por quê | massas giradas | ângulos |
|---|---|---|---|
| **entorno/skyline** (9 prédios `:170` + 45 planos de janela `:168`) | a cidade do outro lado da rua **não está na grade da loja** — maior ganho, mais barato | **54** | 9 (ANG[0..8]) |
| **casario lateral e norte** (`:162`,`:164`) | idem — e hoje **somem sem GLB** porque `prop()` não tem fallback (`:65`); dê caixa 6×6×6 com `T.concrete` | **13** | 13 |
| **pátio/carga** (itens 1–26) | caminhão manobrando, moto, carrinho largado, caçamba, guarita | **≥52** | reaproveita |
| **torres de fardo/palete** (itens 27–42) | fardo empilhado à mão torce | **≥48** | reaproveita |
| **fila de caixa** (`:115-120`) | `ry = ±ANG[k]` nos 3 `shopping_cart` e na esteira | 4 | reaproveita |
| **NÃO girar** | fachada, vergas, pilares, racks, gôndolas, muros, frente de caixa | — | — |

**≥167 giradas sobre censo ~403 ⇒ ≈41%** (teto 15%) e **25 ângulos distintos** (teto 20), contra 0,0%/1 hoje.

### 3c. Fachada e iluminação
- A vitrine acima de 2,6 m **não é occluder** (`collide:false` em `:92`/`:96` nunca entra na lista do `:60`): o tiro atravessa vidro que parece parede. Os painéis de oferta entram em `occluders`.
- A laje é `cast:false` (`:82`) — **o sol atravessa a laje**. Ponha `cast:true`; a luminária industrial pendurada é **exatamente o que o #582 faz** (15 luminárias, 9 com luz local) — não duplique. Se ele não entrar, copie o galpão do `map_campomorro.js`.

---

## 4. Brasilidade

| # | item | x,z | dimensão | como | efeito |
|---|---|---|---|---|---|
| 50 | **céu do estacionamento** | — | — | `setMapSky(scene,T,'/img/textures/sky_havan.webp',0xdfe6ec)` no lugar do `:76`. **Asset já existe**, é do mapa irmão de big-box (`map_havan.js:1643`) | tira a cor chapada; `eval:look` mede o céu usado |
| 51 | **cartaz de oferta escrito à mão** | ±16·−9,6; ±19,2·12,8 | 2,4×1,0 | `signTex` (`:23`) com traço irregular + textos que o mapa já tem (`:132`) e "LEVE 3 PAGUE 2" | leitura instantânea de atacarejo |
| 52 | **torre de fardo de arroz** | itens 3, 12, 27–42 | 1,6×0,55×0,9 cada | `InstBatch` com `T.crate` | a silhueta que define atacarejo |
| 53 | **caixa de cerveja empilhada** | ±24,4·−22,4 e −16,0·−9,6 | 0,5×0,3×0,35 | `InstBatch` com `T.crate2` (caixa CORREIOS, `textures.js:420`) | idem |
| 54 | **fila de carrinho no corral** | 24,4 · −30,4 | 6× `shopping_cart` | `PropBatch` (item 8) | "o carrinho volta pra algum lugar" |
| 55 | **segurança na porta** | −20,8 · −36,0 | guarita 2,4×2,5×2,4 | item 14 + `signMesh` "REVISTA NA SAÍDA" | — |
| 56 | **carrinho largado torto** | itens 16–18 | — | `ry` 23°/28°/35° | detalhe que só o Brasil tem |
| 57 | **pombo no vigamento, rato na doca** | já existe `:248-263` | — | com `WALL_H=11`, pomba para `y=5,13` (como o #582) | — |
| 58 | **anúncio do alto-falante** | (0, 6, 4) raio 40, vol .15 | — | **único asset novo**: `public/audio/amb/pa-atacadao.mp3` + chave `pa` em `AMB_LOOPS` (`soundscape.js:6`). One-shot por mapa **não existe** (só `BIOME_SHOTS[bioma]`, `soundscape.js:47`) → entra como loop posicional em `:266` | **mantenha `hum`+`cidade`** — não siga o #582, que deixa o mapa mudo |
| 59 | **painel de TV da seção de eletro** | −1,6 · −12,8 | item 13 | `placeProp('painel_tvs')`, já usado em `:122` | — |

---

## 5. Ordem de execução e custo

| passo | o que entra | número que fecha | risco |
|---|---|---|---|
| **1** | §3a inteira + `setMapSky` | **SUP2 60,8% → 4,1%**; SUP1 ↓ | zero de jogabilidade (é backdrop e laje) — maior número pelo menor esforço |
| **2** | `WALL_H 8→11` (43) + racks 9,2 m (44) | **ALT1 seguro em h90 11,0 m** (senão cai a 8,0 no passo 3); visada do mezanino 67,3→62,3 m | conflita com o #582 — se ele entrar, só suba a altura dos racks dele |
| **3** | §1a–1e (itens 1–42) | **exposição E 45,9→10,9%; assimetria 5,9×→2,2×; MAP5 14,05→5,97 m; cover 4,70 m** | **o CTF2 já mordeu**: com torres de 2,2 m `E→B` e `B→B` caíram para 1 rota. Lado ≤1,8 m, centro em midway. Rode `map-check` a cada sub-bloco, não no fim |
| **4** | §1f (3 bandeiras) | **menor dist. bandeira↔spawn 5,00 → 11,0 m**; triângulo 18,0→19,4 m | se o #582 entrar, ceda MID e B e aplique só a **E** |
| **5** | §2 mezanino (45–49) | 1ª cota andável; MAP6 fica 0; MAP3 exige `stairs`/`levels` | **não entregue sem o 49 nem sem o 44** — sem os dois é um ninho de 67 m sobre o spawn E |
| **6** | §3b rotações + §4 + som | **ORT1 0,0%/1 → ≈41%/25 ângulos** | rotação por último: não muda colisor, só o censo; girar antes atrapalha a depuração dos passos 3–5 |

**Custo.** Base medida: **362 malhas, 5.112 triângulos, 0 InstancedMesh**. A receita acrescenta ~42 grupos + 10 racks + mezanino, tudo repetido via `InstBatch`/`PropBatch` (`mapprops.js:228` e `:297`, idioma do `map_campomorro.js:65`) ⇒ **≈+25 draw calls**. Em troca o passo 1 troca 54 caixas de backdrop por 54 planos e a laje por 1 plano: **−540 triângulos e −8.554 m² de superfície**. Uma ordem de grandeza abaixo dos 2.038 draw calls do `fy_mansao`.

---

## 6. O que eu NÃO consegui decidir sem olhar figura

1. **Qual fachada é a boa.** O #582 põe listra vermelha/amarela/azul de ACM; eu ponho vitrine coberta de cartaz de oferta (que também tampa o vazamento de tiro pelo vidro sem colisor). Nenhuma régua separa as duas.
2. **Escala do `vw_9150` e do `onibus_urbano`.** Pedi 3,2 m porque a régua exige massa acima de 1,62 m com folga; não sei se fica desproporcional ao lado dos Fuscas de 1,5 m. Se ficar, 2,8 m ainda passa — remeça a exposição.
3. **Guarda-corpo vazado ou parapeito cheio no mezanino.** Medi que não muda a exposição (olho a 5,22 m passa por cima dos dois). É leitura visual.
4. **Quantas torres nos corredores antes de virar bagunça.** 16 é onde a visada para de cair; 12 entregam 90%. Cortando as 4 de `x=±22,4`, a visada volta a ~64 m e a exposição sobe 0,3 pp.
5. **Se o PA (item 58) vale um asset de áudio novo** — é o único asset que esta receita cria; sem ele nada quebra.

---

**Nada foi editado.** As medições saíram de `node -e` sobre `tools/eval/harness.mjs` (boot em memória, layout injetado em `world.colliders`/`world.occluders`, sem escrever arquivo). A base bate com o enunciado: exposição E 45,9% / B 7,8%, q3,0 14,05 m com 1 prop, ORT1 0,0%/1 ângulo/208 massas, h90 10,5 m, SUP1 30,5%, SUP2 60,8%, 65 occluders, mediana de prop 3,845.
