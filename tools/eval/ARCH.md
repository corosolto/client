# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.246 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7622 | 274 |
| `public/js/main.js` | 3408 | 278 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3166 linhas (42% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6230 | `_updateBot()` | ⚠️ candidato a extração |
| 595 | 589 | `constructor()` | 🔴 append-only |
| 261 | 5421 | `_updatePlayer()` |  |
| 251 | 2255 | `_resetPositions()` |  |
| 241 | 1282 | `_buildViewModels()` |  |
| 148 | 5695 | `_updatePickups()` |  |
| 135 | 4819 | `_botCtf()` |  |
| 116 | 1979 | `_touchControls()` |  |
| 98 | 5323 | `_moveEntity()` |  |
| 87 | 7399 | `_updateHud()` |  |
| 86 | 4536 | `_initCTF()` |  |
| 86 | 7486 | `update()` | 🔴 append-only |
| 82 | 3203 | `_tryShoot()` |  |
| 79 | 2868 | `_ensureVmPrecisionQa()` |  |
| 79 | 3669 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `302–304` `333–427` `454–475` `1282–1681` `2836–2867` `3047–3138` `3157–3284` `3298–3311` `3356–3409` `3897–3920` `3968–4053` `4125–4141` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `156–159` `210–210` `236–247` `517–528` `3549–3668` `4480–4535` `4701–4953` `5036–5058` `5421–5681` `6051–6068` `6178–6208` `6230–7051` | — |
| **MAPAS / MUNDO** | `1228–1281` `2255–2505` `4536–4677` `5695–5842` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1696–1705` `1820–1851` `2754–2766` `3921–3959` `4069–4124` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1184–1227` `2710–2732` `2748–2753` `2767–2781` `3669–3747` `3764–3817` `3833–3896` `7222–7285` `7316–7363` `7399–7485` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7486–7571 · `_dom()` 1184–1227 · `constructor()` 589–1183

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3786 de 7622 linhas (50%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 39 | `ANNOUNCER_LAB` | 4 |
| 43 | `VMLAB` | 8 |
| 51 | `VM_MAT_LEGACY` | 4 |
| 57 | `DROP_TTL` | 8 |
| 65 | `ROUNDS_MAX` | 27 |
| 95 | `CTF_CLOCK_SHOW` | 4 |
| 99 | `KILLS_PER_PLAYER` | 7 |
| 106 | `PACE` | 33 |
| 139 | `PAUSE_ARM_MS` | 9 |
| 149 | `confirmGate` | 7 |
| 160 | `BOT_AIM_PITCH` | 4 |
| 164 | `BOT_DMG_PLAYER` | 21 |
| 185 | `BOT_FAIR` | 5 |
| 190 | `BOT_MOVE2` | 15 |
| 214 | `BOT_FOCUS_MIN` | 22 |
| 240 | `BOT_TOKEN_REST` | 7 |
| 248 | `MOVE_MUL` | 6 |
| 255 | `MOVE2` | 5 |
| 260 | `RACK_OLD` | 4 |
| 264 | `RACK_RETA` | 25 |
| 291 | `RADIO` | 5 |
| 297 | `MK_LABELS` | 5 |
| 302 | `GUNFEEL` | 3 |
| 306 | `D2R` | 4 |
| 310 | `DMG_FALLOFF` | 5 |
| 315 | `HS_MUL` | 3 |
| 318 | `BALL_CLASS` | 15 |
| 333 | `STATIC_CLASS` | 75 |
| 409 | `VM_KNOB` | 19 |
| 430 | `vmFovForAspect` | 24 |
| 454 | `VM_OFF` | 22 |
| 476 | `vmOffY` | 35 |
| 511 | `VMP` | 6 |
| 517 | `BOT_SKILLS` | 11 |
| 529 | `diffKey` | 4 |
| 534 | `rollBotSkill` | 7 |
| 541 | `botTier` | 4 |
| 545 | `_cyclePool` | 4 |
| 549 | `_rosterPool` | 15 |
| 564 | `pickMatchRoster` | 12 |
| 576 | `BOT_WEAPON_POOL` | 5 |
| 581 | `pickMatchWeapons` | 7 |
| 589 | `constructor()` | 595 |
| 1184 | `_dom()` | 44 |
| 1228 | `_buildEnv()` | 54 |
| 1282 | `_buildViewModels()` | 241 |
| 1523 | `_vmFrame` | 159 |
| 1682 | `_vmMontarTardio` | 14 |
| 1696 | `_makePuffTexture()` | 10 |
| 1706 | `_makeBloodTex()` | 19 |
| 1725 | `_makeBloodPoolTex()` | 21 |
| 1746 | `_bloodDecal()` | 16 |
| 1762 | `_makeBloodFx()` | 20 |
| 1782 | `_bloodSpatter()` | 18 |
| 1800 | `_bloodPoolAt()` | 6 |
| 1806 | `_updateBlood()` | 14 |
| 1820 | `_makeFlashTex()` | 22 |
| 1842 | `_makeFlashCoreTex()` | 10 |
| 1852 | `_input()` | 2 |
| 1854 | `_kd` | 45 |
| 1899 | `_ku` | 4 |
| 1903 | `_md` | 35 |
| 1938 | `_mu` | 7 |
| 1945 | `_mm` | 15 |
| 1960 | `_cc` | 1 |
| 1961 | `_blur` | 1 |
| 1962 | `_plc` | 17 |
| 1979 | `_touchControls()` | 116 |
| 2095 | `_aimAssist()` | 28 |
| 2123 | `_requestLock()` | 27 |
| 2150 | `_travaAtalhos()` | 4 |
| 2154 | `_soltaAtalhos()` | 5 |
| 2159 | `espectando()` | 2 |
| 2161 | `_acceptInput()` | 8 |
| 2169 | `_pauseBackdrop()` | 7 |
| 2176 | `_radioShow()` | 6 |
| 2182 | `_radioUi()` | 8 |
| 2190 | `_radioPick()` | 16 |
| 2206 | `start()` | 5 |
| 2211 | `_startAnnouncerLab()` | 9 |
| 2220 | `_startRound()` | 35 |
| 2255 | `_resetPositions()` | 251 |
| 2506 | `_checkCtfAlvo()` | 13 |
| 2519 | `_checkPace()` | 13 |
| 2532 | `_endRound()` | 34 |
| 2566 | `_roundWinnerVoice()` | 12 |
| 2578 | `_fimDaPartida()` | 7 |
| 2585 | `_endMatch()` | 61 |
| 2646 | `_ensureDolly()` | 41 |
| 2687 | `_tickDolly()` | 23 |
| 2710 | `setPaused()` | 23 |
| 2733 | `_now()` | 3 |
| 2736 | `pauseArmed()` | 1 |
| 2737 | `_syncPauseArm()` | 7 |
| 2744 | `resume()` | 4 |
| 2748 | `applySettings()` | 6 |
| 2754 | `_applyQuality()` | 13 |
| 2767 | `onResize()` | 15 |
| 2782 | `_switchTeam()` | 54 |
| 2836 | `_applyVmVisibility()` | 32 |
| 2868 | `_ensureVmPrecisionQa()` | 79 |
| 2947 | `_syncVmPresentation()` | 19 |
| 2966 | `_vmlabEnsure()` | 14 |
| 2980 | `_vmlabFrame()` | 28 |
| 3008 | `_tuneGet()` | 15 |
| 3023 | `_tune()` | 23 |
| 3046 | `_fxSet()` | 1 |
| 3047 | `_switchWeapon()` | 37 |
| 3084 | `_deploySfx()` | 7 |
| 3091 | `_scope()` | 17 |
| 3108 | `_zoomFov()` | 8 |
| 3116 | `_reloading()` | 1 |
| 3117 | `_startReload()` | 22 |
| 3139 | `_reloadLayers()` | 18 |
| 3157 | `_installRecoil()` | 33 |
| 3190 | `_shotRecoil()` | 13 |
| 3203 | `_tryShoot()` | 82 |
| 3285 | `_tryKnifeAttack()` | 13 |
| 3298 | `_meleeHit()` | 14 |
| 3312 | `_meleeRange()` | 5 |
| 3317 | `_botMelee()` | 28 |
| 3345 | `_shotDamage()` | 11 |
| 3356 | `_fireHitscan()` | 54 |
| 3410 | `_targetFromHit()` | 9 |
| 3419 | `_penetrationExit()` | 20 |
| 3439 | `_surfaceOf()` | 27 |
| 3466 | `_armoredTarget()` | 3 |
| 3469 | `_fleshImpact()` | 38 |
| 3507 | `_fxVoice()` | 9 |
| 3516 | `_impactSfx()` | 17 |
| 3533 | `_tintFx()` | 16 |
| 3549 | `_damage()` | 41 |
| 3590 | `_playerHurtFx()` | 6 |
| 3596 | `_kill()` | 73 |
| 3669 | `_dmgArc()` | 79 |
| 3748 | `_mkBanner()` | 11 |
| 3759 | `_acertoPrevisto()` | 5 |
| 3764 | `_hitmarker()` | 15 |
| 3779 | `_dmgNumber()` | 20 |
| 3799 | `_feed()` | 19 |
| 3818 | `_skullIcon()` | 6 |
| 3824 | `_killfeedWeaponIcon()` | 9 |
| 3833 | `_wpnIcon()` | 64 |
| 3897 | `_tracer()` | 24 |
| 3921 | `_puff()` | 39 |
| 3960 | `_holeDecalMat()` | 8 |
| 3968 | `_flash()` | 66 |
| 4034 | `_muzzleWorld()` | 20 |
| 4054 | `_aimOrigin()` | 5 |
| 4059 | `_updateDoors()` | 10 |
| 4069 | `_updateFx()` | 56 |
| 4125 | `_ejectCasing()` | 17 |
| 4142 | `_makeCtfFlagTex()` | 23 |
| 4165 | `_paintFlagSymbol()` | 9 |
| 4174 | `_flagTexFor()` | 26 |
| 4200 | `_legadoSimbolo()` | 8 |
| 4208 | `_loadCtfSymbols()` | 22 |
| 4230 | `_makeCtfZoneTex()` | 31 |
| 4261 | `_makeSmokeTex()` | 8 |
| 4269 | `_updateSmokeHud()` | 4 |
| 4273 | `_grenadeSpatial()` | 14 |
| 4287 | `_spawnGrenade()` | 13 |
| 4300 | `_throwSmoke()` | 11 |
| 4311 | `_throwFrag()` | 13 |
| 4324 | `_explodeFrag()` | 40 |
| 4364 | `_corDaFumaca()` | 15 |
| 4379 | `_popSmoke()` | 21 |
| 4400 | `_updateGrenades()` | 35 |
| 4435 | `_teamColor()` | 14 |
| 4449 | `_teamInk()` | 6 |
| 4455 | `_factionOf()` | 1 |
| 4456 | `_voiceKey()` | 1 |
| 4457 | `_teamName()` | 1 |
| 4458 | `_teamTag()` | 6 |
| 4464 | `_plaqueta()` | 13 |
| 4477 | `_mirror()` | 3 |
| 4480 | `_botSeparation()` | 56 |
| 4536 | `_initCTF()` | 86 |
| 4622 | `_updateCTF()` | 56 |
| 4678 | `_ctfWin()` | 23 |
| 4701 | `_freeYaw()` | 25 |
| 4726 | `_pullString()` | 23 |
| 4749 | `_walkReach()` | 32 |
| 4781 | `_wpComp()` | 16 |
| 4797 | `_findPathLocal()` | 22 |
| 4819 | `_botCtf()` | 135 |
| 4954 | `_hideCtfHud()` | 6 |
| 4960 | `_updateCtfHud()` | 76 |
| 5036 | `_collide()` | 23 |
| 5059 | `_collideRot()` | 26 |
| 5085 | `_freeSpot()` | 30 |
| 5115 | `_retaAndavel()` | 20 |
| 5135 | `_walkDepth()` | 16 |
| 5151 | `_noteHit()` | 17 |
| 5168 | `_deathFeedback()` | 45 |
| 5213 | `_toggleCamView()` | 11 |
| 5224 | `_syncCamViewVis()` | 8 |
| 5232 | `_ensurePlayerTP()` | 25 |
| 5257 | `_updatePlayerTP()` | 35 |
| 5292 | `_tpDeath()` | 18 |
| 5310 | `_tpRevive()` | 13 |
| 5323 | `_moveEntity()` | 98 |
| 5421 | `_updatePlayer()` | 261 |
| 5682 | `_footstepSurface()` | 13 |
| 5695 | `_updatePickups()` | 148 |
| 5843 | `_wpnMode()` | 5 |
| 5848 | `_botWeapon()` | 10 |
| 5858 | `_municaoInfinita()` | 1 |
| 5859 | `_pickupAllowed()` | 7 |
| 5866 | `_grabPickup()` | 35 |
| 5901 | `_assentarNoChao()` | 10 |
| 5911 | `refreshPickupModels()` | 24 |
| 5935 | `_dropWeapon()` | 20 |
| 5955 | `_sumirDrop()` | 36 |
| 5991 | `_spawnY()` | 3 |
| 5994 | `_spawnYaw()` | 5 |
| 5999 | `_pickSpawn()` | 23 |
| 6022 | `_respawnPlayer()` | 29 |
| 6051 | `_losClear()` | 18 |
| 6069 | `_botCall()` | 41 |
| 6110 | `_teamMarkTex()` | 23 |
| 6133 | `_makeTeamMark()` | 16 |
| 6149 | `_syncRemoteWeapon()` | 22 |
| 6171 | `_updateTeamMark()` | 7 |
| 6178 | `_botEye()` | 1 |
| 6179 | `_enemyOf()` | 8 |
| 6187 | `_duelToken()` | 22 |
| 6209 | `_respawnEntity()` | 21 |
| 6230 | `_updateBot()` | 822 |
| 7052 | `_flushTraining()` | 13 |
| 7065 | `_updateBotNN()` | 73 |
| 7138 | `_botShootNN()` | 46 |
| 7184 | `_radarFoot()` | 38 |
| 7222 | `_updateRadar()` | 64 |
| 7286 | `_banner()` | 26 |
| 7312 | `_resultadoDaRodada()` | 4 |
| 7316 | `_showScoreboard()` | 48 |
| 7364 | `_updateWeaponHud()` | 35 |
| 7399 | `_updateHud()` | 87 |
| 7486 | `update()` | 86 |
| 7572 | `dispose()` | 50 |

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
