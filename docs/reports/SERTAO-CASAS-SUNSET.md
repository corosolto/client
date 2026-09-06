# Sertão: casas jogáveis da praça e pôr do sol

## Escopo

Mudança isolada em `velho_oeste` (Sertão). Não muda mecânica de arma, runtime compartilhado, materiais compartilhados nem outro mapa.

## Diagnóstico

As casas que já existiam no arraial são `sertao-casa-*`: cada uma registra um colisor único que ocupa toda a planta. Elas funcionam como fachadas/cobertura externa e não oferecem rota interna. A régua espacial anterior provava três rotas entre bases, mas não provava entrada em uma casa ou tiro através de janela.

A captura do jogador reporta um ponto inacessível, mas não contém coordenada, cursor ou identificador do objeto. A grade de rotas atual não aponta uma ruptura E→B: depois da mudança, `SP4` mantém três rotas disjuntas. Esta entrega resolve a ausência estrutural de interiores na praça; não declara que identificou a coordenada exata da captura sem uma reprodução localizada.

## Produção

- Duas casas autorais no setor norte da Praça da Matriz: `sertao-praca-casa-interior-0/1`.
- Cada casa tem entrada sul de 1,9 m, interior, janela norte voltada à rota do Forró e janelas laterais. Paredes e vãos têm colisores separados; não há caixa invisível fechando o interior.
- O tom do horizonte/fog específico de `velho_oeste` passou de `#c7b59b` para `#d7a477`. O fog continua derivado da mesma cor do horizonte (ΔE76=0), preservando a transição e o contraste técnico de leitura.
- `eval:sertao-interiors` passa a provar a rota cápsula de fora da porta ao centro e o raycast limpo pelo vão da janela. Na régua inicial, o mutante `fechar-porta` derrubava `IN1`; a versão ampliada também detecta a aresta bloqueada em `IN5`.

## Evidências executadas

- `npm run eval:sertao-interiors` → `IN1/IN2` verdes; duas entradas com deslocamento máximo `0` e duas janelas sem hit.
- `npm run eval:sertao-interiors -- --mutante=fechar-porta` → na execução inicial, `IN1` vermelho, deslocamento máximo `0.38` na primeira porta.
- `node tools/eval/sertao-spatial-check.mjs --self-test` → `SP1–SP9` verdes e 14 mutantes mordidos; `SP4` preserva 385 nós e três rotas disjuntas.
- Mutantes selecionados de identidade e gameplay: `ceu-frio→ST3`, `sem-sertao→ST1`, `sem-igrejinha→ST4`, `rota-cortada→OESTE4`, `sem-ctf→OESTE3`, `sem-colisao-varanda→OESTE9`.
- `npm run eval:sertao-sky-lifecycle` → `SK1/SK2` verdes.

## Limitações para revisão

Não foi aberto navegador por restrição desta frente. Ainda falta captura WebGL 3:2 e revisão humana para confirmar que o novo laranja mantém silhuetas de inimigos legíveis na Praça e que a coordenada exata do relato de inacessibilidade não é outro ponto do mapa. `node tools/eval/look-check.mjs` continua com falha herdada: o assado de `sky_amazonia.webp` está ausente/desatualizado; os três pares fog/horizonte medidos, inclusive Sertão, ficam em ΔE76=0.

## Continuação — revisão local de 06/09/2026

Objetivo: validar/refinar acesso, posições de tiro, bloqueios de circulação e pôr do sol;
pronto nesta frente significa correções reproduzíveis, testes de regressão, capturas
offline inspecionadas e PR #526 atualizado. Merge/release e navegador não autorizados.
Checkout exclusivo `worktrees/sertao-casas-por-do-sol`, branch
`astra/sertao-praca-casas-por-do-sol`; retomada em `b0e0407a` após fast-forward
com as atualizações já presentes no PR. Implementação inicial: `f7725b25`.

A régua ampliada reprovou o estado recebido em `IN3/IN4/IN5`:

- A circulação junto às paredes sofria deslocamentos de 0,38 m na casa oeste e
  0,76 m na leste, por barril/fardos preexistentes nas plantas novas.
- As laterais tinham frestas verticais de 0,45 m e 0,65 m junto às janelas.
  Raycasts na lista efetiva de oclusores encontraram 56 vazamentos por casa.
