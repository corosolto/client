<!-- spec:mapa -->
# 10 — Lajes

Comunidade carioca em duas camadas: **lajes em cima, becos embaixo**. Os dois
times nascem em conjuntos opostos de lajes e conseguem atravessar o mapa sem
tocar o chão; descer para os becos é uma opção de flanco e fuga. O mapa é de
sniper nas coberturas, com combate curto e arriscado no nível inferior.

## Local real

Lajes e becos de comunidade do Rio (referência visual: Rocinha, Vidigal,
Providência — genérico, sem copiar endereço real). Textura do lugar: caixa
d'água preta, varal, mureta baixa, tijolo aparente, reboco pela metade,
antena de TV, fio de poste cruzando o beco, grafite nas paredes. Já existe
acervo no repo em `references/favela/` — começar por lá antes de buscar fora.

## Layout

- **Camada superior (lajes):** duas rotas contínuas de telhados. O fluxo principal
  usa tábuas, pranchas e pequenos acessos de madeira ancorados nas duas pontas;
  vãos de 1,2–1,8 m ficam como atalhos de risco para um pulo mais alto.
- **Camada inferior (becos):** espinha sinuosa de 1,65–1,85 m, ramais de
  1,40–1,65 m e pequenas bolsas de até 2,40 m. Quase nenhuma linha reta longa.
- **Conexões:** 3–4 escadas/escadinhas entre as camadas, mais 1–2 rotas de
  "subida por dentro" (cômodo com escada). Escada é o ponto de estrangulamento
  do mapa — posições de escada têm que ser contestáveis dos dois lados.
- **Spawns:** Time A em laje no extremo norte; Time B em laje no extremo sul.
  Ambos enxergam uma ligação de madeira e um marco de orientação ao nascer.
  A primeira queda para o beco fica fora da linha direta entre os spawns.

## Cobertura (cover)

- **Lajes:** caixas d'água (cover alto), muretas de 1 m (cover agachado),
  varais e antenas (ruído visual, não cover), barraco de obra.
- **Becos:** portas reentrantes, janelas, carro velho, barraquinha de lanche,
  caçamba, motos encostadas.
- **Regra:** nenhum trecho de beco com mais de ~15 m sem cover; nenhuma laje
  com mais de ~10 m de exposição sem caixa d'água ou mureta.

## Linhas de visão

- **Becos:** curtas por desenho (curvas em L a cada 10–20 m) — combate de
  esquina, SMG e escopeta.
- **Lajes:** médias (20–40 m) picadas pelas diferenças de altura entre
  prédios — rifle domina.
- **Vertical:** quem está na laje enxerga trechos de beco nos cruzamentos;
  quem está no beco enxerga silhueta de laje contra o céu. Nenhuma linha de
  visão de ponta a ponta do mapa.

## Referências

- `references/favela/` (acervo local — usar primeiro).
- Pesquisa complementar: fotos aéreas de lajes (densidade, vãos), becos com
  fios cruzados, caixas d'água pretas em fileira. Toda imagem nova entra com
  `FONTE.md` (portão 2 da csbrasil).

## Régua de aceite

- Todo vão entre lajes pulável com pulo comum: medir distância máxima no
  harness (reprovar se > 1,8 m sem aviso visual de "vão grande").
- Spawn settle já coberto por `eval:spawn` — ninguém nasce no ar nem cai de
  laje no spawn.
- Nenhum pixel de parede pelada além do teto vigente do `eval:grafite` —
  beco de comunidade sem grafite é cenário de filme americano.
- Screenshot dos dois níveis + descrição do que se vê (portão 4) e nota do
  crítico adversarial (portão 5) antes de marcar como pronto.

## Reconstrução autorada — 16/08/2026

As screenshots do teste do dono em 16/08 reprovaram a premissa da implementação:
uma arena de volumes retangulares separados, com lajes vazias e um anel de casas no
horizonte. **Caixa bonita continua caixa.** `public/models/shells/lajes_completa.glb`
também está reprovada: o arquivo foi gerado por `boxT()` e preserva a mesma planta em
arquipélago. Ele não é base da reconstrução.

A candidata R18 foi testada e reprovada pelo dono. Ela melhorou materiais e fauna,
mas trocou o mapa de lajes por três atalhos isolados, manteve os dois spawns no beco,
abriu um corredor central de 7,2 m e desenhou escadas como passarelas autônomas.
Essa candidata não substitui o contrato original; a rodada seguinte reconstrói a planta.

