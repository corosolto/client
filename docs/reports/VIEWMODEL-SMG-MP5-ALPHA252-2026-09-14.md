# MP5 final técnica — alpha.252

## Resultado

A MP5 agora usa um produto privado único da KINEMATION, com duas mãos completas,
carregador, ferrolho, alavanca de manejo, retém e gatilho próprios. O pacote entrega
`idle`, tiro mecânico, recargas tática e vazia, inspect e draw. A arma e a família
permanecem `ready:false`; a ativação global continua desligada até revisão humana.

O tiro cicla o ferrolho e o gatilho. As duas recargas removem o carregador; a vazia
também aciona a alavanca. Inspect retorna exatamente ao idle sem romper a pega forte.
As capturas finais mantêm arma, punho e duas mãos dentro do quadro em 1440x960 e
1440x810.

## Proveniência e produto privado

- fonte KINEMATION MP5, Fab Standard License, não redistribuível como fonte;
- entrada congelada: `3726964` bytes, SHA-256
  `4d08736e615e634b9255f7cb61d8e5d5afdcaedb0d509cd0e56296fe5e968e77`;
- produto: `3729680` bytes, SHA-256
  `14d430b62fcc9f3a720eb235efe8b556119857b13ef3af33b9870d71affb6e26`;
- receita: `tools/viewmodels/prep/smg-mp5-final.mjs`;
- snapshot: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/9ff5f0ecf-14d430b6`;
- manifesto do snapshot: SHA-256
  `9e2d26a4a2860e39ea6dfedb3f692b00a3ea668e6a0e5e3a04d99a9da698e5f8`.

Nenhum byte licenciado entrou no Git ou no build público. O carregamento continua
lazy e o fallback legado permanece visível durante ausência, erro ou espera do asset.

## Evidência causal e lifecycle

`npm run eval:vm-smg-mp5` passou com cinco clipes e nove mutantes: ausência de
inspect, sight, arma, pente ou marcador, ferrolho/gatilho/alavanca congelados e
inspect parado. Medidas principais no produto:

- tiro: arma `0,0296 m`, ferrolho `0,2440 m`;
- recarga tática: carregador `0,8342 m`;
- recarga vazia: carregador `1,4315 m` e alavanca `0,7370 m`;
- inspect: `0,0369 m`, endpoint `0,0000 m`, drift final da pega forte `0,0000 m`.

`npm run eval:vm-smg-mp5-lifecycle` passou 30 ciclos, 540 amostras e seis controles
causais. Cobriu draw, tiro repetido, ambas as recargas, inspect, ADS, cancelamento por
troca, morte, terceira pessoa, Promise obsoleta e fallback durante o load.

## Capturas reais e decisão de ADS

O driver abriu o jogo real no mapa `piscina_treta` e produziu 22 PNGs: idle, dois
pontos do draw, tiro, dois pontos da recarga tática, três da vazia, inspect, contato
e ADS nas duas proporções. A captura em `006a0814a` registrou 84 ruídos não fatais
já conhecidos de requests externos/CORS e zero erro fatal de página, WebGL ou
viewmodel.

- diretório: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/smg-mp5-20260914`;
- `capture.json`: SHA-256
  `f4cb8f71581f2f7ea56e99af92b6ffb3dcd11a61d31afd63824d32a39e3e8ec8`;
- folha 3:2: SHA-256
  `fc42ff80394e9da3b63ab2589b88714cfddea82c17f873f2224d055e599e9173`;
- folha 16:9: SHA-256
  `454421a1b5af18c6a41be32d84312c98f24efe2c0d609e340a0faf983bc96e4b`.

Tentativas de ADS automático por socket e eixo PCA foram rejeitadas internamente:
a topologia skinned/rest desse pacote trazia manga e arma para primeiro plano e
ocultava o alvo. O produto mantém sockets de muzzle e sight medidos, mas a configuração
final usa uma pose de ombro calibrada e conservadora. Ela é legível e distinta do
hipfire; não deve ser descrita como colimação física perfeita. A mão de apoio se move
durante a retirada do pente e volta ao contato nos estados posteriores. Esses pontos,
assim como o inspect e o ADS, continuam pendentes de aprovação visual humana do dono.

Próxima arma sequencial: Uzi.
