# Régua independente — comunidade CORO SOLTO

Data: 2026-10-10. Auditor independente, somente leitura. Não li ledgers, planos ou justificativas do builder. Nenhum browser, banco remoto, OAuth real, deploy ou escrita nos repositórios foi usado.

Fontes fixadas: client `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/social-community` em `62776184e00bd4484940cfe8d26b917a03083e3a`; backend main `/Volumes/Zenith/Projects/game/corosolto/csbrasil-backend` em `ed7ef71074bec0b301866e592cd704c81e4bb227`. O backend contém diretórios de outras lanes não rastreados; não os auditei. Não inferir que esse main equivale à produção ou às outras lanes.

Método: skill `.claude/skills/regua/SKILL.md`, `AGENTS.md`, `docs/docs/quality-gates.md` e fronteira descrita em `docs/seguranca.md`. `docs/LICOES.md`, requerido pela documentação, não existe nesta árvore; isso foi registrado, sem substituir sua ausência por um ledger do builder.

## Resultado baseline

**REPROVADO para entrega vertical social.** Quatro violações comportamentais reproduzidas com o código real e dependências substituídas por fixtures: SSR mostra perfil excluído da view; badge renderiza esse perfil; OAuth inválido recebe sucesso; falha de persistência OAuth recebe sucesso. Também foi observada intenção de sobrescrita de `auth_user` sem guarda do vínculo anterior. Essa última depende das constraints do banco para virar takeover efetivo, que não foi provado aqui.

| ID | Fonte baseline | Reprodução / observação | Estado e limite da evidência |
|---|---|---|---|
| RED-P1 | client `src/pages/u/[...path].astro:39-65` | `player_points` retorna `null`; `players` possui `hidden=true`. A query de fallback sem filtro recupera o jogador e `p.players` expõe id, nick e social. O apelido errado ainda pode gerar redirect canônico. | RED executado: `visible=true`, queries em `player_points` e `players`. Prova o bypass do consumidor SSR; não depende de assumir o SQL da view. |
| RED-P2 | client `src/pages/api/badge/[...path].png.ts:121-147` | Mesma fixture. A view omite o perfil; fallback recupera `players`; renderizador é chamado e a resposta é PNG 200. | RED executado: `status=200`, `rendererCalls=1`. No modo ranking desligado a query legada também não filtra `players.hidden`; esse segundo caminho foi constatado no fonte, não executado. |
| RED-A1 | backend `api/register.ts:115-132` | `auth.getUser(accessToken)` retorna `user=null`; pedido de vínculo recebe 200 `{ok:true,identity:'uid'}` e nenhum vínculo escrito. | RED executado. O resultado de registro do guest não pode ser tratado como sucesso de login/vínculo. |
| RED-A2 | backend `api/register.ts:120-132` | `update(auth_user)` retorna erro de persistência `23505`. A função registra o erro, mas responde 200 `{ok:true}`. | RED executado. UI pode declarar conta vinculada sem vínculo persistido. |
| RISK-A3 | backend `api/register.ts:91-95,120-124` | OAuth-B fornece sessão válida; update `{auth_user:'oauth-B'}` tem filtro somente `id` na rota UID. Não compara `auth_user` anterior nem faz vínculo atômico nesta rota. | Intenção de overwrite executada e observada. Não afirmo takeover real sem testar RPC/constraint SQL. |
| GAP-A4 | client `public/js/main.js` e `src/pages/index.astro` | Baseline contém edição de nick/redes, mas não fluxo OAuth/callback/sessão/recovery de conta; backend recebe `accessToken` apenas como extra no registro. | Gap de feature, por leitura; endpoint opcional não é entrega vertical. |
| GAP-F1 | backend `api/index.ts:25-29`; client `src/pages/api/[rota].ts:11-16` | Tabelas de rotas não têm amizade, bloqueio social ou convite individual persistente. | Gap de feature. Bloqueio de chat não prova bloqueio social entre contas/dispositivos. |
| RISK-S1 | backend `api/submit-match.ts:42-72`; client `public/js/main.js:2978-2997` | Kills, deaths, wins, rounds e seconds do browser são encaminhados ao RPC `submit_match`. Credencial prova dono do perfil, não acontecimento da partida. | Fonte confirmado; não executei o SQL nem afirmo qual fraude o banco aceitaria. Compatibilidade que omite campos não pode certificar estatísticas novas. |
| RISK-S2 | backend `api/mp-ticket.ts:25-27`, `game/index.js:409-422`, `game/round-telemetry.js:65-74` | Ticket assina `anonId` declarado pelo cliente, sem resolver `players.id`; nome vem da query WebSocket. RoundTracker registra anonId/nick, sem identidade de conta verificada. | Assinatura protege integridade do ticket, não autenticidade da pessoa declarada. Não serve como evidência de bonus MP autenticado. |
| RISK-T1 | client `public/js/game.js:8246-8250,2992-2997`; `public/js/main.js:1315-1326,2986`; `src/lib/fmt.ts:12-16` | `this.time` avança por update quando não pausado, sem condição de live/foreground/participação nesta soma. O tempo enviado é `game.time`; fallback de display estima rounds×99. | Não há contrato explícito de tempo ativo. Não classificar estimativa ou duração de simulação como tempo ativo verificado. |
| RISK-C1 | client SSR perfil:26-29, badge:147, ranking:29-32; backend leaderboard | CDN pública + SWR preserva dados antigos depois de mudar privacidade. SVG/PNG/avatar, metadata e redirect também são superfícies. | Fonte confirmado. Revogação exige resolver o dado já servido; só filtrar a próxima query não basta. |

