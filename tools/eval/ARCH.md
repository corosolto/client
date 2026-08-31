# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.175 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7289 | 273 |
| `public/js/main.js` | 2814 | 259 |
| `public/js/glbchars.js` | 969 | 68 |
| `public/js/characters.js` | 1169 | 41 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 357 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3168 linhas (43% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 814 | 5931 | `_updateBot()` | ⚠️ candidato a extração |
| 552 | 613 | `constructor()` | 🔴 append-only |
| 360 | 5111 | `_updatePlayer()` | ⚠️ candidato a extração |
| 250 | 2322 | `_resetPositions()` |  |
| 241 | 1262 | `_buildViewModels()` |  |
| 148 | 5471 | `_updatePickups()` |  |
| 133 | 4595 | `_botCtf()` |  |
| 115 | 1940 | `_touchControls()` |  |
| 86 | 3126 | `_tryShoot()` |  |
| 84 | 4326 | `_initCTF()` |  |
| 80 | 7091 | `_updateHud()` |  |
| 79 | 3518 | `_dmgArc()` |  |
| 79 | 7171 | `update()` | 🔴 append-only |
| 76 | 4734 | `_updateCtfHud()` |  |
| 71 | 6758 | `_updateBotNN()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `325–328` `362–456` `483–504` `1262–1660` `2884–2895` `2977–3061` `3080–3277` `3739–3763` `3811–3875` `3943–3959` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `165–168` `219–219` `245–256` `546–557` `3379–3487` `4270–4325` `4491–4727` `4810–4832` `5111–5470` `5803–5820` `5902–6744` | — |
| **MAPAS / MUNDO** | `1208–1261` `2322–2571` `4326–4468` `5471–5618` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1661–1670` `1785–1816` `2810–2822` `3764–3802` `3886–3942` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1165–1207` `2764–2788` `2804–2809` `2823–2833` `3518–3659` `3675–3738` `6913–6976` `7007–7055` `7091–7170` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7171–7249 · `_dom()` 1165–1207 · `constructor()` 613–1164

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3801 de 7289 linhas (52%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 43 | `REPLAY_CAM` | 3 |
| 52 | `VMLAB` | 8 |
| 60 | `VM_MAT_LEGACY` | 4 |
| 66 | `DROP_TTL` | 8 |
| 74 | `ROUNDS_MAX` | 27 |
| 104 | `CTF_CLOCK_SHOW` | 4 |
| 108 | `KILLS_PER_PLAYER` | 7 |
| 115 | `PACE` | 33 |
| 148 | `PAUSE_ARM_MS` | 9 |
| 158 | `confirmGate` | 7 |
| 169 | `BOT_AIM_PITCH` | 4 |
| 173 | `BOT_DMG_PLAYER` | 21 |
| 194 | `BOT_FAIR` | 5 |
| 199 | `BOT_MOVE2` | 15 |
| 223 | `BOT_FOCUS_MIN` | 22 |
| 249 | `BOT_TOKEN_REST` | 7 |
| 257 | `MOVE_MUL` | 6 |
| 264 | `MOVE2` | 4 |
| 268 | `STEP_H` | 3 |
| 275 | `MANTLE_APOIO` | 4 |
| 279 | `MANTLE_GRID` | 5 |
| 284 | `RACK_OLD` | 4 |
| 288 | `RACK_RETA` | 25 |
| 314 | `RADIO` | 5 |
| 320 | `MK_LABELS` | 5 |
| 325 | `GUNFEEL` | 4 |
| 331 | `TRACER_STYLE` | 3 |
| 335 | `D2R` | 4 |
| 339 | `DMG_FALLOFF` | 5 |
| 344 | `HS_MUL` | 3 |
| 347 | `BALL_CLASS` | 15 |
| 362 | `STATIC_CLASS` | 75 |
| 438 | `VM_KNOB` | 19 |
| 459 | `vmFovForAspect` | 24 |
| 483 | `VM_OFF` | 22 |
| 505 | `vmOffY` | 35 |
| 540 | `VMP` | 6 |
| 546 | `BOT_SKILLS` | 11 |
| 558 | `diffKey` | 4 |
| 563 | `rollBotSkill` | 7 |
| 570 | `botTier` | 4 |
| 574 | `_cyclePool` | 4 |
| 578 | `_rosterPool` | 12 |
| 590 | `pickMatchRoster` | 10 |
| 600 | `BOT_WEAPON_POOL` | 5 |
| 605 | `pickMatchWeapons` | 7 |
| 613 | `constructor()` | 552 |
| 1165 | `_dom()` | 43 |
| 1208 | `_buildEnv()` | 54 |
| 1262 | `_buildViewModels()` | 241 |
| 1503 | `_vmFrame` | 158 |
| 1661 | `_makePuffTexture()` | 10 |
| 1671 | `_makeBloodTex()` | 19 |
| 1690 | `_makeBloodPoolTex()` | 21 |
| 1711 | `_bloodDecal()` | 16 |
| 1727 | `_makeBloodFx()` | 20 |
| 1747 | `_bloodSpatter()` | 18 |
| 1765 | `_bloodPoolAt()` | 6 |
| 1771 | `_updateBlood()` | 14 |
| 1785 | `_makeFlashTex()` | 22 |
| 1807 | `_makeFlashCoreTex()` | 10 |
| 1817 | `_input()` | 2 |
| 1819 | `_kd` | 42 |
| 1861 | `_ku` | 4 |
| 1865 | `_md` | 34 |
| 1899 | `_mu` | 7 |
| 1906 | `_mm` | 15 |
| 1921 | `_cc` | 1 |
| 1922 | `_blur` | 1 |
| 1923 | `_plc` | 17 |
| 1940 | `_touchControls()` | 115 |
| 2055 | `_aimAssist()` | 28 |
| 2083 | `_requestLock()` | 24 |
| 2107 | `_travaAtalhos()` | 4 |
| 2111 | `_soltaAtalhos()` | 3 |
| 2114 | `_acceptInput()` | 8 |
| 2122 | `_pauseBackdrop()` | 7 |
| 2129 | `_radioShow()` | 6 |
| 2135 | `_radioUi()` | 8 |
| 2143 | `_radioPick()` | 20 |
| 2163 | `_abilityNotice()` | 10 |
| 2173 | `_resetSliceAbilities()` | 9 |
| 2182 | `_stackTrace()` | 28 |
| 2210 | `_updateMotocaCharge()` | 10 |
| 2220 | `_recordRoutePoint()` | 11 |
| 2231 | `_routePing()` | 23 |
| 2254 | `_tickRoutePings()` | 12 |
| 2266 | `_objectiveInteractionMultiplier()` | 14 |
| 2280 | `start()` | 4 |
| 2284 | `_startRound()` | 38 |
| 2322 | `_resetPositions()` | 250 |
| 2572 | `_checkCtfAlvo()` | 13 |
| 2585 | `_checkPace()` | 13 |
| 2598 | `_endRound()` | 37 |
| 2635 | `_fimDaPartida()` | 7 |
| 2642 | `_endMatch()` | 58 |
| 2700 | `_ensureDolly()` | 41 |
| 2741 | `_tickDolly()` | 23 |
| 2764 | `setPaused()` | 25 |
| 2789 | `_now()` | 3 |
| 2792 | `pauseArmed()` | 1 |
| 2793 | `_syncPauseArm()` | 7 |
| 2800 | `resume()` | 4 |
| 2804 | `applySettings()` | 6 |
| 2810 | `_applyQuality()` | 13 |
| 2823 | `onResize()` | 11 |
| 2834 | `_switchTeam()` | 50 |
| 2884 | `_applyVmVisibility()` | 12 |
| 2896 | `_vmlabEnsure()` | 14 |
| 2910 | `_vmlabFrame()` | 28 |
| 2938 | `_tuneGet()` | 15 |
| 2953 | `_tune()` | 23 |
| 2976 | `_fxSet()` | 1 |
| 2977 | `_switchWeapon()` | 33 |
| 3010 | `_deploySfx()` | 7 |
| 3017 | `_scope()` | 17 |
| 3034 | `_zoomFov()` | 8 |
| 3042 | `_reloading()` | 1 |
| 3043 | `_startReload()` | 19 |
| 3062 | `_reloadLayers()` | 18 |
| 3080 | `_installRecoil()` | 33 |
| 3113 | `_shotRecoil()` | 13 |
| 3126 | `_tryShoot()` | 86 |
| 3212 | `_meleeHit()` | 12 |
| 3224 | `_fireHitscan()` | 54 |
| 3278 | `_surfaceOf()` | 27 |
| 3305 | `_fleshImpact()` | 35 |
| 3340 | `_fxVoice()` | 9 |
| 3349 | `_impactSfx()` | 14 |
| 3363 | `_tintFx()` | 16 |
| 3379 | `_damage()` | 40 |
| 3419 | `_kill()` | 69 |
| 3488 | `_checkArenaWin()` | 30 |
| 3518 | `_dmgArc()` | 79 |
| 3597 | `_mkBanner()` | 9 |
| 3606 | `_hitmarker()` | 15 |
| 3621 | `_dmgNumber()` | 20 |
| 3641 | `_feed()` | 19 |
| 3660 | `_skullIcon()` | 6 |
| 3666 | `_killfeedWeaponIcon()` | 9 |
| 3675 | `_wpnIcon()` | 64 |
| 3739 | `_tracer()` | 25 |
| 3764 | `_puff()` | 39 |
| 3803 | `_holeDecalMat()` | 8 |
| 3811 | `_flash()` | 56 |
| 3867 | `_muzzleWorld()` | 9 |
| 3876 | `_updateDoors()` | 10 |
| 3886 | `_updateFx()` | 57 |
| 3943 | `_ejectCasing()` | 17 |
| 3960 | `_makeCtfFlagTex()` | 23 |
| 3983 | `_paintFlagSymbol()` | 9 |
| 3992 | `_flagTexFor()` | 26 |
| 4018 | `_legadoSimbolo()` | 8 |
| 4026 | `_loadCtfSymbols()` | 22 |
| 4048 | `_makeCtfZoneTex()` | 31 |
| 4079 | `_makeSmokeTex()` | 8 |
| 4087 | `_updateSmokeHud()` | 6 |
| 4093 | `_spawnGrenade()` | 11 |
| 4104 | `_throwSmoke()` | 8 |
| 4112 | `_throwFrag()` | 10 |
| 4122 | `_explodeFrag()` | 38 |
| 4160 | `_corDaFumaca()` | 15 |
| 4175 | `_popSmoke()` | 19 |
| 4194 | `_updateGrenades()` | 27 |
| 4221 | `_teamColor()` | 15 |
| 4236 | `_teamInk()` | 7 |
| 4243 | `_factionOf()` | 1 |
| 4244 | `_voiceKey()` | 3 |
| 4247 | `_teamName()` | 1 |
| 4248 | `_teamTag()` | 6 |
| 4254 | `_plaqueta()` | 13 |
| 4267 | `_mirror()` | 3 |
| 4270 | `_botSeparation()` | 56 |
| 4326 | `_initCTF()` | 84 |
| 4410 | `_updateCTF()` | 59 |
| 4469 | `_ctfWin()` | 22 |
| 4491 | `_freeYaw()` | 25 |
| 4516 | `_pullString()` | 23 |
| 4539 | `_walkReach()` | 18 |
| 4557 | `_wpComp()` | 16 |
| 4573 | `_findPathLocal()` | 22 |
| 4595 | `_botCtf()` | 133 |
| 4728 | `_hideCtfHud()` | 6 |
| 4734 | `_updateCtfHud()` | 76 |
| 4810 | `_collide()` | 23 |
| 4833 | `_collideRot()` | 22 |
| 4855 | `_mantleAlcance()` | 50 |
| 4905 | `_mantleAlcancavel()` | 12 |
| 4917 | `_mantleTarget()` | 35 |
| 4952 | `_freeSpot()` | 30 |
| 4982 | `_retaAndavel()` | 20 |
| 5002 | `_walkDepth()` | 16 |
| 5018 | `_noteHit()` | 17 |
| 5035 | `_deathFeedback()` | 43 |
| 5078 | `_updateReplayCam()` | 33 |
| 5111 | `_updatePlayer()` | 360 |
| 5471 | `_updatePickups()` | 148 |
| 5619 | `_wpnMode()` | 5 |
| 5624 | `_botWeapon()` | 10 |
| 5634 | `_municaoInfinita()` | 1 |
| 5635 | `_pickupAllowed()` | 7 |
| 5642 | `_grabPickup()` | 35 |
| 5677 | `_assentarNoChao()` | 11 |
| 5688 | `_dropWeapon()` | 18 |
| 5706 | `_sumirDrop()` | 36 |
| 5742 | `_spawnY()` | 3 |
| 5745 | `_spawnYaw()` | 5 |
| 5750 | `_pickSpawn()` | 23 |
| 5773 | `_respawnPlayer()` | 30 |
| 5803 | `_losClear()` | 18 |
| 5821 | `_botCall()` | 37 |
| 5858 | `_teamMarkTex()` | 23 |
| 5881 | `_makeTeamMark()` | 14 |
| 5895 | `_updateTeamMark()` | 7 |
| 5902 | `_botEye()` | 1 |
| 5903 | `_enemyOf()` | 8 |
| 5911 | `_duelToken()` | 20 |
| 5931 | `_updateBot()` | 814 |
| 6745 | `_flushTraining()` | 13 |
| 6758 | `_updateBotNN()` | 71 |
| 6829 | `_botShootNN()` | 46 |
| 6875 | `_radarFoot()` | 38 |
| 6913 | `_updateRadar()` | 64 |
| 6977 | `_banner()` | 26 |
| 7003 | `_resultadoDaRodada()` | 4 |
| 7007 | `_showScoreboard()` | 49 |
| 7056 | `_updateWeaponHud()` | 35 |
| 7091 | `_updateHud()` | 80 |
| 7171 | `update()` | 79 |
| 7250 | `dispose()` | 39 |

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
