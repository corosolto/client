# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.79 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6614 | 234 |
| `public/js/main.js` | 2106 | 188 |
| `public/js/glbchars.js` | 936 | 68 |
| `public/js/characters.js` | 1127 | 41 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 350 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3017 linhas (46% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 799 | 5314 | `_updateBot()` | ⚠️ candidato a extração |
| 546 | 570 | `constructor()` | 🔴 append-only |
| 315 | 4568 | `_updatePlayer()` | ⚠️ candidato a extração |
| 249 | 1999 | `_resetPositions()` |  |
| 241 | 1205 | `_buildViewModels()` |  |
| 146 | 4883 | `_updatePickups()` |  |
| 133 | 4180 | `_botCtf()` |  |
| 84 | 3911 | `_initCTF()` |  |
| 83 | 2776 | `_tryShoot()` |  |
| 77 | 3138 | `_dmgArc()` |  |
| 76 | 4319 | `_updateCtfHud()` |  |
| 71 | 6126 | `_updateBotNN()` |  |
| 67 | 6511 | `update()` | 🔴 append-only |
| 66 | 6279 | `_updateRadar()` |  |
| 64 | 3287 | `_wpnIcon()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `23–71` `331–331` `359–453` `480–501` `1205–1603` `2543–2548` `2630–2711` `2730–2923` `3351–3374` `3422–3484` `3551–3567` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `186–189` `240–240` `266–277` `543–554` `3009–3107` `3855–3910` `4076–4312` `4395–4417` `4568–4882` `5186–5203` `5285–6112` | — |
| **MAPAS / MUNDO** | `1151–1204` `1999–2247` `3911–4053` `4883–5028` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1604–1646` `2479–2491` `3375–3413` `3495–3550` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1116–1150` `2439–2457` `2473–2478` `2492–2498` `3138–3350` `6279–6344` `6375–6418` `6452–6510` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6511–6577 · `_dom()` 1116–1150 · `constructor()` 570–1115

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3714 de 6614 linhas (56%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 23 | `WEAPONS` | 49 |
| 74 | `VMLAB` | 8 |
| 82 | `VM_MAT_LEGACY` | 4 |
| 86 | `ROUND_TIME` | 8 |
| 94 | `ROUNDS_MAX` | 28 |
| 125 | `CTF_CLOCK_SHOW` | 4 |
| 129 | `KILLS_PER_PLAYER` | 7 |
| 136 | `PACE` | 33 |
| 169 | `PAUSE_ARM_MS` | 9 |
| 179 | `confirmGate` | 7 |
| 190 | `BOT_AIM_PITCH` | 4 |
| 194 | `BOT_DMG_PLAYER` | 21 |
| 215 | `BOT_FAIR` | 5 |
| 220 | `BOT_MOVE2` | 15 |
| 244 | `BOT_FOCUS_MIN` | 22 |
| 270 | `BOT_TOKEN_REST` | 7 |
| 278 | `MOVE_MUL` | 6 |
| 285 | `MOVE2` | 5 |
| 290 | `RACK_OLD` | 4 |
| 294 | `RACK_RETA` | 25 |
| 320 | `RADIO` | 5 |
| 326 | `MK_LABELS` | 5 |
| 332 | `D2R` | 4 |
| 336 | `DMG_FALLOFF` | 5 |
| 341 | `HS_MUL` | 3 |
| 344 | `BALL_CLASS` | 15 |
| 359 | `STATIC_CLASS` | 75 |
| 435 | `VM_KNOB` | 19 |
| 456 | `vmFovForAspect` | 24 |
| 480 | `VM_OFF` | 22 |
| 502 | `vmOffY` | 35 |
| 537 | `VMP` | 6 |
| 543 | `BOT_SKILLS` | 11 |
| 555 | `diffKey` | 4 |
| 560 | `rollBotSkill` | 7 |
| 570 | `constructor()` | 546 |
| 1116 | `_dom()` | 35 |
| 1151 | `_buildEnv()` | 54 |
| 1205 | `_buildViewModels()` | 241 |
| 1446 | `_vmFrame` | 158 |
| 1604 | `_makePuffTexture()` | 11 |
| 1615 | `_makeFlashTex()` | 22 |
| 1637 | `_makeFlashCoreTex()` | 10 |
| 1647 | `_input()` | 2 |
| 1649 | `_kd` | 37 |
| 1686 | `_ku` | 4 |
| 1690 | `_md` | 34 |
| 1724 | `_mu` | 7 |
| 1731 | `_mm` | 14 |
| 1745 | `_cc` | 1 |
| 1746 | `_blur` | 1 |
| 1747 | `_plc` | 14 |
| 1761 | `_requestLock()` | 23 |
| 1784 | `_travaAtalhos()` | 4 |
| 1788 | `_soltaAtalhos()` | 3 |
| 1791 | `_acceptInput()` | 8 |
| 1799 | `_pauseBackdrop()` | 7 |
| 1806 | `_radioShow()` | 6 |
| 1812 | `_radioUi()` | 8 |
| 1820 | `_radioPick()` | 20 |
| 1840 | `_abilityNotice()` | 10 |
| 1850 | `_resetSliceAbilities()` | 9 |
| 1859 | `_stackTrace()` | 28 |
| 1887 | `_updateMotocaCharge()` | 10 |
| 1897 | `_recordRoutePoint()` | 11 |
| 1908 | `_routePing()` | 23 |
| 1931 | `_tickRoutePings()` | 12 |
| 1943 | `_objectiveInteractionMultiplier()` | 14 |
| 1957 | `start()` | 4 |
| 1961 | `_startRound()` | 38 |
| 1999 | `_resetPositions()` | 249 |
| 2248 | `_checkCtfAlvo()` | 13 |
| 2261 | `_checkPace()` | 13 |
| 2274 | `_endRound()` | 37 |
| 2311 | `_fimDaPartida()` | 14 |
| 2325 | `_endMatch()` | 50 |
| 2375 | `_ensureDolly()` | 41 |
| 2416 | `_tickDolly()` | 23 |
| 2439 | `setPaused()` | 19 |
| 2458 | `_now()` | 3 |
| 2461 | `pauseArmed()` | 1 |
| 2462 | `_syncPauseArm()` | 7 |
| 2469 | `resume()` | 4 |
| 2473 | `applySettings()` | 6 |
| 2479 | `_applyQuality()` | 13 |
| 2492 | `onResize()` | 7 |
| 2499 | `_switchTeam()` | 44 |
| 2543 | `_applyVmVisibility()` | 6 |
| 2549 | `_vmlabEnsure()` | 14 |
| 2563 | `_vmlabFrame()` | 28 |
| 2591 | `_tuneGet()` | 15 |
| 2606 | `_tune()` | 23 |
| 2629 | `_fxSet()` | 1 |
| 2630 | `_switchWeapon()` | 30 |
| 2660 | `_deploySfx()` | 7 |
| 2667 | `_scope()` | 17 |
| 2684 | `_zoomFov()` | 8 |
| 2692 | `_reloading()` | 1 |
| 2693 | `_startReload()` | 19 |
| 2712 | `_reloadLayers()` | 18 |
| 2730 | `_installRecoil()` | 33 |
| 2763 | `_shotRecoil()` | 13 |
| 2776 | `_tryShoot()` | 83 |
| 2859 | `_meleeHit()` | 12 |
| 2871 | `_fireHitscan()` | 53 |
| 2924 | `_surfaceOf()` | 27 |
| 2951 | `_fleshImpact()` | 19 |
| 2970 | `_fxVoice()` | 9 |
| 2979 | `_impactSfx()` | 14 |
| 2993 | `_tintFx()` | 16 |
| 3009 | `_damage()` | 40 |
| 3049 | `_kill()` | 59 |
| 3108 | `_checkArenaWin()` | 30 |
| 3138 | `_dmgArc()` | 77 |
| 3215 | `_mkBanner()` | 9 |
| 3224 | `_hitmarker()` | 15 |
| 3239 | `_dmgNumber()` | 20 |
| 3259 | `_feed()` | 19 |
| 3278 | `_skullIcon()` | 9 |
| 3287 | `_wpnIcon()` | 64 |
| 3351 | `_tracer()` | 24 |
| 3375 | `_puff()` | 39 |
| 3414 | `_holeDecalMat()` | 8 |
| 3422 | `_flash()` | 54 |
| 3476 | `_muzzleWorld()` | 9 |
| 3485 | `_updateDoors()` | 10 |
| 3495 | `_updateFx()` | 56 |
| 3551 | `_ejectCasing()` | 17 |
| 3568 | `_makeCtfFlagTex()` | 23 |
| 3591 | `_paintFlagSymbol()` | 9 |
| 3600 | `_flagTexFor()` | 26 |
| 3626 | `_legadoSimbolo()` | 8 |
| 3634 | `_loadCtfSymbols()` | 22 |
| 3656 | `_makeCtfZoneTex()` | 31 |
| 3687 | `_makeSmokeTex()` | 8 |
| 3695 | `_updateSmokeHud()` | 6 |
| 3701 | `_spawnGrenade()` | 11 |
| 3712 | `_throwSmoke()` | 8 |
| 3720 | `_throwFrag()` | 10 |
| 3730 | `_explodeFrag()` | 38 |
| 3768 | `_corDaFumaca()` | 15 |
| 3783 | `_popSmoke()` | 19 |
| 3802 | `_updateGrenades()` | 27 |
| 3829 | `_teamColor()` | 12 |
| 3841 | `_teamInk()` | 7 |
| 3848 | `_factionOf()` | 1 |
| 3849 | `_voiceKey()` | 1 |
| 3850 | `_teamName()` | 1 |
| 3851 | `_teamTag()` | 1 |
| 3852 | `_mirror()` | 3 |
| 3855 | `_botSeparation()` | 56 |
| 3911 | `_initCTF()` | 84 |
| 3995 | `_updateCTF()` | 59 |
| 4054 | `_ctfWin()` | 22 |
| 4076 | `_freeYaw()` | 25 |
| 4101 | `_pullString()` | 23 |
| 4124 | `_walkReach()` | 18 |
| 4142 | `_wpComp()` | 16 |
| 4158 | `_findPathLocal()` | 22 |
| 4180 | `_botCtf()` | 133 |
| 4313 | `_hideCtfHud()` | 6 |
| 4319 | `_updateCtfHud()` | 76 |
| 4395 | `_collide()` | 23 |
| 4418 | `_collideRot()` | 26 |
| 4444 | `_freeSpot()` | 30 |
| 4474 | `_retaAndavel()` | 20 |
| 4494 | `_walkDepth()` | 16 |
| 4510 | `_noteHit()` | 15 |
| 4525 | `_deathFeedback()` | 43 |
| 4568 | `_updatePlayer()` | 315 |
| 4883 | `_updatePickups()` | 146 |
| 5029 | `_wpnMode()` | 3 |
| 5032 | `_botWeapon()` | 10 |
| 5042 | `_pickupAllowed()` | 7 |
| 5049 | `_grabPickup()` | 34 |
| 5083 | `_assentarNoChao()` | 11 |
| 5094 | `_dropWeapon()` | 38 |
| 5132 | `_spawnY()` | 3 |
| 5135 | `_spawnYaw()` | 5 |
| 5140 | `_pickSpawn()` | 23 |
| 5163 | `_respawnPlayer()` | 23 |
| 5186 | `_losClear()` | 18 |
| 5204 | `_botCall()` | 37 |
| 5241 | `_teamMarkTex()` | 23 |
| 5264 | `_makeTeamMark()` | 14 |
| 5278 | `_updateTeamMark()` | 7 |
| 5285 | `_botEye()` | 1 |
| 5286 | `_enemyOf()` | 8 |
| 5294 | `_duelToken()` | 20 |
| 5314 | `_updateBot()` | 799 |
| 6113 | `_flushTraining()` | 13 |
| 6126 | `_updateBotNN()` | 71 |
| 6197 | `_botShootNN()` | 44 |
| 6241 | `_radarFoot()` | 38 |
| 6279 | `_updateRadar()` | 66 |
| 6345 | `_banner()` | 26 |
| 6371 | `_resultadoDaRodada()` | 4 |
| 6375 | `_showScoreboard()` | 44 |
| 6419 | `_updateWeaponHud()` | 33 |
| 6452 | `_updateHud()` | 59 |
| 6511 | `update()` | 67 |
| 6578 | `dispose()` | 36 |

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
