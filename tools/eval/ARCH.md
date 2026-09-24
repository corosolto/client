# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.268 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 7506 | 279 |
| `public/js/main.js` | 3572 | 292 |
| `public/js/glbchars.js` | 852 | 60 |
| `public/js/characters.js` | 1100 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 354 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3142 linhas (42% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 822 | 6115 | `_updateBot()` | ⚠️ candidato a extração |
| 582 | 618 | `constructor()` | 🔴 append-only |
| 248 | 2271 | `_resetPositions()` |  |
| 247 | 5320 | `_updatePlayer()` |  |
| 241 | 1300 | `_buildViewModels()` |  |
| 148 | 5580 | `_updatePickups()` |  |
| 137 | 4716 | `_botCtf()` |  |
| 115 | 1996 | `_touchControls()` |  |
| 98 | 5222 | `_moveEntity()` |  |
| 90 | 7372 | `update()` | 🔴 append-only |
| 88 | 7284 | `_updateHud()` |  |
| 86 | 4431 | `_initCTF()` |  |
| 85 | 3084 | `_tryShoot()` |  |
| 79 | 3528 | `_dmgArc()` |  |
| 76 | 4859 | `_updateCtfHud()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `300–305` `362–456` `483–504` `1300–1699` `2845–2851` `2933–3019` `3038–3184` `3229–3282` `3789–3812` `3860–3943` `4015–4031` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `154–157` `208–208` `234–245` `546–557` `3422–3527` `4370–4430` `4598–4852` `4935–4957` `5320–5566` `5936–5953` `6063–6093` `6115–6936` | — |
| **MAPAS / MUNDO** | `1246–1299` `2271–2518` `4431–4574` `5580–5727` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1714–1723` `1838–1869` `2767–2779` `3813–3851` `3959–4014` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1200–1245` `2723–2745` `2761–2766` `2780–2786` `3528–3606` `3656–3709` `3725–3788` `7107–7170` `7201–7248` `7284–7371` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 7372–7461 · `_dom()` 1200–1245 · `constructor()` 618–1199

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3735 de 7506 linhas (50%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

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
| 300 | `GUNFEEL` | 6 |
| 311 | `coneDoDisparo` | 23 |
| 335 | `D2R` | 4 |
| 339 | `DMG_FALLOFF` | 5 |
| 344 | `HS_MUL` | 3 |
| 347 | `BALL_CLASS` | 15 |
| 362 | `STATIC_CLASS` | 75 |
| 438 | `VM_KNOB` | 19 |
| 459 | `vmFovForAspect` | 24 |
| 483 | `VM_OFF` | 22 |
| 505 | `vmOffY` | 35 |
| 540 | `VMP` | 6 |
| 546 | `BOT_SKILLS` | 11 |
| 558 | `diffKey` | 4 |
| 563 | `rollBotSkill` | 7 |
| 570 | `botTier` | 4 |
| 574 | `_cyclePool` | 4 |
| 578 | `_rosterPool` | 15 |
| 593 | `pickMatchRoster` | 12 |
| 605 | `BOT_WEAPON_POOL` | 5 |
| 610 | `pickMatchWeapons` | 7 |
| 618 | `constructor()` | 582 |
| 1200 | `_dom()` | 46 |
| 1246 | `_buildEnv()` | 54 |
| 1300 | `_buildViewModels()` | 241 |
| 1541 | `_vmFrame` | 159 |
| 1700 | `_vmMontarTardio` | 14 |
| 1714 | `_makePuffTexture()` | 10 |
| 1724 | `_makeBloodTex()` | 19 |
| 1743 | `_makeBloodPoolTex()` | 21 |
| 1764 | `_bloodDecal()` | 16 |
| 1780 | `_makeBloodFx()` | 20 |
| 1800 | `_bloodSpatter()` | 18 |
| 1818 | `_bloodPoolAt()` | 6 |
| 1824 | `_updateBlood()` | 14 |
| 1838 | `_makeFlashTex()` | 22 |
| 1860 | `_makeFlashCoreTex()` | 10 |
| 1870 | `_input()` | 2 |
| 1872 | `_kd` | 45 |
| 1917 | `_ku` | 4 |
| 1921 | `_md` | 34 |
| 1955 | `_mu` | 7 |
| 1962 | `_mm` | 15 |
| 1977 | `_cc` | 1 |
| 1978 | `_blur` | 1 |
| 1979 | `_plc` | 17 |
| 1996 | `_touchControls()` | 115 |
| 2111 | `_aimAssist()` | 28 |
| 2139 | `_requestLock()` | 27 |
| 2166 | `_travaAtalhos()` | 4 |
| 2170 | `_soltaAtalhos()` | 5 |
| 2175 | `espectando()` | 2 |
| 2177 | `_acceptInput()` | 8 |
| 2185 | `_pauseBackdrop()` | 7 |
| 2192 | `_radioShow()` | 6 |
| 2198 | `_radioUi()` | 8 |
| 2206 | `_radioPick()` | 16 |
| 2222 | `start()` | 5 |
| 2227 | `_startAnnouncerLab()` | 9 |
| 2236 | `_startRound()` | 35 |
| 2271 | `_resetPositions()` | 248 |
| 2519 | `_checkCtfAlvo()` | 13 |
| 2532 | `_checkPace()` | 13 |
| 2545 | `_endRound()` | 34 |
| 2579 | `_roundWinnerVoice()` | 12 |
| 2591 | `_fimDaPartida()` | 7 |
| 2598 | `_endMatch()` | 61 |
| 2659 | `_ensureDolly()` | 41 |
| 2700 | `_tickDolly()` | 23 |
| 2723 | `setPaused()` | 23 |
| 2746 | `_now()` | 3 |
| 2749 | `pauseArmed()` | 1 |
| 2750 | `_syncPauseArm()` | 7 |
| 2757 | `resume()` | 4 |
| 2761 | `applySettings()` | 6 |
| 2767 | `_applyQuality()` | 13 |
| 2780 | `onResize()` | 7 |
| 2787 | `_switchTeam()` | 58 |
| 2845 | `_applyVmVisibility()` | 7 |
| 2852 | `_vmlabEnsure()` | 14 |
| 2866 | `_vmlabFrame()` | 28 |
| 2894 | `_tuneGet()` | 15 |
| 2909 | `_tune()` | 23 |
| 2932 | `_fxSet()` | 1 |
| 2933 | `_switchWeapon()` | 34 |
| 2967 | `_deploySfx()` | 7 |
| 2974 | `_scope()` | 17 |
| 2991 | `_zoomFov()` | 8 |
| 2999 | `_reloading()` | 1 |
| 3000 | `_startReload()` | 20 |
| 3020 | `_reloadLayers()` | 18 |
| 3038 | `_installRecoil()` | 33 |
| 3071 | `_shotRecoil()` | 13 |
| 3084 | `_tryShoot()` | 85 |
| 3169 | `_meleeHit()` | 16 |
| 3185 | `_meleeRange()` | 5 |
| 3190 | `_botMelee()` | 28 |
| 3218 | `_shotDamage()` | 11 |
| 3229 | `_fireHitscan()` | 54 |
| 3283 | `_targetFromHit()` | 9 |
| 3292 | `_penetrationExit()` | 20 |
| 3312 | `_surfaceOf()` | 27 |
| 3339 | `_armoredTarget()` | 3 |
| 3342 | `_fleshImpact()` | 38 |
| 3380 | `_fxVoice()` | 9 |
| 3389 | `_impactSfx()` | 17 |
| 3406 | `_tintFx()` | 16 |
| 3422 | `_damage()` | 41 |
| 3463 | `_playerHurtFx()` | 6 |
| 3469 | `_kill()` | 59 |
| 3528 | `_dmgArc()` | 79 |
| 3607 | `_mkBanner()` | 9 |
| 3616 | `_updateKillSequenceHud()` | 12 |
| 3628 | `_resetKillSequence()` | 5 |
| 3633 | `_playerKillFeedback()` | 18 |
| 3651 | `_acertoPrevisto()` | 5 |
| 3656 | `_hitmarker()` | 15 |
| 3671 | `_dmgNumber()` | 20 |
| 3691 | `_feed()` | 19 |
| 3710 | `_skullIcon()` | 6 |
| 3716 | `_killfeedWeaponIcon()` | 9 |
| 3725 | `_wpnIcon()` | 64 |
| 3789 | `_tracer()` | 24 |
| 3813 | `_puff()` | 39 |
| 3852 | `_holeDecalMat()` | 8 |
| 3860 | `_flash()` | 66 |
| 3926 | `_muzzleWorld()` | 18 |
| 3944 | `_aimOrigin()` | 5 |
| 3949 | `_updateDoors()` | 10 |
| 3959 | `_updateFx()` | 56 |
| 4015 | `_ejectCasing()` | 17 |
| 4032 | `_makeCtfFlagTex()` | 23 |
| 4055 | `_paintFlagSymbol()` | 9 |
| 4064 | `_flagTexFor()` | 26 |
| 4090 | `_legadoSimbolo()` | 8 |
| 4098 | `_loadCtfSymbols()` | 22 |
| 4120 | `_makeCtfZoneTex()` | 31 |
| 4151 | `_makeSmokeTex()` | 8 |
| 4159 | `_updateSmokeHud()` | 4 |
| 4163 | `_grenadeSpatial()` | 14 |
| 4177 | `_spawnGrenade()` | 13 |
| 4190 | `_throwSmoke()` | 11 |
| 4201 | `_throwFrag()` | 13 |
| 4214 | `_explodeFrag()` | 40 |
| 4254 | `_corDaFumaca()` | 15 |
| 4269 | `_popSmoke()` | 21 |
| 4290 | `_updateGrenades()` | 35 |
| 4325 | `_teamColor()` | 14 |
| 4339 | `_teamInk()` | 6 |
| 4345 | `_factionOf()` | 1 |
| 4346 | `_voiceKey()` | 1 |
| 4347 | `_teamName()` | 1 |
| 4348 | `_teamTag()` | 6 |
| 4354 | `_plaqueta()` | 13 |
| 4367 | `_mirror()` | 3 |
| 4370 | `_botSeparation()` | 61 |
| 4431 | `_initCTF()` | 86 |
| 4517 | `_updateCTF()` | 58 |
| 4575 | `_ctfWin()` | 23 |
| 4598 | `_freeYaw()` | 25 |
| 4623 | `_pullString()` | 23 |
| 4646 | `_walkReach()` | 32 |
| 4678 | `_wpComp()` | 16 |
| 4694 | `_findPathLocal()` | 22 |
| 4716 | `_botCtf()` | 137 |
| 4853 | `_hideCtfHud()` | 6 |
| 4859 | `_updateCtfHud()` | 76 |
| 4935 | `_collide()` | 23 |
| 4958 | `_collideRot()` | 26 |
| 4984 | `_freeSpot()` | 30 |
| 5014 | `_retaAndavel()` | 20 |
| 5034 | `_walkDepth()` | 16 |
| 5050 | `_noteHit()` | 17 |
| 5067 | `_deathFeedback()` | 45 |
| 5112 | `_toggleCamView()` | 11 |
| 5123 | `_syncCamViewVis()` | 8 |
| 5131 | `_ensurePlayerTP()` | 25 |
| 5156 | `_updatePlayerTP()` | 35 |
| 5191 | `_tpDeath()` | 18 |
| 5209 | `_tpRevive()` | 13 |
| 5222 | `_moveEntity()` | 98 |
| 5320 | `_updatePlayer()` | 247 |
| 5567 | `_footstepSurface()` | 13 |
| 5580 | `_updatePickups()` | 148 |
| 5728 | `_wpnMode()` | 5 |
| 5733 | `_botWeapon()` | 10 |
| 5743 | `_municaoInfinita()` | 1 |
| 5744 | `_pickupAllowed()` | 7 |
| 5751 | `_grabPickup()` | 35 |
| 5786 | `_assentarNoChao()` | 10 |
| 5796 | `refreshPickupModels()` | 24 |
| 5820 | `_dropWeapon()` | 20 |
| 5840 | `_sumirDrop()` | 36 |
| 5876 | `_spawnY()` | 3 |
| 5879 | `_spawnYaw()` | 5 |
| 5884 | `_pickSpawn()` | 23 |
| 5907 | `_respawnPlayer()` | 29 |
| 5936 | `_losClear()` | 18 |
| 5954 | `_botCall()` | 41 |
| 5995 | `_teamMarkTex()` | 23 |
| 6018 | `_makeTeamMark()` | 16 |
| 6034 | `_syncRemoteWeapon()` | 22 |
| 6056 | `_updateTeamMark()` | 7 |
| 6063 | `_botEye()` | 1 |
| 6064 | `_enemyOf()` | 8 |
| 6072 | `_duelToken()` | 22 |
| 6094 | `_respawnEntity()` | 21 |
| 6115 | `_updateBot()` | 822 |
| 6937 | `_flushTraining()` | 13 |
| 6950 | `_updateBotNN()` | 73 |
| 7023 | `_botShootNN()` | 46 |
| 7069 | `_radarFoot()` | 38 |
| 7107 | `_updateRadar()` | 64 |
| 7171 | `_banner()` | 26 |
| 7197 | `_resultadoDaRodada()` | 4 |
| 7201 | `_showScoreboard()` | 48 |
| 7249 | `_updateWeaponHud()` | 35 |
| 7284 | `_updateHud()` | 88 |
| 7372 | `update()` | 90 |
| 7462 | `dispose()` | 44 |

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
