# Quebrada e Campinho R3

## Objetivo e definição de pronto

Reconstruir o trabalho aproveitável do draft #577 sobre a `main` vigente, sem
carregar a história conflitante da branch antiga. A entrega fica pronta quando a
geometria do Campinho, o restante da Quebrada, CTF e bots passam em 5x5 e 8x8;
os contratos rejeitam mutações; duas proporções são vistas em Chrome WebGL real;
e o draft substituto oferece uma URL local reproduzível.

Worktree: `worktrees/quebrada-campinho-r3`  
Branch: `codex/quebrada-campinho-r3`  
Base: `origin/main@dffcf1f5815342e1ae26e5d79beeaf54b833a2df`

Draft substituto: `https://github.com/corosolto/client/pull/602`.

## Extração seletiva

O draft #577 estava `DIRTY/CONFLICTING` e partia da alpha.246. Seus quatro
commits foram usados apenas como fonte. Entraram as muretas dos dois portões,
onze coberturas laterais, dois encostos, placar sem colisão, três nós de
contorno, reposicionamento de uma pilha junto ao muro e a varredura contínua de
segmento com raio do jogador. Nenhum commit antigo foi transplantado.

O diff autoral do mapa toca `public/js/map_quebrada.js`; o layout de grafites
gerado também foi reassado porque a geometria mudou. Não há alteração em
`game.js`, áudio, materiais compartilhados, modelos ou registries. O cache-bust
continua derivado do conteúdo pelo manifesto recursivo existente.

## Régua antes e depois

Antes da geometria, `npm run eval:campinho-integration` reprovou com zero
`gate-cover`, zero `sideline-cover` e zero `sideline-backrest`. Depois, o mesmo
comando passou os quatro cenários e mediu cobertura sólida, grafo global,
arsenal, spawns, CTF e todas as rotas spawn-bandeira.

O contrato possui mutantes para cobertura invisível, cobertura que não segura
bala, spawn obstruído, alvo CTF curto, rota partida, grafo ilhado, arsenal
incompleto, placar ausente e composição incorreta em 5x5/8x8. Todos foram
rejeitados individualmente.

## Evidência estrutural e de jogo

`node tools/eval/map-check.mjs quebrada` passou com MAP1 em zero, pior folga de
spawn de 2,1 m, pior área contígua de 42,9 m², nenhum oclusor sem malha, pior
espaçamento de cobertura de 4,28 m e no mínimo duas rotas separadas para cada
par spawn-bandeira. A saída do comando é a fonte reproduzível destes números;
o JSON gerado foi restaurado para não reduzir o inventário versionado aos dados
de apenas um mapa.

`npm run eval:mapcontrato -- --map=quebrada` observou o grafo Node conectado.
No navegador, onde os GLBs reais participam da construção, as duas matrizes
observaram 365 nós e 2.354 arestas, todos conectados, quatro bandeiras e doze
pickups. `CTF_MAPA=quebrada node tools/eval/ctf-round-check.mjs` encerrou rodadas
por objetivo e a partida pela rede de segurança.

O botsim determinístico foi rodado por 60 s e nove sementes em cada cenário:

| Cenário | Bots no mundo | Stuck | Dispersão de rotas |
| --- | ---: | ---: | ---: |
| 5x5 mata-mata | 9 | 1,744% | 0,640 |
| 5x5 CTF | 9 | 3,800% | 0,640 |
| 8x8 mata-mata | 15 | 1,356% | 0,640 |
| 8x8 CTF | 15 | 2,000% | 0,640 |

Comando reproduzível: `SIM_TEAM_SIZE=<5|8> SIM_CTF=<0|1> node
tools/eval/botsim.mjs 60 quebrada`.

## Grafites após a geometria

O `check:fast` detectou corretamente a impressão digital antiga do layout.
`BASE=http://127.0.0.1:8175 npm run grafite -- quebrada` reassou apenas a fatia
da Quebrada: 960 para 889 peças. As contagens de Praça dos Poderes, Piscina,
Loja, Ferro Velho, Córrego e Escadão permaneceram idênticas.

`npm run eval:grafitelayout` passou com 2.877 peças e entradas frescas. O censo
no Chrome real passou com 68,8% de cobertura, 1.065 de 1.548 placas cobertas,
925 peças visíveis, quatro murais e 96 arquivos. Assim, as 71 peças removidas
eram colocações que perderam uma parede válida, não decoração escolhida à mão.

## WebGL real e revisão visual

`npm run eval:campinho-browser -- --base=http://127.0.0.1:8175 --seconds=10`
abriu dois processos frescos do Google Chrome, WebGL2/Metal na Apple M4 Pro.

| Cenário | p50 | p95 | máximo | >100 ms | Draw calls máx. | Triângulos máx. |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 5x5, 1536×1024, médio | 8,8 ms | 17,2 ms | 26,5 ms | 0 | 1.794 | 1.433.241 |
| 8x8, 1600×900, baixo | 8,3 ms | 9,8 ms | 10,4 ms | 0 | 866 | 1.023.072 |

