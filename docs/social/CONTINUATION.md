# Continuação — comunidade CORO SOLTO

Implementar a primeira entrega social utilizável do CORO SOLTO: conta segura preservando convidados, perfis/estatísticas confiáveis, amizade/presença, convites para sala real, ranking consistente, notificações/feed, privacidade/bloqueio/denúncia. DoD: interface/backend/banco integrados, provas com contas independentes, revisão independente, configuração/roadmap/capturas e PRs revisáveis; sem merge/deploy público sem autorização.

## Isolamento e checkpoints
Client worktree social-community, branch feat/social-community, base6277618. Commits26680a9b6 (ledger), b5c6b777b (proxy/projeções), 057ae8cb6 (UI). Backend worktree exclusiva em csbrasil-backend/worktrees/social-community, base d52ff5f; commits d2d904b/326f5b8/67f3c3e/376f956/64e56f3. Primary e produção do trailer não alterados. Client checkpoint7721187fa; backend checkpointb77fa10 e a63f478 (guard de moderação). PRs draft: corosolto/client#807 (fork rubenmarcus/client) e corosolto/backend#70.

## Validação atual (2026-10-10)
- Supabase Auth/Postgres/Storage reais locais isolados (API54321/DB54322), API8091, nó8791, Astro4391. Segredos somente env ignorado0600; nenhum banco público alterado.
- 31 checks reais API/DB: três contas, sessão/expiração/logout, onboarding/vínculo guest concorrente, amizade cruzada, IDOR, bloqueio, privacidade, presença, convite real para mesma sala, replay/expiração, upload privado, filtros e moderação auditável/reversível.
- Gameplay socket real: duas contas + segunda aba de A, sala H6UEAMVM/piscina_treta. A: +1 match, +2 kills, +3 deaths, +4 pontos, +72s ativos; B: +1 match/+72s. 45s input +45s AFK; dados declarados pelo navegador ignorados; ranking/perfil concordam. Snapshot completo não versionado artifacts/social-gameplay.json no backend. Contagem de rounds foi depois corrigida por SQL independente para uma rodada/conta, inclusive aliases.
- Contrato RoundTracker e três mutantes (AFK, conta duplicada, solo) verdes. SQL transacional social-aggregation.sql prova aliases+abas/histórico/feed, 5400s union e outcome único, sem scalar9999; rollback.
- Backend npm run portao e npm run test:api completos passaram. Smoke API real10 checks; signaling6 checks em /ws. Client build e check:deploy47/47 passaram. As réguas antigas foram atualizadas ao RPC/projeções verificados mantendo mutantes RED.
- Revisão independente clean-context: SECURITY-REVIEW.md, sem P0/P1/P2 aberto no snapshot final; bugs de projeção, avatar, guest stale, arquivo0644, participante apagado e outcomes duplicados corrigidos/retestados.
- Browser duas sessões (localhost/127) com Auth real: perfil/busca/amizade/aceite/ranking e refresh persistente. Capturas desktop reais em client/artifacts/social, fora do Git. Controle Chrome passou a falhar com timeout; mobile e entrada pelo botão até combate NÃO certificados. Possível override temporário de viewport não pôde ser resetado pela capability indisponível.

## Limites e pendências de release
OAuth Google/Discord/GitHub externos ainda depende de aplicações/segredos e configuração real do Supabase; local não habilita provedor fictício. Password somente desenvolvimento, bloqueado em production. Nenhum OAuth externo, deploy, merge ou migration remota autorizado/executado. Operação/rollout e roadmap em client/docs/social/OPERACAO.md.
Bootstrap local carece da relação legada presence_anon não versionada; ingestão salva rounds verificados antes do enriquecimento e preserva erro/retry, mas schema operacional de produção exige reconciliação. Ranking público permanece gate default off; ativação exige rollout coordenado e prova de humanos autenticados/solo no ambiente alvo. Vitórias/derrotas são rodadas; match final/streak máximo não instrumentados. Offline legado preservado, sem promover kills/horas não confiáveis. Não há lobby ready-check/reserva; entrada real usa salas atuais e room_full.
Posts/comentários/reactions/clãs/chat social não implementados: roadmap sem botões vazios. Triagem de denúncias funciona via CLI confiável; falta designar operador/prazo.

## Próximo passo concreto
PRs draft abertos: https://github.com/corosolto/client/pull/807 e https://github.com/corosolto/backend/pull/70. Nenhum auto-merge habilitado. Preview-build pulou por draft; Vercel marcou FAILURE no fork sem publicação. CI ordinário ainda em andamento. Após autorização específica, configurar OAuth/infra e validar browser mobile + convite/combate humano no alvo; não confundir checks locais com aprovação visual/produção. Manter estas worktrees exclusivas e os serviços locais para continuação; não tocar primary/trailer/outras lanes.

## Recheck de moderação
Revisor reproduziu re-login de conta hidden com settings ainda permitidos; corrigido server-side em newSession/readSession por auth_user/hidden e correspondência canônica. Nova sessão hidden recebe403 sem cookie; sessão sobrevivente perde autorização401. Regressão real passou (31checks); mensagem de moderação na UI. Restore preserva conta; não concede sessão antiga.

## Direção aceita — entrada e UI do jogo (2026-10-10)
O usuário autorizou alterações no Supabase existente do Coro Solto, sem autorizar merge/deploy público. Entregar login por provedores realmente ativos (Google, Twitter/X, Facebook, LinkedIn quando configurados), criação/entrada por email verificado, modal inicial quando sem nickname preservando convidado e lembrete colapsável de foto/redes. Newsletter exige escolha opcional separada e email confirmado, com retirada da preferência; nenhum envio de campanha autorizado. O usuário rejeitou o visual externo de /comunidade: montar os fluxos sociais dentro do menu 3D e sua navegação, preservando o combate. URLs públicas devem continuar estáveis e abrir o painel correto. Próximo passo: baseline independente, auditoria Auth remota sem revelar credenciais, fatia entrada/email/consentimento e integração visual, validação real e nova revisão independente.

## Checkpoint da entrada no jogo — 2026-10-10
Supersede limites antigos sobre ausência de autorização Supabase: alteração remota autorizada executou Site URL/redirects do jogo e migration046 privada/aditiva. Ver OPERACAO.md; nenhum merge/deploy, app OAuth ou SMTP configurado. Usuário confirmou ausência de apps e informou contato `ccorosolto@gmail.com`. Migrations040–045 e047 não aplicadas no alvo remoto.

Implementado: comunidade dentro da home3D e redirecionamento das URLs compartilháveis; módulo comum de conta, modal inicial só no menu, guest preservado, onboarding/logout/expiração; email PKCE com criação real e cookies separados; newsletter opcional confirmada/retirada, cancelamento pendente imediato, lembrete colapsável de foto/redes e página privacidade. Provedores Google/X/Facebook/LinkedIn/Discord/GitHub exibidos somente quando Auth real habilitar. Pausa abre amigos no mesmo DOM/instância/sala, com retorno e navegação interna protegida.

Provas: build passou; backend test:api passou, 31checks API/DB/nó reais reexecutados; novo test/social-email-integration.mjs 14checks reais SMTP→Auth→Astro→sessão, CSRF, replay, IDOR consentimento, opt-out tardio, RLS e limite durável. Contrato independente 18PASS/0RED/1UNKNOWN OAuth externo; mutantes disabled-provider, stale-auth-dialog e quit-social-resume RED. Pausa existente6/6 passou. Revisão independente backend/docs/social/ENTRY-SECURITY-REVIEW.md sem P0/P1/P2 aberto no recorte. Primeiro check:deploy44/47 exigiu regenerar ARCH/docs; não enfraquecer os checks.

