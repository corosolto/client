# PT-38 final opt-in sobre alpha.252

## Resultado

A PT-38 preserva o produto KINEMATION X18/G18 aprovado pelo dono em 07/09:
mesma malha licenciada, duas mãos, skins, materiais, câmera e clips `idle`,
`shoot`, `reload_tactical` e `reload_empty`. A receita final acrescenta somente
`inspect` no root comum e sockets medidos de muzzle/sight, necessários para o
contrato completo do catálogo. O saque continua usando o arco procedural da
família pistol já sincronizado ao gameplay.

O produto contém carregador destacável, slide, gatilho, cano e cartucho próprios.
O disparo move slide e gatilho; as duas recargas removem o carregador por
trajetórias distintas; a inspeção move mãos e arma como um conjunto e fecha no
idle. O ADS agora usa muzzle/sight reais em vez do pull residual documentado na
fonte. Estado: `ready:false`, família pistol e ativação global desligadas.

## Proveniência e produtos externos

| Item | Bytes | SHA-256 |
|---|---:|---|
| PT-38 aprovada na fonte | 3.005.712 | `edb77908eadffd90fa3c2152ac00386372bf3002d20fb2c4d324d15ddad17e05` |
| GLB final bruto externo | 3.006.796 | `04c126d93148f9cf0ffa07927f4d09cde2067d9abbc9ddcd25d3b811923fa3b8` |
| manifesto de build externo | 1.162 | `21fb380fab65b2885fdc279ff0d29d369c920e7dda0d50669bc6600f7c93b9fc` |
| relatório do otimizador externo | 797 | `195fb7bb04815883a3b82d1b7fc03f003d697a8bb325aa3f3390abd3c1f5f442` |
| GLB final otimizado externo | 3.006.796 | `04c126d93148f9cf0ffa07927f4d09cde2067d9abbc9ddcd25d3b811923fa3b8` |

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/source/pt38/
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/optimized/pistol/pistol-runtime.glb
```

Os binários licenciados permanecem fora do Git e do build público. A receita
rejeita uma fonte cujo hash não seja exatamente o aprovado.

## Mecanismo, contatos e câmera

O GLB conserva 67 joints de braços, 8 joints da arma e a malha
`GEO_WEAPON_PISTOL_SK_G18`. Na amostragem em world space, o slide percorre
0,0850 m e o gatilho 0,0459 m durante o disparo. O pente percorre 0,2055 m na
recarga tática e 0,2111 m na vazia. A mão forte varia apenas 0,0002–0,0006 m em
relação à arma nas ações originais.

A inspeção acrescentada percorre 0,0380 m, preserva a distância relativa da mão
forte com deriva zero e termina exatamente na pose inicial. Muzzle e sight são
filhos, respectivamente, dos joints `Barrel` e `Slider`; portanto acompanham a
mecânica durante tiro, ADS e troca de estados.

## Gates e evidência real

- `eval:vm-pistol-pt38` passou cinco clips, duas mãos, câmera, sockets,
  mecanismos e dez mutantes causais;
- `eval:vm-pistol-pt38-lifecycle` passou dez checks, 30 ciclos e 540 amostras,
  cobrindo draw, tiro, recargas, inspect, ADS, fallback, troca, morte e terceira
  pessoa;
- o gate vermelho anterior falhava pela ausência do manifesto final;
- 20 capturas reais cobrem dez estados em 1440×960 e 1440×810, sem erro fatal
  de viewmodel, WebGL ou shader. Os 84 registros não fatais são 56 respostas
  404, 14 `ERR_FAILED` e 14 bloqueios CORS da telemetria no dev local.

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/pistols-pt38-20260914/
capture.json       19250154f3069a56f32daf00103e31b0f4c849b7206068e4d9375898113c932a
contact-sheet-3x2  5a0cb651f0bfb3bc206e9296d3697c705040a364e0deef9a965bdfbd525fd6ce
contact-sheet-16x9 b2d15c68985228008facbc9cbc5cb796ad4f6a78ce3c40980e78c61437c0dd58
```

As folhas mostram identidade, duas mãos, HUD, saque, tiro, recargas, inspeção e
ADS. A inspeção interna não encontrou corte novo ou perda da arma nos dois
aspectos. A aprovação antiga continua válida para o produto-base, mas não cobre
o novo `inspect` e o novo ADS; por isso a candidata segue fechada por padrão até a
revisão humana no Game.

## Snapshot e reprodução

O preview usa o snapshot imutável
`preview-snapshots/c9795c612-04c126d9`, derivado da AWP. O manifesto do snapshot
tem SHA-256
`e30751c4b067bec51cc1e5264d0b35a6df7b553c440ba60c1afa4b883194c01a`.

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/Users/ruben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/c9795c612-04c126d9 \
  npm run preview:vm-precision
```

Abrir a URL impressa e selecionar `pistol`. O preview privado precisa ser
desmontado com `npm run cleanup:vm-precision` antes do build público.
