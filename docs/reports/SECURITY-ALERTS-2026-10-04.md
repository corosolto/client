# Alertas de segurança do cliente - continuação

## Objetivo e aceite

Avaliar todos os alertas abertos em `corosolto/client/security`, corrigir os achados acionáveis em PRs pequenos, deixar o CI verde e integrar cada PR antes do seguinte. Confirmar pelo GitHub o fechamento dos alertas após cada merge. Não registrar valores de segredos neste arquivo.

## Fonte e estado inicial

- Consulta autenticada à API do GitHub em 2026-10-04, base `origin/main` em `8e4a64ab0b7db590d45c2588aa96bc3836e26c8d`.
- Worktree: `worktrees/security-alerts-20261004`; branch inicial: `codex/security-alerts-20261004`.
- Dependabot: 40 alertas abertos. Code scanning: 9 alertas abertos, todos `actions/missing-workflow-permissions`. Secret scanning: nenhum alerta aberto.
- O token padrão do Actions está configurado como `read`; os workflows alertados não declaram esse limite nos arquivos.

## Ordem de trabalho

1. Lockfile principal: alerta [52](https://github.com/corosolto/client/security/dependabot/52), `http-cache-semantics` 4.2.0. O alerta descreve leitura entre usuários de respostas armazenadas em cache. `astro` depende de `^4.2.0`; a versão 4.3.0 já está disponível. Baseline: `npm audit --omit=dev` acusou exatamente uma vulnerabilidade alta.
2. Lockfile da documentação: alerta [51](https://github.com/corosolto/client/security/dependabot/51) da mesma biblioteca e alertas 50, 49, 45-39, 38-37, 35-29, 26-21, 18, 15-7. Investigar e atualizar a árvore Docusaurus preservando o build do site.
3. Workflows: alertas de code scanning [1-9](https://github.com/corosolto/client/security/code-scanning). Declarar `contents: read` no nível correto e preservar a permissão de escrita estritamente no job que cria release.
4. Exemplo Vite de skill: alertas Dependabot [1-4](https://github.com/corosolto/client/security/dependabot). Atualizar o lockfile do exemplo e verificar seu build.

## Marcos validados

- Inventário dos três tipos de alerta e da configuração de permissões do Actions concluído.
- Atualização isolada de `http-cache-semantics` para 4.3.0 no lockfile principal; `npm audit --omit=dev` passou a reportar zero vulnerabilidades.
- Primeiro checkpoint `e79f8a169` publicado no [PR #749](https://github.com/corosolto/client/pull/749). O CI apontou a isenção antiga em `eval:deps` (`DEP2`); ela foi removida nesta revisão. CI e `check:deploy` ainda precisam terminar antes do merge.

## Estado, artefatos e próximo passo

- O checkout `client` existente está sujo e não foi alterado. Esta worktree nova é a única lane de implementação deste trabalho.
- Baseline e resultado do audit local: `/tmp/csbrasil-security-root-before-20261004.json` e `/tmp/csbrasil-security-root-after-20261004.json` (artefatos temporários; a evidência durável será o PR e este ledger).
- Próximo: validar `eval:deps`, receber o resultado de `check:deploy` e CI, fazer merge do PR #749 e conferir o fechamento do alerta 52. Depois atualizar a branch a partir da `main` antes do próximo grupo.