Capturei e olhei desktop real `artifacts/social/community-game-ui.png`: menu do jogo, fundo3D escuro, logo/nav existente, verde-lima, sidebar compacta e estatísticas reais. Captura não significa aprovação humana; browser game/pausa/mobile em curso, OAuth real e entregabilidade SMTP produção não certificados. Gate de privacidade remoto da046 em verificação. Próximo: terminar captura/aceite possível, docs geradas/checks, checkpoint, atualizar PR807/70 sem merge/deploy. Infra local continua isolada4391/API8091/nó8791/Supabase54321/Mailpit54324, env ignorado0600.

## Defeito observado antes do ajuste — retrato mobile
Chrome nativo, emulação iPhone14ProMax430×932: após fechar o modal de entrada, `#rotate-prompt` cobre o painel comunidade aberto. Baseline visual reproduzido e olhado em `artifacts/social/mobile-community-430x932.png`; não é falha de Auth ou conteúdo ausente (AX mostra o painel e formulário). A regra global portrait/coarse em public/style.css não distingue combate de comunidade. Régua independente em preparação; não remover o aviso durante combate nem ocultar dados para simular aceitação. Próximo: medir RED, restringir exceção ao menu social visível, recapturar e revisar.

## Prova final local de entrada e jogo — 2026-10-10
Checkpoints client9870eb39c e83f32fff4; backend5247f1c. Node23 (`PATH=/opt/homebrew/bin:$PATH`) completou check:deploy47/47, build, ARCH/docs e autoria. Um push com Node16 do PATH padrão foi recusado pelo hook; não houve bypass. Reexecutar push com Node23 após este checkpoint.

Chrome nativo com sessões independentes localhost/127: ReiDaTreta abriu AMIGOS E CONVITES pela pausa, enviou convite da sala BR-FUNK; DonaResenha abriu a notificação, aceitou, entrou pela rota existente e chegou ao HUD de combate. GET8791/rooms confirmou dois jogadores na mesma sala/piscina_treta. ReiDaTreta usou VOLTAR À PARTIDA e chegou ao HUD na mesma sessão, sem sair pelo menu social. Capturas locais fora do Git: community-paused-invite.png, second-account-live-room.png, resumed-live-room.png. Isso fecha a entrada funcional pelo navegador local; não certifica OAuth externo, rede pública ou aprovação visual humana.

Mobile: modal inicial sem nickname visto no Chrome emulado430×932; opção de newsletter desmarcada e convidado presentes. Baseline do bloqueio por orientação preservado em mobile-community-before.png. Exceção CSS restrita à comunidade no menu visível: C02 RED antes, PASS depois; mutantes portrait-no-guard e portrait-broad-guard RED. Capturei e olhei mobile-community-430x932.png depois: logo/nav do jogo, painel social empilhado, formulário e convidado acessíveis; mobile-play-orientation.png confirma aviso preservado na aba Jogar. Não é teste em aparelho físico; combate mobile com menu.hidden tem guarda testada por estados, sem captura própria. Override temporário desligado (DevTools Value0) e janela incógnita de teste fechada.

Revisão independente adicional confirmou escopo/especificidade do CSS. Contrato final19PASS/0RED/1UNKNOWN (OAuth sem apps). RLS remoto046 confirmado: habilitado, sem SELECT anon/authenticated ou execução anon do RPC. Supabase remoto continua sem apps/SMTP; apenas046 e redirects foram alterados, sem rollout040–045/047 ou publicação. Operação/roadmap e relatórios de revisão preservam todas as pendências do objetivo original.

Próximo: enviar checkpoint/PRs draft807/70; configurar apps OAuth e SMTP com credenciais cadastradas diretamente nos serviços, reconciliar schema legado, depois realizar rollout e gate no ambiente alvo somente com autorização específica de merge/deploy. Manter branch feat/social-community e worktrees exclusivas; primary/trailer não tocados.

## Retomada para reconciliação — 2026-10-11
Preflight: client1463e130e/backend9c88c25, ambas feat/social-community e limpas; PR807 draft conflitante, PR70 draft mergeável. Main client261cf59a7 (alpha.67), base comum62776184e; main backendd52ff5f já é ancestral de9c88c25. Simulação merge-tree produziu conflitos apenas em blocos gerados de AGENTS/README/docs e ARCH. main.js/index.astro combinaram automaticamente; revisar ladoOnline e filtro de proveniência junto aos contratos sociais antes de aceitar.

Escopo desta retomada: incorporar main somente na worktree social, regenerar documentos a partir do candidato, revalidar Auth/convidado/consentimento/pausa/ranking e portões do par, revisão adversarial independente, checkpoints e PRs draft atualizados. Não incorporar patches ainda ativos de loadMenuBackdrop ou onboarding; preservar ownership das outras lanes. Browser reservado à frente de dados; esta etapa usa fontes/HTTP/testes sem browser. Nenhuma nova migration ou operação remota, publicação, merge de PR ou newsletter. Gates de infraestrutura já documentados continuam pendentes.

## Reconciliação e validação intermediária
Merge recuperável0d9fc34d6, pais dec03a7e6/261cf59a7. Nove conflitos gerados resolvidos sem substituir prosa; npm run docs/arch derivaram o candidato, checks PASS. Fonte de game/version/netcodec/netgame permanece idêntica a main. Independente RECONCILIATION-REVIEW-2026-10-11.md: nenhum P0/P1/P2 no merge; 17 mutantes rejeitados, contratos entrada19PASS/0RED/1UNKNOWN, pausa6/6, ranking11/11, netcode210/0 e HTTP9PASS. Apps OAuth seguem UNKNOWN. Backend9c88c25 não precisou incorporar commits adicionais de main.

Banco/API/SMTP reais locais recuperados: social31/31, email14/14, test:api, stats+três mutantes e portão backend completo PASS nesta rodada. Gameplay inicialmente RED por configuração do nó: sem destino de métricas, depois flush1s esgotando limite durável6/600s; corrigir somente o processo/fixture local, sem reduzir proteção. Preflight backend registra a causa e intervalo limitado de ensaio; reexecução em andamento. Corrigida no runbook a referência para db/migrations/043_social_avatar.sql e CLIENT_DIR absoluto.

Check:fast completo174/186 em327,5s. Falhas: mapid, audio:check, grafite, eval:grafite/ar/editorial, audiofablocal, audiovoicemix, grafitelayout, backendhints, lajes-identidade, mansao. Três réguas antigas tentaram headless em8123 e não navegaram (servidor ausente); isso não é uso/aceite do IAB, reservado agora à mídia, e não será repetido enquanto reservado. Sem certificar mapas/assets a partir desse portão. Pickup_check.json gerado só mudou timestamp, restaurado; não é mudança da entrega.

Defeito próprio detectado pelo portão: privacidade.astro nomeava o provedor de infra contra a regra pública existente. Baseline backend-hints RED no arquivo, texto mínimo ajustado para explicar os métodos de entrada ao jogador; depois PASS e mutante inject RED. Não alterou consentimento, opções reais ou permissões. Demais falhas do portão amplo permanecem abertas; não atribuir175/186 como nova execução completa. Próximo: revisão do delta textual, terminar gameplay, checkpoint e hooks/PRs draft. Build antes desse delta PASS; hook final fará nova validação.

## Aceite técnico do candidato reconciliado — 2026-10-11
Checkpoint34edf6558 conserva o merge0d9fc34d6 e a revisão independente, incluindo adendo do texto de privacidade (baseline anterior RED e inject RED em provas próprias do crítico). Build final após a frase, docs e ARCH passaram. Gameplay real reexecutado terminou exit0: duas contas/três sockets na mesma sala, combate/tempo ativo/bônus limitados e perfil/ranking concordantes; artefato privado backend/artifacts/social-gameplay.json. Falha de configuração anterior mantida no log separado, sem regra de servidor afrouxada. Nó próprio deve voltar ao flush padrão300s após o ensaio curto, sem mais limpeza de buckets.

