# Operação autônoma — diagnosticar, recuperar, reverter

A camada operacional (`tools/ops/`) faz o jogo **se diagnosticar e explicar** o que
está errado em boot, deploy, assets, telemetria, APIs, ranking, desempenho e partida —
sem tocar em gameplay, mapa, arma, viewmodel ou UI. Ela não substitui as réguas da casa:
ela as **encadeia** (prod-coherence, harness do `Game`, o `/api/health` que o prod-watch
lê) e escreve a frase que faltava: causa provável, evidência, impacto, próximo passo.

Este runbook diz como rodar, como ler, o que fazer com cada classe de achado e como
reverter. O porquê de cada sonda está no cabeçalho do arquivo dela.

## 1. Diagnosticar

```bash
npm run ops:diag                 # produção (www.csbrasil.online) + árvore local, sem browser
npm run ops:diag:local           # só a árvore: versão, index.astro, grafo de módulos, assets, partida sintética
npm run ops:diag -- --browser    # + Chromium: o main.js AVALIA? erros, recursos falhos, snapshot do ops.js
npm run ops:diag -- --browser --partida   # + entra numa partida (?debug=1&auto=E) e amostra FPS
npm run ops:diag -- --remoto --base=https://<preview>.vercel.app   # um preview em vez da produção
npm run ops:diag -- --json       # saída para máquina
npm run ops:aquecer              # depois de um deploy: aquece o edge (o prod-watch já faz no deployment_status)
```

Navegador: no macOS com Chrome a sonda liga a GPU sozinha (medido em 06/09/2026: SwiftShader
dá `main_ready` 21 s e FPS p50 3; GPU, 2,5 s e 108). `--gpu`/`--sem-gpu` mandam; no CI
(Linux) fica no SwiftShader e o relatório marca — `fps-baixo` só acende com GPU.

Saída: `artifacts/ops/<data>/diagnostico.md` (+ `.json`), também no stdout. Código de
saída: `0` tecnicamente verde · `1` vermelho · `3` inconclusivo (alvo inalcançável desta
rede, ou régua que não terminou de medir — nem verde nem vermelho, e o relatório diz isso).

A diagnose **só lê**: GET/HEAD/Range, nenhum POST. A sonda de navegador abre `?debug=1`
(testMode desliga a telemetria) **e barra toda escrita na rede** — `?debug=1` sozinho não
bastava: `_picks` e o coletor de `/api/jserror` POSTam mesmo em testMode. Todo método fora
de GET/HEAD/OPTIONS recebe 204 sem sair e `sendBeacon` é substituído; o que a página tentou
mandar aparece como `escritas bloqueadas` na linha do navegador. A sonda nunca aparece como
jogador no painel nem abre issue crash-auto.

Atrás de proxy corporativo: `NODE_USE_ENV_PROXY=1 npm run ops:diag` (o `fetch` do Node não
lê `HTTPS_PROXY` sozinho).

### O que cada sonda mede

| sonda | pergunta | onde roda |
|---|---|---|
| boot remoto | o HTML da raiz tem import map? `main.js` é JS e responde 200? `?v=` do HTML = `VERSION` do `version.js`? o grafo de imports fecha (`prod-coherence.mjs`)? | rede |
| api | `/api/health` campo a campo; `/api/online`, `/api/map-plays`, `/api/leaderboard` **N vezes** (5xx constante ≠ intermitente); rota inexistente devolve 404? | rede |
| ranking | `RANKING_ON` da árvore × `/api/leaderboard` × `/ranking` | rede + árvore |
| assets no edge | amostra que o runtime pede — **todas as armas do `/js/weapons.js` e todo o elenco do `/js/glbchars.js` que o alvo serve** (a URL do import map; sem eles, a árvore, com aviso), props e prévias espalhados pela lista, índices de animação, three, CSS — com `Range: bytes=0-15` e a URL `?v=` real; confere cabeçalho `glTF`/JSON/JS, não só o status | rede |
| boot local | `package.json` × `version.js`; `index.astro` com import map, `main.js`, `ops.js` e coletor de erros; grafo de módulos da árvore num servidor estático | árvore |
| assets na árvore | os mesmos assets existem e têm o cabeçalho certo (ponteiro LFS e checkout truncado reprovam) | árvore |
| partida sintética | `Game` real em node (`tools/eval/harness.mjs`), todo mapa × rounds/CTF, 600 updates: sai do countdown? tem bots? nenhuma exceção? | árvore |
| navegador (opcional) | `__CS_MAIN_READY__`, `#btn-jogar.onclick`, WebGL2, `pageerror`, `console.error`, `requestfailed`, respostas ≥ 400, `window.__csbOps.snapshot()` | Playwright + Chromium |

