
# Props de cenário

Acervo de props estáticos dos mapas. O legado (carros, casas do lajes, mobiliário)
chegou antes da régua de registro existir — regularização fora do escopo da v2.1.
A partir da frente E da v2.1 (`plans/13-VISUAL-V2.1.md`), todo prop novo entra com
`source.frente: "v21-e-models"` no `mint-assets.json` e linha aqui — cobrado pelo
`eval:props-acervo` (mutantes: sem-fonte, sem-sha, arquivo-sumido).

## v2.1 — lote 1: vegetação de córrego (frente B)

Pedido do dono (18/08/2026): *"faltou tambem usar os glbs de grama"*. Mint
text-to-3D (Meshy), licença de uso do assinante Mint Pro (asset original gerado
por prompt, sem copyright de terceiros). Pipeline reproduzível:
`node tools/optimize-props-v21.mjs` (dedup/prune + WebP 256²), a partir dos GLBs
brutos em `references/glb/` (não versionados). Convenção do acervo: GLB
normalizado ~1 m, pivô central — escalar no call-site como já se faz com
`caixa_dagua.glb`. Evidência visual (render node, Y corrigido — ver nota do
render no fim): `tools/eval/asset-evidence/props-v21/`.

- `grama_corrego_01.glb` — "Arching Guinea Grass Tuft", tufo de capim alto de
  margem (capim-colonião) com palhas secas na base. 4.142 tris. Chat:
  <https://mint.gg/chat/ph71dz35n7h5sygreq303bjye58crhzj>. Registro:
  `grama-corrego-01`. Escala sugerida ~0,72 ⇒ ~0,70 m.
- `grama_corrego_02.glb` — "Urban Creekside Weeds", moita rasteira amarelada
  com folhas de mato. 4.046 tris. Chat:
  <https://mint.gg/chat/ph78r1m1pa8zyrhsvw0nwz4b1x8crrg2>. Registro:
  `grama-corrego-02`. Escala sugerida ~0,6 ⇒ ~0,60 m largo.
- `planta_corrego_taboa.glb` — "Brown Spike Cattail", taboa (Typha) com duas
  espigas. 4.861 tris. Chat:
  <https://mint.gg/chat/ph72y6pxj76ky56x90cwrc1h7h8cs718>. Registro:
  `planta-corrego-taboa`. Escala sugerida ~1,4 ⇒ ~1,40 m.
- `planta_corrego_taioba.glb` — "Heart Leaf Taioba", taioba (Xanthosoma) de
  folhas cordiformes. 4.476 tris. Chat:
  <https://mint.gg/chat/ph7bt423mvd2mkq60j8xws2an58csnn4> (v2 — a primeira
  geração falhou no estágio final do Mint). Registro: `planta-corrego-taioba`.
  Escala sugerida ~0,95 ⇒ ~0,90 m.

## v2.1 — lote 2: caixa d'água (frente A)

Pedido do dono: *"a caixa da agua ta horrivel [...] na laje tao bons, fazer
variacoes"*. Variações estilo favela da `caixa_dagua.glb` (Tripo, 18,7k tris) —
as novas ficam em ~4,6-4,8k tris com WebP 512².

- `caixa_dagua_azul.glb` — "Blue Ribbed Water Tank", tanque azul de polietileno
  com tampa azul-escura e bocal, sobre tábua e blocos de concreto. 4.636 tris.
  Chat: <https://mint.gg/chat/ph7c3scfqprd8jp9bn92279kwx8csbkq>. Registro:
  `caixa-dagua-azul`. Escala sugerida ~1,4 ⇒ ~1,40 m com a base.
- `caixa_dagua_preta.glb` — "Ribbed Black Water Tank", tanque preto com tampa e
  extravasor, sobre anel de concreto. 4.802 tris. Chat:
  <https://mint.gg/chat/ph75dwttq4rqsgn45418bf3m458cs3kv>. Registro:
  `caixa-dagua-preta`. Escala sugerida ~1,2 ⇒ ~1,20 m.
