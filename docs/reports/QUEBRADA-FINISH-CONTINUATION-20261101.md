# Checkpoint R92 — UV2 aceito no recorte focal

Esta seção supera o estado STATIC_ONLY e as pendências de A/B abaixo. Missão
integral, CPU/artefatos rejeitados e demais limites históricos ficam preservados.
Root adotou a fonte exata7be5b81 na composição isolada skins-visual-stack-20261101,
baseada em AB, depois dos25casos CPU/5selfchecks e crítico estático R90.

Ego real em Game normal SP/Quebrada/med/pós, sem flags test/online/paused/dedicated:
UV2→UVmetade→UV2 em uma callback. A/restauração byteiguais65a2a9f3; Bcdf3db75.
Onze módulos carregados pinados; só UV do bucket alvo mudou. Controle,
geometria nãoUV, materiais e controles amostrados estáveis. Cleanup de UV,
Debugger/handles e retorno ao Game confirmados; realm próprio fechado.
Viewport1320×880DPR1, canvas660×440 pela qualidade med. A posição foi repetida
por reposicionamento diagnóstico, sem afirmar caminhada ou nova baseline-world.

Root e crítico independente R92 observaram as três imagens e preferiram UV2:
o tijolo deixa de parecer bloco grande em relação às janelas e casas vizinhas.
Vetor independente da vista: M1 UNKNOWN; M2=2 focal; M3 UNKNOWN; M4 UNKNOWN.
Volumes em caixas, encontros e arquitetura ainda precisam de trabalho; mapa,
movimento, mobile físico, multiplayer e custo não estão aprovados.

Artefatos externos: ROOT-QUEBRADA-UV-ADJUDICATION-R92.json,
CRITICO-QUEBRADA-VISUAL-R92.md/RECEIPT, ROOT-QUEBRADA-UV-CLEANUP-R92.json e
QUEBRADA-UV-ABA-R91-2026-11-01T06-16-50-038Z/result.json na auditoria da missão.
Próximo: checks da composição, push normal completo, bot/crítico/CI atuais e
release elegível; depois seguir a dívida arquitetônica sem declarar mapa pronto.

# Quebrada acabamento — continuidade R85

Objetivo: melhorar M2 (escala e acabamento de superfícies) e M3 (encontros e construção intencional) nas três frentes visíveis da captura hospedada PICKUP-AWP-HOSTED-AB-R85.png, sem ampliar a missão ao mapa todo. Done: diagnóstico de materiais/UV reais, candidato pequeno justificado e reversível, física/occluders/topologia/arte intocadas, A/B real e crítica independente após liberação do Root. Esta etapa é STATIC_ONLY; nenhum gate/arte foi aprovado.

Branch exclusiva codex/quebrada-finish-r85-20261101, base/HEAD ab4114d02657cd041fec88c96a4ca1ab0f36349e, criado limpo. Owner: campo_fachadas_glm_r17. Lease inicial: public/js/map_quebrada.js e este ledger; nada de edição compartilhada em mapprops/vao/textures/world helpers/GLBs. PR1188/release,1158/OperaçãoFlávio,Javaporco e1192/fauna de outros owners preservados. Ego pertence ao Root50/p1.

Antes observado: PNG1320×880 aberto; tijolo foto fino à esquerda, tijolo laranja/juntas espessas à direita, encontro laje/reboco/janela em blocos. HUD/banner/arma ocultam parte do frame. JSON liga a captura hospedada ao build ab411 e game952dc9d7/main07ee531e; não inclui posição/câmera ou identificadores de malha. M2/M3 ainda UNKNOWN como nota, sem alegar paridade com Campo.

Fonte: buildQuebrada/barraco/barracoGlb/quarteirao e PropBatch lidos. GLBs reais fav_house/fav_brasileira substituem visualmente proxies; editar paredeTex/addBox ocultos não melhoraria o runtime. Helpers caixaUV/escalaUVporMundo presumem ordem/grupos BoxGeometry: não aplicar cegamente a primitivas GLB. Campo fornece precedente de fase UV no pano integral, não licença para trocar atlas.

Inventário RO autorizado explicitamente pelo Root: chunksJSON/accessors/UV/material/bytes GLB via Pythonstruct/json/hash, sem importar produto. Audit externo QUEBRADA-GLB-STATIC-R85.json e QUEBRADA-GLB-COMPACT-R85.json; imagens embutidas extraídas sem reencode, não entram no Git. fav_house10materiais/1070tri; fav_brasileira7/780tri. Imagens vistas confirmam brickwall1/fav_house como tijolo foto e material1/fav_brasileira como tijolo laranja de juntas largas; material2 é reboco separado. Não é atlas único de janelas/portas, mas cada material e sua topologia precisam continuar preservados.

Aceito: correção seletiva em material/UV real se o locador for confirmado. Rejeitado: ganho só no proxy Node, troca global de GLB/template/texture, blur/subdivide, mudar arte/decalques/física/luz/câmera ou financiar geração. Nenhum código de produto alterado até aqui.

