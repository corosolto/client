# Chat de sala - contrato v1 (issue #686)

Documento técnico e fonte da verdade para os dois implementadores: o navegador
(`corosolto/client`, `public/js/`) e o nó autoritativo (`corosolto/backend`, `game/`).
Quando este doc e o plano da issue divergirem, vale este doc. Quando este doc e o código
divergirem, o código está errado ou o doc precisa de PR: a régua `eval:chat` do client
compara a tabela de limites daqui com `CHAT_LIMITES` exportado, então os dois só mudam juntos.

Para o resto da fronteira de segurança, leia [`seguranca.md`](seguranca.md). O §9 de lá
(identidade por UID) é o que faz o `uid` nunca poder aparecer no chat.

Linhas de código citadas aqui foram conferidas em 28/09/2026 contra `origin/main` dos dois
repositórios. Linha muda; o comportamento descrito é o que vale.

## 1. Ativação e ordem de ativação

- O nó lê `MP_CHAT` e só liga o chat com o valor `'1'`. O padrão é `0`. O
  `deploy/startup.sh` lê o valor da metadata da instância (função `meta`, como já faz com
  `MP_METRICS_URL` e `MP_SNAPSHOT_HZ`), com padrão `0`.
- **Com o chat desligado, nada muda no nó:**
  - não há campo `chat` no `welcome` nem na `partida`;
  - não há `'chat'` em `features` de `/health` e `/metrics`;
  - `chat` e `chat_report` que chegarem são descartados, como qualquer tipo desconhecido é hoje
    (o `ws.on('message')` de `game/index.js` não tem ramo de erro para tipo desconhecido).
- **O cliente fica inerte sem `net.meta.chat`:** não desenha painel, não abre com Y/U, não
  envia nada. `enviarChat` e `denunciarChat` devolvem `false`. Cliente novo com nó velho e
  nó novo com cliente velho são combinações seguras: o `trata` de `net.js` ignora tipo que
  não conhece (não há `else`), e o nó descarta tipo desconhecido.
- **Ordem de ativação em produção:**
  1. release do client (o PR fica inerte até chegar `welcome.chat`);
  2. `CLIENT_REF` do backend apontando para essa release, ainda com `MP_CHAT=0`;
  3. migration `039_mp_chat_reports.sql`, aplicada pelo Ruben a partir da pasta privada
     (a 038 já existe: `038_uid_token_guard.sql`);
  4. deploy da API com a rota `mp-chat-report`;
  5. deploy dos nós, ainda com `MP_CHAT=0`;
  6. `MP_CHAT=1` num nó canário, `eval:chat-mp` contra ele e o teste humano (duas pessoas em
     times opostos mais um espectador, desktop e Android em paisagem);
  7. `MP_CHAT=1` na frota.
- **Rollback:** `MP_CHAT=0` na metadata e reinício do nó. Nenhum outro passo é necessário,
  porque o cliente volta a ficar inerte sozinho e a migration é só tabela de denúncias.
- **Sem `error`:** o chat nunca responde com `{type:'error'}`. Em `net.js`, `error` só chama
  `assenta(reject, ...)`, que vira no-op depois do `welcome` (o `done` já está `true`). Toda
  recusa do chat tem tipo próprio (`chat_nack`, `chat_denuncia`).
- **Transporte:** sempre o canal confiável (`tp.enviar`), nunca `enviarInseguro`. Vale para
  WebSocket e WebTransport.
- **Anúncio:** `features: ['ev', 'slot-state'].concat(FEATURES_CHAT)` em `/health` e em
  `/metrics`, onde `FEATURES_CHAT` é `['chat']` com o chat ligado e `[]` desligado. A regex
  `features: \['ev', 'slot-state'\]` do `game/protocol-check.mjs` continua casando.
- **Posição da meta:** no `welcome` o campo `chat` entra depois de `clientSha`; na `partida`,
  depois de `protocolVersion`. As linhas `snapshotHz: SNAPSHOT_HZ, events: 1,` não mudam
  (são alvo do mutante `sem-flag` do `protocol-check`).

## 2. Formato das mensagens

```js
// meta, no welcome e na partida (a partida troca `net.meta` inteiro em net.js, ramo 'partida')
chat: {
  v: 1,
  eu: { h: 'K3F', nk?: 'Rubao' },
  pode: 1,
  canais: ['sala', 'time'],
  max: 160,
  epoca: 'QX9W2A7B',
  denuncia: ['ofensa', 'odio', 'assedio', 'spam', 'outro'],
}

// cliente -> servidor
{ type: 'chat', ch: 'sala' | 'time', txt: string /* até 640 unidades UTF-16 cruas */, cid: string /* ^[A-Za-z0-9_-]{1,12}$ */ }
{ type: 'chat_report', id: int, motivo: 'ofensa' | 'odio' | 'assedio' | 'spam' | 'outro' }   // sem texto livre

// servidor -> cliente
{ type: 'chat', id: int, t: int, ch: 'sala' | 'time', aud: 'todos' | 'espectadores' | 'time',
  h: string, nk?: string, esp: 0 | 1, time: 'E' | 'B' | null, txt: string, cid?: string }
{ type: 'chat_hist', list: [ /* mensagens no formato acima, sem cid */ ] }   // só logo depois do welcome
{ type: 'chat_nack', cid: string,
  motivo: 'vazia' | 'longa' | 'rapido' | 'repetida' | 'sem_time' | 'silenciado' | 'sala_rapida' | 'invalida',
  espera?: int /* ms */ }
{ type: 'chat_denuncia', id: int, estado: 'recebida' | 'repetida' | 'recusada',
  motivo?: 'limite' | 'desconhecida' | 'propria' }
```

