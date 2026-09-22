# ORQUESTRAÇÃO AO VIVO — CORO SOLTO

> Atualizado: **2026-09-09 21:42:35** · refresh automático a cada 2 min · dono: GLM 5.3 (ZCode) orquestrador
> Cores de estado: `ok` mergeável · `conflito` precisa de rebase · `rascunho` draft
> `M/U` = arquivos modificados/não-rastreados · `idade` = minutos desde a última atividade de arquivo

| Lane | Dono | Worktree | Branch@HEAD | Diff | PR | Ativ. | Ledger (último registro) |
|---|---|---|---|---|---|---|---|
| [01](01-VIEWMODEL-M4.md) | GLM-thread-1 (dono ativo, diff local) | vm-prep-rifles | codex/vm-prep-rifles@ea022c3c0|0M/0U sync|#509=OPEN/ok | >24h | 3809min · Limites que continuam de pé |
| [02](02-VIEWMODEL-PRECISAO.md) | GLM/ZCode-fila | vm-prep-precisao | codex/vm-prep-precisao@99a522684|0M/0U sync|#513=OPEN/ok rascunho | >24h | 2833min · Limitações declaradas |
| [03](03-VIEWMODEL-AWP.md) | Claude-fila | vm-prep-awp | codex/vm-prep-awp@d35c6658f|0M/0U sync|— | >24h | sem ledger |
| [04](04-VIEWMODEL-SHOTGUN.md) | Claude-fila | vm-prep-shotgun | codex/vm-prep-shotgun@d35c6658f|0M/0U sync|— | >24h | sem ledger |
| [05](05-VIEWMODEL-CURTAS.md) | GLM/ZCode-fila | vm-prep-armas-curtas | codex/vm-prep-armas-curtas@d35c6658f|0M/0U sync|— | >24h | sem ledger |
| [06](06-VIEWMODEL-RIFLES.md) | GLM/ZCode-fila | — (só leitura) | —|—|—|— | n/a | pendente |
| [07](07-VIEWMODEL-SMGS.md) | GLM/ZCode-fila | — (só leitura) | —|—|—|— | n/a | pendente |
| [08](08-VIEWMODEL-DMR.md) | Claude-ativo | vm-dmr-final | claude/vm-dmr-final@701e98e44|7M/0U sync|— | >24h | 3877min · Pendências explícitas |
| [09](09-VIEWMODEL-LMG.md) | GLM-thread-2 (branch glm/*) | vm-lmg-final | glm/vm-lmg-final@a8a9a8e89|2M/3U ahead 2|— | 42min | 2560min · Reprodução |
| [10](10-VIEWMODEL-CONTROLES.md) | GLM-thread-3 (branch glm/*) | vm-controles-final | glm/vm-controles-final@8b31f5dce|0M/0U sync|— | >24h | sem ledger |
| [11](11-VIEWMODEL-INTEGRACAO.md) | Claude-fila | — (só leitura) | —|—|—|— | n/a | pendente |
| [12](12-MITICOS.md) | Claude-ativo | miticos-integracao-priority | astra/miticos-integracao-priority@0a87a634e|0M/0U behind 35|#532=CLOS/conflito | 74min | sem ledger |
| [13](13-MAPAS-POLISH-INTEGRAL.md) | Claude-ativo | mapas-polish-integral | codex/mapas-escala-amazonia@fab8bd9b2|0M/0U sync|#538=OPEN/ok rascunho | >24h | 3907min · Checkpoint de entrega para GLM/Claude |
| [14](14-AUDIO-ROLLBACK.md) | GLM/orquestrador — AGUARDA DECISÃO v7/v8 do dono | claude-audio-rollback | claude/audio-funkeiros-urbanas-rollback@5eae10f8e|0M/0U behind 66|#531=MERG/? | >24h | 4033min · Próximo passo |
| [15](15-MAPAS-PRS-ABERTOS.md) | fila | — (só leitura) | —|—|—|— | n/a | pendente |
| [16](16-MOBILE.md) | fila | — (só leitura) | —|—|—|— | n/a | pendente |
| [17](17-AUDIO-MITICOS.md) | fila | — (só leitura) | —|—|—|— | n/a | pendente |
| [18](18-VIEWMODELS-HISTORICOS.md) | GLM/ZCode-bg | — (só leitura) | —|—|—|#464=OPEN/ok #468=OPEN/conflito #534=MERG/? | n/a | 4040min · (relatório no pacote) |
| [19](19-AMAZONIA-NOVA-RODADA.md) | fila | — (só leitura) | —|—|—|— | n/a | pendente |
| [20](20-PRACA-PODERES.md) | fila | praca-poderes-claude | claude/praca-poderes-visual@01eb7d8d7|3M/1U ahead 5, behind 307|— | >24h | 5257min · Próximo passo |
| [21](21-OPERACAO-TELEMETRIA.md) | fila | — (só leitura) | —|—|—|— | n/a | pendente |
| [22](22-AUDIO-RUNTIME.md) | fila | — (só leitura) | —|—|—|— | n/a | pendente |
| [23](23-COMBATE-POS-MERGE.md) | fila | — (só leitura) | —|—|—|— | n/a | pendente |
| [24](24-MULTIPLAYER.md) | fila | — (só leitura) | —|—|—|— | n/a | pendente |
| [25](25-ADMIN-RETENTION.md) | fila | admin-retention | claude/admin-retention-truth@8ac3e6e|0M/0U ahead 32, behind 9|— | >24h | sem ledger |
| [26](26-AUDIO-FAB-PILOT.md) | fila | audio-fab-pilot | claude/audio-fab-pilot@7d068e9c0|0M/0U sync|— | >24h | sem ledger |
| [27](27-VIEWMODEL-PISTOLA-FABLE.md) | Claude-bg | vm-fable51-pistol | claude/vm-fable51-pistol@fd58f492b|0M/0U sync|— | >24h | sem ledger |
| [28](28-RELEASE-PACOTE-1.md) | fila | — (só leitura) | —|—|—|— | n/a | pendente |

## Sessões vivas detectadas

```
Claude Code: 2 processos
ZCode/GLM:   5 processos
```

## Fila de execução (ordem dos viewmodels)

1. **01 M4 (GLM, em andamento)** → checkpoint destrava **02 Precisão**
2. 03 AWP → 04 Shotgun → 05 Curtas → 06 Rifles → 07 SMGs → 08 DMR → 09 LMG → 10 Controles
3. **11 Integração** só após checkpoints de 01–10 (relação explícita com #464/#468/#509/#513/#534)

