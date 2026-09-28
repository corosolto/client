# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.8 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8211 | 316 |
| `public/js/main.js` | 4108 | 317 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3311 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6813 | `_updateBot()` | ⚠️ candidato a extração |
| 626 | 668 | `constructor()` | 🔴 append-only |
| 302 | 5936 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1394 | `_buildViewModels()` |  |
| 255 | 2515 | `_resetPositions()` |  |
| 158 | 6251 | `_updatePickups()` |  |
| 137 | 5180 | `_botCtf()` |  |
| 132 | 2100 | `_touchControls()` |  |
| 99 | 5837 | `_moveEntity()` |  |
| 90 | 8071 | `update()` | 🔴 append-only |
| 89 | 3491 | `_tryShoot()` |  |
| 88 | 7983 | `_updateHud()` |  |
| 86 | 4891 | `_initCTF()` |  |
| 79 | 3148 | `_ensureVmPrecisionQa()` |  |
| 79 | 3978 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `331–334` `408–502` `529–550` `1394–1803` `3114–3147` `3335–3426` `3445–3579` `3594–3609` `3654–3707` `4239–4263` `4311–4400` `4473–4489` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `170–173` `224–224` `250–261` `592–603` `3847–3947` `4830–4890` `5062–5316` `5399–5421` `5936–6237` `6634–6651` `6761–6791` `6813–7634` | — |
| **MAPAS / MUNDO** | `1340–1393` `2515–2769` `4891–5037` `6251–6408` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1818–1827` `1942–1973` `3022–3034` `4264–4302` `4416–4472` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1294–1339` `2974–2996` `3012–3021` `3035–3051` `3978–4056` `4106–4159` `4175–4238` `7805–7868` `7899–7947` `7983–8070` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8071–8160 · `_dom()` 1294–1339 · `constructor()` 668–1293

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3872 de 8211 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 668 | `constructor()` | 626 |
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
| 1942 | `_makeFlashTex()` | 22 |
| 1964 | `_makeFlashCoreTex()` | 10 |
| 1974 | `_input()` | 2 |
| 1976 | `_kd` | 41 |
| 2017 | `_ku` | 4 |
| 2021 | `_md` | 38 |
| 2059 | `_mu` | 7 |
| 2066 | `_mm` | 15 |
| 2081 | `_cc` | 1 |
| 2082 | `_blur` | 1 |
| 2083 | `_plc` | 17 |
| 2100 | `_touchControls()` | 132 |
| 2232 | `_aimAssist()` | 28 |
| 2260 | `_requestLock()` | 27 |
| 2287 | `_travaAtalhos()` | 4 |
| 2291 | `_soltaAtalhos()` | 5 |
| 2296 | `espectando()` | 2 |
| 2298 | `_acceptInput()` | 8 |
| 2306 | `_pauseBackdrop()` | 7 |
| 2313 | `_radioShow()` | 6 |
| 2319 | `_radioUi()` | 8 |
| 2327 | `_radioPick()` | 19 |
| 2346 | `_abilityNotice()` | 10 |
| 2356 | `_resetSliceAbilities()` | 9 |
| 2365 | `_stackTrace()` | 28 |
| 2393 | `_updateMotocaCharge()` | 10 |
| 2403 | `_recordRoutePoint()` | 11 |
| 2414 | `_routePing()` | 23 |
| 2437 | `_tickRoutePings()` | 12 |
| 2449 | `_objectiveInteractionMultiplier()` | 14 |
| 2463 | `start()` | 5 |
| 2468 | `_startAnnouncerLab()` | 9 |
| 2477 | `_startRound()` | 38 |
| 2515 | `_resetPositions()` | 255 |
| 2770 | `_checkCtfAlvo()` | 13 |
| 2783 | `_checkPace()` | 13 |
| 2796 | `_endRound()` | 34 |
| 2830 | `_roundWinnerVoice()` | 12 |
| 2842 | `_fimDaPartida()` | 7 |
| 2849 | `_endMatch()` | 61 |
| 2910 | `_ensureDolly()` | 41 |
| 2951 | `_tickDolly()` | 23 |
| 2974 | `setPaused()` | 23 |
| 2997 | `_now()` | 3 |
| 3000 | `pauseArmed()` | 1 |
| 3001 | `_syncPauseArm()` | 7 |
| 3008 | `resume()` | 4 |
| 3012 | `applySettings()` | 10 |
| 3022 | `_applyQuality()` | 13 |
| 3035 | `onResize()` | 17 |
| 3052 | `_switchTeam()` | 62 |
| 3114 | `_applyVmVisibility()` | 34 |
| 3148 | `_ensureVmPrecisionQa()` | 79 |
| 3227 | `_syncVmPresentation()` | 19 |
| 3246 | `_vmlabEnsure()` | 14 |
| 3260 | `_vmlabFrame()` | 28 |
| 3288 | `_tuneGet()` | 15 |
| 3303 | `_tune()` | 23 |
| 3326 | `_fxSet()` | 2 |
| 3328 | `_qaCicloArma()` | 7 |
| 3335 | `_switchWeapon()` | 39 |
| 3374 | `_deploySfx()` | 7 |
| 3381 | `_scope()` | 17 |
| 3398 | `_zoomFov()` | 5 |
| 3403 | `_reloading()` | 1 |
| 3404 | `_startReload()` | 23 |
| 3427 | `_reloadLayers()` | 18 |
| 3445 | `_installRecoil()` | 33 |
| 3478 | `_shotRecoil()` | 13 |
| 3491 | `_tryShoot()` | 89 |
| 3580 | `_tryKnifeAttack()` | 14 |
| 3594 | `_meleeHit()` | 16 |
| 3610 | `_meleeRange()` | 5 |
| 3615 | `_botMelee()` | 28 |
| 3643 | `_shotDamage()` | 11 |
| 3654 | `_fireHitscan()` | 54 |
| 3708 | `_targetFromHit()` | 9 |
| 3717 | `_penetrationExit()` | 20 |
| 3737 | `_surfaceOf()` | 27 |
| 3764 | `_armoredTarget()` | 3 |
| 3767 | `_fleshImpact()` | 38 |
| 3805 | `_fxVoice()` | 9 |
| 3814 | `_impactSfx()` | 17 |
| 3831 | `_tintFx()` | 16 |
| 3847 | `_damage()` | 42 |
| 3889 | `_playerHurtFx()` | 6 |
| 3895 | `_kill()` | 53 |
| 3948 | `_checkArenaWin()` | 30 |
| 3978 | `_dmgArc()` | 79 |
| 4057 | `_mkBanner()` | 9 |
| 4066 | `_updateKillSequenceHud()` | 12 |
| 4078 | `_resetKillSequence()` | 5 |
| 4083 | `_playerKillFeedback()` | 18 |
| 4101 | `_acertoPrevisto()` | 5 |
| 4106 | `_hitmarker()` | 15 |
| 4121 | `_dmgNumber()` | 20 |
| 4141 | `_feed()` | 19 |
| 4160 | `_skullIcon()` | 6 |
| 4166 | `_killfeedWeaponIcon()` | 9 |
| 4175 | `_wpnIcon()` | 64 |
| 4239 | `_tracer()` | 25 |
| 4264 | `_puff()` | 39 |
| 4303 | `_holeDecalMat()` | 8 |
| 4311 | `_flash()` | 68 |
| 4379 | `_muzzleWorld()` | 22 |
| 4401 | `_aimOrigin()` | 5 |
| 4406 | `_updateDoors()` | 10 |
| 4416 | `_updateFx()` | 57 |
| 4473 | `_ejectCasing()` | 17 |
| 4490 | `_makeCtfFlagTex()` | 23 |
| 4513 | `_paintFlagSymbol()` | 9 |
| 4522 | `_flagTexFor()` | 26 |
| 4548 | `_legadoSimbolo()` | 8 |
| 4556 | `_loadCtfSymbols()` | 22 |
| 4578 | `_makeCtfZoneTex()` | 31 |
| 4609 | `_makeSmokeTex()` | 8 |
| 4617 | `_updateSmokeHud()` | 4 |
| 4621 | `_grenadeSpatial()` | 14 |
| 4635 | `_spawnGrenade()` | 19 |
| 4654 | `_throwNade()` | 13 |
| 4667 | `_throwSmoke()` | 1 |
| 4668 | `_throwFrag()` | 4 |
| 4672 | `_explodeFrag()` | 40 |
| 4712 | `_corDaFumaca()` | 15 |
| 4727 | `_popSmoke()` | 21 |
| 4748 | `_updateGrenades()` | 35 |
| 4783 | `_teamColor()` | 15 |
| 4798 | `_teamInk()` | 7 |
| 4805 | `_factionOf()` | 1 |
| 4806 | `_voiceKey()` | 1 |
| 4807 | `_teamName()` | 1 |
| 4808 | `_teamTag()` | 6 |
| 4814 | `_plaqueta()` | 13 |
| 4827 | `_mirror()` | 3 |
| 4830 | `_botSeparation()` | 61 |
| 4891 | `_initCTF()` | 86 |
| 4977 | `_updateCTF()` | 61 |
| 5038 | `_ctfWin()` | 24 |
| 5062 | `_freeYaw()` | 25 |
| 5087 | `_pullString()` | 23 |
| 5110 | `_walkReach()` | 32 |
| 5142 | `_wpComp()` | 16 |
| 5158 | `_findPathLocal()` | 22 |
| 5180 | `_botCtf()` | 137 |
| 5317 | `_hideCtfHud()` | 6 |
| 5323 | `_updateCtfHud()` | 76 |
| 5399 | `_collide()` | 23 |
| 5422 | `_collideRot()` | 22 |
| 5444 | `_mantleAlcance()` | 50 |
| 5494 | `_mantleAlcancavel()` | 12 |
| 5506 | `_mantleTarget()` | 35 |
| 5541 | `_freeSpot()` | 30 |
| 5571 | `_retaAndavel()` | 20 |
| 5591 | `_walkDepth()` | 16 |
| 5607 | `_noteHit()` | 17 |
| 5624 | `_deathFeedback()` | 45 |
| 5669 | `_toggleCamView()` | 6 |
| 5675 | `setCamView()` | 14 |
| 5689 | `_syncCamViewVis()` | 8 |
| 5697 | `_ensurePlayerTP()` | 25 |
| 5722 | `_updatePlayerTP()` | 42 |
| 5764 | `_updateCrosshairParallax()` | 42 |
| 5806 | `_tpDeath()` | 18 |
| 5824 | `_tpRevive()` | 13 |
| 5837 | `_moveEntity()` | 99 |
| 5936 | `_updatePlayer()` | 302 |
| 6238 | `_footstepSurface()` | 13 |
| 6251 | `_updatePickups()` | 158 |
| 6409 | `_wpnMode()` | 5 |
| 6414 | `_botWeapon()` | 10 |
| 6424 | `_municaoInfinita()` | 1 |
| 6425 | `_pickupAllowed()` | 9 |
| 6434 | `_grabNearPickup()` | 10 |
| 6444 | `_grabPickup()` | 35 |
| 6479 | `_assentarNoChao()` | 10 |
| 6489 | `refreshPickupModels()` | 24 |
| 6513 | `_dropWeapon()` | 20 |
| 6533 | `_sumirDrop()` | 36 |
| 6569 | `_spawnY()` | 3 |
| 6572 | `_spawnYaw()` | 5 |
| 6577 | `_pickSpawn()` | 23 |
| 6600 | `_respawnPlayer()` | 34 |
| 6634 | `_losClear()` | 18 |
| 6652 | `_botCall()` | 41 |
| 6693 | `_teamMarkTex()` | 23 |
| 6716 | `_makeTeamMark()` | 16 |
| 6732 | `_syncRemoteWeapon()` | 22 |
| 6754 | `_updateTeamMark()` | 7 |
| 6761 | `_botEye()` | 1 |
| 6762 | `_enemyOf()` | 8 |
| 6770 | `_duelToken()` | 22 |
| 6792 | `_respawnEntity()` | 21 |
| 6813 | `_updateBot()` | 822 |
| 7635 | `_flushTraining()` | 13 |
| 7648 | `_updateBotNN()` | 73 |
| 7721 | `_botShootNN()` | 46 |
| 7767 | `_radarFoot()` | 38 |
| 7805 | `_updateRadar()` | 64 |
| 7869 | `_banner()` | 26 |
| 7895 | `_resultadoDaRodada()` | 4 |
| 7899 | `_showScoreboard()` | 49 |
| 7948 | `_updateWeaponHud()` | 35 |
| 7983 | `_updateHud()` | 88 |
| 8071 | `update()` | 90 |
| 8161 | `dispose()` | 50 |

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
