# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.282 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7494 | 277 |
| `public/js/main.js` | 3597 | 294 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3144 linhas (42% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6104 | `_updateBot()` | ⚠️ candidato a extração |
| 585 | 622 | `constructor()` | 🔴 append-only |
| 248 | 2276 | `_resetPositions()` |  |
| 247 | 5309 | `_updatePlayer()` |  |
| 241 | 1305 | `_buildViewModels()` |  |
| 148 | 5569 | `_updatePickups()` |  |
| 137 | 4705 | `_botCtf()` |  |
| 115 | 2001 | `_touchControls()` |  |
| 98 | 5211 | `_moveEntity()` |  |
| 90 | 7360 | `update()` | 🔴 append-only |
| 87 | 7273 | `_updateHud()` |  |
| 86 | 4420 | `_initCTF()` |  |
| 85 | 3092 | `_tryShoot()` |  |
| 79 | 3550 | `_dmgArc()` |  |
| 76 | 4848 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `300–305` `362–456` `483–504` `1305–1704` `2853–2859` `2941–3027` `3046–3192` `3237–3290` `3778–3801` `3849–3932` `4004–4020` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `154–157` `208–208` `234–245` `546–557` `3430–3549` `4359–4419` `4587–4841` `4924–4946` `5309–5555` `5925–5942` `6052–6082` `6104–6925` | — |
| **MAPAS / MUNDO** | `1251–1304` `2276–2523` `4420–4563` `5569–5716` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1719–1728` `1843–1874` `2775–2787` `3802–3840` `3948–4003` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1207–1250` `2728–2750` `2766–2774` `2788–2794` `3550–3628` `3645–3698` `3714–3777` `7096–7159` `7190–7237` `7273–7359` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7360–7449 · `_dom()` 1207–1250 · `constructor()` 622–1206

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3749 de 7494 linhas (50%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 37 | `ANNOUNCER_LAB` | 4 |
| 41 | `VMLAB` | 8 |
| 49 | `VM_MAT_LEGACY` | 4 |
| 55 | `DROP_TTL` | 8 |
| 63 | `ROUNDS_MAX` | 27 |
| 93 | `CTF_CLOCK_SHOW` | 4 |
| 97 | `KILLS_PER_PLAYER` | 7 |
| 104 | `PACE` | 33 |
| 137 | `PAUSE_ARM_MS` | 9 |
| 147 | `confirmGate` | 7 |
| 158 | `BOT_AIM_PITCH` | 4 |
| 162 | `BOT_DMG_PLAYER` | 21 |
| 183 | `BOT_FAIR` | 5 |
| 188 | `BOT_MOVE2` | 15 |
| 212 | `BOT_FOCUS_MIN` | 22 |
| 238 | `BOT_TOKEN_REST` | 7 |
| 246 | `MOVE_MUL` | 6 |
| 253 | `MOVE2` | 5 |
| 258 | `RACK_OLD` | 4 |
| 262 | `RACK_RETA` | 25 |
| 289 | `RADIO` | 5 |
| 295 | `MK_LABELS` | 5 |
| 300 | `GUNFEEL` | 6 |
| 311 | `coneDoDisparo` | 23 |
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
| 578 | `_rosterPool` | 15 |
| 593 | `pickMatchRoster` | 12 |
| 605 | `BOT_WEAPON_POOL` | 5 |
| 610 | `pickMatchWeapons` | 9 |
| 622 | `constructor()` | 585 |
| 1207 | `_dom()` | 44 |
| 1251 | `_buildEnv()` | 54 |
| 1305 | `_buildViewModels()` | 241 |
| 1546 | `_vmFrame` | 159 |
| 1705 | `_vmMontarTardio` | 14 |
| 1719 | `_makePuffTexture()` | 10 |
| 1729 | `_makeBloodTex()` | 19 |
| 1748 | `_makeBloodPoolTex()` | 21 |
| 1769 | `_bloodDecal()` | 16 |
| 1785 | `_makeBloodFx()` | 20 |
| 1805 | `_bloodSpatter()` | 18 |
| 1823 | `_bloodPoolAt()` | 6 |
| 1829 | `_updateBlood()` | 14 |
| 1843 | `_makeFlashTex()` | 22 |
| 1865 | `_makeFlashCoreTex()` | 10 |
| 1875 | `_input()` | 2 |
| 1877 | `_kd` | 45 |
| 1922 | `_ku` | 4 |
| 1926 | `_md` | 34 |
| 1960 | `_mu` | 7 |
| 1967 | `_mm` | 15 |
| 1982 | `_cc` | 1 |
| 1983 | `_blur` | 1 |
| 1984 | `_plc` | 17 |
| 2001 | `_touchControls()` | 115 |
| 2116 | `_aimAssist()` | 28 |
| 2144 | `_requestLock()` | 27 |
| 2171 | `_travaAtalhos()` | 4 |
| 2175 | `_soltaAtalhos()` | 5 |
| 2180 | `espectando()` | 2 |
| 2182 | `_acceptInput()` | 8 |
| 2190 | `_pauseBackdrop()` | 7 |
| 2197 | `_radioShow()` | 6 |
| 2203 | `_radioUi()` | 8 |
| 2211 | `_radioPick()` | 16 |
| 2227 | `start()` | 5 |
| 2232 | `_startAnnouncerLab()` | 9 |
| 2241 | `_startRound()` | 35 |
| 2276 | `_resetPositions()` | 248 |
| 2524 | `_checkCtfAlvo()` | 13 |
| 2537 | `_checkPace()` | 13 |
| 2550 | `_endRound()` | 34 |
| 2584 | `_roundWinnerVoice()` | 12 |
| 2596 | `_fimDaPartida()` | 7 |
| 2603 | `_endMatch()` | 61 |
| 2664 | `_ensureDolly()` | 41 |
| 2705 | `_tickDolly()` | 23 |
| 2728 | `setPaused()` | 23 |
| 2751 | `_now()` | 3 |
| 2754 | `pauseArmed()` | 1 |
| 2755 | `_syncPauseArm()` | 7 |
| 2762 | `resume()` | 4 |
| 2766 | `applySettings()` | 9 |
| 2775 | `_applyQuality()` | 13 |
| 2788 | `onResize()` | 7 |
| 2795 | `_switchTeam()` | 58 |
| 2853 | `_applyVmVisibility()` | 7 |
| 2860 | `_vmlabEnsure()` | 14 |
| 2874 | `_vmlabFrame()` | 28 |
| 2902 | `_tuneGet()` | 15 |
| 2917 | `_tune()` | 23 |
| 2940 | `_fxSet()` | 1 |
| 2941 | `_switchWeapon()` | 34 |
| 2975 | `_deploySfx()` | 7 |
| 2982 | `_scope()` | 17 |
| 2999 | `_zoomFov()` | 8 |
| 3007 | `_reloading()` | 1 |
| 3008 | `_startReload()` | 20 |
| 3028 | `_reloadLayers()` | 18 |
| 3046 | `_installRecoil()` | 33 |
| 3079 | `_shotRecoil()` | 13 |
| 3092 | `_tryShoot()` | 85 |
| 3177 | `_meleeHit()` | 16 |
| 3193 | `_meleeRange()` | 5 |
| 3198 | `_botMelee()` | 28 |
| 3226 | `_shotDamage()` | 11 |
| 3237 | `_fireHitscan()` | 54 |
| 3291 | `_targetFromHit()` | 9 |
| 3300 | `_penetrationExit()` | 20 |
| 3320 | `_surfaceOf()` | 27 |
| 3347 | `_armoredTarget()` | 3 |
| 3350 | `_fleshImpact()` | 38 |
| 3388 | `_fxVoice()` | 9 |
| 3397 | `_impactSfx()` | 17 |
| 3414 | `_tintFx()` | 16 |
| 3430 | `_damage()` | 41 |
| 3471 | `_playerHurtFx()` | 6 |
| 3477 | `_kill()` | 73 |
| 3550 | `_dmgArc()` | 79 |
| 3629 | `_mkBanner()` | 11 |
| 3640 | `_acertoPrevisto()` | 5 |
| 3645 | `_hitmarker()` | 15 |
| 3660 | `_dmgNumber()` | 20 |
| 3680 | `_feed()` | 19 |
| 3699 | `_skullIcon()` | 6 |
| 3705 | `_killfeedWeaponIcon()` | 9 |
| 3714 | `_wpnIcon()` | 64 |
| 3778 | `_tracer()` | 24 |
| 3802 | `_puff()` | 39 |
| 3841 | `_holeDecalMat()` | 8 |
| 3849 | `_flash()` | 66 |
| 3915 | `_muzzleWorld()` | 18 |
| 3933 | `_aimOrigin()` | 5 |
| 3938 | `_updateDoors()` | 10 |
| 3948 | `_updateFx()` | 56 |
| 4004 | `_ejectCasing()` | 17 |
| 4021 | `_makeCtfFlagTex()` | 23 |
| 4044 | `_paintFlagSymbol()` | 9 |
| 4053 | `_flagTexFor()` | 26 |
| 4079 | `_legadoSimbolo()` | 8 |
| 4087 | `_loadCtfSymbols()` | 22 |
| 4109 | `_makeCtfZoneTex()` | 31 |
| 4140 | `_makeSmokeTex()` | 8 |
| 4148 | `_updateSmokeHud()` | 4 |
| 4152 | `_grenadeSpatial()` | 14 |
| 4166 | `_spawnGrenade()` | 13 |
| 4179 | `_throwSmoke()` | 11 |
| 4190 | `_throwFrag()` | 13 |
| 4203 | `_explodeFrag()` | 40 |
| 4243 | `_corDaFumaca()` | 15 |
| 4258 | `_popSmoke()` | 21 |
| 4279 | `_updateGrenades()` | 35 |
| 4314 | `_teamColor()` | 14 |
| 4328 | `_teamInk()` | 6 |
| 4334 | `_factionOf()` | 1 |
| 4335 | `_voiceKey()` | 1 |
| 4336 | `_teamName()` | 1 |
| 4337 | `_teamTag()` | 6 |
| 4343 | `_plaqueta()` | 13 |
| 4356 | `_mirror()` | 3 |
| 4359 | `_botSeparation()` | 61 |
| 4420 | `_initCTF()` | 86 |
| 4506 | `_updateCTF()` | 58 |
| 4564 | `_ctfWin()` | 23 |
| 4587 | `_freeYaw()` | 25 |
| 4612 | `_pullString()` | 23 |
| 4635 | `_walkReach()` | 32 |
| 4667 | `_wpComp()` | 16 |
| 4683 | `_findPathLocal()` | 22 |
| 4705 | `_botCtf()` | 137 |
| 4842 | `_hideCtfHud()` | 6 |
| 4848 | `_updateCtfHud()` | 76 |
| 4924 | `_collide()` | 23 |
| 4947 | `_collideRot()` | 26 |
| 4973 | `_freeSpot()` | 30 |
| 5003 | `_retaAndavel()` | 20 |
| 5023 | `_walkDepth()` | 16 |
| 5039 | `_noteHit()` | 17 |
| 5056 | `_deathFeedback()` | 45 |
| 5101 | `_toggleCamView()` | 11 |
| 5112 | `_syncCamViewVis()` | 8 |
| 5120 | `_ensurePlayerTP()` | 25 |
| 5145 | `_updatePlayerTP()` | 35 |
| 5180 | `_tpDeath()` | 18 |
| 5198 | `_tpRevive()` | 13 |
| 5211 | `_moveEntity()` | 98 |
| 5309 | `_updatePlayer()` | 247 |
| 5556 | `_footstepSurface()` | 13 |
| 5569 | `_updatePickups()` | 148 |
| 5717 | `_wpnMode()` | 5 |
| 5722 | `_botWeapon()` | 10 |
| 5732 | `_municaoInfinita()` | 1 |
| 5733 | `_pickupAllowed()` | 7 |
| 5740 | `_grabPickup()` | 35 |
| 5775 | `_assentarNoChao()` | 10 |
| 5785 | `refreshPickupModels()` | 24 |
| 5809 | `_dropWeapon()` | 20 |
| 5829 | `_sumirDrop()` | 36 |
| 5865 | `_spawnY()` | 3 |
| 5868 | `_spawnYaw()` | 5 |
| 5873 | `_pickSpawn()` | 23 |
| 5896 | `_respawnPlayer()` | 29 |
| 5925 | `_losClear()` | 18 |
| 5943 | `_botCall()` | 41 |
| 5984 | `_teamMarkTex()` | 23 |
| 6007 | `_makeTeamMark()` | 16 |
| 6023 | `_syncRemoteWeapon()` | 22 |
| 6045 | `_updateTeamMark()` | 7 |
| 6052 | `_botEye()` | 1 |
| 6053 | `_enemyOf()` | 8 |
| 6061 | `_duelToken()` | 22 |
| 6083 | `_respawnEntity()` | 21 |
| 6104 | `_updateBot()` | 822 |
| 6926 | `_flushTraining()` | 13 |
| 6939 | `_updateBotNN()` | 73 |
| 7012 | `_botShootNN()` | 46 |
| 7058 | `_radarFoot()` | 38 |
| 7096 | `_updateRadar()` | 64 |
| 7160 | `_banner()` | 26 |
| 7186 | `_resultadoDaRodada()` | 4 |
| 7190 | `_showScoreboard()` | 48 |
| 7238 | `_updateWeaponHud()` | 35 |
| 7273 | `_updateHud()` | 87 |
| 7360 | `update()` | 90 |
| 7450 | `dispose()` | 44 |

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
