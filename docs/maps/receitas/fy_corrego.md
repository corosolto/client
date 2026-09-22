<!-- Receita gerada em 12/09/2026 por rodada de análise com contexto limpo.
     Medições: node tools/eval/map-check.mjs all + node tools/eval/mapa-novo-gate.mjs (12/09) e
     sondas em memória sobre tools/eval/harness.mjs. Índice: ../RECEITAS-MAPAS.md -->

# Córrego (`fy_corrego`) — receita

## 0. Leitura do arquivo (o que existe hoje)

| o que | onde | fato medido |
|---|---|---|
| canal vazio com fundo andável em −1,75 m, lâmina em −1,61 | `map_corrego.js:23-31`, piso `:320`, água `:328-335` (`createWater`) | 6 m de vão × 80 m |
| 4 rampas de contenção em `\|x\|∈[3,5]` (a 4ª já em z[26,32] pelo #467) | `:37-42`, `:377-387`, `gh` `:1031-1038` | 0,073 m/passo |
| 3 pontes de madeira (tablado y 0→0,18) | `ponte()` `:597-628`, chamadas `:626-628` | tablado é colisor de corpo; tábuas são occluder |
| 20 peças de entulho no fundo (manilha/tambor/pilha/entulho) | laço `:884-892`, tabela k=1..20, z=−35+3,3k | todas com topo ≤ −0,40 m → **abaixo do olho de quem anda no fundo (−0,13)** |
| casario: fileira A `\|x\|`=9,75, B 16,95, C 23,05; palafitas `\|x\|`≈5,4 | `casa()` `:646-720`, `puxadinho()` `:724-739`, fileiras `:764-822`, palafitas `:828-848` | ALT1 h90 9,4 m; ORT1 68,2% / 39 ângulos |
| 12 postes 9,4 m + gatos de fiação + varais nos becos | `:917-950` | fios a 6,4 m (acima de tudo) |
| lotes: `SB` (alvenaria, cega ao ORT1 por decisão declarada `:227-229`), `IB` (matriz por cópia), `PB` (carros) | `:214-258`, `:287`, build `:1180-1191` | occluders: SB mesh a mesh `:1185`; **IB/PB como `InstancedMesh` `:1187-1190`** |
| grafite/decais, fauna (jacaré/capivara), `applyLook` | `:1193-1247`, `:305` | SUP1 31,4% · SUP2 1,8% |
| `groundHeightAt(x,z,yRef)` + grafo de waypoints com lanes por eixo | `:1023-1047`, `:1063-1118` | `escadas: []`, `travessia: []` |

Instrumento validado antes de propor: minha réplica da MAP4 reproduziu `fracSemMalha` **0,0037** (52/14.076 amostras) e a exposição por spawn dentro de 1–3 pp do `map_check_all.json` de hoje. Todas as medições abaixo são desse harness (`tools/eval/harness.mjs`, build real + raycast), em memória, sem escrita em disco.

---

## 1. Jogabilidade e dificuldade

### 1A — VEREDITO: os 62 occluders pulados são **defeito de régua, não de mapa**

Por que um occluder é pulado (`map-check.mjs:550-552`): `!isMesh` · **`isInstancedMesh`** · sem `geometry` · sem `attributes.position` · `userData.proxyGLB`.

Classifiquei os 170 occluders do Córrego no build real:

| causa do pulo | quantos | evidência |
|---|---|---|
| `isInstancedMesh` | **62** (564 instâncias) | `map_corrego.js:1187-1190` empurra tudo que `IB.build`/`PB.build` cria |
| `proxyGLB` | 0 | o mapa nunca marca `proxyGLB`; `propComFallback` `:299-300` **remove** o proxy e põe a malha do GLB |
| não-mesh / sem geometria / sem posição | 0 | — |

Rodei a MAP4 **ciente de instância** (`getMatrixAt` por instância, mesma tolerância 0,35 m, mesmo passo 0,5 m, mesmas faces laterais):

| conjunto | occluders | amostras | área lateral aprox. | vazias | frac |
|---|---|---|---|---|---|
| medidos hoje | 108 | 14.076 | 3.519 m² | 52 | **0,0037** |
| pulados (instanciados) | 62 / 564 instâncias | 10.684 | 2.671 m² (**43% da superfície amostrada**) | **1** | **0,0001** |
| combinado | 170 | 24.760 | 6.190 m² | 53 | **0,0021** |

Nenhuma das 564 instâncias passa de 10% de face vazia (**0 reprovando**). A razão é estrutural: no `InstBatch` a matriz fica **por cópia** (é a decisão declarada em `:227-229`) e a geometria é a própria malha desenhada — occluder e malha visível são o **mesmo objeto**, logo a folga é zero por construção, não por sorte. Não há "tiro no ar" possível ali.

| ação | onde | número que move |
|---|---|---|
| iterar instâncias na MAP4 em vez de pular | `map-check.mjs:550` + laço `:557-581` com `oc.getMatrixAt(i, m)` × `oc.matrixWorld` | `occMedidos` **108 → 672**, `occPulados` **62 → 0**, `fracSemMalha` **0,0037 → 0,0021** |
| manter o pulo só para `proxyGLB` e Group | idem | o limite declarado passa a ser o que ele diz ser (GLB que não carrega em node), não "todo prop instanciado" |

**Não mexer no mapa por causa disso.** Quem quiser cobrar o Córrego pelos 108 está cobrando um instrumento que não olha 43% da superfície dele.

### 1B — o tubo de 76 m no eixo do canal

Medido: visada limpa de **76 m** a 1,62 m do olho nas lanes do fundo (`x` = −2,6 a +2,6, z −38→38). As 3 pontes **não cortam** essa linha: quem anda no fundo tem o olho em −0,13 m e o tablado começa em 0,00 m. E as 20 peças de entulho têm topo ≤ −0,40 m — cobertura de agachado, nenhuma quebra de visada.

Dispositivo: **massa alta alternada** — grade de retenção de lixo com entulho encostado, 3,6 m de massa × 3,0 m do fundo (topo **+1,25 m**, 1,25 m acima do passeio, que é altura de gradil de córrego canalizado), 0,5 m de espessura, deixando **vão livre de 2,4 m** alternando de lado. Via `addBoxI(..., {collide:true, ry: angAnexo()})` (NÃO `addBoxSB`: o lote estático assa a matriz e cega o ORT1, `:227-229`).

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 1 | grade+entulho, massa LESTE | x∈[−0,6; 3,0], z −26 | 3,6×3,0×0,5 | `addBoxI(3.6,3.0,0.5,matParedeCanal,1.2,CANAL_FUNDO,-26,{collide:true,ry:angAnexo()})` | canal 76→26 m (conjunto) |
| 2 | idem, massa OESTE | x∈[−3,0; 0,6], z −16 | 3,6×3,0×0,5 | idem, x=−1,2 | q1,1 props 6→7 |
| 3 | idem, LESTE | z −4 | 3,6×3,0×0,5 | x=+1,2 | q2,1 12→13 |
| 4 | idem, OESTE | z +6 | 3,6×3,0×0,5 | x=−1,2 | q1,2 24→25 |
| 5 | idem, LESTE | z +20 | 3,6×3,0×0,5 | x=+1,2 | q2,3 15→16 |
| 6 | idem, OESTE | z +28 | 3,6×3,0×0,5 | x=−1,2 | q1,3 5→6 |

Espaçamento de 12,7 m alternado é o **mínimo geométrico** para nenhuma lane reta passar de ~25 m (o `D_FORA` da MAP2, `map-check.mjs:71` — a distância em que a AWP mata sem reação).

O fundo é apertado (6 m) e o entulho existente tem cadência de 3,3 m: sem arrumar a vizinhança a chicana fecha a rota que o #467 abriu. Medido: com as massas cruas o flood do fundo morre em z=+11,1. Com a arrumação abaixo, o fundo volta a ser **um só corredor de z −32,7 a +32,7 (2.962 células)**.

| # | peça (laço `:884-892`) | hoje | passa a | motivo |
|---|---|---|---|---|
| 7 | k3 tambor (1,75; −25,1) | existe | **absorvida** pela massa 1 | está dentro da pegada dela |
| 8 | k6 pilha (−1,75; −15,2) | existe | **absorvida** pela massa 2 | idem |
| 9 | k19 tambor (2,0; +27,7) | existe | **absorvida** pela massa 6 | idem |
| 10 | k2 pilha de tijolo | x −2,25 → **+2,25** (z −28,4) | muda de lado | libera o vão oeste da massa 1 |
| 11 | k5 entulho | x +2,25 → **−2,25** (z −18,5) | muda de lado | libera o vão leste da massa 2 |
| 12 | k10 pilha | x −2,0 → **+2,0** (z −2,0) | muda de lado | vão da massa 3 |
| 13 | k13 entulho | x +2,0 → **−2,0** (z +7,9) | muda de lado | vão da massa 4 |
| 14 | k16 manilha | x −2,0 → **+2,0** (z +17,8) | muda de lado | vão da massa 5 |

Implementação: no laço `:885`, trocar `const lado = k % 2 ? 1 : -1` por uma tabela `LADO_FUNDO[k]` com os 5 sinais acima e `if (ABSORVIDAS.has(k)) continue`. **Não** viola `:405-406` ("não existe colisor enchendo o vão"): o vão de 2,4 m é maior que os 1,8 m que o entulho atual já ocupa.

### 1C — exposição de spawn (66,5% das visadas atravessam o canal)

Medido: das visadas ≥25 m que enxergam a cabeça de quem nasce, **706 atravessam o canal contra 356 do mesmo lado** — o vão é a janela. Elas passam **por cima** do canal a 1,62 m, então massa no fundo não resolve: só corta quem tem topo acima de 1,62 m na linha. Daí a camada de tecido/tubo sobre o vão (tudo sem colisor, sobre o vazio — não toca rota nenhuma).

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 15 | passarela de pedestre com parapeito de zinco | x −6,5→6,5, z −11 | deck 13,0×0,18×1,7 a y 1,05; parapeito 1,10 m (topo 2,15) | `addBox` deck (`collide:true`) + 2 `addBoxI` parapeito `TEX.zinco` | exp E 30,4→17,0% e B 27,5→15,0% (com 16–20) |
| 16 | idem, gêmea | z +11 | idem | idem | +2 travessias (rotação) |
| 17 | varal com roupa **sobre o canal**, bainha 1,15 | x −3→3, z −20 / +1 / +24 | cabo 6,0×0,02 a 2,35 + 6 peças `matRoupa` | mesmo padrão de `:945-950` | corta a faixa de cruzamento z −20/0/+24 (histograma: 69/26/66 visadas) |
| 18 | varal de ponta, bainha **0,90** | z −30 e +30 | idem | idem | mata a linha rasante que sai da boca assoreada (olho 1,67 m) |
| 19 | tubulação de esgoto atravessando | x −3,3→3,3, z −8, y 1,50→2,40 | Ø 0,90, 6,6 m | `CylinderGeometry(.45,.45,6.6,12)` + sela de concreto nas 2 paredes | passa o corpo (tronco até +1,5), não passa o olho |

### 1D — MAP5: os 4 quadrantes magros (pior razão 0,38, teto 0,35 — está a 8% de reprovar)

Props de rua, todos do catálogo, a **`\|x\| = 6,6** (encostados na base da fileira A, deixando ≥1,25 m de passeio — a diferença do precedente de `:954-957`, que planta em 5,9 **na própria lane**) ou nos eixos já povoados (13,65 / 20,5):

| # | quadrante | prop | x,z | h alvo | espaçamento |
|---|---|---|---|---|---|
| 20 | q1,1 (x −11,8..0, z −19,8..0) | `dumpster` · `moto_cg` · `pilha_pneus` · `shopping_cart` | (−6,6;−6,5) (−6,6;−9,5) (−6,6;−13) (−6,6;−3,5) | 1,35 · 1,05 · 1,10 · 1,05 | **5,88 → 4,34 m**; razP 0,48→0,89 |
| 21 | q1,3 (z 19,8..39,5) | `botijao_gas` · `caixa_dagua_azul` · `dumpster` · `tires` · `shopping_cart` | (−6,6;21,5) (−6,6;27) (−6,6;31) (−6,6;36,5) (−6,6;24) | 0,75 · 1,25 · 1,35 · 0,80 · 1,05 | **6,61 → 4,45 m**; razP 0,38→0,84 |
| 22 | q0,1 (x −23,5..−11,8) | `fachada_comercio`+`gondola_mercado` (mercadinho) · `moto_cg` | (−20,5;−16) (−20,4;−14,8) (−13,65;−18) | 2,8 · 1,6 · 1,05 | **5,66 → 4,62 m**; razP 0,52→0,78 |
| 23 | q0,3 | `kombi` · `arara_roupas` · `gondola_mercado` | (−20,8;26,5) (−21,2;34) (−13,65;33) | 2,0 · 1,6 · 1,6 | **5,23 → 4,37 m**; razP 0,61→0,87 |

Mediana do mapa praticamente não se move (densProp 6,005 → 6,001), então o ganho é real e não por diluição. **Pior espaçamento do mapa: 6,61 → 4,62 m. Pior razão de prop: 0,38 → 0,78.**

### 1E — resultado medido do conjunto (mesma cena, mesmo harness, A/B)

| número | antes | depois | régua |
|---|---|---|---|
| visada no eixo do canal | 76 m | **26 m** | — (alvo: `D_FORA` 25 m) |
| exposição E | 30,4% (oficial 29,2%) | **15,9%** | MAP2 |
| exposição B | 27,5% (oficial 27,3%) | **13,1%** | MAP2 |
| maior visada a spawn | 76,8 m (oficial 77,0) | **65,0 m** | MAP2 |
| rota baixa conexa | z −32,7→+32,7 | z −32,7→+32,7 (2.962 células) | ROTA2/ROTA4 (#467) |
| pior espaçamento MAP5 | 6,61 m | **4,62 m** | MAP5 |
| pior razão prop | 0,38 | **0,78** | MAP5 |
| cover no fundo (pior) | 3,4 m | 3,4 m | cover-3s ≤12,5 ✔ |

Residuais que **eu deliberadamente não fecho**: os 65 m que sobram são as duas diagonais de canto (`E(21,−25) ↔ (−23,38)` e a espelhada), que enfiam pelos becos transversais alinhados. Fechá-las pede tapar um beco — e `piorRotas` já é **2**; a marquise de `:794-796` está no código justamente porque estrangular rua derrubou o CTF2 numa tentativa anterior. Parar aqui é decisão, não omissão.

---

## 2. Verticalidade (`escadas: []` e `travessia: []` → 2 escadas e 1 nível)

O #467 (`fix/corrego-rota-baixa`, commit `81606fb3f`) fez a rota **baixa** virar rota (ponte 1,90→0,00 m com `yRef`; 4ª rampa 1,435→0,073 m) e registrou, com todas as letras, que **ROTA3 mediu 0 superfícies altas desconectadas** e que "rampa por cima dos barracos"/"entrar no barraco" **não existem — são pedido de construção**. Esta seção é esse pedido, e não repete nada dele: reusa o `yRef` que ele instalou em `:1023`.

| # | intervenção | x,z | dimensão | como | número que move |
|---|---|---|---|---|---|
| 24 | **passarela alta sobre o canal** (2ª cota andável) | x −7,0→7,0, z −16 | deck 14,0×0,22×1,6, topo **3,15 m**; parapeito 1,00 m (0,9–1,6 m = faixa de tiroteio do `campo-contract`) | `addBox` deck `collide:true` + 2 `addBoxI` parapeito (`matReboco`/`TEX.zinco`) + 4 pilares 0,3×3,15 sobre as paredes do canal | cria cota andável; ALT1 h90 segue 9,4 m |
| 25 | escada de serviço OESTE (NBR) | x∈[−7,30; −6,00], z −21,00→−15,96 | 18 degraus: espelho **0,175**, piso **0,28**, largura **1,30** | 18× `addBoxI(1.3,0.175,0.28,matConcretoFino, -6.65, s*0.175, -21+ s*0.28, {collide:true})` | `escadas: []` → 1 |
| 26 | escada de serviço LESTE (espelhada) | x∈[6,00; 7,30], z −11,00→−16,04 | idem | idem, x=+6,65 | `escadas: []` → 2 |
| 27 | declaração para a régua medir | retorno `:1251-1257` | — | `stairs:[{nome:'escada-oeste',x0:-7.3,x1:-6.0,z0:-21.0,z1:-15.96},{nome:'escada-leste',x0:6.0,x1:7.3,z0:-11.0,z1:-16.04}]`, `levels:[{nome:'passarela-alta',x0:-7,x1:7,z0:-16.8,z1:-15.2,dePartida:'B'}]` | `travessia: []` → 1 nível com células e A* medidos (MAP3) |
| 28 | `groundHeightAt` da escada e da laje | `:1023-1047`, **antes** do ramo da rampa | — | escada: `if (ax>=6.0&&ax<=7.3){const t=(z-z0)/0.28; if(t>=0&&t<=18) return Math.min(18,Math.floor(t)+1)*0.175;}` · laje: `if (ax<=7&&Math.abs(z+16)<=0.8) return (yRef!=null&&yRef<3.15-1.2)?0:3.15;` | `desvioChaoDegrau` ≤ 0,10 (senão a MAP3 acusa "parede invisível") |
| 29 | waypoints na cota nova | `:1074-1102` | — | `linha(-6.65,-20.6,-6.65,-16.2,1.0,0.26)`, `linha(6.65,-11.4,6.65,-15.8,1.0,0.26)`, `linha(-6.4,-16,6.4,-16,1.4,0.3)` | ROTA3 (ilha alta ≥2,4 m tem de estar conectada) e a travessia do A* |
| 30 | vão sob o lance alto continua passeio | — | pé-direito 1,95 m a partir do 12º degrau | é a regra da Havan que o #467 trouxe (`yRef`) | a lane da beira (`\|x\|`=5,9, `:1087`) não é cortada |

Perfil que a MAP3 vai medir: espelho 0,175 ∈ [0,16;0,19] ✔ · piso 0,28 ∈ [0,25;0,32] ✔ · 2h+p **0,635** ∈ [0,62;0,66] ✔ · largura 1,30 ≥ 1,20 ✔ · inclinação **32,0°** ∈ [25;40] ✔ · subida 3,15 m em 5,04 m de corrida.

---

## 3. Visual e escala (SUP1 31,4% · SUP2 1,8% · ORT1 68,2%/39 — nada disso pode piorar)

| # | peça nova | material | por quê |
|---|---|---|---|
| 31 | massas do canal (1–6) | `matParedeCanal` (`:361`, tem `map`) com `MURO[i]` alternado no entulho encostado | SUP1/SUP2 não sobem: superfície nova já vem com mapa |
| 32 | barras da grade (0,05 m) e cabos de varal | `matHaste` / `matCabo` (cor pura, `:130-136`) | é a decisão declarada do mapa: peça fina com textura estoura o TEXEL3b |
| 33 | deck e parapeito das 3 passarelas | `matReboco` + `TEX.zinco` (ambos com `map`) | mesma família das pontes/telhados existentes |
| 34 | degraus | `matConcretoFino` **com** `repetir(TEX.concrete.map, ...)` pelo padrão de `:854` | degrau em cor pura viraria 36 superfícies sem `map` (≈ +1,5 pp no SUP1) |
| 35 | giro das peças novas | `angAnexo()` em massas, entulho e degraus; passarelas alinhadas | ORT1 ganha ângulo novo; **por `addBoxI`, não `addBoxSB`** — o `StaticBatch` assa a matriz e é cego ao ORT1 (`:227-229`) |
| 36 | UV | tudo por `aoBoxGeo` + `aoMat` (alvo 128 px/m) | nenhuma textura de canvas nova; nada fora do `applyAniso` |

---

## 4. Brasilidade (favela de SP: o que o dono reconhece)

| # | objeto | x,z | prop / função | o que traz |
|---|---|---|---|---|
| 37 | **grade de retenção de lixo** com sacola/pneu/madeira encostados | 6 massas de 1B | procedural + `tires`/`pilha_pneus` no pé | é o objeto que **existe** em córrego canalizado de SP e justifica a espuma de `:394-400` |
| 38 | **varal sobre o córrego** com roupa | z −30/−20/+1/+24/+30 | padrão de `:945-950` | foto de manual de favela; e é o que corta a visada cruzada |
| 39 | **tubulação de esgoto** atravessando o vão | z −8 | cilindro + sela | gambiarra de infraestrutura, irmã do emaranhado de fios de `:914-941` |
| 40 | **mercadinho** (fachada + gôndola + arara) | (−20,5;−16), (−20,4;−14,8), (−21,2;34) | `fachada_comercio`, `gondola_mercado`, `arara_roupas` | dá comércio à rua do spawn, que hoje é muro + barraco |
| 41 | **carrinho de reciclagem** | (−6,6;−3,5) e (−6,6;24) | `shopping_cart` | catador é personagem do córrego; ainda por cima é cover de agachado |
| 42 | **Kombi de entrega** | (−20,8;26,5) | `kombi` (já em `CORREGO_PROPS`) | mesmo vocabulário dos carros de `:976-984` |
| 43 | **caixa d'água azul avulsa + botijão** na beira | (−6,6;27) e (−6,6;21,5) | `caixa_dagua_azul`, `botijao_gas` | kit de favela que o mapa já consome em `:967-970` |
| 44 | bicicleta | — | **não existe no acervo** | fica de fora: `moto_cg` cobre o lugar; prop novo só pelo Mint, e não vale um item de cenário |
| 45 | som | `AMB_LOOPS.corrego` já nas 2 pontas (`:1252`) | — | nada a acrescentar; o loop de cidade a 70 m já cobre o miolo |

---

## 5. Ordem de execução e custo

**Orçamento (o teto é 8,3 M tri / 519 draw calls, #589, medido em Chrome 12/09).** Onde estão os 8,3 M, medido e não suposto: o mapa **estático** tem 31 k triângulos no build de node; a vegetação do stack em voo (BUG-72) instancia **1.833 tufos** de `grama_corrego_01/02` a **4.142 / 4.046 tri por tufo** = **7,59 M**, ou seja **7 de cada 8 triângulos do mapa** (bate com o commit `97f044984`: 14 `InstancedMesh`, 85–132 instâncias, 8,55 M no degrau cheio).

| o que a receita acrescenta | triângulos | draw calls |
|---|---|---|
| 6 massas + grades + entulho realocado | ~0,8 k (`aoBoxGeo` = 20–28 tri/caixa, medido) | 0 (entram em `IB`) |
| 3 passarelas (deck + parapeitos + pilares) | ~0,4 k | 0–1 |
| 36 degraus das 2 escadas | ~1,0 k | 0 (`IB`) |
| 5 varais (cabo + 30 peças de roupa) | ~0,7 k | 0 (`IB`) |
| tubulação + selas | ~0,15 k | 0 |
| **total estático novo** | **≈ 3,0 k tri (+0,036% do orçamento)** | **≤ +2** |
| 14 props GLB (11 ids já pré-carregados; novos: `shopping_cart`, `gondola_mercado`, `fachada_comercio`, `caixa_dagua_azul`, `arara_roupas`) | ≈ 50 k tri | +0 (vão no `PB`) · **+1,54 MiB de download** |

**O que ela poda para pagar (e sobra muito):**

| poda | de | para | ganho | risco |
|---|---|---|---|---|
| decimar `grama_corrego_01/02` a ~600 tri (é o defeito de verdade: 4.142 tri num tufo de 0,2 m = 26 k tri/m²) via `tools/optimize-props-v21.mjs` | 7,59 M | **1,10 M** | **−6,5 M** | silhueta do tufo; pede figura A/B a 2 m |
| passo do espalhamento 1,25 → 1,60 m (1.833 → 1.122 tufos) | 7,59 M | 4,65 M | −2,94 M | ralear o chão tomado |
| `cortes:{grama_corrego_01:42, grama_corrego_02:42}` no `PropBatch` (PR em voo) | 8,55 M no cheio | 4,76 M no mínimo | −44% só no degrau baixo | nenhum: já medido A/B |
| 3 peças de entulho absorvidas (itens 7–9) | — | — | −0,1 k | nenhum |

Com a decimação, **8,3 M → ≈ 1,8 M** e a receita inteira cabe 2.000× dentro do que ela poda. Sem a decimação, ela cabe igual (+0,036%).

**Passos, na ordem:**

1. **Régua primeiro** (não toca o mapa): MAP4 ciente de instância (`map-check.mjs:550-581`). Fecha `occPulados` 62→0 e `occMedidos` 108→672. Risco: nenhum — o mutante `proxy-inflado` continua mordendo porque proxy segue pulado.
2. **Chicana do fundo** (itens 1–14): massas + realocação do entulho. Fecha canal 76→26 m e MAP5 nos quadrantes 1,1/1,2/1,3/2,1/2,3. Risco alto e **medido**: sem os itens 10–14 a rota baixa do #467 morre em z=+11,1 — rodar `eval:corrego-rotas` (ROTA2/ROTA4) a cada passo.
3. **Camada sobre o vão** (15–19): passarelas baixas, varais, tubulação. Fecha exposição 30,4→17,0% / 27,5→15,0% e maior visada 76,8→65,0 m. Risco: baixo (tudo sobre o vazio, sem colisor no chão); vigiar SUP1 (usar materiais com `map`).
4. **Props de rua** (20–23, 40–43): fecha pior espaçamento 6,61→4,62 m e pior razão 0,38→0,78. Risco: estrangular o passeio — por isso `\|x\|`=6,6 e não 5,9; conferir `piorRotas` ≥2 e MAP2B (`piorFolga` 2,35 / `piorArea` 49,9 não podem cair).
5. **Segunda cota** (24–30): passarela alta + 2 escadas NBR + `stairs`/`levels` + `groundHeightAt` + waypoints. Fecha `escadas: []` e `travessia: []` e dá guarda à ROTA3. Risco: `desvioChaoDegrau` se a fórmula do `gh` não casar com os degraus construídos (é o defeito clássico da MAP3); e 1,05 m de passeio ao lado da escada oeste — se apertar, a escada vai para o bolsão alagado norte (x∈[−4,0;−2,7], z −37→−33).
6. **Poda da grama** (orçamento): decimar o GLB e manter os `cortes`. Risco: figura A/B obrigatória a 2 m e a 12 m antes de aceitar a decimação.

---

## 6. O que eu NÃO consegui decidir sem olhar figura

1. **Altura das massas do canal: 1,25 m acima do passeio.** É o que mata a visada rasante que sai das bocas assoreadas (olho a 1,67 m). Não sei se, visto da margem, isso lê como *gradil de córrego* (que é o que eu quis) ou como *muro no meio do mapa*. Se ler como muro, a alternativa é 0,75 m + varal de bainha 0,90 nas duas pontas, e o canal fica em ~34 m em vez de 26 m.
2. **Densidade de 6 massas em 76 m (uma a cada 12,7 m).** É o mínimo geométrico para ≤25 m, mas em foto pode virar pista de obstáculo. Testei grade de entrada nas bocas (z=±36) para poder usar menos massas: **não move nada** (canal seguiu 28 m) — a linha rasante nasce alta e passa por cima. Está descartado, medido.
3. **Passarela alta a 3,15 m sobre o canal.** Não sei se ela esconde a leitura do córrego (o eixo que dá nome ao mapa) na vista de spawn. Se esconder, ela vira duas meias-passarelas em cotovelo apoiadas nas palafitas de `\|x\|`≈5,4.
4. **Escada oeste a 1,05 m da lane da beira.** O número passa (corpo = 0,76 m), o conforto eu não sei julgar sem andar nela.
5. **Decimação da grama a 600 tri.** A conta é clara (−6,5 M); a silhueta do capim-colonião a 2 m eu não consigo aprovar de cabeça.
6. **Roupa no varal sobre água suja.** Pode ler como erro de cenário ("quem pendura roupa sobre esgoto?"). Na foto real isso acontece; na tela, talvez pareça descuido — quem decide é quem olha o quadro.
