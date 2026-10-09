# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.62 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8387 | 329 |
| `public/js/main.js` | 4381 | 332 |
| `public/js/glbchars.js` | 855 | 60 |
| `public/js/characters.js` | 1142 | 42 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3329 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 838 | 6972 | `_updateBot()` | ⚠️ candidato a extração |
| 629 | 690 | `constructor()` | 🔴 append-only |
| 304 | 6074 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1419 | `_buildViewModels()` |  |
| 255 | 2611 | `_resetPositions()` |  |
| 158 | 6391 | `_updatePickups()` |  |
| 137 | 5308 | `_botCtf()` |  |
| 135 | 2171 | `_touchControls()` |  |
| 101 | 5973 | `_moveEntity()` |  |
| 90 | 8246 | `update()` | 🔴 append-only |
| 88 | 8158 | `_updateHud()` |  |
| 86 | 5019 | `_initCTF()` |  |
| 81 | 3602 | `_tryShoot()` |  |
| 79 | 3248 | `_ensureVmPrecisionQa()` |  |
| 79 | 4087 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `338–341` `420–514` `544–565` `1419–1828` `3214–3247` `3444–3537` `3556–3682` `3697–3712` `3757–3816` `4348–4373` `4421–4521` `4594–4610` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `177–180` `231–231` `257–268` `607–618` `3956–4056` `4958–5018` `5190–5444` `5527–5549` `6074–6377` `6774–6791` `6920–6950` `6972–7809` | — |
| **MAPAS / MUNDO** | `1365–1418` `2611–2865` `5019–5165` `6391–6548` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1843–1852` `1967–2005` `3118–3130` `4374–4412` `4537–4593` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1319–1364` `3070–3092` `3108–3117` `3131–3147` `4087–4165` `4215–4268` `4284–4347` `7980–8043` `8074–8122` `8158–8245` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8246–8335 · `_dom()` 1319–1364 · `constructor()` 690–1318

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3891 de 8387 linhas (46%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 690 | `constructor()` | 629 |
| 1319 | `_dom()` | 46 |
| 1365 | `_buildEnv()` | 54 |
| 1419 | `_buildViewModels()` | 269 |
| 1688 | `_vmFrame` | 141 |
| 1829 | `_vmMontarTardio` | 14 |
| 1843 | `_makePuffTexture()` | 10 |
| 1853 | `_makeBloodTex()` | 19 |
| 1872 | `_makeBloodPoolTex()` | 21 |
| 1893 | `_bloodDecal()` | 16 |
| 1909 | `_makeBloodFx()` | 20 |
| 1929 | `_bloodSpatter()` | 18 |
| 1947 | `_bloodPoolAt()` | 6 |
| 1953 | `_updateBlood()` | 14 |
| 1967 | `_makeFlashTex()` | 21 |
| 1988 | `_makeFlashSoftTex()` | 8 |
| 1996 | `_makeFlashCoreTex()` | 10 |
| 2006 | `_input()` | 6 |
| 2012 | `_kd` | 49 |
| 2061 | `_ku` | 5 |
| 2066 | `_md` | 40 |
| 2106 | `_mu` | 7 |
| 2113 | `_mm` | 20 |
| 2133 | `_wh` | 17 |
| 2150 | `_cc` | 1 |
| 2151 | `_blur` | 1 |
| 2152 | `_plc` | 19 |
| 2171 | `_touchControls()` | 135 |
| 2306 | `_aimAssist()` | 28 |
| 2334 | `_requestLock()` | 27 |
| 2361 | `_travaAtalhos()` | 4 |
| 2365 | `_soltaAtalhos()` | 5 |
| 2370 | `espectando()` | 2 |
| 2372 | `_acceptInput()` | 7 |
| 2379 | `travarEntrada()` | 17 |
| 2396 | `_chatSeguraPausa()` | 5 |
| 2401 | `_pauseBackdrop()` | 7 |
| 2408 | `_radioShow()` | 6 |
| 2414 | `_radioUi()` | 8 |
| 2422 | `_radioPick()` | 20 |
| 2442 | `_abilityNotice()` | 10 |
| 2452 | `_resetSliceAbilities()` | 9 |
| 2461 | `_stackTrace()` | 28 |
| 2489 | `_updateMotocaCharge()` | 10 |
| 2499 | `_recordRoutePoint()` | 11 |
| 2510 | `_routePing()` | 23 |
| 2533 | `_tickRoutePings()` | 12 |
| 2545 | `_objectiveInteractionMultiplier()` | 14 |
| 2559 | `start()` | 5 |
| 2564 | `_startAnnouncerLab()` | 9 |
| 2573 | `_startRound()` | 38 |
| 2611 | `_resetPositions()` | 255 |
| 2866 | `_checkCtfAlvo()` | 13 |
| 2879 | `_checkPace()` | 13 |
| 2892 | `_endRound()` | 34 |
| 2926 | `_roundWinnerVoice()` | 12 |
| 2938 | `_fimDaPartida()` | 7 |
| 2945 | `_endMatch()` | 61 |
| 3006 | `_ensureDolly()` | 41 |
| 3047 | `_tickDolly()` | 23 |
| 3070 | `setPaused()` | 23 |
| 3093 | `_now()` | 3 |
| 3096 | `pauseArmed()` | 1 |
| 3097 | `_syncPauseArm()` | 7 |
| 3104 | `resume()` | 4 |
| 3108 | `applySettings()` | 10 |
| 3118 | `_applyQuality()` | 13 |
| 3131 | `onResize()` | 17 |
| 3148 | `_switchTeam()` | 66 |
| 3214 | `_applyVmVisibility()` | 34 |
| 3248 | `_ensureVmPrecisionQa()` | 79 |
| 3327 | `_syncVmPresentation()` | 19 |
| 3346 | `_vmlabEnsure()` | 14 |
| 3360 | `_vmlabFrame()` | 28 |
| 3388 | `_tuneGet()` | 15 |
| 3403 | `_tune()` | 23 |
| 3426 | `_fxSet()` | 2 |
| 3428 | `_qaCicloArma()` | 8 |
| 3436 | `_cycleWeapon()` | 8 |
| 3444 | `_switchWeapon()` | 39 |
| 3483 | `_deploySfx()` | 7 |
| 3490 | `_scope()` | 17 |
| 3507 | `_zoomFov()` | 5 |
| 3512 | `_reloading()` | 1 |
| 3513 | `_startReload()` | 25 |
| 3538 | `_reloadLayers()` | 18 |
| 3556 | `_installRecoil()` | 33 |
| 3589 | `_shotRecoil()` | 13 |
| 3602 | `_tryShoot()` | 81 |
| 3683 | `_tryKnifeAttack()` | 14 |
| 3697 | `_meleeHit()` | 16 |
| 3713 | `_meleeRange()` | 5 |
| 3718 | `_botMelee()` | 28 |
| 3746 | `_shotDamage()` | 11 |
| 3757 | `_fireHitscan()` | 60 |
| 3817 | `_targetFromHit()` | 9 |
| 3826 | `_penetrationExit()` | 20 |
| 3846 | `_surfaceOf()` | 27 |
| 3873 | `_armoredTarget()` | 3 |
| 3876 | `_fleshImpact()` | 38 |
| 3914 | `_fxVoice()` | 9 |
| 3923 | `_impactSfx()` | 17 |
| 3940 | `_tintFx()` | 16 |
| 3956 | `_damage()` | 42 |
| 3998 | `_playerHurtFx()` | 6 |
| 4004 | `_kill()` | 53 |
| 4057 | `_checkArenaWin()` | 30 |
| 4087 | `_dmgArc()` | 79 |
| 4166 | `_mkBanner()` | 9 |
| 4175 | `_updateKillSequenceHud()` | 12 |
| 4187 | `_resetKillSequence()` | 5 |
| 4192 | `_playerKillFeedback()` | 18 |
| 4210 | `_acertoPrevisto()` | 5 |
| 4215 | `_hitmarker()` | 15 |
| 4230 | `_dmgNumber()` | 20 |
| 4250 | `_feed()` | 19 |
| 4269 | `_skullIcon()` | 6 |
| 4275 | `_killfeedWeaponIcon()` | 9 |
| 4284 | `_wpnIcon()` | 64 |
| 4348 | `_tracer()` | 26 |
| 4374 | `_puff()` | 39 |
| 4413 | `_holeDecalMat()` | 8 |
| 4421 | `_flash()` | 61 |
| 4482 | `_vmTetoTela()` | 10 |
| 4492 | `_muzzleWorld()` | 30 |
| 4522 | `_aimOrigin()` | 5 |
| 4527 | `_updateDoors()` | 10 |
| 4537 | `_updateFx()` | 57 |
| 4594 | `_ejectCasing()` | 17 |
| 4611 | `_makeCtfFlagTex()` | 23 |
| 4634 | `_paintFlagSymbol()` | 9 |
| 4643 | `_flagTexFor()` | 26 |
| 4669 | `_legadoSimbolo()` | 8 |
| 4677 | `_loadCtfSymbols()` | 22 |
| 4699 | `_makeCtfZoneTex()` | 31 |
| 4730 | `_makeSmokeTex()` | 10 |
| 4740 | `_updateSmokeHud()` | 4 |
| 4744 | `_grenadeSpatial()` | 14 |
| 4758 | `_spawnGrenade()` | 19 |
| 4777 | `_throwNade()` | 13 |
| 4790 | `_throwSmoke()` | 1 |
| 4791 | `_throwFrag()` | 4 |
| 4795 | `_explodeFrag()` | 40 |
| 4835 | `_corDaFumaca()` | 16 |
| 4851 | `_popSmoke()` | 23 |
| 4874 | `_updateGrenades()` | 35 |
| 4909 | `_teamColor()` | 15 |
| 4924 | `_teamInk()` | 7 |
| 4931 | `_factionOf()` | 1 |
| 4932 | `_voiceKey()` | 1 |
| 4933 | `_teamName()` | 1 |
| 4934 | `_teamTag()` | 6 |
| 4940 | `_plaqueta()` | 13 |
| 4953 | `_mirror()` | 2 |
| 4955 | `_defNoLado()` | 3 |
| 4958 | `_botSeparation()` | 61 |
| 5019 | `_initCTF()` | 86 |
| 5105 | `_updateCTF()` | 61 |
| 5166 | `_ctfWin()` | 24 |
| 5190 | `_freeYaw()` | 25 |
| 5215 | `_pullString()` | 23 |
| 5238 | `_walkReach()` | 32 |
| 5270 | `_wpComp()` | 16 |
| 5286 | `_findPathLocal()` | 22 |
| 5308 | `_botCtf()` | 137 |
| 5445 | `_hideCtfHud()` | 6 |
| 5451 | `_updateCtfHud()` | 76 |
| 5527 | `_collide()` | 23 |
| 5550 | `_collideRot()` | 22 |
| 5572 | `_mantleAlcance()` | 50 |
| 5622 | `_mantleAlcancavel()` | 12 |
| 5634 | `_mantleTarget()` | 35 |
| 5669 | `_freeSpot()` | 30 |
| 5699 | `_retaAndavel()` | 20 |
| 5719 | `_walkDepth()` | 16 |
| 5735 | `_noteHit()` | 17 |
| 5752 | `_deathFeedback()` | 45 |
| 5797 | `_toggleCamView()` | 6 |
| 5803 | `setCamView()` | 16 |
| 5819 | `_syncCamViewVis()` | 8 |
| 5827 | `_ensurePlayerTP()` | 26 |
| 5853 | `_updatePlayerTP()` | 42 |
| 5895 | `_updateCrosshairParallax()` | 47 |
| 5942 | `_tpDeath()` | 18 |
| 5960 | `_tpRevive()` | 13 |
| 5973 | `_moveEntity()` | 101 |
| 6074 | `_updatePlayer()` | 304 |
| 6378 | `_footstepSurface()` | 13 |
| 6391 | `_updatePickups()` | 158 |
| 6549 | `_wpnMode()` | 5 |
| 6554 | `_botWeapon()` | 10 |
| 6564 | `_municaoInfinita()` | 1 |
| 6565 | `_pickupAllowed()` | 9 |
| 6574 | `_grabNearPickup()` | 10 |
| 6584 | `_grabPickup()` | 35 |
| 6619 | `_assentarNoChao()` | 10 |
| 6629 | `refreshPickupModels()` | 24 |
| 6653 | `_dropWeapon()` | 20 |
| 6673 | `_sumirDrop()` | 36 |
| 6709 | `_spawnY()` | 3 |
| 6712 | `_spawnYaw()` | 5 |
| 6717 | `_pickSpawn()` | 23 |
| 6740 | `_respawnPlayer()` | 34 |
| 6774 | `_losClear()` | 18 |
| 6792 | `_botCall()` | 41 |
| 6833 | `_teamMarkTex()` | 23 |
| 6856 | `_makeTeamMark()` | 16 |
| 6872 | `_trocarPersonagem()` | 18 |
| 6890 | `_syncRemoteWeapon()` | 23 |
| 6913 | `_updateTeamMark()` | 7 |
| 6920 | `_botEye()` | 1 |
| 6921 | `_enemyOf()` | 8 |
| 6929 | `_duelToken()` | 22 |
| 6951 | `_respawnEntity()` | 21 |
| 6972 | `_updateBot()` | 838 |
| 7810 | `_flushTraining()` | 13 |
| 7823 | `_updateBotNN()` | 73 |
| 7896 | `_botShootNN()` | 46 |
| 7942 | `_radarFoot()` | 38 |
| 7980 | `_updateRadar()` | 64 |
| 8044 | `_banner()` | 26 |
| 8070 | `_resultadoDaRodada()` | 4 |
| 8074 | `_showScoreboard()` | 49 |
| 8123 | `_updateWeaponHud()` | 35 |
| 8158 | `_updateHud()` | 88 |
| 8246 | `update()` | 90 |
| 8336 | `dispose()` | 51 |

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
