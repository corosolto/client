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

Entrega hover concluída: c6431e5e contém mídia/runtime/réguas; 9f1d70df atualiza
inventários. docs:check e arch:check passaram. Evidência final HOV10 também valida
início por foco de teclado na main. Main8157 serve vídeo HTTP200/473.986 bytes.
A fonte geométrica permanece igual; artefatos volumosos fora do Git. Próximo passo:
usuário testar hover em ?tela=maps&map=amazonia&lang=pt&perfilauto=0, recarregando
com Cmd+Shift+R. Não há implementação pendente deste pedido de hover. Pendências
anteriores de FPS/CPU e aceites de publicação continuam no ledger/relatório anterior.

## Feedback — fauna nova, canoas e caminhar na água

Pedido do dono: integrar galinha/pintinhos recém-gerados no Mint, jacaré visível,
peixes saltando e retirar a sensação de delay na água. Base7153bed4. Fotos da
rodada anterior mostram canoas retangulares antigas; substituir também esses
cinco volumes pelo GLB de rabeta já aprovado, mantendo navegação livre.

Diagnóstico validado Game._updatePlayer: o booleano slowAt cortava55% da velocidade.
Em120ticks, água percorria2,100m vs4,584m no controle sem freio; ambos iniciam no
primeiro tick, sem colisão nessa rota. Não é prova de FPS/input do navegador.
Novo mapa mantém waterAt para som e slowAt=false por padrão (amzwaterslow=1 restaura
baseline). Uma linha do Game aceita footstepSurfaceAt, preservando fallback de
outros mapas. Hook reaplicável no snapshotmain por amazonia-water-runtime.mjs.

Assets Mint: Adult Hen e Baby Chick, pack th78004y9j8g2kd0mkd45xq65x8dw112, chat
ph7b9m9y8gfz5j83vkxqsrbvzs8dxgba. Download dos URLs efetivamente exibidos no viewer,
sem gerar/pagar novamente. Originais e metadados em artifacts/amazonia-visual/fauna-round2/.
Derivados: galinha4.062tris/370.588bytes e pintinho3.616tris/198.532bytes; ambos
Khronos0erros/1aviso. Uso local pedido expressamente; termos oficiais de publicação
não verificados, sem inventar CC0. Registro/FONTE atualizados só nesta worktree.

Implementação em validação: galinha+3pintinhos estáticos no quintal, jacaré do acervo
na margem, dois peixes saltando alternadamente (um no baixo), cinco canoas GLB sem
volumes cegos antigos. Não aplicar rig humanoide aos novos animais. Próximo:
capturas med/low e caminhada51rotas, crítica independente, recibo/thumbnail/vídeo
regravados, gates/build, checkpoints e entrega local. Nenhum push/merge/deploy.

Marco validado: med e low passam51/51rotas, AMV4, aves4/4 e2/2, composição
galinha+3pintinhos/5canoas/jacaré/saltos. AMW1–3 verdes; mutantes freio/áudio
falham AMW1/AMW3 e mutante AMV6 morto, fonte restaurada. AMZ1–7, superfícies,
MAP1/MAP6 e contrato MC1–3 verdes; build passou. Em seco o callback agora retorna
undefined para manter materiais da main. Crítica independente detectou casco
inundado: elevamos quilha para2,5cm abaixo água, nova captura final-med mostra
piso seco. Fonte7e144533e7f23d22838bf50812afc1f1801adb2933df09792d7db7f667e720fa.
Imagens/código em revisão final independente; gravação da mídia atual em curso.
Próximo: recibo/hover, docs gerados e checkpoint de entrega. Desempenho FPS e
pendências herdadas não foram declarados resolvidos.

Checkpoint61413c4b preserva implementação/assets/réguas. Crítico limpo aprovou
final-med/canoa-amarrada.png e fauna, com limite de continuidade dos saltos ainda
restrito aos cinco frames. docs:check/arch:check passaram após regenerar inventários.
Primeira regravação de vídeo expirou no boot240s sem tocar mídia antiga; captura
agora reconhece guarda de boot e oferece até duas tentativas pelo botão real.
Segunda gravação entrou live sem guarda. Próximo: validar mídia e hover, entregar.

