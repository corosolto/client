# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.237 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7423 | 271 |
| `public/js/main.js` | 3403 | 278 |
| `public/js/glbchars.js` | 845 | 60 |
| `public/js/characters.js` | 1069 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3131 linhas (42% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6037 | `_updateBot()` | ⚠️ candidato a extração |
| 579 | 584 | `constructor()` | 🔴 append-only |
| 248 | 2232 | `_resetPositions()` |  |
| 247 | 5242 | `_updatePlayer()` |  |
| 241 | 1261 | `_buildViewModels()` |  |
| 148 | 5502 | `_updatePickups()` |  |
| 135 | 4640 | `_botCtf()` |  |
| 115 | 1957 | `_touchControls()` |  |
| 98 | 5144 | `_moveEntity()` |  |
| 87 | 7206 | `_updateHud()` |  |
| 86 | 4357 | `_initCTF()` |  |
| 86 | 7293 | `update()` | 🔴 append-only |
| 84 | 3037 | `_tryShoot()` |  |
| 79 | 3492 | `_dmgArc()` |  |
| 76 | 4781 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `299–301` `330–424` `451–472` `1261–1660` `2798–2804` `2886–2972` `2991–3134` `3179–3232` `3720–3743` `3791–3874` `3946–3962` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `153–156` `207–207` `233–244` `514–525` `3372–3491` `4301–4356` `4522–4774` `4857–4879` `5242–5488` `5858–5875` `5985–6015` `6037–6858` | — |
| **MAPAS / MUNDO** | `1207–1260` `2232–2479` `4357–4498` `5502–5649` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1675–1684` `1799–1830` `2728–2740` `3744–3782` `3890–3945` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1163–1206` `2684–2706` `2722–2727` `2741–2747` `3492–3570` `3587–3640` `3656–3719` `7029–7092` `7123–7170` `7206–7292` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7293–7378 · `_dom()` 1163–1206 · `constructor()` 584–1162

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3731 de 7423 linhas (50%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 299 | `GUNFEEL` | 3 |
| 303 | `D2R` | 4 |
| 307 | `DMG_FALLOFF` | 5 |
| 312 | `HS_MUL` | 3 |
| 315 | `BALL_CLASS` | 15 |
| 330 | `STATIC_CLASS` | 75 |
| 406 | `VM_KNOB` | 19 |
| 427 | `vmFovForAspect` | 24 |
| 451 | `VM_OFF` | 22 |
| 473 | `vmOffY` | 35 |
| 508 | `VMP` | 6 |
| 514 | `BOT_SKILLS` | 11 |
| 526 | `diffKey` | 4 |
| 531 | `rollBotSkill` | 7 |
| 538 | `botTier` | 4 |
| 542 | `_cyclePool` | 4 |
| 546 | `_rosterPool` | 15 |
| 561 | `pickMatchRoster` | 10 |
| 571 | `BOT_WEAPON_POOL` | 5 |
| 576 | `pickMatchWeapons` | 7 |
| 584 | `constructor()` | 579 |
| 1163 | `_dom()` | 44 |
| 1207 | `_buildEnv()` | 54 |
| 1261 | `_buildViewModels()` | 241 |
| 1502 | `_vmFrame` | 159 |
| 1661 | `_vmMontarTardio` | 14 |
| 1675 | `_makePuffTexture()` | 10 |
| 1685 | `_makeBloodTex()` | 19 |
| 1704 | `_makeBloodPoolTex()` | 21 |
| 1725 | `_bloodDecal()` | 16 |
| 1741 | `_makeBloodFx()` | 20 |
| 1761 | `_bloodSpatter()` | 18 |
| 1779 | `_bloodPoolAt()` | 6 |
| 1785 | `_updateBlood()` | 14 |
| 1799 | `_makeFlashTex()` | 22 |
| 1821 | `_makeFlashCoreTex()` | 10 |
| 1831 | `_input()` | 2 |
| 1833 | `_kd` | 45 |
| 1878 | `_ku` | 4 |
| 1882 | `_md` | 34 |
| 1916 | `_mu` | 7 |
| 1923 | `_mm` | 15 |
| 1938 | `_cc` | 1 |
| 1939 | `_blur` | 1 |
| 1940 | `_plc` | 17 |
| 1957 | `_touchControls()` | 115 |
| 2072 | `_aimAssist()` | 28 |
| 2100 | `_requestLock()` | 27 |
| 2127 | `_travaAtalhos()` | 4 |
| 2131 | `_soltaAtalhos()` | 5 |
| 2136 | `espectando()` | 2 |
| 2138 | `_acceptInput()` | 8 |
| 2146 | `_pauseBackdrop()` | 7 |
| 2153 | `_radioShow()` | 6 |
| 2159 | `_radioUi()` | 8 |
| 2167 | `_radioPick()` | 16 |
| 2183 | `start()` | 5 |
| 2188 | `_startAnnouncerLab()` | 9 |
| 2197 | `_startRound()` | 35 |
| 2232 | `_resetPositions()` | 248 |
| 2480 | `_checkCtfAlvo()` | 13 |
| 2493 | `_checkPace()` | 13 |
| 2506 | `_endRound()` | 34 |
| 2540 | `_roundWinnerVoice()` | 12 |
| 2552 | `_fimDaPartida()` | 7 |
| 2559 | `_endMatch()` | 61 |
| 2620 | `_ensureDolly()` | 41 |
| 2661 | `_tickDolly()` | 23 |
| 2684 | `setPaused()` | 23 |
| 2707 | `_now()` | 3 |
| 2710 | `pauseArmed()` | 1 |
| 2711 | `_syncPauseArm()` | 7 |
| 2718 | `resume()` | 4 |
| 2722 | `applySettings()` | 6 |
| 2728 | `_applyQuality()` | 13 |
| 2741 | `onResize()` | 7 |
| 2748 | `_switchTeam()` | 50 |
| 2798 | `_applyVmVisibility()` | 7 |
| 2805 | `_vmlabEnsure()` | 14 |
| 2819 | `_vmlabFrame()` | 28 |
| 2847 | `_tuneGet()` | 15 |
| 2862 | `_tune()` | 23 |
| 2885 | `_fxSet()` | 1 |
| 2886 | `_switchWeapon()` | 34 |
| 2920 | `_deploySfx()` | 7 |
| 2927 | `_scope()` | 17 |
| 2944 | `_zoomFov()` | 8 |
| 2952 | `_reloading()` | 1 |
| 2953 | `_startReload()` | 20 |
| 2973 | `_reloadLayers()` | 18 |
| 2991 | `_installRecoil()` | 33 |
| 3024 | `_shotRecoil()` | 13 |
| 3037 | `_tryShoot()` | 84 |
| 3121 | `_meleeHit()` | 14 |
| 3135 | `_meleeRange()` | 5 |
| 3140 | `_botMelee()` | 28 |
| 3168 | `_shotDamage()` | 11 |
| 3179 | `_fireHitscan()` | 54 |
| 3233 | `_targetFromHit()` | 9 |
| 3242 | `_penetrationExit()` | 20 |
| 3262 | `_surfaceOf()` | 27 |
| 3289 | `_armoredTarget()` | 3 |
| 3292 | `_fleshImpact()` | 38 |
| 3330 | `_fxVoice()` | 9 |
| 3339 | `_impactSfx()` | 17 |
| 3356 | `_tintFx()` | 16 |
| 3372 | `_damage()` | 41 |
| 3413 | `_playerHurtFx()` | 6 |
| 3419 | `_kill()` | 73 |
| 3492 | `_dmgArc()` | 79 |
| 3571 | `_mkBanner()` | 11 |
| 3582 | `_acertoPrevisto()` | 5 |
| 3587 | `_hitmarker()` | 15 |
| 3602 | `_dmgNumber()` | 20 |
| 3622 | `_feed()` | 19 |
| 3641 | `_skullIcon()` | 6 |
| 3647 | `_killfeedWeaponIcon()` | 9 |
| 3656 | `_wpnIcon()` | 64 |
| 3720 | `_tracer()` | 24 |
| 3744 | `_puff()` | 39 |
| 3783 | `_holeDecalMat()` | 8 |
| 3791 | `_flash()` | 66 |
| 3857 | `_muzzleWorld()` | 18 |
| 3875 | `_aimOrigin()` | 5 |
| 3880 | `_updateDoors()` | 10 |
| 3890 | `_updateFx()` | 56 |
| 3946 | `_ejectCasing()` | 17 |
| 3963 | `_makeCtfFlagTex()` | 23 |
| 3986 | `_paintFlagSymbol()` | 9 |
| 3995 | `_flagTexFor()` | 26 |
| 4021 | `_legadoSimbolo()` | 8 |
| 4029 | `_loadCtfSymbols()` | 22 |
| 4051 | `_makeCtfZoneTex()` | 31 |
| 4082 | `_makeSmokeTex()` | 8 |
| 4090 | `_updateSmokeHud()` | 4 |
| 4094 | `_grenadeSpatial()` | 14 |
| 4108 | `_spawnGrenade()` | 13 |
| 4121 | `_throwSmoke()` | 11 |
| 4132 | `_throwFrag()` | 13 |
| 4145 | `_explodeFrag()` | 40 |
| 4185 | `_corDaFumaca()` | 15 |
| 4200 | `_popSmoke()` | 21 |
| 4221 | `_updateGrenades()` | 35 |
| 4256 | `_teamColor()` | 14 |
| 4270 | `_teamInk()` | 6 |
| 4276 | `_factionOf()` | 1 |
| 4277 | `_voiceKey()` | 1 |
| 4278 | `_teamName()` | 1 |
| 4279 | `_teamTag()` | 6 |
| 4285 | `_plaqueta()` | 13 |
| 4298 | `_mirror()` | 3 |
| 4301 | `_botSeparation()` | 56 |
| 4357 | `_initCTF()` | 86 |
| 4443 | `_updateCTF()` | 56 |
| 4499 | `_ctfWin()` | 23 |
| 4522 | `_freeYaw()` | 25 |
| 4547 | `_pullString()` | 23 |
| 4570 | `_walkReach()` | 32 |
| 4602 | `_wpComp()` | 16 |
| 4618 | `_findPathLocal()` | 22 |
| 4640 | `_botCtf()` | 135 |
| 4775 | `_hideCtfHud()` | 6 |
| 4781 | `_updateCtfHud()` | 76 |
| 4857 | `_collide()` | 23 |
| 4880 | `_collideRot()` | 26 |
| 4906 | `_freeSpot()` | 30 |
| 4936 | `_retaAndavel()` | 20 |
| 4956 | `_walkDepth()` | 16 |
| 4972 | `_noteHit()` | 17 |
| 4989 | `_deathFeedback()` | 45 |
| 5034 | `_toggleCamView()` | 11 |
| 5045 | `_syncCamViewVis()` | 8 |
| 5053 | `_ensurePlayerTP()` | 25 |
| 5078 | `_updatePlayerTP()` | 35 |
| 5113 | `_tpDeath()` | 18 |
| 5131 | `_tpRevive()` | 13 |
| 5144 | `_moveEntity()` | 98 |
| 5242 | `_updatePlayer()` | 247 |
| 5489 | `_footstepSurface()` | 13 |
| 5502 | `_updatePickups()` | 148 |
| 5650 | `_wpnMode()` | 5 |
| 5655 | `_botWeapon()` | 10 |
| 5665 | `_municaoInfinita()` | 1 |
| 5666 | `_pickupAllowed()` | 7 |
| 5673 | `_grabPickup()` | 35 |
| 5708 | `_assentarNoChao()` | 10 |
| 5718 | `refreshPickupModels()` | 24 |
| 5742 | `_dropWeapon()` | 20 |
| 5762 | `_sumirDrop()` | 36 |
| 5798 | `_spawnY()` | 3 |
| 5801 | `_spawnYaw()` | 5 |
| 5806 | `_pickSpawn()` | 23 |
| 5829 | `_respawnPlayer()` | 29 |
| 5858 | `_losClear()` | 18 |
| 5876 | `_botCall()` | 41 |
| 5917 | `_teamMarkTex()` | 23 |
| 5940 | `_makeTeamMark()` | 16 |
| 5956 | `_syncRemoteWeapon()` | 22 |
| 5978 | `_updateTeamMark()` | 7 |
| 5985 | `_botEye()` | 1 |
| 5986 | `_enemyOf()` | 8 |
| 5994 | `_duelToken()` | 22 |
| 6016 | `_respawnEntity()` | 21 |
| 6037 | `_updateBot()` | 822 |
| 6859 | `_flushTraining()` | 13 |
| 6872 | `_updateBotNN()` | 73 |
| 6945 | `_botShootNN()` | 46 |
| 6991 | `_radarFoot()` | 38 |
| 7029 | `_updateRadar()` | 64 |
| 7093 | `_banner()` | 26 |
| 7119 | `_resultadoDaRodada()` | 4 |
| 7123 | `_showScoreboard()` | 48 |
| 7171 | `_updateWeaponHud()` | 35 |
| 7206 | `_updateHud()` | 87 |
| 7293 | `update()` | 86 |
| 7379 | `dispose()` | 44 |

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
