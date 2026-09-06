# Sertão — crítica adversarial R2

> Histórico de uma iteração rejeitada. O nome do arquivo não indica aprovação da entrega atual; veja `SERTAO-CRITICA-R4.md` e `SERTAO-ENTREGA.md`.

Revisão independente dos pixels de `artifacts/sertao-astra/polish2/`, comparados com `before/`. Data: 2026-09-06. Worktree exclusivo: `/Users/ruben/csbrasil/worktrees/sertao-astra`; branch observada: `codex/sertao-astra`; HEAD observado: `d1ff3d60716d0fbf9887caa0eda400b6307f6274`. Não li relatórios do builder ou críticas anteriores. Skills aplicadas: `.claude/skills/gauntlet-fps/SKILL.md` e `.claude/skills/asset-review/SKILL.md`.

## Veredito

**Nota independente: 5,5/10. REPROVADO como acabamento final.** A venda, as casas maciças e o forró avançaram a identidade brasileira. Entretanto, a cena ainda alterna entre Sertão, deserto western e maquete de volumes sem acabamento. O solo perdeu quase toda a variação visível e as casas novas não têm a mesma riqueza material dos assets preservados. A melhora de identidade não basta para aprovar beleza e coerência.

As notas são julgamento editorial dos frames, não medições nem thresholds novos de quality gate.

| Requisito | Veredito e evidência |
|---|---|
| Sertão brasileiro imediatamente | **REPROVADO no conjunto; 6/10.** A venda funciona, mas poço e leste continuam dominados por cactos com braços em U. Sem ler placas, esses frames permanecem ambíguos. |
| Adobe/taipa/igreja/caatinga coerentes | **REPROVADO; 5/10.** Paredes maciças e igreja ajudam; superfícies novas lisas, flora sem sombras e entorno quase vazio não formam um conjunto convincente. |
| Sem western | **REPROVADO.** A arquitetura aberta de madeira saiu, mas a silhueta repetida dos cactos ainda é um marcador western forte. Carroça e cerca, isoladamente, não são prova de western. |
| Beleza em 3:2 | **REPROVADO; 5/10.** Todos os PNGs abertos têm 1536×1024. A iluminação mais neutra melhora a separação de cores; chão, paredes e fundo ficaram pobres em estrutura. |
| Variedade tipológica | **APROVADO; 6,5/10.** Há venda, casinhas térreas, pedra, geminada, igreja, poço e palco. Variedade de famílias existe; acabamento entre famílias ainda diverge. |
| Cobertura e rotas legíveis | **APROVAÇÃO LIMITADA À SILHUETA DOS ABRIGOS.** Caixas, carroça, fardos, casas e muros são distinguíveis. A leitura visual de caminhos é fraca no piso contínuo. Colisão, travessia, tiros, visibilidade de jogadores e equilíbrio não foram testados. |

## Gaps por impacto/custo

Coordenadas abaixo são caixas aproximadas de inspeção visual, em pixels da imagem original; origem no canto superior esquerdo. Valores propostos para correções são pontos de partida para nova captura, não limites certificados por referência.

### 1. P1 — Cactos grandes ainda comandam a leitura western

- **Pixel:** `poco.png` (140,340)–(310,727) e (1415,375)–(1535,652); `leste.png` (0,0)–(480,921); `forro.png` (495,446)–(565,592) e (895,454)–(951,600). Hastes grossas, quase paralelas, com braços laterais altos em U. A silhueta ficou praticamente igual ao before, e em leste ocupa quase toda a altura.
- **Causa verificável:** `public/js/map_velho_oeste.js:507`–`:510` repete o asset `sertao_mandacaru`; `:278`–`:280` escolhe o GLB quando disponível. O fallback em `:496`–`:502` também desenha dois braços simétricos. Trocar só o fallback não garante mudança dos pixels servidos.
- **Correção concreta:** trocar a silhueta efetivamente servida por uma família ramificada assimétrica: 3 variantes, bifurcações em alturas diferentes, 3–5 segmentos mais estreitos, alguns inclinados. Conservar posições e o contrato físico até validar o novo footprint. Verificar primeiro os dois exemplares que dominam poço/leste. Não basta renomear o asset ou mudar o verde.
- **Impacto/custo:** impacto máximo sobre identidade; custo médio. Esta reprovação vale estritamente para os hashes abaixo, mesmo que um helper seja alterado depois.

