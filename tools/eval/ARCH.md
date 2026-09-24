# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.278 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7949 | 306 |
| `public/js/main.js` | 3659 | 297 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 635 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3244 linhas (41% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6558 | `_updateBot()` | ⚠️ candidato a extração |
| 626 | 657 | `constructor()` | 🔴 append-only |
| 276 | 5729 | `_updatePlayer()` |  |
| 262 | 1381 | `_buildViewModels()` |  |
| 255 | 2487 | `_resetPositions()` |  |
| 148 | 6018 | `_updatePickups()` |  |
| 137 | 5031 | `_botCtf()` |  |
| 116 | 2088 | `_touchControls()` |  |
| 99 | 5630 | `_moveEntity()` |  |
| 90 | 7815 | `update()` | 🔴 append-only |
| 87 | 7728 | `_updateHud()` |  |
| 86 | 4743 | `_initCTF()` |  |
| 85 | 3366 | `_tryShoot()` |  |
| 79 | 3863 | `_dmgArc()` |  |
| 76 | 5174 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `329–332` `397–491` `518–539` `1381–1783` `3085–3117` `3207–3301` `3320–3450` `3465–3480` `3525–3578` `4091–4115` `4163–4252` `4325–4341` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `168–171` `222–222` `248–259` `581–592` `3718–3832` `4682–4742` `4913–5167` `5250–5272` `5729–6004` `6379–6396` `6506–6536` `6558–7379` | — |
| **MAPAS / MUNDO** | `1327–1380` `2487–2741` `4743–4889` `6018–6165` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1798–1807` `1922–1953` `2993–3005` `4116–4154` `4268–4324` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1283–1326` `2946–2968` `2984–2992` `3006–3022` `3863–3941` `3958–4011` `4027–4090` `7550–7613` `7644–7692` `7728–7814` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7815–7904 · `_dom()` 1283–1326 · `constructor()` 657–1282

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3837 de 7949 linhas (48%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 45 | `ANNOUNCER_LAB` | 4 |
| 49 | `VMLAB` | 3 |
| 55 | `VM_QA_ADS` | 8 |
| 63 | `VM_MAT_LEGACY` | 4 |
| 69 | `DROP_TTL` | 8 |
| 77 | `ROUNDS_MAX` | 27 |
| 107 | `CTF_CLOCK_SHOW` | 4 |
| 111 | `KILLS_PER_PLAYER` | 7 |
| 118 | `PACE` | 33 |
| 151 | `PAUSE_ARM_MS` | 9 |
| 161 | `confirmGate` | 7 |
| 172 | `BOT_AIM_PITCH` | 4 |
| 176 | `BOT_DMG_PLAYER` | 21 |
| 197 | `BOT_FAIR` | 5 |
| 202 | `BOT_MOVE2` | 15 |
| 226 | `BOT_FOCUS_MIN` | 22 |
| 252 | `BOT_TOKEN_REST` | 7 |
| 260 | `MOVE_MUL` | 6 |
| 267 | `MOVE2` | 4 |
| 271 | `STEP_H` | 3 |
| 278 | `MANTLE_APOIO` | 4 |
| 282 | `MANTLE_GRID` | 5 |
| 287 | `RACK_OLD` | 4 |
| 291 | `RACK_RETA` | 25 |
| 318 | `RADIO` | 5 |
| 324 | `MK_LABELS` | 5 |
| 329 | `GUNFEEL` | 4 |
| 335 | `TRACER_STYLE` | 6 |
| 346 | `coneDoDisparo` | 23 |
| 370 | `D2R` | 4 |
| 374 | `DMG_FALLOFF` | 5 |
| 379 | `HS_MUL` | 3 |
| 382 | `BALL_CLASS` | 15 |
| 397 | `STATIC_CLASS` | 75 |
| 473 | `VM_KNOB` | 19 |
| 494 | `vmFovForAspect` | 24 |
| 518 | `VM_OFF` | 22 |
| 540 | `vmOffY` | 35 |
| 575 | `VMP` | 6 |
| 581 | `BOT_SKILLS` | 11 |
| 593 | `diffKey` | 4 |
| 598 | `rollBotSkill` | 7 |
| 605 | `botTier` | 4 |
| 609 | `_cyclePool` | 4 |
| 613 | `_rosterPool` | 15 |
| 628 | `pickMatchRoster` | 12 |
| 640 | `BOT_WEAPON_POOL` | 5 |
| 645 | `pickMatchWeapons` | 9 |
| 657 | `constructor()` | 626 |
| 1283 | `_dom()` | 44 |
| 1327 | `_buildEnv()` | 54 |
| 1381 | `_buildViewModels()` | 262 |
| 1643 | `_vmFrame` | 141 |
| 1784 | `_vmMontarTardio` | 14 |
| 1798 | `_makePuffTexture()` | 10 |
| 1808 | `_makeBloodTex()` | 19 |
| 1827 | `_makeBloodPoolTex()` | 21 |
| 1848 | `_bloodDecal()` | 16 |
| 1864 | `_makeBloodFx()` | 20 |
| 1884 | `_bloodSpatter()` | 18 |
| 1902 | `_bloodPoolAt()` | 6 |
| 1908 | `_updateBlood()` | 14 |
| 1922 | `_makeFlashTex()` | 22 |
| 1944 | `_makeFlashCoreTex()` | 10 |
| 1954 | `_input()` | 2 |
| 1956 | `_kd` | 49 |
| 2005 | `_ku` | 4 |
| 2009 | `_md` | 38 |
| 2047 | `_mu` | 7 |
| 2054 | `_mm` | 15 |
| 2069 | `_cc` | 1 |
| 2070 | `_blur` | 1 |
| 2071 | `_plc` | 17 |
| 2088 | `_touchControls()` | 116 |
| 2204 | `_aimAssist()` | 28 |
| 2232 | `_requestLock()` | 27 |
| 2259 | `_travaAtalhos()` | 4 |
| 2263 | `_soltaAtalhos()` | 5 |
| 2268 | `espectando()` | 2 |
| 2270 | `_acceptInput()` | 8 |
| 2278 | `_pauseBackdrop()` | 7 |
| 2285 | `_radioShow()` | 6 |
| 2291 | `_radioUi()` | 8 |
| 2299 | `_radioPick()` | 19 |
| 2318 | `_abilityNotice()` | 10 |
| 2328 | `_resetSliceAbilities()` | 9 |
| 2337 | `_stackTrace()` | 28 |
| 2365 | `_updateMotocaCharge()` | 10 |
| 2375 | `_recordRoutePoint()` | 11 |
| 2386 | `_routePing()` | 23 |
| 2409 | `_tickRoutePings()` | 12 |
| 2421 | `_objectiveInteractionMultiplier()` | 14 |
| 2435 | `start()` | 5 |
| 2440 | `_startAnnouncerLab()` | 9 |
| 2449 | `_startRound()` | 38 |
| 2487 | `_resetPositions()` | 255 |
| 2742 | `_checkCtfAlvo()` | 13 |
| 2755 | `_checkPace()` | 13 |
| 2768 | `_endRound()` | 34 |
| 2802 | `_roundWinnerVoice()` | 12 |
| 2814 | `_fimDaPartida()` | 7 |
| 2821 | `_endMatch()` | 61 |
| 2882 | `_ensureDolly()` | 41 |
| 2923 | `_tickDolly()` | 23 |
| 2946 | `setPaused()` | 23 |
| 2969 | `_now()` | 3 |
| 2972 | `pauseArmed()` | 1 |
| 2973 | `_syncPauseArm()` | 7 |
| 2980 | `resume()` | 4 |
| 2984 | `applySettings()` | 9 |
| 2993 | `_applyQuality()` | 13 |
| 3006 | `onResize()` | 17 |
| 3023 | `_switchTeam()` | 62 |
| 3085 | `_applyVmVisibility()` | 33 |
| 3118 | `_vmlabEnsure()` | 14 |
| 3132 | `_vmlabFrame()` | 28 |
| 3160 | `_tuneGet()` | 15 |
| 3175 | `_tune()` | 23 |
| 3198 | `_fxSet()` | 2 |
| 3200 | `_qaCicloArma()` | 7 |
| 3207 | `_switchWeapon()` | 39 |
| 3246 | `_deploySfx()` | 7 |
| 3253 | `_scope()` | 17 |
| 3270 | `_zoomFov()` | 8 |
| 3278 | `_reloading()` | 1 |
| 3279 | `_startReload()` | 23 |
| 3302 | `_reloadLayers()` | 18 |
| 3320 | `_installRecoil()` | 33 |
| 3353 | `_shotRecoil()` | 13 |
| 3366 | `_tryShoot()` | 85 |
| 3451 | `_tryKnifeAttack()` | 14 |
| 3465 | `_meleeHit()` | 16 |
| 3481 | `_meleeRange()` | 5 |
| 3486 | `_botMelee()` | 28 |
| 3514 | `_shotDamage()` | 11 |
| 3525 | `_fireHitscan()` | 54 |
| 3579 | `_targetFromHit()` | 9 |
| 3588 | `_penetrationExit()` | 20 |
| 3608 | `_surfaceOf()` | 27 |
| 3635 | `_armoredTarget()` | 3 |
| 3638 | `_fleshImpact()` | 38 |
| 3676 | `_fxVoice()` | 9 |
| 3685 | `_impactSfx()` | 17 |
| 3702 | `_tintFx()` | 16 |
| 3718 | `_damage()` | 42 |
| 3760 | `_playerHurtFx()` | 6 |
| 3766 | `_kill()` | 67 |
| 3833 | `_checkArenaWin()` | 30 |
| 3863 | `_dmgArc()` | 79 |
| 3942 | `_mkBanner()` | 11 |
| 3953 | `_acertoPrevisto()` | 5 |
| 3958 | `_hitmarker()` | 15 |
| 3973 | `_dmgNumber()` | 20 |
| 3993 | `_feed()` | 19 |
| 4012 | `_skullIcon()` | 6 |
| 4018 | `_killfeedWeaponIcon()` | 9 |
| 4027 | `_wpnIcon()` | 64 |
| 4091 | `_tracer()` | 25 |
| 4116 | `_puff()` | 39 |
| 4155 | `_holeDecalMat()` | 8 |
| 4163 | `_flash()` | 68 |
| 4231 | `_muzzleWorld()` | 22 |
| 4253 | `_aimOrigin()` | 5 |
| 4258 | `_updateDoors()` | 10 |
| 4268 | `_updateFx()` | 57 |
| 4325 | `_ejectCasing()` | 17 |
| 4342 | `_makeCtfFlagTex()` | 23 |
| 4365 | `_paintFlagSymbol()` | 9 |
| 4374 | `_flagTexFor()` | 26 |
| 4400 | `_legadoSimbolo()` | 8 |
| 4408 | `_loadCtfSymbols()` | 22 |
| 4430 | `_makeCtfZoneTex()` | 31 |
| 4461 | `_makeSmokeTex()` | 8 |
| 4469 | `_updateSmokeHud()` | 4 |
| 4473 | `_grenadeSpatial()` | 14 |
| 4487 | `_spawnGrenade()` | 19 |
| 4506 | `_throwNade()` | 13 |
| 4519 | `_throwSmoke()` | 1 |
| 4520 | `_throwFrag()` | 4 |
| 4524 | `_explodeFrag()` | 40 |
| 4564 | `_corDaFumaca()` | 15 |
| 4579 | `_popSmoke()` | 21 |
| 4600 | `_updateGrenades()` | 35 |
| 4635 | `_teamColor()` | 15 |
| 4650 | `_teamInk()` | 7 |
| 4657 | `_factionOf()` | 1 |
| 4658 | `_voiceKey()` | 1 |
| 4659 | `_teamName()` | 1 |
| 4660 | `_teamTag()` | 6 |
| 4666 | `_plaqueta()` | 13 |
| 4679 | `_mirror()` | 3 |
| 4682 | `_botSeparation()` | 61 |
| 4743 | `_initCTF()` | 86 |
| 4829 | `_updateCTF()` | 61 |
| 4890 | `_ctfWin()` | 23 |
| 4913 | `_freeYaw()` | 25 |
| 4938 | `_pullString()` | 23 |
| 4961 | `_walkReach()` | 32 |
| 4993 | `_wpComp()` | 16 |
| 5009 | `_findPathLocal()` | 22 |
| 5031 | `_botCtf()` | 137 |
| 5168 | `_hideCtfHud()` | 6 |
| 5174 | `_updateCtfHud()` | 76 |
| 5250 | `_collide()` | 23 |
| 5273 | `_collideRot()` | 22 |
| 5295 | `_mantleAlcance()` | 50 |
| 5345 | `_mantleAlcancavel()` | 12 |
| 5357 | `_mantleTarget()` | 35 |
| 5392 | `_freeSpot()` | 30 |
| 5422 | `_retaAndavel()` | 20 |
| 5442 | `_walkDepth()` | 16 |
| 5458 | `_noteHit()` | 17 |
| 5475 | `_deathFeedback()` | 45 |
| 5520 | `_toggleCamView()` | 11 |
| 5531 | `_syncCamViewVis()` | 8 |
| 5539 | `_ensurePlayerTP()` | 25 |
| 5564 | `_updatePlayerTP()` | 35 |
| 5599 | `_tpDeath()` | 18 |
| 5617 | `_tpRevive()` | 13 |
| 5630 | `_moveEntity()` | 99 |
| 5729 | `_updatePlayer()` | 276 |
| 6005 | `_footstepSurface()` | 13 |
| 6018 | `_updatePickups()` | 148 |
| 6166 | `_wpnMode()` | 5 |
| 6171 | `_botWeapon()` | 10 |
| 6181 | `_municaoInfinita()` | 1 |
| 6182 | `_pickupAllowed()` | 7 |
| 6189 | `_grabPickup()` | 35 |
| 6224 | `_assentarNoChao()` | 10 |
| 6234 | `refreshPickupModels()` | 24 |
| 6258 | `_dropWeapon()` | 20 |
| 6278 | `_sumirDrop()` | 36 |
| 6314 | `_spawnY()` | 3 |
| 6317 | `_spawnYaw()` | 5 |
| 6322 | `_pickSpawn()` | 23 |
| 6345 | `_respawnPlayer()` | 34 |
| 6379 | `_losClear()` | 18 |
| 6397 | `_botCall()` | 41 |
| 6438 | `_teamMarkTex()` | 23 |
| 6461 | `_makeTeamMark()` | 16 |
| 6477 | `_syncRemoteWeapon()` | 22 |
| 6499 | `_updateTeamMark()` | 7 |
| 6506 | `_botEye()` | 1 |
| 6507 | `_enemyOf()` | 8 |
| 6515 | `_duelToken()` | 22 |
| 6537 | `_respawnEntity()` | 21 |
| 6558 | `_updateBot()` | 822 |
| 7380 | `_flushTraining()` | 13 |
| 7393 | `_updateBotNN()` | 73 |
| 7466 | `_botShootNN()` | 46 |
| 7512 | `_radarFoot()` | 38 |
| 7550 | `_updateRadar()` | 64 |
| 7614 | `_banner()` | 26 |
| 7640 | `_resultadoDaRodada()` | 4 |
| 7644 | `_showScoreboard()` | 49 |
| 7693 | `_updateWeaponHud()` | 35 |
| 7728 | `_updateHud()` | 87 |
| 7815 | `update()` | 90 |
| 7905 | `dispose()` | 44 |

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
