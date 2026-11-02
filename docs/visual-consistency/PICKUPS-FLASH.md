# Pickups × TRETA$ e flash remota (#1179)

Dois defeitos da #1179, corrigidos no worktree `consistencia-visual-release-20261031` a partir do HEAD `f4bcffdf2`.

## P1 — pickups estáticos e filtro por modo

A correção #1179 recuperou os pickups sem economia: o antecedente `f4bcffdf2`
removia todo o arsenal antes de calcular `_ecoLigada`. O clear ficou condicionado à
loja ligada; drops de abate continuaram em `this.drops`. Esse histórico permanece válido.
Aquela prova, porém, aceitava incorretamente todos os pickups no modo AWP: seu GREEN
com PM5=12 não demonstrava o contrato de modos restritos.

A revisão de `8ee224e48` restaurou também o filtro legado de IDs/modo no boot OFF,
antes de `refreshPickupModels`. A fonte histórica `origin/main` local
`4cf8dd99d813fe7caa323b5e9567df3c86957f1a` já consultava `WEAPONS` e `_pickupAllowed`
no constructor antes de conservar o pickup. O filtro atual exige chave própria de
`WEAPONS` e permissão do modo: remove a malha da cena e a entrada da lista quando
qualquer requisito falha. `toString`, `__proto__` e `constructor` não são IDs de armas.
A decisão global `_pickupAllowed`, o clear da loja e a economia não foram alterados.

Medição anterior ao conserto (01/11, Game real `8ee224e48`, Quebrada): 12 pickups,
com uma AWP e duas deagle. Com o modo AWP o código anterior conservava os outros 11.
As expectativas 12/1/2/0 vêm dessa medição anterior e do contrato dos modos, não do
resultado filtrado. Prova: `audits/2026-10-31-visual-consistency/review-r71-fixes-r73/before-pickup-quebrada.json`.
A prova Ego complementar do Root, `PICKUP-AWP-ACTUAL-BEFORE-R73.json/png`, confirmou
12 pickups e as 11 malhas proibidas na cena normal do modo AWP; não prova movimento
nem que as 11 apareciam simultaneamente na câmera.

Régua: `tools/eval/match-pickup-mode-check.mjs`:

- PM1: economia ON limpa o arsenal. PM2–PM4: sem economia, `?economia=0` e dedicado
  preservam os 12 legítimos no modo todas. PM5: somente a AWP medida. PM7: as duas
  pistolas medidas. PM8: nenhum pickup na faca. PM6 preserva o nascimento do drop de abate.
- PM9–PM12: Game real nos modos todas/AWP/pistolas/faca, com oito malhas reais anexadas
  pelo builder do mapa (quatro IDs válidos e quatro inválidos, incluindo chaves herdadas).
  Exigem referências válidas conservadas e remoção de lista + malha dos demais, já na
  entrada de `refreshPickupModels`; o wrapper chama o método original integralmente.
- Antes do fix, a régua nova ficou RED em PM5/PM7/PM8/PM9–PM12, sem falha do instrumento.
  Depois, o nominal precisa passar em TODO modo antes de avaliar variante; nominal RED
  é contrato violado, não detecção de mutante.
- `--baseline` carrega `f4bcffdf2` e `--mutante=reintroduz` mantém a âncora ecoON original,
  tornando seu clear incondicional em memória. Ambos exigem falhas exatas em
  PM2/PM3/PM4/PM5/PM7/PM9/PM10/PM11; PM1, PM6 e cenários de faca permanecem verdes.
  No subconjunto preexistente PM1–PM6, as falhas continuam exatamente PM2–PM5;
  as cláusulas adicionais registram a extensão do contrato sem reescrever a prova antiga.
  O constructor do antecedente não chamava `refreshPickupModels` (o método já
  existia): nele a mesma fixture mede lista, malha e referências finais, sem alegar
  uma chamada inicial inexistente. No nominal e nos
  mutantes atuais a chamada ao refresh real e a observação anterior são obrigatórias.
