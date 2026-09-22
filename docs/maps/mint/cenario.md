<!-- Levantamento do acervo mint.gg em 14/09/2026, via MCP. Índice: ../MINT-ACERVO.md -->

# Cenário e edifícios — o que vale usar do Mint

> Nada foi gerado (nenhum `start_*`, `animate_*`, `optimize_*` no MCP). Nada de `public/js/**` foi editado.
> Todo triângulo, byte e **proporção** abaixo foi medido por mim: 44 GLB baixados para `/tmp/mintglb/`,
> `node /tmp/glbtri.mjs` para tri/mats/texs/KB e `/tmp/mc_bbox.mjs` (escrito nesta rodada) para a caixa
> envolvente. Os 12+10 renders de preview foram olhados um a um.

## 0. O que tem DENTRO de cada pack (os 30, `get_asset asset_type:"asset_pack"`)

Um pack é um contêiner de 2 a 9 modelos. Esta lista não existia em lugar nenhum:

| pack | itens |
|---|---|
| **Posto e obras — kit** | Bombas de combustível · Loja de conveniência · Andaime de obra · Container escritório |
| **Atacadão — kit armazém** | Estante de pallets · Freezer horizontal · Ilha de caixas |
| **Penitenciária Carandiru — kit r3** *(partially_succeeded)* | Bloco de celas · Portão de penitenciária · ~~Guarita de muro~~ **(failed, sem GLB)** |
| **Penitenciária e serra — kit cenário** | Torre de vigilância · Galpão de festival |
| **Favela — kit casas r3** | Casa de favela azul · Casa de favela tijolo · Varal de roupas |
| **Sertão — variações de casas** | Casa de pedra · Casa com platibanda · Casa geminada de rua |
| **Sertão da Treta — kit cenário** | Casa de pau a pique · Igrejinha de praça · Caminhão antigo · Calango do sertão |
| **Amazônia — kit mata e palafitas** | Palafita com passarela · Árvore de mata densa · Palmeira babaçu |
| **Parque da Treta — kit brinquedos** | Roda gigente · Carrossel · Prédio art déco brasileiro · Barraca de quermesse |
| **Piscina do Clube — kit arquitetura** | Vestiário do clube · Pergolado de piscina · Cadeira de praia |
| **Festa na serra — kit r3** | Fogueira de festa · Poste junino · Barraca de quentão |
| **Mansão do Joá — kit interior** | Sofá de couro · Lustre de cristais · Poltrona anos 70 · Mesa de centro |
| **Mansão do Joá — kit exterior** | Coqueiro · Avião de faixa |
| **Mansão do Joá — jardim e casa** | Banco de jardim modernista · Poste de jardim · Escultura abstrata · Vaso ornamental · Lounge de exterior · Lampião de fachada |
| **Escadao FPS Props** `vd77d…` | Escadao Casa Residencial R3 · Escadao Mato de Fresta R3 |
| **Escadao FPS Props** `vd7cw…` *(pack homônimo, outro id)* | Gato Rajado · Varanda Vivida — Balcony Cluster · Instalacao Eletrica — Meter Box |
| **Sítio Atibaia — kit fauna** | Pato do lago · Galinha d'angola · Cavalinho de sítio |
| **Caatinga Village Animals** | Adult Hen · Baby Chick · Caatinga Goat |
| **Aves em voo — kit fauna** | Arara em voo · Passarinho em voo |
| **Piscinão de Ramos — props** | Churrasqueira de tijolo · Mesa com guarda-sol · Caixa térmica · Boia · Placa de regras · Caixa de som |
| **Piscinão props** | quiosque · skate_ramp · lifeguard_tower · guarda_sol · arquibancada |
| **Havan — loja de departamentos** | Gôndola de mercado · Gôndola de eletro · Arara de roupas · Caixa de cobrança · Painel de TVs · Manequim |
| **Ferro Velho — pilhas e máquinas** | Muro de carros esmagados · Fileira de prensados · Monte de carros · Guindaste com eletroímã · Prensa · Pilha de pneus |
| **Carros brasileiros clássicos** | Kombi · Opala · Chevette · Brasília · Saveiro · Fusca · Moto CG · Ônibus urbano |
| **Desk Props** | laptop · headphone · caneca · teclado |
| **Tribos Urbanas** / **Funkeiros** | 9 personagens cada |
| **csbr-arsenal / -2 / -3** | 8 + 8 + 6 armas |

