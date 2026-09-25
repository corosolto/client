# Revólver .38 product-first — escala, mangas e inspect em 22/09/2026

## Inventário e decisão

O manifesto de armas curtas contém três candidatas. A PT-38 permanece congelada
e não foi aberta, reprocessada nem alterada. A Deagle `d482ff82…` manteve seus
gates de produto e lifecycle verdes e foi preservada sem mudança. O vermelho
real restante era o Revólver .38.

O produto anterior passava ações e lifecycle, mas a régua do catálogo media
1,473×/1,454× a escala angular alvo e 3,081×/2,920× de ocupação dos braços em
3:2/16:9. Além disso, a captura mostrou que `inspect` herdava a pose final da
recarga e desaparecia do quadro. Esses defeitos foram reproduzidos antes da
correção pelo checkpoint RED `995969e91`.

## Produto corrigido

A receita agora remove somente as 2.056 faces da manga dominadas pelos ossos
`upperarm_twist_01_l/r`, preservando antebraços, luvas, mãos, skin e ações. Um
rebase intrínseco `[-0,025; -0,040; 0,115]` corrige distância e enquadramento
dentro do GLB. Câmera, FOV, frame de família e runtime não foram alterados.

O `inspect` inclui 201 canais estáticos derivados do primeiro quadro do idle,
além do gesto da raiz. Assim ele não herda mais a última pose de recarga. O
socket da boca foi reproduzido pela receita no ponto geométrico já validado em
18/09, preservando eixo de 2,3° e boca à frente da alça.

- fonte privada Viper-357: 3.913.292 bytes, SHA-256
  `ddb088750bbdd4db455aa415ea8b74e59d6178733687f172cdf647d32cec1516`;
- produto privado: 4.074.036 bytes, SHA-256
  `c1394590ae640ff32792ac41e78bd3eeca7ccd1163d0a12c071a69d9582bed36`;
- manga: 2.836 → 1.778 vértices e 5.180 → 3.124 triângulos;
- receita: `tools/viewmodels/prep/pistols-revolver-final.mjs`;
- recibo privado: `source/revolver/product-20260922/build.json`, SHA-256
  `67064467800da2129c3f92ff101a8b6603937bc716aa28132a992102ec982b69`;
- nenhum byte licenciado foi adicionado ao Git.

## Gates causais e lifecycle

`eval:vm-pistol-revolver` passa quatro ações e 14 mutantes. Ausência de arma,
tambor, marker, sight, rebase ou inspect reprova; congelar tambor, gatilho, cão
ou inspect reprova; deslocar cada mão de forma independente reprova; reintroduzir
uma face dominada pelo braço superior também reprova.

Os dez grupos de dedos medem 0,00–14,14 mm da arma. A recarga abre o tambor em
0,0947 m e aciona o extrator em 0,1216 m. O inspect mede 0,0253 m, retorna a
zero e preserva o contato da mão forte. O lifecycle passa 10/10 controles,
30 ciclos e 540 amostras, incluindo draw, tiro, recarga, inspect, ADS,
cancelamentos, morte, terceira pessoa, Promise obsoleta e fallback no load.
HUD, inspect global e contrato KINEMATION permanecem verdes.

## Enquadramento e evidência real

| aspecto | escala angular | arma no quadro | braço/AK |
| --- | ---: | ---: | ---: |
| 3:2 | 1,109× | 100,0% | 0,777× |
| 16:9 | 1,096× | 100,0% | 0,726× |

A captura ligada a `93c34d8a7` gerou 18 PNGs reais em 1440×960 e 1440×810:
idle, dois pontos do draw, tiro, três pontos da recarga, inspect e ADS. O
`inspect` aparece nas duas proporções e `adsAmount: 1` foi observado. Houve 84
ruídos externos conhecidos e zero erro fatal de página, WebGL ou viewmodel.

- evidência privada: `evidence/revolver-product-20260922`;
- `capture.json`: SHA-256
  `737e5062529dba50b6fefab27fd4c4316dbed0c6309fc30bb9f3c880d4347f20`;
- folha 3:2: SHA-256
  `229f817cd2c46208e5811bb2d8e03f736ab4c431a1d909224cd8c6ccd2946319`;
- folha 16:9: SHA-256
  `4a1eb66bd6eefce871f00f03e96535049e8b9ec06756833547473f0cca249f4c`;
- URL local:
  `http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=revolver&vmweapon=revolver38&vmqa=precision`.

## Estado de aceite

O cluster técnico de pistolas não congeladas está fechado: Deagle preservada e
Revólver .38 corrigido. As três candidatas continuam `ready:false`; famílias e
rollout global continuam desligados. A revisão humana de idle, recarga, inspect
e ADS ainda é obrigatória antes de qualquer promoção.
