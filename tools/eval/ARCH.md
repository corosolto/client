# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.175 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7261 | 273 |
| `public/js/main.js` | 2813 | 259 |
| `public/js/glbchars.js` | 969 | 68 |
| `public/js/characters.js` | 1169 | 41 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 357 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3152 linhas (43% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 814 | 5903 | `_updateBot()` | ⚠️ candidato a extração |
| 547 | 612 | `constructor()` | 🔴 append-only |
| 351 | 5092 | `_updatePlayer()` | ⚠️ candidato a extração |
| 249 | 2316 | `_resetPositions()` |  |
| 241 | 1256 | `_buildViewModels()` |  |
| 148 | 5443 | `_updatePickups()` |  |
| 133 | 4576 | `_botCtf()` |  |
| 115 | 1934 | `_touchControls()` |  |
| 85 | 3108 | `_tryShoot()` |  |
| 84 | 4307 | `_initCTF()` |  |
| 80 | 7063 | `_updateHud()` |  |
| 79 | 3499 | `_dmgArc()` |  |
| 79 | 7143 | `update()` | 🔴 append-only |
| 76 | 4715 | `_updateCtfHud()` |  |
| 71 | 6730 | `_updateBotNN()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `324–327` `361–455` `482–503` `1256–1654` `2873–2878` `2960–3043` `3062–3258` `3720–3744` `3792–3856` `3924–3940` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `164–167` `218–218` `244–255` `545–556` `3360–3468` `4251–4306` `4472–4708` `4791–4813` `5092–5442` `5775–5792` `5874–6716` | — |
| **MAPAS / MUNDO** | `1202–1255` `2316–2564` `4307–4449` `5443–5590` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1655–1664` `1779–1810` `2803–2815` `3745–3783` `3867–3923` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1159–1201` `2757–2781` `2797–2802` `2816–2822` `3499–3640` `3656–3719` `6885–6948` `6979–7027` `7063–7142` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7143–7221 · `_dom()` 1159–1201 · `constructor()` 612–1158

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3779 de 7261 linhas (52%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 589 | `pickMatchRoster` | 10 |
| 599 | `BOT_WEAPON_POOL` | 5 |
| 604 | `pickMatchWeapons` | 7 |
| 612 | `constructor()` | 547 |
| 1159 | `_dom()` | 43 |
| 1202 | `_buildEnv()` | 54 |
| 1256 | `_buildViewModels()` | 241 |
| 1497 | `_vmFrame` | 158 |
| 1655 | `_makePuffTexture()` | 10 |
| 1665 | `_makeBloodTex()` | 19 |
| 1684 | `_makeBloodPoolTex()` | 21 |
| 1705 | `_bloodDecal()` | 16 |
| 1721 | `_makeBloodFx()` | 20 |
| 1741 | `_bloodSpatter()` | 18 |
| 1759 | `_bloodPoolAt()` | 6 |
| 1765 | `_updateBlood()` | 14 |
| 1779 | `_makeFlashTex()` | 22 |
| 1801 | `_makeFlashCoreTex()` | 10 |
| 1811 | `_input()` | 2 |
| 1813 | `_kd` | 42 |
| 1855 | `_ku` | 4 |
| 1859 | `_md` | 34 |
| 1893 | `_mu` | 7 |
| 1900 | `_mm` | 15 |
| 1915 | `_cc` | 1 |
| 1916 | `_blur` | 1 |
| 1917 | `_plc` | 17 |
| 1934 | `_touchControls()` | 115 |
| 2049 | `_aimAssist()` | 28 |
| 2077 | `_requestLock()` | 24 |
| 2101 | `_travaAtalhos()` | 4 |
| 2105 | `_soltaAtalhos()` | 3 |
| 2108 | `_acceptInput()` | 8 |
| 2116 | `_pauseBackdrop()` | 7 |
| 2123 | `_radioShow()` | 6 |
| 2129 | `_radioUi()` | 8 |
| 2137 | `_radioPick()` | 20 |
| 2157 | `_abilityNotice()` | 10 |
| 2167 | `_resetSliceAbilities()` | 9 |
| 2176 | `_stackTrace()` | 28 |
| 2204 | `_updateMotocaCharge()` | 10 |
| 2214 | `_recordRoutePoint()` | 11 |
| 2225 | `_routePing()` | 23 |
| 2248 | `_tickRoutePings()` | 12 |
| 2260 | `_objectiveInteractionMultiplier()` | 14 |
| 2274 | `start()` | 4 |
| 2278 | `_startRound()` | 38 |
| 2316 | `_resetPositions()` | 249 |
| 2565 | `_checkCtfAlvo()` | 13 |
| 2578 | `_checkPace()` | 13 |
| 2591 | `_endRound()` | 37 |
| 2628 | `_fimDaPartida()` | 7 |
| 2635 | `_endMatch()` | 58 |
| 2693 | `_ensureDolly()` | 41 |
| 2734 | `_tickDolly()` | 23 |
| 2757 | `setPaused()` | 25 |
| 2782 | `_now()` | 3 |
| 2785 | `pauseArmed()` | 1 |
| 2786 | `_syncPauseArm()` | 7 |
| 2793 | `resume()` | 4 |
| 2797 | `applySettings()` | 6 |
| 2803 | `_applyQuality()` | 13 |
| 2816 | `onResize()` | 7 |
| 2823 | `_switchTeam()` | 50 |
| 2873 | `_applyVmVisibility()` | 6 |
| 2879 | `_vmlabEnsure()` | 14 |
| 2893 | `_vmlabFrame()` | 28 |
| 2921 | `_tuneGet()` | 15 |
| 2936 | `_tune()` | 23 |
| 2959 | `_fxSet()` | 1 |
| 2960 | `_switchWeapon()` | 32 |
| 2992 | `_deploySfx()` | 7 |
| 2999 | `_scope()` | 17 |
| 3016 | `_zoomFov()` | 8 |
| 3024 | `_reloading()` | 1 |
| 3025 | `_startReload()` | 19 |
| 3044 | `_reloadLayers()` | 18 |
| 3062 | `_installRecoil()` | 33 |
| 3095 | `_shotRecoil()` | 13 |
| 3108 | `_tryShoot()` | 85 |
| 3193 | `_meleeHit()` | 12 |
| 3205 | `_fireHitscan()` | 54 |
| 3259 | `_surfaceOf()` | 27 |
| 3286 | `_fleshImpact()` | 35 |
| 3321 | `_fxVoice()` | 9 |
| 3330 | `_impactSfx()` | 14 |
| 3344 | `_tintFx()` | 16 |
| 3360 | `_damage()` | 40 |
| 3400 | `_kill()` | 69 |
| 3469 | `_checkArenaWin()` | 30 |
| 3499 | `_dmgArc()` | 79 |
| 3578 | `_mkBanner()` | 9 |
| 3587 | `_hitmarker()` | 15 |
| 3602 | `_dmgNumber()` | 20 |
| 3622 | `_feed()` | 19 |
| 3641 | `_skullIcon()` | 6 |
| 3647 | `_killfeedWeaponIcon()` | 9 |
| 3656 | `_wpnIcon()` | 64 |
| 3720 | `_tracer()` | 25 |
| 3745 | `_puff()` | 39 |
| 3784 | `_holeDecalMat()` | 8 |
| 3792 | `_flash()` | 56 |
| 3848 | `_muzzleWorld()` | 9 |
| 3857 | `_updateDoors()` | 10 |
| 3867 | `_updateFx()` | 57 |
| 3924 | `_ejectCasing()` | 17 |
| 3941 | `_makeCtfFlagTex()` | 23 |
| 3964 | `_paintFlagSymbol()` | 9 |
| 3973 | `_flagTexFor()` | 26 |
| 3999 | `_legadoSimbolo()` | 8 |
| 4007 | `_loadCtfSymbols()` | 22 |
| 4029 | `_makeCtfZoneTex()` | 31 |
| 4060 | `_makeSmokeTex()` | 8 |
| 4068 | `_updateSmokeHud()` | 6 |
| 4074 | `_spawnGrenade()` | 11 |
| 4085 | `_throwSmoke()` | 8 |
| 4093 | `_throwFrag()` | 10 |
| 4103 | `_explodeFrag()` | 38 |
| 4141 | `_corDaFumaca()` | 15 |
| 4156 | `_popSmoke()` | 19 |
| 4175 | `_updateGrenades()` | 27 |
| 4202 | `_teamColor()` | 15 |
| 4217 | `_teamInk()` | 7 |
| 4224 | `_factionOf()` | 1 |
| 4225 | `_voiceKey()` | 3 |
| 4228 | `_teamName()` | 1 |
| 4229 | `_teamTag()` | 6 |
| 4235 | `_plaqueta()` | 13 |
| 4248 | `_mirror()` | 3 |
| 4251 | `_botSeparation()` | 56 |
| 4307 | `_initCTF()` | 84 |
| 4391 | `_updateCTF()` | 59 |
| 4450 | `_ctfWin()` | 22 |
| 4472 | `_freeYaw()` | 25 |
| 4497 | `_pullString()` | 23 |
| 4520 | `_walkReach()` | 18 |
| 4538 | `_wpComp()` | 16 |
| 4554 | `_findPathLocal()` | 22 |
| 4576 | `_botCtf()` | 133 |
| 4709 | `_hideCtfHud()` | 6 |
| 4715 | `_updateCtfHud()` | 76 |
| 4791 | `_collide()` | 23 |
| 4814 | `_collideRot()` | 22 |
| 4836 | `_mantleAlcance()` | 50 |
| 4886 | `_mantleAlcancavel()` | 12 |
| 4898 | `_mantleTarget()` | 35 |
| 4933 | `_freeSpot()` | 30 |
| 4963 | `_retaAndavel()` | 20 |
| 4983 | `_walkDepth()` | 16 |
| 4999 | `_noteHit()` | 17 |
| 5016 | `_deathFeedback()` | 43 |
| 5059 | `_updateReplayCam()` | 33 |
| 5092 | `_updatePlayer()` | 351 |
| 5443 | `_updatePickups()` | 148 |
| 5591 | `_wpnMode()` | 5 |
| 5596 | `_botWeapon()` | 10 |
| 5606 | `_municaoInfinita()` | 1 |
| 5607 | `_pickupAllowed()` | 7 |
| 5614 | `_grabPickup()` | 35 |
| 5649 | `_assentarNoChao()` | 11 |
| 5660 | `_dropWeapon()` | 18 |
| 5678 | `_sumirDrop()` | 36 |
| 5714 | `_spawnY()` | 3 |
| 5717 | `_spawnYaw()` | 5 |
| 5722 | `_pickSpawn()` | 23 |
| 5745 | `_respawnPlayer()` | 30 |
| 5775 | `_losClear()` | 18 |
| 5793 | `_botCall()` | 37 |
| 5830 | `_teamMarkTex()` | 23 |
| 5853 | `_makeTeamMark()` | 14 |
| 5867 | `_updateTeamMark()` | 7 |
| 5874 | `_botEye()` | 1 |
| 5875 | `_enemyOf()` | 8 |
| 5883 | `_duelToken()` | 20 |
| 5903 | `_updateBot()` | 814 |
| 6717 | `_flushTraining()` | 13 |
| 6730 | `_updateBotNN()` | 71 |
| 6801 | `_botShootNN()` | 46 |
| 6847 | `_radarFoot()` | 38 |
| 6885 | `_updateRadar()` | 64 |
| 6949 | `_banner()` | 26 |
| 6975 | `_resultadoDaRodada()` | 4 |
| 6979 | `_showScoreboard()` | 49 |
| 7028 | `_updateWeaponHud()` | 35 |
| 7063 | `_updateHud()` | 80 |
| 7143 | `update()` | 79 |
| 7222 | `dispose()` | 39 |

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
