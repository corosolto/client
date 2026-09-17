# Claude Opus 5 — multiplayer: auditoria de salvamento da lane encalhada e um slice

Estado verificado em 17/09/2026. O #483 (multiplayer autoritativo) foi fechado sem
merge em 06/09 e NÃO deve ser ressuscitado inteiro. Desde então a main recebeu:
#588 (correção de posição: cinco defeitos reais + escolha de mapas da sala), #593
(watchdog de lançamento + playerDef), #594 (prazo da sonda com tempo congelado), #598
(alocação para onde tem gente), #595 (revert br2).

## O encalhado

Worktree `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/mp-round-presence`,
branch local `v2/mp-round-presence` em `b5923728b` ("stabilize node latency selection"),
com docs de rollout v4 abaixo. A branch **não existe mais no origin e o HEAD não está na
main**: ou o trabalho foi perdido do remoto, ou foi superado. Antes de qualquer coisa,
`git log main..v2/mp-round-presence`, diff hunk a hunk contra a main atual e veredito
por bloco: salvável como fatia pequena, superado por #588/#594/#598, ou morto.
Registrar o veredito no `KNOWN-BUGS.md` e, se houver fatia viva, PR próprio e pequeno.

Frontes irmãs para leitura de contexto (não editar sem necessidade):
`csbrasil-backend/worktrees/{mp-round-presence, mp-qualidade, bug-crash-dispatch,
telemetry-reliability}` — os PRs #1–#4 do `backend` estão conflitantes contra o
servidor implantado; auditar antes de qualquer merge. Lanes admin:
`admin-mp-improvement` (`codex/admin-mp-improvement`, `db738fa`) e
`admin-mp-round-truth` (`codex/mp-report-rollout-ledger`, `524fbb0`), no repositório do
admin fora da organização.

## O slice único

Depois do veredito, escolha e entregue **um** slice crítico do gate Fase 1 do
roadmap (`corosolto-roadmap/CURRENT.md`), na ordem de valor:

1. MP cria sala → convite → entrada → início → reconexão → fim com estado coerente
   (provar com dois clientes reais e tracer);
2. tracer do remoto legível, sem virar laser contínuo;
3. bots sustentam partida sem falsear contagem de jogador.

Prova = dois browsers reais + ledger do round coerente + `eval:netcode`,
`eval:netcodecbin` verdes no SHA final. Commit, push, PR pequeno. Aprovação do dono em
partida real é obrigatória para fechar o slice.

## Limites

- Um slice por vez; nada de netcode reescrito ou protocolo novo sem decisão do dono.
- Nenhum merge de fila do backend por atacado; recorte protocolo/telemetria/infra em
  PRs pequenos e verificáveis.
- Se a fatia viva do `mp-round-presence` depender de runtime que a main já mudou,
  prefira reescrever a ideia sobre a main atual a rebasear o diff velho.
