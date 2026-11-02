# #1188 — recentro da cabeça

Objetivo: verificar o finding Estraga inline4432950826/thread PRRT_kwDOTbwe3M6yTxcg contra o CharController real, corrigir a causa comprovada e entregar checkpoint isolado ao integrador. Base21f264c519aac547148ea1bab3c5c64d847e8290, branch codex/head-yaw-1188-20261031. Não tocar game/authoredvm, assets, QA, impl, browser ou outras lanes. Sem push/resolução remota.

Estado inicial: claim de sinal contrário rejeitada provisoriamente por geometria (+Z corpo, yaw cabeça+θ => curYaw=-θ). Hipótese a medir: reaplicação da correção sobre pose estática não reescrita pelo mixer; clip com quaternion reescrito pode responder diferente. Régua antes da implementação, produção importada com export apenas de CharController no módulo temporário, Three vendorizado e AnimationMixer real. Também verificar limites/estados e proxy final.

GLM-5.3 OMP análise RO iniciada, max3min, prompt/log HEAD-YAW-GLM-R1 no audit externo. Regras AGENTS, bug-hunt/regua, quality-gates, LICOES e KNOWN-BUGS lidas; ARCH regenerado (modo PR preserva contagens e linhas antigas por design do gerador). Aplicada skill blender-motion-state-inspection para distinguir eixos/quaternions de impressão visual; nenhuma edição Blender/asset.

Próximo: capturar RED iterativo, decidir delta removido antes do mixer/reaplicado uma vez na pose final, validar mutantes, checkpoint e relatar limites de browser.

## Marco validado — 19:14UTC

- RED12/12 antes do produto; track constante+.5rad chegou+.6505 e cruzou o centro. AnimationMixer real pode não reescrever head quando o buffer não muda. Sinal do review original rejeitado por geometria e pelo mutante de sinal.
- Conserto remove delta local anterior antes do mixer, aplica1× na pose final antes do proxy, preserva ganho/teto/tempo/deadzone e libera cabeça no emote. Limpa memória fora do porte parado. Nenhum asset/game/authoredvm alterado.
- GLM R1 análise real entregue; confirmou sinal correto e regime estático, mas sua alegação sem oscilação e cache pós-mixer foram rejeitados pela reprodução/ordem. GLM R2 revisão RO confirmou conjugação/undo; A3 sinal rejeitado novamente pela medição. A1 transição e A2 respawn motivaram prova extra: revive sem frame intermediário foi RED24/24 (erro0,38rad no exemplo), corrigido com helper de undo antes da ativação de ações/emote/shoot/revive e reset antes de stopAllAction.
- Gate atual R4 GREEN24casos/28.800frames, maxerro8.37e-9rad, proxy0. Cobre tracks ausente/constante/animado/pausado, ancestral yaw/pitch/escala,30/60/120Hz, estados e revive vivo + die/revive sem update intermediário. Sete mutantes originais R2 detectados; versão com helper e oitavo mutante revive-pendente ainda será rodada.
- TP-WORLD nominal+6mutantes anterior passou. SB7 R1 foi78por ausência Astro; R2 com apenas Astro symlink foi1por dependências incompletas do config. Troca de dependências própria: node_modules shim local guardado em /private/tmp/coro-head-yaw-node-modules-20261031-1913; node_modules agora symlink somente leitura à QA, sem npmci nem mudanças em dependências compartilhadas. SB7 R3 em execução; não chamar de verde ainda.

Próximo: oito mutantes atuais, focais finais, GLM R3 sobre transições corrigidas, commit seletivo. Integração deve wire gate+mutantes no script eval:tp-world-contract já existente (package não editado para evitar disputa), passar browser Ego/critico final na lane do integrador. Sem push/resolução até lá.

## Focais finais da implementação

Oito mutantes atuais detectados com exit0/statusRED, relatório `HEAD-YAW-MUTANTS-R3-verdict.json`; nominal `HEAD-YAW-GREEN-R4.json` GREEN. `eval:shaderbudget` R3 exit0, SB1–SB7 verdes com dependências completas compartilhadas; R1/R2 são tentativas infra rejeitadas, não regressão do produto. ARCH regenerado/check verde, sintaxe e diff-check verdes. `eval:tp-world-contract` R2 ainda aguardando completion; não presumir resultado. GLM R3 revisão final focada em execução, sem browser.

