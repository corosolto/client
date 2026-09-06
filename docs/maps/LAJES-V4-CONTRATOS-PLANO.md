# Lajes V4 — plano de contratos antes do novo desenho

06/09/2026, `codex/lajes-visual`, referência de leitura `b3afbcb1`.
Direção nova explícita: melhorar ambiência, simplificar caminhos, respawn **embaixo**
e corrigir escala dos barracos. O novo desenho ainda não estava disponível nesta
auditoria. Este bloco registra o plano anterior à implementação; a execução aparece abaixo.
Verdes anteriores pertencem ao desenho anterior e não aprovam a V4.

## Inventário e decisão proposta

| Régua | O que codifica hoje | Tratamento V4 |
|---|---|---|
| `lajes-spatial` LS1–3 | Spawn ≥4 m; duas rotas superiores com encaixe ≤3 m; caminho curto ≥70% acima de4 m. | **Substituir explicitamente**: todos os respawns reais no térreo e circulação principal pelo chão. Não inverter apenas a comparação de LS1: medir posição produzida pelo Game após nascimento/respawn, apoio e saída livre de cada vaga/time. LS2/3 deixam de ser contratos de predominância do telhado. |
| `lajes-spatial` LS4–6 | Becos p50 1,4–1,9 m/p90≤2,4 m; ≥3 escadas, cada uma com largura1,1–1,4 m, dois lances e giro; pulo local0,75–0,90 m. | Preservar corpo livre e pulo local enquanto sua física não mudar. Distribuição de larguras e obrigação de escada em U são desenho antigo: substituir por passagens/escadas efetivamente declaradas e percorridas. Não exigir complexidade só para cumprir LS5. |
| `lajes-gap` | Lista fixa de13 ligações NW/WN/WS etc.;3 alas/cores; âncoras e cotas de tábuas. | Aposentar lista de13 conexões e topologia segmentada. Preservar apoio, encontro de cotas e travessia física de **cada conexão nova declarada**. Inventário vazio precisa corresponder à planta nova, não passar por `every([])`. |
| `lajes-authored` LA1–7 | Builder ativo, sem shell/horizonte radial, arquitetura em LOWQ, kit GLB;≥3 conexões verticais; três nomes fixos; varal específico. | Preservar LA1–3 e integridade de GLBs. LA5 e os nomes de LA6 dependem da planta antiga. Rever inventário LA4/LA7 somente com substituição autoral documentada; strings no fonte não provam integração visual. |
| `lajes-vertical` LV1/2/5 | ≥40% chão e≤1,5× flanco alto;≥60% laje;55% de visadas do telhado para becos, miolo `|z|≤13`, altura5,2 m. | Substituir por rota principal térrea e atalhos opcionais declarados. Os percentuais/comparação foram derivados de dois percursos de escadas antigas. Não conservar com novos nomes nem calibrar contra o resultado final. Visada tática deve proteger novos spawns, não obrigar domínio do telhado. |
| `lajes-vertical` LV3/4/6 | Praça≥90 m², largura≥7 m, centro≤9 m,≥6 covers; toda aresta térrea livre. | Preservar LV6 e cover funcional. Área/posição/quantidade da praça precisam da planta V4, antes de medir; a direção nova ainda não define esses números. |
| `lajes-circuito` LC1–6 | Quatro pontos sob tábuas/mirantes em5,2 m; três pés de escada e ramais com coordenadas fixas; continuidade do chão; colisão no perímetro. | Preservar semântica de camadas, continuidade, referências livres e limite físico visível. Substituir amostras/nomes pela planta nova; exigir **todos** os acessos declarados no circuito, não os três históricos. |
| `lajes-antitrap` AT1 | Todas as células alcançam spawn, escolhido como camada **mais alta**; amostragem até6,4 m; mutante sela ESCADARIA antiga. | Preservar zero bolsões sem saída, arestas dirigidas e corpo real. Corrigir seleção para camada do spawn real; varrer todas as alturas andáveis declaradas. Mutante deve selar uma saída nova de verdade. |
| `lajes-nav` LN1/2 | Zero nós ativos ocupados/arestas bloqueadas com corpo0,38 m; mutante nó em piscina fixa5,2 m. | Preservar integralmente as propriedades, incluindo pontas. Relocar mutante para obstáculo real novo. Acrescentar conectividade a partir de cada spawn real; podar todo o grafo não pode produzir verde. |
| `lajes-bots` LB1/2 | LB1 pula pontas já em sólidos; LB2 consulta chão/5,2 m. Uso do chão/praça em combate é **sem cláusula**. | LN1/2 continua obrigatório; atualizar consultas às camadas reais. “Bots no chão” perde poder diagnóstico quando nascem no chão: medir saída dos spawns, chegada a objetivos/áreas e cobertura com combate, preservar dados anteriores sem alegar BUG-75 resolvido por renomear a métrica. |
| `lajes-visual` LVA1–6 | Builder ativo;4 setas,3 pneus,2 troncos em posições exatas;16 raios de spawn;4 fachadas x7,47/h5,15. | Preservar identidade, setas legíveis, coincidência bala/malha, ausência de LOS entre spawns e relevo para o lado visível. Substituir inventários/coordenadas por inventário V4 escrito e raios locais às faces reais. Altura do olho deve vir do spawn real. Não usar a própria tag de “fachada correta” como prova. |
| `lajes-ctf-surface` LCTF1 |4 pontos, raio4,5, pintura plana apoiada especificamente em5,2 m. | Preservar raio4,5 e4 objetivos enquanto não houver decisão de modo diferente; apoio na superfície de cada objetivo, em sua cota real. Não exigir cobertura de laje sobre objetivos térreos. |
| `lajes-rooftop` |≥8 caixas,5 antenas,4 varais; cada categoria em≥3 quadrantes. Mutante só apaga entradas da lista medida. | Preservar linguagem cultural e distribuição visível; rever contagens contra a planta e escala novas. Mutante precisa retirar/ocultar malhas da cena real. Contagem sozinha não mede ambiência nem escala. |
| `lajes-browser` | Câmeras antigas; sementes x0/z±32,3/y5,2; trajetos altos oeste/leste e escadas fixas. | Substituir sementes por respawns reais, percurso térreo entre marcos novos e acessos opcionais. Preservar Game, GLBs HTTP200, `_updatePlayer`, ausência de teleporte no meio e resultado por trecho. |

