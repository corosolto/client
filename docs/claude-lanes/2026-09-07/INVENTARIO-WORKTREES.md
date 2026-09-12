# Inventário das worktrees do cliente CSBrasil

Gerado em 2026-09-07 (Europe/Lisbon), somente leitura.

## Escopo e leitura rápida

- Repositório Git de referência: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/client`.
- `/Users/ruben/csbrasil` é um symlink para `/Volumes/Zenith/Projects/game/corosolto/csbrasil`; os dois prefixos abaixo pertencem à mesma família Git.
- Incluídas 52 worktrees registradas sob os dois prefixos pedidos. Worktrees em `/private/tmp` foram excluídas.
- 41 worktrees limpas; 11 com mudanças locais.
- As frentes mais claramente ativas por mudanças locais são: painel de agentes, Blender/FPVM, fallback de áudio, Escadão, polimento de mapas, integração Míticos, Praça dos Poderes e M4/rifles.
- “Provável frente” foi inferida do nome da worktree, branch e último commit; não afirma o estado do PR.

## Inventário completo

| Worktree | Branch | HEAD | Status curto | Último commit | Provável frente |
|---|---|---|---|---|---|
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/client` | `feat/fps-paid-viewmodels-aaa` | `9f26f68e035b` | CLEAN | 2026-08-31 `9f26f68e` chore(ai): persistir memoria do programa de viewmodels | Viewmodels pagos/AAA e memória do programa |
| `/Users/ruben/csbrasil/worktrees/audio` | `feat/audio-voices-test` | `282ff734cb2d` | CLEAN | 2026-09-01 `282ff734` chore(audio): checkpoint da curadoria de faixas | Curadoria de músicas/vozes |
| `/Users/ruben/csbrasil/worktrees/docs` | `feat/mp-eventos-fase3` | `0e3d1cd7175d` | CLEAN | 2026-09-03 `0e3d1cd7` feat(multiplayer): granadas online — o 4/5 pede ao servidor, `nade`/`boom` desenham sem dano local (fase 3) | Multiplayer fase 3: granadas online |
| `/Users/ruben/csbrasil/worktrees/maps` | `feat/lote-ceu` | `622c4d183660` | CLEAN | 2026-09-01 `622c4d18` wip(ops): preservar utilitarios locais de continuidade | Mapas: lote céu e continuidade |
| `/Users/ruben/csbrasil/worktrees/mp-fix` | `fix/issues-bot-action-fantasma` | `f793ca11afb2` | CLEAN | 2026-09-03 `f793ca11` chore(docs): regenera blocos com o package.json do PR (eval:wflocal) | Multiplayer: ação fantasma de bot |
| `/Users/ruben/csbrasil/worktrees/multiplayer` | `fix/prod-gameplay-diagnostics` | `e670d2c9cc6c` | CLEAN | 2026-09-02 `e670d2c9` docs(multiplayer): record complete session sample | Diagnóstico de gameplay em produção |
| `/Users/ruben/csbrasil/worktrees/viewmodel-blender` | `codex/viewmodel-blender` | `98ec94cb5041` | 14 arquivo(s) | 2026-09-01 `98ec94cb` wip(asset): preservar previews do molde FP | Blender/FPVM e AK aprovada |
| `/Users/ruben/csbrasil/worktrees/vm-auto` | `codex/vm-auto` | `a9fcaff60e0d` | CLEAN | 2026-08-27 `a9fcaff6` docs: registrar evidencia visual do retarget M4 | Retarget automático/M4 |
| `/Users/ruben/csbrasil/worktrees/vm-heavy` | `codex/vm-heavy` | `062543b12f43` | CLEAN | 2026-08-31 `062543b1` test(viewmodel): preservar evidência runtime dos pesados | Viewmodels de armas pesadas |
| `/Users/ruben/csbrasil/worktrees/vm-melee` | `codex/vm-melee` | `0c370790cc67` | CLEAN | 2026-08-27 `0c370790` feat: integrar piloto aprovado de faca | Viewmodel de faca |
| `/Users/ruben/csbrasil/worktrees/vm-retarget` | `vm-cs16-gabarito` | `6451ecaf5874` | CLEAN | 2026-09-01 `6451ecaf` docs(viewmodel): handoff da sessao pausada com o que falta arma por arma | Retarget canônico CS 1.6 |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/agent-control-plane` | `codex/agent-control-plane` | `dcd8858edc7e` | 17 arquivo(s) | 2026-09-03 `dcd8858e` chore(release): v2.0.0-alpha.217 | Painel de controle dos agentes |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/amazonia-8x8-perf-stairs` | `astra/amazonia-8x8-perf-stairs` | `8fbd1358cb43` | CLEAN | 2026-09-07 `8fbd1358` chore(amazonia): regenera blocos pós-merge e encurta comentário da estação A | Amazônia 8x8: performance/escadas |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/amazonia-visual` | `codex/amazonia-main` | `ba0353894f15` | CLEAN | 2026-09-06 `ba035389` fix(amazonia): restaura rota alternativa do spawn B | Amazônia: integração visual |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/audio-cache-bust` | `codex/audio-cache-bust` | `3c4316d0e663` | CLEAN | 2026-09-05 `3c4316d0` fix(audio): renovar cache do manifesto privado | Áudio: renovação de cache |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/audio-fab-pilot` | `claude/audio-fab-pilot` | `7d068e9c02d6` | CLEAN | 2026-09-05 `7d068e9c` docs(audio): fechar handoff do gate de publicação | Áudio FAB: gate de publicação |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/audio-ingame-disappeared` | `fix/audio-ingame-disappeared` | `41c78c6721fb` | CLEAN | 2026-09-06 `41c78c67` chore(docs): regenera bloco derivado (autofix) | Áudio desaparecido dentro do jogo |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/audio-no-synthetic-fallback` | `fix/audio-no-synthetic-fallback` | `0beb5772ce35` | 4 arquivo(s) | 2026-09-06 `0beb5772` Merge remote-tracking branch 'origin/fix/audio-no-synthetic-fallback' into fix/audio-no-synthetic-fallback Signed-off-by: rubenmarcus &lt;rubenmarcus.dev@gmail.com&gt; | Áudio sem fallback sintético |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/audio-private-blob` | `codex/audio-private-blob` | `f5a0e000e1f9` | CLEAN | 2026-09-05 `f5a0e000` fix(ci): desacoplar gate de assets do three | Áudio privado/Blob e CI |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/audio-voice-mix` | `codex/audio-voice-mix` | `2668eea28b7a` | CLEAN | 2026-09-06 `2668eea2` docs(audio): fechar handoff da release alpha 223 | Mix de vozes e release alpha.223 |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/campo-morro-release` | `astra/campo-morro-release-audit` | `73dfc45b809a` | CLEAN | 2026-09-06 `73dfc45b` docs(quebrada): reverifica o Campinho na árvore sincronizada | Campo do Morro: auditoria de release |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-audio-rollback` | `claude/audio-funkeiros-urbanas-rollback` | `7b2b0e4b931f` | CLEAN | 2026-09-06 `7b2b0e4b` docs(audio): fontes das vozes antigas de F/U localizadas fora do Git | Rollback das vozes Funkeiros/Urbanas |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-combat-feedback` | `claude/combat-feedback-hud-bots` | `ae420ca8f95b` | CLEAN | 2026-09-06 `ae420ca8` Merge remote-tracking branch 'origin/claude/combat-feedback-hud-bots' into claude/combat-feedback-hud-bots Signed-off-by: rubenmarcus &lt;rubenmarcus.dev@gmail.com&gt; | Feedback de combate, HUD e bots |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-lane-prompts` | `codex/claude-lane-prompts` | `4c894d4a6c3f` | CLEAN | 2026-09-07 `4c894d4a` docs(lanes): exigir armas finais nas tarefas ZCode | Prompts das lanes ZCode/Claude |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-miticos-lobisomem` | `claude/miticos-lobisomem-scoped` | `444d37e277a4` | CLEAN | 2026-09-06 `444d37e2` docs(miticos): documenta bloqueio da recuperacao do patch de Lobisomem | Míticos: Lobisomem |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-ops-523` | `claude/ops-523-module-graph` | `20430018b9e0` | CLEAN | 2026-09-06 `20430018` fix(sertao): separa revisão de mídia do preview | Operações PR 523/grafo de módulos/Sertão |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/ctf-home` | `fix/ctf-home-menu` | `99e4a563849c` | CLEAN | 2026-09-06 `99e4a563` test(smoke): open Single Player before mode | Menu inicial CTF |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/escadao-casas-conflito` | `astra/escadao-casas-conflito` | `6412880a843d` | 2 arquivo(s) | 2026-09-07 `6412880a` docs(escadao): regenera blocos derivados após encurtar comentários | Escadão: conflito de casas |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/escadao-visual` | `codex/escadao-passagens-horizonte` | `27791c991a86` | 3 arquivo(s) | 2026-09-06 `27791c99` docs(escadao): registrar ajuste de passarela | Escadão: passagens e horizonte |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/infra-autonomy-claude` | `claude/ops-rodada-2` | `fc078bd3e885` | CLEAN | 2026-09-06 `fc078bd3` fix(eval): UIR4 aceita o retry do /api/map-plays sem afrouxar o que cobra | Infraestrutura autônoma/operação rodada 2 |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/joa-recuperacao` | `astra/joa-recuperacao-seletiva` | `640da258124f` | CLEAN | 2026-09-07 `640da258` fix(joa): tolera three sem setUsage na ambiencia | Recuperação seletiva do João |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/lajes-visual` | `docs/lajes-bug141-estado` | `3f8ebdb77508` | 2 arquivo(s) | 2026-09-06 `3f8ebdb7` docs(lajes): corrige estado do BUG-141 para integrado na main | Lajes: estado BUG-141/evidência visual |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/mapas-legado-claude` | `claude/mapas-legado-qualidade` | `ce16872d9581` | CLEAN | 2026-09-06 `ce16872d` docs: substitui o esboço dos mapas legados por inventário medido | Qualidade dos mapas legados |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/mapas-polish-integral` | `codex/mapas-polish-integral` | `e4d32c849abb` | 28 arquivo(s) | 2026-09-07 `e4d32c84` feat(maps): recupera acervo dos PRs de Parque e Carandiru com origem | Polimento integral de mapas |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/miticos-integracao-priority` | `astra/miticos-integracao-priority` | `adef16921439` | 30 arquivo(s) | 2026-09-06 `adef1692` fix(miticos): devolve os retratos de resultado aprovados do Lobisomem | Míticos: integração prioritária |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/miticos-lobisomem-scoped` | `astra/miticos-lobisomem-scoped` | `42c01175a2a8` | CLEAN | 2026-09-06 `42c01175` chore(release): v2.0.0-alpha.235 | Míticos: Lobisomem com escopo fechado |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/miticos-visual` | `codex/miticos-visual` | `51656b1bdfb1` | CLEAN | 2026-09-06 `51656b1b` docs(review): decide scoped Miticos release | Míticos: decisão/revisão visual |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/mp-round-presence` | `v2/mp-round-presence` | `d3c3cce6aa7d` | CLEAN | 2026-09-05 `d3c3cce6` docs: record multiplayer v4 production rollout | Multiplayer: presença por rodada |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/praca-poderes-claude` | `claude/praca-poderes-visual` | `01eb7d8d7883` | 121 arquivo(s) | 2026-09-06 `01eb7d8d` chore(docs): regenera blocos derivados após os commits da Praça | Praça dos Poderes: visual |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/replaycam-optin` | `codex/replaycam-optin` | `cb0bf119b4ac` | CLEAN | 2026-09-05 `cb0bf119` chore(release): v2.0.0-alpha.219 | Replay camera opt-in |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/sertao-astra` | `codex/sertao-main` | `7a50391a4df7` | CLEAN | 2026-09-06 `7a50391a` fix(sertao): estabiliza captura da criação no CI | Sertão: integração principal |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/sertao-casas-por-do-sol` | `astra/sertao-praca-casas-por-do-sol` | `5892304425a1` | CLEAN | 2026-09-07 `58923044` docs(sertao): fecha BUG-91 no ledger e regenera blocos gerados | Sertão: praça/casas/pôr do sol |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/telemetry-reliability-client` | `codex/telemetry-reliability-client` | `fb6f59a75351` | CLEAN | 2026-09-06 `fb6f59a7` docs(handoff): record telemetry rollout evidence | Confiabilidade da telemetria no cliente |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol` | `codex/vm-astra-pistol` | `d35c6658f0c9` | CLEAN | 2026-09-06 `d35c6658` docs(viewmodel): confirma fechamento local da faca | Viewmodel pistola/faca local |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-fable51-pistol` | `claude/vm-fable51-pistol` | `fd58f492bc39` | CLEAN | 2026-09-04 `fd58f492` docs(viewmodel): handoff da lane Fable 5.1 da pistola | Viewmodel de pistola Fable 5.1 |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-m4-reload-evidence` | `codex/vm-m4-reload-evidence` | `4d2a99ef6609` | 3 arquivo(s) | 2026-09-06 `4d2a99ef` tools(viewmodels): medir cobertura do punho M4 no ciclo completo | M4: evidência do reload |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-armas-curtas` | `codex/vm-prep-armas-curtas` | `d35c6658f0c9` | CLEAN | 2026-09-06 `d35c6658` docs(viewmodel): confirma fechamento local da faca | Preparação de armas curtas |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-awp` | `codex/vm-prep-awp` | `d35c6658f0c9` | CLEAN | 2026-09-06 `d35c6658` docs(viewmodel): confirma fechamento local da faca | Preparação da AWP |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-precisao` | `codex/vm-prep-precisao` | `a988d72b9c49` | CLEAN | 2026-09-06 `a988d72b` docs(viewmodels): fechar rastreio temporal com assembly C2 isolado | Preparação Mosin/SVD/SKS |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-rifles` | `codex/vm-prep-rifles` | `f63e730f6f60` | 4 arquivo(s) | 2026-09-06 `f63e730f` feat(viewmodels): reautorar a pega da idle M4 dedo a dedo contra a referência aprovada | Preparação de rifles/M4 |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-shotgun` | `codex/vm-prep-shotgun` | `d35c6658f0c9` | CLEAN | 2026-09-06 `d35c6658` docs(viewmodel): confirma fechamento local da faca | Preparação de escopetas |
| `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/weapon-penetration` | `astra/weapon-penetration-high-caliber` | `afa9176b1c02` | CLEAN | 2026-09-06 `afa9176b` feat(combat): add bounded AWP penetration | Penetração de armas/AWP |

