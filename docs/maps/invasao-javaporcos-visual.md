# Invasão dos Javaporcos — brief visual histórico de 29/10/2026

**SUPERADO: arquivo histórico, não é o contrato do mapa atual.** As medidas e
contagens abaixo registram o layout de 29/10/2026. Para implementar ou validar,
use [a ficha atual](invasao-javaporcos.md) e [o layout atual](invasao-javaporcos-layout.md):
arena de 136 × 136 m (`bounds` ±68), seis frentes, cidade até r = 36,
pasto de r = 36 a 54 e mata até r = 68. As áreas, densidades e dez bocas deste
arquivo pertencem à versão histórica e não devem ser aplicadas ao runtime atual.

Documento histórico de ARTE. A ficha de modo continua em `docs/maps/invasao-javaporcos.md`.
Aqui só entra o que tem medida: cor, altura, largura, densidade, contagem e teto de
desenho. Adjetivo ("bonito", "fechado", "vivo") não é especificação — onde aparecer
adjetivo neste arquivo, ele vem seguido do número que o define.

Escrito contra o layout que o `MapaJava` travou em 29/10/2026 e confirmou pelo hub:

| grandeza | valor |
| --- | --- |
| arena | 116 × 116 m, `bounds` ±58 em x e z |
| miolo urbano (`cityBounds`) | ±36 em x e z → 72 × 72 m |
| cinturão de mata | anel de 22 m entre r = 36 e r = 58, com r = max(\|x\|,\|z\|) |
| avenidas | x = 0 e z = 0, 12 m de asfalto |
| ruas secundárias | x = ±23 e z = ±23, 8 m de asfalto |
| calçada | 2,0 m de largura, meio-fio de 0,15 m |
| bocas de mata | 10 clareiras de ~7 m no fim de trilhas de 3,5 m |

Áreas que saem daí e que o resto do documento usa:

- anel de mata inteiro: 116² − 72² = **8.272 m²**
- faixa de mata CAMINHÁVEL (r 36→41, 5 m): 82² − 72² = **1.540 m²**
- parede de mata OPACA (r 41→58, 17 m): 116² − 82² = **6.732 m²**
- miolo urbano: **5.184 m²**, dos quais ~1.780 m² de asfalto e ~1.150 m² de calçada

---

## 1. As cinco reprovações do dono, traduzidas em arte

| frase do dono | o que a ARTE tem de entregar |
| --- | --- |
| "o mapa está horrível, totalmente lowpoly" | §7: o mapa tem 111 malhas autorais hoje contra 1.432 do `quebrada` — 7,8% |
| "tem que ter árvores, grama e mata fechada" | §4: 1.623 troncos, visibilidade ≤ 10 m dentro da parede |
| "não pode ser possível ir até o limite do mapa" | §4.3: a parede é opaca e colidível; a única leitura de saída é a boca de trilha, e ela dobra e morre |
| "nível visual igual ou melhor que os outros mapas" | §7: teto de 1.400 draw calls / 1,6 M tris, entre `velho_oeste` (838) e `quebrada` (1.975), ambos MEDIDOS |
| "pôr lixos e alimentos pros javaporcos revirarem" | §6: 14 `foodSpots`, 48 peças de lixo, 2 caçambas, 9 bancas |

---

## 2. Referência de imagem

Seis artes CG geradas em 29/10/2026 com `node tools/gen-image.mjs`
(OpenRouter, `google/gemini-3-pro-image`, 1264×848, prompts em inglês).
São CONCEITO para o modelador, não asset de jogo: nenhuma delas é carregada em runtime.

Cruas, em `/tmp/gen-image/`:

| arquivo | cena |
| --- | --- |
| `javaporcos-ref-a-cidade-cercada.png` | vista aérea 3/4 da cidadezinha totalmente cercada de mata, ao entardecer |
| `javaporcos-ref-b-rua-lixo.png` | rua comercial com lixo revirado e seis javaporcos |
| `javaporcos-ref-c-feira-cacamba.png` | praça/feira com bancas, caixotes e caçamba |
| `javaporcos-ref-d-parede-mata.png` | a parede de mata vista de DENTRO da cidade, com a trilha aberta |
| `javaporcos-ref-e-escala.png` | javaporco adulto ao lado de um hatch 3,6 m — folha de escala |
| `javaporcos-ref-f-materiais.png` | 12 amostras de material sob luz neutra — é daqui que saem os hex da §3 |

