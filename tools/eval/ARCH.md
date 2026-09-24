# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.278 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7960 | 306 |
| `public/js/main.js` | 3664 | 297 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 635 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3255 linhas (41% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6569 | `_updateBot()` | ⚠️ candidato a extração |
| 626 | 657 | `constructor()` | 🔴 append-only |
| 276 | 5740 | `_updatePlayer()` |  |
| 273 | 1381 | `_buildViewModels()` |  |
| 255 | 2498 | `_resetPositions()` |  |
| 148 | 6029 | `_updatePickups()` |  |
| 137 | 5042 | `_botCtf()` |  |
| 116 | 2099 | `_touchControls()` |  |
| 99 | 5641 | `_moveEntity()` |  |
| 90 | 7826 | `update()` | 🔴 append-only |
| 87 | 7739 | `_updateHud()` |  |
| 86 | 4754 | `_initCTF()` |  |
| 85 | 3377 | `_tryShoot()` |  |
| 79 | 3874 | `_dmgArc()` |  |
| 76 | 5185 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `329–332` `397–491` `518–539` `1381–1794` `3096–3128` `3218–3312` `3331–3461` `3476–3491` `3536–3589` `4102–4126` `4174–4263` `4336–4352` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `168–171` `222–222` `248–259` `581–592` `3729–3843` `4693–4753` `4924–5178` `5261–5283` `5740–6015` `6390–6407` `6517–6547` `6569–7390` | — |
| **MAPAS / MUNDO** | `1327–1380` `2498–2752` `4754–4900` `6029–6176` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1809–1818` `1933–1964` `3004–3016` `4127–4165` `4279–4335` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1283–1326` `2957–2979` `2995–3003` `3017–3033` `3874–3952` `3969–4022` `4038–4101` `7561–7624` `7655–7703` `7739–7825` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7826–7915 · `_dom()` 1283–1326 · `constructor()` 657–1282

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3848 de 7960 linhas (48%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 1381 | `_buildViewModels()` | 273 |
| 1654 | `_vmFrame` | 141 |
| 1795 | `_vmMontarTardio` | 14 |
| 1809 | `_makePuffTexture()` | 10 |
| 1819 | `_makeBloodTex()` | 19 |
| 1838 | `_makeBloodPoolTex()` | 21 |
| 1859 | `_bloodDecal()` | 16 |
| 1875 | `_makeBloodFx()` | 20 |
| 1895 | `_bloodSpatter()` | 18 |
| 1913 | `_bloodPoolAt()` | 6 |
| 1919 | `_updateBlood()` | 14 |
| 1933 | `_makeFlashTex()` | 22 |
| 1955 | `_makeFlashCoreTex()` | 10 |
| 1965 | `_input()` | 2 |
| 1967 | `_kd` | 49 |
| 2016 | `_ku` | 4 |
| 2020 | `_md` | 38 |
| 2058 | `_mu` | 7 |
| 2065 | `_mm` | 15 |
| 2080 | `_cc` | 1 |
| 2081 | `_blur` | 1 |
| 2082 | `_plc` | 17 |
| 2099 | `_touchControls()` | 116 |
| 2215 | `_aimAssist()` | 28 |
| 2243 | `_requestLock()` | 27 |
| 2270 | `_travaAtalhos()` | 4 |
| 2274 | `_soltaAtalhos()` | 5 |
| 2279 | `espectando()` | 2 |
| 2281 | `_acceptInput()` | 8 |
| 2289 | `_pauseBackdrop()` | 7 |
| 2296 | `_radioShow()` | 6 |
| 2302 | `_radioUi()` | 8 |
| 2310 | `_radioPick()` | 19 |
| 2329 | `_abilityNotice()` | 10 |
| 2339 | `_resetSliceAbilities()` | 9 |
| 2348 | `_stackTrace()` | 28 |
| 2376 | `_updateMotocaCharge()` | 10 |
| 2386 | `_recordRoutePoint()` | 11 |
| 2397 | `_routePing()` | 23 |
| 2420 | `_tickRoutePings()` | 12 |
| 2432 | `_objectiveInteractionMultiplier()` | 14 |
| 2446 | `start()` | 5 |
| 2451 | `_startAnnouncerLab()` | 9 |
| 2460 | `_startRound()` | 38 |
| 2498 | `_resetPositions()` | 255 |
| 2753 | `_checkCtfAlvo()` | 13 |
| 2766 | `_checkPace()` | 13 |
| 2779 | `_endRound()` | 34 |
| 2813 | `_roundWinnerVoice()` | 12 |
| 2825 | `_fimDaPartida()` | 7 |
| 2832 | `_endMatch()` | 61 |
| 2893 | `_ensureDolly()` | 41 |
| 2934 | `_tickDolly()` | 23 |
| 2957 | `setPaused()` | 23 |
| 2980 | `_now()` | 3 |
| 2983 | `pauseArmed()` | 1 |
| 2984 | `_syncPauseArm()` | 7 |
| 2991 | `resume()` | 4 |
| 2995 | `applySettings()` | 9 |
| 3004 | `_applyQuality()` | 13 |
| 3017 | `onResize()` | 17 |
| 3034 | `_switchTeam()` | 62 |
| 3096 | `_applyVmVisibility()` | 33 |
| 3129 | `_vmlabEnsure()` | 14 |
| 3143 | `_vmlabFrame()` | 28 |
| 3171 | `_tuneGet()` | 15 |
| 3186 | `_tune()` | 23 |
| 3209 | `_fxSet()` | 2 |
| 3211 | `_qaCicloArma()` | 7 |
| 3218 | `_switchWeapon()` | 39 |
| 3257 | `_deploySfx()` | 7 |
| 3264 | `_scope()` | 17 |
| 3281 | `_zoomFov()` | 8 |
| 3289 | `_reloading()` | 1 |
| 3290 | `_startReload()` | 23 |
| 3313 | `_reloadLayers()` | 18 |
| 3331 | `_installRecoil()` | 33 |
| 3364 | `_shotRecoil()` | 13 |
| 3377 | `_tryShoot()` | 85 |
| 3462 | `_tryKnifeAttack()` | 14 |
| 3476 | `_meleeHit()` | 16 |
| 3492 | `_meleeRange()` | 5 |
| 3497 | `_botMelee()` | 28 |
| 3525 | `_shotDamage()` | 11 |
| 3536 | `_fireHitscan()` | 54 |
| 3590 | `_targetFromHit()` | 9 |
| 3599 | `_penetrationExit()` | 20 |
| 3619 | `_surfaceOf()` | 27 |
| 3646 | `_armoredTarget()` | 3 |
| 3649 | `_fleshImpact()` | 38 |
| 3687 | `_fxVoice()` | 9 |
| 3696 | `_impactSfx()` | 17 |
| 3713 | `_tintFx()` | 16 |
| 3729 | `_damage()` | 42 |
| 3771 | `_playerHurtFx()` | 6 |
| 3777 | `_kill()` | 67 |
| 3844 | `_checkArenaWin()` | 30 |
| 3874 | `_dmgArc()` | 79 |
| 3953 | `_mkBanner()` | 11 |
| 3964 | `_acertoPrevisto()` | 5 |
| 3969 | `_hitmarker()` | 15 |
| 3984 | `_dmgNumber()` | 20 |
| 4004 | `_feed()` | 19 |
| 4023 | `_skullIcon()` | 6 |
| 4029 | `_killfeedWeaponIcon()` | 9 |
| 4038 | `_wpnIcon()` | 64 |
| 4102 | `_tracer()` | 25 |
| 4127 | `_puff()` | 39 |
| 4166 | `_holeDecalMat()` | 8 |
| 4174 | `_flash()` | 68 |
| 4242 | `_muzzleWorld()` | 22 |
| 4264 | `_aimOrigin()` | 5 |
| 4269 | `_updateDoors()` | 10 |
| 4279 | `_updateFx()` | 57 |
| 4336 | `_ejectCasing()` | 17 |
| 4353 | `_makeCtfFlagTex()` | 23 |
| 4376 | `_paintFlagSymbol()` | 9 |
| 4385 | `_flagTexFor()` | 26 |
| 4411 | `_legadoSimbolo()` | 8 |
| 4419 | `_loadCtfSymbols()` | 22 |
| 4441 | `_makeCtfZoneTex()` | 31 |
| 4472 | `_makeSmokeTex()` | 8 |
| 4480 | `_updateSmokeHud()` | 4 |
| 4484 | `_grenadeSpatial()` | 14 |
| 4498 | `_spawnGrenade()` | 19 |
| 4517 | `_throwNade()` | 13 |
| 4530 | `_throwSmoke()` | 1 |
| 4531 | `_throwFrag()` | 4 |
| 4535 | `_explodeFrag()` | 40 |
| 4575 | `_corDaFumaca()` | 15 |
| 4590 | `_popSmoke()` | 21 |
| 4611 | `_updateGrenades()` | 35 |
| 4646 | `_teamColor()` | 15 |
| 4661 | `_teamInk()` | 7 |
| 4668 | `_factionOf()` | 1 |
| 4669 | `_voiceKey()` | 1 |
| 4670 | `_teamName()` | 1 |
| 4671 | `_teamTag()` | 6 |
| 4677 | `_plaqueta()` | 13 |
| 4690 | `_mirror()` | 3 |
| 4693 | `_botSeparation()` | 61 |
| 4754 | `_initCTF()` | 86 |
| 4840 | `_updateCTF()` | 61 |
| 4901 | `_ctfWin()` | 23 |
| 4924 | `_freeYaw()` | 25 |
| 4949 | `_pullString()` | 23 |
| 4972 | `_walkReach()` | 32 |
| 5004 | `_wpComp()` | 16 |
| 5020 | `_findPathLocal()` | 22 |
| 5042 | `_botCtf()` | 137 |
| 5179 | `_hideCtfHud()` | 6 |
| 5185 | `_updateCtfHud()` | 76 |
| 5261 | `_collide()` | 23 |
| 5284 | `_collideRot()` | 22 |
| 5306 | `_mantleAlcance()` | 50 |
| 5356 | `_mantleAlcancavel()` | 12 |
| 5368 | `_mantleTarget()` | 35 |
| 5403 | `_freeSpot()` | 30 |
| 5433 | `_retaAndavel()` | 20 |
| 5453 | `_walkDepth()` | 16 |
| 5469 | `_noteHit()` | 17 |
| 5486 | `_deathFeedback()` | 45 |
| 5531 | `_toggleCamView()` | 11 |
| 5542 | `_syncCamViewVis()` | 8 |
| 5550 | `_ensurePlayerTP()` | 25 |
| 5575 | `_updatePlayerTP()` | 35 |
| 5610 | `_tpDeath()` | 18 |
| 5628 | `_tpRevive()` | 13 |
| 5641 | `_moveEntity()` | 99 |
| 5740 | `_updatePlayer()` | 276 |
| 6016 | `_footstepSurface()` | 13 |
| 6029 | `_updatePickups()` | 148 |
| 6177 | `_wpnMode()` | 5 |
| 6182 | `_botWeapon()` | 10 |
| 6192 | `_municaoInfinita()` | 1 |
| 6193 | `_pickupAllowed()` | 7 |
| 6200 | `_grabPickup()` | 35 |
| 6235 | `_assentarNoChao()` | 10 |
| 6245 | `refreshPickupModels()` | 24 |
| 6269 | `_dropWeapon()` | 20 |
| 6289 | `_sumirDrop()` | 36 |
| 6325 | `_spawnY()` | 3 |
| 6328 | `_spawnYaw()` | 5 |
| 6333 | `_pickSpawn()` | 23 |
| 6356 | `_respawnPlayer()` | 34 |
| 6390 | `_losClear()` | 18 |
| 6408 | `_botCall()` | 41 |
| 6449 | `_teamMarkTex()` | 23 |
| 6472 | `_makeTeamMark()` | 16 |
| 6488 | `_syncRemoteWeapon()` | 22 |
| 6510 | `_updateTeamMark()` | 7 |
| 6517 | `_botEye()` | 1 |
| 6518 | `_enemyOf()` | 8 |
| 6526 | `_duelToken()` | 22 |
| 6548 | `_respawnEntity()` | 21 |
| 6569 | `_updateBot()` | 822 |
| 7391 | `_flushTraining()` | 13 |
| 7404 | `_updateBotNN()` | 73 |
| 7477 | `_botShootNN()` | 46 |
| 7523 | `_radarFoot()` | 38 |
| 7561 | `_updateRadar()` | 64 |
| 7625 | `_banner()` | 26 |
| 7651 | `_resultadoDaRodada()` | 4 |
| 7655 | `_showScoreboard()` | 49 |
| 7704 | `_updateWeaponHud()` | 35 |
| 7739 | `_updateHud()` | 87 |
| 7826 | `update()` | 90 |
| 7916 | `dispose()` | 44 |

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
