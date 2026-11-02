# Skins: integração do owner atual em 2026-11-01

O merge preserva o head atual de #1190, `affb6824a4a10cc99a0511a8737861148b3a60ee`, e os contratos de apresentação já compostos. O objetivo integral segue sendo consistência visual, integração verificável dos owners e release validado pelo Root, excluindo a Operação Flávio. Esta entrega é um checkpoint local para crítica independente.

## Lane e ancestralidade

Worktree exclusiva `worktrees/skins-owner-rebind-20261101`, branch `codex/skins-owner-rebind-20261101`. Primeiro pai `ead5ee72f843b7758a5029bfd90f484bb9544779`; segundo pai obrigatório `affb6824a4a10cc99a0511a8737861148b3a60ee`, conservado por merge normal com MERGE_HEAD. O receipt externo `SKINS-OWNER-REBIND-R63-CHECKPOINT.json` registra o HEAD definitivo e os dois pais após o commit com Signed-off-by (`git commit -s`, convenção do projeto; sem assinatura criptográfica inventada).

O incoming mantém `44084cf796b45f46d6d3dc9bf2267e638994ff82`, seguido pelo merge `41aceda80a6dd586a88736e42f6edea65532082e` de `618fc78b3c8a25bfff1526d8de130957ebbb6f86`, e pelo fix affb682. `1da0bc3f54f4a1d2f230028ff4bd54b6633a8e28` (#1191 original) e `5c522c174b15d7da3f3fc1937ddd0cdb45f12c52` (i18n focal) já são ancestrais de ead5 e permanecem. Owners originais e QA ficaram intocados.

## Autoria e resolução

Lease exata de três paths: `public/js/treta-store.js`, `tests/treta-manifest-readiness.test.mjs` e este ledger. O único delta de produto é o automerge do owner em buy: `state=result;draw();notifyEquipment();...`. A store permaneceu byteidêntica ao automerge inicial, sem edição GLM ou nativa. A resposta de compra já passou pelos guards de epoch/accountId antes de acordar os waiters de inventário.

Uma chamada OMP `zai/glm-5.3`, thinking low, terminou EXIT0 em 49,914 s; prazo externo fixo150 s desde Popen, interno140 s, sem renovação. Guard restrito a read/edit do teste e ledger, oito tentativas no total: duas reads e quatro edits aceitos, duas tentativas edit com header relativo vetadas. Nenhum shell, import, teste ou browser pelo GLM.

GLM resolveu somente as duas zonas do teste e o default necessário do parâmetro `weaponSkins`: conserva o array `ouro-ak`, nome `Barbudo Cyborg` e pack `pack-fixture`, permite override da arma da compra e une `tretaSkinPresentation`/`tretaWeaponPresentation` a `buyForTest`. Os corpos de todos os casos herdados e os quatro novos casos incoming foram comparados byte a byte. Import relativo da store preservado. Nenhuma correção nativa no produto ou teste. Seed/fechamento deste ledger, runner externo e provas são autoria nativa Codex.

Raw congelado antes de qualquer execução nativa: aggregate `audits/2026-10-31-visual-consistency/SKINS-OWNER-REBIND-R63-RAW.jsonl`, 641521 B, SHA256 `c558bd0951c91e5b573ebfb779ed1704b6ab3d09dc08acefc67cc4ea79c3f8be`. `FROZEN.json`, `AUTHORED.patch` e diretório `glm-freeze` do mesmo prefixo preservam o estado PATCH_ONLY_UNRUN e o ledger GLM anterior ao fechamento nativo. A store tem SHA256 `2766b4517890eecd44734ca89a5d291d08c2d54db131b86b240dc601beaa86ba`; o teste tem SHA256 `4f3fd1e4cae3b3131399cb11e66b547e34c3b0c49f34ea93df908533160e62b5`.

## Provas focais executadas

Node22.23.4 e Node26.12.1: **49/49 readiness e 102/102 preview**, sem cancelados ou skips. Sintaxe da store e teste, e diffcheck passaram. Os102 casos de preview permanecem em arquivo e dependências sem delta.

O baseline usa cópia externa byteidêntica do teste final, com sua URL/import relativo original, e store de ead5 extraída do objeto Git em `SKINS-OWNER-REBIND-R63-baseline/public/js/treta-store.js`. Ambos Nodes executaram os49 casos: **47 passam**, incluindo todos os45 herdados e os dois novos de deadline/body; o nominal de compra falha exatamente em `purchase inventory replacement still waits for removed equipment` (false versus true). A segunda falha é a âncora do mutante de compra ausente na store antiga e recebe zero crédito como prova de mutação.

Na fonte final, os quatro novos passam: deadline/body nominal e mutante que limpa cedo, compra nominal e mutante que remove o notifyEquipment real. As substituições afetam o SUT executado; assert.rejects cobra a mensagem causal exata. Os snapshots de pendência são capturados antes da limpeza que encerra a fixture; erro de setup, ausência de âncora ou catch genérico não satisfaz a prova. O teste de compra ainda exige exatamente uma chamada purchase real na API controlada.

Itens OFF executa a store inteira e o buy real, por isso recebeu nominal e cinco mutações existentes no Node22: todos aprovados/rejeitados conforme esperado. Roster expõe apenas skinsDeArmario/tretaSkinsDoArmario em VM, sem invocar buy; essas funções não mudaram. Redesign não lê treta-store. Nenhuma ampliação de suíte nessas duas superfícies foi justificada pelo delta de uma linha. CPU/VM não valida render, conta produtiva, MP humano ou aparelho físico.

O primeiro runner nativo tentou dois filtros negativos de nome que selecionaram os49 em vez de45; ambos os recibos e versões foram preservados em `FOCUSED-FILTER-ERROR*` e `N22-BEFORE-ALL49-FILTER-ERROR*`. Foram rejeitados como seleção de45. O runner final usa deliberadamente os49 sem filtro e adjudica todos os nomes e as duas falhas exatas. Não houve alteração de fonte, expectativas ou crédito a infraestrutura para obter verde.

Proveniência completa: `SKINS-OWNER-REBIND-R63-FOCUSED.json` (comandos, versões, contagens, códigos, hashes e logs), `NATIVE-ADJUDICATION.json` (identidade dos corpos/loja e chamadas do guard), `FINAL-FROZEN.json`, `FINAL.patch` e `CHECKPOINT.json`, no audit aggregate. O checkpoint contém somente os três paths permitidos.

## Limites e próximo passo

Estado: **FOCAL_VALIDATED / INDEPENDENT_REVIEW_PENDING**. Nenhum build, instalação, browser/headless, fullsuite, push, PR, segredo/config/env ou lane de outro owner foi operado. Não é aprovação técnica final, humana ou de release. Root deve rebinder o crítico independente ao HEAD/manifesto definitivo, incorporar apenas achados válidos e decidir a composição com QA, CI atual, aplicação real e gates obrigatórios. Se outro head for adotado, review e evidência devem ser vinculados a esse head.
