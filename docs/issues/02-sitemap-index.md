# Partir o sitemap em índice quando passar de 5.000 URLs

**Dificuldade:** média · **Área:** SEO / backend · **Tempo:** ~2 h

## Contexto

`src/pages/sitemap.xml.ts` gera o sitemap em runtime e inclui uma URL por
jogador (`/u/<id>/<nick>`) — é o conteúdo que escala. Hoje ele tem
`.limit(5000)` cravado. O protocolo de sitemap permite **50.000 URLs ou 50 MB**
por arquivo, mas depois disso é obrigatório usar um *sitemap index*.

Quando o jogo passar de alguns milhares de jogadores, o limite de 5.000 vai
começar a esconder gente do buscador silenciosamente — e ninguém vai perceber.

## O que fazer

1. Criar `src/pages/sitemap-index.xml.ts` que lista N sitemaps paginados.
2. Transformar o atual em `src/pages/sitemap-[page].xml.ts`, com 5.000 URLs por
   página (`.range(offset, offset + 4999)`).
3. Manter `/sitemap.xml` funcionando: ou redireciona pro índice, ou vira o
   próprio índice.
4. Atualizar a linha `Sitemap:` de `public/robots.txt`.

## Critério de aceite

- [ ] Com menos de 5.000 jogadores, o comportamento é idêntico ao de hoje
- [ ] Com mais, o índice aponta pra N páginas e nenhuma passa de 5.000 `<url>`
- [ ] Todo XML valida contra o schema de sitemap

## Arquivos

`src/pages/sitemap.xml.ts` · `public/robots.txt`
