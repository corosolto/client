# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.141 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 10189 | 432 |
| `public/js/main.js` | 5642 | 439 |
| `public/js/glbchars.js` | 1526 | 109 |
| `public/js/characters.js` | 1111 | 40 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3560 linhas (35% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 1015 | 8472 | `_updateBot()` | ⚠️ candidato a extração |
| 642 | 811 | `constructor()` | 🔴 append-only |
| 361 | 7383 | `_updatePlayer()` | ⚠️ candidato a extração |
| 288 | 2956 | `_resetPositions()` |  |
| 156 | 7759 | `_updatePickups()` |  |
| 141 | 2366 | `_touchControls()` |  |
| 138 | 9884 | `_updateHud()` |  |
| 137 | 6297 | `_botCtf()` |  |
| 136 | 7247 | `_moveEntity()` |  |
| 105 | 7021 | `_updatePlayerTPCamera()` |  |
| 100 | 4147 | `_tryShoot()` |  |
| 96 | 10022 | `update()` | 🔴 append-only |
| 86 | 6006 | `_initCTF()` |  |
| 80 | 3563 | `_switchTeam()` |  |
| 79 | 3681 | `_ensureVmPrecisionQa()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `403–406` `515–609` `639–660` `1557–1844` `3643–3680` `3928–4029` `4101–4246` `4261–4276` `4441–4468` `5058–5087` `5162–5280` `5414–5431` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `222–226` `277–277` `310–321` `702–713` `4640–4761` `5950–6005` `6177–6433` `6516–6534` `7383–7743` `8170–8184` `8356–8386` `8472–9486` | — |
| **MAPAS / MUNDO** | `1500–1556` `2956–3243` `6006–6152` `7759–7914` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `2001–2010` `2126–2164` `3528–3542` `5115–5153` `5339–5413` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1453–1499` `3480–3502` `3518–3527` `3543–3562` `4786–4864` `4924–4977` `4994–5057` `9673–9720` `9778–9840` `9884–10021` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 10022–10117 · `_dom()` 1453–1499 · `constructor()` 811–1452

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **4143 de 10189 linhas (41%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 71 | `QS` | 3 |
| 77 | `ANNOUNCER_LAB` | 4 |
| 81 | `VMLAB` | 3 |
| 86 | `VM_QA_CICLO` | 3 |
| 90 | `VM_QA_ADS` | 4 |
| 95 | `FLASH_DEBUG_N` | 3 |
| 98 | `NADE_ESTOQUE` | 8 |
| 106 | `VM_MAT_LEGACY` | 4 |
| 112 | `DROP_TTL` | 8 |
| 120 | `ROUNDS_MAX` | 27 |
| 148 | `CTF_ROUNDS_TO_WIN` | 4 |
| 153 | `sanitizeRounds` | 4 |
| 158 | `CTF_CLOCK_SHOW` | 4 |
| 162 | `KILLS_PER_PLAYER` | 7 |
| 169 | `PACE` | 33 |
| 202 | `PAUSE_ARM_MS` | 3 |
| 205 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 215 | `confirmGate` | 7 |
| 227 | `BOT_AIM_PITCH` | 4 |
| 231 | `BOT_DMG_PLAYER` | 21 |
| 252 | `BOT_FAIR` | 5 |
| 257 | `BOT_MOVE2` | 15 |
| 281 | `BOT_FOCUS_MIN` | 3 |
| 288 | `BOT_OUVE_PASSO` | 22 |
| 314 | `BOT_TOKEN_REST` | 7 |
| 322 | `MOVE_MUL` | 6 |
| 329 | `MOVE2` | 4 |
| 333 | `STEP_H` | 3 |
| 348 | `EMPTY_COLLIDERS` | 5 |
| 353 | `RACK_OLD` | 4 |
| 357 | `RACK_RETA` | 25 |
| 382 | `REGEN` | 3 |
| 388 | `ARMADURA_DEBUG` | 3 |
| 392 | `RADIO` | 5 |
| 398 | `MK_LABELS` | 5 |
| 403 | `GUNFEEL` | 4 |
| 408 | `PUNCH_ZOOM` | 3 |
| 411 | `BOCA_CORPO` | 3 |
| 414 | `bocaLocalDaArma` | 22 |
| 437 | `LANDING_FX_STYLE` | 12 |
| 453 | `ADS_RAMPA_S` | 3 |
| 457 | `aberturaCone` | 16 |
| 473 | `anguloDeDisparo` | 4 |
| 477 | `coneDoDisparo` | 16 |
| 495 | `MOBILE_RADAR_INTERVAL` | 3 |
| 498 | `TOUCH_LOOK_RAD_PX` | 4 |
| 502 | `DMG_FALLOFF` | 5 |
| 507 | `HS_MUL` | 3 |
| 510 | `BALL_CLASS` | 5 |
| 515 | `STATIC_CLASS` | 75 |
| 591 | `VM_KNOB` | 19 |
| 610 | `vmAdsRot` | 4 |
| 615 | `vmFovForAspect` | 24 |
| 639 | `VM_OFF` | 22 |
| 661 | `vmOffY` | 35 |
| 696 | `VMP` | 6 |
| 702 | `BOT_SKILLS` | 11 |
| 714 | `diffKey` | 4 |
| 719 | `rollBotSkill` | 7 |
| 726 | `botTier` | 4 |
| 730 | `_cyclePool` | 5 |
| 735 | `_rosterPool` | 22 |
| 759 | `_pinnedDefs` | 5 |
| 764 | `pickMatchRoster` | 21 |
| 785 | `BOT_WEAPON_POOL` | 5 |
| 790 | `pickMatchWeapons` | 9 |
| 799 | `aguardarPreloads` | 9 |
| 811 | `constructor()` | 642 |
| 1453 | `_dom()` | 47 |
| 1500 | `_buildEnv()` | 57 |
| 1557 | `_buildViewModels()` | 3 |
| 1560 | `_vmFrame` | 285 |
| 1845 | `_vmFrame` | 142 |
| 1987 | `_vmMontarTardio` | 14 |
| 2001 | `_makePuffTexture()` | 10 |
| 2011 | `_makeBloodTex()` | 19 |
| 2030 | `_makeBloodPoolTex()` | 21 |
| 2051 | `_bloodDecal()` | 16 |
| 2067 | `_makeBloodFx()` | 21 |
| 2088 | `_bloodSpatter()` | 18 |
| 2106 | `_bloodPoolAt()` | 6 |
| 2112 | `_updateBlood()` | 14 |
| 2126 | `_makeFlashTex()` | 21 |
| 2147 | `_makeFlashSoftTex()` | 8 |
| 2155 | `_makeFlashCoreTex()` | 10 |
| 2165 | `_input()` | 6 |
| 2171 | `_kd` | 72 |
| 2243 | `_ku` | 5 |
| 2248 | `_md` | 44 |
| 2292 | `_mu` | 10 |
| 2302 | `_mm` | 20 |
| 2322 | `_wh` | 17 |
| 2339 | `_cc` | 1 |
| 2340 | `_blur` | 1 |
| 2341 | `_hiddenInput` | 1 |
| 2342 | `_plc` | 24 |
| 2366 | `_touchControls()` | 141 |
| 2507 | `_releaseInput()` | 11 |
| 2518 | `_touchLook()` | 12 |
| 2530 | `_syncTouchWeps()` | 18 |
| 2548 | `_aimAssist()` | 28 |
| 2576 | `_requestLock()` | 27 |
| 2603 | `_travaAtalhos()` | 17 |
| 2620 | `_soltaAtalhos()` | 6 |
| 2626 | `espectando()` | 2 |
| 2628 | `_acceptInput()` | 7 |
| 2635 | `travarEntrada()` | 13 |
| 2648 | `_chatSeguraPausa()` | 5 |
| 2653 | `_pauseBackdrop()` | 7 |
| 2660 | `_radioShow()` | 6 |
| 2666 | `_radioUi()` | 10 |
| 2676 | `_emoteToggle()` | 10 |
| 2686 | `_emoteMods()` | 9 |
| 2695 | `_emoteUi()` | 20 |
| 2715 | `_emoteClose()` | 6 |
| 2721 | `_emotePick()` | 11 |
| 2732 | `_emoteCtrl()` | 4 |
| 2736 | `_emoteStop()` | 10 |
| 2746 | `_emoteTick()` | 7 |
| 2753 | `_radioPick()` | 20 |
| 2773 | `_abilityNotice()` | 10 |
| 2783 | `_resetSliceAbilities()` | 9 |
| 2792 | `_stackTrace()` | 28 |
| 2820 | `_updateMotocaCharge()` | 10 |
| 2830 | `_recordRoutePoint()` | 11 |
| 2841 | `_routePing()` | 23 |
| 2864 | `_tickRoutePings()` | 12 |
| 2876 | `_objectiveInteractionMultiplier()` | 14 |
| 2890 | `start()` | 5 |
| 2895 | `_startAnnouncerLab()` | 9 |
| 2904 | `_startRound()` | 52 |
| 2956 | `_resetPositions()` | 288 |
| 3244 | `_checkCtfAlvo()` | 13 |
| 3257 | `_checkPace()` | 13 |
| 3270 | `_endRound()` | 37 |
| 3307 | `_roundWinnerVoice()` | 12 |
| 3319 | `_fimDaPartida()` | 13 |
| 3332 | `_modeId()` | 1 |
| 3333 | `_teamPopulation()` | 5 |
| 3338 | `_endMatch()` | 78 |
| 3416 | `_ensureDolly()` | 41 |
| 3457 | `_tickDolly()` | 23 |
| 3480 | `setPaused()` | 23 |
| 3503 | `_now()` | 3 |
| 3506 | `pauseArmed()` | 1 |
| 3507 | `_syncPauseArm()` | 7 |
| 3514 | `resume()` | 4 |
| 3518 | `applySettings()` | 10 |
| 3528 | `_applyQuality()` | 15 |
| 3543 | `onResize()` | 20 |
| 3563 | `_switchTeam()` | 80 |
| 3643 | `_applyVmVisibility()` | 38 |
| 3681 | `_ensureVmPrecisionQa()` | 79 |
| 3760 | `_syncVmPresentation()` | 22 |
| 3782 | `_utilidadeNaMao()` | 7 |
| 3789 | `_vmlabEnsure()` | 14 |
| 3803 | `_vmlabFrame()` | 28 |
| 3831 | `_tuneGet()` | 15 |
| 3846 | `_tune()` | 23 |
| 3869 | `_fxSet()` | 1 |
| 3870 | `aplicarEfeitosAdaptativos()` | 20 |
| 3890 | `_qaCicloArma()` | 8 |
| 3898 | `_cycleWeapon()` | 8 |
| 3906 | `_inspectWeapon()` | 8 |
| 3914 | `_cancelInspect()` | 4 |
| 3918 | `_inspectMix()` | 10 |
| 3928 | `_switchWeapon()` | 43 |
| 3971 | `_deploySfx()` | 7 |
| 3978 | `_scope()` | 18 |
| 3996 | `_zoomFov()` | 5 |
| 4001 | `_reloading()` | 1 |
| 4002 | `_startReload()` | 28 |
| 4030 | `_cancelReload()` | 14 |
| 4044 | `_abortarArmaNaMorte()` | 14 |
| 4058 | `_voltarPraBase()` | 16 |
| 4074 | `_armasServidasPelaRecarga()` | 9 |
| 4083 | `_reloadLayers()` | 18 |
| 4101 | `_installRecoil()` | 33 |
| 4134 | `_shotRecoil()` | 13 |
| 4147 | `_tryShoot()` | 100 |
| 4247 | `_tryKnifeAttack()` | 14 |
| 4261 | `_meleeHit()` | 16 |
| 4277 | `_meleeRange()` | 5 |
| 4282 | `_botMelee()` | 26 |
| 4308 | `_distanceDamage()` | 7 |
| 4315 | `_shotDamage()` | 10 |
| 4325 | `_consultarTiro()` | 15 |
| 4340 | `_perfilCabeca()` | 7 |
| 4347 | `_origemTiroBot()` | 4 |
| 4351 | `_miraTiroBot()` | 13 |
| 4364 | `_participanteHumano()` | 4 |
| 4368 | `_resolverTiroBot()` | 11 |
| 4379 | `_danoTiroBot()` | 12 |
| 4391 | `_aplicarTiroBot()` | 13 |
| 4404 | `_dispararBot()` | 29 |
| 4433 | `_rastroTiroBot()` | 8 |
| 4441 | `_fireHitscan()` | 28 |
| 4469 | `_targetFromHit()` | 9 |
| 4478 | `_penetrationExit()` | 8 |
| 4486 | `_surfaceOf()` | 27 |
| 4513 | `_armoredTarget()` | 6 |
| 4519 | `_entidadeEscolta()` | 1 |
| 4520 | `_aplicaArmadura()` | 11 |
| 4531 | `_armaduraLigada()` | 1 |
| 4532 | `_equiparArmadura()` | 8 |
| 4540 | `_updateArmaduraHud()` | 13 |
| 4553 | `_sincronizarArmaduraVisual()` | 6 |
| 4559 | `_fleshImpact()` | 38 |
| 4597 | `_fxVoice()` | 9 |
| 4606 | `_impactSfx()` | 17 |
| 4623 | `_tintFx()` | 17 |
| 4640 | `_damage()` | 51 |
| 4691 | `_playerHurtFx()` | 5 |
| 4696 | `_kill()` | 66 |
| 4762 | `_checkArenaWin()` | 24 |
| 4786 | `_dmgArc()` | 79 |
| 4865 | `_mkBanner()` | 9 |
| 4874 | `_updateKillSequenceHud()` | 13 |
| 4887 | `_resetKillSequence()` | 7 |
| 4894 | `_fragRestockStep()` | 7 |
| 4901 | `_playerKillFeedback()` | 18 |
| 4919 | `_acertoPrevisto()` | 5 |
| 4924 | `_hitmarker()` | 15 |
| 4939 | `_dmgNumber()` | 20 |
| 4959 | `_feed()` | 19 |
| 4978 | `_skullIcon()` | 6 |
| 4984 | `_killfeedWeaponIcon()` | 10 |
| 4994 | `_wpnIcon()` | 64 |
| 5058 | `_tracer()` | 30 |
| 5088 | `_landingFx()` | 27 |
| 5115 | `_puff()` | 39 |
| 5154 | `_holeDecalMat()` | 8 |
| 5162 | `_flash()` | 66 |
| 5228 | `_vmTetoTela()` | 10 |
| 5238 | `_muzzleWorld()` | 43 |
| 5281 | `_bocaLigada()` | 13 |
| 5294 | `_bocaTiroBot()` | 5 |
| 5299 | `_origemTracerJogador()` | 25 |
| 5324 | `_aimOrigin()` | 5 |
| 5329 | `_updateDoors()` | 10 |
| 5339 | `_updateFx()` | 75 |
| 5414 | `_ejectCasing()` | 18 |
| 5432 | `_makeCtfFlagTex()` | 23 |
| 5455 | `_paintFlagSymbol()` | 9 |
| 5464 | `_flagTexFor()` | 25 |
| 5489 | `_legadoSimbolo()` | 8 |
| 5497 | `_loadCtfSymbols()` | 22 |
| 5519 | `_makeCtfZoneTex()` | 31 |
| 5550 | `_makeSmokeTex()` | 10 |
| 5560 | `_updateSmokeHud()` | 7 |
| 5567 | `_grenadeSpatial()` | 14 |
| 5581 | `_spawnGrenade()` | 24 |
| 5605 | `_throwNade()` | 28 |
| 5633 | `_throwSmoke()` | 1 |
| 5634 | `_throwFrag()` | 3 |
| 5637 | `_flashLiberada()` | 2 |
| 5639 | `_equipNade()` | 18 |
| 5657 | `_unequipNade()` | 11 |
| 5668 | `_explodeFrag()` | 25 |
| 5693 | `_carregarFlashMint()` | 13 |
| 5706 | `_flashProvisoria()` | 17 |
| 5723 | `_cegueiraDe()` | 9 |
| 5732 | `_popFlash()` | 32 |
| 5764 | `_cegarJogador()` | 7 |
| 5771 | `_limparCegueira()` | 6 |
| 5777 | `_tickCegueiraJogador()` | 18 |
| 5795 | `_capturarRetida()` | 27 |
| 5822 | `_corDaFumaca()` | 16 |
| 5838 | `_popSmoke()` | 23 |
| 5861 | `_updateGrenades()` | 37 |
| 5898 | `_teamColor()` | 12 |
| 5910 | `_teamInk()` | 7 |
| 5917 | `_factionOf()` | 1 |
| 5918 | `_voiceKey()` | 2 |
| 5920 | `_teamName()` | 1 |
| 5921 | `_teamTag()` | 6 |
| 5927 | `_plaqueta()` | 17 |
| 5944 | `_uiV3()` | 1 |
| 5945 | `_mirror()` | 2 |
| 5947 | `_defNoLado()` | 3 |
| 5950 | `_botSeparation()` | 56 |
| 6006 | `_initCTF()` | 86 |
| 6092 | `_updateCTF()` | 61 |
| 6153 | `_ctfWin()` | 24 |
| 6177 | `_freeYaw()` | 27 |
| 6204 | `_pullString()` | 23 |
| 6227 | `_walkReach()` | 32 |
| 6259 | `_wpComp()` | 16 |
| 6275 | `_findPathLocal()` | 22 |
| 6297 | `_botCtf()` | 137 |
| 6434 | `_hideCtfHud()` | 6 |
| 6440 | `_updateCtfHud()` | 76 |
| 6516 | `_collide()` | 19 |
| 6535 | `_collideGrade()` | 25 |
| 6560 | `_collideRot()` | 22 |
| 6582 | `_mantleAlcance()` | 67 |
| 6649 | `_mantleColliders()` | 10 |
| 6659 | `_mantleAlcancavel()` | 12 |
| 6671 | `_mantleTarget()` | 32 |
| 6703 | `_beginMantle()` | 16 |
| 6719 | `_stepMantle()` | 29 |
| 6748 | `_freeSpot()` | 30 |
| 6778 | `_retaAndavel()` | 20 |
| 6798 | `_walkDepth()` | 16 |
| 6814 | `_noteHit()` | 17 |
| 6831 | `_deathFeedback()` | 45 |
| 6876 | `_toggleCamView()` | 6 |
| 6882 | `_swapShoulder()` | 7 |
| 6889 | `setCamView()` | 19 |
| 6908 | `_syncCamViewVis()` | 8 |
| 6916 | `_ensurePlayerTP()` | 79 |
| 6995 | `_updatePlayerTP()` | 26 |
| 7021 | `_updatePlayerTPCamera()` | 105 |
| 7126 | `_updateCrosshairParallax()` | 46 |
| 7172 | `_tpDeath()` | 55 |
| 7227 | `_tpRevive()` | 20 |
| 7247 | `_moveEntity()` | 136 |
| 7383 | `_updatePlayer()` | 361 |
| 7744 | `_footstepSurface()` | 15 |
| 7759 | `_updatePickups()` | 156 |
| 7915 | `_botPegaArma()` | 5 |
| 7920 | `_wpnMode()` | 7 |
| 7927 | `_botWeapon()` | 10 |
| 7937 | `_municaoInfinita()` | 1 |
| 7938 | `_pickupAllowed()` | 8 |
| 7946 | `_slotPrimaria()` | 1 |
| 7947 | `_largarArma()` | 3 |
| 7950 | `_grabNearPickup()` | 10 |
| 7960 | `_grabPickup()` | 36 |
| 7996 | `_assentarNoChao()` | 10 |
| 8006 | `refreshPickupModels()` | 24 |
| 8030 | `_dropWeapon()` | 20 |
| 8050 | `_sumirDrop()` | 36 |
| 8086 | `_spawnY()` | 3 |
| 8089 | `_spawnYaw()` | 8 |
| 8097 | `_pickSpawn()` | 25 |
| 8122 | `_respawnPlayer()` | 48 |
| 8170 | `_losClear()` | 15 |
| 8185 | `_raioBloqueado()` | 18 |
| 8203 | `_botCall()` | 43 |
| 8246 | `_teamMarkTex()` | 23 |
| 8269 | `_makeTeamMark()` | 20 |
| 8289 | `_trocarPersonagem()` | 19 |
| 8308 | `_syncRemoteWeapon()` | 23 |
| 8331 | `_updateTeamMark()` | 21 |
| 8352 | `_posturaBot()` | 4 |
| 8356 | `_botEye()` | 1 |
| 8357 | `_enemyOf()` | 8 |
| 8365 | `_duelToken()` | 22 |
| 8387 | `_respawnEntity()` | 37 |
| 8424 | `_botOuve()` | 15 |
| 8439 | `_suavizaDestinoEscolta()` | 33 |
| 8472 | `_updateBot()` | 1015 |
| 9487 | `_flushTraining()` | 13 |
| 9500 | `_updateBotNN()` | 73 |
| 9573 | `_botShootNN()` | 31 |
| 9604 | `_radarFoot()` | 38 |
| 9642 | `_radarStatic()` | 31 |
| 9673 | `_updateRadar()` | 48 |
| 9721 | `_banner()` | 26 |
| 9747 | `_resultadoDaRodada()` | 4 |
| 9751 | `_botaoAmigo()` | 5 |
| 9756 | `_ligarAmigoPlacar()` | 22 |
| 9778 | `_showScoreboard()` | 63 |
| 9841 | `_updateWeaponHud()` | 43 |
| 9884 | `_updateHud()` | 138 |
| 10022 | `update()` | 96 |
| 10118 | `dispose()` | 71 |

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
