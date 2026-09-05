# Prompt de continuação para Claude

Continue a lane de áudio do CORO SOLTO no worktree
`/Users/ruben/csbrasil/worktrees/audio-fab-pilot`, branch `claude/audio-fab-pilot`, draft
PR #504. Não trabalhe na lane `primary`, não toque em outros checkouts e preserve
`viewmodel-blender` intacto.

Checkpoint autoritativo atual: implementação `71a121d2`, docs `d5afa8e0` e merge de
`origin/main` `1bc50a0f`. Após o merge, `check:fast` passou 80/80, `check:deploy` 37/37, o
build Astro passou em Node 24 e o smoke HTTP passou 572/572. Revalide se o HEAD ou a base
tiverem avançado; não repita a investigação se esses identificadores continuarem iguais.

Antes de agir, leia por inteiro `AGENTS.md`, `docs/LICOES.md` e
`docs/audio/FAB-PILOT-HANDOFF.md`. Depois confira branch, status, commits e os assets
privados mencionados no handoff. O checkout, os gates e o handoff são autoritativos; não
refaça a investigação a partir da conversa.

Objetivo imediato: acompanhar o PR #504 já sincronizado com `origin/main`, corrigir qualquer
falha real de CI/preview e preparar o caminho de release sem incluir assets privados sem
direitos. A curadoria de oito músicas, callouts antigos locais, rounds Fish, tiros
balanceados, troca sem som de faca e o ciclo completo da granada já estão implementados.

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
5. Confirme se `origin/main` avançou depois de `055839e0`. Só se tiver avançado, integre sem
   squash/force, regenere docs/arquitetura quando exigido e repita gates + build.
6. Atualize o handoff com SHAs, resultado dos gates, conflito resolvido ou bloqueio real,
   então envie a branch do PR sem force-push.

Ao reportar, separe: tecnicamente verde, validado no jogo, pronto para merge e liberado para
release. Esses quatro estados não são sinônimos.
