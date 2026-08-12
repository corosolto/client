# RÉGUA DE CONSISTÊNCIA — CORO SOLTO / CS BRASIL

> Substitui `BAR.md` como régua **primária** do Gauntlet Loop.
> `BAR.md` continua válida só como referência técnica de iluminação/material.
> Quando as duas discordarem, **esta aqui manda**.

---

## 1. A troca de régua

1. A régua velha (`BAR.md`) media **fidelidade fotorrealista** contra CS2 e VALORANT: lightmap,
   bounce, probe, densidade de texel, AO, cubemap, resolução de normal map.
2. Ela media isso **por asset isolado**, num screenshot parado, sem o jogador dentro.
3. Otimizar contra ela produziu exatamente o resultado previsível: **assets individualmente
   melhores e um jogo pior**. Armas mais bonitas e **iguais entre si**; mãos mais realistas e
   **soltas da arma**; pós-processamento melhor e **personagens dessaturados**; mira e zoom
   quebrados porque nenhum critério da régua velha olhava para eles.
4. Ela nunca teve como reprovar uma mudança que **melhora o pixel e destrói o flow** — e é
   isso que aconteceu repetidamente neste projeto.
5. A régua nova mede **CONSISTÊNCIA e FLOW**: identidade de arma, enquadramento do viewmodel,
   ADS que funciona, animação completa, leitura de inimigo, limpeza do espaço de jogo e
   **um estilo só**.
6. Ela julga o **jogo em movimento**, não o frame parado. Todo critério é PASS/FAIL e é
   verificado em captura de gameplay, não em render de vitrine.
7. **CONSISTÊNCIA > FIDELIDADE.** Um jogo inteiro em nível de detalhe médio e coerente vence
   um jogo com três assets AAA e trinta assets de outra época na mesma tela.
8. **Toda melhoria visual que quebra flow é uma REGRESSÃO** e deve ser revertida, mesmo que o
   screenshot novo seja objetivamente mais bonito que o velho. Não existe "fica assim por
   enquanto que depois a gente arruma a animação".
9. A referência de nível de detalhe não é CS2. É **CS 1.6, VALORANT e ev.io** — três jogos que
   o dono escolheu justamente porque em todos eles *tudo casa*.
10. Critério final, na palavra do dono: **"o usuário não pode notar todos esses bugs, ele tem
    que se preocupar em jogar e não com bugs."** Se o jogador percebe o defeito, é FAIL —
    independentemente de quão sofisticada seja a técnica que o produziu.

---

## 2. O alvo visual, lido nas referências

### 2.0 Inventário das referências (`/root/ref/`)

| Apelido | Arquivo | O que é |
|---|---|---|
| **VAL-1** | `a-gameplay-screenshot-of-from-valorants-closed-beta_pdy9.jpg` | VALORANT beta — corredor de azulejo, pistola, dois inimigos a ~15 m |
| **VAL-2** | `an-image-of-playing-like-duelist-in-valorant.jpg` | VALORANT — pátio, rifle, mural pintado à mão, caixas verdes |
| **EVIO-1** | `EVIO-1.jpg` | ev.io — cidade azul-noite, rifle laranja/lima |
| **EVIO-2** | `ev-io_xl.jpg` | ev.io — cânion, inimigo cinza/laranja em primeiro plano |
| **EVIO-3** | `images.jpg` | ev.io — sniper com luneta laranja bem visível no quadril |
| **CS-1** | `found-this-picture-of-cs-1-6-made-me-think-of-the-old-days-v0-fwv4msree0h21.jpg` | CS 1.6 — Dust, M4, inimigo a ~40 m em 640×480 |
| **CS-2** | `28fxa9obt69g1.jpg` | CS 1.6 — túnel de Dust2, M4, caixas |
| **CS-3** | `0000002535.1920x1080.jpg` | CS/CZ — escritório, AK disparando, inimigo de terno claro |
| **CS-4** | `images_(1).jpg` | CS — faca, containers, duas mãos |
| **CS-5** | `images_(2).jpg` | CS 1.6 — kill, paredes claras, M4 |
| **CS-6** | `images_(3).jpg` | CS 1.6 — Dust, AK, céu |
| **CS-7** | `images_(4).jpg` | CS 1.6 — Italy, arma largada no chão, HUD completo |
| **ANTI** | `working-on-a-fps-some-in-game-screenshots-v0-k4i943tyii561.jpg` | FPS indie realista (hangar). **Não é nenhum dos três jogos-alvo.** É o contraexemplo: realista, dessaturado, contraste baixo, arma preta contra fundo cinza-azulado, zero identidade. É para onde este projeto estava indo. |

