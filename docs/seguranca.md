# Segurança — o que foi fechado no pré-release da v2

Documento técnico. Para **reportar** uma vulnerabilidade, veja
[`../SECURITY.md`](../SECURITY.md).

Cada item tem: onde estava (`arquivo:linha`), o que fecha, e como testar.

## Arquitetura de segurança entre projetos

Há quatro unidades, com responsabilidades que não se misturam:

```mermaid
flowchart LR
  B[Navegador] -->|site e proxy same-origin| V[Vercel · client]
  V -->|API sem credencial do navegador| A[Cloud Run · backend/api]
  B -->|lobby público| N[VM regional · backend/game]
  B -->|ticket HMAC curto| N
  A -->|service_role| S[(Supabase · db-privado)]
  A -->|emite ticket; não expõe segredo| B
  N -->|métricas agregadas + identidade do nó| A
  S -->|views diárias server-side| G[game-admin privado]
  M[Secret Manager] -->|service account Cloud Run| A
  M -->|service account exclusiva das VMs| N
```

| Projeto | Pode ter segredo? | Responsabilidade |
|---|---|---|
| `corosolto/client` | Produção SSR ainda usa `service_role`; Preview não. O browser só recebe valores públicos. | Jogo, UI, proxy same-origin do Preview e pedido de tickets. |
| `csbrasil-backend/api` | Sim, via Secret Manager. | Banco, rate limit durável, emissão de tickets e ingestão de métricas. |
| `csbrasil-backend/game` | Sim, via identidade própria da VM e Secret Manager. | Autoridade da partida, lobby, WebSocket e telemetria agregada. |
| `db-privado` | SQL e políticas; nunca credenciais em git. | Tabelas, RPCs, retenção e views diárias. |
| `game-admin` | `service_role` apenas no SSR privado. | Leitura das views agregadas, inclusive multiplayer diário por nó. |

### Fluxo de entrada no multiplayer

1. O browser mede `/health` dos nós e guarda a região declarada pelo próprio nó.
2. Para criar sala ou abrir WebSocket, pede a `/api/mp-ticket` um ticket para aquela região e ação.
3. A API aplica rate limit por IP confiável e assina um payload com região, ação, expiração e nonce. O segredo HMAC nunca chega ao cliente.
4. O nó valida assinatura em tempo constante, região, ação e expiração, e consome o nonce. Reuso é recusado.
5. O WebSocket também exige `Origin` permitido. `Origin` é uma segunda trava, não identidade.

O ticket não é conta de usuário: ele limita abuso anônimo e impede que uma página qualquer use
o browser da vítima para criar salas ou sockets. Autenticação de conta e posse de cosmético
continuam sendo uma frente separada.

### Preview da Vercel

Preview fica atrás de Deployment Protection e usa `/api/[rota]` como proxy same-origin. O proxy
repassa só método, corpo, `content-type` e o IP obtido pelo SSR; descarta cookie, Authorization e
headers arbitrários do browser. No escopo Preview ficam apenas variáveis publicáveis. Tokens de
Cloudflare/GitHub, `service_role` e segredos do multiplayer são proibidos e cobrados por
`tools/eval/vercel-env-security-check.mjs`.

### Ordem coordenada de rollout

1. Criar os segredos e as service accounts no GCP.
2. Implantar a API emissora, que é compatível com nós antigos.
3. Publicar um Preview novo sem segredos privilegiados e testar a emissão.
4. Implantar os nós que passam a exigir ticket.
5. Testar dois browsers reais e só então promover o cliente.

Essa ordem evita tanto cliente novo sem emissor quanto nó fechado diante de cliente antigo.

---

## 1. `players.token` era legível pela anon key — **crítico**

**Onde:** `supabase/schema.sql:38` e `:60-62` (na versão anterior a esta
release).

```sql
alter table public.players enable row level security;
create policy "players: leitura pública" on public.players
  for select using (true);
```

