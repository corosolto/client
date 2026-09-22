<!-- Levantamento do acervo mint.gg em 14/09/2026, via MCP. Índice: ../MINT-ACERVO.md -->

# Objetos, vegetação e veículos — o que vale usar do Mint

**82 GLB do Mint baixados e medidos** (`/tmp/mintprops/**`), cruzados com os 151 props servidos.
Nada gerado no Mint, nada editado no jogo, saldo intacto em 49.350 créditos.

## O achado que reescreve as três frentes

**O Mint entrega ~4.700 triângulos para qualquer coisa.** 82 modelos medidos, faixa
**3.472–5.081**, mediana **4.677**. Um tufo de capim, uma caixa d'água, uma Kombi, uma casa de
favela de dois pavimentos: todos ~4.700. `Low Poly Grass Tuft` é **o mais caro da família de
capim** (4.962 tri). *"Low Poly" no nome é texto do prompt, não geometria.*

Corroborado por duas frentes independentes: fauna (25 bichos, 4.567–5.186) e cenário
(`quiosque` cru 4.730 = `quiosque.glb` servido 4.730 — só a textura difere).

### 24 dos assets baixados JÁ ESTÃO SERVIDOS, com malha idêntica

Casados por impressão digital (mesmo `tri` **e** mesmo `verts`): `Arching Guinea Grass Tuft` =
`grama_corrego_01` (4.142) · `Urban Creekside Weeds` = `grama_corrego_02` (4.046) ·
`Heart Leaf Taioba` = `planta_corrego_taioba` · `Brown Spike Cattail` = `planta_corrego_taboa` ·
os três water tanks = `caixa_dagua_fibra`/`_azul`/`_preta` · `Colorful Laundry Varal` (2×) =
`varal_roupas_01/02` · `Yellow Green Pipa` = `pipa_papel` · `Worn Lorry Tire Pile` = `tires` ·
`Striped Market Stall` = `stall` · `Weathered Green Dome Tent` = `tent` ·
`Banco de jardim modernista` = `banco_jardim` · `Poste de jardim` = `poste_jardim` ·
`Lampião de fachada` = `lampiao_fachada` · `Imperial Grey Palm` = `palmeira_imperial` · mais
agave, bananeira, costela-de-adão, heliconia, ixora, samambaia, palmeira_ravenala,
vaso_tropical, aviao_faixa.

E **a frota brasileira servida é o mesmo asset Mint decimado**: Mint 4.662 → `kombi` 2.797;
4.758 → `fusca` 2.854; 4.820 → `opala` 2.891; 4.694 → `onibus_urbano` 2.815. **A casa já tem e
já usou o pipeline de decimação** — só nunca rodou nos props de terceiro.

---

## 1. Já mintado e que entra JÁ

"Depois" = decimado localmente (`@gltf-transform` + `MeshoptSimplifier`), **custo zero**.

| asset | tri medido | depois | onde entra | o que substitui | ganho medido |
|---|---|---|---|---|---|
| `Blue Ribbed Water Tank` (já servido como `caixa_dagua_azul`) | 4.636 | — | `map_lajes_authored.js:1006`, `map_corrego.js:1052`, `map_escadao.js:540` | `caixa_dagua` (18.749) | **−155.243 tri** em 3 mapas, **zero download** |
| `Casa de favela tijolo` | 4.181 | **2.399** | `map_obras.js:507`, `map_posto.js:268`, `map_atacadao.js:439` | `fav_modular` (16.661 tri, **36 draw calls**) | **−57.048 tri e −140 draw calls** só no obras; **1 draw call** contra 36 |
| `Casa de favela azul` | 4.780 | 3.071 | idem | idem | idem |
| `Escadao Mato de Fresta R3` | 4.347 | 2.400 | `ESCADAO_PROPS` (`map_escadao.js:20`) | nada | **mintado 06/09 para esse mapa e nunca integrado** |
| `Instalacao Eletrica — Meter Box` | 4.811 | 2.603 | escadão, UPA, penitenciária | nada | caixa de luz é o detalhe nº 1 de brasilidade barata |
| `Varanda Vivida — Balcony Cluster` | 4.453 | 2.399 | `map_escadao.js:20`, `map_quebrada.js:50` | nada | idem |
| `Caminhão antigo` | 4.599 | 2.719 | ferro velho, fila do posto | variedade para `crushed_classic` | substitui scan de 132.890 tri |
| `Weathered Grey Patrol Wagon` | 4.840 | 2.570 | `PENITENCIARIA_PROPS` | nada | viatura no mapa mais vazio de veículo |
| `Freezer horizontal` | 4.486 | 2.450 | `ATACADAO_PROPS`, `UPA_PROPS` | nada | atacadão sem freezer é mercado de mentira |
| `Estante de pallets` | 4.565 | 3.314 | `ATACADAO_PROPS` | nada | idem |
| `Poltrona anos 70` | 4.988 | 2.465 | `UPA_PROPS` (sala de espera) | nada | a UPA é o mapa mais vazio: **11 props** |
| `Container escritório` | 4.406 | 2.993 | `OBRAS_PROPS` | nada | obra sem barracão de obra |
| `Andaime de obra` | 4.299 | 3.568 | `OBRAS_PROPS` | nada | idem |
| `Blue-Green Candelabra Cactus` | 4.885 | 2.400 | pátio da penitenciária | nada | mandacaru a 2.400 tri |
| `Dusty Sertão Bromeliad` | 4.478 | 3.095 | idem | nada | idem |
| `Poste junino` · `Fogueira de festa` · `Barraca de quentão` · `Barraca de quermesse` | 4.419–4.743 | 2.397–2.979 | campomorro, quebrada | nada | festa junina sem custo de geometria |
| `Red Yellow Diamond Kite` | 4.532 | 3.292 | quebrada, campomorro | nada | 2ª pipa (hoje só `pipa_papel`) |
| `Varal de roupas` | 4.677 | 3.450 | penitenciária (3º varal) | nada | tira a repetição dos 2 atuais |

