# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.248 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7470 | 276 |
| `public/js/main.js` | 3486 | 282 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3136 linhas (42% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6082 | `_updateBot()` | ⚠️ candidato a extração |
| 579 | 617 | `constructor()` | 🔴 append-only |
| 248 | 2265 | `_resetPositions()` |  |
| 247 | 5287 | `_updatePlayer()` |  |
| 241 | 1294 | `_buildViewModels()` |  |
| 148 | 5547 | `_updatePickups()` |  |
| 137 | 4683 | `_botCtf()` |  |
| 115 | 1990 | `_touchControls()` |  |
| 98 | 5189 | `_moveEntity()` |  |
| 88 | 7338 | `update()` | 🔴 append-only |
| 87 | 7251 | `_updateHud()` |  |
| 86 | 4398 | `_initCTF()` |  |
| 85 | 3070 | `_tryShoot()` |  |
| 79 | 3528 | `_dmgArc()` |  |
| 76 | 4826 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `299–304` `361–455` `482–503` `1294–1693` `2831–2837` `2919–3005` `3024–3170` `3215–3268` `3756–3779` `3827–3910` `3982–3998` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `153–156` `207–207` `233–244` `545–556` `3408–3527` `4337–4397` `4565–4819` `4902–4924` `5287–5533` `5903–5920` `6030–6060` `6082–6903` | — |
| **MAPAS / MUNDO** | `1240–1293` `2265–2512` `4398–4541` `5547–5694` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1708–1717` `1832–1863` `2761–2773` `3780–3818` `3926–3981` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1196–1239` `2717–2739` `2755–2760` `2774–2780` `3528–3606` `3623–3676` `3692–3755` `7074–7137` `7168–7215` `7251–7337` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7338–7425 · `_dom()` 1196–1239 · `constructor()` 617–1195

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3746 de 7470 linhas (50%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 299 | `GUNFEEL` | 6 |
| 310 | `coneDoDisparo` | 23 |
| 334 | `D2R` | 4 |
| 338 | `DMG_FALLOFF` | 5 |
| 343 | `HS_MUL` | 3 |
| 346 | `BALL_CLASS` | 15 |
| 361 | `STATIC_CLASS` | 75 |
| 437 | `VM_KNOB` | 19 |
| 458 | `vmFovForAspect` | 24 |
| 482 | `VM_OFF` | 22 |
| 504 | `vmOffY` | 35 |
| 539 | `VMP` | 6 |
| 545 | `BOT_SKILLS` | 11 |
| 557 | `diffKey` | 4 |
| 562 | `rollBotSkill` | 7 |
| 569 | `botTier` | 4 |
| 573 | `_cyclePool` | 4 |
| 577 | `_rosterPool` | 15 |
| 592 | `pickMatchRoster` | 12 |
| 604 | `BOT_WEAPON_POOL` | 5 |
| 609 | `pickMatchWeapons` | 7 |
| 617 | `constructor()` | 579 |
| 1196 | `_dom()` | 44 |
| 1240 | `_buildEnv()` | 54 |
| 1294 | `_buildViewModels()` | 241 |
| 1535 | `_vmFrame` | 159 |
| 1694 | `_vmMontarTardio` | 14 |
| 1708 | `_makePuffTexture()` | 10 |
| 1718 | `_makeBloodTex()` | 19 |
| 1737 | `_makeBloodPoolTex()` | 21 |
| 1758 | `_bloodDecal()` | 16 |
| 1774 | `_makeBloodFx()` | 20 |
| 1794 | `_bloodSpatter()` | 18 |
| 1812 | `_bloodPoolAt()` | 6 |
| 1818 | `_updateBlood()` | 14 |
| 1832 | `_makeFlashTex()` | 22 |
| 1854 | `_makeFlashCoreTex()` | 10 |
| 1864 | `_input()` | 2 |
| 1866 | `_kd` | 45 |
| 1911 | `_ku` | 4 |
| 1915 | `_md` | 34 |
| 1949 | `_mu` | 7 |
| 1956 | `_mm` | 15 |
| 1971 | `_cc` | 1 |
| 1972 | `_blur` | 1 |
| 1973 | `_plc` | 17 |
| 1990 | `_touchControls()` | 115 |
| 2105 | `_aimAssist()` | 28 |
| 2133 | `_requestLock()` | 27 |
| 2160 | `_travaAtalhos()` | 4 |
| 2164 | `_soltaAtalhos()` | 5 |
| 2169 | `espectando()` | 2 |
| 2171 | `_acceptInput()` | 8 |
| 2179 | `_pauseBackdrop()` | 7 |
| 2186 | `_radioShow()` | 6 |
| 2192 | `_radioUi()` | 8 |
| 2200 | `_radioPick()` | 16 |
| 2216 | `start()` | 5 |
| 2221 | `_startAnnouncerLab()` | 9 |
| 2230 | `_startRound()` | 35 |
| 2265 | `_resetPositions()` | 248 |
| 2513 | `_checkCtfAlvo()` | 13 |
| 2526 | `_checkPace()` | 13 |
| 2539 | `_endRound()` | 34 |
| 2573 | `_roundWinnerVoice()` | 12 |
| 2585 | `_fimDaPartida()` | 7 |
| 2592 | `_endMatch()` | 61 |
| 2653 | `_ensureDolly()` | 41 |
| 2694 | `_tickDolly()` | 23 |
| 2717 | `setPaused()` | 23 |
| 2740 | `_now()` | 3 |
| 2743 | `pauseArmed()` | 1 |
| 2744 | `_syncPauseArm()` | 7 |
| 2751 | `resume()` | 4 |
| 2755 | `applySettings()` | 6 |
| 2761 | `_applyQuality()` | 13 |
| 2774 | `onResize()` | 7 |
| 2781 | `_switchTeam()` | 50 |
| 2831 | `_applyVmVisibility()` | 7 |
| 2838 | `_vmlabEnsure()` | 14 |
| 2852 | `_vmlabFrame()` | 28 |
| 2880 | `_tuneGet()` | 15 |
| 2895 | `_tune()` | 23 |
| 2918 | `_fxSet()` | 1 |
| 2919 | `_switchWeapon()` | 34 |
| 2953 | `_deploySfx()` | 7 |
| 2960 | `_scope()` | 17 |
| 2977 | `_zoomFov()` | 8 |
| 2985 | `_reloading()` | 1 |
| 2986 | `_startReload()` | 20 |
| 3006 | `_reloadLayers()` | 18 |
| 3024 | `_installRecoil()` | 33 |
| 3057 | `_shotRecoil()` | 13 |
| 3070 | `_tryShoot()` | 85 |
| 3155 | `_meleeHit()` | 16 |
| 3171 | `_meleeRange()` | 5 |
| 3176 | `_botMelee()` | 28 |
| 3204 | `_shotDamage()` | 11 |
| 3215 | `_fireHitscan()` | 54 |
| 3269 | `_targetFromHit()` | 9 |
| 3278 | `_penetrationExit()` | 20 |
| 3298 | `_surfaceOf()` | 27 |
| 3325 | `_armoredTarget()` | 3 |
| 3328 | `_fleshImpact()` | 38 |
| 3366 | `_fxVoice()` | 9 |
| 3375 | `_impactSfx()` | 17 |
| 3392 | `_tintFx()` | 16 |
| 3408 | `_damage()` | 41 |
| 3449 | `_playerHurtFx()` | 6 |
| 3455 | `_kill()` | 73 |
| 3528 | `_dmgArc()` | 79 |
| 3607 | `_mkBanner()` | 11 |
| 3618 | `_acertoPrevisto()` | 5 |
| 3623 | `_hitmarker()` | 15 |
| 3638 | `_dmgNumber()` | 20 |
| 3658 | `_feed()` | 19 |
| 3677 | `_skullIcon()` | 6 |
| 3683 | `_killfeedWeaponIcon()` | 9 |
| 3692 | `_wpnIcon()` | 64 |
| 3756 | `_tracer()` | 24 |
| 3780 | `_puff()` | 39 |
| 3819 | `_holeDecalMat()` | 8 |
| 3827 | `_flash()` | 66 |
| 3893 | `_muzzleWorld()` | 18 |
| 3911 | `_aimOrigin()` | 5 |
| 3916 | `_updateDoors()` | 10 |
| 3926 | `_updateFx()` | 56 |
| 3982 | `_ejectCasing()` | 17 |
| 3999 | `_makeCtfFlagTex()` | 23 |
| 4022 | `_paintFlagSymbol()` | 9 |
| 4031 | `_flagTexFor()` | 26 |
| 4057 | `_legadoSimbolo()` | 8 |
| 4065 | `_loadCtfSymbols()` | 22 |
| 4087 | `_makeCtfZoneTex()` | 31 |
| 4118 | `_makeSmokeTex()` | 8 |
| 4126 | `_updateSmokeHud()` | 4 |
| 4130 | `_grenadeSpatial()` | 14 |
| 4144 | `_spawnGrenade()` | 13 |
| 4157 | `_throwSmoke()` | 11 |
| 4168 | `_throwFrag()` | 13 |
| 4181 | `_explodeFrag()` | 40 |
| 4221 | `_corDaFumaca()` | 15 |
| 4236 | `_popSmoke()` | 21 |
| 4257 | `_updateGrenades()` | 35 |
| 4292 | `_teamColor()` | 14 |
| 4306 | `_teamInk()` | 6 |
| 4312 | `_factionOf()` | 1 |
| 4313 | `_voiceKey()` | 1 |
| 4314 | `_teamName()` | 1 |
| 4315 | `_teamTag()` | 6 |
| 4321 | `_plaqueta()` | 13 |
| 4334 | `_mirror()` | 3 |
| 4337 | `_botSeparation()` | 61 |
| 4398 | `_initCTF()` | 86 |
| 4484 | `_updateCTF()` | 58 |
| 4542 | `_ctfWin()` | 23 |
| 4565 | `_freeYaw()` | 25 |
| 4590 | `_pullString()` | 23 |
| 4613 | `_walkReach()` | 32 |
| 4645 | `_wpComp()` | 16 |
| 4661 | `_findPathLocal()` | 22 |
| 4683 | `_botCtf()` | 137 |
| 4820 | `_hideCtfHud()` | 6 |
| 4826 | `_updateCtfHud()` | 76 |
| 4902 | `_collide()` | 23 |
| 4925 | `_collideRot()` | 26 |
| 4951 | `_freeSpot()` | 30 |
| 4981 | `_retaAndavel()` | 20 |
| 5001 | `_walkDepth()` | 16 |
| 5017 | `_noteHit()` | 17 |
| 5034 | `_deathFeedback()` | 45 |
| 5079 | `_toggleCamView()` | 11 |
| 5090 | `_syncCamViewVis()` | 8 |
| 5098 | `_ensurePlayerTP()` | 25 |
| 5123 | `_updatePlayerTP()` | 35 |
| 5158 | `_tpDeath()` | 18 |
| 5176 | `_tpRevive()` | 13 |
| 5189 | `_moveEntity()` | 98 |
| 5287 | `_updatePlayer()` | 247 |
| 5534 | `_footstepSurface()` | 13 |
| 5547 | `_updatePickups()` | 148 |
| 5695 | `_wpnMode()` | 5 |
| 5700 | `_botWeapon()` | 10 |
| 5710 | `_municaoInfinita()` | 1 |
| 5711 | `_pickupAllowed()` | 7 |
| 5718 | `_grabPickup()` | 35 |
| 5753 | `_assentarNoChao()` | 10 |
| 5763 | `refreshPickupModels()` | 24 |
| 5787 | `_dropWeapon()` | 20 |
| 5807 | `_sumirDrop()` | 36 |
| 5843 | `_spawnY()` | 3 |
| 5846 | `_spawnYaw()` | 5 |
| 5851 | `_pickSpawn()` | 23 |
| 5874 | `_respawnPlayer()` | 29 |
| 5903 | `_losClear()` | 18 |
| 5921 | `_botCall()` | 41 |
| 5962 | `_teamMarkTex()` | 23 |
| 5985 | `_makeTeamMark()` | 16 |
| 6001 | `_syncRemoteWeapon()` | 22 |
| 6023 | `_updateTeamMark()` | 7 |
| 6030 | `_botEye()` | 1 |
| 6031 | `_enemyOf()` | 8 |
| 6039 | `_duelToken()` | 22 |
| 6061 | `_respawnEntity()` | 21 |
| 6082 | `_updateBot()` | 822 |
| 6904 | `_flushTraining()` | 13 |
| 6917 | `_updateBotNN()` | 73 |
| 6990 | `_botShootNN()` | 46 |
| 7036 | `_radarFoot()` | 38 |
| 7074 | `_updateRadar()` | 64 |
| 7138 | `_banner()` | 26 |
| 7164 | `_resultadoDaRodada()` | 4 |
| 7168 | `_showScoreboard()` | 48 |
| 7216 | `_updateWeaponHud()` | 35 |
| 7251 | `_updateHud()` | 87 |
| 7338 | `update()` | 88 |
| 7426 | `dispose()` | 44 |

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
