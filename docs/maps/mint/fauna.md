<!-- Levantamento do acervo mint.gg em 14/09/2026, via MCP. Índice: ../MINT-ACERVO.md -->

# Fauna — o que vale usar do Mint

## 0. Veredito sobre o relato do dono (o palpite óbvio está REFUTADO, mas ele está certo)

**Ele não está vendo a galinha do campomorro/córrego, nem o proxy procedural. Ele está vendo a POMBA — que é uma galinha.**

O que os dois mapas declaram, medido no arquivo:

| mapa | arquivo:linha | população declarada | galinha? |
|---|---|---|---|
| `fy_lajes` (o servido) | `public/js/map_lajes_authored.js:1353-1373` | 6 ratos, **7 pombas de chão**, 1 cachorro, 1 gato | **não** |
| `fy_escadao` | `public/js/map_escadao.js:784-795` | 2 ratos, **3 pombas de chão** | **não** |
| `fy_campomorro` | `public/js/map_campomorro.js:835-837` | 2 galinhas | sim |
| `fy_corrego` | `public/js/map_corrego.js:1362` | 1 galinha | sim |

`maps.js:9` serve `map_lajes_authored.js` — o `map_lajes.js` é legado morto (5 bichos declarados em `:1330-1341` que nunca nascem; 2 deles ainda em `mode:'flight'`, proibido pela AR5).

**A prova de que a pomba é uma galinha** — abri o `pigeon_ground.glb` e li os nós: **55 dos 62 nós são juntas com nome `Chicken_*`** (`Chicken_ROOTSHJnt_54`, `Chicken_l_Leg_HipSHJnt_19`, `Chicken_l_Toe_01_01SHJnt_4`, …). O nó do rig é `pigeon.rig_56` — renomeado —, e a raiz é `Sketchfab_model`. O bbox cru é **0,23 × 0,63 × 0,87 m**: proporção de galinha (alta, perna longa), não de pomba (~0,32 m deitada). `ambientlife.js:210` escala pela altura para `pigeonGround: .29` → o bicho fica com **29 cm de altura e 40 cm de comprimento**: uma galinha encolhida ao tamanho de pomba. A textura é de pomba (cinza, barra preta na asa, verde iridescente no pescoço) — 256×256, 7 KB.

São **7 delas no lajes e 3 no escadão**, exatamente os dois mapas que ele citou, e **53 no jogo servido** (17 mapas): é o bicho mais numeroso do jogo.

**E o "low-poly"?** Não é o polígono: com **6.928 tri medidos** a pomba é a MAIOR malha da fauna inteira. O que é pobre é o texel — 7 KB de albedo para 6.928 tri = **0,001 KB/tri**, o pior do acervo (a faixa dos outros dez é 0,04–0,35 KB/tri; a POLY5 só avisa acima de 1,0). Ele está lendo textura chapada de 256² como "low-poly", e o diagnóstico tem consequência: aumentar polígono não conserta isso.

Refutei as duas outras explicações plausíveis antes de agir:
- **proxy procedural** (`fallbackPigeon`, `ambientlife.js:116-128`, esfera+2 cones, 218 tri): **impossível no browser** desde o fail-closed de 13/09 (`ambientlife.js:76-88`); só com `?fauna=proxy`.
- **galinha de verdade** (`galinha_campo.glb`, malha `Chicken_Blob`, Quaternius, 2.904 tri, 2 clipes): nenhum dos dois mapas a baixa.

## 1. Já mintado e que entra JÁ

Tudo abaixo foi baixado por mim e medido. A coluna "tri servido" é o resultado **rodado de verdade** pelo pipeline da casa (`simplify` meshopt ratio 0,6 + `textureCompress` webp 256² + dedup/prune, os mesmos passos de `tools/optimize-ambient-fauna.mjs`). Reproduzi o pipeline bit a bit antes de confiar nele: tatu 5.186×0,6 = **3.136 tri / 198 KB**, papagaio 4.938×0,6 = **2.961 / 184 KB**, barata 4.944×0,4 = **2.124 / 127 KB** — os três iguais ao arquivo servido, tri e KB.

