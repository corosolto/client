# Seleção: atribuição dos14 bloqueadores

Escopo somente diagnóstico e protótipos em módulos temporários. Nenhum produto,
package, gate, asset, teto ou dívida foi alterado. O root mantém o lease de combate
e browser. O kernel original de select-inflate roda com GLB/rig/clipes reais e
texturas brancas stub; mede deformação geométrica, não aprovação visual.

## Matriz que separa origem de dívida e regressão

Base main `49151a2970e1ec7cd5c31f4f232b82639804f8ae`, #1179`fd553b310`,
QA`21f264c51`, yawfinal`61afae0ad`. Cada execução mede os mesmos63 personagens,
60updates×1/60. A reprodução com arquivos históricos usa blobs Git reais, sem
fallback de assets ausentes. As dependências handik acompanham a revisão da fonte.

| Variante | Teto refs | Bloqueadores |
|---|---|---|
| dívida d07749f4, assets pareados | 0,675/23,6 | 0 |
| main491, assets pareados | 0,675/23,6 | 0 |
| main491, assets QA atuais | 0,675/23,6 | 0 |
| #1179, clamp antigo | 0,689/28,6 | 19 |
| #1179, clamp com palma | 0,675/23,6 | 14 |
| #1179, sem clamp apoio | 0,675/23,6 | 14 |
| #1179, sem todos novos clamps | 0,675/23,6 | 14 |
| QA21 e yaw61, cada variante acima | idêntico ao #1179 | idêntico ao #1179 |

As sete métricas de geometria (P95/P99/P99.9/máx/%>25/ruins1e4/arestas) são idênticas
em TODOS os63 modelos entre #1179, QA21 e yaw61, em cada uma das quatro variantes.
Main com assets atuais e pareados também é idêntica nas sete métricas. A dívida
congelada é reproduzível; não está obsoleta para esconder uma regressão da main.
A mudança de normals/asset desta leva não causa os bloqueadores.

## Ablação causal (sem tuning)

| Ablação sobre QA/yaw com palma | Bloqueadores restantes |
|---|---|
| nenhuma outra | 14 |
| yaw original desligado | 3: Esquerdomacho, Canarinho, Zumbi |
| yaw desligado + curl antigo | 2: Esquerdomacho, Canarinho |
| yaw desligado + sem frontmax | 2: Esquerdomacho, Zumbi |
| yaw desligado + curl antigo + sem frontmax | 1: Esquerdomacho |
| anterior + sem clamp1H | 0/63 |
| anterior + clipe1H antigo em vez de clamp1H retirado | 0/63 |

Isso identifica famílias causais; NÃO propõe apagar melhorias para aceitar o gate.

- **Yaw original1906b2da8:** onze bloqueadores somem ao zerar somente o delta yaw.
  Professor0,722/57,3 volta exatamente0,696/56,3; políticos voltam às respectivas
  dívidas. Esquerdomacho cai0,585→0,581 e Canarinho0,740→0,739. A mudança posterior
  antifeedback61af não causa a diferença: ela preserva os mesmos números do #1179.
- **Canarinho/frontmax0,20:** sem yaw, retirar o clamp de frente traz0,739/57,9
  para0,655/33,2, dentro do contrato0,655/37. O teto frontal move mão/asa através de
  CCD; precisa preservar orientação da arma e contato final numa alternativa.
- **Zumbi/curl:** restaurar SOMENTE a fórmula anterior0,35–0,80 traz0,685/19 para
  0,655/19. O personagem não tinha dívida porque ficava abaixo do teto0,675.
  Dedos mais fechados podem ser desejáveis visualmente; a conta não aprova nem
  reprova a pegada estética sozinha. Corrigir articulação/pesos evita rollback cego.
- **Esquerdomacho/clamp1H:** após remover os três fatores acima, sobra0,581/31,2
  contra0,578/31,2. Retirar só o novo clamp da mão livre (não recarga nem apoio2H)
  traz0,578/31,2. Alternativa de controle: clipe1H antigo traz0,545/30,3 nesta
  combinação. Não atribuir esse resíduo ao yaw antifeedback.

Proveniência temporal independente: fonte d5e71535c tem só Canarinho como bloqueador;
0da5a7ede também1; dee7a825f/b6573e5c9 têm Canarinho+Zumbi;1906b2da8 sobe para19.
Somente a introdução do yaw, guardas IK e tint ocorre no último salto, e as
ablações separadas acima isolam suas parcelas sem alterar a dívida.

