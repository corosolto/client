# Runbook: testar o cliente Godot

Este runbook orienta a preparação e a validação do cliente Godot do CS Brasil
em uma máquina de desenvolvimento. O fluxo oficial parte da raiz do repositório,
usa o VS Code e cobre execução nativa, exportação Web, Chromium e Firefox.

## Resultado esperado

Ao final, você deve conseguir:

- abrir e executar o projeto com Godot 4.7.1 Standard;
- editar e depurar GDScript pelo VS Code;
- gerar `build/web/index.html` sem interação manual;
- jogar a exportação em `http://127.0.0.1:8177`;
- executar os testes GUT e Playwright;
- confirmar que o cliente Three.js não foi substituído.

## Pré-requisitos

Instale antes de começar:

- Git;
- VS Code;
- Godot 4.7.1 Standard, sem .NET;
- export templates da mesma versão 4.7.1;
- Node.js 24 e npm;
- Python 3, usado pelo servidor estático local;
- Chrome ou Edge e Firefox desktop.

No VS Code, instale a extensão recomendada `geequlim.godot-tools`. Os scripts
do repositório usam shell POSIX; macOS é o ambiente de referência documentado.
No Windows, execute-os por WSL ou Git Bash e configure `GODOT_BIN`; esse
ambiente não faz parte da matriz oficial.

## 1. Preparar o checkout

```bash
git clone https://github.com/woliveiras/csbrasil.git
cd csbrasil
npm ci
npx playwright install chromium firefox
```

O pacote de áudio é opcional. Para tentar instalá-lo:

```bash
scripts/fetch-audio.sh
```

Se o download não estiver disponível, continue normalmente. O cliente Godot e
os testes possuem fallbacks para a ausência dos samples.

## 2. Validar a instalação do Godot

Execute na raiz do repositório:

```bash
scripts/godot.sh --version
```

O início da saída deve indicar `4.7.1.stable`. O launcher procura o executável
na seguinte ordem:

1. variável de ambiente `GODOT_BIN`;
2. comando `godot` disponível no `PATH`;
3. `/Applications/Godot.app/Contents/MacOS/Godot` no macOS.

Quando o executável estiver em outro local, configure-o antes de abrir o VS
Code pelo mesmo terminal:

```bash
export GODOT_BIN="/caminho/para/Godot"
code .
```

No editor Godot, confirme em **Editor → Manage Export Templates** que os
templates instalados também são da versão 4.7.1. Misturar versões do editor e
dos templates causa falha na exportação Web.

## 3. Abrir o ambiente no VS Code

```bash
code .
```

Use **Terminal → Run Task** e execute `Godot: Editor`. Mantenha o editor Godot
aberto enquanto edita GDScript: ele fornece o LSP na porta 6005 e o servidor de
debug na porta 6006.

Para conferir a depuração:

1. abra um arquivo `.gd` em `godot/src/`;
2. adicione um breakpoint numa função executada;
3. abra **Run and Debug**;
4. selecione `GDScript Godot` e inicie a sessão.

O projeto correto é `godot/project.godot`. Não importe a raiz do repositório
como se ela fosse um projeto Godot.

## 4. Fazer o smoke test nativo

Execute a task `Godot: Run`. O resultado esperado é:

- janela do jogo em 1280×720;
- menu principal visível;
- seleção de time e personagem funcional;
- partida 4×4 carregada sem erro vermelho no painel **Output**;
- mouse capturado após clicar na área do jogo;
- `Esc` pausa a partida e libera o cursor.

Percorra pelo menos este caminho:

1. altere nick, sensibilidade, volume ou qualidade em **Configurações**;
2. escolha um time e um personagem;
3. inicie a partida;
4. mova-se, troque de arma, abra o placar e use o rádio;
5. pause, retome e volte ao menu;
6. reinicie o jogo e confira se as configurações foram preservadas.

Controles usados no smoke test:

| Entrada | Ação |
| --- | --- |
| `W`, `A`, `S`, `D` | Movimento |
| `Shift`, `Ctrl`, `Espaço` | Correr, agachar e saltar |
| Mouse e cliques esquerdo/direito | Mirar, atirar e usar scope |
| `R` e `1`/`2`/`3` | Recarregar e trocar de arma |
| `Z`/`X`/`C`, depois `1`/`2`/`3` | Abrir e responder pelo rádio |
| `Tab` | Placar |
| `Esc` | Pausar ou liberar o cursor |

## 5. Gerar e testar a versão Web

Execute a task `Godot: Export Web`. Ela deve criar estes artefatos:

```text
build/web/index.html
build/web/index.js
build/web/index.pck
build/web/index.wasm
```

Depois execute `Godot: Serve Web` e abra:

```text
http://127.0.0.1:8177
```

Não abra `index.html` por `file://`: WebAssembly, módulos e áudio precisam de
um servidor HTTP. Repita o smoke test no Chromium/Chrome/Edge e no Firefox.

Para encerrar o servidor iniciado no terminal, pressione `Ctrl+C`.

