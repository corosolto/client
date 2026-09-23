# Fila de correção consolidada — viewmodel K integrado (23/09/2026)

**Base:** `vm/integracao-k` (#629 + #630–#637 + decisões do dono). Junta, sem repetir o que já foi
feito, as filas de `artifacts/review-L1/FILA-CORRECAO.md` (worktree `vm-launch-k`),
`artifacts/review-L3L5/FILA-CORRECAO.md` (worktree `vm-fix-l3l5`), os restos de
`docs/reports/VM-FIX-GRIPS-R2.md` e `docs/reports/VM-FIX-MAGS.md` e o que o PLACAR integrado
(`docs/reports/VM-INTEGRACAO-K.md`) mediu.

Retrato datado. O estado vivo é o que `npm run eval:vm-reguas -- --placar` e o crítico dizem, e
`tools/eval/vm-reguas-divida.json` tem o dono e a classe (`fila`) de cada célula vermelha.

Classes:
- **config**: `vmconfig.js` / `vmframe.js` / `FAMILY_FRAME` / resíduo de ADS / `ads.linhaDeMira`. Sem re-hash.
- **pose/IK**: receitas pós-processo determinísticas (`grip-support.mjs`, `mag-na-mao.mjs`,
  `ads-pose.mjs`, `inspect-com-pose.mjs`, `desvira-malha.mjs`). Produto novo + `vmbytes.js`.
- **Blender/clipe**: re-animação, malha, material ou peça marcada errada no produto K.

Todo item deixa verdes: `eval:vm-rig`, `eval:vm-frame`, `eval:vm-launch`, `eval:vm-cache`,
`eval:vm-autorado-vivo --todas`, `eval:vm-orientacao`, `eval:vm-manga-oca`, `eval:vm-placar`
(re-medir 3:2 **e** 16:9) e passa por nova rodada do crítico cego com antes/depois.

## config (13)

| # | Arma | Defeito | Medida | Origem |
|---|---|---|---|---|
| C1 | m4, scar, g3, tavor, famas | ADS: o auto-ADS centra o socket `sight`; aparelho visto fora da cruz (scar tombada +28°) | `eval:vm-mira` 43 / 99 / 89 / 41 / 64 px | L3L5 (transversal), placar |
| C2 | p90 | ADS voltou a errar com o produto do #634: o resíduo do #636 foi medido no produto do catálogo | `eval:vm-mira` 71 px (era 3 px no #636); variantes na integração instáveis sob carga | integração |
| C3 | uzi | ADS tombado | `eval:vm-mira` 25 px, eixo +14° (teto 12°) | placar, A/B do #630 |
| C4 | lmg | ADS 1 px acima do teto com o frame da opção B | `eval:vm-mira` 31 px (teto 30) | placar |
| C5 | awp | arma gigante vista pela coronha; o frame sozinho piorou (revertido no #635) | `eval:vm-cobertura` 1,43× AK, braço 1,48× (16:9) | L3L5, placar (+ pose P7) |
| C6 | g3, g3sg1, m400 | ângulo na tela fora de ±12° da AK (g3 pro alto, m400 yaw forte, g3sg1 pro alto: frame revertido) | `eval:vm-cobertura` −17° / −21° / −22° | L3L5, placar |
| C7 | sks, svd | arma pequena / em escorço (svd centrada mostra a coronha) | `eval:vm-cobertura` 0,64× / 0,50× AK; svd −59° | L3L5, fix-mags, placar |
| C8 | md97 | braço grande e eixo com a traseira alta | `eval:vm-cobertura` braço 1,50×, +24° | L1, placar |
| C9 | mosin, rem700 | arma/braço sobre a cruz no quadril; mosin coice em guinada | `eval:vm-cobertura` cruz 3479 / 2205 px, mosin braço 3,13× | L3L5, placar |
| C10 | famas | a arma sai do quadro na recarga vazia 35% | crítico L3L5 | L3L5 |
| C11 | deagle | **aplicado nesta integração** (frame de curta, fov 55): falta o veredito do dono | raster 0,63× → 1,13× da PT-38, mira 10 px; AD1 do `eval:vm-ads` ≠ 0 por construção (resíduo) | decisão (a) |
| C12 | revolver38 | vm-frame 0,62× contra raster 0,83× da PT-38: estendi a regra "raster manda" a ele | `VM_FRAME_INFORMATIVO` | decisão (a)+(d), **dono confirma** |
| C13 | lmg | confirmar a opção B no olho (o crítico do #632 preferiu "por pouco") | vm-frame 0,877×/0,837×, raster 0,75× AK | decisão (b) |

## pose/IK (16)

| # | Arma | Defeito | Medida | Origem |
|---|---|---|---|---|
| P1 | g3, carbine, scar, tavor | mão de apoio não encosta na arma | `eval:vm-maos` 0,40 / 0,38 / 0,44 / 0,30 palma (teto 0,20) | L3L5, placar |
| P2 | mosin, rem700 | a munição/clipe nunca está na mão na recarga ("tira no ar") | `eval:vm-carregador` | L3L5, placar |
| P3 | svd | pente preso à arma até existir pose de mão (`mag-na-mao`) | `eval:vm-carregador` fantasma 100% + tira no ar | L3L5 |
| P4 | tavor, famas | mão de apoio na tela e o pente fora do quadro (vazia 38%) | `eval:vm-carregador` | L3L5, placar |
| P5 | uzi | a régua lê o pente como fantasma (100% da arma) e sem encosto em repouso na pegada de uma mão | `eval:vm-carregador` 2 falhas; `eval:vm-pente-na-mao` verde | fix-mags, placar |
| P6 | p90 | pente na mão aparece como toco (30%, mínimo 35%) | `eval:vm-carregador` | fix-mags, placar |
| P7 | deagle | peça no ar na recarga vazia (9 quadros); mão de apoio sai do quadro | `eval:vm-carregador` 9 falhas | L3L5, placar |
| P8 | shotgun | **novo com o #637**: cartucho a 1 palma da mão na recarga vazia 23%/46% | `eval:vm-carregador` 4 falhas (sem dívida antes) | integração |
| P9 | rem700 | braço direito cobre 40–60% da tela na recarga/saque. **Decisão do dono (f): a orientação do #635 fica; isto é da próxima onda** | crítico L3L5 | L3L5, dono |
| P10 | mosin | mão direita some no tiro/saque; luva direita esticada | crítico L3L5 | L3L5 |
| P11 | awp, svd, g3 | braço de apoio fora do guarda-mão (awp no ferrolho; svd/g3 deitado) | crítico L3L5 | L3L5 |
| P12 | ak, akm | mão de apoio volta ao pente a 95% da recarga vazia (a IK desvanece) | crítico r2 r3 | fix-grips-r2 |
| P13 | revolver38 | revólver pequeno no ADS contra a pistola | crítico r2 r3 | fix-grips-r2 |
| P14 | m4, tavor | pose de ADS: mangas sem luva (m4), mão presa ao receptor (tavor); tavor sem mão no punho na inspeção | crítico L3L5 | L3L5 |
| P15 | scar, carbine | mão de apoio no poço do carregador (scar); vão na pegada (carbine) | crítico L3L5 | L3L5 |
| P16 | PT-38 | inspeção só com `RIG_FP_ARMS` (mesmo caso da deagle): `inspect-com-pose.mjs` serve. **A PT-38 aprovada não muda sem o dono** | L3L5 | L3L5 |

## Blender/clipe (13)

| # | Arma | Defeito | Origem |
|---|---|---|---|
| B1 | carbine, tavor, famas | recarga a re-animar: mãos rasgadas (carbine), braço gigante e giro de 70–90° (tavor), braço inflado (famas) | L3L5 |
| B2 | rem700, mosin, svd | recarga sem objeto (rem700), sem munição (mosin), antebraços borrados (svd) | L3L5 |
| B3 | g3sg1, scar, famas | peça do carregador marcada errada: g3sg1 tira o punho, scar tira a placa prateada e deixa a preta, famas com serrilhado | L3L5 |
| B4 | knife | funil da luva direita no Inspect (pele/peso do `knife-k-build.py`); mão de apoio 1,35× grande | k-rebuild, fix-grips-r2 |
| B5 | grenade | dedos tampam a granada; argola lida como solta | k-rebuild |
| B6 | revolver38 | recarga sem estojo; inspeção quase parada (clipe) | fix-grips-r2 |
| B7 | shotgun | braço de apoio esticado até a boca: a KSG tem o punho da bomba a ~10 cm da boca (modelo) | fix-grips-r2 |
| B8 | lmg | luva de apoio atrás da manga estendida do `vmsleeve.js`; fita rígida de lado no idle | fix-mesh, fix-grips-r2 |
| B9 | mp5 | bloco cinza do guarda-mão (malha antiga); luva torcida na vazia 75%; pente reto na mão × curvo na arma | fix-mags |
| B10 | sks, shotgun, md97, m400 | material: sks sem madeira e clipe liso; KSG chapada; pente da md97 sem nervura; m400 cromado "derretido" | fix-mags, fix-grips, L3L5 |
| B11 | deagle | rolagem de 90° na recarga vazia 55%; peça que sai na horizontal | L3L5 |
| B12 | uzi, p90 | uzi: pente com cara de tubo na vazia 15%; p90: a peça na mão não parece o bloco que sai do topo | fix-mags |
| B13 | awp, m400 | awp: punho rosa sem luva no saque; m400: recarga parada (só a mão anda) | L3L5 |

## Já resolvido e fora da fila

Manga oca (#632, `eval:vm-manga-oca` 25/25), arma invertida de sks/mosin/svd/m400 (#634/#635,
`eval:vm-orientacao`), LMG sem tampa/caixa (#632), carregador na mão de mp5/p90/uzi (#634,
`eval:vm-pente-na-mao`), pegadas de ak/akm/m92/md97/shotgun/revolver38 (#633/#637,
`eval:vm-pegada-k`), ADS de uzi/p90/lmg/mp5/md97/m92/akm/ak/shotgun por config (#630/#633/#636/#637),
tamanho da PT-38 (reescala do #631 revertida, decisão do dono), tamanho da AKM (fica 1,0; raster 0,93×)
e da M92 (escala real, decisão do dono).
