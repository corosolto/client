# `tools/ops/` — a camada operacional

O jogo se diagnostica e explica: boot, deploy, assets, telemetria, APIs, ranking,
desempenho e partida, sem tocar em gameplay. Como rodar, como ler e como recuperar:
[`docs/runbooks/operacao-autonoma.md`](../../docs/runbooks/operacao-autonoma.md).

| arquivo | papel |
|---|---|
| `diagnose.mjs` | CLI: orquestra as sondas, explica, dá o veredito e grava `artifacts/ops/<data>/` |
| `aquecer.mjs` | pós-deploy: módulos do import map + assets dos registros servidos com o `?v=` da raiz, HIT conferido na 2ª passada (`prod-watch.yml`) |
| `selftest.mjs` | mutantes: uma produção sintética por sintoma; cada um tem de virar o achado esperado |
| `probes/boot.mjs` | HTML → import map → main.js → version.js → grafo (remoto e local) |
| `probes/api.mjs` | `/api/health` campo a campo; rotas leves N vezes (5xx constante × intermitente) |
| `probes/ranking.mjs` | flag `RANKING_ON` × `/api/leaderboard` × `/ranking` |
| `probes/assets.mjs` | amostra de assets no edge (Range GET + prova de cabeçalho) e na árvore |
| `probes/match.mjs` + `match-worker.mjs` | partida sintética: `Game` real em node, todo mapa × modo |
| `probes/browser.mjs` | opcional: Chromium via Playwright — o main.js AVALIA? + snapshot do `ops.js`; GPU automática no macOS com Chrome, SwiftShader no CI (marcado) |
| `lib/explain.mjs` | sintoma → causa provável, evidência, impacto, próximo passo (função pura) |
| `lib/report.mjs` | veredito (tecnicamente verde × pronto para lançamento) e relatório curto |
| `lib/http.mjs`, `lib/repo.mjs` | sonda HTTP classificada; leitura da árvore por regex/manifesto |
| `tests/` | `node --test`: uma linha por regra do `explain.mjs` (com guarda de cegueira), veredito, parsers, sondas em caminho hostil, aquecedor contra edge sintético, retry do menu, proxy de geo, contrato dos workflows e `public/js/ops.js` em DOM stubado |

Contrato: só lê (GET/HEAD/Range; o navegador da sonda barra POST e beacon). Node puro, sem
dependência. Regra nova = cenário novo no `selftest.mjs` + linha em `CASOS` do
`tests/explain.test.mjs`, senão a régua não existe (lei 3).