Entrega validada: captura144frames concluída, recibo contém fonte7e144533 e hashes
dos dois novos GLBs, errosJS/HTTP vazios. Hover na main8157 passa HOV1/2/3/4/5/6/7/9/10.
Inventários/checks em c0a6218a. Reporte completo AMAZONIA-FAUNA-AGUA.md, instruções
AMAZONIA-TESTE-LOCAL.md. Objetivo desta rodada concluído localmente: fauna, saltos,
canoas e movimento na água; atualizados thumbnail/vídeo real. Próxima ação do dono:
Cmd+Shift+R no preview8157 e conferir quintal/margem/canal. FPS, gates genéricos
herdados e publicação continuam pendências separadas; nenhum push/merge/deploy.

## Rodada cabanas e apoios — base41eea0c1

Objetivo: corrigir fauna suspensa, tornar movimento perceptível sem deslizar a
onça deitada, abrir11cabanas para entrar/sair, proteger-se e atirar das janelas.
Definition of done: apoios e movimento medidos, caminhada real pelos interiores,
raios de tiro atravessam vãos e param nas paredes, imagens e crítica independente,
preview8157 sincronizado e mídia real atualizada. Baseline AMH1/2 falha: tucano
suspenso1,066m; papagaio2,335m; onça centro2cm acima do tronco (palpite de que todos
flutuam refutado). Game já atualiza ambience; movimento da onça é escala1,2%.
Root integra mapa/testes/browser; agentes com faixas novas separadas:
cabin_shell cuida de derivadoGLB+amazonia_cabins.js; fauna_motion de
amazonia_fauna_motion.js. Nenhum edita Game/sharedruntime. Artefatos cabin-round/.

Marco cabanas/apoios: med fontec3cbf2b6 passa51rotas antigas,11entradas/11saídas,
44aproximações às janelas e44raios livres+44peitoris bloqueantes por _fireHitscan
real. AMH1/2/3/4 verdes; movimento de cabeça e pés/galhos fixos confirmado por
vértices e imagens. GLB aberto2d572430 (2167tris/352964bytes) corrige plano antigo
do telhado. Crítico independente aprovou onça/tucano e interior madeira, reprovou
copa atravessando teto da chapa apesar dos raios verdes: novo recorte local de
folhagem em implementação. Próximo: integrar recorte, capturar low/med finais,
contraprovas, custo CPU local, registro/reportes, mídia real e checkpoints.

Novo escopo autorizado pelo dono: terminar, atualizar com main, resolver conflitos,
validar build e mergear. Relato adicional: bots perdidos; investigar caminhos
reais até objetivos/interiores antes da integração. PR439 tem base antiga
feat/times-e-mapas-completo; head remoto5c66d28b é ancestral desta branch.
Última main consultada a551204f. Preservar checkpoint local antes do merge.

Checkpoint85e2af1a preserva cabanas/fauna. Maina551204 incorporada com
resolução restrita: runtime/menu/audio e demais mapas da main, só delta Amazônia.
Build integrado passou (build-main.log). AMZ, superfícies, água e quintal
passaram após adaptar teste de travessia ao _updatePlayer atual sem mantle.
Crítico aprovou capturas final-med (apoios, poses, cabanas e teto limpo).
Custo isolado normalopt caiu6.15–8.79ms→0.53–1.87ms em ABBA concorrente;
não equivale a FPS. Bots reproduzidos4/6rotas; correção do grafo em andamento.
Próximo: validar todas rotas de bots, captura integrada e mídia, gates/CI e
merge PR439 para main conforme autorização explícita do dono.

