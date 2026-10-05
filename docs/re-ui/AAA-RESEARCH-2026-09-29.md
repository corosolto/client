# Referências AAA para a prévia do hub — 29/09/2026

Pesquisa visual feita nas telas individuais do catálogo Interface In Game. São
referências de composição, hierarquia e legibilidade; o catálogo não revela os
componentes, as regras responsivas nem a implementação interna de cada jogo.

| Referência | Observação visual | Aplicação no CORO SOLTO |
| --- | --- | --- |
| [Valorant — Lobby](https://interfaceingame.com/screenshots/valorant-lobby/) | Navegação persistente e discreta, palco visual dominante e ação principal isolada. | Navegação com tipografia legível; mapa e botão JOGAR com papéis visuais distintos. |
| [Apex Legends — Main menu](https://interfaceingame.com/screenshots/apex-legends-main-menu/) | Personagem como ponto focal, com escolha de modo e controles distribuídos ao lado. | Personagem à direita do mapa, em proporção quadrada estável; ficha alinhada ao seu eixo. |
| [Call of Duty: Modern Warfare — Warzone](https://interfaceingame.com/screenshots/call-of-duty-modern-warfare-warzone/) | Coluna de modos, personagem central e informações secundárias em uma área separada. | Separação clara entre seleção de mapa, personagem e opções da partida. |
| [Destiny 2 — Destinations](https://interfaceingame.com/screenshots/destiny-2-destinations/) | Arte de destino com escolhas posicionadas dentro da área visual, sem competir com o topo. | Controles do carrossel contidos no cartão do mapa; metadados e troca de mapa dentro do cartaz. |

## Decisões de composição

- Tratar o mapa como superfície 16:9 com largura máxima; a janela larga aumenta o
  espaço lateral, sem esticar todo o conteúdo.
- Preservar a proporção real do canvas do personagem e reduzir sua altura de
  palco; a personagem deve caber junto ao mapa em 3:2 e na tela enviada.
- Usar as fontes já incluídas no projeto: Bebas Neue para títulos e ações,
  Barlow Condensed para navegação e texto, monoespaçada para metadados curtos.
  A prévia citava Chakra Petch sem carregar essa fonte.
- Manter alvos do carrossel inteiros dentro da máscara do mapa e com pelo menos
  44 px de largura clicável.
- Em celular, preservar acesso à seleção de personagem, empilhar o multiplayer
  e permitir que o conteúdo role sem cortar controles.

Verificação local: `tools/eval/hub-layout-browser.mjs`,
`tools/eval/hub-character-aspect-browser.mjs`,
`tools/eval/hub-confirm-browser.mjs` e capturas de todas as telas por
`tools/eval/hub-visual-audit-browser.mjs`. Essas referências não equivalem a
aceite visual do jogador nem provam a UI de produção.