## Arquivos não commitados

<details>
<summary><code>/Users/ruben/csbrasil/worktrees/viewmodel-blender</code> — 14 arquivo(s)</summary>

```text
 M .claude/settings.json
 M tools/eval/map_check.json
 M tools/eval/mat_check.json
 M tools/eval/mat_scenes.json
 M tools/eval/mat_shade.json
?? node_modules.local-three/three/addons
?? node_modules.local-three/three/index.js
?? node_modules.local-three/three/package.json
?? public/models/viewmodels/fpvm_arms_working.blend1
?? public/models/viewmodels/fpvm_base_rig.blend1
?? public/models/viewmodels/fpvm_cc0_m4_layout.blend1
?? public/models/viewmodels/fpvm_hands.blend1
?? public/models/viewmodels/fpvm_human_m4_layout.blend1
?? public/models/viewmodels/fpvm_m4_layout.blend1
```

</details>

<details>
<summary><code>/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/agent-control-plane</code> — 17 arquivo(s)</summary>

```text
 M ARCH.generated.md
 M SCRIPTS.md
 M STATUS.md
 M docs/docs/comecando.md
 M docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md
 M package.json
?? docs/CONTROL-PLANE-HANDOFF.md
?? tools/control-plane/cli.mjs
?? tools/control-plane/install-local.mjs
?? tools/control-plane/inventory.mjs
?? tools/control-plane/node22.cjs
?? tools/control-plane/public/app.js
?? tools/control-plane/public/index.html
?? tools/control-plane/public/styles.css
?? tools/control-plane/server.mjs
?? tools/control-plane/state.mjs
?? tools/eval/control-plane-check.mjs
```