Marco final runtime: bots seeds7/42 passam71/71, mutante sem camadas mata
3rotas/27arestas, golden dos demais mapas passou. Fontes finais Game25373881
e mapa23f6f611; mídia real regravada com esses hashes. Porta8157 agora serve
a árvore integrada (snapshot antigo arquivado),8156 alternativa. Captura
main-low valida51rotas, apoios/animação, portas/janelas e contraprovas;
menu integrado permite facção/personagem/adversário e chega ao estado live.
Checkfast integrado completou81/86; mapid (artefatos), audiofab (hook de
superfície) e audio:check (metadado local ignorado) corrigidos e retestados.
Arch e autoria/docs serão regenerados no checkpoint final. Próximo: gates
finais, revisão independente dos bots e histórico limpo baseado em main.
A história antiga será preservada em checkpoint/tag; não falsificar trailers
de commits antigos. AtualizarPR439 por lease após backup, CI e merge autorizado.

Main avançou durante a validação: integrada971342e4 (alpha.225), preservando
ops/retry novos. Conflitos apenas em blocos gerados, reconstruídos com o gerador.
Build final anterior e7/7retestes locais passaram; hover integrado verde.
Próximo checkpoint guarda a história completa antes da integração limpa.

Crítica independente final dos bots: sem bloqueantes. Flag só Amazônia,
nenhuma aresta termina na camada errada; seed13007 também71/71. Há transições
baixas até0,88m entre leito e pontões: não alegar ausência de saltos verticais.
Checkpoint188246a1 contém a integração main971342e4. Preservado pela branch
codex/amazonia-visual e tag archive/amazonia-visual-20260906; a próxima branch
codex/amazonia-main aplica somente o delta final sobre main, sem264commits
legados que não satisfazem DCO/Agent. PR antigo5c66d28b terá tag de backup
antes da atualização com force-with-lease. Merge segue autorizado pelo dono.

Integração limpa94942e62 enviada ao PR439, agora basemain; backups remoto
archive/pr439-before-main-20260906 e archive/amazonia-visual-20260906 confirmados.
Buildmain225 e5/5gates (docsautoria/arch/docs/redesign/ops) passaram; prepush
completo138s. Vercel dpl_7CEYJvsT3rqaGbEE32Y1XDJsAL5w parou no pacote privado:
mapSoundscapes sem Amazônia. Régua AMAP reproduz e correção de preparo reutiliza
água/vegetação existentes sem novosassets; mutante mata. Próximo: reenviar após
revisão, aguardar CI/preview e merge autorizado.

Main avançou novamente para70f52493 (Lajes) durante CI. Merge conciliado:
Game preserva layeredNavigation de Lajes e botLayeredNavigation da Amazônia;
footstepSurfaceAt passa y para manter terra/laje. Fauna mantém pipas da main.
Controlador de preview da main permanece intacto; controlador Amazônia foi
movido para amazonia_map_preview.js e ambos menus preservados. Preparos de
áudio Lajes/Amazônia executam juntos após fetch, sem alterar outros overrides.
Pacote/registro/CI combinam os mapas; blocos gerados reconstruídos.
Próximo: testes de ambos mapas e hover, build, novo CI e merge autorizado.

Marco integrado alpha.226/2786fa48 emedc43011: build-alpha226.log passou.
Amazônia71/71seeds7/42 e mutante68/71; Lajes7/7integração,3728arestas livres,
consultas por camada100%,21/21bots no chão com/semcombate. Golden genérico
passou. Hover real após wrappernovo passa9checks e figura static.png revista.
Régua de som Lajes passou após fixture incluir os dois preparos; docs/arch/
docsautoria verdes. Crítica independente final sem bloqueantes emruntime,
preview, áudio ouregistries. Próximo: push final, marcar PR pronto, aguardar
checks do SHA atual e preview remoto, merge autorizado. Não afirmar FPS geral.

VM14 bloqueou build do PR emc31d5ebb (run34013225748):71pickups,1inalcançável
e4abaixo do piso. Dono autorizou explicitamente corrigir somente o gate e mergear.
Correção restrita ao mapa: slot0 troca com slot2 nos spawns existentes de ambos
times, ancorando rack longe da margem; MP5 sai da pilha de toras para seu lado.
Nenhuma arma removida, spawn criado, colisor ou critério alterado. pickup-fixed.json
mede71/0/0/0; pickup-mutant.json restaura as posições antigas apenas no loader
e volta a71/1/4/0. Artefatos emartifacts/amazonia-visual/cabin-round/.
eval:amazonia passou, incluindo71/71rotas de bots (seed13007). Próximo: mídia
real atualizada, crítica independente, push/CI do novo SHA e merge autorizado.
Não continuar features da Amazônia nem abrir investigação de Lajes neste fechamento.