Par de código validado: client34edf6558/backend9c88c25; backend não alterou produto nesta rodada. Portão backend completo exit0, social31/email14 reais, stats/mutantes e revisão independentes registradas. Check:fast amplo permanece174/186 nessa execução, com backendhints resolvida por ensaio específico e onze outras falhas abertas. Browser atual reservado à mídia; capturas10/10 não certificam11/10. Nenhuma migração/remoto/publicação nesta retomada. Próximo: push com hook obrigatório, conferir PR807 mergeável/draft e PR70 pareado/draft, conservar gates de rollout descritos no preflight.

## ID público e cartão compartilhável — 2026-10-11
Novo pedido: jogador escolhe ID único e og:image com último personagem e estatísticas. Base limpa client e024d7a06/backend8d44d1a. Nickname e identidade Auth preservados; ID ASCII normalizado case-insensitive, escolhido uma vez, URLs UUID antigas continuam válidas. Último personagem depende de dados verificados, exclui espectador e requer opção explícita para cartão público; padrão privado. SSR e PNG consultam projeção anônima existente, no-store, sem cookies/avatares externos. Reutilizar retratos locais do catálogo e fonte/renderer da badge, empacotados no build. Baseline real de claim RED (0 vencedores); migration048 somente banco isolado. Browser reservado à mídia; validar PNG renderizado e HTTP agora, não certificar navegação visual nova sem slot. Próximo: concluir testes reais, mutantes, revisão independente, checkpoints e atualização dos PRs draft. Sem merge/deploy/remoto nesta extensão.

### Correções verificadas da extensão
Crítico identificou decoder WebP sem retrato, catálogo de site desatualizado/hífens excluídos e aba espectadora alterando seleção por last_seen_at. Corrigidos com PNG build-time, catálogo atual real+frames existentes e novo lastPlayedAt autoritativo de slot vivo/live; legado sem timestamp fica sem personagem presumido. SQL transacional PASS; tracker e5mutantes PASS; renderer63/63 com103659 pixels de retrato/5805 de nick e imagem aberta/olhada; grade e Canarinho legíveis. Entry22PASS/0RED/1UNKNOWN no harness, inclui3novos fluxos de ID/opt-in/cópia. VMbudget20s só ensaio sobload254–329, produto continua com timeouts originais. Repetições Auth em host saturado retornaram503/504; primeira rodada9/9 real permanece evidência e não implica nova passagem após instrumentação. Build inicial PASS em15m57s antes de delta de fonte/catálogo/timestamp, precisa final. Próximo: teste real final, mutantes, revisão registrada, build/hook e PRs.

### Integração final do ID e cartão
Checkpoints de recuperação: retratos clientc57627b23; API/migration/tracker backend349dc9f. Integração final10/10 PASS em Supabase/Auth/Postgres/API/Astro reais locais, log backend/artifacts/handle-final.log: disputa case-insensitive, dono imutável/IDOR, sessão, projeção anônima, SSR/PNG, opt-in persistido, timestamps verificados e privacidade/RLS. Bootstrap usa o fluxo de sessão real já existente, evitando uma segunda autenticação por senha redundante; teste email14/14 do marco anterior continua a prova específica desse login. Sem afrouxar timeout de produto. Processo de diagnóstico de Auth encerrado e API8091 voltou ao comando normal.

Olhei backend/artifacts/profile-card-local.png, gerado pela rota HTTP: Canarinho à direita, nickname/ID e estatísticas legíveis;8pontos/8kills/4deaths/KD2 correspondem aos fixtures verificados do banco. Horas0 porque fixture não declara gameplay ativo. Não é captura de partida. Retratos reaproveitam mídia versionada do jogo; grade client/artifacts/social/portrait-contact-sheet.png e proveniência public/img/social-chars/FONTE.md. Nenhum arquivo de vídeo/trailer alterado. Revisão independente PROFILE-SHARE-REVIEW-2026-10-11.md sem P0/P1/P2 confirmado restante; replay dos dois RPCs fechado localmente, contrato legado remoto permanece gate.

Portão backend encontrou timeout em recovering+recovery sob carga extrema; reexecução específica8/8 passou com o mesmo limite. Build/check:deploy/portão completos finais ainda em execução neste checkpoint. Próximo: concluir os gates, registrar resultado e SHAs, enviar commits com hooks e atualizar PRs draft807/70. Migration048 somente local; gates de OAuth/SMTP/migrations anteriores e publicação permanecem explícitos em OPERACAO.md.

### Build e contagens derivadas
Client2cc1a6eeb/backend9767704 conservam produto/integração. Build final exit0,6m55s, artifacts/social/handle-build-final.log; rota empacotada com binário nativo Darwin local, Linux/Vercel ainda não certificado. Check:deploy detectou DOCS1 após arquivos novos passarem a git ls-files; npm run docs regenerou seis arquivos e docs:check PASS. Encerrei somente essa execução já RED para evitar duplicá-la com o hook obrigatório do envio, sem pular portões. Segundo portão backend foi até security-smoke e expirou no boot30s; diagnóstico independente do processo confirmou boot saudável depois da janela, HTTP200 e sem erro de código. Processo diagnóstico próprio encerrado; nova execução completa em andamento sem alteração do limite.

CI remoto no head anterior e024: pr-fast/pr-gates/smoke-web SUCCESS, ui-regression REGRESSAO por novo404 de /api/social-auth em todas as telas (backend remoto ainda sem rollout social); portao-browser falhou ao aguardar URL404. Não são provas de sucesso desta extensão. Logs ignorados ci-ui-job-e024.log/ci-browser-e024.log; preview Vercel continua sem autorização do fork. Não ocultar nova falha de rede na régua. Próximo: hook completo, envio de ambos PRs draft e registro final dos gates; nenhum deploy para forçar CI verde.

### Réguas finais e revisão adversarial
Hook do envio detectou API1: nova rota profile-card fora do recorte declarado. Registrei a decisão no FICAM executável: OG do perfil no domínio do site, consulta anônima via API existente, sem exceção para banco. Normal PASS e sete mutantes RED, inclusive import Supabase na rota nova. Crítico encontrou preview-direto sobrevivente preexistente: telemetry sempre same-origin ocultava base errada. Prova agora inclui map-plays e o mutante fica RED. Encerrei somente o envio próprio já reprovado antes do fim, sem enviar objetos ou pular portões; o próximo envio executa o hook completo corrigido.

Backend ranking-check antigo não executava import/await do novo SSR. Baseline RED, executor atualizado para helper/proxy/frontmatter reais e #731 fora do top500; contratos de identidade/kill/bônus preservados. Crítico encontrou retirada do link/script sobrevivente; régua passa a verificar bindings e executar location.replace real. Normal11/11, quinze mutantes oficiais+dois próprios rejeitados pelo crítico. Relatório independente backend/docs/social/RANKING-SHARE-REVIEW-2026-10-11.md sem P0/P1/P2 aberto nesses recortes. Nenhum produto ou timeout alterado por essas correções.

Último portão geral backend artifacts/handle-portao-post-ranking.log exit1: security-smoke e convite passam; convite-limite não inicia o nó dentro de30s. Host estava sob carga alta, mas o crítico não certifica a causa desse ensaio. Resultado permanece RED; não atribuir os gates completos do marco anterior a este head. Build e10/10 integração desta extensão são PASS. Próximo: checkpoint, hook corrigido completo, atualizar PRs draft807/70 e repetir portão geral em ambiente disponível; rollout remoto, browser atual e infraestrutura permanecem gates.


## Triagem CI do checkpoint enviado — 2026-10-11
Pedido recebido da coordenação: “PR807 mesmohead0de819c42651b929fbcc10bdfdb68725d979cab1 terminouCI com FAILUREportao/smoke/classify/Vercel”. Objetivo social completo preservado; esta retomada corrige apenas causa comprovada na mesma lane. HEAD/branch/status limpos verificados antes de editar; backendf49da0b não alterado. Registro aqui respeita a exclusão explícita de outros checkouts, inclusive progress/KNOWN-BUGS.md.