---

## 2. Já mintado mas NÃO vale usar

### `Low Poly Grass Tuft` — **4.962 tri. REPROVADO.**

É o capim **mais caro** do acervo, 20% acima do `grama_corrego_01` já servido (4.142). Trocar
piora em +820 tri por tufo × 68 tufos = **+55.760 tri**. O sinal da troca é invertido.

### O veredito do capim — e a correção ao relatório de 13/09

> `RELATORIO-LOWPOLY.md` afirmava "7,59 M em 1.833 tufos no `fy_corrego`". **Não confere com o
> código.** (1) `map_corrego.js:443` testa `hasProp('grama_corrego')` — sem sufixo, e
> `mapprops.js:41` casa id exato; (2) `grama_corrego` não está em `CORREGO_PROPS`; (3) a própria
> régua `corrego-contract-check.mjs` registra *"grama_corrego ausente no acervo — cláusula
> DORMENTE"*. Quem planta capim é o `fy_campomorro` (`map_campomorro.js:757-763`): **68 tufos**.
> **Custo real: 281.656 tri, no campomorro.** Correção já aplicada no relatório.

Tri por m² de silhueta na tela (tufo de 0,7 m em jogo):

| saída | tri/tufo | tri/m² de tela | total nos 68 | economia |
|---|---|---|---|---|
| GLB hoje | 4.142 | 8.453 | 281.656 | — |
| decimar | **2.115** (piso real) | 4.316 | 143.820 | −137.836 |
| ralear 68→34 | 4.142 | 8.453 | 140.828 | −140.828 |
| **billboard cruzado** | **6** | **12** | **408** | **−281.248** |

**O billboard paga 700× mais — e já existe no código**, como fallback:
`map_campomorro.js:729-733` funde 3 × `PlaneGeometry(0.65,0.7)` = **6 triângulos**, com o mesmo
material de vento que a régua RC4 mede. O alvo de ≤600 tri por decimação é **inalcançável**:
pedidas três taxas de erro (0,02 · 0,20 · 0,60), as três param em ~2.115, porque `verts/tri`
pós-`weld` é 1,36 — cada folha é casca desconectada e o *edge collapse* não dissolve componente.
A bbox fica idêntica (0,00%), o que sugere que a silhueta se mantém — **[INFERÊNCIA]**, não foi
renderizado.

### A alavanca real não é o capim

| economia medida | alavanca |
|---|---|
| **574.462 tri** | `vw_9150` ×7 em `posto_treta`: 89.198 → 7.132 (−92%) |
| 410.330 | `vw_9150` ×5 em `praca_poderes` |
| 281.248 | capim ×68 → billboard (o **teto** do capim) |
| 246.198 | `vw_9150` ×3 em `obras_prefeitura` |
| 132.890 | `crushed_classic` (resiste; trocar) |
| 112.904 | `caixa_dagua` ×8 em `fy_lajes` |

### Casario e caixa d'água — qual ponta está errada

| prop | tri | draw calls | texKB | ponta errada |
|---|---|---|---|---|
| `fav_house` | 1.070 | **10** | **1.912** | **não é o polígono** — 1.070 tri para casa de 2 pavimentos é ótimo. O defeito são 10 draw calls e 1,9 MB (4 imagens = 86%). ×100 instâncias em `map_quebrada.js:539` = **1.000 draw calls** |
| `fav_modular` | **16.661** | **36** | 751 | **as duas pontas**; resiste a decimação (−9%). É este que troca por `Casa de favela tijolo` |
| `caixa_dagua` | **18.749** | 1 | 38 | **a geometria** — decima a 3.997 (−79%, bbox 0,1%), e o substituto já está no disco |

**Bônus:** `map_lajes_authored.js:1012-1017` tinge 8 caixas de azul/preto clonando material por
mesh (**+8 draw calls**) quando `caixa_dagua_azul` e `_preta` já existem como tanque de verdade.

### Não vale (resumo)

