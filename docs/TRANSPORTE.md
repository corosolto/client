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

## O gateway existe, e foi medido

`csbrasil-backend/wt/` — Go, `quic-go/webtransport-go`, um processo separado. O desenho é o que
o dono escolheu, e o motivo continua valendo: o controle de congestionamento do QUIC disputando
o event loop que roda a simulação de 60 Hz num e2-small é o pior modo de falha possível.

**O nó não muda uma linha.** O gateway termina o QUIC e abre um WebSocket local para
`game/index.js`, com a MESMA query e o MESMO subprotocolo. Para a sala, é mais um cliente.

Medido em 12/09, com o nó real e o protocolo v5:

| prova | número |
|---|---|
| soak do cliente Go, 5 min | 8.753 datagramas (29,2/s, 8,2 KB/s), 17.465 inputs, 118 `ev` pelo confiável |
| memória do gateway ao fim | RSS 19,9 MB, sem crescer entre sessões |
| **Chrome de verdade, WebTransport** | `TransporteWT`, welcome em **31 ms**, protocolo 5, `yourEnt` recebido, **64 snapshots decodificados** |
| **Chrome com o gateway morto** | cai para `TransporteWS` em 133 ms e entra igual — o jogador não vê erro |

O `cmd/soak` fica no repositório porque "compila" não é "funciona".

### O ticket é o único portão deste caminho

WebTransport **não manda `Origin`**: o portão de origem do `game/index.js` não existe aqui.
Então o gateway **recusa subir** com `WT_EXIGE_TICKET=0`, exige que o ticket tenha forma — e
**não o valida**: o nonce é de uso único, e validar dos dois lados o queimaria antes de a sala
ver, recusando o jogador por `ticket_reused`.

### O que ficou pronto junto:

- **a interface acima**, com o canal que tolera perda já marcado;
- **guarda de ordem** no buffer de interpolação (BUG-164): com datagrama, reordenação é rotina,
  e a regra antiga apagava 10 amostras. Régua com mutante, medindo 37 esvaziamentos contra 1;
- **`fire` e `voice` como contador** (v5): bandeira de um snapshot só some quando o pacote se
  perde; contador sobrevive;
- **banda 34% menor** (v5): 20,8 → 13,6 KB/s medidos no navegador, com 10 entidades. Isso vale
  para quem joga de longe HOJE, em cima do WebSocket, sem esperar transporte novo.

## O que falta, e é tudo deploy

1. **Caddy perdendo `h3`** — o gateway quer a UDP 443 para ele — e o certificado montado
   read-only no container.
2. **Terceiro container no `deploy/startup.sh`**, com a imagem versionada junto da frota.
3. **Canário no nó `us`** (7 jogadores é o canário mais barato que existe). Até o número provar,
   o WebSocket continua o PADRÃO: o caminho novo só entra por `?wt=`, e é isso que a cláusula
   T3 da régua defende.
4. **Delta compression com ack (protocolo v6)**: a próxima ordem de grandeza de banda. É a que
   PRECISA de máquina de estado por cliente — por isso ficou depois da v5, que não precisa.

O que **não** foi medido aqui, e nenhuma régua local mede: o comportamento em UDP 443 atrás do
Caddy, numa rede de operadora, com MTU real. Isso é canário, não teste.
