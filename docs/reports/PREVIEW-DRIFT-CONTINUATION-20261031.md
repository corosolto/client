# Preview: paridade de deriva Node/browser

Objetivo: alinhar a deriva do gate Node ao critério real max−min do lobby browser. Done da implementação: contraprova física qualificada antes do patch, RED do instrumento antigo, GREEN nominal/controles em Node22/26 e checkpoint seletivo com sign-off. Revisão independente e integração pertencem ao Root.

Branch `codex/preview-drift-parity-20261031`, WT `preview-drift-parity-20261031`, base `cf64134e5b64b8be858e9e4ca031a946d762ca11`. O SHA do checkpoint e hashes dos arquivos estão em `PREVIEW-DRIFT-COMMIT-METADATA-R1.json` no audit externo desta frente.

## Milestones validados

- npm ci isolado exit0 via Node26 explícito. A tentativa inicial com Node16 do PATH falhou antes da instalação; R2 instalou corretamente. Log `PREVIEW-DRIFT-NPM-CI-R2.log`.
- Antes do patch: arma REAL MST/AK oscilando ±8 mm em Z local, relógio1/60, período2s. Palma .0631898523–.0790053012m; distância à primeira .0079173508m, amplitude .0158154489m. Critério Node antigo passa0/8 em22/26; mesmos dados no lobbyFalhas vigente reprovam só MST/AK:LA5. X/Y rejeitados por não cruzarem amplitude. Nenhuma métrica pronta foi substituída.
- `amplitude` extraída do critério já existente em gate-accept.mjs, usada no browser e no Node. Limites2°/.01m, domínio escalar, oito casos/oito amostras e rótulos DERIVA-GRAUS/DERIVA-M preservados. O novo mutante físico arma-oscilante exige só MST/AK:DERIVA-M; alias mantém nominal e três controles anteriores, acrescentando o quarto.
- Coordenador: nominal+4mutantes em Node26.12.1 e22.23.4, dez medições exit0 com JSON íntegro e conjuntos causais exatos; sete controles da oscilação bit-idênticos ao nominal. Dez CLI inválidos exit2 e temporários próprios removidos. Controle que restaura o critério antigo perde a detecção da oscilação e faz a contraprova sair1 nos dois runtimes. Infra quebrada sai3; stdout atrasado20ms entrega JSON íntegro; aliases integrais saem0 nos dois runtimes. docs:check exit0.

GLM-5.3 via OMP entregou o patch de gate/helper/alias e artefatos Node26. A chamada foi encerrada após entrega parcial; Codex concluiu qualificação física, contrato, ledger, verificações e commit. Registro `PREVIEW-DRIFT-RUNNER-STATUS-R1.json`. Este worker implementou a frente e não lhe concedeu revisão independente.

## Artefatos e limites

Audit externo: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/audits/2026-10-31-visual-consistency/`. Pontos de entrada: `PREVIEW-DRIFT-FEASIBILITY-METADATA-R1.json`, `PREVIEW-DRIFT-COORD-FEASIBILITY-R1-z.mjs/json`, `PREVIEW-DRIFT-COORD-FEASIBILITY-N22-R1-z.json`, `PREVIEW-DRIFT-COORD-BROWSER-VERDICT-R1.json`, `PREVIEW-DRIFT-COORD-VERIFY-R1.json`, `PREVIEW-DRIFT-COORD-CONTROLS-R1.json` e `PREVIEW-DRIFT-FECHAMENTO-R1.md`.

Estabilidade continua definida pelos escalares existentes, não por toda transformação relativa mão/arma. Centroide/AABB não aprovam dedos, asa ou contato por triângulos. Nenhum browser, build, push, comentário remoto, merge ou publicação foi executado nesta frente. Nenhuma mudança de produto, GLB, clipe ou teto foi adotada; parity/QA ficaram fora da WT isolada.

Próximo: Root designa outro crítico sobre este checkpoint, integra seletivamente sobre a stack atual e repete as verificações integradas pertinentes. O fluxo global de aceite visual/release continua no ledger do Root.