| asset (nome) | id | tri cru → tri servido | onde entra | o que substitui | ganho medido |
|---|---|---|---|---|---|
| **(não é Mint, mas é o que paga a conta) decimar `pigeon_ground.glb`** | — | 6.928 → **3.464** (ratio 0,5; **anim=1 skins=1 preservados**, 503→290 KB) | `ambientlife.js:10`, 53 instâncias em 17 mapas | ela mesma | **−3.464 tri por bicho**; libera 24.248 no lajes, 20.784 na praça, 10.392 no escadão, 6.928 no córrego, **183.592 no jogo**. Ainda passa POLY1 (≥2.500) |
| **Galinha d'angola** | `ks7crtq8cj2jse86h06wmrrj8s8d66v7` | 5.052 → **3.031** (189 KB, 1 draw) | quintal de `fy_corrego` (ao lado de `map_corrego.js:1362`) e `fy_campomorro` | nada — espécie nova | capote é o bicho de quintal de morro/sítio mais reconhecível do acervo; conferido no preview: *Numida meleagris* correta (casque, face azul, pérolas brancas), pose de alerta parada |
| **Striped Breast Caracara** | `ks70zqfdxbtnvqxpjr78s61wb58d45av` | 5.003 → **3.000** (188 KB, 1 draw) | `velho_oeste` (a promessa de "ave de poleiro" em `map_velho_oeste.js:520` hoje entrega só pomba de chão) e ponta de laje no `fy_lajes` | 1 das 3 pombas do velho_oeste | carcará **pousado, asa fechada, sem base colada** (preview) — rapina pousada é bicho naturalmente imóvel, então estático não mente. Troca 6.928 por 3.000 e ganha espécie |
| **Caatinga Goat** | `ks7fefck8z8g8nt8q207va4wrd8dwp45` | 4.790 → **2.874** (178 KB, 1 draw) | CURRAL DO ESTÁBULO do `velho_oeste` (`map_velho_oeste.js:546`) e beira de pista do `posto_treta` | nada — espécie nova | cabra parada de cabresto é pose estável; mapa fora do teto AM7 (só lajes/córrego/escadão têm teto) |
| **Cavalinho de sítio** | `ks7dydcdc7pzs2d5ky37v17bn58d7rjd` | 5.166 → **3.098** (123 KB, 1 draw) | estábulo do `velho_oeste`, várzea do `fy_campomorro` | nada — espécie nova | **pose de cabeça baixa pastando** (preview) — é o melhor caso de estático do acervo: cavalo pastando quase não se move. Sem sela/arreio |
| **Chubby Waddle Duck** | `ks751dpvany99fqpnyrfvvgy8n8cnb8a` | 4.567 → **2.739** (91 KB, 1 draw) | água parada: `piscina_treta`, lago do `fy_mansao`, remanso do `fy_corrego` | nada — espécie nova | **1,7% da área da malha é plano horizontal** (medido) = sem água assada, ao contrário do "Pato do lago" (31,7%). É também o mais barato do lote |

Todo modelo Mint da fauna é **1 primitiva / 1 material = 1 draw call**. Os de casa não: cachorro 6, vaca 7, galinha 5. Em mapa com teto de malha (escadão: 6) isso importa mais que o triângulo.

## 2. Já mintado mas NÃO vale usar (motivo medido)

