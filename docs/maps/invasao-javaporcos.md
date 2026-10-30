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
- `hordeObjectives` — `[{id, x, z, hp, r}]`, três, todos em ponto alcançável. O modo
  NÃO usa mais (o domínio substituiu os objetivos com vida em 30/10/2026).
- `horda` — o contrato da mecânica de domínio (ver "Domínio"):
  `frentes: [{id, nome, boca:{x,z}, rota:[{x,z},...]}]` (3; `boca` é a saída da trilha
  no pasto, `rota` vai da mata à borda da cidade), `becos: [{id, nome, de:{x,z},
  ate:{x,z}, abreNaOnda}]` (`de` no pasto, `ate` na rua) e `setores: [{id, nome, x0, z0,
  x1, z1, peso}]` (retângulos dentro de `cityBounds`; `peso` = área relativa). Sem ele o
  modo cai em fallback peça por peça (ver "Domínio").
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
- Bônus de onda: `1500 × (1 − domínio)`; bônus final: `3000 × (1 − domínio)` somado ao
  tempo, sem prêmio por prolongar a partida. Os tetos são os mesmos de antes (3 objetivos
  × 500 e 3 × 1000 de integridade).
- Placar mostra pontos, eliminações, assistências, maior combo e dano evitado.

## Modo multiplayer

- Servidor/host autoritativo decide spawn, navegação, dano, abate, pontuação,
  integridade e início/fim de onda.
- Snapshot replica `wave`, `seed`, `alive` (com `beco` quando o bicho foi sorteado para
  o beco), `controle` por setor (2 casas), `dominio`, `scoreByPlayer`, `prepLeft` e
  `winner`; eventos incluem `BOAR_SPAWN`, `BOAR_HIT`, `BOAR_KILLED`, `BOAR_LOST`,
  `FOOD_HIT`, `WAVE_CLEARED` e `HORDE_FINISHED`. O cliente não roda a IA: ele só
  aplica `controle`/`dominio` e redesenha o mini-mapa.
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
- Mecânica de domínio passa em `npm run eval:javaporcos` (cláusulas e mutantes em
  "Domínio") e a partida inteira é medida em `npm run eval:javaporcossim`.
- Capturas obrigatórias: cruzamento central nos quatro rumos, trilha de mata, clareira,
  praça e interior de loja, com draw calls e FPS medidos.
- Os quatro animais Mint e o cartaz OpenRouter são abertos e inspecionados; se o
  GLB não carregar, o inimigo usa fallback procedural com a mesma hitbox.

## Domínio

Decisão do dono (30/10/2026): os javaporcos querem DOMINAR o bairro e o jogador tem de
impedir. A % de domínio substituiu os três objetivos com vida. Vitória: sobreviver às 8
ondas (`WAVE_COUNTS` intocado). Derrota: domínio em 75%.

**Modelo.** Cada setor tem `controle` de 0 a 1. Sobe quando há pelo menos `minBichos`
javaporcos vivos dentro e nenhum defensor; desce quando há defensor e nenhum bicho;
disputado (os dois dentro) fica parado. O domínio é a média dos controles ponderada
por `peso`. Setor com controle 1 é "tomado" e fica vermelho no mini-mapa. A conta roda
a 4 Hz no host e vai no snapshot.

**Como a horda anda.** Nasce no início da `rota` de uma das 3 frentes (rodízio por
`seed + onda + ordinal`), segue os pontos da rota até a borda da cidade e só então
escolhe alvo: jogador no raio de agressão > lixo > setor. No setor em que está, se não
for tomado, ela VAGA (pontos a 3–6 m, no ritmo de 55%); quando ele é tomado, vai ao
setor não tomado mais perto que não esteja lotado. Bicho perseguindo jogador já dentro
da cidade larga a rota. A partir da onda 3, parte dos bichos é sorteada para o BECO:
depois da rota da frente emenda `de → ate` do beco aberto mais perto da boca e explora
o quarteirão (revira lixo num raio de 7 m ou vaga) por 9 s antes de seguir.

**Relógio.** A fúria (que já mexia em cadência, velocidade, dano e raio) ganhou um termo
de tempo de partida: `+0,1 por minuto`, sob o mesmo teto de 1,6. Com zero abates na onda
3: aos 2 min fúria 0,36 (cadência 0,132 s, velocidade 1,08×, dano 20,9, raio 21,8 m); aos
10 min fúria 1,16 (0,083 s, 1,26×, 27,4, 25,8 m). Antes era 0,16 nos dois instantes.

