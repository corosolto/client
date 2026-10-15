# Analytics e origem do tráfego — continuação (15/10/2026)

## Objetivo e pronto quando

Medir visitantes e referenciadores sem confundir requisições automatizadas com pessoas; manter a escolha de coleta opcional; apresentar no game-admin a origem de primeira aquisição sem chamá-la de visitas totais. Pronto para revisão quando os dois builds, testes de consentimento e agregação, revisão adversarial e PRs estiverem concluídos. Produção exige promoção dos PRs e verificação com acessos humanos reais; dados históricos sem coleta não podem ser reconstruídos.

## Evidência observada

- Cloudflare Zone Analytics, últimas 24 h em 15/10: 24,83 mil visitas e 24,91 mil pageviews HTTP. User agents ClaudeBot 11,74 mil, curl 7,13 mil, AhrefsBot 2,33 mil; visitas não equivalem a pessoas.
- Vercel Analytics: 2 visitantes nas mesmas 24 h. O HTML publicado em `www.corosolto.com.br` no commit `ce046d9521d90708d6fc44be03af46475e7920e1` não carrega `/_vercel/insights/script.js`.
- `c74421f10` removeu o script em 13/10 ao introduzir consentimento opcional. Isso explica a perda de medição da Vercel, sem invalidar a decisão de privacidade.
- Consulta somente leitura à tabela `acquisition` (08–15/10): 1.366 primeiras aquisições com consentimento; 450 em 14/10 e 21 em 15/10 no momento da consulta. Após normalização proposta: 347 com host externo registrado, 317 com UTM, 897 sem sinal de origem; canais mutuamente exclusivos: x.com 304, LinkedIn 96, Google 38, GitHub 14. Esses dados não são pessoas únicas nem sessões totais. O histórico não marca retornos de OAuth: `accounts.google.com` foi excluído, mas outros provedores podem contaminar os referenciadores. Não atribuir a origem histórica a pessoas com certeza.
- Consulta por dia após os PRs, com a mesma regra: 14/10 teve 450 primeiras aquisições, 26 hosts externos (X 16, Google 5, LinkedIn 2), 24 UTMs e 414 sem sinal; 15/10, no momento da consulta, teve 21 aquisições, 8 hosts externos (X 7, Google 1), 8 UTMs e 12 sem sinal. UTM e referrer podem se sobrepor.

## Trabalho e validação

- Client: branch `codex/analytics-referrals-20261015`, worktree `worktrees/analytics-referrals-client-20261015`, base `corosolto/main` `e8c4a2c4b`. O runtime de privacidade carrega Vercel Analytics após consentimento em home e páginas de conteúdo, suprime eventos após revogação e remove query e identificadores da URL enviada.
- Admin: branch `codex/analytics-referrals-20261015`, worktree `worktrees/analytics-referrals-admin-20261015`, base `origin/main` `f8a4fdd`. `/origem` distingue novos navegadores medidos, referrer externo, UTM, indicação e ausência de sinal; canais atribuídos usam uma origem por navegador. Os canais não são cortados após 12 e UTM comuns são reunidas com seus domínios.
- Régua do client reprovou antes da correção; mutação que remove bloqueio após revogação também reprovou. `eval:privacy` e build client passaram. No admin, teste de agregação reprovou antes da implementação; 87 testes, lint, typecheck, hidratação e build passaram com Node 23. Revisão adversarial identificou OAuth histórico, corte de canais, aliases UTM e cobertura das páginas de conteúdo; os três últimos foram corrigidos.

## Estado e próximo passo

Checkpoints: client `38d4fd33f` e `17ef5d308`; admin `1738d85`. PRs draft: [client #988](https://github.com/corosolto/client/pull/988) e [admin #25](https://github.com/rubenmarcus/csbrasil-admin/pull/25). O primeiro push do client foi barrado por SB7: o script em Layout não tinha URL com revisão. Corrigido com `__MANIFESTO_JS__`; `eval:shaderbudget`, build e `check:deploy` passaram (62/62) com Node 23, e o push passou. O preview admin ficou pronto e CI admin passou; client CI/preview ainda estavam em andamento na última consulta. Não houve merge nem deploy de produção. A instrumentação futura não preenche os dados perdidos de 13–15/10. Para números humanos exatos por origem, instrumentar eventos de sessão e marcador explícito de callback OAuth em trabalho futuro; a tabela `acquisition` atual não suporta essa inferência retroativa.
