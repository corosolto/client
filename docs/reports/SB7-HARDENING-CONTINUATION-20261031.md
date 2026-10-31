# PR #1167: preservação de falha e diagnóstico de infraestrutura

Esta lane é parte da missão completa de consistência visual, integração de PRs e
release de dez horas. Continuidade geral em
`../consistencia-visual-release-20261031/docs/visual-consistency/CONTINUATION.md`.
Operação Flávio continua excluída. Não escrever na branch original do autor.

Branch `codex/harden-sb7-1167-20261031`, base PR #1167
`d4e0ccfda3d5dfb51a296a7a542deb3015fb41d0`. Worktree exclusivo com dependências
instaladas por `npm ci`; não compartilhar node_modules com outra lane.

Revisão GLM integral dos 16 arquivos está foraGit no audit da missão:
`GLM-REVIEW-1167-RESULTADO.md`. Achou SKIP sobrescrevendo falha já medida,
prioridade de falha na mutação SB7, timeout/sinal sem classificação e cleanup
de temporários contornado por process.exit. Antes de merge: verificar cada item,
corrigir os válidos com prova RED/GREEN/causalidade, revisão GLM final limpa e
crítico independente readonly do diff inteiro (base main e correções).

CodeRabbit não está habilitado; protocolo explícito do dono em
`operations/corosolto-hq-20261026/ledger/REVIEW-PROTOCOL-20261031.md` no agregador
autoriza GLM + crítico independente. Nenhum merge/push ocorreu nesta lane.

Próximo passo: builder GLM corrige o contrato preservando prioridade da falha,
sem transformar infraestrutura em aprovação ou ampliar escopo de produto.

## Lease GLM-SB7-FIX (builder GLM, 31/10/2026)

Arquivos sob lease exclusiva desta lane até a devolução: `tools/eval/sonda-filho.mjs`,
`audio-proveniencia-check.mjs`, `shader-budget-check.mjs`, `lajes-visual-check.mjs`,
`lajes-soundscape-check.mjs`, `escadao-audio-pack-check.mjs`, `mansao-audio-pack-check.mjs`,
`runner.mjs` (leitura), demais `.mjs` do PR #1167 (leitura) e o gate novo
`tools/eval/sonda-filho-check.mjs`. Fora de escopo: produto, GLB, `package.json`,
CONTRIBUTING, branch do autor, push/merge. Relatórios em
`audits/2026-10-31-visual-consistency/GLM-SB7-FIX-*`.

## Resultado GLM-SB7-FIX (31/10/2026, lease devolvida)

Os 4 findings da revisão eram válidos e foram fixados com régua RED/GREEN: `pula`
preserva `exitCode` (vermelho medido vence SKIP), PRV13/PRV14/LSA9/escadeão/mansão
decidem a causa após o `finally` (0 mkdtemp vazado, medido), mutante SB7 não medida
sai 1 quando outra cláusula reprova, e `causaNaoMedivel` classifica signal/timeout
como não-medido. Gate novo `tools/eval/sonda-filho-check.mjs` (verde no fix, morde o
mutante do `pula`) — **ainda não wired no `check:fast`**: `package.json` está fora
desta lease, integrador deve acrescentar `eval:sondafilho`. Evidência completa em
`audits/2026-10-31-visual-consistency/GLM-SB7-FIX-RESULTADO.md`. Pendente para o
merge: crítico independente do diff inteiro (base main + estas correções).

## Conferência Root 10:22 UTC

Builder devolveu lease. Root repetiu sonda-filho-check:10/10 GREEN, log root-sb7-filho-final.log. Wire eval:sondafilho inserido em check:fast e check:deploy; revisão integral GLM + crítico independente ainda pendentes. Package não muda dependências. Sem merge/push.

## Conferência Root 11:08 UTC

R2 expirou sem relatório final e deixou `if(false)` de mutante no guard de caminho
local. Root detectou SFS11 RED, restaurou regex (relativo/absoluto/file:/drive) e
repetiu15/15 GREEN + docs25blocos/32marcadores; logs root-sb7-R2-restored-guard.log
e root-sb7-R2-docs.log no audit. Não aceitar resultados anteriores ao hash final.

Revisões integrais entregues: GLM-SB7-INTEGRAL-R3-RESULTADO.md e
CRITICO-SB7-INTEGRAL-R3.md. Crítico encontrou3P2 (SB7 estático RED apagado pelo HTTP
UNKNOWN, proveniência irmã RED apagada por flaginfra global, texel falha anterior
apagada por SKIP posterior) +P3 mensagem de pack completo semmedição. GLM também
aponta texel, ponteiro CONTRIBUTING e cobertura file:/drive. Corrigir TODOS os
casos concretos; diferença de severidade não refuta evidência. Próxima lease
builder R3 só callers/fixtures/doc, sem tocar branch autor ou package. Mutantes
devem usar tmp/memória ou finally com hashantes/depois, nunca deixarresíduo.

## Marco validado — 11:32 UTC

Root repetiu sonda-filho-check20/20, exit0, log agregado root-sb7-R3-final.log; docs25blocos/32marcadores, exit0 em root-sb7-R3-docs.log. Revisão GLM-SB7-INTEGRAL-R4-RESULTADO.md CLEAN e CRITICO-SB7-INTEGRAL-R4.md CLEAN por leitura integral independente,18hashes estáveis; não houve smoke de produto nesta mudança de ferramentas. Regra fail medido vence SKIP fechada nos callers SB7/PRV/texel, packs só afirmam PASS integral com filhos medidos.

Checkpoint recuperável dos17arquivos de implementação/doc/wire e este ledger. Próximo: integrar main atual nesta lane, resolver apenas conflitos próprios, conferir se os hashes relevantes mudaram, executar pre-push/CI e pedir Estraga-código no head novo. Não alterar branch original do autor; o PR isolado deve deixar relação com1167 clara. Nenhum merge/release nosso até este marco.

