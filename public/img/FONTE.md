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

## Pack pixo SP×RJ — lote 3 (19/08/2026, OpenRouter GPT, sem --ref)

Mesmo fluxo do lote 2 (`openai/gpt-5.4-image-2` via `tools/gen-image.mjs`),
duas economias validadas no piloto: sem `--ref` (o estilo já está no prompt) e
`--n 1` nas tags de vocabulário (`--n 2` só nas 6 peças com signo, onde a
variabilidade importa). Novidades de composição: bloco grife+tag+ano para SP
(ZL/NORTE/LESTE + 2026, signos inventados) e duplas com seta nos dois estilos.
Revisão: 50 cruas em 5 folhas; rj-pista e sp-dupla-portao-grade conferidos em
tamanho real por suspeita de leitura (aprovados: P com bowl gordo; E estilizado).

- `decals/or-pixo-rj-baile.png` SHA-256 `12e1d1bacdbf56a50b4b0dfc476cbf799ac2a967f16bf9ac2df2fa079edff375` (cru único).
- `decals/or-pixo-rj-barco.png` SHA-256 `4b8509b2480694bec4ac52f3d2f6e324f9daaf326a664b577c5f66b08f85c0ba` (cru único).
- `decals/or-pixo-rj-bike.png` SHA-256 `e76c969cdce1d2d7817dacb209fb077fd533d8c06c01c994a972e8bbf035bc8c` (cru único).
- `decals/or-pixo-rj-bola.png` SHA-256 `81a1677866671e4467911e0fdb79f04c6f81b77ff3caf8aa2d889053ec1d88f1` (cru único).
- `decals/or-pixo-rj-brisa.png` SHA-256 `d75b6f6a4522ac09bb406cdd88c076656341dfb29707baa676bfad4dd7e257ea` (cru único).
- `decals/or-pixo-rj-campo.png` SHA-256 `877b8ee9783465a702348924c794e7c3b8a0a7b868f3ba6190d5fe0550854276` (cru único).
- `decals/or-pixo-rj-coco.png` SHA-256 `60d1fb8f5e5efa25ab9b4d871f1656178e0390cd16e7bd61880c58adf33959ff` (cru único).
- `decals/or-pixo-rj-dupla-baile-funk.png` SHA-256 `1b2f1f6b47af2a0e67a3e7f51a081397aa124e8e0945606ecff288ea4fcad8fe` (cru único).
- `decals/or-pixo-rj-dupla-praia-mar.png` SHA-256 `ff97eaca8e6051fd0778ea81a48b6b84798a5487bddf32ca003abacefaf11ff5` (cru único).
- `decals/or-pixo-rj-dupla-zn-zs.png` SHA-256 `2dc4b755af2735e22dde9447af62af3d32d217593fecb62a97222e36973b972d` (cru único).
- `decals/or-pixo-rj-funk.png` SHA-256 `2dbc44425a7d7ef0c394e00200068ffe6444cac28a4d9c5fd78fd8cff6609dd2` (cru único).
- `decals/or-pixo-rj-mare.png` SHA-256 `7626cd864d0773a8ff7a13e42e5649f0b549a9584ea40e4f6f158912c0b81174` (cru único).
- `decals/or-pixo-rj-copa.png` SHA-256 `2c2d462d2866550197d9f0958d03af0bacf7ba167ffa3e70e761670119d47c59` (v2).
- `decals/or-pixo-rj-voo.png` SHA-256 `1e5ca2eb2ef595a44ab07576e3f2a697bb4e36aaf2e074125cdb38e0661ee1b4` (v1).
- `decals/or-pixo-rj-zn.png` SHA-256 `de2a8bad460e7bb011959b10f64ece1a9f81f32b0e104b424b7fddbb6d7783dc` (v2).
- `decals/or-pixo-rj-pista.png` SHA-256 `315e9e8745813effb7d9ac2074b8bb284a7c560954f3f17c81a9d173d87f73bc` (cru único).
- `decals/or-pixo-rj-quadra.png` SHA-256 `a7ed59bd25d15a309d1efcfb22f86bcc9c1d0829d276809e478cbf86d88e2ca4` (cru único).
- `decals/or-pixo-rj-rede.png` SHA-256 `3cdef119a07c18f8b2693be436705575d44ea16fcfbc709c53d5c92710d4a40d` (cru único).
- `decals/or-pixo-rj-sal.png` SHA-256 `78d3ab6c9c09c2941da857ba7a6e0bc03112cd0a5151179c1397b7dada5da139` (cru único).
- `decals/or-pixo-rj-samba.png` SHA-256 `f9581f5bacab9356cc061aff11cca5099e3ed5cc2b5ea7b708fe3492b75640c6` (cru único).
- `decals/or-pixo-rj-skate.png` SHA-256 `0f6251f0fe455e0667d52cfb33de846ce63b0df173d7d8e99b700194e492a88b` (cru único).
- `decals/or-pixo-rj-surfe.png` SHA-256 `9fc1d06c186b868e39a3fa159b89d390a111efff194b68de18bb336fbd16f3e3` (cru único).
- `decals/or-pixo-rj-torcida.png` SHA-256 `81242c96a65351a793bf65befff9ad9686034229e2ea6b4fea54f401f5b1c0df` (cru único).
- `decals/or-pixo-rj-vela.png` SHA-256 `4876e7c88a934446e7ae291d39f158c039f66b3be045f527573fa80f99dee914` (cru único).
- `decals/or-pixo-rj-verao.png` SHA-256 `8575a5269d50607c8bf4e18d412267ca551b76d8c89158b7a86813a242193d5b` (cru único).
- `decals/or-pixo-sp-avenida.png` SHA-256 `f2e564b4e579c4a8bffa2d44d0dccf01bb4506f775395b28f762c1473fb396ec` (cru único).
- `decals/or-pixo-sp-cerca.png` SHA-256 `d17db61f0096b1b020f576a0bda93f67b167d58eb089773a731a57f5b80a6a4a` (cru único).
- `decals/or-pixo-sp-coluna.png` SHA-256 `1b3c7d5a1d52358acd6676dd8deb6ddf968500bfa7beca98c1326e2b87a2b9f5` (cru único).
- `decals/or-pixo-sp-concreto.png` SHA-256 `8941cc361da42e7b72f8652bb2d81372f216bc771e0bc88d07ec5820603e944b` (cru único).
- `decals/or-pixo-sp-dupla-garoa-cinza.png` SHA-256 `8f0b5f09caa6792d22e6c0316688999112dbbd2492402ca6eb2e8ff4552a9c5c` (cru único).
- `decals/or-pixo-sp-dupla-portao-grade.png` SHA-256 `b8fbd684ffd1d29ddd2c1858c37b05ab889e189a227ff6637575720ab5268e0d` (cru único).
- `decals/or-pixo-sp-dupla-viaduto-tunel.png` SHA-256 `55b60e51b7d0292ccd9cc4fba5b4c42d1553cc14dc3cf6b747c009a0f5a1b7ce` (cru único).
- `decals/or-pixo-sp-esquina.png` SHA-256 `c87925a731987f3f3580244e864722492e2d7a9b22ea5bfbd7f0d5b3a6b7e980` (cru único).
- `decals/or-pixo-sp-galpao.png` SHA-256 `3e06fd3e5bc01453163720af5c65decc3942d7de73e94bf3572b5cf19c86577b` (cru único).
- `decals/or-pixo-sp-garoa.png` SHA-256 `4c59930b6741d794658edef1b326b6f8fdf22443f4e86a63af77390f9387bba8` (cru único).
- `decals/or-pixo-sp-grade.png` SHA-256 `36470b0ba5f0da68e01d769df463b3520f15252b5604161d941bab83e7815337` (cru único).
- `decals/or-pixo-sp-janela.png` SHA-256 `71b36c64e0905b2a1a2fcc7280111c5f0185ec095c8e799b226ecd7dc75c1e99` (cru único).
- `decals/or-pixo-sp-mercado.png` SHA-256 `708fc4f5157de9913cbd19765adf33763421e4c2e651b34da273891d843e2234` (cru único).
- `decals/or-pixo-sp-muro.png` SHA-256 `945c99efea27d58aa73512ba29eb70ba39ea3447ecac23bdceaef76dd2702fc4` (cru único).
- `decals/or-pixo-sp-oficina.png` SHA-256 `9b62046b5aa72081224bf04db8fbf4daa3faf23427d86dea513ef18ee8bd6333` (cru único).
- `decals/or-pixo-sp-padaria.png` SHA-256 `e2de64b4264367c533d85ca121c97d233dbe0178c2c36d5998b5bdd318592df9` (cru único).
- `decals/or-pixo-sp-leste26.png` SHA-256 `8330d86e565b94827f17942193914924fa0fd901a00f8fbfdad306db76b9aa32` (v2).
- `decals/or-pixo-sp-norte26.png` SHA-256 `3ff43edb2e56cd6ae91b4d0e240713ba8f8e86e49728c300507d062120f96da9` (v1).
- `decals/or-pixo-sp-zl26.png` SHA-256 `46c6f8489c28dee4175e6c9c493325680ab932bbc4e617bfbe472c47afa70645` (v1).
- `decals/or-pixo-sp-ponte.png` SHA-256 `b73e60e62c344467f4b01cb14932b88d5e696777308ca7a6f8c986ca3c87cfa6` (cru único).
- `decals/or-pixo-sp-porta.png` SHA-256 `c266da6ca211915c6e071436af60f708288027c2c46d510bbf06c786b4ccec91` (cru único).
- `decals/or-pixo-sp-quintal.png` SHA-256 `d4ab42420f2f92b5d10e75a4ed67f06ec18ffed68cd542a3e9d3bc675032bfbd` (cru único).
- `decals/or-pixo-sp-telhado.png` SHA-256 `ba487d631ba1dd9694efb332726602b787cee4e30cf2a86b4c8df978190ae30c` (cru único).
- `decals/or-pixo-sp-terreno.png` SHA-256 `d9261d4728309cfbccf7634ee6befbd4c00b6b2d212d941a5b89f0ffff0c72cf` (cru único).
- `decals/or-pixo-sp-tunel.png` SHA-256 `c6014329c60ff81a2f6f149183b9049b28bd4ce9f11f17013c86bb5cf4982ceb` (cru único).