Não há prova nesta auditoria de violação de SQL/RLS real, bypass OAuth do provedor, leitura de token privado ou alteração de stats em produção.

## Como medir, sem premiar o estado ruim

Fixtures mínimas: A e B são contas distintas; G é guest com UID+segredo próprio; H é guest sem relação com G; X é ator sem sessão. A tem estatísticas distintivas, link social e avatar para procurar vazamento. Perfil privado não pode ser renderizado como perfil público zero-stat, nem aparecer em contagens/listagens com identidade. `hidden` de moderação e escolha de privacidade devem ser predicados diferentes, ambos respeitados em leituras públicas.

Autoridade: identidade final é resolvida no servidor. `player_id`, `auth_user`, `uid`, nick, roomId e bônus enviados pelo browser são apenas pedidos. Sessão OAuth válida prova o usuário do provedor; UID+segredo válido prova posse do guest; um identificador isolado não prova nada. Políticas de amizade/privacidade e relógio pertencem ao servidor/banco. Service-role não dispensa checagem de acesso.

Para cada caso coletar: entrada sintética, resposta real, estado persistido antes/depois, ator autenticado resolvido, quantidade de linhas alteradas e efeitos visíveis nas demais superfícies. Não imprimir segredo, access token, cookie, Authorization ou signed URL em artefatos. Resultado sem acesso ao banco/provedor/runtime necessário é **UNKNOWN**, nunca PASS. Mutantes são aplicados em memória ou cópia descartável e verificam que a transformação mudou o alvo.

## Contrato de OAuth e guest