- **Pato do lago** (`ks70r6rydsez0kbkb3rr25fz2d8d7g00`, 4.664 tri) — **31,7% da área da malha é uma laje horizontal**: o Mint assou a água do lago dentro do modelo (o preview mostra o borrão cinza). Substituído pelo Chubby Waddle Duck, que mede 1,7%.
- **Speckled Farm Hen Pecking** (`ks7e5ec0nked2p22sgw4n0gpps8cnc0w`, 7.192 tri / 11.036 verts) — **não decima**: rodei ratio 0,4 e 0,6 e os dois param em **6.296 tri / 395 KB**, número idêntico. Razão verts/tri 1,53, a patologia de pena solta (casca desconectada, sem aresta interna para colapsar — o MintProps mediu o mesmo no capim e na moto CG). 6.296 tri para uma galinha é o dobro da banda da casa, e a pose "pecking" congelada lê como bicho morto.
- **Adult Hen** (`ks78e9tg…`, 5.078 → 3.046) e **Baby Chick** (`ks7ejwy6…`, 4.910) — galinha e pinto são bichos que **nunca param**; estático aqui mente, e o jogo já serve uma galinha **animada** (`galinha_campo.glb`, 2 clipes). Trocar 2 clipes por +142 tri é regressão. O d'angola escapa porque é espécie nova (não substitui a animada) e porque capote passa muito tempo parado em alerta.
- **Gato Rajado — Tabby Cat** (`ks7feare…`, 4.723) — `cat_telhado.glb` tem **3 clipes** (Idle/Walk/Run). Trocar por estático de 4.723 tri troca movimento por polígono: vira reprovação POLY2 no lugar de POLY1.
- **Calango do sertão** (`ks77c1dp…`, 4.958) — saiu em **pose bípede ereta** (preview: apoiado só nas patas traseiras, tronco vertical, um braço ausente). Calango de muro é quadrúpede rente à superfície. Inútil sem rig — e rig não existe (seção 4).
- **Arara em voo** (`ks771w92…`, 4.923, asas abertas confirmadas) e **Passarinho em voo** (`ks7dsk07…`, 5.068, asas abertas) — o `mode:'flight'` foi **deprecado pelo dono** (`ambientlife.js:275-281`) e hoje é proibido por régua (AR5, `tools/eval/ambience-registry-check.mjs:19-21,95`). Ver seção 3: são os dois únicos assets do acervo que poderiam destravar a pergunta original dele, mas isso é decisão de régua, não de asset.
- **Boto Cor-de-Rosa Dolphin Rigged v2** (`ks7de57n…`) — a conta diz `rig:true / pose:t_pose / animOk:ready`, mas o **único artefato é `original_glb` e ele mede 0 skins / 0 animações**. "Rigged" é o nome, não o arquivo. Além disso: 19,5% de área plana (água assada).
- **Scarlet Wing Macaw, Green Beak Toucan, Golden Rosetta Jaguar, Golden Tuft Capuchin, Lowland Tapir Standing, Silver Fang Piranha, Pink River Dolphin, Algae Sloth Pendant** (4.893–5.050 tri, todos medidos, todos 0 anim / 0 skin) — fauna de Amazônia/Pantanal. **Nenhum mapa do registro é Amazônia ou Pantanal.** Não é asset ruim: é asset sem lugar. Entram no dia em que existir o mapa, não antes.

## 3. Falta mintar — e o que o Mint NÃO pode entregar

O buraco da fauna **não é falta de asset, é falta de fornecedor de animação não-humanoide** (seção 4). Consequências, em ordem de valor:

