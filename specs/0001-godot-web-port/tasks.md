# Tarefas: Port do jogo para Godot Web

## Tarefas

- [x] **Estabelecer baseline e primeiro boot Web paralelo** (test-type: both)
  - blocked-by: aprovação da spec 0001
  - summary: capturar contratos do legado e criar o projeto Godot 4.7.1 mínimo,
    tasks do VS Code, export Web e smoke test em Chromium/Firefox.
  - desired behavior: o cliente Godot abre uma scene mínima a partir de
    `build/web/`, enquanto o cliente legado permanece inalterado e executável.
  - acceptance criteria: versão/renderer fixados, exportação não interativa,
    shell local carregável, LSP/DAP documentados e ambos os clientes executáveis.
  - tests: unitários para manifest de contratos; smoke test da exportação nos
    navegadores suportados.
  - verification: `scripts/godot.sh --headless --path godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit -gdisable_colors`; `scripts/export-godot-web.sh`; `npm run test:web:smoke`

- [x] **Entregar movimento FPS em arena procedural mínima** (test-type: both)
  - blocked-by: primeiro boot Web paralelo
  - summary: gerar piso/obstáculos e portar câmera, pointer lock, caminhada,
    strafe, corrida, agachamento, salto, gravidade e colisão.
  - desired behavior: o jogador percorre a arena sem atravessar colisores e
    responde aos controles e modificadores de velocidade do legado.
  - acceptance criteria: contratos de velocidade, aceleração, gravidade, salto,
    altura da câmera e degrau são testados; perda de foco pausa/captura input de
    forma segura.
  - tests: unitários para cálculo de movimento; integração com
    `CharacterBody3D`; smoke test Web de input.
  - verification: `scripts/godot.sh --headless --path godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit -gdisable_colors`; `scripts/export-godot-web.sh`; `npm run test:web:movement`

- [x] **Entregar duelo com AWP, morte e respawn** (test-type: both)
  - blocked-by: movimento FPS em arena procedural mínima
  - summary: adicionar um bot, saúde, Resource de AWP, hitscan, oclusão, scope,
    spread, recoil, munição, recarga, morte e respawn.
  - desired behavior: um ciclo completo localizar → mirar → atirar → matar →
    reaparecer funciona no navegador com HUD mínimo.
  - acceptance criteria: dano/tempos/munição iguais ao baseline, obstáculo
    bloqueia tiro, headshot é identificado e respawn ocorre após 2,5 segundos.
  - tests: unitários para arma/dano; integração de física e ciclo de vida;
    smoke test Web do duelo.
  - verification: `scripts/godot.sh --headless --path godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit -gdisable_colors`; `scripts/export-godot-web.sh`; `npm run test:web:combat`

- [x] **Completar inventário com pistola e faca** (test-type: both)
  - blocked-by: duelo com AWP, morte e respawn
  - summary: implementar Resources/scenes das armas secundárias, troca,
    cadência, reload da pistola e alcance da faca.
  - desired behavior: teclas 1/2/3 alternam armas independentes e cada uma
    respeita sua configuração e feedback.
  - acceptance criteria: dano, munição, cadência, alcance, draw delay e bloqueio
    de scope correspondem ao baseline.
  - tests: unitários por arma; integração de inventário e HUD.
  - verification: `scripts/godot.sh --headless --path godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit -gdisable_colors`; `scripts/export-godot-web.sh`; `npm run test:web:weapons`

- [x] **Entregar partida 4×4 completa** (test-type: both)
  - blocked-by: inventário com pistola e faca
  - summary: instanciar sete bots, portar IA/waypoints, spawns, pontuação,
    rounds, scoreboard, killfeed e condição de vitória.
  - desired behavior: uma partida completa pode ser jogada do primeiro round ao
    resultado final sem intervenção de debug.
  - acceptance criteria: rosters corretos, navegação sem atravessar bloqueios,
    round de 99 segundos, empate, respawn e vitória por três rounds verificados.
  - tests: unitários para regras/seleção de alvo/path; integração de partida
    acelerada e smoke test Web.
  - verification: `scripts/godot.sh --headless --path godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit -gdisable_colors`; `scripts/export-godot-web.sh`; `npm run test:web:match`; `npm run test:web`

