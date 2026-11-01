# CAMPO-UV-FINISH — contrato UV do acabamento do Campomorro

Régua: `tools/eval/campo-uv-finish-check.mjs` (`npm`-free, Node puro pelo
`tools/eval/harness.mjs`, sobe o `buildCampoMorro` REAL duas vezes). Fonte única do
porquê; o script é a execução, este arquivo é o contrato.

## O defeito que comprou esta régua

`CRITICO-TEXEL-BASELINE-R1.md` e `CRITICO-TEXEL-CAMPO-CAUDA-R1.md`
(audit `2026-10-31-visual-consistency`): a cláusula `campomorro/TEXEL3`
(p95/mediana ≤ 1,5) regrediu de **1,3508 para 5,1584** no checkpoint 83696cded. Duas
causas medidas na geometria real:

1. **40 guardas de perímetro** (R5, `guardaTrecho`) reutilizavam
   `MAT.muralha = repetido(MAT.concrete, 20, 3)` — 20 repetições reiniciadas a cada
   trecho de 6,5–7 m. O repeat 20 era calibrado para o lado inteiro de 72 m
   (**período 3,6 m**); num trecho de 7 m comprime o tile para ~0,35 m e produz
   >500 px/m.
2. **Malha mesclada de acabamento M3** (`fim()` + `mergeParts`, 202 caixas,
   975,36 m² = 5,53% da área estrutural) saía com **UV 0–1 por caixa** — o merge não
   corrige o período e o `matJunta` repeat 1×1 transformava cada verga/peitoril em
   texto esticado (>700 px/m).

A régua fecha com o candidato aplicado pelo root em `public/js/map_campomorro.js`
(guard 4 m + fim 2 m + lock pós-merge), medindo o produto construído — sem
includes-only e sem dados esperados gerados pela mesma lógica que errou.

## Contrato numérico e procedência

| peça | período UV por face | procedência |
|---|---|---|
| guardas de borda | **4 m** (helper reboco 2 m × pós-escala 0,5) | aproximação declarada entre o **3,6 m antigo** (lado 72 m / repeat 20 do `MAT.muralha` pré-R5) e o dobro do reboco; **não é pixel aprovado** |
| acabamento mesclado | **2 m** | `REBOCO_TILE = 2.0` (`map_campomorro.js`), o mesmo tile do reboco do Campo/Lajes e do acabamento do Córrego |
| repeat do material muralha | **1×1** | com UV métrico por face, o período mora na geometria; repeat ≠ 1×1 é densidade artificial |
| lock | `geometry.userData.texelEscalada = true` | `mergeParts` cria BufferGeometry nova **sem userData**; o lock do acabamento é re-aplicado pelo caller Campo depois do merge |

O tile de 4 m da guarda é **escolha estética aproximada** endossada por medição de
dispersão (TEXEL3 1,4244 ≤ 1,5), não por fotografia. **Node não aprova pixels**: seams,
leitura de reboco em perspectiva e enquadramento continuam sendo revisão por
screenshot/foto real, evidência separada desta régua.

## Cláusulas (CU-1..CU-8)

Medição: SVD do Jacobiano UV em uma base tangente ortonormal, com drawRange, índices e grupos desenhados. NaN/Inf/degenerado reprova.

| id | contrato | como mede |
|---|---|---|
| CU-1 | 40 guardas, `map.repeat` finito 1×1 | varre `userData.guardaBorda`, material real |
| CU-2 | lock das guardas: `geometry.userData.texelEscalada === true` | trava a 2ª escala do `vao.js` |
| CU-3 | UV das guardas = dim/4 em **todos** os 480 triângulos (tolerância 1e-5 tiles/m) | contagem exata e seis faces desenhadas por guarda; SVD aceita só erro float |
| CU-4 | acabamento: 1 malha `favelaFinish='campo'`, lock **pós-merge** true, `groups=0` | o merge descarta userData; sem re-lock o `vao.js` re-escala |
| CU-5 | UV do acabamento = dim/2 em todos os triângulos do perfil: 2 424 no original, 2 688 em R22/R23 (tolerância 1e-5) | contagem literal ligada ao inventário independente; reset 0–1 daria \|s−0,5\| ≫ teto |
| CU-6 | período global do UV mesclado > 2 tiles nos dois eixos | nominal ≈ 5,21; reset 0–1 por caixa colapsa em 1,0 |
| CU-7 | determinismo entre dois builds + bijeção guarda↔collider↔occluder (40/40) + acabamento sem collider | snapshot AABB/matriz/contagens, sem ler UV |

