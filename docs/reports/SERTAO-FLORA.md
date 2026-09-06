# Sertão: copas e vegetação exterior

## Objetivo, isolamento e continuação

Frente delegada da revisão em `codex/sertao-astra`, exclusivamente na worktree
`/Users/ruben/csbrasil/worktrees/sertao-astra`. Objetivo: remover a leitura de bolas
nas copas e de palitos em um anel vazio no entorno, preservando quatro troncos GLB,
arena, rotas, colisores, material contínuo do solo e orçamento global. A definição
de pronto inclui captura real 3:2, inspeção independente e aprovação do responsável;
esta entrega de builder não atribui nota nem aceite visual.

Arquivos desta frente: `public/js/map_sertao_flora.js`,
`public/js/map_sertao_landscape.js`, `tools/eval/sertao-flora-check.mjs` e este relatório.
O agente principal integrou o helper em `map_velho_oeste.js`; esse arquivo não foi
editado pelo builder. Nenhum servidor, navegador, GPU, download, outro checkout ou
commit foi executado nesta frente. Checkpoint e ledger global pertencem ao principal.

## Evidência examinada antes da alteração

Foram abertos por `view_image` os PNG reais existentes em
`artifacts/sertao-astra/runtime/{poco,forro,aerea}.png`.

- Poço: massas verdes com contorno arredondado fechado, de tamanho semelhante,
  empilhadas sobre ramos GLB; não há recortes de folhas na borda.
- Forró: ramos secos uniformes em uma faixa estreita, com terreno vazio atrás.
- Aérea: a faixa de palitos contorna a arena como um anel, sem camadas ao longe.

Esses três arquivos são evidência do **antes**. Não foram tratados como fotografias
botânicas nem usados para inventar um limiar de fidelidade. Referências de flora e
procedência do acervo permanecem em `SERTAO-REFERENCIAS.md`.

## Alteração r1 (rejeitada posteriormente nos pixels)

O novo helper `copaJuazeiro(group, folha)` recebe o material já existente e usa
geometria compartilhada de raminho com folhas losangulares dobradas. Instâncias
seguem ramificações radiais em alturas e ângulos diferentes, com variação moderada
por cor. O material recebido passa a `DoubleSide`; nenhuma imagem ou textura nova
é criada. Geometria e material são compartilhados entre as quatro copas, sem
sombras. O helper preserva o nome `copa-juazeiro` e não toca no tronco GLB.

O entorno substitui o anel por manchas irregulares em três profundidades com ramos
bifurcados, folhagem baixa, cactos colunares simplificados e pedras. São quatro
batches instanciados, sem sombra nem colisor. Os cactos distantes são uma silhueta
procedural de fundo, não um novo asset botanicamente validado como mandacaru.
As bases acompanham por interpolação os mesmos triângulos do terreno. O plano e
seu `soilMaterial` permanecem iguais; `batchSertaoDecor` não foi alterado.

Modelagem procedural original nesta frente, sem fotografia incorporada e sem
asset externo. Os GLBs locais mantêm sua procedência anterior; este relatório não
muda nem preenche termos de licença pendentes do acervo.

## Régua e evidência da r1

Comando reproduzível, da raiz da worktree:

```sh
node tools/eval/sertao-flora-check.mjs --self-test
node tools/eval/sertao-flora-check.mjs --json
```

A régua mede as malhas e matrizes reais construídas pelo mapa no Node, incluindo
a integração do helper, e declara explicitamente não validar GLBs carregados,
pixels, FPS ou renderização. Não há fixture verde substituindo o mapa real.

Snapshot da primeira execução, **antes** da alteração: FL1 vermelha (80 triângulos
por peça da copa, proporção menor/maior dimensão 1); FL3 vermelha (todas as 1.120
peças externas na primeira banda, profundidade máxima 25,87 m); FL5 vermelha
(copas custavam 14.400 triângulos). FL2, FL4 e FL6 passavam.

Após integração e ajuste de orçamento: FL1–FL6 passaram, nove mutantes foram
mordidos. A ferramenta imprime os números atuais; os abaixo são apenas evidência
da execução de 06/09/2026, não uma segunda fonte de limites.

