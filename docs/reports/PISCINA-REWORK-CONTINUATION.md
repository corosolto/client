# Piscina da Treta — ledger de reautoria

## Objetivo e estado

Terminar a Piscina da Treta como piloto do novo padrão sobre a fundação de mapas
integrada em #564. O contrato completo está em `plans/25-PISCINA-DA-TRETA-REWORK.md`.

- Worktree exclusiva atual: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/piscina-rework-stack`.
- Branch: `codex/piscina-rework-stack`, empilhada em `origin/codex/mapas-stack-548-v2`.
- Base exata: `9113ed82c7aea4028f88ef9892a347a286053ddc`.
- A lane antiga `codex/mapa-piscina-rework` e o PR #557 não foram alterados; #557 será
  registrado como supersedido pelo PR desta branch.
- Node usado: `/opt/homebrew/bin/node` v23.6.0; dependências próprias via `npm ci`.
- Escopo atual: reaplicar somente a reautoria válida da Piscina, preservar UV/
  anisotropia da base, corrigir a navegação do mirante, regenerar derivados e produzir
  prova Node + Chrome. Nenhum outro checkout, merge ou deploy entra no escopo.

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

## Milestone reempilhado sobre #564 — 08/09/2026

Estado validado na worktree atual antes do PR:

- commits transplantados de #557: `41d78880`, `4a218502`, `45326914` e `cd981e98`;
- PIS1/PIS2/PIS3/PIS4/PIS6 verdes; 9/9 mutantes `MORDIDO`;
- 119 nós, 679 arestas, 24/24 rotas spawn→bandeira alcançáveis pela cápsula real de
  raio 0,38 m; central 53,31 m < serviço 65,65 m; mirante 10,38 m;
- a sonda detectou que as escadas desenhadas como AABB bloqueavam os bots antes do
  step-up. Patamar/degraus agora usam `groundHeightAt` para corpo, preservam oclusão de
  tiros e ativam `snapDownSteps`/`botLayeredNavigation`;
- Chrome real, viewport 1536×1024, 12 s: final med 5×5 8,2/10,1/31,6 ms e
  792/911.916 calls/tris; med 8×8 8,3/10,0/17,9 ms e 972/1.052.242; low 5×5
  8,3/10,1/10,4 ms e 491/440.828; low 8×8 8,3/10,1/10,5 ms e 616/494.627.
  Zero frame >100 ms, mas PIS5 continua vermelho nos tetos absolutos originais.
- capturas limpas equivalentes 1200×800: `artifacts/piscina-stack/final/browser/`;
  recibos confirmam WebGL2/ANGLE Metal/Apple M4 Pro, `software:false`, `state=live` e
  elencos reais 9/15. Cobertura de grafite: 77,1% (521/676), meta 76%.
- evidência espacial: `artifacts/piscina-stack/final/spatial.json`; scripts reproduzíveis
  versionados em `tools/eval/piscina-stack-evidence.mjs` e
  `tools/eval/piscina-stack-browser.mjs`.
- `SUPPORT_URL_BR is not defined` permanece erro herdado após o boot tanto no controle
  quanto no final. PIS7 depende do aceite visual/jogável humano; não está verde.
- Crítica independente: NO-GO 6/10 no primeiro conjunto por falta de prova de fluxo;
  após recaptura com POV do mirante, linha d'água, boca do corredor e `spawn-flow`
  5×5/8×8, reavaliação GO técnico-visual 8/10. Não substitui aceite do dono.

Próximo passo: checkpointar, abrir PR draft contra
`codex/mapas-stack-548-v2` e registrar #557 como supersedido. Não fazer merge/deploy.

### Fechamento do layout de grafite

A regeneração global inicial alterava, por efeito colateral, layouts assados de outros
mapas e derrubava `eval:campo-contract` de 92% para 76% de abertura visual. O artefato
foi refeito pelo modo seletivo oficial (`gen-graffiti-layout.mjs piscina_treta`): todas
as sete entradas externas à Piscina agora são byte-a-byte iguais às da base `9113ed82`.
Só `piscina_treta` mudou (211→173 peças assadas), com as impressões digitais atuais.

Validação após o isolamento:

- `eval:grafitelayout`: verde, 8 mapas e 2.947 peças;
- `eval:campo-contract`: verde, abertura visual 92% / meta 80%;
- censo Chrome da Piscina: 83,4% (564/676 placas), acima da meta 76%, com 479 peças
  visíveis e dois murais na cena completa;
- `git diff --check` e `node --check` dos três arquivos JS focados: verdes.

Próximo passo concreto: commit do isolamento, push e PR draft empilhada contra
`codex/mapas-stack-548-v2`; depois observar CI e corrigir apenas falhas desta lane.

### Publicação da lane

- PR draft: #566, head `codex/piscina-rework-stack`, base
  `codex/mapas-stack-548-v2`, estado `OPEN/MERGEABLE`;
- #557 recebeu comentário explícito de supersessão e foi mantida apenas como histórico;
- CI no checkpoint `c7b6594b`: 9 aprovados, 0 falhas, 8 pulados; `pr-fast/build`
  14m14s, `portao-browser/portao` 14m35s, `smoke-web/smoke`, DCO e preview verdes;
- nenhum merge ou deploy executado.

Estado de entrega: implementação e validação técnica concluídas. Restam PIS5 como dívida
de orçamento declarada e PIS7 como aceite visual/jogável do dono.

## Milestone de acabamento visual — 09/09/2026

Depois de o dono reprovar a leitura como básica/low-poly, foi feita uma segunda passada
sem alterar colisores, spawns, objetivos ou grafo: armários ganharam portas, respiros,
puxadores, rodapés e tampas; água ganhou textura de ondulação; borda recebeu drenagem e
placas de profundidade; serviço, caixas, lixeiras, cadeiras, aço e posto receberam materiais
procedurais próprios; o teto recebeu luminárias instanciadas. Detalhes repetidos usam
`InstancedMesh` e não projetam sombra para limitar custo.

Evidência atual:

- capturas Chrome real 1200×800 em `artifacts/piscina-stack/visual-polish/browser/`;
- PIS1/PIS2/PIS3/PIS4/PIS6 verdes, 9/9 mutantes e contrato dos 17 mapas verde;
- `map-check piscina_treta`, CTF, áudio e layout de grafite verdes;
- cobertura de grafite preservada em 83,4% (564/676; meta 76%);
- texel estrutural da Piscina permanece 128 px/m, p95/mediana 1,00×; o gate global segue
  vermelho por dívidas já declaradas em vários mapas e por TEXEL3b/TEXEL5 da Piscina;
- controle A/B contemporâneo em processo fresco: base 5×5 8,6/17,6 ms e 8×8
  16,7/33,4 ms; polish 5×5 8,4/16,8 ms e 8×8 15,8/24,3 ms. A desaceleração frente ao
  dia anterior reproduziu na base, portanto é carga da máquina, não regressão do polish.

O servidor local permanece em `http://127.0.0.1:8152/`. PIS7 continua aguardando nova
avaliação visual/jogável do dono; não fazer merge/deploy antes dela.