**O problema.** RLS decide **quais linhas**, nunca **quais colunas**. A anon key
é pública por design (na época saía em `GET /api/config`, rota removida desde
então — issue #41), então qualquer pessoa podia:

```
GET /rest/v1/players?select=nick,token
```

e receber o par `(nick, token)` do ranking inteiro. Esse par é exatamente o que
o RPC `submit_match` valida (`schema.sql:131`) e **nada mais**. Ou seja: dava
pra submeter partida em nome de qualquer jogador, sem cheat no cliente. O
ranking inteiro era forjável por qualquer um com um `curl`.

**O que fecha.** `supabase/migrations/011_seguranca_token_retencao_ratelimit.sql`
§1 — privilégio por **coluna**:

```sql
revoke select on public.players from anon, authenticated;
grant select (id, nick, social_link, socials, avatar_url,
              auth_user, hidden, flagged_count, created_at)
  on public.players to anon, authenticated;
```

Não renomeia nada, não muda RPC, não muda rota. Todas as rotas do site usam
`service_role`, que não foi tocada. A superfície pública suportada passa a ser a
view `public.players_public`, criada na mesma migration.

**Como testar** (staging, com a anon key):

```bash
curl -s "$SUPABASE_URL/rest/v1/players?select=nick,token" \
     -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
# ANTES : 200 + lista de tokens
# DEPOIS: 403 {"code":"42501","message":"permission denied for table players"}

curl -s "$SUPABASE_URL/rest/v1/players_public?select=nick,avatar_url" -H "apikey: $ANON"
curl -s "$SUPABASE_URL/rest/v1/leaderboard?select=nick,kills&limit=3"  -H "apikey: $ANON"
# os dois seguem 200 — nenhum expunha token
```

**Efeito colateral conhecido:** `select=*` em `players` com anon key passa a dar
42501, porque o PostgREST expande `*` pra tabela inteira. Auditamos
`public/js/` e `src/` em 2026-08-03: **nenhum consumidor de anon key existe
hoje**. O `GET /api/config` emitia a chave e ninguém a consumia; a rota foi
removida por isso (issue #41).

**O que isso NÃO resolve.** O modelo continua *client-authoritative*: um bot que
respeita os tetos do `submit_match` farma indefinidamente. A correção definitiva
é o servidor de jogo escrever com `service_role` e a RLS bloquear insert/update
do cliente — está na fila junto do multiplayer.

---

## 1b. Todos os RPCs eram chamáveis pela anon key — **crítico**

**Onde:** `supabase/schema.sql`, todas as `create function`. Não é uma linha
errada; é uma ausência: **nenhuma** delas tinha `revoke`.

**Como foi encontrado.** Aplicando a migration 011 num Postgres 16 limpo e
testando papel por papel. Não estava na auditoria original.

**O problema.** No Postgres, toda função nasce com `execute` concedido ao
pseudo-papel **PUBLIC**. `revoke ... from anon, authenticated` não tira isso — o
privilégio chega por PUBLIC, não pelo papel. E o PostgREST publica **toda**
função executável do schema exposto como `POST /rest/v1/rpc/<nome>`.

Com a anon key, portanto:

| Chamada | Efeito |
|---|---|
| `POST /rest/v1/rpc/_flag {"p_nick":"<vítima>"}` | +1 flag. Na **terceira** chamada, `_flag` (`schema.sql:99`) marca `hidden = true` e o jogador **some do ranking**. Moderação automática acionável por qualquer um: griefing de um `curl`, sem token, sem nada. |
| `POST /rest/v1/rpc/submit_match {...}` | submete partida **sem passar por `/api/submit-match`** e portanto sem `p_ip`. O rate limit por IP e o teto de 200/dia só rodam quando `p_ip` não é nulo (`schema.sql:140`) — os dois ficavam desligados. |
| `POST /rest/v1/rpc/register_player {...}` | nick squatting em massa, sem o limite de 10/min por IP da rota. |

O `_flag` é o pior dos três: não precisa nem do token vazado do §1.

**O que fecha.** Migration 011 §4 — varre o catálogo e, para as seis funções
(`register_player`, `submit_match`, `_flag`, `rl_take`, `purge_submit_log`,
`purge_rate_limit`), faz `revoke all ... from public, anon, authenticated` e
`grant execute ... to service_role`. Nenhuma rota do site perde nada: todas
chamam com `service_role`.

O mesmo bloco foi para o fim do `schema.sql` (senão um banco novo nascia
vulnerável) e para `supabase/opcional/012` (senão a ofuscação, que **recria** as
funções, reabriria tudo — `create or replace function` devolve o `execute` pra
PUBLIC).

**Como testar:**

```bash
curl -sX POST "$SUPABASE_URL/rest/v1/rpc/_flag" -H "apikey: $ANON" \
     -H 'content-type: application/json' -d '{"p_nick":"qualquer"}'
# ANTES : 204, e flagged_count sobe
# DEPOIS: 404 (o PostgREST deixa de enxergar a função)
```

```sql
set role anon; select public._flag('x');   -- ERROR: permission denied
set role service_role; select public.rl_take('t','1.2.3.4',3,60);  -- t
```

---

## 1c. `schema.sql` não rodava em banco novo — **bug, não vulnerabilidade**

Achado no mesmo teste. `schema.sql:55` fazia
`alter table public.city_daily add column if not exists rounds`, mas
`city_daily` só é **criada** ~200 linhas abaixo. Num banco vazio o arquivo
morria com `relation "public.city_daily" does not exist` — ou seja, o arquivo
que a documentação manda "rodar no SQL Editor" **só funcionava em banco que já
tinha passado pela migration 005**. Um projeto novo (staging, fork, um
contribuidor montando o próprio Supabase) não subia.

Corrigido com um `do $$ ... if to_regclass(...) is not null`: no-op no banco
novo, continua curando o antigo.

**Verificado:** ciclo completo num Postgres 16 vazio —
`schema.sql` ×2 → `011` ×2 → `012` → `ROLLBACK` → `schema.sql`, tudo limpo, dados
intactos e as travas de anon de pé em cada etapa.

---

## 2. SSRF em `GET /api/badge/<id>.png` — **alto**

**Onde:** `src/pages/api/badge/[...path].png.ts:30` (versão anterior):

```ts
const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
```

**O problema.** `url` vinha de `players.avatar_url` ou de
`socialAvatar(social_link)` — os dois **escritos pelo próprio usuário** em
`POST /api/register`, que aceitava qualquer string com um `.slice(0, 300)`. A
rota da badge é pública e sem auth. Então dava pra:

1. registrar um nick com `avatarUrl = http://169.254.169.254/latest/meta-data/`
   (metadata da cloud), `http://127.0.0.1:<porta>/` ou `http://10.x.x.x/`;
2. pedir a badge e usar a diferença entre "renderizou", "404" e "timeout" como
   oráculo pra varrer a rede interna do runtime.

E como a resposta passa por `sharp`, qualquer coisa que o alvo interno
devolvesse como imagem voltava renderizada.

**O que fecha.** `src/lib/safe-url.ts`, aplicado nos **dois lados**:

- na **leitura** (`badge/[...path].png.ts`, via `fetchAvatar`)
- na **escrita** (`api/register.ts`, via `isAllowedAvatarUrl`)

As travas: só `https:`, host em **allowlist** (não blocklist — DNS rebinding e
encoding exótico derrotam blocklist), sem credencial embutida na URL, redirect
**manual** com cada salto revalidado, teto de 2 MB e timeout de 4 s.

**Como testar:**

```bash
# escrita bloqueada
curl -sX POST "$SITE/api/register" -H 'content-type: application/json' \
  -d '{"nick":"ssrftest","token":"<uuid>","avatarUrl":"http://169.254.169.254/"}'
# depois: select avatar_url from players where nick='ssrftest';  -->  NULL

# leitura bloqueada (mesmo com a URL já no banco, de antes da correção)
curl -s "$SITE/api/badge/<id>.png" -o /tmp/b.png
# a badge renderiza com o fallback (personagem do jogo ou inicial), sem fetch externo
```

**Bônus na mesma rota** (`badge/[...path].png.ts:89-95`): o `catch` devolvia
`message` **e `stack`** ao cliente numa rota pública. Agora o detalhe vai pro
log da função e o cliente recebe `{"error":"render_failed"}`.

---

## 3. Rate limit em `Map` de memória — **médio**

**Onde:** `src/pages/api/register.ts:8` (`regHits`) e
`src/pages/api/submit-match.ts:11` (`hits`), na versão anterior.

**O problema.** Contador em variável de módulo, numa função serverless. Cada
instância de lambda tem a própria cópia; a Vercel abre instâncias novas sob
concorrência e recicla as ociosas. Resultado: N requests paralelos = N
orçamentos independentes, e uma pausa entre rajadas já cai numa instância
zerada. O limite existia no código e não existia na prática.

Além disso, `/api/heartbeat` e `/api/avatar` **não tinham limite nenhum** — e o
`avatar` aceita ~3 MB de base64 e roda `sharp` por request, o que é o vetor de
custo mais caro do backend.

**O que fecha, sem infra nova.** A única memória compartilhada que o projeto já
tem é o Postgres. `src/lib/ratelimit.ts` + tabela `rate_limit` + RPC `rl_take`
(migration 011 §3). Um upsert em índice primário por chamada. Nada de Redis,
Upstash ou KV; nada de conta nova; nada de env nova.

Limites aplicados:

| Rota | Bucket | Limite |
|---|---|---|
| `POST /api/register` | `register` | 10 / min por IP |
| `POST /api/submit-match` | `submit` | 1 / 30 s por IP (o de 1/90 s por nick e o teto diário seguem no RPC) |
| `POST /api/heartbeat` | `heartbeat` | 30 / min por IP |
| `POST /api/avatar` | `avatar` | 5 / 10 min por IP |

**Fail-open de propósito:** se o RPC não existir (migration não aplicada) ou o
banco estiver fora, a função libera. Um rate limit que derruba o registro
inteiro quando o banco tosse é pior que o problema que resolve — as validações
que importam (token, tetos, consistência física) seguem no `submit_match`.

**Como testar:**

```sql
select public.rl_take('teste','1.2.3.4',3,60);  -- t, t, t, f, f...
```

```bash
for i in $(seq 1 12); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST "$SITE/api/register" \
    -H 'content-type: application/json' -d '{"nick":"x'$i'","token":"<uuid>"}'
done
# esperado: 200 ×10 e depois 429 429
```

**O que ainda não dá pra fazer sem infra nova:** limite por IP *antes* da função
executar (isso é WAF/edge). O `rl_take` só corta depois que a lambda já subiu,
então ele protege o **banco e o custo do sharp**, não o custo de invocação. Se
um dia houver abuso de verdade, o passo seguinte é o Vercel Firewall (rate
limit no edge, sem código).

---

## 4. `submit_log` guardava IP bruto sem retenção — **médio (LGPD)**

**Onde:** `supabase/schema.sql:84-85` prometia "retenção 7 dias — apagar
registros velhos periodicamente". **Nenhuma migration apagava nada.** Não havia
`pg_cron`, nem delete, nem job.

**O que fecha.** Migration 011 §2: função `purge_submit_log(p_days int)` +
agendamento diário às 04:00 UTC no `pg_cron`. Se a extensão não estiver
habilitada, a migration **avisa** em vez de quebrar, e imprime o comando pra
agendar depois.

Na mesma migration entrou o índice `submit_log_ip_created_idx (ip, created_at)`:
o rate limit por IP do `submit_match` filtra por essas duas colunas em **todo**
submit, e sem índice isso é seq scan na tabela que mais cresce do banco — um
vetor de DoS barato.

**Como testar:**

```sql
select public.purge_submit_log(7);          -- devolve o nº de linhas apagadas
select jobname, schedule from cron.job;     -- purge_submit_log · 0 4 * * *
```

---

## 5. Headers de segurança ausentes — **médio**

**Onde:** `vercel.json` não tinha bloco de header de segurança nenhum.

**O que fecha.** Aplicados em `/(.*)`:

| Header | Valor | Por quê |
|---|---|---|
| `Content-Security-Policy` | ver `vercel.json` | limita de onde script, style, imagem e conexão podem vir |
| `X-Content-Type-Options` | `nosniff` | impede o browser de adivinhar tipo e executar um `.png` como script |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | não vaza o caminho da página (que inclui o nick, em `/u/*`) pra terceiros |
| `Permissions-Policy` | câmera, mic, geo, pagamento, USB, MIDI, serial e topics **negados** | o jogo não usa nada disso |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | sem `preload`: `preload` é compromisso difícil de desfazer |

**Duas decisões conscientes na CSP:**

1. **`'unsafe-inline'` em `script-src` e `style-src`.** O jogo depende de script
   inline: o overlay de captura de crash (`index.astro:9`) precisa rodar
   **antes** dos módulos, o `importmap` é inline, e há `style=` em quase toda
   página. Trocar por nonce exigiria mexer no `index.astro` inteiro no dia do
   release. A CSP como está já bloqueia script de origem externa não listada,
   que é o vetor mais comum.
2. **`frame-ancestors` libera `*.crazygames.com`, `*.itch.io` e
   `*.gamedistribution.com`.** Os portais embedam o jogo em iframe; travar em
   `'self'` quebraria a distribuição que o plano de lançamento pretende. Se
   algum portal novo entrar, ele entra aqui.

`script-src`/`style-src` não têm mais **nenhum** host externo: o Leaflet foi
vendorizado em `public/vendor/leaflet/` (issue #38) e o `https://unpkg.com` que
existia só por causa dele saiu da política.

**Como testar:**

```bash
curl -sI https://www.csbrasil.online/ | grep -iE 'content-security|x-content|referrer|permissions|strict-transport'
```

E abra `/mapa` com o console aberto: **zero** violação de CSP. Ela ainda é a
página mais exposta, mas agora só por `img-src`: as tiles vêm de
`basemaps.cartocdn.com`. Tile bloqueada degrada pro fundo do container — o
Leaflet em si é local e o mapa continua funcionando.

---

## 6. XSS nos popups do mapa — **baixo**

**Onde:** `src/pages/mapa.astro`, no script inline dos popups do Leaflet —
`nick` e `city` entravam direto em `bindPopup`/`bindTooltip`, que montam HTML.

O nick é escolhido pelo jogador em `register_player` **sem filtro de
caracteres**. O teto de 14 caracteres torna um payload difícil, não impossível.
Agora tudo passa por um `esc()` local antes de virar HTML. Custo: zero.

O resto do site não tinha esse problema — Astro escapa expressão JSX por padrão,
e é por isso que `/ranking` e `/u/*` já estavam corretos.

---

## 7. Charset do nick — **API fechada, banco pendente**

**Onde:** `register_player` valida **só o comprimento**
(`check (char_length(nick) between 2 and 14)`). Caractere nenhum é filtrado.

O que passa hoje, e o que faz:

| entrada | efeito |
|---|---|
| `Аdmin` com `А` cirílico (U+0410) | pixel-a-pixel igual a `Admin` e passa no `unique`. Nick squatting invisível. |
| `U+202E` (RTL override) | inverte a ordem visual do texto e embaralha ranking e badge |
| `U+200B` (zero-width) | dois nicks visualmente idênticos, distintos pro banco |
| `U+0000`–`U+001F` | quebra o render de SVG da badge |
| `<`, `>`, `"` | é por isso que os popups de `/mapa` precisam de `esc()` à mão (§6) |

**O que já está fechado.** `src/pages/api/register.ts` recusa antes de chamar o
RPC, com `400 nick_invalid` e mensagem legível. A regex mora em
`src/lib/nick.ts` (`NICK_RE`).

**O que falta, e só o dono pode aplicar** — `/supabase/` está no `.gitignore`,
o schema é privado. Este é o SQL, na ordem segura:

```sql
-- 1. NOT VALID: passa a valer pra escrita NOVA sem varrer a tabela nem
--    quebrar deploy por causa de linha antiga.
alter table public.players
  add constraint players_nick_charset
  check (nick ~ '^[A-Za-z0-9_.\-]{2,14}$') not valid;

-- 2. Relatório: quem já está fora da regra?
select id, nick, char_length(nick) as chars
from public.players
where nick !~ '^[A-Za-z0-9_.\-]{2,14}$'
order by nick;

-- 2b. Se precisar ver QUAL caractere ofende — homoglifo cirílico e zero-width
--     não aparecem a olho no resultado acima:
select nick, string_agg(to_hex(ascii(c)), ' ' order by i) as codepoints_hex
from public.players,
     unnest(regexp_split_to_array(nick, '')) with ordinality as t(c, i)
where nick !~ '^[A-Za-z0-9_.\-]{2,14}$'
group by nick;

-- 3. Só depois de decidir o que fazer com os inválidos (renomear? esconder
--    com players.hidden? deixar?), valide o constraint:
alter table public.players validate constraint players_nick_charset;
```

**Decisão que sobra pro dono:** o que fazer com nick já registrado que viola.
Renomear muda a URL pública `/u/<id>/<nick>` de alguém; deixar significa
conviver com o constraint `not valid` pra sempre. Nenhuma das duas é chamada de
quem manda a PR.

**Custo conhecido do charset:** rejeita acento. `José` não registra, `Jose` sim.
É decisão de produto, não de segurança — a issue #40 propôs este charset. Se
mudar de ideia, `src/lib/nick.ts` e o check do banco mudam **juntos**, sempre.

---

## 8. Ofuscação de schema — **entregue pronta, NÃO aplicada**

`supabase/opcional/` contém o SQL de renomeação de tabelas/colunas/views/RPCs,
o rollback e o patch das rotas. **Nada foi aplicado.**

Leia [`../supabase/opcional/OFUSCACAO-README.md`](../supabase/opcional/OFUSCACAO-README.md)
antes de decidir. Resumo: é camada de **atrito**, não de controle de acesso, e
custa uma janela de 2-5 minutos com o site quebrado. A trava de verdade é a
migration 011.

---

## Ordem de aplicação recomendada

```
1. supabase/migrations/011_...sql  em STAGING
2. deploy do site em preview       (nenhuma mudança de nome de tabela — é compatível)
3. testar: /ranking, /u/<id>/<nick>, /api/badge/<id>.png, uma partida completa
4. repetir 1-2 em PRODUÇÃO
5. (opcional, outro dia) supabase/opcional/012 + patch das rotas
```

A migration 011 é **compatível pra frente e pra trás** com o código: o site
funciona com ela aplicada ou não. O `rl_take` faz fail-open se o RPC não
existir. Isso é de propósito — dá pra aplicar SQL e deploy em ordens diferentes
sem janela de erro.

---

## 9. Identidade por UID — nick deixa de autenticar

**Problema.** Registro e submissão selecionavam o jogador por `nick + token`.
Quando o token local mudava, o mesmo navegador recebia “nick já está em uso” no
registro e “token inválido” ao terminar a partida. O nick, que é atributo de
exibição, acabava funcionando como chave de identidade.

**Contrato novo.** O UUID anônimo estável do navegador seleciona o jogador e o
token autentica a sessão. No registro, o UID também é a credencial de recuperação
que permite renovar esse token, por isso não pode entrar em views públicas,
ranking, perfil ou logs de resposta. O nick canônico vem do servidor e pode ser
usado em stats, presença e perfil sem participar da busca de credenciais.

No registro, um UID já conhecido recupera o mesmo jogador e renova o token. Para
uma conta antiga, a primeira chamada ainda pode provar `nick + token` uma vez e
associar o UID. Contas antigas cujo token foi perdido e que não têm associação
inequívoca na aquisição não são tomadas automaticamente: isso preserva o dono do
nick.

As rotas mantêm compatibilidade temporária quando a coluna/RPC de UID ainda não
chegou ao banco ou quando um cliente antigo não envia UID. A migration privada é
idempotente e pode entrar antes ou depois do deploy.

**Régua:** `npm run eval:identity`. Os mutantes `semuid-client`, `nick-auth` e
`semcanonical` provam, respectivamente, transporte, autenticação UID-first e uso
do nick canônico.
