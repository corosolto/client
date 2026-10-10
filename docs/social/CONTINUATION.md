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
Ainda sem implementação ou testes de aceitação. Régua independente: `/tmp/corosolto-social-acceptance.md` (será consolidada). Este documento é o ledger designado.

## Pendências
Auditar main backend, schema privado e infraestrutura local disponível; implementar vínculo seguro e migration incremental antes da UI; testar baseline RED; validar toda fatia vertical.

## Próximo passo
Inspecionar main do backend na worktree exclusiva e contratos de sessão, sala, persistência e ranking. Preparar banco local isolado, sem tocar Supabase produção.
