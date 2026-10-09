# Continuação — desempenho do portão de documentação

Data: 2026-10-09  
Base: `origin/main` em `f3576db59884e4b6b702a09fd45ef625f9a8ca93`  
Branch: `codex/optimize-docs-ci-20261009`

Commit de implementação: `de32afe29` (`perf(ci): evita varrer assets no gerador de docs`).

## Objetivo e definição de pronto

Eliminar a leitura repetida dos 533 MB de `tools/` em `tools/gen-docs.mjs`, mantendo os fatos, os blocos gerados e o comportamento do mutante `--mutante=inclui-locais` exatamente iguais. A frente fica pronta quando `docs:check`, `eval:docsautoria` e seus mutantes relevantes preservarem o contrato.

## Medição anterior

Comando: `/usr/bin/time -p node tools/gen-docs.mjs --json`.

- Tempo: `real 70.87`, `user 21.29`, `sys 2.27`.
- Saída: 28.418 bytes, SHA-256 `75bcf22613eb220a80cb42a22785115c68c609823c4118d87b73606eaaa14939`.
- Contagens do pipeline: Playwright `233`, glTF Transform `113`, meshoptimizer `10`.
- Causa: `consomem()` executava `grep -rl` três vezes sobre toda a árvore `tools/`; os scripts `.mjs` somam cerca de 9,7 MB dentro de uma árvore de cerca de 533 MB.

A régua `eval:docsautoria` chama o gerador seis vezes no caminho completo. Portanto, o custo do gerador era multiplicado dentro do mesmo gate.

## Mudança

A lista já produzida por `git ls-files` passa a selecionar apenas os `.mjs` versionados sob `tools/`. Cada fonte é lida uma vez e as três buscas literais reutilizam esse conteúdo. O mutante `inclui-locais` continua usando a varredura recursiva existente para acrescentar scripts não versionados.

## Evidência validada

Comando após a mudança: `/usr/bin/time -p node tools/gen-docs.mjs --json`.

- Tempo: `real 0.35`, `user 0.17`, `sys 0.12`.
- Redução de tempo real na medição direta: 99,5% (`70.87 s` para `0.35 s`).
- Saída normal permaneceu byte a byte idêntica, inclusive SHA-256 e contagens.

Prova do mutante local:

1. Foi criado um `.mjs` não versionado contendo os três SDKs.
2. Antes e depois, `--json --mutante=inclui-locais` produziu o mesmo SHA-256 `b2cfe92c5b722226950d43e16ec11350a72b45c4f3fb482bdf8c00d10251c5cf`.
3. As contagens subiram para `234`, `114` e `11` nos dois casos.
4. A fixture foi removida antes do commit.

Validações concluídas:

- `npm run docs:check`: verde, 25 blocos em 32 marcadores; `real 0.51 s`.
- `node tools/eval/docs-autoria-check.mjs`: verde; `real 2.18 s`.
- Mutante `sem-tolerancia`: vermelho em `DOCSAUT1`, como esperado; `real 2.31 s`.
- Mutante `tolerancia-demais`: vermelho em `DOCSAUT2`, como esperado; `real 2.69 s`.
- `git diff --check`: verde.

## Próximo passo

Integrar os dois commits desta branch no candidato cumulativo e deixar o CI repetir `docs:check` e `eval:docsautoria` no mesmo ambiente da PR. Não há bloqueio local conhecido.
