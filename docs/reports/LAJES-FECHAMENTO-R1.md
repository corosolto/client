# Lajes — fechamento R1

## Objetivo e definição de pronto

Retomar Lajes sobre a `main` atual, preservar o trabalho visual válido, reproduzir os
defeitos pendentes e só alterar geometria quando houver causa demonstrada. A entrega exige
DM/CTF, 5×5/8×8, bots, desempenho, WebGL real em 3:2 e 16:9, mutantes, URL local e draft PR.
Runtime, materiais e áudio compartilhados ficam fora do escopo; nenhum asset Mint nem
geração visual Astra foi usado.

## Isolamento e estado

- Worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/lajes-fechamento-r1`.
- Branch: `codex/lajes-fechamento-r1`.
- Draft PR: [#604](https://github.com/corosolto/client/pull/604).
- Checkpoints: `14c1a0746` (aceite/gates/dossiê) e `7f49367f5` (blocos gerados).
- Base: `origin/main` em `dffcf1f5815342e1ae26e5d79beeaf54b833a2df`, release
  `v2.0.0-alpha.255`.
- O PR #517 já está integrado pela main; o PR #539 contém apenas a correção de estado
  documental de BUG-141. Esta lane reaplica as duas mudanças válidas sem trazer a pilha
  antiga de merges automáticos.
- Builder ativo preservado: `public/js/map_lajes_authored.js`.

## Diagnóstico e decisão

A main já contém o V7, o índice de raycast de alvenaria e o encerramento de visão após a
primeira parede. As capturas novas confirmam praça, becos, comércio, coberturas, quatro
acessos às lajes, fauna, pipas, helicóptero e 14-bis. Os 22 gates próprios passaram e cinco
percursos no `Game._updatePlayer` chegaram ao destino. Não houve baseline vermelha de
geometria, rota, cobertura, acesso ou ambiência. Alterar o mapa para criar diff sem defeito
reproduzido destruiria trabalho aprovado; por isso esta rodada não muda geometria.

A pendência real era de aceitação. `docs/maps/LAJES-BOTS.md` ainda declarava aberto o
sintoma histórico de bots parados no spawn, enquanto a mesma sonda na main atual mede:

| Combate real, 3 sementes × 60 s × 7 bots | Main atual | `deriva-rumo` |
|---|---:|---:|
| bots que exploram ao menos 15 m | 21/21 | 20/21 |
| amostras no térreo | 91,4% | 74,2% |
| raio médio | 35,6 m | 24,3 m |
| engajamento mediano | 15,0 m | 13,3 m |

A nova LB3 cobra o raio médio mínimo de 28 m, o necessário para sair do spawn e cruzar o
meio da planta. Exploração, ocupação do térreo e distância de combate continuam impressas
como diagnóstico. `deriva-rumo` usa o gancho real do `botsim-golden` e deixa LB3 vermelha;
os mutantes anteriores continuam mordendo LB1/LB2. LB3 é uma guarda pós-integração e já
nasce verde nesta branch; a baseline histórica de 12,8 m permanece documentada, sem
autoatestação por regex de texto.

## Validação

### Matriz headless de bots

Cada célula usa `botsim.mjs`, três sementes e 60 segundos. Em CTF, as métricas de alvo e
profundidade de roam ficam em zero porque `_botCtf` substitui o roam; isso não é ausência de
movimento. A rodada CTF de Lajes fechou por quatro capturas em 54,1 s, com quatro objetivos,
e a partida terminou em 129,6 s.

| Perfil | bots reais | travado | largura de lanes | alvo/roam |
|---|---:|---:|---:|---:|
| 5×5 DM | 9 | 1,767% | 0,640 | 0,416 / 0,223 |
| 5×5 CTF | 9 | 1,433% | 0,640 | CTF dedicado |
| 8×8 DM | 15 | 1,800% | 0,640 | 0,418 / 0,208 |
| 8×8 CTF | 15 | 2,700% | 0,640 | CTF dedicado |

Os 22 gates próprios de Lajes e a contraprova do classificador de browser passaram
(23/23). `build`, `docs:check`, `arch:check`, `eval:comentario` e `syntax` também passaram.
O `check:fast` amplo terminou 140/145: as cinco falhas ficam em `eval:mapid`,
`eval:redesign`, `audio:check`, `eval:netcode` e `eval:amazonia` (fixtures locais ausentes de
galinha/pintinho). Nenhum desses checks lê os arquivos alterados nesta lane; os resultados
ficam registrados como dívida da base, sem serem convertidos em verde. Depois da regeneração
documental, `check:deploy` ficou 39/40: apenas `eval:redesign`/UIR15 continuou vermelho; o
contrato de mapa passou nos 17 mapas.

### WebGL real e desempenho

O gate abre a home e percorre a escolha real de modo, time, personagem e adversário. Em
cada proporção, as quatro combinações ficaram verdes:

| Viewport | 5×5 DM | 5×5 CTF | 8×8 DM | 8×8 CTF |
|---|---|---|---|---|
| 1536×1024 (3:2) | 9 bots / DM | 9 bots / 4 pontos | 15 bots / DM | 15 bots / 4 pontos |
| 1600×900 (16:9) | 9 bots / DM | 9 bots / 4 pontos | 15 bots / DM | 15 bots / 4 pontos |

Todas as oito células carregaram GLBs por HTTP 200, passaram a medição visual, céu e
ambiência e tiveram zero erro inesperado. O parâmetro `--allow-inherited` libera somente a
lista exata da seção de dívida abaixo; sem ele o mesmo boot sai com código 1. O classificador
tem contraprova: um `TypeError`, uma resposta 500 ou um áudio desconhecido ficam na lista
`unexpected` e tornam o gate vermelho.

Chrome/ANGLE Metal no Apple M4 Pro, qualidade média, DPR 1:

| Perfil | duração | quadros | P50 | P95 | maior | >100 ms | draw calls máx. | triângulos máx. |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 5×5 | 12,0 s | 1.440 | 8,3 ms | 9,7 ms | 16,6 ms | 0 | 822 | 1.374.314 |
| 8×8 | 12,0 s | 1.439 | 8,3 ms | 9,9 ms | 16,7 ms | 0 | 849 | 1.486.930 |
| 8×8, 16:9 | 12,0 s | 1.440 | 8,3 ms | 9,8 ms | 16,4 ms | 0 | 873 | 1.539.916 |

São amostras locais curtas, não garantia universal de FPS. As imagens foram abertas e
inspecionadas nas duas proporções; nenhuma borda crítica do HUD ou rota ficou cortada. O
instrumento encerra vermelho por padrão diante da dívida herdada e verde somente com a
liberação explícita da lista conhecida; as três execuções acima tiveram 18 ocorrências
conhecidas e zero inesperada.

- 3:2: `artifacts/lajes-fechamento-r1/final-r2-3x2/` e
  `artifacts/lajes-fechamento-r1/final-r2-3x2-contact.jpg`.
- 16:9: `artifacts/lajes-fechamento-r1/final-r2-16x9/` e
  `artifacts/lajes-fechamento-r1/final-r2-16x9-contact.jpg`.
- Movimento: cinco de cinco percursos verdes no `final-r2-3x2/movement.json`.
- Matriz: `artifacts/lajes-fechamento-r1/webgl-matrix-r2/`.
- Desempenho: `artifacts/lajes-fechamento-r1/perf-r2-3x2/` e `perf-r2-16x9/`.
- Gates/mutantes: `artifacts/lajes-fechamento-r1/gates/`.

## Dívida herdada observada

O boot local registra `SUPPORT_URL_BR is not defined`, URLs literais de template para
`map-preview.css`/`ops.js`, `/api/geo-lang` ausente no servidor estático e a lista fechada
de manifestos, música e ambiência do pack privado ausente. As mesmas ocorrências aparecem
nos dois viewports e já existem no commit-base, sem relação com o diff desta lane.
Corrigi-las exigiria runtime/áudio compartilhado, explicitamente fora do escopo. O gate
classifica cada `pageerror` e resposta HTTP: qualquer ocorrência fora dessa lista reprova,
mesmo com `--allow-inherited`. WebGL2 permaneceu ativo e os GLBs responderam 200.

## Reproduzir localmente

```sh
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/lajes-fechamento-r1
PATH=/opt/homebrew/bin:$PATH node tools/eval/serve.mjs 8184
```

- Abra `http://127.0.0.1:8184/?debug=1&map=lajes&perfilauto=0` e escolha MATA-MATA ou
  CAPTURE A BANDEIRA no menu. O gate usa exatamente esse fluxo, sem trocar `game.ctf` por
  instrumentação.

Em outro terminal:

```sh
PATH=/opt/homebrew/bin:$PATH npm run eval:lajes-bots
PATH=/opt/homebrew/bin:$PATH node tools/eval/lajes-bots-check.mjs --mutante=deriva-rumo
PATH=/opt/homebrew/bin:$PATH node tools/eval/lajes-browser-debt-check.mjs
PATH=/opt/homebrew/bin:$PATH npm run eval:lajes-browser -- --base=http://127.0.0.1:8184 --width=1600 --height=900 --teams=8 --mode=ctf --fotos=16 --allow-inherited
```

## Próximo passo

A segunda revisão adversarial terminou em **GO**: confirmou LB3 e seu mutante, ausência de
LB4/regex, allowlist fechada com contraprovas desconhecidas, as oito células WebGL e as
quatro escadas nas capturas 3:2. Nenhum bloqueio técnico permaneceu. O próximo passo é a
aprovação humana da sensação de combate e do visual no draft PR; nenhum merge ou deploy faz
parte desta entrega.
