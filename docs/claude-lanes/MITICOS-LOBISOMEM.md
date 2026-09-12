# Claude Opus 5 — Míticos: Lobisomem jogável

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/miticos-integracao-priority`, branch
`astra/miticos-integracao-priority`, PR #532. Há alterações e assets preservados de uma execução
interrompida; não os limpe nem os regenere cegamente.

## Objetivo

Finalizar o Lobisomem como primeiro personagem jogável da facção Míticos. Verifique seleção,
retrato transparente, GLB e preload, primeira e terceira pessoa, ciclos de animação, pose,
contato com a arma, HUD, placar e tela de resultado. Cuca, Saci, Lampião, Maria Bonita,
Curupira, Zumbi, Boto e Bandeirante permanecem fora deste PR.

## Estado a retomar

A execução interrompida passou os ciclos completos e encontrou uma regressão: a extração dos
vídeos perdia a transparência dos retratos. A saída foi corretamente rejeitada. Retome o diff,
inspecione as imagens geradas e produza os retratos a partir do modelo com alpha preservado.

## Aceite

- `npm run eval:miticos-lobisomem` passa e o mutante sem Lobisomem falha.
- `npm run eval:redesign`, `npm run eval:faccao` e `npm run check:deploy` passam ou cada falha
  externa é isolada com evidência.
- GLB íntegro, ciclos sem salto, pose e contato defensáveis em folhas 3:2 e 16:9.
- PR #532 atualizado apenas com arquivos desta frente e relatório visual.

Não abra navegador, não faça merge e não publique release.
