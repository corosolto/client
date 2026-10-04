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
- Primeiro checkpoint `e79f8a169` publicado no [PR #749](https://github.com/corosolto/client/pull/749). O CI apontou a isenção antiga em `eval:deps` (`DEP2`); ela foi removida em `cb5f94c3b`. `eval:deps` e os três mutantes passaram localmente; build, smoke, CodeQL, DCO e os demais checks do PR ficaram verdes. Merge squash: `5282aec49906e467d21ec446f8b60a28664d528a` em 2026-10-04. O GitHub ainda mostrava o alerta 52 aberto imediatamente após o merge, aguardando a atualização do Dependabot.
- `check:deploy` local foi interrompido depois de mais de 16 minutos em `eval:docsautoria`, que repete varreduras completas de `tools/`. Nenhuma falha havia ocorrido; a worktree foi conferida limpa após a interrupção. O CI remoto completo do PR passou.
- Prévia isolada em `/tmp/csbrasil-docs-security-preflight-20261004`: Docusaurus 3.10.2, atualização de transitivas e overrides de `serialize-javascript` e `uuid`. O build da documentação passou em `pt` e `en`. Comparação dos alertas com o lockfile resultante: 1 de 35 alertas de `docs/` permanece, `braces` (#50), sem versão corrigida publicada no npm.
- Branch atual: `codex/security-docs-20261004`, criada da `origin/main` em `5282aec49`. A atualização foi aplicada em `docs/package.json` e `docs/package-lock.json`; `npm ci` e `npm run build` passaram em `pt` e `en`. O servidor `docusaurus start` compilou e respondeu HTTP 200 em `/docs/`; `sockjs` carregou `uuid.v4()` da versão 11.1.1. A comparação semver com os 35 alertas do lockfile de `docs/` deixa apenas o #50 dentro da faixa vulnerável.
- `npm audit` completo do novo `docs/`: 28 entradas `high`, todas derivadas da única advisory raiz `GHSA-vfj7-8cjw-p6xm` em `braces` (as demais são dependentes na cadeia). Nenhuma outra advisory raiz nova surgiu. O GitHub registra `<=3.0.3` como afetado e nenhuma versão corrigida.
- Risco residual #50: `braces` 3.0.3, transitivo de `chokidar` e `micromatch`. O advisory descreve estouro de pilha com padrão de chaves profundamente aninhado; a última versão publicada é 3.0.3, e `first_patched_version` está ausente. O site de docs é compilado para arquivos estáticos; o processo de build não recebe padrões diretamente de visitantes do site. Não marcar o alerta como resolvido sem patch verificável.

## Estado, artefatos e próximo passo

- O checkout `client` existente está sujo e não foi alterado. Esta worktree nova é a única lane de implementação deste trabalho.
- Baseline e resultado do audit local: `/tmp/csbrasil-security-root-before-20261004.json` e `/tmp/csbrasil-security-root-after-20261004.json` (artefatos temporários; a evidência durável será o PR e este ledger).
- Próximo: sincronizar com o commit de release da `main`, abrir o segundo PR e deixar o CI verde. Conferir novamente se o Dependabot fechou o alerta 52. O alerta 50 exige avaliação separada quando sair patch oficial.
