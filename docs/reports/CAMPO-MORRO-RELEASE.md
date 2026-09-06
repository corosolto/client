# Campinho da Quebrada — candidato de release

## Continuação da revisão final — 06/09/2026

Objetivo: revisar cobertura, rotas, pontos de conflito, spawns, bots e qualidade
visual na lane `campo-morro-release`, branch `astra/campo-morro-release-audit`,
PR #530. Concluir com correções medidas, crítica independente e PR atualizado;
merge/release estão fora da autorização. Capturas exclusivamente offline.

Retomada: `1e416221` era o checkpoint local; fast-forward para `164894ea`
incorporou o estado já publicado pelo autofix, sem editar outra lane.
O mapa passou novamente em `map-check` antes desta revisão. A crítica
independente confirmou que a régua antiga aceitava cobertura invisível/sem bala.
A nova medição reprovou antes do conserto por colisão fantasma e encosto oeste
atravessável por bala. A primeira leitura de `0.2010 m` incluía o limite externo
do mapa; o instrumento passou a excluir amostras fora dos limites. O mutante
que restaura o colisor original mede `0.1854 m` de empurrão fantasma e quatro
penetrações. Logs: `artifacts/campo-morro-final/regression-red.log` e
`mutant-sem-rotacao.log` no mesmo diretório.

Correções validadas: OBB nas duas muretas e encostos sólidos. O placar deixou
de ser uma caixa lisa: marcação geométrica decorativa `0–0`, sem ligação com o
placar da partida FPS. A nova régua está encadeada em `eval:mapcontrato`.

Navegação: a régua com `_collide` real reprovou 26 conexões do grafo anterior
(`nav-red.log`). A varredura contínua usa o raio do corpo; três pontos de
contorno e o reposicionamento do caixote da saída do beco leste preservam o
grafo conectado. A tentativa intermediária que apenas eliminava conexões foi
rejeitada: deixava oito nós fora do componente principal. Resultado aceito:
344 nós, 1.021 conexões não orientadas, nenhum nó/trecho amostrado em sólido,
oito spawns livres. Crítica independente também mediu a distância contínua
segmento–retângulo/OBB: nenhuma violação, folga corporal mínima de 6 cm.

Baseline e sete mutantes validados em `mutations.json`: cobertura invisível,
sem bala, sem rotação, encosto atravessável, placar vazio, rota obstruída e
spawn obstruído. Cada mutante reprova com diagnóstico específico.

### Validação final local

| Verificação | Resultado observado |
| --- | --- |
| `campinho-release-check` e mutantes | baseline verde; sete mutantes vermelhos |
| `map-check quebrada` | nenhum spawn em sólido, nenhum occluder invisível; folga mínima 2,1 m e área contígua mínima 42,9 m² |
| Cobertura e CTF | pior espaçamento 4,28 m; razão mínima de props 0,38×; todos os pares spawn–bandeira com pelo menos duas rotas separadas |
| `map-contrato-check` | contrato, índices e conectividade aprovados; Quebrada totalmente conectada |
| `pickup-arma-check` | armas válidas e atualização real dos pickups aprovadas em todos os mapas |
| `botsim 180 quebrada`, nove sementes | stuck mata-mata 3,311% → 2,178%; CTF 5,544% → 2,656% |
| `syntax`, `eval:shaderbudget`, `docs:check` | passaram, inclusive cache-bust por conteúdo |
| `npm run build` | Astro/Vercel e poda de assets passaram |

As sementes são `12345,777,4242,90210,31337,8675309,2718,1618,42`. São medidas
do motor real com cenário procedural do arnês, sem prometer desempenho ou
equivalência visual com GLBs carregados. Uma tentativa intermediária, antes
da correção de navegação, teve stuck CTF de 12,256% e foi rejeitada.
Logs completos no diretório de evidência: `bots-*-final.log`, `map-final.log`,
`contract-final.log`, `pickups-final.log`, `build.log` e `shaderbudget.log`.
O primeiro build local encontrou apenas o shim de Three em `node_modules`;
`npm ci --ignore-scripts` na própria lane instalou as dependências e o build
subsequente passou.

Checkpoint funcional: `d564559c`. O build da documentação estática também
passou, em português e inglês. `check:deploy` passou inicialmente 36/37;
`eval:docsautoria` exigiu que os arquivos gerados estivessem commitados, por
isso foi regenerado o conjunto de docs e o novo contador de scripts do arnês
subiu para 331. O checkpoint de docs geradas foi consolidado em `896e92d1` e
`b6181d39`.

### Reverificação com a árvore sincronizada

Rodada de confirmação sobre `b6181d39`, sem tocar no mapa: o objetivo era provar
que os números do candidato sobrevivem à árvore já commitada, não repetir a
narrativa. Logs em `artifacts/campo-morro-final/*-sync.log`.

