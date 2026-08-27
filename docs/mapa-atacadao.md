# Atacadão da Treta — armazém de corredores de rack

Documento de projeto do mapa `atacadao_treta`. O código
(`public/js/map_atacadao.js`) aponta para cá em vez de carregar o histórico: a
regra da casa é "código não é relatório" (`CONTRIBUTING.md`, cobrada pelo
`eval:comentario`). A régua é `tools/eval/atacadao-check.mjs` (`npm run
eval:atacadao`), e o cabeçalho dela guarda o contrato de medição.

## O pedido

Dono, 27/08/2026, verbatim:

> os mapas do emerson acho que da pra fazer models no mintgg e deixar mais
> realista, especialmente o do atacadao... e nao deixar tanto aberto, e sim
> colocar mais elementos pro mapa aumentar um pouco de complexidade

> o atacadao nao queria tanto igual o lojas havan, tem que fazer algo de
> diferente

"Não deixar tanto aberto" vira número: **LOS média**, a distância que um raio
percorre na altura do olho (1,62 m) antes de bater em alguma coisa, em 12
direções, em todo nó andável de dentro do galpão. Estado anterior à frente:
**14,17 m** em 145 nós. Teto adotado: **10,50 m**. Estado entregue: **9,88 m**
em 182 nós.

"Não igual ao Lojas Havan" vira direção: a Havan é átrio de loja de
departamento; o Atacadão é **armazém de clube de ataque** — perímetro fechado de
galpão, pé-direito alto, parede de pallet formando corredor, canto em cada
cruzamento.

## O layout

Loja: `x ∈ [-25,5, 25,5]`, `z ∈ [ZF = -12, ZN = 36,2]`. Estacionamento ao sul,
`z ∈ [-42, -12]`, com a rua e o skyline como backdrop.

| Elemento | Contagem | Medida |
| --- | --- | --- |
| Fileiras de rack (`estante_pallets.glb`) | 6 | bloco de 2,3 m de profundidade, 3 m de altura |
| Racks por fileira | 8 | slot de 3,2 m em `z`, um vazado por fileira |
| Corredores paralelos entre fileiras | 4 (+ o eixo central) | vão livre de 4,1 m |
| Ilhas de caixa (`ilha_caixas.glb`) | 12 | cover de peito, 1,15 m |
| Freezers (`freezer.glb`) | 6 | parede fria leste, `x = 24,2` |
| Luminárias industriais penduradas | 15 | `y = 7,6 m`, 9 com luz local |
| Torres de promoção no eixo `x = 0` | 5 | 2,4 m |

O rack é **GLB + carga paletizada em `BoxGeometry` atrás dele**. Um rack sozinho
tem 1,1 m de profundidade e o jogador enxerga o corredor seguinte por cima da
carga; foi o primeiro layout medido e a LOS mal se moveu. São os 2,3 m do
conjunto que fecham a linha de visão.

**Entrada alternada:** fileira par vaza o slot `z = 11,2`; ímpar vaza o
`z = 20,8`. Quem corre um corredor inteiro não sai do outro lado no mesmo lugar
do vizinho.

## O lattice — a regra que mais custou

O grafo de navegação deste mapa é uma grade de `STEP = 3,2 m` **ancorada em
múltiplos de 1,6 m a partir de `x = 1,6`**, não na borda do mapa. `blocked()`
usa folga de 0,5 m, então:

> **prop a menos de 0,95 m de uma linha de nó APAGA o nó.**

No corredor de 4,1 m existe **uma só** linha de nó (o eixo). Apagá-la corta o
corredor em dois. Consequências práticas, todas medidas:

- fileiras nos `x` ímpares do lattice (`±4,8`, `±11,2`, `±17,6`), corredores nos
  pares;
- toda ilha entra **encostada na face do rack, a 1,5 m do eixo** (meia-extensão
  de colisor 0,45 m), deixando 3,1 m de passagem e o nó de pé;
- todo prop de faixa larga (praça de caixas, doca) fica em `z` múltiplo de 3,2 —
  no meio de duas linhas de nó;
- bloco solto em faixa larga tem largura ≤ 2,2 m, senão come a linha de nó
  vizinha.

Com a âncora na borda, os nós caíam a 0,45 m da face do rack e o flanco oeste
virava **componente ilhado** — 22 nós, `eval:mapcontrato` MC3.

## O que a medição obrigou a mudar

Nada disso estava no plano; tudo saiu de régua vermelha.

| Régua | O que ela achou | Conserto |
| --- | --- | --- |
| `eval:mapcontrato` MC3 | 22 nós ilhados: praça de caixas de 6 m não cabia no lattice | `ZF` de -6 para -12 |
| `map-check` MAP1 | 14 pontos andáveis com o corpo dentro da esteira do caixa (topo 1,06 m, sem colisor) | esteira sobe para cima do balcão |
| `map-check` MAP1 | ilha da doca nascia em cima do spawn `B(-14,4 / 30,2)` | ilhas da doca para `(±8, 28,8)` |
| `invariants` VM14 | 1 pickup sem alcance: com `ZF` em -12 a 3ª fileira de vaga foi para `z = -36` e o carro de `x = -9,1` engoliu a AK do armário do time E em `(-9, -35)` | fileiras recuam para `ZF-6/13/20` |
| `map-check` CTF2 | par `B→E` caiu para 1 rota separada: a fileira de vaga do fundo fazia funil | ela abre uma **baia** em torno da bandeira E |
| `invariants` MAP2B | doca de 3,8 m não dava 40 m² contíguos por slot | `ZN` de 33 para 36,2 (doca de 7 m) + fila de fardo no meio |
| `eval:atacadao` ATA5 | com a praça de caixas mais funda a LOS voltou a 10,46 m contra teto 10,50 | terceira fila de fardo na praça |

De brinde, os três slots do time E que já estavam vermelhos na base (folga 0 m)
saíram: o atacadão não aparece mais na lista da MAP2B.

## Iluminação e ambiência

Teto opaco não pode depender do sol atravessar a laje — idioma emprestado do
galpão do campomorro (`public/js/map_campomorro.js`, cobrado pelo
`eval:campo-contract`). Daí as 15 luminárias penduradas, as 9 luzes locais e as
3 luzes frias da parede de freezer.

Fauna: pomba **no vigamento** (tirante de 5 m, `y = 5,13`), rato e barata na
doca e no pé da parede fria. O modo do pombo continua `ground` — `flight` está
depreciado desde o BUG-57 porque o GLB de voo é estático de asas abertas
(`eval:ambience-registry` AR5).

Som: dois loops posicionais de `AMB_LOOPS.hum` (ventilação do miolo e compressor
da parede fria) e `cidade` no estacionamento. **O anúncio de alto-falante
distorcido não entrou** — pendência aberta em `KNOWN-BUGS.md`, BUG-70.

## Proveniência dos moldes

Kit `atacadao_r3` do Mint (`kits-mint-r3.json`). Os três GLBs estão registrados
em `mint-assets.json` com `source.frente: "v21-e-models"`, com linha em
`public/models/props/FONTE.md`, e passam `eval:props-acervo`,
`eval:asset-integrity` e `eval:gltf-validator`.
