# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.116 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8817 | 363 |
| `public/js/main.js` | 5016 | 380 |
| `public/js/glbchars.js` | 988 | 69 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3242 linhas (37% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 837 | 7333 | `_updateBot()` | ⚠️ candidato a extração |
| 645 | 729 | `constructor()` | 🔴 append-only |
| 328 | 6390 | `_updatePlayer()` | ⚠️ candidato a extração |
| 266 | 2719 | `_resetPositions()` |  |
| 158 | 6731 | `_updatePickups()` |  |
| 137 | 5562 | `_botCtf()` |  |
| 132 | 2250 | `_touchControls()` |  |
| 120 | 8555 | `_updateHud()` |  |
| 101 | 6289 | `_moveEntity()` |  |
| 98 | 6113 | `_updatePlayerTP()` |  |
| 90 | 8675 | `update()` | 🔴 append-only |
| 86 | 3768 | `_tryShoot()` |  |
| 86 | 5273 | `_initCTF()` |  |
| 79 | 3369 | `_ensureVmPrecisionQa()` |  |
| 79 | 4333 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `363–366` `442–536` `566–587` `1477–1763` `3337–3368` `3607–3703` `3722–3853` `3868–3883` `4028–4073` `4604–4629` `4677–4777` `4850–4867` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `195–198` `249–249` `282–293` `629–640` `4202–4302` `5212–5272` `5444–5698` `5781–5803` `6390–6717` `7116–7133` `7267–7297` `7333–8169` | — |
| **MAPAS / MUNDO** | `1420–1476` `2719–2984` `5273–5419` `6731–6888` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1920–1929` `2045–2083` `3237–3250` `4630–4668` `4793–4849` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1374–1419` `3189–3211` `3227–3236` `3251–3270` `4333–4411` `4471–4524` `4540–4603` `8356–8403` `8461–8514` `8555–8674` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8675–8764 · `_dom()` 1374–1419 · `constructor()` 729–1373

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3824 de 8817 linhas (43%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 729 | `constructor()` | 645 |
| 1374 | `_dom()` | 46 |
| 1420 | `_buildEnv()` | 57 |
| 1477 | `_buildViewModels()` | 3 |
| 1480 | `_vmFrame` | 284 |
| 1764 | `_vmFrame` | 142 |
| 1906 | `_vmMontarTardio` | 14 |
| 1920 | `_makePuffTexture()` | 10 |
| 1930 | `_makeBloodTex()` | 19 |
| 1949 | `_makeBloodPoolTex()` | 21 |
| 1970 | `_bloodDecal()` | 16 |
| 1986 | `_makeBloodFx()` | 21 |
| 2007 | `_bloodSpatter()` | 18 |
| 2025 | `_bloodPoolAt()` | 6 |
| 2031 | `_updateBlood()` | 14 |
| 2045 | `_makeFlashTex()` | 21 |
| 2066 | `_makeFlashSoftTex()` | 8 |
| 2074 | `_makeFlashCoreTex()` | 10 |
| 2084 | `_input()` | 6 |
| 2090 | `_kd` | 50 |
| 2140 | `_ku` | 5 |
| 2145 | `_md` | 40 |
| 2185 | `_mu` | 7 |
| 2192 | `_mm` | 20 |
| 2212 | `_wh` | 17 |
| 2229 | `_cc` | 1 |
| 2230 | `_blur` | 1 |
| 2231 | `_plc` | 19 |
| 2250 | `_touchControls()` | 132 |
| 2382 | `_touchLook()` | 12 |
| 2394 | `_syncTouchWeps()` | 16 |
| 2410 | `_aimAssist()` | 28 |
| 2438 | `_requestLock()` | 27 |
| 2465 | `_travaAtalhos()` | 4 |
| 2469 | `_soltaAtalhos()` | 5 |
| 2474 | `espectando()` | 2 |
| 2476 | `_acceptInput()` | 7 |
| 2483 | `travarEntrada()` | 17 |
| 2500 | `_chatSeguraPausa()` | 5 |
| 2505 | `_pauseBackdrop()` | 7 |
| 2512 | `_radioShow()` | 6 |
| 2518 | `_radioUi()` | 8 |
| 2526 | `_radioPick()` | 20 |
| 2546 | `_abilityNotice()` | 10 |
| 2556 | `_resetSliceAbilities()` | 9 |
| 2565 | `_stackTrace()` | 28 |
| 2593 | `_updateMotocaCharge()` | 10 |
| 2603 | `_recordRoutePoint()` | 11 |
| 2614 | `_routePing()` | 23 |
| 2637 | `_tickRoutePings()` | 12 |
| 2649 | `_objectiveInteractionMultiplier()` | 14 |
| 2663 | `start()` | 5 |
| 2668 | `_startAnnouncerLab()` | 9 |
| 2677 | `_startRound()` | 42 |
| 2719 | `_resetPositions()` | 266 |
| 2985 | `_checkCtfAlvo()` | 13 |
| 2998 | `_checkPace()` | 13 |
| 3011 | `_endRound()` | 34 |
| 3045 | `_roundWinnerVoice()` | 12 |
| 3057 | `_fimDaPartida()` | 7 |
| 3064 | `_endMatch()` | 61 |
| 3125 | `_ensureDolly()` | 41 |
| 3166 | `_tickDolly()` | 23 |
| 3189 | `setPaused()` | 23 |
| 3212 | `_now()` | 3 |
| 3215 | `pauseArmed()` | 1 |
| 3216 | `_syncPauseArm()` | 7 |
| 3223 | `resume()` | 4 |
| 3227 | `applySettings()` | 10 |
| 3237 | `_applyQuality()` | 14 |
| 3251 | `onResize()` | 20 |
| 3271 | `_switchTeam()` | 66 |
| 3337 | `_applyVmVisibility()` | 32 |
| 3369 | `_ensureVmPrecisionQa()` | 79 |
| 3448 | `_syncVmPresentation()` | 20 |
| 3478 | `_utilidadeNaMao()` | 7 |
| 3468 | `_vmlabEnsure()` | 14 |
| 3482 | `_vmlabFrame()` | 28 |
| 3510 | `_tuneGet()` | 15 |
| 3525 | `_tune()` | 23 |
| 3548 | `_fxSet()` | 1 |
| 3549 | `aplicarEfeitosAdaptativos()` | 20 |
| 3569 | `_qaCicloArma()` | 8 |
| 3577 | `_cycleWeapon()` | 8 |
| 3585 | `_inspectWeapon()` | 8 |
| 3593 | `_cancelInspect()` | 4 |
| 3597 | `_inspectMix()` | 10 |
| 3607 | `_switchWeapon()` | 40 |
| 3647 | `_deploySfx()` | 7 |
| 3654 | `_scope()` | 18 |
| 3672 | `_zoomFov()` | 5 |
| 3677 | `_reloading()` | 1 |
| 3678 | `_startReload()` | 26 |
| 3704 | `_reloadLayers()` | 18 |
| 3722 | `_installRecoil()` | 33 |
| 3755 | `_shotRecoil()` | 13 |
| 3768 | `_tryShoot()` | 86 |
| 3854 | `_tryKnifeAttack()` | 14 |
| 3868 | `_meleeHit()` | 16 |
| 3884 | `_meleeRange()` | 5 |
| 3889 | `_botMelee()` | 26 |
| 3915 | `_distanceDamage()` | 7 |
| 3922 | `_shotDamage()` | 10 |
| 3932 | `_consultarTiro()` | 13 |
| 3945 | `_origemTiroBot()` | 4 |
| 3949 | `_miraTiroBot()` | 5 |
| 3954 | `_participanteHumano()` | 4 |
| 3958 | `_resolverTiroBot()` | 11 |
| 3969 | `_danoTiroBot()` | 12 |
| 3981 | `_aplicarTiroBot()` | 12 |
| 3993 | `_dispararBot()` | 29 |
| 4022 | `_rastroTiroBot()` | 6 |
| 4028 | `_fireHitscan()` | 46 |
| 4074 | `_targetFromHit()` | 9 |
| 4083 | `_penetrationExit()` | 8 |
| 4091 | `_surfaceOf()` | 27 |
| 4118 | `_armoredTarget()` | 3 |
| 4121 | `_fleshImpact()` | 38 |
| 4159 | `_fxVoice()` | 9 |
| 4168 | `_impactSfx()` | 17 |
| 4185 | `_tintFx()` | 17 |
| 4202 | `_damage()` | 42 |
| 4244 | `_playerHurtFx()` | 5 |
| 4249 | `_kill()` | 54 |
| 4303 | `_checkArenaWin()` | 30 |
| 4333 | `_dmgArc()` | 79 |
| 4412 | `_mkBanner()` | 9 |
| 4421 | `_updateKillSequenceHud()` | 13 |
| 4434 | `_resetKillSequence()` | 7 |
| 4441 | `_fragRestockStep()` | 7 |
| 4448 | `_playerKillFeedback()` | 18 |
| 4466 | `_acertoPrevisto()` | 5 |
| 4471 | `_hitmarker()` | 15 |
| 4486 | `_dmgNumber()` | 20 |
| 4506 | `_feed()` | 19 |
| 4525 | `_skullIcon()` | 6 |
| 4531 | `_killfeedWeaponIcon()` | 9 |
| 4540 | `_wpnIcon()` | 64 |
| 4604 | `_tracer()` | 26 |
| 4630 | `_puff()` | 39 |
| 4669 | `_holeDecalMat()` | 8 |
| 4677 | `_flash()` | 61 |
| 4738 | `_vmTetoTela()` | 10 |
| 4748 | `_muzzleWorld()` | 30 |
| 4778 | `_aimOrigin()` | 5 |
| 4783 | `_updateDoors()` | 10 |
| 4793 | `_updateFx()` | 57 |
| 4850 | `_ejectCasing()` | 18 |
| 4868 | `_makeCtfFlagTex()` | 23 |
| 4891 | `_paintFlagSymbol()` | 9 |
| 4900 | `_flagTexFor()` | 25 |
| 4925 | `_legadoSimbolo()` | 8 |
| 4933 | `_loadCtfSymbols()` | 22 |
| 4955 | `_makeCtfZoneTex()` | 31 |
| 4986 | `_makeSmokeTex()` | 10 |
| 4996 | `_updateSmokeHud()` | 4 |
| 5000 | `_grenadeSpatial()` | 14 |
| 5014 | `_spawnGrenade()` | 19 |
| 5033 | `_throwNade()` | 13 |
| 5046 | `_throwSmoke()` | 1 |
| 5047 | `_throwFrag()` | 4 |
| 5086 | `_equipNade()` | 15 |
| 5101 | `_unequipNade()` | 11 |
| 5051 | `_explodeFrag()` | 40 |
| 5091 | `_corDaFumaca()` | 16 |
| 5107 | `_popSmoke()` | 23 |
| 5130 | `_updateGrenades()` | 35 |
| 5165 | `_teamColor()` | 12 |
| 5177 | `_teamInk()` | 7 |
| 5184 | `_factionOf()` | 1 |
| 5185 | `_voiceKey()` | 2 |
| 5187 | `_teamName()` | 1 |
| 5188 | `_teamTag()` | 6 |
| 5194 | `_plaqueta()` | 13 |
| 5207 | `_mirror()` | 2 |
| 5209 | `_defNoLado()` | 3 |
| 5212 | `_botSeparation()` | 61 |
| 5273 | `_initCTF()` | 86 |
| 5359 | `_updateCTF()` | 61 |
| 5420 | `_ctfWin()` | 24 |
| 5444 | `_freeYaw()` | 25 |
| 5469 | `_pullString()` | 23 |
| 5492 | `_walkReach()` | 32 |
| 5524 | `_wpComp()` | 16 |
| 5540 | `_findPathLocal()` | 22 |
| 5562 | `_botCtf()` | 137 |
| 5699 | `_hideCtfHud()` | 6 |
| 5705 | `_updateCtfHud()` | 76 |
| 5781 | `_collide()` | 23 |
| 5804 | `_collideRot()` | 22 |
| 5826 | `_mantleAlcance()` | 50 |
| 5876 | `_mantleAlcancavel()` | 12 |
| 5888 | `_mantleTarget()` | 35 |
| 5923 | `_freeSpot()` | 30 |
| 5953 | `_retaAndavel()` | 20 |
| 5973 | `_walkDepth()` | 16 |
| 5989 | `_noteHit()` | 17 |
| 6006 | `_deathFeedback()` | 45 |
| 6051 | `_toggleCamView()` | 6 |
| 6057 | `setCamView()` | 19 |
| 6076 | `_syncCamViewVis()` | 8 |
| 6084 | `_ensurePlayerTP()` | 29 |
| 6113 | `_updatePlayerTP()` | 98 |
| 6211 | `_updateCrosshairParallax()` | 47 |
| 6258 | `_tpDeath()` | 18 |
| 6276 | `_tpRevive()` | 13 |
| 6289 | `_moveEntity()` | 101 |
| 6390 | `_updatePlayer()` | 328 |
| 6718 | `_footstepSurface()` | 13 |
| 6731 | `_updatePickups()` | 158 |
| 6889 | `_wpnMode()` | 7 |
| 6896 | `_botWeapon()` | 10 |
| 6906 | `_municaoInfinita()` | 1 |
| 6907 | `_pickupAllowed()` | 9 |
| 6916 | `_grabNearPickup()` | 10 |
| 6926 | `_grabPickup()` | 35 |
| 6961 | `_assentarNoChao()` | 10 |
| 6971 | `refreshPickupModels()` | 24 |
| 6995 | `_dropWeapon()` | 20 |
| 7015 | `_sumirDrop()` | 36 |
| 7051 | `_spawnY()` | 3 |
| 7054 | `_spawnYaw()` | 5 |
| 7059 | `_pickSpawn()` | 23 |
| 7082 | `_respawnPlayer()` | 34 |
| 7116 | `_losClear()` | 18 |
| 7134 | `_botCall()` | 41 |
| 7175 | `_teamMarkTex()` | 23 |
| 7198 | `_makeTeamMark()` | 16 |
| 7214 | `_trocarPersonagem()` | 19 |
| 7233 | `_syncRemoteWeapon()` | 23 |
| 7256 | `_updateTeamMark()` | 7 |
| 7263 | `_posturaBot()` | 4 |
| 7267 | `_botEye()` | 1 |
| 7268 | `_enemyOf()` | 8 |
| 7276 | `_duelToken()` | 22 |
| 7298 | `_respawnEntity()` | 23 |
| 7321 | `_botOuve()` | 12 |
| 7333 | `_updateBot()` | 837 |
| 8170 | `_flushTraining()` | 13 |
| 8183 | `_updateBotNN()` | 73 |
| 8256 | `_botShootNN()` | 31 |
| 8287 | `_radarFoot()` | 38 |
| 8325 | `_radarStatic()` | 31 |
| 8356 | `_updateRadar()` | 48 |
| 8404 | `_banner()` | 26 |
| 8430 | `_resultadoDaRodada()` | 4 |
| 8434 | `_botaoAmigo()` | 5 |
| 8439 | `_ligarAmigoPlacar()` | 22 |
| 8461 | `_showScoreboard()` | 54 |
| 8515 | `_updateWeaponHud()` | 40 |
| 8555 | `_updateHud()` | 120 |
| 8675 | `update()` | 90 |
| 8765 | `dispose()` | 52 |

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