**Os 6 primeiros packs desta tabela — 22 modelos de arquitetura — não têm UM arquivo em `public/models/props/`.** Conferido nome a nome contra os 155 arquivos da pasta.

**Dois fatos que mudam a leitura de custo (medidos, não estimados):**

1. **Proporção é o gargalo, não polígono.** Os 44 GLB medidos vão de **3.522 a 5.081 tri** (média 4.497). O teto POLY4 é 12.000: **nenhum edifício chega perto**. Todos têm **1 primitivo, 1 material, 3 texturas** — ou seja **1 draw call por modelo**, e N cópias do mesmo id viram **1 draw call só** no `PropBatch` (`mapprops.js:228`, instancia por id). O risco real é geométrico: `placeProp` escala com **um escalar** (`mapprops.js:48-58`), então GLB com proporção diferente da caixa sempre sobra ou falta.
2. **Byte não é problema — o pipeline da casa já resolve.** Rodei `dedup + prune + textureCompress(webp, 512²)` (as mesmas 3 transformações de `tools/optimize-props-v21.mjs:84`) sobre 6 dos GLB crus: **bloco_celas 971→299 KB · casa_favela_azul 842→292 · container_escritorio 932→280 · loja_conveniencia 850→249 · roda_gigante 1361→349 · torre_vigilancia 1036→296**, com **triângulo intacto nos seis**. Prova cruzada: `quiosque` cru do Mint = 4.730 tri / 1.221 KB; o `quiosque.glb` **já servido** = os mesmos 4.730 tri / 451 KB. `@gltf-transform` e `sharp` **estão instalados nesta máquina** (a armadilha é que script em `/tmp` não resolve ESM contra `client/node_modules` — resolvi com symlink).

---

## 1. Já mintado e que entra JÁ

Tri e KB são meus. **KB é o valor DEPOIS do passe de otimização** onde eu rodei; onde não rodei, digo o cru. A coluna de proporção é o que decide: o colisor continua sendo a caixa (`mapprops.js:48`, `placeProp` devolve `null` sem GLB), e o padrão de troca é o `vestir()` de `map_parque.js:411` — a caixa fica, vira `visible:false` + `userData.proxyGLB`, sai de `occluders`, e o GLB entra por cima. **Toda linha abaixo exige acrescentar o id ao array `<MAPA>_PROPS`**, senão `placeProp` devolve `null` e o mapa fica como está hoje.

### 1.1 As caixas procedurais de ONTEM que têm equivalente pago