## Reteste da arquitetura atual e fila humana — 10/09/2026

Reteste feito no commit `ad6dbd89e6804c112a70347532628e9010183bdf`, que substitui
as ilhas e o mirante rejeitados pelo salão central limpo, dois corredores laterais
fechados e vestiários transversais. Não foi encontrada falha causal de circulação ou
congestionamento que justificasse nova alteração de geometria nesta rodada.

Evidência estrutural e causal:

- PIS1/PIS2/PIS3/PIS4/PIS6 verdes; os oito mutantes atuais foram `MORDIDO`;
- grafo com 122 nós e 593 arestas; 24/24 rotas spawn→bandeira passaram com cápsula;
- rota central 41,32 m, corredor oeste 65,79 m e corredor leste 70,59 m, sem colisão;
- cada corredor tem nove nós e duas aproximações por spawn; cada vestiário preserva
  três vãos de 3 m; zero cobertura solta ou submersa no salão central;
- `eval:mapcontrato`, `map-check piscina_treta` e `eval:ctfwin` verdes.

Chrome/Metal/WebGL2 real, 1200×800, 12 segundos por caso:

- med 5×5: p50 8,3 ms, p95 9,9 ms, máximo 91,8 ms, 0 frames >100 ms;
- med 8×8: p50 8,3 ms, p95 9,7 ms, máximo 17,4 ms, 0 frames >100 ms;
- low 5×5: p50 8,3 ms, p95 9,9 ms, máximo 100,0 ms, 0 frames >100 ms;
- low 8×8: p50 8,3 ms, p95 9,7 ms, máximo 16,7 ms, 0 frames >100 ms;
- os recibos confirmam `software:false`, elencos reais de 9/15 bots e nenhum erro JS.

