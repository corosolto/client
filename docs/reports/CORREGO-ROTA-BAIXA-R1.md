# Córrego: rota baixa, travessia alta e combate vertical

Atualizado em 14/09/2026. Estado: `TECH_REVIEW`; falta o aceite visual/jogável do dono.

## Objetivo e definição de pronto

Esta lane reconstrói somente o valor útil do PR #467 e dos trabalhos posteriores do Córrego sobre a `main` atual. O resultado precisa manter a autoria e a identidade de córrego urbanizado brasileiro, tornar a calha baixa atravessável sob as pontes, fazer a quarta rampa chegar ao leito, oferecer cobertura e três escolhas de rota por spawn, preservar CTF/bots e caber nos orçamentos WebGL 5×5/8×8.

Pronto tecnicamente significa:

- quatro rampas contínuas entre a margem e `y=-1,75`, sem degrau acima de `0,55 m`;
- passagem no leito por baixo das três pontes;
- travessia alta e quatro sobrados acessíveis, com escadas, janelas e pranchas assentadas;
- três rotas por cada um dos oito spawns, nas cotas baixa, margem e alta;
- CTF e bots válidos em 5×5 e 8×8, com mutantes causais;
- Chrome/WebGL2 real em 3:2 e 16:9 e medição fresca de frame/calls/tris;
- nenhum arquivo compartilhado de runtime/material, asset novo, Mint ou Astra.

O modelo não pode promover o próprio resultado a `REAUTHORIZED`. A aprovação humana continua pendente.

## Checkout e linhagem

- Worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/corrego-rota-baixa-r1`
- Branch: `codex/corrego-rota-baixa-r1`
- Base de investigação: `3a372fdd0a0d4dc3d0a3e84f18713a4cf58f01f1` (`v2.0.0-alpha.254`)
- Base final após rebase limpo: `dffcf1f5815342e1ae26e5d79beeaf54b833a2df` (`v2.0.0-alpha.255`)
- Arquivo de produção alterado: `public/js/map_corrego.js`
- Draft PR: [corosolto/client#599](https://github.com/corosolto/client/pull/599), head técnico `8ee77df24b8fa226d03d5b6a47e593754545e88d` antes deste fechamento de ledger

O catálogo do ROADMAP #28 manda integrar a rota baixa antes de arte, manter Mint em `HOLD`, medir o custo histórico de aproximadamente 11,06 milhões de triângulos/quadro e separar revisão técnica de aceite humano.

Fontes preservadas:

| Fonte | Autor registrado | Valor extraído |
|---|---|---|
| mapa original `5cd454f405658aaebea9f3a7e120e59f43a5a0ce` | Ruben Marcus | identidade, layout, água, fauna e composição existentes |
| PR #467 head `f3091ef4de1fca8d7e51972d7cffe865a2cd0822`, implementação `81606fb3ffebac012ed07110890a85af8accb761` | rubenmarcus; docs regenerados pelo CSBrasil bot | chão multinível, passagem sob pontes e quarta rampa |
| `b0c4c61f376b7f293f460b6407e7d753afd354f9` | rubenmarcus | travessia alta por cima dos barracos |
| `388dc02be9c98b4cc2b6faf6fa26b79877f01cf2` | rubenmarcus | sobrados, escadas em U, janelas e lajes |
| `541907753dbf8861b127a9ec4dd6c1a97a724672` | rubenmarcus | pranchas, tampos e escoras com pé no chão |
| `72f058c8470f88937a44912f4bdd1142eb8ad13e` | rubenmarcus | régua de escadas, pranchas, janelas e vigas escoras |
| `1017a5951cf4ed32092049c68a770a8af12d239d` | rubenmarcus | nós verticais de bots e soleiras anti-bot |

Foram excluídos por não pertencerem à correção estrutural: mural ausente, balão, Demoiselle, loops de forró, varais GLB, fauna adicional, vegetação excessiva e palafitas/puxadinhos de adensamento. A lane não cria nem altera assets. O corte de distância da grama da `main` foi preservado.

## Implementação

- `groundHeightAt(x,z,yRef)` distingue o topo da ponte do leito. Um jogador já no canal recebe o fundo e continua sob o tablado.
- A quarta rampa usa `z=[26,32]`; ela vence os `1,75 m` completos em vez de terminar na faixa assoreada.
- A travessia em `z=-11` adiciona uma camada alta, com rampas inclinadas, pilares apoiados e passagem preservada embaixo.
- Quatro sobrados têm térreo, andar, escada em U, laje, 16 janelas declaradas e três pranchas de interligação.
- Vinte coberturas ficam no leito, quatro nas margens e quatro nas lajes. O eixo central do leito permanece livre.
- Cada spawn declara três escolhas independentes: `baixa`, `margem` e `alta`. As 48 pernas spawn→entrada→conflito têm caminho A*.
- A navegação vertical ganhou nós de porta, lances, patamar e laje. Carros e entulho que cortavam corredores foram reposicionados dentro do builder do mapa.
- Os quatro sobrados usam colisores físicos compactos; os vãos visuais continuam segmentados para janelas e tiro.

## Evidência estrutural e mutantes

Na `main` inicial, a régua do PR #467 reproduziu dois defeitos: a quarta rampa vencia apenas `0,88 m` e o fundo tinha degrau de `1,90 m` sob a ponte norte. Recibo: `artifacts/corrego-rota-baixa-r1/baseline-main-alpha254-rotas.log`, SHA-256 `8d7a2dd53ca585d95fcea960e43a10f5933d454b4a66f8a21920eb1dee6f3b0d`.

No candidato:

- 44.370 células alcançadas; quatro rampas com degrau máximo `0,073 m` e desnível `1,75 m`;
- 5/5 pontos do leito alcançados na profundidade e degrau máximo `0,00 m` sob pontes;
- travessia alta a `5,60 m`, degrau máximo `0,163 m`, passagem inferior a `-1,75 m`;
- quatro escadas com degrau máximo `0,17 m`, três pranchas assentadas, 16 janelas e 21 vigas sem pé suspenso;
- 48 pernas A*, separação mínima entre escolhas `4,50 m`; cobertura baixa/margem/alta `20/4/4`;
- `eval:mapcontrato`: 621 nós, 6.082 arestas e grafo conexo;
- `eval:spawn`: nenhum salto de spawn ≥ `0,25 m` no catálogo;
- `eval:corrego-contract`, `eval:corrego-water` e `eval:corrego-superficie` verdes.

Os 16 mutantes falham a cláusula correspondente: `rampa-plana`, `canal-tampado`, `canal-ilhado`, `ilha-solta`, `ponte-macica`, `ponte-sumida`, `passarela-sumida`, `passarela-tampa`, `travessia-sem-visual`, `travessia-visual-plana`, `escada-tampada`, `laje-ilhada`, `janela-cega`, `viga-no-ar`, `rota-colapsada` e `baixa-sem-cover`. O mutante de carga `times-fixos` também morde: 5×5 volta a 4×4 e falha o placar esperado.

## Bots, CTF e carga

`node tools/eval/corrego-load-check.mjs` simula 60 segundos em nove sementes:

| Cenário | Bots ativos | stuck | eficiência | spinRoam | laneSpread |
|---|---:|---:|---:|---:|---:|
| 5×5 | 9 | 3,167% | 0,242 | 0,070 | 0,64 |
| 8×8 | 15 | 3,333% | 0,238 | 0,054 | 0,64 |

Os tetos do gate são stuck `<8%`, eficiência `>0,1`, spinRoam `<0,3` e laneSpread `>=0,6`. O cenário usa CTF e valida o tamanho real dos dois times.

## Chrome/WebGL real

URL local, mantida ativa nesta worktree:

`http://127.0.0.1:8192/?debug=1&auto=P,mst&map=corrego&perfilauto=0&ctf=1`

| Cenário | GPU | p50 | p95 | máximo | Orçamento | Resultado |
|---|---|---:|---:|---:|---|---|
| 3:2, 1536×1024, 5×5 | Apple M4 Pro / ANGLE Metal / WebGL2 | 9,8 ms | 17,9 ms | 26,2 ms | p95 ≤20 ms; máx ≤50 ms | verde |
| 16:9, 1600×900, 8×8 | Apple M4 Pro / ANGLE Metal / WebGL2 | 23,4 ms | 34,7 ms | 49,6 ms | p95 ≤35 ms; máx ≤50 ms | verde |

