# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.58 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8317 | 326 |
| `public/js/main.js` | 4243 | 325 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3309 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6918 | `_updateBot()` | ⚠️ candidato a extração |
| 625 | 683 | `constructor()` | 🔴 append-only |
| 304 | 6039 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1408 | `_buildViewModels()` |  |
| 255 | 2595 | `_resetPositions()` |  |
| 158 | 6356 | `_updatePickups()` |  |
| 137 | 5286 | `_botCtf()` |  |
| 135 | 2155 | `_touchControls()` |  |
| 101 | 5938 | `_moveEntity()` |  |
| 90 | 8176 | `update()` | 🔴 append-only |
| 88 | 8088 | `_updateHud()` |  |
| 86 | 4997 | `_initCTF()` |  |
| 81 | 3582 | `_tryShoot()` |  |
| 79 | 3228 | `_ensureVmPrecisionQa()` |  |
| 79 | 4067 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `338–341` `420–514` `544–565` `1408–1817` `3194–3227` `3424–3517` `3536–3662` `3677–3692` `3737–3796` `4328–4353` `4401–4501` `4574–4590` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `177–180` `231–231` `257–268` `607–618` `3936–4036` `4936–4996` `5168–5422` `5505–5527` `6039–6342` `6739–6756` `6866–6896` `6918–7739` | — |
| **MAPAS / MUNDO** | `1354–1407` `2595–2849` `4997–5143` `6356–6513` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1832–1841` `1956–1994` `3102–3114` `4354–4392` `4517–4573` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1308–1353` `3054–3076` `3092–3101` `3115–3131` `4067–4145` `4195–4248` `4264–4327` `7910–7973` `8004–8052` `8088–8175` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8176–8265 · `_dom()` 1308–1353 · `constructor()` 683–1307

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3875 de 8317 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 635 | `_cyclePool` | 4 |
| 639 | `_rosterPool` | 15 |
| 654 | `pickMatchRoster` | 12 |
| 666 | `BOT_WEAPON_POOL` | 5 |
| 671 | `pickMatchWeapons` | 9 |
| 683 | `constructor()` | 625 |
| 1308 | `_dom()` | 46 |
| 1354 | `_buildEnv()` | 54 |
| 1408 | `_buildViewModels()` | 269 |
| 1677 | `_vmFrame` | 141 |
| 1818 | `_vmMontarTardio` | 14 |
| 1832 | `_makePuffTexture()` | 10 |
| 1842 | `_makeBloodTex()` | 19 |
| 1861 | `_makeBloodPoolTex()` | 21 |
| 1882 | `_bloodDecal()` | 16 |
| 1898 | `_makeBloodFx()` | 20 |
| 1918 | `_bloodSpatter()` | 18 |
| 1936 | `_bloodPoolAt()` | 6 |
| 1942 | `_updateBlood()` | 14 |
| 1956 | `_makeFlashTex()` | 21 |
| 1977 | `_makeFlashSoftTex()` | 8 |
| 1985 | `_makeFlashCoreTex()` | 10 |
| 1995 | `_input()` | 6 |
| 2001 | `_kd` | 49 |
| 2050 | `_ku` | 5 |
| 2055 | `_md` | 40 |
| 2095 | `_mu` | 7 |
| 2102 | `_mm` | 15 |
| 2117 | `_wh` | 17 |
| 2134 | `_cc` | 1 |
| 2135 | `_blur` | 1 |
| 2136 | `_plc` | 19 |
| 2155 | `_touchControls()` | 135 |
| 2290 | `_aimAssist()` | 28 |
| 2318 | `_requestLock()` | 27 |
| 2345 | `_travaAtalhos()` | 4 |
| 2349 | `_soltaAtalhos()` | 5 |
| 2354 | `espectando()` | 2 |
| 2356 | `_acceptInput()` | 7 |
| 2363 | `travarEntrada()` | 17 |
| 2380 | `_chatSeguraPausa()` | 5 |
| 2385 | `_pauseBackdrop()` | 7 |
| 2392 | `_radioShow()` | 6 |
| 2398 | `_radioUi()` | 8 |
| 2406 | `_radioPick()` | 20 |
| 2426 | `_abilityNotice()` | 10 |
| 2436 | `_resetSliceAbilities()` | 9 |
| 2445 | `_stackTrace()` | 28 |
| 2473 | `_updateMotocaCharge()` | 10 |
| 2483 | `_recordRoutePoint()` | 11 |
| 2494 | `_routePing()` | 23 |
| 2517 | `_tickRoutePings()` | 12 |
| 2529 | `_objectiveInteractionMultiplier()` | 14 |
| 2543 | `start()` | 5 |
| 2548 | `_startAnnouncerLab()` | 9 |
| 2557 | `_startRound()` | 38 |
| 2595 | `_resetPositions()` | 255 |
| 2850 | `_checkCtfAlvo()` | 13 |
| 2863 | `_checkPace()` | 13 |
| 2876 | `_endRound()` | 34 |
| 2910 | `_roundWinnerVoice()` | 12 |
| 2922 | `_fimDaPartida()` | 7 |
| 2929 | `_endMatch()` | 61 |
| 2990 | `_ensureDolly()` | 41 |
| 3031 | `_tickDolly()` | 23 |
| 3054 | `setPaused()` | 23 |
| 3077 | `_now()` | 3 |
| 3080 | `pauseArmed()` | 1 |
| 3081 | `_syncPauseArm()` | 7 |
| 3088 | `resume()` | 4 |
| 3092 | `applySettings()` | 10 |
| 3102 | `_applyQuality()` | 13 |
| 3115 | `onResize()` | 17 |
| 3132 | `_switchTeam()` | 62 |
| 3194 | `_applyVmVisibility()` | 34 |
| 3228 | `_ensureVmPrecisionQa()` | 79 |
| 3307 | `_syncVmPresentation()` | 19 |
| 3326 | `_vmlabEnsure()` | 14 |
| 3340 | `_vmlabFrame()` | 28 |
| 3368 | `_tuneGet()` | 15 |
| 3383 | `_tune()` | 23 |
| 3406 | `_fxSet()` | 2 |
| 3408 | `_qaCicloArma()` | 8 |
| 3416 | `_cycleWeapon()` | 8 |
| 3424 | `_switchWeapon()` | 39 |
| 3463 | `_deploySfx()` | 7 |
| 3470 | `_scope()` | 17 |
| 3487 | `_zoomFov()` | 5 |
| 3492 | `_reloading()` | 1 |
| 3493 | `_startReload()` | 25 |
| 3518 | `_reloadLayers()` | 18 |
| 3536 | `_installRecoil()` | 33 |
| 3569 | `_shotRecoil()` | 13 |
| 3582 | `_tryShoot()` | 81 |
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
| 5938 | `_moveEntity()` | 101 |
| 6039 | `_updatePlayer()` | 304 |
| 6343 | `_footstepSurface()` | 13 |
| 6356 | `_updatePickups()` | 158 |
| 6514 | `_wpnMode()` | 5 |
| 6519 | `_botWeapon()` | 10 |
| 6529 | `_municaoInfinita()` | 1 |
| 6530 | `_pickupAllowed()` | 9 |
| 6539 | `_grabNearPickup()` | 10 |
| 6549 | `_grabPickup()` | 35 |
| 6584 | `_assentarNoChao()` | 10 |
| 6594 | `refreshPickupModels()` | 24 |
| 6618 | `_dropWeapon()` | 20 |
| 6638 | `_sumirDrop()` | 36 |
| 6674 | `_spawnY()` | 3 |
| 6677 | `_spawnYaw()` | 5 |
| 6682 | `_pickSpawn()` | 23 |
| 6705 | `_respawnPlayer()` | 34 |
| 6739 | `_losClear()` | 18 |
| 6757 | `_botCall()` | 41 |
| 6798 | `_teamMarkTex()` | 23 |
| 6821 | `_makeTeamMark()` | 16 |
| 6837 | `_syncRemoteWeapon()` | 22 |
| 6859 | `_updateTeamMark()` | 7 |
| 6866 | `_botEye()` | 1 |
| 6867 | `_enemyOf()` | 8 |
| 6875 | `_duelToken()` | 22 |
| 6897 | `_respawnEntity()` | 21 |
| 6918 | `_updateBot()` | 822 |
| 7740 | `_flushTraining()` | 13 |
| 7753 | `_updateBotNN()` | 73 |
| 7826 | `_botShootNN()` | 46 |
| 7872 | `_radarFoot()` | 38 |
| 7910 | `_updateRadar()` | 64 |
| 7974 | `_banner()` | 26 |
| 8000 | `_resultadoDaRodada()` | 4 |
| 8004 | `_showScoreboard()` | 49 |
| 8053 | `_updateWeaponHud()` | 35 |
| 8088 | `_updateHud()` | 88 |
| 8176 | `update()` | 90 |
| 8266 | `dispose()` | 51 |

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