Bloqueio técnico parcial: os três atores/placements exatos ainda não foram vinculados à captura. Root solicitado a fornecer posição/yaw e bboxes/asset/instanceIndex; não adivinhar que índice interno de GLB é parede pelo nome apenas. Enquanto isso, GLM fará proposta RO baseada no fonte/inventário. Próximo: ler/adjudicar proposta, então só autorar candidato se couber no lease e preservar os contratos. Nenhum teste/parserSUT/import/build/server/browser/full107/commit/push/GH nesta fase, conforme instrução do Root.

## Candidato estático R85 — duas frentes + controle

Root entregou `QUEBRADA-ACTUAL-SURFACE-LOCATORS-R85.json`, SHA8507e228ecb0f2df60580692a071c6fabf27a0a57478bad7d6ebbec6014b90d4, captura hospedada normalSPguest/AWP ab411, live/testfalse,1320×880. Câmera[-21.78601209020365,1.62,-42.20467595540219], yawPI. Dois alvos coarse: fav_brasileira/materialMateriais, inst0/1 do mesmo bucketcount2; bbox0x[-28.0225,-24.9775],z[-35.4321,-31.5568]; bbox1x[-27.9775,-25.0225],z[-32.7288,-28.9680]. Pixels[1030,255] e[820,395] os ligam ao frame. Controle sem mudança: fav_house/brickwall1 em[1210,350]/[1200,430]. Root autorizou reduzir três frentes a dois alvos+controle. Os12raios/2hits e ancestry do coletor não provam oclusão completa; o guard do coletor só filtrava object.visible, sem visibilidade herdada. Nenhuma inferência de raycast é promovida a prova de pixel total.

OMP zai/glm-5.3 low, sessão60426, max4m, exit0. Start05:37:00.796633UTC; final-log05:39:29.967835UTC; aproximadamente149,171s até o último log (não perfil de inferência preciso). `QUEBRADA-FINISH-GLM-RESULT-R85.json` e raw/log/prompt/guard externos preservados. Modelo leu fonte real mas seu tool truncou o compactJSON; abriu só metadados do PNG, sem claim de visão. A observação visual e leitura completa de bytes GLB foram nativas/Root. Proposta bruta8.251B SHAe299f1b4dacdcef4c56d42d4a4473de92830bdcc0299e1c785b674047d3ee43a.

Adjudicação nativa: aceitar seletividade/reversibilidade e rejeitar três pontos do GLM: dimensão de tijolo0,21×0,065m sem referência, causalidade invertida largura→altura (escala uniforme preserva proporção), e mudança no controlefav_house com faixa baked. LotePBX/clone de textura adicionaria materiais/partes de modelos desnecessariamente; os locadores posteriores mostram que um único batch de tijolo já contém exatamente os dois alvos. Autoria do candidato é nativa, apoiada na análise GLM e no locador real; nenhum segundo round foi gasto nem atribuída autoria GLM ao patch.

Patch só em buildQuebrada, após PB.build e antes da coleta de occluders/grafitar. Seleciona fav_brasileira/Materiais/count2 e topologia275v/275UV/666índices, imagem1024² e bijeção das duas bboxes capturadas. Tolerância1mm é somente do localizador Float32 arredondado; não altera teto/gate/física. Se o asset/lote não corresponder, o piloto não altera nenhum batch; probe posterior deve acusar alvo0 em vez de aceitar ganho. Só então clona a geometria DO BATCH e aplica u'=2u,v'=2v uma vez a todos vértices UV, com mesma origem0 autorada. Nenhum reset por triângulo/box; fase relativa dos UVs e seams inteiros preservados. `?qfinish=0` pula todo o bloco; `userData.quebradaFinishR85` identifica aplicação para leitura do Root.

Por que fator2 é hipótese razoável, não limiar: inventário estático com transformações glTF e jacobianoUV das faces verticais (`QUEBRADA-GLB-UV-METRIC-STATIC-R85.json`, reproduzível por `quebrada-glb-metric-static-r85.py`) dá mediana ponderada por área no targetH1: fav_house~1312px/m em ambos eixos; fav_brasileira~1946,81H/1870,17V,174tri verticais contra317do house. A densidade real divide pela altura efetiva da instância; as texturas contêm quantidades diferentes de tijolos por tile. Isso não é medição artística nem valor físico universal. O2 reduz pela metade a dimensão visual dos módulos laranja sem tocar o desenho/reboco/janelas; só o A/B pareado dirá se ficou coerente. Um comando auxiliar de inventário teve erro de sintaxe antes de produzir saída, corrigido no script externo; nenhum erro de SUT foi afirmado.

Helpers do PR: escalaUVporMundo/caixaUV assumem facegroups BoxGeometry; esse GLB tem275v/222tri e múltiplos panos. Aplicá-los diretamente seria incorreto. O candidato usa o mesmo princípio de fase no pano do Campo, preservando UV existente com escala inteira, em vez de fingir que é uma BoxGeometry. Nenhum helper global foi alterado.

