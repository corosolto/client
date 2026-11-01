# Continuidade do tip novo de #1191

A missão integral continua sendo integrar PRs elegíveis e verificar o release, melhorar consistência de mapas/personagens/skins/armas conforme PDF, roadmap e métrica. Operação Flávio #1158 fica fora; Javaporco e os worktrees de itens permanecem com seus donos. Fluxos de UI e redes sociais vêm depois. Este recorte compõe o tip novo de #1191; arte, posse autenticada, mobile físico e MP continuam sem aceite.

## Ponto congelado

Worktree próprio `worktrees/skins-owner1191-tip-20261101`, branch `codex/skins-owner1191-tip-20261101`, base `faa8d6fb239c2f668d5a03579c244633fe79167c`. Merge do tip `2c09846fcaac62afbf4b4724a03955b7c3120e74` de #1191. São seis commits exclusivos na primeira linha, partindo do original `1da0bc3`; o primeiro também une `affb6824` de #1190, já ancestral da base. O head remoto foi reconferido e continuava2c. QA, staging e checkout do dono não foram alterados.

O merge inicial deixou quatro conflitos. Uma chamada GLM-5.3 low via OMP resolveu `main.js`, os testes de preview e readiness e o verificador de roster. A execução terminou exit0 em118,043s, com prazo externo180s/interno170s. Ferramentas ficaram restritas a read/edit dos quatro arquivos; tentativas fora da interface foram recusadas. Patch, raw e hashes autorais foram congelados antes dos testes. Os auto-merges do alias, CSS e `glbchars.js` foram preservados. O readiness foi resolvido com a fixture existente e ficou byteigual à base. Nada de asset, dependência ou lockfile foi alterado.

## Review atual e prova do consumidor

As três superfícies completas de #1191 estão em `SKINS-OWNER1191-TIP-R64-REVIEW-SURFACES.json`, com paginação final conferida. O review `5726243849`, atual em2c, tem um achado grave, inline `4434261104`, thread `PRRT_kwDOTbwe3M6yW8_f`: pede que um mutante sobrevivente termine com exit3.

A prova em Node22/26 refuta essa sugestão para o consumidor real, que usa `! node ... --mutante=...`. O checker real com uma mutação aplicada mas semanticamente inócua terminou0 e o alias o recusou com1. Alterar somente o exit do sobrevivente para3 fez o mesmo alias passar falsamente. O nominal termina0 e os sete mutantes aplicados terminam1 pela asserção esperada, em PT e EN. Ambos os nomes `sem-skin-na-frase` e `sem-nome-skin` permanecem aceitos. Nenhuma resposta/resolução pública foi feita por este agente.

Limitação preservada: o alias por negação também aceita uma entrada desconhecida2. Esse controle não recebeu crédito de detecção semântica e não houve alteração ampla do contrato do runner.

## Resultado rejeitado e ajuste aceito

A primeira execução de preview passou145/147 e falhou nos dois casos herdados de captura travada com movimento reduzido: esperavam dois renders em dois ticks, mas a otimização nova desenhou o primeiro e pulou o segundo idêntico. Uma proposta Native de isentar a captura dessa otimização passou147/147, mas foi rejeitada após ler o caller `skins-gauntlet`: ele exige pose/imagem determinísticas, não redesenhos duplicados. A proposta e seu AFTER ficam preservados como rejeitados, sem crédito para o candidato final.

O produto e o anchor do mutante voltaram aos bytes autorais exatos. A única mudança Native final no código foi de teste: os dois casos dinâmicos locked+reduced agora esperam um render; `updates=0` e `yaw=0.37` foram preservados. Os dois casos locked sem reduced continuam exigindo dois renders. Os102 nomes herdados estão presentes nos147 casos atuais; duas expectativas de contagem foram revisadas explicitamente, portanto isso não alega igualdade semântica integral de todos os testes antigos. A otimização de redesenho, suas invalidações e as verificações de pose continuam exercitadas.

## Verificação final de CPU

Artefatos externos no audit `audits/2026-10-31-visual-consistency`, prefixo `SKINS-OWNER1191-TIP-R64`:

- `FINAL-FROZEN.json` e `NATIVE-TESTONLY.patch`: congelamento antes da verificação. Todos os arquivos de produto coincidem com o freeze GLM; a única mudança final posterior é a expectativa dos dois testes.
- `FINAL-FOCUSED.json`:147/147 preview e49/49 readiness, com syntax dos quatro arquivos JS/MJS, em Node22/26.
- `CONTRACTS-FOCUSED.json`: roster nominal e sete mutantes em PT/EN nos dois Node; controles de sobrevivência/consumidor acima. Sete nominais novos falham semanticamente na fonte FAA8 e passam na atual; nenhum erro de anchor foi contado. Uma execução da suíte anterior confirmou os102 nomes herdados.
- `REMAINDER-FOCUSED.json`: redesign nominal e itens OFF nominal+cinco controles de asserção, além de `git diff --check`, passaram. A primeira tentativa de redesign falhou antes de qualquer asserção por falta de `sharp`. Foi acrescentado um symlink ignorado para o `node_modules` já instalado no QA, após conferir lockfile e package fora de scripts; sem install, cópia de ambiente ou crédito para a falha de infraestrutura.

