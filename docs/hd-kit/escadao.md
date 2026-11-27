# Kit HD do Escadão: tabelas e histórico

O kit mora em dois arquivos de `public/js/`: `map_escadao_hd.js` (casamento de materiais; shaders
de reboco, concreto, tijolo, janela, porta, ferro e chapa; props GLB; textura de cobertura) e
`hd_cenografia_escadao.js` (morro, casario, mata, telhados, fachada, postes, fios, roupas,
comércio e props, tudo sem colisão). Os atlas de janelas e portas vêm de `hd_detalhes_lajes.js`,
o ruído de `hd_cenografia_lajes.js` e as texturas CC0 de `public/img/textures/hd_lajes` (nenhuma
textura nova: `hd_escadao/FONTE.md`).

Nos arquivos o comentário cabe em duas linhas e diz só a invariante ou o risco daquele ponto
(portão `tools/eval/comentario-check.mjs`, cláusulas CM1 e CM2). Causa, medida, rodada e
alternativa rejeitada ficam aqui; o comentário aponta para a seção com
`docs/hd-kit/escadao.md#âncora`. O título de cada seção é a própria âncora. As rodadas (r4, r15,
r21 a r26, com letras como r23b, r24b a r24e e r26a a r26c) são as rodadas de revisão do kit em
que a mudança entrou, como estavam anotadas nos comentários originais; a lista está em `rodadas`.

## interruptores

O kit inteiro só liga com `?hd=1`. Todo interruptor abaixo é lido em `aplicaEscadaoHD`
(`map_escadao_hd.js`) por `liga(opção, query)`: desliga com `opts.<opção> === false` ou com a
query em `0`. Tudo volta ao estado do mapa em `desliga()`.

Materiais (reversíveis um a um):

| Query | Opção | O que desliga |
| --- | --- | --- |
| `?hdreboco=0` | `opts.reboco` | `rebocoHD` nas chaves `reboco`, `cimento` e `guarda` |
| `?hdpiso=0` | `opts.piso` | `concretoHD` nas chaves `degrau`, `concreto` e `concretoEscuro`; sem piso a textura de cobertura (`hdCob`) nem é criada |
| `?hdjanela=0` | `opts.janelas` | `janelaHD` na chave `vidro` |
| `?hdporta=0` | `opts.portas` | `portaHD` (chave `porta`) e `ferroHD` (chave `ferro`); as réguas de zinco da veneziana também voltam |
| `?hdtijolo=0` | `opts.tijolo` | `tijoloHD` na chave `tijolo` |
| `?hdchapa=0` | `opts.chapa` | `chapaHD` na chave `zinco` |
| `?hdregua=0` | `opts.regua` | as 6 réguas de zinco da veneziana autoral voltam (deixam de ser descartadas em `chapaHD`) |
| `?hdlixeira=0` | `opts.lixeira` | o material clonado da lixeira (`lixeiraHD`) |
| `?hdcasa=0` | `opts.casa` | o material clonado da casa GLB de tijolo (`casaTijoloHD`) |
| `?hdcasaazul=0` | `opts.casaAzul` | o material clonado da casa GLB azul (`casaAzulHD`) |
| `?hdcoluna=1` | `opts.colunas === true` | LIGA (desligado por padrão) os pilares do molde em caixa de concreto com ferragem de espera |
| (sem query) | `opts.pisoSujo === false` | no piso: mancha de água antiga, água e musgo junto à parede, canaletas, limo e poça |
| `?hdr26=0` | `opts.r26` | o bairro instanciado e o casario do morro voltam do bloco cerâmico à vista ao reboco; o relógio da fachada do spawn volta a 1,3 m |

Cenografia (`hd_cenografia_escadao.js`, chamada com as opções montadas em `aplicaEscadaoHD`):

| Query | Opção | Efeito |
| --- | --- | --- |
| `?hdcen=0` | `opts.cenografia === false` | desliga toda a cenografia |
| `?hdcen=morro,postes` | `opts.cenografia.<item> === false` | liga só os itens listados; a query aceita `morro`, `casario`, `mata`, `telhados`, `fachada`, `postes`, `vida` (`?hdcen=1` liga todos) |
| `?hdr23=0` | `opts.r23` | fios finos no lugar dos cabos autorais, parapeitos, muretas, bicicleta, caixilhos e mão-francesa |
| `?hdr24=0` | `opts.r24` | poste de laje com nó de fiação, fachada do spawn (ar-condicionado, caixa de luz, varal, marquise), bueiro e as sarjetas de `bueiroESarjetas` |
| `?hdr26=0` | `opts.r26` | atlas do horizonte de 512 px sem bloco cerâmico (casario rebocado) |

`casario` e `mata` só contam com `morro` ligado. A sarjeta ao pé das fachadas (em `fachada()`)
não depende de `r24`. Outras opções de `opts.cenografia`: `semente` (sorteio do morro, padrão
20261115) e `mundo` (padrão `window.__game.world`: colisores e `groundHeightAt`).

`r23`, `r24` e `r26` são lidas em `opts` do kit (não em `opts.cenografia`) e repassadas.

## materiais

O mapa autoral (`public/js/map_escadao.js`) não dá nome aos materiais. `regraDe` casa só
`MeshStandardMaterial` SEM nome, nesta ordem (a primeira regra que casa vence):

| Chave | Casamento | Tratamento |
| --- | --- | --- |
| `degrau` | mapa em canvas + `userData.metricTile` 1.6 + cor `c5c2b9` | `concretoHD` (com nariz, sem junta) |
| `cimento` | mapa em canvas + `userData.metricTile` 1.6, qualquer outra cor (no mapa, `b5b2a8`) | `rebocoHD` |
| `tijolo` | `userData.metricTile` 1.65 ou src `lajes_tijolo_baiano` | `tijoloHD` |
| `reboco` | canvas de 128 px + cor em `8ba7a4`, `d7ccb1`, `bf9176`, `a9b38d` (chaves de `PALETA`) | `rebocoHD` |
| `guarda` | cor `c2baa7` com mapa (`T.concrete`) | `rebocoHD` (umidade 1) |
| `concreto`, `concretoEscuro` | src `concrete_br` (escuro com `repeat.x` ≥ 4,5) ou canvas `tilePuro` branco com `repeat.x` 1 e média cinza (escuro com média < 0,5; no mapa, 256 px claro e 512 px escuro) | `concretoHD` |
| `vidro` | sem mapa, cor `273b42` | `janelaHD` |
| `porta` | sem mapa, cor `49372a` | `portaHD` |
| `ferro` | sem mapa, cor `38413c` | `ferroHD` |
| `zinco` | sem mapa, cor `777a76` + metalness 0,35; ou src `tex_zinco` + cor `777a76` | `chapaHD` |

Props do acervo, vestidos por material clonado (nome `hd-<chave>`; o original volta em
`desliga()`), achados por `propDe` subindo a hierarquia da malha:

| Chave | Casamento | Tratamento |
| --- | --- | --- |
| `lixeira` | `userData.mapPropId === 'dumpster'` | `lixeiraHD`: a pichação legível vira mancha |
| `casa` | `userData.casario === 'casa_favela_tijolo'` | `casaTijoloHD`: faces laranja do atlas cozido ganham junta de bloco |
| `casaAzul` | `userData.casario === 'casa_favela_azul'` | `casaAzulHD`: faces azul-marinho viram pintura azul lavada com reboco |

