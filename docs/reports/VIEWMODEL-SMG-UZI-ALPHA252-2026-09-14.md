# Uzi final técnica — alpha.252

## Resultado

A Uzi agora usa a malha pública própria assada sobre uma fundação KINEMATION
privada, com duas mãos completas. O carregador foi separado da própria Uzi e
acompanha o bone `Mag`; ferrolho superior e gatilho próprios ficaram visíveis e
animados. O pacote entrega `idle`, tiro, recargas tática e vazia, inspect e draw.
A arma e a família permanecem `ready:false`; a ativação global continua desligada
até revisão humana.

O primeiro pacote de tiro e inspect era esparso e podia herdar uma pose anterior da
recarga. A receita final congela a pose completa do idle dentro das duas ações,
mantendo arma e mãos enquadradas independentemente do estado anterior. O tiro cicla
ferrolho e gatilho; as duas recargas removem o carregador; a vazia também aciona o
ferrolho. Inspect retorna ao idle e preserva a pega forte.

## Proveniência e produto privado

- fundação KINEMATION Striker-V, Fab Standard License, não redistribuível como fonte;
- entrada da fundação: `3764304` bytes, SHA-256
  `aed9fd871b9b9281f3a7fbe7db2baab0095cc5f5f5cc7cbd802ae31cabd5d102`;
- malha pública Uzi: `271280` bytes, SHA-256
  `213b06a54610f35bf7315d6e85946604688315b9074f01f6040c2c33b3cf5edd`;
- produto: `4267588` bytes, SHA-256
  `353d0384ec60a0e6ffc99ef38b5092a5773c2562e2e4bc401adef1228ef0a9fc`;
- receita: `tools/viewmodels/prep/smg-uzi-final.mjs`;
- snapshot: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/d55560c68-353d0384`;
- manifesto do snapshot: SHA-256
  `01893a1237809cdc7f6e39c18d08d8f6a84b39bb9ba4446cfe3d729c6e6ca3d3`.

O retarget anterior `uzi-runtime.glb` foi rejeitado porque as mãos se sobrepunham e
não sustentavam a arma com uma silhueta estável. Nenhum byte licenciado entrou no
Git ou no build público. O carregamento continua lazy e o fallback legado permanece
visível durante ausência, erro ou espera do asset.

## Evidência causal e lifecycle

`npm run eval:vm-smg-uzi` passou com cinco clipes e nove mutantes: ausência de
inspect, sight, arma, pente ou marcador; ferrolho, gatilho ou alavanca congelados;
e inspect parado. Medidas principais no produto:

- tiro: arma `0,0296 m` e ferrolho `0,0424 m`;
- recarga tática: carregador `0,5571 m`;
- recarga vazia: carregador `0,4949 m` e ferrolho `0,1744 m`;
- inspect: `0,0454 m`, endpoint `0,0000 m`, drift da pega forte `0,0000 m`.

`npm run eval:vm-smg-uzi-lifecycle` passou 30 ciclos, 540 amostras e seis
controles causais. Cobriu draw, tiro repetido, ambas as recargas, inspect, ADS,
cancelamento por troca, morte, terceira pessoa, Promise obsoleta e fallback durante
o load.

## Capturas reais e decisão de ADS

O driver abriu o jogo real em `piscina_treta` e produziu 22 PNGs: idle, dois pontos
do draw, tiro, dois pontos da recarga tática, três da vazia, inspect e ADS nas duas
proporções. A captura em `d55560c68` registrou 84 ruídos não fatais já conhecidos de
requests externos/CORS e zero erro fatal de página, WebGL ou viewmodel.

- diretório: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/smg-uzi-20260914`;
- `capture.json`: SHA-256
  `c99b3e3931a933ba293d3cd984cb2f8c5396d496926a5110b88315dc50796400`;
- folha 3:2: SHA-256
  `664817a2f3ad6e8b72389b5fd4883ff2431cda69d10621b9ebcffbd40d67c68c`;
- folha 16:9: SHA-256
  `6e160cc1c5f75648dc063fe9e6c3d38e1637ae8c26f15dc7d86befe8f0fc5041`.

O ADS automático por sockets foi rejeitado internamente porque apontava a Uzi de
frente e perdia a cruz. O produto preserva sockets medidos de muzzle e sight, mas a
configuração final usa uma pose de ombro conservadora, legível nas duas proporções.
As folhas finais mostram arma, punho, carregador e duas mãos dentro do quadro em
idle, draw, tiro, recargas, inspect e ADS. Esses estados continuam pendentes de
aprovação visual humana do dono.

Próxima arma sequencial: P90.