| ID | Caso adversarial e observação obrigatória | Mutação que deve ficar vermelha |
|---|---|---|
| A01 | Login por cada provedor realmente oferecido, callback, reload e novo dispositivo resolvem o mesmo `players.id`, dados e histórico; nick não é chave de recovery. Logout remove sessão e UI de dono. | Resolver login por nick/localStorage em vez de auth verificado. |
| A02 | Callback sem state/PKCE válido, state errado, código reutilizado, callback aberto por outro browser, sessão expirada, access token inválido: vínculo não muda; erro específico, nenhuma UI de sucesso. | Ignorar falha do provedor ou aceitar id do browser. |
| A03 | Link de G exige ao mesmo tempo posse de G e sessão OAuth-A válida; UID de G + segredo de H, nick de G + segredo errado, `player_id` arbitrário ou só anonId: nenhuma escrita no perfil G. | Retirar a validação de posse de guest. |
| A04 | G já ligado a OAuth-A recebe pedido OAuth-B, inclusive com segredo antigo de G: rejeitar troca implícita, sem substituir A, avatar ou histórico. Vincular mesma conta novamente é idempotente. | Update de auth_user filtrado apenas por id. |
| A05 | OAuth-A já tem perfil P e novo dispositivo cria guest G: login recupera P; estratégia de descartar/mesclar G é explícita e atômica, sem duplicar pontos ou apropriar-se de outro perfil. Não mesclar apenas por nick igual. | Criar perfil novo por device a cada login. |
| A06 | Em duas conexões independentes, G tenta vincular A e B simultaneamente: um único vencedor persistido; perdedor recebe conflito; retry do vencedor não muda contagens/identidade. | SELECT livre seguido de UPDATE sem proteção transacional. |
| A07 | Simular timeout/provedor indisponível/falha constraint DB. Não retornar sucesso de vínculo; UI preserva rascunho e recupera estado confirmado na recarga. | Catch/log do erro seguido por `{ok:true}`. |
| A08 | Endpoint social proprietário autenticado pelo usuário A recebe sujeito B no corpo; zero linhas de B alteradas. Token da conta/guest não sai em SSR, bundles, APIs públicas ou badge. | Usar sujeito do body em vez do usuário resolvido. |

Os estados “guest salvo” e “OAuth vinculado” podem ser respostas distintas; a UI deve respeitar a diferença. O teste exige o significado da resposta, não um status HTTP específico arbitrário.

## Privacidade em todas as superfícies

Política mínima desta régua: perfil privado é legível ao dono autenticado em endpoint privado; X e outros usuários não têm acesso a bio, avatar, links, estatísticas, presença detalhada ou relações. Se o produto optar por amigos verem algum campo, o contrato de campos deve ser expresso antes da implementação e medido com amizade aceita real; request pendente não concede acesso. Perfil hidden por moderação não é público mesmo se a privacidade estiver pública.

| ID | Caso e observação obrigatória | Mutação que deve ficar vermelha |
|---|---|---|
| P01 | A privado com e sem stats, dentro e fora do top500: `/u/id/nick`, nick legado e slug errado não expõem dado nem redirect que revele nick canônico. HTML, JSON-LD, OG, canonical, title e description são procurados separadamente. | Fallback raw players sem predicado de privacidade. |
| P02 | `/api/badge/id.png`, nick e aliases recusam/renderizam cartão neutro sem dados de A; renderizador de avatar/stat sensível não é chamado. Repetir com RANKING_ON true e false. | Proteger somente a query player_points ou somente a flag true. |
| P03 | `/ranking` SSR, ItemList JSON-LD, painel ranking dentro do jogo, `/api/leaderboard`, busca/paginação: A não aparece nem influencia total de perfis públicos com identidade exposta. | Filtrar só o template visual ou apenas ranking SSR. |
| P04 | APIs profile/stats/search/friends/presence/status e views públicas do banco com anon/authenticated: tentar UUID, nick, batch, select=*, alias e relacionamentos. Sem campos sensíveis, token ou auth_user. | Trava apenas client-side; service-role sem regra de acesso; RLS pública de coluna sensível. |
| P05 | Sitemap principal, shards, avatar Storage e imagem compartilhável: nenhum link/arquivo pessoal novo público de A. Se avatar permanece público por contrato de CDN, a UI não pode prometer foto privada; contrato precisa ser explícito. | Filtrar só leaderboard e manter sitemap por stats com hidden=false apenas. |
| P06 | Aquecer caches como público; mudar A para privado; repetir mesmos URLs imediatamente em X e A, incluindo cache HIT e requisição condicional ETag. A revogação impede que cache compartilhado entregue o dado; owner response nunca alimenta cache público. | Só adicionar filtro DB sem mudar/invalidate cache. |
| P07 | Query de privacidade dá erro, campo ausente, RPC antiga ou view vazia: consumidor falha fechado; nunca converte invisível/unknown em emptyPlayerScore público. | Tratar null/error como perfil público sem partidas. |
| P08 | A hidden+public, A unhidden+private, A hidden+private e A public+unhidden: só o último é público. Repetir sem estatísticas. | Confundir hidden com campo de privacidade ou usar OR. |