## Perfis e inventário independente CU-8

| perfil | query | caixas acabamento | triângulos acabamento | caixas std | batches std |
|---|---|---:|---:|---:|---:|
| original | `campoFachadas=0` | 202 | 2 424 | 0 | 0 |
| r22 | `campoFachadas=1` | 224 | 2 688 | 29 | 7 |
| r23 | `campoFachadas=2` ou ausente | 224 | 2 688 | 50 | 8 |

`tools/eval/campo-fachadas-reference.mjs` carrega uma fixture imutável em
`tools/eval/fixtures/campo-fachadas-inventory.json`, SHA256
`db72b51f8cd963a4b3b2947e76b5097f1832701a75ca99c8f67ce8db7db3aae1`.
A geração parte exclusivamente do original7ca2 aprovado, hash conferido, e de
desenhos literais R22/R23:202originais menos15substituídas mais37novas=224.
O load da fixture não importa o mapa candidato, não muda globals ou seed e não
regenera o esperado. `--write-approved` recusa sobrescrever arquivo existente;
`--verify-approved` exige reprodução inteira byte-idêntica. Mudar a candidata
não muda o inventário esperado nem autoriza um novo pin automaticamente.

CU-8 exige bijeção única por AABB WORLD, sem usar IDs de produto ou um total
medido como esperado. A tolerância1e-4m por eixo cobre Float32 do original.
Cada caixa tem24v/36índices, oito cantos com multiplicidade3, seis faces
retangulares outward e dois triângulos distintos por face com diagonal interna.
Confere material/PBR/cast/receive, FrontSide e os valores aprovados exatos
`visible=true, colorWrite=true, opacity=1, transparent=false, alphaTest=0`, layer0,
visibilidade de todos os ancestrais e cobertura real dos índices por drawRange/grupos,
sem sobreposição. A política raster CPU central autorada em R49 está descrita
abaixo e foi validada em R53 nos Nodes22/26.
No R23, a folha F7 usa material distinto do roof das coroas, roughness.9 e
metalness0; quando há textura, mantém Source/sampler/repeat3×3 correspondentes.
Isso mede identidade material CPU; não prova o bitmap ou a leitura em pixels.

Contrato de aridade de atributos (R61): cada caixa de finish/std exige exatamente
`position.itemSize=3`, `normal.itemSize=3`, `uv.itemSize=2` e `index.itemSize=1`,
verificado em `blocos()` antes de qualquer leitura de counts/getters, para fim e std.
A contagem CPU (`count`) e os getters (`getX/Y/Z`) podem esconder esse contrato
inválido: um
`InterleavedBufferAttribute` com itemSize1 sobre o array original preserva count e
todos os valores lidos, mas o vendor three.module.js usa `itemSize` para o binding do
atributo na GPU. O sintoma GPU é inferência de fonte, não medição em browser.

Default real sem query deve produzir SHA estrutural idêntico a `--query=2` em
processos distintos. O digest inclui atributos/índices raw, morphs, instâncias,
matrizes, materiais/texturas, flags e dados físicos com16.497amostras de chão;
não arredonda a cena nem inclui UUIDs opacos. `--perfil`/`--query` incompatíveis,
duplicatas e seleção `campoFachadas` prévia no SIM_QS retornam uso2 antes do
harness. Sem perfil explícito, query0/1 é recusada; default/query2 escolhemR23.
`--fonte` lê um diretório alternativo sem editar seus arquivos; o esperado
continua pinado, não é uma whitelist de SHA da candidata.

## CLI e contraprovas

