# MAP AUDIT — baseline de qualidade visual dos mapas

**Data:** 14/08/2026
**Motivo:** o dono cobrou que os mapas estão abaixo da régua das referências de
`references/mapas/world/` (favela texturizada estilo Arma Reforger / mobile favela). Na
palavra dele: *"está low poly, tudo quadradão, grafites no ar e não nos objetos, paredes sem
textura, elementos chapados dignos de Minecraft"*. Este documento é a baseline honesta que
dirige a calibração mapa a mapa (dossiê `references/mapas/world/WORLD.md`, §1). Não é um
documento de celebração: nota inflada aqui vira calibração errada depois.

## Como as notas são calibradas

Escala 1–5 por categoria, ancorada nas referências do dossiê:

- **5 = a referência.** Alvenaria com textura fotográfica e envelhecimento lógico (mancha de
  água embaixo de telhado, sujeira junto ao chão, musgo em canto úmido), paleta que varia de
  casa para casa, poste com cabo que pende, vegetação real (palmeira, mato na calçada),
  micro-detalhe (lixo, cadeira de plástico, varal) sem comprometer a leitura do inimigo.
  É o nível dos screenshots do mod de favela do Reforger em `references/mapas/world/`.
- **3 = funcional mas genérico.** O espaço se lê, o tema se identifica, mas as superfícies
  repetem uma ou duas texturas, o detalhe é esparsO e a iluminação é plana. CS 1.6 vanilla.
- **1 = blockout.** Geometria de caixa, cor chapada ou textura única esticada, nenhuma camada
  de detalhe, iluminação ambiente uniforme. Minecraft sem intenção.

Vocabulário do dossiê (§2), usado em todo o audit:

- **MACRO** — arquitetura, vias, terreno, marcos grandes: estabelece navegação.
- **MESO** — carros, muros, escadas, postes, quiosques: estabelece identidade.
- **MICRO** — lixo, mato, cabos, cartazes, trincas, drenos: estabelece verossimilhança.
  Não pode comprometer a visibilidade do inimigo.

## Fontes de evidência

1. **Capturas reais** em `/tmp/review-maps/` (25 PNGs, 1536×1024, 3:2, manifesto de
   13/08/2026): `escadao` (3), `campomorro` (5), `lajes` (4), `corrego` (6),
   `mansao` (7). Todas foram olhadas; o que está escrito abaixo é o que se vê nelas.
2. **Código** em `public/js/map_*.js`: plantas, spawns, waypoints, bandeiras, densidade de
   props e materiais. Registro em `public/js/maps.js`: 10 mapas jogáveis
   (`praca_poderes`, `piscina_treta`, `loja_h`, `ferro_velho`, `quebrada`, `escadao`,
   `campomorro`, `lajes`, `corrego`, `mansao`). `map_piscinao_ramos.js` existe
   mas está fora do registro (reprovado pelo dono em 31/07) e não entra no audit.
3. **Referências** `references/mapas/world/*.png`: usadas para ancorar o 5.

Mapas sem captura (`quebrada`, `piscina_treta`, `loja_h`, `ferro_velho`, `praca_poderes`)
têm as notas visuais marcadas como **(inferida do código — pendente de captura)**. Nenhuma
captura nova foi feita nesta rodada (restrição de concorrência de browser). PERFORMANCE é
inferida do código em todos os mapas (batching/instancing), não de profiling — nenhum FPS
foi medido.

---

## 1. escadao — Escadão (Morro)

**Fonte:** capturas `bottom-up`, `top-down`, `caveirao` + `map_escadao.js` (840 linhas).

- **Theme:** comunidade carioca cortada por escadaria monumental de azulejo colorido
  (Selarón genérico), com caveirão atravessado no patamar central.
- **Geographic identity:** Rio de Janeiro (morro, azulejo, `sky_rj`). O conceito é forte e
  único no elenco.
- **Visual landmarks:** os três lances de azulejo (MACRO, leem de longe), o caveirão preto
  (MESO, hero prop), o mirante no topo. Na captura `bottom-up` a escada colorida fecha o
  enquadramento corretamente.
- **Playable routes:** escada central (5 m de largura) + dois becos laterais com escadas
  próprias que sobem até o patamar 1 (map_escadao.js:12-14). 3 rotas reais.
- **Choke points:** patamares com barricadas; caveirão ocupa a metade oeste do lance
  central (map_escadao.js:831-832).
- **Verticality:** a tese do mapa — 3 lances × 12 espelhos de 0,17 m ≈ 6,1 m de desnível.
- **Sightlines:** eixo longo de ~80 m da rua ao mirante; linhas retas e previsíveis.
- **Spawn zones:** E na rua da base (z=26), B no topo/mirante (z=-34). Bandeiras MIRANTE /
  PATAMAR 2 / PATAMAR 1 / RUA alternando lado.
- **Empty spaces:** os telhados de zinco no `top-down` são lajes grandes e vazias; a rua da
  base tem trechos sem nenhum MESO entre muro e muro.
- **Repetitive structures:** as casas são caixas de mesma altura com a mesma textura
  `favela_wall`; janelas são quads escuros chapados. No `top-down` os telhados repetem o
  mesmo plano inclinado de zinco sem variação de cumeeira.
- **Lighting problems:** luz plana e lavada nas três capturas; sombras de contato quase
  inexistentes; céu em gradiente azul sem nuvem. O azulejo, que devia estourar ao sol,
  fica fosco.
