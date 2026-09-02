# Multiplayer — servidor autoritativo, netcode e regiões

Este documento é onde mora o **porquê** do multiplayer. O código carrega ponteiros de duas
linhas para cá, que é a regra da casa (`CONTRIBUTING.md`, "Código não é relatório").

## O princípio

O multiplayer **não é um modo paralelo**. É o mesmo jogo do single-player com a autoridade do
lado do servidor. `game.online` é o interruptor único: ligado, a máquina de rodada local se
cala, o dano local não é aplicado, e morte, respawn, relógio e placar chegam pelo snapshot.

O servidor roda a **classe `Game` de verdade**, headless, pelo mesmo stub de DOM/THREE do
`botsim` (`tools/eval/harness.mjs`). Não há segunda simulação. Isso não é elegância: se a
física do servidor fosse uma segunda implementação, ela e a predição do cliente divergiriam a
cada passo e o jogo viveria em rubber-band.

Por isso três coisas foram **extraídas** (não escritas) do jogo, para serem chamadas dos dois
lados:

| Função | De onde saiu | Por que |
|---|---|---|
| `_moveEntity(ent, inp, dt)` | 86 linhas de dentro do `_updatePlayer` | o servidor aplica a MESMA física ao slot de gente |
| `_shotDamage(dmg, wid, dist, head)` | inline no `_fireHitscan` | o servidor decide o dano com a MESMA conta |
| `_respawnEntity(b)` | dentro do `_updateBot` | corpo de gente não tem IA (ver "defeitos" abaixo) |
| `public/js/mapcat.js` | tabelas dentro do `main.js` | o servidor precisa do MESMO recorte oficial/comunidade |

A extração do movimento é congelada pela régua `tools/eval/movimento-golden.mjs`: ela grava a
trajetória do jogador em 2 mapas, com roteiro de teclas cobrindo strafe, counter-strafe,
crouch-jump e atrito, RNG semeado, e reprova em divergência acima de `1e-6`. Foi gravada
**antes** da extração e passa **depois**, byte a byte. Mutação que prova que morde: mexer 0,01%
no `accel` do chão (92 → 92.01) produz 14 divergências.

## `dedicated`: servidor sem jogador local

O `Game` sempre constrói um `this.player`. Num servidor ninguém o controla. Deixá-lo em campo
(como fazia o módulo antigo) cria um corpo parado e imortal que os inimigos abatem em loop —
placar envenenado, e o tal "bot bugado ali" que aparecia nas partidas.

Com `dedicated: true` ele fica fora do elenco (não entra no scoreboard, não é alvo, não é
atualizado) e o lado aliado leva `teamSize` corpos inteiros em vez de `teamSize - 1`. É isso
que faz uma sala ter exatamente o número de vagas configurado, sem um manequim do lado.

O **espectador** usa o mesmo `dedicated`: sem ele o cliente teria nove bots locais para as dez
entidades do servidor, e um jogador ficaria invisível.

## Afinidade de sala, e por que região é a peça central

Uma sala é uma simulação de física a 60 Hz e vive **inteira dentro de um processo**. Escalar é
subir mais nós e mandar o jogador para o nó certo — nunca compartilhar estado (Redis e afins):
o mundo anda 60×/s e trafegar isso entre instâncias custaria mais que simular.

Isso torna **região** um eixo de primeira classe, e não um detalhe de infraestrutura. Um nó só
em São Paulo dá ~120 ms para o leste dos EUA e ~180 ms para Portugal. Nenhum netcode conserta
distância: a lag compensation só empurra o problema para o outro lado (você morre atrás da
parede). A saída é ter nó perto e deixar o jogador **ver o ping antes de entrar** — a coluna de
ping do server browser do CS.

Nós ficam em `public/js/net.js` (`NOS`). Acrescentar região é acrescentar uma linha e subir a
VM com o mesmo script de deploy.

