---
name: estragacodigo-loop
description: Use quando um PR precisa passar pelo ciclo completo do reviewer estraga-codigo: solicitar review, validar cada achado contra o código, corrigir, responder threads, pedir nova revisão do head e só então decidir ou executar merge. Vale para client e backend.
---

# Estraga-código: review → correção → merge

Esta skill fecha o ciclo; pedir review sozinho não é conclusão. O contrato é: review do
`estraga-codigo` no **head atual**, zero thread válida pendente, checks verdes e ordem de
merge que respeita dependências.

## 1. Escolha a fila antes de acionar

1. Liste os PRs abertos de `client` e `backend`.
2. Exclua draft, PR substituído e branch já consolidada em outro PR.
3. Ordene dependências: base antes de PR empilhado; backend antes do client que consome o
   contrato. Merge do backend não significa deploy.
4. Registre `number`, `headRefOid`, `baseRefName` e repositório. Review de outro SHA está
   vencido.

Não acione todos os PRs antigos por reflexo. O reviewer custa tempo; revise a fila que ainda
pode ser mergeada.

## 2. Solicite o reviewer real

Use a API de requested reviewers; comentário comum da mesma conta não é review:

```bash
gh api -X POST repos/corosolto/REPO/pulls/NUMERO/requested_reviewers \
  -f 'reviewers[]=estraga-codigo'
```

No backend privado, `estraga-codigo` precisa ser colaborador com acesso `read` aceito. Se a
API responder 422, confira o convite; não aumente para `write` só para usar CODEOWNERS.

## 3. Leia o review certo

Busque três superfícies separadas:

- reviews do PR por `estraga-codigo`, incluindo `state` e `commit.oid`;
- review comments inline da mesma conta;
- threads e seu `isResolved`/`isOutdated` via GraphQL.

Ignore issue comments de plantão como sinal de aprovação. Um review só fecha o portão quando
foi emitido para o `headRefOid` atual. Push novo invalida a conclusão anterior.

## 4. Julgue cada achado antes de editar

Para cada thread:

1. reproduza a entrada real citada;
2. leia o bloco inteiro e os caminhos irmãos;
3. classifique: bug válido, risco já coberto, sugestão incorreta ou comentário obsoleto;
4. achado válido segue `bug-hunt`: régua/mutante vermelho primeiro, correção depois;
5. sugestão incorreta recebe resposta técnica com arquivo, símbolo e evidência. Não altere
   código correto para satisfazer o texto do bot.

Não misture achados de PRs diferentes numa branch. Corrija no worktree da branch revisada.

## 5. Corrija e prove

- Faça mudança mínima e migre todos os callsites afetados.
- Rode o cenário específico que falhava; teste permanente só quando protege contrato real.
- Preserve `git commit -s` e o trailer `Agent:`.
- Rode o `pre-push`; nunca use `--no-verify` ou `PREPUSH=0`.
- Responda cada thread válida com causa, correção e comando/resultado. Resolva a thread só
  depois do push que contém a correção.

## 6. Repeça no head novo

Depois de qualquer push:

1. leia o novo `headRefOid`;
2. solicite `estraga-codigo` outra vez;
3. aguarde review nesse SHA;
4. repita até não haver thread válida pendente.

Limite de saída: review atual, zero thread válida aberta, checks obrigatórios verdes e nenhum
PR dependente apontando para base que ainda não foi mergeada.

## 7. Merge seguro

Antes do merge, declare uma decisão por PR:

- **merge agora** — review atual, checks verdes, sem dependência aberta;
- **corrigir** — achado válido ou check vermelho;
- **rebase/retarget** — base antiga ou PR empilhado;
- **fechar** — substituído ou já consolidado;
- **humano/staging** — gameplay, render, HUD, mapa, áudio ou backend sem smoke real.

Faça merges um por vez na ordem declarada. Após cada merge, atualize/rebase o próximo e
revalide o head; não trate o placar anterior como transferível.
