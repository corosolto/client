# Continuação da fila de PRs — 06/10/2026

## Objetivo e aceite

Atender ao pedido do dono para revisar, resolver os bloqueios e mesclar os PRs abertos do cliente. Aceite: cada PR incorporado só depois dos checks exigidos e dos gates visuais/de produto aplicáveis; bloqueios sem solução permanecem explícitos. O pedido paralelo de remover a caixa de FPS/diagnóstico no multiplayer está em #777.

## Milestones confirmados

- #779, #769 e #768 foram mesclados.
- #780 atualiza `source-map-js` para 1.2.2 e `smol-toml` para 1.9.0. `npm audit`, `eval:deps`, `npm ci --dry-run --ignore-scripts`, `check:deploy`, build, invariantes, navegação dos bots e smoke passaram. Mesclado em `1c91b599aa28e1440e689e52b30474bf5af747c8` às 10:48 UTC; fecha #748. Auto-merge está desabilitado no repositório.
- #756 roadmap visual e bot de regressão foi mesclado em `548d0421da4dbb689e256267c6076757501a89e8` às 11:09 UTC.
- #755 integra a correção de Escadão; seu head remoto atual observado é `453380d6c32b41e9955cf74261ee8ec4729281a5`, após novo merge da base pelo bot. A validação local anterior no commit `32148248a` passou `eval:escadao-spawn-egress` 8/8, `eval:netcode` 201/201 e `check:deploy` 46/46. No head remoto atual, build, smoke e portao-browser seguem em andamento; não mesclar antes desses gates. Handoff da fila atualizado neste worktree; aguardando pre-push para publicar a atualização.
- #781 corrige as três vulnerabilidades do lock da documentação; PR aberto e CI em andamento. `docs/reports/DOCS-DEPENDENCY-SECURITY-2026-10-06.md` contém o handoff específico.
- #777 remove o painel do HUD no diff. O smoke antigo falhou no aviso de clique na própria mensagem; a repetição do smoke passou, mas o build antigo falhou por causa da dependência que #780 atualizou. Reexecutar os checks quando a pilha for atualizada; o gate de chat original continua sendo causa não relacionada ao painel.
- #773 continua draft e não está aprovado visualmente: captura local confirmou pose de seleção defeituosa de Julia; movimento/tiro e revisão dos personagens continuam pendentes. Estado detalhado em `worktrees/politicos/docs/reports/PR773-CONTINUATION.md` no worktree de políticos.

## Pilha e estado remoto observado

Em `2026-10-06`, restam 10 PRs abertas: #781, #777, #776, #775, #774, #773, #772, #771, #767 e #755. A pilha de multiplayer deve seguir #755 → #775 → #776 → #777. Não fazer bypass de branch protection. Manter worktrees sujos existentes intactos; a integração de #755 está isolada neste worktree.

## Próximos passos

1. Aguardar os gates atuais de #755; se verdes, mesclar e atualizar #775, #776 e #777 em sequência.
2. Aguardar CI de #781; mesclar se todos os checks exigidos passarem.
3. Tratar os demais PRs individualmente conforme conflitos, checks e revisão visual; não mesclar #773 antes de corrigir a pose de Julia e completar os gates visuais/de movimento.
