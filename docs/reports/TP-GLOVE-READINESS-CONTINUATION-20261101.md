# Luva TP após trocar de personagem: continuidade

## Objetivo e definição de pronto

Conservar a luva selecionada no corpo próprio quando o pacote termina depois
da troca de personagem, sem interromper animação ou expor partes pela máscara
da câmera. A camada exige regressão causal, mutantes, caminho normal no jogo,
crítica integral do diff e fronteiras, checkpoint e publicação normal.
Inventário, persistência, arte, mobile físico e multiplayer têm provas próprias.

Worktree `tp-glove-readiness-r515-20261101`, branch
`codex/tp-glove-readiness-r515-20261101`, base
`72ead91a93214152c680cbb0a37dccf196fbe0a1` (PR #1201).
Estado deste checkpoint: implementação e críticas locais concluídas; CI e revisão
formal do PR continuam posteriores. Não há aprovação integral do jogo.

A missão completa permanece: integrar PRs elegíveis, acompanhar release/backend
e melhorar mapas, personagens, skins, movimento e mira da AK conforme PDF e
roadmap. Flávio/#1158 está excluído; fluxos de UI e redes sociais vêm depois.
O ledger externo `audits/2026-10-31-visual-consistency/CURRENT-STATE-20261031.json`,
na raiz agregadora, conserva owners, PRs, commits e débitos das outras frentes.

## Causa e alteração corrente

R507 reproduziu com Game e GLTF reais: trocar para Capitão enquanto sua luva
carregava criava corpo sem as duas partes. Terminar a carga não mudava esse
corpo; trocar de arma reconstruía o modelo e fazia a luva aparecer.

`_ensurePlayerTP` observa seleção normalizada e prontidão. Com GLB base e seleção
válida, pede o pacote uma vez por personagem nesta partida. O próximo ensure
lê o estado atual, sem callback que capture seleção antiga. `preloadGloveAssets`
compartilha pedidos por personagem e conserva cache negativo e pacote completo.
Game descartado/dedicado não cria corpo próprio; cadáver adia mudança só de luva
até o retorno. Corpo procedural não demanda esse pacote antes do GLB base.

A primeira correção reconstruía o corpo. A crítica Native R535 encontrou perda
de emote, recarga, disparo e reação a dano. A versão corrente chama
`setGloveSkin` no corpo existente: substitui somente partes da luva e seus
materiais/esqueletos próprios. Conserva clone, ossos do corpo, controlador,
mixer, arma e estado. Atualiza `selfMeshes` e mantém invisíveis as partes novas
quando a máscara TP já está ativa. Geometria compartilhada fica no cache.
Os passes existentes de acabamento também são aplicados às partes novas.

## Milestones, rejeições e limites

Os artefatos abaixo ficam no diretório externo `audits/2026-10-31-visual-consistency`.

- R522: régua primeiro, produto byte exato à base. RED em S1, S4, S5, S7, S8,
  N1, N2 e T2; cláusulas antigas passaram. `SKIN-READINESS-BASELINE-R522.json`.
- R523-V1 rejeitado: pedia luva em navOnly antes do GLB. A guarda `hasModel`
  removeu essa demanda indevida. R524 passou nominal e onze mutantes na versão
  de reconstrução, agora superada.
- R529: focais iniciais passaram; alias integral TP interrompido em 240 s,
  sem crédito de aprovação. R533 passou morte/câmera, perfil de skin, identidade
  antiga, shader budget, docs, arquitetura e comentários. Seu alias TP foi
  interrompido por decisão do controlador após o achado R535, sem RED semântico
  nem aprovação integral. `SKIN-FOCALS-R533.json` registra a distinção.
- R531: Ego, Astro na rota `/`, Game normal offline, terceira pessoa. Perfil
  temporário aplicado só no Game; seletor e confirmação de Capitão pela UI.
  Pointer lock não foi adquirido, então foi usado `onRequestSwitch`, o hook
  existente do atalho M. Um pedido retido deixou o corpo sem luvas; liberar e
  atualizar fez aparecer as duas partes. Esse teste era da versão antiga que
  reconstruía o grupo. Não verifica a implementação corrente em lugar.
  `SKIN-EGO-R531.json`, `SKIN-EGO-CLEANUP-R531.json` e captura 3:2 preservados.
  Root inspecionou a captura, que tem pausa e dica de pointer lock sobrepostas;
  ela não aprova dedos, pega, fidelidade, UI de equipagem, mobile ou MP.
- R535 Native: REPAIR_REQUIRED. Achou os transientes e a fronteira condicional
  de corpo vindo só de cosmético. R536 GLM: CLEAN_SCOPED no snapshot antigo,
  mas deixou passar os transientes. Seu parecer não supera o achado Native.
- R541 tentou reproduzir os transientes. V1 a V3 foram INFRA porque a recarga
  real não foi ativada. V4 deu RED nos quatro estados; a fixture de recarga
  recebeu depois sincronização da arma antes de iniciar, eliminando esse
  confundidor. Não usar V4 como prova isolada definitiva da recarga.
- R545: nominal corrente GREEN, 39 cláusulas/11 processos frescos.
  R547: diagnóstico interno explícito de sete mutantes em switch-pending.
  `glove-rebuild` reintroduziu a reconstrução e reprovou S10 a S14, incluindo
  a recarga com arma já sincronizada. Máscara e descarte têm mutantes próprios.
  O diagnóstico não substitui o alias público completo. R548 passou esse alias
  em 135,964 s: nominal verde, 14 mutantes nos conjuntos exatos, 0 INFRA e
  fontes inalteradas. `SKIN-MOTION-MATRIX-R548.json` conserva o recibo.
- R554: doze focais passaram na versão em lugar, com os hashes atuais:
  geração/check de docs e arquitetura, sintaxe, switch de time, troca de
  personagem, mãos TP, perfil de skin com mutantes, morte/câmera, shader budget
  e comentários. `SKIN-INPLACE-FOCALS-R554.json` registra os comandos e saídas.
  Isso não é o alias integral de animação TP nem um full check:fast verde.
- R559: Ego, rota normal `/`, Game offline/testMode=false, pacote do Capitão
  retido durante a troca confirmada pela UI. O perfil temporário foi aplicado
  ao Game; `onRequestSwitch` abriu o seletor porque não havia pointer lock.
  O emote usou APIs reais e um update controlado em pausa. Liberar o pedido e
  sincronizar acrescentou as duas partes sem trocar corpo, controlador ou
  mixer, conservando o estado temporal. Após retomar, o RAF real avançou o
  emote de 0,3 para 0,7992 no mesmo controlador. As capturas inspecionadas têm
  overlay ou já mostram primeira pessoa após o fim do emote/dano; não são
  aceite artístico TP desobstruído, compra/equipagem, MP ou mobile físico.
  O recibo não traz uma nova lista de hashes HTTP dos módulos carregados.
  `SKIN-INPLACE-EGO-R559.json` e `SKIN-INPLACE-EGO-CLEANUP-R559.json` registram
  o experimento, a saída normal, preferências restauradas e Fetch desabilitado.
- R561: snapshot recuperável dos seis arquivos antes das críticas integrais;
  produto/checker e hashes dos recibos R548/R554 permaneceram iguais.
- R564 Native: releu os seis caminhos e fronteiras. Nenhum novo P0–P2 foi
  demonstrado; D1/P3 apontou a ausência dos milestones R554/R559/R561 e o
  próximo passo desatualizado neste ledger. A atualização documental corrente
  responde a D1, sem repetir os testes do produto. F2 continua aberta.
- R563 GLM: chamada única encerrada no limite de 178 s sem resposta final.
  É revisão incompleta/UNKNOWN, sem crédito de CLEAN ou aprovação integral.
  O novo ponto documental recebeu o parecer completo R575, sem converter R563
  em revisão concluída.
- R577 fechou D1 documental da crítica Native R564, com os cinco arquivos
  rastreados e as provas do produto preservados.
- R575 GLM: revisão integral concluída no snapshot R574, chamada única de
  68,088 s, stop normal, zero ferramentas/retry e seis caminhos recebidos.
  Nenhum P0–P2 introduzido. O P3 sobre material raw no builder inicial repete
  o padrão da base; não demonstrou retenção ou recurso GPU e não motivou patch.
  A enumeração do parecer chama main/netgame de sexto caminho, mas eles são
  fronteiras; o sexto alterado é este ledger, enviado integralmente. Root leu
  ANSWER e relatório completos e reconferiu os pins. F2 segue aberta.

## Fronteira cosmética ainda aberta

`hasModel` mede somente GLB base; o builder também aceita um modelo cosmético
aprovado. R551 reproduziu demanda própria com cosmético pronto e base ausente: Game e
GLTF reais em CPU, bolsonaro-drip ativo, vinte ensures e zero pedidos da luva
(K1 RED). É uma prova de demanda, sem inventário/UI nem encaixe físico.
R546 confirmou famílias distintas e juntas Curl com pesos no Drip; diferenças
entre matrizes serializadas não são, sozinhas, erro físico de encaixe. A fábrica
recusou a seleção automática ambígua de duas partes à esquerda e oito à direita.
O pedido e a elegibilidade do anexo precisam de correção própria: capturar a
origem do corpo efetivamente escolhido e recusar o pacote divergente tanto no
nascimento quanto no setter, preservando o cache base válido. R560 propôs um
patch GLM, rejeitado sem aplicar: omitia SHA no descriptor base e reconsultava
o cache cosmético em vez de capturar a origem do clone, entre outras falhas.
R573 conserva uma seleção candidata de faces inspecionada por Root para uma
variante Drip própria; nenhum asset foi exportado nem fit/animação aprovados.
A régua corrente cobre as famílias base e não declara esta fronteira corrigida.

## Próximo passo concreto

Criar checkpoint seletivo DCO/Agent e fazer push normal da stack sobre PR #1201,
preservando o produto validado e registrando esta atualização de continuidade.
Depois abrir o PR e obter CI e revisão formal no head. F2/R551 fica em uma
correção posterior, com provas próprias de disponibilidade e elegibilidade da
origem, seguida da variante cosmética quando validada. CI, review formal no head,
crítica após o bot, integração dos pais e release continuam gates posteriores.
Albedo e leitura artística, equivalência FP/TP e os demais mapas continuam abertos.
