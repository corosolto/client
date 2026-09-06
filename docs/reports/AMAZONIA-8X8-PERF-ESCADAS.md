# Amazônia 8×8 — desempenho e escadas

## Escopo

Worktree `amazonia-8x8-perf-stairs`, branch `astra/amazonia-8x8-perf-stairs`.
Esta rodada altera `public/js/map_amazonia.js` e verificadores/documentação da Amazônia; reutiliza o índice estático existente do Lajes sem alterar o módulo compartilhado. Não altera `game.js`, renderer, materiais compartilhados, assets, rotas do rio, fauna ou a densidade da mata.

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


## Continuação 06/09/2026 — CPU completa e cobertura das escadas

Objetivo: reduzir custo real do single-player 8×8, confirmar todos os lances voltados ao respawn mais próximo e abertura visual B→rio, preservando mapa/fauna/densidade. Sem navegador, merge ou release. Base desta continuação: `770174a5`; checkout e branch acima, PR #527.

Milestone medido: perfil Node `Game.update` real por 1.800 frames consumiu 8.294,783 ms; `_losClear` 7.712,533 ms/11.898 chamadas; `findPath` somente 1,426 ms/118 chamadas. A hipótese de BFS como causa principal foi rejeitada. Madeira agrupada e chão de mata dominam o raycast. A nova régua `amazonia-raycast-check.mjs` foi vermelha antes da correção (`artifacts/amazonia-8x8/raycast-before.json`): 2.968.896 testes de triângulo, sem consulta com parada antecipada. O índice já validado do Lajes aplicado só a esses lotes manteve os impactos e reduziu para 708 testes; artefato `raycast-after.json`. Não altera triângulos desenhados ou materiais.

Revisão adversarial identificou duas cegueiras do teste anterior: raio começava fora da parede e pé livre não demonstrava subida. Régua ampliada caminha por `Game._moveEntity` em todos os lances, mira o rio de dentro da cabana e tem mutantes físicos. Antes, duas escadas E apontavam contra o respawn; depois da inversão, 10/10 apontam e sobem. A orientação das caixas d'água foi preservada para não deslocar sólido sobre papagaio.

Resultado rejeitado: primeira simulação A/B no mesmo processo teve estados divergentes por caches preguiçosos do arnês. Será substituída por processos novos por amostra, mesmo seed, conferindo hash do estado. Não usar `sim.json` como comparação equivalente.

Próximo passo: concluir A/B isolado na fonte final; rodar mutantes, suíte Amazônia e portões locais; capturar geometria offline 3:2; revisão adversarial final; checkpoint e atualização do PR. Captura Blender estrutural não substitui WebGL/GLBs/FPS. Nenhum release/merge autorizado.


Checkpoint desta continuação: suíte Amazônia aprovada, 71/71 rotas, 11/11 cabanas, 10/10 subidas e orientações, sete mutantes detectados. Régua final (`raycast-final.json`): 192 raios, 91 com impacto, 3.002.496→912 testes de triângulo, zero divergências, fumaça preservada e 220 casos de stress aprovados. Crítico independente não encontrou regressão bloqueadora. O caminho respawn→pé e patamar→interior não é coberto pelo gate de escadas; a suíte de bots cobre acesso às cabanas separadamente.

Capturas finais offline em `artifacts/amazonia-8x8/offline/`: quatro PNGs 1440×960, scripts export/render e `capture-manifest.json`. Blender Workbench recebeu os meshes efetivos do harness; sem GLBs carregados/texturas/shaders. Observado: abertura B livre; dez lances caminháveis pela física; imagens B/E mostram patamares e degraus. Ressalvas visuais no fallback: arbusto sobre parte dos degraus baixos B e tora junto ao pé E(-14,-22). Não constituem bloqueio físico medido, nem aprovação estética do runtime.

A/B de processos isolados preservou estados para os três seeds; falta rodar recibo final após todas as verificações, pois a fonte mudou durante a primeira coleta isolada. Portões gerais ainda em execução; DOCSAUT recusa docs de autoria não commitadas, portanto requer checkpoint antes da rechecagem.


Checkpoint `802eff65` preserva implementação e provas. `check:fast` inicial terminou 112/123; nove falhas decorrem de dependências ausentes/estado da documentação, com rechecagem em andamento após instalação local. Duas pendências fora do escopo: áudio privado ausente (inventário local zero; não regenerar manifest vazio) e layout de grafite do Escadão divergente, sem alteração desse mapa nesta branch. Invariantes gerais ainda em execução.

