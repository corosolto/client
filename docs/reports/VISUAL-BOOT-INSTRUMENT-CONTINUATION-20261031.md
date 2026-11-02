# Continuação — fixtures de boot móvel

Objetivo e aceite: restaurar skin-profile-flow e launchrace no produto b10e2df41 preservando fonte extraída, barreira real, candidato da faca e mutantes; aliases completos verdes e mutantes causais em Node26/22. A entrega é um checkpoint para RO/cherry pelo root, sem revisão integral pós-bot ou aceite de release.

Lane codex/visual-boot-instrument-20261031, base b10e2df4104688a14f43874f92f4190a215bdae6. Escopo autorizado: tools/eval/skin-profile-flow-check.mjs, tools/eval/launch-race-check.mjs, tests/menu-backdrop.test.mjs e este ledger. Produto, QA/servidor4374, demais gates e tetos ficam com seus donos. Sem browser/push/PR/merge/release nesta lane.

## Milestones e decisões

- RED Node26.12.1 antes de editar: skin nominal exit1 F4c/F4d, ReferenceError _vmBootWeapons; launch nominal exit1, ReferenceError economia no nascimento real. BOOT-INSTRUMENT-RED-N26.json e logs associados no audit externo. São inputs externos ausentes dos ambientes de execução extraídos; algoritmo/barreira não eram o defeito.
- GLM R1 zai/glm-5.3 high expirou em4min, exit1 Deadline exceeded, sem resposta final nem edição comprovada. Não é evidência válida de revisão ou teste.
- GLM R2 OpenRouter/GLM5.3 exit0 forneceu e aplicou os dois bindings via MCP Serena. --no-tools desativou built-ins, mas não MCP; o JSONL da sessão própria comprovou as duas escritas e foi reduzido a BOOT-INSTRUMENT-GLM-R2-WRITES-PROOF.json externo, sem JSONL bruto ou segredo no repo. A atribuição inicialmente incerta ficou resolvida por essa prova. Nenhum processo R1 ou filho direto observável permaneceu vivo.
- Inputs adicionados: _vmBootWeapons no env de F4 e economia:false no sandbox do nascimento. Preservados try/preloads, aguardarPreloads real, promessas controladas, regiões marcadas, predicados e todos os mutantes. A fixture F4 não pretende testar seleção de arma inicial; launch não pretende testar política de economia.
- Primeiro alias completo revelou menu-backdrop RED5/6 em ambos runtimes: produto inicia fauna depois dos props, fixtures ainda tentavam concluir fauna antes de ela ser pedida. Root ampliou a faixa. Rejeitada correção de produto ou remoção de cenários; testes agora liberam props, drenam callbacks e só então concluem fauna.
- Mantidas todas as asserções existentes de entrada, rejeição opcional, mapa antigo, sequência A→B→A e seleção sem novo preload; acrescentadas asserções de ordem e isolamento de callbacks de props/fauna. Dois mutantes antigos tinham âncoras removidas: fauna-gates agora retorna a promessa real da fauna, e no-late-fauna remove só seu callback de redesenho. Nomes/intenções preservados; erro de setup não vale como mordida.
- Comentário histórico sempreload corrigido: LR7 reprova causalmente; LR6 ainda encontra a guarda redundante real anterior ao nascimento. Nenhum predicado foi afrouxado.

## Validação real em31/10/2026

BOOT-INSTRUMENT-N26-R2-VERDICT.json e N22-R2-VERDICT.json:17/17 casos aprovados em cada runtime (v26.12.1 e v22.23.4). Incluem os dois aliases completos, quatro mutantes de skins pelo alias, sete mutantes de launch com LR3/LR7b verdes e conjunto causal exato, cinco mutantes de menu por AssertionError causal sem exceção de setup, probe de entrega ao builder, probe throw-f4 exit3 sem DETECTADO e CLI inválida exit2. Logs por caso ficam no audit externo audits/2026-10-31-visual-consistency/BOOT-INSTRUMENT-*. O primeiro validador externo esperava LR6 histórico em sempreload; foi corrigido por fonte, sem alterar gate/produto.

Próximo passo: root revisa o diff/commit e integra pelo fluxo normal. Checks maiores, bot atual, gameplay/visual/mobile e release permanecem pendentes dos responsáveis; esta lane não os afirma.
