# Arma e luva no corpo de terceira pessoa

Parte da missão de consistência visual, integração dos PRs e release. Mantém o
norte do PDF, roadmap e métrica da lane visual; mapas, acabamento de personagens,
skins e movimento continuam no objetivo. Flávio/#1158 excluído; UI e redes sociais
depois. Nenhuma compra ou geração nova de assets. Root é o único escritor deste
sistema de arma/mão/animação/ADS/HUD e do navegador.

Base `973cb25e6c6b2fd96d4f10f95ddb7ec425d0959d`, branch
`codex/tp-weapon-glove-r272-20261101`, stack sobre #1194 até sua integração.
Worktree novo com npm ci normal e sem alterações herdadas. O push normal da base
passou com hooks ativos em R271 (682,836s); staging já contém #1195/#1196, produção permanece release134.

R249 propôs três chamadas existentes: encaminhar a arma do bot reequilibrado,
encaminhar a luva própria ao builder TP e aguardar seu preload no boot. Não mudar
pose, rig, cache, geometria ou cosméticos de bots/remotos. A luva selecionada no
início é o escopo; não promete equipamento dinâmico no mesmo Game.

Baseline R276 usou Game e GLTFLoader reais, nove GLBs parseados, texturas CPU1×1.
Depois da troca de lado, bot de pistola ou MP5 conserva a arma lógica/cache, mas
recebe modelo AWP; pistola ainda recebe porte de duas mãos. O controle AWP passa.
Corpo próprio Barbudo GLB, com luvas-brasil equipada e pacote já pronto, não recebe
a malha luvas-3p. O builder direto com os mesmos assets a anexa, controle positivo.
R276 ficou RED nesses três casos antes de alterar o produto. Não mede raster,
persistência/UI da loja ou aceite artístico. R275 foi infra de plugin de textura,
exit13 antes do Game, preservado e não contado como RED de produto.

Artefatos externos: auditoria `2026-10-31-visual-consistency`, prefixos
`ROOT-TP-BASELINE-R275`, `ROOT-TP-BASELINE-R276` e `TP-BASELINE-R276`.

R277 repetiu o mesmo probe após os dois forwards do Game: os quatro casos passam,
com nove GLBs reais, armas/porte corretos e uma luva própria anexada. O alias inteiro
skin-profile-flow também passou com a ponte mínima F3/F4, incluindo suas mutações.
Esses resultados não medem boot frio. A linha de preload foi tentada no mesmo patch,
mas retirada antes de aceitar esse sítio: permanece pendente de baseline frio RED.

R279 tentou a prova fria, mas usou o namespace errado para aguardarPreloads.
A exceção foi engolida pelo catch real: resultado invalidado, sem crédito RED.
R280 importou a função real e reproduziu o bloco real de preload e nascimento.
Sem a entrada da luva, o corpo GLB já pronto nasce sem ela. O latch segura o parse
do pacote real antes do cache, sem usar tempo decorrido como prova. Após reaplicar
a entrada, passam nominal, outra carga rejeitada, sem luva e navOnly. Remover a
entrada ou o await produz os failsets causais esperados. A suíte externa R280
preserva os seis resultados e os arquivos originais; texturas CPU1×1, não raster.

O rascunho GLM R273 foi rejeitado antes da adoção: o agregador descartava os RED
dos filhos; também faltavam controles causais. Não foi executado nem integrado.

A régua durável tp-identity-check passou no nominal R288 e nos quatro mutantes
R289 com failsets exatos. O alias inteiro R291 passou; fresh workers, parse dos
GLBs reais, protocolo estruturado com exits coerentes. R286 falhou por serializar
userData circular na evidência; classificado infra3 pelo pai, corrigido sem mudar
predicado nem produto. O focal R293 passou8/8 em20,1s: sintaxe, switchteam,
skin-profile-flow, shaderbudget, arch/docs, mutantes anunciados e comentários.
O check:fast completo não foi repetido: resultado anterior295/316 com21 dívidas
continua aberto; não é aprovação desta lane inteira ou do release.

Ego normal R287/R290 usou câmera pública nas configurações e mostrou Barbudo GLB
com pistola correta, sem luva equipada. R287 PNG ainda mostra overlay de pausa;
R290 aguardou o fechamento e dois frames, imagem sem overlay inspecionada.
R292 usou uma fixture explícita da luva no Game normal, sem loja/persistência:
uma malha anexada aos ossos do corpo por identidade, viewport1440×960 (3:2).
Arma, seleção e handle foram restaurados. Root olhou o PNG: há verde na mão baixa,
mas a palma da pistola segue com pele e a leitura dos dedos/pega é fraca.
Não há aceite de arte, cobertura das duas mãos ou compra/equipagem real. Essa
qualidade do asset e da pose continua dívida separada; anexação não é acabamento.

