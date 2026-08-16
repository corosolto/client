#!/usr/bin/env node
// ============================================================================
// SITEMAP — prova o fatiamento que a produção não alcança.
//
// POR QUE ISTO EXISTE: perfis /u/* só entram no sitemap com RANKING_ON (hoje
// false), e mesmo ligado precisaria de 5.000+ jogadores pra a segunda página
// existir. Ou seja, o modo índice é código que NINGUÉM consegue exercitar
// pedindo a URL — o tipo de caminho que fica quebrado por um ano e só aparece no
// dia em que o site cresce, que é justamente o pior dia pra descobrir.
//
// Aqui as funções de src/lib/sitemap.ts recebem totais falsos e a saída é
// conferida contra o protocolo: nenhuma página acima do teto, nenhuma URL
// perdida na fronteira entre páginas, XML bem formado.
//
// USO
//   node --experimental-strip-types tools/eval/sitemap-check.mjs
//
// Não precisa de hook de resolução: src/lib/sitemap.ts é autocontido de
// propósito (não importa nada), justamente pra ser testável em node puro.
//
// Sai 1 em qualquer divergência.
// ============================================================================
import {
  POR_PAGINA, numeroDePaginas, offsetDaPagina, xmlUrlset, xmlIndex, escXml,
} from '../../src/lib/sitemap.ts';

const falhas = [];
const checa = (id, ok, desc, evid) => {
  if (!ok) falhas.push(id);
  console.log(`${ok ? '✓ PASSA' : '✗ FALHA'} ${id.padEnd(6)} ${desc}`);
  if (evid) console.log(`${' '.repeat(15)}${evid}`);
};

console.log('\n=============== SITEMAP — CORO SOLTO ===============');
console.log(`teto por página: ${POR_PAGINA}\n`);

// ---- contagem de páginas ----
const casos = [
  [0, 1], [1, 1], [8, 1], [POR_PAGINA, 1],
  [POR_PAGINA + 1, 2], [POR_PAGINA * 2, 2], [POR_PAGINA * 2 + 1, 3], [12000, 3],
];
checa('SM1', casos.every(([t, esp]) => numeroDePaginas(t) === esp),
  'nº de páginas para cada total',
  casos.map(([t, e]) => `${t}->${numeroDePaginas(t)}(esp ${e})`).join('  '));

// ---- offsets contíguos, sem buraco nem sobreposição ----
const TOTAL = 12000;
const n = numeroDePaginas(TOTAL);
const fatias = Array.from({ length: n }, (_, i) => {
  const off = offsetDaPagina(i + 1);
  return [off, Math.min(off + POR_PAGINA, TOTAL)];
});
const contiguo = fatias.every(([ini], i) => i === 0 || ini === fatias[i - 1][1]);
const cobreTudo = fatias[0][0] === 0 && fatias[n - 1][1] === TOTAL;
const somam = fatias.reduce((s, [a, b]) => s + (b - a), 0);
checa('SM2', contiguo && cobreTudo && somam === TOTAL,
  `${TOTAL} itens em ${n} páginas: contíguas, sem buraco, somam o total`,
  fatias.map(([a, b]) => `[${a},${b})`).join(' ') + `  soma=${somam}`);

// ---- nenhuma página acima do teto ----
checa('SM3', fatias.every(([a, b]) => b - a <= POR_PAGINA),
  'nenhuma página passa do teto',
  'maior página: ' + Math.max(...fatias.map(([a, b]) => b - a)));

// ---- XML bem formado nos dois modos ----
const entradas = Array.from({ length: 3 }, (_, i) => ({
  loc: `https://www.csbrasil.online/u/id-${i}/nick&${i}`,
  lastmod: '2026-08-06', changefreq: 'weekly', priority: '0.6',
}));
const urlset = xmlUrlset(entradas);
const index = xmlIndex(Array.from({ length: n }, (_, i) => ({
  loc: `https://www.csbrasil.online/sitemap-${i + 1}.xml`, lastmod: '2026-08-06',
})));

const bemFormado = (xml, raiz) =>
  /^<\?xml version="1\.0" encoding="UTF-8"\?>\n/.test(xml) &&
  xml.includes(`<${raiz} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`) &&
  xml.trimEnd().endsWith(`</${raiz}>`) &&
  (xml.match(/</g) || []).length === (xml.match(/>/g) || []).length;

checa('SM4', bemFormado(urlset, 'urlset'), '<urlset> bem formado',
  `${(urlset.match(/<url>/g) || []).length} <url>, ${urlset.length} chars`);
checa('SM5', bemFormado(index, 'sitemapindex'), '<sitemapindex> bem formado',
  `${(index.match(/<sitemap>/g) || []).length} <sitemap> para ${n} páginas`);

// ---- o & do nick tem que sair escapado; & solto derruba o parser de quem consome ----
const amp = urlset.match(/&(?!amp;|lt;|gt;|quot;|apos;|#)/);
checa('SM6', !amp && urlset.includes('nick&amp;0'), 'nick com & sai escapado',
  amp ? `& solto perto de ${JSON.stringify(urlset.slice(Math.max(0, amp.index - 25), amp.index + 25))}` : 'nick&amp;0 presente');

// ---- índice NÃO lista /sitemap.xml (seria recursivo) ----
checa('SM7', !index.includes('/sitemap.xml<') && !index.includes('>/sitemap.xml'),
  'o índice não aponta pra si mesmo');

// ---- escXml cobre os 5 do XML ----
const bruto = `<a href="x" & 'y'>`;
const esc = escXml(bruto);
checa('SM8', !/[<>]/.test(esc) && esc.includes('&amp;') && esc.includes('&quot;') && esc.includes('&apos;'),
  'escXml escapa < > & " \'', JSON.stringify(esc));

console.log('\n---------------------------------------------------');
console.log(falhas.length ? `${falhas.length} VERMELHAS: ${falhas.join(', ')}` : 'tudo verde');
console.log('---------------------------------------------------\n');
process.exit(falhas.length ? 1 : 0);
