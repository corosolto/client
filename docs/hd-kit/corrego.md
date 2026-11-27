# Kit HD do Córrego: tabelas e histórico

O kit mora em dois arquivos de `public/js/`: `map_corrego_hd.js` (materiais, água, vãos, luz e as
frentes r26) e `hd_cenografia_corrego.js` (postes, fios, lajes, telhados, canal, comércio, skyline,
tudo sem colisão). Os atlas de janela e porta vêm de `hd_detalhes_lajes.js`.

Nos arquivos o comentário cabe em duas linhas e diz só a invariante ou o risco daquele ponto
(portão `tools/eval/comentario-check.mjs`, cláusulas CM1 e CM2). Causa, medida, rodada e
alternativa rejeitada ficam aqui; o comentário aponta para a seção com
`docs/hd-kit/corrego.md#âncora`.
O título de cada seção é a própria âncora. As rodadas (r17, r18, r26) são as rodadas de revisão do
kit em que a mudança entrou, como estavam anotadas nos comentários originais. "Lia como" descreve
o defeito visto na captura da pose citada.

## interruptores

O kit inteiro só liga com `?hd=1` (demo de gráficos, desligado por padrão). Todo interruptor
abaixo é lido em `aplicaCorregoHD` (`liga(opção, query)`: desliga com `opts.<opção> === false` ou
`?<query>=0`) e tudo volta ao estado do mapa em `desliga()`.

Frentes de material e ajustes:

| Query | Opção | O que desliga |
| --- | --- | --- |
| `?hdmadeira=0` | `opts.madeira` | frente `madeira`: tábua e compensado (`madeiraHD`, `tapumeR26`), pilar da travessia (`pilarHD`/`pilarR26`), ripa (`\|8a6a4e`) e ferro de espera (`\|7c6a52`) |
| `?hdchao=0` | `opts.chao` | rua (`chaoHD`/`chaoR26`), o campo de fachadas e a limpeza dos tufos (`matoHD` exige `chao` e `mato`) |
| `?hdmato=0` | `opts.mato` | mantém todos os tufos de capim autorais |
| `?hdreboco=0` | `opts.reboco` | reboco pintado (`rebocoHD`) |
| `?hdcanal=0` | `opts.canal` | concreto e fundo do canal, assoreamento, alagado, lâminas, espuma e limo autorais, `aguaHD` e `afundaEspuma`; também tira os itens `canal` e `margem` da cenografia |
| `?hdbloco=0` | `opts.bloco` | tijolo cru (`blocoHD`/`tijoloR26`) |
| `?hdjanela=0` | `opts.janela` | vãos: `janelaHD`, `marcaVaos` e os atlas de janela e porta |
| `?hdeletro=0` | `opts.eletro` | shader da geladeira/caixa de energia e do pilar da travessia: sobra só a cor e a rugosidade da regra (chapado, nunca o material original) |
| `?hdespuma=0` | `opts.espuma` | espuma marrom da água junto aos muros (remendo do fragmento em `aguaHD`) |
| `?hdtravessia=0` | `opts.travessia` | frente `travessia`: tabuleiro de concreto, mureta de bloco no vão e grade de ferro chato na rampa (volta a madeira); o item `guarda` da cenografia sai junto |
| `?hdpoca=0` | `opts.poca` | poça e mancha úmida do chão (hoje são padrão) |
| `?hdcalcada=0` | (sem opção) | campo de distância às fachadas: calçada e sarjeta voltam à lista fixa de `\|x\|`; sem o campo, `rua3` e a vala do canal também não entram |
| `?hdluz=0` | `opts.luz === false` | `luzHD`; `opts.luz = { hemi, ceu, chao, sol }` ajusta sem desligar |

`opts.texturas === false` não casa nenhuma regra de material (nem cria o campo de fachadas, nem
roda `propsGLB`). `opts.mundo` é o mundo do jogo (padrão `window.__game.world`), de onde vêm os
colisores.

Frentes r26 (barracos e caminhos "de obra"). `?hdr26=0` ou `opts.r26 === false` volta ao visual
anterior inteiro: nenhuma função r26 roda e o shader é o da rodada anterior, byte a byte. Cada
frente só vale com a geral ligada:

| Query | Opção | O que desliga | Seção |
| --- | --- | --- | --- |
| `?hdr26=0` | `opts.r26` | todas as frentes abaixo | |
| `?hdtijolo=0` | `opts.tijolo` | bloco cerâmico 29 × 19 (`tijoloR26`, `guardaR26`) e a capa de argamassa da mureta (`capaMuretaR26`) | `bloco-r26` |
| `?hdrua3=0` | `opts.rua3` | rua em 3 faixas (trilha, margem, cimentado) com vala, remendos, poças e tampa (`chaoR26`, `VALA_R26`); precisa do campo de fachadas | `rua3` |
| `?hdobra=0` | `opts.obra` | pilares de fôrma de tábua (`FORMA_R26`, `pilarR26`), escada da travessia (piso × espelho por paralaxe, `ESCADA_R26`), sofito, mureta rebocada, guarda de uma cor (`guardaR26Cen`), vigas e adutora (`obraTravessia`) | `obra`, `obra-cenografia` |
| `?hdtelha=0` | `opts.telha` | fibrocimento/zinco em chapas e borda fina sobre terça (`chapaR26`), caibros, mãos-francesas e lastro (`telhadosR26`); as cumeeiras soltas voltam (`cumeeirasR26`) | `telha` |
| `?hdtapume=0` | `opts.tapume` | colcha de painéis (tábua em pé, madeirite, zinco) no barraco (`tapumeR26`) e no tapume da palafita (`colcha` em `madeiraHD`); quadro de caibro (`quadroBarracoR26`) | `tapume` |
| `?hdestaca=0` | `opts.estaca` | estacas, barrotes e viga de borda das palafitas (`estacasR26`) | `palafitas` |

Cenografia (`hd_cenografia_corrego.js`):

| Query | Opção | Efeito |
| --- | --- | --- |
| `?hdcen=0` | `opts.cenografia === false` | desliga toda a cenografia |
| `?hdcen=postes,fachadas` | `opts.cenografia.<item> === false` | liga só os itens listados (`?hdcen=1` liga todos) |

Itens de `opts.cenografia` (lista `ITENS` do kit) e o que cada um muda:

| Item | O que desenha | Efeito no kit quando desligado |
| --- | --- | --- |
| `postes` | isoladores, luminária, nó de fiação e cabos dos postes do mapa; postes de concreto da rua do spawn | os gatos autorais baixos sobre a travessia ficam (`gatosHD` não roda) |
| `fachadas` | cano, relógio, eletroduto, gato e ramal | |
| `palafitas` | pilotis, viga, parede de bloco, réguas do tapume; com `estaca`, as estacas r26 | |
| `lajes` | caixa d'água, antena, parabólica, varal de laje; caixa e varal do tabuleiro (`mirante`) | |
| `telhados` | remendo de fibrocimento e lastro; telhados cerâmicos; com `telha`, caibros e mãos-francesas r26 | |
| `canal` | guia da beira, junta de piche, esgoto e lixo do canal | |
| `margem` | lixo da margem | os tufos de capim ficam onde estavam |
| `varais` | varal com caimento e gato atravessando o beco 1 | |
| `roupas` | pano na linha baixa do varal autoral | os retângulos de roupa autorais ficam (`roupasHD` não roda) |
| `sacos` | nó dos sacos autorais, sacolas, papelão e tijolos | os sacos autorais ficam redondos (`sacosHD` não roda) |
| `toldos` | toldo e placa cega em 3 fachadas da fileira B | |
| `comercio` | bocas de comércio (porta de enrolar, placa, freezer) | |
| `guias` | guia de sarjeta nas fachadas de rua | |
| `skyline` | prédios de SP no horizonte | |
| `portoes` | portões e basculantes de tela, ferragem do portão do barraco (ou quadro de caibro r26) | |
| `becos` | kit de viela | |
| `guarda` | grade das rampas, pingadeira, pilaretes e degraus da travessia | a grade da rampa é pintada pelo shader (`guardaHD`/`guardaR26` com `rampa = true`) |

`guarda` só existe com a travessia de concreto (`o.travessia`): quando ela entra, o shader da
guarda descarta a mureta autoral da rampa. A cenografia recebe do kit `mundo`, `ceramicos` (ver
`chapa`) e `r26` (as frentes ligadas).

## materiais

O mapa não nomeia materiais. A chave de `REGRAS` é o nome do arquivo do mapa de cor (ou `canvasN`
para canvas de N px) + `|` + a cor do material em hexadecimal; material sem mapa tem chave
`|cor`. Todo `pbr_paintedplaster017*` cai em `pbr_paintedplaster017_color|*`, e `tex_madeira|ffffff`
com `repeat` 1 × 1 vira `tex_madeira|ffffff|guarda` (matGuarda usa um sampler clonado; o
tapume e a ponte usam TEX.wall com `repeat` 2 × 2). A textura chega assíncrona: o casamento repete
até 20 s. A origem de cada cor é `map_corrego.js`.

