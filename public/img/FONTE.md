# Procedência dos assets gerados desta frente

Fonte versionada e autossuficiente. Estes assets foram gerados pelo ImageGen
integrado do Codex em 2026-08-09, sem imagem externa de referência. O OpenRouter
pedido não estava disponível no ambiente; por isso o gerador real fica registrado,
em vez de atribuir a imagem a uma API que não foi usada.

## Street art e materiais

- `textures/escadao_streetart_azulejo.webp`: "Seamless tileable texture of colorful
  Brazilian ceramic mosaic tiles (azulejos) with green, blue and yellow geometric
  patterns, some cracked, flat albedo, no baked lighting, no text, 512x512."
  SHA-256 `24e5e71e7bae586e227ac7b0dc3a6dca6f19c3f8106a4ac152ba8b74093be3f4`.
- `textures/campomorro_streetart_baile.webp`: "Seamless tileable wall of layered and
  torn Brazilian funk baile posters, weathered paper, paste wrinkles, no readable
  artist or brand names, flat albedo, 512x512." SHA-256
  `516ab37011c918b49ab60d487104ee4329bbb901bb67ae2d419760f735db3742`.
- `textures/lajes_streetart_mural.webp`: "Seamless tileable colorful Brazilian
  graffiti mural on brick and falling plaster, original fictional cultural figure,
  paint drips and weathering, flat albedo, 512x512." SHA-256
  `2cfba9f721e7a5dca720df8718291a002108537c54d59e4424d871112efeb197`.
- `textures/corrego_streetart_pixo.webp`: "Seamless tileable Sao Paulo pixacao,
  tall illegible black painted letters on dirty concrete, dripping paint, no logo
  or readable slogan, flat albedo, 512x512." SHA-256
  `7917ed91a0ecad3b465a8f3b652d3c9c7519f3f1858a1289054542a0a522cb7f`.
- `textures/mansao_streetart_marble.webp`: "Seamless Carrara white marble with
  restrained gold veining, polished surface, flat albedo, no object or baked light,
  512x512." SHA-256
  `dcf0093a84fc76987556975304a6ca960637e6b5b4edba0a0c4d005ff0b94c70`.

## Time Mítico

- `faccoes/mitico.webp`: capa horizontal 16:9 com Saci negro de exatamente uma
  perna e SMG, Cuca jacaré-bruxa original com shotgun, Curupira de cabelo de fogo
  e pés virados, Boto como golfinho rosa com Deagle e Lobisomem alto e magro com
  anatomia de lobo-guará; floresta e rio brasileiros, fundo roxo `#9d4edd`, sem
  texto, logo, gore, pessoa real ou semelhança com adaptação de TV.
- `decals/or-mitico-mural.png`: mural quadrado de grafite brasileiro e lambe-lambe
  com os cinco personagens folclóricos acima; cordel, tinta escorrida, papel rasgado
  e reboco gasto; albedo plano, sem texto, logo, pessoa real ou personagem protegido.

## Capas das quatro novas facções

Geradas pelo ImageGen integrado do Codex em 2026-08-09, sem imagem externa de
referência. As fontes quadradas do gerador foram descartadas; estes arquivos são
o recorte final servido, `640×1600`, WebP, sem texto pintado. Em todos os prompts,
o elenco ocupa a metade inferior e o topo permanece livre para nome e lema em HTML.

- `faccoes/nerdolas.webp`: quatro arquétipos brasileiros originais de tecnologia e
  lan house, iluminação azul elétrica e violeta, cabos e CRTs ao fundo.
- `faccoes/profissionais.webp`: motoca, tia do pastel, pedreiro e camelô originais,
  asfalto molhado, luz de trabalho laranja e azul de uniforme.
- `faccoes/noias.webp`: segunda versão, após crítica reprovar a primeira por leitura
  pós-apocalíptica; quatro inventores limpos e alegres, cobre polido, colete-caixa
  de som e carrinho organizado; sem droga, ferida ou estereótipo de rua.
- `faccoes/tv.webp`: terceira versão, após crítica detectar silhuetas protegidas na
  anterior; elenco inteiramente original de estúdio com robô-câmera, armadura de
  claquete, criatura-microfone, robô-controle, capivara repórter e criatura de chroma
  key. Sem antena+tela abdominal, personagem, marca, programa ou emissora existente.

Os quatro brasões `brasoes/{n,r,o,t}.png` foram gerados na mesma sessão, sem
referência externa: D20+cursor, relógio+ferramentas, roda+fio de cobre e CRT+antena,
respectivamente. São PNGs com alfa, sem texto e sem marca externa.

## Horizontes dos mapas originais

Todos usam placa horizontal 2:1, horizonte baixo e contínuo, sem texto, marca,
pessoa, veículo próximo, watermark ou landmark dominante.

