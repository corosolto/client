# csbrasil-bot

O projeto usa a conta `csbrasil-bot` via GitHub Actions para triagem, reparo de build,
integração e organização de releases.

## Workflows operados pelo bot

- triagem e sweep de issues
- classificação de PR, assignee e canal de release
- reparo de falhas do `pr-fast` com Codex
- automerge de PRs elegíveis
- PR diária de release `staging → main`
- comentários de classificação e sugestão de duplicatas de `crash-auto`
- bootstrap de draft PR a partir de issue elegível via `/bot-fix`

## Classificação de release

- `fix:`, `bug`, `crash` e equivalentes identificam bugfix. O bot atribui a PR ou issue a
  `@nunreasonable` por padrão, sem remover assignees existentes.
- Bugfix comum recebe `release-batch` e segue para `staging`.
- Título começando com `hotfix:` ou `[hotfix]`, ou label `hotfix`, identifica hotfix.
- Hotfix deve nascer de `main` e mirar `main`. O bot não o desvia para `staging` e adiciona
  `release` somente quando a base é `main`, `origin/main` é ancestor da head atual e os commits
  exclusivos da head não intersectam os commits ainda não publicados de `staging`. Commits novos
  do hotfix não precisam (nem podem) já estar em `main`. Caso contrário aplica
  `needs-hotfix-review`, remove `safe-automerge` e bloqueia o merge. Uma branch baseada em
  `staging` não é promovida automaticamente porque isso poderia publicar commits não relacionados.
- `release.yml` publica após o merge verde de uma PR com `release`. O dispatch manual continua
  disponível como fallback. Além das labels, o automerge exige o check `hotfix-ancestry` verde
  na head atual; fetch falho ou check ausente/vermelho impede o merge mesmo com labels antigas.

## Release diária

`csbrasil-bot-daily-release.yml` roda às 12:17 UTC e por `workflow_dispatch`:

1. compara `origin/main..origin/staging`;
2. não faz nada quando não há commits novos;
3. cria ou atualiza uma única PR `staging → main`, em inglês e com label `release`;
4. deixa o `csbrasil-bot-automerge` mergear por merge commit quando checks e revisões estiverem
   verdes, sem apagar `staging`;
5. deixa o `release.yml` existente validar a `main`, aplicar o bump, tagar e publicar.

Gameplay, render, mapas, personagens, backend, ranking e anti-cheat continuam exigindo a
aprovação humana definida nos quality gates antes de entrar em `staging`.

## Reparo automático de build

`csbrasil-bot-build-fix.yml` reage a uma falha do `pr-fast` e executa
`@openai/codex@0.167.0` para corrigir somente o erro observado:

- somente PR da mesma conta/repositório e branch de feature; fork, `main` e `staging` são rejeitados;
- `claim` valida SHA atual e consome no máximo uma tentativa, marcada por `build-fix-attempted`;
  runs obsoletos não consomem tentativa;
- `propose` não recebe token de push: instala o Codex antes do checkout da PR, em `/tmp`, com
  configs npm vazias e registry oficial, verifica o hash do binário e executa o agente. Antes de
  reinstalar dependências, rejeita qualquer edição nos gates; as instalações usam
  `npm ci --ignore-scripts`. Depois roda `npm run check:fast` e publica somente um patch binário
  com metadados e SHA-256; logs são dados não confiáveis, nunca instruções;
- comandos iniciados pelo Codex não herdam `OPENAI_API_KEY`, `GH_TOKEN` nem `CSBRASIL_BOT_TOKEN`;
- `publish` parte de um checkout fresco, valida repositório, PR, branch, SHA, tree, digest, paths e
  aplicação exata do patch com um guard novo da branch padrão;
- `publish` não executa npm, Codex, hooks ou scripts da PR; somente esse job recebe o token de push;
- workflows, hooks, `scripts/ci`, `tools/eval`, `package.json` e `package-lock.json` são proibidos
  no diff; o reparo não pode alterar os gates que o validam. Diff vazio ou alterado é rejeitado;
- somente o patch permitido e verde vira commit com DCO + trailer `Agent:` e push normal;
- falha não altera a branch e recebe `build-fix-failed`;
- o merge acontece somente no workflow de automerge, depois dos portões da nova head.

## Merge e revisão

- PR individual precisa de `safe-automerge`, `reviewDecision=APPROVED`, checks verdes, estado
  mergeável e nenhuma pendência do estraga-codigo. Gameplay, backend e workflows não entram nesse caminho.
- Todo merge usa `--match-head-commit` com o SHA avaliado; push entre decisão e merge aborta em
  vez de publicar código não verificado.
- A PR oficial `staging → main` usa o caminho `release-batch`: exige `estragacodigo-resolved`
  sem `CHANGES_REQUESTED`, não exige `reviewDecision=APPROVED`, e continua bloqueada por checks
  vermelhos, conflito, draft e pelas labels `needs-human-gameplay`, `needs-human-backend` e
  `needs-hotfix-review`.
- Rollup vazio ou desconhecido não conta como verde.
- Crash automático gera sugestão de duplicata; fechamento continua humano.

## Secrets

- `CSBRASIL_BOT_TOKEN`: obrigatório para labels, comentários, assignees, pushes e merges do bot;
  precisa de Contents, Pull requests, Issues e Metadata.
- `OPENAI_API_KEY`: obrigatório para o reparo autônomo com Codex. Sem ele, a lane falha
  explicitamente e nenhum código é alterado.
- `STAGING_URL`: opcional; habilita smoke contra staging.

## Variables

- `PR_DEFAULT_BASE_BRANCH`: opcional; default `staging`. Hotfix em `main` é exceção.
- `BUGFIX_ASSIGNEE`: opcional; default `nunreasonable`.

## Idioma dos PRs

Título e descrição de toda PR, humana ou bot, devem estar em inglês. `pr-language.yml`
executa `scripts/ci/pr_language.py` em abertura, edição e push, com `langdetect==1.0.9` para
exigir detecção positiva de inglês e reprovar idioma desconhecido. Marcadores de português dão
o diagnóstico; artigos ambíguos não reprovam sozinhos. Comentários públicos do bot também usam
inglês. O texto original de uma issue permanece verbatim na issue; a PR bootstrap aponta para
ela em vez de copiar o relato. Labels e marcadores técnicos continuam estáveis.
