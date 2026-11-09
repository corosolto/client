#!/usr/bin/env node
// Sitemap só com URL final e sem data inventada. Em 13/10/2026 o /sitemap.xml de
// produção listava /ranking (302 para /?secao=comunidade) e punha a data do
// pedido como <lastmod> em todas as 1.021 URLs, perfis inclusive.
// Roda /sitemap.xml e /sitemap-N.xml reais contra um PostgREST falso.
//
//   node --experimental-strip-types tools/eval/sitemap-higiene-check.mjs
//   node --experimental-strip-types tools/eval/sitemap-higiene-check.mjs --mutante=ranking|hoje|hoje-perfil|hoje-indice
import { registerHooks } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORTA = 4521;
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const MUTANTES = {
  // /ranking deixou de redirecionar (ADR 0008, aba do hub); o mutante usa uma página que ainda redireciona.
  ranking: ['sitemap.xml.ts', "  ['/',            '1.0', 'daily'],", "  ['/',            '1.0', 'daily'],\n  ['/clans/sem-id', '0.9', 'hourly'],"],
  hoje: ['sitemap.xml.ts', 'changefreq: freq, priority: prio', 'lastmod: new Date().toISOString().slice(0, 10), changefreq: freq, priority: prio'],
  'hoje-perfil': ['sitemap.xml.ts', "changefreq: 'weekly',", "lastmod: new Date().toISOString(), changefreq: 'weekly',"],
  'hoje-indice': ['sitemap.xml.ts', '.xml` })', '.xml`, lastmod: new Date().toISOString() })'],
};
if (MUTANTE && !MUTANTES[MUTANTE]) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }

globalThis.__SITEMAP_ENV = {
  SUPABASE_URL: `http://127.0.0.1:${PORTA}`,
  SUPABASE_SERVICE_ROLE_KEY: 'chave-falsa',
  RANKING_ON: 'true',
};
// src/lib/env-runtime.ts lê process.env em runtime; o fixture entra pelos dois caminhos.
Object.assign(process.env, globalThis.__SITEMAP_ENV);
let mutanteAplicou = false;
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('.') && ctx.parentURL && !existsSync(fileURLToPath(new URL(spec, ctx.parentURL)))) {
      for (const ext of ['.ts', '.mts', '.js', '.mjs']) {
        const cand = new URL(spec + ext, ctx.parentURL);
        if (existsSync(fileURLToPath(cand))) return next(spec + ext, ctx);
      }
    }
    return next(spec, ctx);
  },
  load(url, ctx, next) {
    const r = next(url, ctx);
    if (!url.includes('/src/') || !/\.m?ts$/.test(url)) return r;
    let src = String(r.source).replaceAll('import.meta.env', 'globalThis.__SITEMAP_ENV');
    if (MUTANTE && url.endsWith(`/src/pages/${MUTANTES[MUTANTE][0]}`)) {
      const [, velho, novo] = MUTANTES[MUTANTE];
      const mut = src.replace(velho, novo);
      if (mut === src) { console.error(`MUTANTE NAO APLICOU: "${velho}" não está em ${MUTANTES[MUTANTE][0]}`); process.exit(2); }
      src = mut;
      mutanteAplicou = true;
    }
    return { ...r, source: src };
  },
});

let linhas = [];
const popula = (n) => { linhas = Array.from({ length: n }, (_, i) => ({ id: `${i.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`, nick: `p${i}` })); };
const servidor = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname !== '/rest/v1/player_points') { res.writeHead(404).end(); return; }
  const offset = Number(u.searchParams.get('offset') || 0);
  const fatia = linhas.slice(offset, offset + Math.min(Number(u.searchParams.get('limit') || 1000), 1000));
  res.writeHead(200, { 'content-type': 'application/json', 'content-range': req.method === 'HEAD' ? `*/${linhas.length}` : `${offset}-${offset + fatia.length}/*` });
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify(fatia));
});
await new Promise((ok, erro) => { servidor.once('error', erro); servidor.listen(PORTA, '127.0.0.1', ok); });

const PAGES = new URL('../../src/pages/', import.meta.url);
const indice = await import(new URL('sitemap.xml.ts', PAGES).href);
const paginado = await import(new URL('sitemap-[page].xml.ts', PAGES).href);
const xmls = [];
try {
  popula(50);
  xmls.push(await (await indice.GET({})).text());
  popula(6200);
  const idx = await (await indice.GET({})).text();
  xmls.push(idx);
  for (const m of idx.matchAll(/<loc>[^<]*\/sitemap-(\d+)\.xml<\/loc>/g)) {
    const r = await paginado.GET({ params: { page: m[1] } });
    if (r.status === 200) xmls.push(await r.text());
  }
} finally {
  servidor.close();
}
const tudo = xmls.join('\n');
const locs = [...tudo.matchAll(/<url><loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const fixas = [...new Set(locs.filter((p) => !p.startsWith('/u/')))];

const falhas = [];
const checa = (id, ok, desc, evid) => {
  if (!ok) falhas.push(id);
  console.log(`${ok ? '✓ PASSA' : '✗ FALHA'} ${id} ${desc}`);
  if (!ok && evid) console.log(`         ${evid}`);
};

const fonteDa = (path) => {
  const base = path.replace(/^\/|\/$/g, '') || 'index';
  const dir = base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : '';
  const pasta = fileURLToPath(new URL(dir || '.', PAGES));
  const dinamica = existsSync(pasta) ? readdirSync(pasta).filter((f) => /^\[[^\]]+\]\.astro$/.test(f)).map((f) => dir + f) : [];
  for (const f of [`${base}.astro`, `${base}/index.astro`, ...dinamica]) {
    const u = new URL(f, PAGES);
    if (existsSync(fileURLToPath(u))) return { f, src: readFileSync(u, 'utf8') };
  }
  return null;
};
const semPagina = [];
const redirecionam = [];
for (const p of fixas) {
  const pg = fonteDa(p);
  if (!pg) semPagina.push(p);
  else if (/\bAstro\.redirect\(|status:\s*30[1278]\b/.test(pg.src)) redirecionam.push(`${p} (src/pages/${pg.f})`);
}
checa('SH0', fixas.length > 0 && locs.length > fixas.length && xmls.length >= 4 && semPagina.length === 0,
  `${locs.length} URLs (${fixas.length} fixas), toda fixa tem página em src/pages`,
  `sem página: ${semPagina.join(', ') || '-'}; ${xmls.length} XMLs lidos (urlset, índice e 2 páginas esperados)`);
checa('SH1', redirecionam.length === 0, 'nenhuma URL do sitemap é página que redireciona',
  `redirecionam: ${redirecionam.join(', ')}. Sitemap lista a URL final; tire a entrada de STATIC em src/pages/sitemap.xml.ts`);

const hoje = new Date().toISOString().slice(0, 10);
const lastmods = [...tudo.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
const inventadas = lastmods.filter((d) => d.startsWith(hoje)).length;
checa('SH2', inventadas === 0, '<lastmod> de urlset e de índice não é a data do pedido',
  `${inventadas} <lastmod> começando em ${hoje}: sem data real de modificação, omita o <lastmod>`);

if (MUTANTE && !mutanteAplicou) { console.error('MUTANTE NAO APLICOU: o arquivo não passou pelo hook'); process.exit(2); }
console.log(falhas.length ? `\n✗ ${falhas.length} falha(s): ${falhas.join(', ')}` : '\n✓ sitemap só com URL final e sem data inventada');
process.exit(falhas.length ? 1 : 0);
