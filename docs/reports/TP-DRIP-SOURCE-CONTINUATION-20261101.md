# S3: contrato independente da origem Drip (R727)

## Objetivo e ownership

A missão continua: consistência de mapas, personagens, skins, mãos/armas,
movimento/ADS e integração dos PRs elegíveis com release/backend. Flávio #1158
excluído; UI/social depois. Esta frente só escreve régua, fixture e este ledger.
Root é o único builder de factory/runtime/assets e o único operador de Ego/GH.
Não há aprovação de arte, anatomia, contato, loja, mobile, MP ou release.

WT `drip-glove-origin-r723-20261101`, branch de mesmo nome com prefixo `codex/`,
HEAD inicial `a8f246196e1c84cbe9ad223a06c071f6e547d0ad`. Sem commit/push nesta
lease. Normas lidas: AGENTS, regua, gauntlet-fps, progress/docs/LICOES,
ref-measure e catálogo do arnês. O STATUS do progress é histórico, não autoridade
da versão atual. Não foi regenerado ARCH nem executado browser/build escrito.

## Contrato aprovado antes do código

Root aprovou usar `buildRepositoryArtifacts(root, {includeCosmetics:true})`
real em memória. O default deve conservar os 57 GLBs (56 bases 3p + FP) e o
manifest shipping exatos; candidato Drip é só opt-in até GLTF/visual posteriores.
Flags false não são um gate de carregamento do runtime.

`F0` exige exatamente uma variante `bolsonaro-drip`, origem própria e o GLB no
Map real de artifacts. Ausência do alvo esperado é RED1, não INFRA. `F1` valida
registro, catálogo aprovado, seleção e cobertura cosmética separada. `F2` mede
triplos/rows cruas por um leitor independente do builder; permite reindexação
bijetiva, preservando sourceVertex distintos, winding e todos os semantic sets.
`F3` compara joints/ordem, ancestrais e raiz, TRS e IBMs sem impor a clonagem de
metadados irrelevantes do corpo inteiro. `F4` protege default/bases/FP/seleção
automática/cobertura. `F5` confere que a factory não alterou o corpo original.

O schema externo aprovado é `cs-glove-cosmetic-selections/1`, com um registro
Drip conforme R687. A seleção interna é `cs-glove-explicit-mesh-parts/1` e não
contém ownershipThreshold. `recordSha256` é SHA256 de
`JSON.stringify(record.selection)`, como na seleção base. Campos desconhecidos
dos registros/seleção são recusados. Não se impõe um novo package.id.

## Verdade independente e procedência

Desenho integral externo: `SKIN-DRIP-FACTORY-DESIGN-R687.md`. R573 fixa fonte
runtime `bolsonaro-drip-d2544f0b5f95.glb`, SHA256
`d2544f0b5f9565ea98b501177e34d961dccdb281c8653672958c7ec843e094a5`,
node24/mesh0/primitive0/indexAccessor6, 26 joints e família própria a938a2d09481.
O record R573 tem SHA256
`3f4cc165848d2937f547ac77a05aba1e284eca309c674683f8e4d6d84cca5144`.

A fixture guarda as listas literais 420L/420R revisadas, não resultado de censo
do producer. P004/P005 são superfícies conectadas da primitive0; não primitives
4/5. R546 CSV fixa L01=394 e R01=389; a diferença literal para R573 são 26L+31R
faces de extensão de punho. Nenhuma face dos oito componentes excluídos entra.
Não se escolhe maior componente nem se muda o corte de pesos. Fonte, body,
rings/cuffs originais continuam intactos. A fixture inclui os 58 artifacts
baseline (57 GLBs + manifest) medidos em disco no HEAD inicial.

`parseMeshPartsJSON` público é usado só para parsing estrito/duplicação JSON.
Não se chama splitMeshParts, censo, inspector ou builder para fabricar a verdade
geométrica esperada. A factory é o SUT; o leitor GLB/accessor da régua compara
bytes originais de cada row, inclusive seams e pesos. Fingerprints de origem
vêm do recibo R546 pinado. Os hashes de geometria/pesos declarados para a saída
têm validação de formato aqui; sua implementação de fingerprint continua no
contrato existente do inspector. Preservação geométrica/bind é medida por bytes.

## Estado de execução

UNRUN no primeiro freeze R727. Somente o nominal está autorizado nesta lease,
com Node22 explícito e recibo externo. Esperado antes de alterar o produto:
F0 RED por ausência real de variante/GLB Drip; F1–F3 NOT_MEASURED, sem crédito.
Import/fixture/container inválidos ou exceção do SUT são INFRA3; CLI inválida2;
contrato medido divergente1; nominal completo0. Nenhuma ausência esperada de
asset gerado é promovida a INFRA, nem se cria candidato falso para obter verde.

