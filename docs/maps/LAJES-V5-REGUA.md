# Lajes V5 — régua de identidade e preservação

Ruben rejeitou o V4 após jogar: becos largos, leitura lowpoly e perda da sensação
de favela, skyline, pipas e helicóptero. O verde mecânico V4 e a crítica anterior
não substituem essa rejeição. MAIN pesquisa referências públicas RJ/SP e reconstrói
a arquitetura; esta frente mede o defeito conhecido antes dessa alteração.

## Contrato definido antes do builder

`tools/eval/lajes-identidade-check.mjs` inicializa o **Game ativo via MAPS** e
exige identidade com `buildLajes` de `map_lajes_authored.js`. Medição em Node,
sem navegador/GPU. O helper do céu é de outra frente (`lajes_sky.js`), assim como
as capturas, movimento e crítica visual. Nenhuma aprovação estética vem deste check.

- **LID1:** laterais no trecho z−18..18, excluindo a travessa |z|≤3, devem ter
  largura geométrica **1,8–2,8 m**. Este intervalo é o alvo jogável escolhido
  antes do desenho, **não** uma estatística extraída das fotos. A régua toma
  cortes a cada0,5 m, busca x na polilinha real da rota oeste/leste e mede as
  duas faces mais próximas a y1,62. Faz duas medições: interseção dos colliders
  (incluindo caixas giradas) e raycast das malhas visíveis efetivamente entregues.
  Todas as amostras precisam estar no intervalo, com tolerância geométrica1 mm;
  ausência de face, rota ou cruzamento único reprova. Não lê largura declarada.
- **LID2:** os três percursos autorados precisam manter apoio térreo e passagem
  para o corpo real de raio0,38 m. Usa `Game._collide` em todos os segmentos,
  incluindo pontas, com espaçamento≤0,19 m e tolerância1 mm. O inventário não
  inventa becos adicionais para elevar um placar. O movimento `_updatePlayer`
  permanece uma validação independente no browser, sem teleporte intermediário.
- **LID3:** conserva três rotas, quatro escadas, quatro plataformas visíveis
  `lajesPlatform` e oito vagas cujo `Game._spawnY` é0. Os gates LS5, LN, AT e
  layout seguem cobrando a geometria física; esta cláusula conserva o inventário
  do desenho, não substitui as réguas de apoio/guarda/conectividade.
- **LID4:** helicóptero e pipas estão ligados à árvore real da cena por `skyLife`.
  Conta instâncias sem duplicar grupo/pai marcados; informa posição, quantidade
  de meshes, origem e snapshot disponível. Seu escopo é **registro na cena**.
  `browserRequired:true` é permanente: uma tag sem malha carregada não prova
  visibilidade, tamanho em tela, voo ou ambiência visual. No Node o helicóptero
  usa `source:'missing-glb'` e zero meshes honestamente; o browser deve carregar
  o GLB real e provar projeção/voo/rotores antes da entrega visual.

A largura em y1,62 descreve o corredor delimitado por paredes no plano do olho;
a travessia do corpo é medida separadamente, incluindo props mais baixos.
O intervalo não exige uniformidade nem simetria dos becos. Detalhes, vãos de
fachada, textura, skyline e aparência de favela continuam sujeitos à comparação
com referências e ao julgamento visual. A amostra de largura0,5 m não certifica
cada centímetro: LID2 e os demais gates mantêm os limites físicos mais densos.

## RED do V4, antes da reconstrução

`artifacts/lajes-visual/v5/gates/identidade-v4-red.{json,log}` guarda o hash do
builder e as120 amostras brutas. Exit1:

| Medida | Resultado V4 |
|---|---|
| Largura por colliders | min=max=média **5,960 m** |
| Largura por malhas | min5,8825 / max5,9600 / média5,9446 m |
| Cortes fora de1,8–2,8 m | **120/120** |
| Corpo nos120 cortes iniciais | zero bloqueados |
| Inventário |3rotas/4escadas/4plataformas/8spawns a0 |
| Helicópteros | **zero** |
| Pipas | **duas** instâncias existentes, mesh fallback no Node |

Não foi fabricado RED de “pipas ausentes”: o V4 já chama `attachPipaSky`, e ambas
existem no Game. O relato de perda visual pode decorrer de projeção/tamanho/
composição e precisa ser examinado nas imagens reais. O RED do céu é a ausência
do helicóptero. A segunda captura `identidade-v4-red-body.{json,log}` acrescenta
a cobertura de LID2 nos percursos completos, mantendo o registro original.

## Mutantes e verificação posterior

Os mutantes alteram o world real em memória, antes da mesma medição, e afirmam
aplicação. Falha de aplicação é erro de instrumento, não prova de detecção.

- `beco-largo`: desloca3 m para fora o collider que delimita o beco oeste no
  corte z−10. LID1 precisa reprovar a largura física; a face visual é preservada
  como testemunha da divergência causada pelo mutante.
- `beco-obstruido`: acrescenta barreira física num ponto inicialmente livre do
  beco oeste e confirma deslocamento no `_collide`. LID2 precisa reprovar.
