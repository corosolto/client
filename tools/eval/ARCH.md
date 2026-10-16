# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.100 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8488 | 338 |
| `public/js/main.js` | 4864 | 359 |
| `public/js/glbchars.js` | 893 | 62 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3365 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 858 | 7052 | `_updateBot()` | ⚠️ candidato a extração |
| 638 | 728 | `constructor()` | 🔴 append-only |
| 308 | 6134 | `_updatePlayer()` | ⚠️ candidato a extração |
| 271 | 1469 | `_buildViewModels()` |  |
| 255 | 2663 | `_resetPositions()` |  |
| 158 | 6455 | `_updatePickups()` |  |
| 137 | 5368 | `_botCtf()` |  |
| 135 | 2223 | `_touchControls()` |  |
| 101 | 6033 | `_moveEntity()` |  |
| 90 | 8346 | `update()` | 🔴 append-only |
| 88 | 8258 | `_updateHud()` |  |
| 86 | 5079 | `_initCTF()` |  |
| 82 | 3655 | `_tryShoot()` |  |
| 79 | 3301 | `_ensureVmPrecisionQa()` |  |
| 79 | 4150 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `356–359` `441–535` `565–586` `1469–1880` `3267–3300` `3497–3590` `3609–3736` `3751–3766` `3811–3880` `4411–4436` `4484–4584` `4657–4673` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `188–191` `242–242` `275–286` `628–639` `4020–4119` `5018–5078` `5250–5504` `5587–5609` `6134–6441` `6840–6857` `6987–7017` `7052–7909` | — |
| **MAPAS / MUNDO** | `1412–1468` `2663–2917` `5079–5225` `6455–6612` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1895–1904` `2019–2057` `3170–3183` `4437–4475` `4600–4656` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1366–1411` `3122–3144` `3160–3169` `3184–3200` `4150–4228` `4278–4331` `4347–4410` `8080–8143` `8174–8222` `8258–8345` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8346–8435 · `_dom()` 1366–1411 · `constructor()` 728–1365

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3932 de 8488 linhas (46%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 51 | `ANNOUNCER_LAB` | 4 |
| 55 | `VMLAB` | 3 |
| 60 | `VM_QA_CICLO` | 3 |
| 64 | `VM_QA_ADS` | 8 |
| 72 | `VM_MAT_LEGACY` | 4 |
| 82 | `RECUPERA_BOOM` | 8 |
| 86 | `ROUNDS_MAX` | 27 |
| 114 | `CTF_ROUNDS_TO_WIN` | 4 |
| 119 | `sanitizeRounds` | 4 |
| 124 | `CTF_CLOCK_SHOW` | 4 |
| 128 | `KILLS_PER_PLAYER` | 7 |
| 135 | `PACE` | 33 |
| 168 | `PAUSE_ARM_MS` | 3 |
| 171 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 181 | `confirmGate` | 7 |
| 192 | `BOT_AIM_PITCH` | 4 |
| 196 | `BOT_DMG_PLAYER` | 21 |
| 217 | `BOT_FAIR` | 5 |
| 222 | `BOT_MOVE2` | 15 |
| 246 | `BOT_FOCUS_MIN` | 3 |
| 253 | `BOT_OUVE_PASSO` | 22 |
| 279 | `BOT_TOKEN_REST` | 7 |
| 287 | `MOVE_MUL` | 6 |
| 294 | `MOVE2` | 4 |
| 298 | `STEP_H` | 3 |
| 305 | `MANTLE_APOIO` | 4 |
| 309 | `MANTLE_GRID` | 5 |
| 314 | `RACK_OLD` | 4 |
| 318 | `RACK_RETA` | 25 |
| 345 | `RADIO` | 5 |
| 351 | `MK_LABELS` | 5 |
| 356 | `GUNFEEL` | 4 |
| 363 | `TRACER_STYLE` | 6 |
| 373 | `ADS_RAMPA_S` | 3 |
| 377 | `aberturaCone` | 16 |
| 393 | `anguloDeDisparo` | 4 |
| 397 | `coneDoDisparo` | 16 |
| 414 | `D2R` | 4 |
| 418 | `DMG_FALLOFF` | 5 |
| 423 | `HS_MUL` | 3 |
| 426 | `BALL_CLASS` | 15 |
| 441 | `STATIC_CLASS` | 75 |
| 517 | `VM_KNOB` | 19 |
| 536 | `vmAdsRot` | 4 |
| 541 | `vmFovForAspect` | 24 |
| 565 | `VM_OFF` | 22 |
| 587 | `vmOffY` | 35 |
| 622 | `VMP` | 6 |
| 628 | `BOT_SKILLS` | 11 |
| 640 | `diffKey` | 4 |
| 645 | `rollBotSkill` | 7 |
| 652 | `botTier` | 4 |
| 656 | `_cyclePool` | 5 |
| 661 | `_rosterPool` | 22 |
| 685 | `_pinnedDefs` | 5 |
| 690 | `pickMatchRoster` | 21 |
| 711 | `BOT_WEAPON_POOL` | 5 |
| 716 | `pickMatchWeapons` | 9 |
| 728 | `constructor()` | 638 |
| 1366 | `_dom()` | 46 |
| 1412 | `_buildEnv()` | 57 |
| 1469 | `_buildViewModels()` | 271 |
| 1740 | `_vmFrame` | 141 |
| 1881 | `_vmMontarTardio` | 14 |
| 1895 | `_makePuffTexture()` | 10 |
| 1905 | `_makeBloodTex()` | 19 |
| 1924 | `_makeBloodPoolTex()` | 21 |
| 1945 | `_bloodDecal()` | 16 |
| 1961 | `_makeBloodFx()` | 20 |
| 1981 | `_bloodSpatter()` | 18 |
| 1999 | `_bloodPoolAt()` | 6 |
| 2005 | `_updateBlood()` | 14 |
| 2019 | `_makeFlashTex()` | 21 |
| 2040 | `_makeFlashSoftTex()` | 8 |
| 2048 | `_makeFlashCoreTex()` | 10 |
| 2058 | `_input()` | 6 |
| 2064 | `_kd` | 49 |
| 2113 | `_ku` | 5 |
| 2118 | `_md` | 40 |
| 2158 | `_mu` | 7 |
| 2165 | `_mm` | 20 |
| 2185 | `_wh` | 17 |
| 2202 | `_cc` | 1 |
| 2203 | `_blur` | 1 |
| 2204 | `_plc` | 19 |
| 2223 | `_touchControls()` | 135 |
| 2358 | `_aimAssist()` | 28 |
| 2386 | `_requestLock()` | 27 |
| 2413 | `_travaAtalhos()` | 4 |
| 2417 | `_soltaAtalhos()` | 5 |
| 2422 | `espectando()` | 2 |
| 2424 | `_acceptInput()` | 7 |
| 2431 | `travarEntrada()` | 17 |
| 2448 | `_chatSeguraPausa()` | 5 |
| 2453 | `_pauseBackdrop()` | 7 |
| 2460 | `_radioShow()` | 6 |
| 2466 | `_radioUi()` | 8 |
| 2474 | `_radioPick()` | 20 |
| 2494 | `_abilityNotice()` | 10 |
| 2504 | `_resetSliceAbilities()` | 9 |
| 2513 | `_stackTrace()` | 28 |
| 2541 | `_updateMotocaCharge()` | 10 |
| 2551 | `_recordRoutePoint()` | 11 |
| 2562 | `_routePing()` | 23 |
| 2585 | `_tickRoutePings()` | 12 |
| 2597 | `_objectiveInteractionMultiplier()` | 14 |
| 2611 | `start()` | 5 |
| 2616 | `_startAnnouncerLab()` | 9 |
| 2625 | `_startRound()` | 38 |
| 2663 | `_resetPositions()` | 255 |
| 2918 | `_checkCtfAlvo()` | 13 |
| 2931 | `_checkPace()` | 13 |
| 2944 | `_endRound()` | 34 |
| 2978 | `_roundWinnerVoice()` | 12 |
| 2990 | `_fimDaPartida()` | 7 |
| 2997 | `_endMatch()` | 61 |
| 3058 | `_ensureDolly()` | 41 |
| 3099 | `_tickDolly()` | 23 |
| 3122 | `setPaused()` | 23 |
| 3145 | `_now()` | 3 |
| 3148 | `pauseArmed()` | 1 |
| 3149 | `_syncPauseArm()` | 7 |
| 3156 | `resume()` | 4 |
| 3160 | `applySettings()` | 10 |
| 3170 | `_applyQuality()` | 14 |
| 3184 | `onResize()` | 17 |
| 3201 | `_switchTeam()` | 66 |
| 3267 | `_applyVmVisibility()` | 34 |
| 3301 | `_ensureVmPrecisionQa()` | 79 |
| 3380 | `_syncVmPresentation()` | 19 |
| 3399 | `_vmlabEnsure()` | 14 |
| 3413 | `_vmlabFrame()` | 28 |
| 3441 | `_tuneGet()` | 15 |
| 3456 | `_tune()` | 23 |
| 3479 | `_fxSet()` | 2 |
| 3481 | `_qaCicloArma()` | 8 |
| 3489 | `_cycleWeapon()` | 8 |
| 3497 | `_switchWeapon()` | 39 |
| 3536 | `_deploySfx()` | 7 |
| 3543 | `_scope()` | 17 |
| 3560 | `_zoomFov()` | 5 |
| 3565 | `_reloading()` | 1 |
| 3566 | `_startReload()` | 25 |
| 3591 | `_reloadLayers()` | 18 |
| 3609 | `_installRecoil()` | 33 |
| 3642 | `_shotRecoil()` | 13 |
| 3655 | `_tryShoot()` | 82 |
| 3737 | `_tryKnifeAttack()` | 14 |
| 3751 | `_meleeHit()` | 16 |
| 3767 | `_meleeRange()` | 5 |
| 3772 | `_botMelee()` | 28 |
| 3800 | `_shotDamage()` | 11 |
| 3811 | `_fireHitscan()` | 70 |
| 3881 | `_targetFromHit()` | 9 |
| 3890 | `_penetrationExit()` | 20 |
| 3910 | `_surfaceOf()` | 27 |
| 3937 | `_armoredTarget()` | 3 |
| 3940 | `_fleshImpact()` | 38 |
| 3978 | `_fxVoice()` | 9 |
| 3987 | `_impactSfx()` | 17 |
| 4004 | `_tintFx()` | 16 |
| 4020 | `_damage()` | 42 |
| 4062 | `_playerHurtFx()` | 5 |
| 4067 | `_kill()` | 53 |
| 4120 | `_checkArenaWin()` | 30 |
| 4150 | `_dmgArc()` | 79 |
| 4229 | `_mkBanner()` | 9 |
| 4238 | `_updateKillSequenceHud()` | 12 |
| 4250 | `_resetKillSequence()` | 5 |
| 4255 | `_playerKillFeedback()` | 18 |
| 4273 | `_acertoPrevisto()` | 5 |
| 4278 | `_hitmarker()` | 15 |
| 4293 | `_dmgNumber()` | 20 |
| 4313 | `_feed()` | 19 |
| 4332 | `_skullIcon()` | 6 |
| 4338 | `_killfeedWeaponIcon()` | 9 |
| 4347 | `_wpnIcon()` | 64 |
| 4411 | `_tracer()` | 26 |
| 4437 | `_puff()` | 39 |
| 4476 | `_holeDecalMat()` | 8 |
| 4484 | `_flash()` | 61 |
| 4545 | `_vmTetoTela()` | 10 |
| 4555 | `_muzzleWorld()` | 30 |
| 4585 | `_aimOrigin()` | 5 |
| 4590 | `_updateDoors()` | 10 |
| 4600 | `_updateFx()` | 57 |
| 4657 | `_ejectCasing()` | 17 |
| 4674 | `_makeCtfFlagTex()` | 23 |
| 4697 | `_paintFlagSymbol()` | 9 |
| 4706 | `_flagTexFor()` | 25 |
| 4731 | `_legadoSimbolo()` | 8 |
| 4739 | `_loadCtfSymbols()` | 22 |
| 4761 | `_makeCtfZoneTex()` | 31 |
| 4792 | `_makeSmokeTex()` | 10 |
| 4802 | `_updateSmokeHud()` | 4 |
| 4806 | `_grenadeSpatial()` | 14 |
| 4820 | `_spawnGrenade()` | 19 |
| 4839 | `_throwNade()` | 13 |
| 4852 | `_throwSmoke()` | 1 |
| 4853 | `_throwFrag()` | 4 |
| 4857 | `_explodeFrag()` | 40 |
| 4897 | `_corDaFumaca()` | 16 |
| 4913 | `_popSmoke()` | 23 |
| 4936 | `_updateGrenades()` | 35 |
| 4971 | `_teamColor()` | 12 |
| 4983 | `_teamInk()` | 7 |
| 4990 | `_factionOf()` | 1 |
| 4991 | `_voiceKey()` | 2 |
| 4993 | `_teamName()` | 1 |
| 4994 | `_teamTag()` | 6 |
| 5000 | `_plaqueta()` | 13 |
| 5013 | `_mirror()` | 2 |
| 5015 | `_defNoLado()` | 3 |
| 5018 | `_botSeparation()` | 61 |
| 5079 | `_initCTF()` | 86 |
| 5165 | `_updateCTF()` | 61 |
| 5226 | `_ctfWin()` | 24 |
| 5250 | `_freeYaw()` | 25 |
| 5275 | `_pullString()` | 23 |
| 5298 | `_walkReach()` | 32 |
| 5330 | `_wpComp()` | 16 |
| 5346 | `_findPathLocal()` | 22 |
| 5368 | `_botCtf()` | 137 |
| 5505 | `_hideCtfHud()` | 6 |
| 5511 | `_updateCtfHud()` | 76 |
| 5587 | `_collide()` | 23 |
| 5610 | `_collideRot()` | 22 |
| 5632 | `_mantleAlcance()` | 50 |
| 5682 | `_mantleAlcancavel()` | 12 |
| 5694 | `_mantleTarget()` | 35 |
| 5729 | `_freeSpot()` | 30 |
| 5759 | `_retaAndavel()` | 20 |
| 5779 | `_walkDepth()` | 16 |
| 5795 | `_noteHit()` | 17 |
| 5812 | `_deathFeedback()` | 45 |
| 5857 | `_toggleCamView()` | 6 |
| 5863 | `setCamView()` | 16 |
| 5879 | `_syncCamViewVis()` | 8 |
| 5887 | `_ensurePlayerTP()` | 26 |
| 5913 | `_updatePlayerTP()` | 42 |
| 5955 | `_updateCrosshairParallax()` | 47 |
| 6002 | `_tpDeath()` | 18 |
| 6020 | `_tpRevive()` | 13 |
| 6033 | `_moveEntity()` | 101 |
| 6134 | `_updatePlayer()` | 308 |
| 6442 | `_footstepSurface()` | 13 |
| 6455 | `_updatePickups()` | 158 |
| 6613 | `_wpnMode()` | 7 |
| 6620 | `_botWeapon()` | 10 |
| 6630 | `_municaoInfinita()` | 1 |
| 6631 | `_pickupAllowed()` | 9 |
| 6640 | `_grabNearPickup()` | 10 |
| 6650 | `_grabPickup()` | 35 |
| 6685 | `_assentarNoChao()` | 10 |
| 6695 | `refreshPickupModels()` | 24 |
| 6719 | `_dropWeapon()` | 20 |
| 6739 | `_sumirDrop()` | 36 |
| 6775 | `_spawnY()` | 3 |
| 6778 | `_spawnYaw()` | 5 |
| 6783 | `_pickSpawn()` | 23 |
| 6806 | `_respawnPlayer()` | 34 |
| 6840 | `_losClear()` | 18 |
| 6858 | `_botCall()` | 41 |
| 6899 | `_teamMarkTex()` | 23 |
| 6922 | `_makeTeamMark()` | 16 |
| 6938 | `_trocarPersonagem()` | 19 |
| 6957 | `_syncRemoteWeapon()` | 23 |
| 6980 | `_updateTeamMark()` | 7 |
| 6987 | `_botEye()` | 1 |
| 6988 | `_enemyOf()` | 8 |
| 6996 | `_duelToken()` | 22 |
| 7018 | `_respawnEntity()` | 22 |
| 7040 | `_botOuve()` | 12 |
| 7052 | `_updateBot()` | 858 |
| 7910 | `_flushTraining()` | 13 |
| 7923 | `_updateBotNN()` | 73 |
| 7996 | `_botShootNN()` | 46 |
| 8042 | `_radarFoot()` | 38 |
| 8080 | `_updateRadar()` | 64 |
| 8144 | `_banner()` | 26 |
| 8170 | `_resultadoDaRodada()` | 4 |
| 8174 | `_showScoreboard()` | 49 |
| 8223 | `_updateWeaponHud()` | 35 |
| 8258 | `_updateHud()` | 88 |
| 8346 | `update()` | 90 |
| 8436 | `dispose()` | 52 |

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
