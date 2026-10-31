# ARCH.md — mapa de arquitetura e de CONFLITO (CS BRASIL / CORO SOLTO)

<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->

> Gerado por `node tools/gen-arch.mjs`. **Não edite este bloco à mão.**
> Versão do jogo: 2.1.0-alpha.130 · `npm run arch` para regenerar · `npm run arch:check` no CI.

## Tamanho dos arquivos indexados

| Arquivo | Linhas | Símbolos |
|---|---:|---:|
| `public/js/game.js` | 9063 | 379 |
| `public/js/main.js` | 5285 | 400 |
| `public/js/glbchars.js` | 1309 | 92 |
| `public/js/characters.js` | 1143 | 42 |
| `public/js/vmattach.js` | 353 | 3 |
| `public/js/springs.js` | 260 | 28 |
| `public/js/weapons.js` | 361 | 22 |

## Maiores métodos de `game.js` — onde o conflito mora

Os 15 maiores somam **3269 linhas (36% do arquivo)**. Método grande = PR irrevisável e merge conflitante.

| Linhas | Início | Método | |
|---:|---:|---|---|
| 823 | 7589 | `_updateBot()` | ⚠️ candidato a extração |
| 649 | 730 | `constructor()` | 🔴 append-only |
| 344 | 6628 | `_updatePlayer()` | ⚠️ candidato a extração |
| 267 | 2820 | `_resetPositions()` |  |
| 158 | 6985 | `_updatePickups()` |  |
| 137 | 5790 | `_botCtf()` |  |
| 134 | 2270 | `_touchControls()` |  |
| 122 | 8798 | `_updateHud()` |  |
| 105 | 6344 | `_updatePlayerTP()` |  |
| 101 | 6527 | `_moveEntity()` |  |
| 95 | 3933 | `_tryShoot()` |  |
| 90 | 8920 | `update()` | 🔴 append-only |
| 86 | 5501 | `_initCTF()` |  |
| 79 | 3473 | `_ensureVmPrecisionQa()` |  |
| 79 | 4517 | `_dmgArc()` |  |

## Tabela de CONFLITO — resolvida para as linhas de hoje

Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.
Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram
faixas disjuntas simultaneamente com zero conflito de conteúdo.

