# Quebrada frontage R98

## Objetivo e contrato

Investigar uma frente funcional voltada à viela oeste, preservando o acabamento UV2 aprovado apenas no foco M2. O objetivo integral de consistência, merge e release continua; UI e social ficam depois. Esta lane não promove o candidato no PR1188.

Base: `b808e1456db974bb8552ad86cfb804e96f7787bb`. Branch: `codex/quebrada-frontage-r98-20261101`. Worktree: `worktrees/quebrada-frontage-r98-20261101`. QA e OWN pertencem ao Root e permanecem fora desta lease.

Contrato autorizado: `audits/2026-10-31-visual-consistency/QUEBRADA-FRONTAGE-ROOT-CONTRACT-R98.md` no workspace pai. Apenas `public/js/map_quebrada.js`, régua focal necessária e este ledger. Root é o único operador de browser e decide a captura comparável, movimento na viela e crítica independente.

Piloto: girar a unidade inteira `fav_house`, com todas as partes acopladas, somente nos placements locais do `quarteirao(-21,-12.5,-38,-12,301)` que a medição R97 identificou como instâncias 2, 3 e 6 no bucket (-1,-2). A seleção de produto usa identidade local do lote, coluna e linha; índice do batch não é seletor de produto. Origem passa pelo `centro` existente após escolher yaw. Outros placements, corpos, assets, UV, material, luz, fog, rotas, spawn, fauna e demais mapas ficam preservados.

## Evidência herdada e limites

R97 mediu GLB e placements, replay Float32 e raios nas superfícies. O piloto é yaw 0 para PI; a hipótese inicial de 90 graus foi rejeitada por alterar extensões. A câmera R85 olha +Z: os alvos UV `fav_brasileira` ficam à direita; a empena à esquerda é `fav_house`. O muro baixo à frente é cover procedural separado e não entra no piloto.

Envelope XZ equivalente dentro do erro Float32 medido não significa tiro igual. As malhas visíveis de tiro giram deliberadamente; corpos procedurais permanecem independentes. Janelas e portas continuam superfícies opacas, sem promessa de vão atravessável. CPU com os dois GLBs reais e outros props em fallback não equivale ao jogo completo no navegador.

## Estado recuperável

2026-11-01: lane criada limpa na base acima. Hash do mapa antes: `7be5b81f64f5e7c8419a83096bafdd387e18566c6c8c79a6dc108dd9aa44bb2e`. Helper `mapprops`: `d2338a65e84265f7b20d8f8e4be9012f11e929eef0c12c21fdc34265f6b59ee2`. GLB house: `d937bbec49d89ea81ea128c738ae3c882cc90907cfb95c21e9161facd6965499`. GLB brasileira: `e0c3f445e16e3d929d119e2b40777ab5adfefbfed59ad4b2084c5a0efe077166`.

Régua e implementação via OMP `zai/glm-5.3`, com arquivo permitido explícito, sem ferramentas de execução. Prompts, argv, logs e status ficam em `audits/2026-10-31-visual-consistency/QUEBRADA-FRONTAGE-GLM-*-R98*`. Correções Native serão atribuídas separadamente.

Milestone anterior ao patch: `QUEBRADA-FRONTAGE-CPU-BEFORE-R98/RESULT.json` registra RED somente em `FRONTAGE_PI` nas partes e `EXACT_THREE_WHOLE_UNITS` (zero alterações). A/A preservou os controles, buffers/UV/material, hierarquia, corpos/rotas/ground/membership de occluders, templates, emissão e suporte de grafite no escopo CPU declarado. Nenhuma alteração de produto ocorreu antes dessa prova.

A rodada GLM da régua terminou exit1 por deadline, 230,712 s, `REJECTED_INCOMPLETE`. O arquivo parcial rejeitado foi preservado em `QUEBRADA-FRONTAGE-GLM-CHECKER-REJECTED-R98.mjs`; continha nome de mapa incorreto, só um GLB, assinaturas com UUID, comparação incorreta de bounds por parte e autochecagem inválida. A régua executada foi reconstruída por Native a partir do instrumento CPU R85 revisado, com ambos GLBs reais, assinaturas sem UUID, bytes Float32 por instância e união das partes para bounds. Não atribuir esse sucesso ao GLM.

O gate existente `graffiti-layout-check` já sai1 no baseline b808: F2 Quebrada gravado `0baeec834ca11497` contra atual `933be20c32d9c438`, além de outros F2 herdados. Log: `QUEBRADA-FRONTAGE-GRAFITE-BASE-R98.log`. Root determinou preservar os fingerprints e registrar a revalidação necessária; nenhum bake/reassinatura será feito nesta lease.

## Candidato e validação focal

