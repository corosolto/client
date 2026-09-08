# Programa de qualidade dos mapas — 08/09/2026

## Objetivo e definição de pronto

Elevar o catálogo jogável ao mesmo padrão de identidade brasileira, leitura competitiva,
ambiência e estabilidade. Um mapa só está pronto quando as quatro camadas abaixo passam
separadamente:

1. **Combate:** spawns protegidos, saídas viáveis, flancos, cobertura, interiores e posições
   disputáveis com contrajogo. Uma janela precisa criar uma decisão de ataque e defesa; não é
   decoração.
2. **Leitura visual:** marcos reconhecíveis, materiais na escala correta, silhueta própria,
   horizonte coerente e separação clara entre caminho, cobertura e fundo.
3. **Vida local:** soundscape espacial próprio, movimento ambiental e fauna coerente com o
   lugar, sem bloquear tiro, navegação ou leitura de inimigo.
4. **Entrega:** régua vermelha antes do conserto, mutação que prova a régua, gates verdes,
   captura real em 3:2, partida humana e ensaio 8x8 em qualidade média e baixa.

O mapa continua reprovado se uma dessas camadas faltar. Material correto não compensa arena
sem decisões; fauna não compensa spawn exposto; um gate verde não substitui a captura jogada.

## Estado observado

Este é um checkpoint de coordenação, não uma fonte permanente para o estado do GitHub. Antes
de retomar uma lane, conferir branch, HEAD, status e PR novamente.

### Produção realmente ativa

- `miticos-time-completo`, branch `astra/miticos-time-completo`, HEAD `d9a2deb1`: Claude está
  gerando e validando os conjuntos de animação de Bandeirante, Boto, Cuca, Curupira, Lampião,
  Maria Bonita e Saci. Há GLBs e índice modificados ainda sem commit; não dividir essa worktree
  com outro agente. O PR #532 continua sendo a integração menor e limpa do Lobisomem, não a
  entrega desse time completo.
- A frente de viewmodel continua ativa. Mosin/SVD/SKS estão no PR #513 como pacote offline;
  LMG está no PR #546, ainda reprovada pela mão de apoio; DMR e controles têm checkpoints
  próprios. Há também uma edição Claude em andamento no checkout
  `/Users/ruben/csbrasil/client`, então esse checkout deve ser preservado até o checkpoint.

### Mapas

- PR #526 Sertão, #529 Escadão, #530 Campinho e #533 Joá estão abertos e conflitantes com
  `main`. Servidor aberto ou worktree existente não significa produção em curso.
- PR #538 é inventário medido dos seis mapas legados. Ele não altera runtime.
- A branch `codex/mapas-escala-amazonia` concluiu uma passada transversal de escala de UV e
  anisotropia. O próprio relatório declara que identidade, ambiência e desenho competitivo
  continuam pendentes.
- Portanto, a produção autoral dos mapas está parada neste checkpoint. O próximo trabalho não
  deve começar por mais textura transversal; deve fechar o feedback humano e os conflitos dos
  mapas já abertos.

## Fila de produção

### P0 — fechar feedback humano já aberto

#### Escadão — PR #529

Objetivo de combate:

- transformar a casa principal, no eixo do escadão, em ponto disputado e acessível;
- abrir janelas úteis dos dois lados: uma cobrindo a escada e outra cobrindo a aproximação do
  respawn inferior;
- fechar o buraco do piso e provar circulação de cápsula por porta, cômodo e janelas;
- criar, perto do respawn superior, casas com acesso lateral ao andar de cima, oferecendo
  posição defensiva com rota de expulsão;
- preservar tiro de resposta: nenhuma janela pode dominar spawn ou rota inteira sem cobertura
  e alternativa de aproximação.

Antes de editar, as capturas do dono com janelas fechadas e piso furado viram casos vermelhos.
O aceite exige partida dos dois lados e uma matriz de linhas de tiro: laterais, casa central,
escadões e defesa superior.

#### Sertão — PR #526

Objetivo de combate:

- remover a carroça como bloqueio involuntário e medir a largura real das passagens;
- tornar acessíveis as casas próximas dos dois spawns;
- abrir janelas voltadas à praça e às aproximações, com cobertura e rota lateral para expulsar
  quem estiver dentro;
- revisar a praça como encontro de rotas, sem voltar ao campo totalmente aberto;
- manter o pôr do sol alaranjado, mas separar inimigos do horizonte e das fachadas.

O primeiro passo é atualizar a worktree local, que está atrás do remoto, preservar os commits
existentes e então resolver o conflito com `main`. O mapa só volta ao dono quando carroça,
casas e janelas forem testados no build real.

#### Campinho — PR #530 e Joá — PR #533

Resolver os conflitos seletivamente e repetir as capturas de navegação, CTF, colisão e 8x8.
Não ampliar arte antes de provar que os trabalhos já feitos sobreviveram à atualização de
`main`.

### P1 — Piscina como piloto de retenção

A Piscina sobe para o primeiro mapa novo desta rodada porque é a mais jogada segundo o dono.
A auditoria estática anterior viu boa simetria e cobertura, mas isso não mede a sensação humana
de arena aberta e sem decisões.

