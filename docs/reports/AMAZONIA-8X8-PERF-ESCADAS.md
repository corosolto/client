# Amazônia 8×8 — desempenho e escadas

## Escopo

Worktree `amazonia-8x8-perf-stairs`, branch `astra/amazonia-8x8-perf-stairs`.
Esta rodada altera somente `public/js/map_amazonia.js` e verificadores/documentação da Amazônia. Não altera `game.js`, renderer, materiais compartilhados, assets, rotas do rio, fauna ou a densidade da mata.

## Diagnóstico mensurável

O 8×8 do menu produz 15 bots controlados pelo jogo. A Amazônia mantém uma grade de 635 nós e 3.414 arestas; cada busca de rota removia o primeiro elemento do array com `shift()`, operação que desloca a fila inteira. Isso se repete durante a repath dos bots.

Foi copiado o `map_amazonia.js` do `HEAD` para uma cópia temporária na mesma pasta e comparado, no mesmo processo Node, contra a árvore desta worktree. O comando executa 3.600 buscas `findPath` reais, após aquecimento, em sete amostras; mede navegação, não GPU/FPS.

| Medida | HEAD | Candidato |
|---|---:|---:|
| bots no 8×8 | 15 | 15 |
| nós / arestas | 635 / 3.414 | 636 / 3.430 |
| colisores / oclusores | 1.444 / 243 | 1.445 / 244 |
| mediana de 3.600 buscas | 34,285 ms | 17,820 ms |

O lote de buscas caiu 48,0%. A alteração é `queue.shift()` para cursor de leitura na mesma BFS; mantém a ordem da fila e não reduz o grafo. A amostra isolada posterior variou para 22,300 ms, por isso o valor comparativo é reportado como bancada, não promessa de FPS.

## Escada e vista

A estação em `(17, 29)`, próxima ao respawn B, tinha o lance baixo voltado para o sul. Agora ele desembarca ao norte, a 2,98 m do spawn B e 77,49 m do spawn E. A pilha de madeira que ocupava esse desembarque foi dividida e preserva cover ao lado da passagem.

O verificador `amazonia-spawn-stairs-check.mjs` mede o desembarque com `Game._collide` e dispara um raycast da janela oeste para o rio. Resultado: desembarque limpo e zero oclusores nessa linha de visão. O mutante `--mutante=virar-b` inverte o lance e reprova `northToRespawn`.

## Validação

Executados com Node 23.6.0:

```sh
AMAZONIA_BASELINE="$PWD/public/js/.amazonia-perf-baseline.mjs" \
  node tools/eval/amazonia-8x8-perf-check.mjs --out=/tmp/amazonia-8x8-perf.json
node tools/eval/amazonia-spawn-stairs-check.mjs
node tools/eval/amazonia-spawn-stairs-check.mjs --mutante=virar-b # reprova como esperado
node tools/eval/amazonia-bots-check.mjs --seed=13007
node tools/eval/amazonia-ctf2-lane-check.mjs
npm run eval:amazonia
```

`eval:amazonia` passou: AMZ1–AMZ7, superfície/água, ambiência, 71/71 rotas de bot, 11/11 cabanas e a faixa lateral B (24 nós/25 ligações). A execução pelo `npm` do PATH padrão falha por Node 16 sem `structuredClone`, um estado herdado do ambiente; a mesma suíte passou sob Node 23.6.0 e não foi alterada nesta lane.

## Limite conhecido

Não houve navegador, captura WebGL nem medição de FPS, por restrição desta frente. O ganho demonstrado é de custo de pathfinding em 8×8; ainda falta uma sessão humana no navegador para confirmar frametime e leitura visual das escadas e da vista para o rio.
