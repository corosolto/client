# Gabaritos: a entrada do `KNOWN-BUGS.md` e o relatório final

Complemento da [`SKILL.md`](../SKILL.md), passos 0, 7 e 8.

---

## Onde registrar

Tudo vai para o [`KNOWN-BUGS.md`](../../../../KNOWN-BUGS.md) da raiz. Um arquivo só, de
propósito: já foram encontrados quatro lugares diferentes com o mesmo número escrito à mão, todos
desatualizados.

- **Com evidência** (`arquivo:linha`, saída de régua ou passo de reprodução) → entra na seção de
  severidade: **P0** quebra o jogo ou mente para quem mede · **P1** o jogador vê · **P2** infra,
  repo e deploy.
- **Sem evidência** → vai para *Relatados, ainda não reproduzidos*, com `Régua: nenhuma`.
  Suspeita sem medição não sobe de seção.
- **Resolvido** → o título ganha `~~tachado~~ · RESOLVIDO dd/mm` e o diagnóstico **fica**. O
  diagnóstico é metade do valor: é ele que impede a próxima pessoa de tentar de novo o que já
  foi refutado. Diagnóstico longo que já não descreve o estado atual vai para dentro de
  `<details><summary>…</summary>`, não para o lixo.

O placar do quality gate no cabeçalho é **colado de uma execução real**. Não o derive, não o estime.

---

## Gabarito da entrada

```markdown
### BUG-NN · <o sintoma, na voz de quem reportou>

**Sintoma (do dono):** *"<as palavras literais>"*.

**Causa raiz — confirmada.** <o que é, com `arquivo:linha` em cada afirmação>

**Reprodução:** <passos, ou o comando do arnês e a semente>

**Medido antes do conserto** (`<comando>`, <mapa/condição>):

| | antes | depois |
|---|---|---|
| <a grandeza que prova o defeito> | <n> | <n> |

**O que foi DESCARTADO com medição, não com palpite:** <o palpite óbvio e o número que o refutou>

**Correção:** <o que mudou, e por que na causa e não no sintoma>

**Custo declarado, medido:** <o que piorou junto — se nada piorou, diga que mediu e nada piorou>

**Régua: `tools/eval/<nome>.mjs`** (`npm run eval:<x>`, no `check:fast`).
<N> cláusulas, <M> mutações medidas: `--mutante=<a>` acende <cláusula> com <número>,
`--mutante=<b>` acende <cláusula>.
```

Três campos que parecem opcionais e não são:

- **"o que foi descartado com medição"** — é o que economiza a próxima rodada.
- **"custo declarado"** — correção que não custou nada geralmente não foi medida.
- **a mutação com número** — régua sem mutação medida é `Régua: nenhuma` com outro nome.

---

## Gabarito do relatório final

O relatório vai para quem pediu, não para o repositório. Ele tem cinco partes, e a quinta é a
que mais falta.

```markdown
**O que era.** <o defeito, em uma linha, na causa e não no sintoma>

**Como sei que era isso.** <a medição de antes, com o comando>

**O que mudei.** <arquivo:linha>

**Como sei que consertou.** <a medição de depois + a mutação que deixa a régua vermelha>

**O que eu NÃO verifiquei.**
- <check que não rodei, e por quê>
- <plataforma/resolução/modo que não testei>
- <suspeita que sobrou sem medição>
```

**Dizer "não rodei tal check" vale mais que implicar verificação completa.** Um relatório que
esconde o buraco transfere o custo para quem confiar nele — e nesta base o custo já foi medido em
dias. Modelos de frase que servem:

- *"`npm run check` não rodou inteiro: parei no `eval:invariants`, que leva ~10-12 min. Rodei
  `check:fast` verde e a régua nova com as duas mutações."*
- *"Medido só em 1536×1024 (3:2). Não olhei 16:9."*
- *"A régua nova não cobre o caminho do bot, só o do jogador. O bot continua sem medição aqui."*
- *"Não reproduzi no navegador; a evidência é do motor em node."*

E o inverso também é relatório: **resultado negativo é entrega.** *"Rodei X, não mudou nada, aqui
está o número"* fecha uma porta e economiza a rodada seguinte.

---

## Antes de fechar

```bash
npm run check:fast   # segundos
npm run check        # completo
npm run arch         # se mexeu em public/js — o ARCH.md é gerado
npm run docs         # se algum número de estado mudou
npm run build        # o site tem que buildar
npm run check:seo    # se mexeu em src/ ou public/llms.txt
```

E: mexeu em `public/js/*.js`, **bump o `?v=` nos dois lados** (`public/js/version.js` e o import
map de `src/pages/index.astro`). A correção que não chega ao navegador não é correção.

O dono revisa antes de commitar. **Não commite sem autorização explícita.**
