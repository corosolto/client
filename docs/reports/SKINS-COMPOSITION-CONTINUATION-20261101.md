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

## Próximo concreto e decisões

Compor #1191 por merge local do pin, deixar GLM resolver compatibilidade mínima; preservar simultaneamente `!pv.travado` e `!pvReducedMotion.matches`, yaw manual e fixtures causais. Boot QA recursivo/origem continua, sem ressuscitar JS_LOCAIS. Preservar grade/rail 72px, piso elástico, rolagem e mutantes UIR13, i18n/backdrop/ownership e aliases atuais G2/Campo.

Fio original `PRRT_kwDOTbwe3M6yWaxm`: global teamPreviewsDone pode falhar se só um lado estiver visível, mas CSS atual esconde ambas `.team-chars,.team-desc` e o cenário não foi reproduzido. Não alterar a flag só por hipótese, nem declarar fio refutado/fixado ou operar o PR original. Root adjudica com código/CSS/app atual.

Rejeitados: overwrite de arquivos inteiros por versões antigas, reabertura de lanes alheias, restore do boot legado, remoção de assertiva para verde e aprovação por CI/body. Nenhum candidato adotado ou release entregue nesta lane.
