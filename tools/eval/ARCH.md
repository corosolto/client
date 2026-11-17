# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.151 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 10286 | 437 |
| `public/js/main.js` | 5813 | 449 |
| `public/js/glbchars.js` | 2152 | 156 |
| `public/js/characters.js` | 1243 | 40 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3582 linhas (35% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 1016 | 8519 | `_updateBot()` | ⚠️ candidato a extração |
| 646 | 816 | `constructor()` | 🔴 append-only |
| 366 | 7424 | `_updatePlayer()` | ⚠️ candidato a extração |
| 288 | 2978 | `_resetPositions()` |  |
| 156 | 7805 | `_updatePickups()` |  |
| 141 | 2379 | `_touchControls()` |  |
| 138 | 9975 | `_updateHud()` |  |
| 137 | 6337 | `_botCtf()` |  |
| 136 | 7288 | `_moveEntity()` |  |
| 105 | 7062 | `_updatePlayerTPCamera()` |  |
| 100 | 4179 | `_tryShoot()` |  |
| 96 | 10113 | `update()` | 🔴 append-only |
| 91 | 9721 | `_updateRadar()` |  |
| 86 | 6040 | `_initCTF()` |  |
| 80 | 3595 | `_switchTeam()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `404–407` `516–610` `640–661` `1566–1853` `3675–3712` `3960–4061` `4133–4278` `4294–4309` `4474–4501` `5091–5120` `5195–5313` `5447–5464` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `223–227` `278–278` `311–322` `703–714` `4673–4794` `5984–6039` `6217–6473` `6556–6574` `7424–7789` `8216–8230` `8403–8433` `8519–9534` | — |
| **MAPAS / MUNDO** | `1509–1565` `2978–3265` `6040–6191` `7805–7960` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `2013–2022` `2138–2176` `3560–3574` `5148–5186` `5372–5446` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1462–1508` `3512–3534` `3550–3559` `3575–3594` `4819–4897` `4957–5010` `5027–5090` `9721–9811` `9869–9931` `9975–10112` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 10113–10208 · `_dom()` 1462–1508 · `constructor()` 816–1461

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **4197 de 10286 linhas (41%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 72 | `QS` | 3 |
| 78 | `ANNOUNCER_LAB` | 4 |
| 82 | `VMLAB` | 3 |
| 87 | `VM_QA_CICLO` | 3 |
| 91 | `VM_QA_ADS` | 4 |
| 96 | `FLASH_DEBUG_N` | 3 |
| 99 | `NADE_ESTOQUE` | 8 |
| 107 | `VM_MAT_LEGACY` | 4 |
| 113 | `DROP_TTL` | 8 |
| 121 | `ROUNDS_MAX` | 27 |
| 149 | `CTF_ROUNDS_TO_WIN` | 4 |
| 154 | `sanitizeRounds` | 4 |
| 159 | `CTF_CLOCK_SHOW` | 4 |
| 163 | `KILLS_PER_PLAYER` | 7 |
| 170 | `PACE` | 33 |
| 203 | `PAUSE_ARM_MS` | 3 |
| 206 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 216 | `confirmGate` | 7 |
| 228 | `BOT_AIM_PITCH` | 4 |
| 232 | `BOT_DMG_PLAYER` | 21 |
| 253 | `BOT_FAIR` | 5 |
| 258 | `BOT_MOVE2` | 15 |
| 282 | `BOT_FOCUS_MIN` | 3 |
| 289 | `BOT_OUVE_PASSO` | 22 |
| 315 | `BOT_TOKEN_REST` | 7 |
| 323 | `MOVE_MUL` | 6 |
| 330 | `MOVE2` | 4 |
| 334 | `STEP_H` | 3 |
| 349 | `EMPTY_COLLIDERS` | 5 |
| 354 | `RACK_OLD` | 4 |
| 358 | `RACK_RETA` | 25 |
| 383 | `REGEN` | 3 |
| 389 | `ARMADURA_DEBUG` | 3 |
| 393 | `RADIO` | 5 |
| 399 | `MK_LABELS` | 5 |
| 404 | `GUNFEEL` | 4 |
| 409 | `PUNCH_ZOOM` | 3 |
| 412 | `BOCA_CORPO` | 3 |
| 415 | `bocaLocalDaArma` | 22 |
| 438 | `LANDING_FX_STYLE` | 12 |
| 454 | `ADS_RAMPA_S` | 3 |
| 458 | `aberturaCone` | 16 |
| 474 | `anguloDeDisparo` | 4 |
| 478 | `coneDoDisparo` | 16 |
| 496 | `MOBILE_RADAR_INTERVAL` | 3 |
| 499 | `TOUCH_LOOK_RAD_PX` | 4 |
| 503 | `DMG_FALLOFF` | 5 |
| 508 | `HS_MUL` | 3 |
| 511 | `BALL_CLASS` | 5 |
| 516 | `STATIC_CLASS` | 75 |
| 592 | `VM_KNOB` | 19 |
| 611 | `vmAdsRot` | 4 |
| 616 | `vmFovForAspect` | 24 |
| 640 | `VM_OFF` | 22 |
| 662 | `vmOffY` | 35 |
| 697 | `VMP` | 6 |
| 703 | `BOT_SKILLS` | 11 |
| 715 | `diffKey` | 4 |
| 720 | `rollBotSkill` | 7 |
| 727 | `botTier` | 4 |
| 731 | `_cyclePool` | 5 |
| 736 | `_rosterPool` | 22 |
| 758 | `_doLado` | 4 |
| 764 | `_pinnedDefs` | 5 |
| 769 | `pickMatchRoster` | 21 |
| 790 | `BOT_WEAPON_POOL` | 5 |
| 795 | `pickMatchWeapons` | 9 |
| 804 | `aguardarPreloads` | 9 |
| 816 | `constructor()` | 646 |
| 1462 | `_dom()` | 47 |
| 1509 | `_buildEnv()` | 57 |
| 1566 | `_buildViewModels()` | 3 |
| 1569 | `_vmFrame` | 285 |
| 1854 | `_vmFrame` | 142 |
| 1996 | `_vmMontarTardio` | 15 |
| 2011 | `_texLocal()` | 2 |
| 2013 | `_makePuffTexture()` | 10 |
| 2023 | `_makeBloodTex()` | 19 |
| 2042 | `_makeBloodPoolTex()` | 21 |
| 2063 | `_bloodDecal()` | 16 |
| 2079 | `_makeBloodFx()` | 21 |
| 2100 | `_bloodSpatter()` | 18 |
| 2118 | `_bloodPoolAt()` | 6 |
| 2124 | `_updateBlood()` | 14 |
| 2138 | `_makeFlashTex()` | 21 |
| 2159 | `_makeFlashSoftTex()` | 8 |
| 2167 | `_makeFlashCoreTex()` | 10 |
| 2177 | `_input()` | 6 |
| 2183 | `_kd` | 73 |
| 2256 | `_ku` | 5 |
| 2261 | `_md` | 44 |
| 2305 | `_mu` | 10 |
| 2315 | `_mm` | 20 |
| 2335 | `_wh` | 17 |
| 2352 | `_cc` | 1 |
| 2353 | `_blur` | 1 |
| 2354 | `_hiddenInput` | 1 |
| 2355 | `_plc` | 24 |
| 2379 | `_touchControls()` | 141 |
| 2520 | `_releaseInput()` | 11 |
| 2531 | `_touchLook()` | 12 |
| 2543 | `_syncTouchWeps()` | 18 |
| 2561 | `_aimAssist()` | 28 |
| 2589 | `_requestLock()` | 27 |
| 2616 | `_travaAtalhos()` | 17 |
| 2633 | `_soltaAtalhos()` | 6 |
| 2639 | `espectando()` | 2 |
| 2641 | `_acceptInput()` | 7 |
| 2648 | `travarEntrada()` | 13 |
| 2661 | `_chatSeguraPausa()` | 5 |
| 2666 | `_pauseBackdrop()` | 7 |
| 2673 | `_radioShow()` | 6 |
| 2679 | `_radioUi()` | 10 |
| 2689 | `_emoteToggle()` | 10 |
| 2699 | `_emoteMods()` | 12 |
| 2711 | `_emoteAnel()` | 4 |
| 2715 | `_emoteUi()` | 22 |
| 2737 | `_emoteClose()` | 6 |
| 2743 | `_emotePick()` | 11 |
| 2754 | `_emoteCtrl()` | 4 |
| 2758 | `_emoteStop()` | 10 |
| 2768 | `_emoteTick()` | 7 |
| 2775 | `_radioPick()` | 20 |
| 2795 | `_abilityNotice()` | 10 |
| 2805 | `_resetSliceAbilities()` | 9 |
| 2814 | `_stackTrace()` | 28 |
| 2842 | `_updateMotocaCharge()` | 10 |
| 2852 | `_recordRoutePoint()` | 11 |
| 2863 | `_routePing()` | 23 |
| 2886 | `_tickRoutePings()` | 12 |
| 2898 | `_objectiveInteractionMultiplier()` | 14 |
| 2912 | `start()` | 5 |
| 2917 | `_startAnnouncerLab()` | 9 |
| 2926 | `_startRound()` | 52 |
| 2978 | `_resetPositions()` | 288 |
| 3266 | `_checkCtfAlvo()` | 13 |
| 3279 | `_checkPace()` | 13 |
| 3292 | `_cerimoniaCorpos()` | 4 |
| 3296 | `_retomarCorposDaCerimonia()` | 4 |
| 3300 | `_endRound()` | 38 |
| 3338 | `_roundWinnerVoice()` | 12 |
| 3350 | `_fimDaPartida()` | 13 |
| 3363 | `_modeId()` | 1 |
| 3364 | `_teamPopulation()` | 5 |
| 3369 | `_endMatch()` | 79 |
| 3448 | `_ensureDolly()` | 41 |
| 3489 | `_tickDolly()` | 23 |
| 3512 | `setPaused()` | 23 |
| 3535 | `_now()` | 3 |
| 3538 | `pauseArmed()` | 1 |
| 3539 | `_syncPauseArm()` | 7 |
| 3546 | `resume()` | 4 |
| 3550 | `applySettings()` | 10 |
| 3560 | `_applyQuality()` | 15 |
| 3575 | `onResize()` | 20 |
| 3595 | `_switchTeam()` | 80 |
| 3675 | `_applyVmVisibility()` | 38 |
| 3713 | `_ensureVmPrecisionQa()` | 79 |
| 3792 | `_syncVmPresentation()` | 22 |
| 3814 | `_utilidadeNaMao()` | 7 |
| 3821 | `_vmlabEnsure()` | 14 |
| 3835 | `_vmlabFrame()` | 28 |
| 3863 | `_tuneGet()` | 15 |
| 3878 | `_tune()` | 23 |
| 3901 | `_fxSet()` | 1 |
| 3902 | `aplicarEfeitosAdaptativos()` | 20 |
| 3922 | `_qaCicloArma()` | 8 |
| 3930 | `_cycleWeapon()` | 8 |
| 3938 | `_inspectWeapon()` | 8 |
| 3946 | `_cancelInspect()` | 4 |
| 3950 | `_inspectMix()` | 10 |
| 3960 | `_switchWeapon()` | 43 |
| 4003 | `_deploySfx()` | 7 |
| 4010 | `_scope()` | 18 |
| 4028 | `_zoomFov()` | 5 |
| 4033 | `_reloading()` | 1 |
| 4034 | `_startReload()` | 28 |
| 4062 | `_cancelReload()` | 14 |
| 4076 | `_abortarArmaNaMorte()` | 14 |
| 4090 | `_voltarPraBase()` | 16 |
| 4106 | `_armasServidasPelaRecarga()` | 9 |
| 4115 | `_reloadLayers()` | 18 |
| 4133 | `_installRecoil()` | 33 |
| 4166 | `_shotRecoil()` | 13 |
| 4179 | `_tryShoot()` | 100 |
| 4279 | `_tryKnifeAttack()` | 15 |
| 4294 | `_meleeHit()` | 16 |
| 4310 | `_meleeRange()` | 5 |
| 4315 | `_botMelee()` | 26 |
| 4341 | `_distanceDamage()` | 7 |
| 4348 | `_shotDamage()` | 10 |
| 4358 | `_consultarTiro()` | 15 |
| 4373 | `_perfilCabeca()` | 7 |
| 4380 | `_origemTiroBot()` | 4 |
| 4384 | `_miraTiroBot()` | 13 |
| 4397 | `_participanteHumano()` | 4 |
| 4401 | `_resolverTiroBot()` | 11 |
| 4412 | `_danoTiroBot()` | 12 |
| 4424 | `_aplicarTiroBot()` | 13 |
| 4437 | `_dispararBot()` | 29 |
| 4466 | `_rastroTiroBot()` | 8 |
| 4474 | `_fireHitscan()` | 28 |
| 4502 | `_targetFromHit()` | 9 |
| 4511 | `_penetrationExit()` | 8 |
| 4519 | `_surfaceOf()` | 27 |
| 4546 | `_armoredTarget()` | 6 |
| 4552 | `_entidadeEscolta()` | 1 |
| 4553 | `_aplicaArmadura()` | 11 |
| 4564 | `_armaduraLigada()` | 1 |
| 4565 | `_equiparArmadura()` | 8 |
| 4573 | `_updateArmaduraHud()` | 13 |
| 4586 | `_sincronizarArmaduraVisual()` | 6 |
| 4592 | `_fleshImpact()` | 38 |
| 4630 | `_fxVoice()` | 9 |
| 4639 | `_impactSfx()` | 17 |
| 4656 | `_tintFx()` | 17 |
| 4673 | `_damage()` | 51 |
| 4724 | `_playerHurtFx()` | 5 |
| 4729 | `_kill()` | 66 |
| 4795 | `_checkArenaWin()` | 24 |
| 4819 | `_dmgArc()` | 79 |
| 4898 | `_mkBanner()` | 9 |
| 4907 | `_updateKillSequenceHud()` | 13 |
| 4920 | `_resetKillSequence()` | 7 |
| 4927 | `_fragRestockStep()` | 7 |
| 4934 | `_playerKillFeedback()` | 18 |
| 4952 | `_acertoPrevisto()` | 5 |
| 4957 | `_hitmarker()` | 15 |
| 4972 | `_dmgNumber()` | 20 |
| 4992 | `_feed()` | 19 |
| 5011 | `_skullIcon()` | 6 |
| 5017 | `_killfeedWeaponIcon()` | 10 |
| 5027 | `_wpnIcon()` | 64 |
| 5091 | `_tracer()` | 30 |
| 5121 | `_landingFx()` | 27 |
| 5148 | `_puff()` | 39 |
| 5187 | `_holeDecalMat()` | 8 |
| 5195 | `_flash()` | 66 |
| 5261 | `_vmTetoTela()` | 10 |
| 5271 | `_muzzleWorld()` | 43 |
| 5314 | `_bocaLigada()` | 13 |
| 5327 | `_bocaTiroBot()` | 5 |
| 5332 | `_origemTracerJogador()` | 25 |
| 5357 | `_aimOrigin()` | 5 |
| 5362 | `_updateDoors()` | 10 |
| 5372 | `_updateFx()` | 75 |
| 5447 | `_ejectCasing()` | 18 |
| 5465 | `_makeCtfFlagTex()` | 23 |
| 5488 | `_paintFlagSymbol()` | 9 |
| 5497 | `_flagTexFor()` | 25 |
| 5522 | `_legadoSimbolo()` | 8 |
| 5530 | `_loadCtfSymbols()` | 22 |
| 5552 | `_makeCtfZoneTex()` | 31 |
| 5583 | `_makeSmokeTex()` | 10 |
| 5593 | `_updateSmokeHud()` | 7 |
| 5600 | `_grenadeSpatial()` | 14 |
| 5614 | `_spawnGrenade()` | 24 |
| 5638 | `_throwNade()` | 29 |
| 5667 | `_throwSmoke()` | 1 |
| 5668 | `_throwFrag()` | 3 |
| 5671 | `_flashLiberada()` | 2 |
| 5673 | `_equipNade()` | 18 |
| 5691 | `_unequipNade()` | 11 |
| 5702 | `_explodeFrag()` | 25 |
| 5727 | `_carregarFlashMint()` | 13 |
| 5740 | `_flashProvisoria()` | 17 |
| 5757 | `_cegueiraDe()` | 9 |
| 5766 | `_popFlash()` | 32 |
| 5798 | `_cegarJogador()` | 7 |
| 5805 | `_limparCegueira()` | 6 |
| 5811 | `_tickCegueiraJogador()` | 18 |
| 5829 | `_capturarRetida()` | 27 |
| 5856 | `_corDaFumaca()` | 16 |
| 5872 | `_popSmoke()` | 23 |
| 5895 | `_updateGrenades()` | 37 |
| 5932 | `_teamColor()` | 12 |
| 5944 | `_teamInk()` | 7 |
| 5951 | `_factionOf()` | 1 |
| 5952 | `_voiceKey()` | 2 |
| 5954 | `_teamName()` | 1 |
| 5955 | `_teamTag()` | 6 |
| 5961 | `_plaqueta()` | 17 |
| 5978 | `_uiV3()` | 1 |
| 5979 | `_mirror()` | 2 |
| 5981 | `_defNoLado()` | 3 |
| 5984 | `_botSeparation()` | 56 |
| 6040 | `_initCTF()` | 86 |
| 6126 | `_updateCTF()` | 66 |
| 6192 | `_ctfWin()` | 25 |
| 6217 | `_freeYaw()` | 27 |
| 6244 | `_pullString()` | 23 |
| 6267 | `_walkReach()` | 32 |
| 6299 | `_wpComp()` | 16 |
| 6315 | `_findPathLocal()` | 22 |
| 6337 | `_botCtf()` | 137 |
| 6474 | `_hideCtfHud()` | 6 |
| 6480 | `_updateCtfHud()` | 76 |
| 6556 | `_collide()` | 19 |
| 6575 | `_collideGrade()` | 25 |
| 6600 | `_collideRot()` | 22 |
| 6622 | `_mantleAlcance()` | 67 |
| 6689 | `_mantleColliders()` | 10 |
| 6699 | `_mantleAlcancavel()` | 12 |
| 6711 | `_mantleTarget()` | 32 |
| 6743 | `_beginMantle()` | 16 |
| 6759 | `_stepMantle()` | 29 |
| 6788 | `_freeSpot()` | 30 |
| 6818 | `_retaAndavel()` | 20 |
| 6838 | `_walkDepth()` | 16 |
| 6854 | `_noteHit()` | 17 |
| 6871 | `_deathFeedback()` | 45 |
| 6916 | `_toggleCamView()` | 6 |
| 6922 | `_swapShoulder()` | 7 |
| 6929 | `setCamView()` | 19 |
| 6948 | `_syncCamViewVis()` | 8 |
| 6956 | `_ensurePlayerTP()` | 80 |
| 7036 | `_updatePlayerTP()` | 26 |
| 7062 | `_updatePlayerTPCamera()` | 105 |
| 7167 | `_updateCrosshairParallax()` | 46 |
| 7213 | `_tpDeath()` | 55 |
| 7268 | `_tpRevive()` | 20 |
| 7288 | `_moveEntity()` | 136 |
| 7424 | `_updatePlayer()` | 366 |
| 7790 | `_footstepSurface()` | 15 |
| 7805 | `_updatePickups()` | 156 |
| 7961 | `_botPegaArma()` | 5 |
| 7966 | `_wpnMode()` | 7 |
| 7973 | `_botWeapon()` | 10 |
| 7983 | `_municaoInfinita()` | 1 |
| 7984 | `_pickupAllowed()` | 8 |
| 7992 | `_slotPrimaria()` | 1 |
| 7993 | `_largarArma()` | 3 |
| 7996 | `_grabNearPickup()` | 10 |
| 8006 | `_grabPickup()` | 36 |
| 8042 | `_assentarNoChao()` | 10 |
| 8052 | `refreshPickupModels()` | 24 |
| 8076 | `_dropWeapon()` | 20 |
| 8096 | `_sumirDrop()` | 36 |
| 8132 | `_spawnY()` | 3 |
| 8135 | `_spawnYaw()` | 8 |
| 8143 | `_pickSpawn()` | 25 |
| 8168 | `_respawnPlayer()` | 48 |
| 8216 | `_losClear()` | 15 |
| 8231 | `_raioBloqueado()` | 18 |
| 8249 | `_botCall()` | 43 |
| 8292 | `_teamMarkTex()` | 23 |
| 8315 | `_makeTeamMark()` | 20 |
| 8335 | `_trocarPersonagem()` | 19 |
| 8354 | `_syncRemoteWeapon()` | 24 |
| 8378 | `_updateTeamMark()` | 21 |
| 8399 | `_posturaBot()` | 4 |
| 8403 | `_botEye()` | 1 |
| 8404 | `_enemyOf()` | 8 |
| 8412 | `_duelToken()` | 22 |
| 8434 | `_respawnEntity()` | 37 |
| 8471 | `_botOuve()` | 15 |
| 8486 | `_suavizaDestinoEscolta()` | 33 |
| 8519 | `_updateBot()` | 1016 |
| 9535 | `_flushTraining()` | 13 |
| 9548 | `_updateBotNN()` | 73 |
| 9621 | `_botShootNN()` | 31 |
| 9652 | `_radarFoot()` | 38 |
| 9690 | `_radarStatic()` | 31 |
| 9721 | `_updateRadar()` | 91 |
| 9812 | `_banner()` | 26 |
| 9838 | `_resultadoDaRodada()` | 4 |
| 9842 | `_botaoAmigo()` | 5 |
| 9847 | `_ligarAmigoPlacar()` | 22 |
| 9869 | `_showScoreboard()` | 63 |
| 9932 | `_updateWeaponHud()` | 43 |
| 9975 | `_updateHud()` | 138 |
| 10113 | `update()` | 96 |
| 10209 | `dispose()` | 77 |

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
