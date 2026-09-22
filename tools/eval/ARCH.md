# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.261 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7679 | 279 |
| `public/js/main.js` | 3535 | 288 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3176 linhas (41% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6283 | `_updateBot()` | ⚠️ candidato a extração |
| 598 | 621 | `constructor()` | 🔴 append-only |
| 261 | 5474 | `_updatePlayer()` |  |
| 251 | 2290 | `_resetPositions()` |  |
| 241 | 1317 | `_buildViewModels()` |  |
| 148 | 5748 | `_updatePickups()` |  |
| 137 | 4870 | `_botCtf()` |  |
| 116 | 2014 | `_touchControls()` |  |
| 98 | 5376 | `_moveEntity()` |  |
| 90 | 7539 | `update()` | 🔴 append-only |
| 87 | 7452 | `_updateHud()` |  |
| 86 | 4585 | `_initCTF()` |  |
| 83 | 3244 | `_tryShoot()` |  |
| 79 | 2909 | `_ensureVmPrecisionQa()` |  |
| 79 | 3713 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `303–308` `365–459` `486–507` `1317–1716` `2879–2908` `3088–3179` `3198–3326` `3340–3355` `3400–3453` `3941–3964` `4012–4097` `4169–4185` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `157–160` `211–211` `237–248` `549–560` `3593–3712` `4524–4584` `4752–5006` `5089–5111` `5474–5734` `6104–6121` `6231–6261` `6283–7104` | — |
| **MAPAS / MUNDO** | `1263–1316` `2290–2540` `4585–4728` `5748–5895` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1731–1740` `1855–1886` `2789–2801` `3965–4003` `4113–4168` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1219–1262` `2745–2767` `2783–2788` `2802–2816` `3713–3791` `3808–3861` `3877–3940` `7275–7338` `7369–7416` `7452–7538` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7539–7628 · `_dom()` 1219–1262 · `constructor()` 621–1218

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3799 de 7679 linhas (49%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 40 | `ANNOUNCER_LAB` | 4 |
| 44 | `VMLAB` | 8 |
| 52 | `VM_MAT_LEGACY` | 4 |
| 58 | `DROP_TTL` | 8 |
| 66 | `ROUNDS_MAX` | 27 |
| 96 | `CTF_CLOCK_SHOW` | 4 |
| 100 | `KILLS_PER_PLAYER` | 7 |
| 107 | `PACE` | 33 |
| 140 | `PAUSE_ARM_MS` | 9 |
| 150 | `confirmGate` | 7 |
| 161 | `BOT_AIM_PITCH` | 4 |
| 165 | `BOT_DMG_PLAYER` | 21 |
| 186 | `BOT_FAIR` | 5 |
| 191 | `BOT_MOVE2` | 15 |
| 215 | `BOT_FOCUS_MIN` | 22 |
| 241 | `BOT_TOKEN_REST` | 7 |
| 249 | `MOVE_MUL` | 6 |
| 256 | `MOVE2` | 5 |
| 261 | `RACK_OLD` | 4 |
| 265 | `RACK_RETA` | 25 |
| 292 | `RADIO` | 5 |
| 298 | `MK_LABELS` | 5 |
| 303 | `GUNFEEL` | 6 |
| 314 | `coneDoDisparo` | 23 |
| 338 | `D2R` | 4 |
| 342 | `DMG_FALLOFF` | 5 |
| 347 | `HS_MUL` | 3 |
| 350 | `BALL_CLASS` | 15 |
| 365 | `STATIC_CLASS` | 75 |
| 441 | `VM_KNOB` | 19 |
| 462 | `vmFovForAspect` | 24 |
| 486 | `VM_OFF` | 22 |
| 508 | `vmOffY` | 35 |
| 543 | `VMP` | 6 |
| 549 | `BOT_SKILLS` | 11 |
| 561 | `diffKey` | 4 |
| 566 | `rollBotSkill` | 7 |
| 573 | `botTier` | 4 |
| 577 | `_cyclePool` | 4 |
| 581 | `_rosterPool` | 15 |
| 596 | `pickMatchRoster` | 12 |
| 608 | `BOT_WEAPON_POOL` | 5 |
| 613 | `pickMatchWeapons` | 7 |
| 621 | `constructor()` | 598 |
| 1219 | `_dom()` | 44 |
| 1263 | `_buildEnv()` | 54 |
| 1317 | `_buildViewModels()` | 241 |
| 1558 | `_vmFrame` | 159 |
| 1717 | `_vmMontarTardio` | 14 |
| 1731 | `_makePuffTexture()` | 10 |
| 1741 | `_makeBloodTex()` | 19 |
| 1760 | `_makeBloodPoolTex()` | 21 |
| 1781 | `_bloodDecal()` | 16 |
| 1797 | `_makeBloodFx()` | 20 |
| 1817 | `_bloodSpatter()` | 18 |
| 1835 | `_bloodPoolAt()` | 6 |
| 1841 | `_updateBlood()` | 14 |
| 1855 | `_makeFlashTex()` | 22 |
| 1877 | `_makeFlashCoreTex()` | 10 |
| 1887 | `_input()` | 2 |
| 1889 | `_kd` | 45 |
| 1934 | `_ku` | 4 |
| 1938 | `_md` | 35 |
| 1973 | `_mu` | 7 |
| 1980 | `_mm` | 15 |
| 1995 | `_cc` | 1 |
| 1996 | `_blur` | 1 |
| 1997 | `_plc` | 17 |
| 2014 | `_touchControls()` | 116 |
| 2130 | `_aimAssist()` | 28 |
| 2158 | `_requestLock()` | 27 |
| 2185 | `_travaAtalhos()` | 4 |
| 2189 | `_soltaAtalhos()` | 5 |
| 2194 | `espectando()` | 2 |
| 2196 | `_acceptInput()` | 8 |
| 2204 | `_pauseBackdrop()` | 7 |
| 2211 | `_radioShow()` | 6 |
| 2217 | `_radioUi()` | 8 |
| 2225 | `_radioPick()` | 16 |
| 2241 | `start()` | 5 |
| 2246 | `_startAnnouncerLab()` | 9 |
| 2255 | `_startRound()` | 35 |
| 2290 | `_resetPositions()` | 251 |
| 2541 | `_checkCtfAlvo()` | 13 |
| 2554 | `_checkPace()` | 13 |
| 2567 | `_endRound()` | 34 |
| 2601 | `_roundWinnerVoice()` | 12 |
| 2613 | `_fimDaPartida()` | 7 |
| 2620 | `_endMatch()` | 61 |
| 2681 | `_ensureDolly()` | 41 |
| 2722 | `_tickDolly()` | 23 |
| 2745 | `setPaused()` | 23 |
| 2768 | `_now()` | 3 |
| 2771 | `pauseArmed()` | 1 |
| 2772 | `_syncPauseArm()` | 7 |
| 2779 | `resume()` | 4 |
| 2783 | `applySettings()` | 6 |
| 2789 | `_applyQuality()` | 13 |
| 2802 | `onResize()` | 15 |
| 2817 | `_switchTeam()` | 62 |
| 2879 | `_applyVmVisibility()` | 30 |
| 2909 | `_ensureVmPrecisionQa()` | 79 |
| 2988 | `_syncVmPresentation()` | 19 |
| 3007 | `_vmlabEnsure()` | 14 |
| 3021 | `_vmlabFrame()` | 28 |
| 3049 | `_tuneGet()` | 15 |
| 3064 | `_tune()` | 23 |
| 3087 | `_fxSet()` | 1 |
| 3088 | `_switchWeapon()` | 37 |
| 3125 | `_deploySfx()` | 7 |
| 3132 | `_scope()` | 17 |
| 3149 | `_zoomFov()` | 8 |
| 3157 | `_reloading()` | 1 |
| 3158 | `_startReload()` | 22 |
| 3180 | `_reloadLayers()` | 18 |
| 3198 | `_installRecoil()` | 33 |
| 3231 | `_shotRecoil()` | 13 |
| 3244 | `_tryShoot()` | 83 |
| 3327 | `_tryKnifeAttack()` | 13 |
| 3340 | `_meleeHit()` | 16 |
| 3356 | `_meleeRange()` | 5 |
| 3361 | `_botMelee()` | 28 |
| 3389 | `_shotDamage()` | 11 |
| 3400 | `_fireHitscan()` | 54 |
| 3454 | `_targetFromHit()` | 9 |
| 3463 | `_penetrationExit()` | 20 |
| 3483 | `_surfaceOf()` | 27 |
| 3510 | `_armoredTarget()` | 3 |
| 3513 | `_fleshImpact()` | 38 |
| 3551 | `_fxVoice()` | 9 |
| 3560 | `_impactSfx()` | 17 |
| 3577 | `_tintFx()` | 16 |
| 3593 | `_damage()` | 41 |
| 3634 | `_playerHurtFx()` | 6 |
| 3640 | `_kill()` | 73 |
| 3713 | `_dmgArc()` | 79 |
| 3792 | `_mkBanner()` | 11 |
| 3803 | `_acertoPrevisto()` | 5 |
| 3808 | `_hitmarker()` | 15 |
| 3823 | `_dmgNumber()` | 20 |
| 3843 | `_feed()` | 19 |
| 3862 | `_skullIcon()` | 6 |
| 3868 | `_killfeedWeaponIcon()` | 9 |
| 3877 | `_wpnIcon()` | 64 |
| 3941 | `_tracer()` | 24 |
| 3965 | `_puff()` | 39 |
| 4004 | `_holeDecalMat()` | 8 |
| 4012 | `_flash()` | 66 |
| 4078 | `_muzzleWorld()` | 20 |
| 4098 | `_aimOrigin()` | 5 |
| 4103 | `_updateDoors()` | 10 |
| 4113 | `_updateFx()` | 56 |
| 4169 | `_ejectCasing()` | 17 |
| 4186 | `_makeCtfFlagTex()` | 23 |
| 4209 | `_paintFlagSymbol()` | 9 |
| 4218 | `_flagTexFor()` | 26 |
| 4244 | `_legadoSimbolo()` | 8 |
| 4252 | `_loadCtfSymbols()` | 22 |
| 4274 | `_makeCtfZoneTex()` | 31 |
| 4305 | `_makeSmokeTex()` | 8 |
| 4313 | `_updateSmokeHud()` | 4 |
| 4317 | `_grenadeSpatial()` | 14 |
| 4331 | `_spawnGrenade()` | 13 |
| 4344 | `_throwSmoke()` | 11 |
| 4355 | `_throwFrag()` | 13 |
| 4368 | `_explodeFrag()` | 40 |
| 4408 | `_corDaFumaca()` | 15 |
| 4423 | `_popSmoke()` | 21 |
| 4444 | `_updateGrenades()` | 35 |
| 4479 | `_teamColor()` | 14 |
| 4493 | `_teamInk()` | 6 |
| 4499 | `_factionOf()` | 1 |
| 4500 | `_voiceKey()` | 1 |
| 4501 | `_teamName()` | 1 |
| 4502 | `_teamTag()` | 6 |
| 4508 | `_plaqueta()` | 13 |
| 4521 | `_mirror()` | 3 |
| 4524 | `_botSeparation()` | 61 |
| 4585 | `_initCTF()` | 86 |
| 4671 | `_updateCTF()` | 58 |
| 4729 | `_ctfWin()` | 23 |
| 4752 | `_freeYaw()` | 25 |
| 4777 | `_pullString()` | 23 |
| 4800 | `_walkReach()` | 32 |
| 4832 | `_wpComp()` | 16 |
| 4848 | `_findPathLocal()` | 22 |
| 4870 | `_botCtf()` | 137 |
| 5007 | `_hideCtfHud()` | 6 |
| 5013 | `_updateCtfHud()` | 76 |
| 5089 | `_collide()` | 23 |
| 5112 | `_collideRot()` | 26 |
| 5138 | `_freeSpot()` | 30 |
| 5168 | `_retaAndavel()` | 20 |
| 5188 | `_walkDepth()` | 16 |
| 5204 | `_noteHit()` | 17 |
| 5221 | `_deathFeedback()` | 45 |
| 5266 | `_toggleCamView()` | 11 |
| 5277 | `_syncCamViewVis()` | 8 |
| 5285 | `_ensurePlayerTP()` | 25 |
| 5310 | `_updatePlayerTP()` | 35 |
| 5345 | `_tpDeath()` | 18 |
| 5363 | `_tpRevive()` | 13 |
| 5376 | `_moveEntity()` | 98 |
| 5474 | `_updatePlayer()` | 261 |
| 5735 | `_footstepSurface()` | 13 |
| 5748 | `_updatePickups()` | 148 |
| 5896 | `_wpnMode()` | 5 |
| 5901 | `_botWeapon()` | 10 |
| 5911 | `_municaoInfinita()` | 1 |
| 5912 | `_pickupAllowed()` | 7 |
| 5919 | `_grabPickup()` | 35 |
| 5954 | `_assentarNoChao()` | 10 |
| 5964 | `refreshPickupModels()` | 24 |
| 5988 | `_dropWeapon()` | 20 |
| 6008 | `_sumirDrop()` | 36 |
| 6044 | `_spawnY()` | 3 |
| 6047 | `_spawnYaw()` | 5 |
| 6052 | `_pickSpawn()` | 23 |
| 6075 | `_respawnPlayer()` | 29 |
| 6104 | `_losClear()` | 18 |
| 6122 | `_botCall()` | 41 |
| 6163 | `_teamMarkTex()` | 23 |
| 6186 | `_makeTeamMark()` | 16 |
| 6202 | `_syncRemoteWeapon()` | 22 |
| 6224 | `_updateTeamMark()` | 7 |
| 6231 | `_botEye()` | 1 |
| 6232 | `_enemyOf()` | 8 |
| 6240 | `_duelToken()` | 22 |
| 6262 | `_respawnEntity()` | 21 |
| 6283 | `_updateBot()` | 822 |
| 7105 | `_flushTraining()` | 13 |
| 7118 | `_updateBotNN()` | 73 |
| 7191 | `_botShootNN()` | 46 |
| 7237 | `_radarFoot()` | 38 |
| 7275 | `_updateRadar()` | 64 |
| 7339 | `_banner()` | 26 |
| 7365 | `_resultadoDaRodada()` | 4 |
| 7369 | `_showScoreboard()` | 48 |
| 7417 | `_updateWeaponHud()` | 35 |
| 7452 | `_updateHud()` | 87 |
| 7539 | `update()` | 90 |
| 7629 | `dispose()` | 50 |

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
