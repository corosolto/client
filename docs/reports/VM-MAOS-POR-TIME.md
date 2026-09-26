# Mãos por time em todos os viewmodels

Pedido do dono (11/09): "skins de mãos diferentes por time, mas tudo na mesma escala".
Escopo: por **time** (facção), não por personagem. Branch `vm/maos-por-time` (base `vm/fabrica`).

## Os três rigs de braço

| rig | malha | onde aparece | layout do atlas |
|---|---|---|---|
| K | `SK_Arms_Mono` (`CoroSolto_FP_{Cloth,Glove,Hand}`) | fábrica (15 produtos), catálogo K (demais armas), granada, faca K | `hands/pistol/` |
| L | `armmesh_Mat_0` (`CoroSolto_FP_Gloves`) | faca aprovada `coro/melee/knife-hires.glb`, PT-38 golden | `hands/knife/` |
| A | `Requests_Studio_Hands` (`CoroSolto_FP_Gloves` + `CoroSolto_Mandrake_Sleeves`) | AK golden `coro/ak-hires.glb` e os outros `coro/*-hires.glb` de metarig | `hands/ak/` |

`CoroSolto_FP_Gloves` existe em L e em A com UVs diferentes: o runtime escolhe o atlas pelo
**osso** da malha (`handLayoutOfMesh` em `public/js/vmhands.js`), não pelo nome do material.

## Auditoria (jogo real, `?vmauthored=1&vmfabrica=1`, troca de time em runtime)

Base `origin/vm/fabrica`, `node tools/eval/vm-maos-time.mjs --base=origin/vm/fabrica`:

- 25 armas de fogo + faca K + granada: rig K, atlas do time em E/B/U/C/F.
- **Míticos (M)**: facção `ready` sem estilo — caía no neutro em todas as armas.
- **AK golden (rig A)**: nenhum time; o `authoredvm` pulava a golden inteira (acabamento
  aprovado Mandrake para todo mundo). Hoje a `ak` do jogo serve o produto K (`ak#ak`), não a
  golden: a decisão de servir a golden (`golden:true` no vmconfig) é do dono/da fábrica.
- Faca L: atlas `hands/knife/` já existia (E/B/U/C/F); faltava M.
- Troca de time: `AuthoredViewModels.setProfile` reaplicava tudo no layout `pistol`.

## O que mudou

- `tools/viewmodels/lib/hand-rigs.mjs`: a geometria sai do próprio GLB (UV, pesos, cabeça do osso
  pela `inverseBindMatrix`); a pintura é a mesma dos atlas de 05–06/09, no referencial da mão
  (pulso→médio = 1). `build-team-hand-textures.mjs --conferir` repinta K e L: média |Δ| por canal
  0,85–2,6 contra os WebP servidos (compressão). Os atlas aprovados de E/B/U/C/F em K e L não
  foram reescritos.
- Atlas novos: rig A (7 estilos × luva/manga), M em K e L, neutro repintado com a base da
  fábrica (`braco-coro-ak`: luva `#242f38`, manga `#243c4d`).
- `vmhands.js`: estilo M (luva de couro, manga roxa da facção, trama de palha), neutro da
  fábrica, `refreshTeamHands` usa o layout do próprio material.
- `authoredvm.js`: golden recebe o time; `?vmgolden=ak` serve a golden na revisão.

## Régua `eval:vm-maos-time`

Por arma × facção jogável, no jogo real (`?bloom=0`): todo material de mão é o atlas do time; num
passe de albedo (mãos com o mapa servido, sem luz nem tone mapping; arma em verde sentinela) a
fração de pixels fora da paleta ≤ 0,12, a mediana da luva/manga a ≤ 14 RGB da cor declarada, e
entre armas do mesmo time a ≤ 10 RGB. Procedência: o atlas pinta cor × tom 0,70–1,02
(`hand-rigs.mjs`), então a paleta com esse tom cobre o atlas inteiro menos bordas filtradas.

Mutantes: `golden-sem-time` (base: rig A fora), `faca-time-errado` (faca presa no B),
`atlas-trocado` (identidade certa, pixels do B no E) — os três mordem, o último só pelo pixel.

Não mede: luz, movimento, gosto do motivo. Isso é do crítico e do dono.

Página: `artifacts/maos-por-time/index.html` (`node tools/eval/vm-maos-time-pagina.mjs`).

## Crítico cego (vm-critico-visual, folha AK golden × M4 × pistola × seis times)

Rodada 1: C aprovada; B, U, E ressalva; M reprovada (a trama virava "onça" na M4 e listra na
pistola, roxo vazando no punho da golden); F reprovada (sem motivo, "o U sem o xadrez").
Consertos: motivos novos desenhados em volta do eixo do braço, só na luva; F ganhou cordão de
ouro (proposta, commit separado para o dono aceitar ou reverter).

Rodada 2: B e C aprovadas; U, M e E ressalva; **F segue reprovada** — o cordão no pulso lê na AK,
vira faixa com cara de onça na M4 e some na pistola (a pistola quase não mostra punho nem manga:
E e F viram a mesma mão). Pendentes que ficam com o dono: identidade do F (e do E) precisa morar
no dorso da mão, não no punho, para aparecer na pistola; a escala aparente do xadrez (U) e da
trama (M) muda entre a golden e o K porque o enquadramento da golden mostra a mão mais de perto
(a pintura é na mesma escala por mão; não medido na tela). Parado em duas rodadas pelo detector
de giro da skill.
