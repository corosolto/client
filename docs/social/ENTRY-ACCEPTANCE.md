# Aceitação independente da entrada social no jogo

Objetivo completo: comunidade dentro do menu do jogo; login Supabase na abertura sem nick; suporte a Google, Twitter, Facebook e LinkedIn com ativação real quando configurados; conta por email; convidado preservado; newsletter opcional e separada; lembrete colapsável de foto/redes incompletas. Não foi lido ledger, relatório ou justificativa do builder. Esta régua complementa a segurança social já exigida, sem substituí-la.

Esclarecimento posterior aceito pelo usuário: ainda não existem apps OAuth nem SMTP dedicado, somente email de contato Gmail. Provedores inativos e email público sem SMTP precisam aparecer indisponíveis com honestidade; suporte técnico com mocks não representa ativação pública. Conta email por magiclink PKCE com confirmação real atende o requisito, sem exigir senha. Newsletter é solicitação independente; inscrição depende de email confirmado da identidade esperada no servidor. Remetente de contato não é SMTP de autenticação.

Baseline fixado para investigação: client `96bd8fe43e78584847c06cc4ac868a06a883b589`, branch `feat/social-community`; backend exclusivo `a63f478f72dfd10e2315f01b67481b52d1f4e22b`. Fontes reais e execução são autoridade. Nenhuma alteração de implementação foi feita pelo autor da régua.

## Fonte e defeitos observados antes do conserto

- `src/pages/index.astro:808,873`: âncoras `/comunidade`, uma abre aba. `src/pages/comunidade.astro` envolve `Community` em `Layout` do site. O root do jogo não monta esse componente. A frase do componente dizendo que está no menu não comprova integração.
- `api/social-auth.ts:12,67`: whitelist só Google/Discord/GitHub; Twitter/Facebook/LinkedIn são recusados mesmo se settings Auth habilitar esses provedores.
- `api/social-auth.ts:7,50`: login email/senha só existe em desenvolvimento, condicionado a flag. Não há caminho de criar conta email, confirmar email, recuperar senha ou pós-confirmação neste handler baseline.
- `api/social-auth.ts:28`: callback volta a `/comunidade`, fora do menu.
- `public/js/community.js`, `renderAccount`: “JOGAR COMO CONVIDADO” é âncora `/`, causando navegação; logout apaga UID/segredo do guest. Progresso deve continuar pertencendo ao navegador correto, sem virar dado órfão.
- Newsletter atual é formulário legado feedback, não opt-in independente de criação de conta. Ter a palavra newsletter em main.js não prova o contrato novo.
- Foto/links podem ser editados em settings, mas ausência não produz lembrete colapsável no início.
- GET real `http://127.0.0.1:8091/api/social-auth?action=providers`: HTTP 200, `providers=[]`, `password=true`. É Auth local real, não prova ativação de qualquer OAuth nem prontidão do ambiente publicado.

## Régua rápida executável

```sh
SOCIAL_ENTRY_API=http://127.0.0.1:8091 /opt/homebrew/bin/node tools/eval/social-entry-contract.mjs
/opt/homebrew/bin/node tools/eval/social-entry-contract.mjs --only=A02 --mutant=advertise-disabled
```

Node precisa oferecer `node:module.stripTypeScriptTypes` (v23.6.0 nesta máquina). `SOCIAL_ENTRY_BACKEND` pode indicar a worktree exclusiva do backend. O script lê implementação atual; não lê docs do builder. Não carrega .env, credenciais reais nem grava fixture. Domínio remoto no probe live é recusado. Não imprime URLs OAuth, cookie, senha, tokens ou respostas arbitrárias.

