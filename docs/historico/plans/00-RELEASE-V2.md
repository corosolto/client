# PLANO DE RELEASE — CORO SOLTO v2

> Escrito em 02/08/2026, a partir de auditoria medida do repo (código, screenshots de `issues/`,
> harness `tools/eval/`) + pesquisa técnica externa. Todo número aqui tem `arquivo:linha` ou fonte.
>
> **Decisões do dono (02/08):**
> 1. Viewmodel: **só arma, estilo Quake/UT** — sem braço/luva na v2.
> 2. Multiplayer: **4v4 com servidor autoritativo** (3-5 dias).
> 3. Monetização: **doações + anúncios próprios + portais**.
> 4. Escopo: **cortar para o essencial e lançar antes**.

---

## 1. O corte

Dos 13 itens da sua lista, **6 entram na v2** e 7 viram v2.1. O critério foi um só:
*isso muda o que a pessoa vê nos primeiros 60 segundos de jogo?*

### ENTRA na v2 (release)

| # | Item | Plano | Estimativa |
|---|---|---|---|
| **P0** | **Armas / viewmodel** | [`01-ARMAS-VIEWMODEL.md`](01-ARMAS-VIEWMODEL.md) | 2-3 dias |
| **P0** | **2 furos de segurança no backend** | §4 deste doc | **2 horas** |
| **P1** | Bots que passam e não atiram + recoil injogável | [`02-BOTS-E-MODELS.md`](02-BOTS-E-MODELS.md) | 1 dia |
| **P1** | UI/HUD nível AAA | [`04-UI-HUD-AAA.md`](04-UI-HUD-AAA.md) | 1-2 dias |
| **P1** | Multiplayer 4v4 | [`03-MULTIPLAYER-4V4.md`](03-MULTIPLAYER-4V4.md) | 3-5 dias |
| **P2** | Sons novos + mapa novo + licença + doações | §3 e [`06-LANCAMENTO.md`](06-LANCAMENTO.md) | 1 dia |

**Total realista: 9-13 dias.** Não é "esta semana". Se "esta semana" for inegociável,
corte o multiplayer para v2.1 e lance em 4-6 dias — o plano `03` foi escrito para
poder ser destacado sem quebrar o resto.

### FICA para a v2.1 (2 semanas depois, com post próprio)

| Item | Plano |
|---|---|
| DX, docs, onboarding de devs | [`07-DX-DOCS-SEO.md`](07-DX-DOCS-SEO.md) |
| SEO / AEO (aeo.js), rankings, páginas estáticas | [`07-DX-DOCS-SEO.md`](07-DX-DOCS-SEO.md) |
| Code review automatizado no repo | [`05-HARNESS-AI.md`](05-HARNESS-AI.md) §5 |
| Harness / skills / automação de AI Engineering | [`05-HARNESS-AI.md`](05-HARNESS-AI.md) |
| Limpeza do repo | [`07-DX-DOCS-SEO.md`](07-DX-DOCS-SEO.md) §5 |
| Conteúdo de lançamento (trailer, blog posts) | [`06-LANCAMENTO.md`](06-LANCAMENTO.md) §5 |
| Planejamento dos próximos passos | sai da retro pós-lançamento |

**Por que cortar isso e não outra coisa:** nenhum desses sete itens muda o jogo. Todos
mudam a *percepção* dele — e a percepção só importa depois que existe algo estável para
mostrar. O erro clássico é gastar 3 dias em SEO para um jogo que trava no primeiro round.

---

## 2. O que a auditoria achou que você não sabia

Cinco coisas que mudam o plano, todas verificadas no código:

### 2.1 O `ViewModelRig` completo já está escrito — e nunca foi importado

`springs.js:94-252` tem uma máquina de estados de viewmodel inteira: idle com respiração,
sway com mola, bob que zera em 300ms, **reload em 5 fases com `magDrop`**, holster+draw com
troca de malha no ponto baixo do arco, ADS. Está documentado, tem teste dedicado
(`tools/eval/vmrig-test.mjs`) e tem invariante própria (`invariants.mjs:150-163`).

**`game.js` nunca o importa** — a linha 7 importa só `RecoilAxis`. A invariante RIG passa
verde testando código que não roda no jogo.

Você passou uma semana tentando fazer animação de arma. A animação boa já está no repo.

### 2.2 O recoil do viewmodel é 4x maior que o de qualquer FPS moderno

Simulação do `RecoilAxis(11, 0.5, 0.28, 0.3)` real (`game.js:1429`) com a cadência de cada arma:

| arma | pitch máximo do VM | pull em Z | coronha atravessa a lente? |
|---|---|---|---|
| AK | **17,1°** | 0,203 m | **sim** (z = +0,023) |
| FAMAS | 17,3° | 0,206 m | **sim** |
| TAVOR | 16,6° | 0,198 m | **sim** |
| AWP | **18,4°** (1 tiro só) | 0,219 m | **sim** |
| LMG | 17,8° | 0,212 m | **sim** (z = +0,033) |