Logs ci-portao-0de819c42.log/ci-smoke-0de819c42.log/ci-ui-0de819c42.log em artifacts/social. Import Community.astro não resolvido no parser do eval:serve é causa própria comprovada, reproduzida por HTTP404 antes de consertar (ci-serve-baseline.log). Parser substituído pelo renderer Astro real, assets public continuam raw, shell de personagem preservado e dependências Vite encaminhadas; HTTP200/componentes Community+AccountEntry/hash/importmap/definevars/assets/shell/404 verdadeiro PASS, três mutantes RED. Sem mocks de Auth ou remoção de componentes para esconder o erro. Régua nova ligada ao check:deploy.

BOOT0 B7 tentou SINGLE PLAYER sob dialog account-entry aberto. Prova executável do trecho real B7 reproduziu RED antes; jornada agora escolhe botão CONTINUAR COMO CONVIDADO e espera fechamento antes do menu, sem force e preservando alvo legado. PASS e mutante sem-convidado RED; novo teste ligado ao check:deploy. Sem nova execução de browser local, reservado à frente de mídia; a execução CI futura continua necessária para certificar jornada real deste head.

Crítico independente triou smoke: timeout global900000ms já havia iniciado After Hooks/fechamento quando assert de chat-nao-lidas em614 executou por25,3ms e recebeu undefined. Não há prova de defeito do badge; chat/test/config idênticos ao baselinee024 e merge0d9fc34. Causa da lentidão não certificada; manter smoke RED, sem aumentar limites ou modificar produto. Trace198206269bytes SHA256fedb5510c82135998e6f665a30631b5efbfe52bfc0a174fbac351eb3036b0e53 em artifacts/social/ci-smoke-evidence-0de819c42/trace.zip.

UI-regression sete telas novo404local/api/social-auth, também presente no marcoe024: proxy aponta backend remoto sem rollout social. Mantém gate de integração remota, sem excluir404/régua ou deploy para forçar verde. Vercel exige autorização do fork. Demais falhas independentes do portão (seleção/mapa) não fechadas por HTTP200. Portão geral backend RED em convite-limite continua separado. Próximo: revisão adversarial final da correção, checks/hook recuperável, checkpoint e PRdraft; depois reavaliar CI do novo head e infraestrutura, sem merge/deploy.


Revisão final CI-TRIAGE-REVIEW-2026-10-11.md aceita o recorte sem P0/P1/P2 restante. Crítico encontrou e root corrigiu duas falhas iniciais: snapshot isVisible não cobria hydrate tardio e listener de exit registrado tarde travava cleanup em startup inválido. B7 agora espera onclick, abre pelo trigger programático real (não certifica acionabilidade visual desse botão), escolhe guest por clique e espera hidden; modelo early/late/legacy e três mutantes de negócio. HTTP normal real final inclui localhost/loopback, Community+AccountEntry e provas adicionais Vite/env/bytes de assets/API404 explícito; três mutantes RED. Scripts ligados somente a check:deploy. Syntax/diff PASS. Docs derivadas regeneradas. Nenhuma alteração de produto, backend, dados MP ou limiares. Próximo: checkpoint assinado, hook completo e atualização PRdraft; CI remoto futuro permanece pendente.


### Hook bloqueado e cache real corrigido
Checkpoint e49962cce criado, mas envio recusado integralmente: hook check:deploy encontrou SB7; não houve bypass ou atualização do head remoto0de. Log artifacts/social/ci-triage-push.log preservado. Além do contrato antigo da régua preso ao parser, a prova HTTP ampliada numa fixture isolada reproduziu perda real de cache após edição: mesmo processo renderizava account-entry comf34077554ce6 em vez da revisão748e22eb933e. Baseline ci-cache-baseline.log RED antes do conserto.

Serve passa a recalcular manifesto por request e reiniciar somente renderer Astro quando os bytes mudam, com override explícito __MANIFESTO_JS__ e refresh coalescido. A fixture copia src/public-js/config/package; assets e dependências somente leitura por symlinks; cache Vite em .astro/eval-vite próprio. Nenhum asset vivo/checkout alheio alterado. Prova real compara inventário publicado exato, hashes de todos módulos/main/Community, novos bytes do vao fixture e duas respostas concorrentes iguais. Normal PASS; SB7 delegado à prova HTTP real preserva SB1–6 e cinco mutantes antigos de cache, adicionando mutante de manifesto congelado. Execução da prova ocorre via SB7 em check:deploy, eliminando duplicação do passo standalone. Syntax/diff PASS; revisão adversarial do novo recorte em curso. Próximo: registrar parecer/mutantes, checkpoint suplementar e repetir hook completo; manter smoke/UI/infra/back-end gates abertos.


Adendo independente de cache aceito: normalHTTP/SB1–7 PASS, cinco mutantes de cache antigos e novo cache-serve-constante rejeitados por SB7; inventário exato/entrypoints/rawbytes/duas raízes concorrentes conferidos. Sem P0/P1/P2 aberto no recorte ampliado. Fixture cria parent artifacts/social em checkout fresco antes de mkdtemp; cache privado e cleanup preservam isolamento. Browser aberto durante refresh, HMR, edição simultânea durante resposta e CI remoto não certificados. Próximo: checkpoint suplementar e envio com hook completo, sem repetir provas verdes alheias ou mudar limites.

## OG com personagem estilizado de altura inteira — 2026-10-11

Pedido do dono: usar o personagem estilizado gerado pelo OpenRouter, maior e ocupando a altura inteira; idealmente uma versão por personagem. Objetivo social integral e isolamento mantidos. Retomada verificou client limpo em c219a4cb1 e backend limpo f49da0b, ambos feat/social-community. O fechamento anterior está em artifacts/social/PROFILE-SHARE-DELIVERY.md: hook final PASS138s e PRdraft807 no headc219; nenhum merge/deploy. Coordenação informou portão/smoke remoto concluídos sem falha no headc219; classify mantém404 social-auth remoto e Vercel exige autorização. Não é aceite público.

Inventário local confirmou 63/63 IDs do roster com arte vertical RGBA1024×1536 em public/img/resultado/<id>-vitoria.webp; fontes do próprio jogo, associadas por ID. Não usar sprites192px GLB nem chamar assets imagegen da lane marketing de OpenRouter. Pipeline histórico tools/gen-pose.mjs encaminha para tools/gen-image.mjs/OpenRouter, com preservação de identidade; modelo/recibo por arquivo não são retrospectivamente presumidos. Originais e lanes de produção/trailer permanecem somente leitura; nenhuma imagem nova foi gerada; uma tentativa foi recusada por402, sem recarga.

A régua estendida reprovou antes do produto: og-stylized-baseline.log acusa seleção de retrato pequeno em vez de arte vertical. Candidato usa a arte correspondente, retira apenas margem transparente por trim threshold1 e codifica PNG com altura630 no build. Todos os originais possuem alpha e o maior aspecto após trim é0,733, cabendo na coluna550×614 sem esticar/cortar corpo. OG mantém1200×630, estatísticas reais, anonimização/privacidade e opt-in; personagem tem altura do cartão entre as faixas8px existentes. Dados ficam em duas colunas à esquerda, sem janela em volta da arte. Nick longo reduz fonte, mas a revisão mediu transbordo da largura nominal com24W. Próximo: render final/63 imagens, mutantes, rota real, inspeção visual e crítico independente; build/checks/checkpoint e PRdraft, sem deploy.


### Validação final da composição e limite do acervo

