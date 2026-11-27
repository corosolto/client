# Quality gates

## Required checks

O que segura o merge é o ruleset do GitHub, não esta lista: check que o ruleset não exige
não impede merge nativo. Estado-alvo (17/11/2026), igual em `main` e `staging`, com a fonte
única em `REQUIRED_CONTEXTS` de `scripts/ci/check_automerge.py`:

| Contexto exigido | Workflow · job | Observação |
| --- | --- | --- |
| `build` | `pr-fast` (`ci.yml`) · agregador | todos os jobs do pr-fast |
| `dco` | `pr-fast` (`ci.yml`) · `dco` | `Signed-off-by` em todo commit |
| `versao-bumpada`, `ratchet` | `pr-gates` | roda em PR para `main` e `staging` |
| `english` | `pr-language` | título e descrição da PR em inglês |
| `hotfix-ancestry` | `hotfix-ancestry-gate` | verde e "não se aplica" fora de hotfix→`main` |
| `portao-decide`, `portao` | `portao-browser` | `portao` agrega os `portao-*` e o Sertão |
| `smoke-decide`, `smoke`, `chat-desktop` | `smoke-web` | `smoke-cf` fica fora: opcional nesta fase |
| `politica-merge` | commit status do `csbrasil-bot-automerge` | ver "Merge policy" |

Regras de nome: job SKIPPED conta como sucesso, e contexto exigido que nunca aparece trava o
PR para sempre. Por isso só entram jobs que existem em TODO PR das duas bases (inclusive
`staging → main`) e que saem SKIPPED, nunca ausentes, quando não se aplicam (draft, gatilho
que não casa). Os `*-decide` são exigidos porque nascem na hora: no `ready_for_review` de um
draft, o check mais novo de `portao`/`chat-desktop` ainda é o SKIPPED do draft até o `decide`
novo terminar. `decide` puro não serve (o `cf-preview` também tem um). Matrix pulada não
expande o nome (`Sertão — ${{ matrix.shard.nome }}`), então o Sertão entra pelo `portao`.

As duas bases também exigem conversa de revisão resolvida e só aceitam merge commit.

**Depende do dono aplicar** (o bot não altera settings). Hoje (17/11) a `main` exige só
`build`, `dco`, `versao-bumpada` e `ratchet`; a `staging` não tem ruleset; `allow_auto_merge`
está desligado. Os comandos exatos estão no PR que introduziu o auto-merge nativo e na seção
"Rollout" abaixo.

## PR em draft: itere barato, peça os portões pesados no fim

Abra a PR como draft (`gh pr create --draft`) enquanto ainda está iterando. Em draft rodam
`pr-fast`, `dco`, os gates de PR e o `smoke` básico do `smoke-web` (~5,5 min, o job que mais
reprova). O `portao-browser` inteiro (`portao-*`, `Sertão — *`, agregador `portao`) e os jobs
pesados do `smoke-web` (`chat-desktop`, `smoke-cf`) saem **SKIPPED**: o check aparece, mas
não roda. Isso economiza ~99 runner-min e 10 jobs por push (medido em 30 d).

Quando o `pr-fast` estiver verde, rode `gh pr ready <número>`. O `ready_for_review` dispara
`portao-browser` e `smoke-web` de novo no mesmo SHA, agora com tudo. Push em PR não-draft
continua rodando tudo. Voltar para draft (`gh pr ready --undo`) não cancela o run que já está
medindo o SHA, e o push seguinte em draft volta a pular o pesado.

Draft nunca é mergeado: o `check_automerge.py` recusa `isDraft`, e o SKIPPED do draft não vale
como aprovação. O run do `ready_for_review` cria na hora os checks `portao-decide` e
`smoke-decide` (pendentes), e os portões pesados entram em seguida. O `decide` falha fechado:
push, `workflow_dispatch`, erro de diff e saída ausente rodam tudo. Só `pull_request` com
`draft == true` pula (régua `eval:portaogatilho`, PG7). Quais jobs ficam no draft é decidido
em `GATILHOS.<alvo>.leves` (`scripts/ci/gatilho.mjs`).

## Labels

