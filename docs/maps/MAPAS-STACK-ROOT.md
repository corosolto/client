# Integração da pilha de mapas

## Objetivo

Tornar revisável a pilha `#540→#541→#542→#545→#547→#548→#550→#551`, uma raiz por
vez, preservando autoria, contratos dos mapas e evidência real. Esta rodada cobre
somente o PR #540. Sem merge remoto, force-push ou avanço para descendentes.

## Isolamento e base

- worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/mapas-stack-root`
- branch: `codex/mapas-polish-integral`
- HEAD recebido: `0265aa766d8d95b47a779896be01df86f79cf6c3`
- base integrada: `origin/main` em `3880380165c170c0e694c28088876e396d5a1e29`
- `mapas-polish-integral` permaneceu fora desta operação, em
  `codex/mapas-escala-amazonia` no HEAD `fab8bd9b`.

## Estado da raiz #540

O merge encontrou onze conflitos: dez blocos derivados de documentação/índice e
`package.json`. A resolução preserva os gates de mapa do #540 e os novos gates
`eval:abateshud`/`eval:botfaca` de `main`; os blocos derivados serão regenerados.

VM14 antes do conserto: `main` 0/66 pickups sem alcance; #540 e a integração local
1/66. Falha: `carbine` do rack norte em `(11,18; 46,60)`, distância alcançável
1,23 m para teto de 1,0 m. A pilha introduziu a falha. Registro: BUG-145 em
`KNOWN-BUGS.md`; artefatos locais em `artifacts/mapas-stack-root/`.

## Correção VM14

O colisor cheio da cabine elevada foi substituído pelos oito apoios visíveis das
duas guaritas. VM14 passou de 1/66 para 0/66 falhas; pior distância alcançável
1,23 m → 0,14 m. O mutante `torre-bloco` restaura o volume antigo e reproduz
1/66, `carbine` a 1,33 m, com saída 1. A régua de fachada agora exige os oito
apoios e rejeita a tag antiga de volume cheio.

## Contratos recuperados na integração

O `check:fast` revelou dois registros derivados que ainda não conheciam o Campinho
do Morro. A impressão digital de grafite agora inclui `map_campomorro.js`; o layout
do Escadão foi regenerado contra `main`, preservando as 37 peças já assadas do
Campinho. `eval:grafitelayout` passa com 8 mapas e 2.985 peças; o mutante `mapa`
volta ao vermelho em M1.

O laboratório Fab também passou a estender para `campomorro` a cama de
vento/vegetação de favela já existente no pack, sem criar asset nem caminho novo.
`eval:audiofablocal` passa com 17 mapas; o mutante `sem-campomorro` reproduz LAB8g.

## Validação

- 9/9 gates focados da Penitenciária: fachada, pickup VM14, vida, invariantes,
  contrato, spawn, CTF de rodada/vitória e orçamento de shader.
- `eval:grafitelayout` e `eval:audiofablocal`: verdes; mutantes `mapa` e
  `sem-campomorro`: vermelhos como esperado.
- `eval:netcode`: 178/178 em reexecução direta; a falha única do runner completo
  foi transitória.
- conjunto focado final: 11/11 em 487,2 s; `npm run build`: verde em Node 23,
  com aviso de que a Vercel usará Node 24.
- `audio:check` e `feet:check`: vermelhos idênticos em `origin/main` limpo por
  ausência do pack local e offsets defasados, respectivamente; não introduzidos
  pelo #540.
- `eval:docsautoria`: verde depois do checkpoint; autoria de `docs/gen-docs.mjs`
  derivada da árvore commitada.

## Checkpoint recuperável

- merge local: `920ee4c233d60f738dc2bb129b1805dd7c9671cf`
- pais: `0265aa766d8d95b47a779896be01df86f79cf6c3` e
  `3880380165c170c0e694c28088876e396d5a1e29`
- `check:deploy` pós-commit: 37/37 verde em 55,0 s, incluindo
  `eval:docsautoria`.
- nenhum push, merge remoto ou alteração de PR descendente foi feito.

## Próximo passo

Fazer o teste manual da passagem sob a guarita e revisar a raiz local. Depois da
aprovação humana e eventual publicação da raiz, a integração pode seguir para o
PR #541.