### 2.1 Nível de detalhe de textura

**O alvo é "2D aplicado no 3D", palavra do dono.** As três referências convergem:

- **VAL-2**: o mural gigante na parede da direita é uma **pintura chapada** — sem normal map,
  sem grão, sem specular break-up. É uma ilustração colada num plano. Ocupa 25% do frame e é
  o elemento mais elaborado da cena, e mesmo assim tem **duas cores** (creme e verde-água).
- **VAL-1**: a parede inteira é **azulejo = 1 padrão repetido** + **1 faixa de losango** +
  **1 rodapé**. Três elementos, três metros de altura. Nada de sujeira procedural, nada de
  decal aleatório, nada de "variação".
- **CS-2**: o corredor tem **duas famílias de caixa** (verde-metal e madeira), a mesma malha
  repetida. O chão é **um** material de areia. A parede é **um** material de pedra + a faixa
  de topo.
- **EVIO-1/2**: superfície é **cor sólida + linha de contorno**. Zero textura.

**Regra derivada (mensurável):**
- Nenhuma superfície grande (>4 m²) pode ter mais de **2 padrões distintos** (o dominante + 1 faixa/rodapé).
- **Nenhum detalhe de textura pode ser invisível a 10 m.** Se o detalhe só aparece quando o
  jogador encosta o nariz, ele custa GPU e não entrega nada — ele é ruído. Teste: renderize a
  superfície a 10 m; se o padrão desaparece, ele está fino demais.
- Densidade de texel **uniforme** pelo mapa (§3.1). Nada de uma parede a 512 px/m ao lado de
  outra a 64 px/m — é isso que faz a segunda parecer quebrada.

### 2.2 Quantidade de props por frame

Contagem direta nas referências, na banda de **0 a 5 m** da câmera:

| Ref | Objetos distintos em 0–5 m | Famílias de malha |
|---|---|---|
| VAL-1 | 3 (bueiro, luminária, almofada laranja) | 3 |
| VAL-2 | 4 (3 caixas iguais + 1 tábua) | 2 |
| CS-2 | 4 (2 caixas verdes + 2 de madeira) | 2 |
| CS-3 | 5 (console, caixas, barris, mesa, monitor) | 4 |
| EVIO-1 | 1 | 1 |

**Regra derivada:** máximo **4 objetos distintos** e **2 famílias de malha** na banda 0–5 m
de qualquer posição jogável. Acima disso a cena vira sopa e o inimigo some dentro dela.
CS-3 é o teto absoluto e é um mapa de *escritório*, feito para ser cheio.

### 2.3 Paleta

- **VAL-1**: tudo em **uma família quente** — bege, terracota, marrom. O **único** verde/ciano
  do frame é *gameplay*: a zona de habilidade no chão e os nomes de aliado. Isso é a regra mais
  poderosa e mais barata da referência inteira.
- **VAL-2**: pátio inteiro em terracota/creme/oliva. O **único** verde-menta são as **caixas
  destrutíveis**. O vermelho só aparece no muzzle flash e no marcador do inimigo.
- **CS-1/CS-6**: Dust é **uma cor** — areia. O inimigo é escuro. Ponto.
- **EVIO-1**: mapa inteiro em 4 tons de azul; a **arma** carrega laranja + lima, cores que **não
  existem no cenário**. A arma nunca some no fundo, de graça.
- **ANTI**: cinza-azulado dessaturado do teto ao chão, arma preta sobre fundo escuro, sem
  nenhum acento. É ilegível e é exatamente o defeito.

**Regra derivada:**
- **Uma família de matiz por mapa**: ≥90% dos pixels do cenário dentro de uma janela de **±30°
  de hue** (mais neutros).
- **No máximo 2 cores de acento por mapa**, e elas são **reservadas a gameplay** (time, objetivo,
  utilidade, interativo). Decoração não pode usar cor de acento. Se o vermelho de time também
  é a cor de um toldo, o toldo vai matar o jogador.