**Onda que vira no relógio.** Bicho que só vaga não morre sozinho (antes ele se
"gastava" no objetivo), então uma onda com bicho escondido nunca fechava: medido, a
semente 11 ficou 9 min presa na onda 3. Agora, com a onda inteira já na rua e
`COMBAT_SECONDS` (75 s, número de antes) zerado, a próxima vem com as sobras ainda vivas.
Na onda 8, chegar ao fim do relógio é a vitória.

| constante | valor | o que decide |
| --- | --- | --- |
| `DOMINIO.derrota` | 0,75 | derrota (decisão do dono). |
| `DOMINIO.minBichos` | 3 | bichos sem defensor para o setor começar a cair; 1 ou 2 extraviados não tomam nada. |
| `DOMINIO.sobe` | 1/40 por s | 40 s de setor ocupado e sem defensor para tomá-lo. Com 1/20 os bots perdiam já na onda 3 (3,2–3,6 min); com 1/40 perdem nas ondas 5–7 (7,2–9,9 min), o mesmo ponto em que perdiam pelos objetivos antigos (ondas 4–7, 3,0–9,0 min). |
| `DOMINIO.desce` | 1/10 por s | retomar é 4× mais rápido que perder: limpar o setor e ficar 10 s devolve tudo. |
| `DOMINIO.passo` | 0,25 s | período da contagem por setor (O(bichos × setores), 4 Hz basta). |
| `DOMINIO.lotado` | 6 | acima disso no setor-alvo, o bicho prefere o próximo: é o que espalha a horda. |
| `FRENTES` | 3 | frentes de trilha (decisão do dono). |
| `BECO.abreNaOnda` | 3 | padrão quando o beco do mapa não diz (decisão do dono). |
| `BECO.fracao` | 0,4 | fatia da onda sorteada para o beco (determinística, semente + ordinal). |
| `BECO.explorar` | 9 s | tempo de "explorar" o quarteirão depois do beco. |
| `BECO.raio` | 7 m | raio da exploração em volta do `ate` do beco. |
| `ROTA_RAIO` | 3 m | distância em que o ponto da rota conta como alcançado. |
| `VAGAR_RITMO` | 0,55 | velocidade relativa enquanto vaga no setor. |
| `VAGAR_TROCA` | 5 s | validade de um ponto de vagar antes de sortear outro. |
| `FURIA.porMinuto` | 0,1 | fúria por minuto de partida. |

**Fallback enquanto o mapa não exporta `world.horda`.** Frentes: as 3 `boarEntrances`
mais afastadas entre si (no mapa de 29/10: n1, s3 e l1), com rota da clareira até a borda
de `cityBounds`. Becos: nenhum. Setores: grade 4×4 sobre `cityBounds`, peso 1.

**HUD.** O painel do topo ganhou "DOMÍNIO DA HORDA x%" com "n/N SETORES TOMADOS · PERDE
EM 75%" ao lado, a barra com a marca branca em 75% e o mini-mapa de 96 px (setor verde = livre,
laranja = caindo, vermelho = tomado; ponto vermelho = boca de frente; ponto amarelo = beco
aberto; ponto branco = jogador).

**A/B medido** (`tools/eval/javaporcos-dominio-sim.mjs --becos=vielas`, jogo real no
mapa de 29/10, jogador parado + 2 bots aliados, 5 sementes; antes = código de 66da760 com
o domínio calculado por observação com as mesmas constantes):

| | antes | depois |
| --- | --- | --- |
| fim da partida | derrota pelos objetivos, ondas 4–7, 3,0–9,0 min | derrota por domínio, ondas 5–7, 7,2–9,9 min |
| domínio no fim | 18–44% (ninguém media) | 75% |
| bocas usadas | 10 (16–46 bichos cada) | 3 (n1/s3/l1, cotas iguais ±1) |
| bichos das ondas ≥ 3 que entram por beco (`de` → `ate`) | 3,6–7,4% (passagem casual) | 34,9–53,8% |
| fúria aos 2 min | 0,10–0,22 | 0,31–0,38 |

Becos medidos com 4 becos sintéticos nas vielas do mapa de 29/10; o número real depende
do `world.horda.becos` do mapa novo.

No mapa novo com o contrato (commit 340a87a: 3 frentes, 4 becos de 2,5 m, 9 setores),
5 sementes: derrota nas ondas 4–6 aos 5,3–8,2 min, cada frente com a mesma cota (±1) e
23–34% dos bichos das ondas ≥ 3 entrando por beco. Cai um pouco antes que no mapa de
29/10 porque 9 setores pesam mais cada um que 16.

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
