# TP fixtures × `_updatePlayerTPCamera`

## Contexto

A correção de morte (alpha131) extraiu `_updatePlayerTPCamera(dt, eye, anchor)` de
`_updatePlayerTP` (`public/js/game.js`). `_updatePlayerTP` vivo agora chama
`this._updatePlayerTPCamera(dt, eye)` no fim — e o caminho de morte reutiliza o mesmo helper
com `anchor` (game.js:6738, 6927).

Os gates TP (`tools/eval/tp-local-shot-check.mjs`, `tools/eval/tp-local-backpedal-check.mjs`)
invocam `Game.prototype._updatePlayerTP.call(fixture, ...)` sobre objetos planos que não
herdam o prototype — com o merge da alpha131, `this._updatePlayerTPCamera` virou
`undefined` e ambos quebraram com `TypeError` (log
`audits/2026-10-31-visual-consistency/qa-alpha131-tplocalshot-R1.log`).

## Contrato do fixture (R1, 2026-10-31)

1. O fixture usa **sempre o helper REAL** `Game.prototype._updatePlayerTPCamera` — nunca
   noop, nunca fórmula clonada. Quem valida câmera/enquadramento é o produto, não a fixture.
2. Estado real mínimo que o helper exige e a fixture já tinha (ou inicializa lazy dentro do
   próprio helper): `_tpEul/_tpFwd/_tpRight/_tpOrbitPitch/_tpOrbitYaw`, `_eyeWorld`,
   `camera`, `camView`, `player.{pitch,yaw,scoped}`, `world.groundHeightAt`. O caminho de
   oclusão (`world.occluders`/`camBlockers`, `this.ray`, `tp.selfMeshes`) não é exercido —
   fixture plana sem occluders deixa esses ramos inertes por optional chaining / boom limpo.
3. O par autoridade/câmera/aim/root continua medido em pares (tested × controle), agora com
   a câmera produzida pelo helper real dos dois lados.
4. No backpedal, o 6º argumento `lateral` do `tp.ctrl.update(...)` é preservado tanto na
   referência de controle (`legacy` = produto com `back→false`, lateral intacta) quanto nos
   mutantes `no-back`/`wrong-sign` — patch aplica exatamente uma vez (`replaceOnce`).

## Mutação que prova a régua (rodada em 2026-10-31)

- Remover a wiring `_updatePlayerTPCamera: Game.prototype._updatePlayerTPCamera` do fixture
  reproduz exatamente o TypeError do R1 log (gate vermelho).
- `--mutante=no-back` → vermelho (`run !== walk` nos casos backward); `--mutante=wrong-sign`
  → vermelho (todas as 36 linhas); `--mutante=player` → vermelho.
