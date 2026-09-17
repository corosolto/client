# Onda 1 da retomada — 17/09/2026

Retomada das quatro frentes pausadas (viewmodel, mapas, bugs, multiplayer) depois do
checkpoint de 09/09 e da sessão de viewmodel de 13–14/09. Estado verificado ao vivo em
17/09 contra `main` `dffcf1f58` (v2.0.0-alpha.255), 60 PRs abertos. Convenção de modelos
mantida da migração de 07/09 (`docs/claude-lanes/2026-09-07/README.md`): **Claude Opus 5**
para Blender, personagem e direção visual; **GLM 5.3 no ZCode** para gates, conflitos,
integração determinística, áudio e código.

## Já resolvido desde o checkpoint de 09/09 (não reabra)

- Míticos #570 e Joá #578 mergeados; áudio #552; MP: #588, #593, #594, #595, #598.
- O PR #483 de multiplayer foi fechado sem merge em 06/09 — não existe mais como
  destinatário de rebase.

## A Onda 1

| # | Prompt | Modelo | Estado em 17/09 |
|---|---|---|---|
| 01 | `01-VM-UNIFICADO-RECOVERY.md` | — (executada) | gates + push de 607 commits concluídos |
| 02 | `02-VIEWMODEL-SHOTGUN.md` | Claude Opus 5 | a fazer; pior arma do placar cego |
| 03 | `03-MAPAS-RAIZES-540-554.md` | GLM 5.3 | a fazer; destrava 16 PRs |
| 04 | `04-BUGS-FILA.md` | GLM 5.3 | a fazer; 4 mergeáveis parados |
| 05 | `05-MP-PRESENCE-SALVAGE.md` | Claude Opus 5 | a fazer; branch encalhada + 1 slice |

## Portões do dono que nenhum agente fecha

1. Aceite visual em partida real das 5 armas aprovadas pelo crítico
   (svd, deagle, revolver38, m4, scar) e, depois, de cada arma que sair das lanes.
2. Escuta do menu v7 (Suno) antes de qualquer promoção de pack.
3. Teste humano de mapa, um por vez, conforme as raízes #540/#554 destravarem a escada.
4. Merge de PR grande continua exigindo recorte em fatias pequenas e verificáveis.
5. Decisão sobre `ready:true` de `ak`/`pistol` no #584 (muda o que o jogador vê).

## Regras operacionais ( herdadas do orquestrador de 07/09 )

- Um dono único por worktree; confirme HEAD e `git status` antes de editar.
- Checkpoint commitado a cada marco; push ao encerrar; heartbeat no ledger da lane.
- Agente que para por limite: o próximo lê o ledger e o `git status`, não recomeça.
- Fronte visual só fecha com captura inspecionada e aprovação humana registrada.
