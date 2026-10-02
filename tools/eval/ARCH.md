# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.20 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8236 | 320 |
| `public/js/main.js` | 4207 | 323 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3301 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6838 | `_updateBot()` | ⚠️ candidato a extração |
| 622 | 676 | `constructor()` | 🔴 append-only |
| 303 | 5960 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1398 | `_buildViewModels()` |  |
| 255 | 2526 | `_resetPositions()` |  |
| 158 | 6276 | `_updatePickups()` |  |
| 137 | 5207 | `_botCtf()` |  |
| 132 | 2111 | `_touchControls()` |  |
| 101 | 5859 | `_moveEntity()` |  |
| 90 | 8096 | `update()` | 🔴 append-only |
| 88 | 8008 | `_updateHud()` |  |
| 86 | 4918 | `_initCTF()` |  |
| 80 | 3504 | `_tryShoot()` |  |
| 79 | 3159 | `_ensureVmPrecisionQa()` |  |
| 79 | 3988 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `331–334` `413–507` `537–558` `1398–1807` `3125–3158` `3346–3439` `3458–3583` `3598–3613` `3658–3717` `4249–4274` `4322–4422` `4495–4511` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `170–173` `224–224` `250–261` `600–611` `3857–3957` `4857–4917` `5089–5343` `5426–5448` `5960–6262` `6659–6676` `6786–6816` `6838–7659` | — |
| **MAPAS / MUNDO** | `1344–1397` `2526–2780` `4918–5064` `6276–6433` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1822–1831` `1946–1984` `3033–3045` `4275–4313` `4438–4494` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1298–1343` `2985–3007` `3023–3032` `3046–3062` `3988–4066` `4116–4169` `4185–4248` `7830–7893` `7924–7972` `8008–8095` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8096–8185 · `_dom()` 1298–1343 · `constructor()` 676–1297

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3873 de 8236 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 338 | `TRACER_STYLE` | 6 |
| 348 | `ADS_RAMPA_S` | 3 |
| 352 | `aberturaCone` | 13 |
| 365 | `anguloDeDisparo` | 4 |
| 369 | `coneDoDisparo` | 16 |
| 386 | `D2R` | 4 |
| 390 | `DMG_FALLOFF` | 5 |
| 395 | `HS_MUL` | 3 |
| 398 | `BALL_CLASS` | 15 |
| 413 | `STATIC_CLASS` | 75 |
| 489 | `VM_KNOB` | 19 |
| 508 | `vmAdsRot` | 4 |
| 513 | `vmFovForAspect` | 24 |
| 537 | `VM_OFF` | 22 |
| 559 | `vmOffY` | 35 |
| 594 | `VMP` | 6 |
| 600 | `BOT_SKILLS` | 11 |
| 612 | `diffKey` | 4 |
| 617 | `rollBotSkill` | 7 |
| 624 | `botTier` | 4 |
| 628 | `_cyclePool` | 4 |
| 632 | `_rosterPool` | 15 |
| 647 | `pickMatchRoster` | 12 |
| 659 | `BOT_WEAPON_POOL` | 5 |
| 664 | `pickMatchWeapons` | 9 |
| 676 | `constructor()` | 622 |
| 1298 | `_dom()` | 46 |
| 1344 | `_buildEnv()` | 54 |
| 1398 | `_buildViewModels()` | 269 |
| 1667 | `_vmFrame` | 141 |
| 1808 | `_vmMontarTardio` | 14 |
| 1822 | `_makePuffTexture()` | 10 |
| 1832 | `_makeBloodTex()` | 19 |
| 1851 | `_makeBloodPoolTex()` | 21 |
| 1872 | `_bloodDecal()` | 16 |
| 1888 | `_makeBloodFx()` | 20 |
| 1908 | `_bloodSpatter()` | 18 |
| 1926 | `_bloodPoolAt()` | 6 |
| 1932 | `_updateBlood()` | 14 |
| 1946 | `_makeFlashTex()` | 21 |
| 1967 | `_makeFlashSoftTex()` | 8 |
| 1975 | `_makeFlashCoreTex()` | 10 |
| 1985 | `_input()` | 2 |
| 1987 | `_kd` | 41 |
| 2028 | `_ku` | 4 |
| 2032 | `_md` | 38 |
| 2070 | `_mu` | 7 |
| 2077 | `_mm` | 15 |
| 2092 | `_cc` | 1 |
| 2093 | `_blur` | 1 |
| 2094 | `_plc` | 17 |
| 2111 | `_touchControls()` | 132 |
| 2243 | `_aimAssist()` | 28 |
| 2271 | `_requestLock()` | 27 |
| 2298 | `_travaAtalhos()` | 4 |
| 2302 | `_soltaAtalhos()` | 5 |
| 2307 | `espectando()` | 2 |
| 2309 | `_acceptInput()` | 8 |
| 2317 | `_pauseBackdrop()` | 7 |
| 2324 | `_radioShow()` | 6 |
| 2330 | `_radioUi()` | 8 |
| 2338 | `_radioPick()` | 19 |
| 2357 | `_abilityNotice()` | 10 |
| 2367 | `_resetSliceAbilities()` | 9 |
| 2376 | `_stackTrace()` | 28 |
| 2404 | `_updateMotocaCharge()` | 10 |
| 2414 | `_recordRoutePoint()` | 11 |
| 2425 | `_routePing()` | 23 |
| 2448 | `_tickRoutePings()` | 12 |
| 2460 | `_objectiveInteractionMultiplier()` | 14 |
| 2474 | `start()` | 5 |
| 2479 | `_startAnnouncerLab()` | 9 |
| 2488 | `_startRound()` | 38 |
| 2526 | `_resetPositions()` | 255 |
| 2781 | `_checkCtfAlvo()` | 13 |
| 2794 | `_checkPace()` | 13 |
| 2807 | `_endRound()` | 34 |
| 2841 | `_roundWinnerVoice()` | 12 |
| 2853 | `_fimDaPartida()` | 7 |
| 2860 | `_endMatch()` | 61 |
| 2921 | `_ensureDolly()` | 41 |
| 2962 | `_tickDolly()` | 23 |
| 2985 | `setPaused()` | 23 |
| 3008 | `_now()` | 3 |
| 3011 | `pauseArmed()` | 1 |
| 3012 | `_syncPauseArm()` | 7 |
| 3019 | `resume()` | 4 |
| 3023 | `applySettings()` | 10 |
| 3033 | `_applyQuality()` | 13 |
| 3046 | `onResize()` | 17 |
| 3063 | `_switchTeam()` | 62 |
| 3125 | `_applyVmVisibility()` | 34 |
| 3159 | `_ensureVmPrecisionQa()` | 79 |
| 3238 | `_syncVmPresentation()` | 19 |
| 3257 | `_vmlabEnsure()` | 14 |
| 3271 | `_vmlabFrame()` | 28 |
| 3299 | `_tuneGet()` | 15 |
| 3314 | `_tune()` | 23 |
| 3337 | `_fxSet()` | 2 |
| 3339 | `_qaCicloArma()` | 7 |
| 3346 | `_switchWeapon()` | 39 |
| 3385 | `_deploySfx()` | 7 |
| 3392 | `_scope()` | 17 |
| 3409 | `_zoomFov()` | 5 |
| 3414 | `_reloading()` | 1 |
| 3415 | `_startReload()` | 25 |
| 3440 | `_reloadLayers()` | 18 |
| 3458 | `_installRecoil()` | 33 |
| 3491 | `_shotRecoil()` | 13 |
| 3504 | `_tryShoot()` | 80 |
| 3584 | `_tryKnifeAttack()` | 14 |
| 3598 | `_meleeHit()` | 16 |
| 3614 | `_meleeRange()` | 5 |
| 3619 | `_botMelee()` | 28 |
| 3647 | `_shotDamage()` | 11 |
| 3658 | `_fireHitscan()` | 60 |
| 3718 | `_targetFromHit()` | 9 |
| 3727 | `_penetrationExit()` | 20 |
| 3747 | `_surfaceOf()` | 27 |
| 3774 | `_armoredTarget()` | 3 |
| 3777 | `_fleshImpact()` | 38 |
| 3815 | `_fxVoice()` | 9 |
| 3824 | `_impactSfx()` | 17 |
| 3841 | `_tintFx()` | 16 |
| 3857 | `_damage()` | 42 |
| 3899 | `_playerHurtFx()` | 6 |
| 3905 | `_kill()` | 53 |
| 3958 | `_checkArenaWin()` | 30 |
| 3988 | `_dmgArc()` | 79 |
| 4067 | `_mkBanner()` | 9 |
| 4076 | `_updateKillSequenceHud()` | 12 |
| 4088 | `_resetKillSequence()` | 5 |
| 4093 | `_playerKillFeedback()` | 18 |
| 4111 | `_acertoPrevisto()` | 5 |
| 4116 | `_hitmarker()` | 15 |
| 4131 | `_dmgNumber()` | 20 |
| 4151 | `_feed()` | 19 |
| 4170 | `_skullIcon()` | 6 |
| 4176 | `_killfeedWeaponIcon()` | 9 |
| 4185 | `_wpnIcon()` | 64 |
| 4249 | `_tracer()` | 26 |
| 4275 | `_puff()` | 39 |
| 4314 | `_holeDecalMat()` | 8 |
| 4322 | `_flash()` | 61 |
| 4383 | `_vmTetoTela()` | 10 |
| 4393 | `_muzzleWorld()` | 30 |
| 4423 | `_aimOrigin()` | 5 |
| 4428 | `_updateDoors()` | 10 |
| 4438 | `_updateFx()` | 57 |
| 4495 | `_ejectCasing()` | 17 |
| 4512 | `_makeCtfFlagTex()` | 23 |
| 4535 | `_paintFlagSymbol()` | 9 |
| 4544 | `_flagTexFor()` | 26 |
| 4570 | `_legadoSimbolo()` | 8 |
| 4578 | `_loadCtfSymbols()` | 22 |
| 4600 | `_makeCtfZoneTex()` | 31 |
| 4631 | `_makeSmokeTex()` | 10 |
| 4641 | `_updateSmokeHud()` | 4 |
| 4645 | `_grenadeSpatial()` | 14 |
| 4659 | `_spawnGrenade()` | 19 |
| 4678 | `_throwNade()` | 13 |
| 4691 | `_throwSmoke()` | 1 |
| 4692 | `_throwFrag()` | 4 |
| 4696 | `_explodeFrag()` | 40 |
| 4736 | `_corDaFumaca()` | 16 |
| 4752 | `_popSmoke()` | 23 |
| 4775 | `_updateGrenades()` | 35 |
| 4810 | `_teamColor()` | 15 |
| 4825 | `_teamInk()` | 7 |
| 4832 | `_factionOf()` | 1 |
| 4833 | `_voiceKey()` | 1 |
| 4834 | `_teamName()` | 1 |
| 4835 | `_teamTag()` | 6 |
| 4841 | `_plaqueta()` | 13 |
| 4854 | `_mirror()` | 3 |
| 4857 | `_botSeparation()` | 61 |
| 4918 | `_initCTF()` | 86 |
| 5004 | `_updateCTF()` | 61 |
| 5065 | `_ctfWin()` | 24 |
| 5089 | `_freeYaw()` | 25 |
| 5114 | `_pullString()` | 23 |
| 5137 | `_walkReach()` | 32 |
| 5169 | `_wpComp()` | 16 |
| 5185 | `_findPathLocal()` | 22 |
| 5207 | `_botCtf()` | 137 |
| 5344 | `_hideCtfHud()` | 6 |
| 5350 | `_updateCtfHud()` | 76 |
| 5426 | `_collide()` | 23 |
| 5449 | `_collideRot()` | 22 |
| 5471 | `_mantleAlcance()` | 50 |
| 5521 | `_mantleAlcancavel()` | 12 |
| 5533 | `_mantleTarget()` | 35 |
| 5568 | `_freeSpot()` | 30 |
| 5598 | `_retaAndavel()` | 20 |
| 5618 | `_walkDepth()` | 16 |
| 5634 | `_noteHit()` | 17 |
| 5651 | `_deathFeedback()` | 45 |
| 5696 | `_toggleCamView()` | 6 |
| 5702 | `setCamView()` | 14 |
| 5716 | `_syncCamViewVis()` | 8 |
| 5724 | `_ensurePlayerTP()` | 25 |
| 5749 | `_updatePlayerTP()` | 39 |
| 5788 | `_updateCrosshairParallax()` | 40 |
| 5828 | `_tpDeath()` | 18 |
| 5846 | `_tpRevive()` | 13 |
| 5859 | `_moveEntity()` | 101 |
| 5960 | `_updatePlayer()` | 303 |
| 6263 | `_footstepSurface()` | 13 |
| 6276 | `_updatePickups()` | 158 |
| 6434 | `_wpnMode()` | 5 |
| 6439 | `_botWeapon()` | 10 |
| 6449 | `_municaoInfinita()` | 1 |
| 6450 | `_pickupAllowed()` | 9 |
| 6459 | `_grabNearPickup()` | 10 |
| 6469 | `_grabPickup()` | 35 |
| 6504 | `_assentarNoChao()` | 10 |
| 6514 | `refreshPickupModels()` | 24 |
| 6538 | `_dropWeapon()` | 20 |
| 6558 | `_sumirDrop()` | 36 |
| 6594 | `_spawnY()` | 3 |
| 6597 | `_spawnYaw()` | 5 |
| 6602 | `_pickSpawn()` | 23 |
| 6625 | `_respawnPlayer()` | 34 |
| 6659 | `_losClear()` | 18 |
| 6677 | `_botCall()` | 41 |
| 6718 | `_teamMarkTex()` | 23 |
| 6741 | `_makeTeamMark()` | 16 |
| 6757 | `_syncRemoteWeapon()` | 22 |
| 6779 | `_updateTeamMark()` | 7 |
| 6786 | `_botEye()` | 1 |
| 6787 | `_enemyOf()` | 8 |
| 6795 | `_duelToken()` | 22 |
| 6817 | `_respawnEntity()` | 21 |
| 6838 | `_updateBot()` | 822 |
| 7660 | `_flushTraining()` | 13 |
| 7673 | `_updateBotNN()` | 73 |
| 7746 | `_botShootNN()` | 46 |
| 7792 | `_radarFoot()` | 38 |
| 7830 | `_updateRadar()` | 64 |
| 7894 | `_banner()` | 26 |
| 7920 | `_resultadoDaRodada()` | 4 |
| 7924 | `_showScoreboard()` | 49 |
| 7973 | `_updateWeaponHud()` | 35 |
| 8008 | `_updateHud()` | 88 |
| 8096 | `update()` | 90 |
| 8186 | `dispose()` | 50 |

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
