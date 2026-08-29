---
id: criar-mapa-com-ia
title: Criar mapa usando IA
sidebar_label: Criar mapa usando IA
sidebar_position: 7
description: Fluxo prático para pedir, implementar, integrar e validar um mapa criado com assistência de IA no CORO SOLTO.
---

# Criar mapa usando IA

IA acelera modelagem procedural, texturas, integração e testes, mas não decide sozinha se
o mapa é jogável. Neste projeto, um mapa só está pronto quando o jogo real abre, os dois
times conseguem navegar, obstáculos têm colisão, armas são alcançáveis e uma captura foi
olhada por uma pessoa.

Este guia complementa a página **Como colaborar**. A página de
colaboração documenta o formato e as réguas vigentes; aqui o foco é **como conduzir um
agente de IA sem deixar contrato, gameplay ou documentação para trás**.

## Antes de pedir código

Comece com uma ficha curta. Quanto mais concreta ela for, menos o agente preencherá lacunas
com decisões genéricas.

| Decisão | O que informar |
|---|---|
| Identidade | id em `snake_case`, nome exibido, tema e categoria do menu |
| Modo | se abre em rounds ou CTF; `ctfMode` define apenas o padrão |
| Espaço | limites aproximados, interior/exterior e níveis de altura |
| Rotas | rota principal, dois flancos e pontos de reencontro |
| Cobertura | objetos baixos, paredes, edifícios e linhas de tiro que devem ser quebradas |
| Spawns | lados dos times, proteção inicial e direção em que olham |
| Objetivos | posições e nomes das bandeiras quando houver CTF |
| Arsenal | quantidade e distribuição; nunca reduza armas existentes para “limpar” a cena |
| Arte | materiais, clima, referências visuais e elementos proibidos |

Não peça apenas “faça um mapa bonito”. Diga qual decisão o jogador toma nos primeiros
segundos, onde acontece combate curto e onde uma arma de longo alcance pode dominar. A IA
precisa de uma intenção de gameplay, não só de uma lista de objetos.

## Prompt reutilizável

Copie, preencha os colchetes e envie ao agente a partir da raiz do repositório:

```text
Crie a branch map/[id]. Leia AGENTS.md, docs/LICOES.md e tools/eval/ARCH.md antes de editar.

Crie o mapa [nome], id [id], com tema [tema]. Ele deve abrir em [rounds/CTF], ter limites
aproximados de [x × z], três rotas jogáveis ([descreva]) e estes marcos visuais: [lista].
Spawns: [descrição]. Coberturas e obstáculos: [lista]. Arsenal: [distribuição].

Direção visual: [materiais, clima, paleta e referências]. Não use pessoa real, gore,
marca/obra protegida, CDN ou dependência de runtime. Prefira texturas procedurais ou assets
com licença compatível e procedência registrada.

Antes de implementar, escreva uma régua específica que reprove sem o mapa e declare a
mutação que prova que ela morde. Depois implemente sem duplicar sistemas existentes.

Integre o mapa em public/js/maps.js, public/js/main.js, src/data/jogo.ts e gere
public/img/map-previews/[id].jpg sem HUD, personagens ou armas visíveis.

Valide contrato, colisões, spawns, waypoints, pickups, bots, preview, console, check:fast e
build. Gere uma captura, olhe a imagem e descreva o que foi realmente verificado.
Não faça commit até eu pedir.
```

Adapte o prompt em vez de acrescentar correções contraditórias no fim. Se o conceito mudou,
reescreva a ficha e diga explicitamente o que substitui a decisão anterior.

## Fluxo recomendado

### 1. Leia as regras e proteja o trabalho atual

Antes de trocar de branch, rode `git status -sb`. Não leve mudanças de outro mapa para a
branch nova. Leia `AGENTS.md`, as lições 1–5 de `docs/LICOES.md` e a frente **MAPAS / MUNDO**
em `tools/eval/ARCH.md`.

Mapas vivem em `public/`, que usa módulos ES servidos diretamente. Não adicione bundler,
CDN ou dependência de runtime.

### 2. Faça a régua nascer vermelha

Crie `tools/eval/<id>-check.mjs` com invariantes próprias do mapa. Exemplos:

- marcos obrigatórios existem e têm nomes estáveis;
- cada obstáculo visível possui um colisor coerente;
- os dois times alcançam o centro e os objetivos;
- rampas, escadas ou passagens são atravessáveis pelo movimento real;
- materiais visíveis possuem textura e UV válido;
- o preview esconde HUD, personagens e armas.

Rode a régua antes da implementação e registre a falha. Para cada cláusula, crie um
`--mutante=<nome>` que remova ou corrompa exatamente a propriedade medida. Uma régua que
continua verde com o mutante não protege o mapa.

### 3. Implemente o contrato do mapa