Não basta verificar `noindex`: isso não impede leitura. Não basta sumir nome do DOM: respostas de rede, metadados e imagens também são leitura pública. Um badge já baixado por terceiro não pode ser apagado do disco dele; o gate mede novas respostas e cache sob controle do serviço.

## Amizades, concorrência e bloqueio

| ID | Caso e observação obrigatória | Mutação que deve ficar vermelha |
|---|---|---|
| F01 | A envia a B; reload de ambos mantém pending; A não aceita como B; X não aceita nem cancela. Aceite por B gera uma relação única simétrica; requests pendentes não contam como amizade nem permitem invites restritos. | Confiar em from_id/body ou considerar pending como friend. |
| F02 | Disparar A→B e B→A em conexões DB independentes com barreira comum: no máximo uma relação canônica; resultado definido (aceite cruzado ou único pending), sem duas linhas orientadas conflitantes. | Unicidade só em `(from,to)` sem par canônico/transação. |
| F03 | Duplo clique/retry/duas abas para send/accept/cancel/remove, com respostas fora de ordem: estado persistido único e ambas UIs convergem após reload. | Inserção sem idempotência; UI incorpora resposta antiga. |
| F04 | A remove amizade e B aceita request antiga simultaneamente: estado final corresponde a uma ordem transacional válida; nunca amizade+block coexistentes. Medir ambos os ordenamentos. | Validação antes do lock e gravação depois. |
| F05 | A bloqueia B durante request/aceite/invite: relação e pendências removidas ou inutilizadas atomicamente; B não envia novo request/invite nem infere presença/sala detalhada de A. A não recebe notificações residuais. Reload e outro dispositivo mantêm block. | Bloquear só no DOM/chat/localStorage. |
| F06 | Desbloquear não restaura automaticamente amizade/convites antigos. Auto-request/self-block e target inexistente são recusados sem criar lixo. | Deletar block e reativar estado anterior. |
| F07 | Falha DB em aceite/remove/block: resposta não afirma persistência; nenhuma UI marca definitivo antes de confirmação; listas do servidor são autoridade ao recarregar. | Update otimista sem rollback/reconciliation. |

Concorrência com um mock Map em um processo não prova atomicidade SQL nem comportamento multi-instância. O PASS de F02/F04/F05 exige banco real e duas conexões independentes.

## Convites para a mesma sala

A página baseline `/sala/<REGIAO-CODIGO>` já é um link público de sala; isso não equivale a convite social individual persistente. Não exigir reserva de slot se o produto não a promete, mas nunca mostrar “entrou para jogar” antes do servidor confirmar vaga e slot. O comportamento baseline de entrar como espectador quando o time está cheio pode continuar, com estado explícito e opção consciente; não pode ser apresentado como entrada confirmada no time.

| ID | Caso e observação obrigatória | Mutação que deve ficar vermelha |
|---|---|---|
| I01 | A está numa sala no nó N, convida B, B aceita: socket/welcome e contexto de jogo confirmam **o mesmo nó e roomId/código da encarnação da sala**. Sem cair em quick match/default/última sala local. | Ignorar room/node do convite e chamar quickRoom. |
| I02 | B já na sala alvo: aceite idempotente, sem segundo socket/slot e sem duplicar histórico. B em outra sala: troca ocorre explicitamente e libera slot anterior; falha não deixa duas participações. | Sempre conectar novo socket; não sair da sala anterior. |
| I03 | Expiração mede relógio servidor: imediatamente antes exp é elegível, em/apos exp inelegível. Relógio client 1 dia atrás não estende validade. Aceitar/reusar/cancelar convite expirado não abre socket autorizado. | Comparar expiry só no browser ou checar depois de marcar accepted. |
| I04 | Convite para B é aceito por C/X; mudar inviteId, sender, recipient, roomId, node ou código no body não transfere autorização. Bloqueado/não amigo não cria convite restrito. | Aceite só por conhecimento do inviteId. |
| I05 | Sala fecha/recria usando código igual, A muda de sala, convite cancelado, destinatário bloqueado: rejeitar dado obsoleto e explicar motivo; não redirecionar a outra sala silenciosamente. | Identificar destino só por código reciclável. |
| I06 | Sala tem uma vaga; B e C aceitam juntos; só um ganha slot. Outro vê full/espectador com rótulo correto. Checar lotação novamente no momento autoritativo de entrada. Lobby cacheado não é reserva. | Capacidade só na emissão/aceite API. |
| I07 | Sala privada: convite não vaza senha em API/lista/log. Convite não substitui senha sem autorização explícita do servidor. Nunca persistir segredo em link público. | Incluir password em objeto listado/URL copiável. |
| I08 | Nó offline, ticket expirado, socket recusado e resposta fora de ordem: não marcar joined com sucesso; retry usa identidade/sala atual e não duplica convite/socket. | Sucesso em clique/HTTP aceite sem welcome. |