Notas de casamento:

- `vidro`: o atlas só usa as células 0, 2, 3, 5 e 6; caixa sem `hdJc`/`hdJs` fica tinta lisa.
- `ferro`: portão (0,6–1,5 x 1,4–2,3 m) e veneziana autoral já têm frisos em geometria e só
  recebem acabamento; só o painel liso de 0,72 x 0,85 m recebe o basculante do atlas.
- Todo material criado pelo kit tem nome começando com `hd-`; a cobertura e o casamento de props
  pulam esses nomes.
- A média do canvas (8 x 8) separa o concreto procedural (cinza) de placas, terra e azulejo.

Paleta: as 4 cores autorais das paredes viram azul desbotado, branco de cal, ocre e verde-musgo,
mais escuras e saturadas do que o alvo porque o AgX lava cor clara. Cimento e guarda ficam cinza
de reboco de cimento.

## faixa-do-corpo

A regra do kit: entre 0,6 e 1,9 m acima do piso não entra mancha de albedo de tamanho de corpo
(o jogador precisa ler silhueta ali). `hdFaixaCorpo` sobe de 0,40 a 0,55 m e desce de 2,0 a
2,2 m, cobrindo a faixa com folga; por isso os comentários falam em "acima de 2,1 m" e "abaixo de
0,4 m" para remendos, rasgos, descascados e tijolo exposto.

A altura local do fragmento (`hdAltura`) conta da base da própria caixa (`hdJc`/`hdJs`) ou de
`hdChao`, o que for mais alto. `hdChao` é o piso jogável aproximado, com as cotas de
`map_escadao.js` (lances de 3,48 m de comprimento e 2,52 m de subida).

## grao

r24: o grão de alta frequência passou a ser procedural (`hdGraoP`): leitura do `hdRuido` com UV
escalado, canal r (4 oitavas de 8 texels por feição). Antes vinha do canal b, cujo texel de
4,7 mm magnificado aparecia como quadriculado de perto, no reboco e no cimentado. É 1 tap sempre
e mais 1 tap girado só quando o período cabe em 2,5 px ou mais; abaixo de 3 px a amplitude some,
então nunca cintila.

Período: 1,9 cm no reboco, 6,5 mm no chapisco (grão real de 3 a 8 mm), 1,6 cm no cimentado.

## reboco

`rebocoHD` serve `reboco` (as PAREDES), `cimento` e `guarda`: cor e rugosidade de
`concrete_wall_003` em metros de mundo, tom por caixa e máscara lenta (período ≥ 3 m, ±8 %).

Na faixa do corpo: grão fino ±6 %, média frequência (15–40 cm, `hdMeio`, sem ladrilho) e relevo;
a mancha lenta e média da textura só fora dela (`× (1 − hdFaixaCorpo)`). Fora, por célula: rasgo
de eletroduto (acima de 2,1 m), remendo de tijolo com borda irregular (12 %), escorrido da laje
(≤ 12 %), trinca, rodapé (−15 %) e musgo (abaixo de 0,3 m).

Família de acabamento por caixa (`hdFam`):

- 35 % pintura lisa com pintura sobre pintura: barrado até 1,2 m 5 % mais escuro, borda de rolo
  clara.
- 35 % chapisco: grão só de alta frequência (±5 %, some quando o período fica abaixo de 3 px),
  grão de 6,5 mm, remendo de cimento liso acima de 2,1 m em 50 % das caixas, umidade 0,7 no pé;
  na faixa do corpo nenhum albedo vindo da normal.
- 30 % cimento queimado (mesma luminância sem cor, juntas de 1,1 x 1,25 m), SÓ em caixa de cor
  com S < 0,15 (`hdQueiOk`: branco de cal, cimento, guarda); nas coloridas essa fatia vira
  pintura lisa.

Outras regras:

- Platibanda sem reboco: tijolo nos 0,55–0,9 m de cima, acima de 2,1 m. Eram 15 % das caixas;
  na r24 passaram a 32 %.
- Bloco cru em caixas marcadas (`hdVar.y`, sorteado em `marcaCaixas`).
- Mercearia do mirante: pintura comercial por posição de mundo (`|x|` ≤ 2,4, face z −23,3 ±
  7 cm). Cobre parede e pilastras da quina, inclusive 7 cm da face lateral: ocre em cima, barrado
  verde-escuro até 1,10 m e filete claro de 2,4 cm.
- Todas as caixas: respingo de barro abaixo de 0,42 m, sombra de contato sob beiral (`hdCob`,
  0–30 cm, caixas ≥ 1,5 m) e no pé (≤ 22 cm), friso de platibanda a 30 cm do topo (caixas
  ≥ 2,5 m), descascado da pintura lisa acima de 2,1 m.
- Guarda ≥ 1,4 m: marca de tábua e barbacãs (`hdBarbaca`).

Histórico por rodada:

- r22, chapisco-esponja: o chapisco inteiro lia como esponja. Pelo menos 50 % de cada caixa de
  chapisco vira reboco liso por máscara de 2–3 m (reboco novo sobre chapisco) e o relevo caiu
  40 % (×1,6 fora e ×1,2 no corpo viraram ×0,96 e ×0,75).
- r22: o descascado ganhou 3 variantes por faixa de 1,5 m (ruído girado 0,6 / 1,7 / 2,8 rad e
  deslocado) porque o mesmo decal repetia 4 vezes na prumada.
- r22: o musgo verde até 0,3 m a 45 % virou mofo cinza-verde no rodapé (abaixo de 0,45 m).
- r23: 3 variantes de albedo por caixa (`hdVarA`): 0 = remendo de reboco novo com borda dura
  (0,9–1,6 x 0,8–1,3 m, 1 por célula de 2,9 m em 55 %, acima de 2,1 m, luma −8 %); 1 = escorrido
  longo de calha a partir do topo (1 coluna por 3 m, 8–11 cm, desce 1,6–2,6 m; no corpo é só um
  fio ≤ 11 cm a −12 %); 2 = tijolo aparente no pé em 70 % das células.
- r23: a média frequência no corpo caiu de ±7–8 % para ±3,5 % porque lia como grão de 7 cm; o
  grão real vem do normal map 8 vezes mais fino (`comMundo`, parâmetro `nrm`), com feições de
  0,6–5 cm, e no corpo o relevo fica em ×1,0 (era ×1,5), nunca amplificado.
- r23: o emboço nunca fica mais claro que 92 % da luma da pintura; no salmão e no verde lia como
  mancha branca de 60 px.
- r23: o escorrido sob o cano do barbacã foi de 0,6 / −30 % para 0,8 / −45 %; na pose da escada o
  cano ficava sem escorrido legível.
- r24: a projeção passou a usar o eixo de mundo da face (x ou z, pela normal geométrica) mais um
  deslocamento por caixa. Somar x + z dava emenda vertical onde duas faces da mesma prumada se
  encontram (no beco, x ≈ 1132–1145 px da captura) e repetia o mesmo decal em caixas vizinhas.
- r24: rodapé escuro de 10 cm com borda dura (cimento queimado sujo, −32 %) em toda caixa que toca
  o piso; o encontro parede/chão era cru.
- A mancha da `concrete_wall_003` entra a 45 % fora do corpo; inteira, eram duas colunas escuras
  a cada 1,7 m.
