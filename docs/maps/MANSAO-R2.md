# Mansão do Joá — r2: causa e número de cada decisão

Este arquivo existe porque `eval:comentario` limita comentário novo em
`public/js/` a duas linhas: histórico, causa e número moram aqui, e o comentário
no código aponta para cá. O feedback do dono que abriu a rodada, na íntegra:

> areas low poly no jardim do respawn. Areas internas da casa toda low poly
> ainda, precisa de moldes novos, na area externa pro mar, coqueiros low poly,
> e o horizonte está com um efeito muito estranho, aviao voando, com propaganda
> no banner + animais como araras, passarinhos voando nao presente

## 1. O horizonte estranho era o céu, e as duas réguas que existiam estavam verdes

O palpite óbvio era a costura do panorama. Foi **refutado antes de qualquer
conserto**: `eval:sky-seam` media o `sky_joa.webp` da r1 em ΔL\* -0,96 / Δb\*
-0,03, e `eval:look` media fog == horizonte em ΔE76 0,0. Verde nos dois.

O defeito estava no asset e é óbvio a olho: **o `sky_joa.webp` da r1 não era
panorama**. Era uma foto retilínea de varanda de mansão — deck de pedra, piscina
de borda infinita, espreguiçadeiras, jardineira e um coqueiro — esticada para 2:1
e servida como equirretangular pelo `map_sky.js`. Num equirretangular a linha
y = H/2 é a elevação 0 e a metade de baixo é tudo que está **abaixo** do
horizonte: o jogador ficava cercado, no infinito, por um deck de pedra e por
móveis do tamanho do mundo, com folha de coqueiro na altura do olho.

A prova de que a r1 já sabia disso sem nomear está na cláusula H2 do
`mansao-beach-check.mjs`, que proíbe relevo 3D "no setor em que o `sky_joa.webp`
já tem terra assada" — trabalhar em volta do defeito em vez de medi-lo.

**Régua nova**: `eval:sky-foreground` mede o desvio-padrão de L\* na banda do
equador (o que a câmera na altura do olho amostra girando 360°).

| céu | eqSD |
|---|---|
| sky_rj | 2,00 |
| sky_brasilia | 3,15 |
| **sky_joa (r2)** | **3,21** |
| sky_havan | 3,34 |
| sky_sp | 3,99 |
| sky_quebrada | 7,95 |
| sky_ferrovelho | 8,42 |
| sky_pool | 11,36 |
| **sky_joa (r1, o defeito)** | **16,76** |

Teto **12,0** ≈ 1,05× o pior já aceito. É ratchet, não JND: passa a árvore como
ela está e reprova o defeito relatado. Mutante `movel-no-olho` cola mobília na
altura do olho do `sky_rj` (o melhor da árvore) e mede 13,80 — vermelho.

**Céu novo**: panorama de mar aberto no fim de tarde, sem primeiro plano nenhum.
Duas variações geradas e olhadas antes de publicar. `tools/sky-equirect-publica.py`
alinha o horizonte ao equador (desvio medido: 0 px — a r1 não fechava essa conta,
e o `look-horizonte.py` já assumia o alinhamento). Costura fechada em ΔL\* -0,04 /
Δb\* -0,09, a melhor da árvore. O céu da r1 fica arquivado em
`tools/eval/asset-evidence/skies/sky_joa.webp`, que o mutante `rampa-estreita` usa.

## 2. Mobília: o helper `mobilia()` e por que a marca de régua migra

`mobilia()` troca um grupo de peças procedurais por um molde do kit Mint e leva a
**marca de régua** junto. Sem isso o navegador mostra o GLB e a régua continua
medindo a caixa escondida: verde sobre o defeito, que é o BUG-02 desta base.

O colisor **não muda de dono**: quem o declara é o procedural, que continua no
grafo (só invisível). Assim corpo e bala seguem batendo onde a régua mede, e
`node`/`?glb=0` continuam com a casa mobiliada.

Pegadas medidas por `eval:mansao-glb-fit` (`targetH` → malha de mundo | colisor):

| molde | targetH | malha | colisor |
|---|---|---|---|
| mansao_sofa | 0,95 | 2,20 × 1,00 | 2,30 × 1,10 |
| mansao_poltrona | 0,98 | 0,94 × 0,90 | 1,08 × 1,02 |
| mansao_mesa_centro | 0,45 | 0,99 × 0,59 | 1,00 × 0,60 |

O colisor do sofá **encolheu** de 4,00 × 1,50 para 2,30 × 1,10 porque a malha do
molde mede 2,20 × 1,00: colisor maior que a malha visível é parede invisível — é
o defeito que a régua de fit existe para impedir. Encolher só abre passagem.

