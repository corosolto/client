# vigia-cron — o relógio do monitoramento

O `schedule` do GitHub Actions descarta disparo agendado sob carga. Medido pela API do GitHub
em 11/2026:

| workflow | agenda | previsto | rodou | janela |
|---|---|---|---|---|
| `client/prod-watch.yml` | a cada 15 min | 672 | 27 (~4%) | 7 dias |
| `client/ops-diag.yml` | minuto 17 de toda hora | 240 | 32 (~13%) | 10 dias |
| `backend/sync-nodes.yml` | a cada 30 min | 336 | 22 (~7%) | 7 dias |

A vigilância de produção ficava horas sem olhar o edge e ninguém via o buraco. O relógio
primário agora é um Worker da Cloudflare com Cron Triggers, que dispara o `workflow_dispatch`
desses workflows (`POST /repos/<repo>/actions/workflows/<arquivo>/dispatches` com
`{"ref":"main"}`). O trabalho continua no GitHub Actions; só o relógio mudou.

## Rede de segurança: o `schedule` fica

`prod-watch.yml` e `ops-diag.yml` mantêm o `schedule` de sempre. Se o Worker cair ou o deploy
dele falhar, o cron do GitHub (que ainda dispara ~4–13% das vezes) continua batendo. Quando os
dois disparam no mesmo tique, a rodada em dobro é inofensiva:

- `prod-watch`: o probe só lê. O purge do edge já roda a cada disparo, então um a mais só
  esvazia de novo o mesmo prefixo. O aquecimento só roda no `deployment_status`. Um
  `prod-crash` repetido cai no `concurrency` por fingerprint do `crash-fix.yml`, e fechar uma
  issue já fechada não faz nada.
- `ops-diag`: a diagnose só lê. O `concurrency: ops-diag` (sem cancelamento) enfileira a
  segunda rodada, e a issue é uma por incêndio (a segunda comenta ou fecha a mesma).

## Onde mora

- `workers/vigia-cron/index.mjs`: handler `scheduled` (só ele: o runtime recusa outro export
  no módulo principal).
- `workers/vigia-cron/dispara.mjs`: mapa cron → workflow (`ALVOS`) e o disparo.
- `workers/vigia-cron/wrangler.toml`: os Cron Triggers (UTC), sem rota nem URL pública.
- `workers/vigia-cron/contrato.mjs`: o que um workflow alvo precisa ter para o dispatch dar 204
  (`workflow_dispatch`, nenhum input obrigatório).
- `tools/ops/tests/vigia-cron.test.mjs` (roda no `ops:test` e no deploy): crons do
  `wrangler.toml` = chaves de `ALVOS`, cada cron dispara o workflow certo com o token certo,
  erro HTTP vai para o log sem o token, e os alvos do client cumprem o contrato e mantêm o
  `schedule`.
- `workers/vigia-cron/confere-alvos.mjs` (no deploy, antes de publicar), com os tokens do Worker:
  lê da `main` de cada repo todos os workflows alvo (inclusive o `backend/sync-nodes.yml`) e
  confere o contrato; depois DISPARA cada alvo uma vez e exige 204. Ler o YAML só prova
  leitura; o 204 prova Actions: write. Não usamos ref sentinela inexistente esperando 422:
  nada documenta que o GitHub checa a permissão antes de validar a ref. A rodada extra é a de
  um tique do Worker e só acontece quando ele é publicado; 401/403/404/422 reprovam o deploy
  com o motivo no log.
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
| `"status":401` | token revogado ou expirado | renove o PAT e rode `vigia-cron-deploy` de novo (o preflight do deploy já reprova com 401) |
| `"status":403` / `"status":404` | token sem Actions: write no repo | ajuste o escopo do PAT (tabela acima); o preflight do deploy reprova nesse caso |
| `"status":422` | workflow sem `workflow_dispatch` na `main` ou input obrigatório | o `confere-alvos.mjs` barra o deploy nesse caso; se o YAML mudou depois do deploy, conserte o workflow ou rode o deploy de novo para ver o erro |
| `segredo … ausente` | deploy sem o secret | cadastre o secret no repo e rode o deploy |
| `cron sem alvo` | `wrangler.toml` e `ALVOS` divergiram | o `ops:test` reprova isso no PR |

## Prova local

```bash
npx wrangler dev --test-scheduled --config workers/vigia-cron/wrangler.toml --var GITHUB_TOKEN_CLIENT:invalido
curl "http://localhost:8787/__scheduled?cron=*/15+*+*+*+*"   # log: {"workflow":"prod-watch.yml","status":401,…}
```
