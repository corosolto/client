# P90 final técnica — alpha.252

## Resultado

A P90 agora usa a arma, o pente superior e os mecanismos próprios do pacote
KINEMATION, montados sobre a câmera e as malhas completas de mãos da fundação SMG.
As ações autorais da P90 foram retargetadas por nome para esse esqueleto estável. O
produto entrega `idle`, tiro, recargas tática e vazia, inspect e draw. A arma e a
família permanecem `ready:false`; a ativação global continua desligada até revisão
humana.

O pacote P90 isolado foi rejeitado durante a montagem porque chegava 41,56 graus
fora do eixo do gabarito e mostrava arma e braços quase verticais. A alternativa
retarget antiga também foi rejeitada por sobreposição das mãos. A receita final
preserva arma e animações P90, usa a câmera e as malhas de braços da fundação SMG e
aplica o enquadramento medido ao conjunto inteiro, mantendo os contatos juntos. O
tiro autocontido cicla alavanca, mecanismo e gatilho; as duas recargas removem o
pente superior; a vazia também aciona a alavanca e o mecanismo.

## Proveniência e produto privado

- fundação KINEMATION Striker-V, Fab Standard License, não redistribuível como fonte;
- entrada da fundação: `3764304` bytes, SHA-256
  `aed9fd871b9b9281f3a7fbe7db2baab0095cc5f5f5cc7cbd802ae31cabd5d102`;
- pacote KINEMATION PDW90: `7855720` bytes, SHA-256
  `bcc168ba41a001fb0e374b0500215f3f6ebd17aaf63480512a5c547fcf67139b`;
- produto: `10904196` bytes, SHA-256
  `85f87b74df8207e8c6ae27a47a7844eb960d76f238299dbf26551886da0aac74`;
- receita: `tools/viewmodels/prep/p90-final.mjs`;
- snapshot: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/e21aa2777-85f87b74`;
- manifesto do snapshot: SHA-256
  `bb970ef44b18bd4f4dce320ad1f3084e767129b80a3ff5107b2c077540a72124`.

Nenhum byte licenciado entrou no Git ou no build público. O carregamento continua
lazy e o fallback legado permanece visível durante ausência, erro ou espera do
asset.

## Evidência causal e lifecycle

`npm run eval:vm-p90-final` passou com cinco clipes e nove mutantes: ausência de
inspect, sight, arma, pente ou marcador; alavanca e gatilho congelados no tiro;
alavanca congelada na recarga vazia; e inspect parado. Medidas principais no
produto:

- tiro: arma `0,0296 m` e alavanca `0,0700 m`;
- recarga tática: pente `1,0010 m`;
- recarga vazia: pente `0,9977 m`, alavanca e mecanismo `0,4923 m`;
- inspect: arma `0,1280 m`, endpoint `0,0000 m`, drift da pega forte `0,0001 m`.

`npm run eval:vm-p90-lifecycle` passou 30 ciclos, 540 amostras e seis controles
causais. Cobriu draw, tiro repetido, ambas as recargas, inspect, ADS, cancelamento
por troca, morte, terceira pessoa, Promise obsoleta e fallback durante o load.
`eval:vm-foundation`, `eval:vminspect` e `eval:vmlabhud` também permaneceram verdes.

## Capturas reais e decisão de ADS

O driver abriu o jogo real em `piscina_treta` e produziu 22 PNGs: idle, dois pontos
do draw, tiro, dois pontos da recarga tática, três da vazia, inspect e ADS nas duas
proporções. A captura em `e21aa2777` registrou 84 ruídos não fatais já conhecidos de
requests locais 404/CORS e zero erro fatal de página, WebGL ou viewmodel.

- diretório: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/p90-20260914`;
- `capture.json`: SHA-256
  `0f473499322d6b207e64432c7f226a7245656644e5fe1145b604622b261d50b5`;
- folha 3:2: SHA-256
  `76be7ea65713ab8ef18f02d63c32f50fc989c7fc2c8fe62f572ecd9c58921a57`;
- folha 16:9: SHA-256
  `af6ba9516d1f673208d7d7dcba3868cea32a7bcf4a89ce137ef91e9283df5085`.

O ADS automático por sockets foi rejeitado internamente porque deslocava o cano
para fora do quadro. O produto preserva sockets medidos de muzzle e sight, mas usa
uma pose de ombro conservadora. As folhas finais mostram arma, pente superior,
mecanismos e duas mãos dentro do quadro em idle, draw, tiro, recargas, inspect e
ADS nas duas proporções. Esses estados continuam pendentes de aprovação visual
humana do dono.

Próxima arma sequencial: shotgun.
