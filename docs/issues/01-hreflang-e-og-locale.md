# Adicionar `hreflang` e alternate para o host sem `www`

**Dificuldade:** fácil · **Área:** SEO · **Tempo:** ~30 min

## Contexto

O `astro.config.mjs` passou a usar `https://www.csbrasil.online` (com `www`) —
foi a correção que desbloqueou todo o resto do SEO. Mas ainda falta declarar
explicitamente que o apex (`csbrasil.online`, sem `www`) e o host com `www` são
a **mesma** página, e que o site é `pt-BR` e só.

## O que fazer

Em `src/layouts/Layout.astro`, no `<head>`, junto do `<link rel="canonical">`:

```astro
<link rel="alternate" hreflang="pt-BR" href={canonical}>
<link rel="alternate" hreflang="x-default" href={canonical}>
```

E confirme no painel da Vercel que o apex faz **redirect 301** para o `www`
(não 302, e não "both work"). Se não fizer, configure lá.

## Critério de aceite

- [ ] `curl -sI https://csbrasil.online/` devolve `301` com `location:` apontando pro `www`
- [ ] `curl -s https://www.csbrasil.online/ | grep hreflang` mostra as duas linhas
- [ ] `npm run build` passa

## Arquivos

`src/layouts/Layout.astro`
