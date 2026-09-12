# Claude Opus 5 — decidir o piloto de áudio FAB

Use a worktree `audio-fab-pilot`, branch `claude/audio-fab-pilot`, após confirmar seu estado.
Leia `docs/audio/FAB-PILOT-HANDOFF.md`. Código e inventário estavam prontos, mas faltavam escuta
A/B e canal de incorporação; não trate teste técnico como aprovação sonora.

Prepare comparação curta, normalizada e identificada, sem gerar novo lote nem publicar arquivo.
Verifique origem/licença, loudness, clipping, distância, prioridade, repetição e convivência com
vozes. Depois da escolha do dono, incorpore apenas o aprovado em um PR próprio ou documente o
encerramento do piloto. Rode gates de manifest/runtime, commit e push. Nunca versionar segredo
ou pacote privado.