## Princípios da correção a implementar pelo root

A palma em mundo é correção geométrica comprovada, mantém a guarda95% e não exige
revisar teto. As outras ablações são evidência de causa. Menor próxima hipótese
para yaw: distribuir a mesma correção final por neck/Head usando a cadeia real,
medir influência de skin e deformação, sem afetar braços/mount. Precisa manter a
prova antifeedback, direção, transições e proxy final já entregues.

Canarinho precisa de porte com asa anatomica e arma presa, sem simplesmente puxar
um alvo incompatível com o clipe. Zumbi precisa fechamento de dedos que respeite
pesos/juntas. Clamp1H precisa alvo legítimo e análise da mão livre. Nenhuma variante
com piora de orientação de arma, gap de palma ou leitura visual será aceita só por
baixar uma métrica. Root autorizou protótipo RO neck/Head e fará browser A/B depois.

## Evidência recuperável

Audit externo `audits/2026-10-31-visual-consistency/`:
`SELECT-ABLATION-CHECKPOINT-R1.json` contém37 execuções,2331 linhas de personagem,
zero erros, hashes SHA256 e dívida congelada. `SELECT-KERNEL-NODE-R2..R5.mjs`
preservam import do corpo exato da régua e alterações temporárias nomeadas.
Matriz completa `SELECT-MATRIX-*-ALL-R1.json`; ablações
`SELECT-ABLATE-*-ALL-R1/R2/R3.json`. As duas rodadas R3 completas dão0/63
bloqueadores; não foram executadas como produto, browser ou CI publicado.

GLM-5.3 RO R2 em execução na hora deste checkpoint. Seu resultado será adjudicado
contra os números e não substitui as medições. Próximo: identificar cadeia e
influência real dos rigs, medir pescoço/cabeça com mesmo yaw final e documentar
rejeições. Nada além deste relatório e da continuidade foi editado.


## Protótipo cervical refutado

Todos63 rigs têm cadeia Head→neck→Spine→Spine01. Protótipos privados aplicam a
mesma correção total em mundo e desfazem cada delta antes do mixer:50%neck/50%Head
ou100%neck. Nos dois, quaternion final da cabeça permanece a distância<=3,9e-9 do
original; quaternion do mount e gap da âncora da palma não mudam. Mesmo assim,
50/50 deixa13 bloqueadores, e100%neck deixa14, incluindo nova regressão em Marina.
Professor50/50=0,720/57,3, ainda acima0,696/56,3. Ambos rejeitados como solução.

Influência do Professor: Head2754 vértices com peso positivo/2567 dominantes/peso
somado2530,44; neck1443/zero dominantes/52,73. Uma nova aresta ultrapassa razão1
com yaw:1143→1156, comprimento de referência1,3180073 para0,646511, razão1,039;
dominantes Spine01(0,3194) e RightShoulder(0,3275). Isso comprova interação de
pesos mistos; não indica sozinho quais pesos pintar. Barbudo tem5 novas arestas,
incluindo pares Head/Shoulder e pares dominados por Head. Não afirmar que apenas
um osso mais adequado resolve a malha nem calibrar porcentagens até passar.

No Professor o eixo+Z do Head dá yaw de rest−4,822°, idle sem overlay−6,445°,
com overlay−1,297° (delta+5,148°). Isso NÃO prova que +Z do osso seja a direção
física do rosto. Falta referência de face/captura humana para uma nova solução.
`SELECT-NECK-*-ALL-R2.json`, `SELECT-NECK-R2-verdict.json` e os focais R3 sustentam
essa conclusão. Tentativa R1 falhou por usar API BufferAttribute.getComponent
inexistente na versão vendorizada; rejeitada e refeita com getX/Y/Z/W.

## Adjudicação da menor alteração de produto proposta pelo integrador

O root propôs rejeitar algoritmos novos regressivos, preservando clipes e guardas
legadas. A análise de fonte e as medições apoiam a seguinte alteração, ainda NÃO
aplicada nesta lane:

1. **Remover wrapper clampAlcanceIK e os quatro callers novos.** O solver real já
   calcula soma de toda a cadeia + palma em MUNDO, reserva0,98 contra singularidade
   e usa alvo interno sem modificar targetWorld. Nenhum caller em questão passa
   reach:false. O wrapper duplicava essa guarda com0,95 e sem palma; reduzir raio
   tampouco impede uma direção atrás do corpo. A proteção real permanece ativa.