- **A arma tem acento próprio** ausente do cenário (EVIO-1/2/3 fazem isso descaradamente; VAL-1
  usa a luva laranja; CS-1/2 usam o antebraço cor de pele contra areia).

### 2.4 Contraste e leitura do inimigo

- **CS-1**: o inimigo é um borrão escuro de ~20 px de altura contra areia clara a ~40 m — e
  mesmo em 640×480 é inconfundível. Isso é **contraste de valor**, não resolução.
- **CS-3**: o inimigo está de **terno branco** num ambiente de madeira escura. Deliberado.
- **VAL-1**: personagens em tons escuros/saturados contra azulejo claro e uniforme, **mais** o
  ícone da arma e o nome flutuando acima da cabeça, **mais** rim light por time.
- **EVIO-2**: o inimigo é cinza-claro com acento laranja sobre chão rosa-avermelhado.

**Regra derivada:** ΔL* (CIELAB) entre o corpo do personagem e o fundo mediano **≥ 20** nas
distâncias de 5 m, 20 m e 40 m, **ou** um contorno/rim explícito que o compense. Já existe
instrumentação para isso em `public/js/characters.js` (rim por time) e `tools/eval/char_sim.py`.

### 2.5 Tratamento de superfície

- Nenhuma das referências usa specular forte no cenário. VAL-1/VAL-2: tudo fosco. CS: tudo fosco.
  ev.io: flat, sem specular nenhum.
- Sombra: CS-2 usa um **blob escuro** no chão. É falso, é barato, e **está lá em todos os frames**.
  Consistência vence técnica.
- Iluminação de cenário assada e chapada; personagens acesos por um termo separado. É
  literalmente o que a Riot documenta: ambientes com lightmap offline, objetos dinâmicos com
  uma direcional só, para que **o ambiente não compita com o personagem**.

### 2.6 Enquadramento do viewmodel

Medido nas referências (caixa que contém arma + mão + antebraço, em fração da tela):

| Ref | Borda esquerda (x/W) | Borda superior (y/H) | Cruza o centro? |
|---|---|---|---|
| VAL-1 (pistola) | ~0,62 | ~0,58 | não |
| VAL-2 (rifle) | ~0,58 | ~0,55 | não |
| CS-1 (M4) | ~0,55 | ~0,59 | não |
| CS-2 (M4) | ~0,53 | ~0,55 | não |
| EVIO-1 (rifle) | ~0,53 | ~0,54 | não |
| EVIO-3 (sniper) | ~0,52 | ~0,45 | não |

**Convergência absoluta:** o viewmodel vive no **quadrante inferior direito**. Borda esquerda
entre **0,52 e 0,64**; borda superior **nunca acima de 0,45**. O **centro da tela (±8%) está
livre em 6/6 referências**. Isso confirma o número que o próprio projeto já mediu contra CS2
(`game.js`: borda esquerda da AK em 0,634, "dentro de 0,62–0,65").

**Tamanho aparente e mão:**
- CS (CS-1/2/3): antebraço **nu**, enorme, entra pela borda inferior e sobe até ~metade da
  altura do bloco. A mão está **claramente fechada** no guarda-mão e no punho.
- VALORANT (VAL-1/2): só **mão + punho + um palmo de manga**. Bem menos braço que CS.
- ev.io: mão pequena, quase só o punho.
- Em **todas**, a mão **toca a arma**. Não existe uma referência com mão flutuando.

**Regra derivada:** mão + antebraço ocupam entre **15% e 35%** da área do bloco do viewmodel, e
o contato mão↔arma é obrigatório em **100% dos frames de 100% das animações**.

**Lente do viewmodel:** o VM usa FOV próprio, mais fechado que o do mundo (o projeto já faz
isso: `vmFovForAspect`, V0 = 62° contra 70° do mundo, com FOV **horizontal** constante). Isso
não é firula: FOV largo no VM distorce a borda do quadro e é o que transforma antebraço em
"tubo". Todos os jogos-alvo separam as duas lentes.

### 2.7 HUD

Todas as seis referências jogáveis põem os mesmos quatro blocos nos mesmos quatro lugares:
minimapa/radar em cima à esquerda (VAL-1, CS-1, CS-5, CS-6, CS-7, EVIO-2); vida/recursos
embaixo à esquerda ou centro (todas); munição embaixo à direita (todas); e ícone da arma
atual embaixo à direita (VAL-1, EVIO-1, EVIO-2). Mira sempre no centro geométrico, sempre
pequena, sempre de cor de acento (verde em CS, branco/ciano em VALORANT e ev.io). Não invente.

