# Régua visual do Lajes ativo

## Defeito e procedência

Na baseline `bb37c048` de 06/09/2026, `MAPS.lajes.build` aponta para
`map_lajes_authored.js`, mas `eval:lajes-visual` importava e lia `map_lajes.js`.
As quinze cláusulas verdes validavam a arquitetura aposentada. A execução ficou
registrada em `artifacts/lajes-visual/baseline/gates/eval-lajes-visual.log`.

O novo gate lê o Game construído por `bootGame('lajes')` e exige identidade de
função entre o registro e `buildLajes` do builder autorado. Não infere o builder
ativo a partir de texto no arquivo ou do nome da função.

## Contrato medido

- **LVA1 — registro:** `MAPS.lajes.build === buildLajes` autorado.
- **LVA2 — setas:** quatro malhas `routeCue`, todas horizontais, com todas as
  normais apontando para cima. Mede posições e normais transformadas por
  `matrixWorld`, não apenas valores declarados na rotação. O inventário vem das
  quatro chamadas `addRouteArrow` do builder ativo.
- **LVA3 — pneus:** as três malhas `pracaPneu` da praça devem interceptar o raio
  de tiro na mesma distância em que o raio intercepta a malha visível.
- **LVA4 — troncos:** mesma concordância nos dois troncos das floreiras. O builder
  não lhes dá tag semântica; identificamos cilindros pelos centros existentes
  `(-5.7,1.87,-1.4)` e `(5.3,1.87,7.6)`. Mudança intencional do inventário ou da
  posição exige atualizar este contrato e sua procedência.
- **LVA5 — spawns sem visão direta:** os dezesseis pares entre as quatro posições
  de cada spawn devem ter bloqueio no raycast de `world.occluders`, com olhos a
  1,62 m sobre o chão. Zero visadas livres é o pedido explícito do usuário,
  não um teto estético escolhido pela régua. Inventário incompleto reprova.
- **LVA6 — fachada voltada à praça:** quatro muros `muroFundo`, com centro x=7,47 m,
  altura 5,15 m e centro z entre -5 e 6 m. Os centros z medidos antes do conserto
  são -4,176515; -0,940891; 2,404064; 5,658175 m. Cada muro deve mostrar pelo
  menos um relevo antes da face oeste x=7,40 m. Os raios saem de x=7,20 m rumo
  a +X, no z central do muro, com alcance 0,30 m e alturas 0,8; 1; 1,2; 1,55;
  1,75; 2,5; 3,3; 3,4 m, amostrando portas, remendos, medidores e janelas
  existentes. Exclui proxies GLB, malhas/ancestrais ocultos e materiais invisíveis.
  Hit x<7,395 m exige relevo 5 mm antes da parede, evitando premiar a própria
  face com erro numérico. Não depende das tags novas de relevo.

A tolerância `1e-3` representa um milímetro nas posições/distâncias e erro
numérico de `1e-3` no componente vertical da normal unitária. Não é uma margem de
aprovação estética. Quantidade ausente, geometria vazia, raio sem hit visível ou
sem hit de tiro reprovam; o teste não transforma ausência em zero erro.

Cada raio de cover parte de uma largura da Box3 antes de sua face oeste, atravessa
seu centro e termina uma largura depois da face leste. Compara o primeiro hit da
malha-alvo com o primeiro hit da lista real `world.occluders`. Não adiciona proxy
nem altera material para fabricar concordância. Raios únicos comprovam estes
pontos de passagem de tiro, não toda a silhueta ou todos os ângulos de cada objeto.

## Mesma medição em Node e no navegador

`tools/eval/lajes-visual-measure.mjs` exporta
`measureLajesVisual(THREE, game)`. A função não depende de imports, DOM, arquivos,
closures ou campos exclusivos do harness. Não modifica o Game. O chamador deve
atualizar matrizes com `game.world.root.updateMatrixWorld(true)` antes de medir.
Seu `toString()` pode ser injetado no navegador; a saída contém apenas JSON.

