# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.184 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6911 | 251 |
| `public/js/main.js` | 2699 | 252 |
| `public/js/glbchars.js` | 845 | 60 |
| `public/js/characters.js` | 1069 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 347 | 20 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3105 linhas (45% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 812 | 5562 | `_updateBot()` | ⚠️ candidato a extração |
| 542 | 586 | `constructor()` | 🔴 append-only |
| 315 | 4797 | `_updatePlayer()` | ⚠️ candidato a extração |
| 248 | 2159 | `_resetPositions()` |  |
| 241 | 1225 | `_buildViewModels()` |  |
| 148 | 5112 | `_updatePickups()` |  |
| 133 | 4374 | `_botCtf()` |  |
| 115 | 1903 | `_touchControls()` |  |
| 84 | 4108 | `_initCTF()` |  |
| 83 | 2947 | `_tryShoot()` |  |
| 80 | 6718 | `_updateHud()` |  |
| 79 | 3308 | `_dmgArc()` |  |
| 76 | 4513 | `_updateCtfHud()` |  |
| 76 | 6798 | `update()` | 🔴 append-only |
| 73 | 3235 | `_kill()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `304–306` `335–429` `456–477` `1225–1623` `2712–2717` `2799–2882` `2901–3094` `3529–3552` `3600–3662` `3729–3745` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `158–161` `212–212` `238–249` `519–530` `3196–3307` `4052–4107` `4270–4506` `4589–4611` `4797–5111` `5434–5451` `5533–6373` | — |
| **MAPAS / MUNDO** | `1171–1224` `2159–2406` `4108–4247` `5112–5259` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1624–1633` `1748–1779` `2642–2654` `3553–3591` `3673–3728` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1128–1170` `2599–2620` `2636–2641` `2655–2661` `3308–3449` `3465–3528` `6541–6604` `6635–6682` `6718–6797` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6798–6873 · `_dom()` 1128–1170 · `constructor()` 586–1127

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3728 de 6911 linhas (54%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 586 | `constructor()` | 542 |
| 1128 | `_dom()` | 43 |
| 1171 | `_buildEnv()` | 54 |
| 1225 | `_buildViewModels()` | 241 |
| 1466 | `_vmFrame` | 158 |
| 1624 | `_makePuffTexture()` | 10 |
| 1634 | `_makeBloodTex()` | 19 |
| 1653 | `_makeBloodPoolTex()` | 21 |
| 1674 | `_bloodDecal()` | 16 |
| 1690 | `_makeBloodFx()` | 20 |
| 1710 | `_bloodSpatter()` | 18 |
| 1728 | `_bloodPoolAt()` | 6 |
| 1734 | `_updateBlood()` | 14 |
| 1748 | `_makeFlashTex()` | 22 |
| 1770 | `_makeFlashCoreTex()` | 10 |
| 1780 | `_input()` | 2 |
| 1782 | `_kd` | 42 |
| 1824 | `_ku` | 4 |
| 1828 | `_md` | 34 |
| 1862 | `_mu` | 7 |
| 1869 | `_mm` | 15 |
| 1884 | `_cc` | 1 |
| 1885 | `_blur` | 1 |
| 1886 | `_plc` | 17 |
| 1903 | `_touchControls()` | 115 |
| 2018 | `_aimAssist()` | 28 |
| 2046 | `_requestLock()` | 24 |
| 2070 | `_travaAtalhos()` | 4 |
| 2074 | `_soltaAtalhos()` | 3 |
| 2077 | `_acceptInput()` | 8 |
| 2085 | `_pauseBackdrop()` | 7 |
| 2092 | `_radioShow()` | 6 |
| 2098 | `_radioUi()` | 8 |
| 2106 | `_radioPick()` | 14 |
| 2120 | `start()` | 4 |
| 2124 | `_startRound()` | 35 |
| 2159 | `_resetPositions()` | 248 |
| 2407 | `_checkCtfAlvo()` | 13 |
| 2420 | `_checkPace()` | 13 |
| 2433 | `_endRound()` | 37 |
| 2470 | `_fimDaPartida()` | 7 |
| 2477 | `_endMatch()` | 58 |
| 2535 | `_ensureDolly()` | 41 |
| 2576 | `_tickDolly()` | 23 |
| 2599 | `setPaused()` | 22 |
| 2621 | `_now()` | 3 |
| 2624 | `pauseArmed()` | 1 |
| 2625 | `_syncPauseArm()` | 7 |
| 2632 | `resume()` | 4 |
| 2636 | `applySettings()` | 6 |
| 2642 | `_applyQuality()` | 13 |
| 2655 | `onResize()` | 7 |
| 2662 | `_switchTeam()` | 50 |
| 2712 | `_applyVmVisibility()` | 6 |
| 2718 | `_vmlabEnsure()` | 14 |
| 2732 | `_vmlabFrame()` | 28 |
| 2760 | `_tuneGet()` | 15 |
| 2775 | `_tune()` | 23 |
| 2798 | `_fxSet()` | 1 |
| 2799 | `_switchWeapon()` | 32 |
| 2831 | `_deploySfx()` | 7 |
| 2838 | `_scope()` | 17 |
| 2855 | `_zoomFov()` | 8 |
| 2863 | `_reloading()` | 1 |
| 2864 | `_startReload()` | 19 |
| 2883 | `_reloadLayers()` | 18 |
| 2901 | `_installRecoil()` | 33 |
| 2934 | `_shotRecoil()` | 13 |
| 2947 | `_tryShoot()` | 83 |
| 3030 | `_meleeHit()` | 12 |
| 3042 | `_fireHitscan()` | 53 |
| 3095 | `_surfaceOf()` | 27 |
| 3122 | `_fleshImpact()` | 35 |
| 3157 | `_fxVoice()` | 9 |
| 3166 | `_impactSfx()` | 14 |
| 3180 | `_tintFx()` | 16 |
| 3196 | `_damage()` | 39 |
| 3235 | `_kill()` | 73 |
| 3308 | `_dmgArc()` | 79 |
| 3387 | `_mkBanner()` | 9 |
| 3396 | `_hitmarker()` | 15 |
| 3411 | `_dmgNumber()` | 20 |
| 3431 | `_feed()` | 19 |
| 3450 | `_skullIcon()` | 6 |
| 3456 | `_killfeedWeaponIcon()` | 9 |
| 3465 | `_wpnIcon()` | 64 |
| 3529 | `_tracer()` | 24 |
| 3553 | `_puff()` | 39 |
| 3592 | `_holeDecalMat()` | 8 |
| 3600 | `_flash()` | 54 |
| 3654 | `_muzzleWorld()` | 9 |
| 3663 | `_updateDoors()` | 10 |
| 3673 | `_updateFx()` | 56 |
| 3729 | `_ejectCasing()` | 17 |
| 3746 | `_makeCtfFlagTex()` | 23 |
| 3769 | `_paintFlagSymbol()` | 9 |
| 3778 | `_flagTexFor()` | 26 |
| 3804 | `_legadoSimbolo()` | 8 |
| 3812 | `_loadCtfSymbols()` | 22 |
| 3834 | `_makeCtfZoneTex()` | 31 |
| 3865 | `_makeSmokeTex()` | 8 |
| 3873 | `_updateSmokeHud()` | 6 |
| 3879 | `_spawnGrenade()` | 11 |
| 3890 | `_throwSmoke()` | 8 |
| 3898 | `_throwFrag()` | 10 |
| 3908 | `_explodeFrag()` | 38 |
| 3946 | `_corDaFumaca()` | 15 |
| 3961 | `_popSmoke()` | 19 |
| 3980 | `_updateGrenades()` | 27 |
| 4007 | `_teamColor()` | 14 |
| 4021 | `_teamInk()` | 6 |
| 4027 | `_factionOf()` | 1 |
| 4028 | `_voiceKey()` | 1 |
| 4029 | `_teamName()` | 1 |
| 4030 | `_teamTag()` | 6 |
| 4036 | `_plaqueta()` | 13 |
| 4049 | `_mirror()` | 3 |
| 4052 | `_botSeparation()` | 56 |
| 4108 | `_initCTF()` | 84 |
| 4192 | `_updateCTF()` | 56 |
| 4248 | `_ctfWin()` | 22 |
| 4270 | `_freeYaw()` | 25 |
| 4295 | `_pullString()` | 23 |
| 4318 | `_walkReach()` | 18 |
| 4336 | `_wpComp()` | 16 |
| 4352 | `_findPathLocal()` | 22 |
| 4374 | `_botCtf()` | 133 |
| 4507 | `_hideCtfHud()` | 6 |
| 4513 | `_updateCtfHud()` | 76 |
| 4589 | `_collide()` | 23 |
| 4612 | `_collideRot()` | 26 |
| 4638 | `_freeSpot()` | 30 |
| 4668 | `_retaAndavel()` | 20 |
| 4688 | `_walkDepth()` | 16 |
| 4704 | `_noteHit()` | 17 |
| 4721 | `_deathFeedback()` | 43 |
| 4764 | `_updateReplayCam()` | 33 |
| 4797 | `_updatePlayer()` | 315 |
| 5112 | `_updatePickups()` | 148 |
| 5260 | `_wpnMode()` | 5 |
| 5265 | `_botWeapon()` | 10 |
| 5275 | `_municaoInfinita()` | 1 |
| 5276 | `_pickupAllowed()` | 7 |
| 5283 | `_grabPickup()` | 35 |
| 5318 | `_assentarNoChao()` | 11 |
| 5329 | `_dropWeapon()` | 18 |
| 5347 | `_sumirDrop()` | 36 |
| 5383 | `_spawnY()` | 3 |
| 5386 | `_pickSpawn()` | 23 |
| 5409 | `_respawnPlayer()` | 25 |
| 5434 | `_losClear()` | 18 |
| 5452 | `_botCall()` | 37 |
| 5489 | `_teamMarkTex()` | 23 |
| 5512 | `_makeTeamMark()` | 14 |
| 5526 | `_updateTeamMark()` | 7 |
| 5533 | `_botEye()` | 1 |
| 5534 | `_enemyOf()` | 8 |
| 5542 | `_duelToken()` | 20 |
| 5562 | `_updateBot()` | 812 |
| 6374 | `_flushTraining()` | 13 |
| 6387 | `_updateBotNN()` | 71 |
| 6458 | `_botShootNN()` | 45 |
| 6503 | `_radarFoot()` | 38 |
| 6541 | `_updateRadar()` | 64 |
| 6605 | `_banner()` | 26 |
| 6631 | `_resultadoDaRodada()` | 4 |
| 6635 | `_showScoreboard()` | 48 |
| 6683 | `_updateWeaponHud()` | 35 |
| 6718 | `_updateHud()` | 80 |
| 6798 | `update()` | 76 |
| 6874 | `dispose()` | 37 |

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
