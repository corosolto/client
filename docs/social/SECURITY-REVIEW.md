# Revisão independente final — social-community

Data: 2026-10-10. Revisão somente de fontes/diffs e provas locais próprias; nenhum CONTINUATION, ledger, relatório do builder ou resultado de validação alheio foi lido. Nenhuma fonte foi alterada, nenhum serviço compartilhado foi reiniciado por este revisor e nenhuma ação remota foi executada.

Snapshot revisto: client `feat/social-community`, HEAD `057ae8cb658bb916db00986e60d39fb8a88d0d20`; backend `feat/social-community`, HEAD `64e56f3be251cbf70c3388a50a9a02f3fe9873f3`, incluindo alterações atuais em 041, mp-metrics e RoundTracker e fontes novas 044/CLI. Os commits backend 326f5b8/67f3c3e e diffs seguintes também integraram a revisão. Implementação permaneceu ativa durante a revisão; novos diffs posteriores exigem nova leitura.

## Resultado

No snapshot inicial desta revisão, nenhum achado P0/P1/P2 permanecia aberto após as correções verificadas abaixo. O recheck de novos diffs ao final deste arquivo identificou e encerrou um P2 adicional de outcomes; no último snapshot não permanece achado P0/P1/P2 aberto. As conclusões são locais e restritas ao snapshot, não uma aprovação de publicação, OAuth em provedor real ou gameplay visual.

## Achados concretos corrigidos e rechecks

1. **P1 — presença legada revelava identidade de perfil privado.** Backend `db/migrations/040_social_community.sql:207`, client rota mapa. Reprodução original em transação: perfil privado com presença e cidade era legível como anon nas relações `presence`/`online_now`; a rota mapa também lia os nomes via service role. Correção revista: revoke explícito de ambas as relações para public/anon/authenticated, mapa sem leituras de nomes/cidade ou cache identificável. Recheck de grants retornou falso para anon; leituras identificáveis removidas da fonte. Não basta apenas esconder a UI.

2. **P2 — atividade privada vazava favoritos e horários de conquistas.** Backend `db/migrations/041_social_verified_game.sql:122`, `:127`, `:131`. Reprodução original: `social_profile(null, private_activity_player)` retornava maps/personagens/facções e timestamps, embora history fosse oculto. Recheck em SQL com rollback: history e favorites vazios; timestamps condicionados a owner ou amigo autorizado e chaves de conquista permanecem visíveis conforme contrato. Fonte confirma as três condições.

3. **P1 — OAuth bloqueado por credencial guest antiga após vinculação.** Client `public/js/community.js:47-50`, backend `api/social-auth.ts:59-62`, binding em 040. Reprodução original: bind rotaciona token do convidado; novo `/register` com token antigo falha, impedindo iniciar OAuth depois de expirar a sessão. Client atual chama `start` diretamente e oferece botão explícito `ENTRAR SEM VINCULAR O CONVIDADO` para `guest_invalid`, sem descartar o progresso local nem vincular silenciosamente identidade não comprovada. Fonte revista. Callback com provedor externo continua pendente nesta revisão.

4. **P2 — avatar enviado não aparecia na badge.** Client `src/pages/api/badge/[...path].png.ts:26-34`. Reprodução original: avatar enviado é URL relativa `/api/social-avatar?id=...`, recusada pelo fetch de URL externa, logo badge usava fallback. Correção só baixa objeto privado `${id}.png` quando a URL relativa corresponde exatamente ao próprio id consultado. Prova real em SSR 4391/API 8091: upload magenta 128×128, avatar 200/no-store e pixel magenta no PNG de badge. Após tornar profile private: avatar anônimo 404, badge 404, avatar com cookie do dono 200. Uploads e contas locais de teste foram removidos.

5. **P2 — fila de moderação mantinha permissão pública de arquivo preexistente.** Backend `scripts/moderate-social.mjs:10`. Reprodução original com CLI real: arquivo preexistente 0644 continuava 0644 apesar de `writeFile(...,{mode:0o600})`. Correção `flag:'wx'` recusa arquivo existente/symlink e criação nova permanece 0600. CLI real revalidada: EEXIST no arquivo preexistente e modo 600 no novo. Arquivos de prova removidos.

6. **P1 — participante inexistente podia abortar lote verificado inteiro.** Backend `db/migrations/041_social_verified_game.sql:80`. Durante testes locais, fechamento de sockets seguido de limpeza imediata deixou rounds pendentes do nó com IDs já removidos; a atribuição de player_id violava FK. A limpeza inicial deste revisor interferiu no serviço local compartilhado; o recheck de avatar evitou sockets. Guard atual ignora PID inexistente. Prova SQL própria, em rollback: primeiro participante desconhecido e segundo válido no mesmo lote; RPC retorna changed=1, válido recebe verified=true/kills=3 e desconhecido não recebe crédito. Nenhuma fixture persistiu.

## Provas adversariais próprias