**Não existe contrato de exatamente cinco escadas.** Há cinco no desenho anterior;
LS5 exige pelo menos três, e LC3 conhece só ESCADARIA/BECO DO VARAL/ACESSO SUL.
Essa lacuna permitia ignorar DESCIDA SUL, cujo acesso térreo exigia volta de40,60 m
pelo quintal excluído da malha. A V4 deve medir todos os acessos assumidos pela planta.

## Gates compartilhados e instrumentos desatualizados

- `map-check`: preservar MAP1 (corpo fora de sólidos), MAP3 (degraus/níveis reais),
  MAP6 (guarda de queda) e CTF2 (duas rotas separadas para cada par spawn/objetivo).
  CTF2 permite caminhos térreos simples; não exige duas rotas altas. Não retirar
  `stairs`/`levels` do retorno para ocultar níveis jogáveis da avaliação.
  MAP2/2B (exposição/área do spawn), MAP4/5 e CTF1 também medem propriedades úteis,
  mas vários desses resultados só são impressos: exit0 não prova aprovação deles.
- `map-contrato`: mantém dívida histórica `ILHADOS_MAX.lajes=241`. Um grafo novo
  deve estabelecer zero nós de rota inalcançáveis; o teto antigo não serve como meta.
- `map-source`: mede **map_lajes.js inativo** e exige `makeHorizon`, que LA2 rejeita
  no authored. Migrar a identidade/fonte e documentar aposentadoria desse desenho.
- `ambience`: AM2 monta `map_${id.slice(3)}.js`; com `lajes` tenta **map_es.js**,
  inexistente. Corrigir descoberta do builder ativo antes de atribuir resultados.
  AM1/3–6/8–12 continuam pertinentes: assets, animação, reação, LOWQ, hooks reais,
  estabilidade e ausência de erros. AM7 tem orçamento Lajes de78.000 triângulos/
  21 malhas de fauna: manter como orçamento atual, não aumentar para obter verde.
- `ambience-registry`: preservar AR1–6: população/espécies do bioma, bichos fora
  de sólidos, pombo sem voo e áudio posicional. Reposicionar trajetos contra as
  novas malhas; presença de hook ou arquivo não demonstra som audível nem ambiência.
- `mapa-novo` ALT1 exige h90≥9 m, ambição histórica de casas de3–4 lajes; a própria
  régua admite que isso não separa mapas aprovados dos rejeitados. Não usar esse
  mínimo para aumentar barracos contra a nova direção. Substituição local de escala
  exige referências; demais contratos de textura/forma continuam independentes.
