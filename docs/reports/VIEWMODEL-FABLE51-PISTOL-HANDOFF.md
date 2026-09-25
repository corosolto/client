# Handoff — pistola X18/G18, lane Fable 5.1

Ledger da lane isolada de viewmodel da pistola. Atualizado a cada marco validado.
Quem aprova visualmente e declara golden é o Ruben; este arquivo não declara nada.

- Worktree: `/Users/ruben/csbrasil/worktrees/vm-fable51-pistol`
  (`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-fable51-pistol`)
- Branch: `claude/vm-fable51-pistol`
- Base exata: `6451ecaf` de `vm-cs16-gabarito`
- Sem push, merge, PR ou deploy. Nenhum outro worktree foi tocado.

## Objetivo e definição de pronto

Produzir um candidato de pistola visualmente julgável e reproduzível: duas mãos
claramente presentes em idle e fire, sem a peça escura indevida, sem regressão da AK
golden, com contact sheet cobrindo idle, fire, reload e olhar para cima, e evidência
antes/depois suficiente para o Ruben aprovar ou rejeitar em minutos.

## Reparo de ambiente (leia antes de rodar qualquer portão aqui)

- `/usr/local/bin/node` é v16 e sombreia o Node 23 do Homebrew; `sharp` e o
  `import ... with { type: 'json' }` do arnês exigem Node ≥ 22. Use
  `export PATH=/opt/homebrew/bin:$PATH` antes de qualquer `node tools/eval/...`.
- Este worktree nasceu sem `node_modules` nem `public/private-assets`. Foram criados
  `npm ci --include=optional` (com o Node 23) e o symlink gitignored
  `public/private-assets/viewmodels -> /Users/ruben/csbrasil-private-assets/generated/viewmodels`.
- Artefatos ficam em `artifacts/viewmodels/golden-pistol/fable51-*` (gitignored) neste
  worktree. A evidência das sessões anteriores continua em
  `/Users/ruben/csbrasil/worktrees/vm-retarget/artifacts/`.

## O que foi confrontado com o HEAD

- `/tmp/pistol-x18-frame-grid-2.png` existia e foi inspecionado: as 8 células
  (yaw 18–34°, roll −2 a −8°, FOV 72/74) mostram a mesma pistola de lado com uma luva
  grande e um bloco escuro à esquerda do cabo; nenhuma célula resolve as duas mãos.
  Varrer câmera não resolvia — confirmado.
- O GLB servido no congelamento (`f90d2878…`) tinha 22,2 MB (o `optimize` não foi rodado
  após o rebuild de 01/09); cópia de segurança em `$CLAUDE_JOB_DIR/tmp/backup/`.

## Inventário estrutural (passo 1 do método)

Ferramenta nova: `node tools/eval/vm-glb-inventory.mjs <glb> --pose=idle:0 ...`
(JSON em `artifacts/viewmodels/golden-pistol/fable51-inventory/`).

Pistola servida (`pistol-runtime.glb`): 83 nós, 2 skins (`RIG_FP_ARMS` 67 joints,
`RIG_WEAPON_PISTOL` 8 joints: Barrel, Mag, Cartridge, CartridgeBed, Slider,
FireSelector, Trigger, neutral_bone), 12 materiais, 4 clips (idle 0,467 s,
reload_tactical 2,317 s, reload_empty 2,583 s, shoot 0,45 s), câmera
`VIEWMODEL_CAMERA_DATA` 80° em 16:9 olhando +Z. Braços em 3 malhas
(`GEO_FP_SK_Cloth_01`, `GEO_FP_SK_Glove_01`, `GEO_FP_SK_Hand`), cada uma 50 % L / 50 % R
por peso de joint. Arma numa malha `SK_G18` com 9 primitivas por material.

## A causa (com prova por mutação)

| medida | GLB base `pistol.glb` | runtime `f90d2878` (antes) | runtime com o conserto |
|---|---|---|---|
| AABB do slide `finish_dark` (x, y, z) m | 0,026 · 0,034 · 0,186 | 0,034 · **0,242** · 0,044 | 0,034 · 0,044 · **0,241** |
| pixels do pente no idle (legenda) | — | 329 | 3 |
| rotação local de `SOCKET_WEAPON_PISTOL` | — | identidade | `[√½, 0, 0, √½]` |

