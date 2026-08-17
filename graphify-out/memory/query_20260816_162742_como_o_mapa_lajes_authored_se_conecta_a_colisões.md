---
type: "query"
date: "2026-08-16T16:27:42.098115+00:00"
question: "Como o mapa Lajes authored se conecta a colisões, occluders, spawn/respawn, limites, telhados e becos bloqueados?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["file::public/js/map_lajes_authored.js", "symbol::public/js/map_lajes_authored.js::buildLajes", "symbol::public/js/game.js::Game._collide", "symbol::public/js/game.js::Game._updatePlayer", "file::tools/eval/lajes-gap-check.mjs"]
---

# Q: Como o mapa Lajes authored se conecta a colisões, occluders, spawn/respawn, limites, telhados e becos bloqueados?

## Answer

Expanded from original query via graph vocab: [lajes, authored, collide, occluder, spawn, respawn, bounds, roof, ground, walls, blocks, beco]. O grafo ligou map_lajes_authored.js a buildLajes, ROOFS, MAIN_BECO, Game._collide, Game._updatePlayer e aos gates de Lajes. A confirmação no fonte mostrou três contratos ausentes: addBox envia MAT.proxy invisível para world.occluders e _fireHitscan raycasta essa lista; groundHeightAt de Lajes ignora o yRef passado por _updatePlayer; e o casario visual se estende além dos bounds que _collide aplica como clamp. As caixas por segmento de beco são uma quarta hipótese forte, ainda pendente de probe andando com _collide real.

## Outcome

- Signal: useful

## Source Nodes

- file::public/js/map_lajes_authored.js
- symbol::public/js/map_lajes_authored.js::buildLajes
- symbol::public/js/game.js::Game._collide
- symbol::public/js/game.js::Game._updatePlayer
- file::tools/eval/lajes-gap-check.mjs