- `id` é um inteiro crescente por sala, começando em 1. `t` é `Date.now()` do nó.
- `cid` é gerado pelo cliente e volta só na cópia de quem enviou. Serve para casar o eco e o
  nack com o rascunho.
- O cliente **só desenha a própria linha quando o eco chega**. Se vier `chat_nack`, o
  rascunho continua no campo e o motivo aparece ao lado (com `espera` em segundos quando
  houver).
- `esp` diz se quem escreveu era espectador no momento do envio; `time` é o time do remetente
  lido de `room.slots` na hora da entrega, e é `null` para espectador.
- `v` é a versão do contrato. Cliente que não conhece a versão trata a meta como ausente.
- Frame malformado (tipo certo com campos errados) é descartado no cliente e no nó; ninguém
  fecha a conexão por causa do chat, exceto pelo tamanho de frame (§6).

## 3. Normalização e vetores de teste

A mesma função nos dois repositórios (`normalizarTexto`), na mesma ordem:

1. Recusa o que não for string (`invalida`) e texto cru acima de 640 unidades UTF-16 (`longa`).
2. Aplica `NFKC`.
3. Troca `[\t\n\r\f\v\u0085   ]` e `\p{Zs}` por espaço.
4. Remove `\p{Cc}` e `\p{Cf}`. A única exceção é U+200D (ZWJ) quando o último code point
   MANTIDO é `\p{Extended_Pictographic}`, seletor de variante (U+FE0E, U+FE0F) ou modificador
   de tom de pele (U+1F3FB a U+1F3FF) e o próximo code point original é
   `\p{Extended_Pictographic}`, para não quebrar emoji composto: o ZWJ de ❤️‍🔥, 🏳️‍🌈 e
   👨🏽‍💻 vem depois do seletor ou do tom de pele, não do pictograma.
5. Remove `\p{Co}`, `\p{Cs}`, U+034F, os preenchimentos Hangul (U+115F, U+1160, U+3164,
   U+FFA0) e U+2800.
6. Mantém U+FE0E e U+FE0F só quando vêm logo depois de pictograma.
7. Corta sequências de `\p{M}` em `maxMarcas` (2).
8. Colapsa espaços repetidos e apara as pontas.
9. Resultado vazio vira `vazia`; mais de `maxChars` (160) code points vira `longa`.

Os passos 4 a 7 rodam numa passagem única sobre os code points do texto que saiu do passo 3,
decidindo por code point original: nunca se re-escaneia a string já filtrada. Um replace
encadeado juntaria dois surrogates soltos ao tirar o Cf entre eles, e o passo 5 já não os veria.
Só o ZWJ (passo 4) e o seletor de variante (passo 6) olham para trás no que já foi MANTIDO,
porque o que os precede pode ter caído no passo 5; para a frente o ZWJ olha o code point original.
Nunca usar `\p{Cn}`: depende da versão do ICU do runtime e faria navegador e nó discordarem
sobre o mesmo texto. A chave de repetição é `chaveTexto(s) = s.toLowerCase().replace(/[\s\p{P}]/gu, '')`
sobre o texto já normalizado.

| Entrada | Resultado |
|---|---|
| `"  oi\t\tgalera\n"` | `oi galera` |
| `"ＧＧ"` (U+FF27 U+FF27) | `GG` |
| `"𝐟𝐝𝐩"` (negrito matemático) | `fdp` |
| `"a‮b⁦c"` | `abc` |
| `"x​y﻿z­w"` | `xyzw` |
| `"ㅤ"` (preenchimento Hangul) | recusado como `vazia` |
| `"\u{1F468}‍\u{1F469}‍\u{1F467}"` (família com ZWJ) | mantida igual |
| `"a‍b"` | `ab` |
| `"\u{2764}\u{FE0F}\u{200D}\u{1F525}"` (coração em chamas, ZWJ depois de U+FE0F) | mantido igual |
| `"\u{1F3F3}\u{FE0F}\u{200D}\u{1F308}"` (bandeira do arco-íris) | mantida igual |
| `"\u{1F468}\u{1F3FD}\u{200D}\u{1F4BB}"` (tecnólogo com tom de pele, ZWJ depois de U+1F3FD) | mantido igual |
| `"\u{1F469}\u{200D}\u{2764}\u{FE0F}\u{200D}\u{1F468}"` (casal com coração, dois ZWJ) | mantido igual |
| `"a\u{FE0F}\u{200D}\u{1F525}"` (o seletor depois de letra cai no passo 6, e o ZWJ com ele) | `a\u{1F525}` |
| `"a\u{D83D}\u{AD}\u{DE00}b"` (par substituto partido por um Cf) | `ab` |
| `"z"` seguido de 30 × U+0301 | `z` com 2 marcas |
| `"tag\u{E0041}"` | `tag` |
| `"a".repeat(161)` | recusado como `longa` |
| `"<img src=x onerror=alert(1)>"` | fica igual, e é desenhado como texto |
| `"  "` | recusado como `vazia` |