- `safe-automerge`: só para PR pequena, reversível e fora de gameplay/backend
- `needs-staging`: PR precisa passar por staging fixa antes de merge
- `needs-human-gameplay`: mudança em jogo/mapa/render/HUD
- `needs-human-backend`: mudança em API/Supabase/anti-cheat
- `bot-fixable`: docs, manifests, changelog, pequenos fixes determinísticos
- `covered-by-pr`: issue já atacada por PR aberta
- `bugfix`: bug identificado; o bot atribui a `@nunreasonable` (configurável por `BUGFIX_ASSIGNEE`)
- `release-batch`: entra na próxima PR diária `staging → main`
- `release-hotfix` + `hotfix`: correção urgente; `release` só com base `main` e ancestry main-only
- `needs-hotfix-review`: hotfix contém commits de `staging` ou ancestry desconhecida; merge/release bloqueados
- `release`: merge na `main` dispara o trem de release

## Merge policy

O `csbrasil-bot-automerge` não faz polling e não espera check. O `csbrasil-bot-pr-classify`
o despacha (`workflow_dispatch`) no fim de cada classificação, depois de aplicar as labels; ele
publica o commit status `politica-merge` na head e arma ou desarma o auto-merge nativo do GitHub
(merge commit, `expectedHeadOid` = head avaliada). Quem espera os checks é o ruleset.

`politica-merge` vale para merge de GENTE também (o ruleset exige):

- `failure`: `needs-estragacodigo-resolution` sem `estragacodigo-resolved`, ou
  `needs-hotfix-review`;
- `pending`: `needs-human-gameplay`/`needs-human-backend` ou diff em `public/`, `src/` ou
  `supabase/` mesmo sem essas labels (decisão do dono, que mergeia como bypass actor; o lote
  oficial `staging → main` fica fora porque recombina o que já passou pelo dono), draft, ou lista
  de arquivos que não deu para verificar;
- `success`: nenhum bloqueio. Com "auto-merge armed" na descrição quando o bot armou.

O bot arma o auto-merge só para:

- docs, changelog e templates pequenos classificados por `safe-automerge`, com
  `reviewDecision=APPROVED`, sem workflow e sem `public/`, `src/`, `supabase/`;
- a PR oficial `staging → main` com label `release` e `estragacodigo-resolved`, sem
  `CHANGES_REQUESTED`.

Quando surge bloqueio (label, review), o status sai ANTES do desarme: mesmo se o desarme
falhar, o contexto exigido fora do verde segura o merge nativo. Head nova não tem
`politica-merge` até o bot rodar, e contexto exigido ausente também segura.

Conversa de revisão aberta NÃO entra no `politica-merge`: resolver conversa não dispara
Actions, então um `failure` por conversa ficaria preso depois da resolução. Quem segura é a
regra nativa de conversa resolvida, que o GitHub reavalia sozinho; por isso o bot só arma
quando o ruleset da base tem essa regra.

Não entra no automerge de PR individual:

- gameplay
- render/WebGL
- mapas
- personagens
- anti-cheat
- backend/ranking
- workflows

Essas superfícies seguem a aprovação humana antes de integrar `staging`. O lote diário só
recombina o que já foi integrado; não dispensa revisão pendente nem check vermelho. O bot usa
merge commit e nunca apaga `staging`.

Merge DIRETO do bot (`gh pr merge --merge --match-head-commit`) só acontece com o critério
completo: rollup inteiro verde (deduplicado pelo run mais novo), cada contexto da tabela acima
PRESENTE e verde (ausente não é verde; `politica-merge` fica de fora porque é o que o bot
publica), zero conversa aberta (o bot é bypass actor e passaria por cima da regra nativa),
base `main` ou `staging` e estado `CLEAN`. Isso vale quando o GitHub recusa armar porque o PR
já está limpo ou porque `allow_auto_merge` está desligado, ou enquanto o ruleset da base não
exige todos os contextos da tabela e a resolução de conversas. Sem os settings, então, o bot
nunca arma e nunca mergeia sem esse critério.

## Rollout

1. Dono, ANTES do merge do PR do auto-merge nativo: `allow_auto_merge=true`, ruleset novo
   da `staging` e `main` com os contextos que já existem hoje (`build`, `dco`,
   `versao-bumpada`/`ratchet` só na `main`, `english`, `hotfix-ancestry`), conversa resolvida
   e só merge commit.
2. Merge, na `staging` e depois na `main`, deste PR e do PR que cria `portao-decide`/
   `smoke-decide` e o `sertao` no `portao`.
3. Dono: ruleset completo (tabela acima) nas duas bases. A partir daqui o bot arma.