Checkpoint 09454be8 guarda a correção VM14. Main avançou para f7f4402e
(alpha.227, Escadão), incorporada nesta integração. Conflitos preservam os
três mapas, previews e preparos de áudio; documentação gerada reconstruída.
Revisão independente dos cinco módulos compartilhados passou, incluindo
contraprova UIR4. Gates locais afetados: 10/10 em 145,6 s, registrados em
artifacts/amazonia-visual/cabin-round/gates-alpha227.log. A captura real foi
refeita com mapa SHA 6d155a14 e revisão visual do poster: passarelas, rio,
barcos, cabanas e mata correspondem ao cenário jogável. Recibo com hashes
em public/img/map-previews/amazonia.capture.json. Próximo: CI e merge.

7a613e11 enviado ao PR439; pre-push passou (19 s), build alpha.227 local
passou e docs/arch/autoria passaram 3/3. Hover local e remoto passaram 9/9.
Preview dpl_9VLKqyz8Jpjso3ucZ1ugbdjaCoxH READY para esse mesmo SHA: oito
fontes/assets conferidos byte a byte, áudio HTTP200 com 16 mapas e overrides
Amazônia/Lajes/Escadão. Capturas pickup-rack.png e pickup-mp5.png revistas:
armas em terra firme e MP5 visível ao lado das toras. Sem erros JS ou HTTP.
CI pr-fast34014646644 ainda executa invariantes; sem revisão pendente no PR.
Aguardar todos os checks antes do merge, sem bypass.

## Pausa por coordenação — 2026-09-06

A coordenação da tarefa 01a073e4-50fa-7c52-9ac7-729a088fc976 determinou
pausa antes de merge/deploy. Objetivo completo e autorização de merge após
todos os gates permanecem, mas a retomada depende de novo despacho.
Branch local: codex/amazonia-main; implementação e head remoto do PR439:
7a613e1195958f50b5111b0f1234484aeb1c1896, baseado em main f7f4402e (alpha.227).
Só este ledger mudou após o push; checkpoint documental local não será enviado.

Aceito: VM14 71 pickups sem falhas, mutante 1 inalcançável/4 abaixo do piso;
71/71 rotas de bots; 10/10 checks afetados pela integração; build local;
docs/arch/autoria; revisão independente; hover local/remoto 9/9 e deploy
de preview READY com oito fontes/assets idênticos e áudio dos 16 mapas.
Rejeitado: posições antigas de pickups. Não continuar melhorias do mapa
nem investigação de desempenho de Lajes neste fechamento.

PR439 permanece OPEN/BLOCKED, sem merge. Run34014646644 ainda executa
invariantes; único check pendente era build na consulta de pausa. Todos os
outros checks aplicáveis passaram. CI remoto foi preservado, sem cancelamento.
Artefatos: artifacts/amazonia-visual/cabin-round/{pickup-fixed.json,
pickup-mutant.json,pickup-rack.png,pickup-mp5.png,gates-alpha227.log,
build-alpha227.log,hover-remote-pickups.log,remote-source-pickups.json}.
Preview: dpl_9VLKqyz8Jpjso3ucZ1ugbdjaCoxH. Histórico anterior nas duas tags
archive já documentadas. Nenhuma automação própria; workers concluídos.
Watcher local e servidores exclusivos 8156/8157 encerrados para liberar
recursos; nenhum navegador de teste permanece aberto.

Próximo marco, somente após despacho: consultar conclusão do run34014646644,
revalidar head/regras/conflitos/revisões e todos os checks, então merge PR439
com guarda de SHA se autorizado a retomar. Se falhar, corrigir apenas gate real.
Servidor pode ser retomado nesta worktree com Node23 e o comando de
AMAZONIA-TESTE-LOCAL.md (porta8157). Não disparar testes de novo sem necessidade.

