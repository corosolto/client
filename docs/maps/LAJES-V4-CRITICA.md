# LAJES V4 — crítica visual independente

Pedido: melhorar ambiência, simplificar caminhos, começar no respawn embaixo e corrigir escala dos barracos. Direção: comunidade brasileira habitada, praça e disputa cima × baixo, sem casas clonadas nem blocos indistintos.

Veredito: **REPROVADO**. A rua é compreensível, portas e janelas já fornecem referência doméstica, e os varais, comércio e fiação comunicam Brasil. Porém o conjunto ainda parece uma vila modular muito regular. Os spawns apresentam uma barreira com placa antes de apresentarem o espaço de jogo; a praça se parece com outra seção de rua; e a espessura das coberturas e da escadaria continua dando peso excessivo aos barracos.

Revisão somente dos nove PNG servidos em `artifacts/lajes-visual/v4/images/`, abertos com `view_image`: `spawn-sul`, `spawn-norte`, `praca-sul`, `praca-norte`, `praca-da-laje`, `laje-oeste`, `beco-oeste`, `escada-norte`, `fachada-oeste`. Sem código, relatórios ou justificativas de construção. Armas, personagens e HUD fora do escopo. Referências externas não foram fornecidas. Não há medição física nem verificação de colisões nesta revisão.

| Eixo | Veredito | Evidência visível e correção barata |
| --- | --- | --- |
| Caminhos simples | **APROVADO**, apenas quanto à leitura dos trechos mostrados | `beco-oeste` tem um eixo contínuo e `praca-sul`/`praca-norte` deixam o corredor principal legível. Preservar esses eixos. As imagens não provam a conectividade completa. |
| Orientação ao nascer embaixo | **REPROVADO** quanto à apresentação | Nos dois `spawn-*`, a placa ocupa o centro e esconde o destino. As saídas laterais são menos evidentes que o obstáculo. Deslocar a placa para uma parede lateral e abrir visão da praça e de uma subida. As imagens são compatíveis com nascimento ao nível da rua; não provam a posição inicial efetiva. |
| Praça e leitura cima × baixo | **REPROVADO** | `praca-norte`/`praca-sul` mostram duas fileiras iguais e um elemento retangular no eixo distante. `praca-da-laje` mostra a vista superior, mas a relação entre acesso e área central não é clara nas vistas ao nível da rua. Marcar uma subida principal e um pequeno núcleo de praça lateral, sem acrescentar rotas. |
| Escala humana dos barracos | **REPROVADO** | Portas e janelas em `fachada-oeste` são reconhecíveis; o problema mais evidente é o conjunto: faixas de cobertura espessas e contínuas em `praca-da-laje`, paredes laterais maciças em `escada-norte`. Afinar visualmente essas bordas e interromper a faixa de coroamento por residência. Não reduzir casas inteiras de maneira uniforme. |
| Diversidade de casas e silhueta | **REPROVADO** | Em `praca-da-laje` e nas duas vistas da praça repetem-se porta, janela, marquise, altura e alinhamento. A fileira de fundo também repete caixas com capas claras. Alterar duas ou três fachadas marcantes e a silhueta de alguns volumes de fundo. |
| Identidade brasileira | **APROVADO** | Tijolo aparente, comércio em português, varais, antenas, instalações externas e fiação funcionam em conjunto. Preservar esses sinais. |
| Ambiência habitada convincente | **REPROVADO** | Vasos idênticos e simétricos nos spawns; trio de vasos alinhados nas praças; chão e fachadas repetidamente limpos; lojas fechadas com a mesma porta das casas. Concentrar sinais distintos de uso em duas ou três áreas, em vez de distribuir o mesmo objeto. |

## Três problemas prioritários para a próxima rodada

### 1. A repetição domina a identidade das casas

**Evidência:** `praca-da-laje.png` expõe claramente a sequência porta/janela sob uma faixa contínua de concreto. As duas vistas da praça repetem praticamente o mesmo ritmo; a cor e a placa comercial mudam, mas a arquitetura não. Ao fundo, caixas de tijolo com coroamento claro reforçam a mesma repetição.

**Correção barata:** manter implantação e colisões principais, mas criar três marcos: bar com abertura larga escura/balcão, casa com janela deslocada e telhadinho de uma água, casa com pequeno volume superior recuado. Aplicar mudanças de altura e recuo visual a poucas casas, quebrando a linha contínua das coberturas. Não espalhar novos detalhes em todas as fachadas.

**Critério visual de aceite:** nas duas vistas da praça, distinguir pelo menos três casas pelo formato e abertura, sem depender de cor ou texto. Em `praca-da-laje`, a linha superior não deve parecer uma única longa faixa dividida por pintura.

### 2. O spawn mostra um bloqueio; a praça não se anuncia

**Evidência:** `spawn-sul.png` e `spawn-norte.png` colocam um grande painel opaco no ponto de fuga. A seta exige leitura para descobrir saídas. Nas vistas `praca-*`, o centro continua um corredor longo, sem um marco espacial que o faça parecer praça. `escada-norte.png` só torna a subida inequívoca quando a câmera já está diante dela.

**Correção barata:** mover o painel do spawn para a lateral, preservando cobertura necessária fora do eixo de visão. Do nascimento, enquadrar a entrada da praça e a base de uma subida principal. Agrupar banco, árvore pequena ou toldo em uma única margem da praça, deixando o meio livre; aproveitar o espaço existente. Uma faixa de piso e corrimão contrastante podem identificar a subida sem acrescentar caminhos.

**Critério visual de aceite:** no primeiro frame ao nível da rua, enxergar onde avançar e onde subir, sem ler placas. Ao entrar na praça, reconhecer um lugar de encontro distinto do beco, mantendo as saídas visíveis.

### 3. Massa de concreto e decoração repetida reduzem escala e vida

**Evidência:** `escada-norte.png` parece uma estrutura pesada e monumental: paredes laterais largas, degraus muito regulares e grandes massas superiores. Em `praca-da-laje`, os coroamentos pesam mais que detalhes domésticos. `spawn-*` usa pares simétricos do mesmo vaso; `praca-*` repete o trio de plantas. `beco-oeste` tem uma moto identificável, mas longas paredes e chão quase sem sinais localizados de uso. `laje-oeste` tem um varal eficaz como sinal doméstico, porém ocupa grande parte do primeiro plano e compete com a leitura do caminho superior.

**Correção barata:** preservar as alturas funcionais, afinar bordas visuais das lajes e a terminação das laterais da escada; adicionar um corrimão simples que dê referência humana. Trocar parte dos vasos repetidos por dois pequenos conjuntos distintos: cadeira/balde junto a uma porta e caixas/engradado junto ao comércio. Acrescentar manchas localizadas sob peitoris e junto ao chão, sem escurecer toda a cena. Encostar moto e varal nas bordas das respectivas rotas para reforçar circulação livre. Não adicionar mais objetos no meio da rua.

**Critério visual de aceite:** portas, degraus e corrimão devem reger a leitura de escala; coberturas deixam de dominar as fachadas. Objetos passam a indicar usos e moradores diferentes, em vez de repetição decorativa. O caminho da laje permanece legível desde sua entrada.

## Limites honestos

Não é possível confirmar tamanho em metros, local real de respawn, colisão, desempenho, alcance das rotas ou equilíbrio cima × baixo por estes PNG. Nenhum veto visual evidente foi encontrado no ambiente mostrado. Isso não equivale a auditoria de origem/licença de texturas. A próxima revisão deve repetir os mesmos enquadramentos, acrescentando somente a vista inicial com praça e escada visíveis após a correção.
