# Caça ao Javaporco — direção dos três mapas

Decisões do dono em 31/10/2026. O modo tem card próprio no lobby, entrada
singleplayer ou multiplayer e escolha/rotação de mapas. Esta ficha descreve a
expansão; os mapas novos ainda não estão implementados.

## Padrão comum

Cidade Invadida, Distrito Rural e Vila da Mata pertencem à mesma direção visual:
proporções, densidade de detalhe, resolução de texturas, vegetação, linguagem de
materiais e qualidade de iluminação coerentes com o mapa atual. Diferenciar
arquitetura, relevo e layout sem misturar estilos de renderização.

Mint.gg destina-se aos modelos das cidades: casas, edifícios, estruturas e props.
O dono esclareceu que sua autorização mais recente não era um pedido para gerar
novos javaporcos. Arte 2D do card/loading segue o gerador OpenRouter do projeto.

Todos os mapas têm mata acessível ao redor. As hordas nascem na mata, usando
entradas variadas por frente. Grupos pequenos procuram comida e lixo, exploram
destinos diferentes e reagem a ameaças; variar origem não deve virar caminhada
sem propósito. Preservar contato das patas, animações legíveis de fuçar/ataque e
corpos deitados depois da morte.

## Cidade Invadida

Finalizar primeiro o mapa existente: mercearia aberta com comida, outros polos de
alimento, algumas casas com interiores e andar superior acessível, janelas úteis,
muros e lajes alcançáveis, armas e respawns distribuídos. Placar agrupado em
contêiner e javaporco visível no card de personagem do loading.

Reutilizar antes de gerar: pacote cidade `th753rbz1fjyvfcsypbdcfcntn8h8wr4`,
catalogado por `tools/javaporcos-mint-packs.mjs` e `mint-assets.json`.

Prompt de complemento Mint:

> Modular buildings and structures for the existing CORO SOLTO Brazilian town
> FPS. Match the approved town assets in proportions, stylized realistic surface
> detail and restrained weathering. An open corner grocery storefront with food
> shelves and counter; a two-storey house with a traversable ground floor,
> interior staircase and upper windows; accessible flat-roof annex; modular
> plastered boundary walls with gates. Separate reusable pieces with intentional
> entrance and window openings. Human-scale metric proportions, ground pivots,
> no people, no animals, no lettering, no baked scene lighting. Exterior shells
> must support separately authored collision, interiors and navigation.

## Distrito Rural

Layout próprio com pastos amplos, fazendas, silos, celeiros, depósitos de ração e
um pequeno povoado. Alternar caçada na mata e defesa dos pontos de comida.

Prompt Mint:

> Modular rural building kit for CORO SOLTO, matching its existing Brazilian town
> FPS assets in realism, scale, material detail and restrained weathering. Farm
> house, open barn, feed warehouse, grain silo, small village grocery, wooden
> fences and gates. Reusable separate structures, readable silhouettes,
> intentional walkable openings and accessible upper observation positions.
> Human-scale metric proportions and ground pivots. No characters, animals,
> lettering or baked lighting. Food props separate from building shells.

## Vila da Mata

Vila em encosta cercada por mata, com arquitetura portuguesa: casas caiadas,
detalhes azuis e amarelos, telhas de barro e azulejos pontuais. Praça pequena,
mercearia e café; ruas de pedra, quintais, escadas, muros e passagens entre casas.
Algumas casas permitem entrada, subida e defesa pelas janelas. Entradas da mata
distribuídas pelos caminhos e fundos dos terrenos.

Prompt Mint:

> Modular Portuguese village building kit for CORO SOLTO. Maintain exactly the
> same game-art realism, scale and material detail as the existing Brazilian town
> assets; change architectural identity, not rendering style. Whitewashed
> masonry houses, restrained blue or ochre trim, terracotta roof tiles, occasional
> ceramic tile panels, small grocery and cafe storefronts, courtyard walls,
> garden gates and exterior stone stairs for a forested hillside village. Include
> two-storey house shells with open entrances and upper windows, with separate
> reusable interior floors and stairs. Human-scale metric proportions, ground
> pivots, no characters, animals, text, logos or baked scene lighting.

## Integração e aceite

Após login do dono em31/10 foram enviados três pilotos individuais no Mint:
mercearia aberta, celeiro/ração e casa portuguesa de dois pisos. Sessões e estado
em javaporcos-continuacao-20261030.md, ficha em
docs/maps/javaporcos-arquitetura-20261031/ficha.md. Usam referência visual
comum conceito-a-aerea.webp e nível Medium, com limite de8.000 créditos por pedido.
Os kits completos permanecem planejados; não foram enviados lotes duplicados dos
assets existentes. Nenhum resultado novo foi aprovado ou integrado ainda.

Preservar originais e procedência, registrar derivados no catálogo e conferir
escala, materiais, peso e orçamento no jogo. Os modelos visuais não substituem
colisão e navegação. Aceite exige entrada real nas casas, acessos e tiros pelas
janelas exercitados, rotas da horda verificadas e revisão visual em 3:2. Fechar o
mapa atual antes de multiplicar sua implementação pelos outros dois.
