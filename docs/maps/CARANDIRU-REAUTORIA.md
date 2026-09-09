# Carandiru — continuação C1→C4

## Objetivo e aceite

Reautorar o mapa exibido como **Carandiru**, preservando o ID técnico
`penitenciaria`, com três rotas competitivas, Pavilhão 6 e muralha percorríveis,
assets Mint rastreáveis e aceite final no jogo real. Gates Node não substituem
capturas 1200×800 em 3:2, vídeo das três rotas, crítico independente nem aprovação
visual/jogável humana.

Fonte histórica e receita: `docs/reports/CARANDIRU-REFERENCIAS-E-REAUTORIA-2026-09-08.md`
do commit `24b88b96` na lane `codex/mapas-quality-program`.

## Base e isolamento

- worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/carandiru-c1`
- branch: `codex/carandiru-c1`
- base: #555, `cd576a1c11cefcb11fbb6b8c30907e1a34bb65a5`
- #555: `OPEN`, `CLEAN`, `MERGEABLE`, head `cd576a1c`; `pr-fast` verde em
  14m19s, `portao-browser` verde em 18m05s, Vercel, smoke e demais checks verdes.
- A pilha compartilhada #542 e a lane Joá permanecem congeladas.

## C1 — nome, régua e blockout

- `7526d21e`: régua criada antes do mapa; a base #555 reprovou CAR1, CAR2,
  CAR3 e CAR6.
- `f1011d0d`: nome exibido Carandiru; ID preservado; duas subidas espelhadas,
  passarela interna em três lados e duas guaritas acessíveis; Pavilhão 6 oco com
  duas passagens térreas, escada e galeria superior.
- CAR1, CAR2, CAR3 e CAR6 verdes.
- Mutantes ativos e mordidos isoladamente: `muro-sem-acesso`,
  `guarita-fechada`, `pavilhao-solido`, `escada-decorativa` e
  `arame-na-passarela`.
- Réguas herdadas já verdes: fachada PF1–PF5, vida NV1–NV8, pickups,
  Penitenciária PEN1–PEN5, contrato global, spawn e CTF.
- `check:deploy`: 37/37 em 54,2 s depois de reinstalar o binário local Darwin
  ARM64 de `sharp`; a primeira rodada 33/37 falhou somente por essa dependência.
- `npm run build`: verde em alpha.240; aviso esperado de Node 23 local para Node
  24 no Vercel.
- Jogo real: `window.__game.state === live` em `http://127.0.0.1:8136/?debug=1&auto=P,mst&map=penitenciaria`.
  Nove vistas 900×900 em `artifacts/carandiru-c1-live/`; a vista `t0` tem SHA-256
  `813b85c74b171567d1ed34d51c2ae472a880c8422d0cfe7e50d662958d8862f4`.

Comando local do gate: `npm run eval:carandiru`.
URL do jogo real após subir o servidor: `http://127.0.0.1:4321/?mapa=penitenciaria`.
Ainda não há captura 3:2, comparação cega contra referência nem aprovação humana
do C1. A vista real confirma o blockout, mas também mostra massas de tijolo e a
galeria ainda brutas; isso segue para C2/C3.

## Ciclo público de produção

Cada mapa segue: referências → assets Blender/Mint → montagem Three.js → crítica
visual independente → entrega. Responsáveis por assets não aprovam o próprio
trabalho. Colisão, rotas, escala, pisos e navegação permanecem determinísticos em
código; GLBs são cascas visuais. Comparação cega 3:2 e performance são avaliações
separadas.

## C2 — régua vermelha antes da implementação

- O checkpoint C2 reprova o mapa atual em CAR4 (rotas), CAR5 (LOS/contracobertura)
  e CAR8 (custo).
- `--selftest-mutantes` monta apenas um contrato sintético C2 válido para provar
  os operadores antes de alterar o mapa. `rota-unica` reprova somente CAR4 e
  `spawn-exposto` reprova somente CAR5. Esse autoteste não mede a jogabilidade do
  mapa; o fechamento C2 precisa fazer os mesmos mutantes morderem o mundo real.

## C2 — implementação e validação

- `cb7b34bd`: mutantes `rota-unica` e `spawn-exposto` provaram a régua antes da
  implementação. Depois da implementação, ambos também mordem isoladamente o
  mapa real em CAR4 e CAR5.
- `6a0c0ebe`: três rotas, navegação multinível, LOS/contrafogo, recibo browser,
  capturas, documentação dos comandos e limitações da crítica independente.
