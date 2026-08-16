# Relatório de paridade do cliente Godot Web

Data: 2026-07-18

Spec: `0001-godot-web-port`

Resultado: **apto para preview e solicitação do gate de corte**

## Escopo verificado

O cliente Godot foi comparado com os contratos capturados do cliente Three.js,
exportado para Web e exercitado em Chromium e Firefox. O cliente legado e o
`vercel.json` de produção permanecem inalterados. Este relatório não autoriza
nem executa o corte do domínio principal.

## Computador de referência

| Item | Valor |
| --- | --- |
| Máquina | MacBook Pro `Mac16,8` |
| Processador/GPU | Apple M4 Pro, CPU 12 cores, GPU 16 cores |
| Memória | 24 GB |
| Sistema | macOS 26.5.2, build 25F84 |
| Tela física | 3024×1964, 120 Hz |
| Viewport do teste | 1920×1080, qualidade média (`med`) |
| Godot | 4.7.1 Standard, Compatibility, single-thread Web |
| Playwright | 1.61.1 |
| Chromium | 149.0.7827.55, janela visível e GPU real |
| Firefox | 151.0, janela visível e GPU real |

O projeto Chromium do Playwright cobre a engine usada por Chrome e Edge. A
matriz não inclui Safari, navegadores mobile ou builds nativas, conforme a spec.

## Performance

Cada navegador executou o mesmo roteiro durante cinco minutos: partida 4×4,
movimento alternado em quatro direções, corrida, salto, câmera, IA, combate,
respawns, rounds e áudio. A coleta começou após o boot e um aquecimento de cinco
segundos. O FPS da engine e os intervalos de `requestAnimationFrame` foram
medidos de forma independente.

| Navegador | Duração | FPS médio Godot | FPS rAF | p95 frame time | Frames | Boot | Heap JS | Erros/requests falhos |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Chromium | 300,102 s | 120,00 | 119,99 | 9,20 ms | 35.997 | 1,289 s | 15,07 MiB | 0 / 0 |
| Firefox | 300,109 s | 119,95 | 119,97 | 9,18 ms | 35.989 | 12,737 s | n/d | 0 / 0 |

Orçamento aprovado: média mínima de 60 FPS e p95 menor ou igual a 33,3 ms.
Ambos os navegadores passaram. Firefox não expõe `performance.memory`; essa
ausência não afeta os critérios de FPS/frame time.

A exportação completa ocupa 40 MiB localmente, dos quais 1,8 MiB são o pacote
opcional de áudio. Os artefatos principais são `index.wasm` com 39.513.091
bytes, `index.js` com 279.815 bytes e `index.pck` com 139.224 bytes.

## Matriz requisito → evidência

