# Placar intermediário do Javaporcos

Achado independente F01 da revisão integral do PR #1214, em `a555a255f`.
O primeiro dano criava um placar com `lastKillAt: -Infinity`. `snapshotHorda`
copiava esse histórico interno para `scoreByPlayer`; o codec v8 recusava o
objetivo com `TypeError: objective_json`. A primeira assistência também
reproduzia o defeito enquanto o assistente não tivesse um abate próprio.
No broadcast do backend, uma falha de codificação fecha os sockets v8.
Esse efeito nos sockets foi identificado no fonte, sem reprodução de rede.

O teste anterior acertava e abatia antes de codificar, convertendo o histórico
em um instante finito e escondendo o estado intermediário.

## Medição

`npm run eval:javaporcos` passa pelo produtor e pelo codec reais. Os casos
adicionais publicam dano sem abate e assistência sem abate próprio, conferem o
placar recebido e preservam o combo entre publicações. A janela do combo vem
de `registrarAbate`, sem introduzir um novo limite de produto.

Medição local de 02/11/2026, Node 22, worktree isolado:

- Antes do conserto: os dois estados intermediários reprovam com `objective_json`;
  os outros casos passam (recibo R1227).
- Depois: o nominal passa nas 42 cláusulas. O alias completo passa e detecta
  seus 28 mutantes existentes em 20,49 s (R1228/R1229).
- Restaurar por gancho de carregamento a expressão anterior de `snapshotHorda`
  repõe exatamente os dois vermelhos. Apagar o histórico autoritativo durante
  a publicação reprova somente a janela do combo. Ambos aplicaram uma vez no
  módulo real, sem escrever o fonte em disco (R1228).

O conserto projeta os campos públicos do placar em `snapshotHorda`, sem alterar
a validação do codec nem o histórico autoritativo. Os recibos e o gancho causal
ficam em `audits/2026-10-31-visual-consistency` no workspace da missão.

O hash da simulação foi regenerado pelo script oficial; `docs:check` e
`arch:check` passaram. Próximos: compor os outros achados válidos, executar os
portões pertinentes e publicar normalmente para revisão atual.
O backend precisa ser pareado ao novo grafo antes do rollout.
Isso não mede sockets reais, pixels, anatomia, mobile físico ou partida humana.