- O tijolo exposto dos remendos é mais escuro e dessaturado que o tijolo aparente autoral (0,7
  vezes o ganho 1,4 anterior).

Batente (caixa ≤ 16 cm x ≤ 1,24 m: marcos, caixilhos, pilastras, canos): concreto 14 % mais
escuro que a parede (lê como recesso), com lascas de 1–3 cm na aresta mostrando brita, sem
remendo, rasgo, platibanda nem tijolo. A aresta é a borda vertical da FACE vista, pela normal
geométrica: medir pela caixa dava 0 na face inteira do pilar quadrado, uma coluna de manchas. Na
faixa do corpo a lasca é rara (`hdM2.r` > 0,9) e tem no máximo 1,8 cm.

## bairro-instanciado

O bairro externo é instanciado (`vHdInst` = 1): a caixa vem da `instanceMatrix`.

- r24: dessaturado 55 % e 8 % mais escuro; o verde-musgo `8fa07a` lia como verde-lima ao sol.
- r24: escorrido fino de sujeira sob os peitoris autorais (janelas em u = −1,25 / 1,1 da face,
  peitoril em 1,4 + 2,9·andar − 0,48 m): 3 fios de 1–2,5 cm por janela descendo 0,75 m, −20 %.
- r26 (`hdR26` = 0 desliga): fora da arena (`|x|` > 19,5 ou z > 43) o bairro deixa de ser todo
  pintado. 62 % das caixas ficam em bloco cerâmico à vista e 16 % só no último pavimento.
  Esqueleto de concreto: viga de 22 cm a cada 2,9 m (laje) e pilar de 18 cm nas quinas e a cada
  ~3,1 m; as janelas autorais em u = −1,25 / 1,1 caem entre pilares.
- r26b: `hdBaiano` recebe `hdCorpo`, e remendo e pó de argamassa ficam fora da faixa do corpo.
  Na r26a um remendo cinza de 38 cm caía a 1,2–1,5 m no prédio do spawn.
- O térreo fica chapiscado até ~2,1 m (borda solta): o bloco é da gama de pele e não pode cobrir
  a faixa do corpo à beira da arena.

## concreto

`concretoHD` serve piso e parede; a orientação vem da derivada da posição. Grão e relevo somem
com a distância (`hdNitido`).

Piso (cimentado `concrete_floor_02`):

- Lido com viés de mip +1: o speckle branco vinha do grão da cor mais a normal do
  `concrete_floor_02` e de pixels lisos do alfa. Meta da captura: desvio padrão ≤ 30.
- Junta de desempenadeira a 1,5 m, com fiadas desencontradas, deriva lenta de ±2 cm, ruído de
  ±5 mm, 35 % das juntas apagadas e mais 30 % dos trechos de 50 cm; a largura varia ao longo,
  para não ler como estacionamento.
- Dois remendos fixos de cimento no mirante (`hdRemendo`): cimento mais novo, 10 % mais escuro e
  frio, 4 mm acima do piso.
- Canaleta de água dos lances: faixa úmida de 15 cm, rugosidade 0,3, fio d'água escuro no eixo e
  limo nas bordas; o espelho do degrau continua a faixa.
- Poça rasa no patamar 1 (`hdPoca`): rugosidade 0,25, sem relevo, halo úmido de 10 cm.
- Água escura e musgo só no encontro com a parede (`hdCob` no mip 1, até 20 cm).
- Quina de degrau com linha clara de 1–2 cm e lasca em 20 % dos degraus (borda +z da caixa).
- r23: canaleta de esgoto de 15 cm no eixo dos 3 lances centrais (2 cm rebaixada, fio d'água
  escuro, limo nas bordas) e musgo no pé do corrimão/mureta (`|x|` > 1,55).
- r23: 1 degrau remendado (lance 2, k = 7, centro z 4,635): cimento novo de 60 cm em x −0,55,
  borda dura, sem grão, 5 mm acima; o espelho (z 4,78) acompanha.

Parede: concreto de forma ou, no espelho do degrau, o próprio cimentado com sujeira de contato.
Muro de concreto ≥ 1,4 m: marca de tábua e barbacãs com escorrido e musgo.

## piso-mirante

Tudo no piso do mirante (y = 7,56; o shader testa y 7,58 ± 0,1):

- Remendo de asfalto: 3 fixos, dois no quadro da pose (entre a câmera em z −30 e a mercearia),
  quase pretos, borda ruidosa, 6 mm acima, sem grão. Na r23 os dois do quadro cresceram (2,6 x
  1,5 e 2,2 x 1,4 m) e ficaram 1 m mais perto da câmera.
- Calçada da mercearia (z −24,25 a −23,3): rebaixo de 2 cm (degrau na borda) e canaleta de esgoto
  em z −24,25, com fundo úmido escuro 3,5 cm abaixo, bordas claras de 1 cm e fio d'água no eixo.
  A canaleta ficava em z −22,95, atrás da fachada, invisível. Na r23 ficou legível: corre por
  `|x|` < 7 (era 2,9), 22 cm (era 18), fundo −60 %.
- r24: mancha de óleo (elipse de 1,1 x 0,7 m em (−1,2; −28,6), quase preta, brilhante, halo
  pardo), remendo de areia/brita (elipse de 1,6 x 1,1 m em (4,1; −29,4), clara e granulada, borda
  esfarelada) e areia encostada ao muro (até 35 cm da parede, por `hdCob`).

## tijolo

`tijoloHD` é procedural: a textura do mapa fica ligada mas não é lida. `m.color` vira branco em
`aplica()` e o albedo sai inteiro do shader (a cor volta em `desliga()`).

`hdBaiano` (em `PARS`) é o bloco cerâmico de 19 x 14 cm a meio tijolo (passo 21 x 16, fiadas com
±4 mm de onda), 2 famílias de tom mais tom por tijolo (±5 % no corpo, ±10 % fora), ranhuras do 6
furos, sobra de argamassa em 50 % das fiadas, respingo, remendo e pó (12 %) fora do corpo. Serve
`tijoloHD`, `casaTijoloHD` e o bloco do bairro instanciado, sempre na mesma escala.

- A junta era CLARA, de 1,5–2 cm; na casa GLB a clara de 1,7 cm lia como junta larga
  rosa-lavada. Hoje é ESCURA (cinza-chumbo), de 1 cm.
- O tom já foi salmão-rosado 7 % mais escuro que o da r15 e dessaturado 20 %; hoje o croma vai a
  ×1,2 sobre a luma, para sobrar S ≥ 0,35 sob o AgX.
- r24: argamassa escorrida sob a junta horizontal (35 % das fiadas, 1–3 cm, cinza-chumbo);
  reboco parcial (emboço cinza em manchas de 0,5–1,5 m) só acima de 2,1 m em 50 % das caixas; na
  quina (face cuja normal segue a dimensão fina da caixa, ≤ 35 cm) os 6 furos do bloco (2 x 3 de
  Ø 2,2 cm por 9 x 14 cm) em escuro e relevo.

Por cima do tijolo: escorrido, trinca, pé úmido com musgo.

`hdBat` (vira concreto 14 % mais escuro, com lasca na aresta vertical da face vista, sem tijolo):

