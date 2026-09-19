# Relatório da noite de 19/09 → 20/09 — viewmodel: integração das 3 aprovadas

> Leia isto primeiro. Depois abra
> `csbrasil/worktrees/vm-unificado/artifacts/viewmodels/arsenal/noite-1909.html`
> no navegador (capturas 3:2 e 16:9 de AK, pistola e faca na rota de PRODUÇÃO).

## Onde está o trabalho

- Worktree: `csbrasil/worktrees/vm-unificado`
- Branch: **`claude/vm-integracao`** = `claude/vm-unificado` (14/09) + `origin/main` (alpha.261, 19/09)
- 4 commits, nenhum push, nenhum deploy:

| commit | o quê |
|---|---|
| `adc4deed9` | merge da main (22 conflitos resolvidos; ver abaixo) |
| `7fc989e7d` | portão por arma, câmera do GLB como contrato medido, rollout só das 3 aprovadas, granada de volta com animação |
| `e34dfd39a` | régua `vm-identity` ID6 estava cega (buffer de Resource Timing) |
| `78203e778` | KNOWN-BUGS: BUG-170, BUG-171, parágrafo obsoleto da câmera em BUG-75 |
| `b9a653cec`, `5055fcd23` | docs/ARCH regerados pós-merge; comentários no teto da casa |
| `8662f3c29` | **paridade de simulação** cliente↔nó + régua `eval:mp-paridade` + grafite dos 11 mapas + orçamento de sombra |
| (últimos) | QMAP4: `map_campomorro`/`map_lajes` passam a ler qualidade pelo módulo único; grafite regerado |

No backend (`csbrasil-backend/worktrees/perf-jogabilidade`), branch nova
**`claude/paridade-simulacao`**, commit `4756083`. Nenhum push, nenhum deploy.

**`check:fast` final: 143/146.** As 3 vermelhas restantes (`eval:mapid`, `eval:redesign`,
`audio:check`) reproduzem na `main` — dívida anterior, não desta noite. Log em
`artifacts/viewmodels/arsenal/check-fast-noite.log`.

## O que fechou (tasks A→C do relatório do GPT)

### A. Câmera — o navegador projeta a câmera do GLB, e agora há régua que prova
- Descoberta: **na lane `vm-unificado` a câmera já era a do GLB** para a rota golden
  (`frame.fov = cameraFov`, o `Math.max(…, 84)` era inerte). O §4.4 do dossiê descrevia o
  tronco de 09/09, não a lane. Deixei o código explícito (`golden ? cameraFov`).
- **Nova régua `npm run eval:vm-camera`** (`tools/eval/vm-camera-check.mjs`): abre o jogo em
  3:2, troca de arma, lê `vmCamera.fov` e a matriz de projeção e compara com o `yfov` lido do
  binário do GLB. Depois abre em 16:9 e cobra que a meia-tangente horizontal seja a mesma.
  **Resultado: 15/15 verde** (14 golden a 58,00°, faca a 50,00°).
  **Mutante `--mutante=clamp`** reintroduz o defeito do tronco → vermelho em ak/m4.
- Pergunta 5 do dossiê continua válida só para a política de aspecto (horizontal constante:
  58° em 3:2 vira 50,13° em 16:9). Isso é decisão, não bug — e agora está pinada na régua.

### B. Fallback AWP — já não existia na main; provado com mutante
- `weaponModel()` na main/lane devolve `null` sem a malha pedida (o `|| _cache.get('awp')` só
  sobrevive no tronco `feat/fps-paid-viewmodels-aaa`).
- `vm-attach` autorado VERDE, mutante `escondepack` vermelho como deve; `vm-attach-legado`
  VERDE (33 GLBs bloqueados, só a AWP em cache, zero substituição).

### C. Rollout — só o que você aprovou chega ao jogador
- `vmconfig.js`: `ready:true` **só em `ak`, `pistol`, `grenade`**; as outras 13 famílias
  `false`. Novo **portão por arma**: `akm` e `m92` (moram na família `ak`) ficam
  `ready:false` porque a aprovação de 07/09 foi "faca pistola e ak". `?vmready=ak` continua
  abrindo a família inteira para A/B.
- `rem700` voltou ao catálogo (tinha sumido da lane; família `bolt`).
- Medido no jogo real: `ak` = `gold#ak` com mãos; `pistol` = `pistol#pistol` (família, 3
  malhas de mão); `knife` = melee; `akm/m92/m4/awp` = LEGADO de propósito.

### Achado que muda o dossiê: a pistola aprovada é a ROTA DE FAMÍLIA
`pistol-hires.glb` (câmera 34°) **não** é o que você aprovou — é o piloto que entra 144×
maior. A pistola aprovada é `pistol-runtime.glb` (mãos KINEMATION) + wrap da pistola própria
+ `FAMILY_FRAME.pistol { fov: 55, rotDeg: [0, 15, -5] }`. Corrigi `01-VIEWMODEL-O-PROBLEMA.md`
§6.4 e a cláusula da régua `authored-vm-check` (que exigia `pistol.golden === true` — estava
vermelha na lane por isso).

### Regressão da main que o merge trouxe e que a régua pegou (BUG-170)
O rewrite do multiplayer (`0e3d1cd71`, 03/09) tirou o `throwUtility` das granadas — o
arremesso saía sem a animação paga. Restaurado com `_throwNade(kind, ammoKey)`: `release`
faz `pedirNade` online ou spawn local, só quando a animação libera.

### Cegueira de instrumento nova (BUG-171)
`eval:vm-identity` ID6 dizia "download 0,0 MiB" para a AK golden. Causa: buffer padrão de
Resource Timing = 250 entradas; o mapa estoura isso antes do GLB chegar. Agora 5000 e o
filtro aceita `-hires.glb`. Medido: 3,3 MiB.

