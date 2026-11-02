# Campo do Morro: piloto de fachadas de 31/10/2026

Esta frente integra a missão de consistência visual, revisão de PRs e release de
Ruben. O escopo completo e as outras frentes permanecem em
`docs/reports/VISUAL-RELEASE-CONTINUATION-20261031.md` no worktree de integração.
O piloto não encerra a missão nem implica aprovação visual do mapa completo.

## Estado atual, 01/11 R53: estado raster validado em CPU

Root conferiu o manifesto `CAMPO-RASTER-VALIDATION-R53-FINAL.json`
(SHA9423e21ad378bf1f1b7cc031b74fa80fe1d2545d0a1c30d3d61f8e9c636016ee)
e os sete hashes contra os arquivos atuais. Nodes22/26:36pins comparados
ao desenho independente R48, sintaxe,142controles do comparador e43 do wrapper
por Node; o modo isolado passou também com SIM_QS conflitante e16rejeições CLI
saíram2. Os12wrappers externos antes falseGREEN agora saem1 com oito cláusulas
e somente CU-8 vermelha. Matriz completa:69execuções/7NA por Node,
138execuções/14NA no total;76linhas reconciliadas em cada Node, preservando
os70casos R47 e64 R38. Default=query2 dentro de cada Node; não se exige nem se
observou igualdade de digest entre versões do Node. Produto064, referência1ad9
e fixturedb72 não mudaram. A autoria R49 não executou testes; esta validação
R53 é uma etapa posterior, com logs/driver/manifesto no audit agregado.

Root leu integralmente `CRITICO-CAMPO-WHOLE-R53.md`
(SHA13e94195249b573c93e82ae33a7fbc217691a35e68a063c6d0a7336526434c0b):
WHOLE7 CLEAN FOCAL, sem P1/P2. Crítico nativo leu4.037linhas/sete fontes,
dois pares GLM5.3 low encerraram exit0 e55artefatos foram conferidos; os
12BEFORE/12AFTER e76casos por Node foram reanalisados sem executar o produto.
O único nit foi a frase antiga de execução pendente no contrato; Root corrigiu
só esse texto, preservando os cinco fontes executáveis/oráculo congelados.
Próximo: geradores e checkpoint local recuperável. Ainda não integrado à QA, sem novo
aceite de arte do mapa inteiro/mobile/MP/release. M2=2/M3=2 focal R35 permanece;
M1/M4 UNKNOWN e TEXEL3b preexistente vermelho. Missão integral e exclusão de
Flávio permanecem; não atrasar publicação da base QA por esta stack separada.

## Estado histórico, 01/11 R49: autoria do estado raster CPU (PATCH_ONLY_UNRUN)

Produto064, referência1ad9e3d2, fixturedb72b51f e matriz R47 VALIDADA
(63exec/7NA, Nodes22/26) permanecem intactos como história. O crítico integral
R47 apontou F1/P2 (estado raster não comparado); Root APROVOU o desenho R48
com os36pins ativos+dormentes e executou o BEFORE em
`CAMPO-RASTER-BEFORE-R49.json`: 12/12 falseGREEN 8/8 (blend-zero/depth-never ×
original/r22/r23 × Nodes22/26, wrappers `--fonte` externos) — cegueira medida
do checker antigo. Execuções do Root, não do autor.

Este patch (GLM5.3, OMP low, lease exclusivo dos quatro arquivos) é autoria
sem nenhuma execução: comparador central `pinsRaster` com tabela literal de36
propriedades (procedência original7ca2 + vendor r160 a47c, esperado nunca
derivado do produto), `blendColor` exigindo Color do vendor com canais lineares
finitos exatamente0 (sem getHex), `confereMaterial` preservando PBR/cor/
identidade e demais checks; `materialDados`/`hashCena` registram os36pins sem
quantização (depthFunc e canais blendColor incluídos); modo `--self-test-raster`
isolado (único, exit2 em duplicado/combinação) testando o próprio comparador
com literal + Color do vendor; mutantes `fim-raster-blend-zero`
(Custom5/Zero200/One201/Add100, C_out=dest com contribuição da cor da fonte
zero — sem claim de descarte/depth/general visible) e `fim-raster-depth-never`
(NeverDepth0, depthTest true), ambos original/r22/r23 com conjunto exato
[CU-8], alpha nominal0/1/false e estrutura intacta. Wrapper projeta
**69exec/7NA** (não executado). shader/callback/closure/GPU/luz/fog/câmera/
contexto seguem UNKNOWN; alphaMap/displacementMap/shadowSide/dithering/
toneMapped/precision/forceSinglePass fora da família. Sem claims de bitmap/
arte/mapa inteiro/mobile/MP/release; nenhum commit.

