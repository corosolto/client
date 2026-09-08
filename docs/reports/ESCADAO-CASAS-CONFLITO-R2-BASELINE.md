# Escadão: baseline R2 das casas disputáveis

## Objetivo e estado

Checkpoint de 08/09/2026 para a PR #529, branch
`astra/escadao-casas-conflito`, no checkout exclusivo
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/escadao-casas-conflito`.
O relato humano foi convertido em contrato antes de uma nova edição de runtime:

- casa central alcançável tanto pela escada/passarela quanto pela rua;
- janela útil para o eixo da escada e janela útil para a aproximação inferior;
- piso físico e visível sob todas as amostras internas;
- dois sobrados próximos ao respawn superior com acesso lateral ao pavimento de cima;
- cada posição de tiro declarada tem revide e uma rota física pela qual o adversário
  consegue expulsar o ocupante;
- as posições altas não leem os slots do respawn superior.

O runtime não foi editado nesta rodada. O diretório não rastreado
`tools/eval/asset-evidence/maps/` foi preservado sem alteração.

## Instrumento

`tools/eval/escadao-casas-conflito-r2-check.mjs` usa `_collide`, `_moveEntity`,
`groundHeightAt` e os occluders do jogo. A cápsula usa raio 0,38 m, logo precisa de
0,76 m livres, e a subida aceita no máximo 0,30 m por degrau. Esses valores vêm do
corpo e do caminho de navegação em `public/js/game.js`; altura de olho 1,62 m é o
ponto de amostragem da matriz de visão.

O escopo `mutation` contém apenas cláusulas atualmente verdes. Isso evita apresentar
um mutante vermelho em cima de uma baseline que já estava vermelha. O escopo `central`
mede a casa central inteira. O escopo `full` acrescenta os dois sobrados do mirante.

## Medição da árvore atual

Executado com Node 23 em 08/09/2026:

| escopo | resultado | leitura |
|---|---:|---|
| `mutation` | 10/10 | núcleo verde usado para testar os mutantes |
| `central` | 12/12 | dois acessos, quatro amostras de piso e duas janelas com revide |
| `full` | 14/22 | baseline vermelha; oito cláusulas ainda ausentes nos sobrados |

As duas rotas da casa central chegaram ao interior. A rota alta terminou em 95
frames e a inferior em 120; ambas alcançaram a cota 2,75 m. As quatro amostras
internas têm `groundHeightAt == 2,75`, malha visível sob os pés e cápsula sem
deslocamento.

Nos dois sobrados, a malha de cobertura existe em 10,61 m, mas a física continua
devolvendo 7,56 m, a cota do mirante. A rota oeste travou em
`[-14,55; 7,56; -27,52]`; a leste travou em `[14,48; 7,56; -28,50]`.
Nenhuma subiu acima de 7,56 m. As duas posições altas ainda enxergam os quatro
slots B porque o pavimento tático e sua parede voltada ao nascimento não existem.

## Matriz de LOS e contrajogo

“Rota de expulsão” significa que o adversário na posição de revide também consegue
chegar ao ocupante usando a cápsula real; não significa apenas que há uma linha
desenhada no grafo.

| posição | olho/alvo cabem | tiro | revide | rota de expulsão | proteção do spawn B |
|---|---:|---:|---:|---:|---:|
| janela da escada | sim | sim | sim | sim | n/a |
| janela da aproximação inferior | sim | sim | sim | sim | n/a |
| sobrado oeste, janela interna | sim | sim, hoje no ar | sim, hoje no ar | **não** | **não, 4 slots** |
| sobrado leste, janela interna | sim | sim, hoje no ar | sim, hoje no ar | **não** | **não, 4 slots** |

O LOS sozinho premiaria um estado ruim: as posições dos sobrados estão no ar e,
justamente por faltar parede, têm tiro e revide livres. A régua irmã de piso, a
cápsula, a rota e a proteção de spawn impedem esse falso verde.

Malhas `decal:*`, `nonSolidSurface` e o lote de peças decorativas são excluídos da
oclusão visual. Um decalque atravessava o raio de revide da janela inferior e havia
produzido um vermelho falso, embora não participe dos occluders de tiro do jogo.

## Mutantes

O estado sem mutação passa 10/10 no escopo isolado. Cada mutante confirma que altera
o mundo antes de rodar as cláusulas:

| comando adicional | saída | cláusula mordida |
|---|---:|---|
| `--mutante=janela-fechada` | vermelho, 1 falha | LOS da janela da escada |
| `--mutante=piso-reaberto` | vermelho, 4 falhas | piso das quatro amostras centrais |
| `--mutante=acesso-removido` | vermelho, 2 falhas | travessia alta e rota de expulsão |

## Como reproduzir

```sh
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=mutation
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=central
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=full

PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=mutation --mutante=janela-fechada
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=mutation --mutante=piso-reaberto
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=mutation --mutante=acesso-removido
```

O terceiro comando deve sair 1 com `ESCADAO CASAS CONFLITO R2 RED`. Os três
comandos mutantes também devem sair 1, cada um com a família de falha da tabela.

## Limites e bloqueio de implementação

A medição roda no harness Node. A casa central registra o molde fechado que aciona a
branch GLB usada no navegador; os sobrados usam o colisor autoritativo do runtime e
o fallback procedural. Portanto, piso, cápsula e rota são evidência física, mas a
aparência final dos GLBs, o enquadramento 3:2 e a leitura da abertura ainda exigirão
captura em navegador depois do patch.

Em 08/09/2026, a fundação #540–#551 ainda não estava estabilizada: havia PRs em
estado DIRTY e UNSTABLE, incluindo a #548 que toca a escala de materiais do Escadão.
Por isso esta rodada para no teste, nesta medição e no plano de patch. O próximo passo
é receber o sinal de implementação após a fundação estabilizar; então atualizar a
branch contra a `main`, manter esta baseline vermelha como A e só depois editar
`public/js/map_escadao.js`.