Se o código entrar antes dos settings, o bot publica `politica-merge` (sem efeito, ninguém o
exige), não arma (falta contexto no ruleset) e só mergeia direto com o critério antigo
completo. Se o passo 3 for aplicado antes do passo 2, todo PR fica bloqueado esperando
contexto que ainda não existe: falha fechada, o dono mergeia por bypass.

## Lixo não nasce em PR (`eval:lixo`)

`tools/eval/lixo-check.mjs` roda no `pr-fast` e no `check:fast` e mede só o que o PR
**adiciona** (`git diff --diff-filter=A --no-renames` contra a base; renomear para pasta
proibida conta como adicionar; editar e apagar é sempre livre). Reprova quando o PR cria:

- `LX1` arquivo em `plans/`, `progress/`, `prompts/`, `content/`, `references/`, `tools/eval/asset-evidence/`
- `LX2` arquivo na raiz (ou pasta nova na raiz) fora da allowlist literal do próprio script
- `LX3` `tools/eval/<nome>.mjs` que nem `package.json`, nem workflow, nem outro módulo de `tools/eval` cita
- `LX4` `docs/**.md` com nome de histórico: `CONTINUATION`, `HANDOFF`, `STATUS`, `RELATORIO`, `PLANO`, data ou rodada (`R1234`)
- `LX5` arquivo em `public/img|video|models` que nenhum código do jogo pede (`public/js`, `src`, JSONs de `public`, `public/*.css`)

Política por trás das cláusulas: evidência de PR vai no corpo do PR; histórico e diário
vão no repo privado `progress`; fonte de arte e evidência pesada vão no `studio-assets`.
Quem precisa de arquivo novo na raiz muda a allowlist no mesmo PR, com o porquê.
`node tools/eval/lixo-check.mjs --mutate` prova as cinco cláusulas num clone de rascunho
(6 mutantes vermelhos, incluindo rename para `progress/`, 2 controles verdes). Localmente a base é `merge-base origin/main`;
no CI vem de `FILA_BASE` (base do PR ou do lote).

## Staging

## Local e pre-push

`check:prepush` executa o núcleo e as suites afetadas pelo diff (`core`, `maps`, `ui`, `audio`,
`browser`, `network`, `vm`). Em `package.json`, compara os scripts entre os blobs do range e inclui
somente os passos alterados de `check:fast`/`check:deploy`; workflows com mapa estático validado
incluem suas réguas. Caminho ou workflow desconhecido, lock/dependência/metadado, agregador,
remoção de script, JSON inválido ou falha ao ler o diff executa `check:deploy` completo. A seleção
só existe localmente: o CI nunca usa diff para pular testes.

`check:fast` e `check:deploy` expandem `tools/eval/suites.mjs` com a sequência anterior preservada.
Os 17 contratos visuais rodam uma vez cada, sem perda ou duplicação (PI4). O pai local
`eval:operacao-flavio` continua sequencial e completo; no CI, os 50 mutantes de collider usam
quatro shards disjuntos, e core, menu, online, integração, comportamento e escolta são passos próprios.

Distribuição do `pr-fast` (17/11/2026): `setup` instala e constrói uma vez; dez lotes de ~7 min
(`reguas-e-site`, `mapas-e-site`, `invariantes-mapas`, `equipamento-tp-corpo`, `equipamento-tp-origem`,
`economia-ak-hud`, `operacao-flavio`, `operacao-flavio-e-mantle`, `contratos-visuais-mapas`,
`contratos-visuais-personagens`) mais o `soundscape` rodam em paralelo; `build` agrega e `dco` corre à
parte. Antes eram 41 jobs atrás de um limite de 20 simultâneos na org, cada um pagando ~55 s fixos.
Cada lote junta blocos `# ── <unidade>` inteiros, escolhidos pela duração medida (tempos por passo e o
manifesto do `eval-duration-calibration`, que o pr-fast não lê: manifesto vencido não reprova PR).
Todo passo de lote roda com `!cancelled() && deps ok`, então régua vermelha não esconde as seguintes.
Rebalancear é mover bloco entre lotes e atualizar o dono no PI4 (`tools/eval/portao-inteiro-check.mjs`).
`setup` instala com lock congelado e cache do store do pnpm. Os consumidores restauram
a árvore instalada pela chave que inclui `pnpm-lock.yaml`, `pnpm-workspace.yaml` e `.npmrc`.
O artefato de `dist` leva só o que o checkout do consumidor não tem
(`scripts/ci/dist-compartilhado.mjs`: espelho `.vercel/output/static` e cópias de `public/`
são refeitos e conferidos por sha256). `cache-limpeza` preserva a árvore em uso na main.

