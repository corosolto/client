# Vida de céu (`public/js/skylife.js`)

Irmão aéreo do `ambientlife.js`: aquele é bicho de chão, este é o que se move acima da
cabeça do jogador. Pipa, helicóptero, avião de faixa e arara.

Portão: `npm run eval:skylife` (7 sondas, 6 mutantes).
Figuras: `tools/eval/asset-evidence/lote-ceu/`.
Ficha: `plans/22-AMBIENCIA-URBANA-E-COMUNIDADE.md` § Vida de céu.

## Por que o módulo existe

`pipa_papel`, `helicoptero_pm` e `aviao_faixa` foram gerados no Mint, divididos em nós
animáveis pelo `split-props-v21.mjs` (rabiola, rotor_main, rotor_tail, faixa), otimizados
e revisados — e ficaram um ciclo inteiro no disco **sem nenhum call-site**. As pipas do
fy_lajes eram losangos de 2 triângulos parados enquanto a pipa de verdade dormia ali do
lado. Pedido literal do dono, 19/08/2026: *"o lajes tem pipa mas nao tem animacao do pipa
voando, podemos por helicoptero, aviao com faixa da praia"*.

## Contrato

Igual ao do `ambientlife.js`, para o mapa não aprender API nova:

```js
const sky = createSkyLife(root, { map, low, kites: [...], helicopters: [...] });
return { ..., skyLife: sky, update(dt, time) { sky.update(dt, time); } };
```

O `game.js` já chama `world.update?.(dt, this.time)` todo frame.

## Regras que o módulo garante

**Nada aqui é colisor.** Tudo nasce com `userData.nonCollider`, fora de
`colliders`/`occluders`, e sem `castShadow`. Sombra de pipa a 18 m custa shadow map por
zero pixel de leitura, e pipa em `colliders` faria a bala parar no papel — a CEU6 é o
portão que impede essa regressão.

**Degradação por proxy.** Sem GLB (`?glb=0`, rede caída, arnês node) cada item cai num
proxy procedural com os **mesmos nomes de nó** (`corpo`, `rabiola`, `rotor_main`,
`asa-esquerda`). A régua mede a mecânica nos dois caminhos.

**Assentamento em t=0.** O construtor chama `update(1e-6, 0)`. Sem isso o helicóptero e
as araras nascem na origem do mapa e saltam para a órbita no primeiro frame.

**A promessa da arara é memoizada, não só o resultado.** O `FileLoader` do three tem
dedup interno por url: a segunda chamada só enfileira callbacks. Se a primeira morreu
antes de limpar a fila — o que acontece quando `new Request` estoura síncrono sem
`document.baseURI` — a segunda espera para sempre. Foi assim que o córrego travou a
régua enquanto as lajes passavam.

## A arara, e por que não é pomba

O `pigeon_flight.glb` era ave de asas abertas **parada** no céu e saiu na v2.1 a pedido
do dono. O plans/22 condicionou a volta da presença aérea a "pássaro riggado de verdade",
que continua não existindo (rig do Mint é humanoid-only, acervo CC0 sem ave riggada).

A saída foi a mesma do tatu e do papagaio de poleiro: **asa vira nó, bater é procedural**.
As duas asas giram em X com **sinais opostos** — com o mesmo sinal a arara rolaria de
lado em vez de bater.

`BIRD_FORWARD_X = -1` porque o nariz do modelo aponta para −X. Medido pela seção
transversal, não chutado:

| faixa em X | altura | largura | leitura |
|---|---|---|---|
| −0,36 … −0,29 | 0,109 | 0,061 | estreita e densa → **bico** |
| −0,29 … −0,22 | 0,230 | 0,086 | a mais alta → cabeça |
| −0,22 … −0,14 | 0,217 | 0,211 | a mais volumosa → peito (raiz da asa) |
| 0,00 … +0,36 | ~0,05 | afinando | chata e comprida → **rabo** |

Se o modelo for regerado com outra orientação é essa constante que muda — e **a régua
não pega**: a CEU4 mede o curso da asa, não o rumo do bicho. Arara voando de ré passa
verde. Isso é olho em figura.

## A faixa do avião: duas coisas que a régua deixou passar

Registradas porque as duas ficaram **verdes** na CEU5 estando erradas na tela.

1. **Ilegível.** A primeira versão pintava a `CanvasTexture` sobre o nó `faixa` do GLB.
   Aquela faixa é uma fita 3D de 1.333 vértices com UV num retalho torto do atlas
   (u 0,001-0,968 · v 0,274-0,999); o texto virou rabisco. Conserto: `PlaneGeometry` com
   UV 0..1, ancorada no nó do GLB (que segue dando posição, pivô e comprimento).

2. **Gigante.** O conserto nasceu com a faixa ~14× maior que o avião, porque o tamanho
   vinha de `Box3.setFromObject` (espaço de **mundo**, já com a escala do `placeProp`) e a
   geometria nova é criada em espaço **local** — a escala entrava duas vezes.

A lição não é "escreva mais régua": **régua de node mede mecânica, figura mede leitura**.
Onde as duas se separam, a figura manda.

## Escalas

`KITE_H = 1,6 m` vem do `mint-assets.json` (GLB normalizado em 1,0 m de altura total,
integrar com scale ~1,6). `HELI_H = 3,4 m` e `PLANE_H = 2,2 m` são leitura de silhueta a
40-70 m, não maquete — um Esquilo da PM tem ~10,9 m de comprimento e um monomotor de
faixa ~7,3 m de envergadura. `BIRD_LEN = 1,05 m`: arara-canindé real tem 0,85-1,0 m.

`low` corta o enxame, não o tipo: some metade das pipas e o avião (o mais caro em pixel
de faixa), mas o helicóptero fica — é UM só e é o que dá leitura de comunidade vigiada.
