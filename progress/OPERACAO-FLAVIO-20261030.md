# Operação Flávio e resolução dos 47 PRs

## Autorização e objetivo
Em 2026-10-30 Ruben autorizou implementar Operação Flávio com GLM pelo OMP e resolver os 47 PRs, mantendo o HQ em http://127.0.0.1:9180/#live atualizado. Javaporcos é de outro terminal Codex: acompanhamento somente, sem editar sua worktree. Novo pedido: telas inteiras antes do lobby anunciando modos com capturas reais, e material de gameplay/trailers para edição conjunta. Publicação, merge e deploy não foram autorizados por este pedido.

## Definição de pronto
Flávio com contrato de rede compatível, HUD/cinemática/reset conectados, testes e mutações pertinentes, revisão independente e validação visual. Cada um dos 47 PRs deve ter destino e evidência no head atual; pronto para revisão não equivale a merge. Capturas automatizadas não equivalem a partidas humanas. Telas de anúncio e trailers exigem revisão visual e editorial.

## Estado inicial e arquivos reservados
Branch `v2/operacao-flavio`, base `25e807fa0f86104d1f3ce43bc493d49ea63b3ced`, PR client#1158. Único item anterior não rastreado: `worktrees/`, preservar.
- GLM-02 via OMP: propor patch apenas em `public/js/mode_operacao_flavio.js`, reset do avião. Codex aplica patch após conferir base e valida.
- Codex: régua independente `tools/eval/operacao-flavio-reset-check.mjs`, integração em package.json, arquivos compartilhados game/main/netcodec, backend e coordenação dos PRs. GLM não altera esses arquivos.
- Javaporcos: nenhum arquivo cedido a esta lane; PR #1160 acompanha o proprietário externo.

## Milestones
Régua de reset criada por Codex antes do reparo. GLM ainda não executou o reparo. Evidência de vermelho/verde e mutação será acrescentada após execução.

## Fontes e painel
Plano anterior em `corosolto-roadmap/reports/2026-10-30-revisao/`; auditoria em `csbrasil/audits/2026-10-30-roadmap/`; HQ em `csbrasil/operations/corosolto-hq-20261026/`. Runtime local do HQ guarda status do GLM e dos PRs, sem credenciais.

## Próximo passo
Executar régua vermelha, despachar GLM-02 no OMP com patch restrito e sem fallback, ligar os estados de execução ao HQ, atualizar revisões dos 47 PRs.

### Régua vermelha validada
Node v26.12.1, `node tools/eval/operacao-flavio-reset-check.mjs` falhou na asserção específica: posição z=68 após prepareRound, esperada origem z=55. Código original SHA256 2ec852fdebb784f122072e94c928d1eee0ebfe38367050bc8690964f25265cee. GLM-02 recebe esse caso e três fontes em leitura, produz patch JSON para aplicação pelo integrador.

### GLM-02 recebido e verificado
OMP zai/glm-5.3 concluiu 23:52:44 UTC, sem fallback, leitura apenas, patch JSON. Base e trecho literal conferidos antes da aplicação. Régua ficou verde offline/online, duas rodadas por origem padrão/não padrão, derrota e prop ausente. Mutante que preserva posição deslocada aplicou e voltou a falhar na asserção z=68 versus z=55. Validação lógica local, sem alegar captura visual ou multiplayer humano.

### Pacote GLM-03 reservado
Base efba93ff1. GLM propõe patch em game.js::_updateHud, netgame.js::transicaoDeEstado e mode_operacao_flavio.js::atualizaHud. Codex não escreve nesses arquivos durante o pacote. Régua independente operacao-flavio-online-check.mjs reproduziu HUD vazio, cinemática ausente e countdown sem reset; primeiro snapshot sem cerimônia passa. Hashes de entrada registrados no prompt local. Ordenamento anterior à aplicação das entidades permanece sob investigação, sem alegar solução.

### GLM-03 recebido e verificado em lógica local
Quatro casos online passaram no HUD/transições reais com DOM stubado; três mutações (sem HUD/cinemática/reset) aplicadas e reprovaram. Relógio do servidor preservado. Fonte GLM estática não executou testes. Riscos ainda abertos: transição ocorre antes das entidades do snapshot (morte do VIP pode receber título errado); fontes de áudio precisam encerrar no reset; contrato binário diverge de Javaporcos/backend. Não declarar MP validado. Push efba interrompido localmente antes do envio para integrar e testar o conjunto.
Primeira visita Ego Lite Space13/p2 carregou Flávio vivo com objetivo/checkpoints/avião. Captura inicial em /tmp/corosolto-flavio-live-first.png; enquadramento de spawn voltado à parede não serve como arte. Preview JPG existente é arte conceitual, não captura do motor.

### GLM-05 reservado: codec comum
SHA de Java pinado cf2348b4449a6a17b6532867a3210cdc509f989f; backend df6ab491eb4a21890439d7bcb3464479d5acb1ba. Codec backend resolve fisicamente para worktree Java: não escrever nesse caminho. Régua independente objective-codec-contract-check.mjs vermelha com team J e limite80; compatibilidade E/B v2..v6 verde. GLM-05 propõe patch apenas no codec desta lane. Não alterar game/netgame até receber outro pacote.