- `/tmp/corosolto-social-avatar-final.mjs`: fluxo local real auth/password → sessão → onboarding → upload → avatar e badge renderizada → troca de privacidade → negações 404/owner 200. Também filtro inválido 400 e escrita de métricas/presença sem assinatura 401. Sem sockets nesta prova final.
- `/tmp/corosolto-social-final-sql.sql`: transação rollback com jogador canônico e guest aliased. Pontos all=80/week=10/month=50/ctf=40, incluindo bônus somente dos dados verificados. Dois intervalos iguais de uma hora, em identidades aliased, dão 3600 segundos; escalares forged 9999 não aumentam o total. Moderação hide torna hidden=true, apaga sessão, report fica reviewed e uma auditoria é criada.
- `/tmp/corosolto-social-tracker-adversarial.mjs`: RoundTracker real com relógio/slots controlados. Movimento com input aceito conta atividade; deriva sem input novo para de contar após janela de 30s. Kill base/headshot verificados nos casos solo, guest, duas abas da mesma conta e humanos distintos autenticados. Bônus respectivamente 0/0/0/1.
- `/tmp/corosolto-social-missing-player-repro.sql`: lote com participante desconhecido não aborta crédito do válido, rollback.
- Checks locais do próprio revisor: `game/round-telemetry-check.mjs` 23/23 e mp-ticket-check passaram. Privilégios anon/auth negados para escrita de rounds verificados, bind de conta, ranking RPC novo e moderação; bucket avatars privado, sem políticas públicas.
- Fonte revista: pares de amizade/block/invite serializados por advisory lock de UUIDs; block cancela convite e remove amizade/notificações; respostas de convite tomam row lock e validam destinatário, expiração, estado e amizade. API revalida estado real da sala. Nenhuma corrida explorável foi demonstrada. Não executei uma campanha nova de stress concorrente em múltiplas conexões nesta etapa.
- Solo real foi criado e dois tickets autenticados tentaram entrar: capacidade 1 e segundo jogador recebeu room_full. Não repetir essa prova sem aguardar flush/estabilização do nó antes de limpar jogadores.

## Limites e gates restantes

- Não percorri OAuth/callback com Google/Discord/GitHub reais nem navegador com redirect do provedor, PKCE e cookies de produção. Fallback guest stale está correto na fonte; a experiência completa exige provedor configurado e conta de teste autorizada.
- Não realizei partida humana em navegador até abate nesta revisão. Provas de identidade/bonus/AFK são do tracker real com fixtures, e solo foi testado por socket para capacidade. Não equivalem a aprovação visual ou evidência de partida publicada.
- Bootstrap local tem dependência legada `presence_anon` ausente no schema versionado. Fonte atual de mp-metrics grava rounds/verified antes do enriquecimento legado e mantém erro/retry explícito; não certifiquei deploy fresco ou compatibilidade completa de ingestão legada em produção.
- Nenhum migration/deploy remoto executado, nem grants/caches/provider/env de produção auditados. Aplicação remota das migrations, configuração de SSR, versão do nó e migração de contratos precisam de gates próprios antes da ativação.
- O 500 anterior da badge foi falha de transformação dev da fonte concatenada, não negação por avatar. Importação `?raw` foi revista e render real passou depois que o SSR recebeu configuração local. Font bytes originais não foram alterados.

## Recheck de novos diffs — agregação de rodadas e senha

Snapshot posterior, mesmos HEADs, novos working-tree diffs em `api/social-auth.ts`, 041/042 e `src/pages/sala/[codigo].astro`.

- Prova própria `/tmp/corosolto-social-password-production.mjs`: handlers reais importados em subprocesso, NODE_ENV=production e SOCIAL_PASSWORD_LOGIN=true. GET providers anuncia password=false; POST password retorna session_expired sem chamar `/token?grant_type=password` (fetch observado). Não houve mudança de env ou restart no servidor compartilhado.
- `/tmp/corosolto-social-round-aggregation.sql` passou em rollback: conta com duas abas e guest aliased na mesma rodada gera histórico/feed único, kills=10/deaths=6, active_seconds=5400 pela união de intervalos sobrepostos apesar de scalars9999, 3 rodadas/vitórias totais após mais duas rodadas distintas. Privacidade private revoga history/feed. Favorites ordena por rounds distintos: mapa com2 rodadas vem antes de mapa com1 rodada e3 sessões.
- Sala solo: fonte apresenta texto de um humano contra bots e não renderiza pinos por lado; senha usa `sala.senha`, não a flag private. Sem revisão visual adicional de navegador nesta etapa.

**P2 adicional identificado e corrigido no novo snapshot:** `db/migrations/041_social_verified_game.sql:39-40` conta uma mesma rodada canônica em wins e losses quando abas/alias da mesma conta participam de lados opostos. Histórico/feed escolhem resultado único via max(result), mas totais usam filtros independentes. Mutante/repro `/tmp/corosolto-social-round-outcome.sql`: trocar result do guest aliased para loss no round em que a conta é win produz rounds=3,wins=3,losses=1, enquanto histórico do mesmo round mostra win. Assim wins+losses excede rounds. Sugestão: agregar primeiro um resultado canônico por conta/round, usando a mesma precedência documentada de histórico/feed, e só então contar outcomes. Corrigido pela CTE round_outcomes agrupada canonical_id/round_id com max(result), mesma precedência do histórico/feed. Recheck real do mesmo mutante: rounds=3,wins=3,losses=0 e histórico win. A variante /tmp/corosolto-social-round-outcome-recheck.sql acrescenta uma assertion explícita desse resultado e usa rollback.

Badge adicional: fonte trocou SEQUÊNCIA/lados legados não instrumentados por RODADAS e DADOS VERIFICADOS, e label de wins por RODADAS GANHAS. player_points inclui rounds. Repeti avatar/badge real no SSR4391 após esse diff: PNG com avatar correto, privacidade revogada404, owner200; fixtures removidas e nenhum socket criado.
