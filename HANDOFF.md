# HANDOFF

## Feedback de combate: contador de abates, replay no headshot e bot de faca — 06/09/2026

Objetivo: fechar as três frentes de leitura de combate pedidas pelo dono — um contador de
abates legível durante a partida, devolver a câmera ao jogador no headshot (o #364 tirava a
primeira pessoa por 1,36 s) e fazer o bot RESPEITAR o modo em rodada de faca. Branch
`claude/combat-feedback-hud-bots`, worktree `claude-combat-feedback`, base `42c01175`.

**Estado inicial medido (`botfaca-check.mjs`, praca_poderes, semente 4242, 4 bots, 60 s):** o
modo já entregava a faca na mão do bot, mas a cabeça continuava de fuzil. A banda de distância
com histerese de fuzil (recuo abaixo de 6 m, volta a `mid` só acima de 9,5 m) contra um alcance
de faca de 2,4 m virava ciclo-limite: **menor distância bot→alvo 5,98 m, ZERO golpes, ZERO
abates**. Quando por acaso entrava no alcance, o golpe saía pelo caminho de tiro — traçante,
fogacho de cano e som de arma de fogo.

**Mudança (lógica de jogo em `public/js/game.js`, sem navegador e sem penetração):**
`_meleeRange(wid)` devolve alcance só de arma branca; quando o bot está em corpo a corpo a
histerese de fuzil é substituída por "fecha e não recua" (`push` até 0,6× do alcance,
`approach` nunca negativo) e o gate de ataque roteia para `_botMelee`, que resolve o golpe com
alcance, ângulo, LOS, dano e `sfx.knife()/knifeHit()` — sem traçante, fogacho ou `shotWeapon`.
Fora do corpo a corpo a banda de fuzil ficou intacta (é a cláusula BF4).

**Estado final medido (mesma semente):** encostou a **1,24 m** (alcance 2,40), **18 golpes**,
**9 abates**, 0 traçante/fogacho; rodada normal intacta com menor distância 23,46 m.

**Validações:** as três bases passaram (`eval:botfaca`, `eval:replaycam`, `eval:abateshud`) e
os **11 mutantes** reprovaram como devem — botfaca `recuo` (5,40 m, zero golpes, zero abates),
`tracante` (18 traçantes/18 fogachos) e `corredor` (rodada normal colando a 2,87 m);
replaycam `orbita`, `hitstop`, `esconde` e `sem-kill`; abateshud `time`, `rodada`, `congelado`
e `miudo`. `node --check` passou nos quatro arquivos JS tocados. `eval:abateshud` e
`eval:botfaca` entraram no `package.json` e no `check:fast`, ao lado de `eval:replaycam`, para
o defeito não voltar em silêncio.

**`npm run build`: VERDE, mas só depois de consertar o ambiente.** As primeiras execuções
paravam antes do Astro (`[copy-wasm] resvg-wasm não encontrado no node_modules` e
`sh: astro: command not found`), e a causa era a máquina, não o diff: o `node_modules` do
worktree estava incompleto (87 pastas, sem `@resvg` nem o `.bin` no PATH do npm) e o `node` do
PATH era o **v16.13.0**, abaixo do que o Astro 7 aceita — com ele o binário morria em silêncio
(exit 1, zero linhas). Com `npm ci` e o `node v23.6.0` de `/opt/homebrew/bin` a build vai até o
fim: `exit=0`, `[build] Complete!`, função Vercel empacotada, 10 arquivos AEO de 7 páginas e a
poda de 0,2 MB. `package.json` e `package-lock.json` ficaram intactos (`npm ci`, não `install`).
Quem publicar em Node 16 vai reproduzir a falha do ambiente — é o Node, não a mudança.

**Navegador não foi aberto nesta entrega:** as três réguas executam o `Game` de verdade pelo
harness headless (semente fixa), que é onde o defeito é mensurável. A conferência visual do
contador em tela e do headshot ao vivo continua pendente para quem publicar.

## CTF no menu da home — 06/09/2026

