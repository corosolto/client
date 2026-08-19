# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.147 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6977 | 251 |
| `public/js/main.js` | 2702 | 248 |
| `public/js/glbchars.js` | 1034 | 68 |
| `public/js/characters.js` | 1230 | 41 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 365 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3120 linhas (45% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 811 | 5629 | `_updateBot()` | ⚠️ candidato a extração |
| 551 | 589 | `constructor()` | 🔴 append-only |
| 373 | 4794 | `_updatePlayer()` | ⚠️ candidato a extração |
| 249 | 2034 | `_resetPositions()` |  |
| 241 | 1237 | `_buildViewModels()` |  |
| 148 | 5167 | `_updatePickups()` |  |
| 133 | 4262 | `_botCtf()` |  |
| 86 | 2818 | `_tryShoot()` |  |
| 84 | 3993 | `_initCTF()` |  |
| 80 | 6785 | `_updateHud()` |  |
| 79 | 3186 | `_dmgArc()` |  |
| 76 | 4401 | `_updateCtfHud()` |  |
| 74 | 6865 | `update()` | 🔴 append-only |
| 71 | 6453 | `_updateBotNN()` |  |
| 64 | 3343 | `_wpnIcon()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `344–347` `378–472` `499–520` `1237–1635` `2583–2588` `2670–2753` `2772–2969` `3407–3431` `3479–3543` `3610–3626` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `155–158` `209–209` `235–246` `562–573` `3055–3155` `3937–3992` `4158–4394` `4477–4499` `4794–5166` `5501–5518` `5600–6439` | — |
| **MAPAS / MUNDO** | `1183–1236` `2034–2282` `3993–4135` `5167–5314` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1636–1678` `2516–2528` `3432–3470` `3554–3609` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1140–1182` `2475–2494` `2510–2515` `2529–2535` `3186–3327` `3343–3406` `6607–6670` `6701–6749` `6785–6864` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6865–6938 · `_dom()` 1140–1182 · `constructor()` 589–1139

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3786 de 6977 linhas (54%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 42 | `VMLAB` | 8 |
| 50 | `VM_MAT_LEGACY` | 4 |
| 56 | `DROP_TTL` | 8 |
| 64 | `ROUNDS_MAX` | 27 |
| 94 | `CTF_CLOCK_SHOW` | 4 |
| 98 | `KILLS_PER_PLAYER` | 7 |
| 105 | `PACE` | 33 |
| 138 | `PAUSE_ARM_MS` | 9 |
| 148 | `confirmGate` | 7 |
| 159 | `BOT_AIM_PITCH` | 4 |
| 163 | `BOT_DMG_PLAYER` | 21 |
| 184 | `BOT_FAIR` | 5 |
| 189 | `BOT_MOVE2` | 15 |
| 213 | `BOT_FOCUS_MIN` | 22 |
| 239 | `BOT_TOKEN_REST` | 7 |
| 247 | `MOVE_MUL` | 6 |
| 254 | `MOVE2` | 4 |
| 258 | `STEP_H` | 32 |
| 294 | `MANTLE_APOIO` | 4 |
| 298 | `MANTLE_GRID` | 5 |
| 303 | `RACK_OLD` | 4 |
| 307 | `RACK_RETA` | 25 |
| 333 | `RADIO` | 5 |
| 339 | `MK_LABELS` | 5 |
| 344 | `GUNFEEL` | 4 |
| 351 | `D2R` | 4 |
| 355 | `DMG_FALLOFF` | 5 |
| 360 | `HS_MUL` | 3 |
| 363 | `BALL_CLASS` | 15 |
| 378 | `STATIC_CLASS` | 75 |
| 454 | `VM_KNOB` | 19 |
| 475 | `vmFovForAspect` | 24 |
| 499 | `VM_OFF` | 22 |
| 521 | `vmOffY` | 35 |
| 556 | `VMP` | 6 |
| 562 | `BOT_SKILLS` | 11 |
| 574 | `diffKey` | 4 |
| 579 | `rollBotSkill` | 7 |
| 589 | `constructor()` | 551 |
| 1140 | `_dom()` | 43 |
| 1183 | `_buildEnv()` | 54 |
| 1237 | `_buildViewModels()` | 241 |
| 1478 | `_vmFrame` | 158 |
| 1636 | `_makePuffTexture()` | 11 |
| 1647 | `_makeFlashTex()` | 22 |
| 1669 | `_makeFlashCoreTex()` | 10 |
| 1679 | `_input()` | 2 |
| 1681 | `_kd` | 39 |
| 1720 | `_ku` | 4 |
| 1724 | `_md` | 34 |
| 1758 | `_mu` | 7 |
| 1765 | `_mm` | 15 |
| 1780 | `_cc` | 1 |
| 1781 | `_blur` | 1 |
| 1782 | `_plc` | 14 |
| 1796 | `_requestLock()` | 23 |
| 1819 | `_travaAtalhos()` | 4 |
| 1823 | `_soltaAtalhos()` | 3 |
| 1826 | `_acceptInput()` | 8 |
| 1834 | `_pauseBackdrop()` | 7 |
| 1841 | `_radioShow()` | 6 |
| 1847 | `_radioUi()` | 8 |
| 1855 | `_radioPick()` | 20 |
| 1875 | `_abilityNotice()` | 10 |
| 1885 | `_resetSliceAbilities()` | 9 |
| 1894 | `_stackTrace()` | 28 |
| 1922 | `_updateMotocaCharge()` | 10 |
| 1932 | `_recordRoutePoint()` | 11 |
| 1943 | `_routePing()` | 23 |
| 1966 | `_tickRoutePings()` | 12 |
| 1978 | `_objectiveInteractionMultiplier()` | 14 |
| 1992 | `start()` | 4 |
| 1996 | `_startRound()` | 38 |
| 2034 | `_resetPositions()` | 249 |
| 2283 | `_checkCtfAlvo()` | 13 |
| 2296 | `_checkPace()` | 13 |
| 2309 | `_endRound()` | 37 |
| 2346 | `_fimDaPartida()` | 7 |
| 2353 | `_endMatch()` | 58 |
| 2411 | `_ensureDolly()` | 41 |
| 2452 | `_tickDolly()` | 23 |
| 2475 | `setPaused()` | 20 |
| 2495 | `_now()` | 3 |
| 2498 | `pauseArmed()` | 1 |
| 2499 | `_syncPauseArm()` | 7 |
| 2506 | `resume()` | 4 |
| 2510 | `applySettings()` | 6 |
| 2516 | `_applyQuality()` | 13 |
| 2529 | `onResize()` | 7 |
| 2536 | `_switchTeam()` | 47 |
| 2583 | `_applyVmVisibility()` | 6 |
| 2589 | `_vmlabEnsure()` | 14 |
| 2603 | `_vmlabFrame()` | 28 |
| 2631 | `_tuneGet()` | 15 |
| 2646 | `_tune()` | 23 |
| 2669 | `_fxSet()` | 1 |
| 2670 | `_switchWeapon()` | 32 |
| 2702 | `_deploySfx()` | 7 |
| 2709 | `_scope()` | 17 |
| 2726 | `_zoomFov()` | 8 |
| 2734 | `_reloading()` | 1 |
| 2735 | `_startReload()` | 19 |
| 2754 | `_reloadLayers()` | 18 |
| 2772 | `_installRecoil()` | 33 |
| 2805 | `_shotRecoil()` | 13 |
| 2818 | `_tryShoot()` | 86 |
| 2904 | `_meleeHit()` | 12 |
| 2916 | `_fireHitscan()` | 54 |
| 2970 | `_surfaceOf()` | 27 |
| 2997 | `_fleshImpact()` | 19 |
| 3016 | `_fxVoice()` | 9 |
| 3025 | `_impactSfx()` | 14 |
| 3039 | `_tintFx()` | 16 |
| 3055 | `_damage()` | 40 |
| 3095 | `_kill()` | 61 |
| 3156 | `_checkArenaWin()` | 30 |
| 3186 | `_dmgArc()` | 79 |
| 3265 | `_mkBanner()` | 9 |
| 3274 | `_hitmarker()` | 15 |
| 3289 | `_dmgNumber()` | 20 |
| 3309 | `_feed()` | 19 |
| 3328 | `_skullIcon()` | 6 |
| 3334 | `_killfeedWeaponIcon()` | 9 |
| 3343 | `_wpnIcon()` | 64 |
| 3407 | `_tracer()` | 25 |
| 3432 | `_puff()` | 39 |
| 3471 | `_holeDecalMat()` | 8 |
| 3479 | `_flash()` | 56 |
| 3535 | `_muzzleWorld()` | 9 |
| 3544 | `_updateDoors()` | 10 |
| 3554 | `_updateFx()` | 56 |
| 3610 | `_ejectCasing()` | 17 |
| 3627 | `_makeCtfFlagTex()` | 23 |
| 3650 | `_paintFlagSymbol()` | 9 |
| 3659 | `_flagTexFor()` | 26 |
| 3685 | `_legadoSimbolo()` | 8 |
| 3693 | `_loadCtfSymbols()` | 22 |
| 3715 | `_makeCtfZoneTex()` | 31 |
| 3746 | `_makeSmokeTex()` | 8 |
| 3754 | `_updateSmokeHud()` | 6 |
| 3760 | `_spawnGrenade()` | 11 |
| 3771 | `_throwSmoke()` | 8 |
| 3779 | `_throwFrag()` | 10 |
| 3789 | `_explodeFrag()` | 38 |
| 3827 | `_corDaFumaca()` | 15 |
| 3842 | `_popSmoke()` | 19 |
| 3861 | `_updateGrenades()` | 27 |
| 3888 | `_teamColor()` | 15 |
| 3903 | `_teamInk()` | 7 |
| 3910 | `_factionOf()` | 1 |
| 3911 | `_voiceKey()` | 3 |
| 3914 | `_teamName()` | 1 |
| 3915 | `_teamTag()` | 6 |
| 3921 | `_plaqueta()` | 13 |
| 3934 | `_mirror()` | 3 |
| 3937 | `_botSeparation()` | 56 |
| 3993 | `_initCTF()` | 84 |
| 4077 | `_updateCTF()` | 59 |
| 4136 | `_ctfWin()` | 22 |
| 4158 | `_freeYaw()` | 25 |
| 4183 | `_pullString()` | 23 |
| 4206 | `_walkReach()` | 18 |
| 4224 | `_wpComp()` | 16 |
| 4240 | `_findPathLocal()` | 22 |
| 4262 | `_botCtf()` | 133 |
| 4395 | `_hideCtfHud()` | 6 |
| 4401 | `_updateCtfHud()` | 76 |
| 4477 | `_collide()` | 23 |
| 4500 | `_collideRot()` | 52 |
| 4552 | `_mantleAlcance()` | 58 |
| 4610 | `_mantleAlcancavel()` | 23 |
| 4633 | `_mantleTarget()` | 35 |
| 4668 | `_freeSpot()` | 30 |
| 4698 | `_retaAndavel()` | 20 |
| 4718 | `_walkDepth()` | 16 |
| 4734 | `_noteHit()` | 17 |
| 4751 | `_deathFeedback()` | 43 |
| 4794 | `_updatePlayer()` | 373 |
| 5167 | `_updatePickups()` | 148 |
| 5315 | `_wpnMode()` | 5 |
| 5320 | `_botWeapon()` | 12 |
| 5332 | `_municaoInfinita()` | 1 |
| 5333 | `_pickupAllowed()` | 7 |
| 5340 | `_grabPickup()` | 35 |
| 5375 | `_assentarNoChao()` | 11 |
| 5386 | `_dropWeapon()` | 18 |
| 5404 | `_sumirDrop()` | 36 |
| 5440 | `_spawnY()` | 3 |
| 5443 | `_spawnYaw()` | 5 |
| 5448 | `_pickSpawn()` | 23 |
| 5471 | `_respawnPlayer()` | 30 |
| 5501 | `_losClear()` | 18 |
| 5519 | `_botCall()` | 37 |
| 5556 | `_teamMarkTex()` | 23 |
| 5579 | `_makeTeamMark()` | 14 |
| 5593 | `_updateTeamMark()` | 7 |
| 5600 | `_botEye()` | 1 |
| 5601 | `_enemyOf()` | 8 |
| 5609 | `_duelToken()` | 20 |
| 5629 | `_updateBot()` | 811 |
| 6440 | `_flushTraining()` | 13 |
| 6453 | `_updateBotNN()` | 71 |
| 6524 | `_botShootNN()` | 45 |
| 6569 | `_radarFoot()` | 38 |
| 6607 | `_updateRadar()` | 64 |
| 6671 | `_banner()` | 26 |
| 6697 | `_resultadoDaRodada()` | 4 |
| 6701 | `_showScoreboard()` | 49 |
| 6750 | `_updateWeaponHud()` | 35 |
| 6785 | `_updateHud()` | 80 |
| 6865 | `update()` | 74 |
| 6939 | `dispose()` | 38 |

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
