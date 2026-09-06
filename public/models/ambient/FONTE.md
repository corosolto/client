# Fauna ambiente

- `pipa.glb` — “Red Yellow Diamond Kite”, Mint text-to-3D, 26/08/2026.
  [Chat de origem](https://mint.gg/chat/ph724bnemdzzbkp3va6bxdf5v98d6rrb),
  registro `pipa-lajes` em `mint-assets.json`, SHA-256
  `9ae646b40e18403bd861d35198b25be72d20c727de7a90ca7df1a389d6b2583e`.
  Voo procedural por `attachPipaSky`, com escala e âncoras definidas em
  `lajes_sky.js`. O arquivo não possui clipe de animação próprio.

Derivados otimizados das referências locais; texturas WebP 256², sem quantização
de malha skinned.

- `rat_animated.glb` — “Rat Animated”, Lobbyvictor,
  [Sketchfab](https://sketchfab.com/3d-models/rat-animated-cba5c3b8a946499083b4adfbb6d568b8),
  [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- `pigeon_ground.glb` — “Pigeon”, kenchoo,
  [Sketchfab](https://sketchfab.com/3d-models/pigeon-ddd5ef4a94eb4159937a9de25c45697c),
  [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- ~~`pigeon_flight.glb`~~ — **removido na v2.1** (frente D, BUG-57): pombo de asas
  abertas parado no céu. Pedido do dono, 18/08: “a pomba que nao esta com bracos
  avertos deveria ficar so na ponta das lajes ou no chao”. O acervo Quaternius/Poly
  Pizza não tem pássaro riggado com voo animado (varedura 19/08), então a presença
  aérea acabou — pombo anda no chão e pousa na ponta das lajes (régua AM11/AR5).
- `dog_caramelo.glb` — “Shiba Inu” (Ultimate Animated Animals Pack), Quaternius,
  [quaternius.com](https://quaternius.com/packs/ultimateanimatedanimals.html),
  [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
  Tingido para caramelo no pipeline (`Main` #C68642, `Main_Light` #E4C59A) —
  o original é marrom escuro com marcações cinzas. `skin.skeleton` inválido do
  export original foi removido (hint que o three.js ignora).
- `cat_telhado.glb` — “Cat”, Quaternius (Ultimate Animated Animals), espelhado no
  [Poly Pizza](https://poly.pizza/m/qKICY6xla2), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
  v2.1 frente D (BUG-57): gato de telhado das favelas; clipes Idle/Walk/Run no
  controlador `cat` do `ambientlife.js`.
- `galinha_campo.glb` — “Chicken”, Quaternius (Ultimate Animated Animals),
  [Poly Pizza](https://poly.pizza/m/ineV9pU5VL), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
  v2.1: galinha do campinho (fy_campomorro) e de quintal (fy_corrego); clipes
  Idle/Walk (o pack não traz Walk+Run separados — flee usa o Walk).
- `vaca_campo.glb` — “Cow”, Quaternius (Ultimate Animated Animals),
  [Poly Pizza](https://poly.pizza/m/26zM1outCr), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
  v2.1: vaca da várzea do fy_campomorro; clipes podados para Idle/Walk/Gallop
  (o pack traz 24 — `keepClips` do pipeline corta os que o controlador não toca).
- `jacare_corrego.glb` — “Blocky Belly Caiman”, Mint text-to-3D (Meshy), gerado
  18/08/2026 para o BUG-57 (pedido do dono: “precisa gerar jacare no mintgg”).
  Chat: <https://mint.gg/chat/ph71907xmzehws02vnam630e6n8cpypj> · licença de uso
  do assinante Mint Pro (asset original gerado por prompt, sem copyright de
  terceiros). Otimizado no pipeline (WebP 256²) a partir de
  `references/glb/jacare_corrego_mint.glb`; registro com SHA em `mint-assets.json`
  (`jacare-corrego`). Estático — o pipeline de animação Mint é humanoid-only.
  **Dívida v2.1 (frente D):** não existe jacaré riggado CC0 — Quaternius não tem
  réptil em nenhum pack (enumerados 19/08: Animated Animals = 12 mamíferos,
  Farm = 7) e o Poly Pizza só oferece caimãs estáticos (busca “alligator”/
  “crocodile”/“caiman” 19/08, todos `anim=False`). Integração do GLB estático é
  da frente B (call-site do córrego).
- `capivara_corrego.glb` — “Sleepy Brown Rodent”, Mint text-to-3D (Meshy), gerado
  18/08/2026 para o BUG-57 (idem). Chat:
  <https://mint.gg/chat/ph74kf2engyr4skt5kxkwxxrgd8cqmqt>. Mesma licença e
  pipeline; textura clareada ×1,45 (`brighten`) porque o Mint entregou lum 69 e
  o estilo da fauna é lum 86-165 (dog). Registro em `mint-assets.json`
  (`capivara-corrego`). Estático, idem — mesma dívida de rig da frente D (busca
  “capybara”/“capybara animated” no Poly Pizza: só estáticos).
- `tatu_campo.glb` — “Segmented Tatu Walker”, Mint text-to-3D, gerado 19/08/2026
  para a vida 1 (plans/22). Chat: <https://mint.gg/chat/ph763essssxnfef5n923a7gn5d8crckr>.
  Mesma licença do jacaré/capivara; registro em `mint-assets.json` (`tatu-campo`).
  Estático — anda pelo `_updateQuad` do `ambientlife.js`. Tatu não existe em
  nenhum pack Quaternius (a varredura 19/08 acima cobre: 12 mamíferos + farm,
  nenhum xenartro). Call-sites: fy_campomorro, praca_poderes (AR4).
- `papagaio_poleiro.glb` — “Yellow Chevron Parrot”, Mint text-to-3D, 19/08/2026
  (vida 1). Chat: <https://mint.gg/chat/ph73z314p21j55zt11pa040frh8cstk4>.
  Registro `papagaio-poleiro`. Estático de poleiro (a barra faz parte da malha)
  com balanço procedural `_updateParrot` — poleiro não precisa de voo, o que
  contorna a dívida de pássaro riggado CC0 registrada na pomba. Call-sites:
  fy_mansao (balaustrada do terraço), parque_treta (AR4).
- `arara_voo.glb` — “Arara em voo”, Mint text-to-3D, 27/08/2026 (lote céu).
  Chat: <https://mint.gg/chat/ph7ajvsqfqtnafkh23jjd5dpsh8d6709>. Registro
  `arara-voo`. **Paga a dívida registrada acima na pomba**: a presença aérea
  acabou na v2.1 porque o `pigeon_flight.glb` era ave de asas abertas PARADA, e o
  plans/22 condicionou a volta a "pássaro riggado de verdade". O rig do Mint
  continua sendo só humanoid, então a solução foi a mesma do tatu e da pipa —
  **asa vira NÓ, o bater é procedural**: `tools/split-props-v21.mjs arara_voo`
  separa `asa-esquerda`/`asa-direita` com pivô na raiz (regra medida no bruto:
  |z| > 0,10 é asa; 512/515 tris cada, simétrico), e o `skylife.js` gira as duas
  em sentidos opostos, curso ~33°. Nariz em −X (`BIRD_FORWARD_X`), medido pela
  densidade de triângulos: a ponta −x tem a cabeça compacta, a +x afina no rabo.
  2.951 tris após `simplify .6`. Call-sites: fy_corrego (bando de 3), fy_lajes
  (par). NÃO é fauna de chão: não entra no `ambientlife.js` nem no censo do
  `ambience-registry` — vive no `skylife.js`, sem colisão e sem reação a tiro.
- `barata_urbana.glb` — Mint text-to-3D, 19/08/2026 (vida 1). Barata de esgoto
  do córrego e da doca do atacadão; darta pelo `_updateRat`. Registro
  `barata-urbana`. (Primeira geração bloqueada pela moderação do Mint;
  regenerada com prompt de "garden beetle".)

Pipeline reproduzível: `node tools/optimize-ambient-fauna.mjs` (filtre por
`quaternius_cat`/`quaternius_chicken`/`quaternius_cow` para regenerar as
espécies v2.1). Referências de silhueta/procedência de medidas:
`references/fauna-corrego/FONTE.md`; ficha: `plans/21-FAUNA-CORREGO.md`;
evidência e revisão: `tools/eval/asset-evidence/fauna/`.

## Fauna da Amazônia

Os GLBs boto_amazonia, onca_pintada, tucano, preguica, macaco_prego, anta,
arara_vermelha, piranha e carcara vieram do Mint no PR439. IDs, prompts e
procedência por asset estão no mint-assets.json. Arara de voo reutilizada da main.
