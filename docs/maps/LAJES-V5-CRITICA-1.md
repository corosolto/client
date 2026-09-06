# Lajes V5 — crítica independente por pixels

Avaliação de `artifacts/lajes-visual/v5/browser-first` contra os nove PNGs de mesmo nome em `artifacts/lajes-visual/v4/browser-approved`. Branch verificada: `codex/lajes-visual`. Os dois `cameras.json` usam 1536×1024, FOV 70, qualidade med. Oito poses são idênticas; `beco-oeste` muda x de -15 (V4) para -14 (V5), mantendo os demais parâmetros. Portanto, a melhora de confinamento do beco é uma leitura do resultado final, não uma medição A/B isolada da geometria. Coordenadas abaixo usam origem no canto superior esquerdo. Não consultei relatórios de builders, código de produção ou placares. Não executei browser, testes, produção ou commits.

**Veredito: V5 melhora a V4, mas ainda reprovo como resolução da perda de identidade de favela.** O beco-oeste está visualmente mais estreito e habitado por fachadas, e o vazio atrás das lajes ganhou volume urbano. Isso deve ser preservado. A repetição próxima e a família de edifícios do fundo ainda fazem a cena parecer um conjunto montado em série. Este é um julgamento editorial sustentado pelos recortes nomeados, não uma nota científica nem um novo gate.

## Referências realmente vistas

