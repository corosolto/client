# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.145 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 10191 | 432 |
| `public/js/main.js` | 5655 | 442 |
| `public/js/glbchars.js` | 1548 | 110 |
| `public/js/characters.js` | 1111 | 40 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3560 linhas (35% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 1015 | 8474 | `_updateBot()` | ⚠️ candidato a extração |
| 642 | 812 | `constructor()` | 🔴 append-only |
| 361 | 7385 | `_updatePlayer()` | ⚠️ candidato a extração |
| 288 | 2957 | `_resetPositions()` |  |
| 156 | 7761 | `_updatePickups()` |  |
| 141 | 2367 | `_touchControls()` |  |
| 138 | 9886 | `_updateHud()` |  |
| 137 | 6299 | `_botCtf()` |  |
| 136 | 7249 | `_moveEntity()` |  |
| 105 | 7023 | `_updatePlayerTPCamera()` |  |
| 100 | 4149 | `_tryShoot()` |  |
| 96 | 10024 | `update()` | 🔴 append-only |
| 86 | 6008 | `_initCTF()` |  |
| 80 | 3565 | `_switchTeam()` |  |
| 79 | 3339 | `_endMatch()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `404–407` `516–610` `640–661` `1558–1845` `3645–3682` `3930–4031` `4103–4248` `4263–4278` `4443–4470` `5060–5089` `5164–5282` `5416–5433` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `223–227` `278–278` `311–322` `703–714` `4642–4763` `5952–6007` `6179–6435` `6518–6536` `7385–7745` `8172–8186` `8358–8388` `8474–9488` | — |
| **MAPAS / MUNDO** | `1501–1557` `2957–3244` `6008–6154` `7761–7916` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `2002–2011` `2127–2165` `3530–3544` `5117–5155` `5341–5415` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1454–1500` `3482–3504` `3520–3529` `3545–3564` `4788–4866` `4926–4979` `4996–5059` `9675–9722` `9780–9842` `9886–10023` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 10024–10119 · `_dom()` 1454–1500 · `constructor()` 812–1453

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **4143 de 10191 linhas (41%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 760 | `_pinnedDefs` | 5 |
| 765 | `pickMatchRoster` | 21 |
| 786 | `BOT_WEAPON_POOL` | 5 |
| 791 | `pickMatchWeapons` | 9 |
| 800 | `aguardarPreloads` | 9 |
| 812 | `constructor()` | 642 |
| 1454 | `_dom()` | 47 |
| 1501 | `_buildEnv()` | 57 |
| 1558 | `_buildViewModels()` | 3 |
| 1561 | `_vmFrame` | 285 |
| 1846 | `_vmFrame` | 142 |
| 1988 | `_vmMontarTardio` | 14 |
| 2002 | `_makePuffTexture()` | 10 |
| 2012 | `_makeBloodTex()` | 19 |
| 2031 | `_makeBloodPoolTex()` | 21 |
| 2052 | `_bloodDecal()` | 16 |
| 2068 | `_makeBloodFx()` | 21 |
| 2089 | `_bloodSpatter()` | 18 |
| 2107 | `_bloodPoolAt()` | 6 |
| 2113 | `_updateBlood()` | 14 |
| 2127 | `_makeFlashTex()` | 21 |
| 2148 | `_makeFlashSoftTex()` | 8 |
| 2156 | `_makeFlashCoreTex()` | 10 |
| 2166 | `_input()` | 6 |
| 2172 | `_kd` | 72 |
| 2244 | `_ku` | 5 |
| 2249 | `_md` | 44 |
| 2293 | `_mu` | 10 |
| 2303 | `_mm` | 20 |
| 2323 | `_wh` | 17 |
| 2340 | `_cc` | 1 |
| 2341 | `_blur` | 1 |
| 2342 | `_hiddenInput` | 1 |
| 2343 | `_plc` | 24 |
| 2367 | `_touchControls()` | 141 |
| 2508 | `_releaseInput()` | 11 |
| 2519 | `_touchLook()` | 12 |
| 2531 | `_syncTouchWeps()` | 18 |
| 2549 | `_aimAssist()` | 28 |
| 2577 | `_requestLock()` | 27 |
| 2604 | `_travaAtalhos()` | 17 |
| 2621 | `_soltaAtalhos()` | 6 |
| 2627 | `espectando()` | 2 |
| 2629 | `_acceptInput()` | 7 |
| 2636 | `travarEntrada()` | 13 |
| 2649 | `_chatSeguraPausa()` | 5 |
| 2654 | `_pauseBackdrop()` | 7 |
| 2661 | `_radioShow()` | 6 |
| 2667 | `_radioUi()` | 10 |
| 2677 | `_emoteToggle()` | 10 |
| 2687 | `_emoteMods()` | 9 |
| 2696 | `_emoteUi()` | 20 |
| 2716 | `_emoteClose()` | 6 |
| 2722 | `_emotePick()` | 11 |
| 2733 | `_emoteCtrl()` | 4 |
| 2737 | `_emoteStop()` | 10 |
| 2747 | `_emoteTick()` | 7 |
| 2754 | `_radioPick()` | 20 |
| 2774 | `_abilityNotice()` | 10 |
| 2784 | `_resetSliceAbilities()` | 9 |
| 2793 | `_stackTrace()` | 28 |
| 2821 | `_updateMotocaCharge()` | 10 |
| 2831 | `_recordRoutePoint()` | 11 |
| 2842 | `_routePing()` | 23 |
| 2865 | `_tickRoutePings()` | 12 |
| 2877 | `_objectiveInteractionMultiplier()` | 14 |
| 2891 | `start()` | 5 |
| 2896 | `_startAnnouncerLab()` | 9 |
| 2905 | `_startRound()` | 52 |
| 2957 | `_resetPositions()` | 288 |
| 3245 | `_checkCtfAlvo()` | 13 |
| 3258 | `_checkPace()` | 13 |
| 3271 | `_endRound()` | 37 |
| 3308 | `_roundWinnerVoice()` | 12 |
| 3320 | `_fimDaPartida()` | 13 |
| 3333 | `_modeId()` | 1 |
| 3334 | `_teamPopulation()` | 5 |
| 3339 | `_endMatch()` | 79 |
| 3418 | `_ensureDolly()` | 41 |
| 3459 | `_tickDolly()` | 23 |
| 3482 | `setPaused()` | 23 |
| 3505 | `_now()` | 3 |
| 3508 | `pauseArmed()` | 1 |
| 3509 | `_syncPauseArm()` | 7 |
| 3516 | `resume()` | 4 |
| 3520 | `applySettings()` | 10 |
| 3530 | `_applyQuality()` | 15 |
| 3545 | `onResize()` | 20 |
| 3565 | `_switchTeam()` | 80 |
| 3645 | `_applyVmVisibility()` | 38 |
| 3683 | `_ensureVmPrecisionQa()` | 79 |
| 3762 | `_syncVmPresentation()` | 22 |
| 3784 | `_utilidadeNaMao()` | 7 |
| 3791 | `_vmlabEnsure()` | 14 |
| 3805 | `_vmlabFrame()` | 28 |
| 3833 | `_tuneGet()` | 15 |
| 3848 | `_tune()` | 23 |
| 3871 | `_fxSet()` | 1 |
| 3872 | `aplicarEfeitosAdaptativos()` | 20 |
| 3892 | `_qaCicloArma()` | 8 |
| 3900 | `_cycleWeapon()` | 8 |
| 3908 | `_inspectWeapon()` | 8 |
| 3916 | `_cancelInspect()` | 4 |
| 3920 | `_inspectMix()` | 10 |
| 3930 | `_switchWeapon()` | 43 |
| 3973 | `_deploySfx()` | 7 |
| 3980 | `_scope()` | 18 |
| 3998 | `_zoomFov()` | 5 |
| 4003 | `_reloading()` | 1 |
| 4004 | `_startReload()` | 28 |
| 4032 | `_cancelReload()` | 14 |
| 4046 | `_abortarArmaNaMorte()` | 14 |
| 4060 | `_voltarPraBase()` | 16 |
| 4076 | `_armasServidasPelaRecarga()` | 9 |
| 4085 | `_reloadLayers()` | 18 |
| 4103 | `_installRecoil()` | 33 |
| 4136 | `_shotRecoil()` | 13 |
| 4149 | `_tryShoot()` | 100 |
| 4249 | `_tryKnifeAttack()` | 14 |
| 4263 | `_meleeHit()` | 16 |
| 4279 | `_meleeRange()` | 5 |
| 4284 | `_botMelee()` | 26 |
| 4310 | `_distanceDamage()` | 7 |
| 4317 | `_shotDamage()` | 10 |
| 4327 | `_consultarTiro()` | 15 |
| 4342 | `_perfilCabeca()` | 7 |
| 4349 | `_origemTiroBot()` | 4 |
| 4353 | `_miraTiroBot()` | 13 |
| 4366 | `_participanteHumano()` | 4 |
| 4370 | `_resolverTiroBot()` | 11 |
| 4381 | `_danoTiroBot()` | 12 |
| 4393 | `_aplicarTiroBot()` | 13 |
| 4406 | `_dispararBot()` | 29 |
| 4435 | `_rastroTiroBot()` | 8 |
| 4443 | `_fireHitscan()` | 28 |
| 4471 | `_targetFromHit()` | 9 |
| 4480 | `_penetrationExit()` | 8 |
| 4488 | `_surfaceOf()` | 27 |
| 4515 | `_armoredTarget()` | 6 |
| 4521 | `_entidadeEscolta()` | 1 |
| 4522 | `_aplicaArmadura()` | 11 |
| 4533 | `_armaduraLigada()` | 1 |
| 4534 | `_equiparArmadura()` | 8 |
| 4542 | `_updateArmaduraHud()` | 13 |
| 4555 | `_sincronizarArmaduraVisual()` | 6 |
| 4561 | `_fleshImpact()` | 38 |
| 4599 | `_fxVoice()` | 9 |
| 4608 | `_impactSfx()` | 17 |
| 4625 | `_tintFx()` | 17 |
| 4642 | `_damage()` | 51 |
| 4693 | `_playerHurtFx()` | 5 |
| 4698 | `_kill()` | 66 |
| 4764 | `_checkArenaWin()` | 24 |
| 4788 | `_dmgArc()` | 79 |
| 4867 | `_mkBanner()` | 9 |
| 4876 | `_updateKillSequenceHud()` | 13 |
| 4889 | `_resetKillSequence()` | 7 |
| 4896 | `_fragRestockStep()` | 7 |
| 4903 | `_playerKillFeedback()` | 18 |
| 4921 | `_acertoPrevisto()` | 5 |
| 4926 | `_hitmarker()` | 15 |
| 4941 | `_dmgNumber()` | 20 |
| 4961 | `_feed()` | 19 |
| 4980 | `_skullIcon()` | 6 |
| 4986 | `_killfeedWeaponIcon()` | 10 |
| 4996 | `_wpnIcon()` | 64 |
| 5060 | `_tracer()` | 30 |
| 5090 | `_landingFx()` | 27 |
| 5117 | `_puff()` | 39 |
| 5156 | `_holeDecalMat()` | 8 |
| 5164 | `_flash()` | 66 |
| 5230 | `_vmTetoTela()` | 10 |
| 5240 | `_muzzleWorld()` | 43 |
| 5283 | `_bocaLigada()` | 13 |
| 5296 | `_bocaTiroBot()` | 5 |
| 5301 | `_origemTracerJogador()` | 25 |
| 5326 | `_aimOrigin()` | 5 |
| 5331 | `_updateDoors()` | 10 |
| 5341 | `_updateFx()` | 75 |
| 5416 | `_ejectCasing()` | 18 |
| 5434 | `_makeCtfFlagTex()` | 23 |
| 5457 | `_paintFlagSymbol()` | 9 |
| 5466 | `_flagTexFor()` | 25 |
| 5491 | `_legadoSimbolo()` | 8 |
| 5499 | `_loadCtfSymbols()` | 22 |
| 5521 | `_makeCtfZoneTex()` | 31 |
| 5552 | `_makeSmokeTex()` | 10 |
| 5562 | `_updateSmokeHud()` | 7 |
| 5569 | `_grenadeSpatial()` | 14 |
| 5583 | `_spawnGrenade()` | 24 |
| 5607 | `_throwNade()` | 28 |
| 5635 | `_throwSmoke()` | 1 |
| 5636 | `_throwFrag()` | 3 |
| 5639 | `_flashLiberada()` | 2 |
| 5641 | `_equipNade()` | 18 |
| 5659 | `_unequipNade()` | 11 |
| 5670 | `_explodeFrag()` | 25 |
| 5695 | `_carregarFlashMint()` | 13 |
| 5708 | `_flashProvisoria()` | 17 |
| 5725 | `_cegueiraDe()` | 9 |
| 5734 | `_popFlash()` | 32 |
| 5766 | `_cegarJogador()` | 7 |
| 5773 | `_limparCegueira()` | 6 |
| 5779 | `_tickCegueiraJogador()` | 18 |
| 5797 | `_capturarRetida()` | 27 |
| 5824 | `_corDaFumaca()` | 16 |
| 5840 | `_popSmoke()` | 23 |
| 5863 | `_updateGrenades()` | 37 |
| 5900 | `_teamColor()` | 12 |
| 5912 | `_teamInk()` | 7 |
| 5919 | `_factionOf()` | 1 |
| 5920 | `_voiceKey()` | 2 |
| 5922 | `_teamName()` | 1 |
| 5923 | `_teamTag()` | 6 |
| 5929 | `_plaqueta()` | 17 |
| 5946 | `_uiV3()` | 1 |
| 5947 | `_mirror()` | 2 |
| 5949 | `_defNoLado()` | 3 |
| 5952 | `_botSeparation()` | 56 |
| 6008 | `_initCTF()` | 86 |
| 6094 | `_updateCTF()` | 61 |
| 6155 | `_ctfWin()` | 24 |
| 6179 | `_freeYaw()` | 27 |
| 6206 | `_pullString()` | 23 |
| 6229 | `_walkReach()` | 32 |
| 6261 | `_wpComp()` | 16 |
| 6277 | `_findPathLocal()` | 22 |
| 6299 | `_botCtf()` | 137 |
| 6436 | `_hideCtfHud()` | 6 |
| 6442 | `_updateCtfHud()` | 76 |
| 6518 | `_collide()` | 19 |
| 6537 | `_collideGrade()` | 25 |
| 6562 | `_collideRot()` | 22 |
| 6584 | `_mantleAlcance()` | 67 |
| 6651 | `_mantleColliders()` | 10 |
| 6661 | `_mantleAlcancavel()` | 12 |
| 6673 | `_mantleTarget()` | 32 |
| 6705 | `_beginMantle()` | 16 |
| 6721 | `_stepMantle()` | 29 |
| 6750 | `_freeSpot()` | 30 |
| 6780 | `_retaAndavel()` | 20 |
| 6800 | `_walkDepth()` | 16 |
| 6816 | `_noteHit()` | 17 |
| 6833 | `_deathFeedback()` | 45 |
| 6878 | `_toggleCamView()` | 6 |
| 6884 | `_swapShoulder()` | 7 |
| 6891 | `setCamView()` | 19 |
| 6910 | `_syncCamViewVis()` | 8 |
| 6918 | `_ensurePlayerTP()` | 79 |
| 6997 | `_updatePlayerTP()` | 26 |
| 7023 | `_updatePlayerTPCamera()` | 105 |
| 7128 | `_updateCrosshairParallax()` | 46 |
| 7174 | `_tpDeath()` | 55 |
| 7229 | `_tpRevive()` | 20 |
| 7249 | `_moveEntity()` | 136 |
| 7385 | `_updatePlayer()` | 361 |
| 7746 | `_footstepSurface()` | 15 |
| 7761 | `_updatePickups()` | 156 |
| 7917 | `_botPegaArma()` | 5 |
| 7922 | `_wpnMode()` | 7 |
| 7929 | `_botWeapon()` | 10 |
| 7939 | `_municaoInfinita()` | 1 |
| 7940 | `_pickupAllowed()` | 8 |
| 7948 | `_slotPrimaria()` | 1 |
| 7949 | `_largarArma()` | 3 |
| 7952 | `_grabNearPickup()` | 10 |
| 7962 | `_grabPickup()` | 36 |
| 7998 | `_assentarNoChao()` | 10 |
| 8008 | `refreshPickupModels()` | 24 |
| 8032 | `_dropWeapon()` | 20 |
| 8052 | `_sumirDrop()` | 36 |
| 8088 | `_spawnY()` | 3 |
| 8091 | `_spawnYaw()` | 8 |
| 8099 | `_pickSpawn()` | 25 |
| 8124 | `_respawnPlayer()` | 48 |
| 8172 | `_losClear()` | 15 |
| 8187 | `_raioBloqueado()` | 18 |
| 8205 | `_botCall()` | 43 |
| 8248 | `_teamMarkTex()` | 23 |
| 8271 | `_makeTeamMark()` | 20 |
| 8291 | `_trocarPersonagem()` | 19 |
| 8310 | `_syncRemoteWeapon()` | 23 |
| 8333 | `_updateTeamMark()` | 21 |
| 8354 | `_posturaBot()` | 4 |
| 8358 | `_botEye()` | 1 |
| 8359 | `_enemyOf()` | 8 |
| 8367 | `_duelToken()` | 22 |
| 8389 | `_respawnEntity()` | 37 |
| 8426 | `_botOuve()` | 15 |
| 8441 | `_suavizaDestinoEscolta()` | 33 |
| 8474 | `_updateBot()` | 1015 |
| 9489 | `_flushTraining()` | 13 |
| 9502 | `_updateBotNN()` | 73 |
| 9575 | `_botShootNN()` | 31 |
| 9606 | `_radarFoot()` | 38 |
| 9644 | `_radarStatic()` | 31 |
| 9675 | `_updateRadar()` | 48 |
| 9723 | `_banner()` | 26 |
| 9749 | `_resultadoDaRodada()` | 4 |
| 9753 | `_botaoAmigo()` | 5 |
| 9758 | `_ligarAmigoPlacar()` | 22 |
| 9780 | `_showScoreboard()` | 63 |
| 9843 | `_updateWeaponHud()` | 43 |
| 9886 | `_updateHud()` | 138 |
| 10024 | `update()` | 96 |
| 10120 | `dispose()` | 71 |

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
