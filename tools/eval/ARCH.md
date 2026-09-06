# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.235 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7408 | 269 |
| `public/js/main.js` | 3403 | 278 |
| `public/js/glbchars.js` | 845 | 60 |
| `public/js/characters.js` | 1069 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3134 linhas (42% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 823 | 6019 | `_updateBot()` | ⚠️ candidato a extração |
| 579 | 596 | `constructor()` | 🔴 append-only |
| 248 | 2244 | `_resetPositions()` |  |
| 247 | 5224 | `_updatePlayer()` |  |
| 241 | 1273 | `_buildViewModels()` |  |
| 148 | 5484 | `_updatePickups()` |  |
| 135 | 4622 | `_botCtf()` |  |
| 115 | 1969 | `_touchControls()` |  |
| 98 | 5126 | `_moveEntity()` |  |
| 88 | 7189 | `_updateHud()` |  |
| 87 | 7277 | `update()` | 🔴 append-only |
| 86 | 4339 | `_initCTF()` |  |
| 84 | 3049 | `_tryShoot()` |  |
| 79 | 3474 | `_dmgArc()` |  |
| 76 | 4763 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `311–313` `342–436` `463–484` `1273–1672` `2810–2816` `2898–2984` `3003–3149` `3195–3241` `3702–3725` `3773–3856` `3928–3944` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `165–168` `219–219` `245–256` `526–537` `3352–3473` `4283–4338` `4504–4756` `4839–4861` `5224–5470` `5840–5857` `5967–5997` `6019–6841` | — |
| **MAPAS / MUNDO** | `1219–1272` `2244–2491` `4339–4480` `5484–5631` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1687–1696` `1811–1842` `2740–2752` `3726–3764` `3872–3927` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1175–1218` `2696–2718` `2734–2739` `2753–2759` `3474–3552` `3569–3622` `3638–3701` `7012–7075` `7106–7153` `7189–7276` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7277–7363 · `_dom()` 1175–1218 · `constructor()` 596–1174

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3731 de 7408 linhas (50%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 36 | `ANNOUNCER_LAB` | 16 |
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
| 264 | `MOVE2` | 5 |
| 269 | `RACK_OLD` | 4 |
| 273 | `RACK_RETA` | 25 |
| 300 | `RADIO` | 5 |
| 306 | `MK_LABELS` | 5 |
| 311 | `GUNFEEL` | 3 |
| 315 | `D2R` | 4 |
| 319 | `DMG_FALLOFF` | 5 |
| 324 | `HS_MUL` | 3 |
| 327 | `BALL_CLASS` | 15 |
| 342 | `STATIC_CLASS` | 75 |
| 418 | `VM_KNOB` | 19 |
| 439 | `vmFovForAspect` | 24 |
| 463 | `VM_OFF` | 22 |
| 485 | `vmOffY` | 35 |
| 520 | `VMP` | 6 |
| 526 | `BOT_SKILLS` | 11 |
| 538 | `diffKey` | 4 |
| 543 | `rollBotSkill` | 7 |
| 550 | `botTier` | 4 |
| 554 | `_cyclePool` | 4 |
| 558 | `_rosterPool` | 15 |
| 573 | `pickMatchRoster` | 10 |
| 583 | `BOT_WEAPON_POOL` | 5 |
| 588 | `pickMatchWeapons` | 7 |
| 596 | `constructor()` | 579 |
| 1175 | `_dom()` | 44 |
| 1219 | `_buildEnv()` | 54 |
| 1273 | `_buildViewModels()` | 241 |
| 1514 | `_vmFrame` | 159 |
| 1673 | `_vmMontarTardio` | 14 |
| 1687 | `_makePuffTexture()` | 10 |
| 1697 | `_makeBloodTex()` | 19 |
| 1716 | `_makeBloodPoolTex()` | 21 |
| 1737 | `_bloodDecal()` | 16 |
| 1753 | `_makeBloodFx()` | 20 |
| 1773 | `_bloodSpatter()` | 18 |
| 1791 | `_bloodPoolAt()` | 6 |
| 1797 | `_updateBlood()` | 14 |
| 1811 | `_makeFlashTex()` | 22 |
| 1833 | `_makeFlashCoreTex()` | 10 |
| 1843 | `_input()` | 2 |
| 1845 | `_kd` | 45 |
| 1890 | `_ku` | 4 |
| 1894 | `_md` | 34 |
| 1928 | `_mu` | 7 |
| 1935 | `_mm` | 15 |
| 1950 | `_cc` | 1 |
| 1951 | `_blur` | 1 |
| 1952 | `_plc` | 17 |
| 1969 | `_touchControls()` | 115 |
| 2084 | `_aimAssist()` | 28 |
| 2112 | `_requestLock()` | 27 |
| 2139 | `_travaAtalhos()` | 4 |
| 2143 | `_soltaAtalhos()` | 5 |
| 2148 | `espectando()` | 2 |
| 2150 | `_acceptInput()` | 8 |
| 2158 | `_pauseBackdrop()` | 7 |
| 2165 | `_radioShow()` | 6 |
| 2171 | `_radioUi()` | 8 |
| 2179 | `_radioPick()` | 16 |
| 2195 | `start()` | 5 |
| 2200 | `_startAnnouncerLab()` | 9 |
| 2209 | `_startRound()` | 35 |
| 2244 | `_resetPositions()` | 248 |
| 2492 | `_checkCtfAlvo()` | 13 |
| 2505 | `_checkPace()` | 13 |
| 2518 | `_endRound()` | 34 |
| 2552 | `_roundWinnerVoice()` | 12 |
| 2564 | `_fimDaPartida()` | 7 |
| 2571 | `_endMatch()` | 61 |
| 2632 | `_ensureDolly()` | 41 |
| 2673 | `_tickDolly()` | 23 |
| 2696 | `setPaused()` | 23 |
| 2719 | `_now()` | 3 |
| 2722 | `pauseArmed()` | 1 |
| 2723 | `_syncPauseArm()` | 7 |
| 2730 | `resume()` | 4 |
| 2734 | `applySettings()` | 6 |
| 2740 | `_applyQuality()` | 13 |
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
| 3133 | `_meleeHit()` | 17 |
| 3150 | `_meleeRange()` | 6 |
| 3156 | `_botMelee()` | 28 |
| 3184 | `_shotDamage()` | 11 |
| 3195 | `_fireHitscan()` | 47 |
| 3242 | `_surfaceOf()` | 27 |
| 3269 | `_armoredTarget()` | 3 |
| 3272 | `_fleshImpact()` | 38 |
| 3310 | `_fxVoice()` | 9 |
| 3319 | `_impactSfx()` | 17 |
| 3336 | `_tintFx()` | 16 |
| 3352 | `_damage()` | 41 |
| 3393 | `_playerHurtFx()` | 6 |
| 3399 | `_kill()` | 75 |
| 3474 | `_dmgArc()` | 79 |
| 3553 | `_mkBanner()` | 11 |
| 3564 | `_acertoPrevisto()` | 5 |
| 3569 | `_hitmarker()` | 15 |
| 3584 | `_dmgNumber()` | 20 |
| 3604 | `_feed()` | 19 |
| 3623 | `_skullIcon()` | 6 |
| 3629 | `_killfeedWeaponIcon()` | 9 |
| 3638 | `_wpnIcon()` | 64 |
| 3702 | `_tracer()` | 24 |
| 3726 | `_puff()` | 39 |
| 3765 | `_holeDecalMat()` | 8 |
| 3773 | `_flash()` | 66 |
| 3839 | `_muzzleWorld()` | 18 |
| 3857 | `_aimOrigin()` | 5 |
| 3862 | `_updateDoors()` | 10 |
| 3872 | `_updateFx()` | 56 |
| 3928 | `_ejectCasing()` | 17 |
| 3945 | `_makeCtfFlagTex()` | 23 |
| 3968 | `_paintFlagSymbol()` | 9 |
| 3977 | `_flagTexFor()` | 26 |
| 4003 | `_legadoSimbolo()` | 8 |
| 4011 | `_loadCtfSymbols()` | 22 |
| 4033 | `_makeCtfZoneTex()` | 31 |
| 4064 | `_makeSmokeTex()` | 8 |
| 4072 | `_updateSmokeHud()` | 4 |
| 4076 | `_grenadeSpatial()` | 14 |
| 4090 | `_spawnGrenade()` | 13 |
| 4103 | `_throwSmoke()` | 11 |
| 4114 | `_throwFrag()` | 13 |
| 4127 | `_explodeFrag()` | 40 |
| 4167 | `_corDaFumaca()` | 15 |
| 4182 | `_popSmoke()` | 21 |
| 4203 | `_updateGrenades()` | 35 |
| 4238 | `_teamColor()` | 14 |
| 4252 | `_teamInk()` | 6 |
| 4258 | `_factionOf()` | 1 |
| 4259 | `_voiceKey()` | 1 |
| 4260 | `_teamName()` | 1 |
| 4261 | `_teamTag()` | 6 |
| 4267 | `_plaqueta()` | 13 |
| 4280 | `_mirror()` | 3 |
| 4283 | `_botSeparation()` | 56 |
| 4339 | `_initCTF()` | 86 |
| 4425 | `_updateCTF()` | 56 |
| 4481 | `_ctfWin()` | 23 |
| 4504 | `_freeYaw()` | 25 |
| 4529 | `_pullString()` | 23 |
| 4552 | `_walkReach()` | 32 |
| 4584 | `_wpComp()` | 16 |
| 4600 | `_findPathLocal()` | 22 |
| 4622 | `_botCtf()` | 135 |
| 4757 | `_hideCtfHud()` | 6 |
| 4763 | `_updateCtfHud()` | 76 |
| 4839 | `_collide()` | 23 |
| 4862 | `_collideRot()` | 26 |
| 4888 | `_freeSpot()` | 30 |
| 4918 | `_retaAndavel()` | 20 |
| 4938 | `_walkDepth()` | 16 |
| 4954 | `_noteHit()` | 17 |
| 4971 | `_deathFeedback()` | 45 |
| 5016 | `_toggleCamView()` | 11 |
| 5027 | `_syncCamViewVis()` | 8 |
| 5035 | `_ensurePlayerTP()` | 25 |
| 5060 | `_updatePlayerTP()` | 35 |
| 5095 | `_tpDeath()` | 18 |
| 5113 | `_tpRevive()` | 13 |
| 5126 | `_moveEntity()` | 98 |
| 5224 | `_updatePlayer()` | 247 |
| 5471 | `_footstepSurface()` | 13 |
| 5484 | `_updatePickups()` | 148 |
| 5632 | `_wpnMode()` | 5 |
| 5637 | `_botWeapon()` | 10 |
| 5647 | `_municaoInfinita()` | 1 |
| 5648 | `_pickupAllowed()` | 7 |
| 5655 | `_grabPickup()` | 35 |
| 5690 | `_assentarNoChao()` | 10 |
| 5700 | `refreshPickupModels()` | 24 |
| 5724 | `_dropWeapon()` | 20 |
| 5744 | `_sumirDrop()` | 36 |
| 5780 | `_spawnY()` | 3 |
| 5783 | `_spawnYaw()` | 5 |
| 5788 | `_pickSpawn()` | 23 |
| 5811 | `_respawnPlayer()` | 29 |
| 5840 | `_losClear()` | 18 |
| 5858 | `_botCall()` | 41 |
| 5899 | `_teamMarkTex()` | 23 |
| 5922 | `_makeTeamMark()` | 16 |
| 5938 | `_syncRemoteWeapon()` | 22 |
| 5960 | `_updateTeamMark()` | 7 |
| 5967 | `_botEye()` | 1 |
| 5968 | `_enemyOf()` | 8 |
| 5976 | `_duelToken()` | 22 |
| 5998 | `_respawnEntity()` | 21 |
| 6019 | `_updateBot()` | 823 |
| 6842 | `_flushTraining()` | 13 |
| 6855 | `_updateBotNN()` | 73 |
| 6928 | `_botShootNN()` | 46 |
| 6974 | `_radarFoot()` | 38 |
| 7012 | `_updateRadar()` | 64 |
| 7076 | `_banner()` | 26 |
| 7102 | `_resultadoDaRodada()` | 4 |
| 7106 | `_showScoreboard()` | 48 |
| 7154 | `_updateWeaponHud()` | 35 |
| 7189 | `_updateHud()` | 88 |
| 7277 | `update()` | 87 |
| 7364 | `dispose()` | 44 |

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
