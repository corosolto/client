# Lajes — a pipa que voa (e por que não precisou de clipe)

Relato do dono (26/08/2026): *"pipas nao voam (precisa de um clipe no mintgg ou outro ate
blender)"*.

## O que havia

`addKite` no `map_lajes_authored.js` desenhava **12 losangos de `BufferGeometry` parados**
entre 14 e 22 m, com rotação fixa por índice e uma rabiola de `TubeGeometry` congelada. Pipa
parada não é pipa — é enfeite pendurado, e foi exatamente assim que o dono leu.

## Por que não precisou de clipe de animação

O dono sugeriu gerar um clipe no Mint ou no Blender. Não é necessário, e a razão é do
objeto: **pipa não tem parte móvel**. O que se move é a pipa INTEIRA contra a linha
esticada. Isso é cinemática de corpo rígido, não deformação de malha — um clipe assado
entregaria um loop fixo, e o que se quer é justamente o que não se repete. O GLB entra como
casca; o movimento é simulado.

## O modelo de voo

Em `ambientlife.js`, região append-only **PIPA NO CÉU** (`attachPipaSky`):

- **linha de comprimento fixo** — a pipa anda sobre uma casca esférica em volta de quem a
  segura, nunca em linha reta pelo céu. Quando sobe de um lado, recua do outro (o raio
  horizontal encolhe com a altura ganha);
- **o abanar é a soma de duas oscilações de períodos que não fecham entre si** — 7,3 s de
  rajada larga + 1,73 s de tremida. Uma senoide só devolve balanço de pêndulo de brinquedo,
  que é o defeito de leitura já reprovado noutro asset desta base;
- **atitude tirada da velocidade do quadro** — aponta para onde VAI, inclina o nariz com a
  subida e banca para o lado da guinada. Nada de rotação constante por índice;
- **rabiola como RASTRO** — cada um dos 14 nós ocupa uma posição por onde a pipa passou há
  *k* quadros. É o que faz o rabo chicotear DEPOIS da pipa, em vez de acompanhá-la rígido.

## Integração

Três pipas, âncoras em pontos distintos (laje norte, praça, laje sul), altitudes escalonadas
de **26 a 38 m** — acima da laje (5,2 m) e do horizonte de prédios, que é onde pipa de
comunidade voa. De qualquer canto do mapa dá para ver pelo menos uma abanando, e nenhuma
some atrás da outra.

Não é colisor, não é occluder e **não projeta sombra**: a 30 m da cena, sombra de pipa é
orçamento gasto em pixel que ninguém vê.

O `update` da pipa **envolve** o da ambiência em vez de rodar em laço próprio no `game.js`.
Pausa, reset e descarte ficam com um dono só — pipa abanando com o jogo pausado é o tipo de
detalhe que denuncia enfeite colado por fora.

A pipa fica **fora** de `FAVELA_AMBIENCE_ASSETS`: só o lajes baixa o GLB. Pipa dentro da UPA
ou da Loja H seria pipa dentro do prédio.

## Procedência

`pipa.glb` — “Red Yellow Diamond Kite”, Mint text-to-3D, kit de revisão r2 do lajes
(`kits-mint.json`, item `lajes.pipa`). 4532 triângulos, WebP 1024, bbox
0,553 × 0,998 × 0,361 m, integrada com envergadura de 1,35 m. Registro `pipa-lajes` em
`mint-assets.json` (com `finalSha256` do arquivo servido) e em
`public/models/ambient/FONTE.md`.

## Limite conhecido

O harness node **não carrega GLB**, então toda régua que roda ali vê a pipa no fallback de
losango. O voo medido é o mesmo nos dois caminhos; a leitura do modelo Mint é da captura 3:2.