- `textures/sky_brasilia.webp`: céu seco azul profundo do Planalto, gradiente rápido
  para haze dourado baixo, cerrado ralo e silhueta modernista distante.
- `textures/sky_pool.webp`: céu de verão e clube esportivo municipal brasileiro,
  palmeiras, telhados quentes e cidade baixa vistos fora do salão.
- `textures/sky_havan.webp`: eixo rodoviário comercial de Santa Catarina, mata
  subtropical, araucárias, galpões baixos e colinas verdes.
- `textures/sky_ferrovelho.webp`: periferia industrial paulistana ao entardecer,
  fábricas, caixas d'água, torres, bairro distante e haze âmbar.
- `textures/sky_quebrada.webp`: continuidade de bairro autoconstruído brasileiro,
  tijolo, reboco, caixas d'água, fios e morro distante em golden hour.

## Fundos dos cinco mapas novos

Substituídos em 2026-08-11 por panoramas originais do ImageGen integrado do Codex,
sem imagem externa de referência. Os PNGs-fontes permanecem no armazenamento do
gerador; a entrega é WebP `1774×887`. Nenhum prompt histórico foi reconstruído.

- `textures/sky_rj.webp` — source `exec-19431e35-d070-4021-8d33-ee9371b465cb`,
  SHA-256 do PNG `337aac9f9425672372ddd8e45c3e8807d813540eb58cf18000ab93ca747b839c`,
  SHA-256 final `90d0d0a6541ad3091430d19584a9bf09844c76a81f38e4863261b9f12dedba86`.
  Prompt: "Create a seamless equirectangular 2:1 environment panorama for a
  stylized-realistic browser FPS set in a fictional Rio de Janeiro hillside
  neighborhood. Upper 70% is pale blue tropical late-afternoon sky with soft high
  clouds; lower horizon shows distant layered green mountains, a thin suggestion of
  ocean haze, and generic dense hillside architecture as tiny abstract silhouettes.
  No identifiable real landmark, no people, no text, no logos, no flags, no brands,
  no copyrighted artwork. PBR-friendly natural lighting, restrained contrast,
  horizon perfectly level, left and right edges seamless, no sun disk, no fisheye
  distortion, no frame or border. Output only the panorama."
- `textures/sky_sp.webp` — source `exec-b1c838f0-5f9c-45ef-8c97-8a92b5947afe`,
  SHA-256 do PNG `c00d20e5acc61482326bafb1d55abee01fb4c9ea59a54d6b5a36f7408db57d88`,
  SHA-256 final `d09f7ad1245135625559ba3ad0035692b06b5f0e73c3c49e12583be3ce8e6fd4`.
  Prompt: "Create a seamless equirectangular 2:1 environment panorama for a
  stylized-realistic browser FPS set in a fictional dense São Paulo outer
  neighborhood. Upper 68% is a humid pale-blue overcast-bright sky with layered soft
  clouds and warm late-afternoon light; lower horizon shows a broad generic megacity
  of low-rise brick and concrete buildings, scattered water tanks and distant
  anonymous towers fading into atmospheric haze. No identifiable real landmark, no
  people, no text, no logos, no flags, no brands, no copyrighted artwork.
  PBR-friendly natural lighting, restrained contrast, horizon perfectly level, left
  and right edges seamless, no sun disk, no fisheye distortion, no frame or border.
  Output only the panorama."
- `textures/sky_joa.webp` — source `exec-96737cf4-2c4d-408b-83b8-6cbf1297d1cb`,
  SHA-256 do PNG `0de83ba0cf362c1f8575887db6cf49f227ee227389d7d6257900e8935624887b`,
  SHA-256 final `872bb146ae5e0c57127f28c48efbab26937644e2571588c6217b3b025c6c2ea9`.
  Prompt: "Create a seamless equirectangular 2:1 environment panorama for a
  stylized-realistic browser FPS set at a fictional ultra-modern coastal house on a
  tropical Brazilian hillside. Upper 72% is a clear warm late-afternoon sky with
  delicate cirrus; lower horizon shows a broad deep-blue Atlantic ocean, atmospheric
  coastal headlands, green slopes and a few tiny generic hillside homes. The ocean
  must remain unmistakably visible behind an infinity pool. No identifiable real
  landmark, no people, no text, no logos, no flags, no brands, no copyrighted
  artwork. PBR-friendly natural lighting, restrained contrast, horizon perfectly
  level, left and right edges seamless, no sun disk, no fisheye distortion, no frame
  or border. Output only the panorama." O processamento recortou o centro superior
  `1240×620+480+190` antes do resize; o enquadramento coloca o horizonte na faixa
  visível atrás da piscina real e remove o landmark montanhoso da borda esquerda.
