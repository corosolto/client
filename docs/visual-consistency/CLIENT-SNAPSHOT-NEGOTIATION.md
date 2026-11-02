# Negociação de snapshots do cliente

O navegador oferece somente `CLIENT_SNAPSHOT_PROTOCOL`, hoje v8. A capacidade
legada do codec e o default7 dos produtores sem negociação continuam separados
dessa oferta. Objective e a terceira facção exigem o formato canônico8.

No WebSocket, o transporte confere a seleção nativa antes de avisar abertura.
No WebTransport, `sp` e o getter do transporte identificam o pedido; a confirmação
do cliente exige `welcome.protocolVersion === 8`. `partida` também deve confirmar8
antes de trocar meta, slot ou disparar callbacks. O gateway deve conferir a
seleção WebSocket upstream antes de abrir o stream; o cliente não comprova isso.

Uma tentativa rejeitada fica terminal antes de fechar. Deadline, mensagens e
fechamento tardios dela não atingem a sucessora. O fallback WT para WS mantém a
mesma oferta8. Uma abertura sem welcome conserva o prazo pendente. `onClose` só
notifica uma sessão já aceita, e erro desse callback não impede fechar o transporte.

`eval:client-snapshot-negotiation` importa os módulos reais em cópias isoladas e
simula somente as fronteiras WebSocket/WebTransport, relógio e location. O catálogo
`IDS` e `specs` do checker declara os casos e failsets. Cada mutante exige nominal
verde, aplicação única e conjunto exato de cláusulas vermelhas; import, CLI,
âncora, timeout de infraestrutura e drift não recebem crédito de detecção.

Em01/11/2026, R859 mediu16 cláusulas vermelhas no produto anterior e zero no produto
adotado, com todos os controles causais detectados. R853 originou a proposta GLM;
Root normalizou o lifecycle e acrescentou os controles de fechamento antecipado e
callback que lança. Duas primeiras tentativas desse controle adicional vazaram
seu callback no cleanup e foram rejeitadas, antes da correção de produto.
Recibos completos ficam em A/JAVAPORCO-CLIENT-NEGOTIATION-R859-*.

A medição não aprova browser, QUIC, servidor, gameplay ou release. Antes de publicar
o cliente8-only, todos os destinos selecionáveis precisam suportar8; seguem os
gates de Room/API/SQL, canário, clientes reais e Game no navegador da continuação
Java. O getter WT isolado nunca conta como prova de negociação upstream.
