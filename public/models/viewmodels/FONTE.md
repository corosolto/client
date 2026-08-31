# Viewmodel FP

`fpvm_hands.glb` foi produzido para este projeto em Blender a partir de um molde de
anatomia de braços CC0 da DevMops (OpenGameArt, "Low Poly Arms (Rigged)"). A malha
final recorta somente mãos/antebraços, fixa poses novas e aplica luvas, manga, peças de
recarga e materiais próprios. O arquivo não usa modelo, textura ou animação
proprietários de Counter-Strike.

As sequências de movimento enviadas por Emerson em 22/08/2026 são referência privada de
enquadramento e cadência; não são redistribuídas nem incorporadas ao asset.

## AK golden (`coro/ak-hires.glb`)

O piloto golden é produzido por `tools/blender/viewmodels/build_ak_hires_pilot.py`. O doador
local CC0 `ak-12animated.glb` (SHA-256
`1cf28a31ad50a8f037bc04499896f40021dd2bf4d3739dafda9b026cf8759f70`) fornece somente
topologia de braços, rig, estrutura das ações e um normal map neutro da manga. A arma do
doador, mapas de luva com marca e relógio são apagados antes da exportação.

A arma visível é `public/models/weapons/ak.glb` (SHA-256
`aae400d6e93372ddd0e138b6ac24b2cd4b8efc7cd0169483ac0755703a456eca`), asset fictício e
sem logos introduzido no commit `adab1e6d`. O relevo da luva reutiliza apenas o normal CC0
`PaintedPlaster017`, cuja licença e hash moram em `public/img/FONTE.md`; nenhuma cor ou marca
da textura entra no viewmodel.

O relatório de build registra os insumos e o hash do produto em
`artifacts/viewmodels/golden-ak/build-final-v2/build-report.json`. Comando reproduzível:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b \
  --python tools/blender/viewmodels/build_ak_hires_pilot.py -- \
  --doador=/Users/ruben/Downloads/ak-12animated.glb \
  --arma=public/models/weapons/ak.glb \
  --saida=artifacts/viewmodels/golden-ak/build-final-v2 \
  --publicar
```

## Viewmodels GoldSrc completos (`goldsrc/`)

Os 18 arquivos desta pasta são moldes completos em que arma, duas mãos, esqueleto e
animações específicas viajam juntos. Dezesseis moldes cobrem as 26 armas de gameplay por
família mecânica; `aug.glb` e `usp.glb` permanecem como alternativas. A licença dos pacotes-fonte foi confirmada pelo
proprietário do projeto como **CC0** em 24/08/2026. Os arquivos originais foram entregues
localmente, sem URL pública; por isso os hashes abaixo são a âncora de procedência:

- `operator_bundle.zip` — SHA-256 `eee02940c43e076982f21beda6faef32edf52e8f0bab14707d23488529848676`
  - origina `ak47`, `aug`, `awp`, `deagle`, `famas`, `g3sg1`, `glock18`, `m249`, `m3`,
    `m4a1`, `mac10`, `mp5`, `p90`, `scout`, `sg550`, `sg552` e `usp`;
- `pd2_hm_jacket_gloves_sleeves.zip` — SHA-256 `e16d3c259f7b199eb1b09e48f8785b48009ded61b5358453f4aeef2c851f2bde`
  - origina `knife.glb` (o modelo de faca do primeiro pacote estava incompleto).

Pipeline reproduzível: GoldSrc MDL v10 → SMD/QC → Blender Source Tools → Blender/GLB,
por `tools/blender/import_goldsrc_viewmodel.py`. A conversão preserva os pesos de pele e
os clipes `idle`, `draw`, `shoot`, `reload`, `slash` e `stab`; as texturas ficam embutidas
no GLB. Nenhum braço, dedo ou encaixe é sintetizado pelo jogo para essas 26 armas.
