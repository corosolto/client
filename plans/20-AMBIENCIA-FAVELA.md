<!-- spec:mapa -->
# 20 — Ambiência viva das favelas

> Sistema transversal para `lajes`, `corrego` e `escadao`. Ele não
> substitui o trabalho de macro-layout de nenhum mapa.

## Local real

Lajes, vielas e margens de córrego em áreas urbanas densas brasileiras têm vida
animal cotidiana: pombas ocupam telhados, fios e pisos abertos; ratos aparecem
junto de lixo, drenagem e cantos de serviço. A fauna deve parecer parte do lugar,
nunca obstáculo de combate nem alvo com gore.

## Layout

Cada mapa declara pontos de pouso, abrigo e fuga por nome. Pombas partem de áreas
abertas e ganham altura quando há disparo próximo; ratos percorrem trechos curtos
entre coberturas e fogem do impacto. As rotas são determinísticas e não alteram
colisão, navegação ou objetivo.

## Cobertura (cover)

Fauna não cria cover nem colisão. Ratos ficam junto a muretas, sacos, drenagem e
cantos; pombas ficam em lajes, parapeitos e praças de escada. Nenhum animal pode
ocultar silhueta de jogador ou ocupar o centro de uma passagem competitiva.

## Linhas de visão

Reação tem leitura lateral ou vertical: rato atravessa uma pequena faixa do chão;
pombo sobe e sai do retículo. O traçante permanece curto e quente, perceptível em
3:2 sem virar laser contínuo nem denunciar através de paredes.

## Referências

- `references/glb/rat_animated.glb` — Lobbyvictor, CC-BY 4.0; clipe `Run`.
- `references/glb/pigeon.glb` — kenchoo, CC-BY 4.0; clipe `Animation`.
- Procedência completa, candidatos recusados e fontes: `references/glb/FONTE.md`.
- Frame servido: `tools/eval/asset-evidence/maps/lajes/roof-eye.png`, viewport
  1536×1024 (3:2), também contratada por `map-evidence-contract-check.mjs`.

## Régua de aceite

- Os três mapas constroem fauna real no navegador e expõem um controlador comum,
  com ao menos uma pomba e um rato no modo completo.
- Um disparo próximo muda o estado e desloca fauna quando o mesmo `update` do jogo
  é avançado; a retomada da rota não salta mais de 20 cm por quadro. Sem disparo,
  duas execuções com os mesmos deltas dão a mesma pose.
- LOWQ reduz fauna e custo de animação, sem apagar por completo a identidade viva.
- O traçante real cobre ao menos um pixel no eixo curto a 15 m no frame 1536×1024
  e sobrevive a três quadros de 60 Hz; o teto inferior é reproduzido pela projeção
  em `tools/eval/ambience-check.mjs`.
- A régua tem mutantes nomeados para ausência de reação, relógio não determinístico,
  LOWQ sem degradação, traçante fino e teleporte no retorno à rota.
- A captura 3:2 mostra cada espécie no tamanho servido e um crítico independente
  precisa aprovar legibilidade, escala, contexto e custo.