| caixa de ontem | arquivo:linha | asset Mint | tri | caixa que a proporção pede (mesma altura) | veredito |
|---|---|---|---|---|---|
| **barracão** (alojamento/refeitório) 6,0×2,8×3,0, ×2 | `map_obras.js:408,423-424` | **Container escritório** `ks7dzxq…` | **4.406** (280 KB otim.) | 4,75 × 2,8 × 3,42 | **TROCAR.** É literalmente um contêiner de obra azul com ar-condicionado, janela gradeada e degrau. Estreitar a caixa de 6,0→4,75 e aprofundar 3,0→3,42; a caixa encolhe, então o grafo do A* (que já perdeu 64 nós por causa deste barracão, recibo de `obras_prefeitura`) **ganha** nó de volta. |
| **contêiner de óleo queimado** 3,0×2,6×3,0, ×2 | `map_posto.js:404` | **Container escritório** (mesmo id) | 4.406 | 4,41 × 2,6 × 3,17 | **TROCAR**, alargando a caixa 3,0→4,41. Mesmo id do obras ⇒ **zero download novo** e 1 draw call para as 4 cópias somadas. |
| **guarita da balança / depósito de óleo** 3,6×3,0×4,4, ×2 | `map_posto.js:401` | **Vestiário do clube** `ks729z8…` | **4.742** | 2,55 × 3,0 × 2,82 | **TROCAR.** O render é um bloco de alvenaria com **cobogó colorido** e caixa d'água azul — é arquitetura utilitária brasileira genérica, não piscina. Caixa encolhe 1 m em cada eixo. |
| **guarita "REVISTA NA SAÍDA"** 2,4×2,5×2,4 | `map_atacadao.js:364-366` | **Vestiário do clube** (mesmo id) | 4.742 | 2,13 × 2,5 × 2,35 | **TROCAR — encaixa sem mexer na caixa** (Δ ≤ 0,5 m em ambos os eixos). É a única troca desta tabela que não pede reescrever dimensão. |
| **guarita de muro** (4 torres) 4,8×9,35×4,8 | `map_penitenciaria.js:190-200` | **Weathered Searchlight Guarita** `ks7e9be…` | **4.749** | 5,33 × 9,35 × 5,14 | **TROCAR.** Cabine sobre 4 pilares de concreto com escada metálica e holofote — é a `guardTower` desenhada. Alargar a caixa 4,8→5,33/5,14. Alternativa medida: **Torre de vigilância** `ks79j7c…` **4.535 tri** (296 KB otim.), 5,14 × 9,35 × 5,61 — cabine de madeira com escada de marinheiro, mais rural, menos Carandiru. |
| **pavilhão** `bloco()` 11,4×5,8×5,0, ×4 | `map_penitenciaria.js:318-330` | **Bloco de celas** `ks7ad5w…` | **3.988** (299 KB otim.) | **girado 90°**: 12,89 × 5,8 × 5,03 | **TROCAR, com `ry += π/2`.** Sem girar dá 5,03 × 5,8 × 12,89 (errado). Girado, contra a caixa de hoje é Δ +1,49 m de largura e **+0,03 m de profundidade** — encaixa. O render é galeria de 2 pavimentos com passarela gradeada e escada externa: é Carandiru. Ressalva honesta: as **celas continuam procedurais e transitáveis** (`cell()`, `:205`); o GLB veste só o volume fechado do bloco. |
| **bilheteria / barraca** — 16 entradas `[null,…]` do array `MASSAS`, cada uma espelhada ×2 = **32 caixas nuas** | `map_parque.js:417-455` | **Barraca de quermesse** `ks77wmw…` | **4.419** | 2,87 × 2,9 × 2,67 | **TROCAR nas barracas de 2,4–3,2 m** (as de 5,0–5,4 m são grandes demais). O `vestir()` já está no arquivo: é acrescentar o id na 1ª coluna do `MASSAS` e `'barraca_quermesse'` em `PARQUE_PROPS:18`. Complementa o `stall.glb` (4.669 tri) que hoje se repete. |
| **torre de fardo** 1,6×2,2×1,6, e as ilhas do armazém | `map_atacadao.js:305-308` | **Estante de pallets** `ks7d5h0…` | **4.565** | 2,18 × 2,2 × 0,79 | **ACRESCENTAR, não trocar.** O GLB é um **porta-pallet de 3 níveis** (fino: 0,79 m de profundidade), não uma pilha de fardo. A torre de fardo continua; a estante entra encostada na parede da loja, que é onde hoje não há nada. |

### 1.2 O casario — a dívida POLY3 tem substituto pago e medido

O `RELATORIO-LOWPOLY.md:124-136` lista 6 casas abaixo de 2.000 tri como a família mais pobre do acervo. O substituto existe, está pago e ninguém baixou:

| hoje (servido) | tri / KB hoje | asset Mint | tri / KB | ganho medido |
|---|---|---|---|---|
| `fav_house` (`fy_corrego`, `posto`, `obras`, `atacadao`) | **1.070 tri / 2.015 KB** | **Casa de favela azul** `ks7fet6…` | **4.780 / 292 KB** (otim.) | **+3.710 tri de forma e −1.723 KB de download.** POLY5 sai de **1,88** (o pior do acervo) para **0,061**. Sobrado azul com caixa d'água, antena parabólica e poste de gambiarra. Caixa nova: 5,76 × 6,0 × 4,56. |
| `fav_brasileira` | **780 tri / 655 KB** | **Casa de favela tijolo** `ks77wm8…` | **4.181 / 942 KB cru** | +3.401 tri. Caixa nova: 5,5 × 5,5 × 5,85. |
| `lajes_casa_01/02/04/05/06` (750–1.883 tri) | 750–1.883 | **Escadao Casa Residencial R3** `ks75hh6…` | **4.146 / 1.029 KB cru** | Casa de tijolo com platibanda e janela gradeada. Serve `fy_lajes` (via **`map_lajes_authored.js:26`** — o `map_lajes.js` é legado morto, `maps.js:9` importa o authored) e `fy_escadao`, que hoje tem **11 chamadas de `casa()` (`map_escadao.js:237`) e ZERO casario GLB**. Contra `casa(5,4,5)`: 6,56 × 4,0 × 4,39 (alargar 1,56 m). |

