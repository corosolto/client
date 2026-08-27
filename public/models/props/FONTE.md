# Props — proveniência

Este arquivo cobre os props trazidos pelo mapa `corrego`. A ficha completa de cada
um (assetId do Mint, URL do chat, notas de escala e `sha256` do binário servido)
vive em `mint-assets.json`, na raiz — aqui fica só o índice legível.

O `sha256` de cada GLB abaixo foi conferido contra a ficha no momento em que
entraram nesta branch.

## Kit favela (moldes de casa e varal)

- `casa_favela_azul.glb` — Mint, pack `casa-favela-azul`. Molde em cubo ~1 m;
  o mapa escala por eixo com `placePropCaixa` (fachada 4,2–5,6 m, pé-direito 2,6–3,1 m).
- `casa_favela_tijolo.glb` — Mint, pack `casa-favela-tijolo`. Idem.
- `varal_roupas.glb` — Mint, pack `varal-roupas-favela`. Cordão a 1,95 m, vão 2,22 m.

## Vegetação de margem do córrego

- `grama_corrego_01.glb` — Mint, pack `grama-corrego-01`. Servido a 0,48 m de altura.
- `grama_corrego_02.glb` — Mint, pack `grama-corrego-02`. Idem.
- `planta_corrego_taboa.glb` — Mint, pack `planta-corrego-taboa`. Servido a 0,85 m.
- `planta_corrego_taioba.glb` — Mint, pack `planta-corrego-taioba`. Idem.

## Outros

- `caixa_dagua.glb` — Mint, pack `caixa-dagua`. Servido a 1,25 m.
  Só o GLB otimizado é versionado; os brutos do Mint ficaram fora deste PR.
