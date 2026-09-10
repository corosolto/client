# Carabina final opt-in sobre alpha.246

## Resultado

A Carabina foi reautorada a partir da malha pública própria sobre o rig, mãos,
câmera e gramática de ações da M4 final. A inspeção bilateral e topológica
identificou duas peças reais na fonte: a alavanca de 162 vértices topológicos e
a portinhola direita de alimentação de 14 vértices. O corpo restante tem 2.154
vértices topológicos. Nenhum pente destacável ou cartucho foi inventado.

O produto contém `idle`, `equip_rifle`, `shoot`, `reload_tactical`,
`reload_empty` e `inspect`. O tiro executa um ciclo completo da alavanca em
0,50 s. Ambas as recargas usam três pressões da mão sobre a portinhola; somente
a recarga vazia termina com outro ciclo da alavanca. Câmera, ADS, muzzle e
marcadores de contato permanecem explícitos. Estado: `ready:false`, família AR
e ativação global desligadas.

## Proveniência e produtos externos

| Item | Bytes | SHA-256 |
|---|---:|---|
| fundação M4 final | — | `e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe` |
| corpo público Carabina | 242.868 | `9bbed4fec57b56c9a0aafe50a74bc4df6c3a138f2671dbb15c0d5cc6a27d4f3f` |
| Blender final externo | 2.395.395 | `8e1a1c9255369a17532c0abc875d0e15385637d44230012caafe509d1d5200cf` |
| GLB bruto externo | 1.659.332 | `d38c61a13ce9f075b34c7eae1d45e4f320eec0c12c3a818fcefc205f47ff2eb3` |
| manifesto de build externo | — | `0fcb29421d33462fff66a15fb74cd442a69954415a99337181c600d671f71330` |
| relatório do otimizador externo | — | `282eb04bc5db54b5d9c0d22459e0547b00ba7f5db45e47a7e8fdd9e7b1a2e9af` |
| GLB otimizado externo | 1.631.536 | `8de215edb19630a187143cbc0c09e5a3596d3ed816a3dfe7d741d842cb9834f0` |

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/carbine/
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/optimized/ar/carbine-baked-runtime.glb
```

Os binários ficam fora do Git e do build público.

## RED causal e correção visual

A primeira saída passou nos gates numéricos, mas a captura real reprovou a mão
forte durante o tiro: a corrente de IK percorria 0,9475 m e projetava uma luva
dominante contra a câmera. A influência foi reduzida para apenas fechar o
contato final com a alavanca. A excursão caiu para 0,0901 m, a distância mínima
à alavanca ficou em 0,0454 m e o mutante de alavanca congelada continuou
mordendo. Na alimentação, a influência de IK ficou em 0,75: a mão cobre a
portinhola nos frames centrais sem ocupar o centro da tela.

O antes foi preservado em
`evidence/rifles-carbine-red-20260910/`: `capture.json`
`52e88391635dbcfef5d8db3c7131247820a88e7df2a3a2ff1ef5fa23e55e5414`,
folha 3:2 `11882f222afd1ea80e37935f70d027073a88fcba57035b77e05e4960eefaa475`
e folha 16:9 `cb8e521a88bc3f78cd7678bc361db13c5ee4d806a82b27af60051ec873e36d07`.

## Gates e evidência real

- `npm run eval:vm-rifle-carbine`: verde; onze mutantes morderam, cobrindo
  clipes, alavanca, portinhola, contato, diferença entre recargas, câmera,
  sockets, identidade do corpo e inspeção;
- `npm run eval:vm-rifle-carbine-lifecycle`: verde; 30 ciclos, 540 amostras em
  3:2/16:9 e seis mutantes de lifecycle;
- `npm run eval:vm-foundation`: verde, 20/20, preservando os 26 IDs, fallback e
  fronteira privada;
- 26 capturas reais no commit `dc8b68f04ff32bbb6592169c1d6528f1bdff63d4`
  cobrem idle, dois pontos do draw, tiro, três fases de cada recarga, fim da
  recarga vazia, inspect e ADS nas duas proporções. Houve zero erro fatal de
  viewmodel/WebGL. Os 84 erros de console são 404/CORS do ambiente local já
  registrados pelo harness.

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-carbine-20260910/
capture.json        40f24d6764de342b906cb2c83c2607061db258d30f5b9740d5274bde66443637
contact-sheet-3x2   b56e643d50a4bf562d158ab5db623b9a2e3038288119faa8dbf093497ae278df
contact-sheet-16x9  baff9d7da52920f700948225eb605d76d6e93ae35df75f73e62b689f44cb39cd
```

As folhas mostram a silhueta longa, madeira e aço, ADS centralizado, mão de
apoio nas recargas e mão forte no ciclo da alavanca nas duas proporções. Ainda
é necessária aprovação humana durante a animação completa antes de qualquer
`ready:true`.

## Preview isolado e drift da Mosin

O preview usa o snapshot imutável
`preview-snapshots/dc8b68f04-8de215ed`, cujo manifesto tem SHA-256
`bb10a0eb11e3656d514d4c73e60ed10ede712409c7965d39d69d69943b408069`.
Ele contém a Mosin validada de 5.298.504 bytes /
`94386beceefde96a481458c296f616178ae56f8a1a70b8ae63be8697841655a2`.
O produto privado posteriormente alterado continua intacto e rejeitado em
5.252.988 bytes / `e8d73477705e142f79da1032bf2d583f149174df659166e1c5408b6053e4b2d3`.
Os dois hashes permanecem registrados; nenhum arquivo divergente foi
sobrescrito ou mascarado.

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/Users/ruben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/dc8b68f04-8de215ed \
  npm run preview:vm-precision
```

URL impressa pelo comando inclui `vmweapon=carbine`. Checkpoints da Carabina:
`20a394bf9`, `1e7549966` e `dd32c516e`.
