---
name: regua
description: Escreve régua (invariante, probe, portão) para o CS BRASIL / CORO SOLTO com o método que esta base pagou caro — a régua vem antes do conserto, a mutação prova que ela morde, e o limiar é compartilhado com quem mede a mesma coisa. Use SEMPRE que for criar ou alterar qualquer coisa em `tools/eval/`, acrescentar invariante, pôr passo no portão, escrever asserção de build, medir cobertura/qualidade/desempenho, ou quando alguém disser "precisa de uma régua pra isso", "como a gente garante que não volta", "isso tinha que reprovar o CI". Use TAMBÉM quando uma régua existente não estiver mordendo — número que não se move depois de um conserto que deveria movê-lo é o sintoma. NÃO use para caçar defeito já reportado (isso é a `bug-hunt`, que chama esta no meio) nem para melhorar o que já funciona (`gauntlet-fps`).
---

# Como se escreve uma régua aqui

Irmã da `bug-hunt`: aquela ensina a achar o defeito, esta ensina a escrever o
instrumento. Nada abaixo é "escreva testes" — é o que **este repositório** aprendeu
errando, com o caso e o número que comprou cada regra.

Se você seguir só uma linha:

> **Régua que não pode ficar vermelha não é régua. É decoração que dá confiança.**

## As cinco perguntas, antes de escrever a primeira linha

### 1. Qual defeito esta régua PREMIA?

Toda régua tem um estado ruim que aumenta o número dela. Ache-o antes de comemorar.

**Caso:** a `graffiti-census` mede "quanto da parede tem tinta". Uma peça de grafite
**flutuando no ar** não derruba esse número — ela o **melhora**, porque cobre a
placa que está atrás dela. A régua foi de 12,7% a 87% enquanto **698 peças** ficavam
penduradas no vazio, com o portão verde, até o dono ver e reclamar.

Se existir esse estado, **escreva a régua irmã antes de declarar vitória**.
(`graffiti-census` ↔ `graffiti-audit`)

### 2. Ela mede no MESMO mundo em que o jogo roda?

**Caso:** `decal-probe` roda em node, onde **nenhum GLB carrega**. Jurava 334
decalques na Quebrada; no navegador havia **96**. O dono contou "10-15% de arte" e
estava certo por três dias contra um portão verde.

Se o que você mede depende de asset carregado, **a régua precisa de navegador**
(`playwright` + `npm run eval:serve`, ver `graffiti-census.mjs`). Régua em node é
mais rápida e mede outro jogo.

### 3. Qual o limiar, e quem MAIS usa esse limiar?

**Caso:** a passada de grafite aceitava 1 amostra vazia de 5 (20% de buraco); a
auditoria reprovava acima de 2 de 15 (13%). Peça nascia aprovada num lado e
reprovada no outro, e dois consertos seguidos não moveram o número (451 → 445 →
445). Alinhar os limiares — só isso — levou de **688 para 272**.

**Duas coisas que medem o mesmo conceito compartilham o limiar, de preferência a
função.** Quando não der, o relatório diz contra qual limiar mediu.

### 4. Como ela FALHA quando não sabe medir?

**Não saber tem que custar o mesmo que estar errado.**

**Caso:** `gen-docs` não reconheceu o `LICENSE` novo, devolveu `null` e **seguiu em
frente** — publicou "0 ocorrências de `null` em 0 das 8 superfícies" e a doc
publicada passou a dizer MIT num repositório AGPL.

`null` com cara de fato é pior que exceção. Se a régua não consegue medir, ela fica
**vermelha**, não silenciosa.

### 5. Ela cabe no orçamento de quem vai rodá-la?

Régua que ninguém roda não serve. Orçamento desta base: portão rápido em minutos,
build de mapa em **milissegundos**.

**Caso:** a auditoria de grafite nasceu com >10 min porque atirava 48 mil raios
contra a lista inteira de malhas. Com prefiltro espacial (`gradeEspacial`, exportada
de `graffiti_pass.js` e **compartilhada**, não copiada) virou minutos, com resultado
idêntico — prefiltro geométrico não é aproximação.