Preservar a piscina central e a leitura rápida. O blockout deve experimentar três famílias de
posição:

- corredor lateral de serviço/vestiário, com entrada e saída distintas;
- cobertura quebrada no deck, sem criar uma muralha contínua;
- posição elevada curta em arquibancada, cabine técnica ou passarela, exposta a pelo menos duas
  respostas.

A ambiência própria deve combinar água, reverberação do salão, respingos ocasionais e vida
discreta no entorno. A fauna só entra se fizer sentido no recinto e continuar barata no modo
baixo. Comparar o novo loop de combate com a versão atual em partidas 5x5 e 8x8; conservar uma
opção de combate rápido, pois essa é parte da identidade do mapa.

### P2 — mapas de Emerson

#### Obras da Prefeitura

- corrigir as bandeiras nas escavações e a diferença de cota já medida;
- proteger os spawns hoje muito expostos;
- criar interior de escritório/contêiner, andaime ou mezanino disputável;
- ligar lados com corredor de serviço e cobertura de obra, sem transformar entulho em labirinto;
- usar som de obra, vento e metal localizados, com pássaros urbanos discretos.

#### Atacadão

- corrigir o desequilíbrio de acesso ao meio e da bandeira próxima demais do spawn;
- abrir uma rota lateral por doca, depósito ou corredor de serviço;
- autorar gôndolas como linhas de cobertura com travessias, não barreiras compridas;
- reforçar doca, caixas, refrigeração, anúncio e ruído de carrinho como identidade;
- decidir um nome fictício antes de aprofundar a direção visual ligada a marca real.

#### Posto

- preservar a simetria de rotas já medida;
- tornar loja de conveniência, oficina ou lava-rápido uma rota interna curta;
- criar proteção nas travessias abertas sem bloquear bombas e acessos;
- restaurar seletivamente assets históricos somente com procedência confirmada;
- usar tráfego distante, compressor, porta e fauna urbana como soundscape próprio.

### P3 — reconstruções legadas

#### Parque da Treta

Primeiro corrigir o meio assimétrico. Depois escolher uma referência brasileira única e
documentada antes de modelar. Parque Madureira e Ibirapuera são hipóteses de pesquisa, não uma
decisão. O mapa precisa de alamedas, equipamentos de lazer, vegetação, sombra, som e animais
que também definam rotas e marcos.

#### Penitenciária

Tratar como reconstrução de material, custo de cena e CTF. O mapa atual tem a pior combinação
medida de exposição, densidade visual e draw calls entre os seis legados auditados. Manter o
nome genérico enquanto a direção Carandiru/Bangu não passar por pesquisa histórica, editorial
e de assets. A referência deve orientar pátio, galerias, passarelas, guaritas e rotas; não usar
uma tragédia real apenas como revestimento visual.

### P4 — restante do catálogo

Reavaliar Lajes, Amazônia, Córrego, Quebrada, Ferro Velho, Loja H, Praça dos Três Poderes e
UPA com telemetria e feedback humano depois das ondas acima. Mapas recém-mergeados entram em
manutenção dirigida por defeito, evitando mais uma reautoria geral enquanto os mapas abertos
continuam sem fechamento.

## Divisão entre modelos e worktrees

- **Claude Opus:** direção visual e blockout jogável de um mapa por vez. Primeiro Escadão ou
  Sertão depois de terminar e checkpointar Míticos; depois Piscina.
- **GLM no ZCode:** inventário, réguas vermelhas, mutantes, medições repetitivas, catálogo de
  assets e implementação procedural bem especificada. Não dá aprovação visual final.
- **Codex integrador:** resolver conflitos com `main`, proteger sistemas compartilhados,
  executar gates, revisar diffs, organizar PRs e release.
- **Astra:** crítica visual final dos mapas de maior impacto e desempate de direção. Usar em
  checkpoints, não como operário de todas as passadas.

Um agente por worktree. `game.js`, registro de mapas, ambiência compartilhada e materiais
compartilhados têm um único integrador. Mudanças específicas de mapa ficam em PRs separados.
A infraestrutura comum de ambiência, se necessária, vira PR próprio antes dos consumidores.

## Sequência imediata

1. Deixar Claude concluir e checkpointar Míticos; não interromper os GLBs em geração.
2. Fazer checkpoint da edição de viewmodel no checkout principal e voltar a uma worktree
   exclusiva antes de continuar essa frente.
3. Atualizar e resolver primeiro Escadão e Sertão, transformando exatamente os screenshots
   reprovados em testes e capturas de aceite.
4. Resolver Campinho e Joá sem ampliar escopo.
5. Abrir a worktree exclusiva da Piscina e produzir blockout de rotas antes de materiais,
   animais ou sons.
6. Executar Obras, Atacadão e Posto em PRs separados.
7. Pesquisar e decidir a direção de Parque e Penitenciária antes de reconstruir.

Cada PR entrega: baseline, mudança de topologia, ambiência, custo, mutação, capturas antes/depois,
limitações e roteiro de teste local. O release é feito em ondas pequenas para associar regressão,
desempenho e retenção ao mapa que realmente mudou.