Publicadas no repositório (as duas que o modelador deve ter abertas enquanto trabalha):

- **`public/img/map-previews/ref-javaporcos-cidade-cercada.webp`** (1200×800, 154 KB) — a leitura macro: a mata é a moldura, a cidade é a clareira.
- **`public/img/map-previews/ref-javaporcos-parede-mata.webp`** (1200×800, 119 KB) — a leitura que resolve "não dá pra sair da cidade": muro de 1,80 m, mata atrás, e uma única boca de trilha escura.

O prefixo `ref-` é de propósito: a tela de mapas monta `/img/map-previews/${id}.jpg`
(`mapa-id-check.mjs`, cláusula M3), então nenhum arquivo com esse nome entra no menu.

---

## 3. Paleta — hex MEDIDO nas referências

Os valores abaixo não foram escolhidos a olho: são a mediana de uma janela de pixels
amostrada nas artes com `sharp` (amostragem em `/tmp/javaporcos-arte/paleta.mjs`).
A folha de materiais (`ref-f`) é iluminada com luz neutra, então ela é a fonte de
ALBEDO; as cenas são a fonte de CÉU, NÉVOA e massa de vegetação.

### 3.1 Céu, sol e névoa (entardecer, a hora escolhida)

| elemento | hex | nota |
| --- | --- | --- |
| céu no zênite | `#c79872` | medido no topo da `ref-a` |
| céu no horizonte | `#de9961` | medido na faixa do sol da `ref-a` |
| cor da névoa | `#cf9a6f` | média das duas acima; a névoa TEM de ser a cor do horizonte, senão a mata recorta |
| `scene.background` | `#c79872` | com gradiente para `#de9961` na faixa de 0–12° acima do horizonte |
| luz direcional (sol) | `#ffd3a0`, intensidade 2,4 | altura 12°, azimute 118° (sol entrando pelo lado leste-sul da praça) |
| hemisférica céu | `#c79872`, intensidade 1,1 | |
| hemisférica chão | `#3a3328` | terra batida em sombra, não azul |

**Névoa linear: `near = 30 m`, `far = 135 m`.** A conta que justifica: a maior visada
limpa possível é a diagonal do asfalto da avenida até a mata do lado oposto, 58 m.
Nessa distância a névoa já come (58 − 30) / (135 − 30) = **27%** da cor — o bastante
para a parede de mata virar massa chapada e o jogador parar de tentar ler profundidade
lá dentro. A névoa de hoje (`82 → 190`) só começa a agir aos 82 m, ou seja, nunca:
nenhum ponto do mapa novo está a 82 m de outro dentro do campo de visão.

### 3.2 Chão e construção (albedo, medido na folha de materiais)

| material | hex | onde |
| --- | --- | --- |
| asfalto remendado | `#868581` | avenidas e ruas |
| concreto de calçada | `#9e9b95` | calçada, meio-fio, soleiras |
| bloquete intertravado | `#97807a` | só a praça/feira |
| reboco ocre | `#cea978` | 40% das fachadas |
| reboco menta | `#a8bfaa` | 20% das fachadas |
| bloco de concreto aparente | `#a19f9a` | 15% das fachadas e 100% dos muros de fundo |
| telha cerâmica | `#9a6348` | 85% dos telhados |
| fibrocimento ondulado | `#8d887c` | 15% dos telhados (puxadinhos, galpão, ração) |
| zinco enferrujado | `#946c54` | portões, caçamba, portas de aço |
| terra batida pisoteada | `#5a5045` | trilhas, quintais, barranco do córrego |
| mato seco / capim alto | `#825c2e` | beira de muro, terreno baldio |
| folhagem de mata | `#1c2d1b` | o valor mais importante do mapa — ver §3.4 |

Os 25% de fachada que faltam na conta acima são livres, desde que caiam dentro de
±12% de luminância dos quatro tons listados. **Nenhuma parede pode sair com o material
cru de concreto**: foi exatamente isso que produziu o "lowpoly" da reprovação.

### 3.3 Props e vegetação

