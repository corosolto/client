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
- #555: `OPEN`, `CLEAN`, `MERGEABLE`, head `cd576a1c`; `pr-fast` verde em
  14m19s, `portao-browser` verde em 18m05s, Vercel, smoke e demais checks verdes.
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
- `check:deploy`: 37/37 em 54,2 s depois de reinstalar o binário local Darwin
  ARM64 de `sharp`; a primeira rodada 33/37 falhou somente por essa dependência.
- `npm run build`: verde em alpha.240; aviso esperado de Node 23 local para Node
  24 no Vercel.
- Jogo real: `window.__game.state === live` em `http://127.0.0.1:8136/?debug=1&auto=P,mst&map=penitenciaria`.
  Nove vistas 900×900 em `artifacts/carandiru-c1-live/`; a vista `t0` tem SHA-256
  `813b85c74b171567d1ed34d51c2ae472a880c8422d0cfe7e50d662958d8862f4`.

Comando local do gate: `npm run eval:carandiru`.
URL do jogo real após subir o servidor: `http://127.0.0.1:4321/?mapa=penitenciaria`.
Ainda não há captura 3:2, comparação cega contra referência nem aprovação humana
do C1. A vista real confirma o blockout, mas também mostra massas de tijolo e a
galeria ainda brutas; isso segue para C2/C3.

## Ciclo público de produção

Cada mapa segue: referências → assets Blender/Mint → montagem Three.js → crítica
visual independente → entrega. Responsáveis por assets não aprovam o próprio
trabalho. Colisão, rotas, escala, pisos e navegação permanecem determinísticos em
código; GLBs são cascas visuais. Comparação cega 3:2 e performance são avaliações
separadas.

## C2 — régua vermelha antes da implementação

- O checkpoint C2 reprova o mapa atual em CAR4 (rotas), CAR5 (LOS/contracobertura)
  e CAR8 (custo).
- `--selftest-mutantes` monta apenas um contrato sintético C2 válido para provar
  os operadores antes de alterar o mapa. `rota-unica` reprova somente CAR4 e
  `spawn-exposto` reprova somente CAR5. Esse autoteste não mede a jogabilidade do
  mapa; o fechamento C2 precisa fazer os mesmos mutantes morderem o mundo real.

## Próximo passo

C2 fecha três rotas spawn→MID e spawn→spawn, waypoints multinível, CTF, matriz
de LOS, contracoberturas e orçamento 5x5/8x8. A régua deve medir geometria e
grafo reais, sem confiar em metadados declarativos. Mint não entra antes do C3.
