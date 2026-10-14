# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.89 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8488 | 338 |
| `public/js/main.js` | 4565 | 341 |
| `public/js/glbchars.js` | 856 | 60 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3364 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 858 | 7052 | `_updateBot()` | ⚠️ candidato a extração |
| 637 | 727 | `constructor()` | 🔴 append-only |
| 308 | 6135 | `_updatePlayer()` | ⚠️ candidato a extração |
| 271 | 1467 | `_buildViewModels()` |  |
| 255 | 2661 | `_resetPositions()` |  |
| 158 | 6456 | `_updatePickups()` |  |
| 137 | 5369 | `_botCtf()` |  |
| 135 | 2221 | `_touchControls()` |  |
| 101 | 6034 | `_moveEntity()` |  |
| 90 | 8346 | `update()` | 🔴 append-only |
| 88 | 8258 | `_updateHud()` |  |
| 86 | 5080 | `_initCTF()` |  |
| 82 | 3653 | `_tryShoot()` |  |
| 79 | 3299 | `_ensureVmPrecisionQa()` |  |
| 79 | 4148 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `355–358` `440–534` `564–585` `1467–1878` `3265–3298` `3495–3588` `3607–3734` `3749–3764` `3809–3878` `4409–4434` `4482–4582` `4655–4671` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `187–190` `241–241` `274–285` `627–638` `4018–4117` `5019–5079` `5251–5505` `5588–5610` `6135–6442` `6841–6858` `6987–7017` `7052–7909` | — |
| **MAPAS / MUNDO** | `1410–1466` `2661–2915` `5080–5226` `6456–6613` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1893–1902` `2017–2055` `3168–3181` `4435–4473` `4598–4654` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1364–1409` `3120–3142` `3158–3167` `3182–3198` `4148–4226` `4276–4329` `4345–4408` `8080–8143` `8174–8222` `8258–8345` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8346–8435 · `_dom()` 1364–1409 · `constructor()` 727–1363

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3932 de 8488 linhas (46%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 50 | `ANNOUNCER_LAB` | 4 |
| 54 | `VMLAB` | 3 |
| 59 | `VM_QA_CICLO` | 3 |
| 63 | `VM_QA_ADS` | 8 |
| 71 | `VM_MAT_LEGACY` | 4 |
| 77 | `DROP_TTL` | 8 |
| 85 | `ROUNDS_MAX` | 27 |
| 113 | `CTF_ROUNDS_TO_WIN` | 4 |
| 118 | `sanitizeRounds` | 4 |
| 123 | `CTF_CLOCK_SHOW` | 4 |
| 127 | `KILLS_PER_PLAYER` | 7 |
| 134 | `PACE` | 33 |
| 167 | `PAUSE_ARM_MS` | 3 |
| 170 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 180 | `confirmGate` | 7 |
| 191 | `BOT_AIM_PITCH` | 4 |
| 195 | `BOT_DMG_PLAYER` | 21 |
| 216 | `BOT_FAIR` | 5 |
| 221 | `BOT_MOVE2` | 15 |
| 245 | `BOT_FOCUS_MIN` | 3 |
| 252 | `BOT_OUVE_PASSO` | 22 |
| 278 | `BOT_TOKEN_REST` | 7 |
| 286 | `MOVE_MUL` | 6 |
| 293 | `MOVE2` | 4 |
| 297 | `STEP_H` | 3 |
| 304 | `MANTLE_APOIO` | 4 |
| 308 | `MANTLE_GRID` | 5 |
| 313 | `RACK_OLD` | 4 |
| 317 | `RACK_RETA` | 25 |
| 344 | `RADIO` | 5 |
| 350 | `MK_LABELS` | 5 |
| 355 | `GUNFEEL` | 4 |
| 362 | `TRACER_STYLE` | 6 |
| 372 | `ADS_RAMPA_S` | 3 |
| 376 | `aberturaCone` | 16 |
| 392 | `anguloDeDisparo` | 4 |
| 396 | `coneDoDisparo` | 16 |
| 413 | `D2R` | 4 |
| 417 | `DMG_FALLOFF` | 5 |
| 422 | `HS_MUL` | 3 |
| 425 | `BALL_CLASS` | 15 |
| 440 | `STATIC_CLASS` | 75 |
| 516 | `VM_KNOB` | 19 |
| 535 | `vmAdsRot` | 4 |
| 540 | `vmFovForAspect` | 24 |
| 564 | `VM_OFF` | 22 |
| 586 | `vmOffY` | 35 |
| 621 | `VMP` | 6 |
| 627 | `BOT_SKILLS` | 11 |
| 639 | `diffKey` | 4 |
| 644 | `rollBotSkill` | 7 |
| 651 | `botTier` | 4 |
| 655 | `_cyclePool` | 5 |
| 660 | `_rosterPool` | 22 |
| 684 | `_pinnedDefs` | 5 |
| 689 | `pickMatchRoster` | 21 |
| 710 | `BOT_WEAPON_POOL` | 5 |
| 715 | `pickMatchWeapons` | 9 |
| 727 | `constructor()` | 637 |
| 1364 | `_dom()` | 46 |
| 1410 | `_buildEnv()` | 57 |
| 1467 | `_buildViewModels()` | 271 |
| 1738 | `_vmFrame` | 141 |
| 1879 | `_vmMontarTardio` | 14 |
| 1893 | `_makePuffTexture()` | 10 |
| 1903 | `_makeBloodTex()` | 19 |
| 1922 | `_makeBloodPoolTex()` | 21 |
| 1943 | `_bloodDecal()` | 16 |
| 1959 | `_makeBloodFx()` | 20 |
| 1979 | `_bloodSpatter()` | 18 |
| 1997 | `_bloodPoolAt()` | 6 |
| 2003 | `_updateBlood()` | 14 |
| 2017 | `_makeFlashTex()` | 21 |
| 2038 | `_makeFlashSoftTex()` | 8 |
| 2046 | `_makeFlashCoreTex()` | 10 |
| 2056 | `_input()` | 6 |
| 2062 | `_kd` | 49 |
| 2111 | `_ku` | 5 |
| 2116 | `_md` | 40 |
| 2156 | `_mu` | 7 |
| 2163 | `_mm` | 20 |
| 2183 | `_wh` | 17 |
| 2200 | `_cc` | 1 |
| 2201 | `_blur` | 1 |
| 2202 | `_plc` | 19 |
| 2221 | `_touchControls()` | 135 |
| 2356 | `_aimAssist()` | 28 |
| 2384 | `_requestLock()` | 27 |
| 2411 | `_travaAtalhos()` | 4 |
| 2415 | `_soltaAtalhos()` | 5 |
| 2420 | `espectando()` | 2 |
| 2422 | `_acceptInput()` | 7 |
| 2429 | `travarEntrada()` | 17 |
| 2446 | `_chatSeguraPausa()` | 5 |
| 2451 | `_pauseBackdrop()` | 7 |
| 2458 | `_radioShow()` | 6 |
| 2464 | `_radioUi()` | 8 |
| 2472 | `_radioPick()` | 20 |
| 2492 | `_abilityNotice()` | 10 |
| 2502 | `_resetSliceAbilities()` | 9 |
| 2511 | `_stackTrace()` | 28 |
| 2539 | `_updateMotocaCharge()` | 10 |
| 2549 | `_recordRoutePoint()` | 11 |
| 2560 | `_routePing()` | 23 |
| 2583 | `_tickRoutePings()` | 12 |
| 2595 | `_objectiveInteractionMultiplier()` | 14 |
| 2609 | `start()` | 5 |
| 2614 | `_startAnnouncerLab()` | 9 |
| 2623 | `_startRound()` | 38 |
| 2661 | `_resetPositions()` | 255 |
| 2916 | `_checkCtfAlvo()` | 13 |
| 2929 | `_checkPace()` | 13 |
| 2942 | `_endRound()` | 34 |
| 2976 | `_roundWinnerVoice()` | 12 |
| 2988 | `_fimDaPartida()` | 7 |
| 2995 | `_endMatch()` | 61 |
| 3056 | `_ensureDolly()` | 41 |
| 3097 | `_tickDolly()` | 23 |
| 3120 | `setPaused()` | 23 |
| 3143 | `_now()` | 3 |
| 3146 | `pauseArmed()` | 1 |
| 3147 | `_syncPauseArm()` | 7 |
| 3154 | `resume()` | 4 |
| 3158 | `applySettings()` | 10 |
| 3168 | `_applyQuality()` | 14 |
| 3182 | `onResize()` | 17 |
| 3199 | `_switchTeam()` | 66 |
| 3265 | `_applyVmVisibility()` | 34 |
| 3299 | `_ensureVmPrecisionQa()` | 79 |
| 3378 | `_syncVmPresentation()` | 19 |
| 3397 | `_vmlabEnsure()` | 14 |
| 3411 | `_vmlabFrame()` | 28 |
| 3439 | `_tuneGet()` | 15 |
| 3454 | `_tune()` | 23 |
| 3477 | `_fxSet()` | 2 |
| 3479 | `_qaCicloArma()` | 8 |
| 3487 | `_cycleWeapon()` | 8 |
| 3495 | `_switchWeapon()` | 39 |
| 3534 | `_deploySfx()` | 7 |
| 3541 | `_scope()` | 17 |
| 3558 | `_zoomFov()` | 5 |
| 3563 | `_reloading()` | 1 |
| 3564 | `_startReload()` | 25 |
| 3589 | `_reloadLayers()` | 18 |
| 3607 | `_installRecoil()` | 33 |
| 3640 | `_shotRecoil()` | 13 |
| 3653 | `_tryShoot()` | 82 |
| 3735 | `_tryKnifeAttack()` | 14 |
| 3749 | `_meleeHit()` | 16 |
| 3765 | `_meleeRange()` | 5 |
| 3770 | `_botMelee()` | 28 |
| 3798 | `_shotDamage()` | 11 |
| 3809 | `_fireHitscan()` | 70 |
| 3879 | `_targetFromHit()` | 9 |
| 3888 | `_penetrationExit()` | 20 |
| 3908 | `_surfaceOf()` | 27 |
| 3935 | `_armoredTarget()` | 3 |
| 3938 | `_fleshImpact()` | 38 |
| 3976 | `_fxVoice()` | 9 |
| 3985 | `_impactSfx()` | 17 |
| 4002 | `_tintFx()` | 16 |
| 4018 | `_damage()` | 42 |
| 4060 | `_playerHurtFx()` | 5 |
| 4065 | `_kill()` | 53 |
| 4118 | `_checkArenaWin()` | 30 |
| 4148 | `_dmgArc()` | 79 |
| 4227 | `_mkBanner()` | 9 |
| 4236 | `_updateKillSequenceHud()` | 12 |
| 4248 | `_resetKillSequence()` | 5 |
| 4253 | `_playerKillFeedback()` | 18 |
| 4271 | `_acertoPrevisto()` | 5 |
| 4276 | `_hitmarker()` | 15 |
| 4291 | `_dmgNumber()` | 20 |
| 4311 | `_feed()` | 19 |
| 4330 | `_skullIcon()` | 6 |
| 4336 | `_killfeedWeaponIcon()` | 9 |
| 4345 | `_wpnIcon()` | 64 |
| 4409 | `_tracer()` | 26 |
| 4435 | `_puff()` | 39 |
| 4474 | `_holeDecalMat()` | 8 |
| 4482 | `_flash()` | 61 |
| 4543 | `_vmTetoTela()` | 10 |
| 4553 | `_muzzleWorld()` | 30 |
| 4583 | `_aimOrigin()` | 5 |
| 4588 | `_updateDoors()` | 10 |
| 4598 | `_updateFx()` | 57 |
| 4655 | `_ejectCasing()` | 17 |
| 4672 | `_makeCtfFlagTex()` | 23 |
| 4695 | `_paintFlagSymbol()` | 9 |
| 4704 | `_flagTexFor()` | 26 |
| 4730 | `_legadoSimbolo()` | 8 |
| 4738 | `_loadCtfSymbols()` | 22 |
| 4760 | `_makeCtfZoneTex()` | 31 |
| 4791 | `_makeSmokeTex()` | 10 |
| 4801 | `_updateSmokeHud()` | 4 |
| 4805 | `_grenadeSpatial()` | 14 |
| 4819 | `_spawnGrenade()` | 19 |
| 4838 | `_throwNade()` | 13 |
| 4851 | `_throwSmoke()` | 1 |
| 4852 | `_throwFrag()` | 4 |
| 4856 | `_explodeFrag()` | 40 |
| 4896 | `_corDaFumaca()` | 16 |
| 4912 | `_popSmoke()` | 23 |
| 4935 | `_updateGrenades()` | 35 |
| 4970 | `_teamColor()` | 15 |
| 4985 | `_teamInk()` | 7 |
| 4992 | `_factionOf()` | 1 |
| 4993 | `_voiceKey()` | 1 |
| 4994 | `_teamName()` | 1 |
| 4995 | `_teamTag()` | 6 |
| 5001 | `_plaqueta()` | 13 |
| 5014 | `_mirror()` | 2 |
| 5016 | `_defNoLado()` | 3 |
| 5019 | `_botSeparation()` | 61 |
| 5080 | `_initCTF()` | 86 |
| 5166 | `_updateCTF()` | 61 |
| 5227 | `_ctfWin()` | 24 |
| 5251 | `_freeYaw()` | 25 |
| 5276 | `_pullString()` | 23 |
| 5299 | `_walkReach()` | 32 |
| 5331 | `_wpComp()` | 16 |
| 5347 | `_findPathLocal()` | 22 |
| 5369 | `_botCtf()` | 137 |
| 5506 | `_hideCtfHud()` | 6 |
| 5512 | `_updateCtfHud()` | 76 |
| 5588 | `_collide()` | 23 |
| 5611 | `_collideRot()` | 22 |
| 5633 | `_mantleAlcance()` | 50 |
| 5683 | `_mantleAlcancavel()` | 12 |
| 5695 | `_mantleTarget()` | 35 |
| 5730 | `_freeSpot()` | 30 |
| 5760 | `_retaAndavel()` | 20 |
| 5780 | `_walkDepth()` | 16 |
| 5796 | `_noteHit()` | 17 |
| 5813 | `_deathFeedback()` | 45 |
| 5858 | `_toggleCamView()` | 6 |
| 5864 | `setCamView()` | 16 |
| 5880 | `_syncCamViewVis()` | 8 |
| 5888 | `_ensurePlayerTP()` | 26 |
| 5914 | `_updatePlayerTP()` | 42 |
| 5956 | `_updateCrosshairParallax()` | 47 |
| 6003 | `_tpDeath()` | 18 |
| 6021 | `_tpRevive()` | 13 |
| 6034 | `_moveEntity()` | 101 |
| 6135 | `_updatePlayer()` | 308 |
| 6443 | `_footstepSurface()` | 13 |
| 6456 | `_updatePickups()` | 158 |
| 6614 | `_wpnMode()` | 7 |
| 6621 | `_botWeapon()` | 10 |
| 6631 | `_municaoInfinita()` | 1 |
| 6632 | `_pickupAllowed()` | 9 |
| 6641 | `_grabNearPickup()` | 10 |
| 6651 | `_grabPickup()` | 35 |
| 6686 | `_assentarNoChao()` | 10 |
| 6696 | `refreshPickupModels()` | 24 |
| 6720 | `_dropWeapon()` | 20 |
| 6740 | `_sumirDrop()` | 36 |
| 6776 | `_spawnY()` | 3 |
| 6779 | `_spawnYaw()` | 5 |
| 6784 | `_pickSpawn()` | 23 |
| 6807 | `_respawnPlayer()` | 34 |
| 6841 | `_losClear()` | 18 |
| 6859 | `_botCall()` | 41 |
| 6900 | `_teamMarkTex()` | 23 |
| 6923 | `_makeTeamMark()` | 16 |
| 6939 | `_trocarPersonagem()` | 18 |
| 6957 | `_syncRemoteWeapon()` | 23 |
| 6980 | `_updateTeamMark()` | 7 |
| 6987 | `_botEye()` | 1 |
| 6988 | `_enemyOf()` | 8 |
| 6996 | `_duelToken()` | 22 |
| 7018 | `_respawnEntity()` | 22 |
| 7040 | `_botOuve()` | 12 |
| 7052 | `_updateBot()` | 858 |
| 7910 | `_flushTraining()` | 13 |
| 7923 | `_updateBotNN()` | 73 |
| 7996 | `_botShootNN()` | 46 |
| 8042 | `_radarFoot()` | 38 |
| 8080 | `_updateRadar()` | 64 |
| 8144 | `_banner()` | 26 |
| 8170 | `_resultadoDaRodada()` | 4 |
| 8174 | `_showScoreboard()` | 49 |
| 8223 | `_updateWeaponHud()` | 35 |
| 8258 | `_updateHud()` | 88 |
| 8346 | `update()` | 90 |
| 8436 | `dispose()` | 52 |

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
