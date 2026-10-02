# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.20 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8269 | 322 |
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
| 822 | 6870 | `_updateBot()` | ⚠️ candidato a extração |
| 622 | 675 | `constructor()` | 🔴 append-only |
| 303 | 5992 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1397 | `_buildViewModels()` |  |
| 255 | 2544 | `_resetPositions()` |  |
| 158 | 6308 | `_updatePickups()` |  |
| 137 | 5241 | `_botCtf()` |  |
| 132 | 2128 | `_touchControls()` |  |
| 99 | 5893 | `_moveEntity()` |  |
| 90 | 8128 | `update()` | 🔴 append-only |
| 89 | 3529 | `_tryShoot()` |  |
| 88 | 8040 | `_updateHud()` |  |
| 86 | 4952 | `_initCTF()` |  |
| 79 | 3177 | `_ensureVmPrecisionQa()` |  |
| 79 | 4022 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `334–337` `412–506` `536–557` `1397–1806` `3143–3176` `3373–3464` `3483–3617` `3632–3647` `3692–3751` `4283–4308` `4356–4456` `4529–4545` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `173–176` `227–227` `253–264` `599–610` `3891–3991` `4891–4951` `5123–5377` `5460–5482` `5992–6294` `6691–6708` `6818–6848` `6870–7691` | — |
| **MAPAS / MUNDO** | `1343–1396` `2544–2798` `4952–5098` `6308–6465` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1821–1830` `1945–1983` `3051–3063` `4309–4347` `4472–4528` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1297–1342` `3003–3025` `3041–3050` `3064–3080` `4022–4100` `4150–4203` `4219–4282` `7862–7925` `7956–8004` `8040–8127` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8128–8217 · `_dom()` 1297–1342 · `constructor()` 675–1296

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3880 de 8269 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 156 | `PAUSE_ARM_MS` | 9 |
| 166 | `confirmGate` | 7 |
| 177 | `BOT_AIM_PITCH` | 4 |
| 181 | `BOT_DMG_PLAYER` | 21 |
| 202 | `BOT_FAIR` | 5 |
| 207 | `BOT_MOVE2` | 15 |
| 231 | `BOT_FOCUS_MIN` | 22 |
| 257 | `BOT_TOKEN_REST` | 7 |
| 265 | `MOVE_MUL` | 6 |
| 272 | `MOVE2` | 4 |
| 276 | `STEP_H` | 3 |
| 283 | `MANTLE_APOIO` | 4 |
| 287 | `MANTLE_GRID` | 5 |
| 292 | `RACK_OLD` | 4 |
| 296 | `RACK_RETA` | 25 |
| 323 | `RADIO` | 5 |
| 329 | `MK_LABELS` | 5 |
| 334 | `GUNFEEL` | 4 |
| 341 | `TRACER_STYLE` | 6 |
| 352 | `aberturaCone` | 12 |
| 364 | `anguloDeDisparo` | 4 |
| 368 | `coneDoDisparo` | 16 |
| 385 | `D2R` | 4 |
| 389 | `DMG_FALLOFF` | 5 |
| 394 | `HS_MUL` | 3 |
| 397 | `BALL_CLASS` | 15 |
| 412 | `STATIC_CLASS` | 75 |
| 488 | `VM_KNOB` | 19 |
| 507 | `vmAdsRot` | 4 |
| 512 | `vmFovForAspect` | 24 |
| 536 | `VM_OFF` | 22 |
| 558 | `vmOffY` | 35 |
| 593 | `VMP` | 6 |
| 599 | `BOT_SKILLS` | 11 |
| 611 | `diffKey` | 4 |
| 616 | `rollBotSkill` | 7 |
| 623 | `botTier` | 4 |
| 627 | `_cyclePool` | 4 |
| 631 | `_rosterPool` | 15 |
| 646 | `pickMatchRoster` | 12 |
| 658 | `BOT_WEAPON_POOL` | 5 |
| 663 | `pickMatchWeapons` | 9 |
| 675 | `constructor()` | 622 |
| 1297 | `_dom()` | 46 |
| 1343 | `_buildEnv()` | 54 |
| 1397 | `_buildViewModels()` | 269 |
| 1666 | `_vmFrame` | 141 |
| 1807 | `_vmMontarTardio` | 14 |
| 1821 | `_makePuffTexture()` | 10 |
| 1831 | `_makeBloodTex()` | 19 |
| 1850 | `_makeBloodPoolTex()` | 21 |
| 1871 | `_bloodDecal()` | 16 |
| 1887 | `_makeBloodFx()` | 20 |
| 1907 | `_bloodSpatter()` | 18 |
| 1925 | `_bloodPoolAt()` | 6 |
| 1931 | `_updateBlood()` | 14 |
| 1945 | `_makeFlashTex()` | 21 |
| 1966 | `_makeFlashSoftTex()` | 8 |
| 1974 | `_makeFlashCoreTex()` | 10 |
| 1984 | `_input()` | 2 |
| 1986 | `_kd` | 41 |
| 2027 | `_ku` | 4 |
| 2031 | `_md` | 38 |
| 2069 | `_mu` | 7 |
| 2076 | `_mm` | 15 |
| 2091 | `_wh` | 17 |
| 2108 | `_cc` | 1 |
| 2109 | `_blur` | 1 |
| 2110 | `_plc` | 18 |
| 2128 | `_touchControls()` | 132 |
| 2260 | `_aimAssist()` | 28 |
| 2288 | `_requestLock()` | 27 |
| 2315 | `_travaAtalhos()` | 4 |
| 2319 | `_soltaAtalhos()` | 5 |
| 2324 | `espectando()` | 2 |
| 2326 | `_acceptInput()` | 8 |
| 2334 | `_pauseBackdrop()` | 7 |
| 2341 | `_radioShow()` | 6 |
| 2347 | `_radioUi()` | 8 |
| 2355 | `_radioPick()` | 20 |
| 2375 | `_abilityNotice()` | 10 |
| 2385 | `_resetSliceAbilities()` | 9 |
| 2394 | `_stackTrace()` | 28 |
| 2422 | `_updateMotocaCharge()` | 10 |
| 2432 | `_recordRoutePoint()` | 11 |
| 2443 | `_routePing()` | 23 |
| 2466 | `_tickRoutePings()` | 12 |
| 2478 | `_objectiveInteractionMultiplier()` | 14 |
| 2492 | `start()` | 5 |
| 2497 | `_startAnnouncerLab()` | 9 |
| 2506 | `_startRound()` | 38 |
| 2544 | `_resetPositions()` | 255 |
| 2799 | `_checkCtfAlvo()` | 13 |
| 2812 | `_checkPace()` | 13 |
| 2825 | `_endRound()` | 34 |
| 2859 | `_roundWinnerVoice()` | 12 |
| 2871 | `_fimDaPartida()` | 7 |
| 2878 | `_endMatch()` | 61 |
| 2939 | `_ensureDolly()` | 41 |
| 2980 | `_tickDolly()` | 23 |
| 3003 | `setPaused()` | 23 |
| 3026 | `_now()` | 3 |
| 3029 | `pauseArmed()` | 1 |
| 3030 | `_syncPauseArm()` | 7 |
| 3037 | `resume()` | 4 |
| 3041 | `applySettings()` | 10 |
| 3051 | `_applyQuality()` | 13 |
| 3064 | `onResize()` | 17 |
| 3081 | `_switchTeam()` | 62 |
| 3143 | `_applyVmVisibility()` | 34 |
| 3177 | `_ensureVmPrecisionQa()` | 79 |
| 3256 | `_syncVmPresentation()` | 19 |
| 3275 | `_vmlabEnsure()` | 14 |
| 3289 | `_vmlabFrame()` | 28 |
| 3317 | `_tuneGet()` | 15 |
| 3332 | `_tune()` | 23 |
| 3355 | `_fxSet()` | 2 |
| 3357 | `_qaCicloArma()` | 8 |
| 3365 | `_cycleWeapon()` | 8 |
| 3373 | `_switchWeapon()` | 39 |
| 3412 | `_deploySfx()` | 7 |
| 3419 | `_scope()` | 17 |
| 3436 | `_zoomFov()` | 5 |
| 3441 | `_reloading()` | 1 |
| 3442 | `_startReload()` | 23 |
| 3465 | `_reloadLayers()` | 18 |
| 3483 | `_installRecoil()` | 33 |
| 3516 | `_shotRecoil()` | 13 |
| 3529 | `_tryShoot()` | 89 |
| 3618 | `_tryKnifeAttack()` | 14 |
| 3632 | `_meleeHit()` | 16 |
| 3648 | `_meleeRange()` | 5 |
| 3653 | `_botMelee()` | 28 |
| 3681 | `_shotDamage()` | 11 |
| 3692 | `_fireHitscan()` | 60 |
| 3752 | `_targetFromHit()` | 9 |
| 3761 | `_penetrationExit()` | 20 |
| 3781 | `_surfaceOf()` | 27 |
| 3808 | `_armoredTarget()` | 3 |
| 3811 | `_fleshImpact()` | 38 |
| 3849 | `_fxVoice()` | 9 |
| 3858 | `_impactSfx()` | 17 |
| 3875 | `_tintFx()` | 16 |
| 3891 | `_damage()` | 42 |
| 3933 | `_playerHurtFx()` | 6 |
| 3939 | `_kill()` | 53 |
| 3992 | `_checkArenaWin()` | 30 |
| 4022 | `_dmgArc()` | 79 |
| 4101 | `_mkBanner()` | 9 |
| 4110 | `_updateKillSequenceHud()` | 12 |
| 4122 | `_resetKillSequence()` | 5 |
| 4127 | `_playerKillFeedback()` | 18 |
| 4145 | `_acertoPrevisto()` | 5 |
| 4150 | `_hitmarker()` | 15 |
| 4165 | `_dmgNumber()` | 20 |
| 4185 | `_feed()` | 19 |
| 4204 | `_skullIcon()` | 6 |
| 4210 | `_killfeedWeaponIcon()` | 9 |
| 4219 | `_wpnIcon()` | 64 |
| 4283 | `_tracer()` | 26 |
| 4309 | `_puff()` | 39 |
| 4348 | `_holeDecalMat()` | 8 |
| 4356 | `_flash()` | 61 |
| 4417 | `_vmTetoTela()` | 10 |
| 4427 | `_muzzleWorld()` | 30 |
| 4457 | `_aimOrigin()` | 5 |
| 4462 | `_updateDoors()` | 10 |
| 4472 | `_updateFx()` | 57 |
| 4529 | `_ejectCasing()` | 17 |
| 4546 | `_makeCtfFlagTex()` | 23 |
| 4569 | `_paintFlagSymbol()` | 9 |
| 4578 | `_flagTexFor()` | 26 |
| 4604 | `_legadoSimbolo()` | 8 |
| 4612 | `_loadCtfSymbols()` | 22 |
| 4634 | `_makeCtfZoneTex()` | 31 |
| 4665 | `_makeSmokeTex()` | 10 |
| 4675 | `_updateSmokeHud()` | 4 |
| 4679 | `_grenadeSpatial()` | 14 |
| 4693 | `_spawnGrenade()` | 19 |
| 4712 | `_throwNade()` | 13 |
| 4725 | `_throwSmoke()` | 1 |
| 4726 | `_throwFrag()` | 4 |
| 4730 | `_explodeFrag()` | 40 |
| 4770 | `_corDaFumaca()` | 16 |
| 4786 | `_popSmoke()` | 23 |
| 4809 | `_updateGrenades()` | 35 |
| 4844 | `_teamColor()` | 15 |
| 4859 | `_teamInk()` | 7 |
| 4866 | `_factionOf()` | 1 |
| 4867 | `_voiceKey()` | 1 |
| 4868 | `_teamName()` | 1 |
| 4869 | `_teamTag()` | 6 |
| 4875 | `_plaqueta()` | 13 |
| 4888 | `_mirror()` | 3 |
| 4891 | `_botSeparation()` | 61 |
| 4952 | `_initCTF()` | 86 |
| 5038 | `_updateCTF()` | 61 |
| 5099 | `_ctfWin()` | 24 |
| 5123 | `_freeYaw()` | 25 |
| 5148 | `_pullString()` | 23 |
| 5171 | `_walkReach()` | 32 |
| 5203 | `_wpComp()` | 16 |
| 5219 | `_findPathLocal()` | 22 |
| 5241 | `_botCtf()` | 137 |
| 5378 | `_hideCtfHud()` | 6 |
| 5384 | `_updateCtfHud()` | 76 |
| 5460 | `_collide()` | 23 |
| 5483 | `_collideRot()` | 22 |
| 5505 | `_mantleAlcance()` | 50 |
| 5555 | `_mantleAlcancavel()` | 12 |
| 5567 | `_mantleTarget()` | 35 |
| 5602 | `_freeSpot()` | 30 |
| 5632 | `_retaAndavel()` | 20 |
| 5652 | `_walkDepth()` | 16 |
| 5668 | `_noteHit()` | 17 |
| 5685 | `_deathFeedback()` | 45 |
| 5730 | `_toggleCamView()` | 6 |
| 5736 | `setCamView()` | 14 |
| 5750 | `_syncCamViewVis()` | 8 |
| 5758 | `_ensurePlayerTP()` | 25 |
| 5783 | `_updatePlayerTP()` | 39 |
| 5822 | `_updateCrosshairParallax()` | 40 |
| 5862 | `_tpDeath()` | 18 |
| 5880 | `_tpRevive()` | 13 |
| 5893 | `_moveEntity()` | 99 |
| 5992 | `_updatePlayer()` | 303 |
| 6295 | `_footstepSurface()` | 13 |
| 6308 | `_updatePickups()` | 158 |
| 6466 | `_wpnMode()` | 5 |
| 6471 | `_botWeapon()` | 10 |
| 6481 | `_municaoInfinita()` | 1 |
| 6482 | `_pickupAllowed()` | 9 |
| 6491 | `_grabNearPickup()` | 10 |
| 6501 | `_grabPickup()` | 35 |
| 6536 | `_assentarNoChao()` | 10 |
| 6546 | `refreshPickupModels()` | 24 |
| 6570 | `_dropWeapon()` | 20 |
| 6590 | `_sumirDrop()` | 36 |
| 6626 | `_spawnY()` | 3 |
| 6629 | `_spawnYaw()` | 5 |
| 6634 | `_pickSpawn()` | 23 |
| 6657 | `_respawnPlayer()` | 34 |
| 6691 | `_losClear()` | 18 |
| 6709 | `_botCall()` | 41 |
| 6750 | `_teamMarkTex()` | 23 |
| 6773 | `_makeTeamMark()` | 16 |
| 6789 | `_syncRemoteWeapon()` | 22 |
| 6811 | `_updateTeamMark()` | 7 |
| 6818 | `_botEye()` | 1 |
| 6819 | `_enemyOf()` | 8 |
| 6827 | `_duelToken()` | 22 |
| 6849 | `_respawnEntity()` | 21 |
| 6870 | `_updateBot()` | 822 |
| 7692 | `_flushTraining()` | 13 |
| 7705 | `_updateBotNN()` | 73 |
| 7778 | `_botShootNN()` | 46 |
| 7824 | `_radarFoot()` | 38 |
| 7862 | `_updateRadar()` | 64 |
| 7926 | `_banner()` | 26 |
| 7952 | `_resultadoDaRodada()` | 4 |
| 7956 | `_showScoreboard()` | 49 |
| 8005 | `_updateWeaponHud()` | 35 |
| 8040 | `_updateHud()` | 88 |
| 8128 | `update()` | 90 |
| 8218 | `dispose()` | 51 |

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
