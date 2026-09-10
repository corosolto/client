# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.246 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7518 | 272 |
| `public/js/main.js` | 3408 | 278 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3163 linhas (42% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6130 | `_updateBot()` | ⚠️ candidato a extração |
| 595 | 588 | `constructor()` | 🔴 append-only |
| 261 | 5321 | `_updatePlayer()` |  |
| 251 | 2254 | `_resetPositions()` |  |
| 241 | 1281 | `_buildViewModels()` |  |
| 148 | 5595 | `_updatePickups()` |  |
| 135 | 4719 | `_botCtf()` |  |
| 116 | 1978 | `_touchControls()` |  |
| 98 | 5223 | `_moveEntity()` |  |
| 87 | 7299 | `_updateHud()` |  |
| 86 | 4436 | `_initCTF()` |  |
| 86 | 7386 | `update()` | 🔴 append-only |
| 82 | 3103 | `_tryShoot()` |  |
| 79 | 3569 | `_dmgArc()` |  |
| 76 | 4860 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `301–303` `332–426` `453–474` `1281–1680` `2835–2865` `2947–3038` `3057–3184` `3198–3211` `3256–3309` `3797–3820` `3868–3953` `4025–4041` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `155–158` `209–209` `235–246` `516–527` `3449–3568` `4380–4435` `4601–4853` `4936–4958` `5321–5581` `5951–5968` `6078–6108` `6130–6951` | — |
| **MAPAS / MUNDO** | `1227–1280` `2254–2504` `4436–4577` `5595–5742` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1695–1704` `1819–1850` `2753–2765` `3821–3859` `3969–4024` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1183–1226` `2709–2731` `2747–2752` `2766–2780` `3569–3647` `3664–3717` `3733–3796` `7122–7185` `7216–7263` `7299–7385` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7386–7471 · `_dom()` 1183–1226 · `constructor()` 588–1182

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3785 de 7518 linhas (50%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 38 | `ANNOUNCER_LAB` | 4 |
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
| 254 | `MOVE2` | 5 |
| 259 | `RACK_OLD` | 4 |
| 263 | `RACK_RETA` | 25 |
| 290 | `RADIO` | 5 |
| 296 | `MK_LABELS` | 5 |
| 301 | `GUNFEEL` | 3 |
| 305 | `D2R` | 4 |
| 309 | `DMG_FALLOFF` | 5 |
| 314 | `HS_MUL` | 3 |
| 317 | `BALL_CLASS` | 15 |
| 332 | `STATIC_CLASS` | 75 |
| 408 | `VM_KNOB` | 19 |
| 429 | `vmFovForAspect` | 24 |
| 453 | `VM_OFF` | 22 |
| 475 | `vmOffY` | 35 |
| 510 | `VMP` | 6 |
| 516 | `BOT_SKILLS` | 11 |
| 528 | `diffKey` | 4 |
| 533 | `rollBotSkill` | 7 |
| 540 | `botTier` | 4 |
| 544 | `_cyclePool` | 4 |
| 548 | `_rosterPool` | 15 |
| 563 | `pickMatchRoster` | 12 |
| 575 | `BOT_WEAPON_POOL` | 5 |
| 580 | `pickMatchWeapons` | 7 |
| 588 | `constructor()` | 595 |
| 1183 | `_dom()` | 44 |
| 1227 | `_buildEnv()` | 54 |
| 1281 | `_buildViewModels()` | 241 |
| 1522 | `_vmFrame` | 159 |
| 1681 | `_vmMontarTardio` | 14 |
| 1695 | `_makePuffTexture()` | 10 |
| 1705 | `_makeBloodTex()` | 19 |
| 1724 | `_makeBloodPoolTex()` | 21 |
| 1745 | `_bloodDecal()` | 16 |
| 1761 | `_makeBloodFx()` | 20 |
| 1781 | `_bloodSpatter()` | 18 |
| 1799 | `_bloodPoolAt()` | 6 |
| 1805 | `_updateBlood()` | 14 |
| 1819 | `_makeFlashTex()` | 22 |
| 1841 | `_makeFlashCoreTex()` | 10 |
| 1851 | `_input()` | 2 |
| 1853 | `_kd` | 45 |
| 1898 | `_ku` | 4 |
| 1902 | `_md` | 35 |
| 1937 | `_mu` | 7 |
| 1944 | `_mm` | 15 |
| 1959 | `_cc` | 1 |
| 1960 | `_blur` | 1 |
| 1961 | `_plc` | 17 |
| 1978 | `_touchControls()` | 116 |
| 2094 | `_aimAssist()` | 28 |
| 2122 | `_requestLock()` | 27 |
| 2149 | `_travaAtalhos()` | 4 |
| 2153 | `_soltaAtalhos()` | 5 |
| 2158 | `espectando()` | 2 |
| 2160 | `_acceptInput()` | 8 |
| 2168 | `_pauseBackdrop()` | 7 |
| 2175 | `_radioShow()` | 6 |
| 2181 | `_radioUi()` | 8 |
| 2189 | `_radioPick()` | 16 |
| 2205 | `start()` | 5 |
| 2210 | `_startAnnouncerLab()` | 9 |
| 2219 | `_startRound()` | 35 |
| 2254 | `_resetPositions()` | 251 |
| 2505 | `_checkCtfAlvo()` | 13 |
| 2518 | `_checkPace()` | 13 |
| 2531 | `_endRound()` | 34 |
| 2565 | `_roundWinnerVoice()` | 12 |
| 2577 | `_fimDaPartida()` | 7 |
| 2584 | `_endMatch()` | 61 |
| 2645 | `_ensureDolly()` | 41 |
| 2686 | `_tickDolly()` | 23 |
| 2709 | `setPaused()` | 23 |
| 2732 | `_now()` | 3 |
| 2735 | `pauseArmed()` | 1 |
| 2736 | `_syncPauseArm()` | 7 |
| 2743 | `resume()` | 4 |
| 2747 | `applySettings()` | 6 |
| 2753 | `_applyQuality()` | 13 |
| 2766 | `onResize()` | 15 |
| 2781 | `_switchTeam()` | 54 |
| 2835 | `_applyVmVisibility()` | 31 |
| 2866 | `_vmlabEnsure()` | 14 |
| 2880 | `_vmlabFrame()` | 28 |
| 2908 | `_tuneGet()` | 15 |
| 2923 | `_tune()` | 23 |
| 2946 | `_fxSet()` | 1 |
| 2947 | `_switchWeapon()` | 37 |
| 2984 | `_deploySfx()` | 7 |
| 2991 | `_scope()` | 17 |
| 3008 | `_zoomFov()` | 8 |
| 3016 | `_reloading()` | 1 |
| 3017 | `_startReload()` | 22 |
| 3039 | `_reloadLayers()` | 18 |
| 3057 | `_installRecoil()` | 33 |
| 3090 | `_shotRecoil()` | 13 |
| 3103 | `_tryShoot()` | 82 |
| 3185 | `_tryKnifeAttack()` | 13 |
| 3198 | `_meleeHit()` | 14 |
| 3212 | `_meleeRange()` | 5 |
| 3217 | `_botMelee()` | 28 |
| 3245 | `_shotDamage()` | 11 |
| 3256 | `_fireHitscan()` | 54 |
| 3310 | `_targetFromHit()` | 9 |
| 3319 | `_penetrationExit()` | 20 |
| 3339 | `_surfaceOf()` | 27 |
| 3366 | `_armoredTarget()` | 3 |
| 3369 | `_fleshImpact()` | 38 |
| 3407 | `_fxVoice()` | 9 |
| 3416 | `_impactSfx()` | 17 |
| 3433 | `_tintFx()` | 16 |
| 3449 | `_damage()` | 41 |
| 3490 | `_playerHurtFx()` | 6 |
| 3496 | `_kill()` | 73 |
| 3569 | `_dmgArc()` | 79 |
| 3648 | `_mkBanner()` | 11 |
| 3659 | `_acertoPrevisto()` | 5 |
| 3664 | `_hitmarker()` | 15 |
| 3679 | `_dmgNumber()` | 20 |
| 3699 | `_feed()` | 19 |
| 3718 | `_skullIcon()` | 6 |
| 3724 | `_killfeedWeaponIcon()` | 9 |
| 3733 | `_wpnIcon()` | 64 |
| 3797 | `_tracer()` | 24 |
| 3821 | `_puff()` | 39 |
| 3860 | `_holeDecalMat()` | 8 |
| 3868 | `_flash()` | 66 |
| 3934 | `_muzzleWorld()` | 20 |
| 3954 | `_aimOrigin()` | 5 |
| 3959 | `_updateDoors()` | 10 |
| 3969 | `_updateFx()` | 56 |
| 4025 | `_ejectCasing()` | 17 |
| 4042 | `_makeCtfFlagTex()` | 23 |
| 4065 | `_paintFlagSymbol()` | 9 |
| 4074 | `_flagTexFor()` | 26 |
| 4100 | `_legadoSimbolo()` | 8 |
| 4108 | `_loadCtfSymbols()` | 22 |
| 4130 | `_makeCtfZoneTex()` | 31 |
| 4161 | `_makeSmokeTex()` | 8 |
| 4169 | `_updateSmokeHud()` | 4 |
| 4173 | `_grenadeSpatial()` | 14 |
| 4187 | `_spawnGrenade()` | 13 |
| 4200 | `_throwSmoke()` | 11 |
| 4211 | `_throwFrag()` | 13 |
| 4224 | `_explodeFrag()` | 40 |
| 4264 | `_corDaFumaca()` | 15 |
| 4279 | `_popSmoke()` | 21 |
| 4300 | `_updateGrenades()` | 35 |
| 4335 | `_teamColor()` | 14 |
| 4349 | `_teamInk()` | 6 |
| 4355 | `_factionOf()` | 1 |
| 4356 | `_voiceKey()` | 1 |
| 4357 | `_teamName()` | 1 |
| 4358 | `_teamTag()` | 6 |
| 4364 | `_plaqueta()` | 13 |
| 4377 | `_mirror()` | 3 |
| 4380 | `_botSeparation()` | 56 |
| 4436 | `_initCTF()` | 86 |
| 4522 | `_updateCTF()` | 56 |
| 4578 | `_ctfWin()` | 23 |
| 4601 | `_freeYaw()` | 25 |
| 4626 | `_pullString()` | 23 |
| 4649 | `_walkReach()` | 32 |
| 4681 | `_wpComp()` | 16 |
| 4697 | `_findPathLocal()` | 22 |
| 4719 | `_botCtf()` | 135 |
| 4854 | `_hideCtfHud()` | 6 |
| 4860 | `_updateCtfHud()` | 76 |
| 4936 | `_collide()` | 23 |
| 4959 | `_collideRot()` | 26 |
| 4985 | `_freeSpot()` | 30 |
| 5015 | `_retaAndavel()` | 20 |
| 5035 | `_walkDepth()` | 16 |
| 5051 | `_noteHit()` | 17 |
| 5068 | `_deathFeedback()` | 45 |
| 5113 | `_toggleCamView()` | 11 |
| 5124 | `_syncCamViewVis()` | 8 |
| 5132 | `_ensurePlayerTP()` | 25 |
| 5157 | `_updatePlayerTP()` | 35 |
| 5192 | `_tpDeath()` | 18 |
| 5210 | `_tpRevive()` | 13 |
| 5223 | `_moveEntity()` | 98 |
| 5321 | `_updatePlayer()` | 261 |
| 5582 | `_footstepSurface()` | 13 |
| 5595 | `_updatePickups()` | 148 |
| 5743 | `_wpnMode()` | 5 |
| 5748 | `_botWeapon()` | 10 |
| 5758 | `_municaoInfinita()` | 1 |
| 5759 | `_pickupAllowed()` | 7 |
| 5766 | `_grabPickup()` | 35 |
| 5801 | `_assentarNoChao()` | 10 |
| 5811 | `refreshPickupModels()` | 24 |
| 5835 | `_dropWeapon()` | 20 |
| 5855 | `_sumirDrop()` | 36 |
| 5891 | `_spawnY()` | 3 |
| 5894 | `_spawnYaw()` | 5 |
| 5899 | `_pickSpawn()` | 23 |
| 5922 | `_respawnPlayer()` | 29 |
| 5951 | `_losClear()` | 18 |
| 5969 | `_botCall()` | 41 |
| 6010 | `_teamMarkTex()` | 23 |
| 6033 | `_makeTeamMark()` | 16 |
| 6049 | `_syncRemoteWeapon()` | 22 |
| 6071 | `_updateTeamMark()` | 7 |
| 6078 | `_botEye()` | 1 |
| 6079 | `_enemyOf()` | 8 |
| 6087 | `_duelToken()` | 22 |
| 6109 | `_respawnEntity()` | 21 |
| 6130 | `_updateBot()` | 822 |
| 6952 | `_flushTraining()` | 13 |
| 6965 | `_updateBotNN()` | 73 |
| 7038 | `_botShootNN()` | 46 |
| 7084 | `_radarFoot()` | 38 |
| 7122 | `_updateRadar()` | 64 |
| 7186 | `_banner()` | 26 |
| 7212 | `_resultadoDaRodada()` | 4 |
| 7216 | `_showScoreboard()` | 48 |
| 7264 | `_updateWeaponHud()` | 35 |
| 7299 | `_updateHud()` | 87 |
| 7386 | `update()` | 86 |
| 7472 | `dispose()` | 46 |

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
