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
capture.json        5721880254aad6ff5e0965107d32e96600d7fd30882d630fd8a3eeca72b9b2c0
contact-sheet-3x2   6e5a54d7b70acd98ab531eaf7ffd11f0fc83e61dec37c8bacba682adac6a2491
contact-sheet-16x9  9adf214da287659ee4c237caa9568f1fca5d89891ef962d3d06f82b4361b9273
```

## Revisão humana pendente

Revisar em ambos os aspectos a leitura do carregador abaixo do receiver, o apoio da mão esquerda
no guarda-mão, as duas trajetórias de recarga e o ADS. O gate técnico não promove a candidata.

Checkpoints: `35ad8e345` (reautoria), `50d00eb39` (gates/capturas) e `c684f12fd`
(runtime opt-in). Próxima arma: SCAR, com seleção integral do pente e comando lateral próprio.
