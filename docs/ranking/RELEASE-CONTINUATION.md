# Corte do ranking SP+MP — 26/09/2026

## Objetivo completo

Reativar um ranking público único: 1 ponto por abate da base já coletada no
cliente (SP e MP) e mais 1 ponto por abate MP confirmado pelo nó quando dois
perfis autenticados distintos ocupam slots simultâneos. Não usar rótulos
“casual”/“competitivo” na UI. Ranking, perfil, badge e SEO devem mostrar pontos.
Em paralelo, a home redesenhada continua pendente de revisão visual e de
navegação; ela **não** faz parte deste deploy. O handoff desse objetivo segue em
`../re-ui/CONTINUATION.md` na branch `codex/re-ui-home`, não nesta branch.

## Estado e evidência

- Branch isolada `codex/ranking-release`, criada de `origin/main` `5b9c9bec3`
  (alpha.300). A branch de design `codex/re-ui-home` não foi promovida.
- Código do ranking foi portado do commit `7c5a73785` sem `hub-ui`, modais nem
  mudanças de layout experimental. O ticket MP registra perfil via `uid + token`
  antes de pedir ingresso; a API decide se o ticket leva `players.id`.
- `npm run syntax`, `npm run build` e `npm run check:seo` (6/6) passaram com
  `RANKING_ON` desligado. `RANKING_ON=true npm run check:seo` também passou
  (6/6). `npm run docs:check` e `npm run eval:apis` passaram após regenerar
  apenas sete blocos de documentação derivados.
- Ainda não houve preview/prod Vercel, merge, push nem ativação da flag.
- O banco de produção é PostgreSQL 17.6; a migration 037 ainda não estava
  aplicada na inspeção. O plano Free não oferece backup agendado. O SQL foi
  copiado para `/Users/ruben/db-privado/supabase/migrations/037_ranking_mp_bonus.sql`
  com o mesmo SHA-256 da fonte backend; agora tem transação explícita.
- API Cloud Run em produção usa imagem `backend:36cfdb6`, revisão
  `csbrasil-backend-00033-m6k`, 100% do tráfego. `/api/leaderboard` respondeu
  `{disabled:true}` antes do corte.
- Três nós em produção: servidor `fe7d950`, cliente simulado `d4d9c693`
  (alpha.250), 0 jogadores na primeira inspeção. A branch atual de backend
  não deve ser usada diretamente como imagem de nó: com clientes `e19965c`
  ou alpha.300, `eval:dispersao` D7 falha (1 impacto atravessa parede). Com
  alpha.250, D7 passa, mas o `portao` completo da branch moderna falha em
  `eval:authority` por contrato de arma do cliente antigo. A branch de nó
  `codex/ranking-node-release` conserva a base `fe7d950` e só o patch de
  ranking; seus gates de ranking/rounds/eventos/D7 passaram. O portão completo
  nessa base também falha em `eval:authority` herdado, não na mudança do ranking.

## Próximo corte (na ordem)

1. Concluir revisão/commit das branches API (`codex/ranking-score`), nó
   (`codex/ranking-node-release`) e cliente (`codex/ranking-release`).
2. Aplicar a migration 037 transacional no Supabase e verificar colunas, RPC,
   view, privilégios, contagem e ordenação sem alterar histórico.
3. Publicar a API a partir da branch atual, com `RANKING_ON` ainda desligado;
   validar health e ingestão antiga.
4. Construir a imagem de nó da branch baseada em `fe7d950` com
   `CLIENT_REF=d4d9c693542237cb8bec6b8c2c2dc65f37373963`, canário EUA,
   depois Europa e Brasil somente com `players:0`, checando health/sha/ticket.
5. Publicar o cliente desta branch (sem hub), habilitar `RANKING_ON=true` em
   backend e build Vercel; validar `/api/leaderboard`, `/ranking`, perfil e
   badge em produção. Testar SP, MP com dois perfis autenticados, retry
   idempotente, bot/espectador/mesmo perfil sem bônus e perfil fora do top 500.
6. Se qualquer gate falhar, deixar a flag desligada e registrar a fronteira
   exata; não anunciar ranking ativo só por deploy verde.

## Marco validado: banco e builds — 26/09/2026

- A migration 037 foi aplicada em produção após dry-run com rollback. O
  pós-check confirmou view, RPC, coluna e privilégios: 4516 linhas em pontos,
  top 500, zero bônus retroativos; service role lê e anon não lê.
