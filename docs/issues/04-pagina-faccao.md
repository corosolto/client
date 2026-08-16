# Uma página por facção: `/faccoes/<id>`

**Dificuldade:** fácil · **Área:** SEO / conteúdo · **Tempo:** ~2 h

## Contexto

`/personagens` lista as 5 facções e os 44 personagens numa página só. "Tribos
urbanas jogo", "funkeiros jogo brasileiro" e "palhaços" são buscas próprias, e
hoje competem entre si dentro da mesma URL.

## O que fazer

Criar `src/pages/faccoes/[id].astro` com `getStaticPaths()` a partir de
`FACCOES` em `src/data/jogo.ts`. Cada página leva:

- o lema, a cor e a nota da facção
- os 9 (ou 8) personagens com blurb
- JSON-LD `ItemList` + `BreadcrumbList` (copie o padrão de `personagens.astro`)
- link cruzado para `/personagens` e para as outras facções

Registre as 5 URLs em `src/pages/sitemap.xml.ts` (array `STATIC`).

## Critério de aceite

- [ ] As 5 páginas existem e buildam estaticamente
- [ ] `/personagens` linka para cada uma
- [ ] Cada `<title>` e `<meta description>` cita a facção pelo nome
- [ ] As 5 aparecem no `/sitemap.xml`

## Arquivos

`src/pages/faccoes/[id].astro` (novo) · `src/pages/personagens.astro` ·
`src/pages/sitemap.xml.ts`
