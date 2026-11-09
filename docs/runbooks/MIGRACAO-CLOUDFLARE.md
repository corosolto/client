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
| 0. Cortes na Vercel | preview só quando o site muda (`vercel-ignore.sh` para `VERCEL_ENV=preview`), packs em cache de build, `console.*` por requisição fora | fatura do ciclo seguinte: Build < 60 h, Observability < 1 M eventos | PR #1258 aberto (branch `chore/vercel-custos-fase0`); ver "Fase 0: o que ficou" |
| 1. Spike | `@astrojs/cloudflare` no lugar de `@astrojs/vercel`; `wrangler.toml`; `_headers`/`_redirects` **gerados** de `vercel.json` por script (uma fonte, régua de paridade); `middleware.js` → middleware do Astro lendo `cf-connecting-ip`; `buildCommand` reproduzido no build do Workers | deploy em `*.workers.dev` com mesmos status/headers que produção em: `/`, `/en`, `/api/geo-lang`, `/api/og/pagina.png`, `/u/<perfil>`, `/mapa`, `/sala/x`, `/sitemap.xml`, `/api/health` (proxy); `check:seo`, `canonical-host-check`, `game-pages-check`, `site-smoke` rodando contra esse host | feito (PR do spike, ver seção "Fase 1: resultado do spike"); `site-smoke` fica para a fase 2 (precisa de preview por PR) |
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

## Fase 1: resultado do spike (09/11/2026)

Spike no ar: `https://csb-spike.rubenmarcus-dev.workers.dev` (Worker `csb-spike`, conta rubenmarcus.dev; sem DNS, sem segredos).
Build: `npm run build:cf` (= gera `_headers`/`_redirects` de `vercel.json` + `ADAPTER=cloudflare npm run build`); deploy: `npx wrangler deploy`.
Paridade com produção (`node tools/eval/cf-paridade-check.mjs --alvo <url>`): 19 rotas, 18 idênticas em status e headers
comparados (CSP, HSTS, cache-control, x-content-type-options, referrer/permissions-policy, content-type, location); a única
diferença é `/api/badge` (503 `not_configured` sem Supabase no spike, 404 na produção).

O que ficou no repo (o build padrão continua Vercel; `ADAPTER=cloudflare` liga o resto):
- `astro.config.mjs`: adaptador por env; aliases `#borda` e `#borda-imagem` apontam para `src/lib/borda/<alvo>*.ts`
  (IP do cliente, `waitUntil`, wasm do resvg, avatar, retrato). `session: false` no Cloudflare (senão o adaptador exige KV).
- `wrangler.toml`: `main = src/cf/worker.ts` (embrulha o handler do `@astrojs/cloudflare`), `nodejs_compat`, assets em
  `dist/client` com `not_found_handling = "none"` (com `404-page` o asset layer responde 404.html e NENHUMA rota SSR roda) e
  `html_handling = "drop-trailing-slash"` (canonical do site é sem barra; `auto` mandaria 307 `/en` -> `/en/`);
  `run_worker_first = ["/"]` só para os redirects por query da home.
- `tools/cf/gen-headers-redirects.mjs` -> `public/_headers` e `public/_redirects` (gitignored, gerados no build). Régua
  `eval:cfparidade` (2 mutantes) cobra que toda regra de `vercel.json` tem contraparte.
- `src/lib/regras-vercel.mjs` + `src/cf/worker.ts`: o que o formato estático NÃO expressa roda no Worker: os 16 redirects com
  `has`/`missing` de query (`/?janela=...`, `/?secao=...`, repassando a query como a Vercel faz), a regra regex de
  `-runtime.glb` (no `_headers` vai aproximada como `/private-assets/viewmodels/*-runtime.glb`), os headers de `vercel.json`
  em respostas SSR (o `_headers` só vale para asset) e o `cache-control: public, max-age=0, must-revalidate` que a Vercel põe
  em SSR sem cache-control.
- `src/middleware.ts`: porta de `middleware.js` (contagem de tráfego); no-op na Vercel, no Workers lê `cf-connecting-ip` e usa
  `locals.cfContext.waitUntil`. `middleware.js` continua intacto para a Vercel.
- OG, badge e profile-card renderizam com `@resvg/resvg-wasm` nas duas bordas (`src/lib/png.ts`). O `resvg-js` nativo e o
  `sharp` saíram dessas rotas: no Workers o wasm só entra como módulo compilado (`import x from '*.wasm'`;
  `WebAssembly.instantiate(bytes)` dá "Wasm code generation disallowed by embedder"). Avatar da badge vai cru para o resvg
  (PNG/JPEG/GIF; outro formato cai no personagem). Os 63 retratos do profile-card deixam de ser data URI inline no Cloudflare
  (13 MB gzip, acima do teto de 10 MB do Worker) e viram `public/img/social-card/<id>.png`, lidos pelo binding `ASSETS`.
- `canonical-host-check` e `game-pages-check` aceitam `CSB_SSR_BASE=<url>` (o handler importa `cloudflare:workers` e não roda em
  Node); com `wrangler dev` + `tools/cf/backend-fake.mjs` passaram 6/6 e 71/71, mutantes mordendo; `seo-check` roda em
  `dist/client` sem mudança.

