# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.19 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8238 | 319 |
| `public/js/main.js` | 4209 | 323 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3308 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6840 | `_updateBot()` | ⚠️ candidato a extração |
| 622 | 672 | `constructor()` | 🔴 append-only |
| 303 | 5962 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1394 | `_buildViewModels()` |  |
| 255 | 2523 | `_resetPositions()` |  |
| 158 | 6278 | `_updatePickups()` |  |
| 137 | 5211 | `_botCtf()` |  |
| 132 | 2107 | `_touchControls()` |  |
| 99 | 5863 | `_moveEntity()` |  |
| 90 | 8098 | `update()` | 🔴 append-only |
| 89 | 3499 | `_tryShoot()` |  |
| 88 | 8010 | `_updateHud()` |  |
| 86 | 4922 | `_initCTF()` |  |
| 79 | 3156 | `_ensureVmPrecisionQa()` |  |
| 79 | 3992 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `331–334` `409–503` `533–554` `1394–1803` `3122–3155` `3343–3434` `3453–3587` `3602–3617` `3662–3721` `4253–4278` `4326–4426` `4499–4515` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `170–173` `224–224` `250–261` `596–607` `3861–3961` `4861–4921` `5093–5347` `5430–5452` `5962–6264` `6661–6678` `6788–6818` `6840–7661` | — |
| **MAPAS / MUNDO** | `1340–1393` `2523–2777` `4922–5068` `6278–6435` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1818–1827` `1942–1980` `3030–3042` `4279–4317` `4442–4498` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1294–1339` `2982–3004` `3020–3029` `3043–3059` `3992–4070` `4120–4173` `4189–4252` `7832–7895` `7926–7974` `8010–8097` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8098–8187 · `_dom()` 1294–1339 · `constructor()` 672–1293

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3880 de 8238 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 2334 | `_radioPick()` | 20 |
| 2354 | `_abilityNotice()` | 10 |
| 2364 | `_resetSliceAbilities()` | 9 |
| 2373 | `_stackTrace()` | 28 |
| 2401 | `_updateMotocaCharge()` | 10 |
| 2411 | `_recordRoutePoint()` | 11 |
| 2422 | `_routePing()` | 23 |
| 2445 | `_tickRoutePings()` | 12 |
| 2457 | `_objectiveInteractionMultiplier()` | 14 |
| 2471 | `start()` | 5 |
| 2476 | `_startAnnouncerLab()` | 9 |
| 2485 | `_startRound()` | 38 |
| 2523 | `_resetPositions()` | 255 |
| 2778 | `_checkCtfAlvo()` | 13 |
| 2791 | `_checkPace()` | 13 |
| 2804 | `_endRound()` | 34 |
| 2838 | `_roundWinnerVoice()` | 12 |
| 2850 | `_fimDaPartida()` | 7 |
| 2857 | `_endMatch()` | 61 |
| 2918 | `_ensureDolly()` | 41 |
| 2959 | `_tickDolly()` | 23 |
| 2982 | `setPaused()` | 23 |
| 3005 | `_now()` | 3 |
| 3008 | `pauseArmed()` | 1 |
| 3009 | `_syncPauseArm()` | 7 |
| 3016 | `resume()` | 4 |
| 3020 | `applySettings()` | 10 |
| 3030 | `_applyQuality()` | 13 |
| 3043 | `onResize()` | 17 |
| 3060 | `_switchTeam()` | 62 |
| 3122 | `_applyVmVisibility()` | 34 |
| 3156 | `_ensureVmPrecisionQa()` | 79 |
| 3235 | `_syncVmPresentation()` | 19 |
| 3254 | `_vmlabEnsure()` | 14 |
| 3268 | `_vmlabFrame()` | 28 |
| 3296 | `_tuneGet()` | 15 |
| 3311 | `_tune()` | 23 |
| 3334 | `_fxSet()` | 2 |
| 3336 | `_qaCicloArma()` | 7 |
| 3343 | `_switchWeapon()` | 39 |
| 3382 | `_deploySfx()` | 7 |
| 3389 | `_scope()` | 17 |
| 3406 | `_zoomFov()` | 5 |
| 3411 | `_reloading()` | 1 |
| 3412 | `_startReload()` | 23 |
| 3435 | `_reloadLayers()` | 18 |
| 3453 | `_installRecoil()` | 33 |
| 3486 | `_shotRecoil()` | 13 |
| 3499 | `_tryShoot()` | 89 |
| 3588 | `_tryKnifeAttack()` | 14 |
| 3602 | `_meleeHit()` | 16 |
| 3618 | `_meleeRange()` | 5 |
| 3623 | `_botMelee()` | 28 |
| 3651 | `_shotDamage()` | 11 |
| 3662 | `_fireHitscan()` | 60 |
| 3722 | `_targetFromHit()` | 9 |
| 3731 | `_penetrationExit()` | 20 |
| 3751 | `_surfaceOf()` | 27 |
| 3778 | `_armoredTarget()` | 3 |
| 3781 | `_fleshImpact()` | 38 |
| 3819 | `_fxVoice()` | 9 |
| 3828 | `_impactSfx()` | 17 |
| 3845 | `_tintFx()` | 16 |
| 3861 | `_damage()` | 42 |
| 3903 | `_playerHurtFx()` | 6 |
| 3909 | `_kill()` | 53 |
| 3962 | `_checkArenaWin()` | 30 |
| 3992 | `_dmgArc()` | 79 |
| 4071 | `_mkBanner()` | 9 |
| 4080 | `_updateKillSequenceHud()` | 12 |
| 4092 | `_resetKillSequence()` | 5 |
| 4097 | `_playerKillFeedback()` | 18 |
| 4115 | `_acertoPrevisto()` | 5 |
| 4120 | `_hitmarker()` | 15 |
| 4135 | `_dmgNumber()` | 20 |
| 4155 | `_feed()` | 19 |
| 4174 | `_skullIcon()` | 6 |
| 4180 | `_killfeedWeaponIcon()` | 9 |
| 4189 | `_wpnIcon()` | 64 |
| 4253 | `_tracer()` | 26 |
| 4279 | `_puff()` | 39 |
| 4318 | `_holeDecalMat()` | 8 |
| 4326 | `_flash()` | 61 |
| 4387 | `_vmTetoTela()` | 10 |
| 4397 | `_muzzleWorld()` | 30 |
| 4427 | `_aimOrigin()` | 5 |
| 4432 | `_updateDoors()` | 10 |
| 4442 | `_updateFx()` | 57 |
| 4499 | `_ejectCasing()` | 17 |
| 4516 | `_makeCtfFlagTex()` | 23 |
| 4539 | `_paintFlagSymbol()` | 9 |
| 4548 | `_flagTexFor()` | 26 |
| 4574 | `_legadoSimbolo()` | 8 |
| 4582 | `_loadCtfSymbols()` | 22 |
| 4604 | `_makeCtfZoneTex()` | 31 |
| 4635 | `_makeSmokeTex()` | 10 |
| 4645 | `_updateSmokeHud()` | 4 |
| 4649 | `_grenadeSpatial()` | 14 |
| 4663 | `_spawnGrenade()` | 19 |
| 4682 | `_throwNade()` | 13 |
| 4695 | `_throwSmoke()` | 1 |
| 4696 | `_throwFrag()` | 4 |
| 4700 | `_explodeFrag()` | 40 |
| 4740 | `_corDaFumaca()` | 16 |
| 4756 | `_popSmoke()` | 23 |
| 4779 | `_updateGrenades()` | 35 |
| 4814 | `_teamColor()` | 15 |
| 4829 | `_teamInk()` | 7 |
| 4836 | `_factionOf()` | 1 |
| 4837 | `_voiceKey()` | 1 |
| 4838 | `_teamName()` | 1 |
| 4839 | `_teamTag()` | 6 |
| 4845 | `_plaqueta()` | 13 |
| 4858 | `_mirror()` | 3 |
| 4861 | `_botSeparation()` | 61 |
| 4922 | `_initCTF()` | 86 |
| 5008 | `_updateCTF()` | 61 |
| 5069 | `_ctfWin()` | 24 |
| 5093 | `_freeYaw()` | 25 |
| 5118 | `_pullString()` | 23 |
| 5141 | `_walkReach()` | 32 |
| 5173 | `_wpComp()` | 16 |
| 5189 | `_findPathLocal()` | 22 |
| 5211 | `_botCtf()` | 137 |
| 5348 | `_hideCtfHud()` | 6 |
| 5354 | `_updateCtfHud()` | 76 |
| 5430 | `_collide()` | 23 |
| 5453 | `_collideRot()` | 22 |
| 5475 | `_mantleAlcance()` | 50 |
| 5525 | `_mantleAlcancavel()` | 12 |
| 5537 | `_mantleTarget()` | 35 |
| 5572 | `_freeSpot()` | 30 |
| 5602 | `_retaAndavel()` | 20 |
| 5622 | `_walkDepth()` | 16 |
| 5638 | `_noteHit()` | 17 |
| 5655 | `_deathFeedback()` | 45 |
| 5700 | `_toggleCamView()` | 6 |
| 5706 | `setCamView()` | 14 |
| 5720 | `_syncCamViewVis()` | 8 |
| 5728 | `_ensurePlayerTP()` | 25 |
| 5753 | `_updatePlayerTP()` | 39 |
| 5792 | `_updateCrosshairParallax()` | 40 |
| 5832 | `_tpDeath()` | 18 |
| 5850 | `_tpRevive()` | 13 |
| 5863 | `_moveEntity()` | 99 |
| 5962 | `_updatePlayer()` | 303 |
| 6265 | `_footstepSurface()` | 13 |
| 6278 | `_updatePickups()` | 158 |
| 6436 | `_wpnMode()` | 5 |
| 6441 | `_botWeapon()` | 10 |
| 6451 | `_municaoInfinita()` | 1 |
| 6452 | `_pickupAllowed()` | 9 |
| 6461 | `_grabNearPickup()` | 10 |
| 6471 | `_grabPickup()` | 35 |
| 6506 | `_assentarNoChao()` | 10 |
| 6516 | `refreshPickupModels()` | 24 |
| 6540 | `_dropWeapon()` | 20 |
| 6560 | `_sumirDrop()` | 36 |
| 6596 | `_spawnY()` | 3 |
| 6599 | `_spawnYaw()` | 5 |
| 6604 | `_pickSpawn()` | 23 |
| 6627 | `_respawnPlayer()` | 34 |
| 6661 | `_losClear()` | 18 |
| 6679 | `_botCall()` | 41 |
| 6720 | `_teamMarkTex()` | 23 |
| 6743 | `_makeTeamMark()` | 16 |
| 6759 | `_syncRemoteWeapon()` | 22 |
| 6781 | `_updateTeamMark()` | 7 |
| 6788 | `_botEye()` | 1 |
| 6789 | `_enemyOf()` | 8 |
| 6797 | `_duelToken()` | 22 |
| 6819 | `_respawnEntity()` | 21 |
| 6840 | `_updateBot()` | 822 |
| 7662 | `_flushTraining()` | 13 |
| 7675 | `_updateBotNN()` | 73 |
| 7748 | `_botShootNN()` | 46 |
| 7794 | `_radarFoot()` | 38 |
| 7832 | `_updateRadar()` | 64 |
| 7896 | `_banner()` | 26 |
| 7922 | `_resultadoDaRodada()` | 4 |
| 7926 | `_showScoreboard()` | 49 |
| 7975 | `_updateWeaponHud()` | 35 |
| 8010 | `_updateHud()` | 88 |
| 8098 | `update()` | 90 |
| 8188 | `dispose()` | 50 |

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
