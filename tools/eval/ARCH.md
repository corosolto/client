# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.175 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7292 | 273 |
| `public/js/main.js` | 2814 | 259 |
| `public/js/glbchars.js` | 969 | 68 |
| `public/js/characters.js` | 1169 | 41 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 357 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3170 linhas (43% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 814 | 5933 | `_updateBot()` | ⚠️ candidato a extração |
| 561 | 613 | `constructor()` | 🔴 append-only |
| 354 | 5119 | `_updatePlayer()` | ⚠️ candidato a extração |
| 250 | 2331 | `_resetPositions()` |  |
| 241 | 1271 | `_buildViewModels()` |  |
| 148 | 5473 | `_updatePickups()` |  |
| 133 | 4602 | `_botCtf()` |  |
| 115 | 1949 | `_touchControls()` |  |
| 85 | 3134 | `_tryShoot()` |  |
| 84 | 4333 | `_initCTF()` |  |
| 80 | 7093 | `_updateHud()` |  |
| 79 | 3525 | `_dmgArc()` |  |
| 79 | 7173 | `update()` | 🔴 append-only |
| 76 | 4741 | `_updateCtfHud()` |  |
| 71 | 6760 | `_updateBotNN()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `325–328` `362–456` `483–504` `1271–1669` `2893–2903` `2985–3069` `3088–3284` `3746–3770` `3818–3882` `3950–3966` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `165–168` `219–219` `245–256` `546–557` `3386–3494` `4277–4332` `4498–4734` `4817–4839` `5119–5472` `5805–5822` `5904–6746` | — |
| **MAPAS / MUNDO** | `1217–1270` `2331–2580` `4333–4475` `5473–5620` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1670–1679` `1794–1825` `2819–2831` `3771–3809` `3893–3949` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1174–1216` `2773–2797` `2813–2818` `2832–2842` `3525–3666` `3682–3745` `6915–6978` `7009–7057` `7093–7172` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7173–7251 · `_dom()` 1174–1216 · `constructor()` 613–1173

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3793 de 7292 linhas (52%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 613 | `constructor()` | 561 |
| 1174 | `_dom()` | 43 |
| 1217 | `_buildEnv()` | 54 |
| 1271 | `_buildViewModels()` | 241 |
| 1512 | `_vmFrame` | 158 |
| 1670 | `_makePuffTexture()` | 10 |
| 1680 | `_makeBloodTex()` | 19 |
| 1699 | `_makeBloodPoolTex()` | 21 |
| 1720 | `_bloodDecal()` | 16 |
| 1736 | `_makeBloodFx()` | 20 |
| 1756 | `_bloodSpatter()` | 18 |
| 1774 | `_bloodPoolAt()` | 6 |
| 1780 | `_updateBlood()` | 14 |
| 1794 | `_makeFlashTex()` | 22 |
| 1816 | `_makeFlashCoreTex()` | 10 |
| 1826 | `_input()` | 2 |
| 1828 | `_kd` | 42 |
| 1870 | `_ku` | 4 |
| 1874 | `_md` | 34 |
| 1908 | `_mu` | 7 |
| 1915 | `_mm` | 15 |
| 1930 | `_cc` | 1 |
| 1931 | `_blur` | 1 |
| 1932 | `_plc` | 17 |
| 1949 | `_touchControls()` | 115 |
| 2064 | `_aimAssist()` | 28 |
| 2092 | `_requestLock()` | 24 |
| 2116 | `_travaAtalhos()` | 4 |
| 2120 | `_soltaAtalhos()` | 3 |
| 2123 | `_acceptInput()` | 8 |
| 2131 | `_pauseBackdrop()` | 7 |
| 2138 | `_radioShow()` | 6 |
| 2144 | `_radioUi()` | 8 |
| 2152 | `_radioPick()` | 20 |
| 2172 | `_abilityNotice()` | 10 |
| 2182 | `_resetSliceAbilities()` | 9 |
| 2191 | `_stackTrace()` | 28 |
| 2219 | `_updateMotocaCharge()` | 10 |
| 2229 | `_recordRoutePoint()` | 11 |
| 2240 | `_routePing()` | 23 |
| 2263 | `_tickRoutePings()` | 12 |
| 2275 | `_objectiveInteractionMultiplier()` | 14 |
| 2289 | `start()` | 4 |
| 2293 | `_startRound()` | 38 |
| 2331 | `_resetPositions()` | 250 |
| 2581 | `_checkCtfAlvo()` | 13 |
| 2594 | `_checkPace()` | 13 |
| 2607 | `_endRound()` | 37 |
| 2644 | `_fimDaPartida()` | 7 |
| 2651 | `_endMatch()` | 58 |
| 2709 | `_ensureDolly()` | 41 |
| 2750 | `_tickDolly()` | 23 |
| 2773 | `setPaused()` | 25 |
| 2798 | `_now()` | 3 |
| 2801 | `pauseArmed()` | 1 |
| 2802 | `_syncPauseArm()` | 7 |
| 2809 | `resume()` | 4 |
| 2813 | `applySettings()` | 6 |
| 2819 | `_applyQuality()` | 13 |
| 2832 | `onResize()` | 11 |
| 2843 | `_switchTeam()` | 50 |
| 2893 | `_applyVmVisibility()` | 11 |
| 2904 | `_vmlabEnsure()` | 14 |
| 2918 | `_vmlabFrame()` | 28 |
| 2946 | `_tuneGet()` | 15 |
| 2961 | `_tune()` | 23 |
| 2984 | `_fxSet()` | 1 |
| 2985 | `_switchWeapon()` | 33 |
| 3018 | `_deploySfx()` | 7 |
| 3025 | `_scope()` | 17 |
| 3042 | `_zoomFov()` | 8 |
| 3050 | `_reloading()` | 1 |
| 3051 | `_startReload()` | 19 |
| 3070 | `_reloadLayers()` | 18 |
| 3088 | `_installRecoil()` | 33 |
| 3121 | `_shotRecoil()` | 13 |
| 3134 | `_tryShoot()` | 85 |
| 3219 | `_meleeHit()` | 12 |
| 3231 | `_fireHitscan()` | 54 |
| 3285 | `_surfaceOf()` | 27 |
| 3312 | `_fleshImpact()` | 35 |
| 3347 | `_fxVoice()` | 9 |
| 3356 | `_impactSfx()` | 14 |
| 3370 | `_tintFx()` | 16 |
| 3386 | `_damage()` | 40 |
| 3426 | `_kill()` | 69 |
| 3495 | `_checkArenaWin()` | 30 |
| 3525 | `_dmgArc()` | 79 |
| 3604 | `_mkBanner()` | 9 |
| 3613 | `_hitmarker()` | 15 |
| 3628 | `_dmgNumber()` | 20 |
| 3648 | `_feed()` | 19 |
| 3667 | `_skullIcon()` | 6 |
| 3673 | `_killfeedWeaponIcon()` | 9 |
| 3682 | `_wpnIcon()` | 64 |
| 3746 | `_tracer()` | 25 |
| 3771 | `_puff()` | 39 |
| 3810 | `_holeDecalMat()` | 8 |
| 3818 | `_flash()` | 56 |
| 3874 | `_muzzleWorld()` | 9 |
| 3883 | `_updateDoors()` | 10 |
| 3893 | `_updateFx()` | 57 |
| 3950 | `_ejectCasing()` | 17 |
| 3967 | `_makeCtfFlagTex()` | 23 |
| 3990 | `_paintFlagSymbol()` | 9 |
| 3999 | `_flagTexFor()` | 26 |
| 4025 | `_legadoSimbolo()` | 8 |
| 4033 | `_loadCtfSymbols()` | 22 |
| 4055 | `_makeCtfZoneTex()` | 31 |
| 4086 | `_makeSmokeTex()` | 8 |
| 4094 | `_updateSmokeHud()` | 6 |
| 4100 | `_spawnGrenade()` | 11 |
| 4111 | `_throwSmoke()` | 8 |
| 4119 | `_throwFrag()` | 10 |
| 4129 | `_explodeFrag()` | 38 |
| 4167 | `_corDaFumaca()` | 15 |
| 4182 | `_popSmoke()` | 19 |
| 4201 | `_updateGrenades()` | 27 |
| 4228 | `_teamColor()` | 15 |
| 4243 | `_teamInk()` | 7 |
| 4250 | `_factionOf()` | 1 |
| 4251 | `_voiceKey()` | 3 |
| 4254 | `_teamName()` | 1 |
| 4255 | `_teamTag()` | 6 |
| 4261 | `_plaqueta()` | 13 |
| 4274 | `_mirror()` | 3 |
| 4277 | `_botSeparation()` | 56 |
| 4333 | `_initCTF()` | 84 |
| 4417 | `_updateCTF()` | 59 |
| 4476 | `_ctfWin()` | 22 |
| 4498 | `_freeYaw()` | 25 |
| 4523 | `_pullString()` | 23 |
| 4546 | `_walkReach()` | 18 |
| 4564 | `_wpComp()` | 16 |
| 4580 | `_findPathLocal()` | 22 |
| 4602 | `_botCtf()` | 133 |
| 4735 | `_hideCtfHud()` | 6 |
| 4741 | `_updateCtfHud()` | 76 |
| 4817 | `_collide()` | 23 |
| 4840 | `_collideRot()` | 22 |
| 4862 | `_mantleAlcance()` | 50 |
| 4912 | `_mantleAlcancavel()` | 12 |
| 4924 | `_mantleTarget()` | 35 |
| 4959 | `_freeSpot()` | 30 |
| 4989 | `_retaAndavel()` | 20 |
| 5009 | `_walkDepth()` | 16 |
| 5025 | `_noteHit()` | 17 |
| 5042 | `_deathFeedback()` | 43 |
| 5085 | `_updateReplayCam()` | 34 |
| 5119 | `_updatePlayer()` | 354 |
| 5473 | `_updatePickups()` | 148 |
| 5621 | `_wpnMode()` | 5 |
| 5626 | `_botWeapon()` | 10 |
| 5636 | `_municaoInfinita()` | 1 |
| 5637 | `_pickupAllowed()` | 7 |
| 5644 | `_grabPickup()` | 35 |
| 5679 | `_assentarNoChao()` | 11 |
| 5690 | `_dropWeapon()` | 18 |
| 5708 | `_sumirDrop()` | 36 |
| 5744 | `_spawnY()` | 3 |
| 5747 | `_spawnYaw()` | 5 |
| 5752 | `_pickSpawn()` | 23 |
| 5775 | `_respawnPlayer()` | 30 |
| 5805 | `_losClear()` | 18 |
| 5823 | `_botCall()` | 37 |
| 5860 | `_teamMarkTex()` | 23 |
| 5883 | `_makeTeamMark()` | 14 |
| 5897 | `_updateTeamMark()` | 7 |
| 5904 | `_botEye()` | 1 |
| 5905 | `_enemyOf()` | 8 |
| 5913 | `_duelToken()` | 20 |
| 5933 | `_updateBot()` | 814 |
| 6747 | `_flushTraining()` | 13 |
| 6760 | `_updateBotNN()` | 71 |
| 6831 | `_botShootNN()` | 46 |
| 6877 | `_radarFoot()` | 38 |
| 6915 | `_updateRadar()` | 64 |
| 6979 | `_banner()` | 26 |
| 7005 | `_resultadoDaRodada()` | 4 |
| 7009 | `_showScoreboard()` | 49 |
| 7058 | `_updateWeaponHud()` | 35 |
| 7093 | `_updateHud()` | 80 |
| 7173 | `update()` | 79 |
| 7252 | `dispose()` | 40 |

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
