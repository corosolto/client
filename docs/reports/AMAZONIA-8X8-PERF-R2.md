# Amazônia 8×8 — desempenho WebGL r2

Data: 10/09/2026

Branch: `codex/amazonia-8x8-perf-r2`

Base investigada: `origin/main@2115d5e2c29eefb4491ae63b0f1600c200a750bb`

## Objetivo e pronto

Reproduzir o relato “no amazonia 8x8 ainda ta dando muito lag no single player,
idealmente não daria” em Chrome/WebGL2 real, separar CPU, GPU/desenho, raycast,
colisão e bots, e corrigir somente uma causa demonstrada. Pronto exige:

- processos Chrome novos para 5×5/8×8 e medium/low;
- timer GPU quando a extensão WebGL2 estiver disponível;
- nenhum erro de página, 9/15 bots reais e cena em estado `live`;
- escadas viradas para o respawn, visão do rio, palafitas apoiadas e conteúdo visual
  preservados pelos gates existentes;
- capturas 3:2 e 16:9, build e `check:deploy` verdes;
- comparação pós-correção feita sem outro render/eval pesado concorrente.

## Baseline real e exclusivo

Servidor local: `http://127.0.0.1:8172/`

GPU: `ANGLE Metal Renderer: Apple M4 Pro`, WebGL2, sem software fallback.

Viewport: 1536×1024 (3:2), 30 s por processo, semente 4321.

| Equipe | Qualidade | p50 | p95 | máximo | draw calls máx. | triângulos máx. | bots |
|---|---:|---:|---:|---:|---:|---:|---:|
| 5×5 | medium | 8,3 ms | 9,7 ms | 24,2 ms | 728 | 1.730.226 | 9 |
| 8×8 | medium | 8,3 ms | 15,7 ms | 25,7 ms | 856 | 1.874.730 | 15 |
| 5×5 | low | 8,3 ms | 9,7 ms | 75,0 ms | 581 | 1.112.706 | 9 |
| 8×8 | low | 8,3 ms | 9,9 ms | 37,9 ms | 689 | 1.161.914 | 15 |

O problema reproduz: medium 8×8 perde o orçamento de um monitor a 120 Hz no p95,
enquanto low 8×8 e medium 5×5 permanecem próximos de 10 ms. Não houve frame acima
de 100 ms nessa amostra. Isso não prova o resultado em outras GPUs.

Recibos locais ignorados pelo Git:
`artifacts/amazonia-8x8-r2/browser-baseline/*.json` e as PNGs homônimas.

## Diagnóstico causal antes da edição

Os tempos acumulados de 30 s mostram que 8×8 aumenta simulação de bots e LOS, mas
o preset low recupera o frame sem trocar a quantidade de bots. A/Bs em processos
novos mantiveram a cena e a IA:

| A/B em 8×8 medium | p95 | leitura |
|---|---:|---|
| atual | 15,7 ms | baseline |
| `ao=0` | 16,4 ms | AO sozinho não é a causa |
| `bloom=0` | 16,6 ms | compositor sozinho não é a causa |
| sombras inteiras desligadas | 9,2–10,1 ms | o caminho completo volta ao orçamento |
| sombras só de mata, mapa ou bots desligadas | 16,7–16,9 ms | nenhum grupo isolado explica o custo |
| sem compositor + pixel ratio 0,85 | 10,2 ms | custo combinado é sensível a preenchimento |

A cena medium chega a 1,87 milhão de triângulos e 856 chamadas no pior frame. O
resultado aponta para pressão combinada de preenchimento/sombras/pós em 8×8, e não
para uma nova regressão do índice de raycast. `AMRP1` mediu 192 raios, zero diferença
de oclusão e razão de 0,000293 entre triângulos consultados pela versão indexada e a
linear. `AMZ5`, `AMZ7`, `AMAP` e o teste de bots também passaram.

## Correção candidata

`resolveMatchPixelRatio` reserva pixel ratio interno 0,80 somente quando as três
condições são verdadeiras: qualidade medium, mapa Amazônia e equipe 8. Low continua
0,75; high respeita DPR até 2; Amazônia 5×5 e todos os outros mapas continuam 1.
O `EffectComposer` lê o orçamento da cena, portanto previews/menu não herdam a
resolução da arena. Nenhuma malha, sombra, luz, pós, fauna, áudio, escada, colisão,
spawn ou rota foi removida.

O gate `AMZRB1` passa a matriz e mata quatro mutantes: ausência da exceção Amazônia,
vazamento global, vazamento para 5×5 e perda do preset low. O teste começou vermelho
com `ERR_MODULE_NOT_FOUND` antes da criação do resolvedor.

## Validação final

Os gates funcionais `eval:amazonia` e `eval:amazonia-render` estão verdes. Uma primeira
amostra pós-correção foi descartada: durante ela, uma lane externa executava
`precisao-final-gates.py` a ~100% de CPU e o indexador do sistema abriu múltiplos
workers. A rodada final começou depois do encerramento dessa carga.

