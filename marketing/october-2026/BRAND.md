# Identidade extraída do jogo

Fonte escolhida: client main `261cf59a7` (alpha.67). Referência complementar: comunidade dentro do menu3D na lane social, ainda draft. A captura social foi vista apenas para comparar identidade. Perfis, estatísticas e telas de teste não entram nas peças.

| Elemento | Fonte | Aplicação no kit |
|---|---|---|
| Fundo quente #090704 | public/style.css:62 | Fundo das peças |
| Verde-lima #b4d92e | public/style.css:101, hub-tabs | Segunda linha do título e CTA |
| Texto #f0f0ed, corpo #d3d3d1 | public/style.css:85 | Título e legenda |
| Âmbar #f3b958 | public/style.css:96 | Rótulo editorial |
| Borda #34302b | public/style.css:66 | Estrutura e separadores |
| Bebas Neue | public/style.css:6, hub-play-heading | Título e CTA |
| Barlow Condensed | public/style.css:7, menu hub:161 | Corpo |
| ST Mono (nome interno Share Tech Mono) | public/style.css:5 | Fonte/data/destino |
| Espaços 4/8/12/16/24/32/48/64 | public/style.css:116 | Base dos intervalos |
| Chanfro | public/style.css:120 | CTA e moldura de mapa |
| Logo existente | public/logo.png | Mesmos pixels, proporção preservada |

`tokens.json` é o snapshot editável; não é uma nova fonte de tokens para o jogo. O kit referencia a identidade escolhida e não altera produto. Medidas de exportação são decisões editoriais, sem alegação de exigência permanente de plataforma.

## Visual e procedência

`SOURCES.json` registra caminho original, commit, tamanho, hash e recibo quando existe. Nenhuma foto externa ou crédito HF. Canarinho e mapas usam as fontes existentes; duas variantes políticas foram estilizadas com a ferramenta integrada image_gen em11/10/2026. Entradas, hashes e prompts são rastreáveis. A conversão PNG→WebP lossless preserva alpha; o exportador decodifica WebP→PNG.

- Canarinho (troca de tiros, personagem e teste): `public/img/entrada/canarinho.webp`, arte existente identificada como arte do jogo. Não demonstra uma troca de tiros real.
- Políticos: variantes estilizadas do Barbudo do Planalto e Capitão do Cercadinho, a partir das caricaturas existentes de resultado. Acabamento baseado no Canarinho; não são novos screenshots/modelos de gameplay. Prompts em GENERATION-PROMPTS.md, fontes anteriores conservadas para procedência.
- Mapa: Velho Oeste, captura WebGL em 06/09/2026. SHA confere com `velho_oeste.capture.json`. A primary tinha outra versão, rejeitada como fonte desta peça.
- Bastidor: Amazônia, captura WebGL em 06/09/2026. SHA confere com `amazonia.capture.json`.
- Fontes: WOFF2 existentes. TTF derivadas pelo fontTools para o renderizador. Antes de redistribuir o kit como pacote genérico, conservar os termos dos assets/fontes do projeto; não declarar CC0 ou direitos externos retrospectivamente.

## Uso

Editar `cards.json` e `tokens.json`. Rodar `tools/render.mjs`, depois `tools/prepare-queue.mjs`. Abrir `index.html` por servidor local para revisar PNG/texto/destino e exportar decisões. SVG preserva camadas e texto; editores externos precisam das fontes TTF incluídas para a mesma tipografia. A exportação PNG inclui a tipografia correta e é a referência visual.

Não adicionar HUD, killfeed, placares ou números sintéticos à arte. Funcionalidades sociais em drafts, emblemas/cosméticos de apoiador e ads propostos não viram benefícios disponíveis na copy. Apoio existente pode ser comunicado apenas com a descrição pública verificada, sem inventar recompensa. Esta fila prioriza jogar e contribuir.

Direção atual do dono: personagens de altura inteira, ocupando mais da metade da composição, fade lateral para preto atrás do texto. Rótulos técnicos saíram de todas as composições e referências de arte saíram das legendas dos personagens; procedência completa fica neste documento e em SOURCES.json. Datas de capturas históricas continuam nas legendas de mapas/dev para não sugerir certificação de cenário atual. O fundo é contínuo, sem janela de imagem no meio do card.
