# Escadão: casa central e abrigo disputável — PR #529

## Continuidade e definição de concluído

Trabalho exclusivo em `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/escadao-casas-conflito`,
branch `astra/escadao-casas-conflito`. Objetivo: janela funcional para a aproximação do respawn,
fechamento fora da abertura e abrigo que o time de baixo alcance perto do spawn superior,
com acesso, retorno, revide e proteção dos slots verificados. Validar localmente, capturar
offline, atualizar o PR e publicar progresso; sem navegador, merge ou release.

Base do PR: `42c01175`. Checkpoints herdados: `35e49547` (janela), `68981594` (abrigo).
A revisão de 06/09/2026 rejeitou a prova de tiro herdada: origem fora da parede em
`conflict-home` e origem dentro do colisor lateral em `home`. O corpo era deslocado pela
colisão; posições ocupáveis não atingiam o alvo antigo. A régua fortalecida também reprova
`68981594` ao executar seu builder via hook de importação, sem trocar o checkout.

## Alterações aceitas tecnicamente

- Janela traseira deslocada para a aproximação leste. A moradia existente na rua bloqueia
  as diagonais para os slots E. Fachada fechada fora da abertura, com peitoril, verga e
  caixilho; preservados escada lateral, passarela e janela frontal.
- Abrigo do mirante com ombreiras à altura do jogador e verga: a frente anterior era
  quase toda vazada. Duas portas laterais permanecem abertas, agora com vergas.
- Testes partem de pés ocupáveis e exigem alvo ocupável, tiro e revide. O alvo final
  `[10.8, 1.5, 24]` também está livre contra todas as malhas visíveis do arnês; o candidato
  `[11, 1.5, 23]` foi rejeitado porque o caixilho decorativo interceptava o raio.

## Evidência local de 06/09/2026

Recibos: `artifacts/escadao-casas-conflito/review/` (não versionados).
Comandos executados com Node 23 em `/opt/homebrew/bin/node`:

- `tools/eval/escadao-home-check.mjs`: entrada, passarela e retorno; 250 posições de movimento.
- `tools/eval/escadao-conflict-home-check.mjs`: 445 posições ocupáveis, 21.360 raios aos
  spawns bloqueados, olhos em pé/agachado e alvos em três alturas; rota até a casa.
- `tools/eval/escadao-mirante-abrigo-check.mjs`: 204 posições com corpo contido no abrigo,
  4.896 raios aos slots B bloqueados, 140 frames atravessando as portas e retornando;
  rotas do time de baixo e de contestação pelo time superior.
- Estrutura, descida, detalhes, grafo e contrato específicos: 5/5 passaram (`map-checks.log`).
- Cinco mutantes falharam na asserção esperada, conferida no texto de erro (`mutants.json`):
  `rear-window-sealed`, `canto-aberto`, `saidas-seladas`, `sem-ombreiras`, `fundo-aberto`.
- `npm run build`: passou. `npm run check:fast`: execução completa em `check-fast.log`,
  incluindo `mapcontrato`, `spawn`, `botsim-golden` e os testes do Escadão.
- Crítico independente, contexto limpo e somente leitura, confirmou os defeitos anteriores,
  as correções, os mutantes e a possibilidade de contestar o abrigo.

## Capturas offline reproduzíveis

```sh
node tools/escadao-conflict-offline.mjs artifacts/escadao-casas-conflito/review/before 68981594
node tools/escadao-conflict-offline.mjs artifacts/escadao-casas-conflito/review/after
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/render-escadao-conflict-offline.py -- artifacts/escadao-casas-conflito/review/before
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/render-escadao-conflict-offline.py -- artifacts/escadao-casas-conflito/review/after
```

Cada diretório contém geometria exportada do builder, hashes dos fontes, recibo das câmeras
e quatro PNGs 1536×1024. A esfera laranja é alvo de diagnóstico, não um objeto do mapa.
As imagens finais mostram janela enquadrada e escada lateral livre; no mirante, janela
central e portas distinguíveis. Há faixas escuras nas quinas e interiores escuros no render.
Este é um estudo de geometria procedural em Cycles CPU, sem GLBs, texturas, HUD ou renderer
do jogo. Não equivale à aprovação estética humana em runtime. Tentativas do exportador
que omitiam faces de materiais únicos foram descartadas e as capturas foram refeitas.

