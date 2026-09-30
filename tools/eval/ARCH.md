# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.19 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8283 | 322 |
| `public/js/main.js` | 4217 | 323 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3314 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6885 | `_updateBot()` | ⚠️ candidato a extração |
| 624 | 675 | `constructor()` | 🔴 append-only |
| 304 | 6006 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1399 | `_buildViewModels()` |  |
| 255 | 2567 | `_resetPositions()` |  |
| 158 | 6323 | `_updatePickups()` |  |
| 137 | 5255 | `_botCtf()` |  |
| 135 | 2128 | `_touchControls()` |  |
| 99 | 5907 | `_moveEntity()` |  |
| 90 | 8143 | `update()` | 🔴 append-only |
| 89 | 3543 | `_tryShoot()` |  |
| 88 | 8055 | `_updateHud()` |  |
| 86 | 4966 | `_initCTF()` |  |
| 79 | 3200 | `_ensureVmPrecisionQa()` |  |
| 79 | 4036 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `334–337` `412–506` `536–557` `1399–1808` `3166–3199` `3387–3478` `3497–3631` `3646–3661` `3706–3765` `4297–4322` `4370–4470` `4543–4559` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `173–176` `227–227` `253–264` `599–610` `3905–4005` `4905–4965` `5137–5391` `5474–5496` `6006–6309` `6706–6723` `6833–6863` `6885–7706` | — |
| **MAPAS / MUNDO** | `1345–1398` `2567–2821` `4966–5112` `6323–6480` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1823–1832` `1947–1985` `3074–3086` `4323–4361` `4486–4542` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1299–1344` `3026–3048` `3064–3073` `3087–3103` `4036–4114` `4164–4217` `4233–4296` `7877–7940` `7971–8019` `8055–8142` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8143–8232 · `_dom()` 1299–1344 · `constructor()` 675–1298

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3881 de 8283 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 153 | `PAUSE_ARM_MS` | 3 |
| 156 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 166 | `confirmGate` | 7 |
| 177 | `BOT_AIM_PITCH` | 4 |
| 181 | `BOT_DMG_PLAYER` | 21 |
| 202 | `BOT_FAIR` | 5 |
| 207 | `BOT_MOVE2` | 15 |
| 231 | `BOT_FOCUS_MIN` | 22 |
| 257 | `BOT_TOKEN_REST` | 7 |
| 265 | `MOVE_MUL` | 6 |
| 272 | `MOVE2` | 4 |
| 276 | `STEP_H` | 3 |
| 283 | `MANTLE_APOIO` | 4 |
| 287 | `MANTLE_GRID` | 5 |
| 292 | `RACK_OLD` | 4 |
| 296 | `RACK_RETA` | 25 |
| 323 | `RADIO` | 5 |
| 329 | `MK_LABELS` | 5 |
| 334 | `GUNFEEL` | 4 |
| 341 | `TRACER_STYLE` | 6 |
| 352 | `aberturaCone` | 12 |
| 364 | `anguloDeDisparo` | 4 |
| 368 | `coneDoDisparo` | 16 |
| 385 | `D2R` | 4 |
| 389 | `DMG_FALLOFF` | 5 |
| 394 | `HS_MUL` | 3 |
| 397 | `BALL_CLASS` | 15 |
| 412 | `STATIC_CLASS` | 75 |
| 488 | `VM_KNOB` | 19 |
| 507 | `vmAdsRot` | 4 |
| 512 | `vmFovForAspect` | 24 |
| 536 | `VM_OFF` | 22 |
| 558 | `vmOffY` | 35 |
| 593 | `VMP` | 6 |
| 599 | `BOT_SKILLS` | 11 |
| 611 | `diffKey` | 4 |
| 616 | `rollBotSkill` | 7 |
| 623 | `botTier` | 4 |
| 627 | `_cyclePool` | 4 |
| 631 | `_rosterPool` | 15 |
| 646 | `pickMatchRoster` | 12 |
| 658 | `BOT_WEAPON_POOL` | 5 |
| 663 | `pickMatchWeapons` | 9 |
| 675 | `constructor()` | 624 |
| 1299 | `_dom()` | 46 |
| 1345 | `_buildEnv()` | 54 |
| 1399 | `_buildViewModels()` | 269 |
| 1668 | `_vmFrame` | 141 |
| 1809 | `_vmMontarTardio` | 14 |
| 1823 | `_makePuffTexture()` | 10 |
| 1833 | `_makeBloodTex()` | 19 |
| 1852 | `_makeBloodPoolTex()` | 21 |
| 1873 | `_bloodDecal()` | 16 |
| 1889 | `_makeBloodFx()` | 20 |
| 1909 | `_bloodSpatter()` | 18 |
| 1927 | `_bloodPoolAt()` | 6 |
| 1933 | `_updateBlood()` | 14 |
| 1947 | `_makeFlashTex()` | 21 |
| 1968 | `_makeFlashSoftTex()` | 8 |
| 1976 | `_makeFlashCoreTex()` | 10 |
| 1986 | `_input()` | 6 |
| 1992 | `_kd` | 49 |
| 2041 | `_ku` | 5 |
| 2046 | `_md` | 40 |
| 2086 | `_mu` | 7 |
| 2093 | `_mm` | 15 |
| 2108 | `_cc` | 1 |
| 2109 | `_blur` | 1 |
| 2110 | `_plc` | 18 |
| 2128 | `_touchControls()` | 135 |
| 2263 | `_aimAssist()` | 28 |
| 2291 | `_requestLock()` | 27 |
| 2318 | `_travaAtalhos()` | 4 |
| 2322 | `_soltaAtalhos()` | 5 |
| 2327 | `espectando()` | 2 |
| 2329 | `_acceptInput()` | 7 |
| 2336 | `travarEntrada()` | 17 |
| 2353 | `_chatSeguraPausa()` | 5 |
| 2358 | `_pauseBackdrop()` | 7 |
| 2365 | `_radioShow()` | 6 |
| 2371 | `_radioUi()` | 8 |
| 2379 | `_radioPick()` | 19 |
| 2398 | `_abilityNotice()` | 10 |
| 2408 | `_resetSliceAbilities()` | 9 |
| 2417 | `_stackTrace()` | 28 |
| 2445 | `_updateMotocaCharge()` | 10 |
| 2455 | `_recordRoutePoint()` | 11 |
| 2466 | `_routePing()` | 23 |
| 2489 | `_tickRoutePings()` | 12 |
| 2501 | `_objectiveInteractionMultiplier()` | 14 |
| 2515 | `start()` | 5 |
| 2520 | `_startAnnouncerLab()` | 9 |
| 2529 | `_startRound()` | 38 |
| 2567 | `_resetPositions()` | 255 |
| 2822 | `_checkCtfAlvo()` | 13 |
| 2835 | `_checkPace()` | 13 |
| 2848 | `_endRound()` | 34 |
| 2882 | `_roundWinnerVoice()` | 12 |
| 2894 | `_fimDaPartida()` | 7 |
| 2901 | `_endMatch()` | 61 |
| 2962 | `_ensureDolly()` | 41 |
| 3003 | `_tickDolly()` | 23 |
| 3026 | `setPaused()` | 23 |
| 3049 | `_now()` | 3 |
| 3052 | `pauseArmed()` | 1 |
| 3053 | `_syncPauseArm()` | 7 |
| 3060 | `resume()` | 4 |
| 3064 | `applySettings()` | 10 |
| 3074 | `_applyQuality()` | 13 |
| 3087 | `onResize()` | 17 |
| 3104 | `_switchTeam()` | 62 |
| 3166 | `_applyVmVisibility()` | 34 |
| 3200 | `_ensureVmPrecisionQa()` | 79 |
| 3279 | `_syncVmPresentation()` | 19 |
| 3298 | `_vmlabEnsure()` | 14 |
| 3312 | `_vmlabFrame()` | 28 |
| 3340 | `_tuneGet()` | 15 |
| 3355 | `_tune()` | 23 |
| 3378 | `_fxSet()` | 2 |
| 3380 | `_qaCicloArma()` | 7 |
| 3387 | `_switchWeapon()` | 39 |
| 3426 | `_deploySfx()` | 7 |
| 3433 | `_scope()` | 17 |
| 3450 | `_zoomFov()` | 5 |
| 3455 | `_reloading()` | 1 |
| 3456 | `_startReload()` | 23 |
| 3479 | `_reloadLayers()` | 18 |
| 3497 | `_installRecoil()` | 33 |
| 3530 | `_shotRecoil()` | 13 |
| 3543 | `_tryShoot()` | 89 |
| 3632 | `_tryKnifeAttack()` | 14 |
| 3646 | `_meleeHit()` | 16 |
| 3662 | `_meleeRange()` | 5 |
| 3667 | `_botMelee()` | 28 |
| 3695 | `_shotDamage()` | 11 |
| 3706 | `_fireHitscan()` | 60 |
| 3766 | `_targetFromHit()` | 9 |
| 3775 | `_penetrationExit()` | 20 |
| 3795 | `_surfaceOf()` | 27 |
| 3822 | `_armoredTarget()` | 3 |
| 3825 | `_fleshImpact()` | 38 |
| 3863 | `_fxVoice()` | 9 |
| 3872 | `_impactSfx()` | 17 |
| 3889 | `_tintFx()` | 16 |
| 3905 | `_damage()` | 42 |
| 3947 | `_playerHurtFx()` | 6 |
| 3953 | `_kill()` | 53 |
| 4006 | `_checkArenaWin()` | 30 |
| 4036 | `_dmgArc()` | 79 |
| 4115 | `_mkBanner()` | 9 |
| 4124 | `_updateKillSequenceHud()` | 12 |
| 4136 | `_resetKillSequence()` | 5 |
| 4141 | `_playerKillFeedback()` | 18 |
| 4159 | `_acertoPrevisto()` | 5 |
| 4164 | `_hitmarker()` | 15 |
| 4179 | `_dmgNumber()` | 20 |
| 4199 | `_feed()` | 19 |
| 4218 | `_skullIcon()` | 6 |
| 4224 | `_killfeedWeaponIcon()` | 9 |
| 4233 | `_wpnIcon()` | 64 |
| 4297 | `_tracer()` | 26 |
| 4323 | `_puff()` | 39 |
| 4362 | `_holeDecalMat()` | 8 |
| 4370 | `_flash()` | 61 |
| 4431 | `_vmTetoTela()` | 10 |
| 4441 | `_muzzleWorld()` | 30 |
| 4471 | `_aimOrigin()` | 5 |
| 4476 | `_updateDoors()` | 10 |
| 4486 | `_updateFx()` | 57 |
| 4543 | `_ejectCasing()` | 17 |
| 4560 | `_makeCtfFlagTex()` | 23 |
| 4583 | `_paintFlagSymbol()` | 9 |
| 4592 | `_flagTexFor()` | 26 |
| 4618 | `_legadoSimbolo()` | 8 |
| 4626 | `_loadCtfSymbols()` | 22 |
| 4648 | `_makeCtfZoneTex()` | 31 |
| 4679 | `_makeSmokeTex()` | 10 |
| 4689 | `_updateSmokeHud()` | 4 |
| 4693 | `_grenadeSpatial()` | 14 |
| 4707 | `_spawnGrenade()` | 19 |
| 4726 | `_throwNade()` | 13 |
| 4739 | `_throwSmoke()` | 1 |
| 4740 | `_throwFrag()` | 4 |
| 4744 | `_explodeFrag()` | 40 |
| 4784 | `_corDaFumaca()` | 16 |
| 4800 | `_popSmoke()` | 23 |
| 4823 | `_updateGrenades()` | 35 |
| 4858 | `_teamColor()` | 15 |
| 4873 | `_teamInk()` | 7 |
| 4880 | `_factionOf()` | 1 |
| 4881 | `_voiceKey()` | 1 |
| 4882 | `_teamName()` | 1 |
| 4883 | `_teamTag()` | 6 |
| 4889 | `_plaqueta()` | 13 |
| 4902 | `_mirror()` | 3 |
| 4905 | `_botSeparation()` | 61 |
| 4966 | `_initCTF()` | 86 |
| 5052 | `_updateCTF()` | 61 |
| 5113 | `_ctfWin()` | 24 |
| 5137 | `_freeYaw()` | 25 |
| 5162 | `_pullString()` | 23 |
| 5185 | `_walkReach()` | 32 |
| 5217 | `_wpComp()` | 16 |
| 5233 | `_findPathLocal()` | 22 |
| 5255 | `_botCtf()` | 137 |
| 5392 | `_hideCtfHud()` | 6 |
| 5398 | `_updateCtfHud()` | 76 |
| 5474 | `_collide()` | 23 |
| 5497 | `_collideRot()` | 22 |
| 5519 | `_mantleAlcance()` | 50 |
| 5569 | `_mantleAlcancavel()` | 12 |
| 5581 | `_mantleTarget()` | 35 |
| 5616 | `_freeSpot()` | 30 |
| 5646 | `_retaAndavel()` | 20 |
| 5666 | `_walkDepth()` | 16 |
| 5682 | `_noteHit()` | 17 |
| 5699 | `_deathFeedback()` | 45 |
| 5744 | `_toggleCamView()` | 6 |
| 5750 | `setCamView()` | 14 |
| 5764 | `_syncCamViewVis()` | 8 |
| 5772 | `_ensurePlayerTP()` | 25 |
| 5797 | `_updatePlayerTP()` | 39 |
| 5836 | `_updateCrosshairParallax()` | 40 |
| 5876 | `_tpDeath()` | 18 |
| 5894 | `_tpRevive()` | 13 |
| 5907 | `_moveEntity()` | 99 |
| 6006 | `_updatePlayer()` | 304 |
| 6310 | `_footstepSurface()` | 13 |
| 6323 | `_updatePickups()` | 158 |
| 6481 | `_wpnMode()` | 5 |
| 6486 | `_botWeapon()` | 10 |
| 6496 | `_municaoInfinita()` | 1 |
| 6497 | `_pickupAllowed()` | 9 |
| 6506 | `_grabNearPickup()` | 10 |
| 6516 | `_grabPickup()` | 35 |
| 6551 | `_assentarNoChao()` | 10 |
| 6561 | `refreshPickupModels()` | 24 |
| 6585 | `_dropWeapon()` | 20 |
| 6605 | `_sumirDrop()` | 36 |
| 6641 | `_spawnY()` | 3 |
| 6644 | `_spawnYaw()` | 5 |
| 6649 | `_pickSpawn()` | 23 |
| 6672 | `_respawnPlayer()` | 34 |
| 6706 | `_losClear()` | 18 |
| 6724 | `_botCall()` | 41 |
| 6765 | `_teamMarkTex()` | 23 |
| 6788 | `_makeTeamMark()` | 16 |
| 6804 | `_syncRemoteWeapon()` | 22 |
| 6826 | `_updateTeamMark()` | 7 |
| 6833 | `_botEye()` | 1 |
| 6834 | `_enemyOf()` | 8 |
| 6842 | `_duelToken()` | 22 |
| 6864 | `_respawnEntity()` | 21 |
| 6885 | `_updateBot()` | 822 |
| 7707 | `_flushTraining()` | 13 |
| 7720 | `_updateBotNN()` | 73 |
| 7793 | `_botShootNN()` | 46 |
| 7839 | `_radarFoot()` | 38 |
| 7877 | `_updateRadar()` | 64 |
| 7941 | `_banner()` | 26 |
| 7967 | `_resultadoDaRodada()` | 4 |
| 7971 | `_showScoreboard()` | 49 |
| 8020 | `_updateWeaponHud()` | 35 |
| 8055 | `_updateHud()` | 88 |
| 8143 | `update()` | 90 |
| 8233 | `dispose()` | 50 |

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
