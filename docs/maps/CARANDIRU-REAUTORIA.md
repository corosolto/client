# Carandiru — continuação C1→C4

## Objetivo e aceite

Reautorar o mapa exibido como **Carandiru**, preservando o ID técnico
`penitenciaria`, com três rotas competitivas, Pavilhão 6 e muralha percorríveis,
assets Mint rastreáveis e aceite final no jogo real. Gates Node não substituem
capturas 1200×800 em 3:2, vídeo das três rotas, crítico independente nem aprovação
visual/jogável humana.

Fonte histórica e receita: `docs/reports/CARANDIRU-REFERENCIAS-E-REAUTORIA-2026-09-08.md`
do commit `24b88b96` na lane `codex/mapas-quality-program`.

## Base e isolamento

- worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/carandiru-c1`
- branch: `codex/carandiru-c1`
- base: #555, `cd576a1c11cefcb11fbb6b8c30907e1a34bb65a5`
- #555: `OPEN`, `MERGEABLE`; `pr-fast`, Vercel, smoke e demais checks verdes;
  `portao-browser` ainda em execução na abertura desta lane.
- A pilha compartilhada #542 e a lane Joá permanecem congeladas.

## C1 — nome, régua e blockout

- `7526d21e`: régua criada antes do mapa; a base #555 reprovou CAR1, CAR2,
  CAR3 e CAR6.
- `f1011d0d`: nome exibido Carandiru; ID preservado; duas subidas espelhadas,
  passarela interna em três lados e duas guaritas acessíveis; Pavilhão 6 oco com
  duas passagens térreas, escada e galeria superior.
- CAR1, CAR2, CAR3 e CAR6 verdes.
- Mutantes ativos e mordidos isoladamente: `muro-sem-acesso`,
  `guarita-fechada`, `pavilhao-solido`, `escada-decorativa` e
  `arame-na-passarela`.
- Réguas herdadas já verdes: fachada PF1–PF5, vida NV1–NV8, pickups,
  Penitenciária PEN1–PEN5, contrato global, spawn e CTF.

Comando local do gate: `npm run eval:carandiru`.
URL do jogo real após subir o servidor: `http://127.0.0.1:4321/?mapa=penitenciaria`.
Ainda não há captura 3:2 nem aprovação humana do C1.

## Próximo passo

C2 fecha três rotas spawn→MID e spawn→spawn, waypoints multinível, CTF, matriz
de LOS, contracoberturas e orçamento 5x5/8x8. Os mutantes `rota-unica` e
`spawn-exposto` precisam morder antes do checkpoint. Mint não entra antes do C3.