---

## 3. Regras de UM ESTILO SÓ

O defeito nomeado pelo dono é **"100 estilos diferentes"**. Este projeto tem hoje, na mesma
tela, no mínimo **três pipelines de viewmodel**: viewmodels estáticos dedicados por arma
(`DED_VM` — 8 armas), malha de classe + textura-variante + attachments procedurais
(`RIFLE_VM`/`SNIPER_VM`/`PISTOL_VM`/`SHOTGUN_VM`), e o fallback procedural antigo. São 26 IDs de
arma servidas por ~4 malhas-base. Isso não é uma falha de execução, é uma falha de cânone.

O cânone abaixo é **normativo**. Um asset que não obedece não entra, por mais bonito que seja.

### 3.1 Um nível de detalhe de textura
- **Uma densidade de texel para o mapa inteiro**, declarada por mapa (ex.: 128 px/m). Tolerância:
  **±50%**. Nenhum asset pode passar de **1,5×** a densidade mediana do mapa.
- Nenhum detalhe de textura invisível a 10 m (§2.1).
- Sem detail-normal, sem micro-arranhão, sem poeira procedural. Se o cânone é "2D no 3D",
  o normal map é decoração, não informação.

### 3.2 Um tratamento de material
- **Um** `MeshStandardMaterial` fosco (roughness 0,85–0,95, metalness 0) para **todo** o cenário.
- Metal só nas armas e em elementos de gameplay. Nenhuma parede reflete.
- Nada de material com pipeline próprio ("esse asset veio com PBR completo, deixa"). Ou entra
  no material canônico, ou não entra.

### 3.3 Uma escala de ruído/grunge
- Grunge é **um** conjunto: a mesma máscara, a mesma frequência, a mesma intensidade, em tudo.
- Grunge se aplica **na base do material**, não como camada por asset. Um asset "mais sujo" que
  os vizinhos lê como asset de outro jogo.
- Intensidade máxima: o grunge não pode alterar o valor local em mais de **±12% de L***. Acima
  disso ele passa a competir com a silhueta do inimigo.

### 3.4 Uma família de cor por mapa
- Cada mapa declara **1 matiz dominante ±30°** + até **2 acentos de gameplay**.
- Acentos são **reservados**: vermelho/verde/azul de time nunca aparecem em decoração.
- A **arma** carrega um acento que não existe no cenário (§2.3).
- Céu e fundo distante: gradiente chapado, dentro da família. Sem nuvem detalhada, sem HDRI.

### 3.5 Uma linguagem de placa e tipografia
- **Uma** família tipográfica de mundo por mapa, com no máximo 2 pesos.
- Placas são **planas**, pintadas na superfície, sem extrusão e sem emissivo — salvo quando a
  placa é um **marco de orientação** (§4, C22), e aí ela é a exceção deliberada e única da área.
- Nada de texto que só se lê encostado. Se o jogador não lê a placa da entrada da área, ela não
  está fazendo trabalho de orientação e é ruído.

### 3.6 REGRA DE OURO
> **Nenhum asset novo pode ser mais detalhado que o cânone.**

Se um asset novo chega melhor que o cânone, existem exatamente duas saídas legítimas:
**(a)** rebaixá-lo ao cânone; **(b)** subir o cânone **e reprocessar todo o resto do mapa antes
do merge**. A saída ilegítima — e a que quebrou este projeto — é **deixá-lo entrar sozinho**.

Corolário para armas: **identidade antes de fidelidade**. Uma arma que se distingue das outras
por silhueta em 1 segundo, com malha grosseira, vale mais que uma arma linda que é a sétima
cópia da malha `rifle` com outra textura.

---

## 4. Checklist de CONSISTÊNCIA E FLOW

25 critérios. Todos **PASS/FAIL**. Todos verificados em **gameplay**, não em vitrine.
Qualquer FAIL bloqueia o merge do lote.

### Identidade de arma