OMP `zai/glm-5.3` low encerrou exit0; isso registra autoria, não execução.
Os sete arquivos anteriores e SHA foram preservados em `CAMPO-RASTER-PRE-R49/`;
antes de qualquer edição nativa, quatro brutos/log/prompt/guard/resultado e SHA
ficaram em `CAMPO-RASTER-GLM-RAW-R49/`. Ambos ficam no audit agregado
`2026-10-31-visual-consistency`. Supervisão nativa leu todo o patch e os quatro
fontes; corrigiu despacho do self-test no CLI, ampliou controles dos canais
Color (tipo/NaN/Inf/valor minúsculo), marcou ausência/NaN/Inf no digest, reforçou isolamento material/cena com
reposição do binding para recuperar o digest nominal e reduziu comentários.
Os corpos anteriores de mutantes, VELHOS/aceitar/self43 e demais contratos
permanecem preservados; nenhum código de produto/teste foi executado.
Entrega e hashes: `CAMPO-RASTER-PATCH-ONLY-R49.json`, cópia dos quatro arquivos
em `CAMPO-RASTER-FROZEN-R49/`, delta nativo `CAMPO-RASTER-NATIVE-R49.patch` e
delta integral desta autoria `CAMPO-RASTER-FINAL-R49.patch`, no mesmo audit.

Próximo (Root): congelar os quatro arquivos; syntax, `--self-test-raster`,
rejeições CLI do modo isolado, wrappers externos BEFORE/AFTER e baseline
de compatibilidade 69/7NA nos Nodes22/26; crítico novo de contexto limpo.
Ownership devolvido ao Root.

## Estado histórico R47: correção do contrato alpha VALIDADA

Produto permanece06428894, referência1ad9e3d2 e fixturedb72b51f intactos. O ganho
artístico focal foi aceito na revisão R35 (M2=2/M3=2); mapa inteiro/mobile/MP
continuam sem aceite. A matriz R44 fechou114execuções/14NA nos Nodes22/26 e os
16controles CLI R45 foram rejeitados antes do build. Isso é histórico validado.

O crítico integral R45 REJECT encontrou P2: o contrato aceitava alphaTest2 ou
transparent+opacity.01 nos materiais reais. Root reproduziu quatro falseGREEN
8/8 com wrappers externos do builder antes do fix (CAMPO-ALPHA-BEFORE-R46.json).
GLM5.3 low autorou a correção, mas atingiu o prazo e terminou EXIT1 parcial;
brutos preservados em CAMPO-ALPHA-FIX-R47-native. Root removeu a guarda fraca
redundante, restaurou comentário removido e corrigiu a alegação sobre blend.

Contrato exige a tupla aprovada visible=true/colorWrite=true/opacity=1/
transparent=false/alphaTest=0; dois mutantes adicionais nos três perfis devem
reprovar CU-8. Matriz nova63exec/7NA foi congelada antes dos testes. Root concluiu126execuções/
14NA nos dois Nodes,86selftests e sintaxe dos dois scripts, todosEXIT0. Os mesmos
quatro wrappers externos saem1 agora com apenasCU-8 vermelha. Evidências:
CAMPO-ALPHA-EXECUTIONS-R47.json e CAMPO-ALPHA-AFTER-R47.json. Sete hashes ficaram
idênticos até essa atualização textual; produto/ref/fixture permanecem intactos.
Próximo: ler o crítico integral atual e fazer checkpoint somente sem dívida.
Publicação e aceite visual do mapa inteiro continuam pendentes. Nenhum teto/
geometria mudou; não se alega captura GPU do efeito alpha.

### Estado histórico R31: folha fosca aguardando recaptura focal

Fonte `public/js/map_campomorro.js`:
`064288948b0a96b87079b5ebcd1de55bcce1cf9dbe5a05b48ff1e58cff639135`.
Base/branch continuam os registrados abaixo; nenhuma publicação por este builder.
Default/query2 constrói R23; query1 conserva R22 e query0 a montagem original.
R22 está congelada externamente em `CAMPO-R23-AB-FROZEN-R22-map_campomorro.js`,
SHA `196458efed8c47040d7f4f3567a2fe92b6fc49233ccb876a12a937b9682cef5c`.

O Root concluiu a recaptura R22 (12 arquivos raw/final F7/F8 e vistas oblíquas),
observou a faixa antiga ausente em F8/OB3 e registrou preferências restauradas.
Isso resolve o finding focal observado; não aprova o mapa inteiro nem M3.
O crítico independente R30 viu36capturas e aceitou o ganho artístico focal
M2=2/M3=2 na R23 anterior (SHAd79a0f7f…), mantendo REJECT para merge por CU-5
e parâmetros metálicos da nova folha. A R31 corrige apenas esse material;
aguarda sua recaptura/revisão, sem transferir aprovação ao novo ponto fixo.
Movimento, M1/M4 e aceitação do mapa inteiro permanecem pendentes.
O CU-5 permanece vermelho: seu contrato não foi modificado nesta frente.

