# Continuação: integração do acabamento Campo

O push normal de `d20f53c1f637fa92cf6c05913876c31d5d733952` parou em `eval:map-material-finish`: 106/107 passos passaram. O checker direto confirmou uma única falha, `campo: parede sem grupos`, porque `normalizeGeo` e `mergeParts(..., false)` juntam as peças R23 numa BufferGeometry de material único que desenha o drawRange inteiro.

Esta frente integra a missão visual e de release do PR #1188, com Operação Flávio excluída. O critério local é medir toda a geometria mesclada efetivamente desenhada, mantendo os períodos físicos e o contrato anterior de caixas.

Base: `d20f53c1f637fa92cf6c05913876c31d5d733952`. Lane isolada: `campo-material-integration-20261101`, branch `codex/campo-material-integration-20261101`. O checkpoint desta continuidade é o commit que introduz este arquivo. Root integra e publica.

A correção mede por triângulo o Jacobiano UV para mundo, com a matrixWorld real. Cobre índices ou vértices não indexados do drawRange completo, valida posições e UVs finitos, aridade dos atributos, área e rank; períodos U/V e cisalhamento usam o epsilonUV existente. Grupos existentes continuam exigindo partição completa. O corpo Box, os 16 nomes antigos e os 16 casos antigos do wrapper ficaram byte-exatos, retirando apenas o dispatch novo.

Autoria e procedência:

- GLM-5.3 via OMP, chamada única de 307,14s, exit0 dentro do prazo fixo de 330s. Raw e patch congelados antes da leitura nativa ou testes. Escrita restrita ao checker, wrapper e 2 documentos. Duas tentativas de edit relativo foram negadas pelo guard; as demais ferramentas executadas foram read/edit autorizados.
- A leitura nativa acrescentou a guarda `position.itemSize=3`, `uv.itemSize=2`, índice escalar. Antes dela, o helper literal aceitava 3 aridades malformadas que leem componentes de outros vértices; depois, as 3 reprovam. O delta nativo está separado em `CAMPO-MATERIAL-INTEGRATION-R61-NATIVE-ATTRIBUTES.patch`.
- As alterações finais seguintes foram documentais, para registrar a guarda, os resultados e o limite às Mesh estáticas atuais.

Validação real:

- Antes: Node22, exit1 em 4,564s, uma falha de grupos; 484 medidas e 122/122 paredes com detalhe. Recibo `MAP-MATERIAL-BASELINE-BEFORE-R61.json`.
- Depois: Node22, GREEN em 4,178s, 604 medidas (as 484 anteriores e 120 triângulos mesclados), 122/122 detalhes; pior desvio U=2,98e-7m e V=4,77e-7m. Campo mantém 1096 meshes, 103 materiais e 20 texturas.
- Wrapper existente: baseline GREEN e 22 mutantes causais detectados em Node22 (94,919s) e Node26 (95,012s). Inclui os 16 anteriores e 6 novos na cauda real: período, UV NaN, cisalhamento, índice inválido, drawRange incompleto e posição não finita. Crash ou mutante sem alvo não contam como detecção.
- Controle privado do helper literal com Three vendorizado: 7 casos distintos, incluindo não indexado, rotação/movimento do pai e escala em mundo. Node22 antes confirma as 3 aridades inseguras; Node22/26 depois têm 7/7 expectativas e nenhuma aridade insegura aceita. A escala4m é medida pelo helper; o consumidor do Campo exige2m.
- Sintaxe do checker e wrapper em Node22/26, docs:check, arch:check, comentário e diff:check passaram. Nenhuma fonte mudou durante essas verificações.

Evidências: `audits/2026-10-31-visual-consistency/CAMPO-MATERIAL-INTEGRATION-R61-*`, incluindo `FROZEN.json`, `NATIVE-READ.json`, `FOCAL.json`, `LEGACY-PRESERVED.json` e os controles `ATTRIBUTES-*.json`.

Aceite local: contrato geométrico/métrico das Mesh estáticas mescladas atuais. Arte, iluminação, desempenho móvel, instancing, skinning e morphs ficam fora desta medição. Os arquivos de `public/`, o batching e os custos permanecem iguais. Nenhuma publicação ocorreu nesta lane.

Próximo passo: Root recebe o snapshot final e o parecer do crítico independente, integra o checkpoint e repete o push normal. CI, revisão atual, validação do preview, merge e release pertencem à continuidade principal.
