# 26 - MAPAS ABERTOS: graffiti, ferro velho, padrão tupi e classificação

> Escrito em 26/09/2026, um dia depois da parada dos 7 mapas (`733916cee`,
> `docs/maps/MAPAS-PARADOS.md`). Este plano é o complemento: os 11 que FICARAM
> abertos sobem de padrão. Worktree: `worktrees/mapas-visual`, branch
> `feat/mapas-abertos-visual`, base `5b9c9bec3` (alpha.300).

## O diagnóstico literal do dono

> *"precisamos identificar em cada mapa que ficou onde os graffitis e posters, ou
>  estão demais, ou estão fora de onde deviam estar (no ar, em gramas etc), o mapa
>  pior disso acho que é o ferro velho do zé"*

> *"achou que tem que ser refeito nao so do graffiti mas tambem melhorar os moldes
>  de carro dar uma variada e melhorar o padrao visual"*

> *"fizemos uma animacao em demos/tupi onde elevamos pra caramba o padrao visual e
>  podemos fazer isso em todos os mapas abertos"*

> *"a classificacao dos mapas tb pode melhorar. amazonia nao é favela/comunidade"*

> *"tem bastante elemento low poly ainda, o tupi trabalhou bem nos objetos e
>  elementos do mapa"* (26/09 — vira a frente MA5)

## Evidência colhida antes de planejar (26/09)

- **Censo cobre metade:** `tools/eval/graffiti_census.json` só tem 5 mapas
  (piscina · praca · loja_h · ferro_velho · quebrada). Amazonia, escadão, córrego,
  lajes, posto e velho oeste **nunca foram censados** — a régua não enxerga metade
  do acervo aberto.
- **Ferro velho tem a pior distribuição por altura da casa:** bandas
  `[67,4% · 36,9% · 0%]`. O layout pinta só o primeiro andar do labirinto; a
  parede alta dos muros de carros (h=3,0) está vazia. E mesmo assim são 518 peças
  em 46 arquivos — o "demais" do dono é distribuição, não só volume.
- **Classificação errada nos dois sentidos:** `MAP_CATS.amazonia = ['FAVELA']`
  (é comunidade RIBEIRINHA, bioma amazônico) e **corrego não tem entrada** — cai no
  fallback `catsDe = ['ARENA']`, o oposto do que um "Córrego (Favela de SP)" é.
  E o modelo mistura três eixos numa lista só: `FAVELA` é tema, `ARENA` é gameplay,
  `COMUNIDADE` é autoria (`CAT_DESC`: "mapas feitos pela comunidade").
- **Frota do ferro velho:** 4 moldes de carro servidos (`SINGLES`,
  `map_ferrovelho.js:43`) + `destroyed_car`/`broken_car_2` já fora por serem "scans
  pretos brilhantes (blob do crítico)". O resto é `addBox` enferrujado. Variedade
  real de carro não existe no mapa.
- **O que já aterrissou do render core:** `public/js/look.js` (RC1 do plans/23) está
  na main com look por mapa medido (`look-horizonte.py`). RC2 (água com depth),
  RC3 (soft particles) e RC4 (vento) não estão.
- **Acervo parado antes de gerar:** 386 assets Mint pagos e não usados
  (`docs/maps/mint/MINT-ACERVO.md`). Qualquer pedido de prop novo começa neles.
- **Low-poly herança medido em primitivas:** contagem de `Box/Cylinder` por mapa
  aberto: escadão **105** · quebrada **101** · loja_h **96** · posto **64** ·
  ferro_velho **60+20** · brasília **50+19** — contra **7** da `map_lajes_authored`,
  o único construído no kit Blender assado (`build_lajes_authored_kit.py`). O
  padrão que o dono aprovou já existe em casa; falta levar aos outros dez.
- **A receita de objeto do tupi (MAKING-OF):** espécies geradas no Mint (~US$ 6 por
  6 espécies) e **reconstruídas no Blender com LODs**; scans CC0 do Poly Haven;
  e o processo "gauntlet" — builders paralelos, críticos só-pixel, classificador
  "parece real?" em 42 frames (4,96→5,46 em 13 rodadas).
- **A casa já tem régua "não parece low poly":** `amazonia-check`,
  `parque-vida-check`, `penitenciaria-vida-check` — o padrão existe, falta virar
  portão dos 11 abertos.

## As frentes

**MA1 — Censo e triagem de graffiti/poster nos 11 abertos (a régua antes de tudo).**
Estender `graffiti-census.mjs` aos 6 mapas sem baseline. Cláusulas novas, cada uma
com mutante que morde:
- **peça órfã:** decal sem parede atrás (o "no ar / em grama" do dono) — mutante
  desloca uma peça 1 m pra fora da parede e deve reprovar;
- **densidade por banda com teto por tema:** o teto de peças/m² de parede varia com
  o mapa (quebrada ≠ praca_poderes); estourar o teto reprova — mutante duplica banda;
- **contexto:** poster comercial/eleitoral só em superfície onde faz sentido (a
  cláusula do ferro_velho `:632` já lista o que faz sentido por mapa — virar dado).
Triagem visual: captura 3:2 por mapa julgada por `vision-judge.mjs` + crítico
adversarial (Lei 4: número nenhum fecha graffiti sozinho). Saída: tabela por mapa
`demais · fora de lugar · fora de contexto` — é o insumo do MA2 e do regen.

