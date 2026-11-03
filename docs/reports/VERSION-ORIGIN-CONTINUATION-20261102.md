# Origem da versão nos payloads reais

No candidato `c6673ff101`, a régua antiga reprovou VO4 de `/api/perf`: procurava
`version` entre a última declaração de `payload` e o transporte. O campo já vem
de `_clientSessionContext()`, espalhado nesse payload. A inspeção literal não
seguia o produtor real; não havia evidência de regressão no campo enviado.

A fixture do commit `79976ccb7ae237b8c2406a49d3c26a58cfedfd9d`, do PR #1153,
foi reaproveitada. Ela executa os corpos reais de `_clientSessionContext`,
`_perfFinish` e `sendMatchEvent` em uma VM, capturando o transporte localmente.
Na integração atual, essa fixture também precisa do corpo real de
`modoTelemetria`; sem ele, o nominal termina com `ReferenceError`. A dependência
foi incluída por extração da fonte, sem duplicar sua implementação na fixture.

R1284 registrou a falha da inspeção antiga. R1288 registrou a dependência ausente
na fixture reaproveitada. R1290 passou no nominal e nos cinco mutantes existentes:
`sem-marca`, `main-cru`, `sem-corosolto`, `perf-sem-helper` e `match-cru`. O driver
exige mutação aplicada, cláusula semântica vermelha e ausência de erro de execução.
O alias e o passo de CI do mesmo trabalho foram incorporados para manter essa
verificação no caminho normal do PR.

Esta mudança afeta apenas a verificação e sua chamada no CI. Não altera os
payloads públicos nem substitui o QA visual, de toque em aparelho físico ou de
multiplayer humano. A suíte completa do candidato anterior continua registrada
separadamente, inclusive suas falhas ainda em investigação.
