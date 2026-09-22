<!-- Receita gerada em 12/09/2026 por rodada de análise com contexto limpo.
     Medições: node tools/eval/map-check.mjs all + node tools/eval/mapa-novo-gate.mjs (12/09) e
     sondas em memória sobre tools/eval/harness.mjs. Índice: ../RECEITAS-MAPAS.md -->

# UPA 24h da Treta — receita

> Todos os números abaixo foram medidos **hoje** por mim, em leitura, com `bootGame('upa_24h')` do `tools/eval/harness.mjs` (mesmo mundo das réguas). Onde o número é do meu instrumento e não da régua, está marcado **[i]**: minha grade de observador é de 1 m e a do `map-check` é de 2 m sobre o flood de andabilidade — por isso minha visada de base dá **66,4 m** onde a régua diz **64,3 m**. Deltas são comparáveis; valores absolutos têm esse offset. Não editei nada e não rodei `map-check.mjs` depois do aviso do Main.

## 0. Leitura do arquivo (o que existe hoje)

- Caixa fechada 60×72 m, pé-direito `CEIL=4,2` (`:12`). Perímetro sólido `wallZ/wallX` (`:122-123`), corredor central em `x=∓3,5` com vãos em `z∈[-35,6;-23]` (hall sul aberto), `[-2,2]`, `[23,27]` (`:136-137`). Travessas em `z=∓14` e `z=0` com vãos em `x∓(20..24)`/`x∓(21..24)` (`:139-142`).
- 4 alas: RECEPÇÃO/FARMÁCIA (sul, unidas pelo hall), CONSULTÓRIOS/TRIAGEM (meio), ENFERMARIA/EMERGÊNCIA (norte). Ponta norte do corredor (`z 27..35,45`) é bolsão cego com porta de vidro de ambulância (`:131`).
- Piso = **um** `PlaneGeometry` 60×72 com canvas 1024×1229 desenhado à mão (`:40-62`) → **17 px/m**. Parede = canvas 8×256 esticado (`:64-71`) → **4,4 px/m** nas paredes de 21 m. Laje do teto = `addBox(60, 0,3, 72, MAT.teto)` **cor chapada** (`:117`).
- 56 painéis `MeshBasicMaterial` + **56 `PointLight`** em grade 8 m (`:118`).
- Mobiliário: helpers `maca/soro/mesa/armario/biombo/planta/banco/cadeiras` (`:150-158`) e equipamento `monitor/respirador/crashCart/cadeiraRodas/balanca/cilindroO2/negato` (`:160-178`). **Nenhuma chamada passa `ry`** → `anguloDaGrade` lê 0° em 220 massas.
- `maca()` cria o travesseiro com `lam({color:0xdfe6ec})` **dentro do helper** (`:150`) → 17 macas = **17 materiais** distintos sem `map`, 17 dos 44 chapados.
- `tex()` local (`:37`) põe `anisotropy = 8` mas **não** põe `wrapS/wrapT = RepeatWrapping` — sem isso o `escalaUVporMundo` do `vao.js:68` desiste e nenhuma UV é escalada por metro.

**Correção de diagnóstico (medida, e muda a receita):** a visada de 64,3 m **não é o corredor**. As três linhas de 70 m do mapa são `x≈-22` (oeste), `x≈+22` (leste) e `x≈0` (corredor). A que alimenta o número do spawn é o **eixo de portas de serviço alinhadas** em `z=-14 / 0 / +14` (vãos todos em `x∓(20..24)`): `(-26,-35)→(-18,35)` = 70,5 m limpos. Prova: pondo só a chicane no corredor a visada fica **66,4 m [i]** (não move); pondo só 4 estantes no eixo `x=∓22` ela cai para **56,0 / 50,7 m [i]**.

---

## 1. Jogabilidade e dificuldade

**Régua que manda aqui, verificada no código:** o teto do MAP5 só é **cobrado no `loja_h`** (`invariants.mjs:1984`, `ALVO_MAP5`); para o upa ele é medido e reportado. O **CTF2 é cobrado em todos os mapas** (`invariants.mjs:2005-2008`: qualquer par spawn→bandeira com <2 rotas separadas reprova). Hoje o upa está **verde no CTF2 (mín. 2)**. **Ordem de prioridade: CTF2 > MAP5.** Medi 6 arranjos de mobília; três deles derrubaram CTF2 para 1 ou 0. O conjunto abaixo é o que passou.