</details>

<details>
<summary><code>/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/audio-no-synthetic-fallback</code> — 4 arquivo(s)</summary>

```text
 M tools/eval/map_check.json
 M tools/eval/mat_check.json
 M tools/eval/mat_scenes.json
 M tools/eval/mat_shade.json
```

</details>

<details>
<summary><code>/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/escadao-casas-conflito</code> — 2 arquivo(s)</summary>

```text
?? tools/eval/asset-evidence/maps/lajes/antitrap-overlay.png
?? tools/eval/asset-evidence/maps/lajes/terreo-overlay.png
```

</details>

<details>
<summary><code>/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/escadao-visual</code> — 3 arquivo(s)</summary>

```text
 M tools/eval/map_check.json
 M tools/eval/mat_check.json
 M tools/eval/mat_scenes.json
```

</details>

<details>
<summary><code>/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/lajes-visual</code> — 2 arquivo(s)</summary>

```text
?? tools/eval/asset-evidence/maps/lajes/antitrap-overlay.png
?? tools/eval/asset-evidence/maps/lajes/terreo-overlay.png
```

</details>

<details>
<summary><code>/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/mapas-polish-integral</code> — 28 arquivo(s)</summary>

```text
 M package.json
 M public/js/game.js
 M public/js/graffiti_layout.js
 M public/js/look.js
 M public/js/main.js
 M public/js/map_parque.js
 M public/js/map_penitenciaria.js
 D public/js/map_visual_surfaces.js
 M public/js/mapcat.js
 M public/js/mapprops.js
 M public/js/maps.js
 M public/js/soundscape.js
 M src/data/jogo.ts
 M src/pages/maps.astro
 M tools/eval/mapas-polish-capture.mjs
 D tools/eval/mapas-polish-check.mjs
?? plans/11-CAMPO-DO-MORRO.md
?? public/img/map-previews/campomorro.jpg
?? public/img/textures/sky_parque.webp
?? public/img/textures/sky_penitenciaria.webp
?? public/js/map_campomorro.js
?? public/js/wind.js
?? tools/eval/campo-contract-check.mjs
?? tools/eval/campomorro-molde-check.mjs
?? tools/eval/parque-canopy-check.mjs
?? tools/eval/parque-vida-check.mjs
?? tools/eval/penitenciaria-facade-check.mjs
?? tools/eval/penitenciaria-vida-check.mjs
```