| ID | Medição | Evidência e limite |
|---|---|---|
| E01 | Markup transitive da página real do jogo monta social UI; menu não contém âncora externa `/comunidade`. | Estrutural, não afirma posição visual nem abertura automática. |
| E02 | Módulo account-entry real abre dialog sem nick depois de remover boot splash; opção guest fecha sem navegação/perda de UID/proof/stats. | DOM mínimo + chamada real de init verificada no main; não certifica visual. |
| E03 | Nick local existente evita prompt automático; botão manual mantém entrada de conta acessível. | Módulo real em DOM mínimo. |
| E04 | Abrir conta antes da resposta Auth mostra carregamento e guest; chegada da configuração redesenha email/providers no mesmo dialog aberto. | Fetch deliberadamente retido; módulo real, sem sleep aleatório. Mutante remove redraw e precisa RED. |
| P01 | Pausa abre comunidade no menu e ação de retorno retoma exatamente a mesma instância, match e round. | Executa corpos reais dos dois handlers, setHubTab e onPauseChange com game sentinela; quit/destroy/navegação falham. Não certifica pointer lock nem render em browser. |
| A01 | Handler real recebe settings com quatro provedores habilitados; config e action:start aceitam cada provider, URL usa provider correto. | Comportamental com Auth/DB mockados; ativação real é L01 + gate humano abaixo. |
| A02 | Settings com providers todos disabled não anuncia nem aceita OAuth. | Comportamental; mutante elimina o filtro e deve reprovar. |
| A03 | Handler real em NODE_ENV=production com email configurado inicia magiclink PKCE e state browser. | Auth mockado; não certifica SMTP nem concede sessão antes de confirmação. |
| A04 | Callback PKCE real do handler com dependências mockadas redireciona ao root do jogo. | Não certifica exchange externo real. |
| A05 | Production sem SOCIAL_EMAIL_LOGIN rejeita ação email antes de OTP/intent, mesmo com external.email=true no Auth. | Comportamental, garante mensagem de disponibilidade verdadeira. |
| G01 | JS real da comunidade renderiza opção convidado como ação interna, sem página externa. | DOM mínimo, não é browser. |
| G02 | Logout real pelo botão preserva UID, proof e stats guest. | JS real com fetch/DOM mockados; modelo futuro precisa separar nickname de conta e guest. |
| N01 | Consentimento de newsletter associado à conta existe, começa desmarcado e não é obrigatório. | DOM mínimo; persistência/cancelamento verificados no gate integrado. |
| N02 | Email sem consent, com consent true, com string "true": somente boolean true marca solicitação; nenhum caso cria sessão/subscrição antes de confirmar. | Executa helper real; DB/Auth mockados. |
| N03 | Callback OAuth com consentimento explícito apenas solicita newsletter pendente; não marca confirmação. | Mede argumentos persistidos/RPC, não certifica SQL. |
| N04 | Callback de newsletter com expected_auth distinto rejeita, não cria sessão nem persiste consentimento. | Handler real; usuário resolvido simulado pelo Auth. |
| N05 | Optout persistido pelo checkbox permanece desmarcado ao remontar a mesma tela. | Módulo real; pega snapshot auth obsoleto, sem alegar falha de DB. |
| R01 | Conta sem foto/redes mostra lembrete com identidade semântica `social-profile-reminder`, colapsável. | DOM mínimo; completude/sessão seguintes e acessibilidade são gate integrado. |
| L01 | API/Auth local real mede ativação Google/Twitter/Facebook/LinkedIn e email. | Provedores ausentes são UNKNOWN operacional explícito, não defeito inventado nem PASS de OAuth externo. Sem variável live também UNKNOWN. |

LinkedIn usa o nome de provider Supabase `linkedin_oidc`; Twitter é `twitter`, distinto do link de rede `x`. Se a configuração implantada usa outro alias suportado, adaptar com prova da configuração/API em vez de afrouxar para qualquer string. Não remover a asserção só porque um provedor não foi configurado: isso é bloqueio operacional explícito.

## Portão integrado obrigatório antes de dizer pronto

