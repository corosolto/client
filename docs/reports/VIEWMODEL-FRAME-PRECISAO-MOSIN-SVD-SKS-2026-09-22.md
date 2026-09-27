# Enquadramento de precisão — Mosin, SVD e SKS em 22/09/2026

## Resultado técnico

O cluster remove os vermelhos de enquadramento, escala e dominância dos braços
de Mosin, SVD e SKS sem trocar os produtos privados nem alterar suas ações. A
mudança registra somente overrides de câmera por arma sobre as candidatas já
integradas. As três famílias, o catálogo global e cada candidata continuam
`ready:false`.

- Mosin: 0,977×/92,7% visível/0,745× de braço em 3:2;
  0,934×/92,7%/0,687× em 16:9;
- SVD: 1,024×/87,5% visível/0,639× de braço em 3:2;
  1,023×/87,5%/0,608× em 16:9;
- SKS: 1,000×/93,2% visível/0,665× de braço em 3:2;
  0,955×/93,2%/0,619× em 16:9;
- os três canos permanecem à frente das respectivas alças;
- `eval:vm-rig`: 24/24 candidatas KINEMATION, 55/55 ossos e ações obrigatórias;
- `eval:vm-precision-lifecycle`: 10/10, 30 ciclos e 630 amostras;
- `eval:vm-precision-tools`: 10/10, incluindo controles mutantes de interface;
- o gate T/M/C/F/A congelado dos produtos continua verde com doze controles
  vermelhos por arma; este checkpoint muda apenas o frame do runtime;
- `vm-frame-calibra --armas=mosin,svd,sks`: verde nas duas proporções.

O gate de ferramentas precisa do Python 3.13 com NumPy do Blender no ambiente
local. A reprodução usada foi:

```sh
PYTHONPATH=/Applications/Blender.app/Contents/Resources/5.2/python/lib/python3.13/site-packages \
PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin \
/opt/homebrew/bin/node tools/eval/viewmodel-precision-tools-check.mjs
```

## Evidência privada

A captura real está ligada ao checkpoint `6daf117fc` e permanece fora do Git:

- diretório: `evidence/precision-frame-20260922-0540`;
- 42 PNGs em 1440×960 e 1440×810, cobrindo referências, idle, contato de
  tiro, contato de recarga, entrada de ADS e ADS coberto;
- zero erro fatal; os 88 erros registrados são recursos opcionais/CORS de
  localhost, não WebGL, `pageerror` ou `[paid-viewmodel]`;
- `capture.json`: SHA-256
  `5fe18878b70a3e8839611e4c9d49cd2a6d1d9c724f93ff820d03a83b7fd533b4`;
- `frame.json`: SHA-256
  `52459db39409b3364d5aaf10e470f71a3910c6a642ba0822539df0b13ab03a18`;
- folha 3:2: SHA-256
  `4220548a0b2a4db656878e19d5b7e5a6b1ef00939b45d4f53a56110b28336d88`;
- folha 16:9: SHA-256
  `a8c90404156a98ac168442cf9d02a384341c9f78c41861818041d18bfe89a22f`.

As folhas não mostram desaparecimento, inversão ou quebra entre proporções. As
mangas continuam visualmente marcantes e o enquadramento lateral da SVD é
peculiar ao produto; mãos, contato, inclinação, ADS e movimento ainda exigem
revisão humana antes de qualquer promoção.

```text
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmweapon=mosin,svd,sks&vmqa=precision
```
