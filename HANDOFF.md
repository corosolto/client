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
`codex/mp-round-player-truth`, base `8a5eedc866e6`. Nenhum deploy deste corte foi feito ainda.
Checkpoint funcional do cliente: `e83af234a61c`.

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
`2a3ba6aa359e4c407e84d16490faf888357f4fb94f2db9b26617a3b6071d1a98`, ainda não aplicada.
Ela adiciona qualidade/reconciliação a `mp_session` e `mp_round`, preservando os RPCs das
migrations 029/030. O admin classifica cada round pela causa e compara FPS apenas nos mesmos
players que têm amostra em single e multiplayer.

**Rollout pendente:** fazer checkpoints dos três repositórios; aplicar migration 031; publicar
cliente primeiro (ele cai em v3 nos nós antigos), depois API/runtime v4 por nó, e por último o
admin. No canário, cobrar `/health` com protocolos 1/2/3/4 e `slot-state`, dois clientes,
pickup/reload/strafe agachado, dois players no round e colunas de correção persistidas.

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
