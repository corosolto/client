# SEO e AEO — contrato de publicação

Esta página descreve o que o crawler recebe do site publicado. Não é plano de marketing, nem autoriza prometer recurso que o jogo ainda não entrega.

## Fonte de verdade

- Identidade, host canônico, descrições e IDs estáveis de entidades: [`src/lib/site.ts`](../src/lib/site.ts).
- Shell HTML, canonical, Open Graph, `hreflang` e grafo base de JSON-LD: [`src/layouts/Layout.astro`](../src/layouts/Layout.astro).
- Sitemap: rota dinâmica [`src/pages/sitemap.xml.ts`](../src/pages/sitemap.xml.ts). Não crie um `public/sitemap.xml`, pois a precedência de arquivos estáticos pode sombrear a rota.
- `robots.txt` e resumo curado para assistentes: [`public/robots.txt`](../public/robots.txt) e [`public/llms.txt`](../public/llms.txt).
- Arquivos derivados para máquinas: [`scripts/aeo.mjs`](../scripts/aeo.mjs), executado no build. Ele gera `llms-full.txt`, `ai-index.json`, `docs.json` e espelhos Markdown somente das páginas de conteúdo.

## Regras de verdade

1. O canonical é `https://www.csbrasil.online`, sem barra final fora da raiz.
2. Cada entidade compartilhada no JSON-LD usa `@id` estável. Uma página referencia a entidade; não duplica o `VideoGame` sem identificação.
3. Quando `RANKING_ON` está desligado, páginas e arquivos de máquina podem explicar a indisponibilidade, mas não podem dizer que existe ranking global ativo.
4. Telas de laboratório são ferramentas de desenvolvimento: não entram no sitemap, `ai-index.json` ou texto destinado a crawl.
5. Conteúdo indexável precisa responder uma pergunta no texto visível. Schema não compensa uma página sem resposta útil.

## Antes de publicar

O build é o artefato a medir; revisar apenas os arquivos `.astro` não prova o HTML entregue.

```bash
npm run build
npm run eval:seo
npm run eval:seo:mutate
node tools/eval/jsonld-validate.mjs
```

`eval:seo:mutate` prova que a régua detecta regressões reais: sitemap estático, canonical no host errado, entidade sem `@id`, promessa de ranking desligado, vazamento de tela de laboratório e regra de `robots.txt` divergente para crawlers de IA.

O validador de JSON-LD consulta o vocabulário oficial do schema.org na primeira execução e usa cache depois. Ele valida vocabulário e compatibilidade de propriedades; não substitui a revisão do conteúdo nem um teste de resultado rico de buscador.

A raiz do jogo é SSR para escolher idioma por cabeçalho e, por isso, não existe como arquivo em `dist/client/`. O validador cobre as páginas estáticas que usam o mesmo layout; a raiz e as demais rotas SSR precisam de smoke HTTP antes de um deploy.

## Alterar uma página indexável

Mantenha título, descrição, conteúdo visível e JSON-LD coerentes. Se a mudança introduzir uma afirmação que pode ficar falsa por uma flag, faça o gate publicado medi-la e inclua uma mutação que deixe o gate vermelho. Os detalhes de cada check estão no cabeçalho de [`tools/eval/seo-check.mjs`](../tools/eval/seo-check.mjs).
