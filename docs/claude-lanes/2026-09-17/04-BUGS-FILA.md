# GLM 5.3 — sanejar a fila de bugs: 4 mergeáveis parados, 1 conflitante a auditar

Estado verificado em 17/09/2026 contra `main` `dffcf1f58` (v2.0.0-alpha.255).

## Mergeáveis — preparar para merge imediato

| PR | Branch | Conteúdo |
|---|---|---|
| #606 | `fix/592-falha-de-rede-nao-e-crash` | queda de rede do jogador não abre issue automática |
| #587 | `fix/573-arnes-de-automacao-abre-issue` | arnês de automação apontado para produção não é crash |
| #569 | `fix/568-global-opaco-injetado` | docs: global opaco injetado sem conserto por classificação |
| #539 | `docs/lajes-bug141-estado` | docs: BUG-141 integrado na main |

Para cada um: `git fetch origin`, reconfirme mergeable, rode os gates do PR na worktree
correspondente (ou em checkout limpo), confira que o diff ainda faz sentido contra a
main de hoje e registre no PR o resultado. Merge dos docs (#569, #539) primeiro; código
(#606, #587) depois, um por vez, observando a esteira pós-merge (release automática).

## Conflitante — auditoria de relevância antes do conserto

#543 `fix/audio-envelope-volume-zero` ("granada de bot longe derruba o quadro — rampa
exponencial mirando em zero") está CONFLICTING, e a main já recebeu #552
"fix(audio): prevent zero exponential envelopes". Diff os dois: se #552 cobre o caso,
registre a supersessão e feche; se cobre parcialmente, extraia só a fatia faltante,
rebaseie e reabra os gates (`eval:audioenvelope`, `eval:audioalcance`).

## Drafts vivos — rodar gates, não implementar nada novo

- #580 `codex/bot-knife-round-r2` — bots respeitam alcance real da faca.
- #581 `codex/combat-feedback-r2` — sequência autoritativa de abates.
- #576 `codex/audio-fu-runtime-rollback` — vozes v7 Funkeiros/Urbanas; NÃO escolher
  v7/v8 sozinho, a decisão é auditiva e do dono.

Rode os gates de cada um, registre o placar no PR e pare. Content novo só depois da
fila acima esvaziar.

## Limites

- `KNOWN-BUGS.md` é o rastreador: todo veredito (merge, supersessão, pulo) ganha linha
  lá ou no PR.
- Nenhum merge sem o mesmo SHA passando gates; nada de merge por atacado.
- Worktrees locais relacionadas: `crash-prod-alpha250` (`claude/crash-prod-alpha250`,
  já serviu o #593 mergeado — audite se ainda carrega diff além dele), `mp-fix`
  (`fix/issues-bot-action-fantasma`), `bug-pipeline-audio`
  (`fix/admin-audio-crash-pipeline`).
