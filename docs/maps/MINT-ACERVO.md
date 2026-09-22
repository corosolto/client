# O acervo mint.gg × o jogo — o que usar, o que decimar, o que falta mintar

> Levantamento de 14/09/2026, com o MCP do mint.gg conectado (`.omp/mcp.json`, OAuth com o token
> fora do repositório). Três frentes em paralelo, **151 GLB baixados e medidos** (82 props,
> 44 de cenário, 25 de fauna). **Nada foi gerado: saldo intacto em 49.350 créditos.** Nada de
> `public/js/**` foi editado nesta rodada.
>
> Detalhe por frente: [`mint/fauna.md`](mint/fauna.md) · [`mint/cenario.md`](mint/cenario.md) ·
> [`mint/props.md`](mint/props.md). Contexto: [`RELATORIO-LOWPOLY.md`](RELATORIO-LOWPOLY.md) e
> [`RODADA-CONSERTO.md`](RODADA-CONSERTO.md).

---

## 1. A galinha do dono existe — e é a pomba

O relato foi: *"tem alguns animais low-poly, tipo galinhas, acho que no lajes e no escadão"*.
O código diz que **nenhum dos dois mapas tem galinha**: `fy_lajes` declara 6 ratos, 7 pombas,
1 cachorro e 1 gato (`map_lajes_authored.js:1353-1373`); `fy_escadao`, 2 ratos e 3 pombas
(`map_escadao.js:784-795`). Galinha só existe em `fy_campomorro` e `fy_corrego`.

**Ele está certo mesmo assim.** Abrindo o `pigeon_ground.glb`: **55 dos 62 nós do rig se chamam
`Chicken_*`** (`Chicken_ROOTSHJnt_54`, `Chicken_l_Leg_HipSHJnt_19`, `Chicken_l_Toe_01_01SHJnt_4`…),
o nó raiz do rig é `pigeon.rig_56` — renomeado — e o bbox cru é **0,23 × 0,63 × 0,87 m**:
proporção de galinha (alta, perna longa), não de pomba. O `ambientlife.js:210` escala pela
altura para 0,29 m, então o que voa no jogo é **uma galinha encolhida ao tamanho de pomba**, com
textura de pomba por cima. São **7 no lajes, 3 no escadão e 53 no jogo inteiro** — o bicho mais
numeroso do acervo, exatamente nos dois mapas que ele citou.

**E o "low-poly" não é polígono:** com **6.928 tri** ela é a maior malha da fauna. O que é pobre
é o texel — **7 KB de albedo para 6.928 tri**, o pior do acervo (os outros dez ficam entre 0,04
e 0,35 KB/tri). Aumentar polígono não conserta isso; é textura chapada de 256².

As duas outras explicações foram refutadas antes: o proxy procedural (`fallbackPigeon`, 218 tri)
ficou **inalcançável no browser** desde o fail-closed de 13/09, e a galinha de verdade
(`galinha_campo.glb`, Quaternius) não é baixada por nenhum dos dois mapas.

## 1b. O que já foi INTEGRADO (14/09) — 7 bichos pagos que estavam parados

Os 8 GLB foram baixados pelo MCP, passados pelo pipeline da casa
(`tools/optimize-ambient-fauna.mjs`, jobs novos) e **7 entraram em 10 mapas**. Procedência
registrada em `mint-assets.json` (7 entradas novas, SHA-256 conferido por
`eval:asset-integrity`).