- Uma aresta junto ao esteio leste da casa oeste deslocava a cápsula em 0,210 m.
  O grafo antigo validava a conexão, mas a física real a interceptava.

Correções: laterais contínuas fora dos vãos, junções de peitoril/verga sobrepostas
para não abrir microfrestas por arredondamento, esteios sob o beiral e obstáculos
reposicionados no exterior sem reduzir seu inventário. O teste usa expectativas de
posição independentes dos metadados da casa, corpo de 0,38 m e olhos de 1,62 m.
`IN1–IN5` passaram depois; os cinco mutantes nominais reprovam seus alvos. Fechar
porta ou inserir fardo também reprova a navegação, como esperado.

`sertao-traversal-check.mjs --offline` usa o `Game._updatePlayer` real a 60 Hz:
as três rotas SP4 e os dois percursos porta → posições de tiro → saída passaram.
As capturas usam geometria Node/proxy e o céu procedural efetivo, com materiais
planos no Blender. Não equivalem a GLBs assíncronos, fog e pós-processamento WebGL.

Artefatos locais, fora do Git: `artifacts/sertao-casas/`. Antes da correção:
`interiors-expanded-before.json`; depois: `interiors-after.json`; mutações:
`mutant-*.json`; travessia: `traversal/report.json`. Exportação reproduzível:
`node tools/eval/sertao-interiors-capture.mjs artifacts/sertao-casas/after`, seguida de
`Blender --background --threads 4 --python tools/render-sertao-interiors.py -- artifacts/sertao-casas/after`.

### Milestone técnico validado

A revisão adversarial rejeitou a primeira relocação do barril em `(-17,10.5)`:
interpenetrava a casa antiga, com deslocamento medido de 0,673 m. `IN6` passou a
medir essa folga e ficou vermelha antes da segunda correção. Posição final:
`(-17,13)`, deslocamento zero; mutante `barril-na-parede` reprova `IN6`.
O resultado atual é `IN1–IN6` verde com seis mutantes detectados. `TR3` exige os
dois percursos de casa e tem mutante `porta`: TR3 vermelho e TR1 verde.

Build aprovado; `spawn-settle-check` aprovou 260 colocações nos 16 mapas.
O `check:fast` amplo terminou com 120/124 em 258,8 s: `docs:check` e
`eval:docsautoria` rodaram antes da regeneração; `audio:check` acusa manifesto
local defasado e `eval:grafitelayout` acusa hash herdado do Escadão. Não houve
mudança nesses assets. A suíte específica será registrada após o último ajuste.

A segunda relocação rejeitada foi o fardo esquerdo em `(12.75,21.5)`, que
interpenetrava a quina de outra casa em 0,131 m. A fileira final ficou em
`z=20.5`, com deslocamento zero contra os demais colisores. `IN6` também mede
os três fardos, excluindo apenas o contato previsto entre eles; o sétimo mutante,
`fardo-na-parede`, reproduz a regressão. Snapshot intermediário preservado em
`artifacts/sertao-casas/rejected-hay-position/`.

Após as posições finais: suíte específica Sertão/Velho Oeste 13/13, SP1–SP9 e
14 mutantes espaciais aprovados, TR1/TR3 aprovados. `docs:check`, `arch:check` e
`eval:docsautoria` passaram após os commits de inventário. O último ajuste de
inventário precisou ocorrer depois de versionar os scripts novos, pois o gerador
conta arquivos rastreados pelo Git. Revisão adversarial final aprovou o estado
técnico, sem bloqueio remanescente encontrado. As capturas finais `after/praca.png`,
`after/interior-oeste.png`, `after/interior-leste.png`, `after/lateral-oeste.png`
e `after/sunset.png` foram renderizadas e inspecionadas offline; a praça abriu,
os interiores ficaram livres e o pôr do sol laranja manteve a leitura das silhuetas.
O estado final atual é `IN1–IN7` verde, `TR1/TR3` verde, `13/13` na suíte
específica e `260` colocações aprovadas no `spawn-settle-check`.

### Fechamento do relato de área inacessível — `IN7`

