# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.159 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6899 | 253 |
| `public/js/main.js` | 2730 | 248 |
| `public/js/glbchars.js` | 961 | 68 |
| `public/js/characters.js` | 1169 | 41 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3072 linhas (45% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 811 | 5551 | `_updateBot()` | ⚠️ candidato a extração |
| 530 | 596 | `constructor()` | 🔴 append-only |
| 346 | 4743 | `_updatePlayer()` | ⚠️ candidato a extração |
| 249 | 2023 | `_resetPositions()` |  |
| 241 | 1223 | `_buildViewModels()` |  |
| 148 | 5089 | `_updatePickups()` |  |
| 133 | 4260 | `_botCtf()` |  |
| 86 | 2817 | `_tryShoot()` |  |
| 84 | 3991 | `_initCTF()` |  |
| 80 | 6707 | `_updateHud()` |  |
| 79 | 3184 | `_dmgArc()` |  |
| 76 | 4399 | `_updateCtfHud()` |  |
| 74 | 6787 | `update()` | 🔴 append-only |
| 71 | 6375 | `_updateBotNN()` |  |
| 64 | 3341 | `_wpnIcon()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `315–318` `349–443` `470–491` `1223–1621` `2576–2581` `2663–2746` `2771–2968` `3405–3429` `3477–3541` `3608–3624` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `155–158` `209–209` `235–246` `533–544` `3054–3153` `3935–3990` `4156–4392` `4475–4497` `4743–5088` `5423–5440` `5522–6361` | — |
| **MAPAS / MUNDO** | `1169–1222` `2023–2271` `3991–4133` `5089–5236` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1622–1664` `2505–2517` `3430–3468` `3552–3607` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1126–1168` `2464–2483` `2499–2504` `2518–2524` `3184–3325` `3341–3404` `6529–6592` `6623–6671` `6707–6786` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6787–6860 · `_dom()` 1126–1168 · `constructor()` 596–1125

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3758 de 6899 linhas (54%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 557 | `botTier` | 4 |
| 561 | `pickMatchRoster` | 30 |
| 591 | `matchRosterIds` | 4 |
| 596 | `constructor()` | 530 |
| 1126 | `_dom()` | 43 |
| 1169 | `_buildEnv()` | 54 |
| 1223 | `_buildViewModels()` | 241 |
| 1464 | `_vmFrame` | 158 |
| 1622 | `_makePuffTexture()` | 11 |
| 1633 | `_makeFlashTex()` | 22 |
| 1655 | `_makeFlashCoreTex()` | 10 |
| 1665 | `_input()` | 2 |
| 1667 | `_kd` | 42 |
| 1709 | `_ku` | 4 |
| 1713 | `_md` | 34 |
| 1747 | `_mu` | 7 |
| 1754 | `_mm` | 15 |
| 1769 | `_cc` | 1 |
| 1770 | `_blur` | 1 |
| 1771 | `_plc` | 14 |
| 1785 | `_requestLock()` | 23 |
| 1808 | `_travaAtalhos()` | 4 |
| 1812 | `_soltaAtalhos()` | 3 |
| 1815 | `_acceptInput()` | 8 |
| 1823 | `_pauseBackdrop()` | 7 |
| 1830 | `_radioShow()` | 6 |
| 1836 | `_radioUi()` | 8 |
| 1844 | `_radioPick()` | 20 |
| 1864 | `_abilityNotice()` | 10 |
| 1874 | `_resetSliceAbilities()` | 9 |
| 1883 | `_stackTrace()` | 28 |
| 1911 | `_updateMotocaCharge()` | 10 |
| 1921 | `_recordRoutePoint()` | 11 |
| 1932 | `_routePing()` | 23 |
| 1955 | `_tickRoutePings()` | 12 |
| 1967 | `_objectiveInteractionMultiplier()` | 14 |
| 1981 | `start()` | 4 |
| 1985 | `_startRound()` | 38 |
| 2023 | `_resetPositions()` | 249 |
| 2272 | `_checkCtfAlvo()` | 13 |
| 2285 | `_checkPace()` | 13 |
| 2298 | `_endRound()` | 37 |
| 2335 | `_fimDaPartida()` | 7 |
| 2342 | `_endMatch()` | 58 |
| 2400 | `_ensureDolly()` | 41 |
| 2441 | `_tickDolly()` | 23 |
| 2464 | `setPaused()` | 20 |
| 2484 | `_now()` | 3 |
| 2487 | `pauseArmed()` | 1 |
| 2488 | `_syncPauseArm()` | 7 |
| 2495 | `resume()` | 4 |
| 2499 | `applySettings()` | 6 |
| 2505 | `_applyQuality()` | 13 |
| 2518 | `onResize()` | 7 |
| 2525 | `_switchTeam()` | 51 |
| 2576 | `_applyVmVisibility()` | 6 |
| 2582 | `_vmlabEnsure()` | 14 |
| 2596 | `_vmlabFrame()` | 28 |
| 2624 | `_tuneGet()` | 15 |
| 2639 | `_tune()` | 23 |
| 2662 | `_fxSet()` | 1 |
| 2663 | `_switchWeapon()` | 32 |
| 2695 | `_deploySfx()` | 7 |
| 2702 | `_scope()` | 17 |
| 2719 | `_zoomFov()` | 8 |
| 2727 | `_reloading()` | 1 |
| 2728 | `_startReload()` | 19 |
| 2747 | `_reloadLayers()` | 24 |
| 2771 | `_installRecoil()` | 33 |
| 2804 | `_shotRecoil()` | 13 |
| 2817 | `_tryShoot()` | 86 |
| 2903 | `_meleeHit()` | 12 |
| 2915 | `_fireHitscan()` | 54 |
| 2969 | `_surfaceOf()` | 27 |
| 2996 | `_fleshImpact()` | 19 |
| 3015 | `_fxVoice()` | 9 |
| 3024 | `_impactSfx()` | 14 |
| 3038 | `_tintFx()` | 16 |
| 3054 | `_damage()` | 40 |
| 3094 | `_kill()` | 60 |
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
| 4498 | `_collideRot()` | 22 |
| 4520 | `_mantleAlcance()` | 50 |
| 4570 | `_mantleAlcancavel()` | 12 |
| 4582 | `_mantleTarget()` | 35 |
| 4617 | `_freeSpot()` | 30 |
| 4647 | `_retaAndavel()` | 20 |
| 4667 | `_walkDepth()` | 16 |
| 4683 | `_noteHit()` | 17 |
| 4700 | `_deathFeedback()` | 43 |
| 4743 | `_updatePlayer()` | 346 |
| 5089 | `_updatePickups()` | 148 |
| 5237 | `_wpnMode()` | 5 |
| 5242 | `_botWeapon()` | 12 |
| 5254 | `_municaoInfinita()` | 1 |
| 5255 | `_pickupAllowed()` | 7 |
| 5262 | `_grabPickup()` | 35 |
| 5297 | `_assentarNoChao()` | 11 |
| 5308 | `_dropWeapon()` | 18 |
| 5326 | `_sumirDrop()` | 36 |
| 5362 | `_spawnY()` | 3 |
| 5365 | `_spawnYaw()` | 5 |
| 5370 | `_pickSpawn()` | 23 |
| 5393 | `_respawnPlayer()` | 30 |
| 5423 | `_losClear()` | 18 |
| 5441 | `_botCall()` | 37 |
| 5478 | `_teamMarkTex()` | 23 |
| 5501 | `_makeTeamMark()` | 14 |
| 5515 | `_updateTeamMark()` | 7 |
| 5522 | `_botEye()` | 1 |
| 5523 | `_enemyOf()` | 8 |
| 5531 | `_duelToken()` | 20 |
| 5551 | `_updateBot()` | 811 |
| 6362 | `_flushTraining()` | 13 |
| 6375 | `_updateBotNN()` | 71 |
| 6446 | `_botShootNN()` | 45 |
| 6491 | `_radarFoot()` | 38 |
| 6529 | `_updateRadar()` | 64 |
| 6593 | `_banner()` | 26 |
| 6619 | `_resultadoDaRodada()` | 4 |
| 6623 | `_showScoreboard()` | 49 |
| 6672 | `_updateWeaponHud()` | 35 |
| 6707 | `_updateHud()` | 80 |
| 6787 | `update()` | 74 |
| 6861 | `dispose()` | 38 |

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
