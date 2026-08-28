# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.175 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7342 | 277 |
| `public/js/main.js` | 2817 | 259 |
| `public/js/glbchars.js` | 970 | 69 |
| `public/js/characters.js` | 1169 | 41 |
| `public/js/vmattach.js` | 637 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 380 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3189 linhas (43% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 814 | 5978 | `_updateBot()` | ⚠️ candidato a extração |
| 566 | 618 | `constructor()` | 🔴 append-only |
| 364 | 5154 | `_updatePlayer()` | ⚠️ candidato a extração |
| 255 | 2318 | `_resetPositions()` |  |
| 241 | 1281 | `_buildViewModels()` |  |
| 148 | 5518 | `_updatePickups()` |  |
| 133 | 4638 | `_botCtf()` |  |
| 116 | 1935 | `_touchControls()` |  |
| 84 | 4369 | `_initCTF()` |  |
| 83 | 3145 | `_tryShoot()` |  |
| 80 | 7138 | `_updateHud()` |  |
| 79 | 3548 | `_dmgArc()` |  |
| 79 | 7218 | `update()` | 🔴 append-only |
| 76 | 4777 | `_updateCtfHud()` |  |
| 71 | 6805 | `_updateBotNN()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `330–333` `367–461` `488–509` `1281–1651` `2891–2909` `2991–3080` `3099–3227` `3242–3307` `3769–3793` `3841–3905` `3973–3989` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `170–173` `224–224` `250–261` `551–562` `3409–3517` `4313–4368` `4534–4770` `4853–4875` `5154–5517` `5850–5867` `5949–6791` | — |
| **MAPAS / MUNDO** | `1227–1280` `2318–2572` `4369–4511` `5518–5665` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1652–1661` `1776–1807` `2811–2823` `3794–3832` `3916–3972` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1184–1226` `2765–2789` `2805–2810` `2824–2840` `3548–3689` `3705–3768` `6960–7023` `7054–7102` `7138–7217` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7218–7296 · `_dom()` 1184–1226 · `constructor()` 618–1183

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3797 de 7342 linhas (52%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 44 | `REPLAY_CAM` | 3 |
| 53 | `VMLAB` | 3 |
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
| 319 | `RADIO` | 5 |
| 325 | `MK_LABELS` | 5 |
| 330 | `GUNFEEL` | 4 |
| 336 | `TRACER_STYLE` | 3 |
| 340 | `D2R` | 4 |
| 344 | `DMG_FALLOFF` | 5 |
| 349 | `HS_MUL` | 3 |
| 352 | `BALL_CLASS` | 15 |
| 367 | `STATIC_CLASS` | 75 |
| 443 | `VM_KNOB` | 19 |
| 464 | `vmFovForAspect` | 24 |
| 488 | `VM_OFF` | 22 |
| 510 | `vmOffY` | 35 |
| 545 | `VMP` | 6 |
| 551 | `BOT_SKILLS` | 11 |
| 563 | `diffKey` | 4 |
| 568 | `rollBotSkill` | 7 |
| 575 | `botTier` | 4 |
| 579 | `_cyclePool` | 4 |
| 583 | `_rosterPool` | 12 |
| 595 | `pickMatchRoster` | 10 |
| 605 | `BOT_WEAPON_POOL` | 5 |
| 610 | `pickMatchWeapons` | 7 |
| 618 | `constructor()` | 566 |
| 1184 | `_dom()` | 43 |
| 1227 | `_buildEnv()` | 54 |
| 1281 | `_buildViewModels()` | 241 |
| 1522 | `_vmFrame` | 130 |
| 1652 | `_makePuffTexture()` | 10 |
| 1662 | `_makeBloodTex()` | 19 |
| 1681 | `_makeBloodPoolTex()` | 21 |
| 1702 | `_bloodDecal()` | 16 |
| 1718 | `_makeBloodFx()` | 20 |
| 1738 | `_bloodSpatter()` | 18 |
| 1756 | `_bloodPoolAt()` | 6 |
| 1762 | `_updateBlood()` | 14 |
| 1776 | `_makeFlashTex()` | 22 |
| 1798 | `_makeFlashCoreTex()` | 10 |
| 1808 | `_input()` | 2 |
| 1810 | `_kd` | 42 |
| 1852 | `_ku` | 4 |
| 1856 | `_md` | 38 |
| 1894 | `_mu` | 7 |
| 1901 | `_mm` | 15 |
| 1916 | `_cc` | 1 |
| 1917 | `_blur` | 1 |
| 1918 | `_plc` | 17 |
| 1935 | `_touchControls()` | 116 |
| 2051 | `_aimAssist()` | 28 |
| 2079 | `_requestLock()` | 24 |
| 2103 | `_travaAtalhos()` | 4 |
| 2107 | `_soltaAtalhos()` | 3 |
| 2110 | `_acceptInput()` | 8 |
| 2118 | `_pauseBackdrop()` | 7 |
| 2125 | `_radioShow()` | 6 |
| 2131 | `_radioUi()` | 8 |
| 2139 | `_radioPick()` | 20 |
| 2159 | `_abilityNotice()` | 10 |
| 2169 | `_resetSliceAbilities()` | 9 |
| 2178 | `_stackTrace()` | 28 |
| 2206 | `_updateMotocaCharge()` | 10 |
| 2216 | `_recordRoutePoint()` | 11 |
| 2227 | `_routePing()` | 23 |
| 2250 | `_tickRoutePings()` | 12 |
| 2262 | `_objectiveInteractionMultiplier()` | 14 |
| 2276 | `start()` | 4 |
| 2280 | `_startRound()` | 38 |
| 2318 | `_resetPositions()` | 255 |
| 2573 | `_checkCtfAlvo()` | 13 |
| 2586 | `_checkPace()` | 13 |
| 2599 | `_endRound()` | 37 |
| 2636 | `_fimDaPartida()` | 7 |
| 2643 | `_endMatch()` | 58 |
| 2701 | `_ensureDolly()` | 41 |
| 2742 | `_tickDolly()` | 23 |
| 2765 | `setPaused()` | 25 |
| 2790 | `_now()` | 3 |
| 2793 | `pauseArmed()` | 1 |
| 2794 | `_syncPauseArm()` | 7 |
| 2801 | `resume()` | 4 |
| 2805 | `applySettings()` | 6 |
| 2811 | `_applyQuality()` | 13 |
| 2824 | `onResize()` | 17 |
| 2841 | `_switchTeam()` | 50 |
| 2891 | `_applyVmVisibility()` | 19 |
| 2910 | `_vmlabEnsure()` | 14 |
| 2924 | `_vmlabFrame()` | 28 |
| 2952 | `_tuneGet()` | 15 |
| 2967 | `_tune()` | 23 |
| 2990 | `_fxSet()` | 1 |
| 2991 | `_switchWeapon()` | 37 |
| 3028 | `_deploySfx()` | 7 |
| 3035 | `_scope()` | 17 |
| 3052 | `_zoomFov()` | 8 |
| 3060 | `_reloading()` | 1 |
| 3061 | `_startReload()` | 20 |
| 3081 | `_reloadLayers()` | 18 |
| 3099 | `_installRecoil()` | 33 |
| 3132 | `_shotRecoil()` | 13 |
| 3145 | `_tryShoot()` | 83 |
| 3228 | `_tryKnifeAttack()` | 14 |
| 3242 | `_meleeHit()` | 12 |
| 3254 | `_fireHitscan()` | 54 |
| 3308 | `_surfaceOf()` | 27 |
| 3335 | `_fleshImpact()` | 35 |
| 3370 | `_fxVoice()` | 9 |
| 3379 | `_impactSfx()` | 14 |
| 3393 | `_tintFx()` | 16 |
| 3409 | `_damage()` | 40 |
| 3449 | `_kill()` | 69 |
| 3518 | `_checkArenaWin()` | 30 |
| 3548 | `_dmgArc()` | 79 |
| 3627 | `_mkBanner()` | 9 |
| 3636 | `_hitmarker()` | 15 |
| 3651 | `_dmgNumber()` | 20 |
| 3671 | `_feed()` | 19 |
| 3690 | `_skullIcon()` | 6 |
| 3696 | `_killfeedWeaponIcon()` | 9 |
| 3705 | `_wpnIcon()` | 64 |
| 3769 | `_tracer()` | 25 |
| 3794 | `_puff()` | 39 |
| 3833 | `_holeDecalMat()` | 8 |
| 3841 | `_flash()` | 56 |
| 3897 | `_muzzleWorld()` | 9 |
| 3906 | `_updateDoors()` | 10 |
| 3916 | `_updateFx()` | 57 |
| 3973 | `_ejectCasing()` | 17 |
| 3990 | `_makeCtfFlagTex()` | 23 |
| 4013 | `_paintFlagSymbol()` | 9 |
| 4022 | `_flagTexFor()` | 26 |
| 4048 | `_legadoSimbolo()` | 8 |
| 4056 | `_loadCtfSymbols()` | 22 |
| 4078 | `_makeCtfZoneTex()` | 31 |
| 4109 | `_makeSmokeTex()` | 8 |
| 4117 | `_updateSmokeHud()` | 6 |
| 4123 | `_spawnGrenade()` | 14 |
| 4137 | `_throwSmoke()` | 12 |
| 4149 | `_throwFrag()` | 14 |
| 4163 | `_explodeFrag()` | 38 |
| 4201 | `_corDaFumaca()` | 15 |
| 4216 | `_popSmoke()` | 19 |
| 4235 | `_updateGrenades()` | 29 |
| 4264 | `_teamColor()` | 15 |
| 4279 | `_teamInk()` | 7 |
| 4286 | `_factionOf()` | 1 |
| 4287 | `_voiceKey()` | 3 |
| 4290 | `_teamName()` | 1 |
| 4291 | `_teamTag()` | 6 |
| 4297 | `_plaqueta()` | 13 |
| 4310 | `_mirror()` | 3 |
| 4313 | `_botSeparation()` | 56 |
| 4369 | `_initCTF()` | 84 |
| 4453 | `_updateCTF()` | 59 |
| 4512 | `_ctfWin()` | 22 |
| 4534 | `_freeYaw()` | 25 |
| 4559 | `_pullString()` | 23 |
| 4582 | `_walkReach()` | 18 |
| 4600 | `_wpComp()` | 16 |
| 4616 | `_findPathLocal()` | 22 |
| 4638 | `_botCtf()` | 133 |
| 4771 | `_hideCtfHud()` | 6 |
| 4777 | `_updateCtfHud()` | 76 |
| 4853 | `_collide()` | 23 |
| 4876 | `_collideRot()` | 22 |
| 4898 | `_mantleAlcance()` | 50 |
| 4948 | `_mantleAlcancavel()` | 12 |
| 4960 | `_mantleTarget()` | 35 |
| 4995 | `_freeSpot()` | 30 |
| 5025 | `_retaAndavel()` | 20 |
| 5045 | `_walkDepth()` | 16 |
| 5061 | `_noteHit()` | 17 |
| 5078 | `_deathFeedback()` | 43 |
| 5121 | `_updateReplayCam()` | 33 |
| 5154 | `_updatePlayer()` | 364 |
| 5518 | `_updatePickups()` | 148 |
| 5666 | `_wpnMode()` | 5 |
| 5671 | `_botWeapon()` | 10 |
| 5681 | `_municaoInfinita()` | 1 |
| 5682 | `_pickupAllowed()` | 7 |
| 5689 | `_grabPickup()` | 35 |
| 5724 | `_assentarNoChao()` | 11 |
| 5735 | `_dropWeapon()` | 18 |
| 5753 | `_sumirDrop()` | 36 |
| 5789 | `_spawnY()` | 3 |
| 5792 | `_spawnYaw()` | 5 |
| 5797 | `_pickSpawn()` | 23 |
| 5820 | `_respawnPlayer()` | 30 |
| 5850 | `_losClear()` | 18 |
| 5868 | `_botCall()` | 37 |
| 5905 | `_teamMarkTex()` | 23 |
| 5928 | `_makeTeamMark()` | 14 |
| 5942 | `_updateTeamMark()` | 7 |
| 5949 | `_botEye()` | 1 |
| 5950 | `_enemyOf()` | 8 |
| 5958 | `_duelToken()` | 20 |
| 5978 | `_updateBot()` | 814 |
| 6792 | `_flushTraining()` | 13 |
| 6805 | `_updateBotNN()` | 71 |
| 6876 | `_botShootNN()` | 46 |
| 6922 | `_radarFoot()` | 38 |
| 6960 | `_updateRadar()` | 64 |
| 7024 | `_banner()` | 26 |
| 7050 | `_resultadoDaRodada()` | 4 |
| 7054 | `_showScoreboard()` | 49 |
| 7103 | `_updateWeaponHud()` | 35 |
| 7138 | `_updateHud()` | 80 |
| 7218 | `update()` | 79 |
| 7297 | `dispose()` | 45 |

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
- braços/IK FP em produção: `fpsrig.js` (rig WRAD, dedos, sockets e recarga por família),
  auditor `fp-rig-check.mjs`; `fparms.js` permanece apenas como legado; armas no mundo:
  `weapons.js`

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
