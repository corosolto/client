# AK: origem física do clarão e traçante

Objetivo: corrigir a origem física da AK golden, preservando a linha de mira e
o enquadramento. Esta é uma parte da missão de consistência visual, integração
dos PRs e release; personagens, mapas, skins e movimento continuam em andamento.
Flávio/#1158 fica excluído. UI e redes sociais vêm depois. Outros owners e assets
privados são preservados; não há geração ou compra nova de assets.

Base: `b808e1456db974bb8552ad86cfb804e96f7787bb`, mesmo product tree da main
`59580703c606a3489bea691b3bb4f609bb062131`. Branch
`codex/ak-physical-muzzle-r111-20261101`.

O diagnóstico normal no Ego (R106/R107/R110) encontrou 13 tiros ADS reais, sete a
~5,7m e seis a ~27,4m. O endpoint coincide com o impacto; a origem física usava
uma média de 58 vértices próximos da frente. Ela ficava atrás e acima da face
do cano. A distância ao centro dos bounds da face era ~4,000186 CSS px nas
matrizes capturadas. O valor anterior de 3,92451 px usava outro referencial,
o centroide de 14 vértices com duplicatas; os dois registros são preservados.

O ponto novo é o centro dos bounds dessa face, no espaço `Rifle_metarig`,
medido no GLB SHA256
`4094c0534f081ac96f1d6401d651c942b2b8d39dc777be30b15875706be0c48d`.
Não é um ajuste por pixels nem uma afirmação sobre um furo circular.
`attachGoldenBarrel` instala um filho desse osso apenas no rig/revisão conhecidos;
o consumidor existente prioriza `sockets.boca`. A configuração e os sockets de
ADS continuam separados. Uma nova revisão exige nova calibração. A origem dos
efeitos muda deliberadamente; a aprovação histórica do enquadramento não é
aprovação visual dos novos efeitos.

Validação R115: contrato de montagem e consumidor reais, dez verificações e
quatro mutantes detectados; repetição com geometria do GLB real, incluindo
Idle/Shoot/Reload/Equip, erro máximo de coordenadas zero. A versão de CI usa
fixture e é explícita sobre esse escopo. `--asset=...` carrega a geometria real;
texturas são substituídas somente nessa ferramenta CPU, sem aceite de imagem.
AUD1D usa a aceitação de subprocesso existente, que reprova exit não zero.

Evidência externa de projeto:
`audits/2026-10-31-visual-consistency/AK-PHYSICAL-{FIXTURE,ACTUAL}-CHECK-R115.json`,
`AK-RO-R106-GLM-BORE-R110/PROPOSTA-NATIVE.md` e os recibos R106/R107/R110.
GLM5.3 propôs a abordagem; a aplicação literal foi rejeitada por caminhos de
configuração e espaços de coordenadas incorretos. O patch foi feito pelo owner
da arma. A primeira tentativa CPU R114 falhou por ausência de Image no arnês;
R114B/R115 corrigiram o arnês, sem tratar essa falha como defeito do jogo.

O crítico independente R116 cobriu os sete arquivos e os consumidores, com
resultado CLEAN_SCOPED. Os cinco checks focais passaram. No Ego, R122 vinculou
os cinco módulos carregados ao disco e R123 comprou a AK pela loja normal,
capturando o corpo completo do GLB e o mesmo SHA256 acima.

R124 registrou cinco tiros em ADS completo a 5,58m. Os endpoints coincidem com
os impactos. Dois flashes e três sockets foram mensuráveis na mesma atualização
da face física, com diferença máxima de 1,14e-13 CSS px. As outras observações
dessas duas medidas são UNKNOWN. A captura usou SP normal, toque emulado,
qualidade low e buffer adaptativo 660×440 em viewport 1320×880.

R125C verificou tiro de quadril, clip Reload e reposição de 29 para 30 balas,
troca para faca e retorno com clip Equip. R126 saiu pelo menu normal e restaurou
exatamente as seis preferências locais pertencentes à tarefa. As falhas anteriores
R125A/B foram do instrumento e ficam preservadas. Recibos e PNGs estão na mesma
auditoria externa de projeto, pelos prefixos R122 a R126.

O primeiro push normal R121 terminou exit1 após 679s: CM1 recusou um comentário
de três linhas. `2ca4eff2` encurtou o comentário para duas linhas, mantendo o
corpo do helper. O push normal R136 passou com hooks ativos em 689,969s. O PR
#1194 foi aberto e o bot o reencaminhou para staging. GLM R144 e crítico Native
R150 revisaram o diff inteiro e fronteiras sem novo defeito de produto. Dois
apontamentos do bot sobre imports/const duplicada foram refutados com o auditor
real: dez checks e quatro mutantes detectados em R160. Respostas e resolução dos
dois fios estão em R163; o review formal negativo permanece registrado.

O CI encontrou P1 real: os placares de imagem usavam o fingerprint antigo
`461f62f4a4861d8b`. A única entrada alterada é `ak.bocaGolden` em vmconfig;
as outras seis entradas são byteiguais, e retirar exatamente essas quatro linhas
recompõe todo vmconfig da base. A chamada nova retorna antes de qualquer mutação
para outras armas. Isso sustenta conservar as outras 25 linhas, sem afirmá-las
remedidas. Os dois JSONs marcam explicitamente `parcial`, armas=['ak'] e a data
de origem das linhas retidas, 2026-10-31. Limiares, referências aprovadas, dívidas,
aceites e função de fingerprint não foram alterados.