- [x] **Portar arena e personagens procedurais completos** (test-type: both)
  - blocked-by: partida 4×4 completa
  - summary: portar mapa, props, skyline, oito personagens, acessórios, armas
    visuais, animações, texturas e caches com seed.
  - desired behavior: conteúdo visual equivalente é criado em runtime sem
    modelos ou imagens artísticas importadas.
  - acceptance criteria: mesma seed produz mesma assinatura, todos os
    personagens são distinguíveis, colisão/oclusão acompanham os visuais e os
    caches evitam duplicação equivalente.
  - tests: unitários de determinismo/cache; integração de scenes; inspeção
    visual e screenshots nos navegadores suportados.
  - verification: `scripts/godot.sh --headless --path godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit -gdisable_colors`; `scripts/export-godot-web.sh`; `npm run test:web:visual`; `npm run test:web`

- [x] **Completar menus, HUD, radar e persistência** (test-type: both)
  - blocked-by: arena e personagens procedurais completos
  - summary: portar todos os fluxos UI, preview, nick, settings, qualidade,
    pause, radar, banners, scope, hitmarker, multikill e fim de partida.
  - desired behavior: o usuário inicia, configura, joga, pausa, termina e volta
    ao menu somente pela UI publicada.
  - acceptance criteria: navegação por teclado, persistência, resize, perda de
    foco e todos os elementos de HUD verificados.
  - tests: unitários de modelos de apresentação/persistência; integração de UI;
    smoke test Web ponta a ponta.
  - verification: `scripts/godot.sh --headless --path godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit -gdisable_colors`; `scripts/export-godot-web.sh`; `npm run test:web:ui`; `npm run test:web`

- [x] **Completar áudio, rádio e fallbacks Web** (test-type: both)
  - blocked-by: menus, HUD, radar e persistência
  - summary: portar manifest, samples, rádio, anúncios, eventos de armas e
    fallbacks que funcionem com ou sem o pacote opcional.
  - desired behavior: áudio é liberado após interação, respeita volume e não
    impede a partida quando faltam recursos.
  - acceptance criteria: pacote presente/ausente, faixa ausente, volume zero,
    rádio e anúncios são testados nos dois navegadores.
  - tests: unitários para seleção/throttle; integração Web com e sem pacote.
  - verification: `scripts/godot.sh --headless --path godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit -gdisable_colors`; `scripts/export-godot-web.sh`; `npm run test:web:audio`; `npm run test:web`

- [x] **Integrar shell Vercel, SEO/AEO e analytics** (test-type: integration)
  - blocked-by: áudio, rádio e fallbacks Web
  - summary: produzir shell customizado, preservar metadados e ligar eventos
    `game_start`/`match_end` via integração Web.
  - desired behavior: a build Godot é hospedável na Vercel sem perder conteúdo
    legível por crawlers nem telemetria existente.
  - acceptance criteria: HTML contém metadados antes de executar WASM, assets
    têm headers corretos e eventos são observáveis no stub de analytics.
  - tests: validação HTML/headers e smoke test Web com analytics interceptado.
  - verification: `sh -n scripts/build-vercel.sh scripts/install-godot-ci.sh scripts/export-godot-web.sh`; `scripts/build-vercel.sh`; `scripts/godot.sh --headless --path godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit -gdisable_colors` (72/72); `npm run test:web:shell`; `npm run test:web:analytics`; `npm run test:web` (28/28)

- [x] **Validar paridade, performance e preparar gate de corte** (test-type: both)
  - blocked-by: shell Vercel, SEO/AEO e analytics
  - summary: executar toda a matriz, comparar com legado, medir cinco minutos
    de partida e documentar resultados sem alterar ainda o deploy principal.
  - desired behavior: toda divergência está corrigida ou explicitamente
    aprovada; os limites de performance são atendidos nos navegadores alvo.
  - acceptance criteria: matriz requisito→evidência completa, suites verdes,
    relatório de hardware/browser e árvore de trabalho reconciliada.
  - tests: suite GDScript, Playwright Chromium/Firefox, partida de performance e
    revisão manual de paridade.
  - verification: `scripts/godot.sh --headless --path godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit -gdisable_colors` (72/72, 686 assertions); `npm run test:web` (28/28); `npm run test:web:performance` (2/2, 300 s por navegador); relatório `docs/reports/2026-07-18-godot-web-parity.md`

- [ ] **Executar corte aprovado para o cliente Godot** (test-type: integration)
  - blocked-by: validação de paridade e aprovação explícita do gate de corte
  - summary: alterar o deploy principal para servir o cliente Godot, preservando
    uma estratégia documentada de rollback para o cliente legado.
  - desired behavior: o domínio principal entrega a build Godot e continua com
    SEO/AEO, analytics, áudio e fluxos essenciais funcionando.
  - acceptance criteria: preview aprovado, deploy verificado em Chrome/Edge e
    Firefox, rollback reproduzível e cliente legado preservado até estabilizar.
  - tests: smoke tests contra preview e produção após autorização.
  - verification: `npm run test:web:production`
