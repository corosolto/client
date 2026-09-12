# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.248 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7846 | 296 |
| `public/js/main.js` | 3541 | 285 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 635 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3228 linhas (41% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6459 | `_updateBot()` | ⚠️ candidato a extração |
| 620 | 618 | `constructor()` | 🔴 append-only |
| 274 | 5632 | `_updatePlayer()` |  |
| 260 | 1336 | `_buildViewModels()` |  |
| 255 | 2436 | `_resetPositions()` |  |
| 148 | 5919 | `_updatePickups()` |  |
| 137 | 4935 | `_botCtf()` |  |
| 116 | 2037 | `_touchControls()` |  |
| 98 | 5534 | `_moveEntity()` |  |
| 87 | 7629 | `_updateHud()` |  |
| 86 | 4647 | `_initCTF()` |  |
| 86 | 7716 | `update()` | 🔴 append-only |
| 84 | 3270 | `_tryShoot()` |  |
| 79 | 3764 | `_dmgArc()` |  |
| 76 | 5078 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `325–328` `362–456` `483–504` `1336–1736` `3023–3029` `3111–3205` `3224–3353` `3368–3381` `3426–3479` `3992–4016` `4064–4153` `4226–4242` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `165–168` `219–219` `245–256` `546–557` `3619–3733` `4586–4646` `4817–5071` `5154–5176` `5632–5905` `6280–6297` `6407–6437` `6459–7280` | — |
| **MAPAS / MUNDO** | `1282–1335` `2436–2690` `4647–4793` `5919–6066` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1751–1760` `1875–1906` `2939–2951` `4017–4055` `4169–4225` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1238–1281` `2895–2917` `2933–2938` `2952–2968` `3764–3842` `3859–3912` `3928–3991` `7451–7514` `7545–7593` `7629–7715` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7716–7801 · `_dom()` 1238–1281 · `constructor()` 618–1237

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3801 de 7846 linhas (48%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 314 | `RADIO` | 5 |
| 320 | `MK_LABELS` | 5 |
| 325 | `GUNFEEL` | 4 |
| 331 | `TRACER_STYLE` | 3 |
| 335 | `D2R` | 4 |
| 339 | `DMG_FALLOFF` | 5 |
| 344 | `HS_MUL` | 3 |
| 347 | `BALL_CLASS` | 15 |
| 362 | `STATIC_CLASS` | 75 |
| 438 | `VM_KNOB` | 19 |
| 459 | `vmFovForAspect` | 24 |
| 483 | `VM_OFF` | 22 |
| 505 | `vmOffY` | 35 |
| 540 | `VMP` | 6 |
| 546 | `BOT_SKILLS` | 11 |
| 558 | `diffKey` | 4 |
| 563 | `rollBotSkill` | 7 |
| 570 | `botTier` | 4 |
| 574 | `_cyclePool` | 4 |
| 578 | `_rosterPool` | 15 |
| 593 | `pickMatchRoster` | 12 |
| 605 | `BOT_WEAPON_POOL` | 5 |
| 610 | `pickMatchWeapons` | 7 |
| 618 | `constructor()` | 620 |
| 1238 | `_dom()` | 44 |
| 1282 | `_buildEnv()` | 54 |
| 1336 | `_buildViewModels()` | 260 |
| 1596 | `_vmFrame` | 141 |
| 1737 | `_vmMontarTardio` | 14 |
| 1751 | `_makePuffTexture()` | 10 |
| 1761 | `_makeBloodTex()` | 19 |
| 1780 | `_makeBloodPoolTex()` | 21 |
| 1801 | `_bloodDecal()` | 16 |
| 1817 | `_makeBloodFx()` | 20 |
| 1837 | `_bloodSpatter()` | 18 |
| 1855 | `_bloodPoolAt()` | 6 |
| 1861 | `_updateBlood()` | 14 |
| 1875 | `_makeFlashTex()` | 22 |
| 1897 | `_makeFlashCoreTex()` | 10 |
| 1907 | `_input()` | 2 |
| 1909 | `_kd` | 45 |
| 1954 | `_ku` | 4 |
| 1958 | `_md` | 38 |
| 1996 | `_mu` | 7 |
| 2003 | `_mm` | 15 |
| 2018 | `_cc` | 1 |
| 2019 | `_blur` | 1 |
| 2020 | `_plc` | 17 |
| 2037 | `_touchControls()` | 116 |
| 2153 | `_aimAssist()` | 28 |
| 2181 | `_requestLock()` | 27 |
| 2208 | `_travaAtalhos()` | 4 |
| 2212 | `_soltaAtalhos()` | 5 |
| 2217 | `espectando()` | 2 |
| 2219 | `_acceptInput()` | 8 |
| 2227 | `_pauseBackdrop()` | 7 |
| 2234 | `_radioShow()` | 6 |
| 2240 | `_radioUi()` | 8 |
| 2248 | `_radioPick()` | 19 |
| 2267 | `_abilityNotice()` | 10 |
| 2277 | `_resetSliceAbilities()` | 9 |
| 2286 | `_stackTrace()` | 28 |
| 2314 | `_updateMotocaCharge()` | 10 |
| 2324 | `_recordRoutePoint()` | 11 |
| 2335 | `_routePing()` | 23 |
| 2358 | `_tickRoutePings()` | 12 |
| 2370 | `_objectiveInteractionMultiplier()` | 14 |
| 2384 | `start()` | 5 |
| 2389 | `_startAnnouncerLab()` | 9 |
| 2398 | `_startRound()` | 38 |
| 2436 | `_resetPositions()` | 255 |
| 2691 | `_checkCtfAlvo()` | 13 |
| 2704 | `_checkPace()` | 13 |
| 2717 | `_endRound()` | 34 |
| 2751 | `_roundWinnerVoice()` | 12 |
| 2763 | `_fimDaPartida()` | 7 |
| 2770 | `_endMatch()` | 61 |
| 2831 | `_ensureDolly()` | 41 |
| 2872 | `_tickDolly()` | 23 |
| 2895 | `setPaused()` | 23 |
| 2918 | `_now()` | 3 |
| 2921 | `pauseArmed()` | 1 |
| 2922 | `_syncPauseArm()` | 7 |
| 2929 | `resume()` | 4 |
| 2933 | `applySettings()` | 6 |
| 2939 | `_applyQuality()` | 13 |
| 2952 | `onResize()` | 17 |
| 2969 | `_switchTeam()` | 54 |
| 3023 | `_applyVmVisibility()` | 7 |
| 3030 | `_vmlabEnsure()` | 14 |
| 3044 | `_vmlabFrame()` | 28 |
| 3072 | `_tuneGet()` | 15 |
| 3087 | `_tune()` | 23 |
| 3110 | `_fxSet()` | 1 |
| 3111 | `_switchWeapon()` | 39 |
| 3150 | `_deploySfx()` | 7 |
| 3157 | `_scope()` | 17 |
| 3174 | `_zoomFov()` | 8 |
| 3182 | `_reloading()` | 1 |
| 3183 | `_startReload()` | 23 |
| 3206 | `_reloadLayers()` | 18 |
| 3224 | `_installRecoil()` | 33 |
| 3257 | `_shotRecoil()` | 13 |
| 3270 | `_tryShoot()` | 84 |
| 3354 | `_tryKnifeAttack()` | 14 |
| 3368 | `_meleeHit()` | 14 |
| 3382 | `_meleeRange()` | 5 |
| 3387 | `_botMelee()` | 28 |
| 3415 | `_shotDamage()` | 11 |
| 3426 | `_fireHitscan()` | 54 |
| 3480 | `_targetFromHit()` | 9 |
| 3489 | `_penetrationExit()` | 20 |
| 3509 | `_surfaceOf()` | 27 |
| 3536 | `_armoredTarget()` | 3 |
| 3539 | `_fleshImpact()` | 38 |
| 3577 | `_fxVoice()` | 9 |
| 3586 | `_impactSfx()` | 17 |
| 3603 | `_tintFx()` | 16 |
| 3619 | `_damage()` | 42 |
| 3661 | `_playerHurtFx()` | 6 |
| 3667 | `_kill()` | 67 |
| 3734 | `_checkArenaWin()` | 30 |
| 3764 | `_dmgArc()` | 79 |
| 3843 | `_mkBanner()` | 11 |
| 3854 | `_acertoPrevisto()` | 5 |
| 3859 | `_hitmarker()` | 15 |
| 3874 | `_dmgNumber()` | 20 |
| 3894 | `_feed()` | 19 |
| 3913 | `_skullIcon()` | 6 |
| 3919 | `_killfeedWeaponIcon()` | 9 |
| 3928 | `_wpnIcon()` | 64 |
| 3992 | `_tracer()` | 25 |
| 4017 | `_puff()` | 39 |
| 4056 | `_holeDecalMat()` | 8 |
| 4064 | `_flash()` | 68 |
| 4132 | `_muzzleWorld()` | 22 |
| 4154 | `_aimOrigin()` | 5 |
| 4159 | `_updateDoors()` | 10 |
| 4169 | `_updateFx()` | 57 |
| 4226 | `_ejectCasing()` | 17 |
| 4243 | `_makeCtfFlagTex()` | 23 |
| 4266 | `_paintFlagSymbol()` | 9 |
| 4275 | `_flagTexFor()` | 26 |
| 4301 | `_legadoSimbolo()` | 8 |
| 4309 | `_loadCtfSymbols()` | 22 |
| 4331 | `_makeCtfZoneTex()` | 31 |
| 4362 | `_makeSmokeTex()` | 8 |
| 4370 | `_updateSmokeHud()` | 4 |
| 4374 | `_grenadeSpatial()` | 14 |
| 4388 | `_spawnGrenade()` | 16 |
| 4404 | `_throwSmoke()` | 11 |
| 4415 | `_throwFrag()` | 13 |
| 4428 | `_explodeFrag()` | 40 |
| 4468 | `_corDaFumaca()` | 15 |
| 4483 | `_popSmoke()` | 21 |
| 4504 | `_updateGrenades()` | 35 |
| 4539 | `_teamColor()` | 15 |
| 4554 | `_teamInk()` | 7 |
| 4561 | `_factionOf()` | 1 |
| 4562 | `_voiceKey()` | 1 |
| 4563 | `_teamName()` | 1 |
| 4564 | `_teamTag()` | 6 |
| 4570 | `_plaqueta()` | 13 |
| 4583 | `_mirror()` | 3 |
| 4586 | `_botSeparation()` | 61 |
| 4647 | `_initCTF()` | 86 |
| 4733 | `_updateCTF()` | 61 |
| 4794 | `_ctfWin()` | 23 |
| 4817 | `_freeYaw()` | 25 |
| 4842 | `_pullString()` | 23 |
| 4865 | `_walkReach()` | 32 |
| 4897 | `_wpComp()` | 16 |
| 4913 | `_findPathLocal()` | 22 |
| 4935 | `_botCtf()` | 137 |
| 5072 | `_hideCtfHud()` | 6 |
| 5078 | `_updateCtfHud()` | 76 |
| 5154 | `_collide()` | 23 |
| 5177 | `_collideRot()` | 22 |
| 5199 | `_mantleAlcance()` | 50 |
| 5249 | `_mantleAlcancavel()` | 12 |
| 5261 | `_mantleTarget()` | 35 |
| 5296 | `_freeSpot()` | 30 |
| 5326 | `_retaAndavel()` | 20 |
| 5346 | `_walkDepth()` | 16 |
| 5362 | `_noteHit()` | 17 |
| 5379 | `_deathFeedback()` | 45 |
| 5424 | `_toggleCamView()` | 11 |
| 5435 | `_syncCamViewVis()` | 8 |
| 5443 | `_ensurePlayerTP()` | 25 |
| 5468 | `_updatePlayerTP()` | 35 |
| 5503 | `_tpDeath()` | 18 |
| 5521 | `_tpRevive()` | 13 |
| 5534 | `_moveEntity()` | 98 |
| 5632 | `_updatePlayer()` | 274 |
| 5906 | `_footstepSurface()` | 13 |
| 5919 | `_updatePickups()` | 148 |
| 6067 | `_wpnMode()` | 5 |
| 6072 | `_botWeapon()` | 10 |
| 6082 | `_municaoInfinita()` | 1 |
| 6083 | `_pickupAllowed()` | 7 |
| 6090 | `_grabPickup()` | 35 |
| 6125 | `_assentarNoChao()` | 10 |
| 6135 | `refreshPickupModels()` | 24 |
| 6159 | `_dropWeapon()` | 20 |
| 6179 | `_sumirDrop()` | 36 |
| 6215 | `_spawnY()` | 3 |
| 6218 | `_spawnYaw()` | 5 |
| 6223 | `_pickSpawn()` | 23 |
| 6246 | `_respawnPlayer()` | 34 |
| 6280 | `_losClear()` | 18 |
| 6298 | `_botCall()` | 41 |
| 6339 | `_teamMarkTex()` | 23 |
| 6362 | `_makeTeamMark()` | 16 |
| 6378 | `_syncRemoteWeapon()` | 22 |
| 6400 | `_updateTeamMark()` | 7 |
| 6407 | `_botEye()` | 1 |
| 6408 | `_enemyOf()` | 8 |
| 6416 | `_duelToken()` | 22 |
| 6438 | `_respawnEntity()` | 21 |
| 6459 | `_updateBot()` | 822 |
| 7281 | `_flushTraining()` | 13 |
| 7294 | `_updateBotNN()` | 73 |
| 7367 | `_botShootNN()` | 46 |
| 7413 | `_radarFoot()` | 38 |
| 7451 | `_updateRadar()` | 64 |
| 7515 | `_banner()` | 26 |
| 7541 | `_resultadoDaRodada()` | 4 |
| 7545 | `_showScoreboard()` | 49 |
| 7594 | `_updateWeaponHud()` | 35 |
| 7629 | `_updateHud()` | 87 |
| 7716 | `update()` | 86 |
| 7802 | `dispose()` | 44 |

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
