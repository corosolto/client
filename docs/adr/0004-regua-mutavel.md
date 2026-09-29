# 0004. Quality gate com régua mutável

Status: aceita

## Contexto

Portão que nunca reprova é decoração: régua que aprova tudo esconde
regressão e ensina o time a ignorar verde. O caso que comprou esta
decisão: três gauntlets de fidelidade medindo frame parado enquanto o
jogo estava quebrado em movimento.

## Decisão

Toda régua nova nasce com **mutante**: uma versão deliberadamente
quebrada que o gate tem que reprovar (`spec.mjs check --mutante`,
`docs-autoria-check.mjs`, `seo:mutate`). O `check:fast` roda todos os
passos mesmo quando um fica vermelho e decide a saída no placar final.
Invariantes vivem em `tools/eval/invariants.mjs` com identificador e
`skip()` declarado.

## Consequências

- Régua sem mutante é dívida: ninguém prova que ela morde.
- Placar de execução não é derivável do fonte: o número oficial vive
  colado de execução real no ledger interno de defeitos, não em página
  pública.
- Adicionar passo ao gate custa escrever o porquê e o mutante que o
  protege.
