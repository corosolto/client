---
name: fila-prs-issues
description: Opera a fila de PRs e issues do CORO SOLTO no client e no backend, do inventário à decisão de merge, com uma worktree por lane, revisão no head atual, CI verde e fechamento de issue só depois da correção verificada. Use SEMPRE que pedirem para limpar, zerar, destravar, revisar ou mergear a fila de PRs/issues, vários PRs de uma vez ou issues cobertas por esses PRs. Para um PR isolado, use `estragacodigo-loop`.
---

# Fila de PRs e issues

O objetivo não é despachar comentários nem acumular aprovações: é deixar cada item com uma
decisão executável e evidência no **head atual**. Esta skill coordena a fila; os detalhes dos
portões e das investigações continuam nas fontes da casa:

- `estragacodigo-loop`: review real, threads, correção/rebatimento e novo review por SHA;
- `bug-hunt`: reprodução, régua e mutante antes de corrigir defeito;
- `revisao-antes-do-push`: crítica adversarial em contexto limpo;
- `docs/quality-gates.md`: checks, labels, superfícies humanas e política de merge.

Não copie essas réguas para o resumo da rodada nem crie um fluxo paralelo para um item isolado.

## Regras inegociáveis

- Uma worktree e uma lane por PR; nunca misture achados de PRs diferentes.
- Não toque, limpe ou use `git stash` num checkout sujo para abrir espaço.
- Push normal somente na branch original do PR. Nunca push direto em `main` ou `staging`.
- Nunca `--force`, `--force-with-lease`, `--no-verify` ou `PREPUSH=0`.
- Todo commit usa `git commit -s` e trailer `Agent: <nome>`; o pre-push é obrigatório.
- Sem bypass administrativo, merge com check pendente/vermelho ou review de outro SHA.
- Merge de backend **não é deploy**. Merge em `staging` **não é produção**.

## 1. Inventarie client e backend antes de agir

Use os dois repositórios, inclusive quando o pedido mencionar só um:

```bash
gh pr list -R corosolto/client --state open --limit 200 \
  --json number,title,url,isDraft,headRefName,headRefOid,baseRefName,labels,body,updatedAt
gh pr list -R corosolto/backend --state open --limit 200 \
  --json number,title,url,isDraft,headRefName,headRefOid,baseRefName,labels,body,updatedAt
gh issue list -R corosolto/client --state open --limit 200 \
  --json number,title,url,labels,body,updatedAt
gh issue list -R corosolto/backend --state open --limit 200 \
  --json number,title,url,labels,body,updatedAt
```

Se qualquer consulta devolver exatamente o limite, trate o resultado como possível truncamento:
repita com limite maior ou pagine pela API até esgotar a fila. O limite de transporte nunca é
prova de inventário completo.

Monte uma tabela com repositório, número, URL, `headRefOid`, base, labels, lane, dependências,
issues relacionadas e decisão. Leia corpo e comentários quando houver menção a substituição ou
consolidação; idade ou título parecido não prova substituição.

Exclua da fila de merge:

- drafts;
- PR substituído ou branch já consolidada em outro PR, com o PR sucessor identificado;
- item cuja correção já entrou na base, apontando o commit/PR que prova isso.

Não feche nem retarget por palpite. Item excluído permanece no inventário com o motivo e a
evidência, para não voltar na próxima varredura.

## 2. Mapeie dependências e o destino das issues

Leia `Depends on`, `Blocked by`, `Fixes`, `Closes` e referências equivalentes no corpo e nos
comentários. Confirme no código se a dependência é real; uma menção textual não substitui o
contrato consumido.

Ordene assim:

1. PR de base antes de PR empilhado;
2. backend antes do client que consome seu contrato;
3. independentes em paralelo apenas nas lanes locais — nunca nos merges;
4. issues junto do PR que contém a correção, não numa lane órfã de fechamento.

Registre cada issue como `OWNER/REPO#NUMERO`, inclusive vínculos cruzados. `Fixes #123` é vínculo,
não prova de correção nem autorização para fechar a issue antes do merge e da verificação. Trocar
apenas o corpo do PR por `Refs` não basta: mensagens dos commits também fecham issues quando
chegam à branch padrão, inclusive por uma branch de integração. A lane precisa recusar esse
histórico antes do primeiro merge.

Antes de montar a lane, capture o head que será conferido e configure remotes separados para a base
e para o head. O remote da base precisa apontar explicitamente para o repositório do PR:

```bash
REVIEWED_HEAD=$(gh pr view NUMERO -R corosolto/REPO --json headRefOid --jq .headRefOid) \
  || { echo "não foi possível ler o head do PR" >&2; exit 1; }
BASE_BRANCH=$(gh pr view NUMERO -R corosolto/REPO --json baseRefName --jq .baseRefName) \
  || { echo "não foi possível ler a base do PR" >&2; exit 1; }
PR_BODY=$(gh pr view NUMERO -R corosolto/REPO --json body --jq .body) \
  || { echo "não foi possível ler o corpo do PR" >&2; exit 1; }
DEFAULT_BRANCH=$(gh repo view corosolto/REPO --json defaultBranchRef --jq .defaultBranchRef.name) \
  || { echo "não foi possível ler a branch padrão" >&2; exit 1; }
EXPECTED_BASE_URL=https://github.com/corosolto/REPO.git
BASE_REMOTE=corosolto-base
if git remote get-url "$BASE_REMOTE" >/dev/null 2>&1; then
  test "$(git remote get-url "$BASE_REMOTE")" = "$EXPECTED_BASE_URL" \
    || { echo "remote da base aponta para outro repositório" >&2; exit 1; }
else
  git remote add "$BASE_REMOTE" "$EXPECTED_BASE_URL" \
    || { echo "não foi possível adicionar o remote da base" >&2; exit 1; }
fi
HEAD_REMOTE="$BASE_REMOTE"
```

Para PR de fork, selecione o remote do head **antes** de criar a worktree. Preserve owner/branch e,
se o remote já existir, confirme primeiro que sua URL é exatamente a do fork:

```bash
EXPECTED_HEAD_URL=https://github.com/OWNER/REPO.git
if git remote get-url OWNER >/dev/null 2>&1; then
  test "$(git remote get-url OWNER)" = "$EXPECTED_HEAD_URL" \
    || { echo "remote OWNER aponta para outro repositório" >&2; exit 1; }
else
  git remote add OWNER "$EXPECTED_HEAD_URL" \
    || { echo "não foi possível adicionar o remote do fork" >&2; exit 1; }
fi
HEAD_REMOTE=OWNER
```

## 3. Isole cada lane sem tocar o checkout de ninguém

Antes de criar a lane:

```bash
git status --short --branch
git worktree list
git fetch "$BASE_REMOTE" \
  || { echo "não foi possível atualizar a base" >&2; exit 1; }
REVIEWED_BASE=$(git rev-parse "$BASE_REMOTE/$BASE_BRANCH") \
  || { echo "não foi possível capturar o SHA da base revisada" >&2; exit 1; }
git fetch "$HEAD_REMOTE" BRANCH \
  || { echo "não foi possível atualizar o head" >&2; exit 1; }
if ! PR_MESSAGES=$(git log --format='%H %s%n%b' "$BASE_REMOTE/$BASE_BRANCH..$REVIEWED_HEAD"); then
  echo "não foi possível ler o histórico do PR" >&2
  exit 1
fi
CLOSING_RE='(^|[^[:alnum:]_])(close[sd]?|fix(e[sd])?|resolve[sd]?):?[[:space:]]+(([^[:space:]]+/[^[:space:]]*)?#[0-9]+|https://github\.com/[^/]+/[^/]+/issues/[0-9]+)'
if [ "$BASE_BRANCH" = "$DEFAULT_BRANCH" ] && grep -Eiq "$CLOSING_RE" <<<"$PR_BODY"; then
  echo "corpo do PR fecha issue automaticamente; troque o vínculo por Refs" >&2
  exit 1
fi
if grep -Eiq "$CLOSING_RE" <<<"$PR_MESSAGES"; then
  echo "commit fecha issue automaticamente; neutralize o histórico antes do merge" >&2
  exit 1
fi
```

Se já existir worktree limpa para a branch, reutilize-a somente quando seu `HEAD` for o
`REVIEWED_HEAD` capturado. Caso contrário, crie uma por PR, com o repositório no namespace:

```bash
# Branch local já existente:
git worktree add /tmp/corosolto-REPO-pr-NUMERO BRANCH \
  || { echo "não foi possível criar a worktree da branch local" >&2; exit 1; }

# Branch que existe apenas no remoto:
git worktree add --track -b BRANCH /tmp/corosolto-REPO-pr-NUMERO "$HEAD_REMOTE"/BRANCH \
  || { echo "não foi possível criar a worktree da branch remota" >&2; exit 1; }

test "$(git -C /tmp/corosolto-REPO-pr-NUMERO rev-parse HEAD)" = "$REVIEWED_HEAD" \
  || { echo "worktree não aponta para o head revisado" >&2; exit 1; }
```

Para PR de fork, o `HEAD_REMOTE` já foi selecionado antes da worktree. Depois da correção,
empurre para o mesmo owner/branch:

```bash
git push "$HEAD_REMOTE" BRANCH \
  || { echo "não foi possível publicar a branch no fork" >&2; exit 1; }
```

Não crie uma branch substituta que desconecte a correção do PR. Se o checkout principal estiver
sujo, deixe-o como está; a worktree nova é a resposta, não `clean`, `reset` ou `stash`.

## 4. Prenda review e threads ao head atual

Confirme os metadados sem substituir o SHA preservado:

```bash
gh pr view NUMERO -R corosolto/REPO \
  --json headRefOid,headRefName,baseRefName,isDraft,labels,reviews \
  || { echo "não foi possível confirmar os metadados do PR" >&2; exit 1; }
test "$(gh pr view NUMERO -R corosolto/REPO --json headRefOid --jq .headRefOid)" = "$REVIEWED_HEAD" \
  || { echo "head mudou depois da captura" >&2; exit 1; }
```

Siga `estragacodigo-loop` para ler separadamente reviews, review comments e threads GraphQL com
`isResolved`/`isOutdated`. Associe cada review ao `commit.oid` e só o aceite como atual quando for
o `headRefOid` lido agora. Leia também o `state`: `CHANGES_REQUESTED` bloqueia; `COMMENTED` não é
aprovação e só deixa de bloquear depois que cada achado válido foi corrigido ou rebatido;
`APPROVED` precisa apontar para o mesmo SHA. Thread antiga não autoriza merge; thread marcada como
outdated só pode ser descartada depois de conferir que o código atual eliminou o problema.

Solicite review real no head que será avaliado:

```bash
gh api -X POST repos/corosolto/REPO/pulls/NUMERO/requested_reviewers \
  -f 'reviewers[]=estraga-codigo' \
  || { echo "não foi possível solicitar a revisão adversarial" >&2; exit 1; }
```

Depois de qualquer push ou retarget, leia o novo SHA e repita. Não transfira aprovação, resolução
ou placar de CI do SHA anterior.

## 5. Corrija ou rebata com evidência

Para cada thread atual, reproduza a entrada citada e leia o código inteiro ao redor:

- **achado válido:** siga `bug-hunt`, corrija a causa e todos os callsites afetados;
- **falso positivo/risco já coberto:** responda no thread com arquivo, símbolo, comportamento e
  comando/resultado que provam o rebatimento;
- **mudança de produto ou superfície humana:** não altere para agradar o bot; encaminhe ao dono;
- **thread obsoleta:** mostre no head atual por que ela não se aplica mais.

Rode o check focado que reproduz o achado e os checks exigidos pela superfície em
`docs/quality-gates.md`. Antes do push, execute também `revisao-antes-do-push` em contexto limpo e
o pre-push. Não alargue o escopo para aproveitar a lane.

```bash
git commit -s -m "fix: descreva a correção" -m "Agent: NOME_DO_AGENTE" \
  || { echo "não foi possível criar o commit de correção" >&2; exit 1; }
git push "$HEAD_REMOTE" BRANCH_ORIGINAL \
  || { echo "não foi possível publicar a correção" >&2; exit 1; }
PUSHED_HEAD=$(gh pr view NUMERO -R corosolto/REPO --json headRefOid --jq .headRefOid) \
  || { echo "não foi possível confirmar o head publicado" >&2; exit 1; }
test "$PUSHED_HEAD" = "$(git rev-parse HEAD)" \
  || { echo "o PR não aponta para a correção publicada" >&2; exit 1; }
REVIEWED_HEAD="$PUSHED_HEAD"
```

Depois do push, responda às threads tratadas com causa, correção/rebatimento, SHA e evidência.
Resolva apenas as que têm correção publicada ou rebatimento técnico; depois solicite novo review do
`estraga-codigo` no head novo.

## 6. Confira CI e mantenha as duas revisões

Local verde não substitui CI, e CI verde não substitui review:

```bash
gh pr checks NUMERO -R corosolto/REPO \
  || { echo "checks ausentes, pendentes ou vermelhos" >&2; exit 1; }
# Somente para investigar check vermelho; obtenha RUN_ID do link desse check:
gh run view RUN_ID -R corosolto/REPO --log-failed
```

Reproduza localmente a régua que falhou, corrija na origem e repita o ciclo. A revisão adversarial é
a `revisao-antes-do-push` feita em contexto limpo sobre o diff atual, antes de cada push; o review
atual é o do `estraga-codigo` no SHA publicado. Um não substitui o outro. Antes de decidir, exija
simultaneamente: checks atuais verdes, essas duas revisões concluídas, zero thread válida pendente
e labels compatíveis com `docs/quality-gates.md`.

## 7. Declare uma decisão por PR

| Decisão | Condição |
| --- | --- |
| **merge agora** | dependências integradas, head atual verde e revisado, política permite |
| **corrigir** | check vermelho, achado válido ou verificação insuficiente |
| **retarget** | base errada, PR empilhado cuja base mudou ou branch precisa seguir a integração |
| **humano** | gameplay/render/HUD/mapa/personagem/backend ou outra superfície que a política reserva |
| **fechar/substituir** | sucessor ou consolidação comprovada; registre o destino antes de fechar |

Para retarget, use `gh pr edit NUMERO -R corosolto/REPO --base BASE_CORRETA` e trate o resultado
como head/contexto novo: checks, dependências e review precisam ser revalidados. Em branch já
publicada, atualize a base com merge normal e o mesmo sign-off/trailer, nunca rebase seguido de
force-push:

```bash
git fetch "$BASE_REMOTE" BASE_CORRETA \
  || { echo "não foi possível atualizar a nova base" >&2; exit 1; }
if ! git merge --no-ff --no-commit "$BASE_REMOTE"/BASE_CORRETA; then
  CONFLICTS=$(git diff --name-only --diff-filter=U) \
    || { echo "não foi possível inspecionar o merge" >&2; exit 1; }
  [ -n "$CONFLICTS" ] \
    || { echo "merge da nova base falhou sem conflitos resolvíveis" >&2; exit 1; }
fi
# Resolva conflitos, se houver, e rode os checks focados antes de continuar.
UNRESOLVED=$(git diff --name-only --diff-filter=U) \
  || { echo "não foi possível conferir conflitos" >&2; exit 1; }
[ -z "$UNRESOLVED" ] || { echo "ainda há conflitos não resolvidos" >&2; exit 1; }
git commit -s -m "merge: atualiza BASE_CORRETA na lane" -m "Agent: NOME_DO_AGENTE" \
  || { echo "não foi possível criar o merge da base" >&2; exit 1; }
git push "$HEAD_REMOTE" BRANCH_ORIGINAL \
  || { echo "não foi possível publicar a lane retargeted" >&2; exit 1; }
PUSHED_HEAD=$(gh pr view NUMERO -R corosolto/REPO --json headRefOid --jq .headRefOid) \
  || { echo "não foi possível confirmar o head retargeted" >&2; exit 1; }
test "$PUSHED_HEAD" = "$(git rev-parse HEAD)" \
  || { echo "o PR não aponta para o merge de base publicado" >&2; exit 1; }
```

## 8. Mergeie um a um e revalide o próximo

Só execute merge quando a decisão for **merge agora** e houver autorização exigida pela política.
PR pequeno, reversível e fora das superfícies proibidas pode receber `safe-automerge`; o label não
dispensa nenhum portão.