1. **Pare de pedir "re-mintar e animar" para bicho.** A dívida POLY1 de hoje prescreve, textualmente, `dog_caramelo 1.950 tri — re-mintar ≥5.000 RETARGETANDO os 12 clipes` e `barata_urbana — re-mintar ≥4.500 + animar (ela corre)`. **As duas receitas são inexecutáveis no Mint** e custariam crédito para descobrir isso.
2. **A POLY1 da barata e a do papagaio se consertam de graça, sem mintar nada.** O asset cru já está pago e medido: barata `Curved Antenna Ladybug` = 4.944 tri, papagaio `Yellow Chevron Parrot` = 4.938. O que os pôs abaixo do piso foi o `simplify` da casa (`tools/optimize-ambient-fauna.mjs:41-43`: 0,4 na barata, 0,6 no papagaio). Medido por mim, rodando o pipeline: barata a 0,55 → **2.718 tri / 150 KB** (+594 tri, +23 KB) **passa POLY1**; papagaio a 0,55 → **2.714 / 175 KB** passa. Custo: 0 crédito, 1 número em cada linha.
3. **O teto visual da fauna é o `resize: [256,256]`** (`optimize-ambient-fauna.mjs:92` e `:98`), não o polígono. Medi o custo de afrouxar: tatu 198 KB (256²) → **229 KB (512²)** → 308 KB (1024²); d'angola 252 → **341** → 534 KB. 512² custa +31 a +89 KB por bicho e é a resposta certa para "parece low-poly". Detalhe cruel: no pombo o resize **não muda nada** (503 KB nos três) porque a textura dele já é 256² na fonte e o original não está no repo — a pomba perdeu textura para sempre.
4. **Falta mintar, em ordem de retorno** (alvo 4.500–5.200 tri crus, que é o que o Mint entrega para qualquer assunto; sair a ~3.000 servidos no 0,6): **urubu pousado em poste** (a ave mais brasileira que falta; pousado = estático honesto); **sapo/rã de beira de córrego**; **lagartixa/calango em POSE QUADRÚPEDE, pedida explicitamente no prompt** (o calango atual saiu bípede); **morcego pendurado**; **cabra Moxotó ou Canindé** se o sertão virar mapa (a Caatinga Goat saiu mestiça genérica, sem o padrão das raças nordestinas). Todas são espécies cujo comportamento real é ficar parado — as únicas em que o Mint, estático, não mente.
5. **Não re-minte a pomba.** Ela é a única ave com clipe (`anim=1 skins=1`). Um substituto Mint seria estático: o mapa perderia o único bicho voador que se move. Decimar (item 1 da seção 1) mantém o clipe e devolve 183.592 tri.
6. **Decisão de régua que só o dono pode tomar:** a AR5 proíbe `mode:'flight'` por causa do asset errado (pomba de asa fechada deslizando no ar). A frase dele que gerou a régua é *"a pomba que **não** está com braços abertos deveria ficar só na ponta das lajes ou no chão"* — o que autoriza, por leitura direta, uma ave **de asa aberta** no céu; e o pedido original do BUG-57 era *"horizonte, animais, **animações no céu**"*. `Arara em voo` (4.923 → ~2.954) e `Passarinho em voo` (5.068) são exatamente asa aberta, já pagos, já medidos. Reespecificar a AR5 de "nenhum flight" para "nenhum flight com asset de asa fechada" devolve o céu que ele pediu sem gerar nada.

## 4. Animação de não-humanoide: NÃO. O pipeline do Mint não aceita, e agora está documentado pelo fornecedor

Este era o item de maior valor da frente. A resposta é **não**, e não é mais empírica — é contratual. Quatro evidências independentes, todas de leitura (nada gerado):

**(a) `list_model_animation_options` ignora o asset.** Rodei nos 5 assets pedidos — `Caatinga Goat` (quadrúpede), `Segmented Tatu Walker` (quadrúpede), `Golden Rosetta Jaguar` (quadrúpede), `Adult Hen` (ave), `Passarinho em voo` (ave). **As 5 respostas são byte a byte idênticas** (md5 `a3c15861eafd0204d428a246ed98d465` nas cinco). A ferramenta é catálogo global; ela nem olha o modelo, então **não serve como teste de compatibilidade** — o "não" só aparece quando se paga o `animate_generated_model`. Foi exatamente o que aconteceu em 18/08.

**(b) O catálogo é 100% humanoide.** Paginei os 678 itens (`nextCursor`): 673 habilitados, 5 categorias — `WalkAndRun` 174, `DailyActions` 157, `BodyMovements` 156, `Fighting` 153, `Dancing` 33. **Dos 673, o número de itens cuja descrição NÃO contém "humanoid" é ZERO.** Varri por `quadruped|animal|four-leg|wing|flap|creature|beast`: 18 aparentes, todos falso-positivo humano (`kettlebell swing`, `Flying Fist Kick`, `Lie Back Leg Swing`). Locomoção de quadrúpede ou de ave: **nenhuma**.

**(c) Os 15 conjuntos curados também.** `list_model_animation_sets` devolve 15 sets (`basic_locomotion`, `unarmed_combat`, `rifle_combat`, `seated_npc`, `door_interaction`…). **Todos os 15 têm a tag `humanoid`. Sets sem essa tag: 0.**

