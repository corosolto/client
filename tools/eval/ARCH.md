# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.67 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8389 | 329 |
| `public/js/main.js` | 4450 | 333 |
| `public/js/glbchars.js` | 892 | 62 |
| `public/js/characters.js` | 1142 | 42 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3330 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 838 | 6974 | `_updateBot()` | ⚠️ candidato a extração |
| 630 | 690 | `constructor()` | 🔴 append-only |
| 304 | 6075 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1420 | `_buildViewModels()` |  |
| 255 | 2612 | `_resetPositions()` |  |
| 158 | 6392 | `_updatePickups()` |  |
| 137 | 5309 | `_botCtf()` |  |
| 135 | 2172 | `_touchControls()` |  |
| 101 | 5974 | `_moveEntity()` |  |
| 90 | 8248 | `update()` | 🔴 append-only |
| 88 | 8160 | `_updateHud()` |  |
| 86 | 5020 | `_initCTF()` |  |
| 81 | 3603 | `_tryShoot()` |  |
| 79 | 3249 | `_ensureVmPrecisionQa()` |  |
| 79 | 4088 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `338–341` `420–514` `544–565` `1420–1829` `3215–3248` `3445–3538` `3557–3683` `3698–3713` `3758–3817` `4349–4374` `4422–4522` `4595–4611` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `177–180` `231–231` `257–268` `607–618` `3957–4057` `4959–5019` `5191–5445` `5528–5550` `6075–6378` `6775–6792` `6922–6952` `6974–7811` | — |
| **MAPAS / MUNDO** | `1366–1419` `2612–2866` `5020–5166` `6392–6549` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1844–1853` `1968–2006` `3119–3131` `4375–4413` `4538–4594` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1320–1365` `3071–3093` `3109–3118` `3132–3148` `4088–4166` `4216–4269` `4285–4348` `7982–8045` `8076–8124` `8160–8247` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8248–8337 · `_dom()` 1320–1365 · `constructor()` 690–1319

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3891 de 8389 linhas (46%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 48 | `ANNOUNCER_LAB` | 4 |
| 52 | `VMLAB` | 3 |
| 57 | `VM_QA_CICLO` | 3 |
| 61 | `VM_QA_ADS` | 8 |
| 69 | `VM_MAT_LEGACY` | 4 |
| 75 | `DROP_TTL` | 8 |
| 83 | `ROUNDS_MAX` | 27 |
| 113 | `CTF_CLOCK_SHOW` | 4 |
| 117 | `KILLS_PER_PLAYER` | 7 |
| 124 | `PACE` | 33 |
| 157 | `PAUSE_ARM_MS` | 3 |
| 160 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 170 | `confirmGate` | 7 |
| 181 | `BOT_AIM_PITCH` | 4 |
| 185 | `BOT_DMG_PLAYER` | 21 |
| 206 | `BOT_FAIR` | 5 |
| 211 | `BOT_MOVE2` | 15 |
| 235 | `BOT_FOCUS_MIN` | 22 |
| 261 | `BOT_TOKEN_REST` | 7 |
| 269 | `MOVE_MUL` | 6 |
| 276 | `MOVE2` | 4 |
| 280 | `STEP_H` | 3 |
| 287 | `MANTLE_APOIO` | 4 |
| 291 | `MANTLE_GRID` | 5 |
| 296 | `RACK_OLD` | 4 |
| 300 | `RACK_RETA` | 25 |
| 327 | `RADIO` | 5 |
| 333 | `MK_LABELS` | 5 |
| 338 | `GUNFEEL` | 4 |
| 345 | `TRACER_STYLE` | 6 |
| 355 | `ADS_RAMPA_S` | 3 |
| 359 | `aberturaCone` | 13 |
| 372 | `anguloDeDisparo` | 4 |
| 376 | `coneDoDisparo` | 16 |
| 393 | `D2R` | 4 |
| 397 | `DMG_FALLOFF` | 5 |
| 402 | `HS_MUL` | 3 |
| 405 | `BALL_CLASS` | 15 |
| 420 | `STATIC_CLASS` | 75 |
| 496 | `VM_KNOB` | 19 |
| 515 | `vmAdsRot` | 4 |
| 520 | `vmFovForAspect` | 24 |
| 544 | `VM_OFF` | 22 |
| 566 | `vmOffY` | 35 |
| 601 | `VMP` | 6 |
| 607 | `BOT_SKILLS` | 11 |
| 619 | `diffKey` | 4 |
| 624 | `rollBotSkill` | 7 |
| 631 | `botTier` | 4 |
| 635 | `_cyclePool` | 5 |
| 640 | `_rosterPool` | 16 |
| 657 | `pickMatchRoster` | 16 |
| 673 | `BOT_WEAPON_POOL` | 5 |
| 678 | `pickMatchWeapons` | 9 |
| 690 | `constructor()` | 630 |
| 1320 | `_dom()` | 46 |
| 1366 | `_buildEnv()` | 54 |
| 1420 | `_buildViewModels()` | 269 |
| 1689 | `_vmFrame` | 141 |
| 1830 | `_vmMontarTardio` | 14 |
| 1844 | `_makePuffTexture()` | 10 |
| 1854 | `_makeBloodTex()` | 19 |
| 1873 | `_makeBloodPoolTex()` | 21 |
| 1894 | `_bloodDecal()` | 16 |
| 1910 | `_makeBloodFx()` | 20 |
| 1930 | `_bloodSpatter()` | 18 |
| 1948 | `_bloodPoolAt()` | 6 |
| 1954 | `_updateBlood()` | 14 |
| 1968 | `_makeFlashTex()` | 21 |
| 1989 | `_makeFlashSoftTex()` | 8 |
| 1997 | `_makeFlashCoreTex()` | 10 |
| 2007 | `_input()` | 6 |
| 2013 | `_kd` | 49 |
| 2062 | `_ku` | 5 |
| 2067 | `_md` | 40 |
| 2107 | `_mu` | 7 |
| 2114 | `_mm` | 20 |
| 2134 | `_wh` | 17 |
| 2151 | `_cc` | 1 |
| 2152 | `_blur` | 1 |
| 2153 | `_plc` | 19 |
| 2172 | `_touchControls()` | 135 |
| 2307 | `_aimAssist()` | 28 |
| 2335 | `_requestLock()` | 27 |
| 2362 | `_travaAtalhos()` | 4 |
| 2366 | `_soltaAtalhos()` | 5 |
| 2371 | `espectando()` | 2 |
| 2373 | `_acceptInput()` | 7 |
| 2380 | `travarEntrada()` | 17 |
| 2397 | `_chatSeguraPausa()` | 5 |
| 2402 | `_pauseBackdrop()` | 7 |
| 2409 | `_radioShow()` | 6 |
| 2415 | `_radioUi()` | 8 |
| 2423 | `_radioPick()` | 20 |
| 2443 | `_abilityNotice()` | 10 |
| 2453 | `_resetSliceAbilities()` | 9 |
| 2462 | `_stackTrace()` | 28 |
| 2490 | `_updateMotocaCharge()` | 10 |
| 2500 | `_recordRoutePoint()` | 11 |
| 2511 | `_routePing()` | 23 |
| 2534 | `_tickRoutePings()` | 12 |
| 2546 | `_objectiveInteractionMultiplier()` | 14 |
| 2560 | `start()` | 5 |
| 2565 | `_startAnnouncerLab()` | 9 |
| 2574 | `_startRound()` | 38 |
| 2612 | `_resetPositions()` | 255 |
| 2867 | `_checkCtfAlvo()` | 13 |
| 2880 | `_checkPace()` | 13 |
| 2893 | `_endRound()` | 34 |
| 2927 | `_roundWinnerVoice()` | 12 |
| 2939 | `_fimDaPartida()` | 7 |
| 2946 | `_endMatch()` | 61 |
| 3007 | `_ensureDolly()` | 41 |
| 3048 | `_tickDolly()` | 23 |
| 3071 | `setPaused()` | 23 |
| 3094 | `_now()` | 3 |
| 3097 | `pauseArmed()` | 1 |
| 3098 | `_syncPauseArm()` | 7 |
| 3105 | `resume()` | 4 |
| 3109 | `applySettings()` | 10 |
| 3119 | `_applyQuality()` | 13 |
| 3132 | `onResize()` | 17 |
| 3149 | `_switchTeam()` | 66 |
| 3215 | `_applyVmVisibility()` | 34 |
| 3249 | `_ensureVmPrecisionQa()` | 79 |
| 3328 | `_syncVmPresentation()` | 19 |
| 3347 | `_vmlabEnsure()` | 14 |
| 3361 | `_vmlabFrame()` | 28 |
| 3389 | `_tuneGet()` | 15 |
| 3404 | `_tune()` | 23 |
| 3427 | `_fxSet()` | 2 |
| 3429 | `_qaCicloArma()` | 8 |
| 3437 | `_cycleWeapon()` | 8 |
| 3445 | `_switchWeapon()` | 39 |
| 3484 | `_deploySfx()` | 7 |
| 3491 | `_scope()` | 17 |
| 3508 | `_zoomFov()` | 5 |
| 3513 | `_reloading()` | 1 |
| 3514 | `_startReload()` | 25 |
| 3539 | `_reloadLayers()` | 18 |
| 3557 | `_installRecoil()` | 33 |
| 3590 | `_shotRecoil()` | 13 |
| 3603 | `_tryShoot()` | 81 |
| 3684 | `_tryKnifeAttack()` | 14 |
| 3698 | `_meleeHit()` | 16 |
| 3714 | `_meleeRange()` | 5 |
| 3719 | `_botMelee()` | 28 |
| 3747 | `_shotDamage()` | 11 |
| 3758 | `_fireHitscan()` | 60 |
| 3818 | `_targetFromHit()` | 9 |
| 3827 | `_penetrationExit()` | 20 |
| 3847 | `_surfaceOf()` | 27 |
| 3874 | `_armoredTarget()` | 3 |
| 3877 | `_fleshImpact()` | 38 |
| 3915 | `_fxVoice()` | 9 |
| 3924 | `_impactSfx()` | 17 |
| 3941 | `_tintFx()` | 16 |
| 3957 | `_damage()` | 42 |
| 3999 | `_playerHurtFx()` | 6 |
| 4005 | `_kill()` | 53 |
| 4058 | `_checkArenaWin()` | 30 |
| 4088 | `_dmgArc()` | 79 |
| 4167 | `_mkBanner()` | 9 |
| 4176 | `_updateKillSequenceHud()` | 12 |
| 4188 | `_resetKillSequence()` | 5 |
| 4193 | `_playerKillFeedback()` | 18 |
| 4211 | `_acertoPrevisto()` | 5 |
| 4216 | `_hitmarker()` | 15 |
| 4231 | `_dmgNumber()` | 20 |
| 4251 | `_feed()` | 19 |
| 4270 | `_skullIcon()` | 6 |
| 4276 | `_killfeedWeaponIcon()` | 9 |
| 4285 | `_wpnIcon()` | 64 |
| 4349 | `_tracer()` | 26 |
| 4375 | `_puff()` | 39 |
| 4414 | `_holeDecalMat()` | 8 |
| 4422 | `_flash()` | 61 |
| 4483 | `_vmTetoTela()` | 10 |
| 4493 | `_muzzleWorld()` | 30 |
| 4523 | `_aimOrigin()` | 5 |
| 4528 | `_updateDoors()` | 10 |
| 4538 | `_updateFx()` | 57 |
| 4595 | `_ejectCasing()` | 17 |
| 4612 | `_makeCtfFlagTex()` | 23 |
| 4635 | `_paintFlagSymbol()` | 9 |
| 4644 | `_flagTexFor()` | 26 |
| 4670 | `_legadoSimbolo()` | 8 |
| 4678 | `_loadCtfSymbols()` | 22 |
| 4700 | `_makeCtfZoneTex()` | 31 |
| 4731 | `_makeSmokeTex()` | 10 |
| 4741 | `_updateSmokeHud()` | 4 |
| 4745 | `_grenadeSpatial()` | 14 |
| 4759 | `_spawnGrenade()` | 19 |
| 4778 | `_throwNade()` | 13 |
| 4791 | `_throwSmoke()` | 1 |
| 4792 | `_throwFrag()` | 4 |
| 4796 | `_explodeFrag()` | 40 |
| 4836 | `_corDaFumaca()` | 16 |
| 4852 | `_popSmoke()` | 23 |
| 4875 | `_updateGrenades()` | 35 |
| 4910 | `_teamColor()` | 15 |
| 4925 | `_teamInk()` | 7 |
| 4932 | `_factionOf()` | 1 |
| 4933 | `_voiceKey()` | 1 |
| 4934 | `_teamName()` | 1 |
| 4935 | `_teamTag()` | 6 |
| 4941 | `_plaqueta()` | 13 |
| 4954 | `_mirror()` | 2 |
| 4956 | `_defNoLado()` | 3 |
| 4959 | `_botSeparation()` | 61 |
| 5020 | `_initCTF()` | 86 |
| 5106 | `_updateCTF()` | 61 |
| 5167 | `_ctfWin()` | 24 |
| 5191 | `_freeYaw()` | 25 |
| 5216 | `_pullString()` | 23 |
| 5239 | `_walkReach()` | 32 |
| 5271 | `_wpComp()` | 16 |
| 5287 | `_findPathLocal()` | 22 |
| 5309 | `_botCtf()` | 137 |
| 5446 | `_hideCtfHud()` | 6 |
| 5452 | `_updateCtfHud()` | 76 |
| 5528 | `_collide()` | 23 |
| 5551 | `_collideRot()` | 22 |
| 5573 | `_mantleAlcance()` | 50 |
| 5623 | `_mantleAlcancavel()` | 12 |
| 5635 | `_mantleTarget()` | 35 |
| 5670 | `_freeSpot()` | 30 |
| 5700 | `_retaAndavel()` | 20 |
| 5720 | `_walkDepth()` | 16 |
| 5736 | `_noteHit()` | 17 |
| 5753 | `_deathFeedback()` | 45 |
| 5798 | `_toggleCamView()` | 6 |
| 5804 | `setCamView()` | 16 |
| 5820 | `_syncCamViewVis()` | 8 |
| 5828 | `_ensurePlayerTP()` | 26 |
| 5854 | `_updatePlayerTP()` | 42 |
| 5896 | `_updateCrosshairParallax()` | 47 |
| 5943 | `_tpDeath()` | 18 |
| 5961 | `_tpRevive()` | 13 |
| 5974 | `_moveEntity()` | 101 |
| 6075 | `_updatePlayer()` | 304 |
| 6379 | `_footstepSurface()` | 13 |
| 6392 | `_updatePickups()` | 158 |
| 6550 | `_wpnMode()` | 5 |
| 6555 | `_botWeapon()` | 10 |
| 6565 | `_municaoInfinita()` | 1 |
| 6566 | `_pickupAllowed()` | 9 |
| 6575 | `_grabNearPickup()` | 10 |
| 6585 | `_grabPickup()` | 35 |
| 6620 | `_assentarNoChao()` | 10 |
| 6630 | `refreshPickupModels()` | 24 |
| 6654 | `_dropWeapon()` | 20 |
| 6674 | `_sumirDrop()` | 36 |
| 6710 | `_spawnY()` | 3 |
| 6713 | `_spawnYaw()` | 5 |
| 6718 | `_pickSpawn()` | 23 |
| 6741 | `_respawnPlayer()` | 34 |
| 6775 | `_losClear()` | 18 |
| 6793 | `_botCall()` | 41 |
| 6834 | `_teamMarkTex()` | 23 |
| 6857 | `_makeTeamMark()` | 16 |
| 6873 | `_trocarPersonagem()` | 19 |
| 6892 | `_syncRemoteWeapon()` | 23 |
| 6915 | `_updateTeamMark()` | 7 |
| 6922 | `_botEye()` | 1 |
| 6923 | `_enemyOf()` | 8 |
| 6931 | `_duelToken()` | 22 |
| 6953 | `_respawnEntity()` | 21 |
| 6974 | `_updateBot()` | 838 |
| 7812 | `_flushTraining()` | 13 |
| 7825 | `_updateBotNN()` | 73 |
| 7898 | `_botShootNN()` | 46 |
| 7944 | `_radarFoot()` | 38 |
| 7982 | `_updateRadar()` | 64 |
| 8046 | `_banner()` | 26 |
| 8072 | `_resultadoDaRodada()` | 4 |
| 8076 | `_showScoreboard()` | 49 |
| 8125 | `_updateWeaponHud()` | 35 |
| 8160 | `_updateHud()` | 88 |
| 8248 | `update()` | 90 |
| 8338 | `dispose()` | 51 |

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