```bash
CURRENT_HEAD=$(gh pr view NUMERO -R corosolto/REPO --json headRefOid --jq .headRefOid) \
  || { echo "não foi possível reler o head antes do merge" >&2; exit 1; }
CURRENT_BODY=$(gh pr view NUMERO -R corosolto/REPO --json body --jq .body) \
  || { echo "não foi possível reler o corpo antes do merge" >&2; exit 1; }
CURRENT_BASE=$(gh pr view NUMERO -R corosolto/REPO --json baseRefName --jq .baseRefName) \
  || { echo "não foi possível reler a base antes do merge" >&2; exit 1; }
CURRENT_DEFAULT=$(gh repo view corosolto/REPO --json defaultBranchRef --jq .defaultBranchRef.name) \
  || { echo "não foi possível reler a branch padrão antes do merge" >&2; exit 1; }
test "$CURRENT_HEAD" = "$REVIEWED_HEAD" \
  || { echo "head atual difere do SHA revisado" >&2; exit 1; }
test "$CURRENT_BASE" = "$BASE_BRANCH" \
  || { echo "branch base mudou depois da revisão" >&2; exit 1; }
git fetch "$BASE_REMOTE" "$CURRENT_BASE" \
  || { echo "não foi possível atualizar a base antes do merge" >&2; exit 1; }
CURRENT_BASE_HEAD=$(git rev-parse "$BASE_REMOTE/$CURRENT_BASE") \
  || { echo "não foi possível reler o SHA da base antes do merge" >&2; exit 1; }
test "$CURRENT_BASE_HEAD" = "$REVIEWED_BASE" \
  || { echo "base avançou depois da revisão; revalide a lane" >&2; exit 1; }
CLOSING_RE='(^|[^[:alnum:]_])(close[sd]?|fix(e[sd])?|resolve[sd]?):?[[:space:]]+(([^[:space:]]+/[^[:space:]]*)?#[0-9]+|https://github\.com/[^/]+/[^/]+/issues/[0-9]+)'
if [ "$CURRENT_BASE" = "$CURRENT_DEFAULT" ] && grep -Eiq "$CLOSING_RE" <<<"$CURRENT_BODY"; then
  echo "corpo atual do PR fecha issue automaticamente; merge recusado" >&2
  exit 1
fi
gh pr checks NUMERO -R corosolto/REPO \
  || { echo "checks finais ausentes, pendentes ou vermelhos" >&2; exit 1; }
gh pr merge NUMERO -R corosolto/REPO --merge --match-head-commit "$REVIEWED_HEAD" \
  || { echo "merge recusado ou não confirmado" >&2; exit 1; }
```

Depois de **cada** merge:

1. registre PR e SHA de merge e faça fetch da base;
2. reabra o mapa de dependências e o próximo PR;
3. integre/retarget a base nova quando necessário;
4. revalide head, checks, threads e review antes do próximo merge.

Não mergeie lote em paralelo nem reutilize o placar obtido antes do merge anterior.

## 9. Feche issue só com correção verificada

Uma issue só pode ser fechada quando o PR que a corrige já foi integrado e a verificação focada
passou na base resultante, com evidência reproduzível. Review verde, PR aberto ou texto `Closes`
não bastam. Use o owner e o repositório registrados para a issue, nunca o repositório do PR por
inferência. Antes do comando, leia os labels e `docs/quality-gates.md`: `crash-auto` e qualquer
outra classe reservada ao humano viram decisão **humano**, mesmo depois da verificação.

```bash
if ! ISSUE_LABELS=$(gh issue view NUMERO_ISSUE -R OWNER_ISSUE/REPO_ISSUE \
  --json labels --jq '.labels[].name'); then
  echo "não foi possível confirmar os labels da issue" >&2
  exit 1
fi
if printf '%s\n' "$ISSUE_LABELS" | grep -Fxq crash-auto; then
  echo "decisão humano: crash-auto não pode ser fechado pela fila" >&2
  exit 2
fi
gh issue close NUMERO_ISSUE -R OWNER_ISSUE/REPO_ISSUE \
  --comment "Corrigido por OWNER_PR/REPO_PR#PR (SHA DO MERGE). Verificação na base resultante: COMANDO — RESULTADO." \
  || { echo "não foi possível fechar a issue verificada" >&2; exit 1; }
```

Se a verificação falhar, reabra a lane de correção e deixe a issue aberta. Se depender de decisão
humana, deploy ou validação externa, registre o bloqueio sem declarar resolved.

## 10. Respeite os limites de integração e publicação

- Merge no backend muda o repositório, não o serviço no ar; deploy e migrations ficam fora da fila
  automática e seguem autorização do dono.
- Merge em `staging` serve para integração/validação; não promova a `main` nem trate staging como
  produção.
- Client que depende de contrato novo não avança só porque o backend foi mergeado: a disponibilidade
  real do serviço é uma dependência separada e deve estar verificada ou atribuída ao dono.

## Saída da rodada

Entregue um resumo por repositório com: PR/SHA, decisão, checks e review do head, threads tratadas,
merges efetuados um a um, issues fechadas com sua verificação e bloqueios humanos. Liste também os
excluídos e o motivo. Não diga “fila limpa” enquanto houver item sem decisão ou evidência.
