# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.110 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8619 | 352 |
| `public/js/main.js` | 4880 | 361 |
| `public/js/glbchars.js` | 925 | 63 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3365 linhas (39% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 837 | 7190 | `_updateBot()` | ⚠️ candidato a extração |
| 639 | 723 | `constructor()` | 🔴 append-only |
| 308 | 6267 | `_updatePlayer()` | ⚠️ candidato a extração |
| 271 | 1465 | `_buildViewModels()` |  |
| 266 | 2663 | `_resetPositions()` |  |
| 158 | 6588 | `_updatePickups()` |  |
| 137 | 5455 | `_botCtf()` |  |
| 135 | 2219 | `_touchControls()` |  |
| 101 | 6166 | `_moveEntity()` |  |
| 90 | 8477 | `update()` | 🔴 append-only |
| 88 | 8389 | `_updateHud()` |  |
| 86 | 5166 | `_initCTF()` |  |
| 85 | 3665 | `_tryShoot()` |  |
| 85 | 6003 | `_updatePlayerTP()` |  |
| 79 | 3312 | `_ensureVmPrecisionQa()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `361–364` `436–530` `560–581` `1465–1876` `3278–3311` `3508–3600` `3619–3749` `3764–3779` `3924–3969` `4498–4523` `4571–4671` `4744–4760` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `193–196` `247–247` `280–291` `623–634` `4097–4197` `5105–5165` `5337–5591` `5674–5696` `6267–6574` `6973–6990` `7124–7154` `7190–8026` | — |
| **MAPAS / MUNDO** | `1408–1464` `2663–2928` `5166–5312` `6588–6745` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1891–1900` `2015–2053` `3181–3194` `4524–4562` `4687–4743` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1362–1407` `3133–3155` `3171–3180` `3195–3211` `4228–4306` `4365–4418` `4434–4497` `8182–8246` `8304–8353` `8389–8476` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8477–8566 · `_dom()` 1362–1407 · `constructor()` 723–1361

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3903 de 8619 linhas (45%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 419 | `D2R` | 4 |
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
| 723 | `constructor()` | 639 |
| 1362 | `_dom()` | 46 |
| 1408 | `_buildEnv()` | 57 |
| 1465 | `_buildViewModels()` | 271 |
| 1736 | `_vmFrame` | 141 |
| 1749 | `_vmFrame` | 141 |
| 1877 | `_vmMontarTardio` | 14 |
| 1891 | `_makePuffTexture()` | 10 |
| 1901 | `_makeBloodTex()` | 19 |
| 1920 | `_makeBloodPoolTex()` | 21 |
| 1941 | `_bloodDecal()` | 16 |
| 1957 | `_makeBloodFx()` | 20 |
| 1977 | `_bloodSpatter()` | 18 |
| 1995 | `_bloodPoolAt()` | 6 |
| 2001 | `_updateBlood()` | 14 |
| 2015 | `_makeFlashTex()` | 21 |
| 2036 | `_makeFlashSoftTex()` | 8 |
| 2044 | `_makeFlashCoreTex()` | 10 |
| 2054 | `_input()` | 6 |
| 2060 | `_kd` | 49 |
| 2109 | `_ku` | 5 |
| 2114 | `_md` | 40 |
| 2154 | `_mu` | 7 |
| 2161 | `_mm` | 20 |
| 2181 | `_wh` | 17 |
| 2198 | `_cc` | 1 |
| 2199 | `_blur` | 1 |
| 2200 | `_plc` | 19 |
| 2219 | `_touchControls()` | 135 |
| 2354 | `_aimAssist()` | 28 |
| 2382 | `_requestLock()` | 27 |
| 2409 | `_travaAtalhos()` | 4 |
| 2413 | `_soltaAtalhos()` | 5 |
| 2418 | `espectando()` | 2 |
| 2420 | `_acceptInput()` | 7 |
| 2427 | `travarEntrada()` | 17 |
| 2444 | `_chatSeguraPausa()` | 5 |
| 2449 | `_pauseBackdrop()` | 7 |
| 2456 | `_radioShow()` | 6 |
| 2462 | `_radioUi()` | 8 |
| 2470 | `_radioPick()` | 20 |
| 2490 | `_abilityNotice()` | 10 |
| 2500 | `_resetSliceAbilities()` | 9 |
| 2509 | `_stackTrace()` | 28 |
| 2537 | `_updateMotocaCharge()` | 10 |
| 2547 | `_recordRoutePoint()` | 11 |
| 2558 | `_routePing()` | 23 |
| 2581 | `_tickRoutePings()` | 12 |
| 2593 | `_objectiveInteractionMultiplier()` | 14 |
| 2607 | `start()` | 5 |
| 2612 | `_startAnnouncerLab()` | 9 |
| 2621 | `_startRound()` | 42 |
| 2663 | `_resetPositions()` | 266 |
| 2929 | `_checkCtfAlvo()` | 13 |
| 2942 | `_checkPace()` | 13 |
| 2955 | `_endRound()` | 34 |
| 2989 | `_roundWinnerVoice()` | 12 |
| 3001 | `_fimDaPartida()` | 7 |
| 3008 | `_endMatch()` | 61 |
| 3069 | `_ensureDolly()` | 41 |
| 3110 | `_tickDolly()` | 23 |
| 3133 | `setPaused()` | 23 |
| 3156 | `_now()` | 3 |
| 3159 | `pauseArmed()` | 1 |
| 3160 | `_syncPauseArm()` | 7 |
| 3167 | `resume()` | 4 |
| 3171 | `applySettings()` | 10 |
| 3181 | `_applyQuality()` | 14 |
| 3195 | `onResize()` | 17 |
| 3212 | `_switchTeam()` | 66 |
| 3278 | `_applyVmVisibility()` | 34 |
| 3312 | `_ensureVmPrecisionQa()` | 79 |
| 3391 | `_syncVmPresentation()` | 19 |
| 3410 | `_vmlabEnsure()` | 14 |
| 3424 | `_vmlabFrame()` | 28 |
| 3452 | `_tuneGet()` | 15 |
| 3467 | `_tune()` | 23 |
| 3490 | `_fxSet()` | 2 |
| 3492 | `_qaCicloArma()` | 8 |
| 3500 | `_cycleWeapon()` | 8 |
| 3508 | `_switchWeapon()` | 38 |
| 3546 | `_deploySfx()` | 7 |
| 3553 | `_scope()` | 17 |
| 3570 | `_zoomFov()` | 5 |
| 3575 | `_reloading()` | 1 |
| 3576 | `_startReload()` | 25 |
| 3601 | `_reloadLayers()` | 18 |
| 3619 | `_installRecoil()` | 33 |
| 3652 | `_shotRecoil()` | 13 |
| 3665 | `_tryShoot()` | 85 |
| 3750 | `_tryKnifeAttack()` | 14 |
| 3764 | `_meleeHit()` | 16 |
| 3780 | `_meleeRange()` | 5 |
| 3785 | `_botMelee()` | 26 |
| 3811 | `_distanceDamage()` | 7 |
| 3818 | `_shotDamage()` | 10 |
| 3828 | `_consultarTiro()` | 13 |
| 3841 | `_origemTiroBot()` | 4 |
| 3845 | `_miraTiroBot()` | 5 |
| 3850 | `_participanteHumano()` | 4 |
| 3854 | `_resolverTiroBot()` | 11 |
| 3865 | `_danoTiroBot()` | 12 |
| 3877 | `_aplicarTiroBot()` | 12 |
| 3889 | `_dispararBot()` | 29 |
| 3918 | `_rastroTiroBot()` | 6 |
| 3924 | `_fireHitscan()` | 46 |
| 3970 | `_targetFromHit()` | 9 |
| 3979 | `_penetrationExit()` | 8 |
| 3987 | `_surfaceOf()` | 27 |
| 4014 | `_armoredTarget()` | 3 |
| 4017 | `_fleshImpact()` | 38 |
| 4055 | `_fxVoice()` | 9 |
| 4064 | `_impactSfx()` | 17 |
| 4081 | `_tintFx()` | 16 |
| 4097 | `_damage()` | 42 |
| 4139 | `_playerHurtFx()` | 5 |
| 4144 | `_kill()` | 54 |
| 4198 | `_checkArenaWin()` | 30 |
| 4228 | `_dmgArc()` | 79 |
| 4307 | `_mkBanner()` | 9 |
| 4316 | `_updateKillSequenceHud()` | 12 |
| 4328 | `_resetKillSequence()` | 7 |
| 4335 | `_fragRestockStep()` | 7 |
| 4342 | `_playerKillFeedback()` | 18 |
| 4360 | `_acertoPrevisto()` | 5 |
| 4365 | `_hitmarker()` | 15 |
| 4380 | `_dmgNumber()` | 20 |
| 4400 | `_feed()` | 19 |
| 4419 | `_skullIcon()` | 6 |
| 4425 | `_killfeedWeaponIcon()` | 9 |
| 4434 | `_wpnIcon()` | 64 |
| 4498 | `_tracer()` | 26 |
| 4524 | `_puff()` | 39 |
| 4563 | `_holeDecalMat()` | 8 |
| 4571 | `_flash()` | 61 |
| 4632 | `_vmTetoTela()` | 10 |
| 4642 | `_muzzleWorld()` | 30 |
| 4672 | `_aimOrigin()` | 5 |
| 4677 | `_updateDoors()` | 10 |
| 4687 | `_updateFx()` | 57 |
| 4744 | `_ejectCasing()` | 17 |
| 4761 | `_makeCtfFlagTex()` | 23 |
| 4784 | `_paintFlagSymbol()` | 9 |
| 4793 | `_flagTexFor()` | 25 |
| 4818 | `_legadoSimbolo()` | 8 |
| 4826 | `_loadCtfSymbols()` | 22 |
| 4848 | `_makeCtfZoneTex()` | 31 |
| 4879 | `_makeSmokeTex()` | 10 |
| 4889 | `_updateSmokeHud()` | 4 |
| 4893 | `_grenadeSpatial()` | 14 |
| 4907 | `_spawnGrenade()` | 19 |
| 4926 | `_throwNade()` | 13 |
| 4939 | `_throwSmoke()` | 1 |
| 4940 | `_throwFrag()` | 4 |
| 4944 | `_explodeFrag()` | 40 |
| 4984 | `_corDaFumaca()` | 16 |
| 5000 | `_popSmoke()` | 23 |
| 5023 | `_updateGrenades()` | 35 |
| 5058 | `_teamColor()` | 12 |
| 5070 | `_teamInk()` | 7 |
| 5077 | `_factionOf()` | 1 |
| 5078 | `_voiceKey()` | 2 |
| 5080 | `_teamName()` | 1 |
| 5081 | `_teamTag()` | 6 |
| 5087 | `_plaqueta()` | 13 |
| 5100 | `_mirror()` | 2 |
| 5102 | `_defNoLado()` | 3 |
| 5105 | `_botSeparation()` | 61 |
| 5166 | `_initCTF()` | 86 |
| 5252 | `_updateCTF()` | 61 |
| 5313 | `_ctfWin()` | 24 |
| 5337 | `_freeYaw()` | 25 |
| 5362 | `_pullString()` | 23 |
| 5385 | `_walkReach()` | 32 |
| 5417 | `_wpComp()` | 16 |
| 5433 | `_findPathLocal()` | 22 |
| 5455 | `_botCtf()` | 137 |
| 5592 | `_hideCtfHud()` | 6 |
| 5598 | `_updateCtfHud()` | 76 |
| 5674 | `_collide()` | 23 |
| 5697 | `_collideRot()` | 22 |
| 5719 | `_mantleAlcance()` | 50 |
| 5769 | `_mantleAlcancavel()` | 12 |
| 5781 | `_mantleTarget()` | 35 |
| 5816 | `_freeSpot()` | 30 |
| 5846 | `_retaAndavel()` | 20 |
| 5866 | `_walkDepth()` | 16 |
| 5882 | `_noteHit()` | 17 |
| 5899 | `_deathFeedback()` | 45 |
| 5944 | `_toggleCamView()` | 6 |
| 5950 | `setCamView()` | 16 |
| 5966 | `_syncCamViewVis()` | 8 |
| 5974 | `_ensurePlayerTP()` | 29 |
| 6003 | `_updatePlayerTP()` | 85 |
| 6088 | `_updateCrosshairParallax()` | 47 |
| 6135 | `_tpDeath()` | 18 |
| 6153 | `_tpRevive()` | 13 |
| 6166 | `_moveEntity()` | 101 |
| 6267 | `_updatePlayer()` | 308 |
| 6575 | `_footstepSurface()` | 13 |
| 6588 | `_updatePickups()` | 158 |
| 6746 | `_wpnMode()` | 7 |
| 6753 | `_botWeapon()` | 10 |
| 6763 | `_municaoInfinita()` | 1 |
| 6764 | `_pickupAllowed()` | 9 |
| 6773 | `_grabNearPickup()` | 10 |
| 6783 | `_grabPickup()` | 35 |
| 6818 | `_assentarNoChao()` | 10 |
| 6828 | `refreshPickupModels()` | 24 |
| 6852 | `_dropWeapon()` | 20 |
| 6872 | `_sumirDrop()` | 36 |
| 6908 | `_spawnY()` | 3 |
| 6911 | `_spawnYaw()` | 5 |
| 6916 | `_pickSpawn()` | 23 |
| 6939 | `_respawnPlayer()` | 34 |
| 6973 | `_losClear()` | 18 |
| 6991 | `_botCall()` | 41 |
| 7032 | `_teamMarkTex()` | 23 |
| 7055 | `_makeTeamMark()` | 16 |
| 7071 | `_trocarPersonagem()` | 19 |
| 7090 | `_syncRemoteWeapon()` | 23 |
| 7113 | `_updateTeamMark()` | 7 |
| 7120 | `_posturaBot()` | 4 |
| 7124 | `_botEye()` | 1 |
| 7125 | `_enemyOf()` | 8 |
| 7133 | `_duelToken()` | 22 |
| 7155 | `_respawnEntity()` | 23 |
| 7178 | `_botOuve()` | 12 |
| 7190 | `_updateBot()` | 837 |
| 8027 | `_flushTraining()` | 13 |
| 8040 | `_updateBotNN()` | 73 |
| 8113 | `_botShootNN()` | 31 |
| 8144 | `_radarFoot()` | 38 |
| 8182 | `_updateRadar()` | 65 |
| 8247 | `_banner()` | 26 |
| 8273 | `_resultadoDaRodada()` | 4 |
| 8277 | `_botaoAmigo()` | 5 |
| 8282 | `_ligarAmigoPlacar()` | 22 |
| 8304 | `_showScoreboard()` | 50 |
| 8354 | `_updateWeaponHud()` | 35 |
| 8389 | `_updateHud()` | 88 |
| 8477 | `update()` | 90 |
| 8567 | `dispose()` | 52 |

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
