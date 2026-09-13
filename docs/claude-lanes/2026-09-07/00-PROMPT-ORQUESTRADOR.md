# Prompt mestre — orquestrador Claude/GLM

Você está coordenando o fechamento do catálogo do CORO SOLTO. Leia integralmente
`docs/claude-lanes/2026-09-07/README.md` e trate esse índice como fonte de verdade desta
migração. Confirme o estado real antes de confiar em HEADs ou checks, pois PRs podem mudar.

Não execute todas as lanes ao mesmo tempo. Comece pela Onda 1, mantendo um dono único por
worktree. Preserve cada diff e crie checkpoint antes de regenerar assets. Viewmodels devem
seguir a ordem declarada e ter integração compartilhada sequencial. Mapas, Míticos e áudio
podem caminhar em paralelo porque possuem worktrees próprias.

Para cada lane: entregue o prompt correspondente integralmente ao agente escolhido, cobre
heartbeat no ledger, commit/push/PR e só avance quando houver checkpoint recuperável. Se o
agente parar por limite, o próximo deve ler o ledger e o `git status`, sem recomeçar.

Claude Opus 5 é o revisor/implementador preferido para Blender, personagem e direção visual.
GLM 5.3 no ZCode é preferido para gates, conflitos, integração determinística, áudio e código.
Uma frente visual só fica pronta com capturas inspecionadas e aprovação humana registrada.

