# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.137 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 9825 | 424 |
| `public/js/main.js` | 5568 | 430 |
| `public/js/glbchars.js` | 1512 | 107 |
| `public/js/characters.js` | 1111 | 40 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3364 linhas (34% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 831 | 8303 | `_updateBot()` | ⚠️ candidato a extração |
| 638 | 798 | `constructor()` | 🔴 append-only |
| 359 | 7289 | `_updatePlayer()` | ⚠️ candidato a extração |
| 287 | 2931 | `_resetPositions()` |  |
| 159 | 7661 | `_updatePickups()` |  |
| 141 | 2341 | `_touchControls()` |  |
| 137 | 6234 | `_botCtf()` |  |
| 136 | 9531 | `_updateHud()` |  |
| 131 | 7158 | `_moveEntity()` |  |
| 105 | 6932 | `_updatePlayerTPCamera()` |  |
| 100 | 4110 | `_tryShoot()` |  |
| 95 | 9667 | `update()` | 🔴 append-only |
| 86 | 5945 | `_initCTF()` |  |
| 80 | 3528 | `_switchTeam()` |  |
| 79 | 3644 | `_ensureVmPrecisionQa()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `397–400` `502–596` `626–647` `1540–1827` `3608–3643` `3891–3992` `4064–4209` `4224–4239` `4404–4431` `5019–5048` `5096–5214` `5348–5365` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `217–220` `271–271` `304–315` `689–700` `4601–4722` `5884–5944` `6116–6370` `6453–6475` `7289–7647` `8067–8084` `8226–8256` `8303–9133` | — |
| **MAPAS / MUNDO** | `1483–1539` `2931–3217` `5945–6091` `7661–7819` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1984–1993` `2109–2147` `3494–3507` `5049–5087` `5273–5347` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1436–1482` `3446–3468` `3484–3493` `3508–3527` `4747–4825` `4885–4938` `4955–5018` `9320–9367` `9425–9487` `9531–9666` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 9667–9761 · `_dom()` 1436–1482 · `constructor()` 798–1435

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3964 de 9825 linhas (40%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 66 | `QS` | 3 |
| 72 | `ANNOUNCER_LAB` | 4 |
| 76 | `VMLAB` | 3 |
| 81 | `VM_QA_CICLO` | 3 |
| 85 | `VM_QA_ADS` | 4 |
| 90 | `FLASH_DEBUG_N` | 3 |
| 93 | `NADE_ESTOQUE` | 8 |
| 101 | `VM_MAT_LEGACY` | 4 |
| 107 | `DROP_TTL` | 8 |
| 115 | `ROUNDS_MAX` | 27 |
| 143 | `CTF_ROUNDS_TO_WIN` | 4 |
| 148 | `sanitizeRounds` | 4 |
| 153 | `CTF_CLOCK_SHOW` | 4 |
| 157 | `KILLS_PER_PLAYER` | 7 |
| 164 | `PACE` | 33 |
| 197 | `PAUSE_ARM_MS` | 3 |
| 200 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 210 | `confirmGate` | 7 |
| 221 | `BOT_AIM_PITCH` | 4 |
| 225 | `BOT_DMG_PLAYER` | 21 |
| 246 | `BOT_FAIR` | 5 |
| 251 | `BOT_MOVE2` | 15 |
| 275 | `BOT_FOCUS_MIN` | 3 |
| 282 | `BOT_OUVE_PASSO` | 22 |
| 308 | `BOT_TOKEN_REST` | 7 |
| 316 | `MOVE_MUL` | 6 |
| 323 | `MOVE2` | 4 |
| 327 | `STEP_H` | 3 |
| 342 | `EMPTY_COLLIDERS` | 5 |
| 347 | `RACK_OLD` | 4 |
| 351 | `RACK_RETA` | 25 |
| 376 | `REGEN` | 3 |
| 382 | `ARMADURA_DEBUG` | 3 |
| 386 | `RADIO` | 5 |
| 392 | `MK_LABELS` | 5 |
| 397 | `GUNFEEL` | 4 |
| 402 | `PUNCH_ZOOM` | 3 |
| 405 | `BOCA_CORPO` | 3 |
| 408 | `bocaLocalDaArma` | 22 |
| 430 | `TRACER_STYLE` | 6 |
| 440 | `ADS_RAMPA_S` | 3 |
| 444 | `aberturaCone` | 16 |
| 460 | `anguloDeDisparo` | 4 |
| 464 | `coneDoDisparo` | 16 |
| 482 | `MOBILE_RADAR_INTERVAL` | 3 |
| 485 | `TOUCH_LOOK_RAD_PX` | 4 |
| 489 | `DMG_FALLOFF` | 5 |
| 494 | `HS_MUL` | 3 |
| 497 | `BALL_CLASS` | 5 |
| 502 | `STATIC_CLASS` | 75 |
| 578 | `VM_KNOB` | 19 |
| 597 | `vmAdsRot` | 4 |
| 602 | `vmFovForAspect` | 24 |
| 626 | `VM_OFF` | 22 |
| 648 | `vmOffY` | 35 |
| 683 | `VMP` | 6 |
| 689 | `BOT_SKILLS` | 11 |
| 701 | `diffKey` | 4 |
| 706 | `rollBotSkill` | 7 |
| 713 | `botTier` | 4 |
| 717 | `_cyclePool` | 5 |
| 722 | `_rosterPool` | 22 |
| 746 | `_pinnedDefs` | 5 |
| 751 | `pickMatchRoster` | 21 |
| 772 | `BOT_WEAPON_POOL` | 5 |
| 777 | `pickMatchWeapons` | 9 |
| 786 | `aguardarPreloads` | 9 |
| 798 | `constructor()` | 638 |
| 1436 | `_dom()` | 47 |
| 1483 | `_buildEnv()` | 57 |
| 1540 | `_buildViewModels()` | 3 |
| 1543 | `_vmFrame` | 285 |
| 1828 | `_vmFrame` | 142 |
| 1970 | `_vmMontarTardio` | 14 |
| 1984 | `_makePuffTexture()` | 10 |
| 1994 | `_makeBloodTex()` | 19 |
| 2013 | `_makeBloodPoolTex()` | 21 |
| 2034 | `_bloodDecal()` | 16 |
| 2050 | `_makeBloodFx()` | 21 |
| 2071 | `_bloodSpatter()` | 18 |
| 2089 | `_bloodPoolAt()` | 6 |
| 2095 | `_updateBlood()` | 14 |
| 2109 | `_makeFlashTex()` | 21 |
| 2130 | `_makeFlashSoftTex()` | 8 |
| 2138 | `_makeFlashCoreTex()` | 10 |
| 2148 | `_input()` | 6 |
| 2154 | `_kd` | 72 |
| 2226 | `_ku` | 5 |
| 2231 | `_md` | 43 |
| 2274 | `_mu` | 7 |
| 2281 | `_mm` | 20 |
| 2301 | `_wh` | 17 |
| 2318 | `_cc` | 1 |
| 2319 | `_blur` | 1 |
| 2320 | `_hiddenInput` | 1 |
| 2321 | `_plc` | 20 |
| 2341 | `_touchControls()` | 141 |
| 2482 | `_releaseInput()` | 11 |
| 2493 | `_touchLook()` | 12 |
| 2505 | `_syncTouchWeps()` | 18 |
| 2523 | `_aimAssist()` | 28 |
| 2551 | `_requestLock()` | 27 |
| 2578 | `_travaAtalhos()` | 17 |
| 2595 | `_soltaAtalhos()` | 6 |
| 2601 | `espectando()` | 2 |
| 2603 | `_acceptInput()` | 7 |
| 2610 | `travarEntrada()` | 13 |
| 2623 | `_chatSeguraPausa()` | 5 |
| 2628 | `_pauseBackdrop()` | 7 |
| 2635 | `_radioShow()` | 6 |
| 2641 | `_radioUi()` | 10 |
| 2651 | `_emoteToggle()` | 10 |
| 2661 | `_emoteMods()` | 9 |
| 2670 | `_emoteUi()` | 20 |
| 2690 | `_emoteClose()` | 6 |
| 2696 | `_emotePick()` | 11 |
| 2707 | `_emoteCtrl()` | 4 |
| 2711 | `_emoteStop()` | 10 |
| 2721 | `_emoteTick()` | 7 |
| 2728 | `_radioPick()` | 20 |
| 2748 | `_abilityNotice()` | 10 |
| 2758 | `_resetSliceAbilities()` | 9 |
| 2767 | `_stackTrace()` | 28 |
| 2795 | `_updateMotocaCharge()` | 10 |
| 2805 | `_recordRoutePoint()` | 11 |
| 2816 | `_routePing()` | 23 |
| 2839 | `_tickRoutePings()` | 12 |
| 2851 | `_objectiveInteractionMultiplier()` | 14 |
| 2865 | `start()` | 5 |
| 2870 | `_startAnnouncerLab()` | 9 |
| 2879 | `_startRound()` | 52 |
| 2931 | `_resetPositions()` | 287 |
| 3218 | `_checkCtfAlvo()` | 13 |
| 3231 | `_checkPace()` | 13 |
| 3244 | `_endRound()` | 37 |
| 3281 | `_roundWinnerVoice()` | 12 |
| 3293 | `_fimDaPartida()` | 10 |
| 3303 | `_modeId()` | 1 |
| 3304 | `_teamPopulation()` | 5 |
| 3309 | `_endMatch()` | 73 |
| 3382 | `_ensureDolly()` | 41 |
| 3423 | `_tickDolly()` | 23 |
| 3446 | `setPaused()` | 23 |
| 3469 | `_now()` | 3 |
| 3472 | `pauseArmed()` | 1 |
| 3473 | `_syncPauseArm()` | 7 |
| 3480 | `resume()` | 4 |
| 3484 | `applySettings()` | 10 |
| 3494 | `_applyQuality()` | 14 |
| 3508 | `onResize()` | 20 |
| 3528 | `_switchTeam()` | 80 |
| 3608 | `_applyVmVisibility()` | 36 |
| 3644 | `_ensureVmPrecisionQa()` | 79 |
| 3723 | `_syncVmPresentation()` | 22 |
| 3745 | `_utilidadeNaMao()` | 7 |
| 3752 | `_vmlabEnsure()` | 14 |
| 3766 | `_vmlabFrame()` | 28 |
| 3794 | `_tuneGet()` | 15 |
| 3809 | `_tune()` | 23 |
| 3832 | `_fxSet()` | 1 |
| 3833 | `aplicarEfeitosAdaptativos()` | 20 |
| 3853 | `_qaCicloArma()` | 8 |
| 3861 | `_cycleWeapon()` | 8 |
| 3869 | `_inspectWeapon()` | 8 |
| 3877 | `_cancelInspect()` | 4 |
| 3881 | `_inspectMix()` | 10 |
| 3891 | `_switchWeapon()` | 43 |
| 3934 | `_deploySfx()` | 7 |
| 3941 | `_scope()` | 18 |
| 3959 | `_zoomFov()` | 5 |
| 3964 | `_reloading()` | 1 |
| 3965 | `_startReload()` | 28 |
| 3993 | `_cancelReload()` | 14 |
| 4007 | `_abortarArmaNaMorte()` | 14 |
| 4021 | `_voltarPraBase()` | 16 |
| 4037 | `_armasServidasPelaRecarga()` | 9 |
| 4046 | `_reloadLayers()` | 18 |
| 4064 | `_installRecoil()` | 33 |
| 4097 | `_shotRecoil()` | 13 |
| 4110 | `_tryShoot()` | 100 |
| 4210 | `_tryKnifeAttack()` | 14 |
| 4224 | `_meleeHit()` | 16 |
| 4240 | `_meleeRange()` | 5 |
| 4245 | `_botMelee()` | 26 |
| 4271 | `_distanceDamage()` | 7 |
| 4278 | `_shotDamage()` | 10 |
| 4288 | `_consultarTiro()` | 15 |
| 4303 | `_perfilCabeca()` | 7 |
| 4310 | `_origemTiroBot()` | 4 |
| 4314 | `_miraTiroBot()` | 13 |
| 4327 | `_participanteHumano()` | 4 |
| 4331 | `_resolverTiroBot()` | 11 |
| 4342 | `_danoTiroBot()` | 12 |
| 4354 | `_aplicarTiroBot()` | 13 |
| 4367 | `_dispararBot()` | 29 |
| 4396 | `_rastroTiroBot()` | 8 |
| 4404 | `_fireHitscan()` | 28 |
| 4432 | `_targetFromHit()` | 9 |
| 4441 | `_penetrationExit()` | 8 |
| 4449 | `_surfaceOf()` | 27 |
| 4476 | `_armoredTarget()` | 6 |
| 4494 | `_entidadeEscolta()` | 1 |
| 4482 | `_aplicaArmadura()` | 10 |
| 4492 | `_armaduraLigada()` | 1 |
| 4493 | `_equiparArmadura()` | 8 |
| 4501 | `_updateArmaduraHud()` | 13 |
| 4514 | `_sincronizarArmaduraVisual()` | 6 |
| 4520 | `_fleshImpact()` | 38 |
| 4558 | `_fxVoice()` | 9 |
| 4567 | `_impactSfx()` | 17 |
| 4584 | `_tintFx()` | 17 |
| 4601 | `_damage()` | 51 |
| 4652 | `_playerHurtFx()` | 5 |
| 4657 | `_kill()` | 66 |
| 4723 | `_checkArenaWin()` | 24 |
| 4747 | `_dmgArc()` | 79 |
| 4826 | `_mkBanner()` | 9 |
| 4835 | `_updateKillSequenceHud()` | 13 |
| 4848 | `_resetKillSequence()` | 7 |
| 4855 | `_fragRestockStep()` | 7 |
| 4862 | `_playerKillFeedback()` | 18 |
| 4880 | `_acertoPrevisto()` | 5 |
| 4885 | `_hitmarker()` | 15 |
| 4900 | `_dmgNumber()` | 20 |
| 4920 | `_feed()` | 19 |
| 4939 | `_skullIcon()` | 6 |
| 4945 | `_killfeedWeaponIcon()` | 10 |
| 4955 | `_wpnIcon()` | 64 |
| 5019 | `_tracer()` | 30 |
| 5049 | `_puff()` | 39 |
| 5088 | `_holeDecalMat()` | 8 |
| 5096 | `_flash()` | 66 |
| 5162 | `_vmTetoTela()` | 10 |
| 5172 | `_muzzleWorld()` | 43 |
| 5215 | `_bocaLigada()` | 13 |
| 5228 | `_bocaTiroBot()` | 5 |
| 5233 | `_origemTracerJogador()` | 25 |
| 5258 | `_aimOrigin()` | 5 |
| 5263 | `_updateDoors()` | 10 |
| 5273 | `_updateFx()` | 75 |
| 5348 | `_ejectCasing()` | 18 |
| 5366 | `_makeCtfFlagTex()` | 23 |
| 5389 | `_paintFlagSymbol()` | 9 |
| 5398 | `_flagTexFor()` | 25 |
| 5423 | `_legadoSimbolo()` | 8 |
| 5431 | `_loadCtfSymbols()` | 22 |
| 5453 | `_makeCtfZoneTex()` | 31 |
| 5484 | `_makeSmokeTex()` | 10 |
| 5494 | `_updateSmokeHud()` | 7 |
| 5501 | `_grenadeSpatial()` | 14 |
| 5515 | `_spawnGrenade()` | 24 |
| 5539 | `_throwNade()` | 28 |
| 5567 | `_throwSmoke()` | 1 |
| 5568 | `_throwFrag()` | 3 |
| 5571 | `_flashLiberada()` | 2 |
| 5573 | `_equipNade()` | 18 |
| 5591 | `_unequipNade()` | 11 |
| 5602 | `_explodeFrag()` | 25 |
| 5627 | `_carregarFlashMint()` | 13 |
| 5640 | `_flashProvisoria()` | 17 |
| 5657 | `_cegueiraDe()` | 9 |
| 5666 | `_popFlash()` | 32 |
| 5698 | `_cegarJogador()` | 7 |
| 5705 | `_limparCegueira()` | 6 |
| 5711 | `_tickCegueiraJogador()` | 18 |
| 5729 | `_capturarRetida()` | 27 |
| 5756 | `_corDaFumaca()` | 16 |
| 5772 | `_popSmoke()` | 23 |
| 5795 | `_updateGrenades()` | 37 |
| 5832 | `_teamColor()` | 12 |
| 5844 | `_teamInk()` | 7 |
| 5851 | `_factionOf()` | 1 |
| 5852 | `_voiceKey()` | 2 |
| 5854 | `_teamName()` | 1 |
| 5855 | `_teamTag()` | 6 |
| 5861 | `_plaqueta()` | 17 |
| 5878 | `_uiV3()` | 1 |
| 5879 | `_mirror()` | 2 |
| 5881 | `_defNoLado()` | 3 |
| 5884 | `_botSeparation()` | 61 |
| 5945 | `_initCTF()` | 86 |
| 6031 | `_updateCTF()` | 61 |
| 6092 | `_ctfWin()` | 24 |
| 6116 | `_freeYaw()` | 25 |
| 6141 | `_pullString()` | 23 |
| 6164 | `_walkReach()` | 32 |
| 6196 | `_wpComp()` | 16 |
| 6212 | `_findPathLocal()` | 22 |
| 6234 | `_botCtf()` | 137 |
| 6371 | `_hideCtfHud()` | 6 |
| 6377 | `_updateCtfHud()` | 76 |
| 6453 | `_collide()` | 23 |
| 6476 | `_collideRot()` | 22 |
| 6498 | `_mantleAlcance()` | 62 |
| 6560 | `_mantleColliders()` | 10 |
| 6570 | `_mantleAlcancavel()` | 12 |
| 6582 | `_mantleTarget()` | 32 |
| 6614 | `_beginMantle()` | 16 |
| 6630 | `_stepMantle()` | 29 |
| 6659 | `_freeSpot()` | 30 |
| 6689 | `_retaAndavel()` | 20 |
| 6709 | `_walkDepth()` | 16 |
| 6725 | `_noteHit()` | 17 |
| 6742 | `_deathFeedback()` | 45 |
| 6787 | `_toggleCamView()` | 6 |
| 6793 | `_swapShoulder()` | 7 |
| 6800 | `setCamView()` | 19 |
| 6819 | `_syncCamViewVis()` | 8 |
| 6827 | `_ensurePlayerTP()` | 79 |
| 6906 | `_updatePlayerTP()` | 26 |
| 6932 | `_updatePlayerTPCamera()` | 105 |
| 7037 | `_updateCrosshairParallax()` | 46 |
| 7083 | `_tpDeath()` | 55 |
| 7138 | `_tpRevive()` | 20 |
| 7158 | `_moveEntity()` | 131 |
| 7289 | `_updatePlayer()` | 359 |
| 7648 | `_footstepSurface()` | 13 |
| 7661 | `_updatePickups()` | 159 |
| 7839 | `_botPegaArma()` | 5 |
| 7820 | `_wpnMode()` | 7 |
| 7827 | `_botWeapon()` | 10 |
| 7837 | `_municaoInfinita()` | 1 |
| 7838 | `_pickupAllowed()` | 8 |
| 7846 | `_slotPrimaria()` | 1 |
| 7847 | `_largarArma()` | 3 |
| 7850 | `_grabNearPickup()` | 10 |
| 7860 | `_grabPickup()` | 36 |
| 7896 | `_assentarNoChao()` | 10 |
| 7906 | `refreshPickupModels()` | 24 |
| 7930 | `_dropWeapon()` | 20 |
| 7950 | `_sumirDrop()` | 36 |
| 7986 | `_spawnY()` | 3 |
| 7989 | `_spawnYaw()` | 5 |
| 7994 | `_pickSpawn()` | 25 |
| 8019 | `_respawnPlayer()` | 48 |
| 8067 | `_losClear()` | 18 |
| 8085 | `_botCall()` | 41 |
| 8126 | `_teamMarkTex()` | 23 |
| 8149 | `_makeTeamMark()` | 16 |
| 8165 | `_trocarPersonagem()` | 19 |
| 8184 | `_syncRemoteWeapon()` | 23 |
| 8207 | `_updateTeamMark()` | 15 |
| 8222 | `_posturaBot()` | 4 |
| 8226 | `_botEye()` | 1 |
| 8227 | `_enemyOf()` | 8 |
| 8235 | `_duelToken()` | 22 |
| 8257 | `_respawnEntity()` | 34 |
| 8291 | `_botOuve()` | 12 |
| 8362 | `_suavizaDestinoEscolta()` | 36 |
| 8303 | `_updateBot()` | 831 |
| 9134 | `_flushTraining()` | 13 |
| 9147 | `_updateBotNN()` | 73 |
| 9220 | `_botShootNN()` | 31 |
| 9251 | `_radarFoot()` | 38 |
| 9289 | `_radarStatic()` | 31 |
| 9320 | `_updateRadar()` | 48 |
| 9368 | `_banner()` | 26 |
| 9394 | `_resultadoDaRodada()` | 4 |
| 9398 | `_botaoAmigo()` | 5 |
| 9403 | `_ligarAmigoPlacar()` | 22 |
| 9425 | `_showScoreboard()` | 63 |
| 9488 | `_updateWeaponHud()` | 43 |
| 9531 | `_updateHud()` | 136 |
| 9667 | `update()` | 95 |
| 9762 | `dispose()` | 63 |

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
