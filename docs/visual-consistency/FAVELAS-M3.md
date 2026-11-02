# Favela M3 — Campo do Morro + Córrego, rodada R2 (31/10/2026)

**Estado: NÃO APROVADO — aguarda foto A/B do ROOT (C1/C2/C3/C4 e R1/R3) e crítico
externo.** Métrica: `docs/visual-consistency/METRICA.md`. R2 executa as três
intervenções aceitas do `CRITICO-FAVELA-M3-DEPOIS-R1.md` e corrige a regressão
de verga/peitoril que o crítico reprovou em C4. Quem escreveu não dá nota do
próprio pixel.

## O que mudou (fonte → porquê)

### Campo do Morro — `public/js/map_campomorro.js`
1. **Verga/peitoril nos bounds REAIS do vidro (corrige regressão C4).** O vidro da
   borda vai de `yv` a `yv+0,82` (eixo x) / `yv+0,78` (eixo z); a R1 tratava `yv`
   como centro (`yv±0,41/0,48`) e as barras cruzavam a meia altura do vidro. Agora
   a base da verga é o topo real e o topo do peitoril é a base real. Mesmas peças,
   nenhum acréscimo.
2. **Clones tintados na família do reboco.** `addBox` só aplicava UV métrico quando
   `mat === MAT.wall`; os tintes (clones `repetido`) escapavam da normalização.
   Agora a família é marcada (`userData.rebocoMetros`, também em `MAT.wall`) e todo
   material da família recebe `uvRebocoMetros` na própria face — sem duplicar textura.
3. **C2 reworkado localmente (intervenção 1 do crítico).** Cada faixa da guarda de
   borda vira DOIS imóveis no plano visível: painel A (janela, reboco da família ou
   tinte da tabela) e painel B (porta, `MAT.wall`/`MAT.concrete` alternado por índice,
   0,30–0,35 m mais baixo, telhado próprio). Embasamento de contenção de 0,60 m
   assentado no chão em cada faixa e pilar de divisa (0,22×0,50, altura h+0,12) na
   cota real do vão entre faixas — o encontro passa a ler como muro de contenção
   separado das casas. Tudo `collide:false`, na malha mesclada `matJunta` existente;
   muralha `MAT.muralha`, campo, baile e solo vermelho intactos. Não alego mudança de
   silhueta: o envelope é o mesmo, a leitura interna da fachada é que mudou.
   As juntas decorativas avulsas de 0,14 m da R1 foram REMOVIDAS (substituídas pelos
   pilares de divisa).

### Córrego — `public/js/map_corrego.js` (travessia alta z=−11)
4. **Batching recuperado (intervenção 3).** As 29 malhas diretas da R1 (custo
   +30 calls sem ganho visual) viram TRÊS malhas mescladas por material
   (`mergeParts`): tabuleiro+rampas (`matPass`, UV prancha ×4/×0,45 e ×3/×0,45
   assado na geometria), pilares (`matMadeira`, fibra vertical ×0,45/×2,5) e vigas
   (`matMadeiraBruta`). Transformações (incl. `rz` das rampas do BUG-84) e apoios
   preservados peça a peça; nada flutuando; piso R3 aprovado intocado. Seção,
   altura, vãos e todo o contrato BUG-82/84 intactos, `collide:false`.

### Vetado e não feito
DoubleSide no mural, peitoril 1,05 m `collide:false`, capas de zinco, linha d'água
uniforme, GLB/textura/geometry nova, Quebrada/Escadão, pixo/props extras, loop
decorativo `everyN`, qualquer mudança de colisor/rota/cover.

## Régua R2 — `tools/eval/favela-finish-check.mjs`
A FV-M2 da R1 (contagem `userData.favelaFinish`, mínimos 80/20 inventados) foi
**retirada**: contava caixas, não aparência. Cláusulas semânticas agora:

- **FV-M1 física completa** — colliders, amostras de `groundHeightAt`, spawns,
  ctfPoints, pickups, waypoints (nodes+adj) e tacticalRoutes idênticos ao baseline.
  Baseline gravado da FONTE IMUTÁVEL `f4bcffdf2` via `git show` para tmp rebase
  (`--gravar --fonte=/tmp/f4-rebase.…`) — nenhum stash/checkout/reset na worktree.
  Build executada duas vezes por execução: não determinística reprova.
