# Kit HD do Lajes: tabelas e histórico

O kit mora em três arquivos de `public/js/`: `map_lajes_hd.js` (materiais, luz, portas, janelas),
`hd_cenografia_lajes.js` (morro, fios, telhados, fachada, props, tudo sem colisão) e
`hd_detalhes_lajes.js` (atlas de janelas e portas, pichação em decalque).

Nos arquivos o comentário cabe em duas linhas e diz só a invariante ou o risco daquele ponto
(portão `tools/eval/comentario-check.mjs`, cláusulas CM1 e CM2). Causa, medida, rodada e
alternativa rejeitada ficam aqui; o comentário aponta para a seção com `docs/hd-kit/lajes.md#âncora`.
O título de cada seção é a própria âncora. As rodadas (r6, r21 a r24) são as rodadas de revisão
do kit em que a mudança entrou, como estavam anotadas nos comentários originais.

## interruptores

O kit inteiro só liga com `?hd=1`. Todo interruptor abaixo é lido em `map_lajes_hd.js` e
tudo volta ao estado do mapa em `desliga()`.

Correções de material (reversíveis uma a uma):

| Query | Opção | O que desliga |
| --- | --- | --- |
| `?hdtijolo=0` | `opts.tijoloGrao` | acabamento brasileiro do tijolo aparente (`hdAcab`, `hdGrao`): junta cinza-cimento estreita, salmão/laranja por fiada e trecho, respingo de massa |
| `?hdreboco=0` | `opts.rebocoSombra` | variação e oclusão de parede do reboco (uniforme `hdParede`) |
| `?hdpe=0` | `opts.rebocoPe` | pé de parede (umidade, mofo, salitre), remendo de massa e repintura |
| `?hdfam=0` | `opts.rebocoFam` | as três famílias de reboco por casa (chapisco, pintado, liso queimado) |
| `?hdborda=0` | `opts.rebocoBorda` | borda de rolo: a tinta vai até a aresta, sem tinta antiga nem casa de tinta viva |
| `?hdpiso=0` | `opts.pisoEscuro` | os -5 % de luminância do chão da rua (a laje andável nunca escurece) |
| `?hdchapa=0` | `opts.chapaVariacao` | variação da chapa de zinco (`hdChapaVar`): ferrugem, borda de caibro, onda |
| `?hdaco=0` | (sem opção) | o tratamento do aço do mapa (`acoHD`) |
| `?hdplaca=0` | `opts.placaPorta` | mantém a placa de maçaneta do mapa |
| `?hdportafixa=0` | (sem opção) | portas do beco só por sorteio (sem `PORTA_FIXA`) |
| `?hdcadeado=0` | (sem opção) | cadeados e corrente das portas da pose `beco` |
| `?hdloja=0` | `opts.loja` | mercadinho: placa pintada (decalque), toldo, cadeira e engradado |
| `?hdsol=1` | `opts.luz.solDir` | LIGA o sol alinhado ao beco: faixa de sol no chão do beco; em troca as fachadas da laje ficam em sombra |

Opções sem query: `opts.texturas`, `opts.umidade`, `opts.descasca`, `opts.reflexos`,
`opts.janelas`, `opts.portas`, `opts.pichacao`, `opts.luz` (`=== false` desliga cada uma).

Cenografia (`hd_cenografia_lajes.js`):

| Query | Opção | Efeito |
| --- | --- | --- |
| `?hdcen=0` | `opts.cenografia === false` | desliga toda a cenografia |
| `?hdcen=morro,fios` | `opts.cenografia.<item> === false` | liga só os itens listados; a query aceita `morro`, `fios`, `telhados`, `fachada`, `vasos`, `props`, `sombras` |
| `?hdnevoa=0` | `opts.cenografia.atmosfera` | restaura a névoa lavada anterior, para diagnóstico |
| `?hdprops=0` | `opts.cenografia.props` | tira os objetos de calçada/laje e o varal do Beco do Varal |
| `?hdsombra=0` | `opts.cenografia.sombras` | tira a sombra projetada da cenografia |
| `?hddenso=0` | `opts.cenografia.denso` | volta ao morro ralo (casario 440, sem mata no topo) |
| `?hdcaixa=0` | `opts.cenografia.caixas` | mantém o tambor galvanizado autoral das lajes (±11,4; ±7) |
| `?hdvaral=0` | `opts.cenografia.varal` | mantém o varal autoral (`lajes_varal.glb`, corda em fita e toalhas texturizadas) |
| `?hdloja=0` | `opts.cenografia.loja` | tira toldo, cadeira e engradado do mercadinho do beco oeste |

