---
nome: cache-bust
quando: src/pages/index.astro, public/js/**
ativo: true
classe: CACHE
gate: npm run docs:check && npm run syntax
---
`?v=` escrito à mão onde o import map deriva a versão dos bytes
(module-cache.mjs): a correção REMOVE a sobrescrita manual. Nunca adiciona
hash novo à mão — o manifesto é quem manda.
