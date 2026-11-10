# Pistola pintada longe no FP parado (10/11/2026)

**Sintoma (dono, capturas do #1298):** com pintura equipada, a pistola aparecia minúscula
no meio-baixo da tela, com os dois braços esticados até ela.

**Causa:** pintura equipada leva a pistola para a rota `gold#pistol` (GLB golden). O
`goldFrame` de 06/11 (`fov 60`, `x -7,5`, `y -5,5`) foi calibrado só pela ÁREA contra a PT-38
(1,05×). A área batia, mas a arma ficava alta e longe, e os braços dominavam o quadro:
braço/arma 6,2 em 16:9 e 10,9 em 3:2, com a base da arma a 0,22 e 0,27 da borda de baixo.

**A/B:** o mesmo quadro aparece no staging limpo com pintura da loja
(`pack-emo-xadrez-pistol`, `ouro-pistola`) e numa partida real pelo menu, sem `?debug`.
Não é efeito do arnês nem do #1298. Fuzis pintados (`gold#m4`, `gold#scar`) têm o mesmo
quadro do staging e da AK golden aprovada. A saída pela borda de baixo à direita é a
composição de propósito.

**Conserto:** `goldFrame { x: -2, y: -11, z: 0, fov: 55 }`. Agora a pistola fica no canto de
baixo à direita, com área 1,4× a X18. Braço/arma ficou em 1,1 (16:9) e 2,5 (3:2), e a base
fica a 0,06 e 0,13 da borda. O ADS segue a alça medida.

**Régua:** `npm run eval:vm-enquadramento-idle` (local), com o placar
`tools/eval/vm-enquadramento-idle.json` conferido no CI por `eval:vm-enquadramento-placar`.