Itens de `opts.cenografia`: `morro`, `fios`, `telhados`, `fachada`, `vasos`, `props`, `sombras`,
`nuvens`, `denso`, `caixas`, `varal`, `loja`.

## materiais

O kit troca textura por NOME de material; `lajes_houses.js` dá nome a todos. A chave da tabela
`REGRAS` (em `map_lajes_hd.js`) é esse nome. O kit projeta em metros de mundo e cuida também de
poça, vidro, luz e céu.

| Chave (nome do material) | Tratamento | Função |
| --- | --- | --- |
| `cream`, `sage`, `adobe` | reboco | `rebocoHD` |
| `ochre`, `rose` | reboco cru (`cru: 1`) | `rebocoHD` |
| `brick` | tijolo aparente | `tijoloHD` |
| `concrete` | concreto de parede e de laje | `concretoHD` |
| `ground`, `paving` | cimentado do chão, com poça | `concretoHD` |
| `zinc` | chapa de zinco | `chapaHD` |
| `steel` | aço (grades, corrimão, postes, batentes) | `acoHD` |
| `recess` | painel escuro = janela | `janelaHD` + `marcaJanelas` |
| `tank` | só rugosidade | (nenhuma) |

Fora da tabela: `timber` recebe o atributo `hdEixo` (`marcaEixos`); as portas são as malhas com
`userData.lajesDoor === true` e ganham o material `hd-porta`; todo material criado pelo kit
tem nome começando com `hd-` (é assim que `doKit` os reconhece). Em `hd_detalhes_lajes.js`,
`PAREDES` e `TIJOLO` usam os mesmos nomes para decidir onde a pichação cola.

Paleta do dono: reboco e cimento cinza de verdade (o sol é quente, então o albedo puxa para o
frio) e tijolo. O tijolo não muda de escala nem de UV: medido 99 px por fiada em 1024 px com
tile de 2 m = 19,3 cm.

## idade

`idade()` é a idade comum a reboco, tijolo e concreto de parede: escorrido acima de 2 m, trinca,
descascado (pé e alto), sujeira e musgo no pé. `semPe` pula o pé porque o reboco tem rodapé
próprio. `sobre = { k, cor }` é a tinta antiga: anel de 6 a 12 cm em volta do descascado, só
acima de 2,1 m, antes de aparecer o substrato.

A trinca de largura constante lia como vetor; por isso `hdTrinca` recebe a espessura `e`
(0,45 a 1,5) e o chamador a varia pelo ruído ao longo do traço.

## reboco

`hdMi.y = (acabamento + sorteio) / 4` por casa; o sorteio gira e escala a mancha.

- `o.rebocoPe` (`?hdpe=0`): rodapé de umidade, mofo e salitre (borda irregular até 0,45 m, no
  máximo -18 % de luminância somando a barra e a oclusão), remendo de massa fora da faixa do
  corpo, repintura com borda.
- `o.rebocoFam` (`?hdfam=0`): família por CASA (`hdTp` = acabamento sorteado em `marcaMiudos`,
  cerca de 1/3 chapisco, pintado e liso). Chapisco de grão grosso (±9 % de albedo, ganho médio
  ×1,09 e relevo 1,6); liso queimado (ganho ×0,97) com junta de desempenadeira (1,15 x 0,92 m,
  -14 %); pintado (×1,03) com repintura e borda de rolo clara.
- `o.rebocoBorda` (`?hdborda=0`): ver `reboco-pintado`.

Malhas sem o atributo `hdMi` (28 das 133 do reboco: geometria fundida, não caixa) leem
`vHdCasa = 0` e eram sempre família 0 (chapisco, sem tinta nem sarrafeado). Hoje o sorteio vem
por célula de 7 m no mundo: as três famílias também nelas.

