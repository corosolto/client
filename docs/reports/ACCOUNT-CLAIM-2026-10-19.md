# Continuação · reivindicar perfil · 19/10/2026

## Objetivo e pronto

Converter perfis sem conta, especialmente jogadores que voltam, com convite real de 1.000 TRETA$ por conta confirmada, sem pagamento duplicado; agradecer autores de feedback por email quando houver inscrição confirmada; restaurar feedback no perfil e reduzir música a um ícone de alto-falante. Preservar entrada livre no jogo. O objetivo maior inclui inteligência de aquisição/retorno no game-admin e diagnóstico mobile antes de ampliar mídia ou considerar lojas oficiais.

## Estado

- Branch `codex/account-claim-bonus-20261019` do client, base `origin/main` `cbb46cf06` (alpha.111). Checkout original tem outras alterações e não foi tocado.
- Convite existente pós-partida usa valor da campanha retornado por `/api/treta`. Perfil local salvo com nick + token passa a poder receber o mesmo convite ao voltar ao menu, respeitando cooldown e sem sobrepor diálogos; essa entrada antecipada exige campanha ativa com `email_reward=1000`. Copy usa condição de entrada e confirmação de email, sem afirmar crédito antes do resgate.
- Perfil principal, perfil TRETA POP atual e diálogo da conta têm acesso a Feedback. Música do hub, splash e menu MAIS virou ícone SVG speaker ligado/desligado, com `aria-label` preservado.
- Build client passou em Node 23. Régua `login-prompt-check` estática e browser LB9 do convite de retorno passaram; `menu-music-review-check` passou. Auditoria do lobby TRETA POP passou 29/29, inclusive toque e orientação mobile. Auditoria do perfil passou 15/15. Capturas em `/tmp/cs-claim-lobby-audit`, `/tmp/cs-claim-perfil-audit` e `/tmp/cs-claim-login/retorno-perfil-1000.png`; o botão ENVIAR FEEDBACK e o popup de 1.000 T$ foram inspecionados visualmente. Login/OAuth real exige implantação coordenada.
- Consulta somente leitura ao Supabase: 47 feedbacks, 30 emails distintos, 24 opt-ins de feedback; 5 inscrições de conta confirmadas e ativas, nenhuma em comum com os autores. Ranking de fiéis não expõe emails. Email da oferta não foi enviado; depende da migration/backend em produção, de confirmação/supressões e endereço postal do remetente.

## Próximo passo

Fazer checkpoint e PR draft. Backend [PR draft #142](https://github.com/corosolto/backend/pull/142) traz migration `075_treta_welcome_1000.sql`; coordenar migration/backend/client e confirmar crédito numa conta de teste antes de enviar broadcast aos inscritos elegíveis. Medir entrada e falha de carregamento em mobile e fazer QA em aparelhos físicos antes de aumentar mídia ou empacotar para lojas. Não houve merge, deploy, migration remota, gasto ou envio.