1. Novo navegador, sem nick e sem sessão, abre `/`: entrada de conta aparece dentro do menu, com opção convidado funcional. Não exigir conta para solo ou MP. Fechar/continuar não cria subscrição nem apaga guest. Reload após escolher convidado não deve surpreender com logout ou perda de nick. Com nick existente, menu permanece utilizável e login continua acessível.
2. Cada provedor solicitado realmente habilitado precisa login externo completo → callback → root do jogo → nick/conta recuperados → reload com mesma identidade. Provider disabled não ganha botão “ativo” fictício; ambiente sem providers é bloqueio, não sucesso da release. Falha/cancelamento retorna ao menu, com guest intacto. A configuração local sem credenciais externas não estabelece esse portão.
3. Email permite criar/recuperar conta por magiclink PKCE, confirmar por mensagem realmente recebida, entrar, sair, reenviar link e continuar no menu. Conta não confirmada não recebe sucesso definitivo. Email já usado não revela dados do perfil nem cria contas duplicadas. Com SMTP ausente em produção a ação fica indisponível e não afirma envio. Local usa SMTP/Inbucket real. Conteúdo de inbox, códigos e links de confirmação não entram em logs/artefatos. Gate de confirmação não pode ser bypassado com createUser(email_confirm:true) e chamado de fluxo humano entregue.
4. Checkbox de novidades é independente, desmarcado por padrão e opcional. Criar conta/login com checkbox false produz consent=false ou nenhum registro; true grava consentimento explícito ligado à identidade com timestamp/fonte. OAuth, acesso ao perfil e feedback não marcam consent automaticamente. Desmarcar/revogar persiste, reload confirma. Retried signup/callback não duplica subscription nem converte false em true.
5. Conta sem foto e/ou redes recebe lembrete colapsável no menu: nomeia exatamente o que falta, abre editor dentro do jogo, permite fechar e jogar. Editar foto/redes atualiza a mensagem; completar ambos elimina o lembrete; falha de upload/salvar não o elimina. Sem repetir modal invasivo a cada polling/reload. Teclado, foco, Escape, aria-expanded e mobile/3:2 precisam captura vista pelo crítico.
6. Menu social contém perfil, amigos, convites e ranking funcional sem abandonar shell do jogo. Convite recebido e aceito abre a mesma sala no jogo, sem exigir aba social externa. A UI não cobre mira, inputs ou placar durante a arena; abertura no menu preserva opções/mapa e não inicia partida involuntariamente.
7. Guest existente G e conta A mantêm histórico/posse conforme contrato de vínculo já protegido. Login e logout não tornam UID/segredo de G inacessíveis; nenhuma conta B ganha o guest por nick. Consentimento email pertence à conta apropriada, não a qualquer guest que use o mesmo dispositivo.

## Mutantes e estados finais

Mutante automático A02 substitui o filtro de settings por true e **asserte que aplicou**. Rodar A02 sem mutante deve PASS; com mutante deve RED. Depois da implementação, acrescentar mutantes independentes: comunidade redireciona `/comunidade`; suprime prompt sem nick; email disabled em production; guest logout apaga proof; newsletter checked/required ou gravada implicitamente; reminder sempre expandido ou ausente. Cada mutante precisa reverter e voltar PASS.

O script rápido não substitui o portão integrado. Invariantes novas faltantes, fonte/Node ausente e Auth não medido são RED/UNKNOWN com saída não zero, sem skips que pareçam green. Não instalar pacotes nem mudar implementação só para executar a régua.

Milestone validado antes de mudanças de implementação: versão inicial da régua, client 96bd8fe/backend a63f478, API local real, **1 PASS / 9 RED / 0 UNKNOWN**. A02 sozinho **1 PASS**, mutante advertise-disabled aplicado **1 RED**. REDs: integração externa, whitelist incompleta, email produção desligado, callback externo, convidado por navegação, guest destruído no logout, newsletter independente ausente, lembrete ausente, OAuth local inativo. Após esclarecimento de configuração, a última condição passa a UNKNOWN operacional e A03 mede magiclink, sem afrouxar comprovação de suporte.