### 1a. Matar o eixo de tiro de 70 m (o que realmente move a visada)

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.1 | Estante de prontuários/rouparia no eixo oeste sul | **(-22,5; -7,0)** | 3,0 × 2,0 × 0,6 m, `ry=+0,10` | `addBox(3.0,2.0,0.6, MAT.armario, -22.5,0,-7.0,{ry:0.10})` | visada E **66,4 → 56,0 m [i]**; +1 massa girada |
| 1.2 | idem, eixo oeste norte | **(-22,5; +7,0)** | 3,0 × 2,0 × 0,6 m, `ry=-0,13` | idem | fecha a segunda mira do eixo `x=-22` |
| 1.3 | Estante no eixo leste sul | **(+22,5; -7,0)** | 3,0 × 2,0 × 0,6 m, `ry=-0,16` | idem | visada B **66,4 → 50,7 m [i]** |
| 1.4 | idem, eixo leste norte | **(+22,5; +7,0)** | 3,0 × 2,0 × 0,6 m, `ry=+0,12` | idem | — |

Altura 2,0 m é o mínimo: o olho está em **1,62 m** (`map-check.mjs:63`). Peça de 1,15 m (balcão) **não corta visada**, só serve de cobertura. Medido: CTF2 continua **2** com as 4 estantes (`E→B 90,7/103,5`).

### 1b. Quebrar a reta de 70 m do corredor sem pagar CTF2

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.5 | **Posto de enfermagem** (ilha) no miolo do corredor | **(0; 0)** | 3,4 × 2,3 × 4,4 m, `ry=0,26` | `addBox(3.4,2.3,4.4, MAT.armario, 0,0,0,{ry:0.26})`; balcão de 1,1 m em cima (`collide:false`) | reta `(-2,-35)→(-2,35)` de **70,0 m morre**; corredores laterais de **1,65 m** de cada lado continuam andáveis; CTF2 permanece **2** |

**NÃO faça a chicane de 4 paredes** (`wallX` transversal em `z=∓9/∓12`). Eu medi: ela **não** move a visada de spawn (66,4 m [i]) e **derruba `E→B` de 2 para 1 rota** porque alonga o corredor o bastante para o caminho mais curto virar “ala oeste → salas do meio → corredor”, que come os três canais de uma vez. Custa a régua dura e não entrega a métrica.

### 1c. MAP5 — encher os quadrantes **sem** fechar a circulação

