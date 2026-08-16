# O ratchet de dívidas conhecidas só sabe crescer

**Dificuldade:** fácil · **Área:** automação / arnês · **Tempo:** ~1 h

## Contexto

`tools/eval/KNOWN-RED.json` lista 13 invariantes críticas que estão vermelhas e **não
reprovam o CI** — é o ratchet que deixa o portão ficar verde com dívida declarada
(VM1/3/9/12/16/18/19/20, CHR1/3/4, CTF1, BOT8).

O mecanismo tem um buraco: **nada impede a lista de crescer.** Quem quebra uma invariante
nova pode simplesmente adicioná-la ao arquivo, e o portão fica verde. Um ratchet que anda
para os dois lados é só uma lista de desculpas.

## O que fazer

1. Uma régua que compara o `KNOWN-RED.json` do PR com o da `main`: **entrada nova reprova**,
   entrada removida passa (é quitação).
2. Permitir a exceção com intenção explícita: uma linha no corpo do PR
   (`ratchet: +VM21 porque <motivo>`) libera aquela entrada específica. Sem o motivo
   escrito, não passa — o objetivo não é proibir, é obrigar a dizer por quê.
3. Reportar no comentário do PR: quantas dívidas entraram, quantas saíram, o saldo.

## Critério de aceite

- [ ] PR que adiciona entrada ao KNOWN-RED sem justificativa reprova
- [ ] Com a linha `ratchet:` e um motivo, passa
- [ ] PR que REMOVE entrada passa sempre e o comentário celebra a quitação
- [ ] Nenhuma mudança no comportamento do `invariants.mjs`

## Arquivos

`tools/eval/ratchet-check.mjs` (novo) · `.github/workflows/pr-gates.yml` ·
`tools/eval/KNOWN-RED.json`