2. **Rejeitar a introdução do yaw80% do #1179.** A correção antifeedback61af era
   tecnicamente válida para a feature ativa. Porém, manter o overlay torce11 rigs
   acima da dívida e sobrepõe a pose autorada sem provar eixo físico do rosto.
   Retirar a feature inteira é rejeição explícita dessa abordagem, não afrouxamento
   do select e não prova de que a meta artística de cabeça/rosto esteja resolvida.
   Preservar clipes e atualização final do proxy da cabeça após todos overlays.
3. **Rejeitar somente frontmax do Canarinho.** O CCD humano sobre asa introduz a
   deformação medida. Preservar TP_FRONT_MIN legado, solver98%, montagem presa à
   mão, clipes e porte curto existentes. Nova solução artística da asa permanece
   pendente de referência/visual; não chamá-la concluída só por remover o teto.
4. **Fórmula anterior de curl só no rig base Zumbi.** Outros62 mantêm fórmula nova.
   Na AK, espessura medida0,189066m: novo curl0,55, anterior0,35. Teto0,80 sozinho
   não muda nada e continua vermelho0,685/19. Fórmula anterior completa traz
   0,655/19. Preservar adaptação por espessura, fallback e slope antigos nesse rig,
   em vez de fixar um ângulo tirado somente da AK. Perfis de skins com outro rig
   precisam conservar sua política própria e validação; este ensaio cobre bases63.

O protótipo privado exato dessas quatro decisões dá0/63 bloqueadores nos contratos
congelados, sem trocar tetos/assets/dívida. `SELECT-MINIMUM-YAW61-...-zumbi-oldcurl-ALL-R1.json`.
A variante com teto0,80 em vez de fórmula anterior permanece1/63: controle negativo.

### Preservação medida da pose e arma, com limites claros

Repetição com telemetria comparou candidato mínimo versus main491 no mesmo kernel:
head quaternion final idêntico em todos63; mount difere no máximo1,173e-5 grau
numérico; gap da âncora direita da palma=zero em todos. Gap palma/grip da mão de
apoio nunca piora, máximo herdado Sindicato17,42mm. Professor1,62mm idêntico à main.
Outros62 preservam curl NOVO, comprovado pela telemetria. Isso conserva orientação
e contato no caminho medido, sem prometer mão perfeita ou aprovação artística.
Artefatos `SELECT-MINIMUM-GRIP-main491-ALL-R2.json`,
`SELECT-MINIMUM-GRIP-candidate-ALL-R2.json`, `SELECT-MINIMUM-GRIP-R2-verdict.json`.

São60frames idle, preview:false/indefinido, arma padrão de charWeapon. Não cobrem
Professor pistola do browser, preview:true, todas armas/skins, recarga ou screenshot.
O integrador precisa repetir o produto final no consumidor e browser; o 0/63
privado não é CI publicado ou release aprovado.

### Contrato e gate após rejeitar a feature

Não remover select nem diminuir sua cobertura. Se yaw80% deixa de existir no
produto, o gate não pode continuar prometendo ganho80%/convergência ao eixo+Z.
Substituir o contrato por preservação da pose local Head autorada: AnimationMixer
real como oráculo, tracks ausentes/constantes/animadas, repouso longo, giro do grupo,
ancestrais com escala/rotação, transições de ação e revive. Sem aimPitch/emote no
caso de pose neutra; efeitos intencionais ganham casos próprios. Mutante adicionando
delta de yaw deve falhar, assim como proxy copiado antes dos overlays. Não duplicar
o controlador inteiro nem substituir esse ensaio por busca de string da feature.
A régua de head proxy/world IK existente continua pertinente. Nenhum gate foi
editado nesta lane; root implementará/removerá contrato obsoleto junto do produto.

## Revisão GLM desta etapa

GLM-5.3 R2 excedeu4min sem relatório: tentativa rejeitada, sem crédito de revisão.
R3 real concluiu (`SELECT-GLM-NECK-R3.md`) a partir dos números fornecidos. Sua
rejeição dos protótipos cervicais insuficientes e reserva sobre eixo de face conferem.
Há erros factuais que foram REJEITADOS: confunde0 diferenças entre QA/yaw com0
bloqueadores; chama os três resíduos de dívida preexistente apesar da main0/63;
e exagera que dominantes de aresta provam a camada exata do defeito. O autor desta
análise não adota essas frases nem rotula R3 como revisão CLEAN. Os números reais
continuam os artefatos do kernel e a adjudicação explícita acima.
