# Invasão dos Javaporcos — layout de 30/10/2026: pasto, seis frentes e becos

Decisões do dono de 30/10/2026, traduzidas em geometria. A ficha do mapa é
[`invasao-javaporcos.md`](invasao-javaporcos.md); o brief visual histórico, superado pelo layout atual, é
[`invasao-javaporcos-visual.md`](invasao-javaporcos-visual.md); o alvo visual são as
artes-conceito em [`arte-javaporcos/`](arte-javaporcos/README.md) (`conceito-a-aerea` é a
planta macro).

1. **Pasto** entre a cidade (`cityBounds` ±36) e a mata: anel de r = 36 a 54, com
   r = max(|x|, |z|). Linha de tiro aberta da borda da cidade até a primeira árvore.
2. **Seis frentes** de trilha distribuídas pelos quatro lados da mata. Há nove metros
   de profundidade explorável antes da parede externa colidível.
3. **Becos** de 2,5 m entre fundos de casa ligando o anel que encosta no pasto à viela,
   abertos para a horda a partir da onda 3.
4. Sem lowpoly: textura PBR e props realistas por cima da geometria autoral.

O pedido 4 amplia a arena para ±68 e o campo para 18 m. A clareira mais funda
fica a 62,6 m; MATA1 mantém 5,4 m de mata fechada entre clareira e borda.

## Planta

| faixa (r) | o que é |
| --- | --- |
| 0 a 36 | cidade: avenida em cruz, vielas em ±22, anel perimetral de terra 31,5–36 |
| 36 a 54 | pasto: sobe 0,45 m em rampa ondulada; cerca a 37,2; córrego no lado norte |
| 53,4 a 54,6 | orla: primeira fileira de árvore, com colisor por tronco |
| 54,6 a 68 | parede de mata: colisor em colunas de 0,5 m, aberto só nas trilhas |

## Cotas do relevo

Os números vivem em `public/js/map_javaporcos_relevo.js`.

| constante | valor | o que decide |
| --- | --- | --- |
| `HALF` | 68 m | meia-extensão da arena (`bounds` ±68). Ninguém chega aqui a pé (MATA1). |
| `CIDADE` | 36 m | meia-extensão do miolo urbano; o pasto começa aqui. |
| `MATA_R` | 54 m | onde a mata começa. Pasto de 18 m: pedido 4 do prompt de 30/10. |
| `PASSO` | 0,5 m | passo da grade física de altura (273×273 floats). Malha visível: cidade plana 2 m, mata 1 m, pasto 2 m, córrego 1 m e aterro 0,5 m. |
| `PASTO_SOBE` | 0,45 m | rampa do pasto até a mata: lê como terreno, não como mesa. Ondulação de ±0,18 m por cima. |
| `BARRANCO` | 2,6 m | desnível entre a cidade e o platô da mata. |
| `SUBIDA` | 4,5 m | comprimento do barranco, de 54 a 58,5 (~0,7 m/m, subível pelo `_collide`). |
| `CORREGO_Z` | −41,6 | eixo do córrego no pasto norte, ondulando ±0,8 m. |
| `CORREGO_MEIA` / `CORREGO_FUNDO` | 2,3 / 1,1 m | leito; lâmina d'água a 0,42 m do fundo, só onde há corte. |
| `ATERRO_MEIA` | 2,4 m | a trilha norte cruza o córrego por aterro (sem corte a 2,4 m do eixo). |
| `TRILHA_MEIA` | 1,75 m | trilha de mata de 3,5 m. |
| `CLAREIRA_R` | 3,0 m | clareira de saída da horda. Com 3,4 m a zona livre dela encostava na orla e abria um quarto arco (MATA3). |

## Cotas da mata

Em `public/js/map_javaporcos_mata.js`.

| constante | valor | o que decide |
| --- | --- | --- |
| `V_ANDAVEL` / `V_PAREDE0` | 54,6 m | 0,6 m de orla caminhável; dali para fora é parede. |
| `V_PAREDE1` | 68 m | a parede vai até a borda. |
| `COLUNA` | 0,5 m | coluna de parede. Com 2,5 m a coluna vizinha da trilha caía inteira e deixava bolsões de 5 m entre troncos: a MATA3 mediu 9 arcos abertos onde devia haver 3. |
| corrida mínima | 0,5 m | trecho de parede menor que 1,4 m era descartado e virava furo ao lado da curva da trilha. |
| `FOLGA_TRILHA` | 2,9 m | trilha + meio corpo + margem. |
| `ACHATAMENTO` | 0,62 | copa em disco. |

A moita da orla encolhe até não passar de r = 53,4. Na versão anterior (pasto de 8 m): moita de 2,25 m de raio em 43,5 tapava
a linha de tiro (PASTO1 media 51% de raios livres antes disso; agora 138 de 140, primeiro acerto mediano
a 8,38 m da borda da cidade).

## Pasto

Tudo em lote (`construirPasto`, mata.js). Só mourão e cupinzeiro têm colisor.

