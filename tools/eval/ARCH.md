# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.148 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 10207 | 434 |
| `public/js/main.js` | 5796 | 448 |
| `public/js/glbchars.js` | 1618 | 115 |
| `public/js/characters.js` | 1243 | 40 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3564 linhas (35% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 1015 | 8485 | `_updateBot()` | ⚠️ candidato a extração |
| 646 | 816 | `constructor()` | 🔴 append-only |
| 361 | 7396 | `_updatePlayer()` | ⚠️ candidato a extração |
| 288 | 2968 | `_resetPositions()` |  |
| 156 | 7772 | `_updatePickups()` |  |
| 141 | 2378 | `_touchControls()` |  |
| 138 | 9897 | `_updateHud()` |  |
| 137 | 6310 | `_botCtf()` |  |
| 136 | 7260 | `_moveEntity()` |  |
| 105 | 7034 | `_updatePlayerTPCamera()` |  |
| 100 | 4160 | `_tryShoot()` |  |
| 96 | 10035 | `update()` | 🔴 append-only |
| 86 | 6019 | `_initCTF()` |  |
| 80 | 3576 | `_switchTeam()` |  |
| 79 | 3350 | `_endMatch()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `404–407` `516–610` `640–661` `1566–1853` `3656–3693` `3941–4042` `4114–4259` `4274–4289` `4454–4481` `5071–5100` `5175–5293` `5427–5444` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `223–227` `278–278` `311–322` `703–714` `4653–4774` `5963–6018` `6190–6446` `6529–6547` `7396–7756` `8183–8197` `8369–8399` `8485–9499` | — |
| **MAPAS / MUNDO** | `1509–1565` `2968–3255` `6019–6165` `7772–7927` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `2013–2022` `2138–2176` `3541–3555` `5128–5166` `5352–5426` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1462–1508` `3493–3515` `3531–3540` `3556–3575` `4799–4877` `4937–4990` `5007–5070` `9686–9733` `9791–9853` `9897–10034` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 10035–10130 · `_dom()` 1462–1508 · `constructor()` 816–1461

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **4143 de 10207 linhas (41%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 2183 | `_kd` | 72 |
| 2255 | `_ku` | 5 |
| 2260 | `_md` | 44 |
| 2304 | `_mu` | 10 |
| 2314 | `_mm` | 20 |
| 2334 | `_wh` | 17 |
| 2351 | `_cc` | 1 |
| 2352 | `_blur` | 1 |
| 2353 | `_hiddenInput` | 1 |
| 2354 | `_plc` | 24 |
| 2378 | `_touchControls()` | 141 |
| 2519 | `_releaseInput()` | 11 |
| 2530 | `_touchLook()` | 12 |
| 2542 | `_syncTouchWeps()` | 18 |
| 2560 | `_aimAssist()` | 28 |
| 2588 | `_requestLock()` | 27 |
| 2615 | `_travaAtalhos()` | 17 |
| 2632 | `_soltaAtalhos()` | 6 |
| 2638 | `espectando()` | 2 |
| 2640 | `_acceptInput()` | 7 |
| 2647 | `travarEntrada()` | 13 |
| 2660 | `_chatSeguraPausa()` | 5 |
| 2665 | `_pauseBackdrop()` | 7 |
| 2672 | `_radioShow()` | 6 |
| 2678 | `_radioUi()` | 10 |
| 2688 | `_emoteToggle()` | 10 |
| 2698 | `_emoteMods()` | 9 |
| 2707 | `_emoteUi()` | 20 |
| 2727 | `_emoteClose()` | 6 |
| 2733 | `_emotePick()` | 11 |
| 2744 | `_emoteCtrl()` | 4 |
| 2748 | `_emoteStop()` | 10 |
| 2758 | `_emoteTick()` | 7 |
| 2765 | `_radioPick()` | 20 |
| 2785 | `_abilityNotice()` | 10 |
| 2795 | `_resetSliceAbilities()` | 9 |
| 2804 | `_stackTrace()` | 28 |
| 2832 | `_updateMotocaCharge()` | 10 |
| 2842 | `_recordRoutePoint()` | 11 |
| 2853 | `_routePing()` | 23 |
| 2876 | `_tickRoutePings()` | 12 |
| 2888 | `_objectiveInteractionMultiplier()` | 14 |
| 2902 | `start()` | 5 |
| 2907 | `_startAnnouncerLab()` | 9 |
| 2916 | `_startRound()` | 52 |
| 2968 | `_resetPositions()` | 288 |
| 3256 | `_checkCtfAlvo()` | 13 |
| 3269 | `_checkPace()` | 13 |
| 3282 | `_endRound()` | 37 |
| 3319 | `_roundWinnerVoice()` | 12 |
| 3331 | `_fimDaPartida()` | 13 |
| 3344 | `_modeId()` | 1 |
| 3345 | `_teamPopulation()` | 5 |
| 3350 | `_endMatch()` | 79 |
| 3429 | `_ensureDolly()` | 41 |
| 3470 | `_tickDolly()` | 23 |
| 3493 | `setPaused()` | 23 |
| 3516 | `_now()` | 3 |
| 3519 | `pauseArmed()` | 1 |
| 3520 | `_syncPauseArm()` | 7 |
| 3527 | `resume()` | 4 |
| 3531 | `applySettings()` | 10 |
| 3541 | `_applyQuality()` | 15 |
| 3556 | `onResize()` | 20 |
| 3576 | `_switchTeam()` | 80 |
| 3656 | `_applyVmVisibility()` | 38 |
| 3694 | `_ensureVmPrecisionQa()` | 79 |
| 3773 | `_syncVmPresentation()` | 22 |
| 3795 | `_utilidadeNaMao()` | 7 |
| 3802 | `_vmlabEnsure()` | 14 |
| 3816 | `_vmlabFrame()` | 28 |
| 3844 | `_tuneGet()` | 15 |
| 3859 | `_tune()` | 23 |
| 3882 | `_fxSet()` | 1 |
| 3883 | `aplicarEfeitosAdaptativos()` | 20 |
| 3903 | `_qaCicloArma()` | 8 |
| 3911 | `_cycleWeapon()` | 8 |
| 3919 | `_inspectWeapon()` | 8 |
| 3927 | `_cancelInspect()` | 4 |
| 3931 | `_inspectMix()` | 10 |
| 3941 | `_switchWeapon()` | 43 |
| 3984 | `_deploySfx()` | 7 |
| 3991 | `_scope()` | 18 |
| 4009 | `_zoomFov()` | 5 |
| 4014 | `_reloading()` | 1 |
| 4015 | `_startReload()` | 28 |
| 4043 | `_cancelReload()` | 14 |
| 4057 | `_abortarArmaNaMorte()` | 14 |
| 4071 | `_voltarPraBase()` | 16 |
| 4087 | `_armasServidasPelaRecarga()` | 9 |
| 4096 | `_reloadLayers()` | 18 |
| 4114 | `_installRecoil()` | 33 |
| 4147 | `_shotRecoil()` | 13 |
| 4160 | `_tryShoot()` | 100 |
| 4260 | `_tryKnifeAttack()` | 14 |
| 4274 | `_meleeHit()` | 16 |
| 4290 | `_meleeRange()` | 5 |
| 4295 | `_botMelee()` | 26 |
| 4321 | `_distanceDamage()` | 7 |
| 4328 | `_shotDamage()` | 10 |
| 4338 | `_consultarTiro()` | 15 |
| 4353 | `_perfilCabeca()` | 7 |
| 4360 | `_origemTiroBot()` | 4 |
| 4364 | `_miraTiroBot()` | 13 |
| 4377 | `_participanteHumano()` | 4 |
| 4381 | `_resolverTiroBot()` | 11 |
| 4392 | `_danoTiroBot()` | 12 |
| 4404 | `_aplicarTiroBot()` | 13 |
| 4417 | `_dispararBot()` | 29 |
| 4446 | `_rastroTiroBot()` | 8 |
| 4454 | `_fireHitscan()` | 28 |
| 4482 | `_targetFromHit()` | 9 |
| 4491 | `_penetrationExit()` | 8 |
| 4499 | `_surfaceOf()` | 27 |
| 4526 | `_armoredTarget()` | 6 |
| 4532 | `_entidadeEscolta()` | 1 |
| 4533 | `_aplicaArmadura()` | 11 |
| 4544 | `_armaduraLigada()` | 1 |
| 4545 | `_equiparArmadura()` | 8 |
| 4553 | `_updateArmaduraHud()` | 13 |
| 4566 | `_sincronizarArmaduraVisual()` | 6 |
| 4572 | `_fleshImpact()` | 38 |
| 4610 | `_fxVoice()` | 9 |
| 4619 | `_impactSfx()` | 17 |
| 4636 | `_tintFx()` | 17 |
| 4653 | `_damage()` | 51 |
| 4704 | `_playerHurtFx()` | 5 |
| 4709 | `_kill()` | 66 |
| 4775 | `_checkArenaWin()` | 24 |
| 4799 | `_dmgArc()` | 79 |
| 4878 | `_mkBanner()` | 9 |
| 4887 | `_updateKillSequenceHud()` | 13 |
| 4900 | `_resetKillSequence()` | 7 |
| 4907 | `_fragRestockStep()` | 7 |
| 4914 | `_playerKillFeedback()` | 18 |
| 4932 | `_acertoPrevisto()` | 5 |
| 4937 | `_hitmarker()` | 15 |
| 4952 | `_dmgNumber()` | 20 |
| 4972 | `_feed()` | 19 |
| 4991 | `_skullIcon()` | 6 |
| 4997 | `_killfeedWeaponIcon()` | 10 |
| 5007 | `_wpnIcon()` | 64 |
| 5071 | `_tracer()` | 30 |
| 5101 | `_landingFx()` | 27 |
| 5128 | `_puff()` | 39 |
| 5167 | `_holeDecalMat()` | 8 |
| 5175 | `_flash()` | 66 |
| 5241 | `_vmTetoTela()` | 10 |
| 5251 | `_muzzleWorld()` | 43 |
| 5294 | `_bocaLigada()` | 13 |
| 5307 | `_bocaTiroBot()` | 5 |
| 5312 | `_origemTracerJogador()` | 25 |
| 5337 | `_aimOrigin()` | 5 |
| 5342 | `_updateDoors()` | 10 |
| 5352 | `_updateFx()` | 75 |
| 5427 | `_ejectCasing()` | 18 |
| 5445 | `_makeCtfFlagTex()` | 23 |
| 5468 | `_paintFlagSymbol()` | 9 |
| 5477 | `_flagTexFor()` | 25 |
| 5502 | `_legadoSimbolo()` | 8 |
| 5510 | `_loadCtfSymbols()` | 22 |
| 5532 | `_makeCtfZoneTex()` | 31 |
| 5563 | `_makeSmokeTex()` | 10 |
| 5573 | `_updateSmokeHud()` | 7 |
| 5580 | `_grenadeSpatial()` | 14 |
| 5594 | `_spawnGrenade()` | 24 |
| 5618 | `_throwNade()` | 28 |
| 5646 | `_throwSmoke()` | 1 |
| 5647 | `_throwFrag()` | 3 |
| 5650 | `_flashLiberada()` | 2 |
| 5652 | `_equipNade()` | 18 |
| 5670 | `_unequipNade()` | 11 |
| 5681 | `_explodeFrag()` | 25 |
| 5706 | `_carregarFlashMint()` | 13 |
| 5719 | `_flashProvisoria()` | 17 |
| 5736 | `_cegueiraDe()` | 9 |
| 5745 | `_popFlash()` | 32 |
| 5777 | `_cegarJogador()` | 7 |
| 5784 | `_limparCegueira()` | 6 |
| 5790 | `_tickCegueiraJogador()` | 18 |
| 5808 | `_capturarRetida()` | 27 |
| 5835 | `_corDaFumaca()` | 16 |
| 5851 | `_popSmoke()` | 23 |
| 5874 | `_updateGrenades()` | 37 |
| 5911 | `_teamColor()` | 12 |
| 5923 | `_teamInk()` | 7 |
| 5930 | `_factionOf()` | 1 |
| 5931 | `_voiceKey()` | 2 |
| 5933 | `_teamName()` | 1 |
| 5934 | `_teamTag()` | 6 |
| 5940 | `_plaqueta()` | 17 |
| 5957 | `_uiV3()` | 1 |
| 5958 | `_mirror()` | 2 |
| 5960 | `_defNoLado()` | 3 |
| 5963 | `_botSeparation()` | 56 |
| 6019 | `_initCTF()` | 86 |
| 6105 | `_updateCTF()` | 61 |
| 6166 | `_ctfWin()` | 24 |
| 6190 | `_freeYaw()` | 27 |
| 6217 | `_pullString()` | 23 |
| 6240 | `_walkReach()` | 32 |
| 6272 | `_wpComp()` | 16 |
| 6288 | `_findPathLocal()` | 22 |
| 6310 | `_botCtf()` | 137 |
| 6447 | `_hideCtfHud()` | 6 |
| 6453 | `_updateCtfHud()` | 76 |
| 6529 | `_collide()` | 19 |
| 6548 | `_collideGrade()` | 25 |
| 6573 | `_collideRot()` | 22 |
| 6595 | `_mantleAlcance()` | 67 |
| 6662 | `_mantleColliders()` | 10 |
| 6672 | `_mantleAlcancavel()` | 12 |
| 6684 | `_mantleTarget()` | 32 |
| 6716 | `_beginMantle()` | 16 |
| 6732 | `_stepMantle()` | 29 |
| 6761 | `_freeSpot()` | 30 |
| 6791 | `_retaAndavel()` | 20 |
| 6811 | `_walkDepth()` | 16 |
| 6827 | `_noteHit()` | 17 |
| 6844 | `_deathFeedback()` | 45 |
| 6889 | `_toggleCamView()` | 6 |
| 6895 | `_swapShoulder()` | 7 |
| 6902 | `setCamView()` | 19 |
| 6921 | `_syncCamViewVis()` | 8 |
| 6929 | `_ensurePlayerTP()` | 79 |
| 7008 | `_updatePlayerTP()` | 26 |
| 7034 | `_updatePlayerTPCamera()` | 105 |
| 7139 | `_updateCrosshairParallax()` | 46 |
| 7185 | `_tpDeath()` | 55 |
| 7240 | `_tpRevive()` | 20 |
| 7260 | `_moveEntity()` | 136 |
| 7396 | `_updatePlayer()` | 361 |
| 7757 | `_footstepSurface()` | 15 |
| 7772 | `_updatePickups()` | 156 |
| 7928 | `_botPegaArma()` | 5 |
| 7933 | `_wpnMode()` | 7 |
| 7940 | `_botWeapon()` | 10 |
| 7950 | `_municaoInfinita()` | 1 |
| 7951 | `_pickupAllowed()` | 8 |
| 7959 | `_slotPrimaria()` | 1 |
| 7960 | `_largarArma()` | 3 |
| 7963 | `_grabNearPickup()` | 10 |
| 7973 | `_grabPickup()` | 36 |
| 8009 | `_assentarNoChao()` | 10 |
| 8019 | `refreshPickupModels()` | 24 |
| 8043 | `_dropWeapon()` | 20 |
| 8063 | `_sumirDrop()` | 36 |
| 8099 | `_spawnY()` | 3 |
| 8102 | `_spawnYaw()` | 8 |
| 8110 | `_pickSpawn()` | 25 |
| 8135 | `_respawnPlayer()` | 48 |
| 8183 | `_losClear()` | 15 |
| 8198 | `_raioBloqueado()` | 18 |
| 8216 | `_botCall()` | 43 |
| 8259 | `_teamMarkTex()` | 23 |
| 8282 | `_makeTeamMark()` | 20 |
| 8302 | `_trocarPersonagem()` | 19 |
| 8321 | `_syncRemoteWeapon()` | 23 |
| 8344 | `_updateTeamMark()` | 21 |
| 8365 | `_posturaBot()` | 4 |
| 8369 | `_botEye()` | 1 |
| 8370 | `_enemyOf()` | 8 |
| 8378 | `_duelToken()` | 22 |
| 8400 | `_respawnEntity()` | 37 |
| 8437 | `_botOuve()` | 15 |
| 8452 | `_suavizaDestinoEscolta()` | 33 |
| 8485 | `_updateBot()` | 1015 |
| 9500 | `_flushTraining()` | 13 |
| 9513 | `_updateBotNN()` | 73 |
| 9586 | `_botShootNN()` | 31 |
| 9617 | `_radarFoot()` | 38 |
| 9655 | `_radarStatic()` | 31 |
| 9686 | `_updateRadar()` | 48 |
| 9734 | `_banner()` | 26 |
| 9760 | `_resultadoDaRodada()` | 4 |
| 9764 | `_botaoAmigo()` | 5 |
| 9769 | `_ligarAmigoPlacar()` | 22 |
| 9791 | `_showScoreboard()` | 63 |
| 9854 | `_updateWeaponHud()` | 43 |
| 9897 | `_updateHud()` | 138 |
| 10035 | `update()` | 96 |
| 10131 | `dispose()` | 76 |

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
