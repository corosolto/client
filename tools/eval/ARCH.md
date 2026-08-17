# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.83 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6863 | 245 |
| `public/js/main.js` | 2111 | 188 |
| `public/js/glbchars.js` | 1034 | 68 |
| `public/js/characters.js` | 1236 | 43 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 365 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3065 linhas (45% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 799 | 5560 | `_updateBot()` | ⚠️ candidato a extração |
| 546 | 622 | `constructor()` | 🔴 append-only |
| 362 | 4767 | `_updatePlayer()` | ⚠️ candidato a extração |
| 249 | 2051 | `_resetPositions()` |  |
| 241 | 1257 | `_buildViewModels()` |  |
| 146 | 5129 | `_updatePickups()` |  |
| 133 | 4237 | `_botCtf()` |  |
| 84 | 3968 | `_initCTF()` |  |
| 83 | 2828 | `_tryShoot()` |  |
| 77 | 3191 | `_dmgArc()` |  |
| 76 | 4376 | `_updateCtfHud()` |  |
| 71 | 6372 | `_updateBotNN()` |  |
| 68 | 6758 | `update()` | 🔴 append-only |
| 66 | 6526 | `_updateRadar()` |  |
| 64 | 3340 | `_wpnIcon()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `30–78` `382–382` `411–505` `532–553` `1257–1655` `2595–2600` `2682–2763` `2782–2976` `3404–3428` `3476–3538` `3605–3621` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `193–196` `247–247` `273–284` `595–606` `3062–3160` `3912–3967` `4133–4369` `4452–4474` `4767–5128` `5432–5449` `5531–6358` | — |
| **MAPAS / MUNDO** | `1203–1256` `2051–2299` `3968–4110` `5129–5274` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1656–1698` `2531–2543` `3429–3467` `3549–3604` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1168–1202` `2491–2509` `2525–2530` `2544–2550` `3191–3403` `6526–6591` `6622–6665` `6699–6757` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6758–6825 · `_dom()` 1168–1202 · `constructor()` 622–1167

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3763 de 6863 linhas (55%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 30 | `WEAPONS` | 49 |
| 81 | `VMLAB` | 8 |
| 89 | `VM_MAT_LEGACY` | 4 |
| 93 | `ROUND_TIME` | 8 |
| 101 | `ROUNDS_MAX` | 28 |
| 132 | `CTF_CLOCK_SHOW` | 4 |
| 136 | `KILLS_PER_PLAYER` | 7 |
| 143 | `PACE` | 33 |
| 176 | `PAUSE_ARM_MS` | 9 |
| 186 | `confirmGate` | 7 |
| 197 | `BOT_AIM_PITCH` | 4 |
| 201 | `BOT_DMG_PLAYER` | 21 |
| 222 | `BOT_FAIR` | 5 |
| 227 | `BOT_MOVE2` | 15 |
| 251 | `BOT_FOCUS_MIN` | 22 |
| 277 | `BOT_TOKEN_REST` | 7 |
| 285 | `MOVE_MUL` | 6 |
| 292 | `MOVE2` | 4 |
| 296 | `STEP_H` | 32 |
| 332 | `MANTLE_APOIO` | 4 |
| 336 | `MANTLE_GRID` | 5 |
| 341 | `RACK_OLD` | 4 |
| 345 | `RACK_RETA` | 25 |
| 371 | `RADIO` | 5 |
| 377 | `MK_LABELS` | 5 |
| 384 | `D2R` | 4 |
| 388 | `DMG_FALLOFF` | 5 |
| 393 | `HS_MUL` | 3 |
| 396 | `BALL_CLASS` | 15 |
| 411 | `STATIC_CLASS` | 75 |
| 487 | `VM_KNOB` | 19 |
| 508 | `vmFovForAspect` | 24 |
| 532 | `VM_OFF` | 22 |
| 554 | `vmOffY` | 35 |
| 589 | `VMP` | 6 |
| 595 | `BOT_SKILLS` | 11 |
| 607 | `diffKey` | 4 |
| 612 | `rollBotSkill` | 7 |
| 622 | `constructor()` | 546 |
| 1168 | `_dom()` | 35 |
| 1203 | `_buildEnv()` | 54 |
| 1257 | `_buildViewModels()` | 241 |
| 1498 | `_vmFrame` | 158 |
| 1656 | `_makePuffTexture()` | 11 |
| 1667 | `_makeFlashTex()` | 22 |
| 1689 | `_makeFlashCoreTex()` | 10 |
| 1699 | `_input()` | 2 |
| 1701 | `_kd` | 37 |
| 1738 | `_ku` | 4 |
| 1742 | `_md` | 34 |
| 1776 | `_mu` | 7 |
| 1783 | `_mm` | 14 |
| 1797 | `_cc` | 1 |
| 1798 | `_blur` | 1 |
| 1799 | `_plc` | 14 |
| 1813 | `_requestLock()` | 23 |
| 1836 | `_travaAtalhos()` | 4 |
| 1840 | `_soltaAtalhos()` | 3 |
| 1843 | `_acceptInput()` | 8 |
| 1851 | `_pauseBackdrop()` | 7 |
| 1858 | `_radioShow()` | 6 |
| 1864 | `_radioUi()` | 8 |
| 1872 | `_radioPick()` | 20 |
| 1892 | `_abilityNotice()` | 10 |
| 1902 | `_resetSliceAbilities()` | 9 |
| 1911 | `_stackTrace()` | 28 |
| 1939 | `_updateMotocaCharge()` | 10 |
| 1949 | `_recordRoutePoint()` | 11 |
| 1960 | `_routePing()` | 23 |
| 1983 | `_tickRoutePings()` | 12 |
| 1995 | `_objectiveInteractionMultiplier()` | 14 |
| 2009 | `start()` | 4 |
| 2013 | `_startRound()` | 38 |
| 2051 | `_resetPositions()` | 249 |
| 2300 | `_checkCtfAlvo()` | 13 |
| 2313 | `_checkPace()` | 13 |
| 2326 | `_endRound()` | 37 |
| 2363 | `_fimDaPartida()` | 14 |
| 2377 | `_endMatch()` | 50 |
| 2427 | `_ensureDolly()` | 41 |
| 2468 | `_tickDolly()` | 23 |
| 2491 | `setPaused()` | 19 |
| 2510 | `_now()` | 3 |
| 2513 | `pauseArmed()` | 1 |
| 2514 | `_syncPauseArm()` | 7 |
| 2521 | `resume()` | 4 |
| 2525 | `applySettings()` | 6 |
| 2531 | `_applyQuality()` | 13 |
| 2544 | `onResize()` | 7 |
| 2551 | `_switchTeam()` | 44 |
| 2595 | `_applyVmVisibility()` | 6 |
| 2601 | `_vmlabEnsure()` | 14 |
| 2615 | `_vmlabFrame()` | 28 |
| 2643 | `_tuneGet()` | 15 |
| 2658 | `_tune()` | 23 |
| 2681 | `_fxSet()` | 1 |
| 2682 | `_switchWeapon()` | 30 |
| 2712 | `_deploySfx()` | 7 |
| 2719 | `_scope()` | 17 |
| 2736 | `_zoomFov()` | 8 |
| 2744 | `_reloading()` | 1 |
| 2745 | `_startReload()` | 19 |
| 2764 | `_reloadLayers()` | 18 |
| 2782 | `_installRecoil()` | 33 |
| 2815 | `_shotRecoil()` | 13 |
| 2828 | `_tryShoot()` | 83 |
| 2911 | `_meleeHit()` | 12 |
| 2923 | `_fireHitscan()` | 54 |
| 2977 | `_surfaceOf()` | 27 |
| 3004 | `_fleshImpact()` | 19 |
| 3023 | `_fxVoice()` | 9 |
| 3032 | `_impactSfx()` | 14 |
| 3046 | `_tintFx()` | 16 |
| 3062 | `_damage()` | 40 |
| 3102 | `_kill()` | 59 |
| 3161 | `_checkArenaWin()` | 30 |
| 3191 | `_dmgArc()` | 77 |
| 3268 | `_mkBanner()` | 9 |
| 3277 | `_hitmarker()` | 15 |
| 3292 | `_dmgNumber()` | 20 |
| 3312 | `_feed()` | 19 |
| 3331 | `_skullIcon()` | 9 |
| 3340 | `_wpnIcon()` | 64 |
| 3404 | `_tracer()` | 25 |
| 3429 | `_puff()` | 39 |
| 3468 | `_holeDecalMat()` | 8 |
| 3476 | `_flash()` | 54 |
| 3530 | `_muzzleWorld()` | 9 |
| 3539 | `_updateDoors()` | 10 |
| 3549 | `_updateFx()` | 56 |
| 3605 | `_ejectCasing()` | 17 |
| 3622 | `_makeCtfFlagTex()` | 23 |
| 3645 | `_paintFlagSymbol()` | 9 |
| 3654 | `_flagTexFor()` | 26 |
| 3680 | `_legadoSimbolo()` | 8 |
| 3688 | `_loadCtfSymbols()` | 22 |
| 3710 | `_makeCtfZoneTex()` | 31 |
| 3741 | `_makeSmokeTex()` | 8 |
| 3749 | `_updateSmokeHud()` | 6 |
| 3755 | `_spawnGrenade()` | 11 |
| 3766 | `_throwSmoke()` | 8 |
| 3774 | `_throwFrag()` | 10 |
| 3784 | `_explodeFrag()` | 38 |
| 3822 | `_corDaFumaca()` | 15 |
| 3837 | `_popSmoke()` | 19 |
| 3856 | `_updateGrenades()` | 27 |
| 3883 | `_teamColor()` | 15 |
| 3898 | `_teamInk()` | 7 |
| 3905 | `_factionOf()` | 1 |
| 3906 | `_voiceKey()` | 1 |
| 3907 | `_teamName()` | 1 |
| 3908 | `_teamTag()` | 1 |
| 3909 | `_mirror()` | 3 |
| 3912 | `_botSeparation()` | 56 |
| 3968 | `_initCTF()` | 84 |
| 4052 | `_updateCTF()` | 59 |
| 4111 | `_ctfWin()` | 22 |
| 4133 | `_freeYaw()` | 25 |
| 4158 | `_pullString()` | 23 |
| 4181 | `_walkReach()` | 18 |
| 4199 | `_wpComp()` | 16 |
| 4215 | `_findPathLocal()` | 22 |
| 4237 | `_botCtf()` | 133 |
| 4370 | `_hideCtfHud()` | 6 |
| 4376 | `_updateCtfHud()` | 76 |
| 4452 | `_collide()` | 23 |
| 4475 | `_collideRot()` | 52 |
| 4527 | `_mantleAlcance()` | 58 |
| 4585 | `_mantleAlcancavel()` | 23 |
| 4608 | `_mantleTarget()` | 35 |
| 4643 | `_freeSpot()` | 30 |
| 4673 | `_retaAndavel()` | 20 |
| 4693 | `_walkDepth()` | 16 |
| 4709 | `_noteHit()` | 15 |
| 4724 | `_deathFeedback()` | 43 |
| 4767 | `_updatePlayer()` | 362 |
| 5129 | `_updatePickups()` | 146 |
| 5275 | `_wpnMode()` | 3 |
| 5278 | `_botWeapon()` | 10 |
| 5288 | `_pickupAllowed()` | 7 |
| 5295 | `_grabPickup()` | 34 |
| 5329 | `_assentarNoChao()` | 11 |
| 5340 | `_dropWeapon()` | 38 |
| 5378 | `_spawnY()` | 3 |
| 5381 | `_spawnYaw()` | 5 |
| 5386 | `_pickSpawn()` | 23 |
| 5409 | `_respawnPlayer()` | 23 |
| 5432 | `_losClear()` | 18 |
| 5450 | `_botCall()` | 37 |
| 5487 | `_teamMarkTex()` | 23 |
| 5510 | `_makeTeamMark()` | 14 |
| 5524 | `_updateTeamMark()` | 7 |
| 5531 | `_botEye()` | 1 |
| 5532 | `_enemyOf()` | 8 |
| 5540 | `_duelToken()` | 20 |
| 5560 | `_updateBot()` | 799 |
| 6359 | `_flushTraining()` | 13 |
| 6372 | `_updateBotNN()` | 71 |
| 6443 | `_botShootNN()` | 45 |
| 6488 | `_radarFoot()` | 38 |
| 6526 | `_updateRadar()` | 66 |
| 6592 | `_banner()` | 26 |
| 6618 | `_resultadoDaRodada()` | 4 |
| 6622 | `_showScoreboard()` | 44 |
| 6666 | `_updateWeaponHud()` | 33 |
| 6699 | `_updateHud()` | 59 |
| 6758 | `update()` | 68 |
| 6826 | `dispose()` | 37 |

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
