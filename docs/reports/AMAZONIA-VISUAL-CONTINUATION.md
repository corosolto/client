# Treta na Amazônia — continuidade

## Objetivo e definição de pronto

Elevar identidade amazônica brasileira e qualidade técnica do PR #439, mantendo três
travessias, risco/recompensa, CTF, pickups, spawns protegidos, água acessível e leitura
de inimigos. Pesquisa real precede alterações; defeitos demonstrados ganham régua
vermelha antes do conserto e mutante real depois. Comparação visual em 1536×1024,
câmeras/FOV/qualidade iguais, GLBs carregados e Game._collide real. Validar mapas,
assets, look, ambiência, flora/água/navegação aplicáveis, build e checks globais.
Crítica independente obrigatória; performance só aprovada com janela GPU exclusiva.
Commits locais pequenos, DCO e Agent; sem merge, deploy, push ou mudança na original.

## Isolamento e baseline — 2026-09-06

- Worktree nova: `/Users/ruben/csbrasil/worktrees/amazonia-visual`.
- Branch: `codex/amazonia-visual`, criada após fetch de `origin/map2/amazonia`.
- Baseline: `5c66d28b3d691a12ae2084dc3ddf19d7d8cf6dbf`.
- Original não estava ocupada no `git worktree list`; nomes pedidos estavam livres.
- PR: https://github.com/corosolto/client/pull/439, base `feat/times-e-mapas-completo`.
- GitHub: CONFLICTING/DIRTY. Merge-tree somente diagnóstico, sem merge no checkout:
  conflitos em ARCH.generated.md, STATUS.md e docs com versões/traduções geradas.
  Saída integral: `artifacts/amazonia-visual/pr-conflicts.txt`.
- Registro em `public/js/maps.js` usa `buildAmazonia` de `public/js/map_amazonia.js`.
- Porta exclusiva 8146, livre antes do start; servidor de avaliação deste checkout.
- Node do shell era v16; comandos usam `/opt/homebrew/opt/node/bin` (v23.6.0).
- Dependências próprias instaladas com npm ci; nenhum node_modules compartilhado.

## Estado e evidências

AGENTS, STATUS, HANDOFF, LICOES, ARCH e as quatro skills solicitadas foram lidos.
Pesquisa e baseline em andamento. Artefatos volumosos ficam fora dos commits em
`artifacts/amazonia-visual/`. O prompt completo está no anexo original
`/Users/ruben/.codex/attachments/2303a283-e33e-4d26-b109-5fe56c53a298/pasted-text.txt`.

Sem aprovação visual/técnica ainda. Há renderers Chrome de outras atividades consumindo
CPU; exclusividade GPU não demonstrada. Não interromper processos alheios; eventual
tempo de frame é diagnóstico contaminado, não aprovação de performance.

## Próximo passo

Concluir ficha de referências e capturas do baseline. Conferir no navegador floresta,
margens, colisões, CTF e passes do renderer; escolher consertos a partir das evidências.

## Milestone: baseline e régua vermelha

Capturas reais: `artifacts/amazonia-visual/baseline/`, 1536×1024, FOV70, med,
7 câmeras em capture.json. GLBs do mapa HTTP200, sem pageerror; áudio ambiente 404.
AMZ1–7 passam; map-check encontrou 0 penetrações no proxy Node e mínimo 2 rotas CTF.
map-new já falha SUP1 no baseline: 52,8% materiais sem map (teto40), sem alteração.
AMV1 vermelho: ponte .18 < água .20. AMV2 vermelho: margem visual plana difere até
.30523m do chão físico. AMV3 vermelho: 44 caixas altas no horizonte. AMV4 no navegador:
63/63 árvores interiores excedem o colisor de .45m na altura do corpo. A câmera de
mata, em [-22,0,-16], também foi consultada por Game._collide; valores em trees.json.
Crítico independente baseline_critic reprovou água branca, skyline, repetição/raízes,
solo retangular e identidade insuficiente. Não aprovou colisão por screenshot isolado.
Pesquisa/ficha em plans/AMAZONIA-VISUAL.md e references/amazonia-visual/FONTE.md.
Próximo: corrigir água/margem e bosque em escopo exclusivo de map_amazonia.js;
reexecutar quatro cláusulas, aplicar mutantes de fonte reais, recapturar e andar.

## Milestone: correções de superfície e crítica da rodada 2

AMV1/2/3 passaram; mutantes reais em fonte reprovaram somente a cláusula alvo,
com SHA e restauração registrados em artifacts/amazonia-visual/mutations.log.
Rodada 1 rejeitada: aviso de erro de boot cobria as imagens apesar de state=live.
O capturador agora exige o aviso oculto e usa o botão de recuperação do jogo.
Rodada 2 válida visualmente, em iteration-2/: AMV4 passou nos 63 GLBs interiores,
mas o crítico de regressões detectou colisor maior que a malha. Correção atual
faz raio físico acompanhar escala, incluindo fallback batch=0; recaptura pendente.
Crítica A/B: skyline e travessia de madeira melhoraram; água/solo/repetição/casas
seguem reprovados. Nota editorial 4/10→5/10, não é aprovação BAR.

Movimento real: 8/12 trajetos passaram; falharam os dois sentidos das pontes z=-24
(elevam corpo via mantle até corrimão) e z=0 (barracas/mantle). As quatro passarelas
altas, ponte z=24 e saída da água nas duas margens passaram. Spawns assentaram sem
empurrão, mas 20/25 raios no browser tiveram visão direta. Não atribuir esses
problemas à revisão sem baseline correspondente; reprodução baseline em andamento.
AMV5 vermelho Node=21 linhas diretas; AMV6 vermelho=3 amostras secas lentificadas.
Agora ambos verdes: pilhas de madeira visíveis protegem spawns e slowAt termina
na interseção água/margem. Mutantes e confirmação browser destas cláusulas pendentes.

Regressões da rodada 2 corrigidas em fonte, ainda sem aceite visual: solo estendido
sob árvores externas; segundo estrato distante simplificado/instanciado (em vez de
44 GLBs completos); colisores proporcionais; lentidão só dentro da lâmina.
Duas casas ganham cobertura baixa de chapa/venezianas conforme referência inspecionada.
Geometrias são derivadas em runtime neste mapa, sem substituir arquivos do acervo.

Contratos iniciais: 9/11 passaram. eval:ambience falha antes de medir em map_es.js
inexistente (script usa id.slice(3)); assert:assets detectou packs ausentes. Pacotes
oficiais audio-pack-v6 e decals-pack-v2 baixados por URL das releases para esta
worktree, 321/196 arquivos extraídos; sem publicação nem alteração de licenças.
README registra direitos incertos do pacote de áudio; não constitui procedência
aprovada para novos usos. Sons ambiente específicos ainda retornaram 404.

Próximo: reproduzir travessias/LoS do baseline; nova captura med/low e caminhada;
mutantes AMV4/5/6; gates/build/global; crítica independente da correção das regressões.
Performance continua PENDENTE; não executar benchmark com outros renderers ativos.
