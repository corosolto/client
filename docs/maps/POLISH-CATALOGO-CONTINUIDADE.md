# Polish integral do catálogo — continuidade

## Retomada — captura corrigida dos três recuperados, 07/09/2026

Checkpoint anterior preservado na tag `checkpoint/mapas-polish-506b82c7`. A captura
pendente do handoff foi executada nesta lane, agora sobre o código corrigido.

**Defeito de medição encontrado e corrigido antes de usar qualquer número.** O bloco
`live` do capturador lia `renderer.info.render.calls` depois de o `autoReset` voltar a
`true`, devolvendo `calls: 1` — só o passe final do bloom. As vistas fixas já somavam
todos os passes; o `live` não. Agora o `live` desliga `autoReset`, acumula os 30 s e
divide pelo número de quadros, publicando `calls`/`triangles` por quadro mais os totais
brutos. Prova de que a régua morde: a mesma Penitenciária saiu de `calls: 1` para
`calls/quadro: 753,9`, coerente com as vistas fixas (571–716) mais arma, bots e HUD.

**Frametime está saturado nesta máquina e não serve de orçamento.** Os três mapas dão
P50 = 8,30 ms com 3.546–3.603 quadros em 30 s, isto é, 120 Hz travados no vsync. Enquanto
a cena couber no quadro, o P50 é o refresh do monitor, não o custo do mapa. O orçamento
desta lane passa a ser **draw calls e triângulos por quadro**; frametime só entra como
detector de queda abaixo do vsync, e ainda falta hardware-alvo.

| Mapa | calls/quadro (live) | triângulos/quadro | Vistas fixas, calls | P50/P95 ms |
|---|---:|---:|---|---|
| Campinho do Morro | 485,4 | 861.004 | mouth 810 · eye 672 · galpão 845 · overview 829 | 8,30/9,20 |
| Parque da Treta | 712,2 | 1.121.726 | south 621 · west 610 · coreto 436 | 8,30/9,10 |
| Penitenciária | 741,6 | 1.065.529 | south 712 · yard 614 · galeria 567 · campo 653 | 8,30/9,10 |

O `live` do Campinho é menor que suas vistas fixas porque a câmera de partida fica em
região barata; não é ganho de otimização. Artefatos em
`artifacts/mapas-polish/recovery-fixed/` (fora do Git), 1200×800.

Os três chegaram a `live` e carregaram os props GLB. 404 restantes: áudio (10–13 por mapa)
e 3 decals no Campinho — acervo local ausente já registrado, não regressão. Um erro JS
intermitente do Campinho ficou registrado em `KNOWN-BUGS.md`; o capturador agora grava a
pilha para a próxima ocorrência.

**Diagnóstico visual desta rodada, por inspeção das imagens:**

- **Penitenciária** — o pátio lê como galpão rural, não como presídio: chão de terra
  uniforme e esticado no lugar de laje de concreto com juntas, pavilhões baixos de
  telhado plano e neblina lavando o contraste. Na galeria as janelas são grades chapadas
  na parede, sem peitoril nem profundidade de vão, sob vergas que flutuam. A linguagem
  Carandiru — pavilhões altos, faixas horizontais de janela com vão fundo, ritmo vertical
  — ainda não existe. Esta é a lacuna do próximo lote.
- **Parque da Treta** — parque genérico pastel, não Madureira: castelo de cones, árvores
  em esfera, azul/rosa/roxo concorrendo e casario de fundo branco sem carioca nenhum.
  O piso tem respingos escuros grandes que lêem como ruído, não como sujeira.
- **Campinho do Morro** — o campo de terra batida com marcação branca e o casario ao
  redor estão certos de origem; o que derruba a leitura é a neblina forte, que apaga os
  planos de distância e achata o morro inteiro.

Nenhum desses três visuais tem aprovação humana. Esta seção substitui apenas a pendência
de captura do handoff; o restante do estado abaixo continua valendo.

## Lote B — Penitenciária: escala de material e vão fundo, 07/09/2026

Primeiro mapa do percurso. Escolhido pela medição, não por gosto: `texel-check.mjs`
mostrava a Penitenciária como **o pior mapa do catálogo** em densidade de texel.

### A régua antes

| | antes | depois |
|---|---:|---:|
| mediana (px/m, ponderada por área) | 3,95 | **128** |
| chão | 3,95 | **128** |
| p05 | 3,95 | **70** |
| dispersão p95/mediana | 39,45× | **1,00×** |
| dispersão máx/mediana | 638,7× | **1,5×** |
| área abaixo do piso de 64 px/m | **81%** | **0%** |

`TEXEL1`, `TEXEL2`, `TEXEL3` e `TEXEL3b` estavam vermelhas; as quatro passaram.
Logs: `artifacts/mapas-polish/lote-b/texel-penitenciaria-antes.log` e a saída verde.

### O conserto, e por que não é comprar verde

A causa é a que a própria régua descreve: superfície recebe UV 0→1 seja ela de 0,08 m
ou de 150 m. O chão de 150×175 m tinha 4 px/m; caixas pequenas chegavam a 2.522 px/m.