TP-WORLD R2 completou exit0 (nominal e todos os mutantes previstos). Gate R5 acrescenta aimPitch variável e mantém GREEN24/28.800, max8.37e-9rad/proxy0; oito mutantes R4 detectados, exits0, em `HEAD-YAW-MUTANTS-R4-verdict.json`. CLI inválida sai2. Saída padrão limita exemplos vermelhos a dois casos, preservando failedCases e máximos; dados detalhados da rodada R4 ficam no audit. Pronto para checkpoint local; GLM R3 ainda em execução.

## Microcommit após GLM R3

Checkpoint produto anterior:5d0548a9a0f2c11d5bc9fa59110cdd9fda34674a, integrado pelo root na QA como6cc50. GLM R3 real terminou exit0, sem bloqueador; seus menores foram verificados, não aceitos só pelo rótulo.

- A1 confirmado em fallback sem clipe death: probe lê imediatamente após die, antes de update; RED1caso/29, erro0,406rad. Agora die chama undo diretamente. Outros probes isolam _to/shoot/emote/revive.
- A2 matriz do pai velha rejeitado: public/vendor/three.module.js:getWorldQuaternion chama updateWorldMatrix(true,false), atualizando ancestrais. Giro dinâmico com yaw/pitch/escala concorda ao oráculo em erro<1e-8rad.
- A3 comentário de mount corrigido para duas linhas, separando mão e cabeça final.
- Pontos cegos fechados: ponto fixo medido diretamente, dt0/hitch, troca untracked→animated e probes entre callsite/update com mutantes isolados. Mutante revive-sem-undo sobreviveu porque _to contém undo redundante; foi rejeitado como mutante equivalente e substituído por revive-sem-reset, que reprova24casos.
- NominalR7 GREEN33casos/31.500updates, max8,37e-9rad/proxy0. AutotesteR2 detecta13/13mutantes, exit0. Provas HEAD-YAW-DIE-RED-R1.json, HEAD-YAW-GREEN-R7.json, HEAD-YAW-AUTOTESTE-R2.log. Gate limita exemplos e distingue exit1/2/3.
- Wiring recomendado ao integrador: acrescentar `node tools/eval/head-yaw-check.mjs && node tools/eval/head-yaw-check.mjs --autoteste` ao eval:tp-world-contract, substituindo a lista manual nova dos oito mutantes. Package continua intocado nesta lane.
- Root relatou prova Ego QA do produto5d05:7personagens×600updates, poses finitas e proxies~7e-15, captura3:2 head-yaw-Ego-QA-R2.png vista por ele. Isso cobre standing antes deste microcommit de die, não morte nem aprovação artística. Observação pendente P3: Professor parece apoiar pistola na palma, pegada estranha e face ao lado/acima; falta A/B para atribuir causa. Não esconder essa dívida geral da missão.

Próximo: root integra microcommit, valida die no consumidor visual se necessário, termina gate wiring e revisão do head atual do #1188. Nenhum push/review remoto/resolução de thread feito por esta lane. Objetivo integral de mapas/AK/skins/MP/mobile permanece com o root; esta entrega cobre somente yaw.

## Nova investigação RO solicitada pelo root

Yawfinal61afae0ad entregue, árvore limpa. Root solicitou causa do portao-browser #1188 SHA21, eval:select mudou referência global0,675/23,6 para0,689/28,6 (log PR1188-job-124629497254-21.log:565). Escopo novo somente leitura de select-inflate, referências/debt e proveniência GLB/escala entre1179/QA21; sem atualizar tetos/baselines/dívida. Root permanece único writer combate e browser, cuida VM14/graffiti404. Precisar de patch exige lane própria/RED antes; nenhum patch autorizado por esta investigação ainda.

Primeira leitura: gate para antes de imprimir refs e antes de gravar JSON quando teto muda. Caminho buildCharacterModel({weaponId:charWeapon}), preview indefinido/false; compare kernel CPU applyBoneTransform real pode ser reproduzido com GLB reais e texturas stub (declarar limite). Mudanças QA após1179 em glbchars afetam preview:true e proxy, enquanto1179 mudou yaw/overlay1H/curl/IK. Não atribuir causa sem ablação.

## Select RO: causa reproduzida e limite preservado

