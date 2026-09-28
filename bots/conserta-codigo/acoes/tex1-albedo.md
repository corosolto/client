---
nome: tex1-albedo
quando: public/js/map_*.js, public/js/maps.js
ativo: true
classe: TEX1
gate: node tools/eval/invariants.mjs
---
Correção mecânica para superfície clara grande sem albedo (TEX1): escurecer
a cor do material até a luminância sair da faixa que a invariante reprova
(texturizar é curadoria humana — o bot só escurece). Substituição limitada ao
hex/cor do material citado; se o diff pede mais que isso, não é esta classe.