- `sem-helicoptero` e `sem-pipas`: removem da árvore os grupos reais, incluindo
  o ancestral marcado para evitar que um container vazio simule a instância.
  LID4 precisa reprovar após um baseline com os dois tipos registrados.

Próximo passo: executar baseline V5, corrigir somente defeitos demonstrados do
instrumento, provar os quatro mutantes e a restauração verde. Depois a frente
browser deve registrar o helicóptero/pipas visíveis no frustum, origem GLB, rota
variando no tempo, rotores, pausa e movimento real dos três caminhos/quatro
escadas. Nó no root e snapshot de coordenadas não são prova de pixel.

## Compatibilidade com os gates existentes

Não há comparação `revision===4` nos checks locais desta frente. A única trava
exata encontrada foi `tools/eval/lajes-visual-measure.mjs:5`, sob responsabilidade
MAIN, já comunicada. Quatro plataformas permanecem requisito da V5, assim como
três rotas, quatro escadas, respawn térreo e os limites de apoio/guarda. LS4 segue
`world.design.routes`; não se modifica seu limite para acomodar uma rota bloqueada.
Nenhum limiar global nem antigo será alterado apenas para produzir verde.

Sem commit nesta etapa; coordenação com MAIN antes de checkpoint.


## Primeira geometria V5 — rodada Node de 06/09/2026

Baseline e quatro mutantes foram executados sequencialmente pelo runner
`artifacts/lajes-visual/v5/gates/audit.py`; saídas em `audit-*.log` e tempos/
exit codes/hashes por comando em `audit-summary.json`. Nesta etapa não houve
edição de produção ou de contratos legados por esta frente, nem commit.

LID1 passou os120 cortes: colliders min2,450/max2,650/média2,5433 m; malhas
min2,2425/max2,650/média2,4514 m. LID2 passou1.199 amostras de corpo nas três
rotas, espaçamento≤0,19 m. LID3 conserva3rotas/4escadas/4plataformas/8spawns0.
LID4 registra um helicóptero e duas pipas; no Node `missing-glb`, zero meshes do
helicóptero e rotores ausentes continuam explicitamente **sem prova visual**.

Todos os quatro mutantes reprovaram com alteração real confirmada:

| Mutante | Cláusula e resposta medida |
|---|---|
| beco-largo | LID1:11cortes inválidos, largura física máxima5,550 m |
| beco-obstruido | LID2:8amostras do corpo bloqueadas; LID1 também encontra corte ocupado |
| sem-helicoptero | LID4:zero instâncias reais, sem aceitar grupo vazio como helicóptero |
| sem-pipas | LID4:zero instâncias reais de pipa |

Os gates Lajes já executados passaram sem migração adicional: layout, rooftop,
visual, nav, CTF, authored, spatial, gap, circuito, antitrap, vertical e bots.
LN:613/613 nós conectados, zero ocupados e zero arestas bloqueadas entre3.277.
AT:6.928/6.928 células alcançam spawn. Praça102 m², sete covers, espaçamento4,6 m;
visadas88,4%. LB2:100%/488 consultas gerais e100%/12 pares sob pontes.

Bots, **SEM CLÁUSULA comportamental**: sem combate89,9% chão/4,51% escada,
20/21 na praça, raio60,3 m; combate90,3% chão/1,34% escada, raio44,2 m e
engajamento mediano16,8 m. Esses números não aprovam comportamento nem estética.

O builder inicial desta rodada tinha SHA256
`bd4bb2819ac14a6f6181d5ec0e220f5bf0d3601db3eb414699ac70a8bf7f04d0`.
MAIN continuou aparência durante bots; cada comando conserva before/after para
não atribuir a um único hash uma rodada sobre arquivos em evolução. Próximo
passo: terminar globais/pickups, restaurar identidade sem mutante e conferir
qualquer delta físico após o congelamento comunicado por MAIN.


### Fechamento da primeira rodada e quartos superiores

`map`, `map-contrato` e `ambience-registry` passaram. MAP1 zero pontos dentro de
geometria, MAP3 piso0,300/espelho0,1722/Blondel0,644/desvio0 nas quatro escadas,
MAP4 zero occluders invisíveis entre124, MAP6 zero bordas altas sem guarda e
CTF2 duas rotas em todos os oito pares. MAP5 continua **indicador abaixo do alvo**:
densidade de props0,21× contra0,35; espaçamento5,18 m contra máximo7 m. Nenhum
limiar foi alterado. AR1–6 passaram, incluindo fauna fora de sólidos.

A adição dos dois quartos superiores e o reposicionamento dos pombos foram
revalidados em `quartos-summary.json`: LN609/609 nós conectados aos oito spawns,
zero ocupados e zero arestas bloqueadas entre3.257; AT6.839/6.839 células com
volta; AR1–6 verdes. Hash desses comandos:
`dd45e9ae2188bd56f552b5e281a9fe3d071a6ac39ec5b7fb30300323d82d33de`.
A restauração de identidade após os quatro mutantes também passou nesse hash
(`restoration-summary.json`, `audit-identidade-restaurada.log`).