| Verificação | Resultado |
| --- | --- |
| `check:deploy` | **37/37**; `docs:check` e `eval:docsautoria` verdes com os gerados commitados |
| `map-check quebrada` | MAP1/MAP4 zero; MAP2B `2,1 m` / `42,9 m²`; MAP5 `4,28 m` e razão mínima `0,38×`; CTF2 mínimo duas rotas |
| `eval:mapcontrato` | 16 mapas ok; Quebrada `344` nós, `2042` arestas, conexa; `CAMPINHO_RELEASE` com colisão fantasma `0.0000 m` |
| `pickup-arma-check` | PA1/PA2 passam, 1034 pickups em 16 mapas |
| baseline + sete mutantes | baseline verde; sete vermelhos, cada um com diagnóstico distinto |
| `botsim 180 quebrada`, nove sementes | stuck mata-mata `2,178%`, CTF `2,656%` — idênticos ao checkpoint |
| `botsim-golden`, `bot:brain:check` | verdes |
| `npm run docs` e `npm run arch` | sem diferença: os gerados deste diff já estão em dia |

Os mutantes reprovam por motivos diferentes, que é o ponto da régua:
`invisivel` → `gate-cover: invisível`; `sem-bala` → `gate-cover: não bloqueia
bala`; `sem-rotacao` → `colisão fora da face visível: 0.1854 m` e quatro
penetrações; `sem-encosto` → encosto atravessável dos dois lados em `x=-13,1`;
`placar-vazio` → `score-mark: invisível`; `rota-obstruida` → sete arestas em
sólido; `spawn-obstruido` → spawn em sólido mais duas arestas.

Leitura independente do código, além dos números: o `segClear` novo usa a mesma
convenção mundo↔local do `_collideRot` e o mesmo recorte de altura do
`_collide`, e expande o retângulo por `0,38 m` em cada eixo. Isso é a soma de
Minkowski com um QUADRADO, não com o círculo do corpo, então nas quinas ele é
conservador: pode recusar uma conexão que o jogador passaria, nunca aceitar uma
que ele não passa. É o lado seguro do erro, e o `campinho-release-check`
confirma com `_collide` real que nenhuma aresta sobrevivente cruza sólido.

Uma correção de honestidade sobre o instrumento: `tools/eval/map-check.mjs` com
um único mapa reescreve `tools/eval/map_check.json` contendo só aquele mapa.
Isso apareceu como diferença nesta rodada e foi revertido — o arquivo não
pertence a este diff e não deve absorver a poda dos outros quinze mapas.

Aceite humano de assets/render real e partida manual, staging e release seguem
pendentes.

### Capturas offline e limites

Reprodução, com Node 23 e Blender 5.2 locais:

```sh
node tools/eval/campinho-offline.mjs artifacts/campo-morro-final/after
blender -b -t 4 --python tools/render-campinho.py -- artifacts/campo-morro-final/after
```

As pastas `before/` e `after/` preservam vistas aéreas, entrada oeste, travessas
leste/oeste e fundo do campo em 1200×800. `before` é o candidato anterior aos
consertos finais, já com as coberturas do PR; não é a base anterior ao PR.
Foram inspecionados os PNGs: o `0–0` lê da entrada e junto ao gol, sem tapar a
abertura; as correções de colisão preservam a disposição das coberturas.
As vistas laterais da travessa mostram as muretas baixas antes dos portões,
com a passagem aberta entre elas e o muro principal. As primeiras câmeras em
`z=23` nasceram dentro do casario e foram rejeitadas; as finais em
`x=±19,5; z=25,5` foram conferidas com `_collide` antes de renderizar.

O exportador lê vértices do mundo construído, mas a evidência visual usa
somente geometria procedural e cores; não reproduz GLBs assíncronos, texturas
canvas, transparências, HUD, pós-processamento ou iluminação WebGL. Não é
aprovação visual final do jogo. Capturas e logs ficam em `artifacts/`, fora do
Git. Nenhum navegador foi aberto nesta tarefa.

Limite adicional medido nesta rodada, que a redação anterior não dizia: as
cores lineares passam pela resposta tonal do Cycles e SATURAM. Na vista aérea e
nas travessas quase tudo lê branco, e o terreiro de terra não aparece como
terra. Ou seja, o render offline serve para conferir SILHUETA, posição e
oclusão — foi assim que o `0–0` e as muretas foram conferidos — mas NÃO julga
cor, material nem a leitura brasileira da quadra. Essa parte continua dependendo
inteiramente do olho humano no frame WebGL real.

