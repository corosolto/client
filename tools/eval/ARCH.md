# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.248 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7852 | 297 |
| `public/js/main.js` | 3541 | 285 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 635 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3233 linhas (41% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6465 | `_updateBot()` | ⚠️ candidato a extração |
| 620 | 619 | `constructor()` | 🔴 append-only |
| 276 | 5636 | `_updatePlayer()` |  |
| 262 | 1337 | `_buildViewModels()` |  |
| 255 | 2439 | `_resetPositions()` |  |
| 148 | 5925 | `_updatePickups()` |  |
| 137 | 4938 | `_botCtf()` |  |
| 116 | 2040 | `_touchControls()` |  |
| 99 | 5537 | `_moveEntity()` |  |
| 87 | 7635 | `_updateHud()` |  |
| 86 | 4650 | `_initCTF()` |  |
| 86 | 7722 | `update()` | 🔴 append-only |
| 84 | 3273 | `_tryShoot()` |  |
| 79 | 3767 | `_dmgArc()` |  |
| 76 | 5081 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `326–329` `363–457` `484–505` `1337–1739` `3026–3032` `3114–3208` `3227–3356` `3371–3384` `3429–3482` `3995–4019` `4067–4156` `4229–4245` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `165–168` `219–219` `245–256` `547–558` `3622–3736` `4589–4649` `4820–5074` `5157–5179` `5636–5911` `6286–6303` `6413–6443` `6465–7286` | — |
| **MAPAS / MUNDO** | `1283–1336` `2439–2693` `4650–4796` `5925–6072` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1754–1763` `1878–1909` `2942–2954` `4020–4058` `4172–4228` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1239–1282` `2898–2920` `2936–2941` `2955–2971` `3767–3845` `3862–3915` `3931–3994` `7457–7520` `7551–7599` `7635–7721` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7722–7807 · `_dom()` 1239–1282 · `constructor()` 619–1238

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3805 de 7852 linhas (48%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 44 | `ANNOUNCER_LAB` | 4 |
| 48 | `VMLAB` | 3 |
| 52 | `VM_QA_ADS` | 8 |
| 60 | `VM_MAT_LEGACY` | 4 |
| 66 | `DROP_TTL` | 8 |
| 74 | `ROUNDS_MAX` | 27 |
| 104 | `CTF_CLOCK_SHOW` | 4 |
| 108 | `KILLS_PER_PLAYER` | 7 |
| 115 | `PACE` | 33 |
| 148 | `PAUSE_ARM_MS` | 9 |
| 158 | `confirmGate` | 7 |
| 169 | `BOT_AIM_PITCH` | 4 |
| 173 | `BOT_DMG_PLAYER` | 21 |
| 194 | `BOT_FAIR` | 5 |
| 199 | `BOT_MOVE2` | 15 |
| 223 | `BOT_FOCUS_MIN` | 22 |
| 249 | `BOT_TOKEN_REST` | 7 |
| 257 | `MOVE_MUL` | 6 |
| 264 | `MOVE2` | 4 |
| 268 | `STEP_H` | 3 |
| 275 | `MANTLE_APOIO` | 4 |
| 279 | `MANTLE_GRID` | 5 |
| 284 | `RACK_OLD` | 4 |
| 288 | `RACK_RETA` | 25 |
| 315 | `RADIO` | 5 |
| 321 | `MK_LABELS` | 5 |
| 326 | `GUNFEEL` | 4 |
| 332 | `TRACER_STYLE` | 3 |
| 336 | `D2R` | 4 |
| 340 | `DMG_FALLOFF` | 5 |
| 345 | `HS_MUL` | 3 |
| 348 | `BALL_CLASS` | 15 |
| 363 | `STATIC_CLASS` | 75 |
| 439 | `VM_KNOB` | 19 |
| 460 | `vmFovForAspect` | 24 |
| 484 | `VM_OFF` | 22 |
| 506 | `vmOffY` | 35 |
| 541 | `VMP` | 6 |
| 547 | `BOT_SKILLS` | 11 |
| 559 | `diffKey` | 4 |
| 564 | `rollBotSkill` | 7 |
| 571 | `botTier` | 4 |
| 575 | `_cyclePool` | 4 |
| 579 | `_rosterPool` | 15 |
| 594 | `pickMatchRoster` | 12 |
| 606 | `BOT_WEAPON_POOL` | 5 |
| 611 | `pickMatchWeapons` | 7 |
| 619 | `constructor()` | 620 |
| 1239 | `_dom()` | 44 |
| 1283 | `_buildEnv()` | 54 |
| 1337 | `_buildViewModels()` | 262 |
| 1599 | `_vmFrame` | 141 |
| 1740 | `_vmMontarTardio` | 14 |
| 1754 | `_makePuffTexture()` | 10 |
| 1764 | `_makeBloodTex()` | 19 |
| 1783 | `_makeBloodPoolTex()` | 21 |
| 1804 | `_bloodDecal()` | 16 |
| 1820 | `_makeBloodFx()` | 20 |
| 1840 | `_bloodSpatter()` | 18 |
| 1858 | `_bloodPoolAt()` | 6 |
| 1864 | `_updateBlood()` | 14 |
| 1878 | `_makeFlashTex()` | 22 |
| 1900 | `_makeFlashCoreTex()` | 10 |
| 1910 | `_input()` | 2 |
| 1912 | `_kd` | 45 |
| 1957 | `_ku` | 4 |
| 1961 | `_md` | 38 |
| 1999 | `_mu` | 7 |
| 2006 | `_mm` | 15 |
| 2021 | `_cc` | 1 |
| 2022 | `_blur` | 1 |
| 2023 | `_plc` | 17 |
| 2040 | `_touchControls()` | 116 |
| 2156 | `_aimAssist()` | 28 |
| 2184 | `_requestLock()` | 27 |
| 2211 | `_travaAtalhos()` | 4 |
| 2215 | `_soltaAtalhos()` | 5 |
| 2220 | `espectando()` | 2 |
| 2222 | `_acceptInput()` | 8 |
| 2230 | `_pauseBackdrop()` | 7 |
| 2237 | `_radioShow()` | 6 |
| 2243 | `_radioUi()` | 8 |
| 2251 | `_radioPick()` | 19 |
| 2270 | `_abilityNotice()` | 10 |
| 2280 | `_resetSliceAbilities()` | 9 |
| 2289 | `_stackTrace()` | 28 |
| 2317 | `_updateMotocaCharge()` | 10 |
| 2327 | `_recordRoutePoint()` | 11 |
| 2338 | `_routePing()` | 23 |
| 2361 | `_tickRoutePings()` | 12 |
| 2373 | `_objectiveInteractionMultiplier()` | 14 |
| 2387 | `start()` | 5 |
| 2392 | `_startAnnouncerLab()` | 9 |
| 2401 | `_startRound()` | 38 |
| 2439 | `_resetPositions()` | 255 |
| 2694 | `_checkCtfAlvo()` | 13 |
| 2707 | `_checkPace()` | 13 |
| 2720 | `_endRound()` | 34 |
| 2754 | `_roundWinnerVoice()` | 12 |
| 2766 | `_fimDaPartida()` | 7 |
| 2773 | `_endMatch()` | 61 |
| 2834 | `_ensureDolly()` | 41 |
| 2875 | `_tickDolly()` | 23 |
| 2898 | `setPaused()` | 23 |
| 2921 | `_now()` | 3 |
| 2924 | `pauseArmed()` | 1 |
| 2925 | `_syncPauseArm()` | 7 |
| 2932 | `resume()` | 4 |
| 2936 | `applySettings()` | 6 |
| 2942 | `_applyQuality()` | 13 |
| 2955 | `onResize()` | 17 |
| 2972 | `_switchTeam()` | 54 |
| 3026 | `_applyVmVisibility()` | 7 |
| 3033 | `_vmlabEnsure()` | 14 |
| 3047 | `_vmlabFrame()` | 28 |
| 3075 | `_tuneGet()` | 15 |
| 3090 | `_tune()` | 23 |
| 3113 | `_fxSet()` | 1 |
| 3114 | `_switchWeapon()` | 39 |
| 3153 | `_deploySfx()` | 7 |
| 3160 | `_scope()` | 17 |
| 3177 | `_zoomFov()` | 8 |
| 3185 | `_reloading()` | 1 |
| 3186 | `_startReload()` | 23 |
| 3209 | `_reloadLayers()` | 18 |
| 3227 | `_installRecoil()` | 33 |
| 3260 | `_shotRecoil()` | 13 |
| 3273 | `_tryShoot()` | 84 |
| 3357 | `_tryKnifeAttack()` | 14 |
| 3371 | `_meleeHit()` | 14 |
| 3385 | `_meleeRange()` | 5 |
| 3390 | `_botMelee()` | 28 |
| 3418 | `_shotDamage()` | 11 |
| 3429 | `_fireHitscan()` | 54 |
| 3483 | `_targetFromHit()` | 9 |
| 3492 | `_penetrationExit()` | 20 |
| 3512 | `_surfaceOf()` | 27 |
| 3539 | `_armoredTarget()` | 3 |
| 3542 | `_fleshImpact()` | 38 |
| 3580 | `_fxVoice()` | 9 |
| 3589 | `_impactSfx()` | 17 |
| 3606 | `_tintFx()` | 16 |
| 3622 | `_damage()` | 42 |
| 3664 | `_playerHurtFx()` | 6 |
| 3670 | `_kill()` | 67 |
| 3737 | `_checkArenaWin()` | 30 |
| 3767 | `_dmgArc()` | 79 |
| 3846 | `_mkBanner()` | 11 |
| 3857 | `_acertoPrevisto()` | 5 |
| 3862 | `_hitmarker()` | 15 |
| 3877 | `_dmgNumber()` | 20 |
| 3897 | `_feed()` | 19 |
| 3916 | `_skullIcon()` | 6 |
| 3922 | `_killfeedWeaponIcon()` | 9 |
| 3931 | `_wpnIcon()` | 64 |
| 3995 | `_tracer()` | 25 |
| 4020 | `_puff()` | 39 |
| 4059 | `_holeDecalMat()` | 8 |
| 4067 | `_flash()` | 68 |
| 4135 | `_muzzleWorld()` | 22 |
| 4157 | `_aimOrigin()` | 5 |
| 4162 | `_updateDoors()` | 10 |
| 4172 | `_updateFx()` | 57 |
| 4229 | `_ejectCasing()` | 17 |
| 4246 | `_makeCtfFlagTex()` | 23 |
| 4269 | `_paintFlagSymbol()` | 9 |
| 4278 | `_flagTexFor()` | 26 |
| 4304 | `_legadoSimbolo()` | 8 |
| 4312 | `_loadCtfSymbols()` | 22 |
| 4334 | `_makeCtfZoneTex()` | 31 |
| 4365 | `_makeSmokeTex()` | 8 |
| 4373 | `_updateSmokeHud()` | 4 |
| 4377 | `_grenadeSpatial()` | 14 |
| 4391 | `_spawnGrenade()` | 16 |
| 4407 | `_throwSmoke()` | 11 |
| 4418 | `_throwFrag()` | 13 |
| 4431 | `_explodeFrag()` | 40 |
| 4471 | `_corDaFumaca()` | 15 |
| 4486 | `_popSmoke()` | 21 |
| 4507 | `_updateGrenades()` | 35 |
| 4542 | `_teamColor()` | 15 |
| 4557 | `_teamInk()` | 7 |
| 4564 | `_factionOf()` | 1 |
| 4565 | `_voiceKey()` | 1 |
| 4566 | `_teamName()` | 1 |
| 4567 | `_teamTag()` | 6 |
| 4573 | `_plaqueta()` | 13 |
| 4586 | `_mirror()` | 3 |
| 4589 | `_botSeparation()` | 61 |
| 4650 | `_initCTF()` | 86 |
| 4736 | `_updateCTF()` | 61 |
| 4797 | `_ctfWin()` | 23 |
| 4820 | `_freeYaw()` | 25 |
| 4845 | `_pullString()` | 23 |
| 4868 | `_walkReach()` | 32 |
| 4900 | `_wpComp()` | 16 |
| 4916 | `_findPathLocal()` | 22 |
| 4938 | `_botCtf()` | 137 |
| 5075 | `_hideCtfHud()` | 6 |
| 5081 | `_updateCtfHud()` | 76 |
| 5157 | `_collide()` | 23 |
| 5180 | `_collideRot()` | 22 |
| 5202 | `_mantleAlcance()` | 50 |
| 5252 | `_mantleAlcancavel()` | 12 |
| 5264 | `_mantleTarget()` | 35 |
| 5299 | `_freeSpot()` | 30 |
| 5329 | `_retaAndavel()` | 20 |
| 5349 | `_walkDepth()` | 16 |
| 5365 | `_noteHit()` | 17 |
| 5382 | `_deathFeedback()` | 45 |
| 5427 | `_toggleCamView()` | 11 |
| 5438 | `_syncCamViewVis()` | 8 |
| 5446 | `_ensurePlayerTP()` | 25 |
| 5471 | `_updatePlayerTP()` | 35 |
| 5506 | `_tpDeath()` | 18 |
| 5524 | `_tpRevive()` | 13 |
| 5537 | `_moveEntity()` | 99 |
| 5636 | `_updatePlayer()` | 276 |
| 5912 | `_footstepSurface()` | 13 |
| 5925 | `_updatePickups()` | 148 |
| 6073 | `_wpnMode()` | 5 |
| 6078 | `_botWeapon()` | 10 |
| 6088 | `_municaoInfinita()` | 1 |
| 6089 | `_pickupAllowed()` | 7 |
| 6096 | `_grabPickup()` | 35 |
| 6131 | `_assentarNoChao()` | 10 |
| 6141 | `refreshPickupModels()` | 24 |
| 6165 | `_dropWeapon()` | 20 |
| 6185 | `_sumirDrop()` | 36 |
| 6221 | `_spawnY()` | 3 |
| 6224 | `_spawnYaw()` | 5 |
| 6229 | `_pickSpawn()` | 23 |
| 6252 | `_respawnPlayer()` | 34 |
| 6286 | `_losClear()` | 18 |
| 6304 | `_botCall()` | 41 |
| 6345 | `_teamMarkTex()` | 23 |
| 6368 | `_makeTeamMark()` | 16 |
| 6384 | `_syncRemoteWeapon()` | 22 |
| 6406 | `_updateTeamMark()` | 7 |
| 6413 | `_botEye()` | 1 |
| 6414 | `_enemyOf()` | 8 |
| 6422 | `_duelToken()` | 22 |
| 6444 | `_respawnEntity()` | 21 |
| 6465 | `_updateBot()` | 822 |
| 7287 | `_flushTraining()` | 13 |
| 7300 | `_updateBotNN()` | 73 |
| 7373 | `_botShootNN()` | 46 |
| 7419 | `_radarFoot()` | 38 |
| 7457 | `_updateRadar()` | 64 |
| 7521 | `_banner()` | 26 |
| 7547 | `_resultadoDaRodada()` | 4 |
| 7551 | `_showScoreboard()` | 49 |
| 7600 | `_updateWeaponHud()` | 35 |
| 7635 | `_updateHud()` | 87 |
| 7722 | `update()` | 86 |
| 7808 | `dispose()` | 44 |

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