Objetivo: restaurar o submenu de Single Player com CTF, validar clique e preservação do modo
ao trocar de mapa. Branch `fix/ctf-home-menu`, base `f7f4402e`, worktree `ctf-home`.
O submenu foi restaurado sem alterar os caminhos dos modos; traduções acompanham a escolha
entre mata-mata e CTF. UIR26 reprovou antes e passou depois;
`ctf-some-home` detectou a remoção. `mode-check.mjs`: 60/60 casos passaram.
Capturas e logs preservados em `artifacts/ctf-home/` (fora do Git). Navegador em
1200×800 confirmou o submenu aberto, clique em CTF e seleção de mapas em CTF;
inglês também conferido. Build e SEO/AEO 6/6 passaram; revisão
adversarial sem bloqueios. `docs:check` passou após regenerar os contadores de i18n.
Checkpoint funcional: `2f62741a`. `check:fast` terminou em 289,4 s com 107/111;
`docs:check` foi corrigido pela regeneração e passou isoladamente. Restam falhas
fora do diff: `audio:check` (pacote privado ausente), `eval:audiofablocal`
(`LAB8g` ambiência local do Escadão) e `eval:grafitelayout` (hash do layout do
Escadão desatualizado). Log completo em `artifacts/ctf-home/ctf-home-check-fast.log`.
Próximo passo: publicar a correção após autorização e conferir a home publicada.
Publicação não realizada; depende de autorização do dono.

## Confiabilidade da telemetria browser → admin — 06/09/2026

**Objetivo e pronto:** toda telemetria do jogo precisa atravessar navegador → Cloud Run →
Supabase → admin, e produção deve acusar a quebra do transporte. Checkout
`/Users/ruben/csbrasil/worktrees/telemetry-reliability-client`, branch
`codex/telemetry-reliability-client`, base `93cd8f41`.

**Diagnóstico:** os beacons JSON cross-origin faziam OPTIONS 204, mas não POST, porque
`sendBeacon` força credenciais e o backend não anunciava `Access-Control-Allow-Credentials`.

**Mudança em validação:** os eventos usam `fetch` com `keepalive: true` e
`credentials: 'omit'`; clientes antigos continuam cobertos pela correção CORS do backend.
`eval:telemetrytransport` cobra todas as rotas e tem mutantes. `prod-watch` agora testa o
preflight real do Cloud Run em vez de inferir saúde apenas pelo pipeline multiplayer.

**Validado localmente:** sintaxe, `eval:telemetrytransport`, três mutantes negativos,
`eval:analytics`, `eval:apis`, `check:vercel` 4/4 e build Astro/Vercel verdes.
O primeiro smoke hospedado ainda achou TDZ no pick inicial: `_ensureMusic` chama `_pick`
antes de `ANON_KEY`; o antigo `try/catch` protegia o menu. O isolamento foi restaurado e TT6
passou a cobrá-lo antes da nova execução do browser.

Este é o ponto de entrada para continuar trabalho no repositório sem herdar um retrato
antigo como se fosse o estado atual.

1. Leia `AGENTS.md` e `STATUS.md`.
2. Confira as issues abertas e `KNOWN-BUGS.md`; não use documentos em `docs/historico/`
   como backlog atual.
3. Para mudanças amplas, consulte `tools/eval/ARCH.md` e rode `graphify query/path/explain`
   antes de editar.
4. Rode a régua específica antes e depois do conserto. Se o defeito pode voltar em
   silêncio, acrescente uma mutação que prove que a régua morde.
5. Atualize `CHANGELOG.md`, as fontes em `docs/docs/` e o build `public/docs/` quando a
   mudança altera comportamento, operação ou documentação pública.
6. Todo commit novo deve conter trailer DCO (`git commit -s`).

O handoff detalhado de 04/08/2026 foi preservado em
`docs/historico/HANDOFF-2026-08-04.md`; ele explica decisões antigas, mas cita mapas,
telemetria, versão e pipeline que já mudaram.

## Qualidade multiplayer, autoridade de slot e comparação com single-player — 05/09/2026

**Objetivo e definição de pronto:** reduzir a sensação de travada no strafe agachado, impedir
arma/munição visual divergente e medir a experiência pela causa real, por sessão e por round.
Pronto para produção exige protocolo compatível, persistência, painel, rollout gradual dos três
nós e canário com dois clientes; WebRTC só entra depois como experimento comparável contra esta
linha de base, não como troca de transporte sem medição.