Próxima ação: Root recapturar F7 após o ajuste fosco e avaliar a proposta RO do
contrato CU-5/inventário antes de autorizar sua implementação.

## Objetivo e definição de pronto

Substituir a leitura de painéis repetidos por três frentes construídas e coerentes
na borda z=+30, centros x=10,5/17,5/24,5. Preservar guardas, terreno, rotas,
colisão, oclusores de tiro, spawns, itens e materiais fora desse trecho. Não
acrescentar decoração, novos assets ou ajustes de iluminação/pós nesta rodada.

A candidata depende de comparação no jogo real nas mesmas câmeras e aspectos,
aproximação e deslocamento, contratos físicos e de acabamento, custo declarado e
crítico independente. Não afrouxar teto nem substituir julgamento visual por
syntax ou Node. Aceitação do mapa completo M1/M2/M3/M4 segue UNKNOWN.

## Estado recuperável

- Worktree: `worktrees/campo-fachadas-20261031`.
- Branch: `codex/campo-fachadas-20261031`.
- Base/HEAD no início: `26ea02f088f27607335c8a66933a6626eac400df`.
- Fonte inicial `public/js/map_campomorro.js`, SHA-256:
  `7ca2a7de566134c4aa45dad0213e8d2257f1aaef7a5b0a34621ed3a49cb73631`.
- Lease: esse fonte e este documento. Sem commits, push, PR, npm install, harness,
  dependências compartilhadas ou browser por este builder.
- Raiz dos insumos e saídas externas desta rodada:
  `audits/2026-10-31-visual-consistency/` no workspace agregado.

## Marcos e evidências

1. Branch, HEAD, fonte e worktree limpo conferidos antes de editar.
2. Coordenador abriu individualmente os oito PNGs
   `CAMPO-FACHADA-BASE-R16-{C1,C2}-{1320x880,1280x720}-{raw,final}.png`
   e `complexo-local-sheet.jpg`; leu a crítica independente integral
   `CAMPO-BASELINE-CRITICO-R16.md`.
3. Defeito focal confirmado nos insumos: a faixa ao fundo do C2 repete coroas,
   vãos escuros aplicados, ressaltos e alturas sem explicar a construção. O raw
   mantém a repetição; o final reduz a distinção tonal. Não há ablação que
   atribua a diferença a um parâmetro específico do pós.
4. Autoria GLM-5.3 iniciada com escopo de arquivo único e guard que restringe
   read/edit ao fonte real do worktree. Bash, MCP, outros paths e agentes
   bloqueados. Execução usa edição replace para verificar o path explicitamente.
   Prompt: `CAMPO-GLM-PROMPT-R17.md`; guard: `CAMPO-GLM-GUARD-R17.ts`;
   log: `CAMPO-GLM-AUTHOR-R17.log`.
5. R17 concluiu com exit0 e edição real. `node --check` em Node26 passou.
   Inspeção completa do diff encontrou avanço de peças para fora do envelope
   original, junta fora do encontro real dos painéis e geometria desnecessariamente
   fragmentada. Essa candidata não foi encaminhada como pronta. Cópia e patch
   preservados em `CAMPO-CANDIDATE-R17-map_campomorro.js` e
   `CAMPO-CANDIDATE-R17.patch`; SHA-256 do fonte R17:
   `82b712c7ec0b32e206beba165532d21100f0555b0ca1298beb5cf47472eaf368`.
6. Correção técnica focal GLM iniciada com o mesmo guard e arquivo único:
   `CAMPO-GLM-PROMPT-R18.md` / `CAMPO-GLM-AUTHOR-R18.log`. Deve manter o
   envelope, corrigir a junta para x+0,4 e agrupar peças por material existente.
   Não é nova rodada estética nem aprovação da montagem proposta.
7. R18 concluiu com exit0 e autoria real de batching local, requadros, junta e
   envelope horizontal. Inspeção do diff, `node --check` em Node26 e
   `git diff --check` passaram. Fonte anterior aos ajustes do coordenador:
   `CAMPO-CANDIDATE-R18-map_campomorro.js`, SHA-256
   `b7f1db6920d67546876d38cb3619b9e45b96b6ade007184b2ab6581802aeff69`.
8. Ajustes técnicos do coordenador R18A: painel direito coplanar ao esquerdo
   para não esconder vidro/porta atrás da parede; vãos direitos afastados da
   junta; planos de pilastra/base/parapeito separados dos requadros e beirais;
   cintas acima das vergas das portas; vidro/porta sem castShadow como antes;
   comentário novo reduzido ao orçamento de uma linha. Não são aprovação visual
   nem medição de ausência de interseções. Syntax e diff de whitespace passaram
   novamente após esses ajustes.