O relato original não trazia coordenada, então as entregas anteriores só podiam
afirmar que a praça deixara de ter fachadas cegas. `IN7` troca essa inferência por
medida: varre `world.bounds` inteiro em passo de 0,25 m com o corpo real de 0,38 m,
marca cada célula onde `_collide` não desloca a cápsula, inunda a partir do spawn
`E[0]` e reprova se sobrar qualquer vão livre enclausurado. Resultado no estado
atual: 75 230 células livres, 75 230 alcançáveis, zero bolsões. O relevo de
`velho_oeste` é plano (`groundHeightAt` constante em 0), então a varredura 2D
cobre o caso; um mapa com desnível exigiria eixo vertical.

Quando falha, `IN7` imprime a caixa envolvente de cada bolsão — exatamente o dado
que faltava no relato. O oitavo mutante, `bolsao`, ergue quatro paredes em torno
de `(-20,-28)` e é detectado isolado: só `IN7` fica vermelha, com bolsão de
14,06 m² em `x∈[-21,7;-18,2]`, `z∈[-29,7;-26,2]`. O mutante `fechar-porta` também
derruba `IN7`, com bolsão de 32,81 m² sobre a planta da casa oeste, confirmando
que a régua enxerga o interior recém-aberto como espaço que precisa continuar
alcançável. Custo: 0,31 s, sem dependência de navegador.

`IN7` prova que hoje não existe vão livre inacessível para a cápsula do jogador.
Não prova que o relato original descrevia um bolsão: ele pode ter sido uma
fachada que parecia entrável — classe que esta entrega resolve — ou um ponto de
outro mapa. Sem reprodução localizada, o relato segue formalmente em aberto.

### Limitações que continuam exigindo revisão humana

Nenhum navegador foi aberto nesta frente. As capturas são geometria Node/proxy
renderizada no Blender com materiais planos: não reproduzem GLBs assíncronos,
fog, pós-processamento nem exposição do WebGL. A leitura de silhuetas de inimigos
sob o novo laranja foi conferida apenas nesses proxies; a validação 3:2 em WebGL
com jogadores reais permanece fora do escopo executado. `tools/eval/look-check.mjs`
mantém a falha herdada do assado ausente de `sky_amazonia.webp`, sem relação com
esta mudança.

## BUG-91 — rejeição humana de 07/09: carroças e casas dos spawns

**Rejeição (runtime 3:2, palavras do dono via PR):** (1) "há trechos em que o
jogador não passa junto às carroças"; (2) "as casas diante dos spawns continuam
cenográficas e fechadas — quero entrar nelas e usar janelas como posição tática".
O quality gate estava verde (IN1–IN7, TR1/TR3, SP1–SP9): o defeito era do gate,
que não media corredor de carroça nem interior diante de spawn. As seis capturas
de evidência (`~/Documents/screen/`, 23h52–00h00) não puderam ser abertas por
modelo algum nesta sessão (sem entrada de imagem) — tratadas como evidência dos
dois sintomas, confirmados pela inspeção de código.

### Carroças — régua antes do conserto

`tools/eval/sertao-wagon-check.mjs` (WA1–WA4, cápsula real 0,38, `_collide` de
produção, colocações congeladas do fonte). **Antes (HEAD 62bea8b1):** WA1 media
19,42 / 29,90 / 23,13 m² de área bloqueada invisível por carroça (AABB 2,3×3,2
contra carroceria visível 1,9×1,71 + lança 0,09); WA2 nenhum corredor lateral em
nenhuma das três; WA3 travessia traseira zero. **Conserto:** colisor OBB girado
para carroceria+rodas e lança (`public/js/map_velho_oeste.js`); a carroça oeste
estava com a lança cravada ~1 m na parede da platibanda-0 e foi espelhada
(ry=π+0,18) e afastada 0,4 m (z=-19,6), abrindo corredor de ~1,2 m entre casa e
carroça. **Depois:** WA1 0 m² nas três; WA2 corredor a 2,35–2,90 m do eixo
(o flanco bloqueado restante é por obstáculo VISÍVEL: barris, casa); WA3 vão
4,9/4,9/4,2 m. **Mutantes:** `aabb-conservador` → WA1 vermelha; `barreira-spawn`
→ WA4 vermelha.

Falha latente encontrada de carona: `sertao-spatial-check.mjs` terminava em
`process.exit()` e truncava stdout assíncrono em pipe nos 8192 bytes exatos que
o `sertao-traversal-check` lê — o conserto mudou o tamanho do JSON e expôs o
bug. Trocado por `process.exitCode`.