**Checkouts:** cliente `/Users/ruben/csbrasil/worktrees/mp-round-presence`, branch
`v2/mp-round-presence`, base `dcd8858edc7e` (alpha.217); backend pareado
`/Users/ruben/csbrasil-backend/worktrees/mp-round-presence`, branch `feat/mp-round-presence`,
base `00c679a33b9f`; admin `/Users/ruben/csbrasil/worktrees/admin-mp-round-truth`, branch
`codex/mp-round-player-truth`, base `8a5eedc866e6`. O corte completo foi publicado e validado
em produção em 05/09/2026. Checkpoint funcional do cliente: `e83af234a61c`; SHA publicada:
`0090ab82e064d729d2415bf7f281a34562b9203a`.

**Implementado:** `coro-snapshot-v4` leva ACK do input e estado autoritativo de arma, slots,
pente, reserva e recarga; v3/v2/JSON continuam negociáveis. A reconciliação usa a pose do mesmo
`seq`, preserva inputs ainda não reconhecidos e assenta correções pequenas progressivamente. O
cliente envia pedidos de rack/drop/reload; arma de jogador remoto remonta a malha de terceira
pessoa quando o snapshot muda o equipamento. A cada 10 s seguem eventos, p95 e máximo de
correção sem repetir a janela anterior.

**Evidência local:** `eval:netcodecbin` 18/18, `eval:netcode` 178/178 e build Astro/Vercel
verdes. `check:fast` passou 69/70; a única régua vermelha é `audio:check`, também vermelha no
checkout primário sem estas mudanças porque o gerador antigo interpreta o pacote hasheado v8
como 275 órfãos. O manifesto não foi regenerado nem esvaziado.

**Persistência e painel:** migration 031 está em
`/Users/ruben/db-privado/supabase/migrations/031_mp_reconciliation_quality.sql`, SHA-256
`2a3ba6aa359e4c407e84d16490faf888357f4fb94f2db9b26617a3b6071d1a98`.
Ela adiciona qualidade/reconciliação a `mp_session` e `mp_round`, preservando os RPCs das
migrations 029/030. O admin classifica cada round pela causa e compara FPS apenas nos mesmos
players que têm amostra em single e multiplayer.

**Banco publicado:** migration 031 aplicada em transação explícita; as quatro colunas de sessão
e oito de round foram conferidas. `anon` não executa `track_mp_sessions`/`track_mp_rounds`,
`service_role` executa, e os dois RPCs vazios respondem `0`.

**Publicado e validado em produção:** API no Cloud Run `csbrasil-backend-00023-rhr`, 100% do
tráfego, imagem `d05c00a` (`sha256:5cc832b50017377db6ab1fb9c10a16f517ceb3d4def4424775efc2c9b88fed8f`);
runtime `runtime-d05c00a` (`sha256:2acc05dde8206ab49c9063db73a2a346491827c77a3889118d032c4e46c3bed5`)
promovido com zero jogadores por EUA → Madri → São Paulo. Os três nós expõem servidor
`d05c00a`, cliente `0090ab82`, protocolos 1/2/3/4, `ev`/`slot-state`, simulação 60 Hz e
snapshot 30 Hz. O cliente Vercel `dpl_HQ7QCZbPaDWbRdhHcsg2msJYQ11C` está nos três aliases;
`prod-watch` `33942856245` confirmou edge, purge, banco e telemetria.

**Canário controlado:** dois clientes v4, `CANARIO-E` e `CANARIO-B`, ocuparam a mesma sala e
round; API e site mostraram `online:2/inGame:2`, o round persistiu pico 2, dois participantes,
36 janelas, FPS 60, RTT p95 209 ms, snapshot 30 Hz e gap 44 ms. Um cliente injetou 18 correções
para provar a coluna (`p95 0,02 m`, máximo `0,03 m`), o outro permaneceu em zero. Round,
participantes e sessões sintéticas foram removidos e conferidos em zero. Próxima evidência:
acompanhar rounds orgânicos; WebRTC permanece um canário posterior comparado à mesma régua.

## Analytics consolidado por jogador — 02/09/2026