- Capim em cartão de 3 planos cruzados, 0,5 m de grade com jitter: 3,37 tufos por m²
  do anel, altura crescendo da cidade para a mata, cor por instância
  seguindo a mancha seca. Some a 0,7 m do eixo da trilha.
- 289 touceiras de capim alto (0,9–1,55 m) em grupos de 2 a 5.
- 13 cupinzeiros (torno de 11 lados com ruído), 0,8 a 1,8 m.
- Cerca a 1,2 m da cidade: 72 mourões de 2,5 em 2,5 m com três fios de arame; aberta na
  avenida, nas vielas e onde a trilha passa.
- Trilha de terra batida da boca até a cidade, rebaixada 8 cm e pisoteada (mancha com
  recorte, não quadrado).
- Chão com cor por vértice (desvio 0,067 no canal mais variado).
- No navegador: textura `leafy_grass` no chão e 90 touceiras `capim_touceira_a/_b`.

## Frentes

`world.horda.frentes` — `rota` vai da clareira (dentro da mata) até a borda da cidade; a
caminhada a cada 0,25 m não acha colisor no corpo de 0,45 m, degrau acima de 0,3 m nem
chão visível acima do `groundHeightAt` (HORDA1).

| id | nome | boca | rota (clareira → cidade) |
| --- | --- | --- | --- |
| `norte` | Trilha do Norte | (−10, −54) | (−19, −59,6) → (−14,95, −59,4) → (−10, −57,4) → (−10, −54) → (−4,9, −45,2) → (−3, −36,4) |
| `leste` | Trilha do Leste | (54, 12) | (59,6, 21) → (59,4, 16,95) → (57,4, 12) → (54, 12) → (45,2, 6,1) → (36,4, 3) |
| `sudoeste` | Trilha do Sudoeste | (−24, 54) | (−33, 59,6) → (−28,95, 59,4) → (−24, 57,4) → (−24, 54) → (−21,8, 45,2) → (−22, 36,4) |
| `oeste` | Trilha do Oeste | (−54, 18) | (−59,6, 25) → (−59,4, 21,85) → (−57,4, 18) → (−54, 18) → (−45,2, 15,8) → (−36,4, 16) |
| `nordeste` | Trilha do Nordeste | (34, −54) | (38, −59,6) → (36,2, −59,4) → (34, −57,4) → (34, −54) → (30,7, −45,2) → (25, −36,4) |
| `sudeste` | Trilha do Sudeste | (28, 54) | (35, 59,6) → (31,85, 59,4) → (28, 57,4) → (28, 54) → (23,8, 45,2) → (22, 36,4) |

Norte chega na ponta da avenida norte, leste na avenida leste, sudoeste na viela oeste
pelo anel sul. `boarEntrances` são as seis clareiras, com o mesmo `id`.

## Becos

`world.horda.becos` — um por lado, no quarteirão externo; `de` fica no anel perimetral
(que encosta no pasto) e `ate` na viela. Largura livre medida entre colisores: 2,10 a
2,55 m, com parede dos dois lados em 100% das sondas (BECO1).

| id | nome | quarteirão | de | ate |
| --- | --- | --- | --- | --- |
| `beco-norte` | Beco do Medidor | LN-io | (14,13, −32,1) | (14,13, −23,15) |
| `beco-sul` | Beco do Varal | OS-io | (−14,13, 32,1) | (−14,13, 23,15) |
| `beco-leste` | Beco do Botijão | LS-oi | (32,1, 14,13) | (23,15, 14,13) |
| `beco-oeste` | Beco da Caixa | ON-oi | (−32,1, −14,13) | (−23,15, −14,13) |

Todos com `abreNaOnda: 3`; quem fecha o beco antes disso é o modo. Cada beco: sobrado
de reboco descascado de um lado, casa do outro, muro de 2,2 m fechando o resto,
medidor com eletroduto, janela gradeada, varal com roupa acima de 1,6 m, botijão com
colisor (o único que estreita o corredor: ainda cabe uma coluna de nós de 1 m), lixo e
lixeira. A faixa livre para navegação dentro do beco tem ≥ 1,19 m e sempre contém uma
coluna inteira da grade de 1 m.

## Setores

`world.horda.setores` — grade 3×3 cortada no fio da calçada da avenida (±8). O pasto
fica fora: é passagem, não território. Peso = área / 5.184 m².

| id | nome | x0, z0 → x1, z1 | peso |
| --- | --- | --- | --- |
| `cruzamento` | Cruzamento | −8, −8 → 8, 8 | 0,0494 |
| `av-norte` | Avenida Norte | −8, −36 → 8, −8 | 0,0864 |
| `av-sul` | Avenida Sul | −8, 8 → 8, 36 | 0,0864 |
| `av-oeste` | Avenida Oeste | −36, −8 → −8, 8 | 0,0864 |
| `av-leste` | Avenida Leste | 8, −8 → 36, 8 | 0,0864 |
| `quadra-no` | Quadra da Praça | −36, −36 → −8, −8 | 0,1512 |
| `quadra-ne` | Quadra da Igreja | 8, −36 → 36, −8 | 0,1512 |
| `quadra-so` | Quadra da Padaria | −36, 8 → −8, 36 | 0,1512 |
| `quadra-se` | Quadra do Boteco | 8, 8 → 36, 36 | 0,1512 |

