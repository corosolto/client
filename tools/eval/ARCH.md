# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.133 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 9087 | 381 |
| `public/js/main.js` | 5286 | 400 |
| `public/js/glbchars.js` | 1309 | 92 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3275 linhas (36% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 823 | 7611 | `_updateBot()` | ⚠️ candidato a extração |
| 648 | 730 | `constructor()` | 🔴 append-only |
| 344 | 6649 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 2834 | `_resetPositions()` |  |
| 158 | 7006 | `_updatePickups()` |  |
| 139 | 2273 | `_touchControls()` |  |
| 137 | 5811 | `_botCtf()` |  |
| 122 | 8820 | `_updateHud()` |  |
| 105 | 6365 | `_updatePlayerTP()` |  |
| 101 | 6548 | `_moveEntity()` |  |
| 95 | 3951 | `_tryShoot()` |  |
| 90 | 8942 | `update()` | 🔴 append-only |
| 86 | 5522 | `_initCTF()` |  |
| 79 | 3491 | `_ensureVmPrecisionQa()` |  |
| 79 | 4536 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `364–367` `443–537` `567–588` `1482–1769` `3455–3490` `3738–3839` `3905–4045` `4060–4075` `4220–4265` `4807–4832` `4880–4982` `5055–5072` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `196–199` `250–250` `283–294` `630–641` `4394–4505` `5461–5521` `5693–5947` `6030–6052` `6649–6992` `7394–7411` `7545–7575` `7611–8433` | — |
| **MAPAS / MUNDO** | `1425–1481` `2834–3102` `5522–5668` `7006–7163` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1926–1935` `2051–2089` `3355–3368` `4833–4871` `4998–5054` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1378–1424` `3307–3329` `3345–3354` `3369–3388` `4536–4614` `4674–4727` `4743–4806` `8620–8667` `8725–8778` `8820–8941` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8942–9031 · `_dom()` 1378–1424 · `constructor()` 730–1377

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3864 de 9087 linhas (43%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 59 | `ANNOUNCER_LAB` | 4 |
| 63 | `VMLAB` | 3 |
| 68 | `VM_QA_CICLO` | 3 |
| 72 | `VM_QA_ADS` | 8 |
| 80 | `VM_MAT_LEGACY` | 4 |
| 86 | `DROP_TTL` | 8 |
| 94 | `ROUNDS_MAX` | 27 |
| 122 | `CTF_ROUNDS_TO_WIN` | 4 |
| 127 | `sanitizeRounds` | 4 |
| 132 | `CTF_CLOCK_SHOW` | 4 |
| 136 | `KILLS_PER_PLAYER` | 7 |
| 143 | `PACE` | 33 |
| 176 | `PAUSE_ARM_MS` | 3 |
| 179 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 189 | `confirmGate` | 7 |
| 200 | `BOT_AIM_PITCH` | 4 |
| 204 | `BOT_DMG_PLAYER` | 21 |
| 225 | `BOT_FAIR` | 5 |
| 230 | `BOT_MOVE2` | 15 |
| 254 | `BOT_FOCUS_MIN` | 3 |
| 261 | `BOT_OUVE_PASSO` | 22 |
| 287 | `BOT_TOKEN_REST` | 7 |
| 295 | `MOVE_MUL` | 6 |
| 302 | `MOVE2` | 4 |
| 306 | `STEP_H` | 3 |
| 321 | `EMPTY_COLLIDERS` | 5 |
| 322 | `RACK_OLD` | 4 |
| 326 | `RACK_RETA` | 25 |
| 353 | `RADIO` | 5 |
| 359 | `MK_LABELS` | 5 |
| 364 | `GUNFEEL` | 4 |
| 371 | `TRACER_STYLE` | 6 |
| 381 | `ADS_RAMPA_S` | 3 |
| 385 | `aberturaCone` | 16 |
| 401 | `anguloDeDisparo` | 4 |
| 405 | `coneDoDisparo` | 16 |
| 423 | `MOBILE_RADAR_INTERVAL` | 3 |
| 426 | `TOUCH_LOOK_RAD_PX` | 4 |
| 430 | `DMG_FALLOFF` | 5 |
| 435 | `HS_MUL` | 3 |
| 438 | `BALL_CLASS` | 5 |
| 443 | `STATIC_CLASS` | 75 |
| 519 | `VM_KNOB` | 19 |
| 538 | `vmAdsRot` | 4 |
| 543 | `vmFovForAspect` | 24 |
| 567 | `VM_OFF` | 22 |
| 589 | `vmOffY` | 35 |
| 624 | `VMP` | 6 |
| 630 | `BOT_SKILLS` | 11 |
| 642 | `diffKey` | 4 |
| 647 | `rollBotSkill` | 7 |
| 654 | `botTier` | 4 |
| 658 | `_cyclePool` | 5 |
| 663 | `_rosterPool` | 22 |
| 687 | `_pinnedDefs` | 5 |
| 692 | `pickMatchRoster` | 21 |
| 713 | `BOT_WEAPON_POOL` | 5 |
| 718 | `pickMatchWeapons` | 9 |
| 730 | `constructor()` | 648 |
| 1378 | `_dom()` | 47 |
| 1425 | `_buildEnv()` | 57 |
| 1482 | `_buildViewModels()` | 3 |
| 1485 | `_vmFrame` | 285 |
| 1770 | `_vmFrame` | 142 |
| 1912 | `_vmMontarTardio` | 14 |
| 1926 | `_makePuffTexture()` | 10 |
| 1936 | `_makeBloodTex()` | 19 |
| 1955 | `_makeBloodPoolTex()` | 21 |
| 1976 | `_bloodDecal()` | 16 |
| 1992 | `_makeBloodFx()` | 21 |
| 2013 | `_bloodSpatter()` | 18 |
| 2031 | `_bloodPoolAt()` | 6 |
| 2037 | `_updateBlood()` | 14 |
| 2051 | `_makeFlashTex()` | 21 |
| 2072 | `_makeFlashSoftTex()` | 8 |
| 2080 | `_makeFlashCoreTex()` | 10 |
| 2090 | `_input()` | 6 |
| 2096 | `_kd` | 62 |
| 2158 | `_ku` | 5 |
| 2163 | `_md` | 43 |
| 2206 | `_mu` | 7 |
| 2213 | `_mm` | 20 |
| 2233 | `_wh` | 17 |
| 2250 | `_cc` | 1 |
| 2251 | `_blur` | 1 |
| 2252 | `_hiddenInput` | 1 |
| 2253 | `_plc` | 20 |
| 2273 | `_touchControls()` | 139 |
| 2412 | `_releaseInput()` | 10 |
| 2422 | `_touchLook()` | 12 |
| 2434 | `_syncTouchWeps()` | 16 |
| 2450 | `_aimAssist()` | 28 |
| 2478 | `_requestLock()` | 27 |
| 2505 | `_travaAtalhos()` | 4 |
| 2509 | `_soltaAtalhos()` | 5 |
| 2514 | `espectando()` | 2 |
| 2516 | `_acceptInput()` | 7 |
| 2523 | `travarEntrada()` | 13 |
| 2536 | `_chatSeguraPausa()` | 5 |
| 2541 | `_pauseBackdrop()` | 7 |
| 2548 | `_radioShow()` | 6 |
| 2554 | `_radioUi()` | 10 |
| 2564 | `_emoteToggle()` | 10 |
| 2574 | `_emoteMods()` | 9 |
| 2583 | `_emoteUi()` | 20 |
| 2603 | `_emoteClose()` | 6 |
| 2609 | `_emotePick()` | 11 |
| 2620 | `_emoteCtrl()` | 4 |
| 2624 | `_emoteStop()` | 10 |
| 2634 | `_emoteTick()` | 7 |
| 2641 | `_radioPick()` | 20 |
| 2661 | `_abilityNotice()` | 10 |
| 2671 | `_resetSliceAbilities()` | 9 |
| 2680 | `_stackTrace()` | 28 |
| 2708 | `_updateMotocaCharge()` | 10 |
| 2718 | `_recordRoutePoint()` | 11 |
| 2729 | `_routePing()` | 23 |
| 2752 | `_tickRoutePings()` | 12 |
| 2764 | `_objectiveInteractionMultiplier()` | 14 |
| 2778 | `start()` | 5 |
| 2783 | `_startAnnouncerLab()` | 9 |
| 2792 | `_startRound()` | 42 |
| 2834 | `_resetPositions()` | 269 |
| 3103 | `_checkCtfAlvo()` | 13 |
| 3116 | `_checkPace()` | 13 |
| 3129 | `_endRound()` | 34 |
| 3163 | `_roundWinnerVoice()` | 12 |
| 3175 | `_fimDaPartida()` | 7 |
| 3182 | `_endMatch()` | 61 |
| 3243 | `_ensureDolly()` | 41 |
| 3284 | `_tickDolly()` | 23 |
| 3307 | `setPaused()` | 23 |
| 3330 | `_now()` | 3 |
| 3333 | `pauseArmed()` | 1 |
| 3334 | `_syncPauseArm()` | 7 |
| 3341 | `resume()` | 4 |
| 3345 | `applySettings()` | 10 |
| 3355 | `_applyQuality()` | 14 |
| 3369 | `onResize()` | 20 |
| 3389 | `_switchTeam()` | 66 |
| 3455 | `_applyVmVisibility()` | 36 |
| 3491 | `_ensureVmPrecisionQa()` | 79 |
| 3570 | `_syncVmPresentation()` | 22 |
| 3592 | `_utilidadeNaMao()` | 7 |
| 3599 | `_vmlabEnsure()` | 14 |
| 3613 | `_vmlabFrame()` | 28 |
| 3641 | `_tuneGet()` | 15 |
| 3656 | `_tune()` | 23 |
| 3679 | `_fxSet()` | 1 |
| 3680 | `aplicarEfeitosAdaptativos()` | 20 |
| 3700 | `_qaCicloArma()` | 8 |
| 3708 | `_cycleWeapon()` | 8 |
| 3716 | `_inspectWeapon()` | 8 |
| 3724 | `_cancelInspect()` | 4 |
| 3728 | `_inspectMix()` | 10 |
| 3738 | `_switchWeapon()` | 43 |
| 3781 | `_deploySfx()` | 7 |
| 3788 | `_scope()` | 18 |
| 3806 | `_zoomFov()` | 5 |
| 3811 | `_reloading()` | 1 |
| 3812 | `_startReload()` | 28 |
| 3840 | `_cancelReload()` | 14 |
| 3854 | `_abortarArmaNaMorte()` | 13 |
| 3867 | `_voltarPraBase()` | 11 |
| 3878 | `_armasServidasPelaRecarga()` | 9 |
| 3887 | `_reloadLayers()` | 18 |
| 3905 | `_installRecoil()` | 33 |
| 3938 | `_shotRecoil()` | 13 |
| 3951 | `_tryShoot()` | 95 |
| 4046 | `_tryKnifeAttack()` | 14 |
| 4060 | `_meleeHit()` | 16 |
| 4076 | `_meleeRange()` | 5 |
| 4081 | `_botMelee()` | 26 |
| 4107 | `_distanceDamage()` | 7 |
| 4114 | `_shotDamage()` | 10 |
| 4124 | `_consultarTiro()` | 13 |
| 4137 | `_origemTiroBot()` | 4 |
| 4141 | `_miraTiroBot()` | 5 |
| 4146 | `_participanteHumano()` | 4 |
| 4150 | `_resolverTiroBot()` | 11 |
| 4161 | `_danoTiroBot()` | 12 |
| 4173 | `_aplicarTiroBot()` | 12 |
| 4185 | `_dispararBot()` | 29 |
| 4214 | `_rastroTiroBot()` | 6 |
| 4220 | `_fireHitscan()` | 46 |
| 4266 | `_targetFromHit()` | 9 |
| 4275 | `_penetrationExit()` | 8 |
| 4283 | `_surfaceOf()` | 27 |
| 4310 | `_armoredTarget()` | 3 |
| 4313 | `_fleshImpact()` | 38 |
| 4351 | `_fxVoice()` | 9 |
| 4360 | `_impactSfx()` | 17 |
| 4377 | `_tintFx()` | 17 |
| 4394 | `_damage()` | 49 |
| 4443 | `_playerHurtFx()` | 5 |
| 4448 | `_kill()` | 58 |
| 4506 | `_checkArenaWin()` | 30 |
| 4536 | `_dmgArc()` | 79 |
| 4615 | `_mkBanner()` | 9 |
| 4624 | `_updateKillSequenceHud()` | 13 |
| 4637 | `_resetKillSequence()` | 7 |
| 4644 | `_fragRestockStep()` | 7 |
| 4651 | `_playerKillFeedback()` | 18 |
| 4669 | `_acertoPrevisto()` | 5 |
| 4674 | `_hitmarker()` | 15 |
| 4689 | `_dmgNumber()` | 20 |
| 4709 | `_feed()` | 19 |
| 4728 | `_skullIcon()` | 6 |
| 4734 | `_killfeedWeaponIcon()` | 9 |
| 4743 | `_wpnIcon()` | 64 |
| 4807 | `_tracer()` | 26 |
| 4833 | `_puff()` | 39 |
| 4872 | `_holeDecalMat()` | 8 |
| 4880 | `_flash()` | 61 |
| 4941 | `_vmTetoTela()` | 10 |
| 4951 | `_muzzleWorld()` | 32 |
| 4983 | `_aimOrigin()` | 5 |
| 4988 | `_updateDoors()` | 10 |
| 4998 | `_updateFx()` | 57 |
| 5055 | `_ejectCasing()` | 18 |
| 5073 | `_makeCtfFlagTex()` | 23 |
| 5096 | `_paintFlagSymbol()` | 9 |
| 5105 | `_flagTexFor()` | 25 |
| 5130 | `_legadoSimbolo()` | 8 |
| 5138 | `_loadCtfSymbols()` | 22 |
| 5160 | `_makeCtfZoneTex()` | 31 |
| 5191 | `_makeSmokeTex()` | 10 |
| 5201 | `_updateSmokeHud()` | 4 |
| 5205 | `_grenadeSpatial()` | 14 |
| 5219 | `_spawnGrenade()` | 22 |
| 5241 | `_throwNade()` | 27 |
| 5268 | `_throwSmoke()` | 1 |
| 5269 | `_throwFrag()` | 2 |
| 5271 | `_equipNade()` | 16 |
| 5287 | `_unequipNade()` | 11 |
| 5298 | `_explodeFrag()` | 40 |
| 5338 | `_corDaFumaca()` | 16 |
| 5354 | `_popSmoke()` | 23 |
| 5377 | `_updateGrenades()` | 35 |
| 5412 | `_teamColor()` | 12 |
| 5424 | `_teamInk()` | 7 |
| 5431 | `_factionOf()` | 1 |
| 5432 | `_voiceKey()` | 2 |
| 5434 | `_teamName()` | 1 |
| 5435 | `_teamTag()` | 6 |
| 5441 | `_plaqueta()` | 14 |
| 5455 | `_uiV3()` | 1 |
| 5456 | `_mirror()` | 2 |
| 5458 | `_defNoLado()` | 3 |
| 5461 | `_botSeparation()` | 61 |
| 5522 | `_initCTF()` | 86 |
| 5608 | `_updateCTF()` | 61 |
| 5669 | `_ctfWin()` | 24 |
| 5693 | `_freeYaw()` | 25 |
| 5718 | `_pullString()` | 23 |
| 5741 | `_walkReach()` | 32 |
| 5773 | `_wpComp()` | 16 |
| 5789 | `_findPathLocal()` | 22 |
| 5811 | `_botCtf()` | 137 |
| 5948 | `_hideCtfHud()` | 6 |
| 5954 | `_updateCtfHud()` | 76 |
| 6030 | `_collide()` | 23 |
| 6053 | `_collideRot()` | 22 |
| 6075 | `_mantleAlcance()` | 50 |
| 6145 | `_mantleColliders()` | 10 |
| 6125 | `_mantleAlcancavel()` | 12 |
| 6137 | `_mantleTarget()` | 35 |
| 6199 | `_beginMantle()` | 16 |
| 6215 | `_stepMantle()` | 29 |
| 6172 | `_freeSpot()` | 30 |
| 6202 | `_retaAndavel()` | 20 |
| 6222 | `_walkDepth()` | 16 |
| 6238 | `_noteHit()` | 17 |
| 6255 | `_deathFeedback()` | 45 |
| 6300 | `_toggleCamView()` | 6 |
| 6306 | `setCamView()` | 19 |
| 6325 | `_syncCamViewVis()` | 8 |
| 6333 | `_ensurePlayerTP()` | 32 |
| 6365 | `_updatePlayerTP()` | 105 |
| 6470 | `_updateCrosshairParallax()` | 47 |
| 6517 | `_tpDeath()` | 18 |
| 6535 | `_tpRevive()` | 13 |
| 6548 | `_moveEntity()` | 101 |
| 6649 | `_updatePlayer()` | 344 |
| 6993 | `_footstepSurface()` | 13 |
| 7006 | `_updatePickups()` | 158 |
| 7164 | `_wpnMode()` | 7 |
| 7171 | `_botWeapon()` | 10 |
| 7181 | `_municaoInfinita()` | 1 |
| 7182 | `_pickupAllowed()` | 9 |
| 7191 | `_grabNearPickup()` | 10 |
| 7201 | `_grabPickup()` | 35 |
| 7236 | `_assentarNoChao()` | 10 |
| 7246 | `refreshPickupModels()` | 24 |
| 7270 | `_dropWeapon()` | 20 |
| 7290 | `_sumirDrop()` | 36 |
| 7326 | `_spawnY()` | 3 |
| 7329 | `_spawnYaw()` | 5 |
| 7334 | `_pickSpawn()` | 23 |
| 7357 | `_respawnPlayer()` | 37 |
| 7394 | `_losClear()` | 18 |
| 7412 | `_botCall()` | 41 |
| 7453 | `_teamMarkTex()` | 23 |
| 7476 | `_makeTeamMark()` | 16 |
| 7492 | `_trocarPersonagem()` | 19 |
| 7511 | `_syncRemoteWeapon()` | 23 |
| 7534 | `_updateTeamMark()` | 7 |
| 7541 | `_posturaBot()` | 4 |
| 7545 | `_botEye()` | 1 |
| 7546 | `_enemyOf()` | 8 |
| 7554 | `_duelToken()` | 22 |
| 7576 | `_respawnEntity()` | 23 |
| 7599 | `_botOuve()` | 12 |
| 7611 | `_updateBot()` | 823 |
| 8434 | `_flushTraining()` | 13 |
| 8447 | `_updateBotNN()` | 73 |
| 8520 | `_botShootNN()` | 31 |
| 8551 | `_radarFoot()` | 38 |
| 8589 | `_radarStatic()` | 31 |
| 8620 | `_updateRadar()` | 48 |
| 8668 | `_banner()` | 26 |
| 8694 | `_resultadoDaRodada()` | 4 |
| 8698 | `_botaoAmigo()` | 5 |
| 8703 | `_ligarAmigoPlacar()` | 22 |
| 8725 | `_showScoreboard()` | 54 |
| 8779 | `_updateWeaponHud()` | 41 |
| 8820 | `_updateHud()` | 122 |
| 8942 | `update()` | 90 |
| 9032 | `dispose()` | 55 |

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
