# Limpeza no timeout cosmético (R1052)

A missão completa continua: consistência de mapas, personagens, skins, armas, ADS e movimento, integração dos PRs e release pareado. Flávio/client#1158/backend#196 permanece excluído; UI/social ficam para depois. Este checkpoint corrige somente o P3 R1042-P3-1 encontrado pelo crítico independente de client#1207 e preserva os demais trabalhos da pilha.

Base desta continuação: Java `fe8aeb7e8ba6af14fd75725afcc737631e229fe9`, já publicado por push normal com hooks ativos (112/112). O worker herdado conserva o problema: seu callback de45s chama process.exit(3), que pula o finally e deixa os módulos do mutante em node_modules/.tp-cosmetic-*. A correção tenta remover somente o diretório criado pelo próprio worker antes da saída incondicional3. Prazo, classificação INFRA, aplicação de mutantes e asserções permanecem iguais. Autoria desta correção: Codex; o achado veio da consulta GLM e da adjudicação independente R1042.

## Evidência causal

Um preload externo intercepta o registro do timer existente e antecipa esse mesmo callback somente depois de mkdtempSync criar o diretório real do mutante. Nenhum flag ou prazo de teste foi acrescentado ao produto. Antes: exit3, diagnóstico de deadline e os dois módulos game.mjs/glbchars.mjs permaneciam. Depois: mesmo exit3/diagnóstico, diretório ausente. O diretório remanescente do baseline foi removido pelo operador após medir, exclusivamente pelo caminho capturado. Não foi executado outro processo de45s para simular espera.

O controlador real com --mutante=glove-source-cosmetic-sha passou16 processos em7,228s: oito nominais sem falhas e oito mutantes com failset exato K12, sem novos diretórios temporários. Uma preparação anterior omitiu o nonce obrigatório e não chegou à fixture; está preservada como INFRA_NOT_REACHED, sem crédito causal. Os recibos completos estão em audits/2026-10-31-visual-consistency/COSMETIC-DEADLINE-R1052-* no agregado de operações.

O arquivo antes tinha SHA256 f3b882e81bd79c5320f085281dd872cd5f495610d22356ae5d53d87ac34250a1; depois d5c868db112c154257a5f23bd7db9e35097179851048c1c2d5fe5f457e53c2e1. Nenhum arquivo public/ foi alterado. Não há evidência nova de arte, Game3:2, mobile ou MP humano. Próximo: checkpoint CI separado, publicação normal do head final e revisão integral desse head antes da integração/release. Os heads originais de F2/Factory/S4 e seus pareceres continuam preservados.
