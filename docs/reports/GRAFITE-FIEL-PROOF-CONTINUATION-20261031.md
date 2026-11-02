# Grafite fiel — prova semântica, continuação 2026-10-31 (STATIC PATCH ONLY)

## Objetivo e estado
Correção focal do trio `tools/eval/mutante-semantico-proof.mjs`, `tools/eval/mutante-semantico-proof-check.mjs`
e `tools/eval/graffiti-bake-fiel-check.mjs` na worktree isolada `grafite-fiel-proof-20261031`,
base `36c410d0b3587d58d34faad02431856b30e6600d`, branch `codex/grafite-fiel-proof-20261031`.
O patch consolidado tem 6 arquivos: os três acima, o novo `tools/eval/grafite-owned-process.mjs`,
`package.json` (somente alias `eval:grafite-fiel`) e este ledger. A fase F4 escreveu somente
checker, helper de ownership, proof-check e ledger; package/helper semântico ficaram congelados.
`tools/gen-graffiti-layout.mjs` foi contexto somente leitura e não integra o lease de escrita.
Status R34: **candidato estático congelado, sintaxe e proof-check puro verdes em Node22/26;
F4 operacional NÃO aceito, aguardando contraprovas do Root.**
Autoria inicial GLM-5.3 sob guard de caminhos exatos; correções focais e conferência final R34 pela
supervisão nativa. Interrupções e validações históricas abaixo não são aprovação do candidato atual.
Raiz mantém fake producer/child statuses/browser real/review crítico/PR/release.

## Rejeitado / interrupções
- Primeira autoria parou exit 130 após um SyntaxError real (`node --check` exit 1).
- Primeira correção terminou exit 0, mas o resultado foi rejeitado porque APAGOU a linha de criação do fake `node` no
  proof-check — sem ela, o teste de alias puro invocaria os scripts reais. Nenhum teste foi executado nesse estado. Linha restaurada
  byte a byte após `const trace=...,node=...;`, antes do loop de alias.
- Fixture de rejeição `report:{mutant:'engole-falta'}`: idêntica ao controle positivo válido
  (esperar `false` era errado). Removida; controlo positivo genuíno preservado.
