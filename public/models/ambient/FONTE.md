# Fauna ambiente

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

Pipeline reproduzível: `node tools/optimize-ambient-fauna.mjs` (filtre por
`quaternius_cat`/`quaternius_chicken`/`quaternius_cow` para regenerar as
espécies v2.1). Referências de silhueta/procedência de medidas:
`references/fauna-corrego/FONTE.md`; ficha: `plans/21-FAUNA-CORREGO.md`;
evidência e revisão: `tools/eval/asset-evidence/fauna/`.