Galeria final63/63 em artifacts/social/og-stylized/cards e gallery-1/2/3.png, aberta e examinada. Fontes/pixels por ID conferidos. Canarinho renderizado72764pixels, y8..621, sem corte; quatro outros IDs têm última linha alterada y619 e pés íntegros nas imagens examinadas, sem presumir63 rasterizados até y621. Nova cláusula mede o quadro efetivamente emitido nos63 SVGs550×614, preservando proporção; inclui mutante de redução apenas dos outros personagens. Arte de todo o roster ainda NÃO possui acabamento uniforme: políticos/míticos usam renders e Sindicato/Punk têm procedência individual incerta. PROFILE-PORTRAITS.md corrige essa distinção.

Integração real Auth/Postgres/API/Astro10/10 PASS, log og-stylized-real-route.log; captura nova artifacts/profile-card-local.png examinada. Fixture verificada8kills/4deaths/0horas, não uma nova partida humana. Perfil privado/sem opt-in não expõe personagem; refresh/IDOR/handle concorrente e campos de estatística forjados cobertos. Build final PASS e SEO6/6 PASS em og-stylized-build.log/og-stylized-seo-final.log. Não houve alteração de produto após esses checks, somente extensão da régua/docs/plano.

Revisão independente OG-STYLIZED-REVIEW-2026-10-11.md aprova composição/seleção/privacidade local, sem P0/P1. P2: versões de acabamento equivalente ainda pendentes; P3: nickname extremo excede coluna nominal, sem colidir com Canarinho observado. A cobertura de geometria só Canarinho foi estendida após o parecer; adendo independente conferiu63quadros e rejeitou mutante que mantémCanarinho e reduz os demais a365. Browser novo reservado à lane mídia; Linux/Vercel/produção não certificados.

Consulta de créditos OpenRouter retornou saldo~US$0,239; tentativa Barbudo pelo gerador existente recusada402 mínimoUS$1. Nenhuma imagem ou recarga; log local sanitizado sem ID privado de conta. tools/prepare-profile-art.mjs prepara63jobs/62candidatos com IDs/hashes/referências/prompt/modelo futuro explícito, sem chave/API. --raw-only escreve /tmp: plano orienta arquivar master+hash+recibo sanitizado no volume antes de revisar/promover. Próximo: concluir normal/mutante e adendo crítico, docs derivadas/checks, checkpoint assinado, hook completo e atualizar PRdraft807. Após saldo disponível, gerar/revisar62candidatos sem substituir originais automaticamente. Sem merge, deploy, newsletter ou migration remota.

Normal final PASS63/63 e mutante other-character-small RED365!==614 (og-stylized-contract-final.log/og-stylized-other-small.log). Adendo crítico og-review-frame-coverage próprio confirma guardado contrato/63 SVGs; coberturaP3 fechada paraframe, raster59+4sem relaxar. Plano executado/verificado63jobs62candidates; docs derivadas6arquivos e docs:check PASS; syntax/diff e gitleaks staged PASS. Checkpoint seguinte inclui14arquivos próprios, sem assets bulk/segredos/trailer; envio deve executar hook completo.

## Páginas legais candidatas — 2026-10-12

Lane isolada codex/ranking-launch-20261012, base2f13a18. /privacidade revisada e
/termos criada, layout compartilhado e links no rodapé. HTTP Astro real200 para
ambas, navegação entre documentos e visual mobile sem overflow; build/SEO PASS.
Revisão adversarial editorial fechou bases, telemetria pseudônima, destinatários,
DPAs, expiração distinta de exclusão e caricaturas. Não é liberação jurídica ou
operacional: identidade/contato do titular, escolha ou exceção de analítica,
retenção/exclusão executáveis, proteção de menores e contratos/regiões efetivos
continuam gates. Sem deploy/merge nem aceite obrigatório inserido no login.
Continuação integral e evidências no ledger privado growth-readiness; próximo:
confirmar responsável e fechar gates antes de publicar URLs e testar OAuth real.


### Checkpoint e envio recusado pelo gate real

Checkpoint assinado83937415acf9162fd521c1813a083d8bb9fe5e15,14arquivos próprios/271adições/23remoções, árvore limpa. Primeiro envio foi recusado pelo hook: mapcontrato passa; check:deploy48/49 em257s, SB7 RED social-serve servidor não respondeu exitnull durante inicialização. Log completo preservado og-stylized-deploy-first.log e og-stylized-push.log. Nenhum objeto/head remoto atualizado e nenhum bypass.

A mesma prova social-serve standalone, mesmoHEAD e mesmos60s, passou integralmente depois: og-stylized-serve-baseline.log. Não há causa de lentidão certificada; não alterar timeout/compressão/produto a partir dessa hipótese. Build/SEO/10testes/63fontes/revisão não foram invalidados por código novo. Próximo: repetir hook completo em checkpoint suplementar de continuidade, registrar resultado, atualizar PRdraft807 e fechamento persistente em artifacts/social/PROFILE-SHARE-DELIVERY.md. Uniformização62artes continua bloqueada porHTTP402; backendf49/PR70 e gates deinfra permanecem intactos.

### Documentos legais no novo design — 2026-10-12

Pedido posterior corrige o marco anterior: LegalPage agora usa identidade/CSS real
do hub, sem Layout antigo; ambas as rotas mantidas. Links no footer desktop e aba
Sobre (também mobile). Browser8137: páginas200, nav e leitura ao fim, texto
selecionável;390px sem overflow. Revisão independente fechou P2 de foco do CTA
com borda interna3px e Tab real confirmado. Capturas/review no ledger privado.
Contato Gmail mantido até encaminhamento desejado ser ativado e verificado.
Alias preparado no Cloudflare, sem ativação ou envio; confirmação de acesso
pendente. Gates legais e de publicação anteriores continuam; nenhum deploy/merge.

### Contato oficial recebido e ajuste editorial — 2026-10-12

Titular confirmou ativação Cloudflare. Alias fale@corosolto.com.br -> Gmail do
projeto salvo Active, destino verificado por email, catch-all Disabled. DNS
apex3MX+SPF conferidos, MX Resend send.auth preservado. Teste único chegou ao
Gmail: inicialmente Spam, marcado legítimo e movido para Inbox. Prova de entrega
não garante classificação de todos os remetentes futuros. Contact legal.ts agora
fale@corosolto.com.br. Tag CORO SOLTO / DOCUMENTOS removida por pedido do titular,
inclusive CSS sem uso. Ambas rotas locais conferidas; sem publicação/deploy.
Evidências e continuidade integral no ledger privado growth-readiness.

### Entrada, vínculo de contas e escolhas opcionais — 2026-10-13

Candidato em codex/ranking-launch-20261012, base15d269851; preserva corte integral
ranking + Email/Google/Discord/X/LinkedIn + newsletter antes da campanha. Modal
antigo alto/estreito rejeitado pelo titular. Novo modal920px com login e escolhas
em2colunas; Google, Discord, X e LinkedIn sempre visíveis, disabled com EM
CONFIGURAÇÃO quando Auth não anuncia disponibilidade. Mobile390×844:352px, uma
coluna, scroll acessível e nenhum overflow horizontal. Capturas examinadas em
private-assets/growth-readiness/ranking-20261012/account-entry-{two-columns,mobile,mobile-choices}-20261013.jpg
na raiz agregada; é revisão local, não aceite visual do titular nem publicação.

Conta existente usa ação link, não substitui sessão por ação start. Backend
pareado prende PKCE a conta, sessão e provider; migration051 aplicada somente no
Docker local. Newsletter opt-in separado, desmarcado, confirmação posterior;
cookies opcionais separados, default deny. Escolha local guarda só permissão
daquele navegador; retirada limpa diagnósticos/atribuição e memória, cessa FPS
pendente e sincroniza entre abas. Identidade/progresso essenciais preservados.
Runtime no manifesto recursivo de módulos; sem trackers Vercel incondicionais.
Preferências disponíveis também no perfil/wizard/configurações.

