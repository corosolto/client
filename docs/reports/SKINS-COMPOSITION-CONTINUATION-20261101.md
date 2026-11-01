# Composição de skins sobre QA: continuação

## Objetivo e limites

Compor os deltas originais #1190 e #1191, nessa ordem, sobre QA `d20f53c1f637fa92cf6c05913876c31d5d733952`, preservando autoria e contratos QA/G2/Campo, Javaporco e itens OFF. Operação Flávio #1158 excluída. Lane exclusiva `codex/skins-visual-composition-20261101`, worktree `worktrees/skins-visual-composition-20261101` do client; aggregate não é Git.

Definição de pronto desta lane: candidato local recuperável com os dois ancestrais originais, uniões compatíveis e provas CPU focais. Elegibilidade, adoção, revisão inteira independente, Estraga atual, app Astro/Ego, gates obrigatórios e release pertencem ao Root e continuam pendentes. Sem browser, headless, build, suites amplas, push, PR, merge remoto, instalação ou nova infraestrutura nesta lane.

## Origem e pré-merge

- QA observado clean em `d20f53c1f637fa92cf6c05913876c31d5d733952`; novo nome de WT/branch verificado ausente antes da criação.
- #1190 original `44084cf796b45f46d6d3dc9bf2267e638994ff82`, delta de cinco caminhos desde `4cf8dd99d813fe7caa323b5e9567df3c86957f1a`. Metadata remota desta rodada: base staging `618fc78b3c8a25bfff1526d8de130957ebbb6f86`, CONFLICTING/DIRTY.
- #1191 original `1da0bc3f54f4a1d2f230028ff4bd54b6633a8e28`, base exata #1190, MERGEABLE/UNSTABLE, CHANGES_REQUESTED na leitura remota.
- Auditoria integral de origem: aggregate `audits/2026-10-31-visual-consistency/REUSE-SKINS-PRS-R58.md`, JSON, evidence e patches. Protocolo `operations/corosolto-hq-20261026/ledger/REVIEW-PROTOCOL-20261031.md`: CodeRabbit OFF, GLM/OMP e crítico independente; Estraga permanece obrigatório.

## Marco validado: #1190

Merge local normal de `44084cf7` sobre a base QA preservou os seis commits de origem. Conflito textual real somente em `tools/eval/treta-items-off-check.mjs`: união de `tr/frase` QA com `AbortController/clearTimeout` da origem.

GLM-5.3 via OMP, low, autor exclusivo dessa resolução focal; demais hunks vieram do merge Git. Chamada limitada a read/edit do caminho exato, sem shell/rede/browser/testes/delegação. Deadline fixo 330 s desde Popen, sem renovação; EXIT0 em 134,375 s. Raw congelado antes de execução nativa: `SKINS-COMPOSITION-R60-1190-RAW.jsonl`, 996911 B, SHA256 `2b784ed226187b47226497b6d4f7d12ffb974c031e86468665fec72fab4489a7`. Fonte/diff congelados em `SKINS-COMPOSITION-R60-1190-FROZEN.json` e `1190-AUTHORED.patch`. Supervisor leu o diff inteiro e não corrigiu produto nativamente.

Provas CPU sequenciais com Node22, após freeze e verificação dos hashes, em `SKINS-COMPOSITION-R60-1190-FOCUSED.json`: prontidão 37/37; itens OFF nominal EXIT0; cinco mutações OFF/approval rejeitadas. Recibos `.log` no mesmo audit. Não provam DOM real, render, conta produtiva, aparelho físico ou MP humano.

Baseline obrigatório antes da adaptação da régua: `SKINS-COMPOSITION-R60-ROSTER-BEFORE.log`, EXIT1, RS1/2/3/4/6 verdes e RS5 vermelha por exigir template `Selecionado:` enquanto o handler QA já usa `frase('selecionado',...)`. Esse vermelho preexistente é aceito como prova do instrumento, não como falha nova de #1190. A asserção será adaptada no marco #1191, sem retirar a cobrança de skin.

## Marco validado: #1191 composto localmente

