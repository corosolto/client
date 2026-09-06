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

## Milestone: movimento real, regressões corrigidas e revisão adversarial

Baseline com builder 5c66d28 reproduzido via interceptação HTTP local:
`baseline-walk-retry/` tem 6/12 trajetos aprovados (seis pontes falham) e 11 linhas
entre spawns. Em `final-med/`: 22/22 trajetos, dez spawns sem deslocamento, zero
linhas diretas; 63 árvores interiores sem excesso visual nem colisor sobrando.
AMV7 primeiro vermelho (mantle automático sob teto a 1,8 m), corrigido com deck
2,3 m e extensão de estacas. Navegação atual AMZ5: 11/11 patamares e A→M→F.
Escada (17,29) passou a apontar norte para afastar o acesso da proteção de spawn.

Crítico independente final_regressions não encontrou regressão nova comprovada;
confirmou as quatro correções da rodada 2. Soma de triângulos do mundo caiu de
1.171.733 (r2) para 987.945 em final-med, contra 981.999 baseline. Não é FPS.
Crítico final_visual_critic manteve REPROVADO 5/10: ganhos em pontes/arquitetura,
mas halos na água, copas artificiais e orientação ainda falham; combate controlado
não medido. ROI clara do canal quase igual com espuma reduzida, e desaparece sem
água. Portanto não atribuir a causa apenas à espuma. Nenhum shader compartilhado
alterado. As fotos `final-med` antecedem a última orientação da escada.

Após essa crítica, removidas copas procedurais; os 25 GLBs do perímetro existentes
ficaram 3 m mais altos, sem instâncias adicionais. Duas portas fechadas explicitam
que as casas são cover sólido. Proteções de spawn reduzidas de 10,5 para 8,2 m;
AMV5 e todos AMZ1–7 continuam verdes. Recaptura e crítica dessa rodada pendentes.

Build passou após `npm ci --include=optional --ignore-scripts`, respeitando lock.
Check global anterior: 91/104; várias falhas eram bindings Sharp ausentes, agora
resolvidos e precisam de retry. SSR ainda falha pelo caminho esperado do artefato
Vercel (_render.func/dist/server/entry.mjs), embora build tenha terminado.
Ambiente CC0 documentado em public/audio/ambiente/FONTE.md restaurado das URLs
originais; HTTP e runtime não equivalem a aprovação humana de mixagem.

Próximo: terminar mutante AMV4; recapturar med/low e fallback batch=0; combate
controlado; repetir checks falhos com dependências corretas; relatório e commits.
Performance permanece PENDENTE por concorrência de GPU de outras frentes.

## Milestone: med/low e nova regressão MAP6 em correção

`final-v2-med/` e `final-v2-low/`: 24/24 trajetos, incluindo dois trechos na mata,
zero linhas entre spawns, zero pageerrors. Baseline low em `baseline-low/` usa
builder e LOOK originais interceptados localmente. `final-v2-unbatched/`: AMV4
passa nos 63 troncos sem instancing. Quatro loops de ambiência decodificados e
ligados ao duckBus, nenhum carregamento falho; mixagem humana ainda pendente.
Capturas COMBAT originais rejeitadas para 40m pela mira cobrindo o torso. Novas
`combat-v2-med/low` apontam a câmera ligeiramente ao lado e mantêm a HUD inteira.

Diagnóstico de água isolado identificou gradiente claro raso/fundo como contribuição
principal aos halos próximos; espuma e fog/glint quase não mudam o defeito. Raso
agora #3b3b29, fundo #302f22, alteração exclusiva do mapa. Nenhum shader global editado.

Map-check revelou regressão nova: elevar deck produz 12 quedas laterais >=2m sem
guarda nas escadas (`guardrails-red.log`). Guardas acompanhando degraus zeraram
MAP6; versão inicial inflava contagem de cover e perdeu AMZ5 (17,29). Altura útil
corrigida para .52m, mesma dos corrimãos existentes; MAP5 voltou a .44x. Escadas
alargadas coerentemente para1.6m visual/colisor/gh; AMZ5 de (17,29) ainda vermelho.
Crítico de regressões foi chamado para diagnóstico Node, sem edição. Não considerar
capturas anteriores como validação dessas últimas guardas. Próximo: recuperar
AMZ5 sem remover segurança, mutante MAP6, recaptura med/low e revisão final.

Global após corrigir dependências: 100/104 por união da primeira execução + retry;
skills sincronizadas localmente. Docs geradas atualizadas (13 arquivos pequenos,
só contagens do mapa/arnês), docs:check passa. docsautoria exige que a mudança em
colaborar.md esteja commitada antes de medir. audio:check segue manifest legado
incompatível com pack local; não reescrever catálogo global para mascarar isso.
Build final dessa rodada passou. SSR exige caminho dist/server/entry.mjs, mas o
adapter gerou .vercel/output/server/entry.mjs dentro de _render.func; pendente.

## Milestone: causa da entrada bloqueada e correção localizada

Crítico isolou árvore (13,22.7), altura9m, cujo tronco ocupava a boca da escada
(17,29). Sem guarda era possível desviar lateralmente; a proteção correta revelou
o bloqueio. Deslocamento autorado apenas dessa instância para (13,21.5), validado
em memória pelo crítico e agora aplicado no array que alimenta GLB/colisor/metadata.
Mantidas as 63 árvores e a densidade AMZ7. Régua AMZ5 voltou a 11/11. Guardas têm
altura .52m e escadas1.6m coerentes no visual/colisor/groundHeightAt. Mutantes reais
novos removem a guarda (MAP6) e devolvem a árvore à boca (AMZ5), além dos AMV1–7.
Referências/procedência em commit local fa43a79b. Sem alterações no shader global,
na física compartilhada ou nos arquivos GLB. Próximo: terminar mutantes e capturar
a geometria final med/low, revisar criticamente, build/docs e checkpoint final.

## Milestone: geometria final verificada e checkpoint

Fonte SHA256 `2a6e9e5b89e4011fde1747a80040c16de840d0e30ba632de301ce411f85847e7`.
`revision-med/` e `revision-low/` registram esse mesmo hash: 24/24 caminhadas,
zero pageerrors, zero linhas diretas nos raios de spawn. Nove mutantes reais
(8 Node: AMZ5, MAP6, AMV1/2/3/5/6/7; 1 browser: AMV4) falham somente na cláusula
pretendida e fonte restaurada com esse hash. AMZ1–7 e map-check passam; MAP6=0,
CTF mínimo2 rotas, três pontes e rede alta preservadas. Não são testes de FPS.
Mundo: 981.825 tri med contra981.999 baseline; low914.954 contra914.864.

mapa-novo-gate mantém3 falhas: ORT1 (10,4%,17 ângulos), ALT1 (h90=6,8m), SUP1
(51,4% materiais sem map). Baseline tinha apenas SUP1 (52,8%); ORT1 e ALT1 são
novas falhas após remover massas artificiais do horizonte. Não maquiar com caixas
nem afrouxar thresholds: revisão visual e aderência desses critérios continuam
pendentes. Crítico limpo review_delivery está examinando a entrega atual.
Próximo: checkpoint de fonte/guardas, docs geradas, check:fast/build/contratos final,
consolidar relatório com parecer independente e bloqueadores. Não aprovado.
