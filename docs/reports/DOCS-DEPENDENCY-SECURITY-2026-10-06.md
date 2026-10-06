# Segurança das dependências do site de documentação — 06/10/2026

## Objetivo e aceite

Atualizar o lock isolado de `docs/` para eliminar os três alertas Dependabot do manifesto `docs/package-lock.json`, preservando o build pt/en do Docusaurus. Aceite: versões corrigidas, `npm audit` zero, instalação reproduzível e build do site verde.

## Evidência e mudança

- Alertas examinados: `tinypool` exige versão 2.1.2 ou posterior; `postcss-selector-parser`, 7.1.6 ou posterior. São transitivos de `@docusaurus/core` 3.10.2 e do pipeline CSS.
- `docs/package.json` aplica overrides para essas versões; `docs/package-lock.json` deduplica os subdependentes para as versões corrigidas.
- Validado neste worktree: `npm audit --prefix docs` reporta zero vulnerabilidades; `npm ci --prefix docs` instala 1265 pacotes e audita zero; `npm run build --prefix docs` compila pt/en.
- O build imprime o aviso pré-existente de que `onBrokenMarkdownLinks` será removido no Docusaurus v4; a compilação termina com sucesso.

## Estado e próximo passo

Branch `codex/docs-deps-security-20261006`, baseada na main `1c91b599aa28e1440e689e52b30474bf5af747c8`. As alterações ainda não foram commitadas nem enviadas. Próximo passo: executar os hooks exigidos, abrir PR e aguardar CI. Não declarar os alertas resolvidos até o merge e a atualização do Dependabot.
