# MP5 KINEMATION — reautoria produto-first em 22/09/2026

## Resultado técnico

O produto antigo `14d430b6…` era um falso verde. A câmera atravessava o pacote:
somente 48,4% da arma ficava no quadro, a escala angular media 70,159×/68,215×
o alvo do arsenal e os dez grupos de dedos estavam entre 72,53 e 258,48 mm da
malha. O gate RED causal que expõe esses contatos é `ceda47099`.

A MP5 foi reautorada sobre as mãos, as três camadas de roupa e as ações da G3
KINEMATION aprovada. A arma própria vem do asset público já versionado no repo;
o produto acrescenta carregador 9 mm curvo, retém, alavanca, ferrolho, gatilho e
um guarda-mão arredondado contínuo. O guarda-mão corrige o apoio sem deslocar os
braços já estáveis e permanece preso ao receiver durante as recargas.

Nenhuma câmera, FOV ou frame compartilhado foi alterado para fechar escala. A
compensação de unidade/eixo mora em `VM_PRODUCT_MP5` dentro do GLB. A candidata,
a família MP5 e o rollout global continuam desligados (`ready:false`).

## Proveniência e reprodução

- MP5 pública: `public/models/weapons/mp5.glb`, 281.500 bytes, SHA-256
  `c623f27ccc2ca163f9d7b4bb94524ff9bf8b69b805fdafba2fb913e8c1a6382d`;
- fundação privada G3 KINEMATION: 1.827.612 bytes, SHA-256
  `35f3d2daf6c83096b33b8e1178220ebf6b7b268d1a8017acd376d65a078e0c21`;
- produto privado: 1.550.620 bytes, SHA-256
  `ac4630c4941b33e626ebbee61071c3b5c558de24647338da87da32346cba9903`;
- receita versionada: `tools/viewmodels/prep/smg-mp5-kinemation.py`;
- produto e `.blend`: `source/mp5/kinemation-final/`, fora do Git.

Exemplo de reprodução offline:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python tools/viewmodels/prep/smg-mp5-kinemation.py -- \
  --g3-kinemation=/caminho/privado/g3-final.blend \
  --mp5-source=public/models/weapons/mp5.glb \
  --output-dir=/caminho/privado/mp5-final
```

## Gates causais, ações e contato

`eval:vm-smg-mp5` passa com cinco ações próprias (`idle`, `shoot`,
`reload_tactical`, `reload_empty`, `inspect`) e 11 mutantes. Ausência de arma,
pente, marker, sight ou inspect reprova; congelar ferrolho, gatilho, alavanca ou
inspect reprova; deslocar cada mão de forma independente também reprova.

- contato no idle: dez grupos entre 0,00 e 5,00 mm da arma;
- tiro: ferrolho, alavanca e gatilho têm movimento próprio;
- recarga tática/vazia: pente percorre 0,4108 m; a vazia também aciona a
  alavanca;
- inspect: conjunto percorre 0,3250 m e retorna a 0,1 mm do idle;
- pega forte: drift máximo de 4,6 mm na recarga tática e zero no inspect.

O lifecycle passa 11/11 controles, 30 ciclos e 540 amostras. Inclui draw, tiro
repetido, as duas recargas, inspect, ADS, cancelamentos, morte, terceira pessoa,
Promise obsoleta e fallback durante carregamento. HUD e inspect globais também
passam. A configuração da MP5 usa ADS automático pelos sockets próprios; a
captura final mostra a alça centrada na mira em 3:2 e 16:9.

## Enquadramento e evidência real

`vm-frame-calibra` passa sem override de câmera:

| aspecto | escala angular | arma no quadro | braço/AK |
| --- | ---: | ---: | ---: |
| 3:2 | 0,970× | 97,4% | abaixo de 1,4× |
| 16:9 | 0,936× | 97,4% | abaixo de 1,4× |

O jogo real produziu 22 PNGs em 1440×960 e 1440×810: idle, draw, tiro, dois
pontos da recarga tática, três da vazia, inspect e ADS. Houve 84 ruídos externos
conhecidos e zero erro fatal.

- evidência privada: `evidence/mp5-kinemation-candidate5-auto-ads`;
- `capture.json`: SHA-256
  `4356bbe48615e7f9df8c6205bcf5b798ab434b6416d16c40fee0d69244a2308d`;
- URL local:
  `http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=mp5&vmweapon=mp5&vmqa=precision`.

## Decisão pendente

Tecnicamente o cluster MP5 está fechado. A imagem ainda precisa de revisão
humana em idle, apoio, recargas, inspect e ADS antes de qualquer `ready:true`.
PT-38 não foi tocada.
