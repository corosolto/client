# FAMAS final opt-in sobre alpha.246

## Resultado

A FAMAS foi reautorada como bullpup a partir de sua malha pública própria. A seleção por ilhas
conectadas separa o pente traseiro integral (472 vértices) e o comando curvo sob a alça (138
vértices); o corpo preserva 5.922 vértices antes das seis duplicações de borda do exportador.
Mãos, câmera e gramática de ações vêm da fundação AR, sem transportar geometria da M4.

O pacote contém `idle`, `equip_rifle`, `shoot`, `reload_tactical`, `reload_empty` e `inspect`.
A trajetória do pente foi reautorada atrás da mão forte. O pente excursionou 0,2074 m e
reassentou nas duas recargas; a mão esquerda chegou a 0,1000 m no ciclo tático e 0,0471 m no
vazio. A recarga vazia acrescenta 0,0626 m de curso ao comando superior depois da inserção.

Produto externo otimizado: 1.589.920 bytes, SHA-256
`640f3369d7cf586ad7c7f153d556a713e6afcf349ea61d93af6dc792fb180592`.
Estado: `ready:false`, família AR e ativação global desligadas.

## Proveniência e evidência

| Item | Bytes | SHA-256 |
|---|---:|---|
| corpo público FAMAS | 284.980 | `159c0750b378252a7c5da16837b1e4c584e900416a2085dfd662cb38ea60405a` |
| Blender final externo | 2.264.722 | `e785cf52d69fbb015400418146294e64ce256a5d7500a51b48d5a8497c5fe7e3` |
| GLB bruto externo | 1.612.652 | `f400997608e96eb1ec9c8811af9ff4ca71e573126fb849d804720d73f14d2776` |
| GLB otimizado externo | 1.589.920 | `640f3369d7cf586ad7c7f153d556a713e6afcf349ea61d93af6dc792fb180592` |

- nove mutantes morderam: clipe, pente, movimento, semântica das recargas, sight, câmera,
  comando congelado, corpo trocado e inspeção parada;
- lifecycle passou 30 ciclos/540 amostras em 1440×960 e 1440×810, com seis mutantes;
- fundação passou 20/20, preservando os 26 IDs, fallback e fronteira privada;
- 20 capturas reais passaram com zero erro fatal de viewmodel/WebGL.

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/rifles-famas-20260910/
capture.json        efb7c454254e8c4ece4739a11a440395ee98da288fb8045135648377e30dde0d
contact-sheet-3x2   d18ddfb911a148623b90b28fe5d586b52fa2649693830687967ca57daf58fef1
contact-sheet-16x9  6d5a7a1699a1407d2b248a3538af93d75ce80ab5522145085e854def3b1218db
```

## Revisão humana pendente

As folhas confirmam a silhueta bullpup, a alça alta e ADS real nas duas proporções. Revisar o
antebraço esquerdo no meio da extração, a leitura do pente fora do poço e o contato no comando
superior. A distância medida é gate de alcance, não prova anatômica; por isso a candidata não é
promovida sem o julgamento humano no jogo.

Checkpoints: `ad9438253` (reautoria), `49eadfb17` (gates/captura) e `aa25a86ef`
(runtime opt-in). Próxima arma: M92.
