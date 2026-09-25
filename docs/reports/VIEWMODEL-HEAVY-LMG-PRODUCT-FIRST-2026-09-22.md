# LMG product-first — 22/09/2026

## Resultado técnico

A Metralha "Treta Pesada" preserva a MGX5, as duas mãos KINEMATION, caixa,
cinto, tampa, bandeja, carregador e as cinco ações do checkpoint anterior. A
correção fica inteiramente no produto privado: remove 4.050 triângulos da manga
proximal que cobriam o quadro e aproxima a raiz 6 cm. Câmera, FOV, frame de
família e runtime não mudaram.

O produto final tem `6.466.928` bytes e SHA-256
`3552c724aee62b11cb7bf9b67e069bb2c6c28cfffc89a8a42c84257b9fca536f`.
A fonte permanece `6.810.720` bytes, SHA-256
`ce9921338a35cf0a5ab0959c451579d32b42e4468624f9c48b42c9e23bf88235`.
Nenhum asset privado entrou no Git.

## Reprovações que determinaram a solução

Duas alternativas tecnicamente verdes foram descartadas pela imagem:

- reunir os ossos de tampa, bandeja, caixa e controles no receiver fazia esses
  ossos arrastarem grandes grupos de vértices da MGX5. O receiver virava um
  bloco dominante no idle e na recarga. Evidência:
  `evidence/lmg-product-first-x210-y290`;
- aproximar o receiver até a faixa angular da AK deixava o idle dentro da régua,
  mas o ADS de ombro atravessava o near plane e ocupava quase toda a tela.
  Evidência: `evidence/lmg-product-final-20260922`.

Por isso a régua separa, somente para LMG, o núcleo rígido dominado por
`neutral_bone` dos elementos animados de alimentação. Caixa, cinto, tampa,
bandeja e carregador continuam obrigatórios no gate mecânico. A faixa angular
do núcleo é `0,65–0,85×`: é a maior ocupação que preservou idle e ADS juntos na
captura real, em vez de afrouxar um erro sem observação.

## Medidas e gates

| Aspecto | Núcleo visível | Escala angular | Braços / AK |
|---|---:|---:|---:|
| 3:2 | 94,89% | 0,723× | 0,608× |
| 16:9 | 94,89% | 0,691× | 0,586× |

O eixo mede 8,2°, com a boca à frente da alça. Os dez grupos de dedos ficam
entre 0,01 e 0,16 mm da malha no idle. A manga caiu de 5.180 para 1.130
triângulos, sem faces dominadas por `upperarm_twist_01_*` ou `lowerarm_*`.

`eval:vm-lmg-final` passa 16 mutantes: ações e sockets ausentes, arma/caixa/
marcador ausentes, cinto/caixa/tampa/apoio/inspect congelados, peças arrancadas,
caixa fora de quadro, mãos soltas independentemente e reintrodução da manga
proximal. As duas recargas preservam tampa a 76,6°, bandeja da vazia a 45,1° e
caixa limitada a 18 cm. O lifecycle passa 13/13 controles, 30 ciclos e 600
amostras. `eval:vm-rig` passa 24/24 produtos; HUD, inspect e foundation seguem
verdes.

O `check:deploy` amplo não está verde nesta máquina: 33/40 gates passaram; os
quatro gates que importam `sharp` e `eval:apis` falham sob o Node 16 do hook,
enquanto `eval:sonda` e `eval:chao` conservam falhas de baseline alheias à LMG.
Os gates focados acima rodaram depois do produto final.

## Captura e preview

A captura ligada ao commit `184ae76b7` produziu 32 PNGs em 1440×960 e
1440×810, com idle, saque, tiro, duas recargas, inspect e ADS. Não houve erro
fatal de página, WebGL ou viewmodel; os 84 registros não fatais são requests
locais 404/CORS já conhecidos.

- evidência:
  `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/lmg-product-final-184ae76b7`;
- `capture.json`: SHA-256
  `2684a3b2c555fae6b4b0370fc6ae859eaa807af6d7946783b252ae026e94ebfa`;
- folha 3:2: SHA-256
  `bb059b32b13f519b3351975660f58c131bf8dc509a390af9a4eefdfd37f6db93`;
- folha 16:9: SHA-256
  `e8ad3f5f65b40dd37b84e9668422c08467c3a12b120779292f3f8d45abf26ceb`;
- snapshot imutável:
  `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/184ae76b7-3552c724-clean`.

Preview local:

`http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=lmg&vmweapon=lmg&vmqa=precision`

## Decisão pendente

A captura mostra idle, tiro, inspect e ADS estáveis nas duas proporções. Durante
as recargas a mão de apoio abre e se afasta, comportamento herdado da animação
MGX5; a folha não demonstra contato da mão com caixa/cinto em cada fase. Isso
continua pendente de revisão humana. A candidata permanece `ready:false`, a
família LMG e o portão global continuam desligados.

