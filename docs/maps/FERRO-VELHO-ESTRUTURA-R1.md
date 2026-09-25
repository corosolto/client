# Ferro Velho — estrutura tática R1

## Resultado e limite desta lane

Esta lane transforma a lateral leste do Ferro Velho em uma rota alta jogável e
reforça a rota baixa com cobertura de sucata. O Beco Oeste, o galpão, o portão,
os quatro objetivos CTF e a identidade visual existente foram preservados.

- worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/ferro-velho-estrutura-r1`
- branch: `codex/ferro-velho-estrutura-r1`
- base: `origin/main@dffcf1f5815342e1ae26e5d79beeaf54b833a2df`
- draft PR: [corosolto/client#600](https://github.com/corosolto/client/pull/600)
- escopo alterado: `public/js/map_ferrovelho.js`, validadores próprios e scripts npm
- exclusões: nenhum material compartilhado, runtime compartilhado, asset externo,
  Mint, Astra, merge ou deploy

A aprovação final ainda depende de uma partida humana. Os gates abaixo provam
estrutura, orçamento e funcionamento no jogo real; eles não substituem a leitura
de ritmo, conforto de mira e valor das posições por uma pessoa.

## Fonte e extração do trabalho anterior

O catálogo do ROADMAP [PR #28](https://github.com/corosolto/roadmap/pull/28)
registrava aproximadamente 1,17 milhão de triângulos para o mapa, pedia manter o
Beco Oeste, as duas saídas, a oficina, os pickups e quatro objetivos, e apontava
falta de função e circulação na sucata. Esses pontos viraram contratos medidos.

O client [PR #565](https://github.com/corosolto/client/pull/565) foi inspecionado,
mas não foi empilhado: suas mudanças úteis dependem de UV e materiais globais em
`map_uv.js` e `textures.js`, fora do isolamento desta lane. Nenhum commit desse PR
foi reaproveitado.

## Receita de produção

### Passarela de Triagem

A nova rota leste tem um deck a 2,4 m, duas rampas contínuas, seis apoios e quatro
guarda-corpos horizontais. A geometria aberta preserva visão e tiro; a altura dos
waypoints acompanha a superfície real e o grafo rejeita ligações com degraus
maiores que 1,2 m. Assim, bots não tratam o deck como uma superfície plana nem
tentam saltar diretamente do chão para a passarela.

### Cobertura e decisões por spawn

A rota baixa leste recebeu barreira de concreto, pilha de pneus e carro quebrado,
todos vindos do acervo local e com colisão explícita. Cada spawn agora tem três
decisões verificáveis: Beco Oeste, miolo central ou lateral leste com subida. Os
spawns têm oito posições únicas por time para que 8x8 não empilhe jogadores.

Objetos pequenos que geravam falsos positivos de passagem foram corrigidos sem
alterar a leitura visual: carrinho de mão e cadeira ganharam colisores, e três
blocos de motor puramente decorativos ficaram abaixo da altura de degrau.

### Fauna e ambiência

O mapa declara e instancia rato, pomba, cachorro caramelo e barata usando apenas
GLBs locais já licenciados. Qualidade `low` conserva uma instância de cada espécie.
O contrato de som declara cidade e vento; o pack de áudio não faz parte do Git e
por isso o servidor estático local registra os 404 herdados descritos abaixo.

## Evidência estrutural

Comando:

```bash
PATH=/opt/homebrew/bin:$PATH npm run eval:ferro-estrutura
```

Resultado:

| Contrato | Evidência final |
| --- | --- |
| FVE1 identidade | 16 props locais; nenhum ausente |
| FVE2 Beco Oeste | duas saídas, três nós em cada corte |
| FVE3 decisões | oeste, centro e leste disponíveis para os dois times; leste chega a 2,4 m |
| FVE4 estrutura | 1 deck, 2 rampas, 4 guarda-corpos, 3 coberturas |
| FVE5 CTF | 4 objetivos; triângulo mínimo 6,84 m; pelo menos 2 rotas separadas entre todos os pares |
| FVE6 5x5/8x8 | 8 slots por time, 16 únicos; folga mínima 1,48 m; exposição E 29,3%, B 22,3% |
| FVE7 ambiência | 8 animais, 4 espécies e 2 loops declarados |

Os oito mutantes `sem-identidade`, `sem-passarela`, `rota-fechada`,
`beco-fechado`, `ctf-convergente`, `spawn-apertado`, `sem-cobertura-leste` e
`sem-ambiencia` foram mortos individualmente.

O gate geral do mapa terminou com MAP1 sem objetos dentro de colisores, MAP2B com
folga mínima de 1,5 m e área contígua mínima de 51,2 m², MAP5 com espaçamento
máximo de 6,97 m (baseline 9,24 m), CTF1 com triângulo mínimo de 6,84 m e CTF2
com no mínimo duas rotas separadas por par.

`fv-verify.mjs` confirmou navegação de todos os spawns aos quatro objetivos com e
sem Beco Oeste. `botsim.mjs 60 ferro_velho` terminou com 2,244% de tempo parado,
dispersão de rotas 0,64 e profundidade de roaming 0,218. O fechamento CTF ocorreu
em duas rodadas, com primeiro fechamento em 54,1 s e fim da partida em 154,6 s.

## WebGL real e orçamento

Comando:

```bash
PATH=/opt/homebrew/bin:$PATH npm run eval:ferro-browser -- --seconds=6
```

Chrome real, WebGL2 e renderer `ANGLE Metal Renderer: Apple M4 Pro`; nenhum
SwiftShader ou mock de renderer:

| Perfil | Bots no jogo | p95 | frames >100 ms | draw calls | triângulos |
| --- | ---: | ---: | ---: | ---: | ---: |
| 5x5, 1536×1024, `med` | 9 + jogador | 9,9 ms | 0 | 577 | 1.161.732 |
| 8x8, 1600×900, `low` | 15 + jogador | 9,8 ms | 0 | 185 | 439.395 |

Nos dois perfis o runtime expôs 294 nós, quatro objetivos, um deck, duas rampas,
três coberturas leste, quatro espécies e duas camadas de som. Os dez GLBs críticos
do mapa e da fauna responderam HTTP 200.

Evidência local ignorada pelo Git:

- `artifacts/ferro/browser/receipt.json`, SHA-256
  `87fcf3ea44675fd140d9557b6da22a05966c4b4d2c16089b7ec7a494b647ffa2`
- `artifacts/ferro/browser/contact-sheet.jpg`, SHA-256
  `5983bf84d8f659de57dec808c16ceb5976a50ef30fd4b78952389ed320d41ece`
- capturas individuais 3:2 e 16:9 no mesmo diretório

O contato 3:2 inclui spawn do portão, Beco Oeste, miolo, rota baixa leste, rampa,
passarela, spawn do galpão e overview. O overview alto cruza a névoa atmosférica;
as sete câmeras de jogo permanecem legíveis.

## Dívida herdada da main

O browser reproduziu na base `alpha.255` a exceção global
`SUPPORT_URL_BR is not defined`, URLs literais malformadas iniciadas por
`/%7B%60/` e decals ausentes em `/img/decals/`. O pack local de áudio também não
está versionado. O gate separa essas ocorrências por assinatura e falha para
qualquer erro de página ou HTTP próprio desta lane; ambos ficaram vazios.

O build Astro terminou verde com Node 23.6.0. O adapter informa que o deploy da
Vercel usará Node 24, que é a configuração suportada do projeto.

`npm run check:deploy` executou 40 gates; após o commit, 39 ficam verdes. `eval:redesign`
falhou somente em UIR15, reproduzido no commit-base acima sem qualquer mudança da
lane. `eval:docsautoria` e `docs:check` ficaram verdes depois que os blocos
gerados foram commitados; os dois novos comandos e a contagem de fonte estão
sincronizados.

## Como testar localmente

O servidor desta worktree está em:

<http://127.0.0.1:8166/?debug=1&auto=P,mst&map=ferro_velho&perfilauto=0&ctf=1>

Roteiro humano:

1. No spawn do portão, escolha Beco Oeste, miolo e rampa leste em três vidas.
2. Suba e desça pelas duas rampas sem pular; use o guarda-corpo como posição de tiro.
3. Percorra a rota baixa sob a passarela e confirme cobertura intercalada.
4. Capture os quatro objetivos e observe se nenhuma rota vira choke único.
5. Repita em 5x5 `med` e 8x8 `low`, conferindo spawn sem sobreposição e leitura da sucata.

## Veredito

Os gates técnicos, mutantes, build e WebGL real estão verdes. A lane está pronta
para PR em rascunho e feedback humano; merge continua fora deste escopo.
