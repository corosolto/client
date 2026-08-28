# Lote céu — figuras olhadas no tamanho em que são servidas

Capturadas com `mapview.html` no servidor local (1280 px, swiftshader), depois que os
GLBs entraram — `stats().glb` conferido igual ao total de itens em cada mapa, para não
capturar o proxy procedural achando que é o modelo.

| figura | o que prova | o que NÃO prova |
|---|---|---|
| `corrego-pipa.png` | a pipa é o `pipa_papel.glb`: losango amarelo com a rabiola de lacinhos pendurada. Antes disto o fy_lajes tinha losango de 2 triângulos e o córrego não tinha pipa nenhuma. | que ela se mexe — isso é a CEU2 |
| `arara-frente.png` | a arara voa **de bico à frente**, asas abertas, rabo atrás. É a confirmação visual da constante `BIRD_FORWARD_X = -1` do `skylife.js`, que nenhuma sonda de node pega: a CEU4 mede o curso da asa, não o rumo do bicho. Arara voando de ré passaria verde. | o bater ao longo do tempo (CEU4) |
| `mansao-faixa.png` | a faixa é legível na tela: "CALDO DE CANA DO JOÁ · QUIOSQUE 7", proporção de faixa rebocada. | — |

## As duas coisas que só a figura pegou

Registradas aqui porque as duas passaram VERDE na régua enquanto estavam erradas — é o
padrão de falha que este repo já pagou caro, e vale mais escrito que esquecido.

1. **Faixa ilegível.** A primeira versão pintava a `CanvasTexture` por cima do nó
   `faixa` que veio do GLB. A CEU5 lia o texto de `userData` e passava. Na tela era um
   rabisco: aquela faixa é uma fita 3D de 1.333 vértices cujo UV ocupa um retalho torto
   do atlas (u 0,001-0,968 · v 0,274-0,999). Conserto: `PlaneGeometry` com UV 0..1
   ancorada no nó do GLB (que continua dando posição, pivô e comprimento).

2. **Faixa gigante.** O conserto acima nasceu com a faixa ~14× maior que o avião — um
   outdoor voando — porque o tamanho vinha de `Box3.setFromObject` (espaço de **mundo**,
   já multiplicado pela escala do `placeProp`) e a geometria nova era criada em espaço
   **local**, levando a escala outra vez. A CEU5 continuou verde nos dois casos.

A lição não é "escreva mais régua": é que **régua de node mede mecânica, figura mede
leitura**, e a faixa é um item de leitura. Onde as duas se separam, a figura manda.
