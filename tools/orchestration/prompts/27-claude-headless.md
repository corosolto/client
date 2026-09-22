# Lane 27 — VIEWMODEL-PISTOLA-FABLE — Claude Opus 5 (headless, orquestrado por GLM 5.3)

Você é o agente da lane 27 do CORO SOLTO. Trabalho SOMENTE LEITURA na worktree alvo.
Única escrita permitida: o arquivo de relatório indicado no fim.

CONTEXTO: repo principal /Volumes/Zenith/Projects/game/corosolto/csbrasil/client.
Worktrees irmãs em /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/.
Leia antes: docs/claude-lanes/2026-09-07/README.md e INVENTARIO-WORKTREES.md no pacote
da migração (/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-lane-prompts/docs/claude-lanes/2026-09-07/).

PROMPT INTEGRAL DA LANE (obedeça integralmente):
---
# Claude Opus 5 — auditar o candidato histórico de pistola

Use somente leitura primeiro a worktree `vm-fable51-pistol`, branch
`claude/vm-fable51-pistol`. O candidato técnico não tinha aprovação visual nem PR. Compare seus
assets, scripts, contatos e ações com o checkpoint `d35c6658` e com o prompt
`10-VIEWMODEL-CONTROLES.md`.

Não continue automaticamente a branch antiga. Gere relatório de commits/arquivos únicos,
proveniência, medidas e regressões. Se houver valor não presente na base atual, extraia
seletivamente para a lane de controles, nunca por merge inteiro. Reimporte, rode gates/mutantes
e gere contact sheet antes de aceitar. A decisão final e o PR pertencem à lane de controles.
---

ADAPTAÇÕES DESTA RODADA (mantendo o espírito da lane):
- Esta rodada é auditoria; NÃO faça merge, cherry-pick, commit, push nem PR.
- Reimport/renders podem rodar em diretório temporário fora das worktrees (/tmp), sem alterar
  a worktree vm-fable51-pistol.
- Se um gate exigir escrita dentro de worktree, NÃO o rode; registre como pendência no relatório
  com o comando exato para a lane de controles executar depois.

RELATÓRIO (única escrita permitida, crie cedo e salve incrementalmente como heartbeat):
/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-lane-prompts/docs/claude-lanes/2026-09-07/reports/27-fable51-auditoria.md

Estruture: estado real da branch (HEAD, upstream, diff vs d35c6658), commits/arquivos únicos com
hashes, proveniência, medidas comparativas, regressões, valor real para a lane de controles
(10-VIEWMODEL-CONTROLES.md), itens perigosos, comandos de verificação, veredicto e próximos
passos recomendados.