**`fy_escadao` é o caso mais gritante:** o pack **`Escadao FPS Props`** foi gerado em **06/09** — 7 dias atrás — com o nome do mapa no título, e **nenhum dos 5 itens está no disco nem em `ESCADAO_PROPS` (`map_escadao.js:20`)**.

### 1.3 Edifício-marco que não existe em caixa nenhuma (pura adição)

| asset | tri | proporção | onde entra |
|---|---|---|---|
| **Prédio art déco brasileiro** `ks7a5tm3…` | **4.297** | 8,3 × 10 × 9,6 (a H = 10 m) | Esquina de 2 pavimentos com toldo e portas de aço — entorno de `parque_treta`, `quebrada`, `atacadao_treta` e `praca_poderes`. Hoje esse skyline é faixa de vidraça em canvas (`map_atacadao.js:34`). |
| **Portão de penitenciária** `ks75stmh…` | **4.491** | 9,52 × 6 × 1,52 | O **pórtico da Divinéia** (`map_penitenciaria.js:331`), hoje caixas de reboco. Portão gradeado com refletores e faixas zebradas. |
| **Weathered Watchtower Guard Booth** `ks7a33yh…` | **4.827** | 6,66 × 9 × 3,42 | **É a "Guarita de muro" que FALHOU no pack** — guarita montada sobre um trecho de muro, com escada externa. Endereça a dívida declarada `ALT1:penitenciaria` (h90 8,8 m, faltam 0,2 m, e o texto do `RODADA-CONSERTO.md:129` diz literalmente "a massa que falta é a passarela de guarita"). A 9 m de altura, resolve. |
| **Andaime de obra** `ks72da37…` | **4.299** | 2,25 × 5 × 2,05 | Torre de andaime de bambu com tela verde. `obras_prefeitura` tem escoramento de cava (`:343`) mas nenhuma torre de andaime — e é o objeto que dá nome ao mapa. |

**Custo somado da seção 1** (11 ids distintos, cada um 1 material): **≈ 49.000 tri de geometria única** e **≈ 3,4 MB** de download depois do passe de otimização. Contra o orçamento medido: `obras_prefeitura` tem hoje **15.478 tri** (recibo) e `fy_corrego` **8,3 M**. Onze draw calls a mais, independentemente de quantas cópias.

---

## 2. Já mintado mas NÃO vale usar — com o motivo medido

| asset | tri | por que NÃO |
|---|---|---|
| **Roda gigente** `ks74m3x6…` | **3.913** | O `map_parque.js:342-356` **anima** a roda: `animated.wheel` gira, 8 `hanger` de cabine balançam. O GLB tem **1 primitivo e 1 material** — não existe nó de aro separado do de cabine para girar. Trocar troca movimento por textura. **Veto medido, não estético.** |
| **Carrossel** `ks7dba32…` | **4.419** | Mesma coisa e pior: `map_parque.js:301-320` sobe e desce **8 cavalos** individualmente (`animated.horses`, `phase`). 1 primitivo ⇒ perde os 8. |
| **Bombas de combustível** `ks7bh1nb…` | **5.081** (o maior que medi) | O GLB é a **ilha inteira com marquise própria** — bbox 1 × 0,81 × 0,38: a cobertura domina a altura. O `posto_treta` já tem marquise plana a **5,5 m sobre 6 pilares** (`map_posto.js:196`). Encaixado na ilha (`:208`, altura útil 2,12 m), o escalar único deixa a **bomba com ~1,3 m** em vez dos 1,9 m que ela tem hoje — bomba na altura do joelho, e um toldo debaixo de outro toldo. Só entra se alguém decidir tirar a marquise procedural de uma das 3 ilhas. |
| **Palafita com passarela** `ks78sxjj…` | **3.522** (o mais barato) | O `fy_corrego` tem 6 palafitas sobre o canal (`map_corrego.js:827-847`) e a tentação é óbvia — mas o render é **telhado de sapê amazônico sobre estacas de madeira roliça**. O córrego é zinco, tijolo e compensado, e a régua **ESC4/BUG-55** fixa o corpo em 2,40–2,80 m de pé-direito. Material errado para o mapa. Guardar para um mapa de Amazônia. |
| **Escadao Mato de Fresta R3** `ks7e3k76…` | **4.347** | O nome promete vegetação de fresta barata; o render é **um tufo de capim** e ele custa **4.347 tri** — praticamente o mesmo `grama_corrego_01` (4.142) que é a dívida de 7,59 M do `fy_corrego`. Confirma o achado do MintProps por outra amostra: **não existe asset barato saindo deste pipeline**. Usar isto multiplicado é repetir o erro do capim. |
| **Varanda Vivida — Balcony Cluster** `ks7b982p…` | **4.453** | Nome enganoso: não é varanda, é **uma cadeira de plástico branca com 2 vasos**. É prop de chão (frente do MintProps), não arquitetura. |
| **Bloco de celas** *como pavilhão jogável* | 3.988 | Só como **volume**. O `bloco()` do mapa é atravessável por 2 portas em pontas opostas (`map_penitenciaria.js:322-327`) e as celas de `cell()` são transitáveis. 1 primitivo não tem interior. Entra vestindo o volume fechado; **não** substitui geometria por onde se anda. |