Os vetores são a régua: `eval:chat` (client) e `game/chat-check.mjs` (backend) rodam a mesma
tabela.

## 4. Identidade

- **Chave da conexão** (`chaveDeConexao(ws)`): `p:<pid>` se o ticket traz `pid`; senão
  `u:<uid>`; senão `c:<connId>`. A terceira só acontece em dev com `MP_TICKET_REQUIRED=0`
  (`game/index.js`, `MP_TICKET_REQUIRED = process.env.MP_TICKET_REQUIRED !== '0'`). O nó já
  guarda `ws._playerId` e `ws._anonId` a partir de `req.mpTicketPayload`.
- **Handle (`h`):** HMAC-SHA256 da chave com um segredo aleatório de 32 bytes por sala, gerado
  quando o `ChatSala` nasce e nunca serializado nem logado. O digest é escrito em base 31 no
  alfabeto do convite (`ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'`, `game/index.js`) e o
  handle são `handleChars` (3) dígitos da ponta BAIXA dessa escrita (os últimos
  `handleCharsMax` dígitos; o mais significativo é enviesado porque 31^51 < 2^256 < 31^52),
  estendido para 4 ou 5 se o prefixo colidir com outro handle da mesma sala. Se os cinco
  colidirem, o nó re-deriva com sal (`chave#1`, `chave#2`, ...) em vez de passar de
  `handleCharsMax`, que é o que a API de denúncias aceita (`handleDe` em `game/chat.js`;
  mutantes `handle-longo` e `handle-enviesado`). É o mesmo dentro da sala, inclusive entre
  partidas e reconexões, e diferente de uma sala para outra. Ninguém consegue calcular a
  chave a partir do handle.
- **Rótulo** (`rotuloDe(msg)`): com `nk`, o nick verificado com uma marca de verificado
  (texto, não imagem); sem `nk`, `Anônimo #<h>`. O rótulo é montado no cliente a partir de
  `h` e `nk`, nunca vem pronto do nó, e nunca entra em HTML: vai em `textContent` dentro de
  `<bdi dir="auto">` separado do texto.
- **Proibições:**
  - o código do chat nunca lê `ws.nome` (o `nome` da query string, que hoje só vai para
    `claimSlot` e para o snapshot);
  - `uid` e `pid` nunca aparecem em frame, log ou `listing()`. O uid é credencial de
    recuperação (`seguranca.md` §9);
  - `MOTIVOS_DENUNCIA` é a lista fechada acima; texto livre não existe em `chat_report`.
- **Nick verificado (`nk`):**
  - `api/mp-ticket.ts` já chama `resolvePlayerIdentity(supabaseAdmin, { uid, token, nick: null })`
    e recebe `identity.player.nick` (o `select` é `'id, nick'`), mas hoje só usa `player.id`.
    Passa a mandar o nick para `emitirMpTicket`.
  - `emitirMpTicket` (`api/_lib/mp-ticket.mjs`) só grava `nk` se houver `pid` e o nick casar
    com `NICK_TICKET_RE = /^[A-Za-z0-9_.\-]{2,14}$/`, que é a mesma regex de `NICK_RE` em
    `api/_lib/nick.ts`. A régua `mp-ticket-check` cobra a igualdade.
  - O nó revalida o `nk` do ticket com a mesma regex ao abrir a conexão e guarda em
    `ws._chatNick`. Anônimo nunca tem `nk`, mesmo que mande `nome=`.

## 5. Quem recebe o quê

Espectador é qualquer conexão sem slot (`espectador: !slot` no welcome e na partida). O
estado é lido de `room.slots` na hora da entrega, nunca guardado no remetente.

| Remetente | Canal | Partida rodando | Fim de partida (`room._fimDePartida`, cerca de 8 s) |
|---|---|---|---|
| jogador | sala | todos, inclusive espectadores (`aud:'todos'`) | todos |
| jogador | time | só os jogadores do mesmo time (`aud:'time'`) | idem |
| espectador | sala | só espectadores (`aud:'espectadores'`) | todos (`aud:'todos'`) |
| espectador | time | recusado com `sem_time` | recusado com `sem_time` |

- A regra do espectador durante a partida é anti-ghosting: quem assiste vê os dois times e
  não pode passar posição a um deles.
