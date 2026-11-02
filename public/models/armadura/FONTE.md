# Armadura (colete e capacete)

Gerados pelo dono na conta Mint dele em 28/10/2026, com prompt próprio. Uso livre no jogo, sem copyright de terceiro.

- `colete.glb`: "Dustworn Olive Plate Carrier", plate carrier oliva, ~4,9k tris.
- `capacete.glb`: "Olive Highcut NVG Helmet", high-cut oliva com rail e jugular, ~4,6k tris.

Os dois saem de `tools/optimize-armadura.mjs` a partir do original da Mint. O script reduz as texturas para 1024 (cor e normal) e 512 (metal/rugosidade) em JPEG e comprime a geometria com meshopt. O tamanho fica em 3,5 → 0,35 MB e 3,0 → 0,26 MB.

O modelo vem normalizado num cubo de ~1 m, com a frente em +Z. A escala e o encaixe são medidos por corpo em `public/js/armadura-visual.js`. Registro: `armadura_colete` e `armadura_capacete` em `mint-assets.json`.
