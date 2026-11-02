# KNIFE-SKINS — marcas de faca Caveira/MAGA por representação (F2 R3)

2026-10-31 · dono do fix: writer knife R2 · régua: `tools/eval/knife-skin-markings-check.mjs`

## Contrato

Skins de faca (`pack-caveira-urbana-knife`, `pack-maga-47-knife`) pintam a peça e anexam
decalques **somente quando o asset corresponde ao perfil da representação declarada pelo
caller**. Nenhuma marca pode ficar parcialmente fora da lâmina.

| Contexto | Caller | Perfil | Asset exigido | Representação |
|---|---|---|---|---|
| `knife-fp` | `meleevm.js` `_accept` | `coro-knife-fp-v2` | `viewmodels/coro/melee/knife-hires.glb` (fingerprint `2b9905bf`) | 1 SkinnedMesh rígido no osso `CoroWeapon` |
| `knife-tp` | `weapons.js` `weaponModel('knife')` | `coro-knife-tp-v2` | `weapons/knife.glb` (fingerprint `eede1583`) | wrap rígido, 0 skins, `.30` m normalizado pelo CFG |

O fingerprint é FNV-1a sobre positions+indices crus (`toFixed(6)`), antes de qualquer
transform, nos meshes não-mão — associação perfil↔asset/versão determinística e síncrona.
Contexto trocado, asset trocado ou rig inesperado → status `representation-mismatch`
com **zero marcas** e pintura base preservada (fail-closed).

## Footprint integral

`public/js/knife-mark-support.js` (puro, sem dependência) adapta o clipping/subtração
convexa de `public/js/graffiti_coverage.js`: o retângulo da marca no plano (u,t) do frame
PCA da lâmina é testado contra a **união dos triângulos reais** da região da lâmina
(`fromGrip .50 → toTip .96`): os 4 cantos têm que cair dentro e a área descoberta tem que
ser ≤ `areaTolFrac 1e-6` × área do retângulo (`cornerTol 1e-7`). Não existe percentual
de cobertura permissivo — o R1 provou que `minCoverage` undefined deixava marcas com 112
pontos de 441 fora da peça chegar a `attached`.

`knifePlacement` procura centro (±1.0 da região em passos de 0.02) e escala (1→0.6) até o
footprint fechar, e rejeita sobreposição símbolo/slogan no plano (u,t). Sem suporte →
status `footprint-unsupported` com pintura base e sem anexos parciais. Aspectos do asset
mantidos: Caveira símbolo 620/420, MAGA símbolo quadrado 1:1, slogan 4:1.

## Régua (`tools/eval/knife-skin-markings-check.mjs`)

- CLI estrito: sem argumento roda a suíte; `--mutante=<nome>` roda um mutante conhecido.
  Argumento desconhecido, vazio ou duplicado sai **2** antes de carregar assets.
- Nominal-first: baseline semântica RED sai **1** e aborta antes de qualquer mutante; uso sai2, baselineRED sai1, ambos com prefixos distintos.
- Uma única função validadora (`evaluate`) retorna cláusulas com ID para nominal e mutantes.
- 4 casos frescos (Caveira/MAGA × 1P/3P), cada um com GLB recarregado — nunca `clone(true)`
  compartilhando skeleton (defeito do gate R1).
- 1P roda o **`_accept` real** de `meleevm.js` (câmera real, inversão, wrapper, mixer);
  3P roda o corpo real de `weaponModel` com CFG/template reais.
- `footprint` é verificado por implementação independente no gate: subtração própria de
  polígonos convexos, área da união sem dupla contagem, quatro cantos e tolerância do perfil.
  `footprintFullyCovered` compartilhado é injetado somente no produto sob teste; o gate não o
  chama para decidir. Self-tests cobrem buraco com cantos dentro, sobreposição, borda e inteiro.
- Cláusulas por caso: `attached`, `roles-exact`, `count` (2/4), `aspect`, `parent`,
  `footprint`, `rig-intact`, `knife-finite`, `hands-finite`, `rigid` (3P) e
  `follow-drift`/`bone-moves` (1P, 6 clips × 5 tempos).