O chapisco lia como rocha (relevo alto e uniforme): a amplitude caiu 60 % e uma máscara de
baixa frequência (célula de ~9 m) deixa metade da parede lisa.

Remendo de massa nova: célula de 1,8 x 0,8 m (cerca de 1 m² visível), +10 % de luma. A borda
ganhou sulco escuro de 1,5 cm porque antes lia como borrão. A borda de rolo da repintura era só
uma linha escura; virou sobreposição de tinta mais clara com relevo.

## reboco-ondulacao

Ondulação de sarrafeado/desempenadeira: faixas horizontais (célula de ~2 x 0,5 m) com relevo de
0,6 a 1,8 cm. A face de costas para o sol só tem hemisfério e o relevo por normal não aparece,
então o sombreado é explícito, pela inclinação vertical (2ª leitura 6 cm acima). A diferença
entre as duas leituras é de ±0,02 a 0,05 (ruído suave); por isso vai multiplicada por 16 e
limitada a ±0,5 antes do ganho. É menor na faixa do corpo.

## reboco-pintado

Pastel (verde-água, azul, rosa) normalizado pela cor do material. A cor `diffuse` é quente
(cream `0xc0b6a5`, S ≈ 0,29 linear) e o sol também: um tom multiplicado direto só neutralizava
o quente (S de tela 0,13 → 0,11, sem matiz legível). Medido em `lajesol` (casas pintadas,
mediana): S 0,13 (matiz 29°) → 0,19 (218°), luma 143 mantida.

`hdNeu` tira o quente da cor do material (luma igual) e o tom entra com croma ×1,8: antes do AgX
e do sol quente é o que sobra como S ≈ 0,17 ao sol e ≈ 0,25 à sombra na tela. Os matizes ficam
longe do cream (29°): salmão/terracota (15°) some no quente do reboco e do sol; o A/B com
`?hdfam=0` dava diferença média abaixo de 5 na parede pintada do beco.

Tinta antiga: outro pastel da paleta, sempre diferente do de cima. Sem o rosa: o anel rosa
(1,205/0,904/0,954) a 2,5 m lia como salmão/pele (168/133/114) sob a janela da casa viva.
Casa de tinta viva (`hdCs` ≥ 0,955): verde, ou azul com `hdCs` ≥ 0,975, S ≈ 0,35 na tela.

Borda de rolo (`?hdborda=0`): a tinta para a 10–20 cm da aresta da face da caixa (25–35 cm no
corpo da casa, que tem pilar de canto de 15 cm), com ±4 cm de ruído; 1/3 das casas pintadas
mostra a tinta antiga no descascado acima de 2,1 m. Sem o atributo (`hw = 0`) a tinta vai até a
aresta, como era antes da borda existir.

## parede-alvo

Casa alvo das poses `parede`/`laje`: face x = -5,2 do quarto do miolo, z de -16 a -7. As três
famílias entram ali por posição de mundo: mofo mais fechado no pé (abaixo de 0,45 m) e escorrido
do topo (cinta 2,95 → 2,12 m, colunas de 3 a 25 cm); o remendo largo só pelo sorteio por célula.
Na barra pintada, juntas, barra (-12 %) e umidade residual ficam dentro dos -18 %.

- r24: o rodapé de mofo sobe cheio até 0,45 m (a pose `parede` só vê o pé a partir de `hdY` 0,44,
  no canto direito do quadro).
- r24: dois escorridos de calha (z ≈ -13,1 e -10,7, no quadro da pose `parede`): 28 cm e -32 %
  acima de 2,1 m, afinando a 10 cm e -10 % na faixa do corpo, esfumados entre 0,9 e 1,6 m.
- Não há remendo forçado: o quadro da pose `parede` vê a face só em `hdY` 0,26–2,0 (faixa do
  corpo, onde mancha de 1,3 m² é proibida) e o topo fica atrás do telhado de zinco na pose `laje`.

## tijolo

Mesma textura e UV do mapa. Junta afundada, tom por fiada e por trecho de tijolo, chapisco no pé
e no alto; na faixa do corpo sobra só a junta. `hdAcab` (`?hdtijolo=0` desliga): junta
cinza-cimento mais estreita, salmão/laranja por fiada e trecho, respingo de massa só fora da
faixa do corpo.