CS2/Valorant ficam em **2-4°**. E a rotação é aplicada no `vm.root` (`game.js:3996`), cujo
origem está praticamente no olho — o próprio `springs.js:73-76` documenta que girar fora do
grip "é exatamente o que faz a mão soltar da arma".

Isso não é "as bullups têm recoil grande". **É todo o arsenal.** Você sentiu nas bullups e
snipers porque elas têm a coronha proporcionalmente maior, então estouram primeiro.

### 2.3 A causa raiz de "bot passa do lado e não atira" é uma linha

`game.js:4660`:
```js
const hasTurn = !(BOT_FAIR && e.isPlayer) || this._duelToken(b);
```

Essa `const` é avaliada **todo frame, para todo bot cujo alvo é o jogador**, antes de qualquer
gate de "pode atirar". E `_duelToken` (`game.js:4331-4342`) não consulta — ele **reserva** o
token por 1,6 s (`BOT_TOKEN_HOLD`).

Resultado: um bot que acabou de te ver e ainda está no atraso de reação **rouba um dos 2 tokens
e o segura 1,6 s sem disparar um tiro**. Um bot recarregando idem. Um bot sem linha de visão
idem. Os outros 6 recebem `hasTurn === false`, continuam avançando normalmente (o `approach`
das linhas 4565-4579 roda) e **atravessam seu campo de visão sem atirar**.

É literalmente a frase que você escreveu. A correção é mover a chamada para dentro do `if`,
como último termo.

### 2.4 O auditor de viewmodel mede uma versão do jogo que não existe mais

`tools/eval/vm-mint-audit.mjs:172-181` — a função `frame()` **não aplica `recuoZ`, não aplica a
trava `nearX`, e não soma `VM_OFF`**. E o `vm_mint_audit.json` foi gerado em 31/07 com
`V0deg 62` e `tanBarrel 0.2217`; o código de hoje (3.2.0) usa `V0 80` e `tanBarrel 0.30`.

As invariantes VM1-VM6 de `invariants.mjs:80-146` estão certificando um estado morto. Toda
medição de viewmodel que você fez desde então mediu a coisa errada. **Isso é pré-requisito
de tudo no plano `01`** — são três linhas de correção e custa 30 minutos.

### 2.5 A trava de borda manda no enquadramento, não o `recuoZ`

Em **10 das 18 armas medidas**, o `Zg` final é decidido pela trava de `game.js:1147`
(`nearX = 1.05`), não por `recuoZ · max(...)`. Mexer em `recuoZ` nessas armas não faz nada —
foi por isso que "afastar a arma" às vezes não teve efeito.

E o efeito é perverso nas bullups: TAVOR fica com `Zg = 0.453` e FAMAS `0.478` contra `0.420`
da AK. As duas armas **mais curtas** ficam as **mais longe** da lente, porque a coronha atrás
do grip é maior.

---

## 3. Ordem de execução

Ordem importa, e não é a ordem da sua lista. Cada item depende do anterior estar medido.

```
DIA 0  ├─ [2h]  P0-SEGURANÇA: os 2 furos do backend (§4)      ← faça hoje, antes de tudo
       └─ [30m] Consertar vm-mint-audit.mjs + regenerar JSON    ← desbloqueia toda medição

DIA 1  ├─ R1: recoil do viewmodel (ganhos ÷3, clamp sublinear, resíduo)
       └─ R2: VM_OFF vira angular; grip para de sair da tela na deagle/faca

DIA 2  ├─ R3: plugar o ViewModelRig (reload 5 fases, holster, draw, breathing)
       └─ R4: classe bullpup própria + _adsPose para sniper e faca

DIA 3  ├─ Bots: a linha 4660, o gate de yaw, audição do tiro do jogador
       └─ Verificação medida: botdiag + a métrica nova de "viu e não atirou"

DIA 4-5├─ UI/HUD contra as refs de issues/ui-nova/
       └─ Sons novos + mapa novo

DIA 6-10  Multiplayer 4v4 (plano 03) — 5 dias, destacável se o prazo apertar

DIA 11 ├─ Licença, GitHub Sponsors, LivePix, página de custos
       └─ Ads no próprio site + submissão a Playgama/CrazyGames

RELEASE
```

**Regra do Gauntlet que vale aqui:** nenhuma dessas linhas é "pronta" sem um número medido
antes e depois. O harness já existe para todas elas — está catalogado em cada plano.

---

## 4. P0-SEGURANÇA: faça isso hoje, antes de qualquer coisa

Dois furos encontrados na auditoria do backend. Os dois são exploráveis hoje, em produção.

### 4.1 A coluna `token` é publicamente legível — isso derruba toda a autenticação

`supabase/schema.sql`: a tabela `players` tem RLS com policy de leitura pública
(`select using (true)`). **RLS é row-level, não column-level.** Qualquer pessoa com a anon key
— que você expõe de propósito em `/api/config` — pode rodar:

```
select nick, token from players;
```

E daí submeter partidas em nome de qualquer jogador do ranking.

**Correção (15 min):**
- Trocar a policy de `players` para expor só as colunas públicas via **view** (`players_public`),
  e revogar o `select` direto na tabela para `anon`.
