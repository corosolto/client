# Comunidade: operação e rollout

Entrega na branch `feat/social-community`, com client e backend em repositórios separados. Esta documentação descreve a configuração; não autoriza merge, migrations remotas ou publicação.

## Configuração

| Ambiente | Variável | Uso |
|---|---|---|
| API | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth e persistência no projeto existente; service role somente no servidor |
| API | `SOCIAL_SESSION_KEY` | Segredo aleatório com pelo menos 32 caracteres, cifra credenciais de sessão/PKCE; rotação encerra sessões antigas |
| API | `SOCIAL_SITE_URL` | Origem canônica `https://www.corosolto.com.br`, sem path |
| API | `SOCIAL_ALLOWED_ORIGINS` | Origens adicionais exatas, separadas por vírgula, apenas se realmente utilizadas; sem wildcard |
| API produção | `SOCIAL_EMAIL_LOGIN` | `true` somente após configurar e testar SMTP próprio no Supabase; padrão de produção é desligado |
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

Google, Twitter/X, Facebook, LinkedIn OIDC, Discord e GitHub só aparecem quando Supabase Auth `/settings` confirma o provedor habilitado. Configurar as aplicações OAuth reais no provedor e Supabase Auth: callback do provedor aponta para o `/auth/v1/callback` do Supabase; a lista de redirects da aplicação deve admitir `/auth/callback` no domínio canônico, inclusive a query `state` gerada pelo fluxo. LinkedIn usa `linkedin_oidc`; X utiliza o identificador habilitado pelo Auth (`twitter` ou `x`). Links de Instagram/TikTok/X continuam apenas links de perfil.

PKCE, estado e verifier são de uso único, expiram em uma hora e ficam no servidor. O callback cria cookie HttpOnly, SameSite=Lax, Secure em HTTPS; credenciais cifradas persistem até expiração/logout. Refresh revalida o usuário no Auth. O adaptador HTTP e o proxy Astro preservam separadamente o cookie de sessão e a limpeza do cookie de login.

Login e criação por email usam link de confirmação Supabase, com PKCE no mesmo navegador; não exigem inventar uma senha. A tela oferece continuar como convidado, estado de envio/erro e recuperação de link expirado. Newsletter é escolha separada, inicialmente desmarcada: login por email confirma a escolha no callback; login OAuth apenas registra intenção pendente até confirmação adicional por email. Cancelar pendência ou retirar consentimento remove o email da lista de newsletter. Confirmações antigas não desfazem a retirada. Email de autenticação permanece privado no Auth; a API retorna apenas o estado da preferência. Rate limit durável limita pedidos por email a três por hora, além do limite de requisições/IP e do próprio Auth. Nenhuma campanha foi enviada.

O contato informado `ccorosolto@gmail.com` foi incluído na página de privacidade. Ter esse endereço não configura um aplicativo Google OAuth nem o transporte SMTP. Segredos de apps e credenciais SMTP devem ser cadastrados diretamente nos serviços, nunca enviados em chat, PR ou arquivos versionados.

O vínculo de convidado exige UID e token previamente registrados, lock e unicidade da conta. Preserva o perfil/histórico e rotaciona a prova antiga; aliases conservam resultados verificados. Token de convidado antigo não pode tomar o nick. Credencial expirada tem recuperação explícita sem vincular progresso não comprovado. Progresso offline legado permanece no navegador/banco legado e não é promovido a estatística competitiva.

## Banco e ordem de rollout

No backend, aplicar sequencialmente as migrations `040_social_community.sql`, `041_social_verified_game.sql`, `042_social_state.sql`, `043_social_private_avatars.sql`, `044_social_moderation.sql`, `045_social_ranking_filters.sql`, `046_account_newsletter.sql` e `047_social_login_entry.sql` sobre o schema existente. Fazer preflight dos vínculos `auth_user` duplicados antes da 040; resolver conflitos com prova de identidade, sem sobrescrever contas. Novas relações/RPCs exigem service role. Anon/authenticated não escrevem estatísticas, vínculos, presença, consentimento ou moderação.

Auditoria remota autorizada em 2026-10-10, projeto existente `csbrasil`: nenhum OAuth habilitado e nenhum SMTP próprio configurado. Site URL corrigida de localhost para `https://www.corosolto.com.br`; redirects exatos dos dois domínios do jogo para `/auth/callback**`. Migration046 aplicada remotamente: tabela/RPC privados e aditivos, sem alteração de jogadores. Migrations040–045 e047 continuam pendentes no alvo, assim como API/nós/client; nenhuma publicação ou merge ocorreu. A046 é independente da040 e pode existir antes do rollout social. Snapshot privado anterior de Auth fica fora do Git, com permissão0600.

Ativação real: criar primeiro o aplicativo Google no console do provedor, usar o callback fornecido pelo Supabase, cadastrar client ID/secret em Authentication → Providers; testar consentimento/callback com duas contas. Repetir por provedor adicional somente quando app e permissões estiverem disponíveis. Para email, configurar SMTP próprio em Authentication → Emails com domínio/remetente verificados e testar entrega externa antes de ligar `SOCIAL_EMAIL_LOGIN`. O serviço padrão do Supabase tem restrições e não foi aceito como transporte de produção.

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

`dismissed` arquiva denúncia sem ocultar perfil. `hide` revoga sessões/presença e cancela convites; restore é reversível. Nova sessão e cada leitura de sessão também recusam conta oculta pelo auth_user canônico, inclusive após re-login. Decisões são auditadas. O CLI recusa arquivo de saída existente/symlink e cria arquivo 0600; não versionar a fila. Não há endpoint de moderação público. Atribuir operador e prazo de triagem é pendência operacional.

## Roadmap

Posts/comentários/reactions: schema com autor autenticado, visibilidade, bloqueio, limites, edição/remoção e fila de conteúdo antes de UI. Clãs: ownership/membership/convites concorrentes, transferência segura e moderação. Chat social: retenção, autorização por conversa, bloqueio, rate limits e denúncia antes de transporte realtime. Lobby: reserva de vagas, ready-check e encerramento coordenado. Não há botões vazios para essas funcionalidades.

## Validação reproduzível

Backend: `npm run portao`, `npm run test:api`, `node test/social-stats-contract.mjs`. Com Auth/Postgres/API/nó locais configurados: `node --env-file=.env.social-local test/social-integration.mjs` e `node --env-file=.env.social-local test/social-gameplay.mjs`. Entrada por email: `node --env-file=.env.social-local test/social-email-integration.mjs`, com Astro4391, Mailpit54324 e callbacks para localhost4391 configurados no Auth local. Testes de integração recusam destino Supabase remoto; aguardar flush do nó antes de limpar jogadores com rounds pendentes.

Client: `npm run build`, `npm run check:deploy` e `node tools/eval/social-entry-contract.mjs`. O contrato marca OAuth real como UNKNOWN enquanto apps estiverem ausentes; não converter em PASS. Usar duas origens locais independentes para cookies (`localhost:4391` e `127.0.0.1:4391`) apenas no ambiente de teste, permitindo ambas na configuração local. A prova real de socket não substitui aceite visual de gameplay ou login externo em navegador. A comunidade abre dentro do menu3D; acesso manual pela pausa mantém a instância e a sala e oferece voltar à partida. Não abre modal social automaticamente durante combate.