**C1 — Teste do 1 segundo.**
Toda arma do arsenal é reconhecível como *aquela* arma num frame único de gameplay em 1 s.
*Método:* capture 1 frame de viewmodel por arma (`tools/eval/weapon-capture.mjs`,
`weapontest.html`). Mostre embaralhado, 1 s por frame, sem HUD. **PASS = ≥90% de acerto** para
as armas que o avaliador conhece de nome. Hoje: 26 IDs de arma, ~4 malhas-base.

**C2 — Silhueta única.**
Nenhum par de armas compartilha silhueta. *Método:* renderize a máscara binária do viewmodel de
cada arma no mesmo enquadramento; calcule IoU par a par. **PASS = IoU < 0,85 em todos os pares.**
Textura diferente com a mesma silhueta **não passa** — é o defeito que o dono nomeou.

**C3 — Sniper tem luneta, visível no quadril.**
Toda arma marcada como sniper tem uma luneta reconhecível **antes** de mirar. *Método:* frame de
quadril de cada sniper; a luneta ocupa ≥5% da área do viewmodel e é visível da posição do
jogador. Referência direta: **EVIO-3** — o tubo laranja grita "sniper" sem ADS. Hoje só
`awp`/`mosin`/`rem700` têm `scope:true`; `svd`/`g3sg1`/`sks`/`m400` são "snipers" sem luneta.

**C4 — A arma não some no fundo.**
Em cada mapa, ΔL* entre o viewmodel e o fundo mediano do frame **≥ 25**, ou a arma carrega um
acento de cor ausente do cenário. *Método:* 8 posições por mapa, `tools/eval/r3_color.py`.
Falha típica: arma preta em corredor escuro (é o defeito de **ANTI**).

### Enquadramento do viewmodel

**C5 — O viewmodel mora no quadrante inferior direito e o centro está livre.**
*Método:* caixa envolvente do VM em fração de tela. **PASS = borda esquerda ∈ [0,50; 0,66] e
borda superior ≥ 0,45; e o quadrado central de ±8% da tela 100% livre em quadril e em ADS.**
Referência: 6/6 refs (§2.6).

**C6 — Enquadramento estável em todos os aspectos.**
O mesmo frame em **16:9, 16:10, 3:2 e 21:9** produz a mesma caixa de VM (±3% de largura).
*Método:* `tools/eval/fparms-capture.mjs` nos quatro aspectos. Isto já quebrou uma vez
(bug 3:2, MacBook 3024×1964) — é regressão conhecida, fica no checklist para sempre.

**C7 — A mão está travada na arma em todos os frames de todas as animações.**
*Método:* amostre **cada 2 frames** de idle, walk, fire, reload, draw, holster e ADS, para
**todas** as armas; meça `gripError` (distância palma↔ponto de grip). **PASS = ≤ 1 cm em 100%
dos frames.** Um único frame com a mão solta reprova a arma. Nenhuma referência tem mão solta.

**C8 — Cano, mira e flash concordam.**
O cano aponta para onde a mira aponta, e o flash nasce na boca do cano. *Método:* dispare sem
spread contra uma parede a 10 m; o impacto cai a **≤1% da tela** do centro da mira. O sprite de
flash nasce a **≤5 cm** da ponta do cano em quadril **e** em ADS.

### ADS / zoom

**C9 — Ao dar ADS o jogador vê a arma E a mira.**
*Método:* capture os frames de ADS de cada arma. **FAIL** se qualquer frame tem >60% da tela
coberta por máscara/preto, ou se a mira desaparece, ou se a arma some do quadro. A "faixa preta
que pulava" já foi diagnosticada uma vez neste projeto — não pode voltar.

**C10 — ADS entra e sai sem teleporte.**
*Método:* `tools/eval/aposentados/g2r14-ads.mjs`. Transição completa em **≤120 ms**, e **nenhum frame
desloca o VM mais de 15% do trajeto total**. Um pulo de posição em 1 frame é FAIL mesmo que o
estado final esteja certo.

**C11 — Luneta de sniper estável.**
Nas armas com luneta de verdade: overlay circular centrado, sem tremor, com **sensibilidade
reduzida** e com **retorno ao quadril garantido** ao trocar de arma, morrer ou recarregar.
*Método:* 30 s de captura mirando/soltando/trocando; nenhum frame com overlay órfão.

### Animação

