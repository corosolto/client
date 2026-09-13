# Posto da Treta — loja jogável, bombas e três decisões por spawn

Atualizado em 13/09/2026. Esta é uma entrega **draft para revisão humana**, construída
na worktree `posto-tatico-r3`, branch `codex/posto-tatico-r3`, sobre
`origin/main@3a372fdd0` (`v2.0.0-alpha.254`). Não houve merge, deploy, force-push nem
gasto novo no Mint.

## Objetivo e definição de pronto

O mapa deixa de ser um pátio quase todo aberto: a loja tem interior, caixa, gôndolas,
duas entradas e loot; as três ilhas de bombas ficam sob cobertura metálica; muretas,
jardineiras, pneus, veículos e a ilha de ar/água criam proteção e recortes de visada.
Cada um dos quatro spawns de cada time alcança três decisões distintas — `loja`,
`bombas` e `rodovia` — em 5x5 e 8x8. CTF, bots e o contrato de mapa precisam continuar
funcionando.

“Pronto” nesta lane significa: sete cláusulas causais verdes com oito mutantes mortos,
5x5 e 8x8 exercitados com bots de produção, capturas WebGL reais em 3:2 e 16:9, assets
locais rastreáveis e revisão jogável pelo dono. Os gates técnicos específicos desta
lane estão verdes; a
aprovação visual, a mixagem audível e o equilíbrio competitivo continuam humanos.

## Catálogo, autoria e PRs anteriores