Relatório recuperável `docs/reports/SELECT-CI-CAUSE-20261031.md`. Kernel exato comGLB reais reproduz tetoCI .689/28.6. Causal: clampAlcanceIK mede até punho mas alvo é palma. Ablação de uma chamada ou protótipo privado com palmacomprimento em mundo restaura .675/23.6. Modelos/clipes9blobs dasrefs idênticos nas4revisões, handikantigo e yawfinal não mudamvermelho. Sem produto/package/gate/debt editados. Root mantém lease único de combate e pediu proposta antes de qualquer gate.

Proposta detalhada no relatório: quarto endOffset opcional, medirparcelamundial antes do95%, passar nos dois callers de apoio normal/reload, fixture helperreal+callertrace emTPWORLD com4mutantes e eval:selectexistente. Ainda existem14bloqueadores na dívida após restaurarrefs em63modelos; ververdictsprivados. Root avisado, não declarar gatecompletoverde. GLMRO4min em execução; checkpointapós resultado preservará adjudicação.


GLMRO causa concluiu sem medir: atribuição prioritária ao handik e possível yaw
refutada pelos controles reais; não adotar recomendação condicional de atualizar
teto/dívida. Evidência e adjudicação registradas no relatório SELECT-CI-CAUSE.
Checkpoint atual somente docs; parent solicitou continuar RO nos14 bloqueadores,
com matriz all-roster main491/#1179/QA-yaw e clamp antigo/palma/ausente. Sem writer
combate concorrente, sem produto/package/gates/assets/dívida nesta lane.


## Matriz select RO — checkpoint de atribuição

Relatório SELECT-CI-BLOCKERS-20261031.md:37execuções/2331linhas, zero erros, manifest
SHA256 SELECT-ABLATION-CHECKPOINT-R1.json. Main491 e debtbase pareados passam0/63;
#1179original19; palma14; tirar todosclamps14. QA21/yaw61idênticos a1179 nas7métricas
dos63modelos em4variantes. YawINTRODUÇÃO1906 causa11dos14; patchantifeedback61af
continua válido/neutro. Palma+sem yaw+curlantigo+semfrontmax deixa1Esquerdomacho;
retirar clamp1H ou clip1Hantigo chega0/63. Evidência causal não é rollback proposto.
Correção do texto anterior: yaw não causa TETO DAS REFS, mas introduçãooriginal causa
parte das dívidas. GLMRO2 ainda rodando. Root autorizou protótipoRO neck/Head
preservando finalyaw, cadeia/influência reais e critérios existentes. Sem browser,
produto/package/gates/assets/debt. Atualizar antes de trocar modelo/etapa.


## Menor correção RO adjudicada e protótipo cervical rejeitado

Neck/Head50/50preserva quaternion final<=1,2e-9 e arma/gapexatos, mas13bloqueadores;
neck100%14incluiMarina, rejeitados. Cadeiareal63Head>neck>Spine>Spine01, influências
registradas. Root propôs rejeição explícita yaw80/frontmax e wrapperduplicado95%,
conservando solver98%mundial+palma/pisofrontal/clipes/proxyfinal e curlnovo nos62;
Zumbi usa fórmulaantiga completa(.35naAK), cap.80isoladonãoresolve. Protótipo dessa
proposta0/63; cabeça igualmain, mountdelta<=1,173e-5grau numérico, gapdireito0 e
apoiosemnenhumapiora, máxherdado17,42mm. Não cobrepreviewtrue/Professorpistola/reload/
allskins/browser. Gate80deverásersubstituído porposeautorada sefeatureforretirada,
semretirarselect; nenhumgate/produtoeditadoporesta lane. RelatórioSELECT-CI-BLOCKERS
contém adjudicação/limites/GMLcrítico. GLMR2timeout; R3realcomerrosdeinterpretação
numérica rejeitados explicitamente, nãoCLEAN. Próximo rootaplica produto e gate
legítimos na visual-ci-parity, verifica63+consumidor/Ego. Nenhumpush/resoluçãoremota.


## Contrato preparado de pose autorada — sem produto/package

Root autorizou substituir somente tools/eval/head-yaw-check.mjs e HEAD-YAW.md para
acompanhar rejeição explícita da feature yaw80. Produto desta WT ainda é61af com
feature ativa. Portanto nominal deve ser RED antes da retirada; não publicar nem
integrar este checkpoint isolado como se produto estivesseGREEN. Package intacto.
Root retirará produto e rodará comandos nominais consolidados.

