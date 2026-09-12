# `tools/frota/` — a frota de agentes

A casa aprendeu a **produzir** mais rápido do que **integra**. No dia em que esta
pasta nasceu: 47 PRs abertos, 13 em conflito, 21 com check vermelho, 7 verdes
esperando decisão — contra uma main que andava sozinha. Fan-out de produção não
resolve isso; piora, porque cada merge na main empurra os conflitantes para longe.

A frota é o que integra. Ela **prepara** e o dono **integra**: nesta rodada nada
entra na main sem ele.

| arquivo | papel |
|---|---|
| `fila.mjs` | lê GitHub + git, classifica cada PR e ordena por **risco de apodrecer** |
| `tarefas.mjs` | a classe do PR decide a missão — não existe registro de lanes a manter |
| `ledger.mjs` | memória que sobrevive ao turno: o próximo agente continua, não recomeça |
| `lock.mjs` | o recurso de um agente só (browser), com validade para não virar deadlock |
| `shim/git`, `shim/gh` | **a trava de verdade**: recusam push na main, merge, `--no-verify`, label `safe-automerge` |
| `GUARDRAILS.md` | o contrato injetado em todo turno, antes da tarefa |
| `selftest.mjs` | cada trava + a mutação que a faz ficar vermelha |

## A ordem da fila não é por número de PR

É por risco de apodrecer, e essa é a única decisão de projeto que importa aqui:

1. **CONFLITO** — a única dívida que fica **mais cara se você não fizer nada**.
2. **VERMELHO** — bloqueia o merge, mas o custo é estável.
3. **PRONTO** — verde, esperando o dono. Custo zero para o agente.
4. **RASCUNHO** — só quando o de cima esvazia, senão a fila cresce pela ponta errada.
5. **PARADO** — não despacha. Abandonar PR é decisão do dono.

## Por que não existe `lanes.json`

Um registro de lanes escrito à mão mente em 48 h: o PR sai do conflito, a worktree
é podada, a main anda, e o registro continua mandando rebasear o que já foi
rebaseado. Registro desatualizado é pior que registro nenhum, porque um agente
confia nele. Aqui a missão é **derivada do estado real a cada turno**. O único
estado persistido é o ledger — que é histórico, não configuração, e não apodrece.

## Os dois modelos, um runner só

O ZCode publica o GLM-5.3 num endpoint compatível com a API da Anthropic
(`~/.zcode/cli/config.json` → `provider.zai.kind = "anthropic"`). O mesmo binário
`claude` roda os dois: Opus 5 pela autenticação normal, GLM-5.3 apontando
`ANTHROPIC_BASE_URL` para a z.ai. O modelo é um **parâmetro do turno** — não há
segundo runner, segunda fila nem segundo ledger.

Divisão de trabalho, seguindo o que a casa já tinha decidido:

- **claude** — direção visual, Blender, personagem, julgar figura, revisão
- **glm** — portão, conflito, integração determinística, áudio, código

## A trava é o PATH, não o prompt

Turno desassistido roda sem parar para pedir permissão. Prompt não segura isso: um
agente que "sabe" que não deve tocar na main toca na main no turno em que a
instrução ficar longe o suficiente no contexto. Por isso `tools/frota/shim/` entra
**na frente** no PATH do turno, e o `git`/`gh` de lá recusam a chamada com saída 97.

O `selftest.mjs` prova cada recusa e prova que ela **morde** — inclusive o caso em
que o shim precisa DEIXAR passar (`git checkout origin/main -- <arquivo>` é
resolução de conflito legítima, não troca de branch).

## Rodando

```sh
node tools/frota/fila.mjs                   # o que precisa de trabalho, e por quê
node tools/frota/fila.mjs --classe=CONFLITO
node tools/frota/selftest.mjs               # travas + mutantes
node tools/frota/ledger.mjs resumo          # em que pé está cada lane
node tools/frota/lock.mjs ver               # quem está com o browser
```
