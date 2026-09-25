# Córrego: rota baixa, travessia alta e custo de vegetação

Atualizado em 22/09/2026. Estado: `TECH_REVIEW`; o candidato continua dependente de aceite visual e jogável humano.

## Objetivo e definição de pronto

Esta lane preserva a identidade de córrego urbanizado brasileiro e valida a rota baixa, a camada vertical, os sobrados e o CTF contra a `main` `v2.0.0-alpha.262`. Também fecha causalmente a dívida de triângulos observada no mapa sem trocar arte, alterar runtime/material compartilhado nem gerar assets.

Pronto tecnicamente significa:

- quatro rampas contínuas até o leito, passagem sob as três pontes e travessia alta utilizável;
- sobrados com escadas, lajes, janelas, pranchas e apoios assentados;
- três escolhas de rota por spawn e grafo conexo em DM e CTF;
- bots 5×5 e 8×8 abaixo dos tetos em ambos os modos;
- Chrome/WebGL2 real em 3:2 e 16:9 com orçamento de frame, calls e triângulos;
- redução causal do custo de vegetação, com contraprova e mutante;
- procedência dos GLBs identificável e nenhum asset novo nesta lane.

O agente não pode promover o próprio resultado a `REAUTHORIZED`. O draft deve continuar sem automerge até o playtest do dono.

## Checkout, PR e sincronização

- Worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/corrego-rota-baixa-r1`
- Branch: `codex/corrego-rota-baixa-r1`
- Draft PR: [corosolto/client#599](https://github.com/corosolto/client/pull/599)
- Base integrada: `60ad7501323ef076263f645bfca341e2454fce6b` (`v2.0.0-alpha.262`)
- Merge normal de `origin/main`, sem rebase/force-push: `76fbf63fdec09762c41af81b73c8cc55c00b5547`
- Correção de custo e instrumentos: `328b25fa9833fc6b9d87318cb3888349c498948d`
- Arquivo de produção alterado: `public/js/map_corrego.js`
- Instrumentos da lane: `tools/eval/corrego-load-check.mjs` e `tools/eval/corrego-visual-capture.mjs`

Fontes estruturais preservadas:

| Fonte | Autor registrado | Valor extraído |
|---|---|---|
| mapa original `5cd454f405658aaebea9f3a7e120e59f43a5a0ce` | Ruben Marcus | identidade, layout, água, fauna e composição |
| PR #467 / `81606fb3ffebac012ed07110890a85af8accb761` | rubenmarcus | chão multinível, passagem sob pontes e quarta rampa |
| `b0c4c61f376b7f293f460b6407e7d753afd354f9` | rubenmarcus | travessia alta |
| `388dc02be9c98b4cc2b6faf6fa26b79877f01cf2` | rubenmarcus | sobrados, escadas, janelas e lajes |
| `541907753dbf8861b127a9ec4dd6c1a97a724672` | rubenmarcus | pranchas, tampos e escoras |
| `1017a5951cf4ed32092049c68a770a8af12d239d` | rubenmarcus | nós verticais e soleiras anti-bot |

## Implementação preservada

- `groundHeightAt(x,z,yRef)` distingue o topo da ponte do leito e permite continuar sob o tablado.
- A quarta rampa em `z=[26,32]` vence os `1,75 m` completos.
- A travessia em `z=-11` cria a camada alta e preserva passagem inferior.
- Quatro sobrados mantêm térreo, andar, escada em U, laje, 16 janelas e três pranchas.
- Vinte coberturas ficam no leito, quatro nas margens e quatro nas lajes, sem fechar o eixo central.
- Cada spawn declara rotas `baixa`, `margem` e `alta`; as 48 pernas spawn→entrada→conflito têm caminho A*.

## Diagnóstico causal e correção de triângulos

O perfil WebGL por malha mostrou que o custo não vinha das casas, água ou camada vertical. Na grade antiga de `1,25 m`, os dois GLBs de grama difusa somavam `5.919.828` de `6.503.553` triângulos estáticos (`91,0%`). O mesmo mapa com espaçamento `2,0 m` no perfil médio e `2,4 m` no baixo caiu para `1.756.374` triângulos de grama e `2.340.099` triângulos estáticos, redução total de `64,0%`.

A mudança é map-local. Os 26 pontos autorais, taboas/taiobas e vegetação ribeirinha continuam iguais; apenas a repetição subpixel do chão difuso foi reduzida. Um teste intermediário de `1,85 m` não melhorou MAP5, portanto foi rejeitado em favor de `2,0 m`, que reduz mais custo sem perder a leitura visual.

Contraprovas ignoradas pelo Git:

- antes: `artifacts/corrego-rota-baixa-r1/alpha262-triangle-ab/before.json`, SHA-256 `161e170f5da3f571fc337ce0d9a09884f6cd2dfcac3e5e0423381f0cf477efb3`;
- depois: `artifacts/corrego-rota-baixa-r1/alpha262-triangle-ab/after.json`, SHA-256 `68539e9a75e11b924d502986ba683be3ed430922e786418025561045859db555`.

Na régua CENA servida pela própria worktree (`BASE=http://127.0.0.1:8192`), a cena caiu de aproximadamente `7,21 M` para `3.496.785` triângulos, com `497/610` calls e `136,1 fps`. O mutante `--mutante=estoura` desliga batching/culling em memória e reprova, provando que o teto morde. Uma execução sem `BASE` mediu outro servidor já ativo em `localhost:4321`; ela foi descartada por não provar o hash desta worktree.

