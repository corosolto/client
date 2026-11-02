# Campo: contrato de atributos CU-8

## Objetivo e definição de pronto

Fechar o P2 confirmado: counts/getters CPU preservados aceitam itemSize inválido. Exigir position3, normal3, uv2 e index1 em blocos(), para fim e std, antes dos getters. Candidato local com BEFORE/AFTER e reversão da guarda, nominal verde, mutação realmente aplicada e somente CU-8 vermelha; CPU Node22/26 e crítico independente Root. Não altera produto, CU-3, tolerâncias, fixture, pins ou matriz legada.

## Base e lease

Branch codex/campo-attribute-contract-20261101, base5732b65df8283b8cbbb19e74bad4e705b1c85470, worktree campo-attribute-contract-20261101 clean na entrega. Lease somente campo-uv-finish-check.mjs, campo-uv-finish-mutations.mjs, CAMPO-UV-FINISH.md e este ledger. node_modules é symlink ignorado QA, package exceto scripts e lock iguais; nenhum install/conteúdo editado. Sem browser/headless/build/fullsuite/push/PR/QA/skins/env.

## Evidência recebida e pendências

Root reproduziu position itemSize1 stride3 com count/getters iguais e CU1..8 PASSA no pin5732, Node22, fonte externa sem editar base: aggregate audits/2026-10-31-visual-consistency/CU8-ARITY-BEFORE-R61.json e log. Uso itemSize pelo vendor é evidência de fonte; colapso GPU é inferência, não browser medido. normal1 stride3, uv1 stride2 e index2 [i,0] são contraprovas equivalentes a executar.

## Autoria GLM (2026-11-01)

Guard de aridade estrito pos3/nor3/uv2/idx1 inserido em blocos() entre o early-return de atributos ausentes e o check de counts, cobrindo fim e std. Oito mutantes reais adicionados à whitelist e à matriz NOVOS (fim-* TODOS, std-* SO_STD com NA explícito no original): substituem o atributo real por InterleavedBufferAttribute itemSize1 ou BufferAttribute index itemSize2 com pares [original,0], preservando count/getters, com asserts de identidade de substituição e aridade errada via infra(). Matriz VELHOS e entradas NOVOS pré-existentes intactas; contagens históricas mantidas como HISTORY no contrato. Durante a chamada GLM nenhum teste foi executado e nenhum sucesso de validação foi afirmado; sintoma GPU permanece inferência.

O plano registrado na autoria foi cumprido na supervisão: BEFORE no pin5732 com fonte externa sem editar base, AFTER, reversão da guarda e matriz específica Campo Node22/26. Os marcos abaixo fixam a evidência; crítico independente Root e gates obrigatórios continuam pendentes.

Seed deste ledger escrito nativamente antes da autoria GLM. A chamada única low hard180/internal170 encerrou EXIT0 em81,916s; raw/diff/hashes congelados antes da revisão integral e CPU. Nenhuma correção nativa de código. Atualizações de evidência deste ledger são nativas. Candidato não elegível/adotado/lançado.

## Marco BEFORE reproduzido

Depois do freeze e leitura inteira do diff, checker pinado5732 (só dois imports reendereçados na cópia externa) aceitou os oito wrappers reais de atributo, todos8/8 GREEN/exit0, em Node22 e26: position1/normal1/uv1/index2, tanto fim quanto std no R23. Count e TODOS os getters pertinentes são conferidos iguais no wrapper externo. O mesmo produto atual foi importado sem editar a base; fixture/reference/pins/produto permanecem com os hashes prévios. Protocolo validado pela função aceitar real do wrapper existente; nenhum infra contou como detecção. Evidência aggregate CAMPO-ATTRIBUTE-R61-N22-BEFORE.json e N26-BEFORE.json, cada log com SHA. Próximo: AFTER sobre as mesmas fontes, reversão externa da guarda e matriz específica Campo, ambos Nodes.

## Marco AFTER e reversão

