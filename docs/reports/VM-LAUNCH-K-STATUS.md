# Viewmodel K: runtime único e chave de lançamento tudo-ou-nada

**Data:** 23/09/2026 · **Branch:** `vm/launch-k` · **Base:** #618 (`claude/vm-integracao`,
`6e93f2d23`) + linhagem Codex #572 (`codex/viewmodels-catalog-final`, `f682e29b5`).

Retrato datado. O estado vivo de cada arma é o que `npm run eval:vm-launch` imprime: se este
arquivo e a régua divergirem, vale a régua.

## Decisão que este branch implementa

Todas as armas saem com braços e mãos K (KINEMATION, 67 juntas: `FP_Cloth`/`FP_Glove`/`FP_Hand`),
ou nenhuma. Em produção o autorado só liga quando `VM_LAUNCH === true` **e** as 26 armas do
`WEAPON_IDS` + a granada estão prontas. Fora disso tudo fica no legado (`fparms`), faca e
granada inclusive. `VM_LAUNCH` está `false` e nenhuma flag `ready` foi mudada neste branch:
virar é decisão do dono.

| Query | Efeito |
|---|---|
| nenhuma | `vmlaunch.js` decide: legado hoje (chave desligada) |
| `?vmauthored=1` | revisão: liga o autorado; portão por arma continua valendo |
| `?vmready=<famílias>` / `?vmweapon=<armas>` | na revisão, abre famílias/armas fora do portão |
| `?vmqa=precision` | painel de QA de precisão (Codex) na revisão |
| `?vmauthored=0` | kill-switch: legado mesmo com a chave ligada |

Régua: `npm run eval:vm-launch` (`tools/eval/vm-launch-check.mjs`), no `check:fast`, no
`check:vm` e no `ci.yml`. Mutantes: chave-mentirosa, uma-arma-fora (uzi `ready:false` com a
chave ligada), ativacao-parcial, seletor-ignora-chave, faca-fora-da-chave,
granada-fora-da-chave e chave-sem-asset; todos ficam vermelhos.

## Estado por arma

Legenda de portões: **R** = `ready` efetivo (família pronta e arma sem `ready:false`);
**V** = `vm-autorado-vivo --todas` monta o GLB com mão visível no navegador (23/09);
**F** = `eval:vm-frame` 3:2/16:9 dentro da faixa; **Rig** = `eval:vm-rig` 55/55 ossos
KINEMATION + ações obrigatórias. Colunas G/H/P são o recibo da auditoria Codex de 22/09
(`VIEWMODELS-AUDITORIA-FINAL-2026-09-22.md`): gate, evidência nas duas proporções, revisão
humana pendente.

