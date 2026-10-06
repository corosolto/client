# Segurança das dependências do site de documentação — 06/10/2026

## Objetivo e aceite

Atualizar o lock isolado de `docs/` para eliminar os três alertas Dependabot do manifesto `docs/package-lock.json`, preservando o build pt/en do Docusaurus. Aceite: versões corrigidas, `npm audit` zero, instalação reproduzível e build do site verde.

## Evidência e mudança

- Alertas examinados: `tinypool` exige versão 2.1.2 ou posterior; `postcss-selector-parser`, 7.1.6 ou posterior. São transitivos de `@docusaurus/core` 3.10.2 e do pipeline CSS.
- `docs/package.json` aplica overrides para essas versões; `docs/package-lock.json` deduplica os subdependentes para as versões corrigidas.
- Validado neste worktree: `npm audit --prefix docs` reporta zero vulnerabilidades; `npm ci --prefix docs` instala 1265 pacotes e audita zero; `npm run build --prefix docs` compila pt/en.
- O build imprime o aviso pré-existente de que `onBrokenMarkdownLinks` será removido no Docusaurus v4; a compilação termina com sucesso.

## Estado e próximo passo

Branch `codex/docs-deps-security-20261006`, PR #781. Commit da correção `afb490fe555f733e8e91732afedb7d2ef4900f50`; o bot integrou a main com `fdc6da8bb673141df284fca2dc03eb9d9939d76e`. A main estava em `548d0421da4dbb689e256267c6076757501a89e` após #756. Push concluído e pre-push aprovado. CI do PR está em andamento; a correção local passou audit, instalação reproduzível e build pt/en, mas não declarar os alertas resolvidos até o merge e a atualização do Dependabot. Próximo passo: aguardar os checks exigidos e mesclar se estiverem verdes.