Main00e746b5a integrada nesta lane às11:33UTC. Quatro conflitos só nas listas geradas check:fast/check:deploy e docs: preservar listas atuais de main e inserir eval:sondafilho, chave do script preservada. docs:check pós-resolução GREEN. Fontes da sonda/callers não conflitaram. Próximo: pre-push e PR isolado sobre main, sem editar branch original.


## 2026-10-31T15:13:58.716668+00:00 — sincronização1183

PR1181HEAD03008374bb ficouDIRTY apósmainec7cec33405 hotfixarmasinvisíveis. Árvorelimpaantesmergeconfirmada. QuatroconflitossólistasgeradasAGENTS/docspt/en epackage. Resolvidospelamainrecebida+preservarevalsondafilho eappendsfast/deploy, docsregenerados. FontesSB7nãoalteradas; crítico byte-a-byte e focalnodes emcurso, mergecommit/push/novoEstragapendentes. Missãode10h noWTvisualcontinua; nãoeditarbranch1167autor.


## 2026-10-31T15:16:00.705351+00:00 — syncvalidada

Críticoindependente CRITICO-SB7-MAIN-SYNC-R1.md089fb216CLEAN:31/31hotfixidênticosMERGE_HEAD,18/18fontes/docsSB7idênticos03008374b; índice resolvido, packagepreservamain+evalsondafilho/appends. FocalRoot4/4GREEN67.8s. Próximo mergecommitpróprio/pushnormal eEstraganovoSHA; nenhumPRmerge/releaseaqui.


## 2026-10-31 — revisão PR1181 ENOBUFS / lease focal

Objetivo: impedir que status null sem signal (ENOBUFS/maxBuffer) seja classificado
como medido e vire detecção TEXEL. Estado inicial limpo confirmado em
`3de33b4f55a6047978508d4d21c9bf09fad4c7ab`, branch
`codex/harden-sb7-1167-20261031`. Root autorizou OMP GLM-5.3 para reproduzir
maxBuffer1 real, corrigir null não-medível e acrescentar provas causais; nenhum
commit/push/resposta ou edição na branch original1167. Lease limitada a
sonda-filho.mjs/check, doc do contrato e este ledger; produto/package intocados.
Definição de pronto: RED antes, GREEN depois, caller TEXEL sem falso PASS,
sinal/código/timeout e prioridade de falha preservados, revisão independente
posterior pelo Root. Próximo: builder GLM focal e repetição Node.

### Marco causal antes do fix — ENOBUFS

Root aprovou ampliar guarda para erro real de execução antes de status0:
filho com handlerSIGTERM sai0 após maxBuffer1 e produz ENOBUFS/signalnull.
Prova Node própria no caller real texel-mutantes, em árvore privada:
antes saiu0 com MATOU uv-fixa/1mutanteMORTO apesar de erro ENOBUFS.
Artefatos externos `sb7-enobufs-r1-root/{before.json,texel-before.json,
texel-probe.mjs,before-sonda.mjs}` no audit da missão. Não aceitar apenas
guarda statusnull; status0 semerro e REDsemântico1 semerro devem continuar
medidos. Próximo: incorporar correção+regressões e exigir78/nãoMATOU depois.

### Fechamento focal ENOBUFS — 2026-10-31T17:37:17.297088+00:00

OMP `zai/glm-5.3` sessão92046 terminou1 DeadlineExceeded8min sem alteração
nem relatório: tentativa rejeitada, não aprovada como entrega GLM. Codex concluiu
o guard mínimo autorizado Root: null sempre não-medível e erro real do executor
vence status0; código/sinal/timeout permanecem no diagnóstico. Sem erro real,
0 e REDsemântico1 continuam medidos. Doc atualizada; só helper/check/doc/ledger
modificados nesta WT. Nenhum caller/produto/package/branch1167 original tocado.

Régua nova antes do fix: SFS8a/SFS8b RED; caller TEXEL real privado exit0/MATOU
com ENOBUFS. Repetição extensa before interrompida por orientação Root após
provas focais (não é placar integral). After:10cláusulas de sonda+2de TEXEL
extraídas literalmente do gate GREEN12/12; caller privado agora78, ENOBUFS,
semMATOU, arquivo restaurado. SFS18 preserva fail→skip1, skiplimpo78 e
positivos de detecção0. Node--check2 e gitdiff--check GREEN. Não houve suíte
completa/visual/browser/prepush.

Relatório `SB7-ENOBUFS-FIX-R1.md`, patch e provas em auditroot externo
2026-10-31-visual-consistency/sb7-enobufs-r1-root. Fontes congeladas para
crítico independente Root; sem commit/push/resolve/reply. Próximo: review
independente deste diff, então Root decide commit, push normal e novo Estraga.


18:31 UTC — Crítico independente014e6981 CLEAN:51asserçõespróprias, ENOBUFSrealstatus0/signalnull eTEXELrealbefore0MATOU→after78semMATOU/restauraçãoexata, semântico1+skip+REDantesSKIPpreservados. Quatrohashesestáveis. Fonteaprovadaparacheckpoint/pushnormal; fullsuite/mainintegration/CI/EstragaSHAatualpendentes.


2026-10-31T18:31:15.273211+00:00 — Mergealpha132 críticoindependentebd67657f CLEAN743asserções:716aliasesmain,sequencesfast/deploy+sonda1×,12normaispaths/lock132preservados. Rootfullsondafilho/docs/normalquality/equivalence4/4GREEN15s; próximaaçãopushnormalcomhooksobrigatórios, EstragaactualSHApending.
