# Claude Opus 5 — combate: headshot, abates e faca

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-combat-feedback`, branch
`claude/combat-feedback-hud-bots`. Preserve o estado atual antes de qualquer edição.

## Objetivo

1. Remover o deslocamento/efeito de câmera causado por headshot, preservando feedback de dano.
2. Entregar contador de abates inspirado na leitura rápida do Valorant, com identidade visual
   original do CSBrasil e sem copiar arte protegida.
3. Fazer bots reconhecerem rounds de faca e usarem a faca, perseguirem alvos e cumprirem o
   objetivo da rodada sem alternância indevida para arma de fogo.

Penetração de AWP está no PR #535 e não pertence a esta lane.

## Estado a retomar

Existem os validadores `tools/eval/replaycam-check.mjs`, `abateshud-check.mjs` e
`botfaca-check.mjs`. Inspecione o Git e o PR remoto antes de assumir que ainda estão
incompletos. A execução anterior foi interrompida depois de chegar ao limite de turnos.

## Aceite

- Cada correção possui reprodução anterior, teste positivo e mutante que restaura o defeito.
- Nenhuma mudança afeta dano, netcode, penetração, mapas, viewmodels ou áudio.
- Sintaxe, testes específicos, `eval:netcode`, arquitetura e documentação passam.
- Commit e PR limpos contra `main`, com relatório curto em `docs/reports/`.

Não abra navegador, não faça merge e não publique release.