## Pack pixo SP×RJ — lote 4 (19/08/2026, OpenRouter GPT, pesos extremos + duotone)

Fechamento dos 150. Pesos de traço extremos: rolo largo (bloco pesado) vs
canetão fino (linha precisa), mais 10 duotone (preto + sombra offset vermelha
em SP, azul no RJ). O duotone exigiu a troca do eixo de alpha do recorte
--pack para distância chebyshev ao fundo (commit 627a19f): por luminância, a
segunda cor saía translúcida. Fluxo idêntico ao lote 3 (`--n 1` nas tags,
`--n 2` nos duotone, revisão em folha antes de publicar com `--from`).

- `decals/or-pixo-rj-alto.png` SHA-256 `3a840daa7bd3749b3b534ce49fce3c3369ac38ad19e56c37b6ca00109bbd718c` (cru único).
- `decals/or-pixo-rj-arena.png` SHA-256 `7408272269384756605c38585513ed9e31440455edcc49b65f817e0266a50bbe` (cru único).
- `decals/or-pixo-rj-asa.png` SHA-256 `dd8bb835e3ca9e8634afe15825ee19d7e2167504b7f3891ee8af0d73a06d705f` (cru único).
- `decals/or-pixo-rj-colina.png` SHA-256 `96bbac08a5443228d8cf3ea2895140f5a47fb9ab744789b4c8b7b8d4a03e6918` (cru único).
- `decals/or-pixo-rj-duna.png` SHA-256 `e7a64b1c9fd8d9fd7fdf346bbc3869ac86456bbb07321f234a8d39e4c560dc5b` (cru único).
- `decals/or-pixo-rj-duo-letra.png` SHA-256 `6d8cc38b7e802adc3961fc4d4d6b0cbb7e8e72e00c1ad1906b1bf250ed79cb15` (v2).
- `decals/or-pixo-rj-duo-mancha.png` SHA-256 `819fd25470ff65380083c40eb82d783faf932bbb7c368b35f403c396be8311b7` (v2).
- `decals/or-pixo-rj-duo-rabisco.png` SHA-256 `f421c69a0e7f937a2331b3ee6c56a964c6b718186da08dd9b33183c6f085e294` (v2).
- `decals/or-pixo-rj-duo-spray.png` SHA-256 `d4fccd1be585c1cca012b025a1c5df000c8dd08f848ce4830890c4c8bd0e66cd` (v2).
- `decals/or-pixo-rj-duo-traco.png` SHA-256 `ac00e5b56d9233e593fc5db5da71ac907e16e6dd302a484896bb239e10ccdaca` (v1).
- `decals/or-pixo-rj-encosta.png` SHA-256 `ce47c6e864afa2b3500dc4f9c437a4cbaeb77dbea940e1d6fc420844200d33b3` (cru único).
- `decals/or-pixo-rj-fundo.png` SHA-256 `5473a87ae62a065b3710f32fa572cdea308b396a989a64cf8f0e55ab31ce3144` (cru único).
- `decals/or-pixo-rj-leste.png` SHA-256 `23a78a8de4a57a434154c1985411766f5f344b4d899b8f59413e410bca2207a1` (cru único).
- `decals/or-pixo-rj-norte.png` SHA-256 `76434705f9e443de6a32df239c93530083f0737abc5deb628331252c678df394` (cru único).
- `decals/or-pixo-rj-oeste.png` SHA-256 `bb3624e7edc41d84e89367db15c87b90beabc2bc1ad420da48067896b5848871` (cru único).
- `decals/or-pixo-rj-pier.png` SHA-256 `556b05757265f83d17ce99196ccba20658a0c7282792fe7b0c123d98fb0a10a3` (cru único).
- `decals/or-pixo-rj-pipa.png` SHA-256 `87e032caefb402239f08a99b701637e420c782ab85c44b077b6ae6e89837d82f` (cru único).
- `decals/or-pixo-rj-prancha.png` SHA-256 `d1eb369c08761698be44b8f654204e3b2a5e6c9ccf7975de0d68278f86734e09` (cru único).
- `decals/or-pixo-rj-raia.png` SHA-256 `4c86d1fa789e6198ef75b46ffd3ddff751cb2f60434a97598599026a5d15ee83` (cru único).
- `decals/or-pixo-rj-regata.png` SHA-256 `16a2c32282974fa6b5ee1c6896ad0c999b7cbd6fa5f5884fbfe5eaa252e39931` (cru único).
- `decals/or-pixo-rj-remo.png` SHA-256 `3ac69cd6dfdc35de8ed09b5f24387456cc1dfa12d3a52a13b40c356aba2e5a48` (cru único).
- `decals/or-pixo-rj-subida.png` SHA-256 `6ec8625fe9a147d074c35d663456d44b21c826bdf1b57c6f885920fbcc434a03` (cru único).
- `decals/or-pixo-rj-sul.png` SHA-256 `4e61b2d06e8584c0b4603514c8add57cb472ae9d0a9113c91dd1575d4cfaca34` (cru único).
- `decals/or-pixo-rj-trilha.png` SHA-256 `e212362fc0bbbf348e3c05396d7cf77cd43279c8c928a69a95e1f812662299ff` (cru único).
- `decals/or-pixo-rj-vento.png` SHA-256 `94ecd8c2c3a504b8a62e82b9db51734be085af5def4d8df5ab954ef5db782e6d` (cru único).
- `decals/or-pixo-sp-andaime.png` SHA-256 `e658121ffb81c56290e7705e6df788f1208b2d4f97f9b2840ad80c9cab44bc12` (cru único).
- `decals/or-pixo-sp-bloco.png` SHA-256 `9cf3fa64999d5c70e6dfb4a47a1e13ebd0f19cdcf573b11b1d244c4c8659f29d` (cru único).
- `decals/or-pixo-sp-caixa.png` SHA-256 `831fc7f7b1ea0d2dcc1521af428ccb98d3a3e6ceb3bbe9186eaf854f87fe91df` (cru único).
- `decals/or-pixo-sp-cal.png` SHA-256 `5b9ce8d88f312a3155f5e1d5551fa6c8614290f81f4025d5f91b333227ec6c57` (cru único).
- `decals/or-pixo-sp-duo-alicate.png` SHA-256 `9e895304dec39fb826d470ab6ffbf715d1fcdaca9b888a39ab81b607b759cfac` (v2).
- `decals/or-pixo-sp-duo-chave.png` SHA-256 `ec18ae235bad4d9cf7fca621d84258104e5fe625ee07cfe94cb99d32d7ecf7a1` (v2).
- `decals/or-pixo-sp-duo-martelo.png` SHA-256 `ecfc40f420c05cfcc63187205e7a2637b5f9d751a797522a7847a60cbf47e03f` (v1).
- `decals/or-pixo-sp-duo-serrote.png` SHA-256 `928033b545f2496fe666e561ece5e9d83855ca608bf8fc03c5ce42d0275f2cea` (v2).
- `decals/or-pixo-sp-duo-trator.png` SHA-256 `5460426a9074804bb13dbd8971f69d01b4034e2d8077d8fdb3ffd55ab0dc06e0` (v1).
- `decals/or-pixo-sp-ferrugem.png` SHA-256 `9793dc9776adb55522c751057f049855734181593eaebafb501fd84f93fcf3b0` (cru único).
- `decals/or-pixo-sp-giz.png` SHA-256 `321d29a06521255f077ae2d524299ec7e108abd4efc194ef88dc2176911dfc31` (cru único).
- `decals/or-pixo-sp-guincho.png` SHA-256 `0310f3991f23ba48c6cbe1cbfe8717d8e355e9c5271544541568a064c5dbc3a9` (cru único).
- `decals/or-pixo-sp-lata.png` SHA-256 `33ef8d0e4ca3dd5d80c82fc3bb07912deb320046024908ab24ea6ceaf58271d3` (cru único).
- `decals/or-pixo-sp-marginal.png` SHA-256 `545039c80a78387b282c98ba7e1754e498a283947a81dcf75e9e50dc2621fb14` (cru único).
- `decals/or-pixo-sp-obra.png` SHA-256 `041dd72c7718c73e60894d709288bcf3e2ca70035cca6ec75eb54e25e7985624` (cru único).
- `decals/or-pixo-sp-pilar.png` SHA-256 `35e629f488c463f992bc46952da85b76748cadbd91abd4f4e449bc384a26bd04` (cru único).
- `decals/or-pixo-sp-pintura.png` SHA-256 `823b5977ec56549411662616b631535490175108434c95b0b1f1d4c64d602471` (cru único).
- `decals/or-pixo-sp-poco.png` SHA-256 `01b7f6ec2ac92b2435e96554c785b224949dd16639c06376f3fb7a932f8fb467` (cru único).
- `decals/or-pixo-sp-porteira.png` SHA-256 `91854de70d765c711fe1783609398822c45db5707b444d904fc6f805a15c3eb9` (cru único).
- `decals/or-pixo-sp-prumo.png` SHA-256 `2b6e59ed6f53528e05d9908c4d0f4d95cbfc495730f0dc3122b5b246da3f420e` (cru único).
- `decals/or-pixo-sp-risco.png` SHA-256 `7166f60116e7b5a7f1364c972ba120b6358a9291c235e285f593377a83a30ff9` (cru único).
- `decals/or-pixo-sp-rodovia.png` SHA-256 `c849c6cc4289baeda0a22e29f91a42e59f9894e1615275a38cdfbcae938a4852` (cru único).
- `decals/or-pixo-sp-tampa.png` SHA-256 `9db026b698a3d3ab24a994dc951f26908601a0e62cd82448abe65ddade0a96fc` (cru único).
- `decals/or-pixo-sp-terra.png` SHA-256 `94ee51f32858ef3a8620042812976f3e54499f6b7a559feb5c321918dfa8c507` (cru único).
- `decals/or-pixo-sp-viga.png` SHA-256 `45cfb4fb1caf6c6664f9b1d9c6426c2a30ffc54bb77e9dbf04fb19b8ba3f9c90` (cru único).

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
- `textures/water_normal_a.webp` e `textures/water_normal_b.webp` (RC2, 19/08):
  normal maps da água viva, derivados por sobel da luminância da textura de
  superfície gerada via OpenRouter (`tools/gen-image.mjs`, modelo
  google/gemini-3-pro-image — a regra da casa é 2D só por lá; o modelo de imagem
  não entrega normal map válido, então a derivação é local e reproduzível:
  `node tools/gen-water-normals.mjs <png>`). Prompt: "Top-down aerial texture of
  a calm turquoise sea surface, subtle ripples, seamless repeating pattern, even
  ambient light, no boats, no people, no coastline, no text". SHA-256
  `73766d359e0ac741315a448e434c3e8b6cd22f09b02ba8fed0d77950465ffdbe` (a) e
  `0f31b4c7a486891dac4569e91e13feb1ec2d82360e27420cee2da4d43cf9f6d6` (b).