</details>

<details>
<summary><code>/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/miticos-integracao-priority</code> — 30 arquivo(s)</summary>

```text
 M ARCH.generated.md
 M README.md
 M STATUS.md
 M docs/docs/arquitetura.md
 M docs/docs/comecando.md
 M docs/docs/stack.md
 M docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md
 M docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md
 M docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md
 M public/js/glbchars.js
 M public/models/anims/lobisomem.glb
 M public/models/anims/lobisomem/crouch.glb
 M public/models/anims/lobisomem/crouchwalk.glb
 M public/models/anims/lobisomem/death.glb
 M public/models/anims/lobisomem/idle.glb
 M public/models/anims/lobisomem/idle1h.glb
 M public/models/anims/lobisomem/jump.glb
 M public/models/anims/lobisomem/run.glb
 M public/models/anims/lobisomem/shoot.glb
 M public/models/anims/lobisomem/walk.glb
 M public/models/anims/lobisomem/walk1h.glb
 M public/models/anims/lobisomem/walkfire.glb
 M tools/eval/ARCH.md
 M tools/eval/miticos-lobisomem-integration-check.mjs
 M tools/eval/select-inflate.mjs
 M tools/eval/select_inflate.json
 M tools/retarget-glb.mjs
?? tools/eval/asset-evidence/maps/lajes/antitrap-overlay.png
?? tools/eval/asset-evidence/maps/lajes/terreo-overlay.png
?? tools/strip-curl-tracks.mjs
```

