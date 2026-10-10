# Comunidade: operação e rollout

Entrega na branch `feat/social-community`, com client e backend em repositórios separados. Esta documentação descreve a configuração; não autoriza merge, migrations remotas ou publicação.

## Configuração

| Ambiente | Variável | Uso |
|---|---|---|
| API | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth e persistência no projeto existente; service role somente no servidor |
| API | `SOCIAL_SESSION_KEY` | Segredo aleatório com pelo menos 32 caracteres, cifra credenciais de sessão/PKCE; rotação encerra sessões antigas |
| API | `SOCIAL_SITE_URL` | Origem canônica `https://www.corosolto.com.br`, sem path |
| API | `SOCIAL_ALLOWED_ORIGINS` | Origens adicionais exatas, separadas por vírgula, apenas se realmente utilizadas; sem wildcard |
| API e nó | `MP_TICKET_SECRET` | Segredo existente compartilhado; tickets assinados pelo servidor vinculado à conta |
| API e nó | `MP_METRICS_TOKEN` | Segredo existente para rounds e presença vindos do nó |
| API | `RANKING_ON` | `false` até passar o gate coordenado de ranking; `true` permite leitura |
| Astro | `PUBLIC_API_BASE` | URL da API existente |
| Astro SSR | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Badge/sitemap: projeções públicas; nunca prefixar a chave com `PUBLIC_` |
| Astro | `RANKING_ON` | Mesmo gate usado pela API/home |
| Nó | `MP_TICKET_REQUIRED`, `MP_METRICS_URL` | Exigir ticket e enviar telemetria à API atualizada |
| Local somente | `SOCIAL_LOCAL_GAME_URL`, `SOCIAL_PASSWORD_LOGIN` | Nó isolado e login de testes; password fica indisponível em `NODE_ENV=production` |

Não colocar valores secretos em PRs, logs, capturas ou arquivos versionados. `.env.social-local` é ignorado e deve usar permissão 0600. A configuração do nó também precisa do token de métricas existente e das configurações atuais de combate.

## OAuth

Google, Discord e GitHub só aparecem quando Supabase Auth `/settings` confirma o provedor habilitado. Configurar as aplicações OAuth reais no provedor e Supabase Auth: callback do provedor aponta para o `/auth/v1/callback` do Supabase; a lista de redirects da aplicação deve admitir `/auth/callback` no domínio canônico, inclusive a query `state` gerada pelo fluxo. Verificar as regras de redirect do projeto antes de habilitar. Nenhuma credencial de provedor foi inventada nem produção modificada.

PKCE, estado e verifier são de uso único, expiram em dez minutos e ficam no servidor. O callback cria cookie HttpOnly, SameSite=Lax, Secure em HTTPS; credenciais cifradas persistem até expiração/logout. Refresh revalida o usuário no Auth. Os links Instagram/TikTok/X são apenas links de perfil.

O vínculo de convidado exige UID e token previamente registrados, lock e unicidade da conta. Preserva o perfil/histórico e rotaciona a prova antiga; aliases conservam resultados verificados. Token de convidado antigo não pode tomar o nick. Credencial expirada tem recuperação explícita sem vincular progresso não comprovado. Progresso offline legado permanece no navegador/banco legado e não é promovido a estatística competitiva.

## Banco e ordem de rollout

No backend, aplicar sequencialmente as migrations `040_social_community.sql`, `041_social_verified_game.sql`, `042_social_state.sql`, `043_social_private_avatars.sql`, `044_social_moderation.sql` e `045_social_ranking_filters.sql` sobre o schema existente. Fazer preflight dos vínculos `auth_user` duplicados antes da 040; resolver conflitos com prova de identidade, sem sobrescrever contas. Novas relações/RPCs exigem service role. Anon/authenticated não escrevem estatísticas, vínculos, presença ou moderação.

043 torna o bucket avatars privado e revoga políticas públicas antigas. Atualizar URLs públicas para o endpoint autorizado; testar também cache/CDN de avatars anteriormente públicos antes de afirmar revogação completa. Perfis privados/ocultos não têm fallback de consulta pública em perfil, badge, sitemap ou mapa.

