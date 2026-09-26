# Carregador e peças de recarga — mp5, p90, uzi, sks (23/09/2026)

**Branch:** `vm/fix-mags` · **Base:** `vm/launch-k` (#629) · **Fila:** `artifacts/review-L1/FILA-CORRECAO.md`
(crítico cego r2: as quatro REPROVADAS). Retrato datado; o estado vivo é o que as réguas imprimem.

## Régua nova: `eval:vm-pente-na-mao`

`tools/eval/vm-pente-na-mao.mjs`, no jogo real, relógio do viewmodel segurado, peça pintada de
magenta sem luz, em instantes em que a mão deveria segurá-la. Cobra quatro coisas: a peça saiu
do encaixe (≥ 3 cm no referencial da arma), pixels visíveis ≥ 1 000, fração visível ÷ silhueta
inteira (desenhada sem teste de profundidade) ≥ 0,20 e centróide a ≤ 260 px do osso da mão.

Procedência dos pisos (1440×960, AK golden, `Reload` 1,80/1,95/2,10 s, pente de reposição):
5 012–15 594 px, fração 0,30–0,53, dist 192–255 px. Piso de px = 1/5 do mínimo da AK
(arma curta tem pente menor), fração = 2/3 do mínimo, dist = máximo.

| Arma | `--mutante=original` (catálogo Codex) | depois |
|---|---|---|
| mp5 | FALHA: 401–767 px, fração 0,15–0,26 (o toco) | PASSA: 1 818–1 962 px, fração 0,57–0,59, 130–132 px |
| p90 | FALHA: 45–1 106 px (sai da tela) | PASSA: 1 831–1 970 px, fração 0,63–0,64 |
| uzi | FALHA: o pente não sai do punho nos instantes (fora = 0 cm) | PASSA: 2 333–3 979 px, fração 0,58–0,98 |
| ak (referência) | — | PASSA |

`vm-recarga-probe` e `vm-pente-carga` ficavam verdes nas três: a peça andava e tinha malha.

## O que foi feito, por arma

Receitas em `tools/viewmodels/prep/`; produtos fora do Git em
`~/csbrasil-private-assets/generated/viewmodels-fix-mags/`; cada receita confere o SHA da fonte
e é determinística (reconstrução byte a byte conferida). FK compartilhada: `fk-gltf.mjs`.

- **mp5** (`mag-na-mao.mjs --arma=mp5`): o pente herdou o trajeto do pente da G3 com o pivô na
  origem da arma; na mão ele ficava deitado ao longo do antebraço, de ponta para a câmera (o
  "toco"). Agora, entre a saída do encaixe e a volta, o pente anda preso à mão esquerda numa pose
  desenhada na tela do jogo (sai do punho para cima, de lado para a câmera).
- **p90** (`mag-na-mao.mjs --arma=p90`): a "peça pente" era a crista traseira cortada da malha
  pública (trilho fino + um bloco), sem volume de carregador. A receita acrescenta um corpo de
  pente em prisma chanfrado sobre a calha (material próprio `CoroSolto_P90_Pente`, metálico como
  o corpo), que sai da calha em arco por cima da arma para a mão esquerda e volta pelo mesmo arco
  (a mão do pacote G3 nunca chega à calha de cima: 15–45 cm).
- **uzi** (`uzi-uma-mao.mjs`): pegada de uma mão. Doador: a PT-38 K aprovada (mesma malha de
  braços). Tudo é transportado no referencial do poço do carregador (Y pelo punho, X para a boca):
  mão direita no punho como na pistola (alinhada pelo topo do pente, que é o punho da UZI);
  braço esquerdo abaixado e fora da cena em idle/tiro/inspeção/ADS; recarga no tempo da pistola
  com 0,3 s de entrada/saída do braço livre, IK de dois ossos, a mão esquerda puxa o pente por
  baixo do punho e traz o novo na pose em que ele encaixa. Os clipes de recarga mudaram de
  3,00/4,34 s para 2,92/3,18 s (o runtime escala pelo tempo de jogo). Ganhou `equip_rifle` próprio
  (o idle de uma mão subindo de baixo do quadro): sem ele o saque usava o clipe geral de duas mãos.
- **sks** (`sks-desvira.mjs`): **arma invertida era da malha, não do config.** O ICP de
  `precisao-final-build.py` convergiu na solução girada 180° no eixo vertical: a boca da malha
  ficava na câmera e o socket MUZZLE na soleira (perfil de altura medido ao longo da malha:
  soleira/receptor longe, cano/alça de mira perto). Girando 180° no Y local de `GEO_MINT_SKS`, a
  boca cai a 2 cm do socket, o punho direito na empunhadura e o esquerdo no guarda-mão. O clipe
  procedural andava num osso `Clip` deslocado 0,2–1 m das mãos (trajeto incoerente com o braço):
  foi redesenhado — chega na mão direita (é ela que carrega no pacote de ferrolho), fica de pé no
  guia do receptor enquanto os cartuchos descem, sai na mão e some; fora da recarga fica
  escondido dentro do receptor.
- **sks, enquadramento** (`vmframe.js`, só a linha `sks`): o `VM_FRAME.sks` antigo (z −0,37) foi
  calibrado com o clipe escondido estacionado a ~0,7 m da arma, o que inflava a caixa medida —
  a arma real media **0,31×** a AK. Refeito com a mesma régua (`vm-frame-calibra`) atendendo as
  duas travas: `{ x: 0.24, y: -0.18, z: -0.25 }` → 0,938×/0,907× e braço 1,335×/1,275×. Com a
  arma mais perto, o ombro sai do quadro e as mangas deixam de aparecer como cones.

## Portões (com `CSBRASIL_VM_ASSET_ROOT` no overlay desta frente)

Verdes: `eval:vm-smg-mp5`, `-lifecycle`, `eval:vm-smg-uzi`, `-lifecycle`, `eval:vm-p90-final`,
`eval:vm-p90-lifecycle`, `eval:vm-precision-lifecycle`, `eval:vm-dmr-*`, `eval:vm-rig`,
`eval:vm-cache`, `eval:vm-launch`, `eval:vm-autorado-vivo --todas` (25/25), `eval:vm-pente-na-mao`.
`eval:vm-frame`: só a PT-38 vermelha (de outro agente).

Pré-existentes/ambiente: `eval:vm-precision-assets` (pede `artifacts/viewmodels/prep/precisao/final`
e NumPy do Blender), `eval:vm-precision-tools` (2 checks vermelhos idênticos sem estes assets).
`precisao-visual-contract.py` passa antes E depois — **não morde arma invertida** (fica como
lacuna de régua para vm-reguas).

## Pendências e avisos para outras frentes

- **Suspeita: a mosin tem o mesmo ICP invertido** (perfil de altura da malha parecido com o da
  SKS antes, e a captura mostra a boca grossa perto da câmera); não é desta frente, não foi
  corrigida nem medida a fundo. A svd não foi medida.
- `vmframe.js` é gerado; a linha da sks foi escrita com o valor medido pela própria régua (o
  `--escrever` reescreveria as 24). Quem regenerar precisa partir do produto novo.
- SKS segue cinza, sem madeira (material) — fora do escopo.
- Mangas ocas (malha de braço compartilhada) seguem com vm-fix-mesh.
