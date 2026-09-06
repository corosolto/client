# Escadão: casa central e conflito

## Objetivo

Converter a casa central existente em cobertura realmente jogável: entrada e saída continuam
válidas, a janela para a escada permanece aberta e a face voltada à aproximação do respawn
passa a ter uma abertura de tiro real. A abertura não pode expor os slots de nascimento.

## Diagnóstico e alteração

Antes da alteração, a nova régua `eval:escadao-conflict-home` falhava em
`Janela voltada ao respawn é uma abertura real de tiro, não só vidro decorativo`.
A fachada tinha um acabamento que parecia janela, mas o raio encontrava massa da casa.

`public/js/map_escadao_home.js` agora:

- concentra a abertura traseira na faixa livre entre as moradias da rua;
- mantém peitoril, verga e caixilho para leitura de abrigo;
- eleva o peitoril para impedir que o andar alto leia diretamente os slots do respawn;
- preserva o acesso por escada e passarela da casa central existente.

A solução oferece tiro para a aproximação da rua. Ela não transforma o respawn em linha reta
de sniper; `eval:escadao-rota` confirma que a alteração não adicionou visadas aos slots.

## Régua e mutação

`tools/eval/escadao-conflict-home-check.mjs` foi adicionado ao `check:fast` como
`eval:escadao-conflict-home`. Ele exige, no motor real em Node:

- abertura física nas duas faces de tiro da casa;
- caminho de bot do spawn da rua até o interior;
- cada aresta retornada pelo grafo caminhável.

A execução sem alterações passa. Com `--mutante=rear-window-sealed`, uma massa física veda a
abertura e a cláusula da janela traseira falha. O estado anterior também falhava a mesma
cláusula antes da alteração de geometria.

## Evidência executada

- `node tools/eval/escadao-conflict-home-check.mjs` — passou.
- `node tools/eval/escadao-conflict-home-check.mjs --mutante=rear-window-sealed` — falhou como esperado.
- `npm run eval:escadao-home` — passou: movimento, entrada/retorno, peitoril e grafo.
- `npm run eval:escadao-rota` — não introduziu visada de spawn; continua vermelho pelo lance
  inferior sem destino, já vermelho na árvore-base antes desta alteração.

## Limitação

Não foi aberta captura de navegador por instrução desta frente. A confirmação estética em 3:2
continua pendente de revisão humana; esta entrega prova geometria, raycast, movimento e grafo.

## Segunda etapa: abrigo do mirante

A área central do mirante, perto do respawn superior, tinha piso aberto entre as coberturas
laterais e não oferecia uma decisão de combate. Ela recebeu um abrigo de alvenaria com duas
portas opostas, janela voltada à descida e cobertura. Os dois props que estavam dentro das
portas foram deslocados às laterais; não foram removidos do mapa.

A nova régua `eval:escadao-mirante-abrigo` nasceu vermelha porque o abrigo não existia. Ela
exige abrigo marcado, rota do spawn da rua ao interior, arestas caminháveis, duas entradas e
janela com leitura para a descida. Depois da geometria, a rota até o interior contém 26 nós.
O mutante `--mutante=saidas-seladas` bloqueia as duas portas e faz o teste falhar no grafo.

Passaram também `eval:mapcontrato`, `eval:spawn`, `eval:botsim-golden`, além de estrutura,
descida, detalhes, grafo e contrato específicos do Escadão. Não houve nova captura de navegador
nesta etapa por instrução da frente; a validação humana do enquadramento em 3:2 segue pendente.
