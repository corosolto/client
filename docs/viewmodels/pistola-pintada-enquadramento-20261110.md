# Pistola pintada longe no FP parado (10/11/2026)

## Sintoma

Nas capturas do #1298, o dono viu a pistola pintada minúscula, no meio-baixo da tela, com os
dois braços esticados e só a traseira do ferrolho à mostra. A pistola sem pintura, a X18 da
fábrica, aparece maior, em três-quartos, com a lateral do ferrolho visível.

## Causa

A pintura trocava o modelo da pistola. Com pintura, `skinnedEntryKey` levava a arma para a
rota `gold#pistol`: outro GLB (`coro/pistol-hires.glb`), com pose de duas mãos esticadas e vista
por trás. O `goldFrame` de 06/11 (60°) só igualava a área: braço/arma de 6,2 em 16:9 e 10,9 em 3:2.

A primeira tentativa (#1315, só reenquadrar o `goldFrame` em 55°) aproximou a pistola, mas ela
continuou vista por trás. O problema era o modelo, não a posição nem a lente.

## A/B

O mesmo quadro aparece em três situações:

- staging limpo com pintura da loja (`pack-emo-xadrez-pistol`, `ouro-pistola`);
- partida real pelo menu, sem `?debug`;
- branch do #1298.

Não é efeito do arnês nem do #1298.

## Conserto

`pinturaNaFabrica: true` na pistola (vmconfig.js). A pistola pintada fica na mesma rota da sem
pintura (`fab#pistol`, X18) e só troca o material. O Mint da fábrica já recebe a pintura por
`pecasDaPintura`.

Resultado: mesmo modelo, mesmas mãos, mesma posição, mesmo ângulo e mesmo tamanho; o ADS é o da
X18. A `gold#pistol` continua para a revisão `?vmgolden=pistol`, com o `goldFrame` de 06/11.

## Fuzis

Fuzis pintados (`gold#m4`, `gold#scar`) contra a AK golden aprovada:

| | 16:9 | 3:2 |
|---|---|---|
| centro (distância) | ≤ 0,02 | ≤ 0,02 |
| área (× a AK) | 0,98–1,10 | 0,98–1,10 |
| eixo do cano | ≤ 3,4° | ≤ 8,1° |

O corte no canto de baixo à direita é o mesmo da AK aprovada. Ficam como estão.

## Régua

`npm run eval:vm-enquadramento-idle` (local). Cobra a pistola pintada contra a sem pintura em
centro, área (±20%) e eixo do cano (≤15°), em 16:9 e 3:2. O placar
`tools/eval/vm-enquadramento-idle.json` é conferido no CI por `eval:vm-enquadramento-placar`.
