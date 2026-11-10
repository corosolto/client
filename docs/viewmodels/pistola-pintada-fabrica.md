# Pistola pintada na rota da fábrica

## Rota

Com qualquer pintura, a PT-38 fica na mesma rota da sem pintura: `fab#pistol`, o X18 da fábrica
(`pinturaNaFabrica: true` em `vmconfig.js`, lido por `skinnedEntryKey` em `authoredvm.js`). Mesmo
modelo, mesmas mãos, mesma posição, mesmo ângulo e mesmo tamanho; o ADS é o da X18. A
`gold#pistol` (`coro/pistol-hires.glb`) fica só para a revisão `?vmgolden=pistol`, com o
`goldFrame` de 06/11.

Antes, a pintura levava a arma para a `gold#pistol`: outro GLB, com pose de duas mãos esticadas,
vista por trás e pequena no meio-baixo da tela. Reenquadrar o `goldFrame` aproximava a arma, mas
ela continuava vista por trás: o problema era o modelo, não a lente.

## Pintura no X18

O corpo do X18 é skinned em vários ossos (`Arma`, `Slider`, `Mag`, `Trigger`...), e o espaço de
bind dele não é o das armas para as quais os padrões e as marcas foram desenhados. Pintado pelo
caminho genérico (`pecasDaPintura`, com o `SOCKET_WEAPON_PISTOL` como corpo), o padrão lia
`position` em centímetros e em outros eixos: `trabalho-13` saía vermelho liso,
`estrela-vermelha` branco liso, e as marcas nasciam no socket, que não tem malha, com a lateral
medida em ±Infinity, fora do quadro.

`pinturaDaFabrica` (`authoredvm.js`) pinta só o grupo da arma, nunca a rig das mãos. Boca, alça e
cima vêm dos sockets da ficha (`SOCKET_FAB_*`, filhos do osso `Arma`). `referenceFrame`
(`weapon-skins.js`) ajusta o X18 à caixa do `weaponModel('pistol')` de 3ª pessoa, que é o espaço
do cartaz e da prévia da loja, pela coronha, pelo topo e pelo meio lateral:

- o padrão recebe `weaponSkinSpace` (geometria → malha TP), então xadrez, faixas e camuflado caem
  onde a loja os desenhou;
- símbolo e letreiro entram num grupo `skin-frame-<id>` filho do osso `Arma`, no espaço do wrap
  TP, com `POLITICAL_LAYOUT`/`CLUB_MARK_LAYOUT`. Eles seguem a animação e a lateral é medida nos
  vértices do X18.

Sem referência válida (socket ausente ou malha de mão dentro do grupo), a arma fica sem pintura,
nunca em cor chapada.

## Marcas no 1P

No layout de 3ª pessoa a mão do X18 cobre a lateral de trás: símbolo 100% e letreiro 61–80%
tapados no idle e na inspeção. `POLITICAL_LAYOUT.pistol.fp` (só no corpo com referência) põe o
símbolo terminando na frente do ferrolho (z 0,69, y 0,30, altura 0,10 até 0,16 de largura) e o
letreiro logo atrás dele (y 0,29, altura 0,05). É o lugar livre que a busca de layout achou no
idle e na inspeção girada. A lateral do ferrolho só tem vértice nas pontas, então o letreiro mede
a superfície numa janela de 0,6; com janela estreita ele afundava no ferrolho.

Medido em 8 pinturas da loja: nenhuma marca tapada por mão ou peça. Os símbolos de
`usa-bandeira-grande.svg` e `maga-47.svg` tinham o plano no lugar e sem oclusão, mas sumiam: o
SVG não declarava `width`/`height`, o Chrome dava ao `<img>` 300×150 de faz-de-conta e o WebGL
recusava o upload (`texImage2D` INVALID_VALUE). Com tamanho no `<svg>` (também `acido-selo.svg` e
`caveira-urbana.svg`) a bandeira e o 47 aparecem na frente do ferrolho; o PF6 cobra isso.

## Mãos

A luva xadrez com `pack-emo-xadrez` é a `gloveSkin` do próprio pack (`pack-emo-gloves`), não
pintura de arma. Com pintura avulsa da loja, a mão fica com o material do time.

## Fuzis

Fuzis pintados (`gold#m4`, `gold#scar`) contra a AK golden aprovada:

| | 16:9 | 3:2 |
|---|---|---|
| centro (distância) | ≤ 0,02 | ≤ 0,02 |
| área (× a AK) | 0,98–1,10 | 0,98–1,10 |
| eixo do cano | ≤ 3,4° | ≤ 8,1° |

O corte no canto de baixo à direita é o mesmo da AK aprovada.

## Réguas

- `npm run eval:vm-enquadramento-idle` (local, fora do `check:vm`: Playwright global, Chrome e
  catálogo pago em `/private-assets`): a pistola pintada contra a sem pintura em centro, área
  (±20%) e eixo do cano (≤15°), em 16:9 e 3:2. A célula pintada só conta com a peça carregando a
  pintura pedida. O placar `tools/eval/vm-enquadramento-idle.json` é conferido no CI por
  `eval:vm-enquadramento-placar`.
- `npm run eval:pintura-fabrica` (CI): grupo pintado sem mão, padrão no espaço TP, marcas no osso
  `Arma`, troca de pintura sem marcas empilhadas e SVG de marca com `width`/`height`. Mutantes
  `pintura-na-mao`, `sem-referencia` e `svg-sem-tamanho`.
