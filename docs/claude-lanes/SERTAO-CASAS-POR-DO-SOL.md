# Claude Opus 5 — Sertão: casas e pôr do sol

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/sertao-casas-por-do-sol`, branch
`astra/sertao-praca-casas-por-do-sol`, PR #526. Preserve o trabalho existente.

## Objetivo

Entregar casas selecionadas da praça com entradas navegáveis e janelas úteis como pontos de
conflito, resolver a área inacessível reportada e manter um pôr do sol alaranjado legível no
horizonte. Preserve Canudos, fauna, carroça, vegetação e rotas principais.

## Estado a retomar

A execução interrompida reposicionou fardos que ainda atravessavam as casas e passou os checks
de documentação. O próximo passo era inspecionar capturas finais, confirmar folgas de todos os
objetos movidos e atualizar o PR.

## Aceite

- Portas, pisos e janelas são fisicamente acessíveis pelos dois lados previstos.
- Casas criam conflito sem linha direta injusta entre spawns.
- Obstáculos não intersectam interiores, portas ou rotas.
- `eval:sertao-interiors`, `sertao-spatial --self-test`, mapas, rotas, spawn e mutantes passam.
- PR #526 recebe capturas offline 3:2 e relatório do que ainda exige revisão humana.

Não abra navegador, não faça merge e não publique release.