O recibo está em `artifacts/campinho-r3/browser/receipt.json` (SHA-256
`c36251cb9ee079df5211cf2ccfcd1966b454a8e98688b3544e2b608677d6e7d6`). As
capturas cobrem Vila, Baile, comércio, viela oeste, dois portões, as duas
laterais do Campinho, o respawn e a visão aérea. A inspeção mostrou coberturas
alternadas sem fechar o eixo central, os portões transitáveis, o placar legível
no fundo e o restante da Quebrada preservado.

Montagens locais:

- `artifacts/campinho-r3/review/contact-5x5-final.jpg` (SHA-256
  `3475ef175607fff2e79f4d719e85b05f3ddb2fff4e15a52b69ca55bab8b6b3d5`)
- `artifacts/campinho-r3/review/contact-8x8-final.jpg` (SHA-256
  `8bb2ab0687db25060d2692e369587cbdc3a0a975c13e8fa5ef9971f8d45e5598`)

## Dívida herdada e limite da aprovação

O Chrome repetiu `SUPPORT_URL_BR is not defined` e as requisições conhecidas
de decalque/URL malformada da alpha.255. O gate separa essas assinaturas exatas
e reprova qualquer erro de página ou HTTP novo. Esta lane não muda os sistemas
globais que originam essas falhas.

O `check:deploy` fechou 39/40. A única falha foi `eval:redesign`, cláusula
UIR15. O mesmo comando e a mesma cláusula reprovam numa exportação limpa de
`origin/main@dffcf1f58`; nenhum arquivo de UI ou resultado faz parte deste diff.
Todos os demais gates, incluindo sintaxe, cache por conteúdo, shaders, docs,
assets, Vercel, mídia, comentários e autoria, passaram.

O `check:fast` fechou 142/146. As quatro falhas são dívidas fora desta lane:
`eval:redesign` acima; `eval:mapid`, que rejeita `fy_mansao` no relatório João
R2; `eval:amazonia`, que não encontra as fixtures locais da galinha e do
pintinho; e `audio:check`, que vê o acervo privado ausente e o manifesto
divergente. As três últimas foram reproduzidas numa exportação limpa da mesma
`main`; nenhum arquivo causal participa deste PR.

A inspeção visual desta produção confirma que as vistas servidas são
revisáveis; a aprovação humana final continua pertencendo ao dono.

## Como testar

Servidor mantido em `http://127.0.0.1:8175`.

- CTF: `http://127.0.0.1:8175/?debug=1&auto=P,mst&map=quebrada&perfilauto=0&ctf=1`
- Mata-mata: `http://127.0.0.1:8175/?debug=1&auto=P,mst&map=quebrada&perfilauto=0`

Próximo passo: revisão humana nos dois links, com atenção aos dois portões,
à passagem pelas laterais e à pressão do Campinho em 8x8. Não houve merge,
deploy ou force-push.

## Revalidação sobre a alpha.262 — 22/09/2026

A branch recebeu `origin/main@60ad7501323ef076263f645bfca341e2454fce6b`
(`v2.0.0-alpha.262`) pelo merge normal
`e49e63b238888bc14b3b2ac70a4bbc9b0384f964`, sem rebase ou force-push. Os
conflitos eram somente blocos documentais gerados; a resolução tomou a base
atual, preservou os gates do Campinho e regenerou a documentação.

Nenhuma correção de geometria foi necessária. O replay na base nova permaneceu
verde:

- `eval:campinho-integration`: 5x5/8x8 em DM e CTF, 15 coberturas sólidas,
  grafo Node 344/2.042 conectado, 12 armas, spawns 4×4 livres, 4 bandeiras e
  32 rotas spawn-bandeira;
- os dez mutantes `cobertura-invisivel`, `cobertura-sem-bala`,
  `spawn-obstruido`, `ctf-curto`, `rota-partida`, `grafo-ilhado`,
  `arsenal-incompleto`, `campinho-sem-placar`, `time-5x5` e `time-8x8`
  foram rejeitados individualmente;
- `map-check`: MAP1 zero, MAP2 exposição E 11,2%/70 m e B 0,7%/28,2 m,
  MAP2B 2,1 m/42,9 m², MAP4 zero, MAP5 4,28 m e CTF2 com no mínimo duas
  rotas separadas;
- `eval:mapcontrato`: 344 nós, 2.042 arestas, rota válida e conectado;
- `ctf-round-check`: quatro bandeiras, objetivo fecha a rodada e a rede de
  segurança encerra a partida.

Bots determinísticos, 60 s por célula:

| Célula | stuck | spinRoam | eficiência | laneSpread |
|---|---:|---:|---:|---:|
| 5x5 DM | 2,878% | 0,084 | 0,206 | 0,640 |
| 5x5 CTF | 3,011% | 0,099 | 0,219 | 0,640 |
| 8x8 DM | 1,978% | 0,091 | 0,184 | 0,640 |
| 8x8 CTF | 1,778% | 0,090 | 0,219 | 0,640 |