### GLM-05 recebido e verificado
Codec v7 agora preserva time J (bit16) e80 slots em encode/decode. Seis casos locais verdes, três mutações aplicadas/reprovadas. Hashes binários de frames E/B v2..v6 conferem exatamente com codec anterior8248164; formatos antigos seguem limite64 e rejeitam J. Régua preexistente netcodec:30ok,0falhas. Main consultada via GitHub ainda declaraCURRENT_VERSION6: não confundir extensõesv7 abertas em PR com produção. Falta consumo do NPC no cliente e negociação/backend completo; nenhuma escrita externa.

### GLM-08 reservado: apresentação e áudio
Régua independente ampliada antes do reparo: três RED confirmados (placar, morte no snapshot de roundEnd, marcha após reset). Lease exclusivo em netgame.js/mode_operacao_flavio.js; GLM propõe patch, Codex integra. Preservar countdown antes das entidades e primeiro snapshot sem cerimônia. GLM-07 mantém lease em main.js/mode-announcements.js. Base {"public/js/netgame.js": "a4d969e9729e863c786eeeeda3d1cb4bc14019988bec3453d54a3fc59a7ed596", "public/js/mode_operacao_flavio.js": "75354f8c0681bd0bcb8049a7621bf04ad5398758e5366ec3e6068ef45941a301"}

### GLM-08 recebido e medido
Base/hash/trechos conferidos. Oito casos locais verdes: placar oculto durante cena, morte atual do VIP no roundEnd, reset com relógio e entidades autoritativas preservados, primeiro snapshot sem cerimônia e corte da marcha no reset/reentrada. Seis mutantes aplicados/reprovados, incluindo regressão da ordem real do snapshot. Sem teste humano/MP pareado ainda. HQ checkpoint5237cb5 com185 testes verdes e execução/tokens por pacote no navegador.

### GLM-12 reservado: identidade do NPC e contenção de entrada
Checkpoint f75b1a391. RED independente reproduz humano com skin igual consumindo corpo do VIP, vipId ausente no estado, e segundo gesto escapando da splash pendente. Lease em netgame.js, mode_operacao_flavio.js e main.js até recebimento. Backend/Java intocados; novo campo objective JSON aproveita backend182 existente. Testes de ordem normal, sem NPC e mutantes ainda serão ampliados no recebimento.

### GLM-12 recebido e validado localmente
JSON veio com cercas Markdown, removidas só do envelope; versão bruta preservada no HQ. Hashes/trechos conferidos. Identidade numérica do VIP via objective JSON, reserva antecipada do corpo e contenção dos gestos verdes. Régua NPC:8casos incluindo ordem/limites/fallback,2mutantes aplicados/reprovados. Anúncio: disponibilidade, entrada única, timeout/import tardio, falha, convite/teste e3mutantes aplicados/reprovados.

QA pareada local passou: fixture runtime/flavio-pair/ no HQ usa game/ e api/_lib do backend182 df6ab491, public/tools da lane cliente, sem modificar symlink backend→Java. Room e Game reais, codec binário v7, humano com mesmo personagem sem tomar VIP, morte atual/resultado sem placar e countdown preservando relógio. É fixture sem WebSocket nem participantes humanos; não é produção ou partida humana. Script/check/result e pins preservados no runtime. Avisos de instâncias Three/GLTF anotados no log, sem falha de contrato.

Checagem ampla check:fast segue rodando; eval:tpanim3p já falhou e precisa diagnóstico antes de qualquer declaração de gate verde. Não atribuir automaticamente à lane nem ignorar como dívida. Falta revisão independente no head final, CodeRabbit atual, push normal com hooks e QA WebSocket/browser pareada.


### GLM18 reservado: recebimento do crítico e52
Régua independente de apresentação mediu RED no pulo online (stateUntil alterado), câmera do espectador e winner ausente no timeout; antes de2s e pulo offline já passam. Lease apenas mode_operacao_flavio.js e netgame.js. Game.update permanece append-only; guarda em cameraEspectador cobre seus dois chamadores. Crítico segue lendo ponto fixo e52, não as mudanças posteriores.

### GLM19 reservado: cobertura CTF
2026-10-31T00:44:42.342523+00:00: mutante vaza anterior saiu0 sem atingir Piscina; régua independente reproduziu omissão de Praça. Lease apenas tools/eval/ctf-labels-check.mjs e ctf-win-check.mjs. Proposta deve excluir só objectiveMode e comprovar aplicação. Codex mantém testes independentes.

### Crítico independente do checkpoint e52 — sete itens abertos no recebimento
Revisão antecipada exigida por AGENTS; não substitui a revisão final após CodeRabbit. Itens: pulo online altera relógio; follow sobrescreve câmera; filtros CTF omitem mapas opcionais/mutante; OBJ3 mede estado local em vez de recepção/aplicação; timeout sem winner; respawn8s/retaguarda ausente; blocos derivados de scripts desatualizados.