| Chave | O que é no mapa | Regra | Frente |
| --- | --- | --- | --- |
| `asphalt_br\|ffffff` | rua (TEX.asphalt); todo o chão de rua é este, `dirt_field` não chega a material nenhum | `chaoHD`; `chaoR26` com `rua3` e campo | `chao` |
| `pbr_paintedplaster017_color\|*` | reboco pintado (oito tintas de `CORES_ALVENARIA`) | `rebocoHD` | `reboco` |
| `pbr_bricks051_color\|ffffff` | tijolo cru: último pavimento, faixas do sobrado, pilha de tijolo | `blocoHD`; `tijoloR26` com `tijolo` | `bloco` |
| `concrete_br\|8f8b80` | parede e rampa do canal | `concretoHD` `canal`; com `rua3` e campo ganha a vala | `canal` |
| `concrete_br\|6f6f61` | fundo do canal | `concretoHD` `piso` | `canal` |
| `concrete_br\|b4ada0`, `concrete_br\|8d8579` | embasamento, lajes (o topo é o piso da laje do sobrado), platibanda | `concretoHD` `parede` com rodapé | |
| `concrete_br\|9d968a` | pilar das casas/palafita e poste de distribuição | `concretoHD` `parede`, AO 0,30, ganho 2,3, rodapé, juntas; com `obra`, fôrma de tábua (menos os 12 postes de `POSTES_R26`) | |
| `concrete_br\|9a8f7e` | entulho | `concretoHD` `entulho` | |
| `concrete_br\|8a867c` | manilha | `concretoHD` `entulho` | |
| `concrete_br\|ffffff` | pilar da cobertura | `concretoHD` `parede` | |
| `concrete_br\|3f7f9c` | caixa d'água cúbica | só cor e rugosidade | |
| `concrete_br\|2b2a27` | matVao: porta 1,0 × 2,1 e janela 1,0 × 1,0 das casas | `janelaHD` | `janela` |
| `tex_madeira\|ffffff` | tábua da ponte, tapume da palafita | `madeiraHD` `tabua`; com `tapume`, colcha nas faces verticais acima de 2 m | `madeira` |
| `tex_madeira\|ffffff\|guarda` | guarda-corpo da travessia alta (matGuarda) | `guardaHD`; `guardaR26` com `tijolo` | `travessia` |
| `tex_madeira\|9a8f7e` | tablado da travessia e pranchas laje → travessia | `concretoHD` `tabuleiro`; com `obra`, escada | `travessia` |
| `tex_madeira\|b08a6a` | barraco de passagem (matBar) | `madeiraHD` `compensado`; `tapumeR26` com `tapume` | `madeira` |
| `tex_madeira\|8a6a4e` | matMadeiraBruta: vigas da travessia, tapume largo do puxadinho, paus de tampo, pilares da prancha | `madeiraHD` `compensado` | `madeira` |
| `tex_madeira\|7a5a3a` | pilares da travessia (matMadeira; vira cor pura) | `pilarHD`; `pilarR26` com `obra` (ambos só com `eletro`) | `madeira` |
| `tex_zinco\|ffffff` | telhados e barracos | `chapaHD`; `chapaR26` com `telha` | |
| `\|8a6a4e` | matRipa: mão-francesa da palafita, mureta da prancha, guarda do sobrado, cavalete | cor e rugosidade | `madeira` |
| `\|7c6a52` | matVerga (ferro de espera) | cor e rugosidade | `madeira` |
| `\|9d968a` | matConcretoFino: cruzeta, verga, escada | `concretoHD` `parede` | |
| `canvas128\|7a5a3c` | tambor | `linhaDaguaHD` | |
| `canvas128\|d6d3cb` | geladeira do canal (1,5 × 1,8) e caixa de energia do poste | `geladeiraHD` (com `eletro`) | |
| `canvas512\|6b6350` | assoreamento das pontas do canal | cor e rugosidade | `canal` |
| `canvas512\|3e5c40` | faixa de limo autoral (T.dirt) | `limoHD` e `limoTopo` | `canal` |
| `tex_agua_poluida\|42543b` | alagado das pontas e poças | cor e rugosidade | `canal` |
| `tex_agua_poluida\|8fc4b4`, `\|73927a`, `\|c2e0d5` | lâminas de reflexo, poça e brilho do canal | cor, opacidade, rugosidade | `canal` |
| `\|f0ecd3` | placas de espuma autorais (7 caixas + 4 bolhas, cor pura emissiva) | `espumaHD` | `canal` |
| `\|252925`, `\|3d4435`, `\|24211f` | sacos de lixo | `sacoHD` (pregas) e `sacosHD` (forma) | |

Regra sem frente entra sempre que `opts.texturas` não for `false`.

Fora da tabela (GLBs e instâncias sem chave útil):

- `ROUPAS`: as seis cores puras de matRoupa (retângulos instanciados do varal autoral) vão a
  escala zero em `roupasHD`; os panos novos são da cenografia.
- `propsGLB`: a "poça azul" fora do canal é a caixa d'água caída na rua (`caixa_dagua`, azul
  saturado → polietileno encardido); o botijão (`botijao_gas.glb`, material `defaultMat_1001`
  branco sem mapa) vira P13 cinza-aço encardido.
- Cumeeira r26: instância de 0,34 × 0,12 m da placa de referência 3,4 × 0,1 × 5,6 (`cumeeirasR26`).
- Todo material criado pelo kit tem nome começando com `hd-`.

Texturas: `tex()` lê de `hd_lajes` (concreto de piso com tile de 1,9 m, concreto de fôrma 1,8 m,
reboco 1,7 m, chapa ondulada) e o reboco usa `pbr_bricks051` (tijolo sob o reboco e grão do
bloco), tudo CC0 já no repositório; `*_cor_rug` leva a rugosidade no alfa. Até a r26 o kit não
trazia textura nova; a r26 lê `hd_corrego/bloco`, `hd_corrego/tabua`, `hd_corrego/fibro` e
`hd_sertao/dry_ground_rocks_cor` (guardadas em `texR26` e dispostas em `desliga()`). Os atlas de
janela e porta são canvas de 1024² gerados na hora. Além deles, a única textura criada pelo kit é
o campo de fachadas (ver `campo-de-fachadas`).

Notas do inventário de materiais:

- A área do inventário é a caixa envolvente do lote mesclado (1 malha): tambor e matVao somam
  milhares de m² sem ser chão nem muro.
- `forma_color` tem média sRGB 106 (linear 0,14) e o lote multiplica AO por vértice. Por isso o
  concreto de fôrma leva cor quase branca e AO atenuado no shader (`aoMeio`), senão pilar e faixa
  em sombra viram marrom-preto. `r.ganho` multiplica o albedo da fôrma: o pilar das casas precisa
  de ≈ 0,25 para não ler preto à sombra.
- Alagado das pontas: rugosidade 0,74. Com 0,32 aparecia uma elipse branca de sol na ponta do
  canal (poses `ponte` e `alto`).

## poses

As poses de captura são `VISTAS.corrego` de `hd_lab.js` ([x, y, z, yaw, pitch]; frente =
(-sin, -cos) do yaw):

| Pose | Posição | O que enquadra |
| --- | --- | --- |
| `rua` | (−21; 0; −5), yaw −1,571 | rua do spawn oeste, olhando +x |
| `ponte` | (0; 0,4; 0), yaw 0 | o canal, de z = 0 para −z |
| `parede` | (−9,7; 0; −14,6), yaw 3,14 | fachadas e pilares, olhando +z |
| `alto` | (−4,6; 5,6; −11), yaw −0,785 | de cima do tabuleiro da travessia, olhando (+x, −z) |

`noAlto(x, z)` devolve verdadeiro dentro do cone da pose `alto` (4 a 48 m, cosseno > 0,72):
lajes e telhados ali têm prioridade.

## faixa-do-corpo

Entre 0,45 e 2,1 m acima do piso só entram tinta uniforme, junta e grão: mancha, ferrugem, limo
e remendo ficam abaixo ou acima. `hdCorpoF(y)` mede em y de mundo (0,42–0,58 a 1,92–2,12);
`hdCorpoP(y)` repete a faixa a cada pavimento (`mod 2,8`). No reboco a faixa é relativa a cada
piso andável (lajes a 2,8k, travessia a 5,6, palafita a 2,2): em y de mundo, a palafita (corpo a
2,2) e a parede alta da pose `alto` descascavam na altura do torso. Na cenografia r26,
`foraDaFaixa(mundo)` devolve um teste (x, y0, y1, z) que é falso quando o trecho vertical cai
entre 0,6 e 1,9 m acima de algum piso que o mapa conhece naquele ponto (`groundHeightAt` em
várias camadas: leito, rua, andar do sobrado, laje/travessia).

## rua

`chaoHD` (rodada anterior à r26; continua valendo com `?hdrua3=0` ou sem campo):

- Cimentado em placas de 2,5 × 3,0 m (junta de 1,5 cm, tom por placa), grão fino, remendo de
  asfalto escuro e frio com borda nítida e cordão de piche (≈ 20 % da área, mais denso a < 3 m das
  fachadas), brita miúda mais escura.
- Canaleta no eixo do passeio da beira e do beco A–B (`|x|` 6,55 / 13,3).
- Calçada de concreto claro de 1,2 m no pé de CADA fachada (`hdDs` = campo de distância aos
  colisores das casas; a guia geométrica da cenografia fecha em 1,26 m), com junta a cada 1,2 m ao
  longo da fachada e sarjeta úmida logo fora da guia. Só a viela A–B (`|x|` 12,2–15,1) é beco sem
  calçada, mais escuro e com AO no pé das paredes.
