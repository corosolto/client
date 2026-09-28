---
nome: smoke-playwright
quando: sempre
ativo: true
checagem: smoke-playwright
---
Classe: o que só browser pega — boot travado, countdown parado, tela branca
com 200 em tudo (já aconteceu com countdown travado por carga).

Mede: o MESMO smoke do CI (`playwright.smoke.config.mjs`, spec
`web-smoke.spec.js`) apontado pra produção via `BASE_URL` — não existe config
paralela. Screenshot de falha em `test-results/` vira evidência da issue.
