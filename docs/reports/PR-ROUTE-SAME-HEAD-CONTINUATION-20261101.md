# PR-ROUTE-SAME-HEAD — continuação R58 (2026-11-01)

## Objetivo

Objetivo integral: consistência visual, integração dos PRs elegíveis e release verificado,
excluindo Operação Flávio. Nesta focal, quando a branch desejada já aponta para o head do PR
(`refs/heads/<desired>` == `headRefOid` do PR), o roteamento não pode disparar
`PATCH repos/.../pulls/N` — a API devolve 422 e o job pinta de vermelho um PR por uma tentativa de retarget inválida, sem demonstrar defeito do produto. Pré-requisito para release verificável: o classify
precisa ser idempotente no estado final, não falhar alto nele.

## Escopo

- **Base exata da lane:** `618fc78b3c8a25bfff1526d8de130957ebbb6f86` · **Branch:** `codex/pr-route-same-head-20261101` ·
  **Worktree inicialmente clean:** `worktrees/pr-route-same-head-20261101` (`worktrees/pr-route-same-head-20261101`).
- **Lease:** dois caminhos só — `.github/workflows/csbrasil-bot-pr-classify.yml` e este
  relatório. `scripts/ci/pr_route.py`, demais scripts, outros worktrees: intocados.
- **Procedência:** implementação por edição manual do patch proposto
  (`PR-ROUTE-SAME-HEAD-R58-GLM-PROMPT.md`), sem `git apply`. Executor: GLM (este agente).
- Flávio excluído desta rodada; nenhum crítico externo, browser, Node, render, npm, deps,
  mutação de git, commit ou push.

## Root e baseline

- Root: log R56 — retarget PATCH no mesmo head gera HTTP 422 no hosted.
- Baseline controlada aceita **BEFORE 5/13** (RED):
  `PR-ROUTE-SAME-HEAD-R58-BEFORE-RESULT.json` — casos `same-sha` e
  `same-sha-repeat-assigned` falham com `CalledProcessError` no PATCH (422 mockado);
  zero chamadas externas, todos os subprocessos mockados.
- Nota de honestidade: a primeira execução do driver local com caminho de saída ainda sem
  scaffolding falhou por montagem do arnês **antes** do baseline aceito; não foi um RED de
  produto e não é contada como tal. O 5/13 aceito é o do JSON citado acima.
- Driver congelado (SHA-256):
  `d76c1371176f77544c620cc5849cb84c610a8e575cf46c1847eaa2ea6abd9445`
  (`PR-ROUTE-SAME-HEAD-R58-GLM-FROZEN-DRIVER.py`, cópia preservada da versão usada pelo GLM): nega comandos não mockados, mapeia só `/tmp` em A,
  cria cópia sparse de `scripts/ci` sob A e prova import de namespace sob o cwd da raiz
  sem `__init__.py`.

## Mudança (fonte)

Em `.github/workflows/csbrasil-bot-pr-classify.yml`, bloco "Route PR and set assignee":

1. `gh pr view` passa a incluir `headRefOid` no primeiro fetch.
2. `git ls-remote --exit-code --heads origin refs/heads/<desired>` com stdout capturado;
   exige exatamente um par `<40-hex> refs/heads/<desired>` e `headRefOid` canônico
   (40 hex minúsculos) — senão `RuntimeError` (fail-closed na validação de forma).
3. SHA igual (`if remote[0] == head_oid:`): sem PATCH; grava `retarget_to=None`,
   `effective_base=baseRefName` real, `target_label` via helper **não alterado**
   `target_label()` importado de `scripts.ci.pr_route`, `retarget_reason='desired-base-same-head'`
   + evidência (desired_ref/desired_oid/head_oid) em `/tmp/pr-route.json` e log.
4. SHA diferente: PATCH normal com `{'base': desired}` (comportamento preservado).
5. Fallback legado preservado: qualquer `ls-remote` com retorno não-zero continua
   `retarget_to=None` — **não** virou fail-closed para erro remoto.
6. Refresh/classify/estraga/labels/comentário/assignee: inalterados.

Sem framework, sem API nova, sem verificação de ancestralidade, sem override de
setting/label padrão, sem ignore amplo de 422 (o caso `other-422-remains-error` segue
sendo erro).

## Prova (dois comandos focais permitidos, pós-implementação)