## 2. Ler o relatório

Duas linhas no topo, duas perguntas diferentes:

- **Tecnicamente verde** — nenhuma sonda que rodou achou CRÍTICO nem ALTO, e nenhuma
  ficou INCONCLUSIVA (alvo inalcançável desta rede, ou régua que não terminou de medir —
  um `prod-coherence` que explode não é "grafo coerente", é `coerencia-nao-medida`). É o
  que a máquina mediu.
- **Pronto para lançamento** — verde **e** retrato completo do candidato certo: sondas
  remotas e locais rodaram, houve prova de boot em navegador, produção e árvore na
  mesma versão, nada MÉDIO em aberto, telemetria com linha recente (ou
  `--aceitar-sem-trafego`, para janela de madrugada). Cada requisito que falta vira um
  motivo nomeado. Verde sem "pronto" é o estado normal de uma branch antes do deploy.

Cada achado traz `[SEVERIDADE] título (sonda)`, causa provável, evidência (número, URL,
status, stack), impacto para o jogador e o próximo passo. A ordem é por severidade.

Quando o quality gate está verde e o dono diz que está errado, o defeito é do quality gate
(`AGENTS.md`). Se um sintoma real não virou achado, ele vira **regra nova** em
`tools/ops/lib/explain.mjs` e **cenário novo** em `tools/ops/selftest.mjs` — nesta ordem.

## 3. Recuperar, por classe de achado

