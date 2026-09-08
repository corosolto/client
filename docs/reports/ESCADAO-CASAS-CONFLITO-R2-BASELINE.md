# Escadão: baseline R2 das casas disputáveis

## Objetivo e estado

Checkpoint de 08/09/2026 para a PR #529, branch
`astra/escadao-casas-conflito`, no checkout exclusivo
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/escadao-casas-conflito`.
O relato humano foi convertido em contrato antes de uma nova edição de runtime:

- casa central alcançável tanto pela escada/passarela quanto pela rua;
- duas janelas opostas na mesma sala: uma para a escada e outra para a aproximação
  inferior;
- piso físico e visível sob todas as amostras internas;
- duas casas próximas ao respawn superior com porta lateral e interior no nível do
  mirante;
- cada posição de tiro declarada tem revide e uma rota física pela qual o adversário
  consegue expulsar o ocupante;
- as posições altas não leem os slots do respawn superior.

O runtime foi corrigido após a reprovação humana. O diretório não rastreado
`tools/eval/asset-evidence/maps/` permaneceu preservado sem alteração.

## Instrumento

`tools/eval/escadao-casas-conflito-r2-check.mjs` usa `_collide`, `_moveEntity`,
`groundHeightAt` e os occluders do jogo. A cápsula usa raio 0,38 m, logo precisa de
0,76 m livres, e a subida aceita no máximo 0,30 m por degrau. Esses valores vêm do
corpo e do caminho de navegação em `public/js/game.js`; altura de olho 1,62 m é o
ponto de amostragem da matriz de visão.

O escopo `mutation` contém apenas cláusulas atualmente verdes. Isso evita apresentar
um mutante vermelho em cima de uma baseline que já estava vermelha. O escopo `central`
mede a casa central inteira. O escopo `full` acrescenta as duas casas do mirante.

## Medição da árvore atual

Executado com Node 23 em 08/09/2026:

| escopo | resultado | leitura |
|---|---:|---|
| `mutation` | 10/10 | núcleo verde usado para testar os mutantes |
| `central` antes/depois | 12/13 → 14/14 | abriu a face oposta e bloqueou os slots E |
| `full` antes/depois | 14/23 → 24/24 | abriu as duas casas e preservou o contrajogo |

As duas rotas da casa central chegaram ao mesmo ponto interno `[-1,4; 2,75; 15,5]`.
A rota alta terminou em 101 frames e a inferior em 217; ambas alcançaram a cota
2,75 m. As quatro amostras internas têm `groundHeightAt == 2,75`, malha visível sob
os pés e cápsula sem deslocamento. A nova janela sul tem tiro e revide até
`[0; 1,5; 24]`; uma parede de proteção depois dessa aproximação bloqueia os quatro
slots E e preserva a saída lateral já usada pelos jogadores.

As duas caixas sólidas do mirante viraram shells. As rotas laterais chegam aos
interiores em 66 e 69 frames, sem mudar a cota 7,56 m. O poste que ocupava exatamente
a porta leste em `[14; -27]` foi movido para `[14; -29]`, mantendo os cabos visíveis.

## Matriz de LOS e contrajogo

“Rota de expulsão” significa que o adversário na posição de revide também consegue
chegar ao ocupante usando a cápsula real; não significa apenas que há uma linha
desenhada no grafo.

| posição | olho/alvo cabem | tiro | revide | rota de expulsão | proteção do spawn B |
|---|---:|---:|---:|---:|---:|
| janela da escada | sim | sim | sim | sim | n/a |
| janela oposta da mesma sala | sim | sim | sim | sim | 0 slots E |
| casa oeste, janela interna | sim | sim | sim | sim | 0 slots B |
| casa leste, janela interna | sim | sim | sim | sim | 0 slots B |

Piso, cápsula, rota e proteção de spawn são medidos separadamente para impedir que
uma linha de tiro no ar ou através de uma caixa fechada produza um falso verde.

Malhas `decal:*`, `nonSolidSurface` e o lote de peças decorativas são excluídos da
oclusão visual.

## Correção após a captura humana

As capturas de 08/09/2026 mostraram que a primeira versão desta régua aceitava a
janela de outro volume conectado como se fosse a face oposta da sala tática. A
imagem `Screenshot 2026-09-08 at 04.31.03.png` mostra a janela existente; a imagem
`Screenshot 2026-09-08 at 04.31.07.png` mostra a parede oposta totalmente fechada.
As imagens `04.31.35`, `04.31.46`, `04.31.51` e `04.32.12` mostram os volumes do
respawn superior sem entrada para um pavimento jogável.

A cláusula `SALA/janelas-opostas-no-mesmo-comodo` agora exige que os dois olhos
fiquem dentro do retângulo da sala `x=-3,35..1,35`, `z=14,2..16,8`. A linha inferior
sai de `[-1,4; 4,37; 15,7]`, atravessa a face sul em `z=16,8` e aponta para a rua em
`[0; 1,5; 24]`. Portanto uma janela pertencente a outra casa não pode mais produzir
um falso verde.

## Mutantes

O estado sem mutação passa 10/10 no escopo isolado. Cada mutante confirma que altera
o mundo antes de rodar as cláusulas:

| comando adicional | saída | cláusula mordida |
|---|---:|---|
| `--mutante=janela-fechada` | vermelho, 1 falha | LOS da janela da escada |
| `--scope=central --mutante=janela-oposta-fechada` | vermelho, 1 falha | LOS da janela sul |
| `--mutante=piso-reaberto` | vermelho, 4 falhas | piso das quatro amostras centrais |
| `--mutante=acesso-removido` | vermelho, 2 falhas | travessia alta e rota de expulsão |
| `--scope=full --mutante=casa-mirante-fechada` | vermelho, 2 falhas | porta leste e expulsão |

## Como reproduzir

```sh
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=mutation
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=central
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=full

PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=mutation --mutante=janela-fechada
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=central --mutante=janela-oposta-fechada
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=mutation --mutante=piso-reaberto
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=mutation --mutante=acesso-removido
PATH=/opt/homebrew/bin:$PATH node tools/eval/escadao-casas-conflito-r2-check.mjs --scope=full --mutante=casa-mirante-fechada
```

Os três comandos sem mutação devem sair 0. Os cinco comandos mutantes devem sair 1,
cada um com a família de falha da tabela.

## Evidência visual e limite atual

A medição roda no harness Node. A captura de navegador gerou 21 imagens reais em
`artifacts/escadao-visual/r2-casas-fix/`, incluindo as duas faces da casa central e
entrada/interior das duas casas do mirante. A leitura visual confirma vãos reais,
piso contínuo e as janelas orientadas para a área de disputa.

O processo visual terminou com status técnico `failed` porque o servidor respondeu
404 para 45 decais e áudios ausentes; todas as imagens foram salvas antes da asserção.
A `main` `d8bc0bd2` foi integrada, a documentação derivada foi regenerada e o build
alpha.241 passou com Node 23. A régua ampla também passou com 10/10 lances levando a
destinos, 0/979 posições altas lendo o spawn e grafo 669/669 conectado. Para isso a
pilha de pneus que deixava 0,02 m de invasão na boca inferior foi recuada 0,10 m, e a
proteção da janela ganhou um corredor central registrado no grafo.
