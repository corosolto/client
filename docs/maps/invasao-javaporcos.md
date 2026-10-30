<!-- spec:mapa -->
# 02 — Invasão dos Javaporcos

Modo cooperativo de sobrevivência e pontuação numa cidade do interior CERCADA de mata
fechada. O time segura ondas de javalis e javaporcos que saem de dez bocas de mata,
entram pelas ruas, reviram o lixo e avançam sobre a feira, a mercearia e a igreja. Sem
gore: impacto, poeira, tropeço e desaparecimento substituem ferimentos explícitos.

## Local real

Composição original de cidadezinha de interior engolida pela capoeira: quatro
quarteirões por quadrante, avenida em cruz, viela de terra, praça com feira e um
cinturão de mata que é, ele mesmo, o limite do mapa. O contexto ambiental é factual: o
Ibama classifica o javali (`Sus scrofa`) como espécie exótica invasora e regulamenta seu
controle. O cenário não reproduz uma propriedade ou município específico.

## Layout

- **Pegada:** 116 × 116 m (`bounds` ±58). Miolo urbano em `cityBounds` ±36; cinturão de
  mata de 22 m entre r = 36 e r = 58, com r = max(|x|, |z|).
- **Malha urbana:** avenida em cruz de 12 m (x = 0 e z = 0) com calçada de 2 m e meio-fio
  de 0,15 m; viela de terra de 3,5 m em |x| = 22 e |z| = 22; anel perimetral de terra
  entre 31,5 e 36 m. A calçada PARA no cruzamento — ela não atravessa a pista.
- **Quarteirões:** 16 blocos de 12,25 m (internos) e 7,75 m (externos). 29 edificações:
  casa térrea de 3,00 m, sobrado de 6,00 m, 4 lojas com interior acessível (mercearia,
  padaria, boteco, loja de ração), igrejinha com campanário de 9,8 m e torre de caixa
  d'água de 8,5 m. 15% a 25% das massas giradas de 2° a 14°.
- **Mata:** 1.212 árvores instanciadas (tronco + três camadas de copa achatada) e 4.924
  peças de sub-bosque, cipó e capim. A faixa de 36 a 37,9 m é caminhável, com colisor por
  tronco; de 37,9 m para fora é parede de colisor até a borda.
- **Entradas:** 10 bocas de mata (3 norte, 3 sul, 2 leste, 2 oeste). Cada uma é uma
  trilha de 3,5 m que entra na mata, DOBRA e morre numa clareira de 3,8 m de raio —
  nenhuma delas enxerga ou alcança a borda do mapa.
- **Relevo:** barranco de 2,6 m entre a cidade e o platô da mata, córrego de 1,4 m de
  corte no sopé norte com duas pontes de madeira, calçada a 0,15 m e soleira de loja a
  0,33 m. Tudo sai de UM campo de altura (ver abaixo).
- **Objetivos:** feira (corredor da praça), mercearia (porta) e igreja (adro). Cada um
  leva `r`, que é a distância em que o bando já encosta — objetivo no miolo do prédio
  deixava a horda empacada na parede a 6,6 m.
- **Lixo e comida:** 16 `foodSpots` (7 lixo, 3 caçamba, 4 feira, 2 ração), todos dentro
  de `cityBounds`, cada um com dois estados de malha (íntegro e revirado).

## Contrato do mundo

`buildInvasaoJavaporcos` devolve, além de `root`/`colliders`/`occluders`/`spawns`:

- `groundHeightAt(x, z)` — altura REAL do chão. É a amostra bilinear de uma grade de
  0,5 m (233 × 233 floats, 217 kB) construída UMA vez no boot. Custo por chamada: 2
  truncamentos, 4 leituras de `Float32Array` e 3 interpolações, sem alocação e sem ramo
  de busca. A horda chama dezenas de vezes por quadro e NÃO precisa cachear. A malha do
  terreno é amostrada da MESMA grade, então o chão desenhado e o chão medido são o mesmo
  número — é o conserto do "javaporco indo por baixo da terra".
- `cityBounds` — `{minX:-36, maxX:36, minZ:-36, maxZ:36}`.
- `boarEntrances` — 10 clareiras `{id, lado, x, z}`.
- `foodSpots` — `[{id, x, z, hp, kind, r}]`, `kind` em `lixo|feira|cacamba|racao`. `r` JÁ
  é a distância do centro do ponto em que o focinho alcança (meia-extensão do colisor +
  0,40 m): quem consome não soma folga de corpo.
