# Campinho da Quebrada — candidato de release

## Escopo confirmado

O mapa jogável atual que contém o Campinho é `quebrada`, em
`public/js/map_quebrada.js`; ele aparece no registro como **Quebrada (Rua do
Baile)**. `public/js/map_campomorro.js` e o plano histórico do Campo do Morro
não pertencem à árvore atual nem ao registro `MAPS`. Portanto este candidato
não tenta restaurar um mapa antigo de forma disfarçada: melhora a arena que os
jogadores conseguem selecionar hoje.

## Problemas medidos antes da mudança

`node tools/eval/map-check.mjs quebrada` na base desta worktree encontrou
Campinho navegável, mas com uma chegada exposta pela travessa e dois quadrantes
sul com cobertura baixa em relação ao restante: pior espaçamento `5.42 m`,
razão de props `0.24×` e `0.26×` da mediana. A exposição do spawn B era `0.8%`.

## Mudança

1. Duas muretas baixas e deslocadas dos portões dão cobertura ao primeiro passo
   entre travessa e campo sem fechar os dois caminhos CTF.
2. Bancos curtos, alternados junto ao alambrado, tornam as laterais uma rota de
   progressão e não uma travessia longa sem decisão. Eles ficam fora do centro e
   dos quatro slots de spawn.
3. Um placar físico no fundo do campo melhora a leitura do destino e não entra
   em colisão.

Nenhum módulo de runtime, material compartilhado, pickup, spawn, arma ou outro
mapa foi alterado.

## Evidência após a mudança

| Verificação | Resultado |
| --- | --- |
| `npm run syntax` | passou |
| `node tools/eval/campinho-release-check.mjs` | `gate-cover=2`, `sideline-cover=11`, `scoreboard=1` |
| `node tools/eval/map-check.mjs quebrada` | MAP1/MAP4: zero; MAP2B: `2.1 m` e `42.9 m²`; MAP5: `4.28 m`, razão mínima `0.38×`; CTF2: mínimo duas rotas |
| `node tools/eval/map-contrato-check.mjs` | Quebrada: `341` nós, `2114` arestas, rota válida e grafo conexo |
| `node tools/eval/pickup-arma-check.mjs` | 62 pickups de Quebrada acessíveis; 16 mapas aprovados |
| `node tools/eval/botsim.mjs 60 quebrada` | stuck `1.711%`, spin em roam `0.064` volta/min, distribuição de rotas `0.64` |

O mutante que renomeia o marcador runtime do primeiro lote de bancos falha em
`campinho-release-check` com `sideline-cover: 9 (esperado 11)`, provando que o
check inspeciona o mundo construído e não apenas a presença do script.

## Limites antes de release

Esta lane não abriu navegador por escopo, logo não há aprovação humana de frame
para o placar, as muretas e os bancos. O candidato está tecnicamente validado;
a revisão visual em 3:2 e uma partida manual continuam obrigatórias antes de
merge/release.