Validação: entrada25PASS/0RED/1UNKNOWN, email real local17/17, ops77/77, privacy
ops5/5 + escolhaPASS; quatro mutantes de coleta/retirada RED, vínculo backend
PASS e dois mutantes RED. Build, SEO6/6 e grafo módulos PASS. Revisão independente
auth-preferences-review-20261013.md fecha doisP2 e adendo comprova cache e storage
event; nenhum novoP0/P1/P2 confirmado. Não certifica efeito externo GoTrue antes
do callback, SMTP de produção, apps OAuth reais, migrations remotas ou deploy.
docs:check e gitleaks staged PASS. Nova régua eval:privacy incluída no check:fast, sem rerodar suite ampla já RED
por baseline independente preservada neste ledger de lançamento.

Titular autorizou ativação nesta sessão: Allow manual linking salvoON e relido
no Supabase. Quatro providers aindaDISABLED; EmailENABLED. Discord clientID do
formulário sofreu preenchimento inválido; nada disso salvo. Titular não possui
Client Secret: painel OAuth2/Reset Secret e Supabase deixados abertos para
geração, entrada e salvamento pelo titular, conforme política do navegador.
Google também sem configuração válida certificada; autofill não é credencial
OAuth verificada. Não copiar secretos no chat/repos nem habilitar com autofill.

Próximo: titular salva credenciais OAuth; testar login e vínculo com contas
reais, inclusive identidade já pertencente a outra conta, logout/troca de sessão
e efeito em Auth.identities. Conferir SMTP, migrations049/050/051 e envs em
ambiente autorizado antes de publicação. Ranking semanal Brasília, histórico
preservado e MP2× humano continuam requisitos; campanha/loja/mapas permanecem
abertos no ledger growth-readiness. Nenhum merge, push, deploy ou envio externo.


## Marco 13/10 — provedores habilitados e central local

Titular concluiu as credenciais: leitura real de Authentication → Providers
confirmou Email, Google, Discord, X OAuth2 e LinkedIn OIDC Enabled. Facebook e
GitHub ficam adiados para esta entrega. Enabled certifica configuração, não
login/vínculo no jogo. Google Externo/Testando, branding/publicação e URLs legais
públicas seguem gates até prova atual no alvo; não transportar segredos.

Central dentro do hub: Missões, Avisos e Mensagens. Missões usam handle da conta,
amizade aceita, Auth.identities e conquistas persistidas; pedidos pendentes,
links de perfis e contadores históricos não comprovam conclusão. Nenhuma
recompensa TRETa$, verificação de follow ou moeda foi ligada. Central é base
para futuras quests; regras/pagamentos são outra entrega.

DM inicial somente entre amigos (preferência opcional ainda sem resposta), botão
no perfil/lista de amigos apenas quando feature ativa, texto até1000 caracteres,
conversas persistentes/paginadas, inbox/unread, IDs exatos de leitura, bloqueio e
denúncia pela moderação existente. Migration052 privada com RLS/ACL service_role,
ator derivado da sessão, locks compartilhados com amizade/bloqueio, retry
idempotente por sender/client_id; SOCIAL_MESSAGES defaultOFF. Aplicada apenas no
Docker local54322 e API8197 com flagON; nenhuma migration remota/deploy.

Botões do hub/conta/comunidade ganharam relevo de borda/sombra e estado pressionado;
hover preserva relevo. Privacidade explica dados das DMs, duas contas participantes,
moderação, leitura explícita e que bloquear não apaga histórico. Não há E2EE.

Régua independente: quests baseline0/12 RED e schema sem tabelas/RPC; candidato
client23/23 PASS,19 mutantes RED; backend Auth/API/Postgres reais21/21 PASS,
2 mutantes SQL RED e restauração com hashes idênticos. Critic clean-context
reproduziu e fechou3 falhas: DOM privado na troca de conta, rascunho durante envio
com rerender e401 antigo invalidando nova conta. Probe independentePASS +3mutantes
RED; nenhum P0/P1/P2 confirmado aberto no recorte. Build final PASS, grafo módulos,
docs/ARCH em dia, SEO/AEO6/6. Não reabrir suite ampla jáRED por baseline registrada.

Evidências privadas na raiz agregada private-assets/growth-readiness/ranking-20261012:
community-inbox-race-final.log, community-inbox-mutant-*.log,
social-messages-contract-restored.log, social-messages-mutant-*.log,
community-inbox-independent-review-20261013.md e critic-repro/logs adjacentes.
Browser local DonaResenha→ReiDaTreta (fixtures existentes): enviou uma mensagem de
ensaio e viu texto/preview após reload. Capturas desktop examinadas:
community-quests-desktop-20261013.jpg e community-messages-desktop-20261013.jpg.
Isso não prova OAuth externo nem combate humano. Segunda aba não autenticada,
sem prova visual de receptor. Emulação390×844 não aplicada (DOM1466×690), override
resetado; viewport-unverified é desktop, NÃO prova mobile. Controle do navegador
retornou Not allowed na última tentativa. Mobile/teclado real continuamUNKNOWN.

Lanes exclusivas codex/ranking-launch-20261012, bases clientc1b83e046/backendd21ed09;
progress codex/growth-readiness-20261012 base782fdc1. Primary/outras lanes preservadas.
Nenhum push, merge, publicação, email, post ou pagamento externo neste marco.

Próximo: prova mobile/teclado; login/vínculo externo com contas independentes,
identidade já pertencente a outra conta, SMTP próprio e confirmação/retirada real;
reconciliar schema/migrations040–045/047/049/050/051/052 conforme preflight antes
de qualquer rollout autorizado. Decidir operador/retenção das DMs (incluindo
pedido de eliminação) sem inventar prazo, auditar acesso service_role, canário no
alvo antes de flagON. Ranking geral+semanal Brasília/segunda00, preservar histórico,
remover fraude comprovada somente, MP2× humano confirmado continuam requisitos.
Campanha, shop/TRETa$/Pix/Portugal, mapas/chat e automação de distribuição permanecem
no roadmap integral; configuração verde não encerra a liberação da campanha.


### Marco 13/10 — Selo de conta verificada (somente local)

Objetivo aceito: selo quando e-mail confirmado + pelo menos uma identidade
OAuth da mesma conta. Banco Auth calcula em cada consulta, sem flag editável,
sem confiar em links/bio/browser/metadados. Público recebe só booleano; perfil,
ranking/home e conta usam a mesma projeção. Remoção/retirada de confirmação
retira selo na próxima consulta. Conta nova já recebe o selo no onboarding.
Consentimentos opcionais não são requisito e não há recompensa TRETa$.

053 cria helper+RPC em lotes100, somente service_role, sem alterar SQL/pontos
do ranking. Aplicada somente ao Docker isolado; nenhuma migração remota.
Descoberta:049 NÃO estava persistida no local. Fonte de player_points é
autoritativa040/048; tentativa de049 foi recusada pela guarda de congelamento/
provenance e fez ROLLBACK. Não falsificar legacy037 nem desativar guarda.
O contrato atual de8 argumentos da comunidade continua503 por essa pendência;
não chamar o runtime inteiro verde. Projeção do ranking SQL de7 argumentos
atual + decorador novo e homeleaderboard reais passaram sem mudar métricas.

Régua independente: client baseline6PASS/3RED; final10/10 e3 mutantes RED.
SQL27 casos + lotes/ACL PASS;4 mutantes SQL clonados pg_temp RED/rollback.
Auth/API/DB final10PASS/1RED (somente ranking8arg herdado); email-only, conta
diferente, revogação e conta escondida PASS. Primeiro onboarding PASS.
Regressões: inbox23/23; entrada25PASS/0RED/1UNKNOWN login externo.
Crítica clean-context fechou P2 do selo ausente após onboarding; probePASS e
mutanteRED. Build final, módulos/imports e test:api PASS. Docs/ARCH atualizados.