- `caixa_dagua_fibra.glb` — "Weathered Favela Water Tank", fibrocimento
  amarelado com escorrido, tampa entreaberta, sobre duas vigas de concreto.
  4.542 tris. Chat: <https://mint.gg/chat/ph72pgyxr7v54g3vn5w7az62z58csyjg>.
  Registro: `caixa-dagua-fibra`. Escala sugerida ~1,2 ⇒ ~1,20 m.

## v2.1 — lote 3: varais + vida de céu

Pedidos do dono (19/08/2026): *"as roupas penduradas no corrego, quebrada e
campinho tao ruins, na laje tao bons, fazer variacoes"* e *"o lajes tem pipa mas
nao tem animacao do pipa voando, podemos por helicoptero, aviao com faixa da
praia, no caso da mansao do joa"*. Mesma licença e pipeline dos lotes 1-2, com
`tools/split-props-v21.mjs` antes do optimize nos três animáveis — o Meshy
entrega malha única fragmentada (1.155 ilhas no heli), então o split é por
centróide de triângulo com regra calibrada no render bruto, e o pivô do nó fica
no eixo de rotação/balanço (o call-site só faz `node.rotation.*`).

- `varal_roupas_01.glb` — "Colorful Laundry Varal", corda com 6 peças coloridas
  em prendedores entre ganchos. 4.773 tris. Chat:
  <https://mint.gg/chat/ph7cqm9tnn58h1sxznpq26wgax8cr51p>. Registro:
  `varal-roupas-01`. Escala sugerida ~3,0 ⇒ 3,0 m × 0,84 m.
- `varal_roupas_02.glb` — varal de chão, rack dobrável em X (o crítico corrigiu:
  não é "em T"), 2 linhas com camisetas, jeans, meias e fronha. 4.818 tris. Chat:
  <https://mint.gg/chat/ph79avg70bbmppdah59xczz0m58cr0dg>. Registro:
  `varal-roupas-02`. Escala sugerida ~1,8 ⇒ 1,8 m × 1,46 m.
- `pipa_papel.glb` — "Yellow Green Pipa", losango amarelo/verde com varetas e
  rabiola de 5 lacinhos. 4.983 tris; nó `rabiola` separado (4.452 tris) com
  pivô na ponta inferior da vela T=(0,14; -0,12; 0,02). Chat:
  <https://mint.gg/chat/ph77ctevcka9b4khfrkhkpg2wd8cr9b5>. Registro:
  `pipa-papel`. Escala sugerida ~1,6 ⇒ vela ~0,74 m.
- `helicoptero_pm.glb` — "Blue White Police Copter", JetRanger azul/branco
  genérico, **sem logo nem texto** (veto editorial). 4.933 tris; nós
  `rotor_main` (287 tris, pivô T=(0,08; 0,17; 0), rotação em Y) e `rotor_tail`
  (75 tris, pivô T=(-0,44; 0,02; -0,05), rotação em Z). Chat:
  <https://mint.gg/chat/ph76rk8v51359p9cd6rk249j5x8crxq0>. Registro:
  `helicoptero-pm`. Escala sugerida ~10 ⇒ ~10 m.
- `aviao_faixa.glb` — "Red Stripe Sky Advertiser", monomotor de aeropublicidade
  puxando faixa em branco. 4.546 tris; nó `faixa` separado (1.397 tris,
  T=(0; 0; -0,095)) — a textura do texto é arte 2D via OpenRouter, outra frente
  (regra 19/08: Mint só 3D). Chat:
  <https://mint.gg/chat/ph75y9xxqg1t82rhmfjxjkm6cx8crz6r>. Registro:
  `aviao-faixa`. Escala sugerida ~12 ⇒ envergadura ~10,7 m.

> Nota de evidência: além do espelho em Y já documentado abaixo, o
> `render-fauna-soft.mjs` também **ignora o `translation` dos nós** (cai no
> fallback identidade) — nos renders `*-corrigido.png` dos três animáveis o
> rotor/rabiola/faixa aparece levemente deslocados do encaixe. A prova de
> montagem é o `getBounds` por nó (rotor_main -0,37..0,50 × 0,15..0,23; rabiola
> -0,50..-0,12; faixa 0,0..0,50 — todos no lugar) e a árvore de nós impressa
> pelo `split-props-v21.mjs`.

