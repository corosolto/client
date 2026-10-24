# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.117 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 9010 | 374 |
| `public/js/main.js` | 5075 | 384 |
| `public/js/glbchars.js` | 1233 | 82 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3283 linhas (36% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 847 | 7514 | `_updateBot()` | ⚠️ candidato a extração |
| 646 | 729 | `constructor()` | 🔴 append-only |
| 342 | 6557 | `_updatePlayer()` | ⚠️ candidato a extração |
| 267 | 2810 | `_resetPositions()` |  |
| 158 | 6912 | `_updatePickups()` |  |
| 137 | 5719 | `_botCtf()` |  |
| 134 | 2261 | `_touchControls()` |  |
| 120 | 8747 | `_updateHud()` |  |
| 105 | 6273 | `_updatePlayerTP()` |  |
| 101 | 6456 | `_moveEntity()` |  |
| 92 | 3876 | `_tryShoot()` |  |
| 90 | 8867 | `update()` | 🔴 append-only |
| 86 | 5430 | `_initCTF()` |  |
| 79 | 3463 | `_ensureVmPrecisionQa()` |  |
| 79 | 4456 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `363–366` `442–536` `566–587` `1479–1765` `3429–3462` `3710–3811` `3830–3967` `3982–3997` `4142–4187` `4727–4752` `4800–4900` `4973–4990` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `195–198` `249–249` `282–293` `629–640` `4316–4425` `5369–5429` `5601–5855` `5938–5960` `6557–6898` `7297–7314` `7448–7478` `7514–8360` | — |
| **MAPAS / MUNDO** | `1422–1478` `2810–3076` `5430–5576` `6912–7069` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1922–1931` `2047–2085` `3329–3342` `4753–4791` `4916–4972` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1375–1421` `3281–3303` `3319–3328` `3343–3362` `4456–4534` `4594–4647` `4663–4726` `8547–8594` `8652–8705` `8747–8866` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8867–8956 · `_dom()` 1375–1421 · `constructor()` 729–1374

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3872 de 9010 linhas (43%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 58 | `ANNOUNCER_LAB` | 4 |
| 62 | `VMLAB` | 3 |
| 67 | `VM_QA_CICLO` | 3 |
| 71 | `VM_QA_ADS` | 8 |
| 79 | `VM_MAT_LEGACY` | 4 |
| 85 | `DROP_TTL` | 8 |
| 93 | `ROUNDS_MAX` | 27 |
| 121 | `CTF_ROUNDS_TO_WIN` | 4 |
| 126 | `sanitizeRounds` | 4 |
| 131 | `CTF_CLOCK_SHOW` | 4 |
| 135 | `KILLS_PER_PLAYER` | 7 |
| 142 | `PACE` | 33 |
| 175 | `PAUSE_ARM_MS` | 3 |
| 178 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 188 | `confirmGate` | 7 |
| 199 | `BOT_AIM_PITCH` | 4 |
| 203 | `BOT_DMG_PLAYER` | 21 |
| 224 | `BOT_FAIR` | 5 |
| 229 | `BOT_MOVE2` | 15 |
| 253 | `BOT_FOCUS_MIN` | 3 |
| 260 | `BOT_OUVE_PASSO` | 22 |
| 286 | `BOT_TOKEN_REST` | 7 |
| 294 | `MOVE_MUL` | 6 |
| 301 | `MOVE2` | 4 |
| 305 | `STEP_H` | 3 |
| 312 | `MANTLE_APOIO` | 4 |
| 316 | `MANTLE_GRID` | 5 |
| 321 | `RACK_OLD` | 4 |
| 325 | `RACK_RETA` | 25 |
| 352 | `RADIO` | 5 |
| 358 | `MK_LABELS` | 5 |
| 363 | `GUNFEEL` | 4 |
| 370 | `TRACER_STYLE` | 6 |
| 380 | `ADS_RAMPA_S` | 3 |
| 384 | `aberturaCone` | 16 |
| 400 | `anguloDeDisparo` | 4 |
| 404 | `coneDoDisparo` | 16 |
| 422 | `MOBILE_RADAR_INTERVAL` | 3 |
| 425 | `TOUCH_LOOK_RAD_PX` | 4 |
| 429 | `DMG_FALLOFF` | 5 |
| 434 | `HS_MUL` | 3 |
| 437 | `BALL_CLASS` | 5 |
| 442 | `STATIC_CLASS` | 75 |
| 518 | `VM_KNOB` | 19 |
| 537 | `vmAdsRot` | 4 |
| 542 | `vmFovForAspect` | 24 |
| 566 | `VM_OFF` | 22 |
| 588 | `vmOffY` | 35 |
| 623 | `VMP` | 6 |
| 629 | `BOT_SKILLS` | 11 |
| 641 | `diffKey` | 4 |
| 646 | `rollBotSkill` | 7 |
| 653 | `botTier` | 4 |
| 657 | `_cyclePool` | 5 |
| 662 | `_rosterPool` | 22 |
| 686 | `_pinnedDefs` | 5 |
| 691 | `pickMatchRoster` | 21 |
| 712 | `BOT_WEAPON_POOL` | 5 |
| 717 | `pickMatchWeapons` | 9 |
| 729 | `constructor()` | 646 |
| 1375 | `_dom()` | 47 |
| 1422 | `_buildEnv()` | 57 |
| 1479 | `_buildViewModels()` | 3 |
| 1482 | `_vmFrame` | 284 |
| 1766 | `_vmFrame` | 142 |
| 1908 | `_vmMontarTardio` | 14 |
| 1922 | `_makePuffTexture()` | 10 |
| 1932 | `_makeBloodTex()` | 19 |
| 1951 | `_makeBloodPoolTex()` | 21 |
| 1972 | `_bloodDecal()` | 16 |
| 1988 | `_makeBloodFx()` | 21 |
| 2009 | `_bloodSpatter()` | 18 |
| 2027 | `_bloodPoolAt()` | 6 |
| 2033 | `_updateBlood()` | 14 |
| 2047 | `_makeFlashTex()` | 21 |
| 2068 | `_makeFlashSoftTex()` | 8 |
| 2076 | `_makeFlashCoreTex()` | 10 |
| 2086 | `_input()` | 6 |
| 2092 | `_kd` | 57 |
| 2149 | `_ku` | 5 |
| 2154 | `_md` | 42 |
| 2196 | `_mu` | 7 |
| 2203 | `_mm` | 20 |
| 2223 | `_wh` | 17 |
| 2240 | `_cc` | 1 |
| 2241 | `_blur` | 1 |
| 2242 | `_plc` | 19 |
| 2261 | `_touchControls()` | 134 |
| 2395 | `_touchLook()` | 12 |
| 2407 | `_syncTouchWeps()` | 16 |
| 2423 | `_aimAssist()` | 28 |
| 2451 | `_requestLock()` | 27 |
| 2478 | `_travaAtalhos()` | 4 |
| 2482 | `_soltaAtalhos()` | 5 |
| 2487 | `espectando()` | 2 |
| 2489 | `_acceptInput()` | 7 |
| 2496 | `travarEntrada()` | 17 |
| 2513 | `_chatSeguraPausa()` | 5 |
| 2518 | `_pauseBackdrop()` | 7 |
| 2525 | `_radioShow()` | 6 |
| 2531 | `_radioUi()` | 10 |
| 2541 | `_emoteToggle()` | 9 |
| 2550 | `_emoteMods()` | 9 |
| 2559 | `_emoteUi()` | 20 |
| 2579 | `_emoteClose()` | 6 |
| 2585 | `_emotePick()` | 11 |
| 2596 | `_emoteCtrl()` | 4 |
| 2600 | `_emoteStop()` | 10 |
| 2610 | `_emoteTick()` | 7 |
| 2617 | `_radioPick()` | 20 |
| 2637 | `_abilityNotice()` | 10 |
| 2647 | `_resetSliceAbilities()` | 9 |
| 2656 | `_stackTrace()` | 28 |
| 2684 | `_updateMotocaCharge()` | 10 |
| 2694 | `_recordRoutePoint()` | 11 |
| 2705 | `_routePing()` | 23 |
| 2728 | `_tickRoutePings()` | 12 |
| 2740 | `_objectiveInteractionMultiplier()` | 14 |
| 2754 | `start()` | 5 |
| 2759 | `_startAnnouncerLab()` | 9 |
| 2768 | `_startRound()` | 42 |
| 2810 | `_resetPositions()` | 267 |
| 3077 | `_checkCtfAlvo()` | 13 |
| 3090 | `_checkPace()` | 13 |
| 3103 | `_endRound()` | 34 |
| 3137 | `_roundWinnerVoice()` | 12 |
| 3149 | `_fimDaPartida()` | 7 |
| 3156 | `_endMatch()` | 61 |
| 3217 | `_ensureDolly()` | 41 |
| 3258 | `_tickDolly()` | 23 |
| 3281 | `setPaused()` | 23 |
| 3304 | `_now()` | 3 |
| 3307 | `pauseArmed()` | 1 |
| 3308 | `_syncPauseArm()` | 7 |
| 3315 | `resume()` | 4 |
| 3319 | `applySettings()` | 10 |
| 3329 | `_applyQuality()` | 14 |
| 3343 | `onResize()` | 20 |
| 3363 | `_switchTeam()` | 66 |
| 3429 | `_applyVmVisibility()` | 34 |
| 3463 | `_ensureVmPrecisionQa()` | 79 |
| 3542 | `_syncVmPresentation()` | 22 |
| 3564 | `_utilidadeNaMao()` | 7 |
| 3571 | `_vmlabEnsure()` | 14 |
| 3585 | `_vmlabFrame()` | 28 |
| 3613 | `_tuneGet()` | 15 |
| 3628 | `_tune()` | 23 |
| 3651 | `_fxSet()` | 1 |
| 3652 | `aplicarEfeitosAdaptativos()` | 20 |
| 3672 | `_qaCicloArma()` | 8 |
| 3680 | `_cycleWeapon()` | 8 |
| 3688 | `_inspectWeapon()` | 8 |
| 3696 | `_cancelInspect()` | 4 |
| 3700 | `_inspectMix()` | 10 |
| 3710 | `_switchWeapon()` | 43 |
| 3753 | `_deploySfx()` | 7 |
| 3760 | `_scope()` | 18 |
| 3778 | `_zoomFov()` | 5 |
| 3783 | `_reloading()` | 1 |
| 3784 | `_startReload()` | 28 |
| 3812 | `_reloadLayers()` | 18 |
| 3830 | `_installRecoil()` | 33 |
| 3863 | `_shotRecoil()` | 13 |
| 3876 | `_tryShoot()` | 92 |
| 3968 | `_tryKnifeAttack()` | 14 |
| 3982 | `_meleeHit()` | 16 |
| 3998 | `_meleeRange()` | 5 |
| 4003 | `_botMelee()` | 26 |
| 4029 | `_distanceDamage()` | 7 |
| 4036 | `_shotDamage()` | 10 |
| 4046 | `_consultarTiro()` | 13 |
| 4059 | `_origemTiroBot()` | 4 |
| 4063 | `_miraTiroBot()` | 5 |
| 4068 | `_participanteHumano()` | 4 |
| 4072 | `_resolverTiroBot()` | 11 |
| 4083 | `_danoTiroBot()` | 12 |
| 4095 | `_aplicarTiroBot()` | 12 |
| 4107 | `_dispararBot()` | 29 |
| 4136 | `_rastroTiroBot()` | 6 |
| 4142 | `_fireHitscan()` | 46 |
| 4188 | `_targetFromHit()` | 9 |
| 4197 | `_penetrationExit()` | 8 |
| 4205 | `_surfaceOf()` | 27 |
| 4232 | `_armoredTarget()` | 3 |
| 4235 | `_fleshImpact()` | 38 |
| 4273 | `_fxVoice()` | 9 |
| 4282 | `_impactSfx()` | 17 |
| 4299 | `_tintFx()` | 17 |
| 4316 | `_damage()` | 49 |
| 4365 | `_playerHurtFx()` | 5 |
| 4370 | `_kill()` | 56 |
| 4426 | `_checkArenaWin()` | 30 |
| 4456 | `_dmgArc()` | 79 |
| 4535 | `_mkBanner()` | 9 |
| 4544 | `_updateKillSequenceHud()` | 13 |
| 4557 | `_resetKillSequence()` | 7 |
| 4564 | `_fragRestockStep()` | 7 |
| 4571 | `_playerKillFeedback()` | 18 |
| 4589 | `_acertoPrevisto()` | 5 |
| 4594 | `_hitmarker()` | 15 |
| 4609 | `_dmgNumber()` | 20 |
| 4629 | `_feed()` | 19 |
| 4648 | `_skullIcon()` | 6 |
| 4654 | `_killfeedWeaponIcon()` | 9 |
| 4663 | `_wpnIcon()` | 64 |
| 4727 | `_tracer()` | 26 |
| 4753 | `_puff()` | 39 |
| 4792 | `_holeDecalMat()` | 8 |
| 4800 | `_flash()` | 61 |
| 4861 | `_vmTetoTela()` | 10 |
| 4871 | `_muzzleWorld()` | 30 |
| 4901 | `_aimOrigin()` | 5 |
| 4906 | `_updateDoors()` | 10 |
| 4916 | `_updateFx()` | 57 |
| 4973 | `_ejectCasing()` | 18 |
| 4991 | `_makeCtfFlagTex()` | 23 |
| 5014 | `_paintFlagSymbol()` | 9 |
| 5023 | `_flagTexFor()` | 25 |
| 5048 | `_legadoSimbolo()` | 8 |
| 5056 | `_loadCtfSymbols()` | 22 |
| 5078 | `_makeCtfZoneTex()` | 31 |
| 5109 | `_makeSmokeTex()` | 10 |
| 5119 | `_updateSmokeHud()` | 4 |
| 5123 | `_grenadeSpatial()` | 14 |
| 5137 | `_spawnGrenade()` | 22 |
| 5159 | `_throwNade()` | 20 |
| 5179 | `_throwSmoke()` | 1 |
| 5180 | `_throwFrag()` | 2 |
| 5182 | `_equipNade()` | 15 |
| 5197 | `_unequipNade()` | 11 |
| 5208 | `_explodeFrag()` | 40 |
| 5248 | `_corDaFumaca()` | 16 |
| 5264 | `_popSmoke()` | 23 |
| 5287 | `_updateGrenades()` | 35 |
| 5322 | `_teamColor()` | 12 |
| 5334 | `_teamInk()` | 7 |
| 5341 | `_factionOf()` | 1 |
| 5342 | `_voiceKey()` | 2 |
| 5344 | `_teamName()` | 1 |
| 5345 | `_teamTag()` | 6 |
| 5351 | `_plaqueta()` | 13 |
| 5364 | `_mirror()` | 2 |
| 5366 | `_defNoLado()` | 3 |
| 5369 | `_botSeparation()` | 61 |
| 5430 | `_initCTF()` | 86 |
| 5516 | `_updateCTF()` | 61 |
| 5577 | `_ctfWin()` | 24 |
| 5601 | `_freeYaw()` | 25 |
| 5626 | `_pullString()` | 23 |
| 5649 | `_walkReach()` | 32 |
| 5681 | `_wpComp()` | 16 |
| 5697 | `_findPathLocal()` | 22 |
| 5719 | `_botCtf()` | 137 |
| 5856 | `_hideCtfHud()` | 6 |
| 5862 | `_updateCtfHud()` | 76 |
| 5938 | `_collide()` | 23 |
| 5961 | `_collideRot()` | 22 |
| 5983 | `_mantleAlcance()` | 50 |
| 6033 | `_mantleAlcancavel()` | 12 |
| 6045 | `_mantleTarget()` | 35 |
| 6080 | `_freeSpot()` | 30 |
| 6110 | `_retaAndavel()` | 20 |
| 6130 | `_walkDepth()` | 16 |
| 6146 | `_noteHit()` | 17 |
| 6163 | `_deathFeedback()` | 45 |
| 6208 | `_toggleCamView()` | 6 |
| 6214 | `setCamView()` | 19 |
| 6233 | `_syncCamViewVis()` | 8 |
| 6241 | `_ensurePlayerTP()` | 32 |
| 6273 | `_updatePlayerTP()` | 105 |
| 6378 | `_updateCrosshairParallax()` | 47 |
| 6425 | `_tpDeath()` | 18 |
| 6443 | `_tpRevive()` | 13 |
| 6456 | `_moveEntity()` | 101 |
| 6557 | `_updatePlayer()` | 342 |
| 6899 | `_footstepSurface()` | 13 |
| 6912 | `_updatePickups()` | 158 |
| 7070 | `_wpnMode()` | 7 |
| 7077 | `_botWeapon()` | 10 |
| 7087 | `_municaoInfinita()` | 1 |
| 7088 | `_pickupAllowed()` | 9 |
| 7097 | `_grabNearPickup()` | 10 |
| 7107 | `_grabPickup()` | 35 |
| 7142 | `_assentarNoChao()` | 10 |
| 7152 | `refreshPickupModels()` | 24 |
| 7176 | `_dropWeapon()` | 20 |
| 7196 | `_sumirDrop()` | 36 |
| 7232 | `_spawnY()` | 3 |
| 7235 | `_spawnYaw()` | 5 |
| 7240 | `_pickSpawn()` | 23 |
| 7263 | `_respawnPlayer()` | 34 |
| 7297 | `_losClear()` | 18 |
| 7315 | `_botCall()` | 41 |
| 7356 | `_teamMarkTex()` | 23 |
| 7379 | `_makeTeamMark()` | 16 |
| 7395 | `_trocarPersonagem()` | 19 |
| 7414 | `_syncRemoteWeapon()` | 23 |
| 7437 | `_updateTeamMark()` | 7 |
| 7444 | `_posturaBot()` | 4 |
| 7448 | `_botEye()` | 1 |
| 7449 | `_enemyOf()` | 8 |
| 7457 | `_duelToken()` | 22 |
| 7479 | `_respawnEntity()` | 23 |
| 7502 | `_botOuve()` | 12 |
| 7514 | `_updateBot()` | 847 |
| 8361 | `_flushTraining()` | 13 |
| 8374 | `_updateBotNN()` | 73 |
| 8447 | `_botShootNN()` | 31 |
| 8478 | `_radarFoot()` | 38 |
| 8516 | `_radarStatic()` | 31 |
| 8547 | `_updateRadar()` | 48 |
| 8595 | `_banner()` | 26 |
| 8621 | `_resultadoDaRodada()` | 4 |
| 8625 | `_botaoAmigo()` | 5 |
| 8630 | `_ligarAmigoPlacar()` | 22 |
| 8652 | `_showScoreboard()` | 54 |
| 8706 | `_updateWeaponHud()` | 41 |
| 8747 | `_updateHud()` | 120 |
| 8867 | `update()` | 90 |
| 8957 | `dispose()` | 53 |

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
