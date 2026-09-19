# MULTIPLAYER — servidor autoritativo, o que foi construído e o que custou caro

> **Como usar:** cole o `00-CONTEXTO-CORO-SOLTO.md` primeiro, depois este arquivo.
> A seção final (§9) é o pedido de pesquisa.
>
> **Procedência (revisão de 19/09):** o servidor vive em `corosolto/backend` (privado), pasta
> `game/`; o estado descrito aqui é o do PR #28 (13/09, branch `claude/br2-fora`). No cliente,
> as fontes são `docs/MULTIPLAYER.md`, `docs/historico/plans/03-MULTIPLAYER-4V4.md` e
> `KNOWN-BUGS.md` (BUG-151/152). Números que só existem em banco ou em sessão de trabalho
> estão marcados "sem arquivo".

---

## 1. A decisão, e a decisão que foi revogada antes dela

Em 04/08/2026 existia um plano escrito de **4v4 com servidor autoritativo**. Ele foi
**revogado** naquele dia em favor de **WebRTC P2P com servidor do usuário**. Quatro semanas
depois (cliente PR #483 em 30/08; backend PRs #5–#12 em 02/09), o que efetivamente entrou em
produção foi o **servidor autoritativo sobre WebSocket binário** — ou seja, o plano revogado
tinha razão, e a volta custou tempo.

Os argumentos daquele plano continuam válidos e vale citá-los porque explicam o desenho atual:

- **Lockstep:** exige determinismo bit-a-bit e impõe input delay obrigatório. Descartado.
- **P2P host-authoritative:** o host tem 0 ms de ping e todo mundo tem o dobro; host-migration
  em FPS é uma bagunça; **e o host é o cheater potencial**.
- **WebRTC/geckos.io:** exige abrir faixa de portas UDP, o que elimina as PaaS baratas
  (Render, Railway, Cloudflare, Deno Deploy, Vercel), e ~15–25% das conexões precisam de
  TURN. O ganho de 10–30 ms num 4v4 casual não paga a complexidade de NAT.
- **WebTransport:** é o que se quereria em 2027; o ecossistema Node ainda é imaturo.
- **Escolha: WebSocket binário, servidor próprio, tick fixo** (o plano dizia 20 Hz; produção
  anda a 60 Hz de simulação / 30 Hz de broadcast). Trade-off honesto do TCP: head-of-line
  blocking — com snapshot interpolation e buffer de ~100 ms, um pacote perdido causa um
  hiccup de ~1 RTT.

Três achados daquele plano que mudaram o escopo do trabalho:

- `_updatePlayer` e `_collide` têm **zero** `Math.random()` — **o movimento do jogador já era
  determinístico e ninguém sabia**.
- O escopo de "semear 83 `Math.random()`" estava errado: são **4** call-sites que afetam
  acerto (spread e recoil).
- **Um humano remoto É um bot com a IA desligada** — já existiam todos os campos. Não havia um
  sistema de "outro jogador" para escrever.

## 2. O princípio central: não existe segunda simulação

> "O multiplayer **não é um modo paralelo**. É o mesmo jogo do single-player com a autoridade
> do lado do servidor."

O servidor roda a **classe `Game` de verdade, headless**, pelo mesmo stub de DOM/THREE que o
simulador de bots já usava. **Isso não é elegância:** se a física do servidor fosse uma segunda
implementação, ela e a predição do cliente divergiriam a cada passo e o jogo viveria em
rubber-band.

Por isso três funções foram **extraídas** (não reescritas) para serem chamadas dos dois lados:

| Função | De onde saiu | Por quê |
|---|---|---|
| `_moveEntity(p, inp, dt)` | de dentro do `_updatePlayer` (315 linhas; o doc oficial diz 86 extraídas) | o servidor aplica a MESMA física |
| `_shotDamage(dmg, wid, dist, head)` | inline no `_fireHitscan` | o servidor decide o dano com a MESMA conta |
| `_respawnEntity(b)` | dentro do `_updateBot` | corpo de gente não tem IA |
| `mapcat.js` | tabelas dentro do `main.js` | o servidor precisa do MESMO recorte de catálogo |

**A extração é congelada por uma régua golden** (`tools/eval/movimento-golden.mjs`): grava a
trajetória do jogador em 2 mapas (`praca_poderes`, `piscinao_ramos`), com roteiro de teclas
cobrindo strafe, counter-strafe, corrida, agachar, pulo e atrito, RNG semeado, e reprova em
divergência acima de **1e-6**. Foi gravada **antes** da extração e passa **depois**, byte a
byte. **A mutação que prova que ela morde:** `--mutar=0.01` na aceleração do chão (92 → 92.01)
produz divergências (o doc oficial diz 14; a saída não está gravada em lugar nenhum).

## 3. `dedicated`: o manequim imortal

O `Game` sempre constrói um `this.player`. Num servidor **ninguém o controla**. Deixá-lo em
campo cria **um corpo parado e imortal que os inimigos abatem em loop** — placar envenenado, e
o tal "bot bugado ali" que aparecia nas partidas.

Com `dedicated: true` ele fica fora do elenco: não entra no scoreboard, não é alvo, não é
atualizado — e o lado aliado leva `teamSize` corpos inteiros em vez de `teamSize - 1`. É isso
que faz uma sala ter **exatamente** o número de vagas configurado. O **espectador** usa o mesmo
mecanismo: sem ele, o cliente teria nove bots locais para as dez entidades do servidor e um
jogador ficaria invisível.

## 4. Afinidade de sala e por que região é peça de primeira classe

Uma sala é **uma simulação de física a 60 Hz que vive inteira dentro de um processo**. Escalar
é subir mais nós e mandar o jogador para o nó certo — **nunca compartilhar estado** (Redis e
afins): o mundo anda 60×/s e trafegar isso entre instâncias custaria mais que simular.

Um nó só em São Paulo dá ~120 ms para o leste dos EUA e ~180 ms para Portugal (estimativa do
`docs/MULTIPLAYER.md`; o canário de produção registrou RTT p95 de 209 ms e um PR do backend
cita ~170 ms EU/US). **Nenhum netcode conserta distância** — a lag compensation só empurra o
problema para o outro lado (você morre atrás da parede). A saída é ter nó perto e **deixar o
jogador ver o ping antes de entrar**, como a coluna de ping do server browser do CS.

Em produção: **3 nós** — `br` (São Paulo), `us` (Carolina do Sul), `eu` (Madri). Salas com
código tipo `BR-7K3M` e link de convite, **ticket assinado de uso único**, espectador do lado
do servidor, lag-comp travada em **0,25 s**. Acrescentar região é acrescentar uma linha e subir
a VM com o mesmo script de deploy.

## 5. Protocolo

- **HTTP (lobby):** `GET /health` · `GET /maps` · `GET /rooms` · `POST /rooms` (mais
  `GET /metrics` e `GET /sala/<codigo>`).
- **WS:** `/ws?room=&pw=&nome=&team=` (+ `ticket=`) → `welcome` (uma vez, **com o roster da
  partida**) + `snapshot` a **30 Hz** (a simulação anda a **60 Hz**; só o broadcast é 30).
- Formato preferido **`coro-snapshot-v5`** desde 12/09 (reboque privado, vizinho quantizado);
  o handshake negocia **v5/v4/v3/v2** binários. **JSON v1 não é mais aceito.** Cada slot
  recebe o último `seq` processado e arma/pente/reserva/recarga/slots autoritativos.
- Cliente → servidor: `input`, `ping`, `time` (pedir vaga num lado), `espectar`, `leave`,
  `client_stats`. Pickup e reload são **intenções dentro do `input`**.

### 5.1 A lição de netcode mais cara: o comando tem DURAÇÃO

> Predizer e reconhecer têm que medir **o mesmo intervalo**, senão a reconciliação compara duas
> poses tiradas em instantes diferentes e **empurra o jogador por uma divergência que não
> existe**.

Era exatamente o estado anterior: o cliente predizia o passo do **frame dele** (≤50 ms) e o
servidor aplicava aquele mesmo input **a cada tick de 16,7 ms**, reconhecendo o `seq` no momento
em que ele **chegava**. A conta saía errada em 1 a 4 ticks, **e o erro crescia com o frame
time** — quem tinha máquina fraca era punido duas vezes.

O conserto tem três partes:

1. O input carrega `dtms`, a **duração daquele passo**, com teto de 50 ms.
2. O nó mantém uma **fila de comandos por slot** e, a cada tick, gasta o que couber num
   **orçamento que só cresce com o tempo real** (folga de 250 ms). **É o orçamento que impede
   que declarar `dtms` vire speedhack:** mandar mil comandos anda o que o relógio deixou, não
   mil vezes.
3. **Slot sem comando na fila NÃO anda.** Repetir o último adiantava o corpo e cobrava a
   diferença de volta no ack seguinte — overshoot e puxão.

**Resultado medido, com rede perfeita e a mesma física dos dois lados** (`KNOWN-BUGS.md`
BUG-152, backend PR #24): correção p95 de **0,051 m → 0,001 m a 60 FPS** e de **0,263 m →
0,001 m a 20 FPS**. Em rede simulada realista (120 ms, jitter 30 ms, 3% perda): 0,304 →
**0,091 m**. Quem mede isso (`game/netloop-check.mjs`) roda a `Room` de verdade contra o `Game`
de verdade ligados por uma rede simulada, e tem **7 mutantes** (`dt`, `ack`, `ancora`,
`empurrao`, `virada`, `ordem`, `quantiza-dono`) que devolvem cada um dos defeitos.

### 5.2 Outros três consertos que valem como princípio

- **Corpo com dono não é empurrado por sistema nenhum do servidor.** A despenetração de corpos
  da IA escrevia na posição do humano, e isso chegava ao cliente como **correção pura**.
- **Snapshot é estado substituível.** Se um socket acumula mais de 256 KiB pendentes, o nó pula
  o snapshot velho e volta no estado mais novo quando a fila drena. Enfileirar posições
  obsoletas só transforma conexão lenta em latência crescente. (Eventos continuam confiáveis.)
- **RTT é medido por ping/pong no próprio WebSocket.** O módulo antigo media por `fetch
  /health`: outra conexão, outro caminho, sem a fila do WS — **um número bonito e errado
  justamente quando o socket está congestionado, que é quando importa.**
- **O elenco vem no `welcome`,** e o casamento de ids no cliente é **por personagem, não por
  time**. Sortear o próprio elenco fazia cada jogador ver bonecos diferentes, e o nome do
  killfeed não batia com o rosto na tela.

## 6. Espectador e salas

Servidor cheio **não dá porta na cara**: você entra, assiste em primeira pessoa, e o botão
"ENTRAR NO TIME" acende quando abre vaga. A câmera anda sozinha para outro vivo quando o alvo
morre — **ficar preso num defunto é o defeito clássico do modo espectador**.

Quando um jogador sai ou vira espectador, **o corpo volta a ser bot**, para a partida manter o
tamanho configurado em vez de ficar com um manequim parado. Socket que não responde ao
heartbeat perde o slot após **45 s**; socket vivo sem input, após **300 s**.

As salas da casa ficam de pé para sempre (2 por padrão: `funk-x-palhaco` e `captura`), usam
3v3 por padrão e giram mapa a cada partida, com a rotação saindo do catálogo do jogo —
**mapa novo entra sozinho**.

## 7. O incidente que mais custou: a frota rodando código de semanas atrás

Sintoma relatado pelo dono: *"matei 3x o mesmo bot pra ele morrer"* e os bots pareciam perdidos
(relato de sessão; o mais próximo no repo é BUG-102, 02/09, "bots não morrem sob tiro").

**Causa (backend PR #24, 11/09):** a imagem em produção fixava o cliente em `alpha.206`
enquanto o site servia `alpha.247`; `_moveEntity` já divergia e os mapas novos não existiam no
multiplayer. **Servidor e cliente eram jogos diferentes.** (A versão anterior deste documento
dizia "411 commits / 96 de física / game.js 429 linhas diferente" — esses números não estão em
nenhum arquivo, PR ou relatório; use "alpha.206 vs alpha.247".)

**Como foi resolvido (12–13/09):** `deploy/atualizar-nos.sh` faz rolagem **canária, um nó por
vez** (`us → eu → br`), espera `players: 0`, verifica `/health` entre nós e aborta na falha.
Validação da candidata antes do rollout registrada nos PRs #24 e #26 (netloop 21/21 → 29/29,
smoke 97/97 → 98/98, protocolo 10/10, runtime 8/8, telemetria 41/41, dispersão 15/15,
proveniência 19/19 — a versão anterior somava "190 asserções"; a soma não fecha com nenhum
dos dois PRs).

**O buraco que ficou aberto, dito com precisão:** o `deploy.yml` do backend **só publica a
API** (Cloud Run) e não roda teste; os **nós de jogo saem por deploy manual** (`cloudbuild` +
`atualizar-nos.sh`), e a imagem tem um portão de build (`RUN node cliente-contrato.mjs`) mas
**ninguém é obrigado a subir o `CLIENT_REF` fixado no Dockerfile**. Foi isso — não a ausência
de testes — que permitiu a defasagem existir. As réguas de netcode (`eval:netloop`,
`eval:dispersao`, `eval:contrato`, `eval:transporte`) **já estão** no `npm run portao` do
backend desde o PR #26; o bench não está.

## 8. Capacidade real vs. documento — e o custo de confundir métricas

- **Documento oficial afirma ~199 salas/core e ~280 em 2 cores** (`docs/MULTIPLAYER.md`,
  0,084 ms/tick, 5v5, conta já a 60 Hz). O `bench.mjs` comenta que a **versão anterior
  dividia por 20 Hz** (o broadcast de então) e prometia 3× mais salas. A versão anterior deste
  documento afirmava "bench real mede 84/core e 118 em 2 cores, 2,4× otimista" — **esses
  números não existem em nenhum arquivo, PR ou artefato**; o bench imprime `salasPor1Core` mas
  nenhuma saída foi gravada. Trate a capacidade como "não medida com registro".
- O teto que limita antes da CPU não é CPU: é o limite configurado de salas por usuário
  (`MAX_SALAS_USUARIO = 40` × 10 jogadores + 2 salas oficiais 3v3 ≈ **412 jogadores/nó**).
- **Demanda real, medida no banco em 13/09 (janela de 14 dias):**

| nó | pico **simultâneo** | média simultânea | entradas | salas criadas |
|---|---:|---:|---:|---:|
| `br` | **12** | 0,13 | 395 | 59 |
| `eu` | 4 | 0,06 | 80 | 35 |
| `us` | 1 | 0,00 | 20 | 30 |

- **~184 partidas autoritativas no total** e `slots_to_bot` **65 de 66** (dados de banco, sem
  extrato versionado; a métrica existe em `api/mp-metrics.ts`) — as salas estão vazias; quase
  todo slot humano vira bot.
- **Armadilha de métrica que custou dinheiro:** o painel de admin **não mostra pico
  simultâneo** — o número dele é o **total da janela**. Confundir os dois levou à criação de
  uma segunda VM brasileira (`br2`, 12/09) apagada no dia seguinte (13/09, ~US$26/mês).
  **Três nós pequenos atendem a demanda real com folga de ordem de grandeza.**

**Conclusão honesta:** o multiplayer está tecnicamente correto e **comercialmente vazio**. O
gargalo do jogo não é capacidade nem netcode — é **retenção** (D7 = 0%, mediana de partida de
108 s).

---

## 9. O QUE EU PRECISO DE VOCÊ (o pedido de pesquisa)

Você é um **engenheiro de netcode e de live ops de FPS multiplayer**. O código funciona; o
problema é que **ninguém está lá**.

1. **O problema do lobby vazio.** 184 partidas no total, pico de 12 simultâneos, 65 de 66 slots
   virando bot. **Qual é a sequência de arranque para um FPS multiplayer pequeno?**
   Matchmaking por horário marcado, preenchimento com bots declarado abertamente, fila única
   global em vez de 3 regiões, salas persistentes com gente dentro? O que funcionou em jogos
   indie comparáveis (.io, Krunker, Shell Shockers, Diabotical) e o que notoriamente falhou?

2. **Bots como ponte, não como disfarce.** Nós preenchemos com bots automaticamente. **Qual é a
   prática honesta?** Mostrar que são bots? Escondê-los? Existe evidência de dano à retenção em
   qualquer das duas escolhas?

3. **Três regiões com demanda de uma.** Temos nó no BR, US e EU, e US/EU estão praticamente
   ociosos, o que **fragmenta ainda mais uma base já pequena**. **Consolidar num nó só e
   aceitar ping alto, ou manter e aceitar salas vazias?** Existe alguma referência sobre o
   ponto de corte em que região deixa de valer a fragmentação?

4. **Partida de 108 segundos.** Nossa mediana de partida é quase dois minutos e 73,7% terminam
   em `quit`. **Isso é sintoma de formato (rounds longos demais, tempo de espera, morte sem
   respawn rápido) ou de conteúdo?** Que formato de partida maximiza a chance de um segundo
   round num jogo de navegador sem cadastro?

5. **Paridade servidor↔cliente sem processo.** A imagem dos nós fixa uma versão do cliente
   (`CLIENT_REF`) que ninguém é obrigado a atualizar; o deploy dos nós é manual; foi assim que
   a frota ficou em `alpha.206` com o site em `alpha.247` por semanas. **Como um time pequeno
   garante paridade servidor↔cliente?** Versão de protocolo negociada no handshake (já
   temos v5/v4/v3/v2)? Rejeitar cliente fora de faixa? Canary obrigatório disparado pela
   release do cliente? Qual é o mínimo viável que realmente pega esse tipo de defasagem?

6. **A régua golden de movimento.** Nós congelamos a física extraída com um teste que grava
   trajetória e reprova acima de 1e-6, com mutação provada. **Isso é prática comum em netcode?**
   Existem técnicas melhores para garantir que a física do servidor e a do cliente não divirjam
   ao longo de meses de mudanças?

7. **Referências.** Aponte artigos, talks ou repositórios sobre reconciliação cliente-servidor
   com **input de duração variável** (o nosso `dtms` + orçamento de tempo real). O material
   clássico (Valve, Gabriel Gambetta, Glenn Fiedler) assume tick fixo no cliente — **preciso do
   material que trata do caso do navegador, onde o frame time varia e o jogador com máquina
   fraca não pode ser punido duas vezes.**
