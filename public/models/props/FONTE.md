
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

## v2.1 — lote 5: casario e varal de favela (frente CÓRREGO, kit `favela_r3`)

Pedido do dono (26/08/2026), duas frases: *"os mapas de favela so o lajes tem
cordao de roupas do model, os outros nao e tudo generico low poly"* e *"tem que
ver a escala dos predios sempre"*. Mint text-to-3D, licença de uso do assinante
Mint Pro (asset original gerado por prompt, sem copyright de terceiros). Os três
saíram do mesmo pack: `favela_r3`, packAssetId `th7395mdsfsgrt1dxb4zc3my2s8d6snr`,
chat <https://mint.gg/chat/ph75rmydefr3btvm85a61hra6h8d74qq> (índice do kit em
`/Users/ruben/map2/kits-mint-r3.json`, fora do repo). Otimizados na origem
(WebP 1024 via `EXT_texture_webp`, ~4-5 k tris) — não passaram pelo
`tools/optimize-props-v21.mjs`.

**Convenção QUEBRADA de propósito neste lote.** O acervo integra prop com escala
UNIFORME (`placeProp`, um `targetH`). Para casa isso não fecha: o molde do Mint
chega quase cúbico (medido no accessor POSITION do binário: azul 0,955 × 0,998 ×
0,764 m; tijolo 0,943 × 0,936 × 0,998 m) e casa de favela tem fachada de 4,0-5,6 m
com pé-direito de 2,6-3,2 m por pavimento — 1,4:1 a 1,7:1. Com escala uniforme,
4,4 m de fachada obrigariam 4,6 m de pé-direito (casa de gigante, que é o defeito
que o dono nomeou). Por isso as casas entram por `placePropCaixa`
(`public/js/mapprops.js`), que escala larg/alt/prof por eixo. O varal continua
uniforme — esticar o eixo da corda deforma a roupa.

- `casa_favela_azul.glb` — "Blue Favela House", sobradinho de alvenaria pintada
  de azul com laje e caixa d'água. 4.780 tris. Item `ks7fet6qkrzjrs9jk2zsqsh0rh8d78by`
  do pack. Registro: `casa-favela-azul`. Uso: `map_corrego.js` (palafitas do
  canal e morro do fundo), 1-2 pavimentos, fachada 4,2-5,6 m.
- `casa_favela_tijolo.glb` — "Brick Favela House", casa de tijolo cru sem reboco.
  4.181 tris. Item `ks77wm8m73833tvn9edhztpkx98d6dtx`. Registro:
  `casa-favela-tijolo`. Par obrigatório do azul: a régua `eval:escala-favela-glb`
  cobra os dois moldes por mapa, nenhum abaixo de 30% das casas.
- `varal_roupas.glb` — "Favela Clothesline", corda com roupa colorida em
  prendedores (a corda corre no eixo X local; normalizado pela largura, 0,998 ×
  0,697 × 0,326 m). 4.677 tris. Item `ks77x28h86c6wvx3xzr996npdh8d7bv8`.
  Registro: `varal-roupas-favela`. Uso: `map_corrego.js`, 5 vãos de beco e beira
  com `targetH` 1,55 m ⇒ vão de 2,22 m e cordão a 3,50 m.

Régua deste lote: `npm run eval:escala-favela-glb` (mede a transform REAL de cada
casa no mundo bootado, não a declaração; mutantes `ana`, `molde-unico`,
`laje-unica`, `varal-baixo`). NÃO há evidência de render em
`tools/eval/asset-evidence/` para este lote — o slot de browser não era desta
frente; a leitura visual (qual face do molde é a fachada com porta) está aberta.
