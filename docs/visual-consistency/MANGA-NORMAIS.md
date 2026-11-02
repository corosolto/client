# MANGA-NORMAIS — o bloco preto do AK hip (31/10/2026)

História, causa raiz e régua do defeito visual em que **a AK equipada em hip renderizava um
bloco preto de tamanho fullscreen**, inclusive no baseline 1179. A régua que fecha este bug é
`tools/eval/manga-tampa-check.mjs` (cláusula **MT8**, mutante `--mutante=normal-int16`).

## Linha do tempo da manga (`capSleeveOpenings` em `public/js/vmsleeve.js`)

| Data | Defeito | Causa | Cláusula |
|---|---|---|---|
| 22/10/2026 | "leque vermelho" no punho ao girar a arma na inspeção | manga terminava em boca aberta (2 laços de borda) | MT1–MT5 |
| 26/10/2026 | "quando equipa a AK o braço some, só nesta arma" | cópia de atributos pelo ARRAY CRU: `getX` devolve desnormalizado e o `Int16Array` trunca pra 0 | MT6/MT7 (mutante `tampa-crua`) |
| 31/10/2026 | bloco preto fullscreen em hip, também no baseline 1179 | `computeVertexNormals()` acumulando num atributo `normal` **Int16 normalizado**: `Math.round(x·32767)` zera a contribuição de toda face pequena | **MT8** (mutante `normal-int16`) |

## Causa raiz (three r160 vendorizado, `public/vendor/three.module.js`)

O GLB golden (`ak-hires.glb`) usa `KHR_mesh_quantization` + `EXT_meshopt_compression`:
o GLTFLoader entrega `NORMAL` como **Int16Array `normalized=true`**. O `capSleeveOpenings`
recriava os atributos preservando tipo+normalized e chamava `geo.computeVertexNormals()`. No
three r160, esse método (caminho indexed):

1. reseta o normal a zero via `setXYZ` (l. 11145);
2. para cada face, acumula o cross product lendo com `fromBufferAttribute` (desnormaliza,
   `÷32767`) e escrevendo com `setXYZ` (l. 11173–11183) — que **normaliza de volta com
   `Math.round(x·32767)`** (`normalize()`, l. 604);
3. `normalizeNormals()` divide por `length() || 1` (guardado) e **deixa (0,0,0) exato**.

Face com |cross product| < 1/(2·32767) ≈ 1,53e-5 arredonda a ZERO em toda contribuição —
a manga fina do golden tem anéis densos exatamente nessa escala. No PBR, `normalize(0)` =
NaN e o bloco preto se propaga pelo bloom.

A régua até 30/10 **passava verde com o jogo preto** porque o fixture `tuboQuantizado`
quantizava só POSITION: com `normal` Float32 o acumulador não perde nada. A malha medida
era a errada — mesmo padrão do MT6 em 26/10.

## Evidência (ablation do Root, browser Ego 1320×880, código do jogo, AK gold, Physical original)

- **293 normais exatamente zero** na manga, 5090 vértices depois do cap (todas finitas);
- arma e luvas isoladas renderizam normal; **manga isolada fica preta**;
- MeshBasicMaterial resolve; Physical sem normalMap / sem albedo / sem rough / sem bump /
  bumpScale 0 / FrontSide / StandardMaterial do zero — **todos pretos**;
- **NORMAL Float32 + `computeVertexNormals` resolve mantendo material PBR e atlas originais**
  (`hip-black-normals-floatNormals.png`);
- `flatShading` também resolve mas perde acabamento — rejeitado como fix.

Logo: textura, material e shader custom estão ABSOLVIDOS; o defeito é normal degenerada (0,0,0)
produzida pelo recomputo em Int16 quantizado.

## Fix (31/10/2026)

`capSleeveOpenings` cria o atributo `normal` novo como **Float32Array não normalizado**
(escrito pelo acessor, como os demais) antes do `computeVertexNormals()`. Quantização dos
OUTROS atributos (position Int16, skinWeight) é preservada; posições/UV/skinIndex/skinWeight
idempotência e fechamento de bocas inalterados (MT1–MT7 verdes). O caminho
`extendAtCurrentPose` já fazia isso (`normalized → Float32Array`); o cap é que não fazia.

O algoritmo não inventa uma direção para faces degeneradas. Na fixture MT8 todos os
vértices pertencem a faces válidas: exige zero vetores nulos/não finitos na malha inteira
e norma unitária/finita nos vértices de ≥1 face não degenerada (|cross product|² > 1e-24).
Isso não certifica uma geometria arbitrária com vértices isolados.

## Prova

```
node tools/eval/manga-tampa-check.mjs                          # MT1..MT8 PASSA, exit 0
node tools/eval/manga-tampa-check.mjs --mutante=sem-tampa      # MT1/MT2/MT4 FALHAM, exit 1
node tools/eval/manga-tampa-check.mjs --mutante=tampa-crua     # MT6/MT7 FALHAM, exit 1
node tools/eval/manga-tampa-check.mjs --mutante=normal-int16   # MT8 FALHA (zero=36), exit 1
```

Probe no GLB real (GLTFLoader + MeshoptDecoder vendorizados, node):
`coro_solto_hires_project_sleeves` (5088 verts, NORMAL Int16 normalized) — estado pré-fix
reproduz **293/5090** normais zero (idêntico ao browser do Root); com o fix, **0/5090**,
normal Float32Array. Mesh achado por nó `coro_solto_hires_project_sleeves` / material
`CoroSolto_Mandrake_Sleeves` (o regex `SLEEVE_MATERIAL` de `vmsleeve.js` é para o pacote
compartilhado, não para o nome deste material).

## Ressalvas

- **Node ≠ visual**: os números acima são de GEOMETRIA; o preto em tela (NaN no shader + bloom)
  só o jogo mostra. Root repetiu no jogo local 1320×880: `manga-fix-real.json` registra
  NORMAL Float32,5090vértices,zero=0,bad=0; `manga-fix-real-{hip,ads}-clean.png` mostra o
  material original sem bloco preto. Overlay HMR de desenvolvimento foi fechado por clique.
- O `min/max` do accessor POSITION do `ak-hires.glb` NÃO confere com o binário decodificado
  (bug do exportador); irrelevante para o loader/jogo, mas não use min/max como referência.
- O fixture MT8 usa tubo fino (raio 4 mm) porque lá TODA face está abaixo do limiar
  1,53e-5 (36/36 zeros no estado bug); no GLB real só 5,8% dos vértices estão — a régua
  testa a causa, não a proporção.

O controle Root `root-manga-causal-check.mjs` omite a corrupção mantendo o nome do mutante:
deve sair0. Antes da correção da régua saía1 só pelo nome; agora o mutante aplicado continua
saindo1 por MT8/36normais zero. Essa prova usa cópia em audit, sem editar produto em teste.