---

> Nota de ferramenta (19/08/2026): `tools/render-fauna-soft.mjs` projeta com o
> vetor "up" invertido (produto vetorial left-handed) — **toda saída dele é
> espelhada em Y**, inclusive a evidência de fauna já commitada. Os renders
> `*-corrigido.png` desta pasta de evidência foram desespelhados com
> `sharp .flip()`. Consertar o renderer é frente do arnês, não da E.

## Revisão adversarial (19/08, crítico de contexto limpo — skill asset-review)

Veredito: **os 7 vão para o merge, nenhum regenera**. Conferido de fora: SHA × disco
(todos batem), texturas extraídas dos GLBs (íntegras — a mancha dos renders node é o
renderer, não o arquivo), `EXT_texture_webp` suportado pelo GLTFLoader r160 vendorizado,
folhagem OPAQUE+doubleSided, zero vetos. Ressalvas de INTEGRAÇÃO (não de asset):
grama em InstancedMesh (4k tris/tufo pesa mais que as casas se solto), caixa preta com
lum ~56 abaixo da banda 86-165 (validar in-game antes de espalhar), caixa azul esguia
(corrigir com escala X/Z no call-site se na laje parecer magra).

## Revisão adversarial do lote 3 (19/08, crítico de contexto limpo)

Veredito: **os 5 vão para o merge, nenhum regenera**. Verificado de fora: SHA × disco
nos 5, texturas extraídas (heli/avião/varais sem logo, texto ou brasão — veto editorial
limpo), plano de rotação dos rotores medido por variância de vértices (rotor_main em Y,
rotor_tail em Z — eixo fisicamente certo), nós animáveis confirmados NO ARQUIVO.
Ressalvas de INTEGRAÇÃO (não de asset):
- `varal_roupas_01`: gancho central pendurado no alto — esticado a 3 m flutua no vazio;
  esconder ou apontar para um beiral no call-site. Se parecer fino demais, escala Y no
  call-site, não prompt.
- `pipa_papel`: 89% dos tris (4.452) estão nos lacinhos de ~5 cm (sub-pixel em jogo) —
  dentro do teto, mas é o primeiro candidato a decimação.
- `aviao_faixa`: pivô da faixa z=-0,095 deixa o centro ~0,42 m fora da linha da
  fuselagem na escala 12 (o correto seria z=-0,06) — imperceptível no céu, anotado.


## v2.1 — lote 4: jardim tropical da mansão (frente C, BUG-64)

Pedido do dono (20/08/2026): *"o pior de todos é a mansão do joá, o jardim está
horrível"*. O jardim era 100% primitiva de cor chapada (pirulitos de icosaedro,
maciços de esfera achatada). Oito espécies tropicais do jardim modernista
(referência Burle Marx / Joá), mesmo Mint text-to-3D, licença e pipeline dos
lotes 1-3 (`node tools/optimize-props-v21.mjs`, WebP 512², a partir dos brutos
`references/glb/*_mint.glb` não versionados). GLB normalizado ~1 m, pivô
central — escala no call-site do `map_mansao.js` (tabela JARDIM_VEG).

- `palmeira_imperial.glb` — "Imperial Grey Palm", palmeira-imperial com tronco
  anelado cinza e crownshaft verde. 3.637 tris. Tronco escurecido no pipeline
  (`trunkShade` do optimize: material-clone fator 0,55/0,47/0,40 nos triângulos
  dos 42% inferiores — o tronco branco-liso foi reprovado pelo crítico v2.1).
  Chat: <https://mint.gg/chat/ph70gyyyc7qvvem3mm8t0a29y98cv0tw>. Registro:
  `palmeira-imperial-jardim`.
- `palmeira_ravenala.glb` — "Dramatic Fan Palm", ravenala (palmeira-leque) em
  leque vertical. 4.428 tris. Chat:
  <https://mint.gg/chat/ph7by8184sbqmx1ev8j068pvm58ctqm0>. Registro:
  `palmeira-ravenala-jardim`.
