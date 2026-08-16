# Desenvolvimento do cliente Godot

O port Godot é desenvolvido em `godot/` sem substituir o cliente Three.js. A
versão fixada é Godot 4.7.1 Standard, com export templates 4.7.1, renderer
Compatibility, GDScript e GUT 9.7.1.

Para preparar uma máquina do zero e executar a validação completa, siga o
[runbook de testes do cliente Godot](../runbooks/testar-cliente-godot.md).

## Pré-requisitos

- Godot 4.7.1 Standard e export templates 4.7.1.
- VS Code com a extensão recomendada `geequlim.godot-tools`.
- Node.js 24 e `npm install` para os smoke tests Playwright.
- Chromium e Firefox do Playwright: `npx playwright install chromium firefox`.

O launcher `scripts/godot.sh` procura o binário nesta ordem:

1. variável `GODOT_BIN`;
2. comando `godot` disponível no `PATH`;
3. `/Applications/Godot.app/Contents/MacOS/Godot` no macOS.

## VS Code

Execute `Tasks: Run Task` e escolha:

- `Godot: Editor`: abre o editor no projeto `godot/` e disponibiliza LSP/DAP;
- `Godot: Run`: executa a main scene nativa;
- `Godot: Test`: executa toda a suíte GUT em modo headless;
- `Godot: Export Web`: gera `build/web/index.html`;
- `Godot: Serve Web`: serve a exportação em `http://127.0.0.1:8177`;
- `Godot: Test Web`: executa a matriz funcional headless em Chromium/Firefox;
- `Godot: Test Web Performance`: abre os dois navegadores com aceleração por
  GPU e mede uma partida roteirizada de cinco minutos em 1920×1080.

O editor Godot precisa permanecer aberto para completion e debugging no VS
Code. O LSP usa a porta padrão 6005 e o DAP usa 6006; a configuração de debug
do VS Code conecta ao DAP pelo arquivo `.vscode/launch.json`.

## Cliente jogável atual

O cliente Godot oferece o fluxo completo de menu, seleção 4×4, partida até três
rounds, HUD/radar, pause e fim de partida numa arena procedural completa. Clique
na área do jogo para iniciar a sessão de input e use:

- `W`, `A`, `S`, `D`: caminhar e strafe;
- `Shift`: correr;
- `Ctrl`: agachar;
- `Espaço`: saltar;
- mouse: controlar a câmera;
- clique esquerdo: disparar a AWP depois de capturar o mouse;
- clique direito: ativar/desativar a mira telescópica;
- `R`: recarregar;
- `1`, `2`, `3`: alternar entre AWP, pistola e faca;
- `Z`, `X`, `C`: abrir as categorias do rádio e `1`–`3` para responder;
- `Tab`: exibir o placar;
- `Esc`: liberar o mouse com segurança.

O movimento é dividido entre `MovementConfig` (contratos numéricos),
`MovementMotor` (regras puras) e a scene `Player`, baseada em
`CharacterBody3D`. A scene `MinimalArena` cria piso, limites, obstáculo e
degrau em runtime, sem assets gráficos importados.

O slice de combate adiciona um bot procedural, componentes de saúde, AWP
configurada por `WeaponDefinition`, estado independente de munição/recarga e
hitscan com oclusão e hitbox de cabeça. Jogador e bot morrem e reaparecem após
2,5 segundos.

O inventário mantém instâncias e munição independentes para AWP e pistola,
aplica 0,35 s de draw delay e usa uma scene dedicada de ataque corpo a corpo
para a faca. Armas sem suporte a scope rejeitam essa ação. O áudio usa samples
externos ao PCK e fallback sintetizado no navegador; nick, sensibilidade,
volume e qualidade são persistidos no armazenamento local.

## Shell e preview Vercel

`godot/web/shell.html` é o shell customizado da exportação. Ele contém conteúdo
HTML legível antes do WASM, canonical, Open Graph, Twitter Card, JSON-LD e o
stub que encaminha `game_start` e `match_end` ao Vercel Analytics. A exportação
também copia `robots.txt`, `sitemap.xml`, `llms.txt` e `og-image.png`.

`vercel.json` permanece intocado para preservar o deploy Three.js. A configuração
paralela `vercel.godot-preview.json` aponta para `build/web` e pode ser usada
somente em preview, após autenticação explícita:

```bash
scripts/build-vercel.sh
vercel deploy --local-config vercel.godot-preview.json
```

O segundo comando cria estado externo e não faz parte da automação local. O
corte do domínio principal continua bloqueado até aprovação específica.

## Linha de comando

```bash
scripts/godot.sh --version
scripts/godot.sh --headless --path godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit -gdisable_colors
scripts/export-godot-web.sh
npm run test:web:smoke
npm run test:web:movement
npm run test:web:combat
npm run test:web:audio
npm run test:web:shell
npm run test:web:analytics
npm run test:web
npm run test:web:performance
```

Os smoke tests sobem o cliente Godot em `8177` e o cliente legado em `8176`,
validando ambos em Chromium e Firefox. A porta histórica `8123` não é ocupada
por essa automação. O teste de performance é separado porque precisa de janelas
visíveis para usar a GPU real; execução headless usa renderização WebGL por
software e não representa o computador de referência.

## Saídas locais

- `godot/.godot/`: cache/imports locais da engine, ignorados pelo Git.
- `build/web/`: exportação Web, ignorada pelo Git.
- `test-results/`: evidências de falha do Playwright, ignoradas pelo Git.
