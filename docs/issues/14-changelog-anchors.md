# Âncoras por versão e link permanente no `/changelog`

**Dificuldade:** fácil · **Área:** UI / SEO · **Tempo:** ~1 h

## Contexto

`/changelog` renderiza o `CHANGELOG.md` em `<details>`, um por versão. Não dá
pra linkar uma versão específica: `/changelog#v3.3.0` não abre nada, e o texto
dentro de um `<details>` fechado **não é encontrado pelo Ctrl+F** do navegador
nem indexado com o mesmo peso.

## O que fazer

Em `src/pages/changelog.astro`:

1. `id={"v" + v.versao}` em cada `<details>`.
2. Um `#` clicável ao lado do número da versão, copiando o link permanente.
3. Script inline curto: se `location.hash` casa com o `id` de um `<details>`,
   abrir e rolar até ele.
4. Considerar `<details open>` para as 3 primeiras versões (hoje são 2).

**Bônus, se quiser ir além:** o conteúdo dentro de `<details>` fechado é
invisível pro Ctrl+F. Avalie um `<input type="search">` que filtra as versões
por texto — ~20 linhas de JS, sem dependência.

## Critério de aceite

- [ ] `/changelog#v3.3.0` abre a versão certa e rola até ela
- [ ] Clicar no `#` copia a URL completa
- [ ] Funciona sem JS (o `<details>` continua abrindo no clique)

## Arquivos

`src/pages/changelog.astro`
