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

## Estado público v9

Por entidade, humano **ou bot**:

- `crouch`: bit `0x08` no byte existente de flags (v9 apenas; o antigo `fire` usa
  esse bit somente nos formatos v2–v4).
- `reloadIn`: u8 de décimos de segundo, arredondado e limitado a 0–25,5 s.
- `emote`: u8, zero sem dança; 1–8 seguem a ordem imutável de
  `public/js/data/emote-catalog.js`: passinho, samba, ginga, frevo, forro,
  quadradinho, sarrada, salve. Novos IDs devem ser acrescentados, nunca reordenados.
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
limites hostis, cinco mutantes v9 e dois controles v8. O antigo teste que exigia
oferta exclusiva v8 foi removido: contradizia o transporte de produção.

`eval:client-snapshot-negotiation` importa NetClient real e simula a fronteira
WebSocket: v9, fallback v8, ack divergente, partida divergente com mensagem tardia,
v7 recusada, seleção ausente e timeout. Três mutantes exigem nominal verde e
failset exato. `eval:rede3p` cobre o caminho snapshot → controlador de animação.
Essas réguas não aprovam QUIC nem rollout de produção.
