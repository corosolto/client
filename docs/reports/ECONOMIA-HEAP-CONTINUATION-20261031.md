# Economia: OOM no portão do #1188: 31/10/2026

## Objetivo e ownership

Corrigir o OOM de `eval:economia-jogo` preservando todas as cláusulas, os24 mutantes padrão, o controle causal `boot-explode`, os códigos de saída e a classificação CANT_TEST. Não aumentar heap, pular mutantes ou alterar a economia do jogo.

Lane exclusiva: `worktrees/economia-heap-1188-20261031`, branch `codex/economia-heap-1188-20261031`, base `21f264c519aac547148ea1bab3c5c64d847e8290`. QA/AK/CI/yaw foram somente leitura. Nenhum arquivo de jogo, package ou workflow foi alterado.

## Causa e solução

O checker não importa módulos variantes: ele repete `medir()` no mesmo processo. Cada medição cria várias instâncias Game completas sem liberar o estado entre mutantes; timers e closures ficam retidos enquanto o loop síncrono não retorna ao event loop. O heap cresce a cada medição.

O modo completo agora usa o CLI existente `--mutante=X` em um processo separado para cada mutante. Cada filho refaz a baseline integral e o mutante escolhido; o pai exige o mesmo número de cláusulas nominais verdes, exatamente uma evidência, resumo coerente e exit correto. Evidência ausente, duplicada, baseline vermelha, crash, timeout e erro do processo não valem como detecção. O modo individual e os controles causais mantêm o contrato anterior.

A baseline repetida custa tempo, mas evita uma nova flag que possa pular a medição nominal. A escolha foi medida, não presumida.

## Evidência validada

Artefatos grandes estão no audit externo `audits/2026-10-31-visual-consistency/`, prefixo `ECONOMIA-HEAP-`.

- Hosted anterior Node22: exit134, OOM após `equip-nao-perde`, log `PR1188-pr-fast-21-job.log`.
- RED local real: Node22.23.4, heap padrão4345298944B, sem heap flag/NODE_OPTIONS; exit134. Heap observado4094647984B após o21º mutante, com crescimento progressivo. `BASELINE-R1.log` e `BASELINE-OBSERVED-R1.jsonl`.
- GREEN integral: mesmo Node22 e limite; exit0 em133.32s, **23/23 cláusulas e24/24 mutantes detectados**, nenhum cego/CANT_TEST. Heap do pai observado236999048B. `ISOLATED-R1.log`, `ISOLATED-OBSERVED-R1.jsonl`, `VERDICT-R1.json`.
- Os3 mutantes restantes que o RED não alcançou também passaram individualmente; heap observado408–424MB por medição. `SINGLE-R1.json`.
- Amostrador OS começou depois do início do lote: observou18 processos, máximo RSS659216KiB; não é medição do pico de todos os25 processos. `ISOLATED-RSS-R1.json`.
- Controles R2 Node22: **4 grupos verdes, zero falhas**. Mantidos sem-perda/EJ6, boot-explode/CANT_TEST e mutante desconhecido. O protocolo adicional executa dois workers reais com PIDs distintos e um worker morto por SIGTERM; também recusa status errado, timeout, baseline vermelha e evidência ausente/duplicada/de outro nome. `CONTRACTS-R2.log`.
- GLM-5.3 real via OMP: análise RO R1 recomendou isolamento. Revisão RO R2 verificou o dispatcher/classificador; três riscos foram classificados com evidência em `GLM-R2-RO.md`. Nenhum crash foi contado como mordida.
- `npm run docs` exit0, zero arquivos gerados alterados (contagens de PR preservadas). `DOCS-R1.log`.

## Aceito, rejeitado e próximo passo

Aceito: isolamento de processo com baseline completa e classificação fechada. Rejeitado: aumentar heap, skip, timeout como detecção, dispose/yield frágil e nova flag para pular baseline. A medição não afirma equivalência de desempenho em Linux hosted nem corrige todos os lifecycles do Game.

Próximo passo: root revisa e integra o checkpoint, executa o portão normal e acompanha o novo CI hosted do #1188. O GREEN local não é confirmação de merge/release ou de dívida de review zerada. A missão visual completa permanece no ledger da lane principal.
