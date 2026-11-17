# vigia-cron — o relógio do monitoramento

O `schedule` do GitHub Actions descarta disparo agendado sob carga. Medido pela API do GitHub
em 11/2026:

| workflow | agenda | previsto | rodou | janela |
|---|---|---|---|---|
| `client/prod-watch.yml` | a cada 15 min | 672 | 27 (~4%) | 7 dias |
| `client/ops-diag.yml` | minuto 17 de toda hora | 240 | 32 (~13%) | 10 dias |
| `backend/sync-nodes.yml` | a cada 30 min | 336 | 22 (~7%) | 7 dias |

A vigilância de produção ficava horas sem olhar o edge e ninguém via o buraco. O relógio saiu
do GitHub e foi para um Worker da Cloudflare com Cron Triggers, que dispara o
`workflow_dispatch` desses workflows (`POST /repos/<repo>/actions/workflows/<arquivo>/dispatches`
com `{"ref":"main"}`). O trabalho continua no GitHub Actions; só o relógio mudou.

## Onde mora

- `workers/vigia-cron/index.mjs`: handler `scheduled` (só ele: o runtime recusa outro export
  no módulo principal).
- `workers/vigia-cron/dispara.mjs`: mapa cron → workflow (`ALVOS`) e o disparo.
- `workers/vigia-cron/wrangler.toml`: os Cron Triggers (UTC), sem rota nem URL pública.
- `tools/ops/tests/vigia-cron.test.mjs` (roda no `ops:test`): crons do `wrangler.toml` = chaves
  de `ALVOS`, cada cron dispara o workflow certo com o token certo, erro HTTP vai para o log sem
  o token, workflows alvo do client têm `workflow_dispatch` e não têm mais `schedule`.
- `.github/workflows/vigia-cron-deploy.yml`: publica em push na `main` que toca a pasta, ou
  manualmente (`gh workflow run vigia-cron-deploy.yml -R corosolto/client --ref main`).

## Segredos

O deploy publica código, crons e segredos numa versão só: `wrangler deploy --secrets-file
/dev/stdin` recebe pelo pipe um JSON montado do ambiente do passo (JSON não passa pela
expansão de `$VAR` do dotenv; o valor não vai para disco, log nem argumento de comando).

| no Worker | vem de (Actions secret do client) | permissão necessária |
|---|---|---|
| `GITHUB_TOKEN_CLIENT` | `CSBRASIL_BOT_TOKEN` | Actions: write em `corosolto/client` (PAT clássico: `repo`) |
| `GITHUB_TOKEN_BACKEND` | `BACKEND_DISPATCH_TOKEN` | Actions: write em `corosolto/backend` (PAT clássico: `repo`) |

O deploy usa `CLOUDFLARE_ACCOUNT_ID` (variável) e `CF_WORKERS_TOKEN` (Workers Scripts: Edit),
os mesmos do `cf-staging-deploy.yml`.

## Conferir se está batendo

```bash
# disparos chegando (um a cada 15 min / de hora em hora / a cada 30 min)
gh run list -R corosolto/client  -w prod-watch.yml -e workflow_dispatch -L 5
gh run list -R corosolto/client  -w ops-diag.yml   -e workflow_dispatch -L 3
gh run list -R corosolto/backend -w sync-nodes.yml -e workflow_dispatch -L 3

# log do Worker: todo disparo loga {"workflow":…,"status":204}; falha sai em erro com o
# status e a mensagem do GitHub, e a invocação termina em exceção (o painel conta como erro)
npx wrangler tail vigia-cron
```

| sintoma no log | causa | conserto |
|---|---|---|
| `"status":401` | token revogado ou expirado | renove o PAT e rode `vigia-cron-deploy` de novo |
| `"status":403` / `"status":404` | token sem Actions: write no repo | ajuste o escopo do PAT (tabela acima) |
| `"status":422` | workflow sem `workflow_dispatch` na `main` ou input obrigatório | o teste do `ops:test` cobre o client; no backend, confira o YAML |
| `segredo … ausente` | deploy sem o secret | cadastre o secret no repo e rode o deploy |
| `cron sem alvo` | `wrangler.toml` e `ALVOS` divergiram | o `ops:test` reprova isso no PR |

## Prova local

```bash
npx wrangler dev --test-scheduled --config workers/vigia-cron/wrangler.toml --var GITHUB_TOKEN_CLIENT:invalido
curl "http://localhost:8787/__scheduled?cron=*/15+*+*+*+*"   # log: {"workflow":"prod-watch.yml","status":401,…}
```
