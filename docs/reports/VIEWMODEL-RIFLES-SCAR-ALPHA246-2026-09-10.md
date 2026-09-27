# SCAR final opt-in sobre alpha.246

## Resultado

A SCAR usa sua malha pública própria de 7.017 vértices e a gramática validada de mãos e ações da
família AR. A reautoria separa o carregador completo (236 vértices) e o comando lateral
reciprocante (81 vértices) da malha original. O corpo exportado preserva 6.707 vértices próprios;
nenhuma geometria visual da M4 substitui a identidade da SCAR.

O pacote contém `idle`, `equip_rifle`, `shoot`, `reload_tactical`, `reload_empty` e `inspect`.
O carregador excursionou 0,4524 m e reassentou; o comando lateral percorreu 0,0525 m no tiro. O
root comum mantém arma e mãos juntos em equip, tiro e inspeção. O comprimento visual é 0,90 m.

Produto externo: 1.526.788 bytes, SHA-256
`958a0223cb2efa703ffe200f17044308a7bf1a9016d786b816e3b1cdc053c20c`.
Estado: `ready:false`, família AR e ativação global desligadas.

## Evidência

- gate do asset passou com seis clipes, câmera, sockets, carregador e comando separados;
- nove mutantes morderam, incluindo corpo trocado, pente/comando congelados, recargas iguais,
  câmera/sight ausentes e inspeção parada;
- lifecycle passou 30 ciclos/540 amostras alternando 1440×960 e 1440×810; seis mutantes de
  visibilidade assíncrona morderam;
- 20 capturas reais cobrem todas as ações e ADS, com zero erro fatal de viewmodel/WebGL;
- fundação passou 20/20 e preserva os 26 IDs, fallback e fronteira de assets privados.

Evidência externa:

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-scar-20260910/
capture.json        520faf488afdc7b1567eb76e316887ce6cdcb1a152465d8f0cdc2723779c1844
contact-sheet-3x2   6c780e758eb215dcfcbe4b1b70cd310402bccee6b6ce4de74cdee86048f78f75
contact-sheet-16x9  ee3d0cb1acadbef440a142e5c14efde2facd2f1332276ee4cb3532874c8d7665
```

## Revisão humana pendente

As capturas comprovam ADS real: o harness aciona o controle do jogador e exige
`adsAmount > 0.9`. Como a malha pública não contém uma alça traseira destacada, a linha usa o
trilho superior e deve ser julgada nas duas proporções. Revisar também apoio da mão esquerda,
leitura do pente e comando lateral no tiro. O gate técnico não promove a candidata.

Checkpoints: `9c967e8f6` (reautoria), `788ec4e8e` (gates/captura e correção ADS) e
`78465afaa` (runtime opt-in). Próxima arma: FAMAS.