- [ROADMAP #28](https://github.com/corosolto/ROADMAP/pull/28) define um builder por
  mapa, assets locais com proveniência, nenhum gasto automático e promoção somente
  depois dos gates estruturais e da revisão humana. Esta lane segue esse contrato.
- O Posto original veio do commit `206bb9c12` / PR #250, de Emerson Garrido, com
  coautoria preservada no histórico. Esta entrega modifica o mapa existente; não
  reatribui sua criação.
- [client PR #562](https://github.com/corosolto/client/pull/562), aberta e limpa no
  inventário, mistura Posto e Atacadão, altera `map_uv.js` compartilhado e parte de
  `codex/mapas-stack-542-v2`. Ela foi tratada como fonte de investigação, sem
  cherry-pick, porque competiria com a lane do Atacadão e com materiais compartilhados.
- O trabalho reaproveitado entrou pelos commits `04584104d` (composição),
  `10a157cae` (assets/proveniência) e `902e5134b` (régua), preservando seus trailers
  `Agent: Claude Code`. A rota/carga/captura e o batching local estão nos commits
  `a2f86fa07` e `47b625d4a`, com `Agent: Codex`.

## Assets aceitos e rejeitados

Foram usados somente dois modelos que já existiam localmente no kit
`posto_obras_r3`, sem nova geração:

| Asset | Tamanho / geometria | SHA256 | Proveniência |
| --- | --- | --- | --- |
| `bombas_combustivel.glb` | 410.412 bytes / 5.081 tris | `788bdaa8f22b37cbfad9e73561e1f248470430fc7adf25b360409ec5790a27e3` | Mint `assetId ks7bh1nbqc6pas5384dpbw68k98d6ft7`, pack `th74q1agb8zfn1hnfbqmmrhd998d6fj6`, registro `bombas-combustivel-posto` |
| `loja_conveniencia.glb` | 323.684 bytes / 4.369 tris | `2a471a5a5ceee2e27c117ecffe58b8c0a7bf5a0255db282001424353a6883826` | Mint `assetId ks7cs6vm1q8shyaqwztk8qt3cn8d7hz9`, mesmo pack, registro `loja-conveniencia-posto` |

Os registros completos ficam em `mint-assets.json` e
`public/models/props/FONTE.md`, inclusive `chatUrl`, `packAssetId`, transformação e
hash final.

O GLB local `posto_ipiranga.glb`, 509 KB, 4.273 tris e 3 draw calls, **foi
rejeitado**. Ele veio do Fab e seu próprio `FONTE.md` registra “Licença: PENDENTE”; o
arquivo cru não prova a licença da conta que o baixou. Ele não entra no diff nem é
necessário para reproduzir o candidato.

## Receita de produção

1. Manter a loja procedural andável entre dois corpos `loja_conveniencia`, com duas
   aberturas independentes, quatro gôndolas colidíveis, caixa/frigoríficos encostados
   na parede, seis nós internos e dois pickups.
2. Implantar três `bombas_combustivel` com a colisão declarada no mapa. A cobertura
   não colide; somente seus seis pilares colidem, permitindo tiro e circulação sob a
   telha.
3. Distribuir proteção baixa e de olho separadamente. A composição final mede 68
   colisores de peito, 14 muretas, 4 jardineiras e 71 sólidos na banda do olho.
4. Declarar as decisões `loja`, `bombas` e `rodovia` em bandas laterais distintas
   para E e B. O gate resolve caminhos reais a partir de todos os oito spawns.
5. Instanciar apenas caixas decorativas opacas, sem nome e sem colisão, agrupadas por
   pai/material/sombra. Colisores, occluders, transparências e objetos nomeados não
   entram no lote.
6. Preservar a identidade brasileira por sinalização, preços absurdos de combustível,
   veículos, manifestação, favela ao redor, vegetação e fauna. Os loops `bomba-ligada`
   e `radio-loja` usam somente os parâmetros espaciais já entendidos pelo runtime.

## Evidência causal e de jogabilidade

Execute diretamente; o catálogo compartilhado de scripts permaneceu intacto:

```sh
node tools/eval/posto-check.mjs
node tools/eval/posto-load-check.mjs
```

Resultado final da régua:

- POSTO1: 3 ilhas, molde central presente e colisor 2,60 × 1,20 × 2,22 m.
- POSTO2: 4 gôndolas com colisor, 2 aberturas, 6 nós, rota de 15 passos e 2 pickups.
- POSTO3: telha a y=5,61 sobre as 3 ilhas, sem colisão; 6/6 pilares colidem.
- POSTO4: 30,8% de 7.365 pares de nós a mais de 20 m com linha livre, abaixo do teto
  medido de 33%; eram 41,2% no estado anterior.
- POSTO5: 68 colisores de peito, 14 muretas e 4 jardineiras.
- POSTO6: bomba em `(4,0)`, raio 9; rádio dentro da loja em `(-21,0)`, raio 11.
- POSTO7: loja/bombas/rodovia alcançáveis a partir dos 4 spawns E e 4 spawns B. Os
  caminhos medem respectivamente 8–14, 8–9 e 10–12 nós.

Cada invariante morre isoladamente:

| Mutante | Falha |
| --- | --- |
| `bomba-caixa` | POSTO1 |
| `loja-macica` | POSTO2 |
| `sem-cobertura` | POSTO3 |
| `patio-aberto` | POSTO4 |
| `patio-limpo` | POSTO5 |
| `radio-fora` | POSTO6 |
| `rota-fechada` | POSTO7 |
| `times-fixos` | rejeita placar 4x4 no ensaio 5x5/8x8 |

Na simulação de 60 s × 9 seeds com `Game` e bots de produção:

| Carga | Bots | stuck | eficiência | spinRoam | laneSpread |
| --- | ---: | ---: | ---: | ---: | ---: |
| 5x5 | 9 | 3,744% | 0,202 | 0,057 | 0,64 |
| 8x8 | 15 | 1,844% | 0,157 | 0,047 | 0,64 |

`syntax`, `eval:mapcontrato`, `eval:spawn`, `eval:ctfround`, `eval:ctfwin` e
`arch:check` passaram; o Posto tem 275 nós, 1.338 arestas e grafo conexo.

## Evidência WebGL e limite de performance

As capturas finais foram feitas no runtime real em WebGL2/ANGLE Metal, Apple M4 Pro,
sem page errors, com os dois GLBs retornando HTTP 200:

| Janela / carga | p95 / máximo | Draw calls nas 5 câmeras | Triângulos |
| --- | --- | --- | --- |
| 1536×1024, 3:2, 5x5 | 17,0 / 18,3 ms | 1.246–1.886 | 1,34–2,35 M |
| 1600×900, 16:9, 8x8 | 17,0 / 18,1 ms | 1.255–1.896 | 1,38–2,29 M |

O batching reduziu o candidato 3:2 de 1.328–2.170 para 1.246–1.886 draw calls
(6,2% no mínimo e 12,6% no máximo). A base, cuja fonte é igual na alpha.252 e na
alpha.254 (`SHA256 1fcc...a304`), media p95 10 ms e 1.031–1.779 calls. Portanto o
candidato fica perto de 60 FPS nesta máquina, mas ainda custa mais que a
base e não prova desempenho em GPUs fracas. O hash da fonte candidata capturada é
`f9ebe0a8a8e0343c34c40a0aeeefc87d5e1009b4d1bbe04f47afbb069bcfa74c`.

As cinco câmeras foram inspecionadas em ambos os aspectos: spawn E, loja/caixa,
bombas/cobertura, rota da rodovia e overview. Loja e entradas ficam legíveis; bombas,
treliças e cobertura têm apoio; a rota lateral e as proteções quebram o pátio sem
fechar o horizonte. Isso torna o candidato revisável, não visualmente aprovado.

Evidência local ignorada pelo Git:

- `artifacts/posto-tatico-r3/runtime-final-3x2/`
- `artifacts/posto-tatico-r3/runtime-final-16x9/`
- `artifacts/posto-tatico-r3/final-mutants/`

## Como testar localmente

Com o servidor desta worktree ativo, abra:

`http://127.0.0.1:8188/?debug=1&auto=P,mst&map=posto_treta&perfilauto=0&ctf=1`

Faça duas rodadas, uma 5x5 e outra 8x8. Em cada time, teste:

1. acesso à loja pelas duas entradas, uso do caixa/gôndolas como proteção e saída
   pelos flancos;
2. disputa das bombas sob a cobertura, circulação entre os seis pilares e tiro por
   baixo da telha;
3. flanco pela rodovia e retorno ao meio sem salto/trava;
4. as três bandeiras CTF, respawn, navegação dos bots e proteção oferecida por
   muretas/jardineiras em pé e agachado;
5. se a identidade, a densidade e a leitura de inimigos continuam boas em 3:2 e
   16:9.

## Pendências explícitas

- Falta aprovação humana de composição, rotas, CTF e equilíbrio 5x5/8x8.
- O pacote privado de áudio não está materializado nesta máquina; a régua prova o
  contrato espacial, mas ninguém ouviu nem aprovou a mixagem final nesta lane.
- O pacote local de decals está incompleto: 196 arquivos faltam e 18 URLs retornaram
  404 durante as capturas. O mapa renderizou e os dois GLBs próprios retornaram 200,
  mas os decals ausentes precisam ser materializados antes do gate integral de assets.
- `docs:check` detecta que os novos utilitários ainda não estão refletidos nos blocos
  gerados. Esta lane não regenerou os 13 documentos compartilhados para não competir
  com as outras frentes; integrar esse catálogo é uma etapa de promoção.
- Não houve merge nem deploy. A promoção só pode ocorrer depois destas pendências e
  da revisão humana.