- `maptex` e `map-evidence`: preservar existência de assets e validade por hashes/
  câmeras, mas recapturar a V4 com fontes ativas. Fotografias antigas tornam-se
  evidência histórica, não aprovação da nova geometria.

## Critérios novos que faltam antes da implementação das réguas

1. Registrar planta simples: spawns térreos, objetivos, percurso principal,
   alternativas e todos os acessos altos. Nomear entradas/saídas e estimar distância
   direta versus caminhada; definir o limite pela planta pretendida antes do resultado.
2. Fixar referências de escala: porta, janela, pé-direito, largura/profundidade do
   barraco, caixa d'água e personagem. Medir Box3 **após transforms do GLB** no Game
   e proporções a partir do olho de1,62 m, com imagens de referência lado a lado.
   Nenhuma régua atual mede essas dimensões de barraco diretamente. Não há números
   suficientes na direção nova para inventar limites universais neste documento.
3. Guardar RED do spawn alto, percurso complicado e escala anterior com a nova
   régua; cada mutante deve recriar defeito em objetos/colliders/Game reais e afirmar
   que aplicou. Falha de descoberta ou inventário vazio significa “não sei medir”.
4. Aprovar propriedades mecânicas em Node, depois respawn/movimento/GLBs e ambiência
   visual/sonora em sessão real. Registrar resultados separados; não tratar sucesso
   dos scripts antigos, contagem de props ou presença de áudio como aprovação estética.

A sequência acordada foi receber a planta e referências V4, fixar o contrato e
implementar substituições com RED → correção → mutante RED → restauração GREEN.

## Planta V4 recebida e primeiro RED

O responsável fixou antes da substituição: duas fileiras de casas de um pavimento
(altura alvo ~3,1 m, centros x±9, largura7,6 m); quatro plataformas contínuas
(z −20→−2 e2→20 por fileira); duas pontes curtas na travessa central; quatro
escadas retas nas extremidades (z±20→±25,4, largura2,2 m); três rotas térreas
(centro/praça e laterais x±15); spawns z±28/y0; bounds x±19/z±32.

A nova `tools/eval/lajes-layout-check.mjs` mede quatro cláusulas no Game ativo:

- **LV4A1**: oito vagas existentes nos dois times usam `Game._spawnY` a y0
  (tolerância1 mm). Não basta o nó ter sido marcado como térreo.
- **LV4A2**: inventário não vazio com no máximo quatro superfícies de plataformas.
  Mede Box3 de malhas no grupo `lajesRoof` ou marcadas `lajesPlatform`, exige
  espessura menor que os lados e topo coincidente com o chão superior real.
  Conta partes físicas, não os nomes dos grupos. Pontes não são plataformas.
- **LV4A3**: cada collider `casaFrente` térreo, com centro dentro dos bounds
  jogáveis, tem frente≥3 m (tolerância1 mm). É o **alvo deste desenho**, não
  aprovação estética, física da porta nem prova de que o GLB coincide com collider.
  O inventário precisa existir. Conferência GLB/olho humano permanece obrigatória.
- **LV4A4**: todas as vagas têm ligação física térrea à praça em(0,0), com `_collide`
  real, raio0,38 m, grade0,19 m e segmentos amostrados em no máximo0,095 m.
  Não usa `waypoints`; busca sem spawn/plaza livre reprova. Ainda não certifica
  os três corredores separadamente: essa cláusula adicional deve vir da planta.

RED anterior à troca do builder, exit1: oito vagas a5,2 m; **22 plataformas**;
**63/63 casas abaixo de3 m**, menor frente0,948 m; **0/8 vagas** conectadas à
praça exclusivamente no chão. JSON com hash do builder e log completos em
`artifacts/lajes-visual/baseline/gates/lajes-layout-v4-red.{json,log}`.

Mutantes implementados no world: `spawn-alto` move vaga para plataforma alta;
`casa-estreita` reduz realmente a caixa de colisão e sua largura de frente;
`terreo-bloqueado` insere barreira que corta a seção térrea e confirma empurrão
no `_collide`. Todos precisam afirmar aplicação e reprovar a cláusula esperada
após a V4 verde; sua prova causal ainda está pendente. Nenhum gate legado foi
alterado. Quantidades de pontes/escadas, suas dimensões e as três rotas ainda
não são certificadas por estas quatro cláusulas.


