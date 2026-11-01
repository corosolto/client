# Continuidade: origem das luvas no corpo TP

A missão completa continua ativa: integrar os PRs elegíveis e acompanhar release, melhorar mapas, personagens, skins, animações e ADS da AK. Operação Flávio #1158 fica excluída; fluxos de UI e redes sociais ficam para a etapa seguinte. Esta frente corrige apenas a identidade e o carregamento de luvas, sem declarar os demais objetivos concluídos.

## Estado recuperável

Worktree `tp-glove-origin-runtime-r770-20261101`, branch `codex/tp-glove-origin-runtime-r770-20261101`, base da fábrica `a4bb086b26d8b64e7a8ac70a10a7ce6e830f4e67`. Checkpoint da régua anterior ao produto: `4bacbacbd`. Root é o único escritor dos runtimes conectados.

A régua R780 importou os módulos e carregou os corpos reais antes de registrar O1 vermelho por API ausente; os outros sete casos ficaram UNRUN. Root leu o instrumento completo e revalidou 17 referências sem drift antes de escrever a correção. Evidência externa preservada em `audits/2026-10-31-visual-consistency/TP-GLOVE-ORIGIN-R780-*`, na raiz agregadora.

## Implementação R786, ainda em revisão

O corpo clonado captura um handle imutável da origem do seu template efetivo. O cache e as requisições usam tipo, personagem, caminho e digest completo da skin ou revisão do corpo base. Uma variante só é elegível quando a procedência e a família correspondem; ambiguidade ou ausência produz negativo estável, sem fallback para outra origem. `preloadGloveAssets` e `hasGloveModel` preservam o contrato base, inclusive antes do carregamento do corpo.

Game retém esse handle enquanto conserva o corpo atual. Uma skin carregada posteriormente não altera a origem do corpo já montado. A troca de luvas usa o setter existente, preservando controlador, mixer e listas de visibilidade. Preview e boot resolvem o handle após carregar corpo e skin.

Nominal R786: oito casos verdes em 5,599 s com Node 22, Game real e GLTFLoader real, incluindo as duas ordens de catálogo/atores, corpo fallback que continua vivo, corrida A→B→A e recusas por ausência, SHA divergente e duplicação. Fonte e recibos estão vinculados em `TP-GLOVE-ORIGIN-R786-NOMINAL-V1.json`; delta de produto em `TP-GLOVE-ORIGIN-R786-RUNTIME-V1.diff`. O candidato Drip é produzido apenas em memória. Nenhum manifesto, revisão de asset ou GLB distribuído foi alterado.

## Pendências e próximo passo

A lease de instrumentos foi devolvida. Root leu os deltas completos e os recibos, revalidou 128 referências sem drift em R804 e aceitou a integração dos portões. K1 exige demanda do manifesto e zero carregamentos da origem errada quando a skin não possui variante própria. K2/K3 e C6 permanecem literalmente iguais ao checkpoint anterior ao produto. O relatório do instrumento registra os controles rejeitados de F2 V1 e a correção de observação de K12 antes dos recibos finais. Não houve relaxamento de teto.

Ainda falta observar o jogo em 3:2, movimento, arma, contato e materiais. A recuperação do Ego TaskSpace 56 continua pendente da resposta já solicitada. Fit, acabamento visual, mobile e partida multiplayer humana não estão aprovados. Nenhum verde técnico substitui esses critérios.

O push consolidado para staging R768 falhou num gate com `Invalid URL`; o primeiro alias histórico é desconhecido porque o hook apagou o log. A reprodução focal R784 comprovou que um link local de `three` para outro worktree separava os prototypes dos loaders. R787 corrigiu somente o shim de dependência próprio de W766/W770; a reprodução normal passou 40/40 em 0,334 s. R788 repete o push com hooks normais e retenção do log. R779, push atômico de F2/fábrica, continua independente e seu worktree não foi alterado enquanto roda.

Release 135 convergiu pelo caminho normal: API pública no servidor `a27db126`, BR pública no cliente `24206a8235c6fb863e62d5b79bbb3180eca4ab02`, servidor `a64025200c77dbc6946ef61a0535bcad5c9bbcb2` e SIM `0364ee5892716108`, comprovados em `RELEASE135-CONVERGENCE-R769.json`. Isso não prova uma partida humana.