## Limites, resultados rejeitados e próximo passo

- Não há aprovação de equilíbrio competitivo nem garantia de ausência de camping.
  A proteção do mirante cobre o corpo totalmente contido no interior; as soleiras das
  portas têm exposição. Entradas independentes e revide demonstram contestabilidade.
- `eval:escadao-rota` segue vermelho: um lance inferior sem destino. Reproduzido no builder
  da base `42c01175` e no final. A varredura alta não lê slots E em nenhum dos dois;
  ela mede **zero pontos para B**, pois exclui a mesma cota. A régua nova do abrigo
  cobre explicitamente esse caso, sem apresentar `0/0` como prova de proteção.
  Contagem de lances reprovados é **1 nos dois builders**, então o diff não regride a
  régua. A área de chegada do lance central cai de 1600 m² para 1587 m², compatível
  com o piso que o abrigo e suas paredes passam a ocupar no mirante.
- `eval:grafitelayout` exige regenerar o layout do Escadão após a geometria mudar.
  O gerador usa Chromium; não foi executado por restrição do usuário. Hash não foi
  atualizado sem regeneração. Esta é pendência real antes de integrar.
- `audio:check` não passa porque o acervo privado está ausente nesta worktree; não se
  regenerou manifesto vazio. `eval:docsautoria` exige documentação gerada commitada;
  a revalidação após o checkpoint fica em `docsautoria-final.log`. O script `npm run check` não existe nesta versão.
- Próximo passo de integração: regenerar grafites em uma frente autorizada a usar navegador,
  revisar o resultado em 3:2 com GLBs reais e avaliar exposição nas portas em partida.
  Esta frente entrega refinamento, evidências e PR atualizado, sem merge/release.

## Checkpoint de entrega

Implementação recuperável: `af7d9434`. Durante a revisão o autofix remoto atualizou a
branch do PR para `751bb359`; o commit local foi reaplicado sobre ela sem conflitos,
sem merge de PR ou release. Em seguida o checkpoint documental foi publicado em
`851c5089` e enviado para `origin/astra/escadao-casas-conflito`. Build e os oito
checks específicos foram reexecutados nessa árvore (`build-final.log`, `map-final.log`).
A execução ampla anterior aprovou 122/125 passos; `audio:check` e `eval:grafitelayout`
continuam pendentes pelos motivos acima. A terceira falha era somente a exigência de
commit de documentação do DOCSAUT.

## Portões de push fechados

Os dois portões que o `pre-push` cobra rodaram nesta árvore, já com a documentação
commitada: `eval:mapcontrato` verde (MC1 contrato, MC2 índice de nós, MC3 grafo conexo)
e `check:deploy` **37/37**, incluindo `eval:docsautoria`, que era a falha remanescente
do DOCSAUT. `npm run build` verde. Os oito checks de aceite passaram e os cinco mutantes
morreram na cláusula pretendida: `rear-window-sealed` na abertura de tiro, `canto-aberto`
no fechamento traseiro, `saidas-seladas` na aresta caminhável do abrigo, `sem-ombreiras`
nas ombreiras da janela e `fundo-aberto` na leitura do spawn superior.

Isto fecha o que era mecânico. O que continua aberto não é: revisão visual humana em 3:2
com GLBs, regeneração de grafites em frente autorizada a usar navegador e leitura de
exposição das soleiras em partida real. Nenhum desses foi absorvido aqui.

## Rodada de 07/09 — a casa central fechada e o falso positivo anterior

Relato do dono em 3:2: "a casa central fechada, sem janela útil voltada à escada ou ao
respawn, e um grande vazio no piso interior". Todas as réguas desta frente passavam
verde — e o defeito era real. **O falso positivo foi estrutural (Lição 3 da LICOES.md):
as réguas rodavam em node, onde `placeProp` devolve null, e mediam o fallback
procedural; o navegador joga com `GLB_ON`, e na branch GLB_ON
(`public/js/map_escadao.js`, laje da boca do escadão) a geminada oeste virava o molde
fechado `escadao_casa_r3` + colisor monolítico + `continue` — sem janela, sem entrada,
interior inalcançável. A cauda da geminada leste (x 0,15–1,35) não tinha laje: era o
vazio de piso visto pela porta da passarela.** Régua que mede outro mundo aprova outro
jogo.

