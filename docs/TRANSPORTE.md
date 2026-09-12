# Transporte da sessão de jogo

*Escrito em 12/09/2026, com a extração. É o "passo 1" do plano de transporte: sem ele,
WebTransport seria reescrever o `NetClient`; com ele, é trocar uma peça.*

## O que existe hoje

`public/js/transporte.js` tem `TransporteWS`, e é a única coisa no jogo que constrói um
`WebSocket`. O `NetClient` (`public/js/net.js`) fala com a interface:

| método | para que serve |
|---|---|
| `abrir({aberto, mensagem, erro, fechado})` | conecta e entrega os eventos crus |
| `pronto` | dá para mandar agora? |
| `protocolo` | qual subprotocolo foi negociado (é o que diz a versão do snapshot) |
| `enviar(dados)` | canal **confiável**: welcome, slot, partida, leave, ping |
| `enviarInseguro(dados)` | canal que **tolera perda**: input (e, no futuro, snapshot) |
| `fechar(codigo, motivo)` | encerra |

Em WebSocket, `enviarInseguro` é o `enviar` mesmo — TCP não tem canal não confiável. O método
existe **já** porque é exatamente ele que muda de significado no QUIC, e porque marcar no código
o que tolera perda é uma decisão de protocolo que não deve nascer no dia da migração.

O teto de tamanho (`MAX_SNAPSHOT_BYTES`) é cobrado **dentro do transporte**, antes de alocar ou
decodificar: frame hostil não vira memória.

## O que NÃO foi feito, e por quê

**O gateway WebTransport não está implementado.** O dono escolheu o desenho (gateway em Go com
`quic-go/webtransport-go`, canário no nó `us`), e ele continua sendo o certo pelos motivos do
plano: o addon nativo de Node é descrito pelo próprio autor como "duct tape", e o controle de
congestionamento do QUIC disputando o event loop que roda a simulação de 60 Hz num e2-small é o
pior modo de falha possível.

O que impediu nesta rodada foi simples: **não há toolchain de Go nesta máquina**. Escrever um
binário de rede que ninguém compilou nem rodou seria entregar opinião com cara de código — e a
régua desta casa é a oposta disso.

O que ficou pronto para ele, e é a maior parte do trabalho:

- **a interface acima**, com o canal que tolera perda já marcado;
- **guarda de ordem** no buffer de interpolação (BUG-164): com datagrama, reordenação é rotina,
  e a regra antiga apagava 10 amostras. Régua com mutante, medindo 37 esvaziamentos contra 1;
- **`fire` e `voice` como contador** (v5): bandeira de um snapshot só some quando o pacote se
  perde; contador sobrevive;
- **banda 34% menor** (v5): 20,8 → 13,6 KB/s medidos no navegador, com 10 entidades. Isso vale
  para quem joga de longe HOJE, em cima do WebSocket, sem esperar transporte novo.

## O que falta, na ordem

1. Gateway Go em UDP 443, com o Caddy perdendo h3 e o certificado montado read-only.
2. Negociação com prazo curto e queda para WS em silêncio.
3. Snapshot e input em datagrama; `welcome`, `ev`, `slot` e `partida` no canal confiável.
4. Delta compression com ack (protocolo v6): é a próxima ordem de grandeza de banda, e é a que
   PRECISA de máquina de estado por cliente — por isso ficou depois da v5, que não precisa.

**Aviso que vale ouro no dia 1:** WebTransport não manda `Origin`. O portão de origem do
`game/index.js` simplesmente não existe nesse caminho, e o ticket HMAC vira o único gate.
Consequência dura: `MP_TICKET_REQUIRED=0` não pode ser permitido no caminho WT.