O exportador foi rodado de novo sobre a árvore sincronizada
(`artifacts/campo-morro-final/sync/scene.json`) e saiu byte a byte idêntico ao
`after/scene.json` que gerou os PNGs: 199 malhas, `gate-cover=2`,
`sideline-cover=11`, `sideline-backrest=2`, `scoreboard=1`, `score-mark=9`.
As imagens continuam correspondendo ao código commitado. O `blender` não estava
no `PATH` desta sessão, então os PNGs não foram re-renderizados; a identidade do
`scene.json` é o que garante a correspondência.

## Escopo confirmado

O mapa jogável atual que contém o Campinho é `quebrada`, em
`public/js/map_quebrada.js`; ele aparece no registro como **Quebrada (Rua do
Baile)**. `public/js/map_campomorro.js` e o plano histórico do Campo do Morro
não pertencem à árvore atual nem ao registro `MAPS`. Portanto este candidato
não tenta restaurar um mapa antigo de forma disfarçada: melhora a arena que os
jogadores conseguem selecionar hoje.

## Problemas medidos antes da mudança

`node tools/eval/map-check.mjs quebrada` na base desta worktree encontrou
Campinho navegável, mas com uma chegada exposta pela travessa e dois quadrantes
sul com cobertura baixa em relação ao restante: pior espaçamento `5.42 m`,
razão de props `0.24×` e `0.26×` da mediana. A exposição do spawn B era `0.8%`.

## Mudança original do candidato

1. Duas muretas baixas e deslocadas dos portões dão cobertura ao primeiro passo
   entre travessa e campo sem fechar os dois caminhos CTF.
2. Bancos curtos, alternados junto ao alambrado, tornam as laterais uma rota de
   progressão e não uma travessia longa sem decisão. Eles ficam fora do centro e
   dos quatro slots de spawn.
3. Um placar físico no fundo do campo melhora a leitura do destino e não entra
   em colisão.

O candidato original não alterou módulos compartilhados, pickups, spawns,
armas ou outros mapas. A revisão final acima também corrige a navegação local
da Quebrada.

## Evidência do checkpoint original

| Verificação | Resultado |
| --- | --- |
| `npm run syntax` | passou |
| `node tools/eval/campinho-release-check.mjs` | `gate-cover=2`, `sideline-cover=11`, `scoreboard=1` |
| `node tools/eval/map-check.mjs quebrada` | MAP1/MAP4: zero; MAP2B: `2.1 m` e `42.9 m²`; MAP5: `4.28 m`, razão mínima `0.38×`; CTF2: mínimo duas rotas |
| `node tools/eval/map-contrato-check.mjs` | Quebrada: `341` nós, `2114` arestas, rota válida e grafo conexo |
| `node tools/eval/pickup-arma-check.mjs` | 62 pickups de Quebrada acessíveis; 16 mapas aprovados |
| `node tools/eval/botsim.mjs 60 quebrada` | stuck `1.711%`, spin em roam `0.064` volta/min, distribuição de rotas `0.64` |

O mutante que renomeia o marcador runtime do primeiro lote de bancos falha em
`campinho-release-check` com `sideline-cover: 9 (esperado 11)`, provando que o
check inspeciona o mundo construído e não apenas a presença do script.

## Limites antes de release

Esta lane não abriu navegador por escopo. A revisão offline acima não substitui
aprovação humana do frame real, GLBs carregados e partida manual em 3:2 antes
de merge/release. O PR permanece aberto, sem automerge habilitado.

### Revisão humana ainda pendente

Nenhum item abaixo foi verificado por esta lane; são todos genuinamente abertos.

1. **Frame real no navegador.** Cor, material e a leitura brasileira do campinho
   — o render offline satura e não decide isso.
2. **Muretas dos portões em jogo.** Se `1,05 m` de altura realmente cobre o
   primeiro passo sem virar parapeito de camping. É decisão de jogo, não de
   medida.
3. **Encostos de banco agora sólidos.** Passaram a bloquear bala; conferir se
   não criam um cover melhor do que se pretendia na lateral.
4. **Placar `0–0` decorativo.** É geometria fixa, sem ligação com o placar da
   partida. Confirmar se um placar que nunca muda é aceitável ou se deve sair.
5. **Partida manual 3:2 com bots.** `stuck` de `2,178%`/`2,656%` é medida do
   arnês; ninguém assistiu bot jogando o Campinho.
6. **Caixote do beco leste movido** de `z=10` para `z=8,8` e três nós de
   contorno novos: efeito no fluxo do beco não foi jogado.
7. **`segClear` conservador nas quinas** (Minkowski quadrado): pode ter cortado
   atalhos legítimos de bot em outros pontos da Quebrada.
8. **Staging e release.** Fora do escopo autorizado desta lane.
