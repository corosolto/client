# Lajes — por que o bot morava no respawn de cima

Relato do dono (26/08/2026): *"os bots ficam so no respawn em cima e nao tentam circular
pelo mapa embaixo tambem"*.

O portão estava **inteiro verde** quando isso foi dito. A `LV1` já provava que existe rota
por baixo entre spawn e bandeira; a `LV6` já provava que toda aresta de térreo do grafo é
andável; a `CTF2` já contava duas rotas separadas por par. Nenhuma das três olha para o
**bot**. Este arquivo registra o que faltava medir, o que foi consertado e o que continua
aberto, para a próxima pessoa não recomeçar a investigação do zero.

## O que a medição mostrou

Sonda no harness real (o `_updateBot` de produção em node puro, sem Chrome e sem render),
3 sementes × 60 s × 7 bots:

| | antes |
|---|---|
| bots que pisaram no chão | **0 de 21** |
| `ymin` de todos os bots | **5,20 m** (a cota da laje) |
| amostras no térreo | **0,0%** |
| amostras em escada | **0,0%** |

Zero absoluto, não "pouco". E um bot rastreado ficou **preso em (−6,97 / −26,67) de
t = 6 s a t = 34 s** — ou seja, saía do spawn, andava 6 segundos e encostava numa parede
pelo resto da partida.

## As duas causas

**1. A porta da laje estava tapada.** A abertura da platibanda era decidida em PLANTA, sobre
a linha da borda (`roofAccessOnHorizontal/Vertical`, janela de ±0,9 m). Só que quem sai da
tábua não anda pela borda — anda para DENTRO, na diagonal, rumo ao miolo do telhado. Na
tábua `CN-NE` essa diagonal batia no guarda do patamar da `DESCIDA NORTE`, 0,6 m depois de
já ter passado pela abertura. A abertura agora acompanha o **corredor** boca → miolo da
laje, e só onde há laje **dos dois lados**: a primeira versão abriu na borda sul da `SE` e a
`MAP6` pegou na hora (2 bordas alcançáveis com queda de 5,2 m sem guarda). Trocar bot preso
por jogador despencando não é conserto.

**2. `nearestWaypoint` respondia em planta, num mapa de duas camadas.** A projeção em XZ de
um bot na laje cai em cima de um nó de **beco**, e era esse nó que o A\* recebia como origem.
O bot então "seguia" uma rota de térreo andando pelo telhado — nunca encostava numa escada.
Agora `y` pesa 3× (5,2 m de desnível custam 15,6 m de planta, mais que a maior laje do
mapa), e o `game.js` passa a cota. O `map_mansao` já aceitava o terceiro argumento e nunca o
recebia.

De quebra: `livreEm` passou a respeitar colisor **girado**. O corrimão de 7 cm da tábua
diagonal tem AABB de 6,0 × 1,7 m, e testar pela AABB apagava a laje inteira em volta de toda
tábua diagonal.

Régua: `npm run eval:lajes-bots` (LB1 aresta andável em TODA camada — a `LV6` promovida para
fora do térreo; LB2 origem de rota na camada certa). Antes: 4 arestas bloqueadas e 84,6% de
acerto de camada. Depois: 0 e 100%.

## Duas tentativas medidas e recusadas

Ficam registradas para não voltarem como "boa ideia".

**Carpete de waypoints na laje.** Uma grade na camada de cima, igual à do térreo. Resolvia o
bot e derrubava `LS2`, `LV1` e `CTF2` de duas rotas para uma: com célula em qualquer x da
laje, a rota mais curta desliza ~2 m para o lado, e o `rotasSeparadas` apaga a faixa de 6 m
em **planta**, não em 3D — a faixa da rota de cima passava a engolir o beco que corria por
baixo. (Uma separação 3D seria mais correta em mapa de duas camadas, mas afrouxa uma régua
compartilhada por todos os mapas: é decisão do dono, não de quem conserta.)

**Metade das vagas de spawn no térreo.** Levava o bot ao chão de verdade (0,0% → 7,3% das
amostras) e reprovava a `LS1` — *"os dois times nascem nas lajes"* é contrato do mapa.

## O que continua aberto — BUG-75

Com o combate **ligado**, que é como o dono joga, o raio de exploração do bot no lajes é
**12,8 m**, contra 23,2 m no escadão, 23,0 m no piscinão e 38,5 m no ferro velho.

A causa **não é o grafo**. Com o combate suprimido, no mesmo grafo, o raio vai a **44,1 m** e
a escada finalmente aparece no rastro. A causa é esta:

- no lajes **100% dos engajamentos acontecem acima de 25 m**, com mediana de **49,9 m**
  (escadão 19,0 m, ferro velho 18,6 m) — as duas lajes de spawn se enxergam por um corredor
  de ar sobre o miolo do mapa;
- e `_updateBot` **não avança rota nenhuma enquanto `b.target` existe** (`game.js`, ramo
  `else` do roam).

Somando: o bot não precisa andar para atirar, então não anda. Ele congela onde viu o
primeiro inimigo, que é a poucos metros do respawn.

Consertar isso é **redesenhar a visada do telhado** (quebrar o corredor spawn↔spawn, o que
mexe no visual que o dono aprovou) ou **mexer na IA de combate de todos os mapas** (deixar o
bot progredir na rota com alvo distante em mãos). Nenhuma das duas cabe numa frente de mapa,
e as duas precisam da chamada do dono.

Uma tentativa parcial foi medida: massa de cobertura na frente das duas lajes de spawn levou
o engajamento mediano de 48,6 m para 41,9 m e o térreo de 7,3% para 12,8%, mas o raio caiu
(15,1 → 13,0 m). Não é o conserto.

Enquanto isso, `eval:lajes-bots` **imprime os dois números em toda execução, sem cláusula** —
navegação (combate suprimido) e partida real, lado a lado. A distância entre eles É o defeito
em aberto. Uma cláusula "o bot põe pé no térreo" chegou a ser escrita e foi **descartada**:
medida no estado anterior à rodada, ela nascia VERDE (7,2% das amostras, com combate
suprimido). Régua que não morde é pior que régua ausente — ela dá por resolvido o que
continua aberto.
