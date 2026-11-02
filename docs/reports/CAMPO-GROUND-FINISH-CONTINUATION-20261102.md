# Campo: encosta e concreto

A missão continua sendo integrar os PRs elegíveis, acompanhar o release e melhorar
mapas, personagens, skins, movimento e ADS. Flávio fica fora; fluxos de UI e social
vêm depois. Este checkpoint cobre apenas o acabamento do Campo do Morro.

O casario de fundo ganhou terreno renderizado sob as casas, fundações, esquadrias,
lajes e parapeitos, com variação de altura e três cores de reboco. A geometria
fica fora da área jogável, agrupada por material e excluída de suporte a grafite.
Piso e forro do galpão usam concrete046 com normal e roughness da mesma família,
em vez do DataTexture quadriculado. As fundações compartilham a família e o
período em metros do piso. Clones preservam Source e recebem detalhes no onLoad.

## Evidência técnica

- A sonda do Game real encontrou terreno em 60/60 amostras dos centros e cantos
  das casas; antes, as mesmas 60 amostras não encontravam terreno renderizado.
- O digest de colisores, spawns, pickups, alturas e waypoints é idêntico ao
  baseline: 1f83959a5007bdb829cc9387053dffdd972acc1f0cd57855aca4d460e241c703.
- O fundo soma nove malhas e 5.736 triângulos no arnês, sem novos colisores.
  Isso não é medição de draw calls ou frame time no dispositivo.
- A comparação de UVs efetivas detectou fundação com período de 0,667 m contra
  3 m no galpão; após a correção, ambos medem 3 m, incluindo o callback real do
  material sob TextureLoader controlado. Não equivale a imagem carregada na GPU.

Recibos e scripts ficam na auditoria do projeto em
`audits/2026-10-31-visual-consistency`: CAMPO-ACTUAL-GEOMETRY-PROBE-R1537,
CAMPO-AFTER-R1539, CAMPO-CONCRETE-DENSITY-PROBE-R1569 e a adjudicação R1570.
A primeira sonda R1569 misturava bordas finas do piso; foi rejeitada e corrigida
antes da alteração de produto. O RED válido é R1570.

## Continuação

Preservar a física, obter capturas 3:2 com texturas efetivamente carregadas e
comparar galpão, rua, silhueta e costuras da encosta no mesmo enquadramento.
Fazer bake e aceitação global de grafites no commit integrado. A crítica GLM
foi limitada a fonte e não aprova arte. Game no browser autorizado, crítico
independente, leitura de personagens e mobile real continuam pendentes.
