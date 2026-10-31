# Economia de partida (TRETA$ da partida)

Decisão do dono, 28/10/2026: economia de partida estilo CS.

- A moeda chama **TRETA$ da partida**. Vale só naquela partida e começa do zero na próxima.
- É **separada** do TRETA$ do menu (carteira e loja de skins: `treta-store.js`,
  `treta-rewards.js`, `treta-catalog.js`). Não lê nem escreve nela. A régua
  `npm run eval:economia` (EC9) reprova se o grafo de import dos módulos de economia
  alcançar esses arquivos, citar `/api/treta` ou `localStorage`, ou se uma partida
  simulada escrever em `localStorage` ou chamar `fetch`.
- Modos especiais (`awp`, `knife`, `pistols`) não têm loja.

## Módulos

| Arquivo | O que tem |
|---|---|
| `public/js/compra-catalogo.js` | grupos do menu, itens à venda (id, grupo, slot, preço, recompensa por kill), recompensa das armas fora do catálogo |
| `public/js/economia-partida.js` | constantes (`ECONOMIA`), kill-switch (`economiaLigada`), crédito com teto, recompensa por kill e por rodada, preço com desconto de assinatura, validação de compra |

Os dois são puros: sem DOM, sem rede, sem `localStorage`. O mesmo código serve ao
cliente e, quando o servidor adotar, ao nó autoritativo.

## Números

Base: CS2 (valores públicos de preço e de recompensa por kill da Valve). A escala é a
mesma do CS porque a partida começa com o mesmo saldo e tem o mesmo teto.

| Regra | Valor | Referência CS2 |
|---|---|---|
| saldo inicial | 800 | 800 (MR12) |
| teto | 16000 | 16000 |
| vitória de rodada | 3250 | 3250 (eliminação) |
| derrota em sequência | 1400, 1900, 2400, 2900, 3400 | idem; satura na 5ª |
| empate | conta como derrota para os dois times | CS não tem empate; aqui a rodada pode empatar |
| tempo de compra | 50 s; a janela reabre a CADA renascimento (rodada e arena) com banner avisando | 20 s depois do freeze time; 30 s até 31/10; 50 s e reabertura por decisão do dono (31/10: "mostrar que ele tem 50 segs pra comprar arma") |
| zona de compra | 9 m do ponto de spawn mais próximo do próprio time | buy zone |
| assinatura do personagem | 10% de desconto, arredondado a 50 | não existe no CS |

Recompensa por kill, por classe: faca 1500, escopeta 900, SMG 600 (P90 300), pistola,
fuzil, LMG e sniper semi 300, AWP 100. Abate de aliado não paga. Arma que não está no
catálogo paga pelo `RECOMPENSA_FORA_DO_CATALOGO`; o que não estiver em lugar nenhum
(granada, queda) paga 300, como granada no CS.

Vitória zera a sequência de derrotas (regra do CS 1.6; o CS2 só desconta um degrau).

### Catálogo

| Grupo (tecla) | Item | Preço | Kill | Análogo CS2 |
|---|---|---|---|---|
| 1 PISTOLAS | DEAGLE | 700 | 300 | Desert Eagle 700 |
| | .38 | 600 | 300 | R8 600 |
| 2 PESADAS | M3 | 1050 | 900 | Nova 1050 |
| | METRALHA | 5200 | 300 | M249 5200 |
| 3 SUBMETRALHADORAS | UZI | 1050 | 600 | MAC-10 1050 |
| | MP5 | 1500 | 600 | MP5-SD 1500 |
| | P90 | 2350 | 300 | P90 2350 |
| 4 FUZIS | CARABINA | 1800 | 300 | Galil 1800 |
| | FAMAS | 2050 | 300 | FAMAS 2050 |
| | M92 | 2500 | 300 | entre Galil e AK (dano 32) |
| | MD97 | 2600 | 300 | entre Galil e AK (pente 20) |
| | AK | 2700 | 300 | AK-47 2700 |
| | M4 | 2900 | 300 | M4A1-S 2900 |
| | SCAR | 3000 | 300 | SG 553 3000 |
| 5 SNIPERS | MOSIN | 1700 | 300 | SSG 08 1700 |
| | SKS | 2300 | 300 | sem análogo (semi com luneta) |
| | AWP | 4750 | 100 | AWP 4750 |
| | SVD | 5000 | 300 | SCAR-20 5000 |
| | G3SG1 | 5000 | 300 | G3SG1 5000 |

