# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.220 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7332 | 272 |
| `public/js/main.js` | 3365 | 270 |
| `public/js/glbchars.js` | 845 | 60 |
| `public/js/characters.js` | 1069 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3106 linhas (42% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 809 | 5965 | `_updateBot()` | ⚠️ candidato a extração |
| 579 | 591 | `constructor()` | 🔴 append-only |
| 249 | 5179 | `_updatePlayer()` |  |
| 248 | 2237 | `_resetPositions()` |  |
| 241 | 1268 | `_buildViewModels()` |  |
| 148 | 5439 | `_updatePickups()` |  |
| 133 | 4552 | `_botCtf()` |  |
| 115 | 1964 | `_touchControls()` |  |
| 92 | 5087 | `_moveEntity()` |  |
| 89 | 7199 | `update()` | 🔴 append-only |
| 84 | 3032 | `_tryShoot()` |  |
| 84 | 4286 | `_initCTF()` |  |
| 80 | 7119 | `_updateHud()` |  |
| 79 | 3421 | `_dmgArc()` |  |
| 76 | 3345 | `_kill()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `306–308` `337–431` `458–479` `1268–1667` `2793–2799` `2881–2967` `2986–3187` `3649–3672` `3720–3803` `3875–3891` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `160–163` `214–214` `240–251` `521–532` `3298–3420` `4230–4285` `4448–4684` `4767–4789` `5179–5427` `5790–5807` `5913–5943` `5965–6773` | — |
| **MAPAS / MUNDO** | `1214–1267` `2237–2484` `4286–4425` `5439–5586` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1682–1691` `1806–1837` `2723–2735` `3673–3711` `3819–3874` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1170–1213` `2680–2701` `2717–2722` `2736–2742` `3421–3499` `3516–3569` `3585–3648` `6942–7005` `7036–7083` `7119–7198` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7199–7287 · `_dom()` 1170–1213 · `constructor()` 591–1169

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3690 de 7332 linhas (50%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 38 | `ANNOUNCER_LAB` | 3 |
| 47 | `VMLAB` | 8 |
| 55 | `VM_MAT_LEGACY` | 4 |
| 61 | `DROP_TTL` | 8 |
| 69 | `ROUNDS_MAX` | 27 |
| 99 | `CTF_CLOCK_SHOW` | 4 |
| 103 | `KILLS_PER_PLAYER` | 7 |
| 110 | `PACE` | 33 |
| 143 | `PAUSE_ARM_MS` | 9 |
| 153 | `confirmGate` | 7 |
| 164 | `BOT_AIM_PITCH` | 4 |
| 168 | `BOT_DMG_PLAYER` | 21 |
| 189 | `BOT_FAIR` | 5 |
| 194 | `BOT_MOVE2` | 15 |
| 218 | `BOT_FOCUS_MIN` | 22 |
| 244 | `BOT_TOKEN_REST` | 7 |
| 252 | `MOVE_MUL` | 6 |
| 259 | `MOVE2` | 5 |
| 264 | `RACK_OLD` | 4 |
| 268 | `RACK_RETA` | 25 |
| 295 | `RADIO` | 5 |
| 301 | `MK_LABELS` | 5 |
| 306 | `GUNFEEL` | 3 |
| 310 | `D2R` | 4 |
| 314 | `DMG_FALLOFF` | 5 |
| 319 | `HS_MUL` | 3 |
| 322 | `BALL_CLASS` | 15 |
| 337 | `STATIC_CLASS` | 75 |
| 413 | `VM_KNOB` | 19 |
| 434 | `vmFovForAspect` | 24 |
| 458 | `VM_OFF` | 22 |
| 480 | `vmOffY` | 35 |
| 515 | `VMP` | 6 |
| 521 | `BOT_SKILLS` | 11 |
| 533 | `diffKey` | 4 |
| 538 | `rollBotSkill` | 7 |
| 545 | `botTier` | 4 |
| 549 | `_cyclePool` | 4 |
| 553 | `_rosterPool` | 15 |
| 568 | `pickMatchRoster` | 10 |
| 578 | `BOT_WEAPON_POOL` | 5 |
| 583 | `pickMatchWeapons` | 7 |
| 591 | `constructor()` | 579 |
| 1170 | `_dom()` | 44 |
| 1214 | `_buildEnv()` | 54 |
| 1268 | `_buildViewModels()` | 241 |
| 1509 | `_vmFrame` | 159 |
| 1668 | `_vmMontarTardio` | 14 |
| 1682 | `_makePuffTexture()` | 10 |
| 1692 | `_makeBloodTex()` | 19 |
| 1711 | `_makeBloodPoolTex()` | 21 |
| 1732 | `_bloodDecal()` | 16 |
| 1748 | `_makeBloodFx()` | 20 |
| 1768 | `_bloodSpatter()` | 18 |
| 1786 | `_bloodPoolAt()` | 6 |
| 1792 | `_updateBlood()` | 14 |
| 1806 | `_makeFlashTex()` | 22 |
| 1828 | `_makeFlashCoreTex()` | 10 |
| 1838 | `_input()` | 2 |
| 1840 | `_kd` | 45 |
| 1885 | `_ku` | 4 |
| 1889 | `_md` | 34 |
| 1923 | `_mu` | 7 |
| 1930 | `_mm` | 15 |
| 1945 | `_cc` | 1 |
| 1946 | `_blur` | 1 |
| 1947 | `_plc` | 17 |
| 1964 | `_touchControls()` | 115 |
| 2079 | `_aimAssist()` | 28 |
| 2107 | `_requestLock()` | 27 |
| 2134 | `_travaAtalhos()` | 4 |
| 2138 | `_soltaAtalhos()` | 5 |
| 2143 | `espectando()` | 2 |
| 2145 | `_acceptInput()` | 8 |
| 2153 | `_pauseBackdrop()` | 7 |
| 2160 | `_radioShow()` | 6 |
| 2166 | `_radioUi()` | 8 |
| 2174 | `_radioPick()` | 14 |
| 2188 | `start()` | 5 |
| 2193 | `_startAnnouncerLab()` | 9 |
| 2202 | `_startRound()` | 35 |
| 2237 | `_resetPositions()` | 248 |
| 2485 | `_checkCtfAlvo()` | 13 |
| 2498 | `_checkPace()` | 13 |
| 2511 | `_endRound()` | 37 |
| 2548 | `_fimDaPartida()` | 7 |
| 2555 | `_endMatch()` | 61 |
| 2616 | `_ensureDolly()` | 41 |
| 2657 | `_tickDolly()` | 23 |
| 2680 | `setPaused()` | 22 |
| 2702 | `_now()` | 3 |
| 2705 | `pauseArmed()` | 1 |
| 2706 | `_syncPauseArm()` | 7 |
| 2713 | `resume()` | 4 |
| 2717 | `applySettings()` | 6 |
| 2723 | `_applyQuality()` | 13 |
| 2736 | `onResize()` | 7 |
| 2743 | `_switchTeam()` | 50 |
| 2793 | `_applyVmVisibility()` | 7 |
| 2800 | `_vmlabEnsure()` | 14 |
| 2814 | `_vmlabFrame()` | 28 |
| 2842 | `_tuneGet()` | 15 |
| 2857 | `_tune()` | 23 |
| 2880 | `_fxSet()` | 1 |
| 2881 | `_switchWeapon()` | 34 |
| 2915 | `_deploySfx()` | 7 |
| 2922 | `_scope()` | 17 |
| 2939 | `_zoomFov()` | 8 |
| 2947 | `_reloading()` | 1 |
| 2948 | `_startReload()` | 20 |
| 2968 | `_reloadLayers()` | 18 |
| 2986 | `_installRecoil()` | 33 |
| 3019 | `_shotRecoil()` | 13 |
| 3032 | `_tryShoot()` | 84 |
| 3116 | `_meleeHit()` | 14 |
| 3130 | `_shotDamage()` | 11 |
| 3141 | `_fireHitscan()` | 47 |
| 3188 | `_surfaceOf()` | 27 |
| 3215 | `_armoredTarget()` | 3 |
| 3218 | `_fleshImpact()` | 38 |
| 3256 | `_fxVoice()` | 9 |
| 3265 | `_impactSfx()` | 17 |
| 3282 | `_tintFx()` | 16 |
| 3298 | `_damage()` | 41 |
| 3339 | `_playerHurtFx()` | 6 |
| 3345 | `_kill()` | 76 |
| 3421 | `_dmgArc()` | 79 |
| 3500 | `_mkBanner()` | 11 |
| 3511 | `_acertoPrevisto()` | 5 |
| 3516 | `_hitmarker()` | 15 |
| 3531 | `_dmgNumber()` | 20 |
| 3551 | `_feed()` | 19 |
| 3570 | `_skullIcon()` | 6 |
| 3576 | `_killfeedWeaponIcon()` | 9 |
| 3585 | `_wpnIcon()` | 64 |
| 3649 | `_tracer()` | 24 |
| 3673 | `_puff()` | 39 |
| 3712 | `_holeDecalMat()` | 8 |
| 3720 | `_flash()` | 66 |
| 3786 | `_muzzleWorld()` | 18 |
| 3804 | `_aimOrigin()` | 5 |
| 3809 | `_updateDoors()` | 10 |
| 3819 | `_updateFx()` | 56 |
| 3875 | `_ejectCasing()` | 17 |
| 3892 | `_makeCtfFlagTex()` | 23 |
| 3915 | `_paintFlagSymbol()` | 9 |
| 3924 | `_flagTexFor()` | 26 |
| 3950 | `_legadoSimbolo()` | 8 |
| 3958 | `_loadCtfSymbols()` | 22 |
| 3980 | `_makeCtfZoneTex()` | 31 |
| 4011 | `_makeSmokeTex()` | 8 |
| 4019 | `_updateSmokeHud()` | 4 |
| 4023 | `_grenadeSpatial()` | 14 |
| 4037 | `_spawnGrenade()` | 13 |
| 4050 | `_throwSmoke()` | 11 |
| 4061 | `_throwFrag()` | 13 |
| 4074 | `_explodeFrag()` | 40 |
| 4114 | `_corDaFumaca()` | 15 |
| 4129 | `_popSmoke()` | 21 |
| 4150 | `_updateGrenades()` | 35 |
| 4185 | `_teamColor()` | 14 |
| 4199 | `_teamInk()` | 6 |
| 4205 | `_factionOf()` | 1 |
| 4206 | `_voiceKey()` | 1 |
| 4207 | `_teamName()` | 1 |
| 4208 | `_teamTag()` | 6 |
| 4214 | `_plaqueta()` | 13 |
| 4227 | `_mirror()` | 3 |
| 4230 | `_botSeparation()` | 56 |
| 4286 | `_initCTF()` | 84 |
| 4370 | `_updateCTF()` | 56 |
| 4426 | `_ctfWin()` | 22 |
| 4448 | `_freeYaw()` | 25 |
| 4473 | `_pullString()` | 23 |
| 4496 | `_walkReach()` | 18 |
| 4514 | `_wpComp()` | 16 |
| 4530 | `_findPathLocal()` | 22 |
| 4552 | `_botCtf()` | 133 |
| 4685 | `_hideCtfHud()` | 6 |
| 4691 | `_updateCtfHud()` | 76 |
| 4767 | `_collide()` | 23 |
| 4790 | `_collideRot()` | 26 |
| 4816 | `_freeSpot()` | 30 |
| 4846 | `_retaAndavel()` | 20 |
| 4866 | `_walkDepth()` | 16 |
| 4882 | `_noteHit()` | 17 |
| 4899 | `_deathFeedback()` | 43 |
| 4942 | `_updateReplayCam()` | 35 |
| 4977 | `_toggleCamView()` | 11 |
| 4988 | `_syncCamViewVis()` | 8 |
| 4996 | `_ensurePlayerTP()` | 25 |
| 5021 | `_updatePlayerTP()` | 35 |
| 5056 | `_tpDeath()` | 18 |
| 5074 | `_tpRevive()` | 13 |
| 5087 | `_moveEntity()` | 92 |
| 5179 | `_updatePlayer()` | 249 |
| 5428 | `_footstepSurface()` | 11 |
| 5439 | `_updatePickups()` | 148 |
| 5587 | `_wpnMode()` | 5 |
| 5592 | `_botWeapon()` | 10 |
| 5602 | `_municaoInfinita()` | 1 |
| 5603 | `_pickupAllowed()` | 7 |
| 5610 | `_grabPickup()` | 35 |
| 5645 | `_assentarNoChao()` | 10 |
| 5655 | `refreshPickupModels()` | 24 |
| 5679 | `_dropWeapon()` | 20 |
| 5699 | `_sumirDrop()` | 36 |
| 5735 | `_spawnY()` | 3 |
| 5738 | `_pickSpawn()` | 23 |
| 5761 | `_respawnPlayer()` | 29 |
| 5790 | `_losClear()` | 18 |
| 5808 | `_botCall()` | 37 |
| 5845 | `_teamMarkTex()` | 23 |
| 5868 | `_makeTeamMark()` | 16 |
| 5884 | `_syncRemoteWeapon()` | 22 |
| 5906 | `_updateTeamMark()` | 7 |
| 5913 | `_botEye()` | 1 |
| 5914 | `_enemyOf()` | 8 |
| 5922 | `_duelToken()` | 22 |
| 5944 | `_respawnEntity()` | 21 |
| 5965 | `_updateBot()` | 809 |
| 6774 | `_flushTraining()` | 13 |
| 6787 | `_updateBotNN()` | 71 |
| 6858 | `_botShootNN()` | 46 |
| 6904 | `_radarFoot()` | 38 |
| 6942 | `_updateRadar()` | 64 |
| 7006 | `_banner()` | 26 |
| 7032 | `_resultadoDaRodada()` | 4 |
| 7036 | `_showScoreboard()` | 48 |
| 7084 | `_updateWeaponHud()` | 35 |
| 7119 | `_updateHud()` | 80 |
| 7199 | `update()` | 89 |
| 7288 | `dispose()` | 44 |

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