## Props e texturas (só no navegador)

Em node `hasProp` é falso e o PBR não carrega: a régua e os portões medem a geometria
autoral. No navegador entram por cima, **sem colisor novo** (a navegação seria outra).

- PBR do Poly Haven: `asphalt_02`, `concrete_pavement`, `patterned_cobblestone`, `dirt`,
  `leafy_grass`, `sparse_grass`, `forest_leaves_02`, `worn_mossy_plasterwall` (casas,
  tingido), `damaged_plaster` (beco). A UV das caixas é por mundo e lê a largura da
  imagem antes do load: `pbr(id, { metros })` finge `metros × 128` px.
- Carros no lugar da caixa procedural, com o mesmo colisor: `junk_car` (5 de cada 9),
  `carro_batido_scan_03`, `carro_batido_scan_07`, `perua_pichada_scan`, `chevette_sl76`.
  Os Mint lowpoly (fusca, chevette, saveiro, opala, kombi, brasilia_vw) saíram do
  catálogo; `saveiro_robust` e `byd_dolphin` ficam fora por licença NC (PROPS1).
- Orla: samambaia (86%), calathea, arbusto; a moita-bolha da orla não é desenhada.
- Clareiras: árvore, tronco caído, toco, pedra, galhos. Beco: saco de lixo, caixa de
  papelão, lata, lixeira metálica. Rua: lixo solto vira `saco_lixo`/`caixa_papelao`
  (metade), engradado, cadeira e tambor na porta das lojas, tampa de bueiro. Praça:
  poste de luz e caixote de feira.

Ficaram de fora por orçamento: `poste_fiacao`/`poste_transformador` (12,5 k tris cada,
20 postes), `mato_erva` e `capim_touceira` em massa (2–3 k tris por peça), `uno_mille`
(64 primitivas = 64 chamadas por lote) e a barricada da praça (sem colisor ela seria
atravessável).

## Medição A/B

Chrome headless com GPU (Apple M4 Pro), 1440×960, `quality: high`, câmera posta à mão,
`renderer.info` de um quadro (passe principal + sombra). Bots escondidos.

| vista | antes (29/10) calls / tris | layout calls / tris | layout + props calls / tris |
| --- | --- | --- | --- |
| alta | 1.034 / 1,87 M | 1.048 / 1,74 M | 1.080 / 1,94 M |
| alta diagonal | 1.302 / 2,06 M | 1.289 / 1,87 M | 1.309 / 2,12 M |
| borda norte | 574 / 1,50 M | 610 / 1,38 M | 617 / 1,17 M |
| borda leste | 553 / 1,56 M | 573 / 1,41 M | 556 / 1,19 M |
| boca norte | 546 / 1,49 M | 587 / 1,34 M | 592 / 1,17 M |
| boca sudoeste | 663 / 1,62 M | 673 / 1,46 M | 661 / 1,31 M |
| beco norte | 1.202 / 2,02 M | 1.219 / 1,86 M | 1.202 / 1,96 M |
| beco leste | 1.199 / 1,98 M | 1.193 / 1,86 M | 1.206 / 2,01 M |
| centro | 1.087 / 1,89 M | 1.106 / 1,80 M | 1.079 / 1,64 M |

Calls ficam abaixo do teto de 1.400 em todas as vistas. Tris: o teto de 1,6 M do brief
já estourava antes desta passada (2,06 M); agora as vistas de jogo na borda ficam em
1,2–1,3 M e as que olham a cidade inteira em 1,6–2,0 M. Heap JS 253 MB (alarme 350).
Materiais: 65 → 109 (GLB); o teto de 90 do brief §7.3 está estourado pelos props.

Ruas e becos olham o mapa inteiro de dentro: ~0,9 M dos tris dessas vistas não são do
mapa (personagens, armas, céu). O que resta caro no mapa é a copa em icosaedro
(230 k + sombra) e os carros scan (40 k cada).

## Régua

`node tools/eval/javaporcos-mapa-check.mjs` — cláusulas MATA1–3, CHAO1, COMIDA1, NAV1,
TRILHA1–2, PASTO1–2, HORDA1, BECO1, SETOR1, PROPS1. Os 12 mutantes estão no cabeçalho
do arquivo; cada um acende a cláusula que diz medir.


### Tesselação da ampliação

A física continua amostrada a cada 0,5 m. A malha acompanha a dobra `x=z` do barranco
nos quadrantes norte/oeste e sul/leste: a diagonal oposta fazia ponte 0,346 m acima
do campo. A régua `eval:javaporcospasto` mede erro absoluto nos dois sentidos,
com a mesma folga 0,30 m de CHAO1/MAP1. Mutantes: campo curto, terreno afundado,
e diagonal antiga. O máximo observado após ajuste é 0,150 m.
O córrego mantém resolução 1 m, com o aterro norte 0,5 m; essa faixa é detalhada
porque a malha uniforme 1 m provocava penetração 0,43 m na borda do aterro.
