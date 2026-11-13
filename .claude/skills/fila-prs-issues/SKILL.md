---
name: fila-prs-issues
description: Use quando o dono pedir para limpar, revisar, destravar ou mergear a fila de PRs e issues do Coro Solto; abrir worktrees por lane; resolver estraga-codigo e CI; triar issues já corrigidas; ou conduzir merges em lote sem perder dependências, reviews atuais e evidências de deploy.
---

# Fila de PRs e issues

Esta skill **orquestra** o trabalho. O detalhe de cada portão fica em
`.claude/skills/estragacodigo-loop/SKILL.md`, `.claude/skills/bug-hunt/SKILL.md`,
`.claude/skills/revisao-antes-do-push/SKILL.md` e `docs/quality-gates.md`; leia-os antes de
agir. Não crie um fluxo paralelo nem troque evidência por uma troca de label.

## 1. Inventário único

Liste `client` e `backend` no mesmo começo. Para cada PR registre repositório, número,
`headRefName`, `headRefOid`, base, draft, mergeabilidade, labels, checks, threads e issues
fechadas. Para cada issue registre assinatura, duplicatas, PRs relacionados e se a correção
precisa chegar a `staging`, `main` ou produção.

```bash
gh pr list -R corosolto/client --state open --limit 100 \
  --json number,title,headRefName,headRefOid,baseRefName,isDraft,mergeable,mergeStateStatus,labels,statusCheckRollup
gh issue list -R corosolto/client --state open --limit 100 \
  --json number,title,labels,updatedAt,url
```

Exclua da fila de merge drafts e PRs cujo head já é ancestral da base (`git merge-base
--is-ancestor HEAD origin/BASE`) ou cujo conteúdo foi substituído por outro PR identificado.
Não exclua uma issue só porque existe PR aberto: ela precisa de vínculo e da correção
verificada no ambiente exigido.

## 2. Dependências antes de lanes

Ordene: base de PR empilhado antes do dependente; backend antes do client que consome o
contrato; mudanças de CI compartilhadas antes das lanes que as reutilizam. Marque arquivos
sobrepostos e dê cada arquivo uma única lane por vez.

Decisões possíveis por PR: **merge agora**, **corrigir**, **integrar/retarget**, **fechar
substituído** ou **humano/staging**. `staging` não é produção; merge de backend não é deploy.

## 3. Uma worktree por lane

Nunca edite o checkout principal se ele estiver sujo. Crie uma worktree por PR/issue, com
branch local própria, mas envie o commit para a branch original do PR quando for atualizá-lo.
Para uma issue nova, use branch remota própria e abra PR contra a base vigente.

```bash
git fetch origin --prune
git worktree add -b agent/pr-NUMERO ../worktrees/pr-NUMERO origin/BRANCH-DO-PR
cd ../worktrees/pr-NUMERO
# depois do conserto, ainda dentro da lane:
git push origin HEAD:BRANCH-DO-PR
```

Se a worktree já existir, entre nela e reutilize a lane depois de conferir `git status`; não
recrie a branch com `-B` nem apague trabalho existente.

Se o workspace ficar indisponível, recupere a lane em armazenamento local com clone parcial e
checkout somente dos arquivos necessários. Preserve o SHA remoto; não materialize assets nem
apague o checkout original para destravar o trabalho.

Não misture achados de PRs diferentes. Micro commits com `git commit -s` e trailer
`Agent: <nome>`. São proibidos force-push, `--no-verify`, `PREPUSH=0`, `git stash` puro e push
direto em `main`/`staging`.

## 4. Review no SHA atual

Siga `estragacodigo-loop`: solicite o reviewer pela API e leia reviews, comentários inline e
threads. Um review só vale para o `headRefOid` atual. Thread `outdated` ainda precisa de
classificação; label verde sem leitura não fecha o portão.

Para cada achado: reproduza, leia os caminhos irmãos e classifique. Bug válido segue
`bug-hunt`, com medição/mutante antes do conserto quando aplicável. Falso positivo recebe
resposta com arquivo, símbolo e evidência. Só resolva o thread depois do push ou da refutação
completa. Depois de qualquer push, solicite review outra vez.

## 5. CI e prova da mudança

Antes de cada push, rode o equivalente local do que falhou e a verificação focada do change.
Falha de infra/carga recebe um rerun antes da investigação. Falha pré-existente exige baseline
virgem A/B com log; nunca suprima o gate, enfraqueça o smoke ou transforme ausência de preview
em sucesso.

Quando a revisão ativa estiver limpa, execute `revisao-antes-do-push` com contexto independente
sobre o diff inteiro. Todo achado adversarial válido volta para a lane; se mudar comportamento
ou trust boundary, revise o novo head novamente.

## 6. Issues: fechar só com evidência

Classifique cada issue como: ainda válida, já corrigida em `main`, corrigida só em `staging` ou
PR aberto, duplicata, externa/transitória ou obsoleta. Cite arquivo, símbolo, SHA e ambiente.
Tag de versão não prova deploy. Ausência de nova ocorrência não prova correção.

- correção de código: vincule `Fixes #N` apenas se o PR cobre a issue inteira;
- crash em produção: confirme a versão/asset/cabeçalho efetivamente servido;
- backend: confirme o gate ou deploy exigido, sem acionar deploy do dono;
- duplicata: preserve a issue canônica e escreva a assinatura comum;
- externa/incerta: mantenha aberta se faltar evidência; não feche por palpite.

## 7. Merge serializado

Antes de cada merge, exija simultaneamente:

- review atual e zero thread válida pendente;
- checks obrigatórios verdes e verificação local do change;
- revisão adversarial sem achado acionável;
- labels de política satisfeitos e autorização do dono quando exigida;
- nenhuma dependência aberta na base do PR.

Use merge commit, nunca squash: `gh pr merge NUMERO --merge`. Faça um merge por vez, na ordem
de dependências. Depois de cada merge, rode `git fetch origin` na próxima lane e, se houver
conflito ou a política exigir atualização, integre com `git merge origin/BASE`, nunca rebase ou
force-push. Revalide o novo head; checks e reviews anteriores não são transferíveis. Não
promova `staging` para `main` nem faça deploy como efeito colateral da limpeza.

Comente no PR o que foi corrigido/refutado, os SHAs e a verificação. No fechamento da rodada,
entregue a lista de merges, issues fechadas e cada bloqueio restante com a próxima ação real.