Medição de dimensionamento (`server/bench.mjs`): **0,084 ms/tick** para uma sala 5v5, ou 0,5%
de um core. ~199 salas por core; ~280 em 2 cores com 30% de folga. Atenção à conta: a
simulação anda a **60 Hz** — só o broadcast é 20 Hz. A versão anterior do bench dividia por 20 e
prometia 3× mais salas do que cabem.

## Protocolo

HTTP (lobby): `GET /health` · `GET /maps` · `GET /rooms` · `POST /rooms`.
WS: `/ws?room=&pw=&nome=&team=` → `welcome` (uma vez, com o **roster** da partida) + `snapshot`
a 20 Hz. O servidor prefere `coro-snapshot-v3` (inclui CTF), mantém v2 binário durante o
rollout e aceita JSON v1 como fallback. Cliente → servidor: `input`, `ping`, `time` (pedir vaga
num lado), `espectar`.

O **RTT é medido por ping/pong no próprio WebSocket**. O módulo antigo media por `fetch
/health`: outra conexão, outro caminho, sem a fila do WS — um número bonito e errado justamente
quando o socket está congestionado, que é quando importa.

O **elenco vem no `welcome`**, e o casamento de ids no cliente é por **personagem**, não por
time. Sortear o próprio elenco fazia cada jogador da sala ver bonecos diferentes, e o nome do
killfeed não batia com o rosto que apareceu na tela.

## Espectador

Servidor cheio não dá porta na cara: você entra, assiste em primeira pessoa, e o botão "ENTRAR
NO TIME" acende quando abre vaga (é assim no CS). A câmera anda sozinha para outro vivo quando
o alvo morre — ficar preso num defunto é o defeito clássico do modo espectador.

Quando um jogador sai ou vira espectador, o corpo **volta a ser bot**. A partida mantém o
tamanho configurado em vez de ficar com um manequim parado. Um socket vivo sem input perde o
slot após 45 s, para uma reconexão não acumular corpos abandonados.

## Salas

As salas da casa ficam de pé para sempre (nunca são recolhidas quando esvaziam), usam 4v4 e
giram mapa a cada partida. A rotação sai do catálogo do jogo (`mapcat.js`), então mapa novo
entra sozinho:

| Sala | Times | Mapas |
|---|---|---|
| `funk-x-palhaco` | Funkeiros × Palhaços | rotação `todos` |
| `time-b-x-time-e` | Time E × Time B | rotação `oficiais` |
| `livre` | sorteadas a cada partida | rotação `todos` |
| `captura` | sorteadas a cada partida | rotação `captura`, modo CTF |

Salas de usuário: públicas ou privadas com senha, rotação e facções à escolha, teto de 40 por
nó (sala é RAM e CPU; sem teto um laço de POST derruba o nó e leva junto as três da casa).

## O cliente é território inimigo

Tudo que chega pela rede é sanitizado de novo no servidor. Em particular:

- **Dano**: o cliente desenha o impacto e o tracer; quem decide acerto e dano é o servidor.
- **Munição e cadência**: gate de servidor, em ticks — não no relógio do cliente.
- **Origem do tiro**: o cliente manda a posição predita de onde mirou (senão o raio sai da
  posição do servidor, atrasada pelo RTT, e passa ao lado), mas ela é validada dentro de 3 m da
  posição autoritativa. Acima disso usa a do servidor.
- **Lag compensation**: o cliente diz que instante renderizou (`rt`) e o servidor rebobina as
  hitboxes para lá — **travado** na janela de 0,25 s. O cliente escolhe dentro da janela; ele
  não escolhe a janela. Sem essa trava, um cliente hostil pede para rebobinar 10 s e mata quem
  já saiu dali.

### Consequência para a loja de itens

O cliente é público e AGPL. Posse de item cosmético **tem que ser validada no servidor** — a
skin de cada corpo vai no snapshot e o cliente só desenha. Skin como estado do cliente é skin
de graça: basta abrir o `game.js`.