`SOCKET_WEAPON_PISTOL` é pendurado em `ik_hand_gun` pelo assembler com rotação
identidade. Todo filho de bone exportado pelo Blender carrega +90° em X: é o que
`SOCKET_WEAPON_AK` e `SOCKET_WEAPON_DEAGLE` têm (`[0,7071, 0, 0, 0,7071]`), e o prefab
`X18.prefab` do pack monta a arma com identidade no `weaponBone`. Resultado: a X18
nascia com o cano vertical. A "lâmina preta" contra o céu, a "peça retangular escura"
(cabo + pente, joint `Mag`, materiais `CoroSolto_polymer`/`Fbx Default Material 1`,
apontando para a esquerda) e os braços dominantes eram três sintomas desse único erro.
`weaponScale: 1.30`, `supportGrip` e o frame `[-7°, 30°, -15°]` eram compensações
empilhadas em cima dele.

Conserto: `tools/viewmodels/assemble_paid_family.mjs` grava a rotação de filho-de-bone.
Commit `fix(viewmodel): socket da pistola herda a rotação de filho-de-bone do glTF`.

## Legenda por peça e por lado (passo 2)

Ferramenta nova: `node tools/eval/vm-legend.mjs --arma=pistol --modo=kinemation
[--quadro-x=… --quadro-fov=…]`. Luva/braço esquerdo verde, direito magenta, pente
amarelo, cada material da arma com cor própria; conta pixels por peça em idle,
olhar-cima, fire@0,04, reload@0,60 e reload@0,92 e projeta os ossos.

| estado | antes (`fable51-legend-antes`) | socket corrigido, escala 1,3 + supportGrip | socket corrigido, escala 1,0, sem supportGrip, quadro neutro |
|---|---|---|---|
| idle: esquerda / direita px | 18 675 / 12 296 | 18 697 / 11 760 | 30 043 / 71 321 |
| fire@0,04 | 18 758 / 11 534 | 18 787 / 11 219 | 35 785 / 70 664 |
| reload@0,60 | 22 616 / 16 884 | 22 875 / 14 317 | 56 371 / 73 177 |

No estado "antes" a luva visível era a **esquerda**; a dominante ficava atrás dela. A
descrição "mão de suporte escondida" estava invertida — por isso o gate antigo (qualquer
mão + componentes separados só na recarga) ficava verde.

## Régua (passo 5, antes do conserto de composição)

`tools/eval/vm-gauntlet.mjs` agora pinta luva esquerda (verde) e luva direita (azul)
por lado do joint dominante, mantendo todas as métricas antigas (as luvas continuam
contando como mão), e ganha o portão **P1 duas mãos (idle/fire)**: cada luva precisa de
`LUVA_MIN_PX` (2 500 px em 1440 × 960, escala com a área). O mutante `--mutante=sem-mao-apoio`
passa a esconder a luva esquerda em TODOS os estados. Procedência e prova de mordida:
ver "Validação" abaixo.

## Validação (comandos e resultados)

Todos com `export PATH=/opt/homebrew/bin:$PATH` (Node 23).

### Contrato estrutural — invariante de orientação do cano (prova de mordida)

```bash
node tools/eval/pistol-viewmodel-contract.mjs --runtime-report=<runtime-report.json>
node tools/eval/pistol-viewmodel-contract.mjs $BACKUP/pistol-runtime.f90d2878.glb --runtime-report=…
node tools/eval/pistol-viewmodel-contract.mjs --runtime-report=… --mutante-cano-vertical
```

Resultados (JSONs em `artifacts/viewmodels/golden-pistol/fable51-contract/`):

