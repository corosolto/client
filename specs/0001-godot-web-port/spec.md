---
spec: "0001"
title: Port do jogo para Godot Web
family: platform
phase: 1
status: Approved
owner: woliveiras
depends_on: []
---

# Spec: Port do jogo para Godot Web

## Contexto e motivação

O CS Brasil é atualmente um FPS para navegador implementado com Three.js,
HTML, CSS e JavaScript. O cliente possui arena, personagens e texturas
procedurais, movimento FPS, três armas, bots, rounds, HUD, áudio, persistência
local e publicação estática na Vercel.

A implementação concentra grande parte do comportamento em `js/game.js` e
mantém física, colisão, navegação, ciclo de vida e UI por mecanismos próprios.
O objetivo desta especificação é portar o cliente para Godot, preservando a
experiência atual enquanto se adota uma engine especializada, GDScript tipado,
composição de scenes e responsabilidades menores.

O port será desenvolvido em paralelo em `godot/`. O cliente Three.js continuará
funcional e publicado até a versão Godot satisfazer os critérios de paridade e
de compatibilidade Web desta especificação.

## Vocabulário canônico

- **cliente legado**: implementação atual em Three.js.
- **cliente Godot**: nova implementação contida em `godot/`.
- **paridade funcional**: comportamentos observáveis listados nesta spec
  disponíveis no cliente Godot, sem exigir equivalência interna de código.
- **shell Web**: HTML externo responsável por SEO/AEO, analytics, aviso de
  plataforma e carregamento da exportação Godot.
- **gráfico procedural**: geometria, textura ou elemento visual criado por
  código em runtime, sem depender de modelo ou imagem artística importada.

## Requisitos

### Funcionais

- [ ] O cliente Godot deve coexistir com o cliente legado durante toda a
  migração e não pode alterar o deploy principal antes do gate de corte.
- [ ] O jogo deve oferecer o fluxo menu principal → seleção de time → seleção
  de personagem → partida → pausa/fim de partida → retorno ao menu.
- [ ] O jogador deve poder definir um nick e configurar sensibilidade do mouse,
  volume e qualidade gráfica, com persistência local entre sessões.
- [ ] O jogo deve manter os controles atuais: WASD, mouse, Shift, Ctrl, Espaço,
  cliques esquerdo/direito, R, 1/2/3, Z/X/C, Tab e Esc.
- [ ] O movimento deve preservar caminhada, corrida, agachamento, salto,
  gravidade, colisão, limite de degrau, redução de velocidade com scope e
  estabilização da mira ao agachar.
- [ ] A partida deve permanecer 4×4, com um jogador e sete bots distribuídos
  entre Petistas e Bolsonaristas.
- [ ] Cada round deve durar 99 segundos, usar respawn de 2,5 segundos e ser
  vencido pelo time com mais abates; a partida termina quando um time vence
  três rounds.
- [ ] A AWP, a pistola e a faca devem preservar dano, cadência, capacidade,
  reserva, recarga, alcance, spread, recoil e scope definidos pelo cliente
  legado no início da migração.
- [ ] Tiros devem usar hitscan, respeitar oclusão, distinguir headshot, manter
  friendly fire desligado e produzir feedback visual e sonoro equivalente.
- [ ] Bots devem adquirir alvos inimigos, respeitar linha de visão e tempo de
  reação, navegar pela arena, fazer strafe, atacar, morrer e reaparecer.
- [ ] HUD e feedback devem incluir vida, munição, arma, cronômetro, rounds,
  placar por time, killfeed, scoreboard, radar, scope, hitmarker, dano,
  respawn, banners e anúncios de multikill.
- [ ] O rádio Z/X/C deve manter três opções por categoria, exibir a mensagem
  escolhida e reproduzir uma fala do time quando disponível.
- [ ] Os oito personagens, suas silhuetas, acessórios, cores de time e
  animações procedurais devem ser representados no cliente Godot.
- [ ] Arena, skyline, personagens, armas, props, texturas, efeitos 2D e logo do
  jogo devem ser gerados proceduralmente em runtime.
- [ ] Geração procedural deve aceitar uma seed explícita e reutilizar meshes,
  materiais e texturas em cache quando forem visualmente equivalentes.
- [ ] Arquivos de áudio licenciados ou fornecidos separadamente podem continuar
  como assets externos e devem possuir fallback quando estiverem ausentes.
- [ ] A Vercel deve continuar hospedando o site, e o shell Web deve preservar
  canonical, Open Graph, Twitter Card, JSON-LD, analytics e aviso de plataforma.