| item | hex |
| --- | --- |
| caçamba de entulho | `#b85828` (medido: 6.163 px dominantes na `ref-c`) |
| lixeira 240 L | `#19233f` |
| saco de lixo preto | `#1b1a19` |
| caixote de feira | `#7f4527` |
| toldo de banca (3 variantes) | `#5e86a8`, `#6f9a62`, `#b06a5e` — listras com `#e6ddcf` |
| pelo do javaporco | `#2c2924` (medido na folha de escala) |

### 3.4 A conta de dominância

A reprovação "totalmente lowpoly" é, antes de qualquer coisa, uma reprovação de
DOMINÂNCIA: hoje o quadro é cinza de asfalto com caixas bege. Na `ref-a`, que é a meta,
a massa do quadro se divide assim (contagem de pixels por faixa de matiz):

- **verde-mata escuro (`#1c2d1b`–`#1e2c2e`): ≥ 45% do quadro** em qualquer visada a
  partir do miolo urbano com a câmera na horizontal;
- telha + reboco quente: 25–30%;
- céu: 10–15%;
- asfalto/concreto: **≤ 15%**.

Se o asfalto passar de 15% do quadro, o mapa voltou a ser o pátio cinza que o dono
reprovou — não importa quantos props tenham entrado.

---

## 4. A mata

### 4.1 Base factual

Capoeira (floresta secundária) de Mata Atlântica, estágio arbóreo:

- densidade real medida em campo: **1.516 a 1.983 indivíduos/ha** com DAP ≥ 5 cm
  (Cubatão-SP, 1.983,3 ind/ha; Botucatu-SP, 1.516–1.803 ind/ha) → **15,2 a 19,8
  troncos por 100 m²**;
- estágio arbóreo avançado: **DAP médio 12,8 cm, altura média 9,5 m**, área basal
  39,9 m²/ha;
- dossel de floresta secundária desenvolvida: **~10 m**; a floresta ombrófila densa
  madura vai a 20–30 m (não é o nosso caso — o nosso é mata de borda de cidade).

Fontes na §9.

### 4.2 Tradução para o mapa

| faixa | r | área | densidade | troncos |
| --- | --- | --- | --- | --- |
| mata caminhável | 36 → 41 m | 1.540 m² | 18 / 100 m² | **277** |
| parede opaca | 41 → 58 m | 6.732 m² | 20 / 100 m² | **1.346** |
| **total** | | 8.272 m² | | **1.623** |

Espaçamento médio na faixa caminhável: 100/18 = 5,55 m² por tronco → **2,36 m entre
troncos**. O corpo do jogador tem 0,76 m de diâmetro e o javaporco 1,80 × 0,60 m: os
dois passam, nenhum dos dois passa reto. É isso que torna a mata "caminhável mas ruim".

Altura, por sorteio determinístico (semente do mapa):

- 70% dos troncos: **6,0 a 11,0 m**, média 9,5 m;
- 22%: sub-bosque de **2,5 a 5,0 m** (embaúba nova, arbusto) — estes NÃO recebem copa
  alta, recebem touceira;
- 8%: **emergentes de 14 a 18 m**, só na parede opaca, nunca na faixa caminhável
  (emergente perto do muro bloqueia o sol da cidade).

Tronco: raio **0,13 a 0,22 m** nos comuns, **0,30 a 0,45 m** nos emergentes. O DAP real
é 12,8 cm (raio 0,064 m) — o raio foi DOBRADO de propósito: tronco de 6 cm some a 15 m
e o colisor fica invisível, que é o pior defeito possível numa parede de contenção.

Sub-bosque, obrigatório para a parede ler como parede e não como poste:

- **2.400 touceiras** de capim/taboa de 0,9 a 1,6 m de altura, concentradas 3:1 na
  faixa de r 38→48;
- **180 cipós e galhos caídos** atravessados entre troncos, de 1,2 a 3,0 m;
- **12 moitas de bambu** de 7 a 9 m, uma a cada 30 m de perímetro, para quebrar a
  repetição do cilindro.

### 4.3 O teste de opacidade (é isto que fecha a cidade)

A régua visual da parede: **de qualquer ponto a 2 m para dentro da mata, olhando para
fora na horizontal, o céu não pode ocupar mais de 3% do quadro, e a visibilidade
horizontal tem de cair abaixo de 10 m.** Operacionalmente isso quer dizer que a soma
das larguras projetadas de tronco + touceira + copa baixa, num corte de 10 m à frente
do observador na altura do olho (1,62 m), tem de passar de 100% de cobertura.