Junta de argamassa cinza-areia escura, com meta de luma ≤ 135 na captura e cor base -45 %. A
máscara vem da saturação da leitura desfocada (LOD 1,5) porque a argamassa da textura tem grãos
rosados (S 0,3 a 0,45) que furavam a máscara por texel e devolviam a luma clara.

r24: tom por tijolo em 3 degraus (-7 / 0 / +7 %, célula de 29 x 19,3 cm, miúdo o bastante para
entrar na faixa do corpo), 5 % de tijolos lascados (canto inferior com face escura e recuada) e
7 % de juntas com argamassa que vazou (massa clara de 1 cm sobre a borda do tijolo).

## concreto-e-chapa

- Parede de concreto/sarrafeado: a ondulação de 30–60 cm (2 cm) por relevo entrou porque a
  parede era chapada (dp 5 na captura).
- r24, chapa: onda de zinco (passo de 7,6 cm ao longo de x, 4 mm de relevo, ±9 % de albedo, some
  com a distância) nas faces horizontais, porque a cobertura da laje vista de baixo e as
  marquises de janela liam como chapa lisa. Vinco de 2 cm no beiral (borda da chapa) por relevo.

## janelas

- Peso por tipo (`PESO_JANELA`): basculante de ferro, veneziana e vitrô com grade subiram porque
  o correr de alumínio dominava e as janelas liam iguais.
- Tira de ferro (`hdJs.z = -1`): a travessa/dobradiça do mapa (caixa de 4,5 x 1,8 x 78 cm) vira
  tira de 1,2 x 5 x 78 cm em volta do próprio centro, encostada à folha, com rebite a cada
  26 cm. Antes era uma barra preta chapada à frente da porta.
- Painel escuro que não é janela: chapa pintada em folhas de 90 cm com dois tons, sujeira e
  ferrugem só no pé (abaixo de 35 cm, fora da faixa do corpo).

## portas

`PORTA_FIXA` força o tipo nas duas portas da pose `beco` que o sorteio deixava chapa + madeira:
a da direita (x 0,9; z 15,5) vira aço de enrolar e a seguinte da mesma parede (z 9,8) vira chapa
de ferro com postigo de grade. `?hdportafixa=0` devolve o sorteio.

Cadeado (5,5 cm) pendurado na trava desenhada no atlas: argola da madeira, porta-cadeado da
chapa, furo do trilho do enrolar. Só nas duas portas que a pose `beco` (hd_lab: -2, 0, 17) vê a
menos de 3,5 m. No aço de enrolar, a corrente galvanizada tem elos de 1,2 cm em zigue-zague.

A porta de madeira velha (tipo 2) do beco central manda a caixa do vão e a normal da fachada
para a cenografia (`opts.vergas`), que desenha a verga de concreto (ver `fachada`).

## acabamento-por-casa

A tabela `ACAB` garante cerca de 1/3 de chapisco, pintado e liso (32 casas → 10/10/9 + 3 de
bloco). A ORDEM vem do hash do centro da casa, não do índice do colisor. A semente 12.5 foi
escolhida por busca sobre os centros reais dos colisores, para as poses do `hd_lab` verem as
três famílias: `beco` (casa da direita pintada), `lajesol` (central pintada, esquerda chapisco,
fundo liso) e `parede` (CONSERTA-SE liso). Com o índice ×7 o beco só via chapisco. `h3` é
caótico: 5 cm no centro de uma casa trocam a ordem inteira.

Empacotamento de `hdMi.x`: miúdo (0 parede, 1 caixa miúda, 2 placa de maçaneta cream de
5 x 14 x 4,5 cm do mapa, que some com `placa`) + 4 x meia-largura da face em cm (pela normal do
vértice: face ±x usa `d[2]`, face ±z usa `d[0]`) + 8192 x meia-altura em cm. A borda de rolo da
tinta precisa da aresta da caixa.

`VIVAS` (tinta viva): entre as casas pintadas, a mais perto do alvo de cada pose (`beco`: casa da
direita; `lajesol`: entorno 41), com `hdCs` 0,96 verde e 0,98 azul.

