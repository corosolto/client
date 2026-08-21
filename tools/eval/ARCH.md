# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.166 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6839 | 242 |
| `public/js/main.js` | 2647 | 250 |
| `public/js/glbchars.js` | 838 | 60 |
| `public/js/characters.js` | 1069 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 345 | 20 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3092 linhas (45% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 812 | 5495 | `_updateBot()` | ⚠️ candidato a extração |
| 538 | 563 | `constructor()` | 🔴 append-only |
| 313 | 4730 | `_updatePlayer()` | ⚠️ candidato a extração |
| 248 | 2132 | `_resetPositions()` |  |
| 241 | 1198 | `_buildViewModels()` |  |
| 148 | 5043 | `_updatePickups()` |  |
| 133 | 4340 | `_botCtf()` |  |
| 115 | 1876 | `_touchControls()` |  |
| 84 | 4074 | `_initCTF()` |  |
| 83 | 2920 | `_tryShoot()` |  |
| 80 | 6651 | `_updateHud()` |  |
| 79 | 3274 | `_dmgArc()` |  |
| 76 | 4479 | `_updateCtfHud()` |  |
| 71 | 6320 | `_updateBotNN()` |  |
| 71 | 6731 | `update()` | 🔴 append-only |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `295–297` `326–420` `447–468` `1198–1596` `2685–2690` `2772–2855` `2874–3067` `3495–3518` `3566–3628` `3695–3711` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `149–152` `203–203` `229–240` `510–521` `3169–3273` `4018–4073` `4236–4472` `4555–4577` `4730–5042` `5367–5384` `5466–6306` | — |
| **MAPAS / MUNDO** | `1144–1197` `2132–2379` `4074–4213` `5043–5190` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1597–1606` `1721–1752` `2615–2627` `3519–3557` `3639–3694` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1101–1143` `2572–2593` `2609–2614` `2628–2634` `3274–3415` `3431–3494` `6474–6537` `6568–6615` `6651–6730` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6731–6801 · `_dom()` 1101–1143 · `constructor()` 563–1100

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3719 de 6839 linhas (54%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 36 | `VMLAB` | 8 |
| 44 | `VM_MAT_LEGACY` | 4 |
| 50 | `DROP_TTL` | 8 |
| 58 | `ROUNDS_MAX` | 27 |
| 88 | `CTF_CLOCK_SHOW` | 4 |
| 92 | `KILLS_PER_PLAYER` | 7 |
| 99 | `PACE` | 33 |
| 132 | `PAUSE_ARM_MS` | 9 |
| 142 | `confirmGate` | 7 |
| 153 | `BOT_AIM_PITCH` | 4 |
| 157 | `BOT_DMG_PLAYER` | 21 |
| 178 | `BOT_FAIR` | 5 |
| 183 | `BOT_MOVE2` | 15 |
| 207 | `BOT_FOCUS_MIN` | 22 |
| 233 | `BOT_TOKEN_REST` | 7 |
| 241 | `MOVE_MUL` | 6 |
| 248 | `MOVE2` | 5 |
| 253 | `RACK_OLD` | 4 |
| 257 | `RACK_RETA` | 25 |
| 284 | `RADIO` | 5 |
| 290 | `MK_LABELS` | 5 |
| 295 | `GUNFEEL` | 3 |
| 299 | `D2R` | 4 |
| 303 | `DMG_FALLOFF` | 5 |
| 308 | `HS_MUL` | 3 |
| 311 | `BALL_CLASS` | 15 |
| 326 | `STATIC_CLASS` | 75 |
| 402 | `VM_KNOB` | 19 |
| 423 | `vmFovForAspect` | 24 |
| 447 | `VM_OFF` | 22 |
| 469 | `vmOffY` | 35 |
| 504 | `VMP` | 6 |
| 510 | `BOT_SKILLS` | 11 |
| 522 | `diffKey` | 4 |
| 527 | `rollBotSkill` | 7 |
| 534 | `botTier` | 4 |
| 538 | `_cyclePool` | 4 |
| 542 | `_rosterPool` | 12 |
| 554 | `pickMatchRoster` | 8 |
| 563 | `constructor()` | 538 |
| 1101 | `_dom()` | 43 |
| 1144 | `_buildEnv()` | 54 |
| 1198 | `_buildViewModels()` | 241 |
| 1439 | `_vmFrame` | 158 |
| 1597 | `_makePuffTexture()` | 10 |
| 1607 | `_makeBloodTex()` | 19 |
| 1626 | `_makeBloodPoolTex()` | 21 |
| 1647 | `_bloodDecal()` | 16 |
| 1663 | `_makeBloodFx()` | 20 |
| 1683 | `_bloodSpatter()` | 18 |
| 1701 | `_bloodPoolAt()` | 6 |
| 1707 | `_updateBlood()` | 14 |
| 1721 | `_makeFlashTex()` | 22 |
| 1743 | `_makeFlashCoreTex()` | 10 |
| 1753 | `_input()` | 2 |
| 1755 | `_kd` | 42 |
| 1797 | `_ku` | 4 |
| 1801 | `_md` | 34 |
| 1835 | `_mu` | 7 |
| 1842 | `_mm` | 15 |
| 1857 | `_cc` | 1 |
| 1858 | `_blur` | 1 |
| 1859 | `_plc` | 17 |
| 1876 | `_touchControls()` | 115 |
| 1991 | `_aimAssist()` | 28 |
| 2019 | `_requestLock()` | 24 |
| 2043 | `_travaAtalhos()` | 4 |
| 2047 | `_soltaAtalhos()` | 3 |
| 2050 | `_acceptInput()` | 8 |
| 2058 | `_pauseBackdrop()` | 7 |
| 2065 | `_radioShow()` | 6 |
| 2071 | `_radioUi()` | 8 |
| 2079 | `_radioPick()` | 14 |
| 2093 | `start()` | 4 |
| 2097 | `_startRound()` | 35 |
| 2132 | `_resetPositions()` | 248 |
| 2380 | `_checkCtfAlvo()` | 13 |
| 2393 | `_checkPace()` | 13 |
| 2406 | `_endRound()` | 37 |
| 2443 | `_fimDaPartida()` | 7 |
| 2450 | `_endMatch()` | 58 |
| 2508 | `_ensureDolly()` | 41 |
| 2549 | `_tickDolly()` | 23 |
| 2572 | `setPaused()` | 22 |
| 2594 | `_now()` | 3 |
| 2597 | `pauseArmed()` | 1 |
| 2598 | `_syncPauseArm()` | 7 |
| 2605 | `resume()` | 4 |
| 2609 | `applySettings()` | 6 |
| 2615 | `_applyQuality()` | 13 |
| 2628 | `onResize()` | 7 |
| 2635 | `_switchTeam()` | 50 |
| 2685 | `_applyVmVisibility()` | 6 |
| 2691 | `_vmlabEnsure()` | 14 |
| 2705 | `_vmlabFrame()` | 28 |
| 2733 | `_tuneGet()` | 15 |
| 2748 | `_tune()` | 23 |
| 2771 | `_fxSet()` | 1 |
| 2772 | `_switchWeapon()` | 32 |
| 2804 | `_deploySfx()` | 7 |
| 2811 | `_scope()` | 17 |
| 2828 | `_zoomFov()` | 8 |
| 2836 | `_reloading()` | 1 |
| 2837 | `_startReload()` | 19 |
| 2856 | `_reloadLayers()` | 18 |
| 2874 | `_installRecoil()` | 33 |
| 2907 | `_shotRecoil()` | 13 |
| 2920 | `_tryShoot()` | 83 |
| 3003 | `_meleeHit()` | 12 |
| 3015 | `_fireHitscan()` | 53 |
| 3068 | `_surfaceOf()` | 27 |
| 3095 | `_fleshImpact()` | 35 |
| 3130 | `_fxVoice()` | 9 |
| 3139 | `_impactSfx()` | 14 |
| 3153 | `_tintFx()` | 16 |
| 3169 | `_damage()` | 39 |
| 3208 | `_kill()` | 66 |
| 3274 | `_dmgArc()` | 79 |
| 3353 | `_mkBanner()` | 9 |
| 3362 | `_hitmarker()` | 15 |
| 3377 | `_dmgNumber()` | 20 |
| 3397 | `_feed()` | 19 |
| 3416 | `_skullIcon()` | 6 |
| 3422 | `_killfeedWeaponIcon()` | 9 |
| 3431 | `_wpnIcon()` | 64 |
| 3495 | `_tracer()` | 24 |
| 3519 | `_puff()` | 39 |
| 3558 | `_holeDecalMat()` | 8 |
| 3566 | `_flash()` | 54 |
| 3620 | `_muzzleWorld()` | 9 |
| 3629 | `_updateDoors()` | 10 |
| 3639 | `_updateFx()` | 56 |
| 3695 | `_ejectCasing()` | 17 |
| 3712 | `_makeCtfFlagTex()` | 23 |
| 3735 | `_paintFlagSymbol()` | 9 |
| 3744 | `_flagTexFor()` | 26 |
| 3770 | `_legadoSimbolo()` | 8 |
| 3778 | `_loadCtfSymbols()` | 22 |
| 3800 | `_makeCtfZoneTex()` | 31 |
| 3831 | `_makeSmokeTex()` | 8 |
| 3839 | `_updateSmokeHud()` | 6 |
| 3845 | `_spawnGrenade()` | 11 |
| 3856 | `_throwSmoke()` | 8 |
| 3864 | `_throwFrag()` | 10 |
| 3874 | `_explodeFrag()` | 38 |
| 3912 | `_corDaFumaca()` | 15 |
| 3927 | `_popSmoke()` | 19 |
| 3946 | `_updateGrenades()` | 27 |
| 3973 | `_teamColor()` | 14 |
| 3987 | `_teamInk()` | 6 |
| 3993 | `_factionOf()` | 1 |
| 3994 | `_voiceKey()` | 1 |
| 3995 | `_teamName()` | 1 |
| 3996 | `_teamTag()` | 6 |
| 4002 | `_plaqueta()` | 13 |
| 4015 | `_mirror()` | 3 |
| 4018 | `_botSeparation()` | 56 |
| 4074 | `_initCTF()` | 84 |
| 4158 | `_updateCTF()` | 56 |
| 4214 | `_ctfWin()` | 22 |
| 4236 | `_freeYaw()` | 25 |
| 4261 | `_pullString()` | 23 |
| 4284 | `_walkReach()` | 18 |
| 4302 | `_wpComp()` | 16 |
| 4318 | `_findPathLocal()` | 22 |
| 4340 | `_botCtf()` | 133 |
| 4473 | `_hideCtfHud()` | 6 |
| 4479 | `_updateCtfHud()` | 76 |
| 4555 | `_collide()` | 23 |
| 4578 | `_collideRot()` | 26 |
| 4604 | `_freeSpot()` | 30 |
| 4634 | `_retaAndavel()` | 20 |
| 4654 | `_walkDepth()` | 16 |
| 4670 | `_noteHit()` | 17 |
| 4687 | `_deathFeedback()` | 43 |
| 4730 | `_updatePlayer()` | 313 |
| 5043 | `_updatePickups()` | 148 |
| 5191 | `_wpnMode()` | 5 |
| 5196 | `_botWeapon()` | 12 |
| 5208 | `_municaoInfinita()` | 1 |
| 5209 | `_pickupAllowed()` | 7 |
| 5216 | `_grabPickup()` | 35 |
| 5251 | `_assentarNoChao()` | 11 |
| 5262 | `_dropWeapon()` | 18 |
| 5280 | `_sumirDrop()` | 36 |
| 5316 | `_spawnY()` | 3 |
| 5319 | `_pickSpawn()` | 23 |
| 5342 | `_respawnPlayer()` | 25 |
| 5367 | `_losClear()` | 18 |
| 5385 | `_botCall()` | 37 |
| 5422 | `_teamMarkTex()` | 23 |
| 5445 | `_makeTeamMark()` | 14 |
| 5459 | `_updateTeamMark()` | 7 |
| 5466 | `_botEye()` | 1 |
| 5467 | `_enemyOf()` | 8 |
| 5475 | `_duelToken()` | 20 |
| 5495 | `_updateBot()` | 812 |
| 6307 | `_flushTraining()` | 13 |
| 6320 | `_updateBotNN()` | 71 |
| 6391 | `_botShootNN()` | 45 |
| 6436 | `_radarFoot()` | 38 |
| 6474 | `_updateRadar()` | 64 |
| 6538 | `_banner()` | 26 |
| 6564 | `_resultadoDaRodada()` | 4 |
| 6568 | `_showScoreboard()` | 48 |
| 6616 | `_updateWeaponHud()` | 35 |
| 6651 | `_updateHud()` | 80 |
| 6731 | `update()` | 71 |
| 6802 | `dispose()` | 37 |

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
