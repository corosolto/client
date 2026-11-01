# Régua de origem TP — continuação R780

Objetivo integral: consistência de mapas/personagens/skins/movimento/arma/ADS,
integração dos PRs e release/backend conforme ledger Root. Flávio/#1158 excluído;
UI/redes depois. Root é único autor do runtime e publisher. Esta lane escreve só
o instrumento isolado, sem crédito Native independente do plano S3 R687.

## Ponto e definição de pronto

WT tp-glove-origin-runtime-r770-20261101, branch de mesmo nome com prefixo codex/,
HEAD a4bb086b26d8b64e7a8ac70a10a7ce6e830f4e67. Parent contém fábrica S3 e reparo
R771 da fixture de preview; runtime ainda F2. Somente este ledger e o novo
`tools/eval/tp-glove-origin-check.mjs` foram escritos, sem package, produto,
shipping manifest/GLB ou checkers S1/F2 antigos. Nenhuma fixture extra necessária.

A PREP R770 de12fixtures/25cláusulas/15mutantes/44workers é proposta histórica
UNRUN, **substituída** pela lease R780 mínima. Não existe gate adicional de25.
O instrumento corrente define8cláusulas em8processos frescos:

|ID|Escopo|
|---|---|
|O1|API por template efetivo ou null; handle frozen, key distinta base/Drip, ready getter booleano dinâmico; fallback/legado base|
|O2|Manifest base antes de Drip; cargas frias/quentes, duas geometrias próprias e um I/O por origem|
|O3|Ordem do manifest e dos atores invertida; mesmas garantias de frio/quente|
|O4|Clone base com skin pedida ainda ausente conserva handle quando cache cosmético aquece; corpo novo usa Drip|
|O5|Pedidos concorrentes por key e A→B→A; resposta B antes de A não troca família/corpo atual|
|O6|Variante Drip ausente: manifesto uma vez, zero GLB errado, negativo estável20ensures|
|O7|SHA cosmético diverge somente no último dígito: rejeição integral, zero I/O errado, estabilidade|
|O8|Duas variantes elegíveis em packs distintos: rejeição mesmo com mesmo URL, zero I/O errado|

Reusa Game, GLTFLoader, harness e fábrica oficiais. Fábrica gera manifest e GLB
candidato em RAM uma vez; transporte interno para filho não escreve assets.
Partes são conferidas por identidade da geometria realmente parsed, bones do
clone, parent, IBMs, bindMatrix e bindMode. CPU1×1 não aprova pixels, fit ou MP.
Continuidades de emote/recarga/fire/flinch/máscara/descarte serão comprovadas
pelos checks S1 existentes após o produto, sem duplicar toda a matriz aqui.

## Baseline anterior ao produto

R780 BASELINE-V1, Node v22.23.4 pelo executável22 designado, exit1:
RED/FEATURE_ABSENT, somente O1 false, sete fixtures dependentes UNRUN. Namespace
importado com sucesso; Game e GLTF reais carregaram corpo base24joints e
bolsonaro-drip26joints. Não é erro de importação, timeout, processo ou asset.
Fábrica real gerou em memória candidato98328B SHA256
3812b3ed50bac9d6fb2b7fdb6c5306d219345d896328610f0e8bb0da240db6e9.
Sintaxe Node22 passou. Produto/fontes/manifest shipping ficaram byte exatos
antes/depois; recibo contém hashes. Não há nominal8/8 nem detecção de mutante.

API ausente é observada por namespace/typeof, sem importar um named export
inexistente. Esse modo só é permitido em O1 RED e jamais recebe GREEN parcial.
Import/parse/processo/fonte/recibo inválido continua INFRA3. Cli inválido sai2;
falha semântica sai1; GREEN0 só com as8fixtures e protocolo completo. Cada
filho tem45s/paiporfilho60s. Não esperar URL não despachado evita transformar
omissão semântica em timeout. Não há matriz de mutantes nesta entrega.

## Contrato futuro e próximo passo

Root deve ler fonte inteiro e baseline congelado antes de escrever runtime.
API: getGloveHandle(charId,skinId=null), handle frozen{key,get ready(),preload()}.
Base publicada não tem source.kind; origem vem de path/SHA/family/char existente.
K1 evolui explicitamente para demanda de manifesto1/GLB errado0/negativo estável;
K2/K3 de recusa no setter/nascimento sem variante cosmética permanecem. Nenhum
checker antigo foi editado. Reancoragem S1/F2 fica em lease posterior.

Depois da implementação por Root: rebind de fontes e execução8/8; só então
provas causais/negativos de protocolo, críticos independentes e integração do
alias. As sete branches futuras deste checker estão somente syntax-checked e
UNRUN, portanto ainda podem precisar de reparo de instrumento. Não inferir
GREEN ou prontidão por este baseline RED correto. Git checkpoint não feito:
lease proibiu Git/GH writes. Artefatos recuperáveis e fonte integral ficam em
`audits/2026-10-31-visual-consistency/TP-GLOVE-ORIGIN-R780-*` no agregador.

Root checkpoint R784: li o instrumento inteiro e a baseline real antes de alterar produto. Rebind de 17 referências sem drift, incluindo os três runtimes e ambos os manifestos. O1 reprova por API ausente; sete casos continuam UNRUN. O instrumento ainda não participa dos portões automáticos. A implementação, os mutantes e a aceitação visual continuam pendentes.