**Objetivo inteiro:** dar ao game-admin uma única jornada por `anon_id` em Multiplayer,
Usuários, Geografia e Picks: single-player × multiplayer, nó/sala oficial × sala criada por
usuário, tempo, FPS, RTT, mapa/modo e cidade/país, sem armazenar IP. Dados antigos sem
`game_type` permanecem explicitamente como legado; pronto significa banco, APIs, cliente e
admin publicados e um evento novo confirmado de ponta a ponta.

**Checkout:** `/private/tmp/csbrasil-client-player-analytics`, branch
`codex/player-analytics-instrumentation`, rebased sobre `9f13a8c3` (alpha.210). O contexto agora acompanha
pick, performance e match com o mesmo `sessionId`/`matchEventId`, e é limpo ao sair/trocar de
modo. A régua `eval:analytics` cobre a separação e a não contaminação.

**Banco validado:** migration 029 aplicada em produção a partir de
`/Users/ruben/db-privado/supabase/migrations/029_player_analytics_context.sql` (SHA-256
`222ccfd49f8fd94d5f673973fc1107063adae121b78548fe011c243a8f5ca590`). Funções antigas e novas
foram chamadas em transação revertida. Nenhum dado de smoke ficou gravado.

**Validado:** syntax, analytics 6/6, online 5/5, netcode 83/83, codec 16/16, `check:vercel`
4/4 e build Astro/Vercel verdes. Os gates que exigem `sharp`/`@gltf-transform` passaram depois
de `npm ci`; `audio:check` continua ambientalmente bloqueado porque os áudios privados não
existem neste worktree (o manifesto não foi refeito vazio). O backend pareado passou o portão
completo; o admin passou lint, Astro check, 34 testes, hidratação e build. Produção ainda não
recebeu estes três commits.

**Selo `N online`:** a API e a view estavam respondendo, mas o primeiro refresh concorria com
o heartbeat e escondia o primeiro visitante por até 60 s. O bootstrap agora espera o POST de
presença antes de consultar o total; `eval:online` passa 5/5 e o mutante de ordem fica vermelho.

**Pendente imediato:** promover backend → cliente → admin e comprovar no painel um novo pick,
perf e match tipados. O `createdRoom` do cliente só fica completo após rollout do runtime dos
nós; `mp_session.created_room` continua sendo a fonte autoritativa durante a transição.

## Incidente de produção — 02/09/2026

**Objetivo inteiro:** estabilizar multiplayer sem tocar na lane de viewmodels: impedir sessão
online dentro do single-player, eliminar deriva de spawn/respawn/animação, restaurar CTF,
reduzir a densidade oficial, evitar slots Rubao abandonados e restaurar o catálogo de áudio
in-game. Definição de pronto para produção inclui canário jogável, painel coerente e rollout
compatível; os checkpoints enviados ao Git não autorizam deploy.

**Checkout:** `/Users/ruben/csbrasil/worktrees/multiplayer`, branch
`fix/prod-gameplay-diagnostics`, base `ef801c6a`. O backend correspondente fica em
`/Users/ruben/csbrasil-backend`, branch `feat/servidor-pre-lancamento`. Checkpoints enviados:
cliente funcional `6b53f8e2`, documentação gerada/final `acee42fb`; backend funcional
`1e4682a` (fixado no cliente `acee42fb`).

**Validado localmente:** `eval:netcode` 80/80; `eval:netcodecbin` 16/16; `eval:charvoice`
verde com mutantes de versão; build Astro verde. No navegador: MP→sair→SP ficou sem overlay
de rede e a sala CTF exibiu HUD autoritativo. No backend: smoke 74/74, runtime 8/8, protocolo
5/5, telemetria 38/38 e fronteiras de segurança verdes usando Node moderno.

**Ainda não aceito:** BUG-102 precisa de partida humana contra bot em movimento; BUG-103/104
precisam de canário em Piscina e Loja H; BUG-105 precisa de aceitação visual; BUG-107 não
deduplica duas conexões realmente ativas com o mesmo nick; BUG-108 precisa de uma captura real;
BUG-109 precisa de escuta no canário. A migration 027 e os números do game-admin continuam
fora deste checkpoint.

**Próximo passo:** publicar primeiro um backend compatível com v3/v2/v1, depois o cliente;
jogar o roteiro acima no canário, observar `/metrics` e só então promover. Se qualquer etapa
falhar, manter produção atual e não misturar este trabalho com armas/viewmodels.
