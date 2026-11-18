# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.156 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 10301 | 438 |
| `public/js/main.js` | 5816 | 449 |
| `public/js/glbchars.js` | 2170 | 156 |
| `public/js/characters.js` | 1243 | 40 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3588 linhas (35% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 1019 | 8531 | `_updateBot()` | ⚠️ candidato a extração |
| 649 | 824 | `constructor()` | 🔴 append-only |
| 366 | 7436 | `_updatePlayer()` | ⚠️ candidato a extração |
| 288 | 2989 | `_resetPositions()` |  |
| 156 | 7817 | `_updatePickups()` |  |
| 141 | 2390 | `_touchControls()` |  |
| 138 | 9990 | `_updateHud()` |  |
| 137 | 6349 | `_botCtf()` |  |
| 136 | 7300 | `_moveEntity()` |  |
| 105 | 7074 | `_updatePlayerTPCamera()` |  |
| 100 | 4191 | `_tryShoot()` |  |
| 96 | 10128 | `update()` | 🔴 append-only |
| 91 | 9736 | `_updateRadar()` |  |
| 86 | 6052 | `_initCTF()` |  |
| 80 | 3380 | `_endMatch()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `404–407` `516–610` `640–661` `1577–1864` `3687–3724` `3972–4073` `4145–4290` `4306–4321` `4486–4513` `5103–5132` `5207–5325` `5459–5476` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `223–227` `278–278` `311–322` `703–714` `4685–4806` `5996–6051` `6229–6485` `6568–6586` `7436–7801` `8228–8242` `8415–8445` `8531–9549` | — |
| **MAPAS / MUNDO** | `1520–1576` `2989–3276` `6052–6203` `7817–7972` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `2024–2033` `2149–2187` `3572–3586` `5160–5198` `5384–5458` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1473–1519` `3524–3546` `3562–3571` `3587–3606` `4831–4909` `4969–5022` `5039–5102` `9736–9826` `9884–9946` `9990–10127` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 10128–10223 · `_dom()` 1473–1519 · `constructor()` 824–1472

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **4200 de 10301 linhas (41%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 769 | `pickMatchRoster` | 22 |
| 791 | `elencoDaEscolta` | 7 |
| 798 | `BOT_WEAPON_POOL` | 5 |
| 803 | `pickMatchWeapons` | 9 |
| 812 | `aguardarPreloads` | 9 |
| 824 | `constructor()` | 649 |
| 1473 | `_dom()` | 47 |
| 1520 | `_buildEnv()` | 57 |
| 1577 | `_buildViewModels()` | 3 |
| 1580 | `_vmFrame` | 285 |
| 1865 | `_vmFrame` | 142 |
| 2007 | `_vmMontarTardio` | 15 |
| 2022 | `_texLocal()` | 2 |
| 2024 | `_makePuffTexture()` | 10 |
| 2034 | `_makeBloodTex()` | 19 |
| 2053 | `_makeBloodPoolTex()` | 21 |
| 2074 | `_bloodDecal()` | 16 |
| 2090 | `_makeBloodFx()` | 21 |
| 2111 | `_bloodSpatter()` | 18 |
| 2129 | `_bloodPoolAt()` | 6 |
| 2135 | `_updateBlood()` | 14 |
| 2149 | `_makeFlashTex()` | 21 |
| 2170 | `_makeFlashSoftTex()` | 8 |
| 2178 | `_makeFlashCoreTex()` | 10 |
| 2188 | `_input()` | 6 |
| 2194 | `_kd` | 73 |
| 2267 | `_ku` | 5 |
| 2272 | `_md` | 44 |
| 2316 | `_mu` | 10 |
| 2326 | `_mm` | 20 |
| 2346 | `_wh` | 17 |
| 2363 | `_cc` | 1 |
| 2364 | `_blur` | 1 |
| 2365 | `_hiddenInput` | 1 |
| 2366 | `_plc` | 24 |
| 2390 | `_touchControls()` | 141 |
| 2531 | `_releaseInput()` | 11 |
| 2542 | `_touchLook()` | 12 |
| 2554 | `_syncTouchWeps()` | 18 |
| 2572 | `_aimAssist()` | 28 |
| 2600 | `_requestLock()` | 27 |
| 2627 | `_travaAtalhos()` | 17 |
| 2644 | `_soltaAtalhos()` | 6 |
| 2650 | `espectando()` | 2 |
| 2652 | `_acceptInput()` | 7 |
| 2659 | `travarEntrada()` | 13 |
| 2672 | `_chatSeguraPausa()` | 5 |
| 2677 | `_pauseBackdrop()` | 7 |
| 2684 | `_radioShow()` | 6 |
| 2690 | `_radioUi()` | 10 |
| 2700 | `_emoteToggle()` | 10 |
| 2710 | `_emoteMods()` | 12 |
| 2722 | `_emoteAnel()` | 4 |
| 2726 | `_emoteUi()` | 22 |
| 2748 | `_emoteClose()` | 6 |
| 2754 | `_emotePick()` | 11 |
| 2765 | `_emoteCtrl()` | 4 |
| 2769 | `_emoteStop()` | 10 |
| 2779 | `_emoteTick()` | 7 |
| 2786 | `_radioPick()` | 20 |
| 2806 | `_abilityNotice()` | 10 |
| 2816 | `_resetSliceAbilities()` | 9 |
| 2825 | `_stackTrace()` | 28 |
| 2853 | `_updateMotocaCharge()` | 10 |
| 2863 | `_recordRoutePoint()` | 11 |
| 2874 | `_routePing()` | 23 |
| 2897 | `_tickRoutePings()` | 12 |
| 2909 | `_objectiveInteractionMultiplier()` | 14 |
| 2923 | `start()` | 5 |
| 2928 | `_startAnnouncerLab()` | 9 |
| 2937 | `_startRound()` | 52 |
| 2989 | `_resetPositions()` | 288 |
| 3277 | `_checkCtfAlvo()` | 13 |
| 3290 | `_checkPace()` | 13 |
| 3303 | `_cerimoniaCorpos()` | 4 |
| 3307 | `_retomarCorposDaCerimonia()` | 4 |
| 3311 | `_endRound()` | 38 |
| 3349 | `_roundWinnerVoice()` | 12 |
| 3361 | `_fimDaPartida()` | 13 |
| 3374 | `_modeId()` | 1 |
| 3375 | `_teamPopulation()` | 5 |
| 3380 | `_endMatch()` | 80 |
| 3460 | `_ensureDolly()` | 41 |
| 3501 | `_tickDolly()` | 23 |
| 3524 | `setPaused()` | 23 |
| 3547 | `_now()` | 3 |
| 3550 | `pauseArmed()` | 1 |
| 3551 | `_syncPauseArm()` | 7 |
| 3558 | `resume()` | 4 |
| 3562 | `applySettings()` | 10 |
| 3572 | `_applyQuality()` | 15 |
| 3587 | `onResize()` | 20 |
| 3607 | `_switchTeam()` | 80 |
| 3687 | `_applyVmVisibility()` | 38 |
| 3725 | `_ensureVmPrecisionQa()` | 79 |
| 3804 | `_syncVmPresentation()` | 22 |
| 3826 | `_utilidadeNaMao()` | 7 |
| 3833 | `_vmlabEnsure()` | 14 |
| 3847 | `_vmlabFrame()` | 28 |
| 3875 | `_tuneGet()` | 15 |
| 3890 | `_tune()` | 23 |
| 3913 | `_fxSet()` | 1 |
| 3914 | `aplicarEfeitosAdaptativos()` | 20 |
| 3934 | `_qaCicloArma()` | 8 |
| 3942 | `_cycleWeapon()` | 8 |
| 3950 | `_inspectWeapon()` | 8 |
| 3958 | `_cancelInspect()` | 4 |
| 3962 | `_inspectMix()` | 10 |
| 3972 | `_switchWeapon()` | 43 |
| 4015 | `_deploySfx()` | 7 |
| 4022 | `_scope()` | 18 |
| 4040 | `_zoomFov()` | 5 |
| 4045 | `_reloading()` | 1 |
| 4046 | `_startReload()` | 28 |
| 4074 | `_cancelReload()` | 14 |
| 4088 | `_abortarArmaNaMorte()` | 14 |
| 4102 | `_voltarPraBase()` | 16 |
| 4118 | `_armasServidasPelaRecarga()` | 9 |
| 4127 | `_reloadLayers()` | 18 |
| 4145 | `_installRecoil()` | 33 |
| 4178 | `_shotRecoil()` | 13 |
| 4191 | `_tryShoot()` | 100 |
| 4291 | `_tryKnifeAttack()` | 15 |
| 4306 | `_meleeHit()` | 16 |
| 4322 | `_meleeRange()` | 5 |
| 4327 | `_botMelee()` | 26 |
| 4353 | `_distanceDamage()` | 7 |
| 4360 | `_shotDamage()` | 10 |
| 4370 | `_consultarTiro()` | 15 |
| 4385 | `_perfilCabeca()` | 7 |
| 4392 | `_origemTiroBot()` | 4 |
| 4396 | `_miraTiroBot()` | 13 |
| 4409 | `_participanteHumano()` | 4 |
| 4413 | `_resolverTiroBot()` | 11 |
| 4424 | `_danoTiroBot()` | 12 |
| 4436 | `_aplicarTiroBot()` | 13 |
| 4449 | `_dispararBot()` | 29 |
| 4478 | `_rastroTiroBot()` | 8 |
| 4486 | `_fireHitscan()` | 28 |
| 4514 | `_targetFromHit()` | 9 |
| 4523 | `_penetrationExit()` | 8 |
| 4531 | `_surfaceOf()` | 27 |
| 4558 | `_armoredTarget()` | 6 |
| 4564 | `_entidadeEscolta()` | 1 |
| 4565 | `_aplicaArmadura()` | 11 |
| 4576 | `_armaduraLigada()` | 1 |
| 4577 | `_equiparArmadura()` | 8 |
| 4585 | `_updateArmaduraHud()` | 13 |
| 4598 | `_sincronizarArmaduraVisual()` | 6 |
| 4604 | `_fleshImpact()` | 38 |
| 4642 | `_fxVoice()` | 9 |
| 4651 | `_impactSfx()` | 17 |
| 4668 | `_tintFx()` | 17 |
| 4685 | `_damage()` | 51 |
| 4736 | `_playerHurtFx()` | 5 |
| 4741 | `_kill()` | 66 |
| 4807 | `_checkArenaWin()` | 24 |
| 4831 | `_dmgArc()` | 79 |
| 4910 | `_mkBanner()` | 9 |
| 4919 | `_updateKillSequenceHud()` | 13 |
| 4932 | `_resetKillSequence()` | 7 |
| 4939 | `_fragRestockStep()` | 7 |
| 4946 | `_playerKillFeedback()` | 18 |
| 4964 | `_acertoPrevisto()` | 5 |
| 4969 | `_hitmarker()` | 15 |
| 4984 | `_dmgNumber()` | 20 |
| 5004 | `_feed()` | 19 |
| 5023 | `_skullIcon()` | 6 |
| 5029 | `_killfeedWeaponIcon()` | 10 |
| 5039 | `_wpnIcon()` | 64 |
| 5103 | `_tracer()` | 30 |
| 5133 | `_landingFx()` | 27 |
| 5160 | `_puff()` | 39 |
| 5199 | `_holeDecalMat()` | 8 |
| 5207 | `_flash()` | 66 |
| 5273 | `_vmTetoTela()` | 10 |
| 5283 | `_muzzleWorld()` | 43 |
| 5326 | `_bocaLigada()` | 13 |
| 5339 | `_bocaTiroBot()` | 5 |
| 5344 | `_origemTracerJogador()` | 25 |
| 5369 | `_aimOrigin()` | 5 |
| 5374 | `_updateDoors()` | 10 |
| 5384 | `_updateFx()` | 75 |
| 5459 | `_ejectCasing()` | 18 |
| 5477 | `_makeCtfFlagTex()` | 23 |
| 5500 | `_paintFlagSymbol()` | 9 |
| 5509 | `_flagTexFor()` | 25 |
| 5534 | `_legadoSimbolo()` | 8 |
| 5542 | `_loadCtfSymbols()` | 22 |
| 5564 | `_makeCtfZoneTex()` | 31 |
| 5595 | `_makeSmokeTex()` | 10 |
| 5605 | `_updateSmokeHud()` | 7 |
| 5612 | `_grenadeSpatial()` | 14 |
| 5626 | `_spawnGrenade()` | 24 |
| 5650 | `_throwNade()` | 29 |
| 5679 | `_throwSmoke()` | 1 |
| 5680 | `_throwFrag()` | 3 |
| 5683 | `_flashLiberada()` | 2 |
| 5685 | `_equipNade()` | 18 |
| 5703 | `_unequipNade()` | 11 |
| 5714 | `_explodeFrag()` | 25 |
| 5739 | `_carregarFlashMint()` | 13 |
| 5752 | `_flashProvisoria()` | 17 |
| 5769 | `_cegueiraDe()` | 9 |
| 5778 | `_popFlash()` | 32 |
| 5810 | `_cegarJogador()` | 7 |
| 5817 | `_limparCegueira()` | 6 |
| 5823 | `_tickCegueiraJogador()` | 18 |
| 5841 | `_capturarRetida()` | 27 |
| 5868 | `_corDaFumaca()` | 16 |
| 5884 | `_popSmoke()` | 23 |
| 5907 | `_updateGrenades()` | 37 |
| 5944 | `_teamColor()` | 12 |
| 5956 | `_teamInk()` | 7 |
| 5963 | `_factionOf()` | 1 |
| 5964 | `_voiceKey()` | 2 |
| 5966 | `_teamName()` | 1 |
| 5967 | `_teamTag()` | 6 |
| 5973 | `_plaqueta()` | 17 |
| 5990 | `_uiV3()` | 1 |
| 5991 | `_mirror()` | 2 |
| 5993 | `_defNoLado()` | 3 |
| 5996 | `_botSeparation()` | 56 |
| 6052 | `_initCTF()` | 86 |
| 6138 | `_updateCTF()` | 66 |
| 6204 | `_ctfWin()` | 25 |
| 6229 | `_freeYaw()` | 27 |
| 6256 | `_pullString()` | 23 |
| 6279 | `_walkReach()` | 32 |
| 6311 | `_wpComp()` | 16 |
| 6327 | `_findPathLocal()` | 22 |
| 6349 | `_botCtf()` | 137 |
| 6486 | `_hideCtfHud()` | 6 |
| 6492 | `_updateCtfHud()` | 76 |
| 6568 | `_collide()` | 19 |
| 6587 | `_collideGrade()` | 25 |
| 6612 | `_collideRot()` | 22 |
| 6634 | `_mantleAlcance()` | 67 |
| 6701 | `_mantleColliders()` | 10 |
| 6711 | `_mantleAlcancavel()` | 12 |
| 6723 | `_mantleTarget()` | 32 |
| 6755 | `_beginMantle()` | 16 |
| 6771 | `_stepMantle()` | 29 |
| 6800 | `_freeSpot()` | 30 |
| 6830 | `_retaAndavel()` | 20 |
| 6850 | `_walkDepth()` | 16 |
| 6866 | `_noteHit()` | 17 |
| 6883 | `_deathFeedback()` | 45 |
| 6928 | `_toggleCamView()` | 6 |
| 6934 | `_swapShoulder()` | 7 |
| 6941 | `setCamView()` | 19 |
| 6960 | `_syncCamViewVis()` | 8 |
| 6968 | `_ensurePlayerTP()` | 80 |
| 7048 | `_updatePlayerTP()` | 26 |
| 7074 | `_updatePlayerTPCamera()` | 105 |
| 7179 | `_updateCrosshairParallax()` | 46 |
| 7225 | `_tpDeath()` | 55 |
| 7280 | `_tpRevive()` | 20 |
| 7300 | `_moveEntity()` | 136 |
| 7436 | `_updatePlayer()` | 366 |
| 7802 | `_footstepSurface()` | 15 |
| 7817 | `_updatePickups()` | 156 |
| 7973 | `_botPegaArma()` | 5 |
| 7978 | `_wpnMode()` | 7 |
| 7985 | `_botWeapon()` | 10 |
| 7995 | `_municaoInfinita()` | 1 |
| 7996 | `_pickupAllowed()` | 8 |
| 8004 | `_slotPrimaria()` | 1 |
| 8005 | `_largarArma()` | 3 |
| 8008 | `_grabNearPickup()` | 10 |
| 8018 | `_grabPickup()` | 36 |
| 8054 | `_assentarNoChao()` | 10 |
| 8064 | `refreshPickupModels()` | 24 |
| 8088 | `_dropWeapon()` | 20 |
| 8108 | `_sumirDrop()` | 36 |
| 8144 | `_spawnY()` | 3 |
| 8147 | `_spawnYaw()` | 8 |
| 8155 | `_pickSpawn()` | 25 |
| 8180 | `_respawnPlayer()` | 48 |
| 8228 | `_losClear()` | 15 |
| 8243 | `_raioBloqueado()` | 18 |
| 8261 | `_botCall()` | 43 |
| 8304 | `_teamMarkTex()` | 23 |
| 8327 | `_makeTeamMark()` | 20 |
| 8347 | `_trocarPersonagem()` | 19 |
| 8366 | `_syncRemoteWeapon()` | 24 |
| 8390 | `_updateTeamMark()` | 21 |
| 8411 | `_posturaBot()` | 4 |
| 8415 | `_botEye()` | 1 |
| 8416 | `_enemyOf()` | 8 |
| 8424 | `_duelToken()` | 22 |
| 8446 | `_respawnEntity()` | 37 |
| 8483 | `_botOuve()` | 15 |
| 8498 | `_suavizaDestinoEscolta()` | 33 |
| 8531 | `_updateBot()` | 1019 |
| 9550 | `_flushTraining()` | 13 |
| 9563 | `_updateBotNN()` | 73 |
| 9636 | `_botShootNN()` | 31 |
| 9667 | `_radarFoot()` | 38 |
| 9705 | `_radarStatic()` | 31 |
| 9736 | `_updateRadar()` | 91 |
| 9827 | `_banner()` | 26 |
| 9853 | `_resultadoDaRodada()` | 4 |
| 9857 | `_botaoAmigo()` | 5 |
| 9862 | `_ligarAmigoPlacar()` | 22 |
| 9884 | `_showScoreboard()` | 63 |
| 9947 | `_updateWeaponHud()` | 43 |
| 9990 | `_updateHud()` | 138 |
| 10128 | `update()` | 96 |
| 10224 | `dispose()` | 77 |

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
