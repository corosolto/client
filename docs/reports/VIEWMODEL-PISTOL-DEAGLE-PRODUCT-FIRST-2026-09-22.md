# Deagle product-first — enquadramento, contato e ADS em 22/09/2026

## Resultado técnico

O produto anterior mantinha a extensão da manga até o ombro na pose de pistola.
O gate RED `1e196b91a` contou 2.056 triângulos dominados pelos ossos
`upperarm_twist_01_l/r`; a manga ocupava 3,837× a silhueta da AK em 3:2 e
3,736× em 16:9. Arma, eixo e escala já estavam coerentes, portanto afastar a
câmera ou mudar FOV apenas esconderia o defeito.

A receita agora remove somente as faces proximais da manga e compacta seus
atributos de skin. Antebraços, luvas, mãos, rig, pesos e todas as ações são
preservados. O produto fecha a régua com 1,329×/1,292× de braço, sem alteração
de câmera, FOV, frame compartilhado ou runtime.

A candidata continua `ready:false`; família Deagle e rollout global permanecem
desligados. A PT-38 não foi tocada.

## Proveniência e reprodução

- fonte privada KINEMATION DGL50: 3.135.164 bytes, SHA-256
  `9716c72881076b8f1cddbdb72d35232a89fcc2c81538f95885156d2bcb0a7ffc`;
- produto privado: 3.246.776 bytes, SHA-256
  `d482ff82bceba3690ff4dd5912f95851d538320a55d9d7f37cf56e32fd2c64a4`;
- manga: 2.836 → 1.778 vértices e 5.180 → 3.124 triângulos;
- receita versionada: `tools/viewmodels/prep/pistols-deagle-final.mjs`;
- recibo privado: `source/deagle/product-20260922/build.json`;
- nenhum byte licenciado foi adicionado ao Git.

Exemplo de reprodução offline:

```sh
node tools/viewmodels/prep/pistols-deagle-final.mjs \
  --source=/caminho/privado/deagle-runtime.glb \
  --output-dir=/caminho/privado/deagle-final
```

## Gates causais, ações e contato

`eval:vm-pistol-deagle` passa cinco ações (`idle`, `shoot`,
`reload_tactical`, `reload_empty`, `inspect`) e 11 mutantes. Ausência de arma,
pente, marker, sight ou inspect reprova; congelar slide, cão ou inspect reprova;
deslocar cada mão de forma independente reprova; reintroduzir uma face dominada
pelo braço superior também reprova.

- mão forte: cinco grupos de dedos ficam entre 0,00 e 0,01 mm da arma;
- mão de apoio: cinco grupos ficam entre 0,00 e 19,50 mm, dentro do contrato
  de apoio bilateral da pistola;
- slide: 0,0701 m de excursão no tiro;
- pente: 0,3956 m na recarga tática e 0,5911 m na vazia;
- inspect: 0,0372 m, endpoint zero e contato da mão forte preservado.

O lifecycle passa 10/10 controles, 30 ciclos e 540 amostras. Inclui draw, tiro
repetido, as duas recargas, inspect, ADS, cancelamentos, morte, terceira pessoa,
Promise obsoleta e fallback durante o carregamento. `eval:vmlabhud` passa 6/6 e
`eval:vminspect` permanece verde.

## Enquadramento, eixo e evidência real

| aspecto | escala angular | arma no quadro | braço/AK |
| --- | ---: | ---: | ---: |
| 3:2 | 0,927× | 100,0% | 1,329× |
| 16:9 | 0,911× | 100,0% | 1,292× |

O eixo mede 7,1° e preserva a boca do cano à frente da alça. O jogo real
produziu 20 PNGs em 1440×960 e 1440×810: idle, draw, tiro, dois pontos de cada
recarga, inspect e ADS. `adsAmount: 1` foi observado nas duas proporções. Houve
84 ruídos externos conhecidos e zero erro fatal.

- evidência privada: `evidence/deagle-product-20260922`;
- `capture.json`: SHA-256
  `a33e2d293de6a586fd51ea490c5c8def6a489ac7aeb5e3062b019aa82d6bd5a3`;
- folha de contato: SHA-256
  `3295b1596b1bf2aab30e4b3d1ac2c3164257bb9eb29d476c146b2f052e5488c4`;
- URL local:
  `http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=deagle&vmweapon=deagle&vmqa=precision`.

## Decisão pendente

Tecnicamente o cluster Deagle está fechado. A imagem ainda precisa de revisão
humana em idle, apoio, recargas, inspect e ADS antes de qualquer `ready:true`.
