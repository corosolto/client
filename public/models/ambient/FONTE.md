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

Pipeline reproduzível: `node tools/optimize-ambient-fauna.mjs`.

## Fauna estática do córrego (mapa `corrego`)

Sem rig: o builder do mapa posiciona por `placeFauna` e a locomoção é procedural.
Proveniência completa (assetId, chat, sha256 do binário) em `mint-assets.json`,
packs `jacare-corrego` e `capivara-corrego`.

- `jacare_corrego.glb` — Mint text-to-3D (mint.gg), pack `jacare-corrego`.
- `capivara_corrego.glb` — Mint text-to-3D (mint.gg), pack `capivara-corrego`,
  “Sleepy Brown Rodent”. 0,998 m de comprimento no binário; o mapa serve a 1,0 m.

Pipeline reproduzível: `node tools/optimize-ambient-fauna.mjs`.
