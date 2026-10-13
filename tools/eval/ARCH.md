# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.88 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8436 | 332 |
| `public/js/main.js` | 4522 | 339 |
| `public/js/glbchars.js` | 856 | 60 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3337 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 838 | 7020 | `_updateBot()` | ⚠️ candidato a extração |
| 637 | 720 | `constructor()` | 🔴 append-only |
| 304 | 6122 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1457 | `_buildViewModels()` |  |
| 255 | 2649 | `_resetPositions()` |  |
| 158 | 6439 | `_updatePickups()` |  |
| 137 | 5356 | `_botCtf()` |  |
| 135 | 2209 | `_touchControls()` |  |
| 101 | 6021 | `_moveEntity()` |  |
| 90 | 8294 | `update()` | 🔴 append-only |
| 88 | 8206 | `_updateHud()` |  |
| 86 | 5067 | `_initCTF()` |  |
| 81 | 3641 | `_tryShoot()` |  |
| 79 | 3287 | `_ensureVmPrecisionQa()` |  |
| 79 | 4135 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `348–351` `433–527` `557–578` `1457–1866` `3253–3286` `3483–3576` `3595–3721` `3736–3751` `3796–3865` `4396–4421` `4469–4569` `4642–4658` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `187–190` `241–241` `267–278` `620–631` `4005–4104` `5006–5066` `5238–5492` `5575–5597` `6122–6425` `6822–6839` `6968–6998` `7020–7857` | — |
| **MAPAS / MUNDO** | `1403–1456` `2649–2903` `5067–5213` `6439–6596` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1881–1890` `2005–2043` `3156–3169` `4422–4460` `4585–4641` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1357–1402` `3108–3130` `3146–3155` `3170–3186` `4135–4213` `4263–4316` `4332–4395` `8028–8091` `8122–8170` `8206–8293` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8294–8383 · `_dom()` 1357–1402 · `constructor()` 720–1356

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3902 de 8436 linhas (46%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 50 | `ANNOUNCER_LAB` | 4 |
| 54 | `VMLAB` | 3 |
| 59 | `VM_QA_CICLO` | 3 |
| 63 | `VM_QA_ADS` | 8 |
| 71 | `VM_MAT_LEGACY` | 4 |
| 77 | `DROP_TTL` | 8 |
| 85 | `ROUNDS_MAX` | 27 |
| 113 | `CTF_ROUNDS_TO_WIN` | 4 |
| 118 | `sanitizeRounds` | 4 |
| 123 | `CTF_CLOCK_SHOW` | 4 |
| 127 | `KILLS_PER_PLAYER` | 7 |
| 134 | `PACE` | 33 |
| 167 | `PAUSE_ARM_MS` | 3 |
| 170 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 180 | `confirmGate` | 7 |
| 191 | `BOT_AIM_PITCH` | 4 |
| 195 | `BOT_DMG_PLAYER` | 21 |
| 216 | `BOT_FAIR` | 5 |
| 221 | `BOT_MOVE2` | 15 |
| 245 | `BOT_FOCUS_MIN` | 22 |
| 271 | `BOT_TOKEN_REST` | 7 |
| 279 | `MOVE_MUL` | 6 |
| 286 | `MOVE2` | 4 |
| 290 | `STEP_H` | 3 |
| 297 | `MANTLE_APOIO` | 4 |
| 301 | `MANTLE_GRID` | 5 |
| 306 | `RACK_OLD` | 4 |
| 310 | `RACK_RETA` | 25 |
| 337 | `RADIO` | 5 |
| 343 | `MK_LABELS` | 5 |
| 348 | `GUNFEEL` | 4 |
| 355 | `TRACER_STYLE` | 6 |
| 365 | `ADS_RAMPA_S` | 3 |
| 369 | `aberturaCone` | 16 |
| 385 | `anguloDeDisparo` | 4 |
| 389 | `coneDoDisparo` | 16 |
| 406 | `D2R` | 4 |
| 410 | `DMG_FALLOFF` | 5 |
| 415 | `HS_MUL` | 3 |
| 418 | `BALL_CLASS` | 15 |
| 433 | `STATIC_CLASS` | 75 |
| 509 | `VM_KNOB` | 19 |
| 528 | `vmAdsRot` | 4 |
| 533 | `vmFovForAspect` | 24 |
| 557 | `VM_OFF` | 22 |
| 579 | `vmOffY` | 35 |
| 614 | `VMP` | 6 |
| 620 | `BOT_SKILLS` | 11 |
| 632 | `diffKey` | 4 |
| 637 | `rollBotSkill` | 7 |
| 644 | `botTier` | 4 |
| 648 | `_cyclePool` | 5 |
| 653 | `_rosterPool` | 22 |
| 677 | `_pinnedDefs` | 5 |
| 682 | `pickMatchRoster` | 21 |
| 703 | `BOT_WEAPON_POOL` | 5 |
| 708 | `pickMatchWeapons` | 9 |
| 720 | `constructor()` | 637 |
| 1357 | `_dom()` | 46 |
| 1403 | `_buildEnv()` | 54 |
| 1457 | `_buildViewModels()` | 269 |
| 1726 | `_vmFrame` | 141 |
| 1867 | `_vmMontarTardio` | 14 |
| 1881 | `_makePuffTexture()` | 10 |
| 1891 | `_makeBloodTex()` | 19 |
| 1910 | `_makeBloodPoolTex()` | 21 |
| 1931 | `_bloodDecal()` | 16 |
| 1947 | `_makeBloodFx()` | 20 |
| 1967 | `_bloodSpatter()` | 18 |
| 1985 | `_bloodPoolAt()` | 6 |
| 1991 | `_updateBlood()` | 14 |
| 2005 | `_makeFlashTex()` | 21 |
| 2026 | `_makeFlashSoftTex()` | 8 |
| 2034 | `_makeFlashCoreTex()` | 10 |
| 2044 | `_input()` | 6 |
| 2050 | `_kd` | 49 |
| 2099 | `_ku` | 5 |
| 2104 | `_md` | 40 |
| 2144 | `_mu` | 7 |
| 2151 | `_mm` | 20 |
| 2171 | `_wh` | 17 |
| 2188 | `_cc` | 1 |
| 2189 | `_blur` | 1 |
| 2190 | `_plc` | 19 |
| 2209 | `_touchControls()` | 135 |
| 2344 | `_aimAssist()` | 28 |
| 2372 | `_requestLock()` | 27 |
| 2399 | `_travaAtalhos()` | 4 |
| 2403 | `_soltaAtalhos()` | 5 |
| 2408 | `espectando()` | 2 |
| 2410 | `_acceptInput()` | 7 |
| 2417 | `travarEntrada()` | 17 |
| 2434 | `_chatSeguraPausa()` | 5 |
| 2439 | `_pauseBackdrop()` | 7 |
| 2446 | `_radioShow()` | 6 |
| 2452 | `_radioUi()` | 8 |
| 2460 | `_radioPick()` | 20 |
| 2480 | `_abilityNotice()` | 10 |
| 2490 | `_resetSliceAbilities()` | 9 |
| 2499 | `_stackTrace()` | 28 |
| 2527 | `_updateMotocaCharge()` | 10 |
| 2537 | `_recordRoutePoint()` | 11 |
| 2548 | `_routePing()` | 23 |
| 2571 | `_tickRoutePings()` | 12 |
| 2583 | `_objectiveInteractionMultiplier()` | 14 |
| 2597 | `start()` | 5 |
| 2602 | `_startAnnouncerLab()` | 9 |
| 2611 | `_startRound()` | 38 |
| 2649 | `_resetPositions()` | 255 |
| 2904 | `_checkCtfAlvo()` | 13 |
| 2917 | `_checkPace()` | 13 |
| 2930 | `_endRound()` | 34 |
| 2964 | `_roundWinnerVoice()` | 12 |
| 2976 | `_fimDaPartida()` | 7 |
| 2983 | `_endMatch()` | 61 |
| 3044 | `_ensureDolly()` | 41 |
| 3085 | `_tickDolly()` | 23 |
| 3108 | `setPaused()` | 23 |
| 3131 | `_now()` | 3 |
| 3134 | `pauseArmed()` | 1 |
| 3135 | `_syncPauseArm()` | 7 |
| 3142 | `resume()` | 4 |
| 3146 | `applySettings()` | 10 |
| 3156 | `_applyQuality()` | 14 |
| 3170 | `onResize()` | 17 |
| 3187 | `_switchTeam()` | 66 |
| 3253 | `_applyVmVisibility()` | 34 |
| 3287 | `_ensureVmPrecisionQa()` | 79 |
| 3366 | `_syncVmPresentation()` | 19 |
| 3385 | `_vmlabEnsure()` | 14 |
| 3399 | `_vmlabFrame()` | 28 |
| 3427 | `_tuneGet()` | 15 |
| 3442 | `_tune()` | 23 |
| 3465 | `_fxSet()` | 2 |
| 3467 | `_qaCicloArma()` | 8 |
| 3475 | `_cycleWeapon()` | 8 |
| 3483 | `_switchWeapon()` | 39 |
| 3522 | `_deploySfx()` | 7 |
| 3529 | `_scope()` | 17 |
| 3546 | `_zoomFov()` | 5 |
| 3551 | `_reloading()` | 1 |
| 3552 | `_startReload()` | 25 |
| 3577 | `_reloadLayers()` | 18 |
| 3595 | `_installRecoil()` | 33 |
| 3628 | `_shotRecoil()` | 13 |
| 3641 | `_tryShoot()` | 81 |
| 3722 | `_tryKnifeAttack()` | 14 |
| 3736 | `_meleeHit()` | 16 |
| 3752 | `_meleeRange()` | 5 |
| 3757 | `_botMelee()` | 28 |
| 3785 | `_shotDamage()` | 11 |
| 3796 | `_fireHitscan()` | 70 |
| 3866 | `_targetFromHit()` | 9 |
| 3875 | `_penetrationExit()` | 20 |
| 3895 | `_surfaceOf()` | 27 |
| 3922 | `_armoredTarget()` | 3 |
| 3925 | `_fleshImpact()` | 38 |
| 3963 | `_fxVoice()` | 9 |
| 3972 | `_impactSfx()` | 17 |
| 3989 | `_tintFx()` | 16 |
| 4005 | `_damage()` | 42 |
| 4047 | `_playerHurtFx()` | 5 |
| 4052 | `_kill()` | 53 |
| 4105 | `_checkArenaWin()` | 30 |
| 4135 | `_dmgArc()` | 79 |
| 4214 | `_mkBanner()` | 9 |
| 4223 | `_updateKillSequenceHud()` | 12 |
| 4235 | `_resetKillSequence()` | 5 |
| 4240 | `_playerKillFeedback()` | 18 |
| 4258 | `_acertoPrevisto()` | 5 |
| 4263 | `_hitmarker()` | 15 |
| 4278 | `_dmgNumber()` | 20 |
| 4298 | `_feed()` | 19 |
| 4317 | `_skullIcon()` | 6 |
| 4323 | `_killfeedWeaponIcon()` | 9 |
| 4332 | `_wpnIcon()` | 64 |
| 4396 | `_tracer()` | 26 |
| 4422 | `_puff()` | 39 |
| 4461 | `_holeDecalMat()` | 8 |
| 4469 | `_flash()` | 61 |
| 4530 | `_vmTetoTela()` | 10 |
| 4540 | `_muzzleWorld()` | 30 |
| 4570 | `_aimOrigin()` | 5 |
| 4575 | `_updateDoors()` | 10 |
| 4585 | `_updateFx()` | 57 |
| 4642 | `_ejectCasing()` | 17 |
| 4659 | `_makeCtfFlagTex()` | 23 |
| 4682 | `_paintFlagSymbol()` | 9 |
| 4691 | `_flagTexFor()` | 26 |
| 4717 | `_legadoSimbolo()` | 8 |
| 4725 | `_loadCtfSymbols()` | 22 |
| 4747 | `_makeCtfZoneTex()` | 31 |
| 4778 | `_makeSmokeTex()` | 10 |
| 4788 | `_updateSmokeHud()` | 4 |
| 4792 | `_grenadeSpatial()` | 14 |
| 4806 | `_spawnGrenade()` | 19 |
| 4825 | `_throwNade()` | 13 |
| 4838 | `_throwSmoke()` | 1 |
| 4839 | `_throwFrag()` | 4 |
| 4843 | `_explodeFrag()` | 40 |
| 4883 | `_corDaFumaca()` | 16 |
| 4899 | `_popSmoke()` | 23 |
| 4922 | `_updateGrenades()` | 35 |
| 4957 | `_teamColor()` | 15 |
| 4972 | `_teamInk()` | 7 |
| 4979 | `_factionOf()` | 1 |
| 4980 | `_voiceKey()` | 1 |
| 4981 | `_teamName()` | 1 |
| 4982 | `_teamTag()` | 6 |
| 4988 | `_plaqueta()` | 13 |
| 5001 | `_mirror()` | 2 |
| 5003 | `_defNoLado()` | 3 |
| 5006 | `_botSeparation()` | 61 |
| 5067 | `_initCTF()` | 86 |
| 5153 | `_updateCTF()` | 61 |
| 5214 | `_ctfWin()` | 24 |
| 5238 | `_freeYaw()` | 25 |
| 5263 | `_pullString()` | 23 |
| 5286 | `_walkReach()` | 32 |
| 5318 | `_wpComp()` | 16 |
| 5334 | `_findPathLocal()` | 22 |
| 5356 | `_botCtf()` | 137 |
| 5493 | `_hideCtfHud()` | 6 |
| 5499 | `_updateCtfHud()` | 76 |
| 5575 | `_collide()` | 23 |
| 5598 | `_collideRot()` | 22 |
| 5620 | `_mantleAlcance()` | 50 |
| 5670 | `_mantleAlcancavel()` | 12 |
| 5682 | `_mantleTarget()` | 35 |
| 5717 | `_freeSpot()` | 30 |
| 5747 | `_retaAndavel()` | 20 |
| 5767 | `_walkDepth()` | 16 |
| 5783 | `_noteHit()` | 17 |
| 5800 | `_deathFeedback()` | 45 |
| 5845 | `_toggleCamView()` | 6 |
| 5851 | `setCamView()` | 16 |
| 5867 | `_syncCamViewVis()` | 8 |
| 5875 | `_ensurePlayerTP()` | 26 |
| 5901 | `_updatePlayerTP()` | 42 |
| 5943 | `_updateCrosshairParallax()` | 47 |
| 5990 | `_tpDeath()` | 18 |
| 6008 | `_tpRevive()` | 13 |
| 6021 | `_moveEntity()` | 101 |
| 6122 | `_updatePlayer()` | 304 |
| 6426 | `_footstepSurface()` | 13 |
| 6439 | `_updatePickups()` | 158 |
| 6597 | `_wpnMode()` | 5 |
| 6602 | `_botWeapon()` | 10 |
| 6612 | `_municaoInfinita()` | 1 |
| 6613 | `_pickupAllowed()` | 9 |
| 6622 | `_grabNearPickup()` | 10 |
| 6632 | `_grabPickup()` | 35 |
| 6667 | `_assentarNoChao()` | 10 |
| 6677 | `refreshPickupModels()` | 24 |
| 6701 | `_dropWeapon()` | 20 |
| 6721 | `_sumirDrop()` | 36 |
| 6757 | `_spawnY()` | 3 |
| 6760 | `_spawnYaw()` | 5 |
| 6765 | `_pickSpawn()` | 23 |
| 6788 | `_respawnPlayer()` | 34 |
| 6822 | `_losClear()` | 18 |
| 6840 | `_botCall()` | 41 |
| 6881 | `_teamMarkTex()` | 23 |
| 6904 | `_makeTeamMark()` | 16 |
| 6920 | `_trocarPersonagem()` | 18 |
| 6938 | `_syncRemoteWeapon()` | 23 |
| 6961 | `_updateTeamMark()` | 7 |
| 6968 | `_botEye()` | 1 |
| 6969 | `_enemyOf()` | 8 |
| 6977 | `_duelToken()` | 22 |
| 6999 | `_respawnEntity()` | 21 |
| 7020 | `_updateBot()` | 838 |
| 7858 | `_flushTraining()` | 13 |
| 7871 | `_updateBotNN()` | 73 |
| 7944 | `_botShootNN()` | 46 |
| 7990 | `_radarFoot()` | 38 |
| 8028 | `_updateRadar()` | 64 |
| 8092 | `_banner()` | 26 |
| 8118 | `_resultadoDaRodada()` | 4 |
| 8122 | `_showScoreboard()` | 49 |
| 8171 | `_updateWeaponHud()` | 35 |
| 8206 | `_updateHud()` | 88 |
| 8294 | `update()` | 90 |
| 8384 | `dispose()` | 52 |

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
