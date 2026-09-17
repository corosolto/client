# Lane 01 — recuperação do vm-unificado (executada em 17/09/2026)

Esta lane já foi executada na retomada de 17/09. Registro do que foi feito e do estado
de saída; use este arquivo como ponto de partida da continuação, não reexecute a
recuperação.

## Situação encontrada

Worktree `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-unificado`,
branch `claude/vm-unificado`, PR #584 (draft, base `main`). O remoto estava em
`a82139f4d` (11/09) e o local tinha **607 commits à frente, zero atrás**: toda a sessão
de fechamento de 13–14/09 (integrações M92/SCAR/MP5/SVD/Deagle/revólver, placar cego
das 11 armas, MD97/SKS sem a alavanca da AK, menu Suno v7, 18 rotas de banco saindo do
cliente) existia só em disco local. Árvore limpa, todos os commits com DCO.

## Gates rodados em 17/09 antes do push

| Suíte | Resultado | Notas |
|---|---|---|
| `check:fast` | **132/135** (410 s) | falhas: `eval:mapid`, `eval:redesign`, `audio:check` — os mesmos três já registrados em 13/09 como pré-existentes/ambiente, sem relação com arquivos de viewmodel. NÃO rodar `npm run audio` nesta máquina: o disco local não tem o pack privado e o manifest seria esvaziado. |
| `check:vm` | **3/6** | verdes `eval:vmrecoil`, `eval:melee-vm`, `eval:vm-catalog`; reprovam `eval:vm-serving` (limite de 8 MiB por família contra o store privado local), `eval:vm-identity`, `eval:vm-ads` (timeout de página no arnês). O corpo do PR #584 já documenta esses três falhando em qualquer branch na máquina de origem; dependem do asset privado/browser, não do conteúdo do merge. |
| `eval:vm-cache` | verde | `failures: []` |
| `authored-attach-check --mutantes` | verde | |
| `authored-transition-check` | verde | |
| `eval:vm-autorado-vivo` | verde | 14/14 armas golden montam o viewmodel autorado com mão visível |

## Ação

`git push origin claude/vm-unificado` — fast-forward `a82139f4d..dffa82e6f`, sem force;
607 commits, `main` não foi tocada. O pre-push bloqueou uma vez por refs remotas
desatualizadas (commits da main injetados no intervalo do trailer) e uma vez por
`eval:redesign` dentro de `check:deploy`; como `eval:redesign` reprova na própria
`main` `dffcf1f58` (UIR15 em checkout limpo), o push final usou a saída documentada do
hook (`PREPUSH=0`). Registro completo no comentário do PR #584 de 17/09.

## Continuação

1. O aceite das 5 armas aprovadas pelo crítico (svd, deagle, revolver38, m4, scar)
   continua pendente do dono, em partida real na URL local da lane.
2. O trabalho de conteúdo segue pela lane 02 (shotgun), na ordem do crítico.
3. Se o CI do PR #584 acusar algo além dos itens já documentados aqui, trate antes de
   qualquer merge; #584 continua draft até decisão do dono sobre `ready:true` em
   `ak`/`pistol`.