- `heliconia.glb` — "Red Claw Heliconia", brácteas vermelho-amarelas pendentes.
  4.052 tris. Chat: <https://mint.gg/chat/ph7cp8y6gyxt9gg461m4rcg8th8ctwfd>.
  Registro: `heliconia-jardim`.
- `costela_adao.glb` — "Perforated Monstera Bush", monstera de folhas
  fenestradas. 3.472 tris. Chat:
  <https://mint.gg/chat/ph7byt97jw52ykdjrzezvwhsvn8cvsje>. Registro:
  `costela-adao-jardim`.
- `bananeira.glb` — "Drooping Paddle Banana Plant", pseudocaule verde com
  folhas-pá. 4.684 tris. Chat:
  <https://mint.gg/chat/ph71fmfkb7fb4433vac33xghd58cttan>. Registro:
  `bananeira-jardim`.
- `ixora.glb` — "Crimson Ixora Bloom", arbusto com buquês vermelho-alaranjados.
  4.496 tris. Chat: <https://mint.gg/chat/ph7dcr7emj3jkafn0yq98gantx8cvtvs>.
  Registro: `ixora-jardim`.
- `agave.glb` — "Blue-Green Agave Rosette", roseta azul-esverdeada. 4.688 tris.
  Chat: <https://mint.gg/chat/ph777k51x3zm7rh2p92m2yferh8cv41j>. Registro:
  `agave-jardim`.
- `samambaia.glb` — "Emerald Feather Clump", touceira densa de samambaia.
  3.757 tris. Chat: <https://mint.gg/chat/ph738vqqdc08zxxy7912d24w1n8cteh0>.
  Registro: `samambaia-jardim`.

## v2.1 — lote 4: armazém do Atacadão (frente ATACADAO, map2/atacadao)

