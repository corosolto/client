# G3SG1 DMR — produto KINEMATION, contatos e braços em 22/09/2026

## Resultado técnico

A G3SG1 foi reautorada sobre o rig e as ações já aprovadas da G3 KINEMATION,
sem alterar câmera, FOV, `FAMILY_FRAME` ou código de runtime. O defeito era do
produto anterior: as mangas ocupavam 2,901× a silhueta da AK em 3:2 e 2,755×
em 16:9, e o mindinho direito ficava 30,37 mm afastado da malha Mint.

O gate causal foi gravado antes da correção no checkpoint `e2b67f9ae`. A receita
nova trava por SHA-256 a G3 KINEMATION e a malha pública da G3SG1, separa 4.596
faces do corpo, 154 do pente completo e 24 da alavanca real. A diferença entre
o frame de autoria aprovado da G3 e o frame público da família é transportada
para o nó do produto `VM_PRODUCT_G3SG1`; a câmera embutida, o FOV e o runtime
permanecem intactos.

Fontes e produto privado, todos fora do Git:

- G3 KINEMATION: `35f3d2daf6c83096b33b8e1178220ebf6b7b268d1a8017acd376d65a078e0c21`;
- malha pública G3SG1: `3634db457fe27b5904955efb64c74dadf2336263fa64e153014d76df31770ddb`;
- `.blend` reautorado: `6fdfdd487b303266f62f0ebcea1717327634d7135c8337200478ad475a3c8a92`
  (1.896.875 bytes);
- produto final: `f6959a3ae2efbc4191ac48bc77f9e10b4ddf220d8acf979f5598cfff5047002c`
  (1.523.360 bytes).

## Mãos, ações e mecanismo

O ajuste residual de `hand_l` é aplicado somente a `idle`, `reload_tactical` e
`reload_empty`, com fonte e conjunto de clipes travados pela receita. O gate
mede os contatos no primeiro quadro de `idle` contra os triângulos reais da
arma:

| mão | mínimo | anelar | médio | indicador | polegar |
|---|---:|---:|---:|---:|---:|
| direita | 0,01 mm | 0,03 mm | 0,00 mm | 0,01 mm | 0,01 mm |
| esquerda | 6,22 mm | 0,04 mm | 0,02 mm | 0,03 mm | 0,06 mm |

Os limites são 8 mm para os quatro dedos e 16 mm para os polegares. Os mutantes
`solta_mao_esquerda` e `solta_mao_direita` deslocam as mãos de forma
independente e reprovam.

O pente percorre 0,4663 m em `reload_tactical`; a alavanca percorre 0,1188 m em
`reload_empty`. `shoot` percorre 0,0267 m e `inspect` 0,0805 m, ambos retornando
a zero. Mutantes independentes removem clipes, congelam o mecanismo, soltam as
mãos, deslocam/trocam sockets, renomeiam a malha Mint, retiram câmera/material
e desalinhavam o corpo; os 12 precisam reprovar.

A boca mede `Z=-0,9628`, à frente da alça em `Z=-0,1137`, com eixo de mira a
7,7°. A referência `idle` fecha em `[0,0390, 1,7456, 0,4394]`, resíduo 0,0001.

## Enquadramento, lifecycle, HUD e ADS

A régua de enquadramento passa nas duas proporções e reduz a dominância dos
braços em aproximadamente 78%:

- 3:2: escala 1,061×, 96,5% da arma dentro do quadro, braço 0,646×;
- 16:9: escala 1,022×, 96,5% dentro, braço 0,608×;
- orçamento máximo do braço: 1,4× a silhueta da AK aprovada.

`eval:vm-dmr-lifecycle` passa 11/11 controles, 30 ciclos por arma e 1.020
amostras. `eval:vm-dmr-tools` passa 13/13, incluindo travas explícitas das duas
receitas novas. A família G3, a candidata e a ativação global continuam
desligadas; `ready:false` foi preservado.

A captura no jogo real ligada ao checkpoint `f222d4991` produziu 16 frames da
G3SG1 em 1440×960 e 1440×810: `idle`, dois instantes de tiro, dois instantes de
recarga tática, dois de inspeção e ADS em cada proporção. O gate confirmou HUD
`g3sg1`, `/img/weapons/g3sg1.webp`, munição `20 / 60`, produto Mint ativo,
mount visível e clipes carregados. ADS agora é acionado pela API real do jogo e
a captura falha se `player.scoped` não estiver ativo. Houve 168 falhas opcionais
de recursos localhost/CORS no conjunto DMR e zero erro fatal.

Evidência privada, fora do Git:

- diretório: `evidence/dmr-g3sg1-kinemation-f222d4991`;
- `capture.json`: `33e01d089cce9adee751b564c112dc16d1bf52d357508fd444d03c5206bb1f85`;
- folha de contato: `bc9de66791d29c816ca7640b8ee0fc994fbe2390b22446967d7b7ef7cd39c7e1`;
- inventário SHA-256: `8d6db9298e75b1be6d469b952c9eaa088894bccb36cdc4f67e43c3cb95ae004b`.

A folha de contato não mostra desaparecimento, inversão ou quebra entre
proporções. Aprovação visual humana de escala, inclinação, aderência das duas
mãos, recarga, inspeção e ADS ainda é obrigatória antes de qualquer promoção.

```text
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmweapon=g3sg1&vmqa=precision
```

## Reprodução

```sh
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/opt/homebrew/bin:$PATH"
export CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root
npm run eval:vm-dmr-assets
npm run eval:vm-dmr-lifecycle
npm run eval:vm-dmr-tools
node tools/viewmodels/prep/vm-frame-calibra.mjs --armas=g3sg1 --tabela
npm run capture:vm-dmr -- 4401
```