| GLB | slide (x, y, z) m | boca − slide (z) | orientação |
|---|---|---|---|
| `f90d2878` (01/09, antes) | 0,039 · 0,242 · 0,044 | −0,001 m | **3 falhas** (socket identidade, slide vertical, boca atrás) |
| socket corrigido (V3) | 0,026 · 0,034 · 0,186 | +0,030 m | verde |
| V3 + `--mutante-cano-vertical` | (y/z trocados) | — | **2 falhas** |

O contrato continua vermelho no frame-base (`x 0,27 / fov 72 / [-7, 30, -15]` no HEAD
contra o `0,15 / 60 / [-9, 12, -2]` que ele exige): esse número será fechado junto com o
enquadramento novo, não antes.

### Gauntlet — o gate P1 novo NÃO morde o estado "antes" (registrado, não escondido)

`artifacts/viewmodels/golden-pistol/fable51-gauntlet-red-antes/relatorio.json` (GLB
`f90d2878`, frame do HEAD): luva esquerda 15 809 px, direita 12 256 px no idle; 16 332 /
11 960 no fire — as duas luvas estavam no quadro, lado a lado na mesma altura
(centroides a 82 px), e por isso liam como uma só. Contagem de pixel não expressa esse
defeito; a invariante causal é a orientação do cano (contrato acima). O gate P1 por luva
fica como proteção contra a mão de apoio sumir de verdade (mutante `sem-mao-apoio`).

### Enquadramento — varredura medida pelo gauntlet (`--quadro-*`, GLB V3)

Alvo com procedência: BAR-CONSISTENCIA §2.6, VAL-1 (pistola): caixa arma+mão+antebraço
começa em x/W ≈ 0,62 e y/H ≈ 0,58; C5 do contrato `x 0,50–0,66`, `y ≥ 0,45`; centro livre.
Ponto de partida: `frame_delta_sugerido` do gabarito CS 1.6 da pistola
(`baked-preview/pistol-cs16-template-report.json`: +0,057, −0,011, −0,190).

| cand. | fov | x, y, z | pitch/yaw/roll | arma % quadro | diag | mão/arma | caixa | falhas |
|---|---|---|---|---|---|---|---|---|
| A | 60 | 0,06 −0,03 −0,22 | 0/0/0 | 0,38 | 0,079 | 15,9 | 0,51; 0,58 | arma some · mão/arma |
| B | 60 | idem | +7,5/0/0 | 0,37 | 0,083 | 20,5 | 0,47; 0,52 | + C5 |
| C | 60 | idem | −7,5/0/0 | 0,37 | 0,077 | 12,9 | 0,53; 0,64 | arma some · mão/arma |
| D | 72 | 0,06 −0,03 −0,30 | 0/0/0 | 0,16 | 0,049 | 54,3 | 0,34; 0,56 | 6 falhas (descartado) |
| E | 60 | 0,10 −0,06 −0,30 | 0/0/0 | 0,31 | 0,073 | 17,0 | 0,53; 0,61 | arma some · mão/arma |

| F | 60 | 0,12 −0,10 −0,20 | 0/25/−8 | 0,71 | 0,129 | 4,17 | 0,50; 0,69 | mão/arma 4,2 · C5 x 0,4965 · P4 pente ≤2 000 px (recarga na borda) |
| G | 60 | 0,14 −0,12 −0,16 | −5/30/−10 | 1,05 | 0,162 | 1,07 | 0,48; 0,79 | C5 · P4 (recarga fora) — recorta demais |
| **H** | **55** | 0,10 −0,10 −0,22 | 0/20/−5 | 0,73 | 0,126 | 3,78 | 0,51; 0,70 | **nenhuma** (cano 20°, pente↔mão 0 px, tiro 28 %) |
| I | 60 | 0,16 −0,14 −0,14 | −8/35/−12 | 1,00 | 0,163 | 0,11 | 0,47; 0,87 | P1 duas mãos (luvas 1 355 / 129 px) · C5 · P4 — recorta as mãos |
| J | 60 | 0,14 −0,10 −0,20 | +6/25/−8 | 0,71 | 0,134 | 5,28 | 0,51; 0,64 | mão/arma · P3 · P4 |
| K | 60 | 0,14 −0,08 −0,20 | +4/28/−8 | 0,71 | 0,133 | 5,92 | 0,50; 0,63 | mão/arma · C5 |
| L | 60 | 0,16 −0,10 −0,18 | +8/25/−6 | 0,82 | 0,147 | 5,03 | 0,54; 0,63 | mão/arma · P4 |
| M | 60 | 0,13 −0,11 −0,24 | +7/25/−8 | 0,57 | 0,120 | 6,55 | 0,50; 0,63 | mão/arma · C5 |
| N | 55 | 0,12 −0,09 −0,22 | +5/20/−5 | 0,71 | 0,129 | 5,44 | 0,53; 0,64 | mão/arma · P3 |
| O | 60 | = H | = H | 0,59 | 0,113 | 5,16 | 0,51; 0,68 | arma some · mão/arma · P4 (isola a lente: 60° reabre tudo) |