O Node não carrega os GLBs arquitetônicos. LVA2–LVA4 medem props procedurais reais
que existem nos dois mundos; o navegador deve repetir a mesma função após a carga
para detectar interferências das malhas GLB. Capturas 1536×1024 e avaliação visual
continuam necessárias. Este gate não dá nota ao visual inteiro do mapa.

`spawnLOS` começou informativo no diagnóstico, mas é obrigatório em LVA5 por
exigência explícita de spawns sem visão direta. A circulação em combate (BUG-75)
ainda exige simulação e observação; bloquear essas visadas não a declara resolvida.

## Aposentadoria do contrato de shell legado

As antigas LV1–LV7 protegiam cobertura/carga/fallback/LOWQ/lightmap da shell.
LV8 e LV13 protegiam tijolo herói; LV9–LV12 e LV14–LV15 protegiam horizonte,
casario, relevo e rua do builder antigo. Essas cláusulas foram retiradas desta
régua porque o registro ativo não usa essa arquitetura. Seu código e histórico
permanecem no Git da baseline; não foram traduzidas em aprovação fictícia do
builder autorado. A remoção não declara esses conceitos visuais resolvidos:
arquitetura/LOWQ continuam em `eval:lajes-authored`, e composição depende da
crítica e evidência do mapa ativo.

## Reprodução e estado vermelho

```sh
PATH=/opt/homebrew/bin:$PATH npm run eval:lajes-visual
PATH=/opt/homebrew/bin:$PATH node tools/eval/lajes-visual-check.mjs --json=artifacts/lajes-visual/baseline/gates/lajes-visual-active-red.json
```

Baseline antes de corrigir o builder: LVA1 verde; LVA2–LVA6 vermelhas, exit 1.
As setas têm amplitude vertical de 0,417057 m e normalY de ±0,941742; os raios dos
três pneus acertam a malha a 1,160000 m, e os dos dois troncos a 0,360000 m, sem
hit correspondente em `occluders`. LVA5 reprova 16/16 visadas livres no Node.
LVA6 reprova os quatro muros: nenhum dos oito raios de cada muro encontra
relevo do lado da praça; as peças estão atrás da parede, para +X.
Log e JSON com seis cláusulas: `artifacts/lajes-visual/baseline/gates/lajes-visual-active-red-six.*`.
O vermelho intermediário com cinco cláusulas permanece em `lajes-visual-active-red-five.*`.
A execução anterior, com spawn informativo, permanece em `lajes-visual-active-red.*`.

## Mutantes e estado da validação

- `--mutante=builder-antigo`: troca a função no objeto real `MAPS.lajes`; LVA1
  reprova antes de construir um mapa diferente.
- `--mutante=seta-eixo-errado`: gira as malhas de seta no mundo com Euler XYZ e
  yaw no eixo errado; LVA2 deve reprovar.
- `--mutante=pneu-sem-oclusao`: remove as malhas de pneu da lista de tiros;
  LVA3 deve reprovar.
- `--mutante=tronco-sem-oclusao`: remove os troncos dessa lista; LVA4 deve reprovar.

- `--mutante=tela-sem-oclusao`: remove somente meshes marcados
  `userData.spawnSightScreen` de `occluders`; LVA5 deve reprovar.

- `--mutante=fachada-relevo-invertido`: reflete para +X os relevos corrigidos
  próximos aos quatro muros, marcados `facadeRelief` e `facadeNormal=[-1,0]`.
  A seleção do mutante usa tags; a medição LVA6 continua independente delas.

Todos exigem mudança efetiva. Na baseline pneus/troncos já estão ausentes da lista,
então esses dois mutantes falham com `MUTANTE NÃO APLICOU`; isso não é prova de
mutação aprovada. A rodada após o conserto completou verde → cada mutante vermelho na cláusula
correspondente → verde novamente. A evidência de navegador continua separada.

A serialização da função foi conferida no harness: chamada direta e função
reconstruída de `toString()` produziram JSON idêntico. Isso valida ausência de
closures, não substitui a execução em navegador. O mutante `builder-antigo` já
foi executado e reprovou LVA1. Logs em `baseline/gates/lajes-visual-serialization.log`
e `baseline/gates/lajes-visual-mutant-builder.log` sob o diretório de artefatos.