- `textures/poeira_puff.webp` (RC3, 19/08): sprite da poeira de rua do
  campomorro, gerado via OpenRouter (`tools/gen-image.mjs`, gemini-3-pro-image).
  Prompt: "Single soft dust puff cloud, beige tan color, centered on pure black
  background, smooth radial falloff fading to pure black at the edges, wispy
  translucent smoke texture, no text, no other objects". Sem canal alfa — a
  luminância vira alfa no shader (uLumAlpha do gpuparticles.js). SHA-256
  `249621d02702caee19f5cf85c14e1e77c15b92dea56148e2361f7389f311057a`.

<!-- frente map2/velho-oeste → SERTÃO DA TRETA (25/08): céu e adobe — OpenRouter
     google/gemini-3-pro-image via tools/gen-image.mjs (regra da casa: 2D sai por
     lá). A cor do horizonte (0xa6794d) e do zênite (0x676f72) foi medida por
     tools/eval/look-horizonte.py sobre o webp final — é o que o LOOK[velho_oeste]
     consome. Os 8 GLBs de props/fauna dessa frente são Mint e estão registrados
     em mint-assets.json (chaves sertao-* e lagarto-sertao). -->
- `textures/sky_sertao.webp`: panorama equiretangular 2:1 do fim de tarde de
  sertão (1774×887, recorte 2:1 de 1584×672). Prompt: "Create a seamless
  equirectangular 2:1 environment panorama for a stylized-realistic browser FPS
  set in the Brazilian sertao countryside at late afternoon golden hour. Upper
  55 percent is a hot dry sky: low golden-orange sun close to the horizon, thin
  stretched clouds in amber and dusty rose, strong warm orange glow along the
  horizon fading to muted dusty blue-grey zenith. Lower 45 percent shows a dry
  caatinga horizon band: distant sparse silhouettes of mandacaru cacti and
  leafless twisted trees over flat cracked reddish-brown earth, all dissolving
  into warm dry dust haze. No identifiable landmark, no buildings, no people, no
  text, no watermark, no borders. Output only the panorama." SHA-256
  `51a071c64aefa65f64ec1cfcbf9a7e1bb3e75b3a7f6f1d329e1963e0d02c97cb`.