## Estrutura, contratos e mutantes

No candidato final:

- 44.370 células alcançadas; quatro rampas com degrau máximo `0,073 m` e desnível `1,75 m`;
- 5/5 pontos do leito alcançados na profundidade; maior degrau sob pontes `0,00 m`;
- travessia alta a `5,60 m`, degrau máximo `0,163 m`, passagem inferior a `-1,75 m`;
- quatro escadas com degrau máximo `0,17 m`, três pranchas, 16 janelas e 21 vigas apoiadas;
- 48 pernas A*, separação mínima `4,50 m`; coberturas baixa/margem/alta `20/4/4`;
- `eval:mapcontrato`: 621 nós, 6.082 arestas e grafo conexo;
- `eval:spawn`: 276 colocações no catálogo e nenhum salto ≥`0,25 m`;
- `eval:corrego-contract`, `eval:corrego-water`, `eval:corrego-superficie` e `eval:ctfround`: verdes.

Os 20 mutantes cobrados falham a cláusula correspondente: `rampa-plana`, `canal-tampado`, `canal-ilhado`, `ilha-solta`, `ponte-macica`, `ponte-sumida`, `passarela-sumida`, `passarela-tampa`, `travessia-sem-visual`, `travessia-visual-plana`, `escada-tampada`, `laje-ilhada`, `janela-cega`, `viga-no-ar`, `rota-colapsada`, `baixa-sem-cover`, `tudo-chapado`, `jacare-de-caixa`, `fauna-picada` e `times-fixos`.

## Bots em DM e CTF

`corrego-load-check.mjs` executa 60 segundos, nove sementes e o mesmo código de produção:

| Modo | Times | Bots ativos | stuck | eficiência | spinRoam | laneSpread |
|---|---:|---:|---:|---:|---:|---:|
| DM | 5×5 | 9 | 6,911% | 0,269 | 0,072 | 0,64 |
| DM | 8×8 | 15 | 6,011% | 0,242 | 0,059 | 0,64 |
| CTF | 5×5 | 9 | 3,044% | 0,236 | 0,061 | 0,64 |
| CTF | 8×8 | 15 | 3,333% | 0,238 | 0,054 | 0,64 |

Tetos: stuck `<8%`, eficiência `>0,1`, spinRoam `<0,3`, laneSpread `≥0,6`. O mutante `times-fixos` troca o placar esperado e reprova.

## Matriz Chrome/WebGL2 real

Todos os recibos usam `public/js/map_corrego.js` SHA-256 `16b05d83ff57f9085f1ecdd7b1f409bc859a1668cd4019be81c3410493c29473`, igual ao arquivo servido. A matriz percorre o menu real, seleciona DM ou CTF e confirma os dois times completos.

| Modo | Tela | Times | p95 | máximo | calls máx | tris máx | Resultado |
|---|---|---:|---:|---:|---:|---:|---|
| DM | 3:2 | 5×5 | 16,8 ms | 25,0 ms | 786 | 5.078.891 | verde |
| DM | 3:2 | 8×8 | 33,7 ms | 49,6 ms | 815 | 5.078.935 | verde |
| DM | 16:9 | 5×5 | 8,9 ms | 9,3 ms | 556 | 2.410.538 | verde |
| DM | 16:9 | 8×8 | 16,7 ms | 25,0 ms | 576 | 2.415.152 | verde |
| CTF | 3:2 | 5×5 | 17,3 ms | 25,6 ms | 811 | 5.091.499 | verde |
| CTF | 3:2 | 8×8 | 33,1 ms | 41,7 ms | 830 | 5.091.519 | verde |
| CTF | 16:9 | 5×5 | 9,0 ms | 9,3 ms | 568 | 2.418.608 | verde |
| CTF | 16:9 | 8×8 | 16,7 ms | 25,0 ms | 589 | 2.414.076 | verde |

