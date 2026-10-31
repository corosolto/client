# Continuação — contraprova mobile do #1186

Objetivo: preservar o hardening do executor e a contraprova atira-mudo/HU13 ao integrar main49fd69, sem alterar produto, predicados, tetos ou contar infra como MORDE. DoD: RED do consumidor atual antes do reparo; baseline e mutante causal GREEN pelo arnês real; checkpoint assinado para crítico independente por outro agente.

Lane codex/1186-hud-mobile-followup-20261031, origem365ef1731844210d04916e8e7022bab99cc4c0f7. Root autorizou merge LOCAL da main49fd69f11e1daa7df5138b9e5ca7137091487a6c nesta WT somente. Sem push/PR/ready/merge remoto/comentários; QA, EgoSpace39 e serviços/owner runs não são desta lane.

Checkpoint antes de virar writer: crítico RO pós-bot do365 (review5724785084) encontrou P2 ui-v3-hud.mjs149: âncora g.mouseDown0=true removida de tp/hud.js na main atual, onde .touch-fire é só decorado.28 replace anchors lidos, única ausência atira-mudo. Relatório e fontes: audit QUEUE-1186-1182-RO-R1/CRITICO-PR1186-POSBOT-R1.md, main-mutation-anchors-R1.json, consumer-blobs-R1.json. #1182 tem adjudicação separada sem implementação/respostas nesta lane.

GLM5.3/OpenRouter RO foi tentado com toolCount0/MCPfalse; API encerrou sem resposta válida (stopReason error), não conta como revisão. Nada de quota comprada ou modelo caro. A correção mínima pode ser nativa como autorizado.

Próximo: merge local da base, preparar servidor isolado, reproduzir Infra2 do mutante antigo; reparar só o alvo do mutante para o bloco real único de touch-fire em Game e provar pelo consumidor real, usando Playwright do arnês com lock. Sem retocar produto nem enfraquecer HU13. Evidência de runtime ainda pendente.

Marco20:36Z: merge local49fd limpo em4df50df0eb4b7e58968f0c867a3c511d07a07003; servidor próprio4396 entrega Game/HUD bytes idênticos aos locais. RED real do checker intacto via with-browser-lock em16,314s saiu1: baseline-HU13 FALHA, faltam no toque PING (844×390). Mutante NÃO executado; não foi contado como Infra2 nem como prova semântica de atira-mudo. PNGs reais nos dois viewports, primeiro inspecionado: ATIRA/PULA/MIRA presentes e PING ausente. Fonte main49fd montarToque não cria tp-toque-ping e Game também não cria ping. Este blocker de produto foi entregue ao root; esta lane não o acomoda/removerá do predicado. Artefatos HUD1186-RED-R1.json/log e HUD1186-RED-CAPTURES no audit externo.

Patch preparado só no mutante: route de Game e âncora única do callback touch-fire, removendo só ativação mouseDown0. TryShoot, fonte de produto, HU13/HU13b e hardening inalterados. Node26 --check e diff --check passaram; são verificações sintáticas, NÃO GREEN do contrato. Próximo: receber baseline de produto válido do owner, repetir nominal+atira-mudo real sem bypass, checkpoint assinado e crítico separado. Enquanto isso não há veredito GREEN e nenhum merge/publicação autorizado por esta lane.
