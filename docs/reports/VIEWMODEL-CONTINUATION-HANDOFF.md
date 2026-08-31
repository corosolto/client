# Continuação dos viewmodels sem depender do histórico do chat

Estado verificado em 31/08/2026. Este arquivo é o ponto de entrada para continuar o
trabalho sem abrir ou reprocessar sessões antigas do Codex.

## Linha canônica

- A AK golden está aprovada, commitada e publicada na branch
  `vm-cs16-gabarito`: commit `a2396697` (`feat(viewmodel): entrega AK golden no
  runtime`). O contrato e a decisão vivem em `VIEWMODEL_CONTRACT.md` e
  `docs/reports/GOLDEN-AK-DECISION.md` nessa branch.
- A pistola está preservada no commit local `9c39afc2` da mesma branch. O contrato,
  builder e sintaxe passam. Ainda falta aprovação visual do dono; portanto o commit é
  deliberadamente `wip` e não declara uma segunda golden.
- O `package-lock.json` desse worktree permanece modificado fora do checkpoint da
  pistola. Não o descarte nem o misture automaticamente com a entrega visual.

Worktree: `/Users/ruben/csbrasil-worktrees/vm-retarget`.

## Linha heavy

A branch `codex/vm-heavy` está limpa e preserva a investigação em quatro checkpoints:

- `80af6308`: integração isolada dos pilotos AWP/shotgun;
- `a6949dc1`: builders e fonte das mãos do projeto;
- `b0110cad`: reprovação visual explícita da recarga da shotgun;
- `062543b1`: evidência do runtime.

O gate estrutural, a sintaxe e `arch:check` passam. A AWP tem evidência positiva. A
shotgun **não está aprovada**: o cartucho perde contato com a mão/porta de carga e a
captura de ADS não prova o estado sustentado. A evidência negativa deve ser preservada.

Worktree: `/Users/ruben/csbrasil-worktrees/vm-heavy`.

## Ordem de continuação

1. Continuar somente a pistola até a revisão visual e o mesmo contrato da AK passarem.
2. Abrir uma tarefa nova para a AWP, reaproveitando o contrato aprovado da pistola.
3. Abrir outra tarefa para a shotgun e começar pela falha de contato já documentada.
4. Só depois expandir para outra família; não processar o arsenal inteiro em um chat.

No começo e no fim de cada tarefa:

```bash
npm run context:check
git status --short --branch
```

Para a pistola, os gates mínimos estão no worktree `vm-retarget`:

```bash
node tools/eval/pistol-viewmodel-contract.mjs
node tools/eval/pistol-hires-pilot-check.mjs
npm run syntax
```

Para os pesados, no worktree `vm-heavy`:

```bash
node tools/eval/heavy-authored-vm-check.mjs
npm run syntax
npm run arch:check
```

## Regra de payload

Use Graphify para relações de arquitetura e Serena para símbolos/referências. Logs,
renders, contact sheets e relatórios completos ficam em arquivo; a conversa recebe
somente resultado, métrica, hash e caminho. Faça commit de checkpoint antes de trocar
de família ou arquivar uma tarefa.

O rollout antigo de aproximadamente 53 GB não é fonte de verdade e não precisa ser
lido para continuar. Ele permanece intocado até uma decisão separada de arquivamento
ou remoção, depois de confirmar os commits acima.
