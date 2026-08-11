---
id: instrumentacao-ai
title: 'Instrumentação de IA: como o trabalho é feito'
sidebar_label: Instrumentação de IA
sidebar_position: 3
description: Como o trabalho é feito aqui — régua, construtores em faixas disjuntas, crítico adversarial com contexto limpo, caçador de regressões. E a regra "quem constrói nunca dá a nota".
---

# Instrumentação de IA: como o trabalho é feito

Este jogo foi construído quase inteiro por agentes de IA, e continua sendo. Isso não
é um adjetivo de marketing: é uma restrição de engenharia que muda como o repositório
é organizado. Esta página descreve o mecanismo, e ele é o mesmo se você for humano.

O loop está codificado em `.claude/skills/gauntlet-fps/SKILL.md` — leia o arquivo, não
o resumo.

## O problema que o loop resolve

Citando o próprio arquivo (`.claude/skills/gauntlet-fps/SKILL.md:10`):

> Um agente sozinho produz *um* resultado decente e para. Ele para porque **ele mesmo**
> é quem julga, e ele conhece toda a razão por trás de cada decisão que tomou — o que o
> torna excelente em explicar por que o próprio trabalho é aceitável.

Um modelo é ótimo em construir e péssimo em reprovar o que construiu. Não porque mente
— porque conhece a intenção. Ele lê o próprio resultado através da justificativa. O
único conserto conhecido é estrutural: separar quem constrói de quem mede.

## As três regras

De `.claude/skills/gauntlet-fps/SKILL.md:14-16`:

1. **A régua não é negociável.** Não é "ficou bom", é "perde ou ganha de um frame de
   CS2, e por qual medida".
2. **Quem constrói nunca dá a nota.** O crítico é outro agente, com contexto limpo, que
   só vê o pixel — nunca a justificativa do builder.
3. **O loop não tem número fixo de rodadas.** Ele para quando você para, não quando o
   agente se declara satisfeito.

E a regra que vale mais que as três (`SKILL.md:18`):

> O que faz a diferença aqui **não é o número de agentes** — é que cada afirmação
> carregue um número e um `arquivo:linha`. Uma crítica que diz "melhore a iluminação" é
> ruído. Uma que diz "22,7% dos pixels de `game-praca_poderes-169-a.png` estão em L\* < 3 e a
> causa é `bloom.js:18` `power=1.25`" é trabalho.

## O ciclo, em ordem

### 1. Régua

Antes de qualquer edição, existe um instrumento. Duas coisas diferentes se chamam
"régua" aqui e vale separar:

- **`tools/eval/BAR.md`** — a régua VISUAL: 25 critérios A1–D4 num screenshot, em dois
  eixos independentes ("isso parece um FPS moderno?" e "isso parece o Brasil de
  verdade?"). Um mapa pode passar num e falhar no outro; a régua separa de propósito.
- **`tools/eval/invariants.mjs`** — o PORTÃO: roda em node puro e sai com código 1 se
  qualquer invariante crítica falhar. Quantas existem e quantas são avaliadas está no bloco
  gerado de [O quality gate](./quality-gates.md) — não é número para repetir aqui.

A régua nunca é escrita pelo mesmo agente que vai consertar o defeito que ela mede.
Quando isso aconteceu, o resultado está documentado no repo — ver a seção
[Teste de mutação](./quality-gates.md#teste-de-mutação-da-própria-régua).

### 2. Baseline medido

```bash
CHROME_BIN=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
  node tools/eval/gl-shots.mjs /root/shots/base all
```

Sem baseline não existe A/B, e sem A/B o loop vira opinião. Detalhe caro desta base:
render por software (SwiftShader) roda o jogo a **~0,3 FPS**, e uma captura in-game
custa de 4 a 6 minutos por mapa/aspecto (`SKILL.md:39`). Não é bug, é o orçamento. Foi
exatamente por causa desse custo que o arnês migrou para node puro: `tools/eval/botsim.mjs:4-6`
registra que a versão anterior com Playwright+SwiftShader custava **~10 min por mapa**
numa máquina de 2 CPUs.

### 3. Críticos adversariais, em paralelo, com contexto limpo

Um crítico por frente: gráficos, mapas/fidelidade, armas (visual e feel com notas
separadas), UI (menu e HUD com notas separadas), jogabilidade.

O que faz um crítico ser útil (`SKILL.md:62-66`):

- Recebe os PNGs e o código, **nunca** o relatório do builder.
- Entrega nota 0–10 **e** os gaps ordenados por (impacto ÷ custo), cada um com: o que
  se vê no frame que denuncia, a causa em `arquivo:linha`, e a correção com números.
- Instrução literal: *"melhorar a iluminação" é resposta inválida; "SSAO half-res de 8
  amostras no composite do `bloom.js`, raio 0.6 m, e chão 8 pontos de L\* mais escuro
  que as paredes" é resposta válida.*

"Contexto limpo" é literal: o crítico não vê o histórico do builder. Se ele vir, ele
herda a justificativa, e a justificativa é justamente o que precisa ser testado.

### 4. Construtores em paralelo, particionados por faixa de linha

Esta é a peça que permite N agentes no mesmo arquivo de 6.427 linhas sem conflito. Ela
tem página própria: [Arquitetura](./arquitetura.md#faixas-de-linha-disjuntas).

O resumo operacional:

- A partição é declarada em `tools/gen-arch.mjs` por **símbolo**, não por linha, e o
  script resolve símbolo → linha na hora (`tools/gen-arch.mjs:11-13`).
- A tabela resultante vive em `tools/eval/ARCH.md`, dentro de marcadores
  `BEGIN:GERADO` / `END:GERADO`.
- Em `game.js`, **só a ferramenta Edit, nunca Write** — outro agente está no mesmo
  arquivo, em outra faixa, agora.
- Três métodos são **zona vermelha, append-only** — `update()`, `_dom()` e
  `constructor()` — porque qualquer frente pode precisar deles
  (`tools/gen-arch.mjs:75-77`).

Regras que todo construtor recebe (`SKILL.md:78-83`): kill-switch por querystring em
toda mudança arriscada (`?ao=0`, `?fxaa=0`, `?water=0`), degradação segura em
`quality === 'low'`, `node --check` em cada arquivo editado antes de retornar, alvo de
60 fps em GPU de notebook, e comentário **em português explicando o porquê** — é o que
sobrevive ao próximo handoff.

### 5. Captura e métricas: um agente só

**Um único agente roda browser.** Duas sessões headless pesadas em paralelo derrubam o
boot e produzem "countdown travado" que parece bug e é carga (`SKILL.md:87`). O mesmo
agente reporta, por mapa: tempo até `live`, `renderer.info` (calls, triangles,
textures, programs, geometries) e `usedJSHeapSize` após 30 s. O projeto já teve crash
de OOM: heap acima de ~350 MB é alarme, e contagem de texturas subindo rápido é o
precursor.

### 6. Verificação A/B + caçador de regressões

Dois críticos novos, contexto limpo:

- **A/B** — compara `base` × `r1` × `r2` frame a frame, roda o checklist A1–D4 de novo,
  e diz quais critérios saíram de FAIL para PASS.
- **Caçador de regressões** — missão única: achar o que **piorou**. Este é o agente que
  paga o loop inteiro.

Instrução literal para o caçador (`SKILL.md:100`): *se não houver regressão, diga isso —
não invente.*

:::note Truque que funciona
Para isolar o viewmodel da arma sem máscara manual, pegue os **pixels invariantes entre
os 4 ângulos** do mesmo mapa/aspecto: o cenário muda, a arma não. Dá pra medir borda
esquerda, borda direita e área de tela do viewmodel com precisão de subpixel
(`SKILL.md:98`).
:::

## Por que "quem constrói nunca dá a nota" não é filosofia

Tem caso medido, e ele está no código: um crítico que também construía subiu o placar do
quality gate **de verdade, sem afrouxar um teto sequer**, e mesmo assim foi reprovado — porque
para fechar duas invariantes destruiu em silêncio uma decisão estética que nenhuma régua
codificava.

O relato completo, com os números e a lei que saiu dele, está em
[Lei 1](./quality-gates.md#lei-1--intenção-que-não-vira-invariante-é-otimizada-para-fora).
O que importa aqui é o mecanismo, não o episódio: **o agente não trapaceou.** Ele otimizou
honestamente a única coisa que estava medida. A régua era o problema, e quem escreveu a
régua era quem ia ser medido por ela.

## Armadilhas caras desta base (não repita)

Tabela reproduzida de `.claude/skills/gauntlet-fps/SKILL.md:111-121`. Dois itens eu
confirmei no código: os dois aspectos estão medidos no quality gate (VM4 e VM10 comparam 16:9
com 3:2) e o aviso do `?v=` está em `public/js/version.js:2-4`. Os outros são memória
declarada do projeto — trate como tal.

| Armadilha | O que acontece |
|---|---|
| Validar enquadramento de arma só em 16:9 | O dono joga em **3:2**. Já custou uma rodada inteira. O quality gate mede os dois aspectos (VM4, VM10) |
| Girar a arma pra "expor identidade" | Causa raiz do "mira num lugar, a arma aponta pro outro". Direção do dono: **funcional > identidade por ângulo** |
| Orientação de arma medida no olho | Sempre medição objetiva (`weapontest.html`, `weapon-capture.mjs`) |
| Preload de todas as viewmodels | Foi o crash "Aw Snap" (OOM). Hoje é lazy-load. Não desfaça |
| Calibrar exposição pelo frame mais escuro | Uma rodada fez isso e inverteu a ordem entre mapas: o Piscinão, mapa de praia, virou o mais escuro. Calibre pela média dos 8 frames |
| Módulo publicado fora do manifesto de cache | A URL não muda com os bytes, ou o import map anuncia arquivo podado. SB7 confere grafo, conteúdo e fronteira de publicação |
| `//` em CSS | Não é comentário. O parser engole o bloco seguinte. Já matou um `@keyframes` inteiro |
| Duas capturas headless em paralelo | Derruba o boot e falsifica a medição |

## Onde o conhecimento mora

`STUDIO_CONSTITUTION.md:7-8`, princípio 2:

> **Conhecimento mora no repositório, nunca na memória do modelo.** Decisões vão para
> CHANGELOG/commits/docs; um agente novo deve conseguir assumir lendo o repo.

Na prática isso significa que os comentários deste repositório são longos, em
português, e contam **por que** cada número existe e o que aconteceu quando ele estava
errado. Se você achar isso verboso: esse comentário é o que impediu a próxima rodada de
refazer o mesmo erro de três dias. Não delete comentário de procedência num PR de
limpeza.

:::warning Nem tudo que está escrito está atualizado
`SKILL.md:72` afirma que o `game.js` tem 3.234 linhas — o arquivo passou do dobro disso
(o número de hoje está no bloco gerado de [Arquitetura](./arquitetura.md#os-arquivos-indexados),
e no `tools/eval/ARCH.md`). Esse é o motivo exato de o `ARCH.md` e os blocos desta
documentação serem **gerados por script**: índice por número escrito à mão desatualiza no
primeiro commit, e corrigi-lo à mão dura exatamente um commit também.
:::
