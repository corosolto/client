# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.172 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7245 | 271 |
| `public/js/main.js` | 2795 | 259 |
| `public/js/glbchars.js` | 961 | 68 |
| `public/js/characters.js` | 1169 | 41 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3148 linhas (43% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 814 | 5887 | `_updateBot()` | ⚠️ candidato a extração |
| 543 | 598 | `constructor()` | 🔴 append-only |
| 351 | 5074 | `_updatePlayer()` | ⚠️ candidato a extração |
| 249 | 2298 | `_resetPositions()` |  |
| 241 | 1238 | `_buildViewModels()` |  |
| 148 | 5425 | `_updatePickups()` |  |
| 133 | 4558 | `_botCtf()` |  |
| 115 | 1916 | `_touchControls()` |  |
| 85 | 3090 | `_tryShoot()` |  |
| 84 | 4289 | `_initCTF()` |  |
| 80 | 7047 | `_updateHud()` |  |
| 79 | 3481 | `_dmgArc()` |  |
| 79 | 7127 | `update()` | 🔴 append-only |
| 76 | 4697 | `_updateCtfHud()` |  |
| 71 | 6714 | `_updateBotNN()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `324–327` `361–455` `482–503` `1238–1636` `2855–2860` `2942–3025` `3044–3240` `3702–3726` `3774–3838` `3906–3922` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `164–167` `218–218` `244–255` `545–556` `3342–3450` `4233–4288` `4454–4690` `4773–4795` `5074–5424` `5759–5776` `5858–6700` | — |
| **MAPAS / MUNDO** | `1184–1237` `2298–2546` `4289–4431` `5425–5572` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1637–1646` `1761–1792` `2785–2797` `3727–3765` `3849–3905` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1141–1183` `2739–2763` `2779–2784` `2798–2804` `3481–3622` `3638–3701` `6869–6932` `6963–7011` `7047–7126` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7127–7205 · `_dom()` 1141–1183 · `constructor()` 598–1140

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3779 de 7245 linhas (52%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 42 | `REPLAY_CAM` | 3 |
| 51 | `VMLAB` | 8 |
| 59 | `VM_MAT_LEGACY` | 4 |
| 65 | `DROP_TTL` | 8 |
| 73 | `ROUNDS_MAX` | 27 |
| 103 | `CTF_CLOCK_SHOW` | 4 |
| 107 | `KILLS_PER_PLAYER` | 7 |
| 114 | `PACE` | 33 |
| 147 | `PAUSE_ARM_MS` | 9 |
| 157 | `confirmGate` | 7 |
| 168 | `BOT_AIM_PITCH` | 4 |
| 172 | `BOT_DMG_PLAYER` | 21 |
| 193 | `BOT_FAIR` | 5 |
| 198 | `BOT_MOVE2` | 15 |
| 222 | `BOT_FOCUS_MIN` | 22 |
| 248 | `BOT_TOKEN_REST` | 7 |
| 256 | `MOVE_MUL` | 6 |
| 263 | `MOVE2` | 4 |
| 267 | `STEP_H` | 3 |
| 274 | `MANTLE_APOIO` | 4 |
| 278 | `MANTLE_GRID` | 5 |
| 283 | `RACK_OLD` | 4 |
| 287 | `RACK_RETA` | 25 |
| 313 | `RADIO` | 5 |
| 319 | `MK_LABELS` | 5 |
| 324 | `GUNFEEL` | 4 |
| 330 | `TRACER_STYLE` | 3 |
| 334 | `D2R` | 4 |
| 338 | `DMG_FALLOFF` | 5 |
| 343 | `HS_MUL` | 3 |
| 346 | `BALL_CLASS` | 15 |
| 361 | `STATIC_CLASS` | 75 |
| 437 | `VM_KNOB` | 19 |
| 458 | `vmFovForAspect` | 24 |
| 482 | `VM_OFF` | 22 |
| 504 | `vmOffY` | 35 |
| 539 | `VMP` | 6 |
| 545 | `BOT_SKILLS` | 11 |
| 557 | `diffKey` | 4 |
| 562 | `rollBotSkill` | 7 |
| 569 | `botTier` | 4 |
| 573 | `_cyclePool` | 4 |
| 577 | `_rosterPool` | 12 |
| 589 | `pickMatchRoster` | 8 |
| 598 | `constructor()` | 543 |
| 1141 | `_dom()` | 43 |
| 1184 | `_buildEnv()` | 54 |
| 1238 | `_buildViewModels()` | 241 |
| 1479 | `_vmFrame` | 158 |
| 1637 | `_makePuffTexture()` | 10 |
| 1647 | `_makeBloodTex()` | 19 |
| 1666 | `_makeBloodPoolTex()` | 21 |
| 1687 | `_bloodDecal()` | 16 |
| 1703 | `_makeBloodFx()` | 20 |
| 1723 | `_bloodSpatter()` | 18 |
| 1741 | `_bloodPoolAt()` | 6 |
| 1747 | `_updateBlood()` | 14 |
| 1761 | `_makeFlashTex()` | 22 |
| 1783 | `_makeFlashCoreTex()` | 10 |
| 1793 | `_input()` | 2 |
| 1795 | `_kd` | 42 |
| 1837 | `_ku` | 4 |
| 1841 | `_md` | 34 |
| 1875 | `_mu` | 7 |
| 1882 | `_mm` | 15 |
| 1897 | `_cc` | 1 |
| 1898 | `_blur` | 1 |
| 1899 | `_plc` | 17 |
| 1916 | `_touchControls()` | 115 |
| 2031 | `_aimAssist()` | 28 |
| 2059 | `_requestLock()` | 24 |
| 2083 | `_travaAtalhos()` | 4 |
| 2087 | `_soltaAtalhos()` | 3 |
| 2090 | `_acceptInput()` | 8 |
| 2098 | `_pauseBackdrop()` | 7 |
| 2105 | `_radioShow()` | 6 |
| 2111 | `_radioUi()` | 8 |
| 2119 | `_radioPick()` | 20 |
| 2139 | `_abilityNotice()` | 10 |
| 2149 | `_resetSliceAbilities()` | 9 |
| 2158 | `_stackTrace()` | 28 |
| 2186 | `_updateMotocaCharge()` | 10 |
| 2196 | `_recordRoutePoint()` | 11 |
| 2207 | `_routePing()` | 23 |
| 2230 | `_tickRoutePings()` | 12 |
| 2242 | `_objectiveInteractionMultiplier()` | 14 |
| 2256 | `start()` | 4 |
| 2260 | `_startRound()` | 38 |
| 2298 | `_resetPositions()` | 249 |
| 2547 | `_checkCtfAlvo()` | 13 |
| 2560 | `_checkPace()` | 13 |
| 2573 | `_endRound()` | 37 |
| 2610 | `_fimDaPartida()` | 7 |
| 2617 | `_endMatch()` | 58 |
| 2675 | `_ensureDolly()` | 41 |
| 2716 | `_tickDolly()` | 23 |
| 2739 | `setPaused()` | 25 |
| 2764 | `_now()` | 3 |
| 2767 | `pauseArmed()` | 1 |
| 2768 | `_syncPauseArm()` | 7 |
| 2775 | `resume()` | 4 |
| 2779 | `applySettings()` | 6 |
| 2785 | `_applyQuality()` | 13 |
| 2798 | `onResize()` | 7 |
| 2805 | `_switchTeam()` | 50 |
| 2855 | `_applyVmVisibility()` | 6 |
| 2861 | `_vmlabEnsure()` | 14 |
| 2875 | `_vmlabFrame()` | 28 |
| 2903 | `_tuneGet()` | 15 |
| 2918 | `_tune()` | 23 |
| 2941 | `_fxSet()` | 1 |
| 2942 | `_switchWeapon()` | 32 |
| 2974 | `_deploySfx()` | 7 |
| 2981 | `_scope()` | 17 |
| 2998 | `_zoomFov()` | 8 |
| 3006 | `_reloading()` | 1 |
| 3007 | `_startReload()` | 19 |
| 3026 | `_reloadLayers()` | 18 |
| 3044 | `_installRecoil()` | 33 |
| 3077 | `_shotRecoil()` | 13 |
| 3090 | `_tryShoot()` | 85 |
| 3175 | `_meleeHit()` | 12 |
| 3187 | `_fireHitscan()` | 54 |
| 3241 | `_surfaceOf()` | 27 |
| 3268 | `_fleshImpact()` | 35 |
| 3303 | `_fxVoice()` | 9 |
| 3312 | `_impactSfx()` | 14 |
| 3326 | `_tintFx()` | 16 |
| 3342 | `_damage()` | 40 |
| 3382 | `_kill()` | 69 |
| 3451 | `_checkArenaWin()` | 30 |
| 3481 | `_dmgArc()` | 79 |
| 3560 | `_mkBanner()` | 9 |
| 3569 | `_hitmarker()` | 15 |
| 3584 | `_dmgNumber()` | 20 |
| 3604 | `_feed()` | 19 |
| 3623 | `_skullIcon()` | 6 |
| 3629 | `_killfeedWeaponIcon()` | 9 |
| 3638 | `_wpnIcon()` | 64 |
| 3702 | `_tracer()` | 25 |
| 3727 | `_puff()` | 39 |
| 3766 | `_holeDecalMat()` | 8 |
| 3774 | `_flash()` | 56 |
| 3830 | `_muzzleWorld()` | 9 |
| 3839 | `_updateDoors()` | 10 |
| 3849 | `_updateFx()` | 57 |
| 3906 | `_ejectCasing()` | 17 |
| 3923 | `_makeCtfFlagTex()` | 23 |
| 3946 | `_paintFlagSymbol()` | 9 |
| 3955 | `_flagTexFor()` | 26 |
| 3981 | `_legadoSimbolo()` | 8 |
| 3989 | `_loadCtfSymbols()` | 22 |
| 4011 | `_makeCtfZoneTex()` | 31 |
| 4042 | `_makeSmokeTex()` | 8 |
| 4050 | `_updateSmokeHud()` | 6 |
| 4056 | `_spawnGrenade()` | 11 |
| 4067 | `_throwSmoke()` | 8 |
| 4075 | `_throwFrag()` | 10 |
| 4085 | `_explodeFrag()` | 38 |
| 4123 | `_corDaFumaca()` | 15 |
| 4138 | `_popSmoke()` | 19 |
| 4157 | `_updateGrenades()` | 27 |
| 4184 | `_teamColor()` | 15 |
| 4199 | `_teamInk()` | 7 |
| 4206 | `_factionOf()` | 1 |
| 4207 | `_voiceKey()` | 3 |
| 4210 | `_teamName()` | 1 |
| 4211 | `_teamTag()` | 6 |
| 4217 | `_plaqueta()` | 13 |
| 4230 | `_mirror()` | 3 |
| 4233 | `_botSeparation()` | 56 |
| 4289 | `_initCTF()` | 84 |
| 4373 | `_updateCTF()` | 59 |
| 4432 | `_ctfWin()` | 22 |
| 4454 | `_freeYaw()` | 25 |
| 4479 | `_pullString()` | 23 |
| 4502 | `_walkReach()` | 18 |
| 4520 | `_wpComp()` | 16 |
| 4536 | `_findPathLocal()` | 22 |
| 4558 | `_botCtf()` | 133 |
| 4691 | `_hideCtfHud()` | 6 |
| 4697 | `_updateCtfHud()` | 76 |
| 4773 | `_collide()` | 23 |
| 4796 | `_collideRot()` | 22 |
| 4818 | `_mantleAlcance()` | 50 |
| 4868 | `_mantleAlcancavel()` | 12 |
| 4880 | `_mantleTarget()` | 35 |
| 4915 | `_freeSpot()` | 30 |
| 4945 | `_retaAndavel()` | 20 |
| 4965 | `_walkDepth()` | 16 |
| 4981 | `_noteHit()` | 17 |
| 4998 | `_deathFeedback()` | 43 |
| 5041 | `_updateReplayCam()` | 33 |
| 5074 | `_updatePlayer()` | 351 |
| 5425 | `_updatePickups()` | 148 |
| 5573 | `_wpnMode()` | 5 |
| 5578 | `_botWeapon()` | 12 |
| 5590 | `_municaoInfinita()` | 1 |
| 5591 | `_pickupAllowed()` | 7 |
| 5598 | `_grabPickup()` | 35 |
| 5633 | `_assentarNoChao()` | 11 |
| 5644 | `_dropWeapon()` | 18 |
| 5662 | `_sumirDrop()` | 36 |
| 5698 | `_spawnY()` | 3 |
| 5701 | `_spawnYaw()` | 5 |
| 5706 | `_pickSpawn()` | 23 |
| 5729 | `_respawnPlayer()` | 30 |
| 5759 | `_losClear()` | 18 |
| 5777 | `_botCall()` | 37 |
| 5814 | `_teamMarkTex()` | 23 |
| 5837 | `_makeTeamMark()` | 14 |
| 5851 | `_updateTeamMark()` | 7 |
| 5858 | `_botEye()` | 1 |
| 5859 | `_enemyOf()` | 8 |
| 5867 | `_duelToken()` | 20 |
| 5887 | `_updateBot()` | 814 |
| 6701 | `_flushTraining()` | 13 |
| 6714 | `_updateBotNN()` | 71 |
| 6785 | `_botShootNN()` | 46 |
| 6831 | `_radarFoot()` | 38 |
| 6869 | `_updateRadar()` | 64 |
| 6933 | `_banner()` | 26 |
| 6959 | `_resultadoDaRodada()` | 4 |
| 6963 | `_showScoreboard()` | 49 |
| 7012 | `_updateWeaponHud()` | 35 |
| 7047 | `_updateHud()` | 80 |
| 7127 | `update()` | 79 |
| 7206 | `dispose()` | 39 |

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
