# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.172 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6895 | 249 |
| `public/js/main.js` | 2681 | 252 |
| `public/js/glbchars.js` | 838 | 60 |
| `public/js/characters.js` | 1069 | 40 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 345 | 20 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3101 linhas (45% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 812 | 5546 | `_updateBot()` | ⚠️ candidato a extração |
| 538 | 572 | `constructor()` | 🔴 append-only |
| 315 | 4779 | `_updatePlayer()` | ⚠️ candidato a extração |
| 248 | 2141 | `_resetPositions()` |  |
| 241 | 1207 | `_buildViewModels()` |  |
| 148 | 5094 | `_updatePickups()` |  |
| 133 | 4356 | `_botCtf()` |  |
| 115 | 1885 | `_touchControls()` |  |
| 84 | 4090 | `_initCTF()` |  |
| 83 | 2929 | `_tryShoot()` |  |
| 80 | 6702 | `_updateHud()` |  |
| 79 | 3290 | `_dmgArc()` |  |
| 76 | 4495 | `_updateCtfHud()` |  |
| 76 | 6782 | `update()` | 🔴 append-only |
| 73 | 3217 | `_kill()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `304–306` `335–429` `456–477` `1207–1605` `2694–2699` `2781–2864` `2883–3076` `3511–3534` `3582–3644` `3711–3727` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `158–161` `212–212` `238–249` `519–530` `3178–3289` `4034–4089` `4252–4488` `4571–4593` `4779–5093` `5418–5435` `5517–6357` | — |
| **MAPAS / MUNDO** | `1153–1206` `2141–2388` `4090–4229` `5094–5241` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1606–1615` `1730–1761` `2624–2636` `3535–3573` `3655–3710` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1110–1152` `2581–2602` `2618–2623` `2637–2643` `3290–3431` `3447–3510` `6525–6588` `6619–6666` `6702–6781` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6782–6857 · `_dom()` 1110–1152 · `constructor()` 572–1109

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3728 de 6895 linhas (54%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 36 | `REPLAY_CAM` | 3 |
| 45 | `VMLAB` | 8 |
| 53 | `VM_MAT_LEGACY` | 4 |
| 59 | `DROP_TTL` | 8 |
| 67 | `ROUNDS_MAX` | 27 |
| 97 | `CTF_CLOCK_SHOW` | 4 |
| 101 | `KILLS_PER_PLAYER` | 7 |
| 108 | `PACE` | 33 |
| 141 | `PAUSE_ARM_MS` | 9 |
| 151 | `confirmGate` | 7 |
| 162 | `BOT_AIM_PITCH` | 4 |
| 166 | `BOT_DMG_PLAYER` | 21 |
| 187 | `BOT_FAIR` | 5 |
| 192 | `BOT_MOVE2` | 15 |
| 216 | `BOT_FOCUS_MIN` | 22 |
| 242 | `BOT_TOKEN_REST` | 7 |
| 250 | `MOVE_MUL` | 6 |
| 257 | `MOVE2` | 5 |
| 262 | `RACK_OLD` | 4 |
| 266 | `RACK_RETA` | 25 |
| 293 | `RADIO` | 5 |
| 299 | `MK_LABELS` | 5 |
| 304 | `GUNFEEL` | 3 |
| 308 | `D2R` | 4 |
| 312 | `DMG_FALLOFF` | 5 |
| 317 | `HS_MUL` | 3 |
| 320 | `BALL_CLASS` | 15 |
| 335 | `STATIC_CLASS` | 75 |
| 411 | `VM_KNOB` | 19 |
| 432 | `vmFovForAspect` | 24 |
| 456 | `VM_OFF` | 22 |
| 478 | `vmOffY` | 35 |
| 513 | `VMP` | 6 |
| 519 | `BOT_SKILLS` | 11 |
| 531 | `diffKey` | 4 |
| 536 | `rollBotSkill` | 7 |
| 543 | `botTier` | 4 |
| 547 | `_cyclePool` | 4 |
| 551 | `_rosterPool` | 12 |
| 563 | `pickMatchRoster` | 8 |
| 572 | `constructor()` | 538 |
| 1110 | `_dom()` | 43 |
| 1153 | `_buildEnv()` | 54 |
| 1207 | `_buildViewModels()` | 241 |
| 1448 | `_vmFrame` | 158 |
| 1606 | `_makePuffTexture()` | 10 |
| 1616 | `_makeBloodTex()` | 19 |
| 1635 | `_makeBloodPoolTex()` | 21 |
| 1656 | `_bloodDecal()` | 16 |
| 1672 | `_makeBloodFx()` | 20 |
| 1692 | `_bloodSpatter()` | 18 |
| 1710 | `_bloodPoolAt()` | 6 |
| 1716 | `_updateBlood()` | 14 |
| 1730 | `_makeFlashTex()` | 22 |
| 1752 | `_makeFlashCoreTex()` | 10 |
| 1762 | `_input()` | 2 |
| 1764 | `_kd` | 42 |
| 1806 | `_ku` | 4 |
| 1810 | `_md` | 34 |
| 1844 | `_mu` | 7 |
| 1851 | `_mm` | 15 |
| 1866 | `_cc` | 1 |
| 1867 | `_blur` | 1 |
| 1868 | `_plc` | 17 |
| 1885 | `_touchControls()` | 115 |
| 2000 | `_aimAssist()` | 28 |
| 2028 | `_requestLock()` | 24 |
| 2052 | `_travaAtalhos()` | 4 |
| 2056 | `_soltaAtalhos()` | 3 |
| 2059 | `_acceptInput()` | 8 |
| 2067 | `_pauseBackdrop()` | 7 |
| 2074 | `_radioShow()` | 6 |
| 2080 | `_radioUi()` | 8 |
| 2088 | `_radioPick()` | 14 |
| 2102 | `start()` | 4 |
| 2106 | `_startRound()` | 35 |
| 2141 | `_resetPositions()` | 248 |
| 2389 | `_checkCtfAlvo()` | 13 |
| 2402 | `_checkPace()` | 13 |
| 2415 | `_endRound()` | 37 |
| 2452 | `_fimDaPartida()` | 7 |
| 2459 | `_endMatch()` | 58 |
| 2517 | `_ensureDolly()` | 41 |
| 2558 | `_tickDolly()` | 23 |
| 2581 | `setPaused()` | 22 |
| 2603 | `_now()` | 3 |
| 2606 | `pauseArmed()` | 1 |
| 2607 | `_syncPauseArm()` | 7 |
| 2614 | `resume()` | 4 |
| 2618 | `applySettings()` | 6 |
| 2624 | `_applyQuality()` | 13 |
| 2637 | `onResize()` | 7 |
| 2644 | `_switchTeam()` | 50 |
| 2694 | `_applyVmVisibility()` | 6 |
| 2700 | `_vmlabEnsure()` | 14 |
| 2714 | `_vmlabFrame()` | 28 |
| 2742 | `_tuneGet()` | 15 |
| 2757 | `_tune()` | 23 |
| 2780 | `_fxSet()` | 1 |
| 2781 | `_switchWeapon()` | 32 |
| 2813 | `_deploySfx()` | 7 |
| 2820 | `_scope()` | 17 |
| 2837 | `_zoomFov()` | 8 |
| 2845 | `_reloading()` | 1 |
| 2846 | `_startReload()` | 19 |
| 2865 | `_reloadLayers()` | 18 |
| 2883 | `_installRecoil()` | 33 |
| 2916 | `_shotRecoil()` | 13 |
| 2929 | `_tryShoot()` | 83 |
| 3012 | `_meleeHit()` | 12 |
| 3024 | `_fireHitscan()` | 53 |
| 3077 | `_surfaceOf()` | 27 |
| 3104 | `_fleshImpact()` | 35 |
| 3139 | `_fxVoice()` | 9 |
| 3148 | `_impactSfx()` | 14 |
| 3162 | `_tintFx()` | 16 |
| 3178 | `_damage()` | 39 |
| 3217 | `_kill()` | 73 |
| 3290 | `_dmgArc()` | 79 |
| 3369 | `_mkBanner()` | 9 |
| 3378 | `_hitmarker()` | 15 |
| 3393 | `_dmgNumber()` | 20 |
| 3413 | `_feed()` | 19 |
| 3432 | `_skullIcon()` | 6 |
| 3438 | `_killfeedWeaponIcon()` | 9 |
| 3447 | `_wpnIcon()` | 64 |
| 3511 | `_tracer()` | 24 |
| 3535 | `_puff()` | 39 |
| 3574 | `_holeDecalMat()` | 8 |
| 3582 | `_flash()` | 54 |
| 3636 | `_muzzleWorld()` | 9 |
| 3645 | `_updateDoors()` | 10 |
| 3655 | `_updateFx()` | 56 |
| 3711 | `_ejectCasing()` | 17 |
| 3728 | `_makeCtfFlagTex()` | 23 |
| 3751 | `_paintFlagSymbol()` | 9 |
| 3760 | `_flagTexFor()` | 26 |
| 3786 | `_legadoSimbolo()` | 8 |
| 3794 | `_loadCtfSymbols()` | 22 |
| 3816 | `_makeCtfZoneTex()` | 31 |
| 3847 | `_makeSmokeTex()` | 8 |
| 3855 | `_updateSmokeHud()` | 6 |
| 3861 | `_spawnGrenade()` | 11 |
| 3872 | `_throwSmoke()` | 8 |
| 3880 | `_throwFrag()` | 10 |
| 3890 | `_explodeFrag()` | 38 |
| 3928 | `_corDaFumaca()` | 15 |
| 3943 | `_popSmoke()` | 19 |
| 3962 | `_updateGrenades()` | 27 |
| 3989 | `_teamColor()` | 14 |
| 4003 | `_teamInk()` | 6 |
| 4009 | `_factionOf()` | 1 |
| 4010 | `_voiceKey()` | 1 |
| 4011 | `_teamName()` | 1 |
| 4012 | `_teamTag()` | 6 |
| 4018 | `_plaqueta()` | 13 |
| 4031 | `_mirror()` | 3 |
| 4034 | `_botSeparation()` | 56 |
| 4090 | `_initCTF()` | 84 |
| 4174 | `_updateCTF()` | 56 |
| 4230 | `_ctfWin()` | 22 |
| 4252 | `_freeYaw()` | 25 |
| 4277 | `_pullString()` | 23 |
| 4300 | `_walkReach()` | 18 |
| 4318 | `_wpComp()` | 16 |
| 4334 | `_findPathLocal()` | 22 |
| 4356 | `_botCtf()` | 133 |
| 4489 | `_hideCtfHud()` | 6 |
| 4495 | `_updateCtfHud()` | 76 |
| 4571 | `_collide()` | 23 |
| 4594 | `_collideRot()` | 26 |
| 4620 | `_freeSpot()` | 30 |
| 4650 | `_retaAndavel()` | 20 |
| 4670 | `_walkDepth()` | 16 |
| 4686 | `_noteHit()` | 17 |
| 4703 | `_deathFeedback()` | 43 |
| 4746 | `_updateReplayCam()` | 33 |
| 4779 | `_updatePlayer()` | 315 |
| 5094 | `_updatePickups()` | 148 |
| 5242 | `_wpnMode()` | 5 |
| 5247 | `_botWeapon()` | 12 |
| 5259 | `_municaoInfinita()` | 1 |
| 5260 | `_pickupAllowed()` | 7 |
| 5267 | `_grabPickup()` | 35 |
| 5302 | `_assentarNoChao()` | 11 |
| 5313 | `_dropWeapon()` | 18 |
| 5331 | `_sumirDrop()` | 36 |
| 5367 | `_spawnY()` | 3 |
| 5370 | `_pickSpawn()` | 23 |
| 5393 | `_respawnPlayer()` | 25 |
| 5418 | `_losClear()` | 18 |
| 5436 | `_botCall()` | 37 |
| 5473 | `_teamMarkTex()` | 23 |
| 5496 | `_makeTeamMark()` | 14 |
| 5510 | `_updateTeamMark()` | 7 |
| 5517 | `_botEye()` | 1 |
| 5518 | `_enemyOf()` | 8 |
| 5526 | `_duelToken()` | 20 |
| 5546 | `_updateBot()` | 812 |
| 6358 | `_flushTraining()` | 13 |
| 6371 | `_updateBotNN()` | 71 |
| 6442 | `_botShootNN()` | 45 |
| 6487 | `_radarFoot()` | 38 |
| 6525 | `_updateRadar()` | 64 |
| 6589 | `_banner()` | 26 |
| 6615 | `_resultadoDaRodada()` | 4 |
| 6619 | `_showScoreboard()` | 48 |
| 6667 | `_updateWeaponHud()` | 35 |
| 6702 | `_updateHud()` | 80 |
| 6782 | `update()` | 76 |
| 6858 | `dispose()` | 37 |

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
