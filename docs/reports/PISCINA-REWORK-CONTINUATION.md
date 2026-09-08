# Piscina da Treta — ledger de reautoria

## Objetivo e estado

Preparar a Piscina da Treta como piloto do novo padrão sem alterar runtime antes da
fundação de mapas. O contrato completo está em `plans/25-PISCINA-DA-TRETA-REWORK.md`.

- Worktree exclusiva: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/mapa-piscina-rework`.
- Branch: `codex/mapa-piscina-rework`, tracking `origin/main`.
- Base e HEAD inicial: `3880380165c170c0e694c28088876e396d5a1e29`.
- Estado inicial confirmado limpo: `## codex/mapa-piscina-rework...origin/main`.
- Node usado: `/opt/homebrew/bin/node` v23.6.0; dependências próprias via `npm ci`.
- Escopo desta etapa: dois documentos, uma régua isolada e artefatos locais ignorados. Nenhuma alteração em
  `public/js/map_piscina.js`, arquivos compartilhados, assets, lockfile ou outro checkout.

## Fontes consultadas

- `AGENTS.md`, `docs/LICOES.md`, `STATUS.md`, `HANDOFF.md`, `BAR-CONSISTENCIA.md`,
  `BAR.md`, `ARCH.md`, `KNOWN-BUGS.md` e `docs/docs/stack.md` desta base.
- Skills locais `csbrasil`, `regua` e `gauntlet-fps`.
- Programa externo somente leitura:
  `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/mapas-quality-program/docs/reports/MAPAS-PROGRAMA-QUALIDADE-2026-09-08.md`.
- Fonte real do mapa, arnês Node e capturas WebGL servidas por esta própria worktree.

## Baseline medido — 08/09/2026

### Espaço, spawns, CTF e rotas

| Medida | Resultado |
|---|---|
| Área do salão | 34×50 m; bounds jogáveis `x=-16,5..16,5`, `z=-24,5..24,5` |
| Piscina | centrada; bacia `hx=7,5`, `hz=9,5`, margem 2,5 m, profundidade 1,5 m |
| Spawns | E/B: 4+4, `x={-9,-3,3,9}`, `z=-21/+21`, chão 0 m |
| Exposição de spawn | E 15,8%, LoS máx. 48,6 m; B 15,6%, LoS máx. 47,7 m |
| Lugar de spawn | pior folga 2,1 m; pior área contígua 52,6 m² |
| Grafo | 74 waypoints, 300 arestas, conectado |
| CTF | PARTIDA `(0,-13)`, ARMÁRIOS `(12,0)`, TRAMPOLIM `(0,14)` |
| Geometria CTF | altura mínima do triângulo 12 m; spawn mais próximo 8,54/21,21/7,62 m |
| Rotas CTF separadas | mínimo 2; pares do mesmo lado 4, pares cruzados/MID 2 |
| Custo spawn→ARMÁRIOS | E: 44,06/41,33/33,97/24,05 m; B: 41,28/32,45/28,46/22,92 m |

O grafo verde não contradiz o dono: ele prova conectividade, não a existência de um
corredor protegido ou de escolhas interessantes. MAP5 também reporta espaçamento máximo
5,44 m, mas os quatro quadrantes centrais têm razão de waypoint `0×` e parte da cobertura
contada é mureta submersa, invisível para quem luta no deque. Por isso a nova régua mede
função, altura e linha de tiro, não quantidade bruta.

### Cobertura, exposição e identidade

- MAP1 diagnosticou 364 contatos de malha acima do piso em amostras, `submerso 0`, pior
  1,1 m. Isto não é um gate verde de penetração; precisa ser separado entre bordas/cover
  legítimos e sobreposição indevida antes da implementação.
- MAP4 encontrou 0/92 oclusores sem malha visível e MAP2B passou os limites atuais.
- As capturas WebGL reais 3:2 confirmam a piscina ciano como marco macro, claraboia,
  azulejo branco/faixa azul, armários, trampolim e linguagem de cartazes/grafite.