---

## 3. Falta mintar

Com prioridade e alvo de polígono. O acervo cobre quase tudo de arquitetura; o que falta é o que **tem movimento** ou o que o pipeline não sabe fazer:

| ordem | o que falta | alvo | por quê |
|---|---|---|---|
| 1 | **Roda-gigante e carrossel em PEÇAS separadas** (aro / cabine / cavalo como nós nomeados) | ≤ 6.000 tri o conjunto | É a única forma de trocar o procedural do `parque_treta` sem perder animação. Existe precedente na casa: `tools/split-props-v21.mjs` foi escrito exatamente para isso (pipa, helicóptero, avião "passam antes pelo split"). Ou se re-minta em peças, ou se aceite o procedural. |
| 2 | **Bomba de combustível SOZINHA**, sem ilha e sem marquise | ≤ 3.000 tri, proporção alta e estreita (~0,7 × 1,9 × 0,55) | Desbloqueia a única troca de identidade do `posto_treta` que hoje está travada por proporção. |
| 3 | **Casario de laje em 3 variações** para `fy_lajes`/`quebrada` | ≥ 4.000 tri cada | O `Escadao Casa Residencial R3` cobre 1 variação; `LAJES_AUTHORED_ASSETS` usa 7 ids distintos (`map_lajes_authored.js:14-15`). Uma casa repetida 7 vezes lê como maquete. |
| 4 | **Marquise/toldo de posto** e **fachada de galpão de atacado** | ≤ 8.000 tri | As duas maiores superfícies chapadas que sobraram (SUP1 `posto` 21,7%, `atacadao` 21,6%). |
| 5 | **Muro de penitenciária em módulo** (com concertina) | ≤ 3.000 tri | O `fence()` (`:170-188`) usa `TorusGeometry` clonado a cada 0,7 m nos 4 lados — é a peça mais repetida do mapa e é procedural pura. |

---

## 4. Custo e risco

**Custo de crédito: zero.** Nada foi gerado. Só `get_asset`, `list_asset_artifacts` e `get_asset_artifact` (que devolve URL de CDN — download é grátis).

**Custo de runtime, medido:** 11 ids novos = ~49.000 tri únicos, ~3,4 MB depois do passe de otimização, **11 draw calls** (1 material por modelo, `PropBatch` instancia por id). Para comparar: o `fy_corrego` gasta **7,59 M de triângulos só em capim**.

**Riscos, em ordem:**

