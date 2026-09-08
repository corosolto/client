# Integração da pilha de mapas — degrau #541

## Objetivo e isolamento

Aplicar somente o delta autorado do PR #541 sobre a raiz substituta #554, sem
alterar as branches originais, mergear PR ou avançar ao degrau #542.

- worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/mapas-stack-541`
- branch: `codex/mapas-stack-541-v2`
- base: `codex/mapas-stack-root-v2` em `b8f16cbc333ce3a44939f18e9db48a36bb7578d1`
- fonte: `codex/mapas-penitenciaria-material` em
  `1a6699ceedc1081fb6d60202ef0ca20f6c81f046`
- commit aplicado com proveniência: `5d6db38e` (`cherry-pick -x`, autoria Claude).

Antes de iniciar este degrau, o PR #554 estava `CLEAN/MERGEABLE` e todos os checks
remotos estavam verdes, incluindo `pr-fast` em 14m27s e `portao-browser` em 18m03s.

## Resolução

Os conflitos ficaram restritos aos nove documentos gerados. Eles foram regenerados
contra alpha.240. `public/js/map_penitenciaria.js` combinou sem conflito o UV em
metros e os vãos profundos da #541 com os oito apoios de guarita do BUG-146.

O texto histórico da #541 citava o hash PF5 anterior à correção VM14. Nesta base,
o contrato correto é `57052d4b94a8`: o passe visual preserva colisão, navegação,
spawns, CTF e pickups depois da troca do volume cheio pelos apoios.

## Validação

- nove gates focados: 9/9 (`penitenciariafacade`, `penitenciariapickup`, vida,
  mapa, contrato, spawn, CTF de rodada/vitória e shaderbudget).
- `eval:texel -- --mapa=penitenciaria`: mediana/chão 128 px/m, p05 70 px/m,
  dispersão p95 1,00×, dispersão máxima 1,5× e 0% abaixo de 64 px/m.
- `npm run build`: verde em alpha.240; Vercel usará Node 24 no remoto.

## Limitações e próximo passo

A combinação ainda não recebeu nova captura 3:2 nem aprovação visual humana. O
próximo passo é rodar `check:deploy` sobre a árvore commitada, publicar a branch sem
force-push e abrir um PR substituto empilhado na #554. Não iniciar #542 antes de
conhecer o estado remoto desse PR.
