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
- A árvore principal suja não foi alterada.

## Milestones

- [x] ZIP localizado, inventariado e verificado por hash.
- [x] Worktree isolado criado a partir da release `v2.0.0-alpha.298`.
- [x] Causa das faixas laterais medida: a arte principal usava `contain` fora do 3:2.
- [x] Contrato técnico de wallpaper `cover` validado no gate e por mutação.
- [ ] Capturas e revisão visual em 3:2, 16:9 e ultrawide.
- [ ] Casco do hub com tabs e modais integrado.
- [ ] Personagem selecionado renderizado na home.
- [ ] Fluxos singleplayer e multiplayer ligados aos estados reais.
- [ ] Ranking/perfil/SEO reativados sobre pontuação autoritativa.

## Decisões

- O site já usa Astro SSR. As rotas únicas de ranking e perfil existem; esta frente deve
  restaurá-las e melhorar metadados/cache, sem migrar o produto para outro framework.
- `RANKING_ON` permanece desligado durante a reconstrução visual. A rota antiga de envio de
  partida aceita números calculados no cliente e não serve como autoridade competitiva.
- Os painéis, APIs, estados e modelos atuais serão adaptados. O runtime `support.js` do
  protótipo não entra no jogo.

## Próximo passo

Montar o casco do hub na home, preservando os fluxos reais do jogo. A régua
`npm run eval:redesign` passou em 26/09 com Node 23 (`PATH=/opt/homebrew/bin:$PATH`), e
`--mutante=menu-wall-contain-volta` deixou UIR32 vermelha. A revisão visual ainda está
pendente: o acesso do navegador a `127.0.0.1:4339` foi recusado em 26/09, portanto não
há captura 3:2/16:9 validada nesta lane. Não declarar o wallpaper aprovado visualmente
até conferir o recorte de todos os wallpapers nessas proporções e em ultrawide.
