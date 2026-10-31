# PR #1167: preservação de falha e diagnóstico de infraestrutura

Esta lane é parte da missão completa de consistência visual, integração de PRs e
release de dez horas. Continuidade geral em
`../consistencia-visual-release-20261031/docs/visual-consistency/CONTINUATION.md`.
Operação Flávio continua excluída. Não escrever na branch original do autor.

Branch `codex/harden-sb7-1167-20261031`, base PR #1167
`d4e0ccfda3d5dfb51a296a7a542deb3015fb41d0`. Worktree exclusivo com dependências
instaladas por `npm ci`; não compartilhar node_modules com outra lane.

Revisão GLM integral dos 16 arquivos está foraGit no audit da missão:
`GLM-REVIEW-1167-RESULTADO.md`. Achou SKIP sobrescrevendo falha já medida,
prioridade de falha na mutação SB7, timeout/sinal sem classificação e cleanup
de temporários contornado por process.exit. Antes de merge: verificar cada item,
corrigir os válidos com prova RED/GREEN/causalidade, revisão GLM final limpa e
crítico independente readonly do diff inteiro (base main e correções).

CodeRabbit não está habilitado; protocolo explícito do dono em
`operations/corosolto-hq-20261026/ledger/REVIEW-PROTOCOL-20261031.md` no agregador
autoriza GLM + crítico independente. Nenhum merge/push ocorreu nesta lane.

Próximo passo: builder GLM corrige o contrato preservando prioridade da falha,
sem transformar infraestrutura em aprovação ou ampliar escopo de produto.

## Lease GLM-SB7-FIX (builder GLM, 31/10/2026)

Arquivos sob lease exclusiva desta lane até a devolução: `tools/eval/sonda-filho.mjs`,
`audio-proveniencia-check.mjs`, `shader-budget-check.mjs`, `lajes-visual-check.mjs`,
`lajes-soundscape-check.mjs`, `escadao-audio-pack-check.mjs`, `mansao-audio-pack-check.mjs`,
`runner.mjs` (leitura), demais `.mjs` do PR #1167 (leitura) e o gate novo
`tools/eval/sonda-filho-check.mjs`. Fora de escopo: produto, GLB, `package.json`,
CONTRIBUTING, branch do autor, push/merge. Relatórios em
`audits/2026-10-31-visual-consistency/GLM-SB7-FIX-*`.

## Resultado GLM-SB7-FIX (31/10/2026, lease devolvida)

Os 4 findings da revisão eram válidos e foram fixados com régua RED/GREEN: `pula`
preserva `exitCode` (vermelho medido vence SKIP), PRV13/PRV14/LSA9/escadeão/mansão
decidem a causa após o `finally` (0 mkdtemp vazado, medido), mutante SB7 não medida
sai 1 quando outra cláusula reprova, e `causaNaoMedivel` classifica signal/timeout
como não-medido. Gate novo `tools/eval/sonda-filho-check.mjs` (verde no fix, morde o
mutante do `pula`) — **ainda não wired no `check:fast`**: `package.json` está fora
desta lease, integrador deve acrescentar `eval:sondafilho`. Evidência completa em
`audits/2026-10-31-visual-consistency/GLM-SB7-FIX-RESULTADO.md`. Pendente para o
merge: crítico independente do diff inteiro (base main + estas correções).

## Conferência Root 10:22 UTC

Builder devolveu lease. Root repetiu sonda-filho-check:10/10 GREEN, log root-sb7-filho-final.log. Wire eval:sondafilho inserido em check:fast e check:deploy; revisão integral GLM + crítico independente ainda pendentes. Package não muda dependências. Sem merge/push.

## Conferência Root 11:08 UTC

R2 expirou sem relatório final e deixou `if(false)` de mutante no guard de caminho
local. Root detectou SFS11 RED, restaurou regex (relativo/absoluto/file:/drive) e
repetiu15/15 GREEN + docs25blocos/32marcadores; logs root-sb7-R2-restored-guard.log
e root-sb7-R2-docs.log no audit. Não aceitar resultados anteriores ao hash final.

Revisões integrais entregues: GLM-SB7-INTEGRAL-R3-RESULTADO.md e
CRITICO-SB7-INTEGRAL-R3.md. Crítico encontrou3P2 (SB7 estático RED apagado pelo HTTP
UNKNOWN, proveniência irmã RED apagada por flaginfra global, texel falha anterior
apagada por SKIP posterior) +P3 mensagem de pack completo semmedição. GLM também
aponta texel, ponteiro CONTRIBUTING e cobertura file:/drive. Corrigir TODOS os
casos concretos; diferença de severidade não refuta evidência. Próxima lease
builder R3 só callers/fixtures/doc, sem tocar branch autor ou package. Mutantes
devem usar tmp/memória ou finally com hashantes/depois, nunca deixarresíduo.

## Marco validado — 11:32 UTC

Root repetiu sonda-filho-check20/20, exit0, log agregado root-sb7-R3-final.log; docs25blocos/32marcadores, exit0 em root-sb7-R3-docs.log. Revisão GLM-SB7-INTEGRAL-R4-RESULTADO.md CLEAN e CRITICO-SB7-INTEGRAL-R4.md CLEAN por leitura integral independente,18hashes estáveis; não houve smoke de produto nesta mudança de ferramentas. Regra fail medido vence SKIP fechada nos callers SB7/PRV/texel, packs só afirmam PASS integral com filhos medidos.

Checkpoint recuperável dos17arquivos de implementação/doc/wire e este ledger. Próximo: integrar main atual nesta lane, resolver apenas conflitos próprios, conferir se os hashes relevantes mudaram, executar pre-push/CI e pedir Estraga-código no head novo. Não alterar branch original do autor; o PR isolado deve deixar relação com1167 clara. Nenhum merge/release nosso até este marco.

Main00e746b5a integrada nesta lane às11:33UTC. Quatro conflitos só nas listas geradas check:fast/check:deploy e docs: preservar listas atuais de main e inserir eval:sondafilho, chave do script preservada. docs:check pós-resolução GREEN. Fontes da sonda/callers não conflitaram. Próximo: pre-push e PR isolado sobre main, sem editar branch original.
