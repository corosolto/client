---
nome: decals-pack
quando: sempre
ativo: true
checagem: decals-pack
---
Classe: **06/08, "os mapas perderam toda textura de graffitis"** — o pacote de
decalques (196 PNGs, fora do git) veio atrás do que o `DECAL_FILES` do
`textures.js` pede: 404 silencioso, 30% da arte da Quebrada some.

Mede: amostra HEAD de N arquivos (config `amostra_decals`) sorteados do
`DECAL_FILES` do textures.js local contra `/img/decals/<arquivo>` no ar.
404 em amostra = pack publicado atrás.
