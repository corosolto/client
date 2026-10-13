# Revisão independente da reconciliação social — 11/10/2026

**Resultado:** nenhum bloqueador P0/P1/P2 encontrado no merge e nos contratos examinados. O candidato preserva a entrada social e incorpora as duas correções de main examinadas. Este resultado permite continuar a revisão técnica local; não certifica produção, banco alvo, browser ou aprovação visual humana.

## Escopo e snapshot

Revisor separado do autor, solicitado pelo corolário de AGENTS.md. Leitura de AGENTS, continuidades do par, operação e fontes; execução própria de contratos, mutantes e HTTP local. Sem browser, edição de produto, commit, push, operação remota, nova migration, reset ou execução manual de SQL.

- Client: `worktrees/social-community`, `feat/social-community`, HEAD `0d9fc34d6e5fa2694fc82508f5dce03092153ae8`.
- Pais: social/preparação `dec03a7e6afa0f6cb2136edbf6c396ca8b7bdf22` e main `261cf59a7bbc0a7e50352a84d6ba5cb8313eec95`. Checkpoint social anterior: `1463e130e`.
- Backend: `csbrasil-backend/worktrees/social-community`, `feat/social-community`, HEAD `9c88c253f3cba03214b8c91a302f981f280a6800`; `d52ff5f` confirmado ancestral. Nenhum código backend alterado nesta revisão.
- Ao entrar, `tools/eval/pickup_check.json` já estava modificado pela execução do autor. Durante a revisão surgiram a alteração docs-only do autor em `OPERACAO.md` e o preflight backend; não foram escritos pelo revisor. A única escrita do revisor na árvore de trabalho é este relatório.
- Node das provas: `/opt/homebrew/bin/node`, v23.6.0. Fixtures privadas não contêm credenciais reais.

## Merge contra ambos os pais

Repeti `git merge-tree --write-tree --messages dec03a7e6 261cf59a7` sem modificar índice, refs ou checkout. Os nove conflitos estão somente em AGENTS, README, três documentos PT, seus três espelhos EN e ARCH. `main.js` e `index.astro` combinaram automaticamente. `docs:check` e `arch:check` próprios confirmaram os blocos gerados atuais; autoria continua ressalvada pelo próprio gerador. `git diff --check` contra cada pai passou.

Contra o pai social, `main.js` é **byte a byte** o arquivo anterior acrescido da importação `ladoOnline` e da aplicação de `sessao.net.yourTeam` antes de montar o jogo. Não houve mudança adicional no boot, Auth, guest, consentimento, comunidade ou pausa. Executei a função em casos E/B, facção como entrada local e team do servidor ausente/inválido: E/B autoritativos vencem a escolha local antiga, preservando fallback quando necessário.

Contra main, o diff mantém mount e import de AccountEntry/Community, cache por conteúdo, pane social, ação deliberada na pausa, mesma instância/sala e retorno por `resume`. Os módulos `account-entry.js`, `community.js`, proxy, rota API, contrato social e privacidade permanecem idênticos ao pai social. A versão alpha.67 está consistente em package/lock/version; não há dependência de runtime nova no jogo.

O novo filtro CSP exige simultaneamente `source` começando em `blob:` e a mensagem específica de EvalError/unsafe-eval. Erros do próprio `account-entry.js`, `community.js` e `main.js` continuam classificados como código. TypeError em blob continua código. O espelho do filtro no cliente e servidor passou; a CSP versionada não admite blob nem unsafe-eval em script-src. Não houve alargamento do filtro para silenciar falhas sociais.

## Provas executadas pelo revisor

| Prova | Resultado | Limite |
|---|---|---|
| `node tools/eval/social-entry-contract.mjs` | 19 PASS / 0 RED / 1 UNKNOWN | DOM/handlers em fixture; OAuth externo sem aplicação real |
| Cinco mutantes social-entry | Todos exit 1 com cláusula RED correspondente | Disabled-provider, hidratação tardia, quit em resume e duas guardas portrait |
| `node tools/eval/pause-check.mjs` | 6/6 | Estado/handlers; nenhuma captura nova |
| `node --test tools/ops/tests/error-provenance.test.mjs tests/fresh-report.test.mjs` | 20/20 | Proveniência/CSP e invalidação de relatório antigo |
| `node tools/eval/netcode-check.mjs` | 210 aprovados, zero falhas | Contrato de netcode em Node |
| Backend `node test/social-stats-contract.mjs` | Baseline PASS e três mutantes rejeitados | Abates autoritativos, Auth distinto, solo e input AFK; não executa SQL real |
| Backend `npm run eval:ranking` com CLIENT_DIR explícito | 11/11 | Cadeia client→ticket→nó→ingestão→SQL/renderer |
| Nove mutantes de ranking | Todos exit 1 por cláusula FALHA | Identidade pelo body, abate removido, rota/mount/pane/script e endpoints errados/externos |
| Backend `npm run test:api` com CLIENT_DIR explícito | Exit 0, incluindo cláusulas cruzadas R4/R5 | Smoke/handlers/regressões; não equivale à integração com Postgres real |
| `npm run docs:check`; `npm run arch:check` | PASS / PASS | Gerador ressalva autoria fora de main |
| Provas adicionais próprias | 11 PASS / 0 RED | Fixtures separadas dos testes existentes, descritas abaixo |
| HTTP próprio em Astro4391/nó8791 | Nove rotas verificadas, sem RED; health 200 | Leituras locais, sem sessão autenticada ou browser |

