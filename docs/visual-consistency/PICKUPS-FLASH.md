# Pickups × TRETA$ e flash remota (#1179)

Dois defeitos da #1179, corrigidos no worktree `consistencia-visual-release-20261031` a partir do HEAD `f4bcffdf2`.

## P1 — pickups estáticos sumiam SEM economia

`game.js` (constructor, ~833) removia **todos** os `world.pickups` do mapa antes de
calcular `_ecoLigada` (~860). Resultado: qualquer boot fora da loja — arnês, nó
dedicado, modo especial de arma, `?economia=0` — nascia sem arsenal, quebrando o
loadout legado prometido por `docs/ECONOMIA-PARTIDA.md` (EJ2) e derrubando gates
existentes (campinho-integration "arsenal: 12", pickup-arma-check, invariants).

Conserto: `this.dedicated` e `this._ecoLigada` calculados **antes** da limpeza, com as
mesmas entradas de sempre (`location.search`, `online`, `dedicado`, `_wpnMode()`); o
clear só roda com `_ecoLigada === true`. Drops de abate (`this.drops`) nunca foram
tocados e continuam intactos.

Contraprovas medidas (Game de produção, mapa `quebrada`, build = 12 pickups):
economia ON → 0; sem economia → 12; `?economia=0` → 12; `dedicated` → 12;
`wpnMode:'awp'` → 12; drop de abate nasce com economia off (38→39).

Régua: `tools/eval/match-pickup-mode-check.mjs` — contratos **PM1–PM6**:

- PM1 economia ligada → 0 pickups; PM2–PM5 (sem economia, `?economia=0`, dedicado,
  wpnMode especial) → 12; PM6 drop de abate nasce com economia OFF (só o nascimento do
  drop — o arsenal já é cláusula do PM2).
- **Nominal primeiro em todo modo**: o gate mede o game.js atual e exige verde ANTES de
  avaliar qualquer variante. Nominal vermelho = instrumento quebrado = exit 1, nunca
  "detecção".
- `--baseline` sobe o game.js do antecedente `f4bcffdf2` (`git show` + imports
  absolutos em módulo em memória) pela **mesma medição** dos cenários reais de boot, e
  exige acender **exatamente** PM2–PM5 (com PM1 e PM6 verdes).
- `--mutante=reintroduz` aplica, **na guarda real do constructor** (âncora única: o
  bloco `if (this._ecoLigada) { …clear… }`), um clear incondicional em memória e repete
  a mesma medição — exige exatamente PM2–PM5. Cláusula extra ou faltante = recusa.

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
  Mesma regra no gate PM.

## Não verificado aqui

Sem browser nesta lease (poster/motion ficam para a raiz); `economia-jogo-check` não
foi alterado (gate de outra frente) — roda no check da raiz; `check:fast` completo e
partida real não executados.
