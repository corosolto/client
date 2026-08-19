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
- `decals/pixo-lajes-01.png`: peça de pixo original gerada no Mint para o Lajes;
  fonte local `references/graffiti/mint-pixo-lajes-01.png`, recortada pelo fluxo
  reproduzível de `tools/gen-graffiti-decals.mjs`. O identificador remoto e o prompt
  não foram preservados; essa lacuna de recibo permanece explícita, sem atribuição
  inventada. SHA-256 `5a46e2a1799a83fdc3f699a049dd9ccd03543ecfdca004d35dee8b8149fe6381`.
- `textures/corrego_streetart_pixo.webp`: "Seamless tileable Sao Paulo pixacao,
  tall illegible black painted letters on dirty concrete, dripping paint, no logo
  or readable slogan, flat albedo, 512x512." SHA-256
  `7917ed91a0ecad3b465a8f3b652d3c9c7519f3f1858a1289054542a0a522cb7f`.
- `textures/mansao_streetart_marble.webp`: "Seamless Carrara white marble with
  restrained gold veining, polished surface, flat albedo, no object or baked light,
  512x512." SHA-256
  `dcf0093a84fc76987556975304a6ca960637e6b5b4edba0a0c4d005ff0b94c70`.

## Kit PBR CC0 (ambientCG, 14/08 — A/B `?kit=pbr` do lajes)

Baixados de https://ambientcg.com (licença CC0), pacote `1K-JPG`, convertidos para
webp sem reamostragem (`cwebp` q82 cor, q90 normalGL, q85 roughness). Convenção:
`pbr_<id>_{color,normal,rough}.webp`; o normal é o `NormalGL` do pacote.

- `Bricks051` (tijolo) — color `447faaa80f192c99d5c25742d57619a23244769b937a18d62794a1a76377cd01`,
  normal `49a68dc451434d48d614fdd2f4aaa715e007504602581e2eb50dd6766f0c696b`,
  rough `de131b558f11feea9b4165d6631e5797cfb8619da4c067127b42aa9cdcd7f3fa`.
- `PaintedPlaster017` (reboco pintado) — color `e4a897f82ca5824f7f062dce47c4eb0581c7e84dbdd90e7cb4b1007e25b8e73a`,
  normal `df76d79a66a7a9ef3fdd987f5c7eb79a2eb4100a153ab4939bd846be29774c87`,
  rough `8dea7d058ad67a85e98d17e9cd4aae06402022380dab9559d0687765e3857e70`.
- `Concrete046` (concreto) — color `49c24afba9457d1d9ab6d9d3ed518d0a34ec13e67b05e0056ec16870d25dc414`,
  normal `c798039b4503eb622c88538712ca1e9649b31afd2a356d38712158708867eedd`,
  rough `1786f195e274c3ac56edf01d729d1d7e1a6c00543bc17dfca4828e5e582fb928`.
- `Asphalt033` (asfalto) — color `aa9475a218b619323b59fc1087c3a7de4eb6bd5824381ca1d87a2477cefd1746`,
  normal `b2f251f6116b9cdea70dd227aab5e5b69d4ed78c91beb430fca8ace1b83e865e`,
  rough `bf5e01c0ee81b5a2a156f9e4d9c5dab99d410e823c490767acb2564eb7a7f805`.
- `CorrugatedSteel009` (zinco) — color `ba6b9f6f628647a017c5da78cd9b0977039bafa46544ed56648bb2b84efe0bf0`,
  normal `53111523a647c30a94ad503dcb4c7f4735b24ee6a9c8de30f1885753a11e39a8`,
  rough `4f17968fcea963eba1fe7a629a2b91aa49ae1a6bde8cc87e5bed06f1a0098ca8`.
- `Ground054` (terra) — color `54fc19e5329060f0d865b0ceb46b65693eb93e46c48b95f3cb7a27c0d20f0fde`,
  normal `af15889664ef8da7c06c6eded5b3f3d2225f75ff9d8bd1981e1eb46a59f84eda`,
  rough `4b61cde9a6af65b4da18574e7322578d1c4c77b207272c2ebb37ade253737d73`.

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

## Bloco cerâmico do Lajes

