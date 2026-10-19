# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.112 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8766 | 359 |
| `public/js/main.js` | 4936 | 368 |
| `public/js/glbchars.js` | 925 | 63 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3245 linhas (37% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 837 | 7282 | `_updateBot()` | ⚠️ candidato a extração |
| 645 | 726 | `constructor()` | 🔴 append-only |
| 328 | 6339 | `_updatePlayer()` | ⚠️ candidato a extração |
| 266 | 2690 | `_resetPositions()` |  |
| 158 | 6680 | `_updatePickups()` |  |
| 137 | 5511 | `_botCtf()` |  |
| 135 | 2246 | `_touchControls()` |  |
| 120 | 8504 | `_updateHud()` |  |
| 101 | 6238 | `_moveEntity()` |  |
| 98 | 6062 | `_updatePlayerTP()` |  |
| 90 | 8624 | `update()` | 🔴 append-only |
| 86 | 3719 | `_tryShoot()` |  |
| 86 | 5222 | `_initCTF()` |  |
| 79 | 3340 | `_ensureVmPrecisionQa()` |  |
| 79 | 4283 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `363–366` `439–533` `563–584` `1474–1760` `3308–3339` `3559–3654` `3673–3804` `3819–3834` `3979–4024` `4554–4579` `4627–4727` `4800–4816` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `195–198` `249–249` `282–293` `626–637` `4152–4252` `5161–5221` `5393–5647` `5730–5752` `6339–6666` `7065–7082` `7216–7246` `7282–8118` | — |
| **MAPAS / MUNDO** | `1417–1473` `2690–2955` `5222–5368` `6680–6837` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1917–1926` `2041–2079` `3208–3221` `4580–4618` `4743–4799` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1371–1416` `3160–3182` `3198–3207` `3222–3241` `4283–4361` `4421–4474` `4490–4553` `8305–8352` `8410–8463` `8504–8623` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8624–8713 · `_dom()` 1371–1416 · `constructor()` 726–1370

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3822 de 8766 linhas (44%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 422 | `MOBILE_RADAR_INTERVAL` | 4 |
| 426 | `DMG_FALLOFF` | 5 |
| 431 | `HS_MUL` | 3 |
| 434 | `BALL_CLASS` | 5 |
| 439 | `STATIC_CLASS` | 75 |
| 515 | `VM_KNOB` | 19 |
| 534 | `vmAdsRot` | 4 |
| 539 | `vmFovForAspect` | 24 |
| 563 | `VM_OFF` | 22 |
| 585 | `vmOffY` | 35 |
| 620 | `VMP` | 6 |
| 626 | `BOT_SKILLS` | 11 |
| 638 | `diffKey` | 4 |
| 643 | `rollBotSkill` | 7 |
| 650 | `botTier` | 4 |
| 654 | `_cyclePool` | 5 |
| 659 | `_rosterPool` | 22 |
| 683 | `_pinnedDefs` | 5 |
| 688 | `pickMatchRoster` | 21 |
| 709 | `BOT_WEAPON_POOL` | 5 |
| 714 | `pickMatchWeapons` | 9 |
| 726 | `constructor()` | 645 |
| 1371 | `_dom()` | 46 |
| 1417 | `_buildEnv()` | 57 |
| 1474 | `_buildViewModels()` | 3 |
| 1477 | `_vmFrame` | 284 |
| 1761 | `_vmFrame` | 142 |
| 1903 | `_vmMontarTardio` | 14 |
| 1917 | `_makePuffTexture()` | 10 |
| 1927 | `_makeBloodTex()` | 19 |
| 1946 | `_makeBloodPoolTex()` | 21 |
| 1967 | `_bloodDecal()` | 16 |
| 1983 | `_makeBloodFx()` | 20 |
| 2003 | `_bloodSpatter()` | 18 |
| 2021 | `_bloodPoolAt()` | 6 |
| 2027 | `_updateBlood()` | 14 |
| 2041 | `_makeFlashTex()` | 21 |
| 2062 | `_makeFlashSoftTex()` | 8 |
| 2070 | `_makeFlashCoreTex()` | 10 |
| 2080 | `_input()` | 6 |
| 2086 | `_kd` | 50 |
| 2136 | `_ku` | 5 |
| 2141 | `_md` | 40 |
| 2181 | `_mu` | 7 |
| 2188 | `_mm` | 20 |
| 2208 | `_wh` | 17 |
| 2225 | `_cc` | 1 |
| 2226 | `_blur` | 1 |
| 2227 | `_plc` | 19 |
| 2246 | `_touchControls()` | 135 |
| 2381 | `_aimAssist()` | 28 |
| 2409 | `_requestLock()` | 27 |
| 2436 | `_travaAtalhos()` | 4 |
| 2440 | `_soltaAtalhos()` | 5 |
| 2445 | `espectando()` | 2 |
| 2447 | `_acceptInput()` | 7 |
| 2454 | `travarEntrada()` | 17 |
| 2471 | `_chatSeguraPausa()` | 5 |
| 2476 | `_pauseBackdrop()` | 7 |
| 2483 | `_radioShow()` | 6 |
| 2489 | `_radioUi()` | 8 |
| 2497 | `_radioPick()` | 20 |
| 2517 | `_abilityNotice()` | 10 |
| 2527 | `_resetSliceAbilities()` | 9 |
| 2536 | `_stackTrace()` | 28 |
| 2564 | `_updateMotocaCharge()` | 10 |
| 2574 | `_recordRoutePoint()` | 11 |
| 2585 | `_routePing()` | 23 |
| 2608 | `_tickRoutePings()` | 12 |
| 2620 | `_objectiveInteractionMultiplier()` | 14 |
| 2634 | `start()` | 5 |
| 2639 | `_startAnnouncerLab()` | 9 |
| 2648 | `_startRound()` | 42 |
| 2690 | `_resetPositions()` | 266 |
| 2956 | `_checkCtfAlvo()` | 13 |
| 2969 | `_checkPace()` | 13 |
| 2982 | `_endRound()` | 34 |
| 3016 | `_roundWinnerVoice()` | 12 |
| 3028 | `_fimDaPartida()` | 7 |
| 3035 | `_endMatch()` | 61 |
| 3096 | `_ensureDolly()` | 41 |
| 3137 | `_tickDolly()` | 23 |
| 3160 | `setPaused()` | 23 |
| 3183 | `_now()` | 3 |
| 3186 | `pauseArmed()` | 1 |
| 3187 | `_syncPauseArm()` | 7 |
| 3194 | `resume()` | 4 |
| 3198 | `applySettings()` | 10 |
| 3208 | `_applyQuality()` | 14 |
| 3222 | `onResize()` | 20 |
| 3242 | `_switchTeam()` | 66 |
| 3308 | `_applyVmVisibility()` | 32 |
| 3340 | `_ensureVmPrecisionQa()` | 79 |
| 3419 | `_syncVmPresentation()` | 20 |
| 3439 | `_vmlabEnsure()` | 14 |
| 3453 | `_vmlabFrame()` | 28 |
| 3481 | `_tuneGet()` | 15 |
| 3496 | `_tune()` | 23 |
| 3519 | `_fxSet()` | 2 |
| 3521 | `aplicarEfeitosAdaptativos()` | 20 |
| 3521 | `_qaCicloArma()` | 8 |
| 3529 | `_cycleWeapon()` | 8 |
| 3537 | `_inspectWeapon()` | 8 |
| 3545 | `_cancelInspect()` | 4 |
| 3549 | `_inspectMix()` | 10 |
| 3559 | `_switchWeapon()` | 39 |
| 3598 | `_deploySfx()` | 7 |
| 3605 | `_scope()` | 18 |
| 3623 | `_zoomFov()` | 5 |
| 3628 | `_reloading()` | 1 |
| 3629 | `_startReload()` | 26 |
| 3655 | `_reloadLayers()` | 18 |
| 3673 | `_installRecoil()` | 33 |
| 3706 | `_shotRecoil()` | 13 |
| 3719 | `_tryShoot()` | 86 |
| 3805 | `_tryKnifeAttack()` | 14 |
| 3819 | `_meleeHit()` | 16 |
| 3835 | `_meleeRange()` | 5 |
| 3840 | `_botMelee()` | 26 |
| 3866 | `_distanceDamage()` | 7 |
| 3873 | `_shotDamage()` | 10 |
| 3883 | `_consultarTiro()` | 13 |
| 3896 | `_origemTiroBot()` | 4 |
| 3900 | `_miraTiroBot()` | 5 |
| 3905 | `_participanteHumano()` | 4 |
| 3909 | `_resolverTiroBot()` | 11 |
| 3920 | `_danoTiroBot()` | 12 |
| 3932 | `_aplicarTiroBot()` | 12 |
| 3944 | `_dispararBot()` | 29 |
| 3973 | `_rastroTiroBot()` | 6 |
| 3979 | `_fireHitscan()` | 46 |
| 4025 | `_targetFromHit()` | 9 |
| 4034 | `_penetrationExit()` | 8 |
| 4042 | `_surfaceOf()` | 27 |
| 4069 | `_armoredTarget()` | 3 |
| 4072 | `_fleshImpact()` | 38 |
| 4110 | `_fxVoice()` | 9 |
| 4119 | `_impactSfx()` | 17 |
| 4136 | `_tintFx()` | 16 |
| 4152 | `_damage()` | 42 |
| 4194 | `_playerHurtFx()` | 5 |
| 4199 | `_kill()` | 54 |
| 4253 | `_checkArenaWin()` | 30 |
| 4283 | `_dmgArc()` | 79 |
| 4362 | `_mkBanner()` | 9 |
| 4371 | `_updateKillSequenceHud()` | 13 |
| 4384 | `_resetKillSequence()` | 7 |
| 4391 | `_fragRestockStep()` | 7 |
| 4398 | `_playerKillFeedback()` | 18 |
| 4416 | `_acertoPrevisto()` | 5 |
| 4421 | `_hitmarker()` | 15 |
| 4436 | `_dmgNumber()` | 20 |
| 4456 | `_feed()` | 19 |
| 4475 | `_skullIcon()` | 6 |
| 4481 | `_killfeedWeaponIcon()` | 9 |
| 4490 | `_wpnIcon()` | 64 |
| 4554 | `_tracer()` | 26 |
| 4580 | `_puff()` | 39 |
| 4619 | `_holeDecalMat()` | 8 |
| 4627 | `_flash()` | 61 |
| 4688 | `_vmTetoTela()` | 10 |
| 4698 | `_muzzleWorld()` | 30 |
| 4728 | `_aimOrigin()` | 5 |
| 4733 | `_updateDoors()` | 10 |
| 4743 | `_updateFx()` | 57 |
| 4800 | `_ejectCasing()` | 17 |
| 4817 | `_makeCtfFlagTex()` | 23 |
| 4840 | `_paintFlagSymbol()` | 9 |
| 4849 | `_flagTexFor()` | 25 |
| 4874 | `_legadoSimbolo()` | 8 |
| 4882 | `_loadCtfSymbols()` | 22 |
| 4904 | `_makeCtfZoneTex()` | 31 |
| 4935 | `_makeSmokeTex()` | 10 |
| 4945 | `_updateSmokeHud()` | 4 |
| 4949 | `_grenadeSpatial()` | 14 |
| 4963 | `_spawnGrenade()` | 19 |
| 4982 | `_throwNade()` | 13 |
| 4995 | `_throwSmoke()` | 1 |
| 4996 | `_throwFrag()` | 4 |
| 5000 | `_explodeFrag()` | 40 |
| 5040 | `_corDaFumaca()` | 16 |
| 5056 | `_popSmoke()` | 23 |
| 5079 | `_updateGrenades()` | 35 |
| 5114 | `_teamColor()` | 12 |
| 5126 | `_teamInk()` | 7 |
| 5133 | `_factionOf()` | 1 |
| 5134 | `_voiceKey()` | 2 |
| 5136 | `_teamName()` | 1 |
| 5137 | `_teamTag()` | 6 |
| 5143 | `_plaqueta()` | 13 |
| 5156 | `_mirror()` | 2 |
| 5158 | `_defNoLado()` | 3 |
| 5161 | `_botSeparation()` | 61 |
| 5222 | `_initCTF()` | 86 |
| 5308 | `_updateCTF()` | 61 |
| 5369 | `_ctfWin()` | 24 |
| 5393 | `_freeYaw()` | 25 |
| 5418 | `_pullString()` | 23 |
| 5441 | `_walkReach()` | 32 |
| 5473 | `_wpComp()` | 16 |
| 5489 | `_findPathLocal()` | 22 |
| 5511 | `_botCtf()` | 137 |
| 5648 | `_hideCtfHud()` | 6 |
| 5654 | `_updateCtfHud()` | 76 |
| 5730 | `_collide()` | 23 |
| 5753 | `_collideRot()` | 22 |
| 5775 | `_mantleAlcance()` | 50 |
| 5825 | `_mantleAlcancavel()` | 12 |
| 5837 | `_mantleTarget()` | 35 |
| 5872 | `_freeSpot()` | 30 |
| 5902 | `_retaAndavel()` | 20 |
| 5922 | `_walkDepth()` | 16 |
| 5938 | `_noteHit()` | 17 |
| 5955 | `_deathFeedback()` | 45 |
| 6000 | `_toggleCamView()` | 6 |
| 6006 | `setCamView()` | 19 |
| 6025 | `_syncCamViewVis()` | 8 |
| 6033 | `_ensurePlayerTP()` | 29 |
| 6062 | `_updatePlayerTP()` | 98 |
| 6160 | `_updateCrosshairParallax()` | 47 |
| 6207 | `_tpDeath()` | 18 |
| 6225 | `_tpRevive()` | 13 |
| 6238 | `_moveEntity()` | 101 |
| 6339 | `_updatePlayer()` | 328 |
| 6667 | `_footstepSurface()` | 13 |
| 6680 | `_updatePickups()` | 158 |
| 6838 | `_wpnMode()` | 7 |
| 6845 | `_botWeapon()` | 10 |
| 6855 | `_municaoInfinita()` | 1 |
| 6856 | `_pickupAllowed()` | 9 |
| 6865 | `_grabNearPickup()` | 10 |
| 6875 | `_grabPickup()` | 35 |
| 6910 | `_assentarNoChao()` | 10 |
| 6920 | `refreshPickupModels()` | 24 |
| 6944 | `_dropWeapon()` | 20 |
| 6964 | `_sumirDrop()` | 36 |
| 7000 | `_spawnY()` | 3 |
| 7003 | `_spawnYaw()` | 5 |
| 7008 | `_pickSpawn()` | 23 |
| 7031 | `_respawnPlayer()` | 34 |
| 7065 | `_losClear()` | 18 |
| 7083 | `_botCall()` | 41 |
| 7124 | `_teamMarkTex()` | 23 |
| 7147 | `_makeTeamMark()` | 16 |
| 7163 | `_trocarPersonagem()` | 19 |
| 7182 | `_syncRemoteWeapon()` | 23 |
| 7205 | `_updateTeamMark()` | 7 |
| 7212 | `_posturaBot()` | 4 |
| 7216 | `_botEye()` | 1 |
| 7217 | `_enemyOf()` | 8 |
| 7225 | `_duelToken()` | 22 |
| 7247 | `_respawnEntity()` | 23 |
| 7270 | `_botOuve()` | 12 |
| 7282 | `_updateBot()` | 837 |
| 8119 | `_flushTraining()` | 13 |
| 8132 | `_updateBotNN()` | 73 |
| 8205 | `_botShootNN()` | 31 |
| 8236 | `_radarFoot()` | 38 |
| 8274 | `_radarStatic()` | 31 |
| 8305 | `_updateRadar()` | 48 |
| 8353 | `_banner()` | 26 |
| 8379 | `_resultadoDaRodada()` | 4 |
| 8383 | `_botaoAmigo()` | 5 |
| 8388 | `_ligarAmigoPlacar()` | 22 |
| 8410 | `_showScoreboard()` | 54 |
| 8464 | `_updateWeaponHud()` | 40 |
| 8504 | `_updateHud()` | 120 |
| 8624 | `update()` | 90 |
| 8714 | `dispose()` | 52 |

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
