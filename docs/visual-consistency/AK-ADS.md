# AK ADS em linha de mira — contrato e procedência (31/10/2026, R7→R10)

Autor: lease GLM-AK (writer sequencial de arma/mãos/ADS). Régua:
`tools/eval/ads1p-linha-check.mjs` (default já inclui `ak`); prova de consumidor
real: `tools/eval/ads1p-runtime-consumer-check.mjs` (R8). Logs e fotos:
`../../audits/2026-10-31-visual-consistency/GLM-AK-R8-*.log`.

## O que mudou no produto (diff de config `public/js/data/vmconfig.js`, bloco `ak`)

- `ads.linha: true` — o `adsEfetivo` centra alça/massa no eixo da câmera
  (`?ads1pfix=0` volta ao foco antigo com `off[1]=-0.10` intacto).
- `ads.golden.massa`: `[-0.0064, 0.507, 0.0546]` → `[-0.0064, 0.5128, 0.0577]`.
  Delta real: **dx=0, dy=+5,8 mm, dz=+3,1 mm, hipotenusa 6,58 mm** (a alegação
  anterior de "Δx=−4,3 mm / hip 7,86 mm" estava errada e foi corrigida em R7).
- **R7** — `ads.golden.alca`: `[-0.0064, 0.167, 0.0588]` →
  `[-0.0064, 0.167, 0.0603]`. Motivo (foto real R5 do Root): a barra opaca da
  alça (topo `z=0.0593`, `y=0.1336`) cruzava o centro e ocultava a ponta — o
  socket em `.0588` estava ABAIXO do topo da barra (olhos dentro dela). A linha
  descer para `.0577` foi ideia que a revisão técnica rejeitou. Limiar medido: `.0588` dá
  L1v **+7 px** nos dois aspectos; `≥.0598` dá 0 px (varredura no raster do
  gate; `.0603` escolhido pela folga sobre a barra).

Nada mais: frame/hip intactos (gold# é `{x:0,y:0,z:0,fov}` — o hip não lê
`ads`), tiro/traçante intactos (a origem do traçante segue o muzzle físico;
alinhado desde a 1179 — não é crédito deste run), GLB intacto.

## O que a régua mede (imagem + sockets — L1v usa socket massa, L2 usa socket alça)
Rasteriza a malha em Node e lê a IMAGEM. **R8**: o mount do ADS é montado pelo
CONSUMIDOR REAL — `AuthoredViewModels.update` de produção (commit 4e273b5c),
instanciado com o THREE do node_modules, entry/sockets fixture e `setAim(1)`+
`update(0)`; o checker não replica mais a matemática do mount (o espelho
`rotDeg` de R7 virou código morto e foi removido — o runtime aplica
`frame.rotDeg` em `authoredvm.js:770`). Prova: `ads1p-runtime-consumer-check.mjs`
conta as chamadas ao `update` real (1 por arma) e, com `--mutante=consumidor`,
retira o `adsEfetivo` do consumidor — o checker tem de reprovar por L1–L3.

- **L1** — topo da ARMA na faixa central ±60 px a ≤4 px da cruz.
- **L1v** — topo frontal `|dyF|≤4 px` E **socket massa `|smy|≤4 px`**: a fresta
  da alça clipa o topo e esconde desvio vertical (mutante +0,5°: socket massa
  −11 px, topo visível só −4 px); o socket mede o que a fresta disfarça.
- **L2** — centro da PONTA (extensão das 4 primeiras linhas frontais além do
  corte de profundidade alça/massa) E **socket alça `|sax|≤4 px`**: erro lateral
  puro (`off[0]`) desloca a ponta ~1 px (fresta clipa) mas o socket alça
  +4,4 px — o socket morde onde a imagem perde resolução. Sem pixels frontais
  sob exigência = UNKNOWN = RED no baseline.
- **L3** — yaw do cano ≤0,09 rad.
- Aspectos: 1920×1080, 1800×1200, **1320×880 e 844×390** (tamanhos reais das
  fotos do dono, acrescentados em R7).

## Evidência (R8 refeita com consumidor real, `GLM-AK-R8-baseline.log`, exit 0)

Números idênticos ao R7 (a réplica não divergia do runtime nos pontos medidos);
agora medição pelo `update` de produção:

| aspecto | L1 topo | L1v frontal/socket | L2 dx/sax |
|---|---|---|---|
| 16x9 1920×1080 | +0,0 px | +0,0 / ±0 px | −1,0 / 0 px |
| 3x2 1800×1200 | +0,0 px | +0,0 / ±0 px | −1,0 / 0 px |
| r3x2 1320×880 | +0,0 px | +0,0 / ±0 px | −0,5 / 0 px |
| rwide 844×390 | +0,0 px | +0,0 / ±0 px | −0,5 / 0 px |

Figura R7 (`ak-ads1p-fotos-r7/ak-16x9.png`): ponta nasce EXATAMENTE na linha da
cruz, corpo largo só em +9; nenhuma barra cruzando o centro — confere com dyF=0.

Pistolas (pistol, deagle) passam no gate de CONTRATO (cano centrado, yaw 0,
arma abaixo da cruz — estilo foco). **Pendente visual**: o enquadramento foco
delas ainda não foi aprovado em foto real; este gate não certifica mira
alinhada para pistolas, só os contratos L2/L3 acima.

