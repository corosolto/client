<!-- spec:mapa -->
# 11 — Campo do Morro

Morro do Rio com **campo de várzea no centro** — todos os becos do mapa
convergem pra ele. Um time nasce no campo (centro, exposto, dono do meio);
o outro nasce no **galpão do baile funk no alto do morro** (periferia,
protegido, tem que descer). O mapa é convergência: todo caminho leva ao
campo, e quem segura o campo segura o jogo — mas segurar o centro contra
cinco saídas de beco é o problema de quem nasce nele.

## Local real

Campo de futebol de morro carioca (referência visual: campos de várzea da
Zona Norte/Zona Oeste do RJ — genérico, sem copiar endereço real). Textura
do lugar: campo de terra/sintético gasto, trave sem rede ou com rede
remendada, alambrado arrombado em alguns trechos, arquibancada de cimento
de um lado só, vestiário/container, placa de "churrasco do troféu", muro
com grafite de homenagem. Galpão de baile: portão de aço, paredão de som,
luz estroboscópica apagada de dia, cartaz de show colado. Acervo inicial em
`references/favela/` e `references/funkeiros/`.

## Layout

- **Centro:** o campo (≈ 40 × 25 m jogáveis) — o único espaço aberto do
  mapa. Gol a gol na diagonal menor, alambrado como parede parcial.
- **Becos:** 4–5 vielas convergindo do alto do morro para as bordas do
  campo; cada uma desemboca num ponto diferente do alambrado (entrada pelo
  vão do alambrado, pelo portão, pulando muro baixo).
- **Galpão do baile:** no alto, spawn do Time B — interior jogável (o
  paredão de som como cover central), duas saídas para becos distintos.
- **Spawns:** Time A no centro do campo (controle inicial do meio, zero
  cover garantido); Time B no galpão (cover inicial, tem que descer).
  Assimetria deliberada: centro sem proteção × periferia protegida — o
  balanceamento mora no número de saídas que o Time B precisa vigiar.

## Cobertura (cover)

- **Campo:** traves, banco de reservas, container do vestiário, trecho de
  alambrado derrubado. Cover escasso de propósito — o centro é punição e
  prêmio ao mesmo tempo.
- **Becos:** portas, janelas, escadinhas, carro, barraquinha — cover denso,
  combate de esquina.
- **Galpão:** paredão de som (cover alto), caixas de equipamento, mesa de
  DJ, portão de aço meio aberto.

## Linhas de visão

- **Para dentro do campo:** quem está nos becos enxerga fatias do campo
  pelos vãos do alambrado — atirador de beco pune travessia, mas nunca vê
  o campo inteiro de uma boca só.
- **Do alto:** o galpão tem visão picada do campo entre telhados — linha
  longa de rifle com ângulos mortos.
- **Dentro do campo:** ponta a ponta é a única linha longa real do mapa
  (~40 m) — atravessar o campo aberto é a decisão mais cara do jogo.

## Referências

- `references/favela/` e `references/funkeiros/` (acervo local).
- Pesquisa complementar: campos de várzea de morro (alambrado, terra,
  arquibancada de cimento), galpões de baile funk (paredão, portão de
  aço). Toda imagem nova entra com `FONTE.md` (portão 2 da csbrasil).

## Régua de aceite

- Convergência real: de QUALQUER ponto de spawn do Time B, caminho até o
  campo ≤ 25 s andando; nenhum beco sem saída (todo beco termina no campo
  ou em outro beco — zero beco cego).
- O campo não pode ser seguro pra nenhum time: de cada boca de beco, pelo
  menos uma linha de tiro pra dentro do campo; do centro do campo, cover
  alcançável em ≤ 3 s de corrida.
- Spawn settle coberto por `eval:spawn`.
- Cobertura de grafite dentro do teto do `eval:grafite`.
- Screenshot do campo a partir de uma boca de beco + do galpão olhando
  pra baixo, com descrição do que se vê (portão 4) e nota do crítico
  adversarial (portão 5) antes de pronto.
