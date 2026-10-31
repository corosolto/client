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

## Cláusulas (CU-1..CU-7)

Medição: SVD do Jacobiano UV em uma base tangente ortonormal, com drawRange, índices e grupos desenhados. NaN/Inf/degenerado reprova.

| id | contrato | como mede |
|---|---|---|
| CU-1 | 40 guardas, `map.repeat` finito 1×1 | varre `userData.guardaBorda`, material real |
| CU-2 | lock das guardas: `geometry.userData.texelEscalada === true` | trava a 2ª escala do `vao.js` |
| CU-3 | UV das guardas = dim/4 em **todos** os 480 triângulos (tolerância 1e-5 tiles/m) | contagem exata e seis faces desenhadas por guarda; SVD aceita só erro float |
| CU-4 | acabamento: 1 malha `favelaFinish='campo'`, lock **pós-merge** true, `groups=0` | o merge descarta userData; sem re-lock o `vao.js` re-escala |
| CU-5 | UV do acabamento = dim/2 em todos os 2 424 triângulos (tolerância 1e-5) | reset 0–1 daria \|s−0,5\| ≫ teto |
| CU-6 | período global do UV mesclado > 2 tiles nos dois eixos | nominal ≈ 5,21; reset 0–1 por caixa colapsa em 1,0 |
| CU-7 | determinismo entre dois builds + bijeção guarda↔collider↔occluder (40/40) + acabamento sem collider | snapshot AABB/matriz/contagens, sem ler UV |

## CLI e contraprovas

`node tools/eval/campo-uv-finish-check.mjs [--mutar=<m>] [--fonte=<dir>]`
Exit: **0** verde · **1** semântica (cláusula vermelha ou nominal não-verde com
`--mutar`) · **2** uso · **3** infra (import/crash/timeout de build).

Nominal VERDE é pré-requisito: com `--mutar`, a régua se recusa a mutar se o nominal
não estiver verde. Mutantes alteram só UV/userData/material da cena real em memória e
a régua aborta (exit 3) se matrizes/AABBs mudarem — coordenadas, física e silhueta são
imutáveis no comparativo.

| mutante (defeito reintroduzido) | cláusulas vermelhas exigidas |
|---|---|
| `guardrepeat20x3` — repeat 20×3 de volta no muralha | CU-1 |
| `removerguardUV` — UV 0–1 de volta nas guardas | CU-3 |
| `guardperiod2m` — período 2 m na guarda (×2 no UV) | CU-3 |
| `removerfimUV` — UV 0–1 por caixa no acabamento | CU-5, CU-6 |
| `removerlock` — lock pós-merge apagado | CU-4 |

Cada mutante roda o MESMO avaliador do nominal (mesmos validadores, mesma cena real).
O controlador `campo-uv-finish-mutations.mjs` exige nominal 7/7 e cada conjunto exato, além de status semântico 1. Infra3, falha extra/ausente e inventário incompleto nunca contam como mutante detectado.

Cada guarda exige 12 triângulos únicos e dois por face desenhada; o total não pode compensar uma peça incompleta com outra duplicada. O protocolo recusa linhas extras/desconhecidas ou malformadas.

Controles físicos adicionais: `uv-rank1`, `face-ausente` e `inventario-compensado` exigem só CU-3; `repeat-nao-finito` exige só CU-1. O primeiro preserva magnitudes de arestas enganosas mas colapsa a dimensão UV; o segundo remove dois triângulos do drawRange real.

## Limites

Mede geometria/material em Node, não render: não prova pixel servido, seams em
perspectiva, drawcalls ou FPS. O `TEXEL3b` do campomorro (máx/mediana ≈ 5,6 > 4)
continua **preexistente e vermelho** — não é escopo desta régua e não pode ser
apagado por ela. Tetos do texel-check não foram relaxados e nenhum inventário de
arma/malha foi reduzido.
