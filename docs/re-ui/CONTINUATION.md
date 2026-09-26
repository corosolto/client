# Re-UI da home

Atualizado: 2026-09-26

## Objetivo e definição de pronto

Reconstruir a home como um hub único de alta fidelidade, com abas e modais, sem quebrar o
boot ou os fluxos reais do jogo. A primeira entrega fecha:

- wallpaper preenchendo a tela em todas as proporções suportadas;
- aba Jogar com singleplayer e multiplayer, mapa e opções reais;
- personagem 3D escolhido visível na home e reutilização do fluxo atual de elenco;
- abas Ranking, Sobre, Feedback e Apoie ligadas aos dados e ações existentes;
- perfil editável e rotas públicas de jogador preservadas;
- URLs próprias e compartilháveis para abas, modos, modais, mapa e personagem, com
  restauração por reload e Voltar/Avançar;
- navegação por teclado, estados de foco, 3:2 e 16:9 verificados no navegador.

O ranking global só fica público quando resultados competitivos forem validados pelo servidor.
Partidas contra bots e multiplayer com bots usam a faixa de pontuação singleplayer; partidas
com jogadores reais recebem multiplicador maior apenas quando a participação for confirmada
pela sessão autoritativa do servidor.

## Fonte visual

- ZIP original: `/Users/ruben/Downloads/Home dinâmica com tabs e modais.zip`
- SHA-256: `7169b92a984b37a58236d68c543be9c7a924b6a9c816495806f0cfedfdcf3212`
- Handoff interno do ZIP: `design_handoff_home_v2/README.md`
- Protótipo principal: `design_handoff_home_v2/Home Nova A2 - Tabs Topo.dc.html`
- Referência de mapa: `design_handoff_home_v2/referencias/V2 - 01c Escolha de Mapa.dc.html`

O pacote é especificação visual. O código de produção continua em `src/pages/index.astro`,
`public/style.css` e `public/js/main.js`, usando os dados reais do repositório.

## Estado da lane

- Worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/re-ui-home`
- Branch: `codex/re-ui-home`
- Base: `origin/main` em `299870720936794aa4729f344d2d9167a2b6a357`
- Checkpoint de wallpaper após rebase: `040db41a8` (`fix(ui): preencher wallpapers da home em qualquer proporção`).
- Primeira prévia rejeitada: `383a4f150`. Segunda iteração e URLs compartilháveis:
  `b89a988ef` (`feat(ui): reorganizar hub e dar URLs compartilháveis às seções`).
- `origin/main` avançou três commits após a base desta lane; nenhum rebase/merge foi
  feito durante o checkpoint. Reavaliar antes de propor PR.
- A árvore principal suja não foi alterada.

## Milestones

- [x] ZIP localizado, inventariado e verificado por hash.
- [x] Worktree isolado criado a partir da release `v2.0.0-alpha.298`.
- [x] Causa das faixas laterais medida: a arte principal usava `contain` fora do 3:2.
- [x] Contrato técnico de wallpaper `cover` validado no gate e por mutação.
- [x] Casco do hub implementado como prévia opt-in `?home=hub`: abas Jogar, Ranking,
  Sobre, Feedback e Apoie; controles reais do setup; perfil e confirmação em modal.
- [x] Seleção de personagem persistida e renderer Three.js reaproveitado na aba Jogar.
- [x] Entrada singleplayer ligada ao `startGame` existente; multiplayer abre a lista real
  de servidores/salas. Build, SEO/AEO, sintaxe, docs e `eval:redesign` passam.
- [!] Prévia `383a4f150` rejeitada visualmente pelo usuário em 26/09: a captura
  mostrou título coberto pelo card do mapa, vazio central, escala/composição ruins e
  telas internas fora da linguagem de modais do handoff. Verde técnico não a aprova.
- [x] Segunda iteração local: coluna Jogar sem título sobreposto, mapa flexível, cinco
  opções na mesma fileira, personagem com ficha/brasão, catálogo de mapas e elenco em
  modais, lista MP embutida com abas público/privado. Abas Sobre, Feedback e Apoie
  ganharam composição e ações próprias. Ainda sem aceite visual.
- [x] Navegação compartilhável da prévia: `?home=hub&secao=feedback`,
  `?home=hub&secao=jogar&partida=multiplayer&servidor=privado`,
  `?home=hub&secao=jogar&partida=singleplayer&janela=mapas` e modais
  `personagens`, `perfil`, `configuracoes`, `confirmar`. `map` e `personagem`
  preservam escolhas. `popstate` restaura o estado do hub. Ainda falta teste de
  navegador real sob a permissão atual.
- [ ] Capturas e revisão visual em 3:2, 16:9 e ultrawide.
- [ ] Fluxos e renderização verificados no navegador real e pelo jogador.
- [ ] Ranking/perfil/SEO reativados sobre pontuação autoritativa, com categoria MP:
  bots na faixa SP; humanos com pontuação maior somente após confirmação autoritativa.
- [ ] Etapas posteriores do pedido: marketing, mobile, documentação dev e limpeza
  do repositório, cada uma em escopo e checkpoint próprios após a UI.

## Decisões

- O site já usa Astro SSR. As rotas únicas de ranking e perfil existem; esta frente deve
  restaurá-las e melhorar metadados/cache, sem migrar o produto para outro framework.
- `RANKING_ON` permanece desligado durante a reconstrução visual. A rota antiga de envio de
  partida aceita números calculados no cliente e não serve como autoridade competitiva.
- Os painéis, APIs, estados e modelos atuais serão adaptados. O runtime `support.js` do
  protótipo não entra no jogo.
- A prévia fica atrás de `?home=hub` até a revisão visual e de gameplay, sem troca
  automática da home pública. Não enviar, ativar ranking ou publicar antes disso.
- URLs da prévia usam parâmetros na rota `/`, mantendo as rotas públicas Astro já
  existentes (`/ranking`, `/sobre`, `/apoie` etc.). Não criar páginas duplicadas
  só para mudar a barra de endereço. A escolha de URLs limpas fica para a revisão
  do usuário.

## Próximo passo

Pedir nova captura 3:2/16:9 da segunda iteração e comparar com o handoff antes
de chamar a UI pronta. Verificar clique, reload, Voltar/Avançar de cada URL do
hub em navegador real, além dos fluxos de mapa/personagem/MP; então reparar
eventuais desvios visuais e funcionais. As duas capturas rejeitadas são
`/Users/ruben/Documents/screen/Screenshot 2026-09-26 at 02.15.44.png` e
`/Users/ruben/Documents/screen/Screenshot 2026-09-26 at 02.15.22.png`.
O navegador recusou o acesso
a `127.0.0.1:4339` duas vezes em 26/09, inclusive após o usuário dizer que sim:
há uma preferência salva bloqueando a origem. Não contornar por outro navegador,
CDP ou automação. O usuário precisa alterar a permissão salva para essa origem.

Validação não visual em 26/09 com Node 23 (`PATH=/opt/homebrew/bin:$PATH`):
`npm run build`, `check:seo` (6/6), `syntax`, `docs:check` e `eval:redesign` verdes;
mutantes `menu-wall-contain-volta` (UIR32) e `preview-render` (UIR2) vermelhos como
esperado. `npm run eval:ui` mostrou UI1 (12 falhas de contraste do HUD) e UI4
(simulação de placar/round com NaN) vermelhos; áreas não alteradas por este hub,
mas ainda sem comparação com baseline independente. Não chamar esse gate de verde.

Segunda iteração em 26/09: `npm run build`, `npm run syntax`,
`npm run eval:redesign`, `npm run docs:check`, `npm run check:seo` (6/6) e
`git diff --check` passaram. Há aviso do adapter: Node local 23, Vercel usará 24.
Esses gates não provam fidelidade visual nem a navegação de URLs no navegador.