As capturas 3:2 e recibos estão em
`artifacts/piscina-stack/retest-20260910/browser/`. Os quadros principais para revisão
são `piscina-med-8x8-overview.png`, `piscina-med-8x8-west-corridor.png` e
`piscina-med-8x8-spawn-flow.png`; a última captura mantém os 15 bots visíveis. A
evidência espacial está em `artifacts/piscina-stack/retest-20260910/spatial.json` e as
medições em `perf-med.json/` e `perf-low.json/` no mesmo diretório.

O CI foi reproduzido vermelho antes da correção do lockfile: `eval:deps` acusava Astro,
js-yaml, sharp, smol-toml e svgo. O lock foi normalizado com as mesmas dependências
declaradas, `npm ci --ignore-scripts` passou e `eval:deps` ficou verde com zero
vulnerabilidades altas não isentas. Isso corrige a falha de infraestrutura da PR sem
alterar o mapa.

Fila objetiva para o dono: abrir
`http://127.0.0.1:8152/?debug=1&map=piscina_treta&auto=P,mst`, jogar uma rodada 8×8 e
avaliar (1) saída dos três vãos do vestiário, (2) alternância entre piscina e corredores
oeste/leste e (3) se a concentração inicial se desfaz sem engarrafar. PIS7 continua
pendente desse aceite humano; nenhum merge ou deploy foi feito.

### Correção do lock para instalação Linux

A primeira normalização acima passou no macOS, mas o `npm ci` remoto em Linux
revelou uma lacuna real: o lock não continha `@emnapi/core@1.11.3` e mantinha
`@emnapi/wasi-threads@1.2.2`, embora o primeiro exija exatamente 1.2.3. Isso derrubou
`build`, `smoke` e o preparo do portão antes de qualquer teste do mapa.

Uma resolução limpa, feita só com `package.json` em diretório vazio e npm 10.9.2,
identificou a árvore opcional correta. Para manter a correção mínima, o lock da
branch recebeu somente as entradas ausentes: `@emnapi/core@1.11.3`,
`@emnapi/wasi-threads@1.2.3` e as duas cópias aninhadas 1.2.2 exigidas pelos
bindings WASI existentes. Um segundo diretório vazio concluiu `npm ci` com a mesma
versão do npm; a instalação local, `eval:deps`, build e `check:deploy` também
passam. A geometria e as evidências 8×8 não mudaram.

## Reteste independente de cobertura arquitetônica, rotas e escala — 10/09/2026

A validação partiu do HEAD remoto exato do PR #566, `3aed96c7eb84c7a7640ce8090cc090fd3ccd6da1`, em `worktrees/piscina-rework-stack`, limpo e idêntico ao upstream. O JavaScript local e o servido em `http://127.0.0.1:8152` têm o mesmo SHA-256: `d272fc1cfd5224759e1784b0f551b7a876ab47560960585416d1aa1108865bbe`.