`node tools/eval/campo-uv-finish-check.mjs [--self-test-raster | [--perfil=original|r22|r23|0|1|2] [--query=0|1|2|default] [--mutar=<m>] [--fonte=<dir readonly>]]`
Exit: **0** verde · **1** semântica (cláusula vermelha ou nominal não-verde com
`--mutar`) · **2** uso · **3** infra (import/crash/timeout de build).
`--self-test-raster` é modo único e isolado antes de fixture/harness/SIM_QS:
autoteste table-driven do comparador de 36 pins (nominal literal PASS; por pin
valor errado, ausente, tipo coercível/NaN FAIL; blendColor como plain object,
null, canal inválido e RGB linear ~0≠0 FAIL), importando só o vendor para Color.

Nominal VERDE é pré-requisito: com `--mutar`, a régua se recusa a mutar se o nominal
não estiver verde. Os nove controles antigos preservam seus corpos e conjuntos
vermelhos. Os novos também perturbam posições internas, índices, visibilidade,
drawRange e grupos da cena real, mantendo o envelope global e as matrizes das
guardas. O snapshot de aplicação aborta (exit3) se esses AABBs, matrizes ou
contagens estruturais mudarem; não é uma prova geral de equivalência física.
O digest completo deve mudar antes de publicar o marcador de mutação aplicada.

| mutante (defeito reintroduzido) | cláusulas vermelhas exigidas |
|---|---|
| `guardrepeat20x3` — repeat 20×3 de volta no muralha | CU-1 |
| `removerguardUV` — UV 0–1 de volta nas guardas | CU-3 |
| `guardperiod2m` — período 2 m na guarda (×2 no UV) | CU-3 |
| `removerfimUV` — UV 0–1 por caixa no acabamento | CU-5, CU-6 |
| `removerlock` — lock pós-merge apagado | CU-4 |

Cada mutante roda o MESMO avaliador do nominal (mesmos validadores, mesma cena real).
O controlador `campo-uv-finish-mutations.mjs` exige nominal8/8 nos três perfis e cada conjunto exato, além de status semântico1 e marcador de aplicação válido. A matriz R47 validada teve63execuções reais e7NA explícitos por Node:30nominais/controles antigos,32novos aplicáveis e1default (história: matriz R44 fechava em57execuções/7NA antes dos controles de alpha). R49 acrescentou somente os seis casos raster; R53 executou69/7NA por Node22/26. Infra, sinal, timeout, falha extra/ausente, protocolo incompleto e all-PASS/exit1 nunca contam como mutante detectado.

Cada guarda exige 12 triângulos únicos e dois por face desenhada; o total não pode compensar uma peça incompleta com outra duplicada. O protocolo recusa linhas extras/desconhecidas ou malformadas.

Controles físicos adicionais: `uv-rank1`, `face-ausente` e `inventario-compensado` exigem só CU-3; `repeat-nao-finito` exige só CU-1. O primeiro preserva magnitudes de arestas enganosas mas colapsa a dimensão UV; o segundo remove dois triângulos do drawRange real.

Os novos controles abaixo exigem somenteCU-8; os conjuntos dos nove antigos
continuam iguais. Cada NA fica explícito e não é contado como execução.

| novos controles | perfis aplicáveis |
|---|---|
| `fim-compensado`, `fim-oculto`, `fim-ancestral-oculto`, `fim-face-duplicada`, `fim-translado`, `fim-alpha-test`, `fim-alpha-blend` | original, r22, r23 |
| `fim-raster-blend-zero`, `fim-raster-depth-never` (autoria R49, execução R53) | original, r22, r23 |
| `std-compensado`, `std-oculto`, `std-face-duplicada`, `std-drawrange`, `std-grupo-oculto` | r22, r23 |
| `folha-f7-metal` | r23 |
| `fim-position-itemsize1`, `fim-normal-itemsize1`, `fim-uv-itemsize1`, `fim-index-itemsize2` (R61, validação CPU abaixo) | original, r22, r23 |
| `std-position-itemsize1`, `std-normal-itemsize1`, `std-uv-itemsize1`, `std-index-itemsize2` (R61, validação CPU abaixo) | r22, r23 (NA no original) |