- batente (≤ 16 cm x ≤ 1,24 m);
- empena de 20–50 cm de espessura com ≥ 3 m de altura e ≥ 5 m de comprimento;
- moradias de tijolo dos becos (caixas com `|x|` 13,5–16 e z 6–15: parede de 0,62 x 2,4 m mais o
  pavimento de cima); a face de 2,4 m lia como empena de tijolo no beco;
- pilar (≤ 0,8 x 0,8 m, ≥ 2 m): o de tijolo cru sob o pergolado do spawn.

## janela

O painel escuro do mapa vira caixilho + vidro do atlas (cor, com a altura no alfa). A célula é
sorteada pela posição do vão, o vidro fica 4,5 cm atrás do caixilho por paralaxe e o reflexo de
céu entra por Fresnel, sem cubo. Painel largo repete a célula. O UV é recortado a 0,02–0,98.

- Só entram células que leem inteiras de longe (`CEL_JANELA`: correr, basculante, veneziana,
  tijolo, madeirite). Folha aberta, vitrô com vidro faltando, lençol com ventilador e papelão
  pareciam célula vizinha cortada.
- Caixa sem `hdJc`/`hdJs` (`vHdJs` = 0) não entra no `if`: fica a tinta lisa do material.
- Por cima do atlas: aro de 5 cm em relevo (+2,5 cm) e peitoril escuro de 7 cm com aresta clara.
- Sem grade: as células do atlas já trazem barras e a grade duplicava.
- r23: de longe (pixel ≥ 1,5 cm) a célula lia como retângulo cinza. Entraram vidro −45 %,
  caixilho +30 % e sombra da verga nos 12 % de cima (−40 %).

## ferro

A mesma cor serve portão, veneziana, grade e corrimão; a caixa decide.

Portão autoral (0,6–1,5 x 1,4–2,3 m, fino): quadro de metalon de 5 cm nas bordas e travessa
central de 4 cm em relevo (aresta clara, AO de 3 cm para dentro); tinta em camadas (cor atual
com S ≈ 0,25 sobre a cor antiga nos descascados < 6 cm); rebites a cada 25 cm com escorrido de
ferrugem (≤ 12 cm) e escorrido sob a travessa; sombra de recesso (14 cm sob a verga, 10 cm no
lado das dobradiças); 3 dobradiças de 9 cm; ferrugem do pé até 0,4 m; trilho escuro na base.

Ferrolho e cadeado: ferrolho junto à borda (lado por caixa), cadeado de latão de 6 x 8 cm (SDF
com aro escuro e furo) sob a barra, alça em arco de 4,8 cm que entra na barra e corrente em U do
corpo do cadeado ao quadro. A corrente é uma fita contínua pela distância a 8 segmentos da
curva, com elos de 2,4 cm alternando face (9 mm) e perfil (5 mm) e vão escuro de 1,5 mm; o
último elo entra na argola (Ø 2,4 cm, 3 mm) presa na borda da folha (`hdCx` 0,12 = face do
quadro/batente). Nenhuma ponta fica no ar.

Veneziana autoral (painel de 1,04 x 0,96 m): 2 folhas com montantes e travessas de 3,5 cm e 21
lâminas de 4,2 cm em relevo (sombra no vão, aresta clara), oliva/verde/cinza por caixa, ferrugem
no pé. As 6 réguas de zinco autorais em frente somem em `chapaHD` (ver `chapa`).

Só o painel liso de 0,72 x 0,85 m vira basculante do atlas (célula 2). O resto é tinta com
ferrugem.

## chapa

Chapa de zinco: tom por painel e ferrugem escorrida; o mapa (`tex_zinco`) e o UV ficam como
estão. Régua fina = caixa com até 4 cm de altura (as réguas da veneziana; telha de 9 cm e beiral
não entram). Com `semRegua` ela some por `discard`: a veneziana de 4 cm vem do painel de ferro
atrás, e as 6 réguas de 14 cm por cima liam como grelha. Sem `semRegua` (`?hdregua=0` ou
`?hdporta=0`) a régua fica galvanizada clara e sem ferrugem.

## lixeira

GLB `dumpster`: a pichação legível da textura vira mancha (leitura com mip 4,5) mais sujeira.
r22: a caçamba verde-oliva vira laranja de coleta desbotado (luma da textura × laranja escuro
saturado, porque o AgX lava), mais pardo onde a sujeira acumula.

## casas-glb

`casa_favela_tijolo`: o atlas cozido é laranja vivo e fica esticado pela escala não uniforme do
molde. Nas faces verticais laranja entra o mesmo `hdBaiano` do `tijoloHD`, projetado no mundo,
com relevo da junta; o atlas só dá a máscara (amostra com viés de mip +3): croma ≥ 0,13 e matiz
(g − b)/croma ≤ 0,26. Madeira, zinco e vidro não mudam.

- r22: croma ×1,15, porque lia rosa-lavado.
- r23: o miolo do molde (≥ 0,4 m para dentro da caixa local: paredes sob a laje/mezanino)
  escurece 40 %; lia tão claro quanto a fachada.

`casa_favela_azul` (r24): a do mirante em (7; −24) é o "volume azul-marinho" da pose, uma parede
lisa azul-escura de 4 x 3 m. Faces de croma azul (b > r e b > g, croma ≥ 0,12) viram pintura azul
lavada sobre reboco: albedo azul-acinzentado escuro e saturado (o AgX lava), grão procedural,
descascado com emboço cinza em manchas (acima de 2,1 m local e no topo), escorrido da laje,
sujeira e mofo no pé (abaixo de 0,45 m). A luma da textura entra só como máscara (mip 3). Faces
horizontais azuis (telhado e beiral de zinco pintado): pó e ferrugem no topo. Madeira, vidro e o
resto do atlas não mudam.

## colunas

Desligado por padrão (`?hdcoluna=1` ou `opts.colunas === true`).

r23: as toras redondas do molde da casa de tijolo viram pilar QUADRADO de concreto no vértice
(`hdCol` = eixo x, eixo z, raio, 1; `sign()` do deslocamento radial × raio; a normal é a normal
geométrica no fragmento), com cimento de forma e pé sujo. No topo de cada pilar vai ferragem de
espera: 4 vergalhões de Ø 12 mm, 25–40 cm, tortos, numa malha fundida só para todas as casas.

r23b, critério de `marcaColunas`: coluna = pelo menos 2 anéis cilíndricos a ≥ 0,3 (local) de
distância no mesmo eixo vertical. Anel = pelo menos 8 vértices na mesma altura (±2,5 mm),
equidistantes (±25 %) de um centro, raio de 0,05–0,25 m de mundo (`escala` = maior escala xz da
malha) e normais radiais (cos ≥ 0,8). A 1ª versão (eixo estimado + células) marcava quads de
parede e a porta do mirante como coluna. No GLB atual (anéis sujos, com costuras) o critério
acha 0 colunas e nada muda. Os topos saem em coordenadas locais porque a geometria é partilhada
pelas 2 casas.

## cobertura-e-casamento

Cobertura (`hdCob`): o mapa visto de cima em projeção ortográfica (40 x 84 m), com o y de mundo
no canal R. Repete aos 4 s por causa de texturas e props que chegam depois. Nunca inclui céu,
cenografia, fiação, vegetação nem transparentes. Dá a sombra de contato sob beiral e a água junto
à parede no piso.

Casamento: o kit entra logo depois do build, antes de `concrete_br`, `tex_zinco` e o tijolo
chegarem (o carregador externo de `map_escadao.js` troca mapa e normal por fora). Por isso
`casa()` reexecuta a cada 1 s por 40 s: material novo entra, e o mapa do kit volta onde foi
trocado.