9. O integrador retornou uma regressão visual concreta da revisão independente
   R21: pilar direito e remendo do módulo i7 têm faces frontais coincidentes
   em z29,57 numa área de 0,075×0,6 m. O coordenador abriu
   `CAMPO-FACHADA-CLOSE-R21-1-F8-1320x880-final.png` e identificou a faixa
   serrilhada. Segundo o integrador, a revisão cobriu 28 PNGs e o defeito não
   aparece no kill0. Este builder não repetiu essa cobertura integral.
   Microfix GLM iniciado com o guard existente e máximo de quatro minutos:
   `CAMPO-GLM-PROMPT-R22.md` / `CAMPO-GLM-AUTHOR-R22.log`. Escopo: terminar o
   remendo no limite interno real do pilar, sem deslocar z, ocultar peça,
   modificar quantidade, material, física, demais perfis ou contrato CU-5.
10. GLM R22 concluiu exit0. Microdiff inspecionado contra o fonte R18A: somente
    uma chamada alterada, largura do remendo 2,2→2,125 m e centro relativo
    x+1,6→x+1,5625. A borda esquerda continua x+0,5 e a direita termina em
    x+2,625, limite interno do pilar de 0,55 m centrado em x+2,9. A área
    coincidente é eliminada por encontro adjacente, sem deslocar profundidade,
    altura ou material. `node --check` e `git diff --check` passaram. Nenhum
    gate, harness ou browser executado por este builder. Saídas externas:
    `CAMPO-COPLANAR-R22.patch` / `CAMPO-COPLANAR-R22-MANIFEST.json`.

## Aceito, rejeitado e pendente

Aceito como direção de trabalho: construção e encontro de materiais com poucos
elementos; comparar primeiro o trecho focal e manter as outras fachadas iguais.
As imagens da referência orientam a organização arquitetônica, sem cópia de
assets ou afirmação de desempenho no dispositivo de referência.

Rejeitado como solução desta rodada: apenas variar cor/grunge, inserir entulho,
alterar guarda/colisor para acomodar decoração, expandir o piloto ao horizonte
ou calibrar look.js/bloom.js a partir de duas poses. A baseline raw não é uma
saída fotométrica calibrada equivalente ao final.

Rejeitado tecnicamente na R17: peças fora do envelope e junta deslocada. O log
do GLM também alegou sobreposição de aproximadamente um metro nos painéis
originais, mas suas dimensões mostram apenas encontro em x+0,4; essa alegação
não é evidência aceita.

### Estado antes da autoria R23 (histórico)

Aceito apenas para avaliação no jogo: candidata R22 limitada aos módulos i6/7/8,
com `?campoFachadas=0` mantendo as chamadas originais. Peças do piloto agrupadas
por identidade de material existente, sem importar assets. O comentário e as
afirmações dos logs do GLM não substituem verificação. A justificativa da R18 de
que a janela alta anterior excedia h+0,1 também não foi comprovada pelas medidas
do fonte; sua nova posição é uma escolha da candidata que o pixel deve julgar.

Pendente: medições físicas e de geometria, kill-query causal, capturas A/B,
aproximação/movimento, custo e crítica independente. O desenho comercial i7
unifica o coroamento na altura máxima já existente no módulo; sua silhueta local
muda e precisa ser julgada. Os vãos são fechados com requadro, sem recorte de
parede e sem espaço interno. Não há promessa de rebaixo profundo ou espaço
acessível. A paridade de colliders/occluders é intenção do código inspecionado,
não medição executada nesta frente.

Pendência retornada na R21: candidata R18A tem sobreposição coplanar local no
i7 e não está aceita visualmente. A R22 corrige o encontro no fonte; confirmar
o resultado na mesma close F8 raw/final ainda é trabalho do integrador e do
crítico independente. Não há aprovação visual ou de ausência de flicker nesta
entrega. O integrador também precisa conferir que os demais gates/perfis
continuam preservados.

Próxima ação do integrador: conferir `CAMPO-CANDIDATE-R18A.patch` e manifesto,
medir paridade de física/tiro/guarda e query, servir este worktree com dependências
isoladas e repetir as mesmas capturas C1/C2. Não usar harness de outro worktree
que possa reescrever dependências compartilhadas.

Autoria do piloto: GLM-5.3. Coordenação, inspeção e ajustes técnicos descritos na
R18A: Codex. Nenhum commit, push ou PR por este builder. Esta linha identifica
o uso de IA; não representa uma aprovação automática do resultado.

## R23 — autoria implementada (candidata, pending visual)

Autorizada pelo Root após a recaptura R22 (faixa coplanar sumiu em F8/OB3, sem
aceite do mapa inteiro). Escopo: arquivo único `public/js/map_campomorro.js`,
prompts `CAMPO-GLM-PROMPT-AUTHOR-R24.md` e proposta
`CAMPO-M3-PROPOSTA-R23.md`. Implementado de verdade no fonte, sem bash/harness/
browser/QA por este builder.

- Modos: `?campoFachadas=0` baseline original (corpo do loop intacto), `=1`
  R22 exata (helpers `pecaPiloto`/`vaoPiloto`/`fachadaPiloto` e flush
  inalterados), default/`=2`/desconhecido = R23 nova. Uma só variante construída
  por vez; maps vazios não geram geometria da outra variante.