**(d) A descrição da própria ferramenta de escrita diz isso** — `animate_generated_model`: *"Rig and animate an already succeeded **humanoid-riggable** generated model, or **humanoid** models inside an asset pack"*, e recebe `height_meters` (altura de humanoide). As duas de leitura dizem *"for **humanoid** generated models"* e *"curated **humanoid** animation sets"*.

**(e) O histórico da conta confirma.** 432 assets, **124 com rig, 94 com `pose:t_pose / animOk:ready`** — e todos os 94 são bípedes/personagens (cangaceiro, cuca, saci, palhaço, funkeiro, mascote de leão…). O **único não-humanoide de verdade que já foi riggado é o `Boto Cor-de-Rosa Dolphin Rigged v2` — e voltou `pose: t_pose`**: o riggador forçou esqueleto humano num boto. É o retrato do modo de falha. Dos meus 25 candidatos de fauna, **25 têm `rig:false`, `animOk:null`, e o GLB mede `anim=0 skins=0`**.

**Consequência para o plano:** a fila "animar os 5 estáticos" **não é trabalho, é impossível neste fornecedor** — e não é coincidência que os 5 estáticos sejam exatamente os 5 assets Mint do `mint-assets.json` (`jacare_corrego`, `capivara_corrego`, `tatu_campo`, `papagaio_poleiro`, `barata_urbana`), enquanto os 6 animados são todos Quaternius/Sketchfab. **Todo bicho Mint do jogo é estático e todo bicho estático do jogo é Mint.** Os três caminhos reais, em ordem de custo: **(1)** melhorar a locomoção procedural do `_updateQuad`/`_updateParrot` (custo 0, e é o caminho que a casa já escolheu duas vezes); **(2)** buscar quadrúpede/ave **já riggado** em CC0 (Quaternius entrega cachorro com 12 clipes, gato com 3, vaca com 3 — foi de lá que veio o que se move) e aceitar que o Mint fica só com bicho-que-não-se-move; **(3)** outro fornecedor para retarget não-humanoide. Nenhum deles passa por `animate_generated_model`.

## 5. Custo, risco e o que eu não consegui medir

**O orçamento de fauna está estourado e a régua que o vigia está cega hoje.** Rodei `npm run eval:ambience` (só ela, leitura): **`✗ AM7` está VERMELHO**. Evidência que ela imprimiu: `lajes: 14 animais 19 draws 55174 tris | corrego: 10 animais 14 draws 38024 tris | praca_poderes: 10 animais 10 draws 55124 tris`. Dois defeitos nisso:

1. **O terceiro mapa medido voltou como `praca_poderes`, não `fy_escadao`.** A lista é `MAPAS = ['fy_lajes','fy_corrego','fy_escadao']` (`tools/eval/ambience-check.mjs:61`) e o teto existe só para esses três (`:415-419`); `praca_poderes` não tem teto, então a cláusula reprova por `t` indefinido (`:421`). Resultado prático: **o orçamento de fauna do escadão não está sendo medido**, e o da praça não existe. O número da praça fecha exato com a população declarada em `map_brasilia.js:2168-…` (2 ratos + 6 pombas + 2 tatus = 55.124 tri com os meus tri medidos), então ela é real. `public/js/map_brasilia.js` e `public/js/ambientlife.js` estão **modificados e não commitados** no worktree — provavelmente é trabalho em voo de outra frente, e o `DEFAULT_MAP` é `praca_poderes` (`maps.js:97`). **Não toquei em nada.**
2. **O censo do lajes não fecha com a população declarada.** 14 animais / 19 draws / 55.174 tri: brutei todas as combinações inteiras das 9 espécies com os tri e meshes que medi e só existem 3 soluções aritméticas — `pombo×4 cachorro×1 gato×1 tatu×6 barata×2`, `rato×2 pombo×4 cachorro×1 gato×1 tatu×3 barata×3`, `rato×4 pombo×4 cachorro×1 gato×1 barata×4` — e **nenhuma é a população do `map_lajes_authored.js`** (6 ratos + 7 pombas + cachorro + gato = 15 animais / 20 draws / **74.746 tri**, que é justamente o número registrado no comentário `:410` da própria régua). Ou a página do lajes mediu outro mundo, ou a população mudou sem re-derivar o teto. **Enquanto isso não se resolve, ninguém deve dizer "cabe no orçamento" com base na AM7.**