- O mesmo conjunto mostra hierarquia muito clara porém plana: salão branco aberto, blocos
  largos de armário e névoa/baixo contraste fazem cobertura e fundo se fundirem. Não há
  um percurso de serviço legível nem uma posição elevada jogável. Isto é diagnóstico da
  captura, não aprovação estética do dono.
- Custo estático medido no mundo Node: 511 meshes procedurais, 4.428 tris procedurais,
  zero GLB. O custo WebGL abaixo inclui personagens, armas e renderer completo
  e portanto não deve ser comparado diretamente com esses 4.428 tris.

### 5×5 e 8×8 no Chrome/Metal

Janela 1536×1024 (3:2), 12 s por caso, Chrome WebGL2 em Apple M4 Pro. `actualBots=9`
mais o humano representa 5×5; `actualBots=15` mais o humano representa 8×8.

| Elenco | Qualidade | frame p50/p95/máx. | >100 ms | pico calls/tris |
|---|---|---:|---:|---:|
| 5×5 | med | 8,3 / 9,3 / 17,6 ms | 0 | 739 / 909.961 |
| 8×8 | med | 8,3 / 16,6 / 74,9 ms | 0 | 896 / 1.065.919 |
| 5×5 | low | 8,3 / 9,2 / 115,9 ms | 1 | 514 / 446.725 |
| 8×8 | low | 8,3 / 9,3 / 33,9 ms | 0 | 481 / 495.582 |

Isto é baseline diagnóstico, não aprovação. O teto existente da Piscina é 860 calls/
870 mil tris: med excedeu tris em 5×5 e calls+tris em 8×8. Todos os quatro casos também
registraram `SUPPORT_URL_BR is not defined`, fazendo o arnês sair com código 1 apesar de
`state=live`. As capturas gerais ainda registraram 404/CORS de serviços externos locais.
Não atribuir esses erros à futura reautoria nem chamar a execução de gate verde.

### Textura, custo e som

- `texel-check`: mediana 84 px/m; 41,1% da área estrutural abaixo de 64 px/m; razão
  p95/mediana 1,74; máximo/mediana 9,1; 13 superfícies horizontais com anisotropia baixa;
  7,4% sem medição. A fundação #540–#551 toca escala/material, então nenhum ajuste foi
  feito nesta lane.
- `ambience-registry-check --map=piscina_treta`: `SEM ambiência`, AR1 vermelho.
- O pacote Fab declara apenas loop genérico `Water_Stream_Calm_1.wav` a 0,045 e splash
  genérico a cada 22–60 s a 0,13. `AMB_LOOPS.piscina` existe em `soundscape.js`, mas o
  mapa não o importa e não devolve `world.sound`.
- Direção sonora contratada: água interna discreta e espacial, hum de ventilação/casa de
  máquinas, splashes ocasionais e leitura de ambiente fechado. Reverb compartilhado não
  entra sem novo escopo e autorização.

## Capturas e logs locais

Artefatos não versionados em `artifacts/piscina-rework/baseline/`:

- `shots/game-piscina_treta-32-{a,b,c,d}.png`: quatro ângulos reais 1500×1000.
- `shots/game-piscina_treta-169-{a,b,c,d}.png`: controle 1600×900.
- `perf-med/` e `perf-low/`: PNG e JSON dos quatro ensaios 5×5/8×8.
- `shots/_metrics.json` e `shots/_errs-*.txt`: estado live, recursos e erros observados.

Essas imagens foram inspecionadas nesta etapa. Elas são evidência do baseline, não aceite
visual final, e podem ser reproduzidas pelos comandos abaixo.

## Fundação #540–#551

Consulta ao GitHub no fim da etapa:

- Pilha sequencial de mapas: #540 `OPEN/DIRTY`; #541, #542, #545, #547, #548, #550 e
  #551 `OPEN/UNSTABLE`.
