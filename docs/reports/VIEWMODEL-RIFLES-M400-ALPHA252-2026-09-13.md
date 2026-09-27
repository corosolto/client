# M400 final opt-in sobre alpha.252

## Resultado

A M400 foi reautorada com sua malha pública própria sobre o rig, as mãos, a
câmera e a gramática de ações da fundação AK aprovada. A fonte chega como uma
única malha. A receita solda duplicatas exatas em 2.515 vértices topológicos e
faz cortes determinísticos por faces para separar o carregador curvo completo,
o botão real de retenção do pente à direita e o bolt catch real à esquerda.

O produto contém `idle`, `equip_rifle`, `shoot`, `reload_tactical`,
`reload_empty` e `inspect`, além de câmera, muzzle, sight, enquadramento ADS e
cobertura pela luneta real do jogo. As duas recargas pressionam a trava do pente,
removem o carregador e reassentam a reposição; somente a vazia pressiona o bolt
catch. A fonte pública não contém um charging handle separável. Nenhum vértice
da arma doadora foi publicado como se pertencesse à M400 para ocultar essa
lacuna. Estado: `ready:false`, família sniper e ativação global desligadas.

## Proveniência e produtos externos

| Item | Bytes | SHA-256 |
|---|---:|---|
| fundação pública AK com mãos/ações | 3.414.520 | `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29` |
| corpo público M400 | 331.016 | `f5a0bb493381eba107dd23fb5e702c2719bdba2f4f8b01bec62c832467b91109` |
| Blender final externo | 5.076.440 | `803f116a13909f227d5a746cd93c5c1cb3f29a0d65a68d03b8e29bca4c2dc1d7` |
| GLB bruto externo | 2.712.732 | `949e14d2a147d615afe11ee8393e1d40aaa629e8cfc8bbaf94c255df59094bb2` |
| manifesto de build externo | 867 | `81747b5b2b617652a70670ba4d76a2ea562e553e673052be76d5dd4a0288e035` |
| relatório do otimizador externo | 625 | `9031a543d211d583224ee5f8d1ac523b12b6a1aff9c9e9b215f3362b6fb4a45a` |
| GLB otimizado externo | 2.674.164 | `c86d5f2ce043db7eba50840f6f68bcabdb5065c45dcc1734d677ee02187b1e5b` |

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/source/m400/
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/optimized/sniper/m400-baked-runtime.glb
```

Os binários continuam fora do Git e do build público.

## Corte causal e mecanismo

O corte do pente seleciona 275 das 5.018 faces da fonte. A trava do pente usa
outras 36 faces, o bolt catch usa 20 e as 4.687 restantes ficam no corpo. As
somas são disjuntas e fecham exatamente a fonte. O muzzle foi medido em
`(0,499; 0,0146; 0,0537)` e o sight no eixo da luneta em
`(-0,241; 0,0146; 0,1435)` antes do fit para o rig.

A trava do pente percorre 0,006 m nas duas recargas; o bolt catch percorre
0,004 m somente na recarga vazia. O pente percorre 1,8507 m e a reposição
1,0496 m, com menor distância medida de 0,2287 m entre a mão esquerda e o
pente. As duas recargas retornam exatamente ao idle e têm assinaturas distintas.
A ausência do charging handle separável permanece explícita para decisão humana.

## Gates e evidência real

- `eval:vm-rifle-m400` passou com seis clipes, mãos, câmera, sockets,
  comprimento final de 1,02 m e dez mutantes causais mordidos;
- `eval:vm-rifle-m400-lifecycle` passou dez checks, 30 ciclos e 540 amostras,
  incluindo troca corrente/stale, fallback sem lacuna, equip/recarga/inspect/ADS
  escondidos, morte e terceira pessoa;
- o gate vermelho anterior falhava somente pela ausência do candidato baked;
- 22 capturas reais cobrem onze estados em 1440×960 e 1440×810. Não houve erro
  fatal de viewmodel, WebGL ou shader. Os 70 registros não fatais são 56 respostas
  404, sete `ERR_FAILED` e sete bloqueios CORS dos endpoints de telemetria no dev local.

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-m400-20260913/
capture.json       749ddf2e0b4fa6b6814f98da4edc738643e4f1aa02e5411942017354a90b175c
contact-sheet-3x2  fe0a40cd462fd4a5db7ee17cc472b2ffa8962fb09b9402c5b086a4042bdb154b
contact-sheet-16x9 a2e06ee895078a0d3cb1f4e72451bff5999e43152e5c21486f966e230cb8879f
```

As folhas mostram identidade, scope, mãos, HUD, retirada e reassentamento do
pente, pressão dos dois comandos e enquadramento ADS. A captura separa a pose
física ADS da cobertura real da luneta. Durante a validação, o harness expôs
que o frame anterior podia sobreviver na captura quando o SwiftShader estava
lento; agora ele exige três quadros completos depois de `scopeCovered`, e os
dois aspectos provam `vmRootVisible:false` dentro da luneta. A candidata
permanece `ready:false` até o dono reproduzir as animações completas no Game.

## Snapshot e reprodução

O preview corrente usa o snapshot imutável
`preview-snapshots/7621b8297-c86d5f2c`, derivado do marco G3 sem alterar os
produtos já aceitos. O manifesto do snapshot tem SHA-256
`2ceb0ad626d615536c4ca1b8d79f61154e9b3f086f39358051c5943887e4f669`.

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/opt/homebrew/Cellar/node/23.6.0/bin:$PATH"
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/7621b8297-c86d5f2c \
  npm run preview:vm-precision
```

A URL impressa inclui `vmweapon=m400`. O preview é privado e precisa ser
desmontado com `npm run cleanup:vm-precision` antes de qualquer build público.