Examinei os pixels das fotos de Tuca Vieira publicadas em [Perplexidade, Vitruvius](https://vitruvius.com.br/revistas/read/arquiteturismo/09.105/5834): [Paraisópolis, imagem 19](https://vitruvius.com.br/media/images/magazines/grid_12/dae661378a41_08.jpg), 472×472; [Providência, imagem 20](https://vitruvius.com.br/media/images/magazines/grid_12/7437dc14320c_14.jpg), 708×472. Cópias de inspeção em `/tmp/lajes-v5-critico/`. São referências de observação, sem autorização de incorporação ao jogo.

Paraisópolis mostra fachadas sobrepostas com aberturas, recuos, varandas e redes aéreas em planos diferentes; ao fundo, ocupação densa e prédios de outra escala. Providência mostra um morro ocupado por massas de proporções e alturas variadas, junto a vegetação e construções maiores. Não deduzo dessas duas fotografias uma regra universal para todas as favelas de RJ/SP, nem metros físicos a partir dos pixels.

## 1. Prioridade alta — casas diferentes continuam usando a mesma frase visual

**Onde:** V5 `praca-da-laje.png`, faixa x=190–1430, y=150–380; `beco-oeste.png`, x=790–1230, y=150–740; `praca-norte.png`, fachadas x=240–625 e x=915–1300, y=380–650. Câmeras: praça da laje (-6.3,3.1,-4); beco (-14,0,-16); praça norte (0,0,5).

**O que se vê:** repetem-se pares de janelas, molduras, a mesma marquise curta, eixos verticais e topo da fachada. A praça conserva casas e equipamentos distribuídos de modo quase espelhado; mudar tijolo por reboco e subir um pavimento não desfaz esse parentesco. O beco afinou, mas as portas e marquises em sequência reta ainda parecem uma instalação serial.

**Correção concreta:** editar as unidades desses recortes como casas individuais: uma fachada com porta deslocada e janela única; outra com janela larga sem marquise; outra com varanda recuada; outra com reboco cobrindo parte do tijolo. Desalinhar as aberturas entre térreo e pavimento adicionado. Trocar parte das marquises por soluções realmente diferentes, e quebrar o espelhamento dos bancos/jardineiras da praça. Começar por essas diferenças de composição, preservando a faixa jogável do beco já corrigida. Não aplicar uma alternância A/B regular, que apenas criaria outra repetição.

## 2. Prioridade alta — o fundo novo lê como torres de outra arquitetura

**Onde:** V5 `praca-norte.png`, x=550–1000, y=360–500; `praca-sul.png`, x=560–995, y=370–500; `praca-da-laje.png`, x=30–390, y=175–290 e x=840–1140, y=160–290. Câmeras das praças norte/sul: (0,0,5)/(0,0,-6).

**O que se vê:** empenas altas quase cegas, com padrão de pedra irregular, coroamentos inclinados e blocos estreitos separados por rasgos. Isso acrescenta geometria, mas aproxima o fundo de torres/ruínas genéricas. Há uma transição brusca para as casas de tijolo/reboco de baixo. Nas fotos examinadas, as massas urbanas têm mais continuidade entre unidades e diversidade de faces habitadas.

**Correção concreta:** nos blocos centrais indicados, substituir pedra irregular por combinações coerentes de tijolo e reboco, inserir janelas em faces que hoje parecem cegas e ligar algumas unidades por anexos mais baixos. Intercalar terraços/lajes de uso doméstico com coberturas, em vez de repetir a mesma torre com telhado. Escalonar sobreposição e profundidade em grupos, sem aumentar uma fileira inteira. Aumentar a contagem de blocos isolados reproduziria o defeito.

## 3. Prioridade média — infraestrutura ainda parece esquema limpo de instalação

**Onde:** V5 `beco-oeste.png`, x=460–880, y=0–420 e x=875–1170, y=330–540; `praca-da-laje.png`, x=160–1460, y=245–295. A comparação mais direta é Paraisópolis, x=0–345, y=185–450, na foto de 472×472.

**O que se vê:** cabos longos e pouco ramificados seguem a rua; as fachadas repetem uma caixa e descida vertical semelhantes. Faltam as conexões que expliquem como casas acrescentadas em momentos diferentes recebem serviços. Na foto de Paraisópolis, a rede passa por alturas diferentes, chega às fachadas e se acumula em pontos de conexão. Esse contraste é de organização visível, não uma demanda por sujeira ou montanhas de props.

**Correção concreta:** concentrar uma pequena rede de serviço em um poste já existente: feixe principal com leve flecha, derivações em alturas distintas chegando a duas fachadas próximas e um ponto legível de conexão. Em outra casa, interromper a repetição da descida reta com trajeto acompanhado da borda da laje. Manter os cabos acima da linha de leitura dos jogadores e não espalhar detalhes finos uniformemente. Validar esse conjunto no mesmo enquadramento do beco antes de replicar.

## Ganhos, limites e próxima comparação

- `beco-oeste`: a largura percebida foi corrigida de maneira convincente; não recomendo voltar à V4.
- `laje-oeste` e `praca-da-laje`: o fundo deixou de ser um vazio extenso, e o uso doméstico existente das lajes permaneceu reconhecível.
- `fachada-oeste`: a composição é praticamente a mesma; o reboco à direita ganhou textura, mas o padrão de tijolos ainda repete os mesmos lascados. Microtextura sozinha não resolve a repetição volumétrica.
- `spawn-norte`, `spawn-sul`, `praca-norte`, `praca-sul`: a área central ainda parece formal e muito organizada; uma praça pode ser ampla, mas a simetria acumulada de todos os elementos é que enfraquece esta cena.
- `escada-norte`: maior fechamento lateral à direita; não concluo colisão, circulação ou legibilidade em combate por um frame com personagens em posições diferentes.
- Há pipas pequenas em alguns frames V5; não identifiquei helicóptero com segurança nos nove PNGs. O céu/horizonte já está em revisão pelo agente principal e precisa de nova captura. Não afirmo que objetos ausentes do frame foram removidos do mapa.

Rever primeiro composição das fachadas e família dos blocos de fundo; depois a rede aérea localizada. Comparar novamente as mesmas nove câmeras. O passo seguinte exige PNGs novos, não somente contagem de objetos ou declaração de parâmetros. Nenhuma dessas capturas comprova o comportamento do mapa em movimento.