A arquitetura atual foi confirmada sem nova alteração do mapa:

- dois corredores fechados, um por lateral, cada um com 9 nós, entradas norte/sul e três portais para o salão;
- três famílias de rota entre as equipes: central 41,32 m, oeste 65,79 m e leste 70,59 m;
- paredes transversais dos dois vestiários com quatro segmentos e três vãos de 3 m em cada lado;
- 122 nós, 593 arestas e 24/24 rotas spawn→objetivo alcançáveis com cápsula de raio 0,38 m; zero trecho inacessível e degrau máximo 0,06 m;
- CTF encerra a rodada após os três objetivos; PIS1, PIS2, PIS3, PIS4 e PIS6 passam e os oito mutantes são mordidos isoladamente.

A leitura de cobertura precisa permanecer explícita: depois da reprovação do layout anterior, ilhas soltas e mirante foram removidos. A proteção atual está ligada ao edifício — paredes dos vestiários, retornos dos portais, armários e bancos dos corredores — e a piscina central fica aberta por contrato. O diagnóstico genérico `map-check` ainda reporta MAP5=99 m e razão de props 0× nos quatro quadrantes centrais; esse número não foi escondido nem declarado verde. O aceite pendente é decidir em jogo se as três saídas e os dois flancos compensam a exposição do salão sem reintroduzir o labirinto rejeitado.

No Chrome/WebGL2/Metal real, quatro casos 1200×800 produziram 28 capturas sem erro JS: med/low em 5×5 e 8×8, com 9/15 bots. Os enquadramentos `overview`, `west-corridor`, `east-corridor`, `west-portal`, `south-vestibule`, `waterline` e `spawn-flow` foram inspecionados; os corredores e portais são legíveis, a água continua sendo o marco dominante e os três vãos de saída aparecem sem gargalo visual. Evidências ignoradas pelo Git em `artifacts/piscina-overnight-20260910/browser/`.

Amostra de navegação livre: 160 leituras em 20 s; 7/7 bots percorreram pelo menos 42,48 m a partir do início. Um bot entrou no corredor oeste (`x<-17`) e outro no leste (`x>17`), enquanto os demais distribuíram-se pelo salão/portais. Trilhas e recibo ficam em `artifacts/piscina-overnight-20260910/bot-routes/`.

Desempenho em 12 s por caso, sem frame acima de 100 ms e sem erro:

| Caso | p50 | p95 | máximo | calls | triângulos |
|---|---:|---:|---:|---:|---:|
| med 5×5 | 8,3 ms | 9,4 ms | 10,3 ms | 840 | 943.833 |
| med 8×8 | 8,3 ms | 9,9 ms | 13,0 ms | 918 | 1.088.572 |
| low 5×5 | 8,3 ms | 9,4 ms | 65,1 ms | 523 | 448.288 |
| low 8×8 | 8,3 ms | 9,2 ms | 10,3 ms | 604 | 506.658 |

PIS5 continua vermelho nos tetos absolutos originais de 860 calls/870 mil triângulos: med 5×5 excede triângulos e med 8×8 excede ambos, embora a cadência observada esteja estável. PIS7 continua humano. URL para o teste:

`http://127.0.0.1:8152/?debug=1&map=piscina_treta&auto=P,mst&perfilauto=0`

Fila humana: jogar 8×8, sair por cada um dos três vãos, alternar entre salão e os dois corredores e avaliar se existe cover suficiente ao cruzar até um portal. Não fazer merge/deploy antes desse retorno.

Fechamento local desta revisão independente: `npm run build` passou em alpha.240 e `npm run check:deploy` passou 37/37. A implementação está tecnicamente reproduzível; o centro aberto e os tetos PIS5 permanecem decisões explícitas para o playtest humano, não aprovação implícita.