</details>

<details>
<summary><code>/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/praca-poderes-claude</code> — 121 arquivo(s)</summary>

```text
 M public/js/graffiti_layout.js
 M public/js/map_brasilia.js
 M public/js/textures.js
?? artifacts/praca-poderes/after/caixas-leste.png
?? artifacts/praca-poderes/after/espelho-dagua-norte.png
?? artifacts/praca-poderes/after/espelho-de-perto.png
?? artifacts/praca-poderes/after/flanco-leste-olha-centro.png
?? artifacts/praca-poderes/after/manifest.json
?? artifacts/praca-poderes/after/ministerio-empena.png
?? artifacts/praca-poderes/after/onibus-de-leste.png
?? artifacts/praca-poderes/after/onibus-de-oeste.png
?? artifacts/praca-poderes/after/piloti-leste-corredor.png
?? artifacts/praca-poderes/after/piloti-oeste-corredor.png
?? artifacts/praca-poderes/after/planalto-de-frente.png
?? artifacts/praca-poderes/after/praca-olha-catedral.png
?? artifacts/praca-poderes/after/praca-olha-congresso.png
?? artifacts/praca-poderes/after/spawn-B-olha-norte.png
?? artifacts/praca-poderes/after/spawn-E-olha-sul.png
?? artifacts/praca-poderes/after/stf-de-frente.png
?? artifacts/praca-poderes/after/urna-barracas.png
?? artifacts/praca-poderes/antes-depois.html
?? artifacts/praca-poderes/baseline-limpo/caixas-leste.png
?? artifacts/praca-poderes/baseline-limpo/espelho-dagua-norte.png
?? artifacts/praca-poderes/baseline-limpo/espelho-de-perto.png
?? artifacts/praca-poderes/baseline-limpo/flanco-leste-olha-centro.png
?? artifacts/praca-poderes/baseline-limpo/manifest.json
?? artifacts/praca-poderes/baseline-limpo/ministerio-empena.png
?? artifacts/praca-poderes/baseline-limpo/onibus-de-leste.png
?? artifacts/praca-poderes/baseline-limpo/onibus-de-oeste.png
?? artifacts/praca-poderes/baseline-limpo/piloti-leste-corredor.png
?? artifacts/praca-poderes/baseline-limpo/piloti-oeste-corredor.png
?? artifacts/praca-poderes/baseline-limpo/planalto-de-frente.png
?? artifacts/praca-poderes/baseline-limpo/praca-olha-catedral.png
?? artifacts/praca-poderes/baseline-limpo/praca-olha-congresso.png
?? artifacts/praca-poderes/baseline-limpo/spawn-B-olha-norte.png
?? artifacts/praca-poderes/baseline-limpo/spawn-E-olha-sul.png
?? artifacts/praca-poderes/baseline-limpo/stf-de-frente.png
?? artifacts/praca-poderes/baseline-limpo/urna-barracas.png
?? artifacts/praca-poderes/baseline/caixas-leste.png
?? artifacts/praca-poderes/baseline/espelho-dagua-norte.png
?? artifacts/praca-poderes/baseline/espelho-de-perto.png
?? artifacts/praca-poderes/baseline/flanco-leste-olha-centro.png
?? artifacts/praca-poderes/baseline/manifest.json
?? artifacts/praca-poderes/baseline/ministerio-empena.png
?? artifacts/praca-poderes/baseline/obl-leste.png
?? artifacts/praca-poderes/baseline/onibus-de-leste.png
?? artifacts/praca-poderes/baseline/onibus-de-oeste.png
?? artifacts/praca-poderes/baseline/piloti-leste-corredor.png
?? artifacts/praca-poderes/baseline/piloti-oeste-corredor.png
?? artifacts/praca-poderes/baseline/planalto-de-frente.png
?? artifacts/praca-poderes/baseline/praca-olha-catedral.png
?? artifacts/praca-poderes/baseline/praca-olha-congresso.png
?? artifacts/praca-poderes/baseline/spawn-B-olha-norte.png
?? artifacts/praca-poderes/baseline/spawn-E-olha-sul.png
?? artifacts/praca-poderes/baseline/stf-de-frente.png
?? artifacts/praca-poderes/baseline/top-all.png
?? artifacts/praca-poderes/baseline/top-centro.png
?? artifacts/praca-poderes/baseline/top-norte.png
?? artifacts/praca-poderes/baseline/top-sul.png
?? artifacts/praca-poderes/baseline/urna-barracas.png
?? artifacts/praca-poderes/r2-agua/espelho-dagua-norte.png
?? artifacts/praca-poderes/r2-agua/espelho-de-perto.png
?? artifacts/praca-poderes/r2-agua/manifest.json
?? artifacts/praca-poderes/r2-agua/planalto-de-frente.png
?? artifacts/praca-poderes/r2-agua/praca-olha-congresso.png
?? artifacts/praca-poderes/r2-agua/stf-de-frente.png
?? artifacts/praca-poderes/r3-after/espelho-dagua-norte.png
?? artifacts/praca-poderes/r3-after/espelho-de-perto.png
?? artifacts/praca-poderes/r3-after/flanco-leste-olha-centro.png
?? artifacts/praca-poderes/r3-after/manifest.json
?? artifacts/praca-poderes/r3-after/ministerio-empena.png
?? artifacts/praca-poderes/r3-after/onibus-de-leste.png
?? artifacts/praca-poderes/r3-after/onibus-de-oeste.png
?? artifacts/praca-poderes/r3-after/piloti-leste-corredor.png
?? artifacts/praca-poderes/r3-after/piloti-oeste-corredor.png
?? artifacts/praca-poderes/r3-after/planalto-de-frente.png
?? artifacts/praca-poderes/r3-after/praca-olha-catedral.png
?? artifacts/praca-poderes/r3-after/praca-olha-congresso.png
?? artifacts/praca-poderes/r3-after/spawn-B-olha-norte.png
?? artifacts/praca-poderes/r3-after/spawn-E-olha-sul.png
?? artifacts/praca-poderes/r3-after/stf-de-frente.png
?? artifacts/praca-poderes/r3-after/urna-barracas.png
?? artifacts/praca-poderes/r5-layout/manifest.json
?? artifacts/praca-poderes/r5-layout/planalto-de-frente.png
?? artifacts/praca-poderes/r5-layout/praca-olha-congresso.png
?? artifacts/praca-poderes/r6-agua/espelho-de-perto.png
?? artifacts/praca-poderes/r6-agua/manifest.json
?? artifacts/praca-poderes/r7-arvoredo/manifest.json
?? artifacts/praca-poderes/r7-arvoredo/ministerio-empena.png
?? artifacts/praca-poderes/r7-arvoredo/piloti-leste-corredor.png
?? artifacts/praca-poderes/r7-arvoredo/piloti-oeste-corredor.png
?? artifacts/praca-poderes/r8-lambes/manifest.json
?? artifacts/praca-poderes/r8-lambes/planalto-de-frente.png
?? artifacts/praca-poderes/r8-lambes/stf-de-frente.png
?? artifacts/praca-poderes/r9-limpo/manifest.json
?? artifacts/praca-poderes/r9-limpo/urna-barracas.png
?? artifacts/praca-poderes/runtime/after.json
?? artifacts/praca-poderes/runtime/baseline.json
?? artifacts/praca-poderes/runtime/final.json
?? artifacts/praca-poderes/runtime/mutante-cabeca.json
?? artifacts/praca-poderes/runtime/mutante-parede.json
?? artifacts/praca-poderes/sheet/after-caixas-leste.jpg
?? artifacts/praca-poderes/sheet/after-espelho-dagua-norte.jpg
?? artifacts/praca-poderes/sheet/after-espelho-de-perto.jpg
?? artifacts/praca-poderes/sheet/after-flanco-leste-olha-centro.jpg
?? artifacts/praca-poderes/sheet/after-ministerio-empena.jpg
?? artifacts/praca-poderes/sheet/after-piloti-leste-corredor.jpg
?? artifacts/praca-poderes/sheet/after-planalto-de-frente.jpg
?? artifacts/praca-poderes/sheet/after-praca-olha-congresso.jpg
?? artifacts/praca-poderes/sheet/after-spawn-E-olha-sul.jpg
?? artifacts/praca-poderes/sheet/after-urna-barracas.jpg
?? artifacts/praca-poderes/sheet/baseline-limpo-caixas-leste.jpg
?? artifacts/praca-poderes/sheet/baseline-limpo-espelho-dagua-norte.jpg
?? artifacts/praca-poderes/sheet/baseline-limpo-espelho-de-perto.jpg
?? artifacts/praca-poderes/sheet/baseline-limpo-flanco-leste-olha-centro.jpg
?? artifacts/praca-poderes/sheet/baseline-limpo-ministerio-empena.jpg
?? artifacts/praca-poderes/sheet/baseline-limpo-piloti-leste-corredor.jpg
?? artifacts/praca-poderes/sheet/baseline-limpo-planalto-de-frente.jpg
?? artifacts/praca-poderes/sheet/baseline-limpo-praca-olha-congresso.jpg
?? artifacts/praca-poderes/sheet/baseline-limpo-spawn-E-olha-sul.jpg
?? artifacts/praca-poderes/sheet/baseline-limpo-urna-barracas.jpg
```

