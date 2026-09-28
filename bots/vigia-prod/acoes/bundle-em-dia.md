---
nome: bundle-em-dia
quando: sempre
ativo: true
checagem: bundle-em-dia
---
Classe: **BUG-55** — "correção que não chega ao usuário": o ar servindo módulo
velho enquanto o repo já publicou novo.

Mede DUAS coisas (cada uma pega uma metade da classe):
1. o `?v=` do import map do HTML servido confere com a revisão esperada da
   árvore local (`scripts/module-cache.mjs`, sha256 de módulo+conteúdo, 12 hex);
2. os BYTES de `/js/main.js` no ar conferem com `public/js/main.js` local —
   URL nova servindo byte velho é a cara do edge cache e o `?v=` não pega.