Regra derivada da medição (três layouts reprovaram por violá-la): **no hall (`z ∈ [-35;-23]`) as faixas `x∈[-11;-4]`, `x∈[+4;+11]` e a boca do corredor `x∈[-3,4;+3,4]` são zona de não-construir.** Mobília do hall encosta na fachada de vidro ou na parede. Um balcão de acolhimento solto em `(-19,5; -26,5)` + parede de guichê em `(-19,5; -25,0)` derruba `E→B` e `E→MID` para 1 — medido.

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1.6 | Fileira de cadeiras contra a fachada (oeste) | **(-12,5; -35,0)** | 3,4 × 0,9 × 0,6 | `cadeiras(-12.5,-35.0,5,0.06)` | q1,0 **8,64 → 5,46 m** |
| 1.7 | Fileira de cadeiras contra a fachada | **(-6,0; -35,0)** | 3,4 × 0,9 × 0,6 | `cadeiras(-6.0,-35.0,5,-0.06)` | idem (fica 1,0 m ao sul da fileira de armas em `z=-34` — não encobre pickup) |
| 1.8 | Maca encostada na parede do corredor | **(-4,3; -25,5)** | 0,9 × 0,7 × 2,0 | `maca(-4.3,-25.5,0.05)` | idem |
| 1.9 | Armário de prontuários | **(-13,5; -19,5)** | 1,2 × 1,9 × 0,6 | `armario(-13.5,-19.5,0.22)` | idem |
| 1.10 | Cadeiras da farmácia contra a fachada | **(+6,0; -35,0)** | 3,4 × 0,9 × 0,6 | `cadeiras(6.0,-35.0,5,0.07)` | q2,0 **7,38 → 5,34 m** |
| 1.11 | Cadeiras da farmácia | **(+12,5; -35,0)** | 3,4 × 0,9 × 0,6 | `cadeiras(12.5,-35.0,5,-0.09)` | idem |
| 1.12 | Maca no corredor (clichê BR) | **(+4,3; -25,5)** | 0,9 × 0,7 × 2,0 | `maca(4.3,-25.5,-0.05)` | idem |
| 1.13 | Bebedouro + galão 20 L | **(+14,0; -19,0)** | 0,6 × 1,5 × 0,6 | `addBox(...,{ry:0.44})` | idem |
| 1.14 | Cadeiras contra a fachada (canto SO) | **(-19,0; -35,0)** | 3,4 × 0,9 × 0,6 | `cadeiras(-19.0,-35.0,5,0.05)` | q0,0 **7,18 → 5,57 m [i]** |
| 1.15 | Cadeiras contra a parede oeste | **(-28,4; -29,0)** | 4,2 × 0,9 × 0,6 | `cadeiras(-28.4,-29.0,6,0.14)` | idem |
| 1.16 | Armário contra a parede oeste | **(-28,6; -21,0)** | 1,2 × 1,9 × 0,6 | `armario(-28.6,-21.0,0.08)` | idem |
| 1.17 | Cadeiras contra a fachada (canto SE) | **(+19,0; -35,0)** | 3,4 × 0,9 × 0,6 | `cadeiras(19.0,-35.0,5,-0.05)` | q3,0 **6,90 → 5,39 m [i]** |
| 1.18 | Armário contra a parede leste | **(+28,6; -21,0)** | 1,2 × 1,9 × 0,6 | `armario(28.6,-21.0,-0.08)` | idem |
| 1.19 | Gôndola extra da farmácia | **(+28,4; -33,0)** | 1,1 × 1,9 × 0,6 | `prop('gondola_mercado',28.4,-33.0,1.9,1.74,1.05,0.55,1.9)` | idem; +1 ângulo |

### 1d. Bandeiras (CTF1)

| # | intervenção | de → para | número que move |
|---|---|---|---|
| 1.20 | Bandeira **E ‘RECEPÇÃO’** | `(-18,-28)` → **`(-16,-20)`** | distSpawn **3,61 → 11,05 m** (piso 9 m) |
| 1.21 | Bandeira **B ‘EMERGÊNCIA’** | `(18,28)` → **`(16,20)`** | distSpawn **3,61 → 11,05 m** |
| 1.22 | Bandeira **MID ‘CORREDOR’** | `(0,-8)` → **`(0,-9)`** | altura do triângulo **4,33 → 5,62 m** (piso 4,5) |

Verificado nos três pontos: `livre=true`, penetração 0, maior linha de tiro **47,4 / 26,1 / 45,5 m**. **CTF2 com as bandeiras novas: E→E 4 · E→MID 2 · E→B 2 · B→E 2 · B→MID 2 · B→B 4 — mínimo 2, igual ao de hoje.** Não empurre as bandeiras mais fundo: testei `E(-21,5;-18,5)` / `B(21,5;18,5)` e `E→E` caiu para **1 rota** (recepção vira bolsão de acesso único).

### 1e. Resultado medido do conjunto 1.1–1.22

| métrica | hoje | depois | teto |
|---|---|---|---|
| MAP5 pior espaçamento | 8,64 m (q1,0) | **5,57 m** (q0,0) | ≤7 |
| MAP5 pior razão prop | 0,42× | **0,81×** | ≥0,35 |
| MAP5 quadrantes fora | 2 | **0** | — |
| visada máx. do spawn E / B | 66,4 / 66,4 [i] | **56,0 / 50,7** [i] | sem teto |
| CTF2 pior | 2 | **2** | ≥2 (**gate**) |
| CTF1 altura do triângulo | 4,33 m | **5,62 m** | >4,5 (**gate**) |
| CTF1 distSpawn mínima | 3,61 m | **11,05 m** | ≥9 |
| MAP2B folga mínima | 3,35 m | **4,50 m** [i] | ≥1,2 |
| cover mais distante | 6,8 m [i] | **6,7 m** [i] | ≤12,5 |
| MAP1 corpo dentro de sólido | 0 | 0 | 0 |