| Contrato | Medição executada | Mutação real que reprovou |
|---|---|---|
| FL1: representação fina de folhas nas quatro copas | 16 tris/raminho; proporção 0,082 | Trocar uma geometria por icosaedro; remover uma copa |
| FL2: instanciamento, compartilhamento, textura recebida e sem sombra | Quatro copas; mesmo material/geometria; textura original | Ativar sombra; tornar folha de uma face; remover map |
| FL3: implantação em profundidades diferentes | 500/513/707 peças nas bandas; intervalo 10,63–123,40 m além da borda | Comprimir posições X/Z do fundo para 10% |
| FL4: malhas fora da arena | 1.720 AABBs; nenhuma invasão | Mover uma instância efetiva para o centro da arena |
| FL5: orçamento reservado | 5.376 tris de copas + 12.320 de exterior = 17.696 | Trocar copa por geometria subdividida cara |
| FL6: custo de draw e ausência de sombra externa | Quatro batches | Ativar sombra externa |

Toda mutação reconstrói o mundo, modifica estado efetivo e exige mudança na
medição com a invariante alvo vermelha. Se o alvo já estiver vermelho no baseline,
a mutação fica inconclusiva. Algumas mudanças derrubam invariantes dependentes
(por exemplo, esfera rompe também o compartilhamento); o JSON relata isso no
campo `additional`, sem alegar isolamento inexistente.

Os limiares de geometria fina e bandas espaciais são contratos técnicos da
representação escolhida, não medições de aceitação estética. As bandas ficam em
30/70 m além das bordas; a arena protegida vem da delegação: `|x| <= 34, |z| <= 46`.
O teto de copas foi reduzido para 6.144 tris para reservar orçamento à frente
principal. O teto conjunto de 18.464 tris soma esse teto de copa ao fundo medido
na implementação congelada; não é um teto de renderer. A primeira versão do
ensaio usava o teto global disponível; foi apertado após o principal reservar
folga para telhas/materiais. Nenhum limite foi afrouxado para fechar o placar.

Comparação CPU equivalente: fundo anterior 17.920 + copas 14.400 = 32.320 tris;
agora 17.696, economia 14.624. Terreno 18.432 tris preservado e excluído dos dois
lados. O teto global continua sendo o da régua runtime do principal. O número
CPU não substitui `renderer.info` nem mede overdraw ou custo de fragmentos.

Sintaxe passou com `node --input-type=module --check < arquivo` nos três módulos.
A forma simples `node --check arquivo.js` caiu no tratamento CJS desse ambiente;
foi substituída pela entrada ESM explícita, sem mudar configuração do projeto.

## Pendências e próximo passo

O código de runtime foi congelado e comunicado ao principal após os nove mutantes.
Próximo passo: capturar poço/forró/aérea 3:2 com todos os assets carregados, conferir
contato das plantas com o solo e aparência das folhas, rodar RV6 e orçamento global,
medir movimento e enviar as imagens a crítico independente. Folhas DoubleSide
podem custar overdraw; menor contagem de triângulos não prova ganho de FPS.
A régua também pode passar com uma composição ainda feia ou pouco densa; ela só
impede as regressões estruturais documentadas. Se os pixels rejeitarem esta
hipótese, a implementação permanece candidata a revisão, sem nota própria.


## Iteração r2: primeira hipótese rejeitada nos pixels

O principal capturou `artifacts/sertao-astra/polish/{poco,forro}.png`; ambos foram
abertos pelo builder. A copa r1 parecia papel triangular grande e o topo tinha
faces pretas. **A r1 está rejeitada visualmente**, apesar dos seis contratos verdes.
Foi acrescentada FL7 antes de corrigir: ela reúne componentes conectados dos
triângulos, mede vértices, faces e extensão real após matrizes. A r1 reprovou com
componentes de 0,696 m (pares de folhas unidos na raiz); não se inventou aprovação
de fidelidade a partir do orçamento ou do instanciamento.

Autorização do principal baseada em runtime medido: 469 calls / 334.735 tris,
teto global 368.209, disponibilidade de aproximadamente 16 mil tris adicionais
para esta revisão. O teto CPU conjunto passa a 33.696 (= 17.696 anterior + 16.000
explicitamente reservados). Este ajuste de orçamento tem essa procedência e não
é uma flexibilização da régua de aparência. O teto técnico de raminho muda para
24 tris porque agora são seis folhas de quatro triângulos cada.

