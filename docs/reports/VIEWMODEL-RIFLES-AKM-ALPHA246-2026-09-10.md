# AKM final opt-in sobre alpha.246

## Resultado

A AKM foi reautorada com sua malha pública própria sobre o rig, as mãos, a
câmera e a gramática de ações da fundação AK aprovada. A fonte chega como uma
única malha de 6.944 vértices; a receita solda duplicatas exatas em 2.477
vértices topológicos e faz um corte bilateral por faces para separar o
carregador curvo completo. A alavanca real de retenção do pente é uma ilha
própria e também foi separada.

O produto contém `idle`, `equip_rifle`, `shoot`, `reload_tactical`,
`reload_empty` e `inspect`, além de câmera, muzzle, sight e enquadramento ADS.
As duas recargas pressionam a trava, removem o pente e reassentam a reposição.
A fonte pública não contém um charging handle separável; nenhum vertex da AK
doadora foi publicado como se pertencesse à AKM para ocultar essa lacuna.
Estado: `ready:false`, família AK e ativação global desligadas.

## Proveniência e produtos externos

| Item | Bytes | SHA-256 |
|---|---:|---|
| fundação pública AK com mãos/ações | 3.414.520 | `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29` |
| corpo público AKM | 273.828 | `3b835674db9d5c11d75f8652ef3edc9794e529091bff91795eb3e08881bfd0b3` |
| Blender final externo | 5.030.226 | `246e8dd123e3f6f92fd372c38ca5e7429bac5f40e46d198d4840f65b095760e5` |
| GLB bruto externo | 2.652.968 | `011ee6c583d8227a64cba06d19d00453015495de4c71c7f06380ff1caa7ce684` |
| manifesto de build externo | — | `06f41e35af8c351df77aa29824b9bef1ff56e940eeb6c6ef111f08c909a9b3ee` |
| relatório do otimizador externo | — | `3ca70eb28836bb0961d1197fa8d0d15507d3702038fe56697ae768ceb4229f3b` |
| GLB otimizado externo | 2.614.644 | `54c72408d40dfc9bf7c37beddffa4411c7ecc8ba9f20f8ce7b7c4ce8b270a378` |

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/akm/
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/optimized/ak/akm-baked-runtime.glb
```

Os binários continuam fora do Git e do build público.

## Corte causal e mecanismo

O corte do pente seleciona 407 das 4.698 faces da fonte, preservando a casca,
as nervuras, o lábio e a base. A alavanca usa outras 70 faces; 4.221 ficam no
corpo. As somas são disjuntas e fecham exatamente a fonte. A auditoria externa
preserva vistas dos dois lados e os candidatos topológicos em:

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-akm-audit-20260910/
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-akm-regions-20260910/
```

A trava percorre 0,006 m em cada recarga; o pente percorre 1,8507 m e a
reposição 1,0496 m na base AK, com distância mínima de 0,2287 m da mão de
apoio. As duas recargas retornam ao idle. O `reload_empty` conserva a diferença
cinemática do bone de ferrolho da fundação, mas a ausência do comando visível
próprio permanece declarada e deve ser julgada na revisão humana.

## Gates e evidência real

- `npm run eval:vm-rifle-akm`: verde; nove mutantes morderam, cobrindo clipes,
  corpo, pente, trava, câmera, sockets, contato, recargas e inspect;
- `npm run eval:vm-rifle-akm-lifecycle`: verde; 30 ciclos, 540 amostras em
  3:2/16:9 e seis mutantes de lifecycle;
- 20 capturas reais cobrem idle, dois pontos do draw, tiro, dois pontos de cada
  recarga, inspect e ADS nas duas proporções. Houve zero erro fatal de
  viewmodel/WebGL; os 84 erros de console são 404/CORS locais já classificados
  pelo harness.

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-akm-20260910/
capture.json       594141d052483cd14394192513664358fd1681e63268690ed4616f355b04d335
contact-sheet-3x2  7b955f3a510fcc73a1f6e8fd5c21d51da32db39fa670881afbfdac2c875391c4
contact-sheet-16x9 fefb0892d2f1e05686ca6001441fdc27f8396677d115248ad6ce25c8fe0faa64
```

As folhas mostram a silhueta AKM, coronha e pente próprios, mãos e mangas do
time, ADS centralizado e a apresentação vertical das recargas. A aprovação
humana precisa reproduzir o ciclo inteiro e decidir se a fonte sem charging
handle visível atende à barra final. Até isso ocorrer, o candidato fica
fechado.

## Preview isolado e drift da Mosin

O preview usa o snapshot imutável
`preview-snapshots/726ab95eb-54c72408`, cujo manifesto tem SHA-256
`d9b9b73ecfcbdbf646ce5ca207a862a54cd5662cbcd42dc23313217214cbed22`.
Ele preserva a Mosin validada de 5.298.504 bytes /
`94386beceefde96a481458c296f616178ae56f8a1a70b8ae63be8697841655a2`.
O produto privado alterado continua intacto e rejeitado em 5.252.988 bytes /
`e8d73477705e142f79da1032bf2d583f149174df659166e1c5408b6053e4b2d3`.

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/Users/ruben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/726ab95eb-54c72408 \
  npm run preview:vm-precision
```

A URL impressa inclui `vmweapon=akm`. Checkpoints: `d11df56dd` e
`726ab95eb`.