Terceira palmeira, mobília de mansão/piscina (**não há call-site**: `map_piscina.js` declara
**0** props), helicóptero (não há animação de veículo — os clipes do Mint são todos `humanoid`)
e `Bombas de combustível` (o posto já modela as bombas em geometria própria).

---

## 3. Falta mintar

| falta | prioridade | alvo | por quê |
|---|---|---|---|
| casario de favela com **1 material** e ~1.200 tri | **alta** | ≤1.200 tri, 1 draw call | é o buraco real: `fav_house` tem a geometria certa e 10 materiais; o Mint tem 1 material e 4.700 tri. **Ninguém tem os dois.** É `--face-limit`, não compra nova |
| caminhão baú moderno | média | ≤4.000 | `Caminhão antigo` é de outra época |
| carro popular sinistrado brasileiro | média | ≤3.000 | os 5 destroçados do ferro-velho são scan gringo e resistem a decimação |

**Nada urgente**: há 386 assets pagos parados. Antes de mintar, decimar.

---

## 4. Custo e risco

**Decimação não é bloqueio.** `@gltf-transform` 4.4.1 + `meshoptimizer` 1.2.0 estão em
`node_modules`; o `ERR_MODULE_NOT_FOUND` é resolução ESM de script rodando em `/tmp`. Custo:
zero crédito, zero rede. `tools/optimize-props-v21.mjs` **não serve** — a linha 1 dele diz
"dedup/prune + WebP, **sem decimar**". O passo que falta é `simplify()` depois de `weld()`+`join()`.

`optimize_generated_model` / `retopologize_generated_model` do MCP **não declaram preço** no
schema; o `get_credits_balance` só tarifa `preview` 150 e `final`/`world` 1.500. Discussão vazia:
a decimação local faz o mesmo de graça e com alvo arbitrário.

### Lei medida nova: `verts/tri` depois de `weld()`

Abaixo de ~0,75 o ratio obedece linearmente; acima de ~1,35 a malha **resiste** (scan com UV por
triângulo, o `weld` não funde através da costura).

**Decimam bem:** `vw_9150` 89.198 → **7.132** (−92%, bbox 1,31%) · `car_a` 27.142 → 4.799 ·
`caixa_dagua` 18.749 → 3.997 (bbox **0,10%**) · `botijao_gas` 17.132 → 4.000 ·
`concrete_roadblock` 10.593 → 3.999 · `caixa_som_baile` 11.984 → 4.792 · `onibus_sptrans`
11.768 → 4.796 · `sandbags` 8.577 → 4.793.

**Resistem (trocar, não decimar):** `crushed_classic` 132.890 (−30%) · `construction_rubble`
52.967 (**−4%**) · `destroyed_cars` 31.841 (−29%) · `broken_car_2` 24.983 (−6%, e
`map_ferrovelho.js:39` já o excluiu por ser "scan preto brilhante") · `fiat_uno` 21.188 (−8%) ·
`fav_modular` 16.661 (−9%) · `junk_car` 9.903 (**−1%**).

**Correção do próprio autor, depois da troca com a frente de fauna:** a frota brasileira **já
está no fundo prático** — kombi pisa em 2.645 contra 2.797 servido (5% de margem). Quem tem
gordura são os props de terceiro que nunca passaram pelo pipeline. Isso **reforça** o ranking de
alavancas em vez de mexer nele.

### Achados colaterais

1. **53 MB órfãos em `public/`:** `props/caixa_dagua/f38947f5-…-pbr_model.glb` tem **1.875.081
   triângulos** e 53.795 KB, registrado como `rawModel` e **carregado por nenhum arquivo** —
   19% dos 276 MB de `public/models/props/`, indo para o deploy sem ninguém desenhar.
2. **4 assets mintados em 06/09 para o Escadão e nunca baixados:** `Escadao Mato de Fresta R3`,
   `Instalacao Eletrica — Meter Box`, `Varanda Vivida — Balcony Cluster`,
   `Escadao Casa Residencial R3`. Nenhum está no disco.
3. **`map_upa.js` é o mapa mais vazio** (11 props), seguido de `map_escadao.js` (10) e
   `map_penitenciaria.js` (15) — contra 34 do posto e 57 da Loja H.
4. **Dois furos na régua `poly-check.mjs`:** o POLY3 (piso de 1.000 tri) reprova `fav_house`,
   que é o prop **mais eficiente** do acervo; e **nenhuma régua conta draw call**, que é onde
   `fav_modular` (36) e `fav_house` (10) realmente custam. Sugestão: `DC ≤ 4 por prop`.

## 5. O que não foi medido

Silhueta renderizada (browser vetado na rodada): os vereditos visuais são bbox + topologia, não
olho. Precisam de figura antes de valer: o capim a 2.115 tri e a troca `fav_modular` →
`Casa de favela tijolo` (7× menos geometria). Também ficaram sem abrir 3 dos 30 packs
(`Favela — kit casas r3`, `Sertão — variações de casas`, `Mansão do Joá — jardim e casa`) — é o
primeiro lugar a olhar se alguém procurar casario de ~1.200 tri com 1 material.