| achado | o que está acontecendo | recuperação |
|---|---|---|
| `grafo-incoerente`, `versao-divergente`, `main-js-indisponivel` | edge servindo HTML de um deploy e JS de outro (BUG-39/BUG-75) ou deploy incompleto | purgar `/js/*` e `/` no Cloudflare (o `crash-fix.yml` faz isso no dispatch `prod-crash`; à mão: `scripts/cloudflare-setup.sh` ou o painel), esperar o TTL curto (`eval:edgecache`) e `npm run prod:coherence`. Persistiu → rollback do site (§4) |
| `main-js-e-html`, `html-sem-importmap`, `html-nao-200` | o host devolveu página no lugar do jogo/módulo | conferir `vercel.json` (rewrites/headers) e o deploy no ar; rollback do site |
| `health-indisponivel`, `banco-fora`, `health-nao-ok` | backend (Cloud Run) fora ou sem banco | logs do serviço, Secret Manager, status do Supabase; rollback de revisão do backend (§4). O single-player continua: o jogo tolera backend fora |
| `schema-telemetria` | migration atrasada | aplicar as migrations pendentes no `db-privado`; enquanto isso os beacons chegam e não gravam — falha silenciosa, por isso é ALTO |
| `mp-sem-heartbeat` | nó regional de multiplayer sem heartbeat | subir o nó (runbook do `csbrasil-backend/game`) e conferir o `/health` do próprio nó |
| `pipelines-parados` | ou ninguém jogou, ou a ingestão parou | jogar uma partida real (sem `?debug`) e re-sondar em 5 min: `match` continuar `stale` = ingestão quebrada → logs do backend na rota `/api/match` |
| `rota-intermitente:*` | cold start do Cloud Run (medido em 06/09/2026: `/api/online` 503 na 1ª chamada, 200 nas seguintes) | `min-instances=1` no serviço, ou retry com backoff no cliente; medir em horário de pico antes de decidir |
| `rota-4xx:*` | a rota respondeu 4xx em todas as chamadas: removida/renomeada no backend publicado, ou bloqueio por origem/chave | comparar as rotas do backend no ar com `apibase.js`; logs do backend |
| `ingestao-parada:city` | `city` parado há >24 h com `presence` fresca: quem escreve `city_daily` parou (06/09/2026: o cliente chama o Cloud Run direto e nenhuma borda põe `cf-ipcity`/`x-vercel-ip-city` — corosolto/backend#22) | backend: Cloudflare na frente do serviço com o transform de localização, ou geo por IP; não é falta de tráfego |
| `arvore-ilegivel` | `package.json` da raiz não pôde ser lido (`--raiz` errada, checkout incompleto) | conferir a raiz; sem versão local a diagnose não compara com a produção |
| `coerencia-nao-medida`, `coerencia-local-nao-medida` | o `prod-coherence.mjs` explodiu ou não terminou — a diagnose sai `3` | rodar `npm run prod:coherence` à mão e ler o erro antes de confiar em qualquer verde |
| `ranking-flag-nao-lida`, `registro-nao-lido:*` | a régua não conseguiu ler `RANKING_ON` da árvore / `WEAPON_IDS` ou `GLB_CHARS` do alvo | ajustar o parser em `REGISTROS` (`tools/ops/lib/repo.mjs`) ao formato novo — silêncio aqui é régua cega (LICOES §5) |
| `html-lento`, `latencia-api:*`, `assets-lentos` | acima do limiar (`LIMIARES` em `lib/explain.mjs`), que só tem procedência de madrugada — por isso AVISO | medir em pico e, com a série, promover a MÉDIO |
| `asset-404`, `asset-conteudo-errado`, `asset-tamanho-diverge` | o edge não entrega o que o runtime pede | conferir se o caminho existe em `dist/client` do build atual; existe → purgar o caminho; não existe → o commit que removeu/renomeou (LICOES §12/§14) |
| `partida-crash:*`, `partida-nao-comeca:*` | o `Game` explode ou não sai do countdown naquele mapa/modo | skill `bug-hunt`: régua antes do conserto, registrar em `KNOWN-BUGS.md` com o stack do relatório |
| `boot-navegador-morto`, `btn-jogar-inerte` | o `main.js` não avaliou até o fim (o caso de 07/08, TDZ) | `npm run eval:boot` com Chrome real; o stack está no achado |
| `versao-local-desincronizada`, `grafo-local-incoerente`, `index-astro-sem-boot` | a árvore publicaria um jogo quebrado | corrigir antes de abrir PR; nenhum destes é visível no `npm run syntax` |

## 4. Rollback

**Site (Vercel).** Produção publica a `main` pela integração Git. Reverter = *Promote* do
deploy anterior no painel (Deployments → deploy bom → Promote to Production) ou, pelo
caminho manual por tag, `gh workflow run deploy-prod.yml -f tag=v2.0.0-alpha.<N-1>`
(`.github/workflows/deploy-prod.yml`, que já purga `/js/*` no fim). Depois: `npm run
prod:coherence` e `npm run ops:diag -- --remoto`.

**Edge (Cloudflare).** Não tem rollback — tem purge. `/js/*`, `/style.css` e `/` são os
prefixos que já derrubaram o site; purgue-os antes de suspeitar do código.

**Backend (Cloud Run).** Rollback = mandar 100% do tráfego para a revisão anterior
(`gcloud run services update-traffic`) — vive no repositório `csbrasil-backend`, com as
credenciais de lá; este repositório só observa (`/api/health`).

**Banco (Supabase).** Migration não se reverte por rollback de código: o backend novo
tolera banco atrasado (`telemetrySchema:false` no health) e a régua acusa. Aplicar a
migration é mais barato que reverter o backend.

**Cliente antigo no navegador do jogador.** O HTML velho pede `?v=` velho; o manifesto por
conteúdo (`scripts/module-cache.mjs`) e o TTL curto do edge fecham a janela sozinhos em
minutos. Não há ação — só não recriar a regra de 1 mês no Cloudflare (`eval:edgecache`).

## 5. O que o `public/js/ops.js` registra no navegador

Um módulo sem imports, carregado antes do `main.js` pelo `index.astro`, que **não desenha
nada**: fase da sessão (`land → menu → partida → fim`), marcos de boot
(`main_loaded`, `main_ready`, `primeiro_live`), FPS por segundo só em partida (p50, p5,
mínimo, travadas > 100 ms, congeladas > 1 s), falhas de carga (`PerformanceObserver` +
evento `error` de `img/script/link/audio`), perda/restauração de contexto WebGL, exceções e
promessas rejeitadas (contagem; em partida contam como erro de partida), mapa/modo/estado
da partida e o **abandono** (em que fase a aba fechou, gravado em `localStorage.cs_ops_last`
e lido na visita seguinte).

Ele expõe `window.__csbOps.snapshot()` (a sonda de navegador lê) e manda migalhas para o
coletor de `/api/jserror` (`window.__migalha`) — assim FPS, congelamentos, 404 de asset e
onde a **sessão anterior** parou chegam **dentro** do relatório de erro que já existe, sem
endpoint novo. O coletor guarda 20 migalhas; o `ops.js` gasta no máximo 5, o resto é dos
cliques do jogador. `?ops=1` imprime um resumo no console a cada 30 s.

**Beacon de perf.** O `main.js` já manda `/api/perf` uma vez por sessão, em partida; o
payload leva `ops: window.__csbOps.resumoBeacon()` — só números com teto e strings curtas:
`readyMs`, `liveMs`, `fps50`, `fps5`, `fpsAmostras`, `travadas`, `congeladas`, `recursos`,
`falhas`, `glPerdidos`, `erros`, `promessas`, `ultimaFase`, `ultimaSaida`. O `perf.ts` do
backend lê campo a campo e descarta o que não conhece, então o cliente pode publicar antes;
ler no banco é um PR no `csbrasil-backend` (`track_perf` + migration) com esse contrato.
Nada mais é enviado por conta própria.

## 6. Provar que a régua morde

```bash
npm run ops:test       # unidades: regras de explicação, veredito, parsers, ops.js em DOM stubado
npm run ops:selftest   # mutantes: uma produção sintética por sintoma; cada um tem de virar o achado esperado
```

Os dois entram no `check:fast` (medido em 06/09/2026 no Mac: `ops:test` 0,2 s; `ops:selftest`
≈20 s com os cenários HTTP em paralelo, 2 Chromiums e 2 partidas sintéticas). No CI:
`ops-diag.yml` roda a diagnose inteira a cada hora (artifact + issue `ops-diag` em vermelho,
fechada em verde); `portao-browser.yml` roda `eval:boot` e os cenários de navegador do
selftest em PR que toca `main.js`, `ops.js`, `apibase.js`, `index.astro`, `boot-check` ou
`tools/ops`; `prod-watch.yml` aquece o edge depois do purge de cada deploy. Um mutante que
não acende sai `1` (portão cego é vermelho, `eval:mutcega`). Cenário novo = regra nova + linha
em `CENARIOS` do selftest + linha na tabela `CASOS` de `tests/explain.test.mjs` — a guarda de
cegueira lê o `explain.mjs` e reprova regra sem caso.

## 7. Limites desta versão

- Sem navegador a prova de boot para no **parse**; a avaliação do `main.js` só com
  `--browser` (Playwright) ou `npm run eval:boot`. Em headless sem GPU o FPS medido não
  representa jogador (o relatório marca `headless`).
- A amostra de assets é a que o runtime pede por registro (armas do `weapons.js` e elenco do
  `glbchars.js` que o alvo serve, animação, props e prévias espalhados); texturas de mapa,
  decalques e o pacote de áudio privado continuam com `assert:assets`.
- O beacon de perf leva o resumo do `ops.js`, mas o backend ainda não o grava: a
  distribuição real de boot, FPS e abandono por jogador depende do PR no backend.
- Os limiares de latência (raiz 2,5 s, API p95 2 s, assets p95 3 s) têm procedência de duas
  medições de madrugada (06/09/2026); até haver série em pico eles acendem como AVISO.
- A telemetria agregada (painel, `js_error`) não é lida daqui — o health resume; o
  cruzamento fino continua no `game-admin`.
- A diagnose não age: não purga, não faz deploy, não abre issue. Quem age é o
  `crash-fix.yml`; o que este runbook acrescenta é a explicação para decidir rápido.