| ID | Requisito | Evidência | Resultado |
| --- | --- | --- | --- |
| F01 | Coexistência e deploy legado preservado | `boot.spec.mjs`; `vercel.json` ainda usa output `.`; config Godot separada | Passou |
| F02 | Fluxo menu → seleção → partida → pausa/fim → menu | `test_game_ui_flow.gd`; `ui.spec.mjs` | Passou |
| F03 | Nick, sensibilidade, volume e qualidade persistentes | `test_game_settings.gd`; `ui.spec.mjs` | Passou |
| F04 | Controles atuais | mapa de input em `project.godot`; testes Web de movimento, armas, rádio e placar | Passou |
| F05 | Movimento, gravidade, colisão, degrau, scope e agachamento | `test_movement_config.gd`, `test_movement_motor.gd`, scenes de player e Web movement | Passou |
| F06 | Partida 4×4, um jogador e sete bots | `test_combat_match.gd`, `test_full_match_scene.gd`, `match.spec.mjs` | Passou |
| F07 | Round 99 s, respawn 2,5 s e vitória em três rounds | `test_round_controller.gd`, full match e Web match/combat | Passou |
| F08 | Paridade AWP, pistola e faca | baseline JSON, testes de definitions/state/inventory e `weapons.spec.mjs` | Passou |
| F09 | Hitscan, oclusão, headshot, sem friendly fire e feedback | testes de hitscan/health, Web combat e audio | Passou |
| F10 | IA, linha de visão, reação, rota, strafe, ataque e respawn | target selector, waypoint graph, bot scene e full match | Passou |
| F11 | HUD, placares, killfeed, radar, scope e feedback | game UI flow, full match, Web UI/match/combat | Passou |
| F12 | Rádio Z/X/C com três opções e voz por time | radio controller, game UI flow e `audio.spec.mjs` | Passou |
| F13 | Oito personagens procedurais distintos | character visual factory e `visual.spec.mjs` | Passou |
| F14 | Arena, skyline, armas, props, texturas, efeitos e logo procedurais | arena/factory/cache tests e screenshot Web | Passou |
| F15 | Seed explícita e caches reutilizados | minimal arena, material cache, character factory e Web signature | Passou |
| F16 | Áudio externo opcional com fallbacks | audio service e Web audio com pacote presente/ausente/faixa ausente/volume zero | Passou |
| F17 | Vercel e shell com SEO/AEO/analytics/plataforma | build Vercel, shell HTML e `shell.spec.mjs` | Passou |
| F18 | Eventos `game_start` e `match_end` no Web | teste de domínio UI e `analytics.spec.mjs` | Passou |
| NF01 | Godot 4.7.1 Standard fixado | project/baseline, installer CI e teste de versão | Passou |
| NF02 | Somente GDScript tipado | fontes `.gd`; export sem extensions/C# | Passou |
| NF03 | Compatibility, WebGL 2 e sem threads | project/export preset e teste de export config | Passou |
| NF04 | Chrome/Edge e Firefox desktop | matriz Playwright Chromium/Firefox | Passou |
| NF05 | Scenes, Resources, sinais e injeção pelo owner | testes de scene e estrutura `src/` | Passou |
| NF06 | Sem singleton de regras de partida | match/round controllers pertencem à scene Match | Passou |
| NF07 | Workflow completo pelo VS Code | `test_vscode_workflow.gd` e tasks Editor/Run/Test/Export/Serve/Web/Performance | Passou |
| NF08 | LSP/DAP oficial | extensão recomendada, launch DAP 6006 e documentação | Passou |
| NF09 | Export não interativo em `build/web/index.html` | `scripts/export-godot-web.sh` e build Vercel local | Passou |
| NF10 | ≥60 FPS e p95 ≤33,3 ms por cinco minutos | `performance.spec.mjs` e tabela acima | Passou |
| NF11 | Funciona sem pacote opcional de áudio | teste unitário e `audio.spec.mjs` | Passou |
| NF12 | Sem erro não tratado/recurso obrigatório ausente | 28 cenários Web e sonda de performance | Passou |
| NF13 | Menu, pausa e retorno utilizáveis por teclado | `ui.spec.mjs` nos dois navegadores | Passou |

## Evidência automatizada

- GUT: 72 testes e 686 assertions, todos verdes no código final.
- Web funcional: 28 cenários em Chromium/Firefox, todos verdes.
- Web performance: 2 partidas de cinco minutos, ambas verdes.
- Export Vercel: `scripts/build-vercel.sh` concluído localmente.
- Shell: metadados, arquivos SEO, headers e analytics verificados nos dois
  navegadores.

## Divergências e limites conhecidos

Não foi identificada divergência funcional bloqueante em relação aos contratos
do legado. A implementação interna difere intencionalmente: Godot usa scenes,
Resources, nodes e sinais em vez do loop monolítico Three.js. A exportação Web
é maior por incluir o runtime da engine. O boot frio observado no Firefox foi
de 12,737 s no computador de referência, mas terminou sem erro.

O teste de performance precisa rodar com navegadores visíveis. Em headless, o
WebGL usa renderização por software e não mede a GPU de referência. Por isso ele
é separado da suíte funcional e está disponível na task
`Godot: Test Web Performance` do VS Code.

## Gate de corte e rollback

Estado do gate: **pronto para revisão do usuário, ainda não aprovado**.

- `vercel.godot-preview.json` constrói e publica somente `build/web`.
- `vercel.json` continua apontando para o cliente Three.js na raiz.
- Nenhum preview ou deploy externo foi criado por esta execução.
- O futuro corte deve ser um commit isolado, após preview aprovado.
- O rollback será o revert desse commit de corte; os arquivos do cliente legado
  permanecem no repositório até a estabilização do cliente Godot.

Próxima ação autorizável: criar/verificar um preview Vercel e, somente após
aprovação explícita do resultado, alterar o deploy principal.
