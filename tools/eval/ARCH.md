# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.17 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8194 | 316 |
| `public/js/main.js` | 4217 | 323 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3308 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6796 | `_updateBot()` | ⚠️ candidato a extração |
| 628 | 662 | `constructor()` | 🔴 append-only |
| 298 | 5923 | `_updatePlayer()` |  |
| 269 | 1390 | `_buildViewModels()` |  |
| 255 | 2551 | `_resetPositions()` |  |
| 158 | 6234 | `_updatePickups()` |  |
| 137 | 5214 | `_botCtf()` |  |
| 135 | 2112 | `_touchControls()` |  |
| 99 | 5824 | `_moveEntity()` |  |
| 90 | 8054 | `update()` | 🔴 append-only |
| 88 | 7966 | `_updateHud()` |  |
| 86 | 4925 | `_initCTF()` |  |
| 85 | 3529 | `_tryShoot()` |  |
| 79 | 3184 | `_ensureVmPrecisionQa()` |  |
| 79 | 4012 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `334–337` `402–496` `523–544` `1390–1799` `3150–3183` `3371–3464` `3483–3613` `3628–3643` `3688–3741` `4273–4297` `4345–4434` `4507–4523` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `173–176` `227–227` `253–264` `586–597` `3881–3981` `4864–4924` `5096–5350` `5433–5455` `5923–6220` `6617–6634` `6744–6774` `6796–7617` | — |
| **MAPAS / MUNDO** | `1336–1389` `2551–2805` `4925–5071` `6234–6391` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1814–1823` `1938–1969` `3058–3070` `4298–4336` `4450–4506` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1290–1335` `3010–3032` `3048–3057` `3071–3087` `4012–4090` `4140–4193` `4209–4272` `7788–7851` `7882–7930` `7966–8053` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8054–8143 · `_dom()` 1290–1335 · `constructor()` 662–1289

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3866 de 8194 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 153 | `PAUSE_ARM_MS` | 3 |
| 156 | `CHAT_PAUSA_GUARDA_MS` | 9 |
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
| 340 | `TRACER_STYLE` | 6 |
| 351 | `coneDoDisparo` | 23 |
| 375 | `D2R` | 4 |
| 379 | `DMG_FALLOFF` | 5 |
| 384 | `HS_MUL` | 3 |
| 387 | `BALL_CLASS` | 15 |
| 402 | `STATIC_CLASS` | 75 |
| 478 | `VM_KNOB` | 19 |
| 499 | `vmFovForAspect` | 24 |
| 523 | `VM_OFF` | 22 |
| 545 | `vmOffY` | 35 |
| 580 | `VMP` | 6 |
| 586 | `BOT_SKILLS` | 11 |
| 598 | `diffKey` | 4 |
| 603 | `rollBotSkill` | 7 |
| 610 | `botTier` | 4 |
| 614 | `_cyclePool` | 4 |
| 618 | `_rosterPool` | 15 |
| 633 | `pickMatchRoster` | 12 |
| 645 | `BOT_WEAPON_POOL` | 5 |
| 650 | `pickMatchWeapons` | 9 |
| 662 | `constructor()` | 628 |
| 1290 | `_dom()` | 46 |
| 1336 | `_buildEnv()` | 54 |
| 1390 | `_buildViewModels()` | 269 |
| 1659 | `_vmFrame` | 141 |
| 1800 | `_vmMontarTardio` | 14 |
| 1814 | `_makePuffTexture()` | 10 |
| 1824 | `_makeBloodTex()` | 19 |
| 1843 | `_makeBloodPoolTex()` | 21 |
| 1864 | `_bloodDecal()` | 16 |
| 1880 | `_makeBloodFx()` | 20 |
| 1900 | `_bloodSpatter()` | 18 |
| 1918 | `_bloodPoolAt()` | 6 |
| 1924 | `_updateBlood()` | 14 |
| 1938 | `_makeFlashTex()` | 22 |
| 1960 | `_makeFlashCoreTex()` | 10 |
| 1970 | `_input()` | 6 |
| 1976 | `_kd` | 49 |
| 2025 | `_ku` | 5 |
| 2030 | `_md` | 40 |
| 2070 | `_mu` | 7 |
| 2077 | `_mm` | 15 |
| 2092 | `_cc` | 1 |
| 2093 | `_blur` | 1 |
| 2094 | `_plc` | 18 |
| 2112 | `_touchControls()` | 135 |
| 2247 | `_aimAssist()` | 28 |
| 2275 | `_requestLock()` | 27 |
| 2302 | `_travaAtalhos()` | 4 |
| 2306 | `_soltaAtalhos()` | 5 |
| 2311 | `espectando()` | 2 |
| 2313 | `_acceptInput()` | 7 |
| 2320 | `travarEntrada()` | 17 |
| 2337 | `_chatSeguraPausa()` | 5 |
| 2342 | `_pauseBackdrop()` | 7 |
| 2349 | `_radioShow()` | 6 |
| 2355 | `_radioUi()` | 8 |
| 2363 | `_radioPick()` | 19 |
| 2382 | `_abilityNotice()` | 10 |
| 2392 | `_resetSliceAbilities()` | 9 |
| 2401 | `_stackTrace()` | 28 |
| 2429 | `_updateMotocaCharge()` | 10 |
| 2439 | `_recordRoutePoint()` | 11 |
| 2450 | `_routePing()` | 23 |
| 2473 | `_tickRoutePings()` | 12 |
| 2485 | `_objectiveInteractionMultiplier()` | 14 |
| 2499 | `start()` | 5 |
| 2504 | `_startAnnouncerLab()` | 9 |
| 2513 | `_startRound()` | 38 |
| 2551 | `_resetPositions()` | 255 |
| 2806 | `_checkCtfAlvo()` | 13 |
| 2819 | `_checkPace()` | 13 |
| 2832 | `_endRound()` | 34 |
| 2866 | `_roundWinnerVoice()` | 12 |
| 2878 | `_fimDaPartida()` | 7 |
| 2885 | `_endMatch()` | 61 |
| 2946 | `_ensureDolly()` | 41 |
| 2987 | `_tickDolly()` | 23 |
| 3010 | `setPaused()` | 23 |
| 3033 | `_now()` | 3 |
| 3036 | `pauseArmed()` | 1 |
| 3037 | `_syncPauseArm()` | 7 |
| 3044 | `resume()` | 4 |
| 3048 | `applySettings()` | 10 |
| 3058 | `_applyQuality()` | 13 |
| 3071 | `onResize()` | 17 |
| 3088 | `_switchTeam()` | 62 |
| 3150 | `_applyVmVisibility()` | 34 |
| 3184 | `_ensureVmPrecisionQa()` | 79 |
| 3263 | `_syncVmPresentation()` | 19 |
| 3282 | `_vmlabEnsure()` | 14 |
| 3296 | `_vmlabFrame()` | 28 |
| 3324 | `_tuneGet()` | 15 |
| 3339 | `_tune()` | 23 |
| 3362 | `_fxSet()` | 2 |
| 3364 | `_qaCicloArma()` | 7 |
| 3371 | `_switchWeapon()` | 39 |
| 3410 | `_deploySfx()` | 7 |
| 3417 | `_scope()` | 17 |
| 3434 | `_zoomFov()` | 7 |
| 3441 | `_reloading()` | 1 |
| 3442 | `_startReload()` | 23 |
| 3465 | `_reloadLayers()` | 18 |
| 3483 | `_installRecoil()` | 33 |
| 3516 | `_shotRecoil()` | 13 |
| 3529 | `_tryShoot()` | 85 |
| 3614 | `_tryKnifeAttack()` | 14 |
| 3628 | `_meleeHit()` | 16 |
| 3644 | `_meleeRange()` | 5 |
| 3649 | `_botMelee()` | 28 |
| 3677 | `_shotDamage()` | 11 |
| 3688 | `_fireHitscan()` | 54 |
| 3742 | `_targetFromHit()` | 9 |
| 3751 | `_penetrationExit()` | 20 |
| 3771 | `_surfaceOf()` | 27 |
| 3798 | `_armoredTarget()` | 3 |
| 3801 | `_fleshImpact()` | 38 |
| 3839 | `_fxVoice()` | 9 |
| 3848 | `_impactSfx()` | 17 |
| 3865 | `_tintFx()` | 16 |
| 3881 | `_damage()` | 42 |
| 3923 | `_playerHurtFx()` | 6 |
| 3929 | `_kill()` | 53 |
| 3982 | `_checkArenaWin()` | 30 |
| 4012 | `_dmgArc()` | 79 |
| 4091 | `_mkBanner()` | 9 |
| 4100 | `_updateKillSequenceHud()` | 12 |
| 4112 | `_resetKillSequence()` | 5 |
| 4117 | `_playerKillFeedback()` | 18 |
| 4135 | `_acertoPrevisto()` | 5 |
| 4140 | `_hitmarker()` | 15 |
| 4155 | `_dmgNumber()` | 20 |
| 4175 | `_feed()` | 19 |
| 4194 | `_skullIcon()` | 6 |
| 4200 | `_killfeedWeaponIcon()` | 9 |
| 4209 | `_wpnIcon()` | 64 |
| 4273 | `_tracer()` | 25 |
| 4298 | `_puff()` | 39 |
| 4337 | `_holeDecalMat()` | 8 |
| 4345 | `_flash()` | 68 |
| 4413 | `_muzzleWorld()` | 22 |
| 4435 | `_aimOrigin()` | 5 |
| 4440 | `_updateDoors()` | 10 |
| 4450 | `_updateFx()` | 57 |
| 4507 | `_ejectCasing()` | 17 |
| 4524 | `_makeCtfFlagTex()` | 23 |
| 4547 | `_paintFlagSymbol()` | 9 |
| 4556 | `_flagTexFor()` | 26 |
| 4582 | `_legadoSimbolo()` | 8 |
| 4590 | `_loadCtfSymbols()` | 22 |
| 4612 | `_makeCtfZoneTex()` | 31 |
| 4643 | `_makeSmokeTex()` | 8 |
| 4651 | `_updateSmokeHud()` | 4 |
| 4655 | `_grenadeSpatial()` | 14 |
| 4669 | `_spawnGrenade()` | 19 |
| 4688 | `_throwNade()` | 13 |
| 4701 | `_throwSmoke()` | 1 |
| 4702 | `_throwFrag()` | 4 |
| 4706 | `_explodeFrag()` | 40 |
| 4746 | `_corDaFumaca()` | 15 |
| 4761 | `_popSmoke()` | 21 |
| 4782 | `_updateGrenades()` | 35 |
| 4817 | `_teamColor()` | 15 |
| 4832 | `_teamInk()` | 7 |
| 4839 | `_factionOf()` | 1 |
| 4840 | `_voiceKey()` | 1 |
| 4841 | `_teamName()` | 1 |
| 4842 | `_teamTag()` | 6 |
| 4848 | `_plaqueta()` | 13 |
| 4861 | `_mirror()` | 3 |
| 4864 | `_botSeparation()` | 61 |
| 4925 | `_initCTF()` | 86 |
| 5011 | `_updateCTF()` | 61 |
| 5072 | `_ctfWin()` | 24 |
| 5096 | `_freeYaw()` | 25 |
| 5121 | `_pullString()` | 23 |
| 5144 | `_walkReach()` | 32 |
| 5176 | `_wpComp()` | 16 |
| 5192 | `_findPathLocal()` | 22 |
| 5214 | `_botCtf()` | 137 |
| 5351 | `_hideCtfHud()` | 6 |
| 5357 | `_updateCtfHud()` | 76 |
| 5433 | `_collide()` | 23 |
| 5456 | `_collideRot()` | 22 |
| 5478 | `_mantleAlcance()` | 50 |
| 5528 | `_mantleAlcancavel()` | 12 |
| 5540 | `_mantleTarget()` | 35 |
| 5575 | `_freeSpot()` | 30 |
| 5605 | `_retaAndavel()` | 20 |
| 5625 | `_walkDepth()` | 16 |
| 5641 | `_noteHit()` | 17 |
| 5658 | `_deathFeedback()` | 45 |
| 5703 | `_toggleCamView()` | 6 |
| 5709 | `setCamView()` | 14 |
| 5723 | `_syncCamViewVis()` | 8 |
| 5731 | `_ensurePlayerTP()` | 25 |
| 5756 | `_updatePlayerTP()` | 37 |
| 5793 | `_tpDeath()` | 18 |
| 5811 | `_tpRevive()` | 13 |
| 5824 | `_moveEntity()` | 99 |
| 5923 | `_updatePlayer()` | 298 |
| 6221 | `_footstepSurface()` | 13 |
| 6234 | `_updatePickups()` | 158 |
| 6392 | `_wpnMode()` | 5 |
| 6397 | `_botWeapon()` | 10 |
| 6407 | `_municaoInfinita()` | 1 |
| 6408 | `_pickupAllowed()` | 9 |
| 6417 | `_grabNearPickup()` | 10 |
| 6427 | `_grabPickup()` | 35 |
| 6462 | `_assentarNoChao()` | 10 |
| 6472 | `refreshPickupModels()` | 24 |
| 6496 | `_dropWeapon()` | 20 |
| 6516 | `_sumirDrop()` | 36 |
| 6552 | `_spawnY()` | 3 |
| 6555 | `_spawnYaw()` | 5 |
| 6560 | `_pickSpawn()` | 23 |
| 6583 | `_respawnPlayer()` | 34 |
| 6617 | `_losClear()` | 18 |
| 6635 | `_botCall()` | 41 |
| 6676 | `_teamMarkTex()` | 23 |
| 6699 | `_makeTeamMark()` | 16 |
| 6715 | `_syncRemoteWeapon()` | 22 |
| 6737 | `_updateTeamMark()` | 7 |
| 6744 | `_botEye()` | 1 |
| 6745 | `_enemyOf()` | 8 |
| 6753 | `_duelToken()` | 22 |
| 6775 | `_respawnEntity()` | 21 |
| 6796 | `_updateBot()` | 822 |
| 7618 | `_flushTraining()` | 13 |
| 7631 | `_updateBotNN()` | 73 |
| 7704 | `_botShootNN()` | 46 |
| 7750 | `_radarFoot()` | 38 |
| 7788 | `_updateRadar()` | 64 |
| 7852 | `_banner()` | 26 |
| 7878 | `_resultadoDaRodada()` | 4 |
| 7882 | `_showScoreboard()` | 49 |
| 7931 | `_updateWeaponHud()` | 35 |
| 7966 | `_updateHud()` | 88 |
| 8054 | `update()` | 90 |
| 8144 | `dispose()` | 50 |

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
