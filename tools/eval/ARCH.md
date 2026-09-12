# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.248 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7467 | 273 |
| `public/js/main.js` | 3486 | 282 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3139 linhas (42% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6079 | `_updateBot()` | ⚠️ candidato a extração |
| 579 | 611 | `constructor()` | 🔴 append-only |
| 248 | 2259 | `_resetPositions()` |  |
| 247 | 5284 | `_updatePlayer()` |  |
| 241 | 1288 | `_buildViewModels()` |  |
| 148 | 5544 | `_updatePickups()` |  |
| 137 | 4680 | `_botCtf()` |  |
| 115 | 1984 | `_touchControls()` |  |
| 98 | 5186 | `_moveEntity()` |  |
| 88 | 3064 | `_tryShoot()` |  |
| 88 | 7335 | `update()` | 🔴 append-only |
| 87 | 7248 | `_updateHud()` |  |
| 86 | 4395 | `_initCTF()` |  |
| 79 | 3525 | `_dmgArc()` |  |
| 76 | 4823 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `299–302` `355–449` `476–497` `1288–1687` `2825–2831` `2913–2999` `3018–3167` `3212–3265` `3753–3776` `3824–3907` `3979–3995` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `153–156` `207–207` `233–244` `539–550` `3405–3524` `4334–4394` `4562–4816` `4899–4921` `5284–5530` `5900–5917` `6027–6057` `6079–6900` | — |
| **MAPAS / MUNDO** | `1234–1287` `2259–2506` `4395–4538` `5544–5691` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1702–1711` `1826–1857` `2755–2767` `3777–3815` `3923–3978` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1190–1233` `2711–2733` `2749–2754` `2768–2774` `3525–3603` `3620–3673` `3689–3752` `7071–7134` `7165–7212` `7248–7334` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7335–7422 · `_dom()` 1190–1233 · `constructor()` 611–1189

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3747 de 7467 linhas (50%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 36 | `ANNOUNCER_LAB` | 4 |
| 40 | `VMLAB` | 8 |
| 48 | `VM_MAT_LEGACY` | 4 |
| 54 | `DROP_TTL` | 8 |
| 62 | `ROUNDS_MAX` | 27 |
| 92 | `CTF_CLOCK_SHOW` | 4 |
| 96 | `KILLS_PER_PLAYER` | 7 |
| 103 | `PACE` | 33 |
| 136 | `PAUSE_ARM_MS` | 9 |
| 146 | `confirmGate` | 7 |
| 157 | `BOT_AIM_PITCH` | 4 |
| 161 | `BOT_DMG_PLAYER` | 21 |
| 182 | `BOT_FAIR` | 5 |
| 187 | `BOT_MOVE2` | 15 |
| 211 | `BOT_FOCUS_MIN` | 22 |
| 237 | `BOT_TOKEN_REST` | 7 |
| 245 | `MOVE_MUL` | 6 |
| 252 | `MOVE2` | 5 |
| 257 | `RACK_OLD` | 4 |
| 261 | `RACK_RETA` | 25 |
| 288 | `RADIO` | 5 |
| 294 | `MK_LABELS` | 5 |
| 299 | `GUNFEEL` | 4 |
| 304 | `coneDoDisparo` | 23 |
| 328 | `D2R` | 4 |
| 332 | `DMG_FALLOFF` | 5 |
| 337 | `HS_MUL` | 3 |
| 340 | `BALL_CLASS` | 15 |
| 355 | `STATIC_CLASS` | 75 |
| 431 | `VM_KNOB` | 19 |
| 452 | `vmFovForAspect` | 24 |
| 476 | `VM_OFF` | 22 |
| 498 | `vmOffY` | 35 |
| 533 | `VMP` | 6 |
| 539 | `BOT_SKILLS` | 11 |
| 551 | `diffKey` | 4 |
| 556 | `rollBotSkill` | 7 |
| 563 | `botTier` | 4 |
| 567 | `_cyclePool` | 4 |
| 571 | `_rosterPool` | 15 |
| 586 | `pickMatchRoster` | 12 |
| 598 | `BOT_WEAPON_POOL` | 5 |
| 603 | `pickMatchWeapons` | 7 |
| 611 | `constructor()` | 579 |
| 1190 | `_dom()` | 44 |
| 1234 | `_buildEnv()` | 54 |
| 1288 | `_buildViewModels()` | 241 |
| 1529 | `_vmFrame` | 159 |
| 1688 | `_vmMontarTardio` | 14 |
| 1702 | `_makePuffTexture()` | 10 |
| 1712 | `_makeBloodTex()` | 19 |
| 1731 | `_makeBloodPoolTex()` | 21 |
| 1752 | `_bloodDecal()` | 16 |
| 1768 | `_makeBloodFx()` | 20 |
| 1788 | `_bloodSpatter()` | 18 |
| 1806 | `_bloodPoolAt()` | 6 |
| 1812 | `_updateBlood()` | 14 |
| 1826 | `_makeFlashTex()` | 22 |
| 1848 | `_makeFlashCoreTex()` | 10 |
| 1858 | `_input()` | 2 |
| 1860 | `_kd` | 45 |
| 1905 | `_ku` | 4 |
| 1909 | `_md` | 34 |
| 1943 | `_mu` | 7 |
| 1950 | `_mm` | 15 |
| 1965 | `_cc` | 1 |
| 1966 | `_blur` | 1 |
| 1967 | `_plc` | 17 |
| 1984 | `_touchControls()` | 115 |
| 2099 | `_aimAssist()` | 28 |
| 2127 | `_requestLock()` | 27 |
| 2154 | `_travaAtalhos()` | 4 |
| 2158 | `_soltaAtalhos()` | 5 |
| 2163 | `espectando()` | 2 |
| 2165 | `_acceptInput()` | 8 |
| 2173 | `_pauseBackdrop()` | 7 |
| 2180 | `_radioShow()` | 6 |
| 2186 | `_radioUi()` | 8 |
| 2194 | `_radioPick()` | 16 |
| 2210 | `start()` | 5 |
| 2215 | `_startAnnouncerLab()` | 9 |
| 2224 | `_startRound()` | 35 |
| 2259 | `_resetPositions()` | 248 |
| 2507 | `_checkCtfAlvo()` | 13 |
| 2520 | `_checkPace()` | 13 |
| 2533 | `_endRound()` | 34 |
| 2567 | `_roundWinnerVoice()` | 12 |
| 2579 | `_fimDaPartida()` | 7 |
| 2586 | `_endMatch()` | 61 |
| 2647 | `_ensureDolly()` | 41 |
| 2688 | `_tickDolly()` | 23 |
| 2711 | `setPaused()` | 23 |
| 2734 | `_now()` | 3 |
| 2737 | `pauseArmed()` | 1 |
| 2738 | `_syncPauseArm()` | 7 |
| 2745 | `resume()` | 4 |
| 2749 | `applySettings()` | 6 |
| 2755 | `_applyQuality()` | 13 |
| 2768 | `onResize()` | 7 |
| 2775 | `_switchTeam()` | 50 |
| 2825 | `_applyVmVisibility()` | 7 |
| 2832 | `_vmlabEnsure()` | 14 |
| 2846 | `_vmlabFrame()` | 28 |
| 2874 | `_tuneGet()` | 15 |
| 2889 | `_tune()` | 23 |
| 2912 | `_fxSet()` | 1 |
| 2913 | `_switchWeapon()` | 34 |
| 2947 | `_deploySfx()` | 7 |
| 2954 | `_scope()` | 17 |
| 2971 | `_zoomFov()` | 8 |
| 2979 | `_reloading()` | 1 |
| 2980 | `_startReload()` | 20 |
| 3000 | `_reloadLayers()` | 18 |
| 3018 | `_installRecoil()` | 33 |
| 3051 | `_shotRecoil()` | 13 |
| 3064 | `_tryShoot()` | 88 |
| 3152 | `_meleeHit()` | 16 |
| 3168 | `_meleeRange()` | 5 |
| 3173 | `_botMelee()` | 28 |
| 3201 | `_shotDamage()` | 11 |
| 3212 | `_fireHitscan()` | 54 |
| 3266 | `_targetFromHit()` | 9 |
| 3275 | `_penetrationExit()` | 20 |
| 3295 | `_surfaceOf()` | 27 |
| 3322 | `_armoredTarget()` | 3 |
| 3325 | `_fleshImpact()` | 38 |
| 3363 | `_fxVoice()` | 9 |
| 3372 | `_impactSfx()` | 17 |
| 3389 | `_tintFx()` | 16 |
| 3405 | `_damage()` | 41 |
| 3446 | `_playerHurtFx()` | 6 |
| 3452 | `_kill()` | 73 |
| 3525 | `_dmgArc()` | 79 |
| 3604 | `_mkBanner()` | 11 |
| 3615 | `_acertoPrevisto()` | 5 |
| 3620 | `_hitmarker()` | 15 |
| 3635 | `_dmgNumber()` | 20 |
| 3655 | `_feed()` | 19 |
| 3674 | `_skullIcon()` | 6 |
| 3680 | `_killfeedWeaponIcon()` | 9 |
| 3689 | `_wpnIcon()` | 64 |
| 3753 | `_tracer()` | 24 |
| 3777 | `_puff()` | 39 |
| 3816 | `_holeDecalMat()` | 8 |
| 3824 | `_flash()` | 66 |
| 3890 | `_muzzleWorld()` | 18 |
| 3908 | `_aimOrigin()` | 5 |
| 3913 | `_updateDoors()` | 10 |
| 3923 | `_updateFx()` | 56 |
| 3979 | `_ejectCasing()` | 17 |
| 3996 | `_makeCtfFlagTex()` | 23 |
| 4019 | `_paintFlagSymbol()` | 9 |
| 4028 | `_flagTexFor()` | 26 |
| 4054 | `_legadoSimbolo()` | 8 |
| 4062 | `_loadCtfSymbols()` | 22 |
| 4084 | `_makeCtfZoneTex()` | 31 |
| 4115 | `_makeSmokeTex()` | 8 |
| 4123 | `_updateSmokeHud()` | 4 |
| 4127 | `_grenadeSpatial()` | 14 |
| 4141 | `_spawnGrenade()` | 13 |
| 4154 | `_throwSmoke()` | 11 |
| 4165 | `_throwFrag()` | 13 |
| 4178 | `_explodeFrag()` | 40 |
| 4218 | `_corDaFumaca()` | 15 |
| 4233 | `_popSmoke()` | 21 |
| 4254 | `_updateGrenades()` | 35 |
| 4289 | `_teamColor()` | 14 |
| 4303 | `_teamInk()` | 6 |
| 4309 | `_factionOf()` | 1 |
| 4310 | `_voiceKey()` | 1 |
| 4311 | `_teamName()` | 1 |
| 4312 | `_teamTag()` | 6 |
| 4318 | `_plaqueta()` | 13 |
| 4331 | `_mirror()` | 3 |
| 4334 | `_botSeparation()` | 61 |
| 4395 | `_initCTF()` | 86 |
| 4481 | `_updateCTF()` | 58 |
| 4539 | `_ctfWin()` | 23 |
| 4562 | `_freeYaw()` | 25 |
| 4587 | `_pullString()` | 23 |
| 4610 | `_walkReach()` | 32 |
| 4642 | `_wpComp()` | 16 |
| 4658 | `_findPathLocal()` | 22 |
| 4680 | `_botCtf()` | 137 |
| 4817 | `_hideCtfHud()` | 6 |
| 4823 | `_updateCtfHud()` | 76 |
| 4899 | `_collide()` | 23 |
| 4922 | `_collideRot()` | 26 |
| 4948 | `_freeSpot()` | 30 |
| 4978 | `_retaAndavel()` | 20 |
| 4998 | `_walkDepth()` | 16 |
| 5014 | `_noteHit()` | 17 |
| 5031 | `_deathFeedback()` | 45 |
| 5076 | `_toggleCamView()` | 11 |
| 5087 | `_syncCamViewVis()` | 8 |
| 5095 | `_ensurePlayerTP()` | 25 |
| 5120 | `_updatePlayerTP()` | 35 |
| 5155 | `_tpDeath()` | 18 |
| 5173 | `_tpRevive()` | 13 |
| 5186 | `_moveEntity()` | 98 |
| 5284 | `_updatePlayer()` | 247 |
| 5531 | `_footstepSurface()` | 13 |
| 5544 | `_updatePickups()` | 148 |
| 5692 | `_wpnMode()` | 5 |
| 5697 | `_botWeapon()` | 10 |
| 5707 | `_municaoInfinita()` | 1 |
| 5708 | `_pickupAllowed()` | 7 |
| 5715 | `_grabPickup()` | 35 |
| 5750 | `_assentarNoChao()` | 10 |
| 5760 | `refreshPickupModels()` | 24 |
| 5784 | `_dropWeapon()` | 20 |
| 5804 | `_sumirDrop()` | 36 |
| 5840 | `_spawnY()` | 3 |
| 5843 | `_spawnYaw()` | 5 |
| 5848 | `_pickSpawn()` | 23 |
| 5871 | `_respawnPlayer()` | 29 |
| 5900 | `_losClear()` | 18 |
| 5918 | `_botCall()` | 41 |
| 5959 | `_teamMarkTex()` | 23 |
| 5982 | `_makeTeamMark()` | 16 |
| 5998 | `_syncRemoteWeapon()` | 22 |
| 6020 | `_updateTeamMark()` | 7 |
| 6027 | `_botEye()` | 1 |
| 6028 | `_enemyOf()` | 8 |
| 6036 | `_duelToken()` | 22 |
| 6058 | `_respawnEntity()` | 21 |
| 6079 | `_updateBot()` | 822 |
| 6901 | `_flushTraining()` | 13 |
| 6914 | `_updateBotNN()` | 73 |
| 6987 | `_botShootNN()` | 46 |
| 7033 | `_radarFoot()` | 38 |
| 7071 | `_updateRadar()` | 64 |
| 7135 | `_banner()` | 26 |
| 7161 | `_resultadoDaRodada()` | 4 |
| 7165 | `_showScoreboard()` | 48 |
| 7213 | `_updateWeaponHud()` | 35 |
| 7248 | `_updateHud()` | 87 |
| 7335 | `update()` | 88 |
| 7423 | `dispose()` | 44 |

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
