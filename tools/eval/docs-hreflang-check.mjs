#!/usr/bin/env node
// hreflang dos docs: o Docusaurus monta o alternate trocando só o prefixo da
// locale, então a página traduzida precisa do MESMO slug nas duas. Em 13/10/2026
// /docs/estado declarava /docs/en/estado (404) e /docs/en/status declarava
// /docs/status (404); idem arquitetura, colaborar e instrumentacao-ai.
//
//   node tools/eval/docs-hreflang-check.mjs                    # fontes (CI)
//   node tools/eval/docs-hreflang-check.mjs --build=public/docs # HTML gerado (CI: o build versionado)
//   node tools/eval/docs-hreflang-check.mjs --mutante=slug-traduzido|sem-redirect
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const PT = join(RAIZ, 'docs/docs');
const EN = join(RAIZ, 'docs/i18n/en/docusaurus-plugin-content-docs/current');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || null;
const MUTANTE = arg('mutante');
const BUILD = arg('build');
if (MUTANTE && !['slug-traduzido', 'sem-redirect'].includes(MUTANTE)) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }

// Slugs EN publicados em public/docs/en/sitemap.xml até 890ddd060.
const ANTIGAS_EN = ['/docs/en/status', '/docs/en/architecture', '/docs/en/contributing', '/docs/en/ai-instrumentation'];

const falhas = [];
const checa = (id, ok, desc, evid) => {
  if (!ok) falhas.push(id);
  console.log(`${ok ? '✓ PASSA' : '✗ FALHA'} ${id} ${desc}`);
  if (!ok && evid) console.log(`         ${evid}`);
};
const arquivos = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? arquivos(p) : [p];
});

let mutanteAplicou = false;
const ler = (p) => {
  const src = readFileSync(p, 'utf8');
  if (MUTANTE === 'slug-traduzido' && p === join(EN, 'estado.md')) {
    const mut = src.replace(/^---\n/, '---\nslug: /status\n');
    if (mut === src) { console.error('MUTANTE NAO APLICOU'); process.exit(2); }
    mutanteAplicou = true;
    return mut;
  }
  return src;
};
const slugDe = (raiz, p) => {
  const fm = (ler(p).match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';
  const campo = (k) => (fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1]?.trim().replace(/^['"]|['"]$/g, '');
  const rel = relative(raiz, p).replace(/\.mdx?$/, '');
  const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/') + 1) : '';
  const s = campo('slug');
  if (s) return s.startsWith('/') ? s : `/${dir}${s}`;
  return `/${dir}${campo('id') || rel.slice(dir.length)}`;
};

if (!BUILD) {
  const traduzidas = arquivos(EN).filter((p) => /\.mdx?$/.test(p));
  const divergem = [];
  for (const en of traduzidas) {
    const pt = join(PT, relative(EN, en));
    if (!existsSync(pt)) { divergem.push(`${relative(EN, en)} sem original em docs/docs`); continue; }
    const [a, b] = [slugDe(PT, pt), slugDe(EN, en)];
    if (a !== b) divergem.push(`/docs${a} declara /docs/en${a} (404); /docs/en${b} declara /docs${b} (404)`);
  }
  checa('DH1', traduzidas.length > 0 && divergem.length === 0,
    `${traduzidas.length} docs traduzidos com o mesmo slug em pt e en`,
    `${divergem.join('\n         ')}\n         tire o slug: do .md em docs/i18n/en e redirecione a URL EN antiga em borda.json`);

  const vercel = JSON.parse(readFileSync(join(RAIZ, 'borda.json'), 'utf8'));
  if (MUTANTE === 'sem-redirect') {
    const antes = vercel.redirects.length;
    vercel.redirects = vercel.redirects.filter((r) => !r.source.startsWith('/docs/'));
    mutanteAplicou = vercel.redirects.length < antes;
  }
  const md = (p) => /\.mdx?$/.test(p);
  const enDe = (p) => { const en = join(EN, relative(PT, p)); return existsSync(en) ? slugDe(EN, en) : slugDe(PT, p); };
  const docsPT = arquivos(PT).filter(md);
  const atuais = new Set([...docsPT.map((p) => `/docs${slugDe(PT, p)}`), ...docsPT.map((p) => `/docs/en${enDe(p)}`)]
    .map((u) => u.replace(/\/$/, '')));
  const publicadas = [...ANTIGAS_EN, ...['public/docs/sitemap.xml', 'public/docs/en/sitemap.xml']
    .flatMap((f) => [...readFileSync(join(RAIZ, f), 'utf8').matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map((m) => m[1].replace(/\/$/, '')))];
  const destino = new Map((vercel.redirects || []).map((r) => [r.source.replace(/\{\/\}\?$|\/$/, ''), r.destination.replace(/\/$/, '')]));
  const perdidas = publicadas.filter((u) => !atuais.has(u) && !atuais.has(destino.get(u)));
  checa('DH2', perdidas.length === 0,
    `${publicadas.length} URLs publicadas (sitemaps versionados + ${ANTIGAS_EN.length} EN antigas) servidas ou redirecionadas para página que existe`,
    `viram 404: ${perdidas.join(', ')}: falta redirect em borda.json ou o destino não existe`);
} else {
  const html = arquivos(BUILD).filter((p) => p.endsWith('.html') && !p.endsWith('404.html'));
  const quebrados = [];
  let total = 0;
  for (const p of html) {
    for (const m of readFileSync(p, 'utf8').matchAll(/<link[^>]*rel="alternate"[^>]*href="https?:\/\/[^/]+\/docs\/([^"]*)"[^>]*hreflang=/g)) {
      total++;
      if (!existsSync(join(BUILD, m[1], 'index.html'))) quebrados.push(`${relative(BUILD, p)} -> /docs/${m[1]}`);
    }
  }
  checa('DH3', total > 0 && quebrados.length === 0, `${total} alternates em ${html.length} páginas apontam para página gerada`,
    quebrados.join('\n         '));
}

if (MUTANTE && !mutanteAplicou) { console.error(`MUTANTE NAO APLICOU: ${MUTANTE}`); process.exit(2); }
console.log(falhas.length ? `\n✗ ${falhas.length} falha(s): ${falhas.join(', ')}` : '\n✓ hreflang dos docs resolve nas duas línguas');
process.exit(falhas.length ? 1 : 0);
