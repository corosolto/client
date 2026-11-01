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
| 795 | `constructor()` | 633 |
| 1428 | `_dom()` | 47 |
| 1475 | `_buildEnv()` | 57 |
| 1532 | `_buildViewModels()` | 3 |
| 1535 | `_vmFrame` | 285 |
| 1820 | `_vmFrame` | 142 |
| 1962 | `_vmMontarTardio` | 14 |
| 1976 | `_makePuffTexture()` | 10 |
| 1986 | `_makeBloodTex()` | 19 |
| 2005 | `_makeBloodPoolTex()` | 21 |
| 2026 | `_bloodDecal()` | 16 |
| 2042 | `_makeBloodFx()` | 21 |
| 2063 | `_bloodSpatter()` | 18 |
| 2081 | `_bloodPoolAt()` | 6 |
| 2087 | `_updateBlood()` | 14 |
| 2101 | `_makeFlashTex()` | 21 |
| 2122 | `_makeFlashSoftTex()` | 8 |
| 2130 | `_makeFlashCoreTex()` | 10 |
| 2140 | `_input()` | 6 |
| 2146 | `_kd` | 68 |
| 2214 | `_ku` | 5 |
| 2219 | `_md` | 43 |
| 2262 | `_mu` | 7 |
| 2269 | `_mm` | 20 |
| 2289 | `_wh` | 17 |
| 2306 | `_cc` | 1 |
| 2307 | `_blur` | 1 |
| 2308 | `_hiddenInput` | 1 |
| 2309 | `_plc` | 20 |
| 2329 | `_touchControls()` | 141 |
| 2470 | `_releaseInput()` | 11 |
| 2481 | `_touchLook()` | 12 |
| 2493 | `_syncTouchWeps()` | 18 |
| 2511 | `_aimAssist()` | 28 |
| 2539 | `_requestLock()` | 27 |
| 2566 | `_travaAtalhos()` | 4 |
| 2570 | `_soltaAtalhos()` | 5 |
| 2575 | `espectando()` | 2 |
| 2577 | `_acceptInput()` | 7 |
| 2584 | `travarEntrada()` | 13 |
| 2597 | `_chatSeguraPausa()` | 5 |
| 2602 | `_pauseBackdrop()` | 7 |
| 2609 | `_radioShow()` | 6 |
| 2615 | `_radioUi()` | 10 |
| 2625 | `_emoteToggle()` | 10 |
| 2635 | `_emoteMods()` | 9 |
| 2644 | `_emoteUi()` | 20 |
| 2664 | `_emoteClose()` | 6 |
| 2670 | `_emotePick()` | 11 |
| 2681 | `_emoteCtrl()` | 4 |
| 2685 | `_emoteStop()` | 10 |
| 2695 | `_emoteTick()` | 7 |
| 2702 | `_radioPick()` | 20 |
| 2722 | `_abilityNotice()` | 10 |
| 2732 | `_resetSliceAbilities()` | 9 |
| 2741 | `_stackTrace()` | 28 |
| 2769 | `_updateMotocaCharge()` | 10 |
| 2779 | `_recordRoutePoint()` | 11 |
| 2790 | `_routePing()` | 23 |
| 2813 | `_tickRoutePings()` | 12 |
| 2825 | `_objectiveInteractionMultiplier()` | 14 |
| 2839 | `start()` | 5 |
| 2844 | `_startAnnouncerLab()` | 9 |
| 2853 | `_startRound()` | 47 |
| 2900 | `_resetPositions()` | 283 |
| 3183 | `_checkCtfAlvo()` | 13 |
| 3196 | `_checkPace()` | 13 |
| 3209 | `_endRound()` | 35 |
| 3244 | `_roundWinnerVoice()` | 12 |
| 3256 | `_fimDaPartida()` | 7 |
| 3263 | `_endMatch()` | 61 |
| 3324 | `_ensureDolly()` | 41 |
| 3365 | `_tickDolly()` | 23 |
| 3388 | `setPaused()` | 23 |
| 3411 | `_now()` | 3 |
| 3414 | `pauseArmed()` | 1 |
| 3415 | `_syncPauseArm()` | 7 |
| 3422 | `resume()` | 4 |
| 3426 | `applySettings()` | 10 |
| 3436 | `_applyQuality()` | 14 |
| 3450 | `onResize()` | 20 |
| 3470 | `_switchTeam()` | 70 |
| 3540 | `_applyVmVisibility()` | 36 |
| 3576 | `_ensureVmPrecisionQa()` | 79 |
| 3655 | `_syncVmPresentation()` | 22 |
| 3677 | `_utilidadeNaMao()` | 7 |
| 3684 | `_vmlabEnsure()` | 14 |
| 3698 | `_vmlabFrame()` | 28 |
| 3726 | `_tuneGet()` | 15 |
| 3741 | `_tune()` | 23 |
| 3764 | `_fxSet()` | 1 |
| 3765 | `aplicarEfeitosAdaptativos()` | 20 |
| 3785 | `_qaCicloArma()` | 8 |
| 3793 | `_cycleWeapon()` | 8 |
| 3801 | `_inspectWeapon()` | 8 |
| 3809 | `_cancelInspect()` | 4 |
| 3813 | `_inspectMix()` | 10 |
| 3823 | `_switchWeapon()` | 43 |
| 3866 | `_deploySfx()` | 7 |
| 3873 | `_scope()` | 18 |
| 3891 | `_zoomFov()` | 5 |
| 3896 | `_reloading()` | 1 |
| 3897 | `_startReload()` | 28 |
| 3925 | `_cancelReload()` | 14 |
| 3939 | `_abortarArmaNaMorte()` | 14 |
| 3953 | `_voltarPraBase()` | 16 |
| 3969 | `_armasServidasPelaRecarga()` | 9 |
| 3978 | `_reloadLayers()` | 18 |
| 3996 | `_installRecoil()` | 33 |
| 4029 | `_shotRecoil()` | 13 |
| 4042 | `_tryShoot()` | 100 |
| 4142 | `_tryKnifeAttack()` | 14 |
| 4156 | `_meleeHit()` | 16 |
| 4172 | `_meleeRange()` | 5 |
| 4177 | `_botMelee()` | 26 |
| 4203 | `_distanceDamage()` | 7 |
| 4210 | `_shotDamage()` | 10 |
| 4220 | `_consultarTiro()` | 15 |
| 4235 | `_perfilCabeca()` | 7 |
| 4242 | `_origemTiroBot()` | 4 |
| 4246 | `_miraTiroBot()` | 13 |
| 4259 | `_participanteHumano()` | 4 |
| 4263 | `_resolverTiroBot()` | 11 |
| 4274 | `_danoTiroBot()` | 12 |
| 4286 | `_aplicarTiroBot()` | 13 |
| 4299 | `_dispararBot()` | 29 |
| 4328 | `_rastroTiroBot()` | 8 |
| 4336 | `_fireHitscan()` | 28 |
| 4364 | `_targetFromHit()` | 9 |
| 4373 | `_penetrationExit()` | 8 |
| 4381 | `_surfaceOf()` | 27 |
| 4408 | `_armoredTarget()` | 6 |
| 4414 | `_aplicaArmadura()` | 10 |
| 4424 | `_armaduraLigada()` | 1 |
| 4425 | `_equiparArmadura()` | 8 |
| 4433 | `_updateArmaduraHud()` | 13 |
| 4446 | `_sincronizarArmaduraVisual()` | 6 |
| 4452 | `_fleshImpact()` | 38 |
| 4490 | `_fxVoice()` | 9 |
| 4499 | `_impactSfx()` | 17 |
| 4516 | `_tintFx()` | 17 |
| 4533 | `_damage()` | 50 |
| 4583 | `_playerHurtFx()` | 5 |
| 4588 | `_kill()` | 61 |
| 4649 | `_checkArenaWin()` | 30 |
| 4679 | `_dmgArc()` | 79 |
| 4758 | `_mkBanner()` | 9 |
| 4767 | `_updateKillSequenceHud()` | 13 |
| 4780 | `_resetKillSequence()` | 7 |
| 4787 | `_fragRestockStep()` | 7 |
| 4794 | `_playerKillFeedback()` | 18 |
| 4812 | `_acertoPrevisto()` | 5 |
| 4817 | `_hitmarker()` | 15 |
| 4832 | `_dmgNumber()` | 20 |
| 4852 | `_feed()` | 19 |
| 4871 | `_skullIcon()` | 6 |
| 4877 | `_killfeedWeaponIcon()` | 9 |
| 4886 | `_wpnIcon()` | 64 |
| 4950 | `_tracer()` | 30 |
| 4980 | `_puff()` | 39 |
| 5019 | `_holeDecalMat()` | 8 |
| 5027 | `_flash()` | 66 |
| 5093 | `_vmTetoTela()` | 10 |
| 5103 | `_muzzleWorld()` | 43 |
| 5146 | `_bocaLigada()` | 13 |
| 5159 | `_bocaTiroBot()` | 5 |
| 5164 | `_origemTracerJogador()` | 25 |
| 5189 | `_aimOrigin()` | 5 |
| 5194 | `_updateDoors()` | 10 |
| 5204 | `_updateFx()` | 75 |
| 5279 | `_ejectCasing()` | 18 |
| 5297 | `_makeCtfFlagTex()` | 23 |
| 5320 | `_paintFlagSymbol()` | 9 |
| 5329 | `_flagTexFor()` | 25 |
| 5354 | `_legadoSimbolo()` | 8 |
| 5362 | `_loadCtfSymbols()` | 22 |
| 5384 | `_makeCtfZoneTex()` | 31 |
| 5415 | `_makeSmokeTex()` | 10 |
| 5425 | `_updateSmokeHud()` | 7 |
| 5432 | `_grenadeSpatial()` | 14 |
| 5446 | `_spawnGrenade()` | 24 |
| 5470 | `_throwNade()` | 28 |
| 5498 | `_throwSmoke()` | 1 |
| 5499 | `_throwFrag()` | 3 |
| 5502 | `_flashLiberada()` | 2 |
| 5504 | `_equipNade()` | 18 |
| 5522 | `_unequipNade()` | 11 |
| 5533 | `_explodeFrag()` | 25 |
| 5558 | `_carregarFlashMint()` | 13 |
| 5571 | `_flashProvisoria()` | 17 |
| 5588 | `_cegueiraDe()` | 9 |
| 5597 | `_popFlash()` | 32 |
| 5629 | `_cegarJogador()` | 7 |
| 5636 | `_limparCegueira()` | 6 |
| 5642 | `_tickCegueiraJogador()` | 18 |
| 5660 | `_capturarRetida()` | 27 |
| 5687 | `_corDaFumaca()` | 16 |
| 5703 | `_popSmoke()` | 23 |
| 5726 | `_updateGrenades()` | 37 |
| 5763 | `_teamColor()` | 12 |
| 5775 | `_teamInk()` | 7 |
| 5782 | `_factionOf()` | 1 |
| 5783 | `_voiceKey()` | 2 |
| 5785 | `_teamName()` | 1 |
| 5786 | `_teamTag()` | 6 |
| 5792 | `_plaqueta()` | 14 |
| 5806 | `_uiV3()` | 1 |
| 5807 | `_mirror()` | 2 |
| 5809 | `_defNoLado()` | 3 |
| 5812 | `_botSeparation()` | 61 |
| 5873 | `_initCTF()` | 86 |
| 5959 | `_updateCTF()` | 61 |
| 6020 | `_ctfWin()` | 24 |
| 6044 | `_freeYaw()` | 25 |
| 6069 | `_pullString()` | 23 |
| 6092 | `_walkReach()` | 32 |
| 6124 | `_wpComp()` | 16 |
| 6140 | `_findPathLocal()` | 22 |
| 6162 | `_botCtf()` | 137 |
| 6299 | `_hideCtfHud()` | 6 |
| 6305 | `_updateCtfHud()` | 76 |
| 6381 | `_collide()` | 23 |
| 6404 | `_collideRot()` | 22 |
| 6426 | `_mantleAlcance()` | 62 |
| 6488 | `_mantleColliders()` | 10 |
| 6498 | `_mantleAlcancavel()` | 12 |
| 6510 | `_mantleTarget()` | 32 |
| 6542 | `_beginMantle()` | 16 |
| 6558 | `_stepMantle()` | 29 |
| 6587 | `_freeSpot()` | 30 |
| 6617 | `_retaAndavel()` | 20 |
| 6637 | `_walkDepth()` | 16 |
| 6653 | `_noteHit()` | 17 |
| 6670 | `_deathFeedback()` | 45 |
| 6715 | `_toggleCamView()` | 6 |
| 6721 | `setCamView()` | 19 |
| 6740 | `_syncCamViewVis()` | 8 |
| 6748 | `_ensurePlayerTP()` | 32 |
| 6780 | `_updatePlayerTP()` | 26 |
| 6806 | `_updatePlayerTPCamera()` | 90 |
| 6896 | `_updateCrosshairParallax()` | 46 |
| 6942 | `_tpDeath()` | 55 |
| 6997 | `_tpRevive()` | 20 |
| 7017 | `_moveEntity()` | 128 |
| 7145 | `_updatePlayer()` | 359 |
| 7504 | `_footstepSurface()` | 13 |
| 7517 | `_updatePickups()` | 158 |
| 7675 | `_wpnMode()` | 7 |
| 7682 | `_botWeapon()` | 10 |
| 7692 | `_municaoInfinita()` | 1 |
| 7693 | `_pickupAllowed()` | 8 |
| 7701 | `_slotPrimaria()` | 1 |
| 7702 | `_largarArma()` | 3 |
| 7705 | `_grabNearPickup()` | 10 |
| 7715 | `_grabPickup()` | 36 |
| 7751 | `_assentarNoChao()` | 10 |
| 7761 | `refreshPickupModels()` | 24 |
| 7785 | `_dropWeapon()` | 20 |
| 7805 | `_sumirDrop()` | 36 |
| 7841 | `_spawnY()` | 3 |
| 7844 | `_spawnYaw()` | 5 |
| 7849 | `_pickSpawn()` | 23 |
| 7872 | `_respawnPlayer()` | 46 |
| 7918 | `_losClear()` | 18 |
| 7936 | `_botCall()` | 41 |
| 7977 | `_teamMarkTex()` | 23 |
| 8000 | `_makeTeamMark()` | 16 |
| 8016 | `_trocarPersonagem()` | 19 |
| 8035 | `_syncRemoteWeapon()` | 23 |
| 8058 | `_updateTeamMark()` | 7 |
| 8065 | `_posturaBot()` | 4 |
| 8069 | `_botEye()` | 1 |
| 8070 | `_enemyOf()` | 8 |
| 8078 | `_duelToken()` | 22 |
| 8100 | `_respawnEntity()` | 28 |
| 8128 | `_botOuve()` | 12 |
| 8140 | `_updateBot()` | 830 |
| 8970 | `_flushTraining()` | 13 |
| 8983 | `_updateBotNN()` | 73 |
| 9056 | `_botShootNN()` | 31 |
| 9087 | `_radarFoot()` | 38 |
| 9125 | `_radarStatic()` | 31 |
| 9156 | `_updateRadar()` | 48 |
| 9204 | `_banner()` | 26 |
| 9230 | `_resultadoDaRodada()` | 4 |
| 9234 | `_botaoAmigo()` | 5 |
| 9239 | `_ligarAmigoPlacar()` | 22 |
| 9261 | `_showScoreboard()` | 54 |
| 9315 | `_updateWeaponHud()` | 43 |
| 9358 | `_updateHud()` | 124 |
| 9482 | `update()` | 92 |
| 9574 | `dispose()` | 59 |

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