Artefatos privados em csbrasil/private-assets/growth-readiness/ranking-20261012:
account-verified-{client,backend}-final-20261013.log, SQL/mutantes e
account-verified-independent-review-20261013.md. Capturas reais examinadas:
account-verified-profile-desktop-20261013.png (selo azul junto ao nick) e
account-verified-revoked-desktop-20261013.png (mesmo perfil sem último vínculo,
selo ausente). Fixture isolada ContaSeloTest removida com IDs exatos após prova;
fixtures existentes preservadas. Isso não prova OAuth externo ou mobile.

Bases deste marco: client9f9628220/backendc79aa53/progressaa13005 nas mesmas
lanes codex/ranking-launch-20261012 e codex/growth-readiness-20261012. Primary e
outras lanes preservadas. Sem push, merge, deploy, post/newsletter/pagamento.

Próximo: resolver cutover049 respeitando fonte autoritativa atual; manter
Confirm Email ligado e validar SMTP/entrega/confirmar/remover com usuário real.
Validar OAuth/vínculo externo (inclusive identidade de outra conta), mobile/
teclado e reconciliar migrations alvo antes de publicar API/client/053.
Central/DM requer052, flagOFF até rollout e operador/retenção definidos.
Objetivo completo permanece ranking geral/semanal Brasília, histórico preservado/
só fraude comprovada removida, MP2× humanos distintos confirmados, cinco logins
escolhidos e newsletter pronta antes da campanha. Loja/skins/TRETa$/Pix com
atividade Portugal, futuro Brasil2027, mapas/chat e divulgação/automação seguem
no roadmap integral. Selo verifica acesso à conta, não identidade civil, apoio
oficial nem integridade das partidas.


### Marco 13/10 — Perfil público e último personagem (candidato local)

Pedido implementado: /u/<handle> público agora permanece página legível sem
carregar arena; preserva nick/selo/bio/avatar/redes/estatísticas e CTA ao jogo.
Último personagem tem retrato vertical/nome no perfil público e na comunidade.
Botão ABRIR PERFIL PÚBLICO navega realmente para página externa à arena; demais
links /u internos mantêm a navegação antiga da comunidade.

Nenhuma visibilidade/opt-in de conta existente alterada. Perfil já defaultpublic
na040; share_character continua opcional/desligado por padrão. Label e política
agora dizem perfil público + cartão. Fonte048 last_played_at de rodada
verificada/não espectador permanece soberana; menu/localStorage/replay antigo
não escolhem personagem. Sem personagem conhecido/autorização, mantém perfil
sem retrato inventado. Privado/friends: SSR404/noindex e PNG404/no-store, sem
vazamento de nick/stats/OG/personagem; entrada autenticada no jogo preservada.

Catálogo leve63/63 derivado do roster real por scripts/profile-character-catalog.mjs
e --check, sem importar Three.js/personagens pesados. CardPNG legado recebeu
guarda hasOwn para unknown constructor/__proto__ não inventar nome.

Régua prévia: HTTP real2RED; independente baseline2PASS/5RED. Final9/9 incluindo
SQL localrollback e HTTP/PNG reais, sharingoff/unknown/null/private/friends.
3 mutantes RED (invent-character/arbitrary-asset/share-omitted); último em
clonepg_temp e rollback, nenhuma função viva alterada. Regressões inbox23/23,
selo10/10, entrada25PASS/0RED/1UNKNOWN OAuth local; card63/63 e fonte/PNG PASS.
Crítico independente fechou P2 link interceptado e P3 propriedade herdada do
card; probe4PASS e3mutantesRED. Build final/grafo/docscheck/SEO6/6 PASS.

Capturas reais examinadas na raiz private-assets/growth-readiness/ranking-20261012:
public-profile-character-desktop-20261013.png,
community-profile-character-desktop-20261013.png e
public-profile-character-optout-desktop-20261013.png. Retrato inteiro/nome do
Canarinho legíveis; após opt-out mesmo nick/stats, sem personagem. Browser
confirmou CTA jogo→/u e página permanece SSR. Fixture PersonagemTest exclusiva
foi removida após prova com IDs exatos; não é evidência de partida humana.
Logs profile-character-* e public-profile-character-*; parecer
public-profile-character-independent-review-20261013.md. Mobile aindaUNKNOWN.

Bases: clientc5cb99089/backend9943835/progress9556cf8; mesmas lanes isoladas
codex/ranking-launch-20261012 e codex/growth-readiness-20261012. Sem mudança de
backend/nó/migração neste marco;048/053 local não implicam rollout no alvo.
Sem push/merge/deploy/posts/email/pagamento; primary/outras lanes preservadas.

Próximo continua resolver cutover049/provenance autoritativa, SMTP/Confirm EmailON
e OAuth/vínculo reais, mobile/teclado, migrations040–053 no alvo e publicação
legal/ranking antes da campanha. Central/DM precisa operador/retenção/flag/052.
Ranking geral+semanal Brasília/segunda00, só fraude comprovada removida, MP2×
humanos distintos confirmados, cinco logins+newsletter; shop/TRETa$/Pix/Portugal,
mapas/chat e redes/automação permanecem no objetivo completo.


### Marco 13/10 — Hierarquia do perfil e pacote de e-mails

Label A TURMA DA TRETA removida da comunidade e do perfil público. Ranking geral
agora tem destaque próprio; demais métricas em faixa sem cartões, tanto SSR
quanto perfil interno. Valores/provenance/privacidade/personagem preservados.
Baseline privado3RED antes do produto; crítico independente runtime/privacidade
PASS e mutantesRED. Regressões profile-character9/9, inbox23/23; build e grafo
com mutantePASS. Inventários regenerados por npm run docs.
Capturas examinadas: public-profile-hierarchy-20261013.png,
community-profile-hierarchy-20261013.png e community-profile-metrics-20261013.png.
SSR computed rank88px/statsflex, interno72px/flex; nenhuma régua de gameplay
alterada. Astro servido com CSS antigo após HMR foi reiniciado na mesma lane,
PID75655→38418/8137/.env.local; API8197 mantida. Mobile do perfil segueUNKNOWN.
Templates e instruções de ativação vivem no backend emails/README.md.
Checagem HTTP pública atual em social-public-readiness-20261013.json: domínio
oficial /api/social-auth?action=providers, /privacidade e /termos ainda404.
Isso não é prontidão de produção. Providers5Enabled são evidência no ledger,
OAuth externo/vínculo real não comprovados. SMTP real/entrega segue pendente.
049 continua ausente e ranking8arg503: resolver fonte040/048 autoritativa sem
fingir legacy037 ou desativar freeze guard; depois rollout coordenado e provas.

Artefatos privados: csbrasil/private-assets/growth-readiness/ranking-20261012.
Parecer social-launch-current-review-20261013.md e probe independente associado.
Bases antes deste marco: clientba7aac3ad/backend9943835/progress794db07;
lane client/backend codex/ranking-launch-20261012, progress growth-readiness.
Nenhum push/merge/deploy/envio/post/pagamento ou alteração em primary/outras lanes.
Objetivo integral preservado: ranking geral/semanal Brasília/segunda00, histórico
mantido e só fraude comprovada removida, MP2× com humanos distintos confirmados;
Email/Google/Discord/X/LinkedIn, newsletter, social persistente, chat, loja/
TRETa$/Pix/Portugal→Brasil2027, mapas e campanha/automação de redes.


### Marco 13/10 — patentes de carreira e arte dos e-mails