Se não couber, ou você prefiltra, ou **assa o resultado** (ver `graffiti_layout.js`)
e transforma "resultado velho" em item de régua.

## A mutação, que é o teste do teste

Régua entra com uma mutação que a faz ficar **vermelha**. Sem isso você não sabe se
ela mede — sabe que ela imprime.

```
1. rode a régua no estado bom            -> tem que dar VERDE
2. quebre de propósito o que ela cobre   -> tem que dar VERMELHO, com a mensagem certa
3. restaure                              -> tem que voltar a VERDE
```

**E a mutação tem que falhar se não aplicou.** Caso real: plantei `**MIT License**`
num arquivo com um `replace` que **não casou** (o texto já tinha mudado), o check deu
verde, e por um instante isso pareceu "o guarda funciona". Sempre:

```python
n = s.replace(velho, novo)
assert n != s, 'MUTANTE NAO APLICOU'
```

Mutação decorativa é pior que nenhuma: ela dá confiança falsa por escrito.

## A mensagem de falha é metade da régua

Compare:

- ✗ `decalques: 22 faltando`
- ✓ `decalques: 22 de 196 do acervo faltando (ex.: folha-lambes.png, …) — `bash scripts/fetch-decals.sh` falhou ou não rodou. Os mapas subiriam com a parede pelada.`

A segunda diz **quanto**, **de que classe**, **qual o conserto** e **qual a
consequência de ignorar**. Ela é a diferença entre "conserta em 1 min" e "investiga
1 h". Quando o defeito tem causa provável conhecida, **nomeie a linha**:
"o fallback do `fetch-audio.sh:23` copiou o exemplo".

## Onde a régua entra depois de escrita

| tipo | vai para | reprova? |
|---|---|---|
| invariante de jogo | `tools/eval/invariants.mjs` | sim, salvo se estiver no `KNOWN-RED.json` |
| asserção de build | `buildCommand` da Vercel, via `npm run assert:*` | sim, antes de gastar build |
| régua com navegador | script próprio + `npm run eval:*` | fora do `check` rápido, de propósito |
| contagem de conteúdo | `tools/eval/*-probe.mjs` | normalmente relatório |

**Dívida entra declarada, não escondida:** `tools/eval/KNOWN-RED.json` deixa uma
crítica vermelha **avisar** sem reprovar o CI. Só entre ali com issue ou plano
registrado, e com o número medido — nunca "pra passar o CI".

## Régua visual precisa de `--fotos`

Número diz que existe; foto diz o que é.

**Caso:** duas hipóteses coerentes sobre o "grafite no ar" estavam erradas, e a
primeira custou um conserto que moveu 6 peças. A causa apareceu na primeira captura
olhada — o pixo atravessa a viga e continua sobre o vão da porta.

Se a régua mede algo que se vê, ela sai com `--fotos N` posicionando a câmera nas N
piores (ver `graffiti-audit.mjs`). **Quando o número não move depois de um conserto
que deveria movê-lo, pare de raciocinar e olhe.**

## Checklist antes de commitar a régua

- [ ] tem número, não passa/falha seco
- [ ] tem procedência: o caso real está no comentário de topo, com o valor medido
- [ ] a mutação está registrada no commit, com o antes e o depois
- [ ] a mutação foi provada que APLICA
- [ ] o limiar é compartilhado com quem mede a mesma coisa
- [ ] falha e "não sei medir" são o mesmo vermelho
- [ ] a mensagem diz o conserto
- [ ] o custo cabe em quem vai rodar
- [ ] entrou num `npm run` com bloco `//` explicando por que ela existe

## Leitura obrigatória

- `docs/LICOES.md` — os 14 casos que compraram estas regras
- `.claude/skills/bug-hunt/SKILL.md` — a irmã: achar o defeito
- `tools/eval/README.md` — o catálogo e a regra "contrato × ferramenta de rodada"