---

## 2. Verticalidade — **ALT1 não se aplica, e por quê**

**Declaração explícita.** `upa_24h` é prédio fechado de **um pavimento**: `CEIL = 4,2 m` é o pé-direito, não uma escolha de massa. ALT1 pede h90 ≥ 9 m; para passar seria preciso ~28 massas com topo ≥9,5 m dentro de um prédio de 4,2 m — isto é, construir torre falsa para a régua. O portão já tem **três precedentes iguais** (`mapa-novo-gate.mjs:182-189`): `piscina_treta` “salão fechado: teto é o do prédio”, `loja_h` “galpão de uma laje”, `fy_mansao` “casa térrea”. Linha a acrescentar em `DIVIDA`, com o mesmo formato:

```
'ALT1:upa_24h': 'h90 4,2 m (prédio fechado de um pavimento: 4,2 m é o pé-direito)',
```

**Céu / `setMapSky` / `applyLook` também não se aplicam**: o mapa não tem exterior (`scene.background = 0x14181c`, `fog = null`, `:115`) e a ambiência já declara `pigeons: []` por isso (`:279-288`). O bioma sonoro correto já está posto (`bioma:'indoor'`, `:291`); `BIOME_SHOTS` não tem entrada `indoor` de propósito (`soundscape.js:13-15`) — **não invente one-shot novo**.

O que **é** possível em 4,2 m, e vale por jogabilidade, não por número:

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 2.1 | **Bump de laje** sobre o bolsão norte (garagem) | centro (0; 31,3) | vão 6,7 × 8,45 m, teto local **4,2 → 6,6 m** | recortar a laje `:117` em 2 peças e pôr a do bolsão em `y=6,6` + 4 empenas de 2,4 m fechando o rasgo | habilita 2.2; ALT1 **não muda** (topo 6,9 m < 9 m) |
| 2.2 | **Mezanino administrativo** sobre a garagem | laje 6,4 × 5,0 m em **(0; 32,0)**, piso `y = 2,80` | `addBox(6.4,0.25,5.0, MAT.armario, 0, 2.80, 32.0, {collide:false})` + colisor de piso; pé-direito superior **3,55 m** | +1 cota andável; janela de tiro sobre a garagem |
| 2.3 | **Escada de serviço** para 2.2 | vão **x∈[3,0;4,3]**, `z∈[27,4;31,9]` | 16 degraus: espelho **0,175 m**, piso **0,28 m**, 2h+p = **0,63 m**, largura **1,30 m**, inclinação **32°** | dentro da NBR 9077 que a MAP3 cobra (`map-check.mjs:76-80`); declarar em `world.stairs` |
| 2.4 | **Guarda-corpo** do mezanino | perímetro livre da laje 2.2 | 1,10 m de altura, colisor real | MAP6: queda de 2,80 m ≥ 2,0 m exige guarda (`map-check.mjs:151`) — sem isto MAP6 vai de 0 para ≥1 borda |
| 2.5 | **Rampa de maca** da doca para o corredor | de (0; 27,5) a (0; 30,0) | 2,5 m de comprimento, desnível **0,30 m** (8,5%) | `groundHeightAt` deixa de ser `() => 0` (`:248`) e passa a interpolar a doca | dá relevo sem escada; NBR de rampa acessível é ≤8,33% — 0,30/3,6 m fica em 8,3% se preferir |
| 2.6 | **Doca de ambulância** rebaixada | `x∈[-3,35;3,35]`, `z∈[30,0;35,4]` | piso em **y = -0,30 m** | cobertura de peito para quem entra pelo norte |

**Atenção medida:** 2.1–2.6 mexem na malha de navegação do bolsão norte. Rode o CTF2 depois — a garagem também pode virar 2ª travessia norte (`portas de 4 m em x=∓3,5, z∈[30;34]`), e eu medi que essa travessia **sobe `B→E` de 2 para 2 com folga** mas **sobe a exposição do spawn B de 2,7% para ~8% [i]**. Se abrir as portas laterais da garagem, compense com um biombo em (2,0; 29,0).