- **Carência de quem sai da arquibancada:** a regra acima só pelo slot no instante do envio
  vazava em três frames (`time`, texto no canal do time, `espectar`). Por isso quem estava sem
  slot e pega slot (`{type:'time'}`), sai (`leave`) ou cai (`close`) fica em carência por
  `carenciaEspectadorMs` (30 s) a partir daquele momento, pela identidade e no nível do nó
  (`LimitesChat.saiuDaArquibancada` e `carenciaEspectador`, marcadas em
  `marcarSaidaDaArquibancada` antes do `claimSlot`): reconectar não zera. Em carência o
  remetente é tratado como espectador nas linhas da tabela, mesmo com slot: o canal time é
  recusado com `sem_time` e o canal sala vai só aos espectadores durante a partida (com eco
  para quem escreveu). O cliente só mostra o motivo; não conta os 30 s.
- O chat de time nunca chega ao espectador nem ao time adversário, em nenhuma janela.
- Não há linhas de sistema de entrada e saída. O chat não anuncia quem entrou, saiu, trocou
  de time ou reconectou.
- A entrega é uma escrita por destinatário (`enviarTexto`), nunca `broadcast(`, e o
  destinatário com `bufferedAmount` acima de `bufferedAmountMax` é pulado.

## 6. Limites

Uma tabela, um objeto. Os dois repositórios exportam `CHAT_LIMITES` com exatamente estas
chaves e valores (`public/js/chat.js` e `game/chat.js`), mesmo quando um lado não usa uma
delas. A régua `eval:chat` do client lê esta tabela e compara com o objeto exportado; a
`game/chat-check.mjs` faz o mesmo no backend.

| Limite | Valor |
|---|---|
| `maxChars` | 160 |
| `maxUtf16` | 640 |
| `maxMarcas` | 2 |
| `cidMaxChars` | 12 |
| `handleChars` | 3 |
| `handleCharsMax` | 5 |
| `baldeCapacidade` | 5 |
| `baldeRecargaMs` | 2000 |
| `repeticaoMs` | 15000 |
| `escaladaRecusas` | 8 |
| `escaladaJanelaMs` | 30000 |
| `silencioMs` | 60000 |
| `salaCapacidade` | 20 |
| `salaRecargaPorSegundo` | 4 |
| `maxPayloadBytes` | 16384 |
| `bufferedAmountMax` | 1048576 |
| `denunciasPorJanela` | 5 |
| `denunciaJanelaMs` | 600000 |
| `evidenciaAntes` | 10 |
| `evidenciaDepois` | 5 |
| `filaDenunciasMax` | 500 |
| `loteDenuncias` | 100 |
| `flushDenunciasMs` | 30000 |
| `bufferMaxMensagens` | 50 |
| `bufferMaxMs` | 300000 |
| `salaVaziaLimpaMs` | 60000 |
| `historicoMaxMensagens` | 20 |
| `historicoMaxMs` | 180000 |
| `historicoMaxBytes` | 16384 |
| `logClienteMaxLinhas` | 100 |
| `filaClienteMax` | 64 |
| `bloqueiosMax` | 50 |
| `retencaoDenunciasDias` | 90 |
| `carenciaEspectadorMs` | 30000 |

Procedência dos valores:

- `maxChars` 160 e `maxUtf16` 640: o texto normalizado cabe em duas linhas do painel de
  420 px; 640 é 4 × 160, o pior caso de um code point de 4 unidades por caractere antes da
  normalização (`"𝐟"` é 2 unidades, então 4 já sobra).
- `maxMarcas` 2: acento com til ou cedilha com acento precisa de 2; zalgo precisa de dezenas.
- `cidMaxChars` 12: `^[A-Za-z0-9_-]{1,12}$` cobre um contador em base 36 de um navegador por
  meses.
- `handleChars` 3 e `handleCharsMax` 5: 31^3 = 29.791 handles numa sala de no máximo 10
  conexões humanas; a extensão só existe para colisão.
- `baldeCapacidade` 5 e `baldeRecargaMs` 2000: 5 mensagens em rajada e depois uma a cada 2 s,
  que é o ritmo de quem digita frases curtas. O balde é por chave e fica no nível do nó
  (`limitesChat`), então reconectar ou trocar de sala não zera.
- `repeticaoMs` 15000: a mesma chave de repetição em 15 s é spam, não conversa.
- `escaladaRecusas` 8, `escaladaJanelaMs` 30000 e `silencioMs` 60000: quem bate no balde 8
  vezes em 30 s está automatizando; 60 s de silêncio custa mais que a mensagem valia. Conta
  toda recusa que gera nack ao remetente (`vazia`, `longa`, `invalida`, `sem_time`, `rapido`,
  `repetida`), menos `sala_rapida`: esse é o balde da SALA, drenado por terceiros, e contar
  faria uma sala cheia silenciar quem só tentou falar (mutante `sala-rapida-escala`).
