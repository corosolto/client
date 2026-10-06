# Continuação da fila de PRs — 06/10/2026

## Objetivo e aceite

Atender ao pedido do dono para revisar, resolver os bloqueios e mesclar os PRs abertos do cliente. Aceite: cada PR incorporado só depois dos checks exigidos e dos gates visuais/de produto aplicáveis; bloqueios sem solução permanecem explícitos. O pedido paralelo de remover a caixa de FPS/diagnóstico no multiplayer está em #777.

## Milestones confirmados

- #779, #769 e #768 foram mesclados.
- #780 atualiza `source-map-js` para 1.2.2 e `smol-toml` para 1.9.0. Localmente, `npm audit`, `eval:deps`, `npm ci --dry-run --ignore-scripts` e `check:deploy` passaram; CI remota ainda executa invariantes e smoke. Auto-merge está desabilitado no repositório.
- #755: integração local com `origin/main` no commit `9dbda5d603aa759cc06c2bf59bf4ed0489380306`; `eval:escadao-spawn-egress` passou 8/8, `eval:netcode` 201/201 e `check:deploy` 46/46. Esta integração ainda não foi enviada ao branch remoto.
- #777 remove o painel do HUD no diff. CI do head `7c1df0f075b4f293b799967b0f5869de5f505d1f` falhou no smoke de chat: o aviso de clique na própria mensagem ficou vazio. O teste passou nos outros quatro casos. Não há ainda comparação com o branch-base.
- #773 continua draft e não está aprovado visualmente: captura local confirmou pose de seleção defeituosa de Julia; movimento/tiro e revisão dos personagens continuam pendentes. Estado detalhado em `worktrees/politicos/docs/reports/PR773-CONTINUATION.md` no worktree de políticos.

## Pilha e estado remoto observado

Em `2026-10-06`, a fila tem 11 PRs abertas: #780, #777, #776, #775, #774, #773, #772, #771, #767, #756 e #755. A pilha de multiplayer deve seguir #755 → #775 → #776 → #777. Não fazer bypass de branch protection. Manter worktrees sujos existentes intactos; a integração de #755 está isolada neste worktree.

## Próximos passos

1. Aguardar resultado completo da CI de #780; mesclar manualmente quando todos os checks obrigatórios passarem.
2. Atualizar a integração local de #755 sobre a main após #780, validar e enviar ao branch do PR.
3. Resolver a falha de smoke de #777 ou demonstrar que também falha no branch-base; continuar a pilha só com checks verdes.
4. Tratar os demais PRs individualmente conforme conflitos, checks e revisão visual; não mesclar #773 antes de corrigir a pose de Julia e completar os gates visuais/de movimento.
