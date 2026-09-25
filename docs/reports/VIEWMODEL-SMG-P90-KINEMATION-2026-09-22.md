# P90 KINEMATION — produto coerente, eixo e contato

## Resultado técnico

A P90 foi reautorada sobre o rig KINEMATION aprovado da G3. O produto anterior
foi rejeitado: a arma chegava desmontada, o eixo alça→boca apontava para trás e
as mãos estavam entre 19,83 e 154,93 mm longe da malha. O novo produto preserva
as três camadas de mãos, usa uma P90 pública coerente, separa o carregador
superior e inclui alavanca, mecanismo, gatilho e dois reténs próprios.

A candidata continua `ready:false`; família e rollout global continuam
desligados. Este fechamento é técnico e ainda precisa de revisão humana das 22
capturas reais antes de qualquer ativação.

## Fontes, receita e produto privado

- mãos e ações: checkpoint privado `g3-final.blend`, 1.827.612 bytes, SHA-256
  `35f3d2daf6c83096b33b8e1178220ebf6b7b268d1a8017acd376d65a078e0c21`;
- corpo: `public/models/weapons/p90.glb`, 254.312 bytes, SHA-256
  `6fda87809ab60e1fea7a1e7bf5ebc5355e6ee70d595f7c4610ed88e847560aa2`;
- receita reproduzível: `tools/viewmodels/prep/smg-p90-kinemation.py`;
- produto GLB privado: 1.477.620 bytes, SHA-256
  `3eece3e0fb6eb8c640f96c084523af0cc979e3d3a00239f5697a7aa6975e6908`;
- seleção congelada: 4.942 faces de fonte, 4.497 no corpo e 445 no pente;
- nenhum byte privado/licenciado foi adicionado ao Git.

O frame legado da família P90 ainda contém a compensação do pacote quebrado.
A receita transporta essa diferença para `VM_PRODUCT_P90`, dentro do produto,
sem mudar câmera, FOV, `vmframe`, runtime ou materiais compartilhados.

## RED causal e mutantes

O checkpoint RED `93f215487` acrescentou medida contra os triângulos reais da
arma. No produto antigo:

- mão forte: dedos 64,96–87,53 mm; polegar 19,83 mm;
- mão de apoio: dedos 144,05–154,93 mm; polegar 111,41 mm;
- os mutantes independentes `solta-mao-esquerda` e
  `solta-mao-direita` reprovam.

No novo produto, os dez grupos de dedos encontram a superfície entre 0,00 e
0,09 mm. Os onze mutantes passam, incluindo ausência de arma/pente/sight,
alavanca, gatilho e inspect congelados e cada mão solta separadamente.

## Escala, eixo e ações

`eval:vm-frame` passa os dois aspectos:

| aspecto | razão angular | dentro do quadro | braço relativo |
|---|---:|---:|---:|
| 3:2 | 0,988× | 97,3% | 0,627× |
| 16:9 | 0,934× | 97,3% | 0,600× |

O eixo alça→boca mede 11,0° e a boca está à frente. A P90 entrega `idle`,
`shoot`, `reload_tactical`, `reload_empty`, `inspect` e o draw da família. O
tiro move arma, alavanca, mecanismo e gatilho; as duas recargas removem o pente
0,4601 m, e a vazia também cicla a alavanca/mecanismo. O inspect excursiona o
conjunto 0,3640 m e retorna a 0,1 mm do idle. O lifecycle passou 30 ciclos, 540
amostras e seis controles adversariais, cobrindo draw, recargas, inspect, ADS,
troca, morte, terceira pessoa, Promise obsoleta e fallback.

## Capturas reais e pendência humana

O jogo real em `piscina_treta` produziu 22 capturas em 1440×960 e 1440×810:
idle, draw, tiro, recargas, inspect e ADS. Não houve erro fatal de página,
WebGL ou viewmodel.

- evidência privada:
  `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/p90-kinemation-candidate7`;
- `capture.json`: 29.518 bytes, SHA-256
  `4a158bcd3981f551a54e1b6f4764cbea258838facad178f8454926ddc338b9e3`;
- idle 3:2: SHA-256
  `df54dffcda95b2937ba0ebeadcdb2e66e2fb55ead5895dc60e8e4d89488268fa`;
- idle 16:9: SHA-256
  `f75f50340415b8845ac17a4759179b73637c60ff9c3db1fe22601a56cbdffbf0`.

Revisar humanamente: leitura da silhueta compacta, volume das mangas, posição
da mão de apoio, remoção do pente superior, inspect e ADS nos dois aspectos.
Não promover `ready:true` antes desse aceite.