1. Nominal:
   `python3 .../PR-ROUTE-SAME-HEAD-R58-FOCAL.py --workflow .../csbrasil-bot-pr-classify.yml --worktree ... --phase GLM-AFTER --out .../PR-ROUTE-SAME-HEAD-R58-GLM-AFTER-RESULT.json`
   → **exit 0, 13/13 ok**, import de namespace confirmado
   (`PR-ROUTE-SAME-HEAD-R58-SPARSE`, `pr_route.py` SHA `26ce4c48…5794b`, sem `__init__`).
2. Mutante (remove a guarda de igualdade):
   `... --phase GLM-AFTER --mutant --out .../PR-ROUTE-SAME-HEAD-R58-GLM-MUTANT-RESULT.json`
   → **exit 1, 11/13** — os casos same-sha falham sem a guarda. Prova causal, não falha
   de autoria.

Ambos os JSONs preservados; driver e casos esperados não editados.

## Limites

- CI Python controlado apenas: sem hosted workflow, GitHub real, API real, git remoto,
  browser ou produto. Nenhum fix/release no ambiente hospedado foi executado ou é
  reivindicado.
- Fallback legado de `ls-remote` não-zero mantido deliberadamente; corridas
  (head avança entre fetch e ls-remote) e ancestralidade ficam fora do escopo —
  validação é por igualdade exata de OID, não por história.
- Não existem figuras do produto nesta frente (mudança de workflow de CI, invisível ao
  jogador); a régua aqui é o par BEFORE/AFTER do driver focal.

## Freeze, revisão nativa e recibos finais

OMP zai/glm-5.3 low completou uma chamada EXIT0 em78,618s, sob watchdog360s desde Popen; sem renovação. Raw916.344B, SHA256 `025e56c799d1258b275c666baf143c6b6712989ea2c9b37d1d6d6c0a69b85bbd`. Antes de qualquer correção nativa foram preservados raw, dois arquivos/diff, driverGLM e os resultados/recibos de todos os casos em `PR-ROUTE-SAME-HEAD-R58-GLM-AUTHORED-FREEZE.json`/`GLM-FOCAL-FREEZE.json`. Uma tentativa de comando diferente foi vetada pelo guard, sem execução; os dois comandos permitidos realmente rodaram.

O workflow GLM é byte-exato ao patch mínimo R57 revisado pelo Root. **Nenhuma correção nativa do workflow**. O supervisor corrigiu somente escopo/base/alegação de elegibilidade neste ledger e acrescentou proveniência. O driver externo nativo ganhou fidelidade de stdout (só disponível com capture_output) e allowlist de imports; versãoGLM anterior ficou congelada. Casos e expected permaneceram os mesmos. Nova execução nativa: BEFORE5/13 exit1, AFTER13/13 exit0, mutante11/13 exit1, falhando apenas same-sha e repetição. Resultados `PR-ROUTE-SAME-HEAD-R58-NATIVE-{BEFORE,AFTER,MUTANT}-RESULT.json`.

No SAME SHA:0PATCH,1assignee quando ausente; rerun com assignee presente:0POST. Route preserva main/targetmain e grava as duasSHAs; refresh e os scripts CI reais `pr_classify.py`/`estragacodigo_gate.py` rodam com fixtures e mantêm needs-staging/needs-human-gameplay/needs-estragacodigo-resolution. SHA diferente mantém1PATCH. Import real `scripts.ci.pr_route` foi resolvido sob cwdraiz de uma cópia sparse somente scripts/ci, sem __init__, sourceSHA26ce4c48d6c223a9f981d51a51cd13f36b43e633115554029b676c598265794b. O script original da WT permaneceu intacto.

Isso é prova focal local de CI, não execução completa do job hospedado: refresh é simulado a partir dos campos do comando real, helpers de classificação/review são executados de fontes reais; aplicação remota de labels/comentário não ocorreu. Não houve chamada GitHub/gitremote real, produto, Node, browser, render, build/deps, commit ou push. Retorno128 de ls-remote continua fallback legado e não prova erro remoto fail-closed.

Próximo dono: Root e crítico independente de outro contexto. Root decide integração/checkpoint/push e execução pelo ref confiável do workflow. Hostedclassify, staging e release seguem pendentes; nenhuma base ou configuração global mudou nesta lease. A missão integral não está concluída.