`marcaCaixas`: cada malha não instanciada dos materiais do kit ganha centro e meia-medida da
caixa em mundo (`hdJc`/`hdJs`) e sorteio + bloco cru (`hdVar`); instâncias tiram isso da
`instanceMatrix` no vértice.

## cenografia

Nada na cenografia tem colisão. Cada família tem o seu limite:

- morro, casario e mata: fora da arena (`|x|` > 34 ou z fora de −46 a 52);
- itens de laje: só em topo ≥ 2,6 m acima do piso jogável;
- fachada: saliência ≤ 12 cm (verga de tijolo sobre os portões, relógio e eletroduto do beco
  oeste);
- postes novos: fora de `bounds` (`|x|` = 19,3, entre o muro e o bairro) ou vestindo os postes
  autorais de 16 cm (seção de 22 cm), com nó de fiação nos do mirante;
- cabos e varais: ≥ 2,4 m acima do piso; travessias dos becos ≥ 3,7 m, de roldana a roldana;
- props de calçada: < 0,8 m, encostados em parede;
- corrimão de cano: à direita dos 3 lances centrais (x 1,74, 6 cm dentro da borda).

Materiais: telhados, fachada, postes e vida dividem um material (um programa); morro, casario e
mata usam os de longe; todos os cabos e cordas vão numa fita só (`hd-fios`). r24e: só as roupas
projetam sombra. Em draw calls, a fita dos fios é +1 sobre a r4.

## fios

Fita virada para a câmera: 2 vértices por ponto, abertos no vertex shader, com largura real de
perto e piso de 2·`FIO_PX` px de longe. Tubo de 1 cm a 30 m virava linha pontilhada que cintila.
A fita é opaca e escreve profundidade: a 75 % de opacidade o feixe de 7 cabos do relógio fundia
com a parede (cabo fantasma). Um draw call, sem luz; é a técnica do Córrego (`fiosHD`).

Cor: cinza-chumbo (`0x3a3c3e` e vizinhos). Preto puro de 1 px virava "corrente" pontilhada.

`hdRes` é o tamanho do buffer de desenho, atualizado em `onBeforeRender` sem alocar, porque a
escada de qualidade muda o pixel ratio.

## morro

Morro do Rio: sobe rápido ao norte e ao sul (fundo do mirante e da rua: raio em z × 1,25), mais
devagar nos lados, com cristas por ângulo. O terreno começa em r = 40 e, até `|z|` ≈ 46, fica
abaixo dos muros de 2 m. `encosta` = 0 no pé e 1 na crista.

- A crista é 25 % mais baixa que a da r4, para sobrar céu acima do morro na pose do mirante.
- r22: cartão de fundo atrás da linha do telhado (poses spawn e escada): de t = 0,25 a 0,6 o
  morro subia mais 22 m (norte e sul inteiro, lados 40 %).
- r24c: esse acréscimo caiu para 14,3 m (−35 %): o topo do morro fica a ~1/3 do quadro do
  mirante, com céu acima. Abaixo de `|z|` ≈ 46 nada muda.

Terreno: anel polar de 192 x 48 de 40 a 170 m, relevo fractal de 3 oitavas (11 / 5,5 / 2,7 m) e
ravinas (cristas invertidas de 19 m) crescendo com a encosta; normais suaves (indexado). Cor por
vértice: mata verde-escura (H 83–87°), terra onde o casario adensa, granito cinza por ruído de
17 m na metade de cima. O shader (`longe.terreno`) põe cachos de copas (fbm de 3 oitavas a
2–4 m) e estrias.

- r24c: terra só no fundo das ravinas (rav > 0,82, cerca de 12 % dos vértices); o resto é mata e
  capim verde-escuro; granito a 60 %.
- r24e: AO de concavidade por vértice (fundo de ravina com rav > 0,6 escurece até ×0,7) e sombra
  da copa no chão (vértices do terreno sob cada copa, raio 0,55·s, escurecem até ×0,6).
- r24e: encosta ao sol +10 %, contra −15 % (n·sol por fragmento); o relevo lia como papel.

## atlas-horizonte

Canvas gerado em runtime, sem textura em disco. Sem r26: 512 px, células de 128.

- Linhas 0–1: 8 fachadas de UM pavimento (parede branca tingida pelo `instanceColor`, janelas
  escuras com caixilho, varanda com guarda-corpo em 3 variantes, marquise).
- Linha 2, coluna 0: laje (cinza com manchas).
- Linha 3: 4 copas (alpha radial em cachos, miolo escuro e borda clara).

r26 (`opts.r26 === false` / `?hdr26=0` volta ao reboco da r24e): morro de favela é bloco cerâmico
à vista. O atlas vira 1024 px (células de 256, desenho em unidades de 512): linha 0 = 4 fachadas
rebocadas (tingidas pela cor da casa), linha 1 = 3 frentes de bloco e a empena cega de bloco,
linha 2 = só a laje. As linhas 1–2 saem em cor própria no shader.

r26c: as colunas 1–3 da linha 2 ficam TRANSPARENTES, como na r24e. Células opacas ali vazavam,
nos mips, para o topo das copas da linha 3 (`alphaTest`) e viravam traços no céu. Pela mesma
razão a copa amostra só até v = 0,228 da célula (22 px de folga no atlas de 1024 até a laje
opaca da linha 2); a cópia 0 das copas já saía com traço no topo na r24e.

Célula de alvenaria = 3,2 x 2,9 m: viga de 20 cm no topo, meio pilar em cada borda (a repetição
fecha um pilar a cada 3,2 m), 14 fiadas de 19 cm.

- r24e: vão recuado nas fachadas rebocadas (verga escura de 2 px, vidro em gradiente, peitoril
  claro de 1 px sobre a sombra do peitoril).
- r26b: janelas de 0,9–1,0 m (36–40 unidades); as de 0,5 m da r26a liam como seteira no morro
  (o crítico cego leu ~0,4 x 0,3 m).

## casario

Layout em FILEIRAS seguindo as curvas de nível, pelo raio elíptico ρ = hypot(x·0,85; z·1,25).

- r24b: 1 fileira a cada 7 m de ρ (≈ 6 m de subida = terraço), casas lado a lado (vão de
  0,5–2 m, 8 proporções de 4–8 m), frente para baixo da encosta (±8°); densidade 0,95 na base
  caindo a 0 em t = 0,6; árvore entre casas em até 10 % e só com t > 0,4; mata = massa contínua
  de t ≥ 0,5 (fileiras de 6,2 m, 92 %). 1–2 pavimentos (3 em 10 %), platibanda de 45 cm em
  todas, caixa d'água azul de topo chato em 25 %, antena em 1/7.
- r24b, paleta calma: 60 % branco-sujo/cinza-claro, 25 % terracota lavada, 15 % lavadas
  (azul/verde/ocre); nunca branco puro (ganho ≤ 1); 45 % das rebocadas com barrado num 2º tom.
- r24c: casario só em t ≤ 0,45 (4 fileiras, ρ 43–64). Nos eixos ±z (poses mirante e escada)
  essas fileiras caíam DENTRO de `foraDaArena` (z ≤ 52 ↔ ρ ≤ 65) e sobrava 1 fileira; o que lia
  como "fileiras de barracos" era a mata amostrando o atlas inteiro (ver `materiais-longe`).
