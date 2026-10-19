# 0008. Toda tela tem rota fixa

Status: proposta (14/10/2026)

## Contexto

Pedido do dono em 14/10: todo link e botão leva a uma rota com
endereço único, pensando em indexação no Google e em compartilhar. Ex.:
`www.corosolto.com.br/u/rubenmarcus`, `/u/rubenmarcus/privacidade`.

Hoje o hub do jogo é uma página estática (`src/pages/index.astro`) e
guarda a tela na query string. `hubNavigate` (`public/js/main.js`) faz
`pushState` só de parâmetros, e `restoreHubRoute` lê os mesmos
parâmetros no boot e no `popstate`. O canonical do hub é sempre `/`,
então para o Google todas as telas do hub são a mesma página.

Medido em `corosolto/main` (`e6ed84f6b`):

- O importmap do hub usa caminhos relativos (`./js/...`,
  `./vendor/three.module.js`). Servido em `/jogar/multiplayer`, o
  navegador resolve `three` para `/jogar/vendor/three.module.js` (404)
  e as chaves `./js/*` deixam de casar com os imports de `/js/*`.
  86 caminhos de asset em `public/js` também são relativos ao documento
  (`models/...`, `img/...`, `audio/...`).
- O SSR já pagou caro: página `prerender = false` que lê disco em
  tempo de requisição devolveu 200 com 0 bytes (régua
  `tools/eval/ssr-render-check.mjs`). O hub não pode virar SSR.
- `/u/[...path].astro` é SSR, tem canonical e `og:image` do
  `/api/profile-card`, e sobe o jogo num iframe em
  `/?secao=comunidade&social=profile&perfil=<id>`.
- A régua do backend (`api/reguas/ranking-check.mjs`, roda no
  `npm run portao` do sync-nodes com o cliente montado) executa o
  frontmatter de `/u/[...path].astro` e de `/ranking.astro` e exige que
  o destino no jogo seja `/` com `secao=comunidade`, `social=profile`
  ou `social=ranking` e `perfil=<id>`. Mudar essas duas strings sem
  mudar a régua do backend no mesmo lote derruba o deploy do backend.
- `vercel.json` já aplica `redirects` em produção (`/discord` 307,
  `/docs/en/status` 308, medido com `curl -sI` em 14/10), embora o
  `.vercel/output/config.json` do adapter não os liste.

## Inventário: telas e URL atual

### Hub (estático, `index.astro`, canonical `/`)

| Tela ou estado | URL atual |
|---|---|
| Jogar, singleplayer | `/` ou `/?secao=jogar&partida=singleplayer` |
| Jogar, multiplayer público | `/?secao=jogar&partida=multiplayer&servidor=publico` |
| Jogar, multiplayer sala privada | `/?secao=jogar&partida=multiplayer&servidor=privado` |
| Modal de perfil (nick, escalação) | `...&janela=perfil` |
| Modal de mapas | `...&janela=mapas` (`&origem=confirmar` se veio do confirmar) |
| Modal de personagens | `...&janela=personagens` |
| Confirmar partida | `...&janela=confirmar` |
| Configurações | `?janela=configuracoes` sobre qualquer seção |
| Loja | `/?secao=loja` |
| Loja: skins, quests, acessórios | sem URL (estado de aba em `TretaStore`) |
| Convite da loja | `/?treta=<codigo>` |
| Ranking (aba do hub) | `/?secao=ranking` |
| Comunidade | `/?secao=comunidade` |
| Comunidade: perfil, amigos, ranking, notificações, feed, configurações | `/?secao=comunidade&social=profile\|friends\|ranking\|notifications\|feed\|settings` |
| Perfil de outro jogador no jogo | `/?secao=comunidade&social=profile&perfil=<id>` |
| Sobre (visão geral) | `/?secao=sobre` |
| Sobre: guias em iframe | `/?secao=sobre&guia=sobre\|como-jogar\|personagens\|armas\|mapas\|mapa\|changelog\|apoie` |
| Sobre: documentos | `/?secao=sobre&guia=privacidade\|termos\|excluir-dados\|regras-de-uso\|clans` |
| Feedback | `/?secao=feedback` |
| Apoie (aba do hub) | `/?secao=apoie` |
| Entrar numa sala | `/?sala=BR-7K3M` |
| Personagem e mapa pré-escolhidos | `/?personagem=<id>`, `/?map=<id>` |
| Partida, pausa, placar, fim de partida, modal da sala MP | sem URL |
| Comunidade aberta da pausa | sem URL (de propósito, a partida segue viva) |
| Menu legado (`?home=legacy`): ranking, feedback, apoio | sem URL |

