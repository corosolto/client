<!-- spec:mapa -->
# 12 — Escadão

Comunidade cortada por uma **escadaria monumental de azulejo colorido**
(estilo Selarón, genérico — sem copiar a obra real). Um time nasce **embaixo**,
na rua com bar e mercadinho; o outro nasce **em cima**, numa laje-mirante.
Entre os dois: o escadão, com **barricadas nos patamares** e um **caveirão
do BOPE** atravessado no meio da subida. É o mapa de verticalidade pura do
trio — Lajes é camadas, Campo do Morro é convergência, Escadão é subida.

## Local real

Escadaria de azulejos de comunidade carioca (referência visual: Escadaria
Selarón e escadões de morro do Rio — genérico, sem reproduzir arte real de
azulejo; os azulejos do mapa são gerados, com motivos próprios do jogo).
Textura do lugar: corrimão de ferro, patamares com banco de praça, muro com
grafite, fios cruzando, casas coladas na lateral da escada com janela pra
dentro dela. Acervo inicial em `references/favela/`.

## Layout

- **O escadão:** eixo central do mapa, 3–4 lances com patamar entre eles
  (cada lance ≈ 8–12 m de subida). Largura generosa (4–6 m) — é a rota
  principal, não uma viela.
- **Base (spawn Time A):** rua de asfalto com bar de esquina, mercadinho,
  carros estacionados — praça de guerra aberta antes da escada.
- **Topo (spawn Time B):** laje-mirante com caixa d'água e mureta — visão
  de todo o escadão de cima, mas com ângulos mortos nos patamares.
- **Flancos:** 2 becos laterais (um de cada lado da escada) que sobem o
  morro por dentro das casas — rota de quem não quer subir na cara. Cada
  beco desemboca num patamar intermediário, não no topo: flanqueador ganha
  posição, não o spawn inimigo.
- **O caveirão:** atravessado no patamar central, bloqueando metade da
  largura da escada — o objeto maior do mapa e o divisor de águas: quem
  controla o caveirão controla a subida.

## Cobertura (cover)

- **Degraus:** o cover natural do mapa — agachado no degrau, só a cabeça
  aparece pra quem está embaixo (e o capacete vira alvo: risco dos dois
  lados).
- **Barricadas:** uma por patamar — pneus empilhados, sofá velho, portão
  arrancado, carcaça de carro. Cover sólido pra quem sobe, obstáculo de
  ultrapassagem pra quem desce atirando.
- **Caveirão:** cover alto e móvel de valor tático máximo — protege quem
  sobe até o patamar central, mas quem encosta nele está anunciando posição
  pra cinco janelas.
- **Base e topo:** bar/mercadinho (cover de interior) embaixo; caixa d'água
  e mureta em cima.

## Linhas de visão

- **Escada acima/abaixo:** a linha longa do mapa (~40 m de ponta a ponta),
  quebrada pelos patamares — cada patamar é um "andar" de combate: você só
  enxerga o próximo lance, nunca o escadão inteiro.
- **Janelas das casas laterais:** atirador de janela enxerga fatias da
  escada — posição forte mas com uma única fuga (a casa tem uma porta só).
- **Do topo:** visão de varredura sobre os degraus; do fundo, silhueta do
  inimigo contra o céu no último lance — quem sobe no fim está exposto.

## Referências

- `references/favela/` (acervo local).
- Pesquisa complementar: escadarias de azulejo do Rio, escadões de morro,
  barricadas de pneu/sofá, caveirão (veículo blindado — referência visual
  jornalística, sem caveira estilizada real nem insígnia oficial; o do jogo
  é genérico: blindado preto sem logotipo). Toda imagem nova entra com
  `FONTE.md` (portão 2 da csbrasil).
- **Nota editorial:** o caveirão entra como cenário satírico (blindado
  genérico, abandonado no patamar), não como representação de operação
  real. Sem símbolos oficiais, sem referência a fato específico.

## Régua de aceite

- Ritmo de patamar: de qualquer patamar, cover alcançável em ≤ 2 s de
  corrida; nenhum lance com mais de ~12 m sem barricada ou reentrância.
- O caveirão não pode ser cover perfeito: de pelo menos 2 janelas laterais
  e do topo, quem está atrás dele tem ângulo descoberto.
- Flanco justo: beco lateral não enxerga o spawn de ninguém — medir linha
  de visão da saída do beco para os dois spawns (tem que ser bloqueada).
- Spawn settle coberto por `eval:spawn`; cobertura de grafite dentro do
  teto do `eval:grafite` — e a escada pede azulejo/grafite nos muros
  laterais como identidade, não só nos becos.
- Screenshot de baixo pra cima (a visão de quem sobe) e de cima pra baixo
  (a visão do topo), com descrição do que se vê (portão 4) e nota do
  crítico adversarial (portão 5) antes de pronto.
