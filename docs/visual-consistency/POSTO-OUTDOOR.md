# POSTO-OUTDOOR — sustentação da moldura do outdoor

31/10/2026 · GLM-POSTO-SUPPORT-R1

## Defeito

`public/js/map_posto.js`: o outdoor do muro leste tem moldura (aço, 0,3×6×7,69 m) com base em
y=3 m; o guarda-corpo leste (`map_posto.js:157`) termina em y=1,4 m. Vão de **1,6 m sem
sustentação legível** — o painel parece suspenso nas fotos T1/T2
(`CRITICO-POSTERS-REAL-R2.md`, §Posto e "Ajuste localizado recomendado").
O papel na face da moldura estava correto (2,5 cm, aspecto 1,338) e não foi tocado.

## Correção

No mesmo bloco do outdoor (`map_posto.js`, bloco OUTDOOR grande no muro leste):

- 2 **pernas** de aço 0,16×3×0,16 m (MAT.aco), de y=0 até a base da moldura, sob o pé da
  moldura (z = −18 ± 2,9);
- 1 **travessa** de base 0,14×0,14×6,1 m a y=0,05 (arremate de fundação);
- tudo `collide:false` (decoração estrutural: **zero colisor/cover novo**), meshes nomeadas
  (`posto-outdoor-perna-N`, `posto-outdoor-travessa`) dentro do grupo
  `posto-outdoor-suporte` — nomes impedem o batching de decor e mantêm a régua legível;
- moldura e poster ganharam nomes (`posto-outdoor-moldura`, `poster:<arquivo>`) para medição.

Não alterado: rodovia/visada, colliders, ground, spawns, pickups, arte, aspecto, highway.

## Régua

`tools/eval/posto-board-support-check.mjs` — sobe o mapa real (harness node puro) e mede
**geometria final posta em mundo** (Box3 worldbounds; vértices do plano do poster
transformados pelo `matrixWorld`), não userData/declaração/contagem. 6 cláusulas:

- **SUP1** moldura identificada por worldbounds (base ≥ 1,4 m);
- **SUP2** ≥2 pernas com **visibilidade real** (cadeia de ancestors `.visible`, `layers`
  camada 0, `material.visible`/`colorWrite`/`opacity`), cada uma do solo à base da moldura,
  com sobreposição XZ;
- **SUP3** nenhum AABB de `world.colliders` cruza o **vão inteiro** (pegada XZ completa da
  moldura, banda y 1,45→base), sobreposição estrita por eixo — pega colisor no meio do vão,
  não só junto às pernas;
- **SUP4** todos os vértices do poster dentro da altura/profundidade da moldura e a
  1,5–3,5 cm da face oeste (x) — poster deslocado em z (ou qualquer eixo) reprova;
- **SUP5** aspecto **real em eixos world** do plano transformado (z/y = 1,338 ±0,02) —
  `scale` que encolhe o painel reprova, não só `geometry.parameters`;
- **SUP6** apoios num único grupo de 2–4 meshes (drawcalls mínimo).

Mutantes em memória (mesma medição do nominal, mutação aplicada antes de medir), todos RED
com nominal GREEN, cada um na cláusula alvo (demais verdes): `sem-apoio` (SUP2+SUP6),
`interrompido` (SUP2), `oculto` (SUP2), `colisor` — AABB no meio do vão (SUP3),
`perna-rgb` — `material.visible=false` numa perna (SUP2), `papel-fora` — `position.z+=100`
(SUP4), `papel-fino` — `scale.x=0.1` (SUP5). São as 4 contraprovas do crítico + as originais.

CLI estrita validada antes do boot (arg inválida → exit 2); infra quebra → exit 3, sem veredito.

## Verificação executada

```
node tools/eval/posto-board-support-check.mjs                        # 6/6 PASSA, exit 0
node tools/eval/posto-board-support-check.mjs --mutante=<7 acima>    # FALHA na cláusula alvo, exit 1
node tools/eval/posto-board-support-check.mjs --mutante=foo          # exit 2
node tools/eval/posto-check.mjs                                      # 7/7 PASSA, exit 0
```

Antes (HEAD `4b25ea9ca`): FALHA — ver R1 (a régua R2 não foi re-executada contra o HEAD:
escopo desta rodada não inclui git).

## Custo (correção do R1)

- Chamadas de render: T1 med 229→233, T2 med 217→221, aumento de4 por quadro.
- Triângulos: aumento de36 nas duas poses pareadas.
- Drawcalls: **+4, não +3** — 3 peças novas (2 pernas + travessa) **+ a moldura nomeada,
  que sai do batch de decor** (`moldura.name='posto-outdoor-moldura'` quebra o merge).

Aprovação **visual** não foi dada por Node: Root/crítico repetem com foto.


## Aceitação causal no CI

O wrapper exige nominal6/6 e cada mutante com conjunto exato de cláusulas reprovadas, além do status1. Mutante sem cláusula acesa sai4 (sonda cega), nunca1 como uma reprovação medida. O wrapper recusa4, infra3, CLI2, saída incompleta e status1 com seis PASSA. A visual permanece o recorte das duas fotos reais; não equivale à aprovação de release.
