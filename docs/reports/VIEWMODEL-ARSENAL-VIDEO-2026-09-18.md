# Vídeo do arsenal — 26 armas em movimento

## Por que existe

Até aqui a evidência visual do catálogo era só still: cada recibo congela frações
de clipe e os próprios recibos declaram que isso não certifica transição. Um
still não mostra tranco entre clipes, salto na troca de estado, pose herdada da
ação anterior nem continuidade entre quadros — exatamente a classe de defeito
que fechou a LMG (peça solta cruzando o quadro) e que só apareceu porque alguém
olhou a imagem. Não havia um único vídeo no acervo: 948 PNG, zero gravação.

`npm run capture:vm-arsenal-video` grava o jogo real rodando, sem pausar clipe e
sem tocar mixer. A sequência sai da mesma API de QA do capturador de stills
(`__vmPrecisionQa`): equipa, saca, dá três tiros, recarrega inteiro, entra e sai
do ADS; na faca, três golpes. O tempo de recarga por família vem do `vmconfig`,
com folga, para não cortar as longas (lmg/g3/svd fecham em 4,667 s).

## Rodada de 18/09

- diretório: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/arsenal-video-20260918`;
- revisão: `577d2255c`; mapa `piscina_treta`; 25 fps; VP8;
- 26 armas × 2 proporções = 52 clipes, 679,8 s de arma em movimento, 143 MB;
- mestre 3:2: 276,88 s / 6.922 quadros / 1440×960, SHA-256
  `ce6443f7c1cd91c9b1c2037ffb303765c6c51e0c590952e441d937283ed23a71`;
- mestre 16:9: 275,24 s / 6.881 quadros / 1440×810, SHA-256
  `27190ed866161fe58e37018a4dd016339050728dcddef88eda819103d40c25bf`;
- `video.json`: SHA-256
  `b85cffd9b0a8f0d65deaa5c674eb8e9848b884f03d48bfe2167109908277e49b`, com
  SHA-256 por clipe e a linha do tempo de cada ação em segundos de vídeo.

Zero erro fatal de página, WebGL ou viewmodel nas duas sessões. As 25 armas
assadas reportaram `authored:true` e a faca `melee:true` — nenhuma caiu no
fallback legado durante a gravação.

## Duas decisões de método

**Uma sessão por proporção, não uma por arma.** O boot do jogo custa ~30 s;
gravá-lo 26 vezes dobrava o tempo de execução sem acrescentar evidência. A
gravação inteira fica como mestre e o ffmpeg corta um arquivo por arma pelas
marcas de tempo, sem reencodar. O `-ss` do webm encosta no keyframe anterior,
então um clipe pode começar uma fração antes do marcado — a linha do tempo do
mestre continua sendo a referência exata.

**O relógio da rodada é segurado.** A sessão leva ~4,6 min e o round fecha antes
disso. Na primeira execução as últimas armas de 16:9 gravaram o placar de fim de
rodada em cima da arma. O driver agora zera a ameaça a cada arma (bots
silenciados, `timeLeft` estendido) e reprova qualquer clipe cujo estado de jogo
tenha saído de `live` — evidência com placar na frente não é evidência.

## O que o vídeo não resolve

Gravação não é aprovação. O vídeo é instrumento de revisão: serve para o dono
julgar leitura, peso, contato e transição com o jogo correndo. As 26 seguem
`ready:false` com ativação global desligada, e a pendência de contato da mão de
apoio nas recargas continua aberta para o arsenal inteiro — o vídeo torna essa
pendência mais visível, não menor.

A captura roda com `--use-angle=swiftshader`: o jogo avisa na tela que está
desenhando por CPU. Cadência e suavidade do vídeo não medem desempenho real de
GPU.