| Frente | Faixas em `game.js` | Arquivos exclusivos |
|---|---|---|
| **ARMAS / VIEWMODEL** | `364–367` `443–537` `567–588` `1483–1769` `3439–3472` `3720–3821` `3887–4027` `4042–4057` `4202–4247` `4788–4813` `4861–4961` `5034–5051` | `public/js/vmattach.js` `public/js/springs.js` `public/js/weapons.js` `public/js/fparms.js` `public/js/handik.js` `public/js/recoil.js` `public/js/vmlab.js` |
| **BOTS / JOGABILIDADE** | `196–199` `250–250` `283–294` `630–641` `4376–4486` `5440–5500` `5672–5926` `6009–6031` `6628–6971` `7372–7389` `7523–7553` `7589–8411` | — |
| **MAPAS / MUNDO** | `1426–1482` `2820–3086` `5501–5647` `6985–7142` | `public/js/maps.js` `public/js/mapprops.js` `public/js/map_brasilia.js` `public/js/map_havan.js` `public/js/map_piscina.js` `public/js/map_piscinao_ramos.js` `public/js/map_ferrovelho.js` |
| **GRÁFICOS / FX** | `1926–1935` `2051–2089` `3339–3352` `4814–4852` `4977–5033` | `public/js/bloom.js` `public/js/textures.js` `public/js/vao.js` `public/js/stylize.js` `public/js/gpuparticles.js` |
| **UI / HUD / MENU** | `1379–1425` `3291–3313` `3329–3338` `3353–3372` `4517–4595` `4655–4708` `4724–4787` `8598–8645` `8703–8756` `8798–8919` | `public/js/main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | — | `public/js/audio.js` |
| **PERSONAGENS** | — | `public/js/characters.js` `public/js/glbchars.js` |
| **SITE / BACKEND** | — | `src/` `supabase/` |

**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** `update()` 8920–9009 · `_dom()` 1379–1425 · `constructor()` 730–1378

Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓

Cobertura: **3856 de 9063 linhas (43%)** do `game.js` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.

<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>

| Linha | Símbolo | Linhas |
|---:|---|---:|
| 59 | `ANNOUNCER_LAB` | 4 |
| 63 | `VMLAB` | 3 |
| 68 | `VM_QA_CICLO` | 3 |
| 72 | `VM_QA_ADS` | 8 |
| 80 | `VM_MAT_LEGACY` | 4 |
| 86 | `DROP_TTL` | 8 |
| 94 | `ROUNDS_MAX` | 27 |
| 122 | `CTF_ROUNDS_TO_WIN` | 4 |
| 127 | `sanitizeRounds` | 4 |
| 132 | `CTF_CLOCK_SHOW` | 4 |
| 136 | `KILLS_PER_PLAYER` | 7 |
| 143 | `PACE` | 33 |
| 176 | `PAUSE_ARM_MS` | 3 |
| 179 | `CHAT_PAUSA_GUARDA_MS` | 9 |
| 189 | `confirmGate` | 7 |
| 200 | `BOT_AIM_PITCH` | 4 |
| 204 | `BOT_DMG_PLAYER` | 21 |
| 225 | `BOT_FAIR` | 5 |
| 230 | `BOT_MOVE2` | 15 |
| 254 | `BOT_FOCUS_MIN` | 3 |
| 261 | `BOT_OUVE_PASSO` | 22 |
| 287 | `BOT_TOKEN_REST` | 7 |
| 295 | `MOVE_MUL` | 6 |
| 302 | `MOVE2` | 4 |
| 306 | `STEP_H` | 3 |
| 313 | `MANTLE_APOIO` | 4 |
| 317 | `MANTLE_GRID` | 5 |
| 322 | `RACK_OLD` | 4 |
| 326 | `RACK_RETA` | 25 |
| 353 | `RADIO` | 5 |
| 359 | `MK_LABELS` | 5 |
| 364 | `GUNFEEL` | 4 |
| 371 | `TRACER_STYLE` | 6 |
| 381 | `ADS_RAMPA_S` | 3 |
| 385 | `aberturaCone` | 16 |
| 401 | `anguloDeDisparo` | 4 |
| 405 | `coneDoDisparo` | 16 |
| 423 | `MOBILE_RADAR_INTERVAL` | 3 |
| 426 | `TOUCH_LOOK_RAD_PX` | 4 |
| 430 | `DMG_FALLOFF` | 5 |
| 435 | `HS_MUL` | 3 |
| 438 | `BALL_CLASS` | 5 |
| 443 | `STATIC_CLASS` | 75 |
| 519 | `VM_KNOB` | 19 |
| 538 | `vmAdsRot` | 4 |
| 543 | `vmFovForAspect` | 24 |
| 567 | `VM_OFF` | 22 |
| 589 | `vmOffY` | 35 |
| 624 | `VMP` | 6 |
| 630 | `BOT_SKILLS` | 11 |
| 642 | `diffKey` | 4 |
| 647 | `rollBotSkill` | 7 |
| 654 | `botTier` | 4 |
| 658 | `_cyclePool` | 5 |
| 663 | `_rosterPool` | 22 |
| 687 | `_pinnedDefs` | 5 |
| 692 | `pickMatchRoster` | 21 |
| 713 | `BOT_WEAPON_POOL` | 5 |
| 718 | `pickMatchWeapons` | 9 |
| 730 | `constructor()` | 649 |
| 1379 | `_dom()` | 47 |
| 1426 | `_buildEnv()` | 57 |
| 1483 | `_buildViewModels()` | 3 |
| 1486 | `_vmFrame` | 284 |
| 1770 | `_vmFrame` | 142 |
| 1912 | `_vmMontarTardio` | 14 |
| 1926 | `_makePuffTexture()` | 10 |
| 1936 | `_makeBloodTex()` | 19 |
| 1955 | `_makeBloodPoolTex()` | 21 |
| 1976 | `_bloodDecal()` | 16 |
| 1992 | `_makeBloodFx()` | 21 |
| 2013 | `_bloodSpatter()` | 18 |
| 2031 | `_bloodPoolAt()` | 6 |
| 2037 | `_updateBlood()` | 14 |
| 2051 | `_makeFlashTex()` | 21 |
| 2072 | `_makeFlashSoftTex()` | 8 |
| 2080 | `_makeFlashCoreTex()` | 10 |
| 2090 | `_input()` | 6 |
| 2096 | `_kd` | 62 |
| 2158 | `_ku` | 5 |
| 2163 | `_md` | 42 |
| 2205 | `_mu` | 7 |
| 2212 | `_mm` | 20 |
| 2232 | `_wh` | 17 |
| 2249 | `_cc` | 1 |
| 2250 | `_blur` | 1 |
| 2251 | `_plc` | 19 |
| 2270 | `_touchControls()` | 134 |
| 2404 | `_touchLook()` | 12 |
| 2416 | `_syncTouchWeps()` | 16 |
| 2432 | `_aimAssist()` | 28 |
| 2460 | `_requestLock()` | 27 |
| 2487 | `_travaAtalhos()` | 4 |
| 2491 | `_soltaAtalhos()` | 5 |
| 2496 | `espectando()` | 2 |
| 2498 | `_acceptInput()` | 7 |
| 2505 | `travarEntrada()` | 17 |
| 2522 | `_chatSeguraPausa()` | 5 |
| 2527 | `_pauseBackdrop()` | 7 |
| 2534 | `_radioShow()` | 6 |
| 2540 | `_radioUi()` | 10 |
| 2550 | `_emoteToggle()` | 10 |
| 2560 | `_emoteMods()` | 9 |
| 2569 | `_emoteUi()` | 20 |
| 2589 | `_emoteClose()` | 6 |
| 2595 | `_emotePick()` | 11 |
| 2606 | `_emoteCtrl()` | 4 |
| 2610 | `_emoteStop()` | 10 |
| 2620 | `_emoteTick()` | 7 |
| 2627 | `_radioPick()` | 20 |
| 2647 | `_abilityNotice()` | 10 |
| 2657 | `_resetSliceAbilities()` | 9 |
| 2666 | `_stackTrace()` | 28 |
| 2694 | `_updateMotocaCharge()` | 10 |
| 2704 | `_recordRoutePoint()` | 11 |
| 2715 | `_routePing()` | 23 |
| 2738 | `_tickRoutePings()` | 12 |
| 2750 | `_objectiveInteractionMultiplier()` | 14 |
| 2764 | `start()` | 5 |
| 2769 | `_startAnnouncerLab()` | 9 |
| 2778 | `_startRound()` | 42 |
| 2820 | `_resetPositions()` | 267 |
| 3087 | `_checkCtfAlvo()` | 13 |
| 3100 | `_checkPace()` | 13 |
| 3113 | `_endRound()` | 34 |
| 3147 | `_roundWinnerVoice()` | 12 |
| 3159 | `_fimDaPartida()` | 7 |
| 3168 | `_modeId()` | 1 |
| 3169 | `_teamPopulation()` | 5 |
| 3166 | `_endMatch()` | 61 |
| 3227 | `_ensureDolly()` | 41 |
| 3268 | `_tickDolly()` | 23 |
| 3291 | `setPaused()` | 23 |
| 3314 | `_now()` | 3 |
| 3317 | `pauseArmed()` | 1 |
| 3318 | `_syncPauseArm()` | 7 |
| 3325 | `resume()` | 4 |
| 3329 | `applySettings()` | 10 |
| 3339 | `_applyQuality()` | 14 |
| 3353 | `onResize()` | 20 |
| 3373 | `_switchTeam()` | 66 |
| 3439 | `_applyVmVisibility()` | 34 |
| 3473 | `_ensureVmPrecisionQa()` | 79 |
| 3552 | `_syncVmPresentation()` | 22 |
| 3574 | `_utilidadeNaMao()` | 7 |
| 3581 | `_vmlabEnsure()` | 14 |
| 3595 | `_vmlabFrame()` | 28 |
| 3623 | `_tuneGet()` | 15 |
| 3638 | `_tune()` | 23 |
| 3661 | `_fxSet()` | 1 |
| 3662 | `aplicarEfeitosAdaptativos()` | 20 |
| 3682 | `_qaCicloArma()` | 8 |
| 3690 | `_cycleWeapon()` | 8 |
| 3698 | `_inspectWeapon()` | 8 |
| 3706 | `_cancelInspect()` | 4 |
| 3710 | `_inspectMix()` | 10 |
| 3720 | `_switchWeapon()` | 43 |
| 3763 | `_deploySfx()` | 7 |
| 3770 | `_scope()` | 18 |
| 3788 | `_zoomFov()` | 5 |
| 3793 | `_reloading()` | 1 |
| 3794 | `_startReload()` | 28 |
| 3822 | `_cancelReload()` | 14 |
| 3836 | `_abortarArmaNaMorte()` | 13 |
| 3849 | `_voltarPraBase()` | 11 |
| 3860 | `_armasServidasPelaRecarga()` | 9 |
| 3869 | `_reloadLayers()` | 18 |
| 3887 | `_installRecoil()` | 33 |
| 3920 | `_shotRecoil()` | 13 |
| 3933 | `_tryShoot()` | 95 |
| 4028 | `_tryKnifeAttack()` | 14 |
| 4042 | `_meleeHit()` | 16 |
| 4058 | `_meleeRange()` | 5 |
| 4063 | `_botMelee()` | 26 |
| 4089 | `_distanceDamage()` | 7 |
| 4096 | `_shotDamage()` | 10 |
| 4106 | `_consultarTiro()` | 13 |
| 4119 | `_origemTiroBot()` | 4 |
| 4123 | `_miraTiroBot()` | 5 |
| 4128 | `_participanteHumano()` | 4 |
| 4132 | `_resolverTiroBot()` | 11 |
| 4143 | `_danoTiroBot()` | 12 |
| 4155 | `_aplicarTiroBot()` | 12 |
| 4167 | `_dispararBot()` | 29 |
| 4196 | `_rastroTiroBot()` | 6 |
| 4202 | `_fireHitscan()` | 46 |
| 4248 | `_targetFromHit()` | 9 |
| 4257 | `_penetrationExit()` | 8 |
| 4265 | `_surfaceOf()` | 27 |
| 4292 | `_armoredTarget()` | 3 |
| 4295 | `_fleshImpact()` | 38 |
| 4333 | `_fxVoice()` | 9 |
| 4342 | `_impactSfx()` | 17 |
| 4359 | `_tintFx()` | 17 |
| 4376 | `_damage()` | 49 |
| 4425 | `_playerHurtFx()` | 5 |
| 4430 | `_kill()` | 57 |
| 4487 | `_checkArenaWin()` | 30 |
| 4517 | `_dmgArc()` | 79 |
| 4596 | `_mkBanner()` | 9 |
| 4605 | `_updateKillSequenceHud()` | 13 |
| 4618 | `_resetKillSequence()` | 7 |
| 4625 | `_fragRestockStep()` | 7 |
| 4632 | `_playerKillFeedback()` | 18 |
| 4650 | `_acertoPrevisto()` | 5 |
| 4655 | `_hitmarker()` | 15 |
| 4670 | `_dmgNumber()` | 20 |
| 4690 | `_feed()` | 19 |
| 4709 | `_skullIcon()` | 6 |
| 4715 | `_killfeedWeaponIcon()` | 9 |
| 4724 | `_wpnIcon()` | 64 |
| 4788 | `_tracer()` | 26 |
| 4814 | `_puff()` | 39 |
| 4853 | `_holeDecalMat()` | 8 |
| 4861 | `_flash()` | 61 |
| 4922 | `_vmTetoTela()` | 10 |
| 4932 | `_muzzleWorld()` | 30 |
| 4962 | `_aimOrigin()` | 5 |
| 4967 | `_updateDoors()` | 10 |
| 4977 | `_updateFx()` | 57 |
| 5034 | `_ejectCasing()` | 18 |
| 5052 | `_makeCtfFlagTex()` | 23 |
| 5075 | `_paintFlagSymbol()` | 9 |
| 5084 | `_flagTexFor()` | 25 |
| 5109 | `_legadoSimbolo()` | 8 |
| 5117 | `_loadCtfSymbols()` | 22 |
| 5139 | `_makeCtfZoneTex()` | 31 |
| 5170 | `_makeSmokeTex()` | 10 |
| 5180 | `_updateSmokeHud()` | 4 |
| 5184 | `_grenadeSpatial()` | 14 |
| 5198 | `_spawnGrenade()` | 22 |
| 5220 | `_throwNade()` | 27 |
| 5247 | `_throwSmoke()` | 1 |
| 5248 | `_throwFrag()` | 2 |
| 5250 | `_equipNade()` | 16 |
| 5266 | `_unequipNade()` | 11 |
| 5277 | `_explodeFrag()` | 40 |
| 5317 | `_corDaFumaca()` | 16 |
| 5333 | `_popSmoke()` | 23 |
| 5356 | `_updateGrenades()` | 35 |
| 5391 | `_teamColor()` | 12 |
| 5403 | `_teamInk()` | 7 |
| 5410 | `_factionOf()` | 1 |
| 5411 | `_voiceKey()` | 2 |
| 5413 | `_teamName()` | 1 |
| 5414 | `_teamTag()` | 6 |
| 5420 | `_plaqueta()` | 14 |
| 5434 | `_uiV3()` | 1 |
| 5435 | `_mirror()` | 2 |
| 5437 | `_defNoLado()` | 3 |
| 5440 | `_botSeparation()` | 61 |
| 5501 | `_initCTF()` | 86 |
| 5587 | `_updateCTF()` | 61 |
| 5648 | `_ctfWin()` | 24 |
| 5672 | `_freeYaw()` | 25 |
| 5697 | `_pullString()` | 23 |
| 5720 | `_walkReach()` | 32 |
| 5752 | `_wpComp()` | 16 |
| 5768 | `_findPathLocal()` | 22 |
| 5790 | `_botCtf()` | 137 |
| 5927 | `_hideCtfHud()` | 6 |
| 5933 | `_updateCtfHud()` | 76 |
| 6009 | `_collide()` | 23 |
| 6032 | `_collideRot()` | 22 |
| 6054 | `_mantleAlcance()` | 50 |
| 6104 | `_mantleAlcancavel()` | 12 |
| 6116 | `_mantleTarget()` | 35 |
| 6151 | `_freeSpot()` | 30 |
| 6181 | `_retaAndavel()` | 20 |
| 6201 | `_walkDepth()` | 16 |
| 6217 | `_noteHit()` | 17 |
| 6234 | `_deathFeedback()` | 45 |
| 6279 | `_toggleCamView()` | 6 |
| 6285 | `setCamView()` | 19 |
| 6304 | `_syncCamViewVis()` | 8 |
| 6312 | `_ensurePlayerTP()` | 32 |
| 6344 | `_updatePlayerTP()` | 105 |
| 6449 | `_updateCrosshairParallax()` | 47 |
| 6496 | `_tpDeath()` | 18 |
| 6514 | `_tpRevive()` | 13 |
| 6527 | `_moveEntity()` | 101 |
| 6628 | `_updatePlayer()` | 344 |
| 6972 | `_footstepSurface()` | 13 |
| 6985 | `_updatePickups()` | 158 |
| 7143 | `_wpnMode()` | 7 |
| 7150 | `_botWeapon()` | 10 |
| 7160 | `_municaoInfinita()` | 1 |
| 7161 | `_pickupAllowed()` | 9 |
| 7170 | `_grabNearPickup()` | 10 |
| 7180 | `_grabPickup()` | 35 |
| 7215 | `_assentarNoChao()` | 10 |
| 7225 | `refreshPickupModels()` | 24 |
| 7249 | `_dropWeapon()` | 20 |
| 7269 | `_sumirDrop()` | 36 |
| 7305 | `_spawnY()` | 3 |
| 7308 | `_spawnYaw()` | 5 |
| 7313 | `_pickSpawn()` | 23 |
| 7336 | `_respawnPlayer()` | 36 |
| 7372 | `_losClear()` | 18 |
| 7390 | `_botCall()` | 41 |
| 7431 | `_teamMarkTex()` | 23 |
| 7454 | `_makeTeamMark()` | 16 |
| 7470 | `_trocarPersonagem()` | 19 |
| 7489 | `_syncRemoteWeapon()` | 23 |
| 7512 | `_updateTeamMark()` | 7 |
| 7519 | `_posturaBot()` | 4 |
| 7523 | `_botEye()` | 1 |
| 7524 | `_enemyOf()` | 8 |
| 7532 | `_duelToken()` | 22 |
| 7554 | `_respawnEntity()` | 23 |
| 7577 | `_botOuve()` | 12 |
| 7589 | `_updateBot()` | 823 |
| 8412 | `_flushTraining()` | 13 |
| 8425 | `_updateBotNN()` | 73 |
| 8498 | `_botShootNN()` | 31 |
| 8529 | `_radarFoot()` | 38 |
| 8567 | `_radarStatic()` | 31 |
| 8598 | `_updateRadar()` | 48 |
| 8646 | `_banner()` | 26 |
| 8672 | `_resultadoDaRodada()` | 4 |
| 8676 | `_botaoAmigo()` | 5 |
| 8681 | `_ligarAmigoPlacar()` | 22 |
| 8703 | `_showScoreboard()` | 54 |
| 8757 | `_updateWeaponHud()` | 41 |
| 8798 | `_updateHud()` | 122 |
| 8920 | `update()` | 90 |
| 9010 | `dispose()` | 53 |

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
