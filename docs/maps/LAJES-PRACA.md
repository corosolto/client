# Lajes — a praça do térreo e a rota cima × baixo

> Rodada de 25/08/2026, branch `map2/lajes` (PR #438). Este arquivo guarda o
> **porquê** das decisões e os **números medidos**; o código aponta para cá em vez de
> narrar (orçamento de comentário do `AGENTS.md`).

## O defeito, nas palavras do dono

> "O lajes é o mais bonito visualmente mas está muito confuso. A ideia era os times irem
> tanto por baixo quanto por cima, e agora só vai por cima. Por baixo tinha que ter uma
> praça no meio, ver os becos e jogar cima contra baixo."

O portão do mapa estava **8/8 verde**. Era o portão que estava cego, não o dono.

## A causa raiz: o térreo e o telhado eram dois grafos

`map_lajes_authored.js` ligava o pé de cada escada ao nó de térreo mais próximo com um
laço `if (nodes[i].y < 1)` — e o mais próximo era **o primeiro degrau da própria
escada** (y = 0,17, a 0,28 m). A escada ligava em si mesma.

Medido no harness: **300 nós de térreo num componente, 307 de laje em outro**. Os 4
spawns e as 4 bandeiras estão todos em laje, então as 20 rotas que a CTF2 enumerava
corriam **100% em laje, 0% de térreo**. O chão do mapa era cenário.

A CTF2 não podia pegar isso: ela conta *quantas* rotas separadas existem, nunca *a que
altura* elas correm. Régua que mede numa direção é cega na outra (lição 1).

## O que entrou

| | |
|---|---|
| **Praça** | retângulo `PRACA` (x −7,2..7,2 · z −8,2..9): nenhuma casa, muro ou pilastra de beco nasce dentro. Quadra pintada, traves, bancos, floreiras com mangueira, mesa de bar, caixa d'água e pneus como cover |
| **Descidas** | `DESCIDA NORTE` (topo em NE) e `DESCIDA SUL` (topo em SW), cada uma a um plank do spawn, com **ramal de beco próprio** — é assim que o pé entra no circuito de baixo |
| **Malha de térreo** | grade de 2,0 m com diagonais sobre o chão livre. O chão sempre foi andável fora do beco; só o beco tinha nós |
| **Alvenaria sob os lances** | os degraus não têm colisor (pisa-se neles pelo `groundHeightAt`), então o chão sob a escada ficava andável e cercado — 7 células sem volta ao spawn |

### Números medidos (`eval:lajes-vertical`)

| | antes | depois |
|---|---|---|
| travessia por baixo | **não existia** (grafos separados) | 1,03–1,48× o flanco por cima, 48–63% do caminho no chão |
| visada das lajes para o térreo | 20,4% | 63,1% |
| sala do miolo | 16 m², centro a 13,4 m do meio | 146 m², centro a 0,8 m do meio |
| cover na praça | 0 peças | 17 peças, espaçamento 3,5 m |

## Decisões que custaram uma tentativa cada

**Não ponha escada no meio da praça.** Tentado (`ESCADA DA PRAÇA`, topo em ES): encurtou
o detour da LV1 para 1,54×, mas as paredes de 5,9 m do poço ficam na borda leste da sala
e derrubaram a visada de **62,4% para 42,9%** — matando o "ver os becos" que comprou a
rodada. A praça sobe pela BECO DO VARAL (oeste) e pelas escadas das pontas; o miolo dela
fica limpo de propósito.

**Não feche o fundo de quintal com divisas.** A faixa de 2,1 m entre a traseira das lajes
(|x| = 13,2) e o muro de perímetro (15,32) corre os 78 m do mapa, e a rota de baixo
preferia dar a volta por ela (142 m). Fechá-la a cada ~10 m quebra o corredor, mas os vãos
de serviço em que cada trecho ligaria de volta ao miolo são eles próprios becos sem saída:
o `lajes-antitrap` saltou de **15 para 97 células sem volta ao spawn**. A faixa ficou
aberta como sempre esteve; quem não entra nela é a **malha de navegação**, então ela segue
fundo de quintal em vez de virar a rota preferida dos bots e da régua.

**Aresta de grafo se testa no vão inteiro, não no ponto médio.** Com nós a 2,0 m e muro de
0,26 m, o ponto médio cai fora da parede e o grafo jura passagem onde há muro. É o que a
**LV6** passou a cobrar, com o mutante `aresta-fantasma`.

## Por que a LV1 compara com o FLANCO, e não com a rota mais curta

A rota de cima mais curta é quase a reta entre spawn e bandeira (53,5 m para 49 m de
distância no par E→P): as lajes formam um tabuleiro contínuo. Ir por baixo carrega dois
custos que o projeto do mapa impõe e que nenhum conserto tira:

- as duas escadas em U custam **22,6 m fixos** de caminhada (2 lances de 4,2 m + 2
  patamares de 1,45 m, por escada — geometria da `addStaircase`);
- a espinha inferior é **sinuosa de propósito** (`LAJES_LOOPS.beco`): 62 m de beco para
  46 m de reta entre os pés das escadas, **1,35×**.

Sobre a rota de cima mais curta isso já dá ~1,87× antes de qualquer desperdício — cobrar
1,6× seria cobrar que o térreo deixasse de ser o térreo deste mapa. O par honesto do
pedido do dono ("ir tanto por baixo quanto por cima") é o **flanco**: a segunda rota
separada que a CTF2 já conta como alternativa jogável por cima (100,4 m no E→P, 1,88× a
direta). Se atravessar por baixo custa o mesmo que flanquear por cima, ir por baixo é
escolha e não castigo.

## Evidência

`tools/eval/asset-evidence/maps/lajes/praca-ab/` — antes × depois na **mesma câmera** (o
antes foi re-tirado com o mapa de `d954ca41` restaurado; câmera diferente não é
comparação). Do chão: parede de tijolo na cara → praça aberta com quadra. Da laje leste:
parede cega → a praça inteira e quem está nela.