- Sem campo (sem colisores, ou `?hdcalcada=0`) volta a lista fixa de `|x|` (7,45 / 12,2 / 15,1 /
  18,85 / 22,45), que nunca dava calçada à face −z do bar nem às faces do largo do spawn.
- Poça rasa (rugosidade 0,15, sem cubo) e mancha úmida; duas poças fixas de borda irregular na
  rua da pose `rua`, espelhadas.
- Hierarquia: calçada (≤ 1,22 m) | guia clara de 15 cm | sarjeta úmida escura (1,37–1,85) | faixa
  de asfalto no meio da rua (≥ 1,9 m de toda fachada, só entre as fileiras: `|x|` > 7, nunca na
  beira do canal). Rua estreita (beco) fica em cimento. A emenda cimento/asfalto em `|x|` ≈ 7 é
  ondulada (ruído de ±0,5 m ao longo de z): a reta lia como costura de textura (pose `rua`).
- Remendo retangular no asfalto (`|x|` 18,5–20,5, `|z|` 4,4–6,0: pé da pose `rua`) e tampa de
  bueiro Ø 60 cm em (±15,6; ±4,6), espelhados nos quatro quadrantes.

Albedo: `piso_cor_rug` tem média linear 0,12; com cor `0x96` o cimento ficava em 0,04, mais
ESCURO que o asfalto de 0,185, e era o asfalto que lia como "rua clara". Hoje o cimento fica em
≈ 0,19 de luminância pura com tinta fria (0,955 / 1 / 1,06: o sol `0xffc888` levava o neutro a
R−B 19 e a sombra sob a rampa lia como terra) e o asfalto em 0,135 (luma ≈ 0,07 na faixa do meio,
≤ 45 % do cimento).

Grão: cada frequência (3 cm e 1,1 cm) some pelo seu próprio `fwidth` e a metade da amplitude.
Abaixo de 4 px por ciclo o ruído de 1 cm virava "sal" no laplaciano.

Rua de favela de planície em SP é cimentado e asfalto remendado, não terreno baldio com tufo
seco: é a razão de `matoHD` (ver `mato`).

## rua3

`chaoR26` (frente `rua3`): três faixas — trilha batida nos eixos da planta (os três longitudinais
e, entre a beira e a rua do spawn, os becos transversais), margem solta com brita e cacos, e
cimentado junto às paredes — mais vala, remendos, poça na guia e tampa de ferro. Precisa do
campo de fachadas; sem ele quem entra é a `chaoHD`.

- Terra batida sem trinca: do `dry_ground_rocks` só entram a mancha (mip +4) e o pedrisco borrado
  (mip +2); a trinca fina dele some.
- Cimentado: borda por ruído em duas escalas, sem aresta reta (quase reta só na rua do spawn, sob
  a guia).
- Pedrisco: seixo anguloso de 0,5–1,8 cm em 3 de cada 10 células de 7 cm (menos na trilha
  batida), com meia-luz; some abaixo de ~1 px.
- `VALA_R26`: a vala de água servida chega ao canal como canaleta escura no topo do muro (`|x|`
  3–5) e escorrido na face, nos mesmos z do `chaoR26`.

## campo-de-fachadas

`campoFachadas(cols)` gera a `DataTexture` `hd-fachadas` (384 × 640, 8 px/m sobre 48 × 80 m, ~1 MB,
sem disco, disposta em `desliga()`) que o chão lê em `hdFachadas`: R = distância (0–4 m, 1,6 cm
por passo), GB = normal da fachada mais perto (as juntas da calçada correm ao longo dela). Entram
os colisores de casa: base ≤ 1,1 m, topo ≥ 2,2 m, lado ≥ 1,2 m, entre o passeio da beira e o muro
externo — o corpo de cada casa, sobrado e barraco de passagem; não os pilares, postes, muro e
entulho. A rotação é a mesma de `colRot`/`mundoDe` (a = cos, b = sin).

## concreto

`concretoHD` trata fôrma (paredes, pilares das casas, postes) e piso (canal): mancha macro e
média, grão, escorrido e pé sujo.

- `CANAL`: linha d'água (limo até 45 cm acima da lâmina de −1,61 m, crosta clara, submerso
  escuro) e beiço sujo na aresta da margem. Topo do muro fosco e com AO de 8 cm na aresta: o alfa
  do `piso_cor_rug` dava brilho ao sol, uma linha branca de 1 px a 20 m.
- `LINHA` (`entulho`: manilha, caco, saco): só a linha d'água e o pé sujo, esteja a peça onde
  estiver; submerso escuro, limo até 40 cm acima.
- `RODAPE`: rodapé pintado de 40 cm, borda dura, cinza-escuro frio (embasamento e pilares das
  casas; só acima do nível da rua, porque a mureta da rampa do canal fica em y < 0). Faz a base
  da parede ler como acabamento, não como mancha de borda macia.
- `laje()`: topo/fundo horizontal do concreto de fôrma (piso da laje do sobrado, faixas). A fôrma
  tem veio de tábua e lia como deck; vira cimento queimado cinza-frio (0,218 / 0,240 / 0,260: o
  sol `0xffc888` aquece o neutro em +30 de R−B) com junta de desempenadeira a 1,2 m, ~1 placa em
  14 remendada e mancha de umidade. `umi` é o fator GLSL da mancha: o tabuleiro só a aceita no
  plano horizontal, porque na rampa os borrões de 2–3 m liam como pelagem. O relevo da fôrma cai a
  30 % no plano (as veias liam como tábua).
- `aoMeio(k)`: o AO por vértice do lote (`vao.js`) entra atenuado; com o AO cheio, pilar e faixa
  de laje em sombra viravam marrom-preto.
- `JUNTAS` (matPilar das casas/palafita): junta de fôrma a cada 60 cm (albedo + normal inclinada:
  aresta clara/escura ao sol), escorrido de ferrugem só acima de 2,1 m e mofo verde-escuro de 0 a
  0,4 m. Antes lia chapado (pose `parede`).

## travessia

Em córrego canalizado de SP a travessia é laje de concreto, não tábua: por isso o tablado
(`tex_madeira|9a8f7e`) vira concreto `tabuleiro` e o guarda vira mureta e grade (ver `guarda`).

- Tabuleiro (x −5…5, z −11 ± 1,25), só no plano horizontal de cima: 2 juntas de dilatação em
  x = ±1,7, ferrugem escorrendo da base de cada montante (x = 1,4k − 0,7 nas duas bordas) para o
  meio e poça seca (anel escuro, miolo claro). Concreto cru (40 % da fôrma projetada, relevo a
  55 %), não cimento queimado liso, que lia como cartão bege chapado.
- Rampas (plano inclinado, 0,7 < n.y < 0,95, z −11 ± 1,3): ranhuras antiderrapantes transversais
  de 2–3 cm a cada 30 cm ao longo de `|x|` (decalque escuro, some por `fwidth`). A rampa lisa a
  30° lia como escorregador (pose `rua`). Os degraus do pé são da cenografia.
- `MANTA`: topo (`hdGn.y` > 0,7, nunca o fundo) em cimento queimado; AO de 10 cm na aresta
  longitudinal (z −11 ± 1,25). A manta asfáltica preta (só no plano horizontal, > 0,95, em placas
  de 1,2 m de borda nítida) está desligada (`hdManta = 0`): sob o sol quente lia como placas de
  terra em xadrez (r17/r18); ficou só o cimento queimado com juntas.
- Face inferior vista de baixo (`hdGn.y` < −0,5, a normal geométrica aponta para a câmera):
  albedo × 2, AO de vértice 0,1, sem escorrido e um rebatimento falso (emissivo de 10 % do
  albedo). Só o hemisfério de chão chega lá e com ×1,6 ainda lia preta.

## obra

Frente `obra` da r26:

- `FORMA_R26` (pilar das casas, palafitas e pórticos, matPilar): fôrma de tábua em pé e junta de
  concretagem a ≈ 1,3 m + 1,4k no lugar dos anéis de 60 cm. Nata e bicheira só fora da faixa do
  corpo de cada pavimento. `POSTES_R26` copia `POSTES` de `map_corrego.js`: o poste de
  distribuição divide o material com os pilares e fica com o desenho antigo (`JUNTAS`).
- `ESCADA_R26`: a rampa da travessia (31 degraus de 27,7 × 18,1 cm) ganha degrau PINTADO por
  paralaxe sob o plano; na lateral o dente é descartado. Colisão, sombra e profundidade continuam
  as da rampa lisa (o pé fica até 18 cm acima do piso pintado).
- `pilarR26` (pilar da travessia): fôrma de 2 tábuas por face, junta de concretagem, quina
  lascada, lama no pé, escorrido do topo, limo no leito. Centro e meia-largura saem da planta
  (x ±1,5 | ±7,15 | ±9,73 | ±12,31; z −11 ± 1,05).
- `guardaR26` com `obra`: por fora, a mureta do vão é bloco de concreto rebocado em panos de
  ≈ 3 m, com 1 pano de tijolo por lado.
