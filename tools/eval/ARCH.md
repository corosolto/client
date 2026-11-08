# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.139 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 10091 | 427 |
| `public/js/main.js` | 5631 | 437 |
| `public/js/glbchars.js` | 1518 | 107 |
| `public/js/characters.js` | 1111 | 40 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3552 linhas (35% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 1015 | 8382 | `_updateBot()` | ⚠️ candidato a extração |
| 640 | 799 | `constructor()` | 🔴 append-only |
| 360 | 7315 | `_updatePlayer()` | ⚠️ candidato a extração |
| 288 | 2942 | `_resetPositions()` |  |
| 156 | 7688 | `_updatePickups()` |  |
| 141 | 2352 | `_touchControls()` |  |
| 138 | 9794 | `_updateHud()` |  |
| 137 | 6255 | `_botCtf()` |  |
| 131 | 7184 | `_moveEntity()` |  |
| 105 | 6958 | `_updatePlayerTPCamera()` |  |
| 100 | 4132 | `_tryShoot()` |  |
| 96 | 9932 | `update()` | 🔴 append-only |
| 86 | 5964 | `_initCTF()` |  |
| 80 | 3548 | `_switchTeam()` |  |
| 79 | 3666 | `_ensureVmPrecisionQa()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `398–401` `503–597` `627–648` `1543–1830` `3628–3665` `3913–4014` `4086–4231` `4246–4261` `4426–4453` `5043–5072` `5120–5238` `5372–5389` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `218–221` `272–272` `305–316` `690–701` `4625–4746` `5908–5963` `6135–6391` `6474–6496` `7315–7674` `8099–8116` `8266–8296` `8382–9396` | — |
| **MAPAS / MUNDO** | `1486–1542` `2942–3229` `5964–6110` `7688–7843` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1987–1996` `2112–2150` `3514–3527` `5073–5111` `5297–5371` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1439–1485` `3466–3488` `3504–3513` `3528–3547` `4771–4849` `4909–4962` `4979–5042` `9583–9630` `9688–9750` `9794–9931` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 9932–10027 · `_dom()` 1439–1485 · `constructor()` 799–1438

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **4148 de 10091 linhas (41%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 67 | `QS` | 3 |
| 73 | `ANNOUNCER_LAB` | 4 |
| 77 | `VMLAB` | 3 |
| 82 | `VM_QA_CICLO` | 3 |
| 86 | `VM_QA_ADS` | 4 |
| 91 | `FLASH_DEBUG_N` | 3 |
| 94 | `NADE_ESTOQUE` | 8 |
| 102 | `VM_MAT_LEGACY` | 4 |
| 108 | `DROP_TTL` | 8 |
| 116 | `ROUNDS_MAX` | 27 |
| 144 | `CTF_ROUNDS_TO_WIN` | 4 |
| 149 | `sanitizeRounds` | 4 |
| 154 | `CTF_CLOCK_SHOW` | 4 |
| 158 | `KILLS_PER_PLAYER` | 7 |
| 165 | `PACE` | 33 |
| 198 | `PAUSE_ARM_MS` | 3 |
| 201 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 211 | `confirmGate` | 7 |
| 222 | `BOT_AIM_PITCH` | 4 |
| 226 | `BOT_DMG_PLAYER` | 21 |
| 247 | `BOT_FAIR` | 5 |
| 252 | `BOT_MOVE2` | 15 |
| 276 | `BOT_FOCUS_MIN` | 3 |
| 283 | `BOT_OUVE_PASSO` | 22 |
| 309 | `BOT_TOKEN_REST` | 7 |
| 317 | `MOVE_MUL` | 6 |
| 324 | `MOVE2` | 4 |
| 328 | `STEP_H` | 3 |
| 343 | `EMPTY_COLLIDERS` | 5 |
| 348 | `RACK_OLD` | 4 |
| 352 | `RACK_RETA` | 25 |
| 377 | `REGEN` | 3 |
| 383 | `ARMADURA_DEBUG` | 3 |
| 387 | `RADIO` | 5 |
| 393 | `MK_LABELS` | 5 |
| 398 | `GUNFEEL` | 4 |
| 403 | `PUNCH_ZOOM` | 3 |
| 406 | `BOCA_CORPO` | 3 |
| 409 | `bocaLocalDaArma` | 22 |
| 431 | `TRACER_STYLE` | 6 |
| 441 | `ADS_RAMPA_S` | 3 |
| 445 | `aberturaCone` | 16 |
| 461 | `anguloDeDisparo` | 4 |
| 465 | `coneDoDisparo` | 16 |
| 483 | `MOBILE_RADAR_INTERVAL` | 3 |
| 486 | `TOUCH_LOOK_RAD_PX` | 4 |
| 490 | `DMG_FALLOFF` | 5 |
| 495 | `HS_MUL` | 3 |
| 498 | `BALL_CLASS` | 5 |
| 503 | `STATIC_CLASS` | 75 |
| 579 | `VM_KNOB` | 19 |
| 598 | `vmAdsRot` | 4 |
| 603 | `vmFovForAspect` | 24 |
| 627 | `VM_OFF` | 22 |
| 649 | `vmOffY` | 35 |
| 684 | `VMP` | 6 |
| 690 | `BOT_SKILLS` | 11 |
| 702 | `diffKey` | 4 |
| 707 | `rollBotSkill` | 7 |
| 714 | `botTier` | 4 |
| 718 | `_cyclePool` | 5 |
| 723 | `_rosterPool` | 22 |
| 747 | `_pinnedDefs` | 5 |
| 752 | `pickMatchRoster` | 21 |
| 773 | `BOT_WEAPON_POOL` | 5 |
| 778 | `pickMatchWeapons` | 9 |
| 787 | `aguardarPreloads` | 9 |
| 799 | `constructor()` | 640 |
| 1439 | `_dom()` | 47 |
| 1486 | `_buildEnv()` | 57 |
| 1543 | `_buildViewModels()` | 3 |
| 1546 | `_vmFrame` | 285 |
| 1831 | `_vmFrame` | 142 |
| 1973 | `_vmMontarTardio` | 14 |
| 1987 | `_makePuffTexture()` | 10 |
| 1997 | `_makeBloodTex()` | 19 |
| 2016 | `_makeBloodPoolTex()` | 21 |
| 2037 | `_bloodDecal()` | 16 |
| 2053 | `_makeBloodFx()` | 21 |
| 2074 | `_bloodSpatter()` | 18 |
| 2092 | `_bloodPoolAt()` | 6 |
| 2098 | `_updateBlood()` | 14 |
| 2112 | `_makeFlashTex()` | 21 |
| 2133 | `_makeFlashSoftTex()` | 8 |
| 2141 | `_makeFlashCoreTex()` | 10 |
| 2151 | `_input()` | 6 |
| 2157 | `_kd` | 72 |
| 2229 | `_ku` | 5 |
| 2234 | `_md` | 44 |
| 2278 | `_mu` | 10 |
| 2288 | `_mm` | 20 |
| 2308 | `_wh` | 17 |
| 2325 | `_cc` | 1 |
| 2326 | `_blur` | 1 |
| 2327 | `_hiddenInput` | 1 |
| 2328 | `_plc` | 24 |
| 2352 | `_touchControls()` | 141 |
| 2493 | `_releaseInput()` | 11 |
| 2504 | `_touchLook()` | 12 |
| 2516 | `_syncTouchWeps()` | 18 |
| 2534 | `_aimAssist()` | 28 |
| 2562 | `_requestLock()` | 27 |
| 2589 | `_travaAtalhos()` | 17 |
| 2606 | `_soltaAtalhos()` | 6 |
| 2612 | `espectando()` | 2 |
| 2614 | `_acceptInput()` | 7 |
| 2621 | `travarEntrada()` | 13 |
| 2634 | `_chatSeguraPausa()` | 5 |
| 2639 | `_pauseBackdrop()` | 7 |
| 2646 | `_radioShow()` | 6 |
| 2652 | `_radioUi()` | 10 |
| 2662 | `_emoteToggle()` | 10 |
| 2672 | `_emoteMods()` | 9 |
| 2681 | `_emoteUi()` | 20 |
| 2701 | `_emoteClose()` | 6 |
| 2707 | `_emotePick()` | 11 |
| 2718 | `_emoteCtrl()` | 4 |
| 2722 | `_emoteStop()` | 10 |
| 2732 | `_emoteTick()` | 7 |
| 2739 | `_radioPick()` | 20 |
| 2759 | `_abilityNotice()` | 10 |
| 2769 | `_resetSliceAbilities()` | 9 |
| 2778 | `_stackTrace()` | 28 |
| 2806 | `_updateMotocaCharge()` | 10 |
| 2816 | `_recordRoutePoint()` | 11 |
| 2827 | `_routePing()` | 23 |
| 2850 | `_tickRoutePings()` | 12 |
| 2862 | `_objectiveInteractionMultiplier()` | 14 |
| 2876 | `start()` | 5 |
| 2881 | `_startAnnouncerLab()` | 9 |
| 2890 | `_startRound()` | 52 |
| 2942 | `_resetPositions()` | 288 |
| 3230 | `_checkCtfAlvo()` | 13 |
| 3243 | `_checkPace()` | 13 |
| 3256 | `_endRound()` | 37 |
| 3293 | `_roundWinnerVoice()` | 12 |
| 3305 | `_fimDaPartida()` | 13 |
| 3318 | `_modeId()` | 1 |
| 3319 | `_teamPopulation()` | 5 |
| 3324 | `_endMatch()` | 78 |
| 3402 | `_ensureDolly()` | 41 |
| 3443 | `_tickDolly()` | 23 |
| 3466 | `setPaused()` | 23 |
| 3489 | `_now()` | 3 |
| 3492 | `pauseArmed()` | 1 |
| 3493 | `_syncPauseArm()` | 7 |
| 3500 | `resume()` | 4 |
| 3504 | `applySettings()` | 10 |
| 3514 | `_applyQuality()` | 14 |
| 3528 | `onResize()` | 20 |
| 3548 | `_switchTeam()` | 80 |
| 3628 | `_applyVmVisibility()` | 38 |
| 3666 | `_ensureVmPrecisionQa()` | 79 |
| 3745 | `_syncVmPresentation()` | 22 |
| 3767 | `_utilidadeNaMao()` | 7 |
| 3774 | `_vmlabEnsure()` | 14 |
| 3788 | `_vmlabFrame()` | 28 |
| 3816 | `_tuneGet()` | 15 |
| 3831 | `_tune()` | 23 |
| 3854 | `_fxSet()` | 1 |
| 3855 | `aplicarEfeitosAdaptativos()` | 20 |
| 3875 | `_qaCicloArma()` | 8 |
| 3883 | `_cycleWeapon()` | 8 |
| 3891 | `_inspectWeapon()` | 8 |
| 3899 | `_cancelInspect()` | 4 |
| 3903 | `_inspectMix()` | 10 |
| 3913 | `_switchWeapon()` | 43 |
| 3956 | `_deploySfx()` | 7 |
| 3963 | `_scope()` | 18 |
| 3981 | `_zoomFov()` | 5 |
| 3986 | `_reloading()` | 1 |
| 3987 | `_startReload()` | 28 |
| 4015 | `_cancelReload()` | 14 |
| 4029 | `_abortarArmaNaMorte()` | 14 |
| 4043 | `_voltarPraBase()` | 16 |
| 4059 | `_armasServidasPelaRecarga()` | 9 |
| 4068 | `_reloadLayers()` | 18 |
| 4086 | `_installRecoil()` | 33 |
| 4119 | `_shotRecoil()` | 13 |
| 4132 | `_tryShoot()` | 100 |
| 4232 | `_tryKnifeAttack()` | 14 |
| 4246 | `_meleeHit()` | 16 |
| 4262 | `_meleeRange()` | 5 |
| 4267 | `_botMelee()` | 26 |
| 4293 | `_distanceDamage()` | 7 |
| 4300 | `_shotDamage()` | 10 |
| 4310 | `_consultarTiro()` | 15 |
| 4325 | `_perfilCabeca()` | 7 |
| 4332 | `_origemTiroBot()` | 4 |
| 4336 | `_miraTiroBot()` | 13 |
| 4349 | `_participanteHumano()` | 4 |
| 4353 | `_resolverTiroBot()` | 11 |
| 4364 | `_danoTiroBot()` | 12 |
| 4376 | `_aplicarTiroBot()` | 13 |
| 4389 | `_dispararBot()` | 29 |
| 4418 | `_rastroTiroBot()` | 8 |
| 4426 | `_fireHitscan()` | 28 |
| 4454 | `_targetFromHit()` | 9 |
| 4463 | `_penetrationExit()` | 8 |
| 4471 | `_surfaceOf()` | 27 |
| 4498 | `_armoredTarget()` | 6 |
| 4504 | `_entidadeEscolta()` | 1 |
| 4505 | `_aplicaArmadura()` | 11 |
| 4516 | `_armaduraLigada()` | 1 |
| 4517 | `_equiparArmadura()` | 8 |
| 4525 | `_updateArmaduraHud()` | 13 |
| 4538 | `_sincronizarArmaduraVisual()` | 6 |
| 4544 | `_fleshImpact()` | 38 |
| 4582 | `_fxVoice()` | 9 |
| 4591 | `_impactSfx()` | 17 |
| 4608 | `_tintFx()` | 17 |
| 4625 | `_damage()` | 51 |
| 4676 | `_playerHurtFx()` | 5 |
| 4681 | `_kill()` | 66 |
| 4747 | `_checkArenaWin()` | 24 |
| 4771 | `_dmgArc()` | 79 |
| 4850 | `_mkBanner()` | 9 |
| 4859 | `_updateKillSequenceHud()` | 13 |
| 4872 | `_resetKillSequence()` | 7 |
| 4879 | `_fragRestockStep()` | 7 |
| 4886 | `_playerKillFeedback()` | 18 |
| 4904 | `_acertoPrevisto()` | 5 |
| 4909 | `_hitmarker()` | 15 |
| 4924 | `_dmgNumber()` | 20 |
| 4944 | `_feed()` | 19 |
| 4963 | `_skullIcon()` | 6 |
| 4969 | `_killfeedWeaponIcon()` | 10 |
| 4979 | `_wpnIcon()` | 64 |
| 5043 | `_tracer()` | 30 |
| 5073 | `_puff()` | 39 |
| 5112 | `_holeDecalMat()` | 8 |
| 5120 | `_flash()` | 66 |
| 5186 | `_vmTetoTela()` | 10 |
| 5196 | `_muzzleWorld()` | 43 |
| 5239 | `_bocaLigada()` | 13 |
| 5252 | `_bocaTiroBot()` | 5 |
| 5257 | `_origemTracerJogador()` | 25 |
| 5282 | `_aimOrigin()` | 5 |
| 5287 | `_updateDoors()` | 10 |
| 5297 | `_updateFx()` | 75 |
| 5372 | `_ejectCasing()` | 18 |
| 5390 | `_makeCtfFlagTex()` | 23 |
| 5413 | `_paintFlagSymbol()` | 9 |
| 5422 | `_flagTexFor()` | 25 |
| 5447 | `_legadoSimbolo()` | 8 |
| 5455 | `_loadCtfSymbols()` | 22 |
| 5477 | `_makeCtfZoneTex()` | 31 |
| 5508 | `_makeSmokeTex()` | 10 |
| 5518 | `_updateSmokeHud()` | 7 |
| 5525 | `_grenadeSpatial()` | 14 |
| 5539 | `_spawnGrenade()` | 24 |
| 5563 | `_throwNade()` | 28 |
| 5591 | `_throwSmoke()` | 1 |
| 5592 | `_throwFrag()` | 3 |
| 5595 | `_flashLiberada()` | 2 |
| 5597 | `_equipNade()` | 18 |
| 5615 | `_unequipNade()` | 11 |
| 5626 | `_explodeFrag()` | 25 |
| 5651 | `_carregarFlashMint()` | 13 |
| 5664 | `_flashProvisoria()` | 17 |
| 5681 | `_cegueiraDe()` | 9 |
| 5690 | `_popFlash()` | 32 |
| 5722 | `_cegarJogador()` | 7 |
| 5729 | `_limparCegueira()` | 6 |
| 5735 | `_tickCegueiraJogador()` | 18 |
| 5753 | `_capturarRetida()` | 27 |
| 5780 | `_corDaFumaca()` | 16 |
| 5796 | `_popSmoke()` | 23 |
| 5819 | `_updateGrenades()` | 37 |
| 5856 | `_teamColor()` | 12 |
| 5868 | `_teamInk()` | 7 |
| 5875 | `_factionOf()` | 1 |
| 5876 | `_voiceKey()` | 2 |
| 5878 | `_teamName()` | 1 |
| 5879 | `_teamTag()` | 6 |
| 5885 | `_plaqueta()` | 17 |
| 5902 | `_uiV3()` | 1 |
| 5903 | `_mirror()` | 2 |
| 5905 | `_defNoLado()` | 3 |
| 5908 | `_botSeparation()` | 56 |
| 5964 | `_initCTF()` | 86 |
| 6050 | `_updateCTF()` | 61 |
| 6111 | `_ctfWin()` | 24 |
| 6135 | `_freeYaw()` | 27 |
| 6162 | `_pullString()` | 23 |
| 6185 | `_walkReach()` | 32 |
| 6217 | `_wpComp()` | 16 |
| 6233 | `_findPathLocal()` | 22 |
| 6255 | `_botCtf()` | 137 |
| 6392 | `_hideCtfHud()` | 6 |
| 6398 | `_updateCtfHud()` | 76 |
| 6474 | `_collide()` | 23 |
| 6497 | `_collideGrade()` | 25 |
| 6497 | `_collideRot()` | 22 |
| 6519 | `_mantleAlcance()` | 67 |
| 6586 | `_mantleColliders()` | 10 |
| 6596 | `_mantleAlcancavel()` | 12 |
| 6608 | `_mantleTarget()` | 32 |
| 6640 | `_beginMantle()` | 16 |
| 6656 | `_stepMantle()` | 29 |
| 6685 | `_freeSpot()` | 30 |
| 6715 | `_retaAndavel()` | 20 |
| 6735 | `_walkDepth()` | 16 |
| 6751 | `_noteHit()` | 17 |
| 6768 | `_deathFeedback()` | 45 |
| 6813 | `_toggleCamView()` | 6 |
| 6819 | `_swapShoulder()` | 7 |
| 6826 | `setCamView()` | 19 |
| 6845 | `_syncCamViewVis()` | 8 |
| 6853 | `_ensurePlayerTP()` | 79 |
| 6932 | `_updatePlayerTP()` | 26 |
| 6958 | `_updatePlayerTPCamera()` | 105 |
| 7063 | `_updateCrosshairParallax()` | 46 |
| 7109 | `_tpDeath()` | 55 |
| 7164 | `_tpRevive()` | 20 |
| 7184 | `_moveEntity()` | 131 |
| 7315 | `_updatePlayer()` | 360 |
| 7675 | `_footstepSurface()` | 13 |
| 7688 | `_updatePickups()` | 156 |
| 7844 | `_botPegaArma()` | 5 |
| 7849 | `_wpnMode()` | 7 |
| 7856 | `_botWeapon()` | 10 |
| 7866 | `_municaoInfinita()` | 1 |
| 7867 | `_pickupAllowed()` | 8 |
| 7875 | `_slotPrimaria()` | 1 |
| 7876 | `_largarArma()` | 3 |
| 7879 | `_grabNearPickup()` | 10 |
| 7889 | `_grabPickup()` | 36 |
| 7925 | `_assentarNoChao()` | 10 |
| 7935 | `refreshPickupModels()` | 24 |
| 7959 | `_dropWeapon()` | 20 |
| 7979 | `_sumirDrop()` | 36 |
| 8015 | `_spawnY()` | 3 |
| 8018 | `_spawnYaw()` | 8 |
| 8026 | `_pickSpawn()` | 25 |
| 8051 | `_respawnPlayer()` | 48 |
| 8099 | `_losClear()` | 18 |
| 8132 | `_raioBloqueado()` | 14 |
| 8117 | `_botCall()` | 41 |
| 8158 | `_teamMarkTex()` | 23 |
| 8181 | `_makeTeamMark()` | 18 |
| 8199 | `_trocarPersonagem()` | 19 |
| 8218 | `_syncRemoteWeapon()` | 23 |
| 8241 | `_updateTeamMark()` | 21 |
| 8262 | `_posturaBot()` | 4 |
| 8266 | `_botEye()` | 1 |
| 8267 | `_enemyOf()` | 8 |
| 8275 | `_duelToken()` | 22 |
| 8297 | `_respawnEntity()` | 37 |
| 8334 | `_botOuve()` | 15 |
| 8349 | `_suavizaDestinoEscolta()` | 33 |
| 8382 | `_updateBot()` | 1015 |
| 9397 | `_flushTraining()` | 13 |
| 9410 | `_updateBotNN()` | 73 |
| 9483 | `_botShootNN()` | 31 |
| 9514 | `_radarFoot()` | 38 |
| 9552 | `_radarStatic()` | 31 |
| 9583 | `_updateRadar()` | 48 |
| 9631 | `_banner()` | 26 |
| 9657 | `_resultadoDaRodada()` | 4 |
| 9661 | `_botaoAmigo()` | 5 |
| 9666 | `_ligarAmigoPlacar()` | 22 |
| 9688 | `_showScoreboard()` | 63 |
| 9751 | `_updateWeaponHud()` | 43 |
| 9794 | `_updateHud()` | 138 |
| 9932 | `update()` | 96 |
| 10028 | `dispose()` | 63 |

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
