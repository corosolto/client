# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.53 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8349 | 329 |
| `public/js/main.js` | 4278 | 329 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1104 | 42 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3309 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6950 | `_updateBot()` | ⚠️ candidato a extração |
| 625 | 689 | `constructor()` | 🔴 append-only |
| 304 | 6052 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1414 | `_buildViewModels()` |  |
| 255 | 2601 | `_resetPositions()` |  |
| 158 | 6369 | `_updatePickups()` |  |
| 137 | 5298 | `_botCtf()` |  |
| 135 | 2161 | `_touchControls()` |  |
| 101 | 5951 | `_moveEntity()` |  |
| 90 | 8208 | `update()` | 🔴 append-only |
| 88 | 8120 | `_updateHud()` |  |
| 86 | 5009 | `_initCTF()` |  |
| 81 | 3592 | `_tryShoot()` |  |
| 79 | 3238 | `_ensureVmPrecisionQa()` |  |
| 79 | 4077 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `337–340` `419–513` `543–564` `1414–1823` `3204–3237` `3434–3527` `3546–3672` `3687–3702` `3747–3806` `4338–4363` `4411–4511` `4584–4600` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `176–179` `230–230` `256–267` `606–617` `3946–4046` `4948–5008` `5180–5434` `5517–5539` `6052–6355` `6752–6769` `6898–6928` `6950–7771` | — |
| **MAPAS / MUNDO** | `1360–1413` `2601–2855` `5009–5155` `6369–6526` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1838–1847` `1962–2000` `3108–3120` `4364–4402` `4527–4583` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1314–1359` `3060–3082` `3098–3107` `3121–3137` `4077–4155` `4205–4258` `4274–4337` `7942–8005` `8036–8084` `8120–8207` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8208–8297 · `_dom()` 1314–1359 · `constructor()` 689–1313

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3875 de 8349 linhas (46%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 634 | `_cyclePool` | 5 |
| 639 | `_rosterPool` | 16 |
| 656 | `pickMatchRoster` | 16 |
| 672 | `BOT_WEAPON_POOL` | 5 |
| 677 | `pickMatchWeapons` | 9 |
| 689 | `constructor()` | 625 |
| 1314 | `_dom()` | 46 |
| 1360 | `_buildEnv()` | 54 |
| 1414 | `_buildViewModels()` | 269 |
| 1683 | `_vmFrame` | 141 |
| 1824 | `_vmMontarTardio` | 14 |
| 1838 | `_makePuffTexture()` | 10 |
| 1848 | `_makeBloodTex()` | 19 |
| 1867 | `_makeBloodPoolTex()` | 21 |
| 1888 | `_bloodDecal()` | 16 |
| 1904 | `_makeBloodFx()` | 20 |
| 1924 | `_bloodSpatter()` | 18 |
| 1942 | `_bloodPoolAt()` | 6 |
| 1948 | `_updateBlood()` | 14 |
| 1962 | `_makeFlashTex()` | 21 |
| 1983 | `_makeFlashSoftTex()` | 8 |
| 1991 | `_makeFlashCoreTex()` | 10 |
| 2001 | `_input()` | 6 |
| 2007 | `_kd` | 49 |
| 2056 | `_ku` | 5 |
| 2061 | `_md` | 40 |
| 2101 | `_mu` | 7 |
| 2108 | `_mm` | 15 |
| 2123 | `_wh` | 17 |
| 2140 | `_cc` | 1 |
| 2141 | `_blur` | 1 |
| 2142 | `_plc` | 19 |
| 2161 | `_touchControls()` | 135 |
| 2296 | `_aimAssist()` | 28 |
| 2324 | `_requestLock()` | 27 |
| 2351 | `_travaAtalhos()` | 4 |
| 2355 | `_soltaAtalhos()` | 5 |
| 2360 | `espectando()` | 2 |
| 2362 | `_acceptInput()` | 7 |
| 2369 | `travarEntrada()` | 17 |
| 2386 | `_chatSeguraPausa()` | 5 |
| 2391 | `_pauseBackdrop()` | 7 |
| 2398 | `_radioShow()` | 6 |
| 2404 | `_radioUi()` | 8 |
| 2412 | `_radioPick()` | 20 |
| 2432 | `_abilityNotice()` | 10 |
| 2442 | `_resetSliceAbilities()` | 9 |
| 2451 | `_stackTrace()` | 28 |
| 2479 | `_updateMotocaCharge()` | 10 |
| 2489 | `_recordRoutePoint()` | 11 |
| 2500 | `_routePing()` | 23 |
| 2523 | `_tickRoutePings()` | 12 |
| 2535 | `_objectiveInteractionMultiplier()` | 14 |
| 2549 | `start()` | 5 |
| 2554 | `_startAnnouncerLab()` | 9 |
| 2563 | `_startRound()` | 38 |
| 2601 | `_resetPositions()` | 255 |
| 2856 | `_checkCtfAlvo()` | 13 |
| 2869 | `_checkPace()` | 13 |
| 2882 | `_endRound()` | 34 |
| 2916 | `_roundWinnerVoice()` | 12 |
| 2928 | `_fimDaPartida()` | 7 |
| 2935 | `_endMatch()` | 61 |
| 2996 | `_ensureDolly()` | 41 |
| 3037 | `_tickDolly()` | 23 |
| 3060 | `setPaused()` | 23 |
| 3083 | `_now()` | 3 |
| 3086 | `pauseArmed()` | 1 |
| 3087 | `_syncPauseArm()` | 7 |
| 3094 | `resume()` | 4 |
| 3098 | `applySettings()` | 10 |
| 3108 | `_applyQuality()` | 13 |
| 3121 | `onResize()` | 17 |
| 3138 | `_switchTeam()` | 66 |
| 3204 | `_applyVmVisibility()` | 34 |
| 3238 | `_ensureVmPrecisionQa()` | 79 |
| 3317 | `_syncVmPresentation()` | 19 |
| 3336 | `_vmlabEnsure()` | 14 |
| 3350 | `_vmlabFrame()` | 28 |
| 3378 | `_tuneGet()` | 15 |
| 3393 | `_tune()` | 23 |
| 3416 | `_fxSet()` | 2 |
| 3418 | `_qaCicloArma()` | 8 |
| 3426 | `_cycleWeapon()` | 8 |
| 3434 | `_switchWeapon()` | 39 |
| 3473 | `_deploySfx()` | 7 |
| 3480 | `_scope()` | 17 |
| 3497 | `_zoomFov()` | 5 |
| 3502 | `_reloading()` | 1 |
| 3503 | `_startReload()` | 25 |
| 3528 | `_reloadLayers()` | 18 |
| 3546 | `_installRecoil()` | 33 |
| 3579 | `_shotRecoil()` | 13 |
| 3592 | `_tryShoot()` | 81 |
| 3673 | `_tryKnifeAttack()` | 14 |
| 3687 | `_meleeHit()` | 16 |
| 3703 | `_meleeRange()` | 5 |
| 3708 | `_botMelee()` | 28 |
| 3736 | `_shotDamage()` | 11 |
| 3747 | `_fireHitscan()` | 60 |
| 3807 | `_targetFromHit()` | 9 |
| 3816 | `_penetrationExit()` | 20 |
| 3836 | `_surfaceOf()` | 27 |
| 3863 | `_armoredTarget()` | 3 |
| 3866 | `_fleshImpact()` | 38 |
| 3904 | `_fxVoice()` | 9 |
| 3913 | `_impactSfx()` | 17 |
| 3930 | `_tintFx()` | 16 |
| 3946 | `_damage()` | 42 |
| 3988 | `_playerHurtFx()` | 6 |
| 3994 | `_kill()` | 53 |
| 4047 | `_checkArenaWin()` | 30 |
| 4077 | `_dmgArc()` | 79 |
| 4156 | `_mkBanner()` | 9 |
| 4165 | `_updateKillSequenceHud()` | 12 |
| 4177 | `_resetKillSequence()` | 5 |
| 4182 | `_playerKillFeedback()` | 18 |
| 4200 | `_acertoPrevisto()` | 5 |
| 4205 | `_hitmarker()` | 15 |
| 4220 | `_dmgNumber()` | 20 |
| 4240 | `_feed()` | 19 |
| 4259 | `_skullIcon()` | 6 |
| 4265 | `_killfeedWeaponIcon()` | 9 |
| 4274 | `_wpnIcon()` | 64 |
| 4338 | `_tracer()` | 26 |
| 4364 | `_puff()` | 39 |
| 4403 | `_holeDecalMat()` | 8 |
| 4411 | `_flash()` | 61 |
| 4472 | `_vmTetoTela()` | 10 |
| 4482 | `_muzzleWorld()` | 30 |
| 4512 | `_aimOrigin()` | 5 |
| 4517 | `_updateDoors()` | 10 |
| 4527 | `_updateFx()` | 57 |
| 4584 | `_ejectCasing()` | 17 |
| 4601 | `_makeCtfFlagTex()` | 23 |
| 4624 | `_paintFlagSymbol()` | 9 |
| 4633 | `_flagTexFor()` | 26 |
| 4659 | `_legadoSimbolo()` | 8 |
| 4667 | `_loadCtfSymbols()` | 22 |
| 4689 | `_makeCtfZoneTex()` | 31 |
| 4720 | `_makeSmokeTex()` | 10 |
| 4730 | `_updateSmokeHud()` | 4 |
| 4734 | `_grenadeSpatial()` | 14 |
| 4748 | `_spawnGrenade()` | 19 |
| 4767 | `_throwNade()` | 13 |
| 4780 | `_throwSmoke()` | 1 |
| 4781 | `_throwFrag()` | 4 |
| 4785 | `_explodeFrag()` | 40 |
| 4825 | `_corDaFumaca()` | 16 |
| 4841 | `_popSmoke()` | 23 |
| 4864 | `_updateGrenades()` | 35 |
| 4899 | `_teamColor()` | 15 |
| 4914 | `_teamInk()` | 7 |
| 4921 | `_factionOf()` | 1 |
| 4922 | `_voiceKey()` | 1 |
| 4923 | `_teamName()` | 1 |
| 4924 | `_teamTag()` | 6 |
| 4930 | `_plaqueta()` | 13 |
| 4943 | `_mirror()` | 2 |
| 4945 | `_defNoLado()` | 3 |
| 4948 | `_botSeparation()` | 61 |
| 5009 | `_initCTF()` | 86 |
| 5095 | `_updateCTF()` | 61 |
| 5156 | `_ctfWin()` | 24 |
| 5180 | `_freeYaw()` | 25 |
| 5205 | `_pullString()` | 23 |
| 5228 | `_walkReach()` | 32 |
| 5260 | `_wpComp()` | 16 |
| 5276 | `_findPathLocal()` | 22 |
| 5298 | `_botCtf()` | 137 |
| 5435 | `_hideCtfHud()` | 6 |
| 5441 | `_updateCtfHud()` | 76 |
| 5517 | `_collide()` | 23 |
| 5540 | `_collideRot()` | 22 |
| 5562 | `_mantleAlcance()` | 50 |
| 5612 | `_mantleAlcancavel()` | 12 |
| 5624 | `_mantleTarget()` | 35 |
| 5659 | `_freeSpot()` | 30 |
| 5689 | `_retaAndavel()` | 20 |
| 5709 | `_walkDepth()` | 16 |
| 5725 | `_noteHit()` | 17 |
| 5742 | `_deathFeedback()` | 45 |
| 5787 | `_toggleCamView()` | 6 |
| 5793 | `setCamView()` | 14 |
| 5807 | `_syncCamViewVis()` | 8 |
| 5815 | `_ensurePlayerTP()` | 26 |
| 5841 | `_updatePlayerTP()` | 39 |
| 5880 | `_updateCrosshairParallax()` | 40 |
| 5920 | `_tpDeath()` | 18 |
| 5938 | `_tpRevive()` | 13 |
| 5951 | `_moveEntity()` | 101 |
| 6052 | `_updatePlayer()` | 304 |
| 6356 | `_footstepSurface()` | 13 |
| 6369 | `_updatePickups()` | 158 |
| 6527 | `_wpnMode()` | 5 |
| 6532 | `_botWeapon()` | 10 |
| 6542 | `_municaoInfinita()` | 1 |
| 6543 | `_pickupAllowed()` | 9 |
| 6552 | `_grabNearPickup()` | 10 |
| 6562 | `_grabPickup()` | 35 |
| 6597 | `_assentarNoChao()` | 10 |
| 6607 | `refreshPickupModels()` | 24 |
| 6631 | `_dropWeapon()` | 20 |
| 6651 | `_sumirDrop()` | 36 |
| 6687 | `_spawnY()` | 3 |
| 6690 | `_spawnYaw()` | 5 |
| 6695 | `_pickSpawn()` | 23 |
| 6718 | `_respawnPlayer()` | 34 |
| 6752 | `_losClear()` | 18 |
| 6770 | `_botCall()` | 41 |
| 6811 | `_teamMarkTex()` | 23 |
| 6834 | `_makeTeamMark()` | 16 |
| 6850 | `_trocarPersonagem()` | 18 |
| 6868 | `_syncRemoteWeapon()` | 23 |
| 6891 | `_updateTeamMark()` | 7 |
| 6898 | `_botEye()` | 1 |
| 6899 | `_enemyOf()` | 8 |
| 6907 | `_duelToken()` | 22 |
| 6929 | `_respawnEntity()` | 21 |
| 6950 | `_updateBot()` | 822 |
| 7772 | `_flushTraining()` | 13 |
| 7785 | `_updateBotNN()` | 73 |
| 7858 | `_botShootNN()` | 46 |
| 7904 | `_radarFoot()` | 38 |
| 7942 | `_updateRadar()` | 64 |
| 8006 | `_banner()` | 26 |
| 8032 | `_resultadoDaRodada()` | 4 |
| 8036 | `_showScoreboard()` | 49 |
| 8085 | `_updateWeaponHud()` | 35 |
| 8120 | `_updateHud()` | 88 |
| 8208 | `update()` | 90 |
| 8298 | `dispose()` | 51 |

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
