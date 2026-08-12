# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.83 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6857 | 244 |
| `public/js/main.js` | 2106 | 188 |
| `public/js/glbchars.js` | 1034 | 68 |
| `public/js/characters.js` | 1236 | 43 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 365 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3064 linhas (45% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 799 | 5557 | `_updateBot()` | ⚠️ candidato a extração |
| 546 | 621 | `constructor()` | 🔴 append-only |
| 362 | 4764 | `_updatePlayer()` | ⚠️ candidato a extração |
| 249 | 2050 | `_resetPositions()` |  |
| 241 | 1256 | `_buildViewModels()` |  |
| 146 | 5126 | `_updatePickups()` |  |
| 133 | 4234 | `_botCtf()` |  |
| 84 | 3965 | `_initCTF()` |  |
| 83 | 2827 | `_tryShoot()` |  |
| 77 | 3189 | `_dmgArc()` |  |
| 76 | 4373 | `_updateCtfHud()` |  |
| 71 | 6369 | `_updateBotNN()` |  |
| 67 | 6754 | `update()` | 🔴 append-only |
| 66 | 6522 | `_updateRadar()` |  |
| 64 | 3338 | `_wpnIcon()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `30–78` `382–382` `410–504` `531–552` `1256–1654` `2594–2599` `2681–2762` `2781–2974` `3402–3425` `3473–3535` `3602–3618` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `193–196` `247–247` `273–284` `594–605` `3060–3158` `3909–3964` `4130–4366` `4449–4471` `4764–5125` `5429–5446` `5528–6355` | — |
| **MAPAS / MUNDO** | `1202–1255` `2050–2298` `3965–4107` `5126–5271` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1655–1697` `2530–2542` `3426–3464` `3546–3601` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1167–1201` `2490–2508` `2524–2529` `2543–2549` `3189–3401` `6522–6587` `6618–6661` `6695–6753` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6754–6820 · `_dom()` 1167–1201 · `constructor()` 621–1166

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3761 de 6857 linhas (55%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 30 | `WEAPONS` | 49 |
| 81 | `VMLAB` | 8 |
| 89 | `VM_MAT_LEGACY` | 4 |
| 93 | `ROUND_TIME` | 8 |
| 101 | `ROUNDS_MAX` | 28 |
| 132 | `CTF_CLOCK_SHOW` | 4 |
| 136 | `KILLS_PER_PLAYER` | 7 |
| 143 | `PACE` | 33 |
| 176 | `PAUSE_ARM_MS` | 9 |
| 186 | `confirmGate` | 7 |
| 197 | `BOT_AIM_PITCH` | 4 |
| 201 | `BOT_DMG_PLAYER` | 21 |
| 222 | `BOT_FAIR` | 5 |
| 227 | `BOT_MOVE2` | 15 |
| 251 | `BOT_FOCUS_MIN` | 22 |
| 277 | `BOT_TOKEN_REST` | 7 |
| 285 | `MOVE_MUL` | 6 |
| 292 | `MOVE2` | 4 |
| 296 | `STEP_H` | 32 |
| 332 | `MANTLE_APOIO` | 4 |
| 336 | `MANTLE_GRID` | 5 |
| 341 | `RACK_OLD` | 4 |
| 345 | `RACK_RETA` | 25 |
| 371 | `RADIO` | 5 |
| 377 | `MK_LABELS` | 5 |
| 383 | `D2R` | 4 |
| 387 | `DMG_FALLOFF` | 5 |
| 392 | `HS_MUL` | 3 |
| 395 | `BALL_CLASS` | 15 |
| 410 | `STATIC_CLASS` | 75 |
| 486 | `VM_KNOB` | 19 |
| 507 | `vmFovForAspect` | 24 |
| 531 | `VM_OFF` | 22 |
| 553 | `vmOffY` | 35 |
| 588 | `VMP` | 6 |
| 594 | `BOT_SKILLS` | 11 |
| 606 | `diffKey` | 4 |
| 611 | `rollBotSkill` | 7 |
| 621 | `constructor()` | 546 |
| 1167 | `_dom()` | 35 |
| 1202 | `_buildEnv()` | 54 |
| 1256 | `_buildViewModels()` | 241 |
| 1497 | `_vmFrame` | 158 |
| 1655 | `_makePuffTexture()` | 11 |
| 1666 | `_makeFlashTex()` | 22 |
| 1688 | `_makeFlashCoreTex()` | 10 |
| 1698 | `_input()` | 2 |
| 1700 | `_kd` | 37 |
| 1737 | `_ku` | 4 |
| 1741 | `_md` | 34 |
| 1775 | `_mu` | 7 |
| 1782 | `_mm` | 14 |
| 1796 | `_cc` | 1 |
| 1797 | `_blur` | 1 |
| 1798 | `_plc` | 14 |
| 1812 | `_requestLock()` | 23 |
| 1835 | `_travaAtalhos()` | 4 |
| 1839 | `_soltaAtalhos()` | 3 |
| 1842 | `_acceptInput()` | 8 |
| 1850 | `_pauseBackdrop()` | 7 |
| 1857 | `_radioShow()` | 6 |
| 1863 | `_radioUi()` | 8 |
| 1871 | `_radioPick()` | 20 |
| 1891 | `_abilityNotice()` | 10 |
| 1901 | `_resetSliceAbilities()` | 9 |
| 1910 | `_stackTrace()` | 28 |
| 1938 | `_updateMotocaCharge()` | 10 |
| 1948 | `_recordRoutePoint()` | 11 |
| 1959 | `_routePing()` | 23 |
| 1982 | `_tickRoutePings()` | 12 |
| 1994 | `_objectiveInteractionMultiplier()` | 14 |
| 2008 | `start()` | 4 |
| 2012 | `_startRound()` | 38 |
| 2050 | `_resetPositions()` | 249 |
| 2299 | `_checkCtfAlvo()` | 13 |
| 2312 | `_checkPace()` | 13 |
| 2325 | `_endRound()` | 37 |
| 2362 | `_fimDaPartida()` | 14 |
| 2376 | `_endMatch()` | 50 |
| 2426 | `_ensureDolly()` | 41 |
| 2467 | `_tickDolly()` | 23 |
| 2490 | `setPaused()` | 19 |
| 2509 | `_now()` | 3 |
| 2512 | `pauseArmed()` | 1 |
| 2513 | `_syncPauseArm()` | 7 |
| 2520 | `resume()` | 4 |
| 2524 | `applySettings()` | 6 |
| 2530 | `_applyQuality()` | 13 |
| 2543 | `onResize()` | 7 |
| 2550 | `_switchTeam()` | 44 |
| 2594 | `_applyVmVisibility()` | 6 |
| 2600 | `_vmlabEnsure()` | 14 |
| 2614 | `_vmlabFrame()` | 28 |
| 2642 | `_tuneGet()` | 15 |
| 2657 | `_tune()` | 23 |
| 2680 | `_fxSet()` | 1 |
| 2681 | `_switchWeapon()` | 30 |
| 2711 | `_deploySfx()` | 7 |
| 2718 | `_scope()` | 17 |
| 2735 | `_zoomFov()` | 8 |
| 2743 | `_reloading()` | 1 |
| 2744 | `_startReload()` | 19 |
| 2763 | `_reloadLayers()` | 18 |
| 2781 | `_installRecoil()` | 33 |
| 2814 | `_shotRecoil()` | 13 |
| 2827 | `_tryShoot()` | 83 |
| 2910 | `_meleeHit()` | 12 |
| 2922 | `_fireHitscan()` | 53 |
| 2975 | `_surfaceOf()` | 27 |
| 3002 | `_fleshImpact()` | 19 |
| 3021 | `_fxVoice()` | 9 |
| 3030 | `_impactSfx()` | 14 |
| 3044 | `_tintFx()` | 16 |
| 3060 | `_damage()` | 40 |
| 3100 | `_kill()` | 59 |
| 3159 | `_checkArenaWin()` | 30 |
| 3189 | `_dmgArc()` | 77 |
| 3266 | `_mkBanner()` | 9 |
| 3275 | `_hitmarker()` | 15 |
| 3290 | `_dmgNumber()` | 20 |
| 3310 | `_feed()` | 19 |
| 3329 | `_skullIcon()` | 9 |
| 3338 | `_wpnIcon()` | 64 |
| 3402 | `_tracer()` | 24 |
| 3426 | `_puff()` | 39 |
| 3465 | `_holeDecalMat()` | 8 |
| 3473 | `_flash()` | 54 |
| 3527 | `_muzzleWorld()` | 9 |
| 3536 | `_updateDoors()` | 10 |
| 3546 | `_updateFx()` | 56 |
| 3602 | `_ejectCasing()` | 17 |
| 3619 | `_makeCtfFlagTex()` | 23 |
| 3642 | `_paintFlagSymbol()` | 9 |
| 3651 | `_flagTexFor()` | 26 |
| 3677 | `_legadoSimbolo()` | 8 |
| 3685 | `_loadCtfSymbols()` | 22 |
| 3707 | `_makeCtfZoneTex()` | 31 |
| 3738 | `_makeSmokeTex()` | 8 |
| 3746 | `_updateSmokeHud()` | 6 |
| 3752 | `_spawnGrenade()` | 11 |
| 3763 | `_throwSmoke()` | 8 |
| 3771 | `_throwFrag()` | 10 |
| 3781 | `_explodeFrag()` | 38 |
| 3819 | `_corDaFumaca()` | 15 |
| 3834 | `_popSmoke()` | 19 |
| 3853 | `_updateGrenades()` | 27 |
| 3880 | `_teamColor()` | 15 |
| 3895 | `_teamInk()` | 7 |
| 3902 | `_factionOf()` | 1 |
| 3903 | `_voiceKey()` | 1 |
| 3904 | `_teamName()` | 1 |
| 3905 | `_teamTag()` | 1 |
| 3906 | `_mirror()` | 3 |
| 3909 | `_botSeparation()` | 56 |
| 3965 | `_initCTF()` | 84 |
| 4049 | `_updateCTF()` | 59 |
| 4108 | `_ctfWin()` | 22 |
| 4130 | `_freeYaw()` | 25 |
| 4155 | `_pullString()` | 23 |
| 4178 | `_walkReach()` | 18 |
| 4196 | `_wpComp()` | 16 |
| 4212 | `_findPathLocal()` | 22 |
| 4234 | `_botCtf()` | 133 |
| 4367 | `_hideCtfHud()` | 6 |
| 4373 | `_updateCtfHud()` | 76 |
| 4449 | `_collide()` | 23 |
| 4472 | `_collideRot()` | 52 |
| 4524 | `_mantleAlcance()` | 58 |
| 4582 | `_mantleAlcancavel()` | 23 |
| 4605 | `_mantleTarget()` | 35 |
| 4640 | `_freeSpot()` | 30 |
| 4670 | `_retaAndavel()` | 20 |
| 4690 | `_walkDepth()` | 16 |
| 4706 | `_noteHit()` | 15 |
| 4721 | `_deathFeedback()` | 43 |
| 4764 | `_updatePlayer()` | 362 |
| 5126 | `_updatePickups()` | 146 |
| 5272 | `_wpnMode()` | 3 |
| 5275 | `_botWeapon()` | 10 |
| 5285 | `_pickupAllowed()` | 7 |
| 5292 | `_grabPickup()` | 34 |
| 5326 | `_assentarNoChao()` | 11 |
| 5337 | `_dropWeapon()` | 38 |
| 5375 | `_spawnY()` | 3 |
| 5378 | `_spawnYaw()` | 5 |
| 5383 | `_pickSpawn()` | 23 |
| 5406 | `_respawnPlayer()` | 23 |
| 5429 | `_losClear()` | 18 |
| 5447 | `_botCall()` | 37 |
| 5484 | `_teamMarkTex()` | 23 |
| 5507 | `_makeTeamMark()` | 14 |
| 5521 | `_updateTeamMark()` | 7 |
| 5528 | `_botEye()` | 1 |
| 5529 | `_enemyOf()` | 8 |
| 5537 | `_duelToken()` | 20 |
| 5557 | `_updateBot()` | 799 |
| 6356 | `_flushTraining()` | 13 |
| 6369 | `_updateBotNN()` | 71 |
| 6440 | `_botShootNN()` | 44 |
| 6484 | `_radarFoot()` | 38 |
| 6522 | `_updateRadar()` | 66 |
| 6588 | `_banner()` | 26 |
| 6614 | `_resultadoDaRodada()` | 4 |
| 6618 | `_showScoreboard()` | 44 |
| 6662 | `_updateWeaponHud()` | 33 |
| 6695 | `_updateHud()` | 59 |
| 6754 | `update()` | 67 |
| 6821 | `dispose()` | 36 |

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
