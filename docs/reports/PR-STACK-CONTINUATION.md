# Continuação da fila de PRs — 06/10/2026

## Objetivo e aceite

Atender ao pedido do dono para revisar, resolver os bloqueios e mesclar os PRs abertos do cliente. Aceite: cada PR incorporado só depois dos checks exigidos e dos gates visuais/de produto aplicáveis; bloqueios sem solução permanecem explícitos. O pedido paralelo de remover a caixa de FPS/diagnóstico no multiplayer está em #777.

## Milestones confirmados

- #779, #769 e #768 foram mesclados.
- #780 atualiza `source-map-js` para 1.2.2 e `smol-toml` para 1.9.0. `npm audit`, `eval:deps`, `npm ci --dry-run --ignore-scripts`, `check:deploy`, build, invariantes, navegação dos bots e smoke passaram. Mesclado em `1c91b599aa28e1440e689e52b30474bf5af747c8` às 10:48 UTC; fecha #748. Auto-merge está desabilitado no repositório.
- #755: integração local com `origin/main` em `1c91b599aa28e1440e689e52b30474bf5af747c8`, no commit atual `32148248a`. Antes de atualizar a dependência, `eval:escadao-spawn-egress` passou 8/8, `eval:netcode` 201/201 e `check:deploy` 46/46. Push e validação dos hooks ainda pendentes.
- #777 remove o painel do HUD no diff. CI do head `7c1df0f075b4f293b799967b0f5869de5f505d1f` falhou no smoke de chat: o aviso de clique na própria mensagem ficou vazio. Os outros quatro casos passaram. A repetição do smoke está em andamento; ainda não há comparação concluída com o branch-base.
- #773 continua draft e não está aprovado visualmente: captura local confirmou pose de seleção defeituosa de Julia; movimento/tiro e revisão dos personagens continuam pendentes. Estado detalhado em `worktrees/politicos/docs/reports/PR773-CONTINUATION.md` no worktree de políticos.

## Pilha e estado remoto observado

Em `2026-10-06`, restam 10 PRs abertas: #777, #776, #775, #774, #773, #772, #771, #767, #756 e #755. A pilha de multiplayer deve seguir #755 → #775 → #776 → #777. Não fazer bypass de branch protection. Manter worktrees sujos existentes intactos; a integração de #755 está isolada neste worktree.

## Próximos passos

1. Executar os hooks de validação de #755 sobre a main atual e enviar ao branch do PR.
2. Resolver a falha de smoke de #777 ou demonstrar que também falha no branch-base; continuar a pilha só com checks verdes.
3. Tratar os demais PRs individualmente conforme conflitos, checks e revisão visual; não mesclar #773 antes de corrigir a pose de Julia e completar os gates visuais/de movimento.