## Rodada após conserto visual — 06/09/2026

Os nove `eval:lajes-*` terminaram com exit 0. Os seis mutantes foram aplicados e
cada um reprovou exclusivamente LVA1, LVA2, LVA3, LVA4, LVA5 ou LVA6,
respectivamente. A execução final sem mutação passou nas seis cláusulas.
Evidência: `artifacts/lajes-visual/after/gates/summary.json`, logs por gate/mutante e
`visual-restored.json`. O hash do builder ficou estável durante esta rodada.

Setas: amplitude vertical zero e normalY=1. Pneus e troncos: distâncias de bala
iguais às visuais, nos cinco raios. Spawn: 0/16 visadas livres. Fachada: 5/8, 5/8,
4/8 e 4/8 alturas com relevo à frente da parede. Anti-trap: 6.873 células andáveis,
todas com volta ao spawn, nenhum bolsão.

**Não é aprovação da circulação.** O browser encontrou três rotas interrompidas
por nós em sólidos; LB1 pula arestas cujas pontas já estão ocupadas. A simulação
ainda registrou combate com 0/21 bots no chão, raio 11,8 m e engajamento mediano
50,7 m; sem combate, 5/21 no chão, 3/21 na praça e raio 36,8 m. BUG-75 permanece
aberto. A próxima medição cobre explicitamente a ocupação dos nós ativos.

## Navegação: ocupação e arestas reais

O movimento em `movement-after/movement.json` travou nos nós da piscina oeste,
tábua leste e topo da descida norte. `lajes-nav-occupancy-check.mjs` mede `_collide`
real com raio 0,38 m, todos os nós ativos e todas as arestas, incluindo pontas.
LN1 exige zero nós ocupados; LN2 exige zero deslocamentos na amostragem da aresta
com passo máximo de meio raio. A tolerância de deslocamento é 1 mm. A prova de
movimento com `_updatePlayer` continua necessária: collision sweep não equivale
a completar a travessia de cada escada com inputs reais.

Baseline: 15/686 nós ativos ocupados e 28/1521 arestas bloqueadas; JSON completo
`after/gates/nav-occupancy-edges-red.json` guarda IDs, colisores, deslocamentos e
malhas mais próximas por diferença de Box3. Os dez nós baixos atravessam
mesas/bancos da praça ou muros de ramais. Os cinco altos atingem piscina,
corrimãos de tábuas e guarda do patamar. O mutante `--mutante=no-em-piscina`
move um nó ativo livre para o centro da piscina, sem alterar collider.

Primeira tentativa local: LN1=0/669 e LN2=0/1489, mas LS2/LV1/CTF2 reprovam por
isolar as saídas dos spawns ao retirar ligações que tangenciam as telas.
**Tentativa rejeitada.** O próximo ajuste precisa de saídas laterais explícitas
junto às telas, antes de repetir os contratos; nenhum teto foi alterado.

### Correção local de navegação e passagem

A inspeção com o corpo real mostrou que não bastava mover o nó: o vão entre
piscina e caixa d'água oeste era menor que o diâmetro de 0,76 m. A caixa foi
movida 0,20 m para oeste (x −12,05→−12,25), e a piscina 0,20 m para norte
(z 3,9→3,7), sempre movendo malha e collider juntos e mantendo apoio na laje.
O caminho passa por (−11,1;2,2) e (−11,1;5,2). As guardas de tábuas foram
aparadas apenas dentro de junções apoiadas em outra tábua ou no patamar;
a guarda de queda continua exigida por MAP6. O probe local real encontrou as
três passagens: piscina com dois cantos; tábua leste e patamar norte diretos
(`after/gates/nav3-local.log`).