- `--mutante=sem-filtro-off` remove somente o filtro OFF em memória e exige as mesmas
  falhas do RED anterior: PM5/PM7/PM8/PM9–PM12. Âncora ausente/ambígua reprova.
  O arquivo de produção permanece nominal; nova execução nominal comprova o retorno GREEN.

Autoria, comandos, resultados, limites e continuidade:
[`REVIEW-R71-FIXES-20261101.md`](REVIEW-R71-FIXES-20261101.md).

## P2 — flash desligada virava FRAG local no online

`netgame.js` `_evento()`: com `flashOn=false`, um evento `nade` kind `flash` era
mapeado para `'frag'` (spawnava granada de frag) e um `boom` kind `flash` caía no
`else` e chamava `_explodeFrag` — dano de frag que o servidor nunca deu.

Conserto: `nade` com `kind==='flash' && !flashOn` é ignorado (return, preservando a
checagem de id duplicado que vem antes); `boom` kind `flash` com `flashOn=false`
apenas remove o mesh residual, sem `_popFlash` e sem `_explodeFrag`. Frag, smoke,
`flashOn=true`, atribuição de owner e cleanup por `_nid` seguem inalterados.

Régua: `tools/eval/net-flash-disable-check.mjs` — contratos **NF1–NF7**, caminho real
de `Netcode._evento` com Game real do harness:

- NF1 `nade` flash flashOff não spawna nada; NF2 `nade` flash flashOn spawna kind
  `'flash'` **com owner medido por identidade**: objeto real instalado no `_netMap`
  (id 9 → `g.bots[0]`) e fallback `o === yourEnt` → `g.player`; NF3 `boom` flash
  flashOff remove um residual **REAL** (`THREE.Mesh` anexado à cena): exige sumir do
  array **e** `mesh.parent === null` — só espichar o array acende NF3; NF4 `boom` frag
  explode **com owner idêntico ao do `_netMap`**, em cenário limpo (contador não
  compartilha com NF3); NF5 `boom` smoke; NF6 id duplicado ignorado; NF7 `boom` flash
  **flashOn** chama `_popFlash` **1 vez** com owner **idêntico** ao do `_netMap` e
  remove o residual real (array + `mesh.parent === null`), sem frag/smoke.
- Cada cenário cria Game + Netcode reais e encerra com `nc.dispose()` + `g.dispose()`
  em `finally` (o constructor do Netcode arma `setInterval` de 250 ms); o modo nominal
  **termina naturalmente** com exit 0 — sem `process.exit`/`unref` escondendo leak.
- Nominal verde e **sem exceção de cenário** são pré-condição em todo modo. Exceção em
  qualquer `catch` vira marca de infra **separada** das cláusulas semânticas — nunca
  conta como detecção — e o CLI sai **3** (infra), distinto do exit 1 semântico.
  `--baseline` (antecedente `f4bcffdf2` via `git show`) e `--mutante=reintroduz`
  (remapeio velho `flash && !flashOn → frag` aplicado na fonte em memória) exigem
  acender **exatamente** NF1+NF3 — qualquer cláusula extra (ex. NF2/NF4/NF5/NF7) ou
  faltante é recusa; NF7 fecha o buraco do "boom flashOn sem efeito passa verde".
- CLI estrita: só `[]`, `--baseline` ou `--mutante=reintroduz` (valor exato, sem
  prefixo/substring); qualquer outra combinação sai 2 **antes** de importar o arnês.
  Mesma estriteza no gate PM, que também aceita `--mutante=sem-filtro-off`.

## Não verificado aqui

Sem browser nesta lease (poster/motion ficam para a raiz); `economia-jogo-check` não
foi alterado (gate de outra frente) — roda no check da raiz; `check:fast` completo e
partida real não executados.