---

## 3. Visual e escala

### 3a. SUP2 — 52,2% da área sem textura tem **um** culpado

Medido, área sem textura por material (soma 10.058 m²; superfície total do mapa 19.254 m²):

| ordem | material | malhas | área sem textura | fração do problema |
|---|---|---|---|---|
| 1 | **`MAT.teto` `0x798089`** — a laje `:117` | **1** | **8.719 m²** | **86,7 %** |
| 2 | `LUZ` `0xfbfdff` — 56 luminárias + 4 negatoscópios | 60 | 385 m² | 3,8 % |
| 3 | `MAT.paredeAlta` `0x776f66` — vergas | 12 | 278 m² | 2,8 % |
| 4 | `MAT.armario` `0xd6dbe0` | 28 | 199 m² | 2,0 % |
| 5 | `MAT.maca` `0xf2f5f7` | 17 | 130 m² | 1,3 % |
| 6 | `MAT.verde` / `MAT.aco` / `MAT.cadeira` / `MAT.mesa` | 101 | 241 m² | 2,4 % |
| 7 | travesseiro `0xdfe6ec` (17 materiais!) + telas/rodas/vidro | 181 | 106 m² | 1,0 % |

| # | intervenção | onde | como (canvas barato) | SUP2 acumulado |
|---|---|---|---|---|
| 3.1 | **Forro acústico modular** na laje | `addBox(60, 0,3, 72)` em `:117` | canvas **256×256** = 1 placa de 2,0 m (placa 0,625 m × 4 + junta 2 cm + difusor), `RepeatWrapping`, `repeat(30,36)` → **128 px/m** | **52,2 % → 6,95 %** |
| 3.2 | **Luminária de sobrepor** nos 56 painéis | `:118` | canvas 256×256: moldura branca + 2 tubos + aleta; `MeshBasicMaterial({map})` | **→ 4,95 %** ✅ verde |
| 3.3 | Verga com a mesma parede | `MAT.paredeAlta` | reusar `wallTex()` (3.5) em vez de `0x776f66` | → 3,51 % |
| 3.4 | Armário com porta de melamina | `MAT.armario` | canvas 128×128: 2 portas + puxador | → 2,48 % |
| 3.5 | Maca com lençol + colchão, aço escovado, cadeira de polipropileno, tampo de fórmica | `maca/aco/cadeira/mesa/verde` | 5 canvas de 128×128 | **→ 0,55 %** |

### 3b. TEXEL — três vermelhos que ninguém citou, e o conserto é o mesmo

`node tools/eval/texel-check.mjs` de hoje acusa, para `upa_24h`: **TEXEL1** mediana **15,2 px/m** (banda 64–512), **TEXEL2** **99,0 %** da área estrutural abaixo de 64 px/m (teto 10 %), **TEXEL3b** maior/mediana **14,0×** (teto 4×). Causa: `PlaneGeometry`/`BoxGeometry` com UV 0→1 independentemente do tamanho.

| # | intervenção | onde | como | número que move |
|---|---|---|---|---|
| 3.6 | Trocar `new THREE.BoxGeometry` por **`aoBoxGeo` + `aoMatFactory()`** no `addBox` | `:81-92` | copiar literal o padrão de `map_quebrada.js:77-94` (`aoBoxGeo(w,h,d,{low,base})`, `aoMat(mat)`) | UV escalada por metro a 128 px/m (`vao.js:75`); **TEXEL1/TEXEL2/TEXEL3b** verdes; ganha AO de contato de graça |
| 3.7 | Pôr `wrapS=wrapT=RepeatWrapping` no `tex()` local | `:37` | `t.wrapS=t.wrapT=THREE.RepeatWrapping` | **pré-requisito de 3.6** — `vao.js:68` desiste de escalar sem isso, e hoje o `tex()` do upa não põe |
| 3.8 | **Piso vinílico tilável** + faixas de setor separadas | `:40-62` | canvas **256×256** de 2,0 m de vinílico (placa 0,3 m, veio, rejunte) com `tex(c, 30, 36)` → 128 px/m; **4 planos** (um por setor) com `material.color` de tinta compartilhando a textura; as 6 **faixas coloridas** viram 6 tiras finas de `0,12 m` a `y=0,012` seguindo os mesmos traçados de `:55-60` | chão sai de **17 px/m → 128 px/m**; a faixa deixa de ser 3 px borrados em 60 m |
| 3.9 | **Parede com barra de proteção** | `wallTex()` `:64-71` | canvas **256×512** (2,0 × 4,0 m): rodapé 0,10 m, barra de choque de PVC a **0,90 m** (12 cm, mais escura), faixa lilás, branco acima; azulejo 15×15 só na faixa de emergência/enfermaria | parede de **4,4 px/m → 128 px/m** (é o pior item do `piores` do texel: 643 m² a 4,4) |
| 3.10 | **Placa de setor suspensa** | sobre o cruzamento, `(0; -9)` e `(0; +9)`, `y=2,9` | plano 3,2 × 0,45 com `signTex()` (`:14`), seta + setor | leitura de wayfinding; usa a função que já existe |