Coordenação confirmou que a pausa é transição para redistribuição, com meta
global até 07/09 aproximadamente 06:55 Lisboa. Candidato pronto para revisão:
7a613e11, sem desenvolvimento adicional previsto. Estimativa do próximo marco
após despacho: 5–10 minutos se o CI já estiver verde (consulta e merge), ou
15–30 minutos se for necessário aguardar/revalidar gates; o job de invariantes
levou cerca de 10–12 minutos nas execuções observadas. Bloqueios de entrega:
despacho da coordenação e conclusão verde do build; falha nova de CI ou novo
conflito com main exige reestimar. Não há bloqueio de asset/visual conhecido
para o escopo aceito. Produção permanece parada.

## Fechamento — 2026-09-06

PR439 integrado por squash em `0af5e1180bada645846119d5b3c15a77e107514f`,
aplicando o SHA validado `7a613e1195958f50b5111b0f1234484aeb1c1896` sobre
`main` alpha.227. Guarda de SHA, base sem drift, revisões resolvidas e todos os
checks do PR foram conferidos antes do merge. A release pós-merge foi iniciada
pelo repositório; acompanhar somente seu resultado, sem reabrir desenvolvimento.

A execução de release do merge foi cancelada pela fila em favor da release
subsequente `v2.0.0-alpha.228` (`bc8ce4e9`), que concluiu com sucesso e contém
`0af5e118`. O deployment de produção `6289742804` foi marcado como concluído
para esse SHA; sua URL responde com a proteção SSO esperada, portanto a
verificação HTTP anônima não inspeciona o conteúdo publicado.

## Hotfix CTF2 após integração — 2026-09-06

O gate global passou a medir a Amazônia e encontrou uma única rota nos três
pares que saem do spawn B. A causa não era colisão nova: a grade de navegação
de 3,2 m saltava toda a faixa externa transitável entre palafitas. A faixa
`ROTA_LATERAL_B` insere nós de 1,6 m já percorridos pela física real e liga
somente suas duas pontas ao grafo existente; não move spawns, objetivos,
colisores ou geometria. `map-check amazonia` agora mede duas rotas separadas
para E, MID e B (as seis combinações em 2/2); `amazonia-bots-check` passa
71/71 nas sementes 7, 42 e 13007. A contraprova `?amzctf2lane=0` remove a
faixa e devolve B→E/B→MID/B→B a uma rota, reprovando CTF2. A investigação
separada de escala 5x5/8x8 e da aparência das palafitas permanece pausada por
coordenação, sem mudança de runtime, renderização ou Lajes.

Após crítica independente, `tools/eval/amazonia-ctf2-lane-check.mjs` passou a
medir as 25 ligações explícitas da faixa com `Game._walkReach` nos dois
sentidos. A primeira tentativa revelou uma ligação de 3,578 m; ela foi
subdividida. O recibo final mede 24 nós, 25 ligações, zero falhas e maior
segmento de 2,263 m (≤ passo original de 3,2 m), em
`artifacts/amazonia-ctf2-hotfix/lane-pointsonly.json`. Recibos fixed/mutant do
CTF2 e das 71 rotas estão no mesmo diretório. Nenhuma aresta é aceita apenas
por estar no grafo: todas são caminhadas pela física real antes do checkpoint.
Os recibos finais correspondem à fonte `map_amazonia.js` SHA-256
`a2996b7268089930e739df99962a40857469fd602714b6a1564b7fa8a39cb1d7`.
O contrato PONTAS-ONLY exclui a faixa da vizinhança automática: os únicos
contatos faixa→grafo são os dois conectores explícitos. O seletor recusa nó
com desnível maior que 0,55 m; isto eliminou a tentativa de conectar ao
patamar alto. O recibo `lane-pointsonly.json` registra esses dois contatos,
24 nós, 25 ligações e caminhada sem recuperação nos dois sentidos.
O degrau de piso observado de aproximadamente 0,406 m continua documentado
como limitação da rota; esta correção não a suaviza nem afirma que ela seja
imperceptível.
