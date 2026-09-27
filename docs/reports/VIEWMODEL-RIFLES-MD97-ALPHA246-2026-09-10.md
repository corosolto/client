# MD97 final opt-in sobre alpha.246

## Resultado

A MD97 agora combina a malha pública própria de 6.466 vértices com mãos e gramática de ações
da fundação AR. O carregador que faltava foi reconstruído offline em dois segmentos a partir da
especificação declarativa já usada pelo jogo: pente frontal de 20 tiros, incluindo floorplate e
rake de −7°. Nenhuma peça visual do M4 foi mantida como identidade da arma.

O primeiro build revelou que tracks herdados reimpunham a escala da M4 durante cada ação. A
correção foi aplicada nos vértices da malha MD97, tornando o comprimento visual de 0,9135 m
(1,05 × 0,87) invariável entre idle, equip, tiro, recargas e inspeção.

Produto externo: 1.471.632 bytes, SHA-256
`d0989e2f5688ad44d3338cf541fe2345036cea12d57c4695250344362059567f`.
Estado: `ready:false`, família AR e ativação global desligadas.

## Evidência

- oito mutantes morderam, incluindo corpo trocado, mag ausente/congelado, recargas iguais,
  câmera/sight ausentes e inspect parada;
- carregador excursionou 0,4524 m e reassentou nas recargas tática e vazia;
- lifecycle passou 30 ciclos/540 amostras alternando 1440×960 e 1440×810;
- 20 capturas reais cobrem idle, equip, shoot, reload tactical/empty, inspect e ADS sem erro fatal
  de viewmodel/WebGL;
- as mensagens 404/CORS do backend local permanecem registradas como ruído não fatal, sem serem
  tratadas como sucesso de integração.

Evidência externa:

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-md97-20260910/
capture.json        147a0699ae2577918532320fe7ea0c7f928c29767d1db50d3360939f483a6e2f
contact-sheet-3x2   e8d0f0d94418ffb1375598c10dc0e83f01f32d72434c73a2f3f50535ac81765d
contact-sheet-16x9  3d6e961f3cc541034e0d0e45b13ad8e0b3b71f0b0edc5e4b67cd3eb92d324f56
```

O manifesto foi recapturado depois que um falso-verde foi encontrado no harness antigo: chamar
`setAim` diretamente era desfeito pelo loop do jogo. A versão registrada usa o controle real do
jogador, exige `adsAmount > 0.9` e mostra a alça centralizada nas duas proporções.

## Revisão humana pendente

Revisar em ambos os aspectos a leitura do carregador abaixo do receiver, o apoio da mão esquerda
no guarda-mão, as duas trajetórias de recarga e o ADS. O gate técnico não promove a candidata.

Checkpoints: `35ad8e345` (reautoria), `50d00eb39` (gates/capturas) e `c684f12fd`
(runtime opt-in). A correção da evidência ADS está em `788ec4e8e`.
