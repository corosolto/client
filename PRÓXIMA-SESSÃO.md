# Handoff para a proxima sessao — 18/08/2026 (2a sessao do dia)

## O que foi feito nesta sessao (continuacao da de 18/08 de madrugada)

### 1. Portao build VERDE de novo (#344, merged)
- O `eval:deps` devolvido + **defeito encoberto**: o #332 extraiu a tabela WEAPONS
  para `public/js/data/weapons.js` e o `vm-kick-sim.mjs` ainda lia `rate:` do
  `game.js` — o passo so apareceu quando o `eval:deps` parou de matar o build antes
- Licao: passo novo no portao revela quebra de reguas antigas; rodei os passos
  seguintes localmente (botsim/build/site-smoke) antes de empurrar

### 2. Ruleset da main ATIVO (item 1 do plano anterior — PRIORIDADE ALTA, concluido)
- **#343** (merged): release.yml faz checkout com `RELEASE_TOKEN`; o push do bump
  autentica como **csbrasil-BOT** (provado: PushEvent 03:30 = csbrasil-BOT)
- Ruleset `main` (id 19116007) **active**: PR obrigatorio + checks requeridos
  (`build`, `dco`, `versao-bumpada`, `ratchet`), 0 reviews, `deletion` +
  `non_fast_forward`, bypass SO para o csbrasil-BOT (id 314500335)
- Provado nos dois sentidos: push direto rejeitado ("4 of 4 required status
  checks"); PR #349 mergeou com checks verdes e o release .154 saiu pelo bot
- Ruben: push direto seu na main acabou — tudo por PR agora (e o portao e rapido)

### 3. check:fast 53/53 de novo (#348, merged)
- Regua do changelog so contava merge commit; squash merge (padrao do automerge)
  ficava fora — `#344 squash-merged => "1 na secao, 0 no git"`. Agora conta
  subject com `(#N)` e o modo escrita lista squash PRs (a secao .152 saiu certa)
- `foot-offsets.json` re-derivado do `char_probe.json` COMMITADO (a versao da main
  vinha de sonda suja de 23:37 nao commitada; valores identicos, so timestamp)

### 4. package.json limpo (#347, merged — item 2 do plano anterior, concluido)
- 83 chaves `//nome` viraram `SCRIPTS.md`; `check` legado (`&&`) removido;
  112 executaveis intactos; ponteiros atualizados (AGENTS.md, gen-docs PT+EN,
  comecando, colaborar, arquitetura, portao-browser.yml, setup.mjs, skill bug-hunt)

### 5. Race do release consertado (#349, merged)
- Dois merges 23s apart => "atomic push failed" no run velho. Main agora e
  fast-forward-only (ruleset), entao `cancel-in-progress: true` na concurrency do
  release.yml: o run mais novo (sempre supersete) cancela o velho no ar

### 6. Bot Discord + Telegram NO AR (item 6 do plano anterior, concluido no codigo)
- Repo: `corosolto/discord-bot` (ja existia! era o kit de setup do servidor — a
  sessao anterior procurou nos 69 repos do Emerson e nao na org). PR #1 merged
- Zero infra: GitHub Actions roda, posta via REST e encerra (sem gateway/24-7)
  - `notify-daily.js` — 09:00 BRT, #🔄-atualizacoes + Telegram: jogadores,
    partidas, mapa/modo/arma top, conversao, erros novos, issues
  - `notify-events.js` — 30 min: release novo = 🎉 festa, contribuidor de 1a
    viagem = 🥳 festa (#🔄-atualizacoes), merges + issues novas (#🤖-commits)
  - `state.json` comitado pelo workflow; primeira corrida so semeia (sem spam)
  - CI roda dry-run sem credencial; mensagens puras testadas (node:test)
- **PARA ATIVAR (so o Ruben)**: secrets no repo — `DISCORD_TOKEN` (**resetar o
  que vazou em chat**), `TELEGRAM_BOT_TOKEN`+`TELEGRAM_CHAT_ID` (via @BotFather),
  `SUPABASE_URL`+`SUPABASE_SERVICE_ROLE_KEY` (as mesmas do painel). Sem eles os
  crons rodam em dry-run e nao mandam nada.

---

## Estado do quality gate
- check:fast: **53/53 VERDE** (main pos-.154)
- CI pr-fast na main: VERDE
- Versao: `2.0.0-alpha.154`

## Credenciais pendentes (so o Ruben faz)
1. `gh secret set CSBRASIL_BOT_TOKEN --repo corosolto/client` — PAT da
   csbrasil-BOT com escopos `repo`+`workflow`. Deixa o automerge funcionar (hoje
   inerte; merges manuais funcionam normalmente)
2. Secrets do discord-bot (lista acima)

---

## O que falta do plano anterior (prioridades atualizadas)

### 1. Reescrever README [PR separado] — PROXIMA FRENTE
- Hoje parece relatorio de engenharia interno; precisa: screenshot do jogo,
  "o que e" em 2 linhas, como jogar, como contribuir. AGENTS.md fica tecnico
- Feedback do jogador: "conteudo mais humano"

### 2. Admin panel — panel.csbrasil.online [PRs no csbrasil-admin]
- Repo `rubenmarcus/csbrasil-admin` (privado): mover para org `corosolto`, CI
  basico (lint+typecheck+test no PR), apontar dominio, branch protection
- O repositorio ja tem teste (`src/lib/*.test.ts`) e workflow de inteligencia
  diaria de referencia

### 3. Backend separado [futuro, so planejar]
- 18 APIs em `src/pages/api/` -> repo `corosolto/backend`; 4 paginas SSR fazem
  query Supabase direto; client ficaria so site+jogo (zero service_role)
- Inventario das APIs esta no handoff anterior (secao preserved abaixo)

### 4. Issues abertas legitimas
- #327 pickups nao alcancados · #325 decals ashtar.png 404 · #320 ronda de estado
- #345/#346 = MAT2/TEX1 (divida conhecida, KNOWN-RED) · #342/#341 = plantao da
  era de build vermelho (build verde agora — conferir se auto-fecham; senao fechar
  comentando o run verde)

## Bots locais do Ruben (contexto, inalterado)
- `/Users/ruben/estraga-codigo/` — canarinho.mjs (revisor de PR, conta estraga-codigo)
- `/Users/ruben/game3/bots/vigia-prod/` — plantao.mjs (vigia producao)
- `/Users/ruben/game3/bots/zelador/` — ronda.mjs (launchd 9h / seg 9:30)

## Inventario de APIs do client (para migracao futura)

### Telemetria (anonimas)
- `acquisition.ts` · `funnel.ts` · `telemetry.ts` · `match.ts` · `perf.ts` ·
  `pick.ts` · `presence.ts` · `jserror.ts` · `heartbeat.ts` (todas POST)

### Jogador (autenticadas por token)
- `register.ts` · `submit-match.ts` · `avatar.ts` (sharp 128x128) · `train-frames.ts`

### Leitura publica
- `leaderboard.ts` GET · `online.ts` GET · `health.ts` GET · `feedback.ts` POST

### Imagem dinamica
- `badge/[...path].png.ts` · `og/[tipo].png.ts`

### Dependencias criticas
- `src/lib/supabase.ts` (service_role) · `src/lib/ratelimit.ts` (RPC rl_take) ·
  `src/lib/player-identity.ts` · env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `GH_DISPATCH_TOKEN`