Continuação do autor da régua: baseline e mutante concluídos; builder liberado para implementar. Próximo passo: adaptar arnês DOM ao módulo compartilhado account-entry.js, executar novo SHA e local API/SMTP/Inbucket real sem expor códigos, depois crítica visual/humana por um único agente de browser. Não certificar o prompt de abertura somente com E01: sua observação real ainda está no portão integrado. O builder é responsável por adicionar comando npm/documentação de catálogo nas faixas que possui. Este arquivo é o ledger exclusivo da régua de entrada; não substitui o ledger completo do projeto.

Milestone de revisão durante implementação, ainda sem novo checkpoint Git: A01/A02/A03/A04/A05/N02/N03/N04 passaram contra `social-auth.ts` e o helper `social-entry.ts` reais com Auth/DB mockados; A02 mutante permaneceu RED. Nenhum resultado desses certifica configuração pública, atomicidade SQL, chegada SMTP ou UI nova. O teste lê o helper real se ele existir e não substitui suas regras por stubs, evitando um green artificial ao mover código entre módulos.

Milestone de crítica do wiring atual: E01/E02/E03/R01/G01/N01 passaram após montagem dentro de hub-community e módulo compartilhado. Dois defeitos novos reproduzidos antes de seus consertos: **N05**, optout seguido de rerender reativa checkbox na UI porque auth.newsletter continua subscribed; **G02**, boot com conta A recuperada remove token do guest G não vinculado, e logout deixa seu UID/stats sem prova de posse. O segundo não exige preservar credencial de guest já legitimamente transferido à conta; a fixture mede guest distinto ainda pertencente ao navegador. Guardar/restaurar identidade guest separada da conta resolve o contrato sem tratar nickname como prova. Nenhum log/artefato contém segredo real.

Última revalidação neste milestone: **16 PASS / 0 RED / 1 UNKNOWN**. N05 e G02 corrigidos pelo builder e passaram sem mudar as respectivas asserções. G02 mede boot com guest distinto, sessão autenticada recuperada e saída: UID, proof e stats locais voltam aos valores anteriores via backup separado. A02 mutante permaneceu RED depois desses consertos. L01 continua UNKNOWN por OAuth apps ausentes; a saída do conjunto continua 1 para evitar certificar o portão operacional incompleto. Syntax `node --check` e higiene dos arquivos exclusivos passaram. Ainda pendentes: email/SMTP real, prova SQL de consentimento/revogação e browser real. Não foi feito commit da régua enquanto a implementação estava em curso; dono da branch mantém o checkpoint conjunto.

Baseline adicional antes do wiring de comunidade pela pausa: **E04 PASS / P01 RED**. E04 retém as respostas de sessão/configuração, abre o dialog manualmente, comprova guest disponível sem formulário prematuro, libera Auth e exige email e quatro providers no dialog ainda aberto. O loading/hydrate já estava corrigido ao iniciar esta revisão; não se atribui baseline RED histórico sem observá-lo. Mutante `--only=E04 --mutant=stale-auth-dialog` remove apenas o redraw da conclusão, sem editar implementação, e deve falhar. P01 inicialmente falha por ausência de botão na pausa. Antes de declarar o fluxo pronto, browser deve pausar uma partida em andamento, abrir comunidade, interagir, voltar à mesma partida e comprovar mapa/round/jogadores, inputs e pointer lock; navegação, quit, reinício ou resume involuntário enquanto social está aberto reprovam.

Revalidação após o wiring de pausa: **18 PASS / 0 RED / 1 UNKNOWN**. P01 executou setHubTab real com updateRoute=false, mostrou menu/comunidade e escondeu pane jogar; resume real do handler invoca a callback onPauseChange real, que apaga socialPaused, esconde a ação de retorno e fecha telas. Match/round do game sentinela persistem; nenhuma rota foi alterada. Mutante `--only=P01 --mutant=quit-social-resume` substitui resume por quit apenas no handler carregado em memória, comprova substituição e resulta RED “community quits active game”. Mutante E04 também resultou RED “manual opening remains stuck loading”. Os mutantes não editam fontes de implementação. L01 continua UNKNOWN pelo ambiente sem apps OAuth. Esse marco é prova dos handlers e fluxo DOM mínimo, não observação de pausa/retomada ou CSS no browser.