1. **Proporção, e é o risco real.** `placeProp` (`mapprops.js:48-58`) escala com **um escalar**; `targetLen` casa comprimento e altura pela **média geométrica**, o que ainda deixa o terceiro eixo livre. Toda linha da seção 1 traz a caixa que a proporção pede — **quem aplicar tem que mudar a caixa, não só acrescentar o `placeProp`**, senão a silhueta sobra fora do colisor e o tiro passa pela borda visível.
2. **A caixa encolher mexe no A\***. O recibo do `obras_prefeitura` documenta 247 nós ilhados causados por **uma kombi e um barracão** cortando uma coluna de waypoint. Toda mudança de caixa desta lista tem que rodar `npm run eval:mapcontrato` (MC3) antes de ser considerada feita.
3. **`ORT1` pode cair.** Vestir caixa girada com GLB não muda ângulo, mas **encolher** caixa muda fração de massa girada. `atacadao` está em 54,2%, `obras` em 40,3% — folga; `penitenciaria` em 17,6% contra piso de 15% — **sem folga**.
4. **Nada disto foi olhado em pixel.** Pela LEI 4 do `AGENTS.md`, nenhuma troca desta lista está pronta até alguém capturar. Eu vi os **renders de preview do Mint** (fundo branco, modelo isolado) — isso responde "que forma tem", não responde "como fica no mapa, na luz do mapa, ao lado do procedural que sobrou". A regra de um agente por browser valeu; não abri aba.
5. **Mistura de linguagem visual.** Metade dos renders é fotorrealista suja (bombas, torre, bloco de celas, portão) e metade é ilustrada com contorno (loja de conveniência, casa de favela azul, casa com platibanda, container). Colocar as duas no mesmo mapa é o risco estético desta lista, e é exatamente o tipo de coisa que só figura resolve.

---

## 5. Pago e órfão — o que informa a decisão do dono

### 5.1 Kit inteiro pago para um mapa que NÃO EXISTE

| kit | itens | tri medidos | mapa que consumiria |
|---|---|---|---|
| **Sertão — variações de casas** | Casa de pedra **4.385** · Casa com platibanda **4.110** · Casa geminada de rua **4.696** | 13.191 | nenhum |
| **Sertão da Treta — kit cenário** | Casa de pau a pique **4.318** · Igrejinha de praça **4.542** · Caminhão antigo **4.599** | 13.459 | nenhum |
| avulsos de sertão | Weathered Terracotta Chapel **4.549** · Sertanejo Stone Well **4.862** · Rustic Palapa Dance Stage **4.060** · Festive Green Coreto **4.742** | 18.213 | nenhum |
| **Amazônia — kit mata e palafitas** | Palafita com passarela **3.522** · Árvore de mata densa **4.334** · Palmeira babaçu **4.694** | 12.550 | nenhum |
| **Festa na serra — kit r3** | Fogueira de festa **4.591** · Poste junino **4.743** · Barraca de quentão **4.660** | 13.994 | nenhum |
| **Penitenciária e serra**, item "serra" | Galpão de festival **4.563** | 4.563 | nenhum |
| **Piscina do Clube — kit arquitetura** | Vestiário do clube **4.742** · Pergolado de piscina **5.074** · Cadeira de praia **4.648** | 14.464 | `piscina_treta` é um **salão FECHADO de azulejo** (`map_piscina.js:11-21`), não clube com deck — e **não tem entrada `props` em `maps.js:57`**, ou seja não pré-carrega GLB nenhum. |

### 5.2 O que isso diz sobre o retheme do `velho_oeste` para Sertão

**O `velho_oeste` é o único mapa do registro sem NENHUM GLB** — sem `props` em `maps.js:93`, sem `import { placeProp }`, 40 chamadas de `addBox`, 12 edifícios inteiramente procedurais (8 `building()` + 4 `streetHouse()`). E o próprio arquivo já antecipa a decisão em comentário, `map_velho_oeste.js:233`: *"a platibanda do sertão, se o retheme entrar"*.

O retheme tem **kit completo pago, medido, e sem uso**:

| edifício procedural de hoje | asset de sertão | tri | caixa que a proporção pede |
|---|---|---|---|
| `building()` 7 × 5,8 × 11 (×8: saloon, banco, armazém, hotel, xerife, barbeiro, empório, estábulo) | **Casa com platibanda** (girada 90°) | 4.110 | 8,91 × 5,8 × 10,74 — Δ +1,91 / −0,26 m |
| idem, variação | **Casa de pedra** | 4.385 | 7,84 × 5,8 × 7,76 |
| idem, variação | **Casa geminada de rua** | 4.696 | 7,07 × 5,8 × 6,65 |
| `streetHouse()` 5,5 × 4,7 × 7,2 (×4) | **Casa de pau a pique** | 4.318 | 6,03 × 4,7 × 5,78 |
| — (não existe marco) | **Igrejinha de praça** | 4.542 | 5,40 × 9,0 × 7,83 |
| — | **Weathered Terracotta Chapel** | 4.549 | 7,02 × 9,0 × 6,39 |
| — | **Sertanejo Stone Well** | 4.862 | 1,72 × 2,2 × 1,43 |
| — | **Festive Green Coreto** | 4.742 | 4,70 × 5,0 × 4,95 |
| — | **Rustic Palapa Dance Stage** | 4.060 | 8,49 × 4,5 × 8,49 |
| — | **Caminhão antigo** | 4.599 | 5,91 × 2,6 × 2,48 |