Wrapper (`GLM-AK-R8-wrapper-baseline.log` / `-consumidor.log`, JSON): baseline
`{realUpdateCalls:3, checkerExit:0}`; `--mutante=consumidor`
`{realUpdateCalls:3, checkerExit:1}` com mordida L1–L3 — a régua depende do
caminho REAL, não de réplica.

## Mutantes (REPROVADOS pela CLÁUSULA PRÓPRIA, exit 0)

Mutante só vale reprovado pela cláusula da sua mutação física (foco→L1,
lateral→L2, vertical→L1v); **UNKNOWN não é mordida** (no vertical era falsa
"detecção": a estação sumia do corte em vez de medir o desvio); mutante cuja
mutação não chega ao consumidor real ABORTA (verificado em `adsEfetivo`, a
função que o próprio `update` chama).

- `--mutante=foco` (kill-switch `?ads1pfix=0` no módulo real): **L1
  +65/+61/+45/+29 px** nos 4 aspectos.
- `--mutante=lateral` (**R8**: `ads.linha.off[0] +2 mm` na cfg de PRODUÇÃO,
  mesma instância que `authoredvm.js` importa; restore no finally): **L2 socket
  alça +4,4/+4,1 px** (16x9/3x2) na AK e **+4,0 px** nas pistolas; ponta só
  +0,5 px — clipada pela fresta.
- `--mutante=vertical` (**R8**: `ads.linha.rotDeg[0] +0,5°` na cfg de produção):
  **L1v socket massa −11,4/−10,7/−7,8 px** (topo visível −4/−4/−3). Em 844×390
  vira UNKNOWN (oclusão real pela fresta) — aviso, não mordida; os outros 3
  aspectos L1v são a prova.


## Limites

- Node raster ≠ navegador (sem MSAA/textura/pós); a régua lê silhueta e
  profundidade, não shading. Validação no jogo real (Ego, 3:2) é do Root.
- A mira é TANGENTE pela barra/orelhas (linha 1,1 mm acima do topo da barra,
  orelhas 2,6 mm abaixo da linha em y=0,176): se o dono quiser a figura clássica
  "ponta na fresta", é mudança de asset (rebaixar a barra), não de socket.

## R9 — lote fail-closed (31/10/2026)

O crítico R8 (`CRITICO-AK-INTEGRAL-R8.md`, P2) mostrou GREEN falso em lote vazio
ou parcialmente impossível. Contrato agora: `--armas` vazio (`--armas=`,
`--armas=,` ou valor ausente), duplicado ou com arma sem fonte fab#/gold# é
**exit 2 antes de medir**, nos DOIS entrypoints. Falha de setup/asset
(GLB ausente, montagem ou medição NaN) vai para lote próprio e termina
**exit 5 mesmo quando o mutante morde em outra arma** — mordida de cláusula
própria não é causalidade se o lote está incompleto. UNKNOWN (mutante vertical
em rwide, 844×390) continua LIMITAÇÃO documentada, distinta de arma não
carregada. Códigos: 0 ok · 1 falha geométrica/mutante sobreviveu · 2 lote/CLI
inválido · 3 crash · 4 âncora de mutação · 5 setup/asset. A saída final "tudo
na cruz" foi substituída pelos contratos efetivamente medidos (L2/L3 para
todas; L1/L1v só onde exigidos) — pistolas em foco continuam sem certificação
de mira alinhada.

## R10 — finitude antes do raster e classificação no wrapper (31/10/2026)

Crítico R9 (`CRITICO-AK-INTEGRAL-R9.md`): NaN no mount da AK pós-`update` caía em
"arma fora da faixa" (`falhas`) e a mordida L2 de outra arma resgatava o lote (exit 0
indevido). Agora o checker valida **antes de rasterizar/classificar**: elementos de
`M`/`view`/`camInv`, pontos alça/massa (que alimentam sockets e ângulos) e FOV por
aspecto — não-finito vira `falhasSetup` e o lote termina **exit 5 mesmo com mordida de
cláusula própria em outra arma**. Geometria finita fora do quadro continua "fora da
faixa" e UNKNOWN legítimo (vertical em rwide) continua limitação. O wrapper propaga a
classificação do checker **antes** das asserções de contagem: 2 (seleção/CLI inválida)
e 5 (setup/asset) chegam íntegros ao chamador em ambos os entrypoints, e `--mutante`
desconhecido no checker também é exit 2 (era throw/exit 1). Contraprova executada
(logs `GLM-AK-R10-*.log`): NaN e Infinity em `position`/`scale` do mount da AK e da
pistol, injetados por interceptação em memória do `update` real, terminam **exit 5**
no checker e no wrapper, com a mordida L2 presente no log e recusada como causalidade.
Baseline 12/12 e mutantes foco/lateral/vertical inalterados (mesmos números de R8/R9).

## R11 — projeção finita

Crítico R10 demonstrou socket no plano da câmera após update real: mount finito, projeção Infinity/NaN usada indevidamente como mordida L2. O checker exige também escala de projeção e quatro coordenadas de tela finitas, e recusa denominador z=0 antes do raster. É setup (exit5), mesmo sob mutante com outra arma reprovada. Crítico focal R11 sem achados acionáveis; Root repetiu baseline12/12 no consumidor real, mutante vertical (3 aspectos mordem, wide UNKNOWN explícito) e injeções NaN/z=0, ambas exit5.
