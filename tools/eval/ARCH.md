# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.246 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7435 | 271 |
| `public/js/main.js` | 3408 | 278 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3131 linhas (42% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6049 | `_updateBot()` | ⚠️ candidato a extração |
| 579 | 587 | `constructor()` | 🔴 append-only |
| 248 | 2235 | `_resetPositions()` |  |
| 247 | 5254 | `_updatePlayer()` |  |
| 241 | 1264 | `_buildViewModels()` |  |
| 148 | 5514 | `_updatePickups()` |  |
| 135 | 4652 | `_botCtf()` |  |
| 115 | 1960 | `_touchControls()` |  |
| 98 | 5156 | `_moveEntity()` |  |
| 87 | 7218 | `_updateHud()` |  |
| 86 | 4369 | `_initCTF()` |  |
| 86 | 7305 | `update()` | 🔴 append-only |
| 84 | 3049 | `_tryShoot()` |  |
| 79 | 3504 | `_dmgArc()` |  |
| 76 | 4793 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `300–302` `331–425` `452–473` `1264–1663` `2810–2816` `2898–2984` `3003–3146` `3191–3244` `3732–3755` `3803–3886` `3958–3974` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `154–157` `208–208` `234–245` `515–526` `3384–3503` `4313–4368` `4534–4786` `4869–4891` `5254–5500` `5870–5887` `5997–6027` `6049–6870` | — |
| **MAPAS / MUNDO** | `1210–1263` `2235–2482` `4369–4510` `5514–5661` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1678–1687` `1802–1833` `2731–2752` `3756–3794` `3902–3957` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1166–1209` `2687–2709` `2725–2730` `2753–2759` `3504–3582` `3599–3652` `3668–3731` `7041–7104` `7135–7182` `7218–7304` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7305–7390 · `_dom()` 1166–1209 · `constructor()` 587–1165

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3740 de 7435 linhas (50%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 300 | `GUNFEEL` | 3 |
| 304 | `D2R` | 4 |
| 308 | `DMG_FALLOFF` | 5 |
| 313 | `HS_MUL` | 3 |
| 316 | `BALL_CLASS` | 15 |
| 331 | `STATIC_CLASS` | 75 |
| 407 | `VM_KNOB` | 19 |
| 428 | `vmFovForAspect` | 24 |
| 452 | `VM_OFF` | 22 |
| 474 | `vmOffY` | 35 |
| 509 | `VMP` | 6 |
| 515 | `BOT_SKILLS` | 11 |
| 527 | `diffKey` | 4 |
| 532 | `rollBotSkill` | 7 |
| 539 | `botTier` | 4 |
| 543 | `_cyclePool` | 4 |
| 547 | `_rosterPool` | 15 |
| 562 | `pickMatchRoster` | 12 |
| 574 | `BOT_WEAPON_POOL` | 5 |
| 579 | `pickMatchWeapons` | 7 |
| 587 | `constructor()` | 579 |
| 1166 | `_dom()` | 44 |
| 1210 | `_buildEnv()` | 54 |
| 1264 | `_buildViewModels()` | 241 |
| 1505 | `_vmFrame` | 159 |
| 1664 | `_vmMontarTardio` | 14 |
| 1678 | `_makePuffTexture()` | 10 |
| 1688 | `_makeBloodTex()` | 19 |
| 1707 | `_makeBloodPoolTex()` | 21 |
| 1728 | `_bloodDecal()` | 16 |
| 1744 | `_makeBloodFx()` | 20 |
| 1764 | `_bloodSpatter()` | 18 |
| 1782 | `_bloodPoolAt()` | 6 |
| 1788 | `_updateBlood()` | 14 |
| 1802 | `_makeFlashTex()` | 22 |
| 1824 | `_makeFlashCoreTex()` | 10 |
| 1834 | `_input()` | 2 |
| 1836 | `_kd` | 45 |
| 1881 | `_ku` | 4 |
| 1885 | `_md` | 34 |
| 1919 | `_mu` | 7 |
| 1926 | `_mm` | 15 |
| 1941 | `_cc` | 1 |
| 1942 | `_blur` | 1 |
| 1943 | `_plc` | 17 |
| 1960 | `_touchControls()` | 115 |
| 2075 | `_aimAssist()` | 28 |
| 2103 | `_requestLock()` | 27 |
| 2130 | `_travaAtalhos()` | 4 |
| 2134 | `_soltaAtalhos()` | 5 |
| 2139 | `espectando()` | 2 |
| 2141 | `_acceptInput()` | 8 |
| 2149 | `_pauseBackdrop()` | 7 |
| 2156 | `_radioShow()` | 6 |
| 2162 | `_radioUi()` | 8 |
| 2170 | `_radioPick()` | 16 |
| 2186 | `start()` | 5 |
| 2191 | `_startAnnouncerLab()` | 9 |
| 2200 | `_startRound()` | 35 |
| 2235 | `_resetPositions()` | 248 |
| 2483 | `_checkCtfAlvo()` | 13 |
| 2496 | `_checkPace()` | 13 |
| 2509 | `_endRound()` | 34 |
| 2543 | `_roundWinnerVoice()` | 12 |
| 2555 | `_fimDaPartida()` | 7 |
| 2562 | `_endMatch()` | 61 |
| 2623 | `_ensureDolly()` | 41 |
| 2664 | `_tickDolly()` | 23 |
| 2687 | `setPaused()` | 23 |
| 2710 | `_now()` | 3 |
| 2713 | `pauseArmed()` | 1 |
| 2714 | `_syncPauseArm()` | 7 |
| 2721 | `resume()` | 4 |
| 2725 | `applySettings()` | 6 |
| 2731 | `_applyQuality()` | 22 |
| 2753 | `onResize()` | 7 |
| 2760 | `_switchTeam()` | 50 |
| 2810 | `_applyVmVisibility()` | 7 |
| 2817 | `_vmlabEnsure()` | 14 |
| 2831 | `_vmlabFrame()` | 28 |
| 2859 | `_tuneGet()` | 15 |
| 2874 | `_tune()` | 23 |
| 2897 | `_fxSet()` | 1 |
| 2898 | `_switchWeapon()` | 34 |
| 2932 | `_deploySfx()` | 7 |
| 2939 | `_scope()` | 17 |
| 2956 | `_zoomFov()` | 8 |
| 2964 | `_reloading()` | 1 |
| 2965 | `_startReload()` | 20 |
| 2985 | `_reloadLayers()` | 18 |
| 3003 | `_installRecoil()` | 33 |
| 3036 | `_shotRecoil()` | 13 |
| 3049 | `_tryShoot()` | 84 |
| 3133 | `_meleeHit()` | 14 |
| 3147 | `_meleeRange()` | 5 |
| 3152 | `_botMelee()` | 28 |
| 3180 | `_shotDamage()` | 11 |
| 3191 | `_fireHitscan()` | 54 |
| 3245 | `_targetFromHit()` | 9 |
| 3254 | `_penetrationExit()` | 20 |
| 3274 | `_surfaceOf()` | 27 |
| 3301 | `_armoredTarget()` | 3 |
| 3304 | `_fleshImpact()` | 38 |
| 3342 | `_fxVoice()` | 9 |
| 3351 | `_impactSfx()` | 17 |
| 3368 | `_tintFx()` | 16 |
| 3384 | `_damage()` | 41 |
| 3425 | `_playerHurtFx()` | 6 |
| 3431 | `_kill()` | 73 |
| 3504 | `_dmgArc()` | 79 |
| 3583 | `_mkBanner()` | 11 |
| 3594 | `_acertoPrevisto()` | 5 |
| 3599 | `_hitmarker()` | 15 |
| 3614 | `_dmgNumber()` | 20 |
| 3634 | `_feed()` | 19 |
| 3653 | `_skullIcon()` | 6 |
| 3659 | `_killfeedWeaponIcon()` | 9 |
| 3668 | `_wpnIcon()` | 64 |
| 3732 | `_tracer()` | 24 |
| 3756 | `_puff()` | 39 |
| 3795 | `_holeDecalMat()` | 8 |
| 3803 | `_flash()` | 66 |
| 3869 | `_muzzleWorld()` | 18 |
| 3887 | `_aimOrigin()` | 5 |
| 3892 | `_updateDoors()` | 10 |
| 3902 | `_updateFx()` | 56 |
| 3958 | `_ejectCasing()` | 17 |
| 3975 | `_makeCtfFlagTex()` | 23 |
| 3998 | `_paintFlagSymbol()` | 9 |
| 4007 | `_flagTexFor()` | 26 |
| 4033 | `_legadoSimbolo()` | 8 |
| 4041 | `_loadCtfSymbols()` | 22 |
| 4063 | `_makeCtfZoneTex()` | 31 |
| 4094 | `_makeSmokeTex()` | 8 |
| 4102 | `_updateSmokeHud()` | 4 |
| 4106 | `_grenadeSpatial()` | 14 |
| 4120 | `_spawnGrenade()` | 13 |
| 4133 | `_throwSmoke()` | 11 |
| 4144 | `_throwFrag()` | 13 |
| 4157 | `_explodeFrag()` | 40 |
| 4197 | `_corDaFumaca()` | 15 |
| 4212 | `_popSmoke()` | 21 |
| 4233 | `_updateGrenades()` | 35 |
| 4268 | `_teamColor()` | 14 |
| 4282 | `_teamInk()` | 6 |
| 4288 | `_factionOf()` | 1 |
| 4289 | `_voiceKey()` | 1 |
| 4290 | `_teamName()` | 1 |
| 4291 | `_teamTag()` | 6 |
| 4297 | `_plaqueta()` | 13 |
| 4310 | `_mirror()` | 3 |
| 4313 | `_botSeparation()` | 56 |
| 4369 | `_initCTF()` | 86 |
| 4455 | `_updateCTF()` | 56 |
| 4511 | `_ctfWin()` | 23 |
| 4534 | `_freeYaw()` | 25 |
| 4559 | `_pullString()` | 23 |
| 4582 | `_walkReach()` | 32 |
| 4614 | `_wpComp()` | 16 |
| 4630 | `_findPathLocal()` | 22 |
| 4652 | `_botCtf()` | 135 |
| 4787 | `_hideCtfHud()` | 6 |
| 4793 | `_updateCtfHud()` | 76 |
| 4869 | `_collide()` | 23 |
| 4892 | `_collideRot()` | 26 |
| 4918 | `_freeSpot()` | 30 |
| 4948 | `_retaAndavel()` | 20 |
| 4968 | `_walkDepth()` | 16 |
| 4984 | `_noteHit()` | 17 |
| 5001 | `_deathFeedback()` | 45 |
| 5046 | `_toggleCamView()` | 11 |
| 5057 | `_syncCamViewVis()` | 8 |
| 5065 | `_ensurePlayerTP()` | 25 |
| 5090 | `_updatePlayerTP()` | 35 |
| 5125 | `_tpDeath()` | 18 |
| 5143 | `_tpRevive()` | 13 |
| 5156 | `_moveEntity()` | 98 |
| 5254 | `_updatePlayer()` | 247 |
| 5501 | `_footstepSurface()` | 13 |
| 5514 | `_updatePickups()` | 148 |
| 5662 | `_wpnMode()` | 5 |
| 5667 | `_botWeapon()` | 10 |
| 5677 | `_municaoInfinita()` | 1 |
| 5678 | `_pickupAllowed()` | 7 |
| 5685 | `_grabPickup()` | 35 |
| 5720 | `_assentarNoChao()` | 10 |
| 5730 | `refreshPickupModels()` | 24 |
| 5754 | `_dropWeapon()` | 20 |
| 5774 | `_sumirDrop()` | 36 |
| 5810 | `_spawnY()` | 3 |
| 5813 | `_spawnYaw()` | 5 |
| 5818 | `_pickSpawn()` | 23 |
| 5841 | `_respawnPlayer()` | 29 |
| 5870 | `_losClear()` | 18 |
| 5888 | `_botCall()` | 41 |
| 5929 | `_teamMarkTex()` | 23 |
| 5952 | `_makeTeamMark()` | 16 |
| 5968 | `_syncRemoteWeapon()` | 22 |
| 5990 | `_updateTeamMark()` | 7 |
| 5997 | `_botEye()` | 1 |
| 5998 | `_enemyOf()` | 8 |
| 6006 | `_duelToken()` | 22 |
| 6028 | `_respawnEntity()` | 21 |
| 6049 | `_updateBot()` | 822 |
| 6871 | `_flushTraining()` | 13 |
| 6884 | `_updateBotNN()` | 73 |
| 6957 | `_botShootNN()` | 46 |
| 7003 | `_radarFoot()` | 38 |
| 7041 | `_updateRadar()` | 64 |
| 7105 | `_banner()` | 26 |
| 7131 | `_resultadoDaRodada()` | 4 |
| 7135 | `_showScoreboard()` | 48 |
| 7183 | `_updateWeaponHud()` | 35 |
| 7218 | `_updateHud()` | 87 |
| 7305 | `update()` | 86 |
| 7391 | `dispose()` | 44 |

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