- r24e (layout autorizado, o que vale hoje): fileiras em ρ 55 / 61 e depois de 4 em 4 m até 77
  (3 visíveis em ±z: z 55 / 58 / 62; 6 nos lados), casas lado a lado (densidade 0,85 → 0,6),
  casario até t ≤ 0,65, 1–2 pavimentos; mata = massa contínua de t > 0,65 (fileiras de 5,4 m,
  passo de 5,2 m, 95 %, copas de 4,5–13 m).

Regras que não mudam com a rodada:

- Cada casa assenta na menor altura do terreno fractal nos 4 cantos (−0,3) e o topo fica em
  altura nominal + h: nada flutua nem cruza o solo. O embasamento desce no máximo 4 m (muro de
  arrimo; o fractal tem ravinas de 8 m ou mais) e vira muro de concreto sem janela.
- Perspectiva aérea: a cor é puxada até 25 % ao azul-névoa conforme t; o contraste das janelas
  cai com a distância no shader.
- Os sorteios novos usam gerador próprio (`rng2`, `rng3`): `rng()` é chamado as mesmas vezes e o
  layout autorizado não muda.
- r24e (`rng2`): altura ±0,4 m entre vizinhas (quebra a linha reta do telhado) e, em 15 %, um
  volume secundário na laje (puxadinho de 45 % x 50 % da planta, 2,4 m, num canto).

Acabamento da r26 (`rng3`): T = bloco à vista (48 %), M = térreo rebocado e pintado com o
pavimento de cima em bloco (16 %), C = emboço cinza (10 %), P = pintada (26 %); L = r24e (sem
r26). A r26a tinha 56 / 14 / 10 / 20 e o crítico leu monocultura de terracota. Empena (faces ±x)
cega de bloco em tudo menos em 45 % das pintadas: "só a frente tem tinta".

- r26b: metade das casas com bloco em cima fica com a laje nua, sem platibanda. As esperas de
  pilar da r26a (tocos de 16 cm) ficavam abaixo de 1 px no morro e saíam tracejadas contra o
  céu: saíram.
- r26c: o emboço cinza (C) é fachada rebocada tingida de cimento, sem célula própria no atlas.

## casario-shader

r24e, volume por casa:

- Vértice: a laje (`hdFace` = 1) vira METROS pela escala da instância (sai 20 cm, fica 15 cm
  abaixo e 6 cm acima do topo, onde assenta a platibanda); a face de baixo fica escura (sombra da
  laje). `vHdX.w` = altura. Os pavimentos (`hdRep.y` = número nominal) contam de CIMA para baixo
  em 2,9 m; o que sobra abaixo (`vMapUv.y` < 0 = embasamento/muro de arrimo) vira concreto da
  célula da laje ×0,6, sem janela.
- Fragmento: face ao sol ×1,0 → contra ×0,62; AO na base (15 % de baixo ×0,75) e sob o beiral
  (25 cm ×0,7, sombra da platibanda); face de baixo da laje ×0,7.

r26: `hdAlt` = célula da empena (xy) e do pavimento de cima (zw); `vHdA` = (célula de cima,
número de pavimentos, tom da casa 1,08–1,38). Sob névoa + AgX o bloco do atlas saía vinho; com
esse ganho ele casa com o bloco do bairro autoral. Células das linhas 1–2 do atlas (v < 0,6:
bloco, chapisco, emboço, laje) são "cruas": sem o contraste do reboco, lavagem de distância menor
(30 %), e a tinta da casa (`vColor`) é desfeita e trocada pelo tom. `hdR26` = 0 devolve a r24e.

## mata

Copa (r24e): tufo de 3 quads a 60° com inclinações diferentes; a normal (fora + cima) vale dos
dois lados, sem virar, porque a copa é impostor, e cada quad recebe o sol de ×0,6 a ×1,0.

- r24d: copas, verdes, ganho ×1,6 e `alphaTest` 0,5 EXATOS da r23b. Os tons escuros e
  dessaturados da r24 viravam pardo sob névoa quente + AgX.
- r24e: sombra própria no atlas (gradiente vertical: topo intacto, base ×0,5) e silhueta redonda
  (alpha cai de r = 46 a 64 px); o tufo lia como cartão quadrado.
- Corte em v = 0,228 com r26: ver `atlas-horizonte`.

## materiais-longe

Quatro materiais, um programa cada: terreno (fbm de copas + estrias de granito por posição de
mundo), casario (atlas por instância: célula `hdCel`, repetição `hdRep` = [n janelas,
pavimentos] por `fract`, laje na célula (0; 0,25)), mata (cartão com alpha) e liso.

Névoa: a névoa autoral (`bloom.js` patcheia `fog_fragment` com `owfD`; d = 0,008, cor de
deserto) entra reduzida. A r21 substituía `vFogDepth`, que o chunk patcheado não tem: a névoa
entrava inteira e o morro lia como serra de areia. O replace hoje cobre as duas grafias. A meta
anotada era 55 % (exp2) / 70 % (linear); o código usa ×0,08 no termo quadrático e ×0,4 no
linear.

Sombreado (r24e): a luz do three some sob névoa + AgX, então o sombreado por face é explícito.
`solFrag` põe o uniform `hdSol` (direção do sol do mapa, em mundo; `SOL` vem da
`DirectionalLight` da cena em `cenografiaEscadao`) e roda o corpo depois de
`normal_fragment_maps` com `hdD` = n·sol (espaço de vista, normal já virada para a face vista).
Multiplica `diffuseColor` (o albedo), nunca a névoa nem a exposição.

Amostra do atlas (`atlasUV`):

- r23: `fract(uv·hdRep)` era feito no VÉRTICE (uv = 0/1 nos cantos → fract = 0): a face inteira
  amostrava o canto branco da célula e saía uma caixa lisa laranja. Agora o vértice passa
  uv·hdRep e a célula, e o fragmento faz o `fract`. Janelas do atlas com +50 % de contraste.
- r24e: `vHdX` = (v da parede de 0 a 1 da base ao topo, `hdFace`, −normal.y do objeto, altura
  da instância em m), para o AO de base e beiral.
- r24e: o `#include <map_fragment>` só expande DEPOIS do `onBeforeCompile`. Trocar o
  `texture2D` direto nunca pegava e cada face ou cartão amostrava o ATLAS INTEIRO (casa de 4
  andares com copinha embaixo: o "papel"). O chunk é expandido ali e a troca é feita dentro dele.
- r26: `cel` = expressão GLSL da célula amostrada, `antes` roda antes da amostra, `pos` trata a
  cor amostrada (contraste e lavagem).

`R26` (módulo) é posto por `cenografiaEscadao` antes de montar a cena (r26c): a fachada do spawn
lê para casar o relógio de luz com a parede de bloco.

## telhados

`telhosJogaveis` devolve os topos que o jogador não pisa: colisores largos cujo topo fica
≥ 2,6 m acima do piso jogável (`groundHeightAt`) no centro e nos cantos, medidos por raio de
cima (a laje de borda do mapa fica 12–14 cm acima do colisor), mais os blocos instanciados do
bairro externo (caixas unitárias com escala ≥ 8 m de altura).