| arquivo servido | tri | KB | onde entrou |
|---|---|---|---|
| `galinha_hen.glb` | 3.046 | 180 | lajes, escadão, campomorro, córrego, quebrada |
| `pintinho.glb` | 2.846 | 147 | os mesmos cinco, sempre ao lado da galinha |
| `galinha_angola.glb` | 3.031 | 189 | campomorro |
| `pato_lago.glb` | 2.676 | 130 | parque (2 espelhos d'água), mansão (piscina) |
| `cavalo_sitio.glb` | 3.098 | 123 | campomorro (encosta), velho oeste (curral) |
| `cabra_caatinga.glb` | 2.874 | 178 | campomorro, velho oeste, posto |
| `carcara.glb` | 3.000 | 188 | lajes (ponta de laje), velho oeste (beiral), praça (teto do ônibus) |

**Saldo medido:** −39.583 triângulos no jogo, porque cada bicho novo entrou trocando pomba
(6.928 tri) na mesma proporção. Praça −10.856 · lajes −11.892 · escadão −7.964 · campomorro
+1.039 (ganhou 5 espécies). `eval:ambience-registry` **AR1–AR6 passam nos 17 mapas**;
`eval:poly` sem vermelho.

Três coisas que a integração produziu além do pedido:

- **Defeito velho achado por medição:** rato e tatu andavam **de costas** desde que entraram —
  o `yawFix` de uma linha cobria só um caso. Virou tabela por tipo.
- **`pato_lago` tinha a água do lago assada dentro da malha.** Virou um passo novo no
  pipeline (`dropFlatSlab`: remove componente conexo ≥95% horizontal e fino em Y).
- **O calango foi RECUSADO com figura**, e é o tipo de recusa que vale mais que uma entrega: o
  asset pago saiu em **pose bípede ereta**, com um polígono soldado ao corpo. Calango de muro é
  quadrúpede rente à superfície. Sem rig não há conserto, e rig de não-humanoide é exatamente o
  que o Mint não faz. Ficou no disco como dívida declarada e pedido de re-mint.

---

## 1c. Tentativa de mintar fauna nova — **o provedor está falhando agora**

O dono autorizou mintar mais bichos brasileiros ("mas temos que usá-los"). Foram escolhidos 8
com lugar definido nos mapas que hoje só têm rato e pomba — urubu, sagui, quero-quero, garça,
bem-te-vi, lagartixa de parede, sapo-cururu e jumento —, **todos de pose parada natural**,
porque a animação de não-humanoide não existe no pipeline (medido: `list_model_animation_options`
devolve catálogo Meshy com **673 clipes, todos `humanoid`**).

**Três tentativas, três falhas**, todas com `failureCode: generation_failed`,
`failureClass: unknown` e `retryable: false`:

| tentativa | forma | resultado |
|---|---|---|
| pack de 8 itens, `mode: review` | `start_asset_pack_generation` | falhou antes de qualquer preview |
| modelo único, prompt longo em inglês | `start_model_generation` | falhou |
| modelo único, prompt curto em português | `start_model_generation` | falhou |

**Custo medido das falhas: 1.730 créditos** (49.350 → 47.620) — falha **consome** crédito, o que
torna tentativa às cegas cara. A conta não tem nenhuma geração bem-sucedida desde **09/09**, e a
única falha anterior do histórico é de outra natureza (`moderation_blocked`, no "Saci v2
T-pose"). Por isso **parei em vez de insistir**: o padrão aponta para indisponibilidade do lado
do Mint, não para o prompt.

Os 8 prompts estão prontos e o projeto **"CS BRASIL — fauna urbana v2"** já foi criado na conta.
Quando o provedor voltar, é uma chamada. Antes de repetir, vale abrir o chat do Mint pela
interface e ver a mensagem de erro real — o MCP só devolve *"Mint could not complete this
generation"*.

---

## 2. O estado do acervo, em quatro números

| | |
|---|---|
| assets bem-sucedidos na conta | **418** (326 modelos, 30 packs, 21 áudios, 54 imagens, 1 world) |
| registrados em `mint-assets.json` | **33** |
| **pagos e parados** | **386** |
| créditos disponíveis | 49.350 (plano pro ativo) |

**A lei que reescreveu as três frentes: o Mint entrega ~4.700 triângulos para qualquer coisa.**
151 modelos medidos, faixa **3.472–5.186**, mediana ~4.680 — capim, caixa d'água, Kombi, casa de
dois pavimentos, bicho. Não existe asset barato vindo de lá, e `Low Poly Grass Tuft` é o capim
**mais caro** do acervo (4.962 tri). Corolário prático: **~4.700 é bom para fauna** (a mediana da
casa é personagem 4.869) e **ruim para vegetação repetida**.

Dois achados que ninguém sabia:

1. **24 dos assets baixados já estão servidos**, com malha idêntica — o acervo do jogo já é
   Mint, e a frota brasileira é o mesmo asset **decimado a 60%**. A casa já tem e já usou o
   pipeline de decimação; só nunca rodou nos props de terceiro.
2. **O conteúdo dos 30 packs não existia escrito em lugar nenhum.** Agora existe, em
   [`mint/cenario.md`](mint/cenario.md) §0 — e **6 packs inteiros, 22 modelos de arquitetura,
   não têm um arquivo em `public/models/props/`**.

---

## 3. O que entra já — e o que ele substitui

Tudo abaixo está **pago, baixado e medido**; "depois" é o resultado da decimação local
(`@gltf-transform` + `MeshoptSimplifier`), que **custa zero**.

### Cenário — as caixas de concreto de ontem têm dono

A rodada de conserto de 13/09 construiu barracão, guarita, pavilhão e bilheteria com caixa
procedural. **Todas têm GLB pago equivalente:**

| caixa de ontem | asset Mint | tri | veredito |
|---|---|---|---|
| barracão de obra (`map_obras.js:408`) | **Container escritório** | 4.406 | trocar; a caixa encolhe e o A* **ganha** os nós que o barracão tirou |
| contêiner do posto (`map_posto.js:404`) | mesmo id | — | **zero download novo**, 1 draw call para as 4 cópias |
| guarita "REVISTA NA SAÍDA" (`map_atacadao.js:364`) | **Vestiário do clube** | 4.742 | encaixa **sem mexer na caixa** (Δ ≤ 0,5 m) |
| guarita de muro ×4 (`map_penitenciaria.js:190`) | **Weathered Searchlight Guarita** | 4.749 | é a `guardTower` desenhada, com holofote |
| pavilhão ×4 (`map_penitenciaria.js:318`) | **Bloco de celas** | 3.988 | trocar **com `ry += π/2`**; galeria de 2 andares com passarela |
| barraca do parque (16 entradas de `MASSAS`) | **Barraca de quermesse** | 4.419 | o `vestir()` já está no arquivo |

E três marcos que não existem em caixa nenhuma: **Prédio art déco brasileiro** (4.297) para o
skyline que hoje é vidraça em canvas, **Portão de penitenciária** (4.491) para o pórtico da
Divinéia, e **Weathered Watchtower Guard Booth** (4.827) — que é a *"Guarita de muro"* que
**falhou** no pack e resolve, a 9 m de altura, a dívida `ALT1:penitenciaria` que ficou declarada
ontem (h90 8,8 m, faltando 0,2 m).

**O caso mais gritante:** o pack **`Escadao FPS Props`** foi gerado em **06/09 com o nome do
mapa no título** — casa residencial, mato de fresta, caixa de luz, varanda, gato de telhado — e
**nenhum dos 5 itens está no disco nem em `ESCADAO_PROPS`**. O `fy_escadao` tem 11 chamadas de
`casa()` procedural e **zero casario GLB**.

### Fauna — espécie nova, não só polígono

| asset | tri → servido | onde entra | o que ganha |
|---|---|---|---|
| **decimar a pomba** (não é compra) | 6.928 → **3.464** | os 17 mapas, 53 instâncias | **−183.592 tri no jogo**, preservando skin e clipe; ainda passa POLY1 |
| **Galinha d'angola** | 5.052 → 3.031 | quintal do córrego e do campomorro | capote é o bicho de quintal de morro mais reconhecível |
| **Striped Breast Caracara** | 5.003 → 3.000 | velho oeste, ponta de laje do `fy_lajes` | rapina **pousada** — bicho naturalmente imóvel, então estático não mente |
| **Caatinga Goat** | 4.790 → 2.874 | curral do velho oeste, beira de pista do posto | espécie nova |
| **Cavalinho de sítio** | 5.166 → 3.098 | estábulo, várzea do campomorro | pose de cabeça baixa pastando |

### Props e casario

`Casa de favela tijolo` (4.181 → **2.399, 1 draw call**) substitui `fav_modular` (**16.661 tri,
36 draw calls**): **−57.048 tri e −140 draw calls só no obras**. `caixa_dagua_azul`, que **já
está no disco**, substitui `caixa_dagua` (18.749): **−155.243 tri** em três mapas, **zero
download** — e ainda tira o hack de tingir 8 caixas clonando material em runtime
(`map_lajes_authored.js:1012`).

---

## 4. A maior alavanca não é comprar nada. É decimar.

| economia medida | alavanca |
|---|---|
| **574.462 tri** | `vw_9150` ×7 no `posto_treta`: 89.198 → **7.132** (−92%, bbox 1,31%) |
| 410.330 | o mesmo caminhão ×5 na Praça |
| 281.248 | capim ×68 → billboard cruzado de **6 tri**, que **já existe no código** (`map_campomorro.js:729`) |
| 246.198 | o mesmo caminhão ×3 nas Obras |
| 183.592 | pomba decimada nos 17 mapas |
| 112.904 | `caixa_dagua` ×8 no `fy_lajes` |

**Lei medida nova:** `verts/tri` depois de `weld()` abaixo de ~0,75 ⇒ a malha obedece ao ratio;
acima de ~1,35 ⇒ **resiste** (scan com UV por triângulo). Foi ela que separou os que cedem
60–92% (`vw_9150`, `car_a`, `caixa_dagua`, `botijao_gas`) dos que cedem 1–9%
(`junk_car`, `construction_rubble`, `fav_modular`, `fiat_uno`) — para esses, a saída é trocar.

**Correção que uma frente fez na outra, e que vale registrar:** a frota brasileira **já está no
fundo prático** (kombi pisa em 2.645 contra 2.797 servido). Não há segundo corte nela; a gordura
está nos props de terceiro que nunca passaram pelo pipeline.

---

## 5. O que falta mintar — pouco, e nada urgente

| falta | prioridade | alvo |
|---|---|---|
| casario de favela com **1 material e ~1.200 tri** | alta | `fav_house` tem a geometria certa (1.070) e 10 materiais; o Mint tem 1 material e 4.700 tri. **Ninguém tem os dois** — e isso é `--face-limit`, não compra nova |
| caminhão baú moderno | média | ≤4.000 tri |
| carro popular sinistrado brasileiro | média | ≤3.000 tri |

Antes de mintar: **386 assets pagos parados**, 22 modelos de arquitetura sem um arquivo no
disco, e um pack feito sob medida para o Escadão há uma semana que nunca foi baixado.

---

## 6. Higiene que apareceu no caminho

- **53 MB órfãos no deploy:** `public/models/props/caixa_dagua/f38947f5-…-pbr_model.glb` tem
  **1.875.081 triângulos** e 53.795 KB, está registrado como `rawModel` e **nenhum arquivo em
  `public/js` o carrega**. É 19% dos 276 MB de `public/models/props/`.
- **Dois furos na régua `poly-check.mjs`:** o POLY3 (piso de 1.000 tri) reprova `fav_house`, que
  é o prop **mais eficiente** do acervo em triângulo por metro de fachada; e **nenhuma régua
  conta draw call**, que é onde `fav_modular` (36) e `fav_house` (10) realmente custam.
  Proposta: cláusula `DC ≤ 4 por prop`, e isentar casario de fundo do POLY3.
- **`map_lajes.js` continua legado morto** e ainda declara 2 bichos em `mode:'flight'`, que a
  régua AR5 proíbe. O `maps.js:9` serve o `map_lajes_authored.js`.

---

## 7. O que não foi verificado

**Nenhuma figura foi olhada** — a regra de um agente por browser valeu para os três, e todo
veredito visual aqui é bbox, topologia e *preview* do Mint, não render no jogo. Precisam de olho
antes de virar merge: o capim decimado a 2.115 tri, a troca `fav_modular` → `Casa de favela
tijolo` (7× menos geometria) e o pavilhão girado 90° da penitenciária.

Também ficaram sem abrir 3 dos 30 packs (`Favela — kit casas r3`, `Sertão — variações de casas`,
`Mansão do Joá — jardim e casa`) — é onde procurar primeiro se alguém quiser o casario de
~1.200 tri com 1 material da §5.

E o preço de `optimize_generated_model` / `retopologize_generated_model` **não está declarado no
schema**; não foi executado para descobrir. É discussão vazia enquanto a decimação local fizer o
mesmo de graça.
