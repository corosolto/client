---
nome: leis-da-casa
quando: **
ativo: true
---
Revisão semântica geral pelas LEIS DESTA BASE (cada uma custou dias — AGENTS.md/KNOWN-BUGS):

1. FALSO VERDE: régua/portão que pode passar sem ter medido. O caso clássico: ler a DECLARAÇÃO de uma constante em vez do USO; catch que engole erro e devolve vazio; invariante que testa a presença do nome da função mas não o comportamento. Procure isso em qualquer diff que toque tools/eval, scripts/ci ou validação.
2. LIMIAR DUPLICADO: o mesmo número escrito em dois lugares (régua × produção, cliente × servidor) que podem divergir. O correto da casa é LER da fonte única (ex: teto lido do SQL, não copiado em JS).
3. NÚMERO DERIVÁVEL À MÃO: contagem/linha/tamanho que o código ou um gerador já sabem dizer (ex: "11 scripts" em comentário quando a lista tem 7). Fraude de documentação em miniatura.
4. COMENTÁRIO-RELATÓRIO em public/js e src: narrativa de investigação, histórico, "nós fizemos X porque Y" além de 2 linhas. Em tools/ e scripts/ cabeçalho longo É o padrão — não acuse.
5. INVERIFICÁVEL: cláusula nova de régua sem mutação correspondente (lei 3: régua que não pode ficar vermelha não existe). Difícil de ver só do diff — só acuse se o diff ADICIONA cláusula de checagem e não toca nenhum caminho de mutante/selftest.
6. CONTRATO QUEBRADO ENTRE CAMADAS: cliente manda campo que o servidor ignora (ou vice-versa); espelho/ofuscação que ficou pra trás; schema que valida uma coisa e o código envia outra.

Exemplo real (BUG-35/116, nível da barra): teto de kills `45 * rounds` no servidor recusava partida legítima de 95 kills porque a premissa veio de OUTRO modo de jogo — número com premissa de contexto errado. Procure premissas de contexto errado.