Pedido aceito: distintivos Soldado→General e logo oficial + personagens gerados
com GPT nos templates. Patentes derivam de pontos acumulados, independentes da
posição e do filtro semanal: Soldado0/Cabo100/Sargento200/Tenente400/Capitão700/
Major1100/Tenente-coronel1700/Coronel2400/General3900; correspondem aos níveis
existentes (1+floor(pontos/100)), sem alterar pontuação nem conceder moedas.
Ranking filtrado recebe career_points server-side da fonte compatível com o
contrato ativo. Só IDs já autorizados, lotes100; falha/ausência fica null, sem
usar pontos da semana nem inventar Soldado. Public/private/friends preservados.
No perfil: badge e pontos até próxima patente; Verificado continua separado.

Arte: Canarinho + Esquerdomacho por Codex image_gen/GPT com retratos existentes
como referência. Logo oficial preservado. Assets em client public/img/email/
(coro-logo-v1.png 29KB, coro-personagens-v1.jpg 87KB, FONTE.md); original privado
email-characters-gpt-original-20261013.png. Backend emails/templates.mjs gera
HTML com imagens HTTPS do domínio próprio, alt e CTA/textos fora das imagens;
plaintext/ConfirmationURL/opt-in/unsubscribe preservados. Preview usa assets
locais só em --preview-dir. Publicar assets antes de instalar templates/SMTP.
Esta direção substitui a decisão anterior de templates sem imagens.

Validação: baseline independente RED; patentes14/14 +13mutantes capturados;
images4/4 +5mutantes; hashes SQL037/045/049 intactos. Ranking-presentationPASS,
account-verified10/10, profile-character9/9 (SQL+SSR+PNG), inbox23/23;
build/grafo+mutante/docs:check/backend test:api PASS. Harness existentes agora
carregam módulo career-rank real; resolver de dataURL corrigido em apresentação.
Parecer rank-badges-20261013-independent-review.md sem P0/P1/P2 confirmado.
Capturas privadas examinadas: profile-career-public/community, career-ranks-
gallery, career-ranking-home-rows, email-art-magic-link-desktop/mobile e
email-art-weekly-desktop (todas -20261013.png). Mobile magiclink390px semoverflow;
weeklymobilefinal UNKNOWN (viewport aplicado a outra aba; não contar captura
como mobile). Gallery é demonstração, home é GET real/71rows: DonaResenha#2/
4pts/Soldado igual aos perfis. URL local exige ?api=http://localhost:8137 para
apibase não chamar API pública. Texto estático da home 'global indisponível'
contradiz tabela carregada: pendência anterior a corrigir no fechamento ranking.

Limites preservados: 049 ausente, ranking social8arg503; sem prova semanal real.
Não falsificar origem atual040/048 nem desligar freeze/provenance guard.
Assets ainda não hospedados, SMTP/remetente/endereço postal/instalação/caixas reais
GmailOutlook/segmento confirmado/webhook-worker/calendário pendentes. OAuth real
5providers/linking permaneceUNKNOWN; domínio legal/AuthAPI404 no último recheck.
Nenhum envio/publicação/push/merge/deploy, SQL novo ou alteração fora das lanes.
Próximo concreto: reconciliar cutover049 com fonte autoritativa; corrigir texto
home; validar semanal real, OAuth e entrega; publicar assets+API+client/legal e
instalar templates no fluxo coordenado autorizado para campanha.
Objetivo integral continua: ranking geral/semanal Brasília segunda00, manter
histórico/remover só fraude comprovada, MP2× humanos distintos confirmados,
Email/Google/Discord/X/LinkedIn, newsletter, social/chat, loja TRETa$/Pix e
Portugal→Brasil2027, mapas e campanha de redes. Bases deste marco clientf52de72a3,
backendf90da0e/progressf819696; branches codex/ranking-launch-20261012 e growth-
readiness. Artefatos: csbrasil/private-assets/growth-readiness/ranking-20261012.


## Arte de email armada e testes preparados — 13/10/2026

Direção do dono substitui o banner sem armas: Canarinho Pistola + Zé da
Gotinha (lado Esquerda), ambos segurando armas. Asset ativo v2 1200×400,
84.054 bytes, SHA256 0fb827f2611d8ed520b35209d75dd4cb63b6eb87e52ac7bbe2679e86fdcbb881.
Original GPT e capturas ficam em private-assets/growth-readiness/ranking-20261012;
proveniência/prompt completos em public/img/email/FONTE.md. V1 preservado e
rejeitado como banner ativo. Logo oficial e textos/CTA continuam separados.

Template generator --check PASS e probe independente 4/4 PASS. Crítica visual
independente aprovou desktop/mobile; dono aprovou a arte. Captura mobile tem
375×1003 pixels; viewport declarado390, DOM sem overflow observado pelo autor.
Parecer privado email-armed-v2-review-20261013.md; screenshots
email-armed-v2-desktop-20261013.png e email-armed-v2-mobile-20261013.png.

Pedido explícito autoriza quatro testes na caixa indicada pelo dono. Payloads
privados em email-tests-20261013 (magic-link/signup/newsletter-confirmation/weekly),
com imagens CID, texto alternativo, plaintext, aviso TESTE VISUAL, links
demonstrativos e chaves idempotentes; não autenticam nem inscrevem destinatário.
Status: PREPARADOS, NÃO ENVIADOS. Remetente escolhido fale@corosolto.com.br:
Resend recusou novo domínio com403, limite do plano. Subdomínio
auth.corosolto.com.br verificado, envio ativo eu-west-1; escolha de
fale@auth.corosolto.com.br para os testes aguarda resposta no formulário.
Alias de recebimento não autentica SMTP. Não remover domínio alheio nem
contratar upgrade automaticamente. Sem alteração DNS, SMTP, SQL ou produção.

Bases deste marco: cliente e7ef54793/backend02148c8/progress93fe9cb; mesmas
branches e lanes. Próximo: concluir escolha do remetente, enviar quatro testes
com idempotência e conferir status real; depois instalar transporte/templates
no rollout autorizado. Revisão de PRs continua no ledger privado de progress.
Objetivo integral e gates049/semanal/OAuth/news/chat/loja/campanha preservados.

## Estado do ranking13/10

Root corrigiu a copy SSR contraditória em index/main; API real é a fonte do estado. Crítico independente:38/38 sem controle e oito mutantes RED; fotos, perfis e semanal preservados. Check:fast desta lane169/188, com19 falhas preservadas em cutover-closure-20261013/client-check-fast.log; não é liberação geral. Backend pareado82d0c3d capture/fence31/31,7mutantes,history13/13, corte local048 aplicado com72 placares/counters idênticos e423 watermarks. SMTP preparado no Supabase com único remetente fale@corosolto.com.br; titular ainda precisa inserir e salvar credencial. Sem merge/push/deploy público neste marco; sequência autorizada continua após fechamento de gates, loja personagensporúltimo/itensOFF.

Marco13/10: home corrigida em f28bc59d8, mainalpha68 integrada em6f4764b37. Régua permanente tools/eval/ranking-home-status.mjs38/38 e oito mutantes aplicados/rejeitados, linkedom0.18.12 somente desenvolvimento, matriculada check:fast/check:deploy; catálogo e derivados regenerados. Falha original preservada no parecer independente privado, sem controles para passar. Referência docs/LICOES.md ausente nesta árvore e busca por nome sem resultado; skillregua/bug-hunt e catálogo foram lidos. Gate amplo anterior169/188RED, em diagnóstico independente; não é autorização para esconder falhas. PR810 MERGED4239cea59;812 ready CI novoheadc0c5498 e revisão delta pendente. SMTP público salvo/reload pelo dono; OAuthenabled não prova fluxo. Backend82d0c3d+captura049 local preservou72placares/423baselines; publicrelease pendente. Próximos passos concretos: terminar prova Auth+nó+API, gates atualizados, PR70/807/812/815 e templates reais. Objetivo/filaintegral em progress/docs/growth/BLOCKER-CLOSURE-20261013.md; personagens824/75porúltimo e acessóriosOFF.
