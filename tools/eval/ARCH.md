# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.60 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8351 | 329 |
| `public/js/main.js` | 4320 | 329 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1104 | 42 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3310 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6952 | `_updateBot()` | ⚠️ candidato a extração |
| 626 | 690 | `constructor()` | 🔴 append-only |
| 304 | 6054 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1416 | `_buildViewModels()` |  |
| 255 | 2603 | `_resetPositions()` |  |
| 158 | 6371 | `_updatePickups()` |  |
| 137 | 5300 | `_botCtf()` |  |
| 135 | 2163 | `_touchControls()` |  |
| 101 | 5953 | `_moveEntity()` |  |
| 90 | 8210 | `update()` | 🔴 append-only |
| 88 | 8122 | `_updateHud()` |  |
| 86 | 5011 | `_initCTF()` |  |
| 81 | 3594 | `_tryShoot()` |  |
| 79 | 3240 | `_ensureVmPrecisionQa()` |  |
| 79 | 4079 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `338–341` `420–514` `544–565` `1416–1825` `3206–3239` `3436–3529` `3548–3674` `3689–3704` `3749–3808` `4340–4365` `4413–4513` `4586–4602` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `177–180` `231–231` `257–268` `607–618` `3948–4048` `4950–5010` `5182–5436` `5519–5541` `6054–6357` `6754–6771` `6900–6930` `6952–7773` | — |
| **MAPAS / MUNDO** | `1362–1415` `2603–2857` `5011–5157` `6371–6528` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1840–1849` `1964–2002` `3110–3122` `4366–4404` `4529–4585` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1316–1361` `3062–3084` `3100–3109` `3123–3139` `4079–4157` `4207–4260` `4276–4339` `7944–8007` `8038–8086` `8122–8209` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8210–8299 · `_dom()` 1316–1361 · `constructor()` 690–1315

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3875 de 8351 linhas (46%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 48 | `ANNOUNCER_LAB` | 4 |
| 52 | `VMLAB` | 3 |
| 57 | `VM_QA_CICLO` | 3 |
| 61 | `VM_QA_ADS` | 8 |
| 69 | `VM_MAT_LEGACY` | 4 |
| 75 | `DROP_TTL` | 8 |
| 83 | `ROUNDS_MAX` | 27 |
| 113 | `CTF_CLOCK_SHOW` | 4 |
| 117 | `KILLS_PER_PLAYER` | 7 |
| 124 | `PACE` | 33 |
| 157 | `PAUSE_ARM_MS` | 3 |
| 160 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 170 | `confirmGate` | 7 |
| 181 | `BOT_AIM_PITCH` | 4 |
| 185 | `BOT_DMG_PLAYER` | 21 |
| 206 | `BOT_FAIR` | 5 |
| 211 | `BOT_MOVE2` | 15 |
| 235 | `BOT_FOCUS_MIN` | 22 |
| 261 | `BOT_TOKEN_REST` | 7 |
| 269 | `MOVE_MUL` | 6 |
| 276 | `MOVE2` | 4 |
| 280 | `STEP_H` | 3 |
| 287 | `MANTLE_APOIO` | 4 |
| 291 | `MANTLE_GRID` | 5 |
| 296 | `RACK_OLD` | 4 |
| 300 | `RACK_RETA` | 25 |
| 327 | `RADIO` | 5 |
| 333 | `MK_LABELS` | 5 |
| 338 | `GUNFEEL` | 4 |
| 345 | `TRACER_STYLE` | 6 |
| 355 | `ADS_RAMPA_S` | 3 |
| 359 | `aberturaCone` | 13 |
| 372 | `anguloDeDisparo` | 4 |
| 376 | `coneDoDisparo` | 16 |
| 393 | `D2R` | 4 |
| 397 | `DMG_FALLOFF` | 5 |
| 402 | `HS_MUL` | 3 |
| 405 | `BALL_CLASS` | 15 |
| 420 | `STATIC_CLASS` | 75 |
| 496 | `VM_KNOB` | 19 |
| 515 | `vmAdsRot` | 4 |
| 520 | `vmFovForAspect` | 24 |
| 544 | `VM_OFF` | 22 |
| 566 | `vmOffY` | 35 |
| 601 | `VMP` | 6 |
| 607 | `BOT_SKILLS` | 11 |
| 619 | `diffKey` | 4 |
| 624 | `rollBotSkill` | 7 |
| 631 | `botTier` | 4 |
| 635 | `_cyclePool` | 5 |
| 640 | `_rosterPool` | 16 |
| 657 | `pickMatchRoster` | 16 |
| 673 | `BOT_WEAPON_POOL` | 5 |
| 678 | `pickMatchWeapons` | 9 |
| 690 | `constructor()` | 626 |
| 1316 | `_dom()` | 46 |
| 1362 | `_buildEnv()` | 54 |
| 1416 | `_buildViewModels()` | 269 |
| 1685 | `_vmFrame` | 141 |
| 1826 | `_vmMontarTardio` | 14 |
| 1840 | `_makePuffTexture()` | 10 |
| 1850 | `_makeBloodTex()` | 19 |
| 1869 | `_makeBloodPoolTex()` | 21 |
| 1890 | `_bloodDecal()` | 16 |
| 1906 | `_makeBloodFx()` | 20 |
| 1926 | `_bloodSpatter()` | 18 |
| 1944 | `_bloodPoolAt()` | 6 |
| 1950 | `_updateBlood()` | 14 |
| 1964 | `_makeFlashTex()` | 21 |
| 1985 | `_makeFlashSoftTex()` | 8 |
| 1993 | `_makeFlashCoreTex()` | 10 |
| 2003 | `_input()` | 6 |
| 2009 | `_kd` | 49 |
| 2058 | `_ku` | 5 |
| 2063 | `_md` | 40 |
| 2103 | `_mu` | 7 |
| 2110 | `_mm` | 15 |
| 2125 | `_wh` | 17 |
| 2142 | `_cc` | 1 |
| 2143 | `_blur` | 1 |
| 2144 | `_plc` | 19 |
| 2163 | `_touchControls()` | 135 |
| 2298 | `_aimAssist()` | 28 |
| 2326 | `_requestLock()` | 27 |
| 2353 | `_travaAtalhos()` | 4 |
| 2357 | `_soltaAtalhos()` | 5 |
| 2362 | `espectando()` | 2 |
| 2364 | `_acceptInput()` | 7 |
| 2371 | `travarEntrada()` | 17 |
| 2388 | `_chatSeguraPausa()` | 5 |
| 2393 | `_pauseBackdrop()` | 7 |
| 2400 | `_radioShow()` | 6 |
| 2406 | `_radioUi()` | 8 |
| 2414 | `_radioPick()` | 20 |
| 2434 | `_abilityNotice()` | 10 |
| 2444 | `_resetSliceAbilities()` | 9 |
| 2453 | `_stackTrace()` | 28 |
| 2481 | `_updateMotocaCharge()` | 10 |
| 2491 | `_recordRoutePoint()` | 11 |
| 2502 | `_routePing()` | 23 |
| 2525 | `_tickRoutePings()` | 12 |
| 2537 | `_objectiveInteractionMultiplier()` | 14 |
| 2551 | `start()` | 5 |
| 2556 | `_startAnnouncerLab()` | 9 |
| 2565 | `_startRound()` | 38 |
| 2603 | `_resetPositions()` | 255 |
| 2858 | `_checkCtfAlvo()` | 13 |
| 2871 | `_checkPace()` | 13 |
| 2884 | `_endRound()` | 34 |
| 2918 | `_roundWinnerVoice()` | 12 |
| 2930 | `_fimDaPartida()` | 7 |
| 2937 | `_endMatch()` | 61 |
| 2998 | `_ensureDolly()` | 41 |
| 3039 | `_tickDolly()` | 23 |
| 3062 | `setPaused()` | 23 |
| 3085 | `_now()` | 3 |
| 3088 | `pauseArmed()` | 1 |
| 3089 | `_syncPauseArm()` | 7 |
| 3096 | `resume()` | 4 |
| 3100 | `applySettings()` | 10 |
| 3110 | `_applyQuality()` | 13 |
| 3123 | `onResize()` | 17 |
| 3140 | `_switchTeam()` | 66 |
| 3206 | `_applyVmVisibility()` | 34 |
| 3240 | `_ensureVmPrecisionQa()` | 79 |
| 3319 | `_syncVmPresentation()` | 19 |
| 3338 | `_vmlabEnsure()` | 14 |
| 3352 | `_vmlabFrame()` | 28 |
| 3380 | `_tuneGet()` | 15 |
| 3395 | `_tune()` | 23 |
| 3418 | `_fxSet()` | 2 |
| 3420 | `_qaCicloArma()` | 8 |
| 3428 | `_cycleWeapon()` | 8 |
| 3436 | `_switchWeapon()` | 39 |
| 3475 | `_deploySfx()` | 7 |
| 3482 | `_scope()` | 17 |
| 3499 | `_zoomFov()` | 5 |
| 3504 | `_reloading()` | 1 |
| 3505 | `_startReload()` | 25 |
| 3530 | `_reloadLayers()` | 18 |
| 3548 | `_installRecoil()` | 33 |
| 3581 | `_shotRecoil()` | 13 |
| 3594 | `_tryShoot()` | 81 |
| 3675 | `_tryKnifeAttack()` | 14 |
| 3689 | `_meleeHit()` | 16 |
| 3705 | `_meleeRange()` | 5 |
| 3710 | `_botMelee()` | 28 |
| 3738 | `_shotDamage()` | 11 |
| 3749 | `_fireHitscan()` | 60 |
| 3809 | `_targetFromHit()` | 9 |
| 3818 | `_penetrationExit()` | 20 |
| 3838 | `_surfaceOf()` | 27 |
| 3865 | `_armoredTarget()` | 3 |
| 3868 | `_fleshImpact()` | 38 |
| 3906 | `_fxVoice()` | 9 |
| 3915 | `_impactSfx()` | 17 |
| 3932 | `_tintFx()` | 16 |
| 3948 | `_damage()` | 42 |
| 3990 | `_playerHurtFx()` | 6 |
| 3996 | `_kill()` | 53 |
| 4049 | `_checkArenaWin()` | 30 |
| 4079 | `_dmgArc()` | 79 |
| 4158 | `_mkBanner()` | 9 |
| 4167 | `_updateKillSequenceHud()` | 12 |
| 4179 | `_resetKillSequence()` | 5 |
| 4184 | `_playerKillFeedback()` | 18 |
| 4202 | `_acertoPrevisto()` | 5 |
| 4207 | `_hitmarker()` | 15 |
| 4222 | `_dmgNumber()` | 20 |
| 4242 | `_feed()` | 19 |
| 4261 | `_skullIcon()` | 6 |
| 4267 | `_killfeedWeaponIcon()` | 9 |
| 4276 | `_wpnIcon()` | 64 |
| 4340 | `_tracer()` | 26 |
| 4366 | `_puff()` | 39 |
| 4405 | `_holeDecalMat()` | 8 |
| 4413 | `_flash()` | 61 |
| 4474 | `_vmTetoTela()` | 10 |
| 4484 | `_muzzleWorld()` | 30 |
| 4514 | `_aimOrigin()` | 5 |
| 4519 | `_updateDoors()` | 10 |
| 4529 | `_updateFx()` | 57 |
| 4586 | `_ejectCasing()` | 17 |
| 4603 | `_makeCtfFlagTex()` | 23 |
| 4626 | `_paintFlagSymbol()` | 9 |
| 4635 | `_flagTexFor()` | 26 |
| 4661 | `_legadoSimbolo()` | 8 |
| 4669 | `_loadCtfSymbols()` | 22 |
| 4691 | `_makeCtfZoneTex()` | 31 |
| 4722 | `_makeSmokeTex()` | 10 |
| 4732 | `_updateSmokeHud()` | 4 |
| 4736 | `_grenadeSpatial()` | 14 |
| 4750 | `_spawnGrenade()` | 19 |
| 4769 | `_throwNade()` | 13 |
| 4782 | `_throwSmoke()` | 1 |
| 4783 | `_throwFrag()` | 4 |
| 4787 | `_explodeFrag()` | 40 |
| 4827 | `_corDaFumaca()` | 16 |
| 4843 | `_popSmoke()` | 23 |
| 4866 | `_updateGrenades()` | 35 |
| 4901 | `_teamColor()` | 15 |
| 4916 | `_teamInk()` | 7 |
| 4923 | `_factionOf()` | 1 |
| 4924 | `_voiceKey()` | 1 |
| 4925 | `_teamName()` | 1 |
| 4926 | `_teamTag()` | 6 |
| 4932 | `_plaqueta()` | 13 |
| 4945 | `_mirror()` | 2 |
| 4947 | `_defNoLado()` | 3 |
| 4950 | `_botSeparation()` | 61 |
| 5011 | `_initCTF()` | 86 |
| 5097 | `_updateCTF()` | 61 |
| 5158 | `_ctfWin()` | 24 |
| 5182 | `_freeYaw()` | 25 |
| 5207 | `_pullString()` | 23 |
| 5230 | `_walkReach()` | 32 |
| 5262 | `_wpComp()` | 16 |
| 5278 | `_findPathLocal()` | 22 |
| 5300 | `_botCtf()` | 137 |
| 5437 | `_hideCtfHud()` | 6 |
| 5443 | `_updateCtfHud()` | 76 |
| 5519 | `_collide()` | 23 |
| 5542 | `_collideRot()` | 22 |
| 5564 | `_mantleAlcance()` | 50 |
| 5614 | `_mantleAlcancavel()` | 12 |
| 5626 | `_mantleTarget()` | 35 |
| 5661 | `_freeSpot()` | 30 |
| 5691 | `_retaAndavel()` | 20 |
| 5711 | `_walkDepth()` | 16 |
| 5727 | `_noteHit()` | 17 |
| 5744 | `_deathFeedback()` | 45 |
| 5789 | `_toggleCamView()` | 6 |
| 5795 | `setCamView()` | 14 |
| 5809 | `_syncCamViewVis()` | 8 |
| 5817 | `_ensurePlayerTP()` | 26 |
| 5843 | `_updatePlayerTP()` | 39 |
| 5882 | `_updateCrosshairParallax()` | 40 |
| 5922 | `_tpDeath()` | 18 |
| 5940 | `_tpRevive()` | 13 |
| 5953 | `_moveEntity()` | 101 |
| 6054 | `_updatePlayer()` | 304 |
| 6358 | `_footstepSurface()` | 13 |
| 6371 | `_updatePickups()` | 158 |
| 6529 | `_wpnMode()` | 5 |
| 6534 | `_botWeapon()` | 10 |
| 6544 | `_municaoInfinita()` | 1 |
| 6545 | `_pickupAllowed()` | 9 |
| 6554 | `_grabNearPickup()` | 10 |
| 6564 | `_grabPickup()` | 35 |
| 6599 | `_assentarNoChao()` | 10 |
| 6609 | `refreshPickupModels()` | 24 |
| 6633 | `_dropWeapon()` | 20 |
| 6653 | `_sumirDrop()` | 36 |
| 6689 | `_spawnY()` | 3 |
| 6692 | `_spawnYaw()` | 5 |
| 6697 | `_pickSpawn()` | 23 |
| 6720 | `_respawnPlayer()` | 34 |
| 6754 | `_losClear()` | 18 |
| 6772 | `_botCall()` | 41 |
| 6813 | `_teamMarkTex()` | 23 |
| 6836 | `_makeTeamMark()` | 16 |
| 6852 | `_trocarPersonagem()` | 18 |
| 6870 | `_syncRemoteWeapon()` | 23 |
| 6893 | `_updateTeamMark()` | 7 |
| 6900 | `_botEye()` | 1 |
| 6901 | `_enemyOf()` | 8 |
| 6909 | `_duelToken()` | 22 |
| 6931 | `_respawnEntity()` | 21 |
| 6952 | `_updateBot()` | 822 |
| 7774 | `_flushTraining()` | 13 |
| 7787 | `_updateBotNN()` | 73 |
| 7860 | `_botShootNN()` | 46 |
| 7906 | `_radarFoot()` | 38 |
| 7944 | `_updateRadar()` | 64 |
| 8008 | `_banner()` | 26 |
| 8034 | `_resultadoDaRodada()` | 4 |
| 8038 | `_showScoreboard()` | 49 |
| 8087 | `_updateWeaponHud()` | 35 |
| 8122 | `_updateHud()` | 88 |
| 8210 | `update()` | 90 |
| 8300 | `dispose()` | 51 |

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
