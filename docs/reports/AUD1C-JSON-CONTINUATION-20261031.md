# AUD1C JSON channel

Objetivo integral visual/merge/release preservado com root. Escopo desta lane: corrigir somente o probe `authored-game-ctx-check.mjs` que emite log de construção antes do JSON. Root é único writer de game/authored e investiga VM14; QA/AK/CI/yaw intocadas.

Base QA21 `21f264c519aac547148ea1bab3c5c64d847e8290`, branch `codex/aud1c-json-channel-20261031`. ARCH regenerado; dependências em symlink somente leitura. Regras AGENTS, bug-hunt/regua e LICOES lidas na investigação anterior desta lane lógica.

Reprodução anterior ao fix: Node22.23.4 e26.12.1, status0, stdout3265B começa `[times] E 4 × 4 B (pedido 4 × 4)` antes do JSON. JSON.parse(stdout) reprova; documento após o log diz oktrue e862calls. game.js:992 usa console.info no construtor; AUD1C exige JSON puro e corretamente rejeita stdout. Fonte do ctx byteexata à QA21: SHA25615911e9a3d1906baf833d4186b72f20fbf5cb2767836fcfb86b60aa7b82217c5. Artefatos externos AUD1C-direct-*-R1.*.

Root autorizou correção do gate: encaminhar logs de construção para stderr em try/finally, preservando diagnóstico e1documentoJSONstdout. Sem parser permissivo, alteração de produto, limiar ou waiver de exit nãozero. Próximo: corrigir dois callers de construção, provar canais/restore+erro e sharedacceptance+controles/NaN.

Marco validado R2: helper de7linhas envolve os dois construtores, sem tocar produto. Node22/26 stdoutJSONestritoGREEN21checks/862calls e stderrpreservado. Acceptance exata compartilhada:8/8 decisões esperadas (GREEN0, GREEN7RED, prefixoRED, NaNRED,4controles); helper2/2 retorno/throw/restauração; seis mutantes detectados. Relatório `AUD1C-JSON-REPORT-20261031.md`; artefatos `AUD1C-*-R2.*` no audit externo. GLM RO adicional ainda em curso no checkpoint; sem autoridade sobre a prova nativa.

Próximo: root cherry-picka o checkpoint desta lane sobre sua integração QA e roda o ctx Node22 mais AUD1C no portão completo. Confirmar hostedCI antes de resolver finding. VM14 e consistência visual ampla continuam pendentes com seus owners. Sem merge/release/waiver nesta lane.