## Segunda frente da noite: paridade de simulação (task H do GPT)

O incidente de 11/09 (nó rodando `alpha.206`, site `alpha.247`) passou pelo handshake porque
**protocolo igual não é jogo igual**. Fechado agora, dos dois lados:

- **Nó** (`game/index.js`): anuncia `clientVersion` no `welcome` e no `/health`, lido de
  `public/js/version.js` da **árvore do cliente que a imagem clonou** — não de env, não de
  SHA. É a única string comparável com o que o jogador tem.
- **Cliente** (`public/js/net.js`): recusa a entrada quando a versão do nó não é a dele —
  `versao_incompativel`, socket fechado, sem sessão. Nó antigo (sem o campo) **continua
  entrando**: a mudança degrada, não quebra. `?mpversao=0` libera no desenvolvimento local.
- **UI** (`main.js`): mensagem com as duas versões e saída ("recarregue; se continuar,
  escolha outra região"), em vez do genérico "não deu pra conectar".
- **Régua** `npm run eval:mp-paridade` (P1–P5, no `check:fast`). Mutante
  `--mutante=aceita-tudo` patcha o FONTE de `net.js` e derruba P1 e P3b.

**A régua já mordeu na primeira execução:** subi o nó desta máquina e o `/health` respondeu
`clientVersion: 2.0.0-alpha.254` com o cliente em `2.0.0-alpha.261`. É exatamente a classe do
incidente, viva aqui, agora — e antes desta noite nada no sistema diria isso em voz alta.

### Regressões de mapa que o meu próprio merge causou (e a régua pegou)
- Eu tinha resolvido o conflito de `graffiti_layout.js` pelo lado da main, que **não conhece**
  `fy_lajes`/`fy_campomorro` (mapas que só existem na lane). Restaurei o layout da lane e
  regerei os 11 mapas: `eval:grafitelayout` verde, 3.379 peças.
- `map_campomorro`/`map_lajes` cravavam `shadow.mapSize.set` e liam `awpbr_settings` por conta
  própria — as duas coisas que a régua de qualidade de mapa existe para impedir. Agora usam
  `aplicaSombraSol()` e `qualidadeAtual()` do `mapquality.js`. QMAP1 e QMAP4 verdes.

## Réguas rodadas (porta 8167, jogo real)

| régua | resultado |
|---|---|
| `eval:authored-vm` | 0 falhas; mutantes `sem-golden`/`sem-familia` mordem |
| `eval:vm-camera` | 15/15; mutante `clamp` vermelho |
| `vm-autorado-vivo` | 1/1 (só `ak` está liberada e golden) |
| `vm-attach` autorado / legado | VERDE / VERDE; mutante `escondepack` vermelho |
| `check:vm` (recoil, melee, catalog, serving, identity, ads) | 6/6 |
| `eval:mp-paridade` | P1–P5 verde; mutante `aceita-tudo` vermelho |
| `eval:grafitelayout` · `eval:qualmapas` · `eval:comentario` | verdes (eram vermelhas pelo merge) |
| `check:fast` | **143/146** — as 3 restantes reproduzem na main (`eval:mapid`, `eval:redesign`, `audio:check`) |

## Conflitos do merge — o que escolhi
- `game.js` `_tryShoot`: mantive **"todo tiro traçado"** (seu pedido de 17/08) e trouxe o
  **cone sorteado pelo nó** da main (BUG-159). PUNCH/TRACER_STYLE + `coneDoDisparo` aditivos.
- `map_quebrada`: iluminação da main (`aplicaSombraSol`). `map_parque`/`penitenciaria`:
  imports de ambiência da lane + sombra da main.
- Gerados (README, STATUS, ARCH, docs/docs, KNOWN-RED, vm_kick_sim): lado da main, depois
  **regenerados** (`npm run docs` / `npm run arch`). Exceção: `graffiti_layout.js` teve de
  voltar para o lado da **lane** e ser regerado (a main não conhece 2 mapas da lane).

## O que só você decide (de manhã)

1. **Aprova as capturas de `noite-1909.html`?** AK golden em 3:2 e 16:9 (BUG-89 é a
   pendência do 16:9 — olhe a AK-idle 16:9), pistola família, faca. Se sim, esta branch vira
   o PR "viewmodel: 3 aprovadas + réguas" contra a main.
2. **akm** subiu com a AK em agosto e está segurada. Libera junto (`ready` em `akm`) ou julga
   separado?
3. Próximas a promover, uma por vez, cada uma com veredito seu: a lane tem 13 no golden
   (`m4 md97 scar famas m92 sks svd mosin lmg mp5 uzi p90`); shotgun e uzi não fecham ainda.
4. **Coro Factory** (harness 24/7): precisa de decisão sua sobre onde roda (container/VM),
   quais chaves de modelo e teto de custo. Não comecei o código.
   **Aviso de operação:** o modelo `fable-5-1` bateu limite de conta às ~02h com
   `retry-after ≈ 70 h` — os três subagentes de review (código/DX, backend, UI/UX) morreram
   nisso e os relatórios ficaram por fazer. O `sonic` responde em `opus-5` e é por onde vou
   retomar. Para trabalhar 24/7 de verdade, a fábrica precisa de **fila com backoff por
   modelo e fallback declarado**, senão uma noite inteira cai num 429.
5. Abrir PR do backend (`claude/paridade-simulacao`)? Ele é seguro (degrada em nó antigo),
   mas mexe no que o jogador vê ao entrar numa sala — prefiro seu aval.

## Procedência
Tudo acima foi medido nesta máquina em 19–20/09 na branch `claude/vm-integracao`; saídas de
régua estão nos commits e em `artifacts/viewmodels/arsenal/noite-1909-producao-{32,169}/`.
