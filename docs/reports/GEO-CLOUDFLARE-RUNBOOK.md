# Geo da telemetria: remendo de hoje e conserto definitivo (backend#22)

Escrito em 23/09/2026, antes da campanha de 29–30/09. Quem executa precisa de acesso ao
dashboard da Cloudflare (zona `csbrasil.online`), ao projeto da Vercel e ao projeto GCP
`csbrasil-backend` (Secret Manager e Cloud Run). **Nenhum passo daqui foi executado pelo agente**:
nada foi publicado, nenhum segredo foi criado, nada foi escrito no banco.

## O defeito, em três linhas

- O jogo chama as rotas de banco direto no Cloud Run (`csbrasil-backend-…run.app`), que é
  servido pelo Google Front End: **nenhuma borda injeta país/cidade**.
- `geoFrom` (backend `api/_lib/geo.ts`) só lê `cf-ip*` / `x-vercel-ip-*`. Resultado: `city_daily`
  congelado desde 2026-08-30T02:41:50Z, 88,9% das linhas de presença sem geo, `/api/health`
  com `stale: ["city"]` — e todas as rotas respondendo 200.
- `docs/APIS.md` afirmava que o backend ficava atrás da Cloudflare. Não fica (corrigido).

Medido em 23/09 (GET somente leitura): `www.csbrasil.online` responde com `server: cloudflare` +
`x-vercel-id` (Cloudflare → Vercel); `/api/health` pelo proxy do site responde 200 com
`stale:["city"]`.

## Parte 1 — remendo (hoje)

Os PRs do remendo mandam `telemetry`, `presence`, `heartbeat`, `submit-match` e `perf` pelo
proxy same-origin do site (`/api/[rota]` na Vercel). O proxy:

- se o salto que a Vercel vê é de uma faixa da Cloudflare, usa `cf-connecting-ip` como IP e
  `cf-ipcountry` (+ `cf-ipcity`/lat/lon quando o Managed Transform estiver ligado) como geo, e
  **não** sobe `x-vercel-ip-*` (que nesse caso descreve o PoP, não o jogador);
- fora das faixas (preview `*.vercel.app`), sobe `x-vercel-ip-*` e o IP da Vercel;
- prova a origem ao backend com `x-csb-proxy-auth` = `API_PROXY_SECRET` e manda o IP do jogador
  em `x-csb-client-ip`.

O backend (`api/_lib/borda.mjs`) só aceita geo e `x-csb-client-ip` com essa prova. Sem o
segredo configurado ele se comporta como hoje (modo `legado`).

### 1.1 Segredo compartilhado

1. Gere um valor aleatório de 64 hex **no seu terminal** (não cole em chat, issue nem git):
   `openssl rand -hex 32`.
2. GCP (projeto `csbrasil-backend`), com credencial administrativa:
   ```bash
   printf %s "$VALOR" | gcloud secrets create api-proxy-secret --data-file=- --project csbrasil-backend
   # já existe? use: gcloud secrets versions add api-proxy-secret --data-file=-
   ```
   Depois **ou** `terraform apply` em `terraform/` (o PR do backend acrescenta o segredo, o IAM
   e a env `API_PROXY_SECRET` do serviço), **ou**, sem Terraform:
   ```bash
   gcloud secrets add-iam-policy-binding api-proxy-secret --project csbrasil-backend \
     --member "serviceAccount:<SA do csbrasil-backend>" --role roles/secretmanager.secretAccessor
   gcloud run services update csbrasil-backend --region southamerica-east1 --project csbrasil-backend \
     --update-secrets API_PROXY_SECRET=api-proxy-secret:latest
   ```
   O `terraform apply` falha se o segredo não tiver versão: crie a versão antes.
3. Vercel → projeto do site → Settings → Environment Variables → `API_PROXY_SECRET` com o mesmo
   valor, escopos **Production** e **Preview**. O Astro embute a env no build: ela só vale a
   partir do próximo deploy (e rotacionar exige redeploy).