- `foodMesh(id)` e `foodCollider(id)` — o `Object3D` e o colisor VIVO daquele ponto (o
  mesmo objeto do array `colliders`, não cópia: mexer no `maxY` muda a colisão na hora).
- `hordeObjectives` — `[{id, x, z, hp, r}]`, três, todos em ponto alcançável.
- `lojas` — `[{papel, eixo, sinal, porta:{x,z,dentro}, interior:[x,z]}]`.
- `waypoints:{nodes,adj}`, `nearestWaypoint(x,z)` (índice de célula, O(1)) e
  `findPath(a,b)` (BFS com buffers do mapa, zero alocação por chamada). Grade de 1,0 m,
  5.595 nós e 10.014 arestas, com costura explícita na porta de cada loja e teste de
  meio de aresta — em 1,5 m existiam arestas atravessando muro de 0,15 m.

## Cobertura (cover)

- Mata: tronco, moita e capim mascaram movimento; só o tronco absorve tiro.
- Rua: carro parado colado na calçada (nunca no cruzamento), caçamba, poste e muro de
  bloco de 1,80 m, 2,20 m na esquina.
- Quarteirão: viela de 3,5 m, puxadinho e quintal com caixa d'água.
- Corredores de 1,8 m mínimos acomodam dois animais e um jogador sem travamento.

## Linhas de visão

- Dentro da mata: até 10 m — a parede fecha por sub-bosque, não por tronco.
- Trilha: corredor de 3,5 m com copa cruzada por cima; a boca lê como túnel escuro.
- Rua secundária e viela: 18 a 30 m.
- Avenida: 72 m de ponta a ponta, quebrados por poste, fiação e carro parado.

## Pontuação e progressão

- Javali jovem: 100 pontos; javaporco: 180; matriarca: 300; aríete da onda: 500.
- Assistência vale 40% dos pontos, dividida proporcionalmente pelo dano.
- Combo cresce por abates em até 4 s: ×1,0, ×1,25, ×1,5, ×2,0; dano aliado não
  existe e acerto em objetivo não gera pontos.
- Bônus de onda: `500 × objetivos intactos`; bônus final: integridade restante
  somada ao tempo, sem prêmio por prolongar a partida.
- Placar mostra pontos, eliminações, assistências, maior combo e dano evitado.

## Modo multiplayer

- Servidor/host autoritativo decide spawn, navegação, dano, abate, pontuação,
  integridade e início/fim de onda.
- Snapshot replica `wave`, `seed`, `aliveIds`, `objectiveHealth`, `scoreByPlayer`,
  `prepLeft` e `winner`; eventos incluem `BOAR_SPAWN`, `BOAR_HIT`, `BOAR_KILLED`,
  `OBJECTIVE_HIT`, `WAVE_CLEARED` e `HORDE_FINISHED`.
- Posição usa quantização já adotada pela simulação; fauna usa IDs estáveis por
  `matchSeed + wave + ordinal`. Partículas, vegetação e música não entram no hash.
- Offline usa o mesmo estado com companheiros bots. A rede é opcional, nunca
  substitui o fallback local.

## Cinemática e áudio

- Vitória: 10 s em tempo real — câmera sobe do portão intacto, cruza o milho
  salvo e revela o amanhecer no campo; placar entra sobre a última tomada.
- Derrota: 6 s — portão cai, luzes do bairro apagam e a câmera recua, sem gore.
- Música: marcha instrumental original de 18–24 s, caixa militar, metais e viola
  caipira discreta; sem hino, voz, melodia protegida ou imitação.
- OpenRouter gera o cartaz 2D. A faixa exige um provedor de música compatível; o
  fluxo OpenRouter atual do projeto gera imagem e voz, não música. Mint só entra no
  3D: javali jovem, javaporco adulto, matriarca e aríete. Os quatro compartilham
  material e LOD, mas preservam silhuetas diferentes.

## Referências

- Ibama — manejo e controle do javali:
  https://www.gov.br/ibama/pt-br/assuntos/biodiversidade/especies-exoticas-invasoras/manejo-e-controle-do-javali
