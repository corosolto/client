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

Registre também dependências cruzadas com owner/repo completo. `Fixes #123` é vínculo, não prova
de correção nem autorização para fechar a issue antes do merge e da verificação.

## 3. Isole cada lane sem tocar o checkout de ninguém

Antes de criar a lane:

```bash
git status --short --branch
git worktree list
git fetch origin
```

Se já existir worktree limpa para a branch, reutilize-a. Caso contrário, crie uma por PR:

```bash
# Branch local já existente:
git worktree add /tmp/corosolto-pr-NUMERO BRANCH

# Branch que existe apenas no remoto:
git worktree add --track -b BRANCH /tmp/corosolto-pr-NUMERO origin/BRANCH
```

Para PR de fork, use um remote próprio e preserve owner/branch ao empurrar (crie o remote só se
ele ainda não existir):

```bash
git remote add OWNER https://github.com/OWNER/REPO.git
git fetch OWNER BRANCH
git worktree add --track -b BRANCH /tmp/corosolto-pr-NUMERO OWNER/BRANCH
git push OWNER BRANCH
```

Não crie uma branch substituta que desconecte a correção do PR. Se o checkout principal estiver
sujo, deixe-o como está; a worktree nova é a resposta, não `clean`, `reset` ou `stash`.

## 4. Prenda review e threads ao head atual

Capture o SHA antes de ler ou pedir review:

```bash
gh pr view NUMERO -R corosolto/REPO \
  --json headRefOid,headRefName,baseRefName,isDraft,labels,reviews
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
  -f 'reviewers[]=estraga-codigo'
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
git commit -s -m "fix: descreva a correção" -m "Agent: NOME_DO_AGENTE"
git push REMOTO_DO_HEAD BRANCH_ORIGINAL
```

Depois do push, responda às threads tratadas com causa, correção/rebatimento, SHA e evidência.
Resolva apenas as que têm correção publicada ou rebatimento técnico; depois solicite novo review do
`estraga-codigo` no head novo.

## 6. Confira CI e mantenha as duas revisões

Local verde não substitui CI, e CI verde não substitui review:

```bash
gh pr checks NUMERO -R corosolto/REPO
gh run view --log-failed  # somente quando houver run/check vermelho para investigar
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
git fetch origin BASE_CORRETA
git merge --no-ff --no-commit origin/BASE_CORRETA
# Resolva conflitos, se houver, e rode os checks focados antes de commitar.
git commit -s -m "merge: atualiza BASE_CORRETA na lane" -m "Agent: NOME_DO_AGENTE"
git push origin BRANCH_ORIGINAL
```

## 8. Mergeie um a um e revalide o próximo

Só execute merge quando a decisão for **merge agora** e houver autorização exigida pela política.
PR pequeno, reversível e fora das superfícies proibidas pode receber `safe-automerge`; o label não
dispensa nenhum portão.

```bash
HEAD=$(gh pr view NUMERO -R corosolto/REPO --json headRefOid --jq .headRefOid)
gh pr merge NUMERO -R corosolto/REPO --merge --match-head-commit "$HEAD"
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
não bastam.

```bash
gh issue close NUMERO -R corosolto/REPO \
  --comment "Corrigido por #PR (SHA DO MERGE). Verificação na base resultante: COMANDO — RESULTADO."
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