**Leitura para o dono:** 10 edifícios de sertão, **44.863 tri somados**, ~3,0 MB depois do passe de otimização, 10 draw calls. O `RODADA-CONSERTO.md:139-142` registra que o retheme está pronto em `worktrees/mapas-stack-550-v2` e que a estética faroeste já foi vetada por escrito. **O acervo não é obstáculo para o retheme: ele já foi comprado para o retheme.** O que falta é a decisão e a mão que edita `map_velho_oeste.js`.

### 5.3 Órfão que já está SERVIDO no disco

Estes já foram baixados, otimizados e registrados no `mint-assets.json`, e **nenhum mapa os referencia**:

| arquivo | tri / KB | situação |
|---|---|---|
| `helicoptero_pm.glb` | 4.933 / 342 KB | passou pelo `split-props-v21.mjs` (nós animáveis) e por `optimize-props-v21.mjs:26`; grep em `public/js/**` = **0 referências** |
| `aviao_faixa.glb` | 4.546 / 292 KB | idem, `:27`; **0 referências** |
| `lifeguard_tower.glb`, `boia.glb`, `placa_piscina.glb`, `skate_ramp.glb` | 4.588 / 4.524 tri os dois maiores | só referenciados por `map_piscinao_ramos.js`, que **está fora do registro** (`maps.js:57` diz isso explicitamente). Ficam pré-carregados por `main.js:166-167` (`MAP_PROPS`) para o **backdrop do menu** — download que acontece em toda sessão para um mapa que ninguém joga. |

### 5.4 Um pack veio meio quebrado e ninguém aproveitou o conserto

`Penitenciária Carandiru — kit r3` está **`partially_succeeded`**: o item **"Guarita de muro"** falhou e não tem GLB. Foram gerados dois substitutos avulsos que **funcionaram** — `Weathered Watchtower Guard Booth` (4.827 tri) e `Weathered Searchlight Guarita` (4.749 tri) — e **nenhum dos dois foi para o disco**. O mapa seguiu com guarita procedural até hoje, e a dívida `ALT1:penitenciaria` continua aberta por 0,2 m de altura que qualquer um dos dois resolve.

---

## 6. O que eu não consegui medir

- **Nada em pixel de dentro do jogo.** Só renders de preview do Mint (modelo isolado, fundo branco). "Como fica ao lado do procedural que sobrou, na luz do mapa" está em aberto para as 11 trocas da seção 1 — e é o risco nº 5.
- **Escala real do mundo dentro do GLB.** Todos os 44 vêm normalizados numa caixa unitária (a maior dimensão = 1,00 em 43 dos 44). Por isso reportei **proporção**, não metro: o metro vem do `targetH` que o mapa escolher.
- **Textura por canal.** Contei 3 imagens por modelo em todos os 44, mas não abri para conferir se são baseColor/metalRough/normal ou se alguma é redundante — `prune()` não removeu nenhuma no passe que rodei, o que sugere que as três são usadas.
- **Se `Casa de favela azul`/`tijolo` batem com a paleta do `fy_corrego` já corrigido.** O `fy_corrego` recebeu textura nova ontem; o A/B de albedo é medição de captura, que não fiz.
- **Os 3 packs de arma, os 2 de personagem e o `Desk Props`** — fora da minha frente, listei o conteúdo mas não baixei nem medi.
- **Custo em crédito de `optimize_generated_model` / `retopologize_generated_model`** do MCP: não li o schema dessas ferramentas porque a pergunta era do MintProps e, com `@gltf-transform` rodando local (provado nesta rodada), a decimação não precisa delas.
