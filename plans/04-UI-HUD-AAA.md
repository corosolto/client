# P1 — UI E HUD NÍVEL AAA

Referências: `issues/ui-nova/01..09*.png` (as telas que o GPT gerou), `references/telas/`,
e a imagem de conceito em `1st player/ChatGPT Image Aug 2, 2026, 01_08_23 AM.png`.
Estado atual: `issues/3/Screenshot 2026-08-02 at 13.*.png`.

---

## 1. O delta, medido nas screenshots

Comparando o HUD de jogo atual (`issues/3/*13.39.58*.png`) com o conceito
(`1st player/ChatGPT Image...png`), a diferença **não é de estilo — é de hierarquia**.
Tudo no HUD atual tem o mesmo peso visual, então nada lê.

| Elemento | Hoje | Alvo | Delta |
|---|---|---|---|
| **Placar superior** | `FNK 1` · `CAPTURA` · `PLH 0` em pílulas pequenas de ~11px, cinza | `PLH **2** \| **01:32** \| **1** TRB` com número em ~40px, `RODADA 4/15` como subtítulo | O número do placar tem que ser o **maior texto da tela superior**. Hoje o maior é a palavra "CAPTURA" |
| **Timer** | não aparece no HUD de captura | dentro do bloco central, entre os dois times | Adicionar; é o elemento que gera tensão |
| **Barra de objetivos** | linha fina com 4 pontos e nomes de 8px | — | No modo captura ela pode virar sub-linha do bloco central, não uma faixa própria |
| **Minimapa** | quadrado, ~90px, borda dupla, canto superior esquerdo | circular, com **label do setor** embaixo ("BECO OESTE") | Circular + label. O label sozinho já orienta mais que o mapa |
| **Killfeed** | pílula à direita, `Fluxo ⚔ Esbirro`, 10px, uma linha | linhas com **cor por time no nome** + **ícone da arma** entre eles | Ícones de arma já existem (o dropdown de armas do menu usa SVG por arma — `main.js`) |
| **Vida** | `100` + `HP` minúsculo + barra branca fina, canto inf. esquerdo | `100` em ~48px + label `VIDA` + **barra amarela grossa** + ícone | O amarelo é a cor de marca. Hoje o HUD não tem cor de marca nenhuma |
| **Munição** | `30 \| 90` em ~24px cinza, canto inf. direito | `30` em ~48px branco + `90` menor + nome da arma abaixo | Mesma correção de hierarquia |
| **Habilidades** | não existem | 3 ícones centrais inferiores com tecla (Q/E/X) | Se não houver habilidades, **use o espaço para o rádio (Z/X/V)** — que existe e ninguém descobre |
| **Crosshair** | cruz vermelha de 1px | crosshair com gap dinâmico | Já existe gap dinâmico (`game.js:3923`, `this.vm.kick*20`) mas some contra o chão claro. Precisa de contorno preto de 1px |

**A regra que resolve 80% disso:** três níveis tipográficos e só três — **número grande
(40-48px), label pequeno (10-11px maiúsculo com letter-spacing), texto de sistema (13px)**.
Hoje há uns seis tamanhos entre 9 e 24px, e o olho não sabe onde pousar.

**A segunda regra:** **amarelo só para o que é seu** (sua vida, sua munição, seu objetivo).
Vermelho/azul para times. Cinza para tudo mais. No HUD atual o amarelo aparece em
"CAPTURA" (um label neutro) e some da vida.

---

## 2. Menu principal

`issues/ui-nova/01-menu.png` mostra o alvo: fundo cinematográfico com Brasília, três
personagens à direita, logo grande com o tratamento "CORO SOLTO / TRETA SUPREMA", lista vertical
de menu à esquerda em maiúsculas com espaçamento generoso, card de jogador no rodapé esquerdo
com nível e barra de XP.

O que dá para fazer em CSS/DOM puro, sem render 3D novo:
1. **Fundo**: uma das imagens já geradas como `background-image` com `filter: brightness(.55)`
   e um gradiente radial escuro nas bordas. Já existe `site-bg.js` (30 linhas) para o site —
   o menu do jogo pode usar a mesma técnica.
2. **Logo**: a arte do `01-menu.png` recortada. Não tente reproduzir o tratamento em CSS.
3. **Lista de menu**: `font-weight: 700`, `letter-spacing: .08em`, `text-transform: uppercase`,
   item ativo com barra amarela de 3px à esquerda. É o padrão CoD e é literalmente 15 linhas.
4. **Card de jogador**: nick + nível + barra de XP. **O dado já existe** (stats no
   `localStorage`, tela RANKING). Só nunca foi mostrado no menu.
5. **Personagens**: se der tempo, renderizar o personagem selecionado com o `ensurePreview`
   que já existe (`main.js:244-278`), posicionado à direita. Se não der, use a imagem.

**Não faça partículas animadas nem depth of field.** Custa frame no menu e ninguém repara.

---

## 3. Tela de seleção de personagem