## 6. Executar os testes automatizados

### Testes GDScript e de scenes

Execute a task `Godot: Test`. Ela roda GUT em modo headless e cobre regras,
Resources, componentes e integração de scenes. O comando equivalente é:

```bash
scripts/godot.sh --headless --path godot \
  -s addons/gut/gut_cmdln.gd \
  -gdir=res://tests \
  -ginclude_subdirs \
  -gexit \
  -gdisable_colors
```

O resultado esperado é `All tests passed`. A quantidade de testes pode crescer;
o baseline registrado em 2026-07-18 era 72 testes e 686 assertions.

### Testes funcionais Web

Antes da primeira execução, gere novamente a exportação Web. Depois execute a
task `Godot: Test Web` ou:

```bash
scripts/export-godot-web.sh
npm run test:web
```

O Playwright inicia e encerra os servidores automaticamente. Ele valida o
cliente Godot em `8177` e o legado em `8176`, usando Chromium e Firefox. O
baseline de 2026-07-18 era 28 cenários aprovados.

Para investigar apenas uma área:

| Área | Comando |
| --- | --- |
| Boot e coexistência com legado | `npm run test:web:smoke` |
| Movimento e pointer lock | `npm run test:web:movement` |
| AWP, dano e respawn | `npm run test:web:combat` |
| AWP, pistola e faca | `npm run test:web:weapons` |
| Partida 4×4 e rounds | `npm run test:web:match` |
| Arena e visuais procedurais | `npm run test:web:visual` |
| Menus, HUD e persistência | `npm run test:web:ui` |
| Áudio, rádio e fallbacks | `npm run test:web:audio` |
| Shell e SEO/AEO | `npm run test:web:shell` |
| Analytics Web | `npm run test:web:analytics` |

Falhas do Playwright deixam traces e diagnósticos em `test-results/`.

### Teste de performance

Execute a task `Godot: Test Web Performance` ou:

```bash
npm run test:web:performance
```

Esse teste abre janelas reais de Chromium e Firefox, usa viewport 1920×1080 e
qualidade média, e joga cinco minutos em cada navegador. Reserve cerca de 11
minutos, mantenha as janelas abertas e evite colocar o computador em repouso.

Não substitua `--headed` por execução headless. Navegadores headless podem usar
renderização WebGL por software e não representam o desempenho da GPU. O gate é
média de pelo menos 60 FPS e p95 de frame time menor ou igual a 33,3 ms.

## 7. Checklist de aprovação local

- [ ] `scripts/godot.sh --version` retorna Godot 4.7.1.
- [ ] O projeto abre sem erro de importação.
- [ ] A task `Godot: Run` percorre menu, partida, pausa e retorno.
- [ ] Configurações persistem após reiniciar.
- [ ] `Godot: Export Web` cria `build/web/index.html`.
- [ ] A exportação abre em Chromium/Chrome/Edge e Firefox.
- [ ] Console do navegador não mostra erro não tratado ou recurso obrigatório
  ausente.
- [ ] `Godot: Test` termina sem falhas.
- [ ] `Godot: Test Web` termina sem falhas.
- [ ] O teste continua jogável sem o pacote opcional de áudio.
- [ ] `git status --short` não mostra alterações inesperadas em arquivos do
  cliente legado.

## Solução de problemas

| Sintoma | Diagnóstico e ação |
| --- | --- |
| `Godot 4.7.1 não encontrado` | Instale a versão Standard ou defina `GODOT_BIN` antes de abrir o VS Code. |
| Exportação informa template ausente | Instale o export template 4.7.1 pelo editor Godot e repita `Godot: Export Web`. |
| `index.html` não existe | Execute a exportação antes de iniciar o servidor ou o Playwright. |
| Porta 8177 já está em uso | Encerre a task/servidor anterior e execute `Godot: Serve Web` novamente. |
| Playwright não encontra navegador | Execute `npx playwright install chromium firefox`. |
| Tela Web não inicia | Confirme WebGL 2, use HTTP em vez de `file://` e inspecione o console do navegador. |
| Mouse não controla a câmera | Clique no canvas; use `Esc` para liberar e clique novamente para recapturar. |
| Áudio não toca | Interaja com a página, confira o volume e aceite o fallback se `audio/manifest.json` não existir. |
| FPS muito baixo somente em teste | Confirme que executou `npm run test:web:performance`, com janelas visíveis e aceleração de hardware ativa. |
| Firefox demora no primeiro boot | Aguarde a compilação inicial do WASM; os testes funcionais toleram até 40 segundos nos fluxos mais pesados. |
| LSP ou breakpoints não funcionam | Abra `Godot: Editor`, confirme as portas 6005/6006 e reinicie a extensão Godot Tools. |

## Limites deste runbook

Este procedimento não publica preview, não executa deploy Vercel e não altera
`vercel.json`. O cliente Three.js permanece o deploy principal até aprovação
explícita do gate de corte. Para os números de referência, consulte o
[relatório de paridade](../reports/2026-07-18-godot-web-parity.md).