R2: folhas ovais de seis vértices com extensão nominal de 0,13 m, 208 instâncias
por copa e maior folha transformada de 0,14978 m. O limite FL7 de 0,15 m vem da
orientação explícita do principal nesta rodada; não é extrapolação de fotografia.
Folhas recebem emissão discreta no material original para atenuar verso preto;
a textura existente continua a mesma. O fundo não teve sua implantação alterada,
mas compartilha a geometria e passa de 12.320 para 13.472 tris. Copas: 19.968 tris;
conjunto: 33.440, acréscimo de 15.744 sobre r1. Projeção aritmética do runtime:
350.479 tris; precisa de nova captura, não é `renderer.info` observado.

Execução r2: FL1–FL7 7/7 e dez mutantes mordidos. Novo mutante
`folha-papel-grande` amplia a matriz real de uma instância e reprova FL7.
Sintaxe ESM passou. A geometria de r2 foi congelada e comunicada ao principal
para nova captura; não há aceite visual próprio. A implementação r1 continua
registrada acima como resultado rejeitado, sem apagar seu placar técnico.


## Mandacaru: plano opcional, sem implementação nesta entrega

O principal identificou também a repetição do GLB de dois braços com pedestal.
Esse asset não foi alterado por esta frente. A tarefa adicional autorizava um
plano caso a reconstrução extrapolasse a correção das folhas; foi essa alternativa
adotada. Não houve fotografia botânica local disponível. A busca encontrou a
[ficha iNaturalist](https://www.inaturalist.org/taxa/418237-Cereus-jamacaru) e
[esta fotografia](https://inaturalist-open-data.s3.amazonaws.com/photos/52479771/large.jpeg),
mas a ferramenta web não entregou pixels inspecionáveis ao builder; portanto a
foto **não consta como examinada**. A publicação de
[Embrapa sobre produção de biomassa](https://www.embrapa.br/busca-de-publicacoes/-/publicacao/155091/producao-de-biomassa-de-mandacaru-cereus-jamacaru-p-dc-na-caatinga-de-pernambuco)
é referência textual de Cereus jamacaru na Caatinga, não aprovação de silhueta.

Proposta para a próxima frente, dependente de foto aberta: export opcional
`mandacaruSertao(group, material, scale, id)`, com geometria de seção estrelada
para costelas longitudinais, tronco de 3,8 × scale e raio basal até 0,38 × scale;
três variantes determinísticas, três a cinco ramificações ascendentes em posições
X/Z e alturas diferentes, sem dois braços espelhados nem pedestal. Compartilhar
geometria e material texturado recebido (`map` cactus). Integração somente pelo
principal no caminho authored, preservando os nomes e os vinte grupos/colisores.

Antes da implementação: congelar o baseline de custo real dos vinte GLBs e
rasterizar projeções ortogonais de cada variante. A régua deve medir diferença
entre silhuetas e ausência de simetria bilateral, textura recebida, base/altura,
conservação de instâncias e custo abaixo do acervo substituído. Mutantes: copiar
a mesma variante para todos; espelhar dois braços; retirar mapa de textura;
adicionar pedestal; deslocar raiz; inflar subdivisões. Silhueta rasterizada em
Node ainda não substitui pixels runtime com luz, materiais e jogo carregado.


## Mandacaru implementado após referência observada pelo principal

A etapa opcional acima foi retomada por autorização explícita. O principal abriu
em CUA/iab a [fotografia da observação 104792402](https://inaturalist-open-data.s3.amazonaws.com/photos/175667295/large.jpg),
Campo Formoso, Bahia, Victor de Paiva, 2021. **Observação visual atribuída ao
principal, não ao builder:** tronco basal lenhoso cinza e irregular; cinco a sete
colunas ascendentes de alturas diferentes; ramos brotando em alturas distintas e
ângulos estreitos, sem dois braços J espelhados; extremidades verdes, quatro a
seis costelas pronunciadas e pontas arredondadas. A fotografia não foi incorporada
a arquivos de produto; direitos/licença da foto não foram presumidos.

O principal autorizou expressamente o mínimo de três ramificações assimétricas,
topos variados, três tipos determinísticos, tronco até ±0,38 × scale e altura
3,8 × scale, mantendo raiz/colisor. O helper `mandacaruSertao(group, material,
scale, id)` produz três, quatro ou cinco ramos além do tronco; perfis longitudinais
com quatro, cinco ou seis costelas e transição arredondada na ponta. A base tem
variação de posição e cor por vértice como hipótese para o lenho acinzentado;
a cor observada em runtime ainda precisa ser conferida, pois usa o `TX.cactus`
recebido. O helper ativa `vertexColors` no material recebido, reutiliza a textura,
não acrescenta sombra, colisor, imagem nem pedestal.

A primeira execução com scale=1 passou, mas foi ampliada antes da entrega para
as vinte escalas existentes. Essa ampliação **reprovou MC4**: scale=0,7 tinha
ramo com afastamento de 0,493 m abaixo de 2 m, fora do tronco sólido. O conserto
reposiciona e compacta apenas a ramificação superior quando necessário para que
braços fora do tronco comecem depois de 2,01 m reais, preservando a altura total.
As geometrias são cacheadas por variante e escala: quinze combinações no ensaio,
em vez de fingir que três geometrias uniformemente escaladas resolveriam essa
restrição. A base do tronco permanece ≤0,305 × scale nas escalas examinadas;
os limites contratados são 0,38 × scale. Escalas do mapa examinadas: 0,65–1,2.

Teste isolado (não depende de o principal já ter integrado o helper):

```sh
node tools/eval/sertao-flora-check.mjs --mandacaru-only
```

Régua criada antes do helper: execução inicial vermelha em MC0, export ausente.
A extensão é explicitamente um ensaio do helper, não um teste da seleção authored
no mapa, de GLBs carregados ou de colisão em movimento. O GLB local é aberto
para ler primitivas/acessores e calcular o custo substituído, sem teto fabricado.

| Contrato | O que mede | Mutante |
|---|---|---|
| MC1 | Componentes geométricos de colunas; ao menos três ramos e três alturas de topo | Coluna sem ramos; igualar todos os topos |
| MC2 | Rasterização ortogonal X/Y e Z/Y em 64×96, normalizada por escala; três variantes distintas e assimetria | Copiar mesma variante; adicionar geometria espelhada |
| MC3 | Tris efetivos dos vinte helpers menores que vinte GLBs lidos do disco | Malha subdividida mais cara que o acervo |
| MC4 | Raiz/escala/rotação do grupo preservadas; piso zero, altura proporcional, envelope abaixo de 2 m | Mover raiz; ampliar ramos horizontalmente |
| MC5 | Vinte meshes, material recebido e map cactus, sem sombra, cache de geometria | Material sem textura |

Execução final isolada: MC1–MC5 5/5 e oito mutantes mordidos, incluindo
silhuetas normalizadas para que escala não seja confundida com variante.
Sintaxe ESM do helper e da régua validada. O helper congelado mediu 11.092 tris para os vinte cactos, contra 97.700 tris
nas primitivas dos vinte GLBs: redução aritmética de 86.608. Esse número não
substitui renderer.info; chamadas, shaders, geometrias e frame time ainda devem
ser medidos após integração. Não houve alteração adicional de folhas/fundo.
A rasterização testa estrutura; não entrega nota botânica, enquadramento ou
aceitação do acabamento. Captura real e crítica independente seguem pendentes.

Integração a cargo do principal, sem editar esse trecho pelo builder:

```js
import { mandacaruSertao } from './map_sertao_flora.js';
const mandacaruProxy = (scale, light, id) => group =>
  mandacaruSertao(group, light ? MAT.cactusLight : MAT.cactus, scale, id);
```

Passar `i` ao closure existente e acrescentar `{ authored: true }` apenas às
chamadas `sertaoElement('mandacaru', ...)`. Preservar todos os argumentos de
posição, altura, colisor e ids. O filho novo se chama `cacto-ramos`; os nomes
`sertao-mandacaru-*` continuam no grupo original. Manter `propId` se o acervo ainda
precisa constar no contrato legado; authored impede sua instanciação visual.
Depois: reexecutar ST1/OE e contratos espaciais/runtime, capturar o poço e os
cactos em escalas extremas para verificar material, silhueta e contato real.


## Auditoria do runner: contagem antiga não prova isolamento

Revisão somente de instrumento, sem alteração de produto. O runner antigo FL
registrava `additional`, mas aceitava `MORDIDO` e exit 0 quando o alvo caía,
mesmo com cláusulas adicionais vermelhas. MC tinha a mesma condição permissiva
e nem registrava os colaterais. Portanto os placares históricos “11/11 FL” e
“8/8 MC” acima significam apenas que o alvo caiu; **não demonstram isolamento**.
Os logs antigos são preservados como evidência dessa limitação.

O runner agora declara um conjunto esperado por mutante e compara
com **todo** o conjunto observado de cláusulas vermelhas. Estados possíveis:
`MORDIDO_ISOLADO`, `MORDIDO_MULTIALVO`, `FALHOU_CONJUNTO`,
`INCONCLUSIVO_BASELINE` e `ERRO`. Qualquer alvo inesperado, alvo esperado que
não caiu, mudança do conjunto de cláusulas ou exceção reprova a execução.
Um baseline vermelho impede as mutações de serem consideradas conclusivas.
O modo self-test exige ao menos um `MORDIDO_ISOLADO` por cláusula; multialvo
nunca entra nessa cobertura. JSON de FL e MC contém baseline, esperado,
observado, inesperados, ausentes, resultados após mutação, cláusulas com prova
isolada e cláusulas sem prova. O texto imprime status e conjuntos por linha.

Preservadas todas as cláusulas e seus limites geométricos. Em particular,
`copa-ausente` continua derrubando FL1/FL2/FL7/FL8; sua duplicação de checagens
de presença não é disfarçada como isolamento nem retirada para melhorar placar.
Esse mutante fica explicitamente multialvo. A esfera é também mantida como
regressão composta (FL1/FL2/FL5/FL7), separada da prova isolada de FL1.

Mutações específicas executadas e com isolamento confirmado nesta revisão:

- FL1: deslocar folhas inteiras alternadamente em Y dentro do raminho, alterando
  volume do conjunto sem mudar tamanho/topologia de cada folha nem custo.
- FL2: material de uma face, sem textura ou sombra ativada, como antes.
- FL3: concentrar a vegetação externa na banda próxima, mantendo cada malha
  fora da arena; não comprimir tudo para dentro do espaço jogável.
- FL4: deslocar uma instância externa para a arena, como antes.
- FL5: repetir índices da geometria dos ramos externos, elevando custo real sem
  alterar topologia das folhas, posição, dimensões ou número de calls.
- FL6, FL7 e FL8: sombra externa, folha ampliada e retorno da copa alta.
- MC1: igualar os topos, substituindo todos os consumidores da geometria original.
- MC2: passar id de variante constante ao helper real, preservando as escalas
  efetivas. É a simulação do erro de seleção, não reconstrução de fixture verde.
- MC3: repetir índices do grupo de geometria compartilhada para ultrapassar o
  custo do GLB, preservando silhueta, componentes, base, material e cache.
- MC4: mover raiz ou baixar um vértice lateral de ramo para a zona tocável.
- MC5: retirar textura do material, como antes.

As substituições de geometria usam clone e atualizam **todos os objetos que
compartilhavam a geometria original**. Isso preserva a quantidade de geometrias
sem remendar o critério de qualidade testado e sem alterar o cache do produto.
A versão antiga criava uma geometria adicional ao substituir só um dos
consumidores, derrubando MC5 como colateral não declarado. Coluna sem ramos e
braços espelhados continuam disponíveis como regressões compostas declaradas;
a prova isolada das cláusulas vem dos mutantes específicos acima.

### Execução após liberação do benchmark — 06/09/2026

O principal liberou CPU após encerrar o benchmark. Executados sequencialmente,
ambos com exit 0 e stderr vazio:

```sh
node tools/eval/sertao-flora-check.mjs --self-test --json > artifacts/sertao-astra/logs/flora-isolation-audit.json 2> artifacts/sertao-astra/logs/flora-isolation-audit.stderr.log
node tools/eval/sertao-flora-check.mjs --mandacaru-only --json > artifacts/sertao-astra/logs/mandacaru-isolation-audit.json 2> artifacts/sertao-astra/logs/mandacaru-isolation-audit.stderr.log
```

FL: baseline **8/8**, **10 isolados + 2 multialvo**, cobertura isolada FL1–FL8.
MC: baseline **5/5**, **6 isolados + 2 multialvo**, cobertura isolada MC1–MC5.
Em todos os 20 mutantes o conjunto observado coincidiu exatamente com o
esperado: nenhum alvo inesperado, ausente, erro ou cláusula sem prova isolada.
Não foi necessário ajustar os instrumentos depois da execução.

| Mutante | Status | Conjunto observado (= esperado) |
| --- | --- | --- |
| copa-tampa-alta | MORDIDO_ISOLADO | FL8 |
| folha-papel-grande | MORDIDO_ISOLADO | FL7 |
| raminho-volumetrico | MORDIDO_ISOLADO | FL1 |
| copa-esferica | MORDIDO_MULTIALVO | FL1, FL2, FL5, FL7 |
| folha-uma-face | MORDIDO_ISOLADO | FL2 |
| folha-sem-textura | MORDIDO_ISOLADO | FL2 |
| copa-ausente | MORDIDO_MULTIALVO | FL1, FL2, FL7, FL8 |
| sombra-copa | MORDIDO_ISOLADO | FL2 |
| anel-sem-fundo | MORDIDO_ISOLADO | FL3 |
| flora-na-arena | MORDIDO_ISOLADO | FL4 |
| estouro-tris | MORDIDO_ISOLADO | FL5 |
| sombra-exterior | MORDIDO_ISOLADO | FL6 |
| coluna-sem-ramos | MORDIDO_MULTIALVO | MC1, MC2, MC4 |
| topos-iguais | MORDIDO_ISOLADO | MC1 |
| bracos-espelhados | MORDIDO_MULTIALVO | MC1, MC2 |
| variantes-iguais | MORDIDO_ISOLADO | MC2 |
| custo-maior-glb | MORDIDO_ISOLADO | MC3 |
| raiz-deslocada | MORDIDO_ISOLADO | MC4 |
| ramo-tocavel | MORDIDO_ISOLADO | MC4 |
| cacto-sem-textura | MORDIDO_ISOLADO | MC5 |

Baseline preservado: copa 19.968 + exterior 13.472 = **33.440 tris** diante do
limite 33.696; folhas com extensão máxima **0,149778 m**; 1.720 instâncias
externas, zero invasões e quatro draws externos. MC mediu **11.092 tris**,
comparados aos **97.700 tris** dos vinte GLBs substituídos; vinte objetos e
quinze geometrias compartilhadas. São medidas do harness, não nova captura
nem medição de FPS, calls globais ou aceite visual.

Evidência JSON (contém todos os resultados posteriores às mutações):

- `artifacts/sertao-astra/logs/flora-isolation-audit.json`: 55.320 bytes;
  SHA-256 `cec7c6332abda4d8e1dc83aca2fd4d61fd3f37ad16b3e014bfd53e776ec60654`.
- `artifacts/sertao-astra/logs/mandacaru-isolation-audit.json`: 52.532 bytes;
  SHA-256 `91176d7e348723ff9de5a67748f9aafa056b699a8d9c0c0183bfcabfeedbcf69`.

Controle separado do próprio runner, extraindo a função atual e fornecendo
cláusulas mínimas em memória: alvo inesperado, alvo ausente, mudança de esquema,
exceção, baseline vermelho e multialvo sem prova isolada produziram `pass:false`
os seis. Registrado em `artifacts/sertao-astra/logs/flora-runner-rejection-audit.json`.
Esses controles instrumentais não contam como mutações de produto nem como
prova das cláusulas FL/MC.

Estado de continuação: correção instrumental e execuções concluídas, arquivos
sem commit para integração pelo principal. Produto e pisos preservados. Os
resultados históricos permissivos permanecem registrados acima e não ganham
retroativamente uma alegação de isolamento. Capturas e julgamento visual
continuam responsabilidade da etapa do principal.