### 1.2 Cloudflare (zona `csbrasil.online`)

1. Network → **IP Geolocation: On** (é o que manda `CF-IPCountry`; costuma vir ligado).
2. Rules → Transform Rules → **Managed Transforms** → ligar **"Add visitor location headers"**.
   Sem isto chega só o país: `country_daily` (migration 036) volta, `city_daily` continua parado
   — lacuna declarada, não número inventado.

### 1.3 Ordem de publicação

O push na `main` do backend **publica sozinho** (GitHub Actions → Cloud Run); o merge do cliente
publica na Vercel. Ordem:

1. Segredo no Secret Manager + env no Cloud Run + env na Vercel (1.1).
2. Merge do PR do backend (borda) → deploy automático. Confira:
   `curl -s https://csbrasil-backend-hupd3weo5q-rj.a.run.app/health` → `"borda":{"proxySite":true,…}`.
3. Merge do PR do cliente (remendo) → deploy da Vercel.
4. Managed Transform (1.2) pode vir a qualquer momento.

**Não inverta.** Por que o backend antes: com o backend antigo, o IP de rate limit das rotas que passam pelo
proxy sai da heurística do `x-forwarded-for` (penúltimo salto), que não foi medida para esse
caminho. `submit-match` tem teto de 1 partida / 30 s por IP — se o IP colapsar no salto da
Vercel, o ranking trava para todo mundo. Com o backend novo e o segredo, o IP vem explícito
em `x-csb-client-ip`.

Antes do passo 3, confira que o deploy da Vercel feito **depois** de criar a env já está no ar
(a env é embutida no build: env criada sem redeploy = proxy sem prova).

### 1.4 Verificação (30 min depois do deploy do cliente)

- `curl -s <run.app>/health` → `borda.modos.site` subindo e `borda.modos.direto` parado. `direto`
  subindo depois do passo 3 = segredo divergente entre Vercel e Cloud Run: a geo é descartada e o
  IP de rate limit vira o salto da Vercel. Corrija o segredo ou reverta o cliente na hora.

```sql
-- somente leitura
select pipeline, last_success_at from telemetry_ingest_health where pipeline in ('city','country','telemetry','presence');
select country, count(*) from presence_anon where last_seen > now() - interval '30 minutes' group by 1 order by 2 desc;
select city, country, matches from city_daily where day = (now() at time zone 'America/Sao_Paulo')::date order by matches desc limit 20;
```

- `presence_anon` recente com país preenchido em quase todas as linhas.
- Com o Managed Transform ligado, `city_daily` do dia com **muitas** cidades. Se aparecerem só
  cidades de PoP (São Paulo, Rio, Fortaleza, Miami, Atlanta…), a geo está vindo do PoP: pare e
  investigue antes da campanha.
- `/api/health` sem `city` em `stale` depois da primeira partida concluída com cidade.

Custo e limites: presença (a cada 45 s por aba visível), heartbeat, telemetria, perf e submit
passam a ser invocações de função da Vercel (prazo de 10 s no proxy). Confira o plano da Vercel
(invocações e concorrência) antes da campanha; o Cloud Run já tem `min_instance_count = 1`.

### 1.5 Reverter

- Cliente: reverter o PR → as cinco rotas voltam ao `run.app` (geo morre de novo, nada mais).
- Backend: remover a env `API_PROXY_SECRET` do serviço → modo `legado` (aceita header como antes).

### Hipótese a conferir: a geo de 07/08 a 30/08 pode ser do PoP

A Cloudflare entrou na frente da Vercel em 07/08 (`docs/runbooks/cdn-cloudflare.md`). Se a
Vercel vê o IP da Cloudflare como cliente, o `x-vercel-ip-city` desse período é a cidade do PoP,
não do jogador — e as 8.312 linhas de Atlanta de 13/08 em `presence_anon` batem com o PoP ATL
da Cloudflare. Conferir antes de usar o histórico:

```sql
select date_trunc('week', day) semana, count(distinct city) cidades, sum(matches) partidas
from city_daily where day between '2026-07-20' and '2026-08-30' group by 1 order by 1;
```

Queda brusca de cidades distintas a partir de 07/08 confirma a hipótese; nesse caso o histórico
de cidade desse período deve ser marcado como "cidade do PoP" no admin, não corrigido.

## Parte 2 — conserto definitivo (depois da campanha)

Objetivo: o navegador fala com `https://api.csbrasil.online`, **proxied** pela Cloudflare, que
injeta país/cidade e `CF-Connecting-IP`; o Cloud Run só aceita tráfego vindo da Cloudflare; o
proxy da Vercel sai do caminho quente.

1. **Origem para `api.csbrasil.online`** — escolha uma e confirme no console:
   - *Cloud Run domain mapping*: mais simples, mas não existe em todas as regiões; confira se
     `southamerica-east1` aparece em Cloud Run → Manage custom domains. Não permite restringir
     origem por IP.
   - *Load Balancer HTTPS externo global* com NEG serverless apontando para `csbrasil-backend`,
     certificado gerenciado (ou Cloudflare Origin CA) e **Cloud Armor** permitindo só as faixas
     de `https://www.cloudflare.com/ips/`. É o caminho que permite travar o ingress.
2. DNS na Cloudflare: `api` → origem escolhida, nuvem **laranja**; SSL **Full (strict)**;
   Cache Rule de **bypass** para `api.csbrasil.online/*`.
3. Managed Transform "Add visitor location headers" (já ligado na Parte 1 — vale para a zona).
4. **Travar o ingress** do Cloud Run: `ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"` em
   `terraform/main.tf` (com o LB + Cloud Armor acima). Sem isso, qualquer um chama o `run.app`
   forjando `cf-*`.
5. Só **depois** do passo 4: env `CONFIAR_CLOUDFLARE=1` no Cloud Run. O backend passa a ler o IP
   de `cf-connecting-ip` (`trustedClientIp`, `api/_lib/client-ip.mjs`) e a geo de `cf-*`,
   descartando `x-vercel-ip-*` (régua `npm run eval:borda`, cláusulas B5/B6).
6. Cliente: trocar o `BASE` de `public/js/apibase.js` e o `PUBLIC_API_BASE` da Vercel para
   `https://api.csbrasil.online`, e esvaziar `VIA_SITE` (as rotas de geo voltam a ir direto,
   agora com borda). `eval:apis` e `eval:geoproxy` precisam ser ajustadas no mesmo PR.
7. Verificação: a mesma da 1.4, mais `curl -sI https://api.csbrasil.online/health` com
   `server: cloudflare`, e `curl -s <run.app>/health` **recusado** depois do passo 4.

Reverter: `CONFIAR_CLOUDFLARE` fora, ingress de volta a `INGRESS_TRAFFIC_ALL`, `BASE` de volta.

## O que mais mente nos números (estado em 23/09)

| # | defeito | onde | estado |
|---|---|---|---|
| a | saída do MP não chama `sendTelemetry`; sem `gameType`; sem `game_started` no banco | `public/js/main.js` `mpDesconectou`/`mpSair` | PR de DAU (rascunho) + migration 036 |
| b | dia em UTC (`current_date`) × admin em America/Sao_Paulo | RPCs de 012/021 | migration 036 (`dia_sp()`); `game_report_summary` (032) ainda em UTC |
| c | `mp_session`/`mp_round` com `clientSha` do nó (alpha.250), não do navegador | backend `game/index.js` | PR de DAU: navegador manda `csha` no join |
| d | 8.312 linhas de Atlanta em 13/08 em `presence_anon`, sem marca de bot/UA | `presence_anon` | aberto — ver a hipótese do PoP acima antes de chamar de bot |
| e | `trustedClientIp` pega o penúltimo `x-forwarded-for` | backend `api/_lib/client-ip.mjs` | não medido no Cloud Run; o caminho do proxy não depende mais disso; `cf-connecting-ip` atrás de flag |
