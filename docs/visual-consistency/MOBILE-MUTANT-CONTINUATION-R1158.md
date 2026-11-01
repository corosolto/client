# Continuação do mutante mobile R1158

Objetivo integral: a missão visual, integração de PRs e release do CORO SOLTO continua ativa. Flávio fica excluído; novos fluxos de UI e redes sociais vêm depois. Esta frente altera somente a âncora do mutante de respawn local. Root publica e coordena o navegador.

Base: `9414b56cedcdc80383becb448b6fc621ab6a3339`. Branch: `codex/mobile-mutant-anchor-r1158-20261101`. O commit Agent/DCO que contém este arquivo é o checkpoint recuperável; seu SHA está em `MOBILE-MUTANT-R1158-CHECKPOINT.json` no audit agregado.

## Resultado aceito

O CI `41359254107`, job `125005982622`, passou o nominal TQ1 a TQ9. Depois interrompeu em `respawn-sp-preso`: a substituição esperava que `_releaseInput()` viesse logo depois da guarda online, mas `_respawnPlayer()` ganhou a guarda do time eliminado. O código do jogo ainda limpa o input.

A string de busca e a substituição agora preservam as duas guardas atuais. O texto mutado remove apenas `_releaseInput()` de `_respawnPlayer()`. A verificação existente de mutação não aplicada permanece. Asserções, limites, IDs esperados, demais mutantes e fontes do jogo ficam byte-exatos.

## Evidência desta rodada

`npm ci` foi executado neste worktree. O capturador CPU extrai os callbacks reais de `abrir()` e os invoca contra strings das fontes públicas, sem navegador ou rede. Antes da correção, o único callback sem aplicação foi `respawn-sp-preso`. Depois, todos os casos configurados aplicaram; as fontes mutadas passaram no parser e a análise de AST conferiu o escopo de cada alteração. No respawn, as guardas e todos os bytes externos ao método ficaram exatos. `node --check tools/eval/toque-controles-check.mjs` passou.

Uma consulta `zai/glm-5.3`, raciocínio low, max4000, ferramentas desativadas e sem retry/fallback/compaction, terminou completa. A sugestão de atualizar as duas strings foi adotada. A nota do modelo sobre bytes servidos foi restringida: o capturador prova as strings produzidas pelos callbacks, sem executar servidor ou navegador. Nenhuma prova de TQ8 nasce desta medição CPU.

## Pendente para Root

Rodar o nominal e `respawn-sp-preso`, além dos mutantes de rodada que o CI não alcançou, no caminho de navegador autorizado. Executar os gates completos necessários e atualizar review formal e crítica independente no novo head antes de publicação. Esta frente não executou browser, build, full gate, GH, push, merge, SQL remoto ou deploy. Não há aceite visual, mobile físico ou MP humano.

Recibos completos: `audits/2026-10-31-visual-consistency/MOBILE-MUTANT-R1158-*` no diretório agregado. Ler `BASELINE-GIT.json`, `AFTER.json`, `SYNTAX.json`, `GLM-USAGE.json`, `REPORT.json` e `MANIFEST.json`.