- **FV-M2 verga/peitoril** — para cada janela da borda (vidro 0,05, h 0,82/0,78)
  existe vértice de acabamento em y = topo real (base da verga) e y = base real
  (topo do peitoril), folga ≤ 0,02 m. Barra no meio do vidro reprova.
- **FV-M3 material/UV métrico** — Campo: toda face de material da família do
  reboco tem `texelEscalada` (clone sem escala reprova). Córrego: UV máx > 3 no
  acabamento (prancha correndo, não tile 1×1).
- **FV-M4 visível** — malha de acabamento escondida/vazia reprova.

Mutantes: `fisica` (collider +0,5 m) → FV-M1; `verga` (malha +0,2 m) → FV-M2;
`uv` (apaga escala) → FV-M3; `esconder` (remove do root) → FV-M2/M3/M4.
Causalidade: RED 1/4 na fonte f4 e na árvore pós-R1 (regressão FV-M2/FV-M3);
VERDE 4/4 após R2; quatro mutantes vermelhos (logs na auditoria).

## R3 — fecho de contrato da régua (achados do crítico R2)

O header do `favela-finish-check.mjs` caiu para 2 linhas: o contrato completo mora AQUI.

- **FV-M1 física COMPLETA** — o snapshot agora grava, além do AABB, os campos que o
  `_collideRot` lê: `ry/cx/cz/hx/hz/cos/sin`. O baseline R2 só tinha 6 números AABB e
  era cego a `hx 2.08→0.52` (que muda o OBB em 0,616 m e ficava VERDE). Regravado da
  fonte imutável `f4bcffdf2` (`git show` em `/tmp/f4-rebase.5SHa` — nenhum
  stash/reset/checkout): 402 colliders, 147 com OBB completo.
- **FV-M2 em WORLD** — janelas e vértices de acabamento medidos via `matrixWorld`
  (getWorldPosition + applyMatrix4), sem correção especial do mutante por nome: mover a
  malha para (100,100,100) reprova por si. Verga exige vértice no topo real e peitoril
  na base real, dentro dos limites laterais da própria janela (±hx+0,2), folga ≤ 0,02 m.
- **FV-M3 UV EFETIVO por triângulo** — razão `sqrt(área_uv/área_world)` = tiles/m,
  com o transform do sampler (repeat/offset/matriz/canal, como o
  `map-material-finish-check`); NaN/repeat maluco reprova. Campo: 133 malhas, 1596
  triângulos, todos em [0,4;0,625] — tile de 2 m real por face (metadado
  `texelEscalada` é só identificação, nunca prova). Córrego: o teto de gosto `uvMax>3`
  (que UV constante (4,4) satisfazia) foi RETIRADO; agora exige UV finito, não
  constante (≥4 pares distintos por malha) e área de UV > 0 em todo triângulo.
  **Limitação declarada:** as razões medidas (0,46–11,3 tiles/m) misturam o mu/mv
  autorado com o repeat do sampler; não há origem física única para um teto por malha
  nesta fase — nenhum número de gosto foi introduzido no lugar.
- **FV-M5 occluders + ray REAL (novo)** — as 3 malhas mescladas da travessia saíram do
  `StaticBatch` e não entravam em `W.occluders` (bala/MAP4 atravessavam o tabuleiro).
  Agora registradas em `map_corrego.js` (só o push; collide:false e geometria intactos)
  e a cláusula exige: 3/3 na lista `occluders` **e** `THREE.Raycaster` (0,8,−11)↓
  acertando topo ≈5,6 com uma malha de acabamento entre os hits.
- **Mutantes** (geometria/collider/lista reais em memória; nada de `if(MUT)`):
  `fisica` (hx do collider rotacionado ×0,25 — morde os campos OBB novos) → FV-M1;
  `verga` (position (100,100,100)) → FV-M2; `uv` (UV ×0,1 + apaga metadado) → FV-M3;
  `esconder` (remove do root) → FV-M2/FV-M3/FV-M4/FV-M5; `occluder` (tira as 3 da lista em
  memória) → FV-M5. Desconhecido sai 2 antes do boot.

