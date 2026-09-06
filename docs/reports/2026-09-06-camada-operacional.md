# Camada operacional — antes/depois — 2026-09-06

Branch `claude/infra-autonomy` (base `93cd8f41`, v2.0.0-alpha.221). Evidência colhida
no Mac do dono em 06/09/2026 entre 02:07 e 02:20 UTC; os relatórios brutos estão em
`artifacts/ops/2026-09-06T02-*/diagnostico.{md,json}` (gitignored) e os comandos que
os reproduzem estão em cada seção.

## O que a camada faz

- `npm run ops:diag` encadeia as réguas que já existiam (prod-coherence, harness do
  `Game`, `/api/health`) e escreve, por achado, **causa provável, evidência, impacto e
  próximo passo**; separa "tecnicamente verde" de "pronto para lançamento".
- Sondas: boot (HTML → import map → main.js → version.js → grafo), API (health campo a
  campo; rotas leves N vezes, para separar 5xx constante de intermitente), ranking
  (flag × backend × página), assets no edge (Range GET + prova de cabeçalho), boot e
  assets da árvore, partida sintética (todo mapa × modo em node) e, com Playwright,
  navegador (o main.js AVALIA? + snapshot do `ops.js`).
- `public/js/ops.js` registra no navegador marcos de boot, FPS em partida, falhas de
  carga, contexto WebGL, erros e abandono; expõe `window.__csbOps.snapshot()` e manda
  migalhas ao coletor de `/api/jserror`. Não desenha nada.
- `docs/runbooks/operacao-autonoma.md`: diagnosticar, recuperar por classe de achado,
  reverter site/edge/backend/banco.

## Antes — 06/09/2026 ~00:40 UTC, Chrome do dono, produção alpha.221

| sinal | medido | quem via |
|---|---|---|
| boot | `__CS_MAIN_LOADED/READY` true, `#btn-jogar.onclick` presente, 65 entradas no import map, WebGL2 ok, 0 erros de console, ttfb 132 ms / DOMContentLoaded 1,44 s / load 2,55 s, 192 recursos e 0 com status ≥ 400 | só quem abrisse o DevTools |
| `/api/health` | `ok:true database:true telemetrySchema:true fresh:false stale:[telemetry,match,city] operationalFresh:true` | prod-watch lia `ok`; `fresh:false` não distinguia "ninguém jogou" de "ingestão parou" |
| `/api/online`, `/api/map-plays` | **503 numa das duas chamadas de cada** na carga da página, 200 na outra; re-sondando 4×, todas 200 (4 ms–970 ms) — cara de cold start do Cloud Run | ninguém: o prod-watch faz uma chamada só, depois do boot |
| assets no edge | HEAD em `/models/*` dava `cf-cache-status: MISS` com 1,4–5,9 s; GET com `Range: bytes=0-15` dá HIT em 18–32 ms; `content-range` devolve o tamanho COMPRIMIDO (ak.glb 163 586 no edge vs 275 892 no disco); `/models/weapons/ak47.glb` → 404 (o id é `ak`) | nenhuma régua conferia asset no edge |
| explicação | — | ninguém escrevia causa/impacto/próximo passo |

## Depois

### Réguas no Mac (worktree da branch, node 23.6, Playwright 1.62.1 global, Chrome)

| comando | resultado | duração |
|---|---|---|
| `npm run ops:test` | 15/15 | 0,1 s |
| `npm run ops:selftest` | 37/37: 33 cenários HTTP (32 mutantes + `saudavel`), 2 de navegador no Chromium (`saudavel` boot provado em 39 ms com `main_ready=273 ms` no ops.js; `boot-navegador-morto` → crítico com o TDZ de `testMode`), partida sintética sadia e `partida-quebrada` → `partida-crash:praca_poderes:rounds` [critico] | 52 s |
| `npm run ops:diag:local` | tecnicamente verde, 0 achados: 64 módulos, grafo coerente, 204 assets conferidos, 26 partidas (13 mapas × rounds/CTF) com boot p95 416 ms e 0,75 ms/update máx | 9 s |
| `npm run check:fast` | **83/84** em 158 s. O vermelho é `audio:check` ("manifest.json DEFASADO em relação ao disco"): reprova IGUAL no checkout do dono em outra branch — o `public/audio/manifest.json` local (16/08) é anterior ao pacote no disco (`ambiente/` de 29/08). Ambiente, não branch; o conserto é `npm run audio` no checkout do dono. Os 7 vermelhos do sandbox Linux (sharp, @gltf-transform, pacote de áudio) ficaram verdes aqui | 158 s |

