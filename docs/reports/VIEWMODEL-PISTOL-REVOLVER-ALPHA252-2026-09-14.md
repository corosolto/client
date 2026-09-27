# Revólver .38 final técnica — alpha.252

## Resultado

O Revólver .38 agora usa um produto privado único da Viper-357, com duas mãos
completas, tambor, braço do tambor, extrator, cão e gatilho próprios. O pacote
entrega `idle`, tiro mecânico, recarga vazia, inspect, draw procedural e ADS físico.
A arma e a família permanecem `ready:false`; a ativação global continua desligada
até revisão humana.

O tiro gira o tambor em `1,0472 rad`, arma o cão em `0,8008 rad` e move o gatilho em
`0,3150 rad`. A recarga abre o tambor, desloca o extrator e traz a mão de apoio ao
mecanismo. Inspect retorna exatamente ao idle e o ADS mede o eixo do cano pela mira
própria. As capturas finais mantêm arma, punho e duas mãos dentro do quadro em
1440x960 e 1440x810.

## Proveniência e produto privado

- fonte KINEMATION Viper-357, Fab Standard License, não redistribuível como fonte;
- a fonte externa mudou durante o marco; a produção congelou e validou somente o
  arquivo de entrada imutável abaixo, sem consumir estados posteriores;
- entrada congelada: `3913292` bytes, SHA-256
  `ddb088750bbdd4db455aa415ea8b74e59d6178733687f172cdf647d32cec1516`;
- produto: `3914264` bytes, SHA-256
  `422b7118403ac56059d0268859cf1486a82760ed014f279791dec26de255ae9d`;
- receita: `tools/viewmodels/prep/pistols-revolver-final.mjs`;
- snapshot: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/79b91e413-422b7118`;
- manifesto do snapshot: SHA-256
  `c5c072619c144b08f5d6cb9867cf27a24f3263e9f508af77ff8896ef5eccf953`.

Nenhum byte licenciado entrou no Git ou no build público. O carregamento continua
lazy e o fallback legado permanece visível durante ausência, erro ou espera do asset.

## Evidência causal e lifecycle

`npm run eval:vm-pistol-revolver` passou com quatro clipes e nove mutantes: ausência
de inspect, sight, arma, tambor ou marcador, tambor/gatilho/cão congelados e inspect
parado. Medidas principais no produto:

- tambor na recarga: `0,0947 m` de excursão;
- extrator na recarga: `0,1216 m` de excursão;
- inspect: `0,0381 m`, endpoint `0,0000 m`, drift final da pega forte `0,0000 m`;
- recarga fecha com endpoint da arma em `0,0000 m`.

O gate mecânico independente amostrou 73 pontos e confirmou geometria ponderada sob
tambor, cão e gatilho. Seus três mutantes congelados falharam como esperado.

`npm run eval:vm-pistol-revolver-lifecycle` passou 30 ciclos, 540 amostras e seis
controles causais. Cobriu draw, tiro repetido, recarga vazia, inspect, ADS,
cancelamento por troca, morte, terceira pessoa, Promise obsoleta e fallback durante
o load.

## Capturas reais

O driver abriu o jogo real no mapa `piscina_treta` e produziu 18 PNGs: idle, dois
pontos do draw, tiro, três pontos da recarga, inspect e ADS nas duas proporções. A
captura em `cebe82502` registrou 84 ruídos não fatais já conhecidos de requests
externos/CORS e zero erro fatal de página, WebGL ou viewmodel.

- diretório: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/pistols-revolver-20260914`;
- `capture.json`: SHA-256
  `e433ec1052d1f2196f3e4e7a15197c1d4cbafc4dac55b2f02c3f9db1d0f7ba5d`;
- folha 3:2: SHA-256
  `41e98d57433936daf8cde4888adf9643ee3683aed937ad50f248090c3848acf4`;
- folha 16:9: SHA-256
  `4690cd1bee19a00712a311078108154b27e3dbfad14d7ffafcebde0dde2e023a`.

A inspeção interna confirma o tambor aberto com contato da mão de apoio, identidade
própria, retorno da inspeção e ADS centralizado. Ela não substitui a aprovação visual
humana do dono. Próxima arma sequencial: MP5.
