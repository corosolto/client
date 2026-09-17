# Loja H — circulação, cobertura e navegação R1

## Resultado e definição de pronto

Esta rodada parte da `main` em `dffcf1f5815342e1ae26e5d79beeaf54b833a2df`, na branch `codex/loja-h-estrutura-r1`. O objetivo é transformar a ligação entre estacionamento, loja e depósito em três decisões jogáveis por spawn, mantendo a identidade brasileira já existente, o CTF, os bots e o orçamento de cena.

O mapa agora oferece três portas de fachada e três descidas do mezanino (oeste, carga e leste). A descida central substitui uma queda sem rota de bot; a ilha opaca `RETIRA AQUI` quebra a visada direta para o depósito e cria escolha lateral. O grafo publicado foi reduzido à componente realmente jogável: os dois spawns, as quatro bandeiras, as três portas e as três escadas estão nos mesmos 508 nós conectados.

Esta entrega está pronta para revisão humana local. Ela não representa aprovação visual do dono e não foi mergeada nem publicada.

## Fontes, autoria e escopo reaproveitado

- Catálogo: [ROADMAP #28](https://github.com/corosolto/ROADMAP/pull/28), slot Loja H. O contrato pede conferir carro, vidro e portas; medir iluminação e desempenho; e avaliar rotas estacionamento ↔ loja antes de gastar crédito Mint.
- Stack existente: [client #564](https://github.com/corosolto/client/pull/564), `codex/mapas-stack-548-v2` sobre `codex/mapas-stack-547-v2`, contém UV/aniso para Escadão, Loja H e Piscina e altera `map_uv.js`/`vao.js` compartilhados. Nenhum commit foi cherry-picked: não havia mudança estrutural de Loja H e o escopo compartilhado conflita com o isolamento desta rodada.
- A autoria e a composição que já estavam em `public/js/map_havan.js` foram preservadas. A rodada acrescenta apenas circulação, cobertura, navegação e instrumentos de prova.
- Não há asset novo, crédito Mint/Astra, material compartilhado ou alteração de runtime. A cena reutiliza somente os props locais que já existiam na `main`.

## Antes e depois medido

| Contrato | Antes | Depois |
|---|---:|---:|
| Portas da fachada/depósito | 2 laterais | 3: oeste, centro e leste |
| Descidas planejáveis do mezanino | 2 laterais; vão central terminava em queda | 3 escadas NBR, incluindo carga central |
| Grafo de navegação | 634 nós, 4 componentes; 147 nós em áreas seladas | 508/508 nós na componente jogável |
| Decisões de saída por spawn | não havia gate causal | 3/3 para B e 3/3 para E |
| Spawn B exposto pela saída central | sem proteção dedicada | ilha opaca com dobra oeste/leste |
| CTF | 4 pontos | 4 pontos, dois internos e dois externos |
| Cena rastreada na `main` | 306 calls, 1.214.251 tris | 305 calls, 1.212.442 tris |

O gate genérico ainda encontra duas rotas completamente separadas no pior par CTF. O contrato desta rodada mede a decisão concreta de cada spawn nos três eixos; não inventa independência topológica onde o miolo do mapa converge.

## Gates causais

`npm run eval:loja-h` verifica:

- LH1: três portas alinhadas às três escadas;
- LH2: 508/508 nós alcançáveis;
- LH3: 32/32 pares spawn→CTF e três escolhas para cada lado;
- LH4: quatro objetivos CTF distribuídos entre interior e exterior;
- LH5: ilha central opaca presente como colisor/occluder.

Cada cláusula tem uma mutação que reprova:

| Mutação | Defeito injetado | Saída esperada |
|---|---|---|
| `--mutante=sem-central` | remove a terceira porta/escada | 1 |
| `--mutante=grafo-partido` | separa a componente jogável | 1 |
| `--mutante=sem-ctf` | remove um objetivo | 1 |
| `--mutante=sem-cover` | remove a ilha opaca | 1 |

Os gates complementares passaram: contrato de mapas (Loja H sem tolerância para nós ilhados), colisão/solo, escadas, mezanino alcançável, CTF com quatro capturas e build Astro.

## Bots, CTF e desempenho

O `botsim` executou o código real em nove sementes:

| Configuração | Bots em campo | stuck | eficiência | lane spread |
|---|---:|---:|---:|---:|
| 5x5 | 10 | 1,46% | 0,218 | 0,64 |
| 8x8 | 16 | 1,10% | 0,244 | 0,64 |

As capturas do jogo real confirmam 5 jogadores por lado no 3:2 e 8 por lado no 16:9, quatro pontos CTF e estado `live`. A sonda de custo, depois da composição final, mediu 305 draw calls e 1.212.442 triângulos contra tetos de 360 e 1.410.000; não houve laço de exceção.

| Quadro | p50 | p95 | máximo | WebGL |
|---|---:|---:|---:|---|
| 3:2, 5x5 | 8,3 ms | 10,1 ms | 16,6 ms | WebGL2, ANGLE Metal / Apple M4 Pro |
| 16:9, 8x8 | 8,3 ms | 9,8 ms | 10,2 ms | WebGL2, ANGLE Metal / Apple M4 Pro |

São números do navegador headless local e servem como evidência A/B desta máquina; não equivalem a uma garantia de FPS em hardware diferente.

## Evidência visual e receita de teste

Servidor local preservado em:

`http://127.0.0.1:8195/?debug=1&auto=B,coach&map=loja_h&perfilauto=0&ctf=1`

Capturas e recibos ficam fora do Git em `artifacts/loja-h-estrutura-r1/`:

- `3x2-5x5/loja-e-tres-descidas.png`: leitura das três descidas e da ilha central;
- `3x2-5x5/spawn-e-saida-central.png`: proteção do depósito e porta de carga;
- `3x2-5x5/patio-e-fachada.png`: circulação exterior, veículos e cobertura;
- as mesmas câmeras em `16x9-8x8/`;
- `capture.json` em cada formato registra equipes, WebGL, frametimes, assets e hashes.

Para reproduzir:

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/loja-h-estrutura-r1
PATH=/opt/homebrew/bin:$PATH npm run eval:loja-h
PATH=/opt/homebrew/bin:$PATH node tools/eval/map-contrato-check.mjs
PATH=/opt/homebrew/bin:$PATH node tools/eval/map-check.mjs loja_h
PATH=/opt/homebrew/bin:$PATH node tools/eval/ctf-win-check.mjs
SIM_TEAM_SIZE=5 PATH=/opt/homebrew/bin:$PATH node tools/eval/botsim.mjs 60 loja_h
SIM_TEAM_SIZE=8 PATH=/opt/homebrew/bin:$PATH node tools/eval/botsim.mjs 60 loja_h
BASE=http://127.0.0.1:8195 PATH=/opt/homebrew/bin:$PATH node tools/eval/cena-check.mjs --mapa=loja_h
PATH=/opt/homebrew/bin:$PATH npm run build
```

Para revisar a jogabilidade, percorra as três entradas nos dois sentidos, suba e desça as três escadas, atravesse estacionamento↔loja pelas laterais e pelo centro e complete quatro capturas CTF em 5x5 e 8x8.

## Pendências herdadas e limites

- O navegador pediu 17 decals opcionais ausentes na `main` e recebeu 404. O mapa os esconde por contrato; não houve asset essencial ausente nem `pageerror`. Reparar o catálogo de decals pertence a uma frente de assets compartilhados.
- `check:deploy` terminou 37/40: `eval:redesign` falha na UIR15 e `docs:check`/`eval:docsautoria` já encontravam nove blocos gerados desatualizados na base. Depois que os dois gates novos passaram a ser arquivos rastreados, `docs:check` passou a listar 13 blocos: quatro índices gerados também precisam mencionar os gates. O CI `pr-fast/build` reproduz essa pendência. Esta lane não altera UI nem regenera o conjunto compartilhado de documentação.
- A revisão visual foi feita nas capturas 3:2 e 16:9, mas a decisão final de composição continua humana.

## Próximo passo

O revisor deve testar a URL local, com atenção ao tempo para alcançar o CTF pela porta central, à leitura da ilha `RETIRA AQUI` como cobertura e à circulação simultânea de 16 jogadores. Se aprovada, a branch pode seguir pelo fluxo normal do draft PR; merge e deploy permanecem fora desta entrega.