### Régua nova (antes do conserto)

`tools/eval/escadao-casa-central-check.mjs` (`eval:escadao-casa-central`, no
`check:fast`): registra um molde fechado de `escadao_casa_r3` via
`registerPropTemplate` (BUG-72) **antes** do boot — a branch GLB_ON executa de verdade
e a medição vê o mundo que o navegador serve. Cláusulas: nenhum prop `escadaoMint` na
laje; janela real na face norte da geminada leste (olho ocupável dentro, alvo ocupável
na escada e no patamar, tiro e revide por occluders E malha visível, fechado fora da
abertura); piso interior contínuo (`groundHeightAt` == 2,75, cápsula 0,38 em pé, malha
visível sob os pés); entrada por cápsula e caminante real; interior não lê slot de
nascimento. No HEAD de `5d59dff0` ela **reprovou** na primeira cláusula (1 prop
`escadaoMint` na laje).

### Conserto

- O shell procedural das geminadas é autoritativo no runtime: a branch GLB_ON com
  `placeProp` + colisor monolítico + `continue` saiu do mapa. O molde fechado não mora
  mais na casa tática.
- Janela real para a escada na face norte da geminada leste (vão x −2,2..−0,7, banda
  y 2,75+1,0..2,75+2,2): peitoril e verga sólidos, molduras fora do corredor de tiro.
  A geminada oeste não enxerga a escada (moradia lateral e a própria leste interpostam)
  — a janela mora na casa que encosta na boca do escadão.
- Vãos nas paredes compartilhadas das geminadas e porta da casa frontal: a cadeia
  PATAMAR 1 → passarela → geminada leste → geminada oeste anda com cápsula 0,38 nos
  trechos internos e com o caminante real do jogo na cadeia inteira, ida e volta.
- Piso: `groundHeightAt` conhece o interior das geminadas (2,75) com a mesma regra do
  `underLanding` (quem está na rua embaixo continua no chão); a cauda leste ganhou laje
  complementar sem fechar a passagem vertical. Mutante `sem-piso` derruba a cláusula.
- Corrimão da passarela termina em z=14,2, onde a casa começa: até 15,1 ele
  estrangulava o corredor (0,73 m livres contra 0,76 m de diâmetro da cápsula). A
  passarela externa continua guardada por inteiro (MAP6).
- Grafo de bots: rota nova entra pela porta da casa frontal, na fresta z 14,8–15,1
  entre as inflações de parede, e corre até a geminada oeste (MC3 verde, 626/626 nós).

### Mutantes (todos vermelhos na cláusula pretendida)

- `--mutante=glb-fechado`: malha fechada sobre o vão da janela (o estado que o
  `continue` produzia), sem tag — morre na cláusula de abertura de tiro.
- `--mutante=sem-piso`: interior derrubado para a rua — morre na cláusula de piso.

### Evidência

Recibos em `artifacts/escadao-casas-conflito/review-casa-central/` (não versionados):
`before/` e `after/` exportados pelo `tools/escadao-conflict-offline.mjs` (HEAD
`5d59dff0` vs árvore corrigida; hashes dos fontes no `geometry.json`) e
`resumo-textual.txt` — janela LIVRE para escada central e patamar 1, piso 68/68
amostras com malha a 2,75 m, 0 props `escadaoMint`, corrimão terminando em z=14,2.
Captura textual/geométrica porque o serviço de imagem estava indisponível; render PNG
do Blender não foi executado nem analisado nesta rodada.

### Não-regressão

`eval:escadao-rota` segue com a dívida conhecida (1 lance sem destino, igual à base);
oclusão de spawn 0/963 (E) e 0/0 (B). Passaram: home, conflict-home, casa-central,
mirante-abrigo, structure, descent, details, graph, contract, facade, mapcontrato
(MC1-3), spawn, botsim-golden, docs:check, arch:check e `npm run build` (Node 23).
`eval:grafitelayout` e `audio:check` seguem pendentes pelos motivos já registrados
(geometria mudou: o hash do grafite precisa ser regenerado em frente com navegador).
