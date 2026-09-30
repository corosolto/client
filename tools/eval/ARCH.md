# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.19 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8237 | 319 |
| `public/js/main.js` | 4207 | 323 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3308 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6839 | `_updateBot()` | ⚠️ candidato a extração |
| 622 | 672 | `constructor()` | 🔴 append-only |
| 303 | 5961 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1394 | `_buildViewModels()` |  |
| 255 | 2522 | `_resetPositions()` |  |
| 158 | 6277 | `_updatePickups()` |  |
| 137 | 5210 | `_botCtf()` |  |
| 132 | 2107 | `_touchControls()` |  |
| 99 | 5862 | `_moveEntity()` |  |
| 90 | 8097 | `update()` | 🔴 append-only |
| 89 | 3498 | `_tryShoot()` |  |
| 88 | 8009 | `_updateHud()` |  |
| 86 | 4921 | `_initCTF()` |  |
| 79 | 3155 | `_ensureVmPrecisionQa()` |  |
| 79 | 3991 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `331–334` `409–503` `533–554` `1394–1803` `3121–3154` `3342–3433` `3452–3586` `3601–3616` `3661–3720` `4252–4277` `4325–4425` `4498–4514` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `170–173` `224–224` `250–261` `596–607` `3860–3960` `4860–4920` `5092–5346` `5429–5451` `5961–6263` `6660–6677` `6787–6817` `6839–7660` | — |
| **MAPAS / MUNDO** | `1340–1393` `2522–2776` `4921–5067` `6277–6434` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1818–1827` `1942–1980` `3029–3041` `4278–4316` `4441–4497` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1294–1339` `2981–3003` `3019–3028` `3042–3058` `3991–4069` `4119–4172` `4188–4251` `7831–7894` `7925–7973` `8009–8096` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8097–8186 · `_dom()` 1294–1339 · `constructor()` 672–1293

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3880 de 8237 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 47 | `ANNOUNCER_LAB` | 4 |
| 51 | `VMLAB` | 3 |
| 57 | `VM_QA_ADS` | 8 |
| 65 | `VM_MAT_LEGACY` | 4 |
| 71 | `DROP_TTL` | 8 |
| 79 | `ROUNDS_MAX` | 27 |
| 109 | `CTF_CLOCK_SHOW` | 4 |
| 113 | `KILLS_PER_PLAYER` | 7 |
| 120 | `PACE` | 33 |
| 153 | `PAUSE_ARM_MS` | 9 |
| 163 | `confirmGate` | 7 |
| 174 | `BOT_AIM_PITCH` | 4 |
| 178 | `BOT_DMG_PLAYER` | 21 |
| 199 | `BOT_FAIR` | 5 |
| 204 | `BOT_MOVE2` | 15 |
| 228 | `BOT_FOCUS_MIN` | 22 |
| 254 | `BOT_TOKEN_REST` | 7 |
| 262 | `MOVE_MUL` | 6 |
| 269 | `MOVE2` | 4 |
| 273 | `STEP_H` | 3 |
| 280 | `MANTLE_APOIO` | 4 |
| 284 | `MANTLE_GRID` | 5 |
| 289 | `RACK_OLD` | 4 |
| 293 | `RACK_RETA` | 25 |
| 320 | `RADIO` | 5 |
| 326 | `MK_LABELS` | 5 |
| 331 | `GUNFEEL` | 4 |
| 338 | `TRACER_STYLE` | 6 |
| 349 | `aberturaCone` | 12 |
| 361 | `anguloDeDisparo` | 4 |
| 365 | `coneDoDisparo` | 16 |
| 382 | `D2R` | 4 |
| 386 | `DMG_FALLOFF` | 5 |
| 391 | `HS_MUL` | 3 |
| 394 | `BALL_CLASS` | 15 |
| 409 | `STATIC_CLASS` | 75 |
| 485 | `VM_KNOB` | 19 |
| 504 | `vmAdsRot` | 4 |
| 509 | `vmFovForAspect` | 24 |
| 533 | `VM_OFF` | 22 |
| 555 | `vmOffY` | 35 |
| 590 | `VMP` | 6 |
| 596 | `BOT_SKILLS` | 11 |
| 608 | `diffKey` | 4 |
| 613 | `rollBotSkill` | 7 |
| 620 | `botTier` | 4 |
| 624 | `_cyclePool` | 4 |
| 628 | `_rosterPool` | 15 |
| 643 | `pickMatchRoster` | 12 |
| 655 | `BOT_WEAPON_POOL` | 5 |
| 660 | `pickMatchWeapons` | 9 |
| 672 | `constructor()` | 622 |
| 1294 | `_dom()` | 46 |
| 1340 | `_buildEnv()` | 54 |
| 1394 | `_buildViewModels()` | 269 |
| 1663 | `_vmFrame` | 141 |
| 1804 | `_vmMontarTardio` | 14 |
| 1818 | `_makePuffTexture()` | 10 |
| 1828 | `_makeBloodTex()` | 19 |
| 1847 | `_makeBloodPoolTex()` | 21 |
| 1868 | `_bloodDecal()` | 16 |
| 1884 | `_makeBloodFx()` | 20 |
| 1904 | `_bloodSpatter()` | 18 |
| 1922 | `_bloodPoolAt()` | 6 |
| 1928 | `_updateBlood()` | 14 |
| 1942 | `_makeFlashTex()` | 21 |
| 1963 | `_makeFlashSoftTex()` | 8 |
| 1971 | `_makeFlashCoreTex()` | 10 |
| 1981 | `_input()` | 2 |
| 1983 | `_kd` | 41 |
| 2024 | `_ku` | 4 |
| 2028 | `_md` | 38 |
| 2066 | `_mu` | 7 |
| 2073 | `_mm` | 15 |
| 2088 | `_cc` | 1 |
| 2089 | `_blur` | 1 |
| 2090 | `_plc` | 17 |
| 2107 | `_touchControls()` | 132 |
| 2239 | `_aimAssist()` | 28 |
| 2267 | `_requestLock()` | 27 |
| 2294 | `_travaAtalhos()` | 4 |
| 2298 | `_soltaAtalhos()` | 5 |
| 2303 | `espectando()` | 2 |
| 2305 | `_acceptInput()` | 8 |
| 2313 | `_pauseBackdrop()` | 7 |
| 2320 | `_radioShow()` | 6 |
| 2326 | `_radioUi()` | 8 |
| 2334 | `_radioPick()` | 19 |
| 2353 | `_abilityNotice()` | 10 |
| 2363 | `_resetSliceAbilities()` | 9 |
| 2372 | `_stackTrace()` | 28 |
| 2400 | `_updateMotocaCharge()` | 10 |
| 2410 | `_recordRoutePoint()` | 11 |
| 2421 | `_routePing()` | 23 |
| 2444 | `_tickRoutePings()` | 12 |
| 2456 | `_objectiveInteractionMultiplier()` | 14 |
| 2470 | `start()` | 5 |
| 2475 | `_startAnnouncerLab()` | 9 |
| 2484 | `_startRound()` | 38 |
| 2522 | `_resetPositions()` | 255 |
| 2777 | `_checkCtfAlvo()` | 13 |
| 2790 | `_checkPace()` | 13 |
| 2803 | `_endRound()` | 34 |
| 2837 | `_roundWinnerVoice()` | 12 |
| 2849 | `_fimDaPartida()` | 7 |
| 2856 | `_endMatch()` | 61 |
| 2917 | `_ensureDolly()` | 41 |
| 2958 | `_tickDolly()` | 23 |
| 2981 | `setPaused()` | 23 |
| 3004 | `_now()` | 3 |
| 3007 | `pauseArmed()` | 1 |
| 3008 | `_syncPauseArm()` | 7 |
| 3015 | `resume()` | 4 |
| 3019 | `applySettings()` | 10 |
| 3029 | `_applyQuality()` | 13 |
| 3042 | `onResize()` | 17 |
| 3059 | `_switchTeam()` | 62 |
| 3121 | `_applyVmVisibility()` | 34 |
| 3155 | `_ensureVmPrecisionQa()` | 79 |
| 3234 | `_syncVmPresentation()` | 19 |
| 3253 | `_vmlabEnsure()` | 14 |
| 3267 | `_vmlabFrame()` | 28 |
| 3295 | `_tuneGet()` | 15 |
| 3310 | `_tune()` | 23 |
| 3333 | `_fxSet()` | 2 |
| 3335 | `_qaCicloArma()` | 7 |
| 3342 | `_switchWeapon()` | 39 |
| 3381 | `_deploySfx()` | 7 |
| 3388 | `_scope()` | 17 |
| 3405 | `_zoomFov()` | 5 |
| 3410 | `_reloading()` | 1 |
| 3411 | `_startReload()` | 23 |
| 3434 | `_reloadLayers()` | 18 |
| 3452 | `_installRecoil()` | 33 |
| 3485 | `_shotRecoil()` | 13 |
| 3498 | `_tryShoot()` | 89 |
| 3587 | `_tryKnifeAttack()` | 14 |
| 3601 | `_meleeHit()` | 16 |
| 3617 | `_meleeRange()` | 5 |
| 3622 | `_botMelee()` | 28 |
| 3650 | `_shotDamage()` | 11 |
| 3661 | `_fireHitscan()` | 60 |
| 3721 | `_targetFromHit()` | 9 |
| 3730 | `_penetrationExit()` | 20 |
| 3750 | `_surfaceOf()` | 27 |
| 3777 | `_armoredTarget()` | 3 |
| 3780 | `_fleshImpact()` | 38 |
| 3818 | `_fxVoice()` | 9 |
| 3827 | `_impactSfx()` | 17 |
| 3844 | `_tintFx()` | 16 |
| 3860 | `_damage()` | 42 |
| 3902 | `_playerHurtFx()` | 6 |
| 3908 | `_kill()` | 53 |
| 3961 | `_checkArenaWin()` | 30 |
| 3991 | `_dmgArc()` | 79 |
| 4070 | `_mkBanner()` | 9 |
| 4079 | `_updateKillSequenceHud()` | 12 |
| 4091 | `_resetKillSequence()` | 5 |
| 4096 | `_playerKillFeedback()` | 18 |
| 4114 | `_acertoPrevisto()` | 5 |
| 4119 | `_hitmarker()` | 15 |
| 4134 | `_dmgNumber()` | 20 |
| 4154 | `_feed()` | 19 |
| 4173 | `_skullIcon()` | 6 |
| 4179 | `_killfeedWeaponIcon()` | 9 |
| 4188 | `_wpnIcon()` | 64 |
| 4252 | `_tracer()` | 26 |
| 4278 | `_puff()` | 39 |
| 4317 | `_holeDecalMat()` | 8 |
| 4325 | `_flash()` | 61 |
| 4386 | `_vmTetoTela()` | 10 |
| 4396 | `_muzzleWorld()` | 30 |
| 4426 | `_aimOrigin()` | 5 |
| 4431 | `_updateDoors()` | 10 |
| 4441 | `_updateFx()` | 57 |
| 4498 | `_ejectCasing()` | 17 |
| 4515 | `_makeCtfFlagTex()` | 23 |
| 4538 | `_paintFlagSymbol()` | 9 |
| 4547 | `_flagTexFor()` | 26 |
| 4573 | `_legadoSimbolo()` | 8 |
| 4581 | `_loadCtfSymbols()` | 22 |
| 4603 | `_makeCtfZoneTex()` | 31 |
| 4634 | `_makeSmokeTex()` | 10 |
| 4644 | `_updateSmokeHud()` | 4 |
| 4648 | `_grenadeSpatial()` | 14 |
| 4662 | `_spawnGrenade()` | 19 |
| 4681 | `_throwNade()` | 13 |
| 4694 | `_throwSmoke()` | 1 |
| 4695 | `_throwFrag()` | 4 |
| 4699 | `_explodeFrag()` | 40 |
| 4739 | `_corDaFumaca()` | 16 |
| 4755 | `_popSmoke()` | 23 |
| 4778 | `_updateGrenades()` | 35 |
| 4813 | `_teamColor()` | 15 |
| 4828 | `_teamInk()` | 7 |
| 4835 | `_factionOf()` | 1 |
| 4836 | `_voiceKey()` | 1 |
| 4837 | `_teamName()` | 1 |
| 4838 | `_teamTag()` | 6 |
| 4844 | `_plaqueta()` | 13 |
| 4857 | `_mirror()` | 3 |
| 4860 | `_botSeparation()` | 61 |
| 4921 | `_initCTF()` | 86 |
| 5007 | `_updateCTF()` | 61 |
| 5068 | `_ctfWin()` | 24 |
| 5092 | `_freeYaw()` | 25 |
| 5117 | `_pullString()` | 23 |
| 5140 | `_walkReach()` | 32 |
| 5172 | `_wpComp()` | 16 |
| 5188 | `_findPathLocal()` | 22 |
| 5210 | `_botCtf()` | 137 |
| 5347 | `_hideCtfHud()` | 6 |
| 5353 | `_updateCtfHud()` | 76 |
| 5429 | `_collide()` | 23 |
| 5452 | `_collideRot()` | 22 |
| 5474 | `_mantleAlcance()` | 50 |
| 5524 | `_mantleAlcancavel()` | 12 |
| 5536 | `_mantleTarget()` | 35 |
| 5571 | `_freeSpot()` | 30 |
| 5601 | `_retaAndavel()` | 20 |
| 5621 | `_walkDepth()` | 16 |
| 5637 | `_noteHit()` | 17 |
| 5654 | `_deathFeedback()` | 45 |
| 5699 | `_toggleCamView()` | 6 |
| 5705 | `setCamView()` | 14 |
| 5719 | `_syncCamViewVis()` | 8 |
| 5727 | `_ensurePlayerTP()` | 25 |
| 5752 | `_updatePlayerTP()` | 39 |
| 5791 | `_updateCrosshairParallax()` | 40 |
| 5831 | `_tpDeath()` | 18 |
| 5849 | `_tpRevive()` | 13 |
| 5862 | `_moveEntity()` | 99 |
| 5961 | `_updatePlayer()` | 303 |
| 6264 | `_footstepSurface()` | 13 |
| 6277 | `_updatePickups()` | 158 |
| 6435 | `_wpnMode()` | 5 |
| 6440 | `_botWeapon()` | 10 |
| 6450 | `_municaoInfinita()` | 1 |
| 6451 | `_pickupAllowed()` | 9 |
| 6460 | `_grabNearPickup()` | 10 |
| 6470 | `_grabPickup()` | 35 |
| 6505 | `_assentarNoChao()` | 10 |
| 6515 | `refreshPickupModels()` | 24 |
| 6539 | `_dropWeapon()` | 20 |
| 6559 | `_sumirDrop()` | 36 |
| 6595 | `_spawnY()` | 3 |
| 6598 | `_spawnYaw()` | 5 |
| 6603 | `_pickSpawn()` | 23 |
| 6626 | `_respawnPlayer()` | 34 |
| 6660 | `_losClear()` | 18 |
| 6678 | `_botCall()` | 41 |
| 6719 | `_teamMarkTex()` | 23 |
| 6742 | `_makeTeamMark()` | 16 |
| 6758 | `_syncRemoteWeapon()` | 22 |
| 6780 | `_updateTeamMark()` | 7 |
| 6787 | `_botEye()` | 1 |
| 6788 | `_enemyOf()` | 8 |
| 6796 | `_duelToken()` | 22 |
| 6818 | `_respawnEntity()` | 21 |
| 6839 | `_updateBot()` | 822 |
| 7661 | `_flushTraining()` | 13 |
| 7674 | `_updateBotNN()` | 73 |
| 7747 | `_botShootNN()` | 46 |
| 7793 | `_radarFoot()` | 38 |
| 7831 | `_updateRadar()` | 64 |
| 7895 | `_banner()` | 26 |
| 7921 | `_resultadoDaRodada()` | 4 |
| 7925 | `_showScoreboard()` | 49 |
| 7974 | `_updateWeaponHud()` | 35 |
| 8009 | `_updateHud()` | 88 |
| 8097 | `update()` | 90 |
| 8187 | `dispose()` | 50 |

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
