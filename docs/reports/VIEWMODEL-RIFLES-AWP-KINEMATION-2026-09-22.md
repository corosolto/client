# AWP KINEMATION — candidato técnico de 22/09/2026

## Estado

A AWP foi reautorada sobre o checkpoint final da M4 KINEMATION. A candidata
preserva 55/55 ossos do contrato, as três camadas de mãos e seis ações. O pente
completo e a alavanca real do ferrolho são extraídos da malha pública própria;
as duas recargas removem e devolvem o pente, o ferrolho cicla no tiro e na
recarga vazia e permanece fechado na recarga tática. A trava do pente é fundida
ao receiver da fonte e não é inventada. `ready:false`, família sniper e ativação
global seguem desligadas.

Este é um candidato técnico para revisão humana, sem aprovação visual.

## Receita reproduzível

Fonte privada aprovada, fora do Git:

- `rifles/m4/m4-final.blend`: SHA-256
  `e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe`;
- fonte pública `public/models/weapons/awp.glb`: SHA-256
  `6a303a1b97dfd23b9e1e9c979700119dffbb0ee3c48551751887f7f86a372a2a`.

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b \
  --python tools/viewmodels/prep/rifles-awp-final.py -- \
  --m4-source=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/m4/m4-final.blend \
  --awp-source="$PWD/public/models/weapons/awp.glb" \
  --output-dir=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/rifles/awp-kinemation
```

Produtos privados:

- `awp-final.blend`: 1.711.487 bytes, SHA-256
  `730b5cb8650627eab275f00734b6d1399851883ac290ee27e6b3d07aa23ae517`;
- `awp-baked-runtime.glb`: 1.486.132 bytes, SHA-256
  `3e6b77e45760191847097dc4847c9200686367d241c7d03505b46de06ba52f0a`.

## Gates

- asset causal: verde, 14 mutantes mordidos, incluindo mutantes separados para
  o ciclo do ferrolho no tiro e na recarga vazia;
- rig: 55/55 ossos KINEMATION, três camadas de mão skinadas;
- ações: `idle`, `equip_rifle`, `shoot`, `reload_tactical`, `reload_empty`,
  `inspect`;
- mecanismo: pente percorre 0,3873 m e volta a 0 nas duas recargas; ferrolho
  percorre 0,1000 m e volta a 0 no tiro e na recarga vazia, e fica imóvel na
  recarga tática;
- lifecycle: 10/10 controles, 30 ciclos e 540 amostras em 3:2/16:9;
- enquadramento: 0,936× e 95,3% visível em 3:2; 0,890× e 96,0% visível em
  16:9; orçamento do braço 0,682×/0,623×, abaixo do teto 1,4×;
- contrato do catálogo: `eval:vm-rig` fica verde nas 24 candidatas medidas,
  sem rig legado nem ação obrigatória faltando.

## Captura e revisão humana

Evidência privada em
`evidence/awp-kinemation-20260922-0455`: 22 PNGs reais em 1440×960 e 1440×810,
incluindo hip-fire, ADS e scope, ligados ao checkpoint `920d2e6ca`, sem erro
fatal. Os 84 erros de console são 404/CORS do ambiente local e não incluem
falha do viewmodel, shader ou WebGL.

- `capture.json`: SHA-256
  `76dd0608011347825c8a8e9b9eb2faca86089e9a3d5bc7a2467b4a6491e9c665`;
- folha 3:2: SHA-256
  `204ce54ad434f10f70f65733bd21ebeaa74300bfe1656f1e6a93f9e15dfcf5ee`;
- folha 16:9: SHA-256
  `4be9cfce8679243317d3aa673a47c9b3ebefcc91b406ed35437341be807e0fad`.

Preview ativo:

```text
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmweapon=awp&vmqa=precision
```

Revisar idle, ADS, scope, contato da mão forte no punho, mão de apoio no fuste,
trajetória das duas recargas, ciclo do ferrolho no tiro/vazia, draw e inspect.
Não marcar `ready:true` a partir dos gates técnicos.