Os oito controles de aridade substituem o atributo real do mesh construído por um
objeto THREE real que preserva count e todos os getters por vértice com aridade
inválida: position/normal/uv→1 via InterleavedBufferAttribute; index→2 com pares
`[índiceOriginal,0]`. O formato do buffer de índice também muda; não se afirma
identidade de bytes ou apenas uma mudança de metadado. Exigem conjunto exatamente
`[CU-8]` vermelho, nominal verde
prévio e marcador `CAMPO-MUTANTE aplicado` com digest estrutural alterado; std ausente
no original é NA explícito no wrapper, não no-op. R61 executou a matriz específica
Campo em Node22/26, BEFORE/AFTER com fonte externa e reversão causal da guarda.
Recibos, hashes, resultados medidos e limites estão no
[`ledger R61`](../reports/CAMPO-ATTRIBUTE-CONTRACT-CONTINUATION-20261101.md)
e em `CAMPO-ATTRIBUTE-R61-FINAL.json` no audit agregado. Nenhuma contagem histórica
acima (R44/R47/R49/R53) foi alterada ou re-rotulada como atual; revisão independente
nova permanece com o Root.

`--self-test` do wrapper verifica43casos de protocolo/status/perfil/query/SHA,
sem subir o mapa. Essa prova não substitui a matriz real (R53 validada69/7NA por Node). Os13controles
externos de tipos verificam rejeição de arrays, boxedNumbers, BigInt, objetos
coercíveis, NaN/Inf e perfis numéricos fora da faixa, mantendo seis perfis
públicos válidos (`0/1/2` e `original/r22/r23`).

## Correção R46: alpha do material de finish (P2)

Crítico independente (R45) confirmou P2: `alphaTest=2` num material real de finish faz o
shader Three descartar todos os fragments segundo seu código vendorizado, e `transparent=true` com `opacity=0.01` altera
a mistura para quase transparente. A CU-8 de R44 aceitava ambos (só exigia
`opacity>0`). Prova ANTES: `CAMPO-ALPHA-BEFORE-R46.json` (audit
`2026-10-31-visual-consistency`), quatro falseGREEN 8/8 nos Nodes 22/26, com wrappers
`--fonte` importando o builder REAL e clonando/alterando só `finish.material`.
Correção: `confereMaterial` passou a exigir os valores aprovados exatos (visível, opaco,
sem alphaTest) e a condição fraca `opacity>0` saiu do inventário; os mutantes
`fim-alpha-test` e `fim-alpha-blend` reintroduzem cada defeito na malha fim REAL e devem
reprovar exatamente CU-8. Root executou a matriz R47 de63exec/7NA em cada Node22/26:
126execuções/14NA, incluindo os seis controles alpha em cada Node, todos no conjunto
exato esperado, default/query2 estruturalmente idênticos e43/43selftest por Node.
Os mesmos quatro wrappers externos antes cegos agora saem1, apenasCU-8 vermelha
(`CAMPO-ALPHA-AFTER-R47.json`), sem drift dos sete arquivos antes da atualização
textual. Logs e hashes em `CAMPO-ALPHA-EXECUTIONS-R47.json`. Produto/ref/fixture
não mudaram. Captura GPU do defeito alpha não executada; crítico novo pendente.

## Estado raster CPU: autoria R49, validação R53

O crítico integral R47 fechou o alpha como VALIDADO focal e apontou F1/P2: o
estado raster dos materiais não era comparado ao aprovado. Root APROVOU o desenho
R48 (`CAMPO-RASTERSTATE-DESIGN-R48.md`, audit) com os **36 pins ativos e
dormentes** e limites de CPU explícitos; o Root executou o BEFORE
(`CAMPO-RASTER-BEFORE-R49.json`): 12/12 execuções falseGREEN 8/8 (dois mutantes
blend-zero/depth-never × três perfis original/r22/r23 × Nodes 22/26, oito cláusulas,
wrappers `--fonte` externos) — o checker antigo era cego a esse estado. Essas
execuções são do Root, não do autor do patch.

Implementado na autoria R49, sem executar nessa etapa; validado posteriormente em R53:

- Comparador central `pinsRaster` com tabela literal de 36 propriedades
  exatamente do desenho aprovado, procedência original7ca2 (não toca raster) +
  vendor r160 a47c (Material 9129–9187, wireframe 40616). Esperado nunca é
  derivado do produto nem de `new Material()`. Estrito por tipo: boolean
  idêntico, número finito e exatamente igual (string coercível/NaN/ausência
  reprovam), `===null` só null; `blendColor` exige `Color` **do vendor** com
  canais lineares finitos exatamente 0 — sem `getHex` quantizado. `confereMaterial`
  aplica o comparador a cada material efetivo, preservando PBR/cor/identidade
  e todos os demais checks CU-8.
- `materialDados`/`hashCena` registram os 36 pins sem quantização, incluindo
  `depthFunc` e canais de `blendColor`; ausência e número não finito têm marcadores
  distintos de null no digest; campos anteriores preservados. Os tipos,
  ausências e valores não finitos exercitados no comparador reprovam semanticamente;
  não se afirma serialização geral de objetos/callbacks arbitrários.
- Dois mutantes novos, ambos em original/r22/r23, clonando o material REAL da
  única malha finish identificada pelo inventário existente: `fim-raster-blend-zero`
  (CustomBlending5/ZeroFactor200/OneFactor201/AddEquation100 — composição
  C_out=0×src+1×dest, contribuição da cor da fonte zero; **não** se alega
  descarte de fragmento, depth ou framebuffer invisível) e `fim-raster-depth-never`
  (NeverDepth0 com depthTest=true — fragmentos falham no teste de profundidade).
  Ambos mantêm alphaTest/opacity/transparent nominais 0/1/false, geometria/UV/
  índices/grupos/AABB/matrizes intactos; a guarda compara os demais campos do
  material e exige recuperar o digest nominal inteiro ao repor só o binding
  original. O digest mutado deve mudar pelo estado material.
  Conjunto vermelho exigido: exatamente **[CU-8]**.
- Wrapper: matriz **69 execuções/7NA por Node22/26**, executada em R53
  (63+6; casos R47=63/7 e R38=57/7 preservados).

GLM `zai/glm-5.3` low via OMP fez a autoria. Após preservar os quatro brutos,
log/prompt/guard e SHA em `CAMPO-RASTER-GLM-RAW-R49/`, a supervisão nativa corrigiu
o despacho CLI do self-test, cobriu os três canais Color com tipos/NaN/Inf e
valor linear minúsculo, marcou ausência/NaN/Inf no digest, reforçou a guarda de isolamento do material e ajustou
contagens históricas/comentários. Nenhum teste foi executado nesta autoria.

Fronteira: a política prova estado CPU dos materiais efetivamente cobertos;
shader/callback/closure, GPU, luz, fog, câmera e contexto são UNKNOWN. Os extras
alphaMap/displacementMap/shadowSide/dithering/toneMapped/precision/
forceSinglePass continuam fora desta família. Nenhum claim de bitmap, arte, mapa
inteiro, mobile, MP ou release. R53 passou sintaxe,36pins contra R48,142controles
do comparador e43 do wrapper por Node,16rejeições CLI e12AFTER externos
exit1/somente CU-8 (antes falseGREEN). Matriz138execuções/14NA total;
default=query2 dentro de cada Node, sem exigir igualdade entre versões.
Manifesto `CAMPO-RASTER-VALIDATION-R53-FINAL.json` no audit agregado,
SHA9423e21ad378bf1f1b7cc031b74fa80fe1d2545d0a1c30d3d61f8e9c636016ee.
Próximo: crítico independente novo dos sete arquivos completos e fronteiras.

## Limites

Mede geometria/material em Node, não render: não prova pixel servido, seams em
perspectiva, drawcalls ou FPS. O `TEXEL3b` do campomorro (máx/mediana ≈ 5,6 > 4)
continua **preexistente e vermelho** — não é escopo desta régua e não pode ser
apagado por ela. Tetos do texel-check não foram relaxados e nenhum inventário de
arma/malha foi reduzido.