OMP `zai/glm-5.3 low` implementou o mapa, exit0 em 118,163 s, sem executar comandos. Fonte candidata SHA256 `6c3b7e6b163a425725eac1f9ad4e00723b2c3f410e1d1875a39440a2a019a08b`. A implementação final do mapa é do GLM, sem correção Native posterior. Native escreveu este ledger, corrigiu a régua rejeitada e executou as medições. Raw, prompt, guard, argv e status estão no prefixo externo `QUEBRADA-FRONTAGE-GLM-IMPLEMENT-R98`.

O predicado `frenteVielaR98` usa os bounds exatos dos primeiros dois lotes, coluna zero e linhas do piloto. A guarda exige `fav_house` e yaw original zero. A escolha vem antes de `pbAdd`, conservando a conversão de origem por `centro`; não usa índice de bucket nem muda a ordem dos placements. Nenhum novo parâmetro de URL foi criado.

Com Node v22.23.4, a régua `tools/eval/quebrada-frontage-check.mjs` executou dois filhos isolados por comparação, com os dois GLBs reais, metadados de WebP embutido, DOM mínimo extraído do harness sem importar `Game`, seed fixa e qualidade med. Os outros props usam fallback. Comando recuperável, a partir desta lane:

```sh
node tools/eval/quebrada-frontage-check.mjs --baseline=/caminho/QUEBRADA-FRONTAGE-BASE-R98.js --out=/diretorio/novo
```

No Mac desta rodada o `node` do PATH era v16; foi usado o executável v22 registrado no manifest externo. Não instalar dependências para reproduzir a régua.

| Execução externa no audit | Exit | Resultado medido |
|---|---:|---|
| `QUEBRADA-FRONTAGE-CPU-BEFORE-R98` | 1 | RED: 30 `FRONTAGE_PI` e `EXACT_THREE_WHOLE_UNITS`; zero matrizes alteradas |
| `QUEBRADA-FRONTAGE-CPU-AFTER-R98` | 0 | PASS: três unidades em todas as partes, sem outras mudanças na comparação |
| `QUEBRADA-FRONTAGE-CPU-REVERT-R98` | 1 | RED nas mesmas cláusulas, mutação aplicada e comprovada antes de executar |

A reversão é uma cópia externa que desliga apenas a aplicação do giro; o produto permanece candidato. A régua final conserva a prova de matriz e acrescenta testemunhas RO de suporte; a versão da primeira prova RED foi preservada em `QUEBRADA-FRONTAGE-CHECKER-RED-R98.mjs`.

Nesta medição foram alterados somente os pares parte/instância esperados. As outras nove matrizes por parte são byteiguais. UV2, geometrias, materiais/samplers, templates compartilhados, todos os demais meshes, hierarquia e valores de corpos/rotas/spawn/ground permaneceram iguais. Membership/ordem de occluders é comparado por ordinal; as matrizes das três unidades de tiro mudam deliberadamente. Não há afirmação de tiro equivalente por AABB.

O maior delta do envelope inteiro foi `1.217331032421498e-6 m`, o mesmo erro Float32 previsto por R97. A régua permite `2e-6 m` por esse arredondamento medido, sem transformar isso em folga física. Escala Y e translação Y são byteiguais. Os bounds e matrizes completos por parte estão nos snapshots externos, e a união por unidade está em `RESULT.json`.

## Grafite e suportes

Emissão CPU idêntica, não vazia: nesta rodada, 88 retângulos inventariados e 90 meshes de arte. As 89 linhas de `GRAFITE.quebrada.pecas` passam na função de suporte de produção antes e depois, incluindo cobertura pelos triângulos. Isso mede o mundo com dois GLBs reais e outros props fallback; Root ainda precisa confirmar o mundo completo no browser.

As testemunhas de raio central perto do piloto mostram `folha-pixaca-04.png` (linha 59, face 101) e `peca-bolha.png` (linha 60, face 142) em `fav_house/brickwall1` instância 4. `poster:despisque-leao.jpg` (linha 71, face 11) apoia a instância 7. São controles preservados. Os retângulos do layout não interceptam sequer o broadphase dos envelopes girados; isso sozinho não prova superfície. O teste de suporte usa a implementação real e a comparação de emissão é independente.

`graffiti-layout-check` permanece exit1: F2 Quebrada gravado `0baeec834ca11497`, fonte anterior `933be20c32d9c438`, candidato `fa9328c730ea529d`. Os demais F2 são herdados e permanecem intocados. Não foi feito bake, reassinatura ou edição de arte. Como as superfícies realmente giraram, uma reassinatura genérica sem browser seria insuficiente. Caminho mínimo posterior: Root comparar no browser o mesmo piloto com todos os assets, conferir suporte/arte e decidir se basta uma revalidação documentada só de Quebrada ou uma curação/bake per-map. O gerador existente oferece alvo por mapa e cancela bake com entrada ausente; não executá-lo sem ampliar a lease. Sua opção `--so-impressao` reassina o conjunto e não deve ser usada às cegas.

## Gates e próximo passo

