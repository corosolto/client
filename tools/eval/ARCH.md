# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.159 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6880 | 251 |
| `public/js/main.js` | 2702 | 248 |
| `public/js/glbchars.js` | 961 | 68 |
| `public/js/characters.js` | 1169 | 41 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3099 linhas (45% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 811 | 5532 | `_updateBot()` | ⚠️ candidato a extração |
| 558 | 560 | `constructor()` | 🔴 append-only |
| 346 | 4724 | `_updatePlayer()` | ⚠️ candidato a extração |
| 249 | 2015 | `_resetPositions()` |  |
| 241 | 1215 | `_buildViewModels()` |  |
| 148 | 5070 | `_updatePickups()` |  |
| 133 | 4241 | `_botCtf()` |  |
| 85 | 2799 | `_tryShoot()` |  |
| 84 | 3972 | `_initCTF()` |  |
| 80 | 6688 | `_updateHud()` |  |
| 79 | 3165 | `_dmgArc()` |  |
| 76 | 4380 | `_updateCtfHud()` |  |
| 74 | 6768 | `update()` | 🔴 append-only |
| 71 | 6356 | `_updateBotNN()` |  |
| 64 | 3322 | `_wpnIcon()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `315–318` `349–443` `470–491` `1215–1613` `2564–2569` `2651–2734` `2753–2949` `3386–3410` `3458–3522` `3589–3605` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `155–158` `209–209` `235–246` `533–544` `3035–3134` `3916–3971` `4137–4373` `4456–4478` `4724–5069` `5404–5421` `5503–6342` | — |
| **MAPAS / MUNDO** | `1161–1214` `2015–2263` `3972–4114` `5070–5217` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1614–1656` `2497–2509` `3411–3449` `3533–3588` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1118–1160` `2456–2475` `2491–2496` `2510–2516` `3165–3306` `3322–3385` `6510–6573` `6604–6652` `6688–6767` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6768–6841 · `_dom()` 1118–1160 · `constructor()` 560–1117

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3757 de 6880 linhas (55%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 258 | `STEP_H` | 3 |
| 265 | `MANTLE_APOIO` | 4 |
| 269 | `MANTLE_GRID` | 5 |
| 274 | `RACK_OLD` | 4 |
| 278 | `RACK_RETA` | 25 |
| 304 | `RADIO` | 5 |
| 310 | `MK_LABELS` | 5 |
| 315 | `GUNFEEL` | 4 |
| 322 | `D2R` | 4 |
| 326 | `DMG_FALLOFF` | 5 |
| 331 | `HS_MUL` | 3 |
| 334 | `BALL_CLASS` | 15 |
| 349 | `STATIC_CLASS` | 75 |
| 425 | `VM_KNOB` | 19 |
| 446 | `vmFovForAspect` | 24 |
| 470 | `VM_OFF` | 22 |
| 492 | `vmOffY` | 35 |
| 527 | `VMP` | 6 |
| 533 | `BOT_SKILLS` | 11 |
| 545 | `diffKey` | 4 |
| 550 | `rollBotSkill` | 7 |
| 560 | `constructor()` | 558 |
| 1118 | `_dom()` | 43 |
| 1161 | `_buildEnv()` | 54 |
| 1215 | `_buildViewModels()` | 241 |
| 1456 | `_vmFrame` | 158 |
| 1614 | `_makePuffTexture()` | 11 |
| 1625 | `_makeFlashTex()` | 22 |
| 1647 | `_makeFlashCoreTex()` | 10 |
| 1657 | `_input()` | 2 |
| 1659 | `_kd` | 42 |
| 1701 | `_ku` | 4 |
| 1705 | `_md` | 34 |
| 1739 | `_mu` | 7 |
| 1746 | `_mm` | 15 |
| 1761 | `_cc` | 1 |
| 1762 | `_blur` | 1 |
| 1763 | `_plc` | 14 |
| 1777 | `_requestLock()` | 23 |
| 1800 | `_travaAtalhos()` | 4 |
| 1804 | `_soltaAtalhos()` | 3 |
| 1807 | `_acceptInput()` | 8 |
| 1815 | `_pauseBackdrop()` | 7 |
| 1822 | `_radioShow()` | 6 |
| 1828 | `_radioUi()` | 8 |
| 1836 | `_radioPick()` | 20 |
| 1856 | `_abilityNotice()` | 10 |
| 1866 | `_resetSliceAbilities()` | 9 |
| 1875 | `_stackTrace()` | 28 |
| 1903 | `_updateMotocaCharge()` | 10 |
| 1913 | `_recordRoutePoint()` | 11 |
| 1924 | `_routePing()` | 23 |
| 1947 | `_tickRoutePings()` | 12 |
| 1959 | `_objectiveInteractionMultiplier()` | 14 |
| 1973 | `start()` | 4 |
| 1977 | `_startRound()` | 38 |
| 2015 | `_resetPositions()` | 249 |
| 2264 | `_checkCtfAlvo()` | 13 |
| 2277 | `_checkPace()` | 13 |
| 2290 | `_endRound()` | 37 |
| 2327 | `_fimDaPartida()` | 7 |
| 2334 | `_endMatch()` | 58 |
| 2392 | `_ensureDolly()` | 41 |
| 2433 | `_tickDolly()` | 23 |
| 2456 | `setPaused()` | 20 |
| 2476 | `_now()` | 3 |
| 2479 | `pauseArmed()` | 1 |
| 2480 | `_syncPauseArm()` | 7 |
| 2487 | `resume()` | 4 |
| 2491 | `applySettings()` | 6 |
| 2497 | `_applyQuality()` | 13 |
| 2510 | `onResize()` | 7 |
| 2517 | `_switchTeam()` | 47 |
| 2564 | `_applyVmVisibility()` | 6 |
| 2570 | `_vmlabEnsure()` | 14 |
| 2584 | `_vmlabFrame()` | 28 |
| 2612 | `_tuneGet()` | 15 |
| 2627 | `_tune()` | 23 |
| 2650 | `_fxSet()` | 1 |
| 2651 | `_switchWeapon()` | 32 |
| 2683 | `_deploySfx()` | 7 |
| 2690 | `_scope()` | 17 |
| 2707 | `_zoomFov()` | 8 |
| 2715 | `_reloading()` | 1 |
| 2716 | `_startReload()` | 19 |
| 2735 | `_reloadLayers()` | 18 |
| 2753 | `_installRecoil()` | 33 |
| 2786 | `_shotRecoil()` | 13 |
| 2799 | `_tryShoot()` | 85 |
| 2884 | `_meleeHit()` | 12 |
| 2896 | `_fireHitscan()` | 54 |
| 2950 | `_surfaceOf()` | 27 |
| 2977 | `_fleshImpact()` | 19 |
| 2996 | `_fxVoice()` | 9 |
| 3005 | `_impactSfx()` | 14 |
| 3019 | `_tintFx()` | 16 |
| 3035 | `_damage()` | 40 |
| 3075 | `_kill()` | 60 |
| 3135 | `_checkArenaWin()` | 30 |
| 3165 | `_dmgArc()` | 79 |
| 3244 | `_mkBanner()` | 9 |
| 3253 | `_hitmarker()` | 15 |
| 3268 | `_dmgNumber()` | 20 |
| 3288 | `_feed()` | 19 |
| 3307 | `_skullIcon()` | 6 |
| 3313 | `_killfeedWeaponIcon()` | 9 |
| 3322 | `_wpnIcon()` | 64 |
| 3386 | `_tracer()` | 25 |
| 3411 | `_puff()` | 39 |
| 3450 | `_holeDecalMat()` | 8 |
| 3458 | `_flash()` | 56 |
| 3514 | `_muzzleWorld()` | 9 |
| 3523 | `_updateDoors()` | 10 |
| 3533 | `_updateFx()` | 56 |
| 3589 | `_ejectCasing()` | 17 |
| 3606 | `_makeCtfFlagTex()` | 23 |
| 3629 | `_paintFlagSymbol()` | 9 |
| 3638 | `_flagTexFor()` | 26 |
| 3664 | `_legadoSimbolo()` | 8 |
| 3672 | `_loadCtfSymbols()` | 22 |
| 3694 | `_makeCtfZoneTex()` | 31 |
| 3725 | `_makeSmokeTex()` | 8 |
| 3733 | `_updateSmokeHud()` | 6 |
| 3739 | `_spawnGrenade()` | 11 |
| 3750 | `_throwSmoke()` | 8 |
| 3758 | `_throwFrag()` | 10 |
| 3768 | `_explodeFrag()` | 38 |
| 3806 | `_corDaFumaca()` | 15 |
| 3821 | `_popSmoke()` | 19 |
| 3840 | `_updateGrenades()` | 27 |
| 3867 | `_teamColor()` | 15 |
| 3882 | `_teamInk()` | 7 |
| 3889 | `_factionOf()` | 1 |
| 3890 | `_voiceKey()` | 3 |
| 3893 | `_teamName()` | 1 |
| 3894 | `_teamTag()` | 6 |
| 3900 | `_plaqueta()` | 13 |
| 3913 | `_mirror()` | 3 |
| 3916 | `_botSeparation()` | 56 |
| 3972 | `_initCTF()` | 84 |
| 4056 | `_updateCTF()` | 59 |
| 4115 | `_ctfWin()` | 22 |
| 4137 | `_freeYaw()` | 25 |
| 4162 | `_pullString()` | 23 |
| 4185 | `_walkReach()` | 18 |
| 4203 | `_wpComp()` | 16 |
| 4219 | `_findPathLocal()` | 22 |
| 4241 | `_botCtf()` | 133 |
| 4374 | `_hideCtfHud()` | 6 |
| 4380 | `_updateCtfHud()` | 76 |
| 4456 | `_collide()` | 23 |
| 4479 | `_collideRot()` | 22 |
| 4501 | `_mantleAlcance()` | 50 |
| 4551 | `_mantleAlcancavel()` | 12 |
| 4563 | `_mantleTarget()` | 35 |
| 4598 | `_freeSpot()` | 30 |
| 4628 | `_retaAndavel()` | 20 |
| 4648 | `_walkDepth()` | 16 |
| 4664 | `_noteHit()` | 17 |
| 4681 | `_deathFeedback()` | 43 |
| 4724 | `_updatePlayer()` | 346 |
| 5070 | `_updatePickups()` | 148 |
| 5218 | `_wpnMode()` | 5 |
| 5223 | `_botWeapon()` | 12 |
| 5235 | `_municaoInfinita()` | 1 |
| 5236 | `_pickupAllowed()` | 7 |
| 5243 | `_grabPickup()` | 35 |
| 5278 | `_assentarNoChao()` | 11 |
| 5289 | `_dropWeapon()` | 18 |
| 5307 | `_sumirDrop()` | 36 |
| 5343 | `_spawnY()` | 3 |
| 5346 | `_spawnYaw()` | 5 |
| 5351 | `_pickSpawn()` | 23 |
| 5374 | `_respawnPlayer()` | 30 |
| 5404 | `_losClear()` | 18 |
| 5422 | `_botCall()` | 37 |
| 5459 | `_teamMarkTex()` | 23 |
| 5482 | `_makeTeamMark()` | 14 |
| 5496 | `_updateTeamMark()` | 7 |
| 5503 | `_botEye()` | 1 |
| 5504 | `_enemyOf()` | 8 |
| 5512 | `_duelToken()` | 20 |
| 5532 | `_updateBot()` | 811 |
| 6343 | `_flushTraining()` | 13 |
| 6356 | `_updateBotNN()` | 71 |
| 6427 | `_botShootNN()` | 45 |
| 6472 | `_radarFoot()` | 38 |
| 6510 | `_updateRadar()` | 64 |
| 6574 | `_banner()` | 26 |
| 6600 | `_resultadoDaRodada()` | 4 |
| 6604 | `_showScoreboard()` | 49 |
| 6653 | `_updateWeaponHud()` | 35 |
| 6688 | `_updateHud()` | 80 |
| 6768 | `update()` | 74 |
| 6842 | `dispose()` | 38 |

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
