# M92 KINEMATION — candidato técnico de 22/09/2026

## Estado

A M92 foi reautorada sobre o checkpoint final da M4 KINEMATION. A candidata
preserva 55/55 ossos do contrato, as três camadas de mãos e seis ações. O pente
curvo completo e a alavanca lateral são extraídos da malha pública própria; as
duas recargas removem e devolvem o pente, enquanto somente a recarga vazia
aciona a alavanca. `ready:false`, família AK e ativação global seguem desligadas.

Este é um candidato técnico para revisão humana, sem aprovação visual.

## Receita reproduzível

Fonte privada aprovada, fora do Git:

- `rifles/m4/m4-final.blend`: SHA-256
  `e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe`;
- fonte pública `public/models/weapons/m92.glb`: SHA-256
  `575ff58ae569392386edd2d8147904dd9e9dd75cb8979c1a95196457dbf70230`.

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b \
  --python tools/viewmodels/prep/rifles-m92-final.py -- \
  --m4-source=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/m4/m4-final.blend \
  --m92-source="$PWD/public/models/weapons/m92.glb" \
  --output-dir=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/m92-kinemation
```

Produtos privados:

- `m92-final.blend`: 1.879.674 bytes, SHA-256
  `eb9888381d439372d224505e7acf01cea1dbed812556d49fc6cb3a6d2149ef0c`;
- `m92-baked-runtime.glb`: 1.654.024 bytes, SHA-256
  `95b0445bb1e397ae45d22fbf7e92dce408f1dc04dded1f77a4a4e8c857d7cecb`.

## Gates

- asset causal: verde, 13 mutantes mordidos;
- rig: 55/55 ossos KINEMATION, três camadas de mão skinadas;
- ações: `idle`, `equip_rifle`, `shoot`, `reload_tactical`, `reload_empty`,
  `inspect`;
- mecanismo: pente percorre 0,3873 m e volta a 0 nas duas recargas; alavanca
  percorre 0,0446 m e volta a 0 somente em `reload_empty`;
- lifecycle: 10/10 controles, 30 ciclos e 540 amostras em 3:2/16:9;
- enquadramento: 0,987× e 95,9% visível em 3:2; 0,942× e 95,9% visível em
  16:9. A M92 sai da lista vermelha de `eval:vm-frame`;
- contrato do catálogo: `eval:vm-rig` passa a apontar somente AKM, G3 e AWP
  como rigs legados.

## Captura e revisão humana

Evidência privada em
`evidence/m92-kinemation-20260922-0340`: 20 PNGs reais em 1440×960 e
1440×810, sem erro fatal. Os 84 erros de console são 404/CORS do ambiente local
e não incluem falha do viewmodel, shader ou WebGL.

- `capture.json`: SHA-256
  `4ee05b41b81093289dafcf09b22de4873d621d6b5a2b6e2cf54dae1bc7885d37`;
- folha 3:2: SHA-256
  `ba37438d3322827d40908749229dad803607dab7a1010e820fe06e574247d2f1`;
- folha 16:9: SHA-256
  `7f87e9342b7f0938ea4393bb4a034c69bed16246df6b0cfbe20a3293bd405403`.

Preview ativo:

```text
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmweapon=m92&vmqa=precision
```

Revisar idle, ADS, contato da mão forte no punho, mão de apoio no guarda-mão,
trajetória das duas recargas, curso da alavanca na vazia, draw, tiro e inspect.
Não marcar `ready:true` a partir dos gates técnicos.