- #541/#542/#545/#547/#548 falham `build`; #550/#551 falham `portao` e `build`.
- #543, #544, #546 e #549 também estão abertas, mas suas heads são áudio/viewmodels, não
  elos da pilha sequencial de mapas.

Conclusão: **sem sinal de fundação**. Não editar `public/js/map_piscina.js`, shared files
ou runtime. Quando houver sinal explícito, verificar novamente base/HEAD e rebaselinar
texel, custo e imagens antes de implementar.

## Comandos reproduzíveis

Baseline Node:

```bash
PATH=/opt/homebrew/bin:/usr/bin:/bin npm run eval:mapcontrato
PATH=/opt/homebrew/bin:/usr/bin:/bin node tools/eval/map-check.mjs piscina_treta
PATH=/opt/homebrew/bin:/usr/bin:/bin node tools/eval/texel-check.mjs
PATH=/opt/homebrew/bin:/usr/bin:/bin node tools/eval/ambience-registry-check.mjs --map=piscina_treta
```

Servidor e 5×5/8×8, sempre um navegador por vez:

```bash
PATH=/opt/homebrew/bin:/usr/bin:/bin node tools/eval/serve.mjs 8147
PATH=/opt/homebrew/bin:/usr/bin:/bin node tools/eval/lajes-performance-browser.mjs --maps=piscina_treta --teams=5,8 --quality=med --seconds=12 --out=artifacts/piscina-rework/baseline/perf-med --base=http://127.0.0.1:8147
PATH=/opt/homebrew/bin:/usr/bin:/bin node tools/eval/lajes-performance-browser.mjs --maps=piscina_treta --teams=5,8 --quality=low --seconds=12 --out=artifacts/piscina-rework/baseline/perf-low --base=http://127.0.0.1:8147
PATH=/opt/homebrew/bin:/usr/bin:/bin BASE=http://127.0.0.1:8147 ONLY=piscina_treta node tools/eval/gl-shots.mjs artifacts/piscina-rework/baseline/shots game
```

Régua atual e, depois do sinal, validação final:

```bash
PATH=/opt/homebrew/bin:/usr/bin:/bin node tools/eval/piscina-rework-check.mjs
PATH=/opt/homebrew/bin:/usr/bin:/bin node tools/eval/piscina-rework-check.mjs --mutantes
PATH=/opt/homebrew/bin:/usr/bin:/bin npm run check
PATH=/opt/homebrew/bin:/usr/bin:/bin npm run docs:check
PATH=/opt/homebrew/bin:/usr/bin:/bin npm run build
git diff --check
```

O verificador já existe e está vermelho no baseline: PIS1/PIS2/PIS3/PIS6 falham e PIS4
passa (exit 1). Mediu zero nós no corredor, mínimo de duas rotas, fileiras de armários
com span 3,96 m, zero amostras elevadas e zero loops/shots de mapa. Os mutantes foram
implementados sobre mundos frescos: `spawn-deslocado` já morde PIS4 isoladamente; os sete
alvos ainda vermelhos retornam `INCONCLUSIVO`, resultando exit 2 no lote, nunca uma falsa
mordida. Depois da fundação, reexecutar o baseline e fazer cada mutante ficar `MORDIDO`
isolado à medida que sua cláusula for corrigida.

## Próximo passo

Aguardar sinal explícito sobre a fundação. Depois: atualizar SHA e baseline, reexecutar
PIS1–PIS4/PIS6 no mundo real, implementar B1→B2→B3 sequencialmente, morder os
mutantes, repetir 5×5/8×8 med/low e entregar capturas 3:2 para aceite humano do dono.

## Milestone implementado — 08/09/2026

O dono autorizou explicitamente seguir sem aguardar a antiga fundação. Na branch
`codex/mapa-piscina-rework`, a Piscina recebeu corredor técnico oeste com duas bocas,
oito ilhas compactas de cobertura, posto elevado leste com duas escadas, navegação pela
piscina central e ambiência indoor própria. Spawns e três objetivos foram preservados.