GLM18 recebido com envelope Markdown removido só para parse; bruto preservado. Allowlist/hashes/literais conferidos antes de aplicar. Sete casos de apresentação verdes; cinco mutantes reais aplicados e reprovados (pulo, relógio, câmera, vencedor, áudio). Reentrada verificada; clock autoritativo preservado. Sem alegar WS/humano nem conclusão dos outros quatro itens. Logs /tmp/corosolto-flavio-presentation-*.log; runtime GLM-18-PATCH.json no HQ. Próximo: reparar CTF/OBJ3/respawn, gerar docs e terminar gate amplo antes de push/revisão.

### GLM20 reservado: prova OBJ3
2026-10-31T00:47:37.273089+00:00 — RED independente: bloco browser real fica verde sem payload, sem aplicar e noop. Lease só tools/eval/tiro-mp-browser.mjs. Sonda temporária de campo local exige próximo snapshot e aplicação real; sempre restaurar sentinela em falha. Sem afirmar WS.

GLM19 integrado após hashes/literais conferidos. Codex ajustou log para dizer aplicada somente quando contador==1. Régua independente: ambos scripts cobrem todos mapas comuns, omitem objetivo dedicado, e mutante vaza aplicado1x reprova CTFL1 na Piscina. Três casos verdes em /tmp/corosolto-ctf-coverage-green.log. Integração em eval:ctflabels; condições de vitória/mapas intocadas.

Checkpoint de apresentação/cobertura: eval:operacao-online completo passou (oito casos anteriores+mutantes, sete novos+cinco mutantes). Syntax, arch:check e docs:check passaram. Gerador atualizou três blocos estruturais (AGENTS e comecando PT/EN), sem números manuais. Próximo: OBJ3/respawn e investigação de tpanim3p; gate amplo ainda não verde.

### GLM21 reservado: respawn
2026-10-31T00:50:55.976470+00:00 — RED real em _kill/_pickSpawn: atraso2.2s individual, VIP entra na fila, E à frente e B preso base. Lease modo Flávio e só duas linhas de hooks Game._kill/_pickSpawn. Regra8s desde prepareRound, retaguarda em respawn live para ambos times, entradas/countdown originais preservadas. Régua inclui geometria/rota e dedicado; sem reduzir escopo da spec.

GLM20 rejeitado antes de aplicar: sentinela entre frames podia ser apagada por update local, risco admitido no parecer. GLM22 recebe régua com update real e desenho de wrapper observando chamada autoritativa síncrona, com restauração obrigatória. Lease permanece apenas tiro-mp-browser; base intacta.

GLM21 rejeitado antes de aplicar: retornou delay relativo para campo respawnAt absoluto, e checkpoint0 mantinha E à frente. GLM23 recebe mesmas bases e régua ampliada aos13 checkpoints; hooks absolutos e retaguarda também no início. Runtime continua intacto.

GLM22 recebido/aplicado com hashes/literais conferidos: quatro cenários do bloco browser real verdes, Game/Netcode reais+update entre frames; ausência de payload, chamada removida e noop reprovam OBJ3. É transporte controlado, não WS.
GLM23 recebido com prosa+JSON: extraído único bloco sem alterar valores; schema path normalizado, hashes/literais conferidos. Game editado só por apply_patch em duas linhas. Comentário de4linhas removido por convenção.60 casos normais verdes (13 checkpoints, dois times, offline/dedicado), incluindo colisão/rota/ondas/VIP/countdown. Régua ampliada para fallback2.2s sem objetivo; mutantes em curso. Limitações de fallback fora da geometria esperada declaradas pelo GLM, não afirmar QA humano/produção.

2026-10-31T01:03:12.597731+00:00 — check:fast exploratório interrompido após falha registrada eval:tpanim3p453.8s e demora em emotes. Não verde; detalhes da falha ainda precisam reprodução focada. Somente árvore de processos própria runner86894 encerrada após verificação de cwd/comando, recibo HQ runtime/flavio-fast-interrupted.json. Alterações de runtime ocorreram durante rodada: não atribuir resultado a um head único. Priorizar check:deploy normal e casos tocados; não pular hooks.

GLM24 reservado após novo RED independente: OBJ3 aceita owner antigo quando g.objective troca após aplicação. Lease só tiro-mp-browser.mjs, exigir owner atual e preservar finally. Outros quatro casos verdes; não alterar runtime nem testes.

2026-10-31T01:08:11.173541+00:00 — GLM23: eval:operacao-reset completo62 casos normais+4 mutantes reais verdes, incluindo fallback comum2.2s; eval:operacao-npc passou, eval:operacao-online anterior passou e GLM24 agora endurece owner atual com5 cenários verdes. GLM24 JSON puro/hash/literal conferidos antes de aplicar. eval:operacao-flavio passou normal e mutante contestação. Syntax/arch/docs verdes após geração normal sem delta. Logs /tmp/corosolto-flavio-{online-final,npc-final,respawn-focused,mode-focused}.log e /tmp/corosolto-objective-owner-green.log. Próximo: checkpoint, pin fixture e prova WS, diagnosticar tpanim3p e obter revisão/push normais. Não pronto para merge nem QA humano.