- API `305efaf` construída no Cloud Build
  `f93bf981-9a38-4019-a9b9-c8835b37e3d6` (SUCCESS), digest
  `sha256:33762017a98a25624d5184b7b837c9d773da4930f401e655030bbeb771152eb7`.
- Nó `11d3016` com cliente pinado alpha.250 construído no Cloud Build
  `90be4d27-487e-4f98-89fe-cd42bcd18588` (SUCCESS), digest
  `sha256:35d4c3e8113c30f77a2cfe58eefafda8f8b9c89f0a149ddbb7060d45f6905446`.
- Ainda sem tráfego dessas imagens, flag desligada e cliente não publicado.
  Próximo passo: promover API com flag desligada e conferir health/revisão.

## Marco validado: API e nós publicados, UI em PR

- Cloud Run API `backend:305efaf`, revisão `csbrasil-backend-00034-law`, recebe
  100% do tráfego. `/api/health` HTTP 200 com banco OK; `/api/leaderboard`
  segue HTTP 200 `{"disabled":true}`. Reversão da API: revisão `00033-m6k`.
- Nós EUA, Europa e Brasil publicados sequencialmente, sempre com zero
  jogadores. Os três `/health` públicos mostram `serverSha:11d3016`, cliente
  pinado `d4d9c693...`, protocolos 1–5, duas salas e zero jogadores. Em cada
  região, ticket emitido pela API abriu WebSocket e recebeu `welcome`.
  Reversão dos nós: imagem `servidor:runtime-fe7d950`.
- Branch `codex/ranking-release` publicada em PR #663; `check:deploy` local
  passou no push após regenerar `tools/eval/ARCH.md`. PR/CI ainda pendente,
  sem merge nem produção Vercel. O código da home experimental ficou fora.
- `SUPABASE_SERVICE_ROLE_KEY` não consta no ambiente Production da Vercel;
  o SSR de `/ranking`, `/u/*` e badge precisa dela. A documentação de segurança
  reserva a chave apenas ao SSR de produção, nunca Preview/browser. Pedida
  escolha do usuário entre configurar a variável protegida e adaptar o SSR
  para ler uma API pública. Até resolver, não ativar a vitrine.

## Ordem de merge definida pelo usuário

O usuário aprovou configurar a chave protegida e produzir o ranking, mas pediu
em seguida: **aguardar o merge das armas; só depois entra o ranking**. Em
26/09, a PR cliente #663 tinha checks verdes e seguia aberta; a PR backend
#34 seguia aberta. Nenhuma das duas foi mesclada. A chave ainda **não** foi
copiada para a Vercel; a flag pública continua desligada. A revisão Cloud Run
`00036-pej` com flag ligada permanece em 0% de tráfego.

Na retomada: confirmar o SHA da `main` após o merge das armas, atualizar a
lane isolada do ranking sem absorver a home experimental, repetir os gates e
verificar conflitos de `main.js`/`index.astro`/assets; então configurar somente
Production, construir sem alias, validar e promover na ordem coordenada.
Não antecipar merge nem deploy enquanto o merge das armas estiver em curso.
O layout da nova home continua na lane `codex/re-ui-home`, sem aceite visual,
e não faz parte da PR #663.

## Retomada após o merge das armas — 27/09/2026

- PR cliente #669 (`vm/hands-default`) foi mesclada em `main` no commit
  `1e4f88bd1`; o release automático avançou a base para `066646e8d`
  (`v2.1.0-alpha.2`). O bot atualizou a PR #663 com essa base.
- Auditoria de `origin/main...origin/codex/ranking-release`: só os arquivos
  de ranking/perfil e documentação/índices esperados ficaram no diff. Os seis
  arquivos funcionais do ranking não mudaram entre o checkpoint anterior
  `0b6c58c8a` e a branch atualizada pelo bot. O commit local que registrava
  a espera foi reaplicado sobre essa base, sem conflito.
- Produção no início da retomada: API pública ainda em `00034-law`, flag OFF;
  canário ON em `00036-pej` com 0% de tráfego; três nós `serverSha:11d3016`.
  O nó Brasil tinha 2 jogadores, portanto não reiniciar nós neste corte.
  Vercel Production ainda sem `RANKING_ON` e `SUPABASE_SERVICE_ROLE_KEY`.
- Próximo passo: gates na base alpha.2, variável protegida Production,
  deployment sem alias e prova de ranking/perfil/badge; depois merges e
  promoção coordenada. A home experimental continua fora do corte.

### Gates e ambiente de produção preparados

- `check:deploy` passou 46/46 na base alpha.2; build com `RANKING_ON=true` e
  `check:seo` passaram 6/6. A branch segue limpa fora deste ledger.