Números: Worker 4,65 MB (1,73 MB gzip) + wasm 2,4 MB; 3 601 assets (897 MB com áudio/decalques, upload de 4 min na primeira vez,
depois só o delta); `Worker Startup Time` 15–21 ms no deploy; TTFB de `/api/geo-lang` 50–60 ms (produção 210–225 ms),
`/api/og` 100–270 ms, `/mapa` 25–60 ms. Audio e decalques vêm de release pública do GitHub e entraram no build; viewmodels
(`fetch-viewmodels`) precisam de `BLOB_READ_WRITE_TOKEN` e ficaram fora.

Diferenças que não são bug, mas o comparador normaliza (documentar na virada):
- `s-maxage`/`stale-while-revalidate`: a Vercel consome e tira da resposta; o Workers repassa ao navegador. E a CDN da Cloudflare
  NÃO cacheia resposta de Worker por `s-maxage`: `/api/og` e `/mapa` viram render por hit até a fase 3 usar `caches.default`.
- `content-type` de asset sai sem `; charset=utf-8` (o HTML tem `<meta charset>`).
- redirect estático (`/discord`, `/jogar`) sai com CSP/HSTS completos no Workers (a Vercel resolve antes das regras de header).

O que as fases 2–4 têm que tratar (lista fechada, achada no spike):
1. Segredos no build, não no runtime: `import.meta.env.API_PROXY_SECRET`, `SUPABASE_*`, `X_PIXEL_TOKEN`, `PUBLIC_API_BASE` são
   INLINADOS pelo Astro no bundle (`segredo: ""` no chunk). Na Vercel funciona porque o build roda com as envs; no Workers
   `wrangler secret put` não chega a esse código. Trocar essas leituras por `process.env` (populado pelo `nodejs_compat`) ou
   `astro:env/server` (`getSecret`) antes da fase 3. `[vars]` do `wrangler.toml` entram em `process.env` NO BUILD pelo
   adaptador (`loadWranglerEnv`) e sobrescrevem a env do shell; `.dev.vars` (gitignored) sobrepõe localmente.
2. `fetch-viewmodels` com token de Blob (ou R2) no build do Workers; `strip:decalbg`, `assert:assets`, `audio:check` e
   `check:vercel` do `buildCommand` ainda não estão no `build:cf`.
3. Cache de SSR (`/api/og`, `/mapa`, sitemap) via `caches.default` no `src/cf/worker.ts`, honrando `s-maxage`.
4. `/api/badge` sem `sharp`: aceitar o avatar cru (feito) e medir se o recorte circular do resvg basta; senão Cloudflare Images.
5. Réguas que importam `.vercel/output` (`cla-ssr-check`, `perfil-abas-check`, `profile-*-check`, `ssr-render-check`,
   `prune-check`): seguir o padrão `CSB_SSR_BASE` de `canonical-host-check` ou rodar contra o preview da fase 2.
6. `geo-lang` e `origemDoJogador` já leem `cf-ipcountry`/`cf-ipcity`; o Managed Transform de localização precisa estar ligado
   na zona (pendência do dono) para a cidade chegar.
7. `window.__CS_BUILD.sha`: `VERCEL_GIT_COMMIT_SHA` vira `GITHUB_SHA` no build.
8. O `_headers` tem 16 blocos (teto 100) e a maior linha é a CSP (~700 chars, teto 2000): folga, mas `eval:cfparidade` vigia.
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
# spike local (build com ADAPTER=cloudflare + _headers/_redirects gerados)
cd worktrees/feat-cloudflare-spike && npm ci && npm run build:cf && npx wrangler dev --config dist/server/wrangler.json
# perfil de fixture local: node tools/cf/backend-fake.mjs e PUBLIC_API_BASE em .dev.vars (ver cabeçalho do script)
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
| 2026-11-09 | #1258 | fase 0: `vercel-ignore.sh` filtra preview por diff desde o último deploy (régua `eval:vercelignore`, 3 mutantes, no pr-fast); zips de áudio/decalques e assets do viewmodel em `node_modules/.cache/csb-packs/`; `middleware.js` e `/api/[rota]` logam uma vez por instância e causa; runbook commitado | dono mergeia; na fatura do ciclo seguinte esperar Build CPU < 60 h (preview só em PR que toca o site), Blob Data Transfer perto de zero, Observability < 1 M eventos. Se Build seguir alto, abrir os deploys de preview no painel e ler a linha `vercel-ignore:` de cada um |
| 2026-11-09 | spike | fase 1: `csb-spike` no ar em workers.dev com 18/19 rotas idênticas à produção; adaptador por `ADAPTER`; `_headers`/`_redirects` gerados; middleware portado; OG/badge/profile-card em resvg-wasm nas duas bordas; `eval:cfparidade` e `cf-paridade-check` | dono mergeia; fase 2 começa pelo item 1 da lista (segredos em runtime) e pelo preview por PR |