As mesmas oito fontes externas que eram falseGREEN agora saem1 com somente CU-8 vermelha nos Nodes22/26 (16/16 AFTER). Cópia externa do checker candidato com apenas a guarda itemSize removida faz os oito mutantes internos aplicados voltarem a8/8 GREEN/exit0 em ambosNodes; aceitar real confirma o protocolo/aplicação e recusa o conjunto vermelho exigido [CU-8]. Reversão8/8 por Node prova causalidade para TODOS os quatro atributos nas duas famílias; não só position. Produto/checker reais não foram editados para esses controles. Evidência CAMPO-ATTRIBUTE-R61-N22/N26-AFTER.json e -REVERT.json com logs/SHA. Próximo: matriz específica Campo completa preservando os controles legados, depois atualização documental final e checkpoint.

## Marco final CPU e checkpoint

Matriz específica Campo **89 execuções/11NA por Node22 e26**, EXIT0 em ambos: 69 casos históricos preservados e20 novos casos de aridade aplicados por Node (fim4×3perfis; std4×2perfis), cada um com nominal verde prévio, digest realmente alterado, marcador aplicado e exatamente CU-8 vermelha. Os4 std no original são NA explícitos, não execução/detecção. Default e query2 têm SHA estrutural idêntico dentro de cada Node; não se exige igualdade de SHA entre runtimes. Logs de ambos5966B SHA256 `7d1c78a585ff85dbf51e4865068bc7b9f08202fa57bdc3804f2a369f89741732`, recibo `CAMPO-ATTRIBUTE-R61-MATRIX.json`. Wrapper43/43, raster142 controles e sintaxe dos dois scripts também passaram em ambos Nodes. São focais Campo, não suite completa do projeto.

Provas externas:16 BEFORE falseGREEN,16 AFTER sóCU-8 red e16 controles de reversão com mutante aplicado/GREEN, cobrindo position/normal/uv/index em fim/std no R23. Todos usaram a função aceitar estrita real; infra/sinal/timeout/uso/protocolo incompleto não recebem crédito. Fontes externas importam o builder atual do WT sem editar base; cópias de checker só reendereçam imports para executá-las fora da árvore. Reversão remove apenas o guard de aridade da cópia externa; checker real não foi editado para a contraprova. Manifestos `CAMPO-ATTRIBUTE-R61-EXTERNAL-SOURCES.json` e `-GUARD-REVERSION.json` fixam esses artefatos.

Autoria GLM única: EXIT0 em81,916s, hard180/internal170 sem renovação; raw1515213B SHA256 `0ea4db5517cd89c8465e362e113f6a0569dffc0663981724f3117c877041622f`. Freeze de raw/diff/quatro arquivos antes de revisão nativa inteira/testes: `CAMPO-ATTRIBUTE-R61-FROZEN.json` e `-AUTHORED.patch`. Nove tentativas read/edit, uma vetada por header relativo; oito operações executadas dentro da lease. **Nenhum código corrigido nativamente**: checker e wrapper permanecem byteidênticos ao freeze GLM. Seed e atualizações deste ledger são nativos; Native também uniu a tabela Markdown e trocou estados documentais pendentes pelos resultados reais, sem mudar produto/guarda/tolerâncias para passar.

Produto `map_campomorro.js`, vendor, reference, fixture, package/lock e região de medição CU1..7 permaneceram com hashes/bytes prévios; VELHOS e entradas antigas NOVOS intactos. O shim three existente já satisfazia o harness, com vendor SHAa47c; nenhuma instalação ou conteúdo node_modules editado. Rejeitadas as hipóteses de que count/getters bastam, que position sozinho cobre a família e que uma saída infra prova detecção. Nenhum claim de GPU/pixel, desempenho/mobile/MP, mapa inteiro ou release; os limites e dívidas anteriores do contrato permanecem.

Branch atual `codex/campo-attribute-contract-20261101`, pai5732b65df8283b8cbbb19e74bad4e705b1c85470. O checkpoint assinado deste marco contém somente os quatro caminhos autorizados; HEAD/diff líquido e SHAs finais ficam em aggregate `audits/2026-10-31-visual-consistency/CAMPO-ATTRIBUTE-R61-FINAL.json` e `-FINAL-SOURCE-SHA256.txt`. Próximo concreto: Root entrega HEAD/freeze aos olhos de um crítico independente novo, adjudica o P2 com código e contraprovas e decide adoção/composição/gates normais atuais. O hook QA107 do Root é outra execução, não foi atribuído a esta lane. Candidato local **não elegível/adotado/lançado**; sem push/PR/browser/headless/build Astro/suite projeto nesta lane.