- Cenografia: ver `obra-cenografia`.

## pecas-do-leito

- `linhaDaguaHD` (tambor, sem mapa): ferrugem em mancha, faixa de ferrugem laranja-escura de
  10 cm logo acima da lâmina (−1,61 m), limo verde-escuro no submerso e limo claro até 35 cm
  acima. Metalness vai a zero: com 0,35 o reflexo do céu lavava a faixa.
- `geladeiraHD` (geladeira do canal, 1,5 × 1,8 em x ±5,9 / z ±10, e caixa de energia do poste,
  matEletro): leitura de função por face. FRENTE (voltada para as casas, +`|x|`): duas portas
  (freezer 1,22–1,74, porta 0,06–1,18) com borracha escura de 2,5 cm contornando cada uma, puxador
  vertical escuro de 4,5 cm em u = 0,55 e plaqueta. TRÁS (para o canal): serpentina do condensador
  (painel escuro 0,45–1,65 com tubos verticais a cada 3 cm) e nicho do compressor no pé. LADOS:
  friso fraco a 1,22 e amassado. Ferrugem no pé (0–0,3 m), nas borrachas e no condensador. Antes
  lia como caixa metálica cinza chapada.
- `pilarHD` (pilar da travessia, matMadeira): linha de fôrma, mofo verde-escuro nos 45 cm de
  baixo, escorrido de ferrugem da viga só acima de 2,1 m, tom por altura ±5 % e grão. Era tubo
  galvanizado com emenda a 1,5 m e lia como pilar liso (dpBloco 2,2). A junta passou de linha a
  cada 1 m com 35 % (sumia a 3 m: pilares chapados na pose `parede`) para sulco escuro de 1,5 cm a
  cada 60 cm com normal inclinada. No leito: submerso escuro, limo verde-escuro até 0,6 m acima
  com crosta clara no limite e escorrido escuro descendo da viga/laje (> 1,9 m); antes o pilar
  chegava limpo à água (poses `ponte` e `alto`).
- `sacoHD`: pregas claras radiais que convergem no nó (ângulo em volta do eixo do objeto,
  torcidas por ruído, mais fortes para cima), amassado por ruído de 10–15 cm e grão fino.

## guarda

`guardaHD` (matGuarda: caixa de 0,9 × 0,1 m no vão e mureta de 0,55 m girada na rampa, sem
sombra):

- Vão (`|x|` ≤ 5): a caixa inteira vira MURETA DE BLOCO cerâmico 39 × 19 com cinta de concreto de
  12 cm no topo (a cenografia põe a pingadeira).
- Rampa (só com `rampa = true`, isto é, sem a cenografia `guarda`): GRADE DE FERRO CHATO
  cinza-chumbo com tinta azul descascada e ferrugem no pé — corrimão chato 0,80–0,85, barra
  inferior 0,10–0,14, barras verticais de 2,5 cm a cada 14 cm e montantes a cada 1,4 m (o último
  em `|x|` 13,52); nunca abaixo do piso (`pisoPass`).
- Com a cenografia ligada (`rampa = false`) a mureta da rampa é descartada e
  `guardaTravessia` põe a grade de verdade.
- Nada amarelo: o tubular amarelo industrial era a maior âncora de "não-favela" nas quatro poses.
- O corte é em 4,95, não 5,05: a cunha da mureta autoral da rampa (começa em `|x|` 5, girada)
  entrava na face de tijolo e lia como fiada diagonal; o pilarete de concreto da cenografia
  (`|x|` 4,93–5,13) cobre a ponta.

`guardaR26` (frente `tijolo`): por dentro, o bloco da regra única (tom uniforme acima de 0,6 m do
tabuleiro); a grade da rampa é a mesma da `guardaHD`.

`guardaTravessia` (cenografia): corrimão chato 50 × 8 mm a 0,80–0,85, barra inferior a 0,10–0,14,
barras verticais de 25 × 8 mm a cada 14 cm e 7 montantes de 5 cm (o último em `|x|` 13,52, o mesmo
do shader), seguindo `pisoPass` de `|x|` 5 ao pé; cinza-chumbo com tinta azul descascada (por
barra) e ferrugem nos 12 cm do pé. Sem placa de base aparafusada (lia como industrial). No vão a
mureta ganha pingadeira de concreto de 16 × 5 cm; pilarete de 20 × 20 × 0,95 arremata a emenda
mureta ↔ grade em `|x|` = 5. No pé de cada rampa, 3 degraus de 46 × 30 cm (a inclinação 5,6/8,6
dá 0,30 de espelho por 0,46 de piso) sobrepostos à laje. z −11 ± 1,25, como a caixa autoral.

## chapa

`chapaHD` (`worn_corrugated_iron`, 13 ondas/m = 7,6 cm): a onda desce o caimento lido da normal.
No telhado, folhas de 1,0 × 2,2 m com sombra de sobreposição e tom por folha (legível de longe,
onde a onda some no mip); na parede, painel por ruído. Ferrugem só em mancha.

- Parede, faixa do corpo: o mapa vai à sua média local (mip +5, grão ±7 %), sem ferrugem e com
  painel a 30 %. A mancha preta do `worn_corrugated_iron` tinha tamanho de torso na casinha (pose
  `alto`).
- Telhado: FIBROCIMENTO cinza-claro (luma neutra-fria × 1,7 a 88 %, metal 0, ferrugem à metade,
  AO de vértice a 20 %, relevo a 60 % e rebatimento falso de 12 % no emissivo) com a onda
  desenhada no albedo (13/m, some por `fwidth`). O marrom liso de longe era o mapa + metal 0,35 +
  60 % de neutralização; as águas viradas contra o sol liam como placas pretas de longe (pose
  `alto`, lum 50).
- `U.cerA`/`U.cerB` (6 caixas orientadas, preenchidas pela cenografia: 1 telhado em 4 + a
  palafita do centro da pose `alto`) viram TELHA CERÂMICA: fiada de 38 cm com sombra de
  sobreposição, onda de 20 cm, telha velha escura e musgo no caimento (o grão some por `fwidth`,
  sem cintilar). Cada caixa é (x, z, cos, sin) + meios-lados.

## telha

`chapaR26` (frente `telha`): chapas de 1,06 × 2,24 m — 4 em 5 de fibrocimento
(`hd_corrego/fibro`, 12 ondas × 1 recobrimento = 2,124 × 2,24 m), 1 em 5 de zinco. O v do mapa
desce o caimento: o ladrilho entra com v invertido (alto da imagem = alto da água) e o
recobrimento cai na divisa das chapas. Na placa instanciada (`USE_INSTANCING` = `addPlacaSB`) a
lateral é pintada como borda de chapa sobre terça; parede de chapa não muda.

`cumeeirasR26`: na cumeeira autoral as águas sobem para fora e ela flutua sobre o vale como tábua
em lança; vai a escala zero por instância e a matriz volta em `desliga()`.

Na cenografia, `telhadosR26` põe caibros de 5 × 6 a cada 55 cm sob cada água, mão-francesa onde a
água passa ≥ 50 cm da parede e lastro (bloco, pedra, pneu, tábua) nas águas com centro ≥ 4,4 m.
`placasDe` lê as placas autorais da matriz de cada instância (X atravessa a água — é a direção do
caimento —, Y é a normal, Z corre ao longo da casa); só as de zinco com ≥ 1,2 m.

## madeira

`madeiraHD`: a madeira que fica madeira vira tábua cinza desbotada (ponte, tapume) ou compensado
claro (albedo ≈ 0,4) em chapas de 1,10 × 2,20 m com emenda escura, veio fraco (variação do mapa a
55 %) e AO de vértice a 35 % (barraco, tapume do puxadinho, vigas). `tex_madeira` tem média
linear 0,17 e com AO cheio o tapume à sombra ficava em p50 64, chapado.

O compensado é projetado no mundo a 1,10 m (a emenda do tile cai na emenda da chapa) com o mapa
deslocado por chapa (hash da célula): o tile de 2 × 2 por UV repetia a mesma veia e mostrava a
costura no meio do tapume (pose `rua`, x ≈ 150 px). Escorrido e sujeira só fora da faixa do
corpo; a face inferior (viga sob o tabuleiro) clareia como o tabuleiro.

Tapume da palafita (faces verticais de `tex_madeira|ffffff` acima de 2 m): compensado claro em
chapas de 1,10 × 2,20 com emenda escura, porque a tábua cinza lia como cubo canelado/contêiner na
pose `alto`. As réguas e cantoneiras são geometria da cenografia (ver `palafitas`).

## tapume

Frente `tapume` da r26. `tapumeR26` (barraco de passagem, matBar): colcha de panos de 1,10 m
(tábua `hd_corrego/tabua`, madeirite, zinco) no lugar do compensado claro. Na faixa do corpo,
mesma luma em todo pano (±3 %) e croma à metade — madeirite clareado não pode ler bege-pele; a
tábua do conjunto (média linear 0,376) tem o contraste entre tábuas cortado à metade ali. Rodapé
podre e remendo quente (OSB ou lona azul, só entre 2,25 e 2,79 m, em 3 panos de cada 10) ficam
fora dela. A mesma colcha (`hdTapumeR26`) entra no tapume da palafita.

