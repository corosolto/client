# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.0.0-alpha.116 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 6484 | 228 |
| `public/js/main.js` | 2028 | 182 |
| `public/js/glbchars.js` | 838 | 60 |
| `public/js/characters.js` | 1076 | 42 |
| `public/js/vmattach.js` | 629 | 4 |
| `public/js/springs.js` | 261 | 28 |
| `public/js/weapons.js` | 345 | 20 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3010 linhas (46% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 797 | 5184 | `_updateBot()` | ⚠️ candidato a extração |
| 543 | 575 | `constructor()` | 🔴 append-only |
| 310 | 4422 | `_updatePlayer()` | ⚠️ candidato a extração |
| 248 | 1877 | `_resetPositions()` |  |
| 241 | 1207 | `_buildViewModels()` |  |
| 148 | 4732 | `_updatePickups()` |  |
| 133 | 4032 | `_botCtf()` |  |
| 84 | 3766 | `_initCTF()` |  |
| 83 | 2655 | `_tryShoot()` |  |
| 79 | 2991 | `_dmgArc()` |  |
| 76 | 4171 | `_updateCtfHud()` |  |
| 71 | 5994 | `_updateBotNN()` |  |
| 67 | 6381 | `update()` | 🔴 append-only |
| 66 | 6147 | `_updateRadar()` |  |
| 64 | 2927 | `_kill()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `25–73` `336–336` `364–458` `485–506` `1207–1605` `2420–2425` `2507–2590` `2609–2802` `3206–3229` `3277–3339` `3405–3421` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `190–193` `244–244` `270–281` `548–559` `2888–2990` `3710–3765` `3928–4164` `4247–4269` `4422–4731` `5056–5073` `5155–5980` | — |
| **MAPAS / MUNDO** | `1153–1206` `1877–2124` `3766–3905` `4732–4879` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1606–1648` `2356–2368` `3230–3268` `3350–3404` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1118–1152` `2316–2334` `2350–2355` `2369–2375` `2991–3205` `6147–6212` `6243–6286` `6322–6380` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 6381–6447 · `_dom()` 1118–1152 · `constructor()` 575–1117

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3712 de 6484 linhas (57%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 25 | `WEAPONS` | 49 |
| 76 | `VMLAB` | 8 |
| 84 | `VM_MAT_LEGACY` | 4 |
| 90 | `DROP_TTL` | 8 |
| 98 | `ROUNDS_MAX` | 28 |
| 129 | `CTF_CLOCK_SHOW` | 4 |
| 133 | `KILLS_PER_PLAYER` | 7 |
| 140 | `PACE` | 33 |
| 173 | `PAUSE_ARM_MS` | 9 |
| 183 | `confirmGate` | 7 |
| 194 | `BOT_AIM_PITCH` | 4 |
| 198 | `BOT_DMG_PLAYER` | 21 |
| 219 | `BOT_FAIR` | 5 |
| 224 | `BOT_MOVE2` | 15 |
| 248 | `BOT_FOCUS_MIN` | 22 |
| 274 | `BOT_TOKEN_REST` | 7 |
| 282 | `MOVE_MUL` | 6 |
| 289 | `MOVE2` | 5 |
| 294 | `RACK_OLD` | 4 |
| 298 | `RACK_RETA` | 25 |
| 325 | `RADIO` | 5 |
| 331 | `MK_LABELS` | 5 |
| 337 | `D2R` | 4 |
| 341 | `DMG_FALLOFF` | 5 |
| 346 | `HS_MUL` | 3 |
| 349 | `BALL_CLASS` | 15 |
| 364 | `STATIC_CLASS` | 75 |
| 440 | `VM_KNOB` | 19 |
| 461 | `vmFovForAspect` | 24 |
| 485 | `VM_OFF` | 22 |
| 507 | `vmOffY` | 35 |
| 542 | `VMP` | 6 |
| 548 | `BOT_SKILLS` | 11 |
| 560 | `diffKey` | 4 |
| 565 | `rollBotSkill` | 7 |
| 575 | `constructor()` | 543 |
| 1118 | `_dom()` | 35 |
| 1153 | `_buildEnv()` | 54 |
| 1207 | `_buildViewModels()` | 241 |
| 1448 | `_vmFrame` | 158 |
| 1606 | `_makePuffTexture()` | 11 |
| 1617 | `_makeFlashTex()` | 22 |
| 1639 | `_makeFlashCoreTex()` | 10 |
| 1649 | `_input()` | 2 |
| 1651 | `_kd` | 39 |
| 1690 | `_ku` | 4 |
| 1694 | `_md` | 34 |
| 1728 | `_mu` | 7 |
| 1735 | `_mm` | 14 |
| 1749 | `_cc` | 1 |
| 1750 | `_blur` | 1 |
| 1751 | `_plc` | 14 |
| 1765 | `_requestLock()` | 23 |
| 1788 | `_travaAtalhos()` | 4 |
| 1792 | `_soltaAtalhos()` | 3 |
| 1795 | `_acceptInput()` | 8 |
| 1803 | `_pauseBackdrop()` | 7 |
| 1810 | `_radioShow()` | 6 |
| 1816 | `_radioUi()` | 8 |
| 1824 | `_radioPick()` | 14 |
| 1838 | `start()` | 4 |
| 1842 | `_startRound()` | 35 |
| 1877 | `_resetPositions()` | 248 |
| 2125 | `_checkCtfAlvo()` | 13 |
| 2138 | `_checkPace()` | 13 |
| 2151 | `_endRound()` | 37 |
| 2188 | `_fimDaPartida()` | 14 |
| 2202 | `_endMatch()` | 50 |
| 2252 | `_ensureDolly()` | 41 |
| 2293 | `_tickDolly()` | 23 |
| 2316 | `setPaused()` | 19 |
| 2335 | `_now()` | 3 |
| 2338 | `pauseArmed()` | 1 |
| 2339 | `_syncPauseArm()` | 7 |
| 2346 | `resume()` | 4 |
| 2350 | `applySettings()` | 6 |
| 2356 | `_applyQuality()` | 13 |
| 2369 | `onResize()` | 7 |
| 2376 | `_switchTeam()` | 44 |
| 2420 | `_applyVmVisibility()` | 6 |
| 2426 | `_vmlabEnsure()` | 14 |
| 2440 | `_vmlabFrame()` | 28 |
| 2468 | `_tuneGet()` | 15 |
| 2483 | `_tune()` | 23 |
| 2506 | `_fxSet()` | 1 |
| 2507 | `_switchWeapon()` | 32 |
| 2539 | `_deploySfx()` | 7 |
| 2546 | `_scope()` | 17 |
| 2563 | `_zoomFov()` | 8 |
| 2571 | `_reloading()` | 1 |
| 2572 | `_startReload()` | 19 |
| 2591 | `_reloadLayers()` | 18 |
| 2609 | `_installRecoil()` | 33 |
| 2642 | `_shotRecoil()` | 13 |
| 2655 | `_tryShoot()` | 83 |
| 2738 | `_meleeHit()` | 12 |
| 2750 | `_fireHitscan()` | 53 |
| 2803 | `_surfaceOf()` | 27 |
| 2830 | `_fleshImpact()` | 19 |
| 2849 | `_fxVoice()` | 9 |
| 2858 | `_impactSfx()` | 14 |
| 2872 | `_tintFx()` | 16 |
| 2888 | `_damage()` | 39 |
| 2927 | `_kill()` | 64 |
| 2991 | `_dmgArc()` | 79 |
| 3070 | `_mkBanner()` | 9 |
| 3079 | `_hitmarker()` | 15 |
| 3094 | `_dmgNumber()` | 20 |
| 3114 | `_feed()` | 19 |
| 3133 | `_skullIcon()` | 9 |
| 3142 | `_wpnIcon()` | 64 |
| 3206 | `_tracer()` | 24 |
| 3230 | `_puff()` | 39 |
| 3269 | `_holeDecalMat()` | 8 |
| 3277 | `_flash()` | 54 |
| 3331 | `_muzzleWorld()` | 9 |
| 3340 | `_updateDoors()` | 10 |
| 3350 | `_updateFx()` | 55 |
| 3405 | `_ejectCasing()` | 17 |
| 3422 | `_makeCtfFlagTex()` | 23 |
| 3445 | `_paintFlagSymbol()` | 9 |
| 3454 | `_flagTexFor()` | 26 |
| 3480 | `_legadoSimbolo()` | 8 |
| 3488 | `_loadCtfSymbols()` | 22 |
| 3510 | `_makeCtfZoneTex()` | 31 |
| 3541 | `_makeSmokeTex()` | 8 |
| 3549 | `_updateSmokeHud()` | 6 |
| 3555 | `_spawnGrenade()` | 11 |
| 3566 | `_throwSmoke()` | 8 |
| 3574 | `_throwFrag()` | 10 |
| 3584 | `_explodeFrag()` | 38 |
| 3622 | `_corDaFumaca()` | 15 |
| 3637 | `_popSmoke()` | 19 |
| 3656 | `_updateGrenades()` | 27 |
| 3683 | `_teamColor()` | 14 |
| 3697 | `_teamInk()` | 6 |
| 3703 | `_factionOf()` | 1 |
| 3704 | `_voiceKey()` | 1 |
| 3705 | `_teamName()` | 1 |
| 3706 | `_teamTag()` | 1 |
| 3707 | `_mirror()` | 3 |
| 3710 | `_botSeparation()` | 56 |
| 3766 | `_initCTF()` | 84 |
| 3850 | `_updateCTF()` | 56 |
| 3906 | `_ctfWin()` | 22 |
| 3928 | `_freeYaw()` | 25 |
| 3953 | `_pullString()` | 23 |
| 3976 | `_walkReach()` | 18 |
| 3994 | `_wpComp()` | 16 |
| 4010 | `_findPathLocal()` | 22 |
| 4032 | `_botCtf()` | 133 |
| 4165 | `_hideCtfHud()` | 6 |
| 4171 | `_updateCtfHud()` | 76 |
| 4247 | `_collide()` | 23 |
| 4270 | `_collideRot()` | 26 |
| 4296 | `_freeSpot()` | 30 |
| 4326 | `_retaAndavel()` | 20 |
| 4346 | `_walkDepth()` | 16 |
| 4362 | `_noteHit()` | 17 |
| 4379 | `_deathFeedback()` | 43 |
| 4422 | `_updatePlayer()` | 310 |
| 4732 | `_updatePickups()` | 148 |
| 4880 | `_wpnMode()` | 5 |
| 4885 | `_botWeapon()` | 12 |
| 4897 | `_municaoInfinita()` | 1 |
| 4898 | `_pickupAllowed()` | 7 |
| 4905 | `_grabPickup()` | 35 |
| 4940 | `_assentarNoChao()` | 11 |
| 4951 | `_dropWeapon()` | 18 |
| 4969 | `_sumirDrop()` | 36 |
| 5005 | `_spawnY()` | 3 |
| 5008 | `_pickSpawn()` | 23 |
| 5031 | `_respawnPlayer()` | 25 |
| 5056 | `_losClear()` | 18 |
| 5074 | `_botCall()` | 37 |
| 5111 | `_teamMarkTex()` | 23 |
| 5134 | `_makeTeamMark()` | 14 |
| 5148 | `_updateTeamMark()` | 7 |
| 5155 | `_botEye()` | 1 |
| 5156 | `_enemyOf()` | 8 |
| 5164 | `_duelToken()` | 20 |
| 5184 | `_updateBot()` | 797 |
| 5981 | `_flushTraining()` | 13 |
| 5994 | `_updateBotNN()` | 71 |
| 6065 | `_botShootNN()` | 44 |
| 6109 | `_radarFoot()` | 38 |
| 6147 | `_updateRadar()` | 66 |
| 6213 | `_banner()` | 26 |
| 6239 | `_resultadoDaRodada()` | 4 |
| 6243 | `_showScoreboard()` | 44 |
| 6287 | `_updateWeaponHud()` | 35 |
| 6322 | `_updateHud()` | 59 |
| 6381 | `update()` | 67 |
| 6448 | `dispose()` | 36 |

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
