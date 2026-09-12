# Camada operacional, rodada 2 — 2026-09-06

Continuação de [`2026-09-06-camada-operacional.md`](2026-09-06-camada-operacional.md) depois do
merge do #512 (alpha.224). Os oito pontos da avaliação pós-deploy, o que virou código, e a
evidência de cada um. Base `a551204f`.

| # | ponto | o que entrou | prova |
|---|---|---|---|
| 1 | `city` sempre stale | causa lida no backend: `geoFrom` só lê `cf-ipcity`/`x-vercel-ip-city`; o cliente chama o `run.app` direto desde 27/08, sem borda — `city_daily` e `presence.city` morrem com 200. Issue corosolto/backend#22 com três opções (Cloudflare na frente, geo por IP, proxy). No cliente: `ingestao-parada:city` [médio] quando `presence` está viva; o proxy do site passa a repassar `x-vercel-ip-*` | mutante `ingestao-city-parada`; teste do proxy (geo sobe, cookie não) |
| 2 | `--gpu` como padrão no Mac | `modoGpu`: macOS com Chrome liga a GPU e usa o executável do Chrome; CI fica no SwiftShader marcado; `fps-baixo` só com GPU | teste de decisão; mutante auto-GPU desligada → vermelho; produção com GPU: ready 2,5 s, FPS p50 108 |
| 3 | aquecer o edge após release | `ops:aquecer` (módulos do import map + todos os assets dos registros servidos, Range GET, HIT conferido na 2ª passada) e passo no `prod-watch.yml` depois do purge | edge sintético MISS→HIT, versão errada não aquece, conexão morta vira nova tentativa; produção real: 267 URLs, 2ª passada 266–267 HIT, p95 61–90 ms |
| 4 | `ops:diag` agendado | `ops-diag.yml` a cada hora + dispatch: navegador, artifact, issue `ops-diag` em vermelho, fechada em verde, inconclusivo no log | `tests/workflows.test.mjs`; `eval:wfsecret`, `eval:wflocal`, `eval:deploygate`, `eval:portaointeiro` verdes |
| 5 | `eval:boot` no CI | `portao-browser.yml` roda `eval:boot` e `ops:selftest --so=navegador`, e dispara em PR que toca `main.js`, `ops.js`, `apibase.js`, `index.astro`, `boot-check`, `tools/ops` | contrato no mesmo teste; primeira execução real acontece no PR desta rodada |
| 6 | beacon de sessão | `resumoBeacon()` (números com teto, strings curtas) vai como `ops` no `/api/perf` que já existe; `perf.ts` descarta o que não conhece, então é seguro antes do backend; contrato no runbook §5 | teste de forma e teto; guarda estática do payload; mutante `ops:` removido → vermelho |
| 7 | cold start de `/api/online` | `fetchComRetry` (3 tentativas em 5xx/rede, 400 e 800 ms, 4xx não repete) nos dois contadores do menu | 4 testes com fetch stubado; guarda estática; `eval:online` continua verde; mutante fetch cru → vermelho |
| 8 | pendências da revisão | elenco pelo `glbchars.js` servido (44 ids; o diretório tinha 45), `arvore-ilegivel` [alto], `rotasNoBackend` removido, migalha "última sessão" no boot | mutantes `asset-404-elenco-servido`, `registro-elenco-ilegivel`; caso `arvore-ilegivel`; migalha desligada → vermelho |

## Limitações

- O beacon chega ao backend e é descartado até `track_perf` ganhar os campos; o valor do item 6 depende do PR no `csbrasil-backend`.
- O item 1 fecha só com infra (host do backend atrás da Cloudflare ou geo por IP); o cliente sozinho não devolve `city_daily`.
- `eval:boot` no runner do GitHub ainda não foi executado uma vez; o primeiro run é o PR desta rodada.
- FPS com GPU é o do Mac do dono, não do jogador; a distribuição real vem do beacon quando o backend gravar.