Sintaxe do mapa e da régua: PASS. `shader-budget-check`: SB1 a SB6 PASS, SB7 não medido porque `astro` não existe nesta lane, exit78. O contrato estático de cache não reprovou, mas a sonda HTTP não rodou. Nenhum `npm ci`, fullsuite, browser, servidor, push, PR, merge ou release foi executado.

Checkpoint desta lane é apenas CPU focal, com fingerprint de grafite pendente e gate de cache HTTP não medido. Arte/M3/M4, movimento/corpo em gameplay, tiro no cliente completo, FPS/GPU, mobile/MP e aceite global continuam UNKNOWN. Root fará captura comparável A/B/restore e movimento na viela; crítico independente depois. Não promover no PR1188 atual. O manifest e o patch externos `QUEBRADA-FRONTAGE-R98-*` guardam hashes, comandos, exits e limites para retomar sem repetir a investigação.

## R104: hardening focal após crítico R103

Base desta correção: `29e4f41f846eb27b544c587f99062af7b198e0c2`, mesma branch/lane. Root leu `CRITICO-QUEBRADA-FRONTAGE-R103.md` e autorizou somente a régua e este ledger. O crítico confirmou que o dado R98 real era válido, mas a igualdade A/B sozinha aceitava arte vazia, suporte falso e hashes do helper zerados nos dois lados. As contraprovas anteriores foram preservadas; não houve bug causal de placement confirmado nem aprovação visual.

A régua agora exige, em ambos os snapshots, arrays não vazios de inventário, malhas de arte e suporte, com todas as linhas contendo `supported === true`. `ART_EMISSION` e `BAKED_SUPPORT` continuam exigindo igualdade como guarda adicional. O diagnóstico de arte tolera ausência de campos e retorna contagens zero sem mascarar as falhas. O pin histórico de `mapprops.js` é validado antes do import em cada captura e também contra os dois registros do comparador; igualdade de insumos atual não substitui esse vínculo histórico. Os pins dos GLBs e todos os contratos geométricos permanecem.

OMP `zai/glm-5.3 low` aplicou a pequena edição, exit0 em 70,074 s, sem executar checks. Autoria Native posterior limitada a uma cláusula de suporte: tornar o comprimento positivo explícito também em `SUPPORT_ALL_TRUE` e tratar uma linha nula por `r?.supported`. Probe externo, comandos, ledger e relatório são Native. Raw, prompt, guard, argv, checker GLM anterior à correção Native e status: prefixo `QUEBRADA-ORACLE-HARDENING-R104-GLM-*` no audit externo.

Validação focal com Node v22.23.4, sem full107/fast316:

| Evidência R104 no audit externo | Resultado |
|---|---|
| `-NOMINAL/RESULT.json` | Novo build CPU baseline/candidato, exit0; zero falhas; contratos anteriores preservados |
| `-ORACLE-PROBE.json` | Comparador exato sobre clones dos snapshots frescos: controle PASS e 12 mutantes RED, todas as aplicações comprovadas por mudança de hash |
| `-ORACLE-PROBE.json`, guardRows | Guarda pré-import exata: bytes válidos PASS; substituição de bytes do helper RED, sem editar/importar o helper |
| `-SHADERBUDGET.log` | Exit0, SB1–7 PASS, incluindo sonda HTTP real de cache |
| Sintaxe e `git diff --check` | PASS |

Os mutantes incluem as três contraprovas exatas do crítico: arte/suporte vazios, todos os suportes falsos e hash do helper zerado em ambos. Também cobrem ausência de inventário/malhas separadamente, campos ausentes, booleano não estrito, linha nula e falha de arte em apenas um lado. Esse probe executa somente o bloco do comparador e a guarda de hash; não reconstrói mundos para cada mutante, não altera produto nem arquivos R98 congelados.

O nominal mantém os valores reais de arte/suporte da rodada anterior. Mapa continua SHA256 `6c3b7e6b163a425725eac1f9ad4e00723b2c3f410e1d1875a39440a2a019a08b`, helper `d2338a65e84265f7b20d8f8e4be9012f11e929eef0c12c21fdc34265f6b59ee2`. Nenhuma edição de mapa, asset, helper ou layout. QA/OWN/browser/GitHub não foram operados. Root provisionou dependências ignoradas e o seu servidor; esta rodada não instalou dependências nem reiniciou o servidor4402. A sonda SB7 criou e encerrou seu fixture HTTP isolado em `finally`, sem browser.

Próximo passo após checkpoint normal DCO/Agent: Root solicitar revisão focal dos dois hardenings e das contraprovas R104. O manifest externo R104 registra o commit final para retomada. Ego A/B/restore e movimento/tiro no mundo completo continuam com Root após release critical. F2 permanece pendente; sem nova captura, adoção no PR1188, push, PR, merge ou release nesta lease. Resolver SB7 técnico não concede aceite visual, GPU/FPS, mobile/MP ou M3/M4 global.
