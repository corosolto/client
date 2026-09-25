# Viewmodel K — lotes L3–L5: as 13 armas que faltavam revisar

**Data:** 23/09/2026 · **Branch:** `vm/fix-l3l5` · **Base:** `vm/launch-k` (PR #629) + fusão de
`vm/fix-mesh` (#632), `vm/fix-grips` (#633), `vm/fix-mags` (#634) e `vm/k-rebuild` (#631).
Armas: m4, scar, svd, deagle, awp, g3, g3sg1, rem700, m400, carbine, tavor, famas, mosin.

Retrato datado. O estado vivo é o que as réguas citadas imprimem e o que o dono vê no jogo.

## Fusão

Conflitos só em blocos gerados (`ARCH.generated.md`, `README.md`, `STATUS.md`, docs do Docusaurus,
`public/js/data/vmbytes.js`): regenerados por `tools/gen-docs.mjs` e `gen-vmbytes.mjs` depois
de cada fusão. `package.json`: união de `eval:vm-pegada-k` (#633) e `eval:vm-manga-oca` (#632).
`tools/eval/vm-cache-assets.mjs`: união dos dois blocos novos (compartilhados de #632 e faca de
#631) e o mutante `faca-reassada` entrou na lista `MUTANTS` (antes só existia no corpo).

Catálogo privado da revisão: `~/csbrasil-private-assets/generated/viewmodels-fix-l3l5/overlay`
(hardlinks do `preview-root` + produtos de k-rebuild/fix-mesh/fix-grips/fix-mags; em conflito,
vale o produto mais novo do dono da arma: lmg ← fix-mesh; shotgun/m92/revolver/md97 ← fix-grips;
sks/uzi/mp5/p90 ← fix-mags). Origem de cada arquivo em `viewmodels-fix-l3l5/overlay-origem.json`.

## Método

1. Captura no jogo real (`?vmauthored=1&vmqa=precision`), 3:2 e 16:9: saque 30/65, idle, 1º tiro,
   rajada, recarga tática 30/55/80, recarga vazia 15/35/55/75/95, inspeção 35/70, ADS assentado
   (capturador de `artifacts/review-L1` com a espera de ADS de #633; arma de luneta espera só o
   `scoped`, porque a luneta tira o viewmodel da tela).
2. Crítico cego por arma (contexto limpo, `definicao.md` + `instrucoes.md` da revisão L1, AK golden
   e PT-38 aprovada como referência). Depois de cada conserto, novo crítico com as duas pastas
   (antes/depois), pedindo o que piorou.
3. Consertos determinísticos (receitas pós-processo, sem Blender), no máximo duas iterações.

## Veredito do crítico cego

| Arma | Antes | Depois | O que mudou | O que resta |
|---|---|---|---|---|
| m400 | REPROVADA (invertida, braços do teto no tiro) | **RESSALVA** | malha girada; tiro/inspeção/saque partem da pose do idle; mão de apoio no guarda-mão | yaw forte; mão do gatilho pouco legível |
| deagle | REPROVADA (inspeção sem arma nem mão) | **RESSALVA** | inspeção com a arma na mão | arma escondida pelas mãos no idle |
| mosin | REPROVADA (invertida) | REPROVADA | não está mais invertida; mão de apoio no guarda-mão | mão direita some no tiro/saque (regressão); recarga sem munição |
| svd | REPROVADA (invertida) | REPROVADA | não está mais invertida; mão de apoio no guarda-mão | sem pente ("tira no ar"); arma centrada, que agora mostra a coronha grossa no centro-baixo |
| rem700 | REPROVADA (tombada 90°, gigante, clipe flutuando) | REPROVADA | orientação, rolagem e escala certas; nada flutua | **regressão:** braço direito cobre 40–60% da tela na recarga/saque |
| g3 | REPROVADA (pro alto, ADS 70 px acima) | REPROVADA | idle mais baixo, perto da AK | ADS igual; antebraço de apoio mais deitado |
| g3sg1 | REPROVADA (recarga tira a peça errada) | REPROVADA | tentativa de frame **revertida** | — |
| awp | REPROVADA (gigante, vista pela coronha) | REPROVADA | tentativa de frame **revertida** | — |
| m4 | REPROVADA (ADS: mangas sem luva, tubo no centro) | — | sem conserto nesta frente | fila |
| scar | REPROVADA (ADS sem mira, pente fantasma) | — | sem conserto | fila |
| carbine | REPROVADA (mãos rasgadas na recarga) | REPROVADA | frame novo pela `vm-cobertura` (braço 1,97× → 1,26×); nada piorou, recarga menos coberta | mãos rasgadas na recarga, vão na pegada |
| tavor | REPROVADA (braço gigante na recarga) | — | sem conserto | fila |
| famas | REPROVADA (braço inflado na recarga vazia) | — | sem conserto | fila |

Textos completos: `artifacts/review-L3L5/critico/{antes,depois,depois2,depois3,rejeitado-*}/<arma>/veredito.txt`
(depois3 = rodada depois das réguas da #636: svd, m400, carbine)
(não versionados).

## Consertos

- **Arma invertida na malha (mosin, svd, m400)** — `tools/viewmodels/prep/desvira-malha.mjs`. Mesma
  classe da SKS (#634): o ICP de `precisao-final-build.py` convergiu girado 180°. Diagnóstico pelo
  perfil de altura ao longo do eixo da malha (soleira/receptor altos atrás, cano fino na boca).
  mosin/svd giram `GEO_MINT_*` 180° no Y local, e a peça recortada gira no mesmo giro de mundo. Na
  m400 (pacote próprio, sem `GEO_MINT`) os marcadores do autor (`grip_r`, `support_l`, `muzzle`)
  estavam do lado certo e a malha e o pente espelhados: giro nos vértices e canais do pente conjugados.
- **Rolagem de 90° da rem700** — mesma receita: a altura da malha estava no X do mundo e as irmãs
  do pacote de ferrolho a têm no Y. Giro rígido de −90° em torno da linha das palmas (o contato dos
  dedos do `dmr-verify` continua verde) e mão esquerda no centro do guarda-mão pelo IK do
  `grip-support.mjs` (#633), com o alvo medido pela seção da malha.
- **Peças flutuando (mosin, rem700)** — clipe de cartuchos e cartucho do pacote parados longe das
  mãos (no idle, perto da cruz): quadro a quadro, pelo centro da malha, a munição só aparece em
  clipe de recarga a ≤ 0,2 m de uma mão; fora disso escala zero, no centro da arma (`esconde`).
  Revisão antes do push: a 1ª versão media a origem do nó e escondia a munição também na recarga.
- **Sockets depois do giro (mosin, svd, m400)** — o `SOCKET_MINT_SIGHT` fora posto sobre a malha
  virada e gira junto (mosin/svd); o `MUZZLE` vai ao centro da seção da ponta do cano (ficava
  3–11 cm fora dela: clarão e traçador saem de lá).
- **Clipes que só animam o nó-raiz (deagle, m400)** — `tools/viewmodels/prep/inspect-com-pose.mjs`.
  Na deagle, a inspeção anima só `RIG_FP_ARMS` e deixa os 67 nós que o idle anima na pose de ligação: preenche com o
  idle e amplia o giro 5× com pivô na arma (verify pede excursão ≥ 2,5 cm). Na m400,
  `VM_PACKAGE_M400` repousa na pose de saque abaixada que o idle não anima: tiro/inspeção/saque
  passam a ser compostos sobre o repouso (a arma anda como nas armas `ar`).
- **Enquadramento (`vmframe.js`)**, resolvido pelo próprio `vm-frame-calibra --sugerir` para cada
  rotação (`artifacts/review-L3L5/tools/varre-frame.py`): mosin (yaw 15°: sem o clipe estacionado a
  0,6 m a arma media 0,56× a AK), rem700 (yaw 20°), g3 (pitch 15° → 8°). awp (yaw 35°) e g3sg1
  (pitch −12°) foram revertidas: o crítico viu as duas piorarem.
- **svd, pente** — a 1ª iteração deixou o pente seguir o osso `Mag` do doador, longe das mãos, e o
  crítico viu a peça parada no ar; na 2ª ele fica preso à arma (`fixaNaArma`) até existir pose de mão.

Cada produto registra a fonte e a receita no bloco `fixL3L5` do manifesto `*-candidates.json`; as
receitas conferem o SHA da fonte.

## Régua nova: `eval:vm-orientacao`

`tools/eval/vm-orientacao-check.mjs`: varre os 17 produtos com malha MINT e socket MUZZLE; razão
entre a altura das 2 fatias de trás e das 2 da boca ao longo do eixo da malha (orientado para o
socket), piso 1,0. Corretas 1,16 (akm)–5,37 (famas); invertidas do catálogo Codex 0,31 (svd),
0,47 (mosin), 0,53 (m400), 0,79 (sks). `--mutantes` (o script do npm) só aceita o catálogo
original se ele reprovar exatamente essas quatro por inversão. Não mede rolagem nem direção
absoluta (malha e socket invertidos juntos passariam).

## Réguas de imagem da #636 (antes → depois)

Depois do primeiro round, a branch trouxe `origin/vm/reguas` (#636: `eval:vm-mira`, `-cobertura`, `-maos`,
`-carregador`, `-pistola-ref`, medidas no quadro renderizado, limiares em `tools/eval/lib/vm-limiares.mjs`).
"Antes" = base composta do `PLACAR.md` da #636 (launch-k + #630–#634, sem L3–L5); "depois" = este branch
(`npm run eval:vm-reguas -- --placar`, 3:2, re-medindo isolado as células que caíram por carga).

| Arma | mira | cobertura | pistola-ref | maos | carregador |
|---|---|---|---|---|---|
| mosin | n/a → n/a | VERM 0.64× AK → **VERM** 1.13× AK | n/a → n/a | verde 0.01 → verde 0.03 | VERM 14 falha(s) → **VERM** 1 falha(s) |
| svd | n/a → n/a | VERM 0.36× AK → **VERM** 0.50× AK | n/a → n/a | verde 0.06 → verde 0.01 | VERM 1 falha(s) → **VERM** 2 falha(s) |
| m400 | n/a → n/a | VERM 0.77× AK → **VERM** 0.91× AK | n/a → n/a | verde 0.06 → verde 0.01 | verde ok → verde ok |
| rem700 | n/a → n/a | VERM 1.47× AK → **VERM** 1.07× AK | n/a → n/a | VERM 0.22 → verde 0.04 | VERM 5 falha(s) → **VERM** 1 falha(s) |
| deagle | verde 30 px → verde 30 px | n/a → n/a | VERM 0.63× pistola aprovada → **VERM** 0.63× pistola aprovada | n/a → n/a | VERM 1 falha(s) → **VERM** 2 falha(s) |
| g3 | VERM 90 px → **VERM** 89 px | VERM 1.04× AK → **VERM** 1.06× AK | n/a → n/a | VERM 0.40 → **VERM** 0.40 | verde ok → verde ok |
| g3sg1 | n/a → n/a | VERM 1.06× AK → **VERM** 1.06× AK | n/a → n/a | verde 0.03 → verde 0.03 | verde ok → verde ok |
| awp | n/a → n/a | VERM 1.43× AK → **VERM** 1.43× AK | n/a → n/a | verde 0.08 → verde 0.08 | verde ok → verde ok |
| m4 | VERM 43 px → **VERM** 43 px | verde 1.01× AK → verde 1.01× AK | n/a → n/a | verde 0.00 → verde 0.00 | verde ok → verde ok |
| scar | VERM 99 px → **VERM** 99 px | verde 1.20× AK → verde 1.20× AK | n/a → n/a | VERM 0.44 → **VERM** 0.44 | verde ok → verde ok |
| carbine | verde 16 px → verde 16 px | VERM 1.20× AK → verde 0.94× AK | n/a → n/a | VERM 0.38 → **VERM** 0.38 | n/a → n/a |
| tavor | VERM 41 px → **VERM** 41 px | verde 1.04× AK → verde 1.04× AK | n/a → n/a | VERM 0.30 → **VERM** 0.30 | VERM 1 falha(s) → **VERM** 1 falha(s) |
| famas | VERM 64 px → **VERM** 64 px | verde 0.91× AK → verde 0.91× AK | n/a → n/a | verde 0.19 → verde 0.19 | VERM 1 falha(s) → **VERM** 1 falha(s) |

Guiados por elas: mão de apoio de svd e m400 levada ao guarda-mão (IK; 0,25/0,32 palma → verde; as
viradas tinham tirado a mão da arma) e o frame da carbine (braço 1,97× → 1,26× a AK, vindo da extensão
de manga do #632). Os dois `carregador` que subiram: svd 1 → 2 porque o pente ficou preso à arma na 2ª
iteração (troca consciente de "objeto no ar" por "tira no ar"; o "fantasma 100%" já estava na dívida) e
deagle 1 → 2 com a mesma peça em mais um instante da recarga tática, em clipes que esta frente não tocou.
`eval:vm-placar` verde: placar re-medido e todo vermelho com dono em
`vm-reguas-divida.json` (quatro vermelhos novos vieram das frentes fundidas e ganharam o dono delas).

## Portões (`CSBRASIL_VM_ASSET_ROOT` no overlay desta frente)

Verdes antes e depois: `eval:vm-rig`, `eval:vm-launch`, `eval:vm-cache`, `eval:vm-pegada-k`,
`eval:vm-manga-oca`, `eval:vm-rifle-{m4,scar,famas,carbine,tavor,g3,m400,awp}`
e `-lifecycle`, `eval:vm-pistol-deagle` e `-lifecycle`, `eval:vm-dmr-assets`, `-lifecycle`, `-tools`,
`eval:vm-precision-lifecycle`, `eval:vm-autorado-vivo --todas`, `eval:vm-pente-na-mao`. Depois:
`eval:vm-orientacao` (nova) e `eval:vm-ads` nas 7 sem luneta (m4, scar, deagle, g3, carbine, tavor,
famas; antes o navegador foi derrubado por outra sessão no meio da régua). Logs em
`artifacts/review-L3L5/gates/{antes,depois}/`.

Vermelhos que não são desta frente: `eval:vm-frame` pela akm (0,573×/0,551×, já vermelha logo
depois da fusão das quatro branches; lane vm-fix-grips-r2) e pela mp5 (0,827×, rolagem de 18° da #636); `eval:vm-precision-assets` e
`-visual` (NumPy ausente no Python do ambiente) e `eval:vm-precision-tools` (os mesmos 2 checks
vermelhos antes e depois).

## Fila que fica (classe do conserto)

| Arma | Defeito | Classe |
|---|---|---|
| m4, scar, g3, carbine, tavor, famas | ADS: auto-ADS alinha o socket `sight`, a coronha/receptor tapa o centro-baixo (scar: cruz no receptor; g3: massa 60–80 px acima) | **config** (`ads.linhaDeMira` + `pull` por arma, como a md97) |
| rem700 | braço direito colado na câmera na recarga/saque depois da rolagem + yaw | **pose/IK** (ou o dono prefere reverter para a arma tombada) |
| mosin | mão direita some no tiro/saque; recarga sem munição; braços grandes | **pose/IK** + **Blender** (munição na recarga) |
| svd | sem pente (preso na arma), arma centrada em escorço, antebraços borrados | **pose/IK** (`mag-na-mao`) + **config** (frame) |
| m400 | yaw forte; conferir se a luneta está com a ocular do lado do olho | **config** (frame) |
| deagle | arma escondida pelas mãos no idle; mão de apoio sai na recarga | **config** (frame) + **pose** |
| g3sg1 | a recarga tira a peça escura do punho e deixa a placa longa (o pente) | **Blender/produto** (peça do pente) |
| g3sg1, awp | pro alto / gigante: o frame sozinho piorou (revertido) | **pose/IK** + **config** |
| awp | mão de apoio no ferrolho em vez do guarda-mão; punho rosa sem luva no saque | **pose/IK** + **Blender** |
| scar | sai placa prateada, fica a peça preta | **Blender/produto** |
| carbine, tavor, famas | braço gigante/rasgado na recarga | **Blender** (re-animação da recarga) |
| PT-38 (lane k-rebuild) | o mesmo clipe de inspeção só com `RIG_FP_ARMS` | receita `inspect-com-pose.mjs` serve |
| akm (lane vm-fix-grips-r2) | `eval:vm-frame` 0,573× depois da fusão | config/produto |

## Revisão do dono

Página única com L1/L2 (revisão anterior) e L3–L5: `artifacts/review-L3L5/index.html`
(não versionada), servidor `node tools/eval/serve.mjs 4651` no worktree `vm-fix-l3l5`. Cada arma tem
capturas antes/depois nas duas proporções, vídeo do estado atual, veredito do crítico antes → depois,
a URL do jogo e os botões que geram `VEREDITO-DONO <arma> <VEREDITO> — nota`.

Nenhuma flag `ready` nem `VM_LAUNCH` foi mudada.