- Topologia R23: parede segmentada em caixas positivas sem sobreposição
  (29.63..29.75, frente MIN z), infills fechados em recesso 29.70..29.75,
  quadros `fim` 29.56..29.63 compartilhando só a aresta em 29.63. Sem
  polygonOffset/z-offset/opacity. Sem `bala:true` ou collider novo. Envelope
  x[−3.2,3.2]·z[29.56,29.94] preservado.
- Partição fixa: coluna de vãos empilhados = 2 faixas + 3 travessas (5 caixas);
  vãos lado a lado = 3 faixas + 2 travessas (7 caixas, F7). Remendo superior do
  F7 removido; base/pilares/cinta/coroa/beirais/juntas R22 mantidos.
- Contagem proposta: F6 18 std/15 fim · F7 14/7 · F8 18/15 = 50 std/600 tris
  (antes 29/348) e 37 fim mantidos. Batches por material E castShadow: 8
  meshes/7 materiais (folha de zinco F7 `roof` cast false separada das 5 coroas,
  decisão Root, +1 call a medir).
- UV: panos subdivididos projetados no referencial do pano integral
  (`uvPanoR23` — frente −Z u do right do pano, +Z do left, v do bottom; wall
  métrico 2 m, concrete pela largura/altura do pano com a família 3×3);
  retornos com densidade física coerente; `texelEscalada` preservado no
  mergeado. Nenhum material/textura/sampler novo.
- Inspeção encontrou dois defeitos da primeira entrega GLM: partições usavam
  borda esquerda como centro e UV de concreto multiplicava por três antes do
  sampler3×3. Saída bruta preservada, SHA
  `cc5181977c5c427c826c02f0ad4e033c3607050964d83f53838840134e973814`,
  em `CAMPO-R23-AUTHOR-R24-RAW-map_campomorro.js`. Não é candidata aceita.
- GLM `CAMPO-GLM-AUTHOR-R24-FIX.log` concluiu exit0 com os centros e UV
  corrigidos. A última travessa superior ainda retinha a borda como centro;
  Codex corrigiu essa chamada e encurtou comentários. Frente/verso concrete
  usam1/largura e1/altura do pano; retornos usam1/6 para compensar o sampler3
  da família e manter o período de desenho. Nenhum sampler foi alterado.
- `node --check` e `git diff --check` passaram após o ajuste final. Comparação
  somente de bytes confirmou helpers R22, flush R22 e corpo original do loopZ
  intactos (`CAMPO-R23-SOURCE-INSPECTION-R24.json`); isso não mede paridade
  runtime de geometria, material ou física entre os modos.
- Pendências: captura no jogo real, contraprovas/mutantes da proposta,
  inventário executado, fase/período UV efetivos e costuras, custo dos oito
  batches e crítica independente M3. Condições de envelope/ausência de faces
  visíveis coincidentes são intenção do desenho e precisam de conferência
  geométrica e visual. Não foi executado gate/harness/browser/instalação ou
  commit/push. Sem nota M3, sem gate novo, sem FPS afirmado.
- Checkpoint externo final: `CAMPO-M3-CANDIDATE-R23-map_campomorro.js`,
  `CAMPO-M3-CANDIDATE-R23.patch` (delta contra R22) e
  `CAMPO-M3-CANDIDATE-R23-MANIFEST.json`. R22 e as entregas GLM brutas ficam
  preservadas para recuperação. O integrador mantém a decisão sobre adoção.

## R31 — folha F7 pintado-fosco (pending visual)

Crítico fresco aceitou ganho focal M2=2/M3=2 nos 36 PNGs da R30 e REJECT com dois
findings: CU5 vermelho 2688 vs 2424 (NÃO mexido) e P2 — folha F7 usando
`MAT.roof` (rough 0,75 / metal 0,32) viola a BAR 3.2 (rough 0,85–0,95 / metal 0).
Root autorizou a menor correção: clone próprio da folha, mesmo mapa/cor/textura/UV,
cast false, `MAT.roof` compartilhado e coroas/caps legados intactos.

Implementado (R31, arquivo único, fonte base
`d79a0f7fcfcfb20d0565c1ee747107a23e23a8f47014c19276aa615601ad5611`):

- Passagem única GLM terminou exit0, inicialmente com clone e sincronização
  específicos. O Root orientou reutilizar o mecanismo existente; Codex reduziu
  a implementação a `repetido(MAT.roof,3,3)` condicionado à query não0/não1 e
  roughness0,9/metalness0 só no material da folha. A saída GLM bruta fica
  preservada em `CAMPO-F7-MATTE-R31-GLM-RAW-map_campomorro.js`.