Com 20 troncos/100 m² de raio médio 0,175 m (0,35 m de largura projetada cada) e
2.400 touceiras de 0,8 m de largura aparente, um corredor de 10 m × 2 m tem em média
4 troncos (**1,4 m** projetados) e 5,7 touceiras (**4,6 m** projetados) = 6,0 m de
largura ocupada para 2,0 m de abertura — **3,0× o
mínimo**. A conta fecha com folga, e fecha por SUB-BOSQUE, não por tronco: cortar a
touceira para ganhar draw call é o jeito mais rápido de reabrir o mapa.

### 4.4 Bocas de trilha

As 10 bocas (coordenadas do `MapaJava`: norte z ≈ −47 em x = −26, −4, 22; sul z ≈ +47
em x = −22, 2, 27; oeste x ≈ −47 em z = −17, 19; leste x ≈ +47 em z = −21, 15).

Leitura de arte exigida em cada uma:

- largura de trilha **3,5 m**, chão de terra batida `#5a5045` com **8 a 12 marcas de
  casco** de 9 cm por metro linear;
- **túnel, não vão**: a copa tem de fechar por cima da trilha a **3,0–4,5 m**, de forma
  que o pixel no fim da trilha seja mais escuro que `#101814`. Boca clara lê como saída
  do mapa e é exatamente o convite que o dono não quer;
- a trilha **dobra em até 12 m** e morre numa clareira de 7 m; nenhuma trilha enxerga a
  borda da arena;
- moldura obrigatória: 2 troncos tombados cruzados na entrada, altura de joelho
  (0,45 m), e capim pisado deitado nos 2 m iniciais;
- a boca é o ÚNICO ponto do perímetro em que o reboco do muro é interrompido — do lado
  da cidade, o jogador identifica as 10 bocas por contraste de material (muro claro
  `#9e9b95` ↔ terra `#5a5045`) sem precisar de ícone.

---

## 5. A cidade

### 5.1 Alturas

| elemento | altura | nota |
| --- | --- | --- |
| meio-fio | 0,15 m | o degrau que prova que o chão NÃO é plano |
| soleira de porta | +0,18 m sobre a calçada | javaporco entra, mas tropeça |
| murete de jardim | 0,60 m | 20% dos lotes |
| muro de lote padrão | **1,80 m** | esp. 0,15 m |
| muro de esquina / fundo | **2,20 m** | esp. 0,20 m |
| parede de casa térrea | **3,00 m** (pé-direito 2,80 + laje) | |
| cumeeira de casa térrea | **4,10 m** | telhado 4 águas, inclinação 25% (telha cerâmica pede 25–30%) |
| sobrado — parede | **6,00 m** | telhado não acessível, é colisor |
| sobrado — cumeeira | **7,30 m** | |
| loja com interior | parede 3,40 m, cumeeira 4,60 m | porta de aço de 2,70 × 2,40 m |
| poste de concreto | **9,0 m**, seção 0,18 × 0,25 m | 26 postes, um a cada 28 m de rua |
| caixa d'água em torre | **8,5 m** até a base do tanque | 1 unidade, marco visual do centro |
| campanário da igrejinha | **9,8 m** | 1 unidade, o único volume que compete com a mata |

### 5.2 Larguras e lotes

Da malha do `MapaJava`: ruas em x = 0, ±23 e z = 0, ±23. Isso recorta o miolo de 72 m
em quatro faixas por eixo:

- faixas de borda: **9,0 m brutos** → 2,0 m de calçada → **7,0 m úteis de lote**;
- faixas internas: **13,0 m brutos** → 2,0 m de calçada em cada lado → **9,0 m úteis**.

Casa térrea padrão: **6,5 × 8,0 m**, recuo frontal 0 (casa colada na calçada, que é
como é no interior). Lote de borda recebe casa de 6,5 × 6,0 m.

Contagem de edificações: **3 a 5 por quarteirão × 16 quarteirões = 56 a 72
edificações**, sendo:

- **4 lojas com interior acessível** (mercearia, padaria, loja de ração, bar) — ver §6;
- **8 sobrados** de 2 pavimentos, distribuídos 2 por quadrante, nunca dois lado a lado;
- 1 igrejinha com campanário, 1 torre de caixa d'água, 1 galpão de 12 × 8 m;
- o resto, casa térrea.