- A chave existente do Secret Manager foi instalada como
  `SUPABASE_SERVICE_ROLE_KEY` sensível **somente em Production** da Vercel;
  `RANKING_ON=true` também foi configurado somente em Production. O valor da
  chave não foi exibido nem salvo no repo. Nenhum deployment de cliente foi
  feito por essa configuração; o domínio público ainda usa o build anterior.
- Próximo passo: publicar candidato Production com `--skip-domain`, validar
  SSR e badge usando o banco real e só então decidir a ordem de promoção dos
  merges/alias. Não reiniciar os nós ocupados.

### Candidato Vercel e correção do badge — 27/09/2026

- O primeiro candidato sem domínio (`dpl_HkkZQeyoFfpbCiMxF1w3tzjJhRqC`)
  construiu e mostrou `/ranking` SSR com 500 jogadores, pontos, paginação e
  links `/u/<id>/<nick>`. Perfil canônico retornou 200 e nick errado, 301.
  Porém `/api/badge/<id>.png` retornou 500: a função tentou buscar seu próprio
  WASM dentro do deployment protegido, recebeu HTML e o fallback não estava
  empacotado. Não promover esse candidato.
- A rota do badge passou a usar `@resvg/resvg-js` nativo, já dependência do
  projeto, sem fetch recursivo nem fallback frágil. O texto da página foi
  corrigido para mostrar o link único `/u/<id>/<nick>`. Build local
  `RANKING_ON=true npm run build` passou.
- Segundo candidato `dpl_GAzZW6PMYYHBAgQG6K5urn3axsmu` READY; badge real
  retornou HTTP 200 `image/png` (21.276 bytes) pelo acesso autenticado da
  Vercel, PNG 840×440, SHA-256
  `bc88ed5ee02c8ed8c626cd71b189fd6b92eca113168cf97c3c4977ac8fa3dacc`.
  `/ranking`, página 2, `/u/<id>/<nick>` e home retornaram 200; cada página
  do ranking trouxe 25 links de perfil distintos e a home contém o link do
  ranking. Não houve aviso de ranking não configurado/indisponível.
  `--skip-domain` preservou `www.csbrasil.online` no build antigo com
  ranking OFF; a Vercel atribuiu apenas o alias de projeto
  `csbrasil-rubenmarcus-projects.vercel.app` ao candidato. Nick errado neste
  candidato redirecionou 301 para `/u/<id>/HiT%3B*`. Ainda falta atualizar o PR #663
  (o bot avança a base em paralelo), passar CI, integrar backend/cliente e
  verificar o domínio público. Nenhuma partida real SP/MP nova foi medida.

### API integrada com flag pública OFF — 27/09/2026

- A base cliente avançou a `v2.1.0-alpha.3` (`37824be5b`); correção do badge
  reaplicada sem conflito e enviada ao PR #663 em `52061e9f2`. O
  `check:deploy` completo passou 46/46 nessa base. O primeiro hook de push
  falhou em uma checagem de documentação; `npm run docs` e `gen-arch` não
  produziram diff, e a repetição independente de `check:deploy` passou 46/46.
- Consulta somente-leitura à base real encontrou **zero** linhas de
  `mp_round_player` com `bonus_kills > 0`; o top 500 do canário ainda tem
  pontos iguais aos kills. A implementação passou gates sintéticos, mas o
  bônus em partida humana ainda não foi observado.
- Para integrar sem ativar prematuramente, `RANKING_ON` em Vercel Production
  foi alterado para `false`; a chave SSR sensível continua somente em
  Production. No Cloud Run, o template também foi alterado para flag OFF antes
  do merge. O candidato Vercel já construído continua sendo evidência de
  staging, não o site público.
- A PR backend #34 foi mesclada em `b692b6821`; workflow de deploy
  `36350828998` passou. A nova revisão `csbrasil-backend-00037-4k2`
  (imagem `backend:b692b68`) recebeu 100% do tráfego com `RANKING_ON=false`.
  `/api/health` respondeu 200 com banco/esquema OK e frescor operacional;
  `/api/leaderboard` segue 200 `{"disabled":true}`. Canário ON `00036-pej`
  permanece em 0%; nenhum nó foi reiniciado.
- Próximo passo: aguardar CI/merge da PR cliente #663 com Production OFF;
  verificar deployment público, depois obter partidas reais SP e MP com dois
  perfis autenticados diferentes, retry e casos sem bônus antes de ligar as
  duas flags e validar domínio público novamente. Home redesenhada segue fora.
