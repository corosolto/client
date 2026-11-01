# Catálogo de skins: continuidade do instrumento de revisão

## Objetivo e ponto atual

Restaurar a contraprova de URL sem revisão do manifesto de skins, preservando
as opções de cancelamento do consumidor. O portão também deve reconhecer uma
URL literal quando `fetch` recebe opções e existe outra referência a `assetUrl`.

Worktree `assetrev-mutant-fixture-r424-20261101`, branch
`codex/assetrev-mutant-fixture-r424-20261101`, base
`fd0df5a607c66506a38aadc53c61e71f3097ef49`. Esta camada fica depois da limpeza
da pintura FP, que depende das camadas de identidade TP e duas partes da luva.
Somente este ledger e `tools/eval/asset-rev-check.mjs` integram a alteração.

A missão geral continua: mapas, personagens, skins, movimento, alinhamento da
AK, integração de PRs e release/backend. Flávio/#1158 continua excluído; fluxos
de UI e redes sociais vêm depois. Esta correção do instrumento não fecha dedos,
pega, realismo, equipamento persistido, MP ou mobile físico.

## Causa, alteração e contraprovas

- R425 reproduziu o alias original: nominal e os dois primeiros mutantes
  passaram; `manifesto-cru` abortou por âncora ausente. Esse aborto não recebeu
  crédito como detecção AR6. Todos os arquivos temporariamente tocados voltaram
  aos hashes originais.
- O consumidor atual inclui `{signal:controller.signal}`. A nova âncora usa o
  prefixo único da chamada e troca apenas o envoltório `assetUrl`. As opções,
  timeout, tratamento da resposta e `finally` do consumidor ficam preservados.
- Antes de escrever qualquer mutação, o instrumento exige exatamente uma
  ocorrência da âncora. R429 executou os casos zero e duas ocorrências: erro de
  infraestrutura antes de escrita, sem mensagem de detecção e sem alterar o
  arquivo de entrada.
- AR6 agora reconhece tanto o fechamento de `fetch` quanto a vírgula que começa
  seu segundo argumento. R426 executou o checker inteiro com cinco fixtures
  temporárias do consumidor. A URL literal com opções e referência inerte a
  `assetUrl` passava antes; depois falha especificamente em AR6. A chamada
  versionada com opções passa; URL literal com um argumento continua falhando.
- R428 passou o alias completo: nominal e quatro mutantes efetivamente
  detectados, nas cláusulas AR2, AR3, AR6 e AR1 previstas. O nominal conferiu
  1.674 assets, 192 fontes e os três consumidores do manifesto. Os quatro alvos
  foram restaurados byte a byte.
- R429 também extraiu a tupla real do mutante e as expressões reais de `fetch`.
  Transporte controlado confirmou URL esperada e identidade de
  `controller.signal` em ambas. Caudas de opções e ciclo de vida são byte
  exatas. Isso não executa a loja ou entrega de rede.

O runtime, gerador de revisões, mapa publicado e consumidor da loja permanecem
byte exatos à base. Nenhuma cláusula AR1–AR5 foi relaxada. O parser geral de CLI
e a análise sintática completa de consumidores não fazem parte desta camada.

## Evidência e próximo passo

Artefatos locais no agregador, em `audits/2026-10-31-visual-consistency`:
`ASSETREV-BASELINE-R425.{json,log}`, `ASSETREV-{before,after}-CONTROLS-R426.json`,
`ASSETREV-ALIAS-R428.{json,log}`, `ASSETREV-ANCHOR-CONTROLS-R429.json` e
`ASSETREV-FETCH-CONTROL-R429.json`. A proposta GLM R406 foi adjudicada e seus
30 pins conferidos; a validação executada é a sequência posterior acima.
`npm ci` normal R431 passou sem alterar arquivos rastreados. R433 passou
sintaxe do checker, docs, arquitetura, comentário e whitespace.

Próximo: congelar os dois arquivos, revisão GLM
e crítica independente do diff inteiro, checkpoint seletivo com DCO/Agent e
push normal com hooks. A CI, integração da stack e publicação permanecem gates
posteriores. O ledger externo `CURRENT-STATE-20261031.json` conserva o objetivo
completo, commits, PRs, recibos e próximos passos da missão.