## cenografia

Nada na cenografia tem colisão. Por isso ela só existe fora de `bounds`, em telhado inalcançável
(topo ≥ 5,3 m), acima de 3,6 m sobre os becos centrais, acima de 5,4 m no resto, ou colada à
parede (até 12 cm de saliência).

Objetos novos de laje, calçada e beco (props, varais, caixas das lajes, esgoto do beco) só
entram no quadro das poses de captura (`POSES`/`noQuadro`). O varal do beco em z = 19,6–20,3
(atrás da pose `beco`, fora de todas) saiu para pagar os três props de viela do beco sul.

## poses

`POSES` repete `VISTAS.lajes` do `hd_lab`: x, z, yaw e, quando não é zero, o `|x|` máximo que a
pose enxerga; frente = (-sin, -cos). Ordem: `beco`, `laje`, `lajesol`, `parede`. Cenografia nova
só entra onde uma delas enquadra (meio campo horizontal ≤ 51°): fora do quadro é só heap e
triângulo sem retorno. A pose `beco` está entre paredes (`|x|` ≤ 1) e só vê o que está dentro
do beco.

## morro

- Cristas: alturas a 68 % das da rodada r6. Com isso o céu da pose `laje` foi de ~12 % para ~19 %
  do quadro e o casario voltou a aparecer.
- r24: linha da mata de 0,62 para 0,76 da crista (da `lajesol` só se via a faixa de mata acima
  dos telhados: lobo liso sem casa).
- Névoa própria, mais rala que a do mapa, que lavava o casario em pastel.
- Terreno: pouco capim seco, porque era o que lia como colina bege ao sol. Na mata fechada, dois
  tons escuros: o sol a ganho 4 lavava o verde anterior em pastel.
- Paleta do casario em terracota / cimento / branco sujo: tijolo saturado com ganho alto virava
  pastel rosa atrás da névoa azulada. Fora da mancha adensada entram 85 % das casas.
- Raio do sorteio uniforme: antes `pow 1,2` puxava para o pé e o casario ficava só embaixo.
- Copas: com `DoubleSide` a normal invertia na face de costas e a copa ficava cinza-chumbo, só
  com o hemisfério de baixo; por isso a normal é para cima nas duas faces.
- Assentamento das copas pelo MÍNIMO dos 4 nós da célula: na crista o bilinear ficava acima da
  face triangulada e a copa flutuava com céu por baixo.

## morro-orcamento

Os contadores do morro são orçamento de heap, medidos por rodada:

| Rodada | Casario (`NCASAS`/`NTOPO`) | Copas e árvores |
| --- | --- | --- |
| antes da r22 | 840/900 | árvores 500 |
| r22 | 590/630 (-30 %) | árvores 280 |
| r23 | 700/740 | copas 168 |
| r24 | 760/800 (tapete até 0,76 da crista) | copas 118 (-30 %) |

Na r24 as copas viraram cartões cruzados (4 vértices em vez de 4 icosaedros): 68 na linha das
cristas 2 e 3 (silhueta recortada) e 50 soltas. No modo ralo (`?hddenso=0`) valem 440/540.

## becos

`PANOS` é roupa lavada e desbotada (`[cor, listra]`; S ≤ 0,22 e luminância linear ≥ 0,39 para
aguentar o ganho 0,9): nada saturado nem escuro na faixa do corpo. O par rosa-bege `0xd4b5b0`
saiu porque, pendurado na faixa do corpo, lia como pele; entrou um cinza-azulado.

Nos becos entram fio de parede a parede, feixe corrido junto à fachada e varal alto. Na corda,
as peças vão em sequência (camisa, calça, toalha); a calça vai sempre dobrada (0,4 x 0,52). O
pregador de 1,4 cm na cor do pano não aparecia: virou pregador de plástico de 2 x 7 cm.

Tubo de queda de esgoto: PVC marrom de 7,5 cm.

## fios

- Fio de varal em fita: tubo de 6 mm a 10 m virava pontilhado.
- r24: cabo de longe em fita com piso de 1,2 px em vez de tubo de 6 mm (a 20–40 m virava
  tracejado); cinza-azulado, porque preto lia como risco sem perspectiva aérea.