Recibos:

- `artifacts/corrego-rota-baixa-r1/runtime-approved-3x2-5x5/capture.json`, SHA-256 `413478c7193ef3db600ff6342eacf3fed6c9d8c477f845b6c7a13a7ea917db6f`;
- `artifacts/corrego-rota-baixa-r1/runtime-approved-16x9-8x8/capture.json`, SHA-256 `1331a76f53fae5d1507f753f616b7d389e9bf5d30463cc5c8fb2e8d25b1443f4`.

As seis câmeras cobrem spawn, leito sob ponte, quarta rampa, travessia alta, sobrados/janelas e visão geral. O agente inspecionou as imagens; isto não substitui o aceite do dono.

Na comparação fresca, com as mesmas câmeras 3:2, o candidato reduz triângulos entre `0,6%` e `6,0%` (spawn `12.691.083→12.070.345`; leito `10.317.123→9.695.063`; overview `11.054.225→10.626.927`). As calls sobem entre `3,1%` e `5,2%` pela camada vertical; os dois orçamentos de frame seguem verdes. Não há novo asset para mascarar esse custo.

As capturas registram 28 respostas 404 de decals globais tanto no baseline quanto no candidato. São herdadas, idênticas no A/B e fora do builder do Córrego; `errors=0` e `absentAssets=0` nos dois cenários.

## Gates gerais e limitações

- `npm run build`: verde em Node 23; Vercel informa que produção usará Node 24.
- `npm run check:deploy`: 37/40 verdes. As falhas são herdadas e fora da lane: `eval:redesign` em UIR15, `docs:check` por blocos derivados já desatualizados na `main`, e `eval:docsautoria` como consequência do mesmo drift documental.
- Não foi executado `npm run docs`, pois ele alteraria documentos gerados compartilhados fora desta lane de mapa.
- Nenhum merge, deploy ou force-push foi feito.

## Como testar e critério humano

1. Abra a URL local em 3:2 e selecione 5 bots por lado. Desça pelas quatro rampas, atravesse sob as três pontes e confirme que nenhuma borda prende o corpo.
2. Repita em 16:9 com 8 bots por lado. Observe travadas, bots parados no canal, patamar ou laje e a leitura das coberturas.
3. Suba a travessia de `z=-11`, entre nos quatro sobrados, use as escadas, atravesse as três pranchas e teste tiro pelas janelas.
4. Jogue CTF pelos dois lados e confirme que baixa, margem e alta são escolhas úteis a partir de cada spawn.
5. Só após esse teste registrar `REAUTHORIZED`, pedir correção causal ou rejeitar a promoção.

Comandos reproduzíveis:

```sh
node tools/eval/corrego-rotas-check.mjs
node tools/eval/corrego-tatico-check.mjs
npm run eval:corrego-contract
npm run eval:corrego-water
npm run eval:corrego-superficie
npm run eval:mapcontrato
npm run eval:spawn
PATH=/opt/homebrew/bin:$PATH node tools/eval/corrego-load-check.mjs
PATH=/opt/homebrew/bin:$PATH ASPECT=3:2 BOTS=5 BASE=http://127.0.0.1:8192 node tools/eval/corrego-visual-capture.mjs artifacts/corrego-rota-baixa-r1/runtime-approved-3x2-5x5
PATH=/opt/homebrew/bin:$PATH ASPECT=16:9 BOTS=8 BASE=http://127.0.0.1:8192 node tools/eval/corrego-visual-capture.mjs artifacts/corrego-rota-baixa-r1/runtime-approved-16x9-8x8
npm run build
npm run check:deploy
```

## Próximo passo

O draft PR #599 está aberto e mergeável contra `main`. O próximo passo é obter teste humano pela URL local e promover somente após feedback explícito. Se o usuário aprovar, tratar separadamente os 404 globais e o drift de documentos em lanes próprias; não ampliar este PR.
