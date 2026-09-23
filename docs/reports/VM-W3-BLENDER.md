# Onda 3 — Blender/clipe do viewmodel K (estado parcial, 23/09/2026)

**Branch:** `vm/w3-blender` · **Base:** `vm/integracao-k` (`b6ff73c94`, PR #638) · **Fila:** B1–B13 de
`docs/reports/VM-INTEGRACAO-K-FILA-CORRECAO.md`. Retrato datado; o estado vivo é o que as réguas
e o crítico dizem. **Parada pelo coordenador no meio da 3ª iteração** (o dono mudou o caminho para
a fábrica sobre o pack KINEMATION). Nenhuma flag `ready`/`VM_LAUNCH` mudou; `vmconfig.js`,
`vmframe.js` e `vm-limiares.mjs` não foram tocados.

## Como foi feito

Sem Blender: todos os consertos são pós-processo determinístico em Node (gltf-transform + FK de
`vmpose.mjs`), com a receita no repositório e o produto fora dele. Cada receita confere o sha256
da entrada (a overlay da integração K) e reproduz o produto byte a byte
(`artifacts/w3-blender/tools/reproduz.sh`: 13/13 iguais).

| Receita | O que faz |
|---|---|
| `tools/viewmodels/prep/recarga-k.mjs` + `recarga-k.json` | recarga re-animada por chaves sobre o idle: apresentação da arma em eixos de câmera, mão direita no punho por IK, mão esquerda por chaves no espaço da arma/câmera, peça presa à mão, mecanismos, punho da manga, cartucho procedural, peças do doador na mão |
| `tools/viewmodels/prep/peca-k.mjs` + `peca-k.json` | troca componentes entre corpo e pente, zonas de material, nervuras, prisma no lugar de pente roliço, repouso novo de ossos, fusão de primitivos |
| `tools/viewmodels/prep/estojos-k.mjs` | estojos do revólver caem; cartucho novo só na pinça fechada |
| `tools/viewmodels/prep/torcao-k.mjs` | osso de torção do antebraço sem a dobra do doador (funil da luva) |

## Veredito do crítico cego (antes = integração K; contexto limpo, 3:2 + 16:9)

| Item | Arma | Antes | Depois | O que resta |
|---|---|---|---|---|
| B1 | tavor | REPROVADA | **RESSALVA** (r3) | pente na mão lê placa clara; coronha no canto na recarga |
| B1 | famas | REPROVADA | **RESSALVA** (r3) | recarga mostra a coronha de frente (guinada ~60°) |
| B1 | carbine | REPROVADA | REPROVADA (r3) | recarga consertada (sem braço gigante, cartucho à vista); reprova pela mão de apoio no ar no idle (P1, pose) |
| B3 | g3sg1 | REPROVADA | REPROVADA | pente certo sai (fantasma e objeto no ar consertados); reprova pela mão em garra do clipe doador e pelo ângulo (C6) |
| B3 | scar | REPROVADA | REPROVADA | r2 sem mudança visível (fator de cor linear claro demais); fator escurecido depois, **sem crítico** |
| B4 | knife | REPROVADA | REPROVADA | o funil sumiu (`eval:vm-funil-luva` 13,4 → 2,3 cm); o pulso agora mostra punho oco com a manga entrando pela lateral |
| B6 | revolver38 | REPROVADA | REPROVADA | inspeção passa a mostrar os dois lados; reprova pelo ADS (C/P13); estojo/cartucho não lidos pelo crítico |
| B2 | mosin | REPROVADA | REPROVADA | clipe com cartuchos aparece na mão, mas "flutua" sobre a luneta |
| B2 | rem700 | — | sem crítico | mesma receita da mosin; `eval:vm-carregador` segue "tira no ar" |
| B10 | shotgun | RESSALVA | RESSALVA | cano ganhou metal; polímero ainda claro em r2 → fatores escurecidos depois, **sem crítico** |
| B10 | md97 | REPROVADA | REPROVADA | nervuras no pente, silhueta ainda de bloco; reprova pela mão da vazia-75 (clipe doador) |
| B12 | uzi | RESSALVA | RESSALVA | pente deixou de ser tubo (caixa); resta o ADS rolado (C3) |
| B8 | lmg | REPROVADA | **RESSALVA** | fita cai para a caixa no idle; resta a mão de apoio em toco |
| B12 | p90 | REPROVADA | **revertida** | r2 e r3 REPROVADAS (braço cruzando a arma; arma de ponta): o produto volta ao da integração K; a receita fica no repo |
| B5, B7, B9, B11, B13 | grenade, shotgun (braço), mp5, deagle, awp/m400 | — | não começados | |

Textos completos em `artifacts/w3-blender/critico-r2|r3/<arma>/veredito.txt` (não versionados).

## Réguas (overlay `viewmodels-w3-blender`)

Verdes: `eval:vm-cache`, `eval:vm-rig`, `eval:vm-orientacao`, `eval:vm-manga-oca`, `eval:vm-frame`
(3/3 mutantes), `eval:vm-pegada-k`, `eval:vm-launch`, `eval:vm-catalog`, `eval:vm-funil-luva` (nova, com
mutante), verify + lifecycle de tavor, famas, carbine, scar, md97, dmr (g3sg1/rem700), revólver,
shotgun, lmg, uzi, precisão (mosin) e `knife-k-verify`.
Réguas de imagem (13 armas, 3:2 e 16:9, medidas antes dos últimos ajustes): `carregador` passou a
verde em tavor, famas, scar, md97 e mosin (dívidas pagas, **não removidas** de
`vm-reguas-divida.json`); g3sg1 verde em 3:2 e vermelho em 16:9 ("repouso 0,13 palma"); rem700,
shotgun e uzi seguem na dívida. `eval:vm-pente-na-mao` e `eval:vm-autorado-vivo --todas` não foram
re-rodados.

`vm-frame-calibra.mjs` passou a ignorar malha com escala 0 no repouso (cartucho escondido da
carabina deslocava o percentil).

## O que ficou pela metade

- p90 (revertida), scar e shotgun (sem crítico do último ajuste), rem700 (sem crítico, régua vermelha).
- Remover as dívidas pagas do carregador e re-medir o placar nas duas proporções.
- `eval:vm-pente-na-mao` (uzi mudou o pente) e `eval:vm-autorado-vivo --todas`.
