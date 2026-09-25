# AKM KINEMATION — candidato técnico de 22/09/2026

## Estado

A AKM foi reautorada sobre o checkpoint final da M4 KINEMATION. A candidata
preserva 55/55 ossos do contrato, as três camadas de mãos e seis ações. O pente
curvo completo e a trava real do pente são extraídos da malha pública própria;
as duas recargas removem e devolvem o pente e pressionam a trava. A fonte não
possui uma alavanca de manejo separável, então a receita não inventa esse
mecanismo. `ready:false`, família AK e ativação global seguem desligadas.

Este é um candidato técnico para revisão humana, sem aprovação visual.

## Receita reproduzível

Fonte privada aprovada, fora do Git:

- `rifles/m4/m4-final.blend`: SHA-256
  `e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe`;
- fonte pública `public/models/weapons/akm.glb`: SHA-256
  `3b835674db9d5c11d75f8652ef3edc9794e529091bff91795eb3e08881bfd0b3`.

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b \
  --python tools/viewmodels/prep/rifles-akm-final.py -- \
  --m4-source=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/m4/m4-final.blend \
  --akm-source="$PWD/public/models/weapons/akm.glb" \
  --output-dir=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/akm-kinemation
```

Produtos privados:

- `akm-final.blend`: 1.698.056 bytes, SHA-256
  `f47467d5592bfead373bd649bf91f09a9eb46788b7cdfcbfb96a718e30ee0376`;
- `akm-baked-runtime.glb`: 1.487.308 bytes, SHA-256
  `ebcfd0d3b7874bdb0420040ae65f055408210f34162ab227041d9b29e898dda2`.

## Gates

- asset causal: verde, 13 mutantes mordidos;
- rig: 55/55 ossos KINEMATION, três camadas de mão skinadas;
- ações: `idle`, `equip_rifle`, `shoot`, `reload_tactical`, `reload_empty`,
  `inspect`;
- mecanismo: pente percorre 0,3873 m e volta a 0 nas duas recargas; trava do
  pente percorre 0,0056 m e volta a 0 nas duas recargas;
- lifecycle: 10/10 controles, 30 ciclos e 540 amostras em 3:2/16:9;
- enquadramento: 0,913× e 93,5% visível em 3:2; 0,905× e 93,5% visível em
  16:9; orçamento do braço 1,213×/1,150×, abaixo do teto 1,4×;
- contrato do catálogo: `eval:vm-rig` passa a apontar somente G3 e AWP como
  rigs legados.

## Captura e revisão humana

Evidência privada em
`evidence/akm-kinemation-20260922-0426`: 20 PNGs reais em 1440×960 e
1440×810, ligados ao checkpoint `22db178b6`, sem erro fatal. Os 84 erros de
console são 404/CORS do ambiente local e não incluem falha do viewmodel,
shader ou WebGL.

- `capture.json`: SHA-256
  `0ed39d63d10607b1787cac7944e710d6c4797a93a425adcadcd514b943ca1467`;
- folha 3:2: SHA-256
  `1f5ec4802bfcbadb0cfa1bd31f799afcfcee739435f3015d607a85a0992f8121`;
- folha 16:9: SHA-256
  `03fc7f2fe0f035051156cff0eb65df991dc75fb52e7f2af1ebaf6d5113a398c8`.

Preview ativo:

```text
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmweapon=akm&vmqa=precision
```

Revisar idle, ADS, contato da mão forte no punho, mão de apoio no guarda-mão,
trajetória das duas recargas, pressão da trava, draw, tiro e inspect. O eixo
de repouso usa rotação específica para casar escala, enquadramento e orçamento
de braço; o julgamento humano deve confirmar que a inclinação continua natural.
Não marcar `ready:true` a partir dos gates técnicos.
