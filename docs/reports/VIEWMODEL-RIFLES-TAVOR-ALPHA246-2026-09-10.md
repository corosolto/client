# Tavor final opt-in sobre alpha.246

## Resultado

A Tavor foi reautorada a partir da malha pública própria sobre o rig, as mãos,
a câmera e a gramática de ações da M4 final. A inspeção topológica soldou
duplicatas exatas e isolou duas peças existentes na fonte: o carregador
bullpup traseiro completo, com 40 vértices topológicos, e o paddle real de
liberação, com 36. O corpo restante tem 2.356 vértices topológicos. Não foi
inventado ferrolho, cartucho ou comando ausente.

O produto contém `idle`, `equip_rifle`, `shoot`, `reload_tactical`,
`reload_empty` e `inspect`. Ambas as recargas retiram e reassentam o carregador;
somente a vazia pressiona o paddle depois da inserção. Câmera, ADS, muzzle,
sight e marcadores de contato permanecem explícitos. Estado: `ready:false`,
família AR e ativação global desligadas.

## Proveniência e produtos externos

| Item | Bytes | SHA-256 |
|---|---:|---|
| fundação M4 final | — | `e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe` |
| corpo público Tavor | 302.180 | `958f09eec9033af88c954d57fef4130827a2b2958109c12f52644e1e7ace573c` |
| Blender final externo | 2.233.692 | `888a47a20e5283ec9396bc83737eb314c594aa16c3c21dbd8becc496d876f145` |
| GLB bruto externo | 1.625.940 | `b722ec9b521762a674cce24d18efe6acd7d9d32c11c61a7b070f3f0540a02a96` |
| manifesto de build externo | — | `3c11109e05b04355b73a25fc21914f72eaa8e0b06107dcb3b210c7285b25e0cf` |
| relatório do otimizador externo | — | `4ca915811c9640100cf8976278f36305376fdc6e58301e309d200158a47ada90` |
| GLB otimizado externo | 1.603.920 | `e90326406e6619f8b9799516474857db88f1785f1d56c52f56420cf0cec5ed0f` |

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/tavor/
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/optimized/ar/tavor-baked-runtime.glb
```

Os binários continuam fora do Git e do build público.

## RED causal e apresentação da recarga

A primeira saída passou nos gates numéricos, mas as duas folhas reais mostraram
o carregador traseiro abaixo do quadro durante o contato, sobretudo em 16:9.
Essa rodada foi preservada em `evidence/rifles-tavor-red-20260910/`. A correção
anima o pacote inteiro durante a recarga: inclina 0,20 rad e eleva 0,08 m a
região bullpup nos frames de contato, retornando exatamente ao idle. O movimento
mantém arma, rig e mãos no mesmo espaço e não altera equip, tiro, inspect ou ADS.

| Evidência RED | SHA-256 |
|---|---|
| `capture.json` | `9a73676a96420b362fc842b441fc28fe38aa9525de619692822793a10bbe223e` |
| folha 3:2 | `dcf028fb9b2095f82aecfb64645284f81a0af11f36144713adeb3b14a0e2dd66` |
| folha 16:9 | `6db174e7b1a1b8c8c46af096cc367f6d8e8de7677f0ef24d6e5e629a1bcddff8` |

## Gates e evidência real

- `npm run eval:vm-rifle-tavor`: verde; dez mutantes morderam, cobrindo
  clipes, corpo, carregador, paddle, contato, diferença entre recargas, câmera,
  sockets e inspeção;
- excursão do carregador: 0,2139 m, com retorno ao poço; distância mínima da
  mão esquerda: 0,1115 m no tático e 0,0961 m no vazio; excursão do paddle no
  vazio: 0,0156 m e zero no tático;
- `npm run eval:vm-rifle-tavor-lifecycle`: verde; 30 ciclos, 540 amostras em
  3:2/16:9 e seis mutantes de lifecycle;
- `npm run eval:vm-foundation`: verde, 20/20, preservando os 26 IDs, fallback e
  fronteira privada;
- 22 capturas reais no commit `3119608cb` cobrem idle, dois pontos do draw,
  tiro, dois pontos do reload tático, três do vazio, inspect e ADS nas duas
  proporções. Houve zero erro fatal de viewmodel/WebGL. Os 84 erros de console
  são 404/CORS do ambiente local já classificados pelo harness.

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-tavor-20260910/
capture.json       29044da17f7a062a09a1b48f116c3013af8e3a08b9be0085762cc843758cdf78
contact-sheet-3x2  a622b0a2e25e00625e9d67035e91a977ff6b40a5ad3259f267711ab5051c0340
contact-sheet-16x9 3256d4308e4267dbf154a67aa2e4b17eb862117b7c5bb321ede334f3757f0acc
```

As folhas corrigidas mostram a silhueta bullpup própria, receiver e mão de
apoio durante as recargas, além do ADS centralizado. A manga ocupa a faixa
inferior nos frames de contato; a decisão estética final exige reprodução da
animação completa pelo dono. Até esse aceite, a candidata permanece fechada.

## Preview isolado e drift da Mosin

O preview usa o snapshot imutável
`preview-snapshots/3119608cb-e9032640`, cujo manifesto tem SHA-256
`a07a9e54d137e764902451ed77064769a67c3d7d7e3b8ef60908cc5f2d07a3bf`.
Ele preserva a Mosin validada de 5.298.504 bytes /
`94386beceefde96a481458c296f616178ae56f8a1a70b8ae63be8697841655a2`.
O produto privado alterado continua intacto e rejeitado em 5.252.988 bytes /
`e8d73477705e142f79da1032bf2d583f149174df659166e1c5408b6053e4b2d3`.

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/Users/ruben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/3119608cb-e9032640 \
  npm run preview:vm-precision
```

A URL impressa inclui `vmweapon=tavor`. Checkpoints: `cc643e014`,
`83d1124d9` e `3119608cb`.
