# M92 final opt-in sobre alpha.246

## Resultado

A M92 foi reautorada a partir da malha pública própria sobre a fundação AK já aprovada. A fundação
fornece somente rig, mãos, câmera e gramática de ações; toda a geometria visível da arma vem da
M92 pública. A preparação solda duplicatas exatas e separa por conectividade o carregador curvo
integral e o comando lateral direito. O corpo, o carregador inserido, o carregador de reposição e o
comando permanecem nós distintos ligados ao rig.

O produto contém `idle`, `equip_rifle`, `shoot`, `reload_tactical`, `reload_empty` e `inspect`, além
de câmera, sockets de mira e muzzle. As duas recargas removem e reassentam o carregador; somente a
recarga vazia tem o ciclo próprio do comando lateral. O gate mede mecanismo, retorno a idle,
contatos relativos às mãos e comprimento visual de 0,684 m. A candidata está disponível apenas por
opt-in individual. Estado: `ready:false`, família AK e ativação global desligadas.

O AK golden aprovado não foi reautorado neste marco. A M92 herda sua fundação causal sem substituir
o produto, os materiais ou o estado aprovado do AK.

## Proveniência e produtos externos

| Item | Bytes | SHA-256 |
|---|---:|---|
| fundação pública AK | — | `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29` |
| corpo público M92 | 442.856 | `575ff58ae569392386edd2d8147904dd9e9dd75cb8979c1a95196457dbf70230` |
| Blender final externo | 5.205.515 | `119b4196cc6c03fbde48b291b360deee86c350680388d6eea2a57dde00d0869a` |
| GLB bruto externo | 2.787.996 | `a53ab103f307e1ac51020d58011729cab6aff3e2bed87018f78633b98f8c2f16` |
| manifesto de build externo | — | `c5ed2b59bdaa4118ff07de5b4cc2173321e32819e2aa919ed16917b01b6f1d3d` |
| GLB otimizado externo | 2.749.676 | `491964e9efb304553821293e874ab464b2078c84a52b719f78a801e36edae95f` |

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/m92/m92-final.blend
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/m92/m92-baked-runtime.glb
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/optimized/ak/m92-baked-runtime.glb
```

Nenhum desses binários entra no Git nem no build público. O otimizador não substituiu texturas de
braço porque a fundação pública AK usa seu próprio atlas público incorporado.

## Gates e evidência real

- `npm run eval:vm-rifle-m92`: verde; nove mutantes morderam — clipe ausente, carregador ausente,
  carregadores congelados, recargas iguais, sight ausente, câmera ausente, comando congelado,
  corpo trocado e inspeção parada;
- `npm run eval:vm-rifle-m92-lifecycle`: verde; 30 ciclos, 540 amostras alternando 1440×960 e
  1440×810, com seis mutantes de promise obsoleta, lacuna pré-load e sumiço em transições;
- `npm run eval:vm-foundation`: verde, 20/20, preservando os 26 IDs, fallback e fronteira privada;
- `npm run build`: verde depois de desmontar o preview privado;
- 20 capturas reais cobrem idle, draw, tiro, duas fases de cada recarga, inspect e ADS em 3:2 e
  16:9. Não houve erro fatal de viewmodel/WebGL. O harness registrou 84 erros locais não fatais de
  404/CORS já classificados fora da candidata.

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-m92-20260910/
capture.json        6c863fdce9a229ad4ec049c4b5a1e1bbeb80a371679a0eba238d8ca4e3445a79
contact-sheet-3x2   a95e5946d4822fe8621aa1e88effe371decdad371efdc4fb60c1ac45a1718ce7
contact-sheet-16x9  dd31fd582350657dbc66d57407599ae5a7456f1926e24c66aab2c76bec452984
```

## Revisão humana pendente

As folhas confirmam a silhueta compacta Zastava, madeira, carregador curvo, mãos, draw, tiro,
inspect e linha de ADS nas duas proporções. Três pontos permanecem deliberadamente sem promoção:

1. no frame de 70% das recargas, a apresentação vertical alongada deixa o carregador difícil de
   ler ou parcialmente fora do quadro;
2. as capturas de 40%/70% das recargas tática e vazia são visualmente próximas, apesar de o gate
   causal medir a diferença do comando lateral;
3. o ADS centraliza o cano, mas o corpo traseiro e a mão/manga ocupam parte inferior da mira.

Ruben deve julgar esses pixels e o contato durante a ação completa no jogo antes de qualquer
`ready:true`. Checkpoints: `f71613c69` (reautoria) e `71c4f0408` (runtime opt-in e evidência).

## Preview consolidado isolado

Antes desta captura, o arquivo externo da Mosin mudou de 5.298.504 bytes /
`94386beceefde96a481458c296f616178ae56f8a1a70b8ae63be8697841655a2` para 5.252.988 bytes /
`e8d73477705e142f79da1032bf2d583f149174df659166e1c5408b6053e4b2d3`;
`prepare_precision_preview.mjs` recusou corretamente materializar a raiz. O arquivo alterado não
foi sobrescrito. A continuidade posterior criou um snapshot isolado com a fonte validada da Mosin
e registrou os dois hashes, mantendo o produto divergente fail-closed. O preview consolidado agora
é reproduzível contra esse snapshot imutável:

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/Users/ruben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/ede70146f-8de215ed \
  npm run preview:vm-precision
```