- Cancelamento antigo `!node` (#1169) já rejeitado antes desta frente.
- Estados rejeitados acima não são entrega: só o patch estático desta rodada conta.

## Placar nominal vs detectado (contrato do checker)
- Nominal sem mutante: 2 casos; duas rodadas válidas e frescas com layouts desiguais é
  **G1 semântico** (exit 1, row ContractViolation). Producer ausente/falho é **infra** (exit 3,
  `failed:[]`, campo `error`).
- Mutante `engole-falta`: 1 caso; **G2 semântico** somente com exit 0 do filho + checkpoint
  fresco válido (schema completa) após `GRAFITE_DERRUBA`. Exit 1 + checkpoint ausente +
  mensagem exata de cancelamento (contagem + `bake cancelado, layout anterior preservado`)
  é **sobrevivente** (exit 0, `failed:[]`). Qualquer outra combinação — status inesperado,
  diagnóstico fatal no stdout/stderr, checkpoint inválido, timeout/sinal/erro de spawn — é
  **infra** (exit 3). Erro de uso (flag desconhecida, valor vazio, mapa fora de
  `[A-Za-z][A-Za-z0-9_]*`, regex `--derruba` inválida, BASE ausente) é **usage** (exit 2).
- `process.exit` só no caminho de uso, antes de adquirir recurso; regiões com recurso usam
  `exitCode`.

## Correções aplicadas (R20)
1. `ffv` como bloco explícito; fixture inválida removida; fixture sobrevivente explícita
   `status:0, failed:[]` e mista semântico+infra mantidas/adicionadas.
2. `arg(k)`: slice por prefixo `--${k}=` (não `k.length+2`, que engolia o `=`); valores
   fornecidos não vazios; MAPA restrito a identificador; `--derruba` validada em try/catch
   como usage antes de aquisição de recurso.
3. Todo o setup de recurso dentro de try/catch/finally: `tmp=null` declarado fora, criado
   dentro do try; finally limpa só o que foi adquirido; falha de limpeza de um recurso não
   pula a limpeza do outro e força infra3/`failed:[]`. Cópia exclusiva `wx` + UUID e
   ownership após aquisição exclusiva retidas; o marker só sai após escrita completa e fechamento do descritor.
4. `ROOT` derivado de `import.meta.url` (`fileURLToPath(new URL('../../', ...))`); gerador e
   cópia do mutante absolutos sob `ROOT/tools`; `spawnSync cwd:ROOT`. Sem imports do arnês;
   só módulos padrão do Node.
5. Timeout por filho 150000 ms (abaixo dos 180000 do helper), `maxBuffer` 8 MiB retido;
   `r.error`/`r.signal`/status inesperado ⇒ infra.
6. Schema do checkpoint completa: objeto não-array; `assets` e `inputs` hex-minúsculo-64;
   `maps` objeto não-array com chave própria de `MAPA`; registro objeto não-array com `pass`/`map`
   hex-16; `layout` não-array com `arquivos` strings não vazias, `pecas` 7-tuplas com índices
   nos limites/números finitos/dimensões positivas, `murais` 7-tuplas válidas; `limpo`
   opcional intocado. Sem dado sintético de fallback.
7. Diagnóstico fatal do filho (SyntaxError/TypeError/ReferenceError/ERR_MODULE_NOT_FOUND/
   ERR_UNKNOWN_FILE_EXTENSION/ENOBUFS/ETIMEDOUT/ECONNREFUSED/setup) vira infra antes da
   classificação status/layout — exit 0 com checkpoint ausente ou schema inválido nunca é G2. Mensagens de
   infra carregam cauda diagnóstica limitada (400 chars), nunca log bruto do filho.
8. Helper: `RUIM` estendido conservadoramente (ECONNREFUSED, ERR_MODULE_NOT_FOUND,
   ERR_UNKNOWN_FILE_EXTENSION, ENOBUFS); filtros existentes intactos; relatório que alega
   infra e falha semântica junto é rejeitado. Proof-check: seis casos de cadeia de alias
   (inclui `eval:grafite-fiel` esperando 1 chamada do helper) e controles de alias/CLI
   falsos preservados; nove cabeçalhos do corpus `package.json` (regex `mutantes?:`, sem diferenciar maiúsculas) e MA10 intocados.
9. Comentário de abertura do bake-checker reduzido a 2 linhas; o histórico/contrato
   completo mora aqui. Todos os comentários novos/trocados ≤ 2 linhas.
10. Final R20: linha do fake `node` restaurada; `aceitaResultado` recusa relatório que alega
   `error`/`infra` junto a linhas semânticas; duas fixtures negativas `report:{error|infra}`
   (status 1, G2 válido) em `ffRejeitar`. Base `36c410d0b3587d58d34faad02431856b30e6600d`,
   branch `codex/grafite-fiel-proof-20261031`; patch GLM sob guard de exato caminho.

## História/contrato movidos do cabeçalho do checker (v. #1109)
Duas rodadas do gerador na mesma árvore deram 2769 e 2767 peças; seguir a receita do portão
apagou 185 peças aprovadas. A passada é determinística sobre a cena que recebe — o que varia
é a cena: um GLB que não carrega some em silêncio (`preloadMapProps` só avisa no console) e
só a `statue_liberty.glb` faltando leva a loja_h de 186 a 200 peças. G1: duas rodadas
seguidas, checkpoint novo em cada, dão o mesmo layout byte a byte. G2: com um GLB derrubado,
o gerador cancela o bake e lista a falta em vez de gravar layout diferente. Após iniciar a execução, a última linha do
stdout é o relatório canônico `{mutant, cases, failed[, error]}`. Precisa navegador e
servidor, fica fora do `check:fast`. Uso: `BASE=http://127.0.0.1:<porta> node
tools/eval/graffiti-bake-fiel-check.mjs [--mapa=loja_h] [--derruba=<regex>] [--mutante=engole-falta]`.

## Validação histórica R20 pela supervisão (não valida F4)
- Node v22.23.4 e v26.12.1: `--check` nos três módulos JS, seis execuções exit0.
- `node tools/eval/mutante-semantico-proof-check.mjs` em ambas as versões: exit0, incluindo controle/community16, MA1/MA2, novos G2 e seis cadeias de alias com node falso + CLI inválido.
- Antes de executar, a linha que cria o node falso foi comparada byte a byte ao HEAD e sua posição antes das cadeias foi verificada. Nenhum bake/harness/browser foi iniciado.
- Parse JSON + comparação byte a byte confirmam que somente o alias autorizado mudou em package.json. Header existente preservado, nove anúncios nominais pela mesma regex da régua MA, whitelist MA permanece10.
- `git diff --check`: exit0. Evidência: `audits/2026-10-31-visual-consistency/GRAFITE-FIEL-PROOF-CHECKS-FINAL-R20.json`.

## Aquisição e cancelamento históricos R20 (substituídos em F4)
A revisão final trocou escrita direta por `openSync(alvo,'wx')`: depois da aquisição exclusiva a cópia já pertence ao teste; escrita parcial ou falha de fechamento entram no finally e removem somente essa cópia. Colisão EEXIST anterior à aquisição apenas tenta outro UUID. O marker continua depois de escrita e close completos. `spawnSync` usa timeout150000ms, killSignal SIGKILL e maxBuffer8MiB; a intenção é terminar o filho antes do helper180000ms e alcançar cleanup. Falhas efetivas de escrita/close, colisão, sinais/timeout e descendentes do produtor ainda serão exercitados pelo Root.

## Proveniência GLM e resultados rejeitados
- `GRAFITE-FIEL-PROOF-GLM-AUTHOR-R20.jsonl`: interrompido exit130; SyntaxError detectado por `GRAFITE-FIEL-INITIAL-SYNTAX-R20.log` (exit1), sem aceitação.
- `GRAFITE-FIEL-PROOF-GLM-CORRECTION-R20.jsonl`: exit0; deixou a criação do node falso ausente, rejeitado antes de executar a prova.
- `GRAFITE-FIEL-PROOF-GLM-FINAL-R20.jsonl`: exit0; restaurou fake node e rejeição de report error/infra.
- `GRAFITE-FIEL-PROOF-GLM-OWNERSHIP-R20.jsonl`: exit0; aquisição exclusiva/descritor e SIGKILL. Código final conferido e checks repetidos depois.
- O prompt da chamada FINAL supôs incorretamente que CORRECTION foi interrompida. O processo já tinha terminado exit0 quando o supervisor tentou interrompê-lo; este ledger registra o resultado real.

## Pendente (raiz)
Fake producer/child statuses, schema e escrita/close/colisão, sobrevivente, sinal/timeout/overflow; produtor real e browser com acervo; revisão crítica do diff completo, PR e release. A correspondência do filtro de diagnósticos fatais com os logs reais de GLB bloqueado precisa dessa prova: não foi presumida por verde sintático. Sem restauração do bake antigo de475 peças; owners #1155/#1160/#1158 preservados; sem edição de produto ou curadoria.

## Continuação e definição de pronto
Esta frente prepara a prova de G2 para a missão de consistência visual do jogo; a conclusão local é o patch isolado recuperável com checks puros acima. A conclusão de release exige os testes de produtor/browser e os portões/reviews pelo Root, preservando a missão ampla de mapas limpos, personagens/movimento/ADS e UI consistente. Próximo passo concreto: aplicar o patch congelado no QA pelo owner, executar controles de produtor e contraprovas adversariais, sem importar o bake antigo. Sem commit/push por esta frente. Logs/prompts/manifesto/patch ficam em `audits/2026-10-31-visual-consistency/`.

## F4 (R32, autor GLM nesta worktree grafite-fiel-proof-20261031): processo em grupo próprio + página Ego própria
Autoria sob guard de exatamente 4 arquivos: `tools/eval/graffiti-bake-fiel-check.mjs` (editado),
`tools/eval/grafite-owned-process.mjs` (novo), `tools/eval/mutante-semantico-proof-check.mjs` (adições puras),
este ledger. `package.json`, helper semântico, gerador e adapter Ego são somente leitura e não mudaram.

### Histórico resumido desta frente
- R20: rejeitado pela revisão crítica do Root (4 achados); nenhum runtime GREEN herdado daquela rodada.
- F1/F2/F3 (candidato SHA35a8be79e30975184bae9706e040d21c8c16e3e5282054891d992b598c8a19a8): Root rodou
  38 casos de produtor fake expandidos em Node22 e Node26, **76/76 VERDE**, `ownCopiesClean`; warning real
  esperado confirmado em R25. Fontes: `GRAFITE-PRODUCER-FAKE-{22,26}-R28.json/.log`.
- R27: `started=false` — **não** aceito como prova de cancelamento ativo.
- R28: prova real de cancelamento ativo por `page.close` em página própria recém-criada (Space 43, p3):
  ACK de close em 30ms, wait ativo rejeitado 'page p3 was closed' 64ms após closeStart, label p3 ausente,
  p1 protegida retida, sem kill. Prova que `page.close` aborta operação da própria página — não prova
  cancelamento por desconexão do CLI.
- R29: interrompido exit130 antes de qualquer escrita; nada desta rodada chegou ao disco.
- R31/R32: ladder de encerramento medido em `GRAFITE-HEADLESS-LIFETIME-R31/R32.json` + `worker/driver.mjs`:
  TERM1 fecha todos os Chrome observados mas o worker mantém o Node vivo; TERM2 encerra o Node.
  R32 PASS 2/2 (readycase 2054ms; TERM1 sozinho 946ms). Por isso o helper usa TERM1 → graça ≤900ms →
  TERM2 → graça ≤900ms → SIGKILL no MESMO grupo próprio, espera ≤1000ms. Kill imediato e "pipe mata Chrome"
  são afirmados falsos e não implementados.

### O que o patch F4 faz (não executado por esta frente)
- `grafite-owned-process.mjs`: runner assíncrono com spawn `detached:true` POSIX (PGID === PID do filho),
  validação de opções ANTES do spawn (timeoutMs 1..150000, graceMs 0..900, killWaitMs 1..1000,
  maxBuffer 1..8MiB), coleta byte-limitada com flag `overflow`, ladder cooperativo medido, prova limitada
  de ausência do próprio grupo (ESRCH), `residual`/`contained` para filho normal com grupo remanescente,
  evento `exit` do FILHO desperta contenção imediata de grupo residual; sem hook de exit do host, nenhum
  log de comando/args/env. Protocolo Ego: namespace `corosolto.grafite.owned.v1`, nonce UUID por assa,
  recibo `wx` exclusivo em rounddir próprio + ACK único `GRAFITE_OWNED_ACK=`; alocador captura `before`
  de `task.pages()`, exige página pN nova do agente e fecha-a se o setup falhar após adquiri-la; recibo
  válido com CLI falho devolve lease de recuperação marcado; lease é privado (WeakMap) e congelado —
  `closeOwnedEgoPage` recusa lease não emitido/mutado antes de qualquer CLI, close por CLI de controle
  independente (≤10s, sem herdar signal abortado do trabalho), exige página ausente e todos os labels de
  `before` retidos. `validOwnedReceipt` é puro e exporta a validação usada pelo proof-check.
- `graffiti-bake-fiel-check.mjs`: `assa` assíncrono, `runOwnedProcess` no lugar de `spawnSync`
  (150000/900/1000/8MiB), página própria alocada só quando `EGO_TASK_SPACE` (inteiro positivo) está
  presente e repassada ao produtor como `EGO_PAGE` real (sem p2 fixa, sem label fake); finally de cada
  assa fecha o lease com ACK antes de qualquer métrica valer — cleanup falho/ACK ausente/contained false
  vira infra (exit 3), nunca linha G1/G2; handlers SIGINT/SIGTERM instalados antes dos recursos abortam o
  trabalho mas não pulam o cleanup; listeners removidos ao final; prazo absoluto por assa 174s abaixo do
  helper 180s; headless continua em grupo próprio, sem alocação de página; classificação F1/F2/F3, parser
  estrito, envelope de cancelamento, chamadas nominais a/b/derrubado e fluxo status0/status1 intocados.
- `mutante-semantico-proof-check.mjs`: adições puras — fixtures literais de recibo (namespace/nonce/kind/
  space/page/openedBy/before/absent/after, incluindo page protegida, tipos errados, duplicatas, p0, owner
  estranho, after sem p1) sobre `validOwnedReceipt`; sem Ego real, sem processo real. Tudo o que existia
  (community16, MA1/MA2, G2 fixtures, fake node writer, seis cadeias de alias, CLI inválido) preservado.

### Pendente (raiz) — F4
1. Sintaxe/pure proof-check concluídos pela supervisão em R34 (seção final); não provam contenção operacional.
2. Fakes de recibo/lease do helper (emitido/mutado/forjado) e controles do runner (net ignorando TERM,
   pai saindo cedo, overflow, sinais, spawn error, sentinel em outro PGID).
3. 38 controles de produtor fake reescritos em assíncrono; real Ego + headless com contenção medida.
   Validação restante declarada: nenhuma afirmação de que pipes encerram grupos Chrome separados sem
   medição do Root com helper/headless reais.
4. Crítico adversarial de contexto limpo sobre o diff F4; só depois PR/release.
Nenhum runtime GREEN, aprovação de release ou "pronto" é reivindicado a partir deste plano. Sem commit/push.
Objetivo original e próximo passo concreto da seção acima permanecem válidos; o próximo passo imediato é o
item 1-2 desta lista, executado pelo Root/supervisão nativa.

## R33 — correções GLM parciais, guard 4 arquivos (intermediário rejeitado)
R32 exit0 é **intermediário rejeitado**: nenhum helper operacional rodou. A rodada R33 saiu exit1
por deadline de 4 minutos; gravou alterações, porém não completou todas as correções. A intenção
descrita a seguir foi conferida e completada na supervisão R34; a saída do modelo não foi tomada como prova:
- **A** removido o hook `process.on('exit')` do host (TERM+KILL imediatos derrotavam o protocolo
  Playwright provado). Controle de parada é SIGINT/SIGTERM/abort do checker, nunca exit síncrono.
- **B** `contained` não é mais hardcoded pós-stop: exige resultado real da escada + grupo ausente
  (ESRCH) + close; stop falho propaga `contained:false`/`residual:true`. Spawn sem pid devolve
  `ownpid/pgid null, contained:true` (nenhum grupo existe; nunca sinal -0/NaN). `stdin` ganha
  listener de erro ANTES do `end`; EPIPE vira erro infra com stop limitado. Checker rejeita
  `timedOut/aborted/overflow/residual/error/signal/status null`.
- **C** teto de saída agora COMBINADO stdout+stderr (`maxBuffer` único). Toda corrida de prazo usa
  `esperaComPrazo`, que limpa o timer ao resolver; nenhum sono/prazo órfão segura o Node.
- **D** ACK único precisa ser JSON válido igual byte a byte ao recibo em arquivo (`ackConfere`);
  nonce/page/kind divergentes no stdout são infra mesmo com arquivo válido, e nesse caso o lease
  de recuperação só serve para cleanup com `ok:false`. Recibo lido só por arquivo regular
  ≤64KiB (lstat; symlink/oversize/não-regular rejeitados sem leitura).
- **E** rollback da alocação fecha SOMENTE página nova do agente ausente de `before`/protected —
  nunca um p1 pré-existente; tipos do SDK checados crus (`typeof label === 'string'`,
  `openedBy === 'agent'`) sem coerção String(). Escada cercada por fence (`terminado`): nunca
  sinaliza grupo já aposentado em callback tardio.
- **F** checker: `r.aborted` vira infra; orçamento por assa checado antes da alocação e do
  trabalho (174s menos 10s reservados ao close); G1 virou sequencial a→checagens→b→checagens
  (3 chamadas preservadas); cleanup de página falho marca `retencaoTmp`, retém o rounddir para o
  Root em vez de fingir limpeza, e vira infra.
- **G** proof-check usa literal independente `corosolto.grafite.owned.v1` nas fixtures, não a
  constante do SUT; fake-node writer, cadeias de alias e todos os casos antigos preservados.
Runner: primeiro `await` acorda com exit/close/error/timeout/abort/overflow (não só close);
exit do filho desperta imediatamente e grupo residual é contido na hora. Close esperado até o
prazo total mesmo com pipe held; sem close, erro — nunca hang. Sem execução, teste ou browser
aqui; syntax/puro ficam para o supervisor, processos/browser/crítico para o Root.


## Candidato congelado R34 — supervisão, contratos finais e limites

R33 perdeu o prazo depois das escritas. A supervisão rejeitou as pendências reais: espera que
voltava ao loop depois de timeout; `exit` sendo tomado como `close`; opções env/signal
incompletas; `closedExp` ausente; lease não aposentado; retenção de artefatos incerta.
A primeira mensagem sobre newline de recibo foi corrigida: o escape de duas barras na template
externa estava correto. As duas scripts geradas foram extraídas como texto, compiladas e o
sufixo do recibo foi avaliado isoladamente como LF; não foi bug aceito nem pretexto de alteração.

Correções de supervisão sobre a autoria GLM, restritas ao lease:
- Runner acorda uma única vez com exit/close/error/timeout/abort/overflow, cancela timer de trabalho
  e faz stop limitado; aguarda `close` real, mesmo após exit. `contained` exige stop bem-sucedido,
  grupo ausente e close; grupo residual natural é sinalizado como `residual:true` mesmo se contido.
  Sem host-exit handler, sem grupo alheio, sem comando/env/args em relatório. Stdin EPIPE é consumido.
  Limite combinado de stdout+stderr; grupos sem PID não são sinalizados; callbacks param ao final.
  Streams são destruídos e child handle unref ao final de resultado incerto para não bloquear o host.
- Opções validadas antes do spawn (env não-array; signal com boolean e métodos); deadline total
  do runner é trabalho +2 graças +espera final. Produção 150000+900+900+1000=152800ms; CLI de
  controle 7000+2800=9800ms. `timeoutMs` 1..150000, `graceMs` 0..900, `killWaitMs` 1..1000
  permitem ensaio causal curto pelo Root. AbortSignal pré-abortado recusa antes de spawn.
- Alocação usa `Page.label/openedBy` crus do handle retornado por `newPage` (APIs documentadas
  no guide R19), valida novidade contra before/protected e escreve recibo exclusivo antes de
  qualquer nova chamada assíncrona de pages. Rollback só fecha página nova pN ainda agent-owned.
  ACK JSON único deve ser igual ao recibo válido. Um recibo válido sem ACK só emite lease de
  recuperação, `ok:false`; nunca aceita métrica. Close independente verifica ausência e before
  retido, confere ACK+arquivo e aposenta a marca privada. Lease forjado não inicia CLI.
- Recibos lidos por descritor O_NOFOLLOW/O_NONBLOCK, fstat de arquivo regular e leitura limitada
  a 64KiB+1; symlink, FIFO, oversize e JSON inválido são recusados. Sem varrer páginas ou processos.
- Checker recusa `aborted` e todas as outras flags infra; valida resultado de a antes de iniciar b.
  Reserva cleanup e exige orçamento suficiente ANTES de alocar/rodar; assa174000ms fica abaixo do
  helper180000ms. Falha de alocação, cleanup ou contenção conserva artefatos privados para auditoria
  e reporta paths; cópia mutante só é removida quando contenção não ficou incerta. Nenhuma evidência
  G1/G2 é emitida a partir de infra. F1/F2/F3, schema, nominal3rodadas, mutante1rodada preservados.
- Pure proof-check mantém writer do node falso byte a byte do HEAD antes dos aliases, literal
  independente de namespace e `closedExp` explícito; 51 fixtures negativas de recibos mais controles
  positivos. Não invoca `runOwnedProcess`/allocate/close operacionalmente.

Validação realmente executada em R34:
- Node v22.23.4 e v26.12.1: quatro módulos JS +duas scripts Ego geradas em syntax-only, 12 checks exit0.
- Pure proof-check em ambas: exit0, incluindo 16 controles gerais negativos, MA/G2, seis cadeias
  com node falso/CLI inválido e 51 recibos negativos. Nenhum produtor, navegador, CLI Ego ou
  processo de contenção foi iniciado pela supervisão.
- `GRAFITE-F4-STATIC-DRIVER-R34.mjs`, `GRAFITE-F4-STATIC-N22-R34.json`,
  `GRAFITE-F4-STATIC-N26-R34.json`; scripts geradas `GRAFITE-F4-GENERATED-{0,1}-R34.mjs` no audit.
- Helper SHA256 `6e61fb5945aa8de438b2c5e1d347e38e30b3e3e404e204a28dfc611871a29413`;
  checker `6bd3fea241b44a15d42ab5bc48b10f4af6f7b5305dc8a9b6d0beb1c4ab58fcea`;
  proof-check `21f4cb389e6bc2f22badda8abfaa707464edadd51def6c0c9a329b3d190328b4`.

Próximo passo concreto (Root, sem concorrência com browser do pre-push): testar helper congelado
com pai que sai cedo/neto vivo, neto ignorando TERM, timeout50–200ms, overflow, sinal, spawnerror,
sentinela em outro PGID, reaping/ESRCH e sem callback tardio. Exercitar arquivo+ACK divergentes,
lease forjado/aposentado, allocation/close falho, nonce/page/owner errados e preservação de p1.
Repetir 38 controles do produtor, depois Ego/headless real com este helper e crítico fresco.
Os ensaios R28/R31/R32 justificam o desenho, mas não validam o código R34. Integração, PR, merge
e release ficam com Root. Nenhuma fonte de gerador, adapter, mapa, VM, CSS ou WT compartilhada foi editada.

## R40 — concatenação de canais no ACK (fix mínimo autorizado)

- Root actual R39 provou que o Ego emite o `console.log` de ACK no stderr (stdout vazio); portanto o R34 operacional é REJEITADO — allocate/close recusavam ACK válido+arquivo JSON, apesar de fakes por stdout passarem.
- Recibo efetivamente recebido com LF (byte 10) válido; não há bug de newline.
- Fixtures externas R40 preservaram os 28 casos antigos e adicionaram 11 casos de canal (stdout/stderr nominais, split/duplicado/mismatch inversos); supervisor comprovou RED contra o R34 congelado antes deste fix.
- Fix aplicado exatamente nos dois readcalls existentes (`allocateOwnedEgoPage` e `closeOwnedEgoPage`): `unicaAck(r.stdout + '\n' + r.stderr, 'GRAFITE_OWNED_ACK=')` — matching de ACK único no TOTAL de ambos os canais, sem fallback por canal; igualdade tipada JSON/arquivo inalterada.
- Supervisor nativo rodará os testes pós-fix; pendentes Root com Ego real, bake e critic. Nenhum teste foi executado nem aceitação operacional declarada aqui.
- Autor do código núcleo: GLM 5.3, sob guarda exata de 2 arquivos; sem SUT além destes 2 sítios; nenhum write em generator/adapter/QA/product. Histórico anterior não reescrito.

### R40 — validação factual da supervisão e freeze

- BEFORE R34 intocado:39 casos fake de canais por Node22/26,34pass/5RED cada. Falhas exatas: stderr nominal e allocate/close crossduplicate/crossmismatch. Evidências BEFORE-R34-R40 preservadas.
- GLM exit0 alterou EXATAMENTE as duas expressões de leitura ACK acima; comparação integral ao helperR34 reconstruído do patch congelado confirma nenhuma outra mudança. `runOwnedProcess` byte-idêntico, SHA256 `265d7c25748f7446be02c3a4ab1a56d7a2fd7f743492a0f24bedafe70b289661`; scripts remotos byte-idênticos. Rootprovas reais POSIX15×2 e headless3×2 foram na função idêntica (R36/R37), sem reatribuir o hash total novo aos artefatos antigos.
- AFTER Node22.23.4/26.12.1: fakeEgo39/39 cada (78total,69CLIexecutions porNode) com stdin exato; produtor38/38 cada (76), F3usage2/2 cada (4); quatro módulos+duas scripts syntax-only e pureproof-check exit0 ambos. Checkpointdirs e cópias próprias limpos; teste puro mantém nodefalso byte a byte antes de alias.
- Helper R40 SHA256 `8fcc6c176380a3ce7c1fe2826f5c838e4c20f3943cff91d546a070c535729164`. Outros quatro arquivos SUT de código/package iguais ao R34; somente helperduaslinhas e esteledger mudaram apósR34. Fonte/processos/SDKfake não são navegador real; diferenças de canal agora provadas sem relaxar unicidade/mismatch.
- Fontes/audit pós-fix R40 congelados para Root: real allocate/close protegido em Space43, bakeG1/G2 e crítico fresco continuam pendentes, sem aceite operacional/release. Nenhuma escrita QA/gen/adapter/produto, commit ou push.

## R41 — guardas de cancelamento após cleanup (fix mínimo autorizado)

- Root fresh critic R40/F4 válida P2: o finally assíncrono final do assa era independente do signal abortado por desenho; SIGINT/TERM durante o último close marcava `cancelado`/abortava o controller, mas depois de cleanup válido o assa devolvia trabalho válido e o checker podia publicar 0 nominal / 1 G2 semântico — contraprova externa (nominal/mutante × SIGINT/TERM em Node22/26) e helper semântico real com mutante cancelado serão estabelecidos pelo supervisor ANTES deste fix contar como prova.
- Duas guardas inseridas, exatamente nos dois sítios autorizados no checker: (1) no finally do assa, após o try/catch de close do lease e o fechamento do `if (lease)`, antes do prazo absoluto — cleanup independente preservado, cancelamento só lança depois do cleanup terminar; (2) no fim do try protegido top-level, após o throw de status inesperado G2 e antes do `catch (e)` — throw dentro do try, nunca no finally externo; o catch existido zera `falhas` e vira infra3.
- Sem `await` entre a guarda final e o finally/listener-off/emit síncronos: cancelamento já registrado não publica verde semântico. Nenhum setImmediate/sleep/yield/handler novo; cleanup, listeners e fluxo F1/F2/F3 intocados.
- Autoria do código: GLM 5.3, sob guard de exatamente 2 arquivos (este checker e este ledger). Sem mudança em helper 8fcc, gen, mutator, regex, adapter, package, proofs, dependências ou QA; histórico anterior não reescrito.
- Supervisor rodará contraprovas APÓS controles e fakes mais amplos; checker novo + crítico fresco do Root pendentes. Nenhum resultado/contagem inventado; sem aceitação operacional, commit ou push.

### R41 — resultado factual, causalidade e freeze da supervisão

- BEFORE foi realmente concluído ANTES de iniciar GLM do sourcefix: Node22.23.4/26.12.1 cada9/9 expectativas da reprodução. Oito directSIGINT/TERM (nominal/mutante) publicaram WRONG0/1; quatro helperCLI reais aceitaram mutantes cancelados com WRONGPASS0. Seis controles semsinal mantiveram0nominal/1mutante/helper0. Todos seisSHA R40 intactos nesse ponto.
- Driver externo autorGLM5.3 terminou exit0 no limite8min; código inicial GLM-UNRUN nunca executado. Supervisão nativa corrigiu só fixtures antes do primeiro teste (stderr do RED realhelper, último close, childclose/reaping, PID/PPID positivo e nonce, retenção de artefatos incertos, observação estrita). Não houve falha de execução a maquiar nem esperado relaxado. CLI falsa executa stdin original sem reescrita; segura só o último close antes da execução e devolve ACK/recibo válidos após release.
- Identidade própria por preload: PID/PPID/nonce/SHA do checker; ps consulta só metadados do próprio PID. SIGINT/TERM enviado APENAS ao checker confirmado, nunca ao helper, grupo, CLI ou navegador. Gate permaneceu pendente100ms após sinal. Fonte/helper/arquivos não foram alterados pelos testes; páginas/cópias/checkpoints limpos.
- Sourcefix GLM5.3 exit0: comparação integral ao snapshot6bd confirma EXATAS duas inserções de guarda; nenhum outro byte do checker alterado. Guarda após awaitcleanup impede fulfillment; guarda final está dentro do try protegido. Desde a última guarda até finally/listeneroff/emissão só código síncrono, sem yield; sinal só muda flags quando entregue no eventloop. Assim flags já registradas não escapam; não se afirma capturar SIGKILL nem callback ainda não entregue.
- AFTER cadaNode9/9: oito directSIG viram infra3 com failed[] e erro explícito de cancelamento; quatro helperCLI reais retornam RED1 semPASS; seis controles semsinal preservados. Toda execução termina sóp1 aberta; checkpointdirs e cópias próprias removidas. Evidências GRAFITE-LATE-CANCEL-N{22,26}-{BEFORE,AFTER}-R41.json/log no audit.
- Regressão38×2=76GREEN, F3usage2×2=4GREEN; sintaxe4módulos+2scripts e pureproof-check em ambosNode exit0. Writer do nodefalso conferido byte a byte antes dos aliases. ACK39×2 reutilizado conscientemente: helperinteiro8fcc e todas33fontes/evidências externas congeladasR40 têm hashes idênticos; driverACK importa somente essehelper, não o checker. Não se chama isso execução nova.
- CheckerR41 SHA256 `6189865d77d79c1a084a7932da32ba2b466f847f24344c036abb077cda6b8d2e`; package/helper8fcc/semântico/proof-check e gen/adapter byte-constantes. Somente checkerduasguardas e appenddesteledger mudaram desdeR40. Freeze de seisarquivos +smallpatch em audit para Root. Nenhum browser/Ego/gen real, QA, dependência, commit ou push nesta frente.
- Pendente Root: produtor real com checker novo após push, contraprovas/cancelamento real se necessário e crítico fresco. R41 é candidato com provas focais, sem aceite operacional/release. Ownership congelado será transferido ao Root no handoff.

## R45 — aceite focal e stack separada pelo Root

Root executou o checker6189/helper8fcc reais no Ego43 em R42: G1 gerou duas
rodadas com42peças byteiguais, G2 cancelou a carga incompleta e preservou o
checkpoint; o helper semântico recusou engole-falta exatamente emG2. Ambos
commands EXIT0, páginas próprias encerradas e p1 preservada. Logs e hashes em
GRAFITE-F4-REAL-ROOT-R42.json no audit desta missão; não são aprovação visual.

Root leu integralmente CRITICO-GRAFITE-F4-R42.md, SHA
ca472af56a8dc116a078e84572f5eeec770be2fc2d3b91e276690f2458fc4738:
nenhum finding acionável nos seis arquivos e fronteiras; R23F1–F4 e R40P2
encerrados por fonte e provas. Não equivale à revisão da futura cabeça publicada.

Integração isolada em codex/grafite-fiel-stack-20261101, base1a6013f4a786ed21e14f46b76488f08d3ec44393,
acima de codex/visual-release-review-20261031. PatchR41 aplicado com contexto,
sem substituir package inteiro: única alteração no JSON é eval:grafite-fiel.
Quatro módulos instrumentais têm SHA byteigual ao freeze; próprio ledger recebe
este append. QA continua sem G2, permitindo que boot/release avancem separados.
Próximo: docs/arch, checkpoint seletivo, publicação normal da stack após a base,
PR/bot atual/crítico integral posterior e portões próprios. Sem push ou release.

## R59: linha vazia na stack do cancelamento

- Faixa isolada `fix/grafite-cancel-blank-r59`, base `7b19b63dff5a1c49898e1468afb924acb5bbd11c`. Objetivo: aceitar a formatação whitespace-only da stack real, preservando contagem, associação URL/origem/prop, FATAL e status/checkpoint. Lease: este ledger e `tools/eval/graffiti-bake-fiel-check.mjs`.
- BEFORE congelado em `audits/2026-10-31-visual-consistency/GRAFITE-BLANK-R59-BEFORE-FREEZE.json` no aggregate. Raw do Root R59 lido integralmente: produtor exit1, checkpoint ausente, duas entradas válidas e uma linha de quatro espaços entre frames. Raw SHA256 `acf22d37c99ecf89ba7277a2954121ec699c2d8d5c514264ce85b3f3877a729e`; checker anterior `6189865d77d79c1a084a7932da32ba2b466f847f24344c036abb077cda6b8d2e`.
- Driver privado extrai literalmente envelope, sanitização e ramo G2. Node22.23.4/26.12.1: 16 expectativas BEFORE por Node confirmadas; raw produz infra3 na linha `"    "`, o mesmo raw removendo apenas essa linha produz0. Variantes fatais, entrada desconhecida, contagem, URL/origem/prop, checkpoint e outro exit continuam3. Primeira tentativa do driver omitiu URL no contexto VM; erro e freeze inicial preservados com sufixo DRIVER-ERROR, corrigidos antes do BEFORE válido e sem alteração do SUT.
- Próximo: chamada única e limitada a GLM-5.3 via OMP para autorar o patch mínimo, validação AFTER e mutação causal. Root é o único escritor de QA/browser e fará produtor real e crítico independente. Sem aceite visual ou release.

### R59: validação focal e entrega ao Root

- GLM-5.3 via OMP `openrouter/z-ai/glm-5.3`, sem ferramentas, autorou uma única linha no envelope: ignorar linhas somente whitespace. Chamada única exit0 em21,008s, prazo Popen270s sem renovação; prompt, resposta e metadados preservados em `GRAFITE-BLANK-R59-GLM-*`. Supervisão aplicou o diff exato, sem outro byte de código. Checker AFTER SHA256 `21d95c5fed84edbd29c43fd9259b443f0085103ae569b634b6f68e57bdd555c0`.
- Node22.23.4/26.12.1: 16/16 expectativas AFTER em cada Node. Raw original e whitespace com tab produzem0; 13 controles recusam com3, incluindo FATAL após branco e antes do cabeçalho, entrada desconhecida, contagem divergente, origem/alvo/URL inválidos, warning de outro prop, checkpoint presente e outro exit. FATAL do status0 usa a saída original; do status1 usa toda a saída sanitizada. Nenhum texto da stack foi removido pela guarda nova.
- Mutação causal privada remove apenas a linha autorada: fonte mutada byteigual ao BEFORE `6189865d...`. Ambos Node restauram infra3 no raw pela linha `"    "`, preservam0 no controle sem branco e3 nos controles negativos; 16/16 expectativas de mutação por Node. Refutada a hipótese de erro fatal no raw: só o TypeError esperado do warning é sanitizado, e a stack sem a linha vazia já era aceita antes.
- `node --check` do checker em ambos Node, `node tools/gen-docs.mjs --check`, `node tools/gen-arch.mjs --check` e `git diff --check`: exit0. Checkpoint seletivo leva apenas checker e este ledger. Artefatos privados ficam no audit do aggregate, prefixo `GRAFITE-BLANK-R59`; nenhum browser, headless, build ou checkdeploy executado nesta faixa.
- Concluído: conserto mínimo e provas CPU extraídas do código real. Próximo do Root: integrar o checkpoint isolado, rodar o produtor real no checker novo e crítico independente integral. Permanecem pendentes aceite operacional, avaliação visual e release; sem push ou GitHub nesta faixa.