Checkpoint #1190: `134b34099f13f230de5dbb3c395e468c2752f049`, merge normal assinado com os seis commits originais. O segundo merge normal reutiliza `1da0bc3f54f4a1d2f230028ff4bd54b6633a8e28` e seus doze commits, com pais `134b34099` e `1da0bc3f5`. Branch desta composição continua `codex/skins-visual-composition-20261101`; o recibo final externo fixa seu HEAD após o commit, sem depender de um SHA autorreferencial neste documento.

Conflitos textuais reais #1191: `public/js/main.js` (catch de fallback e loop) e `tools/eval/boot-orcamento-check.mjs`. GLM preservou o catch com `!p.model && previewHeroVisible()`, atualização de idle sob **ambos** `!pv.travado` e `!pvReducedMotion.matches`, yaw manual e render da pose. Boot terminou byteidêntico ao QA: `snapshotPublicJs`/origem vivos, sem restaurar JS_LOCAIS. Merge também preservou o preload de arma QA, grade/rail 72px, piso elástico, rolagem, i18n, backdrop, ownership, aliases G2/Campo e os dois aliases reais de teste em package/CI.

Autoria GLM #1191 foi congelada, mas a chamada **não encerrou limpa**: OMP max-time 320 s encerrou EXIT1 após 321,015 s, dentro do watchdog externo fixo 330 s. Raw `SKINS-COMPOSITION-R60-1191-RAW.jsonl`, 5592069 B, SHA256 `27c921c7a12bea6e5a99ad2681c03235743dd9bac12ec937a3e149078151a921`. Não é clean approval. Fonte/diff: `1191-FROZEN.json` e `1191-AUTHORED.patch`, lidos integralmente nativamente antes dos testes. Uma falha de preparação anterior (prompt ausente após NameError do supervisor) encerrou CLI sem chamar modelo, raw zero B, preservada em `1191-PREP-ERROR-*`; não conta como autoria GLM.

A revisão nativa encontrou oito defeitos nos instrumentos produzidos, registrados em `1191-NATIVE-FINDINGS.json`: perda de aria-pressed original, mutante de frase inválido, freeze mutant usando fixture não mutada, omissão do mutante de slots ocultos, expectativa errada de retorno ao Jogar, matriz mixer/reduced incompleta e duas mutações excessivas. Correção GLM focal autorizada tinha deadline fixo 180 s, OMP 170 s e teto oito tool calls somente nos dois instrumentos. Encerrou EXIT0 em 58,115 s, mas **não escreveu nada**: read do OMP elidiu os hunks e meu guard não aceitava seletores de faixas múltiplas/:raw. Limitação do runner, não bloqueio do projeto. Raw `1191-FIX-RAW.jsonl`, 437346 B, SHA256 `69f3caa0e0de6512a219ca6c7ffd8857e1300775e2a100eb63c42a950e151584`; patch idêntico ao freeze anterior. Nenhuma chamada renovada.

**Correções nativas Codex, sem atribuição ao GLM:** só `tests/character-preview-media.test.mjs` e `tools/eval/roster-skins-check.mjs`. Os oito hunks acima, mais bindings reais de `currentTeam` e expectativas exatas EN/PT do i18n importado. Node22 possui navigator en-US; a suposição PT inicial foi rejeitada. Os doze caminhos sem correção nativa, incluindo as cinco superfícies de produto (main/store/style/lobby/index), permaneceram byteidênticos ao freeze GLM, ver `1191-NATIVE-ADJUDICATION.json`; `1191-FINAL-SOURCE-V2-FROZEN.json` fixa o último conteúdo. Readiness/preview/itens não mudaram depois de passarem. A asserção RS5 cobra a expressão real do handler e seu resultado com e sem skin, preserva ambas aria-pressed, e mutante legal retira só o argumento da skin.

Recibos CPU sequenciais Node22 em `SKINS-COMPOSITION-R60-1191-FOCUSED.json` (logs separados com SHA256):