### WebGL real e performance

O harness foi ampliado para entrar pelos modos DM e CTF e cobrir a matriz
5x5/8x8 em 3:2 média e 16:9 baixa. As oito células carregaram WebGL2/Metal, 365
nós e 2.354 arestas conectados, 12 armas, spawns 4×4 e os quinze objetos de
cobertura. As células CTF expuseram quatro bandeiras; DM não criou pontos CTF.
Nenhuma célula teve erro de página, HTTP novo ou frame acima de 100 ms.

| Célula | p95 | Calls | Triângulos |
|---|---:|---:|---:|
| 5x5 DM · 3:2 média | 16,9 ms | 1.656 | 1.705.438 |
| 5x5 CTF · 3:2 média | 16,8 ms | 1.664 | 1.708.058 |
| 8x8 DM · 3:2 média | 17,1 ms | 1.713 | 1.857.300 |
| 8x8 CTF · 3:2 média | 17,2 ms | 1.719 | 1.859.918 |
| 5x5 DM · 16:9 baixa | 9,0 ms | 819 | 962.924 |
| 5x5 CTF · 16:9 baixa | 9,1 ms | 823 | 963.211 |
| 8x8 DM · 16:9 baixa | 9,0 ms | 860 | 1.019.927 |
| 8x8 CTF · 16:9 baixa | 9,1 ms | 856 | 1.022.205 |

A régua oficial `CENA1..CENA4`, com população padrão e 30 s de aquecimento,
passou com 1.950/2.060 calls, 1.223.227/1.810.000 triângulos, 83,9 FPS e sem
laço de exceção. O stress 8x8 em qualidade média ficou 47–50 mil triângulos
acima do teto oficial de população padrão, embora tenha mantido p95 ≤17,2 ms e
zero frame longo; isso é dívida mensurada para playtest, não teto alterado. Em
qualidade baixa o mesmo 8x8 ficou em aproximadamente 1,02 M de triângulos.

Evidência ignorada pelo Git: `artifacts/campinho-r3/alpha262-final-r2/`.
`receipt.json` tem SHA-256
`593cc4ee0de2983a5cfa539c0ca5a9a0dfca95396fa4f45e8b00ba0767853f37`;
registra `map_quebrada.js` com
`09e36545e5f581fc0f8804a7414b176dd052ad73682c8dc4ab6210c963d0c862`
e `graffiti_layout.js` com
`0626a914e594e6706ec26d52fcb0a06b6d4601296082ca0aae8224de6506ef3e`.
Os contact sheets 3:2 e 16:9 têm SHA-256
`e6c3cca510d1fbf74d17cfa9c94cd92a86fe15e8abbeffeeab0320b2ac74a9e4`
e `4f2b043f22b527d09a8040d0355a563d4f7115d57761431d1e2bf30cde34c374`.

O preview estático ainda encontra 65 decals ausentes e cinco endpoints que não
existem no servidor de arquivos; são respostas herdadas e explicitamente
separadas pelo harness. A alpha.262 não repetiu o antigo pageerror de
`SUPPORT_URL_BR`, e nenhum erro/HTTP próprio desta lane foi aceito pelo filtro.

### Limite técnico, visual e de licença

O estado é tecnicamente apto a playtest e continua sem aceite visual/jogável
humano. A inspeção dos contact sheets encontrou:

- forte assimetria de exposição entre os spawns (E 11,2%/70 m contra B 0,7%/
  28,2 m), que exige duelo dos dois lados;
- Campinho ainda amplo e plano apesar das rotas laterais e coberturas verdes;
- paredões de tijolo/concreto repetitivos, placar escuro simples e o paredão de
  caixas de som dominando a leitura de uma entrada;
- no overview, a borda retangular do mapa fica evidente; esta câmera não é uma
  vista de jogo, mas confirma que falta acabamento de horizonte/perímetro.

O diff não adiciona GLB, textura, áudio ou decal. Portanto não há licença nova a
aprovar: a candidata preserva os assets registrados da Quebrada e só acrescenta
geometria procedural no arquivo do mapa. Qualquer passada Astra+Mint futura deve
entrar em branch artística separada, com manifest, fonte, licença e comparação
antes/depois, sem substituir cobertura ou colisão sem replay dos mutantes.

Servidor atual: `http://127.0.0.1:8175`.

- DM: `http://127.0.0.1:8175/?debug=1&auto=P,mst&map=quebrada&perfilauto=0`
- CTF: `http://127.0.0.1:8175/?debug=1&auto=P,mst&map=quebrada&perfilauto=0&ctf=1`

Playtest mínimo: 5x5 DM pelos dois portões e laterais; 8x8 CTF atravessando os
quatro objetivos; repetir dos dois spawns para julgar a assimetria; conferir se
caixas de som, pneus, muretas e bancos criam cobertura sem fechar visão; comparar
qualidade média e baixa antes de promover o draft.
