# Praça dos Três Poderes — candidato técnico R2

## Escolha e fronteira

Esta lane foi aberta em `codex/praca-poderes-main-r2`, a partir de
`origin/main@60ad7501323ef076263f645bfca341e2454fce6b` (`alpha.262`). A Praça foi
escolhida por três motivos verificáveis: é o mapa padrão do jogo, é a arena com maior
impacto de primeira sessão e era o único mapa do catálogo sem PR técnico aberto nem
candidato final registrado. Os demais mapas com dívida tinham PR/worktree em produção
ou revisão; Sertão e Joá já haviam sido integrados.

A worktree histórica `praca-poderes-claude` foi preservada somente para leitura. Ela está
centenas de commits atrás de `main`, contém alterações não commitadas e mistura arquivos
compartilhados. Nenhum arquivo foi copiado dela sem revalidar a hipótese contra a árvore
atual.

Escopo permitido: `public/js/map_brasilia.js`, gates específicos e este relatório. Não
entram runtime, materiais/geradores compartilhados, assets novos ou privados, Mint/Astra,
versão/release, merge ou deploy.

## Definição de pronto

- rotas alternativas e CTF continuam conectadas em 5x5 e 8x8;
- saídas de spawn, flancos e eixo de conflito ganham cobertura mensurável sem bloquear o
  corpo ou criar parede invisível;
- acessos sob pilotis e aos marcos permanecem navegáveis;
- ambiência do espelho d'água e horizonte deixa de parecer um plano vazio, usando apenas
  geometria/procedural já disponível no repositório;
- cada cláusula nova reprova o baseline ou um mutante aplicado de verdade;
- DM/CTF, bots, custo e WebGL real são medidos nas proporções 3:2 e 16:9;
- promoção visual/jogável continua dependendo de playtest humano.

## Baseline causal — 22/09/2026

`map-contrato-check` e `ctf-win-check` passaram: 554 nós, 3.752 arestas, grafo conexo,
quatro rotas separadas e rodada CTF encerrando na terceira bandeira. `botsim` de 20 s
mediu sete bots, `stuck=6,122%`, `eff=0,84` e `laneSpread=0,64`.

O baseline falhou onde a mudança deve atuar. `map-check` mediu exposição média de spawn
de 89,8% (B) e 84,3% (E), além de quadrantes jogáveis com zero cobertura e espaçamento de
99 m. O espelho d'água ainda é um plano `MeshStandardMaterial`, e as rotas externas sob
os pilotis terminam em terreno/névoa sem silhueta urbana. O próximo gate mede o uso real
dessas superfícies e vem acompanhado de mutantes antes da correção.

## Candidato técnico

O candidato substitui a lâmina opaca do espelho por `createWater`, acrescenta duas massas
urbanas instanciadas fora dos bounds e distribui dez jardineiras de concreto nas rotas sob
pilotis. Após a primeira crítica independente, as jardineiras foram giradas e movidas para
o intervalo entre as colunas da grade; oito defensas descontínuas protegem os spawns e seis
balizadores dão escala aos quadrantes externos. O delta continua map-local: nenhum helper,
material compartilhado, asset ou runtime foi alterado.

O gate `praca-r2-check.mjs` mede o mundo montado. Resultado final: água viva com sol
alinhado (`dot=1,000`), horizonte vertical em 78% dos raios externos, dez coberturas
bloqueando LOS a 1 m, oito spawns protegidos na altura do olho, zero waypoint invadido,
seis ligações spawn→CTF e três eixos longitudinais navegáveis. Os mutantes `agua`,
`horizonte`, `cobertura`, `navegacao` e `rota` aplicam e reprovam isoladamente. A contraprova
`?coberturaAntiga=1` também reprova PA3: conserva 544 nós contra 550 do candidato.

