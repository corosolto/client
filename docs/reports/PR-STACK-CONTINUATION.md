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

## Candidato acumulado pronto — 09/10/2026

### Cliente

- Base exata preservada: `c4bd6ef0c477d1d19cd8fcd5056d20d1595b99c5`, candidato integrado de #773 com personagens, visuais e CI.
- A pilha #755 → #775 → #776 → #777 foi recomposta pelo merge local `16d950ebce291826ae8e6127f461b82717fca123`, com pais `c4bd6ef0c477d1d19cd8fcd5056d20d1595b99c5` e `597df2af032b20b006265de71bd1e95f1e51353d`.
- A resolução manteve a seleção autoritativa de personagem de #772 e acrescentou o cartão de identidade de #775. O evento `personagem` agora também atualiza o cartão depois da confirmação do servidor.
- `eval:mpRoomOptions` encontrou uma regressão que já existia no candidato de #773: o fluxo JOGAR COM AMIGOS ainda enviava `faccaoE/faccaoB`, embora o servidor ignore esses campos. `e426c3c6516ead108f57b7cc249e444360011958` removeu os dois campos; a régua voltou a ficar verde.
- Gates focados: netcode 205/205, chat 151/151, saída do Escadão 8/8, pool por lado, troca de personagem, opções de sala, paridade cliente/nó, contrato dos mapas e opções de partida verdes.
- Portão local obrigatório: `check:deploy` 47/47 com Node 23.6.

### Backend

- Base exata observada: `f176d8a5b1678ddee4433235fcf5a1e58dc28ce0` (`origin/main`).
- #56 → #61 foram recompostos no merge local `39fc9d252991af94939558b14089a6e009b1a469`, com pais `f176d8a5b1678ddee4433235fcf5a1e58dc28ce0` e `1feac9772e3fe2ff298ca55be9ef6a57046307d0`.
- Validação em montagem isolada pareada com o candidato do cliente: round telemetry 23/23, saída da rota circular verde, telemetry smoke 43/43 e contrato do cliente 2/2.
- O `portao` completo do backend passou com `CLIENT_DIR` apontando para o candidato do cliente. A primeira tentativa sem `CLIENT_DIR` parou corretamente porque procurou um checkout padrão inexistente; não foi falha do código.

### Gate de publicação

Nada desta recomposição foi enviado. Quando #773 estiver em `main` e a release automática terminar, atualizar as duas bases, preservar a mesma composição e fixar o `Dockerfile` do backend no SHA público final do cliente antes de retarget/push de #777 e #61.