Rotação: **15% a 25% das massas giradas de 2° a 14°** em torno de y (a régua ORT1 do
`MapaJava` cobra ≥ 15%). Casa de interior não é CAD: três casas perfeitamente alinhadas
seguidas é defeito de arte, não economia.

### 5.3 Desgaste — o que tira o "lowpoly" sem custar draw call

Tudo abaixo é textura/decal/vértice, não malha nova:

- **asfalto**: 18 remendos de tar escuro (`#4a4846`), 24 buracos rasos, faixa central
  desbotada presente em só 40% do comprimento;
- **calçada**: 1 placa quebrada a cada 6 m, mato de junta (`#825c2e`) em 30% das juntas,
  3 tampas de bueiro de 0,60 m por avenida;
- **fachada**: mancha de umidade subindo 0,8 m do chão em 60% das paredes, descasque de
  pintura em 35%, barra de pintura mais escura até 1,10 m em 50% (é o costume local);
- **fiação**: 3 a 5 cabos por vão entre postes, catenária de flecha **0,9 m** em vão de
  28 m, emaranhado em 6 dos 26 postes. A fiação é UMA malha única mesclada no mapa
  inteiro, nunca um `Mesh` por cabo;
- **pichação**: reaproveitar `graffiti_pass.js` como os outros mapas, cobertura alvo de
  4% a 7% da área de muro.

---

## 6. Lixo, comida e o que o javaporco revira

O contrato pede `foodSpots: [{id,x,z,hp,kind}]` com `kind ∈ 'lixo'|'feira'|'cacamba'|'racao'`.
Proposta de arte: **14 foodSpots**, nunca dois no mesmo quarteirão, e pelo menos um por
quadrante a ≤ 14 m de uma boca de trilha (o bicho tem que encontrar comida logo depois
de entrar, senão a invasão vira corrida até o objetivo).

| kind | quantos | peça base | medida |
| --- | --- | --- | --- |
| `lixo` | 6 | monte de 3 a 5 sacos pretos + 1 lixeira 240 L tombada | saco 0,70 × 0,50 × 0,45 m; lixeira 1,07 × 0,73 × 0,58 m |
| `cacamba` | 2 | caçamba de entulho `#b85828` | 3,00 × 1,60 × 1,20 m, 0,25 m acima do chão sobre 2 sapatas |
| `feira` | 4 | banca com toldo + caixotes | banca 2,00 × 1,00 m, tampo a 0,85 m, toldo a 2,20 m |
| `racao` | 2 | pilha de sacos de ração na loja de ração e no galpão | saco 0,80 × 0,45 × 0,25 m, pilha de 6 |

Peças cênicas (não são `foodSpots`, são o estrago):

- **48 peças de lixo solto** (saco, caixa de papelão, garrafa PET, caixote virado,
  engradado) espalhadas; 60% delas na faixa de 3 m das calçadas;
- **9 bancas** na praça/feira, 22 caixotes de fruta, 2 estrados de pallet;
- **6 lixeiras 240 L** em pé nas esquinas (as que o bicho ainda não derrubou);
- **estado "revirado"**: cada `foodSpot` precisa de DOIS estados de malha — íntegro e
  revirado (saco rasgado, conteúdo espalhado num disco de 1,6 m). A troca é por
  `visible`, não por carga nova.

Interior das 4 lojas: porta de aço aberta de 2,70 m, balcão de 3,0 × 0,7 m, 2
prateleiras de 2,0 × 0,4 × 1,8 m, piso de cerâmica `#9e9b95`. Profundidade útil 6 m —
cabem 3 javaporcos de 1,8 m e o jogador, com 1,8 m de corredor livre (o mínimo da ficha
de modo).

---

## 7. Teto de desenho

### 7.1 O que eu medi, e com quê

Duas medições diferentes, as duas reais:

**(a) Grafo de cena em node**, `tools/eval/harness.mjs` + contagem de `Mesh` /
`InstancedMesh` na `world.root` (script em `/tmp/javaporcos-arte/medir-cena.mjs`,
rodado em 29/10/2026). Em node nenhum GLB carrega, então este número é a **geometria
AUTORAL** do mapa — exatamente o que este brief encomenda:

| mapa | malhas na root | InstancedMesh | instâncias | materiais |
| --- | --- | --- | --- | --- |
| `escadao` | 1.145 | 37 | 1.486 | 197 |
| `quebrada` | 1.432 | 0 | 0 | 256 |
| `velho_oeste` | 679 | 86 | 4.668 | 83 |
| `parque_treta` | 542 | 16 | 968 | 75 |
| `corrego` | 424 | 66 | 568 | 166 |
| `amazonia` | 346 | 1 | 220 | 53 |
| `praca_poderes` | 193 | 28 | 1.812 | 59 |
| **`invasao_javaporcos` (hoje)** | **111** | **1** | **600** | **26** |

**É este o número da reprovação.** O mapa tem 111 malhas autorais: **7,8% do
`quebrada`**, 16% do `velho_oeste`, 9,7% do `escadao`. Não existe direção de arte que
salve 111 caixas — o conserto é encomendar objeto.

**(b) Draw calls por frame no navegador**, já medidos pela casa e gravados em
`tools/eval/cena-tetos.mjs` (medição de 12/09/2026, Chrome headless com GPU real):
`mansao` 2.065 · `quebrada` 1.975 · `atacadao` 1.534 · `penitenciaria` 1.247 ·
`obras` 1.040 · `velho_oeste` 838 · `lajes` 735 · `upa_24h` 688 · `amazonia` 629 ·
`parque` 586 · `corrego` 525 · `praca_poderes` 451 · `escadao` 393.

Relacionando (a) com (b) nos sete mapas acima, a razão `calls / objetos-na-root` fica
entre 0,33 (`escadao`, que mescla muito e tem oclusão agressiva) e 2,04
(`praca_poderes`, que é quase todo GLB e por isso node não enxerga), com **mediana
1,10**. Ou seja: **o número de objetos autorais é, na prática, uma estimativa direta de
draw calls por frame**, e é com ele que o modelador consegue trabalhar sem abrir o
navegador.

### 7.2 Sobre "60 fps em SwiftShader"