O remoto do PR avançou sozinho para `0e216ca6` (autofix incorporou base alpha.236). A integração necessária será por rebase dos checkpoints locais sobre essa branch, sem force push, sem merge do PR e sem release. Diferença remota em runtime limita-se a versão/preview do Sertão; `game.js`, mapa Amazônia e helper de raycast não mudaram. Próximo passo: concluir checks, preservar recibos gerados fora do git, integrar remoto, medir A/B final, atualizar relatório e PR.

O A/B final isolado ficou consistente nos três seeds, com a mesma trajetória em candidato e linha base (`sameSimulation: true` em todos) e a mesma cena medida pelo censo (`sameObjects: true` em todos). Recibo final em `artifacts/amazonia-8x8/sim-final.json`: seed `13007` reduziu `8.390,382 ms` para `809,396 ms` (`90,4%`), seed `7` reduziu `7.560,656 ms` para `914,738 ms` (`87,9%`), seed `4321` reduziu `8.938,174 ms` para `978,601 ms` (`89,1%`). `sourceSha256` do processo e do filho permaneceu `e26ef0925c13521bfaf46fd2403ec5655253dbe237c9d787a76588ce81ef58d3` em todas as amostras. `npm run docs:check` passou depois dos blocos gerados atuais: 26 blocos em 33 marcadores, 90 arquivos de jogo, 44.514 linhas. A branch continua sem navegador, sem merge e sem release.

## Fechamento 06/09/2026 — integração do remoto e recibo A/B final

O remoto havia avançado para `0e216ca6` (autofix trouxe a base `alpha.236`). Os dois checkpoints locais foram **rebaseados** sobre essa referência, sem force push e sem merge do PR. Os únicos conflitos foram blocos derivados (`STATUS.md`, `README.md`, `ARCH.generated.md` e as quatro páginas de docs pt/en); resolvidos pela base e regerados com `npm run docs` e `npm run arch`. Nenhum conflito em runtime: `public/js/map_amazonia.js`, `game.js` e o índice de raycast não colidiram.

### Régua 8×8 determinística (antes/depois)

`tools/eval/amazonia-8x8-sim-check.mjs` agora publica também **objetos** e **memória** por amostra, além de orçamento de quadro e chamadas. Três seeds, processos novos por amostra, ordem alternada, 1.800 quadros cada, Node 23.6.0. Linha base é a mesma fonte com a consulta desligada (raycast linear), o que isola a mudança e mantém a cena idêntica.

| Seed | Quadro mediano (base → cand.) | p95 | p99 | pior quadro | Lote total | Redução |
|---|---|---|---|---|---|---:|
| 13007 | 3,508 → 0,404 ms | 14,755 → 1,052 ms | 19,732 → 1,538 ms | 44,162 → 3,597 ms | 8.001,4 → 827,7 ms | 89,7% |
| 7 | 2,796 → 0,430 ms | 13,101 → 1,109 ms | 17,713 → 1,556 ms | 33,054 → 3,855 ms | 7.364,3 → 888,2 ms | 87,9% |
| 4321 | 3,157 → 0,473 ms | 16,385 → 1,285 ms | 22,533 → 1,803 ms | 33,323 → 3,919 ms | 8.918,8 → 981,0 ms | 89,0% |

Repartição da CPU (seed 13007): `_losClear` 10.714 chamadas, 7.457,4 → 415,3 ms; `_collide` 57.271 chamadas, 235,4 → 257,0 ms; `findPath` 133 chamadas, 1,611 → 1,357 ms. As contagens de chamada são idênticas dos dois lados — muda o custo por consulta, não a quantidade de trabalho pedida pelo jogo.

**Bots:** 15 nos três seeds, 1.620 quadros em `live` de 1.800. **Objetos:** 1.445 colisores, 244 oclusores, 638 nós, 3.458 arestas, 552 malhas e 39.276 triângulos — iguais em candidato e base (`sameObjects: true`). **Memória:** heap final 45,25 → 47,09 MB (seed 13007), 47,26 → 38,57 MB (seed 7), 42,45 → 43,62 MB (seed 4321); pico de heap 52,10 → 49,47 / 51,58 → 50,79 / 52,48 → 52,65 MB; RSS 136,73 → 136,52 / 134,89 → 133,30 / 138,08 → 136,59 MB. A variação de heap é ruído de GC entre processos, não regressão medida. `sameSimulation: true` e `sourceSha256` idêntico nas seis amostras.