- `textures/tex_adobe.webp` (512×512): taipa/adobe das paredes do casario. Prompt:
  "Top-down seamless texture of traditional Brazilian northeast adobe wall
  material (taipa/pau a pique): earthen clay plaster surface in warm tan and
  light ochre, subtle horizontal construction rows, small embedded straw fibers
  and tiny pebbles, faint hairline cracks, patches of whitewash worn off, even
  ambient light, photorealistic, no people, no text, no watermark". SHA-256
  `e3aa0571084a154961d489476435a18dfda1b55264eb0c46bce7ed910453e069`.
- `map-previews/velho_oeste.jpg` (640×640): cartaz do menu do Sertão da Treta
  (provisório até captura 3:2 do mapa real pela bateria única de browser).
  Prompt: "Stylized-realistic game map preview, Brazilian northeast sertão town
  at late golden hour: a dusty main street with whitewashed adobe houses with
  terracotta tile roofs, tall mandacaru cacti and dry juazeiro trees, a stone
  well with a wooden water wheel, a small white roadside chapel with a cross, an
  open-air forró dance floor with a thatched stage and colorful bunting, wanted
  posters on walls, warm orange hazy sky with a low sun, no people, no text, no
  watermark". SHA-256
  `a5e6f1cf12c9aecc50a12897067d50f49bccf6eac913e0a1c58b4442b8bbc23c`.
