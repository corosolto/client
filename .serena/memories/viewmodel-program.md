# Programa de viewmodels

## Objetivo durável

Concluir e validar viewmodels de todas as famílias de armas. A AK golden é o padrão
visual e técnico. Trabalhar em uma família por tarefa limita contexto e risco, mas
nunca reduz o objetivo geral.

## Fonte de verdade

Leia `docs/reports/VIEWMODEL-CONTINUATION-HANDOFF.md` antes de procurar histórico de
chat. O arquivo registra worktrees, branches, commits, aprovações, reprovações, gates
e a próxima ordem de trabalho. Código, commits, testes, renders e esse handoff têm
precedência sobre memória conversacional.

## Continuidade

- AK golden: aprovada e publicada; commit `a2396697` em `vm-cs16-gabarito`.
- Pistola: WIP preservado em `9c39afc2`; falta aprovação visual.
- AWP: evidência positiva na linha `codex/vm-heavy`.
- Shotgun: recarga reprovada por perda de contato; não declarar aprovada.
- Próximo passo: aprovar/corrigir a pistola, depois fechar AWP, corrigir shotgun e
  continuar pelas famílias restantes.

Após cada marco validado, atualize primeiro o handoff e depois este resumo se o estado
durável tiver mudado. Não copie logs, renders, binários ou payloads grandes para a
memória; registre caminho, hash, métrica e decisão.
