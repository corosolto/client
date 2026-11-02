# Campo: encosta e concreto

A missão continua sendo integrar os PRs elegíveis, acompanhar o release e melhorar
mapas, personagens, skins, movimento e ADS. Flávio fica fora; fluxos de UI e social
vêm depois. Este checkpoint cobre apenas o acabamento do Campo do Morro.

O casario de fundo ganhou terreno renderizado sob as casas, fundações, esquadrias,
lajes e parapeitos, com variação de altura e três cores de reboco. A geometria
fica fora da área jogável, agrupada por material e excluída de suporte a grafite.
Piso e forro do galpão usam concrete046 com normal e roughness da mesma família,
em vez do DataTexture quadriculado. O teto mantém concreto e normal, com rugosidade
uniforme do material para evitar os reflexos concentrados do rough map. As fundações compartilham a família e o
período em metros do piso. Clones preservam Source e recebem detalhes no onLoad.

## Evidência técnica

- A sonda do Game real encontrou terreno em 60/60 amostras dos centros e cantos
  das casas; antes, as mesmas 60 amostras não encontravam terreno renderizado.
- O digest de colisores, spawns, pickups, alturas e waypoints é idêntico ao
  baseline: 1f83959a5007bdb829cc9387053dffdd972acc1f0cd57855aca4d460e241c703.
- O fundo soma nove malhas e 6.065 triângulos no arnês, sem novos colisores.
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

Preservar a física e integrar o cliente publicado antes do gate final do stack.
O bake e a medição global R1608 cobriram os 14 mapas: 73 peças, 73 artes únicas,
nenhuma violação medida. O recibo R1609 contém 20 capturas técnicas pareadas
1200 × 800 com texturas 1024 carregadas na GPU, câmeras idênticas e fonte estável.
São vistas de mapa; Game no browser autorizado, leitura de personagens e mobile
real continuam pendentes. A crítica GLM foi limitada a fonte e não aprova arte.


## Crítica visual e segunda iteração

Um crítico independente examinou as capturas pareadas R1582. Aprovou a leitura
arquitetônica do horizonte e o piso, mas reprovou repetição das torres e brilho
do teto. Três casas receberam intervenções distintas: pavimento superior recuado
com terraço, aberturas de larguras diferentes com porta deslocada e cobertura de
zinco em duas águas com empenas fechadas. As outras casas preservam sua forma.
A geometria continua nas mesmas malhas por material, sem novos colisores.

A medição R1598 registrou quatro falhas estruturais e de material antes dessas
alterações. R1599 confirmou as três variações na geometria real e o material
carregado pelo callback, com digest da física preservado. A proposta GLM foi
corrigida pelo integrador: descartado um trecho inerte, corrigidas sobreposição
de porta/janela, altura do guarda-corpo e alinhamento de cobertura, com empenas
reais. Esse resultado exige novas imagens e nova crítica; não é nota artística.
Os cubos cinza de cobertura dentro da arena continuam sendo débito anterior.


A sonda de bordas R1604 mediu diferenças de altura renderizada de até 2,55 cm no
lado oeste e 4,05 cm ao norte. A extensão mantinha uma grade de 2 m enquanto a
borda jogável tinha passos de 1 m e 0,5 m. A correção refina apenas as células
que encostam nas outras malhas: R1605 confirma coincidência das três junções,
incluindo o canto entre extensões, dentro da precisão Float32. O interior
continua grosseiro; não foram alterados altura ou colisão do terreno jogável.


## Revisão visual atual e próximos passos

O crítico independente R1613 examinou as vinte imagens atuais em resolução
completa e a referência local do Complexo. Aprovou, por item, skyline legível,
variação local, encontros oeste/norte mostrados, piso e teto do galpão e marcos
culturais. Não deu aprovação global ou paridade com a referência. Reprovou
três débitos residuais: cubos genéricos na arena, caixilhos e porta próximos
com acabamento provisório e materialidade ambígua da casa azul. Os recibos
registram regiões e limites de cada parecer. Esses débitos continuam no
escopo da missão e precisam de uma próxima iteração delimitada, sem novos
grafites para esconder falta de construção.

Antes de publicar: integrar o cliente atual em merge normal, regenerar somente
os artefatos oficiais afetados e validar a composição final. Revalidar grafites
quando a fonte integrada mudar. Manter este checkpoint como resultado recuperável
do terreno, arquitetura de fundo e concreto, sem alegar aceite do mapa inteiro.