Não houve browser, render, headless, build, pacote completo de gates, push, mutação pública de PR ou release por este agente. O coordenador continua sendo o único operador do Ego e do caminho arma/mãos.

## Próximo passo

Entregar o checkpoint de merge local com ancestry de FAA8 e2c, fontes e artefatos ligados por SHA. O coordenador ainda deve executar o crítico focal independente, verificar os fluxos visíveis no navegador, adjudicar o fio atual do bot e compor o próximo head de QA antes de qualquer push normal, merge remoto ou release. As demais frentes da missão permanecem no ledger principal `VISUAL-RELEASE-CONTINUATION-20261031.md`.


## Continuação R65: aviso de falha no hub

O checkpoint `bf3a326484425329993ec16b40efbaf78f3a459b` ficou pendente e não foi adotado pelo QA. O crítico independente `CRITICO-SKINS-OWNER1191-R65.md` leu o recorte inteiro e encontrou R65-S1, P2: `.hub-character .pv-equipment{display:none}` oculta o único aviso quando modelos/retratos falham. O coordenador confirmou em Ego desktop EN convidado, bloqueando temporariamente os três assets públicos selecionados. JSON e imagem BEFORE foram lidos nesta frente: o texto estava correto e o ancestral estava oculto. Isso é controle de falha de rede, não uma corrida nominal.

A correção adiciona estado de falha no hero e uma exceção CSS restrita a esse estado. O aviso ocupa o centro do palco vazio, mantendo captions normais no card e a legenda de arma do hero oculta para evitar duplicação. Sucesso do retrato/GLB, troca e limpeza da tela removem o estado. Vídeo válido cobre o erro; parar o vídeo restaura o aviso do retrato ainda indisponível. Tokens e textos PT/EN permanecem nos caminhos existentes. A função de compatibilidade `resolvePreviewCharacter` continua byteigual a bf3a; `Object.hasOwn` e seus anchors são de outra lane.

### Autoria e resultados rejeitados

- R65: GLM-5.3 low encerrou no limite interno com exit1 em140,765s (prazo150/140s). O parcial de três arquivos foi congelado e não foi aceito. A inspeção e um probe externo de funções reais encontraram uma ordem ainda incorreta: vídeo válido primeiro, erro do retrato atual depois reativava a área de erro. O BEFORE falhou1/1; não é captura de browser.
- R65B: uma rodada nova90/80s terminou exit1 em81,1s sem alterar nenhum arquivo. O guard deste agente permitia ler só o contexto, enquanto o editor hashline do OMP exige snapshot do arquivo alvo. Essa falha de preparação não recebeu crédito de conserto. Fontes e patch ficaram idênticos ao parcial anterior.
- R65C: o orquestrador Native foi corrigido e testado sem modelo nem edição. Leituras reais limitadas geraram os dois snapshots; o guard permitiu os ranges e recusou arquivos inteiros, ranges fora da área, mais de180 linhas e outro worktree. A última autoria GLM60/50s terminou exit0 em32,236s, com duas leituras limitadas e dois edits. O helper passou a exigir falha ativa e ausência de vídeo visível; o teste reverso e o controle negativo foram completados. Não houve alteração Native de produto ou teste após esse freeze.

A diferença final de código foi lida inteira. Os153 casos atuais contêm os147 herdados; removendo apenas o bloco novo de seis casos, o arquivo de teste volta aos bytes de bf3a. A qualificação histórica R64 dos dois contadores de render permanece. A chamada exit0 não transforma os parciais rejeitados em sucessos retroativos.

### Verificação final de CPU

`SKINS-OWNER1191-ERROR-R65C-FOCUSED.json` registra153/153 preview e49/49 readiness em Node22/26, syntax dos dois arquivos JS/MJS, redesign nominal e `git diff --check`, todos verdes. O controle negativo exige anchor único fora do assert causal e viola a mesma asserção de estado usada pelo nominal. Não há crédito para replace que não aplica.

O probe externo mantém exatamente os mesmos bytes de teste (`c414abb62c1c1595ac3838548a2c39434cff09c8c2f1e93709fe01509a385456`): BEFORE Node22 falhou1/1; AFTER Node22 e26 passaram1/1 com o vídeo já visível quando o erro atual chega. Fonte/estado e descarte de callbacks foram medidos em CPU. Esses testes não calculam CSS nem certificam visibilidade de ancestrais.

Os artefatos R65, R65B e R65C ficam no audit externo, sem raw, logs ou binários no commit. A resposta pública anterior do #1191 já foi feita pelo dono: o coordenador reconferiu a API às03:49 e confirmou o fio `PRRT_kwDOTbwe3M6yW8_f` resolvido, reply `4434269143`, review `5726252684`. O texto R64 acima conserva a fotografia inicial; não repetir resposta/resolução.

### Próximo passo R65

Entregar o microcommit local sobre bf3a com os quatro caminhos desta correção e hashes. O coordenador ainda deve conferir falha e recuperação reais no Ego em PT/EN, incluindo todos os ancestrais CSS, e obter crítico focal fresco. Não houve browser, headless, build, full gates, push, alteração de PR, QA ou release por este agente. A missão integral permanece no ledger principal.
