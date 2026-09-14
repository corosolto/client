# Deagle final técnica — alpha.252

## Resultado

A Deagle agora tem um produto privado único com a DGL50 própria, duas mãos completas,
slide, cão, gatilho e carregador separados, `idle`, tiro, recarga tática, recarga vazia,
inspect e ADS físico. O arco de draw usa a cadência de gameplay da pistola. A família e
a arma permanecem `ready:false`; a ativação global continua desligada até revisão humana.

O ajuste de enquadramento removeu a calibração antiga do wrap montado em runtime. Nas
capturas finais, punho, mão forte e mão de apoio ficam dentro do quadro em 1440x960 e
1440x810. Reload mostra retirada e retorno do carregador; o slide e o cão respondem ao
tiro; inspect retorna ao idle sem romper a pega; ADS centraliza o eixo medido do cano.

## Proveniência e produto privado

- fonte KINEMATION DGL50, Fab Standard License, não redistribuível como fonte;
- candidato lido somente de `claude/vm-unificado@012add17b`, sem transportar sua pilha
  dirty nem alterações de runtime;
- fonte promovida: `3135164` bytes, SHA-256
  `9716c72881076b8f1cddbdb72d35232a89fcc2c81538f95885156d2bcb0a7ffc`;
- produto: `3136132` bytes, SHA-256
  `85c38a13dd9a6b218768bd13bddc4813826481ace6f438cb17a338538192cf1d`;
- receita: `tools/viewmodels/prep/pistols-deagle-final.mjs`;
- snapshot: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/f1a871277-85c38a13`;
- manifesto do snapshot: SHA-256
  `5f1e02a6b3bdd4ecbc5b4ac8b476890cb2a94ef8b6f7b194d68ee199e60a3e81`.

Nenhum byte licenciado entrou no Git ou no build público. O carregamento continua lazy e
o fallback legado permanece visível durante ausência, erro ou espera do asset.

## Evidência causal e lifecycle

`npm run eval:vm-pistol-deagle` passou com cinco clipes e oito mutantes: ausência de
inspect, sight, arma, pente ou marcador, slide/cão congelados e inspect parado. Medidas
principais no produto:

- slide no tiro: `0.0701 m` de excursão;
- pente: `0.3956 m` na recarga tática e `0.5911 m` na vazia;
- inspect: `0.0372 m`, endpoint `0.0000 m`, drift da pega forte `0.0000 m`;
- recargas fecham com endpoint da arma em `0.0000 m`.

`npm run eval:vm-pistol-deagle-lifecycle` passou 30 ciclos, 540 amostras e seis controles
causais. Cobriu draw, rajada repetida, as duas recargas, inspect, ADS, cancelamento por
troca, morte, terceira pessoa, Promise obsoleta e fallback durante o load.

## Capturas reais

O driver abriu o jogo real no mapa `piscina_treta` e produziu 20 PNGs: idle, dois pontos
do draw, tiro, dois pontos de cada recarga, inspect e ADS nas duas proporções. A captura
em `9f1d7f5dd` registrou 84 ruídos não fatais já conhecidos de requests externos/CORS e
zero erro fatal de página, WebGL ou viewmodel.

- diretório: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/pistols-deagle-20260914`;
- `capture.json`: SHA-256
  `aba32ea13bdf711e09dfc861a4a84b8d22e2922070daade005e9af69de4492b3`;
- folha 3:2: SHA-256
  `2442c6001e09a3e009e9812a69d98ac1799b3ce03e9ec4ee3c8e48ef0afcd5c3`;
- folha 16:9: SHA-256
  `afec59d803e46065c4ebc97ab7c2b500421e0e8c8fbd063fef51fd7b17bc0654`.

Esta revisão interna elimina os defeitos técnicos e de enquadramento observados; não
substitui a aprovação visual humana do dono. Próxima arma sequencial: revólver .38.