### 2. P1 — Solo virou uma superfície quase uniforme e não organiza o povoado

- **Pixel:** `praca.png` (560,875)–(1460,1010), `poco.png` (370,810)–(1320,1010), `sul.png` (60,850)–(1460,1010); na aérea não se distinguem caminhos usados, quintais e bordas de vegetação pelo chão. A praça parece um conjunto de objetos pousados em uma base bege.
- **Medida:** desvio padrão de luminância PIL 8-bit caiu de **18,45 para 1,96** na praça, **21,58 para 2,21** no sul e **20,80 para 1,93** no poço, nas ROIs acima. Isso comprova redução de variação nas áreas medidas; não mede realismo nem exige restaurar o piso laranja do before.
- **Causa verificável:** `public/js/map_velho_oeste.js:184`–`:193` usa ruído e mancha de baixa amplitude para `MAT.sand`; `:247` aplica esse material num plano contínuo. `public/js/map_sertao_landscape.js:19` usa o mesmo material no entorno.
- **Correção concreta:** adicionar 2–3 manchas amplas de terra compactada delimitando a praça e seus acessos, uma faixa de poeira junto às bases e manchas irregulares com pedrinhas nas bordas. Começar com variação de albedo de 6–10% e transições de 0,4–1 m, preservando superfícies físicas e corredores. Distribuição orientada ao lugar, não mais um tile repetido em toda a arena. Validar as mesmas ROIs e a aérea.
- **Impacto/custo:** impacto alto em todas as vistas; custo baixo/médio. Regressão visual em riqueza material frente ao before, apesar da melhora de cor.

### 3. P1 — Casas novas parecem blocos lisos diante dos assets detalhados

- **Pixel:** lateral nova de `leste.png` (840,418)–(1320,645), bloco ocre de `poco.png` (699,466)–(1008,613), fachada da `venda.png` (500,338)–(1110,661). A venda ganha identidade com faixa, placa e potes; suas paredes ainda são quase perfeitas. No mesmo conjunto, as telhas, janelas e pedras de `sul.png` (0,292)–(1490,650) têm detalhe de borda muito mais rico.
- **Causa verificável:** `public/js/map_velho_oeste.js:119`–`:124` gera reboco por ruído de pequena escala; `:299` cria uma caixa de parede; `:305`–`:306` são placas retas para as águas do telhado. `public/js/map_sertao_architecture.js:5`–`:15` acrescenta telhas apenas nos extremos em Z; `:19`–`:24` acrescenta um reparo pequeno numa lateral. Isso não cobre as longas superfícies expostas nos frames.
- **Correção concreta:** preservar as casas maciças. Acrescentar faixa irregular de desgaste nos 0,25–0,45 m inferiores, 2 reparos assimétricos por casa de 0,4–0,9 m e uma abertura lateral com folha fechada em parte das variantes. Dar 0,02–0,04 m de irregularidade visual a poucos cantos e detalhar também os beirais longitudinais, com telhas instanciadas. Evitar detalhar todos os metros com a mesma mancha. No leste, a lateral ampla precisa funcionar antes dos detalhes minúsculos da fachada.
- **Impacto/custo:** impacto alto em coerência e beleza; custo médio. A substituição arquitetônica foi correta para identidade; o acabamento visual resultante está abaixo dos assets preservados.

### 4. P2 — Flora próxima não participa da mesma luz que as casas

- **Pixel:** em `poco.png`, árvore (1014,560)–(1092,681) e cactus (82,692)–(339,781) encostam no chão sem sombra projetada legível. Em `leste.png`, base do cactus (0,813)–(536,1024) fica desligada do regime de sombras longas observado nas casas. A pedra próxima tem sombra e relevo mais claros.
- **Causa verificável:** `public/js/map_velho_oeste.js:282` força `castShadow=false` em todos os meshes de mandacaru, macambira, juazeiro e xique. Isso afeta inclusive os exemplares grandes do primeiro plano.
- **Correção concreta:** testar sombra apenas nos 4–6 exemplares grandes próximos ao miolo, mantendo a vegetação distante sem sombra. Se o orçamento não permitir, experimentar sombras estáticas de contato suaves sob troncos e bases, sem círculos opacos. Recapturar poço/leste com a mesma posição e medir custo no runtime; não aprovar performance pelo código.
- **Impacto/custo:** impacto médio/alto de integração; custo baixo, com custo de GPU ainda não medido.