| Arma | Rig | Asset servido | Clipes no GLB | R | V | F (3:2 / 16:9) | Codex | Defeito conhecido / falta |
|---|---|---|---|---|---|---|---|---|
| ak | **K** (vm/k-rebuild) | `ak/ak-baked-runtime.glb` | equip_rifle, idle, inspect, reload_empty, reload_tactical, shoot | sim* | sim | 1,063 / 0,962 | — | **re-aprovação do dono no K**; golden segue no Git só como referência |
| knife | **K** (vm/k-rebuild) | `knife/knife-baked-runtime.glb` | Idle, Draw, Slash, Stab, QuickThrust, HeavyStab, Inspect | sim* (`VM_MELEE`) | câmera 50,00° ok | n/a | — | **re-aprovação do dono no K**; palma 1,35× maior que a da faca L na tela |
| pistol (PT-38) | K | `pistol/pistol-runtime.glb` | idle, inspect, reload_empty, reload_tactical, shoot | sim* | sim | 0,999 / 0,985 (braço 0,93× / 0,89×) | F/P | **re-aprovação do dono** do novo enquadramento (pega e clipes intocados) |
| deagle | K | `deagle/deagle-runtime.glb` | idle, inspect, reload_empty, reload_tactical, shoot | não | sim | 0,927 / 0,911 | G/H/P | sem `equip_rifle` próprio (saque pelo clipe geral) |
| revolver38 | K | `revolver/revolver-runtime.glb` | idle, inspect, reload_empty, shoot | não | sim | 1,109 / 1,096 | G/H/P | sem `equip_rifle` |
| m4 | K | `ar/m4-baked-runtime.glb` | equip_rifle, idle, inspect, reload_empty, reload_tactical, shoot | não | sim | 0,946 / 0,881 | G/H/P | — |
| md97 | K | `ar/md97-baked-runtime.glb` | idem m4 | não | sim | 0,944 / 0,891 | G/H/P | — |
| scar | K | `ar/scar-baked-runtime.glb` | idem m4 | não | sim | 0,972 / 0,900 | G/H/P | — |
| famas | K | `ar/famas-baked-runtime.glb` | idem m4 | não | sim | 0,979 / 0,925 | G/H/P | — |
| carbine | K | `ar/carbine-baked-runtime.glb` | idem m4 | não | sim | 0,954 / 0,899 | G/H/P | — |
| tavor | K | `ar/tavor-baked-runtime.glb` | idem m4 | não | sim | 0,978 / 0,921 | G/H/P | — |
| m92 | K | `ak/m92-baked-runtime.glb` | idem m4 | **não** (`ready:false` do #618) | sim | 0,987 / 0,942 | G/H/P | veredito do dono pendente |
| akm | K | `ak/akm-baked-runtime.glb` | idem m4 | **não** (`ready:false` do #618) | sim | 0,913 / 0,905 | G/H/P | veredito do dono pendente |
| g3 | K | `g3/g3-baked-runtime.glb` | idem m4 | não | sim | 1,038 / 1,006 | G/H/P | — |
| m400 | K | `sniper/m400-baked-runtime.glb` | idem m4 | não | sim | 1,006 / 0,970 | G/H/P | — |
| awp | K | `sniper/awp-baked-runtime.glb` | idem m4 | não | sim | 0,936 / 0,890 | G/H/P | — |
| mp5 | K | `mp5/mp5-runtime.glb` | idem m4 | não | sim | 0,970 / 0,936 | G/H/P | — |
| uzi | K | `smg/uzi-baked-runtime.glb` | idle, inspect, reload_empty, reload_tactical, shoot | não | sim | 1,008 / 0,941 | G/H/P | sem `equip_rifle`; no ADS a alça não chega ao centro (ADS manual, ver capturas) |
| p90 | K | `p90/p90-baked-runtime.glb` | idem m4 | não | sim | 0,988 / 0,934 | G/H/P | — |
| rem700 | K | `bolt/rem700-baked-runtime.glb` | idle, inspect, reload_empty, reload_start/loop/end, shoot | não | sim | 0,939 / 0,889 | G/H/P | sem `equip_rifle` |
| mosin | K | `bolt/mosin-baked-runtime.glb` | equip_rifle, idle, inspect, reload_empty, reload_start/loop/end, shoot | não | sim | 0,977 / 0,934 | G/H/P | — |
| g3sg1 | K | `g3/g3sg1-baked-runtime.glb` | idem m4 | não | sim | 1,061 / 1,022 | G/H/P | — |
| svd | K | `svd/svd-baked-runtime.glb` | idem m4 | não | sim | 1,024 / 1,023 | G/H/P | — |
| sks | K | `marksman/sks-baked-runtime.glb` | equip_rifle, idle, inspect, reload_empty, reload_start/loop/end, shoot | não | sim | 1,000 / 0,955 | G/H/P | — |
| shotgun | K | `shotgun/shotgun-baked-runtime.glb` | equip_rifle, idle, inspect, reload_start/loop/end, shoot | não | sim | 1,001 / 0,941 | G/H/P | em idle a arma ocupa a metade direita com uma peça vermelha na boca do cano; igual ao recibo Codex, pede olho do dono |
| lmg | K | `lmg/lmg-baked-runtime.glb` | idle, inspect, reload_empty, reload_tactical, shoot | não | sim | 0,723 / 0,691 (faixa própria 0,65–0,85) | G/H/P | sem `equip_rifle` |
| grenade | **K** (vm/k-rebuild) | `grenade/grenade-runtime.glb` + `grenades-world.glb` | idle, equip, throw_start, throw_loop, throw_end | sim* (família) | n/a | n/a | — | **re-aprovação do dono no K** (antes: 404, arremesso no legado) |

\* **As quatro flags `ready:true` de AK, pistola, faca e granada são vereditos do dono sobre as
versões ANTERIORES** (AK e faca golden, PT-38 no enquadramento antigo, granada inexistente).
O `vm/k-rebuild` não mexeu em nenhuma flag: as quatro precisam de **RE-APROVAÇÃO do dono no K**
antes de qualquer `VM_LAUNCH=true`. Nos manifestos (`rifle-`, `sidearm-`, `melee-candidates.json`)
os produtos continuam `ready:false`, que é o estado de produto aguardando o dono.

Caminhos relativos a `public/private-assets/viewmodels/` (catálogo privado, layout idêntico ao
`preview-root` do Codex). As versões de URL dos produtos K
saem de `data/vmbytes.js` (sha256 dos manifestos `tools/viewmodels/*-candidates.json`); os
arquivos locais batem com o hash (`eval:vm-cache`, mutante `produto-reassado`).

## Pendências para o dono ligar a chave

1. **Re-aprovação no K** de AK, faca, PT-38 e granada (seção abaixo e folhas antes/depois em
   `artifacts/vm-k-rebuild/sheets/`, não versionadas).
2. **Veredito visual por arma** e as flags `ready` (m92/akm estão `false` por decisão do #618;
   as demais famílias fechadas). A fila humana da auditoria Codex segue valendo, agora com
   `?vmauthored=1` na URL.
3. **Entrega em produção** do catálogo privado (frente `vm-blob-delivery`, `scripts/fetch-viewmodels.sh`);
   o layout de URL aqui é o do preview-root.

## vm/k-rebuild: AK, faca, PT-38 e granada no rig K

Todas as receitas partem do checkpoint Codex `m4-final.blend` (sha256 `e4b3fdfc…`) ou do pack
extraído, escrevem só fora do Git e têm gate causal com mutantes.

| Arma | Receita | Gate | O que mudou em relação à versão aprovada |
|---|---|---|---|
| PT-38 | só `VM_WEAPON.pistol.frame` + `ads.pull` | `eval:vm-frame` | pacote recua de z -0,22 para -0,566 m mantendo a alça no mesmo ponto da tela; fov 55, yaw 15°, pega e clipes iguais; `pull` 0,396 devolve o ADS à profundidade antiga |
| granada | `build_paid_grenade.py` → `bind_paid_grenade.mjs` → `finish_paid_grenade.mjs` → `optimize_paid_family.mjs --familia=grenade` | `eval:vm-launch` VL6, `eval:vm-cache` | clipes crus somavam 6,4 s tocados em 1,05 s; agora throw_start ×0,5, espera 0,1 s, pino e argola vão para os dedos da mão esquerda, a granada some da mão no arremesso; enquadramento x -0,05 / y 0 |
| AK | `tools/viewmodels/prep/rifles-ak-final.py` | `rifles-ak-verify.mjs` (14 mutantes) | ak.glb pública sobre o rig K; pente curvo, trava e manivela reais; coice do pacote ×3,5 para a tela andar como a golden; frame buscado para a silhueta da golden dentro da faixa do `eval:vm-frame` |
| faca | `knife-k-alvos.mjs` → `knife-k-build.py` → `optimize_paid_family.mjs --familia=knife` | `knife-k-verify.mjs` (6 mutantes) | movimento amostrado da faca L aprovada, mãos K por IK analítico; Inspect novo; palma 1,35× maior na tela (braço K curto); 6% dos quadros de ataque esticam o braço no limite |

Medidas contra a referência aprovada, no jogo (3:2, `vm-gauntlet`, sonda de cores):

| Medida | AK golden | AK K |
|---|---|---|
| diagonal da arma / diagonal da tela | 0,440 | 0,414 |
| arma como fração do quadro | 0,0628 | 0,0650 |
| pixels de mão / pixels de arma | 0,73 | 0,49 |
| centro da arma (px) | 1226, 720 | 1209, 734 |
| ADS | sem alinhamento (zoom de FOV) | alça no eixo, 0,000 / 0,00° (`eval:vm-ads`) |

A mão de apoio K segura o guarda-mão por baixo (pose do doador M4), por isso ocupa menos
pixels que a luva golden; enquadramento não resolve isso sem mexer na pose.

## Riscos e dívidas abertas

- Arquivos compartilhados (`shared/general-runtime.glb`, os 9 atlas `T_*`, `recoil.json`) e as
  trilhas goldsrc/retarget ainda versionam por `paid-aaa-3`: re-exportar um deles sem trocar a
  string serve cache velho (classe BUG-157). Precisa de hash desses arquivos num manifesto versionado.
- Os golden públicos de ak, m4, mp5, akm, m92, md97, mosin, lmg, scar, famas, uzi, p90, svd e sks
  e a faca `melee/knife-hires.glb` ficaram sem uso no runtime (AK e faca seguem como referência
  visual e fonte do movimento da faca K). Removê-los é
  decisão do dono; a régua `vm-cache-golden` continua conferindo o hash de todos.
- 18 ferramentas de figura/probe do viewmodel e as réguas de navegador (`eval:vm-ads`,
  `eval:vm-identity`, `eval:vm-camera`, `eval:vm-autorado-vivo`) agora pedem `?vmauthored=1`
  explicitamente; ferramenta nova que esquecer isso mede o legado sem avisar.

## Evidência deste branch

- `eval:vm-launch` VERDE (7 mutantes vermelhos); `eval:vm-camera` 2/2 (AK 58,00°, faca 50,00°;
  mutante `clamp` consertado e agora vermelho); `vm-autorado-vivo --todas` 25/25 com mão visível;
  `eval:vm-rig` 24/24; `eval:vm-foundation` 22/22; `eval:vm-frame` 23/24 (só PT-38);
  `authored-attach-check --mutantes` e `authored-transition-check --mutantes` verdes.
- Capturas reais (não versionadas) em `artifacts/vm-launch-k/`: AK, pistola, shotgun, uzi e akm
  em idle/tiro/recarga/ADS, 1440×960 e 1440×810, com `?vmauthored=1`, e a AK sem query mostrando
  o legado (`vm: legado · ak · legado`).