| Caso pós-correção | pixel ratio | frame p95 | GPU p95 | frame máx. | >100 ms |
|---|---:|---:|---:|---:|---:|
| 5×5 medium · 3:2 | 1,00 | 9,6 ms | 8,78 ms | 15,3 ms | 0 |
| 8×8 medium · 3:2 | 0,80 | 10,0 ms | 7,88 ms | 18,6 ms | 0 |
| 5×5 low · 3:2 | 0,75 | 9,6 ms | 4,41 ms | 10,9 ms | 0 |
| 8×8 low · 3:2 | 0,75 | 10,0 ms | 4,10 ms | 25,5 ms | 0 |
| 8×8 medium · 16:9 | 0,80 | 16,2 ms | 7,70 ms | 25,8 ms | 0 |

Em 3:2, o p95 de 8×8 medium caiu de 15,7 para 10,0 ms, redução de 36,3% na
latência de quadro observada. O timer GPU teve 289 amostras, nenhuma disjoint, e
p95 7,88 ms. A largura 16:9 mostra mais cena lateral e permanece mais cara, mas
ficou abaixo de 16,7 ms no p95 desta máquina. Não há alegação de 120 FPS em 16:9,
nem de resultado idêntico em hardware diferente.

O simulador causal de 10 s manteve 15 bots, objetos e estado idênticos nos seeds
13007, 7 e 4321. A CPU total observada foi 167,62/163,74/161,07 ms; dentro dela,
LOS consumiu 36,45/26,66/25,41 ms, colisão 76,27/83,76/87,48 ms e busca de rota
0,68/0,73/0,88 ms. O índice preservou redução de 63,1% a 68,6% contra o controle
linear. Isso confirma que a correção não mascara regressão de bots, colisão ou
raycast. Os mutantes `menos-mata`, `linear`, `sem-parede`, `sem-consulta` e
`sem-parada` falharam como exigido.

As capturas pós-correção mostram o mesmo conteúdo e composição: floresta, água,
fauna, palafitas apoiadas, escadas, passarelas, iluminação e pós continuam presentes.
O plano fixo de overview deixa a escada e o igarapé visíveis nas duas proporções.

Recibos finais locais, ignorados pelo Git:

- `artifacts/amazonia-8x8-r2/browser-final-r1/` — controles 5×5 e low;
- `artifacts/amazonia-8x8-r2/browser-final-pixel080/` — 8×8 medium 3:2/16:9,
  JSON, captura de jogo e `*-overview.png`.

## Receita de reprodução

Subir o servidor e executar um processo por caso:

```bash
node tools/eval/amazonia-performance-browser.mjs --base=http://127.0.0.1:8172 --teams=5 --quality=med --seconds=30 --width=1536 --height=1024
node tools/eval/amazonia-performance-browser.mjs --base=http://127.0.0.1:8172 --teams=8 --quality=med --seconds=30 --width=1536 --height=1024
node tools/eval/amazonia-performance-browser.mjs --base=http://127.0.0.1:8172 --teams=5 --quality=low --seconds=30 --width=1536 --height=1024
node tools/eval/amazonia-performance-browser.mjs --base=http://127.0.0.1:8172 --teams=8 --quality=low --seconds=30 --width=1536 --height=1024
node tools/eval/amazonia-performance-browser.mjs --base=http://127.0.0.1:8172 --teams=8 --quality=med --seconds=30 --width=1600 --height=900
```

O runner exige WebGL2 de hardware, registra `EXT_disjoint_timer_query_webgl2` quando
disponível, encerra com falha em erro de página, contagem incorreta de bots ou timer
disjoint e grava JSON/PNG no diretório escolhido por `--out`.

Validação fechada nesta lane:

```bash
npm run eval:amazonia
node tools/eval/amazonia-render-budget-check.mjs
npm run eval:amazonia-8x8 -- --seconds=10 --seeds=13007,7,4321
npm run docs:check
npm run build
npm run check:deploy
```

Entrega registrada:

- implementação e provas: commit `7460a6a68`;
- registro de entrega: commit `4146f38b0`;
- branch publicada: `codex/amazonia-8x8-perf-r2`;
- PR draft: [#575](https://github.com/corosolto/client/pull/575);
- `check:deploy`: 39/39 verde no commit publicado;
- CI remoto: build, `npm ci`, gates da Amazônia, invariantes, botsim, Astro,
  smoke, CodeQL, Vercel, DCO e ratchet verdes;
- bloqueio remoto herdado: `portao-browser / eval:select` mede 14/53
  personagens acima do teto global declarado de 12. A reprodução local devolveu
  os mesmos 14. Esta branch não altera `characters.js`, `glbchars.js`, modelos ou
  o avaliador; `renderbudget.js` é puro e a tela de seleção não instancia `Game`.
  O log remoto também registra `SUPPORT_URL_BR is not defined`; nenhum dos dois
  defeitos foi mascarado com mudança de personagem ou limiar nesta lane.

Não houve merge ou deploy.