- `treta-manifest-readiness.test.mjs`: **45/45**.
- `character-preview-media.test.mjs`: **95/95**, incluindo guard combinado, ctrl/mixer travado com reduced false/true, yaw/render preservados, callbacks/pose e mutantes do SUT real.
- Itens OFF nominal e **5/5** mutações rejeitadas.
- Roster nominal **6/6 EN e PT**, seis mutantes rejeitados com só a cláusula esperada vermelha. `sem-skin-na-frase` produz RS5 por não mostrar a skin, sem erro de sintaxe.
- Redesign nominal **49/49**; quatro mutantes de preview e oito da grade rejeitados. Todos os oito da grade provam nominal verde e **somente UIR13** vermelha, pelo protocolo existente. `preview-decode` acende UIR3 e UIR11, pois cicloVideos depende de previewPausa; essa correlação de fonte foi registrada, sem enfraquecer instrumentos.
- Sintaxe focal dos cinco JS/MJS e `git diff --check` verdes.

Runs iniciais de roster com nominal vermelha por binding/idioma não recebem crédito de mutação; foram preservados em `FOCUSED-BEFORE-CONTEXT.json`, `FOCUSED-BEFORE-LOCALE.json` e logs `BEFORE-*`. O vermelho inicial obrigatório de RS5, antes da adaptação, continua `SKINS-COMPOSITION-R60-ROSTER-BEFORE.log`. Guard vetou tentativas fora da lease, headers relativos e write; `SKINS-COMPOSITION-R60-TOOL-AUDIT.json` fixa os números. Nenhum shell/rede/browser/teste foi executado pelo GLM.

Dependências: pacote sem scripts e lock byteidênticos ao QA (`package-lock` SHA256 `71d3ce5035c23ccf0138be98e5ccdbb4bc795062250772724be63f3eef0ec1e0`) antes do symlink ignorado `node_modules` para o QA. Nenhuma instalação ou modificação de conteúdo. Fonte limitada à união Git de 14 caminhos mais este ledger (máximo 15); boot sem delta líquido.

## Próximo concreto e decisões

Root recebe HEAD, diff líquido vs `d20f53c1f637fa92cf6c05913876c31d5d733952`, manifesto SHA256 dos 14 caminhos mais este ledger, raw e recibos. Deve decidir quando inspecionar/adotar após a sequência de merges parent, executar app Astro/Ego real (desktop/mobile, skin/conta/posse, navegação e pose), avaliar bot/fio atual, fazer revisão inteira independente e Estraga/gates obrigatórios atuais (incluindo os 107). Nada disso foi substituído por VM/regex. Candidato **não elegível, não adotado e não lançado** nesta lane; nenhum push ou GitHub write.

Fio original `PRRT_kwDOTbwe3M6yWaxm`: global teamPreviewsDone pode falhar se só um lado estiver visível, mas CSS atual esconde ambas `.team-chars,.team-desc` e o cenário não foi reproduzido. Não alterar a flag só por hipótese, nem declarar fio refutado/fixado ou operar o PR original. Root adjudica com código/CSS/app atual.

Rejeitados: overwrite de arquivos inteiros por versões antigas, reabertura de lanes alheias, restore do boot legado, remoção de assertiva para verde e aprovação por CI/body. Nenhum candidato adotado ou release entregue nesta lane.


## R61: legenda dinâmica respeita o idioma

Base deste microfix: `a32b31b36f8a6ad1d04d932947fa8a0bc435d87a`, composição #1190→#1191 clean. Crítico independente R61 encontrou P3 real: Pintura/Pistola/Prévia indisponível eram strings dinâmicas PT mesmo em `?lang=en`; translateDom roda uma vez e não observa mutações futuras. Zero P1/P2 informado pelo Root. Browseridle explícito do Root em 01/11 02:36Z antes de qualquer edição deste marco. Lease somente main.js, preview test e este ledger; nenhum outro produto/CSS/boot/instrumento.

Uma chamada GLM-5.3/OMP low, deadline externo fixo120s desde Popen, OMP110s e teto8 chamadas read/edit. Encerrou EXIT0 em107,690s, sem renovação. Raw `SKINS-I18N-R61-RAW.jsonl`,1296184B SHA256 `a39416993a0836882f86140b6e968c9bb4d41501529b7f4da0e27b6fd4dc9eb2`; `SKINS-I18N-R61-FROZEN.json` e `AUTHORED.patch` congelados antes da leitura nativa e CPU. Guard vetou seletores não suportados/paths relativos e a nona tentativa; ledger não foi escrito pelo GLM. Isso é autoria, não aprovação independente.

