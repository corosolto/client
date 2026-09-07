# Claude Opus 5 — Amazônia 8x8, escadas e rio

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/amazonia-8x8-perf-stairs`, branch
`astra/amazonia-8x8-perf-stairs`, PR #527. Preserve o diff e os artefatos de avaliação atuais;
separe arquivos gerados reproduzíveis de mudanças que pertencem ao PR.

## Objetivo

Reduzir travadas no single-player 8x8, manter as escadas das palafitas próximas ao respawn
viradas para o respawn e liberar visão útil para o rio. Preserve densidade de mata, fauna,
rotas, materiais e identidade amazônica.

## Estado a retomar

Já existe otimização da fila de busca e réguas específicas. A execução interrompida estava
instalando dependências declaradas para repetir gates. Não confunda redução de CPU do pathfinding
com FPS de GPU. Inspecione `tools/eval/amazonia-8x8-perf-check.mjs`,
`amazonia-8x8-sim-check.mjs`, `amazonia-spawn-stairs-check.mjs` e
`amazonia-raycast-check.mjs`.

## Aceite

- Cenário 8x8 determinístico mede frame budget, buscas, bots, objetos e memória antes/depois.
- `npm run eval:amazonia` e as réguas citadas passam; cada nova invariante possui mutante.
- Escada termina em acesso navegável do spawn e janela mantém linha para o rio.
- PR #527 inclui relatório de desempenho sem prometer FPS não medido.

Não abra navegador, não reduza conteúdo para mascarar custo, não faça merge ou release.
