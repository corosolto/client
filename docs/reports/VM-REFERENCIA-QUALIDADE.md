# Referência de qualidade de viewmodel — CS2 / CS 1.6 / Valorant (09/09)

Pesquisa externa (WebSearch/WebFetch, setembro de 2026) para transformar "parece AAA" em
critério mensurável, cruzado com o instrumento que este repositório já tem:
`tools/viewmodels/prep/vm-arsenal-frames.mjs` mede por captura, no jogo real, vértices de
mão em quadro, vértices de arma em quadro, contato mínimo mão↔arma em px, diagonal aparente
da arma em px e o espaçamento da amostra (mediana da distância ao vizinho mais próximo, usada
para não confundir "mão solta" com "amostra rala" — ver comentário em torno da linha 121 do
arquivo). `tools/eval/vm-arsenal-check.mjs` já usa isso com piso/teto calibrados em 07/09.

**Regra de proveniência usada abaixo, em cada afirmação:**
- **[medido]** — número obtido rodando o instrumento deste repositório.
- **[doc. dev]** — publicado ou confirmado por quem faz o jogo (patch note, blog oficial).
- **[comunidade]** — datamining, guia de configuração ou wiki agregando dados extraídos do
  jogo; não é Valve/Riot falando, mas é sistemático (várias fontes convergem).
- **[mundo real]** — técnica de manuseio de arma real (empunhadura, ciclo de ferrolho), não é
  documentação de jogo nenhum — é a referência que a direção de arte de FPS AAA usa como
  ponto de partida.
- **[NÃO ACHEI]** — busquei e não encontrei; registrado como resultado negativo, não omitido.

---

## 1. Enquadramento: FOV, posição do grip, ocupação de tela, ângulo do cano