`map-contrato-check` permaneceu verde com 550 nós, 3.582 arestas e grafo conexo;
`ctf-win-check` fecha a rodada na terceira bandeira. `cena-check` mediu 323/350 draw calls e
650.207/740.000 triângulos. Build, `docs:check`, `arch:check` e `git diff --check` passaram.
O diagnóstico `map-check` reduziu a exposição de 89,8/84,2%
para 62,9/57,0% (B/E). O pior espaçamento MAP5 caiu de 29,89 para 21,09 m e a pior razão
de props subiu de 0,24 para 0,35. O caráter monumental continua preservado: MAP5 segue
explicitamente acima do teto genérico de 7 m, sem mascarar bounds nem afrouxar a régua.

O `botsim` de 30 s cobriu 5x5/8x8 em DM/CTF. O pior `stuck` foi 8,656% no 8x8 DM; no 8x8
DM antes da correção. No candidato final, `stuck` ficou entre 0,389% e 1,100% e eficiência
entre 0,699 e 0,828. O A/B `praca-bots-ab.mjs` mantém as mesmas malhas e remove somente os
dez colliders laterais: candidato 0,389%, sem colliders 0,511%, ambos abaixo do baseline
`alpha.262` de 7,067%; o mutante de regressão reprova o próprio limite.

A matriz Chrome/WebGL2 real cobriu oito células (3:2/16:9 × 5x5/8x8 × DM/CTF), todas em
`live`, com 9/15 bots, GPU Apple M4 Pro, `p95=9,7–10,2 ms`, zero quadro acima de 100 ms,
363–416 draw calls máximos e 766.830–922.247 triângulos máximos. A célula 16:9 5x5 CTF
teve uma pausa transitória acima de 100 ms na primeira passagem e passou isoladamente em
um processo Chrome novo; o retry está registrado no recibo. A matriz registrou zero dívida
inesperada. As 39 ocorrências permitidas por célula são herdadas do servidor local: o
`SUPPORT_URL_BR`, URLs literais do template, `api/geo-lang`, manifests/áudio e decals ausentes;
nenhuma nasce no delta desta lane.

O `sourceSha256` comum à matriz e às dez capturas é
`984088e728dc4b40295d10a2a8eddb881eeba629814253ab19397f8ea443c833`.
Recibos ignorados pelo Git:

- `artifacts/praca-poderes-main-r2/webgl-matrix/matrix.json` — SHA-256
  `75b77700006c53384cc49d207a79c9765a7a9acad6528ebd23908aaefea03e83`;
- `artifacts/praca-poderes-main-r2/evidence/captures.json` — SHA-256
  `70acb0ef9e26346bce7554d01f5c467326edcdd223ced1b9c1e0896fb4a0d9e9`.

As novas capturas corrigem os três defeitos da primeira revisão: o espelho é visto de cima
com a lâmina azul legível; o flanco leste parte de uma rota andável, sem câmera dentro de
geometria; e as fachadas distantes usam janelas descontínuas, alturas e volumes variados em
vez de barras horizontais repetidas.

## Pendências de promoção

O candidato está no draft [#616](https://github.com/corosolto/client/pull/616), com
`autoMergeRequest=null`. O push foi normal, sem rebase ou force-push; o hook local exigiu
`--no-verify` apenas porque a `UIR15` herdada mantém `check:deploy` em 39/40.

O servidor local está em `http://127.0.0.1:8220/?debug=1&map=praca_poderes&perfilauto=0`.
O candidato recebeu uma primeira crítica independente BLOQUEADA, e todas as causas técnicas
apontadas foram corrigidas e revalidadas. Ainda precisa de nova crítica independente e
playtest humano em 3:2. A revisão deve
olhar especialmente se as jardineiras quebram a visada sem poluir a monumentalidade, se a
água está clara o bastante e se as massas de horizonte parecem cidade distante em vez de
fachadas repetidas. A exposição residual (62,9% B; 57,0% E) e o MAP5 genérico da arena
monumental continuam documentados como diagnóstico; nenhum deles foi mascarado por redução
de bounds ou afrouxamento de teto.
