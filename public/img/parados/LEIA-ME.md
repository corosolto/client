# Arte estacionada

Wallpapers tirados da rotação do menu sem serem apagados. Os geradores (`tools/gen-media-manifest.mjs`, `tools/gen-menu-wallpapers.mjs`) leem só o topo de `public/img/` com `readdirSync`, então nada aqui dentro entra em `walls.json` nem em `walls-3x2/manifest.json`.

- `wall-27.*` — a Cuca. Saiu em 25/09 a pedido do dono; só a exposição saiu, os bytes estão aqui.

Para voltar: `git mv` os três arquivos de volta (`wall-27.png` e `wall-27.webp` para `public/img/`, `walls-3x2/wall-27.webp` para `public/img/walls-3x2/`), depois `npm run media && npm run menuwalls` e recoloque `'/img/wall-27.webp'` no array `WALLS` de `public/js/main.js`.