Validação técnica antes do rebase final:

- régua normal: PIS1, PIS2, PIS3, PIS4 e PIS6 verdes;
- mutantes: 8/8 `MORDIDO`;
- grafo: 118 nós, 636 arestas, totalmente conectado; rotas E→B=3, B→E=3, CTF=2;
- exposição: E=15,3%, B=14,9%; 72 pickups, nenhum inacessível, enterrado ou flutuante;
- duas escadas: sete transições, espelho 0,1688 m, piso 0,32 m, Blondel 0,658 m,
  largura 1,65 m e inclinação 31,34°;
- `eval:mapcontrato`, `map-check piscina_treta`, `eval:audiofablocal`, `eval:ctfwin`,
  `eval:botsim-golden` focado e `build` passaram;
- texel melhorou frente ao baseline (mediana 84→89; estrutura abaixo de 64 caiu de
  41,1% para 28,7%), mas a dívida global de materiais ainda mantém esse gate vermelho.

PIS5 é parcial. No Chrome/Metal/WebGL2, os quatro ensaios med/low 5×5/8×8 tiveram zero
frame acima de 100 ms e ficaram abaixo de 870 mil triângulos. Em med, o controle do
`main` atual mediu 976/1102 calls e o rework 1018/1051; portanto o teto absoluto de 860
já está vermelho na base e não pode ser atribuído apenas a esta lane.

Evidência 3:2 em `artifacts/piscina-rework/final/curated/`: `overview2` mostra a
piscina dominante e as ilhas separadas; `lookout` mostra o posto e as duas escadas;
`corridor` comprova a passagem interna. A leitura do corredor é estreita, escura e
técnica, mas PIS7 continua pendente da avaliação visual/jogável humana do dono.

Próximo passo concreto: rebasear sobre o `origin/main` mais recente, regenerar docs e
layout de grafites, repetir os gates focados e o build, e registrar o SHA final. Não
declarar PIS5 nem PIS7 verdes sem, respectivamente, uma decisão de orçamento e o aceite
humano.

## Fechamento de publicação — 08/09/2026

A lane foi rebaseada novamente sobre `origin/main` `79e19232`, já incluindo o PR #529
do Escadão. Os snapshots de documentação e grafites foram regenerados a partir da árvore
combinada. O smoke Chrome anterior chegou a `window.__game.state === 'live'`; registrou
também `SUPPORT_URL_BR is not defined`, erro herdado da página-base e fora do diff da
Piscina. A publicação desta branch é somente um PR draft: integração permanece bloqueada
até o degrau #548 da pilha de mapas e não há autorização de merge ou deploy.

## Correção do CI do PR #557 — 08/09/2026

Os runs `34191523225` e `34191523201` separaram uma regressão real da lane de alertas
herdados. O censo de grafite caiu para 56,4% porque corredor, fachada perfurada e ilhas
novas aumentaram a parede visível sem receber a mesma cobertura. A meta de 76% foi
preservada. As superfícies novas agora usam somente os pools originais `D_TAG`,
`D_CARTAZ`, `D_BOMBA`, `D_LETRA` e `D_ADESIVO`, sempre atrás de `paredeAtras`; o censo
local subiu para 521/676 placas, 77,1%, com 506 peças e 48 arquivos.

No crítico de invariantes, a Piscina continua verde em MAP2B (folga 2,1 m, área 52,7
m²) e CTF2 (mínimo 2; rotas E→B=3 e B→E=3). O mesmo `origin/main` mede 2,1 m/52,6 m²
e CTF2=2 na Piscina. A única falha MAP2B é do Escadão (folga 0,85 m), cujo arquivo é
idêntico ao `origin/main`; VM15, BOT3 e CENA3 também são alertas herdados. Esta lane não
altera Escadão, viewmodels, bots ou probe de custo. PIS5 e PIS7 permanecem pendentes e
o PR continua draft, bloqueado pelo #548, sem autorização de merge/deploy.
