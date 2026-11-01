# R1023: orçamento do job reguas-e-site

O run [41347684813](https://github.com/corosolto/client/actions/runs/41347684813)
atingiu o limite durante SEO. A annotation registra 25m0s; o Astro build anterior
passou. O agregador `build` recusou o resultado cancelado como previsto.

A triagem de 2026-11-01 está em
`audits/2026-10-31-visual-consistency/PR1213-CI-TRIAGE-R1019-REPORT.md`
(SHA256 `b2c02d74d6541fd7474ee15299a7c70b132910b483754686fe3d4801b7e64812`).
Ela estima 25m27s usando o tempo observado com encerramento e a cauda histórica
do site-smoke. Essa estimativa sustenta a alteração solicitada do orçamento para
30 minutos, dentro do teto comum de `tools/eval/workflow-timeout-check.mjs`.

O patch altera apenas o timeout de `reguas-e-site` e acrescenta a referência ao
run. Comandos, assertions, mutantes, `needs` e o agregador ficam byteiguais à base.
O parse YAML confirmou somente essa diferença semântica. WT2 nominal passou;
os controles existentes `sem-timeout`, `timeout-absurdo` e `isencao-estourada`
reprovaram nas cláusulas esperadas. As verificações locais de secrets, actions
locais, concorrência, checkout, deploy gate e workflow security/selftest passaram.
Logs e comandos: `audits/2026-10-31-visual-consistency/CI-REGUAS-TIMEOUT-R1023-*`.

A consulta única OMP `zai/glm-5.3` teve ferramentas/MCP/retry/fallback desligados.
Codex conferiu a proposta e escreveu o comentário final; a cauda histórica é uma
estimativa do total, e a sugestão de executar `act` ficou fora desta medição.
Autoria assistida, sem crédito de revisão independente.

Branch própria `codex/ci-reguas-timeout-r1023-20261101`, baseada em Hands
`c2cff43274b3feaa0e25decd5e68f26f0d471db5` após orientação Root, sem commits
intermediários sobre C. `public/`, package e scripts permanecem iguais à base.
Nenhum build, browser/headless, suite ampla, instalação, push ou operação de
backend foi executado nesta autoria. O candidato Java C/H continua sob Root.

Objetivo integral visual/PR/release preservado, com Flávio #1158 excluído e
UI/social depois. Próximo passo: Root ler e adotar este checkpoint, compor Hands
com Java e publicar conforme sua fila. O job hospedado precisa concluir em uma
nova execução; o run cancelado permanece cancelado.