O grafo usa saídas laterais explícitas junto às telas de spawn e poda nós
ocupados/arestas que atravessam sólidos usando a geometria de colisão do corpo.
A malha de térreo já existente substitui as espinhas que atravessavam mobília.
Essa poda inicialmente cortou a ligação da praça: havia três componentes no
circuito inferior. Duas costuras entre nós existentes reabriram as entradas,
mas LV1 ainda reprovou dois pares (1,50× e 1,54×, `nav4-vertical.log`).
Dois desvios adicionais de ramais também eram artefatos da grade conservadora
(raio 0,45 m); a medição real com raio 0,38 m demonstrou segmentos diretos livres.
Quatro costuras locais no total preservam o circuito sem adicionar grade de laje.
Nenhum limiar de LS2, LV1 ou CTF2 mudou.

A rodada `after/gates/nav5-vertical.log` passou LV1: E→P 1,45×, E→B 1,16×,
B→R 1,49× e B→E 1,19× o flanco, com 49–64% de chão. O fator 1,49× deixa pouca
margem ao limite 1,5×; mudanças futuras de geometria ou rotas precisam repetir
LV1. A rodada final completa e o mutante ficam em `nav-final-summary.json`.
A aprovação de inputs reais no navegador é registrada separadamente pelo agente
responsável pelo browser; não é inferida destes testes de geometria.

Rodada final Node: os onze `eval:lajes-*` disponíveis que não usam navegador
passaram, assim como `map-check.mjs lajes`. LN1: 0/682 nós ocupados; LN2:
0/1.512 arestas bloqueadas. O mutante real moveu um nó livre para a piscina e
reprovou LN1 (1/682) e LN2 (2/1.512); a restauração voltou a zero. Builder estável
na rodada: SHA-256 `f377d87071f5444d6f19b4f0115fffd6e25dfe20a8616a2f1dea4282c164388c`.
Logs, comandos, códigos e tempos: `after/gates/nav-final-summary.json`.

A métrica informativa BUG-75 melhorou parcialmente: sem combate, 11/21 bots
visitaram o chão, 9,5% do tempo no térreo, 1,51% em escadas e raio 54,8 m,
mas 0/21 visitaram a praça. Com combate: 1/21 no chão, 1,7% térreo, 0,28%
escadas, raio 12,1 m e engajamento mediano 49,1 m. Esse comportamento não é
resolvido por declarar LB1/LB2 verdes e permanece explicitamente sem cláusula.
`map_check.json` e o overlay anti-trap gerados foram preservados nos artefatos
`nav-final-map_check.json`/`nav-final-antitrap-overlay.png`; as versões rastreadas
foram restauradas sem introduzir saída gerada no diff.

Os seis mutantes LVA foram repetidos após esta rodada de navegação e os remates
visuais: cada um reprovou somente sua cláusula esperada, e a restauração passou
LVA1–6. Evidência: `after/gates/nav-final-visual-mutants-summary.json` e logs
`nav-final-visual-*.log`. Nenhuma mutação alterou arquivos de produção.

### Movimento real após o conserto

O primeiro driver terminou com `no route` antes de movimentar. A reprodução
Node mostrou que oeste/leste estavam corretos; a falha vinha de exigir um
caminho só de térreo até a DESCIDA SUL. A subida foi trocada pelo ACESSO SUL,
que pertence ao circuito da praça. O driver agora informa os nós e a quantidade
de visitados em erros de busca. Isso não altera o critério físico de movimento.

A sessão própria seguinte completou **3/3 rotas** usando W e `_updatePlayer`,
sem teleporte entre os nós: oeste, leste e descida norte → praça → ACESSO SUL →
spawn sul. Dados em `artifacts/lajes-visual/movement-final-driver/`: 251, 246 e
426 amostras de movimento; 2.764, 2.713 e 13.184 chamadas de colisão,
respectivamente. As cinco medidas visuais serializadas também passaram com
84 respostas GLB HTTP 200 e zero `pageerror`. O browser foi fechado ao terminar.
O servidor estático registrou 17 respostas 404 (APIs locais, áudio, quatro tags
de decal e um URL de brasão malformado); a validação não equivale a smoke de backend.

A DESCIDA SUL continua como diagnóstico separado: seu pé pertence a um pequeno
componente inferior de 18 nós e o grafo chega à praça passando pela laje.
A opção pelo ACESSO SUL verifica a travessia pedida, sem afirmar que todos os
cinco acessos têm conectividade exclusivamente térrea.
