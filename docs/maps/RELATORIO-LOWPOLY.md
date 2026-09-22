# Relatório low-poly — o que está pobre, o que está desperdiçado, e a fila do Mint

> Medido em 13/09/2026 lendo **todo GLB servido** do repositório pelo container glTF (chunk JSON,
> soma de `accessors` por primitivo; script em `/tmp/glbtri.mjs`, sem dependência nova) e contando
> as geometrias procedurais no `three` vendorizado. São **248 arquivos**: 151 props servidos,
> 63 personagens, 27 armas, 11 de fauna, 2 de casca, 1 de braço.
>
> Pedido do dono: *"quero fazer um relatório do que está muito lowpoly, temos que melhorar os
> animais, nenhum pode ser lowpoly, tem que usar os moldes do mint gg ou mintar novos."*

---

## 1. O achado principal não é low-poly. É orçamento no lugar errado.

O acervo **não é pobre de triângulo** — ele é mal distribuído. Os números são de hoje:

| objeto | triângulos | o que é |
|---|---|---|
| `vw_9150` | **89.198** | um caminhão |
| `caixa_dagua` | **18.749** | uma caixa d'água |
| `botijao_gas` | **17.132** | um botijão de gás |
| `concrete_roadblock` | **10.593** | um bloco de concreto |
| `statue_liberty` | 8.536 | a estátua da Loja H |
| `lajes_casa_03` | 7.014 | uma casa |
| **`congresso`** | **4.905** | **o Congresso Nacional inteiro** |
| `grama_corrego_01` | **4.142** | **um tufo de capim de 0,2 m** |
| `palmeira_imperial` | 3.637 | uma palmeira |
| `kombi` | 2.797 | uma Kombi |
| `lajes_casa_01` | 1.883 | uma casa |
| `fav_house` | **1.070** | **uma casa de favela inteira** |
| `fav_brasileira` | **780** | outra casa |
| `jersey_barrier` | 369 | uma barreira New Jersey |

Ou seja: **um botijão de gás custa 16 casas de favela**, e **um tufo de capim custa quase um
Congresso Nacional**.

