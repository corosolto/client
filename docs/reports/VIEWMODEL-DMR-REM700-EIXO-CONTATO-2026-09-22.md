# Rem700 DMR — eixo, contato e enquadramento em 22/09/2026

## Resultado técnico

A Rem700 foi reautorada no produto DMR sem alterar a câmera, o FOV ou o
`FAMILY_FRAME` do runtime. O defeito era causal no produto: a receita escolhia
a extremidade mais fina do doador como boca do cano; na Kar98K doadora, o
recorte da coronha era mais fino que a amostra da boca. O pacote inteiro foi
montado ao contrário, embora os nomes dos sockets estivessem internamente
consistentes.

O gate novo foi escrito e falhou antes da correção:

```text
muzzleZ 0.6441 · sightZ 0.1715 · bocaAFrente false
```

A receita agora resolve a frente no espaço da câmera autorada (`-Z`), registra
a Rem700 pelo ponto real de empunhadura, preserva a escala física e mede os
sockets no produto final. O resultado é:

```text
muzzleZ -0.6915 · sightZ 0.3640 · bocaAFrente true · ângulo 11,7°
```

O mutante independente `troca_sockets` reproduz a inversão e reprova. O mutante
`desloca_socket` move a boca 2 m e também reprova. Não existe override de câmera
neste marco.

## Mãos, ações e mecanismos

A serialização do delta de rotação foi corrigida de `(x,y,z,w)` para a ordem
real do Blender `(w,x,y,z)`. A pose é derivada sempre da fonte limpa, sem
acumular curls a cada rebuild. A mão de apoio recebe um ajuste local próprio e
as correções são transportadas para todos os clipes da Rem700: `idle`, `shoot`,
`reload_start`, `reload_loop`, `reload_end` e `reload_empty`.

O gate mede contato contra os triângulos reais da malha Mint no primeiro quadro
de `idle`:

| mão | mínimo | anelar | médio | indicador | polegar |
|---|---:|---:|---:|---:|---:|
| direita | 0,07 mm | 5,96 mm | 0,12 mm | 0,07 mm | 2,08 mm |
| esquerda | 2,09 mm | 0,07 mm | 1,66 mm | 3,72 mm | 1,04 mm |

Os limites são 8 mm para os quatro dedos e 16 mm para os polegares. Os mutantes
`solta_mao_esquerda` e `solta_mao_direita` deslocam cada mão de modo independente
e precisam reprovar. O ferrolho percorre 0,3337 m no tiro; `inspect` percorre
0,0792 m e retorna a zero. Os mutantes de clipe, mecanismo congelado e pose
desalinhada também reprovam.

A régua de enquadramento passa nas duas proporções:

- 3:2: escala 0,939×, 86,4% da arma dentro do quadro, braço 0,925×;
- 16:9: escala 0,889×, 87,0% dentro, braço 0,867×;
- orçamento máximo do braço: 1,4× a silhueta da AK aprovada.

`eval:vm-dmr-lifecycle` passa 11/11 controles, 30 ciclos por arma e 1.020
amostras. A família e a ativação global continuam desligadas. A candidata
permanece `ready:false`.

## HUD, fallback e captura real

A captura real agora falha se `#ammo-weapon-art`, carregador ou reserva
não correspondem à arma equipada. Os 20 frames da Rem700 provaram
`/img/weapons/rem700.webp`, `5 / 25`, mount visível, produto Mint ativo e clipes
carregados em `idle`, tiro, recarga, inspect e ADS, em 1440×960 e 1440×810.
O lifecycle cobre fallback e corridas de troca; a captura cobre o HUD e o
caminho real do jogo.

Checkpoint da captura: `5de60232d6fb03877341d97cf0b5129ed5890d66`.
Evidência privada, fora do Git:

- diretório: `evidence/dmr-rem700-axis-5de60232d`;
- produto: `439a4859d840b241680cd6a566bf62b989b7a63c01bbf89d45c7d3b24f1e79fa`
  (4.695.384 bytes);
- fonte montada: `5cfa20b4e2d85fcce1b012f5e24b616d90c795c12add3c3c0e0d646d8286bea3`
  (4.675.672 bytes);
- `capture.json`: `ac4388c0589cb5e1025bdc372a02729f7fd0da8e793149934333c06a2efb1c51`;
- folha de contato: `19bfd705ad46638de16ec5eae47bbf95f04757191f2ead475bd70f83baee2ceb`;
- 36 capturas DMR no recibo, 20 da Rem700, 168 falhas de recursos opcionais
  localhost/CORS e zero erro fatal.

As imagens não mostram inversão, desaparecimento ou quebra entre proporções.
Aprovação visual humana de escala, inclinação, contato, ADS e movimento ainda é
obrigatória antes de qualquer promoção.

```text
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmweapon=rem700&vmqa=precision
```

## Reprodução

```sh
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/opt/homebrew/bin:$PATH"
export CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root
npm run eval:vm-dmr-assets
npm run eval:vm-dmr-lifecycle
npm run eval:vm-dmr-tools
npm run eval:vm-frame -- --armas=rem700
npm run capture:vm-dmr -- 4401
```

Próximo cluster sequencial: G3SG1. Ela ainda reprova a régua por dominância dos
braços (2,901× em 3:2 e 2,755× em 16:9) e ainda precisa do mesmo gate causal de
contato real antes de reautoria do produto/mangas.
