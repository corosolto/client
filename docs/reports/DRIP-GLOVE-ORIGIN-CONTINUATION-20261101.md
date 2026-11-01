# S3: luva da origem Drip

## Objetivo e definição de pronto

Parte da missão integral de consistência visual: mapas limpos e acabados, personagens/skins fiéis, motion/ADS coerentes, PRs e release acompanhados. Flávio#1158 fica excluído; UI/social vêm depois. Esta lane entrega o pacote de luva da Drip existente e seleção por origem efetivamente clonada. Fábrica, bind e runtime precisam passar por provas causais e revisão integral; o derivado precisa de leitura no jogo3:2 em movimento antes de entrar no manifesto distribuído.

Worktree própria `drip-glove-origin-r723-20261101`, branch `codex/drip-glove-origin-r723-20261101`, origem F2a8f246196e1c84cbe9ad223a06c071f6e547d0ad. Parent F2 está no PR#1207, empilhado sobre#1204. Root escreve fábrica/runtime; o agente R727 escreve somente a régua independente e sua fixture. Nenhum outro checkout deve ser alterado.

## Fonte e contrato aceitos

Corpo runtime `public/models/skins/bolsonaro-drip-d2544f0b5f95.glb`, SHA d2544f0b5f9565ea98b501177e34d961dccdb281c8653672958c7ec843e094a5, família a938a2d09481667bb7d8e7095fbeaf9b5efb669831a5cf5679ce1b6075d8c7d8,26joints. R573 fixa840faces:420L/420R, incluindo57faces de punho; exclui8componentes acessórios somente do derivado. P004/P005 são componentes, ambas no node24/mesh0/primitive0/indexAccessor6. As19views da fonte não aprovam o novo overlay.

A seleção explícita vive separada do censo base em `tools/character-kit/gloves/cosmetic-selections.json`, schema `cs-glove-cosmetic-selections/1`. O record conserva id/characterId/skinId/source/review/selection de R687; selection usa `cs-glove-explicit-mesh-parts/1` e `cs-mesh-part-selection/1`, com as listas literais e seus hashes. Nenhum ownershipThreshold fictício. O hash de record no manifesto é SHA256 de JSON.stringify(record.selection), como na seleção base.

`buildRepositoryArtifacts(root,{includeCosmetics:true})` produz o candidato somente em memória. O default conserva os56pacotes base3p+FP e o manifesto distribuído byte a byte. A variante é perspective3p, source.kind=cosmetic/skinId=bolsonaro-drip; cobertura cosmética separada. O arquivo candidato é `public/models/gloves/3p/bolsonaro-drip-a938a2d09481.glb`. Flags técnicasfalse não são autorização de runtime; a entrada distribuída aguarda GLTF+visual.

O builder reutiliza a extração existente, preservando costuras, índices por vértice-fonte, winding, todos atributos/pesos,26joints/IBMs/hierarquia/TRS/escala. Sem solda, recurl, offset ou reescrita de animação. O BODY permanece intacto.

O runtime futuro captura um handle privado da origem do template escolhido. Cache/request/negativo usam origem completa, com fullSHA cosmético ou revisão base10. Setter e readiness do corpo vivo usam o handle capturado, inclusive quando o cache cosmético aquece depois. A ausência da variante cosmética recusa aquela origem sem derrubar a base. A troca de luva conserva controller/mixer/clock e o descarte de S1.

## Marcos e evidência

