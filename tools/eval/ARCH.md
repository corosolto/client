# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.21 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8315 | 325 |
| `public/js/main.js` | 4219 | 323 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3314 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6916 | `_updateBot()` | ⚠️ candidato a extração |
| 624 | 678 | `constructor()` | 🔴 append-only |
| 304 | 6037 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1402 | `_buildViewModels()` |  |
| 255 | 2589 | `_resetPositions()` |  |
| 158 | 6354 | `_updatePickups()` |  |
| 137 | 5286 | `_botCtf()` |  |
| 135 | 2149 | `_touchControls()` |  |
| 99 | 5938 | `_moveEntity()` |  |
| 90 | 8174 | `update()` | 🔴 append-only |
| 89 | 3574 | `_tryShoot()` |  |
| 88 | 8086 | `_updateHud()` |  |
| 86 | 4997 | `_initCTF()` |  |
| 79 | 3222 | `_ensureVmPrecisionQa()` |  |
| 79 | 4067 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `337–340` `415–509` `539–560` `1402–1811` `3188–3221` `3418–3509` `3528–3662` `3677–3692` `3737–3796` `4328–4353` `4401–4501` `4574–4590` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `176–179` `230–230` `256–267` `602–613` `3936–4036` `4936–4996` `5168–5422` `5505–5527` `6037–6340` `6737–6754` `6864–6894` `6916–7737` | — |
| **MAPAS / MUNDO** | `1348–1401` `2589–2843` `4997–5143` `6354–6511` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1826–1835` `1950–1988` `3096–3108` `4354–4392` `4517–4573` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1302–1347` `3048–3070` `3086–3095` `3109–3125` `4067–4145` `4195–4248` `4264–4327` `7908–7971` `8002–8050` `8086–8173` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8174–8263 · `_dom()` 1302–1347 · `constructor()` 678–1301

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3881 de 8315 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 355 | `aberturaCone` | 12 |
| 367 | `anguloDeDisparo` | 4 |
| 371 | `coneDoDisparo` | 16 |
| 388 | `D2R` | 4 |
| 392 | `DMG_FALLOFF` | 5 |
| 397 | `HS_MUL` | 3 |
| 400 | `BALL_CLASS` | 15 |
| 415 | `STATIC_CLASS` | 75 |
| 491 | `VM_KNOB` | 19 |
| 510 | `vmAdsRot` | 4 |
| 515 | `vmFovForAspect` | 24 |
| 539 | `VM_OFF` | 22 |
| 561 | `vmOffY` | 35 |
| 596 | `VMP` | 6 |
| 602 | `BOT_SKILLS` | 11 |
| 614 | `diffKey` | 4 |
| 619 | `rollBotSkill` | 7 |
| 626 | `botTier` | 4 |
| 630 | `_cyclePool` | 4 |
| 634 | `_rosterPool` | 15 |
| 649 | `pickMatchRoster` | 12 |
| 661 | `BOT_WEAPON_POOL` | 5 |
| 666 | `pickMatchWeapons` | 9 |
| 678 | `constructor()` | 624 |
| 1302 | `_dom()` | 46 |
| 1348 | `_buildEnv()` | 54 |
| 1402 | `_buildViewModels()` | 269 |
| 1671 | `_vmFrame` | 141 |
| 1812 | `_vmMontarTardio` | 14 |
| 1826 | `_makePuffTexture()` | 10 |
| 1836 | `_makeBloodTex()` | 19 |
| 1855 | `_makeBloodPoolTex()` | 21 |
| 1876 | `_bloodDecal()` | 16 |
| 1892 | `_makeBloodFx()` | 20 |
| 1912 | `_bloodSpatter()` | 18 |
| 1930 | `_bloodPoolAt()` | 6 |
| 1936 | `_updateBlood()` | 14 |
| 1950 | `_makeFlashTex()` | 21 |
| 1971 | `_makeFlashSoftTex()` | 8 |
| 1979 | `_makeFlashCoreTex()` | 10 |
| 1989 | `_input()` | 6 |
| 1995 | `_kd` | 49 |
| 2044 | `_ku` | 5 |
| 2049 | `_md` | 40 |
| 2089 | `_mu` | 7 |
| 2096 | `_mm` | 15 |
| 2111 | `_wh` | 17 |
| 2128 | `_cc` | 1 |
| 2129 | `_blur` | 1 |
| 2130 | `_plc` | 19 |
| 2149 | `_touchControls()` | 135 |
| 2284 | `_aimAssist()` | 28 |
| 2312 | `_requestLock()` | 27 |
| 2339 | `_travaAtalhos()` | 4 |
| 2343 | `_soltaAtalhos()` | 5 |
| 2348 | `espectando()` | 2 |
| 2350 | `_acceptInput()` | 7 |
| 2357 | `travarEntrada()` | 17 |
| 2374 | `_chatSeguraPausa()` | 5 |
| 2379 | `_pauseBackdrop()` | 7 |
| 2386 | `_radioShow()` | 6 |
| 2392 | `_radioUi()` | 8 |
| 2400 | `_radioPick()` | 20 |
| 2420 | `_abilityNotice()` | 10 |
| 2430 | `_resetSliceAbilities()` | 9 |
| 2439 | `_stackTrace()` | 28 |
| 2467 | `_updateMotocaCharge()` | 10 |
| 2477 | `_recordRoutePoint()` | 11 |
| 2488 | `_routePing()` | 23 |
| 2511 | `_tickRoutePings()` | 12 |
| 2523 | `_objectiveInteractionMultiplier()` | 14 |
| 2537 | `start()` | 5 |
| 2542 | `_startAnnouncerLab()` | 9 |
| 2551 | `_startRound()` | 38 |
| 2589 | `_resetPositions()` | 255 |
| 2844 | `_checkCtfAlvo()` | 13 |
| 2857 | `_checkPace()` | 13 |
| 2870 | `_endRound()` | 34 |
| 2904 | `_roundWinnerVoice()` | 12 |
| 2916 | `_fimDaPartida()` | 7 |
| 2923 | `_endMatch()` | 61 |
| 2984 | `_ensureDolly()` | 41 |
| 3025 | `_tickDolly()` | 23 |
| 3048 | `setPaused()` | 23 |
| 3071 | `_now()` | 3 |
| 3074 | `pauseArmed()` | 1 |
| 3075 | `_syncPauseArm()` | 7 |
| 3082 | `resume()` | 4 |
| 3086 | `applySettings()` | 10 |
| 3096 | `_applyQuality()` | 13 |
| 3109 | `onResize()` | 17 |
| 3126 | `_switchTeam()` | 62 |
| 3188 | `_applyVmVisibility()` | 34 |
| 3222 | `_ensureVmPrecisionQa()` | 79 |
| 3301 | `_syncVmPresentation()` | 19 |
| 3320 | `_vmlabEnsure()` | 14 |
| 3334 | `_vmlabFrame()` | 28 |
| 3362 | `_tuneGet()` | 15 |
| 3377 | `_tune()` | 23 |
| 3400 | `_fxSet()` | 2 |
| 3402 | `_qaCicloArma()` | 8 |
| 3410 | `_cycleWeapon()` | 8 |
| 3418 | `_switchWeapon()` | 39 |
| 3457 | `_deploySfx()` | 7 |
| 3464 | `_scope()` | 17 |
| 3481 | `_zoomFov()` | 5 |
| 3486 | `_reloading()` | 1 |
| 3487 | `_startReload()` | 23 |
| 3510 | `_reloadLayers()` | 18 |
| 3528 | `_installRecoil()` | 33 |
| 3561 | `_shotRecoil()` | 13 |
| 3574 | `_tryShoot()` | 89 |
| 3663 | `_tryKnifeAttack()` | 14 |
| 3677 | `_meleeHit()` | 16 |
| 3693 | `_meleeRange()` | 5 |
| 3698 | `_botMelee()` | 28 |
| 3726 | `_shotDamage()` | 11 |
| 3737 | `_fireHitscan()` | 60 |
| 3797 | `_targetFromHit()` | 9 |
| 3806 | `_penetrationExit()` | 20 |
| 3826 | `_surfaceOf()` | 27 |
| 3853 | `_armoredTarget()` | 3 |
| 3856 | `_fleshImpact()` | 38 |
| 3894 | `_fxVoice()` | 9 |
| 3903 | `_impactSfx()` | 17 |
| 3920 | `_tintFx()` | 16 |
| 3936 | `_damage()` | 42 |
| 3978 | `_playerHurtFx()` | 6 |
| 3984 | `_kill()` | 53 |
| 4037 | `_checkArenaWin()` | 30 |
| 4067 | `_dmgArc()` | 79 |
| 4146 | `_mkBanner()` | 9 |
| 4155 | `_updateKillSequenceHud()` | 12 |
| 4167 | `_resetKillSequence()` | 5 |
| 4172 | `_playerKillFeedback()` | 18 |
| 4190 | `_acertoPrevisto()` | 5 |
| 4195 | `_hitmarker()` | 15 |
| 4210 | `_dmgNumber()` | 20 |
| 4230 | `_feed()` | 19 |
| 4249 | `_skullIcon()` | 6 |
| 4255 | `_killfeedWeaponIcon()` | 9 |
| 4264 | `_wpnIcon()` | 64 |
| 4328 | `_tracer()` | 26 |
| 4354 | `_puff()` | 39 |
| 4393 | `_holeDecalMat()` | 8 |
| 4401 | `_flash()` | 61 |
| 4462 | `_vmTetoTela()` | 10 |
| 4472 | `_muzzleWorld()` | 30 |
| 4502 | `_aimOrigin()` | 5 |
| 4507 | `_updateDoors()` | 10 |
| 4517 | `_updateFx()` | 57 |
| 4574 | `_ejectCasing()` | 17 |
| 4591 | `_makeCtfFlagTex()` | 23 |
| 4614 | `_paintFlagSymbol()` | 9 |
| 4623 | `_flagTexFor()` | 26 |
| 4649 | `_legadoSimbolo()` | 8 |
| 4657 | `_loadCtfSymbols()` | 22 |
| 4679 | `_makeCtfZoneTex()` | 31 |
| 4710 | `_makeSmokeTex()` | 10 |
| 4720 | `_updateSmokeHud()` | 4 |
| 4724 | `_grenadeSpatial()` | 14 |
| 4738 | `_spawnGrenade()` | 19 |
| 4757 | `_throwNade()` | 13 |
| 4770 | `_throwSmoke()` | 1 |
| 4771 | `_throwFrag()` | 4 |
| 4775 | `_explodeFrag()` | 40 |
| 4815 | `_corDaFumaca()` | 16 |
| 4831 | `_popSmoke()` | 23 |
| 4854 | `_updateGrenades()` | 35 |
| 4889 | `_teamColor()` | 15 |
| 4904 | `_teamInk()` | 7 |
| 4911 | `_factionOf()` | 1 |
| 4912 | `_voiceKey()` | 1 |
| 4913 | `_teamName()` | 1 |
| 4914 | `_teamTag()` | 6 |
| 4920 | `_plaqueta()` | 13 |
| 4933 | `_mirror()` | 3 |
| 4936 | `_botSeparation()` | 61 |
| 4997 | `_initCTF()` | 86 |
| 5083 | `_updateCTF()` | 61 |
| 5144 | `_ctfWin()` | 24 |
| 5168 | `_freeYaw()` | 25 |
| 5193 | `_pullString()` | 23 |
| 5216 | `_walkReach()` | 32 |
| 5248 | `_wpComp()` | 16 |
| 5264 | `_findPathLocal()` | 22 |
| 5286 | `_botCtf()` | 137 |
| 5423 | `_hideCtfHud()` | 6 |
| 5429 | `_updateCtfHud()` | 76 |
| 5505 | `_collide()` | 23 |
| 5528 | `_collideRot()` | 22 |
| 5550 | `_mantleAlcance()` | 50 |
| 5600 | `_mantleAlcancavel()` | 12 |
| 5612 | `_mantleTarget()` | 35 |
| 5647 | `_freeSpot()` | 30 |
| 5677 | `_retaAndavel()` | 20 |
| 5697 | `_walkDepth()` | 16 |
| 5713 | `_noteHit()` | 17 |
| 5730 | `_deathFeedback()` | 45 |
| 5775 | `_toggleCamView()` | 6 |
| 5781 | `setCamView()` | 14 |
| 5795 | `_syncCamViewVis()` | 8 |
| 5803 | `_ensurePlayerTP()` | 25 |
| 5828 | `_updatePlayerTP()` | 39 |
| 5867 | `_updateCrosshairParallax()` | 40 |
| 5907 | `_tpDeath()` | 18 |
| 5925 | `_tpRevive()` | 13 |
| 5938 | `_moveEntity()` | 99 |
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