**R3 não aprova visual**: C2 segue muralha dominante e arquitetura global segue com o
crítico. Aqui só se fechou o contrato da régua e a superfície de tiro da travessia.

## R4 — fecho dos 2 P2 + 1 P3 do crítico R3 (31/10/2026)

- **FV-M3 por EIXO (P2-1 fechado)** — a razão de área (média geométrica das escalas)
  aceitava `u×10; v÷10`. Agora cada triângulo mede os valores singulares σ± do
  Jacobiano world→UV (e1=B−A, L=|e1|, x=e2·e1/L, y=|e1×e2|/L; colunas d1/L e
  (d2−d1·x/L)/y; autovalores de JtJ) e o Campo exige **ambos** σ em [0,4;0,625]
  tiles/m. Nominal: 133 malhas/1596 tris, σ∈[0,5;0,5]. Anisotropia 10×/0,1×: RED
  1596/1596. Córrego segue sem teto de gosto (área>0, ≥4 pares distintos, finito).
- **Sampler real (P2-2 fechado)** — nada de cair em identidade no erro: com textura,
  canal≠0, repeat/offset/center/rotation não finitos ou matriz inválida → triângulos
  inválidos (RED). O transform aplicado é o da `THREE.Texture` real
  (`updateMatrix()` quando `matrixAutoUpdate` + `Vector2.applyMatrix3`), cobrindo
  repeat/offset/rotation/center. Única mutação em material: `updateMatrix` normal.
  `repeat.x=NaN` no Campo: RED (antes GREEN). Sem textura: identidade explícita.
- **Mutante `fisica` causal (P3-1 fechado)** — agora altera `hx` de um collider OBB
  **real do Córrego** (ry/hx finito, precondição obrigatória) — o R3 caía no fallback
  AABB do Campo (99 AABB, 0 OBB) e não provava o snapshot OBB. Sem OBB disponível:
  exit 3 (infra), nunca cláusula falsa. RED em FV-M1 `colliders corrego divergiu`.
- **CLI estrita** — argumento desconhecido/duplicado/valor ausente → exit 2 antes do
  boot; falha de build → exit 3 (infraestrutura), sem inventar cláusula FV-M1.
- **Validação** (probe do crítico R3 reutilizado, sem edição): nominal PASSA;
  anisotropia FALHA; NaN FALHA; controle com `rotation=π/6` + `center=(0.5,0.5)`
  continua PASSA (rotação é isometria — não move σ). Os 5 P2 do R2 seguem fechados:
  nominal 5/5 GREEN (exit 0) e os cinco mutantes RED exit 1
  (`fisica`→FV-M1 Córrego, `verga`→FV-M2, `esconder`→FV-M2/FV-M3/FV-M4/FV-M5, `uv`→FV-M3, `occluder`→FV-M5).
  Relatório: `audits/2026-10-31-visual-consistency/GLM-FAVELA-M3-R4-RESULTADO.md`.

## R5 — C2 muralha contínua: guarda da borda em degraus (31/10/2026)

**Causa raiz** (crítico depois-R2): `guardaBorda` fazia UMA parede por lado inteiro —
`min`/`max` amostravam o terreno do lado TODO; no lado sul (z=+30) o solo varia de
1,41722 m a 5,56198 m (`morroBase` preservado), então a parede nascia no mínimo global
com altura (max−min)+3 = 7,14476 m e topo 8,56198 m — um só bloco de 72 m cegando a
silhueta do bairro (medido na fonte pré-R5; correção R6: a estimativa anterior de
~20 m era falsa). O comentário prometia "cada trecho", mas não havia trechos.

**Conserto** (`public/js/map_campomorro.js`): os 4 lados passam a somar 40 trechos, de 6,62–6,82 m medidos (mesma faixa das fachadas autoradas: passos de
6,5/7 m) com sobreposição de 0,15 m; cada trecho assenta no mínimo LOCAL e sobe até
máximo LOCAL + 3 m (alturas 3–5,06 m) — a regra dos 3 m é a já existente, agora
aplicada por trecho. Mudança física INTENCIONAL nos
colliders/occluders do perímetro; fachadas R2 (imóveis, verga/peitoril, UV métrico,
tintas) intocadas. Fora das 4 guardas, nada muda: provado por snapshot estrito.