`issues/ui-nova/03-char.png` já é praticamente o alvo — e é uma tela sua, renderizada, não
um mock do GPT. Os problemas dela são de **pose e enquadramento**, não de layout, e estão
detalhados em [`02-BOTS-E-MODELS.md`](02-BOTS-E-MODELS.md) §B.4 (itens C1 a C6).

Os dois de maior impacto e menor custo:
- **C2** — a miniatura da lista usa `{weapon: false}` (`main.js:1122`), então o personagem
  **segura o ar** com as mãos moldadas para um rifle. A tela grande mostra com arma. Mesmo
  personagem, duas poses, na mesma tela.
- **C5** — `ctrl.aimPitch` fica `undefined` no preview, então o personagem herda a cabeça
  inclinada ~13° para baixo do clipe de rifle. Basta `ctrl.aimPitch = 0` em `main.js:349`.

---

## 4. Tela de resultado e placar

`issues/ui-nova/08-scoreboard.png` e `09-match-end.png`.

O placar (Tab) hoje é funcional. A tela de fim de partida é onde está o maior ganho de
**retenção e de compartilhamento**: XP ganho, kills, deaths, precisão, headshots, com um
botão grande amarelo.

**Item de crescimento escondido aqui:** você já tem gerador de badge PNG em runtime
(`src/pages/api/badge/[...path].png.ts`, com resvg-wasm e fonte embutida) usado no OG das
páginas `/u/*`. Um botão **"compartilhar resultado"** na tela de fim de partida que gere esse
PNG com o placar da partida é praticamente de graça, e é conteúdo que circula sozinho.

---

## 5. O que fazer, em ordem (1-2 dias)

```
[2h]  Hierarquia tipográfica do HUD — 3 tamanhos, amarelo só para o "seu"
[1h]  Vida e munição grandes (o delta mais visível em screenshot)
[1h]  Placar superior com número grande + timer + RODADA n/N
[1h]  Killfeed com cor de time e ícone de arma
[30m] Crosshair com contorno preto de 1px
[30m] Minimapa circular + label do setor
[2h]  Menu principal (fundo, logo, lista, card de jogador)
[30m] C2 + C5 da tela de seleção
[1h]  Tela de fim de partida + botão de compartilhar badge
```

**Verificação:**
```bash
node tools/eval/serve.mjs 8123 &
CHROME_BIN=... node tools/eval/g2ui-verify.mjs      # 7 telas end-to-end, exit 1 em erro de console
CHROME_BIN=... node tools/eval/gl-shots.mjs /tmp/ui menu
```
`g2ui-verify.mjs` já existe e já reprova por erro de console. Rode em 16:9 **e 3:2** — você
joga em 3:2 e o HUD de hoje foi provavelmente calibrado em 16:9.

**Regra do Gauntlet aqui:** o crítico de UI tem que ser um agente com contexto limpo que só vê
o PNG lado a lado com `issues/ui-nova/`, sem saber o que foi mudado. Se ele não apontar a
diferença sozinho, a mudança não foi suficiente.

---

## 6. Sobre "gráficos nível AAA" — o que é honesto

Você escreveu que o Claude te fez desistir dizendo que esse nível de gráfico em browser é
impossível e que o GPT só gerou a imagem porque ela é estática. **Isso é meio verdade e meio
não**, e vale separar:

**É verdade** que você não vai ter em Three.js, no browser, com orçamento de 250 MB, o que uma
imagem estática de difusão gera: geometria de milhões de polígonos por carro empilhado,
iluminação global path-traced, materiais de 8K.

**Não é verdade** que a distância seja intransponível na *leitura*. O que faz a imagem do
`ChatGPT Image...png` parecer AAA e a sua screenshot parecer protótipo, em ordem de impacto:

1. **Faixa dinâmica.** A screenshot atual tem céu estourado e sombras sem informação. A imagem
   de referência tem céu com nuvem estruturada e sombra com cor. Isso é **tone mapping e
   exposição**, não geometria. Você já tem AgX/ACES no `bloom.js` e já tem os scripts Python que
   invertem o pipeline (`tools/eval/tone_calib.py`, `r3_sim.py`, `r3_color.py`).
2. **Variação de cor por objeto.** Os carros da referência têm 8 cores diferentes com desgaste;
   os seus têm 3-4 chapadas. Isso é uma tabela de cores + ruído por instância — barato.
3. **Perspectiva aérea (névoa por distância).** Já existe (`r3_fog.py` derivou a cor da névoa
   do céu medido). Confira se está ativa nos mapas novos.
4. **Contato: AO e sombra de contato.** Já existe AO por vértice (`vao.js`, CHANGELOG R3).
5. **Densidade de detalhe pequeno.** Poeira, pedra, capim, lixo. Não é polígono caro — é
   quantidade de instâncias pequenas. Você já faz isso no Ferro Velho.

**Nenhum desses cinco é geometria.** Os cinco juntos fecham a maior parte do gap perceptual, e
os quatro primeiros já têm ferramenta de medição no seu repo. **Isso é v2.1, não v2** — mas
vale saber que a desistência foi prematura.
