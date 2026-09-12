# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.248 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7473 | 276 |
| `public/js/main.js` | 3522 | 288 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3139 linhas (42% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6085 | `_updateBot()` | ⚠️ candidato a extração |
| 582 | 617 | `constructor()` | 🔴 append-only |
| 248 | 2268 | `_resetPositions()` |  |
| 247 | 5290 | `_updatePlayer()` |  |
| 241 | 1297 | `_buildViewModels()` |  |
| 148 | 5550 | `_updatePickups()` |  |
| 137 | 4686 | `_botCtf()` |  |
| 115 | 1993 | `_touchControls()` |  |
| 98 | 5192 | `_moveEntity()` |  |
| 88 | 7341 | `update()` | 🔴 append-only |
| 87 | 7254 | `_updateHud()` |  |
| 86 | 4401 | `_initCTF()` |  |
| 85 | 3073 | `_tryShoot()` |  |
| 79 | 3531 | `_dmgArc()` |  |
| 76 | 4829 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `299–304` `361–455` `482–503` `1297–1696` `2834–2840` `2922–3008` `3027–3173` `3218–3271` `3759–3782` `3830–3913` `3985–4001` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `153–156` `207–207` `233–244` `545–556` `3411–3530` `4340–4400` `4568–4822` `4905–4927` `5290–5536` `5906–5923` `6033–6063` `6085–6906` | — |
| **MAPAS / MUNDO** | `1243–1296` `2268–2515` `4401–4544` `5550–5697` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1711–1720` `1835–1866` `2764–2776` `3783–3821` `3929–3984` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1199–1242` `2720–2742` `2758–2763` `2777–2783` `3531–3609` `3626–3679` `3695–3758` `7077–7140` `7171–7218` `7254–7340` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7341–7428 · `_dom()` 1199–1242 · `constructor()` 617–1198

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3746 de 7473 linhas (50%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 617 | `constructor()` | 582 |
| 1199 | `_dom()` | 44 |
| 1243 | `_buildEnv()` | 54 |
| 1297 | `_buildViewModels()` | 241 |
| 1538 | `_vmFrame` | 159 |
| 1697 | `_vmMontarTardio` | 14 |
| 1711 | `_makePuffTexture()` | 10 |
| 1721 | `_makeBloodTex()` | 19 |
| 1740 | `_makeBloodPoolTex()` | 21 |
| 1761 | `_bloodDecal()` | 16 |
| 1777 | `_makeBloodFx()` | 20 |
| 1797 | `_bloodSpatter()` | 18 |
| 1815 | `_bloodPoolAt()` | 6 |
| 1821 | `_updateBlood()` | 14 |
| 1835 | `_makeFlashTex()` | 22 |
| 1857 | `_makeFlashCoreTex()` | 10 |
| 1867 | `_input()` | 2 |
| 1869 | `_kd` | 45 |
| 1914 | `_ku` | 4 |
| 1918 | `_md` | 34 |
| 1952 | `_mu` | 7 |
| 1959 | `_mm` | 15 |
| 1974 | `_cc` | 1 |
| 1975 | `_blur` | 1 |
| 1976 | `_plc` | 17 |
| 1993 | `_touchControls()` | 115 |
| 2108 | `_aimAssist()` | 28 |
| 2136 | `_requestLock()` | 27 |
| 2163 | `_travaAtalhos()` | 4 |
| 2167 | `_soltaAtalhos()` | 5 |
| 2172 | `espectando()` | 2 |
| 2174 | `_acceptInput()` | 8 |
| 2182 | `_pauseBackdrop()` | 7 |
| 2189 | `_radioShow()` | 6 |
| 2195 | `_radioUi()` | 8 |
| 2203 | `_radioPick()` | 16 |
| 2219 | `start()` | 5 |
| 2224 | `_startAnnouncerLab()` | 9 |
| 2233 | `_startRound()` | 35 |
| 2268 | `_resetPositions()` | 248 |
| 2516 | `_checkCtfAlvo()` | 13 |
| 2529 | `_checkPace()` | 13 |
| 2542 | `_endRound()` | 34 |
| 2576 | `_roundWinnerVoice()` | 12 |
| 2588 | `_fimDaPartida()` | 7 |
| 2595 | `_endMatch()` | 61 |
| 2656 | `_ensureDolly()` | 41 |
| 2697 | `_tickDolly()` | 23 |
| 2720 | `setPaused()` | 23 |
| 2743 | `_now()` | 3 |
| 2746 | `pauseArmed()` | 1 |
| 2747 | `_syncPauseArm()` | 7 |
| 2754 | `resume()` | 4 |
| 2758 | `applySettings()` | 6 |
| 2764 | `_applyQuality()` | 13 |
| 2777 | `onResize()` | 7 |
| 2784 | `_switchTeam()` | 50 |
| 2834 | `_applyVmVisibility()` | 7 |
| 2841 | `_vmlabEnsure()` | 14 |
| 2855 | `_vmlabFrame()` | 28 |
| 2883 | `_tuneGet()` | 15 |
| 2898 | `_tune()` | 23 |
| 2921 | `_fxSet()` | 1 |
| 2922 | `_switchWeapon()` | 34 |
| 2956 | `_deploySfx()` | 7 |
| 2963 | `_scope()` | 17 |
| 2980 | `_zoomFov()` | 8 |
| 2988 | `_reloading()` | 1 |
| 2989 | `_startReload()` | 20 |
| 3009 | `_reloadLayers()` | 18 |
| 3027 | `_installRecoil()` | 33 |
| 3060 | `_shotRecoil()` | 13 |
| 3073 | `_tryShoot()` | 85 |
| 3158 | `_meleeHit()` | 16 |
| 3174 | `_meleeRange()` | 5 |
| 3179 | `_botMelee()` | 28 |
| 3207 | `_shotDamage()` | 11 |
| 3218 | `_fireHitscan()` | 54 |
| 3272 | `_targetFromHit()` | 9 |
| 3281 | `_penetrationExit()` | 20 |
| 3301 | `_surfaceOf()` | 27 |
| 3328 | `_armoredTarget()` | 3 |
| 3331 | `_fleshImpact()` | 38 |
| 3369 | `_fxVoice()` | 9 |
| 3378 | `_impactSfx()` | 17 |
| 3395 | `_tintFx()` | 16 |
| 3411 | `_damage()` | 41 |
| 3452 | `_playerHurtFx()` | 6 |
| 3458 | `_kill()` | 73 |
| 3531 | `_dmgArc()` | 79 |
| 3610 | `_mkBanner()` | 11 |
| 3621 | `_acertoPrevisto()` | 5 |
| 3626 | `_hitmarker()` | 15 |
| 3641 | `_dmgNumber()` | 20 |
| 3661 | `_feed()` | 19 |
| 3680 | `_skullIcon()` | 6 |
| 3686 | `_killfeedWeaponIcon()` | 9 |
| 3695 | `_wpnIcon()` | 64 |
| 3759 | `_tracer()` | 24 |
| 3783 | `_puff()` | 39 |
| 3822 | `_holeDecalMat()` | 8 |
| 3830 | `_flash()` | 66 |
| 3896 | `_muzzleWorld()` | 18 |
| 3914 | `_aimOrigin()` | 5 |
| 3919 | `_updateDoors()` | 10 |
| 3929 | `_updateFx()` | 56 |
| 3985 | `_ejectCasing()` | 17 |
| 4002 | `_makeCtfFlagTex()` | 23 |
| 4025 | `_paintFlagSymbol()` | 9 |
| 4034 | `_flagTexFor()` | 26 |
| 4060 | `_legadoSimbolo()` | 8 |
| 4068 | `_loadCtfSymbols()` | 22 |
| 4090 | `_makeCtfZoneTex()` | 31 |
| 4121 | `_makeSmokeTex()` | 8 |
| 4129 | `_updateSmokeHud()` | 4 |
| 4133 | `_grenadeSpatial()` | 14 |
| 4147 | `_spawnGrenade()` | 13 |
| 4160 | `_throwSmoke()` | 11 |
| 4171 | `_throwFrag()` | 13 |
| 4184 | `_explodeFrag()` | 40 |
| 4224 | `_corDaFumaca()` | 15 |
| 4239 | `_popSmoke()` | 21 |
| 4260 | `_updateGrenades()` | 35 |
| 4295 | `_teamColor()` | 14 |
| 4309 | `_teamInk()` | 6 |
| 4315 | `_factionOf()` | 1 |
| 4316 | `_voiceKey()` | 1 |
| 4317 | `_teamName()` | 1 |
| 4318 | `_teamTag()` | 6 |
| 4324 | `_plaqueta()` | 13 |
| 4337 | `_mirror()` | 3 |
| 4340 | `_botSeparation()` | 61 |
| 4401 | `_initCTF()` | 86 |
| 4487 | `_updateCTF()` | 58 |
| 4545 | `_ctfWin()` | 23 |
| 4568 | `_freeYaw()` | 25 |
| 4593 | `_pullString()` | 23 |
| 4616 | `_walkReach()` | 32 |
| 4648 | `_wpComp()` | 16 |
| 4664 | `_findPathLocal()` | 22 |
| 4686 | `_botCtf()` | 137 |
| 4823 | `_hideCtfHud()` | 6 |
| 4829 | `_updateCtfHud()` | 76 |
| 4905 | `_collide()` | 23 |
| 4928 | `_collideRot()` | 26 |
| 4954 | `_freeSpot()` | 30 |
| 4984 | `_retaAndavel()` | 20 |
| 5004 | `_walkDepth()` | 16 |
| 5020 | `_noteHit()` | 17 |
| 5037 | `_deathFeedback()` | 45 |
| 5082 | `_toggleCamView()` | 11 |
| 5093 | `_syncCamViewVis()` | 8 |
| 5101 | `_ensurePlayerTP()` | 25 |
| 5126 | `_updatePlayerTP()` | 35 |
| 5161 | `_tpDeath()` | 18 |
| 5179 | `_tpRevive()` | 13 |
| 5192 | `_moveEntity()` | 98 |
| 5290 | `_updatePlayer()` | 247 |
| 5537 | `_footstepSurface()` | 13 |
| 5550 | `_updatePickups()` | 148 |
| 5698 | `_wpnMode()` | 5 |
| 5703 | `_botWeapon()` | 10 |
| 5713 | `_municaoInfinita()` | 1 |
| 5714 | `_pickupAllowed()` | 7 |
| 5721 | `_grabPickup()` | 35 |
| 5756 | `_assentarNoChao()` | 10 |
| 5766 | `refreshPickupModels()` | 24 |
| 5790 | `_dropWeapon()` | 20 |
| 5810 | `_sumirDrop()` | 36 |
| 5846 | `_spawnY()` | 3 |
| 5849 | `_spawnYaw()` | 5 |
| 5854 | `_pickSpawn()` | 23 |
| 5877 | `_respawnPlayer()` | 29 |
| 5906 | `_losClear()` | 18 |
| 5924 | `_botCall()` | 41 |
| 5965 | `_teamMarkTex()` | 23 |
| 5988 | `_makeTeamMark()` | 16 |
| 6004 | `_syncRemoteWeapon()` | 22 |
| 6026 | `_updateTeamMark()` | 7 |
| 6033 | `_botEye()` | 1 |
| 6034 | `_enemyOf()` | 8 |
| 6042 | `_duelToken()` | 22 |
| 6064 | `_respawnEntity()` | 21 |
| 6085 | `_updateBot()` | 822 |
| 6907 | `_flushTraining()` | 13 |
| 6920 | `_updateBotNN()` | 73 |
| 6993 | `_botShootNN()` | 46 |
| 7039 | `_radarFoot()` | 38 |
| 7077 | `_updateRadar()` | 64 |
| 7141 | `_banner()` | 26 |
| 7167 | `_resultadoDaRodada()` | 4 |
| 7171 | `_showScoreboard()` | 48 |
| 7219 | `_updateWeaponHud()` | 35 |
| 7254 | `_updateHud()` | 87 |
| 7341 | `update()` | 88 |
| 7429 | `dispose()` | 44 |

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
