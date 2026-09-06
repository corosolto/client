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

## Parecer final independente e estado de entrega

Crítico limpo review_delivery:5/10, NÃO APROVADO visualmente. Ganhos: madeira nas
pontes, horizonte sem caixas e menos raízes atravessando chão. Pendências: C18
contraste (20/40m tênue), C23 marcos/saídas, C25 vegetação inconsistente, halos da
água, chão com borda reta e casas ainda genéricas. Spawn cobre a apresentação da
saída; guardas/rotas corretas não equivalem a composição aprovada. O relatório
AMAZONIA-VISUAL-REVIEW.md preserva esses achados e números, sem aprovação própria.

Checkpoints locais:93f623ea fonte/guardas/testes e31b29509 docs geradas.
Build passou novamente. SSR canônico falha por caminho antigo; diagnóstico local
separado lendo handler do descriptor atual entregou200 com corpo nas3 páginas e
SSR1/2/3 passaram. Não modifica o teste compartilhado nem prova Node24/deploy.
Servidor próprio8146 fica disponível para revisão; capturas em comparacao.html.
Nenhum benchmark GPU foi executado ou processo externo interrompido. Permanecem
performance, mixagem humana, aceitação visual e três critérios de mapa novo.

Check global final encerrado:103/104 em251.6s, única falha audio:check (manifest
legado vs pack local). docs:check/docsautoria/skills e todos demais checks passaram.
Artefatos e resultados finais: docs/reports/AMAZONIA-VISUAL-REVIEW.md e
artifacts/amazonia-visual/comparacao.html. Builder congelado nas capturas pelo hash
acima, árvore/guardas validadas, branch com commits locais. Não aprovado para
integração; próxima ação concreta: revisão humana das imagens e planejamento do
ajuste de C18/C23/C25, seguido de janela exclusiva de GPU. Nenhum PR/push/deploy.

## Correção do teste local: menu e seleção de facção

O usuário encontrou menu divergente da main e seleção impossível no link8146.
Causa confirmada: eval/serve.mjs não expande FACTIONS.map do Astro; os cards mantêm
expressões não resolvidas. Capturas com auto= validaram mapa, não navegação do menu.
Orientação anterior corrigida em AMAZONIA-TESTE-LOCAL.md e no relatório de revisão.

Astro da própria branch iniciado em8156; HTML real renderiza dez data-faction.
Fetch read-only encontrou origin/main69555790 (alpha.223), 317 commits exclusivos
da main frente a HEAD; ela não contém map_amazonia.js. A branch não foi integrada.
Como opção conservadora para testar o menu atual, preparado snapshot git archive
dessa main em artifacts/amazonia-visual/main-preview/, dentro da mesma worktree.
Somente a composição de teste recebe builder/LOOK/registro/16 arquivos de mapa e
fauna do PR; menu/main.js/style.css/characters.js são idênticos à main por SHA256.
Node_modules e packs locais usam links dentro da worktree; nenhum outro checkout.

Preview Astro8157 validado no Chrome: abertura por Enter → SINGLE PLAYER → JOGAR
→ Time B → personagem → adversário → state=live, _mapId=amazonia, mundo presente.
Zero pageerrors e nenhum aviso de boot. Cinco facções, conforme main. Prova em
artifacts/amazonia-visual/menu-main.json e três PNGs. Builder preserva SHA256
2a6e9e5b89e4011fde1747a80040c16de840d0e30ba632de301ce411f85847e7.
Primeiras tentativas do arnês falharam na splash por interação inadequada; teste
final usa Enter real e cliques, sem auto= ou remoção programática da tela.
O mesmo fluxo no Astro8156 também passou até state=live, sem pageerror;
menu-astro.json registra seis facções prontas e quatro em produção no catálogo
da branch. Logo, o bloqueio geral vinha do servidor de avaliação, não do pickTeam.

Estado: preview para teste disponível8157, branch e avaliação visual anterior
preservadas. Nenhum merge/rebase/push/deploy. Próxima ação: revisão humana nesse
endereço; melhorias C18/C23/C25 e performance continuam pendentes. Não propagar
aprovação dos gates antigos para o runtime composto da main.

## Rodada de feedback humano: escadas, custo, mata e vida

Usuário aprovou a direção geral (“num geral esta bom”, “tirando isso tá muito bom”)
mas pediu escadas acessíveis, menos lentidão, mata mais densa, aves voando, barco
navegando e thumbnail fiel. Autorizou Mint.gg para assets se necessário. Preservar
arquitetura/identidade atuais. Fonte começa em97eeb516, preview continua main69555790.
Fotos em /Users/ruben/Documents/screen/Screenshot 2026-09-06 at 03.16.{07,21}.png.
Baseline browser main+map em artifacts/amazonia-visual/user-feedback-before/:
7 câmeras1536×1024 med, mesmo builder hash da entrega. Faltavam3 texturas e2 plantas
no snapshot, a corrigir antes de qualquer aceitação. Crítico stairs_audit mede
GLB real: escadas embutidas não têm chão físico e intersectam colisor da casa.
Plano: corrigir acessos reais e completar assets do preview; reduzir custo estrutural
por batching/LOD/sombras conforme diagnóstico; adensar fora do combate; reutilizar
arara_voo da main e avaliar pequena canoa no Mint; capturar thumbnail do runtime.
Próximo: régua vermelha dos acessos do GLB e correção, depois walk real no runtime
main e PR, mutantes, A/B, gates/build e crítico limpo. Performance permanece sem
aceite de FPS enquanto houver renderers concorrentes; não interromper outros.