**MA2 — Ferro Velho do Zé, redo completo (o pior ofensor declarado).**
1. *Graffiti:* regen do layout (`gen-graffiti-layout.mjs`) com as bandas honestas —
   a banda alta 0% diz que a passada não está usando os muros de 3 m. Alvo: bandas
   ≥70% nas três alturas e peças órfãs = 0 no census novo.
2. *Frota:* variação de molde de verdade. Ordem de custo: (a) conferir os 386 Mint
   parados por carro/caminhão/van antes de qualquer geração; (b) kit Blender
   paramétrico na linha da fábrica de viewmodels (`tools/fabrica/blender/chassi.py`
   é o precedente): um chassi de carro com troca de cabine/lataria — sedan, perua,
   picape, hatch, van — e 3 estados de sucata (inteiro, amassado, esmagado). Teto:
   ≥8 moldes distintos servidos; os blobs pretos continuam fora.
3. *Look:* entrada `LOOK.ferro_velho` própria se não existir — fim de tarde com
   poeira no ar (RC3 é literalmente a cara deste mapa).
Régua: census v2 verde + `eval:vm` não tocado + crítico adversarial nas capturas.

**MA3 — Padrão tupi nos abertos (RC2→RC3→RC4, por payoff).**
O tupi (`demos/tupi`, making-of versionado) provou o que falta: água viva com depth
texture, partícula com fade de profundidade, vento de vértice, e look nascido do
céu. Prioridade por mapa aberto:
- **amazonia:** o igarapé é o pior plano d'água do acervo (RC2) + vento na folhagem
  (RC4) — o mapa inteiro muda com essas duas;
- **ferro_velho:** poeira ambiente (RC3);
- **lajes/corrego:** fumaça de churrasqueira (RC3) e varal/bandeira no vento (RC4).
Cada frente RC herda as réguas do plans/23 (mutante que remove `depthTexture`
reprova; vértice do topo move e o da base não). Nada de SSS/pele aqui — aquilo é do
tupi (personagem), não de mapa.

**MA4 — Classificação em eixos (a correção barata de dia 1).**
`mapcat.js` passa a separar os três eixos que hoje vivem numa lista:
`TEMA` (favela · cidade · sertão · amazônia · interior/fechado · industrial) ×
`JOGO` (arena · rotas · vertical) × `AUTORIA` (casa · comunidade). Correções que
não esperam a migração: `amazonia` deixa de ser `FAVELA` (vira tema próprio),
`corrego` ganha `FAVELA` (hoje é fallback `ARENA` — bug de classificação puro),
`velho_oeste` ganha tema sertão. A tela (`main.js`), o catálogo do site
(`src/data/jogo.ts`) e **as rotações do multiplayer** leem daqui — régua nova
`mapcat-check`: todo mapa jogável tem TEMA, nenhum cai no fallback, e as rotações
oficiais continuam resolvendo (mutante: tirar o TEMA de um mapa → vermelho).

**MA5 — Fim do low-poly herança (a frente do "tupi trabalhou bem nos objetos").**
Substituir os aglomerados de primitivas por malha autoral, na ordem de custo da
casa: (1) acervo Mint parado, (2) receita tupi para vegetação — gerar no Mint e
**reconstruir no Blender com LODs** (juçara/jerivá/embaúba do tupi são o
precedente barato: ~US$ 6 a leva), (3) kit Blender assado no padrão
`build_lajes_authored_kit.py` (geometria + PBR + lightmap numa casca só) para os
conjuntos que se repetem — barracos do escadão/quebrada, marquise e paredão do
posto, fachada da loja_h. Scans CC0 (Poly Haven) para rocha/terreno onde couber.
Orçamento por mapa: o teto de triângulo da casa continua valendo — malha melhora,
frame não pode cair (o `KNOWN-BUGS` do fps é vizinho).
Régua: cláusula "não parece low poly" no padrão `amazonia-check` **em todos os
11** + teto de primitivas por mapa (mutante adiciona 10 caixas → vermelho; a
`map_lajes_authored` com 7 é o piso de referência). Julgamento pelo processo do
tupi: críticos só-pixel + classificador "parece real?" por rodada — o
`vision-judge.mjs` é o embrião do classificador.

## Ordem de execução

1. **MA4 correções cirúrgicas** (horas, desbloqueia conversa de catálogo);
2. **MA1** (a régua que sustenta o resto — sem ela MA2 aprova no olho);
3. **MA2** ferro velho (pior ofensor; a frota do item 2 é caso particular do MA5);
4. **MA5** contínuo por pior razão primitivas/visibilidade: escadão → quebrada →
   loja_h → posto → brasília;
5. **MA3** contínuo por payoff: água-amazonia → poeira-ferrovelho → vento.

## Vetos e leis (herdados, não se negociam)

- Régua antes do conserto, mutante que morde, teto com procedência.
- Quem constrói não dá a nota: vision-judge + crítico adversarial por frente.
- Zero build, zero CDN — RC2/3/4 entram como módulos próprios (`bloom.js` e
  `look.js` são os precedentes).
- Acervo Mint parado (386) antes de gerar qualquer asset novo.
- Grafite é layout GERADO (`gen-graffiti-layout.mjs`) — mexe na passada e nas
  bandas, nunca à mão no `graffiti_layout.js`.