- `salaCapacidade` 20 e `salaRecargaPorSegundo` 4: 10 conexões × 5 do balde daria 50 numa
  rajada; a sala segura em 20 e recarrega 4/s, que é o que o painel consegue desenhar sem
  virar cascata.
- `maxPayloadBytes` 16384: `maxPayload` do `WebSocketServer` (hoje vale o padrão de 100 MiB
  da lib `ws`). O `chat_hist` fica abaixo disso. O `_lerStream` do WebTransport
  (`public/js/transporte.js`) para de consumir com quadro acima de `MAX_SNAPSHOT_BYTES`
  (32768, `public/js/netcodec.js`), então 16 KiB fica com folga de 2×.
- `bufferedAmountMax` 1 MiB: o `broadcastJson` de hoje não tem guarda. O snapshot pula
  cliente com backlog acima de `MAX_SNAPSHOT_BACKLOG_BYTES` (256 KiB, `game/index.js`); o
  chat é raro e pequeno, então tolera 4× isso antes de pular, e quem passa de 1 MiB já não
  está recebendo snapshot há segundos.
- `denunciasPorJanela` 5 e `denunciaJanelaMs` 600000: por chave e por sala, com deduplicação
  por (chave, id). Ninguém precisa denunciar mais de 5 mensagens em 10 min; quem precisa,
  bloqueia.
- `evidenciaAntes` 10 e `evidenciaDepois` 5: contexto suficiente para ler a conversa sem
  guardar a sala inteira.
- `filaDenunciasMax` 500, `loteDenuncias` 100 e `flushDenunciasMs` 30000: no molde do
  `flushTelemetria` (`roundTracker.drain(200)`, 5 min); denúncia é mais urgente e mais rara.
- `bufferMaxMensagens` 50 e `bufferMaxMs` 300000: o buffer serve ao histórico da reconexão
  e à evidência da denúncia, nada mais; 5 min cobre uma reconexão lenta e uma denúncia
  tardia.
- `salaVaziaLimpaMs` 60000: com a sala vazia 60 s, o buffer some; a sala em si já é
  destruída pelo `_emptyAt` do heartbeat.
- `historicoMaxMensagens` 20, `historicoMaxMs` 180000 e `historicoMaxBytes` 16384: 20
  mensagens de 160 code points em JSON ficam abaixo de 16 KiB (20 × ~700 B = 14 KB no pior
  caso UTF-8 de 4 bytes).
- `logClienteMaxLinhas` 100: duas telas de rolagem; o painel não é histórico.
- `filaClienteMax` 64: frames de chat que chegam antes de o painel existir (entre `welcome` e
  `montarChatSala`) ficam em `_chatFila`; 64 é maior que o histórico (20) mais uma rajada
  de sala (20).
- `bloqueiosMax` 50: cinco vezes o máximo de conexões numa sala.
- `retencaoDenunciasDias` 90: o `purge_mp_chat_reports` da migration 039, no molde do
  `purge_submit_log` (`seguranca.md` §4).
- `carenciaEspectadorMs` 30000: um round dura 99 s (`ROUND_TIME` em `public/js/game.js`);
  30 s é um terço disso, o tempo em que a posição vista da arquibancada envelhece, e mais que
  isso deixaria quem entra de verdade um round inteiro sem chat de time. O cliente não usa a
  chave (só mostra `sem_time`); ela está aqui porque os dois lados exportam a mesma tabela.

## 7. Ciclo de vida

- **Desconexão:**
  - no cliente, `mpDesconectou` (`main.js`) chama `destruir()` do chat: log, rascunho e fila
    somem;
  - no nó, a reserva do handle fica no `ChatSala` enquanto a chave estiver conectada ou for
    autora de mensagem no buffer. A varredura do heartbeat (`varrer(agora, vazia, presentes)`)
    solta handle, deduplicação e janela de denúncia de quem já saiu (a sala oficial nunca
    fecha, e sem isso cada uid que passou ficaria no Map até o nó reiniciar); com a sala
    vazia por `salaVaziaLimpaMs` zera tudo. Quem volta re-deriva o mesmo handle (mesma chave,
    mesmo segredo), salvo colisão nova (mutantes `handles-sem-varredura` e
    `vazia-guarda-handles`).
- **Reconexão à mesma sala:**
  - o handle é o mesmo (mesma chave, mesmo segredo) e o balde não zera;
  - o `chat_hist` reenvia **só as mensagens que já tinham sido entregues àquela chave** (cada
    mensagem do buffer guarda `entregues: Set<chave>`): até `historicoMaxMensagens`, de até
    `historicoMaxMs` atrás, em até `historicoMaxBytes`;
  - identidades `c:` (sem ticket) não recebem histórico, porque a chave muda a cada conexão.

  Isso fecha os três vazamentos de reconexão: por troca de time (a mensagem de time do outro
  lado nunca foi entregue àquela chave), pela regra do espectador (idem) e por conteúdo que
  a pessoa bloqueou (o bloqueio é por handle e vale para o histórico também).