Root R790–R798: o boot agora aguarda `Promise.allSettled` de corpo/skin antes de resolver o handle, preservando o fallback base quando o preload cosmético opcional rejeita. A verificação do módulo publicado passou SB1–SB7 em 17,465 s. Os oito nominais R786 V1 antecedem esse delta; os novos recibos e mutantes seguem sob lease do instrumento. A primeira chamada GLM R789 terminou por limite de saída, sem texto final: UNKNOWN, sem crédito de parecer. Root leu a limitação e revalidou 41 referências únicas sem drift; uma única tentativa menor R798 foi autorizada, com limite explícito de duas tentativas para essa revisão de produto. O autor do instrumento também informou uma chamada separada terminada por limite, sem parecer; ela permanece UNKNOWN e não recebe crédito.

Os quatro aliases que falharam em D723 por identidade do loader passaram após o shim local: 40/40, 179/179, 36/36 e o alias de câmera com seus mutantes. O push normal atômico R793 está rodando; R779 continua registrado como falho. O #1173 foi encerrado como supersedido após triagem integral, 94 vínculos sem drift e prova Root de patch-id/ancestria do guard já entregue em staging. Não houve merge do snapshot antigo nem fechamento de #1109.

Root R802: li integralmente a resposta final e o relatório da revisão de produto GLM R798 e revalidei 30 referências únicas sem drift. Parecer estático sem achados acionáveis, com limites preservados: bind por nomes permanece, identidade deriva do catálogo e a preview requer fulfillment conjunto. Isso não é a revisão formal atual do PR nem crítico Native pós-bot. A convergência pública do release 135 refere-se ao cliente242; os commits posteriores de staging e esta frente pendente não foram declarados publicados.

## Integração dos portões R806

Os recibos finais de R780-FOLLOWUP registram S4 nominal completo e nove mutantes detectados nos failsets exatos; S1 nominal completo e quinze mutantes; F2 nominal e sete controles exatos. Os controles de protocolo/nonce/CLI/âncora e a comparação literal de K2/K3/C6 passaram. Preview passou 153 testes. Esses números são resultados dessas execuções, não um placar permanente da base. A chamada GLM de instrumento terminou sem resposta final e continua UNKNOWN.

O alias eval:tp-glove-origin foi acrescentado a check:fast, check:deploy e ao job equipamento-tp, com o novo controle body-preload-failfast em eval:tp-identity. O contrato fica em docs/visual-consistency/TP-GLOVE-ORIGIN.md; K1 e a prontidão própria de K12 foram alinhados na documentação. Nenhum arquivo de produto mudou depois do freeze R790. Geradores docs/arch passaram; próximo passo: controles de integração, checkpoint e push normais, PR draft empilhado sobre a fábrica, revisão formal atual e crítica independente pós-bot.

R793 publicou normalmente F2 e fábrica, com hooks e sem force: heads e1e357445cfb0e9dcefb544e76e35bbc8c3b283b e a4bb086b26d8b64e7a8ac70a10a7ce6e830f4e67, conferidos no remoto. A consolidação das quatro primeiras camadas está no PR #1208, fa521531b976faaee6c007660c5cfb1fd2a504ae → staging; CI e formal atuais ainda pendentes. #1207 só deve ser redirecionado a staging depois dessa consolidação, sem merge em branch de pai fechado.

Em paralelo, o instrumento útil de #1170 receberá correção de protocolo e ownership numa lane nova; isso não altera esta implementação ou aprova arte da pistola. #1160 está sob triagem de compatibilidade e handoff do outro run, preservando seu protótipo privado. A missão integral segue ativa.

## Diagnóstico do boot R834/R838

#1210 recebeu review formal no head ac11c0d. A tese de que o corpo antes
interrompia o boot é refutada pela barreira tolerante já existente. A diferença
menor de diagnóstico N1 foi aceita: allSettled ocultava rejeições inesperadas do
logger externo. A chamada GLM5.3 R834 propôs o reparo e a instrumentação; Root
aplicou a versão normalizada que encadeia o logger no próprio bodyPreloads.
Não se promove esse trabalho a revisão independente.