### 3c. SUP1 — 45,8 % (44/96) cai com **uma** linha

| # | intervenção | onde | como | número que move |
|---|---|---|---|---|
| 3.11 | Içar o travesseiro para `MAT` | `:150` | `MAT.travesseiro = lam({color:0xdfe6ec})` fora do helper; `maca()` passa a usar `MAT.travesseiro` | 17 materiais → 1: **96→80 materiais, 44→28 chapados = 35,0 %** ✅ abaixo de 40 % |
| 3.12 | Os `map` de 3.1–3.5 | teto, luz, verga, armário, maca, aço, cadeira, mesa, verde | — | **28 → 20 chapados = 25,0 %** |

### 3d. ORT1 — 0,0 % / 1 ângulo em 220 massas

Num prédio ortogonal a variação legítima é **a mobília**, nunca a parede. Nada de girar parede de alvenaria.

| # | grupo | quantas massas | ângulos (rad) | por que é legítimo |
|---|---|---|---|---|
| 3.13 | 16 macas (`:189,192,193,203,206,213`) | 16 | 0,07 / 0,11 / 0,16 / 0,21 / 0,26 / 0,30 / 0,35 / 0,40 / 0,44 / 0,49 / 0,54 / 0,59 / 0,63 / 0,68 / 0,72 / 1,45 | maca empurrada por maqueiro nunca fica de esquadro |
| 3.14 | 6 biombos (`:189,195,201,204,208`) | 6 | 0,23 / 0,33 / 0,42 / 0,52 / 0,61 / 0,70 | biombo é **sempre** torto |
| 3.15 | 8 monitores + 1 crashCart + 2 respiradores + 2 balanças (carrinhos com rodízio) | 13 | 0,09 / 0,14 / 0,19 / 0,24 / 0,29 / 0,38 / 0,47 / 0,56 / 0,65 / 0,17 / 0,27 / 0,37 / 0,51 | carrinho com rodízio |
| 3.16 | 13 plantas = 13 vasos + 13 folhagens (`planta()` `:155`) | 26 | reaproveitar 12 ângulos da lista | vaso quadrado girado lê imediatamente |
| 3.17 | 3 mesas + 3 cadeiras + 3 armários + 3 tampos + 4 bancos + 4 cadeiras de rodas | 20 | reaproveitar | consultório usado |
| 3.18 | 19 peças novas das seções 1 e 2 | 19 | já têm `ry` nas tabelas acima | — |

**Conta:** ≥ **79 massas giradas** de **239** = **33,1 %** (piso 15 %), com **24 ângulos distintos** após o dobramento `a>45 → 90-a` (piso 20). Não gire `CylinderGeometry` (rodas, cilindro de O₂, soro): giro invisível é régua fingida — a `regua` chama isso de defeito que a régua premia.

---

## 4. Brasilidade

