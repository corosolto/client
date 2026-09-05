# Prompt de continuação para Claude

Continue a lane de áudio do CORO SOLTO no worktree
`/Users/ruben/csbrasil/worktrees/audio-fab-pilot`, branch `claude/audio-fab-pilot`, draft
PR #504. Não trabalhe na lane `primary`, não toque em outros checkouts e preserve
`viewmodel-blender` intacto.

Antes de agir, leia por inteiro `AGENTS.md`, `docs/LICOES.md` e
`docs/audio/FAB-PILOT-HANDOFF.md`. Depois confira branch, status, commits e os assets
privados mencionados no handoff. O checkout, os gates e o handoff são autoritativos; não
refaça a investigação a partir da conversa.

Objetivo imediato: deixar o PR #504 reconstruível, sem conflitos com `origin/main`, com a
curadoria de oito músicas aplicada à rotação e ao pacote, callouts antigos de combate no
laboratório local, rounds Fish preservados, tiros balanceados, troca de arma sem som de faca
e o ciclo completo da granada audível em single player e multiplayer.

Não publique nenhum WAV/MP3 privado e não interprete aprovação de escuta como liberação de
direitos. Os callouts alpha218 e a voz Fish continuam `rights-review-required`; assets Fab e
BOOM não entram no Git. Um release pode levar o código/fallback e fontes legalmente
redistribuíveis, mas não deve fabricar aprovação legal. Resolva conflitos semanticamente,
nunca com `-X ours`, `-X theirs`, squash ou force-push.

Fluxo de retomada:

1. Leia a seção mais nova do handoff e confira `git status --short`.
2. Rode os gates de áudio e suas mutações descritas ali.
3. Rode `npm run check:fast`, `npm run check:deploy`, `npm run build` e smoke HTTP dos assets
   usados pelo manifest. Se o manifest local privado precisar ser reinstalado, use
   `tools/audio/fab-game-local.mjs` com os cinco diretórios documentados no handoff.
4. Faça checkpoints recuperáveis com trailer `Agent: Claude Code (Opus 5)` e sem incluir
   arquivos privados, credenciais ou mudanças alheias.
5. Busque `origin/main`, resolva o conflito do PR #504 preservando os dois lados, regenere
   docs/arquitetura quando exigido e repita gates + build após o merge.
6. Atualize o handoff com SHAs, resultado dos gates, conflito resolvido ou bloqueio real,
   então envie a branch do PR sem force-push.

Ao reportar, separe: tecnicamente verde, validado no jogo, pronto para merge e liberado para
release. Esses quatro estados não são sinônimos.
