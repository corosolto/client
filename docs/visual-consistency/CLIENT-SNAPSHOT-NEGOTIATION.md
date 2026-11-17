# Negociação de snapshots do cliente

O WebSocket oferece `SNAPSHOT_PROTOCOLS` em ordem de preferência: v10, v9, v8 e
formatos anteriores. O transporte recusa seleção ausente ou fora dessa lista.
O NetClient aceita somente v8+ e exige que `welcome.protocolVersion` e
`partida.protocolVersion` correspondam ao subprotocolo selecionado pelo transporte.
Uma seleção legada anterior à v8 não pode carregar objetivo, facção J ou economia.
Produtores sem negociação explícita usam o formato canônico atual, v9. Produtores
negociados passam explicitamente a versão selecionada para preservar compatibilidade.

WebTransport pede `CLIENT_SNAPSHOT_PROTOCOL` (v10) em `sp`; o getter do transporte
identifica esse pedido. Se o gateway/nó ainda não suporta v10, o fallback WebSocket
pode negociar v9 ou v8. O gateway continua responsável por conferir a seleção upstream.
O getter WT isolado não comprova negociação upstream.

Uma tentativa rejeitada fica terminal antes de fechar. Mensagens tardias não
podem trocar meta/slot nem disparar callbacks na tentativa seguinte. A abertura
sem welcome conserva o prazo; `onClose` só notifica uma sessão já aceita.

O ticket de `connect` tem nonce de uso único. O nó pode consumi-lo antes de a
ponte WT descobrir que v10 não é suportada. Depois de qualquer falha WT autenticada,
`NetClient` fecha a tentativa e pede outro ticket via `refreshTicket()` antes de
abrir WS. A credencial é opaca para o cliente; o emissor cria um nonce novo e o
nó rejeita o replay pelo nonce, mesmo se os demais bytes do ticket mudarem.
Falha do emissor, resposta vazia ou ticket idêntico interrompem o fallback.
Sem emissor, uma conexão com ticket usa WS direto para não consumir o único nonce
em WT. Conexões de teste anônimas podem tentar WT e cair para WS sem emissão.
`main.js` fixa o nó antes do primeiro pedido: URL, emissão inicial, renovação e
registro da sessão usam esse nó, mesmo que a seleção da lista mude durante o await.

## Estado público v9 e catálogo v10

Por entidade, humano **ou bot**:

- `crouch`: bit `0x08` no byte existente de flags (v9+; o antigo `fire` usa
  esse bit somente nos formatos v2–v4).
- `reloadIn`: u8 de décimos de segundo, arredondado e limitado a 0–25,5 s.
- `emote`: u8, zero sem dança. A v9 congela 1–8 na ordem passinho, samba,
  ginga, frevo, forro, quadradinho, sarrada e salve. A v10 preserva esses bytes
  e acrescenta 9–16 para capoeira, meia_lua, bencao, uprock, freeze,
  continencia, marra e comemoracao. Uma versão nunca amplia o próprio catálogo:
  o encoder v9 converte 9–16 para zero e o decoder v9 os trata como `null`.
- `emoteElapsed`: u8 de décimos, fase decorrida; laços usam módulo da duração
  no servidor e gestos de uma vez só expiram no servidor. Sem emote, fase zero.

Os três bytes vêm depois de `killedBy`. Acréscimo exato: **3 B/entidade**,
sem aumento de cabeçalho ou reboque. Em 10 entidades a 30 Hz: +900 B/s por conexão
antes do overhead do transporte. O reboque v9/v10 é o mesmo v8 de 35 B: a recarga
privada do dono continua f32 exata, sem perder precisão para a quantização pública.
O formato v8 ignora todos os campos v9+ e mantém os bytes anteriores.

## Implantação pareada

1. Aprovar os dois PRs; nenhum merge/deploy é automático nesta entrega.
2. Construir/deployar **backend primeiro**, com `CLIENT_REF` no SHA completo do
   commit do cliente que contém o codec v10 e o catálogo. O servidor importa o
   codec e o harness dessa árvore; publicar só `room.js` com o pin velho não basta.
   O backend codifica por versão de conexão e mantém navegadores v9/v8 atendidos.
3. Publicar o cliente depois da validação do nó: ele prefere v10 e ainda aceita
   v9/v8. No rollback do nó, o cliente negocia a versão anterior; v9 omite apenas
   os emotes capturados, sem perder a partida. Merge do backend não é deploy.
   `scripts/sim-hash.mjs` inclui codec e Game no hash; o release o recalcula. A
   ordem pareada e o pin explícito continuam obrigatórios.

## Réguas

`eval:netcodecbin` mede round-trips v2–v10, bytes canônicos legados, os catálogos
congelados v9/v10, o input normal e o heartbeat, reboque privado, limites hostis
e mutantes causais. `emote-desconhecido-derruba-snapshot` restaura a recusa antiga
de ID acima do catálogo v9; `v10-codifica-como-v9`, `v10-decodifica-como-v9` e o
mutante de `netgame` provam a replicação 9–16 sem contaminar a v9.

`eval:client-snapshot-negotiation` importa NetClient, TransporteWT e TransporteWS reais e
exercita 22 casos: v10, fallback v9/v8, seleção ausente ou desconhecida,
welcome/partida com versão divergente, mensagens tardias, timeout, fechamento antes
e depois do welcome e fallback WT→WS com isolamento da tentativa anterior.
Os dez mutantes exigem nominal verde e failset exato:

| Mutante | Casos reprovados |
| --- | --- |
| `legacy-offer` | N1, N11 |
| `welcome-version` | N6, N7, N12, N15, N16 |
| `partida-version` | N9, N10, N17, N18, N21 |
| `legacy-wt-request` | N5, N11 |
| `attempt-guard` | N9, N10, N12, N17, N18, N21 |
| `ws-selection` | N3, N4 |
| `early-close-notify` | N20 |
| `callback-before-close` | N21 |
| `failover-notify` | N11 |
| `accepted-close-notify` | N22 |

Esse mesmo gate executa `eval:client-ticket-fallback` (também acessível sozinho).
A régua usa NetClient, TransporteWT e TransporteWS reais, com APIs de navegador e
emissor/nó controlados. Os 14 casos cobrem rollback v8 após consumo do nonce,
WT v10 sem renovação, WS direto sem emissor, erros e credenciais inválidas na
renovação, metadados incompatíveis, falha anterior à autorização, acesso anônimo,
recusa WS, erro WS, rejeição de nonce reutilizado em ticket diferente e pin do nó
durante a emissão assíncrona. O último executa `obterMpTicket` e `mpEntrar` de
`main.js`, alterando a seleção entre os pedidos e conferindo também a sessão.
Controles de ticket exigem estes failsets:

| Mutante | Casos reprovados |
| --- | --- |
| `replay-ticket` | T1, T11, T12, T13, T7, T9 |
| `unsafe-no-provider` | T3 |
| `refresh-validation` | T5, T6 |
| `node-pin` | T14 |

Reprodução: `npm run -s eval:client-snapshot-negotiation`. O gate já é chamado por
`eval:netcodecbin`. `eval:rede3p` cobre snapshot → controlador de animação.
Essas réguas não aprovam QUIC nem rollout de produção.