| # | objeto | x,z | dimensão | como | observação |
|---|---|---|---|---|---|
| 4.1 | **Painel de senha eletrônica** (“SENHA G-042 · GUICHÊ 3”) sobre o balcão | (-6,0; -16,0), `y=2,4` | 2,2 × 1,2 | já existe `signMesh(...'SENHA','999')` em `:185` — trocar por G-042/GUICHÊ | usa `signTex()` existente |
| 4.2 | **Fila com balizadores de fita retrátil** | (-8,5;-31,5) (-6,5;-30,0) (-8,5;-28,5) (-6,5;-27,0) (-4,5;-31,0) (-4,5;-28,0) | poste Ø 0,09 × 1,0 m | `InstBatch` (1 draw call), **`collide:false`** | decoração: poste de 9 cm **não** é cobertura, então não entra na conta do MAP5 — e não pode entrar |
| 4.3 | **Cartaz de campanha de vacinação** | (-29,3; -24,0) `y=2,0`, `ry=π/2` | 1,2 × 0,8 | `signTex('#f2c200','#12301f','VACINE-SE','CAMPANHA DE INVERNO')` | sem marca, sem sigla protegida |
| 4.4 | **Cartaz de direito do usuário** | (+29,3; -24,0) `y=2,0` | 1,2 × 0,8 | `signTex('#1e5fa8','#fff','ATENDIMENTO','É SEU DIREITO')` | idem — **não** use logo/marca do SUS |
| 4.5 | **Ventilador de parede oscilante** | (-14,0; -35,2) e (+14,0; -35,2), `y=2,6` | grade Ø 0,45, haste 0,30 | 1 `CylinderGeometry` + 3 aros, `collide:false` | dois em `InstBatch` |
| 4.6 | **TV de parede com jornal** | já existe `painel_tvs` em (-28,-22) `:184` | 2,0 m | acrescentar um 2º em (+28; -22), `ry=+π/2` | prop do catálogo, sem asset novo |
| 4.7 | **Quadro de avisos de cortiça** com papéis | (-29,3; -30,0), `y=1,9` | 1,6 × 1,0 | plano com **`T.corkboard`** (já existe no `T`) | textura existente, custo zero |
| 4.8 | **Ambulância Kombi** na garagem | (0; 32,5), `ry=0,26` | alvo 2,0 m de altura | `prop('kombi', 0, 32.5, 2.0, 0.26, 2.2, 1.0, 2.0)` — **acrescentar `'kombi'` a `UPA_PROPS` (`:10`)** | Kombi é a ambulância de UPA que todo brasileiro reconhece; letreiro `AMBULÂNCIA 199` em `signTex` (paródia, sem SAMU/SUS) |
| 4.9 | **Maca ocupada no corredor** (sem gore) | (+4,3; -25,5) — item 1.12 | lençol 0,8 × 0,12 × 1,9 creme por cima | `addBox(...,{collide:false})` | zero sangue, zero pessoa real |
| 4.10 | **Cadeira de plástico monobloco branca** | 8 unidades espalhadas nas alas, ângulos 0,12 a 0,66 | 0,45 × 0,85 × 0,45 | **`InstBatch`** (1 draw call, 8 ângulos distintos) | soma 8 massas giradas ao ORT1 |
| 4.11 | **Mureta de vidro da recepção** | sobre o balcão existente de `:180`, (-18; -17), `y=1,1` | 6,2 × 0,9 × 0,06 | `MAT.vidro`, `collide:false` | guichê de acrílico com vão de atendimento |
| 4.12 | Som | — | — | **manter `AMB_LOOPS.hum` e `bioma:'indoor'` (`:291`)** | `BIOME_SHOTS` não tem `indoor` de propósito (`soundscape.js:13-15`): não invente one-shot |

---

## 5. Ordem de execução e custo