- **Troca de slot, de time ou `espectar`:** vale a partir da próxima mensagem. O log do
  cliente fica, porque vive em `mpSessao.chat` (`main.js`), não em `Game` nem em `Netcode`.
  `onSlot` chama `aoMudarSlot`, e `onPartida` chama `aoMudarMeta` com a meta nova.
- **Partida (troca de mapa):** o chat da sala continua. O `_novaPartida` de `room.js` não
  mexe em `room.chat`. O compositor fecha (o `startGame` recria a cena) e o rascunho fica
  guardado no controlador.
- **Sala fechada ou nó reiniciado:** tudo o que está em memória some. A `epoca` nova
  invalida os bloqueios antigos do cliente (a chave do `sessionStorage` leva a época).
- **Buffer da sala:** limpo depois de `salaVaziaLimpaMs` com a sala vazia, no `varrer()`
  chamado pelo heartbeat.
- **Outra sala:** o cliente cria um `NetClient` novo, um controlador novo e o log vazio. O
  buffer e o segredo são por sala, então **nada atravessa de uma sala para outra**, nem
  texto nem handle.
- **Fechar o compositor sem enviar:** Esc, o botão FECHAR do cabeçalho, um clique ou toque
  fora do painel (`pointerdown` no documento, porque o Safari do iOS não sintetiza
  `mousedown` para um toque no canvas) e, no toque, o segundo toque em `#chat-toque`.
  Nenhum desses caminhos envia nem atira (`_chatSeguraPausa`, 400 ms).
- **Idade das linhas:** com o painel fechado a linha vive 12,6 s e some (fade linear; com
  `prefers-reduced-motion` o mesmo tempo, mas por corte, sem transição). Um redesenho do log
  (troca de partida, bloqueio, desbloqueio) recria as linhas com a idade que já tinham
  (`animation-delay` negativo) e com `aria-live` desligado até o próximo tique, para nada
  antigo voltar como novidade na tela nem no leitor de tela.

## 8. Bloqueio e denúncia

**Bloqueio** é só do cliente; o nó nunca fica sabendo.

- A chave do bloqueio é o handle.
- Fica em `sessionStorage`, em `cs_chat_bloq:<convite>:<epoca>`
  (`chaveArmazenamento(convite, epoca)`), com no máximo `bloqueiosMax` entradas. Se o storage
  não estiver disponível, fica em memória e some com a página.
- Esconde as linhas antigas e as futuras, inclusive as do histórico.
- Há uma lista "BLOQUEADOS" para desbloquear, e ninguém consegue bloquear a si mesmo.
- Depois de denunciar, o painel oferece "Bloquear também?".

**Denúncia** é do nó para a API, sem texto livre.

1. O cliente manda `chat_report { id, motivo }`, com `motivo` em `MOTIVOS_DENUNCIA`.
2. O nó confere: a mensagem está no buffer da sala; a chave de quem denuncia está em
   `entregues` dela; a mensagem não é de quem denuncia (`propria`); o limite
   `denunciasPorJanela` por chave e por sala; e a deduplicação por (chave, id), que responde
   `repetida` sem contar no limite.
3. A evidência é **montada pelo nó**, nunca pelo cliente: a mensagem denunciada, até
   `evidenciaAntes` anteriores e até `evidenciaDepois` posteriores, e só as que quem denuncia
   recebeu. Cada linha leva `h`, `nk` se houver, `esp`, `time`, `t` e `txt`. Nunca `uid`,
   `pid` nem `nome`.
4. O registro vai para uma fila em memória (até `filaDenunciasMax`), esvaziada a cada
   `flushDenunciasMs` em lotes de até `loteDenuncias` para `MP_CHAT_REPORT_URL`. O padrão
   dessa URL troca o caminho de `MP_METRICS_URL` por `/api/mp-chat-report`, e a
   autenticação é `Bearer MP_METRICS_TOKEN`, validada na API com `timingSafeEqual` como em
   `api/mp-metrics.ts`. Em caso de erro, o lote volta para a fila. No `shutdown` (SIGINT e
   SIGTERM) o nó primeiro espera o POST que o flush periódico já tinha disparado (contador
   `denunciasEmVoo`, prazo de 6 s = timeout do POST de 5 s + 1 s) e só então faz o flush
   final e fecha `wss`/`server`: é mais estrito que o `flushTelemetria` (melhor esforço),
   porque o `chat-smoke` provou que o `process.exit` engolia o pedido antes de conectar.
   Custo declarado: até ~6 s a mais no SIGTERM quando havia POST em voo e a API não
   responde (detalhe e a carência de 10 s do docker no README do backend). A variável
   `MP_CHAT_FLUSH_MS` (padrão `flushDenunciasMs`) só existe para as réguas encurtarem o
   intervalo, no molde de `MP_FLUSH_MS` da telemetria; não é parte deste contrato.
