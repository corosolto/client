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

## Próximo passo

C3 integra arquitetura e viatura Blender/Mint com proveniência completa, sem
alterar os volumes competitivos aprovados pelos gates. C4 substitui os
enquadramentos obstruídos e entrega vídeo contínuo das três rotas, transições
verticais e entrada nas guaritas, seguido por nova crítica independente e
aprovação humana. Não avançar o rótulo visual enquanto esses itens estiverem
pendentes.
