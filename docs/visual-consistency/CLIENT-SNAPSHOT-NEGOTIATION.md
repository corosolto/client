# Negociação de snapshots do cliente

O WebSocket oferece `SNAPSHOT_PROTOCOLS` em ordem de preferência: v9, v8 e
formatos anteriores. O transporte recusa seleção ausente ou fora dessa lista.
O NetClient aceita somente v8/v9 e exige que `welcome.protocolVersion` e
`partida.protocolVersion` correspondam ao subprotocolo selecionado pelo transporte.
Uma seleção legada anterior à v8 não pode carregar objetivo, facção J ou economia.
Produtores sem negociação explícita continuam no default v7.

WebTransport pede `CLIENT_SNAPSHOT_PROTOCOL` (v9) em `sp`; o getter do transporte
identifica esse pedido. Se o gateway/nó ainda não suporta v9, o fallback WebSocket
pode negociar v8. O gateway continua responsável por conferir a seleção upstream.
O getter WT isolado não comprova negociação upstream.

Uma tentativa rejeitada fica terminal antes de fechar. Mensagens tardias não
podem trocar meta/slot nem disparar callbacks na tentativa seguinte. A abertura
sem welcome conserva o prazo; `onClose` só notifica uma sessão já aceita.

O ticket de `connect` tem nonce de uso único. O nó pode consumi-lo antes de a
ponte WT descobrir que v9 não é suportada. Depois de qualquer falha WT autenticada,
`NetClient` fecha a tentativa e pede outro ticket via `refreshTicket()` antes de
abrir WS. A credencial é opaca para o cliente; o emissor cria um nonce novo e o
nó rejeita o replay pelo nonce, mesmo se os demais bytes do ticket mudarem.
Falha do emissor, resposta vazia ou ticket idêntico interrompem o fallback.
Sem emissor, uma conexão com ticket usa WS direto para não consumir o único nonce
em WT. Conexões de teste anônimas podem tentar WT e cair para WS sem emissão.
`main.js` fixa o nó antes do primeiro pedido: URL, emissão inicial, renovação e
registro da sessão usam esse nó, mesmo que a seleção da lista mude durante o await.

## Estado público v9

Por entidade, humano **ou bot**:

- `crouch`: bit `0x08` no byte existente de flags (v9 apenas; o antigo `fire` usa
  esse bit somente nos formatos v2–v4).
- `reloadIn`: u8 de décimos de segundo, arredondado e limitado a 0–25,5 s.
- `emote`: u8, zero sem dança; 1–8 seguem a ordem imutável de
  `public/js/data/emote-catalog.js`: passinho, samba, ginga, frevo, forro,
  quadradinho, sarrada, salve. Novos IDs devem ser acrescentados, nunca reordenados.
  **Compatibilidade adiante:** IDs novos (ex.: 9–16) podem ser publicados sem subir
  a versão do protocolo. Um cliente com catálogo menor decodifica um ID acima do seu
  catálogo como zero (sem emote, fase zero) só naquela entidade; o restante do
  snapshot segue normal. O codificador continua recusando nomes fora do catálogo.
- `emoteElapsed`: u8 de décimos, fase decorrida; laços usam módulo da duração
  no servidor e gestos de uma vez só expiram no servidor. Sem emote, fase zero.

Os três bytes novos vêm depois de `killedBy`. Acréscimo exato: **3 B/entidade**,
sem aumento de cabeçalho ou reboque. Em 10 entidades a 30 Hz: +900 B/s por conexão
antes do overhead do transporte. O reboque v9 é o mesmo v8 de 35 B: a recarga
privada do dono continua f32 exata, sem perder precisão para a quantização pública.
O formato v8 ignora todos os campos v9 e mantém os bytes anteriores.

## Implantação pareada

1. Aprovar os dois PRs; nenhum merge/deploy é automático nesta entrega.
2. Construir/deployar **backend primeiro**, com `CLIENT_REF` no SHA completo do
   commit do cliente que contém o codec v9 e o catálogo. O servidor importa o
   codec e o harness dessa árvore; publicar só `room.js` com o pin velho não basta.
   O backend codifica por versão de conexão e mantém navegadores v8 atendidos.
3. Publicar o cliente depois da validação do nó: ele prefere v9 e ainda aceita v8.
   No rollback do nó, o cliente negocia v8 e só perde os overlays novos; não perde
   a partida. Merge do backend não é deploy. `scripts/sim-hash.mjs` inclui codec
   e Game no hash; o release o recalcula. A ordem pareada e o pin explícito continuam
   obrigatórios, sem depender de um rollout automático posterior.

## Réguas

`eval:netcodecbin` mede round-trips v2–v9, bytes canônicos v8, reboque privado,
limites hostis, seis mutantes v9 e dois controles v8. O mutante
`emote-desconhecido-derruba-snapshot` restaura a recusa antiga de ID acima do
catálogo e precisa reprovar exatamente R8. O antigo teste que exigia
oferta exclusiva v8 foi removido: contradizia o transporte de produção.

`eval:client-snapshot-negotiation` importa NetClient e TransporteWS reais e
exercita treze casos: v9, fallback v8, ack divergente, partida divergente com
mensagem tardia, v7 recusada, seleção ausente, timeout, seleção desconhecida,
recusa de welcome sem notificação e fechamento antes de welcome sem notificação
(N1–N10), mais o contrato transporte → codec que antes era regex no
`netcodec-check`: snapshot binário como ArrayBuffer pelo `decodeSnapshot` real
(N11), frame acima de `MAX_SNAPSHOT_BYTES` fechado com 1009 antes do decoder
(N12) e input pelo canal `enviarInseguro` (N13).
O WebSocket falso só seleciona protocolo oferecido pelo cliente, exceto em N8, que
simula servidor hostil, e entrega frame binário como Blob salvo se o transporte
pedir ArrayBuffer, como o navegador. Os doze mutantes exigem nominal verde e failset exato:

| Mutante | Casos reprovados |
| --- | --- |
| `welcome-version` | N3, N5, N9 |
| `partida-version` | N4 |
| `attempt-guard` | N4, N9 |
| `ws-selection` | N8 |
| `oferta-so-v9` | N2 |
| `early-close-notify` | N10, N9 |
| `callback-before-close` | N4 |
| `sem-decoder` | N11 |
| `sem-arraybuffer` | N11 |
| `sem-teto` | N12 |
| `input-confiavel` | N13 |
| `sem-canal-inseguro` | N13 |

Esse mesmo gate executa `eval:client-ticket-fallback` (também acessível sozinho).
A régua usa NetClient, TransporteWT e TransporteWS reais, com APIs de navegador e
emissor/nó controlados. Os 14 casos cobrem rollback v8 após consumo do nonce,
WT v9 sem renovação, WS direto sem emissor, erros e credenciais inválidas na
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