- Nó de amarração e caixa de emenda: o feixe lia como linhas paralelas soltas.
- A ponta dos fios autorais poste → casa acabava no ar; a descida da roldana ao relógio era um
  traço solto.
- Braçadeira de eletroduto e abraçadeira do feixe: solto, o cabo serpenteava como decalque.
- `fundidor()`: antes eram arrays JS de doubles (8 B por número, mais a cópia para Float32 em
  `geo()`); os buffers Float32 crescendo ×1,5 dão metade do pico de heap na montagem.
- `torno()`: normal suave por anel porque a caixa d'água de 24 lados mostrava as facetas;
  `corDe(k)` serve à sujeira e ao desbote.

## passarelas

Passarelas/lajes que cruzam o beco central (caixas de parede a parede, `|x|` ≥ 0,8, `|z|` de
8,3 a 26, fundo ≥ 3,4 m) liam como chapa sem espessura. Entra, por laje: viga de concreto sob a
laje (22 x 16 cm), platibanda de 12 cm nas duas bordas (espessura contra o céu), 2 cabos em
catenária e 1 cano de PVC pendurado por baixo com 2 abraçadeiras. As lajes vêm dos colisores ou,
sem colisor, das caixas fundidas de `lajes-alvenaria` (24 vértices cada, como `porCaixa` de
`map_lajes_hd.js`).

## caixa-dagua

- Azul menos saturado: `0x1a5cb4` virava chapado no AgX. Fibrocimento (`cor` cinza): sem
  nervura, tampa chata.
- A torre é sempre de tijolo recortado (bloco de 19 x 9 cm, fiada de 10 cm): a fiada lisa de
  1,2 m lia como tijolo 3x a escala e a recortada de 27 x 19 cm como 2,5x o tijolo da parede.

## caixas-laje

- Tambor de (±11,4; ±7), colisor de raio 0,70: sai de cena e entram caixa azul de 1 000 L sobre
  torre de tijolo, botijão e engradado no canto livre do mesmo colisor, e mastro com parabólica
  em duas das lajes.
- Tambor do fundo (±11,4; ±16), raio 0,76: vira caixa de fibrocimento cinza em dois tons sobre
  base de concreto (lia como lata lisa a 10 m).

O tambor oculto segue barrando tiros; a caixa que entra no lugar não barra acima de 0,9 m.

## telhados

O filtro dos tetos e a lista de objetos estão iguais aos da r21. Mudar a lista ou os tetos
embaralha tudo: na r22 a parabólica e o puxadinho da laje da `lajesol` sumiram por isso.

Passe garantido (rng próprio) nas lajes vistas das poses `laje`/`lajesol`/`parede` que a lista
não serve com caixa: 70 % caixa azul (1/4 fibrocimento) direto na laje a 0,75 m da borda do
miolo, 35 % parabólica no canto oposto e, na primeira laje da `lajesol`, telha de fibrocimento
com lastro.

r24: raio de 22 para 36 m (as 6 lajes de fundo da `lajesol` estavam peladas) e, no quadro da
`lajesol`, caixa azul sobre torre de tijolo em todas (1,1 m da borda), parabólica em 60 % e
fibrocimento com lastro em metade das lajes ≥ 4 m.

A caixa fica a 0,75–1,05 m da borda (era 1,2–1,6): vista de baixo, na `lajesol`, ficava cortada
pela platibanda da própria laje.

## fachada

- Emenda vertical tijolo → reboco entre casas vizinhas do miolo: antes era uma linha de 6 px na
  pose `laje`; virou pilar fino de concreto com pingadeira.
- Verga de concreto sobre as portas de madeira velha do beco central, com pingadeira escura de
  1 cm por baixo.

## varal

O varal autoral (`lajes_varal.glb`, curva de Bézier do Sketchfab) desenha a corda como fita bege
de 4 cm torcida. Sai de cena e entra varal de poste de concreto de 9 cm (lê a 1 200 px; o tubo
de 3,6 cm sumia) com travessa galvanizada e corda de 1,5 px, recuado 0,5 m para fora
(±7,5; ±11) e com roupa só na metade externa (`|x|` ≥ 7): da pose rente à parede (hd_lab
`parede`: -6,5/3,1/-12,8, yaw -2) nada entra no corredor da laje. Calça sempre dobrada.