5. A API (`api/mp-chat-report.ts`) exige o bearer (401 sem ele), aplica rateLimit de 30 a
   cada 10 min, sanitiza o lote e devolve 503 sem banco, para falhar fechado. Chama o RPC
   `track_mp_chat_reports(jsonb)`, idempotente pelo `id` do registro e executável só por
   `service_role`.
6. **Nada é moderado automaticamente.** O RPC não toca em `players.hidden` nem em
   `flagged_count`. O `_flag` antigo virou vetor de griefing por fazer isso
   (`seguranca.md` §1b), e o chat não repete o erro. O que existe é um registro para uma
   pessoa ler.

O que chega como `chat_denuncia` ao cliente: `recebida`, `repetida`, ou `recusada` com
`limite`, `desconhecida` (mensagem fora do buffer ou não entregue a quem denuncia) ou
`propria`.

## 9. Retenção

| Onde | Limite |
|---|---|
| Buffer da sala (nó) | `bufferMaxMensagens` ou `bufferMaxMs`, e `salaVaziaLimpaMs` com a sala vazia |
| Histórico na reconexão | `historicoMaxMensagens`, `historicoMaxMs`, `historicoMaxBytes` |
| Log do cliente | `logClienteMaxLinhas` por sessão; `destruir()` zera |
| Bloqueios no cliente | `bloqueiosMax` por (convite, época), em `sessionStorage` |
| Denúncias no banco | `retencaoDenunciasDias`, com `purge_mp_chat_reports` e agendamento no pg_cron (com aviso, não erro, se a extensão faltar, como na migration 011) |
| Texto do chat em log do nó | nunca. `console` não é chamado pelo `game/chat.js` |
| Texto do chat em `/metrics` | nunca. Só contadores agregados, se algum dia entrarem |

Aviso pendente antes da ativação: a denúncia guarda o texto e o anonId da evidência por 90
dias. Um aviso curto ao jogador (na tela de denúncia ou na política do site) precisa existir
antes de `MP_CHAT=1` na frota. Fica no checklist do PR.

## 10. SEO e moderação

- Nenhuma transcrição é pública. Não há endpoint, página nem feed com texto de chat.
- `/sala/:codigo` do site (que já é `noindex`), `listing()` de `room.js`, `/rooms`, `/health`
  e `/metrics` do nó nunca levam texto, handle, `epoca` ou rótulo. As réguas
  (`game/chat-smoke.mjs` e `eval:chat` do client) mandam um texto canário por uma sala e
  conferem que ele não aparece em nenhuma dessas superfícies nem no `sitemap.xml`.
- `game.js` não importa o chat, e `chat-painel.js` nunca usa `innerHTML`: rótulo e texto vão
  em `textContent` dentro de `<bdi dir="auto">` separados. O `_feed` de `game.js` (que monta
  linha com `innerHTML`) não é modelo para o chat.
- Qualquer publicação futura de texto de chat, na linha do que #674 e #675 pedem para
  outras superfícies, exige moderação humana antes de sair do nó. Este contrato não cria
  nenhuma.
- Fora do escopo desta v1, registrado para o PR: `ents[].name` do snapshot continua vindo do
  `nome` do navegador (o conserto é o `claimSlot` usar `ws._chatNick`); um registrado com
  `hidden` continua mostrando o nick no chat; não há painel de moderação; anônimo consegue
  trocar de identidade girando o uid (o limite de 60 tickets/min por IP da API segura parte
  disso).

## 11. Réguas

Cada régua reprova a base antes do conserto (lei 1) e tem mutante em memória que a deixa
vermelha (lei 3). A saída vermelha vai para o corpo do PR.

**Client** (`corosolto/client`):

