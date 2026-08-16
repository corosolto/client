# RÉGUA — Quality Bar Visual do Gauntlet Loop
## CS BRASIL / CORO SOLTO

**Propósito.** Dar ao crítico do Gauntlet um instrumento **concreto e verificável** para julgar
um screenshot do jogo contra dois eixos independentes:

- **Eixo A — "isso parece um FPS moderno?"** (referência: CS2/Source 2, VALORANT/UE4)
- **Eixo B — "isso parece o Brasil de verdade?"** (referência: o lugar real que o mapa cita)

Um mapa pode passar em A e falhar em B (bonito e genérico) ou passar em B e falhar em A
(reconhecível e feio). A régua separa os dois de propósito. **Nenhum critério aqui admite
o veredito "melhore a iluminação"** — todo item ou é binário, ou tem número, ou tem
elemento nomeado que está presente/ausente no frame.

**Estado atual do projeto (baseline medido, 2026-07-31).** `public/vendor/three.module.js`
está em **r160**. Renderer: `ACESFilmicToneMapping`, `toneMappingExposure ≈ 1.06`,
`PCFSoftShadowMap`, um `DirectionalLight` sol + um `DirectionalLight` fill + `HemisphereLight`,
`THREE.Fog` linear, IBL via `PMREMGenerator` sobre um gradiente de céu procedural
(`game.js:453-469`), materiais `MeshStandardMaterial` com `roughness ≈ 0.92`.
**Não há**: lightmaps bakeados, ambient occlusion (nem SSAO nem `aoMap`), CSM,
decals, detail-normal, KTX2, pós-processamento. Isso define exatamente onde estão os
pontos de maior retorno (§3).

---

# 1. O que produz a leitura "AAA" num screenshot de FPS

## 1.1 Modelo de iluminação: o híbrido bake + dinâmico

O que separa um screenshot de CS2 de um screenshot de "cena Three.js" **não é resolução
de textura nem contagem de polígono** — é a presença de **luz indireta espacialmente
variável**. Em CS2 isso vem de um pipeline híbrido explícito, documentado por Valve:

| Modo de luz direta (CS2) | O que produz | Custo |
|---|---|---|
| **Static** | Assada no lightmap. **Sem componente especular.** "Basically free to render." | zero |
| **Stationary** | Difusa assada + **especular dinâmico**; máx. **4 luzes sobrepostas por superfície**; sombras dinâmicas de objetos móveis | baixo |
| **Per-Pixel** | Totalmente dinâmica, sombras dinâmicas; limitado a **1 spot/ortho ou 8 omnis** com sombra | alto |

