# LMG final técnica — alpha.252

## Resultado

A Metralha "Treta Pesada" usa a MGX5 própria do pacote produzido para o catálogo,
com as duas mãos completas e mecanismos próprios de caixa, cinto, tampa do
receiver, bandeja de alimentação e alavanca. O produto entrega `idle`, tiro,
recarga tática, recarga vazia e inspect; o saque vem do pacote General do
runtime, como na P90. A arma e a família permanecem `ready:false` e a ativação
global continua desligada até revisão humana.

O ciclo fechou um defeito que a régua anterior não via: nas duas recargas do
pacote a tampa transladava 87,79 cm, a bandeja 54,32 cm e a caixa 57,79 cm no
rig da arma. Em primeira pessoa essas peças cruzavam o quadro soltas no ar — a
captura de 18/09 mostra a tampa pairando no canto superior direito, longe da
arma e da mão. Tampa e bandeja compartilham o pivô do receiver e já abrem por
rotação (76,6° e 45,1°), então a translação delas era apenas defeito: ficou em
zero e a dobradiça responde pelo movimento. A troca da caixa preserva a
trajetória autorada com o módulo limitado a 18 cm, o que mantém o mecanismo
legível sem atirar a peça fora do enquadramento.

## Proveniência e produto privado

- fonte MGX5 do pacote: `6810720` bytes, SHA-256
  `ce9921338a35cf0a5ab0959c451579d32b42e4468624f9c48b42c9e23bf88235`;
- produto: `6601448` bytes, SHA-256
  `2afc8c2603c9b448cb8163c56585c26047608ffe67fdfd29b2ccbe36d4e24b4f`;
- receita: `tools/viewmodels/prep/lmg-final.mjs`;
- snapshot: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/abd34869e-2afc8c26`;
- manifesto do snapshot: SHA-256
  `53237a0b2ebd7b4229f679f6451b3ac4cb5b384225d4d1ba1cbfddb2d53994cb`;
- candidata anterior, reprovada por peça solta, preservada em
  `source/lmg/rejeitada-88cm-tampa` (SHA-256
  `fe01f8b0d40450902921e99a8028cf80501effaf5a0eac854b8c34eb2d6cfe5e`).

Nenhum byte do produto privado entrou no Git ou no build público. O carregamento
continua lazy e o fallback legado permanece visível durante ausência, erro ou
espera do asset.

A receita não é reproduzível byte a byte entre toolchains: o `prune` do
gltf-transform dobra os atlas placeholder 1×1 em `baseColorFactor` usando
`Math.pow`, e o último bit do fator varia com a libm do Node. Sob Node 23.6.0
o rebuild dá `1c4c84ddbb455a4cb3d02d79cc835a8a85c9e6a51655d5d7fba81c93419b1039`
contra o `fe01f8b0…` original — nove bytes de JSON, um ULP em um fator que o
runtime sobrescreve (`applyTeamHandMaterial` força `color` branco e religa o
atlas do time). O SHA fixado no manifesto vale para o produto servido, não como
promessa de rebuild determinístico.

## Evidência causal e lifecycle

`npm run eval:vm-lmg-final` passa com cinco clipes e treze mutantes: ausência de
inspect, sight, arma, caixa ou marcador; cinto, caixa e tampa congelados; apoio
congelado; inspect parado; e três mutantes novos que reintroduzem o defeito desta
rodada — tampa arrancada, bandeja arrancada e caixa fora de quadro.

A régua de recarga foi reescrita: antes media excursão da origem do nó no mundo
com limites apenas inferiores (`boxExcursion >= 0.5`, `coverExcursion >= 0.5`),
o que premiava exatamente a peça voando. Agora mede rotação e translação local
no rig da arma, em cm. Caixa, tampa e bandeja são ossos sem malha própria —
distância entre origens de nó não descreve contato nem enquadramento.

Mecanismo medido no produto:

| Clipe | Tampa | Bandeja | Caixa |
|---|---|---|---|
| `reload_tactical` | 76,6° · 0 cm | 0° · 0 cm | 34,3° · 18 cm |
| `reload_empty` | 76,6° · 0 cm | 45,1° · 0 cm | 34,3° · 18 cm |

No tiro o cinto avança um elo (0,89 cm), o conjunto recua pela raiz e nenhuma das
mãos solta a arma (drift 0 nas duas). O inspect lê o conjunto por 0,2554 m e
fecha no idle com endpoint 0.

`npm run eval:vm-lmg-lifecycle` passa 13 controles, 30 ciclos e 600 amostras em
3:2 e 16:9. `eval:vm-foundation` (20/20), `eval:vminspect`, `eval:vmlabhud` e
`eval:vm-shotgun-final` seguem verdes.

## Capturas reais e decisão visual

O driver abriu o jogo real em `piscina_treta` e produziu 32 PNGs em 1440×960 e
1440×810: idle, dois pontos do saque, três do tiro, quatro fases de cada
recarga, inspect e ADS. Zero erro fatal de página, WebGL ou viewmodel; 84 ruídos
não fatais já conhecidos de requests locais 404/CORS.

- diretório: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/lmg-20260918-dobradica`;
- `capture.json`: SHA-256
  `3402b1c307a6c6ccb509e569833a75dcdfd1095e1551fd7382f3db937ae998bb`;
- captura do defeito, preservada para comparação:
  `evidence/lmg-20260918`, `capture.json` SHA-256
  `4ea33cfbeed4f1733dfb05514329df0a4a19b36ea4caa697a0bd32d1d1737a24`.

A inspeção das folhas confirma que nenhuma peça aparece solta no quadro em
nenhuma fase das duas recargas, que a silhueta da arma permanece legível e que a
mão forte fica presa à arma no tiro e no inspect. O ADS usa pose de ombro
conservadora.

## Pendência explícita

A mão de apoio continua aberta e afastada durante as duas recargas, e a caixa não
aparece no quadro nas fases em que sai do poço. Isso não é regressão desta
rodada: é a mesma limitação de contato registrada em MP5, Uzi, P90 e nos pentes
de M92/SCAR. A régua exige que a mão de apoio se mova (`leftExcursion >= 0,15`),
não que ela faça contato — nenhum gate desta lane certifica pegada. Fechar
contato de mão de apoio é trabalho de autoria por família, ainda aberto para o
arsenal inteiro.

A LMG é a última das 26. Com ela o catálogo passa à etapa 5 da ordem de
integração: regressão cruzada, duas proporções, HUD, terceira pessoa, build
limpo e revisão adversarial — nada disso foi executado nesta rodada.
