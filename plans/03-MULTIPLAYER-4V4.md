# ⚠️ ESTE PLANO ESTÁ REVOGADO — 04/08/2026

A decisão do dono é **WebRTC P2P com servidor do usuário**, e este arquivo defende o
contrário (a §1 abaixo se chama "Por que servidor autoritativo e não P2P"). Multiplayer
também subiu para **P0 do alpha**.

**O plano novo, completo, foi escrito e está no histórico da sessão de 04/08** — 11 seções,
com duas medições próprias no `botsim.mjs` (0,29 ms/tick para 4v4 com 7 bots; simulação
byte-idêntica com a mesma semente), banda derivada campo a campo (snapshot de 167 B, host
sobe 36 kB/s), custo de TURN calculado, decisão de ranking, e 8 invariantes NET1-NET8 com a
mutação de cada uma. **Ele ainda não foi gravado neste arquivo** porque o agente que o
produziu era read-only e a sessão principal ficou sem contexto para transcrevê-lo.

**Próxima sessão: transcreva-o para cá antes de escrever qualquer linha de netcode.**

Três achados dele que valem mesmo sem o documento:
- `_updatePlayer` (`game.js:4387-4701`) e `_collide` (`:4241-4262`) têm **zero**
  `Math.random()` — o movimento do jogador já é determinístico e ninguém sabia.
- O escopo de "seedar 83 `Math.random()`" estava errado: são **4** call-sites que afetam
  acerto (spread `:2779`/`:2783`, recoil `:2725`/`:2726`).
- Um humano remoto **é** um bot com a IA desligada (`game.js:762-771` já tem todos os campos,
  faltam `pitch` e `vel`) — não há sistema de "outro jogador" para escrever.

---

# MULTIPLAYER 4v4 — SERVIDOR AUTORITATIVO

> **Decisão do dono: 4v4 com servidor autoritativo.** 3-5 dias.
> Este plano é **destacável**: se o prazo apertar, corte-o inteiro e lance a v2 single-player.
> Nada nos outros planos depende dele.

---

## 1. Por que servidor autoritativo e não P2P

**Você já tem o ativo mais caro do projeto e não sabia.**

`tools/eval/botsim.mjs` (18 KB) roda **a classe `Game` real, com os mapas reais, em Node puro**
— DOM e canvas stubados, three vendorizado, `_updateBot` de produção. Ou seja: a simulação já
roda headless server-side hoje. O caminho mais curto para um servidor autoritativo é
**generalizar esse stub num processo de sala**, não reescrever a engine.

As alternativas, e por que não:

- **Lockstep** — exige determinismo bit-a-bit. Seu loop tem `dt` variável e 83 `Math.random()`.
  Semanas de trabalho para ganhar nada num FPS (lockstep tem input delay obrigatório).
- **P2P host-authoritative** — o host tem 0 ms de ping e todo mundo tem o dobro; host-migration
  em FPS é uma bagunça; e o host **é** o cheater potencial.
- **WebRTC/geckos.io** — exige abrir faixa de portas UDP, o que elimina Render, Railway,
  Cloudflare, Deno Deploy e Vercel. E ~15-25% das conexões precisam de TURN. O ganho de 10-30 ms
  num 4v4 casual não paga a complexidade de NAT. (Se um dia precisar: Cloudflare Realtime TURN
  dá 1.000 GB/mês grátis.)
- **WebTransport** — virou Baseline em março/2026 (Safari 26.4 fechou o ciclo). É o que você
  quereria em 2027. Hoje o ecossistema Node é imaturo e nenhuma PaaS barata expõe QUIC
  trivialmente. Fica no roadmap.

**Escolha: WebSocket binário sobre `ws`, servidor próprio, tick fixo 20 Hz.**
Trade-off honesto do TCP: head-of-line blocking. Com snapshot interpolation e buffer de ~100 ms,
um pacote perdido causa um hiccup de ~1 RTT. Para 4v4 casual é aceitável — o Krunker rodou anos
assim (e o Krunker também é Three.js).

---

## 2. Hospedagem: os números