Orçamentos: p95 `≤20 ms` em 5×5 e `≤35 ms` em 8×8; máximo `≤50 ms`; calls `≤850`; triângulos `≤6 M` no médio e `≤3 M` no baixo. Todas as células usam Chrome, ANGLE Metal e WebGL2, com `errors=0` e `absentAssets=0`.

Duas primeiras medições 3:2 ficaram vermelhas durante execução concorrente (DM 5×5 p95 `24,3 ms`; CTF 8×8 p95 `58,0 ms`). Cada célula foi repetida em Chrome novo, sem alterar código ou orçamento, e os recibos finais acima ficaram verdes. A ocorrência permanece registrada porque performance real não deve ser transformada em aprovação silenciosa.

Recibos e SHA-256:

- DM 3:2 5×5: `alpha262-final-dm-3x2-5x5/capture.json`, `6ab1c62ee545596de77d6aaab238df7df86a684dbc949dbac31c35d187b79a74`;
- DM 3:2 8×8: `alpha262-final-dm-3x2-8x8/capture.json`, `2671fa0f1e2b67b1d4575a430ba341d0266a2e4df4cdd12c4a1d807a34699ce5`;
- DM 16:9 5×5: `alpha262-final-dm-16x9-5x5/capture.json`, `3849ee5ee6b5b2ac1d5bbc8a3dd32f06446ef3a2ece091b45a00347862dd0c3b`;
- DM 16:9 8×8: `alpha262-final-dm-16x9-8x8/capture.json`, `1975d78a267faa120cfeb532a735ed48628b805727b1695644626b67c44b7187`;
- CTF 3:2 5×5: `alpha262-final-ctf-3x2-5x5/capture.json`, `1d619959818e62826848db176acb947bcfe875bad5df670705daeba531ab6bb7`;
- CTF 3:2 8×8: `alpha262-final-ctf-3x2-8x8/capture.json`, `eac9af918aa328a3d8c972fb1b10b32e5796e9e4854db3ffa9e3eac21d5545ee`;
- CTF 16:9 5×5: `alpha262-final-ctf-16x9-5x5/capture.json`, `3c338f7ad923fea0cff2d8d7eabf7b4b700c85ad485085f0a7ff65315af010c4`;
- CTF 16:9 8×8: `alpha262-final-ctf-16x9-8x8/capture.json`, `c86351fb8c1e6b7bdf5dd907cfc4c88a950cf55f23db5bad5e66752498920641`.

Contact sheets inspecionadas:

- CTF 3:2 8×8: `artifacts/corrego-rota-baixa-r1/alpha262-final-ctf-3x2-8x8/contact-sheet.jpg`, SHA-256 `41a6324d93d8e548b64ca07aeb6f1e909e9dca50435a3162cf7b7f5b95ea2264`;
- DM 16:9 8×8: `artifacts/corrego-rota-baixa-r1/alpha262-final-dm-16x9-8x8/contact-sheet.jpg`, SHA-256 `64bd85c70e363ca5d3cb6068d4128d754810ffd54b3c0d1dfb47e06809daf754`.

As imagens mostram grama ainda legível, rotas baixas e altas abertas e a camada vertical preservada. A tomada sob a estrutura continua escura e deve ser julgada no playtest, não por esta régua.

Cada célula registra as mesmas 28 respostas 404 de decals globais. Elas já existiam fora do builder, não são assets do Córrego e não variam com a correção; `errors=0` e `absentAssets=0` separam essa dívida herdada do resultado da lane.

## MAP5 e procedência

`map-check` permanece com MAP1 sem submersão, MAP2 exposição E/B `21,0%/16,0%`, MAP2B folga `2,35 m` e área `40,5 m²`, MAP4 sem occluder invisível, CTF1/CTF2 verdes. MAP5 mede espaçamento máximo `6,62 m`, mas razão de props `0,31×` ante referência textual `0,35×`. O processo sai verde e o valor não mudou entre espaçamentos `1,25`, `1,85` e `2,0 m`; a métrica não conta a grama difusa que foi otimizada. A dívida de densidade visual fica explícita para avaliação humana, sem adicionar arte para maquiar o número.

Nenhum asset foi criado ou alterado. Os seis GLBs usados têm hashes atuais iguais aos registros históricos do commit `48c8b7a8e`:

| Asset | SHA-256 | Mint chat |
|---|---|---|
| `grama_corrego_01.glb` | `061a6302c0c6380cd11dbd436f7526a0053af5500d1e905d2a0e0f6dafe8354c` | `ph71dz35n7h5sygreq303bjye58crhzj` |
| `grama_corrego_02.glb` | `cd24a8276e0e6e5339398a5d86b1cfa77b5d552e0ec7086eee6eed904cee550f` | `ph78r1m1pa8zyrhsvw0nwz4b1x8crrg2` |
| `planta_corrego_taboa.glb` | `2adc0485a0abba8dd37c0cfac12e0b9e9ad20ce357ceb4a22e658ed4d8e580a6` | `ph72y6pxj76ky56x90cwrc1h7h8cs718` |
| `planta_corrego_taioba.glb` | `2028681d3244aec692bd498b77681111268e3f7b7a87279a336c7a0082c699d7` | `ph7bt423mvd2mkq60j8xws2an58csnn4` |
| `jacare_corrego.glb` | `4b77865d7dfd47a24a08d49fd59566000b1dc5ca03a84a8e5dc397bfc3fe674b` | `ph71907xmzehws02vnam630e6n8cpypj` |
| `capivara_corrego.glb` | `d3ab0c0a22bd5e8072e75ec0ce43ccfeefcd0a2eff1160c0375b9dfc48baf227` | `ph74kf2engyr4skt5kxkwxxrgd8cqmqt` |

O `mint-assets.json` atual não contém mais esses seis registros, embora `public/models/ambient/FONTE.md` ainda aponte para o registro. O commit histórico e os hashes dão rastreabilidade, mas a restauração do catálogo é uma dívida de procedência compartilhada e deve ocorrer em lane própria. Esta lane não toca o registro global.

## Gates gerais e limites

- `npm run build`: verde em Node 23; Vercel informa runtime Node 24.
- Documentação e arquitetura são regeneradas antes do push e validadas por `docs:check`/`arch:check`.
- `check:deploy`: 39/40 verdes. A única falha é UIR15 em `eval:redesign` (`resultado usa exclusivamente arte estática do personagem atual`), herdada da `main`; o diff desta branch não toca `game.js`, DOM/CSS ou o instrumento de redesign. `eval:comentario` e `eval:docsautoria`, que falharam durante o trabalho intermediário, ficaram verdes no replay final.
- Nenhum merge, deploy, ready, automerge, force-push, asset privado ou geração Mint/Astra foi feito.

## URL e playtest humano mínimo

URL local, servindo o mesmo hash do recibo:

`http://127.0.0.1:8192/?debug=1&map=corrego&perfilauto=0`

1. Em DM 8×8, desça pelas quatro rampas e atravesse sob as três pontes; procure bordas que prendem corpo ou bot.
2. Suba a travessia de `z=-11`, entre nos quatro sobrados, use escadas/pranchas e teste tiro pelas janelas.
3. Em CTF 8×8, jogue pelos dois lados e confirme que baixa, margem e alta são escolhas úteis, sem rota dominante.
4. Compare a leitura da grama em 3:2 médio e 16:9 baixo; confirme que o terreno ainda parece tomado, sem repetição excessiva.
5. Julgue a tomada escura sob a estrutura e a dívida MAP5 `0,31×`. Só o dono pode registrar `REAUTHORIZED`, pedir ajuste causal ou rejeitar a promoção.

## Comandos reproduzíveis

```sh
node tools/eval/corrego-rotas-check.mjs
node tools/eval/corrego-tatico-check.mjs
npm run eval:corrego-contract
npm run eval:corrego-water
npm run eval:corrego-superficie
npm run eval:mapcontrato -- --mapa=corrego
npm run eval:spawn
PATH=/opt/homebrew/bin:$PATH node tools/eval/corrego-load-check.mjs
PATH=/opt/homebrew/bin:$PATH BASE=http://127.0.0.1:8192 npm run eval:cena -- --mapa=corrego
MODE=dm ASPECT=3:2 BOTS=8 BASE=http://127.0.0.1:8192 /opt/homebrew/bin/node tools/eval/corrego-visual-capture.mjs artifacts/corrego-rota-baixa-r1/alpha262-final-dm-3x2-8x8
npm run build
npm run docs:check
npm run arch:check
npm run check:deploy
```

## Próximo passo

Manter o PR #599 em draft e sem automerge. O próximo passo é o playtest humano acima. Se aprovado, a promoção é uma ação separada; a restauração do catálogo Mint e os decals globais permanecem lanes compartilhadas independentes.
