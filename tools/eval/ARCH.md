# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.14 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 8200 | 316 |
| `public/js/main.js` | 4207 | 323 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 633 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3306 linhas (40% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6802 | `_updateBot()` | ⚠️ candidato a extração |
| 621 | 669 | `constructor()` | 🔴 append-only |
| 302 | 5925 | `_updatePlayer()` | ⚠️ candidato a extração |
| 269 | 1390 | `_buildViewModels()` |  |
| 255 | 2511 | `_resetPositions()` |  |
| 158 | 6240 | `_updatePickups()` |  |
| 137 | 5174 | `_botCtf()` |  |
| 132 | 2096 | `_touchControls()` |  |
| 99 | 5826 | `_moveEntity()` |  |
| 90 | 8060 | `update()` | 🔴 append-only |
| 89 | 3487 | `_tryShoot()` |  |
| 88 | 7972 | `_updateHud()` |  |
| 86 | 4885 | `_initCTF()` |  |
| 79 | 3144 | `_ensureVmPrecisionQa()` |  |
| 79 | 3980 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `331–334` `409–503` `530–551` `1390–1799` `3110–3143` `3331–3422` `3441–3575` `3590–3605` `3650–3709` `4241–4266` `4314–4389` `4462–4478` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `170–173` `224–224` `250–261` `593–604` `3849–3949` `4824–4884` `5056–5310` `5393–5415` `5925–6226` `6623–6640` `6750–6780` `6802–7623` | — |
| **MAPAS / MUNDO** | `1336–1389` `2511–2765` `4885–5031` `6240–6397` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1814–1823` `1938–1969` `3018–3030` `4267–4305` `4405–4461` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1290–1335` `2970–2992` `3008–3017` `3031–3047` `3980–4058` `4108–4161` `4177–4240` `7794–7857` `7888–7936` `7972–8059` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8060–8149 · `_dom()` 1290–1335 · `constructor()` 669–1289

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3865 de 8200 linhas (47%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 349 | `aberturaCone` | 12 |
| 361 | `anguloDeDisparo` | 4 |
| 365 | `coneDoDisparo` | 16 |
| 382 | `D2R` | 4 |
| 386 | `DMG_FALLOFF` | 5 |
| 391 | `HS_MUL` | 3 |
| 394 | `BALL_CLASS` | 15 |
| 409 | `STATIC_CLASS` | 75 |
| 485 | `VM_KNOB` | 19 |
| 506 | `vmFovForAspect` | 24 |
| 530 | `VM_OFF` | 22 |
| 552 | `vmOffY` | 35 |
| 587 | `VMP` | 6 |
| 593 | `BOT_SKILLS` | 11 |
| 605 | `diffKey` | 4 |
| 610 | `rollBotSkill` | 7 |
| 617 | `botTier` | 4 |
| 621 | `_cyclePool` | 4 |
| 625 | `_rosterPool` | 15 |
| 640 | `pickMatchRoster` | 12 |
| 652 | `BOT_WEAPON_POOL` | 5 |
| 657 | `pickMatchWeapons` | 9 |
| 669 | `constructor()` | 621 |
| 1290 | `_dom()` | 46 |
| 1336 | `_buildEnv()` | 54 |
| 1390 | `_buildViewModels()` | 269 |
| 1659 | `_vmFrame` | 141 |
| 1800 | `_vmMontarTardio` | 14 |
| 1814 | `_makePuffTexture()` | 10 |
| 1824 | `_makeBloodTex()` | 19 |
| 1843 | `_makeBloodPoolTex()` | 21 |
| 1864 | `_bloodDecal()` | 16 |
| 1880 | `_makeBloodFx()` | 20 |
| 1900 | `_bloodSpatter()` | 18 |
| 1918 | `_bloodPoolAt()` | 6 |
| 1924 | `_updateBlood()` | 14 |
| 1938 | `_makeFlashTex()` | 22 |
| 1960 | `_makeFlashCoreTex()` | 10 |
| 1970 | `_input()` | 2 |
| 1972 | `_kd` | 41 |
| 2013 | `_ku` | 4 |
| 2017 | `_md` | 38 |
| 2055 | `_mu` | 7 |
| 2062 | `_mm` | 15 |
| 2077 | `_cc` | 1 |
| 2078 | `_blur` | 1 |
| 2079 | `_plc` | 17 |
| 2096 | `_touchControls()` | 132 |
| 2228 | `_aimAssist()` | 28 |
| 2256 | `_requestLock()` | 27 |
| 2283 | `_travaAtalhos()` | 4 |
| 2287 | `_soltaAtalhos()` | 5 |
| 2292 | `espectando()` | 2 |
| 2294 | `_acceptInput()` | 8 |
| 2302 | `_pauseBackdrop()` | 7 |
| 2309 | `_radioShow()` | 6 |
| 2315 | `_radioUi()` | 8 |
| 2323 | `_radioPick()` | 19 |
| 2342 | `_abilityNotice()` | 10 |
| 2352 | `_resetSliceAbilities()` | 9 |
| 2361 | `_stackTrace()` | 28 |
| 2389 | `_updateMotocaCharge()` | 10 |
| 2399 | `_recordRoutePoint()` | 11 |
| 2410 | `_routePing()` | 23 |
| 2433 | `_tickRoutePings()` | 12 |
| 2445 | `_objectiveInteractionMultiplier()` | 14 |
| 2459 | `start()` | 5 |
| 2464 | `_startAnnouncerLab()` | 9 |
| 2473 | `_startRound()` | 38 |
| 2511 | `_resetPositions()` | 255 |
| 2766 | `_checkCtfAlvo()` | 13 |
| 2779 | `_checkPace()` | 13 |
| 2792 | `_endRound()` | 34 |
| 2826 | `_roundWinnerVoice()` | 12 |
| 2838 | `_fimDaPartida()` | 7 |
| 2845 | `_endMatch()` | 61 |
| 2906 | `_ensureDolly()` | 41 |
| 2947 | `_tickDolly()` | 23 |
| 2970 | `setPaused()` | 23 |
| 2993 | `_now()` | 3 |
| 2996 | `pauseArmed()` | 1 |
| 2997 | `_syncPauseArm()` | 7 |
| 3004 | `resume()` | 4 |
| 3008 | `applySettings()` | 10 |
| 3018 | `_applyQuality()` | 13 |
| 3031 | `onResize()` | 17 |
| 3048 | `_switchTeam()` | 62 |
| 3110 | `_applyVmVisibility()` | 34 |
| 3144 | `_ensureVmPrecisionQa()` | 79 |
| 3223 | `_syncVmPresentation()` | 19 |
| 3242 | `_vmlabEnsure()` | 14 |
| 3256 | `_vmlabFrame()` | 28 |
| 3284 | `_tuneGet()` | 15 |
| 3299 | `_tune()` | 23 |
| 3322 | `_fxSet()` | 2 |
| 3324 | `_qaCicloArma()` | 7 |
| 3331 | `_switchWeapon()` | 39 |
| 3370 | `_deploySfx()` | 7 |
| 3377 | `_scope()` | 17 |
| 3394 | `_zoomFov()` | 5 |
| 3399 | `_reloading()` | 1 |
| 3400 | `_startReload()` | 23 |
| 3423 | `_reloadLayers()` | 18 |
| 3441 | `_installRecoil()` | 33 |
| 3474 | `_shotRecoil()` | 13 |
| 3487 | `_tryShoot()` | 89 |
| 3576 | `_tryKnifeAttack()` | 14 |
| 3590 | `_meleeHit()` | 16 |
| 3606 | `_meleeRange()` | 5 |
| 3611 | `_botMelee()` | 28 |
| 3639 | `_shotDamage()` | 11 |
| 3650 | `_fireHitscan()` | 60 |
| 3710 | `_targetFromHit()` | 9 |
| 3719 | `_penetrationExit()` | 20 |
| 3739 | `_surfaceOf()` | 27 |
| 3766 | `_armoredTarget()` | 3 |
| 3769 | `_fleshImpact()` | 38 |
| 3807 | `_fxVoice()` | 9 |
| 3816 | `_impactSfx()` | 17 |
| 3833 | `_tintFx()` | 16 |
| 3849 | `_damage()` | 42 |
| 3891 | `_playerHurtFx()` | 6 |
| 3897 | `_kill()` | 53 |
| 3950 | `_checkArenaWin()` | 30 |
| 3980 | `_dmgArc()` | 79 |
| 4059 | `_mkBanner()` | 9 |
| 4068 | `_updateKillSequenceHud()` | 12 |
| 4080 | `_resetKillSequence()` | 5 |
| 4085 | `_playerKillFeedback()` | 18 |
| 4103 | `_acertoPrevisto()` | 5 |
| 4108 | `_hitmarker()` | 15 |
| 4123 | `_dmgNumber()` | 20 |
| 4143 | `_feed()` | 19 |
| 4162 | `_skullIcon()` | 6 |
| 4168 | `_killfeedWeaponIcon()` | 9 |
| 4177 | `_wpnIcon()` | 64 |
| 4241 | `_tracer()` | 26 |
| 4267 | `_puff()` | 39 |
| 4306 | `_holeDecalMat()` | 8 |
| 4314 | `_flash()` | 54 |
| 4368 | `_muzzleWorld()` | 22 |
| 4390 | `_aimOrigin()` | 5 |
| 4395 | `_updateDoors()` | 10 |
| 4405 | `_updateFx()` | 57 |
| 4462 | `_ejectCasing()` | 17 |
| 4479 | `_makeCtfFlagTex()` | 23 |
| 4502 | `_paintFlagSymbol()` | 9 |
| 4511 | `_flagTexFor()` | 26 |
| 4537 | `_legadoSimbolo()` | 8 |
| 4545 | `_loadCtfSymbols()` | 22 |
| 4567 | `_makeCtfZoneTex()` | 31 |
| 4598 | `_makeSmokeTex()` | 10 |
| 4608 | `_updateSmokeHud()` | 4 |
| 4612 | `_grenadeSpatial()` | 14 |
| 4626 | `_spawnGrenade()` | 19 |
| 4645 | `_throwNade()` | 13 |
| 4658 | `_throwSmoke()` | 1 |
| 4659 | `_throwFrag()` | 4 |
| 4663 | `_explodeFrag()` | 40 |
| 4703 | `_corDaFumaca()` | 16 |
| 4719 | `_popSmoke()` | 23 |
| 4742 | `_updateGrenades()` | 35 |
| 4777 | `_teamColor()` | 15 |
| 4792 | `_teamInk()` | 7 |
| 4799 | `_factionOf()` | 1 |
| 4800 | `_voiceKey()` | 1 |
| 4801 | `_teamName()` | 1 |
| 4802 | `_teamTag()` | 6 |
| 4808 | `_plaqueta()` | 13 |
| 4821 | `_mirror()` | 3 |
| 4824 | `_botSeparation()` | 61 |
| 4885 | `_initCTF()` | 86 |
| 4971 | `_updateCTF()` | 61 |
| 5032 | `_ctfWin()` | 24 |
| 5056 | `_freeYaw()` | 25 |
| 5081 | `_pullString()` | 23 |
| 5104 | `_walkReach()` | 32 |
| 5136 | `_wpComp()` | 16 |
| 5152 | `_findPathLocal()` | 22 |
| 5174 | `_botCtf()` | 137 |
| 5311 | `_hideCtfHud()` | 6 |
| 5317 | `_updateCtfHud()` | 76 |
| 5393 | `_collide()` | 23 |
| 5416 | `_collideRot()` | 22 |
| 5438 | `_mantleAlcance()` | 50 |
| 5488 | `_mantleAlcancavel()` | 12 |
| 5500 | `_mantleTarget()` | 35 |
| 5535 | `_freeSpot()` | 30 |
| 5565 | `_retaAndavel()` | 20 |
| 5585 | `_walkDepth()` | 16 |
| 5601 | `_noteHit()` | 17 |
| 5618 | `_deathFeedback()` | 45 |
| 5663 | `_toggleCamView()` | 6 |
| 5669 | `setCamView()` | 14 |
| 5683 | `_syncCamViewVis()` | 8 |
| 5691 | `_ensurePlayerTP()` | 25 |
| 5716 | `_updatePlayerTP()` | 39 |
| 5755 | `_updateCrosshairParallax()` | 40 |
| 5795 | `_tpDeath()` | 18 |
| 5813 | `_tpRevive()` | 13 |
| 5826 | `_moveEntity()` | 99 |
| 5925 | `_updatePlayer()` | 302 |
| 6227 | `_footstepSurface()` | 13 |
| 6240 | `_updatePickups()` | 158 |
| 6398 | `_wpnMode()` | 5 |
| 6403 | `_botWeapon()` | 10 |
| 6413 | `_municaoInfinita()` | 1 |
| 6414 | `_pickupAllowed()` | 9 |
| 6423 | `_grabNearPickup()` | 10 |
| 6433 | `_grabPickup()` | 35 |
| 6468 | `_assentarNoChao()` | 10 |
| 6478 | `refreshPickupModels()` | 24 |
| 6502 | `_dropWeapon()` | 20 |
| 6522 | `_sumirDrop()` | 36 |
| 6558 | `_spawnY()` | 3 |
| 6561 | `_spawnYaw()` | 5 |
| 6566 | `_pickSpawn()` | 23 |
| 6589 | `_respawnPlayer()` | 34 |
| 6623 | `_losClear()` | 18 |
| 6641 | `_botCall()` | 41 |
| 6682 | `_teamMarkTex()` | 23 |
| 6705 | `_makeTeamMark()` | 16 |
| 6721 | `_syncRemoteWeapon()` | 22 |
| 6743 | `_updateTeamMark()` | 7 |
| 6750 | `_botEye()` | 1 |
| 6751 | `_enemyOf()` | 8 |
| 6759 | `_duelToken()` | 22 |
| 6781 | `_respawnEntity()` | 21 |
| 6802 | `_updateBot()` | 822 |
| 7624 | `_flushTraining()` | 13 |
| 7637 | `_updateBotNN()` | 73 |
| 7710 | `_botShootNN()` | 46 |
| 7756 | `_radarFoot()` | 38 |
| 7794 | `_updateRadar()` | 64 |
| 7858 | `_banner()` | 26 |
| 7884 | `_resultadoDaRodada()` | 4 |
| 7888 | `_showScoreboard()` | 49 |
| 7937 | `_updateWeaponHud()` | 35 |
| 7972 | `_updateHud()` | 88 |
| 8060 | `update()` | 90 |
| 8150 | `dispose()` | 50 |

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