| Plataforma | Preço | Serve? |
|---|---|---|
| **Hetzner CX22** (2 vCPU, 4 GB) | **~€4,35/mês** + IVA, banda generosa inclusa | ✅ **recomendado** |
| Fly.io shared-cpu-1x 512 MB | $3,19/mês + egress $0,02/GB | ✅ mas egress cobra |
| Railway Hobby | $5/mês + **egress $0,05/GB** | ⚠️ egress 2,5× o Fly |
| Render Free | spin down após 15 min de inatividade, 5 GB de banda | ❌ inutilizável |
| Cloudflare Durable Objects | game loop a 20 Hz **nunca hiberna** → ~$5,60 por 1.000 horas-sala | ⚠️ paga sala ociosa |
| Supabase Realtime Free | **100 msgs/s** — uma sala 4v4 a 20 Hz estoura sozinha | ❌ |
| Vercel WebSocket (beta) | máx 5 min, sem broadcast entre instâncias | ❌ |

**Conta para 10.000 jogadores/dia** (3 partidas de 10 min = 30 min/dia):
- CCU médio ≈ 208; pico 3-5× → **600-1.000 CCU**, ou **75-125 salas simultâneas**
- Snapshot binário de 8 jogadores ≈ 160-250 B. A 20 Hz = **~4 KB/s por cliente**
- Banda: 5.000 player-horas × 4 KB/s = **~72 GB/dia ≈ 2,2 TB/mês**
  - Hetzner: **incluso**. Fly.io: ~$44/mês. Railway: ~$110/mês.
- CPU: **você pode medir isso hoje** — rode 1 tick da `Game` 10.000× em Node e tire o ms/tick.
  Se der 0,5 ms/tick: 125 salas × 20 Hz × 0,5 ms = **1,25 core**. Um CX22 (2 vCPU) segura.

**Conclusão: 1 VPS de ~€5/mês serve 10 mil jogadores/dia.** Comece com 1 processo; escale com
`cluster`/PM2 (1 processo por core, salas fixadas por processo) antes de pensar em multi-máquina.

---

## 3. O que precisa mudar na simulação

**Estado atual verificado:** zero código de rede no jogo. Busca por
`websocket|socket.io|webrtc|RTCPeer|peerjs|netcode|snapshot|rollback|tick rate|geckos|colyseus`
em `public/js/**`, `src/**`, `tools/**`: **0 ocorrências**. As únicas menções estão em docs de
skills de terceiros e em intenções no `ROADMAP.md:105` e `IDEAS.md:71-73`.

### 3.1 Fixed timestep — obrigatório

`main.js:1385-1386`:
```js
const dt = Math.min(0.05, clock.getDelta());   // dt variável, atrelado ao refresh rate
```
**Sem isso, prediction não reconcilia** — cliente e servidor dão passos diferentes e divergem
imediatamente.

```js
// alvo
let acc = 0;
const DT = 1/60;
function loop() {
  acc += Math.min(0.25, clock.getDelta());
  while (acc >= DT) { game.step(DT); acc -= DT; }
  game.render(alpha = acc / DT);
}
```
Isso é o "Fix Your Timestep!" do Gaffer on Games. **Valide rodando o `botsim.mjs` e comparando
o comportamento dos bots antes e depois** — você tem o harness exatamente para isso.

### 3.2 Seedar o RNG

**83 chamadas a `Math.random()` em `public/js/game.js`** (spread, recoil jitter, skill de bot,
roam, granada, spawn). Existem 3 LCGs com seed fixa no repo (`game.js:1468`, `:2990`, `:3043`,
`bloom.js:257`) mas são para **texturas e decals**, não para simulação.

Não é para determinismo total — é para que spread e recoil sejam decididos **no servidor** e
enviados, em vez de sorteados no cliente. Um `mulberry32(seed)` global de módulo + regex nos 83
call-sites: ~20 minutos.

### 3.3 Mover dano para o servidor

`_fireHitscan()`, `_damage()`, `_kill()` são client-side hoje. Cliente passa a mandar
`{tick, aimDir, shoot: true}`; servidor faz o raycast. Cliente mostra tracer/flash otimista.

