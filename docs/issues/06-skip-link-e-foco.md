# Acessibilidade: skip link, foco visível e contraste

**Dificuldade:** fácil · **Área:** acessibilidade · **Tempo:** ~1 h

## Contexto

O site usa um `<header>` sticky com 8 links de navegação antes do conteúdo. Quem
navega por teclado ou leitor de tela passa por todos eles em **toda** página.
Além disso, o CSS zera `border-radius` globalmente e não define `:focus-visible`
— então o anel de foco padrão fica quase invisível no fundo escuro.

## O que fazer

Em `src/layouts/Layout.astro`:

1. Skip link como primeiro elemento do `<body>`:
   ```html
   <a href="#conteudo" class="skip">Pular para o conteúdo</a>
   ```
   Visível só ao receber foco. `<main id="conteudo" tabindex="-1">`.
2. Estilo de foco explícito:
   ```css
   :focus-visible{outline:2px solid var(--amber);outline-offset:2px}
   ```
3. Rodar um verificador de contraste nos pares que o CSS usa. Suspeitos:
   `--bone-dim` (#8f866d) sobre `--bg` (#0a0a08) e o texto do rodapé
   (`#5f5a48`). O mínimo é **4,5:1** para texto normal.

## Critério de aceite

- [ ] Tab a partir da barra de endereço revela o skip link
- [ ] Todo elemento focável tem anel visível
- [ ] Nenhum par de cor abaixo de 4,5:1 (anote os valores no PR)

## Arquivos

`src/layouts/Layout.astro`