`boxGeo`, `planeGeo`, `circleGeo` e `cylGeo` passaram a escalar a UV **pelo tamanho no
mundo**, com metros-por-UV derivados da própria textura. A densidade deixa de depender do
tamanho da malha por construção — não é limiar recalibrado, é a variável certa.

Três detalhes que a primeira tentativa errou e a medição pegou:

1. **Repeat não é quadrado.** `reboco` é 256² com repeat 12,1 e `tijolo` 128² com 10,2.
   Usar só `repeat.x` deixava paredes grandes a 37 e 57 px/m. Agora U e V são calculados
   separadamente a partir de `width*repeat.x` e `height*repeat.y`.
2. **O reboco é textura de elevação.** Seu `repeat.y = 1` é intencional: a faixa de umidade
   tem de cair uma vez na base do muro. Ladrilhar o V repetiria a umidade a cada 2 m e
   quebraria o gradiente que a NV1 mede. Marcado com `userData.uvElevacao`, só o U vira
   metros.
3. **Os piores extremos não eram cenário.** O pico de 2.164 px/m eram as armas de pickup
   (`gun()`) e depois um cilindro — chamadas que não passavam o material para o cache de
   geometria.

### Vão fundo das janelas

As 16 janelas eram grades chapadas na parede, sem peitoril nem mocheta. Agora cada uma tem
moldura de 0,34 m — peitoril, verga e dois montantes — avançando da face 4,50 até 4,84, com
a grade recuada a 4,55. A sombra da moldura sobre o vão é o que dá a profundidade.

Montantes e fundo escuro são instanciados: o conjunto custa **+3 draw calls e ~2.900
triângulos por vista**, não 48 malhas novas.

### Custo e contratos

| | antes | depois |
|---|---:|---:|
| calls/quadro (live, med) | 741,6 | 769,5 |
| vistas fixas, calls | 712 · 614 · 567 · 653 | 715 · 619 · 570 · 656 |
| low: calls/quadro · triângulos | — | 464 · 518.079 |

`PF5` continua com o mesmo hash `602d8a00ef9c`: **colisão, navegação, spawns, CTF e pickups
preservados**. Verdes: `eval:penitenciaria`, `penitenciariavida`, `penitenciariafacade`,
`mapcontrato`, `spawn`, `ctfround`, `ctfwin`, `shaderbudget`, `cena`. Zero erro JS em med e
low. Capturas em `artifacts/mapas-polish/lote-b/pen-depois{,-low}/`.

### O que este lote NÃO resolve

- A parede do pavilhão é a pele do GLB `bloco_celas`. A correção de UV **não alcança
  textura de GLB**; o reboco liso do pavilhão continua liso.
- A silhueta ainda é baixa. O contrato fixa o pavilhão em 9×15×6,6 m, então altura de
  pavilhão não se resolve aqui — a massa Carandiru fora do muro é passe seguinte.
- Neblina ainda lava o contraste de distância.
- Nada disso tem aprovação visual humana.

## Lote C — Parque da Treta: escala de material e alameda de Madureira, 07/09/2026

Segundo mapa. O helper de UV virou módulo compartilhado `public/js/map_uv.js`; a
Penitenciária passou a importá-lo em vez de manter cópia local.

### A régua

| | antes | depois |
|---|---:|---:|
| mediana | 35,4 | **128** |
| chão | 17 | **128** |
| p05 | — | **107** |
| dispersão p95/mediana | 6,68× | **1,00×** |
| dispersão máx/mediana | 80,4× | **2,1×** |
| área abaixo do piso | **67%** | **4%** |

`TEXEL1`, `TEXEL2`, `TEXEL3` e `TEXEL3b` reprovavam; todas passaram. Além de caixa e
plano, o Parque exigiu cone, esfera e cilindro com topo/base diferentes — daí `coneUV`,
`esferaUV` e `cylGeoT`. Geometria que é transformada ou mesclada (folha da palmeira,
copas, arbustos, tronco) **não pode sair do cache compartilhado**: nesses pontos a UV é
aplicada direto na geometria nova.

### Identidade: alameda de palmeiras imperiais e pérgola

A direção do mapa pede alamedas, palmeiras, pérgolas e bairro carioca — e diz, com todas
as letras, que trocar cor não basta. Entregue nesta rodada:

- **Pérgola de concreto pintado** em duas orientações: as laterais correm em Z, as de
  fundo correm em X. Colunas, viga e ripas coloridas instanciadas.
- **Palmeiras imperiais de 15 m**, com copa própria — dois anéis de folhas que caem, o de
  fora caindo mais, e capitel verde no topo do estipe. Estipe cinza por cor de instância.

**Duas tentativas antes desta foram rejeitadas pela própria captura**, e isso é o registro
honesto: na primeira, pérgola e palmeiras ficaram só fora da cerca viva e **não apareciam
em nenhuma das três vistas**; na segunda, mesmo trazidas para z=±44, sumiam atrás das
atrações a 76 m com a névoa. Identidade que não se vê não conta. Só na terceira, com a
alameda **dentro** da arena, o conjunto passou a ler.

A alameda interna usa a guarda de vegetação que o mapa já tem, `livreVeg(x, z, 1.2)` —
a mesma que rejeita nó de rota, colisor e trilho. Das 18 posições candidatas, **4**
passaram; as outras 14 foram descartadas pela própria regra, não por escolha. As árvores
existentes do mapa também não têm colisor, então a convenção foi mantida.

