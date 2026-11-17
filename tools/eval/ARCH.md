# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.155 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 10287 | 437 |
| `public/js/main.js` | 5818 | 449 |
| `public/js/glbchars.js` | 2170 | 156 |
| `public/js/characters.js` | 1243 | 40 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3582 linhas (35% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 1016 | 8520 | `_updateBot()` | ⚠️ candidato a extração |
| 646 | 816 | `constructor()` | 🔴 append-only |
| 366 | 7425 | `_updatePlayer()` | ⚠️ candidato a extração |
| 288 | 2978 | `_resetPositions()` |  |
| 156 | 7806 | `_updatePickups()` |  |
| 141 | 2379 | `_touchControls()` |  |
| 138 | 9976 | `_updateHud()` |  |
| 137 | 6338 | `_botCtf()` |  |
| 136 | 7289 | `_moveEntity()` |  |
| 105 | 7063 | `_updatePlayerTPCamera()` |  |
| 100 | 4180 | `_tryShoot()` |  |
| 96 | 10114 | `update()` | 🔴 append-only |
| 91 | 9722 | `_updateRadar()` |  |
| 86 | 6041 | `_initCTF()` |  |
| 80 | 3369 | `_endMatch()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `404–407` `516–610` `640–661` `1566–1853` `3676–3713` `3961–4062` `4134–4279` `4295–4310` `4475–4502` `5092–5121` `5196–5314` `5448–5465` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `223–227` `278–278` `311–322` `703–714` `4674–4795` `5985–6040` `6218–6474` `6557–6575` `7425–7790` `8217–8231` `8404–8434` `8520–9535` | — |
| **MAPAS / MUNDO** | `1509–1565` `2978–3265` `6041–6192` `7806–7961` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `2013–2022` `2138–2176` `3561–3575` `5149–5187` `5373–5447` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1462–1508` `3513–3535` `3551–3560` `3576–3595` `4820–4898` `4958–5011` `5028–5091` `9722–9812` `9870–9932` `9976–10113` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 10114–10209 · `_dom()` 1462–1508 · `constructor()` 816–1461

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **4197 de 10287 linhas (41%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 3369 | `_endMatch()` | 80 |
| 3449 | `_ensureDolly()` | 41 |
| 3490 | `_tickDolly()` | 23 |
| 3513 | `setPaused()` | 23 |
| 3536 | `_now()` | 3 |
| 3539 | `pauseArmed()` | 1 |
| 3540 | `_syncPauseArm()` | 7 |
| 3547 | `resume()` | 4 |
| 3551 | `applySettings()` | 10 |
| 3561 | `_applyQuality()` | 15 |
| 3576 | `onResize()` | 20 |
| 3596 | `_switchTeam()` | 80 |
| 3676 | `_applyVmVisibility()` | 38 |
| 3714 | `_ensureVmPrecisionQa()` | 79 |
| 3793 | `_syncVmPresentation()` | 22 |
| 3815 | `_utilidadeNaMao()` | 7 |
| 3822 | `_vmlabEnsure()` | 14 |
| 3836 | `_vmlabFrame()` | 28 |
| 3864 | `_tuneGet()` | 15 |
| 3879 | `_tune()` | 23 |
| 3902 | `_fxSet()` | 1 |
| 3903 | `aplicarEfeitosAdaptativos()` | 20 |
| 3923 | `_qaCicloArma()` | 8 |
| 3931 | `_cycleWeapon()` | 8 |
| 3939 | `_inspectWeapon()` | 8 |
| 3947 | `_cancelInspect()` | 4 |
| 3951 | `_inspectMix()` | 10 |
| 3961 | `_switchWeapon()` | 43 |
| 4004 | `_deploySfx()` | 7 |
| 4011 | `_scope()` | 18 |
| 4029 | `_zoomFov()` | 5 |
| 4034 | `_reloading()` | 1 |
| 4035 | `_startReload()` | 28 |
| 4063 | `_cancelReload()` | 14 |
| 4077 | `_abortarArmaNaMorte()` | 14 |
| 4091 | `_voltarPraBase()` | 16 |
| 4107 | `_armasServidasPelaRecarga()` | 9 |
| 4116 | `_reloadLayers()` | 18 |
| 4134 | `_installRecoil()` | 33 |
| 4167 | `_shotRecoil()` | 13 |
| 4180 | `_tryShoot()` | 100 |
| 4280 | `_tryKnifeAttack()` | 15 |
| 4295 | `_meleeHit()` | 16 |
| 4311 | `_meleeRange()` | 5 |
| 4316 | `_botMelee()` | 26 |
| 4342 | `_distanceDamage()` | 7 |
| 4349 | `_shotDamage()` | 10 |
| 4359 | `_consultarTiro()` | 15 |
| 4374 | `_perfilCabeca()` | 7 |
| 4381 | `_origemTiroBot()` | 4 |
| 4385 | `_miraTiroBot()` | 13 |
| 4398 | `_participanteHumano()` | 4 |
| 4402 | `_resolverTiroBot()` | 11 |
| 4413 | `_danoTiroBot()` | 12 |
| 4425 | `_aplicarTiroBot()` | 13 |
| 4438 | `_dispararBot()` | 29 |
| 4467 | `_rastroTiroBot()` | 8 |
| 4475 | `_fireHitscan()` | 28 |
| 4503 | `_targetFromHit()` | 9 |
| 4512 | `_penetrationExit()` | 8 |
| 4520 | `_surfaceOf()` | 27 |
| 4547 | `_armoredTarget()` | 6 |
| 4553 | `_entidadeEscolta()` | 1 |
| 4554 | `_aplicaArmadura()` | 11 |
| 4565 | `_armaduraLigada()` | 1 |
| 4566 | `_equiparArmadura()` | 8 |
| 4574 | `_updateArmaduraHud()` | 13 |
| 4587 | `_sincronizarArmaduraVisual()` | 6 |
| 4593 | `_fleshImpact()` | 38 |
| 4631 | `_fxVoice()` | 9 |
| 4640 | `_impactSfx()` | 17 |
| 4657 | `_tintFx()` | 17 |
| 4674 | `_damage()` | 51 |
| 4725 | `_playerHurtFx()` | 5 |
| 4730 | `_kill()` | 66 |
| 4796 | `_checkArenaWin()` | 24 |
| 4820 | `_dmgArc()` | 79 |
| 4899 | `_mkBanner()` | 9 |
| 4908 | `_updateKillSequenceHud()` | 13 |
| 4921 | `_resetKillSequence()` | 7 |
| 4928 | `_fragRestockStep()` | 7 |
| 4935 | `_playerKillFeedback()` | 18 |
| 4953 | `_acertoPrevisto()` | 5 |
| 4958 | `_hitmarker()` | 15 |
| 4973 | `_dmgNumber()` | 20 |
| 4993 | `_feed()` | 19 |
| 5012 | `_skullIcon()` | 6 |
| 5018 | `_killfeedWeaponIcon()` | 10 |
| 5028 | `_wpnIcon()` | 64 |
| 5092 | `_tracer()` | 30 |
| 5122 | `_landingFx()` | 27 |
| 5149 | `_puff()` | 39 |
| 5188 | `_holeDecalMat()` | 8 |
| 5196 | `_flash()` | 66 |
| 5262 | `_vmTetoTela()` | 10 |
| 5272 | `_muzzleWorld()` | 43 |
| 5315 | `_bocaLigada()` | 13 |
| 5328 | `_bocaTiroBot()` | 5 |
| 5333 | `_origemTracerJogador()` | 25 |
| 5358 | `_aimOrigin()` | 5 |
| 5363 | `_updateDoors()` | 10 |
| 5373 | `_updateFx()` | 75 |
| 5448 | `_ejectCasing()` | 18 |
| 5466 | `_makeCtfFlagTex()` | 23 |
| 5489 | `_paintFlagSymbol()` | 9 |
| 5498 | `_flagTexFor()` | 25 |
| 5523 | `_legadoSimbolo()` | 8 |
| 5531 | `_loadCtfSymbols()` | 22 |
| 5553 | `_makeCtfZoneTex()` | 31 |
| 5584 | `_makeSmokeTex()` | 10 |
| 5594 | `_updateSmokeHud()` | 7 |
| 5601 | `_grenadeSpatial()` | 14 |
| 5615 | `_spawnGrenade()` | 24 |
| 5639 | `_throwNade()` | 29 |
| 5668 | `_throwSmoke()` | 1 |
| 5669 | `_throwFrag()` | 3 |
| 5672 | `_flashLiberada()` | 2 |
| 5674 | `_equipNade()` | 18 |
| 5692 | `_unequipNade()` | 11 |
| 5703 | `_explodeFrag()` | 25 |
| 5728 | `_carregarFlashMint()` | 13 |
| 5741 | `_flashProvisoria()` | 17 |
| 5758 | `_cegueiraDe()` | 9 |
| 5767 | `_popFlash()` | 32 |
| 5799 | `_cegarJogador()` | 7 |
| 5806 | `_limparCegueira()` | 6 |
| 5812 | `_tickCegueiraJogador()` | 18 |
| 5830 | `_capturarRetida()` | 27 |
| 5857 | `_corDaFumaca()` | 16 |
| 5873 | `_popSmoke()` | 23 |
| 5896 | `_updateGrenades()` | 37 |
| 5933 | `_teamColor()` | 12 |
| 5945 | `_teamInk()` | 7 |
| 5952 | `_factionOf()` | 1 |
| 5953 | `_voiceKey()` | 2 |
| 5955 | `_teamName()` | 1 |
| 5956 | `_teamTag()` | 6 |
| 5962 | `_plaqueta()` | 17 |
| 5979 | `_uiV3()` | 1 |
| 5980 | `_mirror()` | 2 |
| 5982 | `_defNoLado()` | 3 |
| 5985 | `_botSeparation()` | 56 |
| 6041 | `_initCTF()` | 86 |
| 6127 | `_updateCTF()` | 66 |
| 6193 | `_ctfWin()` | 25 |
| 6218 | `_freeYaw()` | 27 |
| 6245 | `_pullString()` | 23 |
| 6268 | `_walkReach()` | 32 |
| 6300 | `_wpComp()` | 16 |
| 6316 | `_findPathLocal()` | 22 |
| 6338 | `_botCtf()` | 137 |
| 6475 | `_hideCtfHud()` | 6 |
| 6481 | `_updateCtfHud()` | 76 |
| 6557 | `_collide()` | 19 |
| 6576 | `_collideGrade()` | 25 |
| 6601 | `_collideRot()` | 22 |
| 6623 | `_mantleAlcance()` | 67 |
| 6690 | `_mantleColliders()` | 10 |
| 6700 | `_mantleAlcancavel()` | 12 |
| 6712 | `_mantleTarget()` | 32 |
| 6744 | `_beginMantle()` | 16 |
| 6760 | `_stepMantle()` | 29 |
| 6789 | `_freeSpot()` | 30 |
| 6819 | `_retaAndavel()` | 20 |
| 6839 | `_walkDepth()` | 16 |
| 6855 | `_noteHit()` | 17 |
| 6872 | `_deathFeedback()` | 45 |
| 6917 | `_toggleCamView()` | 6 |
| 6923 | `_swapShoulder()` | 7 |
| 6930 | `setCamView()` | 19 |
| 6949 | `_syncCamViewVis()` | 8 |
| 6957 | `_ensurePlayerTP()` | 80 |
| 7037 | `_updatePlayerTP()` | 26 |
| 7063 | `_updatePlayerTPCamera()` | 105 |
| 7168 | `_updateCrosshairParallax()` | 46 |
| 7214 | `_tpDeath()` | 55 |
| 7269 | `_tpRevive()` | 20 |
| 7289 | `_moveEntity()` | 136 |
| 7425 | `_updatePlayer()` | 366 |
| 7791 | `_footstepSurface()` | 15 |
| 7806 | `_updatePickups()` | 156 |
| 7962 | `_botPegaArma()` | 5 |
| 7967 | `_wpnMode()` | 7 |
| 7974 | `_botWeapon()` | 10 |
| 7984 | `_municaoInfinita()` | 1 |
| 7985 | `_pickupAllowed()` | 8 |
| 7993 | `_slotPrimaria()` | 1 |
| 7994 | `_largarArma()` | 3 |
| 7997 | `_grabNearPickup()` | 10 |
| 8007 | `_grabPickup()` | 36 |
| 8043 | `_assentarNoChao()` | 10 |
| 8053 | `refreshPickupModels()` | 24 |
| 8077 | `_dropWeapon()` | 20 |
| 8097 | `_sumirDrop()` | 36 |
| 8133 | `_spawnY()` | 3 |
| 8136 | `_spawnYaw()` | 8 |
| 8144 | `_pickSpawn()` | 25 |
| 8169 | `_respawnPlayer()` | 48 |
| 8217 | `_losClear()` | 15 |
| 8232 | `_raioBloqueado()` | 18 |
| 8250 | `_botCall()` | 43 |
| 8293 | `_teamMarkTex()` | 23 |
| 8316 | `_makeTeamMark()` | 20 |
| 8336 | `_trocarPersonagem()` | 19 |
| 8355 | `_syncRemoteWeapon()` | 24 |
| 8379 | `_updateTeamMark()` | 21 |
| 8400 | `_posturaBot()` | 4 |
| 8404 | `_botEye()` | 1 |
| 8405 | `_enemyOf()` | 8 |
| 8413 | `_duelToken()` | 22 |
| 8435 | `_respawnEntity()` | 37 |
| 8472 | `_botOuve()` | 15 |
| 8487 | `_suavizaDestinoEscolta()` | 33 |
| 8520 | `_updateBot()` | 1016 |
| 9536 | `_flushTraining()` | 13 |
| 9549 | `_updateBotNN()` | 73 |
| 9622 | `_botShootNN()` | 31 |
| 9653 | `_radarFoot()` | 38 |
| 9691 | `_radarStatic()` | 31 |
| 9722 | `_updateRadar()` | 91 |
| 9813 | `_banner()` | 26 |
| 9839 | `_resultadoDaRodada()` | 4 |
| 9843 | `_botaoAmigo()` | 5 |
| 9848 | `_ligarAmigoPlacar()` | 22 |
| 9870 | `_showScoreboard()` | 63 |
| 9933 | `_updateWeaponHud()` | 43 |
| 9976 | `_updateHud()` | 138 |
| 10114 | `update()` | 96 |
| 10210 | `dispose()` | 77 |

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