- [ ] Eventos `game_start` e `match_end` devem continuar disponíveis no ambiente
  Web após o corte.

### Não funcionais

- [ ] Engine: Godot 4.7.1 Standard, com versão fixada nos arquivos de projeto,
  automação e documentação.
- [ ] Linguagem: GDScript tipado; C#, GDExtension e código nativo estão fora do
  escopo.
- [ ] Renderização Web: renderer Compatibility, WebGL 2 e exportação inicial
  sem suporte a threads.
- [ ] Plataformas suportadas: Chrome/Edge e Firefox desktop atuais. Safari,
  navegadores mobile e builds nativas não fazem parte da matriz de suporte.
- [ ] Arquitetura: scenes autocontidas, composição de nodes, Resources para
  dados, sinais para eventos e injeção das dependências externas pelo nó dono.
- [ ] Autoloads só podem ser usados para estado ou serviços realmente globais;
  regras de partida não podem ser concentradas em um singleton global.
- [ ] Desenvolvimento: edição, execução, testes, depuração, exportação e servidor
  local devem estar disponíveis por tasks do VS Code.
- [ ] LSP e DAP devem funcionar pelo plugin oficial do Godot para VS Code, com
  uma instância do editor Godot executando o projeto.
- [ ] A exportação de release deve ser produzida de forma não interativa em
  `build/web/index.html`.
- [ ] O cliente deve manter média de pelo menos 60 FPS e percentil 95 de frame
  time menor ou igual a 33,3 ms em uma partida roteirizada de cinco minutos,
  a 1920×1080 e qualidade média, em Chrome/Edge e Firefox no computador de
  referência documentado no relatório de verificação.
- [ ] O jogo deve continuar funcional quando o pacote opcional de áudio não
  estiver disponível.
- [ ] A exportação deve iniciar sem erros não tratados no console do navegador
  e sem recursos ausentes em ambos os navegadores suportados.
- [ ] O shell e o jogo devem ser utilizáveis por teclado nos fluxos de menu,
  pausa e retorno, exceto pelas ações de mira que dependem do mouse.

## Organização de scenes

O cliente deve seguir, no mínimo, estas fronteiras de responsabilidade:

```text
Main
├── WorldHost
│   └── Match
│       ├── Arena
│       ├── Actors
│       ├── Effects
│       ├── MatchController
│       └── RoundController
└── GuiHost
    ├── CurrentScreen
    └── HUD
```

- `Main` coordena transições de alto nível e hosts de mundo/UI.
- `MatchController` instancia participantes, conecta sinais e coordena a
  sessão; não implementa movimento, arma ou desenho de HUD.
- `RoundController` contém a máquina de estados e a pontuação de rounds.
- `Player` e `Bot` são scenes independentes baseadas em `CharacterBody3D`.
- Saúde, inventário e combate são componentes ou objetos colaboradores.
- Armas são scenes configuradas por Resources tipados.
- `Arena` encapsula geometria, colisões, spawns, oclusão e navegação.
- UI recebe modelos de apresentação/sinais e não consulta internals de atores.

## Estratégia de teste

| Escopo | Tipo | Evidência |
| --- | --- | --- |
| Regras de armas, rounds, dano, seed e seleção de alvo | unit | runner GDScript headless |
| Movimento, colisão, tiro, morte, respawn e scenes | integration | testes de scene headless |
| Fluxos de menu e partida exportada | integration | smoke tests Playwright |
| Chrome/Edge e Firefox desktop | integration | matriz Playwright sobre export Web |
| Performance | integration | partida roteirizada e relatório por navegador |
| Paridade | both | matriz requisito → teste + checklist comparativo |

Todos os bugs encontrados e corrigidos durante a implementação exigem documento
em `docs/bugfixes/` e teste de regressão conforme o contrato do repositório.

## Critérios de aceitação

- [ ] Dado um checkout limpo com Godot 4.7.1 e templates instalados, quando a
  task de exportação Web é executada no VS Code, então uma build funcional é
  criada em `build/web/index.html` sem interação manual.
- [ ] Dado que o cliente legado está presente, quando o cliente Godot é
  desenvolvido ou exportado antes do corte, então o cliente legado continua
  executável e seus arquivos de produção não são substituídos.
- [ ] Dado o mesmo valor de seed e a mesma versão do cliente, quando arena,
  personagens e texturas são gerados duas vezes, então suas assinaturas de
  conteúdo e sua disposição lógica são iguais.
- [ ] Dado um jogador no menu, quando ele escolhe time, personagem e inicia a
  partida, então surge uma sessão 4×4 com os times e spawns corretos.
