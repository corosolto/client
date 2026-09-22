# Shotgun final técnica — alpha.252

> **Superado em 22/09/2026:** o fechamento product-first corrige manga, base métrica, ADS e eixo do cano. Veja [`VIEWMODEL-HEAVY-SHOTGUN-PRODUCT-FIRST-2026-09-22.md`](VIEWMODEL-HEAVY-SHOTGUN-PRODUCT-FIRST-2026-09-22.md).

## Resultado

A M3 Conversa Fiada agora usa a KXG12 própria do pacote produzido para o catálogo,
com as duas mãos completas e um ciclo de pump, gatilho e cartucho unitário. O
produto entrega `idle`, tiro, draw, início de recarga, inserção repetível de
cartuchos, fechamento da recarga e inspect. A arma e a família permanecem
`ready:false`; a ativação global continua desligada até revisão humana.

O candidato v8 foi escolhido porque preservava contatos estáveis entre a mão forte,
a coronha e o gatilho, enquanto a mão de apoio acompanha o pump e se desloca para a
inserção do cartucho. A receita acrescenta um inspect autocontido e uma curva causal
do gatilho. Ela também substitui apenas os bytes duplicados dos nove atlas de mãos
por placeholders com os mesmos nomes; o runtime continua carregando a fundação
visual compartilhada antes de revelar o modelo. Isso reduziu o GLB de 25 MB para
4,1 MB sem mudar arma, rig, clipes ou mecanismos.

## Proveniência e produto privado

- candidato produzido para a Shotgun: `25019108` bytes, SHA-256
  `71dd4edd43da77c7a52af01b2481e2f71cca57507bbe88674ce0b674a62986c7`;
- fundação de atlas compartilhados: `3764304` bytes, SHA-256
  `aed9fd871b9b9281f3a7fbe7db2baab0095cc5f5f5cc7cbd802ae31cabd5d102`;
- produto: `4093728` bytes, SHA-256
  `f4522831de0500b1fa3ce7d7696981a42f4ceab23b5da33ab2199dc4304f307e`;
- receita: `tools/viewmodels/prep/shotgun-final.mjs`;
- snapshot: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/8bedf48ed-f4522831`;
- manifesto do snapshot: SHA-256
  `ab87ecdecb5c64ce0000de9c31e8cad933920ab75159e7e96aec366fd38930b3`.

Nenhum byte do produto privado entrou no Git ou no build público. O carregamento
continua lazy e o fallback legado permanece visível durante ausência, erro ou
espera do asset.

## Evidência causal e lifecycle

`npm run eval:vm-shotgun-final` passou com sete clipes e nove mutantes: ausência de
inspect, sight, arma, cartucho ou marcador; pump, gatilho e cartucho congelados; e
inspect parado. Medidas principais no produto:

- tiro: arma `0,0612 m`, pump `0,1398 m`, gatilho `0,0584 m` e mão de apoio
  `0,1151 m`;
- inserção unitária: cartucho `0,1560 m` e mão de apoio `0,2202 m`;
- inspect: arma `0,2406 m`, endpoint `0,0000 m` e drift da pega forte `0,0000 m`.

`npm run eval:vm-shotgun-lifecycle` passou 30 ciclos, 540 amostras e sete controles
causais. Cobriu draw, tiro com pump, oito inserções seguidas, fechamento, inspect,
ADS, cancelamento por troca, morte, terceira pessoa, Promise obsoleta e fallback
durante o load. `eval:vm-foundation`, `eval:vminspect` e `eval:vmlabhud` também
permaneceram verdes.

## Capturas reais e decisão visual

O driver abriu o jogo real em `piscina_treta` e produziu 26 PNGs: idle, dois pontos
do draw, três do tiro e pump, início da recarga, três fases da inserção unitária,
fechamento, inspect e ADS nas duas proporções. A captura em `8bedf48ed` registrou 84
ruídos não fatais já conhecidos de requests locais 404/CORS e zero erro fatal de
página, WebGL ou viewmodel.

- diretório: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/shotgun-20260914`;
- `capture.json`: SHA-256
  `e40526fb239902fbd9e32cbd348c6aea52507a81d2160378be82c31c085f9d97`;
- folha 3:2: SHA-256
  `72ecebcca38f6b5a59b1b19f064245e2f173f1524f5c30545a3aaca9734ac231`;
- folha 16:9: SHA-256
  `9f120ecf861bd0de592fa9bfdc9bc8e0946e5c40051c5d3f98aa69bd100ac3d2`.

A inspeção das folhas confirmou leitura consistente da silhueta, mão forte presa à
arma, mão de apoio no pump e deslocamento legível para a carga. O ADS usa uma pose
de ombro conservadora porque o alinhamento automático por sockets aproximava demais
o cano. A arma permanece enquadrada em 3:2 e 16:9 durante todas as fases. Esses
estados continuam pendentes de aprovação visual humana do dono.

Próxima arma sequencial: LMG.
