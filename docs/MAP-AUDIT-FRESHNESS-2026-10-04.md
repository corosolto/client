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

Branch `codex/map-audit-freshness-20261004`, atualizada sobre alpha.48
`7613710044c3f276b6b74d738bfe1590e518a215` após o merge de #764;
commit de código `4b20f284d` (rebase de `4df220d8c`),
PR draft `client#766`. `freshReport` remove o
arquivo antigo antes de rodar o auditor e só entrega dados de um relatório
novo e parseável. `MAPAUD` é crítica se não houver dados. O teste usa um
relatório antigo seguido de auditor interrompido como mutação; também confirma
que relatório novo é aceito mesmo quando `map-check` sai 1 por dívida que o
agregador classifica separadamente.
Os três testes focados, `actionlint`, `docs:check` e o pre-push completo
`check:deploy` passaram. O CI do #766, run `37212269486`, confirmou 3/3 testes
da proteção e gerou 18 mapas frescos; reprovou CTF2 nos quatro pares de Córrego
da base alpha.47, como esperado. O relatório versionado antigo tinha 17 mapas.

## Pendências e próximo passo

O client #764 foi merged externamente em `038d3021b` apesar dos marcadores
`needs-human-gameplay` e `needs-staging`; a verificação independente de
`d9632f179` confirmou 8/8 pares com pelo menos duas rotas. O release alpha.48
e o `repository_dispatch` passaram; site e nós US/EU/BR anunciaram
`SIM_HASH=414e5ed74af13502` na leitura de 15:49 UTC. A revisão humana de jogo
continua sem evidência e não deve ser registrada como concluída.
Reexecutar o CI de #766 nesta base e exigir `build` verde com JSON fresco.
Depois atualizar #765, exigir CI verde e verificar a correção da concorrência
em um release real.

## CI na base alpha.48

O run `37215001453` terminou em 04/10/2026 com `MAPAUD` vermelho: o
`map-check.mjs` excedeu os 10 min fixos de `runNode` e retornou `ETIMEDOUT`.
O portão reprovou como planejado, sem aceitar o JSON antigo. No run anterior
`37212269486`, a mesma etapa havia terminado em 9m48s, no limite. O auditor
agora recebe 15 min e o job 25 min para acomodar a variação do runner. A
exigência de relatório fresco e o veredito de CTF2 continuam os mesmos. Ainda
é necessário observar um novo run verde antes de marcar o PR pronto.
