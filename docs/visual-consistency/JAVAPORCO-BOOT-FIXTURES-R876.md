# R876 — contexto das fixtures de nascimento

Objetivo integral: consistência visual dos mapas, personagens, skins, armas, ADS e movimento, com acompanhamento de PR/release/backend. Flavio/#1158 continua excluído; UI/social depois. Esta lease é autoria de instrumentação CPU, sem nota independente nem aceite de imagem.

Base `01a58257e8f8103b6321520973aa2f21d1fe23bf`, branch `codex/javaporco-boot-fixtures-r876-20261101`, worktree `worktrees/javaporco-boot-fixtures-r876-20261101`. Ownership: `skin-profile-flow-check.mjs`, `tp-identity-check.mjs` e este ledger. `public/`, package, assets, W842 e outros owners não são editados. R869 permanece preservado em seu checkpoint separado.

O baseline R868 arquivado em `audits/2026-10-31-visual-consistency/JAVAPORCO-R868-FAILURE-*` contém dois problemas do instrumento: skin F4c/F4d dava RED1 porque o recorte real encontrava `ehMapaJavaporcos` ausente e seu catch logava o ReferenceError antes de seguir; tp cold dava INFRA3 porque o recorte de nascimento usava `introAbort` ausente. O main real tinha esses imports/parâmetros. Não é evidência de bypass de barreira no produto.

A fixture skin fornece o helper real e o mapa offline explícito. Durante F4c/d, captura `console.error` somente nesse bloco: qualquer erro inesperado, inclusive engolido pelo catch real, vira INFRA3 antes da comparação de failsets. O erro opcional controlado de F4a/b ocorre fora desse escopo. O finally libera o latch da faca uma vez, drena a execução e restaura o logger. Recorte, `bodyPreloads`, predicados, mutantes e orçamentos existentes permanecem.

O probe `node tools/eval/skin-profile-flow-check.mjs --probe=reference-f4` injeta uma chamada não definida dentro do try real e exige INFRA3 com causa ReferenceError; não é mutante do placar. Também deve sair3 combinado com `--mutante=f4-missingawait`. Os probes anteriores conservam seus contratos.

A fixture tp fornece o `ehMapaJavaporcos` e `MAPS` reais, um AbortController novo não abortado e contexto offline sem continuação. `settingsDaPartida` é o mesmo objeto settings fornecido à fixture, equivalente ao ramo offline de mapa comum do main. Mantém o recorte real, construtor, caches/GLBs públicos, texturas CPU1×1, todas as cláusulas/failsets e o timeout existente. Não mede apresentação Java nem mudanças do produto.

Validação final: `npm run eval:skin-profile-flow` PASS, nominal com treze cláusulas e quatro mutantes nos failsets originais; F4c aguardou a faca e F4d observou sua promessa na única barreira. `npm run eval:tp-identity` PASS em160,091s, nominal com onze fixtures/39 cláusulas e todos os dezesseis mutantes DETECTED nos failsets exatos, com nominal primeiro. O alias skin final, depois do fechamento da drenagem/veredito, passou em4,583s. As rodadas anteriores de autoria permanecem arquivadas, sem crédito de nova execução do baseline R868.

ReferenceError dentro do try real deu INFRA3 com causa `skinflowReferenciaAusente is not defined`, sozinho e junto de missingawait, sem DETECTADO. Os probes throw-f4, sozinho e combinado, mantiveram INFRA3; f3-entrega manteve exatamente F3d/F3e. Sintaxe dos dois checkers e diff whitespace passaram. Rehash de todos os3.704 arquivos públicos/752.605.115 bytes antes/depois: zero drift. Casos/failsets tp, mutações existentes skin e deadlines permaneceram byteidênticos; nenhum teto mudou. Evidência privada em `audits/2026-10-31-visual-consistency/JAVAPORCO-BOOT-FIXTURES-R876-*`.

Uma consulta GLM5.3 tools0/MCPfalse produziu resposta natural de218 palavras, selada antes da leitura, sem retry. Native aceitou o diagnóstico de bindings/escopo do logger e rejeitou a sugestão de substituir o helper real por stub falso. Os bindings pós-barreira pertencem ao recorte tp, não ao recorte menor F4c/d.

Checkpoint preparado somente com os dois checkers e este ledger, DCO/Agent; o SHA resolvido acompanha o relatório privado de entrega. Próximo: Root ler/adotar a candidata e fazer revisão independente no PR final após bot limpo. R869 continua preservado, sem wiring nesta lease. Sem browser/headless, GH, push, installs, acesso a private-assets, build, raster, humano Game, QUIC, mobile, quatro humanos MP ou release nesta lease.
