# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.169 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7189 | 264 |
| `public/js/main.js` | 2782 | 257 |
| `public/js/glbchars.js` | 961 | 68 |
| `public/js/characters.js` | 1169 | 41 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 21 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3141 linhas (44% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 814 | 5836 | `_updateBot()` | ⚠️ candidato a extração |
| 543 | 589 | `constructor()` | 🔴 append-only |
| 349 | 5025 | `_updatePlayer()` | ⚠️ candidato a extração |
| 249 | 2289 | `_resetPositions()` |  |
| 241 | 1229 | `_buildViewModels()` |  |
| 148 | 5374 | `_updatePickups()` |  |
| 133 | 4542 | `_botCtf()` |  |
| 115 | 1907 | `_touchControls()` |  |
| 85 | 3081 | `_tryShoot()` |  |
| 84 | 4273 | `_initCTF()` |  |
| 80 | 6996 | `_updateHud()` |  |
| 79 | 3465 | `_dmgArc()` |  |
| 76 | 4681 | `_updateCtfHud()` |  |
| 74 | 7076 | `update()` | 🔴 append-only |
| 71 | 6663 | `_updateBotNN()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `315–318` `352–446` `473–494` `1229–1627` `2846–2851` `2933–3016` `3035–3231` `3686–3710` `3758–3822` `3890–3906` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `155–158` `209–209` `235–246` `536–547` `3333–3434` `4217–4272` `4438–4674` `4757–4779` `5025–5373` `5708–5725` `5807–6649` | — |
| **MAPAS / MUNDO** | `1175–1228` `2289–2537` `4273–4415` `5374–5521` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1628–1637` `1752–1783` `2776–2788` `3711–3749` `3833–3889` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1132–1174` `2730–2754` `2770–2775` `2789–2795` `3465–3606` `3622–3685` `6818–6881` `6912–6960` `6996–7075` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7076–7149 · `_dom()` 1132–1174 · `constructor()` 589–1131

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3770 de 7189 linhas (52%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 321 | `TRACER_STYLE` | 3 |
| 325 | `D2R` | 4 |
| 329 | `DMG_FALLOFF` | 5 |
| 334 | `HS_MUL` | 3 |
| 337 | `BALL_CLASS` | 15 |
| 352 | `STATIC_CLASS` | 75 |
| 428 | `VM_KNOB` | 19 |
| 449 | `vmFovForAspect` | 24 |
| 473 | `VM_OFF` | 22 |
| 495 | `vmOffY` | 35 |
| 530 | `VMP` | 6 |
| 536 | `BOT_SKILLS` | 11 |
| 548 | `diffKey` | 4 |
| 553 | `rollBotSkill` | 7 |
| 560 | `botTier` | 4 |
| 564 | `_cyclePool` | 4 |
| 568 | `_rosterPool` | 12 |
| 580 | `pickMatchRoster` | 8 |
| 589 | `constructor()` | 543 |
| 1132 | `_dom()` | 43 |
| 1175 | `_buildEnv()` | 54 |
| 1229 | `_buildViewModels()` | 241 |
| 1470 | `_vmFrame` | 158 |
| 1628 | `_makePuffTexture()` | 10 |
| 1638 | `_makeBloodTex()` | 19 |
| 1657 | `_makeBloodPoolTex()` | 21 |
| 1678 | `_bloodDecal()` | 16 |
| 1694 | `_makeBloodFx()` | 20 |
| 1714 | `_bloodSpatter()` | 18 |
| 1732 | `_bloodPoolAt()` | 6 |
| 1738 | `_updateBlood()` | 14 |
| 1752 | `_makeFlashTex()` | 22 |
| 1774 | `_makeFlashCoreTex()` | 10 |
| 1784 | `_input()` | 2 |
| 1786 | `_kd` | 42 |
| 1828 | `_ku` | 4 |
| 1832 | `_md` | 34 |
| 1866 | `_mu` | 7 |
| 1873 | `_mm` | 15 |
| 1888 | `_cc` | 1 |
| 1889 | `_blur` | 1 |
| 1890 | `_plc` | 17 |
| 1907 | `_touchControls()` | 115 |
| 2022 | `_aimAssist()` | 28 |
| 2050 | `_requestLock()` | 24 |
| 2074 | `_travaAtalhos()` | 4 |
| 2078 | `_soltaAtalhos()` | 3 |
| 2081 | `_acceptInput()` | 8 |
| 2089 | `_pauseBackdrop()` | 7 |
| 2096 | `_radioShow()` | 6 |
| 2102 | `_radioUi()` | 8 |
| 2110 | `_radioPick()` | 20 |
| 2130 | `_abilityNotice()` | 10 |
| 2140 | `_resetSliceAbilities()` | 9 |
| 2149 | `_stackTrace()` | 28 |
| 2177 | `_updateMotocaCharge()` | 10 |
| 2187 | `_recordRoutePoint()` | 11 |
| 2198 | `_routePing()` | 23 |
| 2221 | `_tickRoutePings()` | 12 |
| 2233 | `_objectiveInteractionMultiplier()` | 14 |
| 2247 | `start()` | 4 |
| 2251 | `_startRound()` | 38 |
| 2289 | `_resetPositions()` | 249 |
| 2538 | `_checkCtfAlvo()` | 13 |
| 2551 | `_checkPace()` | 13 |
| 2564 | `_endRound()` | 37 |
| 2601 | `_fimDaPartida()` | 7 |
| 2608 | `_endMatch()` | 58 |
| 2666 | `_ensureDolly()` | 41 |
| 2707 | `_tickDolly()` | 23 |
| 2730 | `setPaused()` | 25 |
| 2755 | `_now()` | 3 |
| 2758 | `pauseArmed()` | 1 |
| 2759 | `_syncPauseArm()` | 7 |
| 2766 | `resume()` | 4 |
| 2770 | `applySettings()` | 6 |
| 2776 | `_applyQuality()` | 13 |
| 2789 | `onResize()` | 7 |
| 2796 | `_switchTeam()` | 50 |
| 2846 | `_applyVmVisibility()` | 6 |
| 2852 | `_vmlabEnsure()` | 14 |
| 2866 | `_vmlabFrame()` | 28 |
| 2894 | `_tuneGet()` | 15 |
| 2909 | `_tune()` | 23 |
| 2932 | `_fxSet()` | 1 |
| 2933 | `_switchWeapon()` | 32 |
| 2965 | `_deploySfx()` | 7 |
| 2972 | `_scope()` | 17 |
| 2989 | `_zoomFov()` | 8 |
| 2997 | `_reloading()` | 1 |
| 2998 | `_startReload()` | 19 |
| 3017 | `_reloadLayers()` | 18 |
| 3035 | `_installRecoil()` | 33 |
| 3068 | `_shotRecoil()` | 13 |
| 3081 | `_tryShoot()` | 85 |
| 3166 | `_meleeHit()` | 12 |
| 3178 | `_fireHitscan()` | 54 |
| 3232 | `_surfaceOf()` | 27 |
| 3259 | `_fleshImpact()` | 35 |
| 3294 | `_fxVoice()` | 9 |
| 3303 | `_impactSfx()` | 14 |
| 3317 | `_tintFx()` | 16 |
| 3333 | `_damage()` | 40 |
| 3373 | `_kill()` | 62 |
| 3435 | `_checkArenaWin()` | 30 |
| 3465 | `_dmgArc()` | 79 |
| 3544 | `_mkBanner()` | 9 |
| 3553 | `_hitmarker()` | 15 |
| 3568 | `_dmgNumber()` | 20 |
| 3588 | `_feed()` | 19 |
| 3607 | `_skullIcon()` | 6 |
| 3613 | `_killfeedWeaponIcon()` | 9 |
| 3622 | `_wpnIcon()` | 64 |
| 3686 | `_tracer()` | 25 |
| 3711 | `_puff()` | 39 |
| 3750 | `_holeDecalMat()` | 8 |
| 3758 | `_flash()` | 56 |
| 3814 | `_muzzleWorld()` | 9 |
| 3823 | `_updateDoors()` | 10 |
| 3833 | `_updateFx()` | 57 |
| 3890 | `_ejectCasing()` | 17 |
| 3907 | `_makeCtfFlagTex()` | 23 |
| 3930 | `_paintFlagSymbol()` | 9 |
| 3939 | `_flagTexFor()` | 26 |
| 3965 | `_legadoSimbolo()` | 8 |
| 3973 | `_loadCtfSymbols()` | 22 |
| 3995 | `_makeCtfZoneTex()` | 31 |
| 4026 | `_makeSmokeTex()` | 8 |
| 4034 | `_updateSmokeHud()` | 6 |
| 4040 | `_spawnGrenade()` | 11 |
| 4051 | `_throwSmoke()` | 8 |
| 4059 | `_throwFrag()` | 10 |
| 4069 | `_explodeFrag()` | 38 |
| 4107 | `_corDaFumaca()` | 15 |
| 4122 | `_popSmoke()` | 19 |
| 4141 | `_updateGrenades()` | 27 |
| 4168 | `_teamColor()` | 15 |
| 4183 | `_teamInk()` | 7 |
| 4190 | `_factionOf()` | 1 |
| 4191 | `_voiceKey()` | 3 |
| 4194 | `_teamName()` | 1 |
| 4195 | `_teamTag()` | 6 |
| 4201 | `_plaqueta()` | 13 |
| 4214 | `_mirror()` | 3 |
| 4217 | `_botSeparation()` | 56 |
| 4273 | `_initCTF()` | 84 |
| 4357 | `_updateCTF()` | 59 |
| 4416 | `_ctfWin()` | 22 |
| 4438 | `_freeYaw()` | 25 |
| 4463 | `_pullString()` | 23 |
| 4486 | `_walkReach()` | 18 |
| 4504 | `_wpComp()` | 16 |
| 4520 | `_findPathLocal()` | 22 |
| 4542 | `_botCtf()` | 133 |
| 4675 | `_hideCtfHud()` | 6 |
| 4681 | `_updateCtfHud()` | 76 |
| 4757 | `_collide()` | 23 |
| 4780 | `_collideRot()` | 22 |
| 4802 | `_mantleAlcance()` | 50 |
| 4852 | `_mantleAlcancavel()` | 12 |
| 4864 | `_mantleTarget()` | 35 |
| 4899 | `_freeSpot()` | 30 |
| 4929 | `_retaAndavel()` | 20 |
| 4949 | `_walkDepth()` | 16 |
| 4965 | `_noteHit()` | 17 |
| 4982 | `_deathFeedback()` | 43 |
| 5025 | `_updatePlayer()` | 349 |
| 5374 | `_updatePickups()` | 148 |
| 5522 | `_wpnMode()` | 5 |
| 5527 | `_botWeapon()` | 12 |
| 5539 | `_municaoInfinita()` | 1 |
| 5540 | `_pickupAllowed()` | 7 |
| 5547 | `_grabPickup()` | 35 |
| 5582 | `_assentarNoChao()` | 11 |
| 5593 | `_dropWeapon()` | 18 |
| 5611 | `_sumirDrop()` | 36 |
| 5647 | `_spawnY()` | 3 |
| 5650 | `_spawnYaw()` | 5 |
| 5655 | `_pickSpawn()` | 23 |
| 5678 | `_respawnPlayer()` | 30 |
| 5708 | `_losClear()` | 18 |
| 5726 | `_botCall()` | 37 |
| 5763 | `_teamMarkTex()` | 23 |
| 5786 | `_makeTeamMark()` | 14 |
| 5800 | `_updateTeamMark()` | 7 |
| 5807 | `_botEye()` | 1 |
| 5808 | `_enemyOf()` | 8 |
| 5816 | `_duelToken()` | 20 |
| 5836 | `_updateBot()` | 814 |
| 6650 | `_flushTraining()` | 13 |
| 6663 | `_updateBotNN()` | 71 |
| 6734 | `_botShootNN()` | 46 |
| 6780 | `_radarFoot()` | 38 |
| 6818 | `_updateRadar()` | 64 |
| 6882 | `_banner()` | 26 |
| 6908 | `_resultadoDaRodada()` | 4 |
| 6912 | `_showScoreboard()` | 49 |
| 6961 | `_updateWeaponHud()` | 35 |
| 6996 | `_updateHud()` | 80 |
| 7076 | `update()` | 74 |
| 7150 | `dispose()` | 39 |

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