Limites globais de CS2: **380 luzes dinâmicas sem sombra**; luzes com sombra limitadas
pelo atlas global de shadow map, do qual as **cascatas do `light_environment` consomem a
maior parte**. ([Valve — CS2 Level Design/Lighting](https://developer.valvesoftware.com/wiki/Counter-Strike_2_Workshop_Tools/Level_Design/Lighting))

**O componente indireto** — o que realmente dá o "look" — vem de:
- **Bounce lighting** computado por **GPU Path Tracing** no compile. Valve descreve como
  "fairly subtle but adds enormously to visual realism". É esse termo que faz o teto de um
  corredor receber cor do chão, e é exatamente o que falta numa cena com `HemisphereLight` chapado.
- **Light Probe Volumes** (`env_combined_light_probe_volume`) — grades de irradiância que
  alimentam objetos dinâmicos (jogadores, armas, props) com a luz indireta local, com
  `Edge Fade Distance` para transição entre volumes sobrepostos.
- **Cubemaps box-projected** para reflexo especular do ambiente.

**Resoluções de lightmap em CS2:** compile a **2048** (iteração), **4096** (padrão),
**8192** (release). Densidade local controlada por **Lightmap Resolution Bias** em potências
de 2 (+1 = 2×, +2 = 4×), e a alocação é priorizada para **"Lightmap Player Space"** —
superfícies que o jogador consegue chegar perto recebem texels; fundo distante recebe bias
negativo. Debug: `mat_luxels 1`. Props pequenos desligam bake e usam probe.
([Valve — Lighting](https://developer.valvesoftware.com/wiki/Counter-Strike_2_Workshop_Tools/Level_Design/Lighting))

**A lição transferível:** o orçamento de iluminação é gasto **onde o jogador anda**, não
uniformemente. Um mapa que gasta o mesmo esforço no skybox e no corredor de disputa está
gastando errado.

## 1.2 VALORANT: iluminação estilizada com controle de artista

A Riot foi na direção oposta da simulação e documentou a receita:

- **Difusa "Gradient Lambert"** — extensão do Half-Lambert: o N·L é remapeado e usado para
  **amostrar uma textura de gradiente**, dando ao artista controle direto sobre highlight,
  meio-tom e core shadow "sem o custo de múltiplas luzes dinâmicas".
- **Especular por HDR panorâmico pintado** — em vez de virtual point lights, artistas
  **pintam hotspots em imagens HDR estáticas** para dirigir a forma do brilho.
- **Ambiente** via **Indirect Lighting Cache** da Unreal, com valores **clampados** para
  impedir que um agente fique escuro demais ou claro demais em qualquer canto do mapa.
- **Orçamento de shader** (instruções): personagens **128 → 84**, ambientes **100 → 41**,
  armas **103 → 73**. Alvo de hardware: **GPU integrada de CPU de 2012**.

([Riot — VALORANT Shaders and Gameplay Clarity](https://www.riotgames.com/en/news/valorant-shaders-and-gameplay-clarity))

O ponto: **clamp do ambiente** é um recurso de *design*, não uma limitação. Garante que o
personagem nunca "some" numa sombra. É trivial de implementar em Three.js e é uma das
maiores diferenças perceptuais entre "jogo competitivo" e "demo bonita".

## 1.3 Exposição, tonemapping e estrutura de valores

O que se lê como AAA num frame estático:

- **Nada de clipping estrutural.** Menos de ~1% do frame em preto absoluto (L\* < 3) e
  menos de ~0.5% em branco estourado (L\* > 97), **excluindo céu e fonte de luz direta**.
  Sombra AAA tem informação dentro dela — cor, gradiente, bounce. Sombra amadora é `#000000`.
- **Ombro (shoulder) filmico nos altos.** ACES e AgX comprimem highlights e, crucialmente,
  **dessaturam ao clipar** ("hue-preserving highlight desaturation"). Sem isso, um metal ao
  sol vira um chapado de cor pura — assinatura instantânea de "renderer de navegador".
  AgX é notavelmente mais conservador que ACES no contraste e mais correto no
  *path-to-white*; ACES tem a famosa deriva de matiz em vermelhos/laranjas saturados
  (relevante direto para o mapa Ferro Velho, que é feito de laranja).
- **Faixa de valores comprimida no cenário.** Regra do Level Design Book: manter materiais
  **"similar in value"**, evitar "too much contrast or darkness" e manter o **plano do chão
  geralmente mais escuro que as paredes ao redor**. ([Level Design Book — Environment Art](https://book.leveldesignbook.com/process/env-art))
- **Value structure = a razão de o personagem "ler".** Se o cenário ocupa uma banda estreita
  de luminância nos meios-tons, qualquer coisa mais clara ou mais escura que essa banda
  vira figura contra fundo. É por isso que mapas de CS parecem "sem graça" em screenshot
  e funcionam perfeitamente em jogo.

## 1.4 Ambient occlusion e sombras

- **AO é o que cola geometria no mundo.** O sinal visual específico: um **gradiente escuro
  de ~5–20 cm** em toda junção parede–chão, sob cada prop apoiado, nos cantos internos,
  dentro de vãos e nas dobras de tecido/painel. **A ausência de AO é o defeito mais
  diagnosticável em screenshot de WebGL** — objetos parecem "adesivados" sobre o chão.
  Em produção AAA, AO chega por três canais somados: `aoMap` bakeado por objeto (cavity/
  contato local), lightmap/GI bakeado (oclusão de grande escala) e SSAO/GTAO em tela
  (contato dinâmico entre objetos que não estavam no bake).
- **Sombras direcionais = cascatas.** 3–4 cascatas, primeira cascata cobrindo ~10–20 m com
  1024–2048² cada, `normalBias` para matar acne, e — o detalhe que importa em screenshot —
  **penumbra que abre com a distância do contato**. Sombra de largura constante lê como
  fake. CS2 confirma que as cascatas do sol dominam o atlas de shadow map.
- **Contact shadow.** Todo objeto que toca o chão precisa de escurecimento **imediatamente**
  no ponto de contato. Se há uma linha de luz entre o pé do prop e sua sombra, é peel-off.

## 1.5 Fog / atmospheric scattering

- Névoa é **profundidade** e é **simplificação de fundo** ao mesmo tempo. Valve usou
  literalmente as duas coisas juntas: nos patch notes de aumento de contraste do jogador,
  Dust 2 recebeu **"increased fog density and adjusted background simplification"** junto
  com clareamento de túneis e janelas. ([Newsweek — CS:GO player contrast patch](https://www.newsweek.com/counter-strike-global-offensive-patch-notes-boost-player-contrast-map-balance-update-1510265))
- O sinal AAA é **fog com cor herdada do céu na direção do olhar**, não uma cor fixa; e
  **fog exponencial ao quadrado** perto do horizonte, não linear. Fog linear com `near/far`
  fixos produz o artefato clássico de "parede de neblina" quando o jogador gira.
- **Volumétrico / god rays** só valem se houver oclusor (colunata, folhagem, telhado de
  zinco furado). God ray sem oclusor é só bloom.
- Nota: em CS2 o **fog volumétrico está não-funcional** nas ferramentas de workshop —
  ou seja, nem CS2 depende disso para o look.

## 1.6 Saturação e paleta

- **Cenário dessaturado, e a saturação reservada para affordance.** Level Design Book:
  "avoid deeply saturated colors, **give space for lighting**" — textura muito saturada
  limita o que a luz pode fazer com ela; e reservar cores específicas para função
  (só barril explosivo é vermelho; só porta é azul/laranja).
- Alvo prático medível: **saturação média (HSV) do cenário entre 0.10 e 0.30**, com
  no máximo ~5% dos pixels acima de S = 0.55, e esses 5% concentrados em elementos com
  função (bomb site, objetivo, personagem, item).
- **Personagem pode e deve furar essa regra.** É exatamente daí que vem a separação.

## 1.7 Densidade de detalhe: geometria vs textura vs decal

A hierarquia AAA de custo/benefício, do mais barato ao mais caro:

1. **Textura tileável + trim sheet** — cobre 80–90% de superfície arquitetônica.
2. **Decals** — manchas, rachaduras, vazamentos, pichação, placas, sujeira de escorrimento.
   Quebram a repetição do tile **sem custo de UV único**.
3. **Vertex color / vertex blend** — mistura duas texturas tileáveis (asfalto ↔ poeira,
   concreto ↔ musgo) e escurece cantos (vertex AO).
4. **Geometria** — só onde a silhueta muda. Detalhe que não altera silhueta deve ser textura.

**Trim sheets**, na prática de produção: cada faixa precisa **tilear em pelo menos uma
direção**; grid uniforme divisível por 10 para facilitar UV; aspect ratio do plano igual ao
da textura (1:1, 2:1); decals de alpha-test são aceitáveis dentro do trim, alpha-blend não.
([Frozenbyte Wiki — Tile Textures and Trimsheets](https://wiki.frozenbyte.com/index.php/3D_Asset_Workflow:_Tile_Textures_and_Trimsheets))

**Modularidade + custom só em hero prop.** Level Design Book: trim sheets e tiling para o
grosso; texturas únicas "only on specific hero props (coffee machines, forklifts)".

## 1.8 Texel density — números

Texel density se expressa em **px/m** (ou px/cm). Referências:

| Contexto | Alvo | Fonte |
|---|---|---|
| Ambiente de jogo 3ª pessoa (produção real, Trine/Frozenbyte) | **200 px/m** → 1k cobre 5×5 m, 2k cobre 10×10 m | [Frozenbyte](https://wiki.frozenbyte.com/index.php/3D_Asset_Workflow:_Tile_Textures_and_Trimsheets) |
| Projeto pessoal / portfólio | ~**2048 px/m** (20.48 px/cm) "mais que suficiente" | [Beyond Extent — Texel Density](https://www.beyondextent.com/deep-dives/deepdive-texeldensity) |
| Regra relativa por câmera | 1ª pessoa > 3ª pessoa > top-down | Beyond Extent |
| Exceções que sempre sobem | arma em 1ª pessoa, hero prop inspecionável, superfície cinematográfica | Beyond Extent |

**Recomendação operacional para CS BRASIL** (FPS, superfícies vistas de perto, budget web):

- **Chão e paredes de playspace: 256–512 px/m.**
- **Fundo/não-jogável, telhados, skybox proxy: 64–128 px/m.**
- **Hero props (Estátua da Liberdade da Havan, placa do ferro velho, quiosque): 512–1024 px/m.**
- **Viewmodel de arma: 1024–2048 px/m.**
- **A inconsistência é pior que o valor baixo.** Duas superfícies adjacentes com densidades
  muito diferentes é o defeito visual mais fácil de detectar em screenshot: uma parece
  borrada ao lado da outra nítida.

## 1.9 Draw calls e orçamento

- **`renderer.info.render.calls` é a métrica mais importante em Three.js.** Alvo prático
  para 60 fps em hardware modesto: **< 300–400 draw calls típico**, pico **< 800**.
- Triângulos: **< 500k na cena**, **≤ 40k por personagem** (muitos bots simultâneos).
- Texturas em **KTX2/Basis**, potência de dois — PNG/JPEG cru é o maior sumidouro de VRAM.
- Entrega em **GLB** com Draco + KTX2 via `gltf-transform`; **nunca quantizar skinned mesh**.
([utsubo — 100 Three.js Performance Tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips),
[Codrops — Building Efficient Three.js Scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/))

---

# 2. Regras de clareza competitiva (CS2 / VALORANT)

Estas regras têm precedência sobre qualquer ambição estética. São a diferença entre
"screenshot bonito" e "jogo jogável".

### 2.1 Separação personagem × cenário

- **Contraste local, não global.** O que importa não é o cenário ser escuro ou claro, é a
  diferença **entre o personagem e os pixels imediatamente atrás dele**. Alvo: **ΔL\* ≥ 20**
  entre a silhueta do jogador e o fundo local, em qualquer posição jogável.
- **Riot resolve com fresnel/rim:** iluminação extra nos **ângulos rasantes** do personagem
  para criar contorno; **vermelho para inimigo, azul para aliado**; priorizando os
  **rasantes voltados para cima** (topo do corpo), onde a informação de combate está.
- **Riot resolve também com modulação por profundidade:** personagens distantes são
  **clareados** e recebem **mais fresnel** conforme a distância, para não sumirem.
  ([Riot](https://www.riotgames.com/en/news/valorant-shaders-and-gameplay-clarity))
- **Valve resolve com "Boost Player Contrast"** — opção de vídeo que adiciona um halo/anel
  sutil em torno do inimigo — mais ajuste de **textura dos agentes** e mudanças de mapa
  específicas: clarear túneis de conector e T spawn em Overpass e Dust 2, subir janelas
  para o personagem destacar, aumentar luz na janela do market em Mirage.
  ([Newsweek](https://www.newsweek.com/counter-strike-global-offensive-patch-notes-boost-player-contrast-map-balance-update-1510265))

**Conclusão para o CS BRASIL:** se o personagem só lê porque o mapa está bem iluminado,
não lê. Precisa de um mecanismo **ativo** (rim/fresnel modulado por distância, ou clamp de
ambiente no personagem, ou ambos).

### 2.2 Paleta de cenário dessaturada

- Cenário na faixa **S ∈ [0.10, 0.30]**. Personagens e objetivos podem e devem sair dela.
- Cor saturada = **significado**. Se tudo é laranja no ferro velho, laranja não significa nada.
- Textura muito saturada **"limita o quanto a iluminação pode afetá-la"** — o material
  ganha aparência de plástico auto-iluminado. ([Level Design Book](https://book.leveldesignbook.com/process/env-art))

### 2.3 Zero ruído visual na linha de tiro

- **Detalhe acima da altura do jogador.** Regra literal da Riot: "keep the majority of it
  above player height so that the angles and peeks are simple and clear".
  ([Riot — The Art of VALORANT Map Environments](https://playvalorant.com/en-us/news/dev/the-art-of-valorant-map-environments/))
- **Paredes planas, com detalhe mínimo e ruidoso** na banda de 0–2 m. Wall textures devem
  ser "plain with minimal noisy details".
- **Set dressing agrupado**, não espalhado — cluster simplifica o parsing visual.
- **Chão mais escuro que as paredes** — cabeça e torso do inimigo aparecem contra a parede,
  não contra um chão claro.

### 2.4 Playspace vs non-playspace

- **Iluminação:** iluminar áreas escuras e **"spotlight" nos espaços onde se quer máxima
  visibilidade** — site de plant, canto comumente peekado, entrada de corredor.
- **Detalhe:** o não-jogável pode ser barroco à vontade. Exemplo da Riot: o bunker do site B
  é um "interesting storage space with a curving tunnel, without having to worry about
  gameplay since the player can't go into this area".
- **Orçamento de texel:** CS2 formaliza isso com `toolslightmapres.vmat` — meshes que
  marcam "Lightmap Player Space" para receber alocação prioritária de lightmap.
- **Teste do screenshot:** um crítico deve conseguir apontar no frame **onde se anda** e
  **onde não se anda**, sem jogar. Se não consegue, a hierarquia falhou.

### 2.5 Cor como affordance

- Reservar cores para função: só barril explosivo é vermelho; só porta atravessável é
  azul/laranja. Manter consistência entre os 4 mapas: se cobertura destrutível é amarela na
  Havan, é amarela no Ferro Velho também.

---

# 3. O que é alcançável em Three.js / WebGL2 (r150+)

Ordenado por **impacto visual por hora de trabalho**. O baseline do projeto (r160, sem AO,
sem lightmap, sem pós) faz os três primeiros itens serem retorno desproporcional.

### 3.1 Ambient occlusion — o maior ganho isolado

**(a) SSAO/GTAO em pós — `N8AO`.** Implementação SSAO de alta qualidade com foco em
"temporal stability and artist control". Requer **three r161+** e WebGL2 — **o projeto está
em r160, então isso exige bump de versão**. Integra como pass substituindo o `RenderPass`,
ou como `N8AOPostPass` dentro de `pmndrs/postprocessing`. Presets: *Performance* (8 samples
AO, 4 denoise) até *Ultra* (64). Modo **half-res** dá 2–4× de performance; a nota do autor:
"half-res em Ultra é levemente mais lento que full-res em Performance, mas produz resultado
significativamente melhor" — ou seja, **prefira half-res + qualidade alta**.
Parâmetros-chave: `aoRadius` (unidades de mundo, 1–2 ordens de grandeza abaixo da escala da
cena — para um mapa de 300 m, algo em torno de 1–3 m), `distanceFalloff`, `intensity`
(aplica `pow(ao, intensity)`), `screenSpaceRadius` (16–64 px, alternativa a raio de mundo).
([N8python/n8ao](https://github.com/N8python/n8ao))

**(b) `aoMap` bakeado por asset.** Assar cavity/contato no Blender, gravar em canal separado.
⚠️ **A partir do r151, `aoMap` e `lightMap` não usam mais `uv2`** — usam a propriedade
`channels` para selecionar o conjunto de UV. ([Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide))

**(c) Vertex AO.** Para geometria procedural gerada em código (que é a maior parte dos
mapas atuais: `addBox`/`addPlane`), o caminho mais barato é escurecer os vértices inferiores
de cada caixa e as bordas de contato com o chão. Custo zero de memória, resolve 60% da
sensação de "adesivo".

### 3.2 Lightmaps bakeados

- **Blender → bake Cycles → `lightMap` + UV1.** Pipeline padrão e o único jeito de ter GI
  de verdade em cena estática de web. Precisa de UV desdobrado sem sobreposição (xatlas ou
  Smart UV Project). ([PixelCapture — Lightmap Baking in Blender for Three.js](https://pixel-capture.com/tutorials/lightmap-baking-in-blender))
- **`three-gpu-pathtracer`** (gkjohnson, sobre `three-mesh-bvh`) — path tracer em shader
  para three.js; usado para gerar referência de GI e, com trabalho, para assar em textura.
  ([gkjohnson/three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer))
- **`three-lightmap-baker`** (lucas-jones) — bake de lightmap direto no navegador.
  ([lucas-jones/three-lightmap-baker](https://github.com/lucas-jones/three-lightmap-baker))
- Custo de memória: um lightmap 2048² KTX2 por mapa é aceitável e substitui inteiramente o
  papel do `HemisphereLight` chapado.

### 3.3 Tonemapping AgX / Neutral

- **`THREE.AgXToneMapping` e `THREE.NeutralToneMapping`** existem no three (o exemplo
  oficial `webgl_tonemapping` oferece NoToneMapping, Linear, Reinhard, Cineon, ACESFilmic,
  **AgX**, **Neutral**, Custom; default do exemplo é **Neutral**, exposure 1.0).
  ⚠️ **Ambos são posteriores a r160** — outro motivo para o bump.
  ([three.js webgl_tonemapping](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_tonemapping.html))
- **AgX** para o Ferro Velho (laranjas saturados não derivam de matiz como no ACES) e para a
  Brasília (céu azul profundo sem virar ciano).
- **Neutral** (Khronos PBR Neutral) quando fidelidade de cor de material importa mais que
  look filmico.
- Manter `toneMappingExposure` **por mapa**, não global: Brasília ao meio-dia e Ferro Velho
  ao fim da tarde não podem compartilhar exposição.

### 3.4 IBL / env maps (PMREM)

- Já existe no projeto (`PMREMGenerator` sobre gradiente procedural), mas **um gradiente de
  duas cores não é um environment**. Trocar por **HDRI equirretangular real** por mapa
  (céu de cerrado seco, céu carioca com haze, céu de meio-dia de estacionamento, céu de
  fim de tarde) via `RGBELoader`/`HDRJPGLoader` + `PMREMGenerator.fromEquirectangular`.
- **`scene.environmentIntensity`** (adicionado no **r162**) permite modular a força do IBL
  por mapa sem regenerar o PMREM. `scene.environmentRotation` idem, para alinhar o sol.
- **`useLegacyLights` é `false` por padrão desde r155** e `outputColorSpace` substituiu
  `outputEncoding` no **r152** — o projeto já está do lado correto disso em r160.
  ([Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide))
- **Cubemap local por sala/área** (reflection probe manual): trocar `scene.environment` ou
  `material.envMap` por região resolve o problema de interior refletindo céu.

### 3.5 Sombras: CSM

- **`three-csm`** (StrandedKitty) e o exemplo oficial **`webgl_shadowmap_csm`** dão
  cascatas com split logarítmico/uniforme misturado. Ganho: sombra nítida perto **e**
  cobertura de 200 m sem aumentar `mapSize`.
  ([three-csm](https://github.com/StrandedKitty/three-csm), [exemplo oficial](https://threejs.org/examples/webgl_shadowmap_csm.html))
- Baseline atual (`map_brasilia.js:277-283`): shadow camera de **160×160 m com mapa 2048²**
  = **~12.8 cm por texel**. Isso é grosso demais para sombra de contato e é a causa direta
  de sombras "moles e imprecisas". Com CSM de 3 cascatas, a primeira cobre ~25 m em 2048²
  = **~1.2 cm/texel**, ordem de grandeza melhor onde importa.
- Manter `normalBias` (já em 0.03) e evitar `shadow.radius` alto como substituto de
  penumbra — `radius` alto borra tudo por igual, incluindo o contato.

### 3.6 Pós-processamento

**`pmndrs/postprocessing`** é a stack padrão (mais rápida que `EffectComposer` do core por
mesclar efeitos num único shader pass):
- `ToneMappingEffect` (permite AgX/adaptive no pós, com exposure separado)
- `BloomEffect` — **com threshold alto**; bloom em tudo é a assinatura nº 1 de amadorismo
- `GodRaysEffect` — só com oclusor real (colunata do Planalto/Havan, telhado de zinco furado)
- `SMAAEffect` — antialiasing quando MSAA não está disponível no pipeline de pós
- `LUT3DEffect` — **grade de cor por mapa** via LUT .cube; jeito mais barato de dar
  identidade cromática distinta aos 4 mapas sem tocar em material nenhum
- `VignetteEffect` sutil, `ChromaticAberration` só nas bordas e só se muito discreto

**`realism-effects`** (0beqz) — SSGI, Motion Blur, TRAA. SSGI é caro mas é o único caminho
para bounce dinâmico; TRAA é excelente para estabilizar SSAO/SSR.
([0beqz/realism-effects](https://github.com/0beqz/realism-effects))

### 3.7 Texturas: KTX2, detail-normal, decals

- **KTX2/Basis** via `KTX2Loader` + `gltf-transform` (o loader teve mudanças em r132 e r180;
  em r180 `detectSupportAsync()` foi depreciado em favor de `detectSupport()`).
  Ganho: VRAM comprimida na GPU, não só no disco.
- **Detail normal / detail albedo** — segunda textura de normal em tiling alto (ex. 8–20×)
  multiplicada sobre a base, dá micro-detalhe a 30 cm da câmera sem aumentar a resolução da
  base. Custo: uma amostra a mais no shader. **É o truque que mais aproxima uma parede de
  Three.js de uma parede de CS2** quando o jogador encosta nela.
- **Decals** — `DecalGeometry` (`three/addons/geometries/DecalGeometry.js`) projeta malha de
  decal sobre a superfície. Usar para: escorrimento de ferrugem, mancha de óleo no asfalto,
  pichação, rachadura, placa, cartaz, marca de pneu. **Cada decal quebra a leitura de tile.**
- **Vertex blend de dois materiais tileáveis** via `onBeforeCompile` — asfalto ↔ poeira,
  concreto ↔ musgo, areia seca ↔ areia molhada.

### 3.8 Fog e "GI falsa"

- Trocar `THREE.Fog` linear por **`THREE.FogExp2`** e **derivar a cor do fog do HDRI** na
  direção do sol vs. anti-sol (dois valores, interpolados por `dot(viewDir, sunDir)` num
  patch de shader). Elimina a "parede de neblina".
- **Hemisphere + irradiance SH.** `THREE.LightProbe` + `LightProbeGenerator.fromCubeTexture()`
  extrai SH de grau 2 do env map — é literalmente "ambient probe" à la CS2, por área. Muito
  melhor que `HemisphereLight` porque tem direcionalidade real em 9 coeficientes.
- **Clamp de ambiente no personagem** (a regra da Riot): garantir piso e teto de
  luminância no shader do personagem para ele nunca sumir. Poucas linhas de `onBeforeCompile`.

### 3.9 Reflexões baratas

- **SSR** (`realism-effects` ou `SSRPass` do core) — caro e cheio de artefato de borda.
  **Só vale onde há superfície molhada/espelhada de verdade**: água do Piscinão, asfalto
  molhado, espelho d'água do Planalto, mármore polido do STF.
- **Alternativa muito mais barata:** plano refletor com `Reflector` (`three/addons/objects/Reflector.js`)
  para o espelho d'água e para a lâmina do Piscinão — render-to-texture de um plano só,
  previsível e sem artefato.
- **Roughness map bem feito** substitui 80% da necessidade de SSR: variação de brilho em
  poças, trilhas de pneu e áreas gastas é o que o olho lê como "molhado".

### 3.10 Resumo do gap-to-close no projeto

| Item | Estado | Ação | Impacto |
|---|---|---|---|
| Ambient occlusion | **ausente** | N8AO (half-res, Ultra) + vertex AO nas caixas | **altíssimo** |
| three.js | r160 | bump p/ r162+ (destrava AgX, Neutral, N8AO, `environmentIntensity`) | alto |
| Lightmap / GI | ausente | bake Blender → `lightMap` KTX2 por mapa | alto |
| Env map | gradiente procedural | HDRI real por mapa | alto |
| Sombra | 1 dir light, 160 m em 2048² | CSM 3 cascatas | alto |
| Detail normal | ausente | 2ª normal em tiling alto | médio-alto |
| Decals | ausente | `DecalGeometry` para sujeira/placa/pichação | médio-alto |
| Fog | `THREE.Fog` linear | `FogExp2` + cor derivada do céu | médio |
| Texturas | webp/PNG | KTX2/Basis | médio (VRAM) |
| Grade de cor | ACES global | LUT 3D por mapa | médio |
| Pós | ausente | `pmndrs/postprocessing` (bloom threshold alto + SMAA + LUT) | médio |

---

# 4. Fidelidade ao Brasil real

Cada mapa tem uma lista de **elementos nomeados**. O critério é binário: **está no frame ou
não está.** Um mapa que tem os elementos e erra a luz ainda "lê" como o lugar; um mapa com
luz perfeita e sem os elementos é um mapa genérico com nome brasileiro.

---

## 4.1 Praça dos Três Poderes / Esplanada dos Ministérios — Brasília

### Elementos obrigatórios (o mapa não "lê" sem estes)

| Elemento | Descrição visual precisa |
|---|---|
| **Mastro da Bandeira** | **100 m** (84 m de fuste + 14 m de topo), **aço corten**, **24 barras circulares** que afinam de **40 cm na base a 10 cm aos 86 m**, mastro central de 80 cm de diâmetro, 15 diafragmas. Aparência **semitransparente** à distância. Bandeira de **14,30 × 20 m = 286 m²**, ~60 kg. Projeto de Sérgio Bernardes. ([Wikipédia](https://pt.wikipedia.org/wiki/Mastro_especial_da_Pra%C3%A7a_dos_Tr%C3%AAs_Poderes)) |
| **"Os Candangos" / "Os Guerreiros"** | Bruno Giorgi, 1959. **Bronze**, duas figuras alongadas e esquemáticas de ~8 m, pátina **verde-escura/marrom**, sobre base baixa de granito. É a silhueta que identifica a praça de longe. |
| **"A Justiça"** | Alfredo Ceschiatti, 1961. **Granito branco**, mulher sentada, vendada, espada no colo, em frente ao STF. Superfície fosca, quase sem especular. |
| **Palácio do Planalto** | "Caixa de vidro retangular entre duas lajes, apoiada no perímetro por uma colunata" (Niemeyer). Colunas curvas revestidas de **mármore branco**; vidro **fumê/bronze escuro** atrás; **rampa** lateral; **espelho d'água** raso na base. |
| **Supremo Tribunal Federal** | Espelho formal do Planalto, sobre plataforma elevada, mesma colunata curva branca, simetria em relação ao eixo. |
| **Congresso Nacional** | **Duas torres verticais gêmeas** (~100 m) + **duas semiesferas**: cúpula **côncava** (Senado, virada para cima é a Câmara — atenção à orientação) e **convexa**. Concreto branco. |
| **Panteão da Pátria Tancredo Neves** | 1986, **concreto aparente cru** (cinza, não branco), forma de pomba. Contraste deliberado com o branco polido do resto. |
| **Pombal** | Niemeyer, bloco vazado de concreto branco, escala pequena, isolado no meio do vazio. |
| **Museu da Cidade** | Laje de concreto branco apoiada num único pilar. |
| **Esplanada dos Ministérios** | **17 blocos idênticos** (10 na pista N1, 7 na S1) + Palácio da Justiça e Itamaraty distintos. Blocos retangulares, ~8–10 pavimentos, fachada de vidro em módulo repetitivo com moldura de concreto claro, sobre pilotis. ([ipatrimônio](https://www.ipatrimonio.org/brasilia-conjunto-dos-ministerios/)) |
| **Eixo Monumental** | **250 m de largura**, **seis faixas de tráfego por sentido**, 16 km de extensão; considerado pelo Guinness a avenida mais larga do mundo. Gramado central contínuo, paisagismo de Burle Marx. ([Wikipédia](https://pt.wikipedia.org/wiki/Eixo_Monumental)) |

### Materiais e cores

- **Branco não é um branco só.** Coexistem: **mármore branco polido** (colunas do Planalto/STF,
  quase especular, roughness ~0.25), **concreto branco tratado** (fosco, roughness ~0.85, com
  manchas de escorrimento cinza-esverdeadas nas juntas e sob peitoris), **concreto aparente
  cru cinza** (Panteão), **granito preto** em bases e soleiras. Um mapa que usa `#ffffff`
  com `roughness 0.9` em tudo perde exatamente essa informação.
- **Vidro fumê/bronze escuro** nas fachadas — reflete o céu e escurece dramaticamente o interior.
  Esse é o principal gerador de contraste da Esplanada: caixas escuras entre lajes brancas.
- **Solo laterítico vermelho** aparece nas bordas do gramado, em canteiros e onde o gramado
  falhou. É o único vermelho natural da cena.
- **Asfalto** cinza-claro esbranquiçado pelo sol, com faixas brancas de sinalização
  desgastadas.

### Luz e céu (o mais errado com mais frequência)

- Brasília fica a **15°47′S, 1.172 m de altitude**. Na **seca (maio–setembro)**, "praticamente
  não há ocorrência de chuvas"; temperaturas de **12–16 °C (mín) a 26–29 °C (máx)**.
  ([Melhores Destinos](https://guia.melhoresdestinos.com.br/brasilia-quando-ir-clima.html))
- **Sol duro, quase no zênite**, sombras curtíssimas e de borda **dura** ao meio-dia.
  Penumbra estreita — o oposto do `shadow.radius = 3` atual.
- **Céu azul profundo e escuro no zênite**, clareando muito rápido perto do horizonte por
  causa do ar seco e rarefeito. **Baixíssima perspectiva aérea a curta distância** — os
  primeiros 100 m não têm haze nenhum. Mas **a poeira em suspensão na seca** produz um
  horizonte lavado e amarelado, e o pôr do sol de Brasília é literalmente famoso por isso:
  "a poeira que paira no ar proporciona um dos mais belos espetáculos da cidade".
- **Grama:** na seca é **palha amarelada/dourada com manchas verdes**, não verde-esmeralda.
  Verde saturado uniforme = erro de fidelidade grave neste mapa.
- **Ipê-amarelo** florido (ago–set): árvore de galhos **nus** completamente coberta de flor
  amarela intensa. É o único ponto de cor saturada legítimo da cena — e por isso é perfeito
  como marcador de affordance.
- **Palmeira-imperial** em fileira, tronco cinza liso e alto, copa pequena no topo.

### Detalhes que confirmam "isso é Brasília, hoje"

Grades metálicas de contenção da PM; cones; viaturas; ônibus articulados; a Catedral (Niemeyer,
16 colunas de concreto, vitral azul-verde de Marianne Peretti — visível ao fundo do eixo);
turista fotografando; e o **vazio** — a praça é enorme e vazia, e o vazio é a característica.
Encher a Praça dos Três Poderes de props é o erro de fidelidade mais fácil de cometer.

---

## 4.2 Piscinão de Ramos — Rio de Janeiro

### Fatos físicos

- Inaugurado em **2001**, ~**30.000 m²**, capacidade citada de **30.000** pessoas/dia e até
  **60.000 num fim de semana**.
- **Lagoa artificial de água salgada** bombeada da **Baía de Guanabara** — **30 milhões de
  litros** — passando por estação de tratamento. **Profundidade máxima 1,40 m.**
  **Fundo de areia.** O volume inteiro é trocado a cada **7–10 dias**; a manta impermeável é
  substituída em média a cada **2 anos**.
- Separado da baía por **barragem/enrocamento de pedra**.
- Reforma de 2023 acrescentou: quadras poliesportivas, quadra de areia, campo de **grama
  sintética**, playgrounds, equipamentos de terceira idade, espaço multiuso, **arquibancada**
  revitalizada, **ciclovia**, **pista de skate**, banheiros.
  ([Prefeitura do Rio](https://prefeitura.rio/parques-e-jardins/prefeitura-do-rio-entrega-piscinao-de-ramos-renovado/),
  [Wikipedia](https://en.wikipedia.org/wiki/Piscin%C3%A3o_de_Ramos))

### Água — o detalhe que mais define o mapa

**Não é água de piscina azul-turquesa.** É água salgada de baía tratada, sobre fundo de
areia, historicamente **turva**. A leitura correta:

- **Verde-acinzentado a verde-oliva**, opacidade alta — **fundo invisível a partir de ~40 cm**.
- **Sem transmissão/refração profunda.** Modelar como superfície quase opaca com forte
  componente especular e **subsurface muito curto**. Um shader de água clara com fundo
  visível destrói a fidelidade instantaneamente.
- **Especular em glitter**: milhares de highlights pequenos e agitados pelo movimento de
  banhista, não uma reflexão de espelho limpa.
- **Faixa mais escura/mais turva** perto das bordas e onde há mais gente.
- **Espuma e detritos flutuando** na borda de sotavento — o local tem histórico documentado
  de acúmulo de lixo no entorno.

### Entorno — o que se vê no fundo

- **Complexo da Maré / favelas adjacentes**: sobrados de **2 a 4 lajes**, **bloco cerâmico
  vermelho sem reboco** misturado com trechos rebocados e pintados em **cores fortes e
  desbotadas** (rosa, azul-piscina, verde-limão, amarelo-ovo, terracota). **Lajes planas com
  ferragem de espera saindo** (barras de aço enferrujadas apontando pra cima — assinatura
  visual nº 1 da autoconstrução brasileira). **Caixas d'água de polietileno azul e preta**
  nos telhados, em quantidade. **Emaranhado de fiação** entre postes de concreto. Antenas
  parabólicas. Roupa no varal. Telha de fibrocimento cinza e telha cerâmica.
- **Avenida Brasil** — via expressa elevada com muro/barreira New Jersey de concreto,
  caminhões, ônibus, viaduto.
- **Baía de Guanabara** ao fundo, com navios cargueiros, Ilha do Governador e aviões
  descendo para o Galeão.

### Praia, quiosques e gente

- **Areia clara e seca** longe da água, virando **areia molhada escura e refletiva** na
  faixa da borda — o contraste entre as duas é obrigatório.
- **Guarda-sóis** em quantidade densa: patrocinados por cervejaria e refrigerante
  (vermelho, amarelo, azul, verde, branco), gastos, alguns tortos, com franja. Padrão
  típico: setores alternados de cor.
- **Cadeiras de praia** de alumínio com tela plástica colorida, e **cadeira monobloco
  branca de plástico** (a cadeira nacional).
- **Isopor** (caixa térmica branca), carrinho de vendedor com guarda-sol próprio,
  **biscoito Globo** em saco plástico transparente, **mate** em barril de inox nas costas,
  caipirinha, milho, **caixa de som** grande tocando alto.
- **Quiosques** de alvenaria pintada ou estrutura metálica com cobertura de telha
  cerâmica/palha ou lona; freezer de picolé com adesivo de marca; grade metálica.
- **Calçadão** de concreto com juntas; alguns trechos de piso podotátil amarelo;
  **guarda-corpo metálico pintado** (frequentemente enferrujado nas soldas).
- **Densidade humana altíssima** — esse é o assunto do lugar. Um Piscinão vazio não lê
  como Piscinão.
- **Vegetação:** coqueiros e amendoeiras, capim rasteiro pisoteado, canteiros com terra
  exposta.

### Luz

- Rio a **22,9°S, nível do mar, umidade 70–80%**. **Haze atmosférico forte** — a favela ao
  fundo deve estar visivelmente **lavada e com contraste reduzido**, azulada; a montanha
  mais distante quase só uma silhueta clara. É o oposto de Brasília.
- **Céu esbranquiçado perto do horizonte**, azul só no zênite.
- **Calor visível:** bounce quente e forte da areia (ambiente inferior em tom areia/amarelo),
  gente brilhando de suor e água, **specular alto e amplo na pele molhada**.
- Sombras: duras, mas com **fill ambiente muito mais alto** que em Brasília (céu inteiro
  é fonte de luz por causa do espalhamento).

---

## 4.3 Havan + estacionamento

### Fachada

- **Réplica da Casa Branca.** Fachada branca/off-white com **colunata neoclássica** de
  colunas redondas altas e frontão triangular; corpo do prédio em **azul** (a cor da marca)
  com detalhes brancos; **letreiro "HAVAN"** grande e iluminado. Padrão arquitetônico
  deliberadamente uniforme entre lojas — é literalmente a marca da empresa.
  ([O Povo](https://www.opovo.com.br/trends/a-havan-vai-inaugurar-mais-uma-loja-com-estatua-da-liberdade-em-frente-e-a-nova-unidade-segue-o-mesmo-padrao-arquitetonico-que-virou-marca-do-empresario/),
  [MKTmais](https://www.mktmais.com/2013/10/negocios-havan-loja-que-vende-tudo-tem.html))
- **Marquise** sobre a entrada, portas de vidro automáticas, adesivos de promoção e
  cartazes de preço colados no vidro.
- **Mastros de bandeira** enfileirados na frente (bandeira do Brasil, do estado, da Havan).

### Réplica da Estátua da Liberdade

- **Concreto armado** (algumas unidades em fibra de vidro), **mais de 30 m de altura** nas
  maiores. ([Arte Pública Capixaba — Havan Linhares](https://artepublicacapixaba.com.br/linhares/havan/), [O Povo](https://www.opovo.com.br/trends/a-havan-vai-inaugurar-mais-uma-loja-com-estatua-da-liberdade-em-frente-e-a-nova-unidade-segue-o-mesmo-padrao-arquitetonico-que-virou-marca-do-empresario/))
- Pintada em **verde-verdete (cobre oxidado)**, fosca, com sujeira de chuva escorrida.
- **Pedestal alto** de alvenaria/concreto, geralmente numa **ilha ajardinada** ou rotatória
  na frente do estacionamento, com **refletores no chão apontando para cima**.
- **É o hero prop do mapa.** Merece a maior texel density e é o landmark de orientação —
  visível de qualquer ponto jogável.

### Estacionamento (onde o jogo acontece)

- **Asfalto** grande e plano, cinza desbotado ao sol, com: **remendos** de tonalidade
  diferente, **trincas** (padrão "couro de jacaré"), **manchas de óleo** escuras nas vagas,
  **borracha de pneu** nas curvas.
- **Demarcação de vagas** em tinta branca **desgastada e apagada em trechos**; vagas
  preferenciais em **azul (PCD)** e **amarelo (idoso)** com pictograma.
- **Blocos de concreto batentes de roda**, **lombadas** pintadas em **amarelo e preto**,
  **meio-fio pintado de branco ou amarelo/preto**.
- **Postes de iluminação** galvanizados de 8–10 m com 2–4 luminárias em braço.
- **Bagageiros/abrigos de carrinho** de estrutura metálica com cobertura, e **carrinhos de
  compras** cromados soltos, alguns tombados, alguns com roda travada.
- **Cancela/guarita** de entrada, cones, faixa de pedestre.

### Carros — números concretos para a paleta

Frota brasileira por cor (Veloe/Fipe sobre dados do Senatran, dez/2025):
**branco 21,9% · preto 19,0% · prata 16,3% · vermelho 15,4% · cinza 10,8% · azul 7,7% ·
verde 3,5% · amarelo 1,3%**. Neutros (branco+preto+prata+cinza) = **67,0%**.
([Portal do Trânsito](https://www.portaldotransito.com.br/noticias/branco-preto-e-prata-dominam-a-frota-brasileira-e-concentram-mais-da-metade-dos-veiculos-do-pais/))

Modelos mais comuns em circulação (Sincopeças): **VW Gol (3,49 mi) · Fiat Uno (1,99 mi) ·
Fiat Palio (1,75 mi) · Fiat Strada (1,42 mi) · Chevrolet Onix (1,37 mi) · Ford Fiesta (1,14 mi) ·
Chevrolet Celta (1,00 mi) · VW Fox (1,01 mi) · Hyundai HB20 (0,94 mi) · Ford Ka (0,91 mi)**.
([AutoPapo](https://autopapo.com.br/noticia/10-carros-mais-comuns-brasil/))

**Regra para o mapa:** ~2/3 dos carros em branco/preto/prata/cinza, **~15% vermelho**
(a cor "não-neutra" dominante no Brasil, muito acima da média mundial), e o resto azul.
Carros **velhos, foscos, com verniz descascado no capô e teto** (o sol brasileiro mata o
verniz — assinatura visual real), com poeira, adesivo de loja no vidro traseiro, e
**placa Mercosul (branca com faixa azul no topo)** convivendo com **placa cinza antiga**.
Incluir **motos** (a Honda CG é o veículo mais numeroso do país) e uma **Kombi**.

### Luz

Meio-dia forte de cidade média brasileira; asfalto irradiando calor; sombras curtas e duras;
o branco da fachada estourando contra o azul; poeira suspensa. É o mapa mais "chapado" dos
quatro, e a variação tem que vir de **material** (asfalto remendado, tinta desbotada,
cromado dos carrinhos, verde da estátua) e não de iluminação.

---

## 4.4 Ferro velho

### Perímetro e entrada

- **Cerca de telha ondulada de zinco/galvanizada**, presa em mourões de madeira torta ou
  cantoneira de ferro. Chapa **cinza-azulada onde ainda tem zinco**, **manchada de branco
  giz** (óxido de zinco), **corroída na base** onde encosta na terra molhada. Alturas
  irregulares, chapas de origens diferentes, remendos com pedaço de placa velha.
- **Pichação** em preto/prata sobre o zinco e cartaz colado descolando.
- **Portão de correr** do mesmo zinco, com trilho no chão, cadeado e corrente.
- **Placa pintada à mão** — elemento identitário obrigatório:
  - Suporte: chapa de zinco, tapume de madeira ou o próprio muro.
  - Técnica: **tinta esmalte sintético a pincel**.
  - Letra: **bastão pesada ("sanserifão")**, condensada, muitas vezes **itálica inclinada
    para a direita**, com **contorno e sombra projetada** em cor contrastante.
  - Cores: campo **vermelho, azul ou amarelo**; letra branca ou amarela; sombra preta.
  - Conteúdo: `FERRO VELHO` + `COMPRA-SE FERRO • COBRE • ALUMÍNIO • BATERIA` + telefone
    grande + **seta**.
  - A característica formal do letreiramento vernacular brasileiro é o **"distanciamento
    de convenções tipográficas, com pouco ou nenhum respeito por entrelinha, hierarquia de
    espaços e dimensões"** — ou seja, **baseline irregular, letras que apertam no fim da
    linha, espacejamento desigual**. Uma fonte digital limpa e centralizada **falha** neste
    critério. ([Pintores de Letras — Tipografia Vernacular Brasileira](https://medium.com/@pintoresdeletras/tipografia-vernacular-brasileira-4d9a8791dae0))

### Conteúdo do pátio

- **Carcaças empilhadas 2 a 4 de altura**, sem porta, sem vidro, sem roda — apoiadas em
  **aro**, tijolo ou sobre outro carro. Capô e porta-malas abertos ou faltando. Teto
  amassado pelo peso.
- **Ferrugem em três estágios distintos** (usar todos os três, senão fica chapado):
  1. **laranja vivo** e granulado — corrosão ativa recente;
  2. **marrom-avermelhado escuro** com crostas escamando;
  3. **véu alaranjado fino** sobre metal ainda claro.
- **Tinta original morta**: verniz totalmente ido, cor **calcinada e giz** — vermelho vira
  **rosa-salmão**, azul vira cinza-azulado leitoso. Escorrimento de ferrugem descendo a
  partir de cada parafuso e dobra.
- **Pilhas de pneus** — preto fosco, **cinzento e esbranquiçado de poeira**, flanco rachado
  pelo sol, **com água parada dentro** (e o reflexo do céu nessa água).
- **Tambores de 200 L** amassados, alguns pintados de azul/verde/vermelho com logo
  desbotado, outros só ferrugem, tampos empenados.
- **Montes de sucata miúda**: chapas, canos, molas, escapamentos, aro de roda.
- **Blocos de motor** com graxa preta e brilho oleoso — o único material realmente escuro
  e brilhante da cena.
- **Baterias** empilhadas (caixa preta, terminais esverdeados de sulfato), **rolos de fio
  de cobre**, para-choques de plástico empilhados.
- **Barraco/escritório**: alvenaria de bloco cerâmico **sem reboco**, telhado de
  **fibrocimento cinza ondulado**, caixa d'água, porta de ferro, ventilador, cadeira
  monobloco de plástico, calendário na parede.
- **Guincho/munck** velho, prensa hidráulica, empilhadeira, carrinho de mão.
- **Cachorro** vira-lata, gato, galinha.

### Chão e vegetação

- **Terra batida** com trechos de **argila vermelha** e trechos de **brita**, manchada de
  **óleo preto** e com **poças** de água escura (espelhadas, com iridescência de óleo).
- **Mato crescendo por dentro da sucata** — capim-braquiária/colonião alto, entre e
  através das carcaças; **trepadeira cobrindo pilha inteira**; bananeira; mamona.
  **O verde vivo e saturado do mato contra o laranja da ferrugem é o contraste cromático
  que define este mapa** (complementares diretos). Um ferro velho sem mato lê como cenário
  de estúdio.
- Rachaduras com capim, formigueiro, folha seca acumulada.

### Luz

O mais flexível dos quatro. Fim de tarde funciona melhor: sol rasante fazendo o **specular
anisotrópico** correr pelas chapas onduladas de zinco, sombras longas entre as pilhas,
**god rays reais** através dos furos do telhado de zinco e dos vãos entre carcaças, poeira
em suspensão. Céu levemente alaranjado. **Cuidado com ACES aqui:** laranja saturado + ACES
deriva para amarelo-esverdeado — este é o mapa que mais se beneficia de **AgX**.

---

# 5. Checklist — 25 critérios aplicáveis a um único frame

Cada item é **PASS/FAIL**. Medidas de cor assumem: converter o frame para **CIE L\*a\*b\***
(ou HSV onde indicado), **excluir HUD/crosshair/viewmodel** e **excluir o céu** (pixels
acima da linha do horizonte com luminância > 80 e saturação < 0.25) quando o critério
falar de "cenário". Todos são computáveis a partir de um PNG.

## Bloco A — Iluminação e renderização (AAA)

**A1. Ambient occlusion visível no contato parede–chão.**
Amostrar um perfil perpendicular à junção parede-chão. PASS se houver queda monotônica de
**ΔL\* ≥ 8** nos ~15 cm finais antes da junção. FAIL se a luminância for constante até a
aresta. *(Este é o critério nº 1 e o mais diagnóstico do baseline atual.)*

**A2. Toda geometria apoiada tem sombra de contato.**
Para cada objeto que toca o chão no frame: existe escurecimento **encostado** na base.
FAIL se houver qualquer objeto "flutuando" com faixa de chão clara sob ele.

**A3. Sem clipping estrutural.**
**< 1,0%** dos pixels com L\* < 3 e **< 0,5%** com L\* > 97, excluindo céu, sol e emissivos.
FAIL se houver região de sombra chapada em preto puro.

**A4. Sombra com penumbra variável.**
A largura da transição sombra/luz na base de um objeto é **menor** que a largura no ponto
mais distante da mesma sombra. FAIL se a penumbra tiver largura constante (assinatura de
`shadow.radius` global) ou se a sombra tiver serrilha/acne.

**A5. Highlight dessatura ao clipar.**
Amostrar o pixel mais claro de uma superfície colorida sob sol direto. PASS se a saturação
HSV cair conforme o valor sobe (path-to-white). FAIL se o brilho máximo mantiver croma alta
(chapado de cor pura) — indica ausência de tonemap filmico ou exposure exagerada.

**A6. Sombra tem cor, não só ausência de luz.**
A média de matiz dentro das sombras difere da média fora delas em **≥ 8°** de hue
(tipicamente azul do céu). FAIL se sombra for apenas a mesma cor multiplicada por um escalar.

**A7. Fog/haze coerente com a distância e com o céu.**
Objetos além de ~80 m têm contraste local reduzido e cor puxada na direção da cor do céu.
FAIL se não houver atenuação alguma **ou** se houver "parede" de neblina com borda visível.

**A8. Especular/reflexo do ambiente presente em material apropriado.**
Pelo menos um material metálico ou molhado do frame apresenta reflexo com **variação
espacial** (não um brilho uniforme). FAIL se todos os metais estiverem foscos e chapados.

## Bloco B — Materiais e detalhe

**B1. Variação de material dentro do mesmo tipo de superfície.**
Escolher a maior superfície contínua do frame (chão ou parede). PASS se o desvio-padrão de
L\* dentro dela for **≥ 6** e a variação **não** for apenas repetição periódica do tile.
FAIL para asfalto/concreto/areia perfeitamente homogêneo.

**B2. Sem tiling óbvio.**
Nenhum padrão se repete de forma reconhecível **mais de 4 vezes** dentro do frame sem
interrupção por decal, mancha, prop ou variação de cor.

**B3. Texel density consistente entre superfícies adjacentes.**
Duas superfícies vizinhas no frame não podem diferir em nitidez a ponto de uma parecer
borrada ao lado da outra. Alvo: **256–512 px/m** no playspace; **≥ 512 px/m** em hero props.

**B4. Presença de decals / sujeira dirigida.**
**≥ 3 decals distintos** visíveis no frame (escorrimento, mancha de óleo, rachadura,
pichação, cartaz, marca de pneu). FAIL se toda a sujeira vier só da textura tileável.

**B5. Micro-detalhe na superfície mais próxima da câmera.**
A superfície a < 2 m da câmera mostra detalhe de normal/relevo em escala de centímetros.
FAIL se ela for uma cor plana ampliada.

**B6. Nenhuma área ampla de cor plana sem textura.**
Nenhuma região contígua **> 5%** do frame com desvio-padrão de L\* **< 2** (excluindo céu
e água). FAIL = "material de placeholder".

**B7. Silhueta com quebra.**
As arestas verticais principais do frame (quinas de prédio, postes, pilhas) não são todas
retas perfeitas: há amassado, inclinação, remendo, vegetação ou dano quebrando ≥ 1/3 delas.

## Bloco C — Clareza competitiva

**C1. Personagem separa do fundo local.**
Recortar a silhueta do personagem e o anel de 20 px ao redor. PASS se **ΔL\* ≥ 20** ou
houver rim light/contorno explícito. FAIL se o valor do personagem estiver dentro da banda
do fundo. *(Testar no pior caso do mapa, não no melhor.)*

**C2. Cenário dessaturado.**
Saturação HSV média do cenário **entre 0,10 e 0,30**. E **≤ 5%** dos pixels do cenário com
S > 0,55. FAIL para "tudo laranja" (Ferro Velho) ou "tudo azul" (Havan).
Além disso, esses ≤ 5% saturados devem pertencer a **elemento funcional** (objetivo,
personagem, item, cobertura destrutível) ou a **landmark de orientação** — nenhum "vermelho
decorativo" competindo com um "vermelho funcional".

**C3. Chão mais escuro que as paredes.**
L\* médio do plano do chão **menor** que o L\* médio das superfícies verticais, por
**≥ 6 pontos**. FAIL se o chão for a coisa mais clara do frame (inimigo vira silhueta preta
sobre fundo claro — legível, mas sem informação).

**C4. Banda de 0–2 m limpa.**
Na faixa vertical correspondente à altura de jogador, não há detalhe de alta frequência
competindo com a silhueta do inimigo: paredes planas, props agrupados nas laterais.
FAIL se houver textura ruidosa ou props espalhados na linha de tiro.

**C5. Hierarquia playspace / non-playspace legível.**
Um crítico que nunca jogou o mapa consegue apontar no frame por onde se anda. PASS se a
área jogável for mais clara e/ou mais limpa que o entorno decorativo.

**C6. Landmark de orientação visível.**
Há no frame pelo menos um elemento único e inconfundível que diz **onde** o jogador está
(Mastro, Estátua da Havan, Congresso, portão do ferro velho). FAIL para frames onde qualquer
canto do mapa pareceria igual.

## Bloco D — Fidelidade ao Brasil

**D1. Elementos nomeados do mapa presentes.**
O frame contém **≥ 2** dos elementos obrigatórios listados em §4 para aquele mapa
(ou o mapa inteiro contém **≥ 80%** da lista, verificável num overview).

**D2. Sinal de idade e uso.**
Há evidência visual de tempo: ferrugem, tinta desbotada, remendo de asfalto, escorrimento
de chuva, reboco caído, mato em rachadura. FAIL para "tudo recém-construído" — o defeito
de fidelidade mais comum em cenário brasileiro feito por quem não conhece.

**D3. Paleta condizente com a estação/clima do lugar.**
Brasília: gramado **palha/dourado** na seca, céu azul profundo, **sem haze próximo**.
Rio: **haze forte** ao fundo, céu esbranquiçado no horizonte, água **verde-opaca**.
FAIL para gramado verde-esmeralda em Brasília ou água azul-turquesa no Piscinão.

**D4. Tipografia/sinalização é brasileira e não-genérica.**
Todo texto visível está em português, com forma correta para o contexto: **letreiramento
vernacular pintado à mão** (baseline irregular, bastão pesado com contorno e sombra) no
Ferro Velho; **letreiro corporativo** na Havan; **sinalização oficial** em Brasília.
FAIL para Lorem Ipsum, texto em inglês, ou fonte digital limpa onde deveria haver pintura
à mão.

---

# 6. Como o crítico aplica

1. **Um frame por mapa, em posição jogável** (altura de olho, FOV de jogo), não em câmera
   de fotógrafo. Mais **um frame no pior canto do mapa** para os critérios C1 e C5.
2. Rodar A1–A8 e B1–B7 primeiro: são independentes de qual mapa é.
3. C1–C6 exigem um personagem no frame.
4. D1–D4 exigem consultar a lista de §4 do mapa correspondente.
5. **Reportar contagem** (ex.: `18/25 PASS`) e listar cada FAIL com a medida obtida vs. o
   alvo. Não emitir veredito de gosto — a régua já é o veredito.

---

# 7. Fontes

**CS2 / Source 2**
- [Valve Developer Community — Counter-Strike 2 Workshop Tools / Level Design / Lighting](https://developer.valvesoftware.com/wiki/Counter-Strike_2_Workshop_Tools/Level_Design/Lighting)
- [Newsweek — CS:GO patch notes: Boost Player Contrast and map balance](https://www.newsweek.com/counter-strike-global-offensive-patch-notes-boost-player-contrast-map-balance-update-1510265)
- [Mapcore — Source Lighting Technical Analysis, Part One](https://www.mapcore.org/articles/development/source-lighting-technical-analysis-part-one-r65/) e [Part Two](https://www.mapcore.org/articles/development/source-lighting-technical-analysis-part-two-r66/)
- [Hickman Design — The Art of Counter-Strike: Global Offensive](https://hickmandesign.co.uk/blog/other/the-art-of-counter-strike-global-offensive-a-design-perspective/)

**VALORANT / Riot**
- [Riot Games Tech Blog — VALORANT Shaders and Gameplay Clarity](https://www.riotgames.com/en/news/valorant-shaders-and-gameplay-clarity)
- [PlayVALORANT — The Art of VALORANT Map Environments](https://playvalorant.com/en-us/news/dev/the-art-of-valorant-map-environments/)

**Level design / environment art**
- [The Level Design Book — Environment Art](https://book.leveldesignbook.com/process/env-art)
- [Frozenbyte Wiki — 3D Asset Workflow: Tile Textures and Trimsheets](https://wiki.frozenbyte.com/index.php/3D_Asset_Workflow:_Tile_Textures_and_Trimsheets)
- [Beyond Extent — Texel Density deep dive (Timothy Dries)](https://www.beyondextent.com/deep-dives/deepdive-texeldensity)
- [80.lv — SanXia Street 1940: Modular Approach, Trim Sheets, Decals](https://80.lv/articles/005cg-001agt-sanxia-street-1940-modular-approach-trim-sheets-decals)

**Three.js / WebGL2**
- [three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide) (r151 aoMap/lightMap channels; r152 outputColorSpace; r155 useLegacyLights; r162 environmentIntensity; r180 KTX2 detectSupport)
- [three.js — webgl_tonemapping example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_tonemapping.html) (AgX, Neutral)
- [N8python/n8ao](https://github.com/N8python/n8ao) — SSAO (requer r161+)
- [0beqz/realism-effects](https://github.com/0beqz/realism-effects) — SSGI, Motion Blur, TRAA
- [StrandedKitty/three-csm](https://github.com/StrandedKitty/three-csm) e [exemplo oficial CSM](https://threejs.org/examples/webgl_shadowmap_csm.html)
- [gkjohnson/three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer)
- [lucas-jones/three-lightmap-baker](https://github.com/lucas-jones/three-lightmap-baker)
- [PixelCapture — Lightmap Baking in Blender for Three.js](https://pixel-capture.com/tutorials/lightmap-baking-in-blender)
- [three.js docs — PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html)
- [utsubo — 100 Three.js Performance Tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- [Codrops — Building Efficient Three.js Scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)

**Brasília**
- [WikiArquitectura — Praça dos Três Poderes](https://pt.wikiarquitectura.com/constru%C3%A7%C3%A3o/praca-dos-tres-poderes/)
- [Wikipédia — Mastro especial da Praça dos Três Poderes](https://pt.wikipedia.org/wiki/Mastro_especial_da_Pra%C3%A7a_dos_Tr%C3%AAs_Poderes)
- [Wikipédia — Eixo Monumental](https://pt.wikipedia.org/wiki/Eixo_Monumental)
- [ipatrimônio — Brasília, Conjunto dos Ministérios](https://www.ipatrimonio.org/brasilia-conjunto-dos-ministerios/)
- [Melhores Destinos — Brasília, quando ir e clima](https://guia.melhoresdestinos.com.br/brasilia-quando-ir-clima.html)

**Piscinão de Ramos**
- [Prefeitura do Rio — Prefeitura entrega Piscinão de Ramos renovado](https://prefeitura.rio/parques-e-jardins/prefeitura-do-rio-entrega-piscinao-de-ramos-renovado/)
- [Wikipedia — Piscinão de Ramos](https://en.wikipedia.org/wiki/Piscin%C3%A3o_de_Ramos)
- [Me Leva Contigo — Piscinão de Ramos: o que saber antes de ir](https://melevacontigo.com.br/piscinao-de-ramos-o-que-saber-antes-de-ir/)
- [Núcleo do Conhecimento — A implantação do Piscinão de Ramos (estudo sociotécnico)](https://www.nucleodoconhecimento.com.br/arquitetura/piscinao-de-ramos)

**Havan / carros**
- [Arte Pública Capixaba — Estátua da Liberdade (Havan Linhares)](https://artepublicacapixaba.com.br/linhares/havan/)
- [O Povo — Havan e o padrão arquitetônico das lojas](https://www.opovo.com.br/trends/a-havan-vai-inaugurar-mais-uma-loja-com-estatua-da-liberdade-em-frente-e-a-nova-unidade-segue-o-mesmo-padrao-arquitetonico-que-virou-marca-do-empresario/)
- [MKTmais — Havan, a loja que vende tudo](https://www.mktmais.com/2013/10/negocios-havan-loja-que-vende-tudo-tem.html)
- [Portal do Trânsito — Branco, preto e prata dominam a frota brasileira](https://www.portaldotransito.com.br/noticias/branco-preto-e-prata-dominam-a-frota-brasileira-e-concentram-mais-da-metade-dos-veiculos-do-pais/) (Veloe/Fipe/Senatran, dez/2025)
- [AutoPapo — Os 10 carros mais comuns nas ruas do Brasil](https://autopapo.com.br/noticia/10-carros-mais-comuns-brasil/) (Sincopeças)

**Ferro velho / tipografia vernacular**
- [Pintores de Letras — Tipografia Vernacular Brasileira](https://medium.com/@pintoresdeletras/tipografia-vernacular-brasileira-4d9a8791dae0)
- [Repositório UFAL — Letreiros Populares do Recife: aspectos semânticos e morfológicos](https://www.repositorio.ufal.br/bitstream/riufal/3234/1/Letreiros%20Populares%20do%20Recife:%20uma%20an%C3%A1lise%20dos%20seus%20aspectos%20sem%C3%A2nticos%20e%20morfol%C3%B3gicos.pdf)
- [Academia.edu — Letras do cotidiano: a tipografia vernacular em Belo Horizonte](https://www.academia.edu/15781963/Letras_do_cotidiano_a_tipografia_vernacular_na_cidade_de_Belo_Horizonte)

---

*Documento complementar a `RUBRIC.md` (qualidade de asset). A RÉGUA julga o **frame**;
a RUBRIC julga o **asset**.*