- **Scale problems:** nenhum grosseiro visível; o caveirão lê grande mas plausível.
- **Clipping problems:** em `bottom-up` há uma caixa escura (dumpster?) visivelmente
  suspensa no ar em frente ao lance inferior; os cabos elétricos são segmentos de reta
  rígidos sem catenária e cruzam o céu sem ancoragem visível nos postes.
- **Traversal problems:** nenhum inferido do código; escadas seguem NBR 9077/Blondel.
- **Prop density:** MESO presente mas ralo (fusca, moto, stall, mesa com guarda-sol,
  pilha de pneus, caixa d'água — `ESCADAO_PROPS`). MICRO praticamente só grafite/decal;
  não há lixo, mato, calçada quebrada.
- **Material repetition:** `T.concrete` ×16 e `T.concreteDark` ×9 dominam; a mesma
  `favela_wall` cobre quase toda fachada. O azulejo do escadão (chevron colorido) se
  repete idêntico nos dois lados da escada e nas muretas — lê como papel de parede.
- **Gameplay readability:** boa por construção (eixo + 2 flancos), mas o chevron azul/
  verde/amarelo nos dois lados do caveirão cria ruído visual exatamente na altura do
  peito na captura `caveirao`.

| IDENTITY | READABILITY | COMBAT FLOW | ENV DETAIL | LIGHTING | MATERIAL QUALITY | PERFORMANCE | BR AUTHENTICITY |
|---|---|---|---|---|---|---|---|
| 3 | 3 | 3 | 2 | 2 | 2 | 4* | 3 |

\* inferida do código (mapa pequeno, geometria simples).

**3 piores problemas:**
1. Repetição material: uma textura de parede para a comunidade inteira + azulejo idêntico
   em toda superfície de escada/mureta.
2. Cena suspensa: cabos retos sem catenária nem poste de ancoragem e ao menos um prop
   flutuando visível na captura da base.
3. Iluminação plana que mata o hero prop: o azulejo e o caveirão não têm lado de sombra.

---

## 2. campomorro — Campo do Morro

**Fonte:** capturas `field-mouth`, `field-eye`, `field-overview`, `galpao-interior`,
`galpao-eye` + `map_campomorro.js` (643 linhas).

- **Theme:** campo de várzea rebaixado cercado de comunidade, com galpão do baile elevado.
  Spec `plans/11-CAMPO-DO-MORRO.md`.
- **Geographic identity:** várzea de morro (RJ). Identidade conceitual forte.
- **Visual landmarks:** as duas traves com rede (MACRO), o galpão do baile com paredão de
  som (MACRO/MESO), a arquibancada. No `field-overview` o campo lê como centro de gravidade.
- **Playable routes:** oito becos convergentes (LANES em map_campomorro.js:21-30) ligando o
  anel externo ao campo central; rampas de acesso ao platô.
- **Choke points:** as bocas dos oito becos e a porta do galpão; o campo em si é um
  vazio — quem cruza está exposto.
- **Verticality:** fraca: campo a −0,08 m, galpão a +1 m, encostas suaves fora do rim
  (topografia adicionada depois da reclamação "sem topografia"). Não há segundo piso.
- **Sightlines:** muito longas através do campo (40 m+) com quase nenhum bloqueio — corredor
  de sniper no miolo do mapa.
- **Spawn zones:** E exposto no centro-oeste do campo (por contrato da ficha,
  map_campomorro.js:605-607), B no galpão. Bandeiras N / W / SE / S.
- **Empty spaces:** o problema nº 1. `field-eye` mostra um plano marrom gigante com uma
  trave, um fusca e dois vultos de prop a 30 m. Entre o rim e o campo não há quase MESO.
- **Repetitive structures:** o muro perimetral é uma faixa contínua com a mesma textura de
  terra e a mesma colagem de grafite repetida em módulos (visível no `field-eye`: o mesmo
  patch de colagem se repete na parede inteira).
- **Lighting problems:** plana; o interior do galpão é um cubo escuro com teto preto
  chapado e duas faixas de luz laranja sem fonte visível.
- **Scale problems:** a rede da trave lê como grade de arame de galinheiro esticada
  (aliasing no `field-mouth`); o paredão de som está ok em escala.
- **Clipping problems:** nada flagrante nas capturas; a textura de "camuflagem" do teto do
  container na boca oeste está esticada (`field-mouth`).
- **Traversal problems:** nenhum inferido; relevo dentro do tolerado pelo A*.
- **Prop density:** MESO existe (container, stall, caixa de som, arquibancada, fusca, moto,
  pneus) mas diluído num mapa de 72×60 m. MICRO inexistente no campo: nem um tufo de mato,
  garrafa ou mancha de grama — viola direto o §4/§5 do dossiê (ground detail, weeds).
- **Material repetition:** o pior do elenco. A MESMA textura de terra (`dirt_field`) cobre
  o campo, os muros externos E as paredes internas do galpão (visível em `galpao-eye`:
  parede de galpão com textura de chão de terra). O piso do galpão é um xadrez cinza de
  placeholder. Tudo é marrom.
- **Gameplay readability:** o marrom-monocromático apaga a hierarquia: campo, muro, casa e
  encosta têm o mesmo valor tonal. Os oito becos não se distinguem uns dos outros.

| IDENTITY | READABILITY | COMBAT FLOW | ENV DETAIL | LIGHTING | MATERIAL QUALITY | PERFORMANCE | BR AUTHENTICITY |
|---|---|---|---|---|---|---|---|
| 3 | 2 | 3 | 2 | 2 | 1 | 4* | 3 |

\* inferida do código.

**3 piores problemas:**
1. Monocromia de terra: uma textura única em chão, muro e interior — é o "elementos
   chapados dignos de Minecraft" na sua forma mais pura.
2. Vazio MESO/MICRO no campo e no anel: planície marrom sem mato, lixo, poça ou desnível
   de calçada.
3. Interior do galpão blockout: teto preto, parede com textura de chão, piso xadrez de
   placeholder.

---

## 3. lajes — Lajes (Comunidade)

**Fonte:** capturas `roof-eye`, `roof-route`, `layer-overview`, `jump-link` +
`map_lajes.js` (726 linhas).

- **Theme:** comunidade carioca em duas camadas — lajes em cima, becos embaixo. A luta
  pela vertical.
- **Geographic identity:** RJ. O conceito (parkour de laje) é dos mais brasileiros do
  elenco.
- **Visual landmarks:** deveriam ser as lajes com caixas d'água, antenas e varais; na
  prática o que marca é o grafite no nível da rua (ZICA, SDMA, os personagens-olho) e a
  ponte de tábua do `jump-link`. No nível das lajes não há landmark nenhum.
- **Playable routes:** beco central + becos entre prédios (y=0) e a camada das lajes
  (y=3,5) com vãos medidos de 1,5 m; 4 escadas conectam as camadas (map_lajes.js:11-13).
- **Choke points:** as 4 escadas e os vãos entre lajes — bons pontos de emboscada por
  construção.
- **Verticality:** a tese do mapa (duas camadas reais, groundHeightAt duplo).
- **Sightlines:** longas e limpas nas lajes (planos abertos), curtas nos becos. Bom
  contraste tático, mas nas lajes o atirador se destaca contra céu ou contra caixa cinza.
- **Spawn zones:** E nas lajes norte (prédio central mais alto), B nos becos sul.
  Bandeiras LAJE NORTE / BECO CENTRAL / BECO SUL / FUNDO SUL.
- **Empty spaces:** crítico. `roof-eye` é a captura mais fraca das 25: um plano cinza de
  laje sem fim, duas caixas verde-escuras sem textura nenhuma, uma faixa de passarela
  cinza. Parece mapa de teste de engine.
- **Repetitive structures:** prédios = caixas de footprint variado mas mesma altura (3,5 m)
  e mesma pele; no `layer-overview` as lajes são uma grade de planos cinza idênticos com
  filete amarelo de borda.
- **Lighting problems:** plana, sem sombra de contato; o céu azul-degradê com uma nuvem
  solitária em `roof-eye` escancara o vazio.
- **Scale problems:** as caixas verdes de `roof-eye` (caixas d'água? casas de máquina?)
  não têm escala legível — nem porta, nem escada, nem textura.
- **Clipping problems:** o personagem-olho do grafite se repete 4× na mesma sequência de
  muro no `jump-link`; em `roof-eye` um grafite verde flutua numa empena cuja base não se
  vê — o "grafite no ar e não nos objetos" do dono.
- **Traversal problems:** vãos de 1,5 m medidos; nada a reportar do código.
- **Prop density:** MESO no nível da rua é razoável (stall, pneus, moto, varal); na camada
  das lajes é quase zero — exatamente onde o jogador passa metade do tempo. MICRO
  inexistente nas lajes.
- **Material repetition:** `concrete` + `concreteDark` em tudo; laje = plano cinza liso;
  chão dos becos = a mesma textura de terra-camuflagem do campomorro/córrego.
- **Gameplay readability:** a cor por ala prometida no manifesto de captura não se lê nas
  imagens; o que orienta é o grafite, não a arquitetura. Violado o teste de aceite do
  dossiê (§37: reconhecer o lugar sem texto) no nível das lajes.

| IDENTITY | READABILITY | COMBAT FLOW | ENV DETAIL | LIGHTING | MATERIAL QUALITY | PERFORMANCE | BR AUTHENTICITY |
|---|---|---|---|---|---|---|---|
| 3 | 2 | 4 | 1 | 2 | 1 | 4* | 2 |

\* inferida do código.

**3 piores problemas:**
1. A camada jogável das lajes é um blockout: planos cinza, caixas sem textura, zero
   caixas d'água/antenas/varais com presença — o §19 do dossiê (rooftops) inteiro por
   fazer.
2. Céu e horizonte vazios: o mapa existe dentro de um void azul; falta o distant world
   (§29) e qualquer composição de sombra (§26).
3. Grafite como tapa-buraco: a mesma arte repetida em sequência e peças flutuando em
   empena sem base leem como decalque, não como parede pintada.

---

## 4. corrego — Córrego (Favela de SP)

**Fonte:** capturas `bridge-eye`, `water-bridge`, `canal-overview`, `capivara`,
`animals`, `rats` + `map_corrego.js` (1550 linhas).

- **Theme:** favela de São Paulo sobre córrego a céu aberto; palafitas, pontes de madeira,
  água poluída. O mapa mais ambicioso do elenco.
- **Geographic identity:** SP por decisão (`sky_sp`, pixo pesado), embora a paleta laranja
  puxe para um genérico "favela". Autodeclarado "o mapa mais brasileiro do elenco" no
  cabeçalho — e na densidade de sinais é mesmo.
- **Visual landmarks:** o canal (MACRO, domina a leitura aérea), as três pontes, as
  palafitas de dois andares com caixa d'água, a capivara e o jacaré (hero props de
  nicho), o adesivo CPV e os cartazes de BAILE FUNK.
- **Playable routes:** três eixos andáveis por margem (passeio da beira, beco, rua do
  spawn) + o FUNDO DO CANAL como rota real (vazio real, y=−1,75, com rampas de acesso —
  map_corrego.js:29-70). 3 travessias em z=−22/0/22.
- **Choke points:** as três pontes são gargalos duros — o único caminho entre margens sem
  descer ao canal. Alto risco de camp de ponte.
- **Verticality:** canal afundado (queda tática de 2,0 m) + palafitas com mirantes;
  moderada e funcional.
- **Sightlines:** ao longo do canal, muito longas (80 m de money shot); nas margens,
  quebradas pelas fileiras de casas. Bom desenho.
- **Spawn zones:** quatro largos por lado nas ruas externas (x=±21, z∈{−25,−5,15,35}),
  com zona limpa de grafite nos spawns (decisão documentada). Bandeiras OESTE / PONTE C /
  LESTE / PONTE N.
- **Empty spaces:** poucos; o mapa é o mais denso. O alagado nas pontas (z além de ±34)
  é raso de conteúdo.
- **Repetitive structures:** as casas repetem o mesmo módulo de palafita com a MESMA
  textura laranja-marrom em 100% das fachadas — no `canal-overview` o mapa inteiro é um
  único tom de camuflado laranja. É o defeito visual nº 1.
- **Lighting problems:** escuro e enlameado. O canal no `capivara` e no `animals` é um
  poço quase preto; o céu nublado cinza do `canal-overview` deixa tudo chato. Falta a
  alternância sol/sombra do §26.
- **Scale problems:** nenhum grosseiro; capivara e ratos leem em escala certa.
- **Clipping problems:** nada flagrante nas capturas.
- **Traversal problems:** o canal era "cair e travar" e virou rota — resolvido no código.
- **Prop density:** a melhor do elenco: caixas d'água, antenas, pneus, tijolos, lixeiras,
  kombi, uno, fusca, moto, botijão, arara de roupas. MICRO existe de verdade (ratos no
  lixo, cartazes, adesivos, manilha). Ainda assim falta mato/vegetação (§5) e o chão de
  concreto é uniforme demais.
- **Material repetition:** extremo: `T.dirt` ×12 + a textura `favela_wall` laranja em
  toda fachada. A água é um plano verde quase sem movimento/gradiente.
- **Gameplay readability:** o canal orienta sempre; mas a monocromia laranja faz inimigo
  de pele escura sumir contra a parede, e o interior escuro do canal esconde demais.

| IDENTITY | READABILITY | COMBAT FLOW | ENV DETAIL | LIGHTING | MATERIAL QUALITY | PERFORMANCE | BR AUTHENTICITY |
|---|---|---|---|---|---|---|---|
| 4 | 3 | 3 | 3 | 2 | 2 | 3* | 4 |

\* inferida do código (StaticBatch/InstBatch presentes, cena densa — não profiled).

**3 piores problemas:**
1. Uma textura para uma favela inteira: variação arquitetônica zero (§8 do dossiê pede
   tijolo, reboco, concreto, zinco, madeira alternados).
2. Iluminação/lama: canal subexposto e céu morto derrubam a melhor densidade do elenco.
3. Água chapada: plano verde estático sem lâmina, espuma ou sujeira de margem.

---

## 5. mansao — Mansão do Joá

**Fonte:** capturas `facade-garden`, `garden-eye`, `cars-front-close`, `interior`,
`gourmet-eye`, `theater-eye`, `infinity-pool` + `map_mansao.js` (703 linhas).

- **Theme:** mansão de ultra-luxo no Joá, RJ: jardim tropical → garagem → casa modernista
  com mezanino → terraço com piscina infinita sobre o mar.
- **Geographic identity:** RJ pelo oceano e pelo nome; arquitetonicamente poderia ser
  qualquer condomínio de luxo do hemisfério sul.
- **Visual landmarks:** a piscina infinita alinhada ao mar (MACRO), a escada de perfil
  vazado no hall (MESO), a fachada de muxarabi de madeira. Nenhum hero prop memorável
  (§16 pede 3–8).
- **Playable routes:** jardim (sul) → garagem/hall → sala/cozinha → terraço (norte), com
  mezanino (y=4,5) por duas escadas; biombos com vãos alinhados aos spawns internos.
- **Choke points:** as portas dos biombos do jardim, a escada do mezanino e a boca do
  terraço.
- **Verticality:** mezanino + escada de serviço; funcional mas contida.
- **Sightlines:** longas no eixo jardim→casa→piscina (70 m); dentro da casa, quebradas
  por divisórias. Ok.
- **Spawn zones:** A no portão/jardim (z=32), B no terraço/piscina (z=−22). Bandeiras
  JARDIM / SALA / MEZZO / PISCINA.
- **Empty spaces:** `infinity-pool` é um plano ciano contra um plano azul: deck vazio,
  dois cubos verdes como "vasos", horizonte morto. O jardim tem pavers e grama mas
  nenhum mobiliário além de duas mesas com guarda-sol (`MANSAO_PROPS` tem 2 itens).
- **Repetitive structures:** fileiras de pilares de madeira idênticos no terraço
  (`gourmet-eye`); os pavers do jardim repetem o mesmo módulo.
- **Lighting problems:** interior com a MESMA luz do exterior — viola direto o §20 do
  dossiê. Tudo cinza-bege, sem temperatura de cor, sem sombra de contato; o home theater
  é um quarto escuro monocromático.
- **Scale problems:** os carros da garagem são caixas sem vidro (bloco escuro por cima) e
  sem roda modelada — leem brinquedo em `cars-front-close`.
- **Clipping problems:** a escada do hall flutua sem apoio visível em `cars-front-close`;
  painéis escuros do theater pendem sem fixação.
- **Traversal problems:** nenhum inferido.
- **Prop density:** MESO fraco para uma mansão (3 carros, mesas de guarda-sol, ilha
  gourmet, recliners) e MICRO zero: nem um controle remoto, revista, toalha, copo. Uma
  mansão sem sinal de habitação — o oposto do §3/§14.
- **Material repetition:** monocromia total: concreto claro, madeira escura, vidro fumê.
  O piso interno é DataTexture procedural de 16 px ("placas de grande formato"); as
  paredes do theater usam textura de terra rachada (`tex_garden`?) — material errado em
  ambiente errado.
- **Gameplay readability:** boa por planta (eixo claro, biombos com vãos), mas a
  monocromia cinza apaga a separação quente/frio do §21.

| IDENTITY | READABILITY | COMBAT FLOW | ENV DETAIL | LIGHTING | MATERIAL QUALITY | PERFORMANCE | BR AUTHENTICITY |
|---|---|---|---|---|---|---|---|
| 3 | 3 | 3 | 2 | 2 | 2 | 4* | 2 |

\* inferida do código.

**3 piores problemas:**
1. Esterilidade: casa de luxo sem nenhum sinal de vida (zero MICRO, zero storytelling),
   lendo como maquete de corretor.
2. Interior sem transição de luz nem de material: mesma exposição e mesma paleta do
   jardim ao theater.
3. Horizonte vazio: oceano = plano azul sem onda, barco, pedra ou costa — o money shot
   do mapa entrega o void.

---

## 6. quebrada — Quebrada (Rua do Baile)

**Sem captura nesta rodada — notas visuais inferidas do código, pendentes de captura.**

- **Theme:** rua reta e comprida de quebrada: rotunda do baile numa ponta, campinho de
  terra na outra, ônibus parado com ponto, bar com cadeira de plástico, comércio (adega,
  açaí, sorveteria), vielas e becos (spec literal do dono, HANDOFF A0.10).
- **Geographic identity:** periferia BR genérica (não declarada como RJ ou SP).
- **Visual landmarks (código):** praça do baile com paredão de som e carros tunados,
  ônibus SPTrans, campinho com trave, fachadas de comércio; murais de homenagem 5,4×2,8 m.
- **Playable routes:** rua principal (x∈[−7,7]) + duas vielas de fundo (x=∓23, a 4× a
  separação mínima da régua CTF2) + travessa do campinho. Reto por desenho — o risco de
  "fita de sniper" é reconhecido no código e mitigado pelas vielas.
- **Choke points:** travessa (z∈[24,28]) e as bocas das vielas.
- **Verticality:** baixa; mapa essencialmente plano.
- **Sightlines:** 90 m de rua reta — a mais longa do elenco.
- **Spawn zones:** E na vila do baile (norte), B no campinho (sul). Bandeiras BAILE /
  PONTO DE ÔNIBUS / BAR DA ESQUINA / CAMPINHO com altura de triângulo medida de 10,4 m.
- **Empty spaces (inferido):** desconhecido sem captura; o miolo da rua tem barricadas e
  carros por desenho.
- **Repetitive structures (inferido):** casas "majoritariamente de barraco" instanciadas
  (InstancedMesh por bloco de 24 m) — repetição estrutural provável, quebrada ou não por
  pintura/textura, pendente de captura.
- **Lighting / scale / clipping / traversal:** pendente de captura. O histórico do código
  registra um defeito REAL de grafite morrendo em silêncio (decal colado antes do
  `PB.build`, 238 peças perdidas — map_quebrada.js:1561-1579), corrigido; o estado visual
  atual é não verificado.
- **Prop density (código):** a maior lista do elenco (`QUEBRADA_PROPS`: 26 ids, incl.
  `fav_house`, `fav_brasileira` com textura fotográfica de tijolo/reboco, ônibus,
  fachada de comércio, churrasqueira, drinkstand). MESO denso por desenho.
- **Material repetition (inferido):** concrete/asphalt/dirt + os GLBs fotográficos;
  tendência melhor que os mapas fy_* — pendente de captura.
- **Gameplay readability (inferido):** eixo único claro; risco conhecido de linearidade.

| IDENTITY | READABILITY | COMBAT FLOW | ENV DETAIL | LIGHTING | MATERIAL QUALITY | PERFORMANCE | BR AUTHENTICITY |
|---|---|---|---|---|---|---|---|
| 4 | 3* | 3 | 3* | 2* | 3* | 3* | 4 |

\* inferida do código — pendente de captura.

**3 piores problemas (provisórios):**
1. Estado visual não verificado — o mapa já perdeu 70% do grafite num bug silencioso e
   só captura nova confirma o que sobreviveu.
2. Linearidade estrutural: uma rua reta de 90 m depende inteiramente das vielas para não
   virar duelo de sniper.
3. Barracos instanciados: se a variação de pintura/textura não quebrar a repetição, é o
   candidato natural a "fileira de caixas idênticas".

---

## 7. piscina_treta — Piscina da Treta

**Sem captura nesta rodada — notas visuais inferidas do código, pendentes de captura.**

- **Theme:** homenagem ao fy_pool_day do CS 1.6: salão FECHADO de piscina azulejada.
  Deliberadamente sem tema brasileiro — o dono reprovou a versão temática (Piscinão de
  Ramos: "muito poluído, não dá pra entender nada") e mandou voltar esta.
- **Geographic identity:** nenhuma por decisão de design. Azulejo branco com faixa azul-
  marinho é o teto da autenticidade aqui.
- **Visual landmarks:** a piscina funda ciano no centro do salão, o trampolim, os bancos
  de armários, a claraboia.
- **Playable routes:** deck perimetral + rampas + FUNDO da piscina andável; compacto
  (34×50 m).
- **Choke points:** as rampas da piscina e as portas do salão.
- **Verticality:** a piscina afundada + bloco de partida/trampolim; contida.
- **Sightlines:** diagonais do salão; o mapa inteiro se lê de qualquer canto.
- **Spawn zones:** nas duas pontas do deck (z=±21). Bandeiras PARTIDA / ARMÁRIOS /
  TRAMPOLIM, altura de triângulo 12 m (declaradas depois do defeito "bandeira dentro
  d'água").
- **Empty spaces:** o deck norte/sul foi adensado com cobertura por pedido do dono
  ("o respawn tinha que ser maior", map_piscina.js:606+).
- **Repetitive structures:** armários e espreguiçadeiras em fileiras — intencional.
- **Lighting / clipping / traversal:** pendente de captura. Interior com claraboia.
- **Prop density (código):** armários, cadeiras, boxes de chuveiro, blocos de partida;
  MICRO é grafite em 4 bandas + cartazes da coleção.
- **Material repetition (inferido):** azulejo canvas 128 px em quase tudo — um material
  por superfície, liso por desenho. Longe da régua de referência, perto do alvo CS 1.6
  que o dono aprovou.
- **Gameplay readability:** a melhor do elenco por construção: compacto, simétrico,
  azulejo claro com faixa escura. É o mapa-régua de leitura.

| IDENTITY | READABILITY | COMBAT FLOW | ENV DETAIL | LIGHTING | MATERIAL QUALITY | PERFORMANCE | BR AUTHENTICITY |
|---|---|---|---|---|---|---|---|
| 3 | 4* | 4 | 2* | 2* | 2* | 5* | 1 |

\* inferida do código — pendente de captura. BR AUTHENTICITY baixa por decisão de design,
não por falha — mas a nota é do que está na tela.

**3 piores problemas:**
1. Identidade brasileira zero (decisão aceita, mas registrada: se um dia quiserem subir
   essa nota, é azulejo de clube, flâmula de time, aviso de "proibido correr").
2. Materiais canvas chapados — claraboia e faixa naval salvam, o resto é plano.
3. Estado visual atual não verificado (pendente de captura).

---

## 8. loja_h — Loja H (Estacionamento)

**Sem captura nesta rodada — notas visuais inferidas do código, pendentes de captura.**

- **Theme:** sátira da varejista de fachada greco-romana: estacionamento gigante (76×116,
  40+ vagas) + loja com gôndolas, caixas, mezanino-sniper e Estátua da Liberdade.
- **Geographic identity:** Brasil suburbano de rodovia — a cara da Havan sem citar o nome.
- **Visual landmarks:** a Estátua da Liberdade (hero prop), a fachada com frontão e
  colunata, o mar de carros. Fortes no papel.
- **Playable routes:** estacionamento (vagas como cover) → portas da loja → corredores
  de gôndola + mezanino/depósito. Rotas laterais novas abrigam as bandeiras LOJA O/L.
- **Choke points:** as portas da loja e a escada do mezanino.
- **Verticality:** mezanino com função de sniper real (o respawn B mora lá em cima, por
  pedido literal do dono).
- **Sightlines:** longas no estacionamento, médias na loja; histórico de linha de tiro
  spawn→spawn de 103 m documentado e tapado com anteparo medido (map_havan.js:1785-1795).
- **Spawn zones:** B no depósito do mezanino, E no fundo do estacionamento atrás de
  barreira de carros. 4 bandeiras: PÁTIO O/L + LOJA O/L (uma de cada lado, pedido do
  dono; meio fica como trânsito).
- **Empty spaces (inferido):** 13 m de loja que "eram vazio de cenário" ganharam função
  com as bandeiras laterais — pendente de captura confirmar o preenchimento.
- **Repetitive structures (inferido):** gôndolas e vagas repetem por natureza; quebradas
  por 12 modelos de carro sortidos por partida e mobília de loja variada.
- **Lighting / clipping / traversal:** pendente de captura. Histórico de colisão fina
  resolvida (pegada de ônibus, saia de tenda, coluna de waypoints entre carros).
- **Prop density (código):** a mais pesada do elenco: 34 modelos de carro (12 por
  partida, ~200 k triângulos de pátio depois da otimização), gôndolas cheias, painel de
  TVs, manequins, caixas de cobrança.
- **Material repetition (inferido):** asfalto com óleo e rachadura, azul-Havan com
  sujeira, vidro, aço — variedade declarada no cabeçalho; pendente de captura.
- **Gameplay readability (inferido):** eixo estacionamento↔loja claro; bandeiras nos
  cantos dão função aos flancos.

| IDENTITY | READABILITY | COMBAT FLOW | ENV DETAIL | LIGHTING | MATERIAL QUALITY | PERFORMANCE | BR AUTHENTICITY |
|---|---|---|---|---|---|---|---|
| 4 | 3* | 3 | 3* | 2* | 3* | 3* | 4 |

\* inferida do código — pendente de captura.

**3 piores problemas (provisórios):**
1. Não verificado visualmente — o mapa mais pesado em props é o que mais precisa de
   captura para medir poluição vs. leitura (o destino do Piscinão é o aviso).
2. Risco de "mar de carros" monocromático no estacionamento se os 12 modelos da partida
   puxarem o mesmo tom.
3. Custo de GPU por material de carro (histórico: 13,7 k tris/12 materiais num sedã) —
   performance pendente de profiling, não só de código.

---

## 9. ferro_velho — Ferro Velho do Zé

**Sem captura nesta rodada — notas visuais inferidas do código, pendentes de captura.**

- **Theme:** ferro-velho labirinto: muros de carros empilhados (~5,6 m no beco oeste,
  o "cânion" da imagem-conceito do dono), fileiras de carros prensados, guindaste,
  prensa, escritório.
- **Geographic identity:** fundo de quintal industrial BR — tema raro e bem escolhido.
- **Visual landmarks:** o guindaste, a prensa, a placa suspensa na boca do beco oeste,
  o galpão. Hero props industriais por desenho.
- **Playable routes:** pátio-labirinto com corredores ≥5 m + beco oeste em cânion
  contínuo de z=+33 a −25 (kill-switch `?beco=0` preserva o layout antigo).
- **Choke points:** a boca do beco-cânion e os vãos entre muros de carros.
- **Verticality:** baixa; muros altos mas não escaláveis.
- **Sightlines:** curtas por desenho (labirinto); snipers nos cantos (awp/m400 posicionadas
  nos extremos).
- **Spawn zones:** E no portão (sul, dentro do vão do portão de correr — medido),
  B ao lado do galpão. Bandeiras CENTRO / BECO OESTE / PÁTIO LESTE / GALPÃO (altura de
  triângulo mínima 6,8 m depois de corrigir colinearidade medida de 0,04 m).
- **Empty spaces (inferido):** miolo das rotas recebeu scrapSpots e poças de óleo com
  specular — pendente de captura.
- **Repetitive structures (inferido):** muros de carros instanciados — a quebra depende
  da variação de lataria; pendente de captura.
- **Lighting (inferido):** o único mapa com god rays e poeira em suspensão declarados +
  névoa aérea; candidato a melhor luz do elenco. Pendente de captura.
- **Clipping / traversal:** histórico de covers medidos; nada aberto no código.
- **Prop density (código):** pilhas/máquinas Mint estilizadas (substituíram photoscans que
  "destoavam e pesavam") + wrecks unitários + miúdos (dumpster, jersey, sandbags) + mato
  invasor com kill-switch. MESO denso, MICRO com óleo/rachadura/sucata.
- **Material repetition (inferido):** canvas noise textures com manchas, rachaduras,
  óleo, pedras (noiseTex procedural com seed) + zinco velho/escuro — variedade declarada.
- **Gameplay readability (inferido):** labirinto pede landmarks fortes; o guindaste e a
  placa são a resposta. Pendente de captura.

| IDENTITY | READABILITY | COMBAT FLOW | ENV DETAIL | LIGHTING | MATERIAL QUALITY | PERFORMANCE | BR AUTHENTICITY |
|---|---|---|---|---|---|---|---|
| 4 | 3* | 3 | 3* | 3* | 3* | 3* | 4 |

\* inferida do código — pendente de captura.

**3 piores problemas (provisórios):**
1. Não verificado: o labirinto é o desenho com maior risco de desorientação do elenco e
   não há captura para medir.
2. Repetição de lataria: muros instanciados podem ler como "parede de um carro só" se a
   variação por instância for fraca.
3. Cânion do beco oeste é novo (08/2026) e não tem captura publicada.

---

## 10. praca_poderes — Praça dos Três Poderes

**Sem captura nesta rodada — notas visuais inferidas do código, pendentes de captura.**

- **Theme:** Brasília monumental em estado de sítio: Congresso, Catedral, Ministérios
  (GLBs Mint reais, coliderados pelo Box3), esplanada, espelho d'água, ônibus queimado,
  barreiras, tapumes.
- **Geographic identity:** inconfundível — é o único mapa onde o teste de aceite do
  dossiê (§37) provavelmente passa no primeiro frame.
- **Visual landmarks:** Congresso (norte), Catedral (sul), ministérios sobre pilotis,
  espelho d'água, ônibus queimado no miolo. Os mais fortes do elenco.
- **Playable routes:** eixo monumental (~150 m entre spawns, recuados para z=±62) +
  flancos sob os pilotis (abertos de propósito, bounds estendidos).
- **Choke points:** as passagens entre blocos de ministério e o parapeito do espelho
  d'água.
- **Verticality:** baixa; pilotis dão variação de cobertura, não de cota.
- **Sightlines:** monumentais — é o tema; o dossiê (§11) avisa: "não deixar praças de
  100 m sem cover", e o código responde com barreiras, ônibus e tapumes. Pendente de
  captura medir se basta.
- **Spawn zones:** B na Catedral (sul), E no Congresso (norte). Bandeiras CONGRESSO /
  ÔNIBUS / CATEDRAL.
- **Empty spaces (inferido):** o risco estrutural do mapa — esplanada é vazio por
  definição; o preenchimento com "objetos de estado de conflito" existe no código,
  pendente de captura.
- **Repetitive structures (inferido):** fileiras de ministérios idênticos — a quebra por
  pintura/decal declarada (protesto: lambe, stencil, cartaz — escolha autoral correta,
  "tag de bairro em Brasília leria como outro mapa", map_brasilia.js:1795).
- **Lighting / clipping / traversal:** pendente de captura. Histórico fino de colisão
  (pegada do ônibus a −18,7° do eixo da caixa, medido por PCA).
- **Prop density (código):** barreiras, tendas, drinkstand, tapumes, ônibus; MICRO =
  grafite de protesto em 4 bandas. Esparso por natureza do tema.
- **Material repetition (inferido):** a paleta MAIS variada do elenco no código: mármore,
  concreto branco, granito preto, concreto cru, aço, corten, vidro fumê, tinta gasta,
  calçada, mato, ipê. Pendente de captura confirmar na tela.
- **Gameplay readability (inferido):** eixo óbvio; flancos de piloti são a incógnita.

| IDENTITY | READABILITY | COMBAT FLOW | ENV DETAIL | LIGHTING | MATERIAL QUALITY | PERFORMANCE | BR AUTHENTICITY |
|---|---|---|---|---|---|---|---|
| 4 | 3* | 3 | 2* | 2* | 3* | 3* | 5 |

\* inferida do código — pendente de captura.

**3 piores problemas (provisórios):**
1. Vazio monumental: se as barreiras/tapumes não segurarem o miolo, é o mapa com o maior
   delta conceito↔tela do elenco.
2. Ministérios repetidos: a quebra depende inteiramente do grafite de protesto e dos
   estados de manutenção (§12 do dossiê).
3. Estado visual não verificado (o grafite já nasceu no ar uma vez: 16 peças no vão dos
   pilotis, reprovadas pela régua — o vício de origem deste mapa é decal sem malha).

---

## Tabela comparativa

Notas 1–5. `*` = inferida do código, pendente de captura.

| Mapa | IDENTITY | READABILITY | COMBAT FLOW | ENV DETAIL | LIGHTING | MATERIAL | PERFORMANCE | BR AUTH. | Média |
|---|---|---|---|---|---|---|---|---|---|
| corrego    | 4 | 3 | 3 | 3 | 2 | 2 | 3* | 4 | 3,00 |
| quebrada      | 4 | 3* | 3 | 3* | 2* | 3* | 3* | 4 | 3,00 (parcial) |
| ferro_velho   | 4 | 3* | 3 | 3* | 3* | 3* | 3* | 4 | 3,13 (parcial) |
| loja_h        | 4 | 3* | 3 | 3* | 2* | 3* | 3* | 4 | 3,00 (parcial) |
| praca_poderes | 4 | 3* | 3 | 2* | 2* | 3* | 3* | 5 | 3,00 (parcial) |
| escadao    | 3 | 3 | 3 | 2 | 2 | 2 | 4* | 3 | 2,75 |
| mansao     | 3 | 3 | 3 | 2 | 2 | 2 | 4* | 2 | 2,63 |
| piscina_treta | 3 | 4* | 4 | 2* | 2* | 2* | 5* | 1 | 2,88 (parcial) |
| campomorro | 3 | 2 | 3 | 2 | 2 | 1 | 4* | 3 | 2,50 |
| lajes      | 3 | 2 | 4 | 1 | 2 | 1 | 4* | 2 | 2,38 |

Leitura honesta do conjunto: **nenhum mapa passa de 2 em MATERIAL QUALITY entre os
capturados**, e LIGHTING é 2 em todos os cinco. O gargalo do projeto não é layout nem
conceito — é pele (textura/material/envelhecimento) e luz. O dossiê tem razão em
priorizar as duas coisas antes de qualquer prop novo.

## Prioridade de calibração

**Passo 0 (antes de qualquer nota virar plano): capturar os 5 mapas pendentes**
(`quebrada`, `piscina_treta`, `loja_h`, `ferro_velho`, `praca_poderes`). Metade do elenco
está com nota inferida; dois deles (`quebrada`, `praca_poderes`) têm histórico documentado
de decal nascendo no ar — exatamente a classe de defeito que só captura pega.

Ordem de ataque (o dossiê manda fazer UM mapa gold standard antes de propagar):

1. **lajes — o piloto.** Pior média dos capturados (2,38), pior ENV DETAIL (1) e pior
   MATERIAL (1), e é o mapa onde a tese de design (duas camadas) já funciona — o ganho é
   quase todo de pele: material por prédio, caixas d'água/antenas/varais de verdade nas
   lajes (§19), calçada e fiação nos becos (§7), mato (§5), céu e distant world (§24/§29).
   Arquivo pequeno (726 linhas), contido, e o plano da casa já o escolheu como piloto.
2. **campomorro.** Monocromia de terra é o defeito mais barato de consertar com maior
   efeito: separar materiais (muro ≠ chão ≠ galpão), MICRO no campo (mato, lixo, mancha),
   e quebrar a colagem repetida do muro perimetral. Segunda pior média (2,50).
3. **mansao.** O problema é esterilidade, não estrutura: storytelling de interior
   (§14), transição de luz interna (§20), e o horizonte do oceano. Terceira pior (2,63).
4. **escadao.** Está perto: precisa de envelhecimento de superfície (§18), variação de
   fachada (§8), cabos com catenária e caça a props flutuantes. Quarta (2,75).
5. **corrego.** A melhor base (3,00): o trabalho é variação arquitetônica da favela
   (§8/§9), luz do canal e água. Risco de regressão maior — mexer depois de ter o gold
   standard pronto.
6. **Os cinco sem captura, na ordem de risco:** `quebrada` (linear + bug de decal no
   histórico), `praca_poderes` (vazio monumental), `loja_h` (poluição × leitura),
   `ferro_velho` (labirinto), `piscina_treta` (aprovada pelo dono; só registrar o
   baseline).

Critério da ordenação: média do audit × custo da correção × risco de regressão. Lajes
ganha nas três: é o pior, é o mais barato (arquivo pequeno, defeito concentrado na
camada das lajes) e o conserto não toca em gameplay (a planta e o A* ficam).