R169 remediu AK nas cinco réguas, em 3:2 (1440×960) e 16:9 (1440×810), no Ego
55/p1. O transporte foi extraído do palco existente: corpos de coleta, juízes e
limiares são byteiguais; não houve outro navegador. Os sete módulos realmente
carregados foram vinculados aos bytes de `2ca4eff2`, embora o header do servidor
ainda declare `c0a4bfd5` (a diferença é comentário/documentação). O GLB observado
é a revisão 4094c0534f, 2.001.872 bytes; mesh de 4.869 vértices e socket novo
foram verificados no runtime. GPU observada: ANGLE Metal/Apple M4 Pro; não foi
presumida equivalência de raster com o SwiftShader do launcher anterior.

Mira, cobertura, mãos e carregador ficaram VERDE nos dois aspectos; pistola-ref
é N/A para AK. A massa da mira está a 4 px da cruz; ADS cobre 14,2% em 3:2 e
11,7% em 16:9, dentro dos tetos existentes. Root olhou os quatro PNGs normais:
arma no quadril e ADS central legíveis, mão de apoio presente. Isso não aprova
globalmente skins, personagens, mapas ou todos os quadros de animação.

Recibos e PNGs originais: auditoria externa de projeto,
`VM-EGO-REMEASURE-R158-ROOT-{3x2,16x9}-R169/`; proveniência dos corpos/input em
`VM-EGO-REMEASURE-R158-BUNDLE-PINS.json`; fusão parcial e hashes em
`AK-PLACAR-PARTIAL-ADJUDICATION-R172.json`. As primeiras tentativas R167/R168
falharam no transporte/identidade do instrumento e não promovem placar. R169
concluiu 40 máscaras por aspecto; seus handles e preload foram removidos e a
navegação descartou todo o diagnóstico. R171 confirmou menu normal sem jogo e
restauração exata das seis preferências locais da tarefa.

O checkpoint `a56efb57` teve push normal R185 com hooks ativos. GLM R173 e Native
R178 cobriram o diff inteiro. O review formal corrente foi publicado e adjudicado
em R230, sem retirar reviews. O CI desse head reprovou o passo de todas as armas:
mobile 25/26, apenas P90 com zero mãos e traçante a 130,91px do socket; AK passou.
Desktop e os mutantes seguintes do alias não rodaram. O log não contém arma
atual, hp/alive ou imagem da P90, portanto sua causa histórica continua UNKNOWN.

R248 reproduziu um defeito do instrumento no Ego: P90 ativa, três mãos e diferença
de 7,52e-13px; após `_kill` real e respawn natural na mesma rodada, pistola ativa,
P90 cacheada oculta, zero mãos e diferença de 132,20px. Não houve alteração de
hp, relógio ou bots nesse controle. A aquisição foi diagnóstica, não compra normal.
Isso não prova retroativamente a causa daquela execução de CI nem pede ajuste
do frame da P90. R250 vinculou cinco fontes HTTP ao disco, sem divergência.

O checker agora ancora o Game do boot e verifica estado, vida finita, câmera,
arma e rodada após as esperas, antes do oráculo. Não reescreve alive/hp por arma.
Permite uma única tentativa extra somente após morte nova documentada, alvo já
confirmado, mesmo Game e mesma rodada. Outros inputs inválidos fecham o navegador
com exit3 antes de classificar qualquer mutante. Binding, visibilidade e origem
continuam asserções semânticas, sem espera ou retry para obter verde. A faca tem
binding próprio; o controle de mão oculta exige pais visíveis, para não aceitar
um mount ou ancestral oculto como se tivesse detectado a mutação dos meshes.
O denominador publicado e o teto de 1px permanecem.

GLM R247 propôs separar input e semântica; o diff literal foi rejeitado por quebrar
a faca e deixar lacunas no classificador. Native R255 encontrou dois defeitos no
primeiro candidato: rodada recapturada na tentativa extra e crédito por ancestral
oculto. Ambos foram corrigidos e relidos no ponto SHA256 `c637692781123dd3fa0620c67acec6623083bc9f3af6f23f280764d0a96639c1`.

R258 executou o callback e o veredito exatos desse checker no Ego mobile: 26/26,
sem tentativa inválida. R259 executou dez controles, incluindo baseline antigo,
morte/respawn com recuperação limitada, duas mortes com exit3, rodada divergente,
switch no-op, identidade de Game divergente, mãos ocultas, mount/ancestral ocultos
sem crédito indevido e origem lateral. Todos passaram; métodos, visibilidade,
timeLeft e handles próprios foram restaurados. O lateral foi injetado no consumidor
da origem; isso não é execução do mutante canônico por interceptação de módulo.
Os testes usam equipagem e timeLeft infinito de fixture, sem aceite de aquisição
normal, HUD ou arte. PNGs e recibos estão nos prefixos `VM-SAMPLER-R258`,
`VM-SAMPLER-EGO-R258` e `VM-INPUT-CONTROLS-R259` da auditoria externa.

R265 repetiu o callback e o veredito exatos no desktop 1440×960 (3:2): 26/26,
sem tentativa inválida, Game normal, mobile=false, fixture e handles restaurados.
Root olhou AK e pistola: ambas aparecem com as mãos; os PNGs ainda mostram o HUD
Infinity:NaN produzido pelo timeLeft de fixture. Não há aceite de arte ou input
normal nessas capturas. A frase `Not normal acquisition/desktop 3:2` do recibo
foi copiada do teste anterior; setup e PNGs documentam o desktop 3:2 realizado.
O adendo externo R267 preserva o recibo original e registra essa correção factual.

Próximo passo: crítica completa do ponto atualizado, checkpoint assinado e push
normal com hooks; depois CI e review no head novo.
Boot seletivo frio, MP e os cinco mutantes canônicos continuam obrigações do alias,
sem antecipar resultado pelo controle local. Merge/release, mobile físico e aceite
artístico global permanecem pendentes. O bypass de #1188 permanece registrado;
esta lane não autoriza repeti-lo, alterar regras ou retirar reviews.