### 5. P2 — Horizonte e vegetação externa continuam quase ausentes

- **Pixel:** `forro.png` (1000,430)–(1510,542) mostra um morro claro com galhos muito apagados; `aerea.png` (0,0)–(1536,330) e (1140,350)–(1536,900) mostram grupos minúsculos isolados num grande vazio. Sumiu a borda quadrada exposta do before, o que é melhora real; ainda falta um ambiente que envolva o arraial.
- **Causa verificável:** `public/js/map_sertao_landscape.js:8`–`:16` gera terreno muito suave em uma extensão grande; `:45`–`:53` distribui pequenos grupos em três profundidades e `:55`–`:62` faz ramos finos. O fundo observado é de baixo contraste. A implementação de céu/névoa não foi inspecionada; não atribuo todo o problema a exposição ou fog.
- **Correção concreta:** dar prioridade a 2 grupos externos mais próximos e reconhecíveis, com silhuetas sobrepostas de arbustos e afloramentos baixos; variar altura/largura do relevo em um setor, sem criar mesas de faroeste. As manchas devem ser legíveis em forró/leste sem disputar com os abrigos. Ajustar contraste por região antes de escurecer a cena inteira.
- **Impacto/custo:** impacto médio no sentido de lugar; custo médio. A aérea é evidência de composição, não câmera de gameplay.

### 6. P2 — Forró ganhou função, mas o telhado ainda parece um cone de protótipo

- **Pixel:** `forro.png` (542,361)–(962,453): pirâmide muito regular, borda perfeitamente reta, textura sem feixes salientes. Piso (288,611)–(1076,795) é uma grande placa retangular nova. Bandeirolas coloridas e caixa de som deixam a função mais legível que no before.
- **Causa verificável:** `public/js/map_velho_oeste.js:617` usa um único box para o piso; `:622` usa `ConeGeometry(...,4)` no telhado. As bandeirolas em `:624`–`:628` já ajudam e devem permanecer.
- **Correção concreta:** quebrar o contorno do telhado com 16–24 feixes de palha de comprimentos alternados, pequenas irregularidades no beiral e 2 escoras diagonais. Concentrar o detalhe na silhueta visível; não aumentar os props sobre a rota. Avaliar se duas emendas aparentes e algum desgaste localizado no piso bastam para integrá-lo.
- **Impacto/custo:** impacto local médio; custo baixo. Prioridade posterior aos cinco itens acima.

## Conferência A/B das sete vistas

| Vista | Melhora observada | Problema restante ou regressão |
|---|---|---|
| Praça | Casas fechadas e sinais em português sustentam povoado; sombra de caixas distingue volumes. | Solo apagado, centro dominado por props genéricos, pouca materialidade nas novas fachadas. Igreja continua reconhecível, mas pequena. |
| Venda | É o maior ganho: faixa caiada, placa, peitoril e potes contam o lugar. | Paredes perfeitas e cacto western ao fundo; placa não resolve sozinha a identidade do conjunto. |
| Poço | Casas maciças e copa verde quebram a repetição de estruturas abertas. | Cactos dominam, lateral ocre lisa, flora sem sombra e chão quase vazio. |
| Forró | Bandeirolas, banco e som comunicam festa. | Cobertura piramidal simples, piso de placa e entorno deserto. |
| Leste | Casa fechada é mais compatível com vila; caminhão continua legível. | Cacto ocupa o primeiro plano; lateral lisa e pedra facetada têm acabamento diferente do caminhão. |
| Sul | Neutro revela melhor o azul/rosa e a materialidade das casas preservadas. | Chão perdeu riqueza. Estas casas evidenciam a diferença de acabamento das famílias novas. |
| Aérea | Terreno continua além da antiga borda quadrada; volumes e coberturas se distinguem. | Arena retangular ainda parece maquete isolada; piso não diferencia ruas/quintais e caatinga é tênue. |

## Identidade dos insumos

Todos os 14 PNGs abaixo foram efetivamente abertos. SHA-256 completo; caminhos relativos a `artifacts/sertao-astra/`.