- `rig-intact` captura posição/index, pesos/índices de skin, bind matrix, inversa de bind,
  inversas ósseas e tracks antes da aplicação; decalques são excluídos e bindMatrixInverse é atualizado pelo consumidor;
  todas as inversas ósseas são comparadas exatamente. `knife-finite`/`hands-finite` percorrem
  o objeto aplicado final em todas as 30 poses reais, sem recarregar o asset.
- Cross-context (`tp-as-fp`, `fp-as-tp`) tem que dar `representation-mismatch` sem marcas.
- Integridade de asset: 5262 vértices, 6 clips, meshes de mão presentes e intactos.
- Mutantes exigem **conjunto exato** de cláusulas RED (sem sobra/falta); exceção/crash é infra
  3 e **nunca** conta como detecção. Saídas: `0` GREEN · `1` mutante RED/divergente · `2`
  uso · `3` infra/import.

Os cinco mutantes originais permanecem exatos: `remove-branch-knife`, `footprint-fora`
(along 9.4) e `profile-units-wrong` (sizeFrac 62, capturado por `profile-invalid`) derrubam
24 cláusulas; `parent-root-1p` derruba `parent`+`footprint`+`follow-drift` nos dois casos 1P;
`remove-maga-slogan` derruba papéis/contagem/aspecto do MAGA nos dois contextos.

Contraprovas novas e conjuntos exatos: `footprint-guard-off` derruba somente os três
`footprint` observados (`caveira-fp`, `maga-fp`, `maga-tp`); `nan-bind` derruba
`rig-intact`+`knife-finite` nos dois casos 1P; `nan-hand` derruba
`rig-intact`+`hands-finite` nos dois casos 1P. Os dois mutantes físicos alteram o objeto
aplicado em memória; não são reloader, mock ou teste de crash.

## Limites

Validado em Node puro: geometria, cobertura contínua, rig, clips, footprint, finitude deformada
e follow no espaço do osso. **Não** valida legibilidade, render, mãos em jogo, motion em browser
— a rota equipada (Idle/Draw/Slash/HeavyStab + 3P) é revisada pelo Root com Ego após o Node GREEN.
Imagens dos GLBs e canvas de slogan são stubs no gate (nenhum pixel é lido).
Integração posterior: `eval:knife-skin-markings` já está registrado em `package.json`
e participa de `check:fast` e `check:deploy`. O alias passou na rodada integral R52;
esta execução técnica não amplia o aceite visual focal descrito abaixo.


## R4 Root — integridade e finitude do objeto aplicado
Inversas ósseas são comparadas exatamente no snapshot antes/depois; bindMatrixInverse é atualizado pelo consumidor e não recebe uma isenção de boneInverses. O getter real getVertexPosition carrega cada posição antes do skinning; não há vetor acumulando NaN entre malhas. nan-bind exige somente faca nãofinita+rig alterado, nunca mãos saudáveis vermelhas. inverse-shift desloca CoroWeapon e exige somente rig-intact por pack. Nomes herdados são uso2 antes de carregar assets; baseline/selftestREDé1.


## Leitura longitudinal do slogan

O slogan passa a ocupar o comprimento da lâmina com proporção preservada, em vez de ser reduzido à largura estreita. O UV gira90° e orienta o texto para leitura no idle do jogador. Símbolos mantêm sua orientação. O ajuste continua sujeito à mesma cobertura contínua e separação entre marcas. O oráculo independente verifica dimensão física inversa do aspecto e os quatro UVs de ambos os lados. Duas contraprovas novas removem a rotação e devolvem o texto transversal; ambas exigem somente as duas cláusulas aspect do MAGA.

O novo posicionamento fica integralmente coberto em MAGA_FP mesmo ao remover a guarda. Por isso o mutante guard-off exige agora Caveira_FP e MAGA_TP: a prova independente mediu área ausente0 e quatro cantos cobertos nas quatro marcas MAGA_FP. Não há supressão de uma violação observada. Full nominal+11mutantes passou; crítico longitudinalR3CLEAN16f02405.

Ego capturou CaveiraR5 e MAGAR6,7estágios cada,574/575updates finitos. O primeiro R5 do MAGA foi interrompido por navegação concorrente e rejeitado; R6 substitui essa captura. IdleR6 mostra MAGA legível na orientação correta. Isso não aprova ainda todo catálogo/equipar nem texto em todas as distâncias e dispositivos.
