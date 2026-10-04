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
- Segundo PR [#751](https://github.com/corosolto/client/pull/751) passou no CI, incluindo CodeQL, Vercel e build principal. O bot regenerou três blocos de versão derivados no commit `396e59826`; o diff foi conferido. Merge squash: `34dce28f23b5120fd5e0845cb4e695f145d43443` em 2026-10-04. O Dependabot ainda recalculava parte dos alertas de `docs/` imediatamente após o merge; confirmar o estado final pela API.
- O recálculo do Dependabot fechou os 34 alertas corrigidos de `docs/`: permanecem apenas #50 (`braces`) e os quatro alertas do exemplo Vite. O alerta 52 do lockfile principal está `fixed` desde 2026-10-04T09:06:33Z.
- Prévia isolada do exemplo Vite em `/tmp/csbrasil-skill-security-preflight-20261004`: Vite 8.3.2, PostCSS 8.5.28, `npm ci`, TypeScript e build passaram; `npm audit` reportou zero e os quatro alertas da skill ficaram fora das faixas vulneráveis. A skill é vendorizada em `.agents/skills/`; `skills-lock.json` fixa o hash de `SKILL.md`, que não precisará ser alterado por uma atualização de lockfile do exemplo.
- Branch atual: `codex/security-workflow-permissions-20261004`, criada da `origin/main` em `34dce28f2`. Cinco workflows agora declaram `permissions: { contents: read }` no topo; o job `ci.release` preserva o override `contents: write`. `workflow_security_check.py --selftest` e seus 9 mutantes passaram. `actionlint` passou com exclusão pontual de dois avisos ShellCheck `SC2034` já presentes em `smoke-web` e `portao-browser`; parsing YAML confirmou as permissões. Os nove alertas de CodeQL ainda estão abertos até o merge e a varredura da `main`.
- Terceiro PR [#754](https://github.com/corosolto/client/pull/754): todos os checks passaram, incluindo build, smoke, portão de navegador, CodeQL, Vercel e DCO. Merge squash `dc9ff32575a336a9e72f39ab1d312a2c189554fb` em 2026-10-04T10:01:52Z. Os nove alertas de code scanning ainda apareciam abertos logo após o merge; conferir o recálculo da análise na `main`.
- Prévia isolada da mitigação para `braces` em `/tmp/csbrasil-docs-security-preflight-20261004`: PR upstream [micromatch/braces#72](https://github.com/micromatch/braces/pull/72), commit `28d440b5dd449dbf1fe6f3506cf94ecca4d02660`, ainda aberto. Pacote local `3.0.4-csbrasil.0` gerado com somente a alteração de versão; tarball de 14 KiB com SHA-256 `bf27d85726cdf54f9cce8892f8c7022584ef9b1a938c414cb9d1786535020bff`, reproduzido duas vezes. Com `braces` fixado no tarball, `npm ci`, `npm audit` (zero vulnerabilidades), build `pt`/`en` e regressão com 4.000 níveis de chaves passaram. A versão publicada 3.0.3 estourava a pilha nesse padrão; a versão local lança `SyntaxError` de limite de profundidade. Ainda não integrado; incluir procedência e teste persistente no PR dedicado.
- Branch atual: `codex/security-skill-example-20261004`, criada da `origin/main` em `dc9ff3257`. O lockfile do exemplo Three.js/Vite atualiza Vite para 8.3.2 e PostCSS para 8.5.28, mantendo o manifesto. Nesta worktree, `npm ci`, `npm run build` (TypeScript e Vite) e `npm audit` (zero vulnerabilidades) passaram. O diff limita-se ao lockfile do exemplo e a este ledger. Os quatro alertas do exemplo aguardam merge e recálculo do Dependabot.
- Risco residual #50: `braces` 3.0.3, transitivo de `chokidar` e `micromatch`. O advisory descreve estouro de pilha com padrão de chaves profundamente aninhado; a última versão publicada é 3.0.3, e `first_patched_version` está ausente. O site de docs é compilado para arquivos estáticos; o processo de build não recebe padrões diretamente de visitantes do site. Não marcar o alerta como resolvido sem patch verificável.

## Estado, artefatos e próximo passo

- O checkout `client` existente está sujo e não foi alterado. Esta worktree nova é a única lane de implementação deste trabalho.
- Baseline e resultado do audit local: `/tmp/csbrasil-security-root-before-20261004.json` e `/tmp/csbrasil-security-root-after-20261004.json` (artefatos temporários; a evidência durável será o PR e este ledger).
- Próximo: publicar o quarto PR do lockfile do exemplo Vite, esperar todos os checks, corrigir qualquer falha e integrar. Depois criar um PR dedicado para o pacote local de `braces` com procedência, hash e teste de regressão. Confirmar os estados finais de Dependabot e CodeQL pela API; substituir o pacote local quando houver release oficial.