</details>

<details>
<summary><code>/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-m4-reload-evidence</code> — 3 arquivo(s)</summary>

```text
 M tools/viewmodels/prep/m4-cuff-profile.py
?? tools/viewmodels/prep/m4-elbow-path.py
?? tools/viewmodels/prep/m4-local-reimport.mjs
```

</details>

<details>
<summary><code>/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-rifles</code> — 4 arquivo(s)</summary>

```text
?? tools/viewmodels/prep/rifles-m4-reload-final-export.py
?? tools/viewmodels/prep/rifles-m4-reload-final-verify.mjs
?? tools/viewmodels/prep/rifles-m4-reload-final-verify.py
?? tools/viewmodels/prep/rifles-m4-reload-final.py
```

</details>

## Observações operacionais

- As mudanças em `praca-poderes-claude` incluem 3 arquivos fonte modificados e 118 artefatos/evidências não rastreados.
- `mapas-polish-integral` tem alterações fonte e arquivos removidos, além de novos mapas, texturas, planos e gates; exige preservação integral antes de migração.
- `miticos-integracao-priority` contém GLBs e scripts modificados, além de evidência visual não rastreada; não deve ser confundida com as lanes Míticos limpas.
- `viewmodel-blender`, `vm-m4-reload-evidence` e `vm-prep-rifles` são as três worktrees de viewmodel com estado local não commitado.
- `vm-prep-armas-curtas`, `vm-prep-awp` e `vm-prep-shotgun` estão limpas e ainda apontam para o mesmo HEAD `d35c6658f0c9`, cujo último commit trata do fechamento local da faca; isso sugere lanes preparadas, mas sem avanço próprio registrado.