## Defeitos que esta rodada pagou

**Respawn preso na IA.** O respawn morava dentro do `_updateBot`, e o corpo de um jogador tem a
IA desligada. Resultado: quem morria no multiplayer ficava morto **para sempre**, com a tela
travada em "Respawn em 0.0s". Nenhuma régua pegou porque todas mediam o corpo **vivo** — foi
achado jogando. Extraído para `_respawnEntity`, chamado dos dois caminhos, e cobrado agora pelo
`server/smoke.mjs` (mutação prova que morde).

**Elenco do cliente com o tamanho errado.** Com "8 bots" salvo nas configurações e uma sala
5v5, o cliente montava 15 corpos para as 10 entidades do servidor. O tamanho do time é do
servidor, nunca do ajuste local.

**Régua instável.** A primeira versão da cobrança de tiro mirava no inimigo mais próximo e
esperava dano em 6 s — mas o cliente não sabe se há parede no caminho, e o servidor
(certíssimo) recusa tiro bloqueado. Régua que depende de sorte ensina a ignorar vermelho. Foi
trocada por geometria controlada.

**Régua que não mordia.** A primeira cobrança do casamento por personagem invertia a lista do
roster — e inverter e depois indexar por id crescente **restaura** a ordem, então casar por
time e casar por personagem davam o mesmo resultado. Passava com o casamento desligado. Agora
o roster de teste rotaciona os personagens **dentro** de cada time, que é o que separa as duas
hipóteses.

## Réguas

| Régua | O que cobra |
|---|---|
| `tools/eval/movimento-golden.mjs` | a trajetória do jogador não mudou com a extração da física |
| `tools/eval/netcode-check.mjs` | netcode headless, sessão, spawn/respawn, relógio e CTF |
| `tools/eval/netcodec-check.mjs` | codec v3 e compatibilidade v2 |
| `game/smoke.mjs` no backend | servidor de ponta a ponta, incluindo CTF e slot abandonado |
| `game/bench.mjs` no backend | ms/tick → dimensionamento da VM |

---

## Apêndice — conhecimento que veio junto na extração

Estes trechos explicavam código que estava dentro do `_updatePlayer` e do `_updateBot` e que a
extração levou para `_moveEntity` e `_respawnEntity`. O texto mora aqui; o código carrega o
ponteiro.

### Crouch assimétrico (`_moveEntity`)

Vale **no ar** também — crouch-jump é movimento básico de FPS: encolhe a silhueta no pulo e
ajuda a subir degrau. A transição é assimétrica como no CS2: agacha rápido (7/s ≈ 140 ms) e
levanta devagar (4,2/s ≈ 240 ms). Isso tira o crouch-spam de graça e dá peso ao movimento.

### Renascer no mesmo pixel (`_respawnEntity`)

O `_pickSpawn` devolve o ponto **mais seguro**, e ele é o mesmo para todo mundo que morreu
junto — três bots renascem exatamente sobrepostos. Tentou-se afastar com um jitter de 0,6–1,4 m
e o harness reprovou pelo mesmo motivo do `_resetPositions`: o spawn da Loja H é um bolsão de
gôndolas, e empurrar o bot para fora do ponto custa segundos de contorno (tempo da loja na
metade inimiga 19,9% → 13,8%; rota falhando 18,5% → 30,0%; 40 corridas × 150 s). Quem desempilha
é a **despenetração** do `_botSeparation` — ela age no 1º frame e não tira ninguém do bolsão.

### Estado de vida no respawn (`_respawnEntity`)

Rumo suavizado (`_hdg`) e turno de duelo são **estado de vida**: nascer com o `_hdg` da vida
anterior faz o bot sair do spawn girando para alinhar com um rumo de outro lugar do mapa — a
pirueta, de novo, só que no respawn. Por isso são zerados. A coluna (`laneX`) é re-sorteada a
cada vida para as rotas variarem, em vez de ser "sempre a mesma".
