# GLM 5.3 — fechar admin e retenção com dados verdadeiros

Localize a worktree/branch `admin-retention` / `claude/admin-retention-truth` citada no ledger.
Se não existir, crie lane isolada sobre `main`; não use o checkout primário. A candidata antiga
aguardava validação autenticada com dados reais.

Verifique definições de visitante, jogador, sessão, partida, retorno D1/D7 e jogadores por mapa.
Mostre último dado real, timezone e frescor do pipeline. Dias ausentes são `null`, sem ligar
pontos e sem fabricar zero. Teste browser→API→banco, CORS, autenticação, paginação, timezone,
cache e falha parcial; preserve SQL como migração revisável.

Escreva réguas/mutantes, rode testes/build, gere captura local sem expor PII/segredos, commit,
push e PR. Registre se os dados reais ainda bloqueiam o lançamento. Não altere produção.