- Ibama — Manual de Boas Práticas para o Controle de Javali:
  https://www.gov.br/ibama/pt-br/assuntos/notas/2020/manejo-e-controle-de-javalis/20201217Manual_do_Javali_Digital.pdf
- Embrapa — avaliação de impacto em lavoura de milho:
  https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1148617/1/CT124-Avaliacao-Javali2022.pdf
- Prompts e resultados registram provedor e hashes em
  `public/models/enemies/javaporcos/asset-manifest.json`.

## Régua de aceite
- Ficha passa em `node tools/spec.mjs check docs/maps/invasao-javaporcos.md`.
- Oito ondas terminam em 20/20 sementes, sem mais de 24 animais vivos.
- Mutante que duplica o crédito de assistência reprova a soma de pontos.
- Mutante que remove uma entrada reprova a conectividade das bocas de mata.
- Mapa passa em `node tools/eval/javaporcos-mapa-check.mjs` (MATA1 cerco, MATA2
  densidade e bocas, CHAO1 relevo, COMIDA1 lixo na cidade, NAV1 grade limpa, TRILHA1 e
  TRILHA2 rota até dentro da loja) e nos mutantes `mata-furada`, `chao-constante`,
  `comida-fora` e `trilha-solta`.
- Mapa passa no `node tools/eval/mapa-novo-gate.mjs` em ORT1, ALT1, SUP1, SUP2, JOG1 e
  JOG2, sem entrada na dívida declarada.
- Dois clientes com a mesma semente fecham cada onda com IDs, integridade e
  pontuação idênticos.
- Bots defendem ao menos dois objetivos em 30–70% das sementes na dificuldade
  média; fora dessa faixa o balanceamento está trivial ou impossível.
- Capturas obrigatórias: cruzamento central nos quatro rumos, trilha de mata, clareira,
  praça e interior de loja, com draw calls e FPS medidos.
- Os quatro animais Mint e o cartaz OpenRouter são abertos e inspecionados; se o
  GLB não carregar, o inimigo usa fallback procedural com a mesma hitbox.

## Cotas do relevo

Os números vivem em `public/js/map_javaporcos_relevo.js`; o porquê de cada um é aqui.

| constante | valor | o que decide |
| --- | --- | --- |
| `HALF` | 58 m | meia-extensão da arena (`bounds` ±58). A mata começa muito antes: ninguém chega aqui a pé. |
| `CIDADE` | 36 m | meia-extensão do miolo urbano (`cityBounds` ±36). É o que a horda tem de alcançar. |
| `PASSO` | 0,5 m | passo da grade de altura (233×233 floats). Metade do corpo do javaporco jovem: degrau menor que isso não muda rota. |
| `BARRANCO` | 2,6 m | desnível entre a cidade e o platô da mata. Acima de 2,6 m o jogador não sobe sem rampa, e é isso que fecha o cerco. |
| `SUBIDA` | 4,5 m | comprimento horizontal do barranco (inclinação de ~30°): sobe-se pela trilha, não pela parede. |
| `CORREGO_Z` | −39 | eixo do córrego, no sopé do barranco norte. |
| `CORREGO_MEIA` | 3,2 m | meia-largura do leito. |
| `CORREGO_FUNDO` | 1,4 m | profundidade no eixo: atravessar molhado custa tempo, não vida. |
| `PONTES` | x = −20 e 28 | as duas travessias de madeira; o resto do córrego é passagem lenta. |
| `PONTE_MEIA` | 2,2 m | meia-largura da ponte. |

## Cotas da mata

Em `public/js/map_javaporcos_mata.js`.

| constante | valor | o que decide |
| --- | --- | --- |
| `V_ANDAVEL` | 37,9 m | fim da faixa de mata caminhável: daqui para dentro ainda se anda entre as árvores. |
| `V_PAREDE0` / `V_PAREDE1` | 37,9 m até `HALF` | a parede de colisor. Ela vai até a borda porque canto aberto virou fuga medida na régua. |
| `COLUNA` | 2,5 m | largura da coluna de parede: mais fina cola melhor na curva da trilha. |
| `FOLGA_TRILHA` | 2,9 m | trilha (1,75) + meio corpo + margem, para o bando não entalar na boca. |
| `ACHATAMENTO` | 0,62 | a copa é disco, não bola: proporção medida nas referências de arte. |
