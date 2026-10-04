# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.33 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8315 | 326 |
| `public/js/main.js` | 4219 | 323 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3308 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6916 | `_updateBot()` | ⚠️ candidato a extração |
| 624 | 682 | `constructor()` | 🔴 append-only |
| 304 | 6037 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1406 | `_buildViewModels()` |  |
| 255 | 2593 | `_resetPositions()` |  |
| 158 | 6354 | `_updatePickups()` |  |
| 137 | 5284 | `_botCtf()` |  |
| 135 | 2153 | `_touchControls()` |  |
| 101 | 5936 | `_moveEntity()` |  |
| 90 | 8174 | `update()` | 🔴 append-only |
| 88 | 8086 | `_updateHud()` |  |
| 86 | 4995 | `_initCTF()` |  |
| 81 | 3580 | `_tryShoot()` |  |
| 79 | 3226 | `_ensureVmPrecisionQa()` |  |
| 79 | 4065 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `337–340` `419–513` `543–564` `1406–1815` `3192–3225` `3422–3515` `3534–3660` `3675–3690` `3735–3794` `4326–4351` `4399–4499` `4572–4588` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `176–179` `230–230` `256–267` `606–617` `3934–4034` `4934–4994` `5166–5420` `5503–5525` `6037–6340` `6737–6754` `6864–6894` `6916–7737` | — |
| **MAPAS / MUNDO** | `1352–1405` `2593–2847` `4995–5141` `6354–6511` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1830–1839` `1954–1992` `3100–3112` `4352–4390` `4515–4571` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1306–1351` `3052–3074` `3090–3099` `3113–3129` `4065–4143` `4193–4246` `4262–4325` `7908–7971` `8002–8050` `8086–8173` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8174–8263 · `_dom()` 1306–1351 · `constructor()` 682–1305

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3875 de 8315 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 156 | `PAUSE_ARM_MS` | 3 |
| 159 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 169 | `confirmGate` | 7 |
| 180 | `BOT_AIM_PITCH` | 4 |
| 184 | `BOT_DMG_PLAYER` | 21 |
| 205 | `BOT_FAIR` | 5 |
| 210 | `BOT_MOVE2` | 15 |
| 234 | `BOT_FOCUS_MIN` | 22 |
| 260 | `BOT_TOKEN_REST` | 7 |
| 268 | `MOVE_MUL` | 6 |
| 275 | `MOVE2` | 4 |
| 279 | `STEP_H` | 3 |
| 286 | `MANTLE_APOIO` | 4 |
| 290 | `MANTLE_GRID` | 5 |
| 295 | `RACK_OLD` | 4 |
| 299 | `RACK_RETA` | 25 |
| 326 | `RADIO` | 5 |
| 332 | `MK_LABELS` | 5 |
| 337 | `GUNFEEL` | 4 |
| 344 | `TRACER_STYLE` | 6 |
| 354 | `ADS_RAMPA_S` | 3 |
| 358 | `aberturaCone` | 13 |
| 371 | `anguloDeDisparo` | 4 |
| 375 | `coneDoDisparo` | 16 |
| 392 | `D2R` | 4 |
| 396 | `DMG_FALLOFF` | 5 |
| 401 | `HS_MUL` | 3 |
| 404 | `BALL_CLASS` | 15 |
| 419 | `STATIC_CLASS` | 75 |
| 495 | `VM_KNOB` | 19 |
| 514 | `vmAdsRot` | 4 |
| 519 | `vmFovForAspect` | 24 |
| 543 | `VM_OFF` | 22 |
| 565 | `vmOffY` | 35 |
| 600 | `VMP` | 6 |
| 606 | `BOT_SKILLS` | 11 |
| 618 | `diffKey` | 4 |
| 623 | `rollBotSkill` | 7 |
| 630 | `botTier` | 4 |
| 634 | `_cyclePool` | 4 |
| 638 | `_rosterPool` | 15 |
| 653 | `pickMatchRoster` | 12 |
| 665 | `BOT_WEAPON_POOL` | 5 |
| 670 | `pickMatchWeapons` | 9 |
| 682 | `constructor()` | 624 |
| 1306 | `_dom()` | 46 |
| 1352 | `_buildEnv()` | 54 |
| 1406 | `_buildViewModels()` | 269 |
| 1675 | `_vmFrame` | 141 |
| 1816 | `_vmMontarTardio` | 14 |
| 1830 | `_makePuffTexture()` | 10 |
| 1840 | `_makeBloodTex()` | 19 |
| 1859 | `_makeBloodPoolTex()` | 21 |
| 1880 | `_bloodDecal()` | 16 |
| 1896 | `_makeBloodFx()` | 20 |
| 1916 | `_bloodSpatter()` | 18 |
| 1934 | `_bloodPoolAt()` | 6 |
| 1940 | `_updateBlood()` | 14 |
| 1954 | `_makeFlashTex()` | 21 |
| 1975 | `_makeFlashSoftTex()` | 8 |
| 1983 | `_makeFlashCoreTex()` | 10 |
| 1993 | `_input()` | 6 |
| 1999 | `_kd` | 49 |
| 2048 | `_ku` | 5 |
| 2053 | `_md` | 40 |
| 2093 | `_mu` | 7 |
| 2100 | `_mm` | 15 |
| 2115 | `_wh` | 17 |
| 2132 | `_cc` | 1 |
| 2133 | `_blur` | 1 |
| 2134 | `_plc` | 19 |
| 2153 | `_touchControls()` | 135 |
| 2288 | `_aimAssist()` | 28 |
| 2316 | `_requestLock()` | 27 |
| 2343 | `_travaAtalhos()` | 4 |
| 2347 | `_soltaAtalhos()` | 5 |
| 2352 | `espectando()` | 2 |
| 2354 | `_acceptInput()` | 7 |
| 2361 | `travarEntrada()` | 17 |
| 2378 | `_chatSeguraPausa()` | 5 |
| 2383 | `_pauseBackdrop()` | 7 |
| 2390 | `_radioShow()` | 6 |
| 2396 | `_radioUi()` | 8 |
| 2404 | `_radioPick()` | 20 |
| 2424 | `_abilityNotice()` | 10 |
| 2434 | `_resetSliceAbilities()` | 9 |
| 2443 | `_stackTrace()` | 28 |
| 2471 | `_updateMotocaCharge()` | 10 |
| 2481 | `_recordRoutePoint()` | 11 |
| 2492 | `_routePing()` | 23 |
| 2515 | `_tickRoutePings()` | 12 |
| 2527 | `_objectiveInteractionMultiplier()` | 14 |
| 2541 | `start()` | 5 |
| 2546 | `_startAnnouncerLab()` | 9 |
| 2555 | `_startRound()` | 38 |
| 2593 | `_resetPositions()` | 255 |
| 2848 | `_checkCtfAlvo()` | 13 |
| 2861 | `_checkPace()` | 13 |
| 2874 | `_endRound()` | 34 |
| 2908 | `_roundWinnerVoice()` | 12 |
| 2920 | `_fimDaPartida()` | 7 |
| 2927 | `_endMatch()` | 61 |
| 2988 | `_ensureDolly()` | 41 |
| 3029 | `_tickDolly()` | 23 |
| 3052 | `setPaused()` | 23 |
| 3075 | `_now()` | 3 |
| 3078 | `pauseArmed()` | 1 |
| 3079 | `_syncPauseArm()` | 7 |
| 3086 | `resume()` | 4 |
| 3090 | `applySettings()` | 10 |
| 3100 | `_applyQuality()` | 13 |
| 3113 | `onResize()` | 17 |
| 3130 | `_switchTeam()` | 62 |
| 3192 | `_applyVmVisibility()` | 34 |
| 3226 | `_ensureVmPrecisionQa()` | 79 |
| 3305 | `_syncVmPresentation()` | 19 |
| 3324 | `_vmlabEnsure()` | 14 |
| 3338 | `_vmlabFrame()` | 28 |
| 3366 | `_tuneGet()` | 15 |
| 3381 | `_tune()` | 23 |
| 3404 | `_fxSet()` | 2 |
| 3406 | `_qaCicloArma()` | 8 |
| 3414 | `_cycleWeapon()` | 8 |
| 3422 | `_switchWeapon()` | 39 |
| 3461 | `_deploySfx()` | 7 |
| 3468 | `_scope()` | 17 |
| 3485 | `_zoomFov()` | 5 |
| 3490 | `_reloading()` | 1 |
| 3491 | `_startReload()` | 25 |
| 3516 | `_reloadLayers()` | 18 |
| 3534 | `_installRecoil()` | 33 |
| 3567 | `_shotRecoil()` | 13 |
| 3580 | `_tryShoot()` | 81 |
| 3661 | `_tryKnifeAttack()` | 14 |
| 3675 | `_meleeHit()` | 16 |
| 3691 | `_meleeRange()` | 5 |
| 3696 | `_botMelee()` | 28 |
| 3724 | `_shotDamage()` | 11 |
| 3735 | `_fireHitscan()` | 60 |
| 3795 | `_targetFromHit()` | 9 |
| 3804 | `_penetrationExit()` | 20 |
| 3824 | `_surfaceOf()` | 27 |
| 3851 | `_armoredTarget()` | 3 |
| 3854 | `_fleshImpact()` | 38 |
| 3892 | `_fxVoice()` | 9 |
| 3901 | `_impactSfx()` | 17 |
| 3918 | `_tintFx()` | 16 |
| 3934 | `_damage()` | 42 |
| 3976 | `_playerHurtFx()` | 6 |
| 3982 | `_kill()` | 53 |
| 4035 | `_checkArenaWin()` | 30 |
| 4065 | `_dmgArc()` | 79 |
| 4144 | `_mkBanner()` | 9 |
| 4153 | `_updateKillSequenceHud()` | 12 |
| 4165 | `_resetKillSequence()` | 5 |
| 4170 | `_playerKillFeedback()` | 18 |
| 4188 | `_acertoPrevisto()` | 5 |
| 4193 | `_hitmarker()` | 15 |
| 4208 | `_dmgNumber()` | 20 |
| 4228 | `_feed()` | 19 |
| 4247 | `_skullIcon()` | 6 |
| 4253 | `_killfeedWeaponIcon()` | 9 |
| 4262 | `_wpnIcon()` | 64 |
| 4326 | `_tracer()` | 26 |
| 4352 | `_puff()` | 39 |
| 4391 | `_holeDecalMat()` | 8 |
| 4399 | `_flash()` | 61 |
| 4460 | `_vmTetoTela()` | 10 |
| 4470 | `_muzzleWorld()` | 30 |
| 4500 | `_aimOrigin()` | 5 |
| 4505 | `_updateDoors()` | 10 |
| 4515 | `_updateFx()` | 57 |
| 4572 | `_ejectCasing()` | 17 |
| 4589 | `_makeCtfFlagTex()` | 23 |
| 4612 | `_paintFlagSymbol()` | 9 |
| 4621 | `_flagTexFor()` | 26 |
| 4647 | `_legadoSimbolo()` | 8 |
| 4655 | `_loadCtfSymbols()` | 22 |
| 4677 | `_makeCtfZoneTex()` | 31 |
| 4708 | `_makeSmokeTex()` | 10 |
| 4718 | `_updateSmokeHud()` | 4 |
| 4722 | `_grenadeSpatial()` | 14 |
| 4736 | `_spawnGrenade()` | 19 |
| 4755 | `_throwNade()` | 13 |
| 4768 | `_throwSmoke()` | 1 |
| 4769 | `_throwFrag()` | 4 |
| 4773 | `_explodeFrag()` | 40 |
| 4813 | `_corDaFumaca()` | 16 |
| 4829 | `_popSmoke()` | 23 |
| 4852 | `_updateGrenades()` | 35 |
| 4887 | `_teamColor()` | 15 |
| 4902 | `_teamInk()` | 7 |
| 4909 | `_factionOf()` | 1 |
| 4910 | `_voiceKey()` | 1 |
| 4911 | `_teamName()` | 1 |
| 4912 | `_teamTag()` | 6 |
| 4918 | `_plaqueta()` | 13 |
| 4931 | `_mirror()` | 3 |
| 4934 | `_botSeparation()` | 61 |
| 4995 | `_initCTF()` | 86 |
| 5081 | `_updateCTF()` | 61 |
| 5142 | `_ctfWin()` | 24 |
| 5166 | `_freeYaw()` | 25 |
| 5191 | `_pullString()` | 23 |
| 5214 | `_walkReach()` | 32 |
| 5246 | `_wpComp()` | 16 |
| 5262 | `_findPathLocal()` | 22 |
| 5284 | `_botCtf()` | 137 |
| 5421 | `_hideCtfHud()` | 6 |
| 5427 | `_updateCtfHud()` | 76 |
| 5503 | `_collide()` | 23 |
| 5526 | `_collideRot()` | 22 |
| 5548 | `_mantleAlcance()` | 50 |
| 5598 | `_mantleAlcancavel()` | 12 |
| 5610 | `_mantleTarget()` | 35 |
| 5645 | `_freeSpot()` | 30 |
| 5675 | `_retaAndavel()` | 20 |
| 5695 | `_walkDepth()` | 16 |
| 5711 | `_noteHit()` | 17 |
| 5728 | `_deathFeedback()` | 45 |
| 5773 | `_toggleCamView()` | 6 |
| 5779 | `setCamView()` | 14 |
| 5793 | `_syncCamViewVis()` | 8 |
| 5801 | `_ensurePlayerTP()` | 25 |
| 5826 | `_updatePlayerTP()` | 39 |
| 5865 | `_updateCrosshairParallax()` | 40 |
| 5905 | `_tpDeath()` | 18 |
| 5923 | `_tpRevive()` | 13 |
| 5936 | `_moveEntity()` | 101 |
| 6037 | `_updatePlayer()` | 304 |
| 6341 | `_footstepSurface()` | 13 |
| 6354 | `_updatePickups()` | 158 |
| 6512 | `_wpnMode()` | 5 |
| 6517 | `_botWeapon()` | 10 |
| 6527 | `_municaoInfinita()` | 1 |
| 6528 | `_pickupAllowed()` | 9 |
| 6537 | `_grabNearPickup()` | 10 |
| 6547 | `_grabPickup()` | 35 |
| 6582 | `_assentarNoChao()` | 10 |
| 6592 | `refreshPickupModels()` | 24 |
| 6616 | `_dropWeapon()` | 20 |
| 6636 | `_sumirDrop()` | 36 |
| 6672 | `_spawnY()` | 3 |
| 6675 | `_spawnYaw()` | 5 |
| 6680 | `_pickSpawn()` | 23 |
| 6703 | `_respawnPlayer()` | 34 |
| 6737 | `_losClear()` | 18 |
| 6755 | `_botCall()` | 41 |
| 6796 | `_teamMarkTex()` | 23 |
| 6819 | `_makeTeamMark()` | 16 |
| 6835 | `_syncRemoteWeapon()` | 22 |
| 6857 | `_updateTeamMark()` | 7 |
| 6864 | `_botEye()` | 1 |
| 6865 | `_enemyOf()` | 8 |
| 6873 | `_duelToken()` | 22 |
| 6895 | `_respawnEntity()` | 21 |
| 6916 | `_updateBot()` | 822 |
| 7738 | `_flushTraining()` | 13 |
| 7751 | `_updateBotNN()` | 73 |
| 7824 | `_botShootNN()` | 46 |
| 7870 | `_radarFoot()` | 38 |
| 7908 | `_updateRadar()` | 64 |
| 7972 | `_banner()` | 26 |
| 7998 | `_resultadoDaRodada()` | 4 |
| 8002 | `_showScoreboard()` | 49 |
| 8051 | `_updateWeaponHud()` | 35 |
| 8086 | `_updateHud()` | 88 |
| 8174 | `update()` | 90 |
| 8264 | `dispose()` | 51 |

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
