# Ledger — lane 14, rollback auditável de Funkeiros e Tribos Urbanas

Branch: `claude/audio-funkeiros-urbanas-rollback` · PR #531 · Dono da decisão auditiva: Ruben.

## Fechamento de 10/09/2026

- O dono rejeitou as vozes de personagem geradas por IA e escolheu o retorno ao estado
  v7. A lane de aplicação é `codex/audio-fu-runtime-rollback`, sobre
  `origin/main@2115d5e2c`.
- O manifest vivo ainda expunha 9 Funkeiros × 4 eventos Gemini. Tribos Urbanas não tinha
  `characterVoice` estruturado, mas seu pool ainda continha quatro anexos Fish além do v7.
- O runtime agora filtra F/U pela allowlist exata v7, ignora `characterVoice` estruturado
  nessas facções e falha fechado se restarem apenas takes novos.
- O lote Gemini permanece catalogado, mas sua autorização de build foi revogada. Nenhum
  pack privado, áudio ou música foi editado/publicado.
- Evidência e critérios: `docs/reports/AUDIO-FU-RUNTIME-ROLLBACK-2026-09-10.md`.
- Gate novo `eval:audiofurollback` verde; mutante `fu-ia-volta` detectado pelo gate novo,
  `eval:audiovoicemix` e `eval:charvoice`.

## Objetivo

Restaurar seletivamente Funkeiros (`F`) e Tribos Urbanas (`U`) ao catálogo histórico v7,
sem reintroduzir Web Speech, voz genérica ou bytes privados no Git. A escolha do dono foi
registrada em 10/09; o draft de aplicação é o PR #576.

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

## Estado de 22/09/2026

- `codex/audio-fu-runtime-rollback` foi atualizado por merge, sem rebase, de
  `origin/main@60ad7501323ef076263f645bfca341e2454fce6b` (alpha.262). O delta continua
  restrito ao resolvedor F/U, gates, fixture v7, proveniência e este dossiê.
- O manifesto servido ainda expõe 9 personagens F × 4 eventos estruturados e nenhum U;
  o candidato filtra o resultado para 44 caminhos únicos F e 11 U do v7. O gate ao vivo
  comprovou Funkraiz e Clubber nos bordões históricos e Mandrake no pool v7.
- Os 55 caminhos únicos da allowlist responderam HTTP 200. Os bytes servidos dos três
  bordões fixos de Funkraiz, Clubber e Reggae conferem com os sha-256 do A/B privado.
- `fu-ab.manifest.json` continua íntegro (sha-256
  `3823b15be08df3ef57f37291b99ffbe38c147091afed44714047aa00eac5318b`); seus mutantes
  de hash trocado e arquivo extra foram detectados.
- O ZIP v8 que existia em `/tmp/csbrasil-audio-restore.QZXwty/v8.zip` não sobreviveu ao
  reinício. Por isso `fu-rollback-verify --fontes` não pode repetir hoje a leitura da fonte
  bruta. Isso impede reconstruir/publicar o pack privado nesta lane, mas não invalida o
  rollback de runtime: nenhuma publicação ou byte de áudio faz parte do PR #576.
- Falta aprovação humana da escuta no jogo antes de promover o draft. Tecnicamente, pack
  sem take permitido permanece em silêncio e nenhuma fala genérica/Web Speech reaparece.

## Checkpoints

| Quando | O quê | Onde |
| --- | --- | --- |
| 06/09 18:25 | investigação (fontes v7/v8 fora do Git) | commit `28d5da08`, PR #531 |
| 07/09 02:3x | A/B + régua + mutantes + apply bloqueado | commits desta rodada, staging fora do Git |
| 10/09 05:55 | filtro fail-closed F/U e gate causal | commit `6e813f18`, draft PR #576 |
| 22/09 | atualização para alpha.262 e revalidação ao vivo | merge local + checkpoint desta rodada |

## Próximo passo

1. Rodar o jogo local com Funkeiros e Tribos Urbanas e ouvir seleção, kill, rádio e round.
2. Confirmar que os memes v7 são os takes esperados e que personagem sem take aprovado
   permanece em silêncio.
3. Somente após esse aceite, promover o draft #576. Rebuild ou publicação do pack privado
   continuam fora desta lane e exigem recuperar a fonte v8 verificada.
