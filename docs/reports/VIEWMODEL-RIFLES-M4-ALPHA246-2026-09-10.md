# M4 final opt-in sobre alpha.246

## Resultado

A M4 foi reautorada a partir do checkpoint de aparência aprovado, sem promover
nenhum binário privado ao Git. O produto externo contém arma e carregador próprios,
mãos/luvas/mangas, câmera e seis clipes: `idle`, `equip_rifle`, `shoot`,
`reload_tactical`, `reload_empty` e `inspect`.

O primeiro produto reproduziu um defeito causal: no `equip`, o root da arma movia,
mas o root das mãos permanecia parado. A saída foi rejeitada e a receita passou a
animar `VM_PACKAGE_M4`, pai comum de arma e mãos. O produto atual mede deriva zero
entre os dois roots em equip, tiro e inspeção. O carregador excursionou 0,4524 m e
retornou ao poço nas duas recargas; a vazia preserva o contato de bolt release da
fonte e a tática retorna após o reassentamento do pente.

Estado de rollout: `ready:false`, família `ar` fechada e ativação global desligada.
Somente `?vmauthored=1&vmweapon=m4` abre essa candidata.

## Proveniência e produtos externos

| Item | Bytes | SHA-256 |
|---|---:|---|
| fonte Blender preservada | 1.515.873 | `c23930c3837b4bda862a71209eaeb1b212b0dd5a6bd34619f72a1398fce3930b` |
| GLB final normalizado | 1.506.656 | `2d8e00559ad2e640183b45062f13e5a3b77256d5638831957e8c96af9b510233` |
| folha 3:2 | — | `6a8a4010a6490134fec1edc97947a7d4d39cb8b8eef78334815e82dc765692f6` |
| folha 16:9 | — | `7dd49011fa2e139bff256fab3ea073ef954ec263aba35ed6bece48501796335d` |
| manifesto das 20 capturas | — | `4ea6648309451912208cff810ba27dec197b3ff44ba3a7e6023ed1a98a1e8f0b` |

Produto e evidência ficam fora do repositório público:

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/optimized/ar/m4-baked-runtime.glb
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-m4-20260910/
```

## Gates

- gate de asset: 6/6 clipes, carregador separado, sockets, câmera e três camadas
  de material das mãos;
- sete mutantes morderam: clipe, carregador, movimento do pente, diferença entre
  recargas, sight, câmera e inspeção;
- lifecycle: 30 ciclos alternando 1440×960 e 1440×810, 540 amostras, sem lacuna
  entre authored e fallback; seis mutantes de lifecycle morderam;
- fundação: 20/20, mantendo 26 armas, AK/faca aprovadas e fronteira privada;
- jogo real: 20 capturas (idle, equip, tiro, ambas as recargas, inspect e ADS),
  sem `pageerror`, erro WebGL ou erro do loader paid-viewmodel.

As 84 mensagens não fatais da captura são dívida conhecida do ambiente local:
404 de conteúdo e CORS do backend de produção em origem `127.0.0.1`. Elas não são
usadas para esconder erro de viewmodel e permanecem registradas em `capture.json`.

## Revisão humana pendente

O M4 está tecnicamente fechado, mas ainda não foi aprovado visualmente pelo dono
nas duas proporções. Deve-se revisar especialmente a leitura da mão esquerda no
meio das duas recargas e o recorte inferior das mãos em 16:9. Não alterar o frame
para expor mais identidade se isso desalinha a direção do cano.

## Teste único

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/Users/ruben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root \
  npm run preview:vm-precision
```

```text
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=ak&vmweapon=m4,mosin,svd,sks,rem700,g3sg1&vmqa=precision
```

Checkpoints: `0604f8879` (reautoria), `f1f0b5211` (gates/captura) e
`7ed7df1ea` (runtime opt-in). Próxima arma: MD97, que exige construir um carregador
frontal próprio a partir da especificação do jogo; não reutilizar o pente da M4.
