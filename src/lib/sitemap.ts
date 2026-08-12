// Montagem do sitemap, isolada das rotas.
//
// POR QUE NUM LIB: as rotas /sitemap.xml e /sitemap-[page].xml precisam da mesma
// lógica, e a paginação é a parte que NÃO DÁ PRA EXERCITAR EM PRODUÇÃO hoje -
// perfis só entram com RANKING_ON (hoje false), e mesmo ligado precisaria de
// 5.000+ jogadores pra a segunda página existir. Com as funções aqui, um arnês
// injeta 12.000 jogadores falsos e prova o fatiamento sem banco.
// Ver tools/eval/sitemap-check.mjs.
//
// ESTRATÉGIA ADAPTATIVA, e é de propósito. A issue #32 sugere transformar
// /sitemap.xml em índice. Só que o primeiro critério de aceite dela é "com menos
// de 5.000 jogadores, o comportamento é idêntico ao de hoje" - e um índice
// apontando pra um único arquivo de 8 URLs não é idêntico: é um salto extra pro
// crawler, sem nenhum ganho. Então:
//
//   total <= POR_PAGINA  ->  /sitemap.xml é um <urlset> normal (hoje, igual)
//   total >  POR_PAGINA  ->  /sitemap.xml vira <sitemapindex> apontando pras
//                            páginas /sitemap-1.xml … /sitemap-N.xml
//
// Efeito colateral bom: `Sitemap:` no robots.txt continua correto nos DOIS
// modos, porque /sitemap.xml é sempre o ponto de entrada. A issue pedia pra
// atualizar o robots; com isto, não precisa - e uma linha que não muda é uma
// linha que não fica errada.

/** O protocolo permite 50.000 por arquivo. 5.000 é o teto que o código já usava
 *  e mantém cada resposta pequena - o custo aqui é uma query no Supabase por
 *  página, não banda. */
export const POR_PAGINA = 5000;

export interface Entrada {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

export const escXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Quantas páginas o total ocupa. 0 itens = 1 página (vazia, mas válida). */
export function numeroDePaginas(total: number, porPagina = POR_PAGINA): number {
  return Math.max(1, Math.ceil(total / porPagina));
}

/** Índice 0-based do primeiro item da página (1-based). */
export function offsetDaPagina(pagina: number, porPagina = POR_PAGINA): number {
  return (pagina - 1) * porPagina;
}

export function xmlUrlset(entradas: Entrada[]): string {
  const linhas = entradas.map((e) =>
    `  <url><loc>${escXml(e.loc)}</loc><lastmod>${e.lastmod}</lastmod>` +
    `<changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    linhas.join('\n') + `\n</urlset>\n`;
}

export function xmlIndex(paginas: { loc: string; lastmod: string }[]): string {
  const linhas = paginas.map((p) =>
    `  <sitemap><loc>${escXml(p.loc)}</loc><lastmod>${p.lastmod}</lastmod></sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    linhas.join('\n') + `\n</sitemapindex>\n`;
}