## Régua R6 — `tools/eval/campo-boundary-finish-check.mjs` (corrige 3 P2 + P3 do crítico R5)

- **CB-M1 degrau** — amostragem densa (0,25 m) por lado: nenhum ponto com topo < solo+3
  (sem fresta/escape), nenhum topo > máx local (janela 7,5 m) + 3 + 0,15 (a muralha
  acompanha a encosta), trechos em [6,5;7,0] m e sobreposição em (0;0,2] m com
  extremidades cobertas.
- **CB-M2 desenho efetivo + bijeção** — cada trecho DESENHADO de verdade: ancestrais
  visíveis, material ativo (visible/colorWrite/opacity transparente), layers, drawRange/
  índices e escala — `m.visible` sozinho não basta (P2-1). Correspondência BIJETIVA com
  collider por TODOS os 6 limites E nenhum campo físico extra (OBB etc.): collider da
  banda casado com no máximo uma malha, nada órfão nem duplicado (P2-2).
- **CB-M3 tiro de olho** — raio a 1,6 m do solo, 1,2 m para dentro da borda, para fora,
  a cada 0,5 m: nenhum escapa.
- **CB-M4 interior: igualdade da representação medida** — colliders com TODOS os campos determinísticos
  (AABB + OBB/kind/weapon se houver), occluders com transform mundial (InstancedMesh
  incluída), geometria e configuração de raycast, camBlockers, chão, spawns, ctf, pickups com identidade (kind/weapon),
  waypoints e tacticalRoutes. O perímetro excluído é EXATAMENTE o conjunto casado em
  CB-M2, não uma desigualdade aberta. Números físicos/matrizes são quantizados a1e−4;
  chão é grade amostral2D. Não é igualdade de toda a cena nem prova de partida.
  Baseline gravado SÓ da fonte pré-R5 imutável
  (`audits/2026-10-31-visual-consistency/campo-r5-fonte/js`, sha256 registrado em
  `meta` do baseline); build dupla limpa medindo determinismo (P2-3).
- **Mutantes** (geometria/collider/lista reais em memória): `inteira` (antecedente — uma
  parede por lado) → CB-M1; `trecho` (fresta) → CB-M1/CB-M3; `colisao` (+8 m sem malha)
  → CB-M2/CB-M4; `material` (material invisível compartilhado) → CB-M2; `ancestral`
  (root oculto) → CB-M2; `orfao` (cópia de guarda com 19 cm invisíveis para dentro) →
  CB-M2/CB-M4; `obb` (campos OBB num collider interior) → CB-M4; `pickup` (AK→AWP) →
  CB-M4; `camblocker` (box esticado) → CB-M4. Nominal primeiro: fonte pré-R5 RED 3/4
  com as 4 paredes reais reconhecidas por shape/bbox (a fonte não tem etiqueta
  `userData.guardaBorda`; o RED 0/4 anterior era resultado trivial, não físico); árvore
  R5 VERDE 4/4; os nove mutantes RED exit 1; CLI estrita: `--fonte` sem `=`,
  sufixo/duplicado/desconhecido, `--gravar` sem `--fonte` → exit 2 antes do build;
  build falhando exit 3.
- **FV-M1 migrou a fixture de perímetro (R9)** — o baseline anterior à R5 carregava as
  4 paredes inteiras; a migração R9 substituiu EXATAMENTE esses 4 registros pelos 40
  colliders de degrau do produto (banda `eGuarda` do campo-boundary-finish-check),
  preservando verbatim os 95 interiores e todo o Córrego. O delta físico do perímetro
  é intencional (R5); a representação medida do interior permanece igual — nunca
  "toda a física intocada". FV-M1 voltou a valer como cláusula nominal.

## Não verificado (declarado)
- **Visual: nenhuma câmera aberta por mim** — ROOT repete C1/C2/C3/C4 e R1/R3.
- Desempenho/calls/triângulos em browser e dispositivo: UNKNOWN (em node só há
  contagem de malhas: 4 malhas de acabamento no total, FV-M4). Sombra das vigas e
  contraste com pós: UNKNOWN.
