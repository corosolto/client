# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.53 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8350 | 328 |
| `public/js/main.js` | 4257 | 327 |
| `public/js/glbchars.js` | 855 | 60 |
| `public/js/characters.js` | 1138 | 42 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3312 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6951 | `_updateBot()` | ⚠️ candidato a extração |
| 628 | 689 | `constructor()` | 🔴 append-only |
| 304 | 6071 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1417 | `_buildViewModels()` |  |
| 255 | 2609 | `_resetPositions()` |  |
| 158 | 6388 | `_updatePickups()` |  |
| 137 | 5306 | `_botCtf()` |  |
| 135 | 2169 | `_touchControls()` |  |
| 101 | 5970 | `_moveEntity()` |  |
| 90 | 8209 | `update()` | 🔴 append-only |
| 88 | 8121 | `_updateHud()` |  |
| 86 | 5017 | `_initCTF()` |  |
| 81 | 3600 | `_tryShoot()` |  |
| 79 | 3246 | `_ensureVmPrecisionQa()` |  |
| 79 | 4085 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `337–340` `419–513` `543–564` `1417–1826` `3212–3245` `3442–3535` `3554–3680` `3695–3710` `3755–3814` `4346–4371` `4419–4519` `4592–4608` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `176–179` `230–230` `256–267` `606–617` `3954–4054` `4956–5016` `5188–5442` `5525–5547` `6071–6374` `6771–6788` `6899–6929` `6951–7772` | — |
| **MAPAS / MUNDO** | `1363–1416` `2609–2863` `5017–5163` `6388–6545` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1841–1850` `1965–2003` `3116–3128` `4372–4410` `4535–4591` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1317–1362` `3068–3090` `3106–3115` `3129–3145` `4085–4163` `4213–4266` `4282–4345` `7943–8006` `8037–8085` `8121–8208` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8209–8298 · `_dom()` 1317–1362 · `constructor()` 689–1316

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3875 de 8350 linhas (46%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 47 | `ANNOUNCER_LAB` | 4 |
| 51 | `VMLAB` | 3 |
| 56 | `VM_QA_CICLO` | 3 |
| 60 | `VM_QA_ADS` | 8 |
| 68 | `VM_MAT_LEGACY` | 4 |
| 74 | `DROP_TTL` | 8 |
| 82 | `ROUNDS_MAX` | 27 |
| 112 | `CTF_CLOCK_SHOW` | 4 |
| 116 | `KILLS_PER_PLAYER` | 7 |
| 123 | `PACE` | 33 |
| 156 | `PAUSE_ARM_MS` | 3 |
| 159 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 169 | `confirmGate` | 7 |
| 180 | `BOT_AIM_PITCH` | 4 |
| 184 | `BOT_DMG_PLAYER` | 21 |
| 205 | `BOT_FAIR` | 5 |
| 210 | `BOT_MOVE2` | 15 |
| 234 | `BOT_FOCUS_MIN` | 22 |
| 260 | `BOT_TOKEN_REST` | 7 |
| 268 | `MOVE_MUL` | 6 |
| 275 | `MOVE2` | 4 |
| 279 | `STEP_H` | 3 |
| 286 | `MANTLE_APOIO` | 4 |
| 290 | `MANTLE_GRID` | 5 |
| 295 | `RACK_OLD` | 4 |
| 299 | `RACK_RETA` | 25 |
| 326 | `RADIO` | 5 |
| 332 | `MK_LABELS` | 5 |
| 337 | `GUNFEEL` | 4 |
| 344 | `TRACER_STYLE` | 6 |
| 354 | `ADS_RAMPA_S` | 3 |
| 358 | `aberturaCone` | 13 |
| 371 | `anguloDeDisparo` | 4 |
| 375 | `coneDoDisparo` | 16 |
| 392 | `D2R` | 4 |
| 396 | `DMG_FALLOFF` | 5 |
| 401 | `HS_MUL` | 3 |
| 404 | `BALL_CLASS` | 15 |
| 419 | `STATIC_CLASS` | 75 |
| 495 | `VM_KNOB` | 19 |
| 514 | `vmAdsRot` | 4 |
| 519 | `vmFovForAspect` | 24 |
| 543 | `VM_OFF` | 22 |
| 565 | `vmOffY` | 35 |
| 600 | `VMP` | 6 |
| 606 | `BOT_SKILLS` | 11 |
| 618 | `diffKey` | 4 |
| 623 | `rollBotSkill` | 7 |
| 630 | `botTier` | 4 |
| 634 | `_cyclePool` | 5 |
| 639 | `_rosterPool` | 16 |
| 656 | `pickMatchRoster` | 16 |
| 672 | `BOT_WEAPON_POOL` | 5 |
| 677 | `pickMatchWeapons` | 9 |
| 689 | `constructor()` | 628 |
| 1317 | `_dom()` | 46 |
| 1363 | `_buildEnv()` | 54 |
| 1417 | `_buildViewModels()` | 269 |
| 1686 | `_vmFrame` | 141 |
| 1827 | `_vmMontarTardio` | 14 |
| 1841 | `_makePuffTexture()` | 10 |
| 1851 | `_makeBloodTex()` | 19 |
| 1870 | `_makeBloodPoolTex()` | 21 |
| 1891 | `_bloodDecal()` | 16 |
| 1907 | `_makeBloodFx()` | 20 |
| 1927 | `_bloodSpatter()` | 18 |
| 1945 | `_bloodPoolAt()` | 6 |
| 1951 | `_updateBlood()` | 14 |
| 1965 | `_makeFlashTex()` | 21 |
| 1986 | `_makeFlashSoftTex()` | 8 |
| 1994 | `_makeFlashCoreTex()` | 10 |
| 2004 | `_input()` | 6 |
| 2010 | `_kd` | 49 |
| 2059 | `_ku` | 5 |
| 2064 | `_md` | 40 |
| 2104 | `_mu` | 7 |
| 2111 | `_mm` | 20 |
| 2131 | `_wh` | 17 |
| 2148 | `_cc` | 1 |
| 2149 | `_blur` | 1 |
| 2150 | `_plc` | 19 |
| 2169 | `_touchControls()` | 135 |
| 2304 | `_aimAssist()` | 28 |
| 2332 | `_requestLock()` | 27 |
| 2359 | `_travaAtalhos()` | 4 |
| 2363 | `_soltaAtalhos()` | 5 |
| 2368 | `espectando()` | 2 |
| 2370 | `_acceptInput()` | 7 |
| 2377 | `travarEntrada()` | 17 |
| 2394 | `_chatSeguraPausa()` | 5 |
| 2399 | `_pauseBackdrop()` | 7 |
| 2406 | `_radioShow()` | 6 |
| 2412 | `_radioUi()` | 8 |
| 2420 | `_radioPick()` | 20 |
| 2440 | `_abilityNotice()` | 10 |
| 2450 | `_resetSliceAbilities()` | 9 |
| 2459 | `_stackTrace()` | 28 |
| 2487 | `_updateMotocaCharge()` | 10 |
| 2497 | `_recordRoutePoint()` | 11 |
| 2508 | `_routePing()` | 23 |
| 2531 | `_tickRoutePings()` | 12 |
| 2543 | `_objectiveInteractionMultiplier()` | 14 |
| 2557 | `start()` | 5 |
| 2562 | `_startAnnouncerLab()` | 9 |
| 2571 | `_startRound()` | 38 |
| 2609 | `_resetPositions()` | 255 |
| 2864 | `_checkCtfAlvo()` | 13 |
| 2877 | `_checkPace()` | 13 |
| 2890 | `_endRound()` | 34 |
| 2924 | `_roundWinnerVoice()` | 12 |
| 2936 | `_fimDaPartida()` | 7 |
| 2943 | `_endMatch()` | 61 |
| 3004 | `_ensureDolly()` | 41 |
| 3045 | `_tickDolly()` | 23 |
| 3068 | `setPaused()` | 23 |
| 3091 | `_now()` | 3 |
| 3094 | `pauseArmed()` | 1 |
| 3095 | `_syncPauseArm()` | 7 |
| 3102 | `resume()` | 4 |
| 3106 | `applySettings()` | 10 |
| 3116 | `_applyQuality()` | 13 |
| 3129 | `onResize()` | 17 |
| 3146 | `_switchTeam()` | 66 |
| 3212 | `_applyVmVisibility()` | 34 |
| 3246 | `_ensureVmPrecisionQa()` | 79 |
| 3325 | `_syncVmPresentation()` | 19 |
| 3344 | `_vmlabEnsure()` | 14 |
| 3358 | `_vmlabFrame()` | 28 |
| 3386 | `_tuneGet()` | 15 |
| 3401 | `_tune()` | 23 |
| 3424 | `_fxSet()` | 2 |
| 3426 | `_qaCicloArma()` | 8 |
| 3434 | `_cycleWeapon()` | 8 |
| 3442 | `_switchWeapon()` | 39 |
| 3481 | `_deploySfx()` | 7 |
| 3488 | `_scope()` | 17 |
| 3505 | `_zoomFov()` | 5 |
| 3510 | `_reloading()` | 1 |
| 3511 | `_startReload()` | 25 |
| 3536 | `_reloadLayers()` | 18 |
| 3554 | `_installRecoil()` | 33 |
| 3587 | `_shotRecoil()` | 13 |
| 3600 | `_tryShoot()` | 81 |
| 3681 | `_tryKnifeAttack()` | 14 |
| 3695 | `_meleeHit()` | 16 |
| 3711 | `_meleeRange()` | 5 |
| 3716 | `_botMelee()` | 28 |
| 3744 | `_shotDamage()` | 11 |
| 3755 | `_fireHitscan()` | 60 |
| 3815 | `_targetFromHit()` | 9 |
| 3824 | `_penetrationExit()` | 20 |
| 3844 | `_surfaceOf()` | 27 |
| 3871 | `_armoredTarget()` | 3 |
| 3874 | `_fleshImpact()` | 38 |
| 3912 | `_fxVoice()` | 9 |
| 3921 | `_impactSfx()` | 17 |
| 3938 | `_tintFx()` | 16 |
| 3954 | `_damage()` | 42 |
| 3996 | `_playerHurtFx()` | 6 |
| 4002 | `_kill()` | 53 |
| 4055 | `_checkArenaWin()` | 30 |
| 4085 | `_dmgArc()` | 79 |
| 4164 | `_mkBanner()` | 9 |
| 4173 | `_updateKillSequenceHud()` | 12 |
| 4185 | `_resetKillSequence()` | 5 |
| 4190 | `_playerKillFeedback()` | 18 |
| 4208 | `_acertoPrevisto()` | 5 |
| 4213 | `_hitmarker()` | 15 |
| 4228 | `_dmgNumber()` | 20 |
| 4248 | `_feed()` | 19 |
| 4267 | `_skullIcon()` | 6 |
| 4273 | `_killfeedWeaponIcon()` | 9 |
| 4282 | `_wpnIcon()` | 64 |
| 4346 | `_tracer()` | 26 |
| 4372 | `_puff()` | 39 |
| 4411 | `_holeDecalMat()` | 8 |
| 4419 | `_flash()` | 61 |
| 4480 | `_vmTetoTela()` | 10 |
| 4490 | `_muzzleWorld()` | 30 |
| 4520 | `_aimOrigin()` | 5 |
| 4525 | `_updateDoors()` | 10 |
| 4535 | `_updateFx()` | 57 |
| 4592 | `_ejectCasing()` | 17 |
| 4609 | `_makeCtfFlagTex()` | 23 |
| 4632 | `_paintFlagSymbol()` | 9 |
| 4641 | `_flagTexFor()` | 26 |
| 4667 | `_legadoSimbolo()` | 8 |
| 4675 | `_loadCtfSymbols()` | 22 |
| 4697 | `_makeCtfZoneTex()` | 31 |
| 4728 | `_makeSmokeTex()` | 10 |
| 4738 | `_updateSmokeHud()` | 4 |
| 4742 | `_grenadeSpatial()` | 14 |
| 4756 | `_spawnGrenade()` | 19 |
| 4775 | `_throwNade()` | 13 |
| 4788 | `_throwSmoke()` | 1 |
| 4789 | `_throwFrag()` | 4 |
| 4793 | `_explodeFrag()` | 40 |
| 4833 | `_corDaFumaca()` | 16 |
| 4849 | `_popSmoke()` | 23 |
| 4872 | `_updateGrenades()` | 35 |
| 4907 | `_teamColor()` | 15 |
| 4922 | `_teamInk()` | 7 |
| 4929 | `_factionOf()` | 1 |
| 4930 | `_voiceKey()` | 1 |
| 4931 | `_teamName()` | 1 |
| 4932 | `_teamTag()` | 6 |
| 4938 | `_plaqueta()` | 13 |
| 4951 | `_mirror()` | 2 |
| 4953 | `_defNoLado()` | 3 |
| 4956 | `_botSeparation()` | 61 |
| 5017 | `_initCTF()` | 86 |
| 5103 | `_updateCTF()` | 61 |
| 5164 | `_ctfWin()` | 24 |
| 5188 | `_freeYaw()` | 25 |
| 5213 | `_pullString()` | 23 |
| 5236 | `_walkReach()` | 32 |
| 5268 | `_wpComp()` | 16 |
| 5284 | `_findPathLocal()` | 22 |
| 5306 | `_botCtf()` | 137 |
| 5443 | `_hideCtfHud()` | 6 |
| 5449 | `_updateCtfHud()` | 76 |
| 5525 | `_collide()` | 23 |
| 5548 | `_collideRot()` | 22 |
| 5570 | `_mantleAlcance()` | 50 |
| 5620 | `_mantleAlcancavel()` | 12 |
| 5632 | `_mantleTarget()` | 35 |
| 5667 | `_freeSpot()` | 30 |
| 5697 | `_retaAndavel()` | 20 |
| 5717 | `_walkDepth()` | 16 |
| 5733 | `_noteHit()` | 17 |
| 5750 | `_deathFeedback()` | 45 |
| 5795 | `_toggleCamView()` | 6 |
| 5801 | `setCamView()` | 16 |
| 5817 | `_syncCamViewVis()` | 8 |
| 5825 | `_ensurePlayerTP()` | 25 |
| 5850 | `_updatePlayerTP()` | 42 |
| 5892 | `_updateCrosshairParallax()` | 47 |
| 5939 | `_tpDeath()` | 18 |
| 5957 | `_tpRevive()` | 13 |
| 5970 | `_moveEntity()` | 101 |
| 6071 | `_updatePlayer()` | 304 |
| 6375 | `_footstepSurface()` | 13 |
| 6388 | `_updatePickups()` | 158 |
| 6546 | `_wpnMode()` | 5 |
| 6551 | `_botWeapon()` | 10 |
| 6561 | `_municaoInfinita()` | 1 |
| 6562 | `_pickupAllowed()` | 9 |
| 6571 | `_grabNearPickup()` | 10 |
| 6581 | `_grabPickup()` | 35 |
| 6616 | `_assentarNoChao()` | 10 |
| 6626 | `refreshPickupModels()` | 24 |
| 6650 | `_dropWeapon()` | 20 |
| 6670 | `_sumirDrop()` | 36 |
| 6706 | `_spawnY()` | 3 |
| 6709 | `_spawnYaw()` | 5 |
| 6714 | `_pickSpawn()` | 23 |
| 6737 | `_respawnPlayer()` | 34 |
| 6771 | `_losClear()` | 18 |
| 6789 | `_botCall()` | 41 |
| 6830 | `_teamMarkTex()` | 23 |
| 6853 | `_makeTeamMark()` | 16 |
| 6869 | `_syncRemoteWeapon()` | 23 |
| 6892 | `_updateTeamMark()` | 7 |
| 6899 | `_botEye()` | 1 |
| 6900 | `_enemyOf()` | 8 |
| 6908 | `_duelToken()` | 22 |
| 6930 | `_respawnEntity()` | 21 |
| 6951 | `_updateBot()` | 822 |
| 7773 | `_flushTraining()` | 13 |
| 7786 | `_updateBotNN()` | 73 |
| 7859 | `_botShootNN()` | 46 |
| 7905 | `_radarFoot()` | 38 |
| 7943 | `_updateRadar()` | 64 |
| 8007 | `_banner()` | 26 |
| 8033 | `_resultadoDaRodada()` | 4 |
| 8037 | `_showScoreboard()` | 49 |
| 8086 | `_updateWeaponHud()` | 35 |
| 8121 | `_updateHud()` | 88 |
| 8209 | `update()` | 90 |
| 8299 | `dispose()` | 51 |

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
