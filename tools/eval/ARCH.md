# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.14 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8193 | 316 |
| `public/js/main.js` | 4207 | 323 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3306 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6795 | `_updateBot()` | ⚠️ candidato a extração |
| 621 | 668 | `constructor()` | 🔴 append-only |
| 302 | 5918 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1389 | `_buildViewModels()` |  |
| 255 | 2510 | `_resetPositions()` |  |
| 158 | 6233 | `_updatePickups()` |  |
| 137 | 5167 | `_botCtf()` |  |
| 132 | 2095 | `_touchControls()` |  |
| 99 | 5819 | `_moveEntity()` |  |
| 90 | 8053 | `update()` | 🔴 append-only |
| 89 | 3486 | `_tryShoot()` |  |
| 88 | 7965 | `_updateHud()` |  |
| 86 | 4878 | `_initCTF()` |  |
| 79 | 3143 | `_ensureVmPrecisionQa()` |  |
| 79 | 3973 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `331–334` `408–502` `529–550` `1389–1798` `3109–3142` `3330–3421` `3440–3574` `3589–3604` `3649–3702` `4234–4258` `4306–4382` `4455–4471` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `170–173` `224–224` `250–261` `592–603` `3842–3942` `4817–4877` `5049–5303` `5386–5408` `5918–6219` `6616–6633` `6743–6773` `6795–7616` | — |
| **MAPAS / MUNDO** | `1335–1388` `2510–2764` `4878–5024` `6233–6390` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1813–1822` `1937–1968` `3017–3029` `4259–4297` `4398–4454` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1289–1334` `2969–2991` `3007–3016` `3030–3046` `3973–4051` `4101–4154` `4170–4233` `7787–7850` `7881–7929` `7965–8052` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8053–8142 · `_dom()` 1289–1334 · `constructor()` 668–1288

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3859 de 8193 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 337 | `TRACER_STYLE` | 6 |
| 348 | `aberturaCone` | 12 |
| 360 | `anguloDeDisparo` | 4 |
| 364 | `coneDoDisparo` | 16 |
| 381 | `D2R` | 4 |
| 385 | `DMG_FALLOFF` | 5 |
| 390 | `HS_MUL` | 3 |
| 393 | `BALL_CLASS` | 15 |
| 408 | `STATIC_CLASS` | 75 |
| 484 | `VM_KNOB` | 19 |
| 505 | `vmFovForAspect` | 24 |
| 529 | `VM_OFF` | 22 |
| 551 | `vmOffY` | 35 |
| 586 | `VMP` | 6 |
| 592 | `BOT_SKILLS` | 11 |
| 604 | `diffKey` | 4 |
| 609 | `rollBotSkill` | 7 |
| 616 | `botTier` | 4 |
| 620 | `_cyclePool` | 4 |
| 624 | `_rosterPool` | 15 |
| 639 | `pickMatchRoster` | 12 |
| 651 | `BOT_WEAPON_POOL` | 5 |
| 656 | `pickMatchWeapons` | 9 |
| 668 | `constructor()` | 621 |
| 1289 | `_dom()` | 46 |
| 1335 | `_buildEnv()` | 54 |
| 1389 | `_buildViewModels()` | 269 |
| 1658 | `_vmFrame` | 141 |
| 1799 | `_vmMontarTardio` | 14 |
| 1813 | `_makePuffTexture()` | 10 |
| 1823 | `_makeBloodTex()` | 19 |
| 1842 | `_makeBloodPoolTex()` | 21 |
| 1863 | `_bloodDecal()` | 16 |
| 1879 | `_makeBloodFx()` | 20 |
| 1899 | `_bloodSpatter()` | 18 |
| 1917 | `_bloodPoolAt()` | 6 |
| 1923 | `_updateBlood()` | 14 |
| 1937 | `_makeFlashTex()` | 22 |
| 1959 | `_makeFlashCoreTex()` | 10 |
| 1969 | `_input()` | 2 |
| 1971 | `_kd` | 41 |
| 2012 | `_ku` | 4 |
| 2016 | `_md` | 38 |
| 2054 | `_mu` | 7 |
| 2061 | `_mm` | 15 |
| 2076 | `_cc` | 1 |
| 2077 | `_blur` | 1 |
| 2078 | `_plc` | 17 |
| 2095 | `_touchControls()` | 132 |
| 2227 | `_aimAssist()` | 28 |
| 2255 | `_requestLock()` | 27 |
| 2282 | `_travaAtalhos()` | 4 |
| 2286 | `_soltaAtalhos()` | 5 |
| 2291 | `espectando()` | 2 |
| 2293 | `_acceptInput()` | 8 |
| 2301 | `_pauseBackdrop()` | 7 |
| 2308 | `_radioShow()` | 6 |
| 2314 | `_radioUi()` | 8 |
| 2322 | `_radioPick()` | 19 |
| 2341 | `_abilityNotice()` | 10 |
| 2351 | `_resetSliceAbilities()` | 9 |
| 2360 | `_stackTrace()` | 28 |
| 2388 | `_updateMotocaCharge()` | 10 |
| 2398 | `_recordRoutePoint()` | 11 |
| 2409 | `_routePing()` | 23 |
| 2432 | `_tickRoutePings()` | 12 |
| 2444 | `_objectiveInteractionMultiplier()` | 14 |
| 2458 | `start()` | 5 |
| 2463 | `_startAnnouncerLab()` | 9 |
| 2472 | `_startRound()` | 38 |
| 2510 | `_resetPositions()` | 255 |
| 2765 | `_checkCtfAlvo()` | 13 |
| 2778 | `_checkPace()` | 13 |
| 2791 | `_endRound()` | 34 |
| 2825 | `_roundWinnerVoice()` | 12 |
| 2837 | `_fimDaPartida()` | 7 |
| 2844 | `_endMatch()` | 61 |
| 2905 | `_ensureDolly()` | 41 |
| 2946 | `_tickDolly()` | 23 |
| 2969 | `setPaused()` | 23 |
| 2992 | `_now()` | 3 |
| 2995 | `pauseArmed()` | 1 |
| 2996 | `_syncPauseArm()` | 7 |
| 3003 | `resume()` | 4 |
| 3007 | `applySettings()` | 10 |
| 3017 | `_applyQuality()` | 13 |
| 3030 | `onResize()` | 17 |
| 3047 | `_switchTeam()` | 62 |
| 3109 | `_applyVmVisibility()` | 34 |
| 3143 | `_ensureVmPrecisionQa()` | 79 |
| 3222 | `_syncVmPresentation()` | 19 |
| 3241 | `_vmlabEnsure()` | 14 |
| 3255 | `_vmlabFrame()` | 28 |
| 3283 | `_tuneGet()` | 15 |
| 3298 | `_tune()` | 23 |
| 3321 | `_fxSet()` | 2 |
| 3323 | `_qaCicloArma()` | 7 |
| 3330 | `_switchWeapon()` | 39 |
| 3369 | `_deploySfx()` | 7 |
| 3376 | `_scope()` | 17 |
| 3393 | `_zoomFov()` | 5 |
| 3398 | `_reloading()` | 1 |
| 3399 | `_startReload()` | 23 |
| 3422 | `_reloadLayers()` | 18 |
| 3440 | `_installRecoil()` | 33 |
| 3473 | `_shotRecoil()` | 13 |
| 3486 | `_tryShoot()` | 89 |
| 3575 | `_tryKnifeAttack()` | 14 |
| 3589 | `_meleeHit()` | 16 |
| 3605 | `_meleeRange()` | 5 |
| 3610 | `_botMelee()` | 28 |
| 3638 | `_shotDamage()` | 11 |
| 3649 | `_fireHitscan()` | 54 |
| 3703 | `_targetFromHit()` | 9 |
| 3712 | `_penetrationExit()` | 20 |
| 3732 | `_surfaceOf()` | 27 |
| 3759 | `_armoredTarget()` | 3 |
| 3762 | `_fleshImpact()` | 38 |
| 3800 | `_fxVoice()` | 9 |
| 3809 | `_impactSfx()` | 17 |
| 3826 | `_tintFx()` | 16 |
| 3842 | `_damage()` | 42 |
| 3884 | `_playerHurtFx()` | 6 |
| 3890 | `_kill()` | 53 |
| 3943 | `_checkArenaWin()` | 30 |
| 3973 | `_dmgArc()` | 79 |
| 4052 | `_mkBanner()` | 9 |
| 4061 | `_updateKillSequenceHud()` | 12 |
| 4073 | `_resetKillSequence()` | 5 |
| 4078 | `_playerKillFeedback()` | 18 |
| 4096 | `_acertoPrevisto()` | 5 |
| 4101 | `_hitmarker()` | 15 |
| 4116 | `_dmgNumber()` | 20 |
| 4136 | `_feed()` | 19 |
| 4155 | `_skullIcon()` | 6 |
| 4161 | `_killfeedWeaponIcon()` | 9 |
| 4170 | `_wpnIcon()` | 64 |
| 4234 | `_tracer()` | 25 |
| 4259 | `_puff()` | 39 |
| 4298 | `_holeDecalMat()` | 8 |
| 4306 | `_flash()` | 55 |
| 4361 | `_muzzleWorld()` | 22 |
| 4383 | `_aimOrigin()` | 5 |
| 4388 | `_updateDoors()` | 10 |
| 4398 | `_updateFx()` | 57 |
| 4455 | `_ejectCasing()` | 17 |
| 4472 | `_makeCtfFlagTex()` | 23 |
| 4495 | `_paintFlagSymbol()` | 9 |
| 4504 | `_flagTexFor()` | 26 |
| 4530 | `_legadoSimbolo()` | 8 |
| 4538 | `_loadCtfSymbols()` | 22 |
| 4560 | `_makeCtfZoneTex()` | 31 |
| 4591 | `_makeSmokeTex()` | 10 |
| 4601 | `_updateSmokeHud()` | 4 |
| 4605 | `_grenadeSpatial()` | 14 |
| 4619 | `_spawnGrenade()` | 19 |
| 4638 | `_throwNade()` | 13 |
| 4651 | `_throwSmoke()` | 1 |
| 4652 | `_throwFrag()` | 4 |
| 4656 | `_explodeFrag()` | 40 |
| 4696 | `_corDaFumaca()` | 16 |
| 4712 | `_popSmoke()` | 23 |
| 4735 | `_updateGrenades()` | 35 |
| 4770 | `_teamColor()` | 15 |
| 4785 | `_teamInk()` | 7 |
| 4792 | `_factionOf()` | 1 |
| 4793 | `_voiceKey()` | 1 |
| 4794 | `_teamName()` | 1 |
| 4795 | `_teamTag()` | 6 |
| 4801 | `_plaqueta()` | 13 |
| 4814 | `_mirror()` | 3 |
| 4817 | `_botSeparation()` | 61 |
| 4878 | `_initCTF()` | 86 |
| 4964 | `_updateCTF()` | 61 |
| 5025 | `_ctfWin()` | 24 |
| 5049 | `_freeYaw()` | 25 |
| 5074 | `_pullString()` | 23 |
| 5097 | `_walkReach()` | 32 |
| 5129 | `_wpComp()` | 16 |
| 5145 | `_findPathLocal()` | 22 |
| 5167 | `_botCtf()` | 137 |
| 5304 | `_hideCtfHud()` | 6 |
| 5310 | `_updateCtfHud()` | 76 |
| 5386 | `_collide()` | 23 |
| 5409 | `_collideRot()` | 22 |
| 5431 | `_mantleAlcance()` | 50 |
| 5481 | `_mantleAlcancavel()` | 12 |
| 5493 | `_mantleTarget()` | 35 |
| 5528 | `_freeSpot()` | 30 |
| 5558 | `_retaAndavel()` | 20 |
| 5578 | `_walkDepth()` | 16 |
| 5594 | `_noteHit()` | 17 |
| 5611 | `_deathFeedback()` | 45 |
| 5656 | `_toggleCamView()` | 6 |
| 5662 | `setCamView()` | 14 |
| 5676 | `_syncCamViewVis()` | 8 |
| 5684 | `_ensurePlayerTP()` | 25 |
| 5709 | `_updatePlayerTP()` | 39 |
| 5748 | `_updateCrosshairParallax()` | 40 |
| 5788 | `_tpDeath()` | 18 |
| 5806 | `_tpRevive()` | 13 |
| 5819 | `_moveEntity()` | 99 |
| 5918 | `_updatePlayer()` | 302 |
| 6220 | `_footstepSurface()` | 13 |
| 6233 | `_updatePickups()` | 158 |
| 6391 | `_wpnMode()` | 5 |
| 6396 | `_botWeapon()` | 10 |
| 6406 | `_municaoInfinita()` | 1 |
| 6407 | `_pickupAllowed()` | 9 |
| 6416 | `_grabNearPickup()` | 10 |
| 6426 | `_grabPickup()` | 35 |
| 6461 | `_assentarNoChao()` | 10 |
| 6471 | `refreshPickupModels()` | 24 |
| 6495 | `_dropWeapon()` | 20 |
| 6515 | `_sumirDrop()` | 36 |
| 6551 | `_spawnY()` | 3 |
| 6554 | `_spawnYaw()` | 5 |
| 6559 | `_pickSpawn()` | 23 |
| 6582 | `_respawnPlayer()` | 34 |
| 6616 | `_losClear()` | 18 |
| 6634 | `_botCall()` | 41 |
| 6675 | `_teamMarkTex()` | 23 |
| 6698 | `_makeTeamMark()` | 16 |
| 6714 | `_syncRemoteWeapon()` | 22 |
| 6736 | `_updateTeamMark()` | 7 |
| 6743 | `_botEye()` | 1 |
| 6744 | `_enemyOf()` | 8 |
| 6752 | `_duelToken()` | 22 |
| 6774 | `_respawnEntity()` | 21 |
| 6795 | `_updateBot()` | 822 |
| 7617 | `_flushTraining()` | 13 |
| 7630 | `_updateBotNN()` | 73 |
| 7703 | `_botShootNN()` | 46 |
| 7749 | `_radarFoot()` | 38 |
| 7787 | `_updateRadar()` | 64 |
| 7851 | `_banner()` | 26 |
| 7877 | `_resultadoDaRodada()` | 4 |
| 7881 | `_showScoreboard()` | 49 |
| 7930 | `_updateWeaponHud()` | 35 |
| 7965 | `_updateHud()` | 88 |
| 8053 | `update()` | 90 |
| 8143 | `dispose()` | 50 |

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