> **CORREÇÃO de 14/09 — a atribuição do capim nesta página estava errada.** A versão de 13/09
> dizia que "7,59 M dos 8,3 M triângulos do `fy_corrego` são 1.833 tufos de
> `grama_corrego_01/02`". **Não confere com o código.** Três evidências, conferidas por mim
> depois do relato: (1) `map_corrego.js:443` testa `hasProp('grama_corrego')` — **sem sufixo**,
> e `mapprops.js:41` casa id exato, então nenhum tufo nasce ali; (2) `grama_corrego` não está em
> `CORREGO_PROPS` (`map_corrego.js:45-53`); (3) quem planta capim é o `fy_campomorro`
> (`map_campomorro.js:740-763`), com **68 tufos**. **Custo real do capim: 68 × ~4.142 =
> 281.656 tri, e no campomorro.** Os 8,3 M do córrego são reais (medidos no browser pelo
> PR #589) mas **a causa continua por identificar** — não é o capim.
>
> A alavanca de verdade é outra, e é maior: **`vw_9150` (89.198 tri) aparece 7× no
> `posto_treta` = 624.386 triângulos**, mais 5× na Praça e 3× nas Obras. O capim inteiro é
> menos da metade disso.

**Consequência prática:** não falta budget para deixar casa, bicho e prop bonitos. Falta tirar o
budget de onde ele não aparece (caminhão, botijão, bloco de concreto) e pôr onde o jogador olha.

---

## 2. Fauna — o pedido literal do dono

### 2.1 O que existe hoje, medido

| animal | arquivo | tri | verts | skin | animações | KB | aparece em |
|---|---|---|---|---|---|---|---|
| cachorro (caramelo) | `dog_caramelo.glb` | **1.950** | 3.966 | sim | **12** | 486 | campomorro, lajes, ferro velho, quebrada, posto, parque |
| barata | `barata_urbana.glb` | **2.124** | 3.540 | **não** | **0** | 127 | córrego, atacadão |
| gato | `cat_telhado.glb` | **2.448** | 2.276 | sim | 3 | 207 | córrego, lajes, quebrada |
| vaca | `vaca_campo.glb` | **2.450** | 4.970 | sim | 3 | 846 | campomorro |
| galinha | `galinha_campo.glb` | 2.904 | 1.651 | sim | 2 | 113 | córrego, campomorro |
| papagaio | `papagaio_poleiro.glb` | 2.961 | 4.573 | **não** | **0** | 184 | mansão, parque |
| tatu | `tatu_campo.glb` | 3.136 | 5.084 | **não** | **0** | 198 | campomorro, praça |
| rato | `rat_animated.glb` | 3.642 | 2.150 | sim | 1 | 238 | **os 17 mapas** |
| jacaré | `jacare_corrego.glb` | 4.856 | 6.095 | **não** | **0** | 237 | córrego |
| capivara | `capivara_corrego.glb` | 5.005 | 5.660 | **não** | **0** | 219 | córrego |
| pomba | `pigeon_ground.glb` | 6.928 | 4.145 | sim | 1 | 504 | **os 17 mapas** |

**Régua de comparação, com procedência interna:** a mediana dos personagens jogáveis é **4.869
tri** (63 GLB) e a das armas **4.827** (27 GLB) — os dois catálogos gerados pelo mesmo pipeline
Mint. **Bicho abaixo disso está abaixo do padrão da casa, e não por pouco:** cachorro com 1.950
tri é **40% de um personagem**.

### 2.2 O veredito, animal por animal

| # | animal | problema medido | ação |
|---|---|---|---|
| 1 | **cachorro** | 1.950 tri — o mais pobre da fauna, e é o bicho mais visível do jogo (6 mapas, anda perto do jogador) | **re-mintar** com alvo ≥5.000 tri, reaproveitando as **12 animações** que já existem (retarget, não regerar) |
| 2 | **barata** | 2.124 tri **e 0 animação** — barata parada no chão | **re-mintar + animar** (ela corre; parada é pior que low-poly) |
| 3 | **gato** | 2.448 tri, 2.276 verts, só 3 clipes | **re-mintar** ≥4.500 tri |
| 4 | **vaca** | 2.450 tri para um bicho de 1,75 m — é o maior animal do jogo com a segunda menor densidade | **re-mintar** ≥5.000 tri |
| 5 | **papagaio** | 2.961 tri, **0 animação** — papagaio de enfeite | **re-mintar + animar** (pouso, cabeça, asa) |
| 6 | **tatu** | 3.136 tri, **0 animação** | **animar** (locomoção hoje é procedural em `ambientlife.js`) |
| 7 | **jacaré** | 4.856 tri, **0 animação** — deitado, imóvel, no mapa em que é atração | **animar** (respiração, cauda, boca) |
| 8 | **capivara** | 5.005 tri, **0 animação** | **animar** (pastar, orelha, passo) |
| 9 | galinha | 2.904 tri mas só **1.651 verts** e 2 clipes | re-mintar se sobrar rodada |
| 10 | rato | 3.642 tri, 1 clipe, **está nos 17 mapas** | aceitável; ganharia com 2º clipe (parado/comendo) |
| 11 | pomba | 6.928 tri, 1 clipe | **a única fauna acima do padrão da casa** — é o gabarito |

**Resumo:** **5 dos 11 animais não têm animação nenhuma** (barata, papagaio, tatu, jacaré,
capivara) e **4 estão abaixo de 2.500 tri** (cachorro, barata, gato, vaca). Bicho parado num FPS
lê como cenário quebrado, independente do polígono.

### 2.3 O low-poly de verdade: os proxies procedurais que substituem o bicho

Quando o GLB **não carrega** (`?glb=0`, node, falha de rede, cache velho), o jogo desenha um bicho
feito de esfera e cone. Contagem exata, medida no `three` vendorizado:

| proxy | `ambientlife.js` | triângulos | contra o GLB |
|---|---|---|---|
| cachorro | `fallbackDog()` `:99` | **176** | 1.950 (11×) |
| pomba | `fallbackPigeon()` `:85` | **218** | 6.928 (32×) |
| papagaio | `fallbackParrot()` `:151` | **218** | 2.961 (14×) |
| rato | `fallbackRat()` `:59` | **394** | 3.642 (9×) |
| tatu | `fallbackArmadillo()` `:122` | **561** | 3.136 (6×) |
| barata | `fallbackCockroach()` `:139` | **114** | 2.124 (19×) |

E no `fy_corrego` existem dois proxies **dentro do próprio mapa** — jacaré (`map_corrego.js:490-521`)
e capivara (`:519-583`), feitos de cilindro e esfera, que ficam `visible = false` quando o GLB
carrega e **reaparecem quando ele falha**.

**Decisão que isto exige do dono:** *"nenhum animal pode ser low-poly"* tem duas leituras.
1. **Fail-closed** (recomendada): sem GLB, **não desenha bicho nenhum**. O mapa perde a fauna, não
   ganha um boneco de esfera. É de uma linha por fallback, e a régua consegue provar.
2. Manter o proxy como rede de segurança para o arnês em node (que nunca carrega GLB) e desligá-lo
   só no browser.

A segunda é o que o código tenta fazer hoje, mas sem régua: **nada mede se o proxy vazou para a
tela do jogador**. Enquanto isso não existir, a resposta honesta para "o bicho está low-poly?" é
"às vezes, e ninguém sabe quando".

---

## 3. Props servidos abaixo do piso

Distribuição dos 151 props servidos: p10 **2.168** · p25 **3.047** · mediana **4.688** ·
p75 11.134 · p90 31.814 tri. Abaixo de 2.000 tri, em ordem:

| prop | tri | KB | onde dói |
|---|---|---|---|
| `jersey_barrier` | **369** | 96 | barreira de rua — encostada, é chapa |
| `lajes_casa_06` | **750** | 140 | casario do `fy_lajes` |
| `fav_brasileira` | **780** | 655 | casa — 655 KB de textura em 780 tri é textura carregando forma |
| `lajes_casa_05` | **891** | 151 | casario |
| `shopping_cart` | **952** | 260 | carrinho do Atacadão, objeto de mão |
| `fav_house` | **1.070** | **2.015** | casa inteira com 13 texturas e 2 MB |
| `burned-out_cars` | 1.098 | 453 | ferro velho |
| `lajes_casa_02` | 1.354 | 197 | casario |
| `jeep_cherokee` | 1.376 | 151 | veículo |
| `dumpster` | 1.401 | 170 | caçamba |
| `dirty_lada_lowpoly_from_scan` | 1.716 | 246 | o nome já avisa |
| `lajes_casa_04` | 1.827 | 263 | casario |
| `lajes_casa_01` | 1.883 | 240 | casario |

**O padrão:** o **casario** é a família mais pobre do acervo — 6 das 13 entradas. E casario é
justamente o que o jogador tem na cara o tempo todo em `fy_lajes`, `quebrada`, `fy_escadao` e
`fy_corrego`, que são a identidade do jogo. `fav_house` com **2 MB de textura para 1.070 tri** é o
retrato do problema: a forma é caixa, quem finge relevo é a imagem — e isso desmonta a 3 m de
distância, que é a distância de combate.

---

## 4. A fila de trabalho

### 4.1 Mint — re-mintar (molde existente, forma pobre)

| ordem | asset | hoje | alvo | por quê |
|---|---|---|---|---|
| 1 | `dog_caramelo` | 1.950 tri | ≥5.000, **reaproveitando os 12 clipes** | bicho mais visível do jogo |
| 2 | `fav_house`, `fav_brasileira`, `lajes_casa_01/02/04/05/06` | 750–1.883 tri | ≥4.000 cada | é o casario, é a identidade |
| 3 | `vaca_campo`, `cat_telhado`, `barata_urbana` | 2.1–2.5 k | ≥4.500 | abaixo do padrão da casa |
| 4 | `shopping_cart`, `dumpster`, `jersey_barrier` | 369–1.401 | ≥2.500 | objeto que o jogador encosta |

### 4.2 Mint — animar (forma boa, bicho parado)

`jacare_corrego` · `capivara_corrego` · `tatu_campo` · `papagaio_poleiro` · `barata_urbana`.
São 5 GLB **sem `skins` e sem `animations`**; a locomoção hoje é empurrada por código
(`ambientlife.js`, `QUAD_SPEED` `:31`), o que move o bicho inteiro sem mover uma pata.

### 4.3 Decimação — o outro lado da mesma moeda

Números de 14/09, **medidos com a decimação de fato executada** (`@gltf-transform` +
`MeshoptSimplifier`, `weld` → `join` → `simplify`, custo zero):

| asset | hoje | medido depois | corte | desvio de bbox | onde dói |
|---|---|---|---|---|---|
| `vw_9150` | **89.198** | **7.132** | −92% | 1,31% | 7× no posto = **624.386 tri**; 5× na Praça; 3× nas Obras |
| `uno_mille` | 39.807 | 21.533 | −46% | — | resiste em parte |
| `car_a` | 27.142 | 4.799 | −82% | — | — |
| `caixa_dagua` | 18.749 | 3.997 | −79% | **0,10%** | 8× no `fy_lajes` = 112.904 tri |
| `botijao_gas` | 17.132 | 4.000 | −77% | — | — |
| `caixa_som_baile` | 11.984 | 4.792 | −60% | — | — |
| `onibus_sptrans` | 11.768 | 4.796 | −59% | — | — |
| `concrete_roadblock` | 10.593 | 3.999 | −62% | — | — |
| `grama_corrego_01` | 4.142 | **2.115 (piso real)** | −49% | 0,00% | 68× no campomorro |

**Resistem à decimação** — `verts/tri` pós-`weld` acima de ~0,9 (scan com UV por triângulo, o
`weld` não funde através da costura). A saída é substituir, não decimar:
`crushed_classic` 132.890 (−30%) · `construction_rubble` 52.967 (**−4%**) · `destroyed_cars`
31.841 (−29%) · `broken_car_2` 24.983 (**−6%**, e o `map_ferrovelho.js:39` já o excluiu por ser
"scan preto brilhante") · `fiat_uno` 21.188 (−8%) · `fav_modular` 16.661 (−9%) · `junk_car`
9.903 (**−1%**).

**O alvo de ≤600 tri para o capim é inalcançável neste mesh**: pedidas três taxas de erro
(0,02 · 0,20 · 0,60) e as três param em ~2.115, porque cada folha é uma casca desconectada e o
*edge collapse* não dissolve componente. Quem chega lá é **billboard cruzado, que já existe no
código** como fallback (`map_campomorro.js:729-733`: 3 planos fundidos = **6 triângulos**, com o
mesmo material de vento que a régua RC4 mede).

`tools/optimize-props-v21.mjs` **não serve** para isto — a linha 1 dele diz "dedup/prune +
WebP, **sem decimar**": ele conserta KB, não triângulo. O passo que falta é `simplify()` depois
de `weld()`+`join()`. E `@gltf-transform` 4.4.1 + `meshoptimizer` 1.2.0 **estão instalados**
(`devDependencies`); o `ERR_MODULE_NOT_FOUND` que eu registrei em 13/09 era resolução ESM de
script rodando em `/tmp`, não pacote ausente — **corrigido aqui**.

---

## 5. A régua que falta (sem ela, isto volta)

Nada no `check:fast` olha polígono de asset. Proposta — `tools/eval/poly-check.mjs`, varrendo
`public/models/**` (o registro, não lista literal):

| cláusula | o que mede | piso/teto | procedência |
|---|---|---|---|
| POLY1 | fauna com `tri < 2.500` | reprova | mediana da casa: personagem 4.869, arma 4.827 |
| POLY2 | fauna sem `skins`/`animations` | reprova | 5 dos 11 animais hoje |
| POLY3 | prop servido com `tri < 1.000` | reprova (com anistia declarada no `KNOWN-RED.json` para o estado de hoje) | 6 casos hoje, todos casario |
| POLY4 | prop com `tri > 12.000` | reprova | `--face-limit` do próprio `gen-asset.mjs` |
| POLY5 | razão KB de textura ÷ tri > 1,0 | avisa | `fav_house`: 2.015 KB / 1.070 tri = forma fingida por imagem |
| POLY6 | proxy procedural de fauna visível no browser | reprova | é a cláusula que responde ao pedido do dono |

Cada uma com o mutante que a faz ficar vermelha (LEI 3): decimar um GLB de fauna para 800 tri,
apagar as animações de um, e forçar o fallback com `?glb=0` no browser.

---

## 6. O que estava bloqueado em 13/09 — e não está mais

**Isto aqui dizia "não dá para mintar nada nesta sessão", porque `tools/gen-asset.mjs` lê a
chave de um `.env` que não existe nesta máquina. Continua verdade para o Tripo/Meshy — e deixou
de ser o que importa.** Em 13/09 o dono conectou o **MCP do mint.gg** (`.omp/mcp.json`, OAuth
com o token fora do repositório) e a conta tem **49.350 créditos** (plano pro ativo).

O levantamento de 14/09 sobre esse acervo mudou a ordem das coisas:

| fato medido | consequência |
|---|---|
| **418 assets bem-sucedidos na conta, 33 registrados em `mint-assets.json`** | há **386 assets pagos parados**; gerar mais é a última coisa a fazer, não a primeira |
| **O Mint entrega ~4.700 tri para qualquer coisa** (82 modelos medidos: 3.472–5.081) | não existe "asset barato" vindo do Mint. `Low Poly Grass Tuft` é o capim **mais caro** do acervo (4.962) |
| 24 dos assets baixados **já estão servidos**, malha idêntica | o acervo do jogo já é Mint; a diferença é a textura otimizada |
| A frota brasileira servida é o mesmo asset Mint **decimado a 60%** | a casa já tem e já usou pipeline de decimação — só não rodou nos props de terceiro |
| `optimize_generated_model` / `retopologize_generated_model` **não declaram preço** no schema | discussão vazia: a decimação local faz o mesmo, de graça e com alvo arbitrário |

Continua valendo, e não depende de crédito nenhum: a régua `poly-check` (§5), o fail-closed dos
proxies de fauna (§2.3) e a decimação (§4.3).

## 7. O que este relatório NÃO mediu

- **Nenhuma figura foi olhada**: triângulo não é beleza. Um bicho de 5.000 tri mal texturizado
  continua feio, e um de 2.000 bem feito pode passar. Pelo portão 4 da skill `csbrasil`, a fila
  do §4 só fecha com captura olhada e descrita.
- **Densidade por metro quadrado de tela**: o que importa de verdade é polígono no tamanho em que
  o objeto é servido ao olho. `fav_house` a 30 m é suficiente; a 3 m, não. Medir isso exige
  captura, que esta rodada não fez.
- Os 3 GLB brutos em subpastas de `props/` (1,8–1,9 M tri cada, 5,68 M somados) **não são
  servidos** — são a saída crua do Mint guardada ao lado do otimizado.