A PT-38 não está à venda: todo mundo nasce com faca e pistola.

## No jogo (single player)

`public/js/compra-partida.js` liga as regras ao `Game`. Quem decide é o `main.js`:
`new Game({ economia })` com `economiaLigada(...)`. O `Game` sem `economia` (arnês,
nó dedicado, `?economia=0`) fica no loadout antigo, e é por isso que as réguas
antigas continuam medindo o mesmo jogo.

| Regra | Como ficou |
|---|---|
| nascimento | faca + PT-38, sem primária, TRETA$ 800 |
| arma do personagem | deixa de vir de graça; aparece no menu com selo SUA ARMA e 10% de desconto |
| armário grátis do spawn | não monta com a loja ligada (com ele ninguém compraria) |
| pickups de mapa e drops de morte | pickups estáticos saem de todos os mapas; a arma de quem morre continua caindo |
| compra | tecla **B** (ou botão `$` no toque) abre o menu modal central (painel de até 880×600, fundo clicável fecha) no tempo e na zona; 1-9 escolhem, 0 volta, B/Esc fecham; segurar a tecla não repete |
| munição | `,` compra um carregador da primária por 200; `.` compra um da secundária por 100; reserva máxima = 2× a reserva padrão |
| arma do chão | troca a do mesmo slot (primária por primária, pistola por pistola) e larga a antiga |
| câmera | tecla **N** cicla 1ª pessoa, 3ª pessoa e ombro; B pertence só à compra |
| morte | larga a primária comprada no chão e renasce de faca + pistola |
| fim de rodada | quem está vivo fica com o que comprou; todo mundo recebe vitória ou derrota |
| modo sem rodada (`?arena=1`) | a janela de compra abre a cada renascimento, como no modo de rodada |
| HUD | saldo TRETA$ alinhado à direita acima da pilha de armas, com `+300` a cada abate e a dica `B COMPRAR · 17s` |


### Munição extra

O grupo **7 MUNIÇÃO** e os atalhos clássicos compram um carregador por vez. A primária
custa 200 e a secundária 100. `CompraPartida.limiteMunicao` limita cada reserva ao dobro
de `WEAPONS[id].reserve`; uma tentativa no teto não debita TRETA$. O menu permanece aberto
para compras sucessivas e mostra reserva atual/máxima.

### Bots

Mesma regra do jogador, sem tabela por dificuldade (a dificuldade já mexe na mira):

- nascem de faca + pistola com TRETA$ 800 e guardam a arma sorteada para a partida
  (`pickMatchWeapons`, a mesma que o `main.js` pré-carrega; comprar outra traria GLB
  que não foi baixado);
- no começo de cada rodada, quem tem saldo compra a sorteada (`compraDoBot`); quem não
  tem segura a pistola, a rodada de eco do CS. Quem sorteou DEAGLE ou .38 já compra na 1ª;
- ganham por abate e por rodada como o jogador;
- morreu, larga a arma e volta de pistola; no renascimento recompra com a mesma regra do
  jogador — a arma quando o saldo cobre, a sobra em colete (decisão do dono, 31/10);
- primária pega do chão vale como compra feita: o bot não paga para trocá-la pela sorteada.

Régua: `npm run eval:economia-jogo` sobe o `Game` real no arnês e mata mutantes de
carteira do menu, AWP grátis, perda de arma/equipamento, compra e recompra dos bots,
teclado, pickups estáticos, B concorrendo com a câmera, munição ausente ou sem teto e a
janela de compra: 50 s no começo da rodada e reaberta a cada renascimento — com recompra
de verdade na janela reaberta —, em rodada e arena (EJ22/EJ23). O arnês não carrega CSS:
o modal, a posição do saldo e a camada sobre `#touch-ui` são conferidos no navegador.