- Três famílias independentes ligam os dois lados ao MID do Pavilhão 6:
  `radial-interna`, `externa-oeste` e `muralha-leste`. O grafo usa coordenadas
  `(x,y,z)`, inclui as quatro escadas de muralha, passarela e galeria interna;
  `eval:mapcontrato` confirma o grafo inteiro conexo.
- CAR4 percorre cada segmento a cada 0,25 m usando `Game._collide`, exige apoio de
  piso, cápsula livre, largura lateral, conexão ao MID, separação das rotas e
  acesso das oito posições de spawn. CAR5 traça LOS contra colisores reais: as
  guaritas de canto não veem o spawn oposto, as duas torres do portão veem no
  máximo duas posições e duas das três rotas oferecem contrafogo.
- O recibo `tools/eval/carandiru-performance.json` mede Chrome/WebGL real em
  1200x800, 5x5/8x8 e med/low contra o C1 `5d5155ba` na mesma execução. O custo
  médio de chamadas cresceu 4,2%, 6,3%, 5,0% e 4,9%, abaixo do teto de 15%; todas
  as oito amostras ficaram `live`, com zero erro inesperado. O recibo conserva os
  avisos conhecidos do servidor local em vez de escondê-los.
- Gates verdes no estado final: CAR1–CAR6 e CAR8, Penitenciária PEN1–PEN5,
  fachada PF1–PF5, vida NV1–NV8, pickups, contrato global, 276 colocações de
  spawn, `docs:check` e build. CAR7 continua inativo no C2 porque Mint pertence
  ao C3.
- Capturas reais 1200x800 em `artifacts/carandiru-c2/`: `divineia`, `radial`,
  `pavilhao-6`, `galeria`, `muralha` e `guarita-patio`. Elas demonstram presença
  de térreo, galeria, muralha e escada externa; o gate e o recibo demonstram as
  propriedades que uma imagem isolada não mede.

## Crítica independente do C2

Nenhuma aprovação visual foi emitida. A leitura em contexto limpo classificou o
resultado como blockout multinível e apontou bloqueios concretos:

- `divineia` tem um mastro no centro escondendo o eixo de chegada;
- `muralha` mostra profundidade, mas não entradas, saídas nem quebra de LOS ou
  cobertura intermediária discernível;
- `galeria` não mostra a escada/acesso e deixa proteção, quedas e continuidade
  ambíguas;
- tijolo vermelho uniforme e caixas de munição repetidas ainda leem como pátio
  industrial genérico; faltam portal CASA DE DETENÇÃO, massa cinzenta dos
  pavilhões, ritmo de vãos/grades/peitoris e viatura característica rastreável;
- os PNGs não provam percurso contínuo das três rotas, subida funcional, entrada
  nas guaritas, contraste de personagens nem contrafogo em combate.

## C3 — régua vermelha antes da identidade

- Baseline congelado antes de alterar o mapa em `artifacts/carandiru-c3/before/`:
  as seis vistas 1200×800 e seus SHA-256 vêm do C2 `f2657143`.
- Não havia viatura Carandiru em nenhuma branch ou worktree pesquisada. Os quatro
  GLBs arquitetônicos recuperados continuam com os bytes e hashes do inventário.
- Projeto Mint criado sem compra de créditos: `zd7agpw4xxat6kytnxka8kj19h8e1969`;
  chat da viatura modular: `ph7ev8zdhy23p8v1ec4vtjyt058e1r4k`. O prompt exige
  perua policial brasileira genérica 1980–1990, sem marca/pessoa/cena de violência,
  até 8 mil triângulos, dimensões e pivô declarados.
- CAR7 agora exige arquivo GLB parseável, orçamento, preload no mapa, registro Mint
  com `assetId`/chat/prompt/licença/hash, caminho GLB real e fallback com colisor
  idêntico, além de recibo Chrome 1200×800 com HTTP 2xx e instância visível.
  Antes da implementação, C3 reprova somente CAR7; C1/C2 continuam verdes.

## C3 — identidade arquitetônica e viatura Mint

- `3e98d334` introduziu CAR7 antes da implementação. A fonte C2 reprovou somente
  a ausência da viatura Mint/GLB/registro/recibo; CAR1–CAR6 e CAR8 permaneceram
  verdes.
