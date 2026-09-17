# GLM 5.3 — destravar as duas raízes de mapas (#540 e #554) que seguram 16 PRs

Estado verificado em 17/09/2026. `main` está em `dffcf1f58` (v2.0.0-alpha.255). Os mapas
formam duas correntes empilhadas cujos degraus superiores têm como base outro PR aberto,
não a main: não podem entrar enquanto a raiz não entrar.

- **#540** `codex/mapas-polish-integral` — CONFLITANTE, destrava 7: #541, #542, #545,
  #547, #548, #550, #551.
- **#554** `codex/mapas-stack-root-v2` — CONFLITANTE, destrava 9, incluindo a escada
  verde #555 → #562 → #563 → #564 → #565 e o #560.

Worktrees: `mapas-stack-root` está em `codex/mapas-stack-root-v2` (`b8f16cbc3`). A
worktree `mapas-polish-integral` está ocupada com `codex/mapas-escala-amazonia` (#551,
mergeável — não mexa nela): checkout de `codex/mapas-polish-integral` em worktree nova
ou livre.

## Método

1. `git fetch origin` e re-audite o conflito de cada raiz contra a main atual; o
   snapshot desta prompt é volátil.
2. Recupere a raiz sobre a main (rebase ou recriação do diff), resolvendo por intent de
   mudança, não por "aceitar um lado". Rode os gates da árvore (`check:fast` e os
   `eval:` por mapa tocado — `eval:mapjson`, `eval:texel`, contratos por mapa conforme
   `AGENTS.md` da worktree).
3. Force-push a raiz, rebase o degrau seguinte sobre ela, repita os gates, um degrau por
   vez. Nunca a pilha inteira de uma vez.
4. Após cada degrau verde, apresente o mapa correspondente ao dono para teste humano em
   servidor local antes de qualquer merge. A ordem de apresentação é decisão do dono,
   não sua.

## Limites

- Nenhum merge para `main` sem gate verde no mesmo SHA + teste humano registrado. O
  dono autoriza merge um mapa por vez.
- Não reintroduza as 18 seleções de mapa rejeitadas; a seleção atual do menu é
  `m03 m05 m10 m11 m14 m16 m17 m22` e muda só por nova decisão de escuta.
- PRs de estrutura novos (#575–#605: UPA, Lajes fechamento, Amazônia r3, Campinho r3,
  Loja H, Ferro Velho, Córrego, Parque, Posto r3, Atacadão, Obras) ficam para depois
  das raízes; não os rebaseie agora.
- Se um degrau revelar-se obsoleto contra a main, registre o veredito no PR e pule —
  não force entrada de conteúdo morto.
