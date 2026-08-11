---
name: gauntlet-fps
description: Roda o Gauntlet Loop do CS BRASIL / CORO SOLTO — o ciclo crítico-adversarial → builders em paralelo → captura medida → verificação A/B → caçador de regressões que melhora gráficos, mapas, armas, UI e jogabilidade do jogo FPS em Three.js. Use SEMPRE que o pedido for melhorar, avaliar, revisar ou "deixar melhor" qualquer parte do jogo — gráficos, fidelidade de mapa, feel das armas, menu, HUD, bots, movimento — mesmo que o usuário não diga "gauntlet". Use também quando ele reportar que algo ficou feio, estranho, quebrado ou "não parece profissional", quando pedir comparação com CS2/Valorant/CoD, ou quando quiser uma avaliação do estado do jogo. Não use para tarefas mecânicas de uma linha nem para perguntas conceituais que não mexem no jogo.
---

# Gauntlet Loop — CS BRASIL / CORO SOLTO

## Por que este loop existe

Um agente sozinho produz *um* resultado decente e para. Ele para porque **ele mesmo** é quem julga, e ele conhece toda a razão por trás de cada decisão que tomou — o que o torna excelente em explicar por que o próprio trabalho é aceitável.

O Gauntlet resolve isso com três regras que valem mais que qualquer instrução de estilo:

1. **A régua não é negociável.** Não é "ficou bom", é "perde ou ganha de um frame de CS2, e por qual medida".
2. **Quem constrói nunca dá a nota.** O crítico é outro agente, com contexto limpo, que só vê o pixel — nunca a justificativa do builder.
3. **O loop não tem número fixo de rodadas.** Ele para quando você para, não quando o agente se declara satisfeito.

O que faz a diferença aqui **não é o número de agentes** — é que cada afirmação carregue um número e um `arquivo:linha`. Uma crítica que diz "melhore a iluminação" é ruído. Uma que diz "22,7% dos pixels de `game-praca_poderes-169-a.png` estão em L\* < 3 e a causa é `bloom.js:18` `power=1.25`" é trabalho.

## Antes de qualquer coisa

Leia, nesta ordem:

1. `STATUS.md` na raiz — o estado atual, em ≤100 linhas. (Substituiu o topo do `HANDOFF-KIMI.md`, que virou `docs/historico/HANDOFF-KIMI.md` e agora é só histórico — leia de lá quando precisar da causa raiz de uma decisão antiga.)
2. `tools/eval/BAR-CONSISTENCIA.md` — **a régua vigente**, com precedência sobre a `BAR.md`: 25 critérios de consistência e flow. Melhoria visual que quebra o jogo é regressão.
2b. `tools/eval/BAR.md` — a régua de fidelidade. Look técnico do CS2/Valorant, o que é alcançável em Three.js r160, como os lugares brasileiros retratados realmente são, e o checklist de 25 critérios A1–D4 mensuráveis num frame.
3. `tools/eval/ARCH.md` — índice do `game.js` por linha, os levers de cada frente, e a **tabela de conflito** (quem pode editar qual arquivo/range). É **gerado**: rode `npm run arch` antes de ler, ou você lê o índice de ontem.
4. `KNOWN-BUGS.md` — os defeitos abertos, com `arquivo:linha`, causa raiz e passo de reprodução. É onde mora o placar real do quality gate, colado de execução de verdade.
5. `docs/docs/stack.md` — com o que o jogo é feito (Three.js/WebGL sem build, Astro/Vercel, Supabase) e como o asset é gerado (mint.gg, Tripo3D, Meshy, OpenRouter). Os números dessa página são **gerados** por `npm run docs`.
6. `git status` — o dono revisa antes de commitar. **Não commite sem autorização explícita.**

## Ambiente

Verifique antes de planejar, porque isso muda tudo:

```bash
nproc                      # quantos builders dá pra rodar em paralelo
ls /opt/pw-browsers        # chromium do playwright (headless, software rendering)
npm root -g                # onde mora o playwright
```

Se o repositório estiver na máquina do usuário via bridge e o browser só existir no container, espelhe a árvore para o container e trabalhe lá. Rendering por software (SwiftShader) roda o jogo a **~0,3 FPS** — uma captura in-game leva de 4 a 6 minutos por mapa/aspecto. Planeje em torno disso; não trate lentidão como bug.

Servidor de teste (sem depender do `astro dev`):

```bash
node tools/eval/serve.mjs 8123
```

## O ciclo

### 1. Baseline medido

```bash
CHROME_BIN=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
  node tools/eval/gl-shots.mjs /root/shots/base all
```

Captura todos os mapas registrados × 2 aspectos (16:9 **e** 3:2 — o dono joga em 3:2) × 4 ângulos, mais as telas de menu. Sem baseline não existe A/B, e sem A/B o loop vira opinião.

### 2. Críticos adversariais, um por frente

Rode em paralelo, cada um com contexto limpo: **gráficos**, **mapas/fidelidade**, **armas (visual e feel, notas separadas)**, **UI (menu e HUD, notas separadas)**, **jogabilidade**.

O que faz um crítico ser útil:

- Recebe os PNGs e o código, **nunca** o relatório do builder.
- Entrega nota 0–10 **e** os N gaps ordenados por (impacto ÷ custo), cada um com: o que se vê no frame que denuncia, a causa em `arquivo:linha`, e a correção com **números**.
- Instrução literal que vale repetir: *"melhorar a iluminação" é resposta inválida; "SSAO half-res de 8 amostras no composite do bloom.js, raio 0.6m, e chão 8 pontos de L\* mais escuro que as paredes" é resposta válida.*