**C12 — Os seis estados existem, em todas as armas.**
`idle/sway`, `walk bob`, `fire kick`, `reload`, `draw/holster`, `ADS in/out`. *Método:* matriz
arma × estado; **PASS = 26/26 armas × 6/6 estados**. Falta de `reload` faz a arma recarregar
por teletransporte; falta de `draw` faz a arma aparecer do nada; falta de `bob` faz o jogador
parecer que desliza. É a diferença entre "jogo" e "cena".

**C13 — A recarga casa com o número.**
A animação de recarga dura exatamente o `reload` declarado em `WEAPONS`, e a munição volta **no
frame em que a animação termina**, nem antes nem depois. *Método:* log de tempo + captura.
Diferença **≤ 50 ms**.

**C14 — Troca de arma tem holster e draw.**
*Método:* `tools/eval/aposentados/g2r6-switch-capture.mjs`. Nenhum frame com **duas armas visíveis**;
nenhum frame com **nenhuma arma**; a arma nova entra pela borda inferior do quadro (como em
Halo/CS), não materializa na posição final.

**C15 — Zero pop.**
Em nenhuma transição de estado o VM se desloca mais de **8% da tela em 1 frame**. *Método:*
diferença de centroide do VM entre frames consecutivos ao longo de 60 s de gameplay contínuo
com troca, tiro, recarga, ADS, pulo e corrida.

**C16 — O bob obedece à velocidade.**
Amplitude do bob proporcional à velocidade; jogador parado → amplitude **zero em ≤300 ms**.
*Método:* `tools/eval/walk-video.mjs`. Bob que continua com o jogador parado é o sinal
clássico de "animação desligada da simulação".

### Leitura de inimigo e combate

**C17 — Aliado × inimigo, em 1 frame, mesmo com o mesmo modelo.**
*Método:* pares aliado/inimigo do **mesmo** personagem a **5 m, 20 m e 40 m**, em cada mapa,
frame único sem HUD. **PASS = 100% de acerto.** O canal primário é o rim por time (já existe:
`TEAM_RIM = { P: vermelho, B: verde, U: azul }` em `characters.js`); o secundário é o nome/ícone
acima da cabeça do aliado (é o que VAL-1 faz). Um canal só não passa.

**C18 — O personagem lê contra o fundo.**
ΔL* corpo × fundo **≥ 20** a 5 m, 20 m e 40 m, em 8 pontos por mapa — **ou** contorno explícito
que o compense. *Método:* `tools/eval/char_sim.py` + `r3_color.py`. Referência: **CS-1**, onde
20 px de inimigo escuro contra areia clara bastam.

**C19 — Os personagens têm cor.**
Saturação média do corpo do personagem **≥** saturação média do cenário no mesmo frame.
*Método:* `tools/eval/tone_calib.py` / `tone_sat.py`, medido **depois** de todo o pós-processamento.
Este critério existe porque já houve passe de pós que dessaturou os personagens — regressão
conhecida, entra no checklist permanentemente.

**C20 — O jogador sabe de onde veio o tiro, e sabe que acertou.**
*Método:* leve dano de 4 direções (frente, costas, dois lados) e verifique indicador direcional
visível e legível por **≥1,2 s**; e killfeed com direção/arma. No sentido inverso: hitmarker
visível ao acertar e som **distinto** para headshot. **PASS = 4/4 direções + hitmarker + som de
headshot.**

### Espaço de jogo

**C21 — A banda de 0–2 m da linha de tiro está limpa.**
Em cada ângulo de disputa do mapa, os primeiros 2 m à frente do jogador não têm geometria que
bloqueie bala sem **parecer** cobertura (quinas invisíveis, guarda-corpo fino, prop decorativo
com colisão). *Método:* raycast a partir de cada spot de disputa, cada 15°, e comparação com o
que aparece no frame. Bala que bate em nada visível é FAIL.

**C22 — Nada largado no piso jogável.**
Arma no chão, caixa solta, entulho decorativo: proibidos em corredor de disputa. Em **CS-7** a
arma largada está deitada, pequena, na lateral — e é **item de gameplay**. Decoração no chão de
corredor é lixo que come o pé do jogador e polui a leitura do inimigo. *Método:* varredura
top-down por mapa, lista de objetos com centro dentro do polígono navegável de corredor.

**C23 — Um marco de orientação por área.**
Cada área nomeada do mapa tem **exatamente um** elemento único, visível de **todas** as entradas
da área, que não se repete em nenhuma outra área. *Método:* screenshot de cada entrada de cada
área; o marco aparece em 100% delas. Exatamente um — dois marcos por área não orientam, confundem.