Os cinco mutantes social-entry foram `advertise-disabled`, `stale-auth-dialog`, `quit-social-resume`, `portrait-no-guard`, `portrait-broad-guard`. Os nove de ranking foram `browser-decide-bonus`, `sem-abate-no-no`, `ranking-sem-destino`, `ranking-sem-mount`, `perfil-sem-fonte`, `perfil-endpoint-externo`, `ranking-endpoint-externo`, `comunidade-pane-ausente`, `comunidade-sem-script`. Nenhuma régua, teto ou produto foi ajustado pelo revisor.

As onze provas adicionais executam fontes atuais: igualdade exata do automerge; preservação dos módulos sociais; lado do servidor; fronteira CSP; CSRF production com origens ausente/estranha/path/wildcard/HTTP; cookies HttpOnly/Secure/Lax e formato de token; adulteração de cifra GCM; rejeição de nova sessão hidden e revogação de sessão sobrevivente; divergência do jogador canônico; proxy sem Authorization arbitrária, forwarding de cookie/origin apenas quando habilitado e dois Set-Cookie separados; recusa de redirect protocol-relative e erro controlado503. Banco e transporte desses testes são stubs, sem rede ou escrita no Postgres.

HTTP local próprio confirmou `/`200 com mounts de comunidade/modal; `/comunidade`302 para painel; `/ranking`302 para ranking dentro do painel; perfil inválido404/no-store; callback inválido303 para auth_error/no-store; sessão anônima200 sem email; provedores200 com OAuth vazio e email/password locais habilitados; ranking200/source `server_verified`, 25 linhas e sem campos privados; perfil inexistente404. O health do nó informa soloVerified=true, simHash `249b3ba246d2f993` e SHAs `unknown`. Não inferir versão implantada/commit de runtime desses SHAs.

O primeiro scanner HTTP próprio confundiu o booleano `email` da configuração de provedores com endereço privado; a regra foi corrigida para detectar valores string secretos e reexecutada com sucesso. A primeira execução de test:api sem CLIENT_DIR pulava R4/R5; a execução final explícita exercitou ambas. Esses falsos sinais do arnês não são defeitos do produto.

## Auditoria de fonte e privacidade

- `social-session.ts` mantém credenciais cifradas, token hash, origem exata, cookie HttpOnly e verificação canônica de usuário/jogador/hidden. Nenhum token/email privado é retornado pela sessão pública examinada.
- PKCE mantém state em cookie e intent durável expirável; `expected_auth` impede usar confirmação de consentimento de outro sujeito. Callback cria cookie de sessão e apaga cookie de login separadamente. Guest não revoga a proteção de prova/token ao sair.
- Newsletter é escolha separada, inicialmente desmarcada, com cancelamento pendente. SQL046 tem RLS, grants restritos a service_role e guarda temporal contra confirmação antiga após unsubscribe. Nenhuma campanha foi enviada.
- Ranking/estatísticas usam somente entradas verified, kills do nó e bônus limitado por kills verificadas. Dois perfis Auth distintos em slots humanos são necessários; solo, guest, espectador e abas da mesma conta não abrem bônus. Tempo exige vivo/live/input recente e movimento/tiro; SQL soma união de intervalos e aliases, não duração escalar do navegador. Partidas e resultados de rodada mantêm agregação distinta.
- SQL040/041/045 filtra hidden, aliases, visibilidade e bloqueio; `player_points` expõe somente perfis públicos. Badge, sitemap e mapa usam essa projeção; badge/sitemap/mapa e redirects de perfil usam no-store. Nenhum fallback a raw players/stats públicos foi reintroduzido pelo merge. SQL043 mantém bucket privado e endpoint autorizado.
- Isto é auditoria da **fonte**. Grants/RLS, revogação de URL antiga, concorrência, persistência, ingestão/retry e efeitos de privacy não foram reexecutados pelo revisor no banco real nesta rodada.

## Preflight e bloqueadores de release

Li também o delta docs-only de `OPERACAO.md` e `backend/docs/social/RECONCILIATION-PREFLIGHT-2026-10-11.md`. A correção para `043_social_avatar.sql` confere com o arquivo existente. CLIENT_DIR absoluto e `MP_METRICS_URL`/`MP_FLUSH_MS` conferem com os leitores reais do código; `MP_ROUND_URL` não configura esse nó. O preflight distingue corretamente inspeção local de evidência remota histórica e preserva ranking desligado no alvo. Zero duplicações/ausência de presence_anon ali são resultados do autor, não uma consulta própria deste revisor.