Marco validado desta rodada: os nove acessos laterais novos passam AMA1 e os dois
mutantes de fonte (piso retirado / colisor antigo sobre escada) falham9/9. O runtime
main8157 passou42percursos, incluindo18subidas/descidas das varandas, sem erro de
página/HTTP e sem linha direta entre spawns. Revisão independente achou oclusão de
tiro ausente nas duas casas de chapa; corrigida e revalidada2/2 por raycast. Provas:
artifacts/amazonia-visual/feedback-final-med/, access-mutants/ e
feedback-independent-review.md. Capturas finais serão refeitas após fechamento
da mata ao fundo e thumbnail sem HUD; não confundir o recorte intermediário.

Assets validados Khronos: cinco GLBs, zero erros (7avisos). Originais preservados;
três derivados exclusivos registrados, arara/copião skylife idênticos à main69555790.
Mint gerou canoa-rabeta em chat ph741qaase7ng7c5gbq3348t658dwt3n (TripoP1): fonte
4.819tris, otimizado3.758tris/360.236bytes, hash60bfb8ed6387a00fb3b863a8b3e9de1343a704cfdf56555a74a1a948252c7fc7.
Pipeline e procedência em tools/amazonia-boat-asset.mjs e FONTEs. Barco move além dos
bounds (z mínimo45,38>44); quatro araras GLB em med, duas em low. Próximo: fechar
A/B controlado com assets completos, gates/build, capturar e servir thumbnail real,
revalidar menu e entregar link local. Não publicar nem propagar aprovação de FPS.

Marco final funcional: hash6435500ab916414271c3f531fa21462680a4895cfebd666cdde14cb412cfb74f,
51/51percursos em med e low, menu das duas versões passou, thumbnail real servido.
Revisão visual independente8/10 no recorte, sem bloqueante visual. Novas regressões
achadas durante revisão (oclusão, nonSolidSurface, guarda interna e Float32) foram
corrigidas e reprovam nos mutantes. Todos os GLBs validados e build passou.
Relatório consolidado: AMAZONIA-FEEDBACK-2026-09-06.md, recibo do thumbnail adjacente.
Próximo: commit dos fontes/réguas, regeneração/check dos docs e entrega do link.
FPS/performance de CPU e ORT1/ALT1/SUP1 continuam sem aceite; não publicar.

Checkpoint de entrega: assets em 5774823c, fontes/réguas em ebfda5c9 e inventários
regenerados em 070ba900, todos com DCO e Agent: Codex. `docs:check` e `arch:check`
passaram; `eval:mapid` passou novamente após excluir somente o snapshot local
arquivado. `eval:docsautoria` passou com mutações e restauração dos arquivos.
Fonte e thumbnail servidos em 8157 conferidos por
SHA256 com os recibos; HTTP 200. MAP_check rastreado restaurado ao original para
não substituir o relatório multi-mapa por medições desta rodada; prova específica
preservada em artifacts/amazonia-visual/feedback-map-final.json.

Estado final: rodada implementada, validada e pronta para teste humano em 8157.
Os 101 checks aprovados da execução ampla mais os reruns aprovados de mapid e
docsautoria deixam somente audio:check pendente nessa lista de 104 (manifest local
herdado, fora do escopo). Não foi repetida a lista completa após os reruns. Gates
específicos AMZ/AMV/AMA e MAP1/MAP6 aprovados; ORT1/ALT1/SUP1 do mapa-novo e aceite
de FPS/CPU permanecem pendentes, conforme relatório. Artefatos ficam locais,
fora dos commits. Nenhum push/merge/deploy. Próximo passo: feedback humano sobre
acesso às varandas, fluidez e nova ambiência no link local; para publicar, ainda
é necessário fechar os aceites pendentes, sem inferir autorização desta rodada.

## Continuação — thumbnail real com vídeo no hover

Pedido adicional: retomar o hover com vídeo real, como no trabalho do Sertão.
Base 7ac7b2c7. Localizado componente em b917cce1; adaptação sem trazer o outro mapa.
Clipe Game real gravado: 144 frames, 6 s, 24 fps, H.264 960×640/473.986 bytes;
poster = quadro zero (88.524 bytes). Fonte do mapa mantém hash 6435500a…cfb74f.
Recibo atual e mídias em public/img/map-previews/amazonia.{capture.json,jpg,mp4};
quadros e capturas de UI em artifacts/amazonia-visual/hover-*.
Baseline sem hover falha HOV3, entrega main8157 passa HOV1/2/3/4/5/6/7/9.
Build, medianet/screenquery/preload e dois mutantes de race passaram. Revisão
independente apontou resize/recorte/foco; ajustes implementados. Próximo: fechar
contraprova sem-saída/404/branch, crítica visual, checkpoints e docs gerados.
Objetivo anterior/pendências de FPS e gates genéricos mantidos no relatório anterior.

Marco validado hover: main e branch passam reprodução/saída/resize/troca de tela,
404 mantém poster e mutante sem-pointerleave falha HOV4. Dois mutantes de race
já reprovam o comportamento errado; fonte servida permanece sem falhas JS.
Crítico independente aprovou coerência do card e frames, sem bloqueantes; camada
do losango corrigida. Relatório atual AMAZONIA-HOVER.md. Próximo: checkpoint dos
fontes/mídia, atualização de docs gerados e entrega do link de seleção.
