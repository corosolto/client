# Auditoria de mapas: relatório fresco no portão

## Objetivo e conclusão exigida

Fazer o `invariants.mjs` reprovar quando `map-check.mjs` não entrega um JSON novo.
Uma execução interrompida não pode reutilizar `tools/eval/map_check.json` versionado.
O portão só fica pronto após teste de mutação, CI e verificação de que a medição
atual das rotas CTF passa.

## Evidência de 04/10/2026

- `client#752` teve `CTF2` verde com 17 mapas, sem Campomorro. O JSON versionado
  tem geração em 13/09/2026 e exatamente esses 17 mapas. A medição atual de
  `client#765` terminou com 18 mapas e reprovou quatro pares de Córrego.
- O `runNode` de `invariants.mjs` captura erro/timeout do subprocesso; o bloco
  de mapas consultava apenas a existência do JSON antigo. Ausência virava
  `skip`, que não reprova o CI. O run verde de #752 durou 14m41 nessa etapa;
  a chamada de `map-check.mjs` tem timeout de 10 min. A causa específica da
  interrupção não foi impressa, portanto timeout é hipótese, não fato observado.
- `node tools/eval/map-check.mjs corrego` no HEAD alpha.47 reproduziu os quatro
  pares de rota única (`E→R/C/P`, `B→B`), mais dívidas MAP1/MAP6 anteriores.
  O diff de #765 altera apenas release workflow e seu teste.

## Estado da branch

Branch `codex/map-audit-freshness-20261004`, base alpha.47
`b94dc5bb82aeb61728344a7e9a6b28626b07f9fc`, commit `4df220d8c`,
PR draft `client#766`. `freshReport` remove o
arquivo antigo antes de rodar o auditor e só entrega dados de um relatório
novo e parseável. `MAPAUD` é crítica se não houver dados. O teste usa um
relatório antigo seguido de auditor interrompido como mutação; também confirma
que relatório novo é aceito mesmo quando `map-check` sai 1 por dívida que o
agregador classifica separadamente.
Os três testes focados, `actionlint`, `docs:check` e o pre-push completo
`check:deploy` passaram; CI remoto do #766 ainda pendente.

## Pendências e próximo passo

Confirmar CI da branch. O draft client #764 está em outra lane e corrige as
quatro rotas de Córrego; não editar sua branch. Sem #764 e `CTF2` fresco verde,
o PR #765 de concorrência do release não está pronto para merge. Após integrar
a correção das rotas, atualizar #765, exigir `build` verde com JSON fresco e
verificar um release real, incluindo `repository_dispatch` no backend.