### 3.4 Separar `Game` de `Renderer`

`Game.update(dt)` (`game.js:5293`) chama `this.renderer.render` no final. O `botsim.mjs` já
contorna isso com stub; formalize a separação.

### 3.5 O ponto de costura

Dentro de `update(dt)` a ordem é: `_updatePlayer(dt)` → `for (const b of this.bots)
this._updateBot(b, dt)` → pickups → fx → doors → grenades → hud → radar → render.

**O array `this.bots` é a costura de rede.** Entidades remotas substituem bots, e `_updateBot`
vira "aplicar snapshot + interpolar" em vez de "rodar IA". E os bots que sobram **continuam
sendo bots**, preenchendo slots vazios — isso resolve o problema clássico de "sala vazia = jogo
morto" com IA que você já tem pronta.

---

## 4. As quatro técnicas, em JS

Leitura obrigatória antes de escrever qualquer linha: **Gabriel Gambetta, série "Fast-Paced
Multiplayer"** (4 partes + demo interativa em JS). É literalmente o seu caso.
https://www.gabrielgambetta.com/client-server-game-architecture.html

**a) Client-side prediction (só do jogador local)**
```js
input = { seq: ++seq, dt: DT, move, look, buttons };
pending.push(input);
applyLocalMovement(me, input);   // MESMO código do servidor
send(input);
```

**b) Server reconciliation.** Servidor devolve `{lastProcessedSeq, authoritativeState}`:
```js
me.state = authoritativeState;
pending = pending.filter(i => i.seq > lastProcessedSeq);
for (const i of pending) applyLocalMovement(me, i);   // replay
```
Só teleporte visualmente se o erro > ~10 cm; abaixo disso, corrija com smoothing exponencial.

**c) Entity interpolation (todos os outros).** Renderize os remotos **~100 ms no passado**
(2 snapshots a 20 Hz).

Biblioteca pronta, e ela é **standalone** (não precisa do geckos.io) e tem bundle CDN —
perfeito para o seu "zero build" no jogo:
```html
<script src="https://unpkg.com/@geckos.io/snapshot-interpolation@1.0.1/bundle/snapshot-interpolation.js"></script>
```
API: `SI.snapshot.create()`, `SI.snapshot.add()`, `SI.calcInterpolation('x y z q(rotation)')`,
e o `Vault` para histórico.

**d) Lag compensation.** Ring buffer de ~1 s de posições. Ao processar um tiro, rebobina as
hitboxes para `serverTime - RTT/2 - interpolationDelay`, faz o raycast lá, restaura.
**Limite o rewind a 200-250 ms** — acima disso vira o exploit "morri atrás da parede".
O `Vault` serve para isso também.

**Formato de wire:** não mande JSON a 20 Hz. `DataView`/`ArrayBuffer`, posição em int16 (cm),
ângulos em int8/int16, flags em bitmask. 8 jogadores em ~200 bytes.
(Mas mande JSON no dia 1 e otimize depois — não otimize antes de funcionar.)

---

## 5. Os 5 dias

### Dia 1 — Servidor
1. `npm i ws` **no repo do harness, não no jogo** (o jogo continua zero-build).
2. Refatorar o loop para tick fixo com acumulador (§3.1). Validar com `botsim.mjs`.
3. Substituir os 83 `Math.random()` por `rng()` seedado (§3.2).
4. Medir `ms/tick` com 8 jogadores → dimensionar o VPS.
5. Servidor: `Map<roomId, Game>`, `setInterval(tick, 50)` (20 Hz) + acumulador interno a 60 Hz,
   broadcast de snapshot **JSON** (otimiza depois).

### Dia 2 — Protocolo e cliente
6. Cliente envia `{seq, dt, keys, yaw, pitch, shoot}` a 30 Hz.
7. Remotos: `@geckos.io/snapshot-interpolation` via CDN, buffer de 100 ms.
8. Local: prediction + reconciliation com replay.
9. Bots rodando **no servidor**, preenchendo slots vazios.

