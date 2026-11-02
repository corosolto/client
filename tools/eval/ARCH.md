# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.135 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 9773 | 422 |
| `public/js/main.js` | 5549 | 427 |
| `public/js/glbchars.js` | 1512 | 107 |
| `public/js/characters.js` | 1111 | 40 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3355 linhas (34% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 831 | 8264 | `_updateBot()` | ⚠️ candidato a extração |
| 638 | 798 | `constructor()` | 🔴 append-only |
| 359 | 7264 | `_updatePlayer()` | ⚠️ candidato a extração |
| 287 | 2927 | `_resetPositions()` |  |
| 159 | 7636 | `_updatePickups()` |  |
| 141 | 2341 | `_touchControls()` |  |
| 137 | 6209 | `_botCtf()` |  |
| 131 | 7133 | `_moveEntity()` |  |
| 128 | 9489 | `_updateHud()` |  |
| 105 | 6907 | `_updatePlayerTPCamera()` |  |
| 100 | 4085 | `_tryShoot()` |  |
| 95 | 9617 | `update()` | 🔴 append-only |
| 86 | 5920 | `_initCTF()` |  |
| 79 | 3619 | `_ensureVmPrecisionQa()` |  |
| 79 | 4724 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `397–400` `502–596` `626–647` `1540–1827` `3583–3618` `3866–3967` `4039–4184` `4199–4214` `4379–4406` `4996–5025` `5073–5191` `5325–5342` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `217–220` `271–271` `304–315` `689–700` `4576–4693` `5859–5919` `6091–6345` `6428–6450` `7264–7622` `8041–8058` `8192–8222` `8264–9094` | — |
| **MAPAS / MUNDO** | `1483–1539` `2927–3213` `5920–6066` `7636–7794` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1984–1993` `2109–2147` `3473–3486` `5026–5064` `5250–5324` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1436–1482` `3425–3447` `3463–3472` `3487–3506` `4724–4802` `4862–4915` `4932–4995` `9281–9328` `9386–9445` `9489–9616` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 9617–9711 · `_dom()` 1436–1482 · `constructor()` 798–1435

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3949 de 9773 linhas (40%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 2879 | `_startRound()` | 48 |
| 2927 | `_resetPositions()` | 287 |
| 3214 | `_checkCtfAlvo()` | 13 |
| 3227 | `_checkPace()` | 13 |
| 3240 | `_endRound()` | 37 |
| 3277 | `_roundWinnerVoice()` | 12 |
| 3289 | `_fimDaPartida()` | 8 |
| 3297 | `_endMatch()` | 64 |
| 3361 | `_ensureDolly()` | 41 |
| 3402 | `_tickDolly()` | 23 |
| 3425 | `setPaused()` | 23 |
| 3448 | `_now()` | 3 |
| 3451 | `pauseArmed()` | 1 |
| 3452 | `_syncPauseArm()` | 7 |
| 3459 | `resume()` | 4 |
| 3463 | `applySettings()` | 10 |
| 3473 | `_applyQuality()` | 14 |
| 3487 | `onResize()` | 20 |
| 3507 | `_switchTeam()` | 76 |
| 3583 | `_applyVmVisibility()` | 36 |
| 3619 | `_ensureVmPrecisionQa()` | 79 |
| 3698 | `_syncVmPresentation()` | 22 |
| 3720 | `_utilidadeNaMao()` | 7 |
| 3727 | `_vmlabEnsure()` | 14 |
| 3741 | `_vmlabFrame()` | 28 |
| 3769 | `_tuneGet()` | 15 |
| 3784 | `_tune()` | 23 |
| 3807 | `_fxSet()` | 1 |
| 3808 | `aplicarEfeitosAdaptativos()` | 20 |
| 3828 | `_qaCicloArma()` | 8 |
| 3836 | `_cycleWeapon()` | 8 |
| 3844 | `_inspectWeapon()` | 8 |
| 3852 | `_cancelInspect()` | 4 |
| 3856 | `_inspectMix()` | 10 |
| 3866 | `_switchWeapon()` | 43 |
| 3909 | `_deploySfx()` | 7 |
| 3916 | `_scope()` | 18 |
| 3934 | `_zoomFov()` | 5 |
| 3939 | `_reloading()` | 1 |
| 3940 | `_startReload()` | 28 |
| 3968 | `_cancelReload()` | 14 |
| 3982 | `_abortarArmaNaMorte()` | 14 |
| 3996 | `_voltarPraBase()` | 16 |
| 4012 | `_armasServidasPelaRecarga()` | 9 |
| 4021 | `_reloadLayers()` | 18 |
| 4039 | `_installRecoil()` | 33 |
| 4072 | `_shotRecoil()` | 13 |
| 4085 | `_tryShoot()` | 100 |
| 4185 | `_tryKnifeAttack()` | 14 |
| 4199 | `_meleeHit()` | 16 |
| 4215 | `_meleeRange()` | 5 |
| 4220 | `_botMelee()` | 26 |
| 4246 | `_distanceDamage()` | 7 |
| 4253 | `_shotDamage()` | 10 |
| 4263 | `_consultarTiro()` | 15 |
| 4278 | `_perfilCabeca()` | 7 |
| 4285 | `_origemTiroBot()` | 4 |
| 4289 | `_miraTiroBot()` | 13 |
| 4302 | `_participanteHumano()` | 4 |
| 4306 | `_resolverTiroBot()` | 11 |
| 4317 | `_danoTiroBot()` | 12 |
| 4329 | `_aplicarTiroBot()` | 13 |
| 4342 | `_dispararBot()` | 29 |
| 4371 | `_rastroTiroBot()` | 8 |
| 4379 | `_fireHitscan()` | 28 |
| 4407 | `_targetFromHit()` | 9 |
| 4416 | `_penetrationExit()` | 8 |
| 4424 | `_surfaceOf()` | 27 |
| 4451 | `_armoredTarget()` | 6 |
| 4457 | `_aplicaArmadura()` | 10 |
| 4467 | `_armaduraLigada()` | 1 |
| 4468 | `_equiparArmadura()` | 8 |
| 4476 | `_updateArmaduraHud()` | 13 |
| 4489 | `_sincronizarArmaduraVisual()` | 6 |
| 4495 | `_fleshImpact()` | 38 |
| 4533 | `_fxVoice()` | 9 |
| 4542 | `_impactSfx()` | 17 |
| 4559 | `_tintFx()` | 17 |
| 4576 | `_damage()` | 51 |
| 4627 | `_playerHurtFx()` | 5 |
| 4632 | `_kill()` | 62 |
| 4694 | `_checkArenaWin()` | 30 |
| 4724 | `_dmgArc()` | 79 |
| 4803 | `_mkBanner()` | 9 |
| 4812 | `_updateKillSequenceHud()` | 13 |
| 4825 | `_resetKillSequence()` | 7 |
| 4832 | `_fragRestockStep()` | 7 |
| 4839 | `_playerKillFeedback()` | 18 |
| 4857 | `_acertoPrevisto()` | 5 |
| 4862 | `_hitmarker()` | 15 |
| 4877 | `_dmgNumber()` | 20 |
| 4897 | `_feed()` | 19 |
| 4916 | `_skullIcon()` | 6 |
| 4922 | `_killfeedWeaponIcon()` | 10 |
| 4932 | `_wpnIcon()` | 64 |
| 4996 | `_tracer()` | 30 |
| 5026 | `_puff()` | 39 |
| 5065 | `_holeDecalMat()` | 8 |
| 5073 | `_flash()` | 66 |
| 5139 | `_vmTetoTela()` | 10 |
| 5149 | `_muzzleWorld()` | 43 |
| 5192 | `_bocaLigada()` | 13 |
| 5205 | `_bocaTiroBot()` | 5 |
| 5210 | `_origemTracerJogador()` | 25 |
| 5235 | `_aimOrigin()` | 5 |
| 5240 | `_updateDoors()` | 10 |
| 5250 | `_updateFx()` | 75 |
| 5325 | `_ejectCasing()` | 18 |
| 5343 | `_makeCtfFlagTex()` | 23 |
| 5366 | `_paintFlagSymbol()` | 9 |
| 5375 | `_flagTexFor()` | 25 |
| 5400 | `_legadoSimbolo()` | 8 |
| 5408 | `_loadCtfSymbols()` | 22 |
| 5430 | `_makeCtfZoneTex()` | 31 |
| 5461 | `_makeSmokeTex()` | 10 |
| 5471 | `_updateSmokeHud()` | 7 |
| 5478 | `_grenadeSpatial()` | 14 |
| 5492 | `_spawnGrenade()` | 24 |
| 5516 | `_throwNade()` | 28 |
| 5544 | `_throwSmoke()` | 1 |
| 5545 | `_throwFrag()` | 3 |
| 5548 | `_flashLiberada()` | 2 |
| 5550 | `_equipNade()` | 18 |
| 5568 | `_unequipNade()` | 11 |
| 5579 | `_explodeFrag()` | 25 |
| 5604 | `_carregarFlashMint()` | 13 |
| 5617 | `_flashProvisoria()` | 17 |
| 5634 | `_cegueiraDe()` | 9 |
| 5643 | `_popFlash()` | 32 |
| 5675 | `_cegarJogador()` | 7 |
| 5682 | `_limparCegueira()` | 6 |
| 5688 | `_tickCegueiraJogador()` | 18 |
| 5706 | `_capturarRetida()` | 27 |
| 5733 | `_corDaFumaca()` | 16 |
| 5749 | `_popSmoke()` | 23 |
| 5772 | `_updateGrenades()` | 37 |
| 5809 | `_teamColor()` | 12 |
| 5821 | `_teamInk()` | 7 |
| 5828 | `_factionOf()` | 1 |
| 5829 | `_voiceKey()` | 2 |
| 5831 | `_teamName()` | 1 |
| 5832 | `_teamTag()` | 6 |
| 5838 | `_plaqueta()` | 15 |
| 5853 | `_uiV3()` | 1 |
| 5854 | `_mirror()` | 2 |
| 5856 | `_defNoLado()` | 3 |
| 5859 | `_botSeparation()` | 61 |
| 5920 | `_initCTF()` | 86 |
| 6006 | `_updateCTF()` | 61 |
| 6067 | `_ctfWin()` | 24 |
| 6091 | `_freeYaw()` | 25 |
| 6116 | `_pullString()` | 23 |
| 6139 | `_walkReach()` | 32 |
| 6171 | `_wpComp()` | 16 |
| 6187 | `_findPathLocal()` | 22 |
| 6209 | `_botCtf()` | 137 |
| 6346 | `_hideCtfHud()` | 6 |
| 6352 | `_updateCtfHud()` | 76 |
| 6428 | `_collide()` | 23 |
| 6451 | `_collideRot()` | 22 |
| 6473 | `_mantleAlcance()` | 62 |
| 6535 | `_mantleColliders()` | 10 |
| 6545 | `_mantleAlcancavel()` | 12 |
| 6557 | `_mantleTarget()` | 32 |
| 6589 | `_beginMantle()` | 16 |
| 6605 | `_stepMantle()` | 29 |
| 6634 | `_freeSpot()` | 30 |
| 6664 | `_retaAndavel()` | 20 |
| 6684 | `_walkDepth()` | 16 |
| 6700 | `_noteHit()` | 17 |
| 6717 | `_deathFeedback()` | 45 |
| 6762 | `_toggleCamView()` | 6 |
| 6768 | `_swapShoulder()` | 7 |
| 6775 | `setCamView()` | 19 |
| 6794 | `_syncCamViewVis()` | 8 |
| 6802 | `_ensurePlayerTP()` | 79 |
| 6881 | `_updatePlayerTP()` | 26 |
| 6907 | `_updatePlayerTPCamera()` | 105 |
| 7012 | `_updateCrosshairParallax()` | 46 |
| 7058 | `_tpDeath()` | 55 |
| 7113 | `_tpRevive()` | 20 |
| 7133 | `_moveEntity()` | 131 |
| 7264 | `_updatePlayer()` | 359 |
| 7623 | `_footstepSurface()` | 13 |
| 7636 | `_updatePickups()` | 159 |
| 7795 | `_wpnMode()` | 7 |
| 7802 | `_botWeapon()` | 10 |
| 7812 | `_municaoInfinita()` | 1 |
| 7813 | `_pickupAllowed()` | 8 |
| 7821 | `_slotPrimaria()` | 1 |
| 7822 | `_largarArma()` | 3 |
| 7825 | `_grabNearPickup()` | 10 |
| 7835 | `_grabPickup()` | 36 |
| 7871 | `_assentarNoChao()` | 10 |
| 7881 | `refreshPickupModels()` | 24 |
| 7905 | `_dropWeapon()` | 20 |
| 7925 | `_sumirDrop()` | 36 |
| 7961 | `_spawnY()` | 3 |
| 7964 | `_spawnYaw()` | 5 |
| 7969 | `_pickSpawn()` | 25 |
| 7994 | `_respawnPlayer()` | 47 |
| 8041 | `_losClear()` | 18 |
| 8059 | `_botCall()` | 41 |
| 8100 | `_teamMarkTex()` | 23 |
| 8123 | `_makeTeamMark()` | 16 |
| 8139 | `_trocarPersonagem()` | 19 |
| 8158 | `_syncRemoteWeapon()` | 23 |
| 8181 | `_updateTeamMark()` | 7 |
| 8188 | `_posturaBot()` | 4 |
| 8192 | `_botEye()` | 1 |
| 8193 | `_enemyOf()` | 8 |
| 8201 | `_duelToken()` | 22 |
| 8223 | `_respawnEntity()` | 29 |
| 8252 | `_botOuve()` | 12 |
| 8264 | `_updateBot()` | 831 |
| 9095 | `_flushTraining()` | 13 |
| 9108 | `_updateBotNN()` | 73 |
| 9181 | `_botShootNN()` | 31 |
| 9212 | `_radarFoot()` | 38 |
| 9250 | `_radarStatic()` | 31 |
| 9281 | `_updateRadar()` | 48 |
| 9329 | `_banner()` | 26 |
| 9355 | `_resultadoDaRodada()` | 4 |
| 9359 | `_botaoAmigo()` | 5 |
| 9364 | `_ligarAmigoPlacar()` | 22 |
| 9386 | `_showScoreboard()` | 60 |
| 9446 | `_updateWeaponHud()` | 43 |
| 9489 | `_updateHud()` | 128 |
| 9617 | `update()` | 95 |
| 9712 | `dispose()` | 61 |

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