- `textures/lajes_tijolo_baiano_color.webp` e
  `textures/lajes_tijolo_baiano_normal.webp`: textura autoral gerada pelo ImageGen
  integrado do Codex em 2026-08-15, sem imagem externa de referência. A fonte está
  preservada em `references/mapas/world/lajes-tijolo-baiano-source.png`; SHA-256 da
  fonte `9a20cbb570590a4263678ed92e844f447839e7f93511d42b1cf9b6fefe35ebbf`, do albedo
  servido `3295caaec2ff8516efbbed9b01b387e01c019999bd7d124ab8213f7e72322c60` e do normal
  derivado localmente `70974b4b3b30b00b65aa9b793c4212fbd853ca5362ed0e21340ddce2dac6d219`.
  Prompt final: "Perfectly tileable square texture of an unfinished wall built from
  Brazilian hollow ceramic masonry blocks (tijolo baiano). ALL intact blocks are
  laid normally and show their long ribbed side face toward the camera in staggered
  courses. Only two or three chipped or broken blocks in the entire tile reveal a
  few dark internal hollow cells through damaged clay; never rotate intact blocks
  to show their end face. Straight-on orthographic surface scan, edge-to-edge
  seamless repetition on all four sides, uniform real-world scale, no perspective,
  no focal composition. Flat diffuse overcast capture, uniform exposure, no
  directional or cast shadows, PBR albedo capture. Varied burnt orange, terracotta
  and dusty red clay; rough irregular cement-grey mortar joints; restrained grime.
  Porous ribbed clay, chipped edges, imperfect hand-applied mortar, subtle
  construction dust. Every intact brick is a long rectangular side face; at most
  10 percent visibly broken; no alternating end-on blocks; no plaster; no graffiti;
  no objects; no people; no text; no watermark; no vignette; no dramatic lighting."

## Pack pixo SP×RJ (frente F, v2.1 — lote 1, 19/08/2026)

Obra própria gerada pelo Mint (image generation) a partir da pesquisa de estilo
`references/graffiti/PIXACAO-SP-RJ.md` — **estilo, nunca assinatura**: nenhum
decal reproduz tag, grife ou sigla de writer real, e os textos são vocábulos do
universo do jogo. Fontes locais em `references/graffiti/pack/<cidade>-<slug>.png`,
recorte reproduzível por `node tools/gen-graffiti-decals.mjs --pack` (unmix de
dois tons; aceite cobertura/borda/cinza). SP = pixo reto (alto, angular, gótico);
RJ = xarpi (redondo, gordo, corrido). Cada decal declara `cidade` no 5º campo do
DECAL_FILES (`textures.js`), coberto pelo portão GRAFFITI-EDITORIAL.

- `decals/or-pixo-sp-coro.png` SHA-256 `9757db8f3b08ec0dd2b960856d9728017948925185d937ec940a71ba1fb0bb36` (Mint chat `ph7f7br2n3p31h72c66p9mm3598cszfg`).
- `decals/or-pixo-sp-laje.png` SHA-256 `a1b9e595c9cb0fb7fedbc28686e6896dbc8df78e9260a48b394b5f2dae5b5216` (Mint chat `ph70t3d36jq13m7b9zybjbp3x98crt0b`).
- `decals/or-pixo-sp-beco.png` SHA-256 `8d2c50a3de1463a3881a767256bea7fe0959f3fac3500ef56f6106e50b4e940e` (Mint chat `ph70vy54d5psck9qm1hkr5fv4s8crb2a`).
- `decals/or-pixo-sp-morro.png` SHA-256 `0a639cc6908cda807924c5d1e3da9a98481ae4e6c9b3e6503d7aaf55bdd4a395` (Mint chat `ph7azs6z1jyfm1e7fgkbe6hv0h8csm69`).
- `decals/or-pixo-sp-asfalto.png` SHA-256 `29fc8676fb6730cfb37479848d0478c53b4fa413c37f430656d444e65b2f8d36` (Mint chat `ph7aay6jhxch4143vdrfycpjgs8crrp4`).
- `decals/or-pixo-sp-varal.png` SHA-256 `b90a5743698e780a5a545608f4d4464b48c3a8bc4f398a1bda2bc8e919d879c2` (Mint chat `ph70vr2fncyw1q7cazey7tnpks8cr7wc`; 2ª versão — a 1ª veio como foto de muro e foi reprovada pela métrica `borda` do gerador).
- `decals/or-pixo-rj-solto.png` SHA-256 `5977f5524bacf130c3b7a2e9de1a4a32b9214b6a54ea7b1131380b7fedf3bcd5` (Mint chat `ph77rdndj60n1ac7g0z70xg9g58crf8v`).
- `decals/or-pixo-rj-trem.png` SHA-256 `5376f3d787b37790c0cce9bdb2e15802138f31a81312562e2ac5fe9ae4329fc6` (Mint chat `ph72n90t4vsfrx36mbadwmb1bx8crpb8`).
- `decals/or-pixo-rj-grau.png` SHA-256 `099dbe04cbc39c6513f1b27f27fd503bf2d37dc03ad67158db4fa577cb62ce6d` (Mint chat `ph72zksrej6j0f7cbaycae0n558csvk0`).
- `decals/or-pixo-rj-faixa.png` SHA-256 `35410ce34c0a542062f6f6b564c320de56d32a15b1d6678137d3487303c06f3a` (Mint chat `ph7brxgdvew9y5y11vaqqa1z0d8csbtq`).
- `decals/or-pixo-rj-pique.png` SHA-256 `dcf271752d31c033167df262dea6f125401f966f4ea8c66acdfd9a3f0e5f8fcf` (Mint chat `ph7add4g19skstd0763wp5g2bh8crj87`).
- `decals/or-pixo-rj-onda.png` SHA-256 `386b578cfa97706ade717bb918fd8b03d70c4dc221327470c7d9b5fbc239b66c` (Mint chat `ph7c2kh4jjvcsmwjatex5rjy9x8cr862`).