### Dia 3 — Matchmaking mínimo
10. `GET /join` devolve o `roomId` com vagas, ou cria uma. **Sem lobby, sem UI complexa.**
    Sala com bots preenchendo → jogador entra e já está jogando.

### Dia 4 — Deploy + ranking seguro
11. Dockerfile de 8 linhas, deploy no Hetzner. Caddy na frente para TLS —
    **`wss://` é obrigatório** porque o site é HTTPS.
12. **Mover a escrita no Supabase para o servidor** com `service_role`, e travar a tabela com
    RLS negando `INSERT` do anon. **Isso sozinho conserta o ranking forjável** (ver
    `00-RELEASE-V2.md` §4.1).

### Dia 5 — Polimento
Ping no HUD, kill feed vindo do servidor, reconexão, binário se sobrar tempo.

---

## 6. Anti-cheat: o que é realista

**Verdade desconfortável: num jogo web aberto, o cliente é território inimigo e sempre será.**
O Krunker usa WebAssembly compilada de Rust, gera código dinamicamente em runtime, checa
tampering do `Function` constructor e randomiza nomes de variável por sessão — e foi wallhackado
por uma pessoa num fim de semana ([teardown do jakob.space](https://jakob.space/blog/browser-games-aren-t-an-easy-target.html)).
**Ofuscação compra tempo, não segurança. Não gaste seus dias nisso.**

O que funciona, em ordem de retorno:

1. **Autoridade total de servidor sobre dano, vida, munição e morte.** Nunca aceite "eu matei o
   X"; aceite "eu atirei nesta direção neste tick". Mata ~90% dos cheats triviais.
2. **Validação de movimento** — velocidade máxima, delta de posição por tick, teleporte.
3. **Rate limiting no input** — máximo N inputs/s, sequências fora de ordem descartadas,
   cadência de tiro validada em ticks de servidor, não em ms do cliente.
4. **Bounds no rewind** — 200-250 ms, rejeitar `clientTime` fora de janela plausível.
5. **Sanity de mira** — logue variação angular por tick. Snap de 180° seguido de headshot é
   assinatura. **Comece só coletando telemetria, não banindo.**
6. **Ranking assinado pelo servidor** — o item mais importante da lista para você, porque hoje o
   ranking é o único ativo persistente e é forjável.
7. **Não invista** em ofuscação pesada, detecção de devtools, integrity check de WASM.

Aimbot e wallhack **vão existir**. Aparência de jogo justo em 4v4 casual vem de autoridade de
servidor + report/kick por voto + salas privadas por link para quem quer jogar sério.

---

## 7. Para ler / estudar

| Recurso | Por quê |
|---|---|
| [Gambetta — Fast-Paced Multiplayer (4 partes + demo JS)](https://www.gabrielgambetta.com/client-server-game-architecture.html) | **Leia isto primeiro.** É o seu caso exato |
| [Gaffer — Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) e [State Synchronization](https://gafferongames.com/post/state_synchronization/) | O acumulador e o formato de snapshot |
| [Valve — Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking) e [Lag Compensation](https://developer.valvesoftware.com/wiki/Lag_Compensation) | A referência original de rewind |
| [jakob.space — Browser Games Aren't an Easy Target](https://jakob.space/blog/browser-games-aren-t-an-easy-target.html) | Teardown do Krunker. **É o precedente exato de "Three.js + servidor JS + 4v4 dá certo"** |
| [github.com/nickyvanurk/3d-multiplayer-browser-shooter](https://github.com/nickyvanurk/3d-multiplayer-browser-shooter) | three.js + `ws`, a estrutura de projeto mais próxima do que você quer |
| [diep.io protocol (engenharia reversa documentada)](https://github.com/FlorianCassayre/diep.io-protocol) | Excelente para aprender quantização e packing binário |
| [miwarnec/Game-Networking-Resources](https://github.com/miwarnec/Game-Networking-Resources) | Lista curada |

**Se um dia quiser trocar de transporte:** escreva o transporte atrás de uma interface
(`send`/`onMessage`). O código de prediction/interpolation é reaproveitável; só o transporte
muda. Isso vale ainda mais se você decidir fazer um MVP 1v1 com Trystero antes.