**FOV do viewmodel vs. FOV do mundo (CS2).** `viewmodel_fov` só afeta o tamanho/distância
aparente da arma, não o FOV da câmera do mundo nem sensibilidade/recoil — default **60**,
alcance **52–68** por leitura direta da Total CS ([totalcsgo.com/commands/viewmodelfov](https://totalcsgo.com/commands/viewmodelfov))
**[comunidade]**. Outras fontes agregadoras relatam o piso como **54** em vez de 52
([setup.gg](https://www.setup.gg/game/cs2/fov-viewmodel/), [community.skin.club](https://community.skin.club/en/articles/fov-and-viewmodel-commands-cs2))
**[comunidade, discordância de 2 unidades entre fontes — não é a Valve publicando o número,
é guia de configuração; sinalizo a divergência em vez de escolher uma]**. Não achei o valor
em documentação oficial da Valve (o `viewmodel_fov` não está na wiki de código-fonte pública
da mesma forma que os cvars mais antigos) — **[NÃO ACHEI fonte primária Valve]**.

**Offsets de posição (CS:GO → CS2).** `viewmodel_offset_x/y/z` continuam existindo em CS2
(x = esquerda/direita, y = perto/longe da câmera, z = cima/baixo), com `viewmodel_presetpos 1|2|3`
mapeando para os presets **Desktop / Sofá / Clássico**
([hotspawn.com/counter-strike/guide/cs2-viewmodel-commands](https://www.hotspawn.com/counter-strike/guide/cs2-viewmodel-commands),
[riskyskins.com/blog/cs2-viewmodel-commands](https://riskyskins.com/blog/cs2-viewmodel-commands/))
**[comunidade]**. Um guia específico de CS:GO com faixa numérica (`viewmodel_offset_z -2`,
`offset_x 2.5`, `offset_y -2`) foi marcado pela própria comunidade como **incompatível com
CS2** ([guia Steam id 2071748942](https://steamcommunity.com/sharedfiles/filedetails/?id=2071748942))
— ou seja, o valor numérico específico não atravessa a versão do jogo, só o eixo/semântica.

**CS 1.6.** Não existe comando de FOV do viewmodel separado do mundo; o FOV do viewmodel é
fixo por modelo de arma, e `default_fov` foi desabilitado nos servidores competitivos
**[comunidade — várias guias convergem, sem wiki primária acessível: a tentativa de ler
`counterstrike.fandom.com/wiki/AWP` diretamente devolveu HTTP 402 nesta sessão]**. FOV de
mundo default = 90 é o número universalmente citado nos guias de configuração de 1.6, mas
não achei a especificação original da Valve — **[comunidade, NÃO ACHEI fonte primária]**.

**Valorant.** FOV fixo em **103°** (horizontal), não ajustável — decisão deliberada de design
para manter condição competitiva igual entre jogadores
([turbosmurfs.gg](https://turbosmurfs.gg/article/valorant-fov-what-is-it-and-how-to-change), [esportsdriven.com](https://esportsdriven.com/valorant/guides/147/valorant-fov-explained-and-best-settings))
**[comunidade, mas a intenção de design — "FOV fixo para não dar vantagem visual" — é
consistente o bastante entre fontes para tratar como convenção estabelecida]**. Um
levantamento técnico da comunidade lista o FOV mirando por arma:
padrão **103 HFOV / 70,53 VFOV**; Vandal/Phantom em ADS (zoom 1,25×) **82,4 HFOV / 52,43 VFOV**;
Operator em ADS (zoom 5,00×) **20,6 HFOV / 11,6 VFOV**
([post no X com o breakdown](https://x.com/luckeRRR_/status/1570364694870867970)) **[comunidade/datamined, não é a Riot publicando]**.

**Posição do grip na tela / quadrante.** A convenção herdada de Counter-Strike é a arma no
**quadrante inferior-direito da tela**, deixando o centro livre — a justificativa citada nos
próprios guias é que a arma/mão em primeiro plano tapa alvos se ficar central
([tradeit.gg/blog/how-to-change-your-viewmodel-in-cs2](https://tradeit.gg/blog/how-to-change-your-viewmodel-in-cs2/),
discussão em [resetera.com](https://www.resetera.com/threads/first-person-shooters-and-where-your-pistol-is-held-on-the-screen.1346569/))
**[comunidade — é consenso de design, não uma especificação numérica]**. **Não achei nenhuma
fonte — dev ou comunidade — que dê uma fração de altura/largura de tela documentada** para
"quanto a arma ocupa" em idle ou em ADS, em nenhum dos três jogos. **[NÃO ACHEI]** Isso é
resultado negativo real: a régua interna de fração de tela (item 6 da tabela final) não tem
correspondente externo publicado — o limiar ali só pode vir do próprio jogo medido.

**Ângulo do cano.** **Não achei número de ângulo documentado** em nenhuma fonte (dev ou
comunidade) para CS2, CS 1.6 ou Valorant. **[NÃO ACHEI]** O que existe é a convenção
qualitativa, repetida em discussões de configuração de viewmodel: como a arma fica deslocada
do centro da tela mas o disparo é hitscan a partir do centro (crosshair), o cano precisa
apontar visualmente para o ponto de convergência do crosshair — senão o jogador vê a arma
"mirando para o lado". Não tenho fonte numérica para isso; é um proxy geométrico (vetor
boca→centro de tela vs. direção real do cano), não um ângulo fixo em graus.

---

## 2. Pose e mão de apoio (a mão que não é a que atira)

Aqui a pesquisa de jogo (CS2/Valorant não documentam pose de mão publicamente) cede lugar à
referência de manuseio real de arma, que é de onde a direção de arte de FPS AAA parte —
sinalizado como **[mundo real]** em vez de fingir que é specagem de jogo.

- **Rifle/carbine — "C-clamp".** Mão de apoio correndo para a frente no handguard, polegar
  envolvendo por cima, puxando o rifle para trás contra o ombro; populariza por Chris Costa e
  Travis Haley (*The Art of the Tactical Carbine*). A vantagem citada é justamente a que
  interessa para leitura visual: redireciona o recuo percebido em vez de deixar o cano subir,
  e acelera a transição entre alvos porque a arma "aponta onde a mão empurra"
  ([blog.primaryarms.com](https://blog.primaryarms.com/guide/what-is-the-c-clamp-grip-on-an-ar15/),
  [swatmag.com](https://www.swatmag.com/article/c-clamp-grip-successful-c-clamping/)) **[mundo real]**.
  Tradução para o rig: a mão de apoio ancora no handguard/foregrip, próxima da boca, não no
  meio do cano nem atrás do pente.
- **Pistola — "thumbs-forward".** As duas mãos com os polegares apontando para a frente,
  lado a lado (não empilhados), a mão de apoio preenchendo o vão do grip com a base da palma
  o mais alto possível e o polegar encostado na correvoiga sem entrar no trajeto dela
  ([shootingillustrated.com](https://www.shootingillustrated.com/content/thumbs-forward-handgun-grip/),
  [americanshootingjournal.com](https://americanshootingjournal.com/thumbs-er-forward/)) **[mundo real]**.
  É a empunhadura padrão de referência em qualquer FPS que mostra as duas mãos na pistola —
  se a mão de apoio estiver atrás do grip (estilo "cup and saucer" antigo) em vez de ao lado,
  é uma escolha datada, não um erro técnico, mas destoa do "look" CS2/Valorant contemporâneo.
- **Shotgun.** A mão de apoio precisa estar no fore-end/bomba — é requisito mecânico da arma
  real (é o que cicla a ação), não escolha estética; qualquer pose que não mostre a mão no
  fore-end quebra a leitura de "essa é uma pump-action" **[mundo real, conhecimento geral de
  manuseio de arma, sem necessidade de fonte de tiro tático específica]**.
- **Sniper bolt-action / SMG.** Não achei uma fonte de referência tática específica dedicada
  (a pesquisa por handguard/off-hand nessas classes não retornou artigo dedicado) — o que dá
  para afirmar com confiança do conhecimento geral de manuseio: bolt-action apoia a mão fraca
  na coronha/near o bipé, e a mão forte solta o grip para acionar o ferrolho entre tiros; SMG
  varia por modelo (punho vertical, magwell ou handguard curto conforme a arma real que a
  família está referenciando). **[mundo real, sem fonte dedicada — marcado como tal]**.
- **"Mão solta" (o defeito visual).** Não existe um artigo com esse nome exato cunhado por
  animador de FPS — o que a pesquisa encontrou foi a moldura técnica ao redor do problema:
  tutoriais de rig de braços em primeira pessoa (ex.: 80lv, *Complete FPS Arms Rig and
  Animation Tutorial*) descrevem anexar a mão de apoio ao bone/IK-target da própria arma
  exatamente para eliminar esse sintoma
  ([80.lv/articles/complete-fps-arms-rig-and-animation-tutorial-from-3ds-max-to-ue4](https://80.lv/articles/complete-fps-arms-rig-and-animation-tutorial-from-3ds-max-to-ue4)) **[comunidade
  de rigging, síntese minha a partir da fonte, não citação literal]**. Isso mapeia
  diretamente para a régua que este repo já tem: **mão solta = contato mão↔arma alto em px**
  (e, mais preciso, alto em número de espaçamentos da amostra — ver seção 6). O erro clássico
  citado nesses materiais e em fóruns de rig de FPS (Medium, artigos de IK) é a mão anexada
  ao bone errado — segue a câmera/hand em vez de seguir a arma, ou vice-versa quando a arma
  troca — o que product visualmente clipping ou distância crescente durante o sway
  **[comunidade, síntese a partir de múltiplos artigos técnicos de rig, não uma única fonte
  com essa taxonomia exata]**.

---

## 3. Timings: draw/equip, recarga tática vs. vazia, inspect, "smooth" vs. robótico

**Equip/draw.**
- Valorant: Vandal e Phantom **1,0 s** para equipar; Bandit (SMG) **0,75 s**; Sheriff **1,0 s**
  ([twinfinite.net](https://twinfinite.net/pc/complete-valorant-weapon-stats-list/),
  [valorant.fandom.com/wiki/Vandal](https://valorant.fandom.com/wiki/Vandal)) **[comunidade —
  wikis agregando dados extraídos do jogo, convergem entre si, não é post oficial da Riot]**.
- CS2: fontes de guia convergem em **AK-47 draw ≈ 1,0 s**
  ([csgo-guides.com/weapons/ak47](https://csgo-guides.com/weapons/ak47/)) **[comunidade]**; não
  achei uma tabela oficial da Valve com draw time por arma — **[NÃO ACHEI fonte primária]**.

**Recarga.**
- CS2: AK-47 recarga **≈ 2,43–2,5 s** (fontes discordam na segunda casa decimal)
  ([csgo-guides.com](https://csgo-guides.com/weapons/ak47/), [cslabez.com](https://cslabez.com/weapon-guide-the-ak-47/)) **[comunidade]**.
- **Mudança de mecânica documentada pelo dev**: em 2026 a Valve mudou a recarga do CS2 para
  **descartar toda a munição que sobrava no pente** — não existe mais "completar o pente"
  como no CS:GO clássico; a recarga passou a ser sempre pente cheio, com uma única animação
  (não há uma variante "tática" mais curta vs. "vazia" mais longa para a maioria das armas)
  ([dexerto.com](https://www.dexerto.com/counter-strike-2/counter-strike-2-just-completely-changed-how-reloading-works-3337377/)) **[doc. dev — é
  mudança de mecânica coberta como patch, não estimativa]**. A exceção são as **shotguns**
  (Nova, XM1014): recarregam cartucho por cartucho e a recarga é **interruptível** — atirar
  no meio da recarga cancela e dispara o que já foi carregado — o que cria de fato uma
  duração variável (o equivalente funcional a "tática vs. vazia" nessa classe, mas por número
  de cartuchos, não por dois estados discretos)
  ([cs2central.gg/blog/cs2-reload-update-explained](https://cs2central.gg/blog/cs2-reload-update-explained/),
  [counterstrike.fandom.com/wiki/Nova](https://counterstrike.fandom.com/wiki/Nova)) **[doc.
  dev/comunidade confirmando o mecanismo]**.
- Valorant: Vandal/Phantom **2,5 s**; Bandit **1,5 s**; Sheriff **2,25 s**
  ([hotspawn](https://www.hotspawn.com/valorant/guide/valorant-all-weapons), [twinfinite.net](https://twinfinite.net/pc/complete-valorant-weapon-stats-list/)) **[comunidade]**.
  Não encontrei evidência de recarga tática (pente parcial, mais rápida) distinta de recarga
  vazia em Valorant — a recarga parece ser sempre para pente cheio com duração fixa por arma.
  **[NÃO ACHEI confirmação afirmativa nem negativa oficial — tratando como resultado negativo:
  não há fonte dizendo que existe a distinção]**.

**Inspect.** **Não achei duração documentada** (dev ou comunidade) para a animação de
inspecionar a arma em CS2 nem em Valorant — as páginas encontradas explicam *como* inspecionar,
nenhuma cronometra quanto dura. **[NÃO ACHEI]**

**O que faz parecer "smooth" vs. robótico.** A literatura de timing de animação aplicada a
jogos descreve o padrão como **chegar → ultrapassar (overshoot) → assentar (settle)**, com
cada estágio subsequente reduzindo a amplitude e encurtando a duração em relação ao anterior
— "overshoot prova massa, settle expressa personalidade"
([sunstrikestudios.com/en/blog/timing_in_animation](https://sunstrikestudios.com/en/blog/timing_in_animation/)) **[comunidade
de animação de jogos, é ensinamento de ofício, não specagem de nenhum dos três jogos
pesquisados]**. Sway procedural (a respiração/micro-ajuste do cano em idle) é tipicamente uma
onda senoidal aplicada à rotação do bone da arma, não uma curva de keyframe — é isso que
sustenta a "vida" contínua sem repetir um ciclo perceptível. O tell de "robótico" citado
implicitamente pelo contraste dessas fontes é: interpolação linear sem ease, ausência de
overshoot, e a mesma duração/curva independentemente do estado (arma leve e pesada
transicionando igual) **[comunidade, síntese a partir da mesma fonte de timing — não é uma
lista de erros publicada como tal]**.

---

## 4. CS 1.6 e CS2 no ADS/luneta: esconde ou desloca?

**Convenção: some, não desloca.** Nas snipers de zoom alto (AWP em 1.6 e em CS2), o
viewmodel inteiro é **escondido** e substituído por um overlay de tela cheia (máscara preta
com retícula) enquanto mirado — não é um deslocamento de câmera nem um ADS com mira de ferro
visível. Isso é a leitura convergente de várias fontes de configuração/discussão de jogo, mas
**a tentativa de ler a página primária (`counterstrike.fandom.com/wiki/AWP`) retornou HTTP
402 nesta sessão — não consegui confirmar na fonte primária, só por triangulação de buscas**
**[comunidade, com ressalva de fonte primária não lida diretamente]**.

**Valores de zoom em CS 1.6, AWP:** FOV sem mira **90**; primeiro zoom (botão direito)
**FOV 40**; segundo zoom **FOV ≈ 10** (alguns agregadores mostram 15, atribuído a diferença de
calculadora/arredondamento)
([discussão em mouse-sensitivity.com](https://www.mouse-sensitivity.com/forums/topic/7691-counter-strike-aims/),
[teamfortress.tv sobre zoom_sensitivity_ratio](https://www.teamfortress.tv/35467/on-the-correct-value-of-zoom-sensitivity-ratio)) **[comunidade,
com divergência 10 vs. 15 explicitamente sinalizada, não escondida]**.

**CS2:** o FOV mirado (scoped) é fixo e não pode ser mudado por console — ao contrário do
`viewmodel_fov`, que só afeta a arma sem mira
([setup.gg](https://www.setup.gg/game/cs2/fov-viewmodel/)) **[comunidade]**. A convenção de
esconder o viewmodel ao mirar com sniper é herdada de 1.6/GO; **não verifiquei** se as
"lunetas fracas" (AUG/SG553, zoom 3× sem trocar de arma-classe) seguem a mesma regra de
esconder totalmente o viewmodel ou se mantêm parte da arma visível — a busca não retornou
uma fonte que resolvesse isso com confiança, então não estou afirmando nada sobre essas duas
armas especificamente. **[NÃO ACHEI, sinalizado em vez de assumido]**

**Valorant, para contraste.** O Operator (a sniper) em zoom 5× (**20,6 HFOV / 11,6 VFOV**)
segue o mesmo padrão — esconde a arma atrás do overlay da luneta
([post técnico já citado na seção 1](https://x.com/luckeRRR_/status/1570364694870867970)) **[comunidade/datamined]**.
Para as armas SEM luneta (Vandal, Phantom etc.), o "ADS" de Valorant não é mira de ferro
clássica: o zoom é discreto (1,25× no caso citado), a arma quase não se desloca na tela, e
não há elevação da arma até o olho — é mais "acalmar e aproximar" do que "levantar a mira"
**[comunidade, observação geral, sem número de deslocamento em pixels documentado — outro
NÃO ACHEI para a fração exata]**.

**Convergência com o que este repo já decidiu.** `tools/eval/vm-arsenal-check.mjs` já declara
essa mesma exceção — `LUNETA = new Set(['sniper', 'bolt'])` esconde o viewmodel no ADS e o
comentário do arquivo registra que "awp/ads mede 0 com ou sem defeito", então a cláusula de
"arma não desenha" é suspensa ali. A pesquisa externa confirma que isso não é uma lacuna do
instrumento — é a convenção do gênero, medida corretamente como zero esperado.

---

## 5. Fontes legítimas de asset — o que pode entrar num jogo comercial

| fonte | licença que permite comercial | o que NÃO pode entrar | fonte da afirmação |
|---|---|---|---|
| **Poly Haven** | Tudo é **CC0** (domínio público) — uso comercial livre, sem atribuição obrigatória. Única proibição: reivindicar autoria ou re-licenciar. | Nada do catálogo em si é vedado — a única pegadinha é a **API**: usar a API da Poly Haven para lucro comercial direto (revender o serviço, hospedar de novo) é proibido pelos termos da API, separado da licença do asset. | [polyhaven.com/license](https://polyhaven.com/license), [Public-API ToS.md](https://github.com/Poly-Haven/Public-API/blob/master/ToS.md) |
| **Sketchfab** | **CC0 e CC-BY** liberam uso comercial (CC-BY exige creditar o autor); a licença **"Standard"** (ex-Store, hoje maioria migrada para a Fab) também libera uso comercial num produto acabado, mas proíbe redistribuir o asset extraível/isolado. | **CC-BY-NC, CC-BY-NC-SA, CC-BY-ND e CC-BY-SA** não servem para um jogo comercial fechado (a NC proíbe comercial direto; a SA obrigaria o jogo a herdar a mesma licença; a ND proíbe modificar, o que inviabiliza reexportar/otimizar). A licença **"Editorial"** proíbe explicitamente qualquer uso comercial ou promocional. | [sketchfab.com/licenses](https://sketchfab.com/licenses) (lido diretamente) |
| **Fab (Epic)** | Assets com **licença Creative Commons livre** ou com a **Fab Standard License** — a Standard License por padrão permite uso comercial em produto publicado; existem dois patamares de preço (Personal / Professional, o Professional exigido acima de US$100 mil de receita bruta nos últimos 12 meses), mas os dois patamares dão o mesmo escopo de direitos. | Cada listagem pode ter restrição própria (é um marketplace com vários vendedores) — **sempre ler a licença da listagem específica**, não assumir pelo selo genérico. | [dev.epicgames.com/documentation/fab/licenses-and-pricing-in-fab](https://dev.epicgames.com/documentation/fab/licenses-and-pricing-in-fab), [fab.com/eula](https://www.fab.com/eula?lang=en), [discussão no fórum Epic](https://forums.unrealengine.com/t/fab-license-terms-standard-license/2094243) |
| **GameBanana** | **Nada, por padrão.** Não consegui ler o texto literal do ToS (a página só devolveu a navegação, sem o corpo do texto — resultado negativo registrado, não inventado). O que dá para afirmar com fonte: o site opera sob notificação-e-remoção de DMCA (não pré-valida se o upload é original ou extraído), e sofreu ondas de takedown justamente por conteúdo extraído de jogos comerciais sem autorização do detentor do direito (ex.: onda de DMCAs da Nintendo em junho de 2024). | **Modelo/textura/animação "ripada" de qualquer jogo comercial não é asset licenciado — é infração de direito autoral hospedada até alguém notificar.** Mesmo quando o uploader chama de "meu mod", isso não concede a ele o direito de sublicenciar a arte-base extraída. Recomendação para este projeto: **não usar GameBanana como fonte de asset para viewmodel/arma que vai para o jogo publicado**, ponto. | [nintendolife.com — cobertura do DMCA](https://www.nintendolife.com/news/2024/06/nintendo-issues-multiple-dmcas-on-the-modding-site-gamebanana), página de política existente em [gamebanana.com/wikis/677](https://gamebanana.com/wikis/677) (não lida por completo nesta sessão) |

**Regra prática para o pipeline do CS Brasil:** Poly Haven é seguro por padrão para
HDRI/textura/prop CC0. Sketchfab e Fab exigem checar o selo de licença **por modelo**, não por
site — salvar/printar a licença no momento do download, porque marketplace muda selo com o
tempo (o próprio fechamento da loja paga da Sketchfab em 2024, migrando para a Fab, é exemplo
disso). GameBanana fica de fora do pipeline comercial inteiramente.

---

## 6. Tabela final — critério → régua já existente → limiar sugerido → procedência

| critério | como medir com a régua que já temos | limiar sugerido | procedência do limiar |
|---|---|---|---|
| Mão em quadro (idle/ADS estável, fora de luneta) | `maoEmQuadro` em `vm-arsenal-frames.mjs` (contagem sobre ~800 pontos amostrados), consumido por `PISO_MAO` em `vm-arsenal-check.mjs` | ≥ 100 no caminho autorado, ≥ 40 no legado | **[medido]** — recalibrado na rodada de 07–08/09 com as famílias saudáveis (`mp5, pistol, m4, ak, lmg` autoradas; 9 armas no legado); quebrado mede 0 nos dois caminhos |
| Arma em quadro (fora de luneta) | `armaEmQuadro` na mesma coleta | > 0 sempre, exceto famílias `sniper`/`bolt` em ADS (luneta tela cheia) | **[medido + convenção do gênero]** — a exceção do ADS bate com a convenção CS1.6/CS2/Valorant Operator (seção 4): "some" é esperado ali, não bug |
| Contato mão↔arma, fora do ADS | `contato_px` → `TETO_CONTATO` em `vm-arsenal-check.mjs` | ≤ 10 px | **[medido]** — saudáveis medem 0–1 px fora do ADS; 10 px é folga larga sobre isso, não número importado de fora (a pesquisa externa não achou nenhum "X px de tolerância" documentado em jogo nenhum — seção 1, resultado negativo) |
| Contato mão↔arma, dentro do ADS | mesmo `contato_px`, mas **medido e relatado, não reprovado** (comentário já existente no arquivo) | sem teto — registrar o valor | **[medido]** — o próprio arquivo documenta que o contato sobe sistematicamente no ADS em todas as armas (ak 14, pistol 25, shotgun 38 em 16:9) e isso não foi investigado como causa; reprovar sem entender vira vermelho que se aprende a ignorar |
| "Mão solta" normalizada pela densidade da malha | `espacamento_px` e `contato_em_espacamentos`, já calculados em `vm-arsenal-frames.mjs` mas **não usados como porta** em `vm-arsenal-check.mjs` hoje | sugestão: tratar contato > ~3–5 espaçamentos como "solta" mesmo se estiver dentro do teto em px | **[estimativa própria, não vem do código nem de fonte externa]** — é a lógica que o comentário do próprio instrumento já descreve (separar "mão sumiu" de "amostra rala"), só ainda não virou cláusula de portão; registrar como recomendação, não como limiar já validado |
| Escala aparente dentro da família | `arma_diag_px` → razão dentro da `FAMILIA`, `RAZAO_ESCALA` em `vm-arsenal-check.mjs` | ≤ 1,35× dentro da mesma família | **[medido]** — calibrado no caso concreto `m92 861px ÷ ak 553px = 1,56×` que reprovou; a pesquisa externa não achou um "fator de escala aceitável" documentado em CS2/Valorant para comparar (seção 1, resultado negativo) — o limiar é só desta base |
| FOV do viewmodel separado do FOV do mundo | não há régua que leia graus hoje; `vm-frame-check.mjs` reproduz a fórmula de enquadramento (`_vmFrame`) e imprime NDC da coronha/boca por arma, sem comparar contra um valor externo | sem limiar externo — **resultado negativo da pesquisa**: nem CS2 nem CS 1.6 nem Valorant publicam "quanto a arma deve ocupar da tela"; CS2 só expõe o controle (`viewmodel_fov` 52–68) sem prescrever onde parar | **[NÃO ACHEI]** — só dá para comparar contra o próprio histórico do jogo (NDC medido nas rodadas anteriores), não contra um número de fora |
| Escondimento do viewmodel em ADS de sniper | já é cláusula declarada (`LUNETA = new Set(['sniper','bolt'])`) em `vm-arsenal-check.mjs` | manter: 0 em quadro é esperado nessas famílias em ADS | **[convenção do gênero, confirmada em CS1.6/CS2/Valorant Operator — seção 4]** |
| Duração de draw/equip/recarga/inspect | **não existe régua no repositório para timing hoje** — as coletas atuais capturam instantes fixos (`reload-f000/f015/...`), não duração de relógio | se for construir uma: draw ~0,6–1,0 s, recarga ~1,5–3,5 s dependendo da classe de arma (ordem de grandeza, não valor exato) | **[comunidade]** — CS2 AK-47 draw ≈1,0s/recarga ≈2,43–2,5s; Valorant Vandal/Phantom equip 1,0s/recarga 2,5s, Bandit equip 0,75s/recarga 1,5s (seção 3); nenhum dos dois jogos publica isso oficialmente — é estimativa convergente de comunidade, não documentação de dev |
| Curva de movimento "smooth" vs. robótico | não existe régua numérica hoje — é julgamento visual | overshoot com decaimento proporcional (cada assentamento menor e mais rápido que o anterior); ausência disso = tell de robótico | **[comunidade de animação de jogos, princípio de ofício — seção 3]**, sem número em frames porque a fonte não fornece um |

## O que esta pesquisa não resolveu

- Fonte primária da Valve para `viewmodel_fov`/offsets em CS2 (só cheguei a guias de
  configuração de terceiros).
- Se as "lunetas fracas" (AUG/SG553) escondem o viewmodel da mesma forma que a AWP.
- Duração de inspect em qualquer um dos três jogos.
- Qualquer número de "fração de tela que a arma ocupa" documentado por desenvolvedor ou
  comunidade, em idle ou em ADS — inclusive não achei sequer uma estimativa comunitária, o
  que reforça que este é um critério que só este projeto vai medir de si mesmo, não importar.