## Migração executada e limites preservados — 06/09/2026

A mudança de direção do dono autoriza substituir o desenho superior obrigatório;
ela não transforma a aprovação técnica em aprovação estética. O primeiro audit
V4 está em `artifacts/lajes-visual/v4/gates/audit-summary.json`; a primeira rodada
migrada está em `migrated-summary.json`, no mesmo diretório. Os arquivos `.log`
correspondentes conservam todos os números e mensagens. Nenhum contrato global
nem `package.json` foi editado nesta migração.

| Família | Substituição explícita / parâmetro V4 | Preservação mecânica |
|---|---|---|
| LS1–3 | Spawn no chão; duas rotas térreas independentes; caminho curto com ≥70% térreo. É redefinição da função da camada, não correção do resultado antigo. | Encaixe≤3 m, duas rotas, corpo0,38 m. LV4A1 usa `_spawnY` real e LV4A4 liga as oito vagas à praça por flood físico. |
| LS4/5 | Três percursos declarados; quatro escadas retas de18 pisos, largura útil≥2,2 m (alvo fixado na planta antes do builder). Aposentadas distribuição dos becos1,4–2,4 m e escadas em U. | Apoio e `_collide` em todos os pisos, segmentos≤0,19 m; LS6 pulo0,75–0,90 m e controle0,58–0,64 m intactos. |
| Gap / LA5 | Duas pontes entre quatro plataformas e seis conexões (quatro acessos + duas pontes). Aposentadas13 tábuas e identidade das três alas. | Malhas reais, inventário não vazio, ambas as âncoras e cotas±0,30 m; nenhum cabo existente pode ficar abaixo0,055 m. |
| LV1/2 | Rota principal térrea entre spawns≤1,5× irrestrita; todas as quatro lajes têm ida/volta. Aposentada exigência de40% chão /60% alto no percurso antigo. | LV3 área90 m²/largura7 m/centro9 m, LV4 seis covers/espaçamento7 m mantidos. LV5 usa bordas reais voltadas à praça, conserva55%; é visada para o combate central, não para spawn. |
| LC1–6 / AT1 | Pontes e todos os quatro pés reais, rotas e bounds do V4; camada de spawn medida em vez de selecionar a mais alta. | Separação por yRef, conectividade física, zero bolsões, referências fora de sólidos e margem perimetral0,18 m mantidas. |
| LN / LB | Mutante nó dentro de sólido superior real; consulta0/altura real3,1. LN3 exige todos os nós conectados às oito vagas. | Zero nós/arestas ocupados, incluindo pontas, `_collide`0,38 m/tolerância1 mm; amostra≤0,19 m; LB2≥97%. LV6 também passou a incluir pontas e amostrar0,19 m. |
| Rooftop | Quatro antenas (uma por plataforma), oito caixas e quatro varais. Aposentado mínimo histórico de cinco antenas, incompatível com o inventário novo fixado. | Cada categoria≥3 quadrantes e total4; mutante retira objetos da cena real. Node não certifica malha GLB carregada. |
| CTF | Altura de apoio vem da superfície V4. | Quatro pontos, raio4,5, anel plano e zero triângulos fora da superfície. |

A primeira rodada migrada encontrou falhas reais e **não alterou limites para
aprová-las**: LV3 área livre88 m²<90; LC6 muro para0,14 m antes do clamp<0,18;
MAP3 piso de raycast0,24 m<0,25 e Blondel0,584<0,62 nas quatro escadas. As correções
ficam no builder com o responsável principal. MAP1 já passou a zero após os vasos
ganharem corpo; AT1 passou de duas células presas junto à mesa a zero após deslocá-la.

Nessa rodada LN1/2 mediram0/686 nós e0/3593 arestas ocupados; LS4 os três percursos
livres; LS5 quatro escadas de18 pisos e largura útil2,41 m; LV4 oito covers com
espaçamento4,2 m; LV5 visadas87,3%. MAP6 zero bordas sem guarda; CTF2 duas rotas
separadas em todos os oito pares. MAP5 imprimiu pior densidade0,34× contra alvo0,35,
mas não reprova o script: não confundir exit0 com cumprimento dessa medida.

