# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.135 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 9633 | 421 |
| `public/js/main.js` | 5454 | 423 |
| `public/js/glbchars.js` | 1414 | 97 |
| `public/js/characters.js` | 1111 | 40 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3319 linhas (34% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 830 | 8140 | `_updateBot()` | ⚠️ candidato a extração |
| 633 | 795 | `constructor()` | 🔴 append-only |
| 359 | 7145 | `_updatePlayer()` | ⚠️ candidato a extração |
| 283 | 2900 | `_resetPositions()` |  |
| 158 | 7517 | `_updatePickups()` |  |
| 141 | 2329 | `_touchControls()` |  |
| 137 | 6162 | `_botCtf()` |  |
| 128 | 7017 | `_moveEntity()` |  |
| 124 | 9358 | `_updateHud()` |  |
| 100 | 4042 | `_tryShoot()` |  |
| 92 | 9482 | `update()` | 🔴 append-only |
| 90 | 6806 | `_updatePlayerTPCamera()` |  |
| 86 | 5873 | `_initCTF()` |  |
| 79 | 3576 | `_ensureVmPrecisionQa()` |  |
| 79 | 4679 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `394–397` `499–593` `623–644` `1532–1819` `3540–3575` `3823–3924` `3996–4141` `4156–4171` `4336–4363` `4950–4979` `5027–5145` `5279–5296` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `214–217` `268–268` `301–312` `686–697` `4533–4648` `5812–5872` `6044–6298` `6381–6403` `7145–7503` `7918–7935` `8069–8099` `8140–8969` | — |
| **MAPAS / MUNDO** | `1475–1531` `2900–3182` `5873–6019` `7517–7674` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1976–1985` `2101–2139` `3436–3449` `4980–5018` `5204–5278` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1428–1474` `3388–3410` `3426–3435` `3450–3469` `4679–4757` `4817–4870` `4886–4949` `9156–9203` `9261–9314` `9358–9481` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 9482–9573 · `_dom()` 1428–1474 · `constructor()` 795–1427

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3931 de 9633 linhas (41%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 63 | `QS` | 3 |
| 69 | `ANNOUNCER_LAB` | 4 |
| 73 | `VMLAB` | 3 |
| 78 | `VM_QA_CICLO` | 3 |
| 82 | `VM_QA_ADS` | 4 |
| 87 | `FLASH_DEBUG_N` | 3 |
| 90 | `NADE_ESTOQUE` | 8 |
| 98 | `VM_MAT_LEGACY` | 4 |
| 104 | `DROP_TTL` | 8 |
| 112 | `ROUNDS_MAX` | 27 |
| 140 | `CTF_ROUNDS_TO_WIN` | 4 |
| 145 | `sanitizeRounds` | 4 |
| 150 | `CTF_CLOCK_SHOW` | 4 |
| 154 | `KILLS_PER_PLAYER` | 7 |
| 161 | `PACE` | 33 |
| 194 | `PAUSE_ARM_MS` | 3 |
| 197 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 207 | `confirmGate` | 7 |
| 218 | `BOT_AIM_PITCH` | 4 |
| 222 | `BOT_DMG_PLAYER` | 21 |
| 243 | `BOT_FAIR` | 5 |
| 248 | `BOT_MOVE2` | 15 |
| 272 | `BOT_FOCUS_MIN` | 3 |
| 279 | `BOT_OUVE_PASSO` | 22 |
| 305 | `BOT_TOKEN_REST` | 7 |
| 313 | `MOVE_MUL` | 6 |
| 320 | `MOVE2` | 4 |
| 324 | `STEP_H` | 3 |
| 339 | `EMPTY_COLLIDERS` | 5 |
| 344 | `RACK_OLD` | 4 |
| 348 | `RACK_RETA` | 25 |
| 373 | `REGEN` | 3 |
| 379 | `ARMADURA_DEBUG` | 3 |
| 383 | `RADIO` | 5 |
| 389 | `MK_LABELS` | 5 |
| 394 | `GUNFEEL` | 4 |
| 399 | `PUNCH_ZOOM` | 3 |
| 402 | `BOCA_CORPO` | 3 |
| 405 | `bocaLocalDaArma` | 22 |
| 427 | `TRACER_STYLE` | 6 |
| 437 | `ADS_RAMPA_S` | 3 |
| 441 | `aberturaCone` | 16 |
| 457 | `anguloDeDisparo` | 4 |
| 461 | `coneDoDisparo` | 16 |
| 479 | `MOBILE_RADAR_INTERVAL` | 3 |
| 482 | `TOUCH_LOOK_RAD_PX` | 4 |
| 486 | `DMG_FALLOFF` | 5 |
| 491 | `HS_MUL` | 3 |
| 494 | `BALL_CLASS` | 5 |
| 499 | `STATIC_CLASS` | 75 |
| 575 | `VM_KNOB` | 19 |
| 594 | `vmAdsRot` | 4 |
| 599 | `vmFovForAspect` | 24 |
| 623 | `VM_OFF` | 22 |
| 645 | `vmOffY` | 35 |
| 680 | `VMP` | 6 |
| 686 | `BOT_SKILLS` | 11 |
| 698 | `diffKey` | 4 |
| 703 | `rollBotSkill` | 7 |
| 710 | `botTier` | 4 |
| 714 | `_cyclePool` | 5 |
| 719 | `_rosterPool` | 22 |
| 743 | `_pinnedDefs` | 5 |
| 748 | `pickMatchRoster` | 21 |
| 769 | `BOT_WEAPON_POOL` | 5 |
| 774 | `pickMatchWeapons` | 9 |
| 783 | `aguardarPreloads` | 9 |
| 730 | `constructor()` | 649 |
| 1379 | `_dom()` | 47 |
| 1426 | `_buildEnv()` | 57 |
| 1483 | `_buildViewModels()` | 3 |
| 1486 | `_vmFrame` | 285 |
| 1771 | `_vmFrame` | 142 |
| 1913 | `_vmMontarTardio` | 14 |
| 1927 | `_makePuffTexture()` | 10 |
| 1937 | `_makeBloodTex()` | 19 |
| 1956 | `_makeBloodPoolTex()` | 21 |
| 1977 | `_bloodDecal()` | 16 |
| 1993 | `_makeBloodFx()` | 21 |
| 2014 | `_bloodSpatter()` | 18 |
| 2032 | `_bloodPoolAt()` | 6 |
| 2038 | `_updateBlood()` | 14 |
| 2052 | `_makeFlashTex()` | 21 |
| 2073 | `_makeFlashSoftTex()` | 8 |
| 2081 | `_makeFlashCoreTex()` | 10 |
| 2091 | `_input()` | 6 |
| 2097 | `_kd` | 62 |
| 2159 | `_ku` | 5 |
| 2164 | `_md` | 42 |
| 2206 | `_mu` | 7 |
| 2213 | `_mm` | 20 |
| 2233 | `_wh` | 17 |
| 2250 | `_cc` | 1 |
| 2251 | `_blur` | 1 |
| 2252 | `_hiddenInput` | 1 |
| 2253 | `_plc` | 20 |
| 2273 | `_touchControls()` | 139 |
| 2412 | `_releaseInput()` | 10 |
| 2405 | `_touchLook()` | 12 |
| 2417 | `_syncTouchWeps()` | 16 |
| 2433 | `_aimAssist()` | 28 |
| 2461 | `_requestLock()` | 27 |
| 2488 | `_travaAtalhos()` | 4 |
| 2492 | `_soltaAtalhos()` | 5 |
| 2497 | `espectando()` | 2 |
| 2499 | `_acceptInput()` | 7 |
| 2506 | `travarEntrada()` | 17 |
| 2523 | `_chatSeguraPausa()` | 5 |
| 2528 | `_pauseBackdrop()` | 7 |
| 2535 | `_radioShow()` | 6 |
| 2541 | `_radioUi()` | 10 |
| 2551 | `_emoteToggle()` | 10 |
| 2561 | `_emoteMods()` | 9 |
| 2570 | `_emoteUi()` | 20 |
| 2590 | `_emoteClose()` | 6 |
| 2596 | `_emotePick()` | 11 |
| 2607 | `_emoteCtrl()` | 4 |
| 2611 | `_emoteStop()` | 10 |
| 2621 | `_emoteTick()` | 7 |
| 2628 | `_radioPick()` | 20 |
| 2648 | `_abilityNotice()` | 10 |
| 2658 | `_resetSliceAbilities()` | 9 |
| 2667 | `_stackTrace()` | 28 |
| 2695 | `_updateMotocaCharge()` | 10 |
| 2705 | `_recordRoutePoint()` | 11 |
| 2716 | `_routePing()` | 23 |
| 2739 | `_tickRoutePings()` | 12 |
| 2751 | `_objectiveInteractionMultiplier()` | 14 |
| 2765 | `start()` | 5 |
| 2770 | `_startAnnouncerLab()` | 9 |
| 2779 | `_startRound()` | 42 |
| 2821 | `_resetPositions()` | 267 |
| 3088 | `_checkCtfAlvo()` | 13 |
| 3101 | `_checkPace()` | 13 |
| 3114 | `_endRound()` | 34 |
| 3148 | `_roundWinnerVoice()` | 12 |
| 3160 | `_fimDaPartida()` | 7 |
| 3167 | `_endMatch()` | 61 |
| 3228 | `_ensureDolly()` | 41 |
| 3269 | `_tickDolly()` | 23 |
| 3292 | `setPaused()` | 23 |
| 3315 | `_now()` | 3 |
| 3318 | `pauseArmed()` | 1 |
| 3319 | `_syncPauseArm()` | 7 |
| 3326 | `resume()` | 4 |
| 3330 | `applySettings()` | 10 |
| 3340 | `_applyQuality()` | 14 |
| 3354 | `onResize()` | 20 |
| 3374 | `_switchTeam()` | 66 |
| 3440 | `_applyVmVisibility()` | 36 |
| 3476 | `_ensureVmPrecisionQa()` | 79 |
| 3555 | `_syncVmPresentation()` | 22 |
| 3577 | `_utilidadeNaMao()` | 7 |
| 3584 | `_vmlabEnsure()` | 14 |
| 3598 | `_vmlabFrame()` | 28 |
| 3626 | `_tuneGet()` | 15 |
| 3641 | `_tune()` | 23 |
| 3664 | `_fxSet()` | 1 |
| 3665 | `aplicarEfeitosAdaptativos()` | 20 |
| 3685 | `_qaCicloArma()` | 8 |
| 3693 | `_cycleWeapon()` | 8 |
| 3701 | `_inspectWeapon()` | 8 |
| 3709 | `_cancelInspect()` | 4 |
| 3713 | `_inspectMix()` | 10 |
| 3723 | `_switchWeapon()` | 43 |
| 3766 | `_deploySfx()` | 7 |
| 3773 | `_scope()` | 18 |
| 3791 | `_zoomFov()` | 5 |
| 3796 | `_reloading()` | 1 |
| 3797 | `_startReload()` | 28 |
| 3825 | `_cancelReload()` | 14 |
| 3839 | `_abortarArmaNaMorte()` | 13 |
| 3852 | `_voltarPraBase()` | 11 |
| 3863 | `_armasServidasPelaRecarga()` | 9 |
| 3872 | `_reloadLayers()` | 18 |
| 3890 | `_installRecoil()` | 33 |
| 3923 | `_shotRecoil()` | 13 |
| 3936 | `_tryShoot()` | 95 |
| 4031 | `_tryKnifeAttack()` | 14 |
| 4045 | `_meleeHit()` | 16 |
| 4061 | `_meleeRange()` | 5 |
| 4066 | `_botMelee()` | 26 |
| 4092 | `_distanceDamage()` | 7 |
| 4099 | `_shotDamage()` | 10 |
| 4109 | `_consultarTiro()` | 13 |
| 4205 | `_perfilCabeca()` | 7 |
| 4122 | `_origemTiroBot()` | 4 |
| 4126 | `_miraTiroBot()` | 5 |
| 4131 | `_participanteHumano()` | 4 |
| 4135 | `_resolverTiroBot()` | 11 |
| 4146 | `_danoTiroBot()` | 12 |
| 4158 | `_aplicarTiroBot()` | 12 |
| 4170 | `_dispararBot()` | 29 |
| 4199 | `_rastroTiroBot()` | 6 |
| 4205 | `_fireHitscan()` | 46 |
| 4251 | `_targetFromHit()` | 9 |
| 4260 | `_penetrationExit()` | 8 |
| 4268 | `_surfaceOf()` | 27 |
| 4295 | `_armoredTarget()` | 3 |
| 4384 | `_aplicaArmadura()` | 10 |
| 4394 | `_armaduraLigada()` | 1 |
| 4395 | `_equiparArmadura()` | 8 |
| 4403 | `_updateArmaduraHud()` | 13 |
| 4416 | `_sincronizarArmaduraVisual()` | 6 |
| 4298 | `_fleshImpact()` | 38 |
| 4336 | `_fxVoice()` | 9 |
| 4345 | `_impactSfx()` | 17 |
| 4362 | `_tintFx()` | 17 |
| 4379 | `_damage()` | 49 |
| 4428 | `_playerHurtFx()` | 5 |
| 4433 | `_kill()` | 57 |
| 4490 | `_checkArenaWin()` | 30 |
| 4520 | `_dmgArc()` | 79 |
| 4599 | `_mkBanner()` | 9 |
| 4608 | `_updateKillSequenceHud()` | 13 |
| 4621 | `_resetKillSequence()` | 7 |
| 4628 | `_fragRestockStep()` | 7 |
| 4635 | `_playerKillFeedback()` | 18 |
| 4653 | `_acertoPrevisto()` | 5 |
| 4658 | `_hitmarker()` | 15 |
| 4673 | `_dmgNumber()` | 20 |
| 4693 | `_feed()` | 19 |
| 4712 | `_skullIcon()` | 6 |
| 4718 | `_killfeedWeaponIcon()` | 9 |
| 4727 | `_wpnIcon()` | 64 |
| 4791 | `_tracer()` | 26 |
| 4817 | `_puff()` | 39 |
| 4856 | `_holeDecalMat()` | 8 |
| 4864 | `_flash()` | 61 |
| 4925 | `_vmTetoTela()` | 10 |
| 4935 | `_muzzleWorld()` | 30 |
| 5104 | `_bocaLigada()` | 13 |
| 5117 | `_bocaTiroBot()` | 5 |
| 5122 | `_origemTracerJogador()` | 25 |
| 4965 | `_aimOrigin()` | 5 |
| 4970 | `_updateDoors()` | 10 |
| 4980 | `_updateFx()` | 57 |
| 5037 | `_ejectCasing()` | 18 |
| 5055 | `_makeCtfFlagTex()` | 23 |
| 5078 | `_paintFlagSymbol()` | 9 |
| 5087 | `_flagTexFor()` | 25 |
| 5112 | `_legadoSimbolo()` | 8 |
| 5120 | `_loadCtfSymbols()` | 22 |
| 5142 | `_makeCtfZoneTex()` | 31 |
| 5173 | `_makeSmokeTex()` | 10 |
| 5183 | `_updateSmokeHud()` | 4 |
| 5187 | `_grenadeSpatial()` | 14 |
| 5201 | `_spawnGrenade()` | 22 |
| 5223 | `_throwNade()` | 27 |
| 5250 | `_throwSmoke()` | 1 |
| 5251 | `_throwFrag()` | 2 |
| 5442 | `_flashLiberada()` | 2 |
| 5253 | `_equipNade()` | 16 |
| 5269 | `_unequipNade()` | 11 |
| 5280 | `_explodeFrag()` | 40 |
| 5498 | `_carregarFlashMint()` | 13 |
| 5511 | `_flashProvisoria()` | 17 |
| 5528 | `_cegueiraDe()` | 9 |
| 5537 | `_popFlash()` | 32 |
| 5569 | `_cegarJogador()` | 7 |
| 5576 | `_limparCegueira()` | 6 |
| 5582 | `_tickCegueiraJogador()` | 18 |
| 5600 | `_capturarRetida()` | 27 |
| 5320 | `_corDaFumaca()` | 16 |
| 5336 | `_popSmoke()` | 23 |
| 5359 | `_updateGrenades()` | 35 |
| 5394 | `_teamColor()` | 12 |
| 5406 | `_teamInk()` | 7 |
| 5413 | `_factionOf()` | 1 |
| 5414 | `_voiceKey()` | 2 |
| 5416 | `_teamName()` | 1 |
| 5417 | `_teamTag()` | 6 |
| 5423 | `_plaqueta()` | 14 |
| 5437 | `_uiV3()` | 1 |
| 5438 | `_mirror()` | 2 |
| 5440 | `_defNoLado()` | 3 |
| 5443 | `_botSeparation()` | 61 |
| 5504 | `_initCTF()` | 86 |
| 5590 | `_updateCTF()` | 61 |
| 5651 | `_ctfWin()` | 24 |
| 5675 | `_freeYaw()` | 25 |
| 5700 | `_pullString()` | 23 |
| 5723 | `_walkReach()` | 32 |
| 5755 | `_wpComp()` | 16 |
| 5771 | `_findPathLocal()` | 22 |
| 5793 | `_botCtf()` | 137 |
| 5930 | `_hideCtfHud()` | 6 |
| 5936 | `_updateCtfHud()` | 76 |
| 6012 | `_collide()` | 23 |
| 6035 | `_collideRot()` | 22 |
| 6057 | `_mantleAlcance()` | 50 |
| 6428 | `_mantleColliders()` | 10 |
| 6107 | `_mantleAlcancavel()` | 12 |
| 6119 | `_mantleTarget()` | 35 |
| 6482 | `_beginMantle()` | 16 |
| 6498 | `_stepMantle()` | 29 |
| 6154 | `_freeSpot()` | 30 |
| 6184 | `_retaAndavel()` | 20 |
| 6204 | `_walkDepth()` | 16 |
| 6220 | `_noteHit()` | 17 |
| 6237 | `_deathFeedback()` | 45 |
| 6282 | `_toggleCamView()` | 6 |
| 6727 | `_swapShoulder()` | 7 |
| 6288 | `setCamView()` | 19 |
| 6307 | `_syncCamViewVis()` | 8 |
| 6315 | `_ensurePlayerTP()` | 32 |
| 6347 | `_updatePlayerTP()` | 105 |
| 6746 | `_updatePlayerTPCamera()` | 90 |
| 6452 | `_updateCrosshairParallax()` | 47 |
| 6499 | `_tpDeath()` | 18 |
| 6517 | `_tpRevive()` | 13 |
| 6530 | `_moveEntity()` | 101 |
| 6631 | `_updatePlayer()` | 344 |
| 6975 | `_footstepSurface()` | 13 |
| 6988 | `_updatePickups()` | 158 |
| 7146 | `_wpnMode()` | 7 |
| 7153 | `_botWeapon()` | 10 |
| 7163 | `_municaoInfinita()` | 1 |
| 7164 | `_pickupAllowed()` | 9 |
| 7641 | `_slotPrimaria()` | 1 |
| 7642 | `_largarArma()` | 3 |
| 7173 | `_grabNearPickup()` | 10 |
| 7183 | `_grabPickup()` | 35 |
| 7218 | `_assentarNoChao()` | 10 |
| 7228 | `refreshPickupModels()` | 24 |
| 7252 | `_dropWeapon()` | 20 |
| 7272 | `_sumirDrop()` | 36 |
| 7308 | `_spawnY()` | 3 |
| 7311 | `_spawnYaw()` | 5 |
| 7316 | `_pickSpawn()` | 23 |
| 7339 | `_respawnPlayer()` | 36 |
| 7375 | `_losClear()` | 18 |
| 7393 | `_botCall()` | 41 |
| 7434 | `_teamMarkTex()` | 23 |
| 7457 | `_makeTeamMark()` | 16 |
| 7473 | `_trocarPersonagem()` | 19 |
| 7492 | `_syncRemoteWeapon()` | 23 |
| 7515 | `_updateTeamMark()` | 7 |
| 7522 | `_posturaBot()` | 4 |
| 7526 | `_botEye()` | 1 |
| 7527 | `_enemyOf()` | 8 |
| 7535 | `_duelToken()` | 22 |
| 7557 | `_respawnEntity()` | 23 |
| 7580 | `_botOuve()` | 12 |
| 7592 | `_updateBot()` | 823 |
| 8415 | `_flushTraining()` | 13 |
| 8428 | `_updateBotNN()` | 73 |
| 8501 | `_botShootNN()` | 31 |
| 8532 | `_radarFoot()` | 38 |
| 8570 | `_radarStatic()` | 31 |
| 8601 | `_updateRadar()` | 48 |
| 8649 | `_banner()` | 26 |
| 8675 | `_resultadoDaRodada()` | 4 |
| 8679 | `_botaoAmigo()` | 5 |
| 8684 | `_ligarAmigoPlacar()` | 22 |
| 8706 | `_showScoreboard()` | 54 |
| 8760 | `_updateWeaponHud()` | 41 |
| 8801 | `_updateHud()` | 122 |
| 8923 | `update()` | 90 |
| 9013 | `dispose()` | 53 |

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
