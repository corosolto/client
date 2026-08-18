# Fauna ambiente

Derivados otimizados das referências locais; texturas WebP 256², sem quantização
de malha skinned.

- `rat_animated.glb` — “Rat Animated”, Lobbyvictor,
  [Sketchfab](https://sketchfab.com/3d-models/rat-animated-cba5c3b8a946499083b4adfbb6d568b8),
  [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- `pigeon_ground.glb` — “Pigeon”, kenchoo,
  [Sketchfab](https://sketchfab.com/3d-models/pigeon-ddd5ef4a94eb4159937a9de25c45697c),
  [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- `pigeon_flight.glb` — “Pigeon In Flight”, restore50,
  [Sketchfab](https://sketchfab.com/3d-models/pigeon-in-flight-d135106ba138411fbe8d779b2fb90599),
  [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- `dog_caramelo.glb` — “Shiba Inu” (Ultimate Animated Animals Pack), Quaternius,
  [quaternius.com](https://quaternius.com/packs/ultimateanimatedanimals.html),
  [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
  Tingido para caramelo no pipeline (`Main` #C68642, `Main_Light` #E4C59A) —
  o original é marrom escuro com marcações cinzas. `skin.skeleton` inválido do
  export original foi removido (hint que o three.js ignora).
- `jacare_corrego.glb` — “Blocky Belly Caiman”, Mint text-to-3D (Meshy), gerado
  18/08/2026 para o BUG-57 (pedido do dono: “precisa gerar jacare no mintgg”).
  Chat: <https://mint.gg/chat/ph71907xmzehws02vnam630e6n8cpypj> · licença de uso
  do assinante Mint Pro (asset original gerado por prompt, sem copyright de
  terceiros). Otimizado no pipeline (WebP 256²) a partir de
  `references/glb/jacare_corrego_mint.glb`; registro com SHA em `mint-assets.json`
  (`jacare-corrego`). Estático — o pipeline de animação Mint é humanoid-only.
- `capivara_corrego.glb` — “Sleepy Brown Rodent”, Mint text-to-3D (Meshy), gerado
  18/08/2026 para o BUG-57 (idem). Chat:
  <https://mint.gg/chat/ph74kf2engyr4skt5kxkwxxrgd8cqmqt>. Mesma licença e
  pipeline; textura clareada ×1,45 (`brighten`) porque o Mint entregou lum 69 e
  o estilo da fauna é lum 86-165 (dog). Registro em `mint-assets.json`
  (`capivara-corrego`). Estático, idem.

Pipeline reproduzível: `node tools/optimize-ambient-fauna.mjs` (filtre por
`corrego` para regenerar só os dois). Referências de silhueta/procedência de
medidas: `references/fauna-corrego/FONTE.md`; ficha: `plans/21-FAUNA-CORREGO.md`;
evidência e revisão: `tools/eval/asset-evidence/fauna/`.
