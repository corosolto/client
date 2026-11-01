# CI independente no #1188 — candidato R2

Finding `PRRT_kwDOTbwe3M6yTxcf` válido: falhar a economia pulava os checks visuais seguintes. O job já reprovava, mas perdia diagnósticos. [GitHub documenta success() implícito](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions) em condições sem status function.

A correção dá `id: deps` ao npm ci e exige `!cancelled() && steps.deps.outcome == 'success'` nos dois checks de economia e oito grupos independentes seguintes. Falha prévia deixa esses consumidores rodarem; cancelamento ou instalação falha/pulada impede execução. Sem continue-on-error, sem mudar o agregador build ou os outros jobs.

PI4 estende o portão existente `eval:portaointeiro`, sem pacote ou dependência nova. Extrai steps reais do YAML, liga cada grupo aos tokens do comando e modela 18 cenários: sucesso, falha anterior, cada um dos dez grupos falhando, três falhas de setup, deps pulado e dois pontos de cancelamento. Outcome só é escrito depois da condição; if explícito sem status também herda success(). Expressões fora da gramática coberta reprovam.

Provas em `audits/2026-10-31-visual-consistency/` no agregador:

- `CI-INDEPENDENT-NATIVE-BASELINE-R1.json`: antes da edição do workflow, cada uma das duas falhas de economia pula 8/8 grupos posteriores, preservando job failure.
- `CI-INDEPENDENT-R2-RED-base.log`: gate R2 contra ci.yml byte exato da QA21, exit1 com consumidores omitidos após falhas. O candidato R2 nominal passa com 10 grupos ×18 cenários.
- `CI-INDEPENDENT-R2-focals.json`: 14/14 verificações esperadas, incluindo sete mutantes PI1–4 e os seis checks focais/security. Quatro mutantes PI4: status ausente, always em cancelamento, erro ignorado e setup não guardado.
- `CI-INDEPENDENT-R2-native-tamper.json`: 4/4 falsificações adicionais rejeitadas por PI4: if explícito sem status, comando removido mantendo nome, if desconhecido, step ausente.

GLM-5.3 via OMP gerou a primeira correção. Seu gate R1 foi corrigido na revisão nativa: default success em if explícito, outcome skipped/ordem, injeção por consumidor real, comandos além de nomes e guard de mutantes legado. Evidência R2 substitui as alegações do instrumento R1.

A pedido do root, o grupo visual também referencia `eval:shot-final-pose`. **A definição de package vem da lane AK do root e precisa estar integrada antes de executar o workflow.** Esta lane não modifica package nem game.

Limites: modelo local documentado, sem execução do runner GitHub ou das réguas de jogo neste teste de agendamento. Não mede arte/gameplay. Sem push, PR, reply ou resolução de thread. Root ainda precisa integrar o comando AK, revisar o diff consolidado e obter review/CI atuais antes de fechar o finding.