## Equipamento (lote de 29/10)

Grupo 6 do menu, slot `equipamento` (`compra-catalogo.js`), preços do CS2:

| item | preço | regra |
|---|---|---|
| colete | 650 | recusa com colete 100; colete gasto recarrega para 100 |
| colete + capacete | 1000 | cobra só o que falta: 350 com colete cheio, 650 com capacete |
| capacete | 350 | só para quem já tem colete |
| flash | 200 | até 2 no estoque |

A compra escreve o mesmo estado que o resto do jogo lê: `armor`/`helmet` (`armadura.js`,
#1159) e `flashes` (#1163). Morrer zera os três (`CompraPartida.aoAbate`); quem sobrevive
leva colete gasto e flash para a rodada seguinte. Bot só gasta em colete a sobra depois de
estar com a arma dele (`equipamentoDoBot`). `?armadura=0` e `?flash=0` tiram o item da loja;
com os dois, o grupo some.

Régua: EC11/EC12 em `eval:economia` e EJ17 a EJ19 em `eval:economia-jogo`, com mutantes
flash-sem-limite, capacete-sem-colete, loja-ignora-switch, bot-equipa-sem-arma,
equip-sem-entrega, equip-nao-perde e rodada-zera-equip.

Fumaça e frag continuam como hoje (cota grátis por rodada) até a granada entrar na loja.

## Multiplayer: contrato que o servidor precisa

A autoridade do multiplayer mora em `corosolto/backend` (`game/room.js`, que roda o
`Game` deste repositório como nó dedicado). Este repositório não tem como validar
compra no servidor, então `ECONOMIA_NO_MP = false` deixa a economia **desligada no
multiplayer** e no nó dedicado (`economiaLigada({ online, dedicado })`). O MP segue
com o loadout de hoje.

Para ligar, o nó precisa:

1. **Estado por slot**: `saldo` (TRETA$ da partida), `derrotasSeguidas` por time,
   `compraAte` (tempo do servidor) por slot. Zera a cada partida.
2. **Crédito**: no `_kill`, `creditar(carteira, recompensaKill(weap, { mesmoTime }))`
   para o autor (`recompensaKill` aceita o id ou o rótulo curto que o `_kill` recebe: `'AK'`, `'FACA'`, `'FRAG'`); no fim de rodada, `recompensaRodada` com `proximaSequencia` por time.
   Nada disso pode vir do cliente.
3. **Mensagem de pedido** (cliente → nó): `{ type: 'compra', id: '<id do catálogo>', seq }`.
   Só o id; preço, saldo, tempo e posição o nó lê do próprio estado.
4. **Validação**: `motivoRecusa({ id, saldo, agora, compraAte, distSpawn, vivo, possui, assinatura })`
   com `distSpawn = distanciaAoSpawn(pos do slot no servidor, spawns do time)`. Recusa
   por `item`, `morto`, `tempo`, `zona`, `ja-tem` ou `saldo`.
5. **Resposta**: aceito → concede a arma pelo caminho que o backend já tem (`_concederArma` em `game/room.js`) e
   manda `{ type: 'compra-ok', id, saldo, seq }`; recusado → `{ type: 'compra-nack', id, motivo, saldo, seq }`.
6. **Snapshot**: o saldo do próprio jogador (`$`) e `compraAte` entram no snapshot do dono
   do slot. O saldo dos outros não viaja (no CS só o time vê).
7. **Teto de ritmo**: no máximo 1 pedido de compra a cada 100 ms por slot, para não
   virar canal de flood.
8. **Rollout**: o cliente só liga a loja online quando o `welcome` do nó anunciar
   `meta.economia === 1`; sem a flag, nó velho continua no loadout de hoje.
