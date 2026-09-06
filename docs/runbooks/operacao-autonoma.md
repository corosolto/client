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
```

Saída: `artifacts/ops/<data>/diagnostico.md` (+ `.json`), também no stdout. Código de
saída: `0` tecnicamente verde · `1` vermelho · `3` inconclusivo (alvo inalcançável desta
rede — nem verde nem vermelho, e o relatório diz isso).

A diagnose **só lê**: GET/HEAD/Range, nenhum POST. A sonda de navegador abre `?debug=1`,
que desliga os beacons — a sonda nunca aparece como jogador no painel.

Atrás de proxy corporativo: `NODE_USE_ENV_PROXY=1 npm run ops:diag` (o `fetch` do Node não
lê `HTTPS_PROXY` sozinho).

### O que cada sonda mede

| sonda | pergunta | onde roda |
|---|---|---|
| boot remoto | o HTML da raiz tem import map? `main.js` é JS e responde 200? `?v=` do HTML = `VERSION` do `version.js`? o grafo de imports fecha (`prod-coherence.mjs`)? | rede |
| api | `/api/health` campo a campo; `/api/online`, `/api/map-plays`, `/api/leaderboard` **N vezes** (5xx constante ≠ intermitente); rota inexistente devolve 404? | rede |
| ranking | `RANKING_ON` da árvore × `/api/leaderboard` × `/ranking` | rede + árvore |
| assets no edge | amostra que o runtime pede (todas as armas, personagens, props, índices de animação, three, CSS, prévias) com `Range: bytes=0-15` e a URL `?v=` real; confere cabeçalho `glTF`/JSON/JS, não só o status | rede |
| boot local | `package.json` × `version.js`; `index.astro` com import map, `main.js`, `ops.js` e coletor de erros; grafo de módulos da árvore num servidor estático | árvore |
| assets na árvore | os mesmos assets existem e têm o cabeçalho certo (ponteiro LFS e checkout truncado reprovam) | árvore |
| partida sintética | `Game` real em node (`tools/eval/harness.mjs`), todo mapa × rounds/CTF, 600 updates: sai do countdown? tem bots? nenhuma exceção? | árvore |
| navegador (opcional) | `__CS_MAIN_READY__`, `#btn-jogar.onclick`, WebGL2, `pageerror`, `console.error`, `requestfailed`, respostas ≥ 400, `window.__csbOps.snapshot()` | Playwright + Chromium |

## 2. Ler o relatório

Duas linhas no topo, duas perguntas diferentes:

- **Tecnicamente verde** — nenhuma sonda que rodou achou CRÍTICO nem ALTO, e nenhuma
  ficou INCONCLUSIVA. É o que a máquina mediu.
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
coletor de `/api/jserror` (`window.__migalha`) — assim FPS, congelamentos e 404 de asset
chegam **dentro** do relatório de erro que já existe, sem endpoint novo. `?ops=1` imprime
um resumo no console a cada 30 s. Nada é enviado por conta própria.

## 6. Provar que a régua morde

```bash
npm run ops:test       # unidades: regras de explicação, veredito, parsers, ops.js em DOM stubado
npm run ops:selftest   # mutantes: uma produção sintética por sintoma; cada um tem de virar o achado esperado
```

Os dois entram no `check:fast`. Um mutante que não acende sai `1` (portão cego é vermelho,
`eval:mutcega`). Cenário novo = regra nova + linha em `CENARIOS` do selftest.

## 7. Limites desta versão

- Sem navegador a prova de boot para no **parse**; a avaliação do `main.js` só com
  `--browser` (Playwright) ou `npm run eval:boot`. Em headless sem GPU o FPS medido não
  representa jogador (o relatório marca `headless`).
- A amostra de assets é a que o runtime pede por registro (armas, elenco, animação, props,
  prévias); texturas de mapa e o pacote de áudio privado continuam com `assert:assets`.
- A telemetria agregada (painel, `js_error`) não é lida daqui — o health resume; o
  cruzamento fino continua no `game-admin`.
- A diagnose não age: não purga, não faz deploy, não abre issue. Quem age é o
  `crash-fix.yml`; o que este runbook acrescenta é a explicação para decidir rápido.