Recibos em `artifacts/amazonia-8x8/rebased/sim-final.json` e `artifacts/amazonia-8x8/sim-final.json`: duas coletas independentes da mesma régua, com reduções de 89,7/87,9/89,0% e 90,4/87,9/89,1%. A dispersão entre coletas fica em ±0,7 ponto, muito abaixo do efeito medido, e o censo de objetos sai idêntico nas duas.

### Rota (BFS) contra o mapa anterior à mudança

`AMAZONIA_BASELINE` apontando para `public/js/map_amazonia.js` de `42c01175` (antes desta frente): lote de 3.600 buscas, mediana de sete amostras, **29,475 → 17,394 ms (41,0%)**, com 15 bots dos dois lados. O grafo cresceu de 635/3.414 para 638/3.458 nós/arestas — o ganho não vem de podar o grafo.

### Invariantes e mutantes

Oito mutantes, todos reprovando como esperado na fonte final:

| Régua | Mutante | Invariante coberta |
|---|---|---|
| escadas | `virar-b` | lance de B volta a apontar contra o respawn |
| escadas | `bloquear-lance` | sólido no pé impede a subida física |
| escadas | `fechar-janela` | janela oeste perde a linha para o rio |
| raycast | `linear` | consulta indexada desligada |
| raycast | `sem-parede` | oclusor deixa de bloquear |
| raycast | `sem-consulta` | `rayOccluded` ausente |
| raycast | `sem-parada` | consulta sem parada antecipada |
| 8×8 | `menos-mata` | **novo:** censo de objetos não vê mata apagada |

O mutante `menos-mata` remove metade das malhas puramente visuais (fora de oclusores e colisores). A simulação não muda um bit — `sameSimulation` continua `true` — e o gate reprova só por `sameObjects: false`, com 552 → 387 malhas e 39.276 → 28.248 triângulos. É a régua que impede "ganhar" desempenho apagando conteúdo.

### Comandos

```sh
npm run eval:amazonia                       # inclui raycast e escadas
npm run eval:amazonia-8x8                   # A/B isolado 8×8 (quadro, buscas, bots, objetos, memória)
npm run eval:amazonia-8x8 -- --mutante=menos-mata   # reprova como esperado
npm run eval:amazonia-rota                  # lote de buscas; com AMAZONIA_BASELINE compara antes/depois
```

`eval:amazonia` passou na fonte rebaseada: AMZ1–AMZ7, superfície, água, ambiência (31 animais, AR1–AR4), 71/71 rotas de bot, 11/11 cabanas, raycast `AMRP1` com 192 raios, 91 impactos, zero divergências, 3.002.496 → 912 triângulos testados e 220 casos de stress, e escadas 10/10 apontando para o respawn mais próximo e subindo pela física.

### Portões locais

`npm run check:fast` na fonte rebaseada: **120/123**, 211,1 s. As três falhas e o que são:

- `docs:check` — blocos derivados atrasados depois dos dois scripts npm novos. Corrigido com `npm run docs` e `npm run arch`; `docs:check` volta verde (26 blocos em 33 marcadores, 90 arquivos de jogo, 44.514 linhas).
- `audio:check` — `manifest.json` defasado em relação ao disco local, que não tem o pacote de áudio privado. Fora do escopo: esta branch não altera áudio e regenerar manifest com inventário vazio apagaria referências.
- `eval:grafitelayout` — layout de grafite do Escadão divergente do hash de `map_escadao.js`. Fora do escopo: `git diff 0e216ca6..HEAD --name-only` não lista nenhum arquivo do Escadão; a divergência vem da base.

### Limite conhecido

Continua sem navegador, sem captura WebGL e sem medição de FPS. Todo número acima é CPU de `Game.update` em Node, com GLBs, texturas, shaders e áudio fora da conta. Redução de CPU de visão não é promessa de quadros por segundo: falta uma sessão humana no navegador para confirmar frametime e a leitura visual das escadas e da vista para o rio. Sem merge e sem release nesta frente.