**Decisão: H** (`x 0,10 / y −0,10 / z −0,22 / FOV 55 / [0°, 20°, −5°] / drawDrop 0,34`) vira
`FAMILY_FRAME.pistol` em `public/js/authoredvm.js` e o frame-base cobrado pelo contrato.
Subir o pacote com pitch (J–N) leva a proporção mão/arma para 5–6× porque os antebraços
do pack entram no quadro; H fica em 3,78× com a recarga ainda medível (pente↔mão 0 px).
Limitação honesta: a caixa de H começa em y/H 0,70 (VAL-1 mede 0,58) — a pistola fica
mais baixa que a referência; é o preço de manter os antebraços fora do centro.

Leitura: com yaw 0 a pistola é vista por trás (cyan minúsculo entre as duas luvas) e os
antebraços do pack, autorados a 12–15 cm da câmera de 80°, dominam. Pitch positivo sobe
o pacote no quadro. A varredura 2 (F–I) usa yaw 20–35° e roll −5…−12° para a leitura
lateral e y −0,10…−0,14 para recortar os antebraços, como na VAL-1.

### Gauntlet — mutantes da régua nova (sobre o V3, quadro de F)

```bash
node tools/eval/vm-gauntlet.mjs --modo=kinemation --armas=pistol --frames --mutante=cano-vertical --quadro-fov=60 --quadro-x=0.12 --quadro-y=-0.10 --quadro-z=-0.20 --quadro-yaw=25 --quadro-roll=-8
node tools/eval/vm-gauntlet.mjs --modo=kinemation --armas=pistol --frames --mutante=sem-mao-apoio  (mesmo quadro)
```

| mutante | o que faz | resultado |
|---|---|---|
| `cano-vertical` | zera a rotação de `SOCKET_WEAPON_PISTOL` no runtime (estado de 01/09) | **P2 cano 87,5°** (máx. 60°), silhueta 0,57, centro invadido, P4 |
| `sem-mao-apoio` | esconde a luva esquerda em todos os estados | **P1 duas mãos**: idle 0 / 28 870 px, fire 0 / 31 408 px |

Relatórios em `artifacts/viewmodels/golden-pistol/fable51-grid/MUT-*/`. Commit
`test(viewmodel): gauntlet mede luva por lado e o ângulo do cano`.

### Cadeia final reproduzível (rodada nesta ordem, saída em `fable51-*`)

```bash
export PATH=/opt/homebrew/bin:$PATH
python3 tools/viewmodels/build_paid_catalog.py --family pistol        # Blender base + assembler
node tools/viewmodels/optimize_paid_family.mjs --familia=pistol       # só a pistola; shared/ intacto
node tools/viewmodels/validate_paid_catalog.mjs
node tools/eval/golden-ak-runtime.mjs --arma=pistol --modo=kinemation --largura=1440 --altura=960 --saida=artifacts/viewmodels/golden-pistol/fable51-runtime-final
node tools/eval/pistol-viewmodel-contract.mjs --runtime-report=artifacts/viewmodels/golden-pistol/fable51-runtime-final/runtime-report.json
node tools/eval/vm-gauntlet.mjs --modo=kinemation --armas=pistol --largura=1440 --altura=960 --frames --out=artifacts/viewmodels/golden-pistol/fable51-gauntlet-final
```