Ordem após autorização: banco → API → nós com telemetria verificada e tickets → client. Manter ranking desligado até confirmar duas contas humanas distintas na mesma rodada, solo verificável sem bônus, ingestão idempotente, horas sem menu/AFK, privacy/RLS e partidas reais no navegador. Versões antigas do nó não podem promover dados não verificados. Rollback do client/API não reabre grants públicos; rollback do gate desliga ranking e preserva os dados.

O bootstrap local identificou dependência legada `presence_anon` fora das migrations versionadas. Rounds verificados são persistidos antes desse enriquecimento; falhas legadas continuam retornando erro e retry idempotente. Reconciliar o schema operacional real e validar os dois caminhos antes do rollout, sem criar tabelas fictícias para silenciar erro.

## Estatísticas e sala

Pontos: kills verificadas + bônus limitado às kills elegíveis. Só o nó concede bônus quando há dois IDs de contas autenticadas distintos em slots humanos; solo, bots, convidados, espectadores e duas abas da mesma conta não o habilitam. SP verificável utiliza sala solo do mesmo servidor, com um humano e bots; offline fica preservado, sem crédito competitivo forjado pelo navegador.

Tempo soma união dos intervalos de atividade no servidor, inclusive aliases e abas: exige personagem vivo, gameplay e input aceito recente. Menu/espectador/inatividade não contam. Partidas são IDs de match distintos; vitórias/derrotas apresentadas são de rodadas. Resultado final de match e sequência máxima ainda não têm instrumentação confiável e não são apresentados como estatísticas completas. Histórico incompleto é identificado como tal. Favoritos e feed seguem visibilidade de atividade.

Convites exigem amizade, presença recente assinada, sala existente sem senha, vagas e destinatário correto. Expiram; aceite reconsulta o nó e abre a rota `/sala/REGIAO-CODIGO` existente. Ainda não há lobby pré-partida com ready-check/reserva atômica: uma vaga pode ser ocupada entre aceite e conexão, e o jogo trata `room_full`. Solo não recebe convites de amigos.

## Moderação

Denúncias persistem em `player_report`, com limite durável. Bloqueios cancelam amizades, pedidos, convites e notificações relacionadas. Operadores usam o CLI do backend no ambiente confiável já autorizado, com service role apenas ali:

```sh
node --env-file=/caminho/privado/moderacao.env scripts/moderate-social.mjs list --out=/caminho/privado/fila-nova.json
node --env-file=/caminho/privado/moderacao.env scripts/moderate-social.mjs reviewed --report=UUID --operator=LABEL --note="Motivo da decisão"
node --env-file=/caminho/privado/moderacao.env scripts/moderate-social.mjs hide --target=UUID --operator=LABEL --note="Motivo da decisão"
node --env-file=/caminho/privado/moderacao.env scripts/moderate-social.mjs restore --target=UUID --operator=LABEL --note="Motivo da decisão"
```

`dismissed` arquiva denúncia sem ocultar perfil. `hide` revoga sessões/presença e cancela convites; restore é reversível. Decisões são auditadas. O CLI recusa arquivo de saída existente/symlink e cria arquivo 0600; não versionar a fila. Não há endpoint de moderação público. Atribuir operador e prazo de triagem é pendência operacional.

## Roadmap

Posts/comentários/reactions: schema com autor autenticado, visibilidade, bloqueio, limites, edição/remoção e fila de conteúdo antes de UI. Clãs: ownership/membership/convites concorrentes, transferência segura e moderação. Chat social: retenção, autorização por conversa, bloqueio, rate limits e denúncia antes de transporte realtime. Lobby: reserva de vagas, ready-check e encerramento coordenado. Não há botões vazios para essas funcionalidades.

## Validação reproduzível

Backend: `npm run portao`, `npm run test:api`, `node test/social-stats-contract.mjs`. Com Auth/Postgres/API/nó locais configurados: `node --env-file=.env.social-local test/social-integration.mjs` e `node --env-file=.env.social-local test/social-gameplay.mjs`. Testes de integração recusam destino Supabase remoto; aguardar flush do nó antes de limpar jogadores com rounds pendentes.

Client: `npm run build` e `npm run check:deploy`. Usar duas origens locais independentes para cookies (`localhost:4391` e `127.0.0.1:4391`) apenas no ambiente de teste, permitindo ambas na configuração local. A prova real de socket não substitui aceite visual de gameplay ou login externo em navegador.
