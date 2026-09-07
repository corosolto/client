# Polish integral do catálogo — continuidade

## Objetivo e isolamento

Elevar em conjunto o catálogo, preservando autoria, proveniência, gameplay, colisões,
rotas, CTF, spawns e desempenho. Uma lane: `codex/mapas-polish-integral`, worktree
`/Users/ruben/csbrasil/worktrees/mapas-polish-integral`, base `09614892` (alpha.238).
Não editar primary nem outras worktrees. Sem merge, release ou publicação.
Capturas reais locais em 3:2, gates técnicos e aprovação visual humana são entregas
distintas. O primeiro lote não encerra o objetivo integral.

## Inventário e matriz única de prioridade

Snapshot reproduzível: `node tools/eval/mapas-polish-inventory.mjs` escreve
`artifacts/mapas-polish/baseline/inventory.json`: catálogo, autoria, declarações de props,
existência, tamanho, SHA-256 e vínculo ao registro Mint quando encontrado. Não confundir
declaração de preload com placement ou aprovação. O harness não carrega GLBs.

| Prioridade / lote | Mapa / autor | Estado e lacuna visual | Acervo aplicado / disponível | Próximo passe e limite |
|---|---|---|---|---|
| P0 / A | Parque da Treta / Ubiracy Santos | Parque de diversões procedural: roda, carrossel, castelo, montanha-russa; cores concorrentes e piso esticado. Ainda distante de Madureira. | Canvas próprios; sem props externos declarados. | Piso com escala coerente e entorno de parque urbano; depois pérgolas, esporte e concha acústica. Preservar atrações colidíveis/CTF neste lote. |
| P0 / A | Penitenciária / Ubiracy Santos | Pátio baixo e isolado, celas e guaritas de caixas, concreto com textura muito esticada; falta massa dos pavilhões. | Canvas e geometria próprios; sem GLB declarado. | Superfícies em metros e silhueta exterior de pavilhões inspirada no Carandiru. Interior/rotas ficam intactos. |
| P1 / B | Campinho do Morro dentro de `quebrada` / Ruben Marcus | Campo de terra ao fundo da Rua do Baile; não é um mapa separado do catálogo. Referência Tavares Bastos ainda sem equivalência visual demonstrada. | Casas favela, arquibancada, varais/props urbanos; lista e hashes no JSON. | Casario em encosta, telhados e composição do campo. Consumir depois as correções funcionais da lane do Campinho, sem sobrescrevê-las. |
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
Fontes consultadas em 07/09/2026 para referência arquitetônica, sem copiar fotografias
ou afirmar reconstrução 1:1. Modelagem do lote A será original em código.

## Marcos, aceitação e próximo passo

- Validado: isolamento em nova worktree; base atual; dependências próprias Node 23;
  inventário estático e assinatura estática de colisores, occluders, spawns, CTF, pickups e grafo
  antes de editar Parque/Penitenciária em `baseline/inventory.json`.
- Em andamento: baseline do jogo local Astro `http://127.0.0.1:8192`, imagens 1200×800;
  implementação lote A, A/B e crítica independente.
- Pendente: todos os demais lotes, capturas atuais por mapa e aprovação humana.
- Aceito: apenas diagnóstico e ordem dos passes. Nenhum visual novo aprovado.
- Rejeitado: declarar asset aplicado/aprovado pela existência; alterar gameplay para
  melhorar screenshot; importar trabalho inteiro de outra lane.
- Próximo passo: concluir baseline A, aplicar superfícies/contexto, comparar assinatura
  de gameplay e custo real do browser, verificar `eval:parquewheel`, `eval:penitenciaria`,
  contratos, spawns, CTF, shader budget e build; registrar commit/evidência neste ledger.

### Revisão independente do inventário

Crítico somente leitura confirmou autoria, vínculo Campinho–Quebrada e ausência do avião
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
anteriores estão rejeitadas; a recaptura final deve confirmar as correções. Pavilhões
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

Próximo marco: terminar `ab-before/`, `final/` e `final-low/`, revisar imagens finais,
comparar custo, registrar hashes/commits e manter B–E pendentes na matriz integral.