### Site (`src/pages`)

| Rota | Render | Indexável hoje |
|---|---|---|
| `/sobre`, `/como-jogar`, `/personagens`, `/armas`, `/mapas`, `/changelog`, `/apoie` e pares EN | estática | sim |
| `/faccoes/<id>` | estática | sim |
| `/privacidade`, `/termos`, `/excluir-dados`, `/regras-de-uso` | estática | sim |
| `/mapa` (ao vivo) | SSR | sim |
| `/u/<handle>` e `/u/<id>/<nick>` | SSR | sim quando o perfil é público |
| `/clans` | estática, dados no cliente | sim, sem og própria |
| `/clans/<uuid>` | SSR casca, dados no cliente | sim, sem og própria |
| `/sala/<codigo>` | SSR | não (`noindex`) |
| `/ranking` | SSR, 302 para `/?secao=comunidade&social=ranking` | não |
| `/comunidade` | SSR, 302 para `/?secao=comunidade` | não |
| `/api/profile-card/<key>.png`, `/api/og/<tipo>.png`, `/api/badge/...` | SSR | imagem |

## Decisão

### 1. Mapa de rotas

A tela mora no caminho. A query fica só para parâmetro que não é tela:
`sala`, `mp`, `map`, `personagem`, `treta`, `lang`, `utm_*`, flags de
teste (`debug`, `safe`, `qa`...).

| Rota nova | Tela | Tipo |
|---|---|---|
| `/` | Jogar, singleplayer | hub, indexável (já é) |
| `/jogar` | 301 para `/` | redirect |
| `/jogar/multiplayer` | servidores públicos | hub, noindex |
| `/jogar/multiplayer/privado` | criar sala privada | hub, noindex |
| `/jogar/perfil`, `/jogar/mapas`, `/jogar/personagens`, `/jogar/confirmar` | modais do jogar | hub, noindex |
| `/configuracoes` | configurações | hub, noindex |
| `/loja` | loja | hub, indexável |
| `/loja/armas`, `/loja/itens`, `/loja/packs`, `/loja/quests` | abas da loja | hub, noindex |
| `/loja/<skin>` | página da skin | SSR indexável (fase posterior) |
| `/ranking` | ranking | hub, indexável |
| `/ranking/<semana>` | ranking fechado da semana | SSR indexável (fase posterior, precisa de snapshot no backend) |
| `/comunidade` | comunidade, perfil próprio | hub, indexável |
| `/comunidade/amigos`, `/comunidade/ranking`, `/comunidade/notificacoes`, `/comunidade/feed`, `/comunidade/configuracoes` | abas da comunidade | hub, noindex |
| `/u/<handle>` | perfil público | SSR indexável (já é) |
| `/u/<handle>/<aba>` | aba do perfil (`partidas`, `conquistas`, `amigos`, `privacidade`) | SSR; `privacidade` é noindex e só faz sentido para o dono |
| `/u/<id>/<nick>` | forma antiga | continua servindo, canonical para `/u/<handle>` |
| `/clans/<uuid>` | página do clã | SSR com og própria |
| `/clans/<tag>` | apelido do clã | fase posterior, precisa de busca por tag no backend |
| `/guia` e `/guia/<slug>` | aba SOBRE do hub com o guia aberto | hub, canonical para a página de conteúdo (`/mapas`, `/armas`...) |
| `/feedback` | feedback | hub, noindex |
| `/apoiar` | aba apoiar do hub | hub, canonical `/apoie` |
| `/mapas/<id>` | página de um mapa | estática indexável (fase posterior) |
| `/personagens/<id>` | página de um personagem | estática indexável (fase posterior) |
| `/sala/<codigo>` | convite de sala | SSR noindex (já é) |

