# AUD1C: log do construtor no canal JSON

Causa reproduzida no fonte byte exato da QA21: `game.js` emite `console.info('[times] ...')` ao construir o Game. O filho `authored-game-ctx-check.mjs` sai0 e emite relatório GREEN, mas o prefixo torna stdout inválido para JSON.parse. `aud1Filho` corretamente rejeita esse canal e AUD1C fica RED com o detalhe genérico `ctx real Game→authored.update`. Não há ENOBUFS na reprodução.

Antes: Node22.23.4 e26.12.1 em macOS, stdout3265B, primeira linha `[times] E 4 × 4 B (pedido 4 × 4)`, parse estrito RED. Depois: stdout3232B é um documento JSON puro,21checks GREEN/862calls; prefixo preservado em stderr33B (Node26 também emite sua warning de localStorage).

Correção limitada ao probe: `construirGame(criar)` encaminha console.log/info para stderr apenas durante a construção síncrona; try/finally restaura as duas funções mesmo se criar lançar. Warn/error ficam intactos. O caminho nominal e o boot dos mutantes usam o mesmo helper. Não altera Game, thresholds, física, acceptance nem tamanho de buffer.

Provas externas no agregador `audits/2026-10-31-visual-consistency/`:

- `AUD1C-direct-R1.json` e stdout/stderr: RED de canal antes. `AUD1C-direct-R2.json`: Node22 e26 nominal GREEN, JSON estrito e diagnóstico stderr.
- `AUD1C-shared-acceptance-R2.json`:8/8 decisões esperadas com worker, aud1Filho e aud1Classifica extraídos byte a byte do invariants. Nominal aceito; documento GREEN+exit7 rejeitado; mutante que desfaz o helper recoloca o prefixo e é rejeitado; ctx real com stepPhase=NaN sai1 e reprova3checks; os4controles AUD1C-CTL mantêm as decisões.
- `AUD1C-helper-scope-R2.json`: retorno/logs e exceção/logs preservados; identidades de console.log/info/warn/error restauradas/intactas nos dois casos.
- `AUD1C-mutantes-R2.json`: seis mutantes existentes detectados, sem mudar mutações ou limites. CLI dos mutantes sai0 e também mantém JSON puro.

Comando mínimo: Node22 `tools/eval/authored-game-ctx-check.mjs`, capturar stdout e exigir JSON.parse/oktrue/exit0. `--mutantes` prova os seis contratos. O programa privado `AUD1C-shared-acceptance-R2.mjs` reproduz os oito casos da acceptance sem executar o suite inteiro de invariantes.

Limites: execução local macOS em duas versões Node, não Linux hospedado. O erro observado é suficiente para explicar o AUD1C do run21; só o CI no novo head confirma o reparo hospedado. Invariantes completo e VM14 pertencem ao root. Não houve push/reply/resolução. GLM-5.3 faz investigação RO adicional em paralelo; não foi usado para declarar uma correção sem evidência.