Na cenografia, `quadroBarracoR26` troca o quadro de portão por caibro de 5 × 6 em cada emenda de
pano (x múltiplo de 1,10 m, como no shader), sarrafo de pé e de topo fora da faixa do corpo e
mão-francesa curta só acima de 2,1 m.

## reboco

`rebocoHD`: textura de reboco real projetada no mundo (1,7 m), relevo por normal e a idade do
Sertão (mancha, escorrido acima de 1,9 m, trinca, descascado mostrando tijolo com junta, pé
sujo), via `projetaMundo` de `map_sertao_hd.js`.

Três acabamentos por tinta. A variante é a soma dos bytes da cor autoral mod 3, estável por
material:

| Variante | Acabamento |
| --- | --- |
| 0 | chapisco cinza: grão fino de alta frequência, tinta a 55 %, +4 % de luz; mantém a tinta autoral |
| 1 | tinta pastel (verde-água, amarelo ou azul: tom da tabela ou bits 8 + 16 da cor), descascada só acima de 2,1 m, com borda DURA (largura = `fwidth` do ruído), massa cinza por baixo e lábio escuro |
| 2 | cinza-massa (luma, S ≈ 0,05: 90 % para a luma e 0,97 / 0,98 / 1,0 contra o sol) com remendos de massa acima de 2,1 m |

- As oito tintas autorais (`CORES_ALVENARIA` de `map_corrego.js`) ficam na v0; v1 e v2 trocam a
  tinta pela sua luma. Lição do Lajes: tinta sobre reboco quente + sol quente + AgX neutraliza o
  matiz. `m.color = luma × tom` é o `diffuse` que entra no mapa E no `corpoLiso`, logo é o único
  lugar onde a tinta fica uniforme na faixa do corpo. O tom pastel entra com croma ×1,8
  (1 + 1,8·(tom − 1), luma 1; S ≈ 0,17 ao sol / 0,25 à sombra na tela), luma mantida.
- A cor é reescalada para manter a luma de tela sob o `reboco_cor_rug` (quente, direção
  69/50/32): tinta quente × textura quente somava +8–10 % que a neutra perde. Sem isto o p50 da
  cinza-massa caía de 56 para ≈ 52.
- `TINTA_FIXA` sobrepõe o hash. Pelo hash só `e6d4b4` (muro externo, uma palafita, barracos da
  fileira C) caía em v1, invisível nas poses. `d9c78e`, a casa A do bar (−9,75; 2,6) e a A leste
  (−1,1), vira v1 verde-água; `e6d4b4` divide a parede do bar com `d9c78e` e leva o mesmo
  verde-água (azul fazia costura lilás). `c9a883`, a B oeste (1,9) à direita/fundo da pose `rua`,
  fica v2 pelo hash.
- Remendos da v2 são relativos à parede (luma × 1,06, dessaturados): placas de cor fixa liam como
  planos claros flutuando.
- Tijolo sob o reboco (`SUB_TIJOLO`) menos saturado, terroso (não salmão) e quase só no pé: um
  buraco de 10 px no alto da empena lia como mancha magenta. O portão do tijolo em
  `map_sertao_hd.js` (`sub.foraDoCorpo`) é em y de mundo (> 2,1 ou < 0,45) e é trocado pela faixa
  por piso (`hdAltoB`: 2,1–2,6 m acima de cada piso, sob a laje).
- `corpoLiso: 1`: a mancha da própria `reboco_cor_rug` (cabeça, rgb ≈ 69/50/32 a 4 m) entrava a
  100 % na faixa do corpo; com 0,85 ainda sobrava 15 %. Fora da faixa a mancha do mapa entra à
  metade (`antes`: mip +5 a 50 %) e o macro a 60 %: as manchas de torso na palafita (y 2,2–4,9,
  pose `alto`) e na parede verde (pose `parede`) eram o mapa + macro inteiros.
- Rodapé: v0 e v2 têm rodapé cinza-escuro de 0,45 m. Na v1 a faixa 0–0,45 m é rodapé de tinta
  mais escura/saturada com ilhas de tijolo aparente (bloco 22 × 6,5 cm, junta cinza) e borda
  descascada fina; o cinza-escuro uniforme lia como sombra pintada.
- A variante roda ANTES de `idadeDaParede`: o buraco de tijolo (`sub`) pinta por cima do
  descascado/remendo, que antes o cobria.

## bloco

`blocoHD` (rodada anterior à r26): o `pbr_bricks051` por UV repetia o tile a cada ~180 px. Vira
bloco cerâmico de 6 furos 39 × 19 cm assentado com junta cinza, projetado em metros; tom por
bloco e por fiada (quase plano na faixa do corpo), argamassa escorrida/respingada sobre o bloco,
cinta de concreto de 15 cm no topo de cada pavimento (y = k·2,8) e verga corrida de 12 cm no
nível dos vãos (2,15 m do piso, o topo da janela autoral) com sombra de 3 cm abaixo, e topo
horizontal (piso da laje) em concreto. O mapa fica só como grão.

Cor: bloco laranja desbotado 0,42 / 0,14 / 0,06 (≈ 172/105/68 sRGB; sol + AgX lavam o matiz, croma
alta de propósito). O 0,40 / 0,215 / 0,135 lia como tijolinho escuro uniforme (sat 0,25) a
1500 px. Os comentários originais citavam junta cinza de 1,5 cm e junta cinza-clara de 1,8 cm; o
código hoje desenha junta cinza-médio de 2,6 cm (menos clara), com tom ±12 % por bloco e 1 em 10
escurecido com canto quebrado (nicho escuro).

## bloco-r26

Frente `tijolo` da r26. `hdBlocoR26` (em `R26_GLSL`) é a regra única do bloco cerâmico: ladrilho
`hd_corrego/bloco` de 0,60 × 1,26 m (face 29 × 19), deslocado por fiada (`textureGrad`: a derivada
tem de ser a contínua) e com tom ao longo dela; na faixa do corpo o tom de cada bloco vai à média.

- Meio (junta do ladrilho < 2 px): a textura borra e só dá a mancha; junta, tom por bloco e
  croma passam a ser desenhados.
- Longe (bloco < ~8 px no pior eixo): pegada isotrópica e tom de bloco igualado. Sem isso a
  mureta rasante lia ranhura e xadrez.
- `lm` é a luma na escala do bloco (mip 7: 8 × 8 texels por ladrilho); a junta mantém o
  contraste, só o tom de cada bloco é igualado. O ladrilho só tem 2 blocos por fiada: sem igualar
  (60 % perto, tudo do meio em diante) a fiada lê xadrez ABAB.
- A junta é desenhada no lugar da do ladrilho (assentamento em 0,21k − 0,008) com piso de
  1,3 px; some quando a fiada cai abaixo de ~3 px.
- `normalR26(bx, by)`: o normal dos conjuntos `hd_corrego` é lido com uv e derivadas próprios
  (`hdUvB`, `hdGrB`); o Mint entrega o normal com viés (média ≠ 0,5) e (bx, by) o tira.
- `R26_NORMAL`: relevo procedural em espaço de mundo; `hdTanB` = tangente horizontal da face,
  `hdRelB` = inclinação (ao longo da face, para cima).

`tijoloR26`: regra única + respingo no pé e eflorescência sob a cinta (y = k·2,8 − 0,17). Faixa
do corpo por pavimento (`mod 2,8`): só tom igualado, junta e relevo; cinta, verga e topo de
concreto como na `blocoHD`.

Na cenografia, `capaMuretaR26` põe a capa de argamassa da mureta do vão: peças de 1,5–3 m de
14 × 4–5 cm (pingadeira de 2 cm de cada lado da mureta de 10 cm), tom e altura variando e uma
falha de 4–14 cm em metade das emendas (lasca). Fica no lugar da pingadeira lisa de concreto.

## vaos

matVao: porta 1,0 × 2,1 e janela 1,0 × 1,0 em placa de 10 cm, 2 cm à frente da parede. O lote
estático funde todos num mesh só, então `marcaVaos` recupera cada caixa no CPU por corrida
contígua de vértices (extensão ≤ 1,1 m na horizontal e ≤ 2,2 m na vertical: vãos vizinhos distam
mais) e grava os atributos `hdJc`/`hdJs`: centro, tangente da fachada (eixo principal em xz),
meia-largura e tipo (janela 0–8 do atlas de janelas, porta 10–14 do atlas de portas; +0,5 =
espelhada). Sem isto cada vão era um preto chapado.

- A porta fica na faixa do corpo: sem a célula 2 (madeira velha, bege quente) e com tinta fria.
- Janela sem a célula 4 (vitrô: caixilho `0x4f5a5c` sob vidro 128–142, lavado na névoa a 20 m; a
  irmã cobogó ao lado ficava nítida).
- Porta: nervura vertical a cada 25 cm (aresta clara + sombra), ferrugem irregular nos 20 cm do
  pé (`hdV` < 0,095) e fechadura escura em u 0,85 / v 0,45. A chapa bege lia como placa lisa (pose
  `rua`, dp 2).
- `janelaHD`: janela de alumínio/basculante/veneziana com vidro (reflexo de céu por fresnel, sem
  cubo) ou porta de chapa/enrolar/madeira nas faces largas; faces finas e topo em concreto
  (ombreira/peitoril). A oclusão por vértice do mapa é preservada.