Régua primeiro: C6 RED apenas, com barreira/nascimento/duas luvas corretos e
diag vazio (R838 BEFORE, 6,272s). Após o produto: nominal GREEN (6,491s);
boot-diag-silent detectado só por C6 (12,462s). O failfast antigo deu INFRA
porque Promise.all entrega valores sem envelope de settled; esse resultado foi
rejeitado sem crédito de detecção e está preservado. Root ajustou somente o
mutante para conservar envelopes de sucesso e alterar a ordem de rejeição.
FAILFAST-V2: nominal GREEN e mutante detectado exatamente por C6 (13,560s).
Nenhum predicado anterior de C6 foi removido ou enfraquecido. O alias público
passou a incluir boot-diag-silent. O produto só acrescenta diagnóstico preservando
allSettled, reasons e o encadeamento do handle; game/glbchars e assets não mudaram.

Prefixos externos TP-GLOVE-OBSERVABILITY-GLM-R834 e
TP-GLOVE-OBSERVABILITY-R838. O freeze de main R790 foi sucedido por este reparo
observado; os recibos históricos continuam vinculados aos seus próprios bytes.
Próximo: gates normais/push sem bypass, review do novo head, resposta ao fio e
crítico whole pós-bot. Game3:2, contato/material/motion/mobile/MP seguem abertos.


## Composição local R928

A worktree isolada `s4-retry-integration-r928-20261101`, branch
`codex/s4-retry-integration-r928-20261101`, parte de
`b3cf08314fc60cae97202c780cc9e1f31f062222` e mescla normalmente staging
`00808bb494ccca055593740947fa5a7240772a33`, que recebeu #1208. W770 continua
intocada. Os conflitos de Game, loader, main e package foram resolvidos por
unidade, preservando S4 e a origem efetiva do corpo. Game e loader são literais
do candidato privado S4 validado em R864. Main conserva também a telemetria de
arena recebida de staging, a barreira N1 e o coletor BOOT R854.

A rejeição tipada do manifesto fica fora do catch que negativa pacote/GLB. A
requisição compartilhada sai do mapa em finally; demanda usa origem efetiva e
estilo, token por objeto e a recuperação automática única definida por Root.
Off/on, estilo ou origem rearma; a segunda falha da mesma demanda suprime I/O
por frame. O catch opcional do preview permite construir sem luva quando o
manifesto falha; demais erros continuam no tratamento anterior. Não há timer,
teto visual novo ou fallback entre origens.

O baseline b3cf, medido em cópia externa dos três módulos, ficou RED em 16 das
19 cláusulas, sem INFRA. A composição passou o nominal completo do manifesto,
os aliases integrais de identidade (incluindo C6/N1 e manifesto), origem S4,
origem cosmética, fábrica Drip, preload e publicação por conteúdo. Os testes
CPU de preview/BOOT passaram 163/163. Os mutantes conservaram seus failsets;
nenhum instrumento ou limiar foi alterado. Docs e índice passaram seus checks.
Os bytes de produto permaneceram estáveis durante as medições.

Todos os aliases e os argumentos dos portões dos pais foram conservados. A
dívida de batch/aliases de #1211 permanece literal de staging; a correção de
Root virá pela composição posterior de Hands. Os checkpoints posteriores de
Hands e grafite não foram mesclados aqui. Os ancestrais #1211/#1212 de 00808
continuam presentes por construção do merge normal.

Autoria: Codex compôs e mediu; uma consulta GLM5.3 de autoria, limitada a 600
tokens, retornou 119 palavras, sem ferramentas/retry. Native conferiu as decisões.
Isso não é crítico independente pós-bot. Relatório, diffs completos, fontes e
recibos selados: `audits/2026-10-31-visual-consistency/S4-RETRY-INTEGRATION-R928-*`
na raiz agregadora. O probe adicional do trecho real de preview usa fronteiras
simuladas; não substitui DOM/WebGL real.

Próximo: Root lê e adota por fast-forward em W770, depois conduz os gates e push
normais, review formal do head publicado e crítico independente após bot limpo.
Browser/Game 3:2, material/contato/motion, mobile, MP humano, CI desta composição
e release seguem sem medição nesta lease. A missão integral e a exclusão de
#1158 permanecem; UI/social seguem para depois.


