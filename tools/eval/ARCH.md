# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.111 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8620 | 352 |
| `public/js/main.js` | 4894 | 366 |
| `public/js/glbchars.js` | 925 | 63 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3366 linhas (39% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 837 | 7191 | `_updateBot()` | ⚠️ candidato a extração |
| 640 | 723 | `constructor()` | 🔴 append-only |
| 308 | 6268 | `_updatePlayer()` | ⚠️ candidato a extração |
| 271 | 1466 | `_buildViewModels()` |  |
| 266 | 2664 | `_resetPositions()` |  |
| 158 | 6589 | `_updatePickups()` |  |
| 137 | 5456 | `_botCtf()` |  |
| 135 | 2220 | `_touchControls()` |  |
| 101 | 6167 | `_moveEntity()` |  |
| 90 | 8478 | `update()` | 🔴 append-only |
| 88 | 8390 | `_updateHud()` |  |
| 86 | 5167 | `_initCTF()` |  |
| 85 | 3666 | `_tryShoot()` |  |
| 85 | 6004 | `_updatePlayerTP()` |  |
| 79 | 3313 | `_ensureVmPrecisionQa()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `361–364` `436–530` `560–581` `1466–1877` `3279–3312` `3509–3601` `3620–3750` `3765–3780` `3925–3970` `4499–4524` `4572–4672` `4745–4761` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `193–196` `247–247` `280–291` `623–634` `4098–4198` `5106–5166` `5338–5592` `5675–5697` `6268–6575` `6974–6991` `7125–7155` `7191–8027` | — |
| **MAPAS / MUNDO** | `1409–1465` `2664–2929` `5167–5313` `6589–6746` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1892–1901` `2016–2054` `3182–3195` `4525–4563` `4688–4744` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1363–1408` `3134–3156` `3172–3181` `3196–3212` `4229–4307` `4366–4419` `4435–4498` `8183–8247` `8305–8354` `8390–8477` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8478–8567 · `_dom()` 1363–1408 · `constructor()` 723–1362

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3903 de 8620 linhas (45%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 56 | `ANNOUNCER_LAB` | 4 |
| 60 | `VMLAB` | 3 |
| 65 | `VM_QA_CICLO` | 3 |
| 69 | `VM_QA_ADS` | 8 |
| 77 | `VM_MAT_LEGACY` | 4 |
| 83 | `DROP_TTL` | 8 |
| 91 | `ROUNDS_MAX` | 27 |
| 119 | `CTF_ROUNDS_TO_WIN` | 4 |
| 124 | `sanitizeRounds` | 4 |
| 129 | `CTF_CLOCK_SHOW` | 4 |
| 133 | `KILLS_PER_PLAYER` | 7 |
| 140 | `PACE` | 33 |
| 173 | `PAUSE_ARM_MS` | 3 |
| 176 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 186 | `confirmGate` | 7 |
| 197 | `BOT_AIM_PITCH` | 4 |
| 201 | `BOT_DMG_PLAYER` | 21 |
| 222 | `BOT_FAIR` | 5 |
| 227 | `BOT_MOVE2` | 15 |
| 251 | `BOT_FOCUS_MIN` | 3 |
| 258 | `BOT_OUVE_PASSO` | 22 |
| 284 | `BOT_TOKEN_REST` | 7 |
| 292 | `MOVE_MUL` | 6 |
| 299 | `MOVE2` | 4 |
| 303 | `STEP_H` | 3 |
| 310 | `MANTLE_APOIO` | 4 |
| 314 | `MANTLE_GRID` | 5 |
| 319 | `RACK_OLD` | 4 |
| 323 | `RACK_RETA` | 25 |
| 350 | `RADIO` | 5 |
| 356 | `MK_LABELS` | 5 |
| 361 | `GUNFEEL` | 4 |
| 368 | `TRACER_STYLE` | 6 |
| 378 | `ADS_RAMPA_S` | 3 |
| 382 | `aberturaCone` | 16 |
| 398 | `anguloDeDisparo` | 4 |
| 402 | `coneDoDisparo` | 16 |
| 420 | `MOBILE_RADAR_INTERVAL` | 4 |
| 423 | `DMG_FALLOFF` | 5 |
| 428 | `HS_MUL` | 3 |
| 431 | `BALL_CLASS` | 5 |
| 436 | `STATIC_CLASS` | 75 |
| 512 | `VM_KNOB` | 19 |
| 531 | `vmAdsRot` | 4 |
| 536 | `vmFovForAspect` | 24 |
| 560 | `VM_OFF` | 22 |
| 582 | `vmOffY` | 35 |
| 617 | `VMP` | 6 |
| 623 | `BOT_SKILLS` | 11 |
| 635 | `diffKey` | 4 |
| 640 | `rollBotSkill` | 7 |
| 647 | `botTier` | 4 |
| 651 | `_cyclePool` | 5 |
| 656 | `_rosterPool` | 22 |
| 680 | `_pinnedDefs` | 5 |
| 685 | `pickMatchRoster` | 21 |
| 706 | `BOT_WEAPON_POOL` | 5 |
| 711 | `pickMatchWeapons` | 9 |
| 723 | `constructor()` | 640 |
| 1363 | `_dom()` | 46 |
| 1409 | `_buildEnv()` | 57 |
| 1466 | `_buildViewModels()` | 271 |
| 1737 | `_vmFrame` | 141 |
| 1750 | `_vmFrame` | 141 |
| 1878 | `_vmMontarTardio` | 14 |
| 1892 | `_makePuffTexture()` | 10 |
| 1902 | `_makeBloodTex()` | 19 |
| 1921 | `_makeBloodPoolTex()` | 21 |
| 1942 | `_bloodDecal()` | 16 |
| 1958 | `_makeBloodFx()` | 20 |
| 1978 | `_bloodSpatter()` | 18 |
| 1996 | `_bloodPoolAt()` | 6 |
| 2002 | `_updateBlood()` | 14 |
| 2016 | `_makeFlashTex()` | 21 |
| 2037 | `_makeFlashSoftTex()` | 8 |
| 2045 | `_makeFlashCoreTex()` | 10 |
| 2055 | `_input()` | 6 |
| 2061 | `_kd` | 49 |
| 2110 | `_ku` | 5 |
| 2115 | `_md` | 40 |
| 2155 | `_mu` | 7 |
| 2162 | `_mm` | 20 |
| 2182 | `_wh` | 17 |
| 2199 | `_cc` | 1 |
| 2200 | `_blur` | 1 |
| 2201 | `_plc` | 19 |
| 2220 | `_touchControls()` | 135 |
| 2355 | `_aimAssist()` | 28 |
| 2383 | `_requestLock()` | 27 |
| 2410 | `_travaAtalhos()` | 4 |
| 2414 | `_soltaAtalhos()` | 5 |
| 2419 | `espectando()` | 2 |
| 2421 | `_acceptInput()` | 7 |
| 2428 | `travarEntrada()` | 17 |
| 2445 | `_chatSeguraPausa()` | 5 |
| 2450 | `_pauseBackdrop()` | 7 |
| 2457 | `_radioShow()` | 6 |
| 2463 | `_radioUi()` | 8 |
| 2471 | `_radioPick()` | 20 |
| 2491 | `_abilityNotice()` | 10 |
| 2501 | `_resetSliceAbilities()` | 9 |
| 2510 | `_stackTrace()` | 28 |
| 2538 | `_updateMotocaCharge()` | 10 |
| 2548 | `_recordRoutePoint()` | 11 |
| 2559 | `_routePing()` | 23 |
| 2582 | `_tickRoutePings()` | 12 |
| 2594 | `_objectiveInteractionMultiplier()` | 14 |
| 2608 | `start()` | 5 |
| 2613 | `_startAnnouncerLab()` | 9 |
| 2622 | `_startRound()` | 42 |
| 2664 | `_resetPositions()` | 266 |
| 2930 | `_checkCtfAlvo()` | 13 |
| 2943 | `_checkPace()` | 13 |
| 2956 | `_endRound()` | 34 |
| 2990 | `_roundWinnerVoice()` | 12 |
| 3002 | `_fimDaPartida()` | 7 |
| 3009 | `_endMatch()` | 61 |
| 3070 | `_ensureDolly()` | 41 |
| 3111 | `_tickDolly()` | 23 |
| 3134 | `setPaused()` | 23 |
| 3157 | `_now()` | 3 |
| 3160 | `pauseArmed()` | 1 |
| 3161 | `_syncPauseArm()` | 7 |
| 3168 | `resume()` | 4 |
| 3172 | `applySettings()` | 10 |
| 3182 | `_applyQuality()` | 14 |
| 3196 | `onResize()` | 17 |
| 3213 | `_switchTeam()` | 66 |
| 3279 | `_applyVmVisibility()` | 34 |
| 3313 | `_ensureVmPrecisionQa()` | 79 |
| 3392 | `_syncVmPresentation()` | 19 |
| 3411 | `_vmlabEnsure()` | 14 |
| 3425 | `_vmlabFrame()` | 28 |
| 3453 | `_tuneGet()` | 15 |
| 3468 | `_tune()` | 23 |
| 3491 | `_fxSet()` | 2 |
| 3493 | `_qaCicloArma()` | 8 |
| 3501 | `_cycleWeapon()` | 8 |
| 3537 | `_inspectWeapon()` | 8 |
| 3545 | `_cancelInspect()` | 4 |
| 3549 | `_inspectMix()` | 10 |
| 3509 | `_switchWeapon()` | 38 |
| 3547 | `_deploySfx()` | 7 |
| 3554 | `_scope()` | 17 |
| 3571 | `_zoomFov()` | 5 |
| 3576 | `_reloading()` | 1 |
| 3577 | `_startReload()` | 25 |
| 3602 | `_reloadLayers()` | 18 |
| 3620 | `_installRecoil()` | 33 |
| 3653 | `_shotRecoil()` | 13 |
| 3666 | `_tryShoot()` | 85 |
| 3751 | `_tryKnifeAttack()` | 14 |
| 3765 | `_meleeHit()` | 16 |
| 3781 | `_meleeRange()` | 5 |
| 3786 | `_botMelee()` | 26 |
| 3812 | `_distanceDamage()` | 7 |
| 3819 | `_shotDamage()` | 10 |
| 3829 | `_consultarTiro()` | 13 |
| 3842 | `_origemTiroBot()` | 4 |
| 3846 | `_miraTiroBot()` | 5 |
| 3851 | `_participanteHumano()` | 4 |
| 3855 | `_resolverTiroBot()` | 11 |
| 3866 | `_danoTiroBot()` | 12 |
| 3878 | `_aplicarTiroBot()` | 12 |
| 3890 | `_dispararBot()` | 29 |
| 3919 | `_rastroTiroBot()` | 6 |
| 3925 | `_fireHitscan()` | 46 |
| 3971 | `_targetFromHit()` | 9 |
| 3980 | `_penetrationExit()` | 8 |
| 3988 | `_surfaceOf()` | 27 |
| 4015 | `_armoredTarget()` | 3 |
| 4018 | `_fleshImpact()` | 38 |
| 4056 | `_fxVoice()` | 9 |
| 4065 | `_impactSfx()` | 17 |
| 4082 | `_tintFx()` | 16 |
| 4098 | `_damage()` | 42 |
| 4140 | `_playerHurtFx()` | 5 |
| 4145 | `_kill()` | 54 |
| 4199 | `_checkArenaWin()` | 30 |
| 4229 | `_dmgArc()` | 79 |
| 4308 | `_mkBanner()` | 9 |
| 4317 | `_updateKillSequenceHud()` | 12 |
| 4329 | `_resetKillSequence()` | 7 |
| 4336 | `_fragRestockStep()` | 7 |
| 4343 | `_playerKillFeedback()` | 18 |
| 4361 | `_acertoPrevisto()` | 5 |
| 4366 | `_hitmarker()` | 15 |
| 4381 | `_dmgNumber()` | 20 |
| 4401 | `_feed()` | 19 |
| 4420 | `_skullIcon()` | 6 |
| 4426 | `_killfeedWeaponIcon()` | 9 |
| 4435 | `_wpnIcon()` | 64 |
| 4499 | `_tracer()` | 26 |
| 4525 | `_puff()` | 39 |
| 4564 | `_holeDecalMat()` | 8 |
| 4572 | `_flash()` | 61 |
| 4633 | `_vmTetoTela()` | 10 |
| 4643 | `_muzzleWorld()` | 30 |
| 4673 | `_aimOrigin()` | 5 |
| 4678 | `_updateDoors()` | 10 |
| 4688 | `_updateFx()` | 57 |
| 4745 | `_ejectCasing()` | 17 |
| 4762 | `_makeCtfFlagTex()` | 23 |
| 4785 | `_paintFlagSymbol()` | 9 |
| 4794 | `_flagTexFor()` | 25 |
| 4819 | `_legadoSimbolo()` | 8 |
| 4827 | `_loadCtfSymbols()` | 22 |
| 4849 | `_makeCtfZoneTex()` | 31 |
| 4880 | `_makeSmokeTex()` | 10 |
| 4890 | `_updateSmokeHud()` | 4 |
| 4894 | `_grenadeSpatial()` | 14 |
| 4908 | `_spawnGrenade()` | 19 |
| 4927 | `_throwNade()` | 13 |
| 4940 | `_throwSmoke()` | 1 |
| 4941 | `_throwFrag()` | 4 |
| 4945 | `_explodeFrag()` | 40 |
| 4985 | `_corDaFumaca()` | 16 |
| 5001 | `_popSmoke()` | 23 |
| 5024 | `_updateGrenades()` | 35 |
| 5059 | `_teamColor()` | 12 |
| 5071 | `_teamInk()` | 7 |
| 5078 | `_factionOf()` | 1 |
| 5079 | `_voiceKey()` | 2 |
| 5081 | `_teamName()` | 1 |
| 5082 | `_teamTag()` | 6 |
| 5088 | `_plaqueta()` | 13 |
| 5101 | `_mirror()` | 2 |
| 5103 | `_defNoLado()` | 3 |
| 5106 | `_botSeparation()` | 61 |
| 5167 | `_initCTF()` | 86 |
| 5253 | `_updateCTF()` | 61 |
| 5314 | `_ctfWin()` | 24 |
| 5338 | `_freeYaw()` | 25 |
| 5363 | `_pullString()` | 23 |
| 5386 | `_walkReach()` | 32 |
| 5418 | `_wpComp()` | 16 |
| 5434 | `_findPathLocal()` | 22 |
| 5456 | `_botCtf()` | 137 |
| 5593 | `_hideCtfHud()` | 6 |
| 5599 | `_updateCtfHud()` | 76 |
| 5675 | `_collide()` | 23 |
| 5698 | `_collideRot()` | 22 |
| 5720 | `_mantleAlcance()` | 50 |
| 5770 | `_mantleAlcancavel()` | 12 |
| 5782 | `_mantleTarget()` | 35 |
| 5817 | `_freeSpot()` | 30 |
| 5847 | `_retaAndavel()` | 20 |
| 5867 | `_walkDepth()` | 16 |
| 5883 | `_noteHit()` | 17 |
| 5900 | `_deathFeedback()` | 45 |
| 5945 | `_toggleCamView()` | 6 |
| 5951 | `setCamView()` | 16 |
| 5967 | `_syncCamViewVis()` | 8 |
| 5975 | `_ensurePlayerTP()` | 29 |
| 6004 | `_updatePlayerTP()` | 85 |
| 6089 | `_updateCrosshairParallax()` | 47 |
| 6136 | `_tpDeath()` | 18 |
| 6154 | `_tpRevive()` | 13 |
| 6167 | `_moveEntity()` | 101 |
| 6268 | `_updatePlayer()` | 308 |
| 6576 | `_footstepSurface()` | 13 |
| 6589 | `_updatePickups()` | 158 |
| 6747 | `_wpnMode()` | 7 |
| 6754 | `_botWeapon()` | 10 |
| 6764 | `_municaoInfinita()` | 1 |
| 6765 | `_pickupAllowed()` | 9 |
| 6774 | `_grabNearPickup()` | 10 |
| 6784 | `_grabPickup()` | 35 |
| 6819 | `_assentarNoChao()` | 10 |
| 6829 | `refreshPickupModels()` | 24 |
| 6853 | `_dropWeapon()` | 20 |
| 6873 | `_sumirDrop()` | 36 |
| 6909 | `_spawnY()` | 3 |
| 6912 | `_spawnYaw()` | 5 |
| 6917 | `_pickSpawn()` | 23 |
| 6940 | `_respawnPlayer()` | 34 |
| 6974 | `_losClear()` | 18 |
| 6992 | `_botCall()` | 41 |
| 7033 | `_teamMarkTex()` | 23 |
| 7056 | `_makeTeamMark()` | 16 |
| 7072 | `_trocarPersonagem()` | 19 |
| 7091 | `_syncRemoteWeapon()` | 23 |
| 7114 | `_updateTeamMark()` | 7 |
| 7121 | `_posturaBot()` | 4 |
| 7125 | `_botEye()` | 1 |
| 7126 | `_enemyOf()` | 8 |
| 7134 | `_duelToken()` | 22 |
| 7156 | `_respawnEntity()` | 23 |
| 7179 | `_botOuve()` | 12 |
| 7191 | `_updateBot()` | 837 |
| 8028 | `_flushTraining()` | 13 |
| 8041 | `_updateBotNN()` | 73 |
| 8114 | `_botShootNN()` | 31 |
| 8145 | `_radarFoot()` | 38 |
| 8188 | `_radarStatic()` | 31 |
| 8183 | `_updateRadar()` | 65 |
| 8248 | `_banner()` | 26 |
| 8274 | `_resultadoDaRodada()` | 4 |
| 8278 | `_botaoAmigo()` | 5 |
| 8283 | `_ligarAmigoPlacar()` | 22 |
| 8305 | `_showScoreboard()` | 50 |
| 8355 | `_updateWeaponHud()` | 35 |
| 8390 | `_updateHud()` | 88 |
| 8478 | `update()` | 90 |
| 8568 | `dispose()` | 52 |

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