Observáveis: backend `game/index.js` seleciona `codigo/room` em `connection` e `room.addClient`; client confirma welcome/slot. UI não prova essa seleção sem captura do estado do servidor.

## Estatísticas, tempo ativo e bônus

Não certificar como “confiável” o que apenas respeita teto plausível no browser. Estatísticas SP relatadas pelo cliente e stats MP confirmadas podem coexistir no produto, mas sua procedência e confiança precisam ser preservadas. O bônus de MP depende de kills/participação confirmadas pelo nó e duas identidades humanas distintas autenticadas; conexão, anonId, nick ou espectador não estabelecem essa condição.

| ID | Caso e observação obrigatória | Mutação que deve ficar vermelha |
|---|---|---|
| S01 | Enviar `player_id` de B, UID de B, nick de B ou `bonus/multiplier/points` no payload autenticado de A: atribuição continua A ou request recusado; stats de B não mudam. `auth_user` vem da sessão verificada. | Resolver pelo id/nick fornecido sem prova. |
| S02 | Round MP conhecido com contadores no nó: inflar kills/headshots/wins/seconds no body e localStorage não muda os valores confirmados. Capturar delta persistido e origem, não só JSON `ok`. | Usar browser counts como MP confirmado. |
| S03 | Repetir mesmo evento/round, reiniciar API, trocar IP/sessão e entregar fora de ordem: stats e pontos uma única vez. Reuso da chave com outro conteúdo é conflito ou preserva resultado original. | Idempotência apenas em memória ou apenas no cliente. |
| S04 | Um jogador+bot, dois sockets do mesmo perfil, espectador+perfil, dois anonIds sem conta, dois nicks da mesma conta: nenhum bônus por “dois humanos”. Dois `players.id` distintos ocupando slots simultâneos com prova autenticada do nó: bônus elegível. | Contar clients.size/anonIds/nomes como identidades. |
| S05 | B entra depois de A sair, mesmo playersPeak=2 em outra janela; B esteve só espectador; A desconecta antes do fim: elegibilidade depende da sobreposição autoritativa real dos slots, e kills do participante que saiu não são perdidos. | Usar união de participantes/peak total como sobreposição ou fotografia final. |
| S06 | Nó manda round confirmado; browser manda mesmo evento; API retried após timeout: nenhum double credit base+bonus. Nó não autorizado/region forjada/round sem kills autoritativas não creditam. | Tratar telemetry assinada de browser como confirmação de nó. |
| T01 | Antes de implementar, declarar uma única definição de active_seconds. Mínimo: menu, setup/loading, countdown, pause, hidden, end screen e spectator não acumulam tempo ativo de jogo. Death/intermission pode ter regra explícita de participação, mas não ser confundido com tempo de controle. | Somar game.time/uptime integral. |
| T02 | Relógio controlado: 7 s menu + 3 s loading + 2 s countdown + 5 s live foreground + 11 s pause + 13 s hidden + 17 s spectator. Resultado base = 5 s ativos, sem duração inflada; round-trip profile/stat preserva 5. Usar intervalos exatos, não tolerância inventada. | Somar todos os dt ou apenas excluir pause. |
| T03 | Duas abas/sockets do mesmo perfil ativos simultaneamente: união dos intervalos autorizados, sem multiplicar tempo humano. Mudar relógio civil para trás/frente, suspender OS e reconectar não gera horas de crédito. | Somar durações de sessão ou Date.now bruto sem bounds. |
| T04 | Partida abandonada/crash/reconnect persiste o que pode ser comprovado, sem perder tudo nem contar gap desconectado; retry não duplica. Não aceitar `seconds` enorme do browser como verificado. | Tempo salvo apenas no match_end; aceita seconds do request. |
| T05 | Perfil com tempo legacy=0 e rounds>0 mostra estimativa com marca e fonte explícitas; valor estimado não entra no campo active_seconds nem no cálculo de bônus. | Converter rounds×99 em dado verificado. |
| S07 | Banco/RPC antiga ou indisponível: UI informa pending/unavailable/degraded; não afirma ranking/estatísticas confiáveis com gravação parcial. Release não promove uma rota cuja compatibilidade silenciosa descarta os novos campos. | Fallback antigo seguido de sucesso integral. |

