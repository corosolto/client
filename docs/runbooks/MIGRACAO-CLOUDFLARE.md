# Runbook: Vercel → Cloudflare Workers (site + funções de borda)

Documento vivo. Quem retomar esta migração (qualquer agente, qualquer modelo, qualquer sessão) lê este
arquivo primeiro, atualiza a tabela de status no fim de cada PR e nunca pula uma fase.
Decisão do dono (09/11/2026): sair da Vercel (~US$ 90–120/mês, Pro + uso) para Cloudflare Workers
(~US$ 5–15/mês). Analytics da Vercel não é bloqueio: o admin (`csbrasil-admin`) já tem geografia,
campanhas e funil; "olhar rápido" vai ser Umami (self-host no Workers + D1) ou Plausible.

## Por que a Vercel custa o que custa (fatura de out/nov 2026)

| Linha | US$/mês | Causa no repo |
|---|---:|---|
| Build CPU Minutes (159 h) | 34 | `scripts/ci/vercel-ignore.sh` só filtra produção; preview builda todo push de toda branch (161 PRs em 3 semanas). Cada build roda `fetch-audio/decals/viewmodels` + `strip:decalbg` + `assert:assets` + `audio:check` antes do `astro build` |
| Fast Origin Transfer | 16 | funções (proxy `/api/*`, OG, perfis SSR) |
| Observability Events (6 M) | 10 | `console.*` por requisição em `middleware.js` e `src/pages/api/[rota].ts` |
| Fluid CPU/memória + invocações | 17 | 25 rotas do backend passam pelo proxy `/api/[rota]` só para injetar geo/IP |
| Blob Data Transfer | 8 | packs de áudio/viewmodels no Vercel Blob, rebaixados em cada build |
| Banda (203 GB de 1 TB) | 0 | não é o problema |

## O que a Vercel faz hoje (inventário, não suposição)

- `astro.config.mjs`: `output: 'static'` + `adapter: vercel()`; rotas `prerender = false`:
  `src/pages/api/[rota].ts` (proxy de 25 rotas para o backend no Cloud Run, `API_PROXY_SECRET`),
  `api/geo-lang.ts`, `api/og/[tipo].png.ts` e `api/badge/[...path].png.ts` (`resvg.wasm`),
  `api/profile-card`, `u/[...path].astro`, `mapa.astro`, `sala/[codigo].astro`, `clans/[id].astro`,
  `sitemap.xml.ts`, `sitemap-[page].xml.ts`, `private-assets/[...path].ts` (só DEV).
- `middleware.js` (`@vercel/functions`: `ipAddress`, `next`, `waitUntil`): conta tráfego único por IP
  salgado (`src/lib/server-traffic.mjs`) e manda para `/api/server-traffic` do backend.
- `vercel.json` (528 linhas): `buildCommand`, `ignoreCommand`, `proxy.entrypoint`, 38 regras de
  `headers`/`redirects` (CSP com `frame-ancestors`, cache, HSTS, atalhos `/discord`, `/telegram`).
- Preview por PR: `preview-build.yml`, `smoke-web.yml`, `staging.yml`, comentário do bot com a URL.
- Env (Vercel): `API_PROXY_SECRET`, `PUBLIC_API_BASE`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `BLOB_READ_WRITE_TOKEN`, `VM_BLOB_TOKEN`, `VM_BLOB_BASE_URL`, `X_PIXEL_TOKEN`,
  `GOOGLE_SITE_VERIFICATION`, `SOCIAL_LOCAL_GAME_URL` (dev), `VERCEL_GIT_COMMIT_SHA` (build).
- Secrets no GitHub Actions: `VERCEL_TOKEN/ORG_ID/PROJECT_ID`, `CF_API_TOKEN` (purge/DNS),
  `CSBRASIL_BOT_TOKEN`, `RELEASE_TOKEN`, `BACKEND_DISPATCH_TOKEN`, `BOT_GIT_EMAIL`, `STAGING_URL`.