**Tetos e folga (`ambience-check.mjs:415-419`), com a população declarada e os meus tri medidos:**

| mapa | hoje | teto | folga | quanto é pomba |
|---|---|---|---|---|
| `fy_lajes` | 74.746 tri / 20 draws | 78.000 / 21 | 3.254 tri / 1 draw | **65%** |
| `fy_corrego` | 38.024 / 14 | 39.000 / 15 | 976 tri / 1 draw | 36% |
| `fy_escadao` | 28.068 / 5 | 29.000 / 6 | 932 tri / 1 draw | **74%** |
| `praca_poderes` | 55.124 / 10 | **não tem** | — | **75%** |

Ou seja: **não cabe nem um bicho a mais em nenhum dos três mapas com teto.** É por isso que a decimação da pomba é a primeira linha da seção 1 e não um detalhe: ela é o orçamento. Com a pomba a 3.464, o córrego passa a 31.096 e a **Galinha d'angola (3.031) entra em 34.127 ≤ 39.000, com 15 draws de 15** — no limite, e só por causa dela.

**Onde TIRAR bicho** (fauna demais custa draw call, e aqui custa monotonia também):
- **`fy_escadao`, `map_escadao.js:791-793`: três pombas idênticas dentro de um raio de 2 m** — (-2, -36), (-3,4, -35), (-0,6, -34,6), distâncias 1,7 m e 1,9 m. Tirar uma devolve 6.928 tri (ou 3.464 já decimada) e some o efeito de clone. O escadão tem 5 bichos de **2 espécies**: o problema dele é variedade, não quantidade.
- **`praca_poderes`: 6 pombas = 41.568 dos 55.124 tri medidos (75%).** Tirar 2 e decimar as 4 leva o mapa a ~14 mil.
- **`fy_lajes`: 7 pombas + 6 ratos = 13 dos 15 bichos em 2 espécies.** Tirar 2 pombas abre 13.856 tri e 2 draws — é o que paga o carcará na ponta da laje.
- **`map_lajes.js` inteiro (5 bichos declarados, `:1330-1341`) é código morto**: `maps.js:9` importa o authored. Os 2 `mode:'flight'` de lá sobrevivem sem ser vistos pela AR5 porque a régua varre o registro.

**O que eu não consegui medir:**
- **Aparência em movimento.** Nenhum browser nesta rodada (regra da rodada, um agente por vez). Julguei pose e espécie pelo `preview_image` de 1024² de cada candidato e por geometria (área plana, bbox, razão verts/tri) — **não vi nenhum destes bichos rodando no jogo, na escala em que é servido**. Antes de integrar qualquer um, a captura A/B na distância de jogo é obrigatória; é o portão que essa casa cobra e eu não pude cumprir.
- **Se `simplify` a 0,5 deforma a pomba.** A malha é skinned; o `anim=1 skins=1` sobreviveu e o tri bate exato (6.928×0,5 = 3.464, e ×0,3 = 2.078, ×0,4 = 2.770 — razão verts/tri 0,60, obedece linearmente), mas **deformação de silhueta em malha com peso de osso só se vê renderizando**. Recomendo 0,5 e não 0,4 por isso.
- **A composição real do censo do lajes** (acima). É aritmética que não fecha, e eu não editei nada para investigar.
- **`Speckled Farm Hen Pecking` abaixo de 6.296 tri**: testei ratio 0,4 e 0,6, os dois param no mesmo número. Não testei `error` mais frouxo — pelo diagnóstico do MintProps (mesma patologia do capim, que não cede com `error` 0,02/0,20/0,60) a expectativa é que também não ceda, mas isso eu não medi.

**Nada foi gerado no Mint** (nenhum `start_*`, `animate_*`, `optimize_*`, `retopologize_*`; saldo intocado em 49.350). **Nada foi editado no repo.** GLBs e previews baixados só em `/tmp/mintfauna/`; scripts meus prefixados `mf_`.
