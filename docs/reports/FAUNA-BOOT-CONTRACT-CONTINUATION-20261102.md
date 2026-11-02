# Continuação: contrato de boot da fauna

O CI de PR1214 no commit de22eab reprovou porque o teste de snapshot ainda esperava `BASE` seguido imediatamente por `snapshot`. O produtor passou a separar `API_BASE`; a fixture agora exige a chamada atual completa. Não muda o produto nem o conteúdo exigido no snapshot.

Nos testes de fauna curada e suporte, os módulos do jogo entram depois que o harness registra o Three.js vendorizado. Imports estáticos paralelos podiam carregar outra resolução de Three antes da ponte e eram corretamente recusados pelo parser TAP. A recusa de warnings permanece.

Validação local Node22: RED real da cláusula original em R1876; tentativas R1877/R1881 recusadas como instrumento, sem crédito de aprovação. `eval:map-fauna-curated` R1883 passou em10.775s, com quatro suítes nominais e seis mutantes de menu. Fontes permaneceram iguais durante a execução. Recibo e log estão em `audits/2026-10-31-visual-consistency/FAUNA-ALL-HARNESS-FOCUSED-R1883.*` no volume de projeto.

Esta mudança ainda precisa entrar na composição, passar publicação normal e CI remoto. Não aprova fauna em pixels, Ego, mobile ou gameplay humano. Missão completa e release continuam pendentes.
