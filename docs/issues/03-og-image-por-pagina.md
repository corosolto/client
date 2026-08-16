# Gerar `og:image` própria para `/mapas` e `/armas`

**Dificuldade:** média · **Área:** SEO / imagem · **Tempo:** ~3 h

## Contexto

`/u/<id>/<nick>` já tem imagem própria: a badge PNG gerada em runtime por
`src/pages/api/badge/[...path].png.ts` (resvg-wasm + fonte DejaVu embutida). É o
melhor ativo social do projeto — link de perfil vira card bonito sozinho.

As páginas novas `/mapas` e `/armas` caem na `og-image.png` genérica. Um card
com o nome do mapa e a silhueta da arena converte muito mais.

## O que fazer

Reaproveitar a máquina que já existe:

1. Nova rota `src/pages/api/og/[tipo].png.ts` (`tipo` = `mapas` | `armas`).
2. Montar um SVG com o mesmo vocabulário visual da badge (fundo `#0c0e11`,
   âmbar `#ffd23f`, faixas vermelha e verde), renderizar com `Resvg`.
3. Passar a URL como `ogImage` no `<Layout>` das duas páginas.

**Atenção:** carregue a fonte de `src/lib/font-data.ts` (já é base64 embutido) e
o wasm de `/wasm/resvg.wasm`, exatamente como a badge faz. Não adicione
dependência nova.

## Critério de aceite

- [ ] `/api/og/mapas.png` e `/api/og/armas.png` devolvem PNG 1200×630
- [ ] As duas páginas mostram a imagem certa no validador de card do X/Facebook
- [ ] `cache-control` de pelo menos 1 dia nas duas rotas

## Arquivos

`src/pages/api/og/` (novo) · `src/pages/mapas.astro` · `src/pages/armas.astro`
