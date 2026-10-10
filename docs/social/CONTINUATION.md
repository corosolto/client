# Continuação — comunidade CORO SOLTO

Implementar a primeira entrega social utilizável do CORO SOLTO: conta segura preservando convidados, perfis/estatísticas confiáveis, amizade/presença, convites para sala real, ranking consistente, notificações/feed, privacidade/bloqueio/denúncia. DoD: interface/backend/banco integrados, provas com contas independentes, revisão independente, configuração/roadmap/capturas e PRs revisáveis; sem merge/deploy público sem autorização.

## Isolamento e checkpoints
Client worktree social-community, branch feat/social-community, base6277618. Commits26680a9b6 (ledger), b5c6b777b (proxy/projeções), 057ae8cb6 (UI). Backend worktree exclusiva em csbrasil-backend/worktrees/social-community, base d52ff5f; commits d2d904b/326f5b8/67f3c3e/376f956/64e56f3. Primary e produção do trailer não alterados. PRs ainda a registrar abaixo.

## Validação atual (2026-10-10)
- Supabase Auth/Postgres/Storage reais locais isolados (API54321/DB54322), API8091, nó8791, Astro4391. Segredos somente env ignorado0600; nenhum banco público alterado.
- 30 checks reais API/DB: três contas, sessão/expiração/logout, onboarding/vínculo guest concorrente, amizade cruzada, IDOR, bloqueio, privacidade, presença, convite real para mesma sala, replay/expiração, upload privado, filtros e moderação auditável/reversível.
- Gameplay socket real: duas contas + segunda aba de A, sala H6UEAMVM/piscina_treta. A: +1 match, +2 kills, +3 deaths, +4 pontos, +72s ativos; B: +1 match/+72s. 45s input +45s AFK; dados declarados pelo navegador ignorados; ranking/perfil concordam. Snapshot completo não versionado artifacts/social-gameplay.json no backend. Contagem de rounds foi depois corrigida por SQL independente para uma rodada/conta, inclusive aliases.
- Contrato RoundTracker e três mutantes (AFK, conta duplicada, solo) verdes. SQL transacional social-aggregation.sql prova aliases+abas/histórico/feed, 5400s union e outcome único, sem scalar9999; rollback.
- Backend npm run portao e npm run test:api completos passaram. Smoke API real10 checks; signaling6 checks em /ws. Client build e check:deploy47/47 passaram. As réguas antigas foram atualizadas ao RPC/projeções verificados mantendo mutantes RED.
- Revisão independente clean-context: SECURITY-REVIEW.md, sem P0/P1/P2 aberto no snapshot final; bugs de projeção, avatar, guest stale, arquivo0644, participante apagado e outcomes duplicados corrigidos/retestados.
- Browser duas sessões (localhost/127) com Auth real: perfil/busca/amizade/aceite/ranking e refresh persistente. Capturas desktop reais em client/artifacts/social, fora do Git. Controle Chrome passou a falhar com timeout; mobile e entrada pelo botão até combate NÃO certificados. Possível override temporário de viewport não pôde ser resetado pela capability indisponível.

## Limites e pendências de release
OAuth Google/Discord/GitHub externos ainda depende de aplicações/segredos e configuração real do Supabase; local não habilita provedor fictício. Password somente desenvolvimento, bloqueado em production. Nenhum OAuth externo, deploy, merge ou migration remota autorizado/executado. Operação/rollout e roadmap em client/docs/social/OPERACAO.md.
Bootstrap local carece da relação legada presence_anon não versionada; ingestão salva rounds verificados antes do enriquecimento e preserva erro/retry, mas schema operacional de produção exige reconciliação. Ranking público permanece gate default off; ativação exige rollout coordenado e prova de humanos autenticados/solo no ambiente alvo. Vitórias/derrotas são rodadas; match final/streak máximo não instrumentados. Offline legado preservado, sem promover kills/horas não confiáveis. Não há lobby ready-check/reserva; entrada real usa salas atuais e room_full.
Posts/comentários/reactions/clãs/chat social não implementados: roadmap sem botões vazios. Triagem de denúncias funciona via CLI confiável; falta designar operador/prazo.

## Próximo passo concreto
Abrir PRs draft pareados client/backend e registrar URLs/SHAs. Após autorização específica, configurar OAuth/infra e validar browser mobile + convite/combate humano no alvo; não confundir checks locais com aprovação visual/produção. Manter estas worktrees exclusivas e os serviços locais para continuação; não tocar primary/trailer/outras lanes.