### Custo

| | antes | depois |
|---|---:|---:|
| calls/quadro (live, med) | 712,2 | 722,2 |
| vistas fixas, calls | 621 · 610 · 436 | 619 · 608 · 434 |
| triângulos por vista | +≈4.200 | |
| low: calls/quadro · triângulos | — | 429 · 544.882 |

Draw calls das vistas fixas ficaram **iguais ou menores** que antes: tudo que foi
acrescentado é instanciado. Verdes: `parquewheel`, `parquevida`, `parquecanopy`,
`mapcontrato`, `spawn`, `ctfround`, `ctfwin`, `shaderbudget`, `cena`, e os dois da
Penitenciária depois da migração para o módulo. Zero erro JS em med e low.

### O que este lote NÃO resolve

- A paleta das atrações continua doce demais: castelo de cones pastel, rosa/roxo/ciano
  concorrendo. Foi deixado de fora de propósito — trocar cor sem estrutura é o que a
  direção proíbe, e a estrutura veio primeiro.
- Praça cívica, concha acústica e equipamentos de lazer de Madureira não foram feitos.
- Sem aprovação visual humana.

## Lote D — Posto e Atacadão: escala de material, autoria preservada, 07/09/2026

Os quatro mapas de Emerson foram tentados juntos porque o conserto é o mesmo e **não toca
geometria, posição nem colisor** — só a UV. Dois entraram; **dois foram revertidos pela
medição**, e é isso que esta seção registra.

| mapa | mediana antes → depois | chão | área < 64 px/m |
|---|---|---|---|
| Posto da Treta | 32,3 → **128** | 32 → **128** | **98,2% → 0%** |
| Atacadão da Treta | 42,4 → **128** | 47 → **128** | **91,1% → 2%** |
| UPA 24h | revertido | — | — |
| Obras da Prefeitura | revertido | — | — |

Posto e Atacadão ficaram **sem nenhuma cláusula vermelha** no TEXEL.

### A régua pegou o meu próprio conserto

Ao aplicar UV em metros nos quatro, a `TEXEL6` acendeu em UPA (23 superfícies) e Obras (12):

> *UV além de uma volta sobre textura marcada ClampToEdge pelo autor do mapa. Fora da volta
> o WebGL repete a última coluna de texels — mural e placa viram borrão esticado.*

Ela existe exatamente porque **subir densidade de texel premia esse estado ruim**. `map_uv.js`
passou a devolver `null` quando `wrapS` ou `wrapT` não é `RepeatWrapping`: textura presa na
borda não é ladrilho e não pode ser escalada. Com a regra certa, `TEXEL6` zerou.

### Por que UPA e Obras não se resolvem por UV

Com a regra correta, os dois voltaram ao número original — e a leitura do código explica:

- **UPA:** `floorTex()` é um canvas de 1024×1229 que pinta **a planta inteira do hospital em
  coordenadas de mundo** (`px = (wx + HALF_X)/(HALF_X*2) * W`). Não é ladrilho: é uma planta
  baixa esticada sobre 4.320 m², daí os 17 px/m. `wallTex()` é uma tira de 8×256 com o perfil
  vertical da parede — faixa lilás na altura do peito, rodapé de madeira. Os dois são textura
  de elevação/planta, não de repetição.
- **Obras:** mesma família de textura presa na borda.

Portanto os 15,2 px/m da UPA **não são um defeito que a UV conserta**: são propriedade da
direção de arte. Subir aquilo exige outro caminho — resolução maior da planta ou uma camada
de detalhe ladrilhada por cima — e isso é lote próprio, com decisão de arte, não conserto
mecânico. Reverter foi mais honesto que deixar código morto no mapa de outro autor.

### Custo, com repetição

O primeiro par de medidas sugeria regressão no Posto (P95 10,3 → 17,0 ms). **Repetir desfez
a suspeita:**

| | P95, ms |
|---|---|
| antes, duas execuções | 16,7 · 17,1 |
| depois, duas execuções | 16,7 · 16,5 |

O Posto roda em P95 ≈ 16,5–17,1 ms nas duas versões; a leitura de 10,3 foi o ponto fora da
curva, não a de 17,0. **Não há regressão.** Draw calls ficaram estáveis (1.622 → 1.635 e
1.440 → 1.420, dentro da variação de bots), como esperado de uma mudança que só altera valores
de UV.

Fica registrado que o **Posto é o mapa mais caro medido até aqui** — P95 ≈ 17 ms e ~1.620 draw
calls por quadro, o único que cai abaixo do vsync de 120 Hz. Isso é dívida anterior a este
lote, não consequência dele.

Verdes: `mapcontrato`, `spawn`, `ctfround`, `ctfwin`, `shaderbudget`, `mapjson`, `preload` e os
quatro de Parque/Penitenciária. Zero erro JS.

## Estado de parada — 07/09/2026

Execução encerrada por instrução de limite de créditos; GLM/Claude retomam pelos
[18 prompts individuais com Mint.gg](prompts/README.md). Não iniciar novas frentes
automaticamente. Nenhuma geração Mint, merge ou release nesta entrega.
Código integrado recuperável em `883a7efa`, na branch `codex/mapas-polish-integral`.
Recuperação técnica concluída; aprofundamento artístico e aprovação humana pendentes.
As seções antigas abaixo preservam histórico e não substituem este estado.

