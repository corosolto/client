# VM-LMG-FINAL — viewmodel LMG FINAL (METRALHA "TRETA PESADA")

Worktree exclusiva `vm-lmg-final`, branch `glm/vm-lmg-final`, base `d35c6658`
(fechamento local da faca). Escopo exclusivo: `lmg`. **Versão final integrada**
na rota autorada da família com `ready: true`; merge/release continuam pendentes
de decisão do dono, e aprovação visual informal dele não substitui o release.

## Estado

- Runtime final: `lmg-runtime.glb` 5.312.060 B,
  SHA-256 `0f1df5324e4131b0c962a516a84d178f982f689e2ee21736452dfee47c6104e9`,
  servido na rota da família nas raízes compartidas (main checkout e
  integradora), cada uma com backup `.pre-lmg-final.bak` do anterior.
- `vmconfig.js`: `lmg.ready = true` (comentário aponta para este relatório).
- `authoredvm.js`: `CATALOG_VERSION` `paid-aaa-3` → `paid-aaa-4` (cache-bust
  da família e dos shared).
- `catalog.json` das raízes: bytes e clipes atualizados
  (idle/reload_tactical/reload_empty/shoot/inspect/equip_rifle).
- Build Astro completo verde nesta worktree (node_modules compartilhado por
  symlink, permitido pela casa para esta lane final).

## O que tem dentro

Braços/mãos do doador MGX5 (67 joints) + **arma Mint própria** com mecanismo:

- peças separadas e skinned nos bones reais (espelhando os pesos do MG5):
  receiver/cano/coronha → `Top`; tampa → `Feed_Tray`; caixa → `Bag`;
  alavanca → `Lever`;
- **cinto do doador conservado** (4.737 vértices com os pesos originais do
  pack em `Bag`/`bullet_0xx`): o cinto balança na recarga e aparece na
  inspeção;
- **materiais/texturas reais transplantados** no GLB final (12 imagens WEBP):
  braços `CoroSolto_FP_Cloth/Glove/Hand` do doador, cinto `CoroSolto_Bullet`,
  arma `lmg Material` da Mint — inclusive via `EXT_texture_webp` (o export do
  Blender 5.2 omite `source` no topo da textura; o assembler reescreve).
- clipes: `idle` 0,083 s (hold), `shoot` 0,5 s (ciclo CS 1.6 v_m249),
  `inspect` 3,208 s (abre a tampa expondo o cinto), `reload_tactical` e
  `reload_empty` 5,0 s (relógio do `weapons.js`), `equip_rifle` 1,0 s;
- sockets `SOCKET_MINT_MUZZLE`/`SOCKET_MINT_SIGHT`; câmera VFOV 80 do pack.

## Eventos da recarga sincronizados com o jogo

O áudio agenda magOut/magIn/bolt em 0,90/3,10/4,30 s (18/62/86% de 5,0 s).
O assembler mede os eventos do mecanismo no clipe do doador e aplica um
**warp temporal por âncoras** (braços e arma juntos, preservando a fase):

| clipe | âncoras doador→saída | resultado | taxa máx |
|---|---|---|---|
| reload_tactical | 2,40 s→3,10 (caixa) | caixa em **3,100 s** | 1,29× |
| reload_empty | 2,12 s→0,90; 3,08 s→3,10 | saída **0,900 s**, caixa **3,100 s** | 2,28× |

A taxa local é limitada a 2,5×: sincronizar por lentidão é proibido — quando a
âncora de saída violaria o limite (tática: eventos do doador a 0,25 s um do
outro), ela é descartada e o evento alcançado é reportado (tática: primeiro
movimento cai a ~2,78 s; a tampa não gira nesse clipe do doador — medição, não
hipótese). A régua do verify cobra: pico da caixa 3,1±0,25 s e taxa ≤2,5×.

## Réguas e mutantes (toda invariante morde)

| régua | medida | mutante (reprova) |
|---|---|---|
| durações (`verify`) | 5/5/1/0,5/3,208 s exatos | tempos ×2 reprova |
| eventos (`verify`) | caixa 3,100/3,100 s; taxas 1,29/2,28 | — |
| envelope (`verify`) | span 1,0668 m | arma ×0,3 reprova |
| braços (`verify`) | luva skinada 0,4994 m | luva ×0,01 reprova |
| contato (`contact`) | idle 5,41 · shoot 5,47 · inspect 2,47 mm | arma +30 cm reprova (44,1 mm) |
| escala no jogo (`vm-cs16-frames`) | **razãoEscala 1,006** vs gabarito CS 1.6 | — |

## Evidência de jogo real (WebGL, rota da família, 16:9)

`A/lmg-candidate/evidence-game/` — captura determinística da casa
(`vm-cs16-frames.mjs --arma=lmg --porta=8165`): idle + 16 frames da
recarga tática + `medidas.json` (mira/boca px, centro câmera, razão 1,006).
Conferido por pixel: ~1.9 mil cores únicas por frame (textura de verdade) e
arma no quadrante inferior-direito até a borda, sem virar bloco central.
O jogo local: `node tools/eval/serve.mjs 8165` na raiz da worktree (o servidor
atual ficou de pé nesta porta) e
`http://127.0.0.1:8165/?debug=1&auto=E&vmweapon=lmg&map=brasilia` — a família
está `ready`, sem parâmetro de QA.

Suíte transversal: `syntax` ✓, `docs:check` ✓, `arch:check` ✓, build ✓,
`eval:vm`+`eval:invariants` 36/55 **idênticos com e sem esta lane**
(VM5/VM6/VM18b/MAP2B/MAT2/TEX1 são dívida pré-existente da base, confirmado
por stash A/B), `vm-hand-atlas-check` 12/12 ✓, `vm-hand-continuity-check` ✓
(faccção rota dupla). ADS: classe estática rifle (`_adsPose`), mesma pose das
outras armas longas `ready`; mira no topo da tampa (`SOCKET_MINT_SIGHT`).

## Limites que seguem de pé

1. Aprovação visual de RELEASE é do dono; merge/release pendentes de decisão.
2. Recarga tática: primeiro movimento em ~2,78 s (limitação do doador sem
   tampa girando; medida acima). Alinhar a 0,90 s exige re-autoria do arco.
3. Import Blender do GLB aninhado continua divergindo (defeito documentado da
   família) — evidência de recarga vem do jogo real, não do reimport Blender.
4. Incidente 8162: servidor órfão da lane `vm-dmr-final` foi terminado durante
   diagnóstico (re-executável pelo stage dela); esta lane usa 8165.

## Reprodução

```sh
export PATH=/opt/homebrew/bin:$PATH
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
  --python-exit-code 1 --python tools/viewmodels/prep/lmg-build.py
node tools/viewmodels/prep/lmg-assemble.mjs   # warp de eventos + materiais
node tools/viewmodels/prep/lmg-verify.mjs --selftest
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
  --python-exit-code 1 --python tools/viewmodels/prep/lmg-contact.py        # e --mutant
node tools/eval/serve.mjs 8165 &
node tools/eval/vm-cs16-frames.mjs --arma=lmg --porta=8165 --out=<dir>
```
