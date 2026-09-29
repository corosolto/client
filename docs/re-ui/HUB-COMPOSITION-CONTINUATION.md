# Revisão visual do hub — 29/09/2026

## Objetivo e aceite

Levar a composição aprovada localmente para a `main` atual por PR focado:
personagem sem alongamento, mapa limitado nas telas largas, setas completas,
tipografia consistente e controles acessíveis nas páginas e no celular.
Aceite técnico: build e gates de UI verdes, 12 telas inspecionadas em desktop e
mobile. Aceite humano: revisão do PR/preview; uma partida e sala reais ainda
precisam de prova própria antes de declarar release concluído.

## Lane e decisões

- Worktree `worktrees/hub-composition-review`, branch `v2/hub-composition-review`,
  criada de `origin/main@0860b5c29`; checkout `re-ui-home` original preservado.
- Portados apenas os commits de escala (`7c14f0f77`), proporção (`274dc95bc`)
  e revisão integral (`eaece4ae7`) por cherry-pick. Mudanças antigas de ranking,
  perfil e release do checkout original ficaram fora do diff. Checkpoints neste
  branch: `af9ac36c1`, `5ca7466c3`, `75fcd59a0` e reconciliação `37a1d7e13`.
- A `main` tinha a home padrão, links sociais e dica contextual de outro PR.
  O conflito de rodapé foi resolvido preservando esses elementos. As regras de
  centralização concorrentes do PR #709 foram unificadas com o eixo do mapa.
- Pesquisa visual com links e observações em `AAA-RESEARCH-2026-09-29.md`.
  PR #689 (tipografia, draft) toca o mesmo CSS; revisar esse conflito antes de
  integrar os dois trabalhos.

## Evidência local

- Layout: 7/7 formatos (3:2, 16:9, 2234×1224, ultrawide, 720p, 4:3, mobile).
  Carrossel clicável, setas dentro do mapa, botão de sala privada alcançável.
- Proporção do canvas: 6/6 formatos, fator vertical 1,00.
- Confirmação: fechar sem iniciar a partida não mostra erro falso.
- Capturas das 12 telas em
  `/Volumes/Zenith/Projects/game/corosolto/_artifacts/hub-pr-review-2026-09-29/`
  (`user-display/` e `mobile/`), inspecionadas localmente. Não estão no Git.
- `npm run check:seo` passou 6/6 e incluiu build; `docs:check` passou após
  regenerar as contagens dos quatro scripts novos; `eval:redesign` e
  `eval:launchwatchdog` passaram no `check:fast`.
- `check:fast` terminou 161/167. `docs:check` estava vermelho durante a corrida
  porque a documentação ainda não tinha sido regenerada; a repetição passou.
  `eval:docsautoria` também passou isolado após a regeneração. Os outros quatro
  vermelhos são fora do diff: `eval:mapid` aponta IDs antigos em `plans/` e
  `graffiti_layout.js`; `audio:check` encontra 0 arquivos do pacote privado no
  worktree novo; `eval:audiovoicemix` acusa ausência de fala MP; `eval:mansao`
  não encontra `docs/maps/MANSAO-RECOVERY-ASSETS.json`. O arquivo gerado pelo
  teste de pickups foi restaurado sem entrar no PR.
- O hook de pre-push passou `eval:mapcontrato` e `check:deploy` em 228 s no SHA
  `28e48e848`. PR aberto: <https://github.com/corosolto/client/pull/713>,
  base `main`, branch `v2/hub-composition-review`; mergeável na criação, CI em
  andamento. O PR permanece aberto para revisão, sem merge.

## Próximo passo

Acompanhar CI e preview do PR #713, obter revisão visual do jogador e resolver
eventual sobreposição com o PR #689 antes do merge. Uma partida e sala real
continuam sem prova nesta lane. Não fazer merge nem deploy aqui.
