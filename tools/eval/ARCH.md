# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.132 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 9066 | 379 |
| `public/js/main.js` | 5285 | 400 |
| `public/js/glbchars.js` | 1309 | 92 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3269 linhas (36% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 823 | 7592 | `_updateBot()` | ⚠️ candidato a extração |
| 649 | 730 | `constructor()` | 🔴 append-only |
| 344 | 6631 | `_updatePlayer()` | ⚠️ candidato a extração |
| 267 | 2821 | `_resetPositions()` |  |
| 158 | 6988 | `_updatePickups()` |  |
| 137 | 5793 | `_botCtf()` |  |
| 134 | 2271 | `_touchControls()` |  |
| 122 | 8801 | `_updateHud()` |  |
| 105 | 6347 | `_updatePlayerTP()` |  |
| 101 | 6530 | `_moveEntity()` |  |
| 95 | 3936 | `_tryShoot()` |  |
| 90 | 8923 | `update()` | 🔴 append-only |
| 86 | 5504 | `_initCTF()` |  |
| 79 | 3476 | `_ensureVmPrecisionQa()` |  |
| 79 | 4520 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `364–367` `443–537` `567–588` `1483–1770` `3440–3475` `3723–3824` `3890–4030` `4045–4060` `4205–4250` `4791–4816` `4864–4964` `5037–5054` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `196–199` `250–250` `283–294` `630–641` `4379–4489` `5443–5503` `5675–5929` `6012–6034` `6631–6974` `7375–7392` `7526–7556` `7592–8414` | — |
| **MAPAS / MUNDO** | `1426–1482` `2821–3087` `5504–5650` `6988–7145` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1927–1936` `2052–2090` `3340–3353` `4817–4855` `4980–5036` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1379–1425` `3292–3314` `3330–3339` `3354–3373` `4520–4598` `4658–4711` `4727–4790` `8601–8648` `8706–8759` `8801–8922` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8923–9012 · `_dom()` 1379–1425 · `constructor()` 730–1378

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3859 de 9066 linhas (43%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 730 | `constructor()` | 646 |
| 1376 | `_dom()` | 47 |
| 1423 | `_buildEnv()` | 57 |
| 1480 | `_buildViewModels()` | 3 |
| 1483 | `_vmFrame` | 284 |
| 1767 | `_vmFrame` | 142 |
| 1909 | `_vmMontarTardio` | 14 |
| 1923 | `_makePuffTexture()` | 10 |
| 1933 | `_makeBloodTex()` | 19 |
| 1952 | `_makeBloodPoolTex()` | 21 |
| 1973 | `_bloodDecal()` | 16 |
| 1989 | `_makeBloodFx()` | 21 |
| 2010 | `_bloodSpatter()` | 18 |
| 2028 | `_bloodPoolAt()` | 6 |
| 2034 | `_updateBlood()` | 14 |
| 2048 | `_makeFlashTex()` | 21 |
| 2069 | `_makeFlashSoftTex()` | 8 |
| 2077 | `_makeFlashCoreTex()` | 10 |
| 2087 | `_input()` | 6 |
| 2093 | `_kd` | 57 |
| 2150 | `_ku` | 5 |
| 2155 | `_md` | 42 |
| 2197 | `_mu` | 7 |
| 2204 | `_mm` | 20 |
| 2224 | `_wh` | 17 |
| 2241 | `_cc` | 1 |
| 2242 | `_blur` | 1 |
| 2243 | `_plc` | 19 |
| 2262 | `_touchControls()` | 134 |
| 2396 | `_touchLook()` | 12 |
| 2408 | `_syncTouchWeps()` | 16 |
| 2424 | `_aimAssist()` | 28 |
| 2452 | `_requestLock()` | 27 |
| 2479 | `_travaAtalhos()` | 4 |
| 2483 | `_soltaAtalhos()` | 5 |
| 2488 | `espectando()` | 2 |
| 2490 | `_acceptInput()` | 7 |
| 2497 | `travarEntrada()` | 17 |
| 2514 | `_chatSeguraPausa()` | 5 |
| 2519 | `_pauseBackdrop()` | 7 |
| 2526 | `_radioShow()` | 6 |
| 2532 | `_radioUi()` | 10 |
| 2542 | `_emoteToggle()` | 10 |
| 2552 | `_emoteMods()` | 9 |
| 2561 | `_emoteUi()` | 20 |
| 2581 | `_emoteClose()` | 6 |
| 2587 | `_emotePick()` | 11 |
| 2598 | `_emoteCtrl()` | 4 |
| 2602 | `_emoteStop()` | 10 |
| 2612 | `_emoteTick()` | 7 |
| 2619 | `_radioPick()` | 20 |
| 2639 | `_abilityNotice()` | 10 |
| 2649 | `_resetSliceAbilities()` | 9 |
| 2658 | `_stackTrace()` | 28 |
| 2686 | `_updateMotocaCharge()` | 10 |
| 2696 | `_recordRoutePoint()` | 11 |
| 2707 | `_routePing()` | 23 |
| 2730 | `_tickRoutePings()` | 12 |
| 2742 | `_objectiveInteractionMultiplier()` | 14 |
| 2756 | `start()` | 5 |
| 2761 | `_startAnnouncerLab()` | 9 |
| 2770 | `_startRound()` | 42 |
| 2812 | `_resetPositions()` | 267 |
| 3079 | `_checkCtfAlvo()` | 13 |
| 3092 | `_checkPace()` | 13 |
| 3105 | `_endRound()` | 34 |
| 3139 | `_roundWinnerVoice()` | 12 |
| 3151 | `_fimDaPartida()` | 7 |
| 3158 | `_endMatch()` | 61 |
| 3219 | `_ensureDolly()` | 41 |
| 3260 | `_tickDolly()` | 23 |
| 3283 | `setPaused()` | 23 |
| 3306 | `_now()` | 3 |
| 3309 | `pauseArmed()` | 1 |
| 3310 | `_syncPauseArm()` | 7 |
| 3317 | `resume()` | 4 |
| 3321 | `applySettings()` | 10 |
| 3331 | `_applyQuality()` | 14 |
| 3345 | `onResize()` | 20 |
| 3365 | `_switchTeam()` | 66 |
| 3431 | `_applyVmVisibility()` | 34 |
| 3465 | `_ensureVmPrecisionQa()` | 79 |
| 3544 | `_syncVmPresentation()` | 22 |
| 3566 | `_utilidadeNaMao()` | 7 |
| 3573 | `_vmlabEnsure()` | 14 |
| 3587 | `_vmlabFrame()` | 28 |
| 3615 | `_tuneGet()` | 15 |
| 3630 | `_tune()` | 23 |
| 3653 | `_fxSet()` | 1 |
| 3654 | `aplicarEfeitosAdaptativos()` | 20 |
| 3674 | `_qaCicloArma()` | 8 |
| 3682 | `_cycleWeapon()` | 8 |
| 3690 | `_inspectWeapon()` | 8 |
| 3698 | `_cancelInspect()` | 4 |
| 3702 | `_inspectMix()` | 10 |
| 3712 | `_switchWeapon()` | 43 |
| 3755 | `_deploySfx()` | 7 |
| 3762 | `_scope()` | 18 |
| 3780 | `_zoomFov()` | 5 |
| 3785 | `_reloading()` | 1 |
| 3786 | `_startReload()` | 28 |
| 3823 | `_cancelReload()` | 19 |
| 3842 | `_abortarArmaNaMorte()` | 15 |
| 3857 | `_voltarPraBase()` | 13 |
| 3870 | `_armasServidasPelaRecarga()` | 9 |
| 3814 | `_reloadLayers()` | 18 |
| 3832 | `_installRecoil()` | 33 |
| 3865 | `_shotRecoil()` | 13 |
| 3878 | `_tryShoot()` | 92 |
| 3970 | `_tryKnifeAttack()` | 14 |
| 3984 | `_meleeHit()` | 16 |
| 4000 | `_meleeRange()` | 5 |
| 4005 | `_botMelee()` | 26 |
| 4031 | `_distanceDamage()` | 7 |
| 4038 | `_shotDamage()` | 10 |
| 4048 | `_consultarTiro()` | 13 |
| 4061 | `_origemTiroBot()` | 4 |
| 4065 | `_miraTiroBot()` | 5 |
| 4070 | `_participanteHumano()` | 4 |
| 4074 | `_resolverTiroBot()` | 11 |
| 4085 | `_danoTiroBot()` | 12 |
| 4097 | `_aplicarTiroBot()` | 12 |
| 4109 | `_dispararBot()` | 29 |
| 4138 | `_rastroTiroBot()` | 6 |
| 4144 | `_fireHitscan()` | 46 |
| 4190 | `_targetFromHit()` | 9 |
| 4199 | `_penetrationExit()` | 8 |
| 4207 | `_surfaceOf()` | 27 |
| 4234 | `_armoredTarget()` | 3 |
| 4237 | `_fleshImpact()` | 38 |
| 4275 | `_fxVoice()` | 9 |
| 4284 | `_impactSfx()` | 17 |
| 4301 | `_tintFx()` | 17 |
| 4318 | `_damage()` | 49 |
| 4367 | `_playerHurtFx()` | 5 |
| 4372 | `_kill()` | 56 |
| 4428 | `_checkArenaWin()` | 30 |
| 4458 | `_dmgArc()` | 79 |
| 4537 | `_mkBanner()` | 9 |
| 4546 | `_updateKillSequenceHud()` | 13 |
| 4559 | `_resetKillSequence()` | 7 |
| 4566 | `_fragRestockStep()` | 7 |
| 4573 | `_playerKillFeedback()` | 18 |
| 4591 | `_acertoPrevisto()` | 5 |
| 4596 | `_hitmarker()` | 15 |
| 4611 | `_dmgNumber()` | 20 |
| 4631 | `_feed()` | 19 |
| 4650 | `_skullIcon()` | 6 |
| 4656 | `_killfeedWeaponIcon()` | 9 |
| 4665 | `_wpnIcon()` | 64 |
| 4729 | `_tracer()` | 26 |
| 4755 | `_puff()` | 39 |
| 4794 | `_holeDecalMat()` | 8 |
| 4802 | `_flash()` | 61 |
| 4863 | `_vmTetoTela()` | 10 |
| 4873 | `_muzzleWorld()` | 30 |
| 4903 | `_aimOrigin()` | 5 |
| 4908 | `_updateDoors()` | 10 |
| 4918 | `_updateFx()` | 57 |
| 4975 | `_ejectCasing()` | 18 |
| 4993 | `_makeCtfFlagTex()` | 23 |
| 5016 | `_paintFlagSymbol()` | 9 |
| 5025 | `_flagTexFor()` | 25 |
| 5050 | `_legadoSimbolo()` | 8 |
| 5058 | `_loadCtfSymbols()` | 22 |
| 5080 | `_makeCtfZoneTex()` | 31 |
| 5111 | `_makeSmokeTex()` | 10 |
| 5121 | `_updateSmokeHud()` | 4 |
| 5125 | `_grenadeSpatial()` | 14 |
| 5139 | `_spawnGrenade()` | 22 |
| 5161 | `_throwNade()` | 20 |
| 5181 | `_throwSmoke()` | 1 |
| 5182 | `_throwFrag()` | 2 |
| 5184 | `_equipNade()` | 15 |
| 5199 | `_unequipNade()` | 11 |
| 5210 | `_explodeFrag()` | 40 |
| 5250 | `_corDaFumaca()` | 16 |
| 5266 | `_popSmoke()` | 23 |
| 5289 | `_updateGrenades()` | 35 |
| 5324 | `_teamColor()` | 12 |
| 5336 | `_teamInk()` | 7 |
| 5343 | `_factionOf()` | 1 |
| 5344 | `_voiceKey()` | 2 |
| 5346 | `_teamName()` | 1 |
| 5347 | `_teamTag()` | 6 |
| 5353 | `_plaqueta()` | 14 |
| 5367 | `_uiV3()` | 1 |
| 5368 | `_mirror()` | 2 |
| 5370 | `_defNoLado()` | 3 |
| 5373 | `_botSeparation()` | 61 |
| 5434 | `_initCTF()` | 86 |
| 5520 | `_updateCTF()` | 61 |
| 5581 | `_ctfWin()` | 24 |
| 5605 | `_freeYaw()` | 25 |
| 5630 | `_pullString()` | 23 |
| 5653 | `_walkReach()` | 32 |
| 5685 | `_wpComp()` | 16 |
| 5701 | `_findPathLocal()` | 22 |
| 5723 | `_botCtf()` | 137 |
| 5860 | `_hideCtfHud()` | 6 |
| 5866 | `_updateCtfHud()` | 76 |
| 5942 | `_collide()` | 23 |
| 5965 | `_collideRot()` | 22 |
| 5987 | `_mantleAlcance()` | 50 |
| 6116 | `_mantleColliders()` | 10 |
| 6037 | `_mantleAlcancavel()` | 12 |
| 6049 | `_mantleTarget()` | 35 |
| 6144 | `_beginMantle()` | 16 |
| 6160 | `_stepMantle()` | 29 |
| 6084 | `_freeSpot()` | 30 |
| 6114 | `_retaAndavel()` | 20 |
| 6134 | `_walkDepth()` | 16 |
| 6150 | `_noteHit()` | 17 |
| 6167 | `_deathFeedback()` | 45 |
| 6212 | `_toggleCamView()` | 6 |
| 6218 | `setCamView()` | 19 |
| 6237 | `_syncCamViewVis()` | 8 |
| 6245 | `_ensurePlayerTP()` | 32 |
| 6277 | `_updatePlayerTP()` | 105 |
| 6382 | `_updateCrosshairParallax()` | 47 |
| 6429 | `_tpDeath()` | 18 |
| 6447 | `_tpRevive()` | 13 |
| 6460 | `_moveEntity()` | 101 |
| 6561 | `_updatePlayer()` | 342 |
| 6903 | `_footstepSurface()` | 13 |
| 6916 | `_updatePickups()` | 158 |
| 7074 | `_wpnMode()` | 7 |
| 7081 | `_botWeapon()` | 10 |
| 7091 | `_municaoInfinita()` | 1 |
| 7092 | `_pickupAllowed()` | 9 |
| 7101 | `_grabNearPickup()` | 10 |
| 7111 | `_grabPickup()` | 35 |
| 7146 | `_assentarNoChao()` | 10 |
| 7156 | `refreshPickupModels()` | 24 |
| 7180 | `_dropWeapon()` | 20 |
| 7200 | `_sumirDrop()` | 36 |
| 7236 | `_spawnY()` | 3 |
| 7239 | `_spawnYaw()` | 5 |
| 7244 | `_pickSpawn()` | 23 |
| 7267 | `_respawnPlayer()` | 34 |
| 7301 | `_losClear()` | 18 |
| 7319 | `_botCall()` | 41 |
| 7360 | `_teamMarkTex()` | 23 |
| 7383 | `_makeTeamMark()` | 16 |
| 7399 | `_trocarPersonagem()` | 19 |
| 7418 | `_syncRemoteWeapon()` | 23 |
| 7441 | `_updateTeamMark()` | 7 |
| 7448 | `_posturaBot()` | 4 |
| 7452 | `_botEye()` | 1 |
| 7453 | `_enemyOf()` | 8 |
| 7461 | `_duelToken()` | 22 |
| 7483 | `_respawnEntity()` | 23 |
| 7506 | `_botOuve()` | 12 |
| 7518 | `_updateBot()` | 823 |
| 8341 | `_flushTraining()` | 13 |
| 8354 | `_updateBotNN()` | 73 |
| 8427 | `_botShootNN()` | 31 |
| 8458 | `_radarFoot()` | 38 |
| 8496 | `_radarStatic()` | 31 |
| 8527 | `_updateRadar()` | 48 |
| 8575 | `_banner()` | 26 |
| 8601 | `_resultadoDaRodada()` | 4 |
| 8605 | `_botaoAmigo()` | 5 |
| 8610 | `_ligarAmigoPlacar()` | 22 |
| 8632 | `_showScoreboard()` | 54 |
| 8686 | `_updateWeaponHud()` | 41 |
| 8727 | `_updateHud()` | 122 |
| 8849 | `update()` | 90 |
| 8939 | `dispose()` | 53 |

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
