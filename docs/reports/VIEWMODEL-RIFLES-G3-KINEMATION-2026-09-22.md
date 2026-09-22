# G3 KINEMATION — candidato técnico de 22/09/2026

## Estado

A G3 foi reautorada sobre o checkpoint final da M4 KINEMATION. A candidata
preserva 55/55 ossos do contrato, as três camadas de mãos e seis ações. O pente
reto completo e os dois botões reais de retenção são extraídos da malha pública
própria; as duas recargas removem e devolvem o pente e pressionam os botões. A
fonte não possui uma alavanca de manejo separável, então a receita não inventa
esse mecanismo. `ready:false`, família G3 e ativação global seguem desligadas.

Este é um candidato técnico para revisão humana, sem aprovação visual.

## Receita reproduzível

Fonte privada aprovada, fora do Git:

- `rifles/m4/m4-final.blend`: SHA-256
  `e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe`;
- fonte pública `public/models/weapons/g3.glb`: SHA-256
  `b19eb799350ce0a264b6cce90552bb9849ec34fb95260177357c3f53c7b7bb9e`.

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b \
  --python tools/viewmodels/prep/rifles-g3-final.py -- \
  --m4-source=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/m4/m4-final.blend \
  --g3-source="$PWD/public/models/weapons/g3.glb" \
  --output-dir=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/g3-kinemation
```

Produtos privados:

- `g3-final.blend`: 1.827.612 bytes, SHA-256
  `35f3d2daf6c83096b33b8e1178220ebf6b7b268d1a8017acd376d65a078e0c21`;
- `g3-baked-runtime.glb`: 1.607.272 bytes, SHA-256
  `6a4cd484a8df4c35e43fe8ecd13eb5b242d02b39e8aeec3b2bfe55c70f9f4446`.

## Gates

- asset causal: verde, 13 mutantes mordidos;
- rig: 55/55 ossos KINEMATION, três camadas de mão skinadas;
- ações: `idle`, `equip_rifle`, `shoot`, `reload_tactical`, `reload_empty`,
  `inspect`;
- mecanismo: pente percorre 0,3873 m e volta a 0 nas duas recargas; botões de
  retenção percorrem 0,0056 m e voltam a 0 nas duas recargas;
- lifecycle: 10/10 controles, 30 ciclos e 540 amostras em 3:2/16:9;
- enquadramento: 1,038× e 97,6% visível em 3:2; 1,006× e 97,6% visível em
  16:9; orçamento do braço 0,744×/0,692×, abaixo do teto 1,4×;
- contrato do catálogo: `eval:vm-rig` passa a apontar somente AWP como rig
  legado.

## Captura e revisão humana

Evidência privada em
`evidence/g3-kinemation-20260922-0440`: 20 PNGs reais em 1440×960 e 1440×810,
ligados ao checkpoint `d0037ac08`, sem erro fatal. Os 84 erros de console são
404/CORS do ambiente local e não incluem falha do viewmodel, shader ou WebGL.

- `capture.json`: SHA-256
  `7f662ff1045a7fd3830532f2087b0d8eb4b58dc7158a816a04b52cbb80b16c84`;
- folha 3:2: SHA-256
  `427c8cb788d927836d93e2bf37b602eb4e0c1d17840c7e573c907e4bdaf806eb`;
- folha 16:9: SHA-256
  `bf2426ce83fdaddcffd8dd1cfa641b68e87c204de56f85d195a15048d7f28019`.

Preview ativo:

```text
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmweapon=g3&vmqa=precision
```

Revisar idle, ADS, contato da mão forte no punho, mão de apoio no guarda-mão,
trajetória das duas recargas, pressão dos botões, draw, tiro e inspect. O eixo
de repouso usa rotação específica para casar escala, enquadramento e orçamento
de braço; o julgamento humano deve confirmar que a inclinação continua natural.
Não marcar `ready:true` a partir dos gates técnicos.
