# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.190 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7069 | 257 |
| `public/js/main.js` | 2701 | 252 |
| `public/js/glbchars.js` | 846 | 60 |
| `public/js/characters.js` | 1069 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 348 | 20 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3138 linhas (44% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 812 | 5720 | `_updateBot()` | ⚠️ candidato a extração |
| 561 | 586 | `constructor()` | 🔴 append-only |
| 329 | 4941 | `_updatePlayer()` | ⚠️ candidato a extração |
| 248 | 2181 | `_resetPositions()` |  |
| 241 | 1244 | `_buildViewModels()` |  |
| 148 | 5270 | `_updatePickups()` |  |
| 133 | 4422 | `_botCtf()` |  |
| 115 | 1925 | `_touchControls()` |  |
| 84 | 4156 | `_initCTF()` |  |
| 83 | 2969 | `_tryShoot()` |  |
| 80 | 6876 | `_updateHud()` |  |
| 79 | 3330 | `_dmgArc()` |  |
| 76 | 4561 | `_updateCtfHud()` |  |
| 76 | 6956 | `update()` | 🔴 append-only |
| 73 | 3257 | `_kill()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `304–306` `335–429` `456–477` `1244–1644` `2734–2739` `2821–2904` `2923–3116` `3551–3574` `3622–3705` `3777–3793` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `158–161` `212–212` `238–249` `519–530` `3218–3329` `4100–4155` `4318–4554` `4637–4659` `4941–5269` `5592–5609` `5691–6531` | — |
| **MAPAS / MUNDO** | `1190–1243` `2181–2428` `4156–4295` `5270–5417` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1645–1654` `1769–1800` `2664–2676` `3575–3613` `3721–3776` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1147–1189` `2621–2642` `2658–2663` `2677–2683` `3330–3471` `3487–3550` `6699–6762` `6793–6840` `6876–6955` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6956–7031 · `_dom()` 1147–1189 · `constructor()` 586–1146

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3765 de 7069 linhas (53%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 36 | `REPLAY_CAM` | 3 |
| 45 | `VMLAB` | 8 |
| 53 | `VM_MAT_LEGACY` | 4 |
| 59 | `DROP_TTL` | 8 |
| 67 | `ROUNDS_MAX` | 27 |
| 97 | `CTF_CLOCK_SHOW` | 4 |
| 101 | `KILLS_PER_PLAYER` | 7 |
| 108 | `PACE` | 33 |
| 141 | `PAUSE_ARM_MS` | 9 |
| 151 | `confirmGate` | 7 |
| 162 | `BOT_AIM_PITCH` | 4 |
| 166 | `BOT_DMG_PLAYER` | 21 |
| 187 | `BOT_FAIR` | 5 |
| 192 | `BOT_MOVE2` | 15 |
| 216 | `BOT_FOCUS_MIN` | 22 |
| 242 | `BOT_TOKEN_REST` | 7 |
| 250 | `MOVE_MUL` | 6 |
| 257 | `MOVE2` | 5 |
| 262 | `RACK_OLD` | 4 |
| 266 | `RACK_RETA` | 25 |
| 293 | `RADIO` | 5 |
| 299 | `MK_LABELS` | 5 |
| 304 | `GUNFEEL` | 3 |
| 308 | `D2R` | 4 |
| 312 | `DMG_FALLOFF` | 5 |
| 317 | `HS_MUL` | 3 |
| 320 | `BALL_CLASS` | 15 |
| 335 | `STATIC_CLASS` | 75 |
| 411 | `VM_KNOB` | 19 |
| 432 | `vmFovForAspect` | 24 |
| 456 | `VM_OFF` | 22 |
| 478 | `vmOffY` | 35 |
| 513 | `VMP` | 6 |
| 519 | `BOT_SKILLS` | 11 |
| 531 | `diffKey` | 4 |
| 536 | `rollBotSkill` | 7 |
| 543 | `botTier` | 4 |
| 547 | `_cyclePool` | 4 |
| 551 | `_rosterPool` | 12 |
| 563 | `pickMatchRoster` | 10 |
| 573 | `BOT_WEAPON_POOL` | 5 |
| 578 | `pickMatchWeapons` | 7 |
| 586 | `constructor()` | 561 |
| 1147 | `_dom()` | 43 |
| 1190 | `_buildEnv()` | 54 |
| 1244 | `_buildViewModels()` | 241 |
| 1485 | `_vmFrame` | 160 |
| 1645 | `_makePuffTexture()` | 10 |
| 1655 | `_makeBloodTex()` | 19 |
| 1674 | `_makeBloodPoolTex()` | 21 |
| 1695 | `_bloodDecal()` | 16 |
| 1711 | `_makeBloodFx()` | 20 |
| 1731 | `_bloodSpatter()` | 18 |
| 1749 | `_bloodPoolAt()` | 6 |
| 1755 | `_updateBlood()` | 14 |
| 1769 | `_makeFlashTex()` | 22 |
| 1791 | `_makeFlashCoreTex()` | 10 |
| 1801 | `_input()` | 2 |
| 1803 | `_kd` | 43 |
| 1846 | `_ku` | 4 |
| 1850 | `_md` | 34 |
| 1884 | `_mu` | 7 |
| 1891 | `_mm` | 15 |
| 1906 | `_cc` | 1 |
| 1907 | `_blur` | 1 |
| 1908 | `_plc` | 17 |
| 1925 | `_touchControls()` | 115 |
| 2040 | `_aimAssist()` | 28 |
| 2068 | `_requestLock()` | 24 |
| 2092 | `_travaAtalhos()` | 4 |
| 2096 | `_soltaAtalhos()` | 3 |
| 2099 | `_acceptInput()` | 8 |
| 2107 | `_pauseBackdrop()` | 7 |
| 2114 | `_radioShow()` | 6 |
| 2120 | `_radioUi()` | 8 |
| 2128 | `_radioPick()` | 14 |
| 2142 | `start()` | 4 |
| 2146 | `_startRound()` | 35 |
| 2181 | `_resetPositions()` | 248 |
| 2429 | `_checkCtfAlvo()` | 13 |
| 2442 | `_checkPace()` | 13 |
| 2455 | `_endRound()` | 37 |
| 2492 | `_fimDaPartida()` | 7 |
| 2499 | `_endMatch()` | 58 |
| 2557 | `_ensureDolly()` | 41 |
| 2598 | `_tickDolly()` | 23 |
| 2621 | `setPaused()` | 22 |
| 2643 | `_now()` | 3 |
| 2646 | `pauseArmed()` | 1 |
| 2647 | `_syncPauseArm()` | 7 |
| 2654 | `resume()` | 4 |
| 2658 | `applySettings()` | 6 |
| 2664 | `_applyQuality()` | 13 |
| 2677 | `onResize()` | 7 |
| 2684 | `_switchTeam()` | 50 |
| 2734 | `_applyVmVisibility()` | 6 |
| 2740 | `_vmlabEnsure()` | 14 |
| 2754 | `_vmlabFrame()` | 28 |
| 2782 | `_tuneGet()` | 15 |
| 2797 | `_tune()` | 23 |
| 2820 | `_fxSet()` | 1 |
| 2821 | `_switchWeapon()` | 32 |
| 2853 | `_deploySfx()` | 7 |
| 2860 | `_scope()` | 17 |
| 2877 | `_zoomFov()` | 8 |
| 2885 | `_reloading()` | 1 |
| 2886 | `_startReload()` | 19 |
| 2905 | `_reloadLayers()` | 18 |
| 2923 | `_installRecoil()` | 33 |
| 2956 | `_shotRecoil()` | 13 |
| 2969 | `_tryShoot()` | 83 |
| 3052 | `_meleeHit()` | 12 |
| 3064 | `_fireHitscan()` | 53 |
| 3117 | `_surfaceOf()` | 27 |
| 3144 | `_fleshImpact()` | 35 |
| 3179 | `_fxVoice()` | 9 |
| 3188 | `_impactSfx()` | 14 |
| 3202 | `_tintFx()` | 16 |
| 3218 | `_damage()` | 39 |
| 3257 | `_kill()` | 73 |
| 3330 | `_dmgArc()` | 79 |
| 3409 | `_mkBanner()` | 9 |
| 3418 | `_hitmarker()` | 15 |
| 3433 | `_dmgNumber()` | 20 |
| 3453 | `_feed()` | 19 |
| 3472 | `_skullIcon()` | 6 |
| 3478 | `_killfeedWeaponIcon()` | 9 |
| 3487 | `_wpnIcon()` | 64 |
| 3551 | `_tracer()` | 24 |
| 3575 | `_puff()` | 39 |
| 3614 | `_holeDecalMat()` | 8 |
| 3622 | `_flash()` | 66 |
| 3688 | `_muzzleWorld()` | 18 |
| 3706 | `_aimOrigin()` | 5 |
| 3711 | `_updateDoors()` | 10 |
| 3721 | `_updateFx()` | 56 |
| 3777 | `_ejectCasing()` | 17 |
| 3794 | `_makeCtfFlagTex()` | 23 |
| 3817 | `_paintFlagSymbol()` | 9 |
| 3826 | `_flagTexFor()` | 26 |
| 3852 | `_legadoSimbolo()` | 8 |
| 3860 | `_loadCtfSymbols()` | 22 |
| 3882 | `_makeCtfZoneTex()` | 31 |
| 3913 | `_makeSmokeTex()` | 8 |
| 3921 | `_updateSmokeHud()` | 6 |
| 3927 | `_spawnGrenade()` | 11 |
| 3938 | `_throwSmoke()` | 8 |
| 3946 | `_throwFrag()` | 10 |
| 3956 | `_explodeFrag()` | 38 |
| 3994 | `_corDaFumaca()` | 15 |
| 4009 | `_popSmoke()` | 19 |
| 4028 | `_updateGrenades()` | 27 |
| 4055 | `_teamColor()` | 14 |
| 4069 | `_teamInk()` | 6 |
| 4075 | `_factionOf()` | 1 |
| 4076 | `_voiceKey()` | 1 |
| 4077 | `_teamName()` | 1 |
| 4078 | `_teamTag()` | 6 |
| 4084 | `_plaqueta()` | 13 |
| 4097 | `_mirror()` | 3 |
| 4100 | `_botSeparation()` | 56 |
| 4156 | `_initCTF()` | 84 |
| 4240 | `_updateCTF()` | 56 |
| 4296 | `_ctfWin()` | 22 |
| 4318 | `_freeYaw()` | 25 |
| 4343 | `_pullString()` | 23 |
| 4366 | `_walkReach()` | 18 |
| 4384 | `_wpComp()` | 16 |
| 4400 | `_findPathLocal()` | 22 |
| 4422 | `_botCtf()` | 133 |
| 4555 | `_hideCtfHud()` | 6 |
| 4561 | `_updateCtfHud()` | 76 |
| 4637 | `_collide()` | 23 |
| 4660 | `_collideRot()` | 26 |
| 4686 | `_freeSpot()` | 30 |
| 4716 | `_retaAndavel()` | 20 |
| 4736 | `_walkDepth()` | 16 |
| 4752 | `_noteHit()` | 17 |
| 4769 | `_deathFeedback()` | 43 |
| 4812 | `_updateReplayCam()` | 35 |
| 4847 | `_toggleCamView()` | 11 |
| 4858 | `_syncCamViewVis()` | 8 |
| 4866 | `_ensurePlayerTP()` | 25 |
| 4891 | `_updatePlayerTP()` | 35 |
| 4926 | `_tpDeath()` | 15 |
| 4941 | `_updatePlayer()` | 329 |
| 5270 | `_updatePickups()` | 148 |
| 5418 | `_wpnMode()` | 5 |
| 5423 | `_botWeapon()` | 10 |
| 5433 | `_municaoInfinita()` | 1 |
| 5434 | `_pickupAllowed()` | 7 |
| 5441 | `_grabPickup()` | 35 |
| 5476 | `_assentarNoChao()` | 11 |
| 5487 | `_dropWeapon()` | 18 |
| 5505 | `_sumirDrop()` | 36 |
| 5541 | `_spawnY()` | 3 |
| 5544 | `_pickSpawn()` | 23 |
| 5567 | `_respawnPlayer()` | 25 |
| 5592 | `_losClear()` | 18 |
| 5610 | `_botCall()` | 37 |
| 5647 | `_teamMarkTex()` | 23 |
| 5670 | `_makeTeamMark()` | 14 |
| 5684 | `_updateTeamMark()` | 7 |
| 5691 | `_botEye()` | 1 |
| 5692 | `_enemyOf()` | 8 |
| 5700 | `_duelToken()` | 20 |
| 5720 | `_updateBot()` | 812 |
| 6532 | `_flushTraining()` | 13 |
| 6545 | `_updateBotNN()` | 71 |
| 6616 | `_botShootNN()` | 45 |
| 6661 | `_radarFoot()` | 38 |
| 6699 | `_updateRadar()` | 64 |
| 6763 | `_banner()` | 26 |
| 6789 | `_resultadoDaRodada()` | 4 |
| 6793 | `_showScoreboard()` | 48 |
| 6841 | `_updateWeaponHud()` | 35 |
| 6876 | `_updateHud()` | 80 |
| 6956 | `update()` | 76 |
| 7032 | `dispose()` | 37 |

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