- O helper existente registra o clone no mesmo `userData.clones`; o callback
  geral não mudou. A folha recebe clone de Texture com a mesma Source/imagem,
  repeat3×3 e cor. Não há bitmap/URL novo; coroas e MAT.roof compartilhado
  mantêm seus parâmetros0,75/0,32. Queries0/1 não instanciam material extra.
- Única chamada alterada no corpo: `vaoR23(x-1.0, base+0.02, 1.6, 1.95, true,
  folhaF7R23)` do i7 — uuid novo no `batchR23` ⇒ 8 batches/8 identidades de
  material (antes 8/7). Geometria, desenho, contagem 50 std/600 tris e 37 fim
  inalterados.
- CPU focal `CAMPO-F7-MATTE-CPU-R31.json` terminou exit0: query0/original e
  query1/R22 continuam idênticas; a R31 mantém geometria/world e física da
  R23d79. Observados50caixas/600tri,8batches/8materiais. Callback real em replay
  controlado com placeholder confirmou mesma Source/imagem/sampler/cor entre
  folha e coroas. NormalMap/roughnessMap do zinco observado são null; escala
  normal1×1 não é aplicada nesse caso. Não se alegou validação de bitmap/GPU.
- Syntax e whitespace passaram. Pendente: recaptura F7 raw/final e revisão do
  novo ponto fixo, custo dos oito batches e contrato CU-5/inventário. CU5 segue
  vermelho sem alteração; nenhum gate/mutante/browser/install/commit/push.

## Fase 1 R32/R37 — referência independente gerada, selada e verificada

Objetivo desta fase: dados esperados imutáveis para o futuro contrato de inventário,
sem alterar checker/wrapper/package, produto064, CU1–7 ou os nove mutantes. A fase
termina com os três paths abaixo congelados; integração CU8 depende da leitura e
autorização técnica do Root.

- `tools/eval/campo-fachadas-reference.mjs`: GLM-5.3 fez autoria e uma correção
  focal (ambas exit0, logs R36). Na revisão nativa o coordenador corrigiu as oito
  coroas em z±12,5 conforme fonte7ca2 linhas303–304, sem nova rodada OMP; fechou
  procedência/arrays/IDs, removeu rederivação geométrica da carga normal, tornou
  retornos/constantes imutáveis e escrita exclusiva (`wx`). Os brutos GLM ficam
  nos artefatos `CAMPO-FIXTURE-R36[-FIX]-GLM-RAW-*`, sem serem promovidos.
- `tools/eval/fixtures/campo-fachadas-inventory.json`: gerado uma vez pelo CLI,
  45.047 bytes/394 linhas, SHA256
  `db72b51f8cd963a4b3b2947e76b5097f1832701a75ca99c8f67ce8db7db3aae1`,
  pinado no módulo. Os dados novos são literais do desenho RO, não extração da
  candidata. Nenhum buffer, UUID, bitmap, segredo ou path absoluto entrou nele.
- Este ledger registra aceite técnico local, rejeições e próxima ação; não
  declara aceite do mapa inteiro nem conclusão de merge/release.

Procedência: baseline da única fonte aprovada SHA
`7ca2a7de566134c4aa45dad0213e8d2257f1aaef7a5b0a34621ed3a49cb73631`,
commit `26ea02f088f27607335c8a66933a6626eac400df`, path
`public/js/map_campomorro.js`; dependências harness/mapprops/Three vendorizado
hashadas no JSON. O texto aprovado entra por data URL com imports para o próprio
worktree e `export { morroBase }` readonly, sem arquivo intermediário. Só o CLI
explícito importa o harness; sua ponte existente foi conferida antes, sem
criação/reparo de node_modules. O harness importa módulos do jogo, mas o único
builder invocado pelo gerador é `mod.buildCampoMorro` do texto SHA7ca2 aprovado;
nenhum `MAPS.build` da candidata fornece dado esperado.

A extração fez bijeção única por bbox/função (tolerância existente1e-4), não por
índice: 12 coroas + 90 peças X + 100 Z = 202. Remove-se exatamente o conjunto
semântico zpos i6/i7/i8×(verga/peitoril/faixa/borda-/borda+) =15, retendo187.
Os novos acabamentos de cada perfil têm verga10+ombro20+peitoril5+junta2=37,
F6/F7/F8=15/7/15. Assim finish original202/2424tri, r22 e r23224/2688tri.
A fonte do desenho R22 é196458ef…; o desenho RO R23 e seu hash completo constam
no provenance. Não há esperado derivado da medição da candidata em runtime.

Std13 comuns é armazenado uma vez. R22 extra16=(5 paredes+1 remendo+10 folhas)
expande29 (F6/F7/F8=10/9/10,7batches); R23 extra37=(27panos+10folhas) expande50
(F6/F7/F8=18/14/18,8batches/8materiais no produto064). `junta`/
`finishConcrete` são papéis semânticos do inventário de acabamento, não uma
exigência de nomes/UUIDs distintos no material real compartilhado do merge.

