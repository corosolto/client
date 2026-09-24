# Ledger — lane 14, rollback auditável de Funkeiros e Tribos Urbanas

Branch: `claude/audio-funkeiros-urbanas-rollback` · PR #531 · Dono da decisão auditiva: Ruben.

## Objetivo

Preparar o rollback seletivo das vozes de personagem de `F`/`U` com comparação v7×v8
auditável, scripts determinísticos e plano reversível — **parando na escolha do dono**.

## Pronto (heartbeat)

- **02:05–02:2x — checkpoint empurrado.** Commit `28d5da08` (investigação de 06/09, com
  trailer `Agent:` acrescentado por amend) após: `npm ci` (faltava `sharp`, 4 portões
  caiam por ambiente) e rebase sobre merges autofix dos bots (`5768f048`). Push limpo,
  `check:deploy` 37/37.
- **Comparativo A/B montado e verificado** em `private-assets/audio/fu-ab-2026-09-07/`
  (fora do Git): 8 arquivos, 7 personagens, por facção/personagem/ação(select).
  Pares: funkraiz v7×v8. Só-v8: mandrake, oakley, trapfunk, pagodeiro. Iguais entre
  packs: clubber, reggae. Ordem de escuta em `PLAY-ORDER.md`; hashes por arquivo em
  `fu-ab.manifest.json`.
- **Scripts determinísticos** (versionados aqui):
  - `tools/audio/fu-rollback-stage.mjs` — monta o A/B das fontes verificadas; fail-closed
    em qualquer divergência de hash; recusa regerar por cima de escuta existente.
  - `tools/audio/fu-rollback-verify.mjs` — régua: `--fontes`, `--staging`, `--alvo` e 4
    mutantes (`hash-trocado`, `extra-solta`, `voz-mitica-sumida`, `pagodeiro-sem-bordao`),
    todos provados mortos em 07/09 02:3x.
  - `tools/audio/fu-rollback-apply.mjs` — **se recusa a rodar** sem
    `docs/audio/fu-rollback-decisao.json` assinado pelo dono; prepara blob+manifest-alvo+
    PASSOS.md do build privado; nunca publica.
- **Régua verde**: `--fontes` ok (zip v8 `009e0125…`, pools 45/11→69/15, vozes Míticas
  presentes nos dois packs); `--staging` ok; 4/4 mutantes mortos.

## Errata da investigação de 06/09

A tabela do relatório `CLAUDE-AUDIO-ROLLBACK-FUNKEIROS-URBANAS.md` traz o sha256 de
`oakley` com um caractere trocado (posição 54: `…1163949a…` deveria ser `…11639f9a…`).
O hash correto foi recalculado duas vezes do zip verificado e está codificado nos
scripts. Nenhum outro hash divergiu. (Transcrição manual de hash hexadecimal é fonte
de erro recorrente; os scripts existem justamente para eliminar essa mão.)

## Bloqueios

- **Decisão auditiva do dono (única):** v7 (sem IA) ou v8 (bordões Fish)? O comparativo
  está pronto para ouvir em `private-assets/audio/fu-ab-2026-09-07/`.

## Checkpoints

| Quando | O quê | Onde |
| --- | --- | --- |
| 06/09 18:25 | investigação (fontes v7/v8 fora do Git) | commit `28d5da08`, PR #531 |
| 07/09 02:3x | A/B + régua + mutantes + apply bloqueado | commits desta rodada, staging fora do Git |

## Próximo passo

1. Dono ouve `PLAY-ORDER.md` e responde **v7 ou v8**.
2. Criar `docs/audio/fu-rollback-decisao.json` e rodar `fu-rollback-apply.mjs`.
3. Build privado conforme `PASSOS.md`; `fu-rollback-verify --alvo`; gates; commit/push;
   atualizar #531. Sem publicação sem ordem explícita.
