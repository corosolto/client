#!/usr/bin/env node
// Sitemap x teto de linhas do PostgREST: roda as rotas reais contra um PostgREST
// falso que corta cada resposta em 1.000 linhas, como o max-rows do Supabase.
// Em 13/10/2026 o /sitemap.xml de produção listava exatamente 1.000 perfis,
// ordenados por id, o último começando em 3139.
//
//   node --experimental-strip-types tools/eval/sitemap-paginacao-check.mjs
//   node --experimental-strip-types tools/eval/sitemap-paginacao-check.mjs --mutante=um-pedido
import { registerHooks } from 'node:module';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MAX_ROWS = 1000;
const PORTA = 4520;
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const MUTANTES = { 'um-pedido': ['if (!linhas.length) break;', 'if (linhas.length >= 0) fim = 0;'] };
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
    if (MUTANTE && url.endsWith('/src/pages/sitemap.xml.ts')) {
      const [velho, novo] = MUTANTES[MUTANTE];
      const mut = src.replace(velho, novo);
      if (mut === src) { console.error(`MUTANTE NAO APLICOU: "${velho}" não está em sitemap.xml.ts`); process.exit(2); }
      src = mut;
      mutanteAplicou = true;
    }
    return { ...r, source: src };
  },
});

let linhas = [];
const uuid = (i) => `${i.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;
const popula = (n) => { linhas = Array.from({ length: n }, (_, i) => ({ id: uuid(i), nick: `p${i}` })); };

const servidor = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname !== '/rest/v1/player_points') { res.writeHead(404).end(); return; }
  if (req.method === 'GET' && u.searchParams.get('order') !== 'id.asc') { res.writeHead(400).end('order=id.asc esperado'); return; }
  const offset = Number(u.searchParams.get('offset') || 0);
  const limit = Math.min(Number(u.searchParams.get('limit') || MAX_ROWS), MAX_ROWS);
  const fatia = linhas.slice(offset, offset + limit);
  const fim = fatia.length ? offset + fatia.length - 1 : offset;
  res.writeHead(200, {
    'content-type': 'application/json',
    'content-range': req.method === 'HEAD' ? `*/${linhas.length}` : `${offset}-${fim}/*`,
  });
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify(fatia));
});
await new Promise((ok, erro) => { servidor.once('error', erro); servidor.listen(PORTA, '127.0.0.1', ok); });

const raiz = new URL('../../src/pages/', import.meta.url);
const indice = await import(new URL('sitemap.xml.ts', raiz).href);
const paginado = await import(new URL('sitemap-[page].xml.ts', raiz).href);
const perfisDe = (xml) => [...xml.matchAll(/<loc>[^<]*\/u\/([^/<]+)\//g)].map((m) => m[1]);

const falhas = [];
const checa = (id, ok, desc, evid) => {
  if (!ok) falhas.push(id);
  console.log(`${ok ? '✓ PASSA' : '✗ FALHA'} ${id} ${desc}`);
  if (!ok && evid) console.log(`         ${evid}`);
};

try {
  popula(2500);
  const xml = await (await indice.GET({})).text();
  const ids = perfisDe(xml);
  checa('SP1', ids.length === 2500 && new Set(ids).size === 2500,
    `urlset com 2.500 perfis lista todos (max-rows ${MAX_ROWS})`,
    `listou ${ids.length} de 2500, último ${ids.at(-1)}: perfis() fez um pedido só e o PostgREST cortou em ${MAX_ROWS}`);

  popula(6200);
  const idx = await (await indice.GET({})).text();
  const paginas = [...idx.matchAll(/<loc>[^<]*\/sitemap-(\d+)\.xml<\/loc>/g)].map((m) => Number(m[1]));
  const vistos = [];
  for (const n of paginas) {
    const r = await paginado.GET({ params: { page: String(n) } });
    if (r.status === 200) vistos.push(...perfisDe(await r.text()));
  }
  const esperado = linhas.map((l) => l.id);
  const faltam = esperado.filter((id) => !vistos.includes(id));
  checa('SP2', paginas.length === 2 && vistos.length === 6200 && faltam.length === 0,
    'índice com 6.200 perfis: as páginas numeradas cobrem todos sem repetir',
    `${paginas.length} página(s), ${vistos.length} perfis listados, ${faltam.length} faltando (ex.: ${faltam.slice(0, 2).join(', ')})`);
} finally {
  servidor.close();
}

if (MUTANTE && !mutanteAplicou) { console.error('MUTANTE NAO APLICOU: sitemap.xml.ts não passou pelo hook'); process.exit(2); }
console.log(falhas.length ? `\n✗ ${falhas.length} falha(s): ${falhas.join(', ')}` : '\n✓ sitemap pagina além do max-rows');
process.exit(falhas.length ? 1 : 0);
