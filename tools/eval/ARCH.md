# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.262 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8045 | 307 |
| `public/js/main.js` | 3597 | 291 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 635 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3244 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6648 | `_updateBot()` | ⚠️ candidato a extração |
| 623 | 654 | `constructor()` | 🔴 append-only |
| 276 | 5819 | `_updatePlayer()` |  |
| 262 | 1375 | `_buildViewModels()` |  |
| 255 | 2481 | `_resetPositions()` |  |
| 148 | 6108 | `_updatePickups()` |  |
| 137 | 5121 | `_botCtf()` |  |
| 116 | 2082 | `_touchControls()` |  |
| 99 | 5720 | `_moveEntity()` |  |
| 90 | 7905 | `update()` | 🔴 append-only |
| 87 | 7818 | `_updateHud()` |  |
| 86 | 4833 | `_initCTF()` |  |
| 85 | 3456 | `_tryShoot()` |  |
| 79 | 3110 | `_ensureVmPrecisionQa()` |  |
| 79 | 3953 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `330–333` `398–492` `519–540` `1375–1777` `3076–3109` `3297–3391` `3410–3540` `3555–3570` `3615–3668` `4181–4205` `4253–4342` `4415–4431` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `169–172` `223–223` `249–260` `582–593` `3808–3922` `4772–4832` `5003–5257` `5340–5362` `5819–6094` `6469–6486` `6596–6626` `6648–7469` | — |
| **MAPAS / MUNDO** | `1321–1374` `2481–2735` `4833–4979` `6108–6255` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1792–1801` `1916–1947` `2984–2996` `4206–4244` `4358–4414` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1277–1320` `2940–2962` `2978–2983` `2997–3013` `3953–4031` `4048–4101` `4117–4180` `7640–7703` `7734–7782` `7818–7904` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7905–7994 · `_dom()` 1277–1320 · `constructor()` 654–1276

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3835 de 8045 linhas (48%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 46 | `ANNOUNCER_LAB` | 4 |
| 50 | `VMLAB` | 3 |
| 56 | `VM_QA_ADS` | 8 |
| 64 | `VM_MAT_LEGACY` | 4 |
| 70 | `DROP_TTL` | 8 |
| 78 | `ROUNDS_MAX` | 27 |
| 108 | `CTF_CLOCK_SHOW` | 4 |
| 112 | `KILLS_PER_PLAYER` | 7 |
| 119 | `PACE` | 33 |
| 152 | `PAUSE_ARM_MS` | 9 |
| 162 | `confirmGate` | 7 |
| 173 | `BOT_AIM_PITCH` | 4 |
| 177 | `BOT_DMG_PLAYER` | 21 |
| 198 | `BOT_FAIR` | 5 |
| 203 | `BOT_MOVE2` | 15 |
| 227 | `BOT_FOCUS_MIN` | 22 |
| 253 | `BOT_TOKEN_REST` | 7 |
| 261 | `MOVE_MUL` | 6 |
| 268 | `MOVE2` | 4 |
| 272 | `STEP_H` | 3 |
| 279 | `MANTLE_APOIO` | 4 |
| 283 | `MANTLE_GRID` | 5 |
| 288 | `RACK_OLD` | 4 |
| 292 | `RACK_RETA` | 25 |
| 319 | `RADIO` | 5 |
| 325 | `MK_LABELS` | 5 |
| 330 | `GUNFEEL` | 4 |
| 336 | `TRACER_STYLE` | 6 |
| 347 | `coneDoDisparo` | 23 |
| 371 | `D2R` | 4 |
| 375 | `DMG_FALLOFF` | 5 |
| 380 | `HS_MUL` | 3 |
| 383 | `BALL_CLASS` | 15 |
| 398 | `STATIC_CLASS` | 75 |
| 474 | `VM_KNOB` | 19 |
| 495 | `vmFovForAspect` | 24 |
| 519 | `VM_OFF` | 22 |
| 541 | `vmOffY` | 35 |
| 576 | `VMP` | 6 |
| 582 | `BOT_SKILLS` | 11 |
| 594 | `diffKey` | 4 |
| 599 | `rollBotSkill` | 7 |
| 606 | `botTier` | 4 |
| 610 | `_cyclePool` | 4 |
| 614 | `_rosterPool` | 15 |
| 629 | `pickMatchRoster` | 12 |
| 641 | `BOT_WEAPON_POOL` | 5 |
| 646 | `pickMatchWeapons` | 7 |
| 654 | `constructor()` | 623 |
| 1277 | `_dom()` | 44 |
| 1321 | `_buildEnv()` | 54 |
| 1375 | `_buildViewModels()` | 262 |
| 1637 | `_vmFrame` | 141 |
| 1778 | `_vmMontarTardio` | 14 |
| 1792 | `_makePuffTexture()` | 10 |
| 1802 | `_makeBloodTex()` | 19 |
| 1821 | `_makeBloodPoolTex()` | 21 |
| 1842 | `_bloodDecal()` | 16 |
| 1858 | `_makeBloodFx()` | 20 |
| 1878 | `_bloodSpatter()` | 18 |
| 1896 | `_bloodPoolAt()` | 6 |
| 1902 | `_updateBlood()` | 14 |
| 1916 | `_makeFlashTex()` | 22 |
| 1938 | `_makeFlashCoreTex()` | 10 |
| 1948 | `_input()` | 2 |
| 1950 | `_kd` | 49 |
| 1999 | `_ku` | 4 |
| 2003 | `_md` | 38 |
| 2041 | `_mu` | 7 |
| 2048 | `_mm` | 15 |
| 2063 | `_cc` | 1 |
| 2064 | `_blur` | 1 |
| 2065 | `_plc` | 17 |
| 2082 | `_touchControls()` | 116 |
| 2198 | `_aimAssist()` | 28 |
| 2226 | `_requestLock()` | 27 |
| 2253 | `_travaAtalhos()` | 4 |
| 2257 | `_soltaAtalhos()` | 5 |
| 2262 | `espectando()` | 2 |
| 2264 | `_acceptInput()` | 8 |
| 2272 | `_pauseBackdrop()` | 7 |
| 2279 | `_radioShow()` | 6 |
| 2285 | `_radioUi()` | 8 |
| 2293 | `_radioPick()` | 19 |
| 2312 | `_abilityNotice()` | 10 |
| 2322 | `_resetSliceAbilities()` | 9 |
| 2331 | `_stackTrace()` | 28 |
| 2359 | `_updateMotocaCharge()` | 10 |
| 2369 | `_recordRoutePoint()` | 11 |
| 2380 | `_routePing()` | 23 |
| 2403 | `_tickRoutePings()` | 12 |
| 2415 | `_objectiveInteractionMultiplier()` | 14 |
| 2429 | `start()` | 5 |
| 2434 | `_startAnnouncerLab()` | 9 |
| 2443 | `_startRound()` | 38 |
| 2481 | `_resetPositions()` | 255 |
| 2736 | `_checkCtfAlvo()` | 13 |
| 2749 | `_checkPace()` | 13 |
| 2762 | `_endRound()` | 34 |
| 2796 | `_roundWinnerVoice()` | 12 |
| 2808 | `_fimDaPartida()` | 7 |
| 2815 | `_endMatch()` | 61 |
| 2876 | `_ensureDolly()` | 41 |
| 2917 | `_tickDolly()` | 23 |
| 2940 | `setPaused()` | 23 |
| 2963 | `_now()` | 3 |
| 2966 | `pauseArmed()` | 1 |
| 2967 | `_syncPauseArm()` | 7 |
| 2974 | `resume()` | 4 |
| 2978 | `applySettings()` | 6 |
| 2984 | `_applyQuality()` | 13 |
| 2997 | `onResize()` | 17 |
| 3014 | `_switchTeam()` | 62 |
| 3076 | `_applyVmVisibility()` | 34 |
| 3110 | `_ensureVmPrecisionQa()` | 79 |
| 3189 | `_syncVmPresentation()` | 19 |
| 3208 | `_vmlabEnsure()` | 14 |
| 3222 | `_vmlabFrame()` | 28 |
| 3250 | `_tuneGet()` | 15 |
| 3265 | `_tune()` | 23 |
| 3288 | `_fxSet()` | 2 |
| 3290 | `_qaCicloArma()` | 7 |
| 3297 | `_switchWeapon()` | 39 |
| 3336 | `_deploySfx()` | 7 |
| 3343 | `_scope()` | 17 |
| 3360 | `_zoomFov()` | 8 |
| 3368 | `_reloading()` | 1 |
| 3369 | `_startReload()` | 23 |
| 3392 | `_reloadLayers()` | 18 |
| 3410 | `_installRecoil()` | 33 |
| 3443 | `_shotRecoil()` | 13 |
| 3456 | `_tryShoot()` | 85 |
| 3541 | `_tryKnifeAttack()` | 14 |
| 3555 | `_meleeHit()` | 16 |
| 3571 | `_meleeRange()` | 5 |
| 3576 | `_botMelee()` | 28 |
| 3604 | `_shotDamage()` | 11 |
| 3615 | `_fireHitscan()` | 54 |
| 3669 | `_targetFromHit()` | 9 |
| 3678 | `_penetrationExit()` | 20 |
| 3698 | `_surfaceOf()` | 27 |
| 3725 | `_armoredTarget()` | 3 |
| 3728 | `_fleshImpact()` | 38 |
| 3766 | `_fxVoice()` | 9 |
| 3775 | `_impactSfx()` | 17 |
| 3792 | `_tintFx()` | 16 |
| 3808 | `_damage()` | 42 |
| 3850 | `_playerHurtFx()` | 6 |
| 3856 | `_kill()` | 67 |
| 3923 | `_checkArenaWin()` | 30 |
| 3953 | `_dmgArc()` | 79 |
| 4032 | `_mkBanner()` | 11 |
| 4043 | `_acertoPrevisto()` | 5 |
| 4048 | `_hitmarker()` | 15 |
| 4063 | `_dmgNumber()` | 20 |
| 4083 | `_feed()` | 19 |
| 4102 | `_skullIcon()` | 6 |
| 4108 | `_killfeedWeaponIcon()` | 9 |
| 4117 | `_wpnIcon()` | 64 |
| 4181 | `_tracer()` | 25 |
| 4206 | `_puff()` | 39 |
| 4245 | `_holeDecalMat()` | 8 |
| 4253 | `_flash()` | 68 |
| 4321 | `_muzzleWorld()` | 22 |
| 4343 | `_aimOrigin()` | 5 |
| 4348 | `_updateDoors()` | 10 |
| 4358 | `_updateFx()` | 57 |
| 4415 | `_ejectCasing()` | 17 |
| 4432 | `_makeCtfFlagTex()` | 23 |
| 4455 | `_paintFlagSymbol()` | 9 |
| 4464 | `_flagTexFor()` | 26 |
| 4490 | `_legadoSimbolo()` | 8 |
| 4498 | `_loadCtfSymbols()` | 22 |
| 4520 | `_makeCtfZoneTex()` | 31 |
| 4551 | `_makeSmokeTex()` | 8 |
| 4559 | `_updateSmokeHud()` | 4 |
| 4563 | `_grenadeSpatial()` | 14 |
| 4577 | `_spawnGrenade()` | 19 |
| 4596 | `_throwNade()` | 13 |
| 4609 | `_throwSmoke()` | 1 |
| 4610 | `_throwFrag()` | 4 |
| 4614 | `_explodeFrag()` | 40 |
| 4654 | `_corDaFumaca()` | 15 |
| 4669 | `_popSmoke()` | 21 |
| 4690 | `_updateGrenades()` | 35 |
| 4725 | `_teamColor()` | 15 |
| 4740 | `_teamInk()` | 7 |
| 4747 | `_factionOf()` | 1 |
| 4748 | `_voiceKey()` | 1 |
| 4749 | `_teamName()` | 1 |
| 4750 | `_teamTag()` | 6 |
| 4756 | `_plaqueta()` | 13 |
| 4769 | `_mirror()` | 3 |
| 4772 | `_botSeparation()` | 61 |
| 4833 | `_initCTF()` | 86 |
| 4919 | `_updateCTF()` | 61 |
| 4980 | `_ctfWin()` | 23 |
| 5003 | `_freeYaw()` | 25 |
| 5028 | `_pullString()` | 23 |
| 5051 | `_walkReach()` | 32 |
| 5083 | `_wpComp()` | 16 |
| 5099 | `_findPathLocal()` | 22 |
| 5121 | `_botCtf()` | 137 |
| 5258 | `_hideCtfHud()` | 6 |
| 5264 | `_updateCtfHud()` | 76 |
| 5340 | `_collide()` | 23 |
| 5363 | `_collideRot()` | 22 |
| 5385 | `_mantleAlcance()` | 50 |
| 5435 | `_mantleAlcancavel()` | 12 |
| 5447 | `_mantleTarget()` | 35 |
| 5482 | `_freeSpot()` | 30 |
| 5512 | `_retaAndavel()` | 20 |
| 5532 | `_walkDepth()` | 16 |
| 5548 | `_noteHit()` | 17 |
| 5565 | `_deathFeedback()` | 45 |
| 5610 | `_toggleCamView()` | 11 |
| 5621 | `_syncCamViewVis()` | 8 |
| 5629 | `_ensurePlayerTP()` | 25 |
| 5654 | `_updatePlayerTP()` | 35 |
| 5689 | `_tpDeath()` | 18 |
| 5707 | `_tpRevive()` | 13 |
| 5720 | `_moveEntity()` | 99 |
| 5819 | `_updatePlayer()` | 276 |
| 6095 | `_footstepSurface()` | 13 |
| 6108 | `_updatePickups()` | 148 |
| 6256 | `_wpnMode()` | 5 |
| 6261 | `_botWeapon()` | 10 |
| 6271 | `_municaoInfinita()` | 1 |
| 6272 | `_pickupAllowed()` | 7 |
| 6279 | `_grabPickup()` | 35 |
| 6314 | `_assentarNoChao()` | 10 |
| 6324 | `refreshPickupModels()` | 24 |
| 6348 | `_dropWeapon()` | 20 |
| 6368 | `_sumirDrop()` | 36 |
| 6404 | `_spawnY()` | 3 |
| 6407 | `_spawnYaw()` | 5 |
| 6412 | `_pickSpawn()` | 23 |
| 6435 | `_respawnPlayer()` | 34 |
| 6469 | `_losClear()` | 18 |
| 6487 | `_botCall()` | 41 |
| 6528 | `_teamMarkTex()` | 23 |
| 6551 | `_makeTeamMark()` | 16 |
| 6567 | `_syncRemoteWeapon()` | 22 |
| 6589 | `_updateTeamMark()` | 7 |
| 6596 | `_botEye()` | 1 |
| 6597 | `_enemyOf()` | 8 |
| 6605 | `_duelToken()` | 22 |
| 6627 | `_respawnEntity()` | 21 |
| 6648 | `_updateBot()` | 822 |
| 7470 | `_flushTraining()` | 13 |
| 7483 | `_updateBotNN()` | 73 |
| 7556 | `_botShootNN()` | 46 |
| 7602 | `_radarFoot()` | 38 |
| 7640 | `_updateRadar()` | 64 |
| 7704 | `_banner()` | 26 |
| 7730 | `_resultadoDaRodada()` | 4 |
| 7734 | `_showScoreboard()` | 49 |
| 7783 | `_updateWeaponHud()` | 35 |
| 7818 | `_updateHud()` | 87 |
| 7905 | `update()` | 90 |
| 7995 | `dispose()` | 50 |

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
