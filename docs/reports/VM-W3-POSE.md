# Viewmodel K — onda 3, classe pose/IK (parcial: onda parada pelo coordenador)

**Data:** 23/09/2026 · **Branch:** `vm/w3-pose` · **Base:** `vm/integracao-k` (PR #638).
Retrato datado; o estado vivo é o que as réguas citadas imprimem. Nenhuma flag `ready` nem `VM_LAUNCH`
mudou. Catálogo privado: `~/csbrasil-private-assets/generated/viewmodels-w3-pose/overlay` (hardlinks
da overlay da integração K + os produtos abaixo; nenhum inode compartilhado foi escrito).

## O que entrou (produto, receita, régua, crítico A/B)

| Item | Arma | Receita (postProcess no manifesto) | Réguas antes → depois | Crítico A/B |
|---|---|---|---|---|
| P9 | rem700 | `braco-estavel` + `saque-do-idle` + `municao-na-mao` | vm-manga-tela (pior quadro) 64% → 14%; saque 47% → 5% | MELHOROU (bloco vermelho e saque de lado sumiram) |
| P2 | rem700, mosin | `municao-na-mao` | carregador VERM (tira no ar) → verde | mosin/rem700 MELHOROU |
| P10 | mosin | `saque-do-idle` (substitui o equip da arma antes da virada) | — | MELHOROU (saque não vem mais de lado) |
| P1/P15 | scar, carbine | `grip-support` (alvos novos) | maos 0,44/0,38 → 0,00/0,00 | MELHOROU, MELHOROU |
| P1/P11 | g3 | `grip-support` | maos 0,40 → 0,05 | MELHOROU |
| P12 | ak, akm | `grip-support` (`retorno` na vazia) | pegada-k verde | IGUAL (só muda a vazia 95%, mão no guarda-mão) |
| P8 | shotgun | `pente-na-mao` (modo `pontas`) | carregador 4 falhas → verde | IGUAL (no pixel) |
| P6 | p90 | `mag-na-mao.json` (`deslocCam`) | carregador toco 30% → verde | IGUAL |
| P3 | svd | `compacta-peca` + `pente-na-mao` | carregador 2 falhas → verde | IGUAL: o pente sai, mas mostra a malha recortada (lasca no receptor, bordas serrilhadas) — B3 |
| P5 | uzi | `compacta-peca` | "fantasma 100%" sai; resta "repouso não encosta" (régua: medido durante o saque) | IGUAL |

Régua nova: `eval:vm-manga-tela` (`tools/eval/vm-manga-tela-check.mjs`), sobre o palco offline
`tools/viewmodels/prep/vm-palco-offline.mjs` (cameraSpacePackage REAL do runtime, manga estendida do
`vmsleeve.js` incluída, raster com recorte no plano próximo). Teto 30% da tela; o produto da integração da
rem700 reprova (mutante). A tavor fica como dívida (recarga B1: 100%). `vm-pegada-k` ganhou scar,
carbine e g3 (o produto do catálogo reprova em PG1).

## Revertido (o crítico viu pior ou igual sem ganho)

- **tavor** (P1): o tubo da manga do runtime é resolvido na pose do idle; idle novo → recarga pior (PIOROU 2×).
- **awp** (P11): o guarda-mão está além do alcance do braço (IK > 1 → recarga cobre a tela); em x −0,22 a mão fica no ferrolho (IGUAL). É enquadramento (C5).
- **deagle** (P7): `pente-cai` (pente vazio cai, novo chega na mão) reduziu o carregador de 9 para 2 falhas, mas o crítico viu PIOROU (o pente ejetado sumiu na vazia 15). Receita guardada em `artifacts/review-w3-pose/tools/pente-cai.mjs` (não versionada).

## Não feito (onda parada) e entregas a outras frentes

- P4 tavor/famas (pente fora do quadro com a mão na tela): a recarga teleporta o pente — **vm/w3-blender** (B1).
- P13 revólver pequeno no ADS: `ads-pose` com avanço 10 cm dá +19% de arma com luvas 7,1% (PG9 ≤ 8%) — troca a decidir pelo dono.
- P14 poses de ADS (m4/tavor/lmg): dependem do reenquadramento de ADS da **vm/w3-config** (C1).
- P16 PT-38: aprovada, não muda sem o dono.
- `eval:vm-placar` P1: o placar precisa ser re-medido (`--placar --armas=<as 11 acima>`, 3:2 e 16:9) — os `vmbytes` mudaram.

## Receitas genéricas (servem à fábrica sobre o pack KINEMATION)

- `braco-estavel.mjs`: IK de dois ossos com polo no cotovelo do idle; opção `arma` amortece o movimento da arma no clipe com as mãos no referencial dela.
- `saque-do-idle.mjs`: saque a partir do idle da própria arma (arco do runtime no `RIG_FP_ARMS`).
- `municao-na-mao.mjs`: peça escondida (clipe/cartucho) rígida na mão numa janela por clipe, orientada pela geometria.
- `pente-na-mao.mjs`: peça segue a mão a partir do instante da pegada; modo `pontas` leva a peça às pontas dos dedos.
- `compacta-peca.mjs`: peça recortada com acessor próprio (sem "fantasma" nas réguas).
- `vm-palco-offline.mjs`: raster offline fiel ao runtime (manga estendida incluída) em segundos.
- `grip-support.mjs` ganhou `retorno` (janela em que a pegada volta, independente da distância).

Achado que vale para a fábrica: **a manga estendida do runtime depende da pose do idle e do giro do braço
em cada clipe** — mexer só no idle muda a recarga; braço que gira muito vira tubo cobrindo a tela.