SwiftShader é o rasterizador por software que as capturas da casa usam quando não há
GPU, e ele NÃO roda este jogo a 60 fps: o próprio repositório registra
**~6 fps** (`authored-identity-check.mjs`: "headless com swiftshader roda a ~6 fps e o
dt clampa em 50 ms") e **0,3 fps** em cena pesada (`bug55-evidence-capture.mjs`).
Portanto o alvo de 60 fps é em GPU real, e o portão que vale é o de
`cena-check.mjs` + `cena-tetos.mjs`: draw calls e triângulos por frame. Prometer
"60 fps em SwiftShader" seria prometer um número que nenhum mapa do catálogo entrega.

### 7.3 O orçamento

**Teto proposto para `invasao_javaporcos`: 1.400 draw calls e 1.600.000 triângulos por
frame.** Fica acima de `velho_oeste` (838 medido) e `lajes` (735), abaixo de `quebrada`
(1.975) e `mansao` (2.065). É o patamar de "mapa caro mas não o pior", que é o que o
pedido "igual ou melhor que os outros mapas" significa em número. O valor entra em
`tools/eval/cena-tetos.mjs` **depois** de `cena-check.mjs --medir` rodar no mapa novo —
teto escrito em prosa e nunca medido é exatamente o que o cabeçalho daquele arquivo
proíbe.

Repartição encomendada (objetos autorais na `root`, que é o que o modelador controla):

| bloco | não-instanciado | InstancedMesh | instâncias | tris aprox. |
| --- | --- | --- | --- | --- |
| chão, ruas, calçadas, meio-fio, praça | 26 | 2 | 420 | 40 k |
| 56–72 edificações (corpo, telhado, porta, janela) | 280 | 0 | 0 | 190 k |
| muros, portões, muretas | 54 | 2 | 180 | 60 k |
| postes + fiação (fiação é 1 malha mesclada) | 27 | 1 | 26 | 35 k |
| interiores das 4 lojas | 48 | 0 | 0 | 30 k |
| lixo, feira, caçambas, props de rua | 62 | 4 | 420 | 90 k |
| veículos (GLB reaproveitados, com fallback) | 7 | 0 | 0 | 120 k |
| **mata** (troncos, copas, sub-bosque, cipó, bambu) | 12 | **12** | **5.840** | **130 k** |
| córrego, barranco, 2 pontes | 18 | 1 | 60 | 25 k |
| **soma autoral** | **534** | **22** | **6.946** | **~720 k** |
| reserva para horda (até 40 bichos × 2 calls) | — | — | — | 80 calls / 400 k |
| reserva para jogadores, bots, armas, pós | — | — | — | ~250 calls / 300 k |

Soma esperada por frame: ~556 objetos autorais (nem todos visíveis ao mesmo tempo) +
~330 de horda e jogadores → **folga de pelo menos 35% contra o teto de 1.400**. A folga
é deliberada: o modo coloca 40 bichos na tela de uma vez, e é aí que o frame dói.

Regras duras:

1. **A mata inteira cabe em 12 `InstancedMesh`** (4 troncos, 3 copas, 3 sub-bosques,
   1 cipó, 1 bambu) para 5.840 instâncias: 1.623 troncos, 1.623 copas, 2.400 touceiras,
   180 cipós e 12 bambus. Um `Mesh` por peça de vegetação seriam **3.246 draw calls** só
   de tronco e copa — sozinho, mais que o dobro do teto.
2. **Materiais ≤ 90** no mapa inteiro (hoje são 26; `quebrada` tem 256 e é o mapa mais
   lento do catálogo, 66 fps medidos). Material é troca de estado: dois materiais com a
   mesma textura e cores diferentes devem virar um material com variação por vértice.
3. **Nada de `Mesh` por cabo, por telha, por tijolo ou por folha.** Telha é textura,
   fiação é malha mesclada, folha é cartão.
4. Copa distante (r > 48) é cruz de 3 quads (12 tris). Copa de perto, só a primeira
   fileira (≤ 480 unidades), ganha volume de 80 tris.

---

## 8. Leitura de silhueta a partir do cruzamento central

Observador no cruzamento das avenidas (0, 0), olho a 1,62 m, câmera na horizontal.
Os ângulos abaixo são a altura aparente de cada massa — `atan((altura − 1,62) / distância)`
— e são o que define se o mapa "fecha":

| direção | o que o jogador vê, em ordem de profundidade |
| --- | --- |
| **Norte (−z)** | 12 m de asfalto → cruzamento de z = −23 → última fileira de casas térreas em z ≈ −34 (cumeeira 4,10 m, **4,2° de altura aparente**) → parede de mata a partir de z = −36 (dossel 9,5 m, **12,3°**) e emergentes de 16 m a partir de z = −41 (**19,3°**). Em ângulo aparente a mata é **2,9×** o telhado que está na frente dela: o horizonte some. Bloqueio de visada: ônibus escolar parado em z = −17 fecha a faixa central da avenida a **17 m**; a maior visada limpa que sobra, pela calçada, é de **34 m**. |
| **Sul (+z)** | mesma leitura, mas a praça/feira ocupa z = +6 a +19: 9 toldos a 2,20 m (**2,8°** a 12 m, e 40% da largura do quadro) e a caçamba `#b85828` em z = +14 — a única mancha saturada do mapa, e ela existe para puxar o olho para onde o javaporco vai. Linha limpa cortada em **28 m**. |
| **Leste (+x)** | sobrados em x = +19 e x = +30 (cumeeira 7,30 m, **16,6°** e **10,7°**) escalonados, depois a mata (**12,3°** a partir de x = +36). É a direção com mais oclusão vertical: nenhuma visada limpa passa de **31 m**, e o sobrado de x = +19 tapa a copa que está atrás dele. |
| **Oeste (−x)** | igrejinha com campanário de 9,8 m em x = −27 (**16,9°**) e a torre da caixa d'água de 8,5 m em x = −12 (**29,8°**, é o marco de orientação do mapa). Os dois passam da copa (12,3°): é a única direção em que a cidade vence a mata, e é de propósito — o jogador precisa de UM eixo para se localizar. |
| **Para cima** | fiação em 3 a 5 cabos cruzando todas as avenidas a 7,2 m de altura, catenária de 0,9 m. Em qualquer visada horizontal, pelo menos 2 cabos atravessam o quadro. |
| **Para baixo** | meio-fio de 0,15 m, soleira de 0,18 m, 24 buracos e 18 remendos. O chão tem de ter relevo VISÍVEL — é o par visual do `groundHeightAt` real (o bicho ia por baixo da terra porque o chão era 0 fixo). |

Regra que resume a seção: **de qualquer ponto da cidade, olhando para qualquer lado na
horizontal, o topo da copa tem de cair entre 11° e 20° acima do horizonte, e nenhum
trecho de céu pode encostar no horizonte — exceto a oeste, onde campanário e caixa
d'água assumem a silhueta.** É assim que o jogador entende, sem texto e sem parede
invisível, que não existe saída pelos quatro lados.

---

## 9. Referências factuais

- Densidade e altura de capoeira / floresta secundária de Mata Atlântica:
  - Dinâmica das formações florestais secundárias da Mata Atlântica (UFSC) — estágio
    arbóreo avançado: DAP médio 12,8 cm, altura média 9,5 m, área basal 39,9 m²/ha;
    estágio arbustivo com 94% dos indivíduos até 5 cm de DAP.
    https://legado.moodle.ufsc.br/mod/resource/view.php?id=1141210
  - A sucessão secundária da Mata Atlântica na região de Cubatão-SP — 1.983,3 ind/ha.
    https://rif.emnuvens.com.br/revista/article/download/246/229
  - Caracterização da vegetação secundária do bioma Mata Atlântica (Bioscience Journal /
    UNESP Botucatu) — 1.803, 1.700 e 1.516,2 ind/ha em três talhões.
    https://seer.ufu.br/index.php/biosciencejournal/article/download/18116/13456/0
  - Reserva da Biosfera da Mata Atlântica — dossel de floresta ombrófila densa madura
    de 20 a 30 m (o patamar que o nosso cinturão deliberadamente NÃO usa).
    http://www.rbma.org.br/anuario/mata_02_eco_floresta_ombrofila_densa.asp
- Escala do animal:
  - IBAMA, cartilha do javali asselvajado — comprimento ~1,3 m, ~80 kg, cernelha 1,0 m
    nos machos, pelos longos pretos, miscigenados até 250 kg.
    https://www.ibama.gov.br/phocadownload/biodiversidade/javali/ibama-cartilha-javali_asselvajado.pdf
  - Brasília Ambiental (IBRAM) — javaporco: mais de 130 kg, 1,30 a 1,80 m.
    https://www.ibram.df.gov.br/caracteristicas-do-javali-sus-scrofa-scrofa-e-do-javaporco-sus-scrofa
- Javaporco em área urbana revirando lixo (o cenário do modo, documentado):
  - Alfenas-MG, 11/05/2026 — animal fuçando lixo em rua residencial.
    https://minasacontece.com.br/noticias/javaporco-e-avistado-fucando-lixo-em-rua-de-alfenas-e-imagem-chama-atencao-nas-redes-sociais/
  - ((o))eco — o javali no Brasil: passado, presente e futuro de uma praga incompreendida.
    https://oeco.org.br/analises/o-javali-no-brasil-passado-presente-e-futuro-de-uma-praga-incompreendida/
- Tetos de cena medidos da casa: `tools/eval/cena-tetos.mjs` (medições de 11/08, 12/09 e
  rebaseline de 18/10/2026).
- Patamar visual de referência no código: `public/js/map_brasilia.js` e
  `public/js/map_quebrada.js` (horizonte por `setMapSky`, névoa aérea por `makeAerialFog`,
  detalhe por `detailFor`, pichação por `grafitar`, vida ambiente por
  `createFavelaAmbience`). O mapa dos javaporcos hoje não usa NENHUM dos cinco.

---

## 10. Procedência das imagens

As seis artes da §2 foram geradas por modelo de imagem (OpenRouter,
`google/gemini-3-pro-image`) a partir de prompts escritos para esta entrega, em
29/10/2026. Não derivam de fotografia identificável, não reproduzem município, pessoa,
marca ou propriedade real, e não carregam licença externa. São material de direção de
arte: nenhuma delas é carregada pelo jogo em runtime, e as duas publicadas em
`public/img/map-previews/` usam prefixo `ref-` justamente para não entrarem no menu de
mapas, que monta o caminho por id (`/img/map-previews/${id}.jpg`).

Os hex da §3 foram EXTRAÍDOS dessas imagens por amostragem de pixel, não escolhidos a
olho; o script de amostragem é descartável e viveu em `/tmp/javaporcos-arte/paleta.mjs`.