- Resend: só uma API key no backend; se foi instalado pelo Vercel Marketplace, criar conta direta e
  trocar a chave antes de cancelar a Vercel.

## Fases

| Fase | Entrega | Prova de saída | Status |
|---|---|---|---|
| 0. Cortes na Vercel | preview só quando o site muda (`vercel-ignore.sh` para `VERCEL_ENV=preview`), packs em cache de build, `console.*` por requisição fora | fatura do ciclo seguinte: Build < 60 h, Observability < 1 M eventos | PR aberto (branch `chore/vercel-custos-fase0`); ver "Fase 0: o que ficou" |
| 1. Spike | `@astrojs/cloudflare` no lugar de `@astrojs/vercel`; `wrangler.toml`; `_headers`/`_redirects` **gerados** de `vercel.json` por script (uma fonte, régua de paridade); `middleware.js` → middleware do Astro lendo `cf-connecting-ip`; `buildCommand` reproduzido no build do Workers | deploy em `*.workers.dev` com mesmos status/headers que produção em: `/`, `/en`, `/api/geo-lang`, `/api/og/pagina.png`, `/u/<perfil>`, `/mapa`, `/sala/x`, `/sitemap.xml`, `/api/health` (proxy); `check:seo`, `canonical-host-check`, `game-pages-check`, `site-smoke` rodando contra esse host | em andamento (branch `feat/cloudflare-spike`) |
| 2. Preview por PR | `preview-build.yml` → `wrangler versions upload` com URL por PR; `smoke-web.yml` e o comentário do bot apontam para ela | PR qualquer gera preview e `smoke-web` passa nele | pendente |
| 3. Staging em paralelo | `staging.corosolto.com.br` no Workers; `prod-watch` e `smoke:prod` nos dois hosts por 1 semana; diff automático de headers/CSP/rotas | zero divergência | pendente |
| 4. Virada | CNAME `www` → Workers (DNS já é Cloudflare; reversível em 1 min); Vercel fica 30 dias como rollback; rotacionar `API_PROXY_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` na virada (site e backend no mesmo deploy) | `BASE=https://www.corosolto.com.br npm run smoke:prod` verde; MP e OAuth ok | pendente |
| 5. Analytics | Umami (Workers + D1) ou Plausible; `@vercel/analytics` sai do `Layout.astro` | eventos no painel | pendente |
| 6. Desligar | cancelar Vercel; remover `@astrojs/vercel`, `@vercel/functions`, `vercel.json`, `VERCEL_*` dos workflows; `vercel-env-security-check` vira `cf-env-security-check` | repo sem `vercel` fora do CHANGELOG | pendente |

## Fase 0: o que ficou (e como conferir)

- `scripts/ci/vercel-ignore.sh`, ramo preview: builda só se `git diff --name-only $VERCEL_GIT_PREVIOUS_SHA..HEAD`
  toca `src/`, `public/`, `vercel.json`, `package*.json`, `astro.config.mjs`, `middleware.js`, `scripts/fetch-*`,
  `scripts/copy-wasm.mjs`, `scripts/prune-dist.mjs`, `scripts/aeo.mjs`, `tools/gen-asset-rev.mjs`,
  `tools/viewmodels/prepare_precision_preview.mjs`, `tools/audio/`, `tools/strip-decal-bg.mjs` ou `CHANGELOG.md`.
  `staging`, `main` e `lote-*` buildam sempre. Sem `VERCEL_GIT_PREVIOUS_SHA` (primeiro push da branch) ou com o
  SHA fora do clone raso da Vercel (`--depth=10`): builda. O script só sai 0 ou 1; qualquer outro código a Vercel
  trata como deploy falho. Produção não mudou (só `chore(release):`). O preview de PR que o bot comenta vem do
  `preview-deploy.yml` (`vercel deploy --prebuilt`), não da integração Git, então pular o build da integração não
  tira o preview de ninguém. Régua: `npm run eval:vercelignore` (3 mutantes), no pr-fast.