Produto autor GLM: helper local mínimo consulta o LANG já importado/resolvido pelo i18n real, traduz Paint/Pistol/Preview unavailable nas cinco chamadas, preserva nomes próprios de skin/pintura. A assinatura real do helper compartilhado frase(id,...args) não comporta pt/en nem possui essas chaves; nenhum pseudotr ou biblioteca nova foi usado, e i18n.js permaneceu intocado. Tokens, cache keys, src, fallback, visibilidade, ciclo de vida, freeze/reduced e yaw ficaram idênticos.

Testes autor GLM, com **uma correção nativa Codex** após revisar o diff inteiro: o novo mutante tinha passado mutate como segundo argumento ignorado da fixture; foi movido à tabela causal existente, cujo wrapper realmente muta o SUT e espera a asserção EN falhar. Nenhum produto corrigido nativamente. Este ledger foi atualizado nativamente depois da validação. Diff/fonte dessa correção congelados em `SKINS-I18N-R61-NATIVE-REVIEWED-FROZEN.json` antes de executar testes.

CPU focal Node22 e Node26: **102/102 preview em ambos**, preservando os95 casos anteriores e adicionando6 casos PT/EN e1 mutante causal de idioma; sintaxe main/test e diffcheck verdes. Fixtures executam o resolver inicial real de i18n.js com `?lang=pt/en`, depois os helpers reais de main.js; cobram legendas exatas de pintura/arma, indisponibilidade hero/stopVideo e cards compactos seleção/hub. Nomes Barbudo Cyborg e Ouro permanecem intactos. Probe do mesmo fixture com main.js pinado em a32 reproduziu as3 falhas EN antes, manteve PT correto, e passou as6 combinações de idioma/superfície atuais; sem editar o SUT para o baseline. Recibos e hashes: aggregate `audits/2026-10-31-visual-consistency/SKINS-I18N-R61-FOCUSED.json`, logs N22/N26-PREVIEW e N22/N26-BEFORE-AFTER; script audit `SKINS-I18N-R61-BASELINE-PROBE.mjs` somente extrai a fixture existente e compara os dois fontes.

Root informou QA Campo adotado em `5732b65` e iniciou push normal com107 gates; essa execução não pertence à lane skins. Root também guardou o teste Ego mobile guest de a32 (`SKINS-LOCAL-MOBILE-GUEST-R61.json` e PNG): retrato visível, hero3D oculto, sem vídeo ativo, Loja remove e Jogar restaura. O403 inicial da API era histórico: o GET posterior respondeu200 anônimo, inventário0 e catálogo76; posse/equipamento autenticados não foram exercitados. Esses relatos não substituem nova revisão visual no HEAD deste marco. Próximo: Root rebind do mesmo crítico independente ao novo HEAD/freeze R61, decisão de composição sobre QA atual e gates finais após adoção. Sem browser/headless/build/fullsuite/push/PR nesta lane. Candidato continua não elegível/adotado/lançado.


## Composição local na base QA R61

Root criou a lane independente `codex/skins-visual-stack-20261101`, preservando
intacta a candidata 5c522c1 e seus ancestrais #1190/#1191. Merge local ae5b787
incorpora a QA5732b65 sem conflitos nem alteração nas14 fontes herdadas;
o diff líquido continua nos mesmos14 caminhos. Root leu a crítica i18n
inteira e reconferiu15 fontes e38 logs sem divergência. SC61-P3-1 fechado;
sem aprovação final do novo PR ou release.

O push normal da QA ainda está em andamento. Outra lacuna da régua CU-8
foi reproduzida e será corrigida na lane Campo própria; nenhum produto de
skins depende dessa mudança, mas a base deverá ser atualizada antes do merge.
Próximo: exercício real EN/UI no Ego após o gate corrente terminar, rebind
da composição, push normal próprio e PR empilhado, mantendo a QA imutável.
Sem posse/equipamento autenticado, MP ou aparelho físico validados.