Crie `public/js/map_<id>.js` exportando uma função `build*`. Use um mapa registrado de
tamanho parecido como referência; não copie um arquivo inteiro para depois renomear.

O objeto devolvido pelo builder precisa respeitar o contrato consumido pelo jogo:

```text
root · colliders · occluders · spawns · bounds
waypoints { nodes, adj } · nearestWaypoint · findPath
```

Campos como `groundHeightAt`, `slowAt`, `pickups`, `ctfPoints`, `sun` e `hemi` entram
conforme o mapa precisa. Antes de registrá-lo, confira o contrato:

```bash
node tools/eval/map-contrato-check.mjs --extra=public/js/map_<id>.js
```

Use colisores simples separados da malha visual. Neste projeto eles são AABBs; uma parede
rotacionada pode parecer correta e ainda permitir que o jogador deslize pelo canto. Teste a
travessia pelo movimento real, não apenas contando objetos no array `colliders`.

### 4. Integre todas as superfícies públicas

Um arquivo em `public/js/` não aparece sozinho no jogo. Atualize no mesmo PR:

| Arquivo | Responsabilidade |
|---|---|
| `public/js/maps.js` | import, nome exibido, builder e `ctfMode` quando aplicável |
| `public/js/main.js` | descrição (`MAP_DESC`) e categoria (`MAP_CAT`) do seletor |
| `src/data/jogo.ts` | entrada de `MAPAS` usada pelas páginas públicas e metadados |
| `public/img/map-previews/<id>.jpg` | cartaz quadrado, nomeado exatamente como o id |

Não edite contagens geradas em README ou documentação. Rode `npm run docs` depois do
registro para que `tools/gen-docs.mjs` atualize os blocos derivados do código.

### 5. Gere e confira o preview

Com o servidor em execução, capture vários ângulos:

```bash
npm run dev
node tools/eval/g2ui-map-previews.mjs <id> -1.2,-0.6,0,0.6,1.2
```

As imagens de calibração ficam em `/tmp/gauntlet/g2ui-maps/`. Escolha uma que explique o
layout e grave o JPG versionado:

```bash
node tools/eval/g2ui-map-previews.mjs --write <id>=/tmp/gauntlet/g2ui-maps/<arquivo>.png
```

Olhe o JPG final. Confirme textura, enquadramento, leitura das rotas e ausência de HUD,
personagens, viewmodel e armas. O script detectar zero erros de console não prova que a
imagem ficou boa.

### 6. Valide gameplay e integração

Depois de registrar o mapa, rode:

```bash
npm run eval:mapcontrato
node tools/eval/map-check.mjs <id>
node tools/eval/pickup-check.mjs
node tools/eval/botsim.mjs 60 <id>
npm run eval:mapid
npm run docs
npm run arch
npm run check:fast
npm run build
```

Abra também `http://localhost:4321/?debug=1&auto=P,mst&map=<id>` e exercite pelo menos:

1. nascimento dos dois times;
2. rota principal e os dois flancos;
3. colisão dos obstáculos e acesso a desníveis;
4. coleta de armas;
5. uma luta com bots;
6. objetivos de CTF, quando existirem;
7. console sem `pageerror` ou erro de recurso do mapa.

Se a geometria de paredes mudou em um mapa que usa grafite assado, rode também
`npm run grafite`; `eval:grafitelayout` reprova quando o layout fica velho.

## Como revisar a resposta da IA

Faça uma segunda leitura como adversário, sem reutilizar a justificativa do agente:

- remova um colisor e confirme que a régua reprova;
- parta uma ligação do grafo e confirme que os bots perdem a rota;
- retire o preview e confirme que `eval:mapid` detecta o cartaz ausente;
- reorganize waypoints e confirme que caminhos usam índices, não coordenadas por acaso;
- caminhe contra cada obstáculo importante;
- procure pontos abertos demais, gargalos sem saída e linhas de sniper entre spawns;
- confira a captura em 3:2, proporção usada na revisão visual do projeto.

Peça correção quando o jogo contradizer o relatório, mesmo com o portão verde. A regra da
casa é simples: se uma pessoa encontra o defeito e a régua não encontra, falta uma
invariante — não uma explicação melhor.

## Definition of done

O mapa criado com IA está pronto para PR quando:

- possui identidade visual própria sem material protegido ou pessoa real;
- aparece no seletor, na categoria correta e nas páginas públicas;
- tem preview revisado visualmente;
- spawns, rotas, colisões, pickups e objetivos funcionam no jogo real;
- bots navegam sem ficar presos;
- a régua específica passa e seus mutantes reprovam;
- `check:fast` e `build` passam;
- o PR marca risco alto e pede revisão humana de gameplay.

IA pode produzir o primeiro rascunho em minutos. O que transforma esse rascunho em mapa do
jogo é a combinação de contrato explícito, mutação, captura olhada e teste jogável.