`ops:test` + `ops:selftest` custam 52 s dos 158 s do `check:fast` (33%); ver §Próximos passos.

### Produção (alpha.223) + Chrome headless — `npm run ops:diag -- --browser --partida`

Tecnicamente verde: **SIM**. Pronto para lançamento: **NÃO** (produção alpha.223 ≠ árvore
alpha.221; `city` sem linha recente). 55 s.

| sonda | evidência |
|---|---|
| boot remoto | 200 em 252 ms, CSP e HSTS presentes, 65 entradas no import map, HTML e version.js em alpha.223, main.js 200 (`application/javascript`), grafo coerente (prod-coherence) |
| api | health site e backend iguais (`database:true telemetrySchema:true fresh:false stale:[city]`); `/api/online` 5/5 200 (450–479 ms), `/api/map-plays` 5/5 (274–286 ms), `/api/leaderboard` 5/5 (220–224 ms); rota inexistente → 404 JSON |
| ranking | `RANKING_ON=false` · leaderboard `{"disabled":true}` · `/ranking` 200 com noindex |
| assets no edge | 91 sondados (26 armas, 24 personagens, 24 props, 13 prévias, anims, three, CSS), 0 em 404, 0 corpo errado; **89 MISS / 1 HIT / 1 REVALIDATED** porque `?v=alpha.223` acabou de ser publicado; p50 356 ms, p95 632 ms; 78 responderam 200 ao Range (edge sem cache ignora Range), 13 responderam 206 |
| navegador | `__CS_MAIN_READY__` em 8 274 ms, `#btn-jogar.onclick` presente, WebGL2 ok, 0 pageerror, 0 console.error, 0 recurso ≥ 400; partida `?auto=E` chegou a `live` em 2 642 ms |
| achados | [AVISO] `pipelines-parados` (`city`, online=0 → "provavelmente ninguém jogou"); [INFO] `ops-runtime-ausente` (alpha.223 ainda sem `/js/ops.js`); [INFO] produção ≠ árvore |

O 503 intermitente de 00:40 não se repetiu às 02:11 (instância quente). A régua
que o classificaria (`rota-intermitente`, N chamadas por rota) está provada pelo
mutante, não por produção.

### Árvore da branch servida pelo Astro — o `ops.js` no jogo de verdade

`npm run dev -- --port 4331` na worktree (node_modules e pacote de áudio ligados por
symlink, fora do git), depois
`npm run ops:diag -- --remoto --browser --partida --base=http://127.0.0.1:4331` (35 s):

- HTML servido com `<script type="module" src="/js/ops.js?v=…">` **antes** do
  `main.js`; import map com 66 entradas (65 + `ops.js`); grafo coerente.
- Navegador: boot provado (`mainReady`, `btnJogar`, 0 pageerror); partida chegou a
  `live` em 8 782 ms.
- `window.__csbOps.snapshot()` lido pela sonda: `marcos.main_loaded=5639`,
  `main_ready=5639`, `primeiro_live=17392` (ms desde o início da página); fase
  `partida`, mapa `piscina_treta`, modo `rounds`, transições `null→countdown→live`;
  `recursos.total=416` com 20 falhas registradas; **FPS p50 8** em 6 amostras — headless
  com SwiftShader, e o relatório não acusa `fps-baixo` porque marca `headless`.
- Achados [MÉDIO] desta execução são ambiente, não branch: 24 PNG de
  `/img/decals/*` em 404 (acervo privado gitignored, ausente na worktree) e 3
  `console.error` de CORS (origem `127.0.0.1:4331` batendo direto no backend do Cloud
  Run). [AVISO] sem CSP: esperado fora da Vercel.

### `eval:boot` (B1–B7) com o ops.js carregado antes do main.js

`BASE=http://127.0.0.1:4331 npm run eval:boot` → **B1–B7 PASSA** (0 pageerror; `#btn-jogar`
com onclick; falha injetada em `_startGame` recupera para o modal amigável com código
`7A7FF380`; 2 relatórios automáticos + 1 confirmação chegam ao coletor; `?debug=1`
preserva o painel técnico; watchdog visível no console; 0 falsos timeouts).
`--mutante=tdz` → B1 e B2 **FALHA**, exit 1: a régua continua mordendo.

