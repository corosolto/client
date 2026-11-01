# Pacote completo de luva em terceira pessoa

Continuação da missão de consistência visual, mapas, personagens, skins e movimento,
integração dos PRs e release. UI/redes sociais depois, Flávio/#1158 excluído.
Root é o único escritor de arma/mão/animação/ADS/HUD e navegador. Nenhuma geração,
compra ou alteração dos assets. As demais worktrees e owners são preservados.

Base b09eb85ce1456978790f6dff6fad84cd633d1c7a, branch
`codex/tp-glove-parts-r325-20261101`, stack após a correção de forwards TP.
O pacote anterior foi revisado inteiro por GLM R312 e crítico independente R313;
checkpoint DCO/Agent Codex, push normal R322 com hooks ainda em curso.

R292 mostrou verde na mão baixa e palma da pistola com pele. R307 parseou o GLB
publicado Barbudo (90536 bytes, SHA256
9cc086275dc61eb07b6eeb8eb4b2a78292fbb79a950b1c4338a8e9bb14a72dc3): dois
primitivos, esquerda 384/direita 379 triângulos, pesos LeftHand/RightHand respectivos.
O carregador guardava só a primeira SkinnedMesh. Refutada a necessidade de gerar
outra luva para este sintoma; o arquivo já contém ambas as mãos.

R326 estendeu a régua antes do conserto. Game, GLTFLoader e GLBs reais em CPU:
sete fixtures/19 cláusulas, baseline RED em O1/O4/C4. O1 mostra uma geometria anexada
das duas publicadas; C4 mostra a mesma omissão no nascimento frio. O4 isola uma
incompatibilidade somente na segunda parte, com Skeleton e osso clonados para não
contaminar a primeira, que permanece válida. O código antigo anexa a primeira e
ignora a segunda incompatível. glbchars permaneceu byteexato à base no baseline.

A correção conserva todas as SkinnedMeshes do pacote. Antes de criar/anexar qualquer
parte, resolve todos os ossos de todas as partes no corpo clonado e recusa o pacote
inteiro se faltar um nome. Cada parte mantém sua geometria, boneInverses, bindMatrix,
bindMode, estilo/material existente e nome luvas-3p; só passa a incluir a parte antes
perdida. hasGloveModel mantém o contrato booleano. Rig, pose e Game/main não mudam.

R327 nominal GREEN nas sete fixtures; duas geometrias, uma vez cada, mesmo corpo e
ossos por identidade. R328 executou os dois mutantes reais com nominal antes:
cache limitado à primeira parte produz O1/O4/C4; anexação parcial apesar da segunda
incompatível produz O4. Ambos DETECTED, 14 fixtures cada. Cópias de glbchars e Game
usam o mesmo URL/cache; temporários únicos são removidos no finally. Hashes de Game,
main e glbchars entram no recibo e são conferidos ao final, sem editar o produto para
mutar. R326/R327/R328 estão na auditoria externa 2026-10-31-visual-consistency.

R330 passou no alias ampliado: nominal e seis mutantes, conservando os quatro
failsets antigos. R333 passou nos dez focais em 34,74s, incluindo sintaxe,
skin-profile-flow, ownership TP, contrato TP de mundo, cache por conteúdo,
arquitetura/documentos, mutantes anunciados, comentários e build. R335 repetiu os
oito controles do parser pai atual; RED preservado e protocolo/infra recusados.
Isso é prova do parser extraído, separada das execuções reais Game/GLB.

A proposta GLM R324 confirmou o desenho mínimo, mas foi adjudicada: seu failset
first-part omitia O4, C4 por contagem era insuficiente e o osso inválido artificial
foi rejeitado. Aqui se medem geometrias exatas e um Bone real clonado. R324 é uma
proposta UNRUN, não aprovação do patch. Revisão inteira do resultado é posterior.

Ego R342 usou seleção explícita da luva no Game nascido pela UI normal de convidado,
Barbudo/pistola/câmera terceira pessoa, vivo e sem pausa, viewport 1440×960 (3:2).
Duas partes 384/379 vinculadas aos ossos vivos e mesmo parent foram medidas. Root
olhou a imagem sem overlay de pausa: a palma da pistola agora é verde, e a mão baixa
também. Os dedos são grosseiros e a pistola continua com pega fraca sobre a palma;
acabamento/fit/pose continuam dívida, sem aceite artístico. R341 conferiu os três
módulos HTTP com a fonte local; R342 usa o mesmo URL real do import map.

R338 é fixture inválida preservada: trocar faca/pistola síncrono sem ensure entre
elas não reconstruía o corpo; zero luvas não prova falha do produto. Sua imagem
reteve pausa. R340 mediu duas partes, mas não gerou imagem porque esperava display
none; o overlay real mantém display flex e usa visibility hidden/opacity zero.
R342 corrigiu a condição e os dois ensures. Seleção/arma/handle foram restaurados
no mesmo Game. R344 saiu pelo menu e restaurou as seis preferências exatamente,
limpou emulação e deixou a página em branco; nenhum handle próprio permanece.

Não foi exercitada compra/equipagem de inventário, persistência, troca dinâmica de
luva no mesmo Game, boot pela UI com inventário, MP ou mobile físico. Próximo passo:
revisão inteira GLM e crítico independente no ponto congelado, checkpoint seletivo
e push/PR normal na stack. Imagem/objeto não fecham dedos, pega ou pose.

Release134/main e staging contendo #1195/#1196 são estados separados. #1194 segue
aguardando CI; backend sem convergência afirmada. A missão integral e as 21 dívidas
do check:fast anterior permanecem abertas; esta frente não declara aceite artístico.
