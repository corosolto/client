# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.175 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7383 | 277 |
| `public/js/main.js` | 2824 | 259 |
| `public/js/glbchars.js` | 970 | 69 |
| `public/js/characters.js` | 1169 | 41 |
| `public/js/vmattach.js` | 635 | 4 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 373 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3209 linhas (43% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 814 | 6019 | `_updateBot()` | ⚠️ candidato a extração |
| 582 | 619 | `constructor()` | 🔴 append-only |
| 368 | 5191 | `_updatePlayer()` | ⚠️ candidato a extração |
| 255 | 2335 | `_resetPositions()` |  |
| 241 | 1298 | `_buildViewModels()` |  |
| 148 | 5559 | `_updatePickups()` |  |
| 133 | 4675 | `_botCtf()` |  |
| 116 | 1952 | `_touchControls()` |  |
| 84 | 4406 | `_initCTF()` |  |
| 83 | 3178 | `_tryShoot()` |  |
| 80 | 7179 | `_updateHud()` |  |
| 79 | 3581 | `_dmgArc()` |  |
| 79 | 7259 | `update()` | 🔴 append-only |
| 76 | 4814 | `_updateCtfHud()` |  |
| 71 | 6846 | `_updateBotNN()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `331–334` `368–462` `489–510` `1298–1668` `2908–2942` `3024–3113` `3132–3260` `3275–3340` `3802–3826` `3874–3942` `4010–4026` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `171–174` `225–225` `251–262` `552–563` `3442–3550` `4350–4405` `4571–4807` `4890–4912` `5191–5558` `5891–5908` `5990–6832` | — |
| **MAPAS / MUNDO** | `1244–1297` `2335–2589` `4406–4548` `5559–5706` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1669–1678` `1793–1824` `2828–2840` `3827–3865` `3953–4009` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1201–1243` `2782–2806` `2822–2827` `2841–2857` `3581–3722` `3738–3801` `7001–7064` `7095–7143` `7179–7258` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7259–7337 · `_dom()` 1201–1243 · `constructor()` 619–1200

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3821 de 7383 linhas (52%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 45 | `REPLAY_CAM` | 3 |
| 54 | `VMLAB` | 3 |
| 58 | `VM_QA_ADS` | 8 |
| 66 | `VM_MAT_LEGACY` | 4 |
| 72 | `DROP_TTL` | 8 |
| 80 | `ROUNDS_MAX` | 27 |
| 110 | `CTF_CLOCK_SHOW` | 4 |
| 114 | `KILLS_PER_PLAYER` | 7 |
| 121 | `PACE` | 33 |
| 154 | `PAUSE_ARM_MS` | 9 |
| 164 | `confirmGate` | 7 |
| 175 | `BOT_AIM_PITCH` | 4 |
| 179 | `BOT_DMG_PLAYER` | 21 |
| 200 | `BOT_FAIR` | 5 |
| 205 | `BOT_MOVE2` | 15 |
| 229 | `BOT_FOCUS_MIN` | 22 |
| 255 | `BOT_TOKEN_REST` | 7 |
| 263 | `MOVE_MUL` | 6 |
| 270 | `MOVE2` | 4 |
| 274 | `STEP_H` | 3 |
| 281 | `MANTLE_APOIO` | 4 |
| 285 | `MANTLE_GRID` | 5 |
| 290 | `RACK_OLD` | 4 |
| 294 | `RACK_RETA` | 25 |
| 320 | `RADIO` | 5 |
| 326 | `MK_LABELS` | 5 |
| 331 | `GUNFEEL` | 4 |
| 337 | `TRACER_STYLE` | 3 |
| 341 | `D2R` | 4 |
| 345 | `DMG_FALLOFF` | 5 |
| 350 | `HS_MUL` | 3 |
| 353 | `BALL_CLASS` | 15 |
| 368 | `STATIC_CLASS` | 75 |
| 444 | `VM_KNOB` | 19 |
| 465 | `vmFovForAspect` | 24 |
| 489 | `VM_OFF` | 22 |
| 511 | `vmOffY` | 35 |
| 546 | `VMP` | 6 |
| 552 | `BOT_SKILLS` | 11 |
| 564 | `diffKey` | 4 |
| 569 | `rollBotSkill` | 7 |
| 576 | `botTier` | 4 |
| 580 | `_cyclePool` | 4 |
| 584 | `_rosterPool` | 12 |
| 596 | `pickMatchRoster` | 10 |
| 606 | `BOT_WEAPON_POOL` | 5 |
| 611 | `pickMatchWeapons` | 7 |
| 619 | `constructor()` | 582 |
| 1201 | `_dom()` | 43 |
| 1244 | `_buildEnv()` | 54 |
| 1298 | `_buildViewModels()` | 241 |
| 1539 | `_vmFrame` | 130 |
| 1669 | `_makePuffTexture()` | 10 |
| 1679 | `_makeBloodTex()` | 19 |
| 1698 | `_makeBloodPoolTex()` | 21 |
| 1719 | `_bloodDecal()` | 16 |
| 1735 | `_makeBloodFx()` | 20 |
| 1755 | `_bloodSpatter()` | 18 |
| 1773 | `_bloodPoolAt()` | 6 |
| 1779 | `_updateBlood()` | 14 |
| 1793 | `_makeFlashTex()` | 22 |
| 1815 | `_makeFlashCoreTex()` | 10 |
| 1825 | `_input()` | 2 |
| 1827 | `_kd` | 42 |
| 1869 | `_ku` | 4 |
| 1873 | `_md` | 38 |
| 1911 | `_mu` | 7 |
| 1918 | `_mm` | 15 |
| 1933 | `_cc` | 1 |
| 1934 | `_blur` | 1 |
| 1935 | `_plc` | 17 |
| 1952 | `_touchControls()` | 116 |
| 2068 | `_aimAssist()` | 28 |
| 2096 | `_requestLock()` | 24 |
| 2120 | `_travaAtalhos()` | 4 |
| 2124 | `_soltaAtalhos()` | 3 |
| 2127 | `_acceptInput()` | 8 |
| 2135 | `_pauseBackdrop()` | 7 |
| 2142 | `_radioShow()` | 6 |
| 2148 | `_radioUi()` | 8 |
| 2156 | `_radioPick()` | 20 |
| 2176 | `_abilityNotice()` | 10 |
| 2186 | `_resetSliceAbilities()` | 9 |
| 2195 | `_stackTrace()` | 28 |
| 2223 | `_updateMotocaCharge()` | 10 |
| 2233 | `_recordRoutePoint()` | 11 |
| 2244 | `_routePing()` | 23 |
| 2267 | `_tickRoutePings()` | 12 |
| 2279 | `_objectiveInteractionMultiplier()` | 14 |
| 2293 | `start()` | 4 |
| 2297 | `_startRound()` | 38 |
| 2335 | `_resetPositions()` | 255 |
| 2590 | `_checkCtfAlvo()` | 13 |
| 2603 | `_checkPace()` | 13 |
| 2616 | `_endRound()` | 37 |
| 2653 | `_fimDaPartida()` | 7 |
| 2660 | `_endMatch()` | 58 |
| 2718 | `_ensureDolly()` | 41 |
| 2759 | `_tickDolly()` | 23 |
| 2782 | `setPaused()` | 25 |
| 2807 | `_now()` | 3 |
| 2810 | `pauseArmed()` | 1 |
| 2811 | `_syncPauseArm()` | 7 |
| 2818 | `resume()` | 4 |
| 2822 | `applySettings()` | 6 |
| 2828 | `_applyQuality()` | 13 |
| 2841 | `onResize()` | 17 |
| 2858 | `_switchTeam()` | 50 |
| 2908 | `_applyVmVisibility()` | 35 |
| 2943 | `_vmlabEnsure()` | 14 |
| 2957 | `_vmlabFrame()` | 28 |
| 2985 | `_tuneGet()` | 15 |
| 3000 | `_tune()` | 23 |
| 3023 | `_fxSet()` | 1 |
| 3024 | `_switchWeapon()` | 37 |
| 3061 | `_deploySfx()` | 7 |
| 3068 | `_scope()` | 17 |
| 3085 | `_zoomFov()` | 8 |
| 3093 | `_reloading()` | 1 |
| 3094 | `_startReload()` | 20 |
| 3114 | `_reloadLayers()` | 18 |
| 3132 | `_installRecoil()` | 33 |
| 3165 | `_shotRecoil()` | 13 |
| 3178 | `_tryShoot()` | 83 |
| 3261 | `_tryKnifeAttack()` | 14 |
| 3275 | `_meleeHit()` | 12 |
| 3287 | `_fireHitscan()` | 54 |
| 3341 | `_surfaceOf()` | 27 |
| 3368 | `_fleshImpact()` | 35 |
| 3403 | `_fxVoice()` | 9 |
| 3412 | `_impactSfx()` | 14 |
| 3426 | `_tintFx()` | 16 |
| 3442 | `_damage()` | 40 |
| 3482 | `_kill()` | 69 |
| 3551 | `_checkArenaWin()` | 30 |
| 3581 | `_dmgArc()` | 79 |
| 3660 | `_mkBanner()` | 9 |
| 3669 | `_hitmarker()` | 15 |
| 3684 | `_dmgNumber()` | 20 |
| 3704 | `_feed()` | 19 |
| 3723 | `_skullIcon()` | 6 |
| 3729 | `_killfeedWeaponIcon()` | 9 |
| 3738 | `_wpnIcon()` | 64 |
| 3802 | `_tracer()` | 25 |
| 3827 | `_puff()` | 39 |
| 3866 | `_holeDecalMat()` | 8 |
| 3874 | `_flash()` | 56 |
| 3930 | `_muzzleWorld()` | 13 |
| 3943 | `_updateDoors()` | 10 |
| 3953 | `_updateFx()` | 57 |
| 4010 | `_ejectCasing()` | 17 |
| 4027 | `_makeCtfFlagTex()` | 23 |
| 4050 | `_paintFlagSymbol()` | 9 |
| 4059 | `_flagTexFor()` | 26 |
| 4085 | `_legadoSimbolo()` | 8 |
| 4093 | `_loadCtfSymbols()` | 22 |
| 4115 | `_makeCtfZoneTex()` | 31 |
| 4146 | `_makeSmokeTex()` | 8 |
| 4154 | `_updateSmokeHud()` | 6 |
| 4160 | `_spawnGrenade()` | 14 |
| 4174 | `_throwSmoke()` | 12 |
| 4186 | `_throwFrag()` | 14 |
| 4200 | `_explodeFrag()` | 38 |
| 4238 | `_corDaFumaca()` | 15 |
| 4253 | `_popSmoke()` | 19 |
| 4272 | `_updateGrenades()` | 29 |
| 4301 | `_teamColor()` | 15 |
| 4316 | `_teamInk()` | 7 |
| 4323 | `_factionOf()` | 1 |
| 4324 | `_voiceKey()` | 3 |
| 4327 | `_teamName()` | 1 |
| 4328 | `_teamTag()` | 6 |
| 4334 | `_plaqueta()` | 13 |
| 4347 | `_mirror()` | 3 |
| 4350 | `_botSeparation()` | 56 |
| 4406 | `_initCTF()` | 84 |
| 4490 | `_updateCTF()` | 59 |
| 4549 | `_ctfWin()` | 22 |
| 4571 | `_freeYaw()` | 25 |
| 4596 | `_pullString()` | 23 |
| 4619 | `_walkReach()` | 18 |
| 4637 | `_wpComp()` | 16 |
| 4653 | `_findPathLocal()` | 22 |
| 4675 | `_botCtf()` | 133 |
| 4808 | `_hideCtfHud()` | 6 |
| 4814 | `_updateCtfHud()` | 76 |
| 4890 | `_collide()` | 23 |
| 4913 | `_collideRot()` | 22 |
| 4935 | `_mantleAlcance()` | 50 |
| 4985 | `_mantleAlcancavel()` | 12 |
| 4997 | `_mantleTarget()` | 35 |
| 5032 | `_freeSpot()` | 30 |
| 5062 | `_retaAndavel()` | 20 |
| 5082 | `_walkDepth()` | 16 |
| 5098 | `_noteHit()` | 17 |
| 5115 | `_deathFeedback()` | 43 |
| 5158 | `_updateReplayCam()` | 33 |
| 5191 | `_updatePlayer()` | 368 |
| 5559 | `_updatePickups()` | 148 |
| 5707 | `_wpnMode()` | 5 |
| 5712 | `_botWeapon()` | 10 |
| 5722 | `_municaoInfinita()` | 1 |
| 5723 | `_pickupAllowed()` | 7 |
| 5730 | `_grabPickup()` | 35 |
| 5765 | `_assentarNoChao()` | 11 |
| 5776 | `_dropWeapon()` | 18 |
| 5794 | `_sumirDrop()` | 36 |
| 5830 | `_spawnY()` | 3 |
| 5833 | `_spawnYaw()` | 5 |
| 5838 | `_pickSpawn()` | 23 |
| 5861 | `_respawnPlayer()` | 30 |
| 5891 | `_losClear()` | 18 |
| 5909 | `_botCall()` | 37 |
| 5946 | `_teamMarkTex()` | 23 |
| 5969 | `_makeTeamMark()` | 14 |
| 5983 | `_updateTeamMark()` | 7 |
| 5990 | `_botEye()` | 1 |
| 5991 | `_enemyOf()` | 8 |
| 5999 | `_duelToken()` | 20 |
| 6019 | `_updateBot()` | 814 |
| 6833 | `_flushTraining()` | 13 |
| 6846 | `_updateBotNN()` | 71 |
| 6917 | `_botShootNN()` | 46 |
| 6963 | `_radarFoot()` | 38 |
| 7001 | `_updateRadar()` | 64 |
| 7065 | `_banner()` | 26 |
| 7091 | `_resultadoDaRodada()` | 4 |
| 7095 | `_showScoreboard()` | 49 |
| 7144 | `_updateWeaponHud()` | 35 |
| 7179 | `_updateHud()` | 80 |
| 7259 | `update()` | 79 |
| 7338 | `dispose()` | 45 |

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