Invariantes pretendidas: material/textura/sampler/Source compartilhados não são escritos; outro bucket do asset e fav_housecontrole permanecem nos originais; positions/normals/index/groups/drawRange/instanceMatrix/meshidentity/cast/receive/occluders/colliders/rotas/spawns/fauna/decalques/PBR não são editados. Custo previsto: uma geometry adicional para isolar UV (buffers duplicados); meshes/triângulos/materials/textures/calls iguais por construção. Isso ainda não foi medido em CPU/runtime, portanto é intenção de diff, não gate verde. M3 de laje/reboco/janela em caixas continua pendente; UV não resolve arquitetura.

Probes planejados, somente após Root liberar: (1) syntax/import da candidata; (2) baselineqfinish0 vs default com assets reais, contar exatamente1batch/2instances marcados, mesma geometria nãoUV e mesma física completa, verificar outros buckets/controle sem delta e UV multiplicado exatamente2; incluir modo semGLB explicitNA, sem fingir execução de alvo; (3) A/B real1320×880 e close, mesma câmera/qualidade/fontes/estado e janela/fase de spawn fora do banner, sem mexer na câmera do jogo para mascarar defeito; (4) renderer.info/custo nas duas condições; (5) crítico independente M2/M3. Mutantes futuros: seletor global indevido, controlefav_house alterado, UVs não modificadas/clip de draw devem ser detectados pelo probe, mas nenhum teste foi escrito ou rodado agora. Aprovação focal ainda UNKNOWN, mapas/mobile/MP/release UNKNOWN.

Próximo concreto: Root lê diff/manifest e decide se libera CPU para esses probes. Nenhum parserSUT/import/test/build/server/browser/full107/commit/push/GH executado. Sem milestone validado de produto, não há commit/checkpointGit; patch+hash externos e este ledger são a recuperação nesta fase.

Aplicabilidade adicional: `?batch=0` também é NA para o piloto (placeProp-clones, sem o InstancedMeshcount2 medido), não uma execução bem-sucedida. O kill `qfinish=0` continua baseline em ambas as variantes. Isso precisa ficar explícito no probe; não expandir para clones ou template sem nova evidência.

## Milestone CPU focal autorizado — sem adoção visual

Root liberou Node22.23.4 focal, sem107/build/browser. Probe externo e25expected foram congelados antes da execução; esperadoSHA870bd75d15d44cd8456b407eb42b45aa7bcb26d8b741e3dcc98128938d3feab7 não mudou. Fontef91 original/kill/default já confirmou alvo1batch/2inst,UV2 e paridade nãoUV/físicaCPU/occluders/controle/templates. Três safetyREDs reais motivaram microfix: rejeitarUVinteira/normalized, rejeitarWrapClamp e atualizar worldmatrixantesdelocalizar. ErroNAdo instrumento (tagsbatch0emGroup) foi corrigido no probe, com bruto preservado e casoantes isolado repetido. Fonte final7be5b81f64f5e7c8419a83096bafdd387e18566c6c8c79a6dc108dd9aa44bb2e soma36adições (+4guardas após32originais).

AFTER25/25exit0+5selfchecks; complemento de hierarquiaGroup/Scene repetiu os mesmos25expected,25/25exit0. Snapshot final em QUEBRADA-FINISH-CPU-FULL-HIERARCHY-R85; relatório completo QUEBRADA-FINISH-CPU-REPORT-R85.md. Fonte originalab411 vsqfinish0 tem paridadeCPU. Snapshot nominaldefault altera sóUVdoalvo; todosoutrosUVs, material/sampler/atributos/índices/drawRange/grupos/matrizes/renderflags/hierarquia e físicaCPU (incl20757ground,occluders) iguais no escopo de doisGLBsreais+demaisfallback. Collider/tiro em jogo real, arte, M3arquitetura, mobile/MP/release permanecem UNKNOWN.

O sampleralvo Repeat1000/1000,repeat1/1,offset0/0,imagem1024² foi observado viaGLTFLoaderreal e19imagensWebPbytes/dimensões; codec/ImageBitmap émetadataCPU, semdecodificar/rasterizarpixels. Caminho normal temmatrixworldidentityconfirmado; sópaideslocadocontraprovoucache stale. Segurança paraarray/null/atributosfaltantes/int/clamp/pai écheckpoint do bloco, não mapa completo. SemGLB/glb0/batch0explicitNA. Negativos selector/control/noUV falharam comconjuntos exatos congelados.

Custo medido CPU:1546meshes/159964referênciastri/266materiais/143texturas iguais;929→930geometrias; +13664Bbuffers; gruposCPU4875iguaisnão são drawcalls. Build/heap pontuais no relatório sujeitosJIT/GC, sembenchmark ouaceitemobile. RawGLM/propostas/BEFORE/probesanteriores preservados. Nenhum helper/asset/deps/node_modules/WTalheio tocado, nenhum browser/server/full107/Gitcommit/push/GH. Próximo: Rootfullread, câmera A/B e crítico independente antes deadotar; ownership devolvido e nenhuma execução adicional necessária enquanto o SHA ficarcongelado.
