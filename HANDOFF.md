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

## Incidente de produção — 02/09/2026

**Objetivo inteiro:** estabilizar multiplayer sem tocar na lane de viewmodels: separar
single-player da sessão online, reduzir saltos de rede, restaurar CTF/spawns/áudio, eliminar
slots fantasmas, reduzir bots e salas oficiais e tornar cada experiência diagnosticável no
admin. Pronto significa os três nós no mesmo build, canário WebSocket real, saída sem slot
fantasma, dados individuais no banco/painel e aceitação humana de jogabilidade. Ranking fica
separado até distinguir SP, kill em bot e kill em humano de forma autoritativa.

**Checkouts e fontes de verdade:** este ledger fica em
`/Users/ruben/csbrasil/worktrees/multiplayer`, branch `fix/prod-gameplay-diagnostics`. As
mudanças finais foram preparadas em worktrees efêmeras e já chegaram às branches `main`:

- cliente: PR [#492](https://github.com/corosolto/client/pull/492), merge `545f44f7`, release
  `6e8ed8ce` / `2.0.0-alpha.208`;
- backend: PR [#11](https://github.com/corosolto/backend/pull/11), merge `2d9c3cab`; o PR
  [#12](https://github.com/corosolto/backend/pull/12), merge `8b31b1d5`, fixa a imagem
  aprovada em `deploy/IMAGEM`;
- game-admin: PR [#2](https://github.com/rubenmarcus/csbrasil-admin/pull/2), merge `c70b3466`;
- schema privado: `/Users/ruben/db-privado/supabase/migrations/028_mp_sessions.sql`, SHA-256
  `a4333dcdd226518d2900de15a671d14b37efed5979cdc7d193d96bdfcb20bbbf`.

**Concluído e validado:** migration 028 aplicada no Supabase `zdzxhnrplqoykswcjvay`; foram
confirmados `public.mp_session`, `track_mp_sessions(jsonb)` e contagem inicial zero. A tabela
tem RLS, acesso de `service_role`, lote máximo de 200 e não guarda IP. Cliente passou
`eval:netcode` 83/83 e `check:deploy` 36/36. Backend passou telemetria 40/40, deploy 23/23,
runtime 8/8, protocolo 5/5, segurança/observabilidade e API smoke 15/15. Admin passou 30/30,
multiplayer 7/7, typecheck sem erros, build e hidratação.

**Produção aceita tecnicamente:** imagem
`southamerica-east1-docker.pkg.dev/csbrasil-backend/coro-solto/servidor:runtime-2d9c3ca`
(digest `sha256:eb0f40e32b2ec78cc977d03f4a02310fdb0c721279a54d4d91cec9564e08f9ad`), fixada no
cliente `6e8ed8ce` e servidor `2d9c3cab`. Madrid foi o canário vazio; um WebSocket real
negociou `coro-snapshot-v3`, mediu 30,4 Hz, recebeu 6 entidades 3v3 e devolveu o total a zero
após `leave`. Depois disso BR e US foram promovidos vazios. `/health` dos três expõe duas
salas, `officialTeamSize:3`, `snapshotHz:30`, os mesmos SHAs e protocolos 1/2/3.

**Admin publicado:** `https://csbrasil-admin.vercel.app/multiplayer` mostra até 500 jornadas
recentes com horário de Lisboa, jogador/anon, sessão curta, nó, sala oficial ou criada,
mapa/modo, time, duração, K/D, FPS, RTT, snapshot/gap, classificação de experiência, saída e
SHAs. Três sessões reais `CANARIO` já apareceram com EU, FUNKEIROS × PALHAÇOS, penitenciária,
rounds, time E, 2 s, 60 FPS, 45 ms, saída limpa e builds corretos; a última também registrou
30 Hz / gap de 40 ms e foi classificada como experiência `boa`. O painel não expõe IP.

**Ainda não aceito / não confundir com pronto:** partidas reais ainda precisam de aceitação
humana para animação dos remotos/bots, dano, spawn/respawn em Piscina e Loja H, CTF completo
e áudio in-game. O cabeçalho legado de presença ainda pode divergir momentaneamente dos nós
(foi observado `online 0 · partida 1` enquanto `/health` tinha zero jogadores); a jornada
nova é correta, mas histórico agregado mistura builds antigos. Ranking seguro não foi
implementado: separar SP/MP e atribuir pesos distintos a humano, bot e objetivo exige evento
de kill/objetivo assinado pelo servidor, não `submit-match` do cliente.

**Próximo passo concreto:** jogar em produção 10–15 minutos em Madrid e São Paulo, incluindo
Piscina, Loja H e CTF, e conferir no admin uma jornada longa com amostras completas de FPS,
RTT, snap e gap. Se os saltos persistirem, comparar FPS local contra snap/gap/RTT da mesma
linha antes de mexer em tick rate. Depois, criar a lane de ranking autoritativo SP/MP; não
misturar esse trabalho nem novos ajustes de multiplayer com armas/viewmodels.