| passo | resultado |
|---|---|
| rebuild Blender + assembler | GLB montado com SHA `4e33ff58…` — **idêntico** ao V3 montado à mão: a cadeia é determinística |
| optimize (`--familia=pistol`, novo filtro) | 22,2 MB → 3 005 712 bytes, SHA servido `edb77908eadffd90fa3c2152ac00386372bf3002d20fb2c4d324d15ddad17e05` |
| validate_paid_catalog | 15 famílias, 26 armas, verde (socket da pistola no mesmo `worldIdlePos` da baseline) |
| runtime sheet | `fable51-runtime-final/contact-sheet.png` (idle, idle prolongado, olhar-cima, corrida, salto, draw×5, fire×5, reload×9, pós-recarga, espaço estreito, parede) |
| contrato | `ok: true`, SHA servido = SHA validado (`fable51-contract/final.json`) |
| gauntlet final (`fable51-gauntlet-final`, régua definitiva, sem `--quadro`) | **1/1 limpa**: arma 0,73 % do quadro, diagonal 0,126, aspecto 1,18, mão/arma 3,78, caixa 0,51;0,70, centro 0 px, luvas idle 15 854 / 22 198 px e fire 19 041 / 23 594 px, cano 20°, tiro 30 %, pente 102 % e mão↔pente 0 px; saque começa com 0 px no quadro e termina com 10 070 px de arma; GLB servido `edb77908…` 3 005 712 B |
| antes/depois para o Ruben | `artifacts/viewmodels/golden-pistol/fable51-antes-depois/antes-depois.png` (idle, fire 0 %/50 %, reload 60 %/76 %, olhar-cima; esquerda = `runtime-side-readable-v1` de 01/09, direita = `fable51-runtime-final`) |

Ressalva honesta sobre a folha do `golden-ak-runtime.mjs`: as células `draw-000…draw-100`
mostram a pistola já na pose de idle. O saque da pistola é procedural (arco `drawDrop`,
sem clip `equip`), e o gauntlet — que mede o mesmo estado pelo mesmo caminho e salvou
`fable51-gauntlet-final/pistol/draw-0.png` com a arma fora do quadro — aprovou o P6. A
divergência está na captura do sheet, não no jogo; fica registrada em "Limitações" até
ser reproduzida com sonda dedicada.

### Mutantes sobre o GLB final e o frame H (`fable51-mutante-*`)

| mutante | resultado |
|---|---|
| `sem-arma` | vermelho (8 falhas) |
| `sem-pente` | vermelho (P4 pente independente) |
| `pente-estatico` | **verde na 1ª rodada — defeito na régua**, vermelho depois do conserto (abaixo) |
| `sem-mao-apoio` | vermelho (P1 duas mãos idle 0/28 490 px, fire 0/30 936 px) |
| `draw-idle` | vermelho (P6 pisca a pose pronta, P7, P4) |
| `tiro-estatico` | vermelho (P7 excursão 0 %) |
| `perfil-estreito` | vermelho (arma some, P4) |
| `cano-vertical` | vermelho (P2 cano 89,1°, silhueta 0,49, centro) |

Dois defeitos da régua encontrados e consertados nesta rodada (ambos em `vm-gauntlet.mjs`):

1. **Projeção do pente com matriz velha.** `applyBoneTransform` usa `bindMatrixInverse`,
   que o three só refresca em `SkinnedMesh.updateMatrixWorld()` (render); a malha da
   arma desce de `ik_hand_gun`, animado. O 1º frame da recarga projetava o pente com a
   pose anterior e inventava 0,24 de excursão — por isso `pente-estatico` passava
   (pixels idênticos nos 8 frames; só a projeção analítica mudava). Conserto:
   `probe.source.updateMatrixWorld(true)` antes de projetar. Mutante agora vermelho com
   excursão 0.