Após Root implementar o candidato real, permanecem UNRUN os controles causais:
troca por face ring/cuff válida, omissão das57, troca L/R, perda de Curl,
alteração de IBM/peso com SHA do container atualizado. Devem aplicar no producer
real e reprovar a cláusula semântica específica; parse/throw não conta kill.
As fronteiras F2–F5 de runtime/origem do desenho R687 não são implementadas nem
simuladas nesta régua factory/source. Sem alegação de cache/animation/fit.

Próximo: executar um nominal preservando o RED inicial; Root lê fontes/recibo e
implementa produto separadamente. Depois candidato real, mutantes causais,
GLTF/Game/Ego e crítica independente whole antes de qualquer adoção.

## Marco validado R727

Após freeze externo do instrumento, Node22.23.4 executou um único nominal real
em 3.295s: exit1, F0 RED (zero variantes Drip e GLB ausente no Map opt-in),
F4/F5 PASS, F1/F2/F3 NOT_MEASURED. Stderr vazio; sem timeout, candidato falso ou
crédito por ramos não medidos. O default produziu exatamente os 58 artifacts
congelados e os 57 GLBs shipping permaneceram intactos. Sintaxe do novo arquivo
também passou. Recibos externos `TP-DRIP-SOURCE-R727-NOMINAL.*`, pre-exec,
report e manifesto em `audits/2026-10-31-visual-consistency/`.

Autoria Native do instrumento/fixture/ledger, sem consulta GLM nesta lease.
Root revisou previamente o contrato e schemas; isso não é crítica independente
do código final. O checksum do oracle é fixo no checker; Root não deve regenerar
verdade a partir da saída do producer para obter verde.

Próximo concreto: Root lê o RED e implementa o candidato opt-in em memória.
Os ramos F1–F3 e todos os mutantes continuam UNRUN. Nenhum resultado atual prova
que um derivado futuro é correto, que a luva veste ou que o runtime por origem
funciona. Sem commit, push, alias npm ou mutação em factory/runtime/assets.

## Controles causais R740 e controlador portátil R744

Root implementou o candidato opt-in. R740 mediu dez casos válidos em processos
Node22 frescos: nominal e canário com seis PASS; sete negativos com failsets
exatos; reindexação bijetiva positiva com seis PASS. Ring/cuff, omissão das 57,
troca L/R e peso reprovam F2. Rename de Curl_R (26 slots preservados, sem remoção
topológica) e IBM reprovam F3. Uma tentativa V1 de peso foi INFRA do injetor por
supor JOINTS uint16; o asset usa uint8. Ficou preservada sem crédito; V2 corrigiu
só o decoder externo. Fonte e oráculo não mudaram. Recibos R740 permanecem
externos e não equivalem a prova visual, Game ou GLTFLoader.

O driver externo R740 não propagava exit agregado e não podia virar alias CI.
R744 acrescenta `tp-drip-source-mutants.mjs` e os helpers portáteis em
`tools/eval/fixtures/tp-drip-source-{loader,mutations}.mjs`, mantendo checker,
fixture JSON e produto intactos. Root fará o alias separadamente.

O CLI não aceita skip ou matriz parcial. Usa process.execPath, raiz por
import.meta.url e diretório temporário próprio do OS. São dez filhos por rodada,
com dois nominais sem loader. O pai exige um JSON válido, censo ordenado F0–F5,
status enum estrito, exit/failset exatos, stderr vazio, aplicação comprovada,
anchors únicos, nonce novo e pins estáveis. O resumo do pai usa ok boolean.
Qualquer INFRA, sobrevivente, saída incompleta ou contradição impede exit zero.
Sem número, face ou verdade geométrica copiada para o controlador.

Primeiro freeze R744: implementação UNRUN. Próximo: uma execução portátil
completa e dois controles focais da mesma agregação com filhos fake (survivor e
INFRA), sem repetir a suíte. Este controlador é minha autoria Native, não uma
crítica independente. Nenhuma edição de package, gate, produto, asset, Git ou GH.

Marco R744: sintaxe dos três módulos PASS. Uma única rodada portátil foi
executada em Node22.23.4 a partir do diretório temporário do OS, fora da WT:
exit0 em 32.29 s, dez filhos, sete failsets exatos, dois nominais sem loader e
reindexação positiva PASS. Stderr vazio, censo completo e pins estáveis.
Dois controles focais importaram as mesmas funções runChildCase/aggregateResults
usadas pelo CLI: um filho fake all-PASS/exit0 foi classificado SURVIVOR e o pai
saiu1; um filho fake INFRA3 também levou o pai a1. Nenhuma matriz foi repetida.
Recibos temporários foram copiados para os artefatos externos R744; não contêm
GLBs nem dados secretos. O Root ligou o alias/CI em paths de sua ownership;
esses arquivos não são autoria desta lease e não foram testados como gates
inteiros aqui. Próximo: rebind, crítica Native independente e checkpoint pelo
Root. Sem alegação de Game, GLTFLoader, fit ou aprovação visual nesta régua.
