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

## BUG-75 da frente Lajes · RESOLVIDO NA MAIN 14/09/2026

O texto abaixo permaneceu aberto depois de a árvore de produção mudar. A sonda de 14/09 na
`main` alpha.255 (`dffcf1f5`), com o mesmo `_updateBot`, três sementes, 60 segundos e sete
bots por semente, mediu o estado atual:

| partida real, combate ligado | sonda antiga | main atual |
|---|---:|---:|
| bots que exploram ao menos 15 m | não medido | **21 de 21** |
| amostras no térreo | **0,0%** | **91,4%** |
| raio médio de exploração | **12,8 m** | **35,6 m** |
| engajamento mediano | **49,9 m** | **15,0 m** |

A planta V4 também moveu os respawns reais para o térreo. Por isso, a antiga candidata a
cláusula “pisou no chão” perdeu poder: ela passa no instante do nascimento. A LB3 agora
exige raio médio de 28 m, o necessário para sair do spawn e cruzar o meio da planta. O
mutante `deriva-rumo` usa o mesmo gancho real do `botsim-golden`: o raio cai a 24,3 m. As
demais métricas continuam impressas como diagnóstico, sem fingir quatro regras independentes.

Esta comparação prova o comportamento da árvore atual; não atribui a melhora a um único
commit. Entre as duas sondas mudaram tanto a planta de Lajes quanto a IA compartilhada. A
frente de fechamento preserva a geometria V7 aprovada e transforma o resultado atual em
regra de regressão.

Esta é uma guarda pós-integração: LB3 já nasce verde nesta lane porque a correção está na
main; a sonda histórica de 12,8 m é a baseline vermelha preservada, não uma execução A/B
fabricada agora. Reprodução: `npm run eval:lajes-bots` e
`node tools/eval/lajes-bots-check.mjs --mutante=deriva-rumo`.
