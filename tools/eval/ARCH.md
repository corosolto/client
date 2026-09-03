# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.213 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7236 | 266 |
| `public/js/main.js` | 3254 | 263 |
| `public/js/glbchars.js` | 845 | 60 |
| `public/js/characters.js` | 1069 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3104 linhas (43% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 809 | 5872 | `_updateBot()` | ⚠️ candidato a extração |
| 578 | 590 | `constructor()` | 🔴 append-only |
| 249 | 5121 | `_updatePlayer()` |  |
| 248 | 2225 | `_resetPositions()` |  |
| 241 | 1266 | `_buildViewModels()` |  |
| 148 | 5370 | `_updatePickups()` |  |
| 133 | 4494 | `_botCtf()` |  |
| 115 | 1962 | `_touchControls()` |  |
| 92 | 5029 | `_moveEntity()` |  |
| 88 | 7106 | `update()` | 🔴 append-only |
| 84 | 3017 | `_tryShoot()` |  |
| 84 | 4228 | `_initCTF()` |  |
| 80 | 7026 | `_updateHud()` |  |
| 79 | 3395 | `_dmgArc()` |  |
| 76 | 4633 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `305–307` `336–430` `457–478` `1266–1665` `2781–2787` `2869–2952` `2971–3172` `3623–3646` `3694–3777` `3849–3865` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `159–162` `213–213` `239–250` `520–531` `3274–3394` `4172–4227` `4390–4626` `4709–4731` `5121–5369` `5721–5738` `5820–5850` `5872–6680` | — |
| **MAPAS / MUNDO** | `1212–1265` `2225–2472` `4228–4367` `5370–5517` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1680–1689` `1804–1835` `2711–2723` `3647–3685` `3793–3848` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1168–1211` `2668–2689` `2705–2710` `2724–2730` `3395–3473` `3490–3543` `3559–3622` `6849–6912` `6943–6990` `7026–7105` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7106–7193 · `_dom()` 1168–1211 · `constructor()` 590–1167

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3685 de 7236 linhas (51%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 37 | `REPLAY_CAM` | 3 |
| 46 | `VMLAB` | 8 |
| 54 | `VM_MAT_LEGACY` | 4 |
| 60 | `DROP_TTL` | 8 |
| 68 | `ROUNDS_MAX` | 27 |
| 98 | `CTF_CLOCK_SHOW` | 4 |
| 102 | `KILLS_PER_PLAYER` | 7 |
| 109 | `PACE` | 33 |
| 142 | `PAUSE_ARM_MS` | 9 |
| 152 | `confirmGate` | 7 |
| 163 | `BOT_AIM_PITCH` | 4 |
| 167 | `BOT_DMG_PLAYER` | 21 |
| 188 | `BOT_FAIR` | 5 |
| 193 | `BOT_MOVE2` | 15 |
| 217 | `BOT_FOCUS_MIN` | 22 |
| 243 | `BOT_TOKEN_REST` | 7 |
| 251 | `MOVE_MUL` | 6 |
| 258 | `MOVE2` | 5 |
| 263 | `RACK_OLD` | 4 |
| 267 | `RACK_RETA` | 25 |
| 294 | `RADIO` | 5 |
| 300 | `MK_LABELS` | 5 |
| 305 | `GUNFEEL` | 3 |
| 309 | `D2R` | 4 |
| 313 | `DMG_FALLOFF` | 5 |
| 318 | `HS_MUL` | 3 |
| 321 | `BALL_CLASS` | 15 |
| 336 | `STATIC_CLASS` | 75 |
| 412 | `VM_KNOB` | 19 |
| 433 | `vmFovForAspect` | 24 |
| 457 | `VM_OFF` | 22 |
| 479 | `vmOffY` | 35 |
| 514 | `VMP` | 6 |
| 520 | `BOT_SKILLS` | 11 |
| 532 | `diffKey` | 4 |
| 537 | `rollBotSkill` | 7 |
| 544 | `botTier` | 4 |
| 548 | `_cyclePool` | 4 |
| 552 | `_rosterPool` | 15 |
| 567 | `pickMatchRoster` | 10 |
| 577 | `BOT_WEAPON_POOL` | 5 |
| 582 | `pickMatchWeapons` | 7 |
| 590 | `constructor()` | 578 |
| 1168 | `_dom()` | 44 |
| 1212 | `_buildEnv()` | 54 |
| 1266 | `_buildViewModels()` | 241 |
| 1507 | `_vmFrame` | 159 |
| 1666 | `_vmMontarTardio` | 14 |
| 1680 | `_makePuffTexture()` | 10 |
| 1690 | `_makeBloodTex()` | 19 |
| 1709 | `_makeBloodPoolTex()` | 21 |
| 1730 | `_bloodDecal()` | 16 |
| 1746 | `_makeBloodFx()` | 20 |
| 1766 | `_bloodSpatter()` | 18 |
| 1784 | `_bloodPoolAt()` | 6 |
| 1790 | `_updateBlood()` | 14 |
| 1804 | `_makeFlashTex()` | 22 |
| 1826 | `_makeFlashCoreTex()` | 10 |
| 1836 | `_input()` | 2 |
| 1838 | `_kd` | 45 |
| 1883 | `_ku` | 4 |
| 1887 | `_md` | 34 |
| 1921 | `_mu` | 7 |
| 1928 | `_mm` | 15 |
| 1943 | `_cc` | 1 |
| 1944 | `_blur` | 1 |
| 1945 | `_plc` | 17 |
| 1962 | `_touchControls()` | 115 |
| 2077 | `_aimAssist()` | 28 |
| 2105 | `_requestLock()` | 27 |
| 2132 | `_travaAtalhos()` | 4 |
| 2136 | `_soltaAtalhos()` | 5 |
| 2141 | `espectando()` | 2 |
| 2143 | `_acceptInput()` | 8 |
| 2151 | `_pauseBackdrop()` | 7 |
| 2158 | `_radioShow()` | 6 |
| 2164 | `_radioUi()` | 8 |
| 2172 | `_radioPick()` | 14 |
| 2186 | `start()` | 4 |
| 2190 | `_startRound()` | 35 |
| 2225 | `_resetPositions()` | 248 |
| 2473 | `_checkCtfAlvo()` | 13 |
| 2486 | `_checkPace()` | 13 |
| 2499 | `_endRound()` | 37 |
| 2536 | `_fimDaPartida()` | 7 |
| 2543 | `_endMatch()` | 61 |
| 2604 | `_ensureDolly()` | 41 |
| 2645 | `_tickDolly()` | 23 |
| 2668 | `setPaused()` | 22 |
| 2690 | `_now()` | 3 |
| 2693 | `pauseArmed()` | 1 |
| 2694 | `_syncPauseArm()` | 7 |
| 2701 | `resume()` | 4 |
| 2705 | `applySettings()` | 6 |
| 2711 | `_applyQuality()` | 13 |
| 2724 | `onResize()` | 7 |
| 2731 | `_switchTeam()` | 50 |
| 2781 | `_applyVmVisibility()` | 7 |
| 2788 | `_vmlabEnsure()` | 14 |
| 2802 | `_vmlabFrame()` | 28 |
| 2830 | `_tuneGet()` | 15 |
| 2845 | `_tune()` | 23 |
| 2868 | `_fxSet()` | 1 |
| 2869 | `_switchWeapon()` | 32 |
| 2901 | `_deploySfx()` | 7 |
| 2908 | `_scope()` | 17 |
| 2925 | `_zoomFov()` | 8 |
| 2933 | `_reloading()` | 1 |
| 2934 | `_startReload()` | 19 |
| 2953 | `_reloadLayers()` | 18 |
| 2971 | `_installRecoil()` | 33 |
| 3004 | `_shotRecoil()` | 13 |
| 3017 | `_tryShoot()` | 84 |
| 3101 | `_meleeHit()` | 14 |
| 3115 | `_shotDamage()` | 11 |
| 3126 | `_fireHitscan()` | 47 |
| 3173 | `_surfaceOf()` | 27 |
| 3200 | `_fleshImpact()` | 35 |
| 3235 | `_fxVoice()` | 9 |
| 3244 | `_impactSfx()` | 14 |
| 3258 | `_tintFx()` | 16 |
| 3274 | `_damage()` | 41 |
| 3315 | `_playerHurtFx()` | 6 |
| 3321 | `_kill()` | 74 |
| 3395 | `_dmgArc()` | 79 |
| 3474 | `_mkBanner()` | 11 |
| 3485 | `_acertoPrevisto()` | 5 |
| 3490 | `_hitmarker()` | 15 |
| 3505 | `_dmgNumber()` | 20 |
| 3525 | `_feed()` | 19 |
| 3544 | `_skullIcon()` | 6 |
| 3550 | `_killfeedWeaponIcon()` | 9 |
| 3559 | `_wpnIcon()` | 64 |
| 3623 | `_tracer()` | 24 |
| 3647 | `_puff()` | 39 |
| 3686 | `_holeDecalMat()` | 8 |
| 3694 | `_flash()` | 66 |
| 3760 | `_muzzleWorld()` | 18 |
| 3778 | `_aimOrigin()` | 5 |
| 3783 | `_updateDoors()` | 10 |
| 3793 | `_updateFx()` | 56 |
| 3849 | `_ejectCasing()` | 17 |
| 3866 | `_makeCtfFlagTex()` | 23 |
| 3889 | `_paintFlagSymbol()` | 9 |
| 3898 | `_flagTexFor()` | 26 |
| 3924 | `_legadoSimbolo()` | 8 |
| 3932 | `_loadCtfSymbols()` | 22 |
| 3954 | `_makeCtfZoneTex()` | 31 |
| 3985 | `_makeSmokeTex()` | 8 |
| 3993 | `_updateSmokeHud()` | 6 |
| 3999 | `_spawnGrenade()` | 11 |
| 4010 | `_throwSmoke()` | 8 |
| 4018 | `_throwFrag()` | 10 |
| 4028 | `_explodeFrag()` | 38 |
| 4066 | `_corDaFumaca()` | 15 |
| 4081 | `_popSmoke()` | 19 |
| 4100 | `_updateGrenades()` | 27 |
| 4127 | `_teamColor()` | 14 |
| 4141 | `_teamInk()` | 6 |
| 4147 | `_factionOf()` | 1 |
| 4148 | `_voiceKey()` | 1 |
| 4149 | `_teamName()` | 1 |
| 4150 | `_teamTag()` | 6 |
| 4156 | `_plaqueta()` | 13 |
| 4169 | `_mirror()` | 3 |
| 4172 | `_botSeparation()` | 56 |
| 4228 | `_initCTF()` | 84 |
| 4312 | `_updateCTF()` | 56 |
| 4368 | `_ctfWin()` | 22 |
| 4390 | `_freeYaw()` | 25 |
| 4415 | `_pullString()` | 23 |
| 4438 | `_walkReach()` | 18 |
| 4456 | `_wpComp()` | 16 |
| 4472 | `_findPathLocal()` | 22 |
| 4494 | `_botCtf()` | 133 |
| 4627 | `_hideCtfHud()` | 6 |
| 4633 | `_updateCtfHud()` | 76 |
| 4709 | `_collide()` | 23 |
| 4732 | `_collideRot()` | 26 |
| 4758 | `_freeSpot()` | 30 |
| 4788 | `_retaAndavel()` | 20 |
| 4808 | `_walkDepth()` | 16 |
| 4824 | `_noteHit()` | 17 |
| 4841 | `_deathFeedback()` | 43 |
| 4884 | `_updateReplayCam()` | 35 |
| 4919 | `_toggleCamView()` | 11 |
| 4930 | `_syncCamViewVis()` | 8 |
| 4938 | `_ensurePlayerTP()` | 25 |
| 4963 | `_updatePlayerTP()` | 35 |
| 4998 | `_tpDeath()` | 18 |
| 5016 | `_tpRevive()` | 13 |
| 5029 | `_moveEntity()` | 92 |
| 5121 | `_updatePlayer()` | 249 |
| 5370 | `_updatePickups()` | 148 |
| 5518 | `_wpnMode()` | 5 |
| 5523 | `_botWeapon()` | 10 |
| 5533 | `_municaoInfinita()` | 1 |
| 5534 | `_pickupAllowed()` | 7 |
| 5541 | `_grabPickup()` | 35 |
| 5576 | `_assentarNoChao()` | 10 |
| 5586 | `refreshPickupModels()` | 24 |
| 5610 | `_dropWeapon()` | 20 |
| 5630 | `_sumirDrop()` | 36 |
| 5666 | `_spawnY()` | 3 |
| 5669 | `_pickSpawn()` | 23 |
| 5692 | `_respawnPlayer()` | 29 |
| 5721 | `_losClear()` | 18 |
| 5739 | `_botCall()` | 37 |
| 5776 | `_teamMarkTex()` | 23 |
| 5799 | `_makeTeamMark()` | 14 |
| 5813 | `_updateTeamMark()` | 7 |
| 5820 | `_botEye()` | 1 |
| 5821 | `_enemyOf()` | 8 |
| 5829 | `_duelToken()` | 22 |
| 5851 | `_respawnEntity()` | 21 |
| 5872 | `_updateBot()` | 809 |
| 6681 | `_flushTraining()` | 13 |
| 6694 | `_updateBotNN()` | 71 |
| 6765 | `_botShootNN()` | 46 |
| 6811 | `_radarFoot()` | 38 |
| 6849 | `_updateRadar()` | 64 |
| 6913 | `_banner()` | 26 |
| 6939 | `_resultadoDaRodada()` | 4 |
| 6943 | `_showScoreboard()` | 48 |
| 6991 | `_updateWeaponHud()` | 35 |
| 7026 | `_updateHud()` | 80 |
| 7106 | `update()` | 88 |
| 7194 | `dispose()` | 42 |

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