### Casas dos spawns — fachadas medidas e conversão

Fachadas voltadas a cada respawn (medidas no fonte, CASAS): E em z=-41 olha +z —
platibanda-0 (-9,2; -25,5; ry=π+0,12) e platibanda-1 (9,6; -26; ry=π-0,17),
portas na face local +z; B em z=41 olha −z — pedra-7 (-8,4; 24,2; ry=0,14) e
pedra-8 (9,1; 24,7), portas na face local +z; a geminada (−0,4; 26,2) vira as
costas ao spawn B (ry≈π). Convertidas **platibanda-1** (a platibanda-0 tem a
lança da carroça na planta e a placa da venda) e **pedra-7** (a pedra-8 brigaria
com os fardos da IN6): porta de 1,9 m na fachada do respawn, janela oposta de
1,4 m com linha de tiro à praça, janelas laterais, paredes segmentadas com
colisor OBB por parte, piso contínuo, registro em `interiorHouses` com
`entrance/inside/farWindow/ry`. Sem caixa monolítica; nome de família e
`parede-casa-N` preservados (ST4/ST6 verdes, ST2 subiu).

A régua `sertao-interiors-check.mjs` foi estendida ANTES da conversão às 4 casas
(contrato novo vermelho no estado sem interiores): IN1 entrada E saída, IN2 tiro
E revide (raio recíproco pela janela em altura de olho), IN3 ocupação
(circulação pelos cantos + posições de tiro), IN4 frestas, IN5 nós internos
alcançáveis (interiores fora do alinhamento da grade ganham nó centro+soleira
no build do grafo), IN6 inventário, IN7 varredura. **Dez mutantes** mordem,
incluindo os novos `fechar-porta-casa` e `fechar-janela-casa`. Ajustes de
geometria comprados por vermelha: esteios junto à parede (0,25 m) raspavam
aresta do grafo (IN5); fardo da fileira (13,-31) raspava a faixa de entrada
(IN1) → movido a (13,8,-31).

`SP3` do `sertao-spatial-check` aprendeu o ramo de casa interior (≥8 partes com
a tag da casa, centro coerente, ≥4 paredes de altura total) e os mutantes
`casa-yaw/casa-tag/casa-obb` passaram a mirar casa clássica; os 17 mutantes do
`--self-test` mordem. `TR3` percorre os 7 interiores pelo `userData.interior`
(mutante `porta` vermelho, TR1 verde).

### Evidências executadas (BUG-91)

- `npm run eval:sertao-wagon` → WA1–WA4 verdes; `--mutante=aabb-conservador` e
  `--mutante=barreira-spawn` vermelhos no alvo.
- `npm run eval:sertao-interiors` → IN1–IN7 verdes com 4 casas; 10 mutantes.
- `node tools/eval/sertao-spatial-check.mjs --self-test` → SP1–SP9 + 17 mutantes.
- `node tools/eval/sertao-traversal-check.mjs --offline` → TR1/TR3 (7 percursos);
  `--mutante=porta` vermelho em TR3.
- `npm run eval:sertao`, `eval:velhooeste`, `eval:sertao-occlusion`,
  `eval:sertao-sky-lifecycle`, `eval:spawn` verdes; 6 mutantes de identidade ST
  mordidos.
- Captura: `node tools/eval/sertao-interiors-capture.mjs artifacts/sertao-casas/bug91-after`
  + `Blender --background --python tools/render-sertao-interiors.py` → 12 PNGs.
- `node tools/eval/sertao-capture-verify-check.mjs` → CV1–CV3 verdes (vãos de
  porta/janela abertos no enquadramento, lança sem interseção, pisos visíveis).

### Limitações desta rodada

Nenhum navegador aberto; sem merge/release. As 12 capturas não puderam ser
OLHADAS por nenhum modelo desta sessão (sem suporte a entrada de imagem — nem o
juiz, nem o MCP de visão): a inspeção foi substituída por `sertao-capture-verify
-check.mjs`, que mede os mesmos enquadramentos por raio na lista efetiva de
oclusores. Continua pendente a revisão humana 3:2 em WebGL: leitura das novas
casas (materiais planos não provam o paupique real), corredores junto às
carroças e as seis capturas originais do dono.