Deixe os críticos escreverem scripts Python (PIL está instalado) para medir L\*, saturação, contraste e % de blocos chapados. Medir é barato e transforma a crítica em algo que a próxima rodada pode conferir.

### 3. Builders em paralelo, particionados por arquivo

Use a tabela de conflito do `ARCH.md` — que é **GERADA** (`npm run arch`), justamente porque um índice por linha escrito à mão desatualiza no primeiro commit. Este parágrafo é a prova viva: ele afirmava "o `game.js` tem 3.234 linhas" e continuou afirmando isso enquanto o arquivo **dobrava de tamanho**, porque nenhuma régua olhava para ele. Por isso **nenhum número de tamanho de arquivo é escrito aqui** — rode `npm run arch` antes de particionar e leia o número de lá. O mesmo vale para a documentação: `npm run docs` gera, `npm run docs:check` reprova (está no `check:fast`).

O `game.js` é grande e **todas** as frentes precisam dele — por isso a regra:

> Em `game.js`, use **somente a ferramenta Edit**. Nunca Write. Outros agentes estão editando outras regiões do mesmo arquivo ao mesmo tempo.

Partição que funciona: gráficos-core (`bloom.js`, `textures.js`, renderer) · um agente por `map_*.js` · armas (`weapons.js`, `vmattach.js`, `springs.js`, `fparms.js` + ranges de arma no `game.js`) · UI (`style.css`, `index.astro`, HUD) · jogabilidade (bots, movimento, rounds).

Regras que cada builder precisa receber:

- Kill-switch por querystring em toda mudança arriscada (`?ao=0`, `?fxaa=0`, `?water=0`…) e degradação segura em `quality === 'low'`.
- `node --check` em cada arquivo editado antes de retornar.
- Alvo de 60 fps em GPU de notebook. Nada de SSAO full-res com 32 amostras.
- Comentário em português explicando o **porquê** — é a cultura do repo e é o que sobrevive ao próximo handoff.

### 4. Captura + métricas, um agente só

**Um único agente roda browser.** Duas sessões headless pesadas em paralelo derrubam o boot e produzem "countdown travado" que parece bug e é carga. Chrome zumbi de runs falhas come 200% de CPU — mate por `pkill -f chrome` antes de capturar.

Esse agente também mede e reporta, por mapa: tempo até `live`, `renderer.info` (calls, triangles, textures, programs, geometries) e `usedJSHeapSize` após 30s. O projeto **já teve crash de OOM** — heap acima de ~350MB é alarme, e contagem de texturas subindo rápido é o precursor.

### 5. Verificação A/B + caçador de regressões

Dois críticos novos, contexto limpo:

- **A/B**: compara `base` × `r1` × `r2` frame a frame, roda o checklist A1–D4 de novo, e diz quais critérios saíram de FAIL para PASS.
- **Caçador de regressões**: missão única de achar o que **piorou**. Este é o agente que paga o loop inteiro.

Truque que funciona muito bem: para isolar o viewmodel da arma sem máscara manual, pegue os **pixels invariantes entre os 4 ângulos** do mesmo mapa/aspecto — o cenário muda, a arma não. Dá para medir borda esquerda, borda direita e área de tela do viewmodel com precisão de subpixel.

Diga ao caçador, explicitamente: *se não houver regressão, diga isso — não invente.*

### 6. Decida e repita

Leia os vereditos, monte a rodada seguinte com as regressões **em primeiro lugar** (regressão não pode dormir), e rode de novo. Pare quando você quiser parar.

**Detector de loop:** se duas rodadas seguidas não moveram nenhum critério de FAIL para PASS, o loop está girando — mude de frente, troque o crítico (contexto limpo de verdade, não o mesmo com outro nome), ou pare e reporte o platô medido. Rodada que não move número é custo, não progresso.

## Página viva

Gere uma página HTML com os pares antes/depois embutidos como data URL (redimensione para ~760px, JPEG q62 — 34 pares cabem em ~2MB) e entregue ao usuário a cada rodada. Ele acompanha do celular sem interromper o loop.

## Armadilhas caras deste projeto (não repita)

| Armadilha | O que acontece |
|---|---|
| Validar framing de arma só em 16:9 | O dono joga em **3:2**. Já custou uma rodada inteira. |
| Girar a arma para "expor identidade" | Causa raiz do "mira num lugar, a arma aponta pro outro". Direção validada pelo dono: **funcional > identidade por ângulo**. Yaw ≤ 0,09. |
| Orientação de arma no olho | Sempre medição objetiva (`weapontest.html`, `weapon-capture.mjs`). O cano pode correr em qualquer eixo do model space; o medidor por slab em Z pega os dedos. |
| Preload de todas as viewmodels | Foi o crash "Aw Snap" (OOM). Hoje é lazy-load. Não desfaça. |
| Calibrar exposição pelo frame mais escuro | Uma rodada calibrou assim e inverteu a ordem entre mapas: o Piscinão, mapa de praia, virou o mais escuro. Calibre pela **média dos 8 frames**. |
| Mexer em `.js` sem bumpar o `?v=` | O import map do `index.astro` serve módulo velho do cache. Já custou dias de "correção que não chegava". |
| `//` em CSS | Não é comentário. O parser engole o bloco seguinte. Já matou um `@keyframes` inteiro. |
| Duas capturas headless em paralelo | Derruba o boot e falsifica a medição. |

## Referências

- `references/prompts.md` — esqueletos dos prompts de crítico, builder, captura e caçador de regressões, prontos para adaptar.
- `references/metricas.md` — como medir L\*, saturação, contraste WCAG, blocos chapados e a máscara do viewmodel.
- `tools/eval/BAR.md` e `tools/eval/ARCH.md` no repo — a régua e o mapa de conflito.