Achado no caminho: `eval:boot` estava vermelho na base `93cd8f41` e em `origin/main`
("fixture de falha não aplicou em main.js") porque o PR #489 mudou a assinatura de
`_startGame` para `(team, charId, enemyFaction, online = false)` e o `boot-check.mjs`
ancorava a fixture na assinatura antiga. Não é o `ops.js`: reproduz sem ele. A fixture
passou a ancorar no nome (`/async function _startGame\([^)]*\) \{/`), commit próprio nesta
branch; `eval:boot` não está no `check:fast`, por isso ninguém viu.

## Arquivos alterados (`git diff --stat origin/main...HEAD`, antes deste relatório)

33 arquivos, +2 183 / −21: `tools/ops/` (diagnose, selftest, 4 libs, 7 sondas, 2
testes, README), `public/js/ops.js` (+198), `src/pages/index.astro` (+2: a tag do
ops.js), `docs/runbooks/operacao-autonoma.md` (+140), `package.json` (4 scripts;
`ops:test` e `ops:selftest` no fim do `check:fast`), `.gitignore` (`artifacts/ops/`),
e os blocos gerados/documentação (`SCRIPTS.md`, `AGENTS.md`, `STATUS.md`,
`CHANGELOG.md`, `README.md`, `ARCH.generated.md`, `docs/docs/*` e traduções).

Commits: `ad6519d7` sonda HTTP e leitura da árvore · `3fef7b00` sondas de boot, API,
ranking e assets · `761d01de` partida sintética e navegador · `9e98b40b` explicação e
veredito · `eff1654c` CLI, selftest e testes · `a6449ca5` ops.js · `f7af26c3` runbook e
portão · `d63ee31b` blocos gerados · `db289b9f` HTML sem main.js é crítico; 404 com
produção atrás vira aviso.

## Gates

| gate | onde | resultado |
|---|---|---|
| `ops:test` | Mac, worktree | 15/15 |
| `ops:selftest` | Mac, worktree, com Chromium | 37/37 |
| `ops:diag:local` | Mac, worktree | verde, 0 achados |
| `check:fast` | Mac, worktree | 83/84 (`audio:check` = ambiente, reprova igual no checkout do dono) |
| `ops:diag --browser --partida` | Mac → produção alpha.223 | tecnicamente verde |
| `ops:diag --remoto --browser --partida --base=127.0.0.1:4331` | Mac → Astro da branch | tecnicamente verde; ops.js lido em partida |
| `eval:boot` | Mac → Astro da branch | B1–B7 PASSA; `--mutante=tdz` vermelho (depois do conserto da âncora do boot-check) |
| sandbox Linux (06/09, antes) | sem node_modules, sem áudio | ops:test 15/15, selftest 33/33 (sem navegador), diag local verde, check:fast 77/84 (7 de ambiente) |

## Limitações

- `origin/main` andou para `69555790` (alpha.223) depois da base da branch; o merge
  com a branch conflita em `package.json`, `STATUS.md`, `README.md`, `ARCH.generated.md`
  e blocos gerados de `docs/docs/{arquitetura,comecando}.md` (+ traduções) — tudo
  regenerável (`npm run docs`) ou bump de versão. Nenhum conflito em código.
- Nenhum sandbox alcança a produção; os números remotos vêm do Mac.
- FPS em headless (SwiftShader) não representa jogador; a régua `fps-baixo` só vale
  com `--gpu`/Chrome real com GPU.
- Limiares `html-lento` 2,5 s, `latencia-api` p95 2 s e `assets-lentos` 3 s têm a
  procedência de UMA medição (§Antes); esta execução acrescenta o segundo ponto
  (raiz 252 ms; API p95 224–479 ms; assets p95 632 ms com cache frio).
- A amostra de assets remotos vem da ÁRVORE local: com produção em outra versão, um
  404 é só aviso — e um asset que só a produção pede não é sondado.

## Próximos passos

1. Crítico adversarial de contexto limpo sobre `origin/main...HEAD` (skill
   `revisao-antes-do-push`), corrigindo o que for real com mutante, em commits pequenos.
2. Rebase em `origin/main` (alpha.223) e `npm run docs` para regenerar os blocos.
3. `npm run audio` no checkout do dono (manifest defasado; fora desta branch).
4. Depois do deploy com o `ops.js`: `npm run ops:diag -- --browser --partida` em horário
   de pico, para dar procedência de pico aos limiares de latência.
