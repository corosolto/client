# Onde mora cada rota `/api`

As rotas que tocam o banco saíram deste repositório. Este documento diz **o que saiu, o que
ficou e por quê** — o código carrega ponteiros de duas linhas para cá, que é a regra da casa.

## O que a migração foi buscar

Tirar o `SUPABASE_SERVICE_ROLE_KEY` das variáveis de ambiente da Vercel. Ele é a chave que
ignora RLS: quem a tem faz o que quiser no banco. Ela estava num projeto de front-end público,
ao lado do código do jogo.

## Rotas servidas pelo backend

`acquisition` · `avatar` · `feedback` · `funnel` · `health` · `heartbeat` · `jserror` ·
`leaderboard` · `map-plays` · `match` · `mp-ticket` · `online` · `perf` · `pick` · `presence` · `register` ·
`submit-match` · `telemetry` · `train-frames`

Agora em `corosolto/backend`, em `api/`. `mp-ticket` nasceu ali; as demais vieram do cliente.
**A lógica de negócio migrada não foi reescrita**: as rotas do
Astro já usavam `Request`/`Response` padrão da Web, que o Node tem nativo, então o que mudou foi
o transporte — os arquivos foram copiados e só os `import` e a fonte das variáveis de ambiente
mudaram. Trocar código provado em produção por código novo no mesmo commit em que ele muda de
casa seria misturar dois riscos.

## As 3 que ficaram, e o motivo de cada uma

| Rota | Por que fica |
|---|---|
| `geo-lang` | Lê o país no header `x-vercel-ip-country`, que **a borda da Vercel injeta**. Fora de lá não há o que ler — é a única rota cuja função depende de onde ela roda. |
| `og/<tipo>.png` | Cartão social **do site**. Servi-lo de outro domínio faria a imagem de compartilhamento depender de uma VM. |
| `badge/<...>.png` | Crachá **do site**, mesma razão. É a única que ficou e ainda lê o banco. |

## Como o cliente escolhe o destino

`public/js/apibase.js` — `apiUrl('/api/x')` devolve o Cloud Run do backend para as migradas em
produção (menos as cinco de geo, que vão pelo proxy do site — ver abaixo) e caminho relativo nos
previews `*.vercel.app`. Rota desconhecida cai em relativo de
propósito: o padrão seguro é "fica onde sempre esteve". `?api=1` aponta para
`localhost:8080`; `?api=<url>` para outro backend. A régua cobra os dois caminhos.

`src/pages/api/[rota].ts` é rede de segurança para cliente antigo e o caminho normal do
preview: faz proxy server-side para o backend, preservando método, corpo e query. Só repassa
`content-type`, o IP e a geo do jogador (seção abaixo) e a prova de origem; cookies, `authorization` e headers arbitrários do
navegador não atravessam. Assim o preview usa caminho relativo — inclusive com Deployment
Protection — sem abrir o CORS do Cloud Run para origens dinâmicas e sem receber credencial do
Supabase.

Ela é `[rota]` e não `[...rota]` porque o coringa de múltiplos segmentos **engolia**
`og/<tipo>.png` e `badge/<...>.png` — medido: o 404 que voltava vinha dela. Um segmento só
nunca alcança subpasta.

## A geo se perdeu — e o remendo (backend#22)

Cinco rotas migradas gravam país/cidade ou usam o IP no rate limit: `telemetry`, `presence`,
`heartbeat`, `submit-match` e `perf`. Este documento dizia que o backend ficava atrás da
Cloudflare; **não fica**: o jogo chamava o `run.app` direto, sem borda nenhuma, e o `geoFrom` do
backend (que só lê header de borda) nunca mais viu país nem cidade. `city_daily` congelou em
2026-08-30T02:41:50Z e 88,9% das linhas de presença ficaram sem geo — tudo respondendo 200.

**Remendo em vigor:** `apiUrl` manda essas cinco (`VIA_SITE` em `apibase.js`) pelo proxy
same-origin (`src/lib/api-proxy.mjs`). O proxy sobe **uma** fonte de geo por requisição:

- salto vindo de faixa da Cloudflare (o site fica atrás dela): IP = `cf-connecting-ip`, geo =
  `cf-ipcountry` e, se o Managed Transform "Add visitor location headers" estiver ligado na zona
  do site, `cf-ipcity`/lat/lon. O `x-vercel-ip-*` desse salto descreve o PoP e **não** sobe;
- fora das faixas da Cloudflare (preview `*.vercel.app`): `x-vercel-ip-*` e o IP da Vercel.

O proxy prova a origem com `x-csb-proxy-auth` = `API_PROXY_SECRET` (env da Vercel, mesmo valor
do Secret Manager `api-proxy-secret` do backend). Com o segredo configurado no backend, chamada
direta ao `run.app` perde a geo e não escolhe IP. Régua: `npm run eval:geoproxy`.

**Conserto definitivo** (API atrás da Cloudflare, ingress travado): passo a passo em
[`docs/reports/GEO-CLOUDFLARE-RUNBOOK.md`](reports/GEO-CLOUDFLARE-RUNBOOK.md).

## O que esta migração NÃO resolveu

**O `service_role` continua necessário na Vercel de produção.** Ele já foi removido do escopo
Preview, mas o site publicado lê o banco fora das rotas de API:
`ranking.astro`, `mapa.astro`, `u/[...path].astro`, os dois sitemaps e o `badge`. São páginas
renderizadas no servidor, não APIs, e não entraram neste recorte.

Enquanto elas existirem assim, o objetivo da migração está **pela metade**. Os caminhos:
ou elas passam a ler pela chave `anon` com RLS (são todas dados públicos: ranking, perfil,
sitemap), ou passam a consultar o backend. É trabalho de outra rodada, e a decisão é de quem
conhece as policies do banco.

## Régua

`tools/eval/apis-migradas-check.mjs` (`npm run eval:apis`) cobra que as duas listas do
repositório não divirjam, que os arquivos migrados realmente sumiram — rota migrada que
continua aqui volta a ser servida pela Vercel, com o `service_role` junto — e que só o `badge`
importa o supabase. Três mutantes provam que ela morde.