- Ou, melhor: guardar `token` **hasheado** (`sha256`), comparando no RPC.
- Enquanto isso não sobe: o multiplayer autoritativo (plano `03`) resolve por construção,
  porque o servidor passa a ser o único que escreve. Mas não espere por ele.

### 4.2 SSRF no gerador de badge

`/api/register` aceita `avatarUrl` do cliente validando só `typeof === 'string'` e tamanho.
Esse valor vai para `players.avatar_url`, e `src/pages/api/badge/[...path].png.ts` faz
`fetch(url)` **a partir do servidor Vercel**, sem allowlist de esquema ou host.

Alvo controlado pelo atacante, executado de dentro da sua infra.

**Correção (30 min):** allowlist de esquema (`https:` apenas) + allowlist de host
(`*.supabase.co`, `avatars.githubusercontent.com`, `*.licdn.com`) + timeout + limite de tamanho
de resposta. Rejeitar IPs privados.

### 4.3 Bônus barato no mesmo commit
- `submit_log` guarda **IP bruto** e o comentário promete retenção de 7 dias — **não existe job
  de limpeza**. Adicionar `pg_cron` ou apagar no próprio RPC.
- `/api/heartbeat` e `/api/avatar` não têm rate limit nenhum; `avatar.ts` aceita 3 MB de base64
  e roda `sharp`. Vetor de custo.
- Headers de segurança ausentes no `vercel.json` (CSP, X-Content-Type-Options, Referrer-Policy).

---

## 5. Critérios de "pronto" da v2

Sem isso verde, não lança. Cada um é medível com o harness que já existe.

| # | Critério | Como medir |
|---|---|---|
| V1 | Pitch máximo do viewmodel em rajada ≤ **6°** | simulação do `RecoilAxis` (plano 01 §3) |
| V2 | Coronha nunca com `z > -0.05` em nenhuma arma | `vm-mint-audit.mjs` corrigido |
| V3 | Grip entre **0,84 e 0,92 H** nas 26 armas, nos 2 aspectos | `vm-mint-audit.mjs` corrigido |
| V4 | Δ de enquadramento 16:9 vs 3:2 ≤ **0,03** | invariante VM4, com `VM_OFF` aplicado |
| V5 | Reload tem ≥ 3 fases visíveis e queda de carregador | `vm-quake-scen.mjs` |
| B1 | **0 casos** de "bot com LOS no jogador por >1,5 s sem disparar" | métrica nova no `botdiag.mjs` |
| B2 | Bot reage a tiro do jogador a ≤ 30 m | `botsim.mjs` |
| U1 | As 9 telas batem com `issues/ui-nova/` na estrutura | `g2ui-verify.mjs` (exit 1 em erro) |
| M1 | 4v4 com 4 clientes reais, 20 Hz, sem dessincronizar em 10 min | teste manual + log de reconciliação |
| S1 | Os 2 furos de segurança fechados | revisão manual |
| G1 | `node tools/eval/invariants.mjs` sai **0** | CI |

---

## 6. Sobre as lives (você perguntou)

Não é decisão minha, mas os dados do repo dizem uma coisa: **o `CHANGELOG` de 20/07 a 02/08
mostra 3 versões maiores em 13 dias.** Você produz muito. O gargalo do projeto não é volume de
trabalho — é que o trabalho não está sendo *medido*, então você refaz o viewmodel a cada 2 dias
(3.1.0 "Quake 4", 3.2.0 "CS 1.6", e agora de novo).

Live consome as horas em que você está mais produtivo e adiciona a restrição de falar baixo por
causa da sua filha. A alternativa que preserva o valor sem o custo: **grave sessões curtas
editadas** (10-15 min) em vez de 1h30 ao vivo. Você mantém o conteúdo, ganha a edição, e não
depende de estar acordado às 23h. E o conteúdo editado viaja melhor para a audiência
internacional que você quer construir (plano `06` §4) — live de 1h30 em português não viaja.

---

## 7. Sobre estar desempregado, e o que este projeto realmente é

Vale dizer isso direto, porque muda a priorização: **um FPS de navegador com memes brasileiros
não sinaliza "engenheiro de IA" para um recrutador dos EUA.** Sinaliza "bom com gráficos web,
entrega produto, tem audiência". São coisas boas, mas não são o que abre a vaga de 100k+.

O que converte esse projeto em sinal de IA é o **conteúdo técnico medido** que sai dele — e você
já tem o material bruto mais raro que existe: um harness de ~106 ferramentas de avaliação
headless, três modelos trabalhando em paralelo em worktrees, e um custo real de US$ 500 que
você pode decompor.

Isso está detalhado no plano `06` §5, e o post #2 de lá ("Bots de FPS com LLM: latência, custo,
e por que 90% das ideias óbvias não funcionam") é, na minha leitura, o item de maior retorno de
carreira do plano inteiro. Ele vira proposta de palestra direto — e o **AI Engineer Code Summit
tem CFP aberto até 11/10/2026, com viagem e hotel cobertos**.

O jogo é o veículo. O conteúdo é a carga.