- [ ] Dado o jogador vivo, quando os controles de movimento são usados, então
  caminhada, strafe, corrida, agachamento, salto e colisão correspondem aos
  contratos numéricos capturados do cliente legado.
- [ ] Dada cada uma das três armas, quando o jogador atira, recarrega, troca de
  arma e usa scope quando aplicável, então dano, munição, tempos e feedback
  correspondem à configuração de paridade.
- [ ] Dado um tiro com obstáculo entre origem e alvo, quando o hitscan é
  resolvido, então o alvo não recebe dano; sem obstáculo, dano e headshot são
  aplicados corretamente.
- [ ] Dada uma partida ativa, quando bots encontram ou perdem linha de visão,
  então eles selecionam alvos, navegam, atacam e reaparecem sem atravessar a
  geometria bloqueadora.
- [ ] Dado o término de 99 segundos, quando as pontuações são comparadas, então
  o round atribui vitória ao maior placar ou empate quando iguais; ao atingir
  três rounds, a partida encerra com o vencedor correto.
- [ ] Dado que um jogador morre, quando passam 2,5 segundos, então ele reaparece
  em um spawn válido com vida e estado de movimento restaurados.
- [ ] Dado que o pacote de áudio está ausente, quando uma partida completa é
  jogada, então não ocorre erro fatal e os fallbacks configurados são usados.
- [ ] Dado Chrome/Edge ou Firefox desktop, quando a build é carregada e o smoke
  test percorre menu, início, pausa, retomada e saída, então o fluxo termina sem
  erro não tratado ou recurso obrigatório ausente.
- [ ] Dada a partida roteirizada de performance, quando executada na máquina de
  referência documentada, então os limites de FPS e frame time são atendidos em
  ambos os navegadores suportados.
- [ ] Dado o shell publicado, quando um crawler ou cliente HTTP lê a página,
  então metadados SEO/AEO continuam presentes sem depender da execução do
  WebAssembly.
- [ ] Dado que todos os critérios anteriores possuem evidência fresca, quando
  o gate de corte é solicitado, então a troca do deploy só ocorre após aprovação
  explícita do usuário.

## Casos de borda

- Pacote de áudio, manifest ou uma faixa individual ausente.
- Persistência do navegador indisponível ou bloqueada.
- Perda e recuperação de foco/pointer lock durante partida ou pausa.
- Redimensionamento da janela e mudança de escala do dispositivo.
- Frame delta elevado por suspensão da aba.
- Spawn temporariamente ocupado por outro ator.
- Empate no fim do round.
- Morte durante recarga, scope, troca de arma ou fim de round.
- Seed inválida ou não informada.
- Exportação aberta fora de HTTPS, exceto `localhost` durante desenvolvimento.

## Decisões

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Estratégia de migração | Cliente Godot paralelo | Permite comparação e rollback até a paridade |
| Diretório-fonte | `godot/` | Isola a engine do cliente legado |
| Artefato Web | `build/web/` | Separa fonte e saída de exportação |
| Versão | Godot 4.7.1 Standard | Última versão estável aprovada, sem runtime .NET |
| Linguagem | GDScript tipado | Requisito do produto e integração nativa com Godot |
| Renderer | Compatibility | Único renderer Godot 4 suportado no WebGL 2 |
| Threads Web | Desligadas inicialmente | Reduz requisitos de hospedagem e isolamento de origem |
| Organização | Scenes autocontidas e composição | Alinha OOP ao modelo de nodes/scenes do Godot |
| Gráficos | Procedurais em runtime com seed/cache | Preserva a identidade e a técnica do cliente atual |
| Navegadores | Chrome/Edge e Firefox desktop | Matriz explícita aprovada pelo usuário |
| Hospedagem | Vercel + shell HTML | Preserva publicação, SEO/AEO e analytics existentes |
| Testes GDScript/scenes | GUT v9.7.1 | Versão fixada com suporte explícito ao Godot 4.7 |
| Evoluções de gameplay | Fora desta migração | Evita misturar paridade com novas funcionalidades |

## Fora do escopo

- Safari e quaisquer navegadores mobile.
- Builds nativas desktop ou mobile.
- C#/.NET, GDExtension ou plugins nativos.
- Multiplayer online, backend, ranking e autenticação.
- Novas armas, personagens, mapas, dificuldades ou modos.
- Alterações editoriais de times, personagens e sátira.
- Modelos GLB, texturas artísticas importadas ou pipeline Blender.
- Substituição da Vercel ou reformulação do site/SEO.
- Ativação de threads Web antes de evidência de desempenho que a justifique.