`/sobre`, `/apoie`, `/mapas`, `/personagens` continuam sendo as páginas
de conteúdo. A aba SOBRE do hub ganha o prefixo `/guia` para não brigar
com elas.

### 2. Como o hub serve cada rota

O hub continua estático. Cada rota fixa do hub vira uma cópia estática
do mesmo HTML, gerada pelo Astro com `getStaticPaths` a partir de uma
tabela única de rotas (`public/js/rotas.js`, ESM puro, lido pelo jogo e
pelas páginas). Cada cópia tem `title`, `description`, `canonical`,
`robots` e `og:url` próprios. Custo medido: o `index.html` construído
tem cerca de 80 KB; 20 cópias somam menos de 2 MB no estático.

Por que cópia estática e não `rewrites` no `vercel.json`: a cópia sai
do filesystem, como o `/` sai hoje, então não existe função para
devolver 200 com 0 bytes. E cada rota indexável precisa de head
próprio, coisa que um rewrite para o mesmo arquivo não dá. Rotas com
segmento livre (`/u/<handle>`, `/sala/<codigo>`, `/clans/<uuid>`)
continuam SSR como hoje, sem ler disco.

O hub ganha `<base href="/">` no head. Assim o importmap, os 86
caminhos relativos de asset e os `fetch` relativos resolvem a partir
da raiz em qualquer rota, sem mexer em cada arquivo. O hub não tem
link `href="#..."`, que é o que o `<base>` mudaria (medido com grep em
`index.astro` e `src/components`).

### 3. Navegação no cliente

- `rotas.js` exporta duas funções puras: `caminhoDoEstado(estado)` e
  `estadoDaUrl(url)`. `estadoDaUrl` lê o caminho novo e, se o caminho
  for `/`, também a query antiga.
- `hubNavigate` passa a montar o caminho com `caminhoDoEstado` e faz
  `pushState`. Troca de aba, de modo e abertura de modal empilham uma
  entrada, como hoje.
- `restoreHubRoute` lê com `estadoDaUrl` no boot e no `popstate`. O
  voltar do navegador refaz a tela anterior.
- URL antiga aberta no cliente vira a nova com `replaceState`, sem
  recarregar. Exceção: com `perfil=` na query a URL fica como está,
  porque é o iframe do `/u/<perfil>` e a régua do backend depende dela
  (ver item 5).

### 4. Redirect 301 das URLs antigas

No `vercel.json`, redirects com `has` e `missing` de query em `/`,
`statusCode: 301`, do mais específico para o mais geral. Exemplos:

| Antiga | Nova |
|---|---|
| `/?secao=jogar&partida=multiplayer&servidor=privado` | `/jogar/multiplayer/privado` |
| `/?secao=jogar&partida=multiplayer` | `/jogar/multiplayer` |
| `/?secao=jogar&janela=<modal>` | `/jogar/<modal>` |
| `/?janela=configuracoes` | `/configuracoes` |
| `/?secao=loja` | `/loja` |
| `/?secao=ranking` | `/ranking` |
| `/?secao=comunidade&social=<aba>` sem `perfil` | `/comunidade/<aba em português>` |
| `/?secao=comunidade` sem `perfil` | `/comunidade` |
| `/?secao=sobre&guia=<slug>` | `/guia/<slug>` |
| `/?secao=sobre` | `/guia` |
| `/?secao=feedback`, `/?secao=apoie` | `/feedback`, `/apoiar` |

Todo redirect com `perfil` na query fica de fora (`missing`), pelo
mesmo motivo do item 3. O cliente também converte, então link antigo
funciona mesmo onde o redirect do servidor não existe (dev local,
`tools/eval/serve.mjs`).

### 5. `/u` e o backend

`/u/<handle>` continua sendo a URL do perfil. Navegar para um perfil
dentro do hub faz `pushState` para `/u/<handle>`; recarregar cai na
página SSR, que sobe o jogo no iframe com o perfil aberto. O destino do
iframe só muda de `/?secao=comunidade&social=profile&perfil=<id>` para
uma rota nova junto com a régua do backend, em PR pareado. Até lá ele
fica como está. O mesmo vale para o 302 de `/ranking.astro`: trocar
por rota do hub exige o PR pareado no backend.