- O projeto Mint `zd7agpw4xxat6kytnxka8kj19h8e1969`, chat
  `ph7ev8zdhy23p8v1ec4vtjyt058e1r4k`, gerou a perua policial genérica
  "Weathered Grey Patrol Wagon" no Tripo P1. Asset
  `p97a1j1skm2w33wjyv8pkw92n18e0g2j`: 4.840 triângulos, três texturas WebP,
  original 1.043.988 bytes e final 415.268 bytes. Original, recibo e hashes ficam
  em `artifacts/carandiru-c3/mint/`; o arquivo final e a licença cautelar estão em
  `public/models/props/carandiru_viatura_1990.glb`, `mint-assets.json` e
  `public/models/props/FONTE.md`.
- A viatura GLB substitui apenas a casca visual. CAR7 constrói também o fallback e
  confirma que o colisor `carro-policia` é idêntico. O recibo Chrome comprova HTTP
  200, `source=mint`, instância visível, fallback oculto e zero erro inesperado; o
  mutante `viatura-procedural` reprova somente CAR7.
- O C3 torna o Pavilhão 6 e as duas massas de fundo cinza, acrescenta vãos
  norte/sul com profundidade, grades, peitoris e vergas, identifica as duas
  entradas como PAVILHÃO 6 e o portal como CASA DE DETENÇÃO. As massas externas
  reutilizam `bloco_celas.glb`; todo esse lote é visual e não entra nos colisores,
  LOS, pisos, waypoints ou CTF do C2.
- A primeira captura C3 foi rejeitada localmente porque as placas estavam
  espelhadas e o Pavilhão 6 ainda lia como tijolo vermelho. A fonte final corrige
  ambos, eleva a inscrição do portal acima da bandeira CTF e troca os
  enquadramentos de Divinéia, acesso da galeria, acesso da muralha, portal e
  viatura. Dez vistas 1200×800 ficam em
  `artifacts/carandiru-c3/after-final2/`; as seis do C2 permanecem em `before/`.
- O recibo final `tools/eval/carandiru-performance.json` mede, contra o C1 na mesma
  execução, aumentos de chamadas de 6,7% (med/5), 10,7% (med/8), 9,9% (low/5) e
  4,7% (low/8), todos abaixo do teto de 15%. Oito amostras ficaram `live`, com
  1200×800 e zero erro inesperado. CAR1–CAR8 estão verdes.
- A captura confirma avanço visual claro: portal legível, Pavilhão 6 cinza,
  viatura de época reconhecível e eixo Divinéia sem o mastro no centro. O acesso
  estreito da muralha continua escuro e uma imagem não prova percurso contínuo;
  esses pontos permanecem no C4, junto da revisão independente e aprovação humana.

## Crítica independente do C3

A primeira revisão classificou o C3 como avanço claro sobre o blockout C2 e apto
para revisão, sem promovê-lo a C4. Ela encontrou uma massa de fundo invadindo o
corredor da muralha e uma placa PAVILHÃO 6 espelhada. A fonte foi corrigida e uma
segunda leitura independente dos frames finais confirmou que o corredor voltou a
ficar visível até o fundo e que a placa espelhada desapareceu, sem novo bloqueador
nesses dois enquadramentos.

Ainda faltam vídeo contínuo das rotas e acessos e avaliação com jogadores do
corredor longo e escuro da muralha, cuja cobertura intermediária não fica clara.
Esse parecer não substitui aprovação visual humana.

## C4 — travessias contínuas e leitura da muralha

- `8a813a81` introduziu CAR9 antes da evidência. O gate exige três vídeos úteis,
  sem tela de carregamento, em 1200×800/3:2; início e fim exatos; passo máximo de
  0,8 m; duração mínima de quatro segundos; zero correção de colisão; três
  capturas por rota; variação vertical mínima de 5,7 m na muralha; e personagem
  real do jogo a 10, 20 e 30 m. A aprovação humana deve continuar declarada como
  `pending` para o recibo ser válido.
- `npm run eval:carandiru:c4` abre o jogo real em Chrome e percorre as polilinhas
  validadas por CAR4 em visão de jogador. Cada amostra chama `Game._collide` e o
  vídeo mostra continuidade renderizada, mas o controle da câmera é automatizado:
  isto não substitui locomoção por teclado/mouse, combate nem playtest humano.
- Duas tentativas foram rejeitadas antes do lote final. A primeira conservava a
  tela de carregamento e o banner ROUND 1; a segunda removeu o pre-roll, mas
  acelerava as rotas a cerca de dois segundos. Elas ficam isoladas em
  `artifacts/carandiru-c4/rejected-preroll/` e `rejected-fast/` e não alimentam
  o recibo.
