# HANDOFF

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

## Analytics consolidado por jogador — 02/09/2026

**Objetivo inteiro:** dar ao game-admin uma única jornada por `anon_id` em Multiplayer,
Usuários, Geografia e Picks: single-player × multiplayer, nó/sala oficial × sala criada por
usuário, tempo, FPS, RTT, mapa/modo e cidade/país, sem armazenar IP. Dados antigos sem
`game_type` permanecem explicitamente como legado; pronto significa banco, APIs, cliente e
admin publicados e um evento novo confirmado de ponta a ponta.

**Checkout:** `/private/tmp/csbrasil-client-player-analytics`, branch
`codex/player-analytics-instrumentation`, iniciada em `6e8ed8ce`. O contexto agora acompanha
pick, performance e match com o mesmo `sessionId`/`matchEventId`, e é limpo ao sair/trocar de
modo. A régua `eval:analytics` cobre a separação e a não contaminação.

**Banco validado:** migration 029 aplicada em produção a partir de
`/Users/ruben/db-privado/supabase/migrations/029_player_analytics_context.sql` (SHA-256
`222ccfd49f8fd94d5f673973fc1107063adae121b78548fe011c243a8f5ca590`). Funções antigas e novas
foram chamadas em transação revertida. Nenhum dado de smoke ficou gravado.

**Validado:** syntax, analytics 6/6, netcode 83/83, codec 16/16 e APIs migradas verdes. O
backend pareado passou o portão completo; o admin passou lint, Astro check, 34 testes,
hidratação e build. Produção ainda não recebeu estes três commits.

**Pendente imediato:** corrigir a corrida inicial do selo `N online`, rebasear sobre a main
publicada (alpha.209), promover backend → cliente → admin e comprovar no painel um novo pick,
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