| Imagem | SHA-256 |
|---|---|
| polish2/praca.png | `d9a606360cb636c861436a64eb92d48c4da99b930ea7736fa68425088b61848d` |
| polish2/venda.png | `52009019c6216737613b0723c0983186de5b1e31f59beb293718a90fdb1f980a` |
| polish2/poco.png | `bb14e0231ad2869bfb587bcfa774ef49a9f48b6f86fb4d1228d5a6bfcbee4ed9` |
| polish2/forro.png | `ef051924c889aef734a53e6a80c7cb292d4df51dcd7c981819e9a4c95841157a` |
| polish2/leste.png | `17a2f956e12544620ae7dfc3401a6c5bb5d7676b8f44ffba8ec3536486f63b73` |
| polish2/sul.png | `3ba019ca5adf387ccb436a92e34a7fa56371fa984254da1c62a331675f101530` |
| polish2/aerea.png | `8039efc528bc5fc49460325f394c64b5e205e788c9a0d10ef62b4bf794d24825` |
| before/praca.png | `8ba2a9424fd5f97f5927691ef7d93ecb62b938ac81d66e7002ada032849bc21c` |
| before/venda.png | `15216522798af34abd5c229bc837c446f347648a0f0011683abf783e0d4b7650` |
| before/poco.png | `75a9e0f10aff829296600ae31bd9b8f16562dbc40f70603c255ce130c0985334` |
| before/forro.png | `f13125a52f5d60c7eb959f7455b0c669603af9ef5f5b0e667c70b3dcedd4ab35` |
| before/leste.png | `47d579ab901514d1fb1917b5780ace8aa94b76e508f744615bf75813a7cc3f18` |
| before/sul.png | `ebb70b94ee9ee8213c81ad45a32b5cb610ba8b0f150fc3c9ba9cd52ad8321120` |
| before/aerea.png | `9e7fc1fb7629fd5daaaa42a5bc8c5b9fabeefbbacff3bee7dcd999bdba29c375` |

Fonte lida para causas, com hash no momento da inspeção (linhas podem mudar em revisão posterior):

| Arquivo em public/js/ | SHA-256 |
|---|---|
| map_velho_oeste.js | `63f235a1fb446c0927e8ce22f17de6ec892f2ce99c1c304919f30a9c7158701a` |
| map_sertao_architecture.js | `c86e76926e7ce23caedcf55e90188a5f61db73fd08f0b3c59c8e706761dc0a94` |
| map_sertao_landscape.js | `f0de35f03fe4e45cb463c26cfea296ea752d334932e8f12252036c577de80c5e` |
| map_sertao_flora.js | `2365ab381124ff66809bb63600bb4452ab04c14c294ee160f01f5170ef312718` |

Reprodução das medidas de solo, sem gerar artefatos adicionais:

```python
from pathlib import Path
from PIL import Image, ImageStat
for name, roi in [('praca',(560,875,1460,1010)),
                  ('sul',(60,850,1460,1010)),
                  ('poco',(370,810,1320,1010))]:
    for stage in ('before', 'polish2'):
        im = Image.open(Path('artifacts/sertao-astra')/stage/(name+'.png'))
        stat = ImageStat.Stat(im.convert('RGB').crop(roi).convert('L'))
        print(stage, name, round(stat.mean[0], 2), round(stat.stddev[0], 2))
```

## Limitações e continuação

Esta revisão não abriu browser, não usou GPU, não gerou novas capturas e não alterou runtime, testes ou commits. As vistas aparentam enquadramentos correspondentes, mas não conferi metadados de câmera. As comparações são de aparência global; não isolam iluminação de material ou geometria. Não houve checagem botânica externa: “western” descreve a associação visual da silhueta, não uma identificação taxonômica certificada. Sem referência fotográfica fornecida nesta revisão, não certifico fidelidade 1:1.

Próximo passo: corrigir os P1, preservar os ganhos da venda/arquitetura e recapturar os mesmos sete ângulos 3:2. Mudança posterior de cactos ou helpers exige novos PNGs e hashes antes de retirar reprovação. A aprovação de gameplay exige o jogo real com jogador, câmera, colisões e desempenho medidos; a presente revisão não oferece esse aval.
