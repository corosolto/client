# GRAFITE-REGUA — curadoria desenhada (régua de 31/10)

Uma régua só: **a fonte é a geometria efetivamente desenhada** na cena real. Metadado
(`userData.graffitiPecas`, `userData.pecas`) é **reconciliação** — divergir reprova, nunca
substitui a medição. Quem conta é o triângulo que o renderer desenha, com `drawRange`,
`groups`/materialIndex, `InstancedMesh`×`matrixWorld` e inventário cruzado de
imagens+canvas (`graffiti-art-inventory.mjs` + `trackGraffitiCanvases`).

Instrumentos:

| arquivo | papel |
|---|---|
| `tools/eval/graffiti-curation-measure.mjs` | `medirCuradoria()` — serializada e executada **no Ego** sobre a cena real (`__gworld.root`) |
| `tools/eval/graffiti-art-inventory.mjs` | inventário independente por textura (imagem/URL, canvas instrumentado) |
| `tools/eval/graffiti-drawn-check.mjs` | gate Node puro: fixture GREEN + mutantes causais com cláusula exigida |

## Origem e o RED real de #1179

Nasceu do pedido de 31/10 (arte única por mapa, Ferro só na casa B, Piscina só no branco).
O RED histórico medido no Ego na base `ad696fb87` (#1179), superfície branca real:
**Piscina 465 peças/49 artes/45 repetidas/100 fora do branco; Ferro 207/38/30/172 fora da
casa B** (JSONs `piscina-1179-curation-red.json`, `ferro-1179-curation-red.json` e header
de `graffiti-curation-check.mjs`). A primeira versão do medidor lia **metadado** e mutantes
reais no Ego passavam falsamente GREEN (`curation-drawn-mutations.json`); a reescrita lê
geometria e o Root provou no Ego real (`curation-drawn-mutations-AFTER2.json`): clean
52/52 GREEN, clone→duplicata RED, translação 1000 m→suporte RED, poster sem
prefixo→inventário RED. **Esses quatro são o contrato mínimo que não pode regredir.**

## O que cada cláusula mede

- **duplicata** — mesma identidade de asset (path de imagem ou canvas) contada 2+× no mapa
  (peças medidas + ocorrências não classificadas do inventário).
- **sem-suporte** — amostras do quad sem parede atrás (`criarSuporteGrafite`, 3 cm + arredondamento).
- **unknown** — o medidor não sabe medir/certificar: componente que não é quad canônico,
  malha com arte sem nome próprio, ancestral enganoso, arte "declarada" não medida,
  winding misto, UV irreconhecível/repetido/nulo/dobrado, **canal de UV ≠ 0**, **solda nonindexed
  com UV divergente entre ocorrências da mesma posição**, **poster batched**, **peça sem
  entrada independente no inventário**, imagem sem pixels, **wireframe** (renderiza LINES,
  não o quad preenchido — crítico R5 nº1), **reflexão `matrixWorld.determinant()<0`**
  (o renderer compensa invertendo `frontFace`; sem compensar winding+culling a medição
  mente — crítico R5 nº2) e **UV efetivo/repeat/offset não finito** (NaN escapa das
  comparações de span — crítico R5 nº3). **Não saber custa o mesmo que estar errado.**
- **outside** — Ferro: fora das 4 paredes MAT.office da casa B (`x∈[-12.5,2.5]`,
  `z∈[-35.5,-26.5]`); Piscina: fora da cobertura da **parede branca real** (textura da
  parede de referência, `criarCoberturaGrafite`), sem allowlist do produtor.

## Winding real, lado do material, UV e pixels (crítico R2, 31/10)

O extrator recriava índice canônico `[0,2,1,2,3,1]` e **apagava o winding original**:
inverter só o 2º triângulo de um quad FrontSide (`[0,2,1,2,1,3]`) deixa metade da imagem
culled de qualquer lado e o medidor dava GREEN. Reproduzido antes do conserto em
`GLM-CURADORIA-FACES-1-RED-repro.log` (`winding-misto.vermelho :: true`). Agora:

1. A normal de **cada triângulo original** é medida da geometria real (posições + matrixWorld).
   Triângulo degenerado → UNKNOWN (não desenha). Winding misto em material de um lado só →
   UNKNOWN (o quad nunca renderiza inteiro). DoubleSide aceita winding misto (não há culling).
2. A face vista **honra `material.side`**: FrontSide usa a normal do winding; BackSide usa a
   inversa; o `ry` do retângulo só é aceito se alinhar (±0.7) com essa normal mundial —
   quad inteiro de costas (`[0,1,2,2,1,3]`) vira `ry+π` e reprova no suporte, não GREEN.
   DoubleSide mantém a convenção do anel (sem flip) — arte vista dos dois lados.
3. **UV**: só repeat/offset são reconhecidos; `matrix` própria, `rotation` ou `center`
   reprovam (`uv-nao-reconhecido`). A arte tem que ser aplicada **uma única vez por quad**:
   span efetivo > 1.002 (repeat/tiling) → `uv-repetido`; span nulo → `uv-nulo`. Recorte
   (span < 1) é legítimo. Pontas livres do quad, em UV, no mesmo lado da diagonal = dobra
   (os dois triângulos amostram a mesma meia-arte 2×) → `uv-dobrado` (crítico R4 P2-1);
   repeat/offset afins e espelho integral seguem legítimos. A leitura usa o **UV efetivo**
   (sinal do `repeat` incluído):
   `repeat=(-1,1)+offset=1` espelha pela textura e reprova faixa como `uv-ilegivel`.
   `map.channel ≠ 0` desenha por `uv1/…` que o medidor não lê → `uv-canal` (UNKNOWN).
   Em malha **nonindexed**, a solda por posição só vale se **todas** as ocorrências da
   mesma posição concordarem no UV — divergência → UNKNOWN (crítico R3 nº5).
4. **Entrada independente + pixels por FACE** (crítico R3 nº1/nº2): toda peça contada
   exige entrada própria no inventário (`sem-entrada` — overlay nomeado com textura fora
   das famílias não passa) e a checagem de `sem-pixels` roda **antes** da consolidação de
   faixa — a face descartada na consolidação não perde o defeito.
5. **Poster**: suporte próprio (exclui o próprio Mesh) só com **1 poster por Mesh**;
   batch de 2+ quads desenhados no Mesh inteiro → `poster-batched` (UNKNOWN) — excluir o
   Mesh todo esconderia o outro quad. `InstancedMesh` com `count=0` é zero arte, não exceção.

## Faixa de beco: 1 objeto físico, 2 faces (pedido do dono 06/08)

`map_quebrada.js:1208-1239`: as duas faixas de memorial/orgulho são **um pano pendurado em
arame** com **dois planos FrontSide coplanares opostos**, cada um com leitura correta (o
verso de um DoubleSide sairia espelhado — reprovação do dono). Não são 4 repetições.

Contrato (registrado no medidor; **registro é referência aprovada, a contagem vem da
geometria medida** — agrupamento por nome sozinho não vale):

- Agrupamento por **asset + quad mundial** (x,y,z,w,h arredondados a 1 mm).
- Válido = exatamente **2 faces FrontSide coincidentes com normais opostas** (cos ≤ −0.98)
   e **UV legível em cada lado** (eixo u mundial ≈ up×normal, eixo v ≈ up — pega verso
   espelhado e de cabeça pra baixo), **na pose aprovada**. O registro vale **só no mapa
   `quebrada`** e casa pelas **4 quinas mundiais** (topo y=3.3, largura 1.58×1.8333,
   tolerância 0.01 do Float32 do bake): girar o par 90° no mesmo centro ou abrir uma face
   0.1 rad (cos −0.995 passa o limiar de normais) perde a dispensa por
   `fora-do-registro`/`nao-coplanares`. Pano DoubleSide único espelha e é REPROVADO.
- Par válido = **1 objeto** (`source:'faixa'`, conta 1× na unicidade) e **dispensa parede**
  (está em arame — não se exige muro atrás de pano pendurado). Relatório transparente em
  `result.banners` (faces, estado, motivo).
- Par inválido ou fora da pose aprovada = **peças comuns**: a mesma arte 2+× → duplicata,
  sem parede → sem-suporte, na Piscina → fora do branco. Terceira face → 3 peças →
  duplicata. Face invertida/UV espelhado/sem verso → duplicata/sem-suporte pela razão
  certa no `banners[].motivo`. **Não há exceção por prefixo nem por material**: na Piscina
  qualquer arte (poster, banner, faixa) só no branco; no Ferro só na casa B.
- Cópia da faixa em outro lugar = 2º objeto com a mesma arte → RED por duplicata (o par
  deslocado não casa com nenhuma pose aprovada).

## Mutantes provados (gate Node, `npm`-less: `node tools/eval/graffiti-drawn-check.mjs`)

Clean (parede texturizada comum NÃO é arte — decomposição só em malhas prefixadas
`decal:/mural:/poster:/faixa:`, inventário pega arte sem nome; `InstancedMesh count=0` no
clean é controle positivo: 4 peças, sem exceção) + 23 mutantes de cena, todos RED na
cláusula alvo: `clone-baked`→duplicata · `move-baked`→sem-suporte ·
`unnamed-poster`→inventário · `ancestral-enganoso`→ancestral · `drawrange-corta`→divergent ·
`grupo-sem-cobertura`→`pecas:0/1` com arr **não contada** (baseline baked coerente:
`userData.pecas=1`; sem ruído de metadado — crítico R3 nº9) · `instancia-duplicada`→duplicata ·
`triangulo-solto`→unknown · `winding-misto`→unknown · `winding-invertido`→sem-suporte ·
`uv-repetido`→unknown · `sem-pixels`→unknown · **`overlay-fora-familia`→`sem-entrada:`** ·
**`nonindexed-uv-divergente`→unknown** · **`uv-canal`→`uv-canal:`** ·
**`material-wireframe`→`wireframe:`** · **`reflexao-parede-errada` (scale.x=−1 com parede à
frente)→unknown pela malha espelhada** · **`uv-nao-finito` (NaN no atributo UV)→
`uv-nao-finito:`** · **`uv-dobrado` (vértice 3→UV do vértice 0: span 1×1, com parede)→
`uv-dobrado:`**; faixas: limpas GREEN
`faixa-uv-espelhado` (atributo) e **`faixa-uv-textura-espelhado` (repeat −1)** → `uv-ilegivel` ·
**`faixa-face-sem-pixels` (face descartada na consolidação) → `sem-pixels:`** ·
**`faixa-par-girado`→`fora-do-registro`** · **`faixa-par-aberto` (0.1 rad)→`nao-coplanares`** ·
**`faixa-doubleside`→faces=1 sem suporte** · `faixa-sem-verso`→faces=1 sem suporte ·
`faixa-piscina`→fora do branco + duplicata; poster: **`poster-self` GREEN (1/Mesh na parede)** ·
**`poster-suspenso`→sem-suporte** · **`poster-batched`→`poster-batched:`**. O gate ainda roda o
**self-mutante do extrator** (`groups` ignorado conta arr.png — e o mutante precisa aplicar,
senão o gate aborta). 82 conferências, exit 0 (R6/R4/R5: 23 mutantes de cena). O RED
pré-conserto de cada cláusula nova está em `GLM-CURADORIA-R4-1-RED-pre.log` (crash count=0),
`GLM-CURADORIA-R4-2-RED-cegueira.log` (14 falhas = crítico R3 nº1-7) e
`GLM-CURADORIA-R6-1-RED-pre-fix.log` (wireframe/NaN GREEN e reflexão sem cláusula —
crítico R5 nº1-3), `GLM-CURADORIA-R5-1-RED-pre.log` (dobra UV com span 1×1 passando GREEN —
crítico R4 P2-1) e `GLM-CURADORIA-R5-2-RED-pre.log` (offset NaN aceite pelo gate Córrego —
crítico R4 P2-2). A simulação fiel do bloco real do mapa está em
`GLM-CURADORIA-FACES-quebrada-sim.mjs` (2 objetos/4 faces, GREEN em Node).
## Como o Root reproduz no Ego (TaskSpace 32, servidor 4367)

1. `all-map-curation-drawn-survey3-ego.mjs` — varredura nos 11 mapas: depois desta mudança
   a Quebrada deve virar **GREEN com 2 objetos/4 faces** (`banners` com estado `aprovada`);
   Posto continua RED (duplicata real de poster — outro dono conserta); os 9 GREEN não
   podem regredir.
2. `curation-drawn-mutation-after2-ego.mjs` — clean 52/52 + clone/move/unnamed RED
   (contrato mínimo AFTER2 preservado).
3. Limites do Node: GLB e imagens reais não carregam — o gate usa fakes **com dimensões
   positivas** (imagem sem pixels é RED de propósito); a simulação da faixa cobre o bloco
   do mapa, não o mapa inteiro.

## Limites declarados

- **Cobertura limitada às famílias reconhecidas e a overlays nomeados**: o inventário só
  classifica texturas de `/img/decals/`, `/posters/`, canvas instrumentado e as duas
  `painted-texture` conhecidas. Bitmap **sem** nome de overlay e fora dessas famílias é
  **ignorado** pelo inventário (`identifyGraffitiTexture` devolve null) — a régua **não
  detecta** arte de tipo desconhecido e **não promete** marcá-lo como `unclassified-overlay`;
  isso não é GREEN. **Com** nome de overlay vira `sem-entrada`. Não se infere arte de
  textura qualquer; famílias novas precisam entrar no `identifyGraffitiTexture`.
- **Fail-closed declarado** (crítico R3 e R5): `map.channel ≠ 0` (`uv-canal`), wireframe,
  reflexão (`determinant<0`) e UV não finito são UNKNOWN; poster com mais
  de um quad desenhado no Mesh inteiro (`poster-batched`) são UNKNOWN — o prod hoje não usa
  nenhum dos dois (sem `.channel=`/`repeat` negativo em `public/js`); suportá-los exige
  excluir só o triângulo alvo, não o Mesh. Não se expande renderer/catálogo por fixture.
- Ancestral enganoso (grupo `decal:` pai com malha filha sem nome) continua unknown.
- DoubleSide usa a convenção do anel (não há "face" única); faixas exigem FrontSide.
- Eixos UV de faixa instanciada usam a 1ª matriz (limite; faixas reais são malhas simples).
- O survey de 31/10 tinha **9 GREEN + Posto RED + Quebrada** — o estado dos 14 mapas do
  bake **não está declarado final aqui**; aceitação visual é outra régua (captura 3:2). As
  cláusulas novas (`sem-entrada`, `uv-canal`, `poster-batched`, quinas de faixa) podem
  revelar RED real em mapas de prod — é achado, não falso positivo.

Conferência Root após R4: os UVs efetivos já incluem `repeat`; o span não pode
multiplicá-lo novamente. O controle `spanUV=2, repeat=0.6` escapava como0.72,
embora desenhasse1.2aplicações. Régua nova reproduziu duas cláusulas RED antes do
conserto; depois exige `uv-repetido` e `pass=false` pelo mesmo medidor da baseline.

Fechamento Root do crítico R6: todas as ocorrências do atributo UV precisam ser finitas
antes de soldar quinas, inclusive a cópia não representante de um quad nonindexed.
`nonindexed-uv-nao-finito` (ocorrência3) e `rotacao-uv-nao-finita` (rotation=NaN)
produziram4falhas antes e77/77GREEN depois, nos logs `root-curation-finite-occurrence-*`.
Rotação aceita é exatamente0; `!NaN` não serve como guarda. Vértices UV não usados
também fecham como UNKNOWN se inválidos: cobertura conservadora explícita.
