# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.47 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6204 | 220 |
| `public/js/main.js` | 1877 | 164 |
| `public/js/glbchars.js` | 838 | 60 |
| `public/js/characters.js` | 1067 | 41 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 345 | 20 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **2975 linhas (48% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 800 | 5071 | `_updateBot()` | ⚠️ candidato a extração |
| 529 | 602 | `constructor()` | 🔴 append-only |
| 305 | 4345 | `_updatePlayer()` | ⚠️ candidato a extração |
| 248 | 1887 | `_resetPositions()` |  |
| 241 | 1220 | `_buildViewModels()` |  |
| 146 | 4650 | `_updatePickups()` |  |
| 133 | 3957 | `_botCtf()` |  |
| 84 | 3691 | `_initCTF()` |  |
| 83 | 2580 | `_tryShoot()` |  |
| 77 | 2914 | `_dmgArc()` |  |
| 76 | 4096 | `_updateCtfHud()` |  |
| 66 | 5909 | `_updateRadar()` |  |
| 64 | 3063 | `_wpnIcon()` |  |
| 62 | 2852 | `_kill()` |  |
| 61 | 6107 | `update()` | 🔴 append-only |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `16–64` `323–323` `357–366` `393–485` `512–533` `1220–1617` `2429–2515` `2534–2727` `3127–3150` `3198–3258` `3324–3340` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` |
| **BOTS / JOGABILIDADE** | `177–180` `231–231` `257–268` `575–586` `2813–2913` `3635–3690` `3853–4089` `4172–4194` `4345–4649` `4943–4960` `5042–5870` | — |
| **MAPAS / MUNDO** | `1166–1219` `1887–2134` `3691–3830` `4650–4795` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1618–1660` `2365–2377` `3151–3189` `3269–3323` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1131–1165` `2325–2343` `2359–2364` `2378–2384` `2914–3126` `5909–5974` `6005–6106` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6107–6167 · `_dom()` 1131–1165 · `constructor()` 602–1130

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3705 de 6204 linhas (60%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 16 | `WEAPONS` | 49 |
| 65 | `QS` | 8 |
| 73 | `VM_MAT_LEGACY` | 4 |
| 77 | `ROUND_TIME` | 8 |
| 85 | `ROUNDS_MAX` | 28 |
| 116 | `CTF_CLOCK_SHOW` | 4 |
| 120 | `KILLS_PER_PLAYER` | 7 |
| 127 | `PACE` | 33 |
| 160 | `PAUSE_ARM_MS` | 9 |
| 170 | `confirmGate` | 7 |
| 181 | `BOT_AIM_PITCH` | 4 |
| 185 | `BOT_DMG_PLAYER` | 21 |
| 206 | `BOT_FAIR` | 5 |
| 211 | `BOT_MOVE2` | 15 |
| 235 | `BOT_FOCUS_MIN` | 22 |
| 261 | `BOT_TOKEN_REST` | 7 |
| 269 | `MOVE_MUL` | 6 |
| 276 | `MOVE2` | 5 |
| 281 | `RACK_OLD` | 4 |
| 285 | `RACK_RETA` | 25 |
| 312 | `RADIO` | 5 |
| 318 | `MK_LABELS` | 5 |
| 324 | `D2R` | 7 |
| 331 | `buildRecoilPattern` | 12 |
| 343 | `RECOIL_PATTERN` | 7 |
| 350 | `RECOIL_CLASS` | 7 |
| 357 | `REC_DEG` | 10 |
| 367 | `REC_HOLD` | 3 |
| 370 | `DMG_FALLOFF` | 5 |
| 375 | `HS_MUL` | 3 |
| 378 | `BALL_CLASS` | 15 |
| 393 | `STATIC_CLASS` | 75 |
| 469 | `VM_KNOB` | 17 |
| 488 | `vmFovForAspect` | 24 |
| 512 | `VM_OFF` | 22 |
| 534 | `vmOffY` | 35 |
| 569 | `VMP` | 6 |
| 575 | `BOT_SKILLS` | 11 |
| 587 | `diffKey` | 4 |
| 592 | `rollBotSkill` | 7 |
| 602 | `constructor()` | 529 |
| 1131 | `_dom()` | 35 |
| 1166 | `_buildEnv()` | 54 |
| 1220 | `_buildViewModels()` | 241 |
| 1461 | `_vmFrame` | 157 |
| 1618 | `_makePuffTexture()` | 11 |
| 1629 | `_makeFlashTex()` | 22 |
| 1651 | `_makeFlashCoreTex()` | 10 |
| 1661 | `_input()` | 2 |
| 1663 | `_kd` | 37 |
| 1700 | `_ku` | 4 |
| 1704 | `_md` | 34 |
| 1738 | `_mu` | 7 |
| 1745 | `_mm` | 14 |
| 1759 | `_cc` | 1 |
| 1760 | `_blur` | 1 |
| 1761 | `_plc` | 14 |
| 1775 | `_requestLock()` | 23 |
| 1798 | `_travaAtalhos()` | 4 |
| 1802 | `_soltaAtalhos()` | 3 |
| 1805 | `_acceptInput()` | 8 |
| 1813 | `_pauseBackdrop()` | 7 |
| 1820 | `_radioShow()` | 6 |
| 1826 | `_radioUi()` | 8 |
| 1834 | `_radioPick()` | 14 |
| 1848 | `start()` | 4 |
| 1852 | `_startRound()` | 35 |
| 1887 | `_resetPositions()` | 248 |
| 2135 | `_checkCtfAlvo()` | 13 |
| 2148 | `_checkPace()` | 13 |
| 2161 | `_endRound()` | 37 |
| 2198 | `_fimDaPartida()` | 14 |
| 2212 | `_endMatch()` | 49 |
| 2261 | `_ensureDolly()` | 41 |
| 2302 | `_tickDolly()` | 23 |
| 2325 | `setPaused()` | 19 |
| 2344 | `_now()` | 3 |
| 2347 | `pauseArmed()` | 1 |
| 2348 | `_syncPauseArm()` | 7 |
| 2355 | `resume()` | 4 |
| 2359 | `applySettings()` | 6 |
| 2365 | `_applyQuality()` | 13 |
| 2378 | `onResize()` | 7 |
| 2385 | `_switchTeam()` | 44 |
| 2429 | `_applyVmVisibility()` | 5 |
| 2434 | `_switchWeapon()` | 30 |
| 2464 | `_deploySfx()` | 7 |
| 2471 | `_scope()` | 17 |
| 2488 | `_zoomFov()` | 8 |
| 2496 | `_reloading()` | 1 |
| 2497 | `_startReload()` | 19 |
| 2516 | `_reloadLayers()` | 18 |
| 2534 | `_installRecoil()` | 33 |
| 2567 | `_shotRecoil()` | 13 |
| 2580 | `_tryShoot()` | 83 |
| 2663 | `_meleeHit()` | 12 |
| 2675 | `_fireHitscan()` | 53 |
| 2728 | `_surfaceOf()` | 27 |
| 2755 | `_fleshImpact()` | 19 |
| 2774 | `_fxVoice()` | 9 |
| 2783 | `_impactSfx()` | 14 |
| 2797 | `_tintFx()` | 16 |
| 2813 | `_damage()` | 39 |
| 2852 | `_kill()` | 62 |
| 2914 | `_dmgArc()` | 77 |
| 2991 | `_mkBanner()` | 9 |
| 3000 | `_hitmarker()` | 15 |
| 3015 | `_dmgNumber()` | 20 |
| 3035 | `_feed()` | 19 |
| 3054 | `_skullIcon()` | 9 |
| 3063 | `_wpnIcon()` | 64 |
| 3127 | `_tracer()` | 24 |
| 3151 | `_puff()` | 39 |
| 3190 | `_holeDecalMat()` | 8 |
| 3198 | `_flash()` | 52 |
| 3250 | `_muzzleWorld()` | 9 |
| 3259 | `_updateDoors()` | 10 |
| 3269 | `_updateFx()` | 55 |
| 3324 | `_ejectCasing()` | 17 |
| 3341 | `_makeCtfFlagTex()` | 23 |
| 3364 | `_paintFlagSymbol()` | 9 |
| 3373 | `_flagTexFor()` | 26 |
| 3399 | `_legadoSimbolo()` | 8 |
| 3407 | `_loadCtfSymbols()` | 22 |
| 3429 | `_makeCtfZoneTex()` | 31 |
| 3460 | `_makeSmokeTex()` | 8 |
| 3468 | `_updateSmokeHud()` | 6 |
| 3474 | `_spawnGrenade()` | 11 |
| 3485 | `_throwSmoke()` | 8 |
| 3493 | `_throwFrag()` | 10 |
| 3503 | `_explodeFrag()` | 38 |
| 3541 | `_corDaFumaca()` | 15 |
| 3556 | `_popSmoke()` | 19 |
| 3575 | `_updateGrenades()` | 27 |
| 3602 | `_teamColor()` | 18 |
| 3620 | `_teamInk()` | 8 |
| 3628 | `_factionOf()` | 1 |
| 3629 | `_voiceKey()` | 1 |
| 3630 | `_teamName()` | 1 |
| 3631 | `_teamTag()` | 1 |
| 3632 | `_mirror()` | 3 |
| 3635 | `_botSeparation()` | 56 |
| 3691 | `_initCTF()` | 84 |
| 3775 | `_updateCTF()` | 56 |
| 3831 | `_ctfWin()` | 22 |
| 3853 | `_freeYaw()` | 25 |
| 3878 | `_pullString()` | 23 |
| 3901 | `_walkReach()` | 18 |
| 3919 | `_wpComp()` | 16 |
| 3935 | `_findPathLocal()` | 22 |
| 3957 | `_botCtf()` | 133 |
| 4090 | `_hideCtfHud()` | 6 |
| 4096 | `_updateCtfHud()` | 76 |
| 4172 | `_collide()` | 23 |
| 4195 | `_collideRot()` | 26 |
| 4221 | `_freeSpot()` | 30 |
| 4251 | `_retaAndavel()` | 20 |
| 4271 | `_walkDepth()` | 16 |
| 4287 | `_noteHit()` | 15 |
| 4302 | `_deathFeedback()` | 43 |
| 4345 | `_updatePlayer()` | 305 |
| 4650 | `_updatePickups()` | 146 |
| 4796 | `_wpnMode()` | 3 |
| 4799 | `_botWeapon()` | 10 |
| 4809 | `_pickupAllowed()` | 7 |
| 4816 | `_grabPickup()` | 34 |
| 4850 | `_assentarNoChao()` | 11 |
| 4861 | `_dropWeapon()` | 38 |
| 4899 | `_spawnY()` | 3 |
| 4902 | `_pickSpawn()` | 23 |
| 4925 | `_respawnPlayer()` | 18 |
| 4943 | `_losClear()` | 18 |
| 4961 | `_botCall()` | 37 |
| 4998 | `_teamMarkTex()` | 23 |
| 5021 | `_makeTeamMark()` | 14 |
| 5035 | `_updateTeamMark()` | 7 |
| 5042 | `_botEye()` | 1 |
| 5043 | `_enemyOf()` | 8 |
| 5051 | `_duelToken()` | 20 |
| 5071 | `_updateBot()` | 800 |
| 5871 | `_radarFoot()` | 38 |
| 5909 | `_updateRadar()` | 66 |
| 5975 | `_banner()` | 26 |
| 6001 | `_resultadoDaRodada()` | 4 |
| 6005 | `_showScoreboard()` | 44 |
| 6049 | `_updateHud()` | 58 |
| 6107 | `update()` | 61 |
| 6168 | `dispose()` | 36 |

</details>

## Validação dos ponteiros escritos à mão

Nenhum ponteiro `arquivo:linha` da prosa aponta para fora do arquivo. ✓

<!-- END:GERADO -->


Gerado no gauntlet de 31/07. Use para saber ONDE mexer e ONDE **não** mexer.

## Índice de `public/js/game.js` (3234 linhas)

| Linhas | Bloco |
|---|---|
| 13–45 | `WEAPONS` — tabela de stats (dmg/mag/rate/reload/spreadHip/spreadScope/recoil/auto/scope/pellets/range) |
| 46–57 | constantes de partida/bot (`ROUND_TIME=99`, `ROUNDS_TO_WIN=3`, `RESPAWN_DELAY=2.5`, `SPAWN_PROT=3`, `BOT_SPEED=3.3`, `BOT_VIEW=45`) |
| 58–65 | `STATIC_CLASS` (arma → classe de VM) |
| 66–106 | `SNIPER_VM` / `RIFLE_VM` / `PISTOL_VM` / `SHOTGUN_VM` (variantes visuais) |
| 107–137 | `vmFovForAspect()` 111, `staticVmKey()` 117, `DED_VM` 127, `vmPreloadClasses()` 131 |
| 141 | `VM_SHRINK = 0.72` |
| 143–156 | `BOT_SKILLS` / `rollBotSkill()` |
| 157–431 | constructor — cena/câmera 172-176, `_buildEnv()` 180, bots 235-274, **rig de luz do VM 276-300**, pools de FX 305-363, `_adsPose` 364-376, `_vmMuzzle` 377-390, CTF 403-412 |
| 432–454 | `_dom()` (refs do HUD) — **ZONA VERMELHA, append-only** |
| 455–473 | `_buildEnv()` — IBL/env map (gradiente → PMREM) |
| 474–882 | `_buildViewModels()` — mãos, `fixVmMaterials` 622, braços GLB 662-683, `_buildStaticVmClass` 692-856 (materiais 716-750, **`VM_FWD` 754-785**, gun-space/muzzle 786-832, attachments 834-855) |
| 883–925 | texturas de FX (`_makePuffTexture`, `_makeFlashTex`, `_makeFlashCoreTex`) |
| 926–1059 | input (teclado/mouse/sensibilidade/rádio) |
| 1060–1208 | rounds / spawn / placar (`_startRound` 1064, `_resetPositions` 1077, rack 1120-1148, `_endRound` 1154, `_endMatch` 1177) |
| 1259–1290 | `setPaused`/`applySettings`/**`_applyQuality()` 1276**/`onResize` |
| 1291–1396 | troca de time + lazy-load de VM (`_applyVmVisibility` 1335, `_ensureStaticVm` 1350) |
| 1397–1447 | `_switchWeapon` 1397, **`_scope()` 1412**, **`_zoomFov()` 1429**, `_startReload` 1438 |
| 1448–1505 | **`_tryShoot()`** (bloom de spread 1467, spread 1468, kick 1481-1487, flash 1489), `_meleeHit` 1494 |
| 1506–1537 | `_fireHitscan()` — raycast + headshot (1527) |
| 1538–1609 | `_damage()` 1538, `_kill()` 1573 |
| 1610–1743 | HUD de combate: `_hitmarker()` 1619, `_dmgNumber()` 1634, `_feed()` 1654, `_wpnIcon` 1680 |
| 1744–1840 | `_tracer()` 1744, `_puff()` 1766, **`_flash()` 1783**, `_muzzleWorld()` 1832 |
| 1841–1922 | `_updateFx()` 1851, `_ejectCasing()` 1906 |
| 1923–2085 | granadas / fumaça |
| 2113–2317 | CTF (`_initCTF` 2113, `_updateCTF` 2159, **`_findPathLocal()` A\* 2225**, `_botCtf` 2247) |
| 2318–2333 | `_collide()` |
| 2334–2512 | **`_updatePlayer()`** — crouch 2345, velmax 2349, accel 2357, atrito 2367, pulo 2379, gravidade 2381, olho 2408, **FOV/ADS 2422-2432**, crosshair 2436, kick/bob/sway 2461-2492, IK 2495 |
| 2513–2612 | pickups / loadout |
| 2613–2644 | respawn / LOS |
| 2645–3034 | **`_updateBot()`** — percepção 2679-2712, combate 2726-2830 (mira 2729, juke 2740, flanco 2770, granada 2783, **chance de acerto 2799**, dano 2814), CTF 2831, roam+A\* 2836-2960, stuck 2975 |
| 3035–3100 | radar |
| 3101–3165 | `_showScoreboard` 3113, **`_updateHud()` 3132** |
| 3166–3204 | **`update(dt)`** — loop principal — **ZONA VERMELHA, append-only** |

## Levers por frente

### GRÁFICOS
- renderer / tonemapping / exposição / sombras: `main.js:26–31` (ACESFilmic, exposure 1.06, PCFSoft)
- bloom + composite (AgX, CA, vinheta, grain): `main.js:33–40` → `bloom.js:14–118` (`COMPOSITE`), `bloom.js:119` (`enableLightBloom`)
- stylize/cel (`?style=1`): `stylize.js:49`
- qualidade (pixelRatio 2/1/0.75, sombras): `game.js:1276` (`_applyQuality`) — **duplicado** com `main.js:26–41`
- IBL/env map: `game.js:455–473` (`_buildEnv`, gradiente 16×128 hardcoded 460-463); VM usa em `game.js:275`
- rig de luz do viewmodel: `game.js:276–300` (key 3.2 / fill 0.8 / rim 0.25 / bounce 1.6 / hemi 0.85)
- luz+fog+céu por mapa: `map.js:268–292`, `map_brasilia.js:264–290`, `map_pool_day.js:1240–1265`, `map_havan.js:413–420`, `map_ferrovelho.js:470–530`
- shadow map 2048² em câmera de 160×160 m = **12,8 cm/texel** (`map_brasilia.js:279` etc.)
- texturas procedurais do mundo: `textures.js:53` (`initTextures`), helpers 4-52
- materiais do VM (metalness/roughness/envMapIntensity): `game.js:716–750`

### ARMAS
- stats: `game.js:13–45`; classe: `game.js:60–65`; heróis: `DED_VM` `game.js:127`
- framing: `VM_FWD` `game.js:754–785`, `VM_SHRINK` `game.js:141`, `VM_GUNSPACE`/`gunBasis`/`buildVmAttachment` `vmattach.js:9/40/49`
- ADS: `_scope` `game.js:1412`, `_zoomFov` `game.js:1429`, `_adsPose` `game.js:364`, interpolação `game.js:2422–2492`
- tiro: `_tryShoot` `game.js:1448`; recoil `RecoilAxis` `springs.js:34` + instância `game.js:859` + recuperação `game.js:2405`
- muzzle: `_flash` `game.js:1783`, pools 330-357, `_vmMuzzle` 377-390; tracers `_tracer` 1744
- feedback: `_hitmarker` `game.js:1619`, `_dmgNumber` 1634, CSS `style.css:195–217`
- som: `audio.js:230` (`_gunshot`), `:319` (`shotWeapon`); chamadas `game.js:1466` e `:2825`
- braços/IK: `fparms.js:149/251`, `ARM_MOUNTS` `game.js:670`; armas no mundo: `weapons.js:31–62`

### UI / MENU
- roteamento: `main.js:117–124` (`show`)
- menu CS: `index.astro:165–241` + `style.css:351–397`
- setup (nick/armas/mapa/bots): `index.astro:183–235` + `main.js:396–508` + `style.css:55–106,398–404`
- times: `index.astro:244–267` + `main.js:783–805` + `style.css:131–147`
- personagens: `index.astro:270–284` + `main.js:219–280` + `style.css:150–164`
- settings/ranking/howto: `index.astro:287–347` + `main.js:724–866`
- **HUD**: `index.astro:349–408` + `game.js:432–454`/`:3132` + `style.css:174–312`
- paleta/tema: `style.css:7–21` (`:root`)

### JOGABILIDADE
- bots: `BOT_SKILLS`/`rollBotSkill` `game.js:146/151`, visão `:48`, reação `:2708`, cadência `:2794`, chance de acerto `:2799`, dano `:2814`
- movimento: maxSp `:2349` (6.6 sprint / 4.7 andar), accel `:2357` (92/23), atrito `:2367` (7/11), pulo `:2379` (vel.y 5.0), gravidade `:2381` (20.6), crouch `:2345`, olho `:2408` (1.62 / -0.52)
- sensibilidade: `game.js:999`
- spawn/rack/respawn: `:1077`, `:1120–1148`, `:2613`
- rounds: `:46`, `:1064`, `:1154`, `:1177`; CTF `:2113–2317` (CAP=3 em `:2160`)
- **BUG/alavanca morta**: `settings.difficulty` é gravado no menu (`main.js:503–508`) mas **nunca lido** — dificuldade é 100% aleatória via `rollBotSkill()`

## Tabela de CONFLITO — quem pode mexer em quê

| Arquivo | Dono no gauntlet | Observação |
|---|---|---|
| `main.js:24–44` (renderer/qualidade) | GRÁFICOS-CORE | UI não toca |
| `main.js:110–160, 396–560, 724–880` (menus) | UI | gráficos não toca |
| `bloom.js`, `stylize.js`, `textures.js` | GRÁFICOS-CORE | exclusivo |
| `map_brasilia.js` | MAPA-BRASILIA | exclusivo |
| `map_pool_day.js` | MAPA-POOL | exclusivo |
| `map_havan.js` | MAPA-HAVAN | exclusivo |
| `map_ferrovelho.js` | MAPA-FERRO | exclusivo |
| `map.js` | GRÁFICOS-CORE | mapa legado |
| `weapons.js`, `vmattach.js`, `springs.js`, `fparms.js` | ARMAS | exclusivo |
| `audio.js` | ARMAS (`_gunshot`/`shotWeapon`) | resto intocado |
| `style.css` linhas 1–172 e 315–460 | UI-MENU | fronteira na l.173 |
| `style.css` linhas 174–312 | UI-HUD | mesma pessoa que UI-MENU nesta rodada |
| `index.astro` 126–347 | UI-MENU | fronteira na l.348 |
| `index.astro` 349–408 | UI-HUD | idem |
| `glbchars.js`, `characters.js` | JOGABILIDADE | materiais de char = combinar antes |

### `game.js` — partição obrigatória (use **só** a ferramenta Edit, NUNCA Write)

| Ranges | Dono |
|---|---|
| 180, 275–300, 455–473, 716–750, 1276–1283 | GRÁFICOS-CORE |
| 13–45, 58–141, 364–390, 474–715, 751–882, 1397–1505, 1506–1537, 1744–1840, 1906–1922 | ARMAS |
| 46–57, 143–156, 199–274, 1060–1208, 2318–2512(**≤2409**), 2513–2644, 2645–3034 | JOGABILIDADE |
| 1538–1743, 3035–3165 | UI (HUD/feedback) |
| 432–454 e 3166–3204 | **ninguém reescreve** — só append de 1-2 linhas quando inevitável |

Zonas de atrito conhecidas: `_tryShoot` (armas+gráficos+áudio), `_updatePlayer` (cortar em 2409), `_buildViewModels:716–750` (materiais compartilhados), cluster `_damage/_kill/_hitmarker/_feed`.