Pedido do dono (27/08/2026): *"os mapas do emerson acho que da pra fazer models
no mintgg e deixar mais realista, especialmente o do atacadao"*. Kit `atacadao_r3`
do Mint (`kits-mint-r3.json`, pack `th7dnpa6tmkqv43k7s3458exmx8d79aq`, chat
<https://mint.gg/chat/ph7emw51xss7hs3n3war213h618d7ayv>), otimizado na onda
r3-parte2 (WebP 1024, ~4-5k tris). Licença de uso do assinante Mint Pro — asset
original gerado por prompt, sem copyright de terceiros. Convenção do acervo: GLB
normalizado ~1 m, pivô na base, escala no call-site via `placeProp({ targetH })`.
Os três entram no `mint-assets.json` com `source.frente: "v21-e-models"`, então
caem no `eval:props-acervo`, no `eval:asset-integrity` e no `eval:gltf-validator`.

- `estante_pallets.glb` — rack de pallet de clube de atacado, estrutura metálica
  de três níveis com carga encolhida em filme stretch. 4.565 tris. Registro:
  `estante-pallets`. Item: `ks7d5h0jrqz526fsqjtmed8d8s8d6780`. Usado em
  `public/js/map_atacadao.js` como molde das 6 fileiras do labirinto (48
  instâncias, `targetH` 3,0, `ry` PI/2 — o eixo longo do GLB é o X).
- `freezer.glb` — freezer horizontal de ilha, tampa de vidro corrediça e adesivo
  de promoção descascando. 4.486 tris. Registro: `freezer-atacadao`. Item:
  `ks7fwtjj0r7fy6fqce79scb0y18d6yja`. Parede fria da lateral leste (6 instâncias,
  `targetH` 2,2).
- `ilha_caixas.glb` — ilha de promoção, caixas de papelão abertas sobre pallet
  baixo. 4.424 tris. Registro: `ilha-caixas`. Item:
  `ks77jm9rp5ek9an2s31q8608rx8d71a1`. Cover de meia-altura (`targetH` 1,15, 12
  instâncias) na boca dos vãos alternados — cobrado pela ATA2 da
  `tools/eval/atacadao-check.mjs`.

Contagem de triângulos medida com `@gltf-transform/core` (NodeIO com
`ALL_EXTENSIONS` + decoder do meshopt), não estimada.

## Seções do atacadão — lote Replicate (27/08/2026)

**Este lote NÃO é Mint.** Foi gerado por `tools/gen-asset.mjs --provider replicate`
na conta Replicate do dono: texto → imagem com `black-forest-labs/flux-schnell`,
imagem → malha com `ndreca/hunyuan3d-2`, e depois o mesmo otimizador do acervo
(dedup/prune + WebP 1024). No `mint-assets.json` isso aparece honestamente como
`source.kind: "replicate-gen"` e `processing.provider: "replicate"` — o arquivo é de
proveniência, declarar um pipeline que não foi usado seria o pior defeito possível
nele. O marcador é `source.frente: "atacadao-secoes"`, e o `eval:props-acervo` passou
a cobrir esse marcador junto com o `v21-e-models`.

Reconstrução de imagem ÚNICA tem um custo que o nome do arquivo não conta: a malha
sai como um bloco fechado. Medido com `tools/inspect-glb.mjs` mais uma sonda de
ocupação, os sete saíram entre 78% e 100% de planta ocupada, contra 39–63% dos props
bons do acervo (`moto_cg` 39%, `estante_pallets` 58%, `freezer` 63%). Para um balcão,
que É um caixote, isso é aceitável. Para um objeto vazado, não é.

### Entraram (4)

- `balcao_acougue.glb` — 12.000 tris. Registro: `balcao-acougue`. Bbox 0,908 × 0,925
  × 0,715; 31% de face horizontal e banda 10–90 de 76%, em linha com o acervo bom.
  Seção AÇOUGUE do `map_atacadao.js` (4 instâncias, `targetH` 1,15).
- `balcao_padaria.glb` — 12.000 tris. Registro: `balcao-padaria`. Bbox 0,284 × 0,151
  × 0,285: planta quadrada e meia-altura, então entra como ILHA de exposição, que é o
  que a malha é — não como balcão linear. Seção PADARIA (3 instâncias, `targetH` 1,10).
- `ilha_hortifruti.glb` — 12.000 tris. Registro: `ilha-hortifruti`. Bbox cúbico
  0,989³, banda 10–90 de 96%. Seção HORTIFRÚTI (4 instâncias, `targetH` 1,20).
- `geladeira_bebidas.glb` — 22.158 tris. Registro: `geladeira-bebidas`. Bbox 0,770 ×
  0,990 × 0,334 — mais alta que larga e rasa, a proporção certa de expositor de porta
  de vidro. Atende ao "precisa de geladeiras de bebidas" do dono, que o `freezer`
  (ilha HORIZONTAL) não atende. É o mais pesado do lote: 4 instâncias = 89 k tris.

### Reprovados na medição e NÃO integrados (3)

Ficaram de fora de propósito. O dono acabou de reclamar em outro mapa que "os models
que colocaram estão horríveis sem definição nenhuma": molde ruim colocado é pior que
seção ausente. Os arquivos foram removidos do worktree — a receita acima reproduz.

- `balcao_peixaria.glb` — bbox 0,750 × **0,136** × 0,989. A altura é 14% da planta:
  é uma panqueca, não um balcão. Normalizado para 1,05 m de altura viraria um móvel
  de 5,8 × 7,6 m. 55% da área em face horizontal (o acervo bom fica em 31–47%).
  A peixaria do mapa segue procedural, com azulejo branco e cartaz.
- `cancela_estacionamento.glb` — planta ocupada **98%** e bbox quadrado em XZ
  (0,989 × 0,989). Cancela é braço fino mais base: tem de ocupar pouca planta, como a
  `moto_cg` (39%). 98% num bbox quadrado é relevo visto de cima, não cancela. As duas
  cancelas do mapa seguem procedurais.
- `lava_rapido.glb` — 80% dos vértices dentro de **1%** da altura do bbox
  (banda 10–90 = 1%). É uma chapa plana com algumas pontas definindo o bbox. A baia
  de lava-rápido do mapa segue procedural (três paredes, telha e piso molhado).

Contagem de triângulos e proporções medidas com `@gltf-transform/core` (NodeIO com
`ALL_EXTENSIONS`), não estimadas.