- R687: plano integral lido; sugestão GLM literal rejeitada por contrato/imports privados/cache porchar/readiness pela def/fallback incorreto.
- R723: WT criada limpa no F2a8. Dependências por symlink próprio para dependências imutáveis do parent.
- R734: `npm run arch` regenerou ARCH antes de qualquer alteração em Game, exit0/0,215s. Regeneração não alterou tracked.
- R727: régua e fixture independentes congeladas. Nominal real antes do builder, exit1/3,295s: F0RED por variante/GLB ausentes, F4/F5PASS, F1–F3 sem medição. Root leu integralmente a régua256linhas, seu relatório e o recibo.
- R739: fábrica opt-in implementada sem escrever assets. Nominal independente passou F0–F5 em3,294s: derivado98328B,840faces/1163vértices,26joints/28ancestrais/26IBMs e todos6semantics preservados. Default57GLBs+manifesto e corpo permanecem byteiguais. Régua/fixture não foram alteradas pelo builder.
- R740: controles causais concluídos pelo autor, aguardando leitura integral e rebind de Root. Oito primeiros incluem um INFRA do injetor por JOINTS_0 uint8; V2 corrige só o instrumento externo. Nenhum crédito de kill desse INFRA. Nenhum GLB candidato foi distribuído.
- R741-V2: GLTFLoader.parseAsync e SkeletonUtils.clone reais do projeto passaram em1,730s: duas partes com26bones/26IBMs e ossos independentes no clone. Derivado98328B SHA3812b3ed50bac9d6fb2b7fdb6c5306d219345d896328610f0e8bb0da240db6e9 salvo somente em audits/DRIP-GLOVE-CANDIDATE-R741. V1 é ERR_MODULE_NOT_FOUND de instrumento, preservado; V2 usa exports reais e verifica bytes dos módulos. Não comprova fit, material, motion ou visual no Game.

- R742-V4: Root viu oito renders sólidos em REST no Blender5.2 isolado: contorno e corte conservados; facetas da fonte continuam visíveis em palma/polegar. V2 fonte vazia não controlava o estado de pose; ativação de action/NLA é hipótese específica, não foi registrada diretamente. REST explícita na V3/V4 traz a mesma região para a câmera; V3 tinha crop de dedos. V4 usa bbox projetada/aspect e margem. Labels de arquivo são eixoX, não anatômicos: negativeX=`right/P004`, positiveX=`left/P005`, conforme R745. Sem novos GLBs, smoothing, offset ou alteração de corpo. Não é fit com arma nem aceite no Game.

- R753: Root leu FULL a inspeção factual R745 e rebindou15referências sem drift. Não há crédito Native desse autor, pois escreveu o plano R687. Mesma geometria/bind sob a mesma pose; autoativação de action/NLA no importer é hipótese específica, não foi registrada diretamente.
- Integração em preparo: alias `eval:tp-drip-source` no fast/deploy e job paralelo `equipamento-tp` no pr-fast; `build` agrega os três jobs. O novo job também executa as réguas TP de origem/identidade já existentes. R759 validou o alias npm real em33,822s: dez filhos completos, sete negativos nos failsets exatos, reindexação e dois nominais PASS; Root leu o resumo e rebindou os73pins sem drift. Workflow security selftest PASS0,078s e oito contratos de gate/docs/arch PASS1,741s. O novo job ainda não rodou no GitHub e não foi feita nova execução das suítes S1/F2, cujos bytes de produto estão intactos.

## Limites e próximo passo

R740 foi lido integralmente e rebindado por Root em R743:139referências/137paths, zero drift, sete negativos exatos, reindexação válida e dois nominais passam. O INFRA V1 não recebe crédito e o gravador antigo não é aliasCI. R744 implementou o controlador portátil fail-closed: rodada única PASS32,29s fora da WT e dois controles focais, survivor/INFRA→pai1, sem repetir a matriz. Root leu integralmente os três arquivos; relatório selado do autor ainda deve ser lido/rebindado antes do checkpoint. Ligar a régua verificada ao gate adequado e obter crítica whole independente/checkpoint de fábrica. Depois implementar runtime por origem com fixtures reais e mutantes, preservando os suites S1/F2. Evidência externa em `audits/2026-10-31-visual-consistency` no projeto agregado.

O TaskSpace Ego56 não existe; há pergunta de recuperação pendente. Browser, fit artístico, mobile físico e MP humano permanecem sem aceite. Não promover o candidato por testesCPU nem reintroduzir compras/modelos novos para substituir esta fonte aprovada. A missão integral permanece ativa.