## Pack pixo SP×RJ — lote 2 (19/08/2026, OpenRouter GPT)

Obra própria gerada com `tools/gen-image.mjs` via OpenRouter, modelo
`openai/gpt-5.4-image-2` (id confirmado em /api/v1/models), `--n 2 --raw-only`:
duas variações por decal, escolha a olho em folha de revisão, publicação com
`--from` (o arquivo commitado é byte a byte o que foi visto). Referências de
estilo (`--ref`): os decals do lote 1 (`sp-coro`, `sp-varal`, `rj-solto`,
`rj-trem`). Realismo pedido no prompt: textura de tinta de verdade (spray com
overspray e escorrido, rolo com cobertura irregular e fade, canetão com streaks),
sempre em fundo branco liso — exigência do recorte `--pack`. Linha editorial
mantida: vocábulos do universo do jogo, signos pictóricos inventados, nenhuma
assinatura/grife real. O último item (rj-peca-rio) teve só a v1 gerada: o
segundo crédito da chamada estourou o saldo OpenRouter (HTTP 402); a v1 foi
aprovada na revisão e publicada.

- `decals/or-pixo-sp-travessa.png` SHA-256 `dd796296f5c373980a700c52d94eaab902f06759ee0b95e5db19f43471f4de4a` (v1).
- `decals/or-pixo-sp-antena.png` SHA-256 `74a0ccd268276fcc642e560dac7a2d96ea20073295ae118e26990c83e7a913a3` (v1).
- `decals/or-pixo-sp-cimento.png` SHA-256 `e00aa877128e19004682b6e666518274fd0fbbb770e0756a0e9a46b539cb1391` (v1).
- `decals/or-pixo-sp-cinza.png` SHA-256 `68c7726f53a97b36524d4ab1c3cf316d58eb45151d37cf7722b5cb6ca3ce4280` (v1).
- `decals/or-pixo-sp-escada.png` SHA-256 `341f1d9eed3f8aaac425174726338884984657c4bd25e9cbb74c95222d00b4de` (v1).
- `decals/or-pixo-sp-fumaca.png` SHA-256 `ad350e4077f36568809c97a7ad45a090a3345fb853b1a0793e43007d0a7047b6` (v2).
- `decals/or-pixo-sp-ladeira.png` SHA-256 `86751d1f7508db3bebbdcc9b2f61dd459069d8434927daa35a084d93f1c6ac84` (v1).
- `decals/or-pixo-sp-coroa.png` SHA-256 `430b626f40c4c6128d3e04e9b586c216a0f59da7ca2f57e9d311b2713509b364` (v1).
- `decals/or-pixo-sp-estrela.png` SHA-256 `22ef42dc6048764976c9d4efbe14db8a70d3ea9f2d2ab604291436d9a8a81716` (v1).
- `decals/or-pixo-sp-flecha.png` SHA-256 `ca4a066c58b511a862ce5c4523bd70790f246ced4a8defdf05d7eea21f2b64b2` (v1).
- `decals/or-pixo-sp-raio.png` SHA-256 `3aa4a069537854428c71c1deef212df411b34bfdc30c57cc809ba404cf7238cd` (v2).
- `decals/or-pixo-sp-poeira.png` SHA-256 `f7b7dd1203af62463db08f56586fb480eb4ec8817a33fb4938e44fb04ec63dad` (v1).
- `decals/or-pixo-sp-portao.png` SHA-256 `c03b31711f38baa996bf2ff8bcae3494fd2e197006647725cba00115fe661eef` (v1).
- `decals/or-pixo-sp-reboco.png` SHA-256 `a1f481a121a578ff4918bf2a5a889fbaf3631b2eed285fb7b08a55064e3570f1` (v2).
- `decals/or-pixo-sp-rolo.png` SHA-256 `77729735bc8b1e5c695a0057ff9547c2040e1cf29954b54e928d93221895e27e` (v1).
- `decals/or-pixo-sp-telha.png` SHA-256 `f99cc74d373ed962ffddb13adf86306d5190de80f01281259bfb16d80a7e8254` (v1).
- `decals/or-pixo-sp-tijolo.png` SHA-256 `bfbef5c718314976339a3855305c1a07a81c60e917899e65051ee4b91e6996ec` (v2).
- `decals/or-pixo-sp-tinta.png` SHA-256 `5a33389b81566afde7c1143f13eeefd56b59ecd0e4a2ad0e983f2671ece35dea` (v1).
- `decals/or-pixo-sp-viaduto.png` SHA-256 `39a34b5747753ef9d2ea0db75518d7f99b2ca419b1bfa925ba9c8b699ddbe2cf` (v2).
- `decals/or-pixo-rj-areia.png` SHA-256 `f43583de6c08ee533e25800cf0ed828942aeff1723e0ab07ed2519717662682a` (v1).
- `decals/or-pixo-rj-baixada.png` SHA-256 `bd788ad3a456e8b4614c3292896d5e16c164edb00e2990ed50ff48d976e16f9b` (v2).
- `decals/or-pixo-rj-bonde.png` SHA-256 `a9ef17053687642e7d42543ba7fd780660bfb23006531ad4741429065a12549c` (v1).
- `decals/or-pixo-rj-calcada.png` SHA-256 `f6c9cb0d604f39476929dd7ebb0de59e22bcffbc14e1e124560715986f02b837` (v2).
- `decals/or-pixo-rj-calor.png` SHA-256 `f10b88811e10b8501cfd4a2920b6b0172ec53f6e5c422bdf7063ff65d7480895` (v2).
- `decals/or-pixo-rj-descida.png` SHA-256 `ab7e682243de83d5f7be9aa355faad0dc7d25b28b5a6e518463e569777b63049` (v1).
- `decals/or-pixo-rj-estacao.png` SHA-256 `b231172f5c9068d788cb9609581ea53324009070dc48deb15aff2d401609ecde` (v2).
- `decals/or-pixo-rj-ferro.png` SHA-256 `cca46c77b843cbb687791d3fe470b46c96a09ce616f97631ca50d41b25a2a7b5` (v2).
- `decals/or-pixo-rj-lagoa.png` SHA-256 `b7e31507a7a2e5b394fc30cf619ee0c4e5b4bcfc64008d5b061f4f8c3b828e71` (v2).
- `decals/or-pixo-rj-mureta.png` SHA-256 `eccc1729ffab6d94b4a0cd0e45514a2f7662446fd0308d38e4914040e2111a2b` (v1).
- `decals/or-pixo-rj-ce.png` SHA-256 `09ecc7d5b74394a0995cc8fcf8bc8a2d198ae506abdc420dc35dffef760f5d2a` (v2).
- `decals/or-pixo-rj-lua.png` SHA-256 `713d23e5d2b63fcf3017fb916a9cd8b3cef22b4c9b1d5922d4a564ba43670e43` (v2).
- `decals/or-pixo-rj-rio.png` SHA-256 `271ff012d977093e89656431c2b0a49d1a03c497c938a869deebae4ab9d9c326` (v1).
- `decals/or-pixo-rj-sol.png` SHA-256 `ef0ce19010f8948ec60d9482db441848f01289b57f8aab273e663ec1d68fcedb` (v1).
- `decals/or-pixo-rj-pedra.png` SHA-256 `2aca9b972fc9e227db8393594b767ecc1cf6041973a76a96fdce292b93210ba8` (v1).
- `decals/or-pixo-rj-praia.png` SHA-256 `2f7a80777a8c1f4ddc69143d4ddcedb82a81abf338b70cc6f846a729244040df` (v1).
- `decals/or-pixo-rj-sinal.png` SHA-256 `0b4fb90fa316147974766e49553c55262d884c70299fd6463af5ee24814f6dcd` (v2).
- `decals/or-pixo-rj-suburbio.png` SHA-256 `763d9b81f3a05cd8a8bb92661f5480fb108946677d251a853e7295e261f9bc77` (v2).
- `decals/or-pixo-rj-trilho.png` SHA-256 `75df2b41806ffcec90670564621b3b42319e77c0895381bf17d991d18b7d5705` (v1).

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
  SHA-256 final `c8da24302739aa588524efd57107831aebcad94392a22fe12335b01a3d40a7fa`
  (regerado em 8c5cfad, 12/08, para fechar a costura de wrap; hash anterior `872bb146…`).
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
