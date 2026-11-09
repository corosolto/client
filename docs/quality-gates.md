# Quality gates

## Required checks

- `pr-fast`
- `smoke-web` quando a PR toca jogo/UI/site
- `dco` para toda contribuição via PR

## Labels

- `safe-automerge`: só para PR pequena, reversível e fora de gameplay/backend
- `needs-staging`: PR precisa passar por staging fixa antes de merge
- `needs-human-gameplay`: mudança em jogo/mapa/render/HUD
- `needs-human-backend`: mudança em API/Supabase/anti-cheat
- `bot-fixable`: docs, manifests, changelog, pequenos fixes determinísticos
- `covered-by-pr`: issue já atacada por PR aberta

## Merge policy

Pode entrar em automerge:

- docs
- changelog
- workflows pequenos
- manifestos e pequenos ajustes de CSS/texto

Não entra em automerge:

- gameplay
- render/WebGL
- mapas
- personagens
- anti-cheat
- backend/ranking

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
`browser`, `network`, `vm`). Caminho desconhecido, dependência transversal ou falha ao ler o diff
executa `check:deploy` completo. A seleção só existe localmente: o CI nunca usa diff para pular testes.

`check:fast` e `check:deploy` expandem `tools/eval/suites.mjs` com a sequência anterior preservada.
O `soundscape` é um job obrigatório separado no `build`, então falha externa de áudio não invalida
um agregado inteiro. Packs de assets usam cache por tag exata e checksum quando existir; os asserts
nominais continuam obrigatórios. As invariantes são divididas por família e por mapa, sem separar
produtor e consumidor de um `freshReport`. Sertão usa shards por IDs de check, nunca por qualidade.
O runner grava `tools/eval/out/runner-latest.json` por execução e aceita `--jobs=2` apenas no core;
o pre-push continua sequencial por padrão para não aumentar contenção na máquina local.

Use a branch `staging` para validar combinações de PRs antes de produção.
O workflow de staging deve apontar para `STAGING_URL`.

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

## Crash triage

Issues `crash-auto` devem ser agrupadas por assinatura de erro antes de
virarem fila humana. O bot só sugere duplicata; o fechamento continua humano.

## Bot-fix workflow

Issues com label `bot-fixable` podem receber comentário de maintainer:

```text
/bot-fix
```

Isso faz o `csbrasil-bot` abrir uma draft PR bootstrap a partir da `main`.