| Régua | O que tranca | Mutantes |
|---|---|---|
| `tools/eval/chat-check.mjs` (`eval:chat`, no `check:fast`) | vetores do §3; `NetClient` inerte sem meta e depois de `partida` sem meta, e só `tp.enviar`; guardas do jogo (tecla em input não vira tecla, `_md` não atira, `_plc` não pausa, Y/U abrem, `_acceptInput` falso, sticks zerados, e o clique nos 400 ms depois de fechar o compositor não atira: com pointer lock ele tem o canvas como alvo); `ChatEstado`; `montarLinha` com setter de `innerHTML` que lança; `sala/[codigo].astro` e sitemap sem chat; `chat-painel.js` sem `innerHTML`; `game.js` não importa chat; a tabela do §6 igual a `CHAT_LIMITES` | `trava-inerte`, `plc-antigo`, `clique-pos-chat`, `yu-so-live`, `stick-sem-portao`, `chat-inseguro`, `chat-sem-meta`, `sem-bidi`, `innerhtml`, `sem-nfkc`, `zwj-so-picto`, `cf-por-replace`, `bloqueio-proprio`, `tabela-torta`, `espera-crua`, `mapa-parado-vaza` |
| `tests/smoke/chat-sala.spec.js` (Playwright, `smoke-web.yml`) | ARIA, Y/Enter/Esc, prisão de foco (e devolução do foco ao jogo depois de denunciar e fechar), IME, XSS e RTL, geometria contra `ZONA_MIRA` e `#crosshair` em 1600×900, 1500×1000, 1008×655, 844×390 (toque) e 390×844 (retrato); com `prefers-reduced-motion` a linha some por corte aos 12,6 s; o redesenho retoma a idade da linha e cala o `aria-live`; no toque o compositor fecha sem teclado (segundo toque em `#chat-toque`, toque fora por `pointerdown`, FECHAR) sem enviar nem atirar, e com teclado físico um Esc fecha mesmo quando só o keyup chega (em tela cheia sem Keyboard Lock o Chromium engole o keydown do primeiro Esc), sem fechar no Esc que cancela uma composição de IME | `painel-largo`, `innerhtml`, `foco-preso`, `so-mousedown`, `reduzido-eterno`, `redesenho-novo`, `redesenho-falante`, `esc-so-keydown`, `foco-no-toque` (via `page.route`) |
| `tools/eval/ui-check.mjs` (`eval:ui`, UI1) | contraste dos textos do `#chat-sala` aberto, com linha, divisor e aviso de nack preenchido, sobre a areia do Piscinão: tudo >= 4,5:1 | `ui1_chat_aviso_sem_fundo` |
| `tools/eval/chat-mp-browser.mjs` (`eval:chat-mp`, manual) | nó local com `MP_CHAT=1` (`--backend=<clone>`) e três navegadores separados (A no time E, B no time B em toque, S espectador): CE0 a CE10 do plano, frames gravados por `page.on('websocket')`, figuras JPEG em 5 viewports abertas e descritas (lei 4), cada cena fechando pelo que o jogador tem (Esc no desktop e no toque com teclado, FECHAR no retrato, onde o `#rotate-prompt` cobre a tela) e `#chat-toque` tocado só com o painel fechado, porque ele alterna; `--tickets` sobe o nó com ticket obrigatório e prova o `nk` verificado e o `chat_hist` na reconexão | nenhum; é integração (foi ela que achou o foco preso, o clique que atirava ao fechar e o keydown do Esc engolido no toque) |

**Backend** (`corosolto/backend`):

| Régua | O que tranca | Mutantes |
|---|---|---|
| `game/chat-check.mjs` (`eval:chat`) | `ChatSala` puro nas 8 células do §5, baldes por chave, repetição, escalada (a recusa `sala_rapida` não conta), carência de 30 s de quem sai da arquibancada (G0..G4), varredura de handles, dedup e janelas de denúncia de quem saiu, forma do handle (nunca acima de 5, dígitos baixos), silêncio, buffer, histórico só do entregue, denúncia, meta sem `uid`/`pid`; `Room` real com socket falso; L4 compara a tabela do §6 com `CHAT_LIMITES` quando `CLIENT_DIR` tem este doc | `espectador-vaza`, `time-vaza`, `balde-por-conexao`, `hist-alheio`, `sem-bidi`, `denuncia-sem-recebimento`, `sala-rapida-escala`, `carencia-zero`, `handles-sem-varredura`, `vazia-guarda-handles`, `handle-longo`, `handle-enviesado` |
| `game/protocol-check.mjs` (estendido, CH1..CH13) | `maxPayload`, `metaChat` duas vezes, `.concat(FEATURES_CHAT)` duas vezes, chat nunca por `broadcast(`, `nk` revalidado, varredura no heartbeat, flush periódico e no shutdown, carência marcada antes do `claimSlot` (CH12), shutdown que espera o POST em voo (CH13) | `chat-sem-partida`, `sem-maxpayload`, `chat-sempre-ligado`, `sem-carencia`, `shutdown-sem-espera` |
| `game/chat-smoke.mjs` (`eval:chat-smoke`) | nó real ligado e desligado, tickets reais, API falsa: `nk` só com pid, `nome=IMPOSTOR` nunca aparece, matriz A/B/S, balde e handle sobrevivem à reconexão, histórico não vai à sala 2, denúncia com bearer, canário fora de `/health`, `/metrics`, `/rooms` e `/sala/:codigo`, frame de 20 KiB fecha com 1009, carência de quem pega slot vindo da arquibancada (G1..G4), shutdown que entrega a denúncia pendente e reentrega o lote que voltou com 503 (D9..D12), desligado não muda nada | `espectador-vaza`, `nome-do-navegador`, `carencia-zero`, `shutdown-sem-espera`, injetados no processo filho por `node --import ./game/mutar-chat.mjs` (ganchos em `game/mutar-chat-ganchos.mjs`) |
| `api/reguas/mp-ticket-check.mjs` (estendido) | `nk` com e sem pid; `NICK_TICKET_RE` igual a `NICK_RE` | os existentes |
| `api/reguas/chat-report-check.mjs` | 401 sem bearer, 503 sem banco; na migration 039: RLS, grant só a `service_role`, purge, e nenhum update em `hidden` ou flag | `sem-auth`, `auto-oculta`, `sem-purge` |