Bloqueadores do objetivo completo permanecem explícitos: obter/reconciliar o contrato operacional legado de `presence_anon`; revalidar vínculos/schema/RLS/grants no alvo antes do rollout040–045/047; coordenar banco/API/nós/client; configurar aplicações OAuth/SMTP reais e testar entrega/retorno externo; designar operador/prazo de denúncias; provar duas pessoas/dispositivos/redes e solo/AFK/privacidade no alvo antes de habilitar RANKING_ON. A informação de046 remota já aplicada é histórica de10/10, não nova verificação remota nesta revisão.

O ranking200 observado é **local**, com gate de teste habilitado, e não comprova ativação em produção. Convites ainda dependem de vaga no momento da conexão, sem reserva/ready-check. Outcome final de match/streak completo e posts/chat/clãs permanecem roadmap documentado.

As integrações reais31/31 e email14/14 foram comunicadas pelo autor nesta rodada; não foram executadas pelo revisor e não entram nas provas independentes acima. Gameplay novo, build/check:deploy/check:fast/portão completo e eventuais evidências adicionais devem ser registrados pelo autor em sua continuidade. Esta revisão não atribui verde a esses trabalhos em andamento nem reutiliza capturas de10/10 como certificação do merge de11/10. Nenhum browser, combate mobile físico, OAuth público ou aprovação humana foi certificado aqui.

## Artefatos locais e próximo passo

Logs próprios: `/tmp/social-reconcile-review-{entry,pause,provenance,netcode,stats,ranking,api,docs,arch,independent,http,merge-tree}.log`; mutantes possuem logs separados com nome do mutante. Script próprio temporário: `/tmp/social-reconcile-independent.mjs`, SHA256 `77a372f94c8551503de2a2068d8febc7f2f6a12b14b606bc77952e6953a1bf5f`. Os arquivos temporários não são checkpoints duráveis; a evidência consolidada é este relatório.

Hashes do snapshot de produto: main.js `e33dc1bc2e4185ac9901b02f0d9704ce2377d190eb886d2166d0d7f14cb522cf`; index.astro `772be1bda968245e0f64ad0a0c3bc2db5e97666945d5657c0b65e61777bbbd76`; account-entry.js `6175b57106efa269feed090207f440118145af437fafea224a911d76c005e125`; community.js `ff2666a480abf5be14143f9b550a5cfb19d7da9824eee7be368b806b66d76c58`.

Próximo passo: autor consolidar portões/integracões finais, restaurar somente output gerado não pertencente à entrega, atualizar ledgers e checkpoint/docs/PRs draft dentro da autorização vigente. Preparação técnica local pode continuar; merge de PR, publicação e rollout remoto continuam dependentes de autorização e dos gates pendentes.

## Adendo — delta textual e preflight após check:fast

Revisei a alteração pendente em `src/pages/privacidade.astro` com o mesmo HEAD client/backend. Prova própria comparou o arquivo inteiro com HEAD: a única diferença é trocar a oração que nomeava o provedor por “Entre usando os provedores habilitados ou um link de confirmação por e-mail.” Conta opcional/convidado, email privado, visibilidade, estatísticas verificadas, newsletter inicialmente desmarcada/confirmada/cancelável e progresso preservado permanecem byte a byte iguais. Essa frase mantém os métodos reais de entrada e atende à regra pública já existente; não altera Auth, permissões ou consentimento. A afirmação anterior de igualdade de `privacidade.astro` com o pai vale para o snapshot anterior, sendo supersedida somente por este delta textual.

Provas próprias do adendo: backend-hints atual PASS; mutante oficial `inject` RED; execução da régua real em VM, substituindo somente a leitura de privacidade pelo arquivo de HEAD, reproduziu RED no arquivo correto; a mesma execução com o texto atual passou. Esta reprodução verifica a detecção efetiva do termo no conteúdo servido, além do mutante que acrescenta violação sintética. A régua não foi editada. Logs: `/tmp/social-reconcile-review-backend-hints.log`, `-backend-hints-inject.log` e `-privacy-delta.log`. Não rodei browser, build ou portão amplo novamente para esse ajuste de uma frase.

Preflight backend atualizado registra honestamente o gameplay RED por flush1s/limite durável6/600s, preservação do log, parada do nó próprio e limpeza exclusiva do bucket mp-metrics/loopback no banco isolado pelo autor. Não executei nem certifiquei essa limpeza. Conferência própria de fonte confirma `rateLimit(...,'mp-metrics',ip,6,600)` e default300000ms sem alteração de código. O intervalo45000ms é ensaio temporário: continuamente produziria mais de seis requisições em600s; sucesso depende de duração curta e contagem incluindo flush de shutdown. A revisão não transforma a reexecução ainda em andamento em PASS, nem certifica o orçamento real de requests sem seu resultado final.

O ledger do autor registra check:fast **174/186**, incluindo backendhints então RED e onze outras falhas. O ajuste isolado não equivale a nova execução175/186 ou check:fast verde. Os três arnêses legados headless8123 que não navegaram não oferecem evidência visual; não foram repetidos pelo revisor. Portão backend PASS/social31/email14 são evidências do autor, separadas das provas próprias. Nenhum novo bloqueador no delta textual/preflight; os bloqueadores de release e os limites de banco/runtime/browser acima permanecem.