## Objetivo e isolamento

Elevar em conjunto o catálogo, preservando autoria, proveniência, gameplay, colisões,
rotas, CTF, spawns e desempenho. Uma lane: `codex/mapas-polish-integral`, worktree
`/Users/ruben/csbrasil/worktrees/mapas-polish-integral`, base `09614892` (alpha.238).
Não editar primary nem outras worktrees. Sem merge, release ou publicação.
Capturas reais locais em 3:2, gates técnicos e aprovação visual humana são entregas
distintas. O primeiro lote não encerra o objetivo integral.

## Correção de escopo após revisão do dono — 07/09/2026

O dono rejeitou a profundidade visual do primeiro passe: continua básico. Seus gates
não aprovam a entrega artística. O inventário inicial também confundiu o mapa próprio
**Campinho do Morro (`campomorro`)** com o campo dentro da Quebrada. Essa conclusão e
a confirmação do crítico estavam erradas por olhar apenas a base incompleta.

Fontes verificadas no GitHub: [Campinho #437](https://github.com/corosolto/client/pull/437),
[Parque #440](https://github.com/corosolto/client/pull/440),
[Penitenciária #441](https://github.com/corosolto/client/pull/441). Fechados em 06/09/2026
sem merge na limpeza da base intermediária; comentário de encerramento orienta recuperar
o trabalho em mudanças pequenas contra main. HEADs recuperados somente para leitura:
`873a6473`, `3d64c868`, `8fd95c80`. JSONs em `artifacts/mapas-polish/pr-recovery/`.

O #437 possui `map_campomorro.js`, terreno próprio, oito becos, casario, arquibancada
e torcida. O #530 é outra frente: campo interno da Quebrada. O #440 possui coreto,
vegetação, kit de atrações e horizonte; o #441 possui kit Carandiru, galeria, campo
pichado, instancing e holofotes. Tudo isso deve ser confrontado antes de novo polish.

Esse marco de recuperação seletiva foi concluído nos checkpoints registrados ao final.
A próxima etapa é validar visualmente as últimas correções e aprofundar os mapas
recuperados, sem importar a cadeia histórica inteira nem editar lanes alheias.

## Inventário e matriz única de prioridade

Snapshot reproduzível: `node tools/eval/mapas-polish-inventory.mjs` escreve
`artifacts/mapas-polish/baseline/inventory.json`: catálogo, autoria, declarações de props,
existência, tamanho, SHA-256 e vínculo ao registro Mint quando encontrado. Não confundir
declaração de preload com placement ou aprovação. O harness não carrega GLBs.

| Prioridade / lote | Mapa / autor | Diagnóstico inicial e lacuna visual | Acervo aplicado / disponível | Próximo passe e limite |
|---|---|---|---|---|
| P0 / A | Parque da Treta / Ubiracy Santos | Parque de diversões procedural: roda, carrossel, castelo, montanha-russa; cores concorrentes e piso esticado. Ainda distante de Madureira. | Canvas próprios; sem props externos declarados. | Piso com escala coerente e entorno de parque urbano; depois pérgolas, esporte e concha acústica. Preservar atrações colidíveis/CTF neste lote. |
| P0 / A | Penitenciária / Ubiracy Santos | Pátio baixo e isolado, celas e guaritas de caixas, concreto com textura muito esticada; falta massa dos pavilhões. | Canvas e geometria próprios; sem GLB declarado. | Superfícies em metros e silhueta exterior de pavilhões inspirada no Carandiru. Interior/rotas ficam intactos. |
| P0 / recuperação | Campinho do Morro (`campomorro`) / Ruben Marcus | Mapa independente no PR #437, ausente da base escolhida. Não confundir com campo da Quebrada/#530. | Builder, oito becos, casario Mint, arquibancada, torcida e réguas no HEAD `873a6473`. | Recuperar contrato e integração do mapa próprio; depois aprofundar referência Tavares Bastos. |
| P1 / B | Mansão do Joá / recuperação em curso | Ausente desta base; construtor, catálogo, água, praia e ambiência recuperados em outra lane. | Mármore streetart, gramado, deck e concreto já existem; GLB/ambiência próprios da lane Joá. | Inventariar/portar seletivamente o candidato quando estabilizado; capturar interior, jardim, mezanino e praia. Não importar branch histórica inteira. |
| P1 / C | Posto da Treta / Emerson Garrido | Marquise, bombas e pátio procedurais; escala de textura baixa, props sem unidade entre fachadas e rodovia. | Frota BR Mint, quiosque, gás, cooler, barreiras e bairro; todos os preloads presentes no disco. | Marquise/fachada e piso; depois sinalização, frota e horizonte. Não alterar fila/cover/rotas. |
| P1 / C | Atacadão / Emerson Garrido | Galpão e grandes planos com textura esticada; estacionamento e interior pouco articulados. | Gôndolas, caixas, carrinhos, frota BR e fachadas. | Fachada industrial, módulos de piso e cobertura, materiais por função; props só após orçamento runtime. |
| P1 / C | UPA 24h / Emerson Garrido | Blocos de atendimento com placas, cadeiras, macas, monitores, respiradores e cadeira de rodas procedurais; props comerciais reaproveitados. Coerência visual a confirmar em captura. | Manequim, gôndolas, painel de TVs, caixa e cooler; registros Mint encontrados. | Arquitetura/placas/assentos e materiais laváveis; substituir móveis visualmente sem deslocar seus volumes de gameplay. |
| P1 / C | Obras da Prefeitura / Emerson Garrido | Lajes, pilares e solo básicos; repetição do kit e entorno genérico. | Guindaste, entulho, barreiras, caminhão e bairro. | Estrutura/concreto/formas, terra e tapumes; não alterar circulação nem corrigir nesta lane o balanceamento herdado. |
| P2 / D | Sertão da Treta / Ubiracy Santos | Já possui arquitetura, flora, fauna e horizonte especializados; outra lane trabalha casas/pôr do sol. | Kit Sertão, arquitetura e vegetação com FONTE e builders próprios. | Revisão de consistência com catálogo e A/B após absorção seletiva do candidato. Evitar regressão sobre trabalho existente. |
| P2 / E | Amazônia, Escadão, Lajes, Córrego / autoria do catálogo | Passes recentes de casario, bioma, fauna e horizonte; não recomeçar. | Kits Mint/CC0, texturas e contratos específicos, ver JSON e FONTE. | Baseline 3:2 e harmonização apenas onde evidência pedir. |
| P2 / E | Praça dos Três Poderes, Loja H, Ferro Velho / Ruben Marcus; Piscina / Dalton Fontes | Landmarks/props já elaborados contrastam com planos básicos; Piscina é procedural. | Props próprios dos builders e acervo compartilhado. Praça carrega assets internamente, portanto `props: []` no registro não significa ausência de GLB. | Auditoria do carregamento real, densidade/iluminação e custo; nenhuma reconstrução sem diagnóstico. |

## Proveniência, promessas e conteúdo não aplicado

- `mint-assets.json`, `public/models/props/FONTE.md`, `FONTE-LAJES.md`,
  `public/models/ambient/FONTE.md` e `public/img/FONTE.md` são as fontes locais.
  Ausência no registro Mint não significa ausência de licença: há acervo CC0/terceiros
  e registros mais antigos. Entradas sem prova suficiente ficam **a conferir**, sem nova
  redistribuição, reclassificação de licença ou aprovação inventada.
- O avião `public/models/props/aviao_faixa.glb` existe. `docs/SKYLIFE.md` documenta
  geração Mint, divisão animável e revisão técnica. `skylife.js` implementa faixa e
  trajetória, mas a base não tem chamada com `planes:`; portanto o avião com banner
  **não está aplicado ao catálogo atual**. Córrego usa pipa/helicóptero/arara; Amazônia usa aves.
  Lajes usa outro sistema aéreo e outro avião, o 14-bis; não contar isso como entrega da faixa.
- O avião com faixa será avaliado no lote B, em passagem espaçada, sem colisão/sombra,
  respeitando a degradação low já implementada. Texto da faixa será editorial próprio.
  Existência e documentação técnica não equivalem a aprovação humana desta aplicação.
- Campinho: lane `astra/campo-morro-release-audit`, checkpoint funcional `d564559c`,
  relatório `docs/reports/CAMPO-MORRO-RELEASE.md`, HEAD lido `73dfc45b`.
  Muretas/encostos/placar e navegação permanecem fora desta base; a lane documenta
  validação offline e sete mutantes, com revisão humana do jogo ainda pendente.
- Joá: lane `astra/joa-recuperacao-seletiva`, HEAD lido `640da258`, relatório
  `docs/reports/JOA-RECUPERACAO-SELETIVA.md`. O trecho final registra suite/build
  verdes e correção de `setUsage` observada no navegador; isso é evidência herdada,
  não revalidação desta lane nem aprovação do visual integral.
- A lane `claude/mapas-legado-qualidade`, HEAD `ce16872d`, tem inventário medido em
  `docs/reports/CLAUDE-MAPAS-LEGADO-STATUS.md`. Seus números são baseline histórico,
  não medições atuais. A sugestão de manter prisão genérica cede ao pedido atual de
  referência arquitetônica Carandiru. Não retratar acontecimentos ou pessoas reais.
- Nenhuma promessa adicional de asset foi presumida a partir de nome ou comentário.

## Referências visuais e ordem dos passes compartilhados

1. **Silhueta/composição:** landmarks, massas e leitura do objetivo em câmera de jogador.
2. **Arquitetura/hardscape:** pele externa sobre volumes preservados, passeios e módulos.
3. **Materiais/texturas:** escala em metros, família coerente, juntas legíveis e pouco ruído.
4. **Props/vegetação/fauna:** reutilização com prova de origem, presença real, escala e custo.
5. **Skyline/atmosfera:** lugar brasileiro reconhecível, planos de distância e céu livre.
6. **Iluminação:** ajuste final após materiais, com inimigos legíveis e low validado.

Cada lote percorre esses passes conforme dependências; A começa em superfícies e
silhueta exterior porque isso não exige reformar rotas ou criar assets pagos.
Madureira: [Prefeitura, equipamentos e pérgolas](https://www.rio.rj.gov.br/web/guest/exibeconteudo?id=7658313),
[Praça do Samba e esportes](https://www.rio.rj.gov.br/web/guest/exibeconteudo?id=4192423).
Carandiru: [documentação municipal do conjunto e pavilhões](https://legislacao.prefeitura.sp.gov.br/resolucao-secretaria-municipal-de-cultura-smc-conpresp-38-de-18-de-marco-de-2019).
Fotografias inspecionadas: [Riotur, roteiro Madureira](https://riotur.rio/editorial/roteiro-madureira/)
(palmeiras, água, pérgolas e bairro) e [Vazio, Carandiru](https://www.vazio.com.br/en/projetos/carandiru)
(pavilhões, ritmo e profundidade de janelas). Cópias de pesquisa em
`artifacts/mapas-polish/references/`, fora do Git e do produto.
Fontes consultadas em 07/09/2026, sem afirmar reconstrução 1:1 ou licença de reutilização
das fotos. A modelagem entregue no lote A é original em código.

## Marcos, aceitação e próximo passo

- Validado: isolamento em nova worktree; base atual; dependências próprias Node 23;
  inventário estático e assinatura estática de colisores, occluders, spawns, CTF, pickups e grafo
  antes de editar Parque/Penitenciária em `baseline/inventory.json`.
- Validado: implementação do primeiro passe A, gates direcionados, A/B 1200×800 no
  jogo local Astro `http://127.0.0.1:8192` e revisão independente sem bloqueio visual
  restante nos quatro enquadramentos finais. Código em `f06668d7`, gerados em `e9dd5734`.
- Pendente: refinamento de identidade de A, lotes B–E, visita ao Campinho propriamente
  dito, captura de Joá, hardware-alvo, combate humano e aprovação visual humana.
- Primeiro passe A: gates técnicos passaram, mas o dono rejeitou a profundidade visual. Nenhum visual
  novo tem aprovação humana; esta entrega não encerra o catálogo integral.
- Rejeitado: declarar asset aplicado/aprovado pela existência; alterar gameplay para
  melhorar screenshot; importar trabalho inteiro de outra lane.
- Próximo passo: iniciar B pela atualização somente leitura dos checkpoints Campinho/Joá;
  incorporar seletivamente as correções funcionais estabilizadas nesta lane antes de
  montar o A/B do campo e da mansão. Resolver o acervo local de decals antes de avaliar
  a completude dos grafites; depois percorrer C, D e E, mantendo esta matriz única.

### Revisão independente do inventário

Crítico somente leitura confirmou autoria e ausência do avião; sua conclusão sobre
Campinho–Quebrada foi invalidada pela revisão do dono e pelo PR #437. Ausência do avião
com faixa em callsites. Corrigida descrição da UPA para preservar seu kit hospitalar;
o gerador agora resolve também caminhos/hashes/origem da ambiência declarada.
Carregamentos internos fora do registro ainda precisam de auditoria runtime. A assinatura
é estática: não cobre animação, função de altura/lentidão ou visibilidade de material;
os gates funcionais e o A/B continuam obrigatórios.

### Lote A — implementação e primeira validação

O checkpoint inicial de inventário é `087f6fdc`. O lote A adiciona
`map_visual_surfaces.js`: UV com escala física e cache de geometria; entorno original
modelado em código, sem asset adquirido/gerado por serviço. Parque recebe piso paginado,
gramado/cerca viva menos saturados, palmeiras, pérgolas e casario externo. Penitenciária
recebe escala de concreto e massa de pavilhões fora do muro. As estruturas novas não
participam de colisores/occluders nem lançam sombras; usam batches por material.

`eval:mapspolish` entrou no `check:fast`. Antes da alteração, reprovou piso e entorno nos
mapas, mantendo verde a assinatura estática. Depois, passou. Mutantes `uv`, `spawn` e
`entorno` reprovam pelos motivos esperados; logs em `artifacts/mapas-polish/mutant-*.log`.
A banda de densidade vem de `texel-check.mjs`/`BAR-CONSISTENCIA`, não de um teto novo.
O piso medido passou a 64 px/m nas duas direções. A verificação de entorno mede cada
triângulo contra os limites: nenhuma face nova acima do chão invade a arena.

O runner direcionado passou em sintaxe, animação da roda, Penitenciária, contrato dos
mapas, spawns, rodada CTF, vitória CTF e orçamento de shaders (`gates.log`). Build Astro
passou (`build.log`). Os gerados e `docs:check` foram atualizados depois de rastrear o
novo módulo. Isto não é execução de `check:fast` completo nem aprovação de publicação.

Crítico visual independente inspecionou os pares `baseline/` × `lot-a/` e encontrou
veios grandes na madeira e perda de contraste praça/caminho. A madeira saiu da
normalização; a praça passou a terracota, com paginação distinta. Essas duas tentativas
anteriores estão rejeitadas; a recaptura final confirmou as correções. Pavilhões
melhoraram a massa, mas profundidade das janelas e identidade arquitetônica ainda são
passes seguintes. O Parque continua dominado pelos brinquedos existentes.

Captura automatizada: `node tools/eval/mapas-polish-capture.mjs <diretório> <ids>`,
Astro real, Chrome/Metal, 1200×800. `BASELINE_REF=09614892` serve somente os dois
construtores originais por interceptação local do browser, sem trocar ou editar checkouts.
As vistas fixas são feitas logo após `live`, antes da amostra de 30 s, para evitar a
fumaça variável que comprometia a primeira comparação. Câmera pausada para inspeção;
a amostra de desempenho volta à partida. Não é prova de combate humano em movimento.
`QUALITY=low` executa o mesmo percurso em qualidade baixa.

Limitações observadas: pack privado de áudio ausente (`/audio/manifest.json`, fallback
e música retornam 404). Uma sessão manual inicial produziu RangeError em
`AudioParam.exponentialRampToValueAtTime`; as primeiras capturas automatizadas do lote A
não tiveram erro JS. Não corrigir áudio nesta lane nem declarar o jogo integral verde.
As primeiras métricas `calls=1` eram só o passe final do bloom e foram descartadas para
custo: o capturador agora soma todos os passes nas vistas fixas com `info.autoReset=false`.

### Evidência final do primeiro passe A

Raiz dos artefatos: `artifacts/mapas-polish/` nesta worktree, sem arquivos de imagem
versionados. `evidence-manifest.json` registra tamanho e SHA-256 dos arquivos finais;
`ab-before/browser-med.json` e `final/browser-med.json` preservam métricas e erros brutos.
Manifesto: 37 arquivos, 25.241.842 bytes; SHA-256
`c39914325b0aba2624c38c55ac25f8eead0f77de096122530886cd42e05731d8`.
Os oito mapas do escopo presentes na base chegaram a `live` (Joá está ausente).
Build final passou novamente após as correções (`build-final.log`), seguido de 6/6
checks: sintaxe, mapspolish, roda do Parque, Penitenciária, docs e arquitetura
(`checks-final.log`). Os oito gates funcionais anteriores estão em `gates.log`.

| Mapa | P50/P95 antes → depois, ms, med | Draw calls antes → depois, vistas fixas |
|---|---|---|
| Parque | 8,3/9,7 → 8,3/9,9 | south 680→702; west 743→783 |
| Penitenciária | 8,3/9,5 → 8,3/9,9 | south 1469→1452; yard 1218→1207 |

A amostra mede intervalos de `requestAnimationFrame` durante 30 s de partida local,
não tempo GPU isolado. Personagens/bots variam entre inicializações; contagens totais
de triângulos/geometrias também variam. Não atribuir sua diferença exclusivamente ao
mapa ou afirmar ganho de desempenho. O entorno acrescenta estaticamente 6 batches/
2.876 triângulos no Parque e 4/4.392 na Penitenciária. Não houve piora evidente nesta
máquina, mas desempenho em notebook/hardware-alvo continua pendente.

Qualidade baixa: `final-low/browser-low.json`, imagens 1200×800 inspecionadas. Parque
P50/P95 8,3/9,9 ms, Penitenciária 8,3/9,7 ms; pisos e entornos continuam presentes.
As vistas fixas low precedem o carregamento visível da arma, que aparece em `*-live.png`;
portanto não comparar seu custo diretamente com med. O erro de AudioParam também
ocorreu em Penitenciária low e aparece no overlay da captura live: essa amostra não
aprova funcionamento integral da partida nem seu desempenho. O escopo validado low é
a renderização do mapa, com essa limitação explícita.

Pares finais inspecionados por autor e crítico independente:

- `ab-before/parque_treta-{south,west}.png` × `final/parque_treta-{south,west}.png`:
  piso legível, centro terracota distinto e madeira restaurada. Sem novo bloqueio visual.
- `ab-before/penitenciaria-{south,yard}.png` × `final/penitenciaria-{south,yard}.png`:
  escala de chão e massa dos pavilhões melhores, acessos/coberturas reconhecíveis.
- O aviso de início sobrepõe parte de duas vistas; não impede verificar as correções.
  Vistas fixas não demonstram contraste de inimigos em combate. Madureira e Carandiru
  continuam referências a aprofundar, não reconstruções concluídas.

### Capturas de diagnóstico para os lotes seguintes

`final/<id>-live.png`, 1200×800, inspecionadas nesta lane. São vistas iniciais da partida,
sem vistoria completa de interiores/perímetro. A captura da Quebrada mostra a rua,
**não comprova o visual do Campinho**; o enquadramento do Sertão é limitado pelo cover
do spawn. Obras/Atacadão têm fumaça dinâmica: não usar essas imagens como A/B estático.

| Mapa | P95 local, ms | Diagnóstico observável / limite |
|---|---:|---|
| Quebrada | 17,1 | Casario e materiais presentes; escala de tijolos varia; 65 decals 404. Campo ainda precisa de câmera própria. |
| Posto | 9,4 | Marquise legível, pátio amplo e materiais de escalas diferentes; 18 decals 404. |
| UPA | 16,8 | Interior hospitalar básico e manequins comerciais coexistem; 3 decals 404. |
| Obras | 9,6 | Estrutura e placas presentes; superfícies muito uniformes, entorno baixo; 4 decals 404. |
| Atacadão | 9,6 | Frota BR detalhada contrasta com fachada plana e grandes panos de vidro; 7 decals 404. |
| Sertão | 9,7 | Fachada, vegetação e pássaros presentes; vista do spawn insuficiente para revisão do conjunto. |

Os decals faltantes são acervo ignorado pelo Git, conforme `.gitignore:117–130` e
`scripts/fetch-decals.sh`; não são GLBs ausentes nem regressão causada por A. A completude
visual desses mapas fica pendente até recuperar o pacote local e sua proveniência.
Nenhum desses seis builders foi alterado. Todas as demais respostas HTTP de erro
registradas foram de áudio. Penitenciária reproduziu no final med o erro de AudioParam
descrito acima; os outros sete mapas não registraram erro JS nessa rodada.

### Recuperação dos PRs — marco técnico

Correção do inventário em `edaa5e49`. Recuperados os builders #440/#441 e suas réguas
sem alteração da geometria histórica. Dez GLBs e dois céus recuperados por bytes/blobs
registrados em `POLISH-RECOVERY-ASSETS.json`; entradas Mint e FONTE preservadas.
Campinho #437 recuperado como mapa independente, nome Campinho do Morro, registro/alias
próprios, preview histórico, descrição e callback de torcida no CTF. Os 26 GLBs de props
e fauna já existiam com bytes idênticos. O código de poeira depende de API de partículas
mais nova e ficou desativado neste candidato; terreno, rotas e casario foram preservados.

O passe básico A foi substituído pelos candidatos históricos. Seu helper visual e gate
específico foram removidos: congelavam a geometria simplificada que o dono rejeitou.
Não atualizar os hashes antigos para fingir preservação: o #441 possui pavilhão central,
pickups nos flancos e MID em z=14. A recuperação usa as réguas funcionais de cada mapa.

Validação atual: `integration-checks.log` 5/5 (Parque vida/roda, Penitenciária vida/contrato,
shaderbudget); `contracts.log` 9/9 (Campo contrato/molde, mapas, spawns, CTF rodada/vitória,
IDs, rotação e previews). Ambos em `artifacts/mapas-polish/pr-recovery/`.

### Checkpoint de entrega para GLM/Claude

- `e4d32c84`: dez GLBs recuperados, proveniência Mint/FONTE e manifesto de assets.
- `52a24a22` / `7fbd4a7c`: construtor independente Campinho e contratos/contexto.
- `fe7d1a47`: Parque recuperado; copas elevadas, altura mínima medida de 3,695 m,
  mantendo posições e contratos. Gate reprovava antes; mutante de copa baixa reprova.
- `459ab107` / `fc029a22`: Penitenciária recuperada; removidos quatro cones visuais
  opacos, preservados holofotes; janelas gradeadas visíveis com GLB carregado.
  Gates de fachada e mutantes confirmam as duas correções.
- `052fdf21`: integração dos três mapas, registros, céus e preview Campinho.
- `883a7efa`: remoção do passe básico rejeitado e capturador para os três candidatos.

Validação final após correções: `pr-recovery/final-checks.log` 10/10 — sintaxe,
Campo contrato/molde, Parque vida/copas/roda, Penitenciária contrato/vida/fachada,
shaderbudget. `pr-recovery/build.log`: build concluído. Não equivale a execução
integral de `check:fast` nem aprovação visual.
Documentação gerada atualizada; `arch:check` e `docs:check` passaram. A verificação
de autoria pós-merge não faz parte desse comando e não foi declarada aprovada.

Capturas reais concluídas em `artifacts/mapas-polish/recovered/`, incluindo
`browser-med.json`, quatro vistas Campinho, três Parque, quatro Penitenciária e
as três vistas live. Todos chegaram à partida e ao carregamento dos props GLB,
sem erro JS nessa rodada. Os 404 de áudio e decals estão registrados no JSON.
Essas imagens precedem as correções de copas/fachadas/cones; **não demonstram o
resultado final dessas correções**. O banner de início obstrui parte das vistas.
Não foram executadas novas capturas após a ordem de parada.

Próximo operador: ler o prompt do mapa e reservar a fila de browser; confirmar
servidor local em 8192 (iniciar com o script dev do projeto se necessário), documentar
o tratamento do banner apenas para inspeção e capturar o código corrigido:

```sh
PATH=/opt/homebrew/bin:$PATH node tools/eval/mapas-polish-capture.mjs artifacts/mapas-polish/recovery-fixed campomorro,parque_treta,penitenciaria
QUALITY=low PATH=/opt/homebrew/bin:$PATH node tools/eval/mapas-polish-capture.mjs artifacts/mapas-polish/recovery-fixed-low campomorro,parque_treta,penitenciaria
```

Executar sequencialmente após a retomada autorizada; não há captura corrigida pronta.
Permanecem: profundidade Tavares Bastos/Madureira/Carandiru; visual humano; Joá #533;
Emerson (recuperar também #457/#458/#459 antes de polir); Sertão; restante do catálogo.
Poeira do Campinho depende de API incompatível e continua desativada. Áudio/decals
ausentes exigem recuperação do acervo com proveniência. Critério de conclusão continua
sendo implementação, evidência visual comparável, contratos preservados e revisão do
dono; esta parada entrega recuperação e prompts, não declara o catálogo pronto.