- O vão é o único material que precisa do mesh (atributos): se o mesmo material aparecer noutro
  mesh, este também ganha os atributos.

## agua

`aguaHD` (lâmina de `water.js`): cor e espuma por uniforme; o update fica intacto.

- A faixa de espuma branca na emenda água/margem vira filete cinza-oliva estreito
  (`uEspumaFaixa` 0,14, manchas quebradas pela textura B).
- O MIOLO (linha contínua de coluna < 5 cm na linha d'água) vai a zero: no assoreamento das
  pontas (z ≈ ∓32) ele era a linha branca pontilhada de 1 px da pose `alto`. Com
  `uEspumaMiolo = 0` o pixel cai de 164 para 94, igual aos vizinhos.
- Água marrom-oliva (`0x4a4830` rasa / `0x201f14` funda: verde-cinza lia como piscina), nata
  bege-oliva.
- Com `espuma`, o fragmento ganha nata marrom nos cantos (`|x|` > 2,2 m, junto aos muros), lida
  da textura B que já está no shader; a string original volta em `desliga()`.

`afundaEspuma`: as placas de espuma autorais (`map_corrego.js`: 7 caixas de 1,8 cm em
`CANAL_AGUA` + 0,02 e 4 bolhas em + 0,06, material cor pura `0xf0ecd3` transparente) eram quads
flutuando 2 cm ACIMA da lâmina e liam como placas claras soltas (pose `ponte`). Descem até ficar
60 % submersas (caixa: fundo em −1,621; bolha: 3 mm acima da lâmina). `espumaHD` escurece e
esverdeia a parte abaixo da água; a nata fica oliva, com o molhado escuro.

`limoHD`: a faixa de limo autoral (x ±2,94, y −1,96…−1,46) vira linha d'água de verdade: submerso
escuro, limo verde-escuro com crosta clara no limite.

`limoTopo`: a tira autoral de limo no TOPO do muro do canal (matLimo, 0,36 × 0,08 m em y
−0,04…0,04) some. O lip de 4 cm fora da guia, virado ao sol, era a linha branca pontilhada de
1 px na aresta do canal (poses `ponte` e `alto`). A faixa da linha d'água (0,5 m) fica.

## mato

`matoHD`: dos tufos de capim do chão (`grama_corrego_01/02`: grade instanciada por PropBatch mais
as 26 peças plantadas) fica só o que está a ≤ 3,5 m da água (`|x|` ≤ 6,5; a fileira autoral da
margem está em 5,5–6,2 m). O resto vai a escala zero por instância — menos 14 deles que, com
`margem`, mudam só de posição para a beira do canal (`|x|` 3,4–4,5, fora de ponte, rampa e
geladeira).

## sacos

Sacos de lixo autorais (`map_corrego.js`: 3 dodecaedros de raio s no grupo (−18,05; 0; −3,05),
escala (0,75; 1; 0,62), cor pura `|252925`, `|3d4435`, `|24211f`). A esfera lisa lia como pneu.
`sacosHD` (kit) achata (y × 0,8), varia o tamanho por saco (`sz`) e gira, com chave pela cor
original; as pregas são do `sacoHD`; o nó amarrado com duas orelhas no topo é da cenografia
(`nosDeSaco`). `SACOS_AUTORAIS` = [x, z, s, sz, chave, cor do kit, some].

O trio preto idêntico lia como bombas: dois somem (`some`) e ficam 1 saco preto + sacolas de
mercado (branco sujo, azul; 12 lados e achatadas — com 7 liam como poliedro), papelão dobrado
encostado e seis tijolos (19 × 9 × 9), dois deles sobre o papelão deitado: 3 inteiros, 2 com o
canto quebrado (caixa curta + lasca de meia espessura sobrepostas) e 1 meio tijolo com a quebra
em degrau; tudo na malha fundida.

## luz

`luzHD`: o hemisfério do look (céu `0xd8b89a` / chão `0x4a3830`) esmagava a sombra em preto
quente. O kit sobe e esfria o hemisfério (×1,45, céu `0xc3ccd6`, chão `0x6b625a`); o sol (e
`scene.userData.__sf.dir`) não muda.

## cenografia

Nada na cenografia tem colisão nem raycast. Ela lê a planta pelos colisores do mundo: casas =
caixas ≥ 2,6 m de lado com base ≤ 1,1 m, nas fileiras `|x|` 7,5–19,5 (um corpo por centro; o
topo é o maior `maxY` das caixas com o mesmo centro); postes = 0,26 m × 9,4 m. `SOBRADOS`,
`RAMPAS`, `PASS`, `PALAFITAS`, `VARAIS_AUTORAIS`, `BOCAS` e `SACOS_AUTORAIS` são posições copiadas
de `map_corrego.js`: se a planta mudar, mudam junto.

O que entra: fios, luminária e nó de fiação nos postes do mapa; postes de concreto com feixe de
cabos na rua do spawn oeste; cano, relógio e gato nas fachadas; caixa d'água azul sobre tijolo e
varal nas lajes e no tabuleiro da travessia; lastro de tijolo nos telhados de zinco; guia, esgoto
e lixo do canal; lixo da margem; nó dos sacos autorais; varal com caimento; pano no varal autoral
(linha baixa); toldo; boca de comércio (porta de enrolar + placa + freezer); portões e
basculantes de tela nas fachadas livres; ferragem do portão do barraco; kit de viela nos becos;
guia de sarjeta nas fachadas de rua; guarda das rampas da travessia (a pedido do kit) e skyline
de SP.

Frentes r26 na cenografia (`opts.r26`, some inteira com `?hdr26=0`): `tijolo` = capa de argamassa
da mureta; `obra` = guarda de uma cor (malha própria), vigas, travessas, buzinotes e adutora da
travessia; `telha` = caibros, mãos-francesas e lastro; `tapume` = quadro de caibro; `estaca` =
palafitas.

Malhas: `fundidor()` funde caixas, tubos, sólidos de revolução e grades suaves num draw call, com
cor e normal por vértice (mesmo desenho do Lajes). A normal é explícita: a grade (pano com bojo)
precisa de normal média, o resto leva a normal da face. Com `comEixo`, grava em `hdEixo` o
deslocamento de cada vértice ao eixo da peça (caixa: aresta mais longa; tubo: o segmento), para o
material engrossar barra fina no vertex shader; peça emitida por `tri`/`quad`/`torno`/`grade`/
`tuboG` fica com zero (não engrossa). `texturador()` é a malha com UV (porta de enrolar e placa
escrita): um mesh, um material, uma tela.

## fios

`fiador()`: fita virada para a câmera (2 vértices por ponto, abertos no vertex shader) com
largura real perto e piso de `FIO_PX` px longe. Tubo de 1 cm a 30 m media 0,4 px e virava linha
pontilhada que cintila. Um draw call, sem luz. `hdRes` é o tamanho do buffer de desenho,
atualizado em `onBeforeRender` sem alocar, porque a escada de qualidade muda o pixel ratio.

`materialFerroR26` usa a mesma conta para a barra: piso de 1,5 px de largura, porque a barra de
16 mm a 15 m media 0,7 px e virava pontilhado que faz moiré sobre os degraus.

Travessia alta: tabuleiro a 5,6 m em `|x|` ≤ 5 e rampas até `|x|` 13,6 (z −12,25…−9,75). Todo
fio tem de passar ≥ 2,6 m acima (`folgaPass`). `CABO_MIN` = 5,0 m é o piso dos cabos entre postes;
a folga sobre a travessia (5,6 + 2,6) é garantida por `folgaPass`, que encolhe a barriga até
passar. Com o piso em 7,7 m a cruzeta baixa (8,24) ficava com cabo reto esticado (pose `parede`);
a flecha agora é 2–4 % do vão.

`gatosHD` (kit): os gatos autorais (`map_corrego.js`: caixas de 3 cm a 6,4–7,7 m entre `POSTES`,
cor pura `0x1d1b19`) que cruzam a travessia alta (5,6 m) com menos de 2,6 m de folga somem: eram
o cabo a 1,2 m do piso que a pose `alto` mostrava. Os cabos da cenografia (isolador a isolador,
folga garantida) ficam no lugar deles.

## postes

Poste autoral: o colisor é girado por ry × 0,4 (`map_corrego.js`), logo a cruzeta de 1,9 m (base
8,7 m) está em th = atan2/0,4 e a de 1,4 m (base 8,0 m) em th × 0,5 + 0,5. Sem isso o cabo
acabava 0,55 m fora da cruzeta, solto no ar. A ponta do braço fica a 0,75 m (cruzeta alta) e
0,52 m (baixa), onde o isolador senta.

`postes()`: isolador em cada braço real das cruzetas, luminária, transformador, caixa e nó de
fiação (caixa de emenda com três laços de sobra pendurados); cabos em catenária entre vizinhos,
sempre de isolador a isolador (cruzeta alta: um cabo por lado; cruzeta baixa: braço virado para o
vizinho). A luminária pública (braço de 1,1 m ao longo da cruzeta, virado para o canal) é a
silhueta que diz "rua de SP". Nó alto: caixa de emenda sob a cruzeta baixa (7,42–7,68 m) com dois
laços de sobra e a descida de cada isolador baixo até ela; antes o cabo chegava à cruzeta sem nó
nem caixa (pose `parede`, pixel 1230,170).

## postes-da-rua

`postesRua()`: postes de concreto da rua do spawn oeste (pose `rua`, (−21; −5) olhando +x). P1 no
canto do barraco de passagem (−16,3; −8,0), P2 na calçada da casa B (−16,95; 1,9) em
(−19,4; −0,7), fora de rota, e P3 na borda da viela A–B (−12,6; −7,0, braço para a viela), para a
fiação cruzar o quadro a 4–5 m (os ramais a 3,3–3,75 m liam como fio rasteiro).

- Cruzeta dupla, luminária, caixa cinza; relógio com eletroduto no P1.
- P1 ↔ P2: 9 cabos (4 nas cruzetas, 5 em feixe a 7,0–7,5 m).
- P1 → P3 (cruza a rua da pose): 2 cabos na cruzeta alta e 3 no feixe baixo, flecha 2–4 % do vão.
- Descidas: P3 → caixa do bar A (−9,75; 2,6) a 4,6 m; P2 → face −z da casa B a 4,4 m (relógio a
  1,3 m). O comentário anterior descrevia a descida P1 → bar a 3,75 m, acima da placa.

Posições copiadas da planta; sem casas, só postes e cabos.

## fachadas

`fachadas()`, faces ±x (as que o jogador vê): cano de PVC de descida, relógio de luz com
eletroduto, gato pendurado (feixe frouxo a 2,7 m, caindo até a caixa) e ramal até o poste mais
próximo do mesmo lado (≤ 16 m). Tudo com ≤ 12 cm de saliência. O ramal sobe da fachada para o
poste (7,85 m, sob a cruzeta baixa). Se cruzar a travessia alta com menos de 2,6 m de folga, sai
do alto do eletroduto estendido até a laje; se nem assim, não é desenhado: cabo a 1,2 m do piso
da travessia era o que a pose `alto` mostrava.

O relógio vai em TODA fachada ±x (era em 80 %): 1 relógio + conduíte por fachada no térreo das
casas visíveis. Faces ±z livres (rua/largo): relógio + eletroduto no canto oposto à porta autoral
(a = +0,6 na face +z), subindo até a cinta da laje.

## lajes

`lajes()`, laje plana: caixa d'água de polietileno azul de 1 000 L (24 lados, Ø 1,1 × 0,95 m) ou
de fibrocimento cinza sobre duas fiadas de tijolo com tampo de concreto, no canto oposto ao cubo
autoral; antena de TV em metade, parabólica em um quarto; varal de laje (dois T de cano a 1,75 m,
cabo e 3–4 panos) nas lajes dentro do cone da pose `alto` e em 1 em 3 das outras.

- Sobrados jogáveis têm laje andável: nada em cima deles. Laje plana = o raio bate na laje de
  20 cm (topo + 0,2); telha de zinco bate mais alto.
- Casa térrea de laje plana também recebe caixa (antes só topo ≥ 5 m: 1 laje em 10 tinha caixa).
- No cone da pose `alto` a única laje plana (9,75; −34,35; topo 8,6) fica ACIMA do olho (7,2 m):
  só o que passa de ~1 m sobre a platibanda (9,0) aparece. Por isso ali vão duas caixas azuis
  sobre 6 fiadas (topo 10,0), parabólica com braço e o varal. O par de caixas fica no lado +b,
  longe do cubo autoral (+a/−b) e dos ferros de espera (b = ±(hz − 0,35)).
- Caixa de escada em −a/−b (2,0 × 2,4 × 2,3 m): bloco cerâmico aparente com cinta, laje de 12 cm
  e porta escura na face +a; a parabólica sobe para a laje dela (mastro de 1,0 m). Laje sem caixa
  de escada lia como cartão (pose `alto`).

## mirante

`mirante()`, laje do tabuleiro da travessia (pose `alto`): caixa d'água azul de 500 L sobre 2
fiadas na ponta oposta do vão (x 4,4, a 9 m da câmera, ~40° à direita: a −2,2 m ficava a 2,5 m e
tomava um quarto do quadro), encostada no guarda de z −12,25; varal de dois T na mesma borda
(x −1…2,2) com o braço cruzando o guarda e o cabo 20 cm para FORA (z −12,45). Cano do ladrão
desce pela borda. Posições de `PASS`.

## telhados

`telhados()`, telhado de zinco (duas águas): chapa de fibrocimento 1,1 × 2,44 m remendando uma
água e tijolo baiano deitado como lastro (2–3 por chapa, mais 3–5 soltos na onda), tudo deitado
no plano medido pela normal do raio (`medidor`: altura, chave do material que bateu e normal de
mundo). Os tijolos vão para `L` (uma InstancedMesh, um draw call); a chapa vai à malha fundida. A
referência (Jaqueline/Vila Sônia) é cinza + laranja.

- Zinco = chave `tex_zinco` OU plano inclinado acima da laje. A chave só existe depois que a
  textura chega; sem o fallback a cenografia, que roda antes, não punha nada.
- No cone da pose `alto` a chapa vai na água virada para a câmera, com 4–6 tijolos.
- 1 telhado em 4 (ordem das casas com zinco) vai para `ceram`: o shader da chapa o pinta de TELHA
  CERÂMICA na caixa orientada (centro, cos/sin, meios-lados + 1,1 m de beiral); nele não vai chapa
  de remendo nem lastro. A palafita da pose `alto` entra primeiro na lista.

## canal

- `guiaCanal()`: guia de concreto na beira do canal (`|x|` = 3,17; 24 cm); pula pontes (z = −22,
  0, 22), rampas (`RAMPAS`) e as pontas assoreadas. Afundada 2 cm, encardida (`0x62625c`) e
  contínua (segmentos emendados, sem giro nem altura por segmento); tampa escura 1 cm para
  dentro. A mancha no topo são 2 borrões redondos desalinhados: o retângulo de 0,27 × 0,6 lia
  como quadrado escuro sob a taboa (pose `ponte`).
- Junta de piche em `|x|` = 5: o topo do muro/rampa do canal (caixa, y = 0, `|x|` ≤ 5) encosta no
  plano de asfalto (y = 0,01, `|x|` ≥ 5) com um degrau de 1 cm ABERTO pelo lado. Da ponte o raio
  passava entre a quina da caixa e a borda do plano e via o céu: linha branca pontilhada de 1 px
  na aresta (poses `ponte` e `alto`; com clear magenta a linha ficava magenta). A tira de 8 cm
  cobre o degrau (y −0,03…0,012).
- `esgotoCanal()` (pose `ponte`, de z 0 para −z): tubo de PVC Ø 20 cm saindo do muro (x = ∓3) a
  −0,95 m com escorrido escuro até a lâmina (−1,61), fio de despejo e espuma; 4 sacos/sacolas e 2
  garrafas PET presos junto aos muros, meio afundados. A espuma do despejo são 4 borrões rasos
  oliva-escuros de raio e tom variados em volta do pé do fio (disco claro lia como tampa/branco).
  Flutuantes meio afundados na lâmina: 2 PET deitadas (40 % fora), 2 sacolas infladas, 1 bandeja
  de isopor, perto dos muros no trecho da pose (z 0 → −20).
- `margem()` (passeio entre a guia e a fileira A, `|x|` 3,4–4,6): sacos de lixo pretos amarrados,
  sacolas claras e garrafas PET deitadas, longe de ponte, rampa e geladeira. Os tufos de capim
  são os autorais, reposicionados pelo kit (ver `mato`).

## guias

`guias()`, guia de sarjeta: canaleta de 30 cm junto à fachada (a faixa úmida é do shader do chão)
fechada por guia de concreto de 12 × 7 cm, só nas faces de rua/largo: fileira B para a rua do
spawn; barracos da fileira C (`|x|` 23,05, 1 m de fundo, fora de `casas`) para a mesma rua; faces
±z de A e B para beco transversal e largo. A ponta só dobra a esquina (+54 cm) quando a face
perpendicular também tem guia; senão termina no canto da fachada com um rebaixo de 12 cm (ponta
solta lia mal na pose `rua`).

A guia fica a 1,26 m da fachada quando há rua à frente (nada a 3,4 m): fecha a calçada de 1,2 m
que o shader do chão pinta em concreto claro. Beco transversal estreito mantém a guia a 48 cm. A
esquina só dobra à mesma distância da face perpendicular. Na fileira C a face de rua
(`|x|` ≈ 22,45) fecha a calçada que o shader pinta até lá; sem esquina, rebaixo nas duas pontas.

## obra-cenografia

- `guardaR26Cen` (malha F2): tubo de 5 cm a 0,85–0,90 m, montantes de 4 cm, barras de 16 mm a
  cada 12 cm, 2 m remendados com vergalhão em X; UMA cor por lance (oeste azul, leste cinza).
  Zarcão à mostra em ≈ 12 % da área, ferrugem marrom nos 10 cm do pé e nas soldas (0,13 e 0,84 m)
  e topo do corrimão polido e escuro são do shader de `materialFerroR26`.
- `obraTravessia`: longarinas, transversinas, travessa por par de pilares, buzinotes e adutora
  Ø 150 na lateral +z (a que as poses `ponte` e `rua` veem). Tudo ≥ 1,9 m acima do piso de baixo:
  por isso a longarina da rampa pára em `|x|` 9,6 e o par de pilares do pé fica sem travessa. A
  travessa tem marca de fôrma: 3 tábuas de ≈ 13 cm, rebaixo escuro de 6 mm entre elas, tom por
  tábua e escorrido (caixa lisa lia cubo chapado). Buzinote: toco de PVC saindo 12 cm da borda da
  laje e mancha escura em trapézio na longarina, 3 mm à frente dela.
- Com `obra`, a grade de ferro chato e os 3 degraus do pé (`guardaTravessia`) saem; com `tijolo`
  sai a pingadeira lisa.

## palafitas

`palafitas()` (`map_corrego.js`: corpo a 2,2 m sobre 4 pilares de 18 cm em ±0,4·w / ±0,4·d,
colisores girados com `maxY` 2,2): cada grupo de 4 pilares vira PILOTIS de concreto de 28 cm com
sapata, e VIGA DE TRANSIÇÃO de 26 × 35 cm ligando os pilotis sob o corpo. A caixa sobre 4 palitos
de 8 cm lia como maquete (pose `alto`, pixel 370,430; `parede`, 440,400).

- Viga perimetral 30 × 35 sob o corpo e PAREDE DE BLOCO até o chão no lado das casas
  (x + s·0,4·w, fora do passeio da beira): fecha a caixa por baixo; fiadas de 20 cm marcadas com
  junta clara. O lado do canal fica aberto (escoras + tapume autorais).
- Na face do canal (tapume de compensado em x − s·(w/2 + 0,06), 3 painéis de d·0,62 girados
  ry + k·0,05, alturas 1,7 / 1,3 / 1,7) vão réguas de 4 cm (topo, pé, meio) e cantoneira escura
  nas pontas.
- `PALAFITAS` = [x, z, w, d, h] da planta; ry medido nos colisores. Sem os 4 colisores (planta
  diferente) a palafita vai na posição da tabela com ry = 0. A mais próxima de (5,5; −19) vai à
  cerâmica.

`estacasR26` (frente `estaca`): barrotes de 6 × 12 em balanço até a viga de borda em `|x|` 2,92;
estacas de eucalipto com X de sarrafo no leito (contraventamento só entre a lâmina e o topo do
muro, y −1,45…−0,2). As estacas ficam a 8 cm do muro e páram no topo dele (acima cruzariam a
visada beira → leito); o resto respeita `foraDaFaixa`.

## panos

`PANOS` são panos lavados (saturação ≤ 0,22): roupa de varal ao sol de SP é desbotada; os tons
puros liam como bandeirinha.

`pano()`: lençol (listra opcional), camisa ou calça, em grade 4 × 3 com bojo de 5–8 cm (mais
embaixo e no meio, com uma dobra de 3 ondas) e normal média; dois pregadores no topo. A listra do
lençol vai só em 1 em 3, em altura sorteada (v 0,25–0,75) e 1,5 cm à frente (a 4 mm brigava no z
a 9 m). Com a listra fixa em v 0,58–0,74 todos os lençóis do varal alinhavam a mesma linha e ela
lia como a laje atravessando o pano.

`varais()`: varal com caimento atravessando o beco 1 (de fachada A a fachada B), vão livre
≥ 2,45 m, e um feixe de fios (gato) meio metro acima, preso nas duas fachadas.

`roupas()`, varal autoral (`map_corrego.js`: cabo reto de 4,2 m a 3,2 m, 12 varais): os
retângulos de cor pura vão a escala zero no kit. O cabo autoral fica vazio; uma linha baixa a
2,62 m, amarrada a ele por duas descidas, leva camisa, calça, um lençol grande claro de 1,1 m e
os pregadores, com a barra dos panos em ≥ 2,1 m. A 3,2 m liam como peças chapadas a 5 m (pose
`rua`).

## comercio

`telaComercio()`, tela 1024 × 1024 (flipY: v = 1 − y/1024). Letras de `hd_detalhes_lajes.js`
(`pintaLetreiro`); frases genéricas, sem marca.

| Célula (x, y em px) | Conteúdo |
| --- | --- |
| 0,0 – 512,512 | porta de aço de enrolar cinza |
| 0,512 – 512,1024 | variante pintada/riscada: tinta descascada em placas, riscos de chave/pedra e respingo verde da faixa da fachada no pé |
| 512,0 e 512,128 (512 × 120) | duas placas de letrista (proporção 4,2:1 da placa de 2,2 × 0,52 m) |
| 512,256 e 768,256 (256²) | basculante de alumínio 1 × 1 m (3 folhas inclinadas, vidro azulado com reflexo em diagonal), sem e com grade de ferro |
| 512,512 – 768,1024 | portão de grade cinza 1 × 2 m: quintal escuro atrás, barras verticais cinza-chumbo, chapa lisa nos 60 cm de baixo, fechadura |
| 768,512 – 1024,1024 | portão de chapa com zarcão oxidado 1 × 2 m: 3 nervuras horizontais, escorrido de ferrugem e dobradiças |

A célula da placa tem 120 px de altura: com 240 a placa 1 cabia só na metade de baixo.

`comercio()`, boca de comércio em fachadas que as poses enquadram (`BOCAS`): `rua` e `parede`
veem a face −z da casa A (−9,75; 2,6) no largo do spawn; `ponte` vê a face +x (lado do canal) da
casa A (−9,75; −24,9). Cada boca: faixa pintada na parede (colada na alvenaria acima do
embasamento, que avança 8 cm até 1,05 m), porta de enrolar 1,6 × 2,2 m com batente e soleira,
caixa do rolo e guias em U, placa de letrista 2,2 × 0,52 m acima da cinta da laje, toldo, freezer
horizontal branco (0,95 × 0,86 × 0,58) com caixa de isopor em cima e engradado. A placa fica à
FRENTE do fundo escuro: antes o fundo de 4 cm cobria a tela e a fáscia ficava sem letreiro. A 2ª
boca usa a lâmina pintada/riscada. A porta autoral da casa fica na face +z (local a = 0,6), fora
destas duas faces.

`toldos()`: mercadinho/bar de porta com toldo listrado e placa cega acima, em 3 fachadas da
fileira B viradas para o beco 1.

## portoes

`facesDe()`: faces candidatas a portão/janela são ±z de toda casa, a face externa da fileira B
(`|x|` ≈ 16,95) e a face da fileira A (`|x|` ≈ 9,75) voltada para a rua do canal, sem as bocas de
comércio. Uma face dá para rua/largo se nenhuma outra casa está a 1,6 m à frente dela (beco de
3 m conta como rua; encosto não).

`portoes()`: portão no térreo das fachadas livres (1 por face de ≥ 3,2 m, 2 a partir de 7 m):
batente de concreto de 14 cm saindo 22 cm da face (passa o embasamento de 8 cm), folha da tela
11 cm atrás do batente, soleira e cadeado com corrente curta. Grade de 1 × 2 m, chapa de 1 × 2 m
ou chapa de 2 folhas 2,2 × 2,1 m (célula espelhada). Na face +z a porta autoral está em u = 0,6:
nada a < 1,3 m dela.

`portaoBarraco()`: a parede +z do barraco de passagem (`map_corrego.js`: x −20,3…−16,1, face em
z −8,62, tapume de compensado) lia como portão na pose `rua`. Ganha a ferragem de portão de
correr: trilho no alto com suportes e roldanas, quadro de cantoneira (3 montantes, 3 travessas),
3 dobradiças de chapa com pino na ponta esquerda e cadeado com corrente no montante do meio. Com
a frente `tapume` entra `quadroBarracoR26` no lugar (ver `tapume`).

`basculantes()`: basculante 1 × 1,2 m com grade no pavimento de cima (tijolo cru: y de topo −
2,8) das fachadas livres ±z de casas de ≥ 2 pavimentos; aro de concreto de 6 cm e peitoril
escuro. Na face +z a janela autoral está em u = 0,6 (só a célula −meia·0,45 e, se couber,
+meia·0,6). O pavimento de tijolo é 3 cm mais estreito que o corpo (w − 0,06): a face do tijolo
fica em `fora` = −0,05.

`becos()`: kit de viela nos becos entre as fileiras A e B (faces x de A para fora e de B para
dentro, com casa a < 3,4 m à frente): 2–3 de balde, caixa de feira, saco de cimento/areia,
vassoura e pneu encostados a 35 cm da fachada, longe do relógio (`|u|` ≤ meia − 1,5).

## skyline

`skyline()`: caixas instanciadas num anel de 70–185 m (fora do mundo jogável, atrás dos muros de
8 m), com grade de janelas por shader (fiada a cada 3 m, 2 colunas por 5 m, 30 % escuras / 70 %
médias) e varanda como faixa clara em metade dos prédios. A névoa (72 %) entra DEPOIS do tonemap
e lavava a janela do albedo: a grade também desconta sobre a cor final, senão a torre lia como
bloco bege liso.

3 variantes por prédio (`hdSem`): 0 = janela em grade 2,5 × 3,0; 1 = fita horizontal contínua a
cada 3,2 m (pavimento de laje marcada); 2 = janelas estreitas 1,6 × 2,9 em faixa clara. As torres
idênticas liam como cópia (pose `alto`).