`solids` é 2D e só vale no térreo (`insideSolid` roda com `g < 1`). Móvel do
mezanino empurrado para lá derrubava um nó do hall **embaixo** dele — foi um
`MC3 grafo conexo` vermelho, achado pelo `eval:mapcontrato`. Quem segura o corpo
lá em cima é o colisor do `addBox`, que é ciente de y.

## 3. Coqueiro: por que a inclinação é medida no arquivo

A cláusula B3 do `mansao-beach-check` mede a inclinação da palma **procedural**,
porque ela roda em node e nenhum GLB carrega ali (Lição 3). Se o molde que o
navegador mostra fosse um poste reto, B3 seguiria verde sobre um coqueiro errado.

Por isso a cláusula do coqueiro no `mansao-glb-fit` mede **no arquivo**: centróide
dos 15 % de cima da malha (a copa) contra o dos 15 % de baixo (o pé do tronco).
Mede **14,0°** com a vertical; mínimo 8°, o **mesmo limiar de B3** — limiar
compartilhado por quem mede a mesma coisa, não inventado. Mutante
`--mutante=coqueiro-reto` endireita a copa e mede 0,0°.

## 4. Vida de céu: as três decisões da rota

1. **Rota paramétrica, não `pos`/`to`.** A gaivota monta uma elipse a partir de
   `pos`/`to`; para o avião isso seria declarar o raio por acidente. A rota é
   centro / raio / altura / **período** — "lento" é 90 s por volta, um número
   conferível.
2. **Banking com o sinal deduzido.** Com frente = -Z e `rotation.order = 'YXZ'`,
   o roll é o Z local e um roll **positivo** joga o topo para o -X local, que na
   volta anti-horária aponta para **fora**. Por isso `rotation.z = -banking`.
   A cláusula CV3 mede o produto escalar entre o "cima" do voador e a direção do
   centro do círculo; mutante `banking-invertido` troca o sinal e fica vermelho.
3. **A orientação do molde é medida, não assumida.** O `aviao_faixa.glb` tem o
   nariz no **-X** e a faixa no **+X** (bbox do nó `corpo`, x ∈ [-0,499; -0,009],
   contra o nó `faixa`, x ∈ [-0,011; 0,499], lido com gltf-transform). Girar
   -π/2 em Y põe o nariz no -Z, que é a frente do three.js.

Rotas: avião raio 150 m em volta de (0, -30), 62 m, 90 s — nesse raio ele nunca
entra nos bounds de 22 × 36, é vista como a praia. Duas araras sobre o jardim
(raio 26, 17 m, 26 s) e bando de 6 passarinhos sobre o terraço (raio 13, 12 m,
15 s), que em `low` cai para 3.

A faixa recebe `/img/textures/faixa_aviao.webp` (emissora **fictícia** "RÁDIO
TRETA FM 99"; veto de marca real vale aqui como no grafite). As UV são reescritas
por projeção planar XY a partir da posição dos vértices: a faixa é uma fita quase
plana, então a projeção é exata e não depende de onde o Mint assou a ilha de UV.

### Achado de revisão: o `aviao_faixa.glb` novo regredia o asset

O molde que chegou no worktree tinha a "faixa" como dois retalhos presos nas
pontas das asas, no eixo lateral, com textura ilegível — e o banner é justamente
o que o dono pediu. O que está em `HEAD` tem `corpo` e `faixa` como nós separados
e a faixa **trai atrás** do avião, pronta para receber texto. Revertido para o de
`HEAD`; quem marcou a divergência de SHA foi o `eval:asset-integrity`.

## 5. Jardim do respawn: os números da G9

Antes da r2 a faixa `z >= 29` tinha **9 plantios** e **0 muretas medíveis** (as
quatro que existiam não tinham marca nenhuma — "tem mureta" era palavra). A G9
cobra ≥ 24 plantios e ≥ 2 muretas marcadas, e mede 60 e 4.

A meia-largura do corredor de spawn (**5,5 m**) é **derivada do mapa**: os spawns
de A estão em x = ±4,5 / ±1,5 e as duas linhas de waypoint do portão em x = ±4,5
com inflação de 0,2 m no `blocked()`, logo |x| ≤ 4,7 precisa ficar livre; 5,5 dá
0,8 m de folga, que é o corpo do jogador (raio ~0,4) passando raspando dos dois
lados. Não é um número escolhido para o resultado dar certo: a bromélia herdada
em (-6,1; 31,2) fica 0,6 m **fora** dele, e por isso não é falha — a régua mede a
faixa de caminhada, não o gosto do canteiro.

O fallback procedural usa **três** malhas instanciadas, não duas: com duas, uma
touceira de 6 põe 3 da mesma malha num raio de 1 m e duas touceiras vizinhas
somam 9 — reprovado pela G1.iii (teto 8), medido antes de escolher. Com três, o
pior aglomerado cai para 6. O achatamento por instância acompanha o **índice** e
não a malha, senão a G1.ii perde o spread de escala.