2. **Foto antes do render.** O gauntlet fotografava logo após o `evaluate`; o canvas só
   muda no laço do jogo, e a AK golden reprovou o P1 antigo numa rodada porque recarga
   0,9 e 1,3 saíram idênticas (99 775 px de mão) — a baseline `regressao-ak-golden-v1`
   tem 82 346 px e 26 % de segundo componente em 1,3. Conserto: dois
   `requestAnimationFrame` dentro de `shot()`, como o `golden-ak-runtime.mjs` já fazia.
   (Um fechamento morfológico da costura luva/manga foi testado e REVERTIDO: a costura
   não partia nada — idle da AK 58 677 px contra 58 812 da baseline.)

### Regressão da AK golden (régua definitiva)

```bash
node tools/eval/vm-gauntlet.mjs --modo=golden --armas=ak --largura=1440 --altura=960 --frames --out=artifacts/viewmodels/golden-pistol/fable51-ak-regressao
node tools/eval/vm-gauntlet.mjs --modo=golden --armas=ak --mutante=tiro-estatico --out=artifacts/viewmodels/golden-pistol/fable51-ak-mutante-tiro-estatico
node tools/eval/ak-viewmodel-contract.mjs
```

| medida | baseline `regressao-ak-golden-v1` (01/09) | hoje |
|---|---|---|
| gauntlet | limpa | **limpa (1/1)** |
| arma % do quadro · diagonal | 5,96 % · 0,440 | 5,97 % · 0,440 |
| mão/arma | 0,771 | 0,768 |
| caixa | 0,5306; 0,5125 | 0,5306; 0,5125 |
| tiro (excursão) | 9,2 % | 9,2 % |
| recarga 1,3 s: componentes de mão | 58 907 + 21 510 px | 58 791 + 21 583 px |
| mutante `tiro-estatico` | vermelho | **vermelho** (P7 0 %) |
| contrato `ak-viewmodel-contract.mjs` | verde | **verde** |
| `public/models/viewmodels/coro/ak-hires.glb` | — | intocado (SHA `3b6ca23d…`, sem diff) |

### Legenda "depois" (`fable51-legend-depois`, frame H, GLB final)

idle 16 011 / 23 322 px (esq./dir.), olhar-cima 16 023 / 23 307, fire@0,04 18 014 / 23 883,
reload@0,60 32 034 / 28 046, reload@0,92 16 641 / 22 670. As duas luvas em todos os estados.

## Aceitos / rejeitados

- **Aceito (causal):** socket da pistola com rotação de filho-de-bone; provado por
  inventário (slide 0,242 m em Y → 0,241 m em Z), contrato e gauntlet, e pela cadeia
  reproduzível que devolve o mesmo SHA.
- **Aceito:** `weaponScale 1,0` e remoção de `supportGrip` — eram compensações da arma
  vertical; a pose autoral do pack é a duas mãos e o cabo volta a caber na mão.
- **Aceito (medido):** frame H (`0,10 / −0,10 / −0,22 / 55° / [0, 20, −5]`), único limpo
  em 15 candidatos; a lente 55° tem procedência na cópia O (60° reabre "arma some" e P4).
- **Aceito (régua):** contrato mede orientação do cano; gauntlet mede luva por lado,
  ângulo do cano, projeta o pente com a matriz certa e fotografa após o render. Cada
  invariante nova tem mutante vermelho registrado acima.
- **Rejeitado:** varrer câmera sobre a arma vertical; fechamento morfológico da costura
  luva/manga (testado, sem evidência, revertido); frames com pitch positivo (J–N) por
  levarem mão/arma a 5–6×.
- **Não feito de propósito:** nenhuma outra família, nenhum lote, nenhuma declaração de
  golden.

## Limitações e bloqueios

- **Composição mais baixa que a referência.** A caixa de H começa em y/H 0,70; VAL-1
  (pistola) mede 0,58. Subir o pacote (pitch +4…+8) leva os antebraços do pack para o
  quadro e a proporção mão/arma para 5–6×. É uma troca a decidir olhando, não medindo.
- **A pistola é pequena no quadro** (0,73 %, diagonal 12,6 % contra 44 % da AK): é a
  escala real do X18 nas mãos do pack, sem `weaponScale`. Se o Ruben quiser a pistola
  maior, a alavanca honesta é a lente/distância, não escalar o cabo além da mão.