`medidorDeTopo`: raio de cima no ponto e em 8 vizinhos a 1 m; fica o acerto mais alto em
[y0 − 0,35, y0 + 1,2]. A platibanda ao lado levanta a base acima da linha do telhado e o pé de
tijolo preenche.

Caixa d'água: polietileno (azul `0x3b6a9e`, S ≈ 0,6, tampa cinza-clara) ou fibrocimento (cinza)
com tampa, diâmetro ≤ 1,15 m, sobre pé de tijolo de 0,9 m alinhado ao eixo Y do mundo e às bordas
da laje. Nunca girado: o GLB `caixa_dagua_fibra` vinha torto 8–10° na origem. O pé vai do topo
nominal (y) ao medido (y + pe) e, às vezes, mais 25–55 cm; sujeira no pé (30 % de baixo mais
escuro e pardo); cano descendo. Sem sombra projetada (o grupo zera `castShadow`).

Fica no canto voltado para o miolo do mapa, a 1,2 m da borda (o pé de 0,9 m fica ≥ 0,3 m dentro
da platibanda). Vergalhões de espera em toda laje ≥ 2 m, no canto oposto à caixa (0,4 m da
borda); as largas (> 3 m) sorteiam uma 2ª no meio.

## fachada

- Relógio de luz: caixa cinza de 30 x 42 x 10 cm com 1 cm embutido na face (fica 0–9 cm da
  parede), tampa, aro escuro de 16 cm e mostrador (vidro escuro de 12 x 12 cm) 1,8 cm à frente
  da caixa. O vidro da r4 ficava DENTRO dela.
- Roldana de porcelana: substitui os cubos de ancoragem; devolve o ponto da borda externa onde o
  cabo sai, para nenhum cabo atravessar o corpo.
- Verga de tijolo exposto sobre cada portão autoral (marco de 0,91 x 2,08 m: colisor
  `escadaoFachadaDetalhe` fino, 2,0–2,5 m): 3 fiadas de 7,3 cm (tijolos de 19 cm, junta de 1 cm)
  por até 1,24 m, 1,2 cm fora do reboco sobre leito de argamassa 2 cm maior; reboco quebrado em
  volta = 7 lascas de emboço de 6–15 cm a 8 mm, borda irregular. Só em parede que não é tijolo
  (`metricTile` 1.65), achada por raio horizontal a partir do marco; a verga é recortada 12 cm
  antes das bordas da parede. Fica acima de 2,1 m.
- Muro de limite (80 m, x = ±17,75) não é fachada: o eletroduto a 2,6 m ficava enterrado no
  mirante e lia como fio solto no spawn.
- Descida de PVC: só em canto onde nenhuma porta ou janela autoral cruza a prumada (1,0 / 2,2 /
  4,5 m). A braçadeira sobre a veneziana do beco (r4) vinha daí.
- Relógio a 1,3 m (9 cm de saliência): 1ª posição livre a ≥ 0,35 m de folha de porta/portão e de
  marco autoral, senão a fachada fica sem. O eletroduto sobe até a caixa de passagem encostada
  na linha da laje (topo do colisor); os cabos do gato saem de uma roldana sob o beiral e entram
  na tampa do relógio.
- r24: sarjeta de 10 cm ao pé das fachadas do mirante e do spawn (`|z|` > 19, piso plano),
  porque o encontro parede/chão lia cru.

## postes

Postes de concreto duplo-T com cruzeta (3 isoladores), travessa baixa, luminária de braço e
caixa de passagem. Três famílias: `veste` = poste autoral de 16 cm (x = ±15 / ±14; a seção de
22 cm o engole, +3 cm por lado) prolongado 2,6 m acima do topo autoral; novo = fora de `bounds`
(`|x|` = 19,3, entre o muro e o bairro), 12 m; longe = atrás dos muros de fundo.

Cabos em fita (`fiador`): 3 na cruzeta + 1 de telecom mais grosso entre postes vizinhos,
descidas para roldanas de fachada e travessias sobre os becos e sobre a escada. Tudo ≥ 3,5 m
acima do piso jogável. As duas travessias baixas de cada beco (x = ∓13,9 ↔ ∓10,1) têm o ponto
mais baixo ≥ 3,7 m: ficam acima do quadro da pose do beco (teto a 3,39 m na parede) e cruzam o
beco inteiro.

Nó de fiação nos postes do mirante (I e H, os que a pose da escada vê contra o céu): caixa de
emenda, rolo de sobra e 10 laçadas de cabo em volta do poste a 2,3 m abaixo do topo, mais uma
ponta solta.

Padrão de entrada no muro de 2 m do spawn (face +z, ponta oeste): relógio encostado (0–9 cm),
pontalete galvanizado ao lado da ponta do muro (x = −3,08) até 1,75 m, 0,25 m abaixo do rufo de
zinco (2,0 m), para não cruzar o beiral do abrigo atrás. O ramal sobe do isolador à roldana no
beiral do prédio de trás (x −3,6; 5,6 m) sem cruzar o rufo (fica a x < −3,05) e de lá vai ao
poste A. O único trecho abaixo de 2,4 m são os 0,5 m iniciais do ramal, colados à ponta do muro
e à fachada, fora da circulação.

r24: o trecho pontalete → roldana (3,7 m quase na vertical) era um cabo de 1,8 cm reto, lido
como "cabo grosso azul-cinza"; virou 2 cabos de 4 mm com catenárias distintas (18 / 26 cm) e
4 cm de afastamento.

r24, poste de laje: poste curto de concreto (2,9 m, seção de 14 cm, cruzeta de 90 cm com 3
isoladores, nó de fiação) sobre a laje mais perto de (3,8; −3,7), a que a pose da escada vê
contra o céu. Dá origem aos cabos que cruzam a escada: 3 à roldana de x −2,2 / 11,6 / −2,6, 2 ao
poste E, 1 de telecom ao poste I.

## beco-oeste

Parede da pose (face x = −13,9, frente de z 10,4): o único trecho livre fica sob a veneziana
(z 9,4–10,4, até 2,41 m).

r22: a caixa clara de 30 x 42 lia como pedestal de reboco, e os 3 fios do gato mais 7 cabos em
fita (feixe de 10 cm) como eletrodutos rígidos ou cano d'água. Hoje: caixa de policarbonato
cinza-escuro chumbada na parede (1 cm embutida) a 1,55 m, com visor; conduíte corrugado preto SÓ
vertical (descendo enterrado e subindo até a caixa de passagem no peitoril, a 2,41 m); 3 fios do
gato em fita, com barriga própria, entram na caixa de passagem; dela saem 3 cabos pretos de
4–5 mm com catenárias distintas (6–16 cm) até a roldana da pilastra de z 9,29, sobem colados a
ela e cruzam a fachada a 3,9 m até a pilastra de z 11,51. Um fio de extensão laranja desce do
relógio e corre pelo pé da parede até os caixotes no pé do portão (z 11,0).

`becoOeste` não usa rng: o sorteio da fachada não muda.

## roupas

Cores (`PANOS`): roupa lavada (S 0,25–0,45, meio-tom), sem bege nem rosado quente (nada com H
10–40° e S > 0,12: lia como pele) e nada vermelho-sangue; os neutros são frios para não virarem
bege sob o sol quente. Pregadores de madeira clara cinzenta e de plástico.

