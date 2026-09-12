# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.248 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7892 | 299 |
| `public/js/main.js` | 3537 | 285 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 635 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3233 linhas (41% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6505 | `_updateBot()` | ⚠️ candidato a extração |
| 620 | 621 | `constructor()` | 🔴 append-only |
| 276 | 5676 | `_updatePlayer()` |  |
| 262 | 1339 | `_buildViewModels()` |  |
| 255 | 2445 | `_resetPositions()` |  |
| 148 | 5965 | `_updatePickups()` |  |
| 137 | 4978 | `_botCtf()` |  |
| 116 | 2046 | `_touchControls()` |  |
| 99 | 5577 | `_moveEntity()` |  |
| 87 | 7675 | `_updateHud()` |  |
| 86 | 4690 | `_initCTF()` |  |
| 86 | 7762 | `update()` | 🔴 append-only |
| 84 | 3313 | `_tryShoot()` |  |
| 79 | 3807 | `_dmgArc()` |  |
| 76 | 5121 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `328–331` `365–459` `486–507` `1339–1741` `3032–3064` `3154–3248` `3267–3396` `3411–3424` `3469–3522` `4035–4059` `4107–4196` `4269–4285` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `167–170` `221–221` `247–258` `549–560` `3662–3776` `4629–4689` `4860–5114` `5197–5219` `5676–5951` `6326–6343` `6453–6483` `6505–7326` | — |
| **MAPAS / MUNDO** | `1285–1338` `2445–2699` `4690–4836` `5965–6112` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1756–1765` `1880–1911` `2948–2960` `4060–4098` `4212–4268` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1241–1284` `2904–2926` `2942–2947` `2961–2977` `3807–3885` `3902–3955` `3971–4034` `7497–7560` `7591–7639` `7675–7761` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7762–7847 · `_dom()` 1241–1284 · `constructor()` 621–1240

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3831 de 7892 linhas (49%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 44 | `ANNOUNCER_LAB` | 4 |
| 48 | `VMLAB` | 3 |
| 54 | `VM_QA_ADS` | 8 |
| 62 | `VM_MAT_LEGACY` | 4 |
| 68 | `DROP_TTL` | 8 |
| 76 | `ROUNDS_MAX` | 27 |
| 106 | `CTF_CLOCK_SHOW` | 4 |
| 110 | `KILLS_PER_PLAYER` | 7 |
| 117 | `PACE` | 33 |
| 150 | `PAUSE_ARM_MS` | 9 |
| 160 | `confirmGate` | 7 |
| 171 | `BOT_AIM_PITCH` | 4 |
| 175 | `BOT_DMG_PLAYER` | 21 |
| 196 | `BOT_FAIR` | 5 |
| 201 | `BOT_MOVE2` | 15 |
| 225 | `BOT_FOCUS_MIN` | 22 |
| 251 | `BOT_TOKEN_REST` | 7 |
| 259 | `MOVE_MUL` | 6 |
| 266 | `MOVE2` | 4 |
| 270 | `STEP_H` | 3 |
| 277 | `MANTLE_APOIO` | 4 |
| 281 | `MANTLE_GRID` | 5 |
| 286 | `RACK_OLD` | 4 |
| 290 | `RACK_RETA` | 25 |
| 317 | `RADIO` | 5 |
| 323 | `MK_LABELS` | 5 |
| 328 | `GUNFEEL` | 4 |
| 334 | `TRACER_STYLE` | 3 |
| 338 | `D2R` | 4 |
| 342 | `DMG_FALLOFF` | 5 |
| 347 | `HS_MUL` | 3 |
| 350 | `BALL_CLASS` | 15 |
| 365 | `STATIC_CLASS` | 75 |
| 441 | `VM_KNOB` | 19 |
| 462 | `vmFovForAspect` | 24 |
| 486 | `VM_OFF` | 22 |
| 508 | `vmOffY` | 35 |
| 543 | `VMP` | 6 |
| 549 | `BOT_SKILLS` | 11 |
| 561 | `diffKey` | 4 |
| 566 | `rollBotSkill` | 7 |
| 573 | `botTier` | 4 |
| 577 | `_cyclePool` | 4 |
| 581 | `_rosterPool` | 15 |
| 596 | `pickMatchRoster` | 12 |
| 608 | `BOT_WEAPON_POOL` | 5 |
| 613 | `pickMatchWeapons` | 7 |
| 621 | `constructor()` | 620 |
| 1241 | `_dom()` | 44 |
| 1285 | `_buildEnv()` | 54 |
| 1339 | `_buildViewModels()` | 262 |
| 1601 | `_vmFrame` | 141 |
| 1742 | `_vmMontarTardio` | 14 |
| 1756 | `_makePuffTexture()` | 10 |
| 1766 | `_makeBloodTex()` | 19 |
| 1785 | `_makeBloodPoolTex()` | 21 |
| 1806 | `_bloodDecal()` | 16 |
| 1822 | `_makeBloodFx()` | 20 |
| 1842 | `_bloodSpatter()` | 18 |
| 1860 | `_bloodPoolAt()` | 6 |
| 1866 | `_updateBlood()` | 14 |
| 1880 | `_makeFlashTex()` | 22 |
| 1902 | `_makeFlashCoreTex()` | 10 |
| 1912 | `_input()` | 2 |
| 1914 | `_kd` | 49 |
| 1963 | `_ku` | 4 |
| 1967 | `_md` | 38 |
| 2005 | `_mu` | 7 |
| 2012 | `_mm` | 15 |
| 2027 | `_cc` | 1 |
| 2028 | `_blur` | 1 |
| 2029 | `_plc` | 17 |
| 2046 | `_touchControls()` | 116 |
| 2162 | `_aimAssist()` | 28 |
| 2190 | `_requestLock()` | 27 |
| 2217 | `_travaAtalhos()` | 4 |
| 2221 | `_soltaAtalhos()` | 5 |
| 2226 | `espectando()` | 2 |
| 2228 | `_acceptInput()` | 8 |
| 2236 | `_pauseBackdrop()` | 7 |
| 2243 | `_radioShow()` | 6 |
| 2249 | `_radioUi()` | 8 |
| 2257 | `_radioPick()` | 19 |
| 2276 | `_abilityNotice()` | 10 |
| 2286 | `_resetSliceAbilities()` | 9 |
| 2295 | `_stackTrace()` | 28 |
| 2323 | `_updateMotocaCharge()` | 10 |
| 2333 | `_recordRoutePoint()` | 11 |
| 2344 | `_routePing()` | 23 |
| 2367 | `_tickRoutePings()` | 12 |
| 2379 | `_objectiveInteractionMultiplier()` | 14 |
| 2393 | `start()` | 5 |
| 2398 | `_startAnnouncerLab()` | 9 |
| 2407 | `_startRound()` | 38 |
| 2445 | `_resetPositions()` | 255 |
| 2700 | `_checkCtfAlvo()` | 13 |
| 2713 | `_checkPace()` | 13 |
| 2726 | `_endRound()` | 34 |
| 2760 | `_roundWinnerVoice()` | 12 |
| 2772 | `_fimDaPartida()` | 7 |
| 2779 | `_endMatch()` | 61 |
| 2840 | `_ensureDolly()` | 41 |
| 2881 | `_tickDolly()` | 23 |
| 2904 | `setPaused()` | 23 |
| 2927 | `_now()` | 3 |
| 2930 | `pauseArmed()` | 1 |
| 2931 | `_syncPauseArm()` | 7 |
| 2938 | `resume()` | 4 |
| 2942 | `applySettings()` | 6 |
| 2948 | `_applyQuality()` | 13 |
| 2961 | `onResize()` | 17 |
| 2978 | `_switchTeam()` | 54 |
| 3032 | `_applyVmVisibility()` | 33 |
| 3065 | `_vmlabEnsure()` | 14 |
| 3079 | `_vmlabFrame()` | 28 |
| 3107 | `_tuneGet()` | 15 |
| 3122 | `_tune()` | 23 |
| 3145 | `_fxSet()` | 2 |
| 3147 | `_qaCicloArma()` | 7 |
| 3154 | `_switchWeapon()` | 39 |
| 3193 | `_deploySfx()` | 7 |
| 3200 | `_scope()` | 17 |
| 3217 | `_zoomFov()` | 8 |
| 3225 | `_reloading()` | 1 |
| 3226 | `_startReload()` | 23 |
| 3249 | `_reloadLayers()` | 18 |
| 3267 | `_installRecoil()` | 33 |
| 3300 | `_shotRecoil()` | 13 |
| 3313 | `_tryShoot()` | 84 |
| 3397 | `_tryKnifeAttack()` | 14 |
| 3411 | `_meleeHit()` | 14 |
| 3425 | `_meleeRange()` | 5 |
| 3430 | `_botMelee()` | 28 |
| 3458 | `_shotDamage()` | 11 |
| 3469 | `_fireHitscan()` | 54 |
| 3523 | `_targetFromHit()` | 9 |
| 3532 | `_penetrationExit()` | 20 |
| 3552 | `_surfaceOf()` | 27 |
| 3579 | `_armoredTarget()` | 3 |
| 3582 | `_fleshImpact()` | 38 |
| 3620 | `_fxVoice()` | 9 |
| 3629 | `_impactSfx()` | 17 |
| 3646 | `_tintFx()` | 16 |
| 3662 | `_damage()` | 42 |
| 3704 | `_playerHurtFx()` | 6 |
| 3710 | `_kill()` | 67 |
| 3777 | `_checkArenaWin()` | 30 |
| 3807 | `_dmgArc()` | 79 |
| 3886 | `_mkBanner()` | 11 |
| 3897 | `_acertoPrevisto()` | 5 |
| 3902 | `_hitmarker()` | 15 |
| 3917 | `_dmgNumber()` | 20 |
| 3937 | `_feed()` | 19 |
| 3956 | `_skullIcon()` | 6 |
| 3962 | `_killfeedWeaponIcon()` | 9 |
| 3971 | `_wpnIcon()` | 64 |
| 4035 | `_tracer()` | 25 |
| 4060 | `_puff()` | 39 |
| 4099 | `_holeDecalMat()` | 8 |
| 4107 | `_flash()` | 68 |
| 4175 | `_muzzleWorld()` | 22 |
| 4197 | `_aimOrigin()` | 5 |
| 4202 | `_updateDoors()` | 10 |
| 4212 | `_updateFx()` | 57 |
| 4269 | `_ejectCasing()` | 17 |
| 4286 | `_makeCtfFlagTex()` | 23 |
| 4309 | `_paintFlagSymbol()` | 9 |
| 4318 | `_flagTexFor()` | 26 |
| 4344 | `_legadoSimbolo()` | 8 |
| 4352 | `_loadCtfSymbols()` | 22 |
| 4374 | `_makeCtfZoneTex()` | 31 |
| 4405 | `_makeSmokeTex()` | 8 |
| 4413 | `_updateSmokeHud()` | 4 |
| 4417 | `_grenadeSpatial()` | 14 |
| 4431 | `_spawnGrenade()` | 16 |
| 4447 | `_throwSmoke()` | 11 |
| 4458 | `_throwFrag()` | 13 |
| 4471 | `_explodeFrag()` | 40 |
| 4511 | `_corDaFumaca()` | 15 |
| 4526 | `_popSmoke()` | 21 |
| 4547 | `_updateGrenades()` | 35 |
| 4582 | `_teamColor()` | 15 |
| 4597 | `_teamInk()` | 7 |
| 4604 | `_factionOf()` | 1 |
| 4605 | `_voiceKey()` | 1 |
| 4606 | `_teamName()` | 1 |
| 4607 | `_teamTag()` | 6 |
| 4613 | `_plaqueta()` | 13 |
| 4626 | `_mirror()` | 3 |
| 4629 | `_botSeparation()` | 61 |
| 4690 | `_initCTF()` | 86 |
| 4776 | `_updateCTF()` | 61 |
| 4837 | `_ctfWin()` | 23 |
| 4860 | `_freeYaw()` | 25 |
| 4885 | `_pullString()` | 23 |
| 4908 | `_walkReach()` | 32 |
| 4940 | `_wpComp()` | 16 |
| 4956 | `_findPathLocal()` | 22 |
| 4978 | `_botCtf()` | 137 |
| 5115 | `_hideCtfHud()` | 6 |
| 5121 | `_updateCtfHud()` | 76 |
| 5197 | `_collide()` | 23 |
| 5220 | `_collideRot()` | 22 |
| 5242 | `_mantleAlcance()` | 50 |
| 5292 | `_mantleAlcancavel()` | 12 |
| 5304 | `_mantleTarget()` | 35 |
| 5339 | `_freeSpot()` | 30 |
| 5369 | `_retaAndavel()` | 20 |
| 5389 | `_walkDepth()` | 16 |
| 5405 | `_noteHit()` | 17 |
| 5422 | `_deathFeedback()` | 45 |
| 5467 | `_toggleCamView()` | 11 |
| 5478 | `_syncCamViewVis()` | 8 |
| 5486 | `_ensurePlayerTP()` | 25 |
| 5511 | `_updatePlayerTP()` | 35 |
| 5546 | `_tpDeath()` | 18 |
| 5564 | `_tpRevive()` | 13 |
| 5577 | `_moveEntity()` | 99 |
| 5676 | `_updatePlayer()` | 276 |
| 5952 | `_footstepSurface()` | 13 |
| 5965 | `_updatePickups()` | 148 |
| 6113 | `_wpnMode()` | 5 |
| 6118 | `_botWeapon()` | 10 |
| 6128 | `_municaoInfinita()` | 1 |
| 6129 | `_pickupAllowed()` | 7 |
| 6136 | `_grabPickup()` | 35 |
| 6171 | `_assentarNoChao()` | 10 |
| 6181 | `refreshPickupModels()` | 24 |
| 6205 | `_dropWeapon()` | 20 |
| 6225 | `_sumirDrop()` | 36 |
| 6261 | `_spawnY()` | 3 |
| 6264 | `_spawnYaw()` | 5 |
| 6269 | `_pickSpawn()` | 23 |
| 6292 | `_respawnPlayer()` | 34 |
| 6326 | `_losClear()` | 18 |
| 6344 | `_botCall()` | 41 |
| 6385 | `_teamMarkTex()` | 23 |
| 6408 | `_makeTeamMark()` | 16 |
| 6424 | `_syncRemoteWeapon()` | 22 |
| 6446 | `_updateTeamMark()` | 7 |
| 6453 | `_botEye()` | 1 |
| 6454 | `_enemyOf()` | 8 |
| 6462 | `_duelToken()` | 22 |
| 6484 | `_respawnEntity()` | 21 |
| 6505 | `_updateBot()` | 822 |
| 7327 | `_flushTraining()` | 13 |
| 7340 | `_updateBotNN()` | 73 |
| 7413 | `_botShootNN()` | 46 |
| 7459 | `_radarFoot()` | 38 |
| 7497 | `_updateRadar()` | 64 |
| 7561 | `_banner()` | 26 |
| 7587 | `_resultadoDaRodada()` | 4 |
| 7591 | `_showScoreboard()` | 49 |
| 7640 | `_updateWeaponHud()` | 35 |
| 7675 | `_updateHud()` | 87 |
| 7762 | `update()` | 86 |
| 7848 | `dispose()` | 44 |

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
