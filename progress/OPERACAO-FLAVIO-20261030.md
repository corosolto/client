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

2026-10-31T01:12:33.730815+00:00 — WS local real aprovado em fixture isolada: backenddf6ab491+clientecc8c82440, duas conexões v7 com tickets válidos (sem ticket401),108 snapshots por lado e20 ticks live idênticos; ambos aplicam objetivo/NPC/clock. Instrumentação backend só bind127+IPC de pronto, telemetria externa vazia. Não browser nem humano. Artefatos HQ runtime/flavio-pair/{websocket-check.mjs,websocket-result.json,websocket-pins.json,dependency-pins.json}. Fixture original preservada; tentativa anterior parou por fetch stubado/falta de computeStats no arnês, corrigido só no teste. Próximo: QA browser/visual e falha tpanim3p, revisão e push.

GLM26 reservado só marchaMilitar: régua de agendamento real mediu7.92s RED frente à spec18–24s. Alterar duração por64 batidas com mesma melodia/envelopes e preservar cancelamento completo; sem mexer câmera/runtime fora da função. Codex escreve teste; modelo só propõe.

GLM27 auditoria somente leitura da cinemática/spec: câmera atual pode cruzar travessas do hangar, vídeo não prova subida/porta, vitóriaE luz/sirene ainda não demonstradas. Sem patch/lease de escrita até diagnóstico e régua. Preservar GLM26 exclusivo em marchaMilitar.

2026-10-31T01:19:07.341107+00:00 — GLM26 JSON/hash/literal recebidos, patch mínimo24→64 batidas aplicado. Régua mede agenda da função de produção:21.52s dentro18–24s; mutante real volta7.92s e reprova; reentrada/cancelamento de todas fontes verdes. Não é escuta humana; modelo escreveu razão com imprecisão sobre tempo/AudioContext, não usada como evidência. Codex executou medição. Crítico dos vídeos: verticalv1 rejeitado (silêncio/vigas/sem identificaçãoVIP), horizontal só rascunho (vigas10.5–12.5s). Artefatos e parecer no HQ runtime/media/flavio-piloto-20261031/manifest.json. Corrigir planos/áudio antes de apresentar como aprovado. Próximo: terminar diagnóstico animação, checkpoint da marcha e receber auditoriaGLM27 de cinemática.

2026-10-31T01:21:25.200833+00:00 — Integração após GLM26: eval:operacao-online completo saiu0 (inclui reset/apresentação/OBJ3/marcha e mutações); syntax, docs:check e arch:check verdes. Apenas duração da música muda no runtime; áudio programado21.52s não é escuta humana e será cortado pelos caminhos de reset/pulo já medidos. Checkpoint preparado antes de exportar faixa nativa para o piloto.

Reprodução focada animação: AN1 adjim retorno2.47cm vs limite2cm; mão18.3cm, pente27.5→13.5cm, demais9 itens verdes. Não atribuir à lane nem mudar teto. GLM28 auditoria sem patch propõe controle pareado de fase idle/IK e eventual ensaio Node real. Processo browser ainda no fechamento; não iniciar segundo browser.

2026-10-31T01:36:16.393183+00:00 — GLM28 recebido (auditoria, sem patch). Diagnóstico com GLBs/AnimationMixer/CharController reais:19fases×3LODs e39combinaçõesarma/histórico sem resíduo pareado; prétiro deriva17.99cm igual no controle sem recarga. Não reproduz numericamente2.47cm anterior nem prova causa única. Codex corrigiu AN1 para corpos gêmeos/fase alinhada, teto2cm/seleção original preservados; normal browser em execução, ainda sem resultado. Crítico antecipado pediu matriz permanente com histórias e mutante de retorno, aceitos: tools/eval/tp-reload-paired-check.mjs agora42casos idle/tiro/corrida, todosretorno0; mutantes reais residuo42/42, apos-tiro14/42, apos-corrida14/42 reprovam retorno19.47cm com timers0. Integrado à chamada normal AN1; fonte glbchars.js intocada. TesteautorCodex, GLM29 revisão estática em execução. Log /tmp/corosolto-tp-reload-paired-self-test.log. ExtraçãoEgo real mede controle mas não substitui browserPraca/wiring. Próximo: fechar normalbrowser, crítico da nova matriz, docsgerados e checkpoint antes de push normal.

2026-10-31T01:39:30.292457+00:00 — Browser normal pareado terminouexit0,10/10: raul mão23.3cm, pente30→12cm, retorno0.00cm contra controle, idle0.24cm. Log /tmp/corosolto-flavio-tpanim-paired-normal.log. Não reproduz/resolve numericamente originaladjim2.47; é correção demonstrada da medição e nova cobertura permanente. Críticoaceitouhistórias/mutantes e apontou NaN; guarda finite aplicada a retorno/mid/drift/duração, novo mutante real nao-finito42/42 reprova. Self-testfinal42normais+4mutantes verdes /tmp/corosolto-tp-reload-paired-self-test.log. Docs normal (após staging), docs:check, arch:check e syntaxdos2scripts verdes. GLM29pré-revisão ainda emcurso. Próximo: checkpoint e pushnormal comhooks, preservar eventuaisbloqueios; CodeRabbitheadatual e críticofinal/humano nãoobtidos.

2026-10-31T01:49:59.458036+00:00 — Push normal a8489bc84 encerrou1, semenvio: hookcheck:deploy CM1 em main.js trêscomentários trailing consecutivos movidos pelo anúncio. Log /tmp/corosolto-flavio-push-a8489.log. Codex remove somente duas notas redundantes, semmudarcomportamento/limites. Próximo gatecomentário+checkpoint e novopushnormal; sem bypass.

2026-10-31T02:01:32.575681+00:00 — Flávio542ec38b8 enviado com hook normal343s. CI reguas-e-site RED: mutante splash-sem-marco não aplica após anúncio. Codex reproduziu8/9; GLM35 recebe lease só funil-lobby-check.mjs para mutar chamada real sem depender de comentário. Runtime intacto; revisão/merge pendentes. Próximo: GLM35, privacy completo e push normal; Admin38 merge/check e Admin39 isolamento. Java externo preservado.

2026-10-31T02:04:53.248576+00:00 — GLM35 recebido com SHA/literais únicos conferidos. Candidato exato executado fora da árvore com --fonte real:10/10 mutantes mortos; integrado sem mudar main/runtime. Mutante remove marco e outro remove relógio do callback, independentes do comentário; subprocessos preservam --fonte. eval:privacy completo saiu0, docs:check e arch:check verdes. Logs /tmp/corosolto-flavio-{funil-glm35-candidate,privacy-green,funil-docs-check,funil-arch-check}.log. CI anterior542ec falhou precisamente no mutante antigo; novo checkpoint/push normal ainda pendentes, não pronto para merge.