### Contrato roof-first — decisão do dono em 16/08

- Os dois times jogam primariamente nas lajes e têm duas travessias superiores de
  ponta a ponta; pelo menos 70% do caminho curto entre spawns permanece acima de 4 m.
- Cada rota superior mistura madeira segura e vãos opcionais. Nenhuma rota principal
  de bot depende de pulo; o jogador ganha atalhos com impulso local de Lajes.
- A altura de pulo de Lajes fica acima do padrão global sem alterar os demais mapas.
  O alvo é ápice de 0,75–0,90 m; a gravidade continua curta para não flutuar.
- Toda tábua toca duas lajes reais, tem waypoint e convés a no máximo 0,30 m das cotas
  das pontas. Madeira no ar, repetida em série ou usada como enfeite reprova.
- As escadas sobem dentro do tecido: 1,10–1,40 m de largura, lances interrompidos por
  patamar e fachadas altas a menos de 0,8 m das laterais. A exceção é uma escadaria-marco,
  que ainda precisa de casas, postes, travessias e mudança de seção encostadas nela.
- A referência e o cálculo de largura vivem em
  `references/favela/lajes-rio/FONTE.md`.

### Ambiência que ocupa o lugar

- Fiação em feixes, postes com medidores e ramais para fachadas, sempre acima da banda
  limpa de combate.
- Dreno aberto com água correndo, bueiros e ratos usando esse percurso; grama apenas
  em trincas, pés de muro e áreas não jogáveis.
- Pombas distribuídas em grupos nas lajes e mais aves em voo; muitas pipas em planos
  de profundidade diferentes, com ao menos dois carretéis visíveis nas coberturas.
- Uma área de churrasco, piscinas plásticas, cadeiras e varais nas lajes, agrupados
  fora das linhas principais de tiro; uma ocorrência de cachorro caramelo no nível baixo.
- Densidade não pode violar C21–C25 da `BAR-CONSISTENCIA.md`: vida acima da cabeça e
  nas bordas, faixa de silhueta e percurso continuam claros.

### Fontes que mandam no pixel

- `references/favela/fotos-reais/foto_069.jpg`: escadaria como eixo e marco vertical;
  procedência em `references/favela/fotos-reais/PROVENIENCIA.tsv`.
- `references/favela/fotos-reais/foto_055.jpg`: corredor enquadrado por fachadas,
  marquises, fiação e atividade lateral; mesma tabela de procedência.
- `references/favela/modular_slums.glb` / `public/models/props/fav_modular.glb`:
  fonte doadora CC-BY 4.0 de lexferreira89. O carimbo integral não entra no runtime;
  casas individuais extraídas dele formam as fachadas e o fundo.
- `references/glb/laundry_clothesline.glb`: varal CC-BY 4.0 de Khoa Nguyen; decisão
  e fonte em `references/glb/FONTE.md`.
- Casas novas geradas na conta do projeto entram uma a uma, com recibo, render e
  revisão antes de multiplicar. `fav_house.glb` é vetada por CC-BY-NC 4.0.

### Contrato visual

- A arquitetura visível é GLB autorado. `BoxGeometry` pode existir apenas como piso,
  degrau, guarda-corpo ou proxy invisível de colisão/oclusão.
- Qualidade baixa mantém a mesma silhueta autorada com menos sombra/textura/instâncias;
  não pode reativar a cidade procedural cinza.
- O miolo jogável encosta fachada em fachada e forma becos. A massa externa continua
  esse tecido até as bordas; não existe anel vazio nem casario radial espelhado.
- Tijolo, reboco, concreto, zinco, porta, janela e marquise precisam existir em mais
  de um edifício e em mais de um setor. Um único “tijolo herói” não fecha a cláusula.

### Planta legível

- **Escadaria:** eixo vertical e marco central, visível nas aproximações de baixo.
- **Beco do Varal:** retorno inferior estreito, fachadas contínuas e o varal autorado
  paralelo ao corredor, preservando uma faixa livre de passagem e tiro.
- **Laje da Caixa:** atalho superior com caixa d'água e vista para a Escadaria; rota
  exposta, ligada por escada andável e protegida por guarda-corpo.
- Dois retornos no beco e três atalhos verticais pelas lajes. Salto pode encurtar uma
  travessia, mas nenhuma rota principal, arma ou objetivo depende dele.
