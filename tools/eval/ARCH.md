# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.84 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8435 | 332 |
| `public/js/main.js` | 4534 | 337 |
| `public/js/glbchars.js` | 855 | 60 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3337 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 838 | 7019 | `_updateBot()` | ⚠️ candidato a extração |
| 637 | 719 | `constructor()` | 🔴 append-only |
| 304 | 6121 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1456 | `_buildViewModels()` |  |
| 255 | 2648 | `_resetPositions()` |  |
| 158 | 6438 | `_updatePickups()` |  |
| 137 | 5355 | `_botCtf()` |  |
| 135 | 2208 | `_touchControls()` |  |
| 101 | 6020 | `_moveEntity()` |  |
| 90 | 8293 | `update()` | 🔴 append-only |
| 88 | 8205 | `_updateHud()` |  |
| 86 | 5066 | `_initCTF()` |  |
| 81 | 3640 | `_tryShoot()` |  |
| 79 | 3286 | `_ensureVmPrecisionQa()` |  |
| 79 | 4134 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `347–350` `432–526` `556–577` `1456–1865` `3252–3285` `3482–3575` `3594–3720` `3735–3750` `3795–3864` `4395–4420` `4468–4568` `4641–4657` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `186–189` `240–240` `266–277` `619–630` `4004–4103` `5005–5065` `5237–5491` `5574–5596` `6121–6424` `6821–6838` `6967–6997` `7019–7856` | — |
| **MAPAS / MUNDO** | `1402–1455` `2648–2902` `5066–5212` `6438–6595` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1880–1889` `2004–2042` `3155–3168` `4421–4459` `4584–4640` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1356–1401` `3107–3129` `3145–3154` `3169–3185` `4134–4212` `4262–4315` `4331–4394` `8027–8090` `8121–8169` `8205–8292` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8293–8382 · `_dom()` 1356–1401 · `constructor()` 719–1355

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3902 de 8435 linhas (46%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 49 | `ANNOUNCER_LAB` | 4 |
| 53 | `VMLAB` | 3 |
| 58 | `VM_QA_CICLO` | 3 |
| 62 | `VM_QA_ADS` | 8 |
| 70 | `VM_MAT_LEGACY` | 4 |
| 76 | `DROP_TTL` | 8 |
| 84 | `ROUNDS_MAX` | 27 |
| 112 | `CTF_ROUNDS_TO_WIN` | 4 |
| 117 | `sanitizeRounds` | 4 |
| 122 | `CTF_CLOCK_SHOW` | 4 |
| 126 | `KILLS_PER_PLAYER` | 7 |
| 133 | `PACE` | 33 |
| 166 | `PAUSE_ARM_MS` | 3 |
| 169 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 179 | `confirmGate` | 7 |
| 190 | `BOT_AIM_PITCH` | 4 |
| 194 | `BOT_DMG_PLAYER` | 21 |
| 215 | `BOT_FAIR` | 5 |
| 220 | `BOT_MOVE2` | 15 |
| 244 | `BOT_FOCUS_MIN` | 22 |
| 270 | `BOT_TOKEN_REST` | 7 |
| 278 | `MOVE_MUL` | 6 |
| 285 | `MOVE2` | 4 |
| 289 | `STEP_H` | 3 |
| 296 | `MANTLE_APOIO` | 4 |
| 300 | `MANTLE_GRID` | 5 |
| 305 | `RACK_OLD` | 4 |
| 309 | `RACK_RETA` | 25 |
| 336 | `RADIO` | 5 |
| 342 | `MK_LABELS` | 5 |
| 347 | `GUNFEEL` | 4 |
| 354 | `TRACER_STYLE` | 6 |
| 364 | `ADS_RAMPA_S` | 3 |
| 368 | `aberturaCone` | 16 |
| 384 | `anguloDeDisparo` | 4 |
| 388 | `coneDoDisparo` | 16 |
| 405 | `D2R` | 4 |
| 409 | `DMG_FALLOFF` | 5 |
| 414 | `HS_MUL` | 3 |
| 417 | `BALL_CLASS` | 15 |
| 432 | `STATIC_CLASS` | 75 |
| 508 | `VM_KNOB` | 19 |
| 527 | `vmAdsRot` | 4 |
| 532 | `vmFovForAspect` | 24 |
| 556 | `VM_OFF` | 22 |
| 578 | `vmOffY` | 35 |
| 613 | `VMP` | 6 |
| 619 | `BOT_SKILLS` | 11 |
| 631 | `diffKey` | 4 |
| 636 | `rollBotSkill` | 7 |
| 643 | `botTier` | 4 |
| 647 | `_cyclePool` | 5 |
| 652 | `_rosterPool` | 22 |
| 676 | `_pinnedDefs` | 5 |
| 681 | `pickMatchRoster` | 21 |
| 702 | `BOT_WEAPON_POOL` | 5 |
| 707 | `pickMatchWeapons` | 9 |
| 719 | `constructor()` | 637 |
| 1356 | `_dom()` | 46 |
| 1402 | `_buildEnv()` | 54 |
| 1456 | `_buildViewModels()` | 269 |
| 1725 | `_vmFrame` | 141 |
| 1866 | `_vmMontarTardio` | 14 |
| 1880 | `_makePuffTexture()` | 10 |
| 1890 | `_makeBloodTex()` | 19 |
| 1909 | `_makeBloodPoolTex()` | 21 |
| 1930 | `_bloodDecal()` | 16 |
| 1946 | `_makeBloodFx()` | 20 |
| 1966 | `_bloodSpatter()` | 18 |
| 1984 | `_bloodPoolAt()` | 6 |
| 1990 | `_updateBlood()` | 14 |
| 2004 | `_makeFlashTex()` | 21 |
| 2025 | `_makeFlashSoftTex()` | 8 |
| 2033 | `_makeFlashCoreTex()` | 10 |
| 2043 | `_input()` | 6 |
| 2049 | `_kd` | 49 |
| 2098 | `_ku` | 5 |
| 2103 | `_md` | 40 |
| 2143 | `_mu` | 7 |
| 2150 | `_mm` | 20 |
| 2170 | `_wh` | 17 |
| 2187 | `_cc` | 1 |
| 2188 | `_blur` | 1 |
| 2189 | `_plc` | 19 |
| 2208 | `_touchControls()` | 135 |
| 2343 | `_aimAssist()` | 28 |
| 2371 | `_requestLock()` | 27 |
| 2398 | `_travaAtalhos()` | 4 |
| 2402 | `_soltaAtalhos()` | 5 |
| 2407 | `espectando()` | 2 |
| 2409 | `_acceptInput()` | 7 |
| 2416 | `travarEntrada()` | 17 |
| 2433 | `_chatSeguraPausa()` | 5 |
| 2438 | `_pauseBackdrop()` | 7 |
| 2445 | `_radioShow()` | 6 |
| 2451 | `_radioUi()` | 8 |
| 2459 | `_radioPick()` | 20 |
| 2479 | `_abilityNotice()` | 10 |
| 2489 | `_resetSliceAbilities()` | 9 |
| 2498 | `_stackTrace()` | 28 |
| 2526 | `_updateMotocaCharge()` | 10 |
| 2536 | `_recordRoutePoint()` | 11 |
| 2547 | `_routePing()` | 23 |
| 2570 | `_tickRoutePings()` | 12 |
| 2582 | `_objectiveInteractionMultiplier()` | 14 |
| 2596 | `start()` | 5 |
| 2601 | `_startAnnouncerLab()` | 9 |
| 2610 | `_startRound()` | 38 |
| 2648 | `_resetPositions()` | 255 |
| 2903 | `_checkCtfAlvo()` | 13 |
| 2916 | `_checkPace()` | 13 |
| 2929 | `_endRound()` | 34 |
| 2963 | `_roundWinnerVoice()` | 12 |
| 2975 | `_fimDaPartida()` | 7 |
| 2982 | `_endMatch()` | 61 |
| 3043 | `_ensureDolly()` | 41 |
| 3084 | `_tickDolly()` | 23 |
| 3107 | `setPaused()` | 23 |
| 3130 | `_now()` | 3 |
| 3133 | `pauseArmed()` | 1 |
| 3134 | `_syncPauseArm()` | 7 |
| 3141 | `resume()` | 4 |
| 3145 | `applySettings()` | 10 |
| 3155 | `_applyQuality()` | 14 |
| 3169 | `onResize()` | 17 |
| 3186 | `_switchTeam()` | 66 |
| 3252 | `_applyVmVisibility()` | 34 |
| 3286 | `_ensureVmPrecisionQa()` | 79 |
| 3365 | `_syncVmPresentation()` | 19 |
| 3384 | `_vmlabEnsure()` | 14 |
| 3398 | `_vmlabFrame()` | 28 |
| 3426 | `_tuneGet()` | 15 |
| 3441 | `_tune()` | 23 |
| 3464 | `_fxSet()` | 2 |
| 3466 | `_qaCicloArma()` | 8 |
| 3474 | `_cycleWeapon()` | 8 |
| 3482 | `_switchWeapon()` | 39 |
| 3521 | `_deploySfx()` | 7 |
| 3528 | `_scope()` | 17 |
| 3545 | `_zoomFov()` | 5 |
| 3550 | `_reloading()` | 1 |
| 3551 | `_startReload()` | 25 |
| 3576 | `_reloadLayers()` | 18 |
| 3594 | `_installRecoil()` | 33 |
| 3627 | `_shotRecoil()` | 13 |
| 3640 | `_tryShoot()` | 81 |
| 3721 | `_tryKnifeAttack()` | 14 |
| 3735 | `_meleeHit()` | 16 |
| 3751 | `_meleeRange()` | 5 |
| 3756 | `_botMelee()` | 28 |
| 3784 | `_shotDamage()` | 11 |
| 3795 | `_fireHitscan()` | 70 |
| 3865 | `_targetFromHit()` | 9 |
| 3874 | `_penetrationExit()` | 20 |
| 3894 | `_surfaceOf()` | 27 |
| 3921 | `_armoredTarget()` | 3 |
| 3924 | `_fleshImpact()` | 38 |
| 3962 | `_fxVoice()` | 9 |
| 3971 | `_impactSfx()` | 17 |
| 3988 | `_tintFx()` | 16 |
| 4004 | `_damage()` | 42 |
| 4046 | `_playerHurtFx()` | 5 |
| 4051 | `_kill()` | 53 |
| 4104 | `_checkArenaWin()` | 30 |
| 4134 | `_dmgArc()` | 79 |
| 4213 | `_mkBanner()` | 9 |
| 4222 | `_updateKillSequenceHud()` | 12 |
| 4234 | `_resetKillSequence()` | 5 |
| 4239 | `_playerKillFeedback()` | 18 |
| 4257 | `_acertoPrevisto()` | 5 |
| 4262 | `_hitmarker()` | 15 |
| 4277 | `_dmgNumber()` | 20 |
| 4297 | `_feed()` | 19 |
| 4316 | `_skullIcon()` | 6 |
| 4322 | `_killfeedWeaponIcon()` | 9 |
| 4331 | `_wpnIcon()` | 64 |
| 4395 | `_tracer()` | 26 |
| 4421 | `_puff()` | 39 |
| 4460 | `_holeDecalMat()` | 8 |
| 4468 | `_flash()` | 61 |
| 4529 | `_vmTetoTela()` | 10 |
| 4539 | `_muzzleWorld()` | 30 |
| 4569 | `_aimOrigin()` | 5 |
| 4574 | `_updateDoors()` | 10 |
| 4584 | `_updateFx()` | 57 |
| 4641 | `_ejectCasing()` | 17 |
| 4658 | `_makeCtfFlagTex()` | 23 |
| 4681 | `_paintFlagSymbol()` | 9 |
| 4690 | `_flagTexFor()` | 26 |
| 4716 | `_legadoSimbolo()` | 8 |
| 4724 | `_loadCtfSymbols()` | 22 |
| 4746 | `_makeCtfZoneTex()` | 31 |
| 4777 | `_makeSmokeTex()` | 10 |
| 4787 | `_updateSmokeHud()` | 4 |
| 4791 | `_grenadeSpatial()` | 14 |
| 4805 | `_spawnGrenade()` | 19 |
| 4824 | `_throwNade()` | 13 |
| 4837 | `_throwSmoke()` | 1 |
| 4838 | `_throwFrag()` | 4 |
| 4842 | `_explodeFrag()` | 40 |
| 4882 | `_corDaFumaca()` | 16 |
| 4898 | `_popSmoke()` | 23 |
| 4921 | `_updateGrenades()` | 35 |
| 4956 | `_teamColor()` | 15 |
| 4971 | `_teamInk()` | 7 |
| 4978 | `_factionOf()` | 1 |
| 4979 | `_voiceKey()` | 1 |
| 4980 | `_teamName()` | 1 |
| 4981 | `_teamTag()` | 6 |
| 4987 | `_plaqueta()` | 13 |
| 5000 | `_mirror()` | 2 |
| 5002 | `_defNoLado()` | 3 |
| 5005 | `_botSeparation()` | 61 |
| 5066 | `_initCTF()` | 86 |
| 5152 | `_updateCTF()` | 61 |
| 5213 | `_ctfWin()` | 24 |
| 5237 | `_freeYaw()` | 25 |
| 5262 | `_pullString()` | 23 |
| 5285 | `_walkReach()` | 32 |
| 5317 | `_wpComp()` | 16 |
| 5333 | `_findPathLocal()` | 22 |
| 5355 | `_botCtf()` | 137 |
| 5492 | `_hideCtfHud()` | 6 |
| 5498 | `_updateCtfHud()` | 76 |
| 5574 | `_collide()` | 23 |
| 5597 | `_collideRot()` | 22 |
| 5619 | `_mantleAlcance()` | 50 |
| 5669 | `_mantleAlcancavel()` | 12 |
| 5681 | `_mantleTarget()` | 35 |
| 5716 | `_freeSpot()` | 30 |
| 5746 | `_retaAndavel()` | 20 |
| 5766 | `_walkDepth()` | 16 |
| 5782 | `_noteHit()` | 17 |
| 5799 | `_deathFeedback()` | 45 |
| 5844 | `_toggleCamView()` | 6 |
| 5850 | `setCamView()` | 16 |
| 5866 | `_syncCamViewVis()` | 8 |
| 5874 | `_ensurePlayerTP()` | 26 |
| 5900 | `_updatePlayerTP()` | 42 |
| 5942 | `_updateCrosshairParallax()` | 47 |
| 5989 | `_tpDeath()` | 18 |
| 6007 | `_tpRevive()` | 13 |
| 6020 | `_moveEntity()` | 101 |
| 6121 | `_updatePlayer()` | 304 |
| 6425 | `_footstepSurface()` | 13 |
| 6438 | `_updatePickups()` | 158 |
| 6596 | `_wpnMode()` | 5 |
| 6601 | `_botWeapon()` | 10 |
| 6611 | `_municaoInfinita()` | 1 |
| 6612 | `_pickupAllowed()` | 9 |
| 6621 | `_grabNearPickup()` | 10 |
| 6631 | `_grabPickup()` | 35 |
| 6666 | `_assentarNoChao()` | 10 |
| 6676 | `refreshPickupModels()` | 24 |
| 6700 | `_dropWeapon()` | 20 |
| 6720 | `_sumirDrop()` | 36 |
| 6756 | `_spawnY()` | 3 |
| 6759 | `_spawnYaw()` | 5 |
| 6764 | `_pickSpawn()` | 23 |
| 6787 | `_respawnPlayer()` | 34 |
| 6821 | `_losClear()` | 18 |
| 6839 | `_botCall()` | 41 |
| 6880 | `_teamMarkTex()` | 23 |
| 6903 | `_makeTeamMark()` | 16 |
| 6919 | `_trocarPersonagem()` | 18 |
| 6937 | `_syncRemoteWeapon()` | 23 |
| 6960 | `_updateTeamMark()` | 7 |
| 6967 | `_botEye()` | 1 |
| 6968 | `_enemyOf()` | 8 |
| 6976 | `_duelToken()` | 22 |
| 6998 | `_respawnEntity()` | 21 |
| 7019 | `_updateBot()` | 838 |
| 7857 | `_flushTraining()` | 13 |
| 7870 | `_updateBotNN()` | 73 |
| 7943 | `_botShootNN()` | 46 |
| 7989 | `_radarFoot()` | 38 |
| 8027 | `_updateRadar()` | 64 |
| 8091 | `_banner()` | 26 |
| 8117 | `_resultadoDaRodada()` | 4 |
| 8121 | `_showScoreboard()` | 49 |
| 8170 | `_updateWeaponHud()` | 35 |
| 8205 | `_updateHud()` | 88 |
| 8293 | `update()` | 90 |
| 8383 | `dispose()` | 52 |

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
