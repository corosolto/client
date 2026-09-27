# AWP final opt-in sobre alpha.252

## Resultado

A AWP foi reautorada com sua malha pública própria sobre o rig, as mãos, a
câmera e a gramática de ações da fundação AK aprovada. A fonte chega como uma
única malha. A receita solda duplicatas exatas em 2.416 vértices topológicos e
separa por componentes conexos o carregador completo e a alavanca real do
ferrolho. A trava do pente está fundida ao receiver na fonte e permanece uma
limitação explícita; nenhum fragmento da arma doadora foi publicado como se
pertencesse à AWP.

O produto contém `idle`, `equip_rifle`, `shoot`, `reload_tactical`,
`reload_empty` e `inspect`, além de câmera, muzzle, sight, enquadramento ADS e
cobertura pela luneta real do jogo. O tiro e a recarga vazia ciclam o ferrolho;
a recarga tática o mantém fechado. As duas recargas removem o carregador e
reassentam a reposição. Estado: `ready:false`, família sniper e ativação global
desligadas.

## Proveniência e produtos externos

| Item | Bytes | SHA-256 |
|---|---:|---|
| fundação pública AK com mãos/ações | 3.414.520 | `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29` |
| corpo público AWP | 274.528 | `6a303a1b97dfd23b9e1e9c979700119dffbb0ee3c48551751887f7f86a372a2a` |
| Blender final externo | 5.044.115 | `345aa452d534a1d4466dbbf648f7d3fae31d4829d5e53d90e13baadc2a98b0b0` |
| GLB bruto externo | 2.621.728 | `91d03d47daaf03c5ee8ddda3a42669ec3aebff84d113f32e132cc1e904899455` |
| manifesto de build externo | 797 | `e495bb0d1b4da5408da05228f3f37e909d42221b353a9a29cb4aa56e36a47cc2` |
| relatório do otimizador externo | 622 | `50df60ea87018fe9c5561cb4ce0cf7a51a925cad0976e8130e56258ecefb246c` |
| GLB otimizado externo | 2.583.404 | `fb1d0961d96dd28a242f8fa5aa477d32be4ba4407457889a2e9d476280af916b` |

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/source/awp/
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/optimized/sniper/awp-baked-runtime.glb
```

Os binários continuam fora do Git e do build público.

## Mecanismo e contatos

O carregador usa 101 dos 2.416 vértices soldados e 176 das 4.733 faces da
fonte. A alavanca do ferrolho usa 32 vértices e 60 faces. O restante fica no
corpo. O muzzle foi medido em `(-0,499; 0,0137; 0,0313)` e o centro ocular da
luneta em `(0,2666; 0,0137; 0,0967)` antes do fit para 1,15 m.

O pente percorre 1,8507 m e a reposição 1,0496 m, com menor distância medida de
0,2287 m entre a mão esquerda e o pente. O ferrolho percorre 0,1070 m no tiro e
0,1153 m na recarga vazia, ficando imóvel na tática. A mão forte deriva no
máximo 0,0037 m durante a recarga; os ciclos terminam no idle e as recargas têm
assinaturas mecânicas distintas.

## Gates e evidência real

- `eval:vm-rifle-awp` passou com seis clipes, mãos, câmera, sockets, identidade
  geométrica, comprimento final e dez mutantes causais mordidos;
- `eval:vm-rifle-awp-lifecycle` passou dez checks, 30 ciclos e 540 amostras,
  incluindo troca corrente/stale, fallback sem lacuna, equip/recarga/inspect/ADS
  escondidos, morte e terceira pessoa;
- o gate vermelho anterior falhava somente pela ausência do candidato baked;
- 22 capturas reais cobrem onze estados em 1440×960 e 1440×810. Não houve erro
  fatal de viewmodel, WebGL ou shader. Os 84 registros não fatais são 56
  respostas 404, 14 `ERR_FAILED` e 14 bloqueios CORS dos endpoints de telemetria
  no dev local.

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-awp-20260914/
capture.json       cb2d87d185d2bc20efcf4dc5360274d04d8005382a12e6d65a79a6b7cc39f40e
contact-sheet-3x2  e488d364a750fa0129a924886445ac1947925e9e5a7a945e38402156d6730e8c
contact-sheet-16x9 3f5029f981cace32aea58eed25aa0043b6e11d0f12d6b3d7ea802a03b5d8c002
```

As folhas mostram identidade, mãos, HUD, draw, tiro, recargas, inspeção, ADS e
scope. O primeiro lote revelou que o compositor SwiftShader podia preservar o
frame anterior no ADS 16:9 apesar do transform correto. O capturador passou a
aguardar três quadros completos também antes da pose ADS; a recaptura confirma
a ocular no centro nos dois aspectos e `vmRootVisible:false` dentro da luneta.
A candidata permanece `ready:false` até o dono reproduzir as animações completas
no Game.

## Snapshot e reprodução

O preview corrente usa o snapshot imutável
`preview-snapshots/66e3a5842-fb1d0961`, derivado do marco M400 sem alterar os
produtos já aceitos. O manifesto do snapshot tem SHA-256
`3c5917a5d6840e16e468ccdce69ac3ad5262a8a7caa5126a528e1019b643941b`.

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/Users/ruben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/66e3a5842-fb1d0961 \
  npm run preview:vm-precision
```

A URL impressa inclui `vmweapon=awp`. O preview é privado e precisa ser
desmontado com `npm run cleanup:vm-precision` antes de qualquer build público.