- O lote final em `artifacts/carandiru-c4/final/` registra `radial-interna` em
  7,76 s/211 amostras, `externa-oeste` em 7,88 s/227 e `muralha-leste` em
  16,40 s/426. As três chegam ao fim com zero correção, passo máximo entre 0,40
  e 0,45 m e sem erro inesperado. A muralha cobre 5,8 m de variação vertical.
  Os vídeos têm SHA-256 `16a3cf5fa5a14dba05896a3dee8ce2ebe297aab31224823f75878504df9d4ec6`,
  `87b62c47c2e80485201f144fb7e6936732b282935a297db865a8784b9f901d48` e
  `5918b2ee7c710c4d8fcf3800102cac62184ada984f90ea969cc6cb2376f91c22`.
- O ensaio de leitura usa o GLB real `esquerdomacho` parado no corredor da
  muralha. A silhueta é reconhecível a 10 e 20 m e ainda humana a 30 m, mas a
  amostra clara/vermelha não cobre skins escuras, movimento, oclusão parcial ou
  aquisição sob fogo. O piso é legível e o corredor continua comprido, estreito
  e escuro, sem cobertura intermediária evidente.
- `tools/eval/carandiru-c4-browser.json` é o recibo versionado. CAR1–CAR9 ficam
  verdes; o recibo C3 de Mint e o recibo de performance continuam vinculados ao
  mesmo SHA-256 da fonte do mapa.

## Crítica independente do C4

O veredito final foi **WARN — lote revisável por humano**, com aprovação visual e
jogável ainda pendente. Os três vídeos passaram em formato, continuidade
automatizada e ausência das duas regressões do C3. A radial cruza o Pavilhão 6,
a externa acompanha a ala oeste e a muralha sobe, percorre a passarela e retorna
ao térreo.

O crítico manteve três bloqueios objetivos: playtest humano de orientação,
quedas e combate; demonstração ou correção da leitura dos acessos escuros, em
especial nos trechos de subida e descida da muralha; e validação de exposição,
contrafogo e cobertura no corredor elevado com personagens variados em
movimento. CAR9 prova a integridade do material entregue, não resolve esses
juízos humanos.

## Correção após o primeiro teste humano

O dono aprovou a direção visual com a ressalva de que as escadas laterais não
subiam direito e a subida central era pequena. A inspeção confirmou um defeito
funcional: cada degrau lateral subia 0,58 m, acima do `STEP_H=0,55` do motor. A
passarela inteira também continuava devolvendo piso a 5,8 m sobre a projeção das
escadas, impedindo a descida.

- As quatro laterais passaram de 10 para 12 degraus: 0,483 m por passo, 2,80 m
  de largura e 14,10 m de desenvolvimento. Um recorte funcional de 2 m separa o
  acesso da faixa de circulação superior sem abrir buraco visual na passarela.
- A subida central passou de 10 para 18 degraus, 3,40 m de largura e 6,55 m de
  desenvolvimento. O topo encontra a borda da galeria e uma arma que ficava sob
  a subida foi deslocada para a lateral livre.
- O recibo C4 agora executa a própria `Game._moveEntity` em subida e descida:
  8/8 travessias laterais chegam a 0/5,8 m e 2/2 travessias centrais chegam a
  0/3,4 m. A navegação continua conexa, com zero bloqueio, falta de piso ou
  estreitamento nas três rotas.
- Os 66 degraus usam duas instâncias de renderização. O A/B Chrome final ficou
  em -12,7% (med/5), -0,2% (med/8), +5,3% (low/5) e +2,5% (low/8), abaixo do teto
  de 15%, com oito amostras `live` e zero erro inesperado.

O servidor local 8136 serve a fonte final com SHA-256
`420677078c6d958b4ca4a11ce56077fb680cae7b420737b2dff3e10b1221a4a4`.
Ainda é necessária a nova confirmação humana do tato das escadas; a observação
anterior não constitui aprovação completa do mapa.

## Próximo passo

C4 entrega material revisável das três rotas e a correção mensurável das cinco
escadas. Ainda faltam reteste humano das escadas, movimento e combate, skins de
contraste baixo, avaliação da cobertura no corredor e aprovação final do dono. Não
avançar o rótulo visual nem autorizar merge/deploy enquanto esses itens estiverem
pendentes.
