# Shotgun product-first — 22/09/2026

## Resultado

A M3 Conversa Fiada mantém a KXG12 própria, as duas mãos KINEMATION e os sete
estados já autorados (`idle`, tiro, draw, início/loop/fim de recarga e inspect),
mas corrige no produto os dois vermelhos que ainda impediam avaliação visual:
manga proximal dominando a tela e ADS aproximando a arma além da escala útil.
A candidata, a família e a ativação global continuam `ready:false`.

Nenhuma câmera, FOV, frame compartilhado ou configuração de runtime mudou. A
receita remove somente faces da manga dominadas por `upperarm_twist_01_*` ou
`lowerarm_*`, preservando o punho da manga, luvas, mãos, pesos e animações. O
conjunto também passa a ter uma raiz métrica própria: escala e distância crescem
na mesma proporção, conservando a projeção de idle, enquanto o pull de ADS de
4 cm deixa de ser maior que a base aparente do doador.

## RED causal e mutantes

O checkpoint RED `5ce180160` acrescentou medidas que o gate anterior não tinha.
No produto anterior ele encontrou 4.242 triângulos proximais e reprovou. Os dez
grupamentos de dedos já mediam contato intrínseco aceitável, entre 0,00 e
13,93 mm.

O gate final passa doze mutantes independentes:

- ausência de inspect, arma, cartucho, marcador ou socket de mira;
- pump, gatilho, cartucho e inspect congelados;
- mão esquerda e mão direita deliberadamente soltas;
- reintrodução de uma face dominada pelo braço proximal.

A medida de contato e as excursões são feitas no espaço intrínseco do produto,
antes da raiz métrica de enquadramento. Assim, escala de apresentação não pode
maquiar dedos afastados nem inflar o movimento dos mecanismos.

## Produto e proveniência privados

- fonte KXG12: 25.019.108 bytes, SHA-256
  `71dd4edd43da77c7a52af01b2481e2f71cca57507bbe88674ce0b674a62986c7`;
- fundação compartilhada: 3.764.304 bytes, SHA-256
  `aed9fd871b9b9281f3a7fbe7db2baab0095cc5f5f5cc7cbd802ae31cabd5d102`;
- produto: 3.954.632 bytes, SHA-256
  `6c6c1ba3f72d227375650160c911ca72ef798a198a64682558d99c794c431239`;
- manga: 2.935 → 748 vértices e 5.372 → 1.130 triângulos;
- receita reproduzível: `tools/viewmodels/prep/shotgun-final.mjs`;
- produto e texturas permanecem fora do Git.

A boca real do cano foi medida em `[-1.150224, -6.009773, 34.933628]` no espaço
local do rig. Isso substitui o marcador genérico `z=-80`, que apontava para trás
por causa da rotação interna da KXG12. O eixo final conserva a boca à frente da
alça sem alterar o runtime.

## Gates finais

- `eval:vm-shotgun-final`: verde, sete clipes, dez contatos, doze mutantes;
- mecanismos no tiro: arma `0,0612 m`, pump `0,1398 m`, gatilho `0,0584 m`;
- recarga unitária: cartucho `0,1560 m`, mão de carga `0,2202 m`;
- inspect: arma `0,2406 m`, endpoint `0,0000 m`, drift da pega forte `0,0000 m`;
- `eval:vm-shotgun-lifecycle`: 11/11, 30 ciclos e 540 amostras;
- enquadramento 3:2: `1,001×`, 91,0% da arma visível, braço `1,109×`;
- enquadramento 16:9: `0,941×`, 92,4% visível, braço `1,052×`;
- `eval:vmlabhud` e `eval:vminspect`: verdes;
- fallback legado preservado e asset continua lazy.

## Captura real e revisão humana

O jogo real em `piscina_treta` gerou 26 PNGs em 1440×960 e 1440×810: idle,
dois pontos do draw, três do tiro/pump, início da recarga, três fases da inserção,
fechamento, inspect e ADS. O runtime registrou `MINT_WEAPON_SHOTGUN` visível,
sete clipes e `adsAmount=1` nas duas proporções. Houve 84 ruídos locais já
conhecidos de 404/CORS e zero erro fatal de página, WebGL ou viewmodel.

- evidência: `evidence/shotgun-product-final-20260922`;
- `capture.json`: SHA-256
  `abf99e37d3ac166b01c8904800bb311ee9818a579c60242332964d334a0b3e85`;
- folha 3:2: SHA-256
  `aedfb0c847a35b95d0059d49d647d934aa78ba5b8de8da63e38f64991fd0efb1`;
- folha 16:9: SHA-256
  `45116738c4905427434870d3cfde4b586381f86ce374f86ee1b521f0f9d1b2fa`.

A inspeção técnica confirma mecanismo, mãos e arma presentes em todos os estados,
sem oclusão pela manga e sem corte catastrófico no ADS. Escala, inclinação,
contatos, movimento e a aproximação de ombro do ADS continuam pendentes de
revisão humana; este relatório não habilita a arma.

## Reprodução

```bash
PATH=/opt/homebrew/bin:$PATH node tools/viewmodels/prep/shotgun-final.mjs \
  --source=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/source/shotgun/input/shotgun-runtime-donor-v8.glb \
  --foundation=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/source/uzi/input/smg-foundation-runtime.glb \
  --output-dir=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-staging/shotgun-product-final/viewmodels/shotgun
npm run eval:vm-shotgun-final
npm run eval:vm-shotgun-lifecycle
npm run eval:vm-frame -- --armas=shotgun --malhas
npm run eval:vmlabhud
npm run eval:vminspect
PATH=/opt/homebrew/bin:$PATH \
  CSBRASIL_VM_EVIDENCE_DIR=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/shotgun-product-final-20260922 \
  npm run capture:vm-shotgun-final -- 4401
```