Novo oráculo é AnimationMixer independente com sequência de clipes por nome e dt
compartilhado; não usa segundo CharController. Compara HeadLOCAL e quaternion
autorado direto não nulo em repouso/semtrack. Tracks ausentes/constantes/animadas,
pausa real de trackanimado, standing/giro/pais yawpitchscale, dt0/hitch/30/60/120,
ações shoot/jump/death/revive/trocas/LOD, emoteNeck/Head e mira legítima; proxyFINAL
em cada frame medido. Sem congelar ganho80/dirrosto+Z. Cópia temporária fora da
árvore pública reescreve imports absolutos e é apagada ao sair.

Medições finais R3: HEAD-POSE-ACTIVE-YAW-RED-R3.json=RED25/27, exit1, erro até.5rad;
HEAD-POSE-PROPOSED-GREEN-R3.json=GREEN27casos/26.980framesmedidos ao remover só o
bloco yaw na cópia, proposal:true, errooráculo0/direto4,58e-8rad/proxy1,36e-15m.
Efeitos legítimos presentes: emoteNeck/Head~.383rad; pitchheadlocal~.381rad e melhora
.408rad contraamixerneutro. Não éGREENproduto/GLB/browser/allskins nemartapproval.

HEAD-POSE-AUTOTEST-R3.log detecta5/5 yaw80/yawacumulativo/proxyantespose/sempitch/
sememote. Autoteste exige nominalGREEN primeiro; com produtoativo semflag sai1.
CLI desconhecida/mutantevazio/desconhecido sai2; produto ausente emcwdvazio sai3.
Artefatos dosmutantes + HEAD-POSE-NATIVE-VERDICT-R3.json guardam evidência nativa.
Proxyantecipado witness no mesmoframe21: Neckdelta.015rad e proxyerro2,93mm,
erromáximo64,09mm. OmutantesempitchsobreviveuR1 porque tronco mascarava cabeça;
rejeitado, corrigido comassertdeltalocalHead e melhora contraquadroprémira eoráculo.

GLM5.3R1design real criticou oráculo/efeitos/transições/infra e levou a reforços;
R2reviewRO dofontefinal em execução. Sintaxe/diff-check/ARCH:check verdes. Régua de
comentário contra7d4b91d5cverde (escopo public/src semprodutoeditado). Nenhum
produto/game/handik/asset/teto/debt/package editado, sempush nemthreadremota.
Próximo: adjudicarR2 e checkpointassinado contratoPREPARADO; root aplica produto,
nominal/autoteste/consumidor e Egoantesmerge/release. A missão integral segue root.


### Prova final no produto real b7, sem variante

Root concluiu produto b7a66871f e manteve lease único. O gate foi executado com
bytes REAIS de gitshow b7:public/js/glbchars.js em cwdtemporário com imports/deps
symlinkreadonly; sem --proposta-sem-yaw e sem alterar a fonte. Manifest
HEAD-POSE-REAL-b7-MANIFEST-R2.json registra sourceVariant:false e SHA256
6dab2706b8b3e7b0a246ea4e6c78aa829ed6c0f9b0b07d9e5ea8d094670efe42.
Nominal HEAD-POSE-REAL-b7-NOMINAL-R2.json GREEN30/27.520framesmedidos, errooráculo0,
direto4,58e-8rad, proxy1,36e-15m, zeroaçãoerrada. AutotesteREALR2 detecta6/6:
yaw80(29), acumulativo(29), proxyantespose(4), sempitch(2), sememote(2),
pitchforaguarda(2). CLI2 e infra3 confirmados. Fonteativa destaWT permanece
RED26/30 em HEAD-POSE-ACTIVE-YAW-RED-R4.json, confirmando causalidade antesretirada.

GLMRO finalR2 real entregou sem bloqueador, três comentários adjudicados: controles
manuais de playback dooracle são premissasdocumentadas (não derivar doresultado
do próprio controlador); pitchnegativo e skipsLOD2/morto foramacrescentados com
mutantecausal; jumpsemclamp temcomentárioexplicativo. Sem nova gain80, semproduto,
semalteração deteto/debt/asset/package. DadosantigosR3preservados, R2realb7 éa
prova final. Gate/documentação/ledger prontos para checkpointisolado assinado.
Root devecherrypickcontrato junto da retiradareal e rodar fluxo consolidado; nenhuma
prova desta lane equivale a browser/arte/MP/release. Artefatos no audit externo.
