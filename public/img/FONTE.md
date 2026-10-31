# Sertão — textura herdada e preview real

O registro anterior da branch map2/velho-oeste (25/08, checkpoint402665ef)
atribui a textura abaixo ao OpenRouter, google/gemini-3-pro-image, via
tools/gen-image.mjs. Preservados o prompt registrado e o hash, sem regeneração.

- `textures/tex_adobe.webp` (512×512): taipa/adobe das paredes do casario. Prompt:
  "Top-down seamless texture of traditional Brazilian northeast adobe wall
  material (taipa/pau a pique): earthen clay plaster surface in warm tan and
  light ochre, subtle horizontal construction rows, small embedded straw fibers
  and tiny pebbles, faint hairline cracks, patches of whitewash worn off, even
  ambient light, photorealistic, no people, no text, no watermark". SHA-256
  `e3aa0571084a154961d489476435a18dfda1b55264eb0c46bce7ed910453e069`.

O preview ilustrado foi substituído por captura WebGL real em3:2.
Procedência e recibo: [map-previews/FONTE.md](map-previews/FONTE.md).

Consulta contratual em06/09/2026: os [termos OpenRouter](https://openrouter.ai/terms)
remetem os direitos do output aos termos do modelo. A página do modelo lista
Google AI Studio e Google Vertex como provedores; o registro antigo não identifica
qual rota processou esta geração. Os [termos Gemini API](https://ai.google.dev/gemini-api/terms#use-of-generated-content)
e os [termos Google Cloud, serviços generativos](https://cloud.google.com/terms/service-terms)
não reivindicam propriedade sobre novo conteúdo gerado, preservando obrigações
legais e direitos de terceiros. Não declarar CC0, exclusividade ou uma rota de
provedor retrospectivamente verificada. Prompt e hash acima são a procedência
disponível; a textura representa material genérico, sem fotografia incorporada.

## Reboco de pau a pique e pedra do casario (07/10/2026)

OpenRouter, `google/gemini-3-pro-image`, via `tools/gen-image.mjs --raw-only --n 2`,
com `textures/tex_adobe.webp` como referência de estilo. Duas variações por pedido;
a escolhida está indicada. O bruto (1024×1024) vira textura de mapa com
`tools/textura-emendavel.py`, que reproduz os arquivos abaixo pixel a pixel.

- `textures/velho_oeste/paupique-real-v1.webp` (512×512, 3 m no mundo): reboco
  caiado das casas de pau a pique. Refs: `tex_adobe.webp`, `velho_oeste/wood-real-v1.webp`.
  Prompt: "Seamless tileable texture, straight-on orthographic view, flat even
  overcast lighting, no shadows, no perspective. Lime-washed mud plaster wall
  (taipa / pau-a-pique) of a poor rural house in the Brazilian sertão: off-white
  whitewash over hand-applied clay render, soft irregular trowel undulation, faint
  hairline cracks, a few small spots where the whitewash flaked to show pale clay
  underneath, very subtle dust. Same photographic style, scale and wear level as
  the reference textures. Covers about 2 by 2 meters of wall. Neutral light color,
  no windows, no edges, no objects, no text, no vignette." Variação v1, bruto SHA-256
  `bf2662a3cdd05491b725190242e1abd8842cc2fceb5b38042dba1f8ed39e9ea5`.
  Pós: `textura-emendavel.py bruto.png saida.webp 219 212 195 2.0 0.12 24` (média da
  textura procedural que ela substitui; desvio de L* entre −7,5 e +3,5). Final SHA-256
  `9b48458c1af0223d02e77eb0fbd9855c1f9370f5d09a0ed809dd6ec044e52c01`.
- `textures/velho_oeste/pedra-real-v1.webp` (512×512, 3 m no mundo): alvenaria de
  pedra das casas de pedra e dos baldrames. Refs: `tex_adobe.webp`,
  `velho_oeste/dirt-real-v1.webp`. Prompt: "Seamless tileable texture, straight-on
  orthographic view, flat even overcast lighting, no cast shadows, no perspective.
  Rustic dry-stone and mortar masonry wall of a rural Brazilian sertão house:
  irregular grey-beige local granite and sandstone fieldstones, 15 to 40 cm each, set
  in pale lime mortar, dusty, sun-bleached, restrained wear. Same photographic style
  and wear level as the reference textures. Covers about 2 by 2 meters of wall. Even
  tone across the whole image, no edges, no objects, no plants, no text, no vignette."
  Variação v2, bruto SHA-256 `0ce7177d93c76dd212eb5ddfc912e3dc1a1b73995a82f56cadbc770e04b25704`.
  Pós: `textura-emendavel.py bruto.png saida.webp 167 163 149 0.5 0.12 999`. Final
  SHA-256 `9862dee56537f0187ee1cb7d8afab6b113aa6934f5d455e283a8d3cf94e73791`.

## Invasão dos Javaporcos: texturas PBR do Poly Haven (30/10/2026)

Doze conjuntos CC0 (<https://polyhaven.com/license>) para trocar as texturas de canvas do mapa
pelo material fotografado. Fonte: `https://api.polyhaven.com/files/<id>`, mapas 1k JPG
`Diffuse`, `nor_gl` (normal OpenGL, a convenção do three) e `Rough`; convertidos com sharp
para WebP 1024 (cor e rugosidade q80, normal q88). Nome: `textures/pbr_<id>_{color,normal,rough}.webp`.

| id Poly Haven | uso no mapa |
|---|---|
| [`asphalt_02`](https://polyhaven.com/a/asphalt_02) | asfalto gasto com trinca (rua) |
| [`concrete_pavement`](https://polyhaven.com/a/concrete_pavement) | calçada de placa de cimento |
| [`patterned_cobblestone`](https://polyhaven.com/a/patterned_cobblestone) | calçamento em leque da praça (o mais perto da pedra portuguesa) |
| [`cobblestone_floor_01`](https://polyhaven.com/a/cobblestone_floor_01) | paralelepípedo |
| [`damaged_plaster`](https://polyhaven.com/a/damaged_plaster) | reboco descascado com tijolo à mostra (beco) |
| [`peeling_painted_wall`](https://polyhaven.com/a/peeling_painted_wall) | parede pintada descascando (fachada) |
| [`worn_mossy_plasterwall`](https://polyhaven.com/a/worn_mossy_plasterwall) | reboco com limo (fundo de casa, muro) |
| [`red_brick`](https://polyhaven.com/a/red_brick) | tijolo aparente |
| [`dirt`](https://polyhaven.com/a/dirt) | terra batida (trilha, quintal) |
| [`leafy_grass`](https://polyhaven.com/a/leafy_grass) | grama de pasto |
| [`sparse_grass`](https://polyhaven.com/a/sparse_grass) | grama rala com terra (beira de calçada) |
| [`forest_leaves_02`](https://polyhaven.com/a/forest_leaves_02) | chão de mata com folha seca |

## Wallpaper GPT — Cidade Invadida (31/10/2026)

- Pedido: wallpaper de javaporcos atacando a cidade, card do lobby e anúncio do modo.
- Asset: `javaporcos-cidade-gpt-20261031.webp`, 1920×1080, SHA256 `a72d3a87b99ebecff0dd4fe0180cd0b67e38fd6137f217e871171e1c35074f78`.
- Geração: ferramenta GPT Image desta sessão, saída original preservada em `$CODEX_HOME/generated_images/01a18e41-15a8-7852-81fa-61673d6b611b/exec-786fc305-3d63-42e5-a288-f27ed18a9033.png`. O identificador exato do modelo não é exposto pela ferramenta.
- Duas tentativas anteriores com `openai/gpt-5-image` via OpenRouter terminaram `finish_reason=error`, sem imagem; não são a origem desta arte.
- Prompt-base em `docs/maps/javaporcos-gauntlet-cidade-20261031/wallpaper-prompt.txt`; nenhuma foto, marca, pessoa ou asset de terceiros fornecido como referência. Conversão local para WebP com recorte16:9; original preservado.
- Inspeção do arquivo: três animais em primeiro plano, lixo/frutas à esquerda, casario brasileiro, mata e torre ao fundo; sem texto, políticos ou gore. Revisão independente e leitura no tamanho real do modal ainda pendentes.
