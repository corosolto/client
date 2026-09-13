# G3 final opt-in sobre alpha.252

## Resultado

A G3 foi reautorada com sua malha pública própria sobre o rig, as mãos, a
câmera e a gramática de ações da fundação AK aprovada. A fonte chega como uma
única malha. A receita solda duplicatas exatas em 2.404 vértices topológicos e
faz cortes determinísticos por faces para separar o carregador reto completo e
os dois botões reais de retenção do pente.

O produto contém `idle`, `equip_rifle`, `shoot`, `reload_tactical`,
`reload_empty` e `inspect`, além de câmera, muzzle, sight e enquadramento ADS.
As duas recargas pressionam os comandos, removem o pente e reassentam a
reposição. A fonte pública não contém um charging handle separável; nenhum
vertex da arma doadora foi publicado como se pertencesse à G3 para ocultar
essa lacuna. Estado: `ready:false`, família G3 e ativação global desligadas.

## Proveniência e produtos externos

| Item | Bytes | SHA-256 |
|---|---:|---|
| fundação pública AK com mãos/ações | 3.414.520 | `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29` |
| corpo público G3 | 393.584 | `b19eb799350ce0a264b6cce90552bb9849ec34fb95260177357c3f53c7b7bb9e` |
| Blender final externo | 5.150.900 | `b43e1e899e190a20b7af2f34eb8c255aa32e35993979ef287231e73ff30549b1` |
| GLB bruto externo | 2.742.936 | `d26c73125604a91fe00adbba1a2f7c60cb1d2286a40d5b2ff95b2516d3429080` |
| manifesto de build externo | 805 | `4167d624f774a6af1046e3992a115100830838f4fb8369ecaeb997f31b019780` |
| relatório do otimizador externo | 611 | `171adbcaf25c6cb5c80c35aa1ebd10410d31c258f769c9c8fa8da9a723e1b576` |
| GLB otimizado externo | 2.704.620 | `1d416e5bdf9586088e22d175f877bf01ae48982e5b1adb539426165f5f97df82` |

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/source/g3/
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/optimized/g3/g3-baked-runtime.glb
```

Os binários continuam fora do Git e do build público.

## Corte causal e mecanismo

O corte do pente seleciona 32 das 4.830 faces da fonte. Os dois comandos usam
outras 92 faces e as 4.706 restantes ficam no corpo. As somas são disjuntas e
fecham exatamente a fonte. O muzzle foi medido em `(0,499; 0; 0,040)` e o sight
em `(-0,151; 0; 0,126)` antes do fit para o rig.

Os comandos percorrem 0,006 m em cada recarga. O pente percorre 1,8507 m e a
reposição 1,0496 m, com menor distância medida de 0,2287 m entre a mão esquerda
e o pente. As duas recargas retornam exatamente ao idle e têm assinaturas
distintas: somente a vazia preserva o ciclo do ferrolho da gramática doadora.
A ausência do charging handle separável permanece explícita para decisão
humana.

## Gates e evidência real

- `eval:vm-rifle-g3` passou com seis clipes, mãos, câmera, sockets, comprimento
  final de 1,02 m e nove mutantes causais mordidos;
- `eval:vm-rifle-g3-lifecycle` passou dez checks, 30 ciclos e 540 amostras,
  incluindo troca corrente/stale, fallback sem lacuna, equip/recarga/inspect/ADS
  escondidos, morte e terceira pessoa;
- o gate vermelho anterior falhava somente pela ausência do candidato baked;
- 20 capturas reais cobrem dez estados em 1440×960 e 1440×810. Não houve erro
  fatal de viewmodel, WebGL ou shader. Os 84 registros não fatais são 56 respostas
  404, 14 `ERR_FAILED` e 14 bloqueios CORS dos endpoints de telemetria no dev local.

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-g3-20260913/
capture.json       778eca2f970eb02463d843b3f071a5f0e95b9adead6810097f17562c13eeb7fc
contact-sheet-3x2  3f5b90ec61291e92f75b14b23ac23069812b69414086ea0fdf1b9f2441e4b31c
contact-sheet-16x9 69be60e8a254004c1d6bd42fb16bd8e87cdf33cf17c923f0991fa235543cd04a
```

A primeira captura 16:9 de ADS expôs um falso negativo do harness: a API
alternava o estado de mira e podia desligá-lo conforme o estado inicial da
partida. O capturador agora exige `_scope(true, true)` e `adsAmount > 0.9`.
As duas proporções recapturadas mostram alça centralizada, identidade da G3,
mãos, HUD e mecanismo no quadro. A candidata permanece `ready:false` até o
dono reproduzir as animações completas no Game.

## Integração da base e reprodução

A lane integrou `origin/main@5c2c5c93e32d0dcc96abbdc93e5ae9c767054fed`
(`alpha.252`) por merge recuperável em `38291dc6f`. Os únicos conflitos eram
artefatos gerados de documentação/arquitetura; eles foram regenerados. O gate
UIR15 também foi alinhado ao fallback robusto já presente em `main`, sem mudar
o runtime, no checkpoint `6b80664b6`. Depois disso, `check:deploy` passou 39/39.

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/opt/homebrew/Cellar/node/23.6.0/bin:$PATH"
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root \
  npm run preview:vm-precision
```

A URL impressa inclui `vmweapon=g3`. O preview é privado e precisa ser desmontado
com `npm run cleanup:vm-precision` antes de qualquer build público.