- **Folha do `golden-ak-runtime.mjs`, células `draw-*`.** Mostram a pistola já na pose
  pronta. Não é o jogo: a sonda `fable51-draw-probe/probe.mjs` reproduz a sequência da
  folha e mede `mount.position.y = −0,44` na fração 0 (arco de 0,34 m aplicado), e o
  gauntlet fotografa o mesmo estado com 0 px de arma no quadro (P6 verde, frames em
  `fable51-gauntlet-final/pistol/draw-*.png`). A folha reaproveita a matriz do render
  anterior para o saque procedural; fica como defeito da captura a resolver fora desta
  lane, e os frames de saque válidos são os do gauntlet.
- **Gate P1 antigo (componentes na recarga)** continua sensível a frame duplicado; o
  `shot()` com dois RAF reduziu, não eliminou, a chance de foto antes do render.
- Só o Ruben aprova visualmente. Nada aqui declara golden.

## Mudanças e commits desta lane (branch `claude/vm-fable51-pistol`, base `6451ecaf`)

1. `86ae9925` test(viewmodel): inventário estrutural do GLB e legenda por peça/lado no jogo real
   — `tools/eval/vm-glb-inventory.mjs`, `tools/eval/vm-legend.mjs`.
2. `95935669` fix(viewmodel): socket da pistola herda a rotação de filho-de-bone do glTF
   — `tools/viewmodels/assemble_paid_family.mjs`.
3. `d4e394b7` test(viewmodel): contrato da pistola mede a orientação do cano
   — `tools/eval/pistol-viewmodel-contract.mjs`.
4. `4b1c2671` test(viewmodel): gauntlet mede luva por lado e o ângulo do cano
   — `tools/eval/vm-gauntlet.mjs`.
5. `16af2d36` fix(viewmodel): pistola nivelada — escala 1,0, sem pose de apoio artificial e frame medido
   — manifesto, `authoredvm.js`, contrato, `optimize_paid_family.mjs --familia`, blocos gerados.
6. `1d64af1c` test(viewmodel): gauntlet projeta o pente com a matriz certa e fotografa após o render
   — `tools/eval/vm-gauntlet.mjs`, `ARCH.generated.md`.
7. (este commit) docs(viewmodel): handoff da lane Fable 5.1 da pistola — este arquivo.

Asset privado alterado (fora do Git, dentro da lane): `pistol-runtime.glb` (SHA
`edb77908…`, 3 005 712 B), `pistol.glb`/`pistol.blend` regenerados pelo Blender,
`assembly-report.json`, `optimize-report.json`, `validation-report.json`, `catalog.json`.
O GLB anterior (`f90d2878…`) continua em `pistol-runtime.glb.pre-optimize.bak`.
Nenhum outro worktree foi tocado; `viewmodel-blender` permanece com suas alterações locais.

## Próximo passo concreto para a revisão do Ruben

1. Abrir `artifacts/viewmodels/golden-pistol/fable51-antes-depois/antes-depois.png`
   (esquerda 01/09, direita hoje) e a folha completa
   `artifacts/viewmodels/golden-pistol/fable51-runtime-final/contact-sheet.png`.
2. Ver no jogo: `npx astro dev --port 8300` neste worktree e
   `http://localhost:8300/?vmready=pistol&vmgolden=0&vmweapon=pistol&map=brasilia`
   (a pistola já é `ready: true`; o parâmetro só garante a família). Testar idle, tiro,
   recarga, olhar para cima, correr, pular.
3. Decidir olhando: (a) aprova a pistola nivelada como candidata visual; (b) quer o
   pacote mais alto (aceitando mais antebraço) ou a pistola maior (lente); (c) rejeita.
   Só depois disso: `VM_FAMILY.pistol` continua `ready: true` como já estava — nada muda
   em produção sem essa decisão, porque a rota pública não serve a trilha A sem
   `?vmready`/decisão de fonte padrão (VIEWMODEL-INVENTARIO.md).
