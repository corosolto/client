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

**Release consolidado em 02/09/2026:** o backend entrou em `main` pelos PRs
[#5](https://github.com/corosolto/backend/pull/5),
[#6](https://github.com/corosolto/backend/pull/6) e
[#7](https://github.com/corosolto/backend/pull/7). A API do Cloud Run serve o SHA
`dc06c1d90687aa6bd837c8760999ecd3de01f1f0` na revisão
`csbrasil-backend-00005-gkj`. O cliente entrou pelo PR
[#489](https://github.com/corosolto/client/pull/489), merge `f90901df`, e o release
automático `57a263ee` publicou `2.0.0-alpha.206` no Vercel. No `main` final passaram
`pr-fast`, `portao-browser`, release e o status de deploy do Vercel.

**Fronteira de produção:** esse merge publicou a API e o cliente, mas não promoveu a imagem
nova nos nós regionais BR/EU/US. Portanto, os consertos autoritativos do servidor só ficam
live depois de canário e rollout explícitos dos nós. O `prod-watch` também continua vermelho:
`/api/health` respondeu `fresh:false` para `presence`, `perf`, `telemetry`, `match` e `city`.
A migration 027, a coerência histórica do game-admin e a aceitação humana de bots, spawns,
CTF e áudio não foram concluídas. Os PRs antigos #3 e #4 do backend foram incorporados pelo
PR #5 e não devem ser mergeados novamente; #1 precisa de auditoria separada e #2 ficou
obsoleto diante do Terraform consolidado.

**Próximo passo:** fazer canário de um nó com a imagem correspondente ao backend consolidado,
jogar o roteiro acima, observar `/metrics` e os cinco sinais marcados como stale, aplicar e
validar a migration 027 quando autorizada e só então promover BR/EU/US. Se qualquer etapa
falhar, manter os nós atuais e não misturar este trabalho com armas/viewmodels.
