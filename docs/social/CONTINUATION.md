# Camada social: continuidade

## Objetivo e definição de pronto
Entregar a camada social integrada do CORO SOLTO: conta OAuth com convidado preservado, perfis confiáveis e privados, amizade e presença, convite para a mesma sala, ranking consistente global/amigos, notificações/feed verificados, bloqueio/denúncia. Fluxo mínimo real: duas sessões autenticadas visitam perfis, tornam-se amigas, comparam ranking e entram na mesma sala. Validar banco/API/game reais, terceira conta, refresh, concorrência, expiração e impossibilidade de forjar estatísticas/tempo/bônus. Capturar desktop/mobile, revisão independente e PR coeso. Sem merge ou deploy público.

## Isolamento
Client: branch `feat/social-community`, worktree `csbrasil/worktrees/social-community`, base `62776184e00bd4484940cfe8d26b917a03083e3a` (origin/main alpha.62). Primary, trailer e outras lanes somente leitura. Backend separado exige worktree própria porque a main do client proxy encaminha APIs ao backend; nunca implementar banco em uma API paralela no client.

## Auditoria em andamento
- A main é mais recente que a lane primary: rotas de register/identity/leaderboard/submit-match residem no backend privado.
- Perfil SSR e badge ainda consultam Supabase no site; privacidade deve cobrir essas superfícies também.
- Existe multiplayer por códigos regionais `/sala/<código>` e lobby real. Reutilizar `nos.js`, `net.js` e tickets.
- Identidade de convidado UID/token é credencial privada; nick e ID público não autenticam.
- OAuth legado no register associa `auth_user` por update; precisa vínculo atômico seguro e conta única.
- `submit-match` legado aceita stats do browser. Auditar main do backend antes de promover qualquer dado como verificado.

## Milestones
Preparação: AGENTS, handoffs, segurança, main e mudanças alheias inspecionados. Worktree client limpa criada. Régua/crítico independente despachado conforme AGENTS; nenhum agente implementa em paralelo.

## Decisões
Sem credenciais inventadas. Mostrar provedores apenas se habilitados realmente. Sem social modal no combate. Sem estatísticas fictícias, ranking flag novo, botões de roadmap ou dados privados em respostas públicas.

## Validações / artefatos / commits
Implementação em andamento nas duas worktrees exclusivas; não entregue nem aprovada visualmente. Régua independente: `/tmp/corosolto-social-acceptance.md` (será consolidada). Este documento é o ledger designado.

## Pendências
Auditar main backend, schema privado e infraestrutura local disponível; implementar vínculo seguro e migration incremental antes da UI; testar baseline RED; validar toda fatia vertical.

## Próximo passo
Inspecionar main do backend na worktree exclusiva e contratos de sessão, sala, persistência e ranking. Preparar banco local isolado, sem tocar Supabase produção.

## Milestone: base local e integração em andamento
Backend base d52ff5f; commits d2d904b, 326f5b8 (migrations 040-042), 67f3c3e (sessão/API e teste real). Supabase local isolado em /tmp/corosolto-social-supabase: API 54321, DB 54322; API backend 8091, Astro localhost:4391, nó game 8791. Arquivos .env.social-local ignorados, chmod 600; logs só /tmp. Nenhuma infraestrutura pública alterada.
13 testes reais de Auth/API/Postgres passaram: três sessões, amizade cruzada concorrente, IDOR settings, privacidade, expiração de presença, bloqueio, denúncia, CSRF e logout. Régua independente em ACCEPTANCE.md com baseline RED de OAuth/privacidade. UI real em /comunidade e /u/UUID/nick; rankings e cookie/tickets reaproveitam APIs existentes. Código ainda sem aceite visual final.
Auditoria encontrou bypass em badge/sitemap e URL incorreta de sala; correções em andamento com falha fechada e sem cache de dados revogáveis. Migrations sociais ainda inéditas permitem ajustes antes do rollout. Ranking usa somente rounds verificados do nó, não stats enviados pelo navegador. Offline legado fica preservado e não promovido; entrega SP verificável segue pendente.
Próximo passo concreto: validar convite com dois sockets reais no mesmo nó, fechar deduplicação de horas em múltiplas abas, sessões e uploads, capturar desktop/mobile e executar checks/revisão independente. Ainda pendentes configuração OAuth real, rollout coordenado, moderação operacional, PRs. Sem merge/deploy autorizados.

## Milestone: UI com duas sessões e gates
Chrome localhost e 127.0.0.1 usam cookies independentes: DonaResenha e ReiDaTreta entraram em Auth local, criaram perfis, A buscou/visitou B, pedido/aceite de amizade real e ranking de amigos mostra ambos. Refresh preservou sessão. Capturas artifacts/social/friends-desktop.jpg e ranking-friends.jpg (não versionadas, sem segredos). Browser indisponível após timeout ao abrir jogo; nenhum aceite visual de gameplay/mobile ainda.
Build completo e syntax passaram. check:deploy inicialmente identificou docs gerados, novas rotas e regex de proxy; docs regenerados, listas sincronizadas e segredo de proxy revalidado. Segunda execução em andamento. API27 e vertical sockets verdes; review independente de privacidade corrigida. Próximo passo: concluir provas gameplay/solo/horas, mobile e review, consolidar configuração e roadmap antes de PRs. Não há merge/deploy.

## Milestone: configuração, filtros e revisão
check:deploy completo47/47 passou; build e syntax verdes. API30 real passou com solo um humano, filtros por período/modo, moderação service-only auditável/reversível, avatar privado, expiração e concorrência. Backend checkpoint64e56f3. Regressões adicionadas ao backend rejeitam três mutantes de AFK/solo/identidade repetida.
Login após credencial antiga de convidado tem recuperação explícita sem vincular perfil não comprovado; sessão expirada limpa conteúdo social e mantém os provedores habilitados. Botões, filtros e estados responsivos foram integrados à identidade existente. Fonte do badge é importada raw para evitar overflow AST do devserver mantendo bytes. SSR local agora tem credenciais do Supabase local em env ignorado0600.
Review independente está revalidando runtime; banco/API/nó reais verdes para fatia vertical e solo. Gameplay completo ainda repetindo após identificar flush com IDs de fixture já removidos; ignorar identidade apagada não pode abortar lote inteiro. BrowserChrome voltou para inspeção desktop de dados reais, mas capability viewport voltou a indisponibilidade; captura/mobile e convite no browser ainda pendentes. Capturas anteriores em artifacts/social, sem aceitar visualmente estado final.
Próximo passo: provas finais gameplay e browser, validar build/checks após últimos edits, documentação de operação/OAuth e PRs draft ligados. Workflow preview-build ignora PR draft; sem merge/publicdeploy.
