# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.147 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6972 | 251 |
| `public/js/main.js` | 2702 | 248 |
| `public/js/glbchars.js` | 1034 | 68 |
| `public/js/characters.js` | 1230 | 41 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 365 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3118 linhas (45% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 811 | 5627 | `_updateBot()` | ⚠️ candidato a extração |
| 551 | 588 | `constructor()` | 🔴 append-only |
| 373 | 4792 | `_updatePlayer()` | ⚠️ candidato a extração |
| 249 | 2033 | `_resetPositions()` |  |
| 241 | 1236 | `_buildViewModels()` |  |
| 148 | 5165 | `_updatePickups()` |  |
| 133 | 4260 | `_botCtf()` |  |
| 86 | 2816 | `_tryShoot()` |  |
| 84 | 3991 | `_initCTF()` |  |
| 80 | 6783 | `_updateHud()` |  |
| 79 | 3184 | `_dmgArc()` |  |
| 76 | 4399 | `_updateCtfHud()` |  |
| 72 | 6863 | `update()` | 🔴 append-only |
| 71 | 6451 | `_updateBotNN()` |  |
| 64 | 3341 | `_wpnIcon()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `343–346` `377–471` `498–519` `1236–1634` `2581–2586` `2668–2751` `2770–2967` `3405–3429` `3477–3541` `3608–3624` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `154–157` `208–208` `234–245` `561–572` `3053–3153` `3935–3990` `4156–4392` `4475–4497` `4792–5164` `5499–5516` `5598–6437` | — |
| **MAPAS / MUNDO** | `1182–1235` `2033–2281` `3991–4133` `5165–5312` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1635–1677` `2514–2526` `3430–3468` `3552–3607` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1139–1181` `2474–2492` `2508–2513` `2527–2533` `3184–3325` `3341–3404` `6605–6668` `6699–6747` `6783–6862` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6863–6934 · `_dom()` 1139–1181 · `constructor()` 588–1138

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3785 de 6972 linhas (54%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 41 | `VMLAB` | 8 |
| 49 | `VM_MAT_LEGACY` | 4 |
| 55 | `DROP_TTL` | 8 |
| 63 | `ROUNDS_MAX` | 27 |
| 93 | `CTF_CLOCK_SHOW` | 4 |
| 97 | `KILLS_PER_PLAYER` | 7 |
| 104 | `PACE` | 33 |
| 137 | `PAUSE_ARM_MS` | 9 |
| 147 | `confirmGate` | 7 |
| 158 | `BOT_AIM_PITCH` | 4 |
| 162 | `BOT_DMG_PLAYER` | 21 |
| 183 | `BOT_FAIR` | 5 |
| 188 | `BOT_MOVE2` | 15 |
| 212 | `BOT_FOCUS_MIN` | 22 |
| 238 | `BOT_TOKEN_REST` | 7 |
| 246 | `MOVE_MUL` | 6 |
| 253 | `MOVE2` | 4 |
| 257 | `STEP_H` | 32 |
| 293 | `MANTLE_APOIO` | 4 |
| 297 | `MANTLE_GRID` | 5 |
| 302 | `RACK_OLD` | 4 |
| 306 | `RACK_RETA` | 25 |
| 332 | `RADIO` | 5 |
| 338 | `MK_LABELS` | 5 |
| 343 | `GUNFEEL` | 4 |
| 350 | `D2R` | 4 |
| 354 | `DMG_FALLOFF` | 5 |
| 359 | `HS_MUL` | 3 |
| 362 | `BALL_CLASS` | 15 |
| 377 | `STATIC_CLASS` | 75 |
| 453 | `VM_KNOB` | 19 |
| 474 | `vmFovForAspect` | 24 |
| 498 | `VM_OFF` | 22 |
| 520 | `vmOffY` | 35 |
| 555 | `VMP` | 6 |
| 561 | `BOT_SKILLS` | 11 |
| 573 | `diffKey` | 4 |
| 578 | `rollBotSkill` | 7 |
| 588 | `constructor()` | 551 |
| 1139 | `_dom()` | 43 |
| 1182 | `_buildEnv()` | 54 |
| 1236 | `_buildViewModels()` | 241 |
| 1477 | `_vmFrame` | 158 |
| 1635 | `_makePuffTexture()` | 11 |
| 1646 | `_makeFlashTex()` | 22 |
| 1668 | `_makeFlashCoreTex()` | 10 |
| 1678 | `_input()` | 2 |
| 1680 | `_kd` | 39 |
| 1719 | `_ku` | 4 |
| 1723 | `_md` | 34 |
| 1757 | `_mu` | 7 |
| 1764 | `_mm` | 15 |
| 1779 | `_cc` | 1 |
| 1780 | `_blur` | 1 |
| 1781 | `_plc` | 14 |
| 1795 | `_requestLock()` | 23 |
| 1818 | `_travaAtalhos()` | 4 |
| 1822 | `_soltaAtalhos()` | 3 |
| 1825 | `_acceptInput()` | 8 |
| 1833 | `_pauseBackdrop()` | 7 |
| 1840 | `_radioShow()` | 6 |
| 1846 | `_radioUi()` | 8 |
| 1854 | `_radioPick()` | 20 |
| 1874 | `_abilityNotice()` | 10 |
| 1884 | `_resetSliceAbilities()` | 9 |
| 1893 | `_stackTrace()` | 28 |
| 1921 | `_updateMotocaCharge()` | 10 |
| 1931 | `_recordRoutePoint()` | 11 |
| 1942 | `_routePing()` | 23 |
| 1965 | `_tickRoutePings()` | 12 |
| 1977 | `_objectiveInteractionMultiplier()` | 14 |
| 1991 | `start()` | 4 |
| 1995 | `_startRound()` | 38 |
| 2033 | `_resetPositions()` | 249 |
| 2282 | `_checkCtfAlvo()` | 13 |
| 2295 | `_checkPace()` | 13 |
| 2308 | `_endRound()` | 37 |
| 2345 | `_fimDaPartida()` | 7 |
| 2352 | `_endMatch()` | 58 |
| 2410 | `_ensureDolly()` | 41 |
| 2451 | `_tickDolly()` | 23 |
| 2474 | `setPaused()` | 19 |
| 2493 | `_now()` | 3 |
| 2496 | `pauseArmed()` | 1 |
| 2497 | `_syncPauseArm()` | 7 |
| 2504 | `resume()` | 4 |
| 2508 | `applySettings()` | 6 |
| 2514 | `_applyQuality()` | 13 |
| 2527 | `onResize()` | 7 |
| 2534 | `_switchTeam()` | 47 |
| 2581 | `_applyVmVisibility()` | 6 |
| 2587 | `_vmlabEnsure()` | 14 |
| 2601 | `_vmlabFrame()` | 28 |
| 2629 | `_tuneGet()` | 15 |
| 2644 | `_tune()` | 23 |
| 2667 | `_fxSet()` | 1 |
| 2668 | `_switchWeapon()` | 32 |
| 2700 | `_deploySfx()` | 7 |
| 2707 | `_scope()` | 17 |
| 2724 | `_zoomFov()` | 8 |
| 2732 | `_reloading()` | 1 |
| 2733 | `_startReload()` | 19 |
| 2752 | `_reloadLayers()` | 18 |
| 2770 | `_installRecoil()` | 33 |
| 2803 | `_shotRecoil()` | 13 |
| 2816 | `_tryShoot()` | 86 |
| 2902 | `_meleeHit()` | 12 |
| 2914 | `_fireHitscan()` | 54 |
| 2968 | `_surfaceOf()` | 27 |
| 2995 | `_fleshImpact()` | 19 |
| 3014 | `_fxVoice()` | 9 |
| 3023 | `_impactSfx()` | 14 |
| 3037 | `_tintFx()` | 16 |
| 3053 | `_damage()` | 40 |
| 3093 | `_kill()` | 61 |
| 3154 | `_checkArenaWin()` | 30 |
| 3184 | `_dmgArc()` | 79 |
| 3263 | `_mkBanner()` | 9 |
| 3272 | `_hitmarker()` | 15 |
| 3287 | `_dmgNumber()` | 20 |
| 3307 | `_feed()` | 19 |
| 3326 | `_skullIcon()` | 6 |
| 3332 | `_killfeedWeaponIcon()` | 9 |
| 3341 | `_wpnIcon()` | 64 |
| 3405 | `_tracer()` | 25 |
| 3430 | `_puff()` | 39 |
| 3469 | `_holeDecalMat()` | 8 |
| 3477 | `_flash()` | 56 |
| 3533 | `_muzzleWorld()` | 9 |
| 3542 | `_updateDoors()` | 10 |
| 3552 | `_updateFx()` | 56 |
| 3608 | `_ejectCasing()` | 17 |
| 3625 | `_makeCtfFlagTex()` | 23 |
| 3648 | `_paintFlagSymbol()` | 9 |
| 3657 | `_flagTexFor()` | 26 |
| 3683 | `_legadoSimbolo()` | 8 |
| 3691 | `_loadCtfSymbols()` | 22 |
| 3713 | `_makeCtfZoneTex()` | 31 |
| 3744 | `_makeSmokeTex()` | 8 |
| 3752 | `_updateSmokeHud()` | 6 |
| 3758 | `_spawnGrenade()` | 11 |
| 3769 | `_throwSmoke()` | 8 |
| 3777 | `_throwFrag()` | 10 |
| 3787 | `_explodeFrag()` | 38 |
| 3825 | `_corDaFumaca()` | 15 |
| 3840 | `_popSmoke()` | 19 |
| 3859 | `_updateGrenades()` | 27 |
| 3886 | `_teamColor()` | 15 |
| 3901 | `_teamInk()` | 7 |
| 3908 | `_factionOf()` | 1 |
| 3909 | `_voiceKey()` | 3 |
| 3912 | `_teamName()` | 1 |
| 3913 | `_teamTag()` | 6 |
| 3919 | `_plaqueta()` | 13 |
| 3932 | `_mirror()` | 3 |
| 3935 | `_botSeparation()` | 56 |
| 3991 | `_initCTF()` | 84 |
| 4075 | `_updateCTF()` | 59 |
| 4134 | `_ctfWin()` | 22 |
| 4156 | `_freeYaw()` | 25 |
| 4181 | `_pullString()` | 23 |
| 4204 | `_walkReach()` | 18 |
| 4222 | `_wpComp()` | 16 |
| 4238 | `_findPathLocal()` | 22 |
| 4260 | `_botCtf()` | 133 |
| 4393 | `_hideCtfHud()` | 6 |
| 4399 | `_updateCtfHud()` | 76 |
| 4475 | `_collide()` | 23 |
| 4498 | `_collideRot()` | 52 |
| 4550 | `_mantleAlcance()` | 58 |
| 4608 | `_mantleAlcancavel()` | 23 |
| 4631 | `_mantleTarget()` | 35 |
| 4666 | `_freeSpot()` | 30 |
| 4696 | `_retaAndavel()` | 20 |
| 4716 | `_walkDepth()` | 16 |
| 4732 | `_noteHit()` | 17 |
| 4749 | `_deathFeedback()` | 43 |
| 4792 | `_updatePlayer()` | 373 |
| 5165 | `_updatePickups()` | 148 |
| 5313 | `_wpnMode()` | 5 |
| 5318 | `_botWeapon()` | 12 |
| 5330 | `_municaoInfinita()` | 1 |
| 5331 | `_pickupAllowed()` | 7 |
| 5338 | `_grabPickup()` | 35 |
| 5373 | `_assentarNoChao()` | 11 |
| 5384 | `_dropWeapon()` | 18 |
| 5402 | `_sumirDrop()` | 36 |
| 5438 | `_spawnY()` | 3 |
| 5441 | `_spawnYaw()` | 5 |
| 5446 | `_pickSpawn()` | 23 |
| 5469 | `_respawnPlayer()` | 30 |
| 5499 | `_losClear()` | 18 |
| 5517 | `_botCall()` | 37 |
| 5554 | `_teamMarkTex()` | 23 |
| 5577 | `_makeTeamMark()` | 14 |
| 5591 | `_updateTeamMark()` | 7 |
| 5598 | `_botEye()` | 1 |
| 5599 | `_enemyOf()` | 8 |
| 5607 | `_duelToken()` | 20 |
| 5627 | `_updateBot()` | 811 |
| 6438 | `_flushTraining()` | 13 |
| 6451 | `_updateBotNN()` | 71 |
| 6522 | `_botShootNN()` | 45 |
| 6567 | `_radarFoot()` | 38 |
| 6605 | `_updateRadar()` | 64 |
| 6669 | `_banner()` | 26 |
| 6695 | `_resultadoDaRodada()` | 4 |
| 6699 | `_showScoreboard()` | 49 |
| 6748 | `_updateWeaponHud()` | 35 |
| 6783 | `_updateHud()` | 80 |
| 6863 | `update()` | 72 |
| 6935 | `dispose()` | 37 |

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
