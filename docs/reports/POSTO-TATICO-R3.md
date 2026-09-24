# Posto da Treta — loja jogável, bombas e três decisões por spawn

Atualizado em 22/09/2026. Esta é uma entrega **draft para revisão humana**, construída
na worktree `posto-tatico-r3`, branch `codex/posto-tatico-r3`, sobre
`origin/main@60ad75013` (`v2.0.0-alpha.262`), integrada por merge normal no commit
`73992ba06`. Não houve rebase, merge do PR, deploy, force-push nem
gasto novo no Mint.

## Objetivo e definição de pronto

O mapa deixa de ser um pátio quase todo aberto: a loja tem interior, caixa, gôndolas,
duas entradas e loot; as três ilhas de bombas ficam sob cobertura metálica; muretas,
jardineiras, pneus, veículos e a ilha de ar/água criam proteção e recortes de visada.
Cada um dos quatro spawns de cada time alcança três decisões distintas — `loja`,
`bombas` e `rodovia` — em 5x5 e 8x8. CTF, bots e o contrato de mapa precisam continuar
funcionando.

“Pronto” nesta lane significa: sete cláusulas causais verdes com nove mutantes mortos,
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

Foram preservados somente dois modelos públicos que já existiam no kit
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
3. Distribuir proteção baixa e de olho separadamente. A composição final mede 62
   colisores de peito, 14 muretas e 4 jardineiras; as seis meias-rotas têm
   11/11/17/16/11/11 sólidos que cortam a linha de tiro na altura do olho.
   As seis pilhas de pneus que comprimiam os corredores foram removidas do candidato.
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
- POSTO4: 32,9% dos pares de nós a mais de 20 m têm linha livre, abaixo do teto
  medido de 33%; as seis meias-rotas têm 11/11/17/16/11/11 sólidos de olho, acima
  do mínimo espacial de 10 por banda.
- POSTO5: 62 colisores de peito, 14 muretas e 4 jardineiras.
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
| `?postoPneusCorredor=1` | recoloca seis sólidos nos corredores e eleva stuck 5x5 DM a 5,133% |

Na simulação de 60 s × 9 seeds com `Game` e bots de produção, o teto de stuck
é 4,5%, isto é, a pior célula da alpha.262 (4,067%) mais 10% de folga:

| Carga | Modo | Candidato stuck / eficiência | alpha.262 stuck / eficiência | spinRoam | laneSpread |
| --- | --- | ---: | ---: | ---: | ---: |
| 5x5 | DM | 3,978% / 0,176 | 4,067% / 0,212 | 0,036 | 0,64 |
| 5x5 | CTF | 3,078% / 0,209 | 2,933% / 0,219 | 0,051 | 0,64 |
| 8x8 | DM | 3,078% / 0,184 | 2,067% / 0,173 | 0,052 | 0,64 |
| 8x8 | CTF | 2,389% / 0,195 | 1,389% / 0,162 | 0,044 | 0,64 |

O candidato melhora 5x5 DM e a eficiência das duas células 8x8, mas aumenta stuck
nas outras três células em relação à alpha.262; não se esconde essa dívida causal.
Todas ficam abaixo do teto. A contraprova que recoloca somente os seis pneus nos
corredores sobe o stuck 5x5 DM de 3,978% para 5,133% (+1,155 p.p.) e fica vermelha.
Inflar a margem de navegação para 0,4/0,6/0,8 foi rejeitado: em 5x5 DM produziu
5,500%/4,067%/5,256% de stuck, sem melhora global consistente.

`syntax`, `eval:mapcontrato`, `eval:spawn`, `eval:ctfround`, `eval:ctfwin` e
`arch:check` passaram; o Posto tem 279 nós, 1.414 arestas e grafo conexo.

## Evidência WebGL e limite de performance

As capturas finais foram feitas no runtime real em WebGL2/ANGLE Metal, Apple M4 Pro,
sem page errors, com os dois GLBs retornando HTTP 200:

| Janela / carga | p95 / máximo | Draw calls nas 5 câmeras | Triângulos |
| --- | --- | --- | --- |
| 1536×1024, 3:2, 5x5 CTF | 17,5 / 25,0 ms | 1.230–1.870 | 1,327–2,313 M |
| 1600×900, 16:9, 8x8 CTF | 17,1 / 18,0 ms | 1.250–1.894 | 1,356–2,293 M |

O batching reduziu o candidato 3:2 de 1.328–2.170 para 1.246–1.886 draw calls
(6,2% no mínimo e 12,6% no máximo). A base, cuja fonte é igual na alpha.252 e na
alpha.254 (`SHA256 1fcc...a304`), media p95 10 ms e 1.031–1.779 calls. Portanto o
candidato fica perto de 60 FPS nesta máquina, mas ainda custa mais que a
base e não prova desempenho em GPUs fracas. O hash da fonte candidata capturada e
servida é `e899f45d3ceb8956f8e940b557b43b601d1011aca934152cc8b52c5193404fba`.
Os contact sheets 3:2 e 16:9 têm respectivamente SHA256 `04392c8d...` e
`fc27a622...`.

As cinco câmeras foram inspecionadas em ambos os aspectos: spawn E, loja/caixa,
bombas/cobertura, rota da rodovia e overview. Loja e entradas ficam legíveis; bombas,
treliças e cobertura têm apoio; a rota lateral e as proteções quebram o pátio sem
fechar o horizonte. Isso torna o candidato revisável, não visualmente aprovado.

Evidência local ignorada pelo Git:

- `artifacts/posto-tatico-r3/alpha262-final-3x2/`
- `artifacts/posto-tatico-r3/alpha262-final-16x9/`

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
- O pacote local de decals está incompleto: 18 URLs herdadas retornaram 404 durante
  as capturas. O mapa renderizou, os dois GLBs próprios retornaram 200 e não houve
  page error; a dívida de decals continua explícita para o gate integral de assets.
- O `select-inflate` final termina com 12/53 seleções vermelhas, dentro do teto
  declarado e melhor que os 14/53 do PR antigo. O `SUPPORT_URL_BR is not defined`
  vinha do servidor de avaliação, não do runtime: o harness agora resolve as variáveis
  `define:vars`, `map-preview.css` e `ops.js` como o Astro faz. A dívida restante é
  herdada da main e não foi contada como correção do mapa.
- O `check:deploy` da alpha.262 mantém `UIR15` vermelho em `eval:redesign`. O diff
  desta lane não toca `game.js`, `style.css`, `index.astro` nem a régua de redesign;
  portanto essa falha global é herdada e não foi corrigida por uma alteração ampla
  fora do escopo map-local. Os outros 39 gates agregados passam depois da regeneração
  dos sete blocos de documentação que passaram a contar o novo script de bots.
- Não houve merge nem deploy. A promoção só pode ocorrer depois destas pendências e
  da revisão humana.