R296 GLM e R297 crítico cobriram o diff inteiro dos 11 arquivos e fronteiras. R297
achou entrada pública desviada para worker por ambiente herdado: R306 reproduziu
alias exit0 com cinco C5b, sem nenhum mutante. R302 também mediu nome constructor
aceito por propriedade herdada, resultando em infra3 no lugar de CLI inválida2.
R309 exige marcador interno explícito, ambiente completo e nenhuma opção pública
nesse modo; membership usa propriedades próprias. Nenhum predicado foi afrouxado.

R307 parseou o pacote real da luva: duas malhas, esquerda384 e direita379 triângulos,
com pesos nos respectivos ossos. O preload legado escolhe só a primeira. Isso
explica a palma sem luva vista em R292 e pede uma correção seguinte na stack;
aqui não se declara cobertura das duas mãos nem aceite dessa dívida.
R294 saiu pelo menu normal, restaurou exatamente seis preferências e removeu
handles/emulação. R299 build recusou corretamente o preview privado; após cleanup
normal, R300 build passou em6,17s. R298 validou oito controles do parser extraído,
incluindo RED preservado e recibos/exits inválidos recusados; não é nova prova GLB.

R309 repetiu o alias inteiro: nominal e quatro mutantes passam. R310 recusou13
entradas inválidas com exit2 e zero recibos parciais; o alias com ambiente herdado
agora sai2, antes de medir. Os oito controles do parser extraído também passam.
Produto e GLBs não mudaram nesses reparos de entrada do instrumento.

#1194 entrou por merge normal em staging; #1197 foi retargetado para staging.
#1198 é a correção das duas partes, empilhada depois. O bot de #1197 alegou runner
fail-fast; R370 executou mapid RED seguido de identidade GREEN, conservando o
agregado vermelho. O fio foi refutado e resolvido, sem afrouxar o portão.

O CI de #1197 também encontrou uma fixture do bloco real de preload sem o novo
binding playerGloveId. R391 reproduziu quatro falhas locais por ReferenceError;
a fixture passou a declarar explicitamente null, como o cenário sem luva que já
exercita. Produto e predicados de fauna permanecem iguais. R376 revisara o ponto
anterior inteiro; o CI posterior impede usar aquele parecer como aprovação deste
reparo. Próximo passo: validar a fixture corrigida, revisar todo o novo ponto,
checkpoint seletivo, push normal e CI atual. Release, boot pela UI com inventário
equipado, MP, mobile físico e aceite visual globais continuam pendentes.

R392/R399 validaram a fixture e o alias de fauna; R400 publicou e82019b pelos hooks
normais. O review formal 5728477024 no head atual não trouxe achados, mas a decisão
agregada do GitHub ainda conserva o CHANGES_REQUESTED histórico. O fio segue
resolvido; isso não foi descrito como decisão agregada limpa.

R586 Native pós-bot cobriu os doze deltas e encontrou P3 de I/O fora do classificador
INFRA. R587 GLM inteiro terminou; seu P2 sobre desligar luvas com skin3p=0 foi
refutado pelo contrato de pintura de arma/faca. A leitura do operador encontrou
SC5 nominal incompatível com o argumento adicional de luva. Root leu os pareceres
integrais e reconferiu os pins em R608; nenhum patch especulativo de produto.

R607 reproduziu os três erros de I/O com exit1 e sem resumo INFRA: fonte inicial
ausente no pai/worker e destino JSON apontando para diretório. Também reproduziu
SC5 RED no checker real. A mesma saída também tinha SC6 RED: sua regex ignorava
knifeContext, já presente em weapon-skins desde a base973. É dívida anterior,
identificada ao validar SC5; não foi atribuída ao GLM nem ao forward de luva.
O reparo corrente protege leitura inicial e gravação de recibo e aceita esses
argumentos adicionais explícitos, conservando weaponSkinId, o kill-switch e a
guarda marcas. Produto, predicados e failsets TP não mudaram.
R609 confirmou os três erros de I/O como INFRA/exit3 e escrita JSON válida, mas
seu controlador parou numa âncora ampla antes dos controles SC5. R611 mostrou
SC6 RED anterior, sem crédito de aprovação. R612 passou dezesseis resultados:
os quatro controles de I/O, sete casos SC5/SC6, dois mutantes legados de cobertura
e os aliases públicos de cobertura/identidade mais docs:check. Retirar a entrega
ou o kill-switch dá somente SC5 RED; retirar guarda/default de marcas dá somente
SC6 RED. As chamadas anteriores permanecem aceitas. TP conserva nominal e quatro
mutantes exatos; não houve mudança em produto, assets ou predicados TP.

Próximo: checkpoint DCO/Agent, crítica integral dos treze caminhos e fronteiras
atuais, push normal e novo review formal no head. R607/R608/R612 ficam na auditoria
externa. Não são provas novas de raster, loja, animação, mobile ou multiplayer.