- Cache dos packs: `fetch-audio.sh` e `fetch-decals.sh` guardam o zip em `node_modules/.cache/csb-packs/` (chave
  = sha + URL do pack; a Vercel preserva `node_modules` entre builds) e `fetch-viewmodels.mjs` guarda cada asset
  por sha256 em `.../csb-packs/viewmodels/`. A pasta só nasce com `VERCEL=1`; sem ela (máquina local) nada muda.
  Zip em cache que falha no sha/`unzip -t` é descartado e baixado de novo. Pack público sem sha (release do
  GitHub) só invalida trocando a tag na URL. Para limpar: "Redeploy" sem "Use existing Build Cache" no painel.
- Logs por requisição: `middleware.js` e `src/pages/api/[rota].ts` só emitem a PRIMEIRA ocorrência de cada causa
  por instância (`[server-traffic] ingest …`, `[x-conversion] delivery failed`). Os `console.error` de OG/badge
  (erro real de render) continuam.
- O que a fatura seguinte deve mostrar: Build CPU Minutes bem abaixo de 60 h (preview só em PR que toca o site),
  Blob Data Transfer perto de zero (packs servidos do cache), Observability Events abaixo de 1 M. Se Build
  continuar alto, conferir no painel quais deploys de preview buildaram e o log `vercel-ignore:` de cada um.

## Segredos: destino na Cloudflare

| Hoje (Vercel) | Depois | Como |
|---|---|---|
| `API_PROXY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `X_PIXEL_TOKEN` | `wrangler secret put <NOME>` | cifrado; não aparece em `wrangler.toml` nem em logs; rotacionar na virada |
| `PUBLIC_API_BASE`, `GOOGLE_SITE_VERIFICATION`, `RANKING_ON` | `[vars]` no `wrangler.toml` | texto, não é segredo |
| `SUPABASE_URL` | `[vars]` | URL pública do projeto |
| `BLOB_READ_WRITE_TOKEN`, `VM_BLOB_*` | token de R2 (`wrangler r2`) | packs saem do Vercel Blob para R2 (egress zero) |
| `VERCEL_GIT_COMMIT_SHA` | `CF_PAGES_COMMIT_SHA` / `GITHUB_SHA` passado no build | `window.__CS_BUILD.sha` continua igual |
| `VERCEL_TOKEN/ORG_ID/PROJECT_ID` (GitHub) | somem | `CF_API_TOKEN` já existe; precisa de permissão Workers Scripts:Edit |

Regra que fica: `.env.example` documenta cada chave; nenhum segredo em `[vars]`; nenhum `PUBLIC_*` com cara
de token (régua `vercel-env-security-check` → renomear).

## Comandos

```bash
# spike local
cd worktrees/feat-cloudflare-spike && npm ci && npm run build && npx wrangler dev
# publicar o spike (conta rubenmarcus.dev; `npx wrangler login` abre o browser: usar o perfil rubenmarcus.dev do Ego)
npx wrangler deploy
# paridade com produção (o script lista rota, status, headers que diferem)
node tools/eval/cf-paridade-check.mjs --alvo https://<worker>.workers.dev
```

## Decisões tomadas (não reabrir sem o dono)

- Não migrar durante release pesada (passe de batalha). Spike e fase 0 podem andar; virada só depois.
- Infisical/Doppler: não. Com ~20 segredos e 1 dono, Cloudflare + GitHub já são cofres suficientes; a
  migração reduz de 3 cofres para 2.
- Backend continua no Cloud Run; este runbook não toca em `csbrasil-backend`, exceto a rotação de
  `API_PROXY_SECRET` combinada na fase 4.

## Status (atualizar a cada PR)

| Data | PR | O que mudou | Próximo passo |
|---|---|---|---|
| 2026-11-09 | — | runbook criado; worktrees `chore/vercel-custos-fase0`, `feat/cloudflare-spike`, `chore/eval-lixo-bloco1` abertas | L1 e L2 em paralelo |