| passo | o que entra | fecha | risco |
|---|---|---|---|
| **1** | 3.11 (içar `MAT.travesseiro`) | **SUP1 45,8 % → 35,0 %** ✅ | nenhum: 2 linhas, zero efeito visual |
| **2** | 3.1 + 3.2 (forro + luminária) | **SUP2 52,2 % → 4,95 %** ✅ | nenhum na régua; visual muda muito (teto deixa de ser chapa cinza) — peça figura antes de seguir |
| **3** | 3.6 + 3.7 + 3.8 + 3.9 (`aoBoxGeo`/`aoMat`, `RepeatWrapping`, piso e parede tiláveis) | **TEXEL1/TEXEL2/TEXEL3b** verdes; mediana 15,2 → ~128 px/m | **médio**: `aoMat` clona material (`vao.js:196-206`); o piso vira 4 planos + 6 tiras — o desenho autoral de `:40-62` tem que ser refeito como tile + tiras, não como imagem única. Rodar `texel-check` a cada peça |
| **4** | 1.1–1.4 (estantes) + 1.5 (posto de enfermagem) | **visada 66,4 → 56,0/50,7 [i]**; reta de 70 m do corredor morre; **CTF2 continua 2** | baixo, **mas** meça CTF2 junto: foi a régua que reprovou 3 dos meus 6 arranjos |
| **5** | 1.6–1.19 (mobília encostada) + 1.20–1.22 (bandeiras) | **MAP5 pior 8,64 → 5,57 m, 0 quadrantes fora; CTF1 4,33 → 5,62 m; distSpawn 3,61 → 11,05 m** | **alto se desobedecer a regra das faixas livres** (`x∈[-11;-4]`, `x∈[4;11]`, boca do corredor) — medido: derruba CTF2 para 1 ou 0 |
| **6** | 3.13–3.18 (giros) + seção 4 (brasilidade) | **ORT1 0,0 %/1 → 33,1 %/24** ✅ | baixo; o `addBox` já gira o AABB junto (`:88`), então nenhum corpo entra na quina |
| **7** | 2.1–2.6 (bump de laje, mezanino, escada, guarda, rampa, doca) | +1 cota andável; MAP3/MAP6 | **alto**: exige `world.stairs`/`levels`, guarda-corpo e re-medição completa de MAP3, MAP6 e CTF2. **Deixe por último** — é o único passo que pode ficar de fora sem perder régua nenhuma |

**Orçamento.** Hoje: **472 malhas**, sem nenhum lote, e **56 `PointLight`** (`:118`) — 56 luzes dinâmicas num Lambert é o custo de sombreamento mais caro do arquivo. Passos 1–6 acrescentam **19 caixas + ~16 peças de brasilidade**; `InstBatch` (`mapprops.js:297`) nos 56 painéis de luz, nas 8 cadeiras monobloco, nos 6 balizadores e nos 2 ventiladores devolve **−55 draw calls**, então o saldo é **≈ −20**. Corte os `PointLight` de 56 para **12** (3 por ala) e deixe o forro emissivo fazer o resto: o `cena-tetos.mjs:50-74` **não tem teto declarado para `upa_24h`**, então ninguém reprova — a referência é o contra-exemplo do `fy_mansao`. Nenhum GLB novo: só `kombi`, que já está em `public/models/props/`.

---

## 6. O que eu NÃO consegui decidir sem olhar figura

1. **O piso autoral** (`:40-62`) é um desenho de planta inteira com cores de setor e 6 rotas coloridas. Trocá-lo por tile de 2 m + 4 planos tingidos + 6 tiras finas resolve os 17 px/m, **mas eu não vi como ele aparece em jogo**. Se as cores de setor forem a única leitura de orientação do mapa, a subdivisão em 4 planos precisa de figura antes/depois.
2. **Forro a 128 px/m contra o look pixel do jogo.** `textures.js:17` trava `NearestFilter` como decisão de arte. Não sei se um forro acústico tilado a 128 px/m fica “CS 1.6” ou “render de 2010” — é chamada de direção de arte com print, não de régua.
3. **Iluminação depois de cortar 56 → 12 `PointLight`.** A conta de desempenho é clara; o resultado visual num prédio sem janela, não. Precisa de A/B de pixel.
4. **Mezanino (2.2) a 2,80 m com 3,55 m de pé-direito superior** depende do bump de laje 2.1 — se o dono achar que um telhado mais alto sobre a garagem quebra a silhueta interna do prédio, o passo 7 inteiro cai e ALT1 continua em dívida do mesmo jeito.
5. **Exposição do spawn E**: caiu de 19,8 % para 15,5 % [i] com o conjunto, mas boa parte da queda vem de retirar chão andável, não de bloquear mira. A régua real (grade de 2 m) pode ler diferente; o dono precisa dizer se 15 % num hall de entrada com porta de vidro é aceitável ou se o spawn E deve sair do hall e ir para dentro da recepção — essa mudança mexe em MAP2B e CTF2 e eu não a testei.
