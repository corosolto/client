# Aposentar de verdade os evals obsoletos

**Dificuldade:** fácil (mas exige cuidado) · **Área:** limpeza · **Tempo:** ~2 h

## Contexto

`tools/eval/README.md` §7 lista ~35 scripts marcados como OBSOLETOS: 5 gerações
de `audio-probe`, as rodadas `g2r6`/`g2r7`/`g2r7b`/`g2r8`/`g2r14`/`g2ui`, 3
gerações de `p1-menu`, os capturadores `r7x` e o look Quake 4.

Estão **marcados**, não removidos — de propósito: marcar é reversível, apagar
não. Esta issue é o segundo passo.

## O que fazer

Para **cada** arquivo da §7, nesta ordem:

1. `grep -rn "<nome>" tools/ src/ public/ .github/ package.json` — se alguma
   coisa importa ou executa, **ele não é obsoleto**; tire da lista e conserte o
   README.
2. Confirme que o conhecimento dele sobreviveu em outro lugar: num portão da §1,
   num comentário de causa raiz no código, ou no `CHANGELOG.md`. Se não
   sobreviveu, **escreva antes de apagar**.
3. Mova para `tools/eval/aposentados/` (não delete no primeiro PR). O histórico
   do git guarda tudo, mas mover deixa o rastro visível pra quem não vai olhar o
   git.

Faça **um PR por família** (áudio, g2r6, g2r7…). PR único de 35 arquivos não é
revisável.

## Critério de aceite

- [ ] `npm run check` continua verde depois de cada PR
- [ ] O PR lista, por arquivo, onde o conhecimento dele ficou
- [ ] `tools/eval/README.md` atualizado no mesmo PR
- [ ] Nada que `invariants.mjs` ou `harness.mjs` importem foi movido

## Arquivos

`tools/eval/*` · `tools/eval/README.md`
