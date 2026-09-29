# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.13 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8187 | 316 |
| `public/js/main.js` | 4207 | 323 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3304 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6789 | `_updateBot()` | ⚠️ candidato a extração |
| 628 | 662 | `constructor()` | 🔴 append-only |
| 297 | 5917 | `_updatePlayer()` |  |
| 269 | 1390 | `_buildViewModels()` |  |
| 255 | 2545 | `_resetPositions()` |  |
| 158 | 6227 | `_updatePickups()` |  |
| 137 | 5208 | `_botCtf()` |  |
| 132 | 2110 | `_touchControls()` |  |
| 99 | 5818 | `_moveEntity()` |  |
| 90 | 8047 | `update()` | 🔴 append-only |
| 88 | 7959 | `_updateHud()` |  |
| 86 | 4919 | `_initCTF()` |  |
| 85 | 3523 | `_tryShoot()` |  |
| 79 | 3178 | `_ensureVmPrecisionQa()` |  |
| 79 | 4006 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `334–337` `402–496` `523–544` `1390–1799` `3144–3177` `3365–3458` `3477–3607` `3622–3637` `3682–3735` `4267–4291` `4339–4428` `4501–4517` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `173–176` `227–227` `253–264` `586–597` `3875–3975` `4858–4918` `5090–5344` `5427–5449` `5917–6213` `6610–6627` `6737–6767` `6789–7610` | — |
| **MAPAS / MUNDO** | `1336–1389` `2545–2799` `4919–5065` `6227–6384` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1814–1823` `1938–1969` `3052–3064` `4292–4330` `4444–4500` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1290–1335` `3004–3026` `3042–3051` `3065–3081` `4006–4084` `4134–4187` `4203–4266` `7781–7844` `7875–7923` `7959–8046` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8047–8136 · `_dom()` 1290–1335 · `constructor()` 662–1289

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3865 de 8187 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 47 | `ANNOUNCER_LAB` | 4 |
| 51 | `VMLAB` | 3 |
| 57 | `VM_QA_ADS` | 8 |
| 65 | `VM_MAT_LEGACY` | 4 |
| 71 | `DROP_TTL` | 8 |
| 79 | `ROUNDS_MAX` | 27 |
| 109 | `CTF_CLOCK_SHOW` | 4 |
| 113 | `KILLS_PER_PLAYER` | 7 |
| 120 | `PACE` | 33 |
| 153 | `PAUSE_ARM_MS` | 3 |
| 156 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 166 | `confirmGate` | 7 |
| 177 | `BOT_AIM_PITCH` | 4 |
| 181 | `BOT_DMG_PLAYER` | 21 |
| 202 | `BOT_FAIR` | 5 |
| 207 | `BOT_MOVE2` | 15 |
| 231 | `BOT_FOCUS_MIN` | 22 |
| 257 | `BOT_TOKEN_REST` | 7 |
| 265 | `MOVE_MUL` | 6 |
| 272 | `MOVE2` | 4 |
| 276 | `STEP_H` | 3 |
| 283 | `MANTLE_APOIO` | 4 |
| 287 | `MANTLE_GRID` | 5 |
| 292 | `RACK_OLD` | 4 |
| 296 | `RACK_RETA` | 25 |
| 323 | `RADIO` | 5 |
| 329 | `MK_LABELS` | 5 |
| 334 | `GUNFEEL` | 4 |
| 340 | `TRACER_STYLE` | 6 |
| 351 | `coneDoDisparo` | 23 |
| 375 | `D2R` | 4 |
| 379 | `DMG_FALLOFF` | 5 |
| 384 | `HS_MUL` | 3 |
| 387 | `BALL_CLASS` | 15 |
| 402 | `STATIC_CLASS` | 75 |
| 478 | `VM_KNOB` | 19 |
| 499 | `vmFovForAspect` | 24 |
| 523 | `VM_OFF` | 22 |
| 545 | `vmOffY` | 35 |
| 580 | `VMP` | 6 |
| 586 | `BOT_SKILLS` | 11 |
| 598 | `diffKey` | 4 |
| 603 | `rollBotSkill` | 7 |
| 610 | `botTier` | 4 |
| 614 | `_cyclePool` | 4 |
| 618 | `_rosterPool` | 15 |
| 633 | `pickMatchRoster` | 12 |
| 645 | `BOT_WEAPON_POOL` | 5 |
| 650 | `pickMatchWeapons` | 9 |
| 662 | `constructor()` | 628 |
| 1290 | `_dom()` | 46 |
| 1336 | `_buildEnv()` | 54 |
| 1390 | `_buildViewModels()` | 269 |
| 1659 | `_vmFrame` | 141 |
| 1800 | `_vmMontarTardio` | 14 |
| 1814 | `_makePuffTexture()` | 10 |
| 1824 | `_makeBloodTex()` | 19 |
| 1843 | `_makeBloodPoolTex()` | 21 |
| 1864 | `_bloodDecal()` | 16 |
| 1880 | `_makeBloodFx()` | 20 |
| 1900 | `_bloodSpatter()` | 18 |
| 1918 | `_bloodPoolAt()` | 6 |
| 1924 | `_updateBlood()` | 14 |
| 1938 | `_makeFlashTex()` | 22 |
| 1960 | `_makeFlashCoreTex()` | 10 |
| 1970 | `_input()` | 6 |
| 1976 | `_kd` | 48 |
| 2024 | `_ku` | 5 |
| 2029 | `_md` | 39 |
| 2068 | `_mu` | 7 |
| 2075 | `_mm` | 15 |
| 2090 | `_cc` | 1 |
| 2091 | `_blur` | 1 |
| 2092 | `_plc` | 18 |
| 2110 | `_touchControls()` | 132 |
| 2242 | `_aimAssist()` | 28 |
| 2270 | `_requestLock()` | 27 |
| 2297 | `_travaAtalhos()` | 4 |
| 2301 | `_soltaAtalhos()` | 5 |
| 2306 | `espectando()` | 2 |
| 2308 | `_acceptInput()` | 7 |
| 2315 | `travarEntrada()` | 16 |
| 2331 | `_chatSeguraPausa()` | 5 |
| 2336 | `_pauseBackdrop()` | 7 |
| 2343 | `_radioShow()` | 6 |
| 2349 | `_radioUi()` | 8 |
| 2357 | `_radioPick()` | 19 |
| 2376 | `_abilityNotice()` | 10 |
| 2386 | `_resetSliceAbilities()` | 9 |
| 2395 | `_stackTrace()` | 28 |
| 2423 | `_updateMotocaCharge()` | 10 |
| 2433 | `_recordRoutePoint()` | 11 |
| 2444 | `_routePing()` | 23 |
| 2467 | `_tickRoutePings()` | 12 |
| 2479 | `_objectiveInteractionMultiplier()` | 14 |
| 2493 | `start()` | 5 |
| 2498 | `_startAnnouncerLab()` | 9 |
| 2507 | `_startRound()` | 38 |
| 2545 | `_resetPositions()` | 255 |
| 2800 | `_checkCtfAlvo()` | 13 |
| 2813 | `_checkPace()` | 13 |
| 2826 | `_endRound()` | 34 |
| 2860 | `_roundWinnerVoice()` | 12 |
| 2872 | `_fimDaPartida()` | 7 |
| 2879 | `_endMatch()` | 61 |
| 2940 | `_ensureDolly()` | 41 |
| 2981 | `_tickDolly()` | 23 |
| 3004 | `setPaused()` | 23 |
| 3027 | `_now()` | 3 |
| 3030 | `pauseArmed()` | 1 |
| 3031 | `_syncPauseArm()` | 7 |
| 3038 | `resume()` | 4 |
| 3042 | `applySettings()` | 10 |
| 3052 | `_applyQuality()` | 13 |
| 3065 | `onResize()` | 17 |
| 3082 | `_switchTeam()` | 62 |
| 3144 | `_applyVmVisibility()` | 34 |
| 3178 | `_ensureVmPrecisionQa()` | 79 |
| 3257 | `_syncVmPresentation()` | 19 |
| 3276 | `_vmlabEnsure()` | 14 |
| 3290 | `_vmlabFrame()` | 28 |
| 3318 | `_tuneGet()` | 15 |
| 3333 | `_tune()` | 23 |
| 3356 | `_fxSet()` | 2 |
| 3358 | `_qaCicloArma()` | 7 |
| 3365 | `_switchWeapon()` | 39 |
| 3404 | `_deploySfx()` | 7 |
| 3411 | `_scope()` | 17 |
| 3428 | `_zoomFov()` | 7 |
| 3435 | `_reloading()` | 1 |
| 3436 | `_startReload()` | 23 |
| 3459 | `_reloadLayers()` | 18 |
| 3477 | `_installRecoil()` | 33 |
| 3510 | `_shotRecoil()` | 13 |
| 3523 | `_tryShoot()` | 85 |
| 3608 | `_tryKnifeAttack()` | 14 |
| 3622 | `_meleeHit()` | 16 |
| 3638 | `_meleeRange()` | 5 |
| 3643 | `_botMelee()` | 28 |
| 3671 | `_shotDamage()` | 11 |
| 3682 | `_fireHitscan()` | 54 |
| 3736 | `_targetFromHit()` | 9 |
| 3745 | `_penetrationExit()` | 20 |
| 3765 | `_surfaceOf()` | 27 |
| 3792 | `_armoredTarget()` | 3 |
| 3795 | `_fleshImpact()` | 38 |
| 3833 | `_fxVoice()` | 9 |
| 3842 | `_impactSfx()` | 17 |
| 3859 | `_tintFx()` | 16 |
| 3875 | `_damage()` | 42 |
| 3917 | `_playerHurtFx()` | 6 |
| 3923 | `_kill()` | 53 |
| 3976 | `_checkArenaWin()` | 30 |
| 4006 | `_dmgArc()` | 79 |
| 4085 | `_mkBanner()` | 9 |
| 4094 | `_updateKillSequenceHud()` | 12 |
| 4106 | `_resetKillSequence()` | 5 |
| 4111 | `_playerKillFeedback()` | 18 |
| 4129 | `_acertoPrevisto()` | 5 |
| 4134 | `_hitmarker()` | 15 |
| 4149 | `_dmgNumber()` | 20 |
| 4169 | `_feed()` | 19 |
| 4188 | `_skullIcon()` | 6 |
| 4194 | `_killfeedWeaponIcon()` | 9 |
| 4203 | `_wpnIcon()` | 64 |
| 4267 | `_tracer()` | 25 |
| 4292 | `_puff()` | 39 |
| 4331 | `_holeDecalMat()` | 8 |
| 4339 | `_flash()` | 68 |
| 4407 | `_muzzleWorld()` | 22 |
| 4429 | `_aimOrigin()` | 5 |
| 4434 | `_updateDoors()` | 10 |
| 4444 | `_updateFx()` | 57 |
| 4501 | `_ejectCasing()` | 17 |
| 4518 | `_makeCtfFlagTex()` | 23 |
| 4541 | `_paintFlagSymbol()` | 9 |
| 4550 | `_flagTexFor()` | 26 |
| 4576 | `_legadoSimbolo()` | 8 |
| 4584 | `_loadCtfSymbols()` | 22 |
| 4606 | `_makeCtfZoneTex()` | 31 |
| 4637 | `_makeSmokeTex()` | 8 |
| 4645 | `_updateSmokeHud()` | 4 |
| 4649 | `_grenadeSpatial()` | 14 |
| 4663 | `_spawnGrenade()` | 19 |
| 4682 | `_throwNade()` | 13 |
| 4695 | `_throwSmoke()` | 1 |
| 4696 | `_throwFrag()` | 4 |
| 4700 | `_explodeFrag()` | 40 |
| 4740 | `_corDaFumaca()` | 15 |
| 4755 | `_popSmoke()` | 21 |
| 4776 | `_updateGrenades()` | 35 |
| 4811 | `_teamColor()` | 15 |
| 4826 | `_teamInk()` | 7 |
| 4833 | `_factionOf()` | 1 |
| 4834 | `_voiceKey()` | 1 |
| 4835 | `_teamName()` | 1 |
| 4836 | `_teamTag()` | 6 |
| 4842 | `_plaqueta()` | 13 |
| 4855 | `_mirror()` | 3 |
| 4858 | `_botSeparation()` | 61 |
| 4919 | `_initCTF()` | 86 |
| 5005 | `_updateCTF()` | 61 |
| 5066 | `_ctfWin()` | 24 |
| 5090 | `_freeYaw()` | 25 |
| 5115 | `_pullString()` | 23 |
| 5138 | `_walkReach()` | 32 |
| 5170 | `_wpComp()` | 16 |
| 5186 | `_findPathLocal()` | 22 |
| 5208 | `_botCtf()` | 137 |
| 5345 | `_hideCtfHud()` | 6 |
| 5351 | `_updateCtfHud()` | 76 |
| 5427 | `_collide()` | 23 |
| 5450 | `_collideRot()` | 22 |
| 5472 | `_mantleAlcance()` | 50 |
| 5522 | `_mantleAlcancavel()` | 12 |
| 5534 | `_mantleTarget()` | 35 |
| 5569 | `_freeSpot()` | 30 |
| 5599 | `_retaAndavel()` | 20 |
| 5619 | `_walkDepth()` | 16 |
| 5635 | `_noteHit()` | 17 |
| 5652 | `_deathFeedback()` | 45 |
| 5697 | `_toggleCamView()` | 6 |
| 5703 | `setCamView()` | 14 |
| 5717 | `_syncCamViewVis()` | 8 |
| 5725 | `_ensurePlayerTP()` | 25 |
| 5750 | `_updatePlayerTP()` | 37 |
| 5787 | `_tpDeath()` | 18 |
| 5805 | `_tpRevive()` | 13 |
| 5818 | `_moveEntity()` | 99 |
| 5917 | `_updatePlayer()` | 297 |
| 6214 | `_footstepSurface()` | 13 |
| 6227 | `_updatePickups()` | 158 |
| 6385 | `_wpnMode()` | 5 |
| 6390 | `_botWeapon()` | 10 |
| 6400 | `_municaoInfinita()` | 1 |
| 6401 | `_pickupAllowed()` | 9 |
| 6410 | `_grabNearPickup()` | 10 |
| 6420 | `_grabPickup()` | 35 |
| 6455 | `_assentarNoChao()` | 10 |
| 6465 | `refreshPickupModels()` | 24 |
| 6489 | `_dropWeapon()` | 20 |
| 6509 | `_sumirDrop()` | 36 |
| 6545 | `_spawnY()` | 3 |
| 6548 | `_spawnYaw()` | 5 |
| 6553 | `_pickSpawn()` | 23 |
| 6576 | `_respawnPlayer()` | 34 |
| 6610 | `_losClear()` | 18 |
| 6628 | `_botCall()` | 41 |
| 6669 | `_teamMarkTex()` | 23 |
| 6692 | `_makeTeamMark()` | 16 |
| 6708 | `_syncRemoteWeapon()` | 22 |
| 6730 | `_updateTeamMark()` | 7 |
| 6737 | `_botEye()` | 1 |
| 6738 | `_enemyOf()` | 8 |
| 6746 | `_duelToken()` | 22 |
| 6768 | `_respawnEntity()` | 21 |
| 6789 | `_updateBot()` | 822 |
| 7611 | `_flushTraining()` | 13 |
| 7624 | `_updateBotNN()` | 73 |
| 7697 | `_botShootNN()` | 46 |
| 7743 | `_radarFoot()` | 38 |
| 7781 | `_updateRadar()` | 64 |
| 7845 | `_banner()` | 26 |
| 7871 | `_resultadoDaRodada()` | 4 |
| 7875 | `_showScoreboard()` | 49 |
| 7924 | `_updateWeaponHud()` | 35 |
| 7959 | `_updateHud()` | 88 |
| 8047 | `update()` | 90 |
| 8137 | `dispose()` | 50 |

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
