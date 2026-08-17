---
type: "query"
date: "2026-08-15T23:26:38.606511+00:00"
question: "Como integrar ambiência viva com ratos, pombas, reação a tiros e traçantes em fy_lajes, fy_corrego e fy_escadao, reaproveitando loaders e sistemas existentes sem sobrecarregar o hot path?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["._tracer()", "._fireHitscan()", "._updateFx()", "GLTFLoader", "corrego-contract-check.mjs", "public/js/mapprops.js"]
---

# Q: Como integrar ambiência viva com ratos, pombas, reação a tiros e traçantes em fy_lajes, fy_corrego e fy_escadao, reaproveitando loaders e sistemas existentes sem sobrecarregar o hot path?

## Answer

O caminho de menor risco é manter fauna animada fora dos props estáticos: GLTFLoader + SkeletonUtils.clone, controlador world.ambience determinístico com update e onShot chamados por Game.update e Game._fireHitscan. O traçante existente em Game._tracer deve ser tornado perceptível e medido, sem nova física de projétil. LOWQ reduz instâncias. Só GLBs CC-BY e dentro do orçamento entram.

## Outcome

- Signal: useful

## Source Nodes

- ._tracer()
- ._fireHitscan()
- ._updateFx()
- GLTFLoader
- corrego-contract-check.mjs
- public/js/mapprops.js