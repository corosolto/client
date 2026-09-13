# Proveniência dos viewmodels publicados nesta fundação

Esta pasta contém somente artefatos que já estavam versionados na lane de controles e
foram portados por arquivo para a base `v2.0.0-alpha.246`. Nenhum conteúdo de
`public/private-assets/` foi copiado.

## AK golden (`coro/ak-hires.glb`)

- SHA-256 aprovado: `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29`.
- Origem do produto: `glm/vm-controles-final`, commit `8b31f5dce`.
- A arma visível é `public/models/weapons/ak.glb`, asset fictício do projeto sem logos.
- O doador local `ak-12animated.glb`, declarado CC0, forneceu topologia/rig das mãos,
  ações e normal neutro da manga. Arma, relógio, logos e texturas de marca do doador foram
  removidos antes da exportação.
- O hash esperado do doador é
  `1cf28a31ad50a8f037bc04499896f40021dd2bf4d3739dafda9b026cf8759f70`.

Receita de reconstrução da lane de origem (o doador CC0 não é redistribuído neste repo):

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b \
  --python tools/blender/viewmodels/build_ak_hires_pilot.py -- \
  --doador=/caminho/ak-12animated.glb \
  --arma=public/models/weapons/ak.glb \
  --saida=artifacts/viewmodels/golden-ak/build-final-v2 \
  --publicar
```

O produto portado é revalidado por hash em `npm run eval:vm-foundation`. A reconstrução
Blender depende de recuperar o doador com o hash acima antes de portar o builder numa fase
de produção de asset; esta fundação não altera o GLB congelado.

## Faca (`coro/melee/knife-hires.glb`)

- SHA-256 aprovado: `3e04fbcb67480cec0638ca552d308379c5bff7c5689ae39c8aa88e566c992621`.
- Origem do produto: `glm/vm-controles-final`, commit `8b31f5dce`.
- O asset traz câmera e os clipes `Idle`, `Draw`, `Slash`, `Stab`, `QuickThrust` e
  `HeavyStab`; o gate lê o GLB e cobra esse contrato.
- A base de braços usa o material CC0 WRAD/GoldSource descrito em
  `WRAD-ARMS-LICENSE.txt`. A geometria da faca é fictícia e não usa modelo da Valve.

O binário aprovado é público e está congelado por hash. A promoção exata dos dois clipes
aprovados partiu de um candidato guardado fora do Git; portanto a reconstrução fonte a
fonte ainda não é autônoma neste checkout. Por isso a faca fica sob `?vmauthored=1` e não
é promovida como padrão até existir captura fresca e o insumo de animação ser arquivado
com licença e hash.

## Atlas de mãos

Os 48 WebP em `coro/hands/` são os atlas públicos congelados das facções E, B, C, F e U,
mais o perfil neutro, em layouts distintos para faca e pistola. O perfil M usa o neutro
até receber direção visual aprovada; não se inventa uma skin para o time Mítico nesta
integração. Os atlas da pistola podem ser usados quando o asset PT-38 for publicável, mas
a PT-38 aprovada continua em armazenamento privado e não faz parte deste commit.

A geração original dependeu de inspeção Blender dos UVs da faca e da PT-38 privada.
Enquanto essa fonte privada não tiver um contrato redistribuível, estes atlas são
verificados como produtos congelados por contagem e tracking, sem alegar rebuild público.