Atlas de tecido (canvas de 512, gerado em runtime): trama fina (linhas de 1 px a cada 2 px,
±4 %), silhueta por alpha e estampa em cinza; a cor vem do vértice. São 5 colunas de 102,4 px:
0 camiseta (mangas e gola), 1 calça (2 pernas, costuras), 2 lençol (alpha 0,92: translúcido),
3 toalha (barras nas pontas), 4 pano de prato (xadrez). A linha 1 repete as peças com estampa
(listras / bolinhas / xadrez). Lençol, toalha e pano ocupam a célula inteira; camiseta e calça
têm a silhueta recortada.

Malha (`roupeiro`): grade de 6 x 8 por peça com caimento (barriga entre pregadores, dobra
lateral que cresce para baixo, torção de ±4°), normais suaves por diferença finita DEPOIS de todo
o deslocamento, AO por vértice nas dobras (vales 22 % mais escuros), uv na célula do atlas.

r24e (volume): barra/bainha e costuras no atlas (faixa escura de 3 px, ≈ 2 cm, por dentro da
silhueta); ombro assimétrico (±2 cm, da fase); 1 peça em 4 (camiseta ou calça) com a ponta de
baixo dobrada para a frente; sombra do pregador nos vértices de cima; VERSO = 2ª camada 1,2 cm
atrás (−normal) com cor ×0,85 e vento invertido. Sombreado explícito do pano (face ao sol ×1,0 →
contra ×0,64), translucidez (sol atrás: ×1,15 no lençol, ×1,05 no resto, `hdFino`) e a malha
projeta sombra na parede e na peça vizinha (o depth material do three usa map + alphaTest).

Os varais autorais do mapa (`userData.escadaoVaral`: GLB `varal_roupas_01/02` ou corda + 3
caixas) somem e o kit pendura as peças na mesma corda. Varal entre fachadas: corda ≥ 3,0 m e
panos até 0,85 m abaixo, nunca na cabeça.

## comercio

- Toldo: lona listrada com lambrequim e armação tubular, borda baixa a 2,45 m (acima da cabeça).
- Porta de enrolar: lâminas contínuas de passo 8 cm de mundo (corpo de 6,5 cm + lábio de 1,5 cm
  25 % mais claro, 6 mm à frente: a quebra de tom lê de longe), azul-aço desbotado (S ≈ 0,2 antes
  do AgX) com tom por lâmina ±4 %, sujeira escurecendo os 35 cm de baixo e ferrugem crescente
  nos 40 cm (com respingo), guias em U de 7 cm, capa de 12 cm, puxador no centro.
- Interior da mercearia: malha SEM luz (`MeshBasicMaterial`, lê como emissivo fraco), tudo à
  frente da parede autoral sólida (≤ 7 cm). +1 draw call.
- Boca de comércio do mirante (parede de fundo do abrigo, z = −23,3, 4,4 x 3,2 m, lisa): porta
  de enrolar meio aberta (0,9 m), toldo, placa azul/amarela, relógio, janela gradeada (0,8 x
  0,45 a 1,9 m), freezer branco à direita e 2 engradados na calçada.
- Placas pintadas à mão, texto genérico, sem marca. A tabuleta de preços é desenhada só nos
  430 px da esquerda do canvas (proporção 0,62 x 0,46).
- Botijão (`botijao_gas.glb`): textura escura + metalness pelo mapa dava quase preto sem envmap;
  vira P13 cinza-aço fosco `0x7c8084` num lote próprio.

## fachada-spawn

r24. Fachada do bloco do bairro externo visto do spawn E (face x = −20,5, z 23,7–29,3; janelas
autorais em z 25,25 / 27,6 a 1,62 / 4,52 / 7,42 m): ar-condicionado de janela com bandeja e
mãos-francesas (janela de z 27,6 a 4,52 m), caixa de luz a 1,3 m com eletroduto subindo até uma
roldana e 2 cabos em catenária ao poste A, varal de parede entre as janelas (3,6 m, panos até
0,85 m abaixo), porta escura com marco e marquise fina de 60 cm com pingadeira (z 26,4). Tudo
fora dos limites (x < −17,9).

r26: sobre o bloco a caixa do relógio lia como mancha de cabeça na faixa do corpo (cinza: ΔRGB
38; parda: ΔE 13). Sobe para 2,05 m (padrão alto, fora da faixa de 0,6–1,9 m) em chapa parda;
sem r26 fica onde estava, a 1,3 m.

Calçada de 1 m com meio-fio de 15 cm ao pé do mesmo prédio (z 23,4–29,6): tapa os 5 cm entre o
solo externo a −0,05 e a base do bloco; balde de plástico e caixa de feira encostados na parede.

## corrimao

Corrimão de cano no lado direito dos 3 lances centrais (x = 1,74, 6 cm dentro da borda; o
autoral fica à esquerda): montantes verticais de 4 cm a cada 4 degraus, cano de Ø 4 cm a 0,94 m
paralelo à rampa, verde-escuro lascado, sem colisão (`nonSolidSurface`).

- O pé do montante vem do piso REAL amostrado (`groundHeightAt`); a rampa média afundava 9 cm no
  degrau.
- O cano baixo a 0,5 m só existe nos dois primeiros lances: no 3º (pose escada, visto de viés do
  patamar 2) o par de canos paralelos lia como corrimão inclinado 13° para fora.

## miudezas

r23 (`opts.r23`):

- Fios finos: os cabos autorais (grupo `escadao_fiacao`: cilindros de 2–5 cm, retos, soltos no
  ar) somem e os mesmos ramais (`userData.escadaoRamais`: a, b, queda) voltam em fita de 4 mm
  com a MESMA catenária, presos em roldana de porcelana (face x = ±2,2 das frentes da escada)
  ou em isolador no topo do poste autoral (`|x|` ≥ 14).
- Parapeito de tijolo (3 fiadas de 7,5 cm, 20 cm de espessura, recuado 5 cm da borda): são os
  topos de "cartão" das poses escada e spawn.
- Caixilho fino e peitoril nas janelas instanciadas do bairro externo: de longe liam como
  retângulo cinza.
- Mão-francesa sob as prateleiras de zinco dos vasos autorais (placa de 48 x 6 cm a y − 0,2).
- Mureta de bloco no patamar 2 e no mirante, bicicleta encostada na casa de tijolo: ambos no
  quadro da pose.

r24 (`opts.r24`): tampa de bueiro de ferro fundido no mirante (Ø 62 cm em (1,6; −28,2)) e
sarjetas ao pé da mercearia e dos dois muros do spawn.

## rodadas

| Rodada | O que entrou (resumo) |
| --- | --- |
| r4 | primeira cenografia; referência de crista do morro, de draw calls e do relógio de luz |
| r15 | referência de tom do tijolo |
| r21 | névoa do fundo ainda substituindo `vFogDepth` (defeito corrigido depois) |
| r22 | chapisco-esponja, variantes do descascado, mofo, lixeira laranja, cartão de fundo do morro, beco oeste |
| r23, r23b | variantes de albedo do reboco, canaleta central, degrau remendado, janela de longe, colunas, `fract` no fragmento, fios finos e miudezas |
| r24, r24b–r24e | grão procedural, projeção por eixo da face, rodapé, casa azul, piso do mirante, fileiras do casario, volume por casa, copas, roupas com verso e sombra |
| r26, r26a–r26c | bloco cerâmico à vista no bairro e no morro, atlas de 1024, relógio alto na fachada do spawn |