Uma sonda adicional de pickups encontrou dois centros onde o jogador de raio0,38
não para exatamente: AK(−2,−4) eM4(2,4), deslocamento0,10 m devido à proximidade
das mesas; os outros dez centros estão livres. **Não prova coleta impossível**
(o alcance permite pegar ao lado), nem malha da arma dentro do collider.
`pickups.json` e `audit-pickups.log` guardam os12 pontos e essa ressalva. Foi
reportado ao MAIN; nenhuma posição foi alterada nesta frente.

Os três arquivos gerados rastreados (`map_check.json` e overlays de circuito/
anti-trap) foram copiados com tamanho/hash para `v5/gates/generated/` e restaurados
no checkout. Demais arquivos do MAIN foram preservados. Nenhum commit ou browser
foi executado por esta frente. Pendências de aceitação visual/voo/GLBs continuam
com as capturas e crítica do MAIN; os verdes Node não as substituem.

### Rodada final Node após congelamento V5

Evidência: `artifacts/lajes-visual/v5/final-gates/complete-summary.json`, logs no
mesmo diretório e `generated/manifest.json`. Foram **30 execuções verdes e oito
mutantes vermelhos esperados**, sem falha inesperada. Incluem as 12 réguas Lajes
existentes ao início da rodada, identidade/restauração, pickups, mapa,
mapcontrato/mapid/mapjson/map-source, ambience-registry, sintaxe, build,
arch:check, skills:check e docs:check. A documentação regenerada pelo MAIN passou;
esta frente não executou geração de docs nem browser.

No mundo entregue: becos em 120 cortes com largura física 2,45–2,65 m (média
2,5433 m), largura visual 2,2425–2,65 m (média 2,4501 m), nenhuma das 1.199
amostras das três rotas bloqueada. Permanecem quatro escadas, quatro plataformas
e oito spawns no chão. LN: 609/609 nós conectados, zero ocupados e zero das 3.257
arestas bloqueada. MAIN moveu os centros de AK/M4 para x±1,8; a sonda final deu
12/12 centros livres (`final-gates/pickups.json`). O JSON vermelho anterior foi
preservado em `v5/gates/pickups-red.json` e restaurado no caminho histórico.

MAP3 final: quatro escadas com piso 0,300 m, espelho 0,1722 m, Blondel 0,644 m,
largura útil 2,35 m e desvio de chão zero. MAP1 e MAP6: zero defeitos. MAP4: zero
oclusores sem malha visível entre 323 medidos. CTF2: duas rotas nos oito pares.
MAP5 mantém densidade de props 0,21×, abaixo do alvo informativo 0,35×; não houve
redução de limiar. AR1–6 passaram. `map-source` tem escopo de proveniência,
não substitui as medições do Game ativo.

Os quatro mutantes de identidade reprovaram nas cláusulas previstas. Após as
últimas caixas de limite, os mutantes visuais também morderam: seta no eixo
errado → LVA2 0/4; porta a meia escala → LVA3 0/24; retirar oclusão → portas
0/24, lajes 0/4 e proteção de spawn 0/16; builder antigo → LVA1. A restauração
deu LVA2 4/4, LVA3 24/24, LVA4 4/4 e LVA5 16/16. LRO1 conferiu uma única face
de piso nos 16/16 pontos após a correção de sobreposição do MAIN.

O mesmo comando de bots, com sementes 12345/777/4242, levou 272,930 s antes e
45,701 s depois do agrupamento por célula e caixas de limite (razão 5,972).
É **tempo de execução Node com CPU/GPU compartilhadas, não FPS**: o baseline
coexistiu com browser do MAIN, já encerrado no pós. Os hashes também diferem;
não é um benchmark isolado nem atribui integralmente o ganho à otimização.
LB1/LB2 passaram nas duas execuções. No pós, sem combate: 92,0% chão, 3,44%
escada, 21/21 bots no chão, 20/21 na praça, raio 60,1 m. Com combate: 96,2%
chão, 0,63% escada, 21/21 no chão, raio 47,4 m, engajamento mediano 17,0 m.
Essas métricas continuam **SEM CLÁUSULA comportamental**.

A rodada inicial registra hashes antes/depois por comando: bots atravessou a
edição do batch; durante MAP mudou apenas `lajes_sky.js`. As execuções pós-batch
foram estáveis: builder SHA256 `b0eca83e8c7ce51839513dd140c51a9d18d9f749987b26196af45f71ff54f6b8`,
casas `8934185d44130e9ac099ee29a9c8d566849d2c4b3c2e00a5d7408d6efcda4d9f`.
Os demais hashes completos estão no JSON. A identidade do céu em Node continua
`missing-glb`, zero malhas de helicóptero: prova registro, **não aprovação visual**.
GLBs, projeção, voo, aparência e limitações visuais pertencem à evidência browser
separada do MAIN.

`map_check.json` e os dois overlays gerados foram copiados com hashes para
`final-gates/generated/` e restaurados no checkout; `resvg.wasm` não mudou.
Nenhum arquivo de produção ou índice Git foi alterado por esta validação.
Próximo passo: MAIN consolidar crítica/limitações e checkpoint de entrega.
