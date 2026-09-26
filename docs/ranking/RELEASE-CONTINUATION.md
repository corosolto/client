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
