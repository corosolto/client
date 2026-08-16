# A poda do build não tem régua

**Dificuldade:** fácil · **Área:** build · **Tempo:** ~1 h

## Contexto

`scripts/prune-dist.mjs` tira `models/fpvm` (154 MB) do publicado, no fim do
`npm run build`. Ele resolve o problema, mas **nada confere que ele rodou**.

Se alguém reordenar o `build` no `package.json`, trocar o adaptador, ou o caminho do
espelho da Vercel mudar de `.vercel/output/static`, os 154 MB voltam para produção **em
silêncio** — o build continua verde e ninguém olha `du -sh dist/client` toda semana.

## O que fazer

1. Somar ao `tools/eval/assets-check.mjs` (ou criar `tools/eval/dist-check.mjs`) uma
   verificação pós-build: `dist/client/models/fpvm` e
   `.vercel/output/static/models/fpvm` **não existem**, e `dist/client` está abaixo de um
   teto declarado (medir o valor de hoje e deixar folga; hoje são 488 MB).
2. O teto tem que estar escrito com o número medido e a data — teto sem procedência é
   número mágico.
3. Respeitar `KEEP_FPVM=1`: com a variável ligada, a régua **pula** com aviso.

## Critério de aceite

- [ ] Passa depois de um `npm run build` normal
- [ ] `KEEP_FPVM=1 npm run build` faz a régua pular, não falhar
- [ ] Tirar `node scripts/prune-dist.mjs` do script `build` faz a régua sair 1

## Arquivos

`tools/eval/assets-check.mjs` ou `tools/eval/dist-check.mjs` (novo) · `package.json`