Exemplo de pontuação canônica a preservar se esse for o contrato da release: base 1 ponto por kill SP+MP; adicional 1 por kill somente em round MP elegível. Com 3 kills SP e 2 kills MP elegíveis, total=7; mesmo MP inelegível total=5. Verificar no banco e em profile/leaderboard/badge. Esse contrato conhecido precisa ser revalidado na implementação efetivamente publicada; o backend main auditado não comprova o rollout dele.

## Entrega vertical e evidência final

1. Réguas rápidas executam handlers reais com mocks para autorização/erros, queries SSR/PNG e serialização. Elas são necessárias, insuficientes para atomicidade SQL, login provedor e UX.
2. Banco descartável com migrations exatas em ordem: F02/F04/F05/A06/S03; papéis anon/authenticated/service_role; mesma suite depois de replay de migrations; nenhuma tabela crítica fica publicável por acidente. Falha de migration é RED.
3. Um único agente de browser executa caminho humano completo em duas sessões independentes: login/guest link/recovery → privacy em outra sessão → amizade/reload → convite real → welcome mesma sala → partida → stats persistidos/profile. Inclui mobile ou viewport 3:2 para o estado social visível; capturas precisam ser vistas e descritas pelo crítico independente. Eu não executei esse portão nesta auditoria.
4. Mutation kill por família A/P/F/I/S/T, aplicada de fato e revertida: PASS normal → RED com mensagem pertinente → PASS restaurado. Uma asserção de string declarada não substitui mudança no efeito do handler/SQL.
5. Relatório final separa `PASS`, `RED`, `UNKNOWN`, com SHA, migração, caminhos de artefatos e limitações. Tela pronta + endpoints ausentes = RED; testes de fonte verdes + fluxo real ausente = UNKNOWN vertical. Nenhum gate verde técnico vira aprovação visual/publicação automaticamente.

## Reprodução mínima do RED executado

Somente leitura; dependências/banco são fixtures, sem rede. Usar `/opt/homebrew/bin/node` v23.6.0 ou Node com `stripTypeScriptTypes`; o `node` padrão nesta sessão é v16.13.0 e não oferece a API. O fixture inclui `hidden=true` intencionalmente e faz a view pública retornar null; isso isola o consumidor sem depender do SQL real.

