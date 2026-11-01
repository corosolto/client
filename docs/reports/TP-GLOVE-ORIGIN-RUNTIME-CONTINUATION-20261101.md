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