**C24 — Densidade de props dentro do orçamento.**
**≤4 objetos distintos** e **≤2 famílias de malha** na banda de 0–5 m de qualquer posição
jogável. *Método:* amostragem de 20 posições por mapa (`tools/eval/mapeval.html` /
`map-capture.mjs`), contagem manual. Teto derivado de VAL-1/VAL-2/CS-2 (§2.2).

### Consistência de estilo

**C25 — Um estilo só, medido.**
Três medidas no mesmo frame, as três precisam passar:
(a) **≤8 materiais distintos** por frame;
(b) **nenhum asset acima de 1,5× a densidade de texel mediana** do mapa;
(c) **≥90% dos pixels do cenário dentro de ±30° do matiz dominante**, com acentos de gameplay
    ocupando **≤5%** do frame.
*Método:* dump de materiais por frame + `tools/eval/r3_texsim.py` + histograma de hue em
`r3_color.py`, em 8 posições por mapa.

---

## 5. Anti-padrões — o que NÃO fazer

Esta lista não é hipotética. Cada item já aconteceu neste projeto.

1. **Adicionar props para "encher".** Espaço vazio não é defeito. Em VAL-1 há três objetos em
   cinco metros. Prop adicionado sem função de gameplay é ruído que esconde inimigo.
2. **Subir o realismo de uma textura sem subir o do resto.** É o gerador nº 1 de "100 estilos".
   Vale a regra de ouro (§3.6): rebaixa o asset novo, ou reprocessa o mapa inteiro **antes** do
   merge. Nunca deixa entrar sozinho.
3. **Trocar a malha de uma arma sem checar identidade.** Sete rifles com a mesma malha-base e
   texturas diferentes é *pior* que sete caixas com formatos diferentes. Se a silhueta não muda
   (C2), o trabalho foi para o lixo.
4. **Mexer no framing da arma sem validar em 16:9 E 3:2.** Já quebrou (bug 3:2). O par FOV do
   VM ↔ escala do VM se move **junto** — mexer em um sem o outro muda o tamanho aparente da arma.
   Ver o comentário em `vmFovForAspect` no `game.js`: `?vmwide=1` reverte **o par**.
5. **Adicionar passe de pós-processamento que dessatura os personagens.** Bloom, tonemap,
   grading, vinheta: todos passam por C19 **depois** de aplicados. Um passe que melhora o mapa e
   apaga os personagens é uma regressão de gameplay, não um upgrade visual.
6. **Calibrar tom pelo frame mais escuro.** O tom é calibrado pela **distribuição** de frames de
   gameplay real, não pelo canto mais escuro do mapa. Calibrar pelo pior caso levanta o preto do
   mapa inteiro, achata o contraste e destrói C18.
7. **Deixar armas largadas / entulho no piso jogável.** C22.
8. **Introduzir um pipeline de asset novo "só para essa arma".** Cada pipeline extra é um estilo
   extra. Se a arma-herói precisa de um caminho próprio, ou todas as armas migram, ou nenhuma.
9. **Aceitar animação faltando com a promessa de fazer depois.** Arma sem recarga é bug visível
   em 100% das partidas. C12 não tem exceção.
10. **Otimizar contra screenshot parado.** A régua julga vídeo. Um frame lindo com bob quebrado
    reprova.
11. **Mudar identidade por textura quando o problema é forma.** Attachment procedural e
    textura-variante são remendo; a leitura de arma é **silhueta**. Ver o histórico de
    `RIFLE_VM`/`SNIPER_VM` no `game.js`: várias rodadas de textura para resolver um problema que
    é de forma.
12. **Confiar em inspeção visual onde existe medição.** A orientação do cano das armas já falhou
    "a olho" e só se resolveu medindo a seção transversal. Se existe número, use o número.

---

## 6. Ordem de prioridade

Quando dois objetivos brigam, o de cima ganha. Sem exceção e sem negociação.

**1. Não ter bug que o jogador percebe.**
Palavra do dono: *"o usuário não pode notar todos esses bugs, ele tem que se preocupar em jogar
e não com bugs."* Mão solta da arma, arma invertida, ADS que pula, animação faltando — tudo isso
custa mais que qualquer ganho visual, porque quebra a suspensão de descrença **toda vez**, não
uma vez.