Verificado nesta fase (Node22 explícito):

- Syntax e whitespace passaram. `--write-approved` exit0 e
  `--verify-approved` exit0 reproduziram integralmente os mesmos bytes.
  `--validate` exit0 expandiu202/0,224/29,224/50.
- `CAMPO-FIXTURE-CONTROLS-R37.json`:42 controles de dados/API e6 controles CLI
  passaram, incluindo import sem DOM/global/seed/harness, immutabilidade,
  chaves desconhecidas, SHA/commit/desenho/seed incorretos, arrays/contagens,
  IDs duplicados/indevidos, exclusões erradas, NaN/Infinity/volume nulo,
  materiais/roles/cast e dependências inválidos. CLI sem flag/flag errada/extra
  sai2; overwrite, fonte ausente e SHA errado saem3. O JSON ficou intacto.
- O schema é estrutural/semântico; o SHA pinado é a autoridade dos valores
  exatos. Uma bbox positiva adulterada pode satisfazer schema, mas o controle
  comprovou que `loadFixture` a rejeita pelo hash. A carga normal não reconstrói
  fórmulas nem executa harness; só lê JSON, confere selo, valida e congela.
- Somente DEPOIS de gerar/copiar/selar o esperado, foi lido R25 para conferência
  posterior:50/50 caixas stdR23 tiveram um par bbox único e cast igual, sem
  sobras/reutilização; desvio máximo9,1553e-7m. A única diferença de papel de
  material é esperada: folha F7 do R25 antigo éroof, produto064/desenho atual
  éroofPainted fosco. Nenhum esperado foi atualizado a partir desse observado.

API normal: `loadFixture(path?)` retorna JSON pinado congelado;
`validateFixture(value)` valida estrutura fechada, sem geração;
`expectedForProfile(fixture,0|1|2|'original'|'r22'|'r23')` retorna
`{profile,finish,std,counts}` congelado e falha em perfil desconhecido. Não existe
comparador actual ou topologia CU8 nesta fase. CLI `--write-approved=<7ca2.js>`
recusa fixture existente, `--verify-approved=<7ca2.js>` só compara bytes,
`--validate` só carrega. A entrada congelada fica fora do Git e a regeneração é
explícita; o teste normal nunca precisa do fonte completo/harness.

Aceito localmente: reprodução determinística, procedência202 e literais novos,
expansão sem OR ou tolerância nova. Rejeitado: promoção de gerador não executado,
coroas em±30, stdExtra contado como total29/50, oráculo autoatualizante ou
extraído da candidata. Fonte produto segue SHA064288948b0a96b87079b5ebcd1de55bcce1cf9dbe5a05b48ff1e58cff639135.

Artefatos externos no audit2026-10-31-visual-consistency:
`CAMPO-FIXTURE-PHASE1-R37.md`/manifest/frozen3paths,
`CAMPO-FIXTURE-GENERATE-R37.log`, `CAMPO-FIXTURE-VERIFY-R37.log`,
`CAMPO-FIXTURE-CONTROLS-R37.{mjs,json,log}` e
`CAMPO-FIXTURE-POSTSEAL-R25-CROSSCHECK-R37.json`.
Próxima ação: Root ler fixture/API/spec e decidir fase2. Proposta é comparar
geometria real observada com expectativas pinadas por bijeção única, exigir
seis faces/triângulos e visibilidade por peça e por batch, e provar omissão de
jamb+duplicação com total preservado e ocultação de batch, mantendo CU1–7 e
nove mutantes existentes. Não foi implementado nem executado; CU5 segue RED.
Nenhum browser/install/build/gate pesado/QA/commit/push nesta fase.

## Fase 2 R38 — autoria congelada para revisão; PENDINGTEST

Root aceitou a fase1 R37 inteira e a matriz externa
CAMPO-CU8-EXPECTED-CASES-R38.json SHA
245a418c86f9a3bf91009094b5397a66582c0d04070536b9faf1f367048e5bce,
antes de executar qualquer novo teste. São57 execuções previstas e7NA
explícitos:30 nominais/old9×3,26 novos aplicáveis e1default real. Esperados
continuam exatamente os mesmos, sem ajuste posterior a medição.

GLM-5.3 (OMP, sessão74759, max12min, exit0) escreveu checker, wrapper, os dois
fixes de reference e ledger. Exit0 é autoria, não validação. Os quatro brutos
foram preservados em CAMPO-CU8-R38-GLM-RAW-*; log
CAMPO-GLM-CU8-R38.log, prompt/guardR38 no mesmo audit. GLM reportou leituras
extras recusadas pelo guard e trabalhou com prompt e três scripts; o
coordenador leu R32, fixture e fonte por conta própria. O ledger GLM bruto
substituía a história anterior; esta revisão restaurou integralmente o ledger
R37 e acrescentou esta seção, mantendo o bruto para auditoria.

Escrito, ainda NÃO executado:

- CLI perfisoriginal/r22/r23(0/1/2), queries0/1/2/default e validação anterior ao
  harness, com default semqueryR23. TabelaCU5fixa2424/2688/2688; std0/29/50 e
  batches/materiais0/7/8. Fonte externa permanece readonly sem whitelistcandidata.
- CU8 carregaJSON pinado, compara todas as caixasWORLD por bijeção única,
  cast/receive/material/visibilidade de ancestrais/layer0 e desenho efetivo por
  índice/drawRange/grupo; exige6faces completas, cantos, normais/windingoutward,
  dois triângulos distintos por face com diagonal interior e cobertura integral.
- Reference só muda header3→2linhas e exige número inteiro0..2 após normalizar
  nomes; não regenera dado. O driver externo das13rejeições de tipos foi
  congelado sem execução.
- Wrapper preserva9conjuntos antigos por perfil; acrescenta11tipos de mutantes
  novos com aplicabilidade literal e conjunto somenteCU8. NA não gera subprocesso
  e não conta como detecção. Exige8cláusulas únicas, perfil/query/SHA e marcador
  aplicado verdadeiro, rejeitando infra/sinais/timeout/protocolo inválido.
- Default real equery2 real têm8contratos e digest nominal da cena a comparar.
  O digest usa atributos/index/morph/instânciasraw hashados, matrizes e materiais,
  física completa incluindo occluders/camBlockers/spawns/pickups/OBB e16497
  amostrasground do mesmo gridCPU anterior; nenhum UUID ou arredondamento novo.

Revisão nativa anterior a qualquer teste corrigiu defeitos concretos do bruto:
cantosArray.clone, validação do eixoX em duas bordas que diferem noZ, typo
extrair/extrairPerfil, contagens24v/36idx não vinculadas, diagonal e normais
insuficientes, groups duplicados com mesmoMaterial, PBR com margem nova,
Source/sampler incompletos da folha, parent do Group não atribuído, alvo
drawRange incorreto e hash que arredondava/ignorava instâncias/ground/ciclos.
A prova de aplicação usa alteração real do digest (incluindoUV/lock/repeat),
além das verificações locais, e recomputa bboxes reais antes da prova de
envelope. Os corpos dos nove mutantes originais e os critériosCU1–7 foram
mantidos; CU5 só recebe o literal do perfil. Nenhuma hipótese foi chamada de
resultado medido.

Produto064, fixturedb72 e package permanecem imutáveis. Escopo escrito no
worktree: checker/wrapper/reference/esteledger; nenhuma propagação paraQA.
Próxima ação: Root ler patch/casos/driver/frozen4paths e autorizar execução.
Então rodar syntax, driver13tipos, self-testwrapper, três nominais/default e
matriz57/7NA sem mudar esperados; investigar qualquer falha antes de afirmar
contrato verde. Crítico fresco/rechecagem física+material no ponto final e
Git/merge/release pertencem ao integrador. Nenhum syntax/selftest/harness/suite/
browser/install/commit/push foi executado nesta fase até este freeze.

## Root R44 — primeira execução aceita, 01/11/2026 UTC

Root conferiu manifest/hashes e leu checker775linhas/wrapper195 inteiros, os
dois únicos fixes da referência e driver13 antes dos testes. Fonte064,
JSONdb72 e matriz245 permaneceram intactos. Node22: syntax3,13rejeições
reais de tipos,43controles wrapper e nominaloriginal8/8 GREEN. Suite real
completa CAMPO-CU8-FULL-N22-R44.log exit0:57execuções,7NA, todos9mutantes
antigos nos3perfis e26novos aplicáveis com conjuntos exatos; default sem
args tem8/8 e SHA estrutural idêntico a query2. Não é um ajuste do teto
global:2424original/2688nosperfis R22/R23 ficam ligados ao inventário
independente202/224 e topologia inteira.

Node26 syntax3/13tipos/43self tambémGREEN; suite57 emexecução, semresultado
antecipado. Crítico independente integral Campo pós-provas ainda pendente.
Não foi aplicado naQA, não há commit/push/merge nem aprovação artística
geral/mobile/MP. O aceite visual focal/material064 R35 preserva seu escopo.

Node26 completou57/7NA exit0, default=query2 estrutural e conjuntos exatos;
CAMPO-CU8-VALIDATION-R44.json registra hashes de fonte e logs22/26, intactos.
Total114execuções reais,14NA;86selfcontroles e26rejeições de tipos. Crítico
integral fresco ainda pendente, nenhum commit/push/QA/aceite artístico novo.

Root atualizou nativamente o contrato CAMPO-UV-FINISH.md antes do crítico:
CU1–8, perfis/fixture independente, CLI,57/7NA,43self/13tipos e limites reais
da prova de aplicação; fontechecker/wrapper/reference/produto/fixture intactas.
Contrato antigo7/7 e teto único2424 não descreviam a implementação nova.