Atualização (14/10, pedido do dono): `/u/<perfil>` passa a ser o próprio
hub, não uma página à parte com o jogo num iframe por cima. O SSR de
`src/pages/u/[...path].astro` renderiza `index.astro` com o head do perfil
(título, canonical, `og:image` do `/api/profile-card`, `og:type=profile`,
JSON-LD `ProfilePage`) e o perfil legível dentro do pane da comunidade. O
hub segue estático nas outras rotas. No SSR ele não lê disco: a revisão
dos CSS vem do build (`__CSS_REV__` em `astro.config.mjs`), como o
manifesto de módulos. Réguas: `tools/eval/profile-in-game-check.mjs` e
`tools/eval/ssr-render-check.mjs`. O `game` do frontmatter e o link
`href={game}` ficam, porque a régua do backend os exige.

Antes de cada PR que toca `src/pages/u/` ou `src/pages/ranking.astro`:
rodar `npm run portao` do backend com `CLIENT_DIR` apontando para o
worktree do PR (montagem do sync-nodes).

### 6. Indexação

Rota indexável tem: `title` e `description` próprios, `canonical`
absoluto em `https://www.corosolto.com.br` (`src/lib/site-origin.mjs`),
`og:image`, `og:url` igual ao canonical e JSON-LD quando houver tipo
claro (`WebPage`, `ProfilePage` para `/u`, `Organization` para clã).
Rota só de app leva `<meta name="robots" content="noindex, follow">` e
canonical para si mesma. O sitemap lista só as indexáveis: entram
`/loja`, `/ranking`, `/comunidade` e, quando existirem, `/mapas/<id>`,
`/personagens/<id>`, `/clans/<uuid>`.

### 7. Pontos de compartilhar

| Ponto | URL | og:image |
|---|---|---|
| Perfil | `/u/<handle>` | `/api/profile-card/<handle>.png` (existe) |
| Clã | `/clans/<uuid>` | `/api/og/clan-<uuid>.png` (novo) |
| Sala de amigos | `/sala/<codigo>` | card da sala (novo) |
| Ranking | `/ranking`, depois `/ranking/<semana>` | card do top 3 (novo) |
| Fim de partida | `/u/<handle>/partidas/<id>` | card de vitória com personagem (novo; precisa de id de partida persistido no backend) |
| Skin da loja | `/loja/<skin>` | card da skin (novo) |
| Conquista | `/u/<handle>/conquistas/<id>` | card da conquista (novo) |

Um botão só (`public/js/compartilhar.js`): no celular usa
`navigator.share({title, text, url})`; sem Web Share API copia o link
e mostra "Link copiado". O texto é curto e em português.

### 8. PRs

Um PR por decisão, cada um com régua e mutante:

1. Esta ADR.
2. Roteamento base: `rotas.js`, `<base href="/">`, cópias estáticas
   do hub, `hubNavigate` e `restoreHubRoute` por caminho, redirects 301
   no `vercel.json`, sitemap. Régua: tabela ida e volta, deep-link abre
   a tela certa, voltar do navegador, canonical e robots de cada cópia,
   redirect das antigas.
3. Perfil com abas (`/u/<handle>/<aba>`), com o portão do backend.
4. Ranking, clã, loja e mapas com rota e og própria.
5. Botões de compartilhar.

## Consequências

- O link compartilhado de qualquer tela abre aquela tela, e o voltar
  do navegador funciona dentro do hub.
- `/loja`, `/ranking` e `/comunidade` passam a ter head próprio e entram
  no sitemap. As outras telas do hub ficam fora do índice de propósito:
  são estado do app, não conteúdo.
- O build emite uma cópia do HTML do hub por rota fixa. Rota nova do
  hub entra na tabela de `rotas.js` e ganha cópia sozinha.
- Telas sem URL de propósito: partida em andamento, pausa, placar e a
  comunidade aberta da pausa. Recarregar no meio da partida já volta ao
  hub hoje, e uma URL ali prometeria algo que o jogo não restaura.
- Fica para depois, com backend: `/clans/<tag>`, `/ranking/<semana>`,
  partida e conquista compartilháveis (precisam de id persistido),
  e o destino novo do iframe de `/u`.