## roupas

Port do roupeiro do Escadão (`hd_cenografia_escadao.js`): atlas de tecido de 512 px gerado em
runtime (colunas: camiseta, calça, lençol, toalha, pano de prato; 2ª linha estampada) e malha de
6 x 8 por peça com barriga, dobra lateral, torção de ±4° e AO por vértice nas dobras.

## props-viela

Viela do beco central (paredes em `|x|` = 1, piso y = 0): caixa de feira, balde e botijão
encostados à parede, nos vãos entre janela e porta. Sem colisão: saliência de 28–36 cm numa
viela de 2 m, fora da linha de andar do meio. `rSemVermelho` (sorteio ≥ 0,5) pula a caixa
vermelha e o balde vinho: a 3–5 m da câmera nada cor de sangue. Só o beco sul (z > 0): o
espelhado fica a 29 m, atrás do próprio beco, e passaria em `noQuadro` por estar no eixo da
câmera.

## props-lajesol

A laje da pose `lajesol` (-7,2; 3,1; -3,5, yaw 0,9) lia vazia. Entraram: mancha de água (polígono
de 1,3 x 0,9 m a 3 mm do piso, 2 m à frente; é plano, não é obstáculo) e, na faixa de 58 cm
entre o pilar (-11,6; -4,3) e a mureta (`|x|` 12,2–12,7, fora da rota), saco de material,
botijão, balde e antena velha deitada ao pé da mureta. Também musgo/mancha escura em volta da
base da caixa d'água (±11,4; -7, a 2 mm do piso) e ralo de ferro de 15 x 15 cm junto à mureta.

r24: `topo()` devolve null abaixo de `TETO_MIN` (5,3 m) e a laje andável fica a 3,1 m, então o
passe da r23 nunca entrava. O piso passou a vir do colisor da laje (`maxY` 2,9–3,3).

Cobertura da laje: caixa de zinco autoral de 2,7 x 4,5 m a y 5,32, 5 caibros de 5 x 7 cm sob a
telha, braçadeira galvanizada no topo de cada poste e testeira de 2 cm no beiral (espessura
contra o céu).

## porta-de-enrolar

Lâminas galvanizadas, metade de cima pintada (2º tom com luma -12 %) com transição em linha
contínua (seno de baixa frequência, ±2 cm) e 2–3 lascas arredondadas de 8–15 cm. Nada por pixel:
o ruído do canvas ampliado virava blocos de 3 px na captura. Ferrugem = um gradiente vertical
contínuo nos 30 cm do pé, modulado por gradiente horizontal suave; fechadura preta com miolo a
0,9 m do piso.

Dois tons com luma ±20 % (galvanizado 150/158/162 ≈ 156; tinta 84/98/104 ou 80/92/118 ≈ 95): a
3 m o par 141/123 lia como chapa uniforme cinza-azul.

r24: cada lâmina com sombra escura na dobra de baixo e fio claro no topo; 3 amassados nos 40 cm
do pé, retângulos de 10–18 cm mais escuros e recuados, com borda de baixo clara.

Outros atlas, mesma rodada: a grelha do ar-condicionado de janela ganhou lâminas recuadas em vez
de traços rasos (r24); as travessas da porta de madeira velha têm 4,6 cm, metade da antiga.

## pichacao

Tinta "preta" é cinza-escuro (`#363430` nas frases): preta pura saía com p5 = 9 na captura. O
desbote irregular vem de `gasta()` + `falhas()`. `reto` é pixo reto paulista (alto da empena,
preto ou branco); `xarpi` é assinatura carioca de traço único. O letreiro fixo usa op 1,25
porque com op 2 saía chapado, sem passar pelo desbote em mancha do shader.

## decalques

Cada lugar é conferido com raios a cada 12 cm de altura e 22 cm de largura, com 4 cm de folga:
cinta, viga ou pilar no caminho recusa o lugar. `opts.loja`: placa pintada do mercadinho na
fachada de entorno 41 (x = -14,85), entre o toldo (2,60 m) e a cinta do andar (2,95 m).