## Composição S4 + Hands R951

A worktree própria `s4-hands-composition-r951-20261101`, branch com prefixo
`codex/`, parte de `5c458fa6817bfef7ca62587d49b32b31b86a64fb` e recebe por merge
normal Hands `fc94596e3a80cf9c7d7ee4461382b5ac5f56f62c`. Merge automático, sem
conflitos. Os dez caminhos de Hands foram importados; fora do package são
literais do pai Hands. O package une os aliases sem chaves duplicadas e conserva
os argumentos dos portões. Todo public/, inclusive os três JS de S4, permanece
byte-exato ao pai 5c458fa. Não há Java nem reparo de pistola nesta composição.

Node22: 19 focais de mãos PASS; controlador privado GREEN em 10,383s com sete
corridas e failsets exatos; catálogo estrito GREEN em 1,540s, 26 armas/40 rotas,
1.037 cláusulas, zero NÃO MEDIDA e zero vermelho novo. A dívida nomeada
RIG:pistol@pintura/f468adc9279d continua. Luva-crua conserva 48 RED, incluindo
12 MÃO4. A fonte privada foi somente generated no caminho autorizado, em
leitura, sem copiar/montar/exportar GLBs; default AWP/SVD não foi usado.

Grafite nominal PASS, mutante RED somente authored-batch-permission nos quatro
lotes e alias PASS. População estrita e corpo legado foram recebidos literalmente.
Manifesto nominal e origem S4 nominal GREEN; o alias de identidade completo não
foi repetido porque seu código, alias e todo runtime permanecem iguais ao R928.
Docs/arch e diff checks PASS. Nenhum checker, failset ou limiar foi alterado.

Autoria de composição Codex; sem chamada GLM, por merge trivial. Não é crítica
independente, aprovação artística, CI atual ou release. W770/W821 permanecem de
Root. Evidências: A/S4-HANDS-COMPOSITION-R951-* na auditoria agregada. Próximo:
Root lê/rebinda e adota esta composição, depois coordena publicação normal e os
ciclos formal/whole no head publicado. Sem browser/headless/fullgate nesta lease;
Game3:2, contato/material/motion, MP e mobile continuam pendentes. A missão
integral, #1158 excluído, UI/social depois e owners preservados continuam.

RootR974: merge normalHands c2cff432 incorpora staging0a28/ambiênciaPiscina e
cabeçalhoMA1 corrigido, mantendo3unidadesJS S4 e aliases dospais. A laneS4
continua semJava nempatchdearma. MA1/soundscape/manifesto/docs/archPASS.
JavafinalherdaráesteHEADpara manterancestry daPR1210. Gatesnormais e reviews
atuaissobRootseguempendentes; nenhumaceitearteGame/mobile/MP/release.

## Root R977 — ancestry F2 e Factory atuais

Composição normal de S4 845644c2 com Factory c5f68ba9, que contém F2 b2d252e6
e staging0a/#1137. A resolução única de package/check:fast conserva o superset
S4 e o arquivo final é idêntico ao pai S4: nenhum alias, token ou chave mudou.
Todo public/ permanece byte a byte S4 845644, inclusive main/Game/glbchars,
authoredvm e weapons; os únicos imports são as continuações Factory/F2.
Não se repetem 170s/90s de identity/origin por ancestry/documentação sem mudança
de bytes. Focais R974 de manifesto/soundscape e R975 Drip nominal permanecem
atribuídos aos respectivos heads; só Java final composto terá fullgate normal.

Root leu relatório completo R975 e resolução package/ledger e reconferiu
200pins sem drift antes do FF de #1209. Não é crítico whole independente novo.
Documentação, arquitetura e diff verificados nesta composição; sem Java/timing/
skin novo, asset write, publicação ou aprovação Game3:2/mobile/MP.
Missão integral mapas/personagens/skins/motion/ADS e release/backend continua
ativa, Flavio1158 excluído e UI/social depois. Próximo: Java herdar este merge;
publicar pilha via push normal e obter CI/formal/whole pós-bot atuais por PR.
