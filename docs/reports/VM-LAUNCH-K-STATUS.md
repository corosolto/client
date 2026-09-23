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
| ak | **golden público** (metarig AK, 77 juntas) | `models/viewmodels/coro/ak-hires.glb` | Equip, Idle, Reload, Shoot | sim | sim | referência (câmera do GLB 58,00°) | G/H | **rebuild em K pendente**; sem inspect/reload_empty |
| knife | **golden público** (52 juntas) | `models/viewmodels/coro/melee/knife-hires.glb` | Idle, Draw, Slash, Stab, QuickThrust, HeavyStab | sim (`VM_MELEE`) | câmera 50,00° ok | n/a | G/H | **rebuild em K pendente** |
| pistol (PT-38) | K | `pistol/pistol-runtime.glb` | idle, inspect, reload_empty, reload_tactical, shoot | sim | sim | **1,796× / 1,773×** (braço 2,25× / 2,17×) | F/P | **reescala ao enquadramento da AK pendente** (única falha do `eval:vm-frame`) |
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
| grenade | **sem produto K** | `grenade/grenade-runtime.glb` **ausente (404)** | — | sim (família, desde o #618) | n/a | n/a | — | **asset K inexistente em `~/csbrasil-private-assets`**; com a chave ligada o VL6 reprova |

Caminhos relativos a `public/private-assets/viewmodels/` (catálogo privado, layout idêntico ao
`preview-root` do Codex) salvo os dois golden em `public/`. As versões de URL dos produtos K
saem de `data/vmbytes.js` (sha256 dos manifestos `tools/viewmodels/*-candidates.json`); os 24
arquivos locais batem com o hash (`eval:vm-cache`, mutante `produto-reassado`).

## Pendências para o dono ligar a chave

1. **AK em K**: hoje é o golden público na linhagem metarig (outro rig, outro atlas de mão).
2. **Faca em K**: idem (knife-hires, 52 juntas).
3. **PT-38**: reescalar ao enquadramento da AK (1,796× → faixa 0,88–1,12) e braço (2,25×).
4. **Granada**: não existe produto K; construir `grenade-runtime.glb` com `UTILITY_HE/FLASH/SMOKE`
   e os clipes `throw_start/loop/end`.
5. **Veredito visual por arma** e as flags `ready` (m92/akm estão `false` por decisão do #618;
   as demais famílias fechadas). A fila humana da auditoria Codex segue valendo, agora com
   `?vmauthored=1` na URL.
6. **Entrega em produção** do catálogo privado (frente `vm-blob-delivery`, `scripts/fetch-viewmodels.sh`);
   o layout de URL aqui é o do preview-root.

## Riscos e dívidas abertas

- Arquivos compartilhados (`shared/general-runtime.glb`, os 9 atlas `T_*`, `recoil.json`) e as
  trilhas goldsrc/retarget ainda versionam por `paid-aaa-3`: re-exportar um deles sem trocar a
  string serve cache velho (classe BUG-157). Precisa de hash desses arquivos num manifesto versionado.
- Os golden públicos de m4, mp5, akm, m92, md97, mosin, lmg, scar, famas, uzi, p90, svd e sks
  ficaram sem uso no runtime (≈46 MB em `public/models/viewmodels/coro/`, com a AK). Removê-los é
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