**2. Consistência.**
Um estilo só, do começo ao fim. Um jogo coeso em nível médio lê como um produto; um jogo com
três assets AAA e trinta de outra época lê como um protótipo. **Consistência é a única
propriedade que o jogador sente sem saber nomear** — e é exatamente o que ele elogiou nas
referências: *"tudo casa"*.

**3. Flow / feel.**
Movimento, bob, kick, sway, troca, recarga, ADS. É o que faz "parecer jogo". Não se compra com
polígono. Uma arma-caixa com as seis animações certas sente-se melhor que um modelo Tripo
imóvel.

**4. Legibilidade competitiva.**
Inimigo legível contra o fundo, aliado distinguível de inimigo, linha de tiro limpa, marco de
orientação. A Riot desenhou VALORANT inteiro em torno disto — ambientes "o mais baratos
possível" porque *"o jogador está bloqueando mentalmente o ambiente para focar nos personagens"*.

**5. Identidade.**
Cada arma parece ela mesma; cada mapa parece um lugar. É o que dá memória ao jogo. Vem **depois**
de flow porque uma arma com identidade forte e animação quebrada continua sendo uma arma quebrada.

**6. Fidelidade / beleza.**
Só aqui. E **só quando vem junto** com 1–5, nunca no lugar delas.

### As três regras de decisão

- **Se uma mudança melhora o pixel e piora qualquer item de 1 a 5, ela é REGRESSÃO.** Reverta.
  Não existe "aceita agora e conserta depois" — a dívida de consistência é a única que este
  projeto já provou que não paga.
- **Se um asset novo é melhor que o cânone, ou ele desce ou o cânone sobe inteiro.** Nunca ele
  entra sozinho (§3.6).
- **Se o dono precisa apontar o defeito, o defeito já custou o que ia custar.** A régua existe
  para pegar antes.

---

## Fontes

- [Riot Games — VALORANT Shaders and Gameplay Clarity](https://www.riotgames.com/en/news/valorant-shaders-and-gameplay-clarity)
  (ambiente barato de propósito; fresnel vermelho/azul por time; personagens distantes clareados;
  spec mínima "GPU integrada de CPU de 2012"; orçamento de 6,9 ms para 144 FPS; nenhuma diferença
  competitiva entre presets de qualidade)
- [Inverse — entrevista com Moby Francke, diretor de arte de VALORANT](https://www.inverse.com/gaming/valorant-art-style-interview-moby-francke)
  (*"não estamos tentando fazer o jogo mais bonito, estamos tentando fazer um jogo acessível que
  todo mundo possa jogar"*; *"VALORANT tem que rodar nas favelas do Brasil"*)
- [Riot Games — Environment Art (Art Education)](https://www.riotgames.com/en/artedu/environment-art)
- [Riot Games Technology — VALORANT Shaders and Gameplay Clarity (espelho)](https://technology.riotgames.com/news/valorant-shaders-and-gameplay-clarity)
- [Dev Unallocated — Procedural Weapon Animations, Condensed](https://www.devunallocated.com/projects/project-killhouse/procedural-weapon-animations-condensed)
  (sway/bob por velocidade; ADS aditivo × substitutivo; molas de recoil; **IK de mão preso a um
  "item bone"** — a arma manda, a mão segue; falha conhecida: holster antes do draw terminar)
- [Microsoft/343 — Halo First Person Animations](https://learn.microsoft.com/en-us/halo-master-chief-collection/h2/art/animation/animationsfpanims)
  (conjunto mínimo de clipes de 1ª pessoa: idle, ready/draw, put-away/holster, firing, reload
  full, reload empty, melee, moving, overlays)
- [The Level Design Book — Environment Art](https://book.leveldesignbook.com/process/env-art)
- [CBR — How Valorant's Art Direction Became its Secret Weapon](https://www.cbr.com/valorant-art-design-secret-weapon/)
- [csldr — Hor+ FOV scaling for widescreen](https://github.com/k0mr4d3/csldr)
  (FOV horizontal constante entre aspectos — a regra que `vmFovForAspect` implementa)

---

*Referências visuais em `/root/ref/`. Régua técnica complementar (iluminação/material) em
`BAR.md`; qualidade de asset isolado em `RUBRIC.md`. Esta régua tem precedência sobre as duas.*