O `soundscape` é um job obrigatório separado no `build`, então falha externa de áudio não invalida
um agregado inteiro. Packs de assets usam cache por tag exata e checksum quando existir; os asserts
nominais continuam obrigatórios. As invariantes rodam um processo por família e por mapa, sem separar
produtor e consumidor de um `freshReport`. Sertão usa shards por IDs de check, nunca por qualidade.
O runner grava `tools/eval/out/runner-latest.json` por execução e aceita `--jobs=2` apenas no core;
o pre-push continua sequencial por padrão para não aumentar contenção na máquina local.

Use a branch `staging` para validar combinações de PRs antes de produção.
O workflow de staging deve apontar para `STAGING_URL`.

## Dependências do client

O client fixa a versão do pnpm em `package.json` e instala com `pnpm install --frozen-lockfile`.
`.npmrc` usa o linker isolado. `pnpm-workspace.yaml` preserva os `overrides` e autoriza os
scripts de instalação das versões explícitas de `esbuild`, `fsevents` e `workerd`.
O pacote em `docs/` tem lock próprio e continua em npm.

| Superfície | Contrato |
| --- | --- |
| Local | Cada worktree instala a própria árvore. O store pode ficar no mesmo volume e compartilhar o conteúdo entre worktrees. `prepare` configura os hooks; o pre-push continua rodando `eval:mapcontrato` e `check:prepush`. |
| Playwright | O browser das réguas vem do `playwright` local, travado no lock. `CHROME_BIN`, quando definido no diagnóstico do CI local, precisa apontar para o Chromium daquela versão. |
| Three.js | As pontes dos harnesses apontam para os módulos de `public/vendor/`. A migração não instala um pacote `three` do registry. |
| WASM | `copy-wasm` resolve `@resvg/resvg-wasm` e gera `public/wasm/resvg.wasm` no setup, em `dev` e em `build`. |
| Cloudflare e Vercel | Os builds Cloudflare do client instalam com pnpm. O publisher de preview usa Wrangler fixado com a configuração da base confiável. `vercel-ignore.sh` continua pulando os builds da Vercel. |

Em comparações de instalação, use uma árvore vazia para cada cenário frio/quente. Registre
se o store estava vazio e se os arquivos eram compartilhados por clone ou hard link.

## Depois do deploy

Os checks acima param no merge. O app de loja é uma WebView apontada para a produção
e recebe cada deploy na hora, sem revisão de loja — então todo deploy de produção é
seguido de:

```bash
BASE=https://www.csbrasil.online npm run smoke:prod
```

Abre uma partida real no endereço publicado, espera ela ficar viva, assiste ~15 s e
sai 1 se o jogo não abriu, quebrou no console ou não desenhou (`tools/eval/smoke-pos-deploy.mjs`,
menos de 2 min). Reprovou: reverta o deploy. Se o conserto demorar, `public/mobile-config.json`
avisa manutenção no app sem publicar app novo — ver `docs/mobile/CONFIG-REMOTO.md`.

De propósito, `smoke:prod` **não** entra em `check:fast` nem em `check:deploy`: depende de
rede externa e mede o que está no ar, não o que está no disco.

Depois do smoke, a vigilância contínua é do `prod-watch.yml` (a cada 15 min) e do
`ops-diag.yml` (de hora em hora). O relógio primário deles é o Worker `vigia-cron`, que chama
o `workflow_dispatch` de cada um (e do `sync-nodes.yml` do backend). O `schedule` do GitHub,
que descartava ~96% dos disparos, fica só como rede de segurança. Como conferir e o que fazer
quando o Worker para: `docs/runbooks/vigia-cron.md`.

## Crash triage

Issues `crash-auto` devem ser agrupadas por assinatura de erro antes de
virarem fila humana. O bot só sugere duplicata; o fechamento continua humano.

## Bot-fix workflow

Issues com label `bot-fixable` podem receber comentário de maintainer:

```text
/bot-fix
```

Isso faz o `csbrasil-bot` abrir uma draft PR bootstrap a partir da `main`.