- Se a distinção de imóveis em C2 convence na câmera: decisão do crítico, não minha.

### Campo R7: proteção de geometria dos oclusores

O snapshot CB-M4 agora inclui SHA-256 dos atributos, índices, grupos, drawRange e morphs de cada geometria, além das matrizes mundial e de instâncias, lados de material e layers. Trocar a profundidade de uma caixa mantendo a matriz não pode mais passar. A fixture foi extraída novamente da fonte imutável pré-R5 (mapa SHA94df187a185c), nunca do produto novo: os121oclusores mantêm todos os registros anteriores, e todos os demais campos e proveniência são idênticos à R6 preservada no audit. A guarda sul original mede72m de comprimento; os60m pertencem aos lados leste/oeste. Crítico focal R8CLEAN: drawRange.countNaN, antes confundido comInfinity pelo JSON, agora é serializado como número não finito explícito e reprovaCB-M4. FontepréR5 SHA94df187a185c preservada; Infinity é controle nominal válido.

R8 distingue explicitamente Infinity, -Infinity e NaN no hash numérico: JSON puro os colapsava em null e permitia NaN em drawRange apagar hit sem mudar o digest. A fixture continua exclusivamente da mesma fonte pré-R5, com números não finitos tipados. Crítico focal R8 CLEAN (2995d2f7); NaN reprovou e Infinity permaneceu controle nominal válido.

### Favela R9: migração explícita da fixture FV-M1 (4→40 guardas)

A fixture FV-M1 do `favela-finish-check.mjs` foi migrada cirurgicamente: cópia do
baseline antigo preservada em
`audits/2026-10-31-visual-consistency/favela-finish-baseline-antes-migracao.json`
(sha256 `cf62c449…beb31`), remoção APENAS das 4 guardas pela banda `eGuarda`
(HALF_X=36/HALZ=30) e reinserção dos 40 colliders de degrau do produto atual no mesmo
lugar; interiores (95) e todo o Córrego não recalculados. Igualdade total ordenada dos
interiores exigida e obtida antes da escrita; divergência além da guarda aborta sem
editar. Metadados completos (fonte antiga, SHAs, referência Campo `94df187a185c`,
crítico R8, delta 4→40, escopo) no campo `meta` do baseline. O campo `fonte` continua
apontando a origem antiga original. Validação: nominal exit 0 (5/5 VERDE) e os cinco
mutantes RED exit 1 (`fisica`→FV-M1 Córrego, `esconder`, `verga`, `uv`, `occluder`) —
mutante RED é reprovação da cláusula, nunca falha de infraestrutura (exit 3).
Relatório: `audits/2026-10-31-visual-consistency/GLM-FAVELA-FIXTURE-MIGRATION-R1-RESULTADO.md`.


Wrapper de entrega: `node tools/eval/visual-map-mutations.mjs campo|favela` exige nominal GREEN completo antes dos mutantes, mesmas cláusulas na mesma ordem, conjuntos RED exatos e status1 semântico. Mutante GREEN retorna1; status inesperado, erro, sinal ou timeout retorna3 e não prova detecção. Campo tem9 variantes e Favela5; o wrapper não escreve fonte nem baseline. As suites `materiais` e `uv` cobrem8 e4 variantes respectivamente, com JSON inteiro e contagens exatas.

Root R3 passou Campo9, Favela5 e UV4. Materiais só passou no R4, após separar os diagnósticos de boot (`console.log/info`) para stderr e restaurar ambos em finally. Crítico independente do wrapper R4 CLEAN: `CRITICO-MAP-MUTATION-WRAPPER-R4.md`, SHA256 `21a161d6d5c7f273474bd89713a7940bd9b5dd03028e75070b842f43c9041548`. A crítica inclui71 casos de API,10 de CLI, JSON adversarial e timeout ETIMEDOUT com status0 classificado como infra3. Este aceite é do contrato técnico, somado às capturas locais específicas descritas acima; não é prova de partidaMP nem desempenho móvel.