Os dados de bots continuam **SEM CLÁUSULA comportamental**. A primeira rodada com
classificador histórico y<1,6 mediu combate90% no chão,0,58% escada,21/21 bots no
chão, raio51,1 m, engajamento mediano18,1 m. No V4 essa faixa inclui metade das
escadas e nascer no chão torna “desceu” trivial. A medição foi corrigida para chão
puro y<0,06, escada até altura da laje−0,06 e janela da praça declarada; os próximos
números não são diretamente comparáveis aos percentuais históricos. Nenhuma
mudança de classificação é apresentada como resolução de BUG-75.

Pendências nesta etapa: concluir mutantes, restaurar verdes após correções físicas,
registrar hash final e conferir browser/GLBs/ambiência com o responsável principal.
O `ambience` global continua bloqueado por descoberta `map_es.js`; o registro
`ambience-registry` e `map-contrato` passam sem alterações globais.


## Validação após correção física

A rodada `artifacts/lajes-visual/v4/gates/final-summary.json` passou todos os
checks locais migrados, `map`, `map-contrato` e `ambience-registry`. Os três
mutantes de layout reprovaram as cláusulas esperadas. `final-*.log` contém a
restauração sem mutação. Evidência final: LN685/685 nós conectados aos oito
spawns, zero ocupados e zero arestas bloqueadas entre3581; AT7987/7987 células
com volta; LV3 praça102 m², LV4 sete covers/espaçamento4,6 m, LV5 88,4%; LC6
parada em x±18,38/z±31,38, margem0,24 m antes do clamp. MAP3 mediu piso0,300,
espelho0,1722, Blondel0,644, largura2,35 e desvio0 nas quatro escadas, mantendo
os limiares globais. As18 superfícies produzem17 transições de altura no
perfil MAP3; LS5 examina os18 pisos individuais.

LB2 revelou outro defeito de instrumento no mutante `planta-2d`: a medição
agregada dava99,3% e passava97%, pois só4/564 consultas atingiam o caso de dois
pisos. Mantido o mesmo97%, acrescentou-se um estrato obrigatório com os mesmos
XZ consultados no térreo e no convés de cada ponte (12 consultas reais). O
baseline passa100%/564 e100%/12. Uma consulta de piso indisponível reprova;
o estrato não aceita inventário vazio. O mutante continua alterando a função
consultada, sem alterar resultados medidos.

Com o classificador de chão corrigido, a simulação final imprime navegação sem
combate88,3% chão/5,18% escada,17/21 na praça e raio60,1 m; partida real96,3%
chão/0,50% escada,21/21 no chão, raio51,1 m e engajamento mediano17,5 m. Continua
**SEM CLÁUSULA**, e a evidência de movimento real/GLBs pertence ao browser do
responsável principal. Arquivos gerados de mapa e overlays são copiados com
hash para `artifacts/lajes-visual/v4/gates/generated-final/` e restaurados no
checkout; não integram os commits.


MAP5 final imprime densidade de props0,29× (<0,35) e espaçamento5,25 m (<7);
continua indicador global sem cláusula de falha. Não foi ocultado nem reclassificado
como aprovado. O hash de geometria da rodada foi
`b1ec228edb04c40e7e0134acdb7fd7ef1259fe3fd29e67c97ad5033d44b6c99d`;
a mudança posterior isolada do gato de z16 para18 produziu
`08fc164f1bf3e21fd3d97d47d111a2624638ff1621be674e02b86daaae86eb2b`.
O registro de ambiência final passou, e os mutantes finais usam esse segundo hash.


A prova causal de LB2 corrigida está em
`artifacts/lajes-visual/v4/gates/final-mutant-bots-planta-2d.log`: alterar
`world.nearestWaypoint` para ignorar yRef mantém99,3% agregado, mas derruba o
estrato dos dois pisos a50%/12, reprovando o mesmo limite97%. A medição não
passa mais por diluição. A conectividade LN3 tem mutante próprio que isola
um nó ativo: preserva ocupação zero, mas mede1/685 nós alcançáveis e reprova.


Fechamento da rodada causal: **21/21 mutantes adicionais** reprovaram sem erro
de aplicação ou sobrevivência, além dos três mutantes de layout já confirmados.
Saídas, tempos e hash estão em `final-mutants-summary.json`; a primeira versão
de LB2 que deixava o mutante sobreviver permanece registrada em
`mutants-summary.json`, sem sobrescrever a evidência do defeito do instrumento.
A produção foi preservada durante essas mutações em memória. Os arquivos gerados
rastreados foram restaurados após preservar cópias dos resultados verdes.