```sh
/opt/homebrew/bin/node --input-type=module <<'JS'
import { stripTypeScriptTypes } from 'node:module';
import { execFileSync } from 'node:child_process';
const client='/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/social-community';
const backend='/Volumes/Zenith/Projects/game/corosolto/csbrasil-backend';
const read=(cwd,sha,p)=>execFileSync('git',['show',sha+':'+p],{cwd,encoding:'utf8'});
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const f={id:'11111111-1111-4111-8111-111111111111',nick:'Privado',hidden:true,social_link:'https://example.test/private'};
const source=stripTypeScriptTypes(read(backend,'ed7ef710','api/register.ts').replace(/^import .*;\n/gm,'').replace('export const POST','const POST'));
for(const [name,user,error] of [['invalid-oauth',null,null],['replace-linked-user',{id:'oauth-B',user_metadata:{}},null],['oauth-write-fails',{id:'oauth-B',user_metadata:{}},{code:'23505',message:'conflict'}]]) {
 const writes=[];
 const admin={auth:{getUser:async()=>({data:{user}})},rpc:async()=>({data:[{player_id:f.id,canonical_nick:f.nick}],error:null}),from(table){const q={filters:[],update(values){if(table==='players')writes.push({values,filters:q.filters});return q},eq(k,v){q.filters.push([k,v]);return q},is(k,v){q.filters.push([k,v]);return q},then(ok){return Promise.resolve({error:table==='players'?error:null}).then(ok)}};return q}};
 const post=await new AsyncFunction('supabaseAdmin','NOT_CONFIGURED','rateLimit','validUid','jsonError','isValidNick','NICK_HINT','isIdentityRpcMissing','logInternalError','buildSocialUrl','isAllowedAvatarUrl',source+';return POST')(admin,'{}',async()=>true,()=>true,(s,e)=>new Response(JSON.stringify({error:e}),{status:s}),()=>true,'',()=>false,()=>{},()=>'',()=>false);
 const r=await post({request:new Request('https://local.test/api/register',{method:'POST',body:JSON.stringify({uid:f.id,nick:f.nick,token:'synthetic-proof',accessToken:'synthetic-invalid-token-over-20'})}),clientAddress:'fixture'});
 console.log(JSON.stringify({case:name,status:r.status,result:await r.json(),writes}));
}
const queries=[];
const admin={from(table){const q={select(){return q},eq(k,v){queries.push([table,k,v]);return q},maybeSingle:async()=>({data:table==='players'?f:null,error:null})};return q}};
let prefix=read(client,'62776184e','src/pages/u/[...path].astro').split('---')[1];
prefix=prefix.slice(0,prefix.indexOf('const points =')).replace(/^import .*;\n/gm,'').replace('export const prerender','const prerender');
const wrapped=stripTypeScriptTypes('async function run(){'+prefix+';return {p,cache:Astro.response.headers.get("cache-control")}}');
const Astro={params:{path:f.id+'/'+f.nick},response:{headers:new Headers()},redirect:(url,status)=>({redirect:url,status})};
const out=await new AsyncFunction('supabaseAdmin','RANKING_ON','Astro','emptyPlayerScore',wrapped+';return run()')(admin,true,Astro,p=>({...p,points:0}));
console.log(JSON.stringify({case:'hidden-profile-SSR',visible:!!out.p,profile:out.p?.players,queries,cache:out.cache}));
let badge=read(client,'62776184e','src/pages/api/badge/[...path].png.ts');
badge=stripTypeScriptTypes(badge.slice(badge.indexOf('const handle:')));
let renders=0;
class Resvg{constructor(){renders++}render(){return {asPng:()=>new Uint8Array([1])}}}
const handle=await new AsyncFunction('supabaseAdmin','RANKING_ON','NOT_CONFIGURED','emptyPlayerScore','avatarDataUri','socialAvatar','Resvg','badgeSvg','fontBuffers',badge+';return handle')(admin,true,'{}',p=>({...p,points:0}),async()=>null,()=>null,Resvg,()=>'',[]);
const r=await handle({params:{path:f.id+'.png'}});
console.log(JSON.stringify({case:'hidden-profile-badge',status:r.status,renders,cache:r.headers.get('cache-control')}));
JS
```

Saída observada: `invalid-oauth` 200/ok true/writes=[]; `replace-linked-user` update auth_user OAuth-B filtrado somente id; `oauth-write-fails` 200/ok true apesar de erro DB; `hidden-profile-SSR` visible true/social_link exposto/cache público; `hidden-profile-badge` 200/renders 1/cache público com SWR.

Essa reprodução mede a versão fixada, não as edições que o builder fizer depois. A próxima auditoria deve executar a mesma intenção comportamental no novo SHA e provar mutantes sem ler as justificativas do builder.