- As quatro bandeiras recebem nomes desses marcos e ficam dentro deles; cada saída de
  spawn enquadra o primeiro marco da sua rota, sem depender do minimapa para começar.

### Portões específicos desta reconstrução

- `node tools/eval/map-check.mjs fy_lajes` precisa terminar verde, sem nível declarado
  inacessível; `--mutante=travessia-falsa` precisa ficar vermelho para provar a cláusula.
- O caminho Meshy precisa passar `npm run eval:asset-gen`: preview sem textura nunca
  é artefato final; refine PBR 2K é obrigatório.
- Captura 3:2 dos spawns norte e sul, da Escadaria, do Beco do Varal e da Laje
  da Caixa. A revisão avalia as cinco; não vale escolher só o melhor enquadramento.
- A frente só termina com crítico adversarial de contexto limpo. Portão verde e dono
  reprovando no olho significa defeito do portão.

## Teste jogável R26 — 16/08/2026

O dono aprovou a direção visual: *"visualmente o mapa está incrivel. esta muito proximo
do que queriamos"*. A gramática de favela finalmente apareceu sobretudo vista das lajes:
fachadas em tijolo/reboco, telhados de zinco, fiação densa, varais, pipas, pombos e ratos.
Essa camada não deve ser substituída por outro blockout nem por uma reescrita estética.

O mapa ainda não está finalizado porque o contrato jogável não corresponde ao pixel:

- bala acerta caixas invisíveis na frente de vãos e aberturas visuais;
- existe transição em que o jogador que caiu recebe novamente a altura da laje e depois
  volta ao térreo;
- o limite jogável não é legível: há casario/corredor visível além do clamp físico;
- o térreo tem ramais bloqueados e não comunica uma rota de ataque inferior contínua;
- no nível baixo, alguns módulos parecem apoiados no vazio ou empilhados sem a lógica
  construtiva de uma comunidade;
- caixas d'água e bordas de laje continuam com silhueta facetada/quadrada;
- o cachorro caramelo ainda não existe.

### Ordem da próxima rodada

1. Escrever a régua de colisão/tiro/camadas/limite e fazê-la reprovar esta candidata.
2. Separar `colliders` de movimento dos `occluders` de bala; a bala deve raycastar a
   arquitetura visível, não volumes inteiros invisíveis.
3. Tornar `groundHeightAt(x, z, yRef)` realmente multinível e provar a mutação que ignora
   `yRef`.
4. Refazer o negativo do térreo como um circuito contínuo, com três retornos verticais
   claros, e fechar as bordas por fachada/portão/queda visível em vez de clamp no ar.
5. Ainda nesta mesma rodada, substituir as caixas d'água facetadas, quebrar as bordas
   quadradas das lajes, corrigir todos os apoios/empilhamentos vistos do térreo e integrar
   o cachorro caramelo. Esses quatro itens são obrigatórios para fechar o mapa, não backlog.

Não atacar renderer, LUT, SSR ou exposição nesta rodada: o teste aprovou o visual e os
defeitos reportados são de contrato entre geometria visível, colisão e circulação.

### Execução da R27 (16/08, noite) — estado medido

Os cinco passos foram executados nesta ordem, com régua vermelha antes do conserto:

- `npm run eval:occluders` (browser, novo) mediu o padrão sistêmico: 977 raios
  tiro-no-ar em Lajes (33%) e vermelho nos 10 mapas. Em Lajes o conserto adotou
  **occluder = malha visível** (casas instanciadas, muros reais): 0/0 nas duas cláusulas.
- `npm run eval:lajes-circuito` (node, novo): 14 componentes → circuito único ≥ 92%;
  `yRef` multinível; três acessos verticais no mesmo componente.
- Entregáveis visuais no código: caixas d'água (GLB Tripo com tampa/frisos, variação
  preta/azul, ligação PVC), fascia/remendos nas bordas, faixas de fachada do chão à
  laje (fim do volume suspenso), cachorro caramelo animado (Quaternius CC0, tingido,
  idle/walk/flee via `ambientlife.js`).
- O que faltava e foi corrigido no processo: esquinas seladas por caixas independentes
  (agora mitra de muros contínuos), pés de escada isolados (paredes do poço param antes
  da faixa do ramal), mirantes sobre o beco (agora pilotis com passagem coberta),
  limites invisíveis (muro de perímetro visível nos 4 lados).
- Fechamento do mapa: depende do teste do dono — o BUG-54 fica aberto até lá.